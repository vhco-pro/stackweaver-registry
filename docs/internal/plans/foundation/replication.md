---
status: draft
status_description: "Drafted 2026-09-23 when replication came into scope; not yet reviewed, and its open questions await the owner."
description: "Spec for replicating content between registry instances - geo-distribution, disaster recovery and air-gapped mirroring - built on the content-addressed store and immutable snapshots."
author: michielvha
goal: "Let one logical registry span sites, so a build pulls locally and an air-gapped environment can be fed a verifiable snapshot."
priority: "medium"
issue: ""
created: 2026-09-23
covers:
  - "internal/replication/**"
---

# Plan: Replication between instances

One logical registry, several instances, content moving between them.

## Context

Deferred in `storage-and-gc.md` as "later, and it depends on decisions made here". Those
decisions have since been made - content addressing, mark-and-sweep GC with a deletion-intent
barrier, immutable snapshots with bounded retention - so the dependency is discharged and the
remaining reason to wait was build effort, which is no longer a constraint
(`project-charter.md`, the standing scope decision).

Three use cases, in descending order of how well the existing model serves them:

- **Geo-distribution**: a build in another region pulls from a local instance.
- **Disaster recovery**: a second instance holds enough to take over.
- **Air-gapped mirroring**: content crosses a boundary that no network crosses, as a file.

The foundations make this unusually tractable. Blobs are content-addressed, so transfer is
idempotent and verifiable by digest with no coordination. Snapshots are immutable and numbered,
so "replicate up to snapshot N" is a well-defined, resumable unit rather than a diff of mutable
state.

## Scope

**In scope**

- Pull-based replication: a follower instance replicates named repositories from a leader.
- Snapshot-granular transfer, so a follower is always at a consistent point rather than
  mid-publish.
- Content verification on arrival by digest, with nothing committed that does not verify.
- **Air-gapped export and import**: a snapshot range exported as a portable, verifiable archive
  and imported elsewhere with no network between them.
- Replication of metadata at all three levels, not only blobs, so a follower serves correct
  indexes and dist-tags rather than correct bytes under wrong names.
- Interaction with GC and retention: what a follower may collect, and what a leader may prune
  while a follower is behind.

**Out of scope**

- Multi-leader or active-active writes. Conflict resolution across sites is a different problem
  and this spec does not pretend to solve it.
- Replicating cached proxy content. A follower with its own upstream configuration fetches for
  itself; shipping another instance's cache is bandwidth spent to avoid bandwidth.

## Design

### Snapshots make the unit obvious

A follower tracks a leader repository's snapshot number. Replication transfers the deltas between
its current snapshot and a target, plus the blobs those deltas newly reference, and advances the
follower's pointer only when the whole range has arrived and verified. A follower is therefore
never observably mid-publish, which is the property that makes a follower safe to serve from.

Interrupted transfer resumes from the last completed snapshot rather than restarting, because
each snapshot is an independently valid stopping point.

### Retention is a coordination problem, and it is the risk here

A leader prunes snapshots outside its retention window. A follower that falls further behind than
that window can no longer reconstruct the range it needs, and the failure is silent until someone
asks the follower for old content.

This is a genuine correctness cost rather than an effort one, so it is not waived by the scope
decision: the leader must know its followers' positions and refuse to prune past the furthest
behind, or followers must detect the gap and re-seed. Which of those is in Open Questions.

### Air-gapped export is the same mechanism, written to a file

An export is the transfer format serialised: a snapshot range, the blobs it references, and a
manifest of digests. Import verifies every digest before committing anything. Nothing about it is
a special path, which is the point - a second mechanism would be a second set of bugs.

## Acceptance Criteria

- [ ] AC1: A follower replicating a leader repository serves byte-identical content for every
      artifact in the replicated snapshot range, including metadata at all three levels.
- [ ] AC2: A follower's pointer advances only after a complete snapshot range has arrived and
      verified; a transfer interrupted midway leaves the follower serving its previous snapshot.
- [ ] AC3: An interrupted transfer resumes from the last completed snapshot rather than
      restarting.
- [ ] AC4: A blob arriving with a digest that does not match is rejected and nothing is
      committed, proven by a fault-injection test that corrupts bytes in transit.
- [ ] AC5: A snapshot range exported to an archive and imported into an isolated instance with no
      network between them produces a follower serving identical content.
- [ ] AC6: A leader cannot prune a snapshot that a known follower still needs, or the follower
      detects the gap and re-seeds rather than serving incomplete content; whichever is settled,
      the failure is never silent.
- [ ] AC7: A follower's GC does not collect blobs its replicated snapshots reference, asserted by
      the same property test that covers the leader's mark roots.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | integration | `internal/replication/content_test.go` |
| AC2 | integration | `internal/replication/atomicity_test.go` |
| AC3 | fault injection | `internal/replication/resume_test.go` |
| AC4 | fault injection | `internal/replication/verify_test.go` |
| AC5 | integration | `internal/replication/airgap_test.go` |
| AC6 | integration | `internal/replication/retention_test.go` |
| AC7 | property | `internal/storage/gc_property_test.go` |

## Implementation Phases

### Phase 1: Pull replication
Snapshot-range transfer, digest verification, atomic pointer advance, resume.

### Phase 2: Air-gapped export and import
The same transfer format serialised to an archive, with verification on import.

### Phase 3: Retention coordination
Follower position tracking and whichever prune-safety mechanism is settled.

## Tasks

Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

### Q1: Does a leader track its followers, or do followers detect and recover from a retention gap?

**Recommendation:** followers detect and re-seed. A leader that must know every follower before
it can prune has coupled its storage reclamation to the availability of every downstream
instance, which is how an air-gapped follower that has been offline for a month silently stops
the leader collecting anything.

| Option | You get | It costs |
|---|---|---|
| **A. Followers detect the gap and re-seed** | A leader prunes on its own schedule; an offline or abandoned follower cannot pin the leader's storage | A follower that falls behind pays a full re-seed, which for a large repository is expensive and surprising |
| **B. Leader refuses to prune past its furthest-behind follower** | No follower ever needs a re-seed | Storage reclamation on the leader is held hostage by the worst follower, including ones nobody remembers registering, and an air-gapped follower has no way to report its position at all |
| **C. Leader tracks followers with a lease that expires** | Bounded version of B: a silent follower stops counting after its lease lapses | Two mechanisms and a lease duration that is wrong for either geo-replication or air-gapped use |

**Why this is yours:** it decides whether a degraded follower costs the leader storage or costs
itself a re-seed, and the air-gapped case makes position reporting impossible by definition.

### Q2: Is a follower read-only, or may it also host its own content?

A read-only follower is simple to reason about. A follower that also hosts local publishes is far
more useful for a regional team, and immediately raises how its own snapshot numbering coexists
with the replicated sequence.

**Recommendation:** read-only for replicated repositories, with local repositories alongside them
on the same instance. Replication is per repository, not per instance, so an instance can be a
follower for some repositories and a leader for others without any repository having two writers.

**Why this is yours:** it is the boundary between replication and multi-leader, and the scope
above explicitly excludes conflict resolution.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
