---
description: "Defines the write-triggered services prototype that format-handler-interface.md AC8 names as an input to the scheduled interface re-open: what it must demonstrate, why Debian is the vehicle, and how anyone would know it succeeded."
covers: []
status: draft
status_description: "Written 2026-09-26 to close a hole on the critical path: AC8 blocks all Tier 1 work on a re-open whose named input had no definition anywhere. Never reviewed. One open question."
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

This is not a Debian format spec. Debian delivery is charter build step 7 and has no spec at all,
along with the rest of Tier 1 beyond npm and PyPI.

## Scope

**In scope**

- A definition of what a write-triggered shared service is, concrete enough to argue about.
- A Debian-shaped vehicle: enough of an apt archive to make a publish trigger index regeneration
  and signing, exercised by real `apt`.
- The three questions the re-open needs answered, and evidence for each.
- Whether the shared layer or the handler owns the trigger, the regeneration and the signing key.
- A written finding, recorded here, that the re-open pass cites.

**Out of scope**

- **Debian format delivery.** Component and architecture matrices, `Contents` files, source
  packages, `Translation` files, pdiffs and the rest belong to the Debian handler at build step
  7. The prototype needs only enough archive to make the mechanism fire. Excluded because the
  prototype's purpose is evidence for an interface decision, not adoption of a format ahead of
  its tier.
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

### The second class, and why it is a question

The resolved decision names **two** things generic and OCI do not exercise: signed-index
generation and **async import tasks**. Debian is a vehicle for the first and not the second: an
apt publish is synchronous. The async class has since acquired independent evidence in
`ansible-collections.md` Q1, where a Galaxy publish returns a task id to poll and the shared model
has no entity for an asynchronous operation at all. Whether this prototype must also cover that is
Q1 below.

### What the prototype produces

A written finding in this document's Review Log and a new section here, cited by the re-open pass.
It answers three questions with evidence rather than argument:

1. Can a write-triggered service be expressed through the pinned five methods plus `Deps`, or does
   it require a new method?
2. Who owns the trigger: does the handler request regeneration, or does the shared write path
   notice and dispatch?
3. Does the mechanism preserve one-snapshot-per-publish under concurrent publishes to the same
   repository?

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
      an answer to each of the three questions in "What the prototype produces", and
      `format-handler-interface.md`'s re-open cites it.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/debian/signed_index_test.go` (real apt; `InRelease` and detached `Release.gpg` forms, each valid and tampered) |
| AC2 | conformance | `conformance/debian/republish_test.go` |
| AC3 | integration | `internal/format/debian/snapshot_test.go` |
| AC4 | integration + property | `internal/format/debian/concurrent_publish_test.go` |
| AC5 | architecture test | `internal/format/debian/arch_test.go` |
| AC6 | integration | `internal/storage/metadata_root_test.go` (drives the real threshold crossing, not a fixture) |
| AC7 | manual | this document's finding section, cited by `format-handler-interface.md` AC8 |

## Implementation Phases

### Phase 1: Minimal archive, read path
- Serve `dists/<suite>/Release`, `InRelease`, `Release.gpg` and one component and architecture's
  `Packages`, from fixed content, to a real apt client.

### Phase 2: The write trigger
- Publish a `.deb`, regenerate the indexes, re-sign, through whatever shape the shared layer
  currently allows. Record what was awkward.

### Phase 3: The hard cases
- Concurrency, the snapshot boundary, and the CAS-backed `Release` crossing the size threshold.

### Phase 4: The finding
- Answer the three questions here with evidence, and hand it to the re-open.

## Tasks

Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

### Q1: Does this prototype also have to cover asynchronous import tasks?

The decision that created the prototype cites two things generic and OCI do not exercise: signed
index generation and async import tasks. Debian only exercises the first. The async class now has
independent evidence in `ansible-collections.md` Q1 (a Galaxy publish returns a task id to poll,
and the shared model has no entity for an asynchronous operation), and Q1 there is unanswered.
If the re-open is meant not to be blind, it is not obvious it should be blind to half of what the
decision named.

**Recommendation:** B - extend this prototype with a minimal async publish path, because the
re-open is a scheduled, one-time gate blocking six Tier 1 formats, and discovering mid-Tier-1 that
the interface cannot express an async import is exactly the contamination of the format-cost
measurement that the write-triggered decision was taken to avoid.

| Option | You get | It costs |
|---|---|---|
| **A. Signed indexes only, as named** | The narrowest prototype that satisfies AC8 as written; Debian alone is the vehicle and the scope stays small | The re-open is blind to one of the two classes its own decision named, and `ansible-collections` Q1 has to be answered against an interface that was re-opened without considering it |
| **B. Extend to a minimal async publish path** | The re-open sees both classes its decision named; `ansible-collections` Q1 gains evidence instead of waiting on a second re-open | A second vehicle to build, and the async path has no real-client oracle for the trigger, so its evidence is weaker in kind than the apt evidence |
| **C. Split: a separate async prototype, also before the re-open** | Each prototype stays coherent, and the async one can be scheduled against whenever the async-model question is answered | Two gates before Tier 1 rather than one, and the schedule risk lands on the critical path that AC8 already blocks |

**Why this is yours:** it sets how much evidence a one-time, six-format-blocking gate is required
to have before it fires, and that is a sequencing and risk call rather than a technical one.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
