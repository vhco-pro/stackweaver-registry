---
status: draft
status_description: "Reconciled 2026-09-28 at 9f53d20 with the foundation authoring wave (not a review), after the 2026-09-27 grounded first draft. The spec is now the single wire contract for every sibling that mounts under /api/v1: an exhaustive endpoint table with per-route authorization (repository lifecycle, trust and verdicts, signing keys, upstream credentials with kinds, job administration, the credential routes, the session, formats, search, recipes, refusals and refresh reads the UI needs), a closed problem-type table with statuses (now 19 types), the cancelled state and cancel route, X-Request-Id validation and the audit channel via telemetry.Auditor.Emit, and the session cookie with CSRF on unsafe methods. Twelve questions in decision shape adopted under the owner's standing delegation (Q11 deleted listing as a filter, Q12 refresh under push); zero open. 32 criteria, each with a Test Plan row. Awaits a /spec review pass."
description: "Spec for the registry-owned management API: the one surface through which hosted content is administered across every format (publish where no client publishes, withdraw and restore, annotate, delete, retire), repositories and pointers are administered, and every operation is one completed logical write with one audit record; client-native routes such as npm unpublish and cargo yank are bindings onto the same operations."
author: michielvha
goal: "Give the 33 format handlers one management surface with one authorization rule per operation, one write-accounting rule, one audit record and one dispatch mechanism, so that a format's management half costs a table of bindings rather than a bespoke API, and so that no management write can ever bypass the snapshot model or the single blob deleter."
priority: high
issue: 44
created: 2026-09-27
covers:
  - "internal/manage/**"
  - "internal/format/*.go"
  - "cmd/stackweaver-registry/**"
---

# Plan: Management API

One registry-owned HTTP API, mounted under a reserved first path segment, through which every
management operation on every format is performed: the operations no ecosystem client can
trigger (PyPI yank, Galaxy deletion, CRAN publish, Debian suite copies), the operations a client
can trigger and which are then served as bindings onto the same operation (`npm unpublish`,
`cargo yank`, `dotnet nuget delete`), and the administration of repositories, pointers and human
grants. Every operation is one completed logical write in `data-model.md`'s sense, deletes no
blob-store object, leaves one `Operation` record and one audit line, and is authorized in
`auth.md`'s three-word vocabulary with no new action.

## Context

**Who depends on this.** Every format spec under `docs/internal/plans/formats/` cited this file
as "to be authored in the spec loop" when it was drafted and lists a phase that waits on it
reaching `planned` (`grep -rln management-api docs/internal/plans/formats` returns all 32). The
requirements they place split into four groups:

- **Operations with no client trigger**, settled as registry-owned endpoints by the Cluster 5
  decision (`docs/internal/analysis/management-surfaces-and-the-oracle.md`, its closing
  update): `pypi.md` yank, unyank, file and release deletion (its Design, "The management
  surface"; AC12, AC13); `ansible-collections.md` version and collection deletion (AC12);
  `helm.md` chart-version deletion and provenance attachment (AC6, AC18); `pub.md` retraction
  and discontinuation (AC6, AC7); `go-modules.md` deletion with 410 and retirement (AC17);
  `swift.md` mark-unavailable, restore, delete and rebind-repository-URL (AC9); `maven.md`
  version, file and SNAPSHOT-build deletion; `luarocks.md`, `puppet.md`, `julia.md`,
  `terraform.md`, `homebrew.md`, `openvsx.md` and `vagrant.md` their removal and annotation
  operations.
- **Formats whose only hosted write path is this API**, because nothing on their wire writes:
  `cran.md` (publish into a tree, delete a version optionally per tree, delete a package),
  `conda.md` (publish, patch, revoke, remove, notices), `composer.md`, `debian.md` (publish,
  copy into suite, remove from suite, delete, suite configuration), `rpm.md`, `alpine.md`,
  `arch.md` (batch publish as one write), `julia.md`, `vagrant.md` (multi-gigabyte uploads),
  `terraform.md` (all platforms in one publish), `homebrew.md`, `hackage.md`, `cpan.md` and
  `opam.md`.
- **Client-native routes served as bindings** onto the same operations: `npm.md` (the `-rev`
  unpublish routes and the deprecate `PUT`), `cargo.md` (yank and unyank, its resolved
  yank-binding decision, was Q6, which `auth.md` now cites), `nuget.md` (`dotnet nuget delete`
  as unlist, the documented `POST` relist), `hex.md`, `chef.md`, `conan.md`, `puppet.md`,
  `openvsx.md` (`ovsx unpublish`), `cpan.md` (the PAUSE-shaped upload), `debian.md` (dput) and
  `hackage.md` (`POST upload`).
- **Repository administration**: `generic.md` needs an operator API for the immutability switch
  and retention rules from charter step 2 (its Context, "Depended on, not owned"); `debian.md`
  suite configuration, `alpine.md` and `arch.md` architecture sets, `openvsx.md` verified
  namespaces, `cpan.md` ownership transfer, and key rotation for every signed-index format.

The foundation specs place their own requirements. `auth.md` ("Scope vocabulary") settles that
management operations add no action, that removal-class operations require `delete` and
metadata changes `push`, and that **one operation carries one authorization rule whatever wire it
arrives over**, with client-native routes as bindings; it records that the cross-format mapping
is this spec's to reconcile. `data-model.md` requires each operation to be a completed logical
write producing exactly one snapshot ("Snapshots, pointers and what counts as a write"; AC9),
exposes pointer management as the promotion surface, and places on this spec the obligation
that a pointer moved backwards preserves the retirement set ("A package outlives its versions";
AC33). `storage-and-gc.md` AC15 makes the sweep and the orphan scan the only object deleters,
so no operation here deletes a blob. `format-handler-interface.md` reserves a first path
segment for shared-layer routes (AC11) and names **management dispatch**, how an operation
reaches the handler whose document it changes given only the five pinned methods, as an input
to the scheduled re-open that this spec must answer ("The scheduled re-open").
`conformance-harness.md` settles that `setup` never calls a management endpoint: a case wanting
trigger and effect together calls the endpoint from its `script`, and the trigger of an
operation no client drives is verified by this registry's own integration tests (its resolved
seed-path decision, was Q5). The queued requirements are listed in
`agents/spec-loop/consequences.md` ("From format-management fold", item 1, and Open items 4, 8,
11, 15, 17 and 25).

**The foundation authoring wave.** Nine sibling specs authored on 2026-09-27 each contribute
routes, problem types or conventions to this surface, and this spec is their single wire
contract: `credential-management.md` (tokens, robots, registered keys under `/api/v1`),
`artifact-verification.md` (trust sets and verdicts), `signing-service.md` (signing keys as
`configure` operations), `upstream-adapters.md` (upstream validation and credential kinds),
`async-operations.md` (cancellation, job administration, the `cancelled` state),
`repository-lifecycle.md` (identity, freeze, thaw, rename, deletion semantics),
`observability.md` (the request id rule and the audit channel), `deployment.md` (the server
binary's operational subcommands) and `web-ui.md` (the reads a browser client needs). Their
items were applied here on 2026-09-28, each verified against the source spec's current text
(Review Log).

**Charter placement.** `project-charter.md` builds the **management surface core** (repository,
pointer and grant administration; the token half is `foundation/credential-management.md`
Phase 1, the repository half `repository-lifecycle.md` Phases 1 and 2) at step 2 beside generic,
because generic's settings are changed through an operator API; format management operations
land with their formats at steps 5, 6 and 6a on that core, through this API and the dispatch the
step 4a re-open settles; deferred execution arrives with `async-operations.md`, whose queue core
lands at the start of step 4b and whose deferred-operation consumer lands at step 6a (its
resolved build-placement decision, was its Q9); and the rest of the surface completes at step 9
before the web UI, which is its client (charter Design, "Build order"; AC12).

**State of the tree.** Nothing is implemented: `cmd/stackweaver-registry/main.go` is a stub that
prints "not implemented yet" and exits 1, and no `internal/` directory exists (`find internal`
at 6ae6608 returns nothing). Every claim below about code is therefore a claim about what will
exist, and the tests named in the Test Plan are the first things that will.

**Prior art consulted this run.** Nexus Repository exposes components by opaque id
(`DELETE /service/rest/v1/components/{id}`, 204, no soft delete documented) and a separate
tasks API for background work; Harbor versions its API in the path (`/api/v2.0`), deletes
artifacts and tags by coordinate, echoes `X-Request-Id` on every response and exposes audit
logs as a queryable resource; Pulp makes every content change a new immutable repository
version and answers long-running work with 202 and a task href; Gitea deletes a package
version or file by coordinate with 204 and forbids modifying a published package. RFC 9457
defines `application/problem+json`; the IETF `Idempotency-Key` draft defines replay of a
repeated key, 422 on a reused key with a different payload and 409 while the first request is
outstanding; Google's AIP-151 and AIP-155 define the operation-resource and request-id patterns.
Artifactory's REST documentation was unreachable from this environment (three redirects ending
in 404), so nothing below is grounded in it. What is taken and what is rejected is stated in
Design, "Prior art".

## Scope

**In scope**

- The management API's mount, versioning, request and response conventions, and its problem
  vocabulary.
- The closed vocabulary of **operation kinds** and the cross-format reconciliation of every
  format's management operations onto it and onto `auth.md`'s actions.
- The **binding rule**: when a client-native route may be served as a binding, and the
  mechanical proof that a binding and the endpoint are one operation.
- **Dispatch**: how an operation reaches the handler that owns the document it changes, given
  the pinned five methods, and what this spec feeds the interface re-open.
- **Write accounting**: one operation, one completed logical write, one snapshot; refused
  operations leave nothing; bulk operations are one write; deferred operations and the
  `Operation` record.
- The **retirement set** as a core-held record and the central refusal of a retired coordinate.
- **Publish through the API**, including upload sessions for large files, declared
  coordinates, batch publishes and the multipart convenience form.
- **Repository administration**: creating, configuring and deleting repositories, upstream
  bindings and upstream credentials, virtual members, visibility, retention rules and
  format-specific settings; **pointer management** as `data-model.md` exposes it; **human
  grant administration** in `auth.md`'s vocabulary.
- **Audit**: the `Operation` record every completed operation leaves and the audit log line
  every operation, refused or not, emits.
- The API-first stance, the OpenAPI document and its compatibility gate.

**Out of scope, each with its reason**

- **Token issuance, listing and revocation, robot accounts and registered public keys.**
  `foundation/credential-management.md`, the home `auth.md` names for the token surface and its
  expiry-warning criterion (its resolved surface-placement decision, was Q21). It mounts
  `/api/v1/tokens`, `/api/v1/robots` and `/api/v1/keys` inside the segment this spec reserves
  and follows every wire convention here; its two problem types are in the closed list below.
- **Execution of deferred operations.** `async-operations.md` owns workers, retries, leases,
  pausing and the cancellation mechanics (its resolved cancellation decision, was its Q5); this
  spec owns the operation's wire shape, its `Operation` record, its poll and cancel routes and
  the job-administration routes, so the two are one contract seen from two sides.
- **What a signing key operation does.** `signing-service.md` (charter step 7) owns key
  generation, rotation with overlap and the document a rotation produces; this spec owns the
  operation kind it arrives as (`configure`), the routes it mounts and who may call them.
- **Repository lifecycle semantics.** `repository-lifecycle.md` owns what creation, freeze, thaw,
  rename and deletion do to identities, grants, members, links, jobs and snapshots, and the
  `in-use` and confirmation rules; this spec owns the routes, request fields and problem types
  through which an operator asks for them.
- **Trust sets, verdicts and policy refusals as records.** `artifact-verification.md` owns the
  trust set and the verdict; `supply-chain-policy.md` owns the refusal record; this spec mounts
  their read and administration routes and fixes their authorization.
- **Compatibility surfaces for third-party management APIs**: HCP Vagrant's API v2, Galaxy NG's
  `DELETE` routes, ChartMuseum's delete and provenance routes, pub.dev's `options` routes. Not
  served, for the reasons recorded in the resolved compatibility-surface decision (was Q8):
  staging state outside the shared model, credential-bearing upload URLs, and no client in the
  matrix to oracle them. A format may still bind a **client-driven** route or a route of its
  ecosystem's published reference API, under the binding rule.
- **A command-line client for this API.** Declined in v1 by the resolved CLI-stance decision
  (was Q9): the harness's `script`, the web UI and any HTTP client are the API's clients, and a
  CLI built before the API stabilises becomes the surface formats bind to instead of the API.
  The server binary's `seed` and bootstrap subcommands are not management clients; they write
  through the shared layers, as `conformance-harness.md` and `auth.md` define them.
- **Per-format semantics of an operation's effect.** What pip sees after a yank, what apt sees
  after a suite copy: each format's spec defines the effect and the conformance case that
  proves it. This spec defines the trigger, its shape, its authorization and its accounting.
- **The web UI.** Charter step 9 (`web-ui.md`); it is a client of this API and asserts nothing
  this spec does not expose. The reads it found missing are now routes here (the endpoint
  table: session, formats, search, recipes, refusals, refresh), so that rule holds.
- **A `manage` or `yank` scope action.** `auth.md` names such a proposal a change to its
  vocabulary; nothing here needs one.

## Design

### One API, three families, one write path

The API mounts under the reserved first path segment `api`, versioned in the path as `/api/v1`,
and serves three families of operation, all under one authorizer, one write path and one audit
mechanism:

| Family | What it changes | Where the write lands | Authorization |
|---|---|---|---|
| **Content operations** | Packages, versions and files of a `local` repository, and the metadata documents around them | One completed logical write producing one snapshot, applied through the owning handler (Dispatch, below) | `push` or `delete` on the addressed object, per the operation kind |
| **Repository administration** | A repository's existence, state, name, type, visibility, retention rules, virtual members, upstream binding, trust set, signing keys and format-specific settings, and the registry's human grants, upstream credentials and job queue | Configuration outside snapshot content, except a format-specific settings change, which the handler applies as a completed write when it changes served documents (Debian's `Release` fields), and a `local`'s deletion, which ends its head as one final write (`repository-lifecycle.md`) | The global admin role (`auth.md`, "Human grants": the admin alone creates repositories and changes visibility; nothing in the vocabulary expresses "administer this repository") |
| **Pointer management** | Which snapshot a named pointer serves, and, on a `remote`, when its cached metadata is next revalidated | A repoint, pointer deletion or cache refresh; never a snapshot | `push` on the repository for creating, repointing and refreshing, `delete` for deleting a pointer (the resolved pointer-action decision, was Q6, and the resolved refresh-action decision, was Q12) |

Reads exist for every resource the API writes, and for the resources a management client needs
to name a target: repositories, packages, versions and files (as the core models them, with the
handler's canonical coordinate), pointers with their targets and reach, operations, retirements,
the trust set and verdicts, policy refusal records, client recipes, grants and upstream
credentials (metadata only, never the secret), plus three registry-wide reads a browser or an
automation client needs before it names anything: the caller's own session, the registered
formats with their capabilities, and a package-name search. Reads are authorized `pull` on the
repository, except grants, upstream credentials, the deleted-repository listing, the job queue
and the registry-wide operation listing, which are admin-only; the registry-wide reads are
answered for every caller and scoped to what that caller may read (the endpoint table below).

The three families share every convention below, and the content family is where the cost of
breadth lives, so it gets the most words.

### Prior art: what is taken and what is rejected

- **Taken from Pulp:** every content change is a new immutable repository version, and
  long-running work answers 202 with a handle to poll. That is `data-model.md`'s snapshot rule
  and its `Operation` entity, so the API exposes them as they are rather than inventing a
  second history. **Rejected:** Pulp's separation of a repository from the publication that
  serves it; here the default pointer advances on every write, so a repository nobody promotes
  behaves as a mutable one, which is what package clients expect.
- **Taken from Harbor:** the version in the path, deletion by coordinate rather than by opaque
  id, `X-Request-Id` on every response, and audit records queryable through the API.
  **Rejected:** Harbor's per-project roles; `auth.md` settled one vocabulary for humans and
  tokens.
- **Taken from Gitea:** deletion of a version or a file by coordinate with a plain 204, and the
  rule that a published coordinate is never modified in place (retirement makes it stronger:
  never reused either). **Rejected:** Gitea's absence of any soft state; half the formats above
  need a yank-class operation precisely so that nobody reaches for hard deletion.
- **Rejected from Nexus:** opaque component ids as the deletion handle. Every format here has a
  canonical coordinate, `auth.md`'s addressed object, and it is what a pattern-scoped grant
  matches against; an opaque id would put a second identity beside it and make a refusal
  unexplainable in the format's own terms.
- **Taken from the standards:** RFC 9457 problem details for every refusal, the
  `Idempotency-Key` header semantics for retried writes, and AIP-151's rule of thumb that work
  expected to exceed roughly ten seconds is an operation to poll rather than a response to wait
  for.

### Mount, versioning and wire conventions

- **Reserved segment.** `api` is the reserved first path segment this spec owns, held in
  `format-handler-interface.md`'s reserved table beside `ui`, `healthz`, `readyz`, `metrics` and
  the replication segment, so no handler may be named `api` or claim a root-anchored mount under
  it (its AC11), and `repository-lifecycle.md`'s name grammar refuses every reserved segment as a
  repository name. Sibling packages contribute routes inside this reservation and follow every
  convention in this section: `internal/credential` mounts `/api/v1/tokens`, `/api/v1/robots`
  and `/api/v1/keys` (`credential-management.md`); `internal/signing` serves
  `/api/v1/repositories/{name}/signing-keys` (`signing-service.md`); `internal/async`'s
  administration is `/api/v1/system/jobs` (`async-operations.md`); `internal/repository`'s
  lifecycle transitions are the freeze, thaw, rename and delete routes
  (`repository-lifecycle.md`). Every contributed route appears in the endpoint table below and
  in the one OpenAPI document (AC25). Helm's captured concern that `cm-push`'s default `/api/`
  shape would collide with "the registry's own future `/api/` management surface" (`helm.md`,
  its resolved mount decision) is exactly this reservation: the collision is refused at
  registration, not discovered in production.
- **Versioning.** `/api/v1` is the only version at first. Within `v1`, changes are additive:
  new routes, new optional request fields, new response fields, new operation kinds. A change
  that removes or retypes anything ships as `/api/v2` beside `v1`, never in place. The
  checked-in OpenAPI 3.1 document `internal/manage/openapi/v1.yaml` is the contract; a test
  regenerates it from the route table and fails on any difference, and a second test compares
  the committed document against the one at the previous tag and fails on any removal or type
  change (the go-release skill's breaking-change discipline, applied to the HTTP surface since
  the Go types are `internal/` and carry no compatibility promise).
- **Requests** are JSON except where bytes are carried (upload sessions, the multipart publish
  form). Every response carries `X-Request-Id`: a client value of 1 to 128 bytes from
  `[A-Za-z0-9._-]` is echoed, anything else (absent, longer, or carrying any other byte, since
  the value lands in a log line) is replaced by a generated id. The validation and the echo are
  the shared middleware's on every listener, owned by `observability.md` (its AC14) and applied
  here; the same id is the audit line's and the `Operation` record's correlation field.
- **Authentication on `/api/v1`** is either the bearer token `auth.md` defines or the browser
  session cookie `auth.md` issues after OIDC (its AC22), decided by the same authorizer into the
  same principal shape. Because a cookie is an ambient credential, a cookie-authenticated
  request with an unsafe method (`POST`, `PUT`, `PATCH`, `DELETE`) must carry `X-CSRF-Token`
  equal to the `stackweaver_csrf` double-submit cookie, and is refused `unauthenticated` when
  the header is absent or differs; a bearer-authenticated request never carries one. The
  mechanism is `auth.md`'s; this spec requires it on every route under `/api/v1`, contributed
  routes included, and holds it with a test (AC30).
- **Refusals** are RFC 9457 `application/problem+json`. The `type` URI is one of a closed list
  under `https://stackweaver.dev/problems/registry/` (resolvable later; the list is the
  contract now), `title` is fixed per type, `detail` names what was refused in the format's
  own coordinate terms, and extension members carry the machine-readable specifics: the refused
  coordinates for a retirement refusal, the reach for a repoint refusal, the operation id for a
  replay, the dependants for an `in-use` refusal. **The closed list**, with the status each
  carries and the spec that fixes its semantics where that is not this one:

  | Type | Status | Meaning |
  |---|---|---|
  | `not-found` | 404 | Absent, or unreadable to the caller (the existence oracle) |
  | `unauthenticated` | 401 | No credential, an invalid one, or a cookie-authenticated unsafe request without a matching CSRF token |
  | `unauthorized` | 403 | The principal lacks the action on the addressed object |
  | `validation` | 422 | A malformed request, a declaration the handler's peek contradicts, a name outside the grammar, a deletion whose `confirm` is not the repository's identity |
  | `conflict` | 409 | A duplicate name or a state the write cannot apply to |
  | `retired` | 409 | The addressed coordinate is in the repository's retirement set |
  | `repository-type` | 405 | A content operation, publish or refresh against a repository type that does not accept it |
  | `read-only` | 405 | A completed write against a `read_only` repository (`repository-lifecycle.md`) |
  | `in-use` | 409 | Deleting a virtual member without `detach`, or an upstream credential still referenced by an `Upstream` or a `ReplicationLink` (`repository-lifecycle.md`) |
  | `capability-unsupported` | 422 | A `virtual` of, or a rename in, a format whose `Capabilities()` declares it unsupported (`repository-lifecycle.md`) |
  | `upstream-invalid` | 422 | `upstream.Validate` refused a `remote`'s upstream on create or `PATCH` (`upstream-adapters.md` AC23) |
  | `unsupported-kind` | 404 | The handler declares no such operation kind |
  | `idempotency-key-reuse` | 422 | The same `Idempotency-Key` with a different payload |
  | `operation-outstanding` | 409 | A repeat while the first request's job is not terminal |
  | `out-of-reach` | 409 | A repoint to an untargeted snapshot outside the retention window |
  | `too-large` | 413 | A body over the spool or chunk limit |
  | `deferred` | 202 | Not a refusal: the problem-shaped body a binding returns when its client wire has no 202 form |
  | `scope-exceeds-owner` | 422 | A token scope wider than its owner's grants (`credential-management.md`) |
  | `lifetime-policy` | 422 | A token lifetime outside the instance policy (`credential-management.md`) |

  No sibling spec adds a type outside this table; `artifact-verification.md`, `signing-service.md`,
  `async-operations.md` and `web-ui.md` each confirmed they need none of their own. Reason
  phrases matter only on binding routes, where a client prints nothing else (`cpan.md`'s
  finding, consequences item 28); on the management API the body is the message, and the reason
  phrase is the standard one.
- **The existence oracle** holds: `auth.md`'s resolved existence-oracle decision (was Q11)
  makes missing and forbidden indistinguishable to a caller without read access, and this API
  answers `not-found` for both, identical in status, body and headers (auth AC17 applies).
- **Idempotency.** A write may carry `Idempotency-Key`. A repeat with the same key and payload
  within the operation retention window returns the original response with the original
  `Operation`; the same key with a different payload is refused `idempotency-key-reuse` (422);
  a repeat while the first is still running is refused `operation-outstanding` (409). The key is
  stored on the `Operation` record, so nothing new is invented to hold it.
- **Pagination** on every listing: `limit` and an opaque `cursor`, with `Link: rel="next"`.
- **Refused on a `remote` or `virtual` repository.** Every content operation and every publish
  is hosted-only and answers 405 with `repository-type`, the status the format specs adopted
  for their bindings (`chef.md`, `conan.md`, `cran.md`, `swift.md`, `cpan.md`, `composer.md`,
  `puppet.md`, `openvsx.md`, `luarocks.md`), so a binding and the endpoint answer identically
  (the resolved remote-refusal decision, was Q10). A proxied repository's removals, yanks and
  deprecations arrive from its upstream through `proxy-cache.md`'s removal table, never from
  here; the one write-shaped action a `remote` accepts is the cache refresh below, which is
  itself refused `repository-type` on a `local` or `virtual`.
- **Refused on a `read_only` repository.** Every completed write, content operation, pointer
  write or retention pass included, answers 405 with `read-only`, through the API and every
  binding alike, because the sole write-transaction constructor consults
  `repository.Writable` (`repository-lifecycle.md` AC9, AC10); configuration changes, and the
  thaw that restores writes, are still accepted.

### The endpoint table

Every route under `/api/v1`, its authorization and the spec whose semantics it carries. This
table, the closed problem-type list above, the kind table below and the OpenAPI document are one
contract: a route a sibling spec assigns to this surface appears here exactly once, AC25's
generation test fails when the route table and this document disagree, and a route absent from
this table is a spec change, never a mount. `{name}` is a repository name
(`repository-lifecycle.md`'s grammar); `{package}`, `{version}` and `{file}` are the handler's
canonical coordinates percent-encoded as one segment each; `{id}` is an unguessable wire id.
"Originating" means the authorization the originating write was granted under
(`data-model.md`, "Operations").

| Route | Authorization | What it does, and whose semantics |
|---|---|---|
| `GET /api/v1/session` | any caller, including anonymous | The caller's principal, kind, admin flag and grants; an anonymous caller receives `principal_kind: anonymous` and no grants (`web-ui.md`, `auth.md` AC22) |
| `GET /api/v1/formats` | any caller | Registered formats with `Capabilities()` (proxy, `Virtual`, `Rename`), declared operation kinds and bindings, and the surface declaration (`format-handler-interface.md`, `web-ui.md`) |
| `GET /api/v1/search?q=` | any caller | Package names across the repositories the caller may read, grouped by repository; a caller with no readable repository gets an empty page, never a refusal, so the route is oracle-safe (`data-model.md` AC42's index; the resolved cross-format search decision of `web-ui.md`, was its Q6) |
| `GET /api/v1/repositories` | any caller | Live repositories the caller may read, with identity, format, type, visibility and state; `?state=deleted` is admin-only and lists tombstones by identity (the resolved deleted-listing decision, was Q11) |
| `POST /api/v1/repositories` | admin | Create (`repository-lifecycle.md`, "Creation"); a `remote`'s upstream runs `upstream.Validate`; `settings` dispatch as `configure`; the response carries the `rep_` identity |
| `GET /api/v1/repositories/{name}` | `pull` | The repository with its identity, state, type-specific configuration and, for a `remote`, its upstream (credential by name only) |
| `PATCH /api/v1/repositories/{name}` | admin | Configuration (`repository-lifecycle.md`, "Configuration"): visibility, retention, members, upstream (validated), `settings` as `configure`; format and type refused `validation` |
| `DELETE /api/v1/repositories/{name}` | admin | Body `confirm` (the identity, required), `detach` (default false), `reclaim` (`now` or absent); refused `validation`, `in-use` (`repository-lifecycle.md` AC19, AC18); one `lifecycle` operation |
| `POST /api/v1/repositories/{name}/freeze`, `.../thaw`, `.../rename` | admin | Lifecycle transitions; `rename` takes `to` and is refused `capability-unsupported` where the format declares `Rename: unsupported`; each one `lifecycle` operation (`repository-lifecycle.md`) |
| `POST /api/v1/repositories/{name}/refresh` | `push`, object none; `remote` only | Cache refresh: marks every cached metadata document of the remote due for revalidation on its next request; one `refresh` operation (`proxy-cache.md`'s resolved metadata-TTL decision; the resolved refresh-action decision, was Q12) |
| `GET /api/v1/repositories/{name}/packages`, `.../packages/{package}`, `.../packages/{package}/versions`, `.../versions/{version}`, `.../versions/{version}/files` | `pull` | Content reads as the core models them, with withdrawn state, retirement, references and per-file digests; a version read carries its verdicts and refusal records inline |
| `POST /api/v1/repositories/{name}/operations` | the kind's action on every object `Authorize` reports | The content operation: `kind`, `target`, `args` (the resolved wire-shape decision, was Q4); 201 with a completed `Operation`, or 202 with a `pending` one and `Location` |
| `GET /api/v1/repositories/{name}/operations` | `pull` | This repository's operations, filterable by kind, principal, state and time |
| `GET /api/v1/operations` | admin | Registry-wide operations with the same filters |
| `GET /api/v1/operations/{id}` | originating | The poll route; `not-found` to any other caller |
| `POST /api/v1/operations/{id}/cancel` | originating, or admin | Cooperative cancellation (`async-operations.md` AC9); a synchronous or terminal operation answers `conflict` |
| `GET /api/v1/repositories/{name}/retirements` | `pull` | The retirement set, filterable by coordinate prefix |
| `POST /api/v1/repositories/{name}/uploads`, `PATCH .../uploads/{id}`, `PUT .../uploads/{id}?digest=` | `push`, content-addressed object | Upload sessions ("Publish through the API") |
| `POST /api/v1/repositories/{name}/publish` | as the `publish` kind | The multipart convenience form, a binding onto `publish` |
| `GET /api/v1/repositories/{name}/pointers` | `pull` | Pointers with target, write time, reach and out-of-window age |
| `PUT /api/v1/repositories/{name}/pointers/{pointer}` | `push`, object none | Create or repoint; one `repoint` operation |
| `DELETE /api/v1/repositories/{name}/pointers/{pointer}` | `delete`, object none | Delete a named pointer; the default pointer is refused `conflict` |
| `GET /api/v1/repositories/{name}/trust` | `pull` | The trust set and its revision (`artifact-verification.md`) |
| `PUT`, `DELETE /api/v1/repositories/{name}/trust`; `POST .../trust/import` | admin | One revision per `PUT`; keyserver or upstream import (`artifact-verification.md`) |
| `GET /api/v1/repositories/{name}/verdicts`, `.../verdicts/{digest}` | `pull` | Verdicts with state, scheme, identity, reason and revision; the listing filters by `state` and `scheme` (`artifact-verification.md`) |
| `GET /api/v1/repositories/{name}/refusals` | `pull` | Policy refusal records (`supply-chain-policy.md` AC5) |
| `GET /api/v1/repositories/{name}/recipes` | `pull` | The format's client recipes rendered for this repository with `Token` left as a placeholder, plus the raw templates (`web-ui.md`, `internal/surface`) |
| `GET`, `POST /api/v1/repositories/{name}/signing-keys`; `POST .../signing-keys/{id}/activate`, `.../retire`; `POST .../signing-keys/import`; `POST .../signing-keys/{id}/document` | admin | Key listing and the five key operations, each submitted through `Submit` as a `configure` operation whose `Apply` is `internal/signing`'s, with the handler's generator run in the same transaction (`signing-service.md` AC15) |
| `GET`, `POST /api/v1/grants`; `DELETE /api/v1/grants/{id}` | admin | Human grants `(principal, repository, action, pattern)`; the listing filters by `repository` and `principal` (`auth.md` AC28) |
| `GET`, `POST /api/v1/upstream-credentials`; `GET`, `PATCH`, `DELETE /api/v1/upstream-credentials/{name}` | admin | Records of the kinds `upstream-adapters.md` tables (`basic`, `bearer`, `header`, `path-token`, `token-exchange`, `aws-ecr`, `gcp`), each with its per-kind fields; the value is write-only; `PATCH` rotates one row; `DELETE` is refused `in-use` while an `Upstream` or `ReplicationLink` references it (`repository-lifecycle.md` AC20) |
| `GET /api/v1/system/jobs` | admin | The job queue, filterable by kind, state and repository (`async-operations.md` AC21) |
| `POST /api/v1/system/jobs/{id}/cancel` | admin | Cancel a job with or without an `Operation` |
| `POST`, `DELETE /api/v1/system/jobs/kinds/{kind}/pause` | admin | Pause and resume a kind; how the harness holds the Galaxy import (`async-operations.md` AC10) |
| `/api/v1/tokens`, `/api/v1/tokens/{id}`, `.../rotate`, `/api/v1/tokens/exchange`; `/api/v1/robots`, `/api/v1/robots/{name}`, `.../trust`; `/api/v1/keys`, `/api/v1/keys/{name}` | as `credential-management.md`'s route tables state, per route | Contributed by `internal/credential`; every wire convention here applies; listed so AC25 has one table to generate from |

Every administration write above that is not a content operation still leaves an `Operation`
record (kind `lifecycle`, `repoint`, `refresh`, or `configure`) and an audit line, except the
grant, upstream-credential and credential routes, which leave an audit line only (Design,
"Audit").

### The operation vocabulary

The content family is a **closed vocabulary of operation kinds**, closed for the same reason
`conformance-harness.md` closed its `setup` vocabulary: a format that needs a kind not listed
gets it by revising this spec, which puts the need in front of a review instead of letting the
management surface grow one format at a time. Each kind carries one action, and the action
follows the kind, never the format. A format's spec declares which kinds its handler implements
and the object each reports; it never declares an action.

| Kind | Meaning, stated by effect | Action | Retires |
|---|---|---|---|
| `publish` | Adds a version, or files to a version, from committed blobs and a declared coordinate; a batch publish is one write | `push` on every object it adds; a publish naming no coordinate reports none, so only an unpatterned `push` authorizes it | no |
| `attach` | Adds an auxiliary file to an existing version that no coordinate binds and no client verifies as the version's bytes (a Helm provenance file, a Vagrant provider file, Hex docs, a Galaxy detached signature); the handler's `Apply` runs the format's coherence check before anything is referenced (Helm: the `.prov` names the chart coordinate and its `files:` sum equals the archive's; Galaxy: the signature verifies over the stored `MANIFEST.json` through `Deps`' `Verifier`, `artifact-verification.md` AC9) and refuses a mismatch `validation` | `push` on the version | no |
| `detach` | Removes an auxiliary file added by `attach`; the file may be attached again | `push` on the version | no |
| `withdraw` | Marks a version as not for new resolution while its own routes keep serving, so an existing lock or exact pin still installs it: PyPI and Cargo yank, Julia yank, pub retraction, Swift unavailability, Puppet withdrawal, NuGet unlist, conda revocation | `delete` on the version (the resolved withdraw-action decision, was Q1) | no |
| `restore` | Reverses `withdraw` | `delete` on the version | no |
| `annotate` | Changes metadata that excludes nothing from resolution: deprecate and undeprecate (npm, NuGet, Chef, Puppet, Julia, Terraform), discontinue and abandon (pub, Composer), Hex retirement, Hackage preferred versions and metadata revisions, opam metadata revisions, conda record patches and channel notices, CPAN author records | `push` on the object; a repository-wide annotation (conda notices) reports none | no |
| `place` | Adds an existing version to a tree, suite or component without new bytes (Debian copy into suite) | `push` on the version | no |
| `unplace` | Removes a version from one tree, suite or component while other placements keep serving (Debian remove from suite, CRAN delete per tree) | `delete` on the version | no |
| `delete-file` | Removes one file of a version from the head snapshot (PyPI file, Maven file, LuaRocks rock, Homebrew bottle, Vagrant provider file) | `delete` on the file | yes, the file coordinate |
| `delete-version` | Removes a version and every file of it from the head snapshot | `delete` on the version | yes, the version and its files |
| `delete-package` | Removes every version of a package as one write; the `Package` row and its document survive (`data-model.md` AC33) | `delete` on the package | yes, every version |
| `prune` | Removes a computed set of versions or files by a rule the handler evaluates (Maven SNAPSHOT builds, Conan abandoned incomplete revisions) as one write | `delete` on each object removed | yes |
| `rebind` | Changes a binding between an external identity and a package (Swift's repository URL) | `push` on the object it binds to and `delete` on the object it displaces, both required | no |
| `configure` | Changes repository-wide configuration the handler owns and may render into served documents: Debian suite settings, Alpine and Arch architecture sets, key rotation, Open VSX verified namespaces, CPAN ownership transfer, Hackage's offline root | admin role | no |

The action rule that produces this table, applied to every row and to every future kind:
**an operation that takes something away from resolution requires `delete`; an operation that
adds content or changes what is said about content requires `push`; an operation that changes
what the repository is requires the admin role.** `withdraw` sits on the `delete` side because
its whole purpose is to take a version out of new resolutions, which is what `auth.md`'s
"removal-class" already says of yank; `annotate` sits on the `push` side because a deprecated
or retired-with-warning version is still selected. The rule is stated by effect so that a new
format places its operation by what its client does afterwards, which the harness can observe,
rather than by what the ecosystem's own permission model happens to allow.

An operation may report **several (object, action) pairs**, and all must pass: a batch publish
is authorized only if every object it adds is in pattern (`alpine.md`, `arch.md`, `rpm.md`),
and `rebind` needs both of its objects. A single refusal refuses the whole operation and
creates nothing.

Four further kinds belong to the administration and pointer families rather than to the content
vocabulary, never reach a handler's `Apply` through the operations endpoint, and exist so that
every `Operation` record names what happened in one closed set: `repoint` (pointer create or
move), `lifecycle` (create, freeze, thaw, rename, delete, each carrying its sub-kind and the
repository identity; `repository-lifecycle.md`), `refresh` (a `remote`'s cache refresh, was Q12)
and `configure` when it arrives through a repository route rather than the operations endpoint
(a `settings` change on create or `PATCH`, a rename's `{"rename": {"from", "to"}}` args, a
signing-key operation). `data-model.md`'s `Operation` entity names this set ("Operations").

### Cross-format reconciliation

Every management operation a format spec names, placed on the vocabulary. Where this table
disagrees with a format spec's adopted action, the format spec's record said its mapping was an
input to this reconciliation and not a decision over it (`nuget.md` and `conda.md` say so in
those words), the disagreement is decided by the resolved withdraw-action decision (was Q1), and
the format spec's change is a sibling consequence of this spec.

| Format | Operation as the format names it | Kind | Action | Binding |
|---|---|---|---|---|
| PyPI | yank, unyank (file or release, optional reason) | `withdraw`, `restore` | `delete` | none |
| PyPI | delete file, delete release | `delete-file`, `delete-version` | `delete` | none |
| npm | unpublish version, unpublish package | `delete-version`, `delete-package` | `delete` | the `-rev` routes |
| npm | deprecate, undeprecate | `annotate` | `push` | the deprecate `PUT` |
| Galaxy | delete version, delete collection | `delete-version`, `delete-package` | `delete` | none (Galaxy NG's routes not served) |
| Galaxy | attach signature (verified over `MANIFEST.json` before storage, refused `validation`; `artifact-verification.md`'s resolved Galaxy-signatures decision, was its Q6) | `attach` | `push` | none |
| Cargo | yank, unyank | `withdraw`, `restore` | `delete` | `DELETE .../yank`, `PUT .../unyank` |
| NuGet | unlist, relist | `withdraw`, `restore` | `delete` (was `push` in `nuget.md`) | `DELETE {PackagePublish}/{ID}/{VERSION}`, the documented `POST` relist |
| NuGet | hard delete | `delete-version` | `delete` | none |
| NuGet | deprecate, undeprecate | `annotate` | `push` | none |
| Helm | delete chart version | `delete-version` | `delete` | none (ChartMuseum's route not served) |
| Helm | attach provenance (coherence-checked against the archive; refused `conflict` when one exists) | `attach` | `push` | none |
| pub | retract, un-retract | `withdraw`, `restore` | `delete` | none (pub.dev's `options` routes not served) |
| pub | discontinue, set or clear `replacedBy` | `annotate` | `push` | none |
| Go modules | delete version (410 afterwards) | `delete-version` | `delete` | none |
| Swift | mark unavailable, restore | `withdraw`, `restore` | `delete` | none |
| Swift | delete release (410 problem afterwards) | `delete-version` | `delete` | none |
| Swift | rebind repository URL | `rebind` | `push` and `delete` | none |
| CRAN | publish into tree | `publish` | `push` | none |
| CRAN | delete version (optionally per tree), delete package | `delete-version` or `unplace`, `delete-package` | `delete` | none |
| conda | publish | `publish` | `push` | the two publish bindings `conda.md` records |
| conda | patch record, set or clear notices | `annotate` | `push` | none |
| conda | revoke, unrevoke | `withdraw`, `restore` | `delete` (was `push` in `conda.md`) | none |
| conda | remove file | `delete-file` | `delete` | none |
| Composer | publish, republish branch | `publish` | `push` | none |
| Composer | delete version, delete package | `delete-version`, `delete-package` | `delete` | none |
| Composer | mark abandoned, clear | `annotate` | `push` | none |
| CPAN | publish (author and filename before the bytes) | `publish` | `push` | `POST pause/authenquery` |
| CPAN | delete | `delete-version` | `delete` | none |
| CPAN | author record | `annotate` (object `{AUTHOR}`) | `push` | none |
| CPAN | ownership transfer, key rotation | `configure` | admin | none |
| Maven | delete version, delete file | `delete-version`, `delete-file` | `delete` | none |
| Maven | prune SNAPSHOT builds | `prune` | `delete` | none |
| Hex | retire, unretire | `annotate` | `push` | `POST`/`DELETE .../retire` |
| Hex | revert | `delete-version` | `delete` | `DELETE .../releases/{version}` |
| Hex | delete docs | `detach` | `push` | `DELETE .../docs` |
| Julia | publish (source tree, artifacts) | `publish` | `push` | none |
| Julia | yank, unyank | `withdraw`, `restore` | `delete` | none |
| Julia | deprecate, undeprecate | `annotate` | `push` | none |
| Julia | delete version, delete package | `delete-version`, `delete-package` | `delete` | none |
| Hackage | publish | `publish` | `push` | `POST upload` |
| Hackage | revise metadata, set preferred versions | `annotate` | `push` | none |
| Hackage | delete | `delete-version` | `delete` | none |
| Hackage | key rotation, offline root | `configure` | admin | none |
| Chef | remove cookbook, remove version | `delete-package`, `delete-version` | `delete` | the two Supermarket `DELETE` routes |
| Chef | deprecate, undeprecate | `annotate` | `push` | none |
| Conan | the five removes | `delete-version`, `delete-package`, `prune` (per `conan.md`'s table) | `delete` | the client's `DELETE` routes |
| Conan | drop abandoned incomplete revisions | `prune` | `delete` | none |
| Puppet | publish | `publish` | `push` | `POST /v3/releases` |
| Puppet | deprecate, undeprecate | `annotate` | `push` | `PATCH /v3/modules/{slug}` |
| Puppet | withdraw, restore | `withdraw`, `restore` | `delete` | `DELETE /v3/releases/{slug}` |
| Puppet | delete module (soft), hard-delete release | `withdraw` of every release, `delete-version` | `delete` | `DELETE /v3/modules/{slug}` |
| Debian | publish binary or source | `publish` | `push` | dput's HTTP upload |
| Debian | copy into suite | `place` | `push` | none |
| Debian | remove from suite, delete version | `unplace`, `delete-version` | `delete` | none |
| Debian | suite configuration, key rotation | `configure` | admin | none |
| RPM, Alpine, Arch | batch publish (one write) | `publish` | `push` on every object | none |
| RPM, Alpine, Arch | delete version, delete package | `delete-version`, `delete-package` | `delete` | none |
| RPM | advisory, comps and module operations | `annotate` (object none) | `push` | none |
| RPM, Alpine, Arch | architecture set, key rotation | `configure` | admin | none |
| LuaRocks | remove version, remove package, remove one rock | `delete-version`, `delete-package`, `delete-file` | `delete` | none |
| Open VSX | remove packages (version and target lists), remove extension | `delete-version`, `delete-package` | `delete` | `ovsx unpublish` |
| Open VSX | declare or withdraw verified namespace | `configure` | admin | none |
| opam | publish, revise opam file | `publish`, `annotate` | `push` | none |
| opam | delete | `delete-version` | `delete` | none |
| Terraform | publish module or provider (all platforms) | `publish` | `push` | none |
| Terraform | delete version, delete package, deprecate | `delete-version`, `delete-package`, `annotate` | `delete`, `delete`, `push` | none |
| Homebrew | publish bottle (archive plus its record) | `publish` | `push` | none |
| Homebrew | delete (per file) | `delete-file` | `delete` | none |
| Vagrant | publish version, add provider file, set default architecture | `publish`, `attach`, `annotate` | `push` | none |
| Vagrant | delete provider file, delete version, delete box | `delete-file`, `delete-version`, `delete-package` | `delete` | none |
| generic | delete artifact | `delete-file` | `delete` | the format's own `DELETE`, which its spec already serves |

Cargo's owners mutations are not management operations: `cargo.md` refuses them before scope
evaluation (its resolved owners decision), so there is nothing to bind.

### Bindings: one operation, two ways in

A **binding** is a route a handler serves whose entire behaviour is to translate its wire
into an operation of this API and the operation's outcome back into the wire's response. The
rule for when a route may be one, drawn from the format specs' own decisions:

- The route is one a real client in the conformance matrix drives (`npm unpublish`,
  `cargo yank`, `dotnet nuget delete`, `ovsx unpublish`, `mix hex.retire`, `knife supermarket
  unshare`, `conan remove`, dput, cpan-upload), **or** a route of the ecosystem's published
  reference API that the format's spec records binding with its reason (NuGet's documented
  relist, Puppet's Forge routes, Conan's reference-server routes). A route no client drives and
  no reference API documents is never a binding; it would be a per-format management surface
  with nothing but `curl` behind it, which is what `helm.md` and `pub.md` refused.
- A binding **has no behaviour of its own**: no authorization rule, no write, no validation
  beyond parsing the wire. Its `Scope(r)` reports exactly the operation's object and action, and
  the handler's route implementation constructs the operation value and submits it through the
  same entry point the API uses. `nuget.md` AC19's twin-package case is the model: one version
  unlisted through the endpoint and one through the real client, and the served documents
  compared.
- Bindings are declared, not discovered. The optional interface below lists them, so the
  architecture test in "Mechanical enforcers" can verify, for every declared binding, that the
  route's `Scope(r)` equals the operation's scope, and that submitting the operation through the
  binding and through the API produces the same snapshot delta.

### Dispatch: the optional `Operator` interface

The pinned interface has five methods and a handler is otherwise an `http.Handler`
(`format-handler-interface.md`, "The pinned method set"). A management operation does not
arrive on the handler's routes, yet only the handler knows how to change its own documents,
regenerate its index in the same write (`helm.md`'s requirement) and report the canonical
object an operation addresses. The resolved dispatch decision (was Q2) answers this with an
**optional interface discovered by type assertion**, the idiom `io.WriterTo` and
`http.Flusher` use, rather than a sixth pinned method:

- `internal/format` declares the shared value types beside `Deps` and the typed policy
  refusal: `Operation` (repository, kind, target coordinate as the handler's canonical string
  plus the structured package, version and file names the core can index, an opaque `args`
  JSON document the core never parses, the reason text, the declared blob digests for a
  publish) and `Outcome` (the coordinates to retire, the objects and actions the operation
  addressed, and a result document the handler writes for the `Operation` record). Values, not
  interfaces: the core stores and logs them, and a handler needs nothing from them but fields.
- `internal/manage` declares the **consumer-side interface** where it is used, in the Go
  skill's sense, and asserts it at registration:

  `Operations() []format.Kind`, the kinds the handler implements;
  `Bindings() []format.Binding`, each a route pattern and the kind it binds onto;
  `Authorize(ctx, op) ([]format.Scope, error)`, the (object, action) pairs an operation
  addresses, which may read committed blobs the operation names (a batch publish reports each
  file's coordinate from a bounded peek at the archive);
  `Apply(ctx, tx, op) (format.Outcome, error)`, the operation's effect inside the write
  transaction the core opened, through the same metadata-store and reference-creation calls a
  publish uses.

  Four methods, one capability, discovered at the point of use; a handler with no management
  operations (a proxied-only format, or one whose every write is on its own wire) implements
  none of it and registration records that it declares no kinds.
- The core's side is one function, `Submit`, that every entry point calls: the API route, and
  every binding through `Deps`. `Submit` resolves the repository and refuses the type, checks
  the idempotency key, asks `Authorize` and evaluates every pair through the central authorizer,
  checks the retirement set for a publish, opens the write transaction, calls `Apply`, records
  the retirements and the `Operation`, commits the snapshot, and emits the audit line; a refusal
  or an error at any step before commit leaves no snapshot, no retirement and no `Operation`
  record other than a `failed` one for a handler-side refusal after authorization.
- **What this feeds the re-open.** Whether the four methods should fold into the pin is a
  question for `format-handler-interface.md`'s scheduled re-open. That spec has recorded this
  answer: `Operator` is one of three optional interfaces discovered at registration, beside
  `signing-service.md`'s `Indexer` and `web-ui.md`'s `surface.Declarer` (its "Optional
  interfaces discovered at registration" and its resolved optional-interfaces decision, was its
  Q10), and its re-open inputs name the three together with `async-operations.md`'s finding that
  a runner reaches a handler only through `Apply`. What remains for this spec to bring is the
  evidence: generic's `delete-file` and the write-triggered prototype's Debian-shaped `publish`
  and `configure`, both built on the interface before any Tier 1 handler (AC27).
- **What it rejects.** A sixth pinned method (amends the pin outside the re-open, for a
  capability half the handlers lack); dispatching over `ServeHTTP` with a synthetic request
  (hides the contract in a URL grammar and makes the object reporting a string parse); and a
  handler registering callbacks into the core at construction (inverts the dependency the pin
  fixed: a handler holds no capability it was not handed).

### Every operation is one completed logical write

The rules every format spec restated, stated once and held mechanically:

- **One operation, one snapshot.** `Submit` opens one write transaction and `Apply` runs inside
  it; the snapshot commits with the `Operation` record's terminal transition (`data-model.md`
  AC32's atomicity). A batch publish, a package deletion however many versions it removes, a
  conda `patch_instructions.json` import, a Maven SNAPSHOT prune and a Debian suite copy are
  each one write, per the bulk-operation rule `data-model.md` states and `generic.md` first
  applied.
- **A refused operation leaves nothing**: no snapshot, no partial document, no retirement, no
  pointer move. Refusal before `Apply` (authentication, authorization, repository type, retired
  coordinate, idempotency conflict, unknown kind) is a problem response and an audit line only.
  A handler-side refusal inside `Apply` (an archive whose `DESCRIPTION` disagrees with the
  declared coordinate, a provenance file where one exists) rolls the transaction back, records a
  `failed` `Operation` so the caller can poll it if the operation was deferred, and answers the
  problem the handler returned.
- **No operation deletes a blob-store object.** `delete-*`, `prune`, `unplace` and repository
  deletion end references; the blobs return through snapshot pruning and the sweep
  (`storage-and-gc.md` AC11, AC14), and AC15's architecture test, which scans the whole module
  for object-delete call sites, holds `internal/manage` to it without a second test. The
  accepted cost is the one `data-model.md` already accepts: a deletion frees space after the
  retention window, not at once.
- **Hosted only.** `local` repositories only; a `remote` or `virtual` target answers 405 before
  authorization is consulted, which is safe because the refusal reveals only the repository's
  type, and the existence oracle still applies to a repository the caller cannot read.
- **Deferred operations.** A handler declares, per kind, whether `Apply` runs inline or is
  deferred; the API answers 201 with a completed `Operation` for the former and 202 with a
  `pending` one and a `Location` for the latter. Deferred execution, workers, leases, retries
  and the cancellation mechanics belong to `async-operations.md`: a deferred `Submit` enqueues
  one `manage.apply` job in the transaction that inserts the `pending` `Operation`, and the
  runner reaches the handler only through `Apply`. This spec fixes the wire: the deferred path
  commits the same way (one snapshot, atomic with the terminal transition); the terminal states
  are `completed`, `failed` and `cancelled`, the third arriving with `async-operations.md`'s
  cooperative cancellation (its resolved cancellation decision, was its Q5) and admitted by
  `data-model.md` AC32; the poll route `GET /api/v1/operations/{id}` requires the authorization
  the originating write was granted under (`data-model.md`, "Operations"); `POST
  /api/v1/operations/{id}/cancel` takes the same authorization or the admin role, ends a
  `pending` operation `cancelled` and asks a running one to stop at its next checkpoint, so it
  ends either `completed` with its full effect or `cancelled` with none; and
  `operation-outstanding` on an `Idempotency-Key` repeat means exactly "the first request's job
  is not terminal". The admin's view of the queue is the `/api/v1/system/jobs` routes in the
  endpoint table (list, cancel, pause and resume a kind), each an audit line and each in the
  OpenAPI document. Galaxy's import task and the write-triggered prototype's asynchronous half
  are `Operation` records too, so one poll route serves every deferred write.

### Retirement is core-held

Twenty format specs require that a deleted coordinate is **never reusable** for the life of the
repository, and `data-model.md` AC33 obliges this surface to preserve the retirement set across
a backwards repoint. The resolved retirement-placement decision (was Q3) moves the set out of
the package-level metadata document, where the Cluster 5 specs first put it, into a core-held
record outside snapshot content:

- A `Retirement` record is (repository, format, coordinate string as the handler's canonical
  addressed object, retired-at time, retiring operation). It is written in the same transaction
  as the operation that retires, it is **not** snapshot content, it is never a GC mark root (it
  names no blob), and unlike an `Operation` it is never pruned. `data-model.md` owns it (its
  entity table, "A package outlives its versions" and AC35, which asserts the same-transaction
  write, absence from snapshots, survival across pruning and refusal through the shared write
  path); this spec added no entity by fiat.
- **Refusal is central.** The shared write path refuses any write whose addressed object, or
  any object the handler reports for it, is retired in that repository, with `retired` (409)
  naming the coordinate. That covers a handler's own publish route (the object `Scope(r)`
  reports) and a `publish` operation (the objects `Authorize` reports) with one check, and no
  handler carries the set forward, renders it, or remembers it across a repoint, because a
  repoint touches snapshot content and the set is not snapshot content. The trap
  `data-model.md` named, a pointer moved backwards restoring a package document that predates
  a retirement, cannot occur.
- The `Package` row's survival ("A package outlives its versions") remains required, because a
  package with no versions is still addressable and its document still carries format state
  (npm dist-tags, Galaxy's namespace record); it is no longer what keeps a coordinate retired.
- Granularity is the handler's: PyPI retires filenames, Maven retires file coordinates, npm
  retires `name@version`, LuaRocks retires the version but not one rock's architecture. The
  handler returns the coordinates to retire in `Outcome`, and the kind table says which kinds
  retire at all (`withdraw` never does, which is the point of it).
- Retirements are readable (`GET .../retirements`, `pull`) so a publisher refused with `retired`
  can see why, and seedable through the harness's `state` vocabulary so an effect case can start
  from a retired coordinate without running the deletion first.

### Publish through the API

For the formats whose ecosystem has no publish protocol, publish is this API's, and for the
others the API publish is the second way in beside the client's own wire. The shape is fixed by
`vagrant.md`'s scale finding (box files of several gigabytes, so the body must stream and
resume) and by the declared-coordinate rule `cran.md` and `julia.md` adopted:

1. **Upload sessions**, `data-model.md`'s one definition of a session: `POST
   /api/v1/repositories/{repo}/uploads` opens a session for one blob; `PATCH` appends a chunk
   with `Content-Range`; `PUT ...?digest=` commits the verified digest. The bytes stream into
   the CAS, the digest is computed in the stream, the session belongs to the repository and
   expires under the model's idle period and cap (its AC26), and the commit is authorized
   `push` with a content-addressed object, exactly as OCI's chunked upload is. One
   implementation in the storage layer serves both wires.
2. **The publish operation** names committed digests, a declared coordinate (package, version
   and, where the format needs it, the tree, suite and component, author, or target), and the
   format's `args` document. The handler peeks the committed blobs to confirm the declaration
   (a `DESCRIPTION`, a `.PKGINFO`, a `control` member, a `Project.toml`), reports the objects,
   and refuses a disagreement with `validation` (422) before anything is referenced. A publish
   naming no coordinate reports the object none, so only an unpatterned `push` authorizes it,
   which is `cran.md`'s and `julia.md`'s rule generalised. A committed-but-unreferenced blob
   that a refused publish leaves behind is the orphan `storage-and-gc.md` AC3 already collects.
3. **The multipart convenience form**, `POST .../publish` with the files and the declaration in
   one request, bounded by the configured spool limit, is a binding onto the same operation:
   the server opens the sessions, commits the parts and submits the operation, and nothing about
   the operation differs.

A batch publish carries several files for one write, and every object must be authorized
(`alpine.md`, `arch.md`, `rpm.md`); `terraform.md`'s all-platforms rule and `julia.md`'s
artifacts-with-the-version rule are both "one publish, several files". The publish response
carries what the format specs asked for: the objects created, the per-file digest and served
path (`homebrew.md`'s `root_url`, filename and SHA-256; `cpan.md`'s list of packages not indexed
with the reason for each) in the `Operation` result document the handler writes.

### Repository administration

The management surface core the charter builds at step 2, admin-only throughout. The semantics
of a repository's life are `repository-lifecycle.md`'s (its Phases 1 and 2 are the repository
half of the core); this section fixes the routes, the request fields and the refusals, and cites
that spec for what each does:

- **Identity and state.** Every repository has a core-generated 128-bit identity rendered with
  the `rep_` marker; the name in the path is the label it currently wears. Every response that
  returns a repository carries the identity, and every record that names a repository (grant,
  token scope, member, link, job, retirement) binds the identity, so a deleted-and-recreated
  name inherits nothing (`repository-lifecycle.md`, "Identity and naming", AC3). A repository is
  `active`, `read_only` or `deleted`; the transitions are the lifecycle routes below, each an
  `Operation` of kind `lifecycle` with its sub-kind.
- **Create** a repository: name (the lifecycle grammar; a reserved segment or an existing live
  name is refused `validation` or `conflict`), format, type (`local`, `remote`, `virtual`),
  visibility, retention rules as `data-model.md` AC28 shapes them, and for a `remote` its
  upstream (URL, adapter, hosts, download policy, credential reference), validated by
  `upstream.Validate` inside the creation transaction and refused `upstream-invalid` with the
  rule named (`upstream-adapters.md` AC23; an unreachable but well-formed upstream is accepted);
  for a `virtual` its ordered members by identity, refused `capability-unsupported` when the
  format declares `Virtual: unsupported`; and a format-specific `settings` document the handler
  validates through `Authorize` and `Apply` with kind `configure`. Creation gives every type its
  default pointer on an empty initial snapshot, so name-addressed serving resolves from the
  first request (`repository-lifecycle.md`, "Creation"; `data-model.md`'s pointer rule).
- **Update** by `PATCH`. A visibility change is configuration; a retention-rule change is
  configuration that the next retention pass reads (`generic.md`); a change of a `remote`'s
  upstream runs `upstream.Validate` again, keeps cached references and resets their
  `last-checked` (`upstream-adapters.md`); a `settings` change goes through the handler as a
  `configure` operation and is a completed write when it changes served documents (Debian's
  `Release`), because otherwise the change is invisible. Changing a repository's format or type
  is refused `validation`: the content is the format's, and a `remote` becoming `local` is
  `replication.md`'s freeze, not a flag flip.
- **Freeze, thaw, rename.** `POST .../freeze` moves `active` to `read_only`, under which every
  completed write is refused `read-only` while reads, configuration and thaw stay available;
  `POST .../thaw` reverses it; `POST .../rename` with `to` changes the label only, is refused
  `capability-unsupported` where the format declares `Rename: unsupported` (Hex), and hands a
  handler that implements `Operator` a `configure` with `{"rename": {"from", "to"}}` inside the
  rename transaction (`repository-lifecycle.md`, "Rename" and "Read-only").
- **Delete** a repository: the request carries `confirm`, the repository's identity, and is
  refused `validation` when it does not match the identity currently under that name, so a
  script written against a deleted-and-recreated name deletes nothing (lifecycle AC19). A
  member of a `virtual` is refused `in-use` naming each such repository unless `detach: true`,
  which removes the memberships in the same transaction (lifecycle AC18). Then its named
  pointers are deleted and its default pointer released, which releases the fifth mark root
  (`storage-and-gc.md` AC18), a `local`'s head is ended as one final empty checkpoint snapshot,
  the repository is marked `deleted` so its name is free and its content answers `not-found`,
  and its snapshots age out under its retention window until the pruner drops the last and
  leaves the tombstone (`storage-and-gc.md` AC24). The request may set `reclaim: now`, which
  sets the deleted repository's effective retention window to zero so the next pruning cycle
  drops every snapshot; still through the pruner and the sweep, never a direct delete (the
  resolved repository-deletion decision, was Q7; `storage-and-gc.md` AC15 holds
  `internal/repository` and `internal/manage` to it). Deleting a repository never deletes
  another repository's blobs, because blobs are shared and the sweep marks from every root.
  Tombstones are listed by identity under `GET /api/v1/repositories?state=deleted` (admin), so
  the live listing is never polluted (the resolved deleted-listing decision, was Q11).
- **Trust set and verdicts.** `GET`, `PUT` and `DELETE .../trust` and `POST .../trust/import`
  administer the repository's trust set as one revision per `PUT`; `GET .../verdicts` and
  `.../verdicts/{digest}` read verdicts. The semantics, the trust-set shape and the re-evaluation
  a revision triggers are `artifact-verification.md`'s; the trust writes are admin, the reads
  `pull`, and no problem type beyond `validation`, `not-found` and `conflict` is needed.
- **Signing keys.** The `.../signing-keys` routes create, activate, retire and import keys and
  submit an externally signed document, each a `configure` operation submitted through `Submit`
  whose `Apply` is `internal/signing`'s, with the handler's generator run in the same
  transaction so a rotation's re-signed documents land in the same snapshot
  (`signing-service.md`, "Key operations arrive as `configure` operations", AC15). The listing
  shows purpose, algorithm, state, backend kind and public forms with fingerprints, never a
  URI's secret parts.
- **Cache refresh.** `POST .../refresh` on a `remote` marks every cached metadata document due
  for revalidation on its next request, so an operator who knows the upstream changed does not
  wait out the metadata TTL (`proxy-cache.md`'s resolved metadata-TTL decision names "an explicit
  refresh now action in both UI and API"). It creates no snapshot, fetches nothing itself, is
  refused `repository-type` on a `local` or `virtual` and `read-only` on a frozen remote, and
  leaves an `Operation` of kind `refresh` (the resolved refresh-action decision, was Q12).
- **Upstream credentials**: create, rotate (`PATCH`) and delete records in the
  upstream-credential store `data-model.md` names (`UpstreamCredential`), each of a `kind` from
  `upstream-adapters.md`'s credential table with that kind's fields; the value is write-only and
  never returned, a listing shows name, kind and last rotation, rotating one touches one row
  (`data-model.md` AC14), and deleting one still referenced by an `Upstream` or a
  `ReplicationLink` is refused `in-use` naming each dependant, because a remote without its
  credential has no sensible state to be left in (`repository-lifecycle.md` AC20). These are
  secrets the registry presents to upstreams, not registry tokens, which is why they are here
  and not in `credential-management.md`.
- **Human grants** in `auth.md`'s vocabulary, `(principal, repository, action)` with an optional
  pattern: create, list, revoke. The admin alone does this (auth AC28), the grant binds the
  repository's identity so it dies with the repository, and every change is an audit line. No
  role vocabulary exists to administer.
- **Jobs.** `GET /api/v1/system/jobs`, `POST .../jobs/{id}/cancel` and the per-kind pause and
  resume routes expose `async-operations.md`'s queue to the admin; their semantics are that
  spec's (AC9, AC10, AC21) and their wire is this one's.

### Pointer management

`data-model.md` exposes pointers as the promotion surface and this spec is its HTTP home:
`GET .../pointers` lists each pointer with its target snapshot number, the target's write time
and how far back rollback reaches, and flags a pointer whose target is outside the retention
window with how far past it has aged (`storage-and-gc.md` AC11, AC19); `PUT .../pointers/{name}`
creates a named pointer or repoints it, the target given either as another pointer's name
(promotion: "make `prod` serve what `staging` serves") or as a snapshot number from the
listing (rollback), and is refused `out-of-reach` (409) with the reach when the target is an
untargeted snapshot outside the window (`data-model.md` AC23); `DELETE .../pointers/{name}`
deletes a named pointer and is refused for the default pointer. Creating and repointing require
`push` on the repository, deleting `delete`, both with the object none, so only an unpatterned
grant promotes (the resolved pointer-action decision, was Q6). A repoint is not a snapshot and
never was; it emits an `Operation` record of kind `repoint` for the audit trail all the same,
because "who promoted what to production and when" is the first question an operator asks.

The cross-cutting freshness theme in `agents/spec-loop/consequences.md` (seven formats whose
clients ignore an index older than the one they hold) means a repoint must also advance the
pointer's forward-moving freshness signal; that mechanism is `data-model.md`'s to define and
this spec requires only that a repoint through this API triggers it, which the formats' rollback
cases will observe.

### Audit: the `Operation` record and the audit line

Every management operation is recorded twice, on purpose, because the two records answer
different questions and have different lifetimes (the resolved audit-record decision, was Q5):

- **The `Operation` record** (`data-model.md`, "Operations") is the durable, queryable,
  authorization-bound record of every operation that got past authorization: kind, repository,
  target, initiating principal, authorizing scope, state, times, result document, produced
  snapshot, idempotency key and request id. Synchronous operations create it `pending` and
  complete it in the same request; `data-model.md` now frames the entity as the record of
  **every** management operation, not asynchronous work only ("Operations", its widened AC32
  with the three terminal states). It is listable per repository (`pull`) and registry-wide
  (admin), filterable by kind, principal, state and time, and it is pruned after the configured
  window, 90 days by default. A refused request creates none: an unauthenticated caller must not
  be able to fill the table.
- **The audit line** is a record on `observability.md`'s audit channel, emitted through
  `telemetry.Auditor.Emit`, the channel's only writer, with the fixed attribute set that spec
  fixes (`event`, `request_id`, `trace_id`, `operation_id` when one exists, `principal` and
  `principal_kind`, `client_address`, `repository` and `repository_id`, `format`, `kind`,
  `objects`, `outcome` as `completed`, `failed` or `refused`, `problem_type` on a refusal,
  `snapshot` on a completion). The events this surface emits are registered in the channel's
  closed vocabulary: `manage.operation` (every content operation and every binding, with `kind`
  and `idempotency_replay`), `manage.operation.cancel`, `manage.grant.create` and `.delete`,
  `manage.upstream_credential.create`, `.update` and `.delete`, `manage.upstream.create`,
  `.update` and `.delete`, `manage.trust.update` and `.import`; the lifecycle, signing-key,
  credential and job events are registered by their owning specs. One line is emitted for
  **every** request to this API and every binding, refused or not. It is what ships to a SIEM, it
  survives the `Operation` prune, and it never carries a credential, which `auth.md` AC7's leak
  scan already polices for every log line. The two records share `request_id`, so either leads to
  the other while both exist.
- **What leaves an audit line only.** Human grants and upstream credentials touch no repository
  content and leave no `Operation`; `credential-management.md` follows the same precedent for
  tokens, robots and keys (its resolved audit-shape decision, was its Q5), where the retained
  credential row is the queryable history an `Operation` would otherwise be.

### Verification: the trigger is ours, the effect is the client's

The split `docs/internal/analysis/management-surfaces-and-the-oracle.md` draws is a rule here,
stated so no case ever claims more than it proves:

- **The trigger** of every kind is verified by this registry's integration tests in
  `internal/manage`, per kind and per entry point, and by the real client where a binding
  exists. Nothing else vouches for a client-less trigger, and this spec says so rather than
  implying a conformance case covers it.
- **The effect** is verified by the real client in each format's conformance cases, of two
  shapes: a case whose `script` calls the endpoint and then runs the client, and a case whose
  `state` seeds the post-operation state (a retirement record, a withdrawn version's document).
  `setup` never calls this API (`conformance-harness.md`, its resolved seed-path decision, was
  Q5). Every kind a handler declares through `Operations()` must have at least one `script`
  case in that format's case set, validated before the run by the case-set validator, so a
  declared operation with no real-client effect case fails the suite rather than sitting in the
  matrix untested; that validator rule is a sibling consequence for `conformance-harness.md`.
- **The write accounting** is verified where conformance cannot see it: a property test over
  every kind asserting one snapshot per completed operation and none per refused one, with a
  fault injected between authorization and `Apply` and between `Apply` and commit.

### Configuration and the CLI stance

The API is **API-first**: the OpenAPI document is the product surface, the web UI (charter step
9), the harness's `script` and any HTTP client consume it, and no CLI is built in v1 (the
resolved CLI-stance decision, was Q9). The server binary, a Cobra CLI (`cmd/stackweaver-registry`),
gains no management subcommands; its `serve` command mounts the API, and its configuration
follows the cobra-viper skill: a Viper instance created in the root factory, keys unmarshalled
into a typed `manage.Config` the package receives (never Viper itself), every key with a default,
bound to `STACKWEAVER_REGISTRY_` environment variables. The keys this spec adds:

| Key | Default | Meaning |
|---|---|---|
| `management.operation_retention` | `2160h` (90 days) | How long a finished `Operation` record is kept; also the idempotency window |
| `management.publish_spool_limit` | `1GiB` | The largest body the multipart convenience form accepts; larger files use upload sessions |
| `management.upload_chunk_limit` | `256MiB` | The largest single `PATCH` an upload session accepts |
| `management.deferred_threshold` | `10s` | Advisory to handlers choosing inline or deferred per kind; the AIP-151 rule of thumb |

No key enables or disables the API: a registry without its management surface cannot be
administered, and a flag that could turn it off is one misconfiguration from a registry nobody
can fix.

The binary's other subcommands are operational, not management clients, and none writes except
through the shared layers: `seed` (the harness's provisioning path, `conformance-harness.md`
AC18), `migrate` (schema migration, also run at startup), `config` (renders the effective
configuration with secrets redacted), `keys` (master-key operations for the secrets at rest),
`storage check` (`storage-and-gc.md`'s consistency checker) and `version`. `deployment.md` owns
that command tree and its enforcer table holds each to the shared layers; no subcommand issues a
management operation, mints a token (the first mint is a `curl`, `credential-management.md`) or
touches a repository's content.

### Mechanical enforcers

Each boundary this spec introduces, with the test that holds it, per the constitution's rule
that a boundary enforced only by review is not enforced:

| Boundary | Enforcer |
|---|---|
| Every management route is mounted under the reserved `api` segment and mapped through the central authorizer; no code in `internal/manage` evaluates authorization itself | `internal/manage/arch_test.go`, the shape `replication.md` AC18 uses |
| No handler package imports `internal/manage`; handlers reach `Submit` only through `Deps` | `internal/manage/arch_test.go` (import graph) |
| For every binding a handler declares, the route's `Scope(r)` equals the operation's `Authorize` result, and submitting through the binding and through the API yields the same snapshot delta | `internal/manage/binding_test.go`, table-driven over every registered handler's `Bindings()` |
| One operation, one snapshot; a refused operation, none | `internal/manage/accounting_test.go`, property test with fault injection |
| No object deletion anywhere in `internal/manage` | `storage-and-gc.md` AC15's architecture test, module-wide |
| A retired coordinate is refused on every write path | `internal/manage/retirement_test.go` (API publish, handler publish route, repoint interleavings) |
| Every declared kind has a `script`-driven conformance case | `conformance/core/case_validate_test.go` (a validator rule `conformance-harness.md` gains) |
| The OpenAPI document matches the route table, including the routes `internal/credential`, `internal/signing`, `internal/repository` and `internal/async` contribute under `/api/v1`, and loses nothing between tags | `internal/manage/openapi/openapi_test.go` |
| Every request to the API or a binding emits exactly one audit line through `telemetry.Auditor.Emit` and every completed one exactly one `Operation` | `internal/manage/audit_test.go` on `telemetry.NewTestRecorder` |
| Every route under `/api/v1`, contributed routes included, refuses a cookie-authenticated unsafe request without a matching CSRF token, and never asks a bearer request for one | `internal/manage/csrf_test.go`, table-driven over the route table |
| Every problem type any route returns is in the closed list, with the status the list fixes | `internal/manage/problem_test.go` (the type table is the Go source of truth; a route returning an unlisted type fails the test) |

## Acceptance Criteria

- [ ] AC1: Every management route is served under `/api/v1/`, `api` is held in
      `format-handler-interface.md`'s reserved list, and registering a handler named `api` or
      claiming a root-anchored mount under `/api/` fails before the server serves any request.
- [ ] AC2: Every management route is mapped to a scope evaluated by the central authorizer and
      no code in `internal/manage` evaluates authorization itself, and no handler package imports
      `internal/manage`, both enforced by an architecture test that fails on a violation.
- [ ] AC3: Every operation kind in the vocabulary is refused with `unauthorized` for a principal
      lacking the kind's action on the addressed object, refused with `not-found`
      indistinguishably in status, body and headers whether the repository is absent or
      unreadable to the caller, and accepted for a principal holding exactly that action, proven
      for `push`-class, `delete`-class and admin-class kinds against pattern-scoped and
      unpatterned grants, and a pattern-scoped grant manages only objects inside its pattern.
- [ ] AC4: An operation reporting several (object, action) pairs is refused whole when any pair
      fails and creates no snapshot, proven with a batch publish carrying one out-of-pattern file
      and with a `rebind` whose displaced object is out of pattern.
- [ ] AC5: Every completed content operation produces exactly one snapshot and advances the
      default pointer, however many versions or files it touches, proven for one kind of each
      class and for a bulk `delete-package`, `prune` and batch `publish`; and every refused
      operation, whether refused before `Apply` or inside it, produces no snapshot, no
      retirement, no partial document and no `Operation` record other than a `failed` one for
      an in-`Apply` refusal, proven with faults injected between authorization and `Apply` and
      between `Apply` and commit.
- [ ] AC6: No code path in `internal/manage` or in any handler's management path deletes an
      object from the blob store; a `delete-version` of the only version referencing a blob
      leaves the object present until the snapshot that held it is pruned and the sweep runs,
      after which it is collected, on an injected clock.
- [ ] AC7: Every content operation and every publish against a `remote` or `virtual`
      repository answers 405 with problem type `repository-type` and creates nothing, identically
      through the API and through every binding.
- [ ] AC8: For every binding every registered handler declares, the route's `Scope(r)` equals
      the operation's `Authorize` result in action and object, and the same operation submitted
      through the binding and through the API produces byte-identical served documents and
      snapshot deltas, proven by a table test that enumerates `Bindings()` of every handler.
- [ ] AC9: The `withdraw` and `restore` kinds require `delete` and the `annotate` kind requires
      `push` for every format that declares them, so a NuGet unlist, a conda revocation, a PyPI
      yank and a Cargo yank are each refused to a principal holding `push` alone and accepted
      under `delete`, while an npm deprecation and a Hex retirement are accepted under `push`;
      no kind in the vocabulary requires an action outside `pull`, `push`, `delete` and the
      admin role.
- [ ] AC10: A handler that declares no management kinds registers successfully and answers
      `unsupported-kind` (404) to every operation; a handler declaring a kind it does not
      implement in `Apply` fails registration.
- [ ] AC11: Every kind in the vocabulary runs end to end on the fixture handler the tests carry
      and the `args` document reaches `Apply` byte-identical and unparsed by the core: a
      `withdraw` leaves the version's own routes serving and its bytes unchanged and a `restore`
      returns it to the head snapshot's resolution set, each as one metadata-only snapshot; an
      `attach` adds a file no coordinate binds and a `detach` removes it so it can be attached
      again, neither retiring anything; a `place` adds a version to a second tree and an
      `unplace` removes it from that tree while the first keeps serving; `annotate` changes a
      document and excludes nothing; `configure` is refused to every non-admin principal; and
      each kind is then proven on the first real handler that declares it.
- [ ] AC12: A coordinate retired by `delete-file`, `delete-version`, `delete-package` or `prune`
      is refused with `retired` on every later write that claims it, through a handler's own
      publish route and through the `publish` operation, for the life of the repository:
      including after every snapshot that ever held the coordinate is pruned, after the default
      pointer is repointed to a snapshot older than the retirement and back, and after the
      package's last version is removed; and the `Retirement` record is never a GC mark root,
      proven by a blob whose only mention is a retirement being collected.
- [ ] AC13: A `publish` operation naming committed digests and a declared coordinate is refused
      with `validation` and references nothing when the handler's peek disagrees with the
      declaration; a publish declaring no coordinate reports the object none and is accepted
      only under an unpatterned `push`; and a committed blob left by a refused publish is
      collected as an orphan once its session expires and grace lapses.
- [ ] AC14: A file larger than the publish spool limit uploads through an upload session in
      chunks, resumes after a dropped connection within the session's idle period, has its
      digest computed in the stream with no whole-body buffering in memory or on local disk,
      commits only on a verified digest, and the subsequent publish operation's latency does not
      scale with the file's size, proven with a multi-gigabyte fixture on an injected clock.
- [ ] AC15: The multipart convenience publish and the session-plus-operation publish of the same
      files and declaration produce byte-identical snapshot deltas and `Operation` result
      documents.
- [ ] AC16: A handler kind declared deferred answers 202 with a `pending` `Operation` and a
      `Location`; polling the operation shows its monotonic state ending in exactly one of
      `completed`, `failed` or `cancelled`; its snapshot reference appears only on `completed`,
      atomically with the snapshot; a `failed` or `cancelled` deferred operation has no snapshot;
      `POST /api/v1/operations/{id}/cancel` under the originating authorization or the admin
      role ends a `pending` operation `cancelled` without it ever running and ends a running one
      either `completed` with its full effect or `cancelled` with none, never a partial effect;
      the same route on a synchronous or terminal operation answers `conflict`; and reading or
      cancelling any operation is refused to a principal lacking the originating write's
      authorization, answering `not-found`.
- [ ] AC17: A write repeated with the same `Idempotency-Key` and payload within the retention
      window returns the original response and `Operation` without a second snapshot; the same
      key with a different payload is refused `idempotency-key-reuse` (422); and a repeat while
      the first is still running is refused `operation-outstanding` (409).
- [ ] AC18: Every refusal is `application/problem+json` with a `type` from the closed list, a
      fixed `title`, a `detail` naming the refused coordinate or reason, and the extension
      members the type defines (the refused coordinates on `retired`, the reach on
      `out-of-reach`, the operation id on a replay, the dependants on `in-use`); the closed list
      is exactly the type table in Design, each type answering the status the table fixes, and
      a route returning a type outside it fails the build; every response carries
      `X-Request-Id`, echoing a request value of 1 to 128 bytes from `[A-Za-z0-9._-]` and
      replacing any other value with a generated id.
- [ ] AC19: Creating a `local`, a `remote` with its upstream and a `virtual` with ordered
      members through the API succeeds for the admin and is refused for every other principal;
      every create and read response carries the repository's `rep_` identity; the created
      repository has a default pointer on an initial snapshot and serves a real client from its
      first request; a `remote` whose upstream `upstream.Validate` refuses is refused
      `upstream-invalid` on create and on `PATCH` with nothing committed while an unreachable
      but well-formed upstream is accepted; a `virtual` of a format declaring `Virtual:
      unsupported` is refused `capability-unsupported`; changing format or type is refused
      `validation`; and a `settings` change the handler renders into a served document produces
      exactly one snapshot while a visibility or retention-rule change produces none.
- [ ] AC20: Deleting a repository requires `confirm` equal to its current identity and is
      refused `validation` otherwise; a member of a `virtual` is refused `in-use` naming each
      such repository unless `detach: true`, which removes the memberships in the same
      transaction; a successful deletion deletes its named pointers, releases its default
      pointer, frees its name for a new repository that inherits no grant (a grant binds the
      identity), leaves its snapshots to age out under its retention window, and with
      `reclaim: now` has every snapshot pruned and every blob no other root reaches collected
      within one cycle; a blob shared with another repository survives in both cases, on an
      injected clock; the tombstone is listed under `GET /api/v1/repositories?state=deleted`
      for the admin alone and never in the live listing; and the semantics of each step are the
      ones `repository-lifecycle.md` AC14 to AC19 assert.
- [ ] AC21: An upstream credential is created with a `kind` from `upstream-adapters.md`'s table
      and that kind's fields, its value is never returned by any read after creation, a
      rotation through `PATCH` changes exactly one row and every `RemoteFile` referencing its
      upstream fetches with the new credential on the next request, deleting it while an
      `Upstream` or a `ReplicationLink` references it is refused `in-use` naming each dependant
      and succeeds once none does, and a human grant created, listed and revoked through the API
      is enforced on the next request and is administrable by the admin alone.
- [ ] AC22: The pointer listing carries each pointer's target, the target's write time and how
      far back rollback reaches, and a pointer whose target is outside the retention window is
      listed with how far it has aged while one inside is not; repointing to another pointer's target promotes bit-identical
      content; repointing to an untargeted out-of-window snapshot is refused `out-of-reach`
      with the reach; deleting the default pointer is refused; creating and repointing require
      `push`, deleting requires `delete`, both refused to a pattern-scoped grant; and every
      repoint leaves an `Operation` record of kind `repoint`.
- [ ] AC23: Every request to the API and to every binding emits exactly one audit record through
      `telemetry.Auditor.Emit` under a `manage.*` event registered in `observability.md`'s
      vocabulary, carrying `request_id`, `principal`, `repository` and `repository_id`, `kind`,
      `objects`, `outcome` and, on a refusal, `problem_type`, with no credential in any
      attribute; every completed, failed or cancelled operation leaves exactly one `Operation`
      record sharing that `request_id`; a refused request leaves none; a grant or
      upstream-credential change leaves an audit record and no `Operation`; and `Operation`
      records are listable per repository under `pull` and registry-wide under the admin role,
      filterable by kind, principal, state and time, and pruned after the configured retention.
- [ ] AC24: Every operation kind a handler declares through `Operations()` has at least one
      conformance case in that format's case set whose `script` calls the operation and then
      runs the real client, and the case-set validator fails the suite before any container
      starts when one is missing.
- [ ] AC25: The checked-in OpenAPI 3.1 document equals the one generated from the route table,
      describes every registered route under `/api/v1` including those `internal/credential`
      (tokens, robots, keys), `internal/signing` (signing keys), `internal/repository` (freeze,
      thaw, rename, delete) and `internal/async` (jobs) contribute, equals the endpoint table in
      this spec route for route, and a test comparing it with the document at the previous
      release tag fails on any removed route, removed field or changed type.
- [ ] AC26: The `manage` package receives a typed `Config` with defaults for every key and never
      imports Viper or Cobra; every key is settable by flag, environment variable and config file
      in the cobra-viper precedence order, proven by an in-process command test.
- [ ] AC27: `format-handler-interface.md` records the optional `Operator` interface with its
      four methods among its optional interfaces and its re-open inputs (its "Optional
      interfaces discovered at registration", resolved was Q10; already the case at 9f53d20),
      and before any Tier 1 handler starts, generic's `delete-file` and the write-triggered
      prototype's `publish` and `configure` have run on it, so the re-open judges from evidence.
- [ ] AC28: `GET /api/v1/session` answers every caller with its principal, kind, admin flag and
      grants, and an anonymous caller with `principal_kind: anonymous` and no grants;
      `GET /api/v1/formats` lists every registered handler with its `Capabilities()`, declared
      kinds, bindings and surface declaration and nothing about unregistered ones;
      `GET /api/v1/search?q=` returns package names only from repositories the caller may read,
      an empty page rather than a refusal when there are none, and a name in an unreadable
      repository never appears; `GET .../recipes` returns byte for byte what `internal/surface`
      renders for that repository with `Token` left as the placeholder; `GET .../refusals`
      returns the repository's policy refusal records under `pull`; and `GET .../trust` and
      `GET .../verdicts` answer under `pull` while `PUT`, `DELETE` and `import` on the trust set
      are refused to every non-admin principal.
- [ ] AC29: `POST .../refresh` on a `remote` under an unpatterned `push` marks every cached
      metadata document due for revalidation so the next real-client request revalidates
      upstream before the metadata TTL would have expired, creates no snapshot, fetches nothing
      itself, leaves one `Operation` of kind `refresh`, is refused to a pattern-scoped `push` and
      to `pull`, and is refused `repository-type` on a `local` or `virtual` and `read-only` on a
      frozen remote.
- [ ] AC30: Every route under `/api/v1`, contributed routes included, accepts the session cookie
      and the bearer token through the same authorizer into the same principal; a
      cookie-authenticated `POST`, `PUT`, `PATCH` or `DELETE` whose `X-CSRF-Token` is absent or
      differs from the `stackweaver_csrf` cookie is refused `unauthenticated` and changes
      nothing; a bearer-authenticated request is never asked for one; and a cookie-authenticated
      `GET` needs none.
- [ ] AC31: `POST .../freeze` makes every completed write against the repository, through the
      API and every binding, answer 405 `read-only` while reads, `PATCH` and `thaw` succeed;
      `POST .../rename` changes the name and nothing else so a real client installs from the new
      name and the old name answers `not-found`, is refused `capability-unsupported` for a format
      declaring `Rename: unsupported`, and hands an `Operator` handler a `configure` carrying
      `{"rename": {"from", "to"}}` inside the rename transaction; each of the three leaves one
      `lifecycle` `Operation` with its sub-kind and the identity and is refused to every
      non-admin principal.
- [ ] AC32: The signing-key routes create, activate, retire and import a key and accept an
      externally signed document as `configure` operations whose `Apply` is `internal/signing`'s,
      with the handler's generator run in the same transaction so a rotation's re-signed
      documents land in the snapshot the operation produced; each is refused to every non-admin
      principal, including a repository-scoped token holding every action; and
      `GET /api/v1/system/jobs`, `POST .../jobs/{id}/cancel` and the per-kind pause and resume
      routes are admin-only, each leaves an audit record, and a paused kind's jobs are enqueued
      and not claimed until resumed.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | unit | `internal/format/register_test.go` (fixture handler named `api`; root-anchored claim under `/api/`), `internal/manage/mount_test.go` |
| AC2 | architecture | `internal/manage/arch_test.go` (route-to-scope mapping through the authorizer; import graph over every handler package) |
| AC3 | integration | `internal/manage/authz_test.go` (per kind class: unauthenticated, wrong action, out-of-pattern, in-pattern, unpatterned; existence-oracle equality of the two `not-found` responses) |
| AC4 | integration | `internal/manage/authz_test.go` (batch publish with one out-of-pattern object; `rebind` with an out-of-pattern displaced object; snapshot table unchanged) |
| AC5 | property + fault injection | `internal/manage/accounting_test.go` (every kind; faults between authorization and `Apply`, and between `Apply` and commit) |
| AC6 | architecture + integration | `internal/storage/gc/arch_test.go` (the module-wide deleter scan, `storage-and-gc.md` AC15); `internal/manage/reclaim_test.go` (delete, prune, sweep on an injected clock) |
| AC7 | integration + conformance | `internal/manage/repository_type_test.go` (API and fixture binding against `remote` and `virtual`); each format's own binding case asserts the same 405 |
| AC8 | table (architecture) | `internal/manage/binding_test.go` (enumerates every registered handler's `Bindings()`; scope equality; delta and document equality) |
| AC9 | integration | `internal/manage/action_table_test.go` (the kind table against `auth.md`'s vocabulary; per-format declared kinds checked against the reconciliation table) |
| AC10 | unit | `internal/manage/register_test.go` (kind-less handler; declared-but-unimplemented kind) |
| AC11 | integration | `internal/manage/kinds_test.go` (every kind on the fixture handler: `withdraw`, `restore`, `attach`, `detach`, `place`, `unplace`, `annotate`, `configure`; `args` byte equality at `Apply`; first real handler declaring each kind) |
| AC12 | property + integration | `internal/manage/retirement_test.go` (handler route and `publish` operation; pruning of every holding snapshot; repoint interleavings; last-version removal; blob mentioned only by a retirement collected) |
| AC13 | integration | `internal/manage/publish_test.go` (declaration mismatch; undeclared coordinate under patterned and unpatterned `push`; orphan collection on an injected clock) |
| AC14 | integration | `internal/manage/upload_session_test.go` (multi-gigabyte fixture streamed from a generator; dropped connection and resume; memory and disk ceilings asserted; publish latency independent of size) |
| AC15 | integration | `internal/manage/publish_test.go` (multipart form versus sessions plus operation; delta and result-document equality) |
| AC16 | integration + fault injection | `internal/manage/deferred_test.go` (202 and `Location`; state monotonicity across the three terminal states; snapshot reference atomic with completion; failed and cancelled deferred operations; poll and cancel authorization; cancel of a synchronous or terminal operation); `internal/async/cancel_test.go` (`async-operations.md` AC9: pending, running-then-finish, running-then-return) |
| AC17 | integration | `internal/manage/idempotency_test.go` (replay; payload change; concurrent repeat while the job is not terminal) |
| AC18 | unit + integration | `internal/manage/problem_test.go` (every type's shape, status and extension members; a route returning an unlisted type fails); `internal/telemetry/request_id_test.go` (`observability.md` AC14: validation, generation, echo) and `internal/manage/request_id_test.go` (the id on every management response and in the audit record) |
| AC19 | integration + conformance | `internal/manage/repository_test.go` (create each type; identity in every response; admin-only; format and type change refused; settings versus configuration snapshot count); `internal/manage/upstream_validate_test.go` (`upstream-adapters.md` AC23: create and `PATCH`, each refusal `upstream-invalid`, unreachable accepted); `internal/repository/create_test.go` (`repository-lifecycle.md` AC4: `capability-unsupported` on a `virtual`); `conformance/generic/admin_test.go` (a repository created through the API serves a real client) |
| AC20 | integration | `internal/manage/repository_delete_test.go` (`confirm` mismatch; `in-use` with and without `detach`; pointer release; name reuse without grants; age-out; `reclaim: now`; shared blob survives; deleted listing admin-only; injected clock); `internal/repository/delete_test.go` (`repository-lifecycle.md` AC14 to AC19, shared) |
| AC21 | integration | `internal/manage/upstream_credential_test.go` (kind and per-kind fields; write-only value; single-row rotation; next fetch uses the new credential at the network layer; `in-use` while referenced by an `Upstream` and by a `ReplicationLink`, then accepted); `internal/manage/grant_test.go` (create, list, revoke; admin-only; enforced on the next request) |
| AC22 | integration | `internal/manage/pointer_test.go` (listing fields; promotion equality; out-of-reach refusal with reach; default pointer undeletable; actions and pattern refusal; `repoint` operation record) |
| AC23 | integration | `internal/manage/audit_test.go` on `telemetry.NewTestRecorder` (one record per request including refusals; registered `manage.*` events; one `Operation` per completed, failed or cancelled operation; none for grants and upstream credentials; credential-free attributes; listing scopes and filters; pruning on an injected clock) |
| AC24 | unit | `conformance/core/case_validate_test.go` (a case set missing a `script` case for a declared kind fails validation naming the kind) |
| AC25 | unit | `internal/manage/openapi/openapi_test.go` (regeneration equality over every route under `/api/v1`, contributed routes included; equality with the endpoint table parsed from this spec; previous-tag comparison) |
| AC26 | unit | `cmd/stackweaver-registry/serve_test.go` (in-process command with flag, env and file sources); `internal/manage/arch_test.go` (no Viper or Cobra import) |
| AC27 | review + integration | `format-handler-interface.md`'s "Optional interfaces discovered at registration" (recorded) and its Review Log entry at the re-open; `internal/manage/operator_test.go` (generic's `delete-file`; the prototype's `publish` and `configure` on the interface) |
| AC28 | integration + e2e | `internal/manage/reads_test.go` (session for anonymous, human, robot and admin; formats listing against the registry; search scoped to readable repositories with an unreadable sentinel name; recipes byte-equal to `internal/surface`; refusals under `pull`; trust and verdict reads under `pull`, trust writes admin-only); `web/e2e/setup.spec.ts` (`web-ui.md` AC7: the rendered snippet equals the recipes route) |
| AC29 | integration + conformance | `internal/manage/refresh_test.go` (metadata marked due; no snapshot; no fetch at the network layer; `refresh` record; pattern and `pull` refused; `repository-type` and `read-only` refusals); `conformance/oci/refresh_test.go` (a real client's next pull revalidates upstream inside the TTL, observed at the upstream stand-in) |
| AC30 | integration + e2e | `internal/manage/csrf_test.go` (table over the route table: cookie unsafe without header, with wrong header, with matching header; bearer unsafe without header; cookie `GET`); `internal/auth/session_test.go` (`auth.md` AC22); `web/e2e/csrf.spec.ts` (`web-ui.md` AC13, a cross-site form post refused) |
| AC31 | integration + conformance | `internal/manage/lifecycle_routes_test.go` (freeze, thaw, rename; admin-only; `capability-unsupported`; the `configure` rename args at `Apply`; `lifecycle` records with sub-kind and identity); `conformance/generic/readonly_test.go` and `conformance/<format>/rename_test.go` (`repository-lifecycle.md` AC10, AC12) |
| AC32 | integration | `internal/manage/signing_keys_routes_test.go` (the five operations as `configure`; `Apply` in `internal/signing`; generator in the same transaction; non-admin and repository-scoped token refused); `internal/manage/jobs_routes_test.go` (`async-operations.md` AC21: admin and non-admin, audit record, OpenAPI presence); `internal/async/pause_test.go` (paused kind not claimed) |

## Implementation Phases

### Phase 1: The core (charter step 2, with generic)
- The reserved `api` mount, `/api/v1`, problem types, `X-Request-Id`, pagination (AC1, AC18)
- `internal/format`'s `Operation`, `Outcome`, `Kind`, `Binding` value types; the `Operator`
  consumer interface in `internal/manage` and registration-time assertion (AC10)
- `Submit`, the write transaction, the `Operation` record, the audit line (AC2, AC5, AC23)
- Repository administration: create, update, delete with `confirm`, `detach` and `reclaim`,
  freeze, thaw, rename, the deleted listing, upstream credentials with their kinds and the
  `in-use` refusal, human grants (AC19, AC20, AC21, AC31); the lifecycle semantics land as
  `repository-lifecycle.md` Phases 1 and 2 in the same step
- Pointer management and the `remote` refresh (AC22, AC29)
- The session cookie on `/api/v1` and the CSRF rule (AC30)
- `GET /api/v1/session` and `GET /api/v1/formats` (AC28, the two reads the first repository
  needs)
- The retirement set and its central refusal (AC12)
- generic's `delete-file` on the interface, the first real kind (AC3, AC6, AC7, AC11 on the
  fixture handler)
- Typed configuration through the cobra-viper factory (AC26)
- OpenAPI generation and the previous-tag comparison (AC25)

### Phase 2: Publish and deferred operations (before the write-triggered prototype, charter step 4a)
- Upload sessions on the storage layer's chunked upload, the `publish` operation and the
  multipart form (AC13, AC14, AC15)
- Deferred kinds, 202, the poll and cancel routes and the `cancelled` state, on
  `data-model.md`'s `Operation`; execution is `async-operations.md`'s, whose queue core lands at
  the start of step 4b and whose `manage.apply` consumer lands at step 6a (AC16)
- This spec's AC32, its job-administration half: the routes land when the queue's admin
  surface does, at the start of step 4b
- Idempotency (AC17)
- This spec's AC28, its trust, verdict and refusal half: the reads and the trust writes land
  with verification and policy at step 4b
- The prototype's `publish` and `configure` on the interface; the re-open takes the evidence
  (AC27)

### Phase 3: Bindings and the format wave (charter steps 5, 6 and 6a onward)
- The binding table test over every registered handler (AC8)
- The action table test against the reconciliation (AC9); every multi-object refusal (AC4)
- The harness validator rule for declared kinds (AC24)
- npm's, PyPI's and Galaxy's operations as their handlers land, then each Tier 1 format's,
  each adding rows to the tests above and nothing to this package
- This spec's AC32, its signing-key half: the routes land with the signing service at step 7

### Phase 4: Surface completion (charter step 9)
- Registry-wide operation listing and filters, retirement and pointer reads the UI needs
- `GET /api/v1/search` and `GET .../recipes`, the two reads only the UI and its recipe-driven
  conformance cases consume before this step (AC28)
- Nothing new in the write path: every operation the UI performs exists by Phase 3

## Tasks

Left empty by `/spec`. Populated by `/tasks` once the spec reaches `planned`.

## Open Questions

None open. Every question this authoring pass raised, and the two the 2026-09-28 reconciliation
raised, is recorded below in decision shape and adopted at its own recommendation under the
owner's standing delegation (`CLAUDE.md`, 2026-09-26); `grep -n "standing delegation"` is the
review queue.

### Resolved: which action the `withdraw` kind requires (was Q1)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: `withdraw` and
`restore` require `delete` for every format, which flips NuGet's unlist and relist and conda's
revoke and unrevoke from the `push` their specs adopted. Folded through Design ("The operation
vocabulary", "Cross-format reconciliation"), AC9 and its Test Plan row, and reported as sibling
consequences for `nuget.md`, `conda.md` and `auth.md`.

The conflict: `auth.md` classes yank as removal-class (`delete`) and requires one rule per
operation whatever the wire; six formats (PyPI, Cargo, Julia, Swift, Puppet, pub) adopted
`delete` for their yank-class operation; NuGet adopted `push` for unlist, whose captured effect
(skipped by `add package` and floating restore, still restored by an exact reference) is the
yank effect exactly, and conda adopted `push` for revocation, whose captured effect is stronger
than a yank on conda's own clients. Both specs recorded their mapping as an input to this
reconciliation, not a decision over it.

**Recommendation:** A, because the vocabulary's rule is stated by effect, and by effect an
unlisted NuGet version and a revoked conda file are withdrawn from new resolution exactly as a
yanked wheel is; a second action for the same effect would be the divergence `auth.md` closed.

| Option | You get | It costs |
|---|---|---|
| **A. `withdraw` is `delete` everywhere; NuGet unlist and conda revoke flip** | One rule for one effect, mechanically table-tested; a publish-only CI key can never take a version out of resolution on any format | `dotnet nuget delete` with a push-only API key is refused, which is more than nuget.org asks; a conda publish key cannot revoke its own upload; two format specs change |
| **B. The action follows the ecosystem's own permission where a client-native trigger exists** | Each ecosystem's users keep their habits | Cargo would revert to `push`, undoing `cargo.md`'s adopted decision and `auth.md`'s citation of it; the rule becomes "whatever the ecosystem does", which is no rule |
| **C. Two kinds, `withdraw` (`delete`) and `unlist` (`push`), split by whether the ecosystem calls it a delete** | No format spec changes | Two kinds for one effect, distinguished by vocabulary rather than behaviour; the reconciliation this spec exists to make is not made |

**Why this is yours:** it tells every publisher of two ecosystems that a credential which
publishes cannot withdraw, and it reverses two adopted format decisions.

Accepted cost: the two flips, and the documentation burden of explaining to a .NET team why the
command named `delete` needs the `delete` grant.

### Resolved: how an operation reaches the handler (was Q2)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: an optional `Operator`
interface with four methods, declared in `internal/manage` and discovered by type assertion at
registration, with the value types in `internal/format`; the pin stays at five methods and the
re-open decides whether to fold it in. Folded through Design ("Dispatch"), AC8, AC10, AC27 and
Phase 1.

**Recommendation:** A, because it is the Go idiom for an optional capability, it changes nothing
about the pinned method set before the re-open, and it gives the architecture tests a concrete
thing to enumerate (`Bindings()`, `Operations()`).

| Option | You get | It costs |
|---|---|---|
| **A. Optional interface, type-asserted, four methods** | No pin amendment; handlers without management implement nothing; enumerable for tests | A handler can forget to implement it, caught only at registration by the declared-kinds check |
| **B. A sixth pinned method** | One interface, no assertion | An out-of-cycle amendment for a capability half the formats lack, made without the evidence the re-open exists to gather |
| **C. Dispatch over `ServeHTTP` with a synthetic internal request** | Zero new interface | The contract becomes a URL grammar; object reporting becomes string parsing; the authorizer sees a request that never arrived |
| **D. Handlers register operation callbacks into the core at construction** | Flexible | Inverts the dependency the pin fixed: a handler would hold a capability it was not handed |

**Why this is yours:** it shapes the one extension point every format's management half is
built on, and it pre-empts a re-open question with an answer the re-open must then judge.

Accepted cost: the re-open may fold it in and rename it; two Tier 0 implementations will have
been written against the optional form.

### Resolved: where the retirement set lives (was Q3)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: a core-held `Retirement`
record outside snapshot content, specified here for `data-model.md` to own, with refusal in the
shared write path. Folded through Design ("Retirement is core-held"), AC12 and its Test Plan
row, and reported as sibling consequences for `data-model.md` and every format spec that placed
the set in the package-level document.

**Recommendation:** A, because it is the only placement under which AC33's obligation ("a
pointer moved backwards preserves the set") holds by construction rather than by every handler
remembering to re-merge, and because the refusal becomes one check the core makes on every
write instead of 33 checks handlers make on their own routes.

| Option | You get | It costs |
|---|---|---|
| **A. Core-held record outside snapshots; central refusal on the addressed object** | One enforcer; repoint cannot lose it; format N+1 inherits it for free | A new record `data-model.md` must own; twenty format specs reword one sentence; retirement granularity is a string the handler chooses |
| **B. Handler-owned set in the package-level document, re-merged by a handler hook after every backwards repoint** | Nothing new in the model | Every handler implements the same merge; a handler that forgets silently re-opens coordinates; the hook is a fifth method |
| **C. A core-parsed section of the package-level document** | The core can read it | It is still snapshot content, so a backwards repoint still restores a set that predates the retirement, which is the trap |

**Why this is yours:** it adds a record to the shared model and changes where every format
spec says a cross-format invariant is kept.

Accepted cost: the fan-out to sibling specs, done once.

### Resolved: the shape of a content operation on the wire (was Q4)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: one operations endpoint
per repository (`POST .../operations`) taking a kind, a target coordinate and an opaque `args`
document, with resource reads beside it; not a REST verb per resource. Folded through Design
("One API, three families", "The operation vocabulary") and AC18.

**Recommendation:** A, because the kind vocabulary is closed and reconciled, because targets are
format-canonical strings that do not fit URL segments (slash-bearing names, lists of versions
with targets), and because the audit record is then the request itself.

| Option | You get | It costs |
|---|---|---|
| **A. One operations endpoint, kind plus target plus `args`** | One route to authorize, audit and document; bulk targets natural; the kind table is the API | Less "RESTful" to a reader expecting `DELETE .../versions/{v}`; the `args` document is opaque to the core |
| **B. A verb per resource (`DELETE .../versions/{v}`, `POST .../versions/{v}:withdraw`)** | Familiar; discoverable per resource | Slash-bearing coordinates force encoding rules per format; bulk operations need a second shape; one kind becomes many routes to keep in step |

**Why this is yours:** it is the shape every management client, including the UI, is written
against.

Accepted cost: readers who expect REST verbs read the kind table first.

### Resolved: what the audit record is (was Q5)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: the `Operation` record
for every operation that passes authorization, plus a structured audit log line for every
request including refusals; no new audit entity. Folded through Design ("Audit"), AC23 and its
Test Plan row, and a wording consequence for `data-model.md`.

**Recommendation:** A, because `data-model.md` already owns a record with the right fields and
lifetime, because a refused request must not be able to write to the database, and because a
log line is what a SIEM ingests.

| Option | You get | It costs |
|---|---|---|
| **A. `Operation` record plus audit log line** | No new entity; queryable history and a SIEM feed from the same request id | Two records to keep consistent; the queryable history is pruned |
| **B. A dedicated `AuditEvent` entity, never pruned** | A permanent queryable trail | A new entity by fiat, growing without bound, holding refused requests from unauthenticated callers |
| **C. Log lines only** | Simplest | "Who deleted this" is a log search, and the UI has nothing to render |

**Why this is yours:** it decides what an operator can prove about past changes, and for how
long.

Accepted cost: the queryable trail is bounded by the retention setting; the permanent trail is
the log.

### Resolved: which actions pointer management requires (was Q6)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: creating and repointing a
named pointer require `push`, deleting one requires `delete`, both with the object none. Folded
through Design ("One API, three families", "Pointer management") and AC22.

**Recommendation:** A, because promotion changes what clients receive (adds content to an
environment's resolution, which is `push` by the vocabulary's effect rule), deletion releases a
GC root (removal-class), and a CI pipeline promoting `staging` to `prod` must not need the admin
role.

| Option | You get | It costs |
|---|---|---|
| **A. `push` to create and repoint, `delete` to delete, object none** | CI can promote; a pattern-scoped grant cannot, which matches "the whole repository moves" | A `push` grant can roll back, which hides versions; accepted because the versions stay in the snapshot and are restored by the next repoint |
| **B. Admin role for all pointer operations** | Promotion is a privileged act | Every deployment pipeline runs as admin, which is the credential nobody should hand a pipeline |
| **C. `delete` for repoint as well, since a rollback removes from resolution** | Symmetric with `withdraw` | A promotion, the common case, needs `delete`, and the effect rule is being applied to the rarer direction |

**Why this is yours:** it decides which credential a deployment pipeline holds.

Accepted cost: rollback under `push`.

### Resolved: repository deletion and space reclamation (was Q7)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: repository deletion
releases pointers and marks the repository deleted; snapshots age out under the retention window
unless the request sets `reclaim: now`, which sets the window to zero for that repository; every
byte still returns through the pruner and the sweep. Folded through Design ("Repository
administration") and AC20; `storage-and-gc.md` has applied its side (AC15's module-wide deleter
scan names `internal/manage` and `internal/repository`; AC24 puts repository deletion, with and
without `reclaim`, in the GC property suite's operation set).

**Recommendation:** A, because it keeps `storage-and-gc.md` AC15's single deleter intact, gives
the operator the fast path they will demand, and keeps the slow path as the default so a wrong
deletion has the window to be noticed.

| Option | You get | It costs |
|---|---|---|
| **A. Release pointers, age out by default, `reclaim: now` sets the window to zero** | One deleter; a safe default; a fast option | A deleted repository's blobs occupy space for the window by default |
| **B. Immediate reclamation always** | Space back at once | A mistaken deletion is unrecoverable, and the pruner must special-case deleted repositories |
| **C. Soft delete with undelete, snapshots kept until an explicit purge** | Recoverable | A fourth repository state in the model and in every listing |

**Why this is yours:** it decides how recoverable the most destructive operation in the product
is.

Accepted cost: the default is slow.

### Resolved: third-party management compatibility surfaces (was Q8)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: no third-party management
API is served as a compatibility surface; bindings exist only under the binding rule. Folded
through Scope and Design ("Bindings"). HCP Vagrant's publishing sequence, which `vagrant.md`
handed this spec with its captured request order, is declined for the reasons that spec's own
record gave: staging state before any snapshot with no entity in the model, an upload URL that
is itself the credential, two path shapes for one API across client versions, and an API its
maintainer retires on 2026-12-31.

**Recommendation:** A, because the specs that raised the question each concluded the same way
for the same structural reason (state outside the model), and because a compatibility surface
with no client in the matrix has no oracle.

| Option | You get | It costs |
|---|---|---|
| **A. None served; bindings only under the rule** | One management surface; no un-modelled staging state | HCP publishers, ChartMuseum delete scripts and pub.dev Admin-tab habits change to this API |
| **B. Serve HCP's API v2 as the one compatibility surface** | `vagrant cloud publish` works unchanged until HCP's retirement | Staging state outside the model, a credential-bearing URL, and a retired contract |

**Why this is yours:** it decides whether migrating teams keep their publish tooling.

Accepted cost: the migrations named in the table.

### Resolved: API-first with no CLI in v1 (was Q9)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: API-first; the OpenAPI
document is the surface; no command-line client in v1. Folded through Scope and Design
("Configuration and the CLI stance").

**Recommendation:** A, for reasons other than effort: a CLI is a second client with its own
compatibility promise and no oracle but our own tests, and built before the API stabilises it
becomes the surface format specs describe their operations against, which the UI at step 9 then
has to match.

| Option | You get | It costs |
|---|---|---|
| **A. API-first, OpenAPI as the contract, no CLI** | One surface, one compatibility gate; the harness's `script` and the UI are the clients | Operators script with `curl` or a generated client until a CLI exists |
| **B. Ship a CLI beside the API from step 2** | Operator convenience from day one | Two surfaces to keep in step and version; the CLI becomes what people bind to |

**Why this is yours:** it is a product-surface decision about what operators are handed first.

Accepted cost: `curl` until a later spec adds a CLI over the OpenAPI document.

### Resolved: the refusal on a `remote` or `virtual` repository (was Q10)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: 405 with problem type
`repository-type`, on the API and on every binding. Folded through Design ("Mount, versioning
and wire conventions", "Every operation is one completed logical write") and AC7.

**Recommendation:** A, because nine format specs already adopted 405 for their bindings on the
strength of what their clients print, and the API and a binding must answer identically.

| Option | You get | It costs |
|---|---|---|
| **A. 405 everywhere** | One answer through both ways in; matches the captured client renderings | 405 is a loose fit for an endpoint whose method is otherwise allowed |
| **B. 409 on the API, 405 on bindings** | Semantically tidier on the API | Two answers for one operation, which is what the binding rule forbids |

**Why this is yours:** it fixes a status code every format's conformance cases assert.

Accepted cost: the semantic looseness.

### Resolved: where the deleted-repository listing lives (was Q11)

**Adopted 2026-09-28 under the owner's standing delegation.** Option A: the tombstone listing is
`GET /api/v1/repositories?state=deleted`, an admin-only filter value on the collection route,
not the literal path `GET /api/v1/repositories/deleted` the queued consequence named
(`repository-lifecycle.md` authoring item 5). Folded through the endpoint table, "Repository
administration" and AC20, and reported as a wording consequence for `repository-lifecycle.md`
and `web-ui.md`.

The conflict: `repository-lifecycle.md`'s name grammar (`^[a-z0-9]+(?:[._-][a-z0-9]+)*$`)
admits `deleted` as a repository name, and its reserved-name rule covers only
`format-handler-interface.md`'s first-segment table. A literal `/repositories/deleted` would
therefore shadow `GET /api/v1/repositories/{name}` for a repository named `deleted`, or force a
second reserved word into the grammar for one route.

**Recommendation:** A, because a listing filtered by state is what the route already is for
live repositories, because it adds no reserved name, and because the admin-only rule attaches
to a filter value as mechanically as to a path (the authorizer sees the query).

| Option | You get | It costs |
|---|---|---|
| **A. `?state=deleted` on the collection, admin-only** | No new reserved name; one listing route; the same filter grammar the operation listing uses | Admin-only enforcement on a query value, which the route test must cover explicitly |
| **B. Literal `/repositories/deleted`, `deleted` added to the reserved names** | A discoverable path | A second reserved-name source beside the interface's table, and a name a user may reasonably want refused for one route's convenience |
| **C. `/api/v1/tombstones`** | No collision, no filter | A resource name no sibling uses; the UI and the lifecycle spec speak of a deleted listing |

**Why this is yours:** it changes a route a sibling spec already named.

Accepted cost: the explicit admin check on a filter value, asserted by AC20.

### Resolved: which action the `remote` cache refresh requires (was Q12)

**Adopted 2026-09-28 under the owner's standing delegation.** Option A: `POST .../refresh` on a
`remote` requires `push` on the repository with the object none, so only an unpatterned `push`
or the admin may force revalidation; it leaves an `Operation` of kind `refresh` and no snapshot.
Folded through "One API, three families", the endpoint table, the administration-family kind
list, "Repository administration" and AC29, with a consequence for `data-model.md` (the kind
set) and `proxy-cache.md` (the route that realises its "refresh now" action).

`proxy-cache.md`'s resolved metadata-TTL decision requires "an explicit refresh now action in
both UI and API" and `web-ui.md` renders it on the repository page, but neither fixes the
action, and the vocabulary's effect rule has to be applied: a refresh adds nothing and removes
nothing, yet it changes what clients receive on their next request, which is the same effect
class as a repoint.

**Recommendation:** A, by the effect rule and by parity with pointer management (was Q6): a CI
pipeline that just published upstream may want to refresh a proxy without holding the admin
credential, and a pattern-scoped grant cannot, because the refresh is repository-wide.

| Option | You get | It costs |
|---|---|---|
| **A. `push`, object none** | Pipelines can refresh; matches the pointer rule; no new action | A `push` grant can cause upstream traffic at will; bounded by the adapter's concurrency and cool-down limits |
| **B. Admin role** | Refresh is a privileged act | Every pipeline that mirrors upstream publishes runs as admin, the credential nobody should hand a pipeline |
| **C. `pull`** | Any consumer can refresh | Any reader can drive upstream traffic against the operator's rate limits |

**Why this is yours:** it decides which credential can make the registry talk to an upstream on
demand.

Accepted cost: upstream traffic under `push`, bounded by `upstream-adapters.md`'s limits.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-27 | 6ae6608 | authoring pass: grounded first draft, not a review | Gathered the requirements of all 32 format specs, `auth.md`, `data-model.md`, `storage-and-gc.md`, `format-handler-interface.md`, `project-charter.md` and `conformance-harness.md` from their citing sections and from `agents/spec-loop/consequences.md`; grounded prior art in Nexus, Harbor, Pulp and Gitea documentation, RFC 9457, the IETF Idempotency-Key draft and AIP-151/155 fetched this run (Artifactory unreachable, recorded). Fixed one API (reserved `api`, `/api/v1`, problem types, a closed kind vocabulary, one operations endpoint), reconciled every format's action onto `auth.md`'s vocabulary by the effect rule (two flips: NuGet unlist and conda revoke to `delete`), answered the dispatch question with an optional `Operator` interface, placed the retirement set in the core with central refusal, and made the `Operation` record the audit record. Ten questions written in decision shape and adopted under the standing delegation; zero open. 27 criteria, each with a Test Plan row. `node scripts/check-spec.js` run against this file with zero failures. |
| 2026-09-28 | 9f53d20 | cross-spec reconciliation of the foundation authoring wave. Not a review | Not a review. Every queued item in `agents/spec-loop/consequences.md` targeting this file verified against the current text of its source spec before applying. New: an exhaustive endpoint table (every route any sibling assigns to `/api/v1`, once, with its authorization) and a closed problem-type table with statuses, gaining `read-only`, `in-use`, `capability-unsupported` (`repository-lifecycle.md`), `upstream-invalid` (`upstream-adapters.md`), `scope-exceeds-owner` and `lifetime-policy` (`credential-management.md`). Repository administration rewritten over `repository-lifecycle.md`: `rep_` identity in every response, `confirm` and `detach` on delete, freeze, thaw and rename routes, a `lifecycle` kind, the tombstone listing; `upstream.Validate` on create and `PATCH`; upstream credentials carry a `kind` and are refused `in-use` while referenced. Deferred operations admit `cancelled`, gain the cancel route and the `/api/v1/system/jobs` administration; `operation-outstanding` means "job not terminal" (`async-operations.md`). Trust, verdict and refusal routes (`artifact-verification.md`, `supply-chain-policy.md`); signing-key routes as `configure` operations (`signing-service.md`); Galaxy `attach` row and Helm's coherence check (Open item 4). `X-Request-Id` validation and the audit channel through `telemetry.Auditor.Emit` with registered `manage.*` events (`observability.md`); the credential precedent of audit line without `Operation`. Session cookie accepted on `/api/v1` with double-submit CSRF on unsafe methods, and the six reads `web-ui.md` needs (session, formats, search, recipes, refusals, refresh). Operational subcommands named (`deployment.md`). Wording: `Retirement` and the `Operation` widening are `data-model.md`'s (AC35, AC32); `storage-and-gc.md` AC15 and AC24 cited as applied; the re-open answer is recorded in `format-handler-interface.md` (was its Q10). Open items 8, 11, 15, 17 and 25 found already covered by the authoring pass; item 8's `push` for NuGet unlist superseded by the resolved withdraw-action decision (was Q1). Two questions adopted under the delegation: Q11 (the deleted listing is `?state=deleted`, since the name grammar admits `deleted`) and Q12 (refresh requires `push`, object none). AC16, AC18 to AC21, AC23, AC25 and AC27 amended; AC28 to AC32 added, each with a Test Plan row. `node scripts/check-spec.js` run against this file with zero failures. |
