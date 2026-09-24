---
status: draft
status_description: "First review 2026-09-23 corrected the transfer unit for the delta-plus-checkpoint snapshot representation, bound the follower's GC to all four mark roots and the shared commit machinery, and specified archive integrity; Q3-Q7 raised. Seven open questions await the owner."
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
barrier and four mark roots, immutable snapshots stored as deltas with periodic checkpoints
under bounded retention - so the dependency is discharged and the remaining reason to wait was
build effort, which is no longer a constraint (`project-charter.md`, the standing scope
decision).

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
  itself; shipping another instance's cache is bandwidth spent to avoid bandwidth. That
  reasoning holds only while the follower has an upstream to fetch from; the air-gapped case,
  where by definition it does not, is Q4.

## Design

### Snapshots make the unit obvious, but a snapshot is not a content set

A follower tracks a leader repository's snapshot number. Replication transfers the deltas
between its current snapshot and a target, plus the blobs those deltas newly reference, and
advances the follower's pointer only when the whole range has arrived and verified. A follower
is therefore never observably mid-publish, which is the property that makes a follower safe to
serve from.

"The deltas between N and M" is doing more work than it looks like, because per
`data-model.md`'s resolved representation a snapshot is a delta from its predecessor with
periodic full checkpoints, and the leader prunes deltas and checkpoints once no retained
snapshot depends on them. Three consequences bind the transfer unit:

- **A contiguous follower receives deltas.** A follower whose current snapshot is inside the
  leader's retained, reconstructible history receives exactly the deltas from its position to
  the target, plus the blobs those deltas newly reference - including metadata documents stored
  as CAS blobs above the size threshold, which deltas reference by digest like any other
  content.
- **A new or gapped follower seeds from a checkpoint.** The delta chain back to snapshot 1 does
  not exist once the leader's pruning has run, so an initial seed - and a re-seed after a
  retention gap - transfers the most recent checkpoint at or before the target, the deltas from
  that checkpoint to the target, and every blob that range's content set references. Seeding is
  bounded by the current content set plus one checkpoint interval, never by history length.
- **The follower must stay reconstructible and bounded.** After any transfer, every retained
  snapshot on the follower resolves within the one-checkpoint-plus-bounded-deltas read limit
  `data-model.md` sets, and the follower's own pruning obeys the same reconstructibility
  constraint as the leader's. A transfer that ships deltas without the checkpoint they hang off
  produces a follower that cannot compute its snapshots' content sets, which makes its own
  sweep unsound.

Interrupted transfer resumes from the last completed snapshot rather than restarting, because
each snapshot is an independently valid stopping point.

### Only a local repository is a replication source

Snapshot granularity decides this. A `remote` repository creates no snapshots at all -
`data-model.md` settled on-demand arrival as cache materialisation - so there is no unit for it
to replicate; a follower wanting the same upstream configures its own `remote` repository and
fetches for itself (except across an air gap, which is Q4). What replicating a `virtual`
repository would even mean, given its content is a member list whose members may not all exist
on the follower, is Q3.

### A follower's GC is the same GC, and replication is a second writer into its CAS

A follower runs the same mark-and-sweep over its own store, and everything `storage-and-gc.md`
settled applies unchanged:

- **All four mark roots.** On a follower, replicated snapshots inside its retention window are
  what keeps replicated content live, and the fourth root - CAS-backed metadata documents -
  matters here exactly as on a leader, because replicating metadata at all three levels means
  the follower holds metadata-document blobs that no `File` row references.
- **Transfer commits go through the shared machinery.** Applying a snapshot range commits blobs
  and creates references, which makes replication a reference-creating writer exactly like an
  upload: it uses the shared reference-creation call, so the deletion-intent check runs and
  `storage-and-gc.md` AC10's architecture test already covers it; it honours the intent's
  exclusive commit gate when committing a digest the follower's sweep is deleting; and its
  write activity refreshes the repository-scoped grace, so blobs committed early in a long
  transfer are not swept before the deltas referencing them apply. None of this is new
  mechanism - the point of stating it is that a replication path with its own commit or delete
  route would silently break AC15's single-deleter boundary in `storage-and-gc.md`.
- **Retention on a follower runs from arrival, and the served snapshot is never pruned.** An
  air-gapped archive can legitimately arrive older than the retention window; evaluated against
  leader publish time it would be pruned on import and AC5 below would be unsatisfiable, so a
  follower's window runs from when a snapshot arrived locally. And whatever its age, the
  snapshot a follower's pointer currently serves is never pruned out from under it - a follower
  fed rarely must keep serving what it has.

### Retention is a coordination problem, and it is the risk here

A leader prunes snapshots outside its retention window. A follower that falls further behind than
that window can no longer reconstruct the range it needs, and the failure is silent until someone
asks the follower for old content.

This is a genuine correctness cost rather than an effort one, so it is not waived by the scope
decision: the leader must know its followers' positions and refuse to prune past the furthest
behind, or followers must detect the gap and re-seed. Which of those is in Open Questions.

### Air-gapped export is the same mechanism, written to a file

An export is the transfer format serialised: a snapshot range - deltas plus any checkpoint the
range depends on - the blobs it references (including CAS-backed metadata documents), a manifest
listing every digest, and enough repository identity (name, format, snapshot numbers) for the
importer to know what it is looking at. Import verifies every digest against the manifest and
the manifest against the deltas before committing anything. Nothing about it is a special path,
which is the point - a second mechanism would be a second set of bugs.

Import carries the obligations the network path gets for free:

- **Contiguity is checked, not assumed.** An archive covering snapshots N to M imports only onto
  a follower whose position is at least N-1 or inside the range, or which is seeding from a
  checkpoint the archive carries. A gapped import is refused with an error naming the missing
  range, never applied around the hole.
- **Import is atomic and idempotent.** A truncated or internally inconsistent archive - a delta
  referencing a blob the archive does not contain - is refused with nothing committed, and
  re-importing an archive whose range has already applied is a no-op rather than an error,
  because sneakernet workflows retry.

What makes an archive trustworthy at all is Q7: the boundary crossing strips every channel
property TLS gives the network path, so digest verification proves only that the archive is
internally consistent, not that its top-level manifest is the leader's.

## Acceptance Criteria

- [ ] AC1: A follower replicating a leader repository serves byte-identical content for every
      artifact in the replicated snapshot range, including metadata at all three levels.
- [ ] AC2: A follower's pointer advances only after a complete snapshot has arrived and
      verified; a transfer killed midway leaves the follower serving the most recently
      completed snapshot (its pre-transfer snapshot if none completed), never a partially
      applied one.
- [ ] AC3: An interrupted transfer resumes from the last completed snapshot rather than
      restarting.
- [ ] AC4: A blob arriving with a digest that does not match is rejected and nothing is
      committed, proven by a fault-injection test that corrupts bytes in transit.
- [ ] AC5: A snapshot range exported to an archive and imported into an isolated instance with no
      network between them produces a follower serving identical content, including when the
      archive is imported after the retention window's length has elapsed since export.
- [ ] AC6: A leader cannot prune a snapshot that a known follower still needs, or the follower
      detects the gap and re-seeds rather than serving incomplete content; whichever is settled,
      the failure is never silent.
- [ ] AC7: A follower's GC marks from all four roots over replicated content: a replicated
      CAS-backed metadata document blob that no `File` row references survives its sweep, and a
      sweep interleaved with an in-progress transfer never collects a blob the transfer has
      committed - asserted by the same property test that covers the leader's mark roots, with
      transfer-apply added to its operation set.
- [ ] AC8: A brand-new follower, and one re-seeding after a gap, seeds from a checkpoint plus
      tail deltas and succeeds against a leader that has pruned its early history; the volume
      transferred is bounded by the content set plus one checkpoint interval, not by history
      length.
- [ ] AC9: An archive that is truncated, internally inconsistent (a delta referencing a blob the
      archive lacks) or gapped relative to the follower's position is refused with an explicit
      error naming the problem and nothing committed; re-importing an already-applied archive is
      a no-op.
- [ ] AC10: A follower exposes, per replicated repository, its current snapshot and the time of
      its last successful sync; a failed sync or detected retention gap is surfaced as an
      explicit status a monitor can alert on, never only as a log line.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | integration | `internal/replication/content_test.go` |
| AC2 | fault injection | `internal/replication/atomicity_test.go` (kill mid-transfer) |
| AC3 | fault injection | `internal/replication/resume_test.go` |
| AC4 | fault injection | `internal/replication/verify_test.go` |
| AC5 | integration | `internal/replication/airgap_test.go` |
| AC6 | integration | `internal/replication/retention_test.go` |
| AC7 | property | `internal/storage/gc_property_test.go` (transfer-apply in the operation set) |
| AC8 | integration | `internal/replication/seed_test.go` (leader with pruned early history) |
| AC9 | fault injection | `internal/replication/airgap_test.go` (truncated, mutated and gapped archives) |
| AC10 | integration | `internal/replication/status_test.go` |

## Implementation Phases

### Phase 1: Pull replication
Snapshot-range transfer, checkpoint-based initial seed, digest verification, atomic pointer
advance, resume, and the follower status surface.

### Phase 2: Air-gapped export and import
The same transfer format serialised to an archive, with digest, contiguity and atomicity
checks on import.

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

### Q3: What does replication mean for a virtual repository?

A virtual repository is configuration - an ordered member list - not content, and its members
may not all be replicated to the follower.

**Recommendation:** A - virtual repositories do not replicate; a follower composes its own from
the repositories it actually has. Partial aggregation under the leader's name fails silently,
which is the failure shape AC6 exists to forbid.

| Option | You get | It costs |
|---|---|---|
| **A. Not replicable; followers define their own virtual repositories** | Replication stays content-only; a follower can never serve a silently incomplete aggregate under a name clients trust | An operator mirroring a leader's layout re-creates each virtual repository by hand, and the two definitions drift over time |
| **B. Replicate the virtual definition, resolving only members present on the follower** | One action mirrors the client-facing URL a team actually points builds at | The follower silently serves a subset through the same name, a member added on the leader is invisible until config re-syncs, and configuration replication is a second mechanism beside snapshot transfer |

**Why this is yours:** it decides whether replication promises "the same bytes" or "the same
client-facing surface", and the difference is invisible until a member is missing.

### Q4: How does proxied upstream content cross an air gap?

The out-of-scope rationale for cached proxy content - the follower fetches for itself - is
impossible for an air-gapped follower, yet mirroring a public ecosystem (npm, PyPI, Debian) into
the gap is the most common real-world air-gap requirement. Remote repositories create no
snapshots (`data-model.md`), so snapshot-granular transfer structurally cannot carry them as
things stand.

**Recommendation:** B - a promote operation that copies a remote repository's cached content
into a local repository, which then exports normally. It composes existing mechanisms and leaves
`data-model.md`'s no-snapshots-for-proxied-repositories resolution intact, but it is an
operation that spec does not define, so accepting it is a spec change there.

| Option | You get | It costs |
|---|---|---|
| **A. Unserved in v1, documented loudly: archives carry local repositories only** | No new mechanism anywhere | The flagship air-gap workflow is absent, and users will reproduce it by hand-publishing upstream packages into a local repository with no provenance |
| **B. A promote/freeze operation copies cached content into a local repository, which replicates normally** | Air-gap mirroring works as a composition of existing publish, snapshot and export machinery | The promoted copy is a real publish - it snapshots, counts against retention, and needs `RemoteFile` provenance semantics defined - and `data-model.md` must gain the operation |
| **C. Remote repositories gain snapshots for export** | Direct, no copy step | Reverses `data-model.md`'s resolved position that proxied repositories create no snapshots, which was settled to keep the hot proxy path off the snapshot sequence |

**Why this is yours:** every option either abandons the most common air-gap workflow or amends a
settled sibling decision, and the constitution says that choice is raised, never taken silently.

### Q5: Does disaster recovery include promoting a follower to leader, and how is the old leader fenced?

Context claims "a second instance holds enough to take over", but nothing here defines taking
over: replicated repositories on a follower have no writer, and making them writable while the
old leader might still accept writes is the split-brain the multi-leader exclusion refuses to
solve.

**Recommendation:** A - an explicit operator action that severs the follower relationship and
makes the repositories writable, with fencing of the old leader a documented manual step in v1.

| Option | You get | It costs |
|---|---|---|
| **A. Manual promotion command; fencing is a documented operator duty** | DR is a real capability, with no coordination machinery built | If the old leader keeps accepting writes, the histories diverge, and reconciling them is explicitly unsolved here |
| **B. No promotion in v1: DR means an operator rebuilds from the follower's data by hand** | Zero new surface and no split-brain to mishandle | The DR use case in Context is overstated: the follower holds the data but cannot take over |

**Why this is yours:** it decides whether the DR use case is a capability or a data-availability
claim, and accepting a manually-fenced split-brain window is a risk posture only the owner can
sign.

### Q6: How does a follower authenticate to a leader?

`auth.md` defines human OIDC and machine tokens scoped `(repository, action)` with the action
vocabulary fixed at `pull`/`push`/`delete`, and says nothing about instance-to-instance
identity. Replication must read snapshot internals - deltas, checkpoints, position - which no
format protocol exposes and no existing scope names.

**Recommendation:** A - an ordinary machine token whose `pull` scope on the replicated
repository also grants the replication read surface. One credential model, and a leaked
replication token grants nothing a pull token did not, since every byte it can read is content
the repository serves anyway.

| Option | You get | It costs |
|---|---|---|
| **A. Ordinary machine token; `pull` grants replication reads** | One credential model; `auth.md` untouched | `pull` silently widens: any pull-scoped CI token can now enumerate snapshot history and deltas, which is more than "download artifacts" |
| **B. A new `replicate` action in the scope vocabulary** | Least privilege stays explicit and auditable | Amends `auth.md`'s settled vocabulary, which was chosen to match OCI's scope grammar with no translation layer |

**Why this is yours:** both options touch a settled sibling decision - widening what `pull`
means, or amending the vocabulary - and the constitution requires that to be decided in
daylight.

### Q7: What is the trust root for an air-gapped archive?

Digest verification proves an archive is internally consistent, not that it is the leader's: a
tampered archive with a rewritten manifest (a dist-tag repointed at a malicious version, an
index swapped) verifies perfectly. The network path gets TLS plus an authenticated endpoint;
the sneakernet path gets nothing unless this spec gives it something.

**Recommendation:** A for v1 - export prints the manifest digest, and import requires it as a
mandatory argument carried out-of-band. No key management, and the operator already physically
carries the medium, so carrying a digest beside it is free.

| Option | You get | It costs |
|---|---|---|
| **A. Mandatory out-of-band manifest digest at import** | Tamper detection with zero key management | Only as strong as the operator's out-of-band channel discipline; a digest sent alongside the archive on the same medium verifies nothing |
| **B. Leader signs the manifest with an instance key; the follower pins the public key** | Mechanical verification that survives careless operators, and a foundation for leader identity generally | A new class of key that `auth.md` does not own: generation, rotation, pinning and distribution UX all appear |

**Why this is yours:** it sets the supply-chain posture of the one path where transport security
protects nothing, and trading key management against operator discipline is a product-risk
call.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-23 | d078c46 | first review: adversarial + constitution + cross-spec (data-model's delta/checkpoint representation and repository types, storage-and-gc's four mark roots and single-writer machinery, auth's missing instance identity) + go-spec-reviewer; claim verification vacuous pre-code (no `internal/replication/` exists) | Transfer unit corrected for the delta-plus-checkpoint representation (contiguous deltas vs checkpoint-based seed, reconstructibility on the follower), follower GC bound to all four roots and the shared reference-creation and intent machinery, remote repositories excluded as sources, follower retention clock and served-snapshot protection stated, archive contiguity/atomicity/idempotence specified; AC2 moved to fault injection and made consistent with AC3, AC5 hardened, AC7 extended to the fourth root and transfer interleavings, AC8-AC10 added; Q3-Q7 raised (virtual repositories, air-gapped proxied content, DR promotion, instance-to-instance auth, archive trust root); stays draft |
