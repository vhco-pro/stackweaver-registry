---
status: draft
status_description: "Gate review 2026-09-24 at 1701a48: the promotion scope-in was half-applied (Design and Phase 2 still described the single-pointer v1) and is now folded through; deletes and metadata-only mutations derived as snapshot-creating writes; AC24 (immediate policy) and AC25 (pruning reconstructibility) added; Q15 raised - the in-flight membership check's session scoping has no wire session to key on. Stays draft until the owner answers Q15."
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

- **Three repository types**, the model Artifactory and Nexus established and users arrive
  expecting: `local` (hosted content), `remote` (proxies exactly one upstream, carrying that
  upstream's URL and credentials), and `virtual` (aggregates local and remote repositories and
  **defines resolution order**).
- The shared entity model: repository, package, version, file, blob.
- Per-format metadata as typed-but-opaque documents at all three levels - repository, package
  and version - so formats do not each get tables.
- `RemoteArtifact`-equivalent: a known artifact with an upstream location, retained as
  provenance after a local blob is cached.
- Upstream configuration bound one-to-one to a `remote` repository, so rotating a credential
  touches one row. Multi-upstream failover is not a field: it is the ordering of several remote
  repositories inside a virtual one.
- Download policies: `immediate`, `on_demand`, `streamed`.
- **Promotion, environment pointers and rollback**, brought into scope 2026-09-23 when build
  effort stopped being a reason to defer. Several named pointers per repository, each targeting
  a snapshot: promotion repoints an environment at a snapshot already tested elsewhere, and
  rollback repoints it back. Content is bit-identical across environments because it is the same
  snapshot, not a re-publish.
- The liveness rules GC must honour: a blob can be referenced by a published artifact, a cached
  one, a retained snapshot, or a CAS-backed metadata document, and `storage-and-gc.md` marks
  from exactly those four roots. The set is this spec's to amend and it is currently live:
  `storage-and-gc.md` Q10, open with the owner, proposes a fifth root (a snapshot targeted by a
  `Pointer` staying unprunable), and whichever way it is answered, the amendment lands here as a
  revision of this list, never as a sibling-side extension.

- **The snapshot dimension**: every completed logical write - a publish, a hosted delete, a
  metadata-only mutation - produces an immutable repository snapshot, stored as a delta with
  periodic full checkpoints, and serving resolves through a pointer to one. The schema carries this from day one, and the promotion and rollback features
  above build directly on it.

**Out of scope**

- Per-format index generation. That belongs to handlers and to the signed-index shared service.

## Design

### The entity model

| Entity | Owns | Notes |
|---|---|---|
| `Repository` | name, format, **type** (`local` / `remote` / `virtual`), visibility, metadata document | The unit of RBAC. A `remote` carries exactly one upstream; a `virtual` carries an ordered member list |
| `Package` | name, format, metadata document | One per package name per repository |
| `Version` | version string, format-specific metadata document | Metadata is a JSON document the handler reads and writes; the core never interprets it |
| `File` | filename, relative path, digest | Links a version to blobs; multiple files per version is the norm (wheel plus sdist, jar plus pom plus sources) |
| `Blob` | digest, size | Content-addressed. Deduplicated across every format and repository |
| `Upstream` | URL, credential ref, download policy, adapter type | Bound one-to-one to a `remote` repository. Rotating a credential touches one row |
| `VirtualMember` | virtual repository ref, member repository ref, position | The ordered aggregation. Position **is** the resolution order; there is no separate failover field anywhere |
| `Reference` | from version, to version, relation (for example OCI's `subject`) | A format-agnostic edge the core can traverse without parsing handler metadata. GC marks through it; the OCI referrers API is one indexed query over it |
| `RemoteFile` | `Upstream` ref, upstream path, last-checked | An upstream source for a file, retained when the file gains a local blob so revalidation and failover keep their provenance |
| `Snapshot` | monotonic number, repository, delta (membership plus all three metadata levels), checkpoint marker | Immutable. Exactly one per completed logical write; cache materialisation never creates one |
| `Pointer` | name, repository, target snapshot | What a serving URL resolves through. Several per repository: one tracks the newest snapshot, others are environments repointed by promotion and rollback |

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

### Repository types and resolution order

Three types, following the model Artifactory established and Nexus copied, because users arrive
already knowing it:

| Type | Holds | Notes |
|---|---|---|
| `local` | Published content | What a publish targets |
| `remote` | Exactly one upstream | Carries that upstream's URL and credentials. Its cached content is served from the shared CAS like any other content |
| `virtual` | An ordered list of local and remote members | Clients point at these. The member order **is** the resolution order |

Resolution walks a virtual repository's members in order: local content first, then remote
caches, then remote upstreams. That ordering is the whole of failover - **there is no failover
field on any entity**, which is why the earlier `Upstream.failover_order` idea is gone. Several
upstreams offering the same content become several remote repositories aggregated in one virtual
repository, and their precedence is their position in it.

This is a deliberate scope addition: `project-charter.md` previously deferred virtual
repositories. They return to v1 because the alternative is an ad-hoc ordering field that
reimplements them badly, and because the aggregation is what makes one client URL able to see
both private and proxied content.

### Cached and hosted are the same store

Adopting Pulp's answer to `proxy-cache.md` Q1: there is no separate cache store. A `File` may
have a local `Blob`, one or more `RemoteFile` rows telling the system where it came from, or both.
An uncached remote file has only remote provenance; an `on_demand` fetch adds the local blob while
retaining that provenance for revalidation and failover. "Cached" is a statement about how the
blob arrived, not about where it lives.

Consequences worth stating explicitly, because they are where the bugs will be:

- A blob can be referenced by a published artifact **and** a cached one simultaneously, by a
  retained snapshot, and by a CAS-backed metadata document. GC liveness therefore has four
  reference classes, which the resolutions in `storage-and-gc.md` now price in: the sweep marks
  from four roots - published references, cached references, snapshots inside the retention
  window, and CAS-backed metadata documents (current and snapshot-held) - with a deletion-intent
  table as the write barrier between reference creation and sweep deletion. A blob referenced
  only from a pruned snapshot is no longer protected.
- When several upstreams offer the same content, there is **one** `Package`/`Version` and
  **several** `RemoteFile` rows, tried in turn. This falls out of the model rather than needing
  failover logic in each handler.

### Graph-shaped content

Some formats are graphs, not trees. An OCI index points at manifests, manifests point at blobs,
and a referrers artifact points back at a `subject`. The core is forbidden from parsing a
handler's metadata document, so a graph recorded only inside that document is a graph GC cannot
traverse and the referrers API cannot query.

The model therefore carries a format-agnostic `Reference` edge between versions, with the
relation recorded and queryable. GC marks through it, the referrers API becomes one indexed
lookup, and the next graph-shaped format reuses it rather than re-litigating this.

The cost is honest: the shared model gains an entity on one format's account, so "four tables
serve everyone" is now five plus the edge. That is cheaper than either flattening the graph into
`File` rows, which loses the referrers query, or teaching the core to parse OCI manifests, which
is the coupling this whole model exists to prevent.

### Reads from in-flight publish state

An OCI client `HEAD`s blobs it has just uploaded, **before** it sends the manifest - so there is
legitimately visible content belonging to no snapshot yet. A strict pointer-only model cannot
serve that, and OCI push does not work without it.

The rule: **digest-addressed reads may additionally resolve against the repository's own
in-flight upload records** - immutable CAS content, plus a membership check so this visibility
is not an existence oracle. The check was settled as session-scoped, but that scoping has a
broken premise on the wire it exists for: OCI has no push session, and a blob's own upload
session is already closed when the client `HEAD`s the committed blob, so the read that must
pass the check carries no session to check against - the same wire reality that forced
`storage-and-gc.md` to re-scope its grace period from session to repository. What boundary the
check keys on instead is Q15. **Every name-addressed read still resolves through the snapshot
pointer**, with no exception.

That split keeps the pointer authoritative where authority matters. A digest read asks "do you
have exactly these bytes", which no snapshot can answer differently; a name read asks "what is
`latest`", which is exactly what snapshots exist to answer.

### Download policies

| Policy | On sync | On client request | Stores? |
|---|---|---|---|
| `immediate` | fetch everything now | serve locally | yes |
| `on_demand` | record metadata only | fetch upstream, serve, save | yes, once |
| `streamed` | record metadata only | fetch upstream, serve | no |

`on_demand` is the default and is what "caching proxy" means in this product.

**A proxied repository creates no snapshots.** On-demand metadata arrival is treated as cache
materialisation, and cached content stays out of snapshot content sets entirely. Eviction
therefore never fights the snapshot mark root, and the hot proxy path never touches the snapshot
sequence. The accepted cost is that a `remote` repository has no rollback story, because it has
no snapshots to roll back to.

### Writing and storing metadata documents

**Concurrency.** Every metadata document carries an optimistic revision token. A write against a
stale revision is rejected and the handler retries. The core cannot merge a document it refuses
to parse, and npm dist-tags are read-modify-write, so last-write-wins would silently lose a
dist-tag move - which ecosystems treat as a supply-chain event rather than a lost update.
Handlers must therefore implement retry with backoff; a hot document under contention livelocks
without it.

**Storage.** Documents are stored inline below a size threshold and as digest-referenced CAS
blobs above it. Hot small documents (dist-tags, a few hundred bytes) never pay a blob fetch per
read, and index-sized documents (Debian's signed `Release`, multiple megabytes) never bloat a
snapshot delta back into O(repository), which would undo the delta decision entirely. The
threshold is a tuning knob and will be wrong for somebody; it is configurable for that reason.

### Snapshots, pointers and what counts as a write

A completed logical write creates exactly one `Snapshot`; `on_demand` cache materialisation
of files already known to the model never does (the resolved write-granularity question below).
Publish is the paradigm case, not the boundary of the rule: a hosted delete and a metadata-only
mutation (an npm dist-tag move) are each a completed logical write and produce a snapshot the
same way. That is entailed rather than chosen - name-addressed serving resolves only through
the pointer and snapshots are immutable, so a mutation that creates no snapshot is a mutation
no client can ever see, and `storage-and-gc.md`'s rule that hosted deletes reclaim space only
through retention pruning assumes the delete left the head snapshot. Each handler's spec
declares where its ecosystem's write boundaries fall - which requests complete a publish, and
which bulk operations (a cleanup deleting many versions) group into one write rather than many -
and that declaration is a review item. A **proxied repository creates no snapshots at all**:
content arriving by sync or on demand is cache materialisation, not a write.

Serving always resolves through a `Pointer`. Every repository has a default pointer that
advances to the newest snapshot on each completed write, so a repository nobody promotes
behaves indistinguishably from a mutable one. Beyond it, the API exposes pointer management as
the promotion surface: creating named environment pointers, repointing one at a snapshot
already served elsewhere (promotion), repointing it back (rollback), and reporting how far back
rollback actually reaches, per the retention reporting `storage-and-gc.md` requires. Snapshots
themselves stay an internal representation; what the API exposes is pointers and the reach.

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

**Binding constraint on handlers:** a handler resolves **name-addressed** content through the
pointer it is given, and must never assume a repository has exactly one current state. An
architecture test enforces this, because a single handler reading "latest" directly silently
reintroduces the retrofit.

The one carve-out is digest-addressed reads, which may additionally resolve against the
repository's own in-flight upload records (see "Reads from in-flight publish state" above).
It is narrow on purpose: a digest read asks whether exactly these bytes exist, which no snapshot
answers differently.

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
- [ ] AC6: A virtual repository aggregating two remote repositories that offer identical content
      resolves in member order, and serving succeeds when the first member's upstream is
      unreachable. No entity carries a failover field; order comes from `VirtualMember.position`.
- [ ] AC22: A repository carries several named pointers; promoting an environment repoints it at
      a snapshot already served elsewhere, and the content served is bit-identical to what that
      other environment served, with no re-upload.
- [ ] AC23: Rollback repoints an environment at an earlier retained snapshot and the previously
      served content returns, including metadata at all three levels; a snapshot outside the
      retention window is refused with the reach the API reports.
- [ ] AC16: A virtual repository resolves local members before remote caches and remote caches
      before upstream fetches, asserted at the network layer; a `remote` repository has exactly
      one upstream, and rotating its credential touches one row.
- [ ] AC17: GC marks through a `Reference` edge: an OCI index whose child manifests are untagged
      keeps those children live, and the referrers API answers from an indexed query over the
      edge without the core parsing any handler metadata.
- [ ] AC18: A digest-addressed read resolves against the repository's own in-flight upload
      records, a name-addressed read never does, and one client cannot read another's in-flight
      uploads.
- [ ] AC19: A proxied repository creates no snapshot on cache materialisation, including
      on-demand metadata arrival.
- [ ] AC20: Two concurrent writes to one metadata document do not silently lose one: the stale
      write is rejected on its revision token and the handler's retry succeeds.
- [ ] AC21: A metadata document above the size threshold is stored as a CAS blob and a document
      below it inline, and a snapshot delta containing a large document does not grow with
      repository size.
- [ ] AC7: GC treats a blob referenced only by a cached file as live, proven by a test that runs
      GC against a repository whose content arrived entirely by `on_demand`.
- [ ] AC8: Adding a format requires zero schema migrations, demonstrated across the Tier 0 and
      Tier 1 formats.
- [ ] AC9: A completed logical write produces exactly one new `Snapshot` and advances the
      repository's default pointer - proven for a publish, for a hosted delete, and for a
      metadata-only mutation, each as its own write - and a read served after repointing to an
      older snapshot returns that snapshot's content, proving serving really resolves through
      the pointer.
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
- [ ] AC24: Under the `immediate` policy, a sync fetches the upstream content ahead of any
      client request, and a subsequent client request is served with no upstream call, asserted
      at the network layer - the third download policy, previously the only one no criterion
      exercised.
- [ ] AC25: Pruning never leaves a retained snapshot unresolvable: a checkpoint or delta
      survives while any snapshot inside the retention window depends on it, proven against a
      history where pruning removes everything only out-of-window snapshots depend on and every
      retained snapshot afterwards still resolves its full content set, membership and all
      three metadata levels included.

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
| AC16 | integration | `internal/model/virtual_resolution_test.go` (network-level assertion) |
| AC17 | integration | `internal/model/reference_edge_test.go`; `conformance/oci/referrers_test.go` |
| AC18 | integration | `internal/model/inflight_read_test.go` |
| AC19 | integration | `internal/proxy/no_snapshot_test.go` |
| AC20 | integration | `internal/model/metadata_concurrency_test.go` |
| AC21 | integration | `internal/model/metadata_storage_test.go` |
| AC22 | integration | `internal/model/promotion_test.go` |
| AC23 | integration | `internal/model/rollback_test.go` |
| AC24 | integration | `internal/proxy/immediate_test.go` (network-level assertion) |
| AC25 | integration | `internal/storage/retention_test.go` (checkpoint and delta dependency across pruning) |

## Implementation Phases

### Phase 1: Core entities
Repository, Package, Version, File, Blob, with opaque metadata documents at all three levels.

### Phase 2: Snapshots and pointers
`Snapshot` (deltas plus periodic checkpoints, capturing membership and metadata) and
`Pointer`: the default always-advancing pointer, named environment pointers with the
promotion, rollback and reach-reporting API (AC22, AC23), and the pointer-resolution
architecture test.

### Phase 3: Remote modelling
`Upstream`, `RemoteFile`, download policies, upstream failover.

### Phase 4: GC integration
The cached and retained-snapshot reference classes, and the property tests that police them.

## Tasks

Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

One question is open: Q15, raised by the 2026-09-24 gate review. Q1 through Q3 were answered
on 2026-09-22 and Q4 through Q14 on 2026-09-23, all folded through Scope, the entity table,
the Design sections and the acceptance criteria. Implementation cannot start while Q15 stands.

Resolved decisions are kept below rather than deleted, so the reasoning survives the next time
someone asks why it was done this way.

### Q15: What boundary scopes the in-flight digest-read membership check, given OCI has no session on the wire?

The resolved reads-from-in-flight-publish-state decision (was Q14) settled the digest/name
split, and that split stands. Its mechanism does not: it scoped the anti-probing membership
check to the upload session, and by the time an OCI client `HEAD`s a blob it has just
committed, that blob's upload session is closed and the `HEAD` carries no session identifier
at all - there is no push session on the wire, the exact reality that forced
`storage-and-gc.md` to re-scope its grace period from session to repository. As written the
check has nothing to key on, and two implementors would build different systems: one keying
on the authenticated uploader identity, one on repository access. The answer amends the
"Reads from in-flight publish state" section and AC18's assertion.

**Recommendation:** A - repository scope. It matches the wire (the repository is the only
boundary every relevant request names), matches the precedent the grace period set for the
identical reason, and cannot break a push whose blob upload and manifest PUT come from
different workers. The residual disclosure is small: a principal must already hold access to
the repository, whose published content it can read anyway.

| Option | You get | It costs |
|---|---|---|
| **A. Repository scope: any principal authorized on the repository resolves its in-flight digests** | Implementable from what the wire provides; multi-worker pushes (blob from one runner, manifest from another) work; same boundary as the settled grace period | A principal with repository access can probe digests of content another client committed but has not yet referenced - an existence disclosure inside the repository's own trust boundary |
| **B. Uploader-identity scope: only the identity that committed the blob resolves it pre-reference** | Closes intra-repository probing entirely; the in-flight window discloses nothing to anyone but its creator | Breaks any push where the manifest PUT arrives under a different identity or token than the blob commits, and the failure is a 404 mid-push on the flagship format's conformance path |

**Why this is yours:** it prices an existence-disclosure window against client compatibility
on the format the zero-skips gate is sold on, and it amends the mechanism of a decision you
already made - a security-posture call, not something the fleet can measure its way to.

### Resolved: what counts as a write (was Q4)

**Settled 2026-09-23: one snapshot per completed logical publish.** `on_demand` cache
materialisation of files already known to the model does **not** create a snapshot.

Both halves matter. Publish-scoped snapshots are consistent states, so a rollback never lands
inside half a Maven deploy. Excluding cache fills keeps the snapshot sequence off the hot proxy
path, which would otherwise be serialised per repository - directly harming the differentiator.

Accepted cost: each handler declares where its publish boundary is, and declaring it wrongly
produces snapshots that are not consistent states. That declaration belongs in the format's spec
and is a review item, not an implementation detail.

Extended 2026-09-24 by review derivation, not by a new decision: hosted deletes and
metadata-only mutations are completed logical writes too. Name-addressed serving resolves only
through the pointer and snapshots are immutable, so those mutations have no other mechanism by
which to become visible; `formats/oci.md` requires deletes (content management, zero skips) and
AC13 already presupposed a visible dist-tag move. Folded into the Snapshots section and AC9.

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
`RemoteFile` references it rather than carrying copies. (Superseded in part the same day by
the upstream-and-repository-structure resolution below: the failover-order field is gone -
failover is `VirtualMember.position`, and no entity carries a failover field. The entity
itself and everything else here stands.)

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

### Resolved: graph-shaped content (was Q9)

**Settled 2026-09-23: a format-agnostic `Reference` edge between versions, with the relation
(OCI's `subject`) recorded and queryable.** GC marks through it and the referrers API is one
indexed lookup. Settles `formats/oci.md` Q2, which carried the opposite recommendation.

Accepted cost: the shared model gains an entity on one format's account. That is cheaper than
flattening the graph into `File` rows, which loses the referrers query that OCI conformance
tests, or teaching the core to parse manifests, which is the coupling this model exists to
prevent. The next graph-shaped format reuses the edge rather than re-opening this.

### Resolved: upstream and repository structure (was Q10)

**Settled 2026-09-23: the three-type model Artifactory established** - `local`, `remote`,
`virtual` - with upstream configuration bound one-to-one to a remote repository and resolution
order carried by a virtual repository's member list.

This replaced the recommendation originally offered here (a shared `Upstream` plus a
per-repository attachment carrying failover position). Checking what Artifactory actually does
showed the industry model is different and better: a remote repository *is* the upstream
binding, and multi-upstream failover is not a field at all but the ordering of several remote
repositories inside a virtual one.

Accepted cost, and it is real: **virtual repositories move into v1**, which
`project-charter.md` had explicitly deferred. They return because the alternative is an ad-hoc
ordering field that reimplements aggregation badly, and because aggregation is what lets one
client URL see private and proxied content together.

### Resolved: snapshots in proxied repositories (was Q11)

**Settled 2026-09-23: a proxied repository creates no snapshots.** On-demand metadata arrival
is treated as cache materialisation, and cached content stays out of snapshot content sets.

This keeps eviction from fighting the snapshot mark root and keeps the snapshot sequence off the
hot proxy path. Accepted cost: a `remote` repository has no rollback story, because it has no
snapshots. Pinning a build to "npm as of Monday" is therefore not a v1 capability.

### Resolved: concurrent metadata writes (was Q12)

**Settled 2026-09-23: an optimistic revision token on every metadata document**, with the
handler retrying on conflict.

The core cannot merge a document it refuses to parse, and npm dist-tags are read-modify-write, so
last-write-wins silently loses a dist-tag move - which ecosystems treat as a supply-chain event
rather than a lost update. Accepted cost: handlers implement retry, and a hot document under
contention livelocks without backoff, so backoff is not optional.

### Resolved: metadata document storage (was Q13)

**Settled 2026-09-23: inline below a size threshold, digest-referenced CAS blobs above it.**

Hot small documents never pay a blob fetch per read; index-sized documents never bloat a snapshot
delta back into O(repository), which would undo the delta decision. Accepted cost: two storage
paths for one concept, and a threshold that will be wrong for somebody - so it is configurable.

### Resolved: reads from in-flight publish state (was Q14)

**Settled 2026-09-23: digest-addressed reads may resolve against the repository's own in-flight
upload records; name-addressed reads never may.**

This closes the structural incompatibility the reviews found: an OCI client `HEAD`s blobs it has
just uploaded, before any manifest exists, so a strict pointer-only model cannot serve OCI push
at all. A session-scoped membership check keeps one client from probing another's uploads.

The split holds because a digest read asks "do you have exactly these bytes", which no snapshot
can answer differently, while a name read asks "what is `latest`", which is precisely what
snapshots exist to answer. Accepted cost: two resolution paths, and the membership check is
security-relevant rather than incidental.

Amended 2026-09-24: the split stands; the check's session scoping does not. OCI has no push
session on the wire and the blob's own upload session is closed before the client's `HEAD`
arrives, so a session-scoped check has nothing to key on - the boundary it keys on instead is
Q15.

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
handlers. (The "later features" half was reversed on 2026-09-23 by the charter's standing scope
decision: promotion, environment pointers and rollback are in scope, carried by AC22 and AC23.
The schema-from-day-one half stands and is what made the reversal a feature rather than a
migration.)

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
| 2026-09-24 | 1701a48 | gate review: application check of all 14 resolved decisions + adversarial (OCI push flow vs the pointer model) + cross-spec in both directions against storage-and-gc, proxy-cache, replication, oci and supply-chain-policy + unpoliced-design-claim hunt + constitution + go-spec-reviewer; claim verification against code vacuous (the tree holds only a stub `cmd/stackweaver-registry/main.go`, no `internal/` exists); the terminated reviewer's three kept edits re-verified rather than trusted, all three sound | 12 of 14 decisions genuinely applied; two were half-applied and are now folded: the promotion scope-in had left Design's Snapshots section claiming a single always-advancing v1 pointer and no snapshot API while Scope, the entity table and AC22/AC23 said the opposite (Phase 2 also still built the v1 pointer, and no phase built promotion), and the fourth-mark-root resync had left the Design consequences bullet claiming a three-root sweep. Derived, not decided: hosted deletes and metadata-only mutations are snapshot-creating completed writes, entailed by pointer-only name serving plus immutable snapshots plus oci.md's content-management scope, folded into the Snapshots section, the Scope bullet, the Snapshot entity row and AC9. AC24 added (`immediate` was the only download policy no criterion anywhere exercised) and AC25 added (pruning reconstructibility was named by Design as what keeps the sweep sound and policed by no AC in this spec or the sibling). Supersession notes added to the was-Q2, was-Q4, was-Q7 and was-Q14 records; `Pointer` gained its repository ref; the root-set liveness bullet now names storage-and-gc Q10 as a pending amendment to the set this spec owns; one stale three-root remnant fixed in proxy-cache's resolved cache-location record. Coherence under the open sibling questions assessed: under storage-and-gc Q10 option A the liveness bullet, the pruning-reconstructibility sentence and AC25's notion of retained must widen to pointer-targeted snapshots, under B or C this spec stands as written; proxy-cache Q11 presupposes nothing here under either answer. One genuine defect found in a settled decision's mechanism and raised as Q15: the in-flight digest-read membership check is session-scoped, but OCI has no push session on the wire and the blob's upload session is closed before the client's HEAD arrives, so the check has nothing to key on - the same wire reality that re-scoped the grace period. Stays draft on Q15. |
| 2026-09-24 | d078c46 | partial: a gate reviewer terminated on a spend limit mid-pass. Its review does not count and this spec still awaits one | Kept only what is independently verifiable against the siblings at this sha: the liveness bullet resynced to `storage-and-gc.md`'s four mark roots, the snapshot bullet's stale "promotion and rollback do not ship in v1" corrected against the reversal already committed at 525c9f8, and the Open Questions intro corrected - it still announced open questions and blocked implementation while the file records none. |
| 2026-09-22 | afbb4e4 | adversarial + constitution + sibling consistency (code-claim verification vacuous: pre-implementation, no tree to check) | Breadth claim stressed against Maven, OCI, Debian and npm; six open questions raised (Q4-Q9), snapshot ACs added (AC9, AC10), stale sibling references corrected; stays draft |
| 2026-09-23 | 3e3ae0a | second pass: folded-decision application + adversarial + go-spec-reviewer (code-claim verification still vacuous: pre-implementation) | The five 2026-09-23 decisions were recorded under Resolved headings but only partly applied; Scope, the entity table, the GC consequences and the Snapshots section synced to them, AC9 reworded, AC11-AC15 added (Upstream and the upper metadata levels were previously unasserted, the cache-fill exclusion and delta bounds untested, and rollback could pass membership-only); Q9's premises updated; Q10-Q14 raised; stays draft |
| 2026-09-23 | 9c971d4 | cross-spec consistency (proxy cache lifecycle) | Corrected the exclusive local-or-remote wording: cached files retain `RemoteFile` provenance alongside the local blob for revalidation and failover, with AC4 updated; existing open questions still keep the spec draft. |
