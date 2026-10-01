---
status: planned
status_description: "Fable gate review 2026-10-01 at 4dac925 cleared it to planned (a pass interrupted mid-apply and resumed on Fable the same day): every sibling citation verified at HEAD against the planned foundation specs, the queued consequences applied (`.sync` and `.reseed` audit events with the re-seed's discarded snapshots in `objects`, the link `GET` on the request log only, the replication read surface a mount on the main listener, AC12 covering the door's document-only form, the management routes' refusal order under management-api's was-Q18 and AC35), and the adversarial findings folded: every apply, the takeover, the re-seed and the deletion serialise on the link row, the link row is the position of record and the link's `Schedule` is disabled in the transaction that ends it (AC23, AC26); the `Retirement` set and `FileProvenance` travel on the read surface and in the archive (AC25); the want-list covers pointer-document bodies, declared blob-digest lists and verification-failed blobs; a leader whose head is below the follower's position is `diverged` (AC17); a `read_only` replica's sync is refused `read-only` under the two planned architecture tests (AC22); the position is pinned by the mirrored default pointer and the chain stays linear across a leader rollback (AC20); AC18 names the refusal each token class receives under auth's existence rule; an import into an unlinked repository is refused `validation` (AC9). One new question raised and adopted on Fable (Q12: the takeover request re-signs and registers the cadence schedules, in two steps because the door's on-a-transaction form is the runner's alone). 26 criteria, zero open questions; the server-side ingest hook stays pending at the interface re-open. Earlier: sweep 2026-09-28 at 6e6d503 (not a review): management-api's replication routes and `replica` type cited; data-model AC31 shared in AC16 and AC22. Reconciled 2026-09-28 at 9f93794 with the foundation authoring wave (not a review): signing records travel with the pointer set and a linked follower signs nothing, takeover needs resolvable keys (AC21); sync runs as replication.sync jobs with per-snapshot checkpoints on the shared async runner (AC3, AC23); the link has a six-state vocabulary with terminal ended, an updatable leader name and composes with repository-lifecycle's Writable predicate, read_only and deletion (AC11, AC12, AC16, AC22); observability's replication metrics, alerts, audit events and peer trace propagation folded into AC10; a replication. key table (AC24); the reserved segment is named replication (AC18); freeze's dated HCP Vagrant consumer recorded with Q11 adopted. Earlier: Wave 1 reconciliation (charter step 10, harness provisioner, sibling amendments landed) and Q1-Q10 adopted under the owner's standing delegation. 24 criteria, zero open questions; the server-side ingest hook stays pending at the interface re-open; stays draft pending a gate review."
description: "Spec for replicating content between registry instances - geo-distribution, disaster recovery and air-gapped mirroring - built on the content-addressed store and immutable snapshots."
author: michielvha
goal: "Let one logical registry span sites, so a build pulls locally and an air-gapped environment can be fed a verifiable snapshot."
priority: "medium"
issue: 14
created: 2026-09-23
covers:
  - "internal/replication/**"
---

# Plan: Replication between instances

One logical registry, several instances, content moving between them.

## Context

Deferred in `storage-and-gc.md` as "later, and it depends on decisions made here". Those
decisions have since been made - content addressing, mark-and-sweep GC with a deletion-intent
barrier and five mark roots, immutable snapshots stored as deltas with periodic checkpoints
under bounded retention, and pointer-targeted snapshots exempt from pruning - so the dependency
is discharged and the remaining reason to wait was
build effort, which is no longer a constraint (`project-charter.md`, the standing scope
decision).

Where it lands in the sequence is set by `project-charter.md`, which owns the build order: **step
10, after Tier 1 completes, and not gated by the breadth verdict**, because replication transfers
snapshots of every format generically and its hardest cases need formats that already exist -
mutable metadata (npm, PyPI) and signed indexes (Debian, RPM), where a follower must serve
indexes it did not sign. Replication is not breadth, so a `shrink` verdict at step 8 does not
cancel it. The phases below sequence the work inside this spec only.

Three use cases, in descending order of how well the existing model serves them:

- **Geo-distribution**: a build in another region pulls from a local instance.
- **Disaster recovery**: a second instance holds enough to take over, and an explicit operator
  action makes it take over (the takeover section below).
- **Air-gapped mirroring**: content crosses a boundary that no network crosses, as a file -
  including content that originally came from a public upstream, carried by freezing a cache
  into a local repository first.

The foundations make this unusually tractable. Blobs are content-addressed, so transfer is
idempotent and verifiable by digest with no coordination. Snapshots are immutable and numbered,
so "replicate up to snapshot N" is a well-defined, resumable unit rather than a diff of mutable
state.

## Scope

**In scope**

- Pull-based replication: a follower instance replicates named repositories from a leader.
  Replication is **per repository**: one instance may follow a leader for some repositories,
  host its own local repositories beside them, and lead others, but no repository ever has two
  writers.
- **Read-only replicas.** A replicated repository on a follower refuses every write - publish,
  hosted delete, metadata-only mutation, and pointer management - until an explicit takeover.
- Snapshot-granular transfer, so a follower is always at a consistent point rather than
  mid-publish, with the leader's **whole pointer set** mirrored: the default pointer and every
  named environment pointer, each with the snapshot it targets.
- Content verification on arrival by digest, with nothing committed that does not verify, and a
  per-snapshot **identity** so a follower detects a divergent history instead of applying
  across it.
- **Follower-side retention-gap recovery**: the leader prunes on its own schedule and a follower
  that fell behind detects the gap and re-seeds from a checkpoint, transferring only the blobs it
  lacks.
- **Air-gapped export and import**: a snapshot range exported as a portable, verifiable archive
  and imported elsewhere with no network between them, anchored by a manifest digest the
  operator carries out of band.
- **Freeze**: an operation copying a `remote` repository's cached content into a `local`
  repository as one ordinary publish, so proxied upstream content can cross an air gap by the
  same export path.
- **Disaster-recovery takeover**: an explicit, per-repository operator command that ends
  replication and makes a replica writable, with fencing of the old leader an acknowledged
  operator duty.
- Replication of metadata at all three levels, not only blobs, so a follower serves correct
  indexes and dist-tags rather than correct bytes under wrong names; and of the repository's
  core-held `Retirement` set and `FileProvenance` records, which are not snapshot content, so a
  taken-over repository refuses the coordinates its old leader retired.
- Interaction with GC and retention: what a follower may collect, and why a leader's pruning
  consults no follower.
- Replication authentication: a follower reads a leader with an ordinary machine token, whose
  `pull` scope on a repository authorizes that repository's replication read surface.
- **Signed documents on a follower**: the leader's `Signature` and `PointerDocument` records
  travel with the pointer set, a follower serves them verbatim and signs nothing while linked,
  takeover requires the repository's active signing keys to resolve on the follower
  (`signing-service.md`'s resolved follower decision, was Q9 there), and the takeover request
  re-signs under them and registers the `signing.resign` schedules, so a taken-over repository
  nobody writes to does not expire (the resolved takeover-signing decision below, was Q12).
- **Sync as shared deferred work**: a link's sync and transfer run as `replication.sync` jobs
  on the shared async runner (`async-operations.md`), with a checkpoint per completed snapshot,
  so resume after a crash is the queue's rescue path rather than a replication-local mechanism.
- **The link's own lifecycle**: its status vocabulary, including the terminal `ended`, its
  updatable leader repository name, and how it composes with the repository lifecycle
  (`repository-lifecycle.md`): deletion, rename, `read_only`, and the shared `Writable`
  predicate.
- **What a monitor sees**: the link-state metrics, alerts, audit events and peer trace
  propagation `observability.md` catalogues for replication, and the `replication.`
  configuration keys `deployment.md` registers.

**Out of scope**

- Multi-leader or active-active writes. Conflict resolution across sites is a different problem
  and this spec does not pretend to solve it. A split-brain after a takeover is detected
  (divergence below), never reconciled.
- Replicating cached proxy content directly. A follower with its own upstream configuration
  fetches for itself; shipping another instance's cache is bandwidth spent to avoid bandwidth.
  The air-gapped case, where the follower has no upstream by definition, is served by freeze
  rather than by teaching `remote` repositories to replicate.
- Replicating a `virtual` repository's definition. A follower composes its own virtual
  repositories from the repositories it actually has (the virtual-repository section below).
- Signing archives with an instance key. The archive's trust root in v1 is the out-of-band
  manifest digest; a signature-based root would be built on the shared signing infrastructure,
  not here (resolved archive trust root question below).

## Design

### Snapshots make the unit obvious, but a snapshot is not a content set

A follower mirrors a leader repository's pointer set. Each pointer targets a numbered snapshot,
and replication transfers what the follower needs to reconstruct every targeted snapshot: the
deltas between what it holds and each target, plus the blobs those deltas newly reference. A
mirrored pointer moves only when the snapshot it will target has arrived whole and verified. A
follower is therefore never observably mid-publish, which is the property that makes a follower
safe to serve from.

"The deltas between N and M" is doing more work than it looks like, because per
`data-model.md`'s resolved representation a snapshot is a delta from its predecessor with
periodic full checkpoints, and the leader prunes deltas and checkpoints once no retained
snapshot depends on them. Three consequences bind the transfer unit:

- **A contiguous follower receives deltas.** A follower whose current position is inside the
  leader's retained, reconstructible history receives exactly the deltas from its position to
  the target, plus the blobs those deltas newly reference - including metadata documents stored
  as CAS blobs above the size threshold, which deltas reference by digest like any other
  content.
- **A new or gapped follower seeds from a checkpoint.** The delta chain back to snapshot 1 does
  not exist once the leader's pruning has run, so an initial seed - and a re-seed after a
  retention gap - transfers the most recent checkpoint at or before the target, the deltas from
  that checkpoint to the target, and the blobs that range's content set references which the
  follower does not already hold. Seeding is bounded by the current content set plus one
  checkpoint interval, never by history length.
- **The follower must stay reconstructible and bounded.** After any transfer, every retained
  snapshot on the follower resolves within the one-checkpoint-plus-bounded-deltas read limit
  `data-model.md` sets, and the follower's own pruning obeys the same reconstructibility
  constraint as the leader's. A transfer that ships deltas without the checkpoint they hang off
  produces a follower that cannot compute its snapshots' content sets, which makes its own
  sweep unsound.

**Blobs move by want-list.** Metadata (deltas and checkpoints) arrives first; the follower
computes which referenced digests its store lacks and requests only those. The want-list is
every digest the transferred records reach, not only what the deltas reference: the blobs of the
content set, CAS-backed metadata documents, the CAS-backed bodies of the pointer set's
`PointerDocument` records and the bodies `Signature` records sign, and every digest on a
replicated document's declared blob-digest list (`data-model.md` AC37; Hackage's index segments,
Debian's by-hash generations), because the follower's fourth mark root marks through those
records exactly as the leader's does and a record whose body is absent is a reference to nothing.
Because the store is content-addressed, a blob the follower already holds - from an earlier
snapshot, from another repository, or from its own cache - is never transferred again, which is
what keeps a re-seed cheap in bytes even though it re-transfers a checkpoint. "Already holds"
is the dedup check's answer, so a `Blob` row carrying the verification-failed mark counts as
absent and is fetched again (`data-model.md` AC43; `storage-and-gc.md`'s resolved read-path
decision, was Q11 there). A digest the follower "has" but whose blob its own sweep is deleting
is handled by the shared reference-creation call and the intent's commit gate like any other
commit (the GC section below), never by a replication-local rule.

Interrupted transfer resumes from the last completed snapshot rather than restarting, because
each snapshot is an independently valid stopping point. How that resume happens is not
replication's own mechanism (the sync-as-jobs section below).

### Sync runs on the shared async runner

A link's sync and transfer are deferred work, and `async-operations.md` owns deferred work, so
each active link is a `Schedule` on `internal/async` whose tick enqueues a `replication.sync`
job (its consumer table names the kind), also enqueued on demand when an operator asks for a
sync now. The job carries exclusivity key `link:{id}`, so two syncs of one link never run at
once, and it calls `job.Checkpoint` after each completed snapshot - the applied position, the
mirrored pointer moves so far - which is what makes "resumes from the last completed snapshot"
(AC3) the queue's ordinary rescue path: a worker that dies mid-transfer loses its lease, any
worker reclaims the job and its `Work` re-runs from the checkpoint. The transfer is idempotent
up to the checkpoint by construction, because blob puts are content-addressed and a snapshot
either applied whole or not at all (AC2). Replication therefore builds no resume state, no
retry loop and no worker pool of its own; a follower runs its own queue and a leader never
enqueues anything for a follower (`async-operations.md` excludes cross-instance jobs because
followers pull).

Two details keep that rescue path honest. **The position of record is the link row, not the
job's checkpoint**: each snapshot's apply transaction writes the snapshot, moves the mirrored
pointers whose target it completes and advances the `ReplicationLink`'s position together, and
`job.Checkpoint` is written after that commit, so a worker that dies between the two leaves a
checkpoint one snapshot behind the row, and the re-run finds the snapshot already present by
identity and skips it rather than applying it twice. **Every apply transaction locks the link
row and re-reads its state** before committing, and so do the takeover, the operator re-seed and
the replica's deletion (`repository-lifecycle.md` AC22), which lock the same row: a sync still
transferring when a takeover commits finishes its blob puts (content-addressed, unreferenced,
grace-protected until the sweep) and then finds the link `ended` at its next apply, ends itself
with nothing more applied, and the new leader's first write is the only writer of N+1 (AC26).
The exclusivity key keeps two syncs apart; the row lock is what keeps a sync apart from the
operator. The transaction that ends a link also **disables the link's `Schedule`**, the takeover
as the deletion already does (`async-operations.md`'s per-link `Schedule` row and its deletion
rule, `repository-lifecycle.md` AC21), so nothing enqueues a sync for an `ended` link; a job
enqueued before that commit finds the link `ended` at its next apply and ends itself as above,
and an on-demand sync, a re-seed or a takeover requested against an `ended` link is refused as a
state conflict, whose problem type `management-api.md`'s table fixes (AC23, AC26).

A follower is an ordinary instance of the one binary, roles by configuration (`deployment.md`,
"Process model"): the sync runs on whichever of its processes has workers, so a follower whose
every process sets `async.workers: 0` enqueues `replication.sync` and never applies it, and the
link reports lag until a worker exists. Nothing in the binary names an instance a follower.

Two consequences of riding the runner are stated so nobody rediscovers them: the per-link
`Schedule`'s period is the instance default `replication.sync_interval` unless the link sets its
own (the configuration section below); and an instance in offline mode (`proxy.offline`) runs no
`replication.sync` at all, since `async-operations.md` disables every network-reaching schedule
under that switch. An offline instance's replicas therefore stay at their position and archive
import is their only feed, which is exactly the air-gapped case (AC15).

### The pointer set is replicated, not only the head

Serving resolves through a `Pointer` (`data-model.md`), and a leader repository carries a
default pointer plus any number of named environment pointers. A follower that tracked only the
head would serve `prod`'s name with the default pointer's content, or not serve it at all, so
the leader's pointer set is part of what replicates (resolved pointer-set question below). The
follower holds one mirrored pointer per leader pointer, same name, same target snapshot number:

- **Every leader pointer move is reflected** at the follower's next sync - creation, promotion,
  rollback to an earlier retained snapshot, and deletion - and each mirrored pointer moves only
  once its target is complete locally. A rollback on the leader onto a snapshot the follower no
  longer holds is transferred like any other target, since the leader still holds it (it is
  inside the leader's window or pinned by the pointer that just moved onto it).
- **A pointer targeting an old snapshot is still replicated.** An environment pointer the leader
  has pinned outside its retention window (`storage-and-gc.md`'s fifth root) is reconstructible
  on the leader by definition, so the follower seeds that target from its checkpoint like any
  other. What a follower transfers is bounded by the content sets of the distinct snapshots the
  pointer set targets, plus one checkpoint interval each, never by history length.
- **The follower's replication pointer is its mirrored default pointer, and its target is the
  link's position.** That is the pointer `storage-and-gc.md` names as an instance of the fifth
  root; every mirrored environment pointer is one too, for the same reason (the GC section
  below). The leader's default pointer tracks the newest snapshot (`data-model.md`'s `Pointer`
  row: "one tracks the newest snapshot, others are environments repointed by promotion and
  rollback"), so the snapshot the link's position names is always the mirrored default
  pointer's target, pinned on the follower however old it grows, and the next contiguous delta
  always has a reconstructible base to apply to. A leader-side rollback repoints an environment
  pointer and creates no snapshot (`data-model.md` AC23), so the chain the follower walks stays
  linear by number across it: the follower's position and its identity check are unchanged, the
  mirrored environment pointer moves to the older target it already holds or seeds, and the
  leader's next write arrives as the one delta from the position (AC20).
- **The pointer's signed and dated documents travel with it.** `signing-service.md` places
  signatures and pointer-held documents (a Debian `InRelease`, a TUF `timestamp.json`, a
  per-pointer freshness record) in `Signature` and `PointerDocument` records outside snapshot
  content, so a follower that received only snapshots would have to sign envelopes it holds no
  key for. Per that spec's resolved follower decision (was Q9 there), those records are part of
  the replication read surface, transferred with the pointer set as opaque records, and a linked
  follower **serves them verbatim and signs nothing**: its `Last-Modified` and its signed
  indexes are the leader's, byte for byte, which is what "a follower must serve indexes it did
  not sign" (`project-charter.md`, step 10) means in practice. A mirrored pointer's records move
  with the pointer, under the same rule that the pointer moves only once its target is whole.
  Signing on a follower begins only at takeover (the takeover section below).
- **The retirement set and provenance travel too.** `management-api.md` holds coordinate
  retirement in core-held `Retirement` records outside snapshot content, never pruned, so a
  follower that received only snapshots would hold no record that `acme@1.0.0` can never be
  reused, and its first write after a takeover could re-publish a coordinate every client of the
  old leader saw retired. The leader's `Retirement` records and the `FileProvenance` records of
  frozen files are therefore part of the replication read surface, transferred as opaque records
  and applied idempotently (a retirement names a coordinate; applying it twice is a no-op), so a
  taken-over repository refuses the retired coordinates at claim declaration and at commit
  exactly as the leader did (`data-model.md` AC35; AC25). While linked they change nothing, since
  nothing writes there; they exist for the day the link ends.

### Snapshot identity makes a divergent history detectable

Snapshot numbers alone cannot tell two histories apart: a leader restored from an older backup,
or an old leader that kept accepting writes after a follower took over, can produce a snapshot
51 whose content differs from the follower's 51. So every snapshot carries an **identity**: the
digest, under the store's digest algorithm, of its number, its delta's digest and its
predecessor's identity - the same construction as a git commit, with no key and no signature,
so it is not a new cryptographic scheme (resolved divergence-detection question below). Two
properties make it load-bearing:

- **Identities are retained forever, content is not.** Pruning drops checkpoints and deltas; it
  never drops the identity record, which references no blob and is therefore not a mark root.
  One small row per completed write is the cost of being able to compare any two positions
  after any amount of pruning.
- **A follower verifies continuity before applying anything.** At each sync it compares its own
  position's identity with the leader's identity at that number. A match means the leader's
  history extends the follower's, and transfer proceeds. A mismatch means the histories forked:
  the follower applies nothing, keeps serving what it has, and reports `diverged` with the
  highest snapshot number both sides agree on. **A leader whose head is below the follower's
  position is diverged too**, with the agreed number the highest at which both identities are
  equal: there is no identity at the follower's number to compare, and a leader behind its own
  follower is a leader restored from a backup that lost those writes, whose next write would
  fork under a number the follower already holds. The follower does not wait for that to happen.
  Only an explicit operator re-seed moves a link off `diverged`, and that command reports the
  local snapshots it will discard before discarding them, because on a repository that was
  written after a takeover those snapshots are the split-brain writes, and on a restored leader's
  follower they are the writes the restore lost.
- **Linking a repository that already has a history is the same check.** A `local` repository
  with its own writes, linked to a leader, diverges at its first sync and reports it; the
  operator re-seed is the conversion path, and it lists what it discards. A freshly created
  `local` links cleanly, because its initial empty snapshot's identity is a function of its
  number and the empty delta alone (`data-model.md` AC29 is deterministic), so every fresh
  repository is a prefix of every leader.

A divergent history is never silently merged, applied around, or overwritten by an automatic
re-seed. The same identity check guards archive import (below).

**What the operator re-seed does** is one write through the applier's entry point, serialised on
the link row like every apply: it repoints every mirrored pointer to the agreed snapshot (or
deletes the mirrored pointers whose target the follower no longer holds, so they seed from a
checkpoint), removes the discarded snapshots' rows and their `SnapshotIdentity` records, and
leaves their deltas, checkpoints and blobs unreferenced for the pruner and the sweep, deleting
no object itself (`storage-and-gc.md` AC15). This is the one case in which an identity record is
rewritten: the leader's snapshots then apply under the discarded numbers with the leader's
identities. The accepted cost, confirmed by the operator with `confirm` set to the repository
identity (`management-api.md`'s endpoint table), is that a mirrored pointer whose agreed target
is not held serves nothing until the seed completes; the `replication.link.reseed` audit event
lists the discarded snapshots in `objects` (AC17, AC26).

### A replica is read-only, and replication is per repository

A replica is a `local` repository with an active replication link - the leader's URL, the
leader's repository name, and the credential reference the follower authenticates with (the
authentication section below). A replicated repository on a follower accepts writes from exactly
one source: the replication applier (resolved follower-writability question below). A client publish, a hosted delete, a
metadata-only mutation (an npm dist-tag move) and every pointer-management call are refused with
an explicit error naming the repository as a replica and naming its leader, so a CI job
misconfigured against the follower fails loudly instead of forking the history. Snapshot numbers
on a replica are the leader's numbers, because nothing else ever writes there.

The boundary is held in the shared write path, not by each handler, and since
`repository-lifecycle.md` it is one predicate rather than a replication-local check: the sole
write-transaction constructor in `internal/storage` calls `repository.Writable`, which returns
`ErrReplica` for a repository whose link is not `ended`, beside `ErrReadOnly` and `ErrDeleted`
for the other two unwritable states (that spec's AC9). The API and every binding render
`ErrReplica` as the same `405` a `read_only` refusal gets, with problem type `replica` whose
detail names the leader, so a misconfigured CI job reads why in its own error output. The
applier is the one caller allowed past `ErrReplica`, and only past that error: it opens its
transactions through an entry point of the same constructor that waives the replica refusal and
nothing else (a replica that is also `read_only` or `deleted` refuses the applier too), and the
architecture test on the constructor asserts `internal/replication` is that entry point's only
importer (AC12, shared with `repository-lifecycle.md` AC9 and `storage-and-gc.md` AC25). A
handler therefore needs no knowledge that replicas exist.

Replication is configured per repository, so an instance can be a follower for some
repositories and a leader for others, and can host ordinary local repositories beside its
replicas, without any repository having two writers.

### The link has states of its own, and a life that ends

A `ReplicationLink` (`data-model.md`, "Replication's records") is in exactly one state, and the
state set is the one `observability.md`'s one-hot gauge reports:

| State | Meaning | Reason carried |
|---|---|---|
| `syncing` | a `replication.sync` job holds the link's exclusivity key and is transferring | |
| `idle` | the last sync completed and the follower is at the leader's position for every mirrored pointer | |
| `failed` | the last sync could not complete and nothing was applied | `not-found` (the leader repository is gone or renamed), `unauthorized`, `unreachable`, `source-type`, `read-only` (the replica is frozen; thaw resumes it) |
| `reseeding` | a retention gap was detected and a checkpoint-based re-seed is in progress | `retention-gap` |
| `diverged` | the identity check failed; nothing applies until an operator re-seed | the highest agreed snapshot number |
| `ended` | terminal: the link no longer governs the repository | `takeover`, `deleted` |

"An active link" anywhere in this spec means a link in any state but `ended`, and "at most one
active link per repository" (`data-model.md` AC31) means at most one such link. A repository
whose only link is `ended` is an ordinary local repository as far as `Writable` is concerned,
which is what makes takeover a state change rather than a row deletion, and keeps the takeover
record readable afterwards.

The link composes with `repository-lifecycle.md`'s repository states as follows, each clause
asserted by AC22:

- **Deleting a replica ends its link** with reason `deleted`, in the deletion transaction (that
  spec's AC22). Nothing reaches the leader, which does not know its followers.
- **The leader repository being deleted or renamed** is observed, not announced: the follower's
  next sync gets `not-found` and marks the link `failed` naming it, while the follower keeps
  serving its last replicated position. The link's **leader repository name is updatable**
  through the link's own configuration (the management surface below); after a leader-side
  rename the operator updates the name and the next sync resumes on the identity check alone,
  with no re-seed, because the history is unchanged. After a leader-side deletion the operator
  takes the follower over or deletes it.
- **A `read_only` replica stays read-only after takeover, and does not sync while frozen.**
  `read_only` is the repository's state, the link is the link's; takeover changes only the
  latter. Thaw is the lifecycle operation that makes such a repository writable again, and it
  is a separate, audited act. While the replica is frozen its link's schedule keeps enqueuing
  (`async-operations.md` suspends only `retention.pass` under `read_only`), but the applier's
  entry point waives `ErrReplica` alone and still refuses `ErrReadOnly` (`storage-and-gc.md`
  AC25, `repository-lifecycle.md` AC9, both planned and both asserting it in
  `internal/storage/arch_test.go`), so each sync ends having applied nothing and the link
  reports `failed` with reason `read-only` until the thaw, after which the next sync resumes
  on the identity check alone. Freezing a replica is therefore not a no-op before takeover: it
  stops the replica following, which is what an operator freezing it means, and the
  `ReplicationLinkFailed` alert says so (AC22).
- **A deleted repository cannot be linked**, and neither can a `remote` or a `virtual` (the
  source section above; refused `failed` at configuration time with reason `source-type` on the
  leader side, or a type refusal on the follower side).
- **The credential a link references cannot be deleted while it is referenced**: `409` `in-use`
  naming the link, the same rule that protects an `Upstream`'s credential
  (`repository-lifecycle.md` AC20; the store is `upstream-adapters.md`'s `UpstreamCredential`).

The link's own management - create, update (leader URL, leader repository name, credential
reference, sync interval), delete, an on-demand sync, the operator re-seed and takeover - is
administration of a repository and therefore belongs on the registry-owned management API under
the reserved `api` segment (`management-api.md`), admin-only like every other repository
administration kind and refused in that API's one order (its resolved refusal-type decision,
was Q18, and its AC33 and AC35): `unauthenticated` to a credential-less request, `not-found` to
a principal that cannot read the repository, byte-identical to an absent one, and
`unauthorized` to every other non-admin principal, a repository-scoped token holding every
action included. The routes are implemented by `internal/replication` behind that API's
conventions and audited as `replication.link.create`, `.update`, `.delete`, `.sync`, `.reseed` and `.takeover`
(the observability section below; `.sync` and `.reseed` were named by `management-api.md`'s
Fable recheck of 2026-09-30 and registered by `observability.md` on 2026-10-01, since every
write past the authorizer on that API audits under a registered event, its AC23). The link's
`GET` is a read and leaves a request-log line and no audit record, like every other read on that
surface. `management-api.md`'s endpoint table now carries them: `GET`, `PUT`, `PATCH`
and `DELETE /api/v1/repositories/{name}/replication` for the link, `POST .../replication/sync`,
`.../replication/reseed` (refused `validation` without `confirm` equal to the repository
identity, and its audit record lists the discarded snapshots in `objects`) and
`.../replication/takeover` (refused `validation` without `acknowledge_fencing: true`, and
`conflict` naming each active signing key that does not resolve on the follower), and its closed
problem list carries `replica` (its AC33); this spec states the operations and their semantics,
and that table fixes the wire. Export and import are operator actions on the same surface,
`GET .../export` and `POST .../import?digest=`: export streams the archive and returns its
manifest digest, import takes the archive and refuses to start without the digest (AC19).

### Only a local repository is a replication source

Snapshot granularity decides this. A `remote` repository creates no snapshots at all -
`data-model.md` settled on-demand arrival as cache materialisation - so there is no unit for it
to replicate; a follower wanting the same upstream configures its own `remote` repository and
fetches for itself, and the air-gapped case is served by freeze (below). A replica is a `local`
repository, so it is a valid source for another follower or for an export: its snapshots carry
the leader's numbers and identities, so a second hop - a DMZ instance following the leader and
exporting archives into the gap - adds no mechanism.

A `virtual` repository is not replicable either (resolved virtual-repository question below). Its
content is a member list, not snapshots, and its members may not all exist on the follower;
replicating the definition would serve a silently incomplete aggregate under a name clients
trust. Configuring replication from a `remote` or `virtual` source is refused with an error
naming the repository type. A follower composes its own virtual repositories from what it
actually has - its replicas, its own local repositories and its own remotes - and they resolve in
member order exactly as `data-model.md` defines. The accepted cost is that a follower's virtual
definitions are maintained by hand and can drift from the leader's.

### Freeze carries proxied content across an air gap

Mirroring a public ecosystem into an air gap is the most common real-world air-gap requirement,
and it cannot go through snapshot transfer as things stand: remote repositories create no
snapshots. Freeze composes existing machinery instead (resolved air-gap proxied-content
question below). It takes a `remote` repository - optionally restricted to named packages or
versions - and publishes the content it has **cached with a local blob** into a `local`
repository as **one** completed logical write, so the result snapshots, replicates and exports
exactly like any other publish:

- **It is a real publish through the hosted path.** The target repository's handler ingests the
  cached blobs and builds that repository's own metadata documents, exactly as it would for a
  client upload (resolved freeze-metadata question below). Upstream metadata documents are
  not copied verbatim, because an upstream index lists everything upstream offers while the
  freeze holds only what was cached, and a verbatim copy would advertise files the local
  repository cannot serve. Every check on the publish path applies to a freeze; it is not a
  bypass.
- **A frozen repository never contacts an upstream.** Frozen files are ordinary published
  files. Their provenance - the source remote repository, the upstream URL and path, and when
  the cached copy was fetched - is recorded per file as provenance, not as `RemoteFile` rows,
  because a `RemoteFile` is an upstream source the model fetches from and would give a local
  repository an egress path. The provenance is readable from the API, and it travels in the
  export archive so the air-gapped side can see where content came from.
- **It is atomic against eviction and sweep.** Freeze commits through the shared
  reference-creation call, so a cached blob it references is live from the moment the reference
  commits, and a later eviction of the source cache touches nothing frozen. A cached blob that
  has already been evicted and swept by commit time fails the whole freeze with an error naming
  it and nothing committed; the operator re-warms the cache and re-runs.
- **Only cached content freezes.** Freeze does not crawl an upstream: files known only through
  `RemoteFile` rows, and anything served `streamed`, are not in the cache and are reported as
  excluded. Warming the cache on the connected side is the operator's workflow.
- **A signed-index format is re-signed, by the shared service.** Because the target handler
  renders the frozen repository's metadata, a frozen Debian or RPM repository serves indexes
  signed by `signing-service.md`'s write-path hook under the target repository's key, never by
  the handler and never with the upstream's signature (that spec names freeze among its
  consumers: "freeze re-signs through the target repository's key"). Freeze adds no signing of
  its own, and archive signing, if the owner ever reverses the archive trust-root decision
  below, lands on the `archive` key purpose `signing-service.md` reserves for it.
- **The target must be writable.** A freeze is a completed write, so it consults
  `repository.Writable` like every other (`repository-lifecycle.md` AC9): a `read_only` target,
  a replica or a deleted repository refuses it with the corresponding typed error and nothing
  committed.

Freeze needs a way to drive a handler's hosted ingest from blobs already in the store, which the
pinned five-method interface (`format-handler-interface.md`) does not offer: its hosted writes
arrive over HTTP. The hook's shape is therefore an addition argued at that spec's scheduled
re-open ("a server-side ingest hook ... which `replication.md`'s freeze needs and which blocks
its freeze phase"), and the freeze phase below is sequenced after it. The freeze write kind and
its provenance record are likewise the shared data model's to define, and `data-model.md` now
does (its "Replication's records" section and AC30); this spec states what they must do.

**Freeze has a dated first consumer.** `formats/vagrant.md` documents leaving HCP Vagrant, which
stops operating on 2026-12-31, as an `immediate` sync of a `remote` followed by a freeze into a
`local` (its resolved HCP decision, was Q12 there, and its AC21). Freeze sits in Phase 4 of a
spec placed at charter step 10, behind the interface re-open, and this spec does not pretend the
two dates will meet; the resolved sequencing decision below (was Q11) records how the content
survives the gap: the `immediate` sync fetches every box before the deadline, the remote is then
frozen `read_only` so it neither revalidates against a dead upstream nor evicts, and the freeze
into a `local` runs whenever this phase lands, because a `read_only` remote serves cache-only
indefinitely (`repository-lifecycle.md`, `proxy-cache.md` AC23).

### A follower's GC is the same GC, and replication is a second writer into its CAS

A follower runs the same mark-and-sweep over its own store, and everything `storage-and-gc.md`
settled applies unchanged:

- **All five mark roots.** On a follower, replicated snapshots inside its retention window are
  what keeps replicated content live, and the fourth root - CAS-backed metadata documents -
  matters here exactly as on a leader, because replicating metadata at all three levels means
  the follower holds metadata-document blobs that no `File` row references. The fifth root
  covers the follower's mirrored pointers: each targets a snapshot exactly as an environment
  pointer does, so every snapshot the mirrored pointer set targets, and the checkpoint-and-delta
  chain that reconstructs it, is exempt from the follower's pruning while targeted
  (`storage-and-gc.md`, resolved pointer-target question). That is a statement about the
  follower's store only; the leader's pruning consults no follower at all (the retention
  section below), so replication adds no root to the set.
- **Transfer and freeze commits go through the shared machinery.** Applying a snapshot range
  commits blobs and creates references, and so does a freeze, which makes both
  reference-creating writers exactly like an upload: they use the shared reference-creation
  call, so the deletion-intent check runs and `storage-and-gc.md` AC10's architecture test
  already covers them; they honour the intent's exclusive commit gate when committing a digest
  the sweep is deleting; and their write activity refreshes the repository-scoped grace, so
  blobs committed early in a long transfer are not swept before the deltas referencing them
  apply. None of this is new mechanism - the point of stating it is that a replication path
  with its own commit or delete route would silently break AC15's single-deleter boundary in
  `storage-and-gc.md`.
- **Mirrored pointer moves are repoints.** A leader-side promotion, rollback or pointer deletion
  arrives on the follower as a repoint or pointer deletion, which is the release path
  `storage-and-gc.md` AC18 polices, so a snapshot the follower's pointers stop targeting falls
  back under the follower's window and collects on schedule.
- **Retention on a follower runs from arrival, and a served snapshot is never pruned.** An
  air-gapped archive can legitimately arrive older than the retention window; evaluated against
  leader publish time it would be pruned on import and AC5 below would be unsatisfiable, so a
  follower's window runs from when a snapshot arrived locally. And whatever its age, a snapshot
  a mirrored pointer currently targets is never pruned out from under it - a follower fed rarely
  must keep serving what it has. Since 2026-09-26 that is not a replication-local rule but an
  instance of the fifth mark root: any pointer-targeted snapshot is unprunable while targeted,
  and a mirrored pointer is a pointer. It is released the same way, when replication moves the
  pointer to a newer snapshot or deletes it, which is what lets the old one age out and collect.

### Retention is the follower's problem, and it is never silent

A leader prunes snapshots outside its retention window on its own schedule, and **its pruning
consults no follower position** (resolved retention-gap question below). No follower state
exists on the leader for pruning to read, so an air-gapped follower that has been dark for a
month, or a follower nobody remembers registering, cannot hold the leader's storage
reclamation hostage - the shape `storage-and-gc.md` rejected for stale environment pointers.

The follower carries the cost instead, and detects it mechanically rather than discovering it
when someone asks for old content:

- **The leader advertises what it can reconstruct.** Its replication read surface reports, per
  repository, the pointer set (name, target number, target identity) and the retained snapshot
  ranges it can still serve deltas for. With the fifth root those ranges need not be
  contiguous: a pinned old environment target and its chain can sit well below the window.
- **A gap is detected on the next sync.** When the deltas from the follower's position to a
  target are not all retained, the follower cannot proceed contiguously. It reports status
  `reseeding` with reason `retention-gap`, keeps serving every snapshot its mirrored pointers
  target (pointers move only after the new target is whole, AC2), and re-seeds from a leader
  checkpoint at or before the target, transferring only the blobs it lacks.
- **Continuity is still checked.** A re-seed is a transfer like any other: the identity
  comparison runs first wherever both sides still hold the follower's position number, so a
  retention gap never masks a divergence.

The accepted cost is that a follower which falls behind pays a re-seed: one checkpoint's worth
of metadata per distinct target, plus whatever blobs changed while it was behind. Blobs it
already holds are not re-sent, which is what keeps that cost proportional to what actually
changed rather than to the repository's size.

An air-gapped follower detects the same gap at import instead (below): an archive whose range
does not connect to its position is refused, and the remedy is a seed archive, which the leader
can produce for any snapshot it can still reconstruct.

### Disaster-recovery takeover is explicit, per repository, and fenced by the operator

A replica holds everything needed to serve, and takeover is what turns that into a capability
rather than a data-availability claim (resolved takeover question below). "Takeover" is used
deliberately rather than "promotion", which `data-model.md` already names for repointing an
environment pointer.

- **Takeover is an explicit operator command on the follower, per repository.** It moves the
  replication link to `ended` with reason `takeover`, records on it the leader, the snapshot
  number and identity it took over at, and when, and thereby makes the repository an ordinary
  local repository as far as `Writable` is concerned: writable if its own state is `active`,
  still read-only if an operator had frozen it `read_only` (the link section above). The next
  write creates snapshot N+1 on the replicated numbering, chained to N's identity, so the
  history is continuous for anyone who followed the old leader up to N.
- **Takeover needs the keys it is about to sign with, and signs with them at once.** A linked
  follower has signed nothing (the pointer-set section above), and it also holds no
  `signing.resign` schedule: `signing-service.md` derives a schedule's next run from the stored
  documents' expiry and writes it in the re-sign job's `Finish`, so a repository that has never
  re-signed locally has no cadence at all. A takeover that waited for the first write would
  leave a disaster-recovery repository nobody publishes to serving the old leader's documents
  until their `Valid-Until` or TUF expiry lapsed, with no schedule to renew them and no alert
  before `apt` refused the suite. The takeover request therefore re-signs, in two steps that
  the door's shape dictates (the resolved takeover-signing decision below, was Q12). Takeover
  is first refused `conflict`, naming each missing key, unless every active signing key of the
  repository resolves on the follower - a `kms` or `pkcs11` key reachable from both instances,
  or a `file` key created on the follower and announced under the repository's rotation
  profile before the takeover (`signing-service.md`'s resolved follower decision, was Q9
  there, and its AC23; the replicated-repository key recipe in `deployment.md` shows the
  working configuration). The **takeover transaction** then, under the link row lock, ends the
  link, disables its schedule and registers the repository's per-pointer and repository-scoped
  `signing.resign` schedules through the signing service with their next run now, so the
  cadence exists from the first second whatever follows. The **same request** then runs the
  repository's re-sign as one repository batch over every pointer through the door's standard
  document-only form (`Renewable` passes, the link being `ended`), re-rendering every pointer
  document under the follower's resolved keys and writing the schedules' next runs from the
  renewed documents' expiry, exactly the cadence's effect on the request path. It cannot be one
  transaction: the door's standard form evaluates `Renewable` before it opens a transaction and
  its on-a-transaction form is the job runner's alone (`storage-and-gc.md` AC25), and
  `Renewable` refuses while the link is active. The keys are thereby proven by use, not only
  resolved, at the one moment an operator is watching. If that render fails - a resolved key
  that will not sign - the takeover is not undone, since the operator has already fenced the
  old leader: the link stays `ended`, the request answers the failure naming the key, the
  documents stay the old leader's, and the schedules just registered retry on the cadence with
  `SigningFailed` firing (`signing-service.md` AC17) until the key signs. A format that
  declares no signing has no keys to resolve, no documents to render and no schedule to
  register, and both steps are empty.
- **Takeover honours what the old leader retired.** The leader's `Retirement` records arrived
  with the pointer set (the pointer-set section above), so a publish after takeover that claims
  a retired coordinate is refused at claim declaration and at commit as it would have been on
  the leader (AC25). A DR takeover does not reopen coordinates every client saw closed.
- **Fencing the old leader is the operator's duty, and the command makes it an explicit
  acknowledgement.** Takeover refuses to run without an acknowledgement flag whose refusal
  message names the duty: the old leader must accept no further writes to that repository
  (stopped, or with every push and delete credential for the repository revoked) before the
  follower takes over. Nothing here fences mechanically; v1 accepts that a careless operator
  can produce a split brain.
- **A split brain is detected, not reconciled.** If the old leader does keep writing, its
  snapshot N+1 has a different identity from the new leader's, so any follower that applied the
  old leader's post-fork writes and is then pointed at the new leader reports `diverged` rather
  than applying (the identity section above). Reconciling the two histories is out of scope.
- **Other followers re-attach with no special path.** A follower repointed from the old leader
  to the new one continues with deltas if its position is on the shared history and still
  retained, re-seeds if it is not, and reports `diverged` if it is past the fork. Converting the
  old leader itself back into a replica of the new leader is the operator re-seed described
  above, and it lists the split-brain snapshots it would discard.

### Replication authentication rides the machine-token model

A follower authenticates to a leader with an ordinary `auth.md` machine token, held on the
follower as a credential reference in the same store that holds upstream credentials, and never
logged (resolved instance-to-instance-authentication question below). There is no distinct
instance identity: the leader's authorizer sees a token like any other.

- **`pull` on a repository authorizes that repository's replication read surface**: the pointer
  set, its `Signature` and `PointerDocument` records, the retained ranges, snapshot identities,
  deltas, checkpoints, and blobs by digest. The action vocabulary stays `pull`/`push`/`delete`. A token lacking `pull` on the repository -
  including a push-only token, and a token scoped to a different repository - cannot read the
  repository at all, so it is refused on every replication route with the response an absent
  repository receives, byte-identical in status, body and headers (`auth.md`'s existence rule,
  was Q11 there, and its AC17); a credential-less request is answered `unauthenticated` with
  the challenge, identically for an existing and an absent repository.
- **A `pull` grant narrowed below the whole repository does not authorize replication reads.**
  This is derived rather than chosen: a delta exposes every path in the repository, so a
  credential `auth.md`'s path and tag patterns narrow to part of a repository would read
  through replication what its pattern exists to withhold. Such a token is refused on the
  replication surface, on the same reasoning by which `auth.md`'s pattern scopes refuse a
  listing outright: the response reveals objects outside the pattern. It is refused
  `unauthorized`, not `not-found`, because a holder of a patterned `pull` can already read
  part of the repository, so its existence is nothing the oracle protects from that caller;
  this is the order `management-api.md`'s resolved refusal-type decision (was Q18 there) fixes
  for `/api/v1`, applied on the `replication` mount by the replication package's own mapping.
- **The replication routes are not format-handler routes**, so no handler's `Scope(r)` maps
  them. The replication package declares its own route-to-scope mapping, evaluated by the
  central authorizer, and an architecture test asserts that every replication route is mapped
  and that none evaluates authorization itself (AC18). This is the named enforcer the
  constitution requires of a shared boundary. The routes mount under the first path segment
  **`replication`**, which `format-handler-interface.md`'s registration layer holds as reserved
  beside `api`, `ui`, `healthz`, `readyz` and `metrics`, so no handler may be named
  `replication` or claim a root-anchored mount under `/replication/` (its AC11; the fixture pair
  in `internal/format/register_test.go` is named `replication`, one handler declaring that
  `Name()` and one claiming that root anchor, each refused at registration). The string matches
  the `format` label value `observability.md` assigns these routes and the audit event prefix
  below, so one word names the surface everywhere.
- **The follower's credential is an `UpstreamCredential`** (`upstream-adapters.md`'s store),
  referenced by the link, rotated in one row, never logged, and protected from deletion while
  referenced (`repository-lifecycle.md` AC20). The follower's outbound requests to the leader
  are not upstream fetches and use none of the upstream adapter seam; they do carry trace
  context (the observability section below).

The accepted cost is that `pull` widens: any pull-scoped CI token can enumerate snapshot history
and read deltas, and so can reach content that a hosted delete removed from the head but that
the leader still retains for rollback. Operators who need a token that downloads artifacts but
cannot read retained history have no such scope in v1.

### Air-gapped export is the same mechanism, written to a file

An export is the transfer format serialised: a snapshot range - deltas plus any checkpoint the
range depends on - the blobs it references (including CAS-backed metadata documents), the
snapshot identities, the pointer set at export time with its `Signature` and `PointerDocument`
records and their CAS-backed bodies, the `Retirement` set, the provenance records of any frozen
files, a manifest listing every digest, and enough repository identity (name, format, snapshot
numbers) for the importer to know what it is looking at. Import verifies every digest against
the manifest and the manifest against the deltas before committing anything. An archive has no
want-list negotiation, since there is no channel to negotiate over, so it carries every blob its
range newly references, every declared-list digest included. Nothing about it is a special
path, which is the point - a second mechanism would be a second set of bugs. Import is applier
work: it writes through the applier's entry point and is accepted only into a repository with
an active link (`management-api.md`'s import row), which on an air-gapped instance is a link
whose leader is named and never reached, so that the imported repository is a replica, read-only
and refusing every other writer, exactly as a networked follower is. An import into a
repository with no link, or whose link is `ended`, is refused `validation`.

Import carries the obligations the network path gets for free:

- **The trust root is a manifest digest carried out of band.** Export prints the digest of its
  top-level manifest, and import requires that digest as a mandatory argument, refusing to start
  without it and refusing with nothing committed when the archive's manifest does not match it
  (resolved archive-trust-root question below). Digest verification alone proves only that an
  archive is internally consistent: a rewritten manifest with a dist-tag repointed at a
  malicious version verifies perfectly against itself. The operator already carries the medium
  across the gap, so carrying a digest beside it through a separate channel is the trust root,
  and the operator guide says plainly that a digest carried on the same medium as the archive
  verifies nothing.
- **Contiguity and identity are checked, not assumed.** An archive covering snapshots N to M
  imports only onto a follower whose position is at least N-1 or inside the range, and whose
  position's identity matches the archive's identity at that number, or which is seeding from a
  checkpoint the archive carries. A gapped import is refused with an error naming the missing
  range, and a divergent one with an error naming the fork, never applied around the hole.
- **Import is atomic and idempotent.** A truncated or internally inconsistent archive - a delta
  referencing a blob the archive does not contain - is refused with nothing committed, and
  re-importing an archive whose range has already applied is a no-op rather than an error,
  because sneakernet workflows retry.

An archive may be exported from a replica as well as from the leader, since the replica carries
the leader's numbers and identities. The trust root is then the digest the exporting instance
printed.

### What a monitor sees, and what an operator configures

AC10's "an explicit status a monitor can alert on, never only as a log line" is met through
`observability.md`'s shared instruments, not a replication-local endpoint, so the names below
are that spec's catalogue and this spec's tests assert them through `telemetry.NewTestRecorder`
(its AC6):

- **Metrics**, all labelled by `link`: `replication_link_state{link,state}`, a one-hot gauge
  over the six states in the link table above; `replication_last_sync_timestamp_seconds{link}`,
  from which lag is `time() - value`; `replication_snapshots_behind{link}`, the position gap to
  the leader as of the last contact; and `replication_bytes_transferred_total{link,direction}`.
- **Alerts** in the packaged `alerts.yaml`: `ReplicationLinkFailed`, `ReplicationReseeding` and
  `ReplicationDiverged` on the corresponding one-hot state, and `ReplicationLagHigh` when the
  last successful sync is older than 15 minutes.
- **Audit events**: `replication.link.create`, `.update`, `.delete`, `.sync`, `.reseed`,
  `.takeover`, `replication.export` and `replication.import`, each carrying `link` and `leader`,
  emitted through `telemetry.Auditor.Emit` by the management route that performs the write
  (`observability.md`'s vocabulary table and AC12); a `replication.link.reseed` record lists the
  discarded snapshots in the fixed `objects` attribute. The link's `GET`, like every read, is
  the request log's and emits no audit record.
- **Trace propagation**: a follower's requests to its leader carry `traceparent` and
  `tracestate`, so a follower's sync span is a child of the leader's trace and one trace spans
  both instances (`observability.md`'s resolved propagation decision, was Q4 there, and its
  AC20). Requests to a replication peer are the one outbound path that propagates; upstream
  fetches never do. The replication read surface is not a listener of its own: it is the
  `replication` mount on the main listener, labelled `format="replication"` on the HTTP series,
  and its responses carry `X-Request-Id` like every other (its AC14). The credential the
  follower presents is marked through `telemetry.MarkSecret` under the job's per-job secret set
  (`async-operations.md` AC27), so no record a sync emits carries it.

The instance configuration this spec owns, registered under the `replication.` prefix
`deployment.md` reserves for it, in that spec's three-column shape:

| Key | Default | Meaning |
|---|---|---|
| `replication.sync_interval` | `60s` | Period of a link's `replication.sync` schedule when the link sets none of its own; the floor for a per-link value |
| `replication.blob_concurrency` | `8` | Concurrent want-list blob fetches per running sync job |

There is no checkpoint-interval key: the checkpoint is per completed snapshot by construction
(the sync-as-jobs section above), and the leader's checkpoint cadence is `data-model.md`'s.
Per-link settings (the leader, the credential reference, an optional sync interval) live on the
`ReplicationLink` row, not in instance configuration, consistent with `repository-lifecycle.md`'s
boundary between records and configuration.

## Acceptance Criteria

- [ ] AC1: A follower replicating a leader repository serves byte-identical content for every
      artifact under every pointer the leader carries - the default pointer and each named
      environment pointer, including one targeting a snapshot outside the leader's retention
      window - including metadata at all three levels and, for a format whose pointers carry
      signed or dated documents, the leader's `Signature` and `PointerDocument` records byte
      for byte.
- [ ] AC2: A follower's mirrored pointer moves only after the complete snapshot it will target
      has arrived and verified; a transfer killed midway leaves every mirrored pointer on the
      most recently completed target (its pre-transfer target if none completed), never a
      partially applied one.
- [ ] AC3: An interrupted transfer resumes from the last completed snapshot rather than
      restarting: a `replication.sync` worker killed mid-transfer loses its lease, another worker
      reclaims the job and its `Work` re-runs from the checkpoint written after the last
      completed snapshot, transferring no blob and applying no snapshot the checkpoint already
      covers.
- [ ] AC4: A blob arriving with a digest that does not match is rejected and nothing is
      committed, proven by a fault-injection test that corrupts bytes in transit.
- [ ] AC5: A snapshot range exported to an archive and imported into an isolated instance with no
      network between them produces a follower serving identical content, including when the
      archive is imported after the retention window's length has elapsed since export, and
      including an archive exported from a replica rather than from the leader.
- [ ] AC6: A leader prunes on its own retention schedule with no follower position consulted, and
      a follower whose position has fallen out of the leader's retained ranges detects the gap
      on its next sync, reports `reseeding` with reason `retention-gap`, keeps serving every
      snapshot its mirrored pointers target throughout, and ends serving content identical to
      the leader's; pruning on the leader proceeds unchanged while a registered follower is
      offline.
- [ ] AC7: A follower's GC marks from all five roots over replicated content: a replicated
      CAS-backed metadata document blob that no `File` row references survives its sweep,
      every snapshot the follower's mirrored pointers target survives its pruning even when
      older than the follower's retention window and still serves, and a sweep interleaved
      with an in-progress transfer or freeze never collects a blob the transfer or freeze has
      committed - asserted by the same property test that covers the leader's mark roots, with
      transfer-apply (seed and re-seed included), mirrored pointer moves and freeze added to
      its operation set.
- [ ] AC8: A brand-new follower, and one re-seeding after a gap, seeds from a checkpoint plus
      tail deltas and succeeds against a leader that has pruned its early history; the volume
      transferred is bounded by the content set plus one checkpoint interval per distinct
      pointer target, not by history length, and a re-seed transfers no blob the follower
      already holds.
- [ ] AC9: An archive that is truncated, internally inconsistent (a delta referencing a blob the
      archive lacks), gapped relative to the follower's position, or divergent from it (a
      different identity at the follower's position number) is refused with an explicit error
      naming the problem and nothing committed; re-importing an already-applied archive is a
      no-op; and an import into a repository with no link, or whose only link is `ended`, is
      refused `validation` with nothing committed.
- [ ] AC10: A follower exposes, per replicated repository, its current position, each mirrored
      pointer's target, and the time of its last successful sync; a failed sync, a re-seed in
      progress and a detected divergence are each surfaced as an explicit status a monitor can
      alert on (`failed`, `reseeding`, `diverged`), never only as a log line: the link's state
      is exactly one of `syncing`, `idle`, `failed`, `reseeding`, `diverged`, `ended`, reported
      one-hot as `replication_link_state{link,state}` beside
      `replication_last_sync_timestamp_seconds{link}`, `replication_snapshots_behind{link}` and
      `replication_bytes_transferred_total{link,direction}`; the packaged alerts
      `ReplicationLinkFailed`, `ReplicationReseeding`, `ReplicationDiverged` and
      `ReplicationLagHigh` fire on those series; every link create, update, delete, on-demand
      sync, re-seed and takeover and every export and import emits exactly one audit record
      under its event (`replication.link.create`, `.update`, `.delete`, `.sync`, `.reseed`,
      `.takeover`, `replication.export`, `replication.import`) carrying `link` and `leader`, the
      re-seed's listing the discarded snapshots in `objects`, while the link's `GET` emits none
      and leaves a request-log line; the replication read surface answers on the main listener
      under the `replication` mount with `X-Request-Id` on every response; and a follower's
      requests to its leader carry `traceparent` and `tracestate` so the follower's sync span
      is a child of the leader's trace.
- [ ] AC11: A replicated repository refuses a client publish, a hosted delete, a metadata-only
      mutation, and every pointer create, repoint and delete, each refused through
      `repository.Writable`'s `ErrReplica` and rendered `405` with problem type `replica` whose
      detail names the repository as a replica and names its leader, and its content is unchanged
      afterwards; on the same instance a local repository accepts writes, and one instance
      simultaneously follows a leader for one repository and serves as leader for another.
- [ ] AC12: No package other than the replication applier can commit a snapshot, move a
      pointer or re-render a pointer document in a repository with an active replication link:
      the sole write-transaction constructor calls `repository.Writable`, its document-only
      form calls `repository.Renewable`, which refuses `ErrReplica` on a linked replica (a
      cadence re-sign is refused there; a follower renews nothing, `signing-service.md` AC23)
      and has no waiving entry point, the entry point that waives
      `ErrReplica` (and only that error) is imported by `internal/replication` alone, and an
      architecture test on the constructor asserts all of it.
- [ ] AC13: Configuring replication from a `remote` or `virtual` source repository is refused
      with an error naming the repository type, and a virtual repository defined on the follower
      over its replicas and its own remote repositories resolves in member order.
- [ ] AC14: Freezing a remote repository's cached content produces exactly one snapshot in the
      target local repository, served through the hosted path byte-identical to the cached
      content, with metadata documents rendered by the target repository's handler and listing
      only frozen files; serving from the frozen repository makes no upstream request (asserted
      at the network layer), each frozen file's provenance names its source remote repository,
      upstream URL and path, and fetch time, files not cached are reported as excluded, and a
      freeze whose cached blob was swept before commit fails naming it with nothing committed.
      Proven for every registered format that declares proxy support.
- [ ] AC15: A freeze of a remote repository, exported and imported into an isolated instance
      running in offline mode, serves the frozen content to the ecosystem's real client there
      with no network between the instances, and the frozen files' provenance is readable from
      the importing instance's API; the case declares the two instances network-isolated in the
      harness and provisions its repositories and links through the harness's `replication`
      `setup` key, whose provisioner this spec builds, so the runner no longer rejects that key
      as not yet landed.
- [ ] AC16: Takeover refuses to run without the operator's explicit fencing acknowledgement, with
      a refusal naming the duty; with it, the link moves to `ended` with reason `takeover`, the
      repository accepts writes, its next write creates the snapshot numbered one past the last
      replicated snapshot and chained to its identity, and the link records the leader, snapshot
      number and time it took over at; a repository that was `read_only` before takeover is
      `read_only` after it, refusing writes with `ErrReadOnly` until thawed, while its cadence
      re-sign proceeds.
- [ ] AC17: A follower whose position's identity differs from the leader's identity at the same
      number - produced by an old leader that kept writing after a takeover, by a leader
      restored from an older backup that then wrote again, and by a local repository with its
      own history being linked - applies nothing, keeps serving, and reports `diverged` with
      the highest snapshot number both agree on; a leader whose head is below the follower's
      position (restored from a backup and not yet written to) is reported `diverged` at that
      head without waiting for its next write; and the follower leaves that state only through
      an explicit operator re-seed, which lists the local snapshots it will discard before
      discarding them.
- [ ] AC18: A machine token with `pull` on a repository replicates it; a token without `pull` on
      it (push-only, or scoped to another repository) is refused on every replication route
      with the response an absent repository receives, byte-identical in status, body and
      headers; a `pull` grant narrowed below the whole repository is refused `unauthorized` on
      every replication route; a credential-less request is answered `unauthenticated` with the
      challenge, identically for an existing and an absent repository; and an architecture
      test asserts every replication route
      is mapped to a scope evaluated by the central authorizer, that no replication route
      evaluates authorization itself, and that every replication route sits under the reserved
      `replication` first segment, which handler registration refuses to a handler named
      `replication` and to a root-anchored claim under `/replication/`.
- [ ] AC19: Export prints its manifest digest; import refuses to start without a manifest digest
      argument, refuses with nothing committed when the digest does not match the archive's
      manifest, and refuses an archive whose manifest was rewritten with every internal digest
      made consistent (a dist-tag repointed at another version) when given the export-time
      digest.
- [ ] AC20: Leader pointer moves - creation, promotion, rollback to an earlier retained snapshot,
      and deletion - are reflected on the follower after its next sync, and a pointer deleted on
      the leader is deleted on the follower, releasing its pin so its snapshot ages out under
      the follower's window; across a leader rollback the link's position, its identity check
      and the mirrored default pointer's target are unchanged, the position's snapshot survives
      the follower's pruning however old it grows while the link is active, and the leader's
      next write after the rollback applies as one contiguous delta with no re-seed.
- [ ] AC21: A linked follower of a repository whose format declares signing serves the leader's
      `Signature` and `PointerDocument` records verbatim, its `Last-Modified` and signed index
      bytes equal to the leader's, and creates no `Signature` record and calls no signing
      backend while the link is active; takeover of that repository is refused `conflict` with
      a problem naming each active key that does not resolve on the follower, and succeeds when
      every active key resolves (a shared `kms` fixture key, and a `file` key created and
      announced on the follower beforehand), registering the repository's `signing.resign`
      schedules in the transaction that ends the link and re-rendering every pointer document
      under those keys in the same request through the door's document-only form, so that with
      no write after takeover a real client still installs after the old leader's documents
      would have expired, and a linked follower has no such schedule at all; a resolved key
      that fails to sign leaves the link `ended`, the documents unchanged and the schedules
      registered, the request failing naming the key and `SigningFailed` firing until the
      cadence's retry signs.
- [ ] AC22: Deleting a replica ends its link with reason `deleted` in the deletion transaction;
      a leader-side rename or deletion of the leader repository makes the follower's next sync
      mark the link `failed` with reason `not-found` while the follower keeps serving its last
      replicated position; updating the link's leader repository name after a rename resumes
      syncing with no re-seed; configuring a link on a deleted repository is refused, and a link
      whose leader repository is a `remote` or `virtual` fails naming `source-type`; freezing a
      replica `read_only` makes its next sync apply nothing and mark the link `failed` with
      reason `read-only`, with `ReplicationLinkFailed` firing, and the thaw's next sync resumes
      with no re-seed; and deleting the `UpstreamCredential` a link references is refused `409`
      `in-use` naming the link until the link is deleted or rotated to another credential.
- [ ] AC23: Each active link is a `Schedule` on `internal/async` that enqueues a
      `replication.sync` job with exclusivity key `link:{id}`, so a second sync of the same link
      never runs while one holds the key, an on-demand sync enqueues the same kind, the job
      checkpoints after every completed snapshot, the `Schedule` is disabled in the transaction
      that ends the link (takeover or deletion) so no sync is enqueued for an `ended` link and
      an on-demand sync, re-seed or takeover against one is refused, and an instance with
      `proxy.offline: true` enqueues no `replication.sync` while its links keep their position
      and still accept an archive import.
- [ ] AC24: The configuration schema registers exactly `replication.sync_interval` (default
      `60s`) and `replication.blob_concurrency` (default `8`) under the `replication.` prefix
      and refuses any other key under it naming this spec; a link with no interval of its own
      syncs at `replication.sync_interval`, a per-link interval below it is refused
      `validation`, and a sync job runs at most `replication.blob_concurrency` want-list fetches
      at once.
- [ ] AC25: The leader's `Retirement` records and the `FileProvenance` records of its frozen
      files arrive on the follower with the pointer set and in an exported archive, applying
      twice is a no-op, and after takeover a publish claiming a coordinate the old leader
      retired is refused at claim declaration and at commit exactly as on the leader, with
      nothing committed; the frozen files' provenance is readable from the follower's API
      while linked.
- [ ] AC26: A takeover, an operator re-seed and a replica's deletion each serialise with a
      running `replication.sync` on the link row: a sync killed or paused mid-transfer when the
      takeover commits applies no further snapshot, ends itself, and the new leader's first
      write is the only snapshot numbered N+1; the link row's position advances in the same
      transaction as each applied snapshot and a worker killed between that commit and its
      `job.Checkpoint` re-runs without applying the snapshot twice; and after an operator
      re-seed the discarded snapshots' rows and identity records are gone, the leader's
      snapshots apply under those numbers with the leader's identities, the discarded deltas,
      checkpoints and blobs are reclaimed by the pruner and the sweep with no object deleted by
      `internal/replication`, and the follower serves content identical to the leader's.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | integration | `internal/replication/content_test.go` (default and environment pointers, one pinned outside the leader's window; a signed-index fixture format's `Signature` and `PointerDocument` bytes) |
| AC2 | fault injection | `internal/replication/atomicity_test.go` (kill mid-transfer) |
| AC3 | fault injection | `internal/replication/resume_test.go` (worker killed mid-transfer, lease expiry, reclaim and re-run from the checkpoint; blob and snapshot accounting against the checkpoint) |
| AC4 | fault injection | `internal/replication/verify_test.go` |
| AC5 | integration | `internal/replication/airgap_test.go` (leader-exported and replica-exported archives) |
| AC6 | integration | `internal/replication/retention_test.go` (leader prunes past an offline follower; follower detects, re-seeds and keeps serving) |
| AC7 | property | `internal/storage/gc_property_test.go` (transfer-apply, mirrored pointer moves and freeze in the operation set) |
| AC8 | integration | `internal/replication/seed_test.go` (leader with pruned early history; re-seed byte accounting against blobs already held) |
| AC9 | fault injection | `internal/replication/airgap_test.go` (truncated, mutated, gapped and divergent archives; an import into an unlinked repository and into one whose link is `ended`, each refused `validation`) |
| AC10 | integration | `internal/replication/status_test.go` (state per link); `internal/replication/metrics_test.go` through `telemetry.NewTestRecorder` (the four series, the four alerts' rules, the eight `replication.*` audit events with the re-seed's `objects` and no record for the link `GET`, the `format="replication"` label and `X-Request-Id` on the read surface; shared with `observability.md` AC6, AC12 and AC14, and with `management-api.md` AC33's `internal/manage/replication_routes_test.go` for the route-emitted events); `internal/replication/trace_test.go` (two instances, one trace; shared with `observability.md` AC20) |
| AC11 | integration | `internal/replication/readonly_test.go` (every write kind against a replica, `ErrReplica` and the `replica` problem naming the leader; mixed-role instance) |
| AC12 | architecture + integration | `internal/storage/arch_test.go` (sole write-transaction constructor calls `Writable`; its document-only form calls `Renewable` and has no waiving entry point; the `ErrReplica`-waiving entry point imported only by `internal/replication`; shared with `repository-lifecycle.md` AC9 and `storage-and-gc.md` AC25); `internal/replication/renewable_test.go` (a cadence re-sign refused `ErrReplica` on a linked replica, proceeding once the link is `ended`) |
| AC13 | integration | `internal/replication/source_test.go` (remote and virtual sources refused; follower-defined virtual resolution) |
| AC14 | integration | `internal/replication/freeze_test.go` (table-driven over every handler declaring proxy support; network-level no-egress assertion; sweep-before-commit fault) |
| AC15 | conformance | `conformance/replication/freeze_airgap_test.go` (two network-isolated instances, offline mode, real client, links through the `replication` key); `conformance/core/seed_test.go` (the `replication` provisioner reached through the seed path) |
| AC16 | integration | `internal/replication/takeover_test.go` (acknowledgement gate; link `ended` with reason `takeover`; numbering and identity continuation; a `read_only` replica stays read-only and keeps re-signing); `internal/model/replication_link_test.go` (the `ended` transition and the takeover record on the link, shared with `data-model.md` AC31) |
| AC17 | integration | `internal/replication/divergence_test.go` (post-takeover split brain; leader restored from backup, before and after its next write; a written local repository linked) |
| AC18 | integration | `internal/replication/auth_test.go` (pull, push-only, other-repository and pattern-narrowed tokens and a credential-less request on every replication route; byte equality of the push-only and other-repository responses with an absent repository's, and of the two credential-less responses; shared with `auth.md` AC17 and AC24) |
| AC18 | architecture | `internal/replication/arch_test.go` (every replication route mapped through the central authorizer and mounted under `/replication/`); `internal/format/register_test.go` (the `replication` fixture pair refused at registration; shared with `format-handler-interface.md` AC11) |
| AC19 | fault injection | `internal/replication/airgap_trust_test.go` (missing digest, wrong digest, rewritten self-consistent manifest) |
| AC20 | integration | `internal/replication/pointers_test.go` (create, promote, rollback, delete; pin release on the follower; a leader rollback followed by the follower's retention pass with the position outside its window, then a leader write applied as one delta) |
| AC21 | integration + conformance | `internal/replication/signing_records_test.go` (records on the read surface; follower's bytes equal the leader's; no `Signature` created, no backend call and no `signing.resign` schedule while linked); `internal/replication/takeover_keys_test.go` (refused `conflict` naming unresolvable keys; succeeds with a shared `kms` fixture key and with a pre-announced follower `file` key; the schedules registered in the ending transaction and every pointer document re-rendered in the request; a fixture `kms` key that resolves and refuses to sign: link `ended`, documents unchanged, schedules present, the request failing naming the key, `SigningFailed` through `telemetry.NewTestRecorder`, the cadence's retry succeeding once the fixture signs); `conformance/replication/takeover_expiry_test.go` (a Debian or Hackage replica taken over with no further write, the clock advanced past the old leader's document expiry, a real client installing); the first two shared with `signing-service.md` AC23 |
| AC22 | integration | `internal/replication/lifecycle_test.go` (replica deletion ends the link; leader deletion observed as `failed` `not-found`, follower still serving; shared with `repository-lifecycle.md` AC22, and with `data-model.md` AC31 for the `ended`/`deleted` transition); `internal/replication/link_rename_test.go` (leader rename, name update, resume without re-seed; shared with `repository-lifecycle.md` AC13); `internal/replication/link_config_test.go` (deleted repository refused; credential `in-use`, shared with `repository-lifecycle.md` AC20); `internal/replication/readonly_replica_test.go` (freeze, `failed` `read-only`, alert, thaw and resume) |
| AC23 | integration | `internal/replication/sync_job_test.go` (schedule per link, kind and exclusivity key, on-demand enqueue, checkpoint per snapshot, the schedule disabled by takeover and by deletion with no later enqueue and the on-demand routes refused on an `ended` link, offline instance enqueues nothing and still imports; the disabled-schedule half shared with `async-operations.md` AC14) |
| AC24 | unit + integration | `internal/replication/config_test.go` (defaults, per-link floor, concurrency bound observed at a counting leader); `scripts/check-config-keys.js` over this spec's key table (`deployment.md`'s Phase 1 tool, shared with it) |
| AC25 | integration | `internal/replication/retirement_test.go` (records on the read surface and in the archive; idempotent apply; post-takeover claim refused at declaration and at commit, shared with `data-model.md` AC35's `internal/model/retirement_test.go`); provenance readable while linked in `internal/replication/airgap_test.go` |
| AC26 | fault injection | `internal/replication/takeover_race_test.go` (sync paused mid-transfer at every apply boundary while takeover, re-seed and deletion commit; the single N+1 writer); `internal/replication/resume_test.go` (kill between the apply commit and `job.Checkpoint`); `internal/replication/reseed_test.go` (rows and identities removed, leader's numbers reapplied, reclamation by pruner and sweep under `storage-and-gc.md` AC15's deleter scan over `internal/replication`) |

## Implementation Phases

### Phase 0: Sibling prerequisites
Not work in this spec's package, but it gates Phase 1. Status at the 2026-09-28 reconciliation:
`auth.md` records that `pull` authorizes the replication read surface and that a
pattern-narrowed grant does not (its section "What `pull` also authorizes: replication reads",
done); `data-model.md` defines the replication link, the retained snapshot identity, the freeze
write kind and the provenance record (its AC29 to AC31, done in the spec, built in its Phase 5);
`format-handler-interface.md` reserves the `replication` segment (its AC11, done; the string is
named here); `repository-lifecycle.md` generalises the replica refusal into `repository.Writable`
(its AC9); `async-operations.md` runs `replication.sync` (its consumer table); `signing-service.md`
puts `Signature` and `PointerDocument` records on the read surface and states the takeover key
precondition (its AC23, its Phase 5); `observability.md` catalogues the metrics, alerts, audit
events and peer propagation (its Phase 4); `deployment.md` reserves the `replication.` prefix
and carries the replicated-repository key recipe. Every one exists as a spec; the runtime
each provides lands with its own phases, and this spec's Phase 1 waits on `internal/async`,
`internal/repository` and `internal/telemetry` being built. Still pending as a design input:
the server-side ingest hook, a named input to the interface's scheduled re-open, which Phase 4
waits on.

### Phase 1: Pull replication
The harness's `replication` `setup` provisioner on the seed path, including a taken-over starting
state, so every later phase's conformance cases can be expressed. Snapshot-range transfer with
want-list blob fetch as `replication.sync` jobs with per-snapshot checkpoints, the `replication.`
configuration keys, checkpoint-based seed and re-seed, snapshot identity and divergence refusal,
pointer-set mirroring including `Signature`, `PointerDocument`, `Retirement` and
`FileProvenance` records, digest verification, atomic pointer moves, the link row as the
position of record with every apply serialised on it, resume through the queue's rescue path,
read-only enforcement on replicas through the shared `Writable` entry point and its
architecture test, replication authentication with its route mapping and architecture test,
source-type refusal, the link's management operations and lifecycle composition, and the
follower status surface with its metrics, alerts, audit events and peer trace propagation
(AC1-AC4, AC6-AC8, AC10-AC13, AC17 in part, AC18, AC20, AC21 in part, AC22-AC24, AC25 in
part, AC26 in part).

### Phase 2: Air-gapped export and import
The same transfer format serialised to an archive, with the out-of-band manifest digest, digest,
contiguity, identity and atomicity checks on import, and export from replicas (AC5, AC9, AC19).

### Phase 3: Disaster-recovery takeover
The takeover command with its fencing acknowledgement, its signing-key precondition, the
schedule registration in its ending transaction and the request-path re-sign that follows it,
numbering and identity continuation, the
retired coordinates honoured, the serialisation of takeover and re-seed with a running sync,
the operator re-seed that lists and removes the discarded snapshots, and the operator guide's
fencing runbook and replicated-repository key recipe (AC16, AC17, AC21, AC25 and AC26 in
full).

### Phase 4: Freeze of cached content
Freeze into a local repository through the handler ingest hook, provenance recording and export,
and the end-to-end air-gap proof with a real client (AC14, AC15).

## Tasks

Populated by `/tasks` now that this spec is `planned`.

## Open Questions

No questions are open. The seven raised by the first review were adopted on 2026-09-26 under
the owner's standing delegation, and folding them exposed three further judgment calls (Q8-Q10),
which were raised and adopted in the same pass. The 2026-09-28 reconciliation raised and adopted
one more (Q11), and the Fable gate review of 2026-10-01 one more (Q12). Every adopted answer is
reversible by the owner; `grep -n "standing delegation"` lists them.

### Resolved: retention-gap recovery (was Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: followers detect the gap
and re-seed; the leader's pruning consults no follower. Accepted cost: a follower that falls
behind pays a re-seed - one checkpoint per distinct pointer target plus the blobs that changed
while it was behind, since blobs it already holds are never re-sent. B lost because it couples
the leader's storage reclamation to the availability of every downstream instance, and an
air-gapped follower cannot report its position at all; C lost because it builds two mechanisms
and a lease duration that is wrong for either geo-replication or air-gapped use.

Folded into: Scope (follower-side retention-gap recovery), Design (want-list blob transfer; the
retention section, rewritten), AC6 (rewritten to assert this option), AC8 (re-seed transfers no
blob already held), AC10 (`reseeding` status), Phase 1.

| Option | You get | It costs |
|---|---|---|
| **A. Followers detect the gap and re-seed** | A leader prunes on its own schedule; an offline or abandoned follower cannot pin the leader's storage | A follower that falls behind pays a full re-seed, which for a large repository is expensive and surprising |
| **B. Leader refuses to prune past its furthest-behind follower** | No follower ever needs a re-seed | Storage reclamation on the leader is held hostage by the worst follower, including ones nobody remembers registering, and an air-gapped follower has no way to report its position at all |
| **C. Leader tracks followers with a lease that expires** | Bounded version of B: a silent follower stops counting after its lease lapses | Two mechanisms and a lease duration that is wrong for either geo-replication or air-gapped use |

**Why this is yours:** it decides whether a degraded follower costs the leader storage or costs
itself a re-seed, and the air-gapped case makes position reporting impossible by definition.

### Resolved: follower writability (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a replicated repository
is read-only, replication is per repository, and local repositories sit alongside replicas on the
same instance. Accepted cost: a regional team cannot publish into a replica; it publishes into a
local repository on its instance, and a client wanting both composes them in a follower-defined
virtual repository. B lost because a writable replica gives one repository two writers, which is
the multi-leader problem the scope excludes, and forces its own snapshot numbering to coexist
with the replicated sequence; C lost because an instance-wide follower forbids the mixed-role
instance that makes regional deployments useful, for no correctness gain over per-repository
roles.

Folded into: Scope (per-repository replication, read-only replicas), Design (the read-only
section, with its shared-write-path enforcer), AC11, AC12, Phase 1.

The question as raised had a recommendation but no options table; the table below was written
in this pass so the adoption rests on the template's decision shape. A read-only follower is
simple to reason about; a follower that also hosts local publishes is far more useful for a
regional team, and immediately raises how its own snapshot numbering coexists with the
replicated sequence.

| Option | You get | It costs |
|---|---|---|
| **A. Read-only replicas; per-repository roles; local repositories alongside** | No repository ever has two writers; replica snapshot numbers are the leader's; one instance can lead some repositories and follow others | Writes to a replicated name must go to the leader or to a separate local repository; a misconfigured client gets an error rather than a local publish |
| **B. Writable followers with their own snapshot sequence overlaid on the replicated one** | A regional team publishes into the same name it pulls from | Two writers per repository, a numbering scheme that merges two sequences, and conflict semantics the scope explicitly refuses to define |
| **C. Whole-instance followers, read-only throughout** | Simplest to reason about: an instance is either a leader or a follower | No mixed-role instances, so a region needs a second instance for its own content; nothing gained over A in correctness |

**Why this is yours:** it is the boundary between replication and multi-leader, and the scope
above explicitly excludes conflict resolution.

### Resolved: virtual repositories (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: virtual repositories do
not replicate, and a follower composes its own from the repositories it has. Accepted cost: an
operator mirroring a leader's layout re-creates each virtual repository by hand, and the two
definitions can drift. B lost because it serves a silently incomplete aggregate under a name
clients trust, and adds configuration replication as a second mechanism beside snapshot
transfer.

Folded into: Scope (out of scope, by name), Design (the source section), AC13, Phase 1.

| Option | You get | It costs |
|---|---|---|
| **A. Not replicable; followers define their own virtual repositories** | Replication stays content-only; a follower can never serve a silently incomplete aggregate under a name clients trust | An operator mirroring a leader's layout re-creates each virtual repository by hand, and the two definitions drift over time |
| **B. Replicate the virtual definition, resolving only members present on the follower** | One action mirrors the client-facing URL a team actually points builds at | The follower silently serves a subset through the same name, a member added on the leader is invisible until config re-syncs, and configuration replication is a second mechanism beside snapshot transfer |

**Why this is yours:** it decides whether replication promises "the same bytes" or "the same
client-facing surface", and the difference is invisible until a member is missing.

### Resolved: proxied upstream content across an air gap (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: a freeze operation copies
a remote repository's cached content into a local repository as one ordinary publish, which then
replicates and exports normally. Accepted cost: the frozen copy is a real publish - it snapshots,
counts against retention and quota, needs a provenance record that is not a `RemoteFile`, needs
a handler ingest hook the pinned interface lacks, and makes `data-model.md` gain a write kind.
A lost because it abandons the most common air-gap workflow and leaves users to hand-publish
upstream packages with no provenance; C lost because it reverses `data-model.md`'s settled
position that proxied repositories create no snapshots, which keeps the hot proxy path off the
snapshot sequence.

Folded into: Context, Scope (freeze in scope; direct cache replication stays out), Design (the
freeze section), AC7 (freeze in the property operation set), AC14, AC15, Phases 0 and 4. The
metadata-derivation choice this exposed was raised as Q10 and is resolved below.

| Option | You get | It costs |
|---|---|---|
| **A. Unserved in v1, documented loudly: archives carry local repositories only** | No new mechanism anywhere | The flagship air-gap workflow is absent, and users will reproduce it by hand-publishing upstream packages into a local repository with no provenance |
| **B. A promote/freeze operation copies cached content into a local repository, which replicates normally** | Air-gap mirroring works as a composition of existing publish, snapshot and export machinery | The promoted copy is a real publish - it snapshots, counts against retention, and needs `RemoteFile` provenance semantics defined - and `data-model.md` must gain the operation |
| **C. Remote repositories gain snapshots for export** | Direct, no copy step | Reverses `data-model.md`'s resolved position that proxied repositories create no snapshots, which was settled to keep the hot proxy path off the snapshot sequence |

**Why this is yours:** every option either abandons the most common air-gap workflow or amends a
settled sibling decision, and the constitution says that choice is raised, never taken silently.

### Resolved: disaster-recovery takeover and fencing (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: an explicit
per-repository operator command severs replication and makes the replica writable, with fencing
of the old leader a documented operator duty that the command makes the operator acknowledge.
Accepted cost: if the old leader keeps accepting writes, the histories diverge and reconciling
them is unsolved here; v1 detects the divergence (the identity decision, was Q9) rather than
preventing it. B lost because it leaves the DR use case in Context as a data-availability claim rather than
a capability. The operation is named "takeover" to keep it distinct from `data-model.md`'s pointer
promotion.

Folded into: Context, Scope, Design (the takeover section), AC16, AC17, Phase 3. With Q1 and Q2
it composes: a replica is read-only until takeover (was Q2), and followers re-attach to a new
leader through the ordinary delta-or-re-seed path (was Q1).

| Option | You get | It costs |
|---|---|---|
| **A. Manual promotion command; fencing is a documented operator duty** | DR is a real capability, with no coordination machinery built | If the old leader keeps accepting writes, the histories diverge, and reconciling them is explicitly unsolved here |
| **B. No promotion in v1: DR means an operator rebuilds from the follower's data by hand** | Zero new surface and no split-brain to mishandle | The DR use case in Context is overstated: the follower holds the data but cannot take over |

**Why this is yours:** it decides whether the DR use case is a capability or a data-availability
claim, and accepting a manually-fenced split-brain window is a risk posture only the owner can
sign.

### Resolved: instance-to-instance authentication (was Q6)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: an ordinary machine token,
whose `pull` scope on a repository also authorizes that repository's replication read surface.
Accepted cost: `pull` widens - a pull-scoped CI token can enumerate snapshot history and read
deltas, including content a hosted delete removed from the head that the leader still retains.
Derived, not chosen: a `pull` grant narrowed below the whole repository by `auth.md`'s path and
tag patterns does not authorize replication reads, since a delta exposes every path. B lost
because it amends `auth.md`'s settled vocabulary, chosen to match OCI's scope grammar with no
translation layer, to buy least privilege for a credential that can read nothing a full-repository
pull cannot already serve at the head.

Folded into: Scope, Design (the authentication section, with its architecture-test enforcer),
AC18, Phases 0 and 1. The recording of this widening belongs in `auth.md`, which owns the
vocabulary.

| Option | You get | It costs |
|---|---|---|
| **A. Ordinary machine token; `pull` grants replication reads** | One credential model; `auth.md` untouched | `pull` silently widens: any pull-scoped CI token can now enumerate snapshot history and deltas, which is more than "download artifacts" |
| **B. A new `replicate` action in the scope vocabulary** | Least privilege stays explicit and auditable | Amends `auth.md`'s settled vocabulary, which was chosen to match OCI's scope grammar with no translation layer |

**Why this is yours:** both options touch a settled sibling decision - widening what `pull`
means, or amending the vocabulary - and the constitution requires that to be decided in
daylight.

### Resolved: archive trust root (was Q7)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: export prints the
manifest digest, and import requires it as a mandatory argument carried out of band. Accepted
cost: the root is only as strong as the operator's channel discipline, and a digest carried on
the same medium as the archive verifies nothing, which the operator guide states plainly. B lost
for v1 because it introduces a class of instance key - generation, rotation, pinning and
distribution - that no spec owned at the time. If the owner later reverses to B, the key belongs
to `signing-service.md`, which reserves the `archive` key purpose with instance scope for exactly
that reversal and builds nothing for it, not to this package.

Folded into: Scope (instance-key signing out of scope), Design (the export section's trust-root
bullet), AC19, Phase 2.

| Option | You get | It costs |
|---|---|---|
| **A. Mandatory out-of-band manifest digest at import** | Tamper detection with zero key management | Only as strong as the operator's out-of-band channel discipline; a digest sent alongside the archive on the same medium verifies nothing |
| **B. Leader signs the manifest with an instance key; the follower pins the public key** | Mechanical verification that survives careless operators, and a foundation for leader identity generally | A new class of key that `auth.md` does not own: generation, rotation, pinning and distribution UX all appear |

**Why this is yours:** it sets the supply-chain posture of the one path where transport security
protects nothing, and trading key management against operator discipline is a product-risk
call.

### Resolved: which pointers replicate (was Q8)

Raised and adopted in this pass: folding Q2 and the fifth-root paragraph exposed that the spec
tracked "a leader repository's snapshot number", a single-pointer model, while serving resolves
through several named pointers per repository (`data-model.md`).

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the leader's whole
pointer set replicates. Accepted cost: a follower transfers and pins every distinct snapshot the
leader's pointers target, including environment targets the leader has pinned outside its window,
so a follower's storage tracks the leader's pointer hygiene. B lost because a regional build
pointed at `prod` would get the head's content or nothing, which breaks the bit-identical promise
promotion exists to make.

Folded into: Scope, Design (the pointer-set section; the GC and retention sections), AC1, AC2,
AC7, AC8, AC10, AC20.

| Option | You get | It costs |
|---|---|---|
| **A. Mirror the whole pointer set** | Every name a client resolves on the leader resolves identically on the follower, environments included | The follower pins every snapshot the leader's pointers target, so a forgotten leader environment pointer costs storage on every follower too |
| **B. Mirror the default pointer only** | Smallest transfer; one position per repository | Environment names are absent or wrong on the follower, and promotion's bit-identical guarantee stops at the leader |

**Why this is yours:** it decides whether replication promises the leader's content or the
leader's whole client-facing name surface, and it multiplies pinned storage across followers.

### Resolved: detecting a divergent history (was Q9)

Raised and adopted in this pass: folding Q5 exposed that a takeover, or a leader restored from an
older backup, can produce two different snapshots under one number, and numbers alone would let a
follower apply across the fork.

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: each snapshot carries a
chained identity (a digest over its number, its delta's digest and its predecessor's identity),
the identity record outlives pruning, and a follower compares identities before applying.
Accepted cost: one retained identity row per completed write, forever, and a sibling amendment
to `data-model.md` to hold it. B lost because it makes a split brain silent, the failure shape
AC6 exists to forbid; C lost because takeover-minted epochs catch takeover forks only and miss a
leader restored from backup.

Folded into: Scope, Design (the identity section; the takeover and export sections), AC9, AC10,
AC16, AC17, Phase 1.

| Option | You get | It costs |
|---|---|---|
| **A. Chained per-snapshot identity, retained after pruning** | Any fork is detected at any distance, including after the forked content is pruned | An identity row per write kept forever, and a `data-model.md` amendment |
| **B. Snapshot numbers only; rely on fencing** | No new record | A split brain or a restored leader is applied silently, mixing two histories under one name |
| **C. Takeover-minted lineage epochs** | Small: one record per takeover | Misses forks no takeover created, such as a leader restored from an older backup |

**Why this is yours:** it trades a permanent per-write record against whether a DR mistake can
corrupt followers silently.

### Resolved: how freeze derives metadata (was Q10)

Raised and adopted in this pass: folding Q4 exposed that "copy cached content into a local
repository" leaves open whether the local repository's metadata is built by its handler or copied
from the cached upstream documents.

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: freeze is a publish
through the target repository's hosted ingest path, and its handler renders the local metadata.
Accepted cost: upstream-signed indexes are not preserved byte for byte - a frozen Debian mirror
serves a `Release` signed by `signing-service.md`'s write-path hook under the target repository's
key, so clients in the gap trust that key rather than the upstream's - and freeze waits for an
ingest hook at `format-handler-interface.md`'s re-open. B lost because an upstream index lists everything upstream offers while a freeze holds
only what was cached, so a verbatim copy advertises files the repository cannot serve, and
because it would put metadata into a local repository that its own handler never produced.

Folded into: Design (the freeze section), AC14, Phases 0 and 4.

| Option | You get | It costs |
|---|---|---|
| **A. Publish through the hosted ingest path; the handler renders metadata** | Frozen metadata lists exactly what is held, and every publish-path check applies | Upstream signatures on indexes are replaced by the instance's; needs an interface hook at the re-open |
| **B. Copy the cached upstream metadata documents verbatim** | Upstream-signed indexes survive intact | Indexes advertise uncached files that 404 in the gap, and a local repository serves metadata its handler never produced |

**Why this is yours:** it decides whose signature an air-gapped client trusts for frozen content,
and whether freeze waits on an interface re-open.

### Resolved: the HCP Vagrant deadline against freeze's sequencing (was Q11)

Raised and adopted in the 2026-09-28 reconciliation. `formats/vagrant.md` names freeze as the
second half of the only recipe that keeps HCP Vagrant content past 2026-12-31 (its resolved HCP
decision, was Q12 there), while freeze is Phase 4 of a spec at charter step 10, behind the
interface re-open's ingest hook. Something must be said about the gap, or the recipe is a promise
the schedule cannot keep.

**Adopted 2026-09-28 under the owner's standing delegation.** Option A: keep freeze where it is
and let a `read_only` remote carry the content across the gap. The recipe becomes three steps:
`immediate` sync before the deadline, then freeze the remote `read_only` so it neither
revalidates against a dead upstream nor evicts (`repository-lifecycle.md`'s read-only remote,
`proxy-cache.md` AC23), then freeze into a `local` whenever Phase 4 lands. Accepted cost: until
that day the content serves as a cache-only remote rather than as hosted content with generated
catalogs, and it cannot be exported or replicated (a `remote` is not a source). B lost because it
would move the ingest hook out of the re-open, which exists precisely so the pin grows on
evidence rather than on a date; C lost because a verbatim copy of the cached catalog is the
option the freeze-metadata decision (was Q10) rejected, and building it as a stopgap means two
freeze paths.

**Recommendation:** A. It keeps every settled decision and meets the dated need with a state
`repository-lifecycle.md` already defines.

Folded into: Design (the freeze section's dated-consumer paragraph). Consequence for
`formats/vagrant.md`: its recipe and AC21 gain the `read_only` step.

| Option | You get | It costs |
|---|---|---|
| **A. Keep freeze at step 10; a `read_only` remote carries the content** | No settled decision moves; the content survives on machinery that exists before Tier 1 | The content is a cache, not hosted, until freeze lands; no export or replication of it meanwhile |
| **B. Pull the ingest hook and freeze forward, before the re-open** | Hosted HCP content before the deadline | The pin grows on a date, not on evidence, which the re-open exists to prevent |
| **C. An interim verbatim-copy freeze** | Hosted content early with no interface change | The path the freeze-metadata decision rejected, built anyway, then replaced |

**Why this is yours:** it weighs a dated external commitment against the build order the charter
owns.

### Resolved: who re-signs at takeover, and when (was Q12, raised and adopted 2026-10-01)

**Adopted 2026-10-01 under the owner's standing delegation**, on Fable, in the gate review that
raised it. Option A: the takeover request re-signs. Its transaction ends the link and registers
the per-pointer and repository-scoped `signing.resign` schedules with their next run now, and
the same request then runs the repository's re-sign as one repository batch through the door's
standard document-only form, which `Renewable` passes once the link is `ended`, re-rendering
every pointer document under the follower's resolved keys and writing the schedules' next runs
from the renewed documents' expiry. Two steps rather than one transaction, because the door's
standard form evaluates `Renewable` before it opens a transaction and its on-a-transaction form
is the job runner's alone (`storage-and-gc.md` AC25); the alternative, a second waiving entry
point on the document-only form, would amend two planned architecture tests for one caller.
Accepted cost: the served bytes change at the moment of takeover (the documents' dates move
forward and the signatures are the follower's), so a client comparing the new leader against
the old sees a different envelope over identical content; a takeover of a repository with many
pointers does that much signing inside one operator request; and a resolved key that then
refuses to sign leaves a taken-over repository serving the old leader's documents, loudly (the
request fails naming the key, `SigningFailed` fires) and with the cadence already registered to
retry, since the fencing the operator performed cannot be undone by rolling the takeover back.
B lost because registering the schedules without re-signing leaves the old leader's documents
in place until their renewal fraction, which keeps the bytes comparable a little longer but
proves nothing about the keys until the cadence first fires, possibly days later and
unattended; C lost because it is the hole: with no write, no schedule, and the documents expire.

Raised by the Fable gate review. The takeover section said "the first write after takeover
regenerates and re-signs the repository's pointer documents", and `signing-service.md`'s cadence
derives each `signing.resign` schedule's next run from the stored documents' expiry, written in
the re-sign job's `Finish`. A linked follower has never re-signed, so it holds no schedule; a
taken-over repository that receives no write therefore serves the old leader's signed documents
with nothing to renew them, and a Debian `Valid-Until` or a Hackage `timestamp.json` lapses
with no alert before it. Disaster recovery is exactly the case in which nobody publishes for a
while.

**Recommendation:** A. It proves the keys by using them at the one moment an operator is
watching, and it leaves the repository in the state every other signed repository is in: a
schedule derived from documents it signed itself.

Folded into: Scope (the signed-documents bullet), Design (the takeover section), AC16 (the
cadence proceeding on a `read_only` taken-over repository), AC21 and its Test Plan rows (the
schedules registered in the ending transaction, the re-render in the request, the
failing-key case, a conformance case with the clock past the old documents' expiry), Phase 3.
Consequence for `signing-service.md` AC23 and `management-api.md`'s takeover row.

| Option | You get | It costs |
|---|---|---|
| **A. The takeover transaction re-signs and registers the schedules** | Keys proven by use at takeover; the cadence exists from the first second; no silent expiry | The envelope changes at takeover; a many-pointer takeover signs inside one request |
| **B. Register the schedules at takeover from the old documents' expiry; the cadence re-signs when due** | Bytes stay the old leader's until renewal; takeover is cheap | Keys proven only when the first cadence fires, unattended; a `kms` key reachable at takeover and not later fails days afterwards |
| **C. Leave it to the first write** | Nothing added to takeover | A repository nobody writes to expires with no schedule and no alert |

**Why this is yours:** it decides what a disaster-recovery takeover promises for a signed
repository that is read but not written, and it moves signing work into the takeover request.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-23 | d078c46 | first review: adversarial + constitution + cross-spec (data-model's delta/checkpoint representation and repository types, storage-and-gc's four mark roots and single-writer machinery, auth's missing instance identity) + go-spec-reviewer; claim verification vacuous pre-code (no `internal/replication/` exists) | Transfer unit corrected for the delta-plus-checkpoint representation (contiguous deltas vs checkpoint-based seed, reconstructibility on the follower), follower GC bound to all four roots and the shared reference-creation and intent machinery, remote repositories excluded as sources, follower retention clock and served-snapshot protection stated, archive contiguity/atomicity/idempotence specified; AC2 moved to fault injection and made consistent with AC3, AC5 hardened, AC7 extended to the fourth root and transfer interleavings, AC8-AC10 added; Q3-Q7 raised (virtual repositories, air-gapped proxied content, DR promotion, instance-to-instance auth, archive trust root); stays draft |
| 2026-09-26 | 2edd42c | folding owner answers to storage-and-gc Q10 and proxy-cache Q11 | Not a review, and this spec is only a consequential update: the decision's home is `storage-and-gc.md`. Context, the follower-GC bullet and AC7 carried from four mark roots to five. The fifth root does cover a follower: a replication pointer targets a snapshot exactly as an environment pointer does, so the follower's served snapshot and its reconstruction chain are exempt from the follower's own pruning while targeted, which turns the previously replication-local 'the served snapshot is never pruned' rule into an instance of the shared root, released when replication advances the pointer. Scoped explicitly to the follower's store: what a leader may prune while a follower is behind is Q1, which the root set does not answer and which stays open along with Q2-Q7. |
| 2026-09-26 | 4d1aeb1 | folding adopted recommendations under the standing delegation | Not a gate review. Adopted Q1 A (leader prunes consulting no follower; follower detects the gap from the leader's advertised retained ranges and re-seeds, fetching blobs by want-list so held blobs are never re-sent), Q2 A (read-only replicas, per-repository roles, mixed-role instances; options table written first, the question had none), Q3 A (virtual and remote sources refused; followers compose their own virtuals), Q4 B (freeze: one publish of cached content into a local repository, provenance not as `RemoteFile`, never contacts upstream), Q5 A (per-repository takeover command gated on an explicit fencing acknowledgement, numbering and identity continue), Q6 A (ordinary machine token, `pull` authorizes the replication read surface; derived: a pattern-narrowed `pull` does not), Q7 A (mandatory out-of-band manifest digest at import). Folding exposed three judgment calls, raised and adopted as Q8 A (the whole pointer set replicates, not only the head, which the spec's single-number tracking had silently assumed), Q9 A (chained per-snapshot identity retained past pruning, so a split brain or restored leader is detected rather than applied) and Q10 A (freeze publishes through the hosted ingest path and the handler renders metadata). Body rewritten through Context (build order deferred to the charter), Scope, every Design section (new: pointer set, identity, read-only, freeze, takeover, authentication; retention section rewritten to the adopted option), and Phases (Phase 0 sibling prerequisites; Phase 3 is now takeover, Phase 4 freeze). AC1, AC2, AC5-AC10 rewritten to assert the adopted behaviour (AC6 no longer an either-or); AC11-AC20 added, each with a Test Plan row, AC18 with two. Sibling amendments needed in `auth.md`, `data-model.md`, `format-handler-interface.md` and, text only, `storage-and-gc.md`; none made here. Stays draft. |
| 2026-09-26 | fe54272 | cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. From the charter fold: Context's claim that replication has no build-order step was stale; it now cites step 10, after Tier 1, not gated by the breadth verdict, with the charter's reason. From the harness and generic fold: this spec owns building the harness's `replication` provisioner, now Phase 1's first item and asserted through AC15, whose case declares its two instances network-isolated and offline. From the auth and interface fold: Phase 0 records the sibling amendments as landed (auth's replication-read widening; data-model's link, identity, freeze write kind and provenance, applied in the same reconciliation; the interface's reserved mount, now cited in the authentication section and asserted by AC18's architecture test), with the server-side ingest hook the one remaining prerequisite, pending at the interface re-open. From the replication fold's signing note: a frozen signed-index repository is re-signed by the shared signing and index service, and any future archive signing belongs there too. Freeze's metadata sentence updated now that `data-model.md` defines the write kind. |
| 2026-09-28 | 9f93794 | cross-spec reconciliation of the foundation authoring wave. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` targeting this file verified against the source spec's current text before applying. Already done from the old folds: charter step 10 placement, the `replication` provisioner (Phase 1, AC15), auth's `pull` widening. Applied: signing-service 5 (`Signature` and `PointerDocument` records travel with the pointer set, a linked follower serves verbatim and signs nothing, takeover refused unless every active key resolves; the two "future signing-service" sentences are now citations; AC1 extended, AC21 added); async-operations 8 (a new Design section: each link a `Schedule` enqueuing `replication.sync` with exclusivity key `link:{id}` and a checkpoint per completed snapshot, resume as the queue's rescue path, offline mode runs no sync; AC3 rewritten, AC23 added); repository-lifecycle 7 (a new Design section with the link's six-state table including terminal `ended` with reasons `takeover` and `deleted`, the updatable leader name, `failed` naming `not-found` on leader rename or deletion, `read_only` surviving takeover, `repository.Writable` with `ErrReplica` as the shared predicate and the applier's waiving entry point; AC11, AC12, AC16 rewritten, AC22 added); observability 13 (the four `replication_*` series, four alerts, six audit events and peer trace propagation, folded into AC10 with two new Test Plan rows); deployment 8 (a `replication.` key table: `sync_interval` 60s, `blob_concurrency` 8, no checkpoint-interval key; AC24); format-handler-interface reconciliation 1 (the reserved segment is the string `replication`, fixture pair `replication` in `register_test.go`; AC18 names it); Open item 23 (freeze's dated first consumer, the HCP Vagrant recipe, with Q11 raised and adopted: a `read_only` remote carries the content until Phase 4 lands). Phase 0 restated against the specs that now exist. 24 criteria, zero open questions, one new resolved question; stays draft pending a gate review. Consequences for other files reported to the queue. |
| 2026-09-28 | 6e6d503 | cross-spec reconciliation sweep of the foundation wave. Not a review | Not a review. Applied sweep 1 item 5 (AC16's and AC22's Test Plan rows share `internal/model/replication_link_test.go` with `data-model.md` AC31, verified against its current text) and, now that `management-api.md` carries them, cited the link, sync, re-seed, takeover, export and import routes and the `replica` problem type to that spec's endpoint table and AC33 in place of "a consequence for management-api.md's endpoint table". No question raised or adopted; `node scripts/check-spec.js` zero failures on this file. Stays draft pending a gate review. |
| 2026-10-01 | 4dac925 | Fable gate review: claim verification at HEAD, adversarial, constitution (one pass, interrupted mid-apply by a usage limit and resumed on Fable the same day with every partial edit re-judged; the Opus sweeps since the last Fable pass treated as unreviewed; go-spec-reviewer lens inline; claim verification against code vacuous, `internal/` is an empty directory) | A review. Every sibling citation verified at HEAD against the planned texts of `storage-and-gc.md` (five roots, the deletion-intent barrier, the door's three forms, AC25's `Renewable` with no waiving entry point and its on-a-transaction form used only inside `Finish`, AC10, AC15, AC18, AC23), `signing-service.md` (was-Q9, AC17, AC23, the `archive` purpose, the cadence schedule written in `Finish`, the repository batch), `management-api.md` (the six replication rows, `replica`, AC23's every-write-past-the-authorizer rule, AC33, was-Q18 and AC35), `observability.md` (the eight `replication.*` events with the re-seed's `objects`, AC12, AC14, AC20, was-Q4, the `replication` mount on the main listener), `deployment.md` (one binary with roles, `async.workers: 0`, the `replication.` row, the key recipe), `repository-lifecycle.md` (AC9, AC13, AC20, AC21, AC22, was-Q11, deletion step 3 and 12), `async-operations.md` (the `replication.sync` row, one `Schedule` per active link, not suspended by `read_only`, disabled offline and by deletion, AC27's secret set, cross-instance jobs excluded), `data-model.md` (the `Pointer` row's default pointer tracking the newest snapshot, AC23, AC29 to AC31, AC35, AC37, AC43, "Replication's records"), `auth.md` (was-Q11, AC17, AC24, "What `pull` also authorizes"), `format-handler-interface.md` AC11, `conformance-harness.md` (the `replication` key), `formats/vagrant.md` and `docs/internal/HANDOFF.md` (Q11's dated item is recorded there; nothing owed). Corrected: "the replication listener" is the `replication` mount on the main listener. Applied the queued consequences: `.sync` and `.reseed` audit events beside the four, in Design, "What a monitor sees" and AC10, the re-seed listing discarded snapshots in `objects`, the link `GET` request-log only; AC12 covers the document-only form refusing `ErrReplica`; the management routes refuse in `management-api.md`'s was-Q18 order (AC33, AC35), cited. Adversarial findings, each folded: (1) a running sync and a takeover could both write N+1, so every apply, the takeover, the re-seed and the deletion serialise on the link row, the link row is the position of record, `job.Checkpoint` is advisory, and the link's `Schedule` is disabled in the transaction that ends it so an `ended` link enqueues nothing (AC23, AC26); (2) the core-held `Retirement` set and `FileProvenance` did not travel, so a taken-over repository could reuse a retired coordinate; both are on the read surface and in the archive (AC25); (3) the want-list named only delta-referenced blobs, missing `PointerDocument` bodies and declared blob-digest lists, which the follower's fourth root marks through, and treated verification-failed blobs as held; (4) a leader whose head is below the follower's position had no identity to compare and the spec was silent: `diverged` at the leader's head (AC17), and linking a written local repository is the same check; (5) `repository-lifecycle.md` says freezing a replica "changes nothing" while its AC9, `storage-and-gc.md` AC25 and `async-operations.md`'s kinds test have the applier refused `ErrReadOnly`: the link reports `failed` `read-only` until thaw (AC22), reported as a sibling consequence; (6) import onto a repository with no active link was unstated: refused `validation`, the target must be a replica (AC9); (7) the link's position across a leader rollback: the position is the mirrored default pointer's target, which the leader's default pointer tracking the newest snapshot keeps pinned, and a rollback repoints an environment pointer without a snapshot, so the chain stays linear and the next write is one delta (AC20); (8) AC18's "the response an unauthorized caller receives" was ambiguous under the existence rule: a token that cannot read the repository gets the absent repository's response byte for byte, a pattern-narrowed `pull` holder `unauthorized`, a credential-less request the challenge; (9) AC12 asserted a virtual merge swap refused on a linked replica, a case that cannot arise since a replica is `local`; dropped. Raised and adopted Q12 (the takeover request re-signs and registers the cadence schedules; a linked follower holds none, so a taken-over repository nobody writes to would expire). Its first fold, written before the interruption, ran the re-sign inside the takeover transaction through the door's document-only form, which `storage-and-gc.md` AC25 rules out (the standard form evaluates `Renewable` before `BeginTx`, the on-a-transaction form is `Finish`'s alone): refolded as two steps in one request, the ending transaction registering the schedules and the request then re-signing through the standard document-only form, with the failing-key path stated and asserted (AC21). Constitution: both paths (freeze covers the proxied path, AC14 and AC15), the shared data model with no handler table, named enforcers for the three boundaries (AC12, AC18, `storage-and-gc.md` AC15's scan), CI economy untouched. 26 criteria each with a Test Plan row, zero open questions, `node scripts/check-spec.js` zero mechanical failures; draft -> planned. Sibling consequences reported to the queue. |
