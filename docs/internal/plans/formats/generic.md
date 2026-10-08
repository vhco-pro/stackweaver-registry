---
status: planned
status_description: "Fable gate review 2026-10-08 at b10d639, planned: the handler declares configure beside delete-file so the immutability switch is settable at all (management-api refuses a settings document for a handler without configure); every read goes through signing-service's ServeFile and ServeRendered with declared serve policies, HEAD by the door, Cache-Control narrowed to private on private repositories and authenticated requests (new AC18); the owner's path grammar stated rule by rule; Q14 adopted under the standing delegation (a virtual's listing is the members' merged by path, first member wins; new AC19); central refusals rendered in this format's text/plain wire shape; AC2, AC6, AC7 tightened. Zero open questions; 19 criteria, each with a Test Plan row. Earlier: reconciled 2026-09-28 at a6d72b3 with the foundation wave (not a review): DELETE is a binding onto management-api's delete-file kind, the handler's one Operator kind, retiring nothing (AC8); Capabilities declares Virtual and Rename supported and the lifecycle, read-only, rename, virtual-detach and admin cases are gathered (AC9, AC16); immutability distinct from read_only; retention scheduled as async-operations' retention.pass kind, one schedule per ruled repository, disabled while read_only or deleted (AC17); the verification column reads none; WriteRefusal and the pending binding-table row filled by AC15's capture; the operator API cited to management-api.md Phase 1 instead of owed. Earlier: reconciled 2026-09-26 at da0aecd (addressed objects AC14, policy rendering AC15); Q4 to Q7 and Q9 to Q13 adopted 2026-09-26 at 4d1aeb1 under the owner's standing delegation. Zero open questions; 17 criteria, each with a Test Plan row; stays draft pending a gate review."
description: "Spec for the generic/raw artifact format - the trivial protocol used to prove the harness, CAS, auth and CI wiring end to end."
author: michielvha
goal: "Exercise every shared layer with a protocol simple enough that any failure is unambiguously a harness or infrastructure failure, not a protocol misreading."
priority: "high"
issue: 6
created: 2026-09-21
covers:
  - "internal/format/generic/**"
  - "internal/retention/**"
  - "conformance/generic/**"
---

# Plan: Generic artifact format

Upload a file to a path, download it back, list what is there, delete it. Deliberately the most
boring format possible.

## Context

This format exists to be first, not to be wanted. Its purpose is to exercise the conformance
harness, the content-addressable store, authentication and the CI wiring with a protocol so
trivial that any failure is unambiguously infrastructure rather than a protocol misreading.
Debugging a harness and a protocol at the same time is how foundation work stalls.

It is also genuinely useful on its own: "where build outputs and arbitrary binaries live, with
retention policies" is a real need that teams currently solve with an S3 bucket and no access
control.

The client here is `curl`, which means the conformance cases are unusually legible and make good
worked examples for every later format.

## Scope

**In scope:** authenticated PUT to a repository path, GET, HEAD, listing by segment-aligned
prefix with snapshot-consistent pagination, delete, overwrite semantics with a per-repository
immutability switch, and retention policies by age and by count, scoped per repository with
optional path-prefix filters. Also the strict path grammar (Design, "Path grammar"), the
per-route addressed objects `auth.md`'s pattern scopes evaluate (Design, "Addressed objects and
pattern scopes"), the rendering of a shared policy refusal, the two management kinds this
handler declares (`delete-file` and `configure`, Design, "The handler's `Operator` kinds"),
serving every artifact and listing through `signing-service.md`'s door, which is what gives this
format its validators, conditional requests, byte ranges and cacheability (Design, "Serving
through the door"), and the listing of a virtual generic repository (the resolved
virtual-listing decision below, was Q14).

**Out of scope:** the proxied path. This is the one format permitted to declare proxy support
`unsupported` (see `format-handler-interface.md`, resolved Q2) - there is no upstream protocol
to proxy, because there is no ecosystem. That exception is named here so the conformance matrix
does not imply a gap that does not exist. It also obliges the runner's mode-coverage validation
(`format-handler-interface.md` AC4, the harness case schema) to recognise a declared
`unsupported` capability rather than fail this format for covering one mode. The handler's
`Capabilities()` declaration and `conformance-harness.md` AC11 are the two sides of that
contract.

**Also out of scope, and exempt rather than missing:** replay-match. There is no reference
implementation of this protocol to record a corpus from, so `format-handler-interface.md`'s
definition-of-done item 2 does not apply to this format (the resolved replay-exemption decision
below); `Capabilities()` declares it and the conformance matrix renders it as exempt, never as
passing (AC9).

**Depended on, not owned:** the operator-facing API through which a repository's settings (the
immutability switch, retention rules) are changed. It is shared across formats and is
`docs/internal/plans/foundation/management-api.md`'s: its Phase 1, the management surface core
the charter builds beside this format at step 2, carries `POST /api/v1/repositories` and `PATCH
/api/v1/repositories/{name}`, where retention rules are core-parsed repository configuration and
the immutability switch travels as this handler's `settings` document, dispatched to the handler
as a `configure` operation ("Repository administration" there; its AC19). Conformance needs it
only for one case: `conformance/generic/admin_test.go`, which that spec's AC19 places here, has a
`script` create a repository through the API and a real `curl` fetch from it. Everything else is
provisioned through the harness's `setup` vocabulary, which the server's seed subcommand applies
through the shared layers, and the integration tests write the shared model directly.

**Asks nothing of `artifact-verification.md`.** Generic content carries no signature or
attestation an ecosystem defines, so this format requests no verifier entry and the conformance
matrix's verification column reads `none` citing this spec (`artifact-verification.md` AC24;
`catalogue.md` AC7). Serve-time digest verification of every blob read is `storage-and-gc.md`'s
and applies here as everywhere.

## Design

### Protocol surface

Five operations over plain HTTP, chosen so every conformance case is a legible `curl`
invocation. Artifact URLs follow the resolved mapping below:
`/generic/{repository}/{package}/{version}/{path/to/file}`.

- **PUT** streams a body to an artifact path, records its digest, and commits the blob through
  the shared CAS. The handler never opens object storage directly
  (`format-handler-interface.md`). The body is never spooled: it streams into the CAS commit
  and is parsed by nobody, so `management.publish_spool_limit` does not apply to it
  (`management-api.md`'s resolved spool decision, was Q20, binds paths that spool). The PUT
  declares the artifact path as its claim on the write transaction (`management-api.md`'s
  resolved retirement-check decision, was Q14; `storage-and-gc.md` AC30), a check that always
  passes here because this format writes no `Retirement` record. A PUT to an unoccupied path
  returns `201 Created`. What a PUT to an **occupied** path does is below.
- **GET** returns the bytes through `signing-service.md`'s `ServeFile` form; **HEAD** is
  answered by the door as the GET without its body, `Content-Length` included, so the handler
  has no HEAD code of its own (Design, "Serving through the door").
- **Listing** is a GET on the repository root, `/generic/{repository}`, which the strict path
  grammar guarantees can never be an artifact path (an artifact path needs a package, a version
  and a filename). It returns every artifact beneath an optional `prefix`, recursively, as a
  JSON document of entries carrying the full artifact path, size and CAS digest, ordered by path
  in byte order, one page at a time; the response names the snapshot it was read from and, when
  more entries remain, an opaque continuation token. The page walk is pinned to that snapshot
  (below).
- **DELETE** removes one artifact's metadata reference only. A delete that removes a version's
  last file removes the version in the same write, so a version with no files never exists.
  Blob reclamation always flows through GC (`storage-and-gc.md`), so this format adds no second
  deletion path to the store. The same holds for retention: it is an automated deleter of
  metadata references and nothing else, which keeps every blob-deletion decision inside the one
  component whose safety is property-tested and fault-injected.

  The route is a **binding** onto `management-api.md`'s `delete-file` kind, under `delete` on
  the artifact path (its cross-format reconciliation table's generic row): the handler
  implements that spec's `Operator` interface with `delete-file` as one of its two declared kinds
  (the other is `configure`, below), its `DELETE` translates the wire into `Submit`, and the
  same deletion is reachable through the
  operations endpoint, which is the evidence that spec's AC27 brings to the interface re-open
  as the first real kind. **The deletion retires nothing.** The kind table lets `delete-file`
  retire the file coordinate and leaves the coordinates to the handler's `Outcome`; generic
  returns none, in both overwrite modes, because a generic path is mutable by default and the
  resolved overwrite decision (was Q5) already priced delete-and-re-upload as permitted under
  immutability, and no downstream lockfile binds a generic path to one set of bytes the way a
  PyPI filename or an npm `name@version` is bound. So a deleted path uploads again, and this
  format writes no `Retirement` record (`data-model.md` AC35 is exercised by the formats that
  do). `management-api.md` AC24 asks one `script`-driven case per declared kind, which AC8 now
  carries. The binding is exactly as wide as the operation: the route's `Scope(r)` object is the
  one pair `Authorize` reports, `delete` on that path (`management-api.md`'s resolved
  binding-scope decision, was Q13, and AC8).

Every refusal the shared layers decide is rendered on this format's wire in this format's one
shape, a `text/plain` body naming the rule (`management-api.md`'s resolved central-refusal
decision, was Q16): the `409` of the immutability rule, the `405` of a `read_only` repository,
the `400` of the path grammar and the `403` of the policy layer all look alike to `curl`. The
authentication layer's own answers, the `401` challenge and the existence rule's `404`, are
written by `auth.md`'s layer, not by this handler, and carry `Cache-Control: private, no-store`
as its resolved decision (was Q27) fixes.

A request the shared policy layer refuses (`supply-chain-policy.md`, the typed refusal its
resolution calls in `Deps` return) is answered `403` with a `text/plain` body naming the policy
and the rule that refused, the same body shape as this format's other refusals, which
`curl --fail-with-body` prints (AC15). The caller is authorized and the content is what is
refused, so the existence rule's `404` does not apply. The handler writes it through the shared
refusal writer `WriteRefusal` in `internal/format` (`format-handler-interface.md` AC14), which
puts `supply-chain-policy.md`'s status-line phrase on an HTTP/1.1 connection (its resolved
status-line decision, was Q10, and AC18); the `403` and the `text/plain` body are this format's.
Generic precedes the policy layer in the build order (charter step 4b), so the case lands when
that layer does, and `supply-chain-policy.md`'s table "When a refusal binds, per format" carries
generic as `pending` until it does: AC15's case replaces the row with what `curl` shows in the
same change (its AC20), and the harness refuses to run the policy case while the row is still
`pending` (`conformance-harness.md` AC26).

### Addressed objects and pattern scopes

`auth.md`'s pattern scopes narrow a credential within one repository by matching the object a
request addresses, and which object each route reports is the format's to declare ("Pattern
scopes" there; `format-handler-interface.md` AC12). Generic's declaration, in the canonical
form the pattern grammar matches byte for byte:

| Route | Object kind | Canonical object |
|---|---|---|
| PUT, GET, HEAD and DELETE on an artifact path | named | the artifact path below the repository, `{package}/{version}/{path/to/file}`, exactly as the strict path grammar accepted it |
| Listing (GET on the repository root, with or without `prefix`) | none | - |

Retention runs outside any request and reports no object. Three consequences, stated so they
are not discovered:

- A pattern matches the whole artifact path with no implicit wildcard, so a credential confined
  to one package is written `{package}/**`, and one confined to a version
  `{package}/{version}/**`. The grammar's own example `prod/*` matches no generic artifact at
  all, since every artifact path has at least three segments; AC14 exercises the same grammar
  cases one segment deeper.
- A patterned credential cannot list, even with a `prefix` inside its pattern, because a listing
  enumerates names and `auth.md` refuses every such route to a patterned scope (its AC24). A CI
  job holding a `prod/**` token fetches the paths it already knows. That is auth's accepted
  cost, not re-decided here.
- Every route that writes or deletes is named, so a patterned `push` or `delete` never reaches
  outside its pattern: this format has no content-addressed route for `auth.md`'s
  content-addressed allowance to widen.

### The handler's `Operator` kinds

`Operations()` returns `delete-file` and `configure`, and nothing else. `delete-file` is the
`DELETE` binding above. `configure` exists because the immutability switch travels as this
handler's `settings` document on `POST` and `PATCH /api/v1/repositories/{name}`, and
`management-api.md` refuses a `settings` field as `validation` for any format whose handler
declares no `configure` (its "Dispatch" rule): a handler that owns a settings document must
declare the kind that receives it. Generic's document is `{"immutable": bool}`; any other field
is refused `validation` naming it, so a typo never silently leaves a repository mutable. The
`configure` is admin-only through the API, has no binding and no client trigger, so its AC24
case is `script`-driven (AC8's row). Applying it is one completed write of the repository's
metadata document, the accounting `management-api.md` AC19 fixes. The rename notice reaches this
`Operator` as it reaches every other and changes nothing stored, since every reference is by
repository identity (the "Capabilities and lifecycle" section).

### Serving through the door

Nothing this handler serves carries a validator, a date, a `Cache-Control` or a range it computed
itself: `signing-service.md`'s architecture test refuses a handler package that sets `ETag`,
`Last-Modified` or `Cache-Control` or reads a conditional header (its AC11 row,
`internal/format/freshness_boundary_test.go`), and this format is the simplest consumer of the
forms that boundary exists for.

- **Artifacts** go through `ServeFile` from the artifact's `File` record: the strong `ETag` is
  the CAS digest, `Last-Modified` is the record's creation (a replacement creates a new record,
  so an overwrite moves it), `If-None-Match` answers `304`, and a single byte range answers
  `206` with `Content-Range`, verified through `storage-and-gc.md`'s segment digests (its AC21),
  an unsatisfiable one `416`. The serve policy, a package-level constant: conditional rule
  `exact`, `Cache-Control: no-cache` (a cached copy is always revalidated against the digest,
  which is the only answer that is right in both overwrite modes with one constant; a `304`
  costs nothing), identity encoding only, ranges supported.
- **Listings** go through `ServeRendered`'s lazy form: the validator identity is the pinned
  snapshot number, the `prefix`, the continuation position and the page size, so a page is a
  `304` to a client re-walking an unchanged snapshot and never a stale `200` after a write; the
  freshness value folded into it is the serving pointer's record (`signing-service.md` AC32).
  Policy: `exact`, `no-cache`, no ranges.
- **HEAD** on either route is the door's: the GET's status and headers with `Content-Length`
  and no body (`signing-service.md`'s resolved HEAD decision, was Q24, AC32). AC7 asserts the
  visible half.
- **Cacheability is narrowed by the door, never by this handler.** `no-cache` is served as
  declared only to an anonymous request on an anonymously readable repository; every other
  response carries `private` as well, and a request authenticated by a URL-borne form gets
  exactly `private, no-store` (`signing-service.md`'s resolved cacheability decision, was Q25,
  AC38). Generic repositories are private by default, so in the common case every artifact
  response reads `private, no-cache`. This format declares no URL-borne form, so the last rule
  binds here only through a form `auth.md` recognises on every route.

### Prefixes are segment-aligned

Listing and retention filter by the same kind of prefix, and it matches whole path segments: the
prefix `ci` selects `ci/...` and never `ci-tools/...`, and `ci/1.0` selects that version and
never `ci/1.0.1`. A byte-prefix would make a retention rule written for one package silently
delete another package whose name happens to extend it, which is the correct-by-spec deletion
of someone's artifacts that the retention-scoping resolution exists to prevent. The strict path
grammar already guarantees segments are well defined.

### Listing pages are pinned to one snapshot

The first page resolves the repository's newest snapshot through its pointer, as every read
does (`data-model.md`), and the continuation token carries that snapshot number, so every later
page of the same walk reads the same immutable snapshot. A walk that overlaps concurrent writes
therefore returns exactly one snapshot's artifact set, with no entry skipped or duplicated
because a write shifted the ordering between pages (the resolved pagination decision below). If
the pinned snapshot is pruned before the walk finishes, the next page fails with an error saying
so, and never silently continues from a newer snapshot.

### Overwrite and immutability

A per-repository setting, stored in the repository's metadata document, which the handler owns:

- **Overwrite allowed (the default).** A PUT to an occupied path with different content replaces
  it: one completed write, a new snapshot, and GET returns the new bytes. The superseded blob is
  still referenced by the snapshots that held it, so it is reclaimed only through snapshot
  pruning and GC, like any other hosted delete.
- **Immutable.** A PUT to an occupied path with different content is refused with `409 Conflict`
  and a message naming the immutability rule and the path, and the stored artifact is untouched.
  Immutability forbids in-place replacement only: a caller granted `delete` may still delete and
  re-upload. The distinction is deliberate, because the credential that does the damage in
  practice is a CI token holding `push`, and `auth.md`'s scope keeps `push` and `delete` apart.

In **either** mode, a PUT whose content digest equals the digest already stored at that path is
an idempotent success returning `200 OK`: it is not a write, creates no snapshot and does not
refresh the version's write time (the resolved same-content decision below; the shape
`management-api.md`'s resolved unchanged-publish decision, was Q15, later gave every publish,
except that generic's wire PUT is no management operation and so records nothing at all). A CI
job retrying
an upload after a lost response must not fail against an immutable repository for re-sending
exactly what it already sent.

**Immutability is not `read_only`.** `repository-lifecycle.md` defines the `read_only` state,
which refuses every completed write, PUT, DELETE, management operation and retention pass alike,
with `405` (its `read-only` problem type on the API; this format's `text/plain` shape on the
wire, per the central-refusal rule above), and leaves reads bit-identical (its AC10).
Immutability forbids replacing a path in place and still permits new uploads and deletes. A
repository may hold both, and thawing a `read_only` immutable repository restores its uploads and
deletes while the immutability rule keeps refusing replacement. The two are stored separately:
`read_only` is core-held lifecycle state, immutability is this handler's `settings` document.

### Write boundaries

`data-model.md` requires each handler spec to declare where its completed logical writes fall,
since each one produces exactly one snapshot. Generic's, per the resolved write-boundary
decision below:

- A PUT that creates or replaces an artifact is one completed write. Generic has no
  multi-request publish, so there is nothing to group.
- A DELETE is one completed write, including when it removes the version with its last file.
- A **retention pass over one repository is one completed write**, however many versions it
  removes, so a cleanup deleting a thousand versions is one snapshot rather than a thousand, and
  a pass is atomic: its deletions all land or none do.

### Retention

Retention policies are **per-repository rules, each with an optional segment-aligned prefix
filter** (the resolved retention-scoping decision below). The unit a rule counts and deletes is
the **version**, the grouping the resolved mapping made mandatory, so a rule never leaves half a
version behind:

- An **age** rule removes every version, within its filter, whose last completed write is older
  than the rule's age.
- A **count** rule keeps the N most recently written versions of each package within its filter
  and removes the rest.
- A version's **write time** is the time of the most recent completed write that touched any of
  its files. One clock serves both rule kinds, and under the default overwrite-allowed setting a
  republished version is live again, which is what that setting promises.
- A filter may name at most a package and a version (`{package}` or `{package}/{version}`). A
  rule whose filter reaches below a version is refused when it is configured, with a message
  saying retention deletes whole versions, rather than accepted and applied to something other
  than what its author wrote.
- **Several rules combine as a union of deletions**: a version is removed when any rule selects
  it, and no rule ever protects a version another rule selects (the resolved rule-combination
  decision below). Reading one rule is enough to know what it deletes.
- Immutability does not exempt a version from retention. It forbids in-place replacement, not
  removal.

**Where it runs.** Retention is not handler code. The pinned handler interface has no lifecycle
or background hook (`format-handler-interface.md`, "Deliberately absent"), and an age rule has
to fire while nobody is writing, so a request-scoped handler cannot run it. Its selection reads
only shared-model entities (package, version, file and snapshot write times), so it is a
format-agnostic pass in its own shared package, `internal/retention`, that deletes only through
the shared metadata-store deletion call and reads rules from core-parsed repository
configuration (the resolved retention-location decision below). Generic is its first consumer,
and a later format opts in by declaring retention in scope in its own spec rather than by
writing its own.

**When it runs.** The pass is a job of `async-operations.md`'s queue, kind `retention.pass`: one
`Schedule` per repository that has rules, an exclusivity key `repo:{repository}` so two passes
never evaluate one repository at once, and the schedule disabled while the repository is
`read_only` or once it is deleted (that spec's kind table, its AC28; `repository-lifecycle.md`
AC10 states the read-only refusal from its side). `internal/retention` therefore holds no
ticker or goroutine of its own; the runner enqueues, the pass evaluates and commits its one
write, and `thaw` re-enables the schedule.

**Concurrency.** A pass evaluates its rules against one snapshot and commits its deletions as a
single write. Any **package** written after that snapshot (a new file, an overwrite, a delete)
is excluded from the pass's deletions entirely and re-evaluated by the next pass. The exclusion
is per package rather than per version because a count rule's answer for one version depends on
its siblings: a concurrent delete of a package's newest version would otherwise let the pass
remove a version the rule, re-read, would keep. For every package not excluded, the version set
the pass commits against is exactly the one it evaluated, so the pass never deletes on a view it
did not see. A package written continuously between every pass is never cleaned while that lasts,
which is accepted: it is by definition in active use.

**What retention does not do to the store.** A pass deletes no object. It ends metadata
references by writing a snapshot; the removed versions' blobs stay live under
`storage-and-gc.md`'s third mark root while any snapshot inside the snapshot-retention window
still holds them, and under the fifth while a pointer targets such a snapshot. Two consequences
are stated so they are not discovered: retention adds **no mark root**, since a rule references
no content, and a retention policy does not free space on its own schedule. Storage is reclaimed
only after the snapshot-retention window (30 days by default) has also passed and a sweep has
run, so a "keep 7 days" rule frees its space after roughly 37. The snapshot-retention window
is `storage-and-gc.md`'s and is a different setting from the retention policies here, whatever
the shared word suggests.

### Capabilities and lifecycle

`Capabilities()` declares proxy support `unsupported` and reference-implementation availability
`none` (the two exemptions above), and `Virtual: supported` and `Rename: supported`
(`format-handler-interface.md` AC13; `repository-lifecycle.md` runs its virtual and rename cases
against both Tier 0 handlers). A virtual generic repository resolves a path in its first member
that holds it, and its listing is the members' listings merged by path, the first member
winning a path several hold, with the continuation token pinning every member's snapshot and
the virtual's own pointer generation, so a member-list change mid-walk fails the walk exactly
as a pruned snapshot does (the resolved virtual-listing decision below, was Q14; AC19). A rename
changes nothing this handler stores, since every reference is by repository identity. The lifecycle cases that spec places under `conformance/generic/`, all
driven by the real `curl` client, are `lifecycle_test.go` (a repository created through the API
serves from its first request, and answers `not-found` after deletion; `repository-lifecycle.md`
AC1, AC15), `readonly_test.go` (a `read_only` repository refuses PUT and DELETE `405`, keeps
serving GET bit-identically, and `thaw` restores both; its AC10), `virtual_detach_test.go` (a
member deleted with `detach: true` disappears from the virtual's resolution while the remaining
members keep serving; its AC18) and `rename_test.go` (its AC12, presence enforced by
`conformance-harness.md` AC26). `credential-management.md` AC5 adds `expiring_token_test.go`, a
token in state `expiring` still fetching through `curl`. AC16 gathers the generic half of each.

### What this format proves, and what it deliberately cannot

The proving-ground claim has to be honest about coverage. Exercised end to end: the harness
core loop, case schema, `setup` vocabulary and CI wiring; authenticated and unauthenticated
request handling, and pattern scopes over named objects; the CAS commit path and cross-path deduplication; snapshot-per-write and
snapshot-pinned reads; the delete-to-GC handoff; and retention as the first automated deleter.
**Not** exercised: chunked/resumable upload, the proxy and cache layers, mutable-metadata TTL
semantics, and the recording-proxy/replay-match machinery - there is no reference
implementation of this protocol to record, which is why this format is exempt from the
replay-match item rather than failing it. Those gaps fall to whichever format first needs each
mechanism (OCI and npm on current sequencing) and are stated here so "generic is green" is never
read as "the shared layers are proven".

### Path grammar

The grammar the owner settled (was Q3), stated so a refusal can name its rule: an artifact path
is `{package}/{version}/{file}` with `{file}` itself one or more segments; every segment is
non-empty, is neither `.` nor `..`, and is drawn from `[A-Za-z0-9._+-]`; the request path is
percent-decoded exactly once at the edge and must then equal its own normalisation (no doubled,
leading or trailing slash); and a PUT is refused when its path is a strict prefix of an existing
artifact's path or has an existing artifact's path as a strict prefix, in either direction, so no
name is ever both a file and a directory. A violation is `400` with a `text/plain` body naming
the rule and the offending segment. The grammar's repository segment is
`repository-lifecycle.md`'s name grammar, not this one.

Settled (below): paths are deep beneath a package and a version. A path is metadata resolved
through the shared model and never becomes a filesystem or object-store path; blobs stay keyed
by digest alone.
Every consequence that resolution priced in outline is now settled: the path maps onto the
shared model via the GitLab hybrid and the grammar is strict with file-versus-prefix collisions
rejected (both answered by the owner), and listing shape, overwrite semantics, retention scoping
and the replay-match exemption were adopted under the standing delegation (all below). The
conformance credential was settled by `auth.md` rather than here.

## Acceptance Criteria

- [ ] AC1: An authenticated client can PUT a file and GET back a byte-identical copy.
- [ ] AC2: An unauthenticated PUT is rejected, and an unauthenticated GET to a private
      repository is rejected, each answer carrying `Cache-Control: private, no-store` as
      `auth.md`'s resolved decision (was Q27) fixes for every response its layer writes.
- [ ] AC3: Uploading identical content to two different paths stores one blob (proves CAS
      deduplication through a real request path).
- [ ] AC4: Listing the repository root returns every artifact beneath the given prefix,
      recursively, each with its full path, size and digest, in byte order of path; the prefix
      matches whole segments only, so a listing for `ci` returns nothing stored under
      `ci-tools`.
- [ ] AC5: Retention removes exactly the versions its rules select and no others: an age rule
      removes the versions whose last write is older than its age, a count rule keeps the N most
      recently written versions of each package, a prefix filter confines a rule to the
      packages or version it names, several rules remove the union of what each selects, and a
      rule whose filter reaches below a version is refused at configuration with a message
      saying retention deletes whole versions.
- [ ] AC6: Every conformance case this spec names passes with at least two `curl` client
      versions pinned by image digest, satisfying the two-client-version rule in
      `format-handler-interface.md`'s definition of done; no case moves a clock
      (`conformance-harness.md` AC30), the one time-crossing assertion here (AC5's age rule)
      living in the owning layer's integration test.
- [ ] AC7: A HEAD request for an existing artifact returns the same status and headers
      (`Content-Length`, `ETag`, `Last-Modified` and `Cache-Control` included) as the
      corresponding GET, with no body, and the handler package contains no HEAD handling of
      its own; HEAD for a missing artifact returns the same status as the missing GET.
- [ ] AC8: After a DELETE, GET and HEAD for that path return 404 and the listing no longer
      includes it; deleting a version's last file removes the version from the listing too; the
      same path then accepts a new PUT in both overwrite modes, because generic retires no
      coordinate; and the same deletion driven through the management API's `delete-file`
      operation and through the format's `DELETE` route produces the same served state, exactly
      one snapshot each, and the same `delete` authorization outcome. Blob reclamation is
      asserted by `storage-and-gc.md`'s criteria, not here.
- [ ] AC9: Generic's definition of done is met with no recorded corpus: its `Capabilities()`
      declares proxy support `unsupported` and reference-implementation availability `none`,
      together with `Virtual: supported` and `Rename: supported`, and the generated conformance
      matrix renders its replay-match item as exempt citing this spec, never as passing, and its
      verification column `none` citing this spec.
- [ ] AC10: A paginated listing walk returns exactly one snapshot's artifact set: a walk during
      which another client PUTs a new artifact sorting before the current page and deletes one
      sorting after it returns every artifact of the snapshot the first page named, once each,
      and neither the new artifact nor the absence of the deleted one.
- [ ] AC11: Overwrite follows the repository's setting: by default a PUT of different content to
      an occupied path replaces it and GET returns the new bytes; in an immutable repository the
      same PUT is refused with 409 naming the immutability rule and GET still returns the
      original bytes; and in both modes a PUT of the content already stored at that path returns
      200 and leaves the listing's snapshot number unchanged.
- [ ] AC12: A retention pass is one atomic write that deletes nothing it did not evaluate: a pass
      removing several versions produces exactly one snapshot, a pass failing mid-commit removes
      none, and no version of a package written after the snapshot a pass evaluated is removed
      by that pass, proven by injected interleavings that, between evaluation and commit, write
      to a selected version and delete the newest version of a count-ruled package.
- [ ] AC13: Retention deletes no object and holds no handler logic: a retention pass issues no
      object-store delete, asserted at the store, and an architecture test fails if
      `internal/retention` imports a format handler package or the database or object-storage
      drivers directly.
- [ ] AC14: Pattern scopes narrow generic credentials as `auth.md` AC19 and AC24 state, in
      hosted mode (proxied support is declared unsupported): a token holding `pull` and `push`
      under the pattern `prod/*/app.tgz` PUTs and GETs `prod/1.0/app.tgz` and is refused on
      `prod-staging/1.0/app.tgz`, `prod/1.0/sub/app.tgz` and `staging/1.0/app.tgz`; the same
      actions under `prod/**` are accepted for `prod/1.0/sub/app.tgz`; a patterned token is
      refused the listing even when its `prefix` lies inside the pattern; a `delete` token
      patterned `prod/**` deletes `prod/1.0/app.tgz` and is refused on `staging/1.0/app.tgz`;
      and no refused request changes the stored artifacts or the listing's snapshot number.
- [ ] AC15: A GET the shared policy layer refuses answers `403` with a body naming the policy
      and its rule, which `curl --fail-with-body` prints, and the artifact is still served to
      the same request once the policy no longer refuses it.
- [ ] AC16: Through the real `curl` client, a repository created through the management API
      serves from its first request and answers 404 after deletion; a `read_only` repository,
      immutable or not, refuses PUT and DELETE with `405` while GET returns bit-identical bytes,
      and after `thaw` a PUT of different content to an occupied path is accepted in the mutable
      repository and still refused `409` in the immutable one; a renamed repository serves its
      artifacts under the new name while the old name answers 404 indistinguishably from a
      never-existing repository; and a virtual repository resolves a path from its first member
      holding it and, after a member is deleted with `detach`, from the remaining members only.
- [ ] AC17: Retention runs as the `retention.pass` job kind: a repository with rules has exactly
      one schedule, two passes never evaluate the same repository concurrently, no pass is
      enqueued for a `read_only` repository until `thaw` and none after deletion, and the pass's
      one snapshot commits only through the runner's fenced completion, so a pass whose lease
      was lost commits nothing.
- [ ] AC18: Every artifact and listing response comes from the serving door: a GET's `ETag` is
      the artifact's CAS digest and a matching `If-None-Match` answers `304` with no body; an
      overwrite changes the `ETag` and moves `Last-Modified` forward; `curl -r` on an artifact
      answers `206` with the exact requested bytes and a correct `Content-Range`, and a range
      past the end `416`; a listing page re-requested with its `ETag` answers `304` on an
      unchanged snapshot and `200` after a write; an anonymous GET on an anonymously readable
      repository carries `Cache-Control: no-cache`, the same GET with a credential, and every
      GET on a private repository, `private, no-cache`; and an architecture test fails if
      `internal/format/generic` sets `ETag`, `Last-Modified` or `Cache-Control` or reads a
      conditional or `Range` header itself.
- [ ] AC19: Listing a virtual generic repository returns the union of its members' artifacts by
      path, once each, a path held by several members reported with the first member's size and
      digest, in byte order across members, paginated under the same snapshot pinning as a
      local; a member added or removed during a walk fails the next page with an error naming
      the member-list change, never a page merged from a different member set; `configure`
      with a `settings` document on a virtual is refused `repository-type`.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/generic/hosted_test.go` |
| AC2 | conformance | `conformance/generic/auth_test.go` |
| AC3 | integration | `internal/format/generic/dedup_test.go` |
| AC4 | conformance | `conformance/generic/listing_test.go` (recursive listing, byte order, segment-aligned prefix against a `ci` and a `ci-tools` package) |
| AC5 | integration | `internal/retention/retention_test.go` (injected clock, permitted because this is the owning layer's integration test and no harness case, `conformance-harness.md` AC30; generic repositories seeded through the shared model; age, count, prefix-filter, union and refused-filter cases) |
| AC6 | ci | conformance job |
| AC7 | conformance + architecture test | `conformance/generic/hosted_test.go`; `internal/format/generic/arch_test.go` (no HEAD dispatch in the package; shared with AC18's header assertion) |
| AC8 | conformance + integration | `conformance/generic/hosted_test.go` (delete, then re-PUT in both modes); `conformance/generic/manage_binding_test.go` (twin artifacts in one `script`: one deleted through the operations endpoint, one through `curl -X DELETE`, real `curl` then 404s both; the `script`-driven case `management-api.md` AC24 requires for `delete-file`); `internal/format/generic/operator_test.go` (snapshot count per entry point, `delete` grant, empty `Outcome` retirement set; shared with `management-api.md` AC27's `internal/manage/operator_test.go`); `conformance/generic/configure_test.go` (the `script`-driven `configure` case `management-api.md` AC24 requires: flip `immutable` through `PATCH`, real `curl` refused `409` after and accepted before; an unknown settings field refused `validation`) |
| AC9 | unit | `internal/format/generic/capabilities_test.go` (the four declarations, `format-handler-interface.md` AC13); `conformance/core/matrix_test.go` (the exempt replay-match rendering and the `none` verification column, `conformance-harness.md` AC20, `artifact-verification.md` AC24) |
| AC10 | conformance | `conformance/generic/listing_test.go` (a `curl` script that pages with a small page size and writes between pages) |
| AC11 | conformance | `conformance/generic/overwrite_test.go` (repositories provisioned mutable and immutable through `setup`) |
| AC12 | integration | `internal/retention/retention_test.go` (snapshot count, fault-injected commit failure, the two injected interleavings) |
| AC13 | integration + architecture test | `internal/retention/retention_test.go` (object-store delete spy); `internal/retention/arch_test.go` |
| AC14 | conformance + unit | `conformance/generic/auth_test.go` (the pattern-refusal case `format-handler-interface.md` AC7 requires, the grammar cases, and the refused listing `auth.md` AC24 names; pattern-scoped tokens provisioned through the `credentials` key); `internal/format/generic/scope_object_test.go` (the object table, per route, `format-handler-interface.md` AC12) |
| AC15 | conformance | `conformance/generic/policy_test.go` (a rule provisioned through the harness's `policies` key; written when the policy layer lands at charter step 4b; what `curl` shows replaces the `pending` binding-table row in the same change, `supply-chain-policy.md` AC20) |
| AC16 | conformance | `conformance/generic/admin_test.go` (`management-api.md` AC19), `conformance/generic/lifecycle_test.go`, `conformance/generic/readonly_test.go` (mutable and immutable repositories provisioned `read_only` through the `repositories` entry's `state`, thawed from `script`), `conformance/generic/rename_test.go`, `conformance/generic/virtual_detach_test.go` (`repository-lifecycle.md` AC1, AC10, AC12, AC15, AC18, shared) |
| AC17 | integration | `internal/retention/schedule_test.go` (one schedule per ruled repository, exclusivity under two runners, disabled on `read_only` and on deletion, re-enabled on `thaw`, lost-lease commit refused; shared with `async-operations.md` AC28 and `repository-lifecycle.md` AC10) |
| AC18 | conformance + architecture test | `conformance/generic/serving_test.go` (`curl` with `-i`, `-r`, `--etag-compare`; a public and a private repository provisioned through `setup`; shared with `signing-service.md` AC38's `head_test.go` cases for the hosted path); `internal/format/freshness_boundary_test.go` (`signing-service.md` AC11, covers this package) |
| AC19 | conformance | `conformance/generic/virtual_listing_test.go` (two members with an overlapping path, a `curl` walk with a small page size, a member detached between pages; the `repository-type` refusal through `PATCH`) |

## Implementation Phases

### Phase 1: Hosted surface
- PUT, GET, HEAD, listing and DELETE, with conformance cases as the harness's first real subject
- Segment-aligned prefixes and snapshot-pinned listing pagination
- The overwrite setting and the same-content idempotent PUT
- `Capabilities()` declaring proxy `unsupported`, reference-implementation availability `none`,
  `Virtual: supported` and `Rename: supported`
- The per-route addressed-object declaration and the pattern-scope cases
- Every read through `ServeFile` and `ServeRendered` with the two serve policies, and no header
  code in the package (AC7, AC18); the merged virtual listing (AC19)
- `DELETE` as the binding onto `management-api.md`'s `delete-file`, the handler's `Operator` with
  that kind and `configure` and an empty retirement outcome (AC8); the operator API and lifecycle cases as
  `management-api.md` Phase 1 and `repository-lifecycle.md` Phases 1 and 2 land at charter
  steps 2 and 3 (AC16)

### Phase 2: Retention
- The format-agnostic retention pass in `internal/retention`, reading core-parsed repository
  rules, with the integration tests proving exact-set deletion, single-write atomicity and the
  per-package concurrent-write exclusion
- Scheduling as the `retention.pass` kind on `async-operations.md`'s queue, one schedule per
  ruled repository, disabled while `read_only` or deleted (AC17); until the queue core lands at
  charter step 4b the pass runs under the fixture runner that spec names, never a ticker of its
  own

### Phase 3: Policy refusal rendering
- Waits on `supply-chain-policy.md`'s enforcement (charter step 4b); the `403` rendering of the
  typed refusal and its conformance case

## Tasks

Left empty by design. Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. Q4 to Q7 were adopted on 2026-09-26 under the owner's standing delegation, and folding
them exposed five further judgment calls (Q9 to Q13), each written in the decision shape and
adopted the same way; Q14 was adopted the same way at the 2026-10-08 gate review; the owner may
reverse any of them. Q2 and Q3 were answered by the owner on 2026-09-23. Resolved decisions are
kept rather than deleted, so the reasoning survives the next time someone asks why it was done
this way.

### Resolved: listing a virtual generic repository (was Q14)

**Adopted 2026-10-08 under the owner's standing delegation.** Raised at the gate review:
`Capabilities()` declares `Virtual: supported` and a virtual resolves artifact paths in its first
member, but the listing route, the one route with no addressed object and the one scripts
mirror from, said nothing about a virtual.

**Recommendation:** A, merge the members' listings by path with the first member winning,
because it is the listing that agrees with what GET through the same virtual returns, and the
snapshot pinning already in the token extends to one snapshot per member.

| Option | You get | It costs |
|---|---|---|
| **A. Merged listing: union by path, first member wins, token pins every member's snapshot and the virtual's pointer generation** (adopted) | A listing consistent with the virtual's GET; mirror scripts and the UI work against a virtual as against a local | A k-way merge per page; a member-list change mid-walk fails the walk, which the client restarts |
| **B. Refuse the listing on a virtual** | Nothing to specify | A virtual cannot be browsed or mirrored, which is most of what a generic virtual is for |

**Why this is yours:** it is a public listing contract users will script against.

Accepted cost: a walk across a member-list change restarts. B lost because it makes a virtual
useless to the scripts that use the listing most. Specified in Design ("Capabilities and
lifecycle") and asserted by AC19.

### Resolved: listing shape (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: one flat, recursive
listing on the repository root, filtered by a segment-aligned prefix and paginated, specified in
Design ("Protocol surface", "Prefixes are segment-aligned") and asserted by AC4 and AC10.

Accepted cost: a large repository answers in many pages, and there is no server-side one-level
directory view; a UI derives one from the flat list. Option B lost because it spends endpoint
surface and conformance cases now on a UI that does not exist, and a one-level view can be
added later without changing the flat listing, while the reverse is not true of clients built
against B. Folding this exposed how pages stay consistent under writes (Q9) and that the prefix
must match whole segments, which the segment-aligned section records because the byte-prefix
alternative fails retention's safety argument rather than being a matter of taste.

| Option | You get | It costs |
|---|---|---|
| **A. Flat recursive list with `prefix` filter and pagination** (adopted) | One simple endpoint; AC4 stays trivially testable; a UI can build trees client-side | Long result sets for big repositories; no server-side one-level view |
| **B. Directory-style: one level per request, S3-delimiter fashion** | Natural navigation and bounded responses | More endpoint surface to spec and test now, in service of a UI that does not exist yet |

### Resolved: PUT to an occupied path (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option C: a per-repository
setting, overwrite allowed by default, with an immutable mode refusing replacement with `409
Conflict`. Specified in Design ("Overwrite and immutability") and asserted by AC11.

Accepted cost: a configuration axis that doubles the conformance cases touching writes, which
AC11 pays by running the write cases against a mutable and an immutable repository. Immutability
was also given a precise edge while folding: it forbids in-place replacement, not deletion, so a
caller holding `delete` can still delete and re-upload. Option A lost because it offers no
immutability anywhere in the format, and B because it breaks the republished-build workflow that
is this format's stated use case. Folding exposed what a same-content re-PUT means under
immutability (Q10).

| Option | You get | It costs |
|---|---|---|
| **A. Last-write-wins always** | Matches curl ergonomics and republished-`latest` flows | No immutability guarantee anywhere in the format |
| **B. Immutable always: conflict response, delete first** | Strong guarantees, simplest reasoning | Breaks the most common generic-repository workflow |
| **C. Per-repository setting, overwrite by default** (adopted) | Both workflows | A configuration axis that doubles the conformance cases touching writes |

### Resolved: retention scoping unit (was Q6)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: rules attach to the
repository, each with an optional prefix filter. The grouping key its cost row left open is
fixed by the resolved mapping: a rule counts and deletes **versions**, a count rule counts within
a **package**, filters are segment-aligned and reach at most `{package}/{version}`, and one
clock, a version's last completed write, drives both rule kinds. Specified in Design
("Retention") and asserted by AC5.

Accepted cost, and it is larger than the option priced: "needs no new entity" still holds, but
"no new schema" does not. Retention cannot run inside the handler (Q11), so its rules must be
configuration the core parses, not the handler-owned repository metadata document; that is a
change to `data-model.md`'s `Repository`. A rule also cannot select packages by a name pattern
such as "every package starting `ci-`": it names one package or the whole repository. Option B
lost because its configuration multiplies with packages and orphans when a prefix disappears,
and because it needs a policy entity the shared model does not have.

**On the GC mark roots, since this was flagged as the question that touches them:** it adds
none. A rule references no content, and a retention pass ends references by writing a snapshot,
which the existing third and fifth roots already govern. What it does change is expectation: a
retention policy frees space only after the snapshot-retention window has also passed, which
Design states so a "keep 7 days" rule is not read as freeing space in 7.

| Option | You get | It costs |
|---|---|---|
| **A. Per-repository rules with optional path-prefix filters** (adopted) | Covers "keep 30 days of `ci/`" with no new schema; all rules visible in one place | "Keep last N" still needs a defined grouping key (Q2's unit) to count within |
| **B. Policies attach to Q2's grouping unit directly** | "Last N per package" is the natural reading | Retention configuration multiplies with packages, and policies orphan when a prefix disappears |

### Resolved: replay-match exemption (was Q7)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a formal, named
exemption from `format-handler-interface.md`'s definition-of-done item 2, which applies only
where a reference implementation exists. It mirrors the proxy exemption in all three of its
parts: this spec records it (Scope), `Capabilities()` declares it machine-readably so no second
hand-maintained list can drift from it, and the conformance matrix renders it as exempt, never as
passing (`conformance-harness.md` AC20). Asserted here by AC9.

Accepted cost: a second named exception to the interface contract, and a precedent later formats
may try to claim. The precedent is contained the same way the proxy one is: only a format whose
own spec records the exemption may declare it, and generic is the only such format. Option B
lost because a corpus recorded from our own first implementation carries day-one bugs with the
authority the harness reserves for external ground truth, and the regression protection it
offers is already given by the conformance cases themselves. The amendment to item 2 and the new
`Capabilities()` field belong to `format-handler-interface.md` and are made there, not here.

| Option | You get | It costs |
|---|---|---|
| **A. Formal exemption: replay-match applies only where a reference implementation exists** (adopted) | An honest definition of done, no ritual testing | A second named exception to the interface contract, and a precedent later formats may try to claim |
| **B. Record a corpus from our own first implementation as a regression baseline** | Response-shape regression protection for free | The corpus enshrines day-one behavior, bugs included, with the authority the harness reserves for external ground truth |

### Resolved: listing pagination under concurrent writes (was Q9)

**Adopted 2026-09-26 under the owner's standing delegation.** Raised while folding the listing
shape, which said "pagination" without saying what a page walk returns while writes land.

**Recommendation:** A - pin the walk to the snapshot the first page read, because the data model
already makes every read resolve an immutable snapshot, so consistency costs one number in the
continuation token.

| Option | You get | It costs |
|---|---|---|
| **A. Continuation token pinned to the first page's snapshot** (adopted) | A walk returns exactly one snapshot's set, never a skipped or duplicated entry; the mechanism already exists | A walk outliving its snapshot's pruning fails and must restart; the token is opaque rather than a page number |
| **B. Offset or page-number pagination over live state** | Familiar, and a client can jump to page N | A write between pages shifts the ordering, so entries are silently skipped or duplicated, which is the listing a retention audit or mirror script trusts |

**Why this is yours:** it is a public API contract users will script against.

Accepted cost: the token is opaque, and a walk longer than the snapshot-retention window fails
loudly. B lost because silent skips are undetectable by the client and land exactly on the
scripts that trust a listing most. Asserted by AC10.

### Resolved: same-content re-PUT (was Q10)

**Adopted 2026-09-26 under the owner's standing delegation.** Raised while folding the
overwrite setting: a PUT of exactly the stored bytes is a replacement in form and a no-op in
fact, and the immutable mode must say which.

**Recommendation:** A - an idempotent success in both modes that is not a write, because a CI
retry after a lost response is the commonest way to re-send identical content.

| Option | You get | It costs |
|---|---|---|
| **A. Same digest is an idempotent `200 OK` in both modes; no snapshot, no write-time refresh** (adopted) | Retries are safe against immutable repositories; no snapshot churn from no-op uploads | A re-PUT cannot be used to refresh a version's retention age; that needs different content or nothing |
| **B. Same digest is a conflict in immutable mode, a write in the default mode** | The simplest rule to state | Retrying CI jobs fail spuriously against immutable repositories, and every retry in the default mode creates an empty snapshot |

**Why this is yours:** it is part of the overwrite promise users automate against.

Accepted cost: a no-op re-PUT does not keep a version alive under an age rule. B lost because it
punishes the retry that is the whole reason uploads need to be idempotent. Asserted by AC11.

### Resolved: where retention runs (was Q11)

**Adopted 2026-09-26 under the owner's standing delegation.** Raised while folding the scoping
unit: the pinned handler interface has no lifecycle or background hook, and an age rule must
fire while nobody is writing, so retention cannot be handler code as the old Phase 2 assumed.

**Recommendation:** A - a format-agnostic pass in its own shared package, because its selection
reads only shared-model entities, and the constitution puts cross-format behaviour outside
handlers.

| Option | You get | It costs |
|---|---|---|
| **A. A shared `internal/retention` pass over shared-model entities, rules as core-parsed repository configuration** (adopted) | No interface change; every later format gets retention by opting in; the deleter is one reviewable package held by an architecture test | Rules become schema the core parses, a change to `data-model.md`; a shared package is designed from one consumer |
| **B. Add a lifecycle or scheduled-work hook to the handler interface** | Retention stays in the format that wants it; rules stay in the handler's own document | Reopens the pinned method set outside the scheduled re-open, which the interface spec forbids, and invites every format to grow its own deleter |
| **C. Trigger retention only on write** | No scheduler; count rules fire when the N+1th version lands | Age rules never fire on an idle repository, so AC5 is unsatisfiable |

**Why this is yours:** it places a deleter in the architecture and amends the shared schema.

Accepted cost: a data-model amendment for core-parsed retention rules, and a shared package whose
shape comes from one consumer, mitigated by keeping it to the rules generic needs. B lost to the
interface spec's pin, C to the age rule. Asserted by AC13.

### Resolved: generic's write boundaries and the retention pass (was Q12)

**Adopted 2026-09-26 under the owner's standing delegation.** `data-model.md` requires every
handler spec to declare its write boundaries, including how a bulk cleanup groups, and this spec
declared none.

**Recommendation:** A - each PUT and DELETE is one write, and one retention pass over one
repository is one write evaluated against one snapshot with written packages excluded, because
it makes a pass atomic and keeps a large cleanup from minting thousands of snapshots.

| Option | You get | It costs |
|---|---|---|
| **A. One snapshot per retention pass per repository, per-package exclusion of concurrent writes** (adopted) | Atomic cleanups; snapshot count proportional to passes, not deletions; a pass never deletes on a view it did not see | A pass that fails commits nothing; a package under continuous writes is not cleaned while that lasts |
| **B. One snapshot per deleted version** | Each deletion independently visible and revertible | A large cleanup floods the snapshot history, and a pass interrupted halfway leaves a half-applied policy |
| **C. One write conditioned on the whole repository being unchanged, retried on conflict** | The simplest condition to state | A busy repository starves retention entirely, since any write anywhere voids the pass |

**Why this is yours:** it fixes how cleanup appears in the history users roll back through.

Accepted cost: a continuously written package is skipped until it pauses. B lost on history
flooding and half-applied passes, C on starvation. Asserted by AC12.

### Resolved: how several retention rules combine (was Q13)

**Adopted 2026-09-26 under the owner's standing delegation.** Raised while folding the scoping
unit: per-repository rules with filters means several rules per repository, and their
interaction was undefined, which left AC5's "exactly" unfalsifiable a second time.

**Recommendation:** A - a union of deletions, because then each rule is understood by reading
it alone.

| Option | You get | It costs |
|---|---|---|
| **A. Union: a version is removed when any rule selects it** (adopted) | Each rule means what it says in isolation; the result is the plain union AC5 can assert | "Keep releases forever, delete the rest after 30 days" is written as a filtered rule on the other packages, not as a protect rule |
| **B. Protect rules: a version any rule keeps survives** | Expresses keep-forever exceptions directly | Every rule's effect depends on every other rule, so adding one can silently disable deletion elsewhere |

**Why this is yours:** it is the semantics operators configure destructive policy against.

Accepted cost: exceptions are expressed by scoping, not by protection. B lost because a rule
that silently neutralises another is the failure an automated deleter cannot afford. Asserted by
AC5.

### Resolved: mapping onto the shared model (was Q2)

**Settled 2026-09-23: the GitLab hybrid.** Package name and version are mandatory path
segments; the filename may itself contain a relative path, so directory structure is preserved
*inside* a version:

```
PUT /generic/{repository}/{package}/{version}/{path/to/file.tar.gz}
```

Grounded in what the field actually does. JFrog Artifactory Generic and Nexus Raw are
filesystem-style, with the path as the whole identity and no version semantics. Gitea is strictly
`{package}/{version}/{filename}` and its documentation is explicit that arbitrary nested paths
are **not** accepted. GitLab requires package and version but permits a relative path inside the
filename. The hybrid keeps retention-by-version-count meaningful and listing well-scoped while
still letting teams mirror a build layout.

Accepted cost: this **narrows the earlier arbitrary-depth resolution**. Depth still exists, but
beneath a package and a version rather than being the identity itself. That earlier decision has
been amended to match rather than left to contradict this one.

### Resolved: path grammar (was Q3)

**Settled 2026-09-23: a strict grammar, with file-versus-prefix collisions rejected.** A
defined character set, no empty or dot segments, normalisation on write, and storing `a/b` when
`a/b/c` already exists is an error.

This closes a whole class of listing and retention ambiguity at the cost of rejecting some
uploads that look legitimate. Since the permissive alternative is genuinely irreversible once
users depend on it, the rejection message must say exactly which rule was broken and why.

### Resolved: conformance credential (was Q8)

**Settled 2026-09-23 by `auth.md` rather than independently.** The generic conformance client
presents a registry token scoped to its repository, as `Authorization: Bearer`. Generic is our own
protocol, so there is no external client convention to match and no trade-off to weigh.

Repositories are private by default, so the unauthenticated and unauthorized cases required of
every format (`format-handler-interface.md` AC7) are meaningful here from the first commit.

### Resolved: path depth (was Q1)

**Settled 2026-09-22, narrowed 2026-09-23: deep paths, beneath a package and version.** Teams
mirror directory layouts regardless, and forbidding it only pushes the hierarchy into filenames.

The original wording said "arbitrarily deep", which on its own selected the Artifactory Generic
model where the path is the whole identity. The mapping decision below adopted the GitLab hybrid
instead, so depth now lives inside the filename segment under a mandatory package and version.
Amended here rather than left standing, because two resolutions contradicting each other in one
spec is exactly the drift these records exist to prevent.

Accepted cost: listing, retention scoping and the future UI all become meaningfully more complex.
Security position is unchanged either way: blobs stay digest-keyed, so an artifact path is
metadata and never becomes a filesystem path.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-22 | afbb4e4 | adversarial + constitution + go-spec-reviewer (claim verification vacuous pre-code) | Added Design, HEAD/DELETE criteria (AC7/AC8) and two-client-version alignment; raised Q2-Q8 (model mapping, path grammar, listing, overwrite, retention scoping, replay exemption, auth gap); flagged cross-spec gaps (runner mode-check vs `unsupported`, harness Phase 2 claims generic proxied cases); stays draft. |
| 2026-09-23 | 9c971d4 | cross-spec consistency (proxy exemption propagation) | Replaced the stale unresolved sibling claim with the settled `Capabilities()` and harness AC11 contract; the format's existing open questions still keep it draft. |
| 2026-09-26 | 4d1aeb1 | folding adopted recommendations under the standing delegation | Not a review: adoption and fold. Adopted Q4 option A (flat recursive listing on the repository root with a segment-aligned prefix), Q5 option C (overwrite by default, immutable mode refusing replacement with 409 but not deletion), Q6 option A (per-repository rules; the version is the deleted unit, count rules count within a package, filters reach at most `{package}/{version}`, one last-write clock), Q7 option A (formal replay-match exemption mirroring the proxy one: spec record, `Capabilities()` declaration, matrix renders exempt). Folding exposed and adopted Q9 (pagination pinned to the first page's snapshot), Q10 (same-digest re-PUT is an idempotent 200 in both modes, not a write), Q11 (retention cannot be handler code under the pinned interface, so it is a format-agnostic `internal/retention` pass over shared entities with core-parsed rules), Q12 (declared write boundaries: one snapshot per PUT, DELETE and retention pass, with per-package exclusion of concurrent writes) and Q13 (rules combine as a union of deletions). Design rewritten around these, including the statement that retention adds no GC mark root and frees space only after the snapshot-retention window. AC4, AC5 and AC8 rewritten; AC9 to AC13 added with Test Plan rows; phases and `covers` updated. Sibling amendments reported rather than made: format-handler-interface.md (a `Capabilities()` reference-implementation field and definition-of-done item 2), data-model.md (core-parsed retention rules on `Repository`). |
| 2026-09-26 | da0aecd | cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Applied: the per-route addressed-object table `auth.md` requires (artifact path named on PUT, GET, HEAD and DELETE; listing none, so a patterned token cannot list, its AC24), with AC14 carrying the pattern-refusal case `auth.md` AC8 requires, the AC19 grammar cases one segment deeper, and the refused listing, in `conformance/generic/auth_test.go` plus the per-route table test; the supply-chain per-format rendering of the typed policy refusal (403, `text/plain` naming the policy; AC15, Phase 3 after charter step 4b); the 'Depended on' paragraph now cites the charter's step-2 management surface core and the owed `management-api.md`, and the harness seed path. Found already done: the data-model side of retention (core-parsed rules on `Repository`, per-version last-write time) landed in the foundation reconciliation. Nothing else queued for this file. Stays draft. |
| 2026-09-28 | a6d72b3 | cross-spec reconciliation of the foundation wave. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` naming this file verified against the current text of its source spec before applying. From the management-api authoring (items 8, 11, 12) and its reconciliation table: the "Depended on" paragraph cites `management-api.md` Phase 1 (`POST`/`PATCH /api/v1/repositories`, retention rules core-parsed, immutability as the handler's `settings` document dispatched as `configure`, its AC19) and `conformance/generic/admin_test.go`; `DELETE` is a binding onto the `delete-file` kind, the handler's one declared `Operator` kind, retiring nothing in either overwrite mode, with the reason (the resolved overwrite decision already permits delete-and-re-upload; no lockfile binds a generic path), so no `Retirement` record is written; AC8 extended with the re-PUT and the twin-entry-point binding case that its AC24 requires. From the repository-lifecycle authoring (items 15 and 18) and the format-handler-interface reconciliation (item 3): `Capabilities()` declares `Virtual` and `Rename` supported (AC9 extended; new "Capabilities and lifecycle" section), immutability stated as distinct from `read_only` with both able to hold, and the `lifecycle_test.go`, `readonly_test.go`, `virtual_detach_test.go`, `rename_test.go`, `admin_test.go` and `expiring_token_test.go` cases gathered as AC16. From the async-operations authoring (item 9, re-raised by the upstream and async reconciliation as still unapplied): the pass is the `retention.pass` kind, one `Schedule` per ruled repository, exclusivity key `repo:{repository}`, disabled while `read_only` or deleted (Design "When it runs", AC17, Phase 2). From the artifact-verification authoring (item 16) and catalogue AC7: this format asks for no verifier entry and the matrix's verification column reads `none` (Scope, AC9). From the supply-chain reconciliation (item 11) and Open item 5: the refusal goes through `WriteRefusal` with the shared status-line phrase (was Q10, AC18) and AC15's case fills the `pending` binding-table row (its AC20, harness AC26). Found already done: the harness and generic fold's items (data-model retention rules, applied at the foundation reconciliation) and the auth and interface fold's item 2 (applied at da0aecd). No question raised. `node scripts/check-spec.js` zero failures for this file. Stays draft pending a gate review. |
| 2026-10-08 | b10d639 | Fable gate review: full review (claim verification of every cited sibling criterion at HEAD, adversarial lens on the PUT/GET/HEAD/DELETE surface, the overwrite modes and the immutability switch, the delete-file binding, retention, Range and listing; constitution compliance) + the foundation decisions landed since a6d72b3 folded (signing-service was-Q14, was-Q24, was-Q25 and AC38; auth was-Q27; management-api was-Q13 to Q21; conformance-harness was-Q7, was-Q8, AC28, AC30). Resumed after a session kill: the 11-line Scope edit kept and its forward references written. | Every cited sibling AC re-verified at HEAD (management-api AC19, AC24, AC27; lifecycle AC1, AC10, AC12, AC15, AC18; async AC28; auth AC8, AC19, AC24; FHI AC4, AC7, AC12, AC13, AC14; harness AC11, AC20, AC26; artifact-verification AC24; catalogue AC7; credential-management AC5; supply-chain AC18, AC20; data-model AC35; storage AC21), all still at the cited numbers. Findings fixed: (1) the handler declared `delete-file` as its only kind while its immutability switch travels as a `settings` document, which management-api refuses `validation` for a handler with no `configure`, so the switch could never be set; `configure` is now declared with the document `{"immutable": bool}`, a `script` case and the rename-notice rule (new section "The handler's `Operator` kinds", AC8's row). (2) Nothing said how artifacts and listings are served: every read now goes through `ServeFile` and `ServeRendered` with two declared serve policies (`exact`, `no-cache`, ranges on artifacts), HEAD is the door's (was-Q24), cacheability narrowed to `private` on private repositories and authenticated requests (was-Q25, AC38), no header code in the package (AC11's boundary test); new AC18 with a conformance case and the architecture test; AC7 reworded onto the door. (3) The path grammar the owner settled was recorded only as a summary; its rules are now stated so a `400` can name one (segment set, no dot or empty segment, single percent-decoding, both directions of the file-versus-prefix collision). (4) `Virtual: supported` was declared with no listing semantics for a virtual: Q14 raised and adopted under the standing delegation (merged by path, first member wins, token pins every member's snapshot and the virtual's pointer generation; new AC19). (5) Central refusals on the wire are rendered in this format's `text/plain` shape (management-api was-Q16), so the `405` read-only sentence no longer promises a problem type on a `curl` route; the PUT is never spooled (was-Q20) and declares its path as its claim (was-Q14); the DELETE binding is exactly as wide as its operation (was-Q13, AC8); the same-content re-PUT cites was-Q15's shape while recording nothing, being no operation. (6) AC2 asserts `private, no-store` on the authentication layer's answers (auth was-Q27). (7) AC6 claimed conformance cases "for all of the above" while AC3, AC5, AC12, AC13 and AC17 are integration tests; reworded, and the one injected clock (AC5) placed in the owning layer per harness AC30, no harness case crossing time. Adversarial pass found nothing else blocking: the delete-and-re-upload hole in immutability is priced and gated on a separate `delete` grant; retention's per-package exclusion holds under the count rule; a listing walk outliving its snapshot fails loudly. No corpus half is recorded for this format, so harness AC28's exception list needs no generic row (reported for the harness to confirm). Zero open questions, 19 criteria each with a Test Plan row; `node scripts/check-spec.js` zero failures for this file. draft -> planned. |
