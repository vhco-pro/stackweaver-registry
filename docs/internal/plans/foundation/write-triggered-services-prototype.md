---
description: "Defines the write-triggered services prototype that format-handler-interface.md AC8 names as an input to the scheduled interface re-open: what it must demonstrate for both classes its deciding record named (signed indexes, with Debian as the vehicle, and asynchronous operations, with a Galaxy-shaped publish-and-poll), and how anyone would know it succeeded."
covers: []
status: draft
status_description: "2026-09-26 at 0dbca1f: Q1 adopted under the owner's standing delegation (B, extend to an async publish path) and folded. The prototype now has two halves, Debian signed indexes and a genuinely deferred Galaxy-shaped publish-and-poll on the shared Operation entity data-model.md must gain, with AC8-AC12 asserting the async half and AC7 requiring six answered questions. Never gate-reviewed; no open questions; stays draft."
author: michielvha
goal: "Make the interface re-open's evidence concrete, so the decision on write-triggered services is argued from something built rather than from anticipation."
priority: "high"
issue: 16
created: 2026-09-26
---

# Plan: the write-triggered services prototype

## Context

`format-handler-interface.md` pinned its method set at five and scheduled a re-open after OCI,
before any Tier 1 handler work. Its AC8 names three inputs to that re-open: the generic
implementation, the OCI implementation, and **the Debian write-triggered services prototype**.

The prototype exists because of that spec's resolved write-triggered-services decision, which
settled on 2026-09-23 that such services would not enter the interface immediately but would be
prototyped first, on the reasoning that "generic and OCI exercise neither signed-index generation
nor async import tasks, and prior art identifies signed-index formats as the expensive class.
Re-opening the interface with only those two implementations in hand would be re-opening it
blind."

**Nothing anywhere defines what the prototype is.** AC8 requires it, the charter's build order
schedules it between steps 4 and 5, and the accepted cost of the decision is recorded, but no
document says what it builds, what it must demonstrate, or how anyone would know it had
succeeded. That is a named precondition for a gate that blocks six Tier 1 formats, and it is
undefined. This plan closes that.

This is not a Debian format spec, nor a Galaxy one. Debian delivery is charter build step 7 and
Ansible collections is step 6a, each with its own format spec.

**The prototype covers both classes the deciding record named** (the resolved async-coverage
decision below): a Debian-shaped signed-index half, and an asynchronous-operation half built on a
minimal Galaxy-shaped publish-and-poll. A re-open that blocks every Tier 1 format should not be
blind to half of what it was scheduled to see, and the async class has independent evidence in
`ansible-collections.md`, which adopted synchronous import validation on a shared `Operation`
entity and names this prototype as what decides whether deferral is expressible.

## Scope

**In scope**

- A definition of what a write-triggered shared service is, concrete enough to argue about.
- A Debian-shaped vehicle: enough of an apt archive to make a publish trigger index regeneration
  and signing, exercised by real `apt`.
- A Galaxy-shaped asynchronous vehicle: enough of a Galaxy v3 publish, import poll and install to
  make a **genuinely deferred** import fire, where the publish request returns before the import
  has committed and a shared runner completes it, exercised by real `ansible-galaxy`. It stores
  its task records in the shared model's `Operation` entity, which `data-model.md` must gain
  before this half starts (the same entity `ansible-collections.md` requires).
- The three questions the re-open needs answered, and evidence for each.
- Whether the shared layer or the handler owns the trigger, the regeneration and the signing key.
- Whether the shared layer or the handler owns deferred work, and whether a pending import needs
  protection from GC beyond what the settled machinery gives it.
- A written finding, recorded here, that the re-open pass cites.

**Out of scope**

- **Debian format delivery.** Component and architecture matrices, `Contents` files, source
  packages, `Translation` files, pdiffs and the rest belong to the Debian handler at build step
  7. The prototype needs only enough archive to make the mechanism fire. Excluded because the
  prototype's purpose is evidence for an interface decision, not adoption of a format ahead of
  its tier.
- **Galaxy format delivery.** Discovery, version listing, dependency metadata, the proxied path,
  namespaces, signatures and deletion belong to `ansible-collections.md` at build step 6a. The
  async half needs only the publish, the poll and enough of install to observe the effect.
  Excluded for the same reason as Debian delivery.
- **The production asynchronous-operation subsystem.** Built at charter step 6a from this
  half's finding; the prototype is disposable.
- **RPM.** It has the same signing requirement and a different index shape, which makes it a good
  second data point and a bad first one: one vehicle is enough to discover whether the interface
  can express the mechanism at all. Excluded on evidence sequencing, not effort.
- **Signing key management as a product feature.** The prototype needs a key; operators need
  rotation, hardware backing and per-repository keys. Excluded because it is a product surface
  with its own decisions, and the prototype's finding does not depend on which of them are made.

## Design

### What "write-triggered" means, and why it is not just a handler concern

For every format specced so far, a publish writes an artifact and its metadata and stops. The
client then reads what it needs. Debian does not work that way: **a publish invalidates a
repository-wide signed document, and that document must be regenerated and re-signed before any
client can resolve anything at all.**

The chain, grounded against the Debian repository format:

1. A `.deb` is published into a component and architecture.
2. `Packages` (and its compressed forms) for that component and architecture must be regenerated,
   because they enumerate the packages present.
3. `Release` must be regenerated, because it carries the checksums and sizes of every index file
   below it. `Release` is both an inventory of which index files exist and, once signed, the
   certification that those indexes and the files they reference are genuine.
4. The result must be signed: `InRelease` is clearsigned inline, and `Release.gpg` is a detached
   signature over `Release`. Servers should provide `InRelease`.

Three properties make this different in kind from anything generic or OCI exercises:

- **It is repository-scoped, not artifact-scoped.** One publish rewrites a document shared by
  every package in the repository, so concurrent publishes contend on it.
- **It needs a secret the handler must not own.** The signing key is shared infrastructure, on the
  same reasoning that puts auth and policy in the shared layer: a handler holding signing material
  is a handler that can sign anything.
- **It is a precondition for reads, not an optimisation.** An unsigned or stale `Release` is not
  slow, it is a repository apt refuses to use.

### Where it collides with what is already settled

The prototype is worth building partly because it lands on three decisions that were made without
it:

- **`data-model.md`'s snapshot rule.** One completed logical publish produces exactly one
  snapshot. A write-triggered regeneration is part of that publish, not a second write, so the
  regenerated indexes and the new package must land in the same snapshot. If the mechanism cannot
  guarantee that, either the rule bends or the mechanism does, and the re-open should know which.
- **`storage-and-gc.md`'s fifth mark root, and its fourth.** Debian's signed `Release` is the
  document that created the fourth root: at Debian scale it exceeds the inline size threshold and
  becomes a CAS blob that no `File` row references, which a three-root sweep would have collected
  while it was being served. The prototype is the **first thing that will actually exercise that
  root against a real client**, rather than against a property test.
- **`format-handler-interface.md`'s pinned `Deps`.** If the handler calls a shared regenerate-and-
  sign service through `Deps`, no interface change is needed. If the shared layer must instead
  call back into the handler to produce format-specific index bytes, that is a sixth method and
  the re-open has its answer.

### The second class: asynchronous operations

The resolved decision names **two** things generic and OCI do not exercise: signed-index
generation and **async import tasks**. Debian is a vehicle for the first and not the second: an
apt publish is synchronous. So the prototype has a second half.

The async class has independent evidence in `ansible-collections.md`: a Galaxy publish returns a
task URI, the client polls `{base}/v3/imports/collections/{task_id}/` until `finished_at` is set,
and the shared model had no entity for an asynchronous operation at all. That spec's resolved
import-task decisions (was Q1 and Q6) validate synchronously in v1 and keep the record in a new
shared `Operation` entity, so the question the re-open needs answered is not whether Galaxy works,
but whether **genuinely deferred** work can be expressed at all.

The vehicle, and why it is Galaxy-shaped: the minimal publish-and-poll `ansible-galaxy` already
drives. A publish `POST` validates nothing inline beyond authentication and the multipart
envelope; it records a pending `Operation`, hands the import to a shared runner, and answers with
the task URI. The runner validates, commits the version, and marks the operation terminal. The
real client then oracles the poll contract and the effect: `ansible-galaxy collection publish`
waits on the task by default, and `ansible-galaxy collection install` proves the version landed.
What the client cannot see is whether the work was really deferred, since it polls the same way
either way; that is asserted by integration test, which is the accepted weakness of this half's
evidence relative to the apt half. Like the Debian half, its code is disposable: the production
handler and the production asynchronous-operation subsystem are built at the charter's step 6a
from what it teaches.

Where it collides with what is already settled:

- **`data-model.md`'s snapshot rule.** A deferred import is one completed logical write that
  completes after its request has ended. It must still produce exactly one snapshot on success
  and none on failure, with the `Operation` record outside every snapshot's content set, and the
  terminal transition and the snapshot must commit together or not at all.
- **`storage-and-gc.md`'s grace machinery.** The artifact's bytes are committed to the CAS before
  the import that will reference them runs. If the runner is slow, or the process restarts, a
  pending import can outlive the repository-scoped grace period that protects unreferenced
  blobs. Either the settled machinery already covers it or a pending operation needs protection
  of its own; the prototype finds out, and a gap is a revision request to that spec, not a root
  the prototype adds on its own.
- **`format-handler-interface.md`'s pinned method set.** If the handler can hand deferred work to
  a shared runner through `Deps` and the runner never needs to call the handler back, no method
  is added. If the runner must call into the handler to validate format-specific content, that
  is a new method, and the re-open has its answer.
- **Durability.** Concurrency and durability have no client-level oracle (`CLAUDE.md`). A process
  killed mid-import must not leave an operation pending forever, a snapshot whose operation reads
  unfinished, or an import applied twice.

### What the prototype produces

A written finding in this document's Review Log and a new section here, cited by the re-open pass.
It answers six questions with evidence rather than argument, three per half.

Signed indexes:

1. Can a write-triggered service be expressed through the pinned five methods plus `Deps`, or does
   it require a new method?
2. Who owns the trigger: does the handler request regeneration, or does the shared write path
   notice and dispatch?
3. Does the mechanism preserve one-snapshot-per-publish under concurrent publishes to the same
   repository?

Asynchronous operations:

4. Can deferred completion be expressed through the pinned five methods plus `Deps`, or must a
   shared runner call back into the handler through a new method?
5. Does a deferred write preserve one snapshot on success and none on failure, atomically with
   the operation's terminal state, across a process restart, and does a pending import's blob
   need GC protection the settled machinery does not give?
6. Does the `Operation` entity as `data-model.md` specifies it fit a genuinely deferred import,
   or does its shape need to change before the charter's step 6a builds the production
   subsystem?

## Acceptance Criteria

- [ ] AC1: A real `apt-get update` and `apt-get install` against a prototype repository succeed
      against a clearsigned `InRelease`, and succeed again when only `Release` plus a detached
      `Release.gpg` is served, since the format says servers should provide `InRelease` while
      clients still accept the detached form. Both fail with a signature error when the signature
      does not match the contents. Asserted through the real client, not by inspecting our own
      response.
- [ ] AC2: Publishing a second package into a repository regenerates `Packages` and `Release` and
      re-signs, and a client that updated before the publish sees the new package after a further
      `apt-get update` with no other action.
- [ ] AC3: A publish and the index regeneration it triggers land in exactly one snapshot, asserted
      by counting snapshots created across the publish.
- [ ] AC4: Two concurrent publishes into the same repository produce a `Release` that is valid,
      signed, and enumerates both packages, with no interleaving that leaves a checksum in
      `Release` disagreeing with the `Packages` file it names.
- [ ] AC5: The handler package holds no signing key and performs no signing: an architecture test
      asserts the handler imports neither the signing service's key material nor a crypto signing
      API directly.
- [ ] AC6: A `Release` document large enough to exceed the inline metadata size threshold is
      stored as a CAS blob, is protected by the CAS-backed-metadata mark root across a GC sweep,
      and still serves to a real client afterwards.
- [ ] AC7: The finding is written: this document records, with evidence from the built prototype,
      an answer to each of the six questions in "What the prototype produces", both halves
      included, and `format-handler-interface.md`'s re-open cites it.
- [ ] AC8: A real `ansible-galaxy collection publish` against the asynchronous vehicle completes
      and a following `ansible-galaxy collection install` installs the collection, while the
      transcript shows the publish response returned a task URI before the import committed
      and at least one poll answered unfinished (404 or `finished_at` null) before the poll
      that carried `finished_at`, with the vehicle's runner held until the first poll is
      answered.
- [ ] AC9: A deferred import creates exactly one snapshot when it succeeds and none when it fails,
      the snapshot and the operation's terminal state commit together, the `Operation` record
      appears in no snapshot's content set, and a failed deferred import ends `state: failed`
      with `error.code`, `error.description` and `messages[]` the real client displays.
- [ ] AC10: A server killed at each step of a deferred import (after the publish response,
      mid-validation, and between the content commit and the operation's terminal transition)
      leaves, after restart, the operation terminal within a bounded time, the import applied
      at most once, and never a snapshot whose operation reads unfinished or a completed
      operation with no snapshot.
- [ ] AC11: A GC sweep forced while an import is pending, with an injected clock advanced past
      the repository-scoped grace period, does not collect the pending import's artifact blob,
      and the import then completes and the collection installs.
- [ ] AC12: Deferred work runs on the shared runner, never on a handler-owned goroutine or queue:
      an architecture test asserts the vehicle's handler package starts no goroutine that
      outlives its request and imports no queue or scheduler package.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/debian/signed_index_test.go` (real apt; `InRelease` and detached `Release.gpg` forms, each valid and tampered) |
| AC2 | conformance | `conformance/debian/republish_test.go` |
| AC3 | integration | `internal/format/debian/snapshot_test.go` |
| AC4 | integration + property | `internal/format/debian/concurrent_publish_test.go` |
| AC5 | architecture test | `internal/format/debian/arch_test.go` |
| AC6 | integration | `internal/storage/metadata_root_test.go` (drives the real threshold crossing, not a fixture) |
| AC7 | manual | this document's finding section, one answer per question with its evidence, cited by `format-handler-interface.md` AC8 |
| AC8 | conformance | `conformance/ansible/deferred_publish_test.go` (real `ansible-galaxy` publish then install; transcript assertions; runner held by the vehicle's hold setting until the first poll) |
| AC9 | integration | `internal/format/ansible/deferred_snapshot_test.go` (snapshot counts on success and failure, atomic commit under an injected fault, record absent from every content set); `conformance/ansible/deferred_publish_test.go` (failed-import rendering by the real client) |
| AC10 | integration + fault injection | `internal/format/ansible/deferred_crash_test.go` (process kill at each named step, restart, invariants checked) |
| AC11 | integration | `internal/storage/pending_operation_gc_test.go` (forced sweep past the grace period with an injected clock) |
| AC12 | architecture test | `internal/format/ansible/arch_test.go` |

## Implementation Phases

### Phase 1: Minimal archive, read path
- Serve `dists/<suite>/Release`, `InRelease`, `Release.gpg` and one component and architecture's
  `Packages`, from fixed content, to a real apt client.

### Phase 2: The write trigger
- Publish a `.deb`, regenerate the indexes, re-sign, through whatever shape the shared layer
  currently allows. Record what was awkward.

### Phase 3: The hard cases
- Concurrency, the snapshot boundary, and the CAS-backed `Release` crossing the size threshold.

### Phase 4: The asynchronous half
- Waits on the `Operation` entity in `data-model.md`. A minimal Galaxy-shaped publish, poll and
  install; deferral through a shared runner; then the hard cases: the snapshot boundary, crash
  recovery at each step, and a GC sweep while an import is pending. Record what was awkward.

### Phase 5: The finding
- Answer the six questions here with evidence, and hand it to the re-open.

## Tasks

Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. Q1 was adopted on 2026-09-26 under the owner's standing delegation and folded through
Context, Scope, Design, the criteria (AC7 rewritten, AC8 to AC12 added), the Test Plan and the
Phases.

### Resolved: whether the prototype covers asynchronous import tasks (was Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: the prototype gains a
minimal asynchronous publish path, built as a genuinely deferred Galaxy-shaped publish-and-poll
on the shared `Operation` entity, and the finding answers three further questions about it
(Design, "The second class: asynchronous operations" and "What the prototype produces"; AC8 to
AC12; Phase 4).

Accepted cost: a second vehicle to build before a gate that blocks every Tier 1 format, and
evidence weaker in kind than the apt half's, because the client polls the same way whether or
not the server deferred, so deferral itself is asserted by integration test. Choosing a Galaxy
shape narrows that weakness: the real `ansible-galaxy` still oracles the poll contract and the
effect, which a synthetic async endpoint would not. Why the alternatives lost: A re-opens the
interface blind to half of what its own deciding record named; C puts two gates on the critical
path AC8 already blocks, for no evidence B does not also produce.

Made consistent with `ansible-collections.md`, whose import-task decisions were adopted in the
same pass (was Q1 and Q6 there): that format validates synchronously in v1 and keeps its task
record in a shared `Operation` entity `data-model.md` must gain, and this half is what tells the
re-open, and then the charter's step 6a asynchronous-operation subsystem, whether deferral is
expressible and what the entity must look like. The entity is a precondition of Phase 4 here and
of Phase 1 there.

The original question:

The decision that created the prototype cites two things generic and OCI do not exercise: signed
index generation and async import tasks. Debian only exercises the first. The async class had
independent evidence in `ansible-collections.md` (a Galaxy publish returns a task id to poll,
and the shared model had no entity for an asynchronous operation), still unanswered when this
was raised. If the re-open is meant not to be blind, it is not obvious it should be blind to half
of what the decision named.

**Recommendation:** B - extend this prototype with a minimal async publish path, because the
re-open is a scheduled, one-time gate blocking six Tier 1 formats, and discovering mid-Tier-1 that
the interface cannot express an async import is exactly the contamination of the format-cost
measurement that the write-triggered decision was taken to avoid.

| Option | You get | It costs |
|---|---|---|
| **A. Signed indexes only, as named** | The narrowest prototype that satisfies AC8 as written; Debian alone is the vehicle and the scope stays small | The re-open is blind to one of the two classes its own decision named, and the Galaxy import-task question has to be answered against an interface that was re-opened without considering it |
| **B. Extend to a minimal async publish path** | The re-open sees both classes its decision named; the Galaxy import-task question gains evidence instead of waiting on a second re-open | A second vehicle to build, and the async path has no real-client oracle for the trigger, so its evidence is weaker in kind than the apt evidence |
| **C. Split: a separate async prototype, also before the re-open** | Each prototype stays coherent, and the async one can be scheduled against whenever the async-model question is answered | Two gates before Tier 1 rather than one, and the schedule risk lands on the critical path that AC8 already blocks |

**Why this is yours:** it sets how much evidence a one-time, six-format-blocking gate is required
to have before it fires, and that is a sequencing and risk call rather than a technical one.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | 0dbca1f | folding adopted recommendations under the standing delegation | Not a review: adoption and application of this spec's own recommendation, made consistent with `ansible-collections.md`'s import-task decisions adopted in the same pass. Q1 adopted as B: the prototype gains a genuinely deferred Galaxy-shaped publish-and-poll, driven by the real `ansible-galaxy`, storing task records in the shared `Operation` entity. Context, Scope (the async vehicle in; Galaxy format delivery and the production async subsystem out, both step 6a), Design (the second class rewritten as a design section with its collisions: the snapshot rule, GC grace for a pending import, the pinned method set, crash durability) and the finding's question list (three to six) folded. AC7 rewritten to six answers; AC8 (real-client publish and install against a deferred import, transcript proving deferral), AC9 (one snapshot on success, none on failure, atomic with the terminal state), AC10 (crash at each step), AC11 (GC sweep past grace while pending) and AC12 (architecture test: no handler-owned deferred work) added with Test Plan rows; Phase 4 added for the async half, the finding moved to Phase 5. The two citations of the Galaxy spec's since-resolved import-task question reframed as resolved. Stays draft. |
