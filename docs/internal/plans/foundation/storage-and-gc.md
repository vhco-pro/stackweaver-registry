---
status: draft
status_description: "Un-planned 2026-09-26 by the Wave 1 reconciliation at fe54272: edits its 4548df3 gate review never saw were applied, so the planned verdict no longer covers this text. What changed: an unexpired upload session now holds its repository's grace open, with continuation requests counting as write activity, using data-model.md's single upload-session definition and lifetime (one hour idle, 24 hours absolute) rather than an undefined session; AC3 cites that lifetime; the property generator gains an open session inside its idle window and session expiry on the injected clock; AC20 added with a Test Plan row; the stale citations of replication.md Q1 now record its adopted answer (the leader consults no follower, no follower pin, five roots). A gate review must re-judge the spec before it returns to planned."
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
- Chunked/resumable upload support, since OCI requires it and large artifacts need it.
- Mark-and-sweep GC, fully settled: a repository-scoped, touch-refreshed grace period
  defaulting to hours, held open while any upload session in the repository is unexpired, a
  deletion-intent table as the write barrier, and five mark roots - published references,
  cached references, snapshots inside the retention window, CAS-backed metadata
  documents (current and snapshot-held), and snapshots targeted by a `Pointer`, together
  with the checkpoint-and-delta chain that reconstructs them. The decisions and their
  accepted costs are recorded under Open Questions.
- Snapshot pruning at the retention boundary (default 30 days, per-repository override), and
  reporting how far back rollback reaches,
  since pruning is what bounds the snapshot root and the snapshot-held half of the
  metadata-document root. It does **not** bound the fifth root: a pointer-targeted snapshot
  is exempt while targeted, so retention bounds storage only for snapshots nothing points
  at (the resolved pointer-target question below carries that accepted cost). Because that
  cost was priced on the pin being visible and attributable, reporting extends to it: every
  pointer whose target has aged out of the window is reported as pinning it (AC19).
- Orphan cleanup for interrupted uploads.
- Fault injection and property tests covering the races above.
- Throughput benchmarks wired to a CI regression gate.

**Out of scope**

- Replication between instances, which now has its own spec (`replication.md`). The decisions
  it waited on - content addressing, the deletion-intent barrier, bounded snapshot retention -
  are settled here, and that spec builds on them.
- Encryption at rest beyond what the object store provides.
- Per-format metadata storage. That lives in PostgreSQL through the shared data model
  (`data-model.md`, issue #12); no handler owns a table. GC marks over that model's tables,
  so its schema is this spec's input, not its property.

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

- **At most one sweep runs at a time**, enforced (a PostgreSQL advisory lock suffices), and a
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
  machinery of its own. AC15's architecture test is what holds cache eviction to that, and a
  later move to direct deletion from eviction would be a revision of this constraint, never
  a silent exception.
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
  which is the mechanism that caught the fourth root, and then the fifth.

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
  without abandonment the hold is never released. A generator limited to fresh-content pushes cannot reach the deadliest
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
  referenced blob is missing.
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
      unexpired.
- [ ] AC4: GC never deletes a referenced blob, under randomised concurrent
      push/pull/delete/eviction/pruning/GC interleavings, proven by a property test.
- [ ] AC5: GC never deletes a blob belonging to an upload in progress, proven by a fault-injection
      test that runs GC during the commit-to-reference window specifically.
- [ ] AC6: Killing the process at any stage boundary (including between intent recording and
      the delete pass, and between a sweep's row delete and its object delete) leaves a store in which no referenced digest is missing from the
      object store and all partial state is collected or completed by the next cleanup cycle;
      consistency is asserted by a checker comparing references, blob rows and objects, not by
      the absence of errors.
- [ ] AC7: Blob upload and download throughput are benchmarked, and CI fails on a regression
      beyond a threshold recorded in the CI config and referenced from this spec.
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
      repository, which has no snapshots to protect it.
- [ ] AC13: A commit of a digest whose deletion intent is in its delete phase waits or fails
      retryably until the object delete completes, and the re-uploaded content is then
      retrievable; no interleaving of commit and sweep loses the new copy.
- [ ] AC14: The snapshot retention window defaults to 30 days, is overridable per repository,
      and a snapshot older than the effective window that no pointer targets is pruned and
      stops protecting its blobs.
- [ ] AC15: No code path outside the sweep's delete pass and the orphan scan deletes an
      object from the blob store, enforced by an architecture test that fails on any other
      deletion call site - including cache eviction, which ends a cached reference and
      deletes nothing.
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
      discovered from storage growth.
- [ ] AC20: An unexpired upload session holds its repository's grace open: on an injected
      clock, a blob committed earlier in a repository and not yet referenced survives a sweep
      run after the grace period has elapsed since the repository's last other write, provided
      a session opened in that repository is still inside its idle window and below its cap,
      and is collected once that session commits or expires and the grace then lapses - proven
      in the same property suite as AC4, with the open-session and session-abandonment
      operations in its operation set. The model-side statement of the same hold is
      `data-model.md` AC27.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | unit | `internal/storage/cas_test.go` |
| AC2 | integration | `internal/storage/dedup_test.go` |
| AC3 | fault injection | `internal/storage/upload_fault_test.go` |
| AC4 | property | `internal/storage/gc_property_test.go` |
| AC5 | fault injection | `internal/storage/gc_race_test.go` |
| AC6 | fault injection | `internal/storage/crash_recovery_test.go` |
| AC7 | benchmark | `internal/storage/bench_test.go` + CI gate |
| AC8 | property | `internal/storage/gc_property_test.go` |
| AC9 | property | `internal/storage/gc_property_test.go` |
| AC10 | architecture test | `internal/model/arch_test.go` |
| AC11 | property + integration | `internal/storage/gc_property_test.go`; reporting: `internal/model/snapshot_test.go` |
| AC12 | fault injection | `internal/storage/gc_race_test.go` |
| AC13 | fault injection | `internal/storage/intent_gate_test.go` (commit interleaved with delete pass) |
| AC14 | integration | `internal/storage/retention_test.go` |
| AC16 | property + integration | `internal/storage/gc_property_test.go` (metadata-document root); `internal/storage/metadata_blob_gc_test.go` |
| AC15 | architecture test | `internal/storage/arch_test.go` |
| AC17 | property + integration | `internal/storage/gc_property_test.go` (pointer-target root); `internal/storage/retention_test.go` (aged pointer target still serving) |
| AC18 | property + integration | `internal/storage/gc_property_test.go` (repoint interleaved with the sweep and with pruning's phases); `internal/storage/retention_test.go` (release then prune) |
| AC19 | integration | `internal/model/pointer_test.go` (out-of-window pin reporting) |
| AC20 | property | `internal/storage/gc_property_test.go` (open-session and session-abandonment operations on an injected clock that ages sessions past the idle period and the cap) |

## Implementation Phases

### Phase 1: CAS
- Digest addressing, object store abstraction, simple upload

### Phase 2: Chunked upload
- Resumable sessions under `data-model.md`'s upload-session definition and lifetime, digest
  verification, orphan records

### Phase 3: GC
- The chosen strategy, plus the property and fault-injection suites **written before it**,
  the open-session grace hold included (AC20)
- Retention pruning, including the pointer-target exemption, its release on repoint and the
  out-of-window pin reporting (AC17, AC18, AC19)

### Phase 4: Benchmarks
- Throughput benchmarks and the CI regression gate

## Tasks

<Populated by `/tasks` once this spec reaches `planned`.>

## Open Questions

No questions are open. All ten raised across this spec's reviews were answered by the owner,
the last of them on 2026-09-26 (pointer targets versus the retention window, was Q10), and each
is
folded into Design, Scope, the acceptance criteria and the Test Plan above, with each
decision's accepted cost recorded beside it under the Resolved headings, kept rather than
deleted so the reasoning survives the next time someone asks why it was done this way.

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
