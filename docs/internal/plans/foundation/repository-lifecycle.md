---
status: draft
status_description: "Sweep 2026-09-28 at 6e6d503 (not a review): deletion cancels jobs through CancelByRepository (async AC28, AC21 shared); the reserved segment `t` refused as a name (AC2); signing-service AC29, artifact-verification AC29 and proxy-cache AC23 cited where this spec had queued them. Reconciled 2026-09-28 at 0b79dc8 with the foundation authoring wave (not a review), after the 2026-09-27 grounded first draft. Every sibling consequence this spec reported to a reconciled sibling is now a citation: data-model.md carries the identity, lifecycle columns and tombstone (AC38, sharing AC3's schema test), storage-and-gc.md holds the deleter scan, the property suite and the sole write-transaction constructor with deletion as its named exemption (AC15, AC24, AC25), management-api.md carries the three problem types, the lifecycle routes and the admin-only ?state=deleted listing (was Q11), format-handler-interface.md declares Virtual and Rename (AC13) surfaced through GET /api/v1/formats, replication.md's applier is the one importer of the ErrReplica-waiving entry point (405 replica) and its link is updatable and ends with reason deleted (AC12, AC22), proxy-cache.md AC23 shares AC11's read-only remote case, supply-chain-policy.md's policy document and advisory_ecosystem are core-held configuration dropped at tombstone (AC22), the harness seeds read_only and recreated names and enforces rename_test.go (AC24, AC26), and observability.md's repository.* audit vocabulary and repositories{format,repository_kind,state} gauge are asserted by AC27; the charter places Phases 1 to 3 at steps 2, 3 and 4. Items for signing-service.md, artifact-verification.md, async-operations.md and upstream-adapters.md remain queued there. Nine questions adopted under the owner's standing delegation; zero open. 27 criteria, each with a Test Plan row. Awaits a gate review."
description: "Spec for the repository lifecycle: creation of local, remote and virtual repositories with their type-specific settings, configuration changes and which of them are completed writes, renaming and what it does to identities, tokens, grants, replication links and client URLs, the read-only state, deletion as a reference-ending write whose space returns only through pruning and the sweep, deletion's effect on pointers, snapshots, cached content, upload sessions, jobs, keys, trust sets, links and virtual membership, and the reuse of a name after deletion."
author: michielvha
goal: "Give every repository one lifecycle with one enforcement point, so that creating, renaming, freezing and deleting a repository of any format and type does exactly what the shared model says on both paths, deletes no object outside the sweep, never reattaches a stale grant or token, never leaves a virtual repository silently serving less, and is provable on an injected clock before the first handler that depends on it ships."
priority: high
issue: 50
created: 2026-09-27
covers:
  - "internal/repository/**"
fable_recheck: "authored in the 2026-09-27 cloud session, whose model is not recorded; needs a Fable authoring-quality review before any gate"
---

# Plan: Repository Lifecycle

One package, `internal/repository`, owns what a repository *is* over time: it comes into being with
a generated identity and a name, may be reconfigured, renamed or frozen, and ends as a reference
release whose bytes return only through `storage-and-gc.md`'s pruner and sweep. Every other spec
that keeps a per-repository record (tokens and grants, signing keys, trust sets, replication links,
jobs, policy rules, upstream bindings) is told here, by name, what a rename and a deletion do to
that record, and `management-api.md` remains the wire through which an operator asks for any of
it. The state machine has three states and one writability predicate every write path consults,
and the enforcers are architecture and schema tests, not review.

## Context

The storage-and-gc gate review recorded that repository deletion existed in no spec at all, and
`agents/spec-loop/foundation.tsv` queued this document to close that gap. Since then
`management-api.md` decided the wire and one semantic (its resolved repository-deletion decision,
was Q7: deletion releases pointers and marks the repository deleted, snapshots age out under the
retention window, `reclaim: now` sets that window to zero, and every byte still returns through
the pruner and the sweep). This spec does not re-decide any of that. It owns everything around it
that the wire cannot say: what deleting actually does to each record that names the repository,
how the three types differ, what a rename is, what read-only means, and how each path relates to
the deletion-intent barrier.

Who depends on this, and what each already requires:

- `management-api.md`, "Repository administration": create (name, format, type, visibility,
  retention rules, upstream, members, `settings` validated through the handler's `Authorize`
  and `Apply` with kind `configure`), update by `PATCH` with format and type changes refused,
  delete as summarised above, AC19 and AC20. Its Scope names repository administration as the
  charter's step 2 core; this spec is the semantics that core implements.
- `data-model.md`: the `Repository` entity ("name, format, type, visibility, metadata document,
  retention rules"; "the unit of RBAC"), the default pointer that "advances to the newest
  snapshot on each completed write" and is "not deletable", `VirtualMember` (position is the
  resolution order), `Upstream` bound one-to-one to a `remote`, `ReplicationLink` on a `local`
  only, `Operation`, and the rule that a write which ends references "adds no mark root and
  deletes no object" (its retention-pass paragraph). Since the reconciliation it also carries
  this spec's columns and shapes in "Repository identity and lifecycle state" (identity as the
  primary key, the partial unique index on `name`, the lifecycle columns, the tombstone, the
  initial and final empty checkpoint snapshots on every type) and asserts them in its AC38,
  whose `internal/model/schema_test.go` is the same test AC3 here names.
- `storage-and-gc.md`: the fifth mark root (a pointer-targeted snapshot and its reconstruction
  chain), AC15 (no code path outside the sweep's delete pass and the orphan scan deletes an
  object), AC18 (deleting a pointer releases the root and serialises with pruning), the
  repository-scoped touch-refreshed grace, its AC15 scan naming `internal/repository` among the
  packages it holds to "management operations and repository deletion are reference-ending
  paths, never deleters", its AC24 (the lifecycle operations in the GC property suite), its AC25
  (the sole write-transaction constructor calling `repository.Writable`, with repository deletion
  as the one named exemption) and its AC23, under which an unfinished `Job` naming a repository
  holds its grace open.
- `auth.md`: "A scope binds to the repository's identity, never its name: a deleted and
  recreated repository of the same name is a new repository, and tokens scoped to the old one
  grant nothing on it"; a grant "binds the repository's identity, so it grants nothing on a
  recreated repository of the same name"; AC29's multi-repository token names each repository
  by identity; the admin role "alone creates and revokes grants, creates repositories and
  changes a repository's visibility"; repositories are private by default and "absence fails
  closed".
- `credential-management.md` AC20: a credential scoped to a repository that is deleted and
  recreated under the same name "stays listed with its scope naming the deleted repository,
  grants nothing on the recreated one, and a listing or read of it does not fail". That fixes
  a requirement on this spec: the deleted repository's identity and name must remain
  resolvable after deletion.
- `signing-service.md`: keys are per repository (its resolved key-scope decision, was Q6),
  `SigningKey` carries a repository ref, and `PointerDocument` records hang off pointers, so a
  deletion and a rename each need a stated effect on them.
- `artifact-verification.md`: the trust set is per repository and "lives beside the
  repository's retention rules as core-parsed configuration, in no snapshot"; verdicts are
  keyed by digest and must outlive the blob they explain.
- `upstream-adapters.md`: the `Upstream` fields and `upstream.Validate` on remote create and
  `PATCH`; the `UpstreamCredential` store shared with replication links; administration of
  credentials is `management-api.md`'s. What happens when a referenced credential is deleted is
  nobody's yet, and it is decided here.
- `async-operations.md`: a `Job` may carry a repository reference "whose grace the job holds
  open", cancellation is cooperative, `exclusive_key` serialises jobs on one repository.
- `replication.md`: a replica is "a `local` repository with an active replication link", the
  write path "refuses for a repository with an active replication link" under an architecture
  test, and takeover "ends the replication link". The leader does not track followers (its
  resolved retention-gap decision), so a leader-side deletion or rename is discovered by the
  follower, never announced.
- `proxy-cache.md`: eviction "ends the reference and deletes nothing" under a per-repository
  quota; a `remote` repository creates no snapshots (`data-model.md`, resolved
  snapshots-in-proxied-repositories decision), so deleting one is a different shape from
  deleting a `local`.
- `supply-chain-policy.md`: policy attaches per repository; its records are audit provenance
  that "must outlive the artifact".
- `conformance-harness.md`: the `repositories` setup key provisions "format, type, visibility,
  virtual member order, the named upstream binding of a `remote`, and the repository metadata
  document verbatim" through the seed subcommand, which writes "through the shared-layer calls".
  The seed path is therefore a client of this package's creation call, and it must be able to
  provision the read-only state and a deleted-then-recreated name for the cases below.
- `format-handler-interface.md`: `Capabilities()` is "the machine-readable home" of a handler's
  declarations the runner honours; the reserved-segment list; `Scope(r)` names a repository.
- `formats/hex.md`, resolved signed-name decision (was Q1): "no virtual aggregation on this
  format" and "a hosted repository that cannot be renamed without every consumer re-adding it".
  `agents/spec-loop/consequences.md` Open item 12 and theme 9 asked the shared model for a
  per-format capability, and `format-handler-interface.md` now declares it: `Capabilities()`
  carries `Virtual` and `Rename` (its AC13), and `management-api.md` surfaces both to operators
  and the UI through `GET /api/v1/formats`. This spec is where that capability is consumed.
- `formats/generic.md`: the immutability switch forbids in-place replacement of a path and is
  repository configuration; it is not an archival state, and this spec says how the two differ.

**Charter build step.** `project-charter.md` step 2 builds "the management surface core
(repository and token operations)" with generic, because "generic's repository settings ... are
changed through an operator API". This spec is the repository half of that core, and the
charter's build order places its phases one step each: Phase 1 (the state machine and `local`
repositories) at step 2, Phase 2 (deletion against GC) at step 3, Phase 3 (`remote` and
`virtual`) at step 4, where the first `remote` exists. Its cost is charged to `shared:management`
with `credential-management.md`, the token half (charter, "Measuring per-format cost"). Scope is
not a constraint (the charter's standing decision), so nothing here is deferred for effort.

## Scope

**In scope**

- The lifecycle state machine: `active`, `read_only`, `deleted`, its transitions, and the one
  writability predicate every completed-write path consults.
- Identity and naming: the generated identity, the name grammar, reserved names, uniqueness
  among live repositories, and name reuse after deletion.
- Creation of `local`, `remote` and `virtual` repositories, including the type-specific settings
  each requires, the per-format capability check for `virtual` and for rename, and the default
  pointer on an initial empty snapshot.
- Configuration changes: which are configuration (no snapshot), which are completed writes, and
  which are refused (format, type).
- Renaming: an identity-preserving relabel, and its effect on tokens, grants, replication links,
  client URLs, signing keys, trust sets, virtual membership and format documents that embed a
  name.
- The read-only state on `local` and `remote` repositories, what it refuses, what it suspends,
  and what keeps running.
- Deletion of each type, as one reference-ending write in one transaction, and its effect on
  every record that names the repository: pointers, snapshots, head rows, cached references,
  upstream binding, upload sessions, jobs, grants, credentials, signing keys, trust sets,
  verdicts, policy records, retirement records, operations, replication links and virtual
  membership.
- Deletion's relationship to the deletion-intent barrier, and `reclaim: now` as a pruning input.
- The `in-use` rule: refusing a deletion (of a member repository or an upstream credential)
  that would silently change what another repository serves, unless the request detaches.
- A deleted repository's tombstone: what survives forever and why.
- The mechanical enforcers for every boundary rule above.

**Out of scope, each with its reason**

- **The HTTP routes, request bodies, problem types and OpenAPI document.** `management-api.md`
  owns the wire and carries what this spec needs of it: the problem types `in-use` (`409`),
  `read-only` (`405`) and `capability-unsupported` (`422`), the `confirm`, `detach` and `reclaim`
  fields of the delete route, the `freeze`, `thaw` and `rename` routes, the `lifecycle` operation
  kind and the admin-only `?state=deleted` listing; this spec defines their semantics.
- **Space reclamation mechanics.** The pruner, the sweep, the deletion-intent table and the
  grace period are `storage-and-gc.md`'s; this spec adds operations to its property suite and
  one input to pruning (`reclaim: now`), already decided by `management-api.md`.
- **Undelete.** `management-api.md`'s resolved deletion decision weighed "soft delete with
  undelete, snapshots kept until an explicit purge" and rejected it for "a fourth repository
  state in the model and in every listing". This spec does not reopen it; the safety this spec
  adds is on the way in (identity confirmation, the `in-use` refusal, the slow default), not on
  the way back.
- **Freezing a `remote` into a `local`.** `replication.md`'s freeze; `management-api.md`
  already refuses a type change for that reason.
- **Pointer management** (creating, repointing, deleting named pointers). `data-model.md`
  exposes it and `management-api.md` serves it; this spec uses pointer deletion as a step of
  repository deletion and adds nothing to it.
- **Retention rule semantics.** `formats/generic.md` owns what rules mean; this spec only says
  that read-only suspends their pass.
- **Per-format settings vocabularies** (Debian suites, Alpine architectures). Each format's spec
  declares its `settings` document; this spec fixes only that the document is validated and
  applied through `configure` at creation and on change.
- **A web UI or CLI for lifecycle operations.** `management-api.md` declined a CLI in v1 (its
  resolved CLI-stance decision, was Q9) and the UI is charter step 9; both are clients of the
  same API.
- **Organisation or project grouping above repositories.** Harbor's project and Gitea's owner
  are the unit above their repositories; `auth.md` fixed the repository as the unit of RBAC and
  nothing here needs a level above it. Raised as a spec change if a format needs it, never
  slipped in as a namespace convention.

## Design

### Prior art: what is taken and what is rejected

Grounded this run by fetching the sources named; where a fetch failed the vendor is not cited.

- **Harbor** (`api/v2.0/swagger.yaml`, fetched). `deleteProject` answers `412`: "Project cannot
  be deleted. The project still contains repositories or has pending tasks." `deleteRepository`
  answers `412` when "The repository contains images protected by an immutable tag rule and
  cannot be deleted." Its tag-immutability documentation: an immutable tagged artifact "cannot
  be deleted, and also cannot be altered in any way such as through re-pushing, re-tagging, or
  replication". **Taken:** a precondition-failed refusal when deletion would silently take
  something from a dependant, applied here to virtual membership and to credentials in use, and
  the shape of "pending tasks" as a thing deletion must reckon with (here: cancel, never wait
  forever). **Rejected:** refusing deletion because content is protected. Our fifth root
  protects snapshots, not names; a deletion releases the pointer and the pin ends with it, so
  nothing inside a repository can make the repository undeletable.
- **Pulp** (`pulpcore/app/settings.py` and `viewsets/repository.py`, fetched).
  `ORPHAN_PROTECTION_TIME = 24 * 60` minutes protects "ephemeral items" from orphan cleanup;
  `DISTRIBUTED_PUBLICATION_RETENTION_PERIOD` (3 days) keeps a superseded publication servable
  so mid-transfer clients do not 404; a repository-version deletion is dispatched as a task with
  `exclusive_resources=[version.repository]`. **Taken:** deletion is exclusive per repository
  (our `exclusive_key`), and content stays reachable for a window after the pointer moves (our
  retention window is the same idea, already decided). **Rejected:** a deletion task. Our
  deletion is one transaction because the shared model already accepts a retention pass that
  removes every version as one write; the long-running part (reclaiming bytes) is the pruner's
  and the sweep's, which are already jobs.
- **Gitea** (`docs/usage/packages/storage` and `services/user/user.go`, fetched). "Whenever a
  package gets deleted, only the references to the underlying blobs are removed"; unreferenced
  blobs are removed by a cleanup job after `OLDER_THAN`. `DeleteUser` refuses when
  `HasOwnerPackages` is true, returning `ErrUserOwnPackages`. **Taken:** deletion removes
  references, never blobs, which is `storage-and-gc.md` AC15 exactly; and the refuse-while-owned
  precedent for the `in-use` rule. **Rejected:** refusing to delete an owner that still owns
  content. A repository *is* the content's owner here, and deletion of it is what removes the
  content's references.
- **Nexus Repository** (cleanup-policies page, fetched). Cleanup "soft deletes" components by
  flagging them; "Components still consume space but may be recovered"; the compact blob store
  task with "Blobs Older Than" reclaims them. Its repository listing carries an online/offline
  state. **Taken:** a delay between logical removal and physical reclamation, and an explicit
  per-repository offline state (our `read_only` on a `remote` stops fetching). **Rejected:**
  recoverability as a product promise, per `management-api.md`'s decision.
- **Distribution** (the OCI reference registry's `configuration.md`, fetched). The storage
  maintenance `readonly` option: "clients will not be allowed to write to the registry. This
  mode is useful to temporarily prevent writes to the backend storage so a garbage collection
  pass can be run." **Taken:** an explicit read-only mode as a first-class state. **Rejected:**
  instance-wide only. Ours is per repository because the unit of everything else is the
  repository; an instance-wide freeze is every repository set read-only, which the API can do in
  one listing walk.
- **Artifactory.** Every fetch of its documentation failed this run (client-rendered pages), so
  nothing is cited from it beyond what `data-model.md` already grounded: the three-type model.
  Whether its repository key is immutable is a claim this spec does not make.

### The state machine

A repository has exactly one lifecycle state, stored on `Repository` as a core-parsed column
beside visibility and retention rules, never inside the opaque metadata document:

| State | Serves | Accepts completed writes | Accepts configuration | Listed |
|---|---|---|---|---|
| `active` | yes | yes | yes | yes |
| `read_only` | yes | no (refused `read-only`) | yes (so it can be thawed) | yes, flagged |
| `deleted` | no (`not-found`) | no | no | only under `GET /api/v1/repositories?state=deleted` (admin), by identity |

The deleted listing is a filter value on the collection route, not a literal
`/repositories/deleted` path, so no name is reserved for it (`management-api.md`'s resolved
deleted-listing decision, was Q11); `web-ui.md`'s Repositories page reads the same filter for
the admin. Whether a format admits a `virtual` repository or a rename is read by operators and
the UI from `GET /api/v1/formats`, which renders each handler's `Capabilities()`
(`management-api.md`'s endpoint table).

Transitions, each admin-only, each an audit line and an `Operation` record of kind
`lifecycle` (`management-api.md`'s administration family, each carrying its sub-kind):

- `create` produces `active`.
- `freeze` moves `active` to `read_only`; `thaw` moves it back. Both are configuration changes,
  not writes: no snapshot, no handler involvement.
- `rename` keeps the state and changes the name; allowed in `active` and `read_only`.
- `delete` moves `active` or `read_only` to `deleted`. It is terminal: there is no transition out
  of `deleted`, by `management-api.md`'s decision.
- `purge` is not a transition an operator makes. It is the moment the pruner drops the deleted
  repository's last snapshot and the row becomes a **tombstone**, still `deleted`, with its
  identity, name, format, type, `deleted_at` and deleting principal, and nothing else.

State is checked in one place. `internal/repository` exposes a consumer-side predicate,
`Writable(ctx, id) error`, that returns `nil` for an `active` repository with no active
replication link and a typed refusal otherwise (`ErrReadOnly`, `ErrReplica`, `ErrDeleted`), and
the shared write-transaction opener in `internal/storage` calls it before any completed logical
write begins: a publish, a hosted delete, a metadata-only mutation, a management operation
through `Submit`, a retention pass, a freeze in `replication.md`'s sense, and every pointer
create, repoint or deletion. `replication.md` already places "refuses for a repository with an
active replication link" at exactly this point under an architecture test; this spec generalises
that check into the predicate and the test (AC9) so there is one writability answer, not two
half-overlapping ones (`storage-and-gc.md` AC25 is the constructor's own statement of it). The
constructor has exactly one further entry point, which waives `ErrReplica` and nothing else (a
replica that is also `read_only` or `deleted` is refused through it too): the replication applier
is its only importer, so `internal/replication` can commit the leader's snapshots on a follower
while no other package can, and `internal/storage/arch_test.go` asserts the import
(`replication.md` AC12, shared with AC9 here and `storage-and-gc.md` AC25). `ErrReplica` renders
as `405` with problem type `replica` whose detail names the leader (`replication.md`); `ErrReadOnly`
as `405` `read-only`; `ErrDeleted` as `not-found` under the existence oracle. Cache
materialisation is not a completed write and does not consult the predicate; it consults
`read_only` on a `remote` for a different reason (below).

### Identity and naming

**Identity.** Every repository has an identity generated by the core at creation: 128 bits from
`crypto/rand`, rendered in the API as a lowercase base32 string with a fixed `rep_` marker, the
same shape `credential-management.md` gave the token lookup prefix. It is the primary key of
`Repository` and the only column any other table may reference (`data-model.md`, "Repository
identity and lifecycle state", AC38). That is the mechanical form of
`auth.md`'s rule: a grant, a token scope, a signing key, a trust set, a virtual membership, a
replication link, a job, a policy rule and a retirement each name a repository by identity, so a
deleted-and-recreated name inherits none of them by construction rather than by a check at use.
A schema introspection test asserts it: every foreign key into `repositories` targets the
identity column and no table carries a `repository_name` column (AC3).

**Name.** The name is a label the identity currently wears. It is what appears in client URLs
and in the API path `/api/v1/repositories/{name}`, and it is the only thing a rename changes.
The grammar is the strictest one every client in the matrix accepts as a path component:
`^[a-z0-9]+(?:[._-][a-z0-9]+)*$`, 1 to 63 characters, which is the OCI distribution name
component grammar `formats/oci.md` must satisfy and a subset of what every other client passes
through unchanged. Uppercase is refused rather than folded (two names differing only in case
would resolve identically on a case-folding client and differently on another). A name may not
be a reserved first path segment from `format-handler-interface.md`'s reserved table (`api`,
`ui`, `healthz`, `readyz`, `metrics`, `replication`, `t`), the first segment of a root-anchored
carve-out that spec lists (`v2` is OCI's carve-out, not a reserved segment, and is refused for
the same reason: a repository so named would shadow a route), a registered format name, and may
not begin with `_` or `-`, which several formats use for their own control routes. The reserved
table and the carve-out list are `format-handler-interface.md`'s; this spec reads both rather
than keeping a copy. Grammar violations are refused `validation`
with the rule named, and the grammar is fuzz-tested against the route table so no accepted name
can shadow a route (AC2).

**Uniqueness is among live repositories.** The unique index on `name` is partial: `WHERE state
<> 'deleted'`. A deleted repository's tombstone keeps its last name for listings and for
`credential-management.md` AC20's "scope naming the deleted repository", and a new repository
may take that name the moment the deletion transaction commits, as `management-api.md` AC20
requires. There is no cooling-off period: the risk a cooling-off period would address (a stale
grant or token reattaching to the new repository) is closed by identity binding, and the risk
that remains (a client still configured with the old URL now talking to a different repository)
is one only the admin can create, because only the admin creates repositories.

### Creation

Creation is one transaction in `internal/repository`, called by the API's create route and by
the seed subcommand alike, and it does the following in order, refusing at the first failure
with nothing committed:

1. **Validate the name** (grammar, reservation, uniqueness) and the common fields: format (a
   registered handler), type, visibility (private unless explicitly public, per `auth.md`),
   retention rules in `data-model.md` AC28's shape, and an optional storage quota for a `remote`
   (`proxy-cache.md`).
2. **Check the format's capabilities** for the type. `Capabilities()` declares `Virtual`
   (`supported` or `unsupported`) and `Rename` (`supported` or `unsupported`)
   (`format-handler-interface.md` AC13; both Tier 0 handlers declare `supported`). Creating a `virtual` repository
   of a format that declares `Virtual: unsupported` is refused `capability-unsupported` with
   the format's own reason text, which is how `formats/hex.md`'s "no virtual aggregation on
   this format" becomes a refusal rather than a repository that serves documents every client
   rejects. `conformance-harness.md`'s matrix reads the same field to render the virtual column
   as exempt for that format, so the advertised number never exceeds the tested one (the
   catalogue's virtual column is driven by the same field, its AC7; the earlier assumption
   that every format supports virtual, consequences theme 9, is corrected by it).
3. **Type-specific validation.**
   - `local`: nothing beyond the common fields.
   - `remote`: exactly one upstream, validated by `upstream.Validate` (URL, adapter, hosts,
     credential reference resolving to an existing `UpstreamCredential`, download policy), and
     the `Upstream` row is created in the same transaction, bound one-to-one (`data-model.md`
     AC16).
   - `virtual`: an ordered member list of at least one member, each an existing, non-deleted
     repository of the **same format** and of type `local` or `remote` (no nesting, per
     `data-model.md`'s member definition "an ordered list of local and remote members"), each
     named by identity in the request (a name is accepted as a convenience and resolved to an
     identity before the check, so a member renamed between two requests still binds the same
     repository), with no duplicates. `VirtualMember` rows are written with their positions.
     A `read_only` member is allowed: read-only governs writes and a virtual repository
     performs none on its members.
4. **Format-specific settings.** The `settings` document, when present, is validated and
   applied through the handler's `Operator` interface with kind `configure`
   (`management-api.md`, "Dispatch"), inside this transaction. A handler that implements no
   `Operator` accepts no settings; a `settings` document for it is refused `validation`.
5. **The default pointer.** An initial empty `Snapshot` (stored as a checkpoint, so it has no
   chain) is written and the default pointer is created on it, so name-addressed serving
   resolves from the first request (`management-api.md` AC19, `data-model.md`'s pointer rule).
   A `remote` creates no snapshots for content, but it does get this one initial snapshot and
   its default pointer, because the pointer is also where `signing-service.md`'s
   `PointerDocument` records and `data-model.md`'s per-pointer freshness record hang, and a
   `remote` serves cache-scoped `Last-Modified` through them (`proxy-cache.md`); a `virtual`
   gets the same, for its merged documents. Nothing name-addressed resolves without a pointer,
   whatever the type.
6. **Trust set, policy, keys.** The trust set starts empty at revision 1
   (`artifact-verification.md`); no policy rule exists until one is configured
   (`supply-chain-policy.md`); no signing key exists until the handler's first write asks the
   service for one or the operator creates one (`signing-service.md`). Creation itself writes
   none of those records; it only has to leave the repository in a state where each of them can
   attach by identity.
7. **Audit and record.** One audit line and one `Operation` of kind `lifecycle` with the
   sub-kind `create`, the identity and the name; the create response carries both.

A `virtual` whose format declares an `Indexer` (`signing-service.md`) has its first merge
enqueued at creation, coalesced per virtual repository, so its merged documents exist before the
first client request rather than being rendered on the first miss.

### Configuration

`management-api.md` fixed the boundary: a visibility or retention change is configuration, a
`settings` change that renders into a served document is a completed write. This spec adds the
rest of the table, so every field has a declared class:

| Change | Class | Effect |
|---|---|---|
| visibility | configuration | next request evaluates the new value (`auth.md`) |
| retention rules | configuration | next retention pass reads them |
| storage quota (`remote`) | configuration | next eviction pass reads it (`proxy-cache.md`) |
| `read_only` (freeze, thaw) | configuration | the predicate answers differently from the commit onward |
| name (rename) | configuration, with a handler hook | see "Renaming" |
| virtual member list (add, remove, reorder) | configuration, with a merge | `VirtualMember` rows rewritten in one transaction; a merge is enqueued for formats with an `Indexer`; resolution order changes at commit |
| upstream of a `remote` (URL, adapter, hosts, credential ref, download policy) | configuration | validated by `upstream.Validate`; the `Upstream` row is updated in place; **cached references persist**, because cached content is content-addressed and its coordinates did not change; revalidation from then on goes to the new upstream, and `RemoteFile.last-checked` is reset so the first request after the change revalidates |
| `settings` | completed write when the handler's `Apply` changes a served document; configuration otherwise | one snapshot or none, as `management-api.md` AC19 asserts |
| trust set | configuration with a revision | `artifact-verification.md`'s |
| `policy` document (supply-chain rules) | configuration | a core-held field of the repository, never part of the handler's `settings`; set through `PATCH`, validated by `supply-chain-policy.md`'s rule binding and refused `validation` (`422`) naming the unbindable condition (its AC11); rules apply from the commit; dropped at tombstone time |
| `advisory_ecosystem` (OS-package formats) | configuration | a core-parsed field (`Debian:12`, `Alpine:v3.20`), validated against the advisory sources' ecosystem lists and refused `validation` with the unknown value named (`supply-chain-policy.md`); the handler never reads it; dropped at tombstone time |
| format, type | refused `validation` | content is the format's; a `remote` becoming `local` is a freeze |
| identity | not a field | never settable |

Changing the upstream of a `remote` keeps the cache deliberately. The alternative, ending every
cached reference, turns an upstream URL correction (a new CDN host, a changed realm) into a full
re-fetch of everything the cache holds, for no integrity gain: the bytes are content-addressed
and were verified on arrival under the old upstream's declared digests. An operator who does
want a clean cache deletes the repository and recreates it.

### Renaming

A rename changes the `name` column of one `Repository` row and nothing else in the shared
model, because nothing else references the name (AC3). What follows is what that means for each
record and for clients, stated so no sibling has to derive it:

- **Tokens and grants** are untouched and keep working, because they bind the identity. A
  token minted for `team-a` works on `team-a-legacy` after the rename without reissue. That is
  the whole reason identity binding was chosen over name binding in `auth.md`, and a rename is
  where it pays.
- **Signing keys, trust sets, verdicts, policy rules, retirements, jobs, operations,
  upload sessions, virtual memberships** are untouched, for the same reason.
- **Client URLs break at the commit.** The old name answers `not-found` (the existence oracle
  of `auth.md`: identical to a repository that never existed), and there is no alias, redirect
  or grace window for the old name (the resolved rename-alias decision, was Q2). A rename is a
  deliberate act that the admin coordinates with the repository's consumers; an alias would be a
  second name resolving to one identity, which turns the partial unique index into a table, lets
  a rename and a creation under the old name race, and gives the existence oracle two answers.
- **Replication links on followers** name the leader's repository by name
  (`data-model.md`'s `ReplicationLink`: "leader URL, leader repository name"), because a
  follower cannot hold a foreign instance's identity. A leader-side rename therefore makes every
  follower's next sync fail with `not-found`, and the follower marks its link `failed` with that
  reason (`replication.md`'s status vocabulary). The operator updates the link's leader
  repository name through the link's own configuration, which `replication.md` exposes ("the
  link's leader repository name is updatable", its AC22, through `management-api.md`'s link
  administration routes). This spec does not invent a discovery protocol for it: the leader does
  not know its followers (`replication.md`'s resolved retention-gap decision), so it cannot tell
  them.
- **Format documents that embed the name.** Some served documents carry the repository's name
  or an absolute URL containing it: `formats/hex.md`'s signed payloads carry the name and
  clients check it; `formats/opam.md` and `formats/openvsx.md` rewrite URLs into registry-owned
  routes; Debian's `Release` may carry `Origin` and `Label`. Two rules close this. First, a
  handler whose served documents embed the name must declare `Rename: supported` only if it
  regenerates those documents at serve time from records or re-renders them on rename; a
  handler that cannot (Hex, whose clients pin the name) declares `Rename: unsupported`, and a
  rename of a repository of that format is refused `capability-unsupported` with the format's
  reason (Hex's accepted cost, "cannot be renamed without every consumer re-adding it",
  becomes a refusal rather than a silent break). Second, a handler that implements `Operator`
  receives the rename as a `configure` operation with `args` `{"rename": {"from": ..., "to":
  ...}}` inside the rename transaction, and may produce one snapshot if it re-renders stored
  documents (Debian's `Release`); a handler with no `Operator` receives nothing and its
  conformance suite's rename case proves its served documents were never name-bound. The
  conformance case is the same for every format: rename, then a real client installs from the
  new name in both modes, and a request to the old name is `not-found` (AC12).
- **Audit.** The audit line and the `lifecycle` `Operation` carry both names and the identity.
  Listings of operations and audit lines by repository resolve through the identity, so a
  repository's history is continuous across its names.

### Read-only

`read_only` is the archival state: the repository keeps serving exactly what it serves now.

- **On a `local`**, `Writable` refuses every completed write with `ErrReadOnly`, which the API
  and every binding render as `405` with problem type `read-only` (the same status
  `management-api.md`'s resolved remote-refusal decision chose for a type refusal, for the same
  reason: nine format specs' captured client renderings). That covers client publishes, hosted
  deletes, metadata-only mutations, every management content operation through `Submit`, and
  every pointer create, repoint and delete, including the default pointer's advance, which
  cannot happen because nothing writes. The retention pass is a completed write, so it is
  suspended too: an archived repository is not slowly emptied by its own rules. Snapshot
  pruning and the sweep keep running, since they are not writes to the repository: older
  snapshots age out under the window while the served one is pinned by the default pointer
  (the fifth root), so an archived repository converges to exactly the snapshots its pointers
  target and nothing more.
- **On a `remote`**, there are no completed writes to refuse; the state instead suspends
  upstream contact. Cache materialisation, revalidation and eviction stop: a request for cached
  content is served from the cache with the cache-scoped freshness signal frozen, and a request
  for content not cached is `not-found`. This is Nexus's offline repository, and it is the
  operational answer to "the upstream is compromised, serve what we already verified and
  nothing new" that `supply-chain-policy.md`'s condemnation path does per artifact and this
  state does per repository. The removal table (`proxy-cache.md`) is not consulted while
  read-only, because nothing from the upstream is read. `proxy-cache.md` asserts its half of
  this in its AC23 (fetch-and-cache refuses with a typed refusal before any upstream request, TTL
  revalidation does not run, eviction skips the repository however far over quota, the freshness
  record is unchanged, `thaw` restores all three), sharing AC11's case here.
- **On a `virtual`**, the state is refused `repository-type`: a virtual repository holds nothing
  to freeze, and freezing its members is what freezes what it serves.
- **Configuration stays open**, so the state can be reversed and so visibility, retention rules
  (for later), trust sets and grants can still be administered; `settings` changes that would
  produce a snapshot are refused like any other write.
- **A replica** (`local` with an active link) is already unwritable through the same predicate;
  setting it `read_only` as well is allowed and changes nothing until the link ends, at which
  point the repository stays read-only rather than becoming writable, which is the safe default
  after a takeover.

Read-only is distinct from `formats/generic.md`'s immutability switch: immutability forbids
replacing a path in place and still permits new uploads and deletes; read-only forbids every
write. A repository may be both.

### Deletion

Deletion is one transaction in `internal/repository`, admin-only, and it is a **reference-ending
write, never a deleter** (`storage-and-gc.md` AC15's scan names `internal/repository`, its AC24
puts the lifecycle operations in the property suite; asserted here as AC14). It proceeds in this
order and refuses at the first failure with nothing committed:

1. **Confirmation by identity.** The request names the repository by name in the path and must
   carry its identity in the body (`confirm: rep_...`); a mismatch is refused `validation`. A
   deletion script written against a repository that has since been deleted and recreated under
   the same name then deletes nothing, which is the same protection identity binding gives
   grants, applied to the most destructive request the API has (the resolved confirmation
   decision, was Q5).
2. **The `in-use` check.** If any `virtual` repository lists this repository as a member, the
   deletion is refused `409` with problem type `in-use`, its `detail` and extension member
   naming every such virtual repository, unless the request sets `detach: true`, in which case
   each membership row is removed in this transaction and a merge is enqueued for each affected
   virtual repository (the resolved member-deletion decision, was Q3). A `remote` whose
   `Upstream` references an `UpstreamCredential` is not a blocker: the credential outlives the
   repository. (The converse, deleting a credential in use, is below.)
3. **Writability is not required.** A `read_only` repository and a replica can be deleted; the
   deletion is the one write the predicate does not gate, because it is the transition out of
   every state, and it is "the single named exemption the architecture test knows"
   (`storage-and-gc.md` AC25). A replica's `ReplicationLink` is ended in this transaction (state
   `ended`, the terminal value in `replication.md`'s status vocabulary, with the reason
   `deleted`; its AC22).
4. **Mark deleted and free the name.** `state` becomes `deleted`, `deleted_at` and the deleting
   principal are recorded, and the partial unique index releases the name at commit.
5. **End the head.** For a `local`, the repository's current content rows (`Version`, `File`,
   `Reference`, and the current metadata documents at all three levels) are removed as one
   completed logical write producing one final empty snapshot, stored as a checkpoint so it
   depends on no chain, exactly the shape `data-model.md` already accepts for a retention pass
   ("one write however many versions it removes"). `Package` rows survive this write as they
   survive any version removal (`data-model.md` AC33) and are dropped at tombstone time. The
   first and fourth mark roots stop seeing the repository at this commit, because they walk
   current rows and current documents and there are none. For a `remote`, which has no
   snapshots, every cached reference (`File` rows bound to `RemoteFile` sources, cached
   documents) is ended in this transaction, the eviction shape `proxy-cache.md` fixed: no object
   is touched, and the blobs fall to the sweep after grace like any evicted content. The
   `Upstream` row and its `RemoteFile` rows are deleted with it; `FileProvenance` records in
   other repositories that name this remote as a source are unaffected (they hold a URL, not a
   reference). For a `virtual`, there is no content; its `VirtualMember` rows (where it is the
   virtual) and its `PointerDocument` records are removed.
6. **Release the pointers.** Every named pointer is deleted and the default pointer is moved
   onto the final empty snapshot (for a `local`) or deleted (for a `remote` or `virtual`, whose
   only snapshot is the initial one and is dropped with the row). Each is the pointer-release
   path `storage-and-gc.md` AC18 polices: it serialises with pruning's targeted check in
   PostgreSQL, and the snapshots each pointer pinned fall back under the retention window at
   commit, prunable immediately if already aged out.
7. **Upload sessions** open in the repository are expired in this transaction. Their committed,
   unreferenced blobs are then ordinary grace-protected bytes of a repository whose last write
   activity is this deletion; the grace runs from it and the sweep collects them when it lapses.
8. **Jobs** naming the repository are asked to stop: every `pending` job is moved to
   `cancelled` in this transaction (it never ran), and every `running` job receives the
   cooperative cancellation `async-operations.md` defines and reaches `cancelled` or `failed`
   at its next checkpoint. Until it does, its grace hold stands (`async-operations.md`'s
   resolved grace-hold decision, was Q4; `storage-and-gc.md` AC23), so a half-imported
   artifact's bytes are collected after the job ends, never under it. The deletion does not
   wait for running jobs; a job that observes a `deleted` repository at its next step ends
   itself. A `Schedule` scoped to the repository (a retention pass, a cadence re-sign) is
   disabled. The deletion transaction does all of this through one call, the runner's
   `CancelByRepository(ctx, tx, repo)`, the only write path into the job table outside
   `internal/async` (its architecture test); the job-side half (self-ending on a deleted
   repository, repository-scoped schedules disabled, the grace hold released only at the
   running job's terminal state) is `async-operations.md` AC28.
9. **Grants** on the repository are deleted in this transaction, each with an audit line
   (`management-api.md`: a grant "dies with the repository"). **Credentials** are not touched:
   a token or key whose scope names the identity stays listed with that scope, grants nothing
   anywhere because the identity resolves to a `deleted` repository, and `credential-management.md`
   AC20 asserts exactly this. The deleted repository's name remains readable through the
   tombstone so the listing can show it.
10. **Signing keys** of the repository move to `retired` in this transaction, in
    `signing-service.md`'s state vocabulary, so no further document can be signed under them;
    their public forms stay retrievable by digest until tombstone time, because a client that
    fetched a signed document inside the retention window may still verify it. Private material
    is destroyed at tombstone time. The key-side statement of this is `signing-service.md`
    AC29 (retire in the deletion transaction, public forms by digest until tombstone, private
    material destroyed then, rename changes nothing).
11. **Trust set revisions, verdicts, the `policy` document and `advisory_ecosystem`,
    condemnation and refusal records, retirement records and `Operation` records** are untouched
    by deletion. Verdicts and policy records must outlive the artifact
    (`artifact-verification.md`; `supply-chain-policy.md` AC22 asserts condemnation and refusal
    records readable through the tombstone at and after tombstone time); retirements are
    (identity, coordinate) and are inert once the identity is deleted, and a recreated
    repository of the same name has a new identity and an empty retirement set, which is
    consistent with "the coordinate is never reusable *in that repository*"; operations are
    pruned by their own window. Trust set revisions, the `policy` document and
    `advisory_ecosystem` are dropped at tombstone time (`supply-chain-policy.md` AC22 for the
    policy half, `artifact-verification.md` AC29 for the trust-set half, which also keeps every
    verdict readable and leaves rename with nothing to do); verdicts, condemnations, refusals
    and retirements are never dropped by this spec.
12. **Replication, leader side.** Nothing happens on the leader beyond the above, because the
    leader does not know its followers. A follower's next sync finds `not-found` and marks its
    link `failed` with that reason; the operator then takes the follower over (the repository
    becomes an ordinary local) or deletes it. That is the designed behaviour, stated so it is
    tested rather than discovered (AC22).
13. **Reclamation.** The request may set `reclaim: now`, which records an effective retention
    window of zero on the deleted repository as a pruning input; otherwise the repository's
    configured window applies. Either way the next pruning cycle drops every snapshot that is
    untargeted and outside the effective window (all of them, since the only pointer left is
    on the empty final snapshot), the sweep collects every blob no other root reaches, and a
    blob shared with another repository survives because the sweep marks from every root
    (`management-api.md` AC20; asserted here as AC15 and AC16 on both types).
14. **Audit and record.** One audit line (`repository.delete`, below) and one `lifecycle`
    `Operation` with sub-kind `delete`, the identity, the name, `reclaim`, `detach`, and the
    counts of pointers released, memberships detached, sessions expired and jobs cancelled.

**Tombstone.** When the pruner drops the deleted repository's last content snapshot (and, for a
`local`, its final empty snapshot with it, since nothing else targets it once the default
pointer is deleted at that moment), it also drops the `Package` rows, the trust set revisions,
the `policy` document and `advisory_ecosystem`, `SigningKey` material and `PointerDocument`
records, and leaves the `Repository` row as a tombstone: identity, last name, format, type,
`deleted_at`, deleting principal, and the `Operation` reference. The tombstone is never removed.
It is what lets a credential listing, an audit trail, a retirement record and an operation
record name a repository that no longer exists (`credential-management.md` AC20 renders the
deleted repository's last name from it; `data-model.md` AC39), and it costs one row per deleted
repository, which is a price worth paying for never having a dangling identity in the audit
trail. A tombstone is listed only under `GET /api/v1/repositories?state=deleted` (admin), by
identity, so the live listing is never polluted (the "fourth state in every listing" cost
`management-api.md` declined does not arise; its resolved deleted-listing decision, was Q11).
The pruner emits one audit line, `repository.reclaim`, at that moment (below).

### Audit and metrics

Every lifecycle operation, refused or not, emits exactly one audit record through
`telemetry.Auditor.Emit` (`observability.md`, "The audit channel"), in that spec's closed
vocabulary and with its fixed attribute set, which carries `repository` (the name) and
`repository_id` (the `rep_` identity) on every record so a rename or a deletion leaves every line
resolvable. The events: `repository.create`, `repository.configure` (any change from the
Configuration table, naming the changed fields), `repository.freeze`, `repository.thaw`,
`repository.rename` (extension attribute `previous_name`), `repository.delete` (extension
attributes `reclaim` and `detach`, the latter listing the virtual repositories detached),
`repository.detach` (a member removed from a `virtual` through its member-list configuration,
so a virtual's resolution set never changes without a line naming it) and `repository.reclaim`
(emitted by the pruner at tombstone time, the one lifecycle record not tied to an operator's
request). `observability.md`'s vocabulary table already lists `repository.create`, `.delete`,
`.freeze`, `.thaw`, `.rename`, `.detach` and `.reclaim` with `previous_name`, `reclaim` and
`detach` as extension attributes; `repository.configure` and the placement of `.detach` on the
member-list change and `.reclaim` on the pruner are what this pass reports back to it. A line
for a refused operation carries `outcome: refused` and the `problem_type`.

The gauge `repositories{format,repository_kind,state}` (`stackweaver_registry_` namespace;
`repository_kind` over `local`, `remote`, `virtual`; `state` over the three lifecycle states) is
state-derived from the `Repository` table and exported by the process holding scheduler
leadership (`observability.md` AC4 lists it, AC7 fixes the leader rule). This package computes
it from the same query the listing uses and proves it moves in
`internal/repository/metrics_test.go` on `telemetry.NewTestRecorder` (AC27).

### Deleting what a repository depends on

The `in-use` rule generalises. Anything whose deletion would silently change what a live
repository serves is refused unless the request says what to do about the dependant:

- **An upstream credential** referenced by any `Upstream` or `ReplicationLink` cannot be
  deleted: `409` `in-use`, naming each remote repository and each link. The route is
  `management-api.md`'s (AC21); the rule is this spec's (AC20). There is no `detach` for a
  credential, because a `remote` without its credential answers `401` from its upstream on
  every request and there is no sensible state to leave it in; the operator rotates the
  credential (one row) or deletes the repository first.
- **A member of a virtual repository**: refused unless `detach: true`, as above.
- **A leader repository**: not refusable, because the leader does not know its followers; the
  follower detects and reports.
- **A trust set entry, a signing key, a policy rule**: each is owned by its own spec, each is
  scoped to one repository, and none is referenced by another repository, so no `in-use` rule
  applies; they go with the repository or by their own routes.

### Every path against the deletion-intent barrier

`storage-and-gc.md` closes the sweep race with a deletion-intent table that every
reference-creating path consults and every pointer write serialises with. Each lifecycle path is
placed against it explicitly, because a path that neither creates references nor deletes objects
is easy to assume harmless and this project's data loss lives in exactly such assumptions:

| Path | Creates a reference | Ends a reference | Moves a pointer | Deletes an object | Barrier relationship |
|---|---|---|---|---|---|
| create | the initial empty snapshot's checkpoint document (a CAS write through the shared reference-creation call) | no | creates the default pointer on a snapshot just written | no | one reference-creation call, which cancels any standing intent for that digest (AC10 of `storage-and-gc.md`) |
| configure (any class) | possibly, through `Apply` | possibly | the default pointer advances if a snapshot is produced | no | inherits the write path's |
| rename | no (a handler's `configure` may, as above) | no | no | no | none of its own |
| freeze, thaw | no | no | no | no | none; the predicate is read at write time, not by the sweep |
| delete (`local`) | the final empty snapshot's checkpoint | every head reference | deletes named pointers, moves the default pointer | no | the pointer moves serialise with pruning's targeted check (AC18); the reference ends are ordinary row deletes the next mark observes |
| delete (`remote`) | no | every cached reference | deletes the default pointer | no | eviction's shape: `proxy-cache.md` AC7, asserted for deletion by its AC23 |
| delete (`virtual`) | no | no content | deletes the default pointer | no | pointer deletion only |
| detach member | no | no | no | no | a merge is enqueued; the merge's own writes go through the write path |
| `reclaim: now` | no | no | no | no | a pruning input; the pruner's own check-then-act serialisation applies |
| tombstone | no | no | deletes the default pointer of a deleted `local` | no | performed inside the pruner's cycle, under its lock |

Nothing in this package imports the blob store's delete surface, and the architecture test
`storage-and-gc.md` AC15 names (`internal/storage/arch_test.go`) lists `internal/repository`
among the packages it scans, which is the mechanical form of "never a deleter" (AC14). The
property suite in `internal/storage/gc_property_test.go` gains the lifecycle operations
(create, delete with and without `reclaim`, delete a `remote`, detach, freeze and thaw, rename
interleaved with writes) in its operation set, on the injected clock it already uses (AC17;
`storage-and-gc.md` AC24 is that suite's own statement of the same set), the only place the
interleavings this table describes are actually exercised.

### Type-specific summary

| | `local` | `remote` | `virtual` |
|---|---|---|---|
| Creation requires | common fields, optional `settings` | the upstream, validated | one or more same-format members, `Virtual: supported` |
| Default pointer | on an empty initial snapshot | same (for freshness and pointer documents) | same (for merged documents) |
| `read_only` means | no completed writes; retention pass suspended | no upstream contact; cache-only serving | refused |
| Rename hook | `configure` with `rename` args when `Operator` present | same | same; members unaffected |
| Deletion ends | head references via a final empty snapshot; named pointers | every cached reference; the `Upstream` row | member rows; pointer documents |
| Reclamation | pruner then sweep, under the window or `reclaim: now` | sweep after grace (no snapshots) | nothing to reclaim |
| Replication | link ended if a replica | not linkable | not linkable |
| `in-use` blockers | virtual memberships | virtual memberships | none |

### Package shape and the Go rules

`internal/repository` is a domain package in the Go skill's sense: it owns the `Repository`
lifecycle and exposes a small struct API (`Create`, `Configure`, `Rename`, `Freeze`, `Thaw`,
`Delete`) taking `context.Context` and typed request structs, returning typed refusals
(`ErrNameTaken`, `ErrNameInvalid`, `ErrInUse` carrying the dependants, `ErrCapability`
carrying the format's reason, `ErrReadOnly`, `ErrReplica` carrying the leader, `ErrDeleted`,
`ErrConfirm`) that `internal/manage` maps to problem types (`conflict`, `validation`, `in-use`,
`capability-unsupported`, `read-only`, `replica`, `not-found`, `validation`). It declares the consumer-side interfaces it needs
where it uses them: a metadata store transaction, a pointer writer, a session expirer, a job
canceller, a link ender, a key retirer, and the `Operator` lookup, each satisfied by the owning
package's type at wiring time and by fakes in tests. It starts no goroutine and holds no timer
(the async-operations fold's architecture test covers every package). It never imports a
handler package, and no handler imports it: a handler learns nothing about lifecycle beyond the
`configure` operations it receives and the `Writable` refusals the shared write path returns to
it (AC8). Errors wrap with a gerund phrase and no prefix, per `CLAUDE.md`. It carries no
configuration key of its own: the retention window, grace, quota and job settings it depends on
are read by their owners, and nothing here has a default worth an operator's attention. The
seed subcommand (`conformance-harness.md`) and the API route call the same `Create`, so a
seeded repository and an API-created one are indistinguishable (AC26).

### Mechanical enforcers

| Rule | Enforcer |
|---|---|
| Every foreign key into `repositories` targets the identity; no `repository_name` column exists | `internal/model/schema_test.go` (schema introspection over the migrated database; shared with `data-model.md` AC38) (AC3) |
| Every completed-write path calls `Writable` before opening its transaction; only `internal/replication` reaches the `ErrReplica`-waiving entry point | `internal/storage/arch_test.go`: the write-transaction opener is the only constructor of a write transaction, it calls the predicate, its one waiving entry point has one importer, and a fixture caller that bypasses it fails compilation against the unexported constructor (AC9; shared with `storage-and-gc.md` AC25 and `replication.md` AC12) |
| Handlers never import `internal/repository`; `internal/repository` never imports a handler | `internal/format/arch_test.go` (AC8) |
| `internal/repository` deletes no object | `internal/storage/arch_test.go`'s AC15 scan includes the package (AC14) |
| No accepted name shadows a route or a reserved segment | `internal/repository/name_fuzz_test.go` against the route table (AC2) |
| Every lifecycle operation is one transaction | `internal/repository/atomicity_test.go`: fault injection after each step asserts nothing committed (AC7) |
| Deletion's interleavings with the sweep and pruning lose nothing | `internal/storage/gc_property_test.go`, lifecycle operations in the op set (AC17) |
| The virtual and rename capabilities are honoured | `internal/repository/capability_test.go` with fixture handlers declaring each value (AC4, AC13) |
| Every audit record is in the registered `repository.*` vocabulary and carries `repository_id`; the gauge reports the table | `internal/repository/audit_test.go` and `internal/repository/metrics_test.go`, both on `telemetry.NewTestRecorder` (AC27) |

## Acceptance Criteria

Every criterion is asserted on both paths where both exist (a `local` and a `remote`, per
`CLAUDE.md`), on an injected clock wherever grace or retention is involved.

- [ ] AC1: Creating a `local`, a `remote` and a `virtual` repository through `Create` yields a
      repository in state `active` with a generated identity (128 bits from `crypto/rand`,
      rendered with the `rep_` marker), a default pointer on an initial empty snapshot, and a
      real client served from its first request in both modes; the identity is never derived
      from the name, and two repositories created with the same name in sequence (the first
      deleted between) have different identities.
- [ ] AC2: A name outside the grammar `^[a-z0-9]+(?:[._-][a-z0-9]+)*$`, longer than 63
      characters, equal to a reserved first path segment (`api`, `ui`, `healthz`, `readyz`,
      `metrics`, `replication`, `t`), to the first segment of a listed root-anchored carve-out (`v2`)
      or to a registered format name, or beginning with `_` or `-`, is refused `validation`
      naming the rule; a fuzz test against
      the route table finds no accepted name that resolves to a route other than the
      repository's own.
- [ ] AC3: The schema has no column referencing a repository by name: every foreign key into
      `repositories` targets the identity column, and a schema introspection test fails on any
      table that introduces a `repository_name` column or a foreign key to `name`.
- [ ] AC4: Creating a `virtual` repository of a format whose `Capabilities()` declares
      `Virtual: unsupported` is refused `capability-unsupported` with the format's reason and
      creates nothing; the same format's `local` and `remote` creation succeeds; the
      conformance matrix renders that format's virtual column as exempt, never as passing.
- [ ] AC5: A `virtual` repository's members must exist, be non-deleted, share the virtual's
      format and be of type `local` or `remote`; a member of another format, a `virtual` member,
      a deleted member and a duplicate are each refused `validation` and the request creates
      nothing; a member given by name is bound by identity, so renaming the member afterwards
      leaves the membership intact and resolution unchanged.
- [ ] AC6: A `remote` is created only with an upstream `upstream.Validate` accepts and a
      credential reference that resolves; a `settings` document is applied through the
      handler's `configure` inside the creation transaction and a handler without `Operator`
      refuses any `settings` with `validation`.
- [ ] AC7: Every lifecycle operation (create, configure, rename, freeze, thaw, delete with and
      without `detach` and `reclaim`) is one transaction: a fault injected after any step leaves
      no row, pointer, snapshot, membership, grant deletion, session expiry, job cancellation
      or link change committed, and the name remains as it was.
- [ ] AC8: No handler package imports `internal/repository` and `internal/repository` imports no
      handler package, enforced by an architecture test; a handler observes lifecycle only as a
      `configure` operation it receives and a typed refusal the shared write path returns.
- [ ] AC9: Every completed-write path (client publish, hosted delete, metadata-only mutation,
      management operation through `Submit`, retention pass, freeze, pointer create, repoint and
      delete) calls `Writable` before opening its transaction, enforced by an architecture test
      on the sole write-transaction constructor; a `read_only` repository and a repository with
      an active replication link and a deleted repository are each refused through the same
      predicate with distinct typed errors (`ErrReadOnly`, `ErrReplica`, `ErrDeleted`), rendered
      `405` `read-only`, `405` `replica` naming the leader and `not-found`; the constructor's one
      further entry point waives `ErrReplica` alone, still refuses `ErrReadOnly` and
      `ErrDeleted`, and is imported by `internal/replication` and no other package, asserted by
      the same architecture test; and cache materialisation does not consult the predicate.
- [ ] AC10: On a `read_only` `local`, a real client's publish and every management content
      operation, pointer operation and retention pass are refused `405` `read-only` on the API
      and on every binding, reads keep serving bit-identically, older untargeted snapshots still
      age out and are pruned on the injected clock while the pointer-targeted snapshot survives,
      and `thaw` restores every refused operation.
- [ ] AC11: On a `read_only` `remote`, a cached artifact is served without any upstream request,
      a non-cached artifact answers `not-found` with no upstream request, revalidation and
      eviction do not run, asserted at the network layer; `thaw` restores fetching; setting a
      `virtual` read-only is refused `repository-type`.
- [ ] AC12: Renaming a repository keeps its identity, every token and grant works unchanged
      under the new name without reissue, every signing key, trust set revision, verdict, policy
      rule, retirement, job, operation, upload session and virtual membership still resolves to
      it, a real client installs from the new name in both modes, the old name answers
      `not-found` indistinguishably from a never-existing repository, and a handler with
      `Operator` receives the `configure` rename operation inside the same transaction; the
      shared conformance case for it exists in every format's set.
- [ ] AC13: Renaming a repository of a format whose `Capabilities()` declares
      `Rename: unsupported` is refused `capability-unsupported` with the format's reason and
      changes nothing; the leader-side rename of a replicated repository makes the follower's
      next sync mark its link `failed` naming `not-found`, and updating the link's leader
      repository name resumes syncing with no re-seed.
- [ ] AC14: `internal/repository` deletes no object from the blob store, enforced by the
      `storage-and-gc.md` AC15 architecture scan including the package; deleting a `local`
      produces exactly one final empty snapshot stored as a checkpoint, deleting a `remote` ends
      every cached reference and deletes its `Upstream` and `RemoteFile` rows, deleting a
      `virtual` removes its member rows, and in every case no blob-store deletion call is
      observed during the transaction.
- [ ] AC15: Deleting a `local` deletes its named pointers, moves its default pointer onto the
      final empty snapshot, frees its name at commit for a new repository that inherits no
      grant, token scope, signing key, trust set, retirement or membership, leaves its content
      snapshots to age out under its retention window, and with `reclaim: now` has every
      content snapshot pruned and every blob no other root reaches collected within one cycle,
      on the injected clock; a blob shared with another repository survives in both cases; a
      real client's request to the deleted name is `not-found` from the commit.
- [ ] AC16: Deleting a `remote` ends every cached reference; its blobs are collected once the
      repository-scoped grace lapses, a blob also cached or published in another repository
      survives, and `FileProvenance` records in a frozen repository that name the deleted
      remote remain readable.
- [ ] AC17: The GC property suite's operation set includes create, delete (both types, with and
      without `reclaim`), detach, freeze, thaw and rename interleaved with publishes, the sweep
      and pruning on the injected clock, and no run loses a blob reachable from any surviving
      root, leaves a surviving snapshot unreconstructible, or deletes an object outside the
      sweep's delete pass and the orphan scan.
- [ ] AC18: Deleting a repository that is a member of one or more virtual repositories is
      refused `409` `in-use` naming each of them and changes nothing; with `detach: true` the
      memberships are removed in the deletion transaction, a merge is enqueued per affected
      virtual repository, and a real client resolving through the virtual afterwards sees the
      remaining members' content in the remaining order and nothing of the deleted member.
- [ ] AC19: Deletion requires the repository's identity as confirmation: a request whose
      `confirm` does not match the identity currently under that name is refused `validation`
      and deletes nothing, including the case where the name was deleted and recreated since
      the caller learned the identity.
- [ ] AC20: Deleting an `UpstreamCredential` referenced by any `Upstream` or `ReplicationLink`
      is refused `409` `in-use` naming each remote repository and link; after the last
      reference is removed (repository deleted, or credential rotated away) the deletion
      succeeds.
- [ ] AC21: Deleting a repository expires its open upload sessions and cancels its jobs: every
      pending job is `cancelled` in the transaction, every running job ends `cancelled` or
      `failed` at its next checkpoint, its grace hold stands until then so the bytes it named
      are collected after it ends and never before, repository-scoped `Schedule`s are disabled,
      and a job that observes the deleted state at its next step ends itself without a write.
- [ ] AC22: Deleting a replica ends its `ReplicationLink` with reason `deleted`; deleting the
      leader's repository makes each follower's next sync mark its link `failed` naming
      `not-found` with the follower still serving its last replicated snapshot, and the
      follower's takeover then proceeds as `replication.md` defines.
- [ ] AC23: After deletion, the repository's grants are gone, its credentials stay listed with
      scopes naming the deleted identity and its last name and grant nothing on a recreated
      repository of the same name, its signing keys are `retired` with public forms still
      retrievable by digest until tombstone time, and its trust set revisions, verdicts, policy
      records, retirements and operations are unchanged and readable.
- [ ] AC24: When the pruner drops a deleted repository's last snapshot, the `Package` rows,
      trust set revisions, the `policy` document and `advisory_ecosystem`, signing key material
      and pointer documents are dropped with it, condemnation and refusal records stay readable
      through the tombstone, and the `Repository` row remains as a tombstone (identity, last
      name, format, type, `deleted_at`, deleting principal, operation reference), listed only
      under `GET /api/v1/repositories?state=deleted` for the admin and never in the live
      listing, and a credential or operation listing that names the identity still renders the
      name; the pruner emits one `repository.reclaim` audit record at that moment; the
      tombstone survives every later pruning and sweep cycle.
- [ ] AC25: Changing a `remote`'s upstream keeps every cached reference and serves cached
      content with no upstream request, resets `last-checked` so the next request revalidates
      against the new upstream, and rejects an upstream `upstream.Validate` refuses with
      `upstream-invalid` and no change; changing format or type is refused `validation`.
- [ ] AC26: A repository provisioned through the seed subcommand's `repositories` entry and one
      created through the API with the same fields are indistinguishable in every column, the
      `repositories` entry can declare `read_only` and a `deleted` repository that a later entry
      recreates under the same name, and the seed path's dry run rejects an entry this spec's
      validation would refuse.
- [ ] AC27: Every lifecycle operation, refused or not, emits exactly one audit record through
      `telemetry.Auditor.Emit` whose `event` is the registered `repository.*` name for it
      (`repository.create`, `repository.configure`, `repository.freeze`, `repository.thaw`,
      `repository.rename`, `repository.delete`, `repository.detach` for a member-list removal,
      `repository.reclaim` from the pruner at tombstone time, this last asserted by AC24),
      carrying `repository_id` (the `rep_` identity) and `repository` (the name) from the fixed
      attribute set and, per event, `previous_name`, `reclaim` or `detach` from the registered
      extension set; every completed one records one `Operation` of kind `lifecycle` carrying its
      sub-kind, the identity and, for rename, both names; operations and audit records listed by
      repository are continuous across a rename and resolvable after deletion; and the gauge
      `repositories{format,repository_kind,state}` equals the table's counts after every
      transition, exported by the leader alone.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | integration + conformance | `internal/repository/create_test.go` (three types; identity shape and independence); `conformance/generic/lifecycle_test.go` and `conformance/oci/lifecycle_test.go` (first-request serving, both modes) |
| AC2 | unit + fuzz | `internal/repository/name_test.go` (table of grammar cases); `internal/repository/name_fuzz_test.go` (against the route table) |
| AC3 | schema introspection | `internal/model/schema_test.go` (shared with `data-model.md` AC38) |
| AC4 | unit + integration | `internal/repository/capability_test.go` (fixture handler declaring `Virtual: unsupported`); `conformance/core/matrix_test.go` (exempt rendering) |
| AC5 | integration | `internal/repository/virtual_test.go` (member validation table; rename-member stability) |
| AC6 | integration | `internal/repository/remote_test.go` (`upstream.Validate` refusals, credential resolution); `internal/repository/settings_test.go` (`configure` inside the transaction; no-`Operator` refusal) |
| AC7 | fault injection | `internal/repository/atomicity_test.go` (fault after each step of each operation) |
| AC8 | architecture test | `internal/format/arch_test.go` |
| AC9 | architecture test + integration | `internal/storage/arch_test.go` (sole write-transaction constructor calls `Writable`; the `ErrReplica`-waiving entry point imported only by `internal/replication`; shared with `storage-and-gc.md` AC25 and `replication.md` AC12); `internal/repository/writable_test.go` (read-only, replica, deleted, their renderings, the waiving entry point still refusing `read_only` and `deleted`, and cache materialisation not consulting it) |
| AC10 | conformance + integration | `conformance/generic/readonly_test.go` (real client publish refused 405, reads unchanged, thaw); `internal/storage/retention_test.go` (pruning under read-only on the injected clock) |
| AC11 | conformance + integration | `conformance/oci/readonly_remote_test.go` (network-layer assertion of zero upstream requests; not-found on miss; thaw); `internal/repository/readonly_remote_test.go` (eviction skipped over quota, freshness record unchanged, thaw restores fetching; shared with `proxy-cache.md` AC23); `internal/repository/readonly_test.go` (virtual refused) |
| AC12 | conformance + integration | `conformance/<format>/rename_test.go` in every format's set, its presence enforced by the harness's per-kind case validator (`conformance-harness.md` AC26); `internal/repository/rename_test.go` (record survival table; `configure` receipt) |
| AC13 | integration | `internal/repository/capability_test.go` (`Rename: unsupported`); `internal/replication/link_rename_test.go` (follower failure and link update) |
| AC14 | architecture test + integration | `internal/storage/arch_test.go` (AC15 scan includes `internal/repository`); `internal/repository/delete_test.go` (final checkpoint snapshot; cached reference ends; member rows; no deletion call observed via the storage fake) |
| AC15 | integration + conformance | `internal/repository/delete_test.go` (pointer release, name reuse, inheritance of nothing); `internal/storage/retention_test.go` (age-out and `reclaim: now` on the injected clock; shared blob survives); `conformance/generic/lifecycle_test.go` (not-found after delete) |
| AC16 | integration | `internal/repository/delete_remote_test.go` (grace then sweep on the injected clock; shared blob; provenance readable) |
| AC17 | property | `internal/storage/gc_property_test.go` (lifecycle operations in the op set) |
| AC18 | integration + conformance | `internal/repository/inuse_test.go` (refusal body; detach); `conformance/generic/virtual_detach_test.go` (real client through the virtual after detach) |
| AC19 | integration | `internal/repository/confirm_test.go` (mismatch; delete-and-recreate race) |
| AC20 | integration | `internal/repository/credential_inuse_test.go` (remote and link references; rotation then delete) |
| AC21 | integration | `internal/repository/delete_jobs_test.go` (pending cancelled in-tx; running cancelled at checkpoint; grace hold until terminal on the injected clock; schedules disabled; self-ending job); `internal/async/cancel_test.go` (`CancelByRepository` inside the deletion transaction, shared with `async-operations.md` AC28) |
| AC22 | integration | `internal/replication/lifecycle_test.go` (replica deletion ends link; leader deletion observed by follower; takeover afterwards) |
| AC23 | integration | `internal/repository/delete_records_test.go` (grants gone; credentials listed and inert; keys retired with public forms; untouched records readable) |
| AC24 | integration | `internal/storage/retention_test.go` (tombstone at last-snapshot prune on the injected clock; dropped rows including the `policy` document and `advisory_ecosystem`; condemnation and refusal records still readable; `repository.reclaim` record; survives further cycles; shared with `supply-chain-policy.md` AC22); `internal/manage/repository_delete_test.go` (`?state=deleted` admin-only, tombstones by identity, never in the live listing; `management-api.md` AC20's test, shared); `internal/credential/listing_test.go` (name rendered from tombstone; shared with `credential-management.md` AC20) |
| AC25 | integration | `internal/repository/configure_remote_test.go` (cache kept, `last-checked` reset, `upstream-invalid`, format and type refused) |
| AC26 | integration | `internal/repository/seed_parity_test.go` (column-by-column equality; `read_only` and recreate entries; dry-run rejection); `conformance/core/seed_test.go` (the `state: read_only` and recreate entries provisioned through the seed path; shared with `conformance-harness.md` AC24) |
| AC27 | integration | `internal/repository/audit_test.go` on `telemetry.NewTestRecorder` (one record per operation in the registered vocabulary; `repository_id` on every record; `Operation` fields; continuity across rename and after deletion); `internal/repository/metrics_test.go` (`repositories{format,repository_kind,state}` after each transition; shared with `observability.md` AC4 and AC7) |

## Implementation Phases

### Phase 1: The state machine and `local` repositories (charter step 2, with generic)
- `internal/repository`: identity generation, name grammar and reservation, the partial unique
  index, `Create` for `local`, `Configure`, `Rename`, `Freeze`, `Thaw`, `Writable`, `Delete`
  for `local` with confirmation and the final empty snapshot; the `lifecycle` operation kind;
  audit lines.
- The schema introspection test (AC3), the name fuzz test (AC2), the atomicity test (AC7), the
  handler boundary test (AC8), the writability architecture test (AC9).
- Generic's lifecycle, read-only and rename conformance cases; the seed path's `read_only` and
  recreate entries (AC26).

### Phase 2: Deletion against GC (charter step 3, with the data model and GC)
- Pointer release, age-out and `reclaim: now` on the injected clock; the tombstone at
  last-snapshot prune; the lifecycle operations in the GC property suite (AC14, AC15, AC17,
  AC24).
- Upload session expiry and the job cancellation hooks behind consumer-side interfaces, with
  fakes until `internal/async` exists (AC21's in-transaction half).

### Phase 3: `remote` and `virtual` (charter step 4, with OCI and the proxy layer)
- `Create` for `remote` (through `upstream.Validate`) and `virtual` (member validation, the
  `Virtual` capability), read-only on a `remote`, deletion of both types, the `in-use` rule for
  memberships and credentials, upstream change semantics (AC4, AC5, AC6, AC11, AC16, AC18,
  AC20, AC25).
- The `Rename` capability and OCI's rename case.

### Phase 4: Sibling records (charter steps 6a, 7 and 10, as each owner lands)
- Job cancellation on the production runner (AC21's running-job half), signing key retirement
  and material destruction at tombstone (AC23, AC24), replication link ending and the follower's
  failure path (AC13, AC22).

## Tasks

Left empty by `/spec`. Populated by `/tasks` once the spec reaches `planned`.

## Open Questions

None open. Nine questions were written in decision shape and adopted under the owner's standing
delegation; each is recorded below with its alternatives, and each is reversible by the owner.

### Resolved: whether a rename exists at all (was Q1)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: rename is an
identity-preserving relabel, gated per format by a `Rename` capability. Folded into Design
("Renaming", "Creation" step 2), AC12 and AC13.

**Recommendation:** A, because identity binding already makes a rename free of consequence for
every record in the shared model; refusing it would forfeit the one operational benefit that
design choice bought, and the formats that genuinely cannot rename (Hex) can say so.

| Option | You get | It costs |
|---|---|---|
| **A. Rename preserving identity, per-format capability** | Grants, tokens and keys survive; formats that embed the name refuse | Clients must be reconfigured; a handler hook for documents that embed the name |
| **B. No rename: create new, copy content, delete old** | Nothing to design | A copy is a new identity: every grant and token is reissued, every signed document re-signed; and the copy operation does not exist either |
| **C. Rename as a new identity with grants migrated** | Simple schema | Migrating grants is exactly the stale-reattachment hazard `auth.md` closed |

**Why this is yours:** it decides whether the identity rule is a safety property or also an
operational feature.

Accepted cost: the handler hook and a conformance case per format.

### Resolved: an alias or redirect for the old name after a rename (was Q2)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: no alias; the old name
answers `not-found` from the commit. Folded into Design ("Renaming") and AC12.

**Recommendation:** A, because an alias is a second name for one identity, which makes the
partial unique index a table of its own, lets a rename and a creation under the old name race,
and gives `auth.md`'s existence oracle two answers for one repository.

| Option | You get | It costs |
|---|---|---|
| **A. No alias** | One name per identity; the oracle holds; name reuse is immediate | Every client is reconfigured at the commit |
| **B. A bounded alias window serving the old name** | Clients keep working during the window | An alias entity `data-model.md` would own; the old name is reserved during the window; two names resolve one identity, and a format whose document embeds the name serves the wrong one on the alias |
| **C. A 301 from the old name** | No serving under the old name | Most clients in the matrix do not follow a cross-repository redirect for a publish, and several print only the reason phrase; and the reservation problem remains |

**Why this is yours:** it trades operator convenience against the oracle and the schema.

Accepted cost: renames are coordinated with consumers, not transparent to them.

### Resolved: deleting a repository that a virtual repository lists (was Q3)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: refuse with `in-use`
unless `detach: true`, which removes the memberships in the deletion transaction and enqueues a
merge per affected virtual. Folded into Design ("Deletion" step 2, "Deleting what a repository
depends on") and AC18.

**Recommendation:** A, because a virtual repository that silently shrinks fails its clients with
`not-found` and no explanation, and Harbor's `412` for a project that "still contains
repositories" is the precedent that a dependant blocks a deletion until the operator says
otherwise.

| Option | You get | It costs |
|---|---|---|
| **A. Refuse unless `detach: true`** | The operator sees the dependants and decides; one request when they know | Two-step deletion when they do not |
| **B. Cascade: remove memberships silently** | One step always | A virtual's resolution set changes with no trace but an audit line nobody reads |
| **C. Refuse always; detach through the virtual's own configuration first** | No `detach` flag | Two requests always, and a race between them |

**Why this is yours:** it decides how loud a change to another repository's served content must
be.

Accepted cost: the `detach` flag and a second problem type.

### Resolved: how a deletion ends a `local` repository's head (was Q4)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: one completed logical
write producing a final empty snapshot stored as a checkpoint, in the deletion transaction.
Folded into Design ("Deletion" step 5, the barrier table) and AC14.

**Recommendation:** A, because `data-model.md` already accepts a retention pass that removes
every version as one write, so the shape exists; the first and fourth roots then stop seeing the
repository by construction rather than by a "deleted repositories are excluded" clause in the
mark phase that the delete-pass re-check would have to mirror.

| Option | You get | It costs |
|---|---|---|
| **A. A final empty snapshot in the deletion transaction** | Existing write shape; roots need no special case; the snapshot is a checkpoint so it pins no chain | One large transaction for a large repository, the same cost a whole-repository retention pass already has |
| **B. Mark deleted; the mark phase excludes deleted repositories' current rows; a purge job deletes rows in batches** | Small deletion transaction | Two mark-phase clauses (mark and re-check) that must agree, a new job kind, and a window in which the rows exist but are not roots, which is the shape of every GC bug this project fears |
| **C. Delete rows directly in batches from the API handler** | No snapshot | Not one transaction; a crash leaves a half-deleted head |

**Why this is yours:** it touches the mark roots, which the owner settled at five.

Accepted cost: a large repository's deletion is a large transaction. If that proves a problem,
batching belongs to the shared write path that the retention pass also uses, not to this
package.

### Resolved: what a deletion request must carry to be believed (was Q5)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: the repository's
identity in the body, matched against the identity currently under the name. Folded into Design
("Deletion" step 1) and AC19.

**Recommendation:** A, because it costs one field and closes the one race name-addressed
deletion has (the name was deleted and recreated since the caller decided), using the identity
the API already returns on every read.

| Option | You get | It costs |
|---|---|---|
| **A. Identity confirmation** | Stale scripts delete nothing | One extra field the caller must fetch first |
| **B. Name confirmation (type the name again)** | Familiar from GitHub | Protects against typos only; a recreated name passes |
| **C. No confirmation; rely on the slow default** | Simplest | `reclaim: now` has no safety at all, and the slow default is recoverable only by an undelete this project does not have |

**Why this is yours:** it is the last check before the most destructive request in the product.

Accepted cost: the extra round trip.

### Resolved: whether the `Repository` row outlives its content (was Q6)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: a permanent tombstone
(identity, last name, format, type, `deleted_at`, principal, operation reference) once the last
snapshot is pruned. Folded into Design ("The state machine", "Deletion", tombstone) and AC24.

**Recommendation:** A, because `credential-management.md` AC20 requires a deleted repository's
name to render in a credential listing indefinitely, and an audit trail, a retirement and an
operation record each name the identity; a dangling identity in any of them is a question no
operator can answer.

| Option | You get | It costs |
|---|---|---|
| **A. Permanent tombstone** | Every identity in every record resolves forever | One row per deleted repository |
| **B. Drop the row with the last snapshot** | Nothing lingers | Credential listings, audit and retirements dangle; AC20 of credential-management fails |
| **C. Tombstone with its own expiry** | Bounded growth | A second window to configure, and the dangling references return after it |

**Why this is yours:** it is a permanent record with a small permanent cost.

Accepted cost: the row.

### Resolved: what read-only means on a `remote` (was Q7)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: no upstream contact;
cache-only serving with misses answered `not-found`. Folded into Design ("Read-only") and AC11.

**Recommendation:** A, because a `remote` has no completed writes for read-only to refuse, and
the operational need the state answers on a remote is "stop trusting the upstream, keep serving
what we verified", which Nexus's offline state and `supply-chain-policy.md`'s per-artifact
condemnation both point at.

| Option | You get | It costs |
|---|---|---|
| **A. Offline: cache-only** | A one-flag answer to a compromised or rate-limited upstream; frozen freshness | Misses fail; the operator must know the cache's coverage |
| **B. Refused: read-only applies to `local` only** | Nothing to design | No per-repository offline switch; the only alternative is deleting the upstream credential, which the `in-use` rule now refuses |
| **C. Read-only refuses eviction only, fetching continues** | Cache never shrinks | Not what "read-only" means to anyone, and new upstream content keeps arriving |

**Why this is yours:** it defines a word operators will read literally.

Accepted cost: the semantics differ by type and the documentation must say so beside the flag.

### Resolved: deletion while jobs run or sessions are open (was Q8)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: expire sessions in the
transaction, cancel pending jobs in the transaction, cancel running jobs cooperatively, keep the
job-held grace until each ends, never wait. Folded into Design ("Deletion" steps 7 and 8) and
AC21.

**Recommendation:** A, because the job-held grace (`async-operations.md`, resolved grace-hold
decision) already makes a running job safe against the sweep, so deletion need not wait for it;
and waiting would make deletion's latency the longest job's, which Harbor's "has pending tasks"
refusal shows operators experience as a broken delete.

| Option | You get | It costs |
|---|---|---|
| **A. Cancel and proceed; grace hold stands until terminal** | Deletion is prompt; no bytes lost under a running job | A job may run a few more steps against a deleted repository before its checkpoint |
| **B. Refuse while any job runs (Harbor's `412`)** | Nothing runs against a deleted repository | A stuck retrying job makes a repository undeletable for its retry ceiling |
| **C. Wait for jobs inside the request** | Clean | A request that may take minutes, and the transaction cannot span it |

**Why this is yours:** it trades deletion latency against a bounded window of wasted work.

Accepted cost: the window until the next checkpoint.

### Resolved: where `in-use` protection stops (was Q9)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: virtual memberships and
upstream credentials are protected; a leader repository is not, because the leader does not know
its followers. Folded into Design ("Deleting what a repository depends on") and AC20, AC22.

**Recommendation:** A, because the rule protects dependants the registry can see; inventing a
follower registry on the leader to protect the one it cannot see reverses `replication.md`'s
resolved retention-gap decision for a marginal gain.

| Option | You get | It costs |
|---|---|---|
| **A. Members and credentials** | Every visible dependant is protected | A follower learns of its leader's deletion by failing |
| **B. Also followers, via a leader-side follower registry** | Leaders refuse deletion while followed | Reverses a settled replication decision; a stale follower blocks a deletion forever |
| **C. Nothing: cascade everywhere** | One step always | Silent shrinkage of virtuals and `401`s from remotes with no trace |

**Why this is yours:** it fixes the boundary of a safety rule against another spec's decision.

Accepted cost: the follower's failure is the notification.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-27 | 21279d4 | authoring pass: grounded first draft, not a review | Not a review. Gathered the requirements `management-api.md` (repository administration, resolved Q7, Q10, AC19, AC20), `data-model.md` (`Repository`, `VirtualMember`, `Upstream`, `ReplicationLink`, the default pointer, the retention-pass write shape, the non-root table), `storage-and-gc.md` (fifth root, AC15, AC18, grace), `auth.md` (identity binding, AC29, the admin role, visibility), `credential-management.md` AC20, `signing-service.md` (per-repository keys), `artifact-verification.md` (per-repository trust sets), `upstream-adapters.md` (`Validate`, `UpstreamCredential`), `async-operations.md` (job repository ref, grace hold, cancellation), `replication.md` (link, follower writability, takeover), `proxy-cache.md` (eviction, quota), `conformance-harness.md` (`repositories` key, seed path), `format-handler-interface.md` (`Capabilities()`, reserved segments), `formats/hex.md` (was Q1) and consequences items management-api 3 and 4, async-operations 4, Open item 12 and theme 9 placed on this spec. Prior art fetched this run: Harbor's swagger (412 refusals), Pulp's settings and repository viewset, Gitea's storage doc and `DeleteUser`, Nexus cleanup policies, Distribution's `readonly` maintenance option; Artifactory's pages did not fetch and are not cited. Nine questions written in decision shape and adopted under the standing delegation; 27 criteria each with a Test Plan row; `node scripts/check-spec.js` run clean before this row was written. |
| 2026-09-28 | 0b79dc8 | cross-spec reconciliation of the foundation authoring wave. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` naming this file verified against the current text of its source spec before applying. From the charter reconciliation: Phase 1 at step 2, Phase 2 at step 3, Phase 3 at step 4, and the `shared:management` cost line. From the management-api reconciliation: the deleted listing is `GET /api/v1/repositories?state=deleted` (admin; its resolved was-Q11), in the state table, the tombstone paragraph and AC24, with `internal/manage/reads_test.go` shared. From web-ui: `Virtual` and `Rename` surfaced through `GET /api/v1/formats`. From format-handler-interface: the name grammar cites the full reserved table (`api`, `ui`, `healthz`, `readyz`, `metrics`, `replication`) and treats `v2` as OCI's carve-out, not a reserved segment (AC2). From the replication reconciliation: the sole constructor's `ErrReplica`-waiving entry point, imported by `internal/replication` alone, `ErrReplica` rendered `405` `replica` (Design, AC9, Test Plan shared with replication AC12 and storage-and-gc AC25); the link's updatable leader name and `ended`/`deleted` cited to its AC22. From the data-model reconciliation: "Repository identity and lifecycle state" cited; AC3's schema test shared with AC38. From the storage-and-gc reconciliation: "consequence" wording replaced by AC15, AC23, AC24 and AC25 citations, deletion named as AC25's single exemption. From the proxy-cache reconciliation: `internal/repository/readonly_remote_test.go` shared with its AC23 in AC11's row; the read-only remote paragraph cites AC23. From the supply-chain reconciliation: `policy` and `advisory_ecosystem` as core-held configuration rows, dropped at tombstone, in the Configuration table, deletion step 11, the tombstone paragraph and AC24, with `internal/storage/retention_test.go` shared with its AC22. From the conformance-harness reconciliation: AC12's rename case enforced by harness AC26; AC26's seed entries shared with harness AC24. From the observability authoring: a new "Audit and metrics" section (events `repository.create`, `.configure`, `.freeze`, `.thaw`, `.rename`, `.delete`, `.detach`, `.reclaim` through `telemetry.Auditor.Emit`, `repository_id` on every record, the `repositories{format,repository_kind,state}` gauge) asserted by AC27 with `audit_test.go` and `metrics_test.go` on `telemetry.NewTestRecorder`; `repository.configure` and the placement of `.detach` and `.reclaim` reported back to `observability.md`. Items 9, 10, 12 and 13 of this spec's authoring section remain queued for `signing-service.md`, `artifact-verification.md`, `async-operations.md` and `upstream-adapters.md`, which have not reconciled yet, and are phrased as queued rather than cited. No question raised or adopted; `node scripts/check-spec.js` zero failures on this file. Stays draft pending a gate review. |
| 2026-09-28 | 6e6d503 | cross-spec reconciliation sweep of the foundation wave. Not a review | Not a review. Applied the items raised against this file after its own 2026-09-28 pass, each verified against the source's current text. From the upstream-adapters and async-operations reconciliation (async AC28): deletion step 8 cancels through `Runner.CancelByRepository(ctx, tx, repo)` inside the deletion transaction, and AC21's row shares `internal/async/cancel_test.go`. From the proxy-cache reconciliation: the `delete (remote)` row cites its AC23. From the sweep of `format-handler-interface.md`'s reserved table: `t` (auth's root path token) joins the reserved segments the name grammar refuses, in Design and AC2. The three "queued, not yet applied there" sentences in deletion steps 8, 10 and 11 now cite `async-operations.md` AC28, `signing-service.md` AC29 and `artifact-verification.md` AC29, all reconciled since. Items already applied at 0b79dc8 re-verified (management-api 1, supply-chain 4, replication 3 and 5, harness 8, charter 3). No question raised or adopted; `node scripts/check-spec.js` zero failures on this file. Stays draft pending a gate review. |
