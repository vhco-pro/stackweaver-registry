---
status: draft
status_description: "Leftovers pass of the closing sweep 2026-09-28 at 4278ce0 on Opus (not a review): the fetch-and-cache re-open input and AC8 name what the request gained, the git location {url, commit} (upstream-adapters was-Q9), the kept-blob digests in the adoption check's result, the classification's evictability (proxy-cache was-Q21), the retention count with zero valid and the declared counts so far (proxy-cache was-Q19) and the declaring level (was-Q22); the replay entry refuses a non-GET method and a local or virtual repository before dispatch and no wire request can carry the marker, the cases auth AC36 relies on (AC18 and its replay_entry_test.go row extended); the AC10 placement cites auth AC36 and the AC10 procedure; async-operations AC30 cited. The pin stays five; 18 criteria; no new question. Earlier, closing reconciliation sweep 2026-09-28 at b0fa0b3 on Opus (not a review): the pin stays five. Deps gains Documents (ServeDocument, ServeRendered, ServeFile, SignedBy; signing-service was-Q14), the claim declaration on the write transaction (management-api was-Q14) and the advisory key on the metadata-store write and the fetch-and-cache request (supply-chain was-Q11), with the advisory reader keyed by repository (was-Q12) (AC17); Operator.Authorize returns format.Addressed and format.Binding gains a route-level-object flag (management-api was-Q13, was-Q14); Scope admits an empty repository for a descriptor only, OCI GET /v2/ (auth AC32, oci was-Q8; AC12); the import boundary adds internal/signing (AC15); Q11 adopted (the proxy.revalidate replay, proxy-cache was-Q18, reaches handlers through one replay entry built in the composition root and injected into internal/proxy only; AC18). The re-open's inputs are rewritten as a complete list, each naming its source spec and question: several objects per Scope(r), the fetch-and-cache request with the adoption check and advisory key, the second dispatch, the Deps door as it has grown, and the exchange-echo declaration beside the route-scoped forms (auth was-Q25); Swift's alias rider superseded; AC8 requires a verdict on each. 18 criteria, zero open questions; carries fable_recheck. Earlier: reconciled 2026-09-28 at 95346bd with the foundation wave's step-3 leftovers (not a review): the pin stays five; Deps gains supply-chain's advisory reader and the WriteRefusal writer, the module's only hand-written status line (AC14); the reserved table names the replication segment as `replication` and adds `t` for auth's root path token, stripped by the authorizer before routing (AC11); the re-open takes two more named inputs, proxy-cache's fetch-and-cache request shape and auth's route-scoped credential declaration (with Chef's end-of-part hash, the base URL and Swift's alias coordinate riding it), each with an AC8 verdict. Earlier, 2026-09-27 at 713c1e3, reconciled with the foundation authoring wave (not a review): the pin stays five, held now by a reflection test (AC16); the three optional interfaces the new foundation specs introduced (management-api's Operator, signing-service's Indexer, web-ui's surface.Declarer) are recorded together as type-asserted at registration and as one named re-open input, with Q10 adopted under the standing delegation to keep them three rather than consolidate before the evidence exists; Scope's addressed object gains auth Q23's descriptor kind, riding the 2026-09-26 amendment, with the sentinel test in AC12; Capabilities gains Virtual and Rename (AC13); Deps gains the Verifier, upstream.Options on fetch-and-cache, the server.hosts lookup and a *slog.Logger with request correlation; the handler import boundary is one list with one test (AC15); the reserved-segment table is exhaustive (api, ui, healthz, readyz, metrics, the replication segment, exactly /) and AC11 fixtures each; the carve-out class splits into path-only (OCI) and host-bound (Terraform, Puppet /v3/) claims. Earlier (2026-09-26): Wave 1 folds, Q9 adopted. 16 criteria, zero open questions; stays draft pending a gate review."
description: "Spec for the common format handler interface, defining the hosted and proxied paths every format must implement and the boundaries handlers may not cross."
author: michielvha
goal: "Make adding a format a bounded, repeatable unit of work so an agent can implement one end to end without touching shared layers."
priority: "high"
issue: 4
created: 2026-09-21
covers:
  - "internal/format/**"
fable_recheck: "closing reconciliation sweep on Opus, 2026-09-28: adopted Q11 (the proxy.revalidate replay reaches handlers through one below-authorizer replay entry built in the composition root and injected into internal/proxy only, AC18) and folded the Deps additions, Operator signature changes and repository-less descriptor settled in sibling specs; needs a Fable recheck before any gate"
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
handler would reproduce 33 bespoke schemas. A handler is protocol translation over a shared
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
- The optional capability interfaces shared layers discover by type assertion at registration
  (Design, "Optional interfaces discovered at registration"): that they are optional, that they
  never grow the pin, and that registration records which a handler declares.
- The registration mechanism: format-first mounts, declared root-anchored claims (path-only
  and host-bound), the reserved first segments no handler may take, and the one replay entry
  through which the proxy layer's revalidation reaches a handler below the authorizer (Design,
  "Routing and registration").
- The shared concerns handlers consume rather than implement: authentication, authorization,
  blob storage, metadata persistence through the shared data model (`data-model.md`), the proxy
  cache, artifact verification, and request logging.
- The conformance obligations a handler must satisfy to be considered complete.

**Out of scope**

- Any individual format. Those are separate specs under `docs/internal/plans/formats/`.

- The semantics behind the optional interfaces: management operations and their vocabulary
  (`management-api.md`), index generation and signing (`signing-service.md`), client recipes
  and display hints (`web-ui.md`), deferred execution (`async-operations.md`), repository
  lifecycle and the `configure` operation (`repository-lifecycle.md`), and the host-binding
  configuration (`deployment.md`). Likewise the semantics behind the newer `Deps` entries: the
  serving door's validators and conditional rules (`signing-service.md`), the claim check and
  retirement (`management-api.md`, `storage-and-gc.md`), the advisory key's matching
  (`supply-chain-policy.md`) and the revalidation job (`proxy-cache.md`). This spec records only that each reaches a handler without
  growing the pin, and how registration discovers it.

- Write-triggered shared services (signed-index generation, async import pipelines). Deferred
  by the resolved write-triggered services decision below: absent from the pinned method set,
  and prototyped before the scheduled re-open in two halves, a Debian-shaped signed-index half
  and a Galaxy-shaped asynchronous half (`write-triggered-services-prototype.md`), so the
  re-open is not blind to either class.

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
  fetch-and-cache entry point's shape belongs to `proxy-cache.md`, which defines it in its
  "Obligation to the handler interface" (the coordinate and classification, for mutable
  metadata the handler's adoption check with the kept-blob digests it returns, for a revisioned
  document set its retention count and declaring level, the upstream location, ordered
  candidate list or git location, the `upstream.Options`, exactly one of a declared digest set
  and a handler-supplied verifier, the optional paired-document declaration and
  `FirstByteWithin` deadline, and a typed refusal in return), to which
  `supply-chain-policy.md` adds the advisory key where the handler reported one (its resolved
  advisory-key decision, was Q11 there). The request is the same whether a client's
  request or a `proxy.revalidate` replay drove the handler (`proxy-cache.md`'s resolved
  revalidation-replay decision, was Q18 there; Routing and registration, below), so a handler never
  branches on who asked. The scheduled re-open takes that statement as an input rather than
  restating it. Upstream authentication and provider quirks
  live in upstream adapters, a separate axis (see the resolved upstream adapter decision
  below), never in the handler

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
| `Capabilities()` | `Capabilities`, carrying proxy support (`supported` or `unsupported`), reference-implementation availability (`available` or `none`), virtual aggregation `Virtual` (`supported` or `unsupported`) and repository rename `Rename` (`supported` or `unsupported`) | The machine-readable home of the declarations the harness and the shared layers honour: AC4's runner honours proxy `unsupported`, the conformance matrix renders `none` as a replay-match exemption and `Virtual: unsupported` as a virtual-column exemption (AC13), and `repository-lifecycle.md` refuses a virtual repository or a rename of a format that declares either `unsupported` (its AC4 and AC13), which is how `formats/hex.md`'s "no virtual aggregation, no rename" becomes a refusal rather than a repository every client rejects. Generic declares all four, closing the "neither sibling spec currently says how" gap recorded in `formats/generic.md`; the second field arrived with generic's resolved replay-exemption decision, the third and fourth with `repository-lifecycle.md` (2026-09-27). Fields on this type are declarations, not amendments to the method set |
| `Scope(r)` | `(Scope, error)`, a `Scope` being a repository (empty only for a descriptor that names no repository, below), one of `pull`/`push`/`delete`, and the **addressed object**: exactly one of *named* (the handler's canonical name for the finest named thing the route addresses), *content-addressed* (content identified by digest, or an upload bound to one), *descriptor* (a repository-wide document whose body carries no name, version or digest of any object the repository holds: protocol configuration, a discovery probe, a signing-key document; `pull`-only under a patterned scope, per `auth.md`'s resolved name-free-document decision, was Q23), or *none* (the repository as a whole, including every name-enumerating route). **An error denies the request**, with the same response an unauthorized caller receives | The route-to-scope mapping the central authorizer evaluates (`auth.md`). Needed from the **first** format, not at the re-open: AC7's unauthenticated, unauthorized and pattern-refusal cases apply from day one, and without this the shared layer cannot know what it is authorizing. The addressed object is the second out-of-cycle amendment (below): generic reports artifact paths, OCI reports `{image}/{tag}` (the repository being the first component of the OCI name, `formats/oci.md`'s resolved name-split decision, was Q8 there), and both have content-addressed and listing routes, so both Tier 0 formats exercise named, content-addressed and none. The descriptor kind is exercised by Cargo's `config.json`, Conan's capability probe and RPM's `repomd.xml` (`auth.md`, "Pattern scopes"), and by OCI from Tier 0: `formats/oci.md` ("Addressed objects and pattern scopes") declares the distribution spec's `GET /v2/` version probe a **descriptor with no repository**, since under the name split the repository is part of a `<name>` the probe does not carry. `auth.md` authorizes such a descriptor for any verified credential whatever its scopes, and denies as unauthorized a named, content-addressed or none object reported without a repository ("A descriptor that names no repository", its AC32), so the empty repository is admitted for the descriptor kind alone |
| `ServeHTTP(w, r)` | embedded `http.Handler` | The resolved HTTP-direct decision: the handler receives the real request and response |

Construction is by injection: each format package exposes `New(deps Deps) Handler`, and
`Deps` carries the consumer-side interfaces to every shared layer the handler may touch -
the blob store (CAS), the metadata store (the three-level opaque documents and
snapshot-pointer resolution `data-model.md` defines), the proxy layer's fetch-and-cache
entry point (`proxy-cache.md`), which carries the handler's upstream location and an
`upstream.Options` value down to the adapter layer the handler never sees
(`proxy-cache.md`, "The adapter seam"; `upstream-adapters.md`, "The interface"), the central authorizer (`auth.md`), the
verifier (`Verifier`, two methods, `Check` for integrity entries and `Verify` for signature
and attestation schemes, declared in `internal/format` beside `Deps` and satisfied by
`internal/verify`; `artifact-verification.md`, "How a handler reaches the verifier"), the
advisory reader (below, with the refusal type it sits beside), the
host-binding lookup (which repository, if any, `server.hosts` binds the request's hostname
to; Routing and registration, below), and the request logger, which is the standard
library's `*slog.Logger` with a handler that reads request correlation (`request_id`,
`trace_id`, principal, repository, format) from the context, so a handler never sets those
attributes by hand (`observability.md`, "Structured logging", its AC15), and the
**`Documents`** serving door (below). Those dependency
interfaces' signatures belong to the specs that own the layers; this spec pins only that
they arrive through `Deps` and that a handler holds no capability it was not handed.

The corollary is an **import boundary**, held mechanically because `Deps` is the only door:
no package under `internal/format/**` imports `internal/policy` (AC14), `internal/verify`
(`artifact-verification.md` AC4), `internal/upstream` (`upstream-adapters.md` AC29),
`internal/repository` (`repository-lifecycle.md` AC8, which also forbids the reverse edge),
`internal/telemetry`, the OpenTelemetry API or `client_golang` (`observability.md` AC2),
`internal/manage` (`management-api.md` AC2), `internal/async` (`async-operations.md`
AC16) or `internal/signing` (`signing-service.md` AC2, which is why `Documents` carries
`SignedBy`); `internal/index` is reached only through `Documents` and may be named for its value
types alone, as the `Indexer` method must (`signing-service.md`, "Two halves, one write", and
its AC2). Each owning spec holds its edge in its own test; `internal/format/arch_test.go` holds
the whole list from this side, with a violation fixture per edge, so a new shared package
that forgets its boundary test still fails here (AC15).

**Three of those entries are policy-enforcing**, per `supply-chain-policy.md`'s resolved
evaluation-hook decision (was Q4 there): the metadata store's version resolution, the blob
store's read by digest and the fetch-and-cache entry evaluate the repository's policy before
returning content, and return a **typed policy refusal** instead of content when policy
refuses. The refusal type is declared in `internal/format`, beside `Deps` and the consumer
interfaces it carries, so a handler recognises it with `errors.As` and renders it in its
protocol's own error shape without importing `internal/policy`, which that spec's AC4 forbids.
No method changes: the refusal travels as an error value through calls the pin already has
(AC14).

**Two more policy-layer pieces sit in `internal/format` beside that refusal type**, added by
`supply-chain-policy.md`'s reconciliation of 2026-09-28, and neither changes the method set.
The **advisory reader** is a fourth policy-layer consumer interface carried by `Deps`: given
the repository the handler is serving and a coordinate or coordinate range, it returns the
advisory records matching it and the condemnations standing against it, each with its sources,
and nothing else. It keys the question as the evaluator does, which is why it takes the
repository rather than an ecosystem string: the ecosystem is the format's coverage row or the
repository's `advisory_ecosystem`, a stored advisory key replaces the name where the handler
reported one, and a name the repository exempts through `coordinate_exemptions` answers empty
(`supply-chain-policy.md`'s resolved hosted-matching decision, was Q12 there, and its AC19; the
signature is that spec's, per the rule above). It is
**not policy-enforcing**: it refuses nothing, evaluates no rule and returns no content, so it
cannot be used around the three enforcing calls; it exists because four formats render
advisory data inside a served document (NuGet's `VulnerabilityInfo`, Hex's advisory links,
Composer's advisories route, Open VSX's `malicious` list) and would otherwise import
`internal/policy` or invent a source (its "A handler may read advisories, never evaluate
them", AC19). The **refusal writer**, `WriteRefusal(w, r, refusal, body)`, is how a handler
renders the typed refusal once it has chosen its protocol's status code and body: on an
HTTP/1.1 connection the writer hijacks and writes the status line itself, `HTTP/1.1 {code}
Refused by policy: {condition}`, because the reason phrase is the only text most package
clients show their user and Go's `net/http` offers no API for a custom one; on HTTP/2 or a
`ResponseWriter` that is not a `Hijacker` it falls back to the canonical write with the
condition in the body (its resolved refusal-status-line decision, was Q10, AC18). That writer
is the **only hand-written status line in the module**, and `internal/format/arch_test.go`
asserts it, so a handler cannot grow a second one (AC14).

**Three more `Deps`-level additions arrived with the 2026-09-28 closing sweeps**, each settled in
the spec that owns its layer, each riding a door the pin already has, and none changing the
method set (AC17):

- **`Documents`, the serving door**, declared in `internal/format` beside `Deps` and carried by
  it (`signing-service.md`'s resolved handler-rendered decision, was Q14 there, "Serving: one door for
  every validator"). Its four entries are `ServeDocument` for a stored document (a hosted or
  virtual repository's generated document, or a remote's cached metadata document),
  `ServeRendered` for a document the handler renders per request (the bytes, or a lazy renderer
  with a validator identity so a `304` costs no render, plus the freshness source, never a
  date), `ServeFile` for a stored file from its `File` record, and `SignedBy` for the public
  forms of the keys a served body's current signature records carry. They exist because that
  spec's freshness boundary forbids every handler package, module-wide, to set `Last-Modified`
  or `ETag` or to read a conditional header (its AC11), so everything a handler serves with a
  validator goes through this door, and because `SignedBy` is how Terraform's per-request
  document lists `signing_keys` without the handler importing `internal/signing` (its AC37).
- **The claim declaration on the write transaction** (`management-api.md`'s resolved
  claimed-coordinate decision, was Q14 there). A handler's own wire write that is not a binding onto a
  management operation (Conan's revision `PUT`, Open VSX's and npm's publish) declares the
  coordinates it claims, at its retirement granularity, on the write transaction it opens
  through `Deps`, from the URL before the body where the route carries them or from the
  ingested bytes otherwise. The transaction checks each claim when declared and again at
  commit, serialised with any retiring write on the repository's default `Pointer` row
  (`storage-and-gc.md` AC30, its resolved head-lock decision, was Q12 there), so a retired coordinate
  is refused centrally on every path. A binding needs no declaration: its claims come from
  `Operator.Authorize` (below).
- **The advisory key** (`supply-chain-policy.md`'s resolved advisory-key decision, was Q11 there).
  Where the advisory feed names something other than the package name and version (Alpine's
  origin, Debian's source package and source version, Julia's UUID, Swift's bound repository
  URLs), the handler reports it as an advisory key, one or more names and at most one version,
  in the same metadata-store write that records the package or version, on the hosted and the
  proxied path alike, and on a proxied miss also on the fetch-and-cache request, taken from the
  upstream document the handler already read, so the refusal before any upstream fetch keys on
  it too. The core stores it core-parsed on `Package` or `Version`, never inside a metadata
  document (the field belongs to `data-model.md`'s `Package` and `Version` rows, reported to it
  by that spec's closing sweep, and the matching is `supply-chain-policy.md` AC24's); a handler
  reporting no key is matched on the package name and version string. This is also how the core
  learns a version's origin or source package when it differs from `Package.name`, the question
  the format batch 4 reconciliation raised against this spec and `supply-chain-policy.md`
  together, now answered by that spec's was-Q11.

Deliberately absent, not forgotten: lifecycle methods (`Init`, `Close`, health checks); a
resolve/list/upload operation vocabulary, because those are protocol operations a handler
serves over HTTP, which the HTTP-direct decision makes redundant as interface methods; and
any per-request classification hook, because classification travels as an argument to the
fetch-and-cache call per the proxied-miss decision; and any management, index-generation or
UI-declaration method, because each is a capability only some handlers have, and each reaches
its handler through an optional interface discovered at registration ("Optional interfaces
discovered at registration", below) rather than through the pin. Additions ride the scheduled
re-open, argued from two real implementations and the write-triggered services prototype
rather than from anticipation.
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

**The descriptor kind rides this second amendment**; it does not open a third. On 2026-09-27
`auth.md` resolved its name-free-document question (was Q23, adopted under the owner's standing
delegation): a patterned-only `pull` could not run cargo or conan at all, because the
repository-wide document every client reads first (`config.json`, the capability probe) was
*none* and a patterned scope refuses *none*. The kind set therefore grows from three to four
with **descriptor**, a repository-wide document whose body names no object the repository
holds, authorized for `pull` only under a patterned scope and never for `push` or `delete`.
`auth.md` treats the value as riding the 2026-09-26 amendment and so does this spec: it widens
the same type for the same reason, pattern evaluation, adds no method, and the re-open
re-examines it with the rest of the amendment rather than as a separate item. Its failure mode
is the one a table cannot catch by inspection, an enumerating document labelled a descriptor,
so `auth.md` gives the kind its own mechanical enforcer, the **sentinel test**, and AC12 runs it
for every route a handler reports as a descriptor: seed the repository with an object whose
name, version and digest are sentinels occurring nowhere else, fetch the route, and fail on any
sentinel in the body.

**The repository-less descriptor rides the same amendment**, added by `auth.md`'s closing sweep
of 2026-09-28 (its "A descriptor that names no repository" and AC32) for `formats/oci.md`'s
`GET /v2/`: a `Scope` whose addressed object is a descriptor may carry an empty repository, and
is then authorized by authentication alone, while any other kind reported without a repository
is denied as unauthorized. It widens what the type admits and adds no method; AC12 holds the
handler's side (only a descriptor route may report no repository), and the re-open re-examines it
with the rest of the amendment.

### Optional interfaces discovered at registration

Three shared layers need something from a handler that the pin does not carry and that only
some handlers have. Each declares a **consumer-side optional interface** where it is used, in
the Go skill's sense and in the idiom `io.WriterTo` and `http.Flusher` use, and the
registration layer type-asserts it once, at registration, recording which a handler declares.
A handler that lacks the capability implements nothing. The method set stays at five; the
resolved optional-interfaces decision below (was Q10) accepts three separate interfaces rather
than one, and hands the fold-in verdict to the re-open.

| Interface | Declared in | Methods | Who calls it, and for what |
|---|---|---|---|
| `Operator` | `internal/manage`, with the value types `Operation`, `Addressed`, `Outcome`, `Kind` and `Binding` in `internal/format` beside the pinned `Scope` | `Operations() []format.Kind`, `Bindings() []format.Binding` (each a route pattern, the kind it binds onto and, where the route's `Scope(r)` reports an object `Authorize` does not, a flag naming it a **route-level object**), `Authorize(ctx, op) (format.Addressed, error)` (the (object, action) pairs the operation addresses plus the coordinates it **claims** at the handler's retirement granularity), `Apply(ctx, tx, op) (format.Outcome, error)` | `management-api.md`'s `Submit`, for every registry-owned management operation and every client-wire binding onto one: `Apply` runs inside the write transaction the core opened (its resolved dispatch decision, was Q2). `Authorize` returns `format.Addressed` rather than a slice of scopes, and `Submit` declares its claims on the transaction, per that spec's resolved claimed-coordinate decision (was Q14); a binding's route is never wider than its operation, its object being one of `Authorize`'s, none, or the declared route-level object (dput's `.changes`), with `Submit` evaluating every pair on both paths, per its resolved binding-scope decision (was Q13, AC8 there). `repository-lifecycle.md` delivers a rename as a `configure` operation whose `args` carry `{"rename": {"from", "to"}}`; a handler with no `Operator` receives nothing and its rename conformance case proves its documents were never name-bound. `async-operations.md`'s runner reaches a handler **only** through `Operator.Apply` via `internal/manage`, never directly: the prototype's question 4 is answered with no pinned method |
| `Indexer` | `internal/format`, beside `Deps` | `Generator() index.Generator` | `signing-service.md`'s index runtime, before every commit on a repository whose handler declares it: the handler returns a pure generator from its sibling package `internal/format/<name>/index` (records in, bytes out; it imports `internal/index`'s value types and nothing else of the registry). The prototype's question 1 is answered the same way: no pinned method |
| `surface.Declarer` | `internal/surface` | `Surface() surface.Declaration` | `web-ui.md`'s renderer and the conformance runner's recipe step, for the per-format client recipes and display hints embedded as `surface.yaml` in the handler package (its resolved declaration-home decision, was Q1); a handler without it renders generically and fails that spec's AC17, since every format must declare at least one recipe |

Two rules hold across the three. First, **the pin is held by a test, not by memory**: a
reflection test asserts `format.Handler` has exactly five methods, so a sixth cannot arrive
unnoticed, and registration records the optional set each handler declares so the report is
data rather than recollection (AC16). Second, **deferred work never starts in a handler**: no
package outside `internal/async` and the HTTP server's accept loop starts a goroutine that
outlives a request or owns a `time.Ticker` or `time.AfterFunc`, which `async-operations.md`
AC16 generalises from the prototype's AC12 to every package and holds with an AST scan; a
handler's only route to deferred work is declaring an `Operator` kind deferred.

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
for a path prefix. It has two sub-classes, and the `Mount` says which:

- **Path-only claims** are served on every hostname and carry the repository inside the path.
  OCI is the one instance: `docker pull host/name:tag` puts the repository inside the OCI name
  path, as the first component of the OCI name (`formats/oci.md`'s resolved name-split decision,
  was Q8 there), so the handler claims the root-anchored `/v2/` the distribution spec requires.
  The one route under it that carries no name, `GET /v2/`, is a descriptor with no repository
  ("The pinned method set").
- **Host-bound claims** carry no repository at all, so the hostname must supply it. The
  registry binds a hostname to exactly one repository through `server.hosts`
  (`deployment.md`, its resolved host-binding decision, was Q8: a list of `{hostname,
  repository}` in configuration, because a hostname is a deployment fact, DNS and a certificate
  SAN, before it is a registry fact; reloaded on `SIGHUP`; a binding to a missing repository is
  a startup warning and a `404` on that host). The claiming handler serves its root-anchored
  path only on a hostname bound to a repository of its format and answers `404` elsewhere, in
  its own protocol's error shape. Terraform/OpenTofu (Tier 3) discovers services through
  `/.well-known/terraform.json` at the host root - the Stackweaver monorepo's working registry
  implementation registers exactly that root route (`HandleServiceDiscovery` in
  `backend/internal/api/routes/routes.go`) - and only the discovery document needs anchoring,
  since its service entries point back into format-first space (`formats/terraform.md`). Puppet
  (Tier 3) claims the whole of `/v3/` on a bound hostname, publish included, because PDK posts
  `/v3/releases` to the host root and drops any path it was given (`formats/puppet.md`'s
  resolved PDK-publish decision, was Q1, grounded in captured traffic).

The binding reaches the handler through `Deps` as a lookup from the request's hostname to the
bound repository, refreshed by the registration layer on `SIGHUP` so the handler holds a live
view rather than a startup snapshot; whether that is the binding's right home is a named input
to the scheduled re-open. Root anchoring is therefore a declared `Mount` the registration layer
validates against its carve-out list, not an OCI if-statement in the router, and a host-bound
claim is a declared `Mount` with a flag, not a per-format routing rule.

**Shared-layer routes need mounts no handler can collide with.** Not every route belongs to a
handler. Each shared surface mounts under a **reserved** first path segment that the
registration layer holds in a second explicit list beside the carve-out list, so the two kinds
of mount can never overlap: registration refuses a handler whose `Name()` equals a reserved
segment, a root-anchored claim that falls under one, and any claim at exactly `/`, before the
server serves any request (AC11). The list, exhaustive as of 2026-09-28, with the spec that
owns each string:

| Reserved segment | Owner | What mounts there |
|---|---|---|
| `api` | `management-api.md` (its AC1) | The registry-owned management API, versioned as `/api/v1`, including the token, robot and key routes `credential-management.md` contributes |
| `ui` | `web-ui.md` (its AC2) | The web UI's static assets and SPA routes, and the browser sign-in routes `internal/auth` mounts under `/ui/auth/` |
| `healthz`, `readyz`, `metrics` | `observability.md` (its AC22) | The probes on the main listener; `metrics` is reserved even though it is served on the telemetry listener by default, so enabling it on the main listener never collides |
| `replication` | `replication.md` (its AC18) | The replication read surface, mapped by the replication package under the central authorizer; the string matches the `format` label `observability.md` gives those routes and the `replication.*` audit prefix |
| `t` | `auth.md` ("Presentation forms", AC31) | Nothing mounts here: `/t/{token}/` between the host and any mount is the root path token conda, mamba, micromamba and pixi send, which the shared authorizer extracts, marks secret, verifies and strips before routing, so routing sees the request as if the segment were absent and every mount beneath it, format-first or root-anchored, is served unchanged. Reserved so no handler can be named `t` or claim a root anchor under it, which would race the authorizer for the credential |
| exactly `/` | `web-ui.md` (its AC1) | Served by `internal/ui` as a `302` to `/ui/`; the mount rule already admits no handler mount at `/` (non-root mounts are `/{Name()}/`, root-anchored claims are listed carve-outs), and it is recorded here so the next reader does not take the gap for an accident |

Which strings are reserved belongs to the specs that own those surfaces; that they are
reserved, held mechanically, and listed here in one place so the two lists can be checked
against each other, is this spec's. A new shared surface adds its row here and its fixture to
AC11 in the same pass.

The opinionated-client check on the settled scheme, at published-spec level and to be
re-grounded in captured traffic when each format's spec is written: the Go module proxy
takes an arbitrary base URL through `GOPROXY`, including a path; Debian apt takes an
arbitrary base URL per sources.list entry; Cargo's sparse index takes an arbitrary base URL
(`sparse+https://...`), and its `config.json` carries absolute `dl` and `api` URLs that can
point anywhere format-first. None of the three needs root anchoring.

**A second dispatch, below the authorizer, for one caller.** Every request reaches a handler
through the router, which runs the shared authorizer over the handler's `Scope(r)` before the
handler sees it. `proxy-cache.md`'s resolved revalidation-replay decision (was Q18 there, its
AC26) adds exactly one other way in: the `proxy.revalidate` job keeps a remote reached only
through a virtual fresh by replaying the remote handler's own proxied route in process, with the
cached document's validators, a discarding writer, a replay marker and no principal. That job
runs in `internal/proxy`, which therefore has to reach the handler table the router holds. Per
the resolved replay-entry decision below (was Q11), the registration layer exposes that reach as
**one function value, the replay entry**, built once in the server's composition root from the
same handler table and mount rules the router uses and injected into `internal/proxy` at
construction, never imported. It resolves the handler from the remote's format and the route
recorded with the cached entry (or, for a remote never adopted, a member-input path the format's
generator profile declares: `signing-service.md` AC35), attaches the marker, sets no principal and
does not call `Scope(r)`, because there is no caller to authorize; nothing it returns reaches
anyone. It refuses before dispatch any method other than `GET` and any repository that is not a
`remote` (a `local` or `virtual` target is refused, since a replay exists only to revalidate an
upstream's content), so a caller that reached it wrongly still cannot write or read hosted
content below the authorizer. The marker is a context value only the entry sets: no header,
query parameter or path segment of a wire request is ever read as the marker, so a client cannot
forge one through the router. The job that calls the entry receives no principal from the queue
either (`async-operations.md` AC30).
`internal/proxy` holds the call to one site (`proxy-cache.md`'s `internal/proxy/arch_test.go`),
and this spec holds the other end: only the composition root constructs the entry, only
`internal/proxy` receives it, and the router's own entry always passes the authorizer (AC18).
No pinned method changes and no handler-facing type changes: the handler sees an ordinary
request and must not branch on the marker, which is what "nothing about who asked" in
`proxy-cache.md`'s Obligation section requires. The entry is a named input to the scheduled
re-open, and its bypass is on `auth.md` AC10's external review surface: `auth.md` names it the one
entry that skips its authorizer, adopts this spec's enforcers as its own, asserts that no
`internal/auth` package reads the marker, and lists the entry in its AC10 procedure (its "The one
entry that skips the authorizer", AC36).

### Hosted and proxied are one handler, two paths

A single handler serves both, because the protocol is identical from the client's perspective;
only the source of truth differs. Per the resolved proxied-miss decision below, the handler
owns the request in both modes: on a proxied miss it calls the fetch-and-cache API rather than
being wrapped by the proxy layer. Nothing in the type system forces a handler through that
API, which is exactly the bypass AC6's egress lint rule exists to close. The same proxied route
also serves the proxy layer's revalidation replay (Routing and registration, "A second
dispatch"), so for a format with a virtual merge the proxied path has two drivers, a client
and the replay, and one implementation.

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
- **Inputs.** The re-open reads every input below, and each names the spec and the question or
  section it comes from, so the list can be checked against its sources rather than trusted:
- **The two Tier 0 implementations and the prototype:** the generic and OCI handlers, and the
  write-triggered services prototype (this spec's resolved write-triggered services decision
  below, was Q4, extended by the prototype's own resolved async-coverage decision, was Q1 there)
  with **both** its halves, the Debian-shaped signed-index half and the Galaxy-shaped
  asynchronous half, answering the six questions its finding records
  (`write-triggered-services-prototype.md`, "What the prototype produces").
- **A server-side ingest hook**, driving a handler's hosted ingest from blobs already in the
  store rather than from an HTTP request, which `replication.md`'s freeze needs and which blocks
  its freeze phase (its resolved freeze-derivation decision, was Q10 there: freeze publishes
  through the target repository's hosted ingest path). Argued here rather than there because it
  asks whether the pin must grow.
- **Management dispatch**, how a registry-owned management operation reaches the handler whose
  document it changes given only the five pinned methods, which `management-api.md` has
  answered with the optional `Operator` interface (its resolved dispatch decision, was Q2, and
  its AC27, which requires this spec to name that answer here before any Tier 1 handler
  starts).
- **Several objects per `Scope(r)`.** `management-api.md`'s resolved binding-scope decision (was
  Q13 there) found that dput's `.changes` `PUT` publishes every binary and the source it names
  while `Scope(r)` reports exactly one object, and resolved it without the pin: a binding's
  route object is one of `Authorize`'s, none, or a declared route-level object, and `Submit`
  evaluates every pair `Authorize` reports. Its option C, a `Scope(r)` able to report several
  objects, was declined as an amendment outside the re-open and handed here; the re-open says
  whether the route-level flag on `format.Binding` is enough or `Scope` should carry a set.
- **The request-to-coordinate evidence**, per this spec's resolved re-open evidence decision
  below (was Q9), because none of the inputs above would surface it: `auth.md`'s
  pattern-evaluation outcome (its resolved record, was Q13 there), as the addressed-object
  amendment actually behaved in the generic and OCI handlers, now including the descriptor kind
  and its sentinel test (was Q23 there) and the repository-less descriptor (its AC32);
  `supply-chain-policy.md`'s outcome on where central policy evaluation intercepts a request
  (its resolved evaluation-hook decision, was Q4 there); and, recorded beside them as further
  evidence that the pin and the shared model were fixed before the formats that stress them
  existed, `ansible-collections.md`'s finding that an asynchronous import task had no entity in
  the shared model (its resolved import-task decisions, was Q1 and Q6 there, since met by
  `data-model.md`'s `Operation` entity).
- **The optional interfaces, as one input:** `Operator` (`management-api.md`, was Q2; evidence
  is generic's `delete-file` and the prototype's Debian-shaped `publish` and `configure`, both
  built on it before any Tier 1 handler, and the two signature changes its was-Q13 and was-Q14
  made: `Authorize` returning `format.Addressed` and the route-level-object flag on
  `format.Binding`), `Indexer` (`signing-service.md`'s resolved renderer-placement decision, was
  Q3 there, its answer to the prototype's question 1: an optional interface, not a sixth method,
  revised before its Phase 1 if the prototype finds the callback needs request context a
  generator cannot be given) and `surface.Declarer` (`web-ui.md`'s resolved declaration-home
  decision, was Q1 there), together with `async-operations.md`'s finding that the runner reaches
  a handler only through the `Apply` method of `Operator`, via `internal/manage` (its Scope,
  "Handler-visible scheduling hooks"; the prototype's question 4). The re-open states, per
  interface, one of three verdicts: fold into the pin, keep optional, or consolidate with
  another; this spec's resolved optional-interfaces decision below (was Q10) says why the third
  is not taken now.
- **The host binding:** `server.hosts` `{hostname, repository}` from configuration, passed at
  construction through `Deps` and reloadable on `SIGHUP` (`deployment.md`'s resolved
  host-binding decision, was Q8 there, and its AC12), as the Terraform and Puppet host-bound
  claims exercised it; the re-open states whether `Deps` is the binding's right home or the
  construction contract should carry it explicitly.
- **The fetch-and-cache request shape**, as `proxy-cache.md` fixed it in "Obligation to the
  handler interface": the coordinate and **classification**, which now carries evictability as
  well as freshness (an immutable artifact is a cached file LRU eviction reaches, mutable
  metadata a current document it never reaches: its resolved metadata-eviction decision, was
  Q21 there, AC29); for mutable metadata the handler's **adoption check** (a function over a
  new upstream revision's complete body returning its ordering value, the event classes
  observed, the records `FromUpstream` consumes and the **digests of the blobs it keeps** for the
  revision, which the layer writes onto the declared blob-digest list; its AC25 and AC27,
  feeding the adoption hook `signing-service.md`'s resolved remote-member decision, was Q16
  there, registers); for a revisioned document set, the **retention count** of superseded
  revisions (one by default and **zero valid**: its resolved retained-revision decision, was
  Q19 there; the formats so far declare one per module for `puppet.md`, one per box for
  `vagrant.md` and zero for `homebrew.md`'s API documents and manifests) and the **declaring
  level**, repository or package, of the document whose declared list holds the set's blobs
  (its resolved declaring-document decision, was Q22 there); the upstream location, an ordered
  list of candidate locations under the adapter's allowlist, or a **git location**
  `{url, commit}` the `Router` sends to the `git` adapter on an `https` row
  (`upstream-adapters.md`'s resolved git-location decision, was Q9 there, AC34), the
  `upstream.Options`, exactly one of a declared digest set and a
  handler-supplied verifier (its completion-only mode, was Q15 there, AC20), an optional
  paired-document declaration (its AC22) and an optional `FirstByteWithin` deadline (was Q16
  there, AC21), the **advisory key** where the handler reported one (`supply-chain-policy.md`'s
  resolved advisory-key decision, was Q11 there, AC24), and a typed refusal in return. It is one
  entry's request, not a method, and it enters here as generic's and OCI's proxied paths used
  it, so the re-open judges whether the request has become a second interface in all but name.
- **The revalidation replay's second dispatch.** `proxy-cache.md`'s resolved revalidation-replay
  decision (was Q18 there, AC26) replays a handler's proxied route below the shared authorizer,
  so `internal/proxy` reaches the router's handler table, through the replay entry this spec's
  resolved replay-entry decision below (was Q11) fixes. It changes no method, and its option B,
  a fourth optional `Revalidator` interface, was declined there partly because it would press
  against this spec's three-interfaces verdict; the re-open says whether a second,
  unauthorized way into handlers is still the right shape once two merging formats exist, and
  whether the replay entry is its right home.
- **The `Deps` door as it has grown.** The pin fixed that shared layers arrive through `Deps`
  and left each interface's signature to its owner; since then `Deps` has gained, each settled
  in its owning spec and none changing a method: the `Verifier` (`artifact-verification.md`,
  "How a handler reaches the verifier"), `upstream.Options` on fetch-and-cache
  (`proxy-cache.md`, "The adapter seam"; `upstream-adapters.md`, "The interface"), the request logger (`observability.md`,
  "Structured logging"), the typed policy refusal (`supply-chain-policy.md`, was Q4 there), the
  advisory reader, keyed by repository (its "A handler may read advisories, never evaluate
  them" and its resolved hosted-matching decision, was Q12 there), `WriteRefusal` (its resolved
  refusal-status-line decision, was Q10 there), `Documents` with `ServeDocument`,
  `ServeRendered`, `ServeFile` and `SignedBy` (`signing-service.md`'s resolved handler-rendered
  decision, was Q14 there), the **claim declaration** on the write transaction a handler's own
  wire write opens (`management-api.md`'s resolved claimed-coordinate decision, was Q14 there,
  with `storage-and-gc.md` AC30 and its resolved head-lock decision, was Q12 there), and the
  **advisory key** on the metadata-store write that records a package or version
  (`supply-chain-policy.md`, was Q11 there). The re-open judges whether that door is still one
  construction contract or has become several interfaces that should be named as such, and in
  particular whether the claim declaration and the advisory key, both values a handler reports
  on a write, belong on one structured write coordinate.
- **Route-scoped and URL-borne credential declarations.** `auth.md` settled that a
  presentation form accepted only on some routes of one format is declared by the handler
  beside its route-to-scope mapping, naming the routes and where the credential sits (a header
  name, a query parameter name, or the path position of a segment), so that the shared layer
  alone extracts, marks, verifies and redacts it and an off-route presentation is an
  authentication failure (its resolved off-route decision, was Q24 there, and its Terraform
  capability, AC33). A second declaration of the same kind joined it: an **exchange-echo
  route**, which the handler declares beside its mapping and the shared layer answers without
  running the handler, writing the verified token back as a `text/plain` body with
  `Cache-Control: no-store` (Conan's `users/authenticate`; `auth.md`'s resolved exchange-echo
  decision, was Q25 there, AC35). The pin carries neither today: `Scope(r)` reports a
  repository, an action and an addressed object, not where a credential was found nor that the
  shared layer answers the route, and the root path token needs no declaration because it
  precedes every mount. The re-open decides both declarations' home, whether a field on
  `Mount`, a companion to `Scope(r)`, or a registration-time table, with the header, query and
  segment forms of NuGet, Open VSX, LuaRocks and Terraform and Conan's echo as the evidence.
  Two smaller requests of the same shape, what a request carries that the pin does not, ride the
  same input: Chef's end-of-part content-hash check on a multipart upload whose object is taken
  from the part's filename (`formats/chef.md`, "Authentication"; the Galaxy precedent), and the
  externally visible base URL for documents that carry absolute URLs (`formats/npm.md` and
  `formats/cargo.md` read `server.public_url` through `Deps`; for generated documents,
  `formats/chef.md`'s and `formats/vagrant.md`'s, `signing-service.md`'s resolved serve-time
  decision, was Q13 there, now supplies it as an input of the serve-time stage). A third rider,
  Swift's request coordinate able to carry the aliases its identifiers lookup binds
  (`formats/swift.md`), is **superseded**: `supply-chain-policy.md`'s was-Q11 stores Swift's
  bound URLs as a package-level advisory key reported at write time and rewritten by a `rebind`
  in the same write, so no request coordinate carries them.
- **Out-of-cycle amendments are re-examined, not inherited:** the re-open re-affirms or revises
  each amendment made between the pin and the re-open - `Scope(r)` (2026-09-23) and its
  addressed object (2026-09-26, widened with the descriptor kind 2026-09-27 and the
  repository-less descriptor 2026-09-28), each made early because a sibling security decision
  was unimplementable without it - on the same evidence standard as the rest of the method set,
  and states whether the addressed object and the policy coordinate should converge.
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
      registration layer's explicit carve-out list, or a `Name()` or root-anchored mount
      colliding with a reserved shared-layer segment (`api`, `ui`, `healthz`, `readyz`,
      `metrics`, `replication`, `t`), or any claim at exactly `/`, fails registration
      before the server serves any request - proven by fixture handlers declaring each
      violation, one per reserved string; and a request carrying the root path token
      `/t/{token}/` reaches the routed handler with the segment already stripped, on a
      format-first and on a root-anchored mount alike. A host-bound root-anchored claim is served only on a
      hostname `server.hosts` binds to a repository of the claiming format and answers `404`
      elsewhere. (That a carve-out is also recorded in the claiming format's spec stays a review
      rule; the list is its mechanical shadow.)
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
      routes across all four kinds: a named-object route carries its canonical name, a
      digest-addressed or upload route is content-addressed, a name-free repository-wide
      document is a descriptor, and a name-enumerating or repository-wide route that can name
      objects is none - proven per handler by a table test over its whole route set, in which a
      route absent from the table fails the test, and for every route the table reports as a
      descriptor the sentinel test runs: the repository is seeded with an object whose name,
      version and digest are sentinels occurring nowhere else, the route is fetched, and any
      sentinel in the response body fails the handler's table. A route may report an empty
      repository only as a descriptor (OCI's `GET /v2/`), and the table fails any named,
      content-addressed or none route that reports none.
- [ ] AC13: `Capabilities()` carries reference-implementation availability, `Virtual` and
      `Rename` beside proxy support; the generic handler declares `none` and every other
      registered handler `available`; both Tier 0 handlers declare `Virtual: supported` and
      `Rename: supported` (`repository-lifecycle.md` runs its virtual and rename cases against
      them); a format declaring `none` is rendered by the conformance matrix as exempt from
      replay-match citing its spec, never as passing, and a format declaring `Virtual:
      unsupported` is rendered exempt in the virtual column the same way - the contract
      `conformance-harness.md` AC20 and `repository-lifecycle.md` AC4 state from the matrix
      side.
- [ ] AC14: The typed policy refusal, the advisory reader and the refusal writer `WriteRefusal`
      are declared in `internal/format`; a fixture handler that imports nothing from
      `internal/policy` recognises the refusal with `errors.As` when the metadata-resolution,
      blob-read or fetch-and-cache call in its `Deps` returns it, renders it through
      `WriteRefusal` with its own status code and body, and reads advisory records and standing
      condemnations through the reader, for the repository it serves and a coordinate, while
      obtaining no content bytes from it; an architecture
      test asserts that `WriteRefusal` is the only site in the module that writes a status line by
      hand; and the pinned method set is unchanged at five.
- [ ] AC15: No package under `internal/format/**` imports `internal/policy`, `internal/verify`,
      `internal/upstream`, `internal/repository`, `internal/telemetry`, the OpenTelemetry API,
      `client_golang`, `internal/manage`, `internal/async` or `internal/signing`, and
      `internal/repository` imports no handler package; the whole list is held by one architecture test in `internal/format`
      with a violation fixture per edge, independently of the owning specs' own tests.
- [ ] AC16: `format.Handler` has exactly five methods, asserted by reflection so a sixth cannot
      arrive unnoticed; registration type-asserts `Operator`, `Indexer` and `surface.Declarer`
      once and records the set each handler declares; a fixture handler implementing none of
      the three registers with an empty set and serves requests, and a fixture implementing all
      three registers with all three recorded, its `Operator.Authorize` returning a
      `format.Addressed` whose pairs and claims registration reads unchanged, and each
      `format.Binding` it declares recorded with its route-level-object flag.
- [ ] AC17: `Documents` (`ServeDocument`, `ServeRendered`, `ServeFile`, `SignedBy`) is declared in
      `internal/format` beside `Deps` and reaches a handler only through it; a fixture handler
      constructed only with `Deps`, importing neither `internal/signing` nor anything of
      `internal/index` beyond its value types, serves a stored document, a lazily rendered
      document and a stored file through it and answers a matching conditional request `304`
      without setting a validator header itself; the same fixture declares a claim on the write
      transaction it opens through `Deps` and receives the central `retired` refusal at the
      declaration when the coordinate is retired, and reports an advisory key on a metadata-store write and on a
      fetch-and-cache request, each through a call `Deps` already carries; and the pinned method
      set is unchanged at five.
- [ ] AC18: The replay entry is the only way into a handler that does not pass the shared
      authorizer: given a repository and a recorded route it dispatches to the same handler the
      router would, with the replay marker and no principal and without calling `Scope(r)`; it
      refuses before dispatch a method other than `GET` and a `local` or `virtual` repository,
      the fixture handler recording no invocation for either; it is constructed only in the
      server's composition root and handed only to `internal/proxy`, which an architecture test
      asserts; a wire request carrying a header, query parameter or path segment named like the
      marker reaches the handler through the router without the marker set; and every request
      through the router's own entry passes the authorizer, proven by a fixture handler whose
      route is denied through the router and served through the replay entry (`auth.md` AC36
      relies on each of these cases).
- [ ] AC9: At the scheduled re-open, a depguard import allowlist for `internal/format/**` is in
      place, seeded from the generic and OCI handlers' actual import lists, and a fixture
      importing a third-party HTTP client fails `make verify`. Until then the residual bypass
      is accepted and named in the re-open's inputs.
- [ ] AC8: Before any Tier 1 handler work begins, the scheduled re-open has run: this spec's
      Review Log carries the post-OCI re-open entry, and "The pinned method set" reflects its
      outcome, re-affirmed or revised, with the generic and OCI implementations, the
      write-triggered services prototype's finding on all six of its questions (both the
      signed-index and the asynchronous halves) and the request-to-coordinate evidence named in
      "The scheduled re-open" cited as its evidence, and with an explicit verdict on each
      out-of-cycle amendment (the descriptor kind and the repository-less descriptor included),
      on whether the addressed object and the policy coordinate converge, on the server-side
      ingest hook, on whether `Scope(r)` should report several objects, on each of the three
      optional interfaces (`Operator`, `Indexer`, `surface.Declarer`: fold in, keep optional, or
      consolidate), on the host binding's home, on whether the fetch-and-cache request shape
      (adoption check with its kept digests, the classification's evictability, the retention
      count and declaring level, the git location and the advisory key included) has become a
      second interface, on the
      revalidation replay's second dispatch and the replay entry's home, on whether the `Deps`
      door (`Documents`, the claim declaration and the advisory key included) is still one
      construction contract, and on the home of the route-scoped credential declaration and the
      exchange-echo declaration.

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
| AC11 | unit + integration | `internal/format/register_test.go` (fixture handlers: wrong non-root prefix, unlisted root anchor, a `Name()` and a root anchor for each reserved string `api`, `ui`, `healthz`, `readyz`, `metrics`, `replication` and `t`, a claim at exactly `/`; the `replication` pair shared with `replication.md` AC18); the host-bound serving rule in `internal/server/hosts_test.go`, shared with `deployment.md` AC12; the stripped root path token in `internal/auth/path_token_test.go`, shared with `auth.md` AC31 |
| AC13 | unit | `internal/format/capabilities_test.go` (every registered handler's four declarations: `none` for generic only; `Virtual` and `Rename` `supported` for both Tier 0 handlers); the matrix rendering itself is asserted in `conformance/core/matrix_test.go`, shared with `conformance-harness.md` AC20 and `repository-lifecycle.md` AC4 |
| AC14 | unit + architecture test | `internal/format/policy_refusal_test.go` (fixture handler, fixture `Deps` returning the refusal from each of the three calls; import assertion that the fixture package does not import `internal/policy`); `internal/format/refusal_writer_test.go` (raw HTTP/1.1 status line, HTTP/2 and non-`Hijacker` fallback; shared with `supply-chain-policy.md` AC18); `internal/format/arch_test.go` (single hand-written status line site); `internal/policy/advisory_reader_test.go` (the reader against the fixture handler, keyed by the repository it serves; shared with `supply-chain-policy.md` AC19) |
| AC15 | architecture test | `internal/format/arch_test.go` (import walk over every handler package against the forbidden list, one violation fixture per edge, plus the reverse edge from `internal/repository`); the owning specs' own tests (`internal/format/verify_boundary_test.go` for `artifact-verification.md` AC4, `internal/upstream/import_boundary_test.go`, `internal/telemetry/boundary_test.go`, `internal/manage/arch_test.go`, `internal/async/arch_test.go`, `internal/format/signing_boundary_test.go` for `signing-service.md` AC2) stay where they are |
| AC16 | unit | `internal/format/pin_test.go` (reflection over `format.Handler`: exactly five methods); `internal/format/register_test.go` (optional-set recording for a fixture declaring none and one declaring all three; the all-three fixture's `format.Addressed` and its `format.Binding` route-level flag recorded; the binding semantics are `management-api.md` AC8's `internal/manage/binding_test.go`) |
| AC12 | unit | `internal/format/<name>/scope_object_test.go` per handler, the name the format specs and `auth.md` AC32 cite (route table covering every mount's routes and all four object kinds), with a shared helper in `internal/format/scope_test.go` that fails when a registered route is missing from the table, fails a non-descriptor route reporting no repository, and runs the sentinel check (seed sentinels, fetch, scan the body) for every route the table reports as a descriptor; OCI's repository-less `GET /v2/` in `internal/format/oci/scope_object_test.go` |
| AC17 | unit + architecture test | `internal/format/documents_test.go` (fixture handler holding only `Deps`: the three serving forms and a `304` with no validator header set by the fixture; the claim declaration's `retired` refusal and the advisory key on both calls through fixture `Deps`; import assertion); `internal/format/pin_test.go` (five methods); shared with `signing-service.md` AC11 and AC32 (`internal/format/freshness_boundary_test.go`, `internal/index/serve_rendered_test.go`, `internal/index/serve_file_test.go`), `management-api.md` AC12 (`internal/manage/retirement_test.go`), `storage-and-gc.md` AC30 (`internal/storage/write_claim_test.go`) and `supply-chain-policy.md` AC24 (`internal/policy/advisory_key_test.go`) for the behaviour behind each door |
| AC18 | unit + architecture test | `internal/server/replay_entry_test.go` (dispatch by repository and recorded route to the router's handler, marker set, no principal, `Scope(r)` never called; a non-`GET` method and a `local` and a `virtual` repository refused before dispatch with no handler invocation; a wire request carrying a header, query parameter and path segment named like the marker reaching the handler through the router without it; a fixture route denied through the router and served through the entry; shared with `auth.md` AC36); `internal/server/arch_test.go` (the entry constructed only in the composition root and passed only to `internal/proxy`, shared with `auth.md` AC36); shared with `proxy-cache.md` AC26 (`internal/proxy/arch_test.go`, the single call site); the queue's half of "no principal" is `async-operations.md` AC30's `internal/async/kinds_test.go` |

AC5's manual procedure: for each landing format, inspect the PR diff and record in the
experiment log that it touches only `internal/format/<name>/`, its conformance cases, and the
route registration point; any other file is a finding against this spec.

## Implementation Phases

### Phase 1: Interface and registration
- Interface definition, including the `Scope` type with its four-kind addressed object, the
  four-field `Capabilities` type, the typed policy refusal with the advisory reader and the
  `WriteRefusal` writer beside it, the `Verifier` consumer interface, the `Documents` serving
  door, the claim declaration and advisory key on the calls that carry them (AC17) and the
  `Indexer` interface beside `Deps` (AC14), the `Operation`, `Addressed`, `Outcome`, `Kind` and
  `Binding` value types (the last with its route-level-object flag), route registration with the carve-out list (path-only and host-bound
  claims, the `server.hosts` lookup in `Deps`) and the reserved-segment list (`api`, `ui`,
  `healthz`, `readyz`, `metrics`, `replication`, `t`, exactly `/`), the replay entry handed to
  `internal/proxy` (AC18), type assertion and recording of the three optional interfaces (AC16), the pin reflection test (AC16), and
  the architecture tests including the import boundary (AC15)

### Phase 2: Proven by two
- Generic and OCI handlers, confirming the interface survives a trivial and a hard format

### Phase 3: The scheduled re-open
- The write-triggered services prototype, both halves, then the re-open review pass (AC8) over
  its finding, the two Tier 0 handlers, the request-to-coordinate evidence, the server-side
  ingest hook, several objects per `Scope(r)`, the three optional interfaces, the host binding,
  the fetch-and-cache request shape, the revalidation replay, the `Deps` door as it has grown
  and the credential declarations, before any Tier 1 handler work

## Tasks

Left empty by design. Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None remain open. Q9 was raised by the 2026-09-25 gate review and adopted on 2026-09-26 under
the owner's standing delegation; Q10 was raised and adopted on 2026-09-27 during cross-spec
reconciliation; Q11 was raised and adopted on 2026-09-28 in the closing reconciliation sweep, on
Opus, and awaits a Fable recheck. Each record opens by saying so, and the owner may reverse any
of them. The resolved
records that follow are kept rather than deleted, so the reasoning survives the next time
someone asks why it was done this way.

### Resolved: how the revalidation replay reaches a handler (was Q11)

**Adopted 2026-09-28 under the owner's standing delegation**, in the closing reconciliation
sweep, on Opus. Option A: the registration layer exposes one below-authorizer **replay entry**, a
function value built in the server's composition root from the router's handler table and mount
rules and injected into `internal/proxy` at construction; it dispatches by repository and
recorded route with the replay marker and no principal, never calls `Scope(r)`, and nothing else
receives it. Folded through Design ("The shape", Routing and registration's "A second dispatch,
below the authorizer", "Hosted and proxied are one handler, two paths", "The scheduled re-open"),
AC8, the new AC18 with its Test Plan row, and Phases 1 and 3.

The question: `proxy-cache.md` adopted a `proxy.revalidate` job that replays a handler's own
proxied route in process, below the shared authorizer (its resolved revalidation-replay decision,
was Q18 there, AC26), and holds the call to one site in `internal/proxy`. That leaves this spec's
side open: the handler table belongs to the router this spec's registration layer builds, and
the router is where the authorizer runs, so something must hand `internal/proxy` a way in that
skips it, and the way in is a second entry into every handler that this spec's boundary has to
name and hold.

**Recommendation:** A, because it is the only shape with no import cycle (the composition root
builds every handler's `Deps` from `internal/proxy`, so `internal/proxy` cannot import the router
back) and it gives the bypass a single constructor and a single recipient, each assertable, which
is what `CLAUDE.md` asks of every shared concern.

| Option | You get | It costs |
|---|---|---|
| **A. One replay entry, a function value built in the composition root and injected into `internal/proxy` only** | No import cycle; the bypass has one constructor and one recipient, both held by an architecture test; the router's own entry always authorizes; no pinned method and no handler-facing type changes | A second, unauthorized way into every handler, which must sit on `auth.md` AC10's external review surface; a marker in the request context that no handler may branch on |
| **B. `internal/proxy` imports the router and reads its handler table** | No injected value | An import cycle with the composition root that builds `Deps` from `internal/proxy`, and a handler table any importer of the router could dispatch into below the authorizer, with no single constructor to hold |
| **C. The replay goes through the router with an internal system credential** | No bypass: the authorizer runs on every request | A credential kind `auth.md` does not have, whose holder may read every remote, minted to satisfy a check that has nothing to decide; and it reverses `proxy-cache.md`'s adopted "no principal" replay |

**Why this is yours:** it decides the one place a handler can be entered without the shared
authorizer, which is the security boundary this spec's routing section exists to keep single.

Accepted cost: the unauthorized entry exists and must be reviewed, its marker is a context value a
careless handler could read, and the re-open may move it; AC18 holds its constructor, recipient
and dispatch, `proxy-cache.md`'s architecture test its single call site. B lost to the import
cycle and the unowned table; C to the invented credential and the reversal of a sibling's adopted
answer.

Later note (2026-09-28, the closing sweep's leftovers pass): `auth.md` placed the entry on AC10's
external review surface and bounded it (its AC36), relying on three cases this record's AC18 did
not yet state, which AC18 and its row now carry: the entry refuses a non-`GET` method and a `local`
or `virtual` repository before dispatch, and no wire request can carry the marker. The route a
replay dispatches for a never-adopted remote is a member-input path the generator profile declares
(`signing-service.md` AC35), and the queue gives the calling job no principal
(`async-operations.md` AC30). None of this changes the option adopted.

### Resolved: three optional interfaces beside the pin (was Q10)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: the three optional
interfaces (`Operator`, `Indexer`, `surface.Declarer`) stay three, each declared by the shared
layer that consumes it and type-asserted at registration; none rides an out-of-cycle amendment,
because none touches the method set, and the fold-in or consolidation verdict is deferred to the
scheduled re-open, which takes all three as one named input. Folded through Scope, Design
("Optional interfaces discovered at registration", "The scheduled re-open"), AC8, AC16 and its
Test Plan row, and Phases 1 and 3.

The question as raised: three sibling specs authored on 2026-09-27 each answered "how does my
layer reach a handler without a sixth pinned method" the same way, with an optional interface
discovered at registration. Three such interfaces, each with its own assertion site and its own
"forgot to implement it" failure mode, is a shape the pin never anticipated, and the question is
whether to accept it, consolidate it, or fold one or more into the pin now.

**Recommendation:** A. Each interface has a different consumer and a different reason to exist:
`Operator` has four methods and is called inside a write transaction, `Indexer` returns a pure
generator the runtime calls before commit, and `surface.Declarer` returns static data read once.
The Go skill's rule that the consumer declares the interface at its point of use produces
exactly three, and a merged interface would force a handler with, say, a recipe but no
management operations to implement stubs for the rest, which is the all-or-nothing coupling the
pin was designed to avoid. The evidence the re-open exists to gather (generic and OCI on
`Operator` and `surface.Declarer`, the prototype on `Operator` and `Indexer`) does not exist
yet, so consolidating or folding now would be the anticipation the pin refuses.

| Option | You get | It costs |
|---|---|---|
| **A. Three interfaces, each owned by its consumer; verdict at the re-open** | No pin amendment; each interface is declared where the Go skill says it should be; the re-open judges from two real handlers and the prototype | Three assertion sites and three ways to forget an implementation, mitigated by AC16's recorded optional set and each owner's own registration-time check (`management-api.md`'s declared-kinds record, `web-ui.md` AC17) |
| **B. One `Extensions` interface consolidating all three now** | One assertion site | A handler with one capability implements stubs for the others; three shared layers coupled through one type none of them owns; decided without the evidence the re-open gathers |
| **C. Fold `Operator` into the pin now, since most formats have management operations** | The most-used capability becomes compulsory | A third out-of-cycle amendment, for a capability `management-api.md` itself says half the handlers lack (proxied-only formats), made before any handler has implemented it |

**Why this is yours:** it fixes the shape of every extension point a format's management, index
and UI halves are built on, and it decides how much the pin's "exactly five" claim still means.

Accepted cost: two Tier 0 handlers and the prototype will be written against three separate
optional forms, and the re-open may rename or merge them; AC16 makes the pin count and each
handler's declared set data the re-open can read rather than reconstruct.

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
path, as the first component of the OCI name (`formats/oci.md`'s resolved name-split decision,
was Q8 there, 2026-09-28). This is how Harbor and Gitea both resolve the same conflict.

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

Extended 2026-09-27, the decision unchanged: a third claim, Puppet's `/v3/`, arrived from
captured PDK traffic (`formats/puppet.md`, resolved PDK-publish decision, was Q1), and with it
the carve-out class split into path-only claims (OCI) and host-bound claims (Terraform, Puppet)
served only on a hostname `server.hosts` binds to one repository (`deployment.md`, resolved
host-binding decision, was Q8). Design records both sub-classes and the reserved-segment table.

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

Extended 2026-09-26, the decision unchanged: the prototype's own resolved async-coverage
decision (was Q1 in `write-triggered-services-prototype.md`, adopted under the owner's standing
delegation) gave it a second, Galaxy-shaped asynchronous half beside the Debian one, because
this record named async import tasks as the other class and Debian exercises only signed
indexes. The re-open's inputs and AC8 name both halves and the six questions they answer.

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

Ownership note, 2026-09-25, closed 2026-09-27: at the time no spec defined the adapter
interface itself, the same one-directional-dependency shape this spec's fetch-and-cache
obligation was corrected for. `upstream-adapters.md` now owns it: the `Adapter` interface in
`internal/upstream`, the `Router` the proxy layer holds, and the `upstream.Options` value the
fetch-and-cache entry in `Deps` passes down. Handlers never see an adapter and never import
`internal/upstream` (its AC29; AC15 here).

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-25 | 9a8f86d | gate review (draft -> planned decision): folded-decision application over all 12 resolved records + the `go` skill's interface lens applied hard (discovered-vs-designed, size, consumer placement, the *http.Request shape against the prior-art out-of-process finding) + adversarial + cross-spec (auth Q13 and AC18, supply-chain-policy Q4, conformance-harness AC11 and its protocol-observation rule, proxy-cache's fetch-and-cache obligation, npm's re-open gate, generic's Capabilities contract and open Q7, oci AC1, the catalogue's Tier 3 row) + constitution. Claim verification against code vacuous pre-implementation: the tree holds only a stub `cmd/stackweaver-registry/main.go` and no `internal/`; cross-spec claims and the one monorepo claim (`HandleServiceDiscovery` on the root `/.well-known/terraform.json` route) verified instead. Independent: this reviewer authored none of this spec's prior content | Gate not passed; stays draft on Q9. Eleven of twelve resolved decisions verified genuinely applied through Scope, Design, ACs and Test Plan; the twelfth, the URL-shape decision, reached Design ("Registration validates every mount") but had no policing criterion - AC11 added with a Test Plan row (fixture handlers failing registration on a wrong non-root prefix and an unlisted root anchor), closing the 12-decisions-versus-10-criteria gap where it was real. The discover-don't-design departure re-checked and found honestly recorded with its mitigation; the *http.Request foreclosure of an out-of-process boundary is knowingly priced in the resolved HTTP-direct and extension-boundary records, matching the prior-art warning rather than contradicting it, so no finding there. The sibling convergence verified independently rather than accepted: what was then auth.md Q13 and what was then supply-chain-policy.md Q4 hit the same structural gap in the pin (a request translates to repository plus action and nothing finer), none of the re-open's three named inputs would surface it, and both are now recorded in "The pinned method set" as pending inbound amendments, with the re-open's evidence set raised as Q9 for the owner, not decided. Corrections applied: the mapping-omission catch re-attributed to auth.md AC18 plus this spec's AC7 (auth.md's own AC7 is credential-leak scanning; its side is AC8); AC10's Test Plan row split, since a server-log assertion is not protocol-observable and the harness's observation rule bars it from a conformance case; the unowned upstream-adapter interface noted in its resolved record as a one-directional dependency. npm.md re-verified to carry the same re-open gate from its side; what was then generic.md Q7's pending amendment to definition-of-done item 2 confirmed still open and correctly hooked. |
| 2026-09-23 | 77b52ad | design + cross-spec consistency, **not independent**: this pass was run by the author of the `Scope(r)` addition, so its adversarial value on that method is limited and a later independent pass should re-check it | Mechanical gate clear (9 ACs, all mapped, no stale references). Two findings raised as Q7 and Q8: the runtime failure mode of `Scope(r)` is undefined on the authorization boundary, and AC5 is falsifiable by construction now that the proxy layer ships with OCI. Stays draft. |
| 2026-09-22 | afbb4e4 | adversarial + constitution + go-spec-reviewer (claim verification vacuous pre-code; cross-spec citations checked instead) | Fixed internal contradictions (metadata ownership vs `data-model.md`, AC4 vs the generic exemption, a citation to a harness AC that does not exist); added AC6/AC7 because import-based architecture tests cannot hold the proxy and auth boundaries; raised Q1-Q5; stays `draft` |
| 2026-09-23 | 3e3ae0a | folded-decision application + adversarial + constitution + go-spec-reviewer (tree claim verification vacuous pre-code: the tree holds a stub `cmd/stackweaver-registry/main.go` only; cross-spec, catalogue and protocol claims checked instead) | All four folded decisions were recorded but unapplied to the body: pinned the method set into Design (the central artifact was still absent), rewrote the pre-decision declarative proxied-path prose to the handler-calls-fetch-and-cache flow, added Routing and registration with the Terraform root-anchor grounding, moved write-triggered services into Scope and Phase 3, added AC8 plus the re-open trigger and gate; corrected the stale claim that the harness spec lacks a mode-coverage AC (its AC11 is that AC); tightened AC6 to type-aware call-site enforcement with a fixture test; added the missing `## Tasks` section; raised Q6 (egress import allowlist); stays `draft` on Q6 |
| 2026-09-26 | 4d1aeb1 | folding adopted recommendations under the standing delegation. Not a gate review | Adopted Q9 A: the re-open's named inputs now include the request-to-coordinate evidence (auth.md's pattern-evaluation outcome as the addressed object behaves in the generic and OCI handlers, supply-chain-policy.md's evaluation-hook outcome, and ansible-collections.md's async-import-task finding as further evidence the pin and model were fixed early), and the re-open must give an explicit verdict on each out-of-cycle amendment and on whether the addressed object and the policy coordinate converge. auth.md adopted its pattern question as "amend now" in the same pass, so the amendment is made and recorded as out of cycle, with why: the pinned `Scope` type gains an addressed object of three kinds (named, content-addressed, none), because the only other places a pattern could be evaluated - inside a handler, or per-format URL grammar in shared code - are both forbidden; the method set stays at five. `Scope(r)` itself relabelled as the first out-of-cycle amendment. Policy needs no amendment, since supply-chain-policy.md resolved its hook inside `Deps` in parallel; the citations were updated to that resolution. Criteria: AC7 extended with a runner-enforced pattern-refusal case; AC8 extended to the new inputs and verdicts; AC12 added (per-handler route table test of object reporting, missing routes failing) with a Test Plan row; Phases 1 and 3 updated. Q9's option B row corrected: both Tier 0 formats do exercise the field. The 2026-09-25 row's two sibling-question citations reworded to past tense, since both questions are now resolved; its meaning is unchanged. Also absorbed, because it landed in parallel and left this spec citing a resolved question as open: `formats/generic.md` adopted its replay-match exemption the same day, so `Capabilities()` gains reference-implementation availability, definition-of-done item 2 now states the exemption and its containment, and AC13 asserts it with a Test Plan row (now 13 criteria). Stays draft. |
| 2026-09-26 | fe54272 | cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. From the replication fold: the re-open's inputs gain the server-side ingest hook (driving hosted ingest from blobs already in the store, which `replication.md`'s freeze phase is blocked on), and shared-layer routes such as the replication read surface mount under reserved first segments held in a second registration list, so a handler's `Name()` or root-anchored claim colliding with one fails registration (Design, AC11 extended). From the supply-chain fold: the metadata-resolution, blob-read and fetch-and-cache entries in `Deps` are policy-enforcing and return a typed policy refusal declared in `internal/format` beside `Deps`, so a handler uses `errors.As` without importing `internal/policy` (AC14 added; the method set is unchanged at five). From the format-management fold: the re-open's inputs and AC8 name both prototype halves (Debian signed indexes, Galaxy-shaped async) and its six-question finding, plus management dispatch, which `management-api.md` must answer; Scope's out-of-scope item and Phase 3 updated, and the was-Q4 record gained an extension note. From the generic fold: AC13's Test Plan row now shares `conformance/core/matrix_test.go` with `conformance-harness.md` AC20. From the charter fold: 31 bespoke schemas corrected to 33. |
| 2026-09-28 | 95346bd | cross-spec reconciliation sweep of the foundation wave. Not a review | Not a review. Applied the four items raised against this spec by the step-3 reconciliations that ran after its own pass of 2026-09-27, each verified against the source spec's current text, plus the format-side re-open inputs that pass had left unapplied. From `supply-chain-policy.md` (its "A handler may read advisories, never evaluate them" and its resolved refusal-status-line decision, was Q10; AC18, AC19): `Deps` carries the advisory reader, a fourth policy-layer consumer interface that is not policy-enforcing, and `internal/format` holds `WriteRefusal(w, r, refusal, body)`, the module's only hand-written status line, asserted by `internal/format/arch_test.go`; AC14 extended with its Test Plan row, the method set unchanged. From `replication.md` (its AC18): the reserved segment is the string `replication`, in the table, AC11 and its fixtures. From `auth.md`'s reconciliation ("Presentation forms", AC31, was Q24): `t` joins the reserved table for the root path token `/t/{token}/`, which the shared authorizer strips before routing so every mount beneath it is served unchanged, with an AC11 fixture and the stripping asserted on both mount classes; and the re-open gains the route-scoped credential declaration as a named input (routes plus header, query or segment position), which `auth.md` already cited this spec as recording and which was missing, together with three same-shaped requests from the format folds that were likewise unapplied here (Chef's end-of-part content hash, the externally visible base URL for Vagrant and npm, Swift's alias-carrying coordinate). From `proxy-cache.md`'s reconciliation: the fetch-and-cache request shape is now defined in its "Obligation to the handler interface", so "The shape" cites it instead of saying it must be defined, and the re-open takes it as an input. AC8 requires a verdict on both new inputs. Phase 1 updated. The pin stays five (AC16). Every other section of the consequences queue written after the 2026-09-27 pass was grepped for this file and carries no further item. `node scripts/check-spec.js` on this file: zero failures. Stays draft. |
| 2026-09-27 | 713c1e3 | cross-spec reconciliation of the foundation authoring wave. Not a review | Not a review. Every queued item targeting this file verified against the current text of its source spec before applying. The pin stays five and AC16 now holds the count by reflection. The three optional interfaces the authoring wave introduced - `Operator` (`management-api.md`, resolved dispatch decision, was Q2, four methods, declared in `internal/manage`, with value types in `internal/format`), `Indexer` (`signing-service.md`, `Generator() index.Generator`, the prototype's question 1), `surface.Declarer` (`web-ui.md`, resolved declaration-home decision, was Q1) - are recorded in a new Design subsection as type-asserted at registration and as one named re-open input with a per-interface verdict required by AC8; Q10 raised in the template's decision shape and adopted under the standing delegation: keep three, do not consolidate or fold before the re-open's evidence exists; none rides an out-of-cycle amendment because none touches the method set. `async-operations.md`'s finding that the runner reaches a handler only through `Operator.Apply` (the prototype's question 4) and its generalised no-goroutine rule recorded. `repository-lifecycle.md`: `Capabilities()` gains `Virtual` and `Rename`, AC13 extended, the rename `configure` operation named under `Operator`. `auth.md` Q23: the `descriptor` kind, stated explicitly as riding the 2026-09-26 amendment as auth.md treats it; AC12 covers four kinds and runs the sentinel test on every descriptor route, the shared helper gaining the check. `Deps`: the `Verifier` (`artifact-verification.md`), `upstream.Options` on fetch-and-cache (`upstream-adapters.md`, which now owns the adapter axis; the 2026-09-25 ownership note closed), the `server.hosts` lookup (`deployment.md`, was Q8), the `*slog.Logger` with context correlation (`observability.md`). The handler import boundary consolidated into AC15 with one test and a fixture per edge (policy, verify, upstream, repository both ways, telemetry and OTel and client_golang, manage, async). Reserved segments made an exhaustive owner-cited table (`api`, `ui`, `healthz`, `readyz`, `metrics`, the replication segment, exactly `/`) with AC11 naming a fixture per string; the carve-out class split into path-only and host-bound claims with Puppet's `/v3/` (Open item 25) recorded beside Terraform, the was-Q3 record extended. Old-fold items (replication 4, supply-chain 2, harness 2, format-management 4, charter 4) found already applied at fe54272. 16 criteria. Stays draft. |
| 2026-09-28 | b0fa0b3 | closing-sweep reconciliation pass on Opus (step 3): cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Applied every item in `agents/spec-loop/consequences.md` targeting this file from "From format batch 3 reconciliation" through "From the supply-chain-policy.md closing sweep", each matched to the settled text of its owning spec rather than the queue text, plus format batch 1 item 2, which the progress log did not show applied. Signing-service closing sweep item 3: `Deps` carries `Documents` (`ServeDocument`, `ServeRendered`, `ServeFile`, `SignedBy`) declared in `internal/format` (its was-Q14). Management-api closing sweep item 3 (with batch 3 item 4, batch 4 item 4 and batch 6 item 10, settled there): `Operator.Authorize` returns `format.Addressed`, `format.Binding` gains the route-level-object flag, the value types gain `Addressed`, and two re-open inputs (several objects per `Scope(r)`, its was-Q13; the `Deps`-level claim declaration, its was-Q14, with `storage-and-gc.md` AC30 and was-Q12). Proxy-cache closing sweep item 3: the fetch-and-cache request gains the adoption check (its AC25), and the `proxy.revalidate` replay (its was-Q18) is a second dispatch into handlers below the authorizer; Q11 raised in the template's decision shape and adopted under the standing delegation, on Opus: one replay entry, built in the composition root from the router's handler table and injected into `internal/proxy` only, no pinned method or handler-facing type changed (Routing and registration, AC18). Supply-chain closing sweep item 2 and batch 4 item 9: the advisory key rides the metadata-store write and the fetch-and-cache request (its was-Q11), which also answers how the core learns an origin or source package; the advisory reader is keyed by the repository served (its was-Q12); Swift's alias rider marked superseded. Auth closing sweep item 2: the exchange-echo declaration (its was-Q25, AC35) joins the route-scoped credential input; the `Scope(r)` row states OCI's repository-less `GET /v2/` descriptor (its AC32, `formats/oci.md` was-Q8), "OCI reports tags" becomes `{image}/{tag}`, the path-only claim and the was-Q3 record name the first-component split, and AC12 fails a non-descriptor route reporting no repository. The re-open's inputs rewritten as one complete list, each naming its source spec and question (the ingest hook as `replication.md` was-Q10, `Indexer` as `signing-service.md` was-Q3, `surface.Declarer` as `web-ui.md` was-Q1, the ansible finding as its was-Q1 and was-Q6), with a new "`Deps` door as it has grown" input; AC8 requires a verdict on every new input. Also corrected on verification: the import boundary lacked `internal/signing` (`signing-service.md` AC2), now in AC15 and its row; the per-handler object table file is `scope_object_test.go`, the name every format spec and `auth.md` AC32 cite; the adapter-seam citation pointed at a heading `upstream-adapters.md` does not have (it is `proxy-cache.md`'s, and "The interface" there). New AC17 (`Documents`, claim declaration and advisory key through `Deps`, pin five) and AC18 (the replay entry), each with a Test Plan row; Scope and Phases 1 and 3 updated. No method change: the pin stays five (AC16). Earlier items found already done: every item before format batch 3 other than batch 1 item 2 (sweep 1 and the foundation reconciliation). `fable_recheck` added for Q11. 18 criteria. Stays draft. |
| 2026-09-28 | 4278ce0 | leftovers pass of the closing sweep on Opus: cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Applied the items queued against this file after its closing sweep, each verified against the owning spec's settled text. Six-spec closing sweep item 3: the fetch-and-cache location gains the git form `{url, commit}` (`upstream-adapters.md`'s resolved git-location decision, was Q9, AC34), in the handler-contract bullet, the re-open input and AC8. Data-loss fix item 4 and its second-wave item 2: the adoption check's result carries the kept-blob digests, and a revisioned document set carries its retention count, with the declared counts so far read from the format specs (one per module for `puppet.md`, one per box for `vagrant.md`, zero for `homebrew.md`'s API documents and manifests). Eviction settlement item 6: the classification carries evictability (artifact versus metadata, `proxy-cache.md` was-Q21, AC29), the count is zero-valid (was-Q19) and the declaring level is repository or package (was-Q22). Auth and data-model second passes item 1: "A second dispatch, below the authorizer" and AC18 gain the three cases `auth.md` AC36 relies on (non-`GET` refused before dispatch, `local` and `virtual` refused before dispatch, no wire request carrying the marker), the `internal/server/replay_entry_test.go` row names them and shares with `auth.md` AC36, the "reported to that spec" sentence now cites `auth.md` AC36 and its AC10 procedure, and the replayed route for a never-adopted remote is the profile-declared member-input path (`signing-service.md` AC35). Async-operations closing sweep item 3 (optional, applied): `async-operations.md` AC30 cited in Design and in AC18's row. A dated note on the was-Q11 record says what landed; the option adopted is unchanged. Found already done: proxy-cache closing sweep item 3 (the adoption check and the second dispatch, since the closing sweep). No question raised or adopted; the fable_recheck marker is unchanged. The pin stays five; 18 criteria, each with a Test Plan row. Stays draft. |
