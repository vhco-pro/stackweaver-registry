---
status: draft
status_description: "Fold 2026-09-26 at 4d1aeb1 under the owner's standing delegation: Q9 adopted (the re-open's evidence set gains the request-to-coordinate evidence, and must re-examine rather than inherit out-of-cycle amendments). auth.md's pattern decision made the second such amendment here: the pinned Scope type carries an addressed object (named, content-addressed or none); the method set stays at five. AC7 and AC8 extended, AC12 added; generic's parallel replay-exemption decision absorbed as a second Capabilities field and AC13 (now 13 criteria). Zero open questions. Stays draft pending a gate review."
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
conformance runner. It is five methods - the set generic and OCI both need, and nothing
either merely might:

| Method | Shape | Why both Tier 0 formats need it |
|---|---|---|
| `Name()` | `string` | The catalogue key (`generic`, `oci`): the default mount prefix, the conformance matrix row, the log field |
| `Mounts()` | `[]Mount`, a `Mount` being a URL prefix plus a root-anchored flag | Generic returns the default format-first mount; OCI claims the root-anchored `/v2/` (Routing and registration, below) |
| `Capabilities()` | `Capabilities`, carrying proxy support (`supported` or `unsupported`) and reference-implementation availability (`available` or `none`) | The machine-readable home of the two declarations the harness honours: AC4's runner honours `unsupported`, and the conformance matrix renders `none` as a replay-match exemption (AC13). Generic declares both, closing the "neither sibling spec currently says how" gap recorded in `formats/generic.md`; the second field arrived with generic's resolved replay-exemption decision |
| `Scope(r)` | `(Scope, error)`, a `Scope` being a repository, one of `pull`/`push`/`delete`, and the **addressed object**: exactly one of *named* (the handler's canonical name for the finest named thing the route addresses), *content-addressed* (content identified by digest, or an upload bound to one), or *none* (the repository as a whole, including every name-enumerating route). **An error denies the request**, with the same response an unauthorized caller receives | The route-to-scope mapping the central authorizer evaluates (`auth.md`). Needed from the **first** format, not at the re-open: AC7's unauthenticated, unauthorized and pattern-refusal cases apply from day one, and without this the shared layer cannot know what it is authorizing. The addressed object is the second out-of-cycle amendment (below): generic reports artifact paths, OCI reports tags, and both have content-addressed and listing routes, so both Tier 0 formats exercise all three kinds |
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
The two exceptions, both to what `Scope(r)` carries and both forced by a sibling security
decision rather than anticipated, are recorded below as out-of-cycle amendments.

**`Scope(r)` itself is the first out-of-cycle amendment**, made 2026-09-23. It entered the pin
from a sibling decision rather than from this spec: `auth.md`
settled that each handler declares a route-to-scope mapping which the shared layer evaluates,
so that per-format URL grammar - including OCI's slash-bearing names under `/v2/` - never
reaches security-critical shared code. The dependency is recorded here as well as there,
because a contract enforced on one side only is enforced nowhere.

Its failure mode is stated for the same reason: a handler whose mapping omits a route
under-protects itself silently. That is what `auth.md` AC18 and this spec's AC7 catch (auth.md's
own AC7 is credential-leak scanning; its side of the per-format cases is AC8), which is why both
are runner-enforced rather than advisory.

**The addressed object is the second out-of-cycle amendment**, made 2026-09-26 for `auth.md`'s
pattern-evaluation decision (its resolved record, was Q13, adopted under the owner's standing
delegation). That spec settled path and tag patterns that narrow a scope within one repository,
and the pin as first written made them unimplementable: `Scope(r)` handed the central authorizer
only a repository and an action, so it never saw the path or tag a pattern must match. The two
places a pattern could otherwise be evaluated are both forbidden - an auth check inside the
handler, or per-format URL grammar in shared code - so the type grew, and only the type: the
method set stays at five. Which object kind each route reports is declared in the format's own
spec; how each kind evaluates against a pattern is `auth.md`'s ("Pattern scopes").

Its failure mode is the first amendment's, sharpened. A handler reporting a named route as
*content-addressed* or *none*, or reporting a name that is not the canonical one, over-grants or
under-grants a patterned credential silently, so AC12 table-tests every handler's object
reporting per route and AC7 requires a pattern-refusal case in every format's case set.

The same structural gap - the pin maps a request to a repository and an action, and nothing
finer - was hit independently from the policy side: central policy evaluation needs the package
and version being resolved. That need is met without a further amendment: `supply-chain-policy.md`
settled its evaluation hook (its resolved record, was Q4, adopted 2026-09-26) as enforcement
inside the policy-enforcing resolution calls the server core hands every handler through
`Deps`, where the package and version are already structured arguments; the addressed object
is a canonical string for matching, not a structured coordinate, so it does not serve policy.
Whether the two converge on one structured request coordinate is a question for the scheduled
re-open, which now takes both as named inputs (the resolved re-open evidence decision below).

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
2. Replay-match passes against a recorded corpus from a reference implementation - or the
   format's spec records that no reference implementation exists and its `Capabilities()`
   declares `none`, which the matrix renders as exempt, never as passing (AC13). `generic` is
   the single permitted case, per the replay-exemption decision `formats/generic.md` resolved
   2026-09-26 under the owner's standing delegation, and the exemption is contained exactly as
   the proxy one is: only a format whose own spec records it may declare it.
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
  prototype (the resolved write-triggered services decision below). Per the resolved re-open
  evidence decision below, also the **request-to-coordinate evidence**, because none of those
  three would surface it: `auth.md`'s pattern-evaluation outcome, as the addressed-object
  amendment actually behaved in the generic and OCI handlers; `supply-chain-policy.md`'s
  outcome on where central policy evaluation intercepts a request; and, recorded beside them as
  further evidence that the pin and the shared model were fixed before the formats that stress
  them existed, `ansible-collections.md`'s finding that an asynchronous import task has no
  entity in the shared model.
- **Out-of-cycle amendments are re-examined, not inherited:** the re-open re-affirms or revises
  each amendment made between the pin and the re-open - `Scope(r)` (2026-09-23) and its
  addressed object (2026-09-26), each made early because a sibling security decision was
  unimplementable without it - on the same evidence standard as the rest of the method set, and
  states whether the addressed object and the policy coordinate should converge.
- **Form:** a `/spec review` pass over this spec, its outcome recorded in the Review Log and
  reflected in "The pinned method set"; the owner adjudicates any change.
- **Also delivered at the re-open:** the egress import allowlist (AC9). The forbid rule covers
  every stdlib egress path from day one, but a handler importing a third-party HTTP client
  bypasses it. That hole is held by review until the re-open, which is the first moment two
  real handlers' import lists exist to seed an allowlist from rather than guessing one and
  failing lint on every legitimate new dependency.

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
      demonstrated by the **npm** handler landing without shared-layer edits. The witness is npm
      rather than OCI because the proxy layer is built with OCI at step 4, so OCI necessarily
      lands alongside shared-layer work and cannot evidence this property.
- [ ] AC10: A request whose `Scope(r)` returns an error is denied with the response an
      unauthorized caller receives, never served and never distinguishable from a forbidden or
      missing resource, while the server log records the real cause.
- [ ] AC11: Registration enforces the mount scheme mechanically: a handler declaring a
      non-root mount other than exactly `/{Name()}/`, or a root-anchored mount absent from the
      registration layer's explicit carve-out list, fails registration before the server serves
      any request - proven by fixture handlers declaring each violation. (That a carve-out is
      also recorded in the claiming format's spec stays a review rule; the list is its
      mechanical shadow.)
- [ ] AC6: No handler performs its own network egress: inside `internal/format/**`, any call
      that moves bytes upstream - `net/http`'s package-level request helpers, `Client.Do`,
      `Transport.RoundTrip`, and the `net.Dial`/`net.Dialer` variants - fails `make verify`
      via a type-aware forbid rule (forbidigo with `analyze-types`, binding to the resolved
      `net/http` and `net` symbols rather than to spellings), and a committed violation
      fixture proves the rule fires. (Import-based architecture tests cannot catch this,
      because every handler legitimately imports `net/http` for its request and response
      types; enforcement therefore binds to egress call sites.)
- [ ] AC7: Every format's conformance case set includes unauthenticated, unauthorized and
      pattern-refusal request cases in both modes (a pattern-refusal case presents a token
      patterned to one named object against another, and expects denial), and the runner
      rejects a case set without them, so a handler that skips the shared auth check or
      misreports its addressed object fails conformance rather than review.
- [ ] AC12: Every handler's `Scope(r)` returns the correct addressed object for each of its
      routes: a named-object route carries its canonical name, a digest-addressed or upload
      route is content-addressed, and a name-enumerating or repository-wide route is none - proven
      per handler by a table test over its whole route set, in which a route absent from the
      table fails the test.
- [ ] AC13: `Capabilities()` carries reference-implementation availability beside proxy
      support; the generic handler declares `none`, every other registered handler declares
      `available`, and a format declaring `none` is rendered by the conformance matrix as
      exempt from replay-match citing its spec, never as passing - the same contract
      `conformance-harness.md` AC20 states from the matrix side.
- [ ] AC9: At the scheduled re-open, a depguard import allowlist for `internal/format/**` is in
      place, seeded from the generic and OCI handlers' actual import lists, and a fixture
      importing a third-party HTTP client fails `make verify`. Until then the residual bypass
      is accepted and named in the re-open's inputs.
- [ ] AC8: Before any Tier 1 handler work begins, the scheduled re-open has run: this spec's
      Review Log carries the post-OCI re-open entry, and "The pinned method set" reflects its
      outcome, re-affirmed or revised, with the generic and OCI implementations, the Debian
      prototype and the request-to-coordinate evidence named in "The scheduled re-open" cited
      as its evidence, and with an explicit verdict on each out-of-cycle amendment and on
      whether the addressed object and the policy coordinate converge.

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
| AC9 | lint + unit | depguard allowlist in `.golangci.yml`; third-party-client fixture behind the `lintfixture` build tag, asserted by the same runner test as AC6 |
| AC10 | unit + conformance | `internal/format/scope_test.go` (denial semantics plus the server-log assertion, which is not protocol-observable and so cannot live in a conformance case per `conformance-harness.md`'s observation rule); a deliberately unmapped route in `conformance/core/` asserting the response is indistinguishable from an unauthorized one |
| AC11 | unit | `internal/format/register_test.go` (fixture handlers: wrong non-root prefix, unlisted root anchor) |
| AC13 | unit | `internal/format/capabilities_test.go` (every registered handler's declaration: `none` for generic only); the matrix rendering itself is asserted by `conformance-harness.md` AC20's fixture formats |
| AC12 | unit | `internal/format/<name>/scope_test.go` per handler (route table covering every mount's routes and all three object kinds), with a shared helper in `internal/format/scope_test.go` that fails when a registered route is missing from the table |

AC5's manual procedure: for each landing format, inspect the PR diff and record in the
experiment log that it touches only `internal/format/<name>/`, its conformance cases, and the
route registration point; any other file is a finding against this spec.

## Implementation Phases

### Phase 1: Interface and registration
- Interface definition, including the `Scope` type with its addressed object, route
  registration, architecture tests

### Phase 2: Proven by two
- Generic and OCI handlers, confirming the interface survives a trivial and a hard format

### Phase 3: The scheduled re-open
- The Debian write-triggered services prototype, then the re-open review pass (AC8) over it,
  the two Tier 0 handlers and the request-to-coordinate evidence, before any Tier 1 handler
  work

## Tasks

Left empty by design. Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None remain open. Q9 was raised by the 2026-09-25 gate review and adopted on 2026-09-26 under
the owner's standing delegation; its record opens by saying so, and the owner may reverse it.
The resolved records that follow are kept rather than deleted, so the reasoning survives the
next time someone asks why it was done this way.

### Resolved: the re-open's evidence set and the request-to-coordinate gap (was Q9)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: both sibling outcomes are
named inputs to the scheduled re-open, and an out-of-cycle amendment to `Scope` is tolerated
because `auth.md` answered "amend now". It did, in the same pass (its resolved pattern-evaluation
record, was Q13), so the amendment is made: the pinned `Scope` type carries an addressed object,
recorded in "The pinned method set" as the second out-of-cycle amendment with its reason, while
the method set stays at five. The policy side needs no amendment: `supply-chain-policy.md` resolved its
evaluation hook (was Q4, adopted the same day) as enforcement inside the shared resolution
calls in `Deps`.
`ansible-collections.md`'s finding that an asynchronous import task has no entity in the shared
model is recorded beside them as further evidence the pin and the model were fixed early.
Folded through Design ("The pinned method set", "The scheduled re-open"), AC7, AC8, the new
AC12, the Test Plan and Phases 1 and 3.

Accepted cost: the re-open's scope is now partly set by sibling schedules, and a second
out-of-cycle amendment further erodes the pin the experiment measures against; the re-open is
therefore obliged (AC8) to re-examine both amendments on the same evidence standard rather than
inherit them, so they cannot become permanent by default. B lost because it decided auth's
question from the wrong spec - the amendment it proposed is the one now made, but made where the
security decision lives and with a grammar and evaluation rules behind it. C lost because the
re-open could run on inputs that exercise neither pattern scoping nor policy and re-affirm a
method set two specs had already shown incomplete.

The question as raised: the re-open's inputs were the generic and OCI implementations plus the
Debian prototype, and two sibling specs had hit the same wall before any code existed - the pin
translates a request to a repository and an action and nothing finer - with none of the three
inputs able to surface it.

| Option | You get | It costs |
|---|---|---|
| **A. Add both sibling outcomes to the re-open's named inputs; tolerate an out-of-cycle `Scope` amendment if auth.md's pattern question answers that way** | The re-open cannot run blind to a gap already proven twice; the pin's amendment path stays the precedented one | The re-open's scope is partly set by sibling schedules, and a second out-of-cycle amendment further erodes the pin the experiment measures against |
| **B. Amend the pin here and now: `Scope` grows an optional addressed-object field** | The gap closes before any handler is built, and auth AC19 becomes implementable immediately | Decides auth's question from the wrong spec, and adds a field no Tier 0 format exercises - the exact anticipation the pin exists to refuse |
| **C. Leave the re-open's inputs as written; sibling answers arrive whenever their specs resolve** | The pin and the re-open stay exactly as adjudicated | The re-open can run and re-affirm a method set two specs have already shown incomplete, because none of its inputs exercises the gap |

One correction to B's row as raised: it said no Tier 0 format exercises the field. Both do -
generic's path-scoped CI credential is the scope decision's own `prod/*` example, and OCI's is
its "one tag" example - which is part of why the amendment met the pin's own bar for an early
addition.

### Resolved: the Scope() failure mode (was Q7)

**Settled 2026-09-23: deny, with the same response an unauthorized caller receives.** A request
the authorizer cannot classify is treated exactly as one it classifies and refuses.

Fail-closed is consistent with the rest of the boundary: `auth.md` already treats a missing
visibility record as private, and returns 404 rather than 403 so that forbidden and missing are
indistinguishable. An unmapped route therefore becomes unreachable rather than unguarded, and it
does not become an oracle either.

Accepted cost: a handler bug presents as a permissions problem, which is a confusing thing to
debug. The mitigation is that the server logs the real cause even though the response does not
reveal it.

### Resolved: AC5's witness (was Q8)

**Settled 2026-09-23: the demonstration moves to npm**, the first format landing after the
shared layers are complete. AC5's property is unchanged; only its witness was wrong.

The criterion previously named generic and OCI, but the build order puts the proxy/cache layer at
step 4 **with** OCI, so OCI cannot land without shared-layer work and the criterion was
falsifiable by construction. The contradiction arrived with the build-order change rather than
from this spec, and it survived a fold and two reviews because each pass read only one side of it.

Accepted cost: the interface's central promise goes unmeasured until npm, which is also the
format-cost baseline. That is tolerable because the scheduled re-open sits between OCI and npm,
so the interface is revisited with two implementations in hand before the claim is first tested.

### Resolved: the egress import allowlist (was Q6)

**Settled 2026-09-23: the type-aware forbid rule ships now; the import allowlist lands at the
scheduled re-open.** The rule covers every stdlib egress path from day one. The residual hole is
a handler importing a third-party HTTP client, which is loud in a pull-request diff and which the
re-open can close from evidence, seeded from the generic and OCI handlers' real import lists.

Accepted cost, stated because the constitution is explicit that review is not enforcement: for
the window between now and the re-open, **this bypass class is held only by review** - on the
boundary that decides whether the proxy cache can be silently skipped. Guessing the allowlist now
is the alternative, and it fails lint on every legitimate new dependency before any handler exists
to justify one.

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

Ownership note, 2026-09-25: no spec yet defines the adapter interface itself. `proxy-cache.md`
consumes the axis (its negative-caching and preconfigured-upstream sections route provider
quirks to adapters) and OCI's proxied phase is its first implementation, but the interface's
shape currently has no owning document - the same one-directional-dependency shape this spec's
fetch-and-cache obligation was corrected for.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-25 | 9a8f86d | gate review (draft -> planned decision): folded-decision application over all 12 resolved records + the `go` skill's interface lens applied hard (discovered-vs-designed, size, consumer placement, the *http.Request shape against the prior-art out-of-process finding) + adversarial + cross-spec (auth Q13 and AC18, supply-chain-policy Q4, conformance-harness AC11 and its protocol-observation rule, proxy-cache's fetch-and-cache obligation, npm's re-open gate, generic's Capabilities contract and open Q7, oci AC1, the catalogue's Tier 3 row) + constitution. Claim verification against code vacuous pre-implementation: the tree holds only a stub `cmd/stackweaver-registry/main.go` and no `internal/`; cross-spec claims and the one monorepo claim (`HandleServiceDiscovery` on the root `/.well-known/terraform.json` route) verified instead. Independent: this reviewer authored none of this spec's prior content | Gate not passed; stays draft on Q9. Eleven of twelve resolved decisions verified genuinely applied through Scope, Design, ACs and Test Plan; the twelfth, the URL-shape decision, reached Design ("Registration validates every mount") but had no policing criterion - AC11 added with a Test Plan row (fixture handlers failing registration on a wrong non-root prefix and an unlisted root anchor), closing the 12-decisions-versus-10-criteria gap where it was real. The discover-don't-design departure re-checked and found honestly recorded with its mitigation; the *http.Request foreclosure of an out-of-process boundary is knowingly priced in the resolved HTTP-direct and extension-boundary records, matching the prior-art warning rather than contradicting it, so no finding there. The sibling convergence verified independently rather than accepted: what was then auth.md Q13 and what was then supply-chain-policy.md Q4 hit the same structural gap in the pin (a request translates to repository plus action and nothing finer), none of the re-open's three named inputs would surface it, and both are now recorded in "The pinned method set" as pending inbound amendments, with the re-open's evidence set raised as Q9 for the owner, not decided. Corrections applied: the mapping-omission catch re-attributed to auth.md AC18 plus this spec's AC7 (auth.md's own AC7 is credential-leak scanning; its side is AC8); AC10's Test Plan row split, since a server-log assertion is not protocol-observable and the harness's observation rule bars it from a conformance case; the unowned upstream-adapter interface noted in its resolved record as a one-directional dependency. npm.md re-verified to carry the same re-open gate from its side; what was then generic.md Q7's pending amendment to definition-of-done item 2 confirmed still open and correctly hooked. |
| 2026-09-23 | 77b52ad | design + cross-spec consistency, **not independent**: this pass was run by the author of the `Scope(r)` addition, so its adversarial value on that method is limited and a later independent pass should re-check it | Mechanical gate clear (9 ACs, all mapped, no stale references). Two findings raised as Q7 and Q8: the runtime failure mode of `Scope(r)` is undefined on the authorization boundary, and AC5 is falsifiable by construction now that the proxy layer ships with OCI. Stays draft. |
| 2026-09-22 | afbb4e4 | adversarial + constitution + go-spec-reviewer (claim verification vacuous pre-code; cross-spec citations checked instead) | Fixed internal contradictions (metadata ownership vs `data-model.md`, AC4 vs the generic exemption, a citation to a harness AC that does not exist); added AC6/AC7 because import-based architecture tests cannot hold the proxy and auth boundaries; raised Q1-Q5; stays `draft` |
| 2026-09-23 | 3e3ae0a | folded-decision application + adversarial + constitution + go-spec-reviewer (tree claim verification vacuous pre-code: the tree holds a stub `cmd/stackweaver-registry/main.go` only; cross-spec, catalogue and protocol claims checked instead) | All four folded decisions were recorded but unapplied to the body: pinned the method set into Design (the central artifact was still absent), rewrote the pre-decision declarative proxied-path prose to the handler-calls-fetch-and-cache flow, added Routing and registration with the Terraform root-anchor grounding, moved write-triggered services into Scope and Phase 3, added AC8 plus the re-open trigger and gate; corrected the stale claim that the harness spec lacks a mode-coverage AC (its AC11 is that AC); tightened AC6 to type-aware call-site enforcement with a fixture test; added the missing `## Tasks` section; raised Q6 (egress import allowlist); stays `draft` on Q6 |
| 2026-09-26 | 4d1aeb1 | folding adopted recommendations under the standing delegation. Not a gate review | Adopted Q9 A: the re-open's named inputs now include the request-to-coordinate evidence (auth.md's pattern-evaluation outcome as the addressed object behaves in the generic and OCI handlers, supply-chain-policy.md's evaluation-hook outcome, and ansible-collections.md's async-import-task finding as further evidence the pin and model were fixed early), and the re-open must give an explicit verdict on each out-of-cycle amendment and on whether the addressed object and the policy coordinate converge. auth.md adopted its pattern question as "amend now" in the same pass, so the amendment is made and recorded as out of cycle, with why: the pinned `Scope` type gains an addressed object of three kinds (named, content-addressed, none), because the only other places a pattern could be evaluated - inside a handler, or per-format URL grammar in shared code - are both forbidden; the method set stays at five. `Scope(r)` itself relabelled as the first out-of-cycle amendment. Policy needs no amendment, since supply-chain-policy.md resolved its hook inside `Deps` in parallel; the citations were updated to that resolution. Criteria: AC7 extended with a runner-enforced pattern-refusal case; AC8 extended to the new inputs and verdicts; AC12 added (per-handler route table test of object reporting, missing routes failing) with a Test Plan row; Phases 1 and 3 updated. Q9's option B row corrected: both Tier 0 formats do exercise the field. The 2026-09-25 row's two sibling-question citations reworded to past tense, since both questions are now resolved; its meaning is unchanged. Also absorbed, because it landed in parallel and left this spec citing a resolved question as open: `formats/generic.md` adopted its replay-match exemption the same day, so `Capabilities()` gains reference-implementation availability, definition-of-done item 2 now states the exemption and its containment, and AC13 asserts it with a Test Plan row (now 13 criteria). Stays draft. |
