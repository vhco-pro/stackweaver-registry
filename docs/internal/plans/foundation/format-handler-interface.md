---
status: draft
status_description: "Drafted from the founding discussion; the hosted/proxied split is settled, the interface shape needs a review pass."
description: "Spec for the common format handler interface, defining the hosted and proxied paths every format must implement and the boundaries handlers may not cross."
author: michielvha
goal: "Make adding a format a bounded, repeatable unit of work so an agent can implement one end to end without touching shared layers."
priority: "high"
issue: 4
created: 2026-09-21
covers:
  - "internal/format/**"
---

# Plan: Format handler interface

The contract every format implements. Its real job is to make "add a format" a bounded unit of
work, because the experiment's headline measurement is whether format N+1 costs less than
format N, and that only means anything if the unit is the same each time.

## Context

Formats differ enormously at the protocol level (npm packuments, OCI manifest lists, PyPI simple
indexes, Galaxy import tasks) and barely at all underneath: they all resolve a name and version
to blobs, list what exists, accept uploads, and optionally fetch from an upstream and cache the
result.

The metadata schema is **not** this spec's concern: it belongs to
`docs/internal/plans/foundation/data-model.md`, which exists because leaving storage to each
handler would reproduce 31 bespoke schemas. A handler is protocol translation over a shared
model, and that split is what makes "add a format" a bounded unit of work.

Two constraints from the charter shape this:

- **Every format serves both a hosted path and a proxied path.** A format that only hosts is a
  format Gitea already does for free. The proxy path is the differentiator and cannot be
  retrofitted, because it changes what the handler is allowed to assume about where content
  comes from.
- **Handlers must not reach into each other.** Cross-format behavior belongs in storage, proxy
  or auth. This is a standing Go rule in `CLAUDE.md`, and it exists so that a format is
  independently implementable, testable and removable.

## Scope

**In scope**

- The handler interface: resolution, listing, upload, deletion, and upstream fetch.
- The registration mechanism that maps a URL prefix to a handler.
- The shared concerns handlers consume rather than implement: authentication, authorization,
  blob storage, the proxy cache, and request logging.
- The conformance obligations a handler must satisfy to be considered complete.

**Out of scope**

- Any individual format. Those are separate specs under `docs/internal/plans/formats/`.
- Virtual/aggregate repositories that merge several backing repositories. A later spec, though
  the interface should not preclude it.

## Design

### The shape

A handler is responsible only for **protocol translation**: turning its ecosystem's wire format
into calls against the shared layers, and back. It owns its routes, its metadata schema and its
content validation. It owns nothing else.

Concretely a handler:

- declares its route prefix and the requests it serves
- resolves a client request to a set of blob digests plus metadata
- validates and ingests an upload, returning digests for the shared store to commit
- renders its ecosystem's index/metadata documents from stored metadata
- for the proxied path, declares how to fetch from an upstream, what is cacheable, and for how
  long

It does **not** open object storage directly, implement its own auth check, manage its own
cache, or call another handler.

### Hosted and proxied are one handler, two paths

A single handler serves both, because the protocol is identical from the client's perspective;
only the source of truth differs. The handler declares, per request type, whether a miss may be
satisfied upstream and how the response is derived once it is.

This is also where the project's standing duplicated-path trap lives: a claim verified against
only the hosted path is not verified. Conformance cases are required in both modes
(`conformance-harness.md`, AC on mode coverage), and `CLAUDE.md` makes this a review rule.

### Definition of done for a format

A format is complete when, and only when:

1. Conformance cases pass in **both** modes, against at least two client versions.
2. Replay-match passes against a recorded corpus from a reference implementation.
3. No case is skipped without an issue number.
4. Its spec under `docs/internal/plans/formats/` records which parts of the ecosystem protocol
   are deliberately unimplemented, so the matrix does not imply coverage that does not exist.

## Acceptance Criteria

- [ ] AC1: A format handler compiles and passes its conformance suite without any change to
      shared storage, auth or proxy code.
- [ ] AC2: No handler package imports another handler package, enforced by a lint rule or an
      architecture test rather than by review.
- [ ] AC3: No handler opens object storage or the database directly; all access is through the
      shared layers, enforced the same way.
- [ ] AC4: Every registered handler serves both a hosted and a proxied path, and the runner fails
      a format whose case set covers only one mode.
- [ ] AC5: Adding a format requires touching only its own package plus route registration,
      demonstrated by the generic and OCI handlers landing without shared-layer edits.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/<format>/` |
| AC2 | architecture test | `internal/format/arch_test.go` |
| AC3 | architecture test | `internal/format/arch_test.go` |
| AC4 | unit | `conformance/core/case_validate_test.go` |
| AC5 | manual | recorded in `docs/internal/tasks/experiment-log.md` per format |

## Implementation Phases

### Phase 1: Interface and registration
- Interface definition, route registration, architecture tests

### Phase 2: Proven by two
- Generic and OCI handlers, confirming the interface survives a trivial and a hard format

## Open Questions

### Q1: Does the interface expose HTTP directly, or an abstracted request/response?

**The stakes on this dropped** once the extension boundary was settled as compile-time (see
Resolved below). It previously decided whether an out-of-process boundary stayed possible;
with that explicitly not being preserved, this is now a narrower question about how much the
core can enforce versus how much a handler can reach around it.

**Recommendation:** HTTP directly, with shared concerns (auth, storage, cache policy) enforced by
architecture tests rather than by the type system. The abstraction's remaining benefit does not
justify anticipating 33 ecosystems' protocol quirks up front.

| Option | You get | It costs |
|---|---|---|
| **A. HTTP directly** | Full protocol fidelity; nothing to work around; simplest handlers | Shared concerns enforceable only by lint and architecture tests, never by the compiler |
| **B. Narrow serialisable abstraction** | Shared concerns structurally unbypassable; out-of-process stays reachable if that is ever wanted after all | Every protocol quirk must be anticipated, and the misses surface one format at a time |

**Why this is yours:** it is the last call on how much the core polices handlers, and reversing it
after several formats exist is expensive. **Not answered here on purpose** - this spec's own rule
is that open questions belong to the owner.

### Q2: Is the proxy path opt-in per format, or mandatory from day one?

The charter says mandatory. That is correct as positioning and expensive for the first two
formats, where it doubles the work before the differentiator is even reachable.

**Recommendation:** mandatory in the interface, permitted to be `unsupported` for the generic
format only, with that exception named in its spec.

**Why this is yours:** it decides whether the first milestone slips to protect the principle.

### Resolved: extension boundary (was Q3)

**Settled 2026-09-22: compile-time Go modules.** Each format is a package implementing the shared
interface, compiled into one binary. This is what Gitea does for 22 formats and Harbor for 15
upstream adapters; **no dynamic plugin runtime is required for modularity**, which comes from a
uniform interface plus a shared data model instead.

Accepted cost: a third party cannot add a format without forking, and every format ships in every
binary. Out-of-process gRPC (`go-plugin`, as Terraform and Vault use) buys third-party
extensibility, and that is worth paying for only once a third party wants it.

### Q4: Are upstream adapters a separate axis from format handlers?

Harbor ships **15 adapters for upstream registries** (`dockerhub`, `awsecr`, `googlegcr`,
`azurecr`, `quay`, `gitlab`, `jfrog`, `native`, and more) behind **one** OCI format. They differ
in authentication and quirks, not in wire format.

**Recommendation:** yes, separate. One format handler, many upstream adapters. Conflating them
hard-codes Docker Hub's auth into the OCI handler and needs surgery for ECR.

**Why this is yours:** it adds a second extension axis, and therefore a second interface to
maintain, before either has a second implementation.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
