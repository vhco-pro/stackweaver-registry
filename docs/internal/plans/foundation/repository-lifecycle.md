---
status: planned
status_description: "Fable follow-up 2026-10-01 at 75e21cb, still planned: the four optional citation items the sibling follow-ups queued applied (storage-and-gc AC24, AC25 and AC30 on AC9, AC10, AC14 and AC21; async AC11 and AC28 on deletion step 8; proxy-cache AC23 on AC14 and step 5), data-model recheck item 4 found already applied at 261b20c, every reported sentence replaced by a citation now that the door's document-only form, the hook exemption and the read_only schedule rule have landed in storage-and-gc, signing-service, data-model, async-operations and management-api, and one defect found by the adversarial read of the lock-order text those siblings landed: the deletion read its own freshness values under a share lock that the same transaction later upgrades, PostgreSQL's canonical deadlock, so the deletion now locks its own rows FOR UPDATE first and a Lock order paragraph places every lock it takes in the door's order, with AC18 and AC21 gaining the no-deadlock interleavings; one sibling consequence reported (data-model AC36 wording). Planned by the Fable recheck of 2026-10-01 at 261b20c: a full review pass over the cloud-authored whole and the Opus sweeps, plus the re-examination of the ten questions adopted without Fable. Q1, Q2, Q5, Q7 and Q9 confirmed; Q3, Q4 and Q8 confirmed with their folds amended (the freshness floor under the share lock on detach and deletion, the member-validation and credential-reference races closed by a share lock, the deletion write exempt from the pre-commit hook and the pointer-document render so the fourth root really stops seeing a deleted local at commit, a virtual's merged documents and declared lists ended at its deletion, async's per-kind grace hold and cancel_requested); Q6 and Q10 confirmed with under-stated costs recorded. Q11 raised and adopted under the standing delegation: read_only does not stop document-only pointer transitions, so a frozen signed repository keeps renewing its envelope through a second predicate, Renewable, at the door's document-only form. New AC29 (virtual deletion and rename). 29 criteria, each with a Test Plan row; zero open questions; eleven sibling consequences reported for the orchestrator; fable_recheck cleared. The door's document-only form and the hook exemption have since landed in storage-and-gc.md (AC24, AC25) and signing-service.md (AC22, AC29), so nothing in this spec waits on a sibling."
description: "Spec for the repository lifecycle: creation of local, remote and virtual repositories with their type-specific settings, configuration changes and which of them are completed writes, renaming and what it does to identities, tokens, grants, replication links and client URLs, the read-only state, deletion as a reference-ending write whose space returns only through pruning and the sweep, deletion's effect on pointers, snapshots, cached content, upload sessions, jobs, keys, trust sets, links and virtual membership, and the reuse of a name after deletion."
author: michielvha
goal: "Give every repository one lifecycle with one enforcement point, so that creating, renaming, freezing and deleting a repository of any format and type does exactly what the shared model says on both paths, deletes no object outside the sweep, never reattaches a stale grant or token, never leaves a virtual repository silently serving less, and is provable on an injected clock before the first handler that depends on it ships."
priority: high
issue: 50
created: 2026-09-27
covers:
  - "internal/repository/**"
---

# Plan: Repository Lifecycle

One package, `internal/repository`, owns what a repository *is* over time: it comes into being with
a generated identity and a name, may be reconfigured, renamed or frozen, and ends as a reference
release whose bytes return only through `storage-and-gc.md`'s pruner and sweep. Every other spec
that keeps a per-repository record (tokens and grants, signing keys, trust sets, replication links,
jobs, policy rules, upstream bindings) is told here, by name, what a rename and a deletion do to
that record, and `management-api.md` remains the wire through which an operator asks for any of
it. The state machine has three states and two predicates, one every completed write consults
and one every document-only pointer transition consults, and the enforcers are architecture
and schema tests, not review.

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
  whose `internal/model/schema_test.go` is the same test AC3 here names. Its Fable recheck made
  every removal of a virtual member a floored document-only transition of the virtual's default
  pointer, the floor read under a share lock (AC36), and its AC45 drops a virtual's merged-set
  input record "at the virtual's deletion"; both are folded here.
- `storage-and-gc.md`: the fifth mark root (a pointer-targeted snapshot and its reconstruction
  chain), AC15 (no code path outside the sweep's delete pass and the orphan scan deletes an
  object), AC18 (deleting a pointer releases the root and serialises with pruning), the
  repository-scoped touch-refreshed grace, its AC15 scan naming `internal/repository` among the
  packages it holds to "management operations and repository deletion are reference-ending
  paths, never deleters", its AC24 (the lifecycle operations in the GC property suite, and the
  cadence re-sign proceeding on a `read_only` repository through the door's document-only
  form), its AC25 (the sole write-transaction constructor calling `repository.Writable`, its
  document-only form calling `repository.Renewable` with no waiving entry point, and repository
  deletion as the one named exemption, which skips the predicate, the pre-commit hook and the
  pointer-document render together), its AC30 (the lock order every write, member-list change,
  job `Finish` and deletion share) and its AC23, under which an unfinished `Job` naming a
  repository and carrying `holds_grace` holds its grace open.
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
  deletion and a rename each need a stated effect on them. Its cadence re-sign (AC22) renews a
  signed envelope by a pointer transition that creates no snapshot and moves no target, on a
  `read_only` repository as on an `active` one; its generator runs in the door's pre-commit
  hook before every commit on an `Indexer` format except the deletion write, which its AC29
  holds to zero generator and signer calls; and a virtual's merge swap writes declared
  blob-digest lists that "the virtual's deletion ends" while "a rename of the virtual enqueues
  exactly one coalesced merge" (AC19): three facts the read-only and deletion designs below
  answer.
- `artifact-verification.md`: the trust set is per repository and "lives beside the
  repository's retention rules as core-parsed configuration, in no snapshot"; verdicts are
  keyed by digest and must outlive the blob they explain.
- `upstream-adapters.md`: the `Upstream` fields and `upstream.Validate` on remote create and
  `PATCH`; the `UpstreamCredential` store shared with replication links; administration of
  credentials is `management-api.md`'s. What happens when a referenced credential is deleted is
  nobody's yet, and it is decided here.
- `async-operations.md`: a `Job` may carry a repository reference "whose grace the job holds
  open" for a kind declaring `HoldsGrace` (`proxy.revalidate` declares it false; its resolved
  grace-hold decision, was Q4 there, as amended on its Fable recheck), cancellation is
  cooperative with a `cancel_requested` column that survives a lost notification, `exclusive_key`
  serialises jobs on one repository, and its kind table disables the `retention.pass` schedule
  while a repository is `read_only` and no other.
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

- The lifecycle state machine: `active`, `read_only`, `deleted`, its transitions, the one
  writability predicate every completed-write path consults, and its document-only sibling
  that every cadence re-sign, merge commit and member-list change consults.
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
through `Submit`, a retention pass, a replication freeze (`replication.md`'s sense, the copy of
a remote's cache into a local; the lifecycle `freeze` below is configuration and opens no write
transaction), and every pointer create and every target-moving repoint or deletion.
`replication.md` already places "refuses for a repository with an
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

A **document-only pointer transition** is the one class of transaction that is neither a
completed write nor cache materialisation: `data-model.md` AC36's transitions that change no
target and create no snapshot, which are the cadence re-sign's repository batch
(`signing-service.md` AC22), a virtual's merge commit and its member-list change. It writes a
reference (the re-rendered pointer document's body, through the shared reference-creation call)
and advances the freshness record, so it opens its transaction at the same door, in the door's
document-only form, and that form consults a second predicate this package exposes,
`Renewable(ctx, id) error`, which returns `nil` for an `active` **or `read_only`** repository
with no active replication link and `ErrReplica` or `ErrDeleted` otherwise. The split is what
keeps an archived repository servable: a frozen Debian suite whose `Valid-Until` lapsed, or a
frozen Hackage repository whose TUF `timestamp.json` expired, is refused by every client, so a
read-only state that stopped the cadence re-sign would not be "serving what it serves now" but
serving nothing within a window (the resolved document-only-transitions decision, was Q11). A
follower renews nothing either way (`signing-service.md` AC23), which is why `ErrReplica` is
refused by both predicates and the document-only form has no waiving entry point. `Writable` and
`Renewable` read the same row and differ in exactly one state, and AC9 asserts both. The door
side is `storage-and-gc.md`'s ("The write transaction has one door", AC25); the two transitions
that take the form on the job runner are `async-operations.md` AC11 (the merge swap) and
`signing-service.md` AC22 (the re-sign), and `management-api.md` AC31 asserts the renewal
continuing under `freeze` on the wire.

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
component grammar `formats/oci.md` must satisfy (its resolved name-split decision, was Q8, takes
the first component of an OCI name as the registry repository, so this grammar is exactly what a
Docker client sends in that position) and a subset of what every other client passes
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
     repository), with no duplicates. The existence and state check reads each member's
     `Repository` row **under a share lock** (`SELECT ... FOR SHARE`), so a deletion of that
     member, which updates the row, serialises against it in PostgreSQL: either the deletion
     committed first and the check sees `deleted`, or this transaction committed first and the
     deletion's `in-use` check sees the new membership. Without the lock a check-then-act window
     admits a membership on a repository deleted a moment later, a virtual that silently serves
     less, which is the failure the `in-use` rule exists to prevent (AC5). `VirtualMember` rows
     are written with their positions.
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
first client request rather than being rendered on the first miss. That enqueue and the one on a
member-list change (below) are this spec's two contributions to the `index.merge` trigger set;
the others are `signing-service.md`'s and stated here only so a reader has the whole set: a
member's completed write (through the pre-commit hook), a `remote` member's adoption (through
the adoption hook), and a **target-moving transition of a `local` member's default pointer**, a
promotion into it or a rollback of it through the runtime's `Transition` inside the repoint,
since a rollback changes what the member's head holds without any write. Each enqueues a merge
for every virtual listing the member under the same coalesce key (`signing-service.md` AC19,
`async-operations.md` AC11); a repoint of a member's environment pointer enqueues nothing,
because a member contributes its default pointer's set alone. Pointer management stays out of
this spec's scope; the trigger is named here because it is the one lifecycle-adjacent event
that changes what a virtual serves without a write on any repository.

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
| virtual member list (add, remove, reorder) | configuration, with a merge and a document-only transition | `VirtualMember` rows rewritten in one transaction, an added member's `Repository` row read under the share lock of creation step 3; the change is a **floored document-only transition** of the virtual's default pointer (`data-model.md` AC36): its `moved_at` is set no earlier than one second after the latest freshness value the virtual could have served, computed from each removed member's values (a `local`'s `moved_at` on the pointer the virtual resolves it through, a `remote`'s latest `adopted_at`) read **under a share lock on those rows** inside this transaction, so an adoption or a transition of the removed member that would raise the value commits after the change and is never served through the virtual, and `Last-Modified` never steps backwards on a per-request virtual (`composer.md`, `homebrew.md`); a merge is enqueued for formats with an `Indexer`, coalesced with the triggers named under "Creation"; resolution order changes at commit |
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
  conformance suite's rename case proves its served documents were never name-bound. A
  `virtual`'s served documents are rendered by the merge, never by `Apply`, so for a `virtual`
  of a format with an `Indexer` the rename enqueues one `index.merge` (coalesced like any
  trigger) in the rename transaction instead of, not beside, the handler hook
  (`signing-service.md` AC19's rename clause): a merged
  document that embeds the name is re-rendered under the new one within the staleness bound,
  and a format whose merged documents embed nothing does one idle merge. The
  conformance case is the same for every format: rename, then a real client installs from the
  new name in both modes, and a request to the old name is `not-found` (AC12).
- **Hostname bindings name the repository, not its identity** (the resolved hostname-binding
  decision, was Q10). `deployment.md`'s `server.hosts` is a file-only list of `{hostname,
  repository}` whose `repository` is a name, because a hostname binding is a deployment fact an
  operator writes beside DNS and a certificate, not a registry record. A rename therefore leaves
  every binding naming the old name pointing at a repository that no longer exists: from the
  commit, root-anchored requests on that hostname answer `404` and the binding logs the same
  warning `deployment.md` AC12 asserts for a binding to a missing repository, until the operator
  edits the binding to the new name and reloads it with `SIGHUP`. That `404` is the shared
  denial `auth.md` renders when the claiming handler's `Scope(r)` returns an error for an
  unbound hostname, the handler never invoked (`format-handler-interface.md` AC10, "Host-bound
  claims"), not a response the handler writes. The rename is not refused for
  it. What the core adds is that the break is announced where the admin is looking: the rename's
  `repository.rename` audit record and the `lifecycle` `Operation` list every hostname the
  process's loaded `server.hosts` bound to the old name (`unbound_hosts`), and the process logs
  one warning per such hostname at the commit. The list is what the **renaming process** has
  loaded: a replica running with a different `server.hosts` file is not in it and logs its own
  missing-repository warning at its next request on that host, so the announcement is complete
  only where every replica loads the same file, which is the deployment shape `deployment.md`'s
  chart produces and the one its operator documentation assumes. A repository later created, or
  renamed, under the
  old name is bound by that hostname from then on, exactly as a client URL naming the old name
  reaches it (the risk "Uniqueness is among live repositories" accepts, one only the admin can
  create); `terraform.md` AC26 and `puppet.md` AC27 carry the real-client half, and the operator
  documentation puts the edit-and-reload step beside the rename step (AC28).
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
  suspended too: an archived repository is not slowly emptied by its own rules
  (`async-operations.md`'s kind table disables the `retention.pass` schedule while `read_only`,
  and a pass running at the freeze is refused at its commit and ends with nothing committed). A
  deferred management operation pending at the freeze meets the same refusal when its `Apply`
  runs and ends `failed` with `read-only`, and an upload session open at the freeze commits
  its publish into the same refusal, its blobs left to grace and the sweep. Snapshot
  pruning and the sweep keep running, since they are not writes to the repository: older
  snapshots age out under the window while the served one is pinned by the default pointer
  (the fifth root), so an archived repository converges to exactly the snapshots its pointers
  target and nothing more. **The cadence re-sign keeps running too**: it is a document-only
  transition (the state machine, `Renewable`), it changes no content and no target, and it is
  what keeps a signed archive's `Valid-Until` or TUF expiry from lapsing while frozen, so what
  a frozen repository serves is bit-identical in every content file and unsigned document and
  renewed on schedule in its signed envelope. Key operations are the one signing surface the
  state does refuse: they arrive as `configure` operations through `Submit`
  (`signing-service.md`, "Key operations arrive as `configure` operations"), a rotation batch
  re-signs every served body, and an operator who must rotate an archived repository's key
  thaws, rotates and freezes again. An `external` key's document (`hackage.md`'s
  operator-signed `root.json`) is submitted through the same route, so its expiry is renewed by
  a thaw as well, and `SigningDocumentExpiring` (`signing-service.md` AC22) is the warning that
  a frozen repository holding one needs it; that is the accepted cost of the resolved
  document-only-transitions decision (was Q11).
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
   decision, was Q5). The read that checks the identity takes the `Repository` row `FOR
   UPDATE`: it is the first lock the transaction takes and the one every later step's
   serialisation claim rests on ("Lock order", below).
2. **The `in-use` check.** If any `virtual` repository lists this repository as a member, the
   deletion is refused `409` with problem type `in-use`, its `detail` and extension member
   naming every such virtual repository, unless the request sets `detach: true`, in which case
   each membership row is removed in this transaction and a merge is enqueued for each affected
   virtual repository (the resolved member-deletion decision, was Q3). Each such removal is the
   floored member-list transition of the Configuration table: the floor is computed from this
   repository's freshness values (its default pointer's `moved_at` for a `local`, its latest
   `adopted_at` for a `remote`), read **before step 5 drops the documents and step 6 the
   pointers those values live on** and under this transaction's own update lock on those rows
   (`FOR UPDATE`, since step 6 updates them: the share lock a virtual's member-list change
   takes on a member it does not own would here be a share lock the same transaction later
   upgrades under a concurrent merge's share, PostgreSQL's canonical deadlock), and written onto
   each affected virtual's default pointer in this transaction (`data-model.md` AC36's "a
   member removed by its own deletion or detachment sets the same floor from the values that
   transaction held"; the lock kind is this spec's, "Lock order" below). The
   `in-use` check itself reads `VirtualMember` under the same serialisation creation step 3
   gives a membership insert: step 1 locked this repository's row, so an insert that
   read the row `FOR SHARE` either committed before this check and is seen, or waits on this
   transaction and then sees `deleted`. A `remote` whose
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
   write opens at the sole write-transaction door under the named exemption `storage-and-gc.md`
   AC25 gives deletion, and **the exemption covers the door's pre-commit hook and the
   pointer-document render as well as the writability check** (`storage-and-gc.md` AC25 as
   amended, `signing-service.md` AC29's zero generator and signer calls, `data-model.md` AC36's
   one exception): no generator runs over the empty
   content set and no pointer document is rendered for the pointer moves of step 6. Were the
   hook to run, a signed format's `Indexer` would regenerate an empty index into fresh current
   documents (a `Release` for no packages, signed under a key step 10 retires in this same
   transaction), which the fourth root would then hold until tombstone time, and the sentence
   that follows would be false. So the
   first mark root and the level-document half of the fourth stop seeing the repository at this
   commit, because they walk current rows and current documents and there are none; the one
   reach of the fourth root that outlives the commit is the default pointer's existing
   `PointerDocument` record, one envelope body that nothing serves (the repository answers
   `not-found`) and that is dropped at tombstone time with the pointer (`data-model.md` AC36),
   while the named pointers' records go with their pointers in step 6. For a `remote`, which has no
   snapshots, every cached reference (`File` rows bound to `RemoteFile` sources) is ended in
   this transaction through the reference-ending call eviction uses, the eviction shape
   `proxy-cache.md` fixed. The remote's **current metadata documents** at all three levels are
   not cached references and are not ended in the eviction shape: no eviction ever reaches them
   (`proxy-cache.md`'s resolved metadata-eviction decision, was Q21 there), and the remote's
   deletion is the one event that ends them. They are removed in the same transaction as the
   cached references, alongside their cache-scoped freshness records and the declared
   blob-digest lists they carry (`proxy-cache.md`'s resolved declaring-document decision, was
   Q22 there, puts some of those lists on package-level documents), the way a `local`'s head
   documents end, so the fourth mark root stops seeing them and the retained revisions they
   keep alive at this commit. No object is touched in either half, and the blobs fall to the
   sweep after grace like any unreferenced content. The
   `Upstream` row, its `RemoteFile` rows and its negative-cache entries (`proxy-cache.md`,
   "Negative caching", all three named in its AC23) are deleted with it; `FileProvenance` records in
   other repositories that name this remote as a source are unaffected (they hold a URL, not a
   reference). For a `virtual`, there are no content rows, but there are **current documents**:
   its merged document set (`signing-service.md`, "Virtual merges"), CAS-backed above the
   threshold and held by the fourth root's current-document half exactly as a remote's index
   is (`storage-and-gc.md` AC16), each carrying a declared blob-digest list (its own parts and
   the predecessor merged generations its profile retains, `debian.md`'s two `by-hash`
   generations) and, as metadata on them, the merged set's input record with its requested
   cells (`data-model.md` AC45). The deletion removes the merged documents, ends every list
   they carry (the swap's declared-list producer run backwards, through the same
   reference-ending path), and drops the input record, in this transaction, the way a
   `local`'s head documents end; `signing-service.md` AC19's "the virtual's deletion ends the
   list" and `data-model.md` AC45's "dropped at the virtual's deletion" are the two sibling
   statements of it. Its `VirtualMember` rows (where it is the virtual) and its named pointers'
   `PointerDocument` records are removed; an `index.merge` pending for it is cancelled in step 8,
   and a merge running at the commit finds its swap refused `ErrDeleted` at the door and ends
   `cancelled` with nothing committed (`async-operations.md`, "Repository deletion cancels the
   repository's jobs", its AC11).
6. **Release the pointers.** Every named pointer is deleted and the default pointer is moved
   onto the final empty snapshot (for a `local`) or deleted (for a `remote` or `virtual`, whose
   only snapshot is the initial one and is dropped with the row). Each is the pointer-release
   path `storage-and-gc.md` AC18 polices: it serialises with pruning's targeted check in
   PostgreSQL, and the snapshots each pointer pinned fall back under the retention window at
   commit, prunable immediately if already aged out.
7. **Upload sessions** open in the repository are expired in this transaction. Their committed,
   unreferenced blobs are then ordinary grace-protected bytes of a repository whose last write
   activity is this deletion; the grace runs from it and the sweep collects them when it lapses.
8. **Jobs** naming the repository are asked to stop: every `pending` job, a retrying one
   included, is moved to `cancelled` in this transaction (it never ran), and every `running`
   job has its `cancel_requested` column set in the same transaction and receives the
   cooperative cancellation `async-operations.md` defines when the deletion commits, reaching
   `cancelled` or `failed` at its next checkpoint; the column makes the cancel survive a lost
   notification and a lease expiry (its resolved cancellation decision, was Q5 there, as
   amended). Until it does, its grace hold stands **if its kind holds one**: the hold is
   declared per kind (`HoldsGrace`, copied to the row as `holds_grace` at enqueue;
   `async-operations.md`'s resolved grace-hold decision, was Q4 there, as amended on its Fable
   recheck; `storage-and-gc.md` AC23), every kind that commits bytes before the write that
   references them holds it, so a half-imported artifact's bytes are collected after the job
   ends, never under it, and `proxy.revalidate` alone declares `HoldsGrace: false`, because an
   adoption commits its row and reference together and holds nothing awaiting a reference. The
   deletion does not
   wait for running jobs; a job that observes a `deleted` repository at its next step ends
   itself. A `Schedule` scoped to the repository (a retention pass, a cadence re-sign, the
   `replication.sync` of each of its links) is
   disabled. The deletion transaction does all of this through one call, the runner's
   `CancelByRepository(ctx, tx, repo)`, the only write path into the job table outside
   `internal/async` (its architecture test); the job-side half (self-ending on a deleted
   repository, repository-scoped schedules disabled, the grace hold released only at the
   running job's terminal state) is `async-operations.md` AC28. A `remote`'s pending
   `proxy.revalidate` and a `virtual`'s pending `index.merge` each name that repository as
   the job's repository reference, so this step reaches them (its AC11 fixes the merge job's
   reference as the virtual it merges; its AC28 names both among the cancelled). The job rows
   are the last rows the deletion touches, which is what keeps this step and a running job's
   `Finish` out of a lock cycle ("Lock order", below).
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

**Lock order.** The numbered steps are the order of effects. Locks are taken in the door's
order (`storage-and-gc.md`, "The head lock is the last lock a write takes", AC30;
`async-operations.md`, "Finish"), so that the deletion, a member's own write, a virtual's merge
or member-list change and a running job's `Finish` can never wait on one another in a cycle. The
deletion's first lock is its own `Repository` row, `FOR UPDATE` at step 1. Next come the other
non-head rows it updates, each taken `FOR UPDATE` and never `FOR SHARE`: its own pointer and
freshness rows as step 2 reads the floor, the membership and link rows of steps 2 and 3, and,
before the head write of step 5 opens, the session, grant, key and `Upstream` rows that steps 7,
9 and 10 and the `remote` half of step 5 update later, so that no update after the head takes a
lock it did not already hold. Then each affected virtual's head, for the floor write of step 2.
Then this repository's own head and pointers, through the door, at steps 5 and 6. The job rows
last, at step 8. That is the order a merge or member-list change takes (member rows under a
share lock, then the virtual's head), the order a member's own write takes (its documents, then
its head) and the order a job's `Finish` takes (documents, member rows, head, job row), so no
transaction holds a head while waiting on a row the deletion holds and none holds a job row
while waiting on a head. A transaction sharing a row the deletion will update (a merge reading
this repository's freshness values, a creation validating it as a member) either committed
before the deletion's lock and is seen, or waits and then sees `deleted`, and the deletion never
waits on such a transaction while holding a lock it wants. `storage-and-gc.md` AC30's property
case interleaves a deletion cancelling a job with that job's `Finish` and asserts no deadlock;
AC18 and AC21 here add the merge, adoption and transition interleavings on the deleted member.

**Tombstone.** When the pruner drops the deleted repository's last content snapshot (and, for a
`local`, its final empty snapshot with it, since nothing else targets it once the default
pointer is deleted at that moment), it also drops the `Package` rows, the trust set revisions,
the `policy` document and `advisory_ecosystem`, `SigningKey` material and `PointerDocument`
records, and leaves the `Repository` row as a tombstone: identity, last name, format, type,
`deleted_at`, deleting principal, and the `Operation` reference. The tombstone is never removed.
It is what lets a credential listing, an audit trail, a retirement record and an operation
record name a repository that no longer exists (`credential-management.md` AC20 renders the
deleted repository's last name from it; `data-model.md` AC38), and it costs one row per deleted
repository, which is a price worth paying for never having a dangling identity in the audit
trail. The operation reference is the deleting `Operation`'s wire identifier, kept as an
identifier: `Operation` rows are pruned after `management.operation_retention` (90 days by
default, `data-model.md` "Operations"), so after that window the reference resolves to nothing
but still names the request the audit trail recorded; the tombstone never keeps the `Operation`
row alive, and the identity, principal and `deleted_at` on the tombstone itself are what an
operator reads after the window. A tombstone is listed only under `GET /api/v1/repositories?state=deleted` (admin), by
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
`repository.rename` (extension attributes `previous_name` and `unbound_hosts`, the hostnames
`server.hosts` bound to the old name, was Q10), `repository.delete` (extension
attributes `reclaim` and `detach`, the latter listing the virtual repositories detached),
`repository.detach` (a member removed from a `virtual` through its member-list configuration,
so a virtual's resolution set never changes without a line naming it) and `repository.reclaim`
(emitted by the pruner at tombstone time, the one lifecycle record not tied to an operator's
request). `observability.md`'s vocabulary table lists all eight, `repository.configure` with
`changed_fields`, `.detach` on the member-list change and `.reclaim` on the pruner, with
`previous_name`, `unbound_hosts`, `reclaim` and `detach` as extension attributes, and its AC12
diffs that table against this list in both directions. A line
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
| delete (`local`) | the final empty snapshot's checkpoint; no pointer document (the door's exemption skips the hook and the render) | every head reference | deletes named pointers, moves the default pointer | no | the pointer moves serialise with pruning's targeted check (AC18); the reference ends are ordinary row deletes the next mark observes |
| delete (`remote`) | no | every cached reference, and every current metadata document with its declared blob-digest list (documents are not cached references) | deletes the default pointer | no | cached references in eviction's shape (`proxy-cache.md` AC7, asserted for deletion by its AC23); documents as current documents the fourth root stops seeing at commit, never through eviction (`proxy-cache.md` AC29, `storage-and-gc.md` AC16) |
| delete (`virtual`) | no | every merged document and the declared list each carries (its parts and the retained predecessor generations); the input record with it | deletes the default pointer | no | the merged documents are current documents the fourth root stops seeing at commit, their lists ended through the reference-ending path the merge swap's producer mirrors (`storage-and-gc.md` AC16, `signing-service.md` AC19); a merge running at the commit is refused at the door |
| detach member | no | no | a floored document-only transition of each affected virtual's default pointer (no target change; the member's values read under the deletion's own update lock before its documents and pointers go) | no | a merge is enqueued; the merge's own writes go through the write path |
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
| `read_only` means | no completed writes; retention pass suspended; the cadence re-sign continues | no upstream contact; cache-only serving | refused |
| Rename hook | `configure` with `rename` args when `Operator` present | same | one coalesced `index.merge` when the format declares an `Indexer`; members unaffected |
| Deletion ends | head references via a final empty snapshot; named pointers | every cached reference; every current document with its freshness record and declared list; the `Upstream` row | member rows; the merged documents with their declared lists and input record; pointer documents |
| Reclamation | pruner then sweep, under the window or `reclaim: now` | sweep after grace (no snapshots) | nothing to reclaim |
| Replication | link ended if a replica | not linkable | not linkable |
| `in-use` blockers | virtual memberships | virtual memberships | none |

### Package shape and the Go rules

`internal/repository` is a domain package in the Go skill's sense: it owns the `Repository`
lifecycle and exposes a small struct API (`Create`, `Configure`, `Rename`, `Freeze`, `Thaw`,
`Delete`, and the two predicates `Writable` and `Renewable`) taking `context.Context` and typed
request structs, returning typed refusals that `internal/manage` maps to problem types. A
refusal that carries nothing is a sentinel matched with `errors.Is` (`ErrNameTaken`,
`ErrNameInvalid`, `ErrReadOnly`, `ErrDeleted`, `ErrConfirm`); one that carries data is an error
type matched with `errors.As`, because a sentinel cannot carry the dependants an `in-use` body
names, a format's reason text or a leader's name (`*InUseError` with its dependants,
`*CapabilityError` with the format's reason, `*ReplicaError` with the leader). The mapping is
`conflict`, `validation`, `in-use`, `capability-unsupported`, `read-only`, `replica`,
`not-found` and `validation` respectively, and the two predicates return the same values, so a
caller of either matches them the same way. It declares the consumer-side interfaces it needs
where it uses them: a metadata store transaction, a pointer writer (target-moving and
document-only transitions alike, the floor among its inputs), a session expirer, a job
canceller, a link ender, a key retirer, a merge enqueuer, and the `Operator` lookup, each
satisfied by the owning package's type at wiring time and by fakes in tests. It starts no goroutine and holds no timer
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
| Every completed-write path calls `Writable` before opening its transaction, every document-only transition `Renewable`; only `internal/replication` reaches the `ErrReplica`-waiving entry point; the deletion exemption skips the hook and the pointer-document render | `internal/storage/arch_test.go`: the write-transaction opener is the only constructor of a write transaction, it calls the predicate, its document-only form calls `Renewable` and has no waiving entry point, its one waiving entry point has one importer, and a fixture caller that bypasses it fails compilation against the unexported constructor (AC9; shared with `storage-and-gc.md` AC25 and `replication.md` AC12); `internal/repository/delete_test.go` observes no hook and no render on a fixture `Indexer` handler (AC14) |
| A membership is never written on a deleted repository, and a deletion never leaves a membership behind | `internal/repository/inuse_test.go`: the member-list write and the member's deletion interleaved at every point under the share lock (AC5, AC18); the same shape for an `Upstream` row and its credential (AC20) |
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
      leaves the membership intact and resolution unchanged; and a member-list write adding a
      member, which reads the member's `Repository` row `FOR SHARE`, interleaved with that
      member's deletion at every point, either refuses the member
      as deleted or makes the deletion refuse `in-use`, and no run commits a membership on a
      `deleted` repository.
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
      management operation through `Submit`, retention pass, replication freeze, pointer create,
      target-moving repoint and pointer delete) calls `Writable` before opening its transaction,
      enforced by an architecture test
      on the sole write-transaction constructor (`storage-and-gc.md` AC25); a `read_only` repository and a repository with
      an active replication link and a deleted repository are each refused through the same
      predicate with distinct typed errors (`ErrReadOnly`, `ErrReplica`, `ErrDeleted`), rendered
      `405` `read-only`, `405` `replica` naming the leader and `not-found`; the constructor's one
      further entry point waives `ErrReplica` alone, still refuses `ErrReadOnly` and
      `ErrDeleted`, and is imported by `internal/replication` and no other package, asserted by
      the same architecture test; every document-only pointer transition (a cadence re-sign, a
      virtual's merge commit and member-list change) opens through the constructor's
      document-only form, which calls `Renewable` and has no waiving entry point, and
      `Renewable` answers `nil` on a `read_only` repository and refuses `ErrReplica` and
      `ErrDeleted` exactly as `Writable` does; and cache materialisation consults neither
      predicate.
- [ ] AC10: On a `read_only` `local`, a real client's publish and every management content
      operation, pointer operation, signing-key operation and retention pass are refused `405`
      `read-only` on the API
      and on every binding, a deferred management operation pending at the freeze ends `failed`
      with `read-only` when it runs, reads keep serving every content file and unsigned document
      bit-identically, the cadence re-sign of a signed envelope runs on schedule on the injected
      clock so a Debian-shaped fixture's `Valid-Until` and a TUF-shaped fixture's `expires` never
      lapse while frozen and a real client accepts the renewed envelope (`signing-service.md`
      AC22; `storage-and-gc.md` AC24's read-only clause), older untargeted
      snapshots still
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
      produces exactly one final empty snapshot stored as a checkpoint, with no pre-commit hook
      run and no pointer document rendered (a fixture `Indexer` handler's generator is never
      called and no new `PointerDocument` record or body appears, so the fourth root's
      level-document half holds nothing of the repository from the commit), deleting a
      `remote` ends
      every cached reference, removes every current metadata document with its freshness
      record and declared blob-digest list, and deletes its `Upstream`, `RemoteFile` and
      negative-cache rows (`proxy-cache.md` AC23's deletion clause),
      deleting a
      `virtual` removes its member rows and its merged documents as AC29 asserts, and in every
      case no blob-store deletion call is
      observed during the transaction.
- [ ] AC15: Deleting a `local` deletes its named pointers, moves its default pointer onto the
      final empty snapshot, frees its name at commit for a new repository that inherits no
      grant, token scope, signing key, trust set, retirement or membership, leaves its content
      snapshots to age out under its retention window, and with `reclaim: now` has every
      content snapshot pruned and every blob no other root reaches collected within one cycle,
      on the injected clock; a blob shared with another repository survives in both cases; a
      real client's request to the deleted name is `not-found` from the commit.
- [ ] AC16: Deleting a `remote` ends every cached reference and removes every current metadata
      document at the repository, package and version levels, inline and CAS-backed, with the
      declared blob-digest lists they carry; the cached files' blobs, the CAS-backed document
      bodies and the blobs of retained revisions declared only on those documents are collected
      once the repository-scoped grace lapses, a blob also cached or published in another
      repository survives, no eviction pass run before the deletion has ended any of the
      documents, and `FileProvenance` records in a frozen repository that name the deleted
      remote remain readable.
- [ ] AC17: The GC property suite's operation set includes create, delete (both types, with and
      without `reclaim`), detach, freeze, thaw and rename interleaved with publishes, the sweep
      and pruning on the injected clock, and no run loses a blob reachable from any surviving
      root, leaves a surviving snapshot unreconstructible, or deletes an object outside the
      sweep's delete pass and the orphan scan.
- [ ] AC18: Deleting a repository that is a member of one or more virtual repositories is
      refused `409` `in-use` naming each of them and changes nothing; with `detach: true` the
      memberships are removed in the deletion transaction, a merge is enqueued per affected
      virtual repository, each affected virtual's default pointer carries a `moved_at` at least
      one second after the deleted member's latest freshness value as read under the deletion's
      own update lock in that transaction (on an injected clock stepped backwards, and with an
      adoption of the deleted `remote`, a transition of the deleted `local`'s pointer and a
      merge of the affected virtual each interleaved at every
      point of the deletion), so no request served through a per-request virtual ever carries
      a `Last-Modified` the virtual later serves lower, no interleaving ends in a deadlock
      abort on either side, and a real client resolving through the
      virtual afterwards sees the
      remaining members' content in the remaining order and nothing of the deleted member.
- [ ] AC19: Deletion requires the repository's identity as confirmation: a request whose
      `confirm` does not match the identity currently under that name is refused `validation`
      and deletes nothing, including the case where the name was deleted and recreated since
      the caller learned the identity.
- [ ] AC20: Deleting an `UpstreamCredential` referenced by any `Upstream` or `ReplicationLink`
      is refused `409` `in-use` naming each remote repository and link; after the last
      reference is removed (repository deleted, or credential rotated away) the deletion
      succeeds; and a `remote`'s creation or upstream change referencing the credential,
      interleaved with the credential's deletion at every point, either refuses the reference as
      unresolvable or makes the deletion refuse `in-use`, never an `Upstream` row naming a
      credential that is gone.
- [ ] AC21: Deleting a repository expires its open upload sessions and cancels its jobs: every
      pending and retrying job is `cancelled` in the transaction, every running job has
      `cancel_requested` set in the transaction and ends `cancelled` or
      `failed` at its next checkpoint, its grace hold stands until then for a kind declaring
      `HoldsGrace` so the bytes it named
      are collected after it ends and never before while a running `proxy.revalidate` holds
      none, repository-scoped `Schedule`s are disabled,
      a `remote`'s pending `proxy.revalidate` and a `virtual`'s pending `index.merge` are among
      the cancelled,
      a job that observes the deleted state at its next step ends itself without a write, and
      the deletion and a running job's `Finish` interleaved at every point never deadlock, the
      job rows being the last rows the deletion locks (`storage-and-gc.md` AC30's property
      case).
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
      attribute set and, per event, `previous_name` and `unbound_hosts`, `reclaim` or `detach`
      from the registered extension set; every completed one records one `Operation` of kind `lifecycle` carrying its
      sub-kind, the identity and, for rename, both names; operations and audit records listed by
      repository are continuous across a rename and resolvable after deletion; and the gauge
      `repositories{format,repository_kind,state}` equals the table's counts after every
      transition, exported by the leader alone.

- [ ] AC28: Renaming a repository that `server.hosts` binds by its old name commits (the binding
      does not refuse it); from the commit a root-anchored request on that hostname answers `404`
      and the missing-repository warning is logged, the `repository.rename` audit record and the
      `lifecycle` `Operation` list the hostname under `unbound_hosts`, and after the binding is
      edited to the new name and reloaded with `SIGHUP` the hostname serves the renamed repository
      with no restart; a hostname bound to no renamed repository is untouched and never listed
      (the resolved hostname-binding decision, was Q10).
- [ ] AC29: Deleting a `virtual` of a format with an `Indexer`, holding a merged document set
      above the inline threshold whose current document declares two predecessor generations
      and whose input record carries a requested cell, removes the merged documents, ends every
      declared list and drops the input record in the deletion transaction, cancels a pending
      `index.merge` naming it, leaves a merge running at the commit with its swap refused
      `ErrDeleted` and nothing committed, and after grace lapses on the injected clock the
      merged bodies and both predecessors' indices are collected while a member's own documents
      and blobs survive untouched; a rename of the same virtual enqueues exactly one coalesced
      `index.merge` in the rename transaction and calls no handler `Apply`, and a real client
      resolving through the renamed virtual sees the merged set under the new name within the
      staleness bound.
## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | integration + conformance | `internal/repository/create_test.go` (three types; identity shape and independence); `conformance/generic/lifecycle_test.go` and `conformance/oci/lifecycle_test.go` (first-request serving, both modes) |
| AC2 | unit + fuzz | `internal/repository/name_test.go` (table of grammar cases); `internal/repository/name_fuzz_test.go` (against the route table) |
| AC3 | schema introspection | `internal/model/schema_test.go` (shared with `data-model.md` AC38) |
| AC4 | unit + integration | `internal/repository/capability_test.go` (fixture handler declaring `Virtual: unsupported`); `conformance/core/matrix_test.go` (exempt rendering) |
| AC5 | integration + fault injection | `internal/repository/virtual_test.go` (member validation table; rename-member stability); `internal/repository/inuse_test.go` (a member-list write and the member's deletion interleaved at every point under the share lock; never a membership on a deleted repository) |
| AC6 | integration | `internal/repository/remote_test.go` (`upstream.Validate` refusals, credential resolution); `internal/repository/settings_test.go` (`configure` inside the transaction; no-`Operator` refusal) |
| AC7 | fault injection | `internal/repository/atomicity_test.go` (fault after each step of each operation) |
| AC8 | architecture test | `internal/format/arch_test.go` |
| AC9 | architecture test + integration | `internal/storage/arch_test.go` (sole write-transaction constructor calls `Writable`, its document-only form calls `Renewable` and has no waiving entry point; the `ErrReplica`-waiving entry point imported only by `internal/replication`; shared with `storage-and-gc.md` AC25 and `replication.md` AC12); `internal/repository/writable_test.go` (read-only, replica, deleted, their renderings, the waiving entry point still refusing `read_only` and `deleted`, `Renewable` passing `read_only` and refusing replica and deleted, and cache materialisation consulting neither) |
| AC10 | conformance + integration | `conformance/generic/readonly_test.go` (real client publish refused 405, reads unchanged, thaw); `conformance/debian/readonly_test.go` (a frozen suite's `Valid-Until` renewed on the cadence and accepted by a real `apt`; shared with `signing-service.md` AC22's cadence case); `internal/storage/retention_test.go` (pruning under read-only on the injected clock and the cadence re-sign proceeding through the document-only form; shared with `storage-and-gc.md` AC24); `internal/repository/readonly_test.go` (signing-key operation refused; a deferred operation pending at the freeze ends `failed` `read-only`; a running retention pass commits nothing; the `signing.resign` schedule stays enabled while `retention.pass` is disabled) |
| AC11 | conformance + integration | `conformance/oci/readonly_remote_test.go` (network-layer assertion of zero upstream requests; not-found on miss; thaw); `internal/repository/readonly_remote_test.go` (eviction skipped over quota, freshness record unchanged, thaw restores fetching; shared with `proxy-cache.md` AC23); `internal/repository/readonly_test.go` (virtual refused) |
| AC12 | conformance + integration | `conformance/<format>/rename_test.go` in every format's set, its presence enforced by the harness's per-kind case validator (`conformance-harness.md` AC26); `internal/repository/rename_test.go` (record survival table; `configure` receipt) |
| AC13 | integration | `internal/repository/capability_test.go` (`Rename: unsupported`); `internal/replication/link_rename_test.go` (follower failure and link update) |
| AC14 | architecture test + integration | `internal/storage/arch_test.go` (AC15 scan includes `internal/repository`); `internal/repository/delete_test.go` (final checkpoint snapshot; a fixture `Indexer` handler's generator never called and no new `PointerDocument` on the deletion write, shared with `storage-and-gc.md` AC25 and `signing-service.md` AC29; cached reference ends; a remote's current documents, freshness records, declared lists and negative entries removed, shared with `proxy-cache.md` AC23's `internal/proxy/eviction_test.go`; member rows; no deletion call observed via the storage fake) |
| AC15 | integration + conformance | `internal/repository/delete_test.go` (pointer release, name reuse, inheritance of nothing); `internal/storage/retention_test.go` (age-out and `reclaim: now` on the injected clock; shared blob survives); `conformance/generic/lifecycle_test.go` (not-found after delete) |
| AC16 | integration + property | `internal/repository/delete_remote_test.go` (a remote holding cached files, documents at all three levels inline and CAS-backed, and a retained revision declared on a package-level document; an eviction pass over quota first, ending no document; then deletion, grace and sweep on the injected clock, every file blob, document body and declared blob collected; shared blob; provenance readable); `internal/storage/gc_property_test.go` (remote deletion as a property operation ending documents as well as cached references, shared with `storage-and-gc.md` AC16 and `proxy-cache.md` AC29) |
| AC17 | property | `internal/storage/gc_property_test.go` (lifecycle operations in the op set) |
| AC18 | integration + conformance | `internal/repository/inuse_test.go` (refusal body; detach; the floor on each affected virtual's default pointer on a backwards-stepped clock with the deleted member's adoption or transition and a merge of the affected virtual each interleaved at every point, the deletion's `FOR UPDATE` read of its own rows observed, no deadlock abort on either side; shared with `data-model.md` AC36's `internal/model/pointer_freshness_test.go`); `conformance/generic/virtual_detach_test.go` (real client through the virtual after detach) |
| AC19 | integration | `internal/repository/confirm_test.go` (mismatch; delete-and-recreate race) |
| AC20 | integration + fault injection | `internal/repository/credential_inuse_test.go` (remote and link references; rotation then delete; a remote's create or upstream change and the credential's deletion interleaved at every point, never an `Upstream` row naming a deleted credential) |
| AC21 | integration | `internal/repository/delete_jobs_test.go` (pending and retrying cancelled in-tx; `cancel_requested` set in-tx and the running job cancelled at checkpoint; grace hold until terminal on the injected clock for a `HoldsGrace` kind and no hold for a running `proxy.revalidate`; schedules disabled; a remote's `proxy.revalidate` and a virtual's `index.merge` cancelled; self-ending job); `internal/async/cancel_test.go` (`CancelByRepository` inside the deletion transaction, shared with `async-operations.md` AC28); `internal/storage/gc_property_test.go` (a deletion cancelling a job interleaved with that job's `Finish`, never a deadlock; shared with `storage-and-gc.md` AC30) |
| AC22 | integration | `internal/replication/lifecycle_test.go` (replica deletion ends link; leader deletion observed by follower; takeover afterwards) |
| AC23 | integration | `internal/repository/delete_records_test.go` (grants gone; credentials listed and inert; keys retired with public forms; untouched records readable) |
| AC24 | integration | `internal/storage/retention_test.go` (tombstone at last-snapshot prune on the injected clock; dropped rows including the `policy` document and `advisory_ecosystem`; condemnation and refusal records still readable; `repository.reclaim` record; survives further cycles; shared with `supply-chain-policy.md` AC22); `internal/manage/repository_delete_test.go` (`?state=deleted` admin-only, tombstones by identity, never in the live listing; `management-api.md` AC20's test, shared); `internal/credential/listing_test.go` (name rendered from tombstone; shared with `credential-management.md` AC20) |
| AC25 | integration | `internal/repository/configure_remote_test.go` (cache kept, `last-checked` reset, `upstream-invalid`, format and type refused) |
| AC26 | integration | `internal/repository/seed_parity_test.go` (column-by-column equality; `read_only` and recreate entries; dry-run rejection); `conformance/core/seed_test.go` (the `state: read_only` and recreate entries provisioned through the seed path; shared with `conformance-harness.md` AC24) |
| AC27 | integration | `internal/repository/audit_test.go` on `telemetry.NewTestRecorder` (one record per operation in the registered vocabulary; `repository_id` on every record; `Operation` fields; continuity across rename and after deletion); `internal/repository/metrics_test.go` (`repositories{format,repository_kind,state}` after each transition; shared with `observability.md` AC4 and AC7) |
| AC28 | integration + conformance | `internal/repository/rename_hosts_test.go` (a hostname bound to the old name: `404` and the warning from the commit, `unbound_hosts` on the audit record and the `Operation` through `telemetry.NewTestRecorder`, an unrelated binding untouched, the `SIGHUP` reload rebinding without restart; the reload half shared with `deployment.md` AC12's `internal/server/hosts_test.go`); `conformance/terraform/rename_test.go` and `conformance/puppet/rename_test.go` (the real-client half, `terraform.md` AC26, `puppet.md` AC27) |
| AC29 | integration + property + conformance | `internal/repository/delete_virtual_test.go` on the production runner (merged set with two declared predecessor generations and a requested cell on a fixture `Indexer` handler; documents, lists and input record gone at commit; pending `index.merge` cancelled; a running merge's swap refused `ErrDeleted`; grace and sweep on the injected clock collect the merged bodies and predecessors while a member's blobs survive; the rename enqueue and no `Apply`; shared with `signing-service.md` AC19's deletion clause and `data-model.md` AC45's drop-at-deletion clause); `internal/storage/gc_property_test.go` (virtual deletion as a property operation ending declared lists, shared with `storage-and-gc.md` AC16); `conformance/debian/rename_test.go` (the real-client half of the virtual rename, beside AC12's hosted case) |

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
- `Create` for `remote` (through `upstream.Validate`) and `virtual` (member validation under
  the share lock, the `Virtual` capability), read-only on a `remote`, deletion of both types
  (the virtual's merged documents, declared lists and input record with `signing-service.md`
  Phase 4), the floored member-list transition on detach, the `in-use` rule for
  memberships and credentials with their interleavings, upstream change semantics (AC4, AC5,
  AC6, AC11, AC16, AC18, AC20, AC25, AC29).
- The `Rename` capability and OCI's rename case.

### Phase 4: Sibling records (charter steps 6a, 7 and 10, as each owner lands)
- Job cancellation on the production runner (AC21's running-job half), signing key retirement
  and material destruction at tombstone (AC23, AC24), the cadence re-sign through the door's
  document-only form on a frozen repository and the deletion write's hook exemption on a real
  `Indexer` (AC9's `Renewable` half, AC10's cadence clause, AC14's no-hook clause, with
  `signing-service.md` Phases 1 and 2), replication link ending and the follower's
  failure path (AC13, AC22).

## Tasks

Left empty by `/spec`. Populated by `/tasks` once the spec reaches `planned`.

## Open Questions

None open. Nine questions were written in decision shape and adopted under the owner's standing
delegation at authoring, a tenth (Q10) during the closing reconciliation sweep on 2026-09-28
on Opus, and an eleventh (Q11) was raised and adopted by the Fable recheck of 2026-10-01; each
is recorded below with its alternatives, and each is reversible by the owner. The Fable recheck
re-examined Q1 to Q10 as if fresh and recorded its verdict on each record.

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

Rechecked on Fable 2026-10-01: confirmed. Under-stated in the record: a `virtual`'s documents
are rendered by the merge and reach no `Apply`, so the hook has a second form, one coalesced
`index.merge` on the rename of a virtual with an `Indexer` (Design, "Renaming"; AC29).

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

Rechecked on Fable 2026-10-01: confirmed. Option C's client claim was checked against the
captured behaviour the format specs record rather than re-asserted: the reservation problem is
what decides it, and it holds under every option but A.

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

Rechecked on Fable 2026-10-01: confirmed, fold amended. The adoption stands; its fold had two
gaps. First, a detach is a member removal, and `data-model.md`'s Fable recheck made every
member removal a floored transition of the virtual's default pointer whose floor is read under
a share lock: a detach inside a deletion must compute that floor from the member's values
before the same transaction drops the documents and pointers they live on (Deletion step 2, the
Configuration table's member-list row, AC18). Second, the `in-use` check and a concurrent
membership insert were two check-then-act reads with nothing serialising them, so a membership
could land on a repository deleted a moment later; the member validation now reads the member's
row `FOR SHARE` (Creation step 3, AC5). The accepted cost gains one lock on a row the
transaction already reads.

Fable follow-up 2026-10-01: the lock kind on the deletion side corrected. The recheck's fold
had the deletion read its own freshness values "under the share lock", the lock a virtual's
member-list change rightly takes on a member it does not own; in the deletion the same
transaction updates those rows at step 6, and a share lock later upgraded while a concurrent
merge shares the row is PostgreSQL's canonical deadlock. The deletion now takes its own
`Repository` row `FOR UPDATE` at step 1 and its own pointer and freshness rows `FOR UPDATE` at
step 2, and a "Lock order" paragraph places every lock the deletion takes in the door's order
(`storage-and-gc.md` AC30, `async-operations.md` "Finish"): own rows, affected virtuals' heads,
own head and pointers, job rows last. The floor semantics are unchanged; AC18 and AC21 gain the
no-deadlock interleavings. Reported to `data-model.md` as wording of its AC36 and member-removal
paragraph.

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

Rechecked on Fable 2026-10-01: confirmed, fold amended. The "existing write shape" the option
relies on includes the door's pre-commit hook, and on a format with an `Indexer` that hook
regenerates the served index: run over the empty content set it would produce fresh current
documents (an empty `Release`, signed under a key the same transaction retires) that the fourth
root holds until tombstone time, so the record's "the first and fourth roots then stop seeing
the repository by construction" was false as folded. The deletion write is now stated to open
under the door's named exemption with the hook and the pointer-document render skipped
(Deletion step 5, the barrier table, AC14), which is what makes the claim true; the one reach
that outlives the commit is the default pointer's existing envelope record, dropped at
tombstone. The same pass found the `virtual` row of the barrier table saying "no content": a
virtual's merged documents are fourth-root current documents with declared lists and an input
record, and its deletion ends them (Deletion step 5, AC29). Neither changes the option; both
change what the fold must say for it to hold. Landed at the siblings' Fable follow-ups of
2026-10-01: `storage-and-gc.md` AC25 and "The write transaction has one door" (the exemption
skips predicate, hook and render together), `signing-service.md` AC29 (zero generator and
signer calls across the deletion write) and `data-model.md` AC36 (the deletion's
default-pointer move as the one render exception).

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

Rechecked on Fable 2026-10-01: confirmed. The rename case was checked too: a repository renamed
between the read and the delete is `not-found` under the old path and its identity no longer
matches under any other, so the confirmation never lets a rename be mistaken for a recreation.

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

Rechecked on Fable 2026-10-01: confirmed, cost under-stated. The tombstone's operation
reference is an identifier, and `Operation` rows are pruned after 90 days by default, so after
the window it names a record that is gone; the tombstone does not keep the `Operation` alive,
and the identity, principal and `deleted_at` on the row are what remain readable (Design,
"Tombstone").

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

Rechecked on Fable 2026-10-01: confirmed. Every sibling half is in place at HEAD:
`proxy-cache.md` AC23 and AC31 (no fetch, no revalidation, no eviction, the cached document
served whichever way a validator comparison goes), `async-operations.md` AC29
(`EnqueueRevalidation` inserts nothing for a `read_only` remote) and `management-api.md`'s
refresh route refused `read-only` on a frozen remote.

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

Rechecked on Fable 2026-10-01: confirmed, fold amended. `async-operations.md`'s Fable recheck
amended the grace-hold decision this option leans on: the hold is declared per kind
(`HoldsGrace`, copied to the row as `holds_grace`), `proxy.revalidate` holds none, and a
running job's cancel is a `cancel_requested` column set in the deletion transaction so it
survives a lost notification. Deletion step 8 and AC21 now say so; the option is unchanged, its
"grace hold stands until terminal" now reads "for a kind that holds one".

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

Rechecked on Fable 2026-10-01: confirmed. The boundary was also tested against the credential
side's concurrency: a remote's creation referencing a credential and that credential's deletion
were two unserialised reads, now closed the same way as the membership case (AC20).

### Resolved: a rename against a hostname binding that names the old name (was Q10)

**Adopted 2026-09-28 under the owner's standing delegation.** Option A: `server.hosts` keeps
binding by repository name; a rename commits and leaves a binding naming the old name pointing at
a missing repository (`404` and the startup-style warning) until the operator edits and reloads
it; the rename announces each such hostname in its audit record, its `lifecycle` `Operation`
(`unbound_hosts`) and a log warning at commit. Folded into Design ("Renaming"), AC28, and
`deployment.md`'s "Host binding" and AC12. Raised by format batch 5 item 7 in
`agents/spec-loop/consequences.md` from `terraform.md` AC26, with `puppet.md` AC27 the same shape.

`deployment.md`'s resolved host-binding decision made `server.hosts` a file-only list of
`{hostname, repository}` naming the repository by name. Every other record binds a repository by
identity so that a rename breaks nothing but client URLs. A hostname binding is a client-facing
address too, but it lives in configuration, not in the model. What happens to it on a rename?

**Recommendation:** A. A hostname binding is written by the same operator, in the same change
window, as the DNS record and certificate that make the hostname reachable; a name is what that
operator can write and read, and the rename is an admin act the operator coordinates with
consumers anyway (the resolved rename-alias decision, was Q2, already breaks client URLs at the
commit). Making the break visible at the moment it happens is what binding by name lacked.

| Option | You get | It costs |
|---|---|---|
| **A. Bind by name; the rename commits and announces every hostname it unbinds** | Configuration an operator can read; one rule for client URLs and hostnames (both break at the commit, both are the operator's to update); the break named in the rename's own record rather than discovered by a consumer | A hostname answers `404` between the rename and the reload; a repository later created under the old name is served on that hostname, the same accepted risk as a client URL naming it |
| **B. Bind by identity: the file names `rep_` identities, or the loader resolves names to identities and keeps them** | The hostname follows the repository through a rename with no outage | An operator-written file of opaque identities, or a binding that silently diverges from its file: a loader that kept the identity would keep serving after a rename and then break at the next unrelated restart or reload, a latent failure far from its cause |
| **C. Refuse the rename while a binding names the repository** | No silent unbinding | No outage-free order exists (the new name cannot be bound before it exists), so the operator must unbind first and suffers the same `404`; a configuration file vetoes an API operation, and replicas with different files disagree |

**Why this is yours:** it decides whether configuration or the model is the authority for a
client-facing address, and accepts a window in which a bound hostname answers `404`.

Accepted cost: the window between the rename and the reload, and the old name's hostname serving
whatever repository next takes that name, both stated in the operator documentation beside the
rename step.

Rechecked on Fable 2026-10-01: confirmed, cost under-stated. Judged fresh, A still wins: B's
loader variant is a latent break at an unrelated reload, its file variant asks an operator to
write an identity that cannot exist before the repository does, and C has no outage-free order.
The fold was verified against `deployment.md`'s working tree ("Host binding", AC12),
`management-api.md` AC31 and `data-model.md`'s `Operations` result document,
`observability.md`'s vocabulary row, `terraform.md` AC26 and `puppet.md` AC27, all consistent.
Two things the record under-stated are now in Design: `unbound_hosts` is what the renaming
process loaded, so a replica running with a different `server.hosts` file is not in the list
and warns on its own; and the `404` on the unbound host is `auth.md`'s shared denial through a
`Scope(r)` error (`format-handler-interface.md` AC10 as amended), not a handler-rendered page.

### Resolved: what `read_only` does to document-only pointer transitions (was Q11, raised and adopted 2026-10-01)

**Adopted 2026-10-01 under the owner's standing delegation.** Option A: a document-only pointer
transition (the cadence re-sign's repository batch, a virtual's merge commit and member-list
change; `data-model.md` AC36) is not refused by `read_only`. The door's document-only form
consults a second predicate, `Renewable`, which passes `active` and `read_only` and refuses
`ErrReplica` and `ErrDeleted`; key operations, which arrive as `configure` through `Submit`,
stay refused `read-only`. Folded into "The state machine", "Read-only", the type summary, the
package shape, the enforcers, AC9 and AC10.

The authoring pass defined `read_only` as "the repository keeps serving exactly what it serves
now" and gated every completed write and every pointer operation on `Writable`, while
`signing-service.md` renews a signed envelope's validity window on a cadence by a pointer
transition that creates no snapshot and moves no target, and `data-model.md`'s "Jobs and
schedules" said `read_only` suspends every repository-scoped schedule. Read together, a frozen
Debian suite's `Valid-Until` and a frozen Hackage repository's TUF expiry lapse, and every
client refuses the archive: the state would serve nothing within a window instead of what it
served. Which transitions does `read_only` stop?

**Recommendation:** A. The renewal changes no byte a client installs and no target a pointer
serves; it is the maintenance that keeps the archived bytes installable, and an archival state
that lets its own envelope expire is not archival. Keeping it on a separate predicate rather
than a `Writable` mode keeps `Writable`'s answer one-valued for every completed write.

| Option | You get | It costs |
|---|---|---|
| **A. Document-only transitions continue; key operations still refused** | A frozen signed repository stays installable indefinitely; `Writable` unchanged for every completed write | A second predicate and a document-only form at the door; an `external` key's document is renewed only by a thaw |
| **B. Refuse every pointer transition; document that a frozen signed repository expires** | One predicate, no door change | The archival state breaks every signed format on a timer; the operator's only cure is a thaw and refreeze on every cadence, which is the retention pass in another coat |
| **C. Continue every transition, key operations included** | Rotation without a thaw | A rotation batch re-signs every served body under a new key, a client-visible change to what a frozen repository serves; and a `configure` through `Submit` that bypasses `Writable` is a second door |

**Why this is yours:** it defines what "read-only" promises for a signed archive, and it adds a
form to `storage-and-gc.md`'s single door, a planned spec.

Accepted cost: the second predicate, one more form at the door for `storage-and-gc.md` AC25 and
`replication.md` AC12's architecture test to assert, and the thaw an `external` key's document
needs to be renewed. Landed at the siblings' Fable follow-ups of 2026-10-01: `storage-and-gc.md`
AC24 and AC25 with its door section (the document-only form calling `Renewable`, no waiving
entry point, the re-sign proceeding under `read_only`), `signing-service.md` AC22 and "The
cadence runs on a `read_only` repository too" (key operations still refused `read-only`),
`data-model.md` "Jobs and schedules" and AC41 (`read_only` disables only `retention.pass`;
`signing.resign` and `replication.sync` keep enqueuing), `async-operations.md` AC11 and its
kind table (the merge swap and `signing.resign` through the form's document-only shape under
`Renewable`; `signing.resign` not suspended by `read_only`) and `management-api.md` AC31 (the
renewal continuing under `freeze` on the wire). `replication.md`, still draft, has not yet
added the form's `ErrReplica` refusal to its AC12 (this spec's recheck consequence 5 stands).

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-27 | 21279d4 | authoring pass: grounded first draft, not a review | Not a review. Gathered the requirements `management-api.md` (repository administration, resolved Q7, Q10, AC19, AC20), `data-model.md` (`Repository`, `VirtualMember`, `Upstream`, `ReplicationLink`, the default pointer, the retention-pass write shape, the non-root table), `storage-and-gc.md` (fifth root, AC15, AC18, grace), `auth.md` (identity binding, AC29, the admin role, visibility), `credential-management.md` AC20, `signing-service.md` (per-repository keys), `artifact-verification.md` (per-repository trust sets), `upstream-adapters.md` (`Validate`, `UpstreamCredential`), `async-operations.md` (job repository ref, grace hold, cancellation), `replication.md` (link, follower writability, takeover), `proxy-cache.md` (eviction, quota), `conformance-harness.md` (`repositories` key, seed path), `format-handler-interface.md` (`Capabilities()`, reserved segments), `formats/hex.md` (was Q1) and consequences items management-api 3 and 4, async-operations 4, Open item 12 and theme 9 placed on this spec. Prior art fetched this run: Harbor's swagger (412 refusals), Pulp's settings and repository viewset, Gitea's storage doc and `DeleteUser`, Nexus cleanup policies, Distribution's `readonly` maintenance option; Artifactory's pages did not fetch and are not cited. Nine questions written in decision shape and adopted under the standing delegation; 27 criteria each with a Test Plan row; `node scripts/check-spec.js` run clean before this row was written. |
| 2026-09-28 | 0b79dc8 | cross-spec reconciliation of the foundation authoring wave. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` naming this file verified against the current text of its source spec before applying. From the charter reconciliation: Phase 1 at step 2, Phase 2 at step 3, Phase 3 at step 4, and the `shared:management` cost line. From the management-api reconciliation: the deleted listing is `GET /api/v1/repositories?state=deleted` (admin; its resolved was-Q11), in the state table, the tombstone paragraph and AC24, with `internal/manage/reads_test.go` shared. From web-ui: `Virtual` and `Rename` surfaced through `GET /api/v1/formats`. From format-handler-interface: the name grammar cites the full reserved table (`api`, `ui`, `healthz`, `readyz`, `metrics`, `replication`) and treats `v2` as OCI's carve-out, not a reserved segment (AC2). From the replication reconciliation: the sole constructor's `ErrReplica`-waiving entry point, imported by `internal/replication` alone, `ErrReplica` rendered `405` `replica` (Design, AC9, Test Plan shared with replication AC12 and storage-and-gc AC25); the link's updatable leader name and `ended`/`deleted` cited to its AC22. From the data-model reconciliation: "Repository identity and lifecycle state" cited; AC3's schema test shared with AC38. From the storage-and-gc reconciliation: "consequence" wording replaced by AC15, AC23, AC24 and AC25 citations, deletion named as AC25's single exemption. From the proxy-cache reconciliation: `internal/repository/readonly_remote_test.go` shared with its AC23 in AC11's row; the read-only remote paragraph cites AC23. From the supply-chain reconciliation: `policy` and `advisory_ecosystem` as core-held configuration rows, dropped at tombstone, in the Configuration table, deletion step 11, the tombstone paragraph and AC24, with `internal/storage/retention_test.go` shared with its AC22. From the conformance-harness reconciliation: AC12's rename case enforced by harness AC26; AC26's seed entries shared with harness AC24. From the observability authoring: a new "Audit and metrics" section (events `repository.create`, `.configure`, `.freeze`, `.thaw`, `.rename`, `.delete`, `.detach`, `.reclaim` through `telemetry.Auditor.Emit`, `repository_id` on every record, the `repositories{format,repository_kind,state}` gauge) asserted by AC27 with `audit_test.go` and `metrics_test.go` on `telemetry.NewTestRecorder`; `repository.configure` and the placement of `.detach` and `.reclaim` reported back to `observability.md`. Items 9, 10, 12 and 13 of this spec's authoring section remain queued for `signing-service.md`, `artifact-verification.md`, `async-operations.md` and `upstream-adapters.md`, which have not reconciled yet, and are phrased as queued rather than cited. No question raised or adopted; `node scripts/check-spec.js` zero failures on this file. Stays draft pending a gate review. |
| 2026-09-28 | 6e6d503 | cross-spec reconciliation sweep of the foundation wave. Not a review | Not a review. Applied the items raised against this file after its own 2026-09-28 pass, each verified against the source's current text. From the upstream-adapters and async-operations reconciliation (async AC28): deletion step 8 cancels through `Runner.CancelByRepository(ctx, tx, repo)` inside the deletion transaction, and AC21's row shares `internal/async/cancel_test.go`. From the proxy-cache reconciliation: the `delete (remote)` row cites its AC23. From the sweep of `format-handler-interface.md`'s reserved table: `t` (auth's root path token) joins the reserved segments the name grammar refuses, in Design and AC2. The three "queued, not yet applied there" sentences in deletion steps 8, 10 and 11 now cite `async-operations.md` AC28, `signing-service.md` AC29 and `artifact-verification.md` AC29, all reconciled since. Items already applied at 0b79dc8 re-verified (management-api 1, supply-chain 4, replication 3 and 5, harness 8, charter 3). No question raised or adopted; `node scripts/check-spec.js` zero failures on this file. Stays draft pending a gate review. |
| 2026-09-28 | 3135d95 | closing reconciliation sweep on Opus: cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` targeting this file from "From format batch 3 reconciliation" through the latest section, plus earlier items the progress log did not show applied, verified against the current text of `terraform.md` (its rename paragraph and AC26), `puppet.md` (its rename paragraph and AC27), `deployment.md` ("Host binding", its resolved host-binding decision) and `oci.md`. Applied: format batch 5 item 7 as **Q10, adopted under the standing delegation**: bind by name (option A) over bind by identity (a latent break at the next unrelated reload) and refusing the rename (no outage-free order exists), with the break announced in the `repository.rename` audit record and the `lifecycle` `Operation` as `unbound_hosts`; folded into "Renaming", "Audit and metrics", AC27 and new AC28 with a Test Plan row shared with `deployment.md` AC12 and the Terraform and Puppet rename cases; `deployment.md`'s Host binding and AC12 updated in the same sweep. Format batch 1 item 4 (the name grammar cites `oci.md`'s name-split decision, was Q8). The audit paragraph's 'what this pass reports back' wording replaced: `observability.md`'s vocabulary already lists all eight events with `changed_fields`. Found already done: management-api reconciliation 1, conformance-harness reconciliation 8, proxy-cache reconciliation 7, supply-chain reconciliation 4, replication reconciliation 3 and 5, charter reconciliation 3, upstream and async reconciliation 2. New consequences reported: `observability.md` (`unbound_hosts` joins `repository.rename`'s extension set), `data-model.md` or `management-api.md` (the `lifecycle` rename `Operation` records `unbound_hosts`), `terraform.md` and `puppet.md` (their rename paragraphs can cite was-Q10 instead of the queued alternative). `fable_recheck` extended; `node scripts/check-spec.js` zero failures on this file. Stays draft. |
| 2026-09-28 | 4278ce0 | leftovers pass of the closing sweep on Opus: cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Applied the one item queued against this file after its closing sweep (eviction settlement item 5), verified against `proxy-cache.md`'s resolved metadata-eviction and declaring-document decisions (was Q21, was Q22 there), its "Interaction with GC" paragraph on a remote's documents, and `storage-and-gc.md`'s fourth root. Deletion step 5 no longer calls a remote's cached documents cached references ended "in the eviction shape": its cached references (`File` rows bound to `RemoteFile` sources) end through the reference-ending call eviction uses, and its current metadata documents at all three levels, which no eviction reaches, are removed in the same transaction with their cache-scoped freshness records and the declared blob-digest lists they carry, the way a `local`'s head documents end, so the fourth root stops seeing them and the retained revisions they keep at that commit. The deletion table's `remote` row, AC14 and AC16 (now also asserting that an eviction pass before the deletion ends no document, and that document bodies and declared blobs are collected after grace) and both rows follow; AC16's row shares the property operation with `storage-and-gc.md` AC16 and `proxy-cache.md` AC29. The same stale wording in `proxy-cache.md` is fixed there in this pass. Found already done: every earlier item for this file. No question raised or adopted; roots stay five; the fable_recheck marker is unchanged. 28 criteria, each with a Test Plan row. Stays draft. |
| 2026-10-01 | 261b20c | Fable recheck: full review (claim verification at HEAD against every cited sibling, `deployment.md` read from its working tree since another agent was rechecking it; adversarial lens at full strength on the cloud-authored whole and the Opus step-5 rewrite, both treated as unreviewed, deletion attacked against the five mark roots and the deletion-intent barrier; constitution compliance; go-spec-reviewer inline, its codebase step vacuous since `internal/` is empty) + re-examination of the ten adoptions made without Fable (Q1 to Q9 in the cloud session, Q10 on Opus) | Brought current first: the three open queue items targeting this file applied and verified against their sources (signing-service recheck 14: the promotion and rollback trigger and the virtual's deletion ending its declared lists; data-model recheck 4: the floor under the share lock on detach and deletion; the was-Q10 fold confirmed against `deployment.md`'s working tree, `management-api.md` AC31, `data-model.md`'s `Operations` result document and `observability.md`'s row). Verdicts: Q1, Q2, Q5, Q7, Q9 confirmed; Q3 confirmed with the fold amended (the floor on detach; the member validation reads the member's row `FOR SHARE`, closing an unserialised check-then-act between a membership insert and the member's deletion); Q4 confirmed with the fold amended (the deletion write runs no pre-commit hook and renders no pointer document, without which a signed format's regenerated empty index would keep the fourth root on the repository until tombstone and the record's root claim was false; the barrier table's `virtual` row said "no content" where the merged documents, their declared lists and the input record end at deletion); Q6 confirmed with the operation reference's 90-day pruning stated; Q8 confirmed with the fold amended for `async-operations.md`'s Fable amendment of its was-Q4 (`holds_grace` per kind, `proxy.revalidate` holds none, `cancel_requested`); Q10 confirmed with two costs stated (`unbound_hosts` is per process; the `404` is the shared denial through a `Scope(r)` error). One new question found by the adversarial lens and adopted at its recommendation: Q11, `read_only` and document-only pointer transitions, since a frozen signed repository would otherwise let its `Valid-Until` or TUF expiry lapse and stop serving; a second predicate `Renewable` and the door's document-only form (state machine, Read-only, AC9, AC10). Other findings folded: the credential-reference race (AC20), a virtual's rename enqueuing one merge (Renaming, AC29), negative-cache entries at a remote's deletion, the Go error-type split for refusals carrying data. New AC29 with its row. Eleven sibling consequences reported. `fable_recheck` cleared; `node scripts/check-spec.js` zero mechanical failures on this file, two pre-existing advisories. 29 criteria, each with a Test Plan row; zero open questions. Planned. |
| 2026-10-01 | 75e21cb | Fable follow-up: queued cross-spec items since the recheck | A review, narrower than the recheck: every item in `agents/spec-loop/consequences.md` targeting this file after the 261b20c row collected and verified against the current text of its source spec and of this one, then read adversarially against the rest of this spec. Applied, four: storage-and-gc follow-up item 2 (AC9 cites storage AC25, AC10 cites AC24's read-only clause with `internal/storage/retention_test.go` shared, the state-machine paragraph cites the door section, the Context bullet names AC24, AC25 and AC30 as amended); async follow-up item 3 (deletion step 8 and step 5 cite async AC11 for the merge job's repository reference and its `cancelled` end, AC28 for the cancelled set); proxy-cache follow-up item 3 (AC14, step 5 and the Test Plan row cite proxy-cache AC23's deletion clause, which now names the negative-cache entries this spec's recheck consequence 7 asked for); data-model follow-up item 2 (every "reported" or "for their Fable follow-up" sentence replaced by a citation of the landed text: the was-Q4 and was-Q11 records, the audit paragraph's `unbound_hosts` now in observability's vocabulary and AC12, the signing-service Context bullet with AC22, AC29 and AC19's rename clause, the virtual-rename trigger citing AC19, the tombstone's `data-model.md` AC38, previously mis-cited as AC39, and the status_description's wait sentence). Found already applied at 261b20c: data-model recheck item 4 (the floor under the lock on detach and deletion, Deletion step 2, the Configuration table, AC18). Declined, none. Adversarial read of the lock-order text the siblings landed (`storage-and-gc.md` AC30 and its head-lock paragraph, `async-operations.md` "Finish") against this spec's deletion: the fold had the deletion read its own freshness values under a share lock while step 6 updates those rows, which under a concurrent merge's share on the same row is PostgreSQL's canonical upgrade deadlock, and the step-2 serialisation claim rested on a row lock no step stated taking. Fixed: step 1 takes the `Repository` row `FOR UPDATE`, step 2 reads its own rows `FOR UPDATE`, a "Lock order" paragraph places every lock the deletion takes in the door's order (own rows, affected virtuals' heads, own head and pointers, job rows last) and names the three transactions it must not cycle with; AC18 gains the merge interleaving and a no-deadlock clause, AC21 the `Finish` interleaving shared with storage AC30, AC5 names the `FOR SHARE` read the creation side takes; the was-Q3 record carries the amendment. Not a question: the floor semantics and every option are unchanged. One sibling consequence reported (`data-model.md` AC36 and its member-removal paragraph: when the removal is the member's own deletion the read is under the deleting transaction's update lock, not a share lock). `replication.md`, still draft, has not applied recheck consequence 5; noted in the was-Q11 record, nothing here waits on it. No em-dashes; `node scripts/check-spec.js` zero mechanical failures on this file, two pre-existing advisories. 29 criteria, each with a Test Plan row; zero open questions. Stays planned. |
