---
status: draft
status_description: "Sweep 2026-09-28 at 6e6d503 (not a review): the ErrReplica-waiving entry point of the sole write-transaction constructor, imported by internal/replication alone (AC25); the was-Q11 segment digests cited as data-model's Blob row and AC43. Reconciled 2026-09-27 at 1b33a04 with the foundation authoring wave (not a review), still draft after the 2026-09-26 un-planning. What changed: the CAS read path verifies the digest while streaming on every read, aborting with an operator alert on a mismatch, with range reads verified through fixed-size segment digests (one question adopted under the standing delegation) and a read-path benchmark budget (AC21, AC22); an unfinished job naming a repository holds its grace open as an unexpired upload session does (AC23); the fourth root's reach widens to pointer documents, virtual merged documents and declared blob-digest lists (AC16); management operations and repository deletion are reference-ending paths, never deleters, with the pruner dropping a deleted repository's final snapshot and default pointer, `reclaim: now` as a pruning input and read_only suspending retention passes but not pruning (AC15, AC24); the sole write-transaction constructor calls repository.Writable and exposes the pre-commit hook (AC25); the sweep lock comes from internal/db/lock.LockSweep and the sweep, orphan scan and prune run as async job kinds (AC26); the consistency checker is `stackweaver-registry storage check --restore-dangling` over bucket versions (AC27); metric and alert names fixed with observability.md (AC28); the `gc.` key table (AC29); AC7's benchmark carries a `// gate:` comment. Every new behaviour has property or fault-injection coverage. A gate review must re-judge the spec before it returns to planned."
description: "Spec for the content-addressable blob store and its garbage collector, including the fault-injection testing that conformance structurally cannot provide."
author: michielvha
goal: "Give every format a single durable blob layer, and make blob GC provably safe under concurrent push and interrupted upload, because this is where a registry silently loses data."
priority: "critical"
issue: 3
created: 2026-09-21
covers:
  - "internal/storage/**"
---

# Plan: Content-addressable storage and GC

One blob layer, shared by every format, addressed only by digest. Plus the garbage collector,
which is the most dangerous component in the system.

## Context

Every format this project will implement reduces to the same primitive: immutable content blobs
plus mutable metadata pointing at them. Sharing one CAS across formats gives deduplication for
free, makes the proxy cache a natural extension rather than a parallel store, and means blob
durability is solved once.

**The reason this is a critical-priority spec is GC, not storage.** The charter names this as
the single most likely way the project eats data, and the reason is structural: the conformance
harness cannot see it. `docker push` returning 0 proves nothing about whether a concurrent GC
pass deleted a blob that push had just uploaded but not yet referenced. Every client-level test
can pass while the system is actively corrupting itself.

Known instances of this exact bug class in real registries: upload-then-reference races, GC
deleting blobs whose only reference is an in-flight manifest, and orphan accumulation from
interrupted chunked uploads that never get cleaned because the cleanup keys off a completed
upload record that was never written.

## Scope

**In scope**

- Content-addressable blob storage over S3-compatible object storage, keyed by digest.
- **Read-path digest verification on every CAS read.** The bytes served are hashed while they
  stream and a mismatch aborts the response with an operator alert, on every read of every
  format, because for the formats whose clients verify nothing (`artifact-verification.md`'s
  resolved serve-time decision, was its Q5, names conan, chef, luarocks, cpm and Carton and the
  editors) this is the only integrity check between the object store and the installer. Range
  reads are verified through fixed-size segment digests recorded at commit (the resolved
  range-read question below), and the whole path runs under a benchmark budget (AC21, AC22).
- Chunked/resumable upload support, since OCI requires it and large artifacts need it.
- Mark-and-sweep GC, fully settled: a repository-scoped, touch-refreshed grace period
  defaulting to hours, held open while any upload session in the repository is unexpired or
  any unfinished `Job` names the repository, a
  deletion-intent table as the write barrier, and five mark roots - published references,
  cached references, snapshots inside the retention window, CAS-backed metadata
  documents (current and snapshot-held, the current half reaching pointer documents, virtual
  merged documents and the blobs a document declares), and snapshots targeted by a `Pointer`,
  together with the checkpoint-and-delta chain that reconstructs them. The decisions and their
  accepted costs are recorded under Open Questions.
- Snapshot pruning at the retention boundary (default 30 days, per-repository override), and
  reporting how far back rollback reaches,
  since pruning is what bounds the snapshot root and the snapshot-held half of the
  metadata-document root. It does **not** bound the fifth root: a pointer-targeted snapshot
  is exempt while targeted, so retention bounds storage only for snapshots nothing points
  at (the resolved pointer-target question below carries that accepted cost). Because that
  cost was priced on the pin being visible and attributable, reporting extends to it: every
  pointer whose target has aged out of the window is reported as pinning it, through the API
  and as the `gc_pinned_out_of_window_snapshots` and `gc_pinned_out_of_window_bytes` gauges
  behind the `PinnedStorageOutOfWindow` alert (AC19, AC28). Pruning also takes two inputs
  from `repository-lifecycle.md`: a deleted repository's effective retention override
  (`reclaim: now` sets it to zero), and the pruner's duty to drop a deleted repository's final
  snapshot and default pointer and leave the tombstone in its own cycle (AC24).
- **The single door onto the write path.** One unexported constructor opens every write
  transaction; it calls `repository.Writable` before the transaction begins and exposes the
  pre-commit hook `data-model.md` defines, so writability and index regeneration are decided
  in one place for every format (AC25).
- Orphan cleanup for interrupted uploads.
- The sweep, the orphan scan and pruning as scheduled job kinds on `async-operations.md`'s
  queue, the sweep's advisory lock taken through `internal/db/lock.LockSweep`, and the `gc.`
  configuration keys (AC26, AC29).
- The consistency checker behind AC6, exposed as `stackweaver-registry storage check`, whose
  `--restore-dangling` mode restores a row's missing object from bucket versions (AC27).
- Fault injection and property tests covering the races above.
- Throughput benchmarks wired to a CI regression gate, including the read-path verification
  budget, each benchmark carrying the `// gate:` comment `scripts/bench-gate.sh` reads (AC7).

**Out of scope**

- Replication between instances, which now has its own spec (`replication.md`). The decisions
  it waited on - content addressing, the deletion-intent barrier, bounded snapshot retention -
  are settled here, and that spec builds on them.
- Encryption at rest beyond what the object store provides.
- Per-format metadata storage. That lives in PostgreSQL through the shared data model
  (`data-model.md`, issue #12); no handler owns a table. GC marks over that model's tables,
  so its schema is this spec's input, not its property.
- Repository lifecycle semantics (which states admit which writes, what deletion removes, what
  the tombstone keeps): `repository-lifecycle.md`. This spec consumes its `Writable` predicate
  and its two pruning inputs, and adds its operations to the property suite.
- The job runtime (claiming, leases, retries, cancellation): `async-operations.md`. This spec
  reads unfinished jobs as a grace input and registers three job kinds.
- The metrics mechanism, the alert rules file and the benchmark gate script:
  `observability.md`. This spec fixes the names of its own metrics and alerts and states its
  own budgets.
- Bucket versioning and the restore procedure: `deployment.md`. This spec supplies the checker
  that procedure runs and states that it relies on versions being there.
- Signature verification of any kind: `artifact-verification.md`. The read path verifies a
  digest, never a signature.

## Design

### Addressing

A blob is keyed by its digest and nothing else. There is no path, no name, no format namespace
in the key. Two formats uploading identical content store one blob. **Never key a blob by
anything but its digest** - this is a standing Go rule in `CLAUDE.md` because a single
convenience exception destroys deduplication and makes GC unsound.

Metadata, which is mutable and format-specific, lives in PostgreSQL and references blobs by
digest. The object store holds no mutable state.

AC2 (cross-format deduplication) forces one further constraint: the CAS key is a **single
canonical digest algorithm, computed server-side** (sha256, the OCI default; changing it is a
spec revision). If the key were whatever digest the client happened to send, identical content
uploaded as sha256 by one format and sha512 by another would store twice and AC2 would be
unsatisfiable. Format-level checksums (npm integrity, Maven sha1) are metadata, never keys.

### The read path verifies what it serves

A digest is a promise about bytes, and the object store is the one component in the system that
can break it without any row changing: a bit flip on disk, a bucket restore from the wrong
version, an operator's `aws s3 cp` into the prefix. Most clients would catch that themselves,
but `artifact-verification.md` established from captured traffic that several do not (conan,
chef, luarocks, cpm and Carton, the editors installing an extension; cpanm prints "Verified OK!"
after a bad signature), and its resolved serve-time decision (was its Q5) placed the only
integrity check those clients get here: **every CAS read verifies the blob's digest while
streaming and aborts on a mismatch.** The alternative it weighed, re-verifying signatures at
serve time, protects nothing a digest check does not, since every signature is over the digest.

- **Verification is on every read, not a sample and not a scrub.** The read path wraps the
  object stream in a hashing reader keyed on the canonical algorithm; the response is committed
  as complete only when the final hash equals the key. A mismatch aborts the response before the
  body is complete (the connection is closed without a terminating chunk or with a length the
  client can see was not met, so no client mistakes the partial body for the artifact),
  increments `storage_blob_digest_mismatches_total{format}` and raises `BlobDigestMismatch`
  through `observability.md`'s alert path. The mismatching object is never deleted or repaired
  by the read path: repair is `storage check --restore-dangling`'s and deletion is the sweep's
  (AC15), so a read stays a read. The `Blob` row is marked as failing verification so the
  operator can find every affected digest from the API rather than from the alert stream, and
  a later read that verifies clears the mark (AC21).
- **Range reads are verified through segment digests.** A range read cannot verify the whole
  digest without reading the whole object, and reading a five-gigabyte layer to serve its last
  megabyte to a resuming client is not acceptable. At commit, while the canonical digest is being
  computed, the same pass records a digest per fixed 4 MiB segment of the blob, stored beside
  the `Blob` row as metadata (never a key: the CAS key stays the single canonical digest, and
  the segment size is a constant whose change is a spec revision like the algorithm's). A range
  read fetches the whole segments covering the requested window, verifies each against its
  recorded digest, and emits only the window. The cost is at most two extra segments of egress
  per range read. The resolved range-read question below records the options that lost.
- **The budget is a CI gate, not a hope.** Hashing is at memory bandwidth on current hardware,
  but "fast" is not an exit code: `internal/storage/bench_test.go` benchmarks a verified full
  read and a verified tail range read against their unverified equivalents, and each carries the
  `// gate:` comment `scripts/bench-gate.sh` compares against the baseline (AC22, and AC7 for
  the mechanism).
- **Reads from in-flight state verify the same way.** A digest-addressed read that resolves
  through a repository's own in-flight upload records (`data-model.md`, "Reads from in-flight
  publish state") streams through the same hashing reader; there is no second read path.

### Upload lifecycle

An upload moves through: session created, chunks received, digest verified on completion, blob
committed, reference recorded. The dangerous window is between *blob committed* and *reference
recorded*, because during it the blob is unreferenced and GC-eligible while being entirely
legitimate.

The design must make that window non-lethal. The settled mechanism is a **repository-scoped
touch-refreshed grace period**: any write activity in a repository refreshes the grace on all
of that repository's unreferenced blobs, and the default is hours. A client actively pushing
never expires; a repository that goes quiet collects its abandoned blobs, and a freshly
committed blob survives the gap before its reference lands.

**An unexpired upload session holds its repository's grace open.** What an upload session is,
and how long it lives, is defined once in `data-model.md` ("Upload sessions and the upload
scope"), and this spec uses that definition rather than restating one: a session is exactly one
blob's upload into one repository, ended by commit or by expiry, and it expires after an idle
period with no continuation request or at an absolute cap from its opening, whichever comes
first (one hour idle and 24 hours absolute by default, both configurable instance-wide).
Continuation requests - a chunk, a status query, the final commit request - are write activity
in the session's repository and refresh its grace like any other write, and while any upload
session in the repository is unexpired that grace does not lapse at all. Without the hold, a
client paused inside the idle window with earlier layers already committed could return to find
those layers swept, which breaks the promise resumability makes. The hold ends when the last
open session in the repository commits or expires; from then on the repository's grace runs
from its last write activity like any other (AC20, and `data-model.md` AC27 from the model's
side).

**An unfinished job naming a repository holds its grace open the same way.** A deferred
management operation (`management-api.md`'s Galaxy-shaped import, a bulk operation past the
deferred threshold) commits its bytes to the CAS in the request and references them only when
its `Job` runs, minutes or a retry horizon later, on a repository nobody else may be writing to.
That is the committed-bytes-awaiting-their-reference shape the session hold was created for, and
`async-operations.md` adopted the same rule for it (its resolved grace-hold decision, was its Q4;
`data-model.md` "Jobs and schedules" carries the record): every `Job` may name a repository, the
sweep's grace computation reads unfinished jobs by repository exactly as it reads unexpired
sessions, and the job's terminal transition (`completed`, `failed` or `cancelled`) releases the
hold. It is a timing input to the grace clock, **not a mark root and not a pin**: no digest a job
will reference is protected individually, the repository's unreferenced blobs are simply not yet
expired, and the root set stays at five. The accepted cost is that a repository with a stuck
retrying job is uncollectable until the job fails, about forty minutes at `async-operations.md`'s
defaults, which is why that horizon is short. A repository's deletion cancels its pending jobs
and cooperatively cancels running ones; each hold stands until its job is terminal
(`repository-lifecycle.md`, "Deletion"), so a half-imported artifact's bytes are collected after
the job ends and never under it (AC23).

The scope is the repository rather than an upload session deliberately. **OCI has no push
session on the wire**: every blob commits in its own independent session and no push-session
identifier exists, so a session-scoped grace would let a client actively pushing layer nine
lose layer one. Repository scope is the only boundary under which the promise holds for
multi-blob pushes across independent wire sessions.

Two constraints the grace period does not remove:

- **The window is client-controlled and unbounded, and touch-refresh narrows the exceed path
  without removing it.** In OCI, every blob uploads and commits in its own session, and the
  manifest that references those blobs arrives whenever the client sends it - minutes later,
  or never. A repository idle past the grace window, with no unexpired upload session holding
  it open, still expires its unreferenced blobs, and that case must fail as an
  explicit, self-explanatory error telling the client to re-push, never as a silently missing
  blob (AC12). Recording a reference to a digest must therefore verify the blob still exists
  and fail retryably if it does not - a reference row pointing at a swept object is data loss
  discovered at pull time.
- **Orphan cleanup must be enumerable from a record written first.** The upload session record
  is written to PostgreSQL before any object-store upload (multipart initiate) begins. The
  known bug class named in Context - cleanup keyed off a completion record that was never
  written - is closed only by write-ahead ordering; an interrupted upload with no record is
  invisible to every cleanup pass except a raw store scan. The orphan scan honours the
  repository-scoped grace wherever a session record names the repository; raw object age
  governs only objects with no record. Because grace is repository-scoped, the orphan scan
  evaluates it per repository, not per session - a repository with recent write activity has
  none of its unreferenced blobs collected, which is the accepted cost of this scope.

### Garbage collection

GC deletes blobs no live metadata references. It must satisfy one invariant, stated as an
absolute:

> **GC never deletes a blob that is referenced, that is about to be referenced by an upload
> in progress, or that gains a reference while the sweep is running.**

"Referenced" means referenced from any of the five mark roots enumerated below, so the root set
and the invariant move together: a root the sweep does not mark is a blob the invariant does not
protect. Pruning inherits the same absoluteness through the fifth root - a snapshot a pointer
targets is never pruned - so a pointer's content set never becomes uncomputable.

The second clause is the hard half of uploads; a GC that only checks current references is
correct only if uploads are atomic with respect to it, and they are not. The third clause is
the hard half of everything else, and the original two-clause invariant was incomplete against
this spec's own AC2: a deduplication hit creates a **new reference to an old blob with no
upload at all**, so no grace period keyed to blob age covers it. The same shape recurs as an
OCI cross-repository mount, as cached content arriving on demand (`data-model.md`'s
`RemoteFile` path), and as a snapshot created mid-sweep referencing pre-existing blobs.
Concretely: repo A drops the last reference to blob B, the sweep marks, repo C dedup-hits B
during the sweep, the sweep deletes B because it was unreferenced at mark time and too old for
grace. Repo C now references nothing. The mechanism that closes this is the settled write barrier:
a **deletion-intent table**. The sweep records the digests it intends to delete, then deletes
in a second pass; every path that creates a reference checks the table and cancels any
standing intent for its digest. Three constraints make the table close the race rather than
merely narrow it:

- **Intent recording precedes a final reference re-check.** A reference created after the mark
  read but before the intent row lands sees no intent to cancel, so deleting on the strength
  of the mark alone reopens the race the table exists to close. The delete pass re-verifies,
  after the intent is visible, that the digest is still unreferenced. References created after
  that re-check see the intent and cancel it; references created before it are seen by it.
  The row delete is transactional with the intent's transition into its delete phase and
  proceeds only while the intent still stands uncancelled, so a cancellation and a deletion
  serialise in PostgreSQL rather than racing - anything else makes AC9's survival guarantee
  unimplementable. The intent row itself is removed only after the object delete completes,
  never with the metadata row: the commit gate below keys on the intent, and an intent
  removed at row-delete time would leave the gate nothing to hold during exactly the
  row-delete-to-object-delete window it exists to close (AC13). Cancellation is possible
  only before the delete-phase transition; after it, a commit takes the gate's wait-or-retry
  path.
- **The intent check is unconditional and transactional.** Reference insert plus intent cancel
  happen in one PostgreSQL transaction, and the check runs on every reference write at all
  times, not only while a sweep runs, because a crashed sweep's intents may stand for
  arbitrary time. The check lives inside the shared reference-creation call, and an
  architecture test asserts no reference is written by any other route (AC10).
- **Intents are cleaned up, and a rerun discards them.** A cancelled or completed intent row
  is removed, and a sweep rerun after a crash discards standing intents and re-derives them
  from a fresh mark. That is safe because a half-finished deletion (row deleted, object still
  present) is completed by the orphan scan, never by replaying old intents.

Touch-refreshed grace must also defeat a standing intent: a repository whose grace refreshed
after the sweep marked one of its blobs would otherwise have that blob deleted while a client
is actively pushing to it, breaking the settled promise of the grace decision. The delete pass
therefore re-verifies grace, against the refreshed value, at delete time.

**The intent is also an exclusive commit gate on its digest.** Once the delete pass begins
acting on an intent, a commit of that same digest must wait for, or fail retryably until, the
object delete completes, and then upload the bytes fresh. This is what closes the window
between the sweep's row delete and its object delete: cancellation can only protect a digest
while its metadata row exists, and once that row is gone the race moves into an object store
with no transactions. The uploader yields rather than the sweep, so the store never sees a
PutObject and a DeleteObject in flight on one key.

The cost is a rare stall or retry when re-uploading content that was just swept, and a
wait-or-retry state on the commit path. That is the price of the only option that closes the
window without generation-suffixed keys, which digest-only addressing forbids.

Sweep mechanics carry these fixed constraints, each of which the fault-injection suite must
exercise:

- **At most one sweep runs at a time**, enforced by a PostgreSQL advisory lock taken through
  `internal/db/lock.LockSweep`, the one constant block `deployment.md` gives the advisory-lock
  key space so no two subsystems pick colliding integers; `internal/storage` never calls
  `pg_advisory_lock` or its variants itself, and an architecture test holds that (AC26). The
  sweep, the orphan scan and pruning are enqueued as the `storage.sweep`, `storage.orphan_scan`
  and `storage.prune` job kinds by `async-operations.md`'s scheduler, each with the kind as its
  exclusivity key, so the scheduler is the first guard against two sweeps and the lock is the
  second; the mechanics below do not change because of who enqueues them. A
  sweep interrupted by a crash must be safe to rerun immediately from the start: mark state
  and standing intents are disposable, performed deletion is not.
- **Delete the metadata row before the object, never the reverse.** A crash after object-delete
  but before row-delete leaves a dangling row the dedup check trusts: the next upload of that
  content is skipped as already stored, and the pull 404s later. Row first, a crash leaves an
  unreferenced object the orphan scan collects - a leak, not a loss.
- **Re-upload of a just-swept digest races the object delete.** Rows delete transactionally and
  the object-store delete follows; an upload of the same content committing between the two can
  have its PutObject overtaken by the sweep's DeleteObject on the same key, losing the new copy
  while its row survives. Intent cancellation covers the mark race, but by this point the
  metadata row is gone and the race has moved into the object store, which has no transactions.
  **The intent therefore acts as an exclusive commit gate on its digest for the whole delete
  phase**: the uploader waits or fails retryably until the object delete completes, so the store
  never sees a PutObject and a DeleteObject in flight on one key (AC13).
- **The sweep's delete pass and the orphan scan are the only object deleters.** The commit
  gate's guarantee that the store never sees a PutObject and a DeleteObject in flight on one
  key holds only while every object delete flows through the intent machinery, so this is a
  boundary needing a named mechanical enforcer: an architecture test asserts no other code
  path deletes from the blob store (AC15). `proxy-cache.md` settled its eviction mechanics on
  2026-09-26 in favour of this single path: eviction ends the cached reference only and
  deletes no object, so it is **not** a second deletion path and needs no deletion safety
  machinery of its own. The 2026-09-27 foundation specs added two more classes of path that
  look like deletion and are not: **management operations** (yank, unpublish, version and
  collection delete, `management-api.md`'s resolved repository-deletion decision, was its Q7)
  are snapshot-creating writes that end references, and **repository deletion**
  (`repository-lifecycle.md`, "Deletion") ends every head or cached reference as one write,
  releases the repository's pointers through the path AC18 polices, and may set the deleted
  repository's effective retention window to zero (`reclaim: now`) as an input to pruning;
  every byte still returns through the pruner and the sweep. The AC15 scan is therefore
  **module-wide**, and `internal/repository` and `internal/manage` are named in it so a
  "reclaim now" that reached for the store directly would fail the build. AC15's architecture
  test is what holds all three classes to that, and a later move to direct deletion from any
  of them would be a revision of this constraint, never a silent exception.
- **Clocks and listings are not trustworthy inputs.** Grace comparisons mix object-store
  timestamps with PostgreSQL time; skew must be assumed and dwarfed by the grace period. The
  orphan scan (store listing versus rows) runs against "S3-compatible" stores whose LIST
  consistency varies, so it too applies the grace period to object age before touching
  anything.
- **Mark roots come from the shared data model, and there are five**: published `File`
  references, cached (`RemoteFile`-originated) references, snapshots inside the retention
  window, **CAS-backed metadata documents**, and **snapshots targeted by a `Pointer`**. A
  sweep marking from fewer than all five deletes live content.

  The fourth arrived when `data-model.md` settled that metadata documents are stored inline
  below a size threshold and as digest-referenced CAS blobs above it. A Debian signed `Release`
  index is therefore a blob that **no `File` row references**, and a sweep marking only from the
  first three roots would collect it while it is being served. The root persists while the
  **current** repository, package or version document row of any repository references that
  digest, or while any such document at a retained snapshot does. The current-document half
  cannot be dropped in favour of the snapshot-held half: a proxied repository creates no
  snapshots at all (`data-model.md`, resolved snapshots-in-proxied-repositories question), so
  its cached upstream index above the threshold - the motivating Debian case exactly - is
  protected by nothing else. For the write barrier this means a document write that stores a
  CAS digest is a reference creation like any other: it goes through the shared
  reference-creation call (AC10), cancels standing intents, and the delete pass's re-check
  counts document digests, current and snapshot-held, in what it treats as referenced.

  **The current-document half reaches three things that are not level documents**, all added
  2026-09-27 as an extension of this root's reach and not as a sixth root (`data-model.md`,
  "Records that are not mark roots", states the same from the model's side). First, a
  **`PointerDocument`**: apt ignores a `Release` older than the one it holds and TUF clients
  fail hard on a lower `version`, so the signed envelope a pointer serves is re-rendered on
  every pointer move and lives outside snapshot content, on the pointer (`data-model.md`,
  "Freshness scoped to the pointer"). When CAS-backed its blob is referenced by no `File` row
  and by no snapshot; it is live while the record exists, and the record is dropped with its
  pointer or at tombstone time. Second, a **virtual repository's merged documents**
  (`signing-service.md`, "Virtual merges"): a virtual has no content snapshots, so its
  merged index above the threshold is a current document protected only here, exactly as a
  proxied repository's cached index is, and the atomic swap that replaces a merged set ends
  the old digest's reference the way supersession does. Third, **a document's declared
  blob-digest list**: a document that consists of several blobs (Hackage's append-only index,
  one gzip member per write; CPAN's `CHECKSUMS` per author directory) declares the digests of
  its parts in the document, and the root marks through the declared list, so a part is live
  while any current or retained document declares it and collectable once none does. All three
  are reference creations for the barrier: producing a pointer document, swapping a merged
  set and appending a declared segment each go through the shared reference-creation call
  (AC10), and the delete pass's re-check counts them (AC16; `data-model.md` AC34 proves the
  non-root half, that a blob mentioned only by a dropped pointer document or an undeclared
  segment is collected).

  **The fifth root is a snapshot that any `Pointer` targets**, plus the checkpoint and the
  deltas required to reconstruct it. All of it is unprunable while the pointer targets it,
  however far outside the retention window it has aged, and the blobs its content set
  references are marked live from it exactly as from a snapshot inside the window. The reason
  is that every name-addressed read resolves through a pointer (`data-model.md`): a `prod`
  environment promoted once and untouched for a quarter, or a repository that simply stops
  publishing for 31 days, would otherwise have the snapshot it serves pruned out from under
  it and resolve to a content set that can no longer be computed - live serving broken with no
  delete, no rollback and no operator action anywhere in sight. A follower's replication
  pointer (`replication.md`) is an instance of the same root and protected by it for the same
  reason. The root ends when the pointer stops targeting that snapshot: a promotion or
  rollback repoints it, or the pointer itself is deleted, and the snapshot then falls back
  under the retention window like any other - prunable immediately if it has already aged out.
  A pointer-pinned snapshot's blobs are therefore released by a repoint rather than by a
  delete, which is why the property suite below has to generate repoints: a root that can be
  created and never released is storage that is unreclaimable in practice.

  Against the write barrier the fifth root is unlike the other four: a repoint writes no
  reference row and touches no digest, so it cannot flow through the shared reference-creation
  call or cancel standing intents digest by digest. Two mechanisms close that gap, and both
  are load-bearing. First, a repoint can only land on a snapshot whose blobs the current mark
  already treats as live: `data-model.md` AC23 refuses repointing onto an out-of-window
  snapshot nothing targets, and an in-window or already-targeted snapshot is marked by the
  third or fifth root. Second, the delete pass's re-check counts the fifth root in what it
  treats as referenced - a digest is referenced while any pointer-targeted snapshot's content
  set, computed through its checkpoint-and-delta chain, includes it - exactly as it already
  counts document digests for the fourth. And because that AC23 refusal and pruning's own
  targeted check are both check-then-act reads of pointer state, they serialise with pointer
  writes in PostgreSQL just as intent cancellation serialises with the delete phase: a repoint
  commits only while its target still survives pruning, and a prune drops a snapshot only
  while it is still untargeted at the drop itself. Anything looser lets two pointers trading
  places over an aged snapshot slip a prune between the refusal's read and the repoint's
  write, landing the pointer on a snapshot whose reconstruction chain is already gone (AC18).

  The accepted cost of this root was priced on the pin being visible: what made
  retention-no-longer-bounds-storage acceptable was that the failure mode is pinned storage
  attributable to a named pointer, and that attribution is a reporting duty, not a hope. The
  API therefore reports every pointer whose target snapshot is outside its repository's
  effective retention window - the pointer, its target and how far past the window the target
  has aged - beside the rollback-reach reporting already in Scope, so a forgotten environment
  pointer is found from the API rather than from storage growth (AC19).

  Each root class has a defined end of life - a
  delete removes a published reference, LRU eviction under the per-repository quota ends a
  cached one (`proxy-cache.md`, resolved cache-eviction question) without deleting anything
  itself, so that blob waits for the next sweep, pruning at the
  retention boundary ends an untargeted snapshot, a repoint or a pointer deletion ends a
  pointer-target root, and a metadata-document root ends when a newer revision
  supersedes the digest (or the document shrinks back below the threshold) and no retained
  snapshot still holds it - and hosted deletes reclaim space only through that
  pruning, on the schedule the retention default sets: **30 days, configurable per repository**,
  and only for snapshots no pointer targets.
  Pruning obeys the reconstructibility constraint `data-model.md` places on the delta
  representation: a checkpoint or delta is dropped only while no snapshot that survives
  pruning - inside the retention window, or targeted by a pointer - depends on
  it, because a mark root whose content set can no longer be computed makes the sweep unsound.

  **Pruning takes two inputs from the repository lifecycle and owes it one duty**
  (`repository-lifecycle.md`, "Deletion" and "Every path against the deletion-intent
  barrier"). The first input is the **effective retention override**: a deletion may set a
  deleted repository's window to zero (`reclaim: now`), and the pruner reads the override in
  place of the configured window for that repository, so the next cycle drops every untargeted
  snapshot it has; without the override the configured window applies and a mistaken deletion
  keeps its recovery horizon. Nothing about the drop changes: it is the same check-then-act
  prune under the same serialisation, and every byte returns through the sweep. The second
  input is **`read_only`**: a frozen repository accepts no completed write, so its retention
  passes (`generic.md`'s `retention.pass` kind, which would produce snapshots) are suspended,
  while pruning of its already-untargeted snapshots and the sweep continue unchanged, because
  neither is a write and a freeze that stopped reclamation would be option C of the pointer
  decision in another coat. The duty is the **tombstone**: deleting a `local` ends with the
  default pointer on a final empty checkpoint snapshot (`data-model.md` AC38), which the fifth
  root protects like any targeted snapshot. When every content snapshot of the deleted
  repository has been pruned, the pruner, in its own cycle and under its lock, drops that final
  snapshot and the default pointer together, deletes the `Package` rows and the other records
  `repository-lifecycle.md` lists as dropped at tombstone time, and leaves the `Repository` row
  as the never-removed tombstone. For a `remote` or `virtual` the deletion transaction itself
  drops the only snapshot with the pointer, and the pruner has nothing to do but the tombstone
  cleanup. The order is fixed so the fifth root's invariant holds to the last byte: the default
  pointer is deleted in the same transaction as the snapshot it targets, never before it, and
  a sweep interleaved anywhere in the sequence marks either the whole content set or nothing,
  with no state in which a pointer targets a pruned snapshot (AC24).
  The root classes are the shared data model's to enumerate, and that list is live:
  `data-model.md`'s resolution on CAS-backed metadata documents added the fourth root above,
  while its resolution that proxied repositories create no snapshots bounded the third rather
  than adding one, and the owner's 2026-09-26 answer on pointer targets added the fifth, whose
  amendment of the enumeration lands in `data-model.md` because that spec owns it.
  `proxy-cache.md`'s eviction mechanics, settled the same day, changed the set's shape rather
  than its membership: eviction ends the cached reference only and the sweep reclaims the blob,
  so the second root's lifetime ends at eviction while the blob itself waits for the next
  sweep, and eviction is **not** a second deletion path. `replication.md`
  bears on the set twice: on a follower, replicated snapshots and their transferred blobs are
  consumers of the existing machinery - transfer commits and snapshot-range references flow
  through the shared reference-creation call and the intent gate like any other, which its AC7
  asserts against this spec's property suite - and on a leader it adds nothing: the resolved
  retention-gap question in `replication.md` (was Q1, adopted 2026-09-26) chose follower-side
  gap detection and re-seed, so a leader prunes on its own schedule consulting no follower
  position, no follower-position pin exists, and the root set stays at five. `supply-chain-policy.md`
  adds no root, and that is deliberate rather than an omission: scan results and policy
  decisions reference digests as audit provenance that must **outlive** the artifact (a refusal
  stays explainable after the blob is gone), so they never mark a blob live and the sweep
  tolerates them dangling - a policy record that pinned its blob would make refused malware
  uncollectable forever. **Any resolution
  changing this set amends these mark roots as a revision requiring re-review, never silently** -
  which is the mechanism that caught the fourth root, and then the fifth. The 2026-09-27
  foundation wave tested it again and added nothing: `async-operations.md`'s job-held grace is a
  timing input, `repository-lifecycle.md`'s deletion and `reclaim: now` are reference ends and a
  pruning input, and `signing-service.md`'s pointer documents, merged documents and declared
  blob lists widen the fourth root's reach. Five roots, and every new record in
  `data-model.md`'s non-root table tolerates a dangling digest by design.

### The write transaction has one door

Handlers receive raw `*http.Request`, so the compiler holds none of the write path's
invariants; they hold only if every completed logical write passes through one place. That place
is **the sole write-transaction constructor in `internal/storage`**, unexported, so a caller that
tries to open a write transaction by any other route fails compilation rather than review. Three
things happen there and nowhere else:

- **Writability is checked before the transaction opens.** The constructor calls
  `repository.Writable(ctx, id)` (`repository-lifecycle.md`, "The state machine", AC9) and
  returns its typed refusal (`ErrReadOnly`, `ErrReplica`, `ErrDeleted`) without opening
  anything. Every completed write consults it this way - a client publish, a hosted delete, a
  metadata-only mutation, a management operation, a retention pass, a replication freeze, and
  every pointer create, repoint and deletion - and `replication.md`'s earlier architecture test
  that the write path refuses a repository with an active link generalises into this one check
  rather than standing beside it. Cache materialisation is not a completed write and does not
  pass through the door. Repository deletion is the one write the predicate does not gate
  (it is the transition out of every state) and it says so at the door explicitly, as a named
  exemption the architecture test knows, never as a second constructor. The replication
  applier is the one caller allowed past `ErrReplica`, and only past that error: the same
  constructor exposes a second entry point that waives `ErrReplica` alone (a replica that is
  also `read_only` or `deleted` refuses the applier too), imported by `internal/replication` and
  by nothing else, which `internal/storage/arch_test.go` asserts (`replication.md` AC12,
  `repository-lifecycle.md` AC9); every other caller renders `ErrReplica` as the `405` `replica`
  problem `management-api.md`'s closed list fixes.
- **The pre-commit hook runs after the handler's changes and before commit, in the same
  transaction.** `data-model.md` ("Snapshots, pointers and what counts as a write", AC37)
  defines the hook and `signing-service.md` consumes it to regenerate a format's served index so
  the index and the content it describes land in one snapshot ("The write path dispatches; the
  handler cannot forget"). The constructor is where it is invoked: after the handler's row
  changes, with the snapshot's content set visible to the hook, before the snapshot is sealed
  and the default pointer advances. **A failing hook commits nothing** - not the handler's
  rows, not the snapshot, not the pointer move - and the CAS blobs the handler committed before
  the transaction are left as grace-protected unreferenced bytes for the sweep, which is the
  same shape as any refused publish (AC3). The hook is a seam of the write path, not a handler
  method, so the pinned method set is untouched.
- **Reference creation inside the transaction is the shared call** (AC10), so the intent check
  is unconditional here as everywhere.

The architecture test in `internal/storage/arch_test.go` asserts all of it: the constructor is
the only function that opens a write transaction, it calls `Writable` before `BeginTx`, it runs
the registered hook between the handler's changes and `Commit`, and no package other than
`internal/storage` reaches the transaction type's constructor (AC25). This is the named
mechanical enforcer the constitution requires for a shared concern; a door enforced by review is
not a door.

### Scheduling, locking and configuration

The sweep, the orphan scan and pruning do not run on goroutines and tickers of their own. They
are three job kinds registered with `async-operations.md`'s runner - `storage.sweep`,
`storage.orphan_scan` and `storage.prune` - each enqueued by a `Schedule` at the cadence below
with the kind as its exclusivity key, so one runs at a time across every process, an outage
yields one catch-up job rather than one per missed tick, and an operator can pause a kind
through the admin routes that spec provides. The sweep additionally holds the advisory lock
`internal/db/lock.LockSweep` for its whole run, because the exclusivity key is a queue guarantee
and the lock is a database one; a sweep that cannot take the lock ends without acting, and the
next scheduled job tries again. A rerun after a crash starts from the mark, as the sweep
mechanics above require, whatever the queue's rescue path did with the job.

The keys, in the shape `deployment.md`'s schema and `scripts/check-config-keys.js` read (AC29):

| Key | Default | Meaning |
|---|---|---|
| `gc.grace` | `6h` | The repository-scoped, touch-refreshed grace period: how long after a repository's last write activity its unreferenced blobs stay protected, with the hold for unexpired sessions and unfinished jobs on top |
| `gc.sweep_interval` | `1h` | How often the `storage.sweep` job is enqueued (mark, intent, re-check, delete) |
| `gc.prune_interval` | `1h` | The interval between `storage.prune` jobs (retention-boundary pruning, the pin report refresh, tombstone cleanup) |
| `gc.orphan_scan_interval` | `24h` | The period of the `storage.orphan_scan` schedule (store listing against rows, object age under grace) |
| `gc.snapshot_retention` | `720h` (30 days) | The instance default for the snapshot retention window; a repository's own setting overrides it, and a deletion's `reclaim: now` sets the effective window to zero |
| `gc.intent_gate_wait` | `30s` | How long a commit of a digest whose intent is in its delete phase waits before failing retryably (AC13) |

The segment size for range verification (4 MiB) and the canonical digest algorithm are constants,
not keys: both change the stored form of every blob, so either change is a spec revision, never a
deployment's choice.

### Observability

`observability.md` owns the mechanism (the recorder, the catalogue, the alert rules file, the
benchmark gate); this spec fixes the names, so a dashboard and an alert written against them do
not drift when the code lands (AC28). The sweep exposes `gc_sweep_state{state}` as a one-hot
gauge over `idle`, `mark`, `intent`, `delete`, `prune` and `orphan_scan`,
`gc_sweep_duration_seconds{state}` per phase, `gc_last_sweep_completed_timestamp_seconds`
(behind `GCSweepStale`, which fires at twice `gc.sweep_interval`), and the counters
`gc_blobs_deleted_total`, `gc_bytes_reclaimed_total`, `gc_snapshots_pruned_total`,
`gc_deletion_intents_recorded_total` and `gc_intents_cancelled_by_reference_total` - the last
being AC9's race observed in production - with `gc_deletion_intents_pending` as a gauge. The
pin report of AC19 is also exported as `gc_pinned_out_of_window_snapshots{repository}` and
`gc_pinned_out_of_window_bytes` (registry-wide, because attribution of shared blobs is not
additive), behind `PinnedStorageOutOfWindow`, which fires when the count has been above zero for
a day. The read path exports `storage_blob_digest_mismatches_total{format}` behind
`BlobDigestMismatch`, and orphan cleanup `storage_upload_sessions_expired_total{format}` and
`storage_upload_orphans_removed_total{format}`. Every one of these is asserted through
`telemetry.NewTestRecorder` in `internal/storage/gc_metrics_test.go`, the file `observability.md`
AC6 names for this package.

### The consistency checker

AC6 demands that consistency after a crash is asserted by a checker comparing references, blob
rows and objects, not by the absence of errors. That checker is not a test helper; it is the
subcommand `stackweaver-registry storage check`, so the same code answers "is this store
consistent" in the fault-injection suite and on an operator's terminal after a restore
(`deployment.md`, "Backup and restore", exposes it as the post-restore acceptance test). It
reports three classes: **orphans** (objects with no row, which the orphan scan will collect
after grace and which the checker only counts), **dangling rows** (rows whose object is missing,
which is data loss in progress: the dedup check trusts the row and the next pull 404s), and
**digest mismatches** (objects whose bytes do not hash to their key, found by a full scan when
`--verify` is passed, otherwise reported from the read path's marks). A clean store reports zero
dangling rows and zero mismatches, and the checker exits non-zero otherwise.

`--restore-dangling` is the repair mode for the one class that is loss rather than leak. A
dangling row exists in exactly one legitimate way: a database restored to time `T` against a
bucket the sweep kept deleting from until `T'`. The row is truth and the object is gone, and it
is recoverable **only because `deployment.md` makes bucket versioning (or an equivalent
soft-delete window at least as long as the database backup retention) a deployment requirement**
(its resolved bucket-versioning decision, was its Q10). With versioning present, the checker
restores each dangling row's object from its latest non-current version, verifies the restored
bytes against the key before declaring the row healed, and re-reports; without versioning it
reports the rows as unrecoverable and exits non-zero rather than pretending. Restore is the
checker's only write to the store and it is a `PutObject` of bytes that hash to the key, never
a delete, so AC15's single-deleter boundary is untouched (AC27).

### Testing what conformance cannot see

This is the part of the spec that exists because the harness is blind here. Required:

- **Property tests**: for randomised interleavings of push, pull, delete, eviction, pruning
  and GC, the invariant above holds. The operation set must include re-push of already-stored
  content (a dedup hit, the new-reference-to-old-blob case), a commit of a digest under an
  active deletion intent (without which the intent gate is never exercised), cache arrival via
  `on_demand` (the second reference class), a metadata document crossing the inline/CAS size
  threshold **in both directions** plus supersession of a CAS-backed document by a new revision
  (without the upward crossing the fourth mark root is never exercised, and without
  supersession and the downward crossing that root's death - a reference ending with no delete,
  eviction or pruning involved - is never raced), snapshot-creating writes,
  **pointer repointing in both directions** - a pointer moved onto a snapshot, which pins that
  snapshot and its reconstruction chain as the fifth root, and a pointer moved away from one (or
  deleted), which is the only thing that releases that root, so a generator without it exercises
  a root that can be born and never dies and leaves pointer-pinned storage unreclaimable in
  practice -
  cache eviction under the
  per-repository quota (which ends a cached reference and deletes no object), snapshot pruning at
  the retention boundary, repository grace refresh, an **upload session held open inside its
  idle window** - continued by chunk or status requests while the sweep runs, with earlier
  blobs of the same repository committed and unreferenced - and session abandonment, a session
  left to expire by its idle period or its absolute cap. Without the open session the grace
  hold is never exercised and a paused resumable upload is never raced against the sweep;
  without abandonment the hold is never released. The same pair exists for jobs: a **queued or
  retrying job naming a repository** whose bytes are committed and unreferenced while the sweep
  runs, and its **terminal transition** (`completed` with the referencing write, `failed`, or
  `cancelled` by a repository deletion), without which the job hold is a root that can be born
  and never die (AC23). The **lifecycle operations** of `repository-lifecycle.md` are in the
  set too, interleaved with publishes, the sweep and pruning: create (the initial checkpoint is
  a CAS write and the default pointer lands on it), delete of a `local` with and without
  `reclaim: now`, delete of a `remote`, detach of a virtual member, freeze and thaw, and rename,
  because the deletion sequence moves pointers and ends references in one transaction and the
  tombstone drop pairs a pointer delete with a snapshot drop, and neither interleaving is
  reached by any other operation (AC24; its AC17 asserts the same from the lifecycle side). The
  fourth root's widened reach needs three more: **producing a CAS-backed pointer document** on
  a repoint and dropping it with its pointer, **appending a declared segment** to a multi-blob
  document and superseding a document so a segment becomes undeclared, and **swapping a virtual
  repository's merged document set**, each of which is a reference birth and death that no
  `File` row and no snapshot mediates (AC16). A generator limited to fresh-content pushes cannot reach the deadliest
  race, and one that can create references but never end them - no eviction, no pruning, no
  expiry - can never race a reference's death against another's birth; both pass vacuously.
  Two more reachability conditions, for the same reason: the generator must operate over **at
  least two repositories with overlapping content and independently controllable activity**,
  because repository-scoped grace means a single always-active repository can never expire
  anything and the cross-repository dedup race (repo A goes quiet and expires, repo C
  dedup-hits mid-sweep) needs both a quiet and an active repository to exist; and the suite
  runs on an **injected clock**, because grace defaults to hours and retention to days, so
  wall-clock time can never schedule a grace lapse or a retention-boundary prune inside a test.
  The clock must also be able to age an upload session past its idle period and its absolute
  cap, or neither session expiry nor the release of the grace hold is ever reached.
  The clock must be able to age a *pointer-targeted* snapshot past the retention window too, or
  the fifth root's exemption is never distinguishable from the third root's protection and both
  ACs covering it pass vacuously.
  The sweep's internal phases (mark, intent record, re-check, row delete, object delete) must
  be schedulable as first-class interleaving points, or the intent-window races stay
  unreachable - and so must pruning's two (the targeted-and-retention check, then the drop),
  or the repoint-versus-prune race can never be generated and the serialisation rule above is
  asserted by nothing. One further reachability condition: generated histories must span at
  least one checkpoint interval, so that a targeted snapshot can depend on deltas and
  checkpoints that pruning would otherwise drop - against a history shorter than the
  interval nothing ever threatens a reconstruction chain, and AC17's chain-survival clause
  passes vacuously.
- **Fault injection**: kill the server mid-upload, mid-commit and mid-GC, at each stage
  boundary - for GC that includes after mark, between intent recording and the delete pass,
  and between a row delete and its object delete; on restart the system is consistent and no
  referenced blob is missing, asserted by `storage check`. Three more injections the 2026-09-27
  wave added: **alter an object under its key** (flip a byte, truncate, replace with another
  blob's bytes) and read it whole and by range, which is the only way to reach the read path's
  abort (AC21); **fail the pre-commit hook** after the handler's changes and assert nothing of
  the write is visible afterwards (AC25); and **delete an object behind a live row** to
  manufacture the dangling state `--restore-dangling` repairs, against a versioned store and
  against an unversioned one (AC27).
- **Concurrency**: N concurrent pushes of overlapping blob sets, with GC running throughout.

A client-level conformance run is **not** evidence for any of these criteria, and a review that
accepts one as evidence has missed the point of the spec.

## Acceptance Criteria

- [ ] AC1: A blob is retrievable by digest and only by digest; no API accepts a name or path as
      a blob key.
- [ ] AC2: Uploading identical content twice through two different formats results in exactly
      one stored object.
- [ ] AC3: A chunked upload interrupted at any stage boundary leaves no blob that GC will later
      treat as live, and every orphan it leaves (including one whose session record write was
      itself interrupted) is collected within one full cleanup cycle once the session has
      expired under `data-model.md`'s upload-session lifetime (its idle period or its absolute
      cap, one hour and 24 hours by default) and the repository-scoped grace has then lapsed;
      no orphan is collected while its session, or any other session in its repository, is
      unexpired, or while any unfinished job names its repository.
- [ ] AC4: GC never deletes a referenced blob, under randomised concurrent
      push/pull/delete/eviction/pruning/GC interleavings, proven by a property test.
- [ ] AC5: GC never deletes a blob belonging to an upload in progress, proven by a fault-injection
      test that runs GC during the commit-to-reference window specifically.
- [ ] AC6: Killing the process at any stage boundary (including between intent recording and
      the delete pass, and between a sweep's row delete and its object delete) leaves a store in which no referenced digest is missing from the
      object store and all partial state is collected or completed by the next cleanup cycle;
      consistency is asserted by a checker comparing references, blob rows and objects, not by
      the absence of errors, and that checker is the same code as
      `stackweaver-registry storage check` (AC27).
- [ ] AC7: Blob upload and download throughput are benchmarked in
      `internal/storage/bench_test.go`, each benchmark carries a `// gate: <metric> <threshold>`
      comment naming its budget, and `scripts/bench-gate.sh` (`observability.md` AC24, AC25)
      fails the `main` build on a regression beyond it against the checked-in baseline.
- [ ] AC8: GC treats a blob referenced only by cached content (arrived `on_demand`, no
      published reference) as live, and treats it as collectable once LRU eviction under the
      per-repository quota removes that last cached reference, proven in the same property
      suite as AC4. This is the second reference class from `data-model.md`; it is asserted
      here as well so this spec's own gate covers the failure mode its resolved
      collection-strategy question names.
- [ ] AC9: A reference created for a digest after the sweep has recorded a deletion intent for
      it cancels that intent and the blob survives, proven in the property suite by
      interleavings that place a dedup hit, a cache arrival, a snapshot write and a
      metadata-document write storing a CAS digest between
      intent recording and the delete pass.
- [ ] AC10: Every reference write goes through the shared reference-creation call that
      performs the intent check; an architecture test fails on any code path writing a
      reference row by another route.
- [ ] AC11: A blob whose only reference is a snapshot inside the retention window survives the
      sweep; once that snapshot is pruned, the blob is collected within one cycle; and the API
      reports how far back rollback actually reaches, rather than leaving the limit to be
      discovered during an incident.
- [ ] AC12: Recording a reference to a digest whose blob is gone from the object store fails
      with an explicit, retryable, self-explanatory error and writes no reference row; a
      client that exceeded the touch-refreshed grace gets that error at reference time, never
      a silently missing blob at pull time.
- [ ] AC16: A blob holding a CAS-backed metadata document survives GC while any current
      repository, package or version document row, or any retained snapshot's copy of one,
      still references its digest, and is
      collected once none does - proven with a document above the size threshold, such as a
      Debian-scale index, that no `File` row references, including one in a proxied
      repository, which has no snapshots to protect it. The current-document half reaches a
      CAS-backed `PointerDocument` (live while its record exists, collected once the record is
      dropped with its pointer or at tombstone time), a virtual repository's merged documents
      (live until the atomic swap replaces them, then collected), and every blob a document's
      declared blob-digest list names (live while any current or retained document declares
      it, collected once none does), each proven in the property suite and by a fixture with
      an append-only multi-segment index whose oldest segment becomes undeclared.
- [ ] AC13: A commit of a digest whose deletion intent is in its delete phase waits or fails
      retryably until the object delete completes, and the re-uploaded content is then
      retrievable; no interleaving of commit and sweep loses the new copy.
- [ ] AC14: The snapshot retention window defaults to 30 days, is overridable per repository,
      and a snapshot older than the effective window that no pointer targets is pruned and
      stops protecting its blobs.
- [ ] AC15: No code path outside the sweep's delete pass and the orphan scan deletes an
      object from the blob store, enforced by a module-wide architecture test that fails on any
      other deletion call site - including cache eviction, which ends a cached reference and
      deletes nothing; management operations (`internal/manage`), which are snapshot-creating
      writes; and repository deletion and `reclaim: now` (`internal/repository`), which end
      references, release pointers and set a pruning input, and are named in the scan.
- [ ] AC17: A snapshot a pointer targets survives pruning however far outside the retention
      window it has aged: the snapshot, the checkpoint and deltas that reconstruct it, and
      every blob its content set references all survive both pruning and the sweep, and the
      pointer still serves that snapshot's content bit-identically afterwards - proven on an
      injected clock that ages the snapshot past the window while the pointer stays on it.
- [ ] AC18: Repointing a pointer away from a snapshot (or deleting the pointer) releases the
      root: a snapshot protected only by that pointer, and already outside the retention
      window, is pruned on the next cycle, its blobs are collected, and the checkpoints and
      deltas no surviving snapshot depends on are dropped with it; a repoint interleaved with
      a running sweep or pruning pass leaves the pointer's new target fully resolvable - no
      blob it needs is collected, no checkpoint or delta it reconstructs through is dropped,
      and it still serves afterwards.
- [ ] AC19: A pointer whose target snapshot is outside its repository's effective retention
      window is reported by the API - the pointer's name, its target and how far past the
      window the target has aged - and a pointer whose target is inside the window is not,
      so a forgotten environment pointer is discoverable from the API before it is
      discovered from storage growth; the same report is exported as
      `gc_pinned_out_of_window_snapshots{repository}` and `gc_pinned_out_of_window_bytes`, and
      both drop to zero once the pointer is repointed or deleted.
- [ ] AC20: An unexpired upload session holds its repository's grace open: on an injected
      clock, a blob committed earlier in a repository and not yet referenced survives a sweep
      run after the grace period has elapsed since the repository's last other write, provided
      a session opened in that repository is still inside its idle window and below its cap,
      and is collected once that session commits or expires and the grace then lapses - proven
      in the same property suite as AC4, with the open-session and session-abandonment
      operations in its operation set. The model-side statement of the same hold is
      `data-model.md` AC27.
- [ ] AC21: Every CAS read verifies the blob's digest while streaming: with the object under a
      key altered in the store (a flipped byte, a truncation, another blob's bytes), a full read
      is aborted before its body is complete so that no client receives a body it can mistake
      for the artifact, a range read is aborted the same way when any segment covering the
      window fails its recorded digest, `storage_blob_digest_mismatches_total{format}` increments
      once per aborted read, the `BlobDigestMismatch` alert condition holds, the `Blob` row is
      marked as failing verification and the mark is visible from the API, and neither the object
      nor the row is deleted or rewritten by the read; an unaltered object reads bit-identically
      whole and by any range, and a read resolved through in-flight upload records verifies
      identically.
- [ ] AC22: The verified read path is within budget: `internal/storage/bench_test.go`
      benchmarks a verified full read and a verified tail range read of a multi-gigabyte blob
      against their unverified equivalents, each with a `// gate:` comment, the verified full
      read sustains at least 90 percent of the unverified throughput, the tail range read fetches
      at most two 4 MiB segments beyond the requested window from the store, and a regression
      beyond either budget fails the `main` build through the same gate as AC7.
- [ ] AC23: An unfinished `Job` naming a repository holds that repository's grace open: on an
      injected clock, a blob committed in a repository and not yet referenced survives a sweep
      run after the grace period has elapsed since the repository's last other write, provided a
      job naming the repository is `pending` or `running` (including one retrying after a
      failed attempt), and is collected once that job is `completed`, `failed` or `cancelled` and
      the grace then lapses; a repository deletion that cancels the job releases the hold only
      at the job's terminal transition, never at the deletion's commit; the mark-root set is
      unchanged at five; proven in the same property suite as AC4 with the queued-or-retrying
      job and its terminal transition in the operation set (`async-operations.md` AC13 and
      `data-model.md` AC41 state the same hold from their sides).
- [ ] AC24: The GC property suite's operation set includes create, delete of a `local` with
      and without `reclaim: now`, delete of a `remote`, detach, freeze, thaw and rename
      interleaved with publishes, the sweep and pruning on the injected clock, and no run loses
      a blob reachable from any surviving root, leaves a surviving snapshot unreconstructible,
      or deletes an object outside the sweep's delete pass and the orphan scan; a deleted
      `local`'s content snapshots are pruned under its configured window by default and within
      one cycle under `reclaim: now`, after which the pruner drops the final empty snapshot and
      the default pointer in one transaction and leaves the `Repository` row as a tombstone,
      with no interleaving in which a pointer targets a pruned snapshot; and on a `read_only`
      repository retention passes produce no snapshot while pruning of untargeted snapshots
      and the sweep proceed unchanged.
- [ ] AC25: Exactly one unexported constructor in `internal/storage` opens a write transaction,
      it calls `repository.Writable` before the transaction begins and returns its typed
      refusal without opening one, repository deletion is the single named exemption the
      architecture test knows, its one `ErrReplica`-waiving entry point is imported by
      `internal/replication` alone and still refuses `ErrReadOnly` and `ErrDeleted`, it runs the registered pre-commit hook after the handler's changes
      and before commit in the same transaction with the snapshot's content set visible to the
      hook, and a hook that fails commits nothing - no row, no snapshot, no pointer move - while
      the blobs committed before the write stay as grace-protected unreferenced bytes; enforced by
      an architecture test over the module and a fault-injection test that fails the hook.
- [ ] AC26: The sweep's advisory lock is taken through `internal/db/lock.LockSweep` and no code
      in `internal/storage` calls `pg_advisory_lock`, `pg_try_advisory_lock` or their
      transaction-level forms directly, enforced by an architecture test; the sweep, orphan scan
      and prune run as the `storage.sweep`, `storage.orphan_scan` and `storage.prune` job kinds
      enqueued by schedules at `gc.sweep_interval`, `gc.orphan_scan_interval` and
      `gc.prune_interval`, and with the scheduler's exclusivity defeated in a test two concurrent
      `storage.sweep` jobs result in exactly one sweep acting and the other ending without a
      deletion.
- [ ] AC27: `stackweaver-registry storage check` reports orphans, dangling rows and digest
      mismatches over the instance's prefix and exits non-zero on any dangling row or mismatch;
      after an object is deleted behind a live row on a versioned store,
      `storage check --restore-dangling` restores the object from its latest non-current
      version, verifies the restored bytes against the key, and a second run reports zero
      dangling rows; on a store without versions the same run reports the row as unrecoverable
      and exits non-zero; and the restore is the checker's only write to the store, never a
      delete, so AC15's architecture scan passes with the checker included.
- [ ] AC28: The metrics `gc_sweep_state{state}`, `gc_sweep_duration_seconds{state}`,
      `gc_last_sweep_completed_timestamp_seconds`, `gc_blobs_deleted_total`,
      `gc_bytes_reclaimed_total`, `gc_snapshots_pruned_total`,
      `gc_deletion_intents_recorded_total`, `gc_intents_cancelled_by_reference_total`,
      `gc_deletion_intents_pending`, `gc_pinned_out_of_window_snapshots{repository}`,
      `gc_pinned_out_of_window_bytes`, `storage_blob_digest_mismatches_total{format}`,
      `storage_upload_sessions_expired_total{format}` and
      `storage_upload_orphans_removed_total{format}` are emitted with exactly those names and
      labels through `observability.md`'s recorder, each moves when the behaviour it measures
      occurs in a test (a sweep phase, a cancelled intent, an aged pin, an aborted read, an
      expired session), and the alert conditions `GCSweepStale`, `PinnedStorageOutOfWindow`
      and `BlobDigestMismatch` evaluate true against the recorded values in those states and
      false otherwise.
- [ ] AC29: The keys `gc.grace`, `gc.sweep_interval`, `gc.prune_interval`,
      `gc.orphan_scan_interval`, `gc.snapshot_retention` and `gc.intent_gate_wait` are
      registered in the configuration schema with the defaults the Design table states, each is
      the value the component named for it actually uses (on an injected clock, a grace of
      `gc.grace` lapses exactly then and a schedule fires at its interval), a repository's own
      retention setting overrides `gc.snapshot_retention`, and an unregistered key under the
      `gc.` prefix is refused at startup naming this spec.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | unit | `internal/storage/cas_test.go` |
| AC2 | integration | `internal/storage/dedup_test.go` |
| AC3 | fault injection | `internal/storage/upload_fault_test.go` |
| AC4 | property | `internal/storage/gc_property_test.go` |
| AC5 | fault injection | `internal/storage/gc_race_test.go` |
| AC6 | fault injection | `internal/storage/crash_recovery_test.go` (asserted through the `storage check` code path) |
| AC7 | benchmark | `internal/storage/bench_test.go` (`// gate:` comments) + `scripts/bench-gate.sh` on `main` |
| AC8 | property | `internal/storage/gc_property_test.go` |
| AC9 | property | `internal/storage/gc_property_test.go` |
| AC10 | architecture test | `internal/model/arch_test.go` |
| AC11 | property + integration | `internal/storage/gc_property_test.go`; reporting: `internal/model/snapshot_test.go` |
| AC12 | fault injection | `internal/storage/gc_race_test.go` |
| AC13 | fault injection | `internal/storage/intent_gate_test.go` (commit interleaved with delete pass) |
| AC14 | integration | `internal/storage/retention_test.go` |
| AC16 | property + integration | `internal/storage/gc_property_test.go` (metadata-document root, pointer documents, merged-set swap, declared segments); `internal/storage/metadata_blob_gc_test.go` (Debian-scale index; multi-segment index whose oldest segment becomes undeclared; dropped pointer document) |
| AC15 | architecture test | `internal/storage/arch_test.go` (module-wide deleter scan naming `internal/repository`, `internal/manage`, the proxy cache and the checker) |
| AC17 | property + integration | `internal/storage/gc_property_test.go` (pointer-target root); `internal/storage/retention_test.go` (aged pointer target still serving) |
| AC18 | property + integration | `internal/storage/gc_property_test.go` (repoint interleaved with the sweep and with pruning's phases); `internal/storage/retention_test.go` (release then prune) |
| AC19 | integration | `internal/model/pointer_test.go` (out-of-window pin reporting); `internal/storage/gc_metrics_test.go` (the two pin gauges rise and fall with the report) |
| AC20 | property | `internal/storage/gc_property_test.go` (open-session and session-abandonment operations on an injected clock that ages sessions past the idle period and the cap) |
| AC21 | fault injection + integration | `internal/storage/read_verify_test.go` (altered object whole and by range; abort shape; mismatch mark; in-flight read; shared with `data-model.md` AC43, which asserts the `Blob` row's `segment_digests` and mark from the model side) |
| AC22 | benchmark | `internal/storage/bench_test.go` (verified versus unverified full read and tail range read, `// gate:` comments; store egress counted by a recording backend) |
| AC23 | property + integration | `internal/storage/gc_property_test.go` (queued-or-retrying job and its terminal transition in the operation set); `internal/storage/pending_operation_gc_test.go` (forced sweep past grace with a pending and a retrying job; release at terminal, not at deletion commit) |
| AC24 | property + integration | `internal/storage/gc_property_test.go` (lifecycle operations in the operation set, interleaved with the sweep and pruning's phases); `internal/storage/retention_test.go` (age-out and `reclaim: now` on the injected clock; tombstone drop pairs pointer and snapshot; retention pass suspended on `read_only` while pruning continues) |
| AC25 | architecture test + fault injection | `internal/storage/arch_test.go` (sole unexported write-transaction constructor; `Writable` before `BeginTx`; hook between handler changes and `Commit`; deletion as the named exemption; the `ErrReplica` waiver's single importer, shared with `repository-lifecycle.md` AC9 and `replication.md` AC12); `internal/repository/writable_test.go` (the waiver still refusing `read_only` and `deleted`, shared with `repository-lifecycle.md` AC9); `internal/storage/write_hook_test.go` (failing hook commits nothing; content set visible to the hook) |
| AC26 | architecture test + integration | `internal/storage/arch_test.go` (no direct advisory-lock call outside `internal/db/lock`); `internal/storage/sweep_lock_test.go` (two concurrent `storage.sweep` jobs, one acts; schedules at the configured intervals on the injected clock) |
| AC27 | integration | `internal/storage/restore_test.go` (dangling row on a versioned and an unversioned store; restore verified against the key; second run clean; checker in the AC15 scan) - the same file `deployment.md` AC21 runs |
| AC28 | integration | `internal/storage/gc_metrics_test.go` (every named metric and label through `telemetry.NewTestRecorder`; alert conditions evaluated against recorded values) |
| AC29 | integration | `internal/storage/config_test.go` (schema registration and defaults; each key read by its component on the injected clock; per-repository override; unregistered `gc.` key refused) |

## Implementation Phases

### Phase 1: CAS
- Digest addressing, object store abstraction, simple upload
- The verified read path: hashing reader on every read, segment digests at commit, range
  verification, the mismatch mark and metric (AC21)
- The sole write-transaction constructor with `repository.Writable` and the pre-commit hook,
  and its architecture test (AC25); the `gc.` keys registered in the schema (AC29)

### Phase 2: Chunked upload
- Resumable sessions under `data-model.md`'s upload-session definition and lifetime, digest
  verification, orphan records

### Phase 3: GC
- The chosen strategy, plus the property and fault-injection suites **written before it**,
  the open-session and job-held grace holds included (AC20, AC23), the lifecycle operations
  in the operation set (AC24), and the fourth root's widened reach (AC16)
- The three job kinds and their schedules, the sweep lock through `internal/db/lock.LockSweep`
  (AC26)
- Retention pruning, including the pointer-target exemption, its release on repoint, the
  out-of-window pin reporting, the `reclaim: now` input, `read_only` and the tombstone drop
  (AC17, AC18, AC19, AC24)
- `stackweaver-registry storage check` and `--restore-dangling` (AC27); the metrics and alert
  names (AC28)

### Phase 4: Benchmarks
- Throughput and read-path verification benchmarks with `// gate:` comments under
  `scripts/bench-gate.sh` (AC7, AC22)

## Tasks

<Populated by `/tasks` once this spec reaches `planned`.>

## Open Questions

No questions are open. Ten were raised across this spec's reviews and answered by the owner,
the last of them on 2026-09-26 (pointer targets versus the retention window, was Q10); an
eleventh, raised by the 2026-09-27 reconciliation when read-path verification arrived from
`artifact-verification.md`, was adopted under the owner's standing delegation. Each is folded
into Design, Scope, the acceptance criteria and the Test Plan above, with each decision's
accepted cost recorded beside it under the Resolved headings, kept rather than deleted so the
reasoning survives the next time someone asks why it was done this way.

### Resolved: verifying range reads on the read path (was Q11)

**Adopted 2026-09-27 under the owner's standing delegation.** Option C: at commit, the pass that
computes the canonical digest also records a digest per fixed 4 MiB segment, stored beside the
`Blob` row as metadata and never as a key; a range read fetches the whole segments covering the
window, verifies each, and emits the window. Folded into Scope, Design ("The read path verifies
what it serves"), AC21 and AC22. `data-model.md` has taken its side: the `Blob` row carries
`segment_digests` and the verification-failed mark as metadata under "A coordinate is not a
storage key", so the CAS key stays the single canonical digest (its AC43, whose
`internal/storage/read_verify_test.go` is shared with AC21 here).

`artifact-verification.md`'s resolved serve-time decision (was its Q5) placed the only integrity
check the verify-nothing clients get on this spec's read path: verify the digest while streaming,
abort on mismatch. A full read can do that with one hash over bytes already being streamed. A
range read cannot: the digest is over the whole blob, and OCI clients resume interrupted layer
pulls with `Range`, so the question is what a range read verifies and at what cost.

**Recommendation:** C, because it is the only option that verifies every byte served, keeps a
resumed pull of a five-gigabyte layer cheap, and touches nothing about addressing.

| Option | You get | It costs |
|---|---|---|
| **A. Hash the whole object behind every range read, emit only the window** | Every byte verified against the canonical digest; no new metadata | Store egress equal to the blob size per range request, so a client resuming the last megabyte of a five-gigabyte layer costs five gigabytes; the read-path budget cannot be met for large blobs |
| **B. Serve range reads unverified; rely on the client** | No cost | A verify-nothing client that happens to use `Range` installs altered bytes, and the storage layer cannot know which client it is serving; the exact gap the serve-time decision closed reopens for one request shape |
| **C. Segment digests recorded at commit; a range read verifies the segments covering the window** (adopted) | Every byte served verified; at most two extra segments of egress per range read; computed in the pass that already hashes the upload | A digest list on the `Blob` row (about 40 KiB for a five-gigabyte blob), a constant segment size whose change is a spec revision, and a second verification code path (segment against list rather than whole against key) that the property and fault-injection suites must cover |

**Why this is yours:** it adds a column to the shared `Blob` row that `data-model.md` owns, and it
fixes a per-blob storage overhead every deployment pays.

Accepted cost: the segment-digest column and the second verification path, both bounded and both
tested (AC21, AC22). B lost because it protects everyone except the clients the decision exists
for; A lost because it makes resumable download of large layers, the one case range reads exist
for, cost a full read each time.

### Resolved: pointer-targeted snapshots versus the retention window (was Q10)

**Settled 2026-09-26: a snapshot targeted by a `Pointer` is exempt from retention pruning - it
is a fifth mark root.** The snapshot, the checkpoint-and-delta chain that reconstructs it, and
every blob its content set references are unprunable and uncollectable while any pointer
targets it, however far outside the retention window it has aged. Folded into Scope, the
invariant, the Design mark-roots section, the property-test operation set, and AC17 and AC18;
AC14 now prunes only snapshots nothing points at. The amendment to the enumeration itself lands
in `data-model.md`, which owns the root set.

It is the only option that keeps promotion's bit-identical-serving promise and never breaks an
idle repository. Every name-addressed read resolves through a pointer, so without the exemption
a `prod` environment promoted once and left alone for a quarter, or a repository that stops
publishing for 31 days, loses the snapshot it is serving to a timer.

**Accepted cost: retention no longer strictly bounds storage.** A forgotten environment pointer
retains its snapshot, its delta chain back to a checkpoint, and every blob they reference,
indefinitely, and no schedule reclaims it - only a repoint or a pointer deletion does. The
mitigating property is what decided the choice: the failure mode is **visible pinned storage
attributable to a named pointer**, where both alternatives fail worse. B (prune anyway, with an
aged-out pointer auto-advancing to the oldest retained snapshot and an alert) changes what
`prod` serves with no deploy and no repoint, breaking the bit-identical promise promotion exists
to make, silently and on a timer. C (pruning skips or halts for a repository while any pointer
targets an out-of-window snapshot) lets one stale environment pointer hold that whole
repository's reclamation hostage, which is the shape the resolved retention-gap question in
`replication.md` (was Q1) rejected for follower tracking. A pin that is visible and attributable beats one that fails silently or stops
reclamation altogether.

Because the root dies only on a repoint, that release path is load-bearing rather than
incidental: AC18 polices it and the property suite generates repoints in both directions, since
a root that can be created and never released is storage nothing reclaims. The visibility half
of the argument is likewise policed rather than assumed: AC19 reports every pointer holding an
out-of-window snapshot, because a pin that is only attributable in principle is one that fails
as silently as the alternatives this option was chosen over.

### Resolved: the post-row-delete object race (was Q7)

**Settled 2026-09-23: the deletion intent is an exclusive commit gate on its digest.** While
the delete pass is acting on an intent, a commit of that digest waits or fails retryably until
the object delete completes, then uploads fresh. The uploader yields, not the sweep.

This closes the last clause of the invariant the intent table could not honour on its own:
cancellation protects a digest only while its metadata row exists, and once the row is gone the
race is in an object store with no transactions. Folded into the Design's garbage-collection
section and policed by AC13.

Accepted cost: a rare stall or retry when re-uploading just-swept content, and a wait-or-retry
state on the commit path. Generation-suffixed keys would avoid the coordination entirely and are
forbidden, because digest-only addressing is what makes deduplication work.

### Resolved: snapshot retention default (was Q8)

**Settled 2026-09-23: 30 days, configurable per repository.** Long enough that a bad publish
discovered after a sprint is still recoverable, short enough that hosted deletes reclaim space on
a horizon an operator can predict.

Accepted cost: deleted content occupies storage for a month by default. Because rollback silently
stops being possible beyond the window, the reach-reporting requirement already in Scope is what
keeps that from being discovered during an incident.

### Resolved: the grace-period boundary (was Q9)

**Settled 2026-09-23: repository-scoped refresh.** Any write activity in a repository refreshes
the grace on all of that repository's unreferenced blobs.

This corrects the earlier grace resolution, which was stated in terms of a "push session" that
**OCI does not have on the wire**: every blob commits in its own independent session and no
push-session identifier exists. Under a session-scoped reading, a client actively pushing layer
nine would not keep layer one alive, so the settled promise that an actively pushing client never
expires would have been false for exactly the format it was written for.

Accepted cost: a busy repository's genuinely abandoned blobs are refreshed by unrelated activity
and may not collect until the repository goes quiet.

Extended 2026-09-26 by the Wave 1 reconciliation, with the scope unchanged: `data-model.md`
adopted one definition of an upload session and its lifetime under the owner's standing
delegation (its resolved in-flight-scope and session-lifetime decisions, was Q15 and Q16), and
that definition makes an unexpired upload session hold its repository's grace open, with
continuation requests counting as write activity. This spec now uses that definition rather
than an undefined "session" (Design, "Upload lifecycle"; AC3; AC20; the property op set). The
added cost is small and bounded: an abandoned session delays its repository's collection by at
most one idle period after its last continuation, and never beyond the absolute cap.

### Resolved: exceeding the grace period (was Q4)

**Settled 2026-09-23, boundary corrected the same day: touch-refreshed grace, defaulting to
hours, scoped to the repository.** The original wording said "each blob upload within a push
session refreshes the grace on the whole session", which assumed a wire-level push session OCI
does not have. See the resolved grace-period boundary above; the mechanism is unchanged, only
what it attaches to. A client actively pushing never expires; an
abandoned push collects once its repository goes quiet.

Accepted cost: a very slow client uploading one enormous blob could still exceed it. That case
must fail as an explicit, self-explanatory error telling the client to re-push, never as a
silently missing blob discovered later. Since the 2026-09-26 reconciliation the exceed path is
narrower still: a client continuing its upload session holds the repository's grace open (the
extension note on the grace-period boundary above), so only a client paused past the session's
idle period, or one whose session reaches the absolute cap, can meet it.

### Resolved: snapshot mark roots and pruning (was Q5)

**Settled 2026-09-23: every snapshot within the retention window is a mark root; older
snapshots are pruned and stop protecting their blobs.**

This makes the sweep mark from three roots, not two: published references, cached references, and
retained snapshots. A sweep marking fewer will delete live content.

Accepted cost: a retention default must be chosen, and **rollback beyond the window silently
stops being possible.** The API must therefore report how far back rollback actually reaches
rather than letting an operator discover the limit during an incident. The same question was
raised independently in `data-model.md`; this resolution settles both.

Amended 2026-09-26 by the pointer-target resolution above: an out-of-window snapshot is pruned
only while **no pointer targets it**, which makes the retention window the bound on snapshots
nothing points at rather than on all of them.

### Resolved: the write barrier (was Q6)

**Settled 2026-09-23: a deletion-intent table.** The sweep records the digests it intends to
delete, then deletes in a second pass. Any path that creates a reference checks that table and
cancels the intent.

This is what closes the hole the review found: a grace period keyed on time since upload cannot
cover a dedup hit, a cross-repo mount or an `on_demand` arrival, because none of those involve an
upload. An intent table covers them all, because it keys on the deletion rather than on the
reference.

Accepted cost: a new core table, and **every reference-creating path must check it.** That is
easy to forget in a new handler, so it is not left to discipline: the check belongs inside the
shared reference-creation call, and an architecture test asserts no handler writes a reference by
any other route.

### Resolved: collection strategy (was Q1)

**Settled 2026-09-22: mark-and-sweep with a grace period.** What `distribution` converged on
after reference counting proved hard to keep correct across crashes. The grace period is what
neutralises the commit-to-reference window without distributed locking, which is the specific
race AC5 exists to police.

Accepted costs, recorded so they are not rediscovered as surprises: reclamation is delayed by the
grace period, and a full sweep is O(all blobs) and will need attention at scale. Revisit only
with a measured sweep-duration problem, not on principle.

Two reference classes, not one: per the shared data model (#12), a blob may be referenced by a
published file **or** by a cached file that arrived on demand. The sweep marks from both roots.
A sweep that marks only published references will delete live cache content.

### Resolved: GC pausing (was Q2)

**Settled 2026-09-22: no pause.** A registry that stops accepting pushes to collect garbage is
one that teams route around, and it forecloses the CI-critical-cache use case that motivates the
whole proxy layer. The grace period chosen for the collection strategy exists precisely so a
pause is not needed.

Accepted cost: the mark phase must be correct under concurrent writes. This is exactly what AC4
and AC5 police, and it is why those criteria demand property and fault-injection tests rather
than a client-level run.

### Resolved: metadata store (was Q3)

**Settled 2026-09-22: PostgreSQL.** Listing, transactional consistency and the snapshot
dimension over an object store alone would mean building an index anyway, badly, over eventually
consistent storage.

Accepted cost: self-hosters must run a database, which is a real adoption tax for a project
competing partly on being easy to run. Mitigate with a genuinely good single-command deployment,
not by weakening the storage model.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-23 | 525c9f8 | re-review triggered by this spec's own sibling tripwire: the a2d5219 status note said a resolution of data-model Q11/Q13 or proxy-cache Q11 amends the mark roots | The tripwire had fired. data-model Q13 settled metadata documents as CAS blobs above a size threshold, so a Debian-scale index is a blob no `File` row references and the three-root sweep would have collected it while it was being served. Fourth mark root added with AC16, and the property-test operation set extended to cross the size threshold or the new root is never exercised. data-model Q11 bounded the third root rather than adding one; proxy-cache Q11 remains open and bears on the second. Stays draft pending the re-gate. |
| 2026-09-22 | afbb4e4 | adversarial + constitution + cross-spec (claim verification vacuous: no `internal/storage/` code exists yet) | Stays draft: Q4-Q6 raised (grace-window exceed path, snapshot roots and retention, sweep write barrier); invariant gained a third clause; sweep-mechanics constraints and canonical-digest rule added; AC3/AC6/AC7 tightened, AC8 added; stale pre-resolution text and the handler-owns-metadata contradiction with `data-model.md` fixed |
| 2026-09-23 | 3e3ae0a | folded-decision application + adversarial + constitution + go-spec-reviewer (claim verification vacuous: still no `internal/storage/` code) | The six resolutions were recorded but only half-applied: frontmatter, Scope, the grace text, the barrier text and the mark-roots bullet still described the old shape and cited Q4/Q5/Q6 as open; folded throughout, intent ordering/lifecycle and grace-versus-intent constraints added, property op set extended to reference-ending operations and sweep-phase interleavings, AC9-AC12 added; Q7 (post-row-delete object window), Q8 (retention default), Q9 (push-session boundary) raised; stays draft |
| 2026-09-23 | a2d5219 | gate review: folded-decision application + adversarial + constitution + go-spec-reviewer (claim verification vacuous: still no `internal/storage/` code; siblings re-read at this sha) | Q7-Q9 verified as genuinely folded; four stale session-scoped remnants fixed (orphan-scan text, AC3's collection timing, the property op set, the was-Q4 record) plus the stale three-open intro; delete-conditional-on-standing-intent made explicit, single-deleter boundary given its named enforcer (AC15), pruning reconstructibility and the sibling-owned root-set dependency recorded; zero open questions, all ACs mapped; draft -> planned |
| 2026-09-23 | d078c46 | gate re-review of the fourth root: application check + fifth-root hunt across all siblings + barrier and generator reachability + constitution + go-spec-reviewer (claim verification vacuous: still no `internal/storage/` code) | Fourth root was stated but half-applied: Scope still said three roots, the frontmatter cited the wrong AC, and the root's definition covered only snapshot-held documents, leaving proxied repositories' current documents (the motivating Debian case) unprotected - all fixed, with the document write bound to the barrier (AC9/AC10) and its death ops (supersession, downward threshold crossing) plus multi-repository and injected-clock reachability added to the property suite; intent-lifecycle contradiction fixed (intent now outlives the row delete so AC13's gate holds); replication and supply-chain placed against the root set; a genuine fifth-root gap found and raised as Q10 (pointer-targeted snapshots versus the retention window); stays draft on Q10 |
| 2026-09-26 | 2edd42c | folding owner answers to storage-and-gc Q10 and proxy-cache Q11 | Not a review: application of decisions already made. Q10 answered option A, folded into the body before this record was written - Scope, the invariant, the Design mark-roots section and the root end-of-life list now carry five roots, the fifth defined as a snapshot any `Pointer` targets plus the checkpoint-and-delta chain that reconstructs it, unprunable while targeted, with the accepted cost (retention no longer strictly bounds storage, the pin visible and attributable to a named pointer) and the rejection of B and C recorded in the resolved record. Pruning reconstructibility and AC14 widened; AC17 (an aged pointer target survives pruning and still serves) and AC18 (a repoint or pointer deletion releases the root, after which the snapshot prunes and its blobs collect) added with Test Plan rows; the property-test operation set extended with repointing in both directions and an injected clock able to age a targeted snapshot, because a root that can be born and never die is untestable and its storage unreclaimable in practice. proxy-cache Q11 recorded here as the consequence it is: eviction ends the cached reference only, so it is not a second deletion path, AC15's single-deleter boundary now names it, and the second root's lifetime ends at eviction while the blob waits for the sweep. |
| 2026-09-26 | 4548df3 | gate review: independent verification of the fifth-root fold (application check across Scope, invariant, Design, ACs, Test Plan and the property op set) + barrier-and-pruning race hunt + generator reachability + cross-spec against data-model, proxy-cache, replication and supply-chain-policy + constitution + go-spec-reviewer concurrency lens (claim verification vacuous, as in every prior pass: no `internal/storage/` code exists, so this pass judged the design and the fold, not an implementation) | The fold was genuinely applied - five roots in Scope, the invariant, Design and the end-of-life list, AC14 narrowed to untargeted snapshots, AC17/AC18 present with Test Plan rows, repoints in both directions and the targeted-aging clock in the op set - and the cross-spec claims held: data-model's AC23-versus-pin reasoning is sound (the refusal governs the transition, the pin governs aging in place, protection attaches on targeting), and replication's follower pointer is a true instance of the root. Four gaps the fold left were fixed directly, none needing the owner. One: the delete pass's re-check was never bound to the fifth root, though a repoint writes no reference row and so can never cancel an intent - the fourth root got exactly this binding and the fifth now has it, together with the serialisation rule the new root forces (AC23's refusal and pruning's targeted check are both check-then-act reads of pointer state, so they serialise with pointer writes as intent cancellation serialises with the delete phase; without it two pointers trading places over an aged snapshot let a prune slip between refusal-read and repoint-write). Two: AC18's interleaving clause was blob-level only and passable with the target's delta chain pruned and serving broken while every blob survived - it now demands the new target stays resolvable and serving, with pruning's two phases added as schedulable interleaving points, without which that race is unreachable and the rule vacuous. Three: the visibility argument that decided Q10 (pinned storage visible and attributable to a named pointer) was policed by no criterion in any spec, leaving option A without the mitigation it was accepted for - AC19 added with Scope, Design, Phase 3 and Test Plan carrying it. Four: generated histories must span a checkpoint interval or nothing ever threatens a reconstruction chain and AC17's chain-survival clause passes vacuously. Cross-spec: data-model's pointer API surface never offered the pointer deletion AC18 tests - corrected there with a Review Log row. Repository deletion exists in no spec; noted as a portfolio-wide absence rather than a defect of this root, since repoint and pointer deletion suffice to release every pin. Zero open questions, all 19 ACs mapped, nothing blocking: draft -> planned. |
| 2026-09-26 | fe54272 | cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Applied the queued sibling consequences from the data-model and replication folds, and set status back to draft because they are substantive and the 4548df3 gate review never saw them. Upload lifecycle: an unexpired upload session holds its repository's grace open and continuation requests are write activity, citing `data-model.md`'s one definition of an upload session and its lifetime rather than restating one (Scope, Design, Phases 2 and 3, extension notes on the was-Q9 and was-Q4 records). AC3's undefined session expiry now names that lifetime (idle period or absolute cap, one hour and 24 hours by default) and forbids collecting an orphan while any session in its repository is unexpired. The property generator's session operations now include a session held open inside its idle window alongside abandonment, and the injected clock must age a session past its idle period and cap. AC20 added (the open-session grace hold, mirroring `data-model.md` AC27) with a Test Plan row. Stale citations of `replication.md` Q1 rewritten to its adopted answer: the leader prunes consulting no follower, so no follower-position pin exists and the root set stays at five. The mark-root set is unchanged. Draft until a gate review re-judges it. |
| 2026-09-27 | 1b33a04 | cross-spec reconciliation of the foundation authoring wave. Not a review | Not a review. Applied every item in `agents/spec-loop/consequences.md` targeting this spec from the ten foundation specs authored 2026-09-27, each verified against the source spec's current text. From `artifact-verification.md` (its resolved serve-time decision): a new Design section, "The read path verifies what it serves" - every CAS read hashes while streaming and aborts with `BlobDigestMismatch` on a mismatch, the row is marked, and the read never deletes or repairs (AC21); the read-path benchmark budget with `// gate:` comments (AC22); and one question this raised, how a range read is verified, written in decision shape and adopted under the standing delegation (was Q11: fixed 4 MiB segment digests recorded at commit, a `Blob` column reported to `data-model.md`). From `async-operations.md` (its resolved grace-hold decision): an unfinished job naming a repository holds its grace open exactly as an unexpired session does, a timing input and not a root, with the queued-or-retrying job and its terminal transition in the property operation set (AC23; AC3 extended). From `signing-service.md` and the debian, hackage and cpan open items: the fourth root's current-document half reaches CAS-backed pointer documents, virtual merged documents and declared blob-digest lists, each bound to the barrier and to the property suite (AC16 extended). From `management-api.md` (its resolved repository-deletion decision) and `repository-lifecycle.md`: management operations and repository deletion are reference-ending paths, never deleters, AC15's scan is module-wide and names `internal/repository` and `internal/manage`; the pruner reads the effective retention override (`reclaim: now`), suspends retention passes but not pruning on `read_only`, and drops a deleted repository's final snapshot and default pointer together before leaving the tombstone, with the lifecycle operations in the property operation set (AC24); the sole write-transaction constructor calls `repository.Writable`, generalising replication's link-refusal test, and exposes `data-model.md`'s pre-commit hook, a failing hook committing nothing (AC25, from the data-model reconciliation item). From `deployment.md`: the sweep lock through `internal/db/lock.LockSweep`, the three job kinds scheduled by the async scheduler (AC26), the checker as `stackweaver-registry storage check --restore-dangling` relying on bucket versioning (AC27), and the `gc.` key table in the three-column shape with defaults fixed here for the first time (AC29). From `observability.md`: metric and alert names (AC28; AC19 exports its report as gauges; AC7 rewritten onto the gate script). Old items re-checked: replication item 2 and the data-model+oci upload-session item were already applied at fe54272; format-management item 9 and the two "no change" items needed nothing beyond the AC15 wording. Mark-root check: five roots, nothing added; the job hold is a timing input, the deletion paths end references, the three new reaches widen the fourth root. Every new behaviour has a criterion with property or fault-injection coverage; nine criteria added with Test Plan rows, six extended, Phases 1, 3 and 4 updated. `node scripts/check-spec.js` on this file: zero failures. Stays draft until a gate review re-judges it. |
| 2026-09-28 | 6e6d503 | cross-spec reconciliation sweep of the foundation wave. Not a review | Not a review. Applied the two items raised against this file after its 2026-09-27 pass, each verified against the source's current text. From `replication.md` reconciliation 3 (its AC12, `repository-lifecycle.md` AC9): the sole write-transaction constructor's second entry point that waives `ErrReplica` alone, imported by `internal/replication` and nothing else and still refusing `read_only` and `deleted`, in "The write transaction has one door", AC25 and its Test Plan row (shared with `repository-lifecycle.md` AC9 and `replication.md` AC12). From sweep 1 item 1: the resolved range-read record (was Q11) cites `data-model.md`'s `Blob` row, "A coordinate is not a storage key" and AC43 instead of reporting the column as owed, and AC21's row records `internal/storage/read_verify_test.go` as shared with AC43. No question raised or adopted; `node scripts/check-spec.js` zero failures on this file. Stays draft pending a gate review. |
