---
status: draft
status_description: "Drafted from the prior-art survey; the RemoteArtifact adoption is the load-bearing decision and needs an owner answer."
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

**Out of scope**

- Repository versioning and immutable snapshots (Pulp's `RepositoryVersion` / `Publication`).
  Powerful, and a large amount of machinery for a promotion workflow nobody has asked for yet.
  Deliberately deferred, not rejected: see Open Questions.
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

### Q1: Adopt Pulp's `RemoteArtifact` model, or keep the cache as a separate subsystem?

This is the load-bearing decision in the spec.

**Recommendation:** adopt it. It is proven at scale, it makes pull-through caching a property of
the model rather than a subsystem, and multi-upstream failover falls out for free.

| Option | You get | It costs |
|---|---|---|
| **A. Adopt (same store, remote rows)** | Caching, mirroring and pass-through from one schema; dedup across hosted and cached; free failover | GC gains a second reference class, in the component the charter already calls the most dangerous |
| **B. Separate cache subsystem** | GC stays single-purpose; eviction independent of publishing | Duplicate storage for mirror-and-fork; two durability stories; every format handler learns about caching separately |

**Why this is yours:** it trades complexity in the most dangerous component against complexity
everywhere else.

### Q2: Do we need immutable repository versions and publications now?

Pulp models every change as a new immutable `RepositoryVersion`, with `Publication` and
`Distribution` on top. That is what enables promotion workflows (dev to staging to prod) and
point-in-time rollback, which is a genuine enterprise selling point against Gitea.

**Recommendation:** defer, but keep the door open by never assuming a repository has exactly one
current state in the handler interface.

| Option | You get | It costs |
|---|---|---|
| **A. Defer** | A far smaller v1; the model stays legible | Retrofitting versioning later touches every table and every handler |
| **B. Build it now** | Promotion and rollback, a real differentiator over Gitea | Substantial machinery before a single format works, on a feature no user has asked for yet |

**Why this is yours:** it is a product-scope call about whether this competes with Artifactory's
promotion story or with Gitea's hosting story first.

### Q3: Is format-specific metadata an opaque JSON document, or typed per format?

**Recommendation:** opaque to the core, typed inside the handler. The core gaining knowledge of
any format's metadata shape is the first step back toward 31 bespoke schemas.

**Why this is yours:** opaque metadata means the core cannot query across formats (for example,
"every artifact with this licence"), which forecloses some cross-cutting features.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
