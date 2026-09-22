---
status: draft
status_description: "Reviewed 2026-09-22: review raised Q1-Q5 (interface pinning vs discovery, proxied-path control flow, URL layout, write-triggered services, a CLAUDE.md amendment); stays draft until the owner answers."
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
  blob storage, metadata persistence through the shared data model (`data-model.md`), the proxy
  cache, and request logging.
- The conformance obligations a handler must satisfy to be considered complete.

**Out of scope**

- Any individual format. Those are separate specs under `docs/internal/plans/formats/`.
- Virtual/aggregate repositories that merge several backing repositories. A later spec, though
  the interface should not preclude it.

## Design

### The shape

A handler is responsible only for **protocol translation**: turning its ecosystem's wire format
into calls against the shared layers, and back. It owns its routes, the shape of its
format-specific metadata document (stored opaquely through the shared model per `data-model.md`;
it never owns a table), and its content validation. It owns nothing else.

Concretely a handler:

- declares its route prefix and the requests it serves
- resolves a client request to a set of blob digests plus metadata
- validates and ingests an upload, returning digests for the shared store to commit
- renders its ecosystem's index/metadata documents from stored metadata
- for the proxied path, declares how its ecosystem's requests map to upstream requests, and
  which responses are immutable artifacts versus mutable metadata with a TTL - the distinction
  `proxy-cache.md` builds everything on. Upstream authentication and provider quirks live in
  upstream adapters, a separate axis (see the resolved upstream adapter decision below), never
  in the handler

It does **not** open object storage directly, implement its own auth check, manage its own
cache, or call another handler. It also never assumes a repository has exactly one current
state: content resolves through the snapshot pointer the handler is given, the binding
constraint `data-model.md` places on every handler and backs with an architecture test.

### Hosted and proxied are one handler, two paths

A single handler serves both, because the protocol is identical from the client's perspective;
only the source of truth differs. The handler declares, per request type, whether a miss may be
satisfied upstream and how the response is derived once it is.

This is also where the project's standing duplicated-path trap lives: a claim verified against
only the hosted path is not verified. Conformance cases are required in both modes: the case
definition in `conformance-harness.md` requires a `mode` on every case (though that spec carries
no acceptance criterion enforcing per-format mode coverage; AC4 below is that enforcement), and
`CLAUDE.md` makes it a review rule.

### Definition of done for a format

A format is complete when, and only when:

1. Conformance cases pass in **both** modes, against at least two client versions.
2. Replay-match passes against a recorded corpus from a reference implementation.
3. No case is skipped without an issue number.
4. Its spec under `docs/internal/plans/formats/` records which parts of the ecosystem protocol
   are deliberately unimplemented, so the matrix does not imply coverage that does not exist.

## Acceptance Criteria

- [ ] AC1: A format handler compiles against the interface and passes its conformance suite,
      with every storage, database, auth and upstream interaction going through the shared
      layers. (The "no shared-layer edits" property this used to restate is AC5's; the boundary
      itself is what AC2, AC3, AC6 and AC7 enforce.)
- [ ] AC2: No handler package imports another handler package, enforced by a lint rule or an
      architecture test rather than by review.
- [ ] AC3: No handler opens object storage or the database directly; all access is through the
      shared layers, enforced the same way.
- [ ] AC4: Every registered handler serves both a hosted and a proxied path, and the runner fails
      a format whose case set covers only one mode. A handler may instead declare proxy support
      `unsupported`, which the runner honours rather than passing a silent gap - and only where
      the format's own spec records the exemption (`generic` is the single permitted case).
- [ ] AC5: Adding a format requires touching only its own package plus route registration,
      demonstrated by the generic and OCI handlers landing without shared-layer edits.
- [ ] AC6: No handler performs its own network egress: constructing an HTTP client, issuing a
      request, or dialing a connection inside a handler package fails `make verify` via a lint
      forbid rule scoped to `internal/format/**`, so upstream traffic cannot bypass the proxy
      layer. (Import-based architecture tests cannot catch this, because every handler
      legitimately imports `net/http` for its request and response types.)
- [ ] AC7: Every format's conformance case set includes unauthenticated and unauthorized request
      cases in both modes, and the runner rejects a case set without them, so a handler that
      skips the shared auth check fails conformance rather than review.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/<format>/` |
| AC2 | architecture test | `internal/format/arch_test.go` |
| AC3 | architecture test | `internal/format/arch_test.go` |
| AC4 | unit | `conformance/core/case_validate_test.go` |
| AC5 | manual | recorded in `docs/internal/tasks/experiment-log.md` per format |
| AC6 | lint | forbid rule in `.golangci.yml`, plus a fixture proving it fires |
| AC7 | unit | `conformance/core/case_validate_test.go` |

AC5's manual procedure: for each landing format, inspect the PR diff and record in the
experiment log that it touches only `internal/format/<name>/`, its conformance cases, and the
route registration point; any other file is a finding against this spec.

## Implementation Phases

### Phase 1: Interface and registration
- Interface definition, route registration, architecture tests

### Phase 2: Proven by two
- Generic and OCI handlers, confirming the interface survives a trivial and a hard format

## Open Questions

The 2026-09-22 review raised the five questions below. Previously resolved decisions follow
them and are kept rather than deleted, so the reasoning survives the next time someone asks
why it was done this way.

### Q1: Does this spec pin the interface's method set now, or stay at responsibility level until Phase 2 discovers it?

The Design section describes handler responsibilities in prose but defines no method set, no
signatures, and no types; two implementors would build materially different Phase 1 interfaces.
The vendored Go skill says interfaces are discovered from concrete use, not designed upfront,
and Phase 2 ("proven by two") is exactly that discovery - but the SDD loop's premise is that
`/implement` should not need to re-derive design.

**Recommendation:** B - stay at responsibility level, declare the Phase 1 interface explicitly
provisional, and fold the discovered shape back into this spec (with re-review) when Phase 2
lands, before any Tier 1 format starts.

| Option | You get | It costs |
|---|---|---|
| **A. Pin signatures now** | An unambiguous target for `/tasks` and `/implement`; two implementors build the same thing | Upfront interface design against the Go skill's discover-don't-design rule, with the two hardest format classes (signed-index, async-import) not yet examined |
| **B. Responsibility level, folded back after Phase 2** | The interface is discovered from generic and OCI, the Go-idiomatic path | Phase 1 starts with judgment left in it, and the spec must be revised and re-reviewed after Phase 2 before Tier 1 begins |

**Why this is yours:** it is a process trade between the SDD loop's "the spec removes judgment"
premise and Go's "interfaces are discovered" rule; only the owner decides which one bends here.

### Q2: On a proxied-path miss, who calls whom: does the proxy layer wrap the handler, or does the handler call the proxy?

Upstream responses are routinely not servable verbatim: an npm packument's tarball URLs must be
rewritten to point at us before caching or serving, and PyPI simple indexes likewise. So the
proxied path needs a stated control flow, and the spec currently only says the handler declares
"how the response is derived".

**Recommendation:** handler calls the proxy - the handler asks a shared fetch-and-cache API for
upstream content and derives its own response, because response rewriting is protocol
translation and belongs in the handler.

| Option | You get | It costs |
|---|---|---|
| **A. Proxy wraps handler (transparent middleware)** | The shared layer sees every miss; cache policy is enforced in exactly one place | Every format whose upstream response needs rewriting fights the wrapper, and per-format transformation logic leaks into the proxy layer |
| **B. Handler calls proxy (fetch-and-cache API)** | Rewriting stays inside the handler; the proxy layer stays format-agnostic | The proxy invariants (TTL honoured, negative caching, offline mode) now depend on every handler calling correctly, held by conformance cases rather than by structure |

**Why this is yours:** it fixes the control flow both this spec and `proxy-cache.md` build on,
and the wrong choice recreates the union-of-quirks trap in a new place.

### Q3: How do repository names appear in URLs, and how does OCI's root-anchored `/v2/` fit prefix registration?

The registration mechanism is in scope but undesigned. The OCI distribution spec anchors its API
at `/v2/` on the host root and docker cannot be pointed at a path-prefixed base URL, so "maps a
URL prefix to a handler" meets its counterexample at format number two. Separately, repositories
are the unit of RBAC and proxy configuration (`data-model.md`), so the URL scheme must encode
the repository, and the spec does not say how.

**Recommendation:** per-repository path prefixes (`/<format>/<repository>/...`) with OCI
special-cased at `/v2/` and the repository encoded in the image name, which is what Harbor does
and what JFrog/Nexus users already expect.

| Option | You get | It costs |
|---|---|---|
| **A. `/<format>/<repo>/` prefixes, OCI at `/v2/`** | One host and port; matches the conventions existing registry clients and users know | OCI is a named special case in the registration mechanism from day one |
| **B. Strictly uniform prefixes, OCI on its own listener or host** | Registration stays uniform with no special case | A second port or hostname to operate, document, and TLS-terminate |

**Why this is yours:** the URL layout is a permanent, user-visible contract across all 33
ecosystems; it cannot be discovered later without breaking clients.

### Q4: Do write-triggered shared services (signed index generation, async import tasks) enter this interface now, or wait for their formats?

The request-in/response-out shape has no home for work a write triggers: Debian and RPM clients
hard-refuse unsigned indexes that must be regenerated atomically on publish, and Galaxy v3
imports are asynchronous tasks the client polls. The prior art is direct: Gitea's 7-of-22
service-layer formats are exactly the generated/signed-index class
(`registry-architecture-prior-art.md`), and Phase 2 (generic plus OCI) exercises neither
mechanism, so "proven by two" proves nothing about the class the evidence says is expensive.
The shared-concerns list currently omits both.

**Recommendation:** name the two axes now (a shared signing/index service and a shared task
service) as consumed-not-implemented concerns in this spec, and spec their internals alongside
their first consumers (Debian, Ansible collections).

| Option | You get | It costs |
|---|---|---|
| **A. Name the axes now** | The interface will not need surgery mid-Tier-1, and the "proven by two" claim is honest about what it does not prove | Two shared surfaces named before any consumer exists |
| **B. Defer wholly to the format specs** | Nothing speculative in the foundation spec | The first signed-index format lands as an interface revision, re-opening this spec mid-Tier-1 and contaminating the format N+1 cost measurement |

**Why this is yours:** it prices where the interface is allowed to change against the
experiment's own cost curve, which is the project's headline metric.

### Q5: Should CLAUDE.md's "Both paths, always" rule be amended to name the generic exception?

The resolved proxy-path decision grants `generic` a proxy exemption, but the constitution states
the rule without exceptions, and this project's process forbids silent exceptions: a spec that
contradicts a standing rule is a request to change `CLAUDE.md`, raised as an open question.

**Recommendation:** yes - add one clause to the "Both paths, always" rule naming `generic` as
the sole spec-recorded exemption.

| Option | You get | It costs |
|---|---|---|
| **A. Amend CLAUDE.md** | Constitution and spec agree; reviewers stop re-flagging a sanctioned exception | A one-line constitution edit |
| **B. Leave as is** | No edit | Every future review of `generic` must rediscover that the contradiction is sanctioned |

**Why this is yours:** only the owner amends the constitution.

### Resolved: handler API shape (was Q1)

**Settled 2026-09-22: HTTP directly.** Handlers receive the real request and response. These
are HTTP protocols with header and status semantics - OCI's `Range` and `Location`, npm's
conditional requests - and an abstraction hiding them would be fought by every format in turn.

Accepted cost: shared concerns (auth, storage access, cache policy) are enforceable only by
architecture tests and lint, never by the compiler. Those tests are therefore not optional
niceties; they are the only thing holding the boundary. This also confirms the extension boundary
stays in-process: an interface carrying `*http.Request` cannot be served over gRPC.

### Resolved: proxy path obligation (was Q2)

**Settled 2026-09-22: mandatory, with `generic` the single permitted exception.** The proxy
path is the differentiator; making it optional is how it becomes permanently second-class and the
product quietly becomes a slower Gitea.

`generic` may declare proxy support `unsupported` because it has no ecosystem to proxy, and that
exception is named in its own spec so the conformance matrix does not imply a gap that does not
exist. No other format may use it without a spec change.

### Resolved: extension boundary (was Q3)

**Settled 2026-09-22: compile-time Go modules.** Each format is a package implementing the shared
interface, compiled into one binary. This is what Gitea does for 23 formats and Harbor for 15
upstream adapters; **no dynamic plugin runtime is required for modularity**, which comes from a
uniform interface plus a shared data model instead.

Accepted cost: a third party cannot add a format without forking, and every format ships in every
binary. Out-of-process gRPC (`go-plugin`, as Terraform and Vault use) buys third-party
extensibility, and that is worth paying for only once a third party wants it.

### Resolved: upstream adapter axis (was Q4)

**Settled 2026-09-22: yes, a separate axis.** One format handler, many upstream adapters, as
Harbor does with 15 adapters behind one OCI format. Upstreams differ in authentication and
quirks, not in wire format.

Accepted cost: a second interface to design and maintain before it has a second implementation.
The alternative hard-codes Docker Hub's auth into the OCI handler and needs surgery for ECR,
which is the union-of-quirks trap avoided elsewhere in this spec.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-22 | afbb4e4 | adversarial + constitution + go-spec-reviewer (claim verification vacuous pre-code; cross-spec citations checked instead) | Fixed internal contradictions (metadata ownership vs `data-model.md`, AC4 vs the generic exemption, a citation to a harness AC that does not exist); added AC6/AC7 because import-based architecture tests cannot hold the proxy and auth boundaries; raised Q1-Q5; stays `draft` |
