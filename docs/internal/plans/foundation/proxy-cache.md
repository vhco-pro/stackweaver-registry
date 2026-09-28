---
status: draft
status_description: "Reconciled 2026-09-28 at f6da6ad with the foundation authoring wave (not a review): Q15 (the completion-only fetch mode with a handler-supplied verifier hook, the client streaming with completion withheld until the verifier passes, verdicts after commit), Q16 (a per-fetch FirstByteWithin exception to the waiter rule for julia's captured deadline) and Q17 (api.nuget.org and repo.maven.apache.org preconfigured by the was-Q14 rule) adopted under the owner's standing delegation. Design gained the adapter seam over upstream-adapters.md, the cache-scoped half of forward-moving freshness (never adopt an older revision, db and signature as one revision), the removal event-class table with every reconciled format's rows, the read_only and deletion halves of repository-lifecycle.md, the proxy.offline key, the management-api refresh route and observability.md's metric names. AC20 to AC24 added; 24 criteria, zero open questions; stays draft pending a gate review. Earlier: Q14 adopted 2026-09-26; Q10, Q12 and Q13 adopted, Q11 answered by the owner."
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
- Fetch verification in two modes selected by the handler per fetch: stream-and-verify against a
  digest declared before the fetch, and the **completion-only mode** for content whose binding
  check exists only over the complete body (a Go module zip's dirhash, a Conan manifest, a
  digest-less Maven, NuGet, CRAN or Packagist file, a LuaRocks rock), where a handler-supplied
  verifier runs in a post-receipt hook before anything commits (the resolved completion-only
  decision below, was Q15). Signature verdicts are computed in the same hook after the commit
  and never gate it (`artifact-verification.md`, "When verification runs").
- The adapter seam: fetch-and-cache hands the handler's upstream location and its
  `upstream.Options` to a one-method `Fetcher`, satisfied by `upstream-adapters.md`'s `Router`;
  off-origin hosts, redirects, credentials and rate-limit interpretation are that spec's, and
  this layer never opens a connection (its AC3 egress rule).
- Upstream credentials, stored encrypted, bound to the `remote` repository they belong to -
  one upstream per remote repository, so rotating a credential touches one row. The credential
  kinds, their acquisition and the redactor that keeps them out of every log line and error are
  `upstream-adapters.md`'s ("Credential kinds", "Redaction"); their administration is
  `management-api.md`'s (its AC21). This spec asserts the end state (AC6).
- Cache-scoped freshness for `remote` repositories, the cache half of the mechanism
  `data-model.md` states for pointers ("Freshness scoped to the pointer"): a remote's served
  `Last-Modified` is the cache's own forward-moving record, never the upstream's, a remote never
  adopts an older upstream revision, and a database and its detached signature are adopted as
  one revision (below, "Freshness of what a remote serves").
- The `read_only` state of a `remote` and the deletion of one, as `repository-lifecycle.md`
  defines them (its resolved read-only-remote decision, was its Q7, and its deletion table):
  this layer's half is no fetch, no revalidation and no eviction while read-only, and deletion
  ending every cached reference in eviction's shape.
- The "refresh now" action of the resolved metadata-TTL decision, realised as
  `management-api.md`'s `POST /api/v1/repositories/{name}/refresh` (its AC29): this layer marks
  every cached metadata document and every negative entry of the remote due for revalidation.
- Resolution across several upstreams by aggregating their remote repositories in a `virtual`
  repository, whose member order is the resolution order. **Failover is not a field on any
  entity** (`data-model.md`, resolved upstream and repository structure).
- Preconfigured upstreams: npm, PyPI, Docker Hub, galaxy.ansible.com, api.nuget.org and
  repo.maven.apache.org ship configured and enabled, each once its format ships (the resolved
  preconfigured-upstreams decision below, its extension to Galaxy in the resolved
  preconfigured-set extension, and the second extension to NuGet and Maven Central, was Q17).
  pub.dev and crates.io stay user-configured until their formats are authorized to build. This
  spec owns the set; what each entry *is* (adapter, URL, credential kind, allowlist) is a
  compile-time profile in `internal/upstream/preconfigured` owned by `upstream-adapters.md`,
  whose AC24 holds the two tables equal.
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
- Signing anything a `remote` serves. A remote's documents, regenerated or relayed, are never
  signed by this registry (`signing-service.md` AC20); what a remote serves carries the upstream's
  signatures verbatim and this layer's cache-scoped freshness.
- The off-origin host allowlist, redirects, per-host credential roles and rate-limit
  interpretation: `upstream-adapters.md` (its resolved allowlist decision, was its Q3). This
  layer passes the location the handler derived and consumes the typed errors.

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

### Completion-only mode and the verifier hook

Eight format specs found the same gap from different wires (`go-modules.md`, `nuget.md`,
`maven.md`, `composer.md`, `cran.md`, `luarocks.md`, `openvsx.md`, `conan.md`; the consequences
queue's cross-cutting theme 7): the check that binds an artifact's bytes to its coordinate is not a
digest that can be verified while streaming. A Go module zip is bound by its dirhash over the
extracted tree; a Conan revision by a manifest that names every file; a NuGet `.nupkg`, a Maven
file without a sidecar, a CRAN binary tree and a Packagist dist with an empty `shasum` carry no
digest at all on the read surface; a LuaRocks rock is bound by the identity of the rockspec inside
it. The resolved integrity-and-streaming decision assumed a stream digest, so it needs one
generalisation, adopted as the resolved completion-only decision (was Q15) rather than taken
silently: **the fetch-and-cache request carries either a declared digest or a handler-supplied
verifier, never neither, and the commit waits for whichever one it carries.**

- **Selection is per fetch, by the handler.** A fetch-and-cache request names the mode: a declared
  digest set (one or more algorithm-and-value pairs; every declared algorithm is verified, so an
  opam file declared in md5 and sha512 is checked against both, and a digest a handler obtained
  through a prior metadata request, such as Open VSX's `.sha256`, is a declared digest like any
  other), or a verifier the handler supplies. A request with neither is refused by fetch-and-cache
  before any upstream request is made: the layer never commits bytes it did not verify, and it
  holds that mechanically rather than by review (AC20). Digest-bearing formats keep the settled
  stream-and-verify behaviour unchanged.
- **The body is spooled, not committed.** In completion-only mode the fetched bytes are written to
  the CAS staging area while their canonical digest is computed, exactly as an upload session's
  bytes are. Nothing enters the store or gains a `Blob` row until the adapter's body reader has
  ended cleanly: `upstream-adapters.md`'s reader returns `ErrTruncated` on a short or unterminated
  body and `ErrStalled` on a stall, never a clean `io.EOF` for either (its AC13, AC12), which is
  what lets this layer trust that a clean end means the whole body.
- **The post-receipt verifier hook runs over the complete spooled body, before the commit.** The
  handler's verifier receives a reader over the spooled bytes and the coordinate, and returns pass
  or a refusal naming its rule. It is an integrity call in `artifact-verification.md`'s sense (its
  entry catalogue: dirhash and `h1`, tree hash, apk segment, TUF chain, `SHA256SUMS`, checksum,
  size), reached through the `Verifier` consumer interface that spec declares in `internal/format`
  beside `Deps` (its resolved reach decision, was its Q9), or a handler-local structural check (zip
  hygiene, an embedded manifest naming the coordinate). A refusal commits nothing, leaves the
  spool to be discarded, records the reason observably to the operator under
  `cache_fetch_failures_total{condition}`, and never creates a negative entry, so the next request
  tries again (AC20). A pass commits the blob under its computed digest through the shared
  reference-creation call, which is the same commit a digest match performs.
- **Verdicts come after the commit and never gate it.** Signature verdicts (a Maven `.asc`, a
  NuGet author signature, a Conan or Open VSX signature against a pinned key) are computed in the
  same hook from the committed CAS blob and the signature material fetched with it, and recorded
  through `artifact-verification.md`'s `Verify`; a `failed` verdict is a fact for policy to
  evaluate on the next resolution, never a refusal of the commit and never a delay for the client
  (its "When verification runs", proxied path). The line is the one that spec drew: an integrity
  call may refuse the commit; a verdict is recorded afterwards.
- **The initiating client streams, and the response completes only after the verifier passes.**
  Completion-only does not mean buffer-then-serve. The initiating client receives the body as it
  arrives from upstream, as under stream-and-verify, so a client with a first-byte deadline is not
  failed by construction (Julia's `Downloads` abandons a request that receives no body byte for
  twenty seconds, `julia.md`, captured). What is withheld is the response's *completion*: the
  final body byte under a known length, or the terminating chunk otherwise, is sent only after the
  verifier passes. On a refusal the connection is closed short, which every captured client
  reports as a failed transfer and never mistakes for the artifact; this is the same abort shape
  the CAS read path uses on a digest mismatch (`storage-and-gc.md` AC21) and the same posture the
  resolved integrity-and-streaming decision already accepted, moved from mid-body to end-of-body.
  The server records the real reason, because the client-side evidence is a network error by
  design. `go-modules.md`'s accepted cost, "the client waits for the full upstream fetch before its
  first byte", is therefore stricter than what this layer requires; it may keep that posture by
  choice, and the layer's guarantee is the one that matters to it: nothing unverified is ever
  *completed*, and nothing unverified ever enters the CAS.
- **Waiters are unchanged by the mode.** Coalesced waiters receive bytes only from the CAS after
  the verified commit, in both modes, with the one declared exception below (Miss coalescing, the
  resolved first-byte-deadline decision, was Q16).
- **Candidate sources are tried in order.** A handler may hand fetch-and-cache an ordered list of
  locations for one file (`opam.md`: the upstream's own cache, then each declared source host).
  They are tried in order until one completes and verifies; a candidate the adapter refuses as
  off-allowlist (`upstream-adapters.md` `HostNotAllowedError`), one answering not-found, and one
  failing verification each move to the next, and the `RemoteFile` provenance records the
  candidate that succeeded. A rate-limit error stops the attempt rather than moving on, since the
  next candidate is usually the same host.

Under `supply-chain-policy.md`'s refuse-until-scanned setting the initiating client is a waiter
(Miss coalescing), so in that composition the verifier hook, the scan and the CAS serve happen in
that order for every client, and the completion-only mode adds no third path.

### The adapter seam

Fetch-and-cache is the entry point handlers call on a proxied miss through `Deps`
(`format-handler-interface.md`), and this spec owns its signature (the Obligation section
below). Below it, this layer never opens a connection: it holds a one-method `Fetcher` interface
with `Fetch` alone, satisfied by `upstream-adapters.md`'s `*upstream.Router`, and passes down the
handler's upstream location (a path under the upstream root, or an absolute URL the handler took
from upstream metadata, which the adapter's allowlist must admit) together with the
`upstream.Options` the handler set (`Accept`, an `Accept-Encoding` opt-in, a `User-Agent`
override, a `Range`, a forwarded `POST` body) and the conditional validators this layer holds
from the cache record (`ETag`, `Last-Modified`). The split, so neither spec assumes the other
built it, is the table in `upstream-adapters.md` ("What is the adapter's and what is
proxy-cache.md's"); the parts this layer consumes:

- **Typed errors, by `errors.As`.** A rate limit is `*upstream.RateLimitError{RetryAfter}`, never
  a status class, and AC9 branches on it: never negatively cached, never rendered as not-found,
  stale metadata served meanwhile within the stale-if-error limit. `ErrTruncated` and
  `ErrStalled` from the body reader are what AC10 and the completion-only hook rely on.
  `*upstream.HostNotAllowedError` moves to the next candidate or fails the fetch; it is never a
  negative entry, since nothing about the coordinate was learned.
- **The stall timeout travels in `Options`.** The coalescing timeout is measured as upstream
  stall (Miss coalescing), and the adapter is where a stall is detected, so this layer sets the
  value as policy and hands it down per request; the adapter never cuts a body that keeps arriving
  by total duration (its AC12).
- **Nothing inbound reaches the wire.** The adapter's `Request` has no `*http.Request` and no
  header map (its AC4); a handler's request headers cannot leak upstream through this seam
  because there is no field to carry them.
- **Provenance is the requested location.** Redirects are followed inside the adapter and no
  `Location` ever returns (its AC8), so the `RemoteFile` row records the location this layer
  asked for; a presigned final URL is never stored as a resolution.

The enforcers are named there and hold here: the `forbidigo` egress rule over `internal/proxy/**`
(its AC3) and the import-boundary test that keeps `internal/upstream` from importing this package
(its AC29). What this layer keeps is everything the table gives it: the mode and verifier hook
above, waiter semantics, negative caching, serve-stale, offline mode, eviction, the
security-signal rule and the preconfigured set.

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

**One declared exception: a client with a first-byte deadline** (the resolved first-byte-deadline
decision, was Q16). `julia.md` captured that Pkg's `Downloads` abandons any request that receives
no body byte for twenty seconds and then falls back to GitHub, so a waiter held for a forty-second
upstream fetch fails by construction, and its AC19 states the end state (two cold clients, one
upstream fetch, both complete). A handler whose client has such a deadline declares it in the
fetch-and-cache request (`FirstByteWithin`), and for that fetch alone waiters are attached to the
in-flight spool: they receive the bytes already received from upstream, progressively, and their
response completes only after the verified commit, exactly as the initiating client's does under
the completion-only mode above. A failed verification then closes every attached response short at
end-of-body, which is the blast-radius cost the coalesced-waiter decision declined for the default
path; here it is paid only by formats whose alternative is failing every waiter every time, and it
is visible in the handler's request rather than inferred from behaviour. Without the declaration,
which is every other format, waiters wait for the verified commit and see the CAS only (AC21).

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

### Freshness of what a remote serves

Seven formats found that a client's freshness check is a comparison against what it already
holds, not against the server: apt ignores a `Release` older than its own, TUF clients fail hard
on a lower version, Conan keeps a newer cached revision, LuaRocks, CPAN and Arch revalidate with
`If-Modified-Since` so a `304` hides a change, and curl's `--time-cond` in brew discards any `200`
whose `Last-Modified` is not newer than its own clock at the last fetch, so even an exact-match
`304` rule is not enough (the consequences queue's theme 1; `data-model.md`, "Freshness scoped to
the pointer"). For hosted repositories the mechanism is the pointer's freshness record, owned by
`data-model.md` and rendered by `signing-service.md`. A `remote` has no pointer, so **this spec
owns the cache-scoped equivalent**, and the three owners state the split once each
(`signing-service.md`, "Freshness scoped to the pointer: the split with `data-model.md`", its
resolved freshness-split decision, was its Q4; `data-model.md`, "Freshness scoped to the
pointer"):

- **The served `Last-Modified` is the cache's, never the upstream's.** Each cached metadata
  document and each paired document set of a remote carries a cache-scoped freshness record:
  `adopted_at`, set when this layer adopts a new upstream revision, to the later of the adoption
  time and one second after the record's previous value, so it never moves backwards whatever the
  clock or the upstream's own dates do. A response is `304` only when `If-Modified-Since` equals
  the record exactly or `If-None-Match` equals the byte-derived `ETag`; otherwise the body is sent
  with a `Last-Modified` later than anything the client can hold. A `200` is never sent with a
  `Last-Modified` at or before the request's `If-Modified-Since` (`homebrew.md`). The record has
  its row on the remote's current-document entry in `data-model.md`; it is metadata on that
  entry, not a pointer and not a mark root (reported to that spec as a sibling consequence).
- **A remote never adopts an older upstream revision.** The adapter returns the upstream's
  `Last-Modified` and `ETag` verbatim with each response (`upstream-adapters.md`, "The
  interface"), and a handler's revision has its own ordering where the format defines one (Conan's
  revision `time`, Homebrew's `generated_at`, a TUF `version`). A revalidation whose result is
  older than the adopted revision by the format's ordering, or by upstream `Last-Modified` where
  the format has none, is **not adopted**: the cached revision keeps serving, its record is
  unchanged, and the regression is recorded for the operator as a divergence (`arch.md`,
  `homebrew.md` rows). An upstream that legitimately rolls back reaches clients through the
  operator's "refresh now" after the divergence is read, never silently.
- **A database and its detached signature are adopted as one revision.** pacman downloads a
  `.db` and its `.sig` separately with no shared version, revalidating one conditionally and the
  other unconditionally depending on release (`arch.md`, captured across 6.0.2 and 7.1), so a
  database adopted without its signature pairs a new signature with an old database and the sync
  fails. A handler declares such documents as a paired set; the set is fetched together, verified
  together, committed in one transaction and served under one freshness record, so no request can
  observe one member of the pair without the other. The same shape covers `repomd.xml` and its
  `.asc`, and `Release` with `Release.gpg`.
- **Regenerated documents on the proxied path are unsigned and carry this record.** Where a
  format regenerates its index from records parsed out of the upstream (CRAN, LuaRocks, Chef,
  opam), `signing-service.md`'s `FromUpstream` produces the document, stored as the remote's
  current document with this record's freshness and no `Signature` row (its AC20). Rendering goes
  through the same shared serving helper hosted documents use, with the cache record in place of
  the pointer record, so `signing-service.md`'s freshness-boundary architecture test (no handler
  sets `Last-Modified`, `ETag` or reads `If-Modified-Since`) covers remotes without a second test.
- **Read-only and offline freeze the record.** A `read_only` remote (`repository-lifecycle.md`,
  its resolved read-only-remote decision, was its Q7) does no fetch, no revalidation and no
  eviction, so nothing is adopted and the record stands; offline mode (below) has the same effect
  instance-wide. A client revalidating against a frozen remote receives `304` on an exact match
  and the unchanged body otherwise; the stale header of the serve-stale rule is not set, because a
  frozen cache is not a failed revalidation.

AC22 asserts the whole of this at the wire, with the real clients that found it.

### Negative caching

Upstream 404s must be cached, briefly. Without it, a typo'd dependency name in a busy CI fleet
becomes an unintentional denial-of-service against the upstream, and the failure is slow rather
than fast. With too long a TTL, a newly published package stays invisible after it exists. Short
TTL, and an explicit invalidation path: the same "refresh now" action settled for metadata TTLs
(was Q2), which `management-api.md` realises as `POST /api/v1/repositories/{name}/refresh` under
`push` with object none, leaving one `Operation` of kind `refresh` (its resolved refresh-action
decision, was its Q12, and its AC29). On this layer's side a refresh marks every cached metadata
document **and every negative entry** of the remote due for revalidation on its next request,
fetches nothing itself and creates no snapshot (AC24); the next real request revalidates inside
the TTL, which is what an operator who knows the upstream just changed is asking for.

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
instance-wide switch**, the configuration key `proxy.offline` (default `false`), whose row lives
in `deployment.md`'s key inventory and whose schema has no per-repository or per-upstream variant
(the resolved offline-scope question): switching it on takes every remote
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

The per-repository state that looks like offline mode and is not: a `remote` set `read_only`
(`repository-lifecycle.md`, its resolved read-only-remote decision, was its Q7, and its AC11).
It answers "stop trusting this upstream, keep serving what we verified" for one repository, and
this layer's half of it is that fetch-and-cache refuses with a typed refusal before any upstream
request, TTL revalidation does not run, the eviction pass skips the repository, a miss answers
not-found, and the cache-scoped freshness record stands frozen (above). It is not a second offline
setting: it is a repository state with a different meaning per type, it is not the air-gap
guarantee, and AC5's schema assertion still holds, since `read_only` is a state on the
`Repository` row and not an offline key. Deleting a `remote` ends every cached reference through
the same reference-ending call eviction uses and deletes no object; its `Upstream` row goes with it
and the sweep reclaims the bytes after grace (that spec's deletion table; AC23 here).

### Upstream removal or replacement

Upstream removals are not one event, and the settled policy (the resolved upstream-removal
decision) distinguishes them: an explicit security signal (npm's security-holding replacement, a
malware advisory) purges the cached content immediately and alerts the operator; an author
unpublish with no security signal keeps serving and records the divergence; a PyPI yank keeps
serving, because yank means "not for new resolutions, existing pins keep working" and purging
would contradict the ecosystem's own semantics. The divergence flag is an operator-facing alert,
not a quiet field, because it is the backstop for a security removal that arrives without a
detectable signal.

The format specs have since mapped their wires onto that table, and they agree on the
classes while differing in one place the original table did not name: what to do when an
upstream serves different bytes for a coordinate already cached. The layer therefore defines the
event classes once, the handler classifies each observed event into one of them (it is the only
party that can read its own wire), and the layer executes the response. This is how the table
stays one table across formats rather than a per-format mechanism:

| Class | What the layer does | Formats that produce it (each format spec carries its full rows) |
|---|---|---|
| **Explicit security signal** | The security-signal rule below: refuse, purge, one refusal record, one alert | npm's security-holding replacement; PyPI's PEP 792 `quarantined`; Packagist's malware list (`composer.md`); Open VSX's control-document `malicious` list (`openvsx.md`); a Cargo index file answering `451` (`cargo.md`); Go's checksum database disagreeing with served bytes (`go-modules.md`) |
| **Immutability violation, coordinate-bound** | Treated as the explicit signal: purge the cached content and alert; a later request re-fetches and verifies against the new digest on demand. Chosen where the ecosystem's rule is that the coordinate implies its bytes and every client verifies against a digest the coordinate declares, so the old bytes would fail every consumer | `nuget.md` (a re-fetched `.nupkg` differs), `maven.md` (a release file or its sidecar disagrees), `cargo.md` (`cksum` changes), `cran.md` (`MD5sum` changes), `debian.md` (a pool file's bytes change), `hex.md` (a checksum changes) |
| **Immutability violation, revision-bound** | Recorded and alerted, **no purge**: the new bytes are fetched and verified as a new blob, the old blob stays servable to clients holding the older metadata revision while that revision is retained, and the route serves the bytes matching the revision the client holds. Chosen where the client verifies against the metadata revision it was given, so serving the other bytes fails every install (captured) | `rpm.md`, `alpine.md`, `arch.md` (a new revision lists a different checksum at a cached location); `terraform.md`, `puppet.md`, `homebrew.md` (cached bytes kept, divergence recorded and alerted) |
| **Re-materialisation with a divergence** | The recorded digest is replaced and the divergence is operator-visible; no purge, because the ecosystem makes no byte promise for the file | `composer.md` (a dist whose upstream published an empty `shasum`) |
| **Flag mirroring** | Keep serving, mirror the upstream's flag faithfully, record an operator-visible divergence; the client's own semantics exclude it from new resolutions | PyPI yank; Cargo `yanked` (`cargo.md`); NuGet `listed: false` (`nuget.md`); the Forge's `deleted_at` withdrawal (`puppet.md`); Hex `retired` and Julia `yanked` are ordinary metadata changes on their wires |
| **Removal with no signal** | Keep serving, record an operator-visible divergence and alert once; the backstop for a takedown that arrives without a detectable signal | An author unpublish; a version or package vanishing from the index or answering `404` or `410` where it existed, on every wire that carries no reason (Maven Central, nuget.org, crates.io, CRAN's archive, Debian suites, ConanCenter, General, Supermarket, opam-repository, the Forge) |
| **Ordinary metadata change** | Propagated at the next revalidation; no divergence | Supersession by a newer build (Maven SNAPSHOT pruning, Debian point releases, Alpine and Arch builds, RPM `updates`), deprecation and advisory fields, `latest` moving, retract directives |
| **Integrity failure at fetch** | Nothing committed, no negative entry, the previous verified revision or cached copy keeps serving within the stale-if-error limit, the operator alerted with the real reason, the next request tries again | A signature or checksum failing at fetch on every wire; a Debian envelope or Alpine index failing its keyring; a Conan manifest not hashing to its revision; a truncated body |
| **Regression not adopted** | The cached revision stands, the record is unchanged, a divergence is recorded (Freshness of what a remote serves) | An upstream revision older than the adopted one (`arch.md`, `homebrew.md`) |

The two immutability classes are one decision per format, made in its spec from its client's
captured verification behaviour, and the layer offers both because both are correct for the
wires that chose them. The Maven, NuGet and Composer rows this reconciliation added were requested
by the consequences queue (Open items 7, 11 and 13); the others are recorded here so that the
class a format chose is visible in the layer that executes it.

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
metrics rather than inferred. The names are `observability.md`'s (its metric catalogue and alert
table), so this spec's criteria assert them rather than paraphrase them: quota utilisation is
`cache_referenced_bytes{repository}` over `cache_quota_bytes{repository}` (alert
`CacheQuotaNearFull`); thrash is `cache_refetch_after_eviction_total{repository}` over
`cache_evictions_total{repository}` (alert `CacheThrash`); a fetch that fails verification,
truncates or stalls counts in `cache_fetch_failures_total{format,condition}` with the alert
`FetchIntegrityFailure` on a digest mismatch; a condemnation counts once in
`cache_condemnations_total{format,condition}`, raises `CachePurgedOnSignal` once and writes one
`cache.purge` audit event carrying the condition, coordinate and digests; a divergence counts in
`cache_divergences_total{format}` with the alert `UpstreamDivergence`.

Two repository states interact with eviction and are this layer's to honour
(`repository-lifecycle.md`): a `read_only` remote is skipped by the eviction pass, since a
frozen cache that shrinks is not what read-only means to anyone (its resolved read-only-remote
decision, was its Q7), and a deleted remote's every cached reference ends through the same
reference-ending call eviction uses, so deletion is eviction's shape and adds no deleter (its
deletion table, `storage-and-gc.md` AC15).

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
decision), covering each of npm, PyPI, Docker Hub, galaxy.ansible.com, api.nuget.org and
repo.maven.apache.org once its format ships - at build-order step 4 that is Docker Hub alone,
and the others join with their formats (galaxy.ansible.com with Ansible collections at step 6a,
NuGet and Maven Central when those Tier 1 handlers land). `upstream-adapters.md` adds one
transport contract case per preconfigured profile to the same job (its AC26), so a real
upstream's transport changing is a filed issue the next morning. A red nightly opens an issue
carrying the failing evidence
rather than only colouring a dashboard, because a scheduled job that can go quietly red is a job
that gets ignored. This pairs with the client-drift job in `conformance-harness.md`. It does not
conflict with offline mode, which is a deployment posture rather than a test environment:
offline-mode cases assert that no upstream request is made and never touch a real upstream by
construction.

### Obligation to the handler interface

`format-handler-interface.md` settles that on a proxied miss **the handler calls a fetch-and-cache
API**, and names this spec as the owner of that API's shape. **This spec must define it before
OCI's proxied phase begins**, since OCI is now the first proxied format under the build-with-OCI
order. The shape, gathered from the sections above so the interface re-open inherits one
statement of it (the method set stays pinned; this is the entry's request, not a new method):

- the coordinate and the handler's classification of the response (immutable artifact or mutable
  metadata, and for metadata the TTL class), which decides caching and freshness;
- the upstream location, or an ordered list of candidate locations, each a path under the
  upstream root or an absolute URL the adapter's allowlist must admit;
- the `upstream.Options` for the exchange (`Accept`, `Accept-Encoding` opt-in, `User-Agent`
  override, `Range`, a forwarded `POST` body), with the stall timeout set by this layer;
- exactly one of a declared digest set and a handler-supplied verifier (Completion-only mode);
- an optional paired-document declaration (Freshness of what a remote serves) and an optional
  `FirstByteWithin` deadline (Miss coalescing);
- a typed refusal in return where the request is refused before any upstream request: the
  condemnation record, offline mode, a `read_only` remote, a missing verifier, a policy refusal
  from `supply-chain-policy.md` (its AC4 forbids handlers importing `internal/policy`, so the
  refusal type is declared in `internal/format` beside `Deps`).

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
- [ ] AC5: Offline mode is one instance-level setting, the key `proxy.offline` (default
      `false`), and the configuration surface offers no
      per-repository or per-upstream offline flag. With it switched on, cached content serves
      (including metadata whose TTL has expired), no remote repository, the preconfigured
      upstreams included, makes an upstream request (asserted at the network layer, not by
      inspecting logs), and a miss fails fast.
- [ ] AC6: Upstream credentials are stored encrypted and never appear in logs, responses or error
      messages, for every credential kind in `upstream-adapters.md`'s table and every
      credential-bearing URL shape its redactor knows: a real failed authenticated fetch of each
      kind leaves no credential material in the logs, the client-visible error or the audit
      stream, with the case running through `internal/upstream`'s redactor (its AC20).
- [ ] AC7: Cache eviction deletes no object at all: it removes the cached reference and leaves
      reclamation to the sweep, so a blob that hosted content also references keeps serving,
      proven by a test where the same digest arrives from both a publish and an upstream fetch
      and the hosted path still serves it after the evicting repository's sweep has run.
- [ ] AC8: Every implemented format whose `Capabilities()` declares proxy support has
      conformance cases in proxied mode; a declared unsupported capability is the only
      exemption, and `generic` is the only format that currently holds one.
- [ ] AC9: An upstream rate-limit or server error (429, 5xx) is never negatively cached and never
      surfaces to the client as not-found; the same request succeeds as soon as the upstream
      recovers, with no negative-TTL wait. The rate-limit branch is taken on
      `*upstream.RateLimitError` by `errors.As` and on nothing else, for every response shape
      `upstream-adapters.md` AC9 interprets, and expired metadata is served stale within the
      stale-if-error limit while the error stands.
- [ ] AC10: A fetch whose bytes fail integrity verification against the coordinate's declared
      digest, or that ends before the upstream completes the body, commits nothing to the CAS
      and attaches no local `Blob` or cached-reference state to the `File`; any pre-existing
      `File` and `RemoteFile` metadata remains available for a later retry. A mismatch detected
      mid-stream aborts the client connection and the server records the real failure reason
      observably to the operator, not only as a client-side network error: the failure counts in
      `cache_fetch_failures_total{format,condition}` under `digest_mismatch`, `truncated`,
      `stalled` or `size_mismatch`, a digest mismatch raises `FetchIntegrityFailure`, and the
      truncated and stalled conditions are taken from the adapter's `ErrTruncated` and
      `ErrStalled` by `errors.Is`, never inferred from a clean end of body.
- [ ] AC11: N concurrent requests for the same uncached artifact produce exactly one upstream
      fetch (asserted at the network layer), and when that fetch stalls past its timeout every
      coalesced waiter receives an error promptly rather than hanging, while a fetch that keeps
      making progress is not cut off by total duration; the stall value reaches the adapter in the
      request's `upstream.Options` and the stall surfaces as its `ErrStalled`.
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
      revalidations observe the signal (`cache_condemnations_total` increments once,
      `CachePurgedOnSignal` fires once, one `cache.purge` audit event carries the condition,
      coordinate and digests). An author unpublish without a signal, and a PyPI yank,
      keep serving and record an operator-visible divergence (`cache_divergences_total`,
      `UpstreamDivergence`). Every class of the event table under "Upstream removal or
      replacement" produces its stated response from a handler's classification, including a
      coordinate-bound immutability violation (purged as the signal) and a revision-bound one
      (recorded and alerted, both blobs servable, the route serving the bytes matching the
      metadata revision the client holds), a flag mirrored with a divergence, and a fetch-time
      integrity failure that commits nothing and creates no negative entry.
- [ ] AC14: A repository exceeding its storage quota evicts least-recently-accessed cached
      content until the bytes it still references are back within quota - without waiting for a
      GC sweep, since the quota accounts referenced bytes - an evicted artifact is transparently
      re-fetched on the next request, and quota utilisation is observable without reading logs
      as `cache_referenced_bytes{repository}` against `cache_quota_bytes{repository}`, with
      `cache_evictions_total{repository}` and `cache_refetch_after_eviction_total{repository}`
      moving so that a quota set too low is detectable as `CacheThrash` from metrics alone.
- [ ] AC16: An artifact evicted but not yet swept is re-fetched and re-referenced with no second
      stored object and no second upload of the bytes, and the object store shows no delete
      performed by eviction itself; the blob disappears only after the next sweep, and only if
      nothing referenced it again in the meantime.
- [ ] AC15: The nightly real-upstream job runs the proxied suites of the shipped preconfigured
      upstreams - npm, PyPI, Docker Hub, galaxy.ansible.com, api.nuget.org and
      repo.maven.apache.org, each from the release its format ships in - and opens an issue on
      failure, demonstrated by a manual dispatch against a deliberately failing fixture.
- [ ] AC17: While a coalesced fetch is unverified, only the initiating client receives bytes:
      every waiter receives its first byte after the verified CAS commit and is served from the
      CAS, and a fetch that fails verification or is truncated gives every waiter an error with
      zero bytes received, the initiating client alone seeing a mid-stream abort.
- [ ] AC18: This layer never polls an upstream in the background: with no client traffic and no
      configured sync, a remote repository makes no upstream request across several metadata
      TTLs (asserted at the network layer), and an upstream security signal is acted on at the
      first revalidation that observes it.
- [ ] AC19: A fresh installation with no operator configuration carries, for each shipped
      format among npm, PyPI, OCI, Ansible collections, NuGet and Maven, exactly one enabled
      remote repository bound to that format's preconfigured upstream (npm's public registry,
      PyPI, Docker Hub, galaxy.ansible.com, api.nuget.org, repo.maven.apache.org), and none for
      any other format, pub.dev and crates.io included; the seeded set is read from the profile
      table in `internal/upstream/preconfigured`, and `upstream-adapters.md` AC24's equality
      test fails if this criterion's set and that table ever differ.
- [ ] AC20: A fetch-and-cache request carrying neither a declared digest nor a handler-supplied
      verifier is refused before any upstream request is made (asserted at the network layer).
      In completion-only mode nothing is committed and no `Blob` row exists until the adapter's
      body reader ends cleanly and the verifier passes: a truncated body (`ErrTruncated`), a
      stalled one (`ErrStalled`) and a verifier refusal each commit nothing, create no negative
      entry, record the reason under `cache_fetch_failures_total`, and leave the next request to
      try again; a passing body is committed under its computed digest and the second request
      serves from the CAS. The initiating client receives its first body byte before the fetch
      completes and its response completes only after the verifier passes, so a refusal after a
      partially delivered body is a short-closed transfer the real client reports as a failure,
      never a file it accepts; a signature verdict computed in the hook is recorded after the
      commit and a `failed` verdict neither refuses the commit nor delays the client. An ordered
      candidate list is tried in order, an off-allowlist candidate making no connection.
- [ ] AC21: Without a `FirstByteWithin` declaration, coalesced waiters receive their first byte
      only after the verified commit (AC17 unchanged). With one, two clients starting cold against
      a stand-in that delivers the body slower than the declared deadline both receive a first
      body byte inside the deadline, the upstream serves the body once, both responses complete
      only after the verified commit, and a body failing verification short-closes every attached
      response with no client accepting the bytes as the artifact; the declaration is visible in
      the handler's request and absent from every format that did not capture such a deadline.
- [ ] AC22: A `remote` serves every cached metadata document with a `Last-Modified` taken from
      its cache-scoped record, never the upstream's header: on adopting a new revision the value
      is later than the previous one whatever the upstream's date or the clock says, a
      conditional request answers `304` only on an exact `If-Modified-Since` match or a matching
      `ETag`, and no `200` carries a `Last-Modified` at or before the request's
      `If-Modified-Since`. An upstream revision older than the adopted one by the format's
      ordering or by upstream `Last-Modified` is not adopted and is recorded as a divergence; a
      handler-declared paired set (a database and its detached signature) is committed in one
      transaction and served under one record, with no request able to observe one member new and
      the other old; a regenerated document of a remote carries the record and no `Signature`
      row. Proven with the real clients whose behaviour found it: apt, pacman on both captured
      releases, brew's `--time-cond`, and one `If-Modified-Since` client.
- [ ] AC23: On a `read_only` remote, fetch-and-cache refuses with a typed refusal before any
      upstream request, TTL revalidation does not run, the eviction pass skips the repository
      however far over quota it is, the freshness record is unchanged across the read-only
      window, and `thaw` restores all three (asserted at the network layer, sharing
      `repository-lifecycle.md` AC11's case). Deleting a remote ends every cached reference
      through the reference-ending call eviction uses, deletes no object, and the bytes leave
      the store only at the next sweep after grace.
- [ ] AC24: A cache refresh marks every cached metadata document and every negative entry of the
      remote due for revalidation, fetches nothing itself and creates no snapshot: the next real
      client request revalidates upstream inside the metadata TTL and a name negatively cached
      before the refresh is looked up upstream again inside the negative TTL (both asserted at
      the network layer), while a remote that received no refresh keeps both TTLs.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | integration | `internal/proxy/cache_test.go` |
| AC2 | integration | `internal/proxy/ttl_test.go` (mutating test upstream) |
| AC3 | integration | `internal/proxy/ttl_test.go` |
| AC4 | integration | `internal/proxy/negative_cache_test.go` |
| AC5 | unit + integration | `internal/proxy/offline_test.go` (network-level assertion across every remote repository including the preconfigured upstreams), plus a configuration-schema test asserting no per-repository or per-upstream offline field exists |
| AC6 | unit + integration | `internal/proxy/credentials_test.go` (every kind in `upstream-adapters.md`'s table, run through `internal/upstream`'s redactor, the file its AC20 row also names), plus an integration case asserting the logs, the audit stream and the client-visible error of a real failed authenticated fetch of each kind contain no credential material |
| AC7 | property | `internal/storage/gc_property_test.go` |
| AC8 | conformance | `conformance/<format>/proxied_test.go` |
| AC9 | integration | `internal/proxy/negative_cache_test.go` (throttling test upstream presenting every shape `upstream-adapters.md` AC9 lists; `errors.As` branch asserted; stale metadata served meanwhile) |
| AC10 | integration + fault injection | `internal/proxy/fetch_integrity_test.go` (mismatch, truncation and stall each asserted through the adapter's typed errors; `cache_fetch_failures_total{condition}` and `FetchIntegrityFailure` read through `telemetry.NewTestRecorder`) |
| AC11 | integration | `internal/proxy/singleflight_test.go` (network-level assertion; stalled upstream versus a slow but progressing one) |
| AC12 | integration | `internal/proxy/stale_test.go` |
| AC13 | integration | `internal/proxy/upstream_removal_test.go` (test upstream presenting each event class of the table, including both immutability classes with a client holding the older metadata revision, flag mirroring and a fetch-time integrity failure; a second remote repository of the same ecosystem and a hosted repository holding the same coordinate; network-level no-fetch assertion, record queried after a sweep, alert count across repeated revalidations; `cache_condemnations_total`, `cache_divergences_total`, `CachePurgedOnSignal`, `UpstreamDivergence` and the `cache.purge` audit event read through `telemetry.NewTestRecorder`) |
| AC14 | integration | `internal/proxy/eviction_test.go` (`cache_referenced_bytes`, `cache_quota_bytes`, `cache_evictions_total`, `cache_refetch_after_eviction_total` and the `CacheThrash` rule evaluated through `telemetry.NewTestRecorder`) |
| AC15 | ci | scheduled nightly workflow, proven by a written manual-dispatch procedure |
| AC16 | integration | `internal/proxy/eviction_test.go` (re-fetch between eviction and sweep, object-store delete assertion) |
| AC17 | integration + fault injection | `internal/proxy/singleflight_test.go` (per-client byte timelines against the commit, corrupt and truncated upstream bodies) |
| AC18 | integration | `internal/proxy/passive_detection_test.go` (injected clock across several TTLs with no traffic, network-level assertion, then one request revalidating into a signal) |
| AC19 | integration | `internal/proxy/preconfigured_test.go` (fresh-install upstream set per shipped format, read from `internal/upstream/preconfigured`; `internal/upstream/preconfigured/profiles_test.go` is `upstream-adapters.md` AC24's equality test over the same set) |
| AC20 | integration + fault injection + architecture test | `internal/proxy/completion_mode_test.go` (neither-digest-nor-verifier refusal at the network layer; truncated, stalled and verifier-refused bodies against stand-ins; no `Blob` row and no negative entry; per-client byte timeline showing first byte before completion and completion after the verifier; short-close observed by `go`, `dotnet`, `mvn`, `composer` and `luarocks` in `conformance/<format>/proxied_test.go`; verdict recorded after commit with the client timeline unchanged; ordered candidates with an off-allowlist stand-in that fails on any connection) |
| AC21 | integration + conformance | `internal/proxy/singleflight_test.go` (waiter timelines with and without `FirstByteWithin`; short-close of attached waiters on a failing body); `conformance/julia/proxied_slow_test.go` (`julia.md` AC19's case: forty-second stand-in, two cold clients, one upstream fetch); a table test asserting which handlers declare the deadline |
| AC22 | integration + conformance | `internal/proxy/freshness_test.go` (record monotonic under a backwards clock and a backwards upstream date; exact-match `304`; no `200` at or before `If-Modified-Since`; older revision not adopted and divergence recorded; paired set committed atomically under concurrent reads; regenerated document has no `Signature` row, shared with `signing-service.md` AC20's assertion); `conformance/debian/`, `conformance/arch/`, `conformance/homebrew/` and `conformance/luarocks/` proxied rollback cases with the real clients |
| AC23 | integration | `internal/repository/readonly_remote_test.go` (shared with `repository-lifecycle.md` AC11: network-level assertion, eviction pass skipped over quota, record unchanged, `thaw`); `internal/proxy/eviction_test.go` (remote deletion ends references through the eviction call, object-store delete assertion, blob gone only after the sweep) |
| AC24 | integration + conformance | `internal/manage/refresh_test.go` (shared with `management-api.md` AC29: metadata and negative entries marked due, no fetch, no snapshot); `conformance/oci/refresh_test.go` (a real client's next pull revalidates inside the TTL, and a negatively cached tag is looked up again, observed at the upstream stand-in) |

## Implementation Phases

Built alongside the OCI handler at charter build-order step 4; OCI's proxied conformance suite
is this layer's first proving ground, and npm at step 5 tests whether it generalises.

### Phase 1: Fetch and cache
- Remote repository config, the fetch-and-cache entry with the request shape of the Obligation
  section, the `Fetcher` seam over `upstream-adapters.md`'s `Router` with the stall timeout in
  `Options` and the typed errors consumed (AC9, AC10, AC11), immutable caching, single-flight
  miss coalescing with a stall timeout and waiters served from the CAS after the verified
  commit, stream-and-verify with commit on digest match for the initiating client, the
  completion-only mode with the post-receipt verifier hook, withheld completion and ordered
  candidates (AC20), and the `FirstByteWithin` waiter exception (AC21)

### Phase 2: Policy
- TTLs, conditional revalidation, negative caching, serve-stale bounded and marked, the
  cache-scoped freshness record with paired document sets and never adopting an older revision
  (AC22), the cache refresh's layer half (AC24)

### Phase 3: Operability
- Instance-wide offline mode (`proxy.offline`), encrypted upstream credentials through the
  adapter spec's redactor (AC6), LRU eviction under per-repository
  quota ending the cached reference only with reclamation left to the GC sweep, the
  `read_only` and deletion halves of `repository-lifecycle.md` (AC23), the
  security-signal rule's upstream channel (the condemnation record, the purge as ending cached
  references, refusal before any upstream fetch, one alert per condemnation) with passive
  detection and its exposure stated in the operator documentation, the event-class table
  executed from handler classifications (AC13), divergence flagging, the `observability.md`
  metric, alert and audit names (AC10, AC13, AC14), the preconfigured upstream set (AC19), the
  nightly real-upstream job with its NuGet and Maven Central rows

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None remain open. Q15, Q16 and Q17 were raised and adopted on 2026-09-28 by the foundation-wave
reconciliation, under the owner's standing delegation: the completion-only fetch mode with its
verifier hook (eight formats' request, cross-cutting theme 7), the first-byte-deadline exception
for coalesced waiters (`julia.md`'s captured conflict with the resolved Q10), and the second
extension of the preconfigured set to api.nuget.org and repo.maven.apache.org; the owner may
reverse any of them. Q14 was raised and adopted on 2026-09-26 by the Wave 1 reconciliation, under
the owner's standing delegation, to take `ansible-collections.md`'s requested extension of the
preconfigured set through this spec's own revision; the owner may reverse it. The 2026-09-23
review pass raised Q10 through Q13, each an interaction
between decisions that were settled individually. Q11 (eviction mechanics) was answered by the
owner on 2026-09-26; Q10, Q12 and Q13 were adopted the same day under the owner's standing
delegation and are reversible by the owner. All four are folded into Design, Scope, the
acceptance criteria and the Test Plan above. All earlier questions (Q1-Q9) were answered by the
owner and are folded into Design, Scope and the acceptance criteria above.
Resolved decisions are kept rather than deleted, so the reasoning survives the next time someone
asks why it was done this way.

### Resolved: the completion-only fetch mode and its verifier hook (was Q15, raised and adopted 2026-09-28)

**Adopted 2026-09-28 under the owner's standing delegation.** Option A: a second verification
mode selected per fetch by the handler, in which the body is spooled and a handler-supplied
verifier runs over the complete body before the commit, the initiating client streams and its
response completes only after the verifier passes, verdicts are computed after the commit and
never gate it, and a request carrying neither a declared digest nor a verifier is refused. Folded
into Scope, Design ("Completion-only mode and the verifier hook", "The adapter seam", the
Obligation section), AC20, Phase 1, and an extension note on the was-Q6 record.

Eight format specs requested it in one shape or another (`go-modules.md`'s resolved
zip-verification decision, `nuget.md`, `maven.md`, `composer.md`, `cran.md`, `luarocks.md`,
`openvsx.md`, `conan.md`), `artifact-verification.md` placed the verdict half of its hook here
("When verification runs", proxied path), and `upstream-adapters.md` built the truthful
completion it relies on (its AC13). The resolved integrity-and-streaming decision (was Q6)
assumed a stream digest, so admitting a mode without one is an extension of an owner decision
and is written in decision shape rather than edited in.

**Recommendation:** A. It keeps the owner's two invariants (nothing unverified enters the CAS;
commit only on a passed check) and changes only where the check runs, and it gives the eight
formats one mechanism rather than eight handler-local spools.

| Option | You get | It costs |
|---|---|---|
| **A. Spool, verify over the complete body, stream with withheld completion** | One mode for eight formats; the CAS never holds unverified bytes; clients with a first-byte deadline are served; the verdict half of `artifact-verification.md`'s hook has its home | Staging space for the spool during the fetch; a refusal after a partially delivered body reaches the client as a short-closed transfer, the same misleading client-side evidence the was-Q6 decision already accepted |
| **B. Buffer the whole body, verify, then serve** (`go-modules.md`'s own choice) | Nothing unverified reaches any client | First byte waits for the whole upstream fetch, which fails Julia's client by construction and every client with a similar deadline; no gain over A in what enters the store |
| **C. Stream unverified, commit, rely on the client's own check** | Nothing to build | Bytes the coordinate never promised enter the CAS and dedup propagates them, which the was-Q6 decision names as the thing never to do |

**Why this is yours:** it admits an exception to a decision you made about the component the
charter names as where this project eats data.

Accepted cost: the spool, and a short-closed transfer as the client-side evidence of a refusal.
B lost because it fails a captured client and buys nothing for the store; C lost because it
reverses the settled invariant.

### Resolved: coalesced waiters under a client first-byte deadline (was Q16, raised and adopted 2026-09-28)

**Adopted 2026-09-28 under the owner's standing delegation.** Option A: the resolved
coalesced-waiter rule (was Q10) stands as the default, and a handler whose client has a captured
first-byte deadline declares it in the fetch-and-cache request (`FirstByteWithin`); for that fetch
alone waiters are attached to the in-flight spool with completion withheld until the verified
commit. Folded into Design (Miss coalescing), AC21, Phase 1, and an extension note on the was-Q10
record.

`julia.md` captured Pkg's `Downloads` abandoning any request without a body byte for twenty
seconds, then falling back to GitHub; its AC19 requires two cold clients against a forty-second
upstream to both complete with one upstream fetch, which the was-Q10 rule cannot satisfy.

**Recommendation:** A. It confines the was-Q10 decision's declined cost to the formats whose
alternative is failing every waiter every time, and makes the exception visible in the handler's
request rather than inferred from behaviour.

| Option | You get | It costs |
|---|---|---|
| **A. Default unchanged; per-fetch `FirstByteWithin` attaches waiters to the spool with withheld completion** | Julia's AC19 satisfiable; every other format keeps the CAS-only waiter path; the exception is declared and testable | For opted-in fetches, a failing body short-closes every attached waiter at end-of-body, and their retries arrive together |
| **B. Reverse the was-Q10 decision: tee to all waiters everywhere** | One path | The mass-abort blast radius on the product's hottest path, for every format, to serve one captured client |
| **C. Keep the was-Q10 rule; Julia's waiters fail** | Nothing to build | A cold Julia fleet against a slow upstream fails by construction and falls back outside the registry, defeating the refusal model on that format |

**Why this is yours:** it re-prices a latency-versus-blast-radius trade you delegated two days
ago, and it is reversible by removing the declaration from the one handler that carries it.

Accepted cost: the end-of-body mass abort, confined to opted-in fetches. B lost because it
reverses an adopted decision for one format's benefit; C lost because it fails a captured client.

### Resolved: the second extension of the preconfigured upstream set (was Q17, raised and adopted 2026-09-28)

**Adopted 2026-09-28 under the owner's standing delegation.** Option A: api.nuget.org and
repo.maven.apache.org join the preconfigured, enabled-by-default upstreams, each from the
release its format ships in, and the nightly job gains their rows then; the entries' profiles
live in `internal/upstream/preconfigured` under `upstream-adapters.md`, whose AC24 holds the two
tables equal. Folded into Scope, the real-upstream section, AC15, AC19, Phase 3, and extension
notes on the was-Q3 and was-Q9 records.

Requested by `nuget.md` and `maven.md` (Open items 7 and 11) through the was-Q14 mechanism, and
queued as rows in `upstream-adapters.md`'s profile table awaiting this record. Both are Tier 1
formats (`catalogue.md`), so the rule was-Q14 applied to Galaxy applies unchanged: a Tier 1
upstream is certain to ship and its preconfiguration commits no surface to an unbuilt format.

**Recommendation:** A, by the was-Q14 rule.

| Option | You get | It costs |
|---|---|---|
| **A. Add both now, under the was-Q14 rule** | Two more ecosystems cache in thirty seconds; the nightly job exercises the real upstreams their proxied paths were written against | nuget.org's and Central's rate limits and quirks join the standing support surface (Central's are minimal: an anonymous static tree) |
| **B. Add only Maven Central** | The smaller support surface | Contradicts `nuget.md`'s adopted decision and leaves a Tier 1 proxied path with no preconfigured upstream |
| **C. Keep the set at four** | No new surface | Leaves two adopted sibling decisions unapplied and the adapter spec's queued rows dangling |

**Why this is yours:** it extends a set you settled, by the rule you delegated.

Accepted cost: two more real upstreams in the support surface and the nightly job. B and C lost
because each leaves an adopted sibling decision unapplied.

### Resolved: extending the preconfigured upstream set (was Q14, raised and adopted 2026-09-26)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: galaxy.ansible.com joins
the preconfigured, enabled-by-default upstreams, and the nightly real-upstream job gains its row
when Ansible collections ships; pub.dev and crates.io stay user-configured until a `continue`
breadth-gate verdict authorizes their formats to build, each then decided as its own extension.
Folded into Scope, the nightly section, AC15 and the new AC19.

This is an **extension of an owner decision, not a reversal**: the resolved preconfigured-upstreams
decision below keeps npm, PyPI and Docker Hub exactly as the owner settled them. It was raised
here because `ansible-collections.md` adopted adding galaxy.ansible.com (its resolved
preconfigured-upstream decision, was Q4) and recorded the amendment as this spec's to make
through its own revision, and because two Tier 2 specs deferred the same question to that
revision: `pub.md` (its pub.dev decision) and `cargo.md` (its crates.io decision).

**Recommendation:** A. The works-in-thirty-seconds argument that settled the trio applies with
extra force to the one ecosystem where hosting alone differentiates, and Ansible collections is a
Tier 1 format built at step 6a, so its upstream is certain to ship. pub.dev and crates.io are Tier
2, behind charter AC9's breadth gate, so preconfiguring them now commits a support surface to
formats that may never be built.

| Option | You get | It costs |
|---|---|---|
| **A. Add galaxy.ansible.com now; pub.dev and crates.io wait for their formats' build authorization** | The project's origin ecosystem caches in thirty seconds; the nightly job exercises the real upstream its proxied path was written against; no support surface for unbuilt formats | galaxy.ansible.com's rate limits and authentication quirks join the standing support surface; Flutter and Rust users configure their upstream by hand until a later extension |
| **B. Add galaxy.ansible.com, pub.dev and crates.io now** | Every specced proxied path has a preconfigured upstream from its first release | Commits configuration and nightly rows to Tier 2 formats the breadth gate may park, and widens the support surface before any evidence says those formats ship |
| **C. Keep the owner's trio unchanged** | No new support surface | Contradicts the adopted Galaxy decision, leaving Ansible collections' proxied path with no preconfigured upstream and no scheduled run against the real service |

**Why this is yours:** it extends a set you settled, and the size of the standing real-upstream
support surface is a product call.

Accepted cost: one more real upstream in the support surface and the nightly job, and a
first-run gap for pub and Cargo users until their formats are authorized. B lost because it
spends support surface on formats that may be parked; C lost because it leaves an adopted
sibling decision unapplied.

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

Extended 2026-09-28, default unchanged: the resolved first-byte-deadline decision (was Q16)
admits one declared exception, a handler's `FirstByteWithin`, under which waiters attach to the
in-flight spool with completion withheld until the verified commit.

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

Extended 2026-09-28, both invariants unchanged: the resolved completion-only decision (was Q15)
admits content whose binding check exists only over the complete body. The body is spooled and a
handler-supplied verifier runs before the commit; the client streams and its response completes
only after the verifier passes; nothing unverified enters the CAS and nothing is committed and
verified afterwards.

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
Extended 2026-09-28 with `observability.md`'s names: utilisation is `cache_referenced_bytes`
over `cache_quota_bytes` per repository, thrash is `cache_refetch_after_eviction_total` over
`cache_evictions_total` (alert `CacheThrash`); a `read_only` remote is skipped by the eviction
pass and a deleted remote's references end through eviction's call (`repository-lifecycle.md`).

### Resolved: real-upstream conformance runs (was Q9)

**Settled 2026-09-23: a separate nightly scheduled job.** The main conformance suite runs
against local stand-ins; a nightly job exercises the real npm, PyPI and Docker Hub, pairing
naturally with the client-drift job this project already specs. (Since 2026-09-26 also
galaxy.ansible.com, per the preconfigured-set extension above; since 2026-09-28 also
api.nuget.org and repo.maven.apache.org, was Q17, and `upstream-adapters.md`'s one transport
contract case per profile, its AC26.)

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

Extended 2026-09-28, outcome unchanged: the API half of "refresh now" is `management-api.md`'s
`POST /api/v1/repositories/{name}/refresh`, `push` with object none, one `Operation` of kind
`refresh` (its resolved refresh-action decision, was its Q12); this layer's half marks every
cached metadata document and every negative entry due for revalidation (AC24). The UI half is
`web-ui.md`'s.

### Resolved: preconfigured upstreams (was Q3)

**Settled 2026-09-22: npm, PyPI and Docker Hub ship preconfigured and enabled.** "Works in
thirty seconds" is the entire pitch for a caching proxy, and a blank first-run page wastes it.

Accepted cost: their rate limits, authentication changes and protocol quirks become our support
surface. Each preconfigured upstream therefore needs conformance cases in proxied mode against
the real service, not only against a local stand-in.

Extended 2026-09-26, the owner's three unchanged: galaxy.ansible.com joins them (the resolved
preconfigured-set extension above, was Q14, adopted under the owner's standing delegation).
Extended again 2026-09-28 by the same rule: api.nuget.org and repo.maven.apache.org (was Q17).
What each entry is (adapter, URL, credential kind, allowlist) is a profile in
`internal/upstream/preconfigured`, owned by `upstream-adapters.md`.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-28 | f6da6ad | cross-spec reconciliation of the foundation authoring wave. Not a review | Not a review. Every queued item in `agents/spec-loop/consequences.md` targeting this file verified against the current text of its source spec before applying. Three questions raised and adopted under the standing delegation: Q15 (the completion-only fetch mode: spool, handler-supplied verifier before commit, verdicts after commit, the client streams and its response completes only after the verifier passes, neither-digest-nor-verifier refused; theme 7, `artifact-verification.md` item 3, `upstream-adapters.md` item 1), Q16 (`julia.md`'s captured twenty-second first-byte deadline against the was-Q10 waiter rule: default unchanged, a per-fetch `FirstByteWithin` attaches waiters to the spool with withheld completion), Q17 (api.nuget.org and repo.maven.apache.org preconfigured by the was-Q14 rule; Open items 7 and 11, `upstream-adapters.md` item 2). Design gained "Completion-only mode and the verifier hook", "The adapter seam" (one-method `Fetcher` over `*upstream.Router`, typed errors by `errors.As`, stall timeout in `Options`), "Freshness of what a remote serves" (the cache-scoped half of theme 1: forward-moving record, exact-match `304`, never adopting an older revision, db and signature as one revision, regenerated documents unsigned, frozen when read-only; `signing-service.md` item 3, Open items 30 and 32), the removal event-class table executed from handler classifications with every reconciled format's rows (Open items 7, 11, 13 and the format rows), the `read_only` and deletion halves of `repository-lifecycle.md` item 14, `deployment.md`'s `proxy.offline` key (item 4), `management-api.md`'s refresh route with negative entries included (its reconciliation item 3), `observability.md`'s metric, alert and audit names (item 10), and the fetch-and-cache request shape in the Obligation section. Scope and Out of scope updated; AC5, AC6, AC9, AC10, AC11, AC13, AC14, AC15 and AC19 rewritten; AC20 to AC24 added with Test Plan rows; Phases updated; extension notes on the was-Q2, was-Q3, was-Q6, was-Q8, was-Q9 and was-Q10 records. Format-management fold item 6 found already applied (was Q14). |
| 2026-09-26 | 4d1aeb1 | folding adopted recommendations under the standing delegation | Not a review. Adopted Q10 (B: waiters served from the CAS after the verified commit), Q12 (A: passive detection on revalidation, with `supply-chain-policy.md`'s advisory feed as the active channel the recommendation anticipated) and Q13 (A: instance-wide offline switch, which also suspends the advisory feed's network sync). Folded jointly with the resolved `supply-chain-policy.md` Q5, whose adopted answer keeps this spec's owner-settled purge for security signals from either channel: the security-signal rule is now stated verbatim in both specs, and Design says what purge means under the eviction-mechanics answer (every cached reference ends, the sweep reclaims the bytes, no object deleted by the purge, no mark root added, held by `storage-and-gc.md` AC15), with the condemnation record built here as the first source and consulted by fetch-and-cache before any upstream request. One derived change recorded in Design rather than raised: the coalescing timeout is a stall timeout, since waiters now wait for the full download. Scope, Out of scope, the integrity, coalescing, serve-stale, offline, removal and GC sections of Design, and Phases 1 and 3 updated; the was-Q7 record gained an outcome-unchanged extension note. AC5, AC11 and AC13 rewritten; AC17 (waiter byte timeline) and AC18 (no background polling) added with Test Plan rows. |
| 2026-09-26 | fe54272 | cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. From the format-management fold: `ansible-collections.md` adopted galaxy.ansible.com as a preconfigured upstream and left the amendment to this spec's own revision, and `pub.md` and `cargo.md` deferred pub.dev and crates.io to the same revision. Since that extends a set the owner settled (was Q3), it was written in decision shape and adopted as Q14 option A rather than edited in silently: galaxy.ansible.com joins, the owner's three are unchanged, and pub.dev and crates.io wait for their formats' build authorization. Folded through Scope, the real-upstream section, AC15 (the named set, each from its format's release), the new AC19 (fresh-install set per shipped format) with a Test Plan row, Phase 3, and extension notes on the was-Q3 and was-Q9 records. Not applied, since no queued item carries it: the Cargo yank row `formats/cargo.md` asks for in the upstream-removal table. |
| 2026-09-26 | 2edd42c | folding owner answers to storage-and-gc Q10 and proxy-cache Q11 | Not a review: application of decisions already made. Q11 answered option A and folded before this record was written - the GC-interaction section now says eviction ends the reference and deletes nothing, so it is not a second deletion path and inherits `storage-and-gc.md` AC15's single-deleter boundary, and the two behavioural consequences are stated in Design rather than only in the resolved record: the quota accounts referenced bytes rather than stored bytes (so a repository is back within quota before the sweep frees the space, which AC14 now says), and a re-fetch between eviction and the sweep dedup-hits the still-present blob, which is also the ordering answer against a concurrent fetch. AC7 rewritten from 'never deletes a blob hosted content references' to 'deletes no object at all', since the old wording presumed eviction was a deleter; AC16 added for the evict-then-re-fetch window with an object-store delete assertion. Scope, Phase 3 and the was-Q8 record updated, and the four-root statements here (GC interaction, resolved cache-location) carried to five for storage-and-gc Q10. |
| 2026-09-24 | d078c46 | cross-spec consistency (storage-and-gc's fourth mark root) | Not a review. The GC-interaction section still described a three-root sweep and credited cached references as the third root rather than the second. Corrected to the canonical four, and the fourth root's motivating case recorded here where it originates: a proxied repository's current index document is a CAS blob no `File` row references, and it produces no snapshots, so the current-document half of that root is all that protects it. Q11 remains open and still bears on the cached-reference root. |
| 2026-09-24 | 1701a48 | cross-spec sync during data-model's gate review | Not a review. One three-root remnant survived the sync above, in the resolved cache-location record; corrected to the canonical four roots. |
| 2026-09-22 | afbb4e4 | adversarial + constitution + go-spec-reviewer (claim check largely vacuous pre-code; siblings and prior art verified by reading) | Corrections applied (fetched-content integrity, negative-cache classification, offline staleness, adapter-axis alignment, GC sibling sync, AC3/AC5/AC6 tightened, AC9/AC10 added); Q4-Q9 raised; stays draft. |
| 2026-09-23 | 3e3ae0a | folded-decision application + decision-interaction adversarial + constitution + go-spec-reviewer (claim verification against code vacuous pre-implementation; siblings re-read at this sha) | The six 09-23 decisions were recorded but not applied: stale Q6/Q7/Q8 references and the two-root GC claim in Design fixed, Design gained coalescing/serve-stale/removal/eviction/nightly sections, Scope, Context and Phases updated for build-with-OCI, AC3/AC10 tightened, AC11-AC15 added with Test Plan rows; Q10-Q13 raised on interactions between the settled decisions; stays draft. |
| 2026-09-23 | 9c971d4 | cross-spec consistency (data model, generic exemption, GC roots) | AC8 now applies to proxy-capable formats, AC10 preserves pre-existing remote metadata on a failed fetch, the resolved cache-location text names all three GC roots, and cached files retain remote provenance; existing open questions still keep the spec draft. |
