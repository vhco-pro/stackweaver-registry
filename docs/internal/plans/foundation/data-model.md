---
status: draft
status_description: "Reconciled 2026-09-28 at 95346bd with the foundation wave's step-3 leftovers (not a review): the Blob row's segment_digests and verification-failed mark (storage-and-gc, AC43), the cache-scoped adopted_at and paired-set id on a remote's cached documents (proxy-cache, AC44), the refresh operation kind (management-api), advisory_ecosystem and the policy document on Repository (supply-chain-policy, AC28), the ReplicationLink's six-state lifecycle with reason and per-link interval (replication, AC31) and the optional repository reference on Schedule (async-operations, AC41); no new root, the set stays five. Earlier, 2026-09-27 at 97da8ab, reconciled with the foundation authoring wave, after the 2026-09-26 Wave 1 reconciliation: the shared model now carries every record the ten new foundation specs adopted and need, so no subsystem grows its own table. The core-held Retirement set and an Operation widened to every management operation (management-api); Principal, Credential, Grant and TrustPolicy (credential-management); the verification records' non-root row (artifact-verification); the per-pointer freshness record, PointerDocument, Signature, SigningKey, declared blob lists and the write transaction's pre-commit hook, with AC22 qualified (signing-service, closing the seven-format freshness theme); the Upstream row's transport fields and UpstreamCredential (upstream-adapters); Job and Schedule with cancelled as a terminal state and the job-held grace (async-operations, observability); repository identity, lifecycle state, tombstone, empty boundary snapshots and the per-format Virtual capability (repository-lifecycle); the Package.name index (web-ui). None adds a GC mark root; the set stays five, and the fourth root's reach widens under storage-and-gc's amendment. AC35-AC42 added with Test Plan rows, AC32-AC34 rewritten, every phase updated. Zero open questions; stays draft until a gate review."
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
ecosystems that reproduces 33 bespoke schemas, 33 sets of migrations, and 33 different answers to
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
  one, a snapshot inside the retention window, a CAS-backed metadata document, or a snapshot a
  `Pointer` targets, and `storage-and-gc.md` marks from exactly those five roots. The fifth was
  added to this list on 2026-09-26, when the owner settled that a pointer-targeted snapshot -
  plus the checkpoint-and-delta chain that reconstructs it - is exempt from retention pruning
  while targeted. The set is this spec's to amend, so any further change lands here as a
  revision of this list, never as a sibling-side extension. The records later added for
  sibling subsystems (below) add none: each is placed against the set explicitly in Design,
  "Records that are not mark roots".

- **The snapshot dimension**: every completed logical write - a publish, a hosted delete, a
  metadata-only mutation - produces an immutable repository snapshot, stored as a delta with
  periodic full checkpoints, and serving resolves through a pointer to one. The schema carries this from day one, and the promotion and rollback features
  above build directly on it.
- **The one definition of an upload session and of the upload scope**, including the session
  lifetime, which every spec that keys a mechanism on upload state uses rather than restating
  (the Design section "Upload sessions and the upload scope").
- **Records the sibling subsystems need from the shared model**, added 2026-09-26 by the Wave 1
  reconciliation so that no subsystem grows a table of its own: each version's last completed
  write time and core-parsed retention rules on `Repository`, for `formats/generic.md`'s
  retention pass; the `Operation` entity, for asynchronous and long-running operations
  (`formats/ansible-collections.md`'s import tasks and the write-triggered services
  prototype's deferred half); and replication's records (`replication.md`): the replication
  link, the per-snapshot chained identity, the freeze write kind and the per-file provenance
  record. Plus one rule the management operations depend on: a `Package` outlives its versions.
- **Records the foundation authoring wave needed**, added 2026-09-27 by the reconciliation of
  the ten foundation specs authored that day, again so that no subsystem grows a table of its
  own: the core-held `Retirement` set (`management-api.md`); the widening of `Operation` to
  every management operation, with `cancelled` as a terminal state and the `Job` and
  `Schedule` records behind deferred work (`management-api.md`, `async-operations.md`); the
  repository's identity, lifecycle state and tombstone (`repository-lifecycle.md`); the
  per-pointer freshness record, the `PointerDocument`, `Signature` and `SigningKey` records
  and the declared blob-digest list a CAS-backed document may carry (`signing-service.md`);
  `Principal`, `Credential`, `Grant` and `TrustPolicy` (`credential-management.md`); the
  `Upstream` row's transport configuration and the `UpstreamCredential` record
  (`upstream-adapters.md`); the verification records placed beside the policy layer's
  (`artifact-verification.md`); the per-format virtual capability (`repository-lifecycle.md`,
  first forced by `formats/hex.md`); and the index behind the search route (`web-ui.md`).
  None adds a mark root either; the fourth root's **reach** grows to the declared blob lists and
  to CAS-backed pointer documents, which `storage-and-gc.md` records as its own amendment.
- **Records the step-3 reconciliation of 2026-09-28 added**, when the foundation specs that
  reconciled after this one reported what they need of the shared model: the `Blob` row's
  segment digests and its verification-failed mark (`storage-and-gc.md`); the cache-scoped
  freshness record on a `remote`'s cached documents and the paired-set id (`proxy-cache.md`);
  the `refresh` operation kind (`management-api.md`); the core-parsed `advisory_ecosystem` and
  `policy` document on `Repository` (`supply-chain-policy.md`); the `ReplicationLink`'s full
  state set, reason and per-link interval (`replication.md`); and the optional repository
  reference on `Schedule` (`async-operations.md`). None is a mark root and none widens a root's
  reach: each is a column or a record beside content, placed in "Records that are not mark
  roots". The set stays five.

**Out of scope**

- Per-format index generation. That belongs to handlers and to the signed-index shared service
  (`signing-service.md`), which renders the freshness record this spec owns into each format's
  signal; this spec holds the record, never the rendering.

## Design

### The entity model

| Entity | Owns | Notes |
|---|---|---|
| `Repository` | **identity** (the primary key), name, format, **type** (`local` / `remote` / `virtual`), visibility, metadata document, retention rules, `advisory_ecosystem` (nullable), the `policy` document, **lifecycle state** (`active` / `read_only` / `deleted`), `deleted_at`, deleting principal, effective retention override | The unit of RBAC. A `remote` carries exactly one upstream; a `virtual` carries an ordered member list. Retention rules, the policy fields and the lifecycle state are configuration the core parses, never part of the opaque document ("Retention rules, policy fields and a version's write time", "Repository identity and lifecycle state"). Every other table references the identity, never the name |
| `Package` | name, format, metadata document | One per package name per repository. **Outlives its versions**: removing every version leaves the row and its package-level document in the head ("A package outlives its versions") |
| `Version` | version string, format-specific metadata document, last completed write time | Metadata is a JSON document the handler reads and writes; the core never interprets it. The write time is core-maintained and queryable |
| `File` | filename, relative path, digest | Links a version to blobs; multiple files per version is the norm (wheel plus sdist, jar plus pom plus sources) |
| `Blob` | digest, size, `segment_digests`, verification-failed mark | Content-addressed by the digest and by nothing else. Deduplicated across every format and repository. The segment digests (one per fixed 4 MiB segment, recorded in the commit pass) and the mark the read path sets and clears are metadata for `storage-and-gc.md`'s verified read path, never a key ("A coordinate is not a storage key") |
| `Upstream` | URL, credential ref, download policy, `adapter` (default `https`), `hosts` (the off-origin allowlist with a credential role per host), `tls`, `limits`, `http2` | Bound one-to-one to a `remote` repository. Rotating a credential touches one row. The transport fields are `upstream-adapters.md`'s to interpret ("Upstream configuration and upstream credentials") |
| `VirtualMember` | virtual repository ref, member repository ref, position | The ordered aggregation. Position **is** the resolution order; there is no separate failover field anywhere |
| `Reference` | from version, to version, relation (for example OCI's `subject`) | A format-agnostic edge the core can traverse without parsing handler metadata. GC marks through it; the OCI referrers API is one indexed query over it |
| `RemoteFile` | `Upstream` ref, upstream path, last-checked | An upstream source for a file, retained when the file gains a local blob so revalidation and failover keep their provenance |
| `Snapshot` | monotonic number, repository, delta (membership plus all three metadata levels), checkpoint marker | Immutable. Exactly one per completed logical write; cache materialisation never creates one. On a replica the numbers are the leader's |
| `Pointer` | name, repository, target snapshot, **freshness record** (`moved_at`, generation counter) | What a serving URL resolves through. Several per repository: one tracks the newest snapshot, others are environments repointed by promotion and rollback. The freshness record advances at every transition and never moves backwards ("Freshness scoped to the pointer") |
| `SnapshotIdentity` | repository, snapshot number, delta digest, predecessor identity, identity | The chained identity `replication.md` compares to detect a divergent history. One per snapshot, **never pruned**, references no blob |
| `ReplicationLink` | local repository ref, leader URL, leader repository name, credential ref, state (`syncing` / `idle` / `failed` / `reseeding` / `diverged` / `ended`), reason, optional `sync_interval`, last successful sync, takeover record | Makes a `local` repository a replica while its state is not `ended`. The credential reference resolves in the same store as upstream credentials. At most one non-`ended` link per repository; an `ended` link stays as the record of how the link ended ("Replication's records") |
| `FileProvenance` | file ref, source remote repository, upstream URL and path, fetch time | Where a frozen file came from. Distinct from `RemoteFile`: it is a record, never an upstream source the model fetches from |
| `Operation` | repository ref, format, kind, wire id, state, created and finished times, initiating principal, authorizing scope, idempotency key, request id, result document, produced snapshot ref | The record of **every management operation**, synchronous or deferred, plus every asynchronous import. **Not repository content**: in no snapshot, untouched by repointing and rollback, pruned after a window |

The rows above are the **content model**: what a repository holds and how it is served. The
records below sit beside it. Each is owned by the core and stored in the shared schema, none is
snapshot content, and none is a GC mark root (Design, "Records that are not mark roots"); the
sibling spec named in each row defines its semantics, and this spec defines only that the record
exists in the shared model with these fields, so that no subsystem grows a table of its own.

| Record | Owns | Defined by |
|---|---|---|
| `Retirement` | repository ref, format, canonical coordinate string, retired-at, retiring operation ref | `management-api.md`, "Retirement is core-held". Written in the retiring operation's transaction; never pruned; the shared write path refuses a write claiming a retired coordinate |
| `Job` | id, kind, opaque args document, state (`pending` / `running` / `completed` / `failed` / `cancelled`), `run_at`, `attempts`, `max_attempts`, created and finished times, `last_error`, `lease_owner`, `lease_expires_at`, `lease_token`, `coalesce_key`, `exclusive_key`, optional operation ref, optional repository ref, checkpoint document, `trace_context`, `request_id` | `async-operations.md`, "The `Job` record and the `Operation`"; the trace fields are `observability.md`'s (its AC16). Partial unique indexes over `coalesce_key` where pending and `exclusive_key` where running; pruned after its retention window and never before its `Operation` |
| `Schedule` | name, kind, args, interval or `next_run_at`, `last_run_at`, `last_result`, enabled, optional repository ref | `async-operations.md`, "The scheduler". The repository reference marks the schedules that belong to one repository (its `retention.pass`, `signing.resign` and per-link `replication.sync`), which its deletion disables |
| `PointerDocument` | pointer ref, document key, inline bytes or CAS digest, produced-at, the counter value it carries | `signing-service.md`, "Storage". A re-rendered body scoped to a pointer (Debian's `InRelease`, Hackage's `timestamp.json`); outside snapshot content |
| `Signature` | repository ref, body digest, key id, signing profile, signature bytes, created | `signing-service.md`, "Storage". Keyed by body digest and key; pruned when no retained snapshot or pointer document holds its body |
| `SigningKey` | repository ref, purpose, algorithm, state (`announced` / `active` / `retired`), backend kind and reference, public forms, created | `signing-service.md`, "Key custody". Private material lives in the backend the reference names, never in this row |
| `Principal` | kind (`human` / `robot`), identity key or robot name, display fields, enabled | `credential-management.md`, "What a credential is, and who owns it" |
| `Credential` | kind (`token` / `public-key`), owner ref, name, lookup prefix and SHA-256 hash or public key and fingerprint, scope rows (repository identity, actions, pattern) with the multi-repository mark, created, expiry or non-expiring, revoked at and by, rotated-from ref, last used | `credential-management.md`. A token's value is never stored recoverably (`auth.md`); a scope names a repository by identity and grants nothing once that repository is deleted |
| `Grant` | principal ref, repository ref, action, optional pattern | `auth.md`'s `(principal, repository, action, pattern)`; administered by `management-api.md`; deleted with its repository (`repository-lifecycle.md`) |
| `TrustPolicy` | robot ref, issuer, audience, claim constraints | `credential-management.md`, "OIDC exchange: `/api/v1/tokens/exchange`" |
| `UpstreamCredential` | name, kind, material encrypted under the instance master key, created, `rotated_at`, `last_used` | `upstream-adapters.md`, "Configuration on the `Upstream` row". The store `Upstream` and `ReplicationLink` credential references resolve in; a referenced record cannot be deleted |
| Verification records | verdicts keyed `(repository, blob digest, scheme)`, trust sets and their revisions, superseded marks, the re-evaluation queue | `artifact-verification.md`, "The verdict is a stored fact". Owned by `internal/verify`, outside the format entity model beside the policy layer's records |

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

**A coordinate is not a storage key.** A `Blob` is keyed by its digest and by nothing else, and
an ecosystem's own identifier for content lives in the metadata document as a verified
coordinate. `formats/julia.md` is the case that makes the distinction concrete: one git tree
hash is backed by several valid tarballs (gzip and zstd of one tree), so one `Version` there has
several `File` rows, each keyed by its own blob digest, and the tree hash is a coordinate the
handler verifies and records, never a key the store resolves. The model needs nothing new for
it; the rule is stated so that no format is tempted to key a blob by what its client calls it.

The same rule holds inside the `Blob` row itself. `storage-and-gc.md` verifies every read while
streaming and, for a range read, verifies the whole segments covering the window rather than
hashing a five-gigabyte layer to serve its last megabyte (its resolved range-read decision, was
its Q11, adopted 2026-09-27). The row therefore carries **`segment_digests`**, one digest per
fixed 4 MiB segment, computed in the same commit pass that computes the canonical digest, and a
**verification-failed mark** the read path sets when a read fails its digest and clears when a
later read verifies, so an operator finds every affected digest from the API rather than from
the alert stream (its AC21). Both are metadata beside the key: the CAS key stays the single
canonical digest, nothing resolves a blob by a segment digest, the segment size is a constant
whose change is a revision of that spec, and neither column keeps a blob alive or changes what
the sweep marks (AC43).

**The search index.** `web-ui.md`'s cross-format search (`GET /api/v1/search`, the route
`management-api.md` owns) is a name match over `Package.name` scoped to the repositories the
caller may read, so the shared schema carries an index over `Package.name` per repository. It is
an index, not an entity, and it references no blob (AC42).

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

**Virtual aggregation is a per-format capability, not a property of the model.** `formats/hex.md`
was the first format for which a virtual repository is impossible: the repository name is inside
the signed payload and every unmodified client checks it against the name it configured, so a
merged document can never verify for both a hosted member and an upstream one
(`formats/conda.md` then confirmed the converse, that a format signing nothing with the
repository name aggregates without trouble). The model therefore does not assume every format
supports the `virtual` type. A handler declares `Virtual` as `supported` or `unsupported` in its
`Capabilities()` (`format-handler-interface.md`), and `repository-lifecycle.md`'s creation path
refuses a `virtual` repository of a format declaring `unsupported` with `capability-unsupported`
and the format's own reason (its AC4); the conformance matrix reads the same field to render the
virtual column as exempt for that format, so the advertised breadth never exceeds the tested one.
For `formats/julia.md` the opposite holds: a virtual repository is the only way a private package
that depends on the General registry can resolve, so `supported` is the norm and `unsupported`
the declared exception. The type table above is unchanged by this; what changes is that a
`virtual` row exists only for a format that can serve one (AC38).

### Repository identity and lifecycle state

`repository-lifecycle.md` settled how a repository is identified, what states it passes through
and what survives its deletion, and each of those is a column on `Repository` that the core
parses, never a field inside the opaque document:

- **Identity is the primary key.** Every repository has an identity generated by the core at
  creation, 128 bits from `crypto/rand`, rendered in the API with a fixed `rep_` marker, and it
  is the only column any other table may reference: a grant, a credential scope, a signing key,
  a trust set, a `VirtualMember`, a `ReplicationLink`, a `Job`, a policy rule and a
  `Retirement` each name a repository by identity. **The name is a label** the identity
  currently wears; a rename changes the label and nothing else, and a deleted-and-recreated name
  inherits nothing, by construction rather than by a check at use.
- **The unique index on `name` is partial**, `WHERE state <> 'deleted'`, so a deleted
  repository's tombstone keeps its last name for listings while a new repository may take the
  name the moment the deletion commits.
- **The lifecycle state** is `active`, `read_only` or `deleted`, with `deleted_at` and the
  deleting principal recorded on the transition to `deleted`, and an **effective retention
  override** the deletion may set to zero (`reclaim: now`) as an input to snapshot pruning.
  Which writes each state admits, and the one predicate every completed write consults, are
  `repository-lifecycle.md`'s; the columns are this spec's.
- **The tombstone.** When the pruner drops a deleted repository's last snapshot, the row stays
  as a tombstone (identity, last name, format, type, `deleted_at`, deleting principal, the
  deleting operation's reference) and is never removed, so a credential listing, an audit trail,
  a `Retirement` and an `Operation` can always render the repository they name. It is listed
  only through the deleted-repositories listing, by identity. Its `Package` rows, trust set
  revisions, policy rules, `SigningKey` material and `PointerDocument` records are dropped at
  that moment; verdicts, condemnation and refusal records, retirements and operations are not.

### Cached and hosted are the same store

Adopting Pulp's answer to `proxy-cache.md` Q1: there is no separate cache store. A `File` may
have a local `Blob`, one or more `RemoteFile` rows telling the system where it came from, or both.
An uncached remote file has only remote provenance; an `on_demand` fetch adds the local blob while
retaining that provenance for revalidation and failover. "Cached" is a statement about how the
blob arrived, not about where it lives.

Consequences worth stating explicitly, because they are where the bugs will be:

- A blob can be referenced by a published artifact **and** a cached one simultaneously, by a
  snapshot inside the retention window, by a CAS-backed metadata document, and by a snapshot a
  `Pointer` targets. GC liveness therefore has five
  reference classes, which the resolutions in `storage-and-gc.md` now price in: the sweep marks
  from five roots - published references, cached references, snapshots inside the retention
  window, CAS-backed metadata documents (current and snapshot-held), and pointer-targeted
  snapshots together with the checkpoints and deltas that reconstruct them - with a
  deletion-intent
  table as the write barrier between reference creation and sweep deletion. A blob referenced
  only from a pruned snapshot is no longer protected; a snapshot a pointer targets is not pruned
  while it is targeted, however old it is.
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

### Upload sessions and the upload scope

This is the **one definition of a session in this system**. Every spec that keys a mechanism on
upload state uses it rather than restating it: `storage-and-gc.md`'s grace period and orphan
cleanup, `formats/oci.md`'s session lifetime and cross-repository mount, and the in-flight read
check in the next section. It exists because the unqualified word "session" was applied three
times to a boundary the wire does not have - once by the grace period, once by the in-flight
read check, once by the session-lifetime question - and each time the fix was a local re-scope.
Adopted 2026-09-26 with the in-flight-scope and session-lifetime decisions below.

- **An upload session is exactly one blob's upload into one repository.** It is opened when a
  client initiates an upload, continued by chunk and status requests, and ended by exactly one
  of two events: **commit** (digest verified, blob committed) or **expiry**. It has a wire
  identity - OCI's upload URL carries a unique session ID (distribution-spec v1.1.1, "POST then
  PUT", read 2026-09-26) - and it belongs to the repository it was opened in. A single-request
  upload is a session that opens and commits at once, and a successful OCI cross-repository
  mount is the same degenerate case whose bytes are already in the CAS. The session is the unit of
  resumability, of the write-ahead session record orphan cleanup enumerates from
  (`storage-and-gc.md`, "Upload lifecycle"), and of expiry. **Nothing outlives commit on it**:
  once the blob commits the session is gone, and no later request carries or needs its
  identity.
- **There is no push session.** No wire protocol this registry serves groups several blob
  uploads and the reference that eventually names them into one identifiable unit. An OCI push
  is independent blob sessions followed, minutes later or never, by a manifest `PUT` that names
  none of them. So no mechanism may key on a push session, a client connection, or "the current
  push", because none is observable - and none may key on the uploader's identity either,
  which is observable but is not a boundary the protocol respects: a blob committed by one CI
  worker and a manifest sent by another under a different credential is one legitimate push.
- **The upload scope is the repository.** Anything that must span the gap between a blob's
  commit and the reference that names it - which is by construction after its upload session
  has ended - is scoped to the repository the session was opened in, the only boundary every
  request of a push names. A committed-but-unreferenced blob is therefore **in flight in
  repository R**: a statement about R's upload records, never about a session or an identity.
  The grace period (`storage-and-gc.md`, the resolved grace-period boundary) and the in-flight
  read check below both use this scope, and they are the only two mechanisms that span that
  gap.
- **An open upload session holds its repository's upload scope open.** Continuation requests
  are write activity in the session's repository, and while any upload session in a repository
  is unexpired that repository's grace does not lapse. Without this, a client paused inside the
  idle window with earlier layers already committed could return to find those layers swept,
  which breaks the promise that resumability makes.
- **A digest resolves in a repository only through that repository's own content**: what its
  pointer resolves, plus its own in-flight records under the upload scope (and, for a `remote`
  repository, its own cached and upstream-resolvable content). The CAS stores each blob once
  across every repository (AC2), and that sharing never makes a digest visible from a
  repository that does not hold it - not to a read, not to an existence check, and not to an
  OCI cross-repository mount (`formats/oci.md`, "Cross-repository mount").

**Session lifetime.** An upload session expires after an idle period with no continuation
request, and in any case at an absolute cap counted from its opening. Every continuation request
(a chunk, a status query, the final commit request) refreshes the idle period; nothing refreshes
the cap. The defaults are **one hour idle and 24 hours absolute**, both configurable
instance-wide (the resolved session-lifetime-defaults decision below). The idle period is what a
paused CI job or a client retrying across a network drop survives; the cap bounds a client that
trickles bytes forever. Expiry ends the client's right to resume; it does not by itself reclaim
anything - an expired session's partial bytes are orphans that `storage-and-gc.md`'s orphan scan
collects once its repository's grace has also lapsed (its AC3). How a format answers a request
on an expired session is wire format and belongs to the format's spec (for OCI, `404` with
`BLOB_UPLOAD_UNKNOWN`).

### Reads from in-flight publish state

An OCI client `HEAD`s blobs it has just uploaded, **before** it sends the manifest - so there is
legitimately visible content belonging to no snapshot yet. A strict pointer-only model cannot
serve that, and OCI push does not work without it.

The rule: **digest-addressed reads may additionally resolve against the repository's own
in-flight upload records** - immutable CAS content, committed and not yet referenced. Only
committed blobs are in flight in this sense; the partial bytes of an open session are never
readable by digest, since their digest has not been verified. The membership check that keeps
this from being an existence oracle is **scoped to the repository** (adopted 2026-09-26, was
Q15): any principal authorized to pull from repository R resolves R's in-flight digests,
whichever principal committed them, and no principal resolves them through any other
repository. That is the upload scope defined above, and it is keyed on the one boundary every
request of a push names; the session scoping it replaces had a broken premise, because the
blob's own upload session has ended by the time the client's `HEAD` arrives and OCI has no push
session to fall back on. The accepted residue is an existence disclosure inside R's own trust
boundary: a principal who can already read R can learn that someone committed a digest R does
not yet reference. **Every name-addressed read still resolves through the snapshot pointer**,
with no exception.

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

**A proxied repository creates no content snapshots.** On-demand metadata arrival is treated as
cache materialisation, and cached content stays out of snapshot content sets entirely. Eviction
therefore never fights the snapshot mark root, and the hot proxy path never touches the snapshot
sequence. The accepted cost is that a `remote` repository has no rollback story, because it has
no content snapshots to roll back to. The one snapshot a `remote` does hold is the empty initial
snapshot its default pointer targets from creation (below, "Snapshots, pointers and what counts
as a write"), which exists so the pointer, its freshness record and its cache-scoped documents
have somewhere to hang; nothing that arrives by sync or on demand ever adds to it.

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
and that declaration is a review item. `formats/generic.md` was the first spec to make it,
including a retention pass over one repository as one write however many versions it removes,
and a freeze (below) is one write however many files it copies, as is the management surface's
bulk operation (`management-api.md`, "Every operation is one completed logical write"). A
**proxied repository creates no content snapshots**: content arriving by sync or on demand is
cache materialisation, not a write.

**Creation and deletion are the boundaries of the sequence.** Repository creation writes an
initial empty snapshot, stored as a checkpoint so it depends on no chain, and creates the
default pointer on it, so name-addressed serving resolves from the first request. Every type
gets it, `remote` and `virtual` included: they never write a content snapshot, but the pointer
is where the freshness record and the pointer-scoped documents below hang, and nothing
name-addressed resolves without one (`repository-lifecycle.md`, "Creation"; `management-api.md`
AC19). Deleting a `local` repository is a completed logical write in the retention-pass shape:
it removes every current row as one write however many versions it held and produces one final
empty snapshot, again a checkpoint, onto which the default pointer moves once the named pointers
are deleted; a `remote` or `virtual` has only its initial snapshot, dropped with the pointer.
The deletion's other effects, and the tombstone the pruner leaves, are `repository-lifecycle.md`'s
("Deletion"); this spec fixes that the sequence opens and closes with an empty checkpoint, so
the pruner and the roots need no special case for either end (AC38).

Serving always resolves through a `Pointer`. Every repository has a default pointer that
advances to the newest snapshot on each completed write, so a repository nobody promotes
behaves indistinguishably from a mutable one. Beyond it, the API exposes pointer management as
the promotion surface: creating named environment pointers, repointing one at a snapshot
already served elsewhere (promotion), repointing it back (rollback), deleting a named
environment pointer - the second release path for the pin below, which `storage-and-gc.md`
AC18 polices; the default pointer is not deletable, since name-addressed serving resolves
through it - and reporting how far back
rollback actually reaches, per the retention reporting `storage-and-gc.md` requires. Snapshots
themselves stay an internal representation; what the API exposes is pointers and the reach.
**The HTTP home of that surface is `management-api.md`**, "Pointer management": its pointer
listing, `PUT` and `DELETE` routes, the actions each requires and the `out-of-reach` refusal
that renders AC23. A repoint is not a write and creates no snapshot; it does leave an
`Operation` of kind `repoint` (below) and advances the pointer's freshness record (next
section), which is what makes a rollback visible to the clients that would otherwise ignore it.

**The write transaction exposes a pre-commit hook.** A completed logical write is one
transaction, and `signing-service.md` regenerates a format's served index inside that
transaction so the index and the content it describes land in the same snapshot ("The write path
dispatches; the handler cannot forget"). The shared write path therefore offers a hook that runs
after the handler's changes and before commit, in the same transaction, with the snapshot's
content set visible to it; a hook that fails fails the write, and nothing is committed. It is a
seam of the shared write path, not a handler method, so the pinned method set is untouched
(AC37).

**A pointer pins what it targets.** Settled 2026-09-26: the snapshot a pointer targets, and the
checkpoint-and-delta chain that reconstructs it, are exempt from retention pruning while the
pointer targets it, which makes them the fifth GC mark root (`storage-and-gc.md`, resolved
pointer-target question, AC17). An environment therefore keeps serving exactly what was promoted
to it however long it sits there, and an idle repository never loses the snapshot its default
pointer is on. The cost is that retention stops being a strict bound on storage: a forgotten
environment pointer retains its snapshot and every blob that snapshot's content set references,
indefinitely, and only a repoint or a pointer deletion releases it (`storage-and-gc.md` AC18).
That pinned storage is attributable to a named pointer, which is why it was preferred to an
auto-advancing pointer or a pruner that stalls.

The pin and AC23 are two halves of one rule rather than a contradiction. AC23 refuses
**repointing to** a snapshot outside the retention window; the pin protects a snapshot from
aging out **while a pointer is already on it**. Protection attaches when a pointer targets the
snapshot and is not retroactive, so a snapshot that aged out with nothing pointing at it may
already have lost the deltas, checkpoints and blobs its content set needs - allowing a repoint
onto it would be a promise the store cannot keep, which is why the refusal names the reach the
API reports. A snapshot targeted before it aged out never leaves its own pointer's reach, so
aging in place is safe while the transition is not.

A snapshot is stored as a delta from its predecessor, with periodic full checkpoints, and the
delta captures the metadata documents at all three levels as well as membership, so repointing
restores dist-tags and indexes rather than only which versions existed. Two constraints follow
from that representation. The read path must never walk an unbounded chain: resolving any
snapshot reads one checkpoint plus at most the checkpoint interval of deltas. And pruning must
keep every surviving snapshot reconstructible: a checkpoint or delta may be dropped only while
no snapshot that survives pruning depends on it - one inside the retention window, or one a
`Pointer` targets, which is exempt however old it is - because both are GC mark roots, and a
root whose content set can no longer be computed makes the sweep unsound.

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
repository's own in-flight upload records under the upload scope (see "Upload sessions and the
upload scope" and "Reads from in-flight publish state" above). It is narrow on purpose: a digest
read asks whether exactly these bytes exist, which no snapshot answers differently, and it never
reaches another repository's records.

### Freshness scoped to the pointer, and the documents that hang on it

Seven formats arrived at one finding from different clients (the consequences queue's
cross-cutting theme 1): apt ignores a `Release` older than the one it holds
(`formats/debian.md`); TUF clients fail hard on a lower `version` and adopt the same content
re-signed at a higher one (`formats/hackage.md`); Conan keeps a newer cached revision over an
older remote one (`formats/conan.md`); LuaRocks, CPAN and Arch revalidate with
`If-Modified-Since`, so a `304` hides a rollback (`formats/luarocks.md`, `formats/cpan.md`,
`formats/arch.md`); and curl's `--time-cond` in brew discards any `200` whose `Last-Modified` is
not newer than its own clock at the last fetch, so even an exact-match `304` rule is not enough
(`formats/homebrew.md`). A rollback served from a snapshot's stored bytes is therefore invisible
to every client that already updated, on every one of those formats. The mechanism is one, and
its ownership is split (`signing-service.md`, the resolved freshness-split decision, was its Q4):
**this spec owns the record, `signing-service.md` owns rendering it into each format's signal,
and `proxy-cache.md` owns the cache-scoped equivalent for `remote` repositories.**

- **The freshness record on `Pointer`.** Every pointer carries `moved_at` and a **generation
  counter**. Both advance at every pointer transition: a write advancing the default pointer, a
  promotion, a rollback, a key switch and a cadence re-sign. `moved_at` is set to the later of
  the transition time and one second after its previous value, so it never moves backwards
  whatever the clock does; the counter is incremented by one per transition and never lowered.
  Both are written only by the pointer transition itself, in the transaction that moves the
  pointer, so no handler and no service computes freshness (`signing-service.md` AC27). Conan's
  "last-repoint time" and LuaRocks' "monotonic per-pointer change time" are this record; those
  specs cite it rather than carrying their own.
- **`PointerDocument`.** Where a client's freshness rule reads a field inside the signed bytes
  (apt's `Date`, TUF's `version` and `expires`), the body itself must change at every pointer
  move, so it is re-rendered per pointer: a `PointerDocument` holds (pointer, document key,
  inline bytes or CAS digest, produced-at, the counter value it carries) and is produced inside
  the write for the default pointer, inside every repoint, on the expiry cadence and at a key
  rotation. It is **outside snapshot content**: a snapshot holds the index a repository had,
  the pointer holds the envelope this environment serves it under. When CAS-backed it is
  protected by the fourth mark root's current-document half, an extension of that root's reach
  that `storage-and-gc.md` carries as its own amendment; it is not a new root.
- **`Signature`.** A signature over a generated body is a record keyed by (repository, body
  digest, key id, profile), never snapshot content, so a key rotation is one atomic batch of
  records and creates no snapshot, and a rollback to a snapshot whose bodies have no record
  under the current key produces the missing records inside the repoint. The served document is
  assembled from body and record by the profile's framing rule. The record is pruned when no
  retained snapshot and no pointer document holds its body. `SigningKey` is the record of the
  key itself, with its state and the custody backend its private material lives in; the material
  is never in this schema.
- **Declared blob digests on a CAS-backed document.** A document that consists of several blobs
  (Hackage's append-only index, one gzip member per write; CPAN's `CHECKSUMS` per author
  directory) declares the digests of its parts in the document, and the fourth mark root marks
  through the declared list, so a part is live while any current or retained document declares
  it. This is `formats/hackage.md`'s and `formats/cpan.md`'s request and, like the pointer
  document, it widens the fourth root's reach and adds no root (`storage-and-gc.md` AC16's
  amendment).
- **The cache-scoped record on a `remote`'s cached documents.** A `remote` has no pointer
  transitions to hang freshness on, and its clients have the same rules (brew's `--time-cond`,
  pacman's paired `.db` and `.sig`), so `proxy-cache.md` owns the equivalent for the proxied
  path ("Freshness of what a remote serves", its AC22) and this spec gives it its row: each
  cached metadata document of a `remote`, the current-document entry cache materialisation
  writes, carries **`adopted_at`**, set when the proxy layer adopts a new upstream revision to
  the later of the adoption time and one second after its previous value, so it never moves
  backwards whatever the clock or the upstream's own dates do, and an optional **paired-set
  id**, shared by the documents a handler declared as one revision (a database and its detached
  signature, `repomd.xml` and its `.asc`, `Release` and `Release.gpg`), which are committed in
  one transaction and served under one record so no request observes one member new and the
  other old. It is written only by the adoption itself; it is metadata on the document entry,
  not a pointer, not snapshot content (a `remote` writes no content snapshot) and not a mark
  root; and it is dropped with the entry at eviction or at tombstone time (AC44).

**AC22 is qualified, not weakened.** Promotion still serves bit-identical **content** in both
environments: the same snapshot, the same blobs, the same metadata documents at every level.
What differs by design is the pointer's freshness record and its pointer documents: `prod`'s
`InRelease` carries a later `Date` and a different signature than `staging`'s did, because
otherwise the clients above would never notice the promotion at all. A test that compared the
served envelope byte for byte across environments would be asserting a bug (AC36).

### A package outlives its versions

Removing a version never removes its `Package`. A completed write that removes a package's last
version leaves the `Package` row and its package-level metadata document in the head snapshot,
and every later snapshot carries them forward until a write changes them. How a handler renders
a package with no versions (npm serves it as absent, Galaxy answers 404 for the collection) is
wire format and the handler's; whether the row exists is not.

The rule survives for two reasons, neither of them the one it was first written for. A package
with no versions is still **addressable**, so a management operation, a listing and a later
publish have a row to act on; and the package-level document still carries **format state**
(npm dist-tags, Maven's `latest` and `release`) that a format may need to keep or reset when
versions return. It was first written to protect a **retirement set** kept in the package-level
document: PyPI's deleted filenames (`formats/pypi.md`), npm's unpublished `name@version`
coordinates (`formats/npm.md`) and Galaxy's deleted versions (`formats/ansible-collections.md`),
each retired forever so a coordinate binds one set of bytes for the life of the repository.
`management-api.md` moved that set out of the document (its resolved retirement-placement
decision, was its Q3) into the core-held `Retirement` record: (repository, format, the
handler's canonical coordinate string, retired-at, retiring operation), written in the retiring
operation's transaction, **not snapshot content**, never pruned and never a mark root, with the
shared write path refusing any write whose addressed object is retired in that repository. The
trap this spec once named for the management surface, a pointer moved backwards restoring a
package-level document that predates a retirement (AC13) and thereby re-opening a coordinate,
cannot occur now: a repoint touches snapshot content and the set is not snapshot content, so
preservation across a backwards repoint holds by construction rather than by every handler
remembering to re-merge (AC33, AC35). The retiring operation's reference dangles once that
`Operation` is pruned, which the record tolerates: the coordinate and the time are what a refusal
needs to explain itself.

### Retention rules, policy fields and a version's write time

`formats/generic.md` settled retention policies as a shared, format-agnostic pass in
`internal/retention`, and that pass can only read what the core parses, so two things live in
the shared model rather than in any handler's document (a third, the policy layer's two
repository fields, follows the same rule below):

- **Retention rules on `Repository`**, as core-parsed configuration beside visibility, never
  inside the opaque repository metadata document. A rule has a kind (`age` or `count`), its
  parameter (a duration or a number of versions) and an optional filter naming at most a
  package, or a package and a version. A rule whose filter reaches below a version is refused
  when it is configured, because retention deletes whole versions. What the rules mean and how
  several combine is `formats/generic.md`'s; the shape they are stored in is this spec's.
- **Each version's last completed write time**, maintained by the core and queryable through
  the metadata store: the time of the most recent completed write that touched any of the
  version's files. Only a completed write advances it; cache materialisation, a read and a
  request that writes nothing (generic's idempotent same-content upload) never do.

A retention pass is an ordinary completed write that ends references by writing a snapshot, so
it adds no mark root and deletes no object: space returns through snapshot pruning and the
sweep, which is why "keep 7 days" frees its space after roughly 37 under the default snapshot
retention window (AC28).

**The policy layer's two repository fields sit beside the retention rules**, for the same
reason: `supply-chain-policy.md` evaluates them in the core and no handler ever reads them, so
they are core-parsed columns of `Repository`, never part of the opaque metadata document or of
a handler's `settings` (its "OS-package repositories declare their ecosystem" and "Rules are
administered through the management API"). **`advisory_ecosystem`** is nullable: an OS-package
repository (Debian, Ubuntu, RPM, Alpine formats) declares which release-keyed advisory set
applies to it (`Debian:12`, `Alpine:v3.20`), validated at configuration against the configured
sources' ecosystem lists, and every other repository leaves it null. The **`policy` document**
is the repository's rule set, written through `PATCH /api/v1/repositories/{name}` and refused
there as `validation` when a rule cannot bind (its AC11), so no unbindable rule is ever stored.
What a rule means is that spec's; this spec fixes only that both are stored as core-parsed
configuration outside the document, are repository configuration rather than content (in no
snapshot, untouched by a repoint), and are dropped at tombstone time with the retention rules
(`repository-lifecycle.md`), while the condemnation and refusal records they produced are not
(AC28).

### Operations

An `Operation` records **every management operation** and every asynchronous import: a content
operation or an administration through `management-api.md` (a yank, a version delete, a
repoint, a lifecycle transition, a `configure`), completed in the request or deferred to a
worker; a Galaxy import task (`formats/ansible-collections.md`, its resolved import-task-record
decision, was its Q6); and the write-triggered services prototype's deferred import. It was first
framed as the record of asynchronous work only; `management-api.md` widened it to the durable,
authorization-bound record of everything that got past authorization (its resolved audit-record
decision, was its Q5), so that "who did what to this repository and when" is one query. It is
format-agnostic and, like everything here, owned by the core:

- **Fields.** The repository it acts on; the format and a kind (the shared vocabulary's name for
  what the operation does, `management-api.md`'s closed kind table, including `repoint`,
  `lifecycle` and `refresh`; a handler's own kinds for imports); a wire identifier, generated unguessably from
  `crypto/rand` with at least 128 bits, which is what a client polls by; a state; created and
  finished times; the initiating principal; the scope the originating write was authorized
  under (action and addressed object, per `auth.md`); an optional **idempotency key**, so a
  retried write with the same key and payload returns this record instead of acting twice; the
  **request id** of the request that created it, shared with the audit line and, for deferred
  work, with the `Job`; a **result document** the handler writes and the core never parses, as
  with every metadata document; and a reference to the snapshot it produced.
- **State is monotonic.** `pending`, then `running`, then exactly one of three terminal states,
  `completed`, `failed` or `cancelled`; a state may be skipped but never revisited, and a
  terminal state never changes. A synchronous operation is created `pending` and reaches its
  terminal state in the same request. `cancelled` arrived with `async-operations.md`'s
  cooperative cancellation (its resolved cancellation decision, was its Q5): a pending deferred
  operation that never ran, or a running one whose worker stopped at a checkpoint and committed
  nothing.
- **It is not repository content.** No snapshot delta contains an operation, no repoint or
  rollback changes one, and creating or finishing one is never by itself a completed logical
  write, so a failed or cancelled operation creates no snapshot.
- **A snapshot-producing operation's terminal transition commits atomically with its
  snapshot.** The snapshot reference is set only on `completed`, in the same transaction as the
  snapshot, so there is never a snapshot whose operation reads unfinished or a completed
  content operation with no snapshot. Kinds that are not writes, a `repoint`, a `refresh` (a
  `remote`'s cache refresh, which marks its cached metadata due for revalidation and touches no
  snapshot; `management-api.md`'s resolved refresh-action decision, was its Q12), a `freeze`, a
  `thaw`, a `rename`, a `configure` that changes no served document, complete with no snapshot
  reference, because they created no snapshot; the kind says which is which.
- **It is pruned after a configurable window** counted from its finished time
  (`management-api.md`'s `management.operation_retention`, 90 days by default, which is also
  the idempotency window); a read of a pruned or unknown identifier answers as not found, which
  Galaxy's client already reads as "not yet". An unfinished operation is never pruned, and a
  `Job` is never pruned before the operation it executed.
- **Reading one by its identifier requires the originating write's authorization**, evaluated
  against the scope it recorded, so an operation identifier is not a side channel into another
  principal's work. Listing operations per repository and registry-wide is `management-api.md`'s
  surface and carries its own authorization.
- **A pending operation pins nothing.** Its uploaded bytes are protected by the repository-scoped
  grace, the same way any committed-but-unreferenced blob is ("Upload sessions and the upload
  scope"), and the `Job` executing it holds that grace open while unfinished (next section), so
  a deferred import never outlives the grace its bytes depend on. That answers the question the
  write-triggered services prototype was to test (its question 5), in design, so the prototype
  verifies rather than discovers; the root set stays five and there is no operation-side pin.

It must exist before the write-triggered services prototype's asynchronous half (its Phase 4)
and before `formats/ansible-collections.md`'s Phase 1. The prototype then tests whether this
shape fits a genuinely deferred import (its question 6), and `async-operations.md` builds the
production subsystem that executes it; a change either forces comes back to this spec as a
revision (AC32).

### Jobs and schedules

`async-operations.md` runs every deferred and scheduled activity in the registry on one
PostgreSQL-backed queue, and the queue's records are the shared model's: the `Operation` is the
client's view of a deferred write and the `Job` is the runner's, written together at every
transition in one transaction so neither can be observed ahead of the other (its AC5).

- **`Job`** carries an id, a `kind` from the registry of workers, an opaque `args` document only
  the kind's worker parses, a monotonic state (`pending`, `running`, then `completed`, `failed`
  or `cancelled`; a retry is `pending` again with `attempts` incremented and a later `run_at`),
  the scheduling fields (`run_at`, `attempts`, `max_attempts`, created and finished times, a
  bounded `last_error` that never holds a credential), the lease fields (`lease_owner`,
  `lease_expires_at`, and `lease_token`, a fresh 128-bit fencing value per claim that every
  write the job makes to its own row must carry), two nullable keys held by **partial unique
  indexes** (`coalesce_key` where `state = 'pending'`, so a burst of identical requests enqueues
  one job; `exclusive_key` where `state = 'running'`, so two jobs with the key never run at
  once), an optional `Operation` reference, an optional repository reference (the repository
  whose grace it holds open), a `checkpoint` document the worker may write between attempts,
  and, set at enqueue, the W3C `traceparent` as `trace_context` and the originating
  `request_id`, so a job that runs hours later starts its span with a link to the request that
  asked for it and its audit line still names that request (`observability.md` AC16).
- **`Schedule`** is a periodic job's definition: name, kind, args, an interval or a
  `next_run_at` the kind derives, `last_run_at`, `last_result`, enabled, and an **optional
  repository reference** for the schedules that belong to one repository: its `retention.pass`,
  its `signing.resign` entries and the `replication.sync` of each of its links. The reference
  is what repository deletion disables in its transaction and what `read_only` suspends
  (`async-operations.md`, "The scheduler", its AC28); an instance-wide schedule (a feed sync, a
  sweep) carries none. The scheduler enqueues a job per due schedule with the schedule name as
  `coalesce_key`, so an outage yields one catch-up job, not one per missed tick.
- **Placement.** Neither is repository content: in no snapshot, untouched by repoint and
  rollback, never a mark root. A terminal `Job` is pruned after `async.job_retention` from its
  finished time and **never before the `Operation` it references**, so a poll never finds an
  operation whose execution record vanished first. An **unfinished job naming a repository holds
  that repository's grace open**, exactly as an unexpired upload session does (its resolved
  grace-hold decision, was its Q4): a timing input to the same grace clock, not a root and not a
  pin, released at the job's terminal transition. A repository's deletion cancels its pending
  jobs in the deletion transaction, disables every `Schedule` carrying its reference, and
  cooperatively cancels its running ones; the hold stands until each is terminal
  (`repository-lifecycle.md`, "Deletion").

### Replication's records

`replication.md` transfers snapshots between instances and settled what that requires of the
shared model (its Phase 0). Four additions, none of them format-specific:

- **The replication link.** A `local` repository with a `ReplicationLink` whose state is not
  `ended` is a replica: the link names the leader's URL, the leader's repository name, a
  credential reference that resolves in the same store that holds upstream credentials (so
  rotating it touches one row and it is never logged), a state, a reason, an optional per-link
  `sync_interval` (the instance default `replication.sync_interval` applies when unset), the time
  of the last successful sync, and, once an operator takes the repository over, the takeover
  record: the leader, the snapshot number and identity it took over at, and when. The state is
  exactly one of `syncing`, `idle`, `failed`, `reseeding`, `diverged` and `ended`, the set
  `replication.md` fixes ("The link has states of its own, and a life that ends") and
  `observability.md`'s one-hot gauge reports; the reason qualifies a `failed` (`not-found`,
  `unauthorized`, `unreachable`, `source-type`), a `reseeding` (`retention-gap`) or an `ended`
  (`takeover`, `deleted`) state and is empty otherwise. `ended` is terminal: a takeover or the
  replica's deletion moves the link there rather than deleting the row, so the **takeover record
  lives on the `ended` link** and stays readable, and a repository whose only link is `ended` is
  an ordinary local repository. A link attaches only to a `local` repository, and a repository
  has at most one link that is not `ended`, which is what "at most one active link" means
  throughout. **Snapshot numbers on a replica are the leader's**, since nothing else writes
  there, and a takeover's next write is numbered one past the last replicated snapshot, so the
  sequence simply continues (AC31).
- **The chained snapshot identity.** Every snapshot has a `SnapshotIdentity`: the digest, under
  the store's digest algorithm, of its number, its delta's digest and its predecessor's
  identity, the same construction as a git commit, with no key and no signature. The record is
  **never pruned**: pruning drops checkpoints and deltas, never the identity, so any two
  positions stay comparable after any amount of pruning. The delta digest inside it is a hash
  recorded for comparison, not a CAS reference, so it dangles once the delta is pruned and GC
  never reads it (AC29).
- **Freeze, a write kind whose content comes from a cache.** A freeze publishes the content a
  `remote` repository has cached with a local blob into a `local` repository as **one completed
  logical write**, producing exactly one snapshot there however many files it copies, through
  the target handler's hosted ingest path and the shared reference-creation call. The frozen
  files hold ordinary published references in the target, so they fall under the first mark
  root and survive a later eviction of the source cache. No `RemoteFile` row is created in the
  target, because a `RemoteFile` is an upstream source the model fetches from, and a frozen
  repository must never contact an upstream. The semantics of the operation (what freezes, what
  is excluded, how a swept source fails it) are `replication.md`'s; this spec defines only that
  it is a write kind of the shared model (AC30).
- **Per-file provenance.** Each frozen file gets a `FileProvenance` record written in the same
  completed write: the source remote repository, the upstream URL and path, and when the cached
  copy was fetched. It is immutable, readable from the API, carried in export archives with the
  file it describes, and holds a URL rather than a digest, so it references no blob.

### Principals, credentials and grants

`auth.md` fixed the authorization model and `credential-management.md` the surface that mints,
lists, rotates and revokes what it checks; the records both evaluate are the shared model's
(`credential-management.md` AC24 gates its code on their presence here). A **`Principal`** is a
human (identified by the OIDC identity key) or a robot (identified by name), with display fields
and an enabled flag. A **`Credential`** is a token or a registered public key owned by one
principal: for a token, a non-secret lookup prefix and the SHA-256 hash of the secret, never the
value (`auth.md`, "Tokens are never stored recoverable"); for a public key, the key and its
fingerprint; plus its scope rows, each (repository identity, actions, pattern) with the
multi-repository mark `auth.md` AC29 requires, its creation, expiry or non-expiring mark,
revocation time and revoker, the credential it was rotated from, and when it was last used. A
**`Grant`** is `auth.md`'s (principal, repository, action, optional pattern), administered by
`management-api.md` and deleted in its repository's deletion transaction. A **`TrustPolicy`**
binds a robot to an OIDC issuer, audience and claim constraints for the token exchange. Every
repository reference in these records is by identity, so a credential scope naming a deleted
repository stays readable, renders its name from the tombstone, and grants nothing (AC39).

### Upstream configuration and upstream credentials

`upstream-adapters.md` owns how the registry talks to an upstream, and everything it needs to
know is configuration on the `Upstream` row, core-parsed, never inside a metadata document
(its "Configuration on the `Upstream` row"): `adapter`, the registered adapter name, default
`https`; `hosts`, the off-origin allowlist of `{host, role}` entries where the role is `none`
(reachable with no credential), `root` (the upstream's own credential is presented) or `own`
(a named second credential is presented), default empty, exact names or single-label wildcards;
`tls`, an optional CA bundle reference, an optional client certificate and key reference, and
`insecure_skip_verify`, refused unless set explicitly; `limits`, `concurrency` (default 10) and
`cooldown_cap` (default one hour); and `http2`, default true. The adapter enforces them at
connect time; this spec only gives them a row. The credential references on `Upstream` and on
`ReplicationLink` resolve in one store, the **`UpstreamCredential`** record: name, kind (the
adapter spec's table), the kind's material encrypted at rest under the instance master key
(`proxy-cache.md` AC6), created, `rotated_at`, `last_used`. Rotating one touches one row, its
value is write-only, and deleting one that an `Upstream` or a `ReplicationLink` references is
refused (`repository-lifecycle.md`, its resolved in-use decision, was its Q9) (AC40).

### Verification records

`artifact-verification.md` stores what it concluded about a blob as a **verdict** keyed by
(repository, blob digest, scheme), beside a per-repository **trust set** with numbered revisions,
the **superseded marks** a revision change puts on the verdicts computed under the previous one,
and the **re-evaluation queue** that recomputes them ("The verdict is a stored fact"). They are
core-owned records of `internal/verify`, outside the format entity model in the place this spec
made for the policy layer's records, and they must outlive the blob they describe for the same
reason a refusal record does: "why was this refused" stays answerable after the bytes are gone,
and a verdict that pinned its blob would make refused content uncollectable. A verdict references
the artifact's digest and the digest of the signature or attestation it verified, and tolerates
either dangling. Attestations and signatures stored as files of a version are ordinary snapshot
content and need nothing here.

### Records that are not mark roots

The shared model holds several kinds of record that mention content without keeping it alive,
and each is placed against the root set here rather than left to be discovered by a sweep. None
adds a mark root; the set stays at the five in Scope. Two additions of 2026-09-27 widen the
**reach** of the fourth root, CAS-backed metadata documents, without adding a sixth: a CAS-backed
`PointerDocument` is a current document the root protects, and a document's declared blob-digest
list is marked through ("Freshness scoped to the pointer"). `storage-and-gc.md` owns the root's
definition and carries both as its amendment (its AC16).

| Record | Why it is not a root |
|---|---|
| `SnapshotIdentity` | Its delta digest is a comparison hash, not a CAS reference; it must outlive the content it describes |
| `ReplicationLink` | References a credential and a leader, no content; an `ended` link is kept as the takeover or deletion record and references nothing more |
| `Blob.segment_digests` and the verification-failed mark | Columns on the row the roots already decide about; a segment digest is metadata for verifying a range read, never a key and never a reference, so the columns change nothing about whether the blob is live |
| The cache-scoped freshness record on a `remote`'s cached documents | `adopted_at` and a paired-set id on the current-document entry; the entry itself is a cached reference (the second root) or an evicted one, and the record adds nothing to it |
| `FileProvenance` | Holds an upstream URL and path, no digest; the frozen file's own published reference is what keeps its blob live |
| `Operation` | A pending operation's uploaded bytes are protected only by the repository-scoped grace, the same way any committed-but-unreferenced blob is ("Upload sessions and the upload scope"), and the `Job` executing a deferred operation holds that grace open until it is terminal (`async-operations.md`, its resolved grace-hold decision, was its Q4), which is a timing input to the grace clock and never an operation-side pin. A produced-snapshot reference does not protect the snapshot from pruning |
| `Job`, `Schedule` | An unfinished job holds its repository's grace open, which is the same clock the upload session already drives; neither record references a blob, and a job's checkpoint document is opaque state, not content. A schedule's repository reference is what deletion disables, not a reference into content. Pruned by `async.job_retention`, never before the job's `Operation` |
| `Retirement` | Names a coordinate string, never a blob; it must outlive every snapshot that ever held the coordinate, since its whole purpose is to refuse the coordinate after the content is gone |
| `Repository` tombstone | A deleted repository's row survives its last snapshot forever with identity, name, format, type, deletion time and principal, and the deleting operation's reference; it references no content |
| The pointer freshness record | Two scalars on `Pointer`; the pointer's target is what the fifth root protects, and the record adds nothing to it |
| `PointerDocument` | Not a root itself: when CAS-backed its blob is protected as a current document under the fourth root's reach while the record exists, and the record is dropped with its pointer or at tombstone time |
| `Signature` | Its body digest is kept alive by the snapshot or pointer document that holds the body; a record whose body nothing holds is pruned with it, never the other way round |
| `SigningKey` | References a custody backend, public forms and a repository, no content; public forms stay retrievable by digest until tombstone time, then are dropped |
| `Principal`, `Credential`, `Grant`, `TrustPolicy` | Reference principals, repositories by identity, and key material; no blob and no snapshot. A scope naming a deleted repository stays readable and grants nothing |
| `UpstreamCredential` | Encrypted material and bookkeeping, no content |
| Verification records: verdicts keyed (repository, blob digest, scheme), trust sets and their revisions, superseded marks and the re-evaluation queue (`artifact-verification.md`) | A verdict must outlive the blob it explains, and a pinned blob would make refused content uncollectable; the record tolerates both the artifact digest and the verified signature's digest dangling. Trust set revisions are dropped at tombstone time, verdicts never |
| Retention rules, `advisory_ecosystem` and the `policy` document | Repository configuration that references no content at all; dropped at tombstone time, while the condemnation and refusal records the policy produced are kept |
| The policy layer's records: condemnation records, scan results, the component inventory index and refusal records (`supply-chain-policy.md`) | Owned by `internal/policy`, outside the format entity model, and keyed by digest and coordinate as audit provenance that must outlive the artifact: a refusal stays explainable after the blob is gone, and a policy record that pinned its blob would make refused malware uncollectable. They are the core-owned records the resolved metadata-typing decision below anticipated as "a separate index built later", so no handler owns them either |

Each of these tolerates a dangling digest or snapshot reference by design. AC34 proves the
table: a blob mentioned only by these records is collected, and each record stays readable
afterwards.

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
      a snapshot already served elsewhere, and the **content** served is bit-identical to what
      that other environment served, with no re-upload: the same blobs and the same metadata
      documents at all three levels. The pointer's freshness record and its `PointerDocument`
      records are not, by design: after the promotion the promoted pointer's `moved_at` and
      generation counter are later than before and its pointer documents are re-rendered, while
      the source pointer's are unchanged.
- [ ] AC23: Rollback repoints an environment at an earlier retained snapshot and the previously
      served content returns, including metadata at all three levels; a snapshot outside the
      retention window that no pointer targets is refused with the reach the API reports, while
      a snapshot a pointer already targets stays inside that pointer's reach however far it ages
      and keeps serving (the fifth mark root, `storage-and-gc.md` AC17) - the refusal governs
      the transition to an untargeted out-of-window snapshot, not aging in place.
- [ ] AC16: A virtual repository resolves local members before remote caches and remote caches
      before upstream fetches, asserted at the network layer; a `remote` repository has exactly
      one upstream, and rotating its credential touches one row.
- [ ] AC17: GC marks through a `Reference` edge: an OCI index whose child manifests are untagged
      keeps those children live, and the referrers API answers from an indexed query over the
      edge without the core parsing any handler metadata.
- [ ] AC18: A blob committed into repository R and not yet referenced resolves by digest in R
      for a principal authorized to pull from R that did not commit it, and a manifest naming it
      is then accepted under that second principal's credential; the same digest is not found
      through any other repository, including one the caller can read, although the CAS holds
      the bytes; the partial bytes of an uncommitted session never resolve by digest; and a
      name-addressed read never resolves in-flight records at all.
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
- [ ] AC25: Pruning never leaves a surviving snapshot unresolvable: a checkpoint or delta
      survives while any snapshot that survives pruning depends on it - one inside the retention
      window, or one a pointer targets - proven against a history where pruning removes
      everything only out-of-window, untargeted snapshots depend on, and where a
      pointer-targeted snapshot older than the window is among the survivors; every surviving
      snapshot afterwards still resolves its full content set, membership and all three
      metadata levels included.
- [ ] AC26: An upload session expires after the idle period with no continuation request and at
      the absolute cap however active it is, and not before either: on an injected clock, a
      session receiving a continuation inside every idle window survives past one idle period
      and dies at the cap, an idle one dies one idle period after its last continuation, and
      the defaults are one hour and 24 hours unless configured otherwise.
- [ ] AC27: While any upload session in a repository is unexpired, that repository's grace does
      not lapse: on an injected clock, a blob committed earlier in the repository survives a
      sweep run after the grace period has elapsed with no other activity, provided a session
      opened there is still inside its idle window, and becomes collectable once that session
      expires and the grace then lapses.
- [ ] AC28: A repository's retention rules are stored as core-parsed configuration outside its
      opaque metadata document, each with a kind (`age` or `count`), its parameter and an
      optional filter naming at most a package or a package and a version, and a rule whose
      filter reaches below a version is refused at configuration; `advisory_ecosystem`
      (nullable) and the `policy` document are stored the same way, as core-parsed columns
      absent from the metadata document and from any handler `settings`, appear in no snapshot,
      are unchanged by a repoint, and are dropped at tombstone time while the repository's
      condemnation and refusal records remain; every version's last
      completed write time is readable through the metadata store and advances on each
      completed write touching any of its files and on nothing else - not on cache
      materialisation, a read, or a request that writes nothing.
- [ ] AC29: Every snapshot has a `SnapshotIdentity` equal to the digest of its number, its delta's digest
      and its predecessor's identity; after pruning removes a snapshot's delta and checkpoint
      its identity record is still present and still compares equal to an independently
      recomputed chain; and on a replica the snapshot numbers and identities are the leader's,
      with the first write after a takeover numbered one past the last replicated snapshot and
      chained to its identity.
- [ ] AC30: A freeze of a remote repository's cached content into a local repository is one
      completed logical write: exactly one snapshot is created in the target however many
      files it copies, each frozen file holds a published reference made through the shared
      reference-creation call and a `FileProvenance` record naming its source remote repository,
      upstream URL and path, and fetch time, no `RemoteFile` row exists in the target
      repository, and after the source cache's entries are evicted and swept the frozen files
      and their provenance are unchanged and still served.
- [ ] AC31: A `ReplicationLink` attaches only to a `local` repository, at most one link whose
      state is not `ended` per repository (a second is refused while one is `syncing`, `idle`,
      `failed`, `reseeding` or `diverged`, and accepted once it is `ended`), carrying the leader
      URL, the leader repository name, a credential reference that resolves in the
      upstream-credential store, a state from exactly that six-value set, a reason present only
      for `failed`, `reseeding` and `ended`, and an optional `sync_interval`; rotating that
      credential changes exactly one row; a takeover and a replica's deletion each move the link
      to `ended` with its reason rather than deleting the row; and a takeover records on that
      `ended` link the leader, the snapshot number and identity, and the time it took over at,
      readable afterwards.
- [ ] AC32: An `Operation`'s state moves only forward through `pending`, `running` and exactly
      one of `completed`, `failed` and `cancelled`, and a terminal state never changes; a
      synchronous management operation is created and reaches its terminal state in one
      request; a snapshot-producing operation's produced-snapshot reference is set only on
      `completed`, committed atomically with that snapshot (a fault injected between them
      leaves neither), a failed or cancelled operation creates no snapshot, and a `repoint` or a
      `refresh` completes with no snapshot reference; no snapshot's content set contains an operation and
      a repoint or rollback changes none; its wire identifier carries at least 128 random bits;
      it records the request id and, when sent, the idempotency key of the request that created
      it; it is pruned only after finishing plus the configured window, after which reading it
      answers not found; and reading it by identifier is refused to a principal lacking the
      authorization its originating write was granted under.
- [ ] AC33: Removing every version of a package, by one write or several, leaves the `Package`
      row and its package-level metadata document in the head snapshot and in every later
      snapshot until a write changes them, and they survive pruning of every snapshot in which
      a version existed; the package's retired coordinates are held in `Retirement` records,
      not in that document, so repointing the default pointer to a snapshot older than a
      retirement and back changes no `Retirement` record and the coordinate stays refused
      throughout.
- [ ] AC34: No record listed in "Records that are not mark roots" keeps a blob alive, and each
      outlives the blob it mentions: a blob whose only mention is a `SnapshotIdentity`'s delta
      digest, a `FileProvenance` record, an operation's result document or produced-snapshot
      reference, a `Job`'s checkpoint document, a `Retirement`, a `Signature` record, a
      `SigningKey`'s public form, a `Credential` or `Grant`, a verification verdict, a retention
      rule, or a policy record is collected by the sweep once no mark root reaches it and its
      repository's grace has lapsed, and each of those records is still readable afterwards; and
      a blob mentioned only by a `PointerDocument` or by a document's declared blob-digest list
      is **not** collected while that document is current, and is collected once the pointer
      document is dropped or the declaring document is neither current nor retained, because
      those two are the fourth root's reach, not a sixth root.
- [ ] AC35: A `Retirement` record (repository identity, format, canonical coordinate string,
      retired-at, retiring operation reference) is written in the same transaction as the
      operation that retires the coordinate, appears in no snapshot's content set, survives
      pruning of every snapshot that held the coordinate and the pruning of its retiring
      `Operation`, and is never pruned; a write claiming a retired coordinate in that
      repository is refused by the shared write path, and the same coordinate in a repository
      recreated under the same name (a new identity) is not retired.
- [ ] AC36: Every `Pointer` carries `moved_at` and a generation counter that advance on every
      transition (a default-pointer advance, a promotion, a rollback, a key switch, a cadence
      re-sign) and on nothing else; on an injected clock stepped backwards between two
      transitions `moved_at` still increases by at least one second and the counter by exactly
      one; both are written only in the transaction that moves the pointer; a `PointerDocument`
      is produced per pointer inside the write for the default pointer and inside every repoint,
      lives in no snapshot's content set, is untouched by a repoint of any other pointer, and is
      dropped with its pointer or at tombstone time.
- [ ] AC37: A `Signature` record is keyed by (repository, body digest, key id, profile), appears
      in no snapshot's content set, is created inside the write or repoint that first serves its
      body under the current key and in one atomic batch at a key rotation with no snapshot
      created, and is pruned once no retained snapshot and no pointer document holds its body; a
      `SigningKey` row holds state, algorithm, purpose, public forms and a custody reference and
      never private material; a CAS-backed document declaring a blob-digest list keeps every
      declared blob live while the document is current or held by a retained snapshot; and the
      shared write path runs the registered pre-commit hook after the handler's changes and
      before commit in the same transaction, a failing hook committing nothing.
- [ ] AC38: `Repository`'s primary key is a 128-bit random identity rendered with the `rep_`
      marker, every foreign key into the table targets it and no table carries a repository
      name column; the unique index on `name` is partial over rows whose state is not `deleted`,
      so a name is reusable the moment a deletion commits; `state`, `deleted_at`, the deleting
      principal and the effective retention override are core-parsed columns absent from the
      metadata document; creation of a repository of any of the three types writes an initial
      empty checkpoint snapshot and the default pointer on it; deletion of a `local` is one
      completed write producing one final empty checkpoint snapshot; the tombstone row survives
      pruning of its last snapshot and every later sweep; and a `virtual` repository of a format
      whose `Capabilities()` declares `Virtual: unsupported` is refused at creation and no
      `Repository` row is written.
- [ ] AC39: `Principal`, `Credential`, `Grant` and `TrustPolicy` exist in the shared schema with
      the fields the entity table gives them; a token `Credential` stores a lookup prefix and a
      SHA-256 hash and no column holds the token value; every repository reference in the four
      records is by identity; and a credential scope naming a deleted repository stays readable,
      renders the repository's last name from the tombstone, and authorizes nothing.
- [ ] AC40: An `Upstream` row carries `adapter` (default `https`), `hosts` with a role per entry
      (`none`, `root`, `own` with a credential reference), `tls` (CA bundle reference, client
      certificate and key reference, `insecure_skip_verify` refused unless explicit), `limits`
      (`concurrency` default 10, `cooldown_cap` default one hour) and `http2` (default true), all
      outside the metadata document; an `UpstreamCredential` stores its material encrypted under
      the instance master key and never in clear, rotating it changes exactly one row, and
      deleting one referenced by an `Upstream` or a `ReplicationLink` is refused.
- [ ] AC41: `Job` and `Schedule` exist in the shared schema with the fields the entity table
      gives them; the partial unique indexes hold (a second `pending` job with the same
      `coalesce_key` is not inserted; a second `running` job with the same `exclusive_key` is
      refused); a `Job`'s `trace_context` and `request_id` are set at enqueue and equal the
      enqueuing request's; a terminal job is pruned after `async.job_retention` from its
      finished time and never while its `Operation` exists; an unfinished job naming a
      repository holds that repository's grace open on an injected clock exactly as an unexpired
      upload session does (AC27), released at its terminal transition; and a `Schedule` carries
      an optional repository reference, set on a repository's `retention.pass`, `signing.resign`
      and `replication.sync` schedules and null on an instance-wide one, such that deleting the
      repository disables every schedule carrying its reference in the deletion transaction and
      no schedule without one.
- [ ] AC42: The shared schema carries an index over `Package.name` per repository, the
      search query plans against it rather than scanning the package table, and no new entity
      or mark root accompanies it.
- [ ] AC43: A `Blob` row carries `segment_digests`, one digest per fixed 4 MiB segment written
      in the same commit pass as the canonical digest and equal to an independent recomputation
      over the stored object, and a verification-failed mark that is unset at commit, set by a
      read that fails its digest and cleared by a later read that verifies; the CAS key stays
      the single canonical digest, so no lookup, reference or read resolves a blob by a segment
      digest and a row with the mark set is neither deleted nor rewritten by the read; and
      neither column changes what the sweep marks, proven by a blob whose row carries both
      being collected exactly when it would have been without them.
- [ ] AC44: Each cached metadata document of a `remote` carries `adopted_at`, written only when
      the proxy layer adopts a new upstream revision and, on an injected clock stepped backwards
      between two adoptions, still later than its previous value by at least one second; the
      documents a handler declares as one paired set share one paired-set id, are committed in
      one transaction and read under one record, so a concurrent read never observes one member
      at the new revision and another at the old; a hosted repository's metadata documents
      carry neither field; and the record appears in no snapshot, is dropped with its entry at
      eviction and at tombstone time, and keeps no blob alive (AC34).

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
| AC18 | integration | `internal/model/inflight_read_test.go`; `conformance/oci/split_identity_push_test.go` (scripted client: blobs committed under one credential, `HEAD` and manifest `PUT` under another) |
| AC19 | integration | `internal/proxy/no_snapshot_test.go` |
| AC20 | integration | `internal/model/metadata_concurrency_test.go` |
| AC21 | integration | `internal/model/metadata_storage_test.go` |
| AC22 | integration | `internal/model/promotion_test.go` |
| AC23 | integration | `internal/model/rollback_test.go` |
| AC24 | integration | `internal/proxy/immediate_test.go` (network-level assertion) |
| AC25 | integration | `internal/storage/retention_test.go` (checkpoint and delta dependency across pruning) |
| AC26 | integration | `internal/storage/upload_session_test.go` (injected clock) |
| AC27 | property | `internal/storage/gc_property_test.go` (open-session interleavings on an injected clock) |
| AC28 | unit + integration | `internal/model/retention_config_test.go` (rule shape, refused deep filter, rules absent from the metadata document); `internal/model/repository_config_test.go` (`advisory_ecosystem` and the `policy` document outside the document and the handler `settings`, in no snapshot, unchanged by a repoint, dropped at tombstone time with refusal records kept; the binding rules themselves are `supply-chain-policy.md` AC11's); `internal/model/write_time_test.go` (advanced by completed writes only) |
| AC29 | integration | `internal/model/snapshot_identity_test.go` (recomputed chain across pruning; replica numbering and takeover continuation) |
| AC30 | integration | `internal/model/freeze_test.go` (snapshot count, provenance fields, no `RemoteFile` in the target, source evicted and swept) |
| AC31 | integration | `internal/model/replication_link_test.go` (state set, reason per state, second non-`ended` link refused, `sync_interval`, `ended` on takeover and deletion with the takeover record readable; shared with `replication.md` AC16 and AC22 for the transitions) |
| AC32 | integration + fault injection | `internal/model/operation_test.go` (transitions, atomic terminal commit under an injected fault, non-writing kinds including `refresh` with no snapshot reference, pruning window on an injected clock, authorization on read) |
| AC33 | integration | `internal/model/snapshot_test.go` (last-version removal, later snapshots, pruning) |
| AC34 | property | `internal/storage/gc_property_test.go` (blobs mentioned only by non-root records collected; records readable after; pointer-document and declared-list blobs live while current, collected after) |
| AC35 | integration | `internal/model/retirement_test.go` (same-transaction write, absent from snapshots, survives pruning and operation prune, refusal through the shared write path, recreated identity not retired) |
| AC36 | integration | `internal/model/pointer_freshness_test.go` (every transition kind on an injected clock stepped backwards; written only by the transition; pointer documents per pointer, outside snapshots, dropped with the pointer) |
| AC37 | integration + property | `internal/model/signature_record_test.go` (keying, rotation batch with no snapshot, pruning with the body); `internal/model/signing_key_test.go` (no private material column); `internal/storage/metadata_blob_gc_test.go` (declared blob lists); `internal/model/write_hook_test.go` (hook ordering, failing hook commits nothing) |
| AC38 | unit + integration | `internal/model/schema_test.go` (schema introspection: identity foreign keys, no name column, partial unique index; shared with `repository-lifecycle.md` AC3); `internal/model/repository_lifecycle_test.go` (initial and final empty checkpoint snapshots on all three types, tombstone across pruning and sweeps, `Virtual: unsupported` refusal with a fixture handler) |
| AC39 | unit + integration | `internal/model/credential_records_test.go` (fields, no token-value column, identity references, deleted-repository scope readable and inert) |
| AC40 | unit + integration | `internal/model/upstream_test.go` (extended: transport fields outside the document); `internal/model/upstream_credential_test.go` (encrypted at rest, one-row rotation, in-use refusal) |
| AC41 | integration + property | `internal/model/job_test.go` (fields, partial unique indexes, trace fields at enqueue, prune ordering against `Operation`); `internal/model/schedule_test.go` (repository reference set and null; scoped schedules disabled by deletion, instance-wide ones untouched; shared with `async-operations.md` AC28's `internal/repository/delete_test.go`); `internal/storage/gc_property_test.go` (queued and retrying job in the operation set on an injected clock) |
| AC42 | integration | `internal/model/package_index_test.go` (index present; `EXPLAIN` of the search query uses it) |
| AC43 | unit + integration + property | `internal/model/blob_row_test.go` (segment digests written at commit and recomputed; mark unset, set and cleared through the read path; no resolution by segment digest); `internal/storage/read_verify_test.go` (the mark on an altered object, shared with `storage-and-gc.md` AC21); `internal/storage/gc_property_test.go` (marking unchanged by either column) |
| AC44 | integration + property | `internal/model/cache_freshness_test.go` (record on the remote's document entry, absent on hosted documents, dropped at eviction and tombstone); `internal/proxy/freshness_test.go` (monotonic under a backwards clock; paired set committed atomically under concurrent reads; shared with `proxy-cache.md` AC22) |

## Implementation Phases

### Phase 1: Core entities
Repository, Package, Version, File, Blob, with opaque metadata documents at all three levels.
The repository's identity as primary key, its lifecycle columns, the partial unique index on
`name` and the tombstone (AC38, with `repository-lifecycle.md` Phase 1). The upload session
record and its lifetime (AC26), and repository-scoped in-flight digest resolution under the
upload scope (AC18). A package outliving its versions (AC33), each version's last completed
write time and core-parsed retention rules on `Repository` (AC28), with the `advisory_ecosystem`
and `policy` columns beside them, which `supply-chain-policy.md` Phase 1 reads. The `Blob` row's
`segment_digests` and verification-failed mark (AC43), which `storage-and-gc.md`'s verified read
path writes and reads. The `Package.name` index (AC42). `Principal`, `Credential`, `Grant` and
`TrustPolicy` (AC39), which `credential-management.md` Phase 1 needs at charter step 2.

### Phase 2: Snapshots and pointers
`Snapshot` (deltas plus periodic checkpoints, capturing membership and metadata) and
`Pointer`: the default always-advancing pointer created on the initial empty snapshot at
creation, named environment pointers with the promotion, rollback and reach-reporting model
(AC22, AC23; the HTTP surface is `management-api.md`'s), and the pointer-resolution
architecture test. The chained snapshot identity, written with every snapshot and never pruned
(AC29). The pointer freshness record and the `PointerDocument` record (AC36), and the write
transaction's pre-commit hook (AC37), which `signing-service.md` Phase 1 builds on. The
`Operation` entity in its widened form (AC32), which `management-api.md` Phase 1 needs at
charter step 2, before the write-triggered services prototype's asynchronous half and before
`formats/ansible-collections.md`'s Phase 1. The `Retirement` record lands with it, as this spec's
AC35 requires.

### Phase 3: Remote modelling
`Upstream` with its transport configuration, `UpstreamCredential`, `RemoteFile`, download
policies, upstream failover (AC40, with `upstream-adapters.md` Phase 1), and the cache-scoped
freshness record with its paired-set id on a `remote`'s cached documents (AC44), which
`proxy-cache.md`'s freshness phase writes.

### Phase 4: GC integration
The cached, retained-snapshot and pointer-targeted-snapshot reference classes, the open-session
hold on repository grace (AC27), the records placed outside the root set (AC34), the fourth
root's reach over pointer documents and declared blob lists, and the property tests that police
them.

### Phase 5: Records for sibling subsystems
`Job` and `Schedule` with its repository reference (AC41), which `async-operations.md` Phase 1
needs when the queue core lands; `Signature` and `SigningKey` (AC37), before `signing-service.md`
Phase 1; the verification records' row, before `artifact-verification.md` Phase 1; and
replication's replication link with its six-state lifecycle and freeze write kind with its
provenance record (AC30, AC31), which must land before `replication.md`'s Phase 1 and Phase 4
respectively.

## Tasks

Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None are open. Q15 (raised by the 2026-09-24 gate review) and Q16 (raised while folding it)
were adopted on 2026-09-26 under the owner's standing delegation and folded through Scope, the
Design sections "Upload sessions and the upload scope" and "Reads from in-flight publish state",
AC18, AC26, AC27, the Test Plan and Phases 1 and 4. The records added the same day by the Wave 1
reconciliation (AC28 to AC34) apply decisions adopted in sibling specs and raised no question
here, and so do the records added on 2026-09-27 by the reconciliation of the foundation
authoring wave (AC35 to AC42, and the qualification of AC22): every one transcribes a decision
a sibling spec adopted under the delegation, and where two siblings could have read differently
(a `remote`'s one initial snapshot against the was-Q11 rule; a completed operation with no
snapshot against the atomic-commit rule) the derivation is recorded in the amendment notes
below rather than as a new question. The 2026-09-28 additions (AC43, AC44, and the extensions
of AC28, AC31, AC32 and AC41) likewise transcribe decisions the reconciling siblings adopted
(`storage-and-gc.md` was-Q11, `management-api.md` was-Q12, `replication.md`'s link lifecycle,
`proxy-cache.md`'s cache-scoped freshness, `supply-chain-policy.md`'s repository fields,
`async-operations.md`'s scoped schedules) and raised none here. Q1 through Q3 were answered on
2026-09-22 and Q4 through Q14 on 2026-09-23.

Resolved decisions are kept below rather than deleted, so the reasoning survives the next time
someone asks why it was done this way.

### Resolved: the in-flight membership check's scope (was Q15)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: repository scope. Any
principal authorized to pull from a repository resolves that repository's in-flight digests,
whichever principal committed them, and no principal resolves them through any other
repository.

The question, as raised: the resolved reads-from-in-flight-publish-state decision (was Q14)
settled the digest/name split, and that split stands. Its mechanism did not: it scoped the
anti-probing membership check to the upload session, and by the time an OCI client `HEAD`s a
blob it has just committed, that blob's upload session is closed and the `HEAD` carries no
session identifier at all - there is no push session on the wire, the exact reality that forced
`storage-and-gc.md` to re-scope its grace period from session to repository. As written the
check had nothing to key on, and two implementors would have built different systems.

**Recommendation (as written before adoption):** A - repository scope. It matches the wire (the
repository is the only boundary every relevant request names), matches the precedent the grace
period set for the identical reason, and cannot break a push whose blob upload and manifest PUT
come from different workers. The residual disclosure is small: a principal must already hold
access to the repository, whose published content it can read anyway.

| Option | You get | It costs |
|---|---|---|
| **A. Repository scope: any principal authorized on the repository resolves its in-flight digests** | Implementable from what the wire provides; multi-worker pushes (blob from one runner, manifest from another) work; same boundary as the settled grace period | A principal with repository access can probe digests of content another client committed but has not yet referenced - an existence disclosure inside the repository's own trust boundary |
| **B. Uploader-identity scope: only the identity that committed the blob resolves it pre-reference** | Closes intra-repository probing entirely; the in-flight window discloses nothing to anyone but its creator | Breaks any push where the manifest PUT arrives under a different identity or token than the blob commits, and the failure is a 404 mid-push on the flagship format's conformance path |

**Why this was the owner's:** it prices an existence-disclosure window against client
compatibility on the format the zero-skips gate is sold on, and it amends the mechanism of a
decision the owner already made.

Accepted cost: a principal who can already pull from a repository can learn that some other
client committed a digest the repository does not yet reference. Option B lost because it
breaks a legitimate push shape - blobs from one worker, manifest from another - with a 404
mid-push on the flagship format, and it keys on the uploader's identity, which the one
definition of an upload session now rules out as a boundary the protocol does not respect.

This was the third collision of one root cause (the grace period, this check, and `oci.md`'s
session lifetime all assumed a session the wire lacks), so the adoption also wrote the single
definition in Design, "Upload sessions and the upload scope", which every consumer now cites
instead of re-scoping locally. Folded into that section, "Reads from in-flight publish state",
the Snapshots carve-out, AC18 (rewritten to assert repository scope with a second principal and
cross-repository invisibility) and Phase 1.

### Resolved: upload session lifetime defaults (was Q16)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: one hour idle, 24 hours
absolute, both configurable instance-wide.

The question, raised while folding Q15 and `formats/oci.md`'s session-lifetime decision (which
chose sliding idle expiry with an absolute cap but no values): an upload session is
format-agnostic, so its lifetime belongs in the one definition here, and a mechanism with two
parameters and no defaults is two implementors' guesses.

**Recommendation (as written before adoption):** A - one hour idle covers a CI job paused
between steps and a client retrying across a network drop; 24 hours covers a multi-gigabyte
layer over a slow link; and because an open session holds its repository's grace open, an
abandoned session delays that repository's collection by at most one idle period after its last
request.

| Option | You get | It costs |
|---|---|---|
| **A. One hour idle, 24 hours absolute** | Survives realistic pauses and slow links; an abandoned session stops holding its repository's grace within an hour | A client paused for more than an hour inside one blob upload must restart that blob |
| **B. Fifteen minutes idle, six hours absolute** | Orphans and grace holds end sooner | A CI job waiting on a slow step or a queued runner loses its in-progress blob, and a very large layer on a slow link can hit the cap |
| **C. A long fixed window only (days)** | One parameter, generous to every client | Contradicts the sliding-expiry decision, and an abandoned session would hold its repository's grace open for days |

**Why this is the owner's:** it draws the resumability promise made to clients in numbers, and
no measurement derives it.

Accepted cost: a client paused inside one blob upload for more than an hour, or uploading one
blob for more than a day, must restart it. Option B trades real CI pauses for faster orphan
collection the grace period already bounds; option C abandons the adopted sliding shape and lets
an abandoned session pin its repository's grace for days. Folded into the Design section's
"Session lifetime" paragraph and AC26; AC27 asserts the grace hold the defaults were priced
against.

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

Amended 2026-09-26 by the owner's answer on pointer targets: a snapshot a `Pointer` targets is
exempt from pruning while targeted, so it protects its blobs however old it is. That is the fifth
root, enumerated in this spec's Scope and Design and policed by `storage-and-gc.md` AC17 and
AC18.

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

Extended 2026-09-27 by `upstream-adapters.md`, which now owns the adapter axis: the row gained
`adapter`, `hosts`, `tls`, `limits` and `http2`, and the credential store the row references
became the `UpstreamCredential` record (Design, "Upstream configuration and upstream
credentials", AC40). The entity and its one-to-one binding stand.

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

Amended 2026-09-27 by `repository-lifecycle.md`'s creation rule, a refinement and not a reversal:
a `remote` (and a `virtual`) does hold exactly one snapshot, the empty checkpoint written at
creation for its default pointer to target, because the pointer is where the freshness record
and the cache-scoped documents hang and nothing name-addressed resolves without one. No content
ever enters it, nothing arriving by sync or on demand creates another, and both purposes of the
decision (eviction never fights the snapshot root; the hot path never touches the sequence) hold
as before. Folded into "Download policies", "Snapshots, pointers and what counts as a write" and
AC38; AC19 is unchanged.

The same day, `management-api.md`'s widening of `Operation` to every management operation
implied that a completed operation need not have a snapshot: a `repoint`, a `freeze`, a `thaw`,
a `rename` and, since 2026-09-28, a `remote`'s `refresh` complete without one because they create
none. The atomic-commit rule in
"Operations" now binds snapshot-producing kinds, which is what it always protected against (a
snapshot whose operation reads unfinished, or a content operation reported complete with no
snapshot), and AC32 says so.

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
arrives, so a session-scoped check has nothing to key on. Amended again 2026-09-26: the check
is repository-scoped, per the adopted in-flight membership scope (was Q15) and the one
definition of an upload session in Design.

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
back toward the 33 bespoke schemas this model exists to prevent.

Noted 2026-09-26 by the Wave 1 reconciliation: the separate index this anticipated now has an
owner. `supply-chain-policy.md`'s component inventory, catalogued from artifact bytes by its
shared cataloguer, is that index; it and the policy layer's other records are core-owned,
outside the format entity model, and not mark roots (Design, "Records that are not mark
roots").

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-28 | 95346bd | cross-spec reconciliation sweep of the foundation wave. Not a review | Not a review. Applied the six items raised against this spec by the step-3 reconciliations that ran after this spec's own pass on 2026-09-27, each verified against the source spec's current text. From `storage-and-gc.md` (its resolved range-read decision, was Q11, AC21): the `Blob` row gains `segment_digests` (one per fixed 4 MiB segment, written in the commit pass) and a verification-failed mark the read path sets and clears; stated under "A coordinate is not a storage key" so the CAS key stays the single canonical digest (AC43). From `proxy-cache.md` (AC22): the cache-scoped freshness record on a `remote`'s cached documents, `adopted_at` and the paired-set id, as a new bullet of "Freshness scoped to the pointer" (AC44). From `management-api.md` (was Q12): `refresh` among the operation kinds and the non-writing kinds, in the was-Q11 amendment note and AC32. From `supply-chain-policy.md` (AC11): `advisory_ecosystem` and the `policy` document as core-parsed `Repository` columns beside the retention rules, dropped at tombstone time, in the renamed section "Retention rules, policy fields and a version's write time" and AC28. From `replication.md` ("The link has states of its own"): the `ReplicationLink` state set `syncing`, `idle`, `failed`, `reseeding`, `diverged`, `ended`, the reason vocabulary, the optional `sync_interval`, "at most one active link" defined as at most one non-`ended` link, and the takeover record living on the `ended` link (AC31 rewritten). From `async-operations.md` and `upstream-adapters.md` (async AC28): the optional repository reference on `Schedule`, what deletion disables (AC41 extended). Mark-root check: none of the six is a root or widens a root's reach; three rows added to "Records that are not mark roots"; the set stays five and Scope says so. Two criteria added with Test Plan rows, four extended, Phases 1, 3 and 5 updated. `node scripts/check-spec.js` on this file: zero failures. Stays draft until a gate review. |
| 2026-09-27 | 97da8ab | cross-spec reconciliation of the foundation authoring wave. Not a review | Not a review. Applied every item in `agents/spec-loop/consequences.md` targeting this spec from the ten foundation specs authored 2026-09-27, each verified against the source spec's current text rather than the queue's summary. From `management-api.md`: the core-held `Retirement` record (AC35), `Operation` widened from asynchronous-only to every management operation with idempotency key, request id and the `repoint` and `lifecycle` kinds, the HTTP home of pointer management cited, and creation establishing the default pointer on an initial empty snapshot; the package-outlives-versions rationale reworded (addressability and format state, no longer the set) and AC33 with it. From `credential-management.md`: `Principal`, `Credential`, `Grant`, `TrustPolicy` (AC39). From `artifact-verification.md`: the verification records' non-root row. From `signing-service.md`: the pointer freshness record (`moved_at`, generation counter), `PointerDocument`, `Signature`, `SigningKey`, the declared blob-digest list on a CAS-backed document, the write transaction's pre-commit hook, and AC22 qualified (content bit-identical, freshness signals and pointer documents not), which closes cross-cutting theme 1 and Open items 20, 22, 26, 27, 28, 30 and 32 on the data-model side (AC36, AC37). From `upstream-adapters.md`: the `Upstream` row's transport fields and `UpstreamCredential` (AC40). From `async-operations.md`: `Job` and `Schedule`, `cancelled` as a third terminal state, and the job-held grace replacing the "prototype's question 5" wording (AC41; AC32 rewritten). From `repository-lifecycle.md`: identity as primary key with the `rep_` rendering, the lifecycle columns, the partial unique index on `name`, the never-removed tombstone, initial and final empty checkpoint snapshots on every type, and the per-format `Virtual` capability that closes theme 9 and Open item 12 (AC38). From `observability.md`: `Job.trace_context` and `request_id`. From `web-ui.md`: the `Package.name` index (AC42). Open item 16 (Julia) recorded as an application of the digest-keying rule; Open item 29 (opam needs no freshness record) needed nothing. Mark-root check: none of the additions is a root, the set stays five; the fourth root's reach widens to CAS-backed pointer documents and declared blob lists, stated here as `storage-and-gc.md`'s amendment (its consequence item from the signing-service fold). Two derivations recorded as amendment notes rather than new questions: a `remote` holds one empty initial snapshot (was-Q11 refined, not reversed) and a completed operation of a non-writing kind has no snapshot (the atomic-commit rule binds snapshot-producing kinds). Entity table split into the content model and the records beside it; non-root table extended; AC34 extended to every new record; eight criteria added with Test Plan rows; Phases 1 to 5 updated. Zero open questions; `node scripts/check-spec.js` run on this file with zero failures. Stays draft until a gate review. |
| 2026-09-26 | 4d1aeb1 | folding adopted recommendations under the standing delegation | Not a review. Adopted Q15 option A: the in-flight digest-read membership check is repository-scoped, so any principal authorized to pull from R resolves R's committed-but-unreferenced digests and none resolves them through another repository. Because this was the third collision of "a session the wire does not have" (after the grace period and `oci.md`'s session-lifetime question), wrote the single definition the triage asked for as a new Design section, "Upload sessions and the upload scope": an upload session is exactly one blob's upload into one repository, ended by commit or expiry; there is no push session and no mechanism may key on one or on the uploader's identity; anything spanning commit to reference is scoped to the repository; an open session holds its repository's grace open; a digest resolves in a repository only through that repository's own content. Adopted `oci.md`'s session-lifetime decision into that definition and raised and adopted Q16 for its defaults. Checked against `storage-and-gc.md`: its repository-scoped grace re-scoping is consistent with the definition; two gaps it cannot close itself are reported as sibling consequences (the open-session grace hold, and AC3's undefined session expiry). Changed: Scope, the new Design section, "Reads from in-flight publish state", the Snapshots carve-out, AC18 rewritten, AC26 (lifetime) and AC27 (open-session grace hold) added, Test Plan, Phases 1 and 4, the was-Q14 amendment note. The mark-root set is untouched: in-flight and mounted blobs are protected by grace, not by a root. Zero open questions. |
| 2026-09-26 | fe54272 | cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Applied every queued item targeting this spec. From `replication.md`: the `ReplicationLink` entity (leader URL, leader repository name, credential reference in the upstream-credential store, status, last sync, takeover record; local repositories only, one active link), the never-pruned `SnapshotIdentity` (its delta digest a comparison hash, not a CAS reference), freeze as a snapshot-creating write kind whose frozen files hold published references and no `RemoteFile`, the `FileProvenance` record, and replica numbering as the leader's with takeover continuing it. From `formats/generic.md`: core-parsed retention rules on `Repository` (kind, parameter, filter at most `{package}/{version}`) and each version's last completed write time; its write-boundary declaration noted as the first made. From the format-management fold: the `Operation` entity with monotonic state, immutable terminal states, an unguessable wire id, the authorizing scope recorded for reads, a terminal transition atomic with its snapshot, pruning after a window, and no snapshot-content role; and the rule that a `Package` outlives its versions, with the rollback-versus-retirement-set interaction named as the management surface's obligation. From `supply-chain-policy.md`: its condemnation, scan, component-inventory and refusal records placed outside the format entity model, and the metadata-typing record's anticipated index identified as its component inventory. From the charter fold: 31 bespoke schemas corrected to 33 (Context, the was-Q3 record). Mark-root check: none of the additions is a root, so nothing needed reporting; a new Design table places each record against the set and AC34 proves a blob mentioned only by them is collected. AC28-AC34 added with Test Plan rows; Scope, the entity table, Phases 1, 2 and 4 and a new Phase 5 updated. |
| 2026-09-26 | 4548df3 | cross-spec correction during storage-and-gc's gate review | Not a review of this spec. The pin's release path had no producer: Design said "only a repoint or a pointer deletion releases it" and `storage-and-gc.md` AC18 tests pointer deletion, but this spec's pointer-management API surface offered only create, repoint and reach-reporting. Deletion of a named environment pointer added to that surface; the default pointer is not deletable, which is entailed rather than decided, since name-addressed serving resolves only through pointers and a repository whose default pointer could be deleted would stop serving name reads entirely. Q15 untouched and still open. |
| 2026-09-26 | 2edd42c | folding owner answers to storage-and-gc Q10 and proxy-cache Q11 | Not a review, and this spec is not the decision's home - but it owns the mark-root set, so the amendment lands here. The 1701a48 gate review's prediction of what changes under Q10 option A was checked against the file rather than trusted, and all three items were real: the Scope liveness bullet (now five roots, the fifth being a snapshot a `Pointer` targets plus its reconstruction chain), the pruning-reconstructibility sentence in the Snapshots section (a checkpoint or delta survives while any snapshot that survives pruning depends on it, targeted or in-window) and AC25's notion of retained (now surviving, with a pointer-targeted out-of-window snapshot among the survivors). Also folded: the Design consequences bullet's four reference classes, a Snapshots-section paragraph defining the pin and its accepted cost, the was-Q5 record's amendment note, and Phase 4. AC23 was checked for contradiction and is not one: it refuses repointing **to** an untargeted out-of-window snapshot while the pin protects a snapshot already targeted from aging out, so protection attaches on targeting and is not retroactive - stated in Design and in AC23 itself. Q15 is untouched and still open. |
| 2026-09-24 | 1701a48 | gate review: application check of all 14 resolved decisions + adversarial (OCI push flow vs the pointer model) + cross-spec in both directions against storage-and-gc, proxy-cache, replication, oci and supply-chain-policy + unpoliced-design-claim hunt + constitution + go-spec-reviewer; claim verification against code vacuous (the tree holds only a stub `cmd/stackweaver-registry/main.go`, no `internal/` exists); the terminated reviewer's three kept edits re-verified rather than trusted, all three sound | 12 of 14 decisions genuinely applied; two were half-applied and are now folded: the promotion scope-in had left Design's Snapshots section claiming a single always-advancing v1 pointer and no snapshot API while Scope, the entity table and AC22/AC23 said the opposite (Phase 2 also still built the v1 pointer, and no phase built promotion), and the fourth-mark-root resync had left the Design consequences bullet claiming a three-root sweep. Derived, not decided: hosted deletes and metadata-only mutations are snapshot-creating completed writes, entailed by pointer-only name serving plus immutable snapshots plus oci.md's content-management scope, folded into the Snapshots section, the Scope bullet, the Snapshot entity row and AC9. AC24 added (`immediate` was the only download policy no criterion anywhere exercised) and AC25 added (pruning reconstructibility was named by Design as what keeps the sweep sound and policed by no AC in this spec or the sibling). Supersession notes added to the was-Q2, was-Q4, was-Q7 and was-Q14 records; `Pointer` gained its repository ref; the root-set liveness bullet now names storage-and-gc Q10 as a pending amendment to the set this spec owns; one stale three-root remnant fixed in proxy-cache's resolved cache-location record. Coherence under the open sibling questions assessed: under storage-and-gc Q10 option A the liveness bullet, the pruning-reconstructibility sentence and AC25's notion of retained must widen to pointer-targeted snapshots, under B or C this spec stands as written; proxy-cache Q11 presupposes nothing here under either answer. One genuine defect found in a settled decision's mechanism and raised as Q15: the in-flight digest-read membership check is session-scoped, but OCI has no push session on the wire and the blob's upload session is closed before the client's HEAD arrives, so the check has nothing to key on - the same wire reality that re-scoped the grace period. Stays draft on Q15. |
| 2026-09-24 | d078c46 | partial: a gate reviewer terminated on a spend limit mid-pass. Its review does not count and this spec still awaits one | Kept only what is independently verifiable against the siblings at this sha: the liveness bullet resynced to `storage-and-gc.md`'s four mark roots, the snapshot bullet's stale "promotion and rollback do not ship in v1" corrected against the reversal already committed at 525c9f8, and the Open Questions intro corrected - it still announced open questions and blocked implementation while the file records none. |
| 2026-09-22 | afbb4e4 | adversarial + constitution + sibling consistency (code-claim verification vacuous: pre-implementation, no tree to check) | Breadth claim stressed against Maven, OCI, Debian and npm; six open questions raised (Q4-Q9), snapshot ACs added (AC9, AC10), stale sibling references corrected; stays draft |
| 2026-09-23 | 3e3ae0a | second pass: folded-decision application + adversarial + go-spec-reviewer (code-claim verification still vacuous: pre-implementation) | The five 2026-09-23 decisions were recorded under Resolved headings but only partly applied; Scope, the entity table, the GC consequences and the Snapshots section synced to them, AC9 reworded, AC11-AC15 added (Upstream and the upper metadata levels were previously unasserted, the cache-fill exclusion and delta bounds untested, and rollback could pass membership-only); Q9's premises updated; Q10-Q14 raised; stays draft |
| 2026-09-23 | 9c971d4 | cross-spec consistency (proxy cache lifecycle) | Corrected the exclusive local-or-remote wording: cached files retain `RemoteFile` provenance alongside the local blob for revalidation and failover, with AC4 updated; existing open questions still keep the spec draft. |
