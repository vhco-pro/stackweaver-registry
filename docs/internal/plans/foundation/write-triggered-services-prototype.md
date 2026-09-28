---
description: "Defines the write-triggered services prototype that format-handler-interface.md AC8 names as an input to the scheduled interface re-open: what it must demonstrate for both classes its deciding record named (signed indexes, with Debian as the vehicle, and asynchronous operations, with a Galaxy-shaped publish-and-poll), and how anyone would know it succeeded."
covers: []
status: draft
status_description: "Reconciled 2026-09-28 at b31b889 with the foundation authoring wave (not a review): AC8's hold is the admin pause of the manage.apply kind (async-operations AC10), the disposable runner mirrors the production claim/lease/fence shape, AC11's expected answer is the job-held grace (async-operations was-Q4, AC13), the design-side answers signing-service (Indexer, write-path trigger) and async-operations (Operator.Apply, Operation plus Job) give to questions 1, 2, 4, 5 and 6 are named as what the finding confirms or refutes, the production async subsystem is cited at steps 4b and 6a, and AC13 adds the repoint and by-hash confirmations debian.md asked of Phase 3. Earlier: Q1 adopted under the owner's standing delegation (B, extend to an async publish path), giving the Debian signed-index half and a Galaxy-shaped deferred publish-and-poll half, AC8-AC12 and six answered questions (AC7). Never gate-reviewed; no open questions; stays draft."
author: michielvha
goal: "Make the interface re-open's evidence concrete, so the decision on write-triggered services is argued from something built rather than from anticipation."
priority: "high"
issue: 16
created: 2026-09-26
---

# Plan: the write-triggered services prototype

## Context

`format-handler-interface.md` pinned its method set at five and scheduled a re-open after OCI,
before any Tier 1 handler work. Its AC8 names the inputs to that re-open: the generic
implementation, the OCI implementation, **this prototype's finding on both of its halves** (the
Debian-shaped signed-index half and the Galaxy-shaped asynchronous half), the three optional
interfaces discovered at registration (`management-api.md`'s `Operator`, `signing-service.md`'s
`Indexer`, `web-ui.md`'s `surface.Declarer`, on each of which the re-open rules fold in, keep
optional or consolidate), and further sibling evidence (the request-to-coordinate evidence, the
server-side ingest hook, the host binding's home). Two of those interfaces are design-side
answers to this prototype's questions, written after it was specced: `Indexer` to question 1
and `Operator.Apply` to question 4 ("What the prototype produces" says what the finding does
with them).

The prototype exists because of that spec's resolved write-triggered-services decision, which
settled on 2026-09-23 that such services would not enter the interface immediately but would be
prototyped first, on the reasoning that "generic and OCI exercise neither signed-index generation
nor async import tasks, and prior art identifies signed-index formats as the expensive class.
Re-opening the interface with only those two implementations in hand would be re-opening it
blind."

**Nothing anywhere defines what the prototype is.** AC8 requires it, the charter's build order
schedules it between steps 4 and 5, and the accepted cost of the decision is recorded, but no
document says what it builds, what it must demonstrate, or how anyone would know it had
succeeded. That is a named precondition for a gate that blocks every Tier 1 format, and it is
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
  its task records in the shared model's `Operation` entity, which `data-model.md` defines (its
  "Operations" section and AC32) and must have built before this half starts (the same entity `ansible-collections.md` requires).
- The six questions the re-open needs answered, three per half, and evidence for each; plus the
  two captured Debian facts (repoint visibility, `by-hash` as a CAS key) confirmed on the way.
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
- **The production asynchronous-operation subsystem.** `async-operations.md`: its queue core
  lands at the start of charter step 4b, immediately after the re-open records this half's
  finding (its Phases 1 to 3, its resolved build-placement decision, was Q9), and its deferred
  management operation at step 6a (its Phase 4); the prototype is disposable.
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
  the re-open has its answer. `signing-service.md`, written after this prototype was specced,
  takes a position the prototype now tests rather than discovers: the shared layer does call
  back for bytes, through an optional `Indexer` interface discovered by type assertion at
  registration (a pure generator: records in, bytes out), not a pinned method, and the shared
  write path owns the trigger (its resolved renderer-placement and trigger decisions). What the
  prototype can still refute is whether a generator can produce Debian's indexes without request
  context it is never given; if it cannot, that spec's contract is revised before its Phase 1.

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
queue core is built at the start of the charter's step 4b and the production deferred
management operation and the production handler at step 6a (`async-operations.md` Phases 1 to 3
and Phase 4), from what it teaches. The disposable runner **mirrors the production queue's
claim, lease and fence shape** (a `SKIP LOCKED` claim, a lease with a fencing token, a fenced
terminal transition) rather than inventing a simpler one, so that the crash and durability
evidence transfers; and the hold that keeps the import pending until the first poll is the
production mechanism too, the admin pause of the `manage.apply` kind (`async-operations.md`
AC10, its resolved pause-and-resume decision, was Q6), driven from the conformance case's
`script`, so the server carries no test-only hold.

Where it collides with what is already settled:

- **`data-model.md`'s snapshot rule.** A deferred import is one completed logical write that
  completes after its request has ended. It must still produce exactly one snapshot on success
  and none on failure, with the `Operation` record outside every snapshot's content set, and the
  terminal transition and the snapshot must commit together or not at all.
- **`storage-and-gc.md`'s grace machinery.** The artifact's bytes are committed to the CAS before
  the import that will reference them runs. If the runner is slow, or the process restarts, a
  pending import can outlive the repository-scoped grace period that protects unreferenced
  blobs. `async-operations.md` answers this in design (its resolved grace-hold decision, was Q4,
  and AC13): an unfinished job naming a repository holds that repository's grace open, exactly
  as an unexpired upload session does, a timing input to the grace clock and not a sixth mark
  root. The prototype **verifies that answer rather than discovers one**: AC11 expects the
  pending import's blob to survive, and a collected blob is a refutation raised as a revision
  request to that spec and `storage-and-gc.md`, not a root the prototype adds on its own.
- **`format-handler-interface.md`'s pinned method set.** If the handler can hand deferred work to
  a shared runner through `Deps` and the runner never needs to call the handler back, no method
  is added. If the runner must call into the handler to validate format-specific content, that
  is a new method, and the re-open has its answer. `async-operations.md`'s design-side answer is
  that the runner never calls a handler: the `manage.apply` job reaches format code only through
  `management-api.md`'s optional `Operator` interface and its `Apply` method, via
  `internal/manage`, with no pinned method added. The prototype's vehicle is built on that path,
  so question 4's finding is whether the Galaxy import's validation fits inside `Apply`.
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
   or does its shape need to change before the production queue core lands at the start of the
   charter's step 4b and the deferred management operation at step 6a?

Four of the six now have design-side answers in sibling specs written after this prototype was
specced, and the finding records for each whether the built prototype confirms or refutes it:
question 1, `signing-service.md`'s optional `Indexer` (a callback for bytes that is not a pinned
method); question 2, that spec's write-path-owned trigger, which makes question 3 hold by
construction if it holds at all; question 4, `async-operations.md`'s rule that the runner reaches
a handler only through `Operator.Apply`; question 5, its job-held grace (was Q4, AC13); and,
for question 6, its pairing of the client-visible `Operation` with a runner-side `Job` (was Q3)
and `data-model.md` AC32's `cancelled` terminal state. A confirmation is cited by the re-open; a
refutation is a revision request to the sibling spec before its first phase, which is the point
of running the prototype before those phases start.

The signed-index half also confirms two captured facts `formats/debian.md` recorded after this
prototype was specced and asked to have checked here, because Phase 3 is the cheapest place
(its "What this spec takes from the prototype"): apt discards a signed `Release` dated older
than the one it holds and revalidates with `If-Modified-Since` alone, so a repoint to an older
snapshot is invisible unless the served envelope is re-dated from the pointer's freshness record
(`data-model.md`, "Freshness scoped to the pointer", AC36; `signing-service.md`'s pointer
documents); and apt requests `by-hash` under the strongest hash `Release` lists, so listing
SHA256 only makes every `by-hash` path a CAS key. AC13 asserts both. They are confirmations,
not a seventh question: the finding stays at six.

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
      that carried `finished_at`, with the import held until the first poll is answered by the
      admin pause of the `manage.apply` kind (`async-operations.md` AC10) from the case's
      `script`, and no test-only hold in the server.
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
      and the import then completes and the collection installs; the expected mechanism is the
      job-held grace `async-operations.md` specifies (its resolved grace-hold decision, was Q4,
      and AC13), the mark-root set stays five, and a collected blob is recorded in the finding as
      a refutation of that decision.
- [ ] AC12: Deferred work runs on the shared runner, never on a handler-owned goroutine or queue:
      an architecture test asserts the vehicle's handler package starts no goroutine that
      outlives its request and imports no queue or scheduler package (the test
      `async-operations.md` AC16 generalises to every package of the module).
- [ ] AC13: After the prototype repository's default pointer is repointed to an older snapshot,
      a real apt that updated before the repoint adopts the older content on its next `apt-get
      update`, because the served `InRelease` is re-dated from the pointer's freshness record
      and its `Last-Modified` moves forward (never a `304`, never a silently ignored older
      `Release`); and every `by-hash` path apt requests resolves as a CAS key, because the
      generated `Release` lists SHA256 only.

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
| AC8 | conformance | `conformance/ansible/deferred_publish_test.go` (real `ansible-galaxy` publish then install; transcript assertions; the `script` pauses the `manage.apply` kind through the admin route, polls, resumes; shared with `async-operations.md` AC10) |
| AC9 | integration | `internal/format/ansible/deferred_snapshot_test.go` (snapshot counts on success and failure, atomic commit under an injected fault, record absent from every content set); `conformance/ansible/deferred_publish_test.go` (failed-import rendering by the real client) |
| AC10 | integration + fault injection | `internal/format/ansible/deferred_crash_test.go` (process kill at each named step, restart, invariants checked; shared with `async-operations.md` AC6 as its prototype instance) |
| AC11 | integration | `internal/storage/pending_operation_gc_test.go` (forced sweep past the grace period with an injected clock; shared with `async-operations.md` AC13) |
| AC12 | architecture test | `internal/format/ansible/arch_test.go` (the module-wide form is `internal/async/goroutine_test.go`, `async-operations.md` AC16) |
| AC13 | conformance + unit | `conformance/debian/repoint_test.go` (real apt updated, repoint to the older snapshot, second update adopts it; `Last-Modified` and `InRelease` date asserted forward-moving in the transcript); `internal/format/debian/by_hash_test.go` (every `by-hash` path in the generated `Release` equals a CAS key) |

## Implementation Phases

### Phase 1: Minimal archive, read path
- Serve `dists/<suite>/Release`, `InRelease`, `Release.gpg` and one component and architecture's
  `Packages`, from fixed content, to a real apt client.

### Phase 2: The write trigger
- Publish a `.deb`, regenerate the indexes, re-sign, through whatever shape the shared layer
  currently allows. Record what was awkward.

### Phase 3: The hard cases
- Concurrency, the snapshot boundary, and the CAS-backed `Release` crossing the size threshold.
- The repoint case `formats/debian.md` asked for: a real apt across a repoint to an older
  snapshot, with the envelope re-dated from the pointer's freshness record, and the hash-set
  check that every `by-hash` path is a CAS key (AC13). Record whether the pointer-held envelope
  fits the one-snapshot rule without bending it.

### Phase 4: The asynchronous half
- Waits on the `Operation` entity `data-model.md` defines (its AC32), built in that spec's
  Phase 5, and on `management-api.md` Phase 2's `Operator` and deferred-operation wire shape,
  which the vehicle's publish runs on. A minimal Galaxy-shaped publish, poll and install;
  deferral through a disposable runner that mirrors `async-operations.md`'s claim, lease and
  fence shape, held for AC8 by the admin pause of the `manage.apply` kind rather than by any
  vehicle-only setting; then the hard cases: the snapshot boundary, crash recovery at each step,
  and a GC sweep while an import is pending, whose expected answer is the job-held grace
  (AC11). Record what was awkward, and which of the design-side answers to questions 4 to 6
  the built half refuted.

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
record in a shared `Operation` entity `data-model.md` now defines, and this half is what tells the
re-open, and then the production asynchronous-operation subsystem (its queue core at the start
of the charter's step 4b, its deferred management operation at step 6a, since
`async-operations.md`'s 2026-09-27 placement decision), whether deferral is expressible and what
the entity must look like. The entity is a precondition of Phase 4 here and
of Phase 1 there.

The original question:

The decision that created the prototype cites two things generic and OCI do not exercise: signed
index generation and async import tasks. Debian only exercises the first. The async class had
independent evidence in `ansible-collections.md` (a Galaxy publish returns a task id to poll,
and the shared model had no entity for an asynchronous operation), still unanswered when this
was raised. If the re-open is meant not to be blind, it is not obvious it should be blind to half
of what the decision named.

**Recommendation:** B - extend this prototype with a minimal async publish path, because the
re-open is a scheduled, one-time gate blocking every Tier 1 format, and discovering mid-Tier-1 that
the interface cannot express an async import is exactly the contamination of the format-cost
measurement that the write-triggered decision was taken to avoid.

| Option | You get | It costs |
|---|---|---|
| **A. Signed indexes only, as named** | The narrowest prototype that satisfies AC8 as written; Debian alone is the vehicle and the scope stays small | The re-open is blind to one of the two classes its own decision named, and the Galaxy import-task question has to be answered against an interface that was re-opened without considering it |
| **B. Extend to a minimal async publish path** | The re-open sees both classes its decision named; the Galaxy import-task question gains evidence instead of waiting on a second re-open | A second vehicle to build, and the async path has no real-client oracle for the trigger, so its evidence is weaker in kind than the apt evidence |
| **C. Split: a separate async prototype, also before the re-open** | Each prototype stays coherent, and the async one can be scheduled against whenever the async-model question is answered | Two gates before Tier 1 rather than one, and the schedule risk lands on the critical path that AC8 already blocks |

**Why this is yours:** it sets how much evidence a one-time gate blocking every Tier 1 format is required
to have before it fires, and that is a sequencing and risk call rather than a technical one.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | 0dbca1f | folding adopted recommendations under the standing delegation | Not a review: adoption and application of this spec's own recommendation, made consistent with `ansible-collections.md`'s import-task decisions adopted in the same pass. Q1 adopted as B: the prototype gains a genuinely deferred Galaxy-shaped publish-and-poll, driven by the real `ansible-galaxy`, storing task records in the shared `Operation` entity. Context, Scope (the async vehicle in; Galaxy format delivery and the production async subsystem out, both step 6a), Design (the second class rewritten as a design section with its collisions: the snapshot rule, GC grace for a pending import, the pinned method set, crash durability) and the finding's question list (three to six) folded. AC7 rewritten to six answers; AC8 (real-client publish and install against a deferred import, transcript proving deferral), AC9 (one snapshot on success, none on failure, atomic with the terminal state), AC10 (crash at each step), AC11 (GC sweep past grace while pending) and AC12 (architecture test: no handler-owned deferred work) added with Test Plan rows; Phase 4 added for the async half, the finding moved to Phase 5. The two citations of the Galaxy spec's since-resolved import-task question reframed as resolved. Stays draft. |
| 2026-09-26 | fe54272 | cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. From the charter fold: three places said the re-open blocks six Tier 1 formats, but Tier 1 now has nine rows (npm, PyPI, Ansible collections, Maven, Go modules, NuGet, Helm, Debian, RPM) and the re-open blocks any Tier 1 handler work, so each is rephrased without a count (Context, the Q1 recommendation and its why-yours line). From the format-management fold, as a consequence of `data-model.md` gaining the `Operation` entity in this same reconciliation: Scope, the was-Q1 record and Phase 4 cite the entity as defined there (its AC32, built in its Phase 5) rather than owed. Context's list of the re-open's inputs updated to what `format-handler-interface.md` AC8 now names, both halves of this prototype included. Not changed: `storage-and-gc.md` asks for a revision request only if AC11 here shows a pending import outliving the grace period, which is this prototype's finding to make. |
| 2026-09-28 | b31b889 | cross-spec reconciliation of the foundation authoring wave. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` naming this file verified against the source spec's current text before applying. From `async-operations.md` (item 11): AC8 and its Test Plan row hold the import through the admin pause of the `manage.apply` kind from the case `script` (its AC10, was Q6), with no vehicle-only hold; Phase 4 and Design have the disposable runner mirror the production claim, lease and fence shape; AC11 states its expected answer, the job-held grace (its was-Q4, AC13), so the prototype verifies rather than discovers, and the mark-root set stays five; AC10 and AC12 rows name the shared `async-operations.md` tests (AC6, AC16). From `signing-service.md` (item 7): its optional `Indexer` and write-path-owned trigger recorded as design-side answers to questions 1 and 2 that the finding confirms or refutes, alongside `Operator.Apply` for question 4 (async-operations item 12) and the `Operation` plus `Job` pairing for question 6; Context's re-open inputs updated to `format-handler-interface.md` AC8's current list (the three optional interfaces, the host binding). From `formats/debian.md` (Open item 20): AC13 added with a Test Plan row, and Phase 3 gains the repoint case (envelope re-dated from the pointer's freshness record, forward-moving `Last-Modified`) and the by-hash-equals-CAS-key check; the finding stays at six questions. The production async subsystem is now cited at the start of step 4b (queue core) and step 6a (deferred management operation) in Scope, Design and question 6. Already done: the format-management fold's item 4 (both halves named in `format-handler-interface.md` AC8 and here). Stays draft. |
