---
status: draft
status_description: "Folded 2026-09-26 at 4d1aeb1: Q10, Q12 and Q13 adopted under the owner's standing delegation, so no question is open. Waiters are served from the CAS after the verified commit, with the coalescing timeout now a stall timeout; this layer detects security signals passively and never polls, the advisory feed in supply-chain-policy.md being the active channel; offline mode is one instance-wide switch. The security-signal rule is now stated verbatim here and in supply-chain-policy.md: the owner's purge stands for either channel and means ending cached references, with a condemnation record and refusal before any upstream fetch. AC5, AC11 and AC13 rewritten, AC17 and AC18 added, 18 criteria all mapped; stays draft pending a gate review."
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
- **Offline mode**: one instance-wide switch (the resolved offline-scope question). Serve
  everything cached, never contact any upstream, fail closed on a miss.
- Single-flight miss coalescing in which only the initiating client streams unverified bytes;
  coalesced waiters are served from the CAS after the verified commit (the resolved
  coalesced-waiter question).
- The security-signal rule shared verbatim with `supply-chain-policy.md`: the condemnation
  record, refusal before any upstream fetch, the purge as ending cached references, and the
  upstream channel as the record's first source. This layer's own detection is passive (the
  resolved signal-detection question): it notices a signal on revalidation and never polls an
  upstream in the background.
- Upstream credentials, stored encrypted, bound to the `remote` repository they belong to -
  one upstream per remote repository, so rotating a credential touches one row.
- Resolution across several upstreams by aggregating their remote repositories in a `virtual`
  repository, whose member order is the resolution order. **Failover is not a field on any
  entity** (`data-model.md`, resolved upstream and repository structure).
- Preconfigured upstreams: npm, PyPI and Docker Hub ship configured and enabled (the resolved
  preconfigured-upstreams decision below).
- Cache eviction: least-recently-used under a per-repository storage quota, ending the cached
  reference only. Eviction deletes no object; the deletion-intent sweep in `storage-and-gc.md`
  reclaims the blob, so the quota accounts referenced bytes rather than stored bytes (the
  resolved eviction-mechanics question below).
- Conformance cases in proxied mode for every format, plus a nightly scheduled job against the
  real preconfigured upstreams.

**Out of scope**

- Supply-chain policy (blocking packages by CVE or licence, the advisory feed, scanning). Owned
  by `supply-chain-policy.md`, which needs this first; it extends this layer's condemnation
  record with the advisory feed as a second channel rather than building a second mechanism.
- Active detection of security signals for content nobody requests. It is delivered by the
  advisory feed in `supply-chain-policy.md`, not by polling upstreams from this layer.
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
client-side evidence is misleading by design. Only the initiating client is exposed to that:
the coalesced waiters of a single-flight fetch receive bytes only from the CAS after the verified
commit (the resolved coalesced-waiter question, under Miss coalescing below).

### Miss coalescing

Concurrent misses on the same key coalesce into one upstream fetch (the resolved
concurrent-miss decision): a two-hundred-pod cold start pulls once rather than two hundred
times, which is what keeps the preconfigured Docker Hub upstream inside its rate limit. Two
constraints follow from the decision itself rather than being new ones:

- The coalesced fetch owns its own lifecycle. It cannot be bound to the initiating client's
  request context, or that client disconnecting would cancel the fetch for every waiter; it
  carries the mandatory timeout the decision requires, and on timeout every waiter fails
  promptly with a real error rather than hanging.
- Coalescing interacts with stream-and-verify: verification completes only at end of body.
  Waiters therefore receive nothing while the flight is unverified, and are served from the CAS
  once the verified commit lands, exactly as a cache hit would be (the resolved coalesced-waiter
  question). Only the initiating client ever streams unverified bytes, so a corrupt or truncated
  body aborts one client, not the whole cold start; when the flight fails verification or times
  out, every waiter receives a real error having received no byte, and their retries meet a
  clean miss.
- Because waiters now wait for the full download, the mandatory timeout is measured as upstream
  **stall** (no bytes received for the timeout period), not total duration, or every
  sufficiently large artifact would time out all its waiters by construction. The timeout is
  still the waiters' latency bound in the sense that matters: a hung upstream fails them
  promptly.

Under `supply-chain-policy.md`'s refuse-until-scanned setting, the initiating client joins the
waiters: the fetch commits, the scan runs, and every client is then served from the CAS or
receives the policy refusal. That is this waiter path with one step inserted, not a second path.

### Revalidation failure: serve stale, bounded and marked

When cached metadata has expired and the upstream is slow, erroring or unreachable, the cached
copy keeps serving up to a stale-if-error limit, and every such response carries a header
recording that it is stale and by how much (the resolved revalidation-failure decision). This is
the behaviour the product pitch rests on: a build fleet keeps working through an npm outage.
Beyond the limit, the failed revalidation becomes an error to the client rather than unbounded
staleness. The header makes the accepted cost - a newly published version staying invisible
longer than the TTL implies - diagnosable in seconds rather than debugged for an hour.

Serving stale also means serving blind on this layer's own channel: while the upstream is
unreachable, no upstream security signal can arrive, so content purged upstream keeps serving
locally until connectivity returns. The stale-if-error limit is therefore also the bound on that
exposure window for the upstream channel. The advisory feed in `supply-chain-policy.md` is the
independent channel that keeps working through an upstream outage, and once it is in place a
malware advisory condemns the content under the security-signal rule below whether or not the
upstream is reachable (the resolved signal-detection question).

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
request is ever made, and a miss fails immediately rather than hanging. It is **one
instance-wide switch** (the resolved offline-scope question): switching it on takes every remote
repository offline at once, the preconfigured upstreams included, and there is no per-repository
or per-upstream offline setting, so an air-gapped operator audits one setting rather than
hunting remaining egress paths repository by repository. The same switch suspends the advisory
feed's network sync in `supply-chain-policy.md`, which keeps its data current offline through a
local bulk import instead. An outage of a single upstream is answered by serve-stale, not by
taking that upstream offline. This is what makes the
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

A malware advisory can reach this registry through two channels: the upstream, observed here on
revalidation, and the advisory feed in `supply-chain-policy.md`. The two specs therefore state
one rule, verbatim in both (`supply-chain-policy.md`, resolved condemned-artifact disposition):

> **The security-signal rule.** A security signal is either an explicit upstream security signal
> observed on revalidation (npm's security-holding replacement, PyPI's PEP 792 `quarantined`
> status) or a malware advisory from the advisory feed (for example OSV's `MAL-` malicious-package
> entries). Whichever channel delivers it, the signal condemns the coordinate it names in every
> remote repository of that ecosystem, whether or not the repository has a policy attached, with
> one response: every resolution of the coordinate is refused from that moment with an error
> naming the signal, and no upstream fetch of it is made; every cached reference to its content
> ends at once, which is the purge, and the deletion-intent sweep reclaims the bytes, so the purge
> itself deletes no object; a refusal record naming the coordinate, the digests it held and each
> source is written, and it outlives the bytes; and the operator is alerted once. When the same
> signal arrives through the second channel, it adds its source to the existing condemnation and
> does nothing else: no second purge, no second alert. The condemnation lifts only when every
> source that asserted it has withdrawn, and lifted content is fetched again on demand like any
> first fetch. Hosted content is never condemned by a security signal; a hosted repository's own
> policy decides, as it does for any advisory. A condemnation that is not a security signal - a
> vulnerability above a repository's threshold, a licence violation - never purges: the content
> is refused and retained, and the refusal lifts in place when the advisory is withdrawn or the
> rule changes.

What that makes "purge" mean in this storage model follows from the resolved eviction-mechanics
question: the purge ends every cached reference to the condemned content, exactly as eviction
does, and deletes no object, so it is held by `storage-and-gc.md` AC15 like eviction and adds no
deletion path. The content is unservable immediately because the coordinate is refused at
resolution; the bytes leave the store at the next sweep, and not at all while hosted content
still references the same digest. The condemnation record (coordinate, the digests it held, each
source with its time) is built here, with the upstream channel as its first source, and the
fetch-and-cache entry consults it before any upstream request, so a purged coordinate is never
fetched again while condemned. The record is written before the references end, so a request
arriving between the two finds the coordinate already refused rather than re-fetching it. `supply-chain-policy.md` adds the advisory feed as the second
source on the same record and generalises the check into policy evaluation rather than adding a
second one. This amends only the mechanics of the owner's settled purge rule, not its outcome:
security-signalled content still stops serving at once and is removed from the store.

**This layer detects signals passively** (the resolved signal-detection question). A signal is
noticed when TTL revalidation of that metadata happens, driven by a client request or by a
configured sync, and never by a background job polling the upstream, which against the
rate-limited preconfigured trio would be an immediate support surface. The exposure is stated
plainly in the operator documentation: on this channel alone, a cached package whose metadata
nobody re-requests is never condemned, and during a serve-stale outage nothing is detected for
up to the stale-if-error limit. The active channel is the advisory feed in
`supply-chain-policy.md`, which re-matches every new advisory against stored coordinates at sync
time; that is the "later feature with its own spec" this decision anticipated, and with it a
malware advisory condemns content nobody is requesting within a feed sync interval.

### Interaction with GC

Cached upstream content lives in the same CAS as hosted content, so eviction and GC must agree
on what is live. A cached blob's liveness is governed by cache policy rather than by a
publishing reference, which means the GC invariant in `storage-and-gc.md` needs a second class
of reference. **That spec must land first.** Its open questions have since resolved
(mark-and-sweep with a grace period, a deletion-intent table as the write barrier, and marking
from five roots: published references, cached references, snapshots inside the retention
window, CAS-backed metadata documents, and snapshots a `Pointer` targets), and that is the shape
this spec now depends on.
The fourth root exists because of this spec: a proxied repository's current index document - a
Debian-scale `Release` file above the inline size threshold - is a CAS blob that no `File` row
references, and a three-root sweep would have collected it while it was being served. A proxied
repository produces no snapshots, so that document is protected by the current-document half of
the root and by nothing else.

What ends a cached reference's life is settled (the resolved cache-eviction decision): cached
content evicts least-recently-used when its repository exceeds a per-repository storage quota.
Access times are therefore tracked on the read path, quota utilisation is observable, and cache
thrash - a quota set too low presenting as the proxy being slow - must be detectable from
metrics rather than inferred.

**Eviction ends the reference and deletes nothing** (the resolved eviction-mechanics question).
It removes the cached reference; the blob is reclaimed by the deletion-intent sweep like any
other unreferenced blob, so eviction is not a second deletion path and needs no write barrier,
grace period or shared-blob check of its own - `storage-and-gc.md` AC15's architecture test
holds it to that, and this spec's AC7 falls out of the sweep's invariant rather than being
proved twice. The security-signal purge is the same operation applied to condemned content, so
it inherits all of this and adds no mark root: condemnation records reference content by digest
and coordinate as provenance that outlives the bytes, and never mark a blob live.

Two behavioural consequences follow, and they are Design-level rather than bookkeeping:

- **The quota accounts referenced bytes, not stored bytes.** A repository returns to within
  quota the moment eviction removes enough references, while the physical space frees on the
  next sweep. Quota utilisation, and the reporting behind AC14, are therefore measured over
  bytes the repository still references; an operator watching the object store will see it lag.
- **A re-fetch between eviction and the sweep costs no storage.** The evicted content has no
  local blob, so a request re-fetches upstream, but the CAS commit dedup-hits the blob that is
  still present and cancels any standing deletion intent through the shared reference-creation
  call. That is also the ordering answer against a concurrent fetch: the intent barrier already
  serialises it, with no eviction-specific mechanism.

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
- [ ] AC5: Offline mode is one instance-level setting and the configuration surface offers no
      per-repository or per-upstream offline flag. With it switched on, cached content serves
      (including metadata whose TTL has expired), no remote repository, the preconfigured
      upstreams included, makes an upstream request (asserted at the network layer, not by
      inspecting logs), and a miss fails fast.
- [ ] AC6: Upstream credentials are stored encrypted and never appear in logs, responses or error
      messages.
- [ ] AC7: Cache eviction deletes no object at all: it removes the cached reference and leaves
      reclamation to the sweep, so a blob that hosted content also references keeps serving,
      proven by a test where the same digest arrives from both a publish and an upstream fetch
      and the hosted path still serves it after the evicting repository's sweep has run.
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
      fetch (asserted at the network layer), and when that fetch stalls past its timeout every
      coalesced waiter receives an error promptly rather than hanging, while a fetch that keeps
      making progress is not cut off by total duration.
- [ ] AC12: Expired cached metadata with an unreachable upstream keeps serving up to the
      stale-if-error limit, with a header marking each such response stale and by how much;
      beyond the limit the request fails rather than serving unbounded staleness.
- [ ] AC13: An upstream response carrying the ecosystem's explicit security signal condemns the
      coordinate under the security-signal rule in every remote repository of that ecosystem,
      one that never observed the signal included, while a hosted repository holding the same
      coordinate keeps serving: every cached reference to its content ends at once with no object deleted by the purge itself, the next request for it is refused with
      an error naming the signal and makes no upstream request (asserted at the network layer),
      a refusal record naming the coordinate, its digests and the source remains queryable after
      the sweep has reclaimed the bytes, and exactly one operator alert is raised however many
      revalidations observe the signal. An author unpublish without a signal, and a PyPI yank,
      keep serving and record an operator-visible divergence.
- [ ] AC14: A repository exceeding its storage quota evicts least-recently-accessed cached
      content until the bytes it still references are back within quota - without waiting for a
      GC sweep, since the quota accounts referenced bytes - an evicted artifact is transparently
      re-fetched on the next request, and quota utilisation is observable without reading logs.
- [ ] AC16: An artifact evicted but not yet swept is re-fetched and re-referenced with no second
      stored object and no second upload of the bytes, and the object store shows no delete
      performed by eviction itself; the blob disappears only after the next sweep, and only if
      nothing referenced it again in the meantime.
- [ ] AC15: The nightly real-upstream job runs the proxied suites of the shipped preconfigured
      upstreams and opens an issue on failure, demonstrated by a manual dispatch against a
      deliberately failing fixture.
- [ ] AC17: While a coalesced fetch is unverified, only the initiating client receives bytes:
      every waiter receives its first byte after the verified CAS commit and is served from the
      CAS, and a fetch that fails verification or is truncated gives every waiter an error with
      zero bytes received, the initiating client alone seeing a mid-stream abort.
- [ ] AC18: This layer never polls an upstream in the background: with no client traffic and no
      configured sync, a remote repository makes no upstream request across several metadata
      TTLs (asserted at the network layer), and an upstream security signal is acted on at the
      first revalidation that observes it.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | integration | `internal/proxy/cache_test.go` |
| AC2 | integration | `internal/proxy/ttl_test.go` (mutating test upstream) |
| AC3 | integration | `internal/proxy/ttl_test.go` |
| AC4 | integration | `internal/proxy/negative_cache_test.go` |
| AC5 | unit + integration | `internal/proxy/offline_test.go` (network-level assertion across every remote repository including the preconfigured upstreams), plus a configuration-schema test asserting no per-repository or per-upstream offline field exists |
| AC6 | unit + integration | `internal/proxy/credentials_test.go`, plus an integration case asserting the logs and client-visible error of a real failed authenticated fetch contain no credential material |
| AC7 | property | `internal/storage/gc_property_test.go` |
| AC8 | conformance | `conformance/<format>/proxied_test.go` |
| AC9 | integration | `internal/proxy/negative_cache_test.go` (throttling test upstream) |
| AC10 | integration + fault injection | `internal/proxy/fetch_integrity_test.go` |
| AC11 | integration | `internal/proxy/singleflight_test.go` (network-level assertion; stalled upstream versus a slow but progressing one) |
| AC12 | integration | `internal/proxy/stale_test.go` |
| AC13 | integration | `internal/proxy/upstream_removal_test.go` (test upstream presenting each event class; a second remote repository of the same ecosystem and a hosted repository holding the same coordinate; network-level no-fetch assertion, record queried after a sweep, alert count across repeated revalidations) |
| AC14 | integration | `internal/proxy/eviction_test.go` |
| AC15 | ci | scheduled nightly workflow, proven by a written manual-dispatch procedure |
| AC16 | integration | `internal/proxy/eviction_test.go` (re-fetch between eviction and sweep, object-store delete assertion) |
| AC17 | integration + fault injection | `internal/proxy/singleflight_test.go` (per-client byte timelines against the commit, corrupt and truncated upstream bodies) |
| AC18 | integration | `internal/proxy/passive_detection_test.go` (injected clock across several TTLs with no traffic, network-level assertion, then one request revalidating into a signal) |

## Implementation Phases

Built alongside the OCI handler at charter build-order step 4; OCI's proxied conformance suite
is this layer's first proving ground, and npm at step 5 tests whether it generalises.

### Phase 1: Fetch and cache
- Remote repository config, upstream fetch, immutable caching, single-flight miss coalescing
  with a stall timeout and waiters served from the CAS after the verified commit,
  stream-and-verify with commit on digest match for the initiating client

### Phase 2: Policy
- TTLs, conditional revalidation, negative caching, serve-stale bounded and marked

### Phase 3: Operability
- Instance-wide offline mode, encrypted upstream credentials, LRU eviction under per-repository
  quota ending the cached reference only with reclamation left to the GC sweep, the
  security-signal rule's upstream channel (the condemnation record, the purge as ending cached
  references, refusal before any upstream fetch, one alert per condemnation) with passive
  detection and its exposure stated in the operator documentation, divergence flagging, the
  nightly real-upstream job

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None remain open. The 2026-09-23 review pass raised Q10 through Q13, each an interaction
between decisions that were settled individually. Q11 (eviction mechanics) was answered by the
owner on 2026-09-26; Q10, Q12 and Q13 were adopted the same day under the owner's standing
delegation and are reversible by the owner. All four are folded into Design, Scope, the
acceptance criteria and the Test Plan above. All earlier questions (Q1-Q9) were answered by the
owner and are folded into Design, Scope and the acceptance criteria above.
Resolved decisions are kept rather than deleted, so the reasoning survives the next time someone
asks why it was done this way.

### Resolved: what coalesced waiters receive (was Q10)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: waiters receive bytes
only from the CAS after the verified commit, so only the initiating client ever streams
unverified content. Folded into Scope, the integrity and coalescing sections of Design (with the
stall-timeout consequence and the refuse-until-scanned composition), AC11, AC17 and Phase 1.

Accepted cost: waiters gain latency up to the full download time. That forced one derived
change, recorded in Design rather than as a new question: the mandatory timeout is measured as
upstream stall rather than total duration, since otherwise a large artifact would time out every
waiter by construction. Option A lost because it turns one corrupt or truncated body into a mass
mid-stream abort whose retries arrive together against an upstream that just failed, on the
product's hottest path; B also gives `supply-chain-policy.md`'s refuse-until-scanned setting a
path to reuse instead of a third one.

What do coalesced waiters receive while the single in-flight fetch is still unverified?

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

### Resolved: detecting a security signal for content nobody requests (was Q12)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: this layer detects
upstream security signals passively, on TTL revalidation, and never polls an upstream in the
background; the exposure is stated in the operator documentation. The "later feature with its
own spec" the recommendation anticipated exists: `supply-chain-policy.md`'s advisory feed is the
active channel, re-matching new advisories against stored coordinates at sync time, and it
condemns through the same security-signal rule, so content nobody requests is condemned within
a feed sync interval once that spec lands. Folded into Scope, the serve-stale and
upstream-removal sections of Design, AC13, AC18 and Phase 3.

Accepted cost: until `supply-chain-policy.md` lands, and on the upstream channel alone after it,
a cached package whose metadata nobody re-requests is never condemned, and a serve-stale outage
detects nothing for up to the stale-if-error limit. Option B lost in its polling form because a
background fleet against rate-limited preconfigured upstreams is an immediate support surface,
and its advisory-feed form is exactly what `supply-chain-policy.md` builds, so building it here
would be building it twice.

How is an upstream security signal detected for content nobody is currently requesting?

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

### Resolved: offline mode scope (was Q13)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: offline mode is one
instance-wide switch, with no per-repository or per-upstream setting, and it also suspends the
advisory feed's network sync in `supply-chain-policy.md`. Folded into Scope, the offline-mode
section of Design, AC5 and Phase 3; the advisory-feed consequence is carried by
`supply-chain-policy.md` (its resolved offline-freshness question and AC16).

Accepted cost: an outage of one upstream cannot be answered by taking only that upstream
offline, so the operator relies on serve-stale instead. Option B lost because a mostly-offline
instance keeps egress paths the operator must find and close one by one, which is the audit
surface an air gap exists to remove.

Is offline mode instance-wide, or scoped per upstream or per repository?

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

### Resolved: cache eviction mechanics (was Q11)

**Settled 2026-09-26: eviction ends the cached reference only, and the deletion-intent sweep in
`storage-and-gc.md` reclaims the blob.** Eviction is therefore **not** a second deletion path
and needs no deletion safety machinery of its own: the write barrier, the repository-scoped
grace period and the shared-blob check are all inherited, AC7 falls out of the sweep's invariant
rather than being proved twice, and `storage-and-gc.md` AC15 keeps the single-deleter boundary
intact. The concurrent-fetch ordering the question also asked about is answered by the same
inheritance: a re-fetch goes through the shared reference-creation call, which cancels any
standing intent, so no eviction-specific ordering rule exists. Folded into Scope, the
GC-interaction section of Design, AC7, AC14 and the new AC16.

**Accepted cost: quota relief waits for the next sweep, so the quota accounts referenced bytes
rather than stored bytes**, and physical space frees eventually rather than immediately. A
repository is back within quota as soon as enough references are gone, while an operator
watching the object store sees it lag by up to a sweep interval - which is a real behaviour to
document, not only an internal detail.

The benefit that comes with it: a re-fetch between eviction and the sweep dedup-hits the
still-present blob, so the bytes are not stored twice and the round trip costs only the upstream
fetch. Option B (eviction deletes the blob directly) would have freed space immediately at the
price of a second deletion path reimplementing the intent check, the concurrent-fetch race and
the hosted-reference check, in the component the charter names as how this project eats data.

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

Extended 2026-09-26, outcome unchanged. The eviction-mechanics resolution fixes what "purge"
means in this storage model: every cached reference ends at once and the sweep reclaims the
bytes, so the purge deletes no object itself. `supply-chain-policy.md`'s resolved
condemned-artifact disposition adds the advisory feed as a second channel for the same event,
and the two specs share one security-signal rule verbatim (Design, Upstream removal or
replacement). That spec's written recommendation would have turned this purge into
refuse-and-retain; it was not adopted in that form, because it would have reversed this owner
decision, and the purge stands for security signals from either channel.

### Resolved: cache eviction (was Q8)

**Settled 2026-09-23: least-recently-used under a per-repository storage quota.** Cached blobs
evict when the repository exceeds its budget, least-recently-accessed first. This also gives
`storage-and-gc.md` the cached-reference lifetime its second mark root needs.

Accepted cost: access times must be tracked on the read path, and a quota set too low causes cache
thrash that presents as the proxy being slow rather than as a configuration problem. Quota
utilisation therefore has to be observable, and thrash should be detectable from metrics rather
than inferred.

Extended 2026-09-26 by the eviction-mechanics resolution above: what eviction removes is the
cached reference, never the object, so the quota it enforces is measured in referenced bytes.

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

Consequence carried by `storage-and-gc.md`: GC marks from the five roots enumerated there -
published references, cached references, retained snapshots, CAS-backed metadata documents
(the fourth arrived later, on `data-model.md`'s document-storage resolution) and
pointer-targeted snapshots (the fifth, settled 2026-09-26).

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
| 2026-09-26 | 4d1aeb1 | folding adopted recommendations under the standing delegation | Not a review. Adopted Q10 (B: waiters served from the CAS after the verified commit), Q12 (A: passive detection on revalidation, with `supply-chain-policy.md`'s advisory feed as the active channel the recommendation anticipated) and Q13 (A: instance-wide offline switch, which also suspends the advisory feed's network sync). Folded jointly with the resolved `supply-chain-policy.md` Q5, whose adopted answer keeps this spec's owner-settled purge for security signals from either channel: the security-signal rule is now stated verbatim in both specs, and Design says what purge means under the eviction-mechanics answer (every cached reference ends, the sweep reclaims the bytes, no object deleted by the purge, no mark root added, held by `storage-and-gc.md` AC15), with the condemnation record built here as the first source and consulted by fetch-and-cache before any upstream request. One derived change recorded in Design rather than raised: the coalescing timeout is a stall timeout, since waiters now wait for the full download. Scope, Out of scope, the integrity, coalescing, serve-stale, offline, removal and GC sections of Design, and Phases 1 and 3 updated; the was-Q7 record gained an outcome-unchanged extension note. AC5, AC11 and AC13 rewritten; AC17 (waiter byte timeline) and AC18 (no background polling) added with Test Plan rows. |
| 2026-09-26 | 2edd42c | folding owner answers to storage-and-gc Q10 and proxy-cache Q11 | Not a review: application of decisions already made. Q11 answered option A and folded before this record was written - the GC-interaction section now says eviction ends the reference and deletes nothing, so it is not a second deletion path and inherits `storage-and-gc.md` AC15's single-deleter boundary, and the two behavioural consequences are stated in Design rather than only in the resolved record: the quota accounts referenced bytes rather than stored bytes (so a repository is back within quota before the sweep frees the space, which AC14 now says), and a re-fetch between eviction and the sweep dedup-hits the still-present blob, which is also the ordering answer against a concurrent fetch. AC7 rewritten from 'never deletes a blob hosted content references' to 'deletes no object at all', since the old wording presumed eviction was a deleter; AC16 added for the evict-then-re-fetch window with an object-store delete assertion. Scope, Phase 3 and the was-Q8 record updated, and the four-root statements here (GC interaction, resolved cache-location) carried to five for storage-and-gc Q10. |
| 2026-09-24 | d078c46 | cross-spec consistency (storage-and-gc's fourth mark root) | Not a review. The GC-interaction section still described a three-root sweep and credited cached references as the third root rather than the second. Corrected to the canonical four, and the fourth root's motivating case recorded here where it originates: a proxied repository's current index document is a CAS blob no `File` row references, and it produces no snapshots, so the current-document half of that root is all that protects it. Q11 remains open and still bears on the cached-reference root. |
| 2026-09-24 | 1701a48 | cross-spec sync during data-model's gate review | Not a review. One three-root remnant survived the sync above, in the resolved cache-location record; corrected to the canonical four roots. |
| 2026-09-22 | afbb4e4 | adversarial + constitution + go-spec-reviewer (claim check largely vacuous pre-code; siblings and prior art verified by reading) | Corrections applied (fetched-content integrity, negative-cache classification, offline staleness, adapter-axis alignment, GC sibling sync, AC3/AC5/AC6 tightened, AC9/AC10 added); Q4-Q9 raised; stays draft. |
| 2026-09-23 | 3e3ae0a | folded-decision application + decision-interaction adversarial + constitution + go-spec-reviewer (claim verification against code vacuous pre-implementation; siblings re-read at this sha) | The six 09-23 decisions were recorded but not applied: stale Q6/Q7/Q8 references and the two-root GC claim in Design fixed, Design gained coalescing/serve-stale/removal/eviction/nightly sections, Scope, Context and Phases updated for build-with-OCI, AC3/AC10 tightened, AC11-AC15 added with Test Plan rows; Q10-Q13 raised on interactions between the settled decisions; stays draft. |
| 2026-09-23 | 9c971d4 | cross-spec consistency (data model, generic exemption, GC roots) | AC8 now applies to proxy-capable formats, AC10 preserves pre-existing remote metadata on a failed fetch, the resolved cache-location text names all three GC roots, and cached files retain remote provenance; existing open questions still keep the spec draft. |
