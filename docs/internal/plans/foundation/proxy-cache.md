---
status: draft
status_description: "Reviewed 2026-09-23 at 3e3ae0a: the six folded decisions (Q4-Q9) were recorded but largely unapplied; now applied through Design, Scope, ACs and the Test Plan, with four interaction questions raised (Q10-Q13). Stays draft until the owner answers them."
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

So the proxy layer is not a feature, it is the thesis. The charter builds it alongside OCI at
build-order step 4 (the resolved proxy-obligation question in `project-charter.md`) - the first
proxyable format, since `generic` is exempt - precisely because retrofitting it is not possible:
it changes what content the store holds, where blobs come from, and what "this package exists"
means. npm at step 5 is then the test of whether the layer generalises, not its first consumer.

It is also the capability users actually want. The most common real deployment of an artifact
repository is not private publishing, it is *a cache in front of npm, PyPI and Docker Hub* for
build reliability, egress cost and supply-chain control.

## Scope

**In scope**

- Remote repositories: a local repository backed by a configured upstream.
- Cache policy: TTLs for mutable metadata, indefinite retention for immutable artifacts.
- **Negative caching** of upstream 404s, with a short TTL.
- **Offline mode**: serve everything cached, never contact the upstream, fail closed on a miss.
- Upstream credentials, stored encrypted, bound to the `remote` repository they belong to -
  one upstream per remote repository, so rotating a credential touches one row.
- Resolution across several upstreams by aggregating their remote repositories in a `virtual`
  repository, whose member order is the resolution order. **Failover is not a field on any
  entity** (`data-model.md`, resolved upstream and repository structure).
- Preconfigured upstreams: npm, PyPI and Docker Hub ship configured and enabled (the resolved
  preconfigured-upstreams decision below).
- Cache eviction: least-recently-used under a per-repository storage quota, coordinated with
  blob GC.
- Conformance cases in proxied mode for every format, plus a nightly scheduled job against the
  real preconfigured upstreams.

**Out of scope**

- Supply-chain policy (blocking packages by CVE or licence). Later, and it needs this first.
- Write-through proxying (publishing upstream through us). Not a use case anyone asked for.

## Design

### The distinction that governs everything

Package ecosystems have two kinds of resource and they cache completely differently:

- **Immutable artifacts** - a specific version's tarball, wheel or blob. Addressed by content or
  by an identifier that never changes meaning. Cache forever - but immutability is an upstream
  convention, not a guarantee: npm replaces malware releases with a security-holding package at
  the same version, so the same "immutable" coordinate can legitimately return different bytes.
  Cache-forever is safe only together with the integrity rules below and the settled removal
  policy: purge on an explicit security signal, keep and flag otherwise (see Upstream removal
  below).
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
valid digest *of itself*, so "digest of what arrived" is not a completion check. Verification streams (the resolved
integrity-and-streaming decision): the fetched bytes are hashed while being streamed to the
requesting client, and the CAS commit happens only on a digest match, so large artifacts pay no
added latency and a corrupt body never enters the store. A mismatch detected mid-stream aborts
the client connection, which the client reports as a network error rather than an integrity
failure - so the server must log the real reason and surface it to the operator, because the
client-side evidence is misleading by design. What the coalesced waiters of a single-flight
fetch receive under this scheme is Q10.

### Miss coalescing

Concurrent misses on the same key coalesce into one upstream fetch (the resolved
concurrent-miss decision): a two-hundred-pod cold start pulls once rather than two hundred
times, which is what keeps the preconfigured Docker Hub upstream inside its rate limit. Two
constraints follow from the decision itself rather than being new ones:

- The coalesced fetch owns its own lifecycle. It cannot be bound to the initiating client's
  request context, or that client disconnecting would cancel the fetch for every waiter; it
  carries the mandatory timeout the decision requires, and on timeout every waiter fails
  promptly with a real error rather than hanging.
- Coalescing interacts with stream-and-verify: verification completes only at end of body, so
  what waiters receive while the flight is unverified, and what happens to them when it fails
  verification or times out midway, is a real design decision - Q10.

### Revalidation failure: serve stale, bounded and marked

When cached metadata has expired and the upstream is slow, erroring or unreachable, the cached
copy keeps serving up to a stale-if-error limit, and every such response carries a header
recording that it is stale and by how much (the resolved revalidation-failure decision). This is
the behaviour the product pitch rests on: a build fleet keeps working through an npm outage.
Beyond the limit, the failed revalidation becomes an error to the client rather than unbounded
staleness. The header makes the accepted cost - a newly published version staying invisible
longer than the TTL implies - diagnosable in seconds rather than debugged for an hour.

Serving stale also means serving blind: while the upstream is unreachable, no security signal
can arrive, so content purged upstream keeps serving locally until connectivity returns. The
stale-if-error limit is therefore also the bound on that exposure window, which is part of what
Q12 asks the owner to weigh.

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

### Upstream removal or replacement

Upstream removals are not one event, and the settled policy (the resolved upstream-removal
decision) distinguishes them: an explicit security signal (npm's security-holding replacement, a
malware advisory) purges the cached content immediately and alerts the operator; an author
unpublish with no security signal keeps serving and records the divergence; a PyPI yank keeps
serving, because yank means "not for new resolutions, existing pins keep working" and purging
would contradict the ecosystem's own semantics. The divergence flag is an operator-facing alert,
not a quiet field, because it is the backstop for a security removal that arrives without a
detectable signal.

How a security signal is detected in the first place - only when a client request happens to
trigger revalidation of that metadata, or actively - is Q12, and the answer decides whether a
purge can ever happen for content nobody is currently requesting.

### Interaction with GC

Cached upstream content lives in the same CAS as hosted content, so eviction and GC must agree
on what is live. A cached blob's liveness is governed by cache policy rather than by a
publishing reference, which means the GC invariant in `storage-and-gc.md` needs a second class
of reference. **That spec must land first.** Its open questions have since resolved
(mark-and-sweep with a grace period, a deletion-intent table as the write barrier, and marking
from four roots: published references, cached references, snapshots inside the retention
window, and CAS-backed metadata documents), and that is the shape this spec now depends on.
The fourth root exists because of this spec: a proxied repository's current index document - a
Debian-scale `Release` file above the inline size threshold - is a CAS blob that no `File` row
references, and a three-root sweep would have collected it while it was being served. A proxied
repository produces no snapshots, so that document is protected by the current-document half of
the root and by nothing else.

What ends a cached reference's life is settled (the resolved cache-eviction decision): cached
content evicts least-recently-used when its repository exceeds a per-repository storage quota.
Access times are therefore tracked on the read path, quota utilisation is observable, and cache
thrash - a quota set too low presenting as the proxy being slow - must be detectable from
metrics rather than inferred. Eviction supplies the sweep's cached-reference lifetime; whether
eviction removes only the reference and leaves blob reclamation to the GC sweep, or deletes the
blob itself, is Q11, and so is its ordering against a concurrent fetch of the same content.

### Conformance against real upstreams

The main conformance suite runs against local stand-ins; a separate nightly scheduled job runs
the proxied suites against the real preconfigured upstreams (the resolved real-upstream
decision), covering each of npm, PyPI and Docker Hub once its format ships - at build-order
step 4 that is Docker Hub alone. A red nightly opens an issue carrying the failing evidence
rather than only colouring a dashboard, because a scheduled job that can go quietly red is a job
that gets ignored. This pairs with the client-drift job in `conformance-harness.md`. It does not
conflict with offline mode, which is a deployment posture rather than a test environment:
offline-mode cases assert that no upstream request is made and never touch a real upstream by
construction.

### Obligation to the handler interface

`format-handler-interface.md` settles that on a proxied miss **the handler calls a fetch-and-cache
API**, and names this spec as the owner of that API's shape. **This spec must define it before
OCI's proxied phase begins**, since OCI is now the first proxied format under the build-with-OCI
order.

Recorded as an obligation rather than left implicit because the reviewer found it dangling: the
interface spec points here, and nothing here pointed back. A cross-spec dependency that exists in
one direction only is how a Phase 4 discovers it has no counterparty.

## Acceptance Criteria

- [ ] AC1: A remote repository serves an artifact fetched from a configured upstream, and serves
      it from cache on the second request without contacting the upstream.
- [ ] AC2: Immutable artifacts are cached indefinitely; mutable metadata is revalidated after its
      TTL, proven by a test upstream that changes its response.
- [ ] AC3: With the upstream reachable, a newly published upstream version becomes visible
      within the configured metadata TTL and, absent an explicit refresh, not before,
      demonstrating the TTL is actually honoured in both directions.
- [ ] AC4: Upstream 404s are negatively cached, and a subsequent request for the same missing
      name does not reach the upstream within the negative TTL.
- [ ] AC5: In offline mode, cached content serves (including metadata whose TTL has expired), no
      upstream request is made (asserted at the network layer, not by inspecting logs), and a
      miss fails fast.
- [ ] AC6: Upstream credentials are stored encrypted and never appear in logs, responses or error
      messages.
- [ ] AC7: Cache eviction never deletes a blob that hosted content also references, proven by a
      test where the same digest arrives from both a publish and an upstream fetch.
- [ ] AC8: Every implemented format whose `Capabilities()` declares proxy support has
      conformance cases in proxied mode; a declared unsupported capability is the only
      exemption, and `generic` is the only format that currently holds one.
- [ ] AC9: An upstream rate-limit or server error (429, 5xx) is never negatively cached and never
      surfaces to the client as not-found; the same request succeeds as soon as the upstream
      recovers, with no negative-TTL wait.
- [ ] AC10: A fetch whose bytes fail integrity verification against the coordinate's declared
      digest, or that ends before the upstream completes the body, commits nothing to the CAS
      and attaches no local `Blob` or cached-reference state to the `File`; any pre-existing
      `File` and `RemoteFile` metadata remains available for a later retry. A mismatch detected
      mid-stream aborts the client connection and the server records the real failure reason
      observably to the operator, not only as a client-side network error.
- [ ] AC11: N concurrent requests for the same uncached artifact produce exactly one upstream
      fetch (asserted at the network layer), and when that fetch exceeds its timeout every
      coalesced waiter receives an error promptly rather than hanging.
- [ ] AC12: Expired cached metadata with an unreachable upstream keeps serving up to the
      stale-if-error limit, with a header marking each such response stale and by how much;
      beyond the limit the request fails rather than serving unbounded staleness.
- [ ] AC13: An upstream response carrying the ecosystem's explicit security signal purges the
      cached content and raises an operator alert; an author unpublish without a signal, and a
      PyPI yank, keep serving and record an operator-visible divergence.
- [ ] AC14: A repository exceeding its storage quota evicts least-recently-accessed cached
      content until it is back within quota, an evicted artifact is transparently re-fetched on
      the next request, and quota utilisation is observable without reading logs.
- [ ] AC15: The nightly real-upstream job runs the proxied suites of the shipped preconfigured
      upstreams and opens an issue on failure, demonstrated by a manual dispatch against a
      deliberately failing fixture.

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
| AC11 | integration | `internal/proxy/singleflight_test.go` (network-level assertion) |
| AC12 | integration | `internal/proxy/stale_test.go` |
| AC13 | integration | `internal/proxy/upstream_removal_test.go` (test upstream presenting each event class) |
| AC14 | integration | `internal/proxy/eviction_test.go` |
| AC15 | ci | scheduled nightly workflow, proven by a written manual-dispatch procedure |

## Implementation Phases

Built alongside the OCI handler at charter build-order step 4; OCI's proxied conformance suite
is this layer's first proving ground, and npm at step 5 tests whether it generalises.

### Phase 1: Fetch and cache
- Remote repository config, upstream fetch, immutable caching, single-flight miss coalescing,
  stream-and-verify with commit on digest match

### Phase 2: Policy
- TTLs, conditional revalidation, negative caching, serve-stale bounded and marked

### Phase 3: Operability
- Offline mode, encrypted upstream credentials, LRU eviction under per-repository quota
  coordinated with GC, security-signal purge and divergence flagging, the nightly
  real-upstream job

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

The 2026-09-23 review pass raised Q10 through Q13 below, each an interaction between decisions
that were settled individually; implementation is gated on them. All earlier questions (Q1-Q9)
were answered by the owner and are folded into Design, Scope and the acceptance criteria above.
Resolved decisions are kept rather than deleted, so the reasoning survives the next time someone
asks why it was done this way.

### Q10: What do coalesced waiters receive while the single in-flight fetch is still unverified?

**Recommendation:** B - waiters get bytes only after verified commit, so only the initiating
client ever streams unverified content. It keeps the corrupt-body blast radius to one client and
makes the waiter path identical to a cache hit, at the cost of waiter latency.

| Option | You get | It costs |
|---|---|---|
| **A. Tee the unverified stream to all waiters** | Every client starts receiving immediately; lowest latency on large artifacts | A corrupt or truncated body aborts every waiter mid-stream at once, and their retries arrive together against an upstream that just failed |
| **B. Waiters wait for verified commit, then serve from the CAS** | Waiters only ever see verified bytes; retry semantics stay simple | Waiters gain latency up to the full download time, so the coalescing timeout doubles as their latency bound |

**Why this is yours:** it is a latency-versus-blast-radius trade on the product's hottest path
(a CI fleet cold-starting against a preconfigured upstream), and both options honour the settled
decisions; only you can price mass mid-stream aborts against added waiter latency.

### Q11: Does eviction delete the cached reference and leave the blob to GC, or delete the blob itself?

**Recommendation:** A - eviction ends the reference only, and the deletion-intent sweep in
`storage-and-gc.md` reclaims the blob. Eviction then needs no deletion safety machinery of its
own, and AC7 falls out of GC's existing invariant instead of being proved twice.

| Option | You get | It costs |
|---|---|---|
| **A. Reference-only eviction; the GC sweep reclaims the blob** | One deletion path in the system: the write barrier, grace period and shared-blob safety are inherited, and a re-fetch between eviction and sweep dedup-hits the still-present blob for free | Quota relief is delayed until the next sweep, so the quota must be accounted against referenced bytes rather than stored bytes, and physical space frees eventually rather than immediately |
| **B. Eviction deletes the blob directly** | Physical space frees immediately when the quota is hit | A second deletion path that must reimplement the intent-table check, the concurrent-fetch race and the hosted-reference check, in the component the charter names as how this project eats data |

**Why this is yours:** it decides whether the quota bounds logical or physical storage and
whether `storage-and-gc.md` gains a consumer or a competitor; that is an architecture call
spanning two critical specs.

### Q12: How is an upstream security signal detected for content nobody is currently requesting?

**Recommendation:** A for v1, with the exposure stated plainly in the docs: purge-on-signal
fires only on revalidation, so it protects actively requested packages, and the operator alert
plus divergence flag are the backstop. Active scanning is a later feature with its own spec.

| Option | You get | It costs |
|---|---|---|
| **A. Passive: a signal is noticed when TTL revalidation of that metadata happens** | No new machinery; detection falls out of the existing revalidation path | A cached package whose metadata nobody re-requests is never purged, and during a serve-stale outage nothing is detected at all, for up to the stale-if-error limit |
| **B. Active: a background job re-checks cached packages against the upstream or an advisory feed** | Bounded detection latency independent of request traffic; outage exposure ends when connectivity returns rather than when a client next asks | A per-ecosystem advisory integration or a polling fleet against rate-limited upstreams, which the preconfigured trio turns into an immediate support surface |

**Why this is yours:** it sets the product's actual security guarantee - "purged when noticed"
versus "purged within N hours" - and that is a claim the product will be held to, not an
implementation detail.

### Q13: Is offline mode instance-wide, or scoped per upstream or per repository?

**Recommendation:** A - instance-wide for v1. The air-gap and disaster scenarios the mode
exists for are whole-deployment states, one switch is trivially testable, and per-repository
staleness tolerance is already covered by the TTL override and the serve-stale bound.

| Option | You get | It costs |
|---|---|---|
| **A. Instance-wide switch** | Matches the air-gap use case exactly; one flag, one behaviour to test; the preconfigured, enabled-by-default upstreams cannot leak egress from an air-gapped install | An outage of one upstream cannot be answered by taking only that upstream offline; the operator relies on serve-stale instead |
| **B. Per-repository or per-upstream setting** | Selective degradation during a single upstream's outage | A "mostly offline" instance retains egress paths the operator must find and disable one by one, which is exactly the audit surface an air gap exists to remove |

**Why this is yours:** it defines what "offline" promises an air-gapped deployment and whether
that promise is auditable from one setting; that is a product guarantee, not something the
fleet can measure its way to.

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
`storage-and-gc.md` the cached-reference lifetime its second mark root needs.

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

**Settled 2026-09-22: the same store, per the shared data model (#12).** A file may have a local
blob, one or more `RemoteFile` rows pointing upstream, or both; "cached" describes how the blob
arrived. Remote rows survive cache materialisation so revalidation and failover retain their
provenance. This is Pulp's `RemoteArtifact` model, and it brings the
`immediate`/`on_demand`/`streamed` policies and multi-upstream failover with it.

Consequence carried by `storage-and-gc.md`: GC marks from three reference roots, published,
cached and retained snapshots.

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
| 2026-09-24 | d078c46 | cross-spec consistency (storage-and-gc's fourth mark root) | Not a review. The GC-interaction section still described a three-root sweep and credited cached references as the third root rather than the second. Corrected to the canonical four, and the fourth root's motivating case recorded here where it originates: a proxied repository's current index document is a CAS blob no `File` row references, and it produces no snapshots, so the current-document half of that root is all that protects it. Q11 remains open and still bears on the cached-reference root. |
| 2026-09-22 | afbb4e4 | adversarial + constitution + go-spec-reviewer (claim check largely vacuous pre-code; siblings and prior art verified by reading) | Corrections applied (fetched-content integrity, negative-cache classification, offline staleness, adapter-axis alignment, GC sibling sync, AC3/AC5/AC6 tightened, AC9/AC10 added); Q4-Q9 raised; stays draft. |
| 2026-09-23 | 3e3ae0a | folded-decision application + decision-interaction adversarial + constitution + go-spec-reviewer (claim verification against code vacuous pre-implementation; siblings re-read at this sha) | The six 09-23 decisions were recorded but not applied: stale Q6/Q7/Q8 references and the two-root GC claim in Design fixed, Design gained coalescing/serve-stale/removal/eviction/nightly sections, Scope, Context and Phases updated for build-with-OCI, AC3/AC10 tightened, AC11-AC15 added with Test Plan rows; Q10-Q13 raised on interactions between the settled decisions; stays draft. |
| 2026-09-23 | 9c971d4 | cross-spec consistency (data model, generic exemption, GC roots) | AC8 now applies to proxy-capable formats, AC10 preserves pre-existing remote metadata on a failed fetch, the resolved cache-location text names all three GC roots, and cached files retain remote provenance; existing open questions still keep the spec draft. |
