---
status: draft
status_description: "All open questions answered by the owner and folded in; awaiting a /spec review pass to earn planned."
description: "Spec for the shared generic data model every format stores against, adapting Gitea's four-table package model and Pulp's RemoteArtifact and download policies."
author: michielvha
goal: "Make breadth affordable by giving all 33 ecosystems one metadata schema, so a format is parsing plus routes rather than a bespoke database design."
priority: "critical"
issue: 12
created: 2026-09-22
covers:
  - "internal/model/**"
  - "internal/storage/**"
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
(`docs/internal/research/registry-architecture-prior-art.md`). **Gitea serves all 22 of its
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
| `RemoteFile` | upstream URL, credentials ref, last-checked | A file known to exist upstream with no local blob yet |
| `Snapshot` | monotonic number, repository, content set | Immutable. Every write creates one |
| `Pointer` | name, target snapshot | What a serving URL resolves through. v1 ships exactly one per repository, always tracking the newest snapshot |

The core owns every table. A handler reads and writes the metadata document and never issues its
own DDL. **If a format appears to need its own table, that is a signal the shared model is wrong,
not a licence to add one** - raise it as a spec change.

### Cached and hosted are the same store

Adopting Pulp's answer to `proxy-cache.md` Q1: there is no separate cache store. A `File` either
has a local `Blob` or has a `RemoteFile` telling the system where to get one, and "cached" is a
statement about how the blob arrived, not about where it lives.

Consequences worth stating explicitly, because they are where the bugs will be:

- A blob can be referenced by a published artifact **and** a cached one simultaneously. GC
  liveness therefore has two reference classes, which is the complication
  `storage-and-gc.md` Q1 has to price in.
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

Every write creates a `Snapshot`; serving always resolves through a `Pointer`. In v1 there is
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
| AC8 | manual | verified per format at spec review |

## Implementation Phases

### Phase 1: Core entities
Repository, Package, Version, File, Blob, with the opaque metadata document.

### Phase 2: Remote modelling
`RemoteFile`, download policies, upstream failover.

### Phase 3: GC integration
The second reference class, and the property tests that police it.

## Open Questions

None. Every question this spec raised has been answered by the owner and folded into
Design and Scope above, with each decision's accepted cost recorded beside it.

Resolved decisions are kept rather than deleted, so the reasoning survives the next time
someone asks why it was done this way.

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

### Resolved: metadata typing (was Q1)

**Settled 2026-09-22: opaque to the core, typed inside the handler.** The core stores and
returns a JSON document it never interprets.

Accepted cost: the core cannot query across formats, so features like "every artifact under this
licence" need a separate index built later rather than falling out of the schema. That is the
right trade: the core gaining knowledge of any single format's metadata shape is the first step
back toward the 31 bespoke schemas this model exists to prevent.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
