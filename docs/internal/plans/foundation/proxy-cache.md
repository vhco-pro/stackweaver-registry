---
status: draft
status_description: "Drafted from the founding discussion; scheduled after OCI, needs a review pass once the CAS design settles."
description: "Spec for the upstream proxy and cache layer - the project's actual differentiator, covering cache policy, negative caching, offline mode and upstream credentials."
author: michielvha
goal: "Deliver the one capability no free multi-format registry has, so the project is not a slower Gitea with fewer formats."
priority: "high"
issue: 5
created: 2026-09-21
covers:
  - "internal/proxy/**"
---

# Plan: Upstream proxy and cache

Caching proxies of upstream registries. This is the differentiator; without it the project has
no reason to exist alongside Gitea.

## Context

The prior-art survey is unambiguous: free multi-format **hosting** is solved. Gitea and Forgejo
cover 24 formats under MIT and GPL, with SSO, and they cannot cache an upstream. Harbor can, and
speaks only OCI. Pulp can, and has no usable UI. JFrog and Sonatype can, and charge for the
rest.

So the proxy layer is not a feature, it is the thesis. The charter makes it mandatory from the
second format precisely because retrofitting it is not possible: it changes what content the
store holds, where blobs come from, and what "this package exists" means.

It is also the capability users actually want. The most common real deployment of an artifact
repository is not private publishing, it is *a cache in front of npm, PyPI and Docker Hub* for
build reliability, egress cost and supply-chain control.

## Scope

**In scope**

- Remote repositories: a local repository backed by a configured upstream.
- Cache policy: TTLs for mutable metadata, indefinite retention for immutable artifacts.
- **Negative caching** of upstream 404s, with a short TTL.
- **Offline mode**: serve everything cached, never contact the upstream, fail closed on a miss.
- Upstream credentials, stored encrypted, for authenticated upstreams.
- Cache eviction, coordinated with blob GC.
- Conformance cases in proxied mode for every format.

**Out of scope**

- Virtual/aggregate repositories that merge several backing repositories into one endpoint. A
  natural follow-on, kept separate so this spec stays shippable.
- Supply-chain policy (blocking packages by CVE or licence). Later, and it needs this first.
- Write-through proxying (publishing upstream through us). Not a use case anyone asked for.

## Design

### The distinction that governs everything

Package ecosystems have two kinds of resource and they cache completely differently:

- **Immutable artifacts** - a specific version's tarball, wheel or blob. Addressed by content or
  by an identifier that never changes meaning. Cache forever; correctness comes free.
- **Mutable metadata** - "what versions of X exist", dist-tags, the PyPI simple index. Changes
  whenever anyone publishes. Needs a TTL, conditional revalidation, and careful invalidation.

Nearly every proxy bug lives in the second category: a stale packument means a newly published
version is invisible, and an over-eager TTL means hammering the upstream. Handlers declare which
category each response falls into; the proxy layer does not guess.

### Negative caching

Upstream 404s must be cached, briefly. Without it, a typo'd dependency name in a busy CI fleet
becomes an unintentional denial-of-service against the upstream, and the failure is slow rather
than fast. With too long a TTL, a newly published package stays invisible after it exists. Short
TTL, and an explicit invalidation path.

### Offline mode

A hard mode where the cache is the whole world: every cached artifact serves, no upstream
request is ever made, and a miss fails immediately rather than hanging. This is what makes the
proxy useful for air-gapped and disaster scenarios, and it is trivially testable, which makes it
good early conformance material.

### Interaction with GC

Cached upstream content lives in the same CAS as hosted content, so eviction and GC must agree
on what is live. A cached blob's liveness is governed by cache policy rather than by a
publishing reference, which means the GC invariant in `storage-and-gc.md` needs a second class
of reference. **That spec must land first**; this one depends on how its open questions resolve.

## Acceptance Criteria

- [ ] AC1: A remote repository serves an artifact fetched from a configured upstream, and serves
      it from cache on the second request without contacting the upstream.
- [ ] AC2: Immutable artifacts are cached indefinitely; mutable metadata is revalidated after its
      TTL, proven by a test upstream that changes its response.
- [ ] AC3: A newly published upstream version becomes visible within the configured metadata TTL
      and not before, demonstrating the TTL is actually honoured in both directions.
- [ ] AC4: Upstream 404s are negatively cached, and a subsequent request for the same missing
      name does not reach the upstream within the negative TTL.
- [ ] AC5: In offline mode, cached content serves, no upstream request is made (asserted at the
      network layer, not by inspecting logs), and a miss fails fast.
- [ ] AC6: Upstream credentials are stored encrypted and never appear in logs, responses or error
      messages.
- [ ] AC7: Cache eviction never deletes a blob that hosted content also references, proven by a
      test where the same digest arrives from both a publish and an upstream fetch.
- [ ] AC8: Every implemented format has conformance cases in proxied mode.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | integration | `internal/proxy/cache_test.go` |
| AC2 | integration | `internal/proxy/ttl_test.go` (mutating test upstream) |
| AC3 | integration | `internal/proxy/ttl_test.go` |
| AC4 | integration | `internal/proxy/negative_cache_test.go` |
| AC5 | integration | `internal/proxy/offline_test.go` (network-level assertion) |
| AC6 | unit | `internal/proxy/credentials_test.go` |
| AC7 | property | `internal/storage/gc_property_test.go` |
| AC8 | conformance | `conformance/<format>/proxied_test.go` |

## Implementation Phases

### Phase 1: Fetch and cache
- Remote repository config, upstream fetch, immutable caching

### Phase 2: Policy
- TTLs, conditional revalidation, negative caching

### Phase 3: Operability
- Offline mode, encrypted upstream credentials, eviction coordinated with GC

## Open Questions

### Resolved: cache location (was Q1)

**Settled 2026-09-22: the same store, per the shared data model (#12).** A file either has a
local blob or a `RemoteFile` row pointing upstream; "cached" describes how the blob arrived. This
is Pulp's `RemoteArtifact` model, and it brings the `immediate`/`on_demand`/`streamed` policies
and multi-upstream failover with it.

Consequence carried by `storage-and-gc.md`: GC marks from two reference roots, published and
cached.

### Q2: What is the default metadata TTL?

Too short hammers upstreams and wastes the cache; too long makes newly published versions
invisible and generates "your registry is broken" reports that are really TTL reports.

**Recommendation:** a conservative default in the low minutes, per-repository override, and an
explicit "refresh now" action in the UI and API, so the default never has to be the answer to an
urgent problem.

**Why this is yours:** it is a user-experience judgment about which failure mode is more
tolerable to your users.

### Q3: Which upstreams ship pre-configured?

Shipping npm, PyPI and Docker Hub as ready-made defaults is a large usability win and a
commitment: their rate limits, auth behaviour and protocol quirks become our support surface.

**Why this is yours:** it is a scope-versus-adoption call.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
