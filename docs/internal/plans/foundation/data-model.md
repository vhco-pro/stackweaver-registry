---
status: draft
status_description: "Second review pass (2026-09-23) applied the five folded 2026-09-23 decisions throughout Design, Scope, the entity table and the ACs, and raised Q10-Q14 (upstream scoping, proxied-repository snapshots, metadata concurrency, metadata document storage, mid-publish visibility); Q9 (OCI reference graph) still open; stays draft until the owner answers."
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
- Per-format metadata as typed-but-opaque documents at all three levels - repository, package
  and version - so formats do not each get tables.
- `RemoteArtifact`-equivalent: a known artifact with an upstream location, retained as
      provenance after a local blob is cached.
- An explicit `Upstream` entity holding each configured upstream's URL, credential reference,
  download policy, adapter type and failover order.
- Download policies: `immediate`, `on_demand`, `streamed`.
- The liveness rules GC must honour, given a blob can now be referenced by a cached artifact as
  well as by a published one.

- **The snapshot dimension**: every completed logical publish produces an immutable repository
  snapshot, stored as a delta with periodic full checkpoints, and serving resolves through a
  pointer to one. The schema carries this from day one; the promotion and
  rollback *features* do not ship in v1.

**Out of scope**

- The promotion API, environment pointers and rollback UX. The schema makes them a later feature
  rather than a migration; building them now would delay the first working format.
- Per-format index generation. That belongs to handlers and to the signed-index shared service.

## Design

### The entity model

| Entity | Owns | Notes |
|---|---|---|
| `Repository` | name, format, visibility, metadata document | The unit of RBAC and of proxy configuration; how it references its `Upstream` rows is Q10 |
| `Package` | name, format, metadata document | One per package name per repository |
| `Version` | version string, format-specific metadata document | Metadata is a JSON document the handler reads and writes; the core never interprets it |
| `File` | filename, relative path, digest | Links a version to blobs; multiple files per version is the norm (wheel plus sdist, jar plus pom plus sources) |
| `Blob` | digest, size | Content-addressed. Deduplicated across every format and repository |
| `Upstream` | URL, credential ref, download policy, adapter type, failover order | One row per configured upstream. Rotating a credential touches one row |
| `RemoteFile` | `Upstream` ref, upstream path, last-checked | An upstream source for a file, retained when the file gains a local blob so revalidation and failover keep their provenance |
| `Snapshot` | monotonic number, repository, delta (membership plus all three metadata levels), checkpoint marker | Immutable. Exactly one per completed logical publish; cache materialisation never creates one |
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

Adopting Pulp's answer to `proxy-cache.md` Q1: there is no separate cache store. A `File` may
have a local `Blob`, one or more `RemoteFile` rows telling the system where it came from, or both.
An uncached remote file has only remote provenance; an `on_demand` fetch adds the local blob while
retaining that provenance for revalidation and failover. "Cached" is a statement about how the
blob arrived, not about where it lives.

Consequences worth stating explicitly, because they are where the bugs will be:

- A blob can be referenced by a published artifact **and** a cached one simultaneously, and by
  a retained snapshot. GC liveness therefore has three reference classes, which the resolutions
  in `storage-and-gc.md` now price in: the sweep marks from three roots - published references,
  cached references, and snapshots inside the retention window - with a deletion-intent table as
  the write barrier between reference creation and sweep deletion. A blob referenced only from a
  pruned snapshot is no longer protected.
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

A completed logical publish creates exactly one `Snapshot`; `on_demand` cache materialisation
of files already known to the model never does (the resolved write-granularity question below).
Each handler's spec declares where its ecosystem's publish boundary falls, and that declaration
is a review item. What a publish means for a *proxied* repository, where content arrives by
sync and on demand rather than by publishing, is Q11. Serving always resolves through a
`Pointer`. In v1 there is exactly one pointer per repository and it always advances to the
newest snapshot, so the behaviour is indistinguishable from a mutable repository. Nothing in
the API exposes snapshots.

A snapshot is stored as a delta from its predecessor, with periodic full checkpoints, and the
delta captures the metadata documents at all three levels as well as membership, so repointing
restores dist-tags and indexes rather than only which versions existed. Two constraints follow
from that representation. The read path must never walk an unbounded chain: resolving any
snapshot reads one checkpoint plus at most the checkpoint interval of deltas. And pruning must
keep every retained snapshot reconstructible: a checkpoint or delta may be dropped only while no
snapshot inside the retention window depends on it, because retained snapshots are a GC mark
root, and a root whose content set can no longer be computed makes the sweep unsound.

The reason to pay this cost now is that it is **not additive later**. Retrofitting a version
dimension means touching every table and every handler, because "what is in this repository"
becomes "what is in this repository at snapshot N". Paying a small structural cost up front turns
promotion (`dev` -> `staging` -> `prod` pointers at one snapshot), instant rollback (repoint, do
not delete) and frozen upstream mirrors into **features you switch on**, not a migration.

**Binding constraint on handlers:** a handler resolves content through the pointer it is given
and must never assume a repository has exactly one current state. An architecture test enforces
this, because a single handler that reads "latest" directly silently reintroduces the retrofit.
What, if anything, a handler may serve from in-flight pre-snapshot publish state is Q14; until
that is answered, this constraint reads as absolute.

## Acceptance Criteria

- [ ] AC1: All implemented formats store metadata through the shared model; no handler owns a
      table, proven by an architecture test asserting no handler package references a migration
      or DDL.
- [ ] AC2: The same content published to two different formats in two repositories results in one
      `Blob` row and one stored object.
- [ ] AC3: A `Version` round-trips a format-specific metadata document that the core never parses,
      demonstrated by two formats with incompatible metadata shapes coexisting.
- [ ] AC4: A `File` with a `RemoteFile` and no local `Blob` serves a client request by fetching
      upstream, and under `on_demand` retains the `RemoteFile` after attaching the local `Blob`,
      so a second request is served locally with no upstream call and later revalidation still
      has its upstream provenance (asserted at the network layer).
- [ ] AC5: Under `streamed`, a second request does contact the upstream and no blob is persisted.
- [ ] AC6: Two upstreams offering identical content produce one `Version` and two `RemoteFile`
      rows, and serving succeeds when the first upstream is unreachable.
- [ ] AC7: GC treats a blob referenced only by a cached file as live, proven by a test that runs
      GC against a repository whose content arrived entirely by `on_demand`.
- [ ] AC8: Adding a format requires zero schema migrations, demonstrated across the Tier 0 and
      Tier 1 formats.
- [ ] AC9: A completed logical publish produces exactly one new `Snapshot` and advances the
      repository's pointer, and a read served after repointing to an older snapshot returns that
      snapshot's content, proving serving really resolves through the pointer.
- [ ] AC10: No handler package resolves repository content except through the pointer or
      snapshot it is given, enforced by the architecture test named in Design.
- [ ] AC11: A handler round-trips opaque metadata documents at the package and repository levels
      as well as the version level, none of which the core parses, demonstrated with a
      dist-tag-shaped document at package level and an index-shaped document at repository level.
- [ ] AC12: An `on_demand` cache materialisation of a file already known to the model creates no
      `Snapshot`, asserted directly against the snapshot table after a cache-filling request.
- [ ] AC13: Repointing to an older snapshot restores the metadata documents at all three levels
      as they were in that snapshot, proven by moving a package-level dist-tag after the
      snapshot and asserting the rollback serves the old document, not the newest.
- [ ] AC14: Changing an `Upstream` row's URL or credential reference changes where every
      `RemoteFile` referencing it fetches from, without any `RemoteFile` row being modified,
      proving remote rows reference the upstream rather than carrying copies.
- [ ] AC15: Resolving any snapshot's content reads one checkpoint plus a number of deltas
      bounded by the checkpoint interval, proven against a repository whose snapshot history
      spans several intervals.

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
| AC11 | unit | `internal/model/metadata_test.go` |
| AC12 | integration | `internal/proxy/ondemand_test.go` (snapshot-table assertion) |
| AC13 | integration | `internal/model/snapshot_test.go` |
| AC14 | integration | `internal/model/upstream_test.go` |
| AC15 | unit | `internal/model/snapshot_test.go` |

## Implementation Phases

### Phase 1: Core entities
Repository, Package, Version, File, Blob, with opaque metadata documents at all three levels.

### Phase 2: Snapshots and pointers
`Snapshot` (deltas plus periodic checkpoints, capturing membership and metadata) and
`Pointer`, with the single always-advancing v1 pointer and the pointer-resolution
architecture test.

### Phase 3: Remote modelling
`Upstream`, `RemoteFile`, download policies, upstream failover.

### Phase 4: GC integration
The cached and retained-snapshot reference classes, and the property tests that police them.

## Tasks

Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

The open questions below were raised by the review passes (Q9 on 2026-09-22, Q10-Q14 on
2026-09-23). Each is a place where two implementors would build different systems, or where a
settled decision left a boundary undefined. Implementation cannot start while they stand.

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

> **Answer this together with `formats/oci.md` Q2.** Both questions cover the same
> decision - how OCI's reference graph maps onto the shared model - and the second review round
> found them carrying **opposite recommendations**. One answer settles both; answering them
> independently is how the two specs end up describing different systems.

**Recommendation:** For v1 the OCI handler flattens transitive blob references into `File`
rows so GC stays sound and keeps the manifest graph inside the opaque document, and the
referrers API is deferred until a generic version-to-version reference edge is added - raised
then as the spec change this spec's own escalation rule demands. The collision exists today:
`oci.md` lists the referrers API in scope, and "list artifacts whose subject is X" is a query
the core cannot serve over a document it never parses.

Two facts have moved since this was written, without answering it. First, the three-level
metadata decision gives the handler a package-level document in which it could maintain its own
reverse referrers map, so option A no longer strictly forces deferring the referrers API; it
makes referrers correctness the handler's problem, subject to the metadata concurrency question
(Q12). The GC half of the collision is unchanged: references recorded only inside opaque
documents are invisible to the mark phase, so flattening into `File` rows (or an edge the core
owns) remains mandatory either way. Second, `oci.md` Q2 asks this same question and its
recommendation is the opposite of this one (add the edge now); one owner decision should settle
both, and whichever spec's recommendation loses must be edited in the same pass.

| Option | You get | It costs |
|---|---|---|
| **A. Flatten now, reference edge later** | No schema addition today; GC stays correct via `File` rows | Referrers deferred, so `oci.md`'s scope must say so; removing one platform manifest from an index has no first-class representation |
| **B. Add a version-to-version `Reference` edge now** | Referrers and index-child deletion fall out queryably | A core table and edge semantics thirty-plus other formats never use, and the edge set must be captured per snapshot like the rest of membership |

**Why this is yours:** either answer forces an edit to `oci.md`'s scope or to this schema, and
choosing which spec bends is an architecture call.

### Q10: Is an `Upstream` scoped to one repository, or shared across repositories?

**Recommendation:** B - a shared `Upstream` definition plus a per-repository attachment
carrying the failover position, because the settled entity's own rationale (rotating a
credential touches one row) only holds when repositories share the row, and the preconfigured
npm, PyPI and Docker Hub upstreams (`proxy-cache.md`) are shared by nature.

| Option | You get | It costs |
|---|---|---|
| **A. Per-repository `Upstream` rows** | The settled field list works as written; failover order sits naturally on the row | Rotating a credential for an upstream fifty repositories use touches fifty rows, defeating the entity's stated rationale |
| **B. Shared `Upstream`, per-repository attachment holding the failover position** | Credential rotation touches one row; each preconfigured upstream is one definition | One more join entity, and failover order moves off the `Upstream` row the resolution described |

**Why this is yours:** the 2026-09-23 resolution fixed the entity's fields but not its
cardinality, and two halves of that field list (a shared credential, a per-repository failover
order) pull in opposite directions; either reading is a faithful implementation of the decision
as written.

### Q11: What creates a snapshot in a proxied repository?

One snapshot per logical publish is well defined for hosted repositories. A proxied repository
has no publishes: metadata for a never-before-seen package arrives on demand (new `Package`,
`Version` and `RemoteFile` rows - a content-changing write that is not a "cache materialisation
of files already known to the model"), and blobs arrive as cache fills. The answer must also
say whether cached content appears in snapshot content sets at all, because if it does, a blob
referenced by a retained snapshot is a GC mark root (`storage-and-gc.md`) while the same blob
is LRU-evictable under the per-repository quota (`proxy-cache.md`), and one of those rules has
to win.

**Recommendation:** A - on-demand metadata arrival is treated like cache materialisation and
creates no snapshot; cached content stays out of snapshot content sets, so eviction never
fights the snapshot mark root; proxied repositories gain snapshots only from a future explicit
freeze operation, which is the frozen-mirror feature this spec advertises anyway.

| Option | You get | It costs |
|---|---|---|
| **A. No snapshots from proxy traffic; explicit freeze later** | The hot miss path stays free of snapshot serialisation, and LRU eviction never conflicts with a mark root | Proxied repositories have no rollback history until the freeze feature ships |
| **B. Every new-to-the-model arrival is a snapshot** | Proxied repositories get history for free | The snapshot sequence lands on the hot miss path, serialised per repository - the exact cost the cache-fill exclusion was accepted to avoid - and evicting a snapshot-referenced blob becomes contradictory |

**Why this is yours:** it decides what the promised frozen-upstream-mirror feature is built
from, and it arbitrates between two settled decisions (snapshot mark roots and LRU eviction)
whose combination is currently contradictory for cached content.

### Q12: How are concurrent writes to one opaque metadata document handled?

npm dist-tags and Maven `latest`/`release` make the package-level document a read-modify-write
target: two concurrent publishes both read it, both update it, and the last write silently
discards the other's tag movement. The core cannot merge a document it never parses, so the
mechanism has to live in the shared write API's contract.

**Recommendation:** A - an optimistic revision token on every metadata document, with the
handler retrying on conflict, because a silently lost dist-tag move is metadata corruption an
ecosystem treats as supply-chain-relevant, and a revision check is the smallest mechanism that
keeps the core format-ignorant.

| Option | You get | It costs |
|---|---|---|
| **A. Compare-and-swap revision on each document; handler retries on conflict** | No lost updates; the core stays ignorant of content | Every handler metadata write needs a retry loop, and the shared write API must expose the revision |
| **B. Last write wins** | Nothing to build | Concurrent publishes silently lose dist-tag and `latest` updates; the bug is invisible until an install resolves wrongly |
| **C. A per-entity lock held across the publish** | Serial simplicity | Locks held across multi-request publish boundaries (a Maven deploy) with client-controlled duration, a deadlock and starvation surface |

**Why this is yours:** it sets the contract of the shared metadata write API before the first
handler is written against it, and the options trade correctness, hot-path cost and API
complexity in a way no measurement yet exists to settle.

### Q13: Are metadata documents stored inline, or as CAS blobs referenced by digest?

Debian makes this concrete: its repository-level document carries `Packages` indexes and a
signed `Release`, which reach tens of megabytes and change on every publish. Snapshot deltas
capture metadata, so inline storage makes every Debian publish's delta O(index size), which
reintroduces the O(repository) write cost the delta representation was chosen to avoid.
CAS-backed documents make the delta a digest and deduplicate unchanged levels, but they add a
fourth GC reference class: metadata-document blobs referenced from live rows and retained
snapshots.

**Recommendation:** C - inline below a size threshold, digest-referenced CAS blobs above it,
because hot small documents (dist-tags) should not pay a blob fetch per read while index-sized
documents must not be copied into every delta; the GC mark phase then treats metadata-document
references as roots wherever they occur.

| Option | You get | It costs |
|---|---|---|
| **A. Inline always** | One representation; no new GC reference class | Index-sized documents copied into every snapshot delta: O(repository) writes for exactly the formats snapshots were meant to serve |
| **B. CAS-backed always** | Uniform dedup; deltas are digests | A blob fetch on every metadata read, including the hottest packument paths, plus the fourth GC reference class |
| **C. Threshold hybrid** | Small documents stay hot, large ones dedup | Two representations to test, a threshold to choose, and the fourth GC reference class still exists for the large ones |

**Why this is yours:** it trades read latency on the hottest path against snapshot storage
growth and a new GC obligation in the component the charter names as the most dangerous, and
the threshold is a product judgment about which formats matter early.

### Q14: What may a handler serve from pre-snapshot, in-flight publish state?

The settled publish granularity and AC10 currently contradict each other for multi-request
publishes. A Maven deploy or an OCI push writes blobs and files before its snapshot exists;
AC10 says a handler resolves content only through the pointer or snapshot it is given, so
strictly none of that is visible until the publish completes. But OCI clients HEAD
just-uploaded blobs before pushing the manifest that references them, and the official
conformance suite exercises push flows that read back mid-publish. Some carve-out is required,
and its wording decides how strong the pointer discipline actually is.

**Recommendation:** A - digest-addressed reads may additionally resolve against the
repository's own in-flight upload records (immutable CAS content plus a session-scoped
membership check), while every name-based resolution stays strictly through the snapshot
pointer; the carve-out is written into AC10's architecture test as an explicit named exemption
rather than discovered later as a violation.

| Option | You get | It costs |
|---|---|---|
| **A. Digest reads see in-flight uploads; name resolution stays snapshot-only** | OCI push flows work; the mutable surface (names, tags, listings) keeps full snapshot discipline | The architecture test needs a precisely scoped exemption, which becomes a loophole if worded loosely |
| **B. A session view: the publishing client resolves through snapshot plus its own session** | Read-your-writes for the publisher across the whole surface | Session identity threaded through every read path, for behaviour only pushing clients need |
| **C. No carve-out; a format needing read-back declares finer publish boundaries** | AC10 stays absolute | For OCI that makes each blob upload a publish, which dissolves "one snapshot per logical publish" for exactly the format that stresses it |

**Why this is yours:** it is the boundary between two of your settled decisions (publish-scoped
snapshots and pointer-only resolution), and where the exemption is drawn defines what the
architecture test - the named mechanical enforcer - actually enforces.

### Resolved: remote modelling (was Q1)

**Settled 2026-09-22: adopt Pulp's `RemoteArtifact` model.** One store; a file may have a local
blob, remote rows saying where it came from, or both, and "cached" describes how a blob arrived
rather than where it lives. Remote rows survive cache materialisation because revalidation and
failover still need that provenance. This also resolves `proxy-cache.md` Q1.

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
| 2026-09-23 | 3e3ae0a | second pass: folded-decision application + adversarial + go-spec-reviewer (code-claim verification still vacuous: pre-implementation) | The five 2026-09-23 decisions were recorded under Resolved headings but only partly applied; Scope, the entity table, the GC consequences and the Snapshots section synced to them, AC9 reworded, AC11-AC15 added (Upstream and the upper metadata levels were previously unasserted, the cache-fill exclusion and delta bounds untested, and rollback could pass membership-only); Q9's premises updated; Q10-Q14 raised; stays draft |
| 2026-09-23 | 9c971d4 | cross-spec consistency (proxy cache lifecycle) | Corrected the exclusive local-or-remote wording: cached files retain `RemoteFile` provenance alongside the local blob for revalidation and failover, with AC4 updated; existing open questions still keep the spec draft. |
