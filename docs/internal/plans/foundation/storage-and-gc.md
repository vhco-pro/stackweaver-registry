---
status: draft
status_description: "Reviewed 2026-09-22 at afbb4e4; stays draft: Q4 (grace-window exceed path), Q5 (snapshot GC roots and retention), Q6 (sweep write barrier) need the owner."
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
- Mark-and-sweep GC with a grace period (settled; the decision and its accepted costs are
  recorded under Open Questions).
- Orphan cleanup for interrupted uploads.
- Fault injection and property tests covering the races above.
- Throughput benchmarks wired to a CI regression gate.

**Out of scope**

- Replication between instances. Later, and it depends on decisions made here.
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

The design must make that window non-lethal. The settled mechanism is the mark-and-sweep
grace period (see the resolved collection-strategy question): a sweep never deletes a blob
younger than the grace period, so a freshly committed blob survives the gap before its
reference lands.

Two constraints the grace period does not remove:

- **The window is client-controlled and unbounded.** In OCI, every blob uploads and commits in
  its own session, and the manifest that references those blobs arrives whenever the client
  sends it - minutes later, or never. A fixed grace period therefore has an exceed path, and
  what happens on it is an open decision (Q4). Whatever the answer, recording a reference to a
  digest must verify the blob still exists and fail retryably if it does not - a reference row
  pointing at a swept object is data loss discovered at pull time.
- **Orphan cleanup must be enumerable from a record written first.** The upload session record
  is written to PostgreSQL before any object-store upload (multipart initiate) begins. The
  known bug class named in Context - cleanup keyed off a completion record that was never
  written - is closed only by write-ahead ordering; an interrupted upload with no record is
  invisible to every cleanup pass except a raw store scan.

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
grace. Repo C now references nothing. The mechanism that closes this - a write barrier between
reference creation and sweep deletion - is Q6.

Sweep mechanics carry these fixed constraints, each of which the fault-injection suite must
exercise:

- **At most one sweep runs at a time**, enforced (a PostgreSQL advisory lock suffices), and a
  sweep interrupted by a crash must be safe to rerun immediately from the start: mark state is
  disposable, deletion state is not.
- **Delete the metadata row before the object, never the reverse.** A crash after object-delete
  but before row-delete leaves a dangling row the dedup check trusts: the next upload of that
  content is skipped as already stored, and the pull 404s later. Row first, a crash leaves an
  unreferenced object the orphan scan collects - a leak, not a loss.
- **Re-upload of a just-swept digest races the object delete.** Rows delete transactionally and
  the object-store delete follows; an upload of the same content committing between the two can
  have its PutObject overtaken by the sweep's DeleteObject on the same key, losing the new copy
  while its row survives. The barrier mechanism (Q6) must cover this window too, not only the
  mark race.
- **Clocks and listings are not trustworthy inputs.** Grace comparisons mix object-store
  timestamps with PostgreSQL time; skew must be assumed and dwarfed by the grace period. The
  orphan scan (store listing versus rows) runs against "S3-compatible" stores whose LIST
  consistency varies, so it too applies the grace period to object age before touching
  anything.
- **Mark roots come from the shared data model**: published `File` references and cached
  (`RemoteFile`-originated) references, per the resolved collection-strategy question. Whether
  superseded snapshots are also roots is Q5, and that answer decides whether hosted deletes
  reclaim space at all.

### Testing what conformance cannot see

This is the part of the spec that exists because the harness is blind here. Required:

- **Property tests**: for randomised interleavings of push, pull, delete and GC, the invariant
  above holds. The operation set must include re-push of already-stored content (a dedup hit,
  the new-reference-to-old-blob case), cache arrival via `on_demand` (the second reference
  class), and snapshot-creating writes - a generator limited to fresh-content pushes cannot
  reach the deadliest race and passes vacuously.
- **Fault injection**: kill the server mid-upload, mid-commit and mid-GC, at each stage
  boundary; on restart the system is consistent and no referenced blob is missing.
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
      itself interrupted) is collected within one full cleanup cycle after session expiry.
- [ ] AC4: GC never deletes a referenced blob, under randomised concurrent push/pull/delete/GC
      interleavings, proven by a property test.
- [ ] AC5: GC never deletes a blob belonging to an upload in progress, proven by a fault-injection
      test that runs GC during the commit-to-reference window specifically.
- [ ] AC6: Killing the process at any stage boundary (including between a sweep's row delete
      and its object delete) leaves a store in which no referenced digest is missing from the
      object store and all partial state is collected or completed by the next cleanup cycle;
      consistency is asserted by a checker comparing references, blob rows and objects, not by
      the absence of errors.
- [ ] AC7: Blob upload and download throughput are benchmarked, and CI fails on a regression
      beyond a threshold recorded in the CI config and referenced from this spec.
- [ ] AC8: GC treats a blob referenced only by cached content (arrived `on_demand`, no
      published reference) as live, proven in the same property suite as AC4. This is the
      second reference class from `data-model.md`; it is asserted here as well so this spec's
      own gate covers the failure mode its resolved collection-strategy question names.

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

Three open, raised by the 2026-09-22 review. The three original questions were answered by the
owner and folded into Design and Scope above, with each decision's accepted cost recorded
beside it under the Resolved headings.

### Resolved: exceeding the grace period (was Q4)

**Settled 2026-09-23: touch-refreshed grace, defaulting to hours.** Each blob upload within a
push session refreshes the grace on the whole session. A client actively pushing never expires; a
session abandoned mid-push eventually collects.

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
| 2026-09-22 | afbb4e4 | adversarial + constitution + cross-spec (claim verification vacuous: no `internal/storage/` code exists yet) | Stays draft: Q4-Q6 raised (grace-window exceed path, snapshot roots and retention, sweep write barrier); invariant gained a third clause; sweep-mechanics constraints and canonical-digest rule added; AC3/AC6/AC7 tightened, AC8 added; stale pre-resolution text and the handler-owns-metadata contradiction with `data-model.md` fixed |
