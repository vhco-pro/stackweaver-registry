---
status: draft
status_description: "Reviewed 2026-09-22 at afbb4e4: corrections applied and six new open questions raised (Q4-Q9); stays draft until the owner answers them."
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
cover 23 formats under MIT and GPL, with SSO, and they cannot cache an upstream. Harbor can, and
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
  by an identifier that never changes meaning. Cache forever - but immutability is an upstream
  convention, not a guarantee: npm replaces malware releases with a security-holding package at
  the same version, so the same "immutable" coordinate can legitimately return different bytes.
  Cache-forever is safe only together with the integrity rules below and an answer to Q7.
- **Mutable metadata** - "what versions of X exist", dist-tags, the PyPI simple index. Changes
  whenever anyone publishes. Needs a TTL, conditional revalidation, and careful invalidation.

Nearly every proxy bug lives in the second category: a stale packument means a newly published
version is invisible, and an over-eager TTL means hammering the upstream. Handlers declare which
category each response falls into; the proxy layer does not guess.

### Integrity of fetched content

Most ecosystems publish an integrity digest alongside the coordinate (the OCI manifest digest,
npm's `dist.integrity`, the hashes in PyPI's simple index). Where one exists, the proxy verifies
the fetched bytes against it, and a fetch that fails verification is never committed to the CAS:
the `File` row would otherwise record bytes the coordinate never promised, and dedup would
propagate them. A fetch that ends before the upstream signals completion (connection drop,
truncated body) is likewise discarded and never committed - a truncated body still hashes to a
valid digest *of itself*, so "digest of what arrived" is not a completion check. Whether the
in-flight client receives bytes before verification completes is Q6.

### Negative caching

Upstream 404s must be cached, briefly. Without it, a typo'd dependency name in a busy CI fleet
becomes an unintentional denial-of-service against the upstream, and the failure is slow rather
than fast. With too long a TTL, a newly published package stays invisible after it exists. Short
TTL, and an explicit invalidation path: the same "refresh now" action settled for metadata TTLs
(was Q2).

Negative caching applies only to an authoritative not-found (404, 410). A rate-limit or server
error (429, 5xx, a timeout) is never negatively cached and is never presented to the client as
not-found: caching a Docker Hub 429 as "does not exist" would turn a throttling event into
packages vanishing for the length of the negative TTL. Rate-limit responses honour
`Retry-After`, and the authentication and throttling quirks of the preconfigured upstreams
belong to their upstream adapters - the separate adapter axis settled in
`format-handler-interface.md` (was its Q4) - never to the proxy core or the format handler.

### Offline mode

A hard mode where the cache is the whole world: every cached artifact serves, no upstream
request is ever made, and a miss fails immediately rather than hanging. This is what makes the
proxy useful for air-gapped and disaster scenarios, and it is trivially testable, which makes it
good early conformance material.

Offline mode suspends freshness, not just fetching: cached metadata serves even after its TTL
expires, because with a low-minutes default TTL an offline deployment would otherwise lose
metadata service minutes after losing the network, which is the exact scenario the mode exists
for. An expired negative-cache entry simply becomes a miss, and misses fail fast like any other.

### Interaction with GC

Cached upstream content lives in the same CAS as hosted content, so eviction and GC must agree
on what is live. A cached blob's liveness is governed by cache policy rather than by a
publishing reference, which means the GC invariant in `storage-and-gc.md` needs a second class
of reference. **That spec must land first.** Its open questions have since resolved
(mark-and-sweep with a grace period, marking from both the published and the cached roots), and
that is the shape this spec now depends on. What ends a cached reference's life - the eviction
policy Scope promises but nothing yet defines - is Q8 below, and its answer is an input to that
sweep.

## Acceptance Criteria

- [ ] AC1: A remote repository serves an artifact fetched from a configured upstream, and serves
      it from cache on the second request without contacting the upstream.
- [ ] AC2: Immutable artifacts are cached indefinitely; mutable metadata is revalidated after its
      TTL, proven by a test upstream that changes its response.
- [ ] AC3: A newly published upstream version becomes visible within the configured metadata TTL
      and, absent an explicit refresh, not before, demonstrating the TTL is actually honoured in
      both directions.
- [ ] AC4: Upstream 404s are negatively cached, and a subsequent request for the same missing
      name does not reach the upstream within the negative TTL.
- [ ] AC5: In offline mode, cached content serves (including metadata whose TTL has expired), no
      upstream request is made (asserted at the network layer, not by inspecting logs), and a
      miss fails fast.
- [ ] AC6: Upstream credentials are stored encrypted and never appear in logs, responses or error
      messages.
- [ ] AC7: Cache eviction never deletes a blob that hosted content also references, proven by a
      test where the same digest arrives from both a publish and an upstream fetch.
- [ ] AC8: Every implemented format has conformance cases in proxied mode.
- [ ] AC9: An upstream rate-limit or server error (429, 5xx) is never negatively cached and never
      surfaces to the client as not-found; the same request succeeds as soon as the upstream
      recovers, with no negative-TTL wait.
- [ ] AC10: A fetch whose bytes fail integrity verification against the coordinate's declared
      digest, or that ends before the upstream completes the body, commits nothing to the CAS
      and creates no `File` row.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | integration | `internal/proxy/cache_test.go` |
| AC2 | integration | `internal/proxy/ttl_test.go` (mutating test upstream) |
| AC3 | integration | `internal/proxy/ttl_test.go` |
| AC4 | integration | `internal/proxy/negative_cache_test.go` |
| AC5 | integration | `internal/proxy/offline_test.go` (network-level assertion) |
| AC6 | unit + integration | `internal/proxy/credentials_test.go`, plus an integration case asserting the logs and client-visible error of a real failed authenticated fetch contain no credential material |
| AC7 | property | `internal/storage/gc_property_test.go` |
| AC8 | conformance | `conformance/<format>/proxied_test.go` |
| AC9 | integration | `internal/proxy/negative_cache_test.go` (throttling test upstream) |
| AC10 | integration + fault injection | `internal/proxy/fetch_integrity_test.go` |

## Implementation Phases

### Phase 1: Fetch and cache
- Remote repository config, upstream fetch, immutable caching

### Phase 2: Policy
- TTLs, conditional revalidation, negative caching

### Phase 3: Operability
- Offline mode, encrypted upstream credentials, eviction coordinated with GC

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

The 2026-09-22 review raised Q4 through Q9 below; implementation is gated on them. The earlier
questions were answered by the owner and folded into Design and Scope above. Resolved decisions
are kept rather than deleted, so the reasoning survives the next time someone asks why it was
done this way.

### Resolved: concurrent miss coalescing (was Q4)

**Settled 2026-09-23: coalesce, single flight.** Concurrent misses on the same key wait on one
upstream fetch. A two-hundred-pod cold start pulls once rather than two hundred times, which is
what keeps the preconfigured Docker Hub upstream inside its rate limit.

Accepted cost: one slow upstream fetch now blocks every waiting client. A timeout is mandatory,
and it must fail the waiters cleanly with a real error rather than leaving them hanging.

### Resolved: revalidation failure (was Q5)

**Settled 2026-09-23: serve stale, bounded, and marked.** When cached metadata has expired and
the upstream is slow or unreachable, serve it up to a stale-if-error limit, with a response header
recording that the content is stale and how stale.

This is the decision the product's pitch rests on: a build fleet keeps working through an npm
outage, which is the single most common reason to run a caching proxy.

Accepted cost: a newly published upstream version stays invisible for longer than the TTL implies
during an outage. The staleness header exists so that is diagnosable in seconds rather than
debugged for an hour.

### Resolved: integrity verification and streaming (was Q6)

**Settled 2026-09-23: stream to the client while hashing, and commit to the CAS only if the
digest matches.** No added latency on large artifacts, and a corrupt body never enters the store.

Accepted cost: a client can receive bytes before we know the body is corrupt. The connection is
then aborted mid-stream, which the client reports as a network error rather than an integrity
failure, so the server must log the real reason and surface it to the operator. Never commit and
verify afterwards: a corrupt blob in the CAS poisons dedup-by-digest, which the entire data model
rests on.

### Resolved: upstream removal or replacement (was Q7)

**Settled 2026-09-23: purge on an explicit security signal, keep and flag otherwise.**

The owner's position is that a security removal must not keep being served, and that is correct.
The refinement is that upstream removals are not one event:

| Upstream event | Response |
|---|---|
| Explicit security signal (npm security-holding replacement, a malware advisory) | **Purge immediately and alert the operator** |
| Author unpublish with no security signal | Keep serving, record as diverged |
| PyPI yank | Keep serving. Yank explicitly means "not for new resolutions, existing pins keep working", so purging would contradict the ecosystem's own semantics |

Accepted cost: this depends on each ecosystem's security signal being detectable, and a security
removal that arrives with no clear signal falls through to keep-and-flag. The divergence flag is
therefore an operator-facing alert, not a quiet field, since it is the backstop for exactly that
case.

### Resolved: cache eviction (was Q8)

**Settled 2026-09-23: least-recently-used under a per-repository storage quota.** Cached blobs
evict when the repository exceeds its budget, least-recently-accessed first. This also gives
`storage-and-gc.md` the cached-reference lifetime its third mark root needs.

Accepted cost: access times must be tracked on the read path, and a quota set too low causes cache
thrash that presents as the proxy being slow rather than as a configuration problem. Quota
utilisation therefore has to be observable, and thrash should be detectable from metrics rather
than inferred.

### Resolved: real-upstream conformance runs (was Q9)

**Settled 2026-09-23: a separate nightly scheduled job.** The main conformance suite runs
against local stand-ins; a nightly job exercises the real npm, PyPI and Docker Hub, pairing
naturally with the client-drift job this project already specs.

Accepted cost: a break against a real upstream is found up to a day late, and nightly jobs are
easy to start ignoring once they go red. A red nightly must therefore open an issue rather than
only colouring a dashboard.

### Resolved: cache location (was Q1)

**Settled 2026-09-22: the same store, per the shared data model (#12).** A file either has a
local blob or a `RemoteFile` row pointing upstream; "cached" describes how the blob arrived. This
is Pulp's `RemoteArtifact` model, and it brings the `immediate`/`on_demand`/`streamed` policies
and multi-upstream failover with it.

Consequence carried by `storage-and-gc.md`: GC marks from two reference roots, published and
cached.

### Resolved: default metadata TTL (was Q2)

**Settled 2026-09-22: a conservative default in the low minutes**, with a per-repository
override and an explicit "refresh now" action in both UI and API, so the default never has to be
the answer to an urgent problem.

Accepted cost: more upstream traffic than a longer TTL would generate. The judgement is that a
developer who just published and cannot see their package files a bug report, while slightly
higher upstream traffic is invisible.

### Resolved: preconfigured upstreams (was Q3)

**Settled 2026-09-22: npm, PyPI and Docker Hub ship preconfigured and enabled.** "Works in
thirty seconds" is the entire pitch for a caching proxy, and a blank first-run page wastes it.

Accepted cost: their rate limits, authentication changes and protocol quirks become our support
surface. Each preconfigured upstream therefore needs conformance cases in proxied mode against
the real service, not only against a local stand-in.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-22 | afbb4e4 | adversarial + constitution + go-spec-reviewer (claim check largely vacuous pre-code; siblings and prior art verified by reading) | Corrections applied (fetched-content integrity, negative-cache classification, offline staleness, adapter-axis alignment, GC sibling sync, AC3/AC5/AC6 tightened, AC9/AC10 added); Q4-Q9 raised; stays draft. |
