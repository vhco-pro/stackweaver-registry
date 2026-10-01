---
status: planned
status_description: "Fable follow-up 2026-10-01 at 073d744: the items the sibling rechecks queued after this spec was planned applied and it stays planned: the job-held grace reads holds_grace, so a proxy.revalidate job holds nothing and AC23's clause inverts (async was-Q4 as amended; the leak paragraph is history), the door gains a document-only form calling repository.Renewable so a frozen repository keeps renewing its envelope (AC24, AC25), its deletion exemption also skips the hook and the pointer-document render, and an on-a-transaction form lets the runner's Finish keep commit with the lock order documents, member rows, head, job row (AC25, AC30), the rpm dual-held blob follows proxy-cache's settled eviction order while the sweep is asserted in both (AC8), and the upload. keys and data-model's share lock are cited; no question raised, roots stay five, 31 criteria each with a Test Plan row. Previously: planned again by the Fable recheck of 2026-09-30 at d9f6f1c: full review plus re-examination of the two Opus adoptions (Q11 range-read segment digests, Q12 the commit-time claim check under the default Pointer row lock), both confirmed with amendments recorded on their resolved records. Fixed in the same pass: a marked (mismatching) blob is no longer a permanent loss, since a commit of its digest re-uploads through the intent gate and clears the mark and storage check --restore-dangling repairs mismatches from bucket versions (AC21, AC27); the write transaction runs at READ COMMITTED and takes the head lock last, both asserted (AC30); cache materialisation is write activity and commits row and reference together (AC8); the virtual merge commit is a declared-list producer with a two-generation fixture over debian AC22 (AC16, closing the last queued consequence); the rpm dual-held blob is in the op set (AC8); the proxy.revalidate grace hold cost is stated at full size (a leak under a persistent rate limit with continuous virtual reads, never a loss). Roots stay five; zero open questions; 31 criteria each with a Test Plan row; fable_recheck cleared. History: un-planned 2026-09-26 for the Wave 1 reconciliation, then reconciled on Opus through 2026-09-28 (read-path verification AC21 and AC22, the job-held grace AC23, the widened fourth root AC16, management and lifecycle paths as non-deleters AC15 and AC24, the sole write-transaction constructor with the claim declaration AC25, AC30 and AC31, the gc. keys, lock, jobs, checker and metric names AC26 to AC29), each pass recorded in the Review Log."
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
  A read that fails marks the `Blob` row, and a marked row is never trusted by deduplication:
  the next commit of that digest uploads its verified bytes and clears the mark, and
  `storage check --restore-dangling` repairs a mismatching object from bucket versions as it
  repairs a missing one (AC21, AC27).
- Chunked/resumable upload support, since OCI requires it and large artifacts need it.
- Mark-and-sweep GC, fully settled: a repository-scoped, touch-refreshed grace period
  defaulting to hours, held open while any upload session in the repository is unexpired or
  any unfinished `Job` carrying `holds_grace` names the repository (every kind but
  `proxy.revalidate` declares the hold), a
  deletion-intent table as the write barrier, and five mark roots - published references,
  cached references, snapshots inside the retention window, CAS-backed metadata
  documents (current and snapshot-held, the current half reaching pointer documents, virtual
  merged documents, the blobs a document declares and every current document of a `remote`,
  which LRU eviction never ends), and snapshots targeted by a `Pointer`,
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
  transaction; it calls `repository.Writable` before the transaction begins (or
  `repository.Renewable` in its document-only form, which a cadence re-sign, a virtual's merge
  commit and a member-list change take, so a frozen repository keeps renewing its signed
  envelope), exposes the
  pre-commit hook `data-model.md` defines, carries the write's **claim declarations** and checks
  each against the repository's `Retirement` records when declared and again at commit, where
  the check is serialised with any retiring write on the repository head, and commits nothing
  for an unchanged publish, so writability, index regeneration, retired-coordinate refusal and
  the no-op publish are decided in one place for every format (AC25, AC30, AC31). Its
  on-a-transaction form lets `async-operations.md`'s `Finish` keep the commit while the door
  keeps every check, and its deletion exemption skips the writability check, the hook and the
  pointer-document render together (AC25).
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
- What a coordinate's retirement means, which kinds retire, at what granularity a handler claims
  and how a refusal renders on each wire: `management-api.md` (its resolved claimed-coordinate
  and unchanged-publish decisions, was its Q14 and Q15), with the `Retirement` record
  `data-model.md`'s (AC32, AC35). This spec carries the declaration and both checks on the write
  transaction and says what the transaction commits, and adds the claim race to the property
  suite.
- The job runtime (claiming, leases, retries, cancellation): `async-operations.md`. This spec
  reads unfinished jobs carrying `holds_grace` as a grace input, registers three job kinds and
  lends the runner's `Finish` the door's on-a-transaction form.
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
- **A marked row is not a dedup hit.** The dedup check trusts a `Blob` row, so without this
  rule a corrupted object would be permanent: a client re-pushing the correct bytes would be
  told the content is already stored, its bytes discarded, and every later pull would abort on
  the same object, with no path anywhere that repairs a mismatch. A commit of a digest whose
  row carries the verification-failed mark therefore does not skip the upload: it goes through
  the intent gate like any commit (AC13), writes the verified bytes to the key with a plain
  `PutObject`, which the store applies atomically per key so a reader mid-stream sees whole old
  or whole new bytes and never a splice, and clears the mark in the same transaction as its
  reference. No delete is involved, so AC15's single-deleter boundary is untouched. The other
  repair is the checker's (below): `storage check --restore-dangling` treats a marked or
  `--verify`-found mismatch as it treats a dangling row, restoring from the latest bucket
  version whose bytes hash to the key (AC21, AC27).
- **Range reads are verified through segment digests.** A range read cannot verify the whole
  digest without reading the whole object, and reading a five-gigabyte layer to serve its last
  megabyte to a resuming client is not acceptable. At commit, while the canonical digest is being
  computed, the same pass records a digest per fixed 4 MiB segment of the blob, stored beside
  the `Blob` row as metadata (never a key: the CAS key stays the single canonical digest, and
  the segment size is a constant whose change is a spec revision like the algorithm's). A range
  read fetches the whole segments covering the requested window, verifies each against its
  recorded digest, and emits only the window. The cost is at most two extra segments of egress
  per range read. A range over a stored document that consists of declared blobs (Hackage's
  incremental `01-index.tar.gz`) maps onto the part blobs covering it, each read through this
  same segment-verified path without assembling the document, and a multi-range request
  (`ServeFile`'s `multipart/byteranges`, `rpm.md`'s zchunk refresh) verifies each range the same
  way (`signing-service.md` AC30). The resolved range-read question below records the options
  that lost.
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
first (`upload.idle_timeout`, one hour, and `upload.max_duration`, 24 hours, the two keys that
spec tables and its AC26 asserts).
Continuation requests - a chunk, a status query, the final commit request - are write activity
in the session's repository and refresh its grace like any other write, and while any upload
session in the repository is unexpired that grace does not lapse at all. Without the hold, a
client paused inside the idle window with earlier layers already committed could return to find
those layers swept, which breaks the promise resumability makes. The hold ends when the last
open session in the repository commits or expires; from then on the repository's grace runs
from its last write activity like any other (AC20, and `data-model.md` AC27 from the model's
side).

**An unfinished job naming a repository holds its grace open the same way, when its kind
declares the hold.** A deferred
management operation (`management-api.md`'s Galaxy-shaped import, a bulk operation past the
deferred threshold) commits its bytes to the CAS in the request and references them only when
its `Job` runs, minutes or a retry horizon later, on a repository nobody else may be writing to.
That is the committed-bytes-awaiting-their-reference shape the session hold was created for, and
`async-operations.md` adopted the same rule for it (its resolved grace-hold decision, was its Q4,
as its Fable recheck of 2026-10-01 amended it; `data-model.md` "Jobs and schedules" and AC41
carry the record): every `Job` may name a repository and carries `holds_grace`, copied from its
kind's registration at enqueue (`HoldsGrace`, default true), the sweep's grace computation reads
unfinished jobs by repository `WHERE holds_grace` exactly as it reads unexpired sessions, loading
no kind registry, and the job's terminal transition (`completed`, `failed` or `cancelled`)
releases the hold. It is a timing input to the grace clock, **not a mark root and not a pin**: no
digest a job will reference is protected individually, the repository's unreferenced blobs are
simply not yet expired, and the root set stays at five. The accepted cost is that a repository
with a stuck retrying job is uncollectable until the job fails, about forty minutes at
`async-operations.md`'s defaults, which is why that horizon is short. A repository's deletion
cancels its pending jobs and cooperatively cancels running ones; each hold stands until its job
is terminal (`repository-lifecycle.md`, "Deletion"), so a half-imported artifact's bytes are
collected after the job ends and never under it (AC23).

**One kind declares `HoldsGrace: false`, and it is `proxy.revalidate`.** It names its remote
(`proxy-cache.md`, "Revalidation outside the request"; `async-operations.md` AC29) but has the
opposite shape to the hold's: its whole effect, the adoption, commits the `Blob` row and the
cached reference in one transaction and is write activity for the remote's grace (AC8), so no
byte of its own ever waits for a reference. It is also the one kind that reads re-enqueue for as
long as a failure lasts, and its retry horizon is hours per job rather than minutes (a
rate-limited replay is deferred through `RetryAt` past the upstream's `RetryAfter`, capped at
`limits.cooldown_cap`, `upstream-adapters.md` AC10). Under the earlier uniform rule the Fable
recheck of 2026-09-30 found those two facts chaining: behind an upstream whose rate limit never
lifts, with the virtual read continuously, the per-job hold was re-created the moment the failed
job was terminal, so the remote's evicted cached files and released revision blobs were a leak
for the duration, never a loss but invisible to the quota because `cache_referenced_bytes` fell
while the store did not. The per-kind flag closes it: a `pending` or retrying revalidation holds
nothing, and the remote's grace runs from its last write activity, the adoption. The cost moved
rather than vanished, and it is stated where it now sits: one declaration per kind that a wrong
`false` would turn into a data-loss hazard, held by `internal/async/kinds_test.go`, which for
every kind declaring `false` interrupts `Work` at each fault point and asserts no `Blob` row is
left without a reference, shared with AC8's cache-fill case (AC23).

**Cache materialisation is write activity, and it never leaves a row unreferenced.** A
fetch-and-cache commit, an adoption and a map build are not completed writes and never pass
through the write door below, but each is write activity in its repository for the grace clock,
and each commits the `Blob` row (where the blob is new) and its first reference in one
PostgreSQL transaction, so at no point does a cached blob's row exist without a reference.
Without both, a quiet remote (its grace lapsed hours ago, no session, no job) fetching one file
after a long idle would have that file's row visible and unreferenced between two commits, and a
sweep in that window would collect it under a lapsed grace. The object itself, between its
`PutObject` and the row's commit, has no row and is the orphan scan's under raw age, as for any
upload (AC8).

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
  of them would be a revision of this constraint, never a silent exception. The retirement
  machinery `management-api.md` settled on 2026-09-28 (its resolved claimed-coordinate decision,
  was its Q14) adds no deleter either. A **retiring write** is one of those snapshot-creating
  management writes: it ends references, and it records a `Retirement` per retired coordinate in
  its own transaction, a record that names a coordinate string and never a blob, so it is not a
  root and a blob whose only mention is a retirement is collected (`data-model.md` AC34, AC35).
  A **write refused on a claim**, at declaration or at commit, deletes nothing: it commits no row,
  and the blobs its client committed before the transaction opened are grace-protected
  unreferenced bytes the sweep collects, the same shape as a failing pre-commit hook and any
  refused publish (AC3, AC30).
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
  protected by nothing else. **No eviction ends it**: a `remote`'s metadata documents, at the
  repository, package and version levels, are current documents under this half for the
  remote's whole life, and LRU eviction under the quota ends cached references of files, the
  second root, and nothing here (`proxy-cache.md`'s resolved metadata-eviction decision, was its
  Q21). A remote's document leaves this root only when an adoption supersedes its body beyond the
  handler's declared retention count, when its body shrinks below the threshold, or when the
  remote is deleted. Were eviction to reach it, a proxied repository's live index would be
  collectable while it serves, the exact failure this root was added to prevent. For the write barrier this means a document write that stores a
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
  pointer or at tombstone time. A pointer document is re-rendered at every transition of its
  pointer, target-moving or document-only (a key switch, a cadence re-sign, and on a virtual
  a merge commit or member-list change; `data-model.md` AC36), with one exception, the move of
  a `local`'s default pointer onto the final empty snapshot in its deletion write, which renders
  nothing and leaves the existing record in place until tombstone time (the door's exemption,
  below), and each re-render is a
  reference birth for the new body and an end for the old. A **repository-scoped** pointer
  document (Hackage's `root.json` and `mirrors.json`, byte-identical on every pointer,
  `formats/hackage.md`'s resolved root-placement decision, was its Q16) is one blob named by
  every pointer's record, so it is live while any pointer's record names it, and the repository
  batch that replaces it on every pointer in one transaction ends the old digest's references
  and creates the new one's together. Second, a **virtual repository's merged documents**
  (`signing-service.md`, "Virtual merges"): a virtual has no content snapshots, so its
  merged index above the threshold is a current document protected only here, exactly as a
  proxied repository's cached index is, and the atomic swap that replaces a merged set ends
  the old digest's reference the way supersession does, as does the virtual's deletion. The
  merged set's **input record** (each member's identity and freshness value, `data-model.md`
  AC45) is metadata on those documents that names no blob, so it widens nothing and a sweep
  marks the same set with or without it. Third, **a document's declared
  blob-digest list**: a document that consists of several blobs (Hackage's append-only index,
  one gzip member per write; CPAN's `CHECKSUMS` per author directory) declares the digests of
  its parts in the document, and the root marks through the declared list, so a part is live
  while any current or retained document declares it and collectable once none does. The list
  is the **only** way a document keeps another blob alive: a digest a document merely mentions
  in its body (a format checksum, the index of a retained upstream revision a remote's document
  keeps, a per-revision filename map stored as CAS-backed metadata) is
  metadata like any format-level checksum ("Addressing"), never a reference, so a format that
  needs such a blob servable must hold it through a cached reference or put it on the declared
  list. The last two examples now have their answer in `proxy-cache.md`'s resolved
  retained-revision decision (was its Q19, AC27): every blob a remote keeps for its current or a
  retained revision is on the declared list of the remote's current document at the revisioned
  set's own level, the repository-level document for a repository-wide index and the
  package-level one for a set revisioned per package (its resolved declaring-document decision,
  was its Q22), for a handler-declared count of superseded revisions, and a cached file a
  retained revision names is held by its own cached reference; the old blob of a revision-bound violation whose route carries
  no digest is released instead (its was-Q20, AC28). The list is marked whether the declaring
  document's body is inline or CAS-backed (`data-model.md`, "Declared blob digests on a
  document, inline or CAS-backed"), and on a remote it is written by cache materialisation, not
  by a completed write: each **adoption** rewrites it in its own transaction, a birth for the
  blobs of the revision it retains and an end for those of the revision its count pushes out, and
  a later **map build** appends to it, a birth refused once its revision is dropped. A
  **virtual's merged document** carries a declared list too, written by the merge commit that
  swaps the set in: `formats/debian.md` AC22 keeps a virtual's two previous merged generations
  reachable under `by-hash` for apt's publish race, and a virtual has no snapshot to hold them,
  so the current merged document declares its predecessors' digests and the swap is a birth for
  the generation it retains and an end for the one its count pushes out, exactly as an adoption
  is on a remote; the virtual's deletion ends the merged documents and every list they carry.
  A blob may be held by more than one root at once, and the sweep marks it while any holds:
  `formats/rpm.md`'s resolved merge-input decision (was its Q11) declares a fetched metadata
  document on the remote's list while the same blob is a cached file under its own reference,
  so it is collectable only once both the declaration and the cached reference have ended,
  whichever ends first. `proxy-cache.md`'s eviction pass settled which that is (its AC14 and
  AC29, amended by its Fable recheck): a cached file a declared list of the same remote holds
  is skipped while declared, since ending its reference would reclaim nothing and force a
  re-fetch of tens of megabytes, and it becomes an ordinary candidate at the adoption that
  drops its digest from every list of the remote, so on that layer the adoption always ends
  first and the eviction follows. The sweep does not lean on that courtesy: it marks the blob
  while either holds and is asserted in both orders, because it cannot know which layer ended
  what, and a commit of the digest while either root holds it is a dedup hit on the held blob
  through the shared call, storing no second object. All
  four producers are reference creations for the barrier: producing a pointer document,
  swapping a merged set with its declared list, appending a declared segment and rewriting a
  remote's list each go through the shared reference-creation call
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
  snapshot still holds it, which on a `remote` means an adoption superseding it beyond the
  declared retention count or the remote's deletion, and never LRU eviction - and hosted deletes reclaim space only through that
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
  decision in another coat. The cadence re-sign continues too (`repository-lifecycle.md`'s
  resolved document-only-transitions decision, was its Q11; `signing-service.md` AC22): it is a
  document-only pointer transition through the door's document-only form, so a frozen
  repository keeps producing pointer-document births and ends under the fourth root, and the
  sweep collects each superseded envelope past grace exactly as on an active one (AC24). The
  duty is the **tombstone**: deleting a `local` ends with the
  default pointer on a final empty checkpoint snapshot (`data-model.md` AC38), which the fifth
  root protects like any targeted snapshot; the move renders no pointer document, `data-model.md`
  AC36's one exception, and the pointer's existing record stays until tombstone time. When every
  content snapshot of the deleted
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
  blob lists widen the fourth root's reach. The 2026-09-28 closing sweeps tested it once more
  and added nothing: a claim and the `Retirement` it is checked against name coordinates, not
  blobs; an unchanged publish writes no reference at all; a document-only pointer transition (a
  repository batch, a virtual's merge commit or member-list change) changes no target, so the
  fifth root reads nothing new; a repository-scoped pointer document is a pointer document
  named by several records; and a virtual merged set's input record is non-root metadata
  (`data-model.md` AC36, AC45). `proxy-cache.md`'s metadata-eviction decision of the same day
  (was its Q21) tested it again and added nothing: it settled that eviction, the second root's
  end, never reaches a `remote`'s current documents, which were always this fourth root's
  current-document half, and its declaring-document decision (was its Q22) places a declared
  list on a package-level current document, a place the third reach already covered. Five
  roots, and every new record in
  `data-model.md`'s non-root table tolerates a dangling digest by design.

### The write transaction has one door

Handlers receive raw `*http.Request`, so the compiler holds none of the write path's
invariants; they hold only if every completed logical write passes through one place. That place
is **the sole write-transaction constructor in `internal/storage`**, unexported, so a caller that
tries to open a write transaction by any other route fails compilation rather than review. Six
things happen there and nowhere else:

- **Writability is checked before the transaction opens.** The constructor calls
  `repository.Writable(ctx, id)` (`repository-lifecycle.md`, "The state machine", AC9) and
  returns its typed refusal (`ErrReadOnly`, `ErrReplica`, `ErrDeleted`) without opening
  anything. Every completed write consults it this way - a client publish, a hosted delete, a
  metadata-only mutation, a management operation, a retention pass, a replication freeze, and
  every pointer create, repoint and deletion - and `replication.md`'s earlier architecture test
  that the write path refuses a repository with an active link generalises into this one check
  rather than standing beside it. Cache materialisation is not a completed write and does not
  pass through the door. A **document-only pointer transition** (`data-model.md` AC36: the
  cadence re-sign's repository batch, a virtual's merge commit and its member-list change) is
  neither, yet it writes a reference (the re-rendered pointer document's body) and advances a
  freshness record, so it opens at the same door in the door's **document-only form**, which
  calls `repository.Renewable(ctx, id)` instead: `nil` for an `active` or a `read_only`
  repository with no active replication link, `ErrReplica` or `ErrDeleted` otherwise
  (`repository-lifecycle.md`'s resolved document-only-transitions decision, was its Q11, AC9).
  The split is what keeps a frozen signed repository installable: a `read_only` state that
  stopped the cadence re-sign would let a Debian suite's `Valid-Until` or a Hackage TUF
  `timestamp.json` lapse and serve nothing within a window. The document-only form declares no
  claim and seals no snapshot, and it has no waiving entry point, since a follower renews
  nothing (`signing-service.md` AC23). Repository deletion is the one write the predicate does
  not gate (it is the transition out of every state) and it says so at the door explicitly, as
  a named exemption the architecture test knows, never as a second constructor; **the exemption
  covers the pre-commit hook and the pointer-document render as well** (`repository-lifecycle.md`,
  "Deletion", AC14): the deletion write produces one final empty snapshot stored as a
  checkpoint, runs no generator over the empty content set (a signed format's `Indexer` would
  otherwise regenerate an empty index into fresh current documents the fourth root held until
  tombstone time) and renders no pointer document for the default pointer's move onto that
  snapshot (`data-model.md` AC36's one exception). The replication
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
- **Claims are declared on the transaction and checked twice** (`management-api.md`, its
  resolved claimed-coordinate decision, was its Q14; `data-model.md` "Snapshots, pointers and
  what counts as a write", AC35). A write **claims** the coordinates it targets at the handler's
  retirement granularity, which may be finer than its authorization object (conda's
  `{subdir}/{filename}` under `{name}/{version}/{build}`, Conan's `{ref}#{rrev}` under `{ref}`).
  The transaction the constructor returns carries the claim set: `Submit` declares a `publish`
  operation's claims from what `Operator.Authorize` reported before it calls `Apply`, and a
  handler's own wire write that is not a binding (Conan's `PUT`, Open VSX's and npm's publish
  routes) declares its claims through `Deps` on the transaction it opened as soon as it knows
  them. **At declaration** the transaction reads the repository's `Retirement` records for the
  declared coordinates and refuses a retired one at once, so the handler does no further work.
  **At commit** it checks them again inside the commit step below, so a retirement committed by
  a concurrent write between the declaration and this commit refuses the write too. Either
  refusal is the typed `retired` refusal the caller renders (`management-api.md`, its resolved
  wire-rendering decision, was its Q16), and either way the transaction rolls back whole: no row,
  no snapshot, no pointer or freshness move, and the blobs committed before it opened are left
  grace-protected and unreferenced for the sweep (AC3, AC15). The claim set only grows during a
  transaction; nothing the handler does removes a declared claim.
- **The commit step is serialised on the repository head.** The repository head is the
  repository's default `Pointer` row, which every completed write already updates when its
  snapshot is sealed and the default pointer advances (`data-model.md`: every completed write
  creates exactly one snapshot and advances the default pointer). The commit step of every write
  that seals a snapshot or declared a claim (a pointer create, repoint or deletion does neither
  and keeps the pointer-state serialisation AC18 describes; a document-only transition declares
  no claim and seals no snapshot but advances the default pointer's freshness record, so it takes
  the same lock in the same place, and a repository batch updates the repository's pointer rows
  in one fixed order, the default pointer first, so two batches of one repository serialise
  rather than deadlock), run after the handler's changes and
  after the pre-commit hook, takes that row's lock first (`SELECT ... FOR UPDATE`), then
  re-reads `Retirement` for every declared claim, then seals the snapshot and advances the
  default pointer and its freshness record, then commits. A **retiring write**
  (a `delete-file`, `delete-version`, `delete-package` or `prune` whose `Outcome` names
  coordinates) writes its `Retirement` records in its own transaction and passes through the
  same commit step, holding the head lock until it commits, so a claiming write and a retiring
  write of one repository commit one after the other: whichever takes the lock second sees the
  other's committed rows, and a claim can never commit beside a concurrent retirement of the
  same coordinate. The lock is taken only for the commit step, never across `Apply` or the
  pre-commit hook, so index regeneration keeps `signing-service.md`'s per-document locking (its
  resolved contention decision, was its Q8, which rejected one writer per repository) and only
  the short seal-and-advance runs in repository order. A wait for the lock is bounded by the
  write's context deadline and ends as a retryable error with nothing committed. Two properties
  of the transaction make the re-check mean what it says. **It runs at `READ COMMITTED`**, the
  PostgreSQL default, where every statement takes a fresh snapshot, so the `Retirement` read
  issued after the lock is granted sees the retiring write that committed while this write
  waited; under `REPEATABLE READ` or `SERIALIZABLE` the transaction's snapshot predates the
  lock and the re-read would miss exactly the retirement it exists to catch, so the constructor
  fixes the level and no caller may override it. **The head lock is the last lock a write
  takes**: `signing-service.md`'s per-document locks (its resolved contention decision, was
  its Q8) are taken in `Apply` and the pre-commit hook, before the commit step, and the commit
  step takes no document lock after the head, so every write orders documents before head and
  two writes of one repository cannot deadlock across the two lock kinds. The order holds
  across repositories too: the share lock a virtual's member-list change takes on the member
  rows it reads (`data-model.md` AC36: the `local` member's pointer row, the `remote` member's
  document entries) is taken before the virtual's head lock, and a member's own write takes
  its documents and then its own head, so no transaction holds a head while waiting for a
  member row. In the on-a-transaction form below the runner's fenced job-row update follows the
  head, so the full order is documents, member rows, head, job row. The resolved
  head-serialisation question below (was Q12) records why this and not an isolation level or a
  per-coordinate lock.
- **An unchanged publish commits nothing** (`management-api.md`, its resolved unchanged-publish
  decision, was its Q15; `data-model.md` AC32). When a handler whose format declares the rule
  reports in `Outcome` that a `publish` found identical bytes (equal CAS digests) at every
  coordinate it claims, the constructor still runs the commit step's claim re-check under the
  head lock, because a retired claimed coordinate is refused `retired` whatever the bytes, and
  then commits no content: no reference is written, so no intent is cancelled and no blob gains
  a root; no document row, no snapshot, no default-pointer or freshness advance; and the
  pre-commit hook does not run, so no index is regenerated. The only row that transaction
  commits is the `Operation`'s terminal transition to `completed` with no snapshot reference and
  `unchanged: true`, which `Submit` writes. A handler that reports an unchanged outcome over a
  transaction in which it has already written a reference or a document row fails the write
  with nothing committed, since committing those rows would break "commits nothing" and
  discarding them silently would hide the handler's bug. For the collector an unchanged publish
  is inert: the bytes its client uploaded hash to digests the head already references, so it
  creates nothing to collect and ends nothing (AC31).
- **Reference creation inside the transaction is the shared call** (AC10), so the intent check
  is unconditional here as everywhere.

**The door has an on-a-transaction form, for the job runner.** `async-operations.md`'s `Finish`
opens the transaction a job's effect commits in, at `READ COMMITTED`, and ends it with the fenced
job-row update that makes a job's effect exactly-once; a worker whose effect is a repository
write (`manage.apply`, `retention.pass`, the merge swap, the cadence re-sign) therefore cannot
let the door open a transaction of its own. The on-a-transaction form takes the transaction
`Finish` opened, a repository and the worker's function, and does on that transaction everything
the standard form does: it calls `Writable` (or `Renewable`, for the document-only shape the
merge swap and the cadence re-sign have) before any repository row is read or written and
returns the typed refusal with the transaction untouched by the write, so the runner ends the
job `failed` with `read-only` (`repository-lifecycle.md` AC10); it carries the claims, declared
again by the job from its `Operation`; it runs the pre-commit hook; and it runs the commit step,
head lock last, before it returns control to `Finish`. The form is callback-shaped so no write
scope can escape it unsealed: the commit step runs when the worker's function returns, and
`Finish`'s fenced update of the job row follows the head lock, the order `internal/repository`'s
deletion also takes (repository rows, then the job rows `CancelByRepository` touches inside the
deletion transaction), so a job's `Finish` and a deletion cancelling that job never deadlock.
Two things the form cannot do and therefore checks: it cannot open the transaction, so it reads
the joined transaction's isolation level and refuses any but `READ COMMITTED`, the level the
claim re-check depends on; and it cannot commit, so the runner's commit after its fenced update
is the one `Commit` for that transaction. `proxy.revalidate`, whose adoption commits before
`Finish` in `proxy-cache.md`'s own transaction, never takes this form, since cache
materialisation does not pass through the door (AC25, AC30).

The architecture test in `internal/storage/arch_test.go` asserts all of it: the constructor is
the only function that opens or joins a write transaction, its standard form calls `Writable`
before `BeginTx` and its document-only form calls `Renewable` and has no waiving entry point,
the deletion exemption is the one place the predicate, the hook and the render are skipped, it
runs the registered hook between the handler's changes and the commit step, the commit step
takes the head lock before it re-reads the declared claims and before it seals the snapshot, the
transaction is opened at `READ COMMITTED` and nothing sets another isolation level on it, the
on-a-transaction form reads the joined transaction's level and refuses any other, no
per-document lock and no member-row share lock is taken after the head lock, the job row is
touched only after the head in the on-a-transaction form, the claim
declaration is a method of the transaction type and no other code path reads `Retirement` to
decide a write, the only way to `Commit` the standard form is through that step and the
on-a-transaction form's commit step runs before control returns to `Finish`, and no package
other than `internal/storage` reaches the transaction type's constructor (AC25, AC30). This is
the named mechanical enforcer the constitution requires for a shared concern; a door enforced by
review is not a door.

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

`--restore-dangling` is the repair mode for the two classes that are loss rather than leak. A
dangling row exists in exactly one legitimate way: a database restored to time `T` against a
bucket the sweep kept deleting from until `T'`. The row is truth and the object is gone, and it
is recoverable **only because `deployment.md` makes bucket versioning (or an equivalent
soft-delete window at least as long as the database backup retention) a deployment requirement**
(its resolved bucket-versioning decision, was its Q10). With versioning present, the checker
restores each dangling row's object from its latest non-current version, verifies the restored
bytes against the key before declaring the row healed, and re-reports; without versioning it
reports the rows as unrecoverable and exits non-zero rather than pretending. A digest mismatch,
whether carried as the read path's mark or found by `--verify`, is the same loss with the object
still present, and the same flag repairs it the same way: the checker walks the key's versions
newest first, restores the first whose bytes hash to the key, verifies, clears the mark and
re-reports, and reports the row unrecoverable when no version verifies. Restore is the
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
  per-repository quota (which ends a cached reference and deletes no object), run over remotes
  that hold, beside their cached files, current metadata documents at every level, inline and
  CAS-backed, and declared lists keeping retained revisions' blobs, so that every eviction the
  generator schedules has a remote's metadata within reach and must end none of it (without such
  remotes, an eviction that wrongly took a document would never be generated and the fourth
  root's protection of a remote's live index would pass vacuously), snapshot pruning at
  the retention boundary, repository grace refresh, an **upload session held open inside its
  idle window** - continued by chunk or status requests while the sweep runs, with earlier
  blobs of the same repository committed and unreferenced - and session abandonment, a session
  left to expire by its idle period or its absolute cap. Without the open session the grace
  hold is never exercised and a paused resumable upload is never raced against the sweep;
  without abandonment the hold is never released. The same pair exists for jobs: a **queued or
  retrying job naming a repository** whose bytes are committed and unreferenced while the sweep
  runs, and its **terminal transition** (`completed` with the referencing write, `failed`, or
  `cancelled` by a repository deletion), without which the job hold is a root that can be born
  and never die, plus a **job without `holds_grace`** (a `proxy.revalidate`) pending over a
  remote whose grace has lapsed, which the sweep must read as no hold at all (AC23). The **lifecycle operations** of `repository-lifecycle.md` are in the
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
  `File` row and no snapshot mediates (AC16). Declared-list births and ends have three producers
  beyond a completed write, and the generator must use all three: a **virtual's merge commit**,
  whose swap rewrites the merged document's declared list so the retained predecessor
  generations stay declared and the one its count pushes out leaves, and whose deletion ends the
  list with the document; a **remote's adoption**, rewriting
  the declaring document's list so a retained revision's blobs stay declared and those of the
  revision the declared count pushes out leave, on a repository-level declaring document and on
  package-level ones with adoptions of different packages interleaved, and a **map build**
  appending a digest for a revision that is current or retained, including one that loses the race to an adoption dropping
  its revision and is refused, each on a declaring document whose body is sometimes inline and
  sometimes CAS-backed, since the list is marked either way (shared with `proxy-cache.md` AC27).
  The generator must also reach a **blob held by two roots at once**: a cached file that a
  remote's list also declares, with an eviction pass scheduled against it before the adoption
  dropping its revision (which must end nothing, `proxy-cache.md` AC14) and after it (which
  ends the cached reference), and with the cached reference ended directly before the
  adoption, so the suite shows the blob marked while either holds, collected only after both
  ends in either order and never after one, and a commit of its digest while held a dedup hit
  storing no second object; and a **cache fill on a remote whose
  grace has lapsed**, with the sweep's phases schedulable between the fill's object put and its
  row commit and after that commit, so the suite shows the row and its reference land together
  and the fill refreshes the grace (AC8). Those births and deaths also arrive through the
  document-only pointer transitions, so the set includes a **key switch or cadence re-sign**
  re-rendering one pointer's documents, the cadence re-sign also on a `read_only` repository
  through the door's document-only form, a **repository batch** replacing a repository-scoped
  pointer document on every pointer at once, and a virtual's **member-list change**, with the
  merged set's input record present on some swaps and absent on others so the suite can show it
  changes no marked set (`data-model.md` AC36, AC45). The **retirement machinery** needs two
  more (AC30, AC31): a **write declaring a claim on a coordinate that a concurrent retiring
  write** (`delete-version`, `delete-file`, `prune`) **retires**, with the claim's declaration,
  the retiring write's commit and the claiming write's commit step as schedulable interleaving
  points, so the generator reaches the one order the declaration check cannot see (declared,
  then retired, then committed) as well as the two it can; and an **unchanged publish**
  interleaved with the sweep and with a non-retiring delete of the same coordinate, which must
  leave the reference set, the snapshot table, every pointer and every freshness record exactly
  as it found them. Without the first, the commit-time check is asserted by nothing and the
  serialisation on the head is untested; without the second, the one completed operation that
  writes nothing is never raced against a reference ending. A generator limited to fresh-content pushes cannot reach the deadliest
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
  abort (AC21), then **commit the correct bytes of that digest** with the sweep's phases
  interleaved and read again, which is the only way to reach the heal (AC21); **fail the
  pre-commit hook** after the handler's changes and assert nothing of
  the write is visible afterwards (AC25); and **delete an object behind a live row**, and
  separately **corrupt one**, to
  manufacture the dangling and mismatching states `--restore-dangling` repairs, against a
  versioned store and against an unversioned one (AC27).
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
      unexpired, or while any unfinished job carrying `holds_grace` names its repository.
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
- [ ] AC8: GC treats a blob referenced only by a cached file (arrived `on_demand`, no
      published reference) as live, and treats it as collectable once LRU eviction under the
      per-repository quota removes that last cached reference, proven in the same property
      suite as AC4. This is the second reference class from `data-model.md`; it is asserted
      here as well so this spec's own gate covers the failure mode its resolved
      collection-strategy question names. A cache fill on a remote whose grace has lapsed on
      the injected clock commits the `Blob` row and the cached reference in one transaction and
      refreshes the remote's grace: with the sweep's phases scheduled between the fill's object
      put and its row commit and immediately after that commit, no run observes the row
      unreferenced, the object before the commit is left to the orphan scan under raw age, and
      the filled blob survives every sweep until the reference is evicted and the grace lapses
      again. A blob that is both a cached file and a blob a remote's document declares is
      marked while either holds: an eviction pass run against it while it is declared ends
      nothing (`proxy-cache.md` AC14, AC29), it is collected only after the adoption dropping its
      declaring revision and the end of its cached reference have both happened, in either order
      on the sweep's side (the eviction pass only ever produces adoption first; the suite ends the
      cached reference directly for the other order), never after one, and a commit of its
      digest while either root holds it is a dedup hit on the held blob, storing no second
      object.
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
      dropped with its pointer or at tombstone time, and re-rendered at every document-only
      transition with the old body collected once no record names it), a repository-scoped
      pointer document named by every pointer of its repository (live while any pointer's record
      names it, its predecessor collected after the repository batch that replaced it on every
      pointer), a virtual repository's merged documents (live until the atomic swap replaces
      them or the virtual is deleted, then collected, with the sweep's marked set identical
      whether or not the set's input record is present), and every blob a document's declared
      blob-digest list names (live while any current or retained document declares it, whether
      the declaring document's body is inline or CAS-backed, collected once none does), while a
      blob a document only mentions in its body and does not declare is collected; each proven in
      the property suite, whose declared-list births and ends come from completed writes, from a
      virtual's merge commit rewriting its merged document's list, from a
      remote's adoption rewriting its repository-level or package-level list and from a map build
      appending to it
      (shared with `proxy-cache.md` AC27), and by fixtures with an append-only multi-segment index
      whose oldest segment becomes undeclared, with a remote whose retained revision's blobs,
      declared on an inline repository-level document, survive a sweep run with the grace lapsed
      and are collected by the first sweep past grace after the adoption that drops them, and
      with a virtual whose merged document declares its two predecessor generations
      (`formats/debian.md` AC22): after three merge commits with the grace lapsed and a sweep
      after each, generations N-1 and N-2 are in the store and served under `by-hash`, N-3 is
      collected by the first sweep after the swap that dropped it, the swap with the sweep paused
      after its mark and after intent recording leaves every declared generation in the store,
      and the virtual's deletion followed by a sweep past grace collects every generation. No
      eviction ends any of it: with a remote's current documents at the repository, package and
      version levels, CAS-backed and inline with declared lists, and the remote far over its
      quota, every eviction the property suite schedules leaves each of those bodies and declared
      blobs marked through the sweep that follows, and a remote's document body is collected only
      after an adoption supersedes it beyond the declared count or after the remote's deletion;
      and a retained revision's blobs declared on a package-level document of the remote behave as
      those declared on the repository-level one (shared with `proxy-cache.md` AC27 and AC29).
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
      writes, retiring writes among them, whose `Retirement` records name no blob; a write
      refused on a claim, which commits nothing and leaves its blobs to grace and the sweep;
      and repository deletion and `reclaim: now` (`internal/repository`), which end
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
      whole and by any range; a range over a stored document consisting of declared blobs, and
      each range of a multi-range request, is verified through the segments of the part blobs
      covering it and aborted the same way when one of them is altered; a read resolved
      through in-flight upload records verifies identically; and a commit of a digest whose row
      carries the mark is not treated as a dedup hit: it uploads the verified bytes under the key
      through the intent gate, clears the mark in the same transaction as its reference, deletes
      nothing, and a read after it, whole and by range, succeeds against the healed object, with
      the sweep's phases interleaved at every point of that commit and no run losing the
      referenced blob.
- [ ] AC22: The verified read path is within budget: `internal/storage/bench_test.go`
      benchmarks a verified full read and a verified tail range read of a multi-gigabyte blob
      against their unverified equivalents, each with a `// gate:` comment, the verified full
      read sustains at least 90 percent of the unverified throughput, the tail range read fetches
      at most two 4 MiB segments beyond the requested window from the store, and a regression
      beyond either budget fails the `main` build through the same gate as AC7.
- [ ] AC23: An unfinished `Job` naming a repository and carrying `holds_grace` (copied from its
      kind's `HoldsGrace` registration at enqueue, true for every kind but `proxy.revalidate`)
      holds that repository's grace open: on an
      injected clock, a blob committed in a repository and not yet referenced survives a sweep
      run after the grace period has elapsed since the repository's last other write, provided a
      job naming the repository is `pending` or `running` (including one retrying after a
      failed attempt), and is collected once that job is `completed`, `failed` or `cancelled` and
      the grace then lapses; a repository deletion that cancels the job releases the hold only
      at the job's terminal transition, never at the deletion's commit; the sweep decides the
      hold from the row's flag and loads no kind registry; a `proxy.revalidate` job naming a
      remote, which declares `HoldsGrace: false`, holds nothing: with one `pending` and deferred
      by `RetryAt` under a stand-in upstream whose rate limit never lifts, a sweep past the
      remote's grace collects the remote's evicted, unreferenced bytes while the job is still
      `pending`, and no byte the job's adoption commits is unreferenced across any sweep (AC8);
      the mark-root set is unchanged at five; proven in the same property suite as
      AC4 with the queued-or-retrying job, its terminal transition and the flagless job in the
      operation set
      (`async-operations.md` AC13 and `data-model.md` AC41 state the same hold from their
      sides).
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
      and the sweep proceed unchanged and the cadence re-sign proceeds through the door's
      document-only form, each re-render a pointer-document birth and an end whose superseded
      body the sweep collects past grace (`repository-lifecycle.md` AC10 shows a real client
      accepting the renewed envelope).
- [ ] AC25: Exactly one unexported constructor in `internal/storage` opens or joins a write
      transaction, it calls `repository.Writable` before the transaction begins and returns its
      typed refusal without opening one, its document-only form (taken by every cadence re-sign,
      merge commit and member-list change) calls `repository.Renewable` instead, proceeds on a
      `read_only` repository and has no waiving entry point, repository deletion is the single
      named exemption the architecture test knows and the exemption skips the writability check,
      the pre-commit hook and the pointer-document render together (a fixture `Indexer`'s
      generator is never called and no `PointerDocument` body appears for the deletion's
      default-pointer move), its one `ErrReplica`-waiving entry point is imported by
      `internal/replication` alone and still refuses `ErrReadOnly` and `ErrDeleted`, its
      on-a-transaction form, callback-shaped and used only inside `async-operations.md`'s
      `Finish`, runs the same predicate, claims, hook and commit step on the transaction
      `Finish` opened, refuses a joined transaction at any level but `READ COMMITTED`, returns a
      predicate refusal before any repository row is touched, and runs its commit step before
      control returns to the runner, whose fenced job-row update follows the head lock, it runs
      the registered pre-commit hook after the handler's changes
      and before commit in the same transaction with the snapshot's content set visible to the
      hook, and a hook that fails commits nothing - no row, no snapshot, no pointer move - while
      the blobs committed before the write stay as grace-protected unreferenced bytes; enforced by
      an architecture test over the module and a fault-injection test that fails the hook, in
      the standard form and inside a job's `Finish`.
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
      dangling rows; after an object is corrupted behind a live row, whether the row is marked
      by a failed read or the mismatch is found by `--verify`, the same run restores the newest
      version whose bytes hash to the key, clears the mark, and a second run reports zero
      mismatches; on a store without versions, or with no version that verifies, the same run
      reports the row as unrecoverable
      and exits non-zero; and the restore is the checker's only write to the store, a
      `PutObject` of bytes that hash to the key and never a delete, so AC15's architecture scan
      passes with the checker included.
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
- [ ] AC30: The transaction the sole write-transaction constructor returns carries the write's
      claim declarations and checks each against the repository's `Retirement` records when it
      is declared and again in the commit step, which takes the repository's default `Pointer`
      row lock before it re-reads the claims, seals the snapshot and advances the pointer, and
      which every retiring write passes through holding that lock until it commits: a claim on
      a coordinate already retired is refused at declaration before the handler writes anything
      further; in the property suite, with a write claiming a coordinate and a concurrent
      retiring write of the same coordinate interleaved at the declaration, the retiring
      commit and the claiming commit step in every order, no run commits a claimed coordinate
      beside or after its retirement, the order declared-then-retired-then-committed is refused
      at commit, and a claim on a sibling coordinate under the same authorization object commits;
      a write refused at either point commits no row, no snapshot, no pointer or freshness move
      and no reference, and the blobs committed before it opened stay unreferenced, survive the
      sweep while the repository's grace holds and are collected once it lapses, with no object
      deleted outside the sweep's delete pass and the orphan scan; the head lock is not held
      across `Apply` or the pre-commit hook; the transaction runs at `READ COMMITTED`, shown by
      the declared-then-retired-then-committed order being refused at commit and by the same
      order under a transaction forced to `REPEATABLE READ` in a test build committing the
      retired coordinate, which is the failure the level rules out; no per-document lock is
      taken after the head lock, so a write holding a document lock and waiting for the head
      and a write holding the head never both exist; a virtual's member-list change takes its
      share lock on the member rows before the virtual's head lock, and a job's `Finish` touches
      the job row only after the head, so a member's write, the virtual's change, a deletion
      cancelling a job and that job's `Finish` interleaved in the property suite never deadlock;
      the on-a-transaction form handed a transaction forced to `REPEATABLE READ` in a test build
      refuses it before any row is touched; and the architecture test fails on a
      `Commit` reached other than through the commit step, on a commit step that re-reads
      claims before taking the head lock, on a transaction opened at or set to any isolation
      level but `READ COMMITTED`, on a document lock or a member-row share lock taken after the
      head lock, on a job-row write before the head in the on-a-transaction form, and on any
      code path outside the transaction type that reads `Retirement` to decide a write.
- [ ] AC31: An unchanged publish commits nothing but its `Operation`: on a fixture handler
      declaring the rule, a `publish` whose every claimed coordinate already holds identical
      bytes still has its claims re-checked in the commit step (a retired claimed coordinate is
      refused `retired` with identical bytes), and then writes no reference, cancels no
      deletion intent, writes no document row, seals no snapshot, advances no pointer and no
      freshness record and does not run the pre-commit hook, the transaction committing only the
      `Operation`'s terminal transition with no snapshot reference and `unchanged: true`; a
      fixture handler reporting an unchanged outcome after writing a reference or a document
      row in the transaction fails the write with nothing committed; and in the property suite
      an unchanged publish interleaved with the sweep and with a non-retiring delete of the same
      coordinate leaves the reference set, the snapshot table, every pointer and every
      freshness record unchanged and loses no blob reachable from any root.

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
| AC8 | property + fault injection | `internal/storage/gc_property_test.go` (cached reference as a root, eviction as its end; the cache fill on a lapsed-grace remote with the sweep's phases between object put and row commit; the blob held by a cached reference and a declared list: an eviction pass against it while declared ending nothing, the dropping adoption then eviction, and the cached reference ended directly first, shared with `proxy-cache.md` AC14's `internal/proxy/eviction_test.go`); `internal/storage/cache_fill_atomicity_test.go` (row and reference land in one transaction, the fill refreshes grace, the pre-commit object is the orphan scan's under raw age; shared with `proxy-cache.md`'s fetch-and-cache commit and with `async-operations.md` AC13's `internal/async/kinds_test.go`, which interrupts every `HoldsGrace: false` kind's `Work` at each fault point and finds no unreferenced `Blob` row) |
| AC9 | property | `internal/storage/gc_property_test.go` |
| AC10 | architecture test | `internal/model/arch_test.go` |
| AC11 | property + integration | `internal/storage/gc_property_test.go`; reporting: `internal/model/snapshot_test.go` |
| AC12 | fault injection | `internal/storage/gc_race_test.go` |
| AC13 | fault injection | `internal/storage/intent_gate_test.go` (commit interleaved with delete pass) |
| AC14 | integration | `internal/storage/retention_test.go` |
| AC16 | property + integration | `internal/storage/gc_property_test.go` (metadata-document root, pointer documents re-rendered on target-moving and document-only transitions, a repository batch over every pointer, merged-set swap rewriting the merged document's declared list and virtual deletion with and without the input record, declared segments, declared-list births and ends from a virtual's merge commit, from a remote's adoption and from a map build, including a map build refused after its revision is dropped, on inline and CAS-backed declaring documents; shared with `data-model.md` AC34 and AC45 and with `proxy-cache.md` AC27); `internal/storage/metadata_blob_gc_test.go` (Debian-scale index; multi-segment index whose oldest segment becomes undeclared; dropped pointer document; a repository-scoped pointer document's predecessor after a batch; a digest mentioned in a document's body but not declared collected; a remote's inline repository-level document declaring a retained revision's blobs across an adoption, a sweep with the grace lapsed, and the dropping adoption; the same on a package-level document; a virtual's merged document declaring two predecessor generations across three merge commits, the swap paused against the sweep's mark and intent phases, and the virtual's deletion, the fixture shared with `formats/debian.md` AC22's virtual by-hash case and `signing-service.md`'s merge swap), shared with `proxy-cache.md` AC27's `internal/proxy/retained_revision_test.go`; the property suite's eviction operation over remotes holding current documents at every level and declared lists, no eviction ending a document reference, shared with `proxy-cache.md` AC29's `internal/proxy/metadata_eviction_test.go` |
| AC15 | architecture test | `internal/storage/arch_test.go` (module-wide deleter scan naming `internal/repository`, `internal/manage`, the proxy cache and the checker) |
| AC17 | property + integration | `internal/storage/gc_property_test.go` (pointer-target root); `internal/storage/retention_test.go` (aged pointer target still serving) |
| AC18 | property + integration | `internal/storage/gc_property_test.go` (repoint interleaved with the sweep and with pruning's phases); `internal/storage/retention_test.go` (release then prune) |
| AC19 | integration | `internal/model/pointer_test.go` (out-of-window pin reporting); `internal/storage/gc_metrics_test.go` (the two pin gauges rise and fall with the report) |
| AC20 | property | `internal/storage/gc_property_test.go` (open-session and session-abandonment operations on an injected clock that ages sessions past the idle period and the cap) |
| AC21 | fault injection + integration | `internal/storage/read_verify_test.go` (altered object whole and by range; a range over a declared-parts document and a multi-range request with one covering part altered, shared with `signing-service.md` AC30; abort shape; mismatch mark; in-flight read; a commit of the marked digest re-uploading through the intent gate with the sweep's phases interleaved, the mark cleared with the reference, no delete call, and the healed object read whole and by range; shared with `data-model.md` AC43, which asserts the `Blob` row's `segment_digests` and mark from the model side) |
| AC22 | benchmark | `internal/storage/bench_test.go` (verified versus unverified full read and tail range read, `// gate:` comments; store egress counted by a recording backend) |
| AC23 | property + integration | `internal/storage/gc_property_test.go` (queued-or-retrying job and its terminal transition in the operation set); `internal/storage/pending_operation_gc_test.go` (forced sweep past grace with a pending and a retrying job; release at terminal, not at deletion commit; the hold read from the row's `holds_grace` with no kind registry loaded; a `proxy.revalidate` job deferred by `RetryAt` under a stand-in upstream that always answers a rate limit holding nothing, the remote's evicted bytes collected past grace while it is `pending` and no adopted byte ever unreferenced, shared with `async-operations.md` AC13) |
| AC24 | property + integration | `internal/storage/gc_property_test.go` (lifecycle operations in the operation set, interleaved with the sweep and pruning's phases); `internal/storage/retention_test.go` (age-out and `reclaim: now` on the injected clock; tombstone drop pairs pointer and snapshot; retention pass suspended on `read_only` while pruning continues and the cadence re-sign proceeds through the document-only form, the superseded pointer-document body collected past grace; the client half is `repository-lifecycle.md` AC10's `conformance/debian/readonly_test.go`) |
| AC25 | architecture test + fault injection | `internal/storage/arch_test.go` (sole unexported write-transaction constructor; `Writable` before `BeginTx`; the document-only form calling `Renewable` with no waiving entry point; hook between handler changes and `Commit`; deletion as the named exemption skipping predicate, hook and render; the on-a-transaction form's isolation check and its commit step before control returns to `Finish`; the `ErrReplica` waiver's single importer, shared with `repository-lifecycle.md` AC9 and `replication.md` AC12); `internal/repository/writable_test.go` (the waiver still refusing `read_only` and `deleted`; `Renewable` passing `read_only`, shared with `repository-lifecycle.md` AC9); `internal/repository/delete_test.go` (no hook run and no pointer document rendered on a fixture `Indexer`, shared with `repository-lifecycle.md` AC14); `internal/storage/write_hook_test.go` (failing hook commits nothing, in the standard form and inside a fixture job's `Finish`, where the job ends `failed` and nothing of the write commits; content set visible to the hook) |
| AC26 | architecture test + integration | `internal/storage/arch_test.go` (no direct advisory-lock call outside `internal/db/lock`); `internal/storage/sweep_lock_test.go` (two concurrent `storage.sweep` jobs, one acts; schedules at the configured intervals on the injected clock) |
| AC27 | integration | `internal/storage/restore_test.go` (dangling row on a versioned and an unversioned store; a corrupted object behind a live row, marked by a read and found by `--verify`, restored from the newest verifying version with the mark cleared, and reported unrecoverable when no version verifies; restore verified against the key; second run clean; checker in the AC15 scan) - the same file `deployment.md` AC21 runs |
| AC28 | integration | `internal/storage/gc_metrics_test.go` (every named metric and label through `telemetry.NewTestRecorder`; alert conditions evaluated against recorded values) |
| AC29 | integration | `internal/storage/config_test.go` (schema registration and defaults; each key read by its component on the injected clock; per-repository override; unregistered `gc.` key refused) |
| AC30 | property + integration + architecture test | `internal/storage/gc_property_test.go` (a claim racing a retiring write of the same coordinate, with the declaration, the retiring commit and the claiming commit step as schedulable interleaving points, beside the sweep; refused writes' blobs collected after grace; this claim race is shared with `data-model.md` AC35, whose row names the same file); `internal/storage/write_claim_test.go` (refusal at declaration; declared-then-retired-then-committed refused at commit with nothing committed, and the same order committing the retired coordinate under a test-build transaction forced to `REPEATABLE READ`, which is the outcome the fixed level rules out; sibling claim under one object accepted; head lock taken before the re-check and not held across `Apply` or the hook; a write holding a document lock and one holding the head never coexist; the on-a-transaction form refusing a `REPEATABLE READ` transaction before touching a row; a member-list change's share lock before the virtual's head and a fixture job's row written after the head, a member write, the virtual's change, a cancelling deletion and the job's `Finish` interleaved without deadlock; lock wait ending retryable at the context deadline); `internal/storage/arch_test.go` (the only `Commit` is the commit step; lock before re-check; the transaction opened at `READ COMMITTED` with no isolation override, the on-a-transaction form checking the joined level; no document lock or member-row share lock after the head lock; no job-row write before the head; no `Retirement` read outside the transaction type); shared with `data-model.md` AC35's `internal/model/retirement_test.go` and `management-api.md` AC12's `internal/manage/retirement_test.go` |
| AC31 | property + integration | `internal/storage/gc_property_test.go` (the unchanged publish interleaved with the sweep and a non-retiring delete of the same coordinate; reference set, snapshots, pointers and freshness records unchanged); `internal/storage/write_claim_test.go` (claim re-check still run; retired claim refused with identical bytes; no reference, document, snapshot, pointer or freshness advance and no hook run; the `Operation`'s terminal transition the only committed row; an unchanged outcome over handler-written rows fails with nothing committed); shared with `data-model.md` AC32's `internal/model/operation_test.go` and `management-api.md` AC5's `internal/manage/accounting_test.go` |

## Implementation Phases

### Phase 1: CAS
- Digest addressing, object store abstraction, simple upload
- The verified read path: hashing reader on every read, segment digests at commit, range
  verification, the mismatch mark and metric, and the marked row's heal on the next commit of
  its digest (AC21)
- The sole write-transaction constructor with `repository.Writable`, its document-only form with
  `repository.Renewable`, its on-a-transaction form for the job runner, the deletion exemption
  and the pre-commit hook, and its architecture test (AC25); the claim declaration, the commit step under the head lock
  with its claim re-check, and the unchanged publish's empty commit (AC30, AC31); the `gc.` keys
  registered in the schema (AC29)

### Phase 2: Chunked upload
- Resumable sessions under `data-model.md`'s upload-session definition and lifetime, digest
  verification, orphan records

### Phase 3: GC
- The chosen strategy, plus the property and fault-injection suites **written before it**,
  the open-session and job-held grace holds included, the latter read from `holds_grace` with
  the flagless `proxy.revalidate` holding nothing (AC20, AC23), the lifecycle operations
  in the operation set (AC24), the fourth root's widened reach with the document-only
  transitions and the virtual merge, the remote adoption and the map build as declared-list
  producers, the blob held by two roots and the cache fill on a lapsed-grace remote (AC8,
  AC16), the marked row healed by a commit (AC21) and the claim racing a retiring write and the
  unchanged publish (AC30, AC31)
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
`artifact-verification.md`, was adopted under the owner's standing delegation, and a twelfth,
raised by the 2026-09-28 closing sweep when the claim declaration arrived from
`management-api.md` and `data-model.md`, was adopted the same way on Opus. Both adoptions were
rechecked on Fable on 2026-09-30 and confirmed, each with an amendment recorded in its
resolved record. Each is folded
into Design, Scope, the acceptance criteria and the Test Plan above, with each decision's
accepted cost recorded beside it under the Resolved headings, kept rather than deleted so the
reasoning survives the next time someone asks why it was done this way.

### Resolved: what the commit-time claim check serialises on (was Q12)

**Adopted 2026-09-28 under the owner's standing delegation, on Opus.** Option A: the repository
head is the repository's default `Pointer` row; the commit step of every write that seals a
snapshot or declared a claim takes that row's lock after `Apply` and the pre-commit hook, re-reads
`Retirement` for the declared claims under it, then seals the snapshot, advances the pointer and
commits, and every retiring write holds the same lock from its own commit step to its commit.
Folded into Scope, Design ("The write transaction has one door", the single-deleter bullet and
the property operation set), AC30, AC31 and their Test Plan rows.

`management-api.md` (its resolved claimed-coordinate decision, was its Q14) and `data-model.md`
(AC35) settled that a claim is checked at declaration and again at commit, "where the check
serialises with any retiring write on the repository head", and placed that seam on this spec's
constructor. Neither says what the head is or what primitive does the serialising, and the
answer is load-bearing: a commit-time re-check that reads `Retirement` without serialising with
the retiring write is a check-then-act race of exactly the shape AC9 and AC18 close for intents
and pointers, and a retired coordinate republished with different bytes is a supply-chain event
no client-level test sees.

**Recommendation:** A, because every completed write already updates the default pointer row
when it advances the pointer, so ordering the re-check behind that row's lock adds no new lock,
serialises only the short seal-and-advance, and leaves index regeneration on the per-document
locks `signing-service.md` chose.

| Option | You get | It costs |
|---|---|---|
| **A. Lock the default `Pointer` row in the commit step, re-check claims under it** (adopted) | Race-free re-check with the lock completed writes already contend on; `Apply` and the hook stay parallel; a retiring and a claiming write commit in a definite order | Completed writes of one repository run their seal-and-advance one at a time; a commit refused at this point has already paid for its regeneration; an unchanged publish takes a lock it does not update behind |
| **B. `SERIALIZABLE` isolation on every write transaction** | The database detects the conflict with no named lock | Serialisation failures and retries on unrelated writes that happen to read overlapping ranges, index regeneration included, which is the retry storm `signing-service.md`'s resolved contention decision (was its Q8) chose locks to avoid; GC's own check-then-act rules would then rest on two different concurrency models |
| **C. A per-coordinate advisory lock taken by the claim and by the retirement** | Commits of different coordinates stay fully parallel | A new key family in `deployment.md`'s advisory-lock space, one lock per claim on a batch publish with a deadlock-avoiding order to hold, and the head still has to serialise for the snapshot sequence, so the parallelism bought is not usable |

**Why this is yours:** it fixes the concurrency primitive the write path's retirement guarantee
rests on and the order in which every completed write of a repository commits.

Accepted cost: seal-and-advance is serial per repository, and a write refused at commit has
already regenerated its index; the declaration-time check keeps that to the one order it cannot
see. B lost because it trades one named lock for retries everywhere, including the regeneration
the contention decision protected; C lost because it adds a lock family to buy parallelism the
snapshot sequence cannot use.

**Rechecked on Fable 2026-09-30: confirmed, amended.** The options were framed fairly and A is
right: the head row is the one lock every completed write already contends on, and the
declaration-time check bounds the wasted regeneration to the one order a commit-time check alone
would pay for. The fold under-stated two things the option depends on, now in Design and AC30.
First, the re-read after the lock only sees the retiring write's commit at `READ COMMITTED`;
under `REPEATABLE READ` or `SERIALIZABLE` the transaction's snapshot predates the lock and the
re-check misses exactly the retirement it exists to catch, so the level is fixed by the
constructor and asserted, not assumed (this is also why option B was more than a retry-storm
question: it would have needed a different re-check). Second, the option takes a second lock
kind behind `signing-service.md`'s per-document locks, and it is deadlock-free only because the
head is always the last lock a write takes; that ordering is now stated and held by the
architecture test. The accepted cost stands as written.

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

**Rechecked on Fable 2026-09-30: confirmed, amended.** C is the right option and the table
prices it honestly. What the fold left out was the mark's consequence: the read path marks a
`Blob` row on a mismatch and never repairs it, `--restore-dangling` repaired only missing
objects, and the dedup check trusts every row, so a corrupted object was permanent: a client
re-pushing the correct bytes would be told the content was already stored and every later pull
would abort on the same object. Design ("A marked row is not a dedup hit"), the checker
section, AC21 and AC27 now close it: a commit of a marked digest re-uploads through the intent
gate and clears the mark, and the checker restores a mismatch from the newest verifying bucket
version. Neither adds a deleter, and neither changes the option chosen.

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
| 2026-09-28 | 1356a03 | closing-sweep reconciliation pass on Opus (step 3): cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Applied every item in `agents/spec-loop/consequences.md` targeting this file from "From format batch 3 reconciliation" through "From the data-model.md closing sweep", each verified against the current text of its source. Format batches 3 to 8, the auth, signing-service and proxy-cache closing sweeps name no item here; the two that do are the same request, management-api closing sweep item 2 and data-model closing sweep item 1, read against `management-api.md` was-Q14 and was-Q15 and `data-model.md` AC32 and AC35 as settled. "The write transaction has one door" now carries the claim declaration (from `Authorize` through `Submit`, or through `Deps` for a non-binding wire write), the declaration-time refusal, and a commit step that takes the repository head lock, re-reads `Retirement` for every claim, seals and advances, and through which every retiring write passes holding the lock until it commits; the lock is never held across `Apply` or the pre-commit hook, keeping `signing-service.md`'s per-document locking. An unchanged publish runs the re-check and then commits only its `Operation`'s terminal transition, with no reference, document, snapshot, pointer or freshness move and no hook, and an unchanged outcome over handler-written rows fails. Q12 raised and adopted under the standing delegation (the head is the default `Pointer` row, over `SERIALIZABLE` and per-coordinate advisory locks); `fable_recheck` added. The single-deleter bullet and AC15 name retiring writes and claim refusals as non-deleters. The property operation set gains a claim racing a retiring write of the same coordinate, with the declaration, the retiring commit and the claiming commit step as interleaving points, and the unchanged publish interleaved with the sweep and a non-retiring delete (AC30, AC31, each with a Test Plan row shared with data-model AC32 and AC35 and management-api AC5 and AC12). Fourth-root reach checked against `data-model.md` AC34, AC36 and AC45 and the pointer-held documents of `debian.md` and `hackage.md`: pointer documents re-rendered at document-only transitions, the repository-scoped `root.json` and `mirrors.json` across a repository batch, merged documents collected at swap or virtual deletion with the input record non-root, and the declared list stated as the only way a document keeps another blob alive (a digest merely mentioned in a body is metadata), with the op set and AC16 extended. Range reads over declared-part documents and multi-range requests verified per part (`signing-service.md` AC30; AC21). Mark roots still exactly five; nothing found that would add a sixth. `node scripts/check-spec.js` zero failures on this file. Stays draft pending a gate review. |
| 2026-09-28 | 36a137d | data-loss fix, second wave, on Opus (data-loss fix item 3): cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Applied item 3 of "From the data-loss fix" in `agents/spec-loop/consequences.md`, verified against `proxy-cache.md`'s resolved retained-revision and old-blob decisions (was its Q19 and Q20, AC27, AC28) and `data-model.md`'s "Declared blob digests on a document, inline or CAS-backed" as amended in the same pass. The fourth root's "merely mentions" examples (a retained upstream revision's index, a per-revision map) stood as unanswered hazards; they now cite proxy-cache was-Q19 as the answer (every blob a remote keeps for its current or a retained revision on its repository-level document's declared list, for a handler-declared count; cached files on their own cached references) and was-Q20 for the old blob of a digest-less revision-bound violation, and the stale-bound wording is dropped since no format keeps a revision by time. The gap: the property operation set and AC16 produced declared-list births and ends only from completed writes, so a sweep racing a remote's adoption or a map build, the producers Q19 introduced, was reachable by no generator. Now: the operation set names both producers, including a map build refused after its revision is dropped, on declaring documents whose bodies are sometimes inline and sometimes CAS-backed; AC16's criterion says the list is marked either way and adds a fixture whose retained revision's blobs, declared on an inline repository-level document, survive a sweep with the grace lapsed and are collected after the dropping adoption; its Test Plan row names both producers and shares `internal/proxy/retained_revision_test.go` with `proxy-cache.md` AC27; Phase 3 updated. No question adopted, `fable_recheck` unchanged, no mark root added: the set stays five. `node scripts/check-spec.js`: zero failures on this file. Stays draft awaiting a gate review. |
| 2026-09-28 | f0bfe75 | metadata-eviction reconciliation on Opus (data-loss fix second wave, item 0): cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Item 0 of "From the data-loss fix second wave" in `agents/spec-loop/consequences.md`, verified against `data-model.md`'s non-root row and AC44 (which read a remote's current-document entry as a cached reference or an evicted one) and against this spec's fourth root, which named a proxied repository's current index as protected by the current-document half and nothing else. Settled in `proxy-cache.md`, whose Q21 was raised and adopted in this pass: LRU eviction ends cached references of files only and never a remote's current documents. Folded here: Scope's root list, the fourth root's paragraph ("No eviction ends it", with a remote document's only ends), the third reach's citation of Q22 (a per-package set's declared list on its package-level document), the end-of-life list, and the root-set history (tested again, added nothing); the property suite's eviction now runs over remotes holding current documents at every level and declared lists so an eviction that took a document is reachable and must never occur, and its declared-list producers include package-level declaring documents with interleaved adoptions of different packages; AC16 extended with both and its Test Plan row sharing `proxy-cache.md` AC29's case; AC8 says a cached file. Mark-root check: no root added and no reach widened; the set stays five. No criterion added, two extended. `fable_recheck` extended. `node scripts/check-spec.js`: zero failures on this file. Stays draft. |
| 2026-09-28 | 4278ce0 | leftovers pass of the closing sweep on Opus: cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Applied the two optional items queued against this file after its eviction settlement, each verified against the owning spec's settled text. Async-operations closing sweep item 4: a `proxy.revalidate` job names its remote (`async-operations.md` AC29), so the existing job-held grace rule already holds that remote's grace open while the job is unfinished; Design now says so and why no special case is made, and bounds it from the queue's own rules, `RetryAt` deferrals counting as attempts (that spec's resolved retry-time decision, was Q11, AC7) and the adapter capping each deferral at `limits.cooldown_cap` (`upstream-adapters.md` AC10), so the hold ends within `async.max_attempts` times the longer of `limits.cooldown_cap` and `async.backoff_cap`, plus leases, about eight hours at the defaults, with the accepted cost stated; AC23 asserts it under a stand-in upstream that never lifts its limit, and its row shares the termination half with `async-operations.md` AC7 and AC24. Auth and data-model second passes item 4: AC30's row names `data-model.md` AC35 as sharing the claim race in `internal/storage/gc_property_test.go`. Found already done: data-loss fix item 3 (the adoption and map build as declared-list producers, applied in the second wave). No question raised or adopted; roots stay five; the fable_recheck marker is unchanged. 31 criteria, each with a Test Plan row. Stays draft. |
| 2026-09-30 | d9f6f1c | Fable recheck: full review (claim verification against every cited sibling at this sha, adversarial GC-property hunt, constitution, go-spec-reviewer concurrency lens) + re-examination of the Opus adoptions (Q11, Q12) and of every non-Fable sweep since the un-planning (the proxy.revalidate hold, the declared list as the only keep-alive, the five roots with the intent barrier, the Q21/Q22 eviction fold). Claim verification against code is vacuous as in every prior pass: `internal/` holds no storage code at d9f6f1c | Brought current first: the one open consequence against this file (format closing sweep batch 3 item 3) applied, the virtual merge commit named as a declared-list producer in the third reach, the property op set, AC16 with a fixture over `formats/debian.md` AC22's two retained generations, its Test Plan row and Phase 3. Every sibling citation re-read at this sha held (proxy-cache was-Q19 to Q22, AC26 to AC29; data-model AC27, AC32, AC34 to AC37, AC41, AC43 to AC45 and its head definition; management-api was-Q13 to Q15; async-operations was-Q4, was-Q11, AC7, AC13, AC24, AC29 and the 8-attempt, 15-minute, 1-hour defaults behind the eight-hour bound; repository-lifecycle's deletion steps and AC9; replication AC7 and AC12; deployment's `gc.` row and `internal/db/lock` block; observability's `gc_*` and `storage_*` names; hackage was-Q16; artifact-verification was-Q5; rpm was-Q11). Verdicts: Q11 confirmed and amended, Q12 confirmed and amended, both recorded on their resolved records. The adversarial pass asked for any path by which a blob a client can still be served is collectable, and found none in the root set: the merged-generation and dual-held cases (debian, rpm Q11) mark correctly once the merge producer is in the op set. It found two holes elsewhere and one under-stated cost, all fixed directly. One: a corrupted object was permanent, since the read path's mark was trusted by deduplication and repaired by nothing, so a client re-pushing correct bytes was told they were stored; a commit of a marked digest now re-uploads through the intent gate and clears the mark, and `--restore-dangling` repairs mismatches from bucket versions (Design, AC21, AC27, the fault-injection list). Two: the Q12 fold depended silently on `READ COMMITTED` (at any stricter level the post-lock re-read misses the retirement) and on the head being the last lock taken after `signing-service.md`'s per-document locks; both stated, in AC30 and the architecture test. Three: cache materialisation was neither named as write activity for the grace clock nor required to commit row and reference together, so a fill on a lapsed-grace remote could in principle expose an unreferenced row to the sweep; stated and asserted (AC8). The proxy.revalidate hold's accepted cost was under-stated as "up to that bound longer": the bound is per job and continuous virtual reads re-enqueue, so under a rate limit that never lifts it is a leak for the duration, never a loss; stated at full size, with the kind-level exemption noted as available. The rpm dual-held blob added to AC8 and the op set. Mark roots re-derived at five; nothing found that adds a sixth. `fable_recheck` cleared. Zero open questions, 31 criteria each with a Test Plan row, `node scripts/check-spec.js` zero failures: draft -> planned. |
| 2026-10-01 | 073d744 | Fable follow-up: queued cross-spec items since the recheck | A review, narrower than the recheck: every item in `agents/spec-loop/consequences.md` targeting this file after the 2026-09-30 row, verified against the current text of its source and of this spec, then read adversarially against the rest of this spec. Applied, five. Async-operations recheck item 2 (its was-Q4 as amended on Fable; `data-model.md` AC41): the grace hold is per kind, `holds_grace` copied to the row at enqueue and read `WHERE holds_grace` with no kind registry, and `proxy.revalidate` declares it false, so AC23's revalidate clause inverts from "holds the remote's grace within an eight-hour bound" to "holds nothing, the remote's evicted bytes collected past grace while it is pending"; the leak paragraph is rewritten as the history that produced the flag, with the cost stated where it now sits (one declaration per kind, held by `internal/async/kinds_test.go`, shared with AC8's cache-fill row); Scope, the op set, AC3 and Phase 3 follow; this supersedes and closes this spec's own recheck item 3, whose owner-facing option async took. The same item's on-a-transaction form: `Finish` opens the job's transaction and keeps its commit, so the door gains a callback-shaped form that runs the predicate, the claims, the hook and the commit step on the joined transaction, refuses any isolation level but `READ COMMITTED` (it cannot set one), and seals before control returns, the fenced job-row update following the head in the order the deletion takes (AC25, AC30 and the architecture test). Repository-lifecycle recheck item 1 (its was-Q11, AC9, AC10, AC14): the door's document-only form calls `repository.Renewable`, passes `read_only` and has no waiving entry point; the deletion exemption skips the hook and the pointer-document render too (`data-model.md` AC36's one exception, now named in the fourth-root reach and the tombstone paragraph); the cadence re-sign proceeds on a frozen repository, so AC24 gains the clause and the pruning-inputs paragraph and the op set carry it. Proxy-cache recheck item 7 (its AC14, AC29 as amended): the rpm dual-held blob is skipped by the eviction pass while declared, so that layer only ever produces adoption-then-eviction; the sweep stays asserted in both orders because it cannot know which layer ended what, the stale "today it re-fetches" parenthetical is gone, and AC8, the op set and its row (sharing `internal/proxy/eviction_test.go`) say so. Data-model recheck item 3 and follow-up item 2: the member-list share lock is placed before the virtual's head in the lock order, which now reads documents, member rows, head, job row, asserted in AC30; `upload.idle_timeout` and `upload.max_duration` cited at the session-lifetime sentence (its AC26); AC37 and AC43 were already cited. Declined, none. Adversarial pass on what changed: the flag removes a hold, so the question was whether any byte of a flagless kind can wait for a reference; `proxy.revalidate`'s adoption commits row and reference together (AC8) and its pre-commit object is the orphan scan's under raw age, so none does, and the kinds test holds that for every future `false`. The on-a-transaction form takes the head lock before the job row and the deletion takes repository rows before job rows, so the new lock kind adds no cycle; a repository batch over several pointer rows now states a fixed order so two batches serialise. Mark roots re-derived at five: a `Renewable`-gated transition is a pointer-document birth and end already in the fourth root's reach, the deletion exemption ends a render that would otherwise have been a birth, and the flag is a timing input removed, not a root. No question raised or adopted; zero open questions; 31 criteria, each with a Test Plan row; `node scripts/check-spec.js` zero failures on this file. Stays planned. Owner-facing: this pass folds three sibling adoptions that change planned criteria here (AC23 inverted, AC25 widened by two forms, AC8's eviction order), each already flagged on its own record. |
