---
status: draft
status_description: "Second pass 2026-09-23: the four owner decisions were recorded but unapplied; folded through Design, Scope, ACs and the Test Plan, and the minimal method set is now pinned in Design. One new open question (Q6, egress enforcer strength) awaits the owner; stays draft."
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

- The handler interface: the pinned minimal method set (Design, "The pinned method set"),
  the construction contract, and the injected shared-layer dependencies.
- The registration mechanism: format-first mounts plus declared root-anchored claims
  (Design, "Routing and registration").
- The shared concerns handlers consume rather than implement: authentication, authorization,
  blob storage, metadata persistence through the shared data model (`data-model.md`), the proxy
  cache, and request logging.
- The conformance obligations a handler must satisfy to be considered complete.

**Out of scope**

- Any individual format. Those are separate specs under `docs/internal/plans/formats/`.
- Virtual/aggregate repositories that merge several backing repositories. A later spec, though
  the interface should not preclude it.
- Write-triggered shared services (signed-index generation, async import pipelines). Deferred
  by the resolved write-triggered services decision below: absent from the pinned method set,
  and prototyped against Debian before the scheduled re-open so the re-open is not blind to
  the expensive class.

## Design

### The shape

A handler is responsible only for **protocol translation**: turning its ecosystem's wire format
into calls against the shared layers, and back. It owns its routes, the shape of its
format-specific metadata document (stored opaquely through the shared model per `data-model.md`;
it never owns a table), and its content validation. It owns nothing else.

Concretely a handler:

- declares its mounts - the format-first prefix, plus any recorded root-anchored claim
  (Routing and registration, below) - and the requests it serves
- resolves a client request to a set of blob digests plus metadata
- validates and ingests an upload, returning digests for the shared store to commit
- renders its ecosystem's index/metadata documents from stored metadata
- for the proxied path, owns the request end to end: on a miss it derives the upstream
  request, calls the proxy layer's fetch-and-cache API with a classification of the response
  as an immutable artifact or as mutable metadata with a TTL - the distinction
  `proxy-cache.md` builds everything on - and applies any format-specific transform on the
  way back (rewriting npm packument URLs to point at this registry, for example). The
  fetch-and-cache entry point's signature belongs to `proxy-cache.md`, which must define it
  before OCI's proxied phase. Upstream authentication and provider quirks live in
  upstream adapters, a separate axis (see the resolved upstream adapter decision below), never
  in the handler

It does **not** open object storage directly, implement its own auth check, manage its own
cache, or call another handler. It also never assumes a repository has exactly one current
state: content resolves through the snapshot pointer the handler is given, the binding
constraint `data-model.md` places on every handler and backs with an architecture test.

### The pinned method set

Per the resolved interface method set decision below, the interface is pinned now, minimal,
and re-opened after OCI ships. This is the pin. The interface lives in `internal/format`,
implemented by `internal/format/<name>` subpackages and consumed by the server core and the
conformance runner. It is four methods - the set generic and OCI both need, and nothing
either merely might:

| Method | Shape | Why both Tier 0 formats need it |
|---|---|---|
| `Name()` | `string` | The catalogue key (`generic`, `oci`): the default mount prefix, the conformance matrix row, the log field |
| `Mounts()` | `[]Mount`, a `Mount` being a URL prefix plus a root-anchored flag | Generic returns the default format-first mount; OCI claims the root-anchored `/v2/` (Routing and registration, below) |
| `Capabilities()` | `Capabilities`, carrying proxy support: `supported` or `unsupported` | The machine-readable home of the declaration AC4's runner honours; generic declares `unsupported`, closing the "neither sibling spec currently says how" gap recorded in `formats/generic.md` |
| `ServeHTTP(w, r)` | embedded `http.Handler` | The resolved HTTP-direct decision: the handler receives the real request and response |

Construction is by injection: each format package exposes `New(deps Deps) Handler`, and
`Deps` carries the consumer-side interfaces to every shared layer the handler may touch -
the blob store (CAS), the metadata store (the three-level opaque documents and
snapshot-pointer resolution `data-model.md` defines), the proxy layer's fetch-and-cache
entry point (`proxy-cache.md`), the central authorizer (`auth.md`), and the request logger.
Those dependency interfaces' signatures belong to the specs that own the layers; this spec
pins only that they arrive through `Deps` and that a handler holds no capability it was not
handed.

Deliberately absent, not forgotten: lifecycle methods (`Init`, `Close`, health checks); a
resolve/list/upload operation vocabulary, because those are protocol operations a handler
serves over HTTP, which the HTTP-direct decision makes redundant as interface methods; and
any per-request classification hook, because classification travels as an argument to the
fetch-and-cache call per the proxied-miss decision. Additions ride the scheduled re-open,
argued from two real implementations and the Debian prototype rather than from anticipation.

This pin knowingly departs from the `go` skill's discover-don't-design guidance; the
departure, its justification and its mitigation are recorded in the resolved method set
decision below.

### Routing and registration

Per the resolved URL shape decision below, URLs are format-first:
`/{format}/{repository}/...`, where `{format}` is the handler's `Name()`. Registration
validates every mount: a non-root mount must be exactly `/{Name()}/`, and a root-anchored
mount is accepted only where the claiming format's spec records the carve-out - explicit and
commented, never looking like an accident to the next reader.

The carve-out class is ecosystems that address a registry by bare hostname, leaving no room
for a path prefix. OCI is the first: `docker pull host/name:tag` puts the repository inside
the OCI name path, so the handler claims the root-anchored `/v2/` the distribution spec
requires. The catalogue holds one more: Terraform/OpenTofu (Tier 3) is also host-addressed
and discovers services through `/.well-known/terraform.json` at the host root - the
Stackweaver monorepo's working registry implementation registers exactly that root route
(`HandleServiceDiscovery` in `backend/internal/api/routes/routes.go`) - though only the
discovery document needs anchoring, since its service entries can point back into
format-first space. Root anchoring is therefore a declared `Mount` the registration layer
validates, not an OCI if-statement in the router.

The opinionated-client check on the settled scheme, at published-spec level and to be
re-grounded in captured traffic when each format's spec is written: the Go module proxy
takes an arbitrary base URL through `GOPROXY`, including a path; Debian apt takes an
arbitrary base URL per sources.list entry; Cargo's sparse index takes an arbitrary base URL
(`sparse+https://...`), and its `config.json` carries absolute `dl` and `api` URLs that can
point anywhere format-first. None of the three needs root anchoring.

### Hosted and proxied are one handler, two paths

A single handler serves both, because the protocol is identical from the client's perspective;
only the source of truth differs. Per the resolved proxied-miss decision below, the handler
owns the request in both modes: on a proxied miss it calls the fetch-and-cache API rather than
being wrapped by the proxy layer. Nothing in the type system forces a handler through that
API, which is exactly the bypass AC6's egress lint rule exists to close.

This is also where the project's standing duplicated-path trap lives: a claim verified against
only the hosted path is not verified. Conformance cases are required in both modes: the case
definition in `conformance-harness.md` requires a `mode` on every case, its AC11 fails a format
whose case set covers only one mode, AC4 below is this spec's side of that contract with
`Capabilities()` as the home of the declared exemption the runner honours, and `CLAUDE.md`
makes it a review rule.

### Definition of done for a format

A format is complete when, and only when:

1. Conformance cases pass in **both** modes, against at least two client versions - or the
   format's spec records a declared unsupported mode matching its `Capabilities()`
   declaration (`generic` is the single permitted case).
2. Replay-match passes against a recorded corpus from a reference implementation.
3. No case is skipped without an issue number.
4. Its spec under `docs/internal/plans/formats/` records which parts of the ecosystem protocol
   are deliberately unimplemented, so the matrix does not imply coverage that does not exist.

### The scheduled re-open

The pin above is expected to be wrong about something; the mitigation is a re-open argued
from evidence, not a better guess now. Concretely:

- **Trigger:** OCI passes its conformance gate (`formats/oci.md` AC1).
- **Blocked on it:** any Tier 1 handler work. npm is the format-cost baseline, and revising
  the interface mid-Tier-1 would contaminate the experiment's headline measurement, so the
  re-open lands first.
- **Inputs:** the generic and OCI implementations, and the Debian write-triggered services
  prototype (the resolved write-triggered services decision below).
- **Form:** a `/spec review` pass over this spec, its outcome recorded in the Review Log and
  reflected in "The pinned method set"; the owner adjudicates any change.

AC8 makes this a criterion of this spec rather than an intention.

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
- [ ] AC6: No handler performs its own network egress: inside `internal/format/**`, any call
      that moves bytes upstream - `net/http`'s package-level request helpers, `Client.Do`,
      `Transport.RoundTrip`, and the `net.Dial`/`net.Dialer` variants - fails `make verify`
      via a type-aware forbid rule (forbidigo with `analyze-types`, binding to the resolved
      `net/http` and `net` symbols rather than to spellings), and a committed violation
      fixture proves the rule fires. (Import-based architecture tests cannot catch this,
      because every handler legitimately imports `net/http` for its request and response
      types; enforcement therefore binds to egress call sites. Whether an import allowlist
      also backs this rule is Q6.)
- [ ] AC7: Every format's conformance case set includes unauthenticated and unauthorized request
      cases in both modes, and the runner rejects a case set without them, so a handler that
      skips the shared auth check fails conformance rather than review.
- [ ] AC8: Before any Tier 1 handler work begins, the scheduled re-open has run: this spec's
      Review Log carries the post-OCI re-open entry, and "The pinned method set" reflects its
      outcome, re-affirmed or revised, with the generic and OCI implementations and the
      Debian prototype cited as its evidence.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/<format>/` |
| AC2 | architecture test | `internal/format/arch_test.go` |
| AC3 | architecture test | `internal/format/arch_test.go` |
| AC4 | unit | `conformance/core/case_validate_test.go` |
| AC5 | manual | recorded in `docs/internal/tasks/experiment-log.md` per format |
| AC6 | lint + unit | forbid rule in `.golangci.yml`; violation fixture behind a `lintfixture` build tag, with a Go test invoking the pinned golangci-lint against it and failing unless the rule fires |
| AC7 | unit | `conformance/core/case_validate_test.go` |
| AC8 | manual | the re-open `/spec review` pass, recorded in this spec's Review Log before npm work starts |

AC5's manual procedure: for each landing format, inspect the PR diff and record in the
experiment log that it touches only `internal/format/<name>/`, its conformance cases, and the
route registration point; any other file is a finding against this spec.

## Implementation Phases

### Phase 1: Interface and registration
- Interface definition, route registration, architecture tests

### Phase 2: Proven by two
- Generic and OCI handlers, confirming the interface survives a trivial and a hard format

### Phase 3: The scheduled re-open
- The Debian write-triggered services prototype, then the re-open review pass (AC8), before
  any Tier 1 handler work

## Tasks

Left empty by design. Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

One question from the 2026-09-23 review awaits the owner. Resolved decisions follow it and
are kept rather than deleted, so the reasoning survives the next time someone asks why it
was done this way.

### Q6: Does the egress boundary need an import allowlist behind the forbid rule?

**Recommendation:** B, the forbid rule now with the allowlist added at the re-open - the rule
covers every stdlib egress path today, the residual hole (a handler importing a third-party
HTTP client) is loud in any PR diff, and the re-open will have two real handlers' import
lists to seed an allowlist from rather than a guess.

| Option | You get | It costs |
|---|---|---|
| **A. Type-aware forbid rule only (AC6 as written)** | One rule, near-zero friction on legitimate handler code | A handler importing resty or a gRPC client egresses invisibly to the linter; the boundary's last line becomes PR review, which the constitution says is not enforcement |
| **B. Forbid rule now, import allowlist at the re-open** | The hole closes without guessing the allowlist; Tier 0 friction stays zero | A window until the re-open in which the third-party bypass exists, held only by review |
| **C. Forbid rule plus a depguard import allowlist for `internal/format/**` now** | The hole closes immediately; every new handler import is a deliberate, linted decision | Every legitimate new import (a tar parser, a semver library) fails lint until the allowlist grows, and the list must be guessed before any handler has an import list |

**Why this is yours:** it prices lint friction on Tier 0 development against a bypass class
on the project's single most safety-critical boundary, which the constitution says must not
be held by review alone.

### Resolved: interface method set (was Q1)

**Settled 2026-09-23: pin a minimal method set now, and explicitly re-open it after OCI ships.**
The smallest set that generic and OCI both need, defined before either is built, so work can
proceed in parallel rather than strictly sequentially.

This is a deliberate, recorded departure from the `go` skill's discover-don't-design guidance.
The justification is that the alternative serialises Phase 1 and Phase 2 onto one worker, and the
mitigation is the scheduled re-open: after OCI passes its conformance suite, the interface is
revisited with two real implementations in hand.

Accepted cost: the first cut will be wrong about something, and revising it mid-Tier-1 would
contaminate the format-cost measurement that is the experiment's headline metric. The re-open is
therefore scheduled **before** npm starts, not whenever it becomes convenient - Phase 3 and
AC8 carry the trigger and the gate. The pin itself is in Design ("The pinned method set");
folded 2026-09-23.

### Resolved: proxied-miss control flow (was Q2)

**Settled 2026-09-23: the handler owns the request and calls a fetch-and-cache API on a miss.**
Format-specific transforms, such as rewriting npm packument URLs to point at this registry, then
live where the format knowledge already is rather than leaking into the shared proxy layer.

Accepted cost: every handler must remember to route through that API, and nothing in the type
system forces it. This is precisely why the network-egress lint rule over `internal/format/**`
exists: it is the mechanical enforcer for this decision, not a general hygiene rule. Folded
into Design ("The shape", "Hosted and proxied are one handler, two paths") 2026-09-23.

### Resolved: URL shape (was Q3)

**Settled 2026-09-23: format-first, `/{format}/{repository}/...`**, with OCI carved out at the
root-anchored `/v2/` the distribution spec requires, carrying the repository inside the OCI name
path. This is how Harbor and Gitea both resolve the same conflict.

Routing is then unambiguous and a format owns its entire subtree. Accepted cost: root
carve-outs are permanently special-cased in the routing layer, and each must be explicit and
commented rather than looking like an accident to the next reader.

Grounding note, 2026-09-23: "one format" was optimistic. The catalogue's Tier 3 contains a
second host-addressed ecosystem, Terraform/OpenTofu, whose `/.well-known/terraform.json`
discovery document is likewise root-anchored (the Stackweaver monorepo's registry
implementation serves exactly that root route). The scheme itself is unaffected, since the
discovery document points back into format-first space; registration therefore expresses
root anchoring as a declared `Mount` rather than a one-off (Design, "Routing and
registration").

### Resolved: write-triggered shared services (was Q4)

**Settled 2026-09-23: not added to the interface now, but prototyped against Debian before the
interface re-opens after OCI.**

The reasoning is that generic and OCI exercise neither signed-index generation nor async import
tasks, and prior art identifies signed-index formats as the expensive class. Re-opening the
interface with only those two implementations in hand would be re-opening it blind.

Accepted cost: the Debian spike costs time on a Tier 1 format out of order, and some rework
remains when these services properly land. That is cheaper than discovering mid-Tier-1 that the
interface cannot express them, which would contaminate the format-cost measurement. Folded
into Scope (out of scope) and Phase 3, 2026-09-23.

### Resolved: the generic proxy exemption in the constitution (was Q5)

**Closed 2026-09-22 as a documentation correction, not an owner decision.** The owner
had already settled that `generic` is exempt from the proxied-path obligation; `CLAUDE.md`
simply had not been updated to record it, so the rule read as absolute. The constitution
now names the exemption and states that no other format may use it without a spec change.

Raised independently by two reviewers, from this spec and from the other one.

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
| 2026-09-23 | 3e3ae0a | folded-decision application + adversarial + constitution + go-spec-reviewer (tree claim verification vacuous pre-code: the tree holds a stub `cmd/stackweaver-registry/main.go` only; cross-spec, catalogue and protocol claims checked instead) | All four folded decisions were recorded but unapplied to the body: pinned the method set into Design (the central artifact was still absent), rewrote the pre-decision declarative proxied-path prose to the handler-calls-fetch-and-cache flow, added Routing and registration with the Terraform root-anchor grounding, moved write-triggered services into Scope and Phase 3, added AC8 plus the re-open trigger and gate; corrected the stale claim that the harness spec lacks a mode-coverage AC (its AC11 is that AC); tightened AC6 to type-aware call-site enforcement with a fixture test; added the missing `## Tasks` section; raised Q6 (egress import allowlist); stays `draft` on Q6 |
