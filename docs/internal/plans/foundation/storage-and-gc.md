---
status: draft
status_description: "All open questions answered by the owner and folded in; awaiting a /spec review pass to earn planned."
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
- Reference counting or mark-and-sweep GC (see Open Questions).
- Orphan cleanup for interrupted uploads.
- Fault injection and property tests covering the races above.
- Throughput benchmarks wired to a CI regression gate.

**Out of scope**

- Replication between instances. Later, and it depends on decisions made here.
- Encryption at rest beyond what the object store provides.
- Per-format metadata storage. That is PostgreSQL and belongs to each handler.

## Design

### Addressing

A blob is keyed by its digest and nothing else. There is no path, no name, no format namespace
in the key. Two formats uploading identical content store one blob. **Never key a blob by
anything but its digest** - this is a standing Go rule in `CLAUDE.md` because a single
convenience exception destroys deduplication and makes GC unsound.

Metadata, which is mutable and format-specific, lives in PostgreSQL and references blobs by
digest. The object store holds no mutable state.

### Upload lifecycle

An upload moves through: session created, chunks received, digest verified on completion, blob
committed, reference recorded. The dangerous window is between *blob committed* and *reference
recorded*, because during it the blob is unreferenced and GC-eligible while being entirely
legitimate.

The design must make that window non-lethal. The candidate approaches are in Open Questions
because the choice constrains everything downstream.

### Garbage collection

GC deletes blobs no live metadata references. It must satisfy one invariant, stated as an
absolute:

> **GC never deletes a blob that is referenced, or that is about to be referenced by an upload
> in progress.**

The second clause is the hard half. A GC that only checks current references is correct only if
uploads are atomic with respect to it, and they are not.

### Testing what conformance cannot see

This is the part of the spec that exists because the harness is blind here. Required:

- **Property tests**: for randomised interleavings of push, pull, delete and GC, the invariant
  above holds.
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
      treat as live, and no orphan that is never collected.
- [ ] AC4: GC never deletes a referenced blob, under randomised concurrent push/pull/delete/GC
      interleavings, proven by a property test.
- [ ] AC5: GC never deletes a blob belonging to an upload in progress, proven by a fault-injection
      test that runs GC during the commit-to-reference window specifically.
- [ ] AC6: Killing the process at any stage boundary leaves the store consistent on restart, with
      no referenced blob missing.
- [ ] AC7: Blob upload and download throughput are benchmarked, and CI fails on a regression
      beyond a stated threshold.

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

## Implementation Phases

### Phase 1: CAS
- Digest addressing, object store abstraction, simple upload

### Phase 2: Chunked upload
- Resumable sessions, digest verification, orphan records

### Phase 3: GC
- The chosen strategy, plus the property and fault-injection suites **written before it**

### Phase 4: Benchmarks
- Throughput benchmarks and the CI regression gate

## Open Questions

None. Every question this spec raised has been answered by the owner and folded into
Design and Scope above, with each decision's accepted cost recorded beside it.

Resolved decisions are kept rather than deleted, so the reasoning survives the next time
someone asks why it was done this way.

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
