---
status: draft
status_description: "First review pass (2026-09-22) raised six open questions (Q4-Q9) on snapshot write granularity, snapshot GC liveness, content-set representation, the missing Upstream entity, package/repository-scope metadata, and the OCI reference graph; stays draft until the owner answers."
description: "Spec for the shared generic data model every format stores against, adapting Gitea's four-table package model and Pulp's RemoteArtifact and download policies."
author: michielvha
goal: "Make breadth affordable by giving all 33 ecosystems one metadata schema, so a format is parsing plus routes rather than a bespoke database design."
priority: "critical"
issue: 12
created: 2026-09-22
covers:
  - "internal/model/**"
  - "internal/storage/**"
  - "internal/proxy/**"
---

# Plan: Shared data model

One metadata schema for every ecosystem. This is the spec that decides whether breadth is
affordable, and it did not exist until the prior-art survey showed why it has to.

## Context

The specs as originally written left metadata storage to each format handler. Across 33
ecosystems that reproduces 31 bespoke schemas, 31 sets of migrations, and 31 different answers to
"what does it mean for a version to exist" - which is the opposite of the modularity the project
depends on.

The prior art is unambiguous
(`docs/internal/research/registry-architecture-prior-art.md`). **Gitea serves all 23 of its
formats from one four-table model:**

```
Package 1--* PackageVersion 1--* PackageFile *--1 PackageBlob
```

Breadth there is affordable because the *model* is generic, not because the runtime is
pluggable. A format becomes metadata parsing plus HTTP routes on top of shared tables.

Pulp adds the piece Gitea lacks. Its `RemoteArtifact` records **where to fetch an artifact that
is not stored locally**, which makes pull-through caching fall out of the data model rather than
existing as a separate cache subsystem. Combined with a per-remote download policy
(`immediate` / `on_demand` / `streamed`) it covers mirroring, caching and pass-through from one
schema.

Since this project's differentiator *is* upstream caching, we need Gitea's genericity and Pulp's
remote modelling together.

## Scope

**In scope**

- The shared entity model: repository, package, version, file, blob.
- Per-format metadata as a typed-but-opaque document hung off the version, so formats do not
  each get tables.
- `RemoteArtifact`-equivalent: a known artifact with an upstream location and no local blob.
- Download policies: `immediate`, `on_demand`, `streamed`.
- The liveness rules GC must honour, given a blob can now be referenced by a cached artifact as
  well as by a published one.

- **The snapshot dimension**: every write produces an immutable repository snapshot, and serving
  resolves through a pointer to one. The schema carries this from day one; the promotion and
  rollback *features* do not ship in v1.

**Out of scope**

- The promotion API, environment pointers and rollback UX. The schema makes them a later feature
  rather than a migration; building them now would delay the first working format.
- Per-format index generation. That belongs to handlers and to the signed-index shared service.

## Design

### The entity model

| Entity | Owns | Notes |
|---|---|---|
| `Repository` | name, format, visibility, upstream config | The unit of RBAC and of proxy configuration |
| `Package` | name, format | One per package name per repository |
| `Version` | version string, format-specific metadata document | Metadata is a JSON document the handler reads and writes; the core never interprets it |
| `File` | filename, relative path, digest | Links a version to blobs; multiple files per version is the norm (wheel plus sdist, jar plus pom plus sources) |
| `Blob` | digest, size | Content-addressed. Deduplicated across every format and repository |
| `Upstream` | URL, credential ref, download policy, adapter type, failover order | One row per configured upstream. Rotating a credential touches one row |
| `RemoteFile` | `Upstream` ref, upstream path, last-checked | A file known to exist upstream with no local blob yet |
| `Snapshot` | monotonic number, repository, content set | Immutable. Every write creates one |
| `Pointer` | name, target snapshot | What a serving URL resolves through. v1 ships exactly one per repository, always tracking the newest snapshot |

**Opaque metadata hangs at all three levels.** `Repository`, `Package` and `Version` each carry a
metadata document the core never parses, so a handler stores state at whichever level the
ecosystem actually keeps it:

| Level | Example state |
|---|---|
| `Repository` | Debian's signed `Release` index, repository-wide settings a format needs |
| `Package` | npm dist-tags, Maven's `latest` and `release` |
| `Version` | the per-release metadata document |

Without the upper two levels, npm, Maven and Debian have nowhere to put required state, which the
review found as three concrete holes in Tier 1.

The core owns every table. A handler reads and writes the metadata documents and never issues its
own DDL. **If a format appears to need its own table, that is a signal the shared model is wrong,
not a licence to add one** - raise it as a spec change.

### Cached and hosted are the same store

Adopting Pulp's answer to `proxy-cache.md` Q1: there is no separate cache store. A `File` either
has a local `Blob` or has a `RemoteFile` telling the system where to get one, and "cached" is a
statement about how the blob arrived, not about where it lives.

Consequences worth stating explicitly, because they are where the bugs will be:

- A blob can be referenced by a published artifact **and** a cached one simultaneously. GC
  liveness therefore has two reference classes, which the resolved collection strategy in
  `storage-and-gc.md` now prices in: the sweep marks from both roots. Whether snapshots add a
  third root is Q5 below.
- When several upstreams offer the same content, there is **one** `Package`/`Version` and
  **several** `RemoteFile` rows, tried in turn. This falls out of the model rather than needing
  failover logic in each handler.

### Download policies

| Policy | On sync | On client request | Stores? |
|---|---|---|---|
| `immediate` | fetch everything now | serve locally | yes |
| `on_demand` | record metadata only | fetch upstream, serve, save | yes, once |
| `streamed` | record metadata only | fetch upstream, serve | no |

`on_demand` is the default and is what "caching proxy" means in this product.

### Snapshots: schema now, features later

Every write creates a `Snapshot` (what counts as a write is open - Q4); serving always
resolves through a `Pointer`. In v1 there is
exactly one pointer per repository and it always advances to the newest snapshot, so the
behaviour is indistinguishable from a mutable repository. Nothing in the API exposes snapshots.

The reason to pay this cost now is that it is **not additive later**. Retrofitting a version
dimension means touching every table and every handler, because "what is in this repository"
becomes "what is in this repository at snapshot N". Paying a small structural cost up front turns
promotion (`dev` -> `staging` -> `prod` pointers at one snapshot), instant rollback (repoint, do
not delete) and frozen upstream mirrors into **features you switch on**, not a migration.

**Binding constraint on handlers:** a handler resolves content through the pointer it is given
and must never assume a repository has exactly one current state. An architecture test enforces
this, because a single handler that reads "latest" directly silently reintroduces the retrofit.

## Acceptance Criteria

- [ ] AC1: All implemented formats store metadata through the shared model; no handler owns a
      table, proven by an architecture test asserting no handler package references a migration
      or DDL.
- [ ] AC2: The same content published to two different formats in two repositories results in one
      `Blob` row and one stored object.
- [ ] AC3: A `Version` round-trips a format-specific metadata document that the core never parses,
      demonstrated by two formats with incompatible metadata shapes coexisting.
- [ ] AC4: A `File` with a `RemoteFile` and no local `Blob` serves a client request by fetching
      upstream, and under `on_demand` a second request is served locally with no upstream call
      (asserted at the network layer).
- [ ] AC5: Under `streamed`, a second request does contact the upstream and no blob is persisted.
- [ ] AC6: Two upstreams offering identical content produce one `Version` and two `RemoteFile`
      rows, and serving succeeds when the first upstream is unreachable.
- [ ] AC7: GC treats a blob referenced only by a cached file as live, proven by a test that runs
      GC against a repository whose content arrived entirely by `on_demand`.
- [ ] AC8: Adding a format requires zero schema migrations, demonstrated across the Tier 0 and
      Tier 1 formats.
- [ ] AC9: A content-changing write produces a new `Snapshot` and advances the repository's
      pointer, and a read served after repointing to an older snapshot returns that snapshot's
      content, proving serving really resolves through the pointer.
- [ ] AC10: No handler package resolves repository content except through the pointer or
      snapshot it is given, enforced by the architecture test named in Design.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | architecture test | `internal/model/arch_test.go` |
| AC2 | integration | `internal/model/dedup_test.go` |
| AC3 | unit | `internal/model/metadata_test.go` |
| AC4 | integration | `internal/proxy/ondemand_test.go` (network-level assertion) |
| AC5 | integration | `internal/proxy/streamed_test.go` |
| AC6 | integration | `internal/proxy/failover_test.go` |
| AC7 | property | `internal/storage/gc_property_test.go` |
| AC8 | manual | procedure: each format's spec review confirms the format PR contains no schema migration, recorded per format in `docs/internal/tasks/experiment-log.md` |
| AC9 | integration | `internal/model/snapshot_test.go` |
| AC10 | architecture test | `internal/model/arch_test.go` |

## Implementation Phases

### Phase 1: Core entities
Repository, Package, Version, File, Blob, with the opaque metadata document.

### Phase 2: Remote modelling
`RemoteFile`, download policies, upstream failover.

### Phase 3: GC integration
The second reference class, and the property tests that police it.

## Tasks

Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

The first review pass (2026-09-22, adversarial lens) raised the questions below. Each is a
place where two implementors would build different systems, or where a promised feature has no
home in the schema as written. Implementation cannot start while they stand.

Resolved decisions are kept at the end rather than deleted, so the reasoning survives the next
time someone asks why it was done this way.

### Resolved: what counts as a write (was Q4)

**Settled 2026-09-23: one snapshot per completed logical publish.** `on_demand` cache
materialisation of files already known to the model does **not** create a snapshot.

Both halves matter. Publish-scoped snapshots are consistent states, so a rollback never lands
inside half a Maven deploy. Excluding cache fills keeps the snapshot sequence off the hot proxy
path, which would otherwise be serialised per repository - directly harming the differentiator.

Accepted cost: each handler declares where its publish boundary is, and declaring it wrongly
produces snapshots that are not consistent states. That declaration belongs in the format's spec
and is a review item, not an implementation detail.

### Resolved: snapshot liveness (was Q5)

**Settled 2026-09-23 by `storage-and-gc.md`.** A blob referenced only from a snapshot inside
the retention window is live; once that snapshot is pruned, the reference no longer protects it.
Retained snapshots are the third GC mark root alongside published and cached references.

### Resolved: snapshot representation (was Q6)

**Settled 2026-09-23: deltas from the previous snapshot, with periodic full checkpoints.**
Write cost is O(change) rather than O(repository), so a repository with 100k packages does not
rewrite its whole membership on every publish.

Checkpoints are not optional: without them, reading "what was in snapshot 41" degrades linearly
with history length. The checkpoint interval is a tuning parameter, and the read path must never
walk an unbounded chain.

A delta records both membership **and** the metadata documents at all three levels, so a rollback
restores dist-tags and indexes rather than only which versions existed. A membership-only delta
would produce a partial restore that looks complete, which is worse than no rollback at all.

### Resolved: upstream entity (was Q7)

**Settled 2026-09-23: add an explicit `Upstream` entity.** One row per configured upstream
holding its URL, credential reference, download policy, adapter type and failover order.
`RemoteFile` references it rather than carrying copies.

This also gives the upstream-adapter axis settled in `format-handler-interface.md` an actual home
in the schema, which it previously lacked. Accepted cost: one more entity. The alternative was
rewriting every remote row on a credential rotation, with failover ordering left implicit.

### Resolved: metadata levels (was Q8)

**Settled 2026-09-23: an opaque metadata document at all three levels - `Repository`, `Package`
and `Version`.** Symmetric with the existing version-level document, introduces no new concept,
and the core remains ignorant of every format's contents.

This gives npm dist-tags and Maven's `latest`/`release` a package-level home and Debian's signed
`Release` index a repository-level one, closing the three Tier 1 gaps the review found.

Accepted cost: handlers must know which level their state belongs at, and there are three places
to look when debugging. The alternative - dedicated typed tables - would have given the core
knowledge of specific formats and started the slide back toward the bespoke schemas this model
exists to prevent.

### Q9: How do OCI manifest lists and the referrers API map onto the model?

**Recommendation:** For v1 the OCI handler flattens transitive blob references into `File`
rows so GC stays sound and keeps the manifest graph inside the opaque document, and the
referrers API is deferred until a generic version-to-version reference edge is added - raised
then as the spec change this spec's own escalation rule demands. The collision exists today:
`oci.md` lists the referrers API in scope, and "list artifacts whose subject is X" is a query
the core cannot serve over a document it never parses.

| Option | You get | It costs |
|---|---|---|
| **A. Flatten now, reference edge later** | No schema addition today; GC stays correct via `File` rows | Referrers deferred, so `oci.md`'s scope must say so; removing one platform manifest from an index has no first-class representation |
| **B. Add a version-to-version `Reference` edge now** | Referrers and index-child deletion fall out queryably | A core table and edge semantics thirty-plus other formats never use |

**Why this is yours:** either answer forces an edit to `oci.md`'s scope or to this schema, and
choosing which spec bends is an architecture call.

### Resolved: remote modelling (was Q1)

**Settled 2026-09-22: adopt Pulp's `RemoteArtifact` model.** One store; a file either has a local
blob or a remote row saying where to fetch it, and "cached" describes how a blob arrived rather
than where it lives. This also resolves `proxy-cache.md` Q1.

Accepted cost: GC gains a second reference class, in the component the charter already names as
the most dangerous. `storage-and-gc.md` carries that consequence explicitly.

### Resolved: snapshots (was Q2)

**Settled 2026-09-22: the schema carries the snapshot dimension from day one; promotion and
rollback ship as later features.** The reasoning is that versioning is not additive - retrofitting
it touches every table and every handler - so a small structural cost now converts an expensive
migration into a feature flag. See the Snapshots section in Design for the binding constraint on
handlers.

### Resolved: metadata typing (was Q3, briefly renumbered Q1)

**Settled 2026-09-22: opaque to the core, typed inside the handler.** The core stores and
returns a JSON document it never interprets.

Accepted cost: the core cannot query across formats, so features like "every artifact under this
licence" need a separate index built later rather than falling out of the schema. That is the
right trade: the core gaining knowledge of any single format's metadata shape is the first step
back toward the 31 bespoke schemas this model exists to prevent.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-22 | afbb4e4 | adversarial + constitution + sibling consistency (code-claim verification vacuous: pre-implementation, no tree to check) | Breadth claim stressed against Maven, OCI, Debian and npm; six open questions raised (Q4-Q9), snapshot ACs added (AC9, AC10), stale sibling references corrected; stays draft |
