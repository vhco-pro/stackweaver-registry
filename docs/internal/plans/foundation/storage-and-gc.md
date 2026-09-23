---
status: draft
status_description: "Re-review 2026-09-23 found this spec's own sibling tripwire had fired: data-model Q13 made metadata documents CAS blobs, adding a fourth mark root. Added with AC15. Zero open questions; awaiting the re-gate."
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
  defaulting to hours, a
  deletion-intent table as the write barrier, and three mark roots - published references,
  cached references, and snapshots inside the retention window. The decisions and their
  accepted costs are recorded under Open Questions.
- Snapshot pruning at the retention boundary (default 30 days, per-repository override), and
  reporting how far back rollback reaches,
  since pruning is what bounds the third mark root.
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

The scope is the repository rather than an upload session deliberately. **OCI has no push
session on the wire**: every blob commits in its own independent session and no push-session
identifier exists, so a session-scoped grace would let a client actively pushing layer nine
lose layer one. Repository scope is the only boundary under which the promise holds for
multi-blob pushes across independent wire sessions.

Two constraints the grace period does not remove:

- **The window is client-controlled and unbounded, and touch-refresh narrows the exceed path
  without removing it.** In OCI, every blob uploads and commits in its own session, and the
  manifest that references those blobs arrives whenever the client sends it - minutes later,
  or never. A repository idle past the grace window still expires its unreferenced blobs, and
  that case must fail as an
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
  The row delete itself is transactional with the intent's removal and proceeds only while
  the intent still stands, so a cancellation and a deletion serialise in PostgreSQL rather
  than racing - anything else makes AC9's survival guarantee unimplementable.
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
  path deletes from the blob store (AC15). `proxy-cache.md`'s open eviction-mechanics
  question (its Q11) decides whether cache eviction ends only the reference and inherits
  this single path, or becomes a second deleter; the latter is a revision of this
  constraint, never a silent exception.
- **Clocks and listings are not trustworthy inputs.** Grace comparisons mix object-store
  timestamps with PostgreSQL time; skew must be assumed and dwarfed by the grace period. The
  orphan scan (store listing versus rows) runs against "S3-compatible" stores whose LIST
  consistency varies, so it too applies the grace period to object age before touching
  anything.
- **Mark roots come from the shared data model, and there are four**: published `File`
  references, cached (`RemoteFile`-originated) references, snapshots inside the retention
  window, and **CAS-backed metadata documents**. A sweep marking from fewer than all four
  deletes live content.

  The fourth arrived when `data-model.md` settled that metadata documents are stored inline
  below a size threshold and as digest-referenced CAS blobs above it. A Debian signed `Release`
  index is therefore a blob that **no `File` row references**, and a sweep marking only from the
  first three roots would collect it while it is being served. The root persists while any
  repository, package or version document at any retained snapshot still references that digest. Each root class has a defined end of life - a
  delete removes a published reference, LRU eviction under the per-repository quota ends a
  cached one (`proxy-cache.md`, resolved cache-eviction question), and pruning at the
  retention boundary ends a snapshot - and hosted deletes reclaim space only through that
  pruning, on the schedule the retention default sets: **30 days, configurable per repository.**
  Pruning obeys the reconstructibility constraint `data-model.md` places on the delta
  representation: a checkpoint or delta is dropped only while no retained snapshot depends on
  it, because a mark root whose content set can no longer be computed makes the sweep unsound.
  The root classes are the shared data model's to enumerate, and that list is live:
  `data-model.md`'s resolution on CAS-backed metadata documents added the fourth root above,
  while its resolution that proxied repositories create no snapshots bounded the third rather
  than adding one. `proxy-cache.md` Q11 is still open and bears on the second, since whether
  eviction deletes a cached blob directly or only ends its reference decides whether eviction is
  a second deletion path that must independently honour the intent barrier. **Any resolution
  changing this set amends these mark roots as a revision requiring re-review, never silently** -
  which is the mechanism that caught the fourth root.

### Testing what conformance cannot see

This is the part of the spec that exists because the harness is blind here. Required:

- **Property tests**: for randomised interleavings of push, pull, delete, eviction, pruning
  and GC, the invariant above holds. The operation set must include re-push of already-stored
  content (a dedup hit, the new-reference-to-old-blob case), a commit of a digest under an
  active deletion intent (without which the intent gate is never exercised), cache arrival via
  `on_demand` (the second reference class), a metadata document crossing the inline/CAS size
  threshold (without which the fourth mark root is never exercised), snapshot-creating writes,
  cache eviction under the
  per-repository quota, snapshot pruning at the retention boundary, repository grace refresh,
  and session abandonment. A generator limited to fresh-content pushes cannot reach the deadliest
  race, and one that can create references but never end them - no eviction, no pruning, no
  expiry - can never race a reference's death against another's birth; both pass vacuously.
  The sweep's internal phases (mark, intent record, re-check, row delete, object delete) must
  be schedulable as first-class interleaving points, or the intent-window races stay
  unreachable.
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
      expired and the repository-scoped grace has lapsed.
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
      interleavings that place a dedup hit, a cache arrival and a snapshot write between
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
- [ ] AC16: A blob holding a CAS-backed metadata document survives GC while any retained
      snapshot's repository, package or version document still references its digest, and is
      collected once none does - proven with a document above the size threshold, such as a
      Debian-scale index, that no `File` row references.
- [ ] AC13: A commit of a digest whose deletion intent is in its delete phase waits or fails
      retryably until the object delete completes, and the re-uploaded content is then
      retrievable; no interleaving of commit and sweep loses the new copy.
- [ ] AC14: The snapshot retention window defaults to 30 days, is overridable per repository,
      and a snapshot older than the effective window is pruned and stops protecting its blobs.
- [ ] AC15: No code path outside the sweep's delete pass and the orphan scan deletes an
      object from the blob store, enforced by an architecture test that fails on any other
      deletion call site.

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

## Implementation Phases

### Phase 1: CAS
- Digest addressing, object store abstraction, simple upload

### Phase 2: Chunked upload
- Resumable sessions, digest verification, orphan records

### Phase 3: GC
- The chosen strategy, plus the property and fault-injection suites **written before it**

### Phase 4: Benchmarks
- Throughput benchmarks and the CI regression gate

## Tasks

<Populated by `/tasks` once this spec reaches `planned`.>

## Open Questions

None open. All nine questions this spec has carried were answered by the owner and are
folded into Design, Scope, the acceptance criteria and the Test Plan above, with each
decision's accepted cost recorded beside it under the Resolved headings, kept rather than
deleted so the reasoning survives the next time someone asks why it was done this way.

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

### Resolved: exceeding the grace period (was Q4)

**Settled 2026-09-23, boundary corrected the same day: touch-refreshed grace, defaulting to
hours, scoped to the repository.** The original wording said "each blob upload within a push
session refreshes the grace on the whole session", which assumed a wire-level push session OCI
does not have. See the resolved grace-period boundary above; the mechanism is unchanged, only
what it attaches to. A client actively pushing never expires; an
abandoned push collects once its repository goes quiet.

Accepted cost: a very slow client uploading one enormous blob could still exceed it. That case
must fail as an explicit, self-explanatory error telling the client to re-push, never as a
silently missing blob discovered later.

### Resolved: snapshot mark roots and pruning (was Q5)

**Settled 2026-09-23: every snapshot within the retention window is a mark root; older
snapshots are pruned and stop protecting their blobs.**

This makes the sweep mark from three roots, not two: published references, cached references, and
retained snapshots. A sweep marking fewer will delete live content.

Accepted cost: a retention default must be chosen, and **rollback beyond the window silently
stops being possible.** The API must therefore report how far back rollback actually reaches
rather than letting an operator discover the limit during an incident. The same question was
raised independently in `data-model.md`; this resolution settles both.

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
