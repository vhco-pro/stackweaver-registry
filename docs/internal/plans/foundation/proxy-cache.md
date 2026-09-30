---
status: planned
status_description: "Planned by the Fable recheck of 2026-09-30 at d9f6f1c: a full review pass plus the re-examination of the eight questions adopted on Opus (Q15 to Q22). Q15, Q17, Q19, Q20, Q21 and Q22 confirmed, Q21 with an eviction-accounting amendment (a cached file a declared list of the remote also holds is not an eviction candidate and counts in cache_metadata_bytes, rpm's was-Q11); Q16 amended (FirstByteWithin is not honoured under refuse-until-scanned); Q18 amended (the member-input interface answers for the remote's current state and the job replays in bounded rounds). Queued items applied: swift, cran, conda and rubygems as zero-count examples, cran archive-path and rubygems quick-spec fetches as completion-only consumers, the RubyGems event-class rows, and rubygems' adopted Q6 as the expected-validator condition (new AC31). go-spec-reviewer inline: the coalesced flight's shutdown path stated. 31 criteria, each with a Test Plan row; zero open questions; fable_recheck cleared. Sibling consequences reported for signing-service (AC35 templates and derived routes), rpm, observability (cache_metadata_bytes still missing from its catalogue), supply-chain-policy, rubygems and format-handler-interface. Earlier: Leftovers pass of the closing sweep 2026-09-28 at 4278ce0 on Opus (not a review): EnqueueRevalidation takes the caller's transaction (creation and member change enqueue in theirs, the read path in an enqueue-only one it opens), with run_at now and the rate-limit deferral through async-operations' RetryAt counted as an attempt (its was-Q11); internal/proxy imports neither internal/index nor internal/signing, the member-input paths arriving through an interface it declares (signing-service was-Q19); AC26 extended and its rows shared with async AC29, AC30 and auth AC36; the Obligation list gains the git location {url, commit} (upstream-adapters was-Q9) and the advisory key (supply-chain was-Q11), asserted by the new AC30; the replay cites auth AC36 and format-handler-interface was-Q11 and AC18, and a dated note on was-Q18 records every counterpart landed; a remote's deletion ends its current documents beside its cached references, not in eviction's shape (Scope, the eviction paragraph, AC23). No new question; 30 criteria. Earlier, metadata-eviction reconciliation 2026-09-28 at f0bfe75 on Opus (not a review): Q21 adopted, a remote's current metadata documents at every level are fourth-root current documents LRU eviction never reaches, changed only by an adoption and ended only by the remote's deletion, outside the quota and reported as cache_metadata_bytes (AC29 added, AC14 files only); Q22 adopted, a per-package revision set declares its blobs on its package-level document so adoptions of different packages do not serialise (AC27 extended); a declared count of zero valid, puppet and vagrant as Q19 examples; homebrew moved from kept bytes to the new-blob variant as a digest-addressed file kept until eviction (AC28 extended, was-Q20 extension note). No mark root added. 29 criteria, zero open questions; stays draft, carries fable_recheck. Earlier: Data-loss fix 2026-09-28 at 93982ba on Opus (not a review): a remote's retained revisions keep their blobs only on the declared blob-digest list of its repository-level document, for a handler-declared count of superseded revisions (one by default), rewritten by each adoption in its own transaction, a later map build a reference creation refused once its revision is dropped, cached files held by their own cached references (Q19 adopted, AC27); the old blob of the new-blob-beside-the-old variant is kept by its own cached reference only until the new blob's commit ends it, since every format in the variant serves a digest-less path from the current revision (Q20 adopted, AC28; AC13 and the event-class row rewritten). No mark root added. 28 criteria, zero open questions; stays draft pending a gate review, and carries fable_recheck. Earlier: Closing reconciliation sweep 2026-09-28 at 181a63b on Opus (not a review), applying every format batch 4 to 8 and signing-service closing-sweep item placed here: AC22 and 'Freshness of what a remote serves' reworded into the two conditional rules signing-service adopted (exact by default, not-earlier declared per format, brew's API remote), rendered through its serving door with cached files through ServeFile; the adoption commit is one transaction with a hook the index runtime's Adopt registers on, fed by the handler's adoption check (ordering, event classes, parsed records) now in the fetch-and-cache request (AC25); Q18 adopted: a remote reached only through a virtual is revalidated by the proxy.revalidate job, coalesced per remote, enqueued by virtual reads past the TTL and by virtual creation or member addition, replaying the handler's own route below the authorizer at one asserted call site (AC26; AC18 qualified); the event-class table gains the conda, Vagrant, Hackage, CPAN, Composer, opam, Swift, pub, Hex, Terraform and LuaRocks rows, both revision-bound variants and the ordinary-change divergence (AC13 extended); Alpine and six other formats named as completion-only consumers. 26 criteria, zero open questions; stays draft pending a gate review, and carries fable_recheck. Earlier: sweep 2026-09-28 at 6e6d503 (not a review): the cache-scoped freshness record cited as data-model.md's (AC44), freshness_test.go shared. Reconciled 2026-09-28 at f6da6ad with the foundation authoring wave (not a review): Q15 (the completion-only fetch mode with a handler-supplied verifier hook, the client streaming with completion withheld until the verifier passes, verdicts after commit), Q16 (a per-fetch FirstByteWithin exception to the waiter rule for julia's captured deadline) and Q17 (api.nuget.org and repo.maven.apache.org preconfigured by the was-Q14 rule) adopted under the owner's standing delegation. Design gained the adapter seam over upstream-adapters.md, the cache-scoped half of forward-moving freshness (never adopt an older revision, db and signature as one revision), the removal event-class table with every reconciled format's rows, the read_only and deletion halves of repository-lifecycle.md, the proxy.offline key, the management-api refresh route and observability.md's metric names. AC20 to AC24 added; 24 criteria, zero open questions; stays draft pending a gate review. Earlier: Q14 adopted 2026-09-26; Q10, Q12 and Q13 adopted, Q11 answered by the owner."
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
  digest-less Maven, NuGet, CRAN or Packagist file, a LuaRocks rock, an Alpine package whose `C:`
  is a SHA-1 over the control stream rather than a whole-file digest), where a handler-supplied
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
  one revision (below, "Freshness of what a remote serves"). The conditional answer rendered from
  that record follows the rule each document declares, `exact` by default and `not-earlier`
  where the format declares it (`signing-service.md`'s resolved later-condition decision, was its
  Q12).
- The adoption commit: adopting a new upstream revision is one transaction, and it exposes a hook
  on which `signing-service.md`'s index runtime registers, so a remote's regenerated documents and
  the re-merge of every virtual listing it happen inside the adoption (its resolved remote-member
  decision, was its Q16).
- What a remote keeps past its current revision, and what keeps it alive (the resolved
  retained-revision decision below, was Q19): a handler declares how many superseded revisions of
  a document set it retains (one by default, more where its format needs them, zero where no route
  reads a superseded revision), every blob it keeps for a current or retained revision is on the
  declared blob-digest list of the current document at the set's own level (the repository-level
  document for a repository-wide index, the package-level document for a per-package set, the
  resolved declaring-document decision below, was Q22), and the adoption that pushes a revision
  out drops its blobs from the list in the same transaction. A checksum a kept document merely
  mentions keeps nothing alive (`storage-and-gc.md` AC16), so nothing else holds such a blob.
- The old blob of a revision-bound immutability violation: where the cached file is addressed by a
  digest-less path, its cached reference ends in the commit that creates the new blob's at that
  coordinate, because the route serves that path from the current revision and no request can be
  served the old bytes afterwards (the resolved old-blob decision below, was Q20); where the
  cached file is addressed by its own digest (`homebrew.md`'s bottle remote), the old and new
  blobs are two coordinates, the new commit ends nothing, and the old blob keeps its ordinary
  cached reference until LRU eviction.
- Revalidation outside the request for a remote reached only through a `virtual`: a job kind,
  `proxy.revalidate`, coalesced per remote, enqueued when a virtual's read finds a merged input
  from the remote past its TTL and when a virtual's creation or member-list change adds a remote
  never adopted, which replays the handler's own proxied route rather than a second path (the
  resolved revalidation-replay decision below, was Q18).
- The `read_only` state of a `remote` and the deletion of one, as `repository-lifecycle.md`
  defines them (its resolved read-only-remote decision, was its Q7, and its deletion table):
  this layer's half is no fetch, no revalidation and no eviction while read-only, and deletion
  ending every cached reference in eviction's shape and, beside them, the remote's current
  metadata documents, which are not cached references and which only the deletion ends
  (`repository-lifecycle.md`, "Deletion" step 5).
- The "refresh now" action of the resolved metadata-TTL decision, realised as
  `management-api.md`'s `POST /api/v1/repositories/{name}/refresh` (its AC29): this layer marks
  every cached metadata document and every negative entry of the remote due for revalidation.
- The expected-validator condition on a metadata fetch (`rubygems.md`'s resolved info-freshness
  decision, was its Q6, applied here): a handler that derives a document's expected validator from
  another document of the same remote hands it to fetch-and-cache, and that value replaces the TTL
  as the cached document's freshness test for the request (AC31).
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
  resolved eviction-mechanics question below). **Eviction reaches cached files only**, and among
  them never one whose digest a declared list of the same remote holds while it is declared, since
  ending that reference would reclaim nothing (`rpm.md`'s resolved merge-input decision, was its
  Q11; Interaction with GC below). A remote's
  current metadata documents, at every level, are current documents under `storage-and-gc.md`'s
  fourth mark root, and neither they nor the blobs their declared lists keep are ever evicted: a
  document is changed only by the adoption that supersedes it and ended only by the remote's
  deletion. They sit outside the quota and are reported as their own gauge (the resolved
  metadata-eviction decision below, was Q21).
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

The category also decides what can end the cached copy (the resolved metadata-eviction decision,
was Q21). An immutable artifact is a cached **file**, a `File` held by its own cached reference,
the second mark root, and LRU eviction under the quota ends that reference. Mutable metadata is
the remote's **current document** at its level (repository, package or version), held when
CAS-backed by the fourth mark root's current-document half, and LRU eviction never reaches it: it
changes only when an adoption supersedes it and ends only with the remote's deletion. The
classification decides, not the content: a response a handler classifies as an immutable artifact
is a cached file even where it is metadata, and is evictable like one. `swift.md`'s removal table
relies on exactly that for its release metadata, which it caches indefinitely, never revalidates,
and re-fetches after eviction. What makes that re-fetch safe is the handler's, not this layer's:
`swift.md` keeps a per-version verification record on the package's current document, metadata that
keeps nothing alive, and checks every re-fetch against it.

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
it. The format reconciliations since then added consumers of the same mode, each named in its own
spec: `alpine.md` (the index's `C:` is a SHA-1 over a package's control stream, not a digest of
the whole file, so the handler supplies the check as a verifier with `S:` as the size bound),
`swift.md` (manifests), `vagrant.md` (boxes with no upstream checksum), `chef.md` (tarballs
checked for size and `metadata.json` identity), `julia.md` (the tree hash), `hex.md` (signed
registry payloads through the `raw` scheme's integrity call), `homebrew.md` (JWS API
documents), `cran.md` again for its archive-path fetches (a coordinate the current digest index does
not list, verified by the `DESCRIPTION` verifier) and `rubygems.md` (quick specs, with the Marshal
walk as the verifier). `openvsx.md` and `opam.md` use the declared-digest form of the same request. The resolved integrity-and-streaming decision assumed a stream digest, so it needs one
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
- The flight is owned by the layer, not by any request: it runs under the server's lifecycle
  context, so a shutdown cancels it, every waiter fails with an error, and nothing commits, since
  the commit is one transaction that either lands before the cancellation or not at all. It is the
  one goroutine in `internal/proxy` that outlives a request, and its shutdown path is the server's.

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
Under `supply-chain-policy.md`'s refuse-until-scanned setting the declaration is not honoured:
that setting forbids any byte reaching any client before the scan lands, it is the operator's
deliberate choice, and a client with a first-byte deadline then fails its cold misses on that
repository, which is the setting's cost made visible rather than a second exception (AC21).

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
  clock or the upstream's own dates do. A matching `If-None-Match` against the byte-derived `ETag`
  answers `304`. An `If-Modified-Since` is answered under the **conditional rule** the document
  declares in its serve policy, the two rules `signing-service.md`'s resolved later-condition
  decision (was its Q12) defines for hosted and remote documents alike, because two captured
  client populations need opposite answers to a condition later than the served value:
  - **`exact`, the default.** `304` only when `If-Modified-Since` equals the record exactly; any
    other condition, earlier **or later**, receives the body with the current value. This is what
    clients that echo the served date need (apt, pacman, `wget` and `curl` under LuaRocks, cpm and
    Carton), and what CPAN.pm's fallback needs when it sends a later file time left by a refused
    host (`cpan.md`, captured).
  - **`not-earlier`, declared per format.** `304` when `If-Modified-Since` is not earlier than
    the record, the body otherwise, so a `200` is never sent with a `Last-Modified` at or before
    the request's `If-Modified-Since`. This is what a client whose condition is its own clock
    needs: brew's `curl --time-cond` discards such a `200` mid-transfer (`homebrew.md`, its
    resolved freshness decision, was Q5 there, AC4), so `homebrew.md` declares it for its API
    remote.

  Both rules are safe only because the record moves forward, which is this layer's half; the
  answer itself is rendered by `signing-service.md`'s serving door, with the cache record as the
  freshness source ("Everything a remote serves goes through the serving door", below). The record is
  `data-model.md`'s, on the remote's current-document entry ("Freshness scoped to the pointer,
  and the documents that hang on it", its AC44: `adopted_at` and the paired-set id, written
  only by this layer, absent on hosted documents, replaced only by the adoption that supersedes
  its document and dropped with the document at the remote's deletion); it is metadata on that
  entry, not a pointer and not a mark root, and the two specs share
  `internal/proxy/freshness_test.go` (AC22 here, AC44 there). Because no eviction ends the entry
  (the resolved metadata-eviction decision, was Q21), every adoption reads the previous value it
  must exceed and the revision it must not regress below, so both rules hold for the life of the
  remote rather than only between two evictions.
- **A remote never adopts an older upstream revision.** The adapter returns the upstream's
  `Last-Modified` and `ETag` verbatim with each response (`upstream-adapters.md`, "The
  interface"), and a handler's revision has its own ordering where the format defines one (Conan's
  revision `time`, Homebrew's `generated_at`, a TUF `version`), which its adoption check returns
  (Obligation section). A revalidation whose result is
  older than the adopted revision by the format's ordering, or by upstream `Last-Modified` where
  the format has none, is **not adopted**: the cached revision keeps serving, its record is
  unchanged, and the regression is recorded for the operator as a divergence (the "Regression not
  adopted" row of the event-class table names the formats that record it). An upstream that legitimately rolls back reaches clients through the
  operator's "refresh now" after the divergence is read, never silently.
- **A database and its detached signature are adopted as one revision.** pacman downloads a
  `.db` and its `.sig` separately with no shared version, revalidating one conditionally and the
  other unconditionally depending on release (`arch.md`, captured across 6.0.2 and 7.1), so a
  database adopted without its signature pairs a new signature with an old database and the sync
  fails. A handler declares such documents as a paired set; the set is fetched together, verified
  together, committed in one transaction and served under one freshness record, so no request can
  observe one member of the pair without the other. The same shape covers `repomd.xml` and its
  `.asc`, and `Release` with `Release.gpg`.
- **An adoption is one transaction, and it has a hook.** Adopting a new upstream revision (a
  paired set counting as one) writes the new body or bodies as the remote's current documents,
  advances `adopted_at`, moves the revision it supersedes into the retained set, drops the
  retained revision the handler's declared count pushes out, rewrites the declared blob-digest
  list of the set's declaring document to match (Interaction with GC, "What a remote keeps past its current
  revision"), and runs every hook registered on the **adoption commit** inside that
  same transaction, so a failing hook commits nothing and the previous revision keeps serving,
  the shape of the write path's pre-commit hook (`data-model.md` AC37, `storage-and-gc.md` AC25).
  Adoption is cache materialisation, not a write, so the pre-commit hook never sees it; this hook
  is how a sibling reacts to one. The hook is registered at construction, never through a global,
  and receives the remote, the adopted document keys and what the handler's adoption check
  returned for the revision (Obligation section). `signing-service.md`'s index runtime registers
  its `Adopt` on it (its resolved remote-member decision, was its Q16): inside the adoption it runs
  the format's `FromUpstream` where the format regenerates and enqueues `index.merge` for every
  virtual listing the remote. A revision that is not adopted (a regression, an integrity failure)
  runs no hook.
- **Regenerated documents on the proxied path are unsigned and carry this record.** Where a
  format regenerates its index from records parsed out of the upstream (CRAN, LuaRocks, Chef,
  opam, Vagrant's catalogs), `signing-service.md`'s `FromUpstream` produces the document inside
  the adoption transaction through the hook above, stored as the remote's current document with
  this record's freshness and no `Signature` row (its AC20).
- **Everything a remote serves goes through the serving door.** A cached metadata document,
  verbatim or `FromUpstream` output, is served through `signing-service.md`'s `ServeDocument`
  with the cache record as its freshness source, and a cached file through its `ServeFile`, with
  a strong `ETag` from the CAS digest and byte ranges (`rpm.md`'s zchunk multi-range,
  `hackage.md`'s index by `Range`; its AC30); a per-request virtual reads each remote member's
  record for the name through `ServeRendered` (its resolved handler-rendered decision, was its
  Q14, AC11). So `signing-service.md`'s freshness-boundary architecture test (no handler sets
  `Last-Modified` or `ETag` or reads a conditional header) covers remotes without a second test.
- **Read-only and offline freeze the record.** A `read_only` remote (`repository-lifecycle.md`,
  its resolved read-only-remote decision, was its Q7) does no fetch, no revalidation and no
  eviction, so nothing is adopted and the record stands; offline mode (below) has the same effect
  instance-wide. A client revalidating against a frozen remote receives the answer its document's
  conditional rule gives against the unchanged record; the stale header of the serve-stale rule is
  not set, because a frozen cache is not a failed revalidation.

AC22 asserts the whole of this at the wire, with the real clients that found it, and AC25 the
adoption commit and its hook.

### Revalidation outside the request: remotes reached through a virtual

This layer's revalidation is driven by requests: a handler's proxied route calls fetch-and-cache,
and a metadata document past its TTL is revalidated then. `opam.md` found the case that never
happens: a `remote` reached only through a `virtual` receives no request of its own, because the
virtual serves a merged document built from the remote's cached documents, so after the TTL
nothing ever revalidates it, and a remote added to a virtual before anyone fetched through it
contributes nothing at all. `signing-service.md` settled that the virtual's own reads are the
demand (its resolved remote-member decision, was its Q16, AC35) and left the seam to this spec;
the resolved revalidation-replay decision below (was Q18) fixes it:

- **A job kind, `proxy.revalidate`, owned here and run by `async-operations.md`.** Its only
  argument is the remote. It is enqueued through `EnqueueRevalidation(ctx, tx, remote)`, which
  this layer exports, with `run_at` now and coalesce key and exclusivity key
  `revalidate:{repository}`, so any number of virtual reads inside one pending window enqueue one
  job per remote and a read during a running job yields at most one more. It takes the caller's
  transaction and inserts the row in it through `Enqueue(ctx, tx, Job)`, because the queue has no
  enqueue without one (`async-operations.md`, "Enqueue is transactional"). Three callers enqueue
  it: a virtual's creation and a member-list change adding a remote whose documents were never
  adopted, each inside the transaction that makes the change, so the job exists exactly when the
  change commits; and `signing-service.md`'s `ServeDocument` when it serves a virtual's merged
  document whose input record names this remote at a freshness value past the remote's metadata
  TTL. That read commits nothing else, so it opens a transaction holding only the job row and is
  served the current merged set whether or not that transaction commits, never delayed.
  `internal/index` imports this layer for the call and for the adoption hook's registration,
  never the reverse (`signing-service.md`'s resolved proxy-import decision, was its Q19).
- **The job replays the handler's own proxied route; it is not a second revalidation path.** For
  each metadata document of the remote that some virtual's merged input record names and that is
  past its TTL, the job dispatches an in-process `GET` for the document's route on the remote to
  the remote's handler, below the shared authorizer, with the document's current `ETag` as
  `If-None-Match` and a response writer that discards the body. The handler therefore runs exactly
  the path a direct client of the remote would drive: its location derivation, fetch-and-cache
  with its classification, its adoption check, its event classification, and a `304` from the
  serving door when nothing changed. An adoption the replay produces commits through the adoption
  hook above, so the re-merge follows with no further mechanism. For a remote never adopted, the
  routes replayed are the member-input paths the format's generator profile declares for the
  documents a `Merge` reads from a member (`signing-service.md`'s `Profile`, its AC35), which is
  the first fetch that lets a fresh remote contribute before the first client asks. They reach
  the job through a one-method interface this layer declares and the index runtime satisfies,
  handed here by the composition root at construction beside the replay entry, so
  `internal/proxy` imports neither `internal/index` nor `internal/signing`. The interface answers
  for the remote's **current state**, never from a static list: the runtime expands a profile's
  path templates over the values the virtual's other members hold (a tree, a subdirectory, an
  architecture) and derives routes from documents the remote has already adopted (the hrefs a
  `repomd.xml` names, the per-author `CHECKSUMS` a CPAN index names), so the job replays in
  rounds, asking again after each round's adoptions and ending when a round returns no route not
  yet cached. Two rounds cover every profile declared so far, an index and then the documents it
  names, and the interface states the bound. The route of each cached document is recorded with
  its entry at first fetch, so a later replay needs no declaration.
- **The replay is marked and bounded.** Its request context carries a revalidation-replay marker
  and no principal, so nothing it causes is attributed to a caller (the queue gives no job a
  principal in the first place, `async-operations.md` AC30); it is the only entry into a handler
  that does not pass the shared authorizer, and `internal/proxy/arch_test.go` holds it to that one
  call site. `auth.md` names the entry as the one that skips its authorizer, bounds it to a `GET`
  on a `remote` with nothing returned to any caller, and places it on AC10's external review
  surface (its "The one entry that skips the authorizer", AC36); `format-handler-interface.md`
  builds it (its resolved replay-entry decision, was Q11 there, AC18). Access times are updated as
  for any read, since a virtual really did read the content. A `*upstream.RateLimitError` returns
  the job to `pending` through `async.RetryAt(err, RetryAfter)`, so its `run_at` is the later of
  `RetryAfter` and the ordinary backoff and the attempt counts toward `max_attempts`
  (`async-operations.md`'s resolved retry-time decision, was Q11 there, AC7); any other failure
  ends it under the queue's ordinary retry policy, and the virtual keeps serving its previous
  merged set in both cases (`signing-service.md`, "Never a gap").
- **Nothing here polls.** The job is never scheduled: it runs only because a virtual was read or
  created or changed, which is demand, so the resolved signal-detection decision (was Q12) holds
  and a signal on a remote reached only through a virtual is noticed when the virtual's reads
  cause its revalidation, exactly as a direct client's reads would. While `proxy.offline` is set,
  or the remote is `read_only` or deleted, `EnqueueRevalidation` enqueues nothing, and a job
  already pending ends without a request when it observes either state.
- **A per-request virtual needs none of this.** Formats whose virtual resolves a name per request
  across members (`composer.md`, `homebrew.md`, `pub.md`, `vagrant.md`, `julia.md`) reach a
  remote member through that member's own fetch-and-cache inside the virtual's request, which is
  request-driven revalidation already; only formats with a `Merge` enqueue the job.

The accepted cost is `signing-service.md`'s: an upstream change reaches a virtual's clients within
the remote's TTL plus the revalidation plus the merge's staleness bound, against the TTL alone for
a direct client of the remote. AC26 asserts it.

### Negative caching

Upstream 404s must be cached, briefly. Without it, a typo'd dependency name in a busy CI fleet
becomes an unintentional denial-of-service against the upstream, and the failure is slow rather
than fast. With too long a TTL, a newly published package stays invisible after it exists. Short
TTL, and an explicit invalidation path: the same "refresh now" action settled for metadata TTLs
(was Q2), which `management-api.md` realises as `POST /api/v1/repositories/{name}/refresh` under
`push` with object none, leaving one `Operation` of kind `refresh` (its resolved refresh-action
decision, was its Q12, and its AC29). On this layer's side a refresh marks every cached metadata
document **and every negative entry** of the remote due for revalidation on its next request,
fetches nothing itself and creates no snapshot (AC24), the mark realisable as one due-before value
on the remote compared against each entry's `adopted_at` rather than a write per document on a
remote holding a hundred thousand of them; the next real request revalidates inside
the TTL, which is what an operator who knows the upstream just changed is asking for. A document
marked due counts as past its TTL for `EnqueueRevalidation`, so on a remote reached only through a
virtual the refresh takes effect at the virtual's next read (Revalidation outside the request).

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
| **Immutability violation, coordinate-bound** | Treated as the explicit signal: purge the cached content and alert; a later request re-fetches and verifies against the new digest on demand. Chosen where the ecosystem's rule is that the coordinate implies its bytes and every client verifies against a digest the coordinate declares, so the old bytes would fail every consumer | `nuget.md` (a re-fetched `.nupkg` differs), `maven.md` (a release file or its sidecar disagrees), `cargo.md` (`cksum` changes), `cran.md` (`MD5sum` changes), `debian.md` (a pool file's bytes change), `hex.md` (`outer_checksum` or `inner_checksum` changes), `conda.md` (a record's `sha256` changes for the same filename, or a re-fetched file disagrees with it), `pub.md` (`archive_sha256` changes, pub.dev included), `rubygems.md` (a version entry's `checksum:` changes) |
| **Immutability violation, revision-bound** | Recorded and alerted, **no purge**, in one of two variants the format chooses. **New blob beside the old:** the route resolves the coordinate against the **current** revision, since the path every format in this variant requests for the file carries no digest and names no revision, so no route can tell which revision the client holds; on the next request the new bytes are fetched and verified against the current revision's checksum as a new blob, and the commit that creates the new blob's cached reference at the coordinate ends the old blob's in the same transaction. Until that commit the old blob is kept by its own cached reference, untouched by the adoption; after it no request can be served the old bytes, so nothing keeps them and the sweep reclaims them after grace, while the divergence record keeps both digests as provenance (the resolved old-blob decision, was Q20). Where the format also serves the file at a coordinate that is its digest, the cached file is a `File` addressed by that digest, so the old and new blobs are two coordinates: the digest-less path follows the current revision as above, the new commit ends nothing, and the old blob keeps its ordinary cached reference until LRU eviction, since a client holding the older revision still requests it by its digest (`homebrew.md`, its resolved rebuilt-tag decision, was its Q15). A client still holding the older revision receives the current bytes and fails its own check until its next metadata refresh, exactly as it does against the upstream. **Kept bytes:** the cached bytes keep serving, the new upstream bytes are never committed under the old coordinate, and the divergence is recorded and alerted. Chosen where the client verifies against the metadata revision it was given, or where lock files recorded the old bytes, so serving other bytes fails every install (captured) | New blob beside the old: `rpm.md`, `alpine.md`, `arch.md` (a new revision lists a different checksum, `C:` or `S:` at a cached location, the route following the current revision); `hackage.md` (a new revision gives a cached release a different SHA-256, the route following the current revision); `cpan.md` (a `CHECKSUMS` entry names a different SHA-256, the route following the upstream `CHECKSUMS`); `homebrew.md` (a manifest tag rebuilt to another index digest: the flat route follows the current index, and the old blob, a `File` addressed by its own digest on the OCI-shaped route, keeps its cached reference until LRU eviction). Kept bytes: `terraform.md` (a cached provider's `SHA256SUMS`, signature, keys or zip differ), `puppet.md`, `swift.md` (an archive or release metadata re-fetched after eviction advertises another `checksum`), `vagrant.md` (a new catalog revision lists another checksum or URL for a cached box, or a digest-less box re-fetches as other bytes) |
| **Re-materialisation with a divergence** | The recorded digest is replaced and the divergence is operator-visible; no purge, because the ecosystem makes no byte promise for the file | `composer.md` (a dist whose upstream published an empty `shasum`) |
| **Flag mirroring** | Keep serving, mirror the upstream's flag faithfully, record an operator-visible divergence; the client's own semantics exclude it from new resolutions | PyPI yank; Cargo `yanked` (`cargo.md`); NuGet `listed: false` (`nuget.md`); the Forge's `deleted_at` withdrawal (`puppet.md`); pub's `retracted: true` (`pub.md`). Hex `retired`, Julia `yanked`, conda `revoked` and Swift's `problem` are ordinary metadata changes on their wires |
| **Removal with no signal** | Keep serving, record an operator-visible divergence and alert once; the backstop for a takedown that arrives without a detectable signal | An author unpublish; a version or package vanishing from the index or answering `404` or `410` where it existed, on every wire that carries no reason (Maven Central, nuget.org, crates.io, CRAN's archive, Debian suites, ConanCenter, General, Supermarket, opam-repository, the Forge, Packagist, hex.pm, luarocks.org, the Terraform registries, conda-forge (a filename moving to `removed`, a subdir answering `404`), Hackage (entries a rebased index drops, a tarball answering `404`), CPAN (a `CHECKSUMS` entry disappearing), a Vagrant catalog losing a version or provider (HCP Vagrant included), a Swift registry's list, a `/versions` line removing a version whose `.gem` is cached or an `/info` answering `404` or `410` (`rubygems.md`, whose upstream yank is a deletion), and pub.dev, where a vanished version is always administrative moderation yet not machine-distinguishable). A coordinate that can no longer be re-materialised after eviction answers `404` with its cached metadata kept, so the removal stays visible (`swift.md`) |
| **Ordinary metadata change** | Propagated at the next revalidation; no divergence unless the handler records one alongside (an index line moving to another author's directory in `cpan.md`, the shape a hijack takes; a version's changed checksums or source in `opam.md`) | Supersession by a newer build (Maven SNAPSHOT pruning, Debian point releases, Alpine and Arch builds, RPM `updates`), deprecation and advisory fields, `latest` moving, retract directives; conda `revoked` and conda-forge hotfix patches; Swift's `problem`; pub's advisories, `isDiscontinued` and `replacedBy`; Hackage's appended revisions and preferred versions; CPAN index lines; opam's routine bound tightening; Terraform `warnings`; Composer `abandoned` and moved branch references; a new LuaRocks version or constraint; a `/versions` append or its monthly rewrite in `rubygems.md` |
| **Integrity failure at fetch** | Nothing committed, no negative entry, the previous verified revision or cached copy keeps serving within the stale-if-error limit, the operator alerted with the real reason, the next request tries again | A signature or checksum failing at fetch on every wire; a Debian envelope or Alpine index failing its keyring (an Alpine index signed by a key outside the configured set carries the key name in the operator record); a Conan manifest not hashing to its revision; a Hackage root, chain or expired timestamp failing verification; a Hex payload whose signature fails or whose `repository` field changes; a Vagrant box failing its checksum or the structural verifier; a truncated body |
| **Regression not adopted** | The cached revision stands, the record is unchanged, a divergence is recorded (Freshness of what a remote serves) | An upstream revision older than the adopted one: `arch.md`, `homebrew.md`, `hex.md` (a payload), `terraform.md` (a version list), `luarocks.md` (a manifest), `hackage.md` (a TUF version that decreases), `cpan.md` (the index), `composer.md` (a package or `~dev` file), `opam.md` (the index), `rubygems.md` (a `/versions` generation older by `created_at`, or shorter at the same `created_at`) |

The two immutability classes are one decision per format, made in its spec from its client's
captured verification behaviour, and the layer offers both because both are correct for the
wires that chose them. A format whose request carries the digest needs no revision of the class:
`homebrew.md`'s OCI-shaped route requests `blobs/sha256:{digest}`, so its cached bottle is a
`File` addressed by that digest, the rebuilt blob is another coordinate beside it, and the old one
is held by an ordinary digest-addressed cached reference ended by LRU eviction, with no
revision-tied retention and nothing on a declared list. A future format whose request carries the
**revision** at a digest-less coordinate, so that its route could serve an older revision's bytes
at the path the newer revision now names, would need the old blob held by a retained cached
reference for as long as a retained revision names it; that is a revision of this class raised
with that format, never a silent extension, because none of the six in the variant has such a
route and a keep-alive no request reads is storage nothing can test. The Maven, NuGet and Composer rows were requested by the consequences queue
(Open items 7, 11 and 13); the conda, Vagrant, Hackage, CPAN, Composer, opam, Swift, pub, Hex,
Terraform and LuaRocks rows were added by the closing reconciliation sweep from each format's own
removal table (format batches 4 to 8); the others are recorded here so that the class a format
chose is visible in the layer that executes it. One event is deliberately in no class: an
upstream-signed document whose signature stops verifying under the remote's trust set is a
verdict, recorded and alerted by `artifact-verification.md`, while serving continues (`cpan.md`'s
`CHECKSUMS` row).

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
noticed when TTL revalidation of that metadata happens, driven by a client request, by a
virtual's read that replays the request a remote reached only through it never receives (the
`proxy.revalidate` job, Revalidation outside the request), or by a configured sync, and never by a
scheduled job polling the upstream, which against the
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
the root and by nothing else, and no eviction may end it: a remote's current documents are outside
LRU eviction altogether (below, "Eviction never reaches a remote's metadata").

What ends a cached reference's life is settled (the resolved cache-eviction decision): cached
files evict least-recently-used when their repository exceeds a per-repository storage quota.
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
reference-ending call eviction uses, so for cached files deletion is eviction's shape and adds no
deleter (its deletion table, `storage-and-gc.md` AC15). The remote's current metadata documents
end in the same transaction, but not in eviction's shape, since they are current documents no
eviction reaches (the resolved metadata-eviction decision, was Q21): they are removed with their
freshness records and declared lists as a `local`'s head documents are, and the fourth root stops
seeing them at that commit.

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
  bytes the repository's cached files still reference; an operator watching the object store
  will see it lag. A remote's metadata is not in that measure (below, "Eviction never reaches a
  remote's metadata").
- **A re-fetch between eviction and the sweep costs no storage.** The evicted content has no
  local blob, so a request re-fetches upstream, but the CAS commit dedup-hits the blob that is
  still present and cancels any standing deletion intent through the shared reference-creation
  call. That is also the ordering answer against a concurrent fetch: the intent barrier already
  serialises it, with no eviction-specific mechanism.

**Eviction never reaches a remote's metadata** (the resolved metadata-eviction decision, was Q21).
The eviction pass selects from the remote's cached files and from nothing else. A remote's current
metadata documents, at every level (a packument, a Simple page, an `APKINDEX`, a conda
`repodata.json`, an `InRelease`, a Vagrant catalog), are current documents the fourth mark root
protects when CAS-backed, and the declared blob-digest lists on them keep the blobs of the current
and retained revisions; the pass ends none of them however far over quota the remote is. A remote's
document changes only when an adoption supersedes it, whose old body the root releases unless the
handler's declared count retains it, and ends only with the remote's deletion, whose transaction
ends it with every cached reference (`repository-lifecycle.md`, "Deletion"). Four settled rules
depend on that and would each need a repair of its own if a document could be evicted: the
freshness record moves forward only because every adoption reads the previous value (AC22,
`data-model.md` AC44); the regression rule compares against the adopted revision, which an evicted
entry would no longer have, so an upstream rolled back would be adopted silently; the retained
revisions' blobs ride the declared list of a current document, so evicting that document would
drop every retained revision at once; and offline mode serves everything cached, which a cached
file whose metadata had been evicted could not be, since clients reach it by name. A virtual listing
the remote therefore never sees a member's input vanish under the member's quota pressure: an
eviction pass on the remote enqueues no `index.merge` and no `proxy.revalidate`, and a per-request
virtual always finds the member's record for a name it has adopted.

**A cached file a declared list also holds is not an eviction candidate while it is declared.**
`rpm.md` classifies the documents a `repomd.xml` names as immutable artifacts served through
`ServeFile` by multi-range and, so that a virtual's merge always has its inputs, declares each on
the revision's list once fetched (its resolved merge-input decision, was its Q11). Such a blob is
held by two roots at once, and ending its cached reference would reclaim nothing while forcing a
full re-fetch of tens of megabytes on the next request, so the pass skips it, its bytes count in
`cache_metadata_bytes{repository}` and not in `cache_referenced_bytes{repository}`, and at the
adoption that drops the digest from every list of the remote the file becomes an ordinary
candidate and its bytes move between the two gauges (AC14, AC29). The rule is the layer's, keyed
on the remote's lists, so a handler declares nothing extra to get it.

The accepted cost is that the quota bounds a remote's cached files, not its metadata. Metadata
storage grows with the distinct names clients have requested and with the upstream index size
times one plus the declared retention count, and a document for a name no client requests any
more stays until the remote is deleted. It is therefore reported beside the quota rather than
inside it, as `cache_metadata_bytes{repository}`: the inline bodies, CAS-backed bodies and
declared blobs of the remote's current and retained metadata, so that a remote whose metadata
dwarfs its files is found from metrics and the quota is never read as the remote's whole
footprint. On a busy npm or PyPI remote that is gigabytes over the remote's life, a packument for
every name any build ever requested, kept until the remote is deleted, and deleting and recreating
the remote is the operator's only lever, so the gauge is the thing to alert on; the resolved
metadata-eviction decision names the bounded per-name revision to raise if that proves material
in operation. Evicting a large index would not reclaim anything in practice either: a conda-forge
`repodata.json` of 188 MB per subdirectory is read by every request under that subdirectory, so
an evicted index would be fetched again by the next request, a full upstream transfer per
eviction, which is the thrash the quota exists to prevent.

**What a remote keeps past its current revision** (the resolved retained-revision decision, was
Q19). Several formats serve a client that holds an older metadata revision than the one the
remote has adopted: a file only a superseded index names, which apk, pacman and dnf still request
from the index they cached (`alpine.md`, `arch.md`, `rpm.md`); a tarball the previous Hackage
revision authorises (`hackage.md`); a `by-hash` index one of the two previous Debian envelopes
lists (`debian.md`); a module file at a slug only the previous module revision names
(`puppet.md`); a box at a coordinate only the previous catalog revision names (`vagrant.md`). To
serve it the handler keeps, per retained revision, blobs that are no current document's body: the
superseded index body a map is built from, the per-revision filename or location map, a previous
envelope, a retained revision's index chunks, a superseded module revision. The current revision
can need such a blob too: `vagrant.md` serves a catalog it renders from the upstream's, so the
upstream body its box route resolves through is no current document's body even while it is
current, and is kept the same way. **A digest a kept document
merely mentions in its body is metadata and keeps nothing alive** (`storage-and-gc.md`, the fourth
root's third reach, AC16; `data-model.md` AC34), and a remote writes no content snapshot, so
without a keep-alive every such blob is collected by the first sweep past grace while its revision
still serves. The rule:

- **The count is the lifetime.** A handler declares, in its proxied classification, how many
  superseded revisions of each revisioned document set it retains: one by default, more where its
  format needs them (`debian.md` retains two, the format's own rule that two previous versions of a
  `by-hash` file should stay available), and **zero** where no route reads a superseded revision
  (`homebrew.md`'s API documents and bottle manifests, whose routes name a document and carry no
  generation or digest; `cpan.md`'s remote, which keeps no superseded `CHECKSUMS`; `conda.md`'s and
  `cran.md`'s digest indexes, rebuilt from each adopted index and read only against the current
  one, `cran.md` verifying an archive-path coordinate the current index omits in the
  completion-only mode instead; `swift.md`'s release list and `identifiers` answers;
  `rubygems.md`'s `/versions` and the name-to-MD5 map derived from it). With zero, the
  adoption that replaces a document ends its old body's reference and nothing is declared for a
  superseded revision. Nothing is retained by time, and nothing is retained by a revision merely
  being mentioned.
- **Every blob the handler keeps for the current revision or a retained one is on the declared
  blob-digest list of the current document at the set's own level** (the resolved
  declaring-document decision, was Q22): the remote's repository-level document for a
  repository-wide index (`rpm.md`, `alpine.md`, `arch.md`, `hackage.md`, `debian.md`), the
  package-level document for a set revisioned per package (`puppet.md`'s module revision per
  module, `vagrant.md`'s catalog revision per box). That document is a current document, which no
  eviction reaches (above), so the fourth root marks the blob for exactly as long as its revision
  is current or retained, whether that document's own body is inline or CAS-backed. The adoption
  rewrites that document's list in its own transaction: the superseded revision's blobs stay, the
  blobs of the revision the count pushes out leave, and a blob that has left the list is
  collectable at the next sweep past grace. Adoptions of different packages write different rows,
  so they never serialise on one list.
- **A blob derived later is declared only while its revision still counts.** A map built on the
  first package request under a revision is appended by a cache-materialisation write that
  commits only while that revision is current or retained, checked under the document's revision
  token, so a map finished after an adoption dropped its revision is discarded, never declared.
- **Declaring is a reference creation.** Appending a digest goes through `storage-and-gc.md`'s
  shared reference-creation call (its AC10), cancelling any standing deletion intent, and the
  delete pass's re-check counts the list (its AC16), so a sweep interleaved with an adoption or a
  map build never collects a blob a current or retained revision declares.
- **Files are not on the list.** A cached file a retained revision names is held by its own cached
  reference, the second root, which no adoption ends; its end is LRU eviction, as for any cached
  file. Only the metadata a route consults to decide that a path is named and what it must hash
  to rides the list. A file evicted while its revision is retained is re-fetched and verified
  against that revision's checksum (the current revision's wherever both name the path), and answers the upstream's `404` once the upstream has removed
  it; a path no current or retained revision names answers `404` with no upstream request, each
  handler's open-relay rule.

The declared list holds these blobs rather than a cached reference because they are metadata with
no `File` row to hang a reference on, and because LRU eviction taking one retained revision's map
while that revision's files are still requested would leave them unverifiable; the accepted cost
is that retained metadata sits outside the quota's referenced bytes, bounded by the declared count
and reported in `cache_metadata_bytes` with the current metadata (AC27, AC29). The old blob of a revision-bound immutability violation is a different case with a
different answer, because it is a file and no route can serve it once the new blob is committed
(the event-class table, AC28).

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
  metadata, and for metadata the TTL class), which decides caching and freshness and whether LRU
  eviction can end the cached copy: an immutable artifact is a cached file eviction reaches, mutable
  metadata a current document it never reaches (the resolved metadata-eviction decision, was Q21);
- for mutable metadata, the handler's **adoption check**: a function over a new upstream revision's
  complete body, run before anything is adopted, that returns the revision's ordering value where
  the format defines one, the event classes it observed against the cached revision (the
  event-class table), the records `FromUpstream` consumes where the format regenerates, and the
  digests of the blobs it keeps for the revision. The layer applies the regression rule and the
  classes from what it returns, hands the records to the adoption hook and writes the kept digests
  onto the declared blob-digest list of the set's declaring document, so the handler reads its own wire and the layer
  decides what happens (Freshness of what a remote serves; Interaction with GC, "What a remote
  keeps past its current revision");
- for a revisioned document set, the number of superseded revisions the handler retains, one by
  default and zero valid (the resolved retained-revision decision, was Q19), and the level of the
  document that declares the set's blobs, repository or package (the resolved declaring-document
  decision, was Q22);
- the upstream location, or an ordered list of candidate locations, each a path under the
  upstream root, an absolute URL the adapter's allowlist must admit, or a **git location**
  `{url, commit}` (an `https://` repository URL and a 40-digit commit id), which the `Router` sends
  to the `git` adapter under the same row's allowlist, bound and cool-down with no credential, and
  only on a remote whose row names `https` (`upstream-adapters.md`'s resolved git-location
  decision, was Q9 there, AC34; `terraform.md`'s commit-pinned module sources are the consumer);
- where the handler reported one, the **advisory key** of the package or version being fetched
  (an origin or source package, a UUID, bound Git URLs), taken from the upstream document the
  handler already read, so the coordinate-decidable refusal before any upstream request keys on
  it as resolution does (`supply-chain-policy.md`'s resolved advisory-key decision, was Q11
  there, AC24);
- the `upstream.Options` for the exchange (`Accept`, `Accept-Encoding` opt-in, `User-Agent`
  override, `Range`, a forwarded `POST` body), with the stall timeout set by this layer;
- exactly one of a declared digest set and a handler-supplied verifier (Completion-only mode);
- an optional paired-document declaration (Freshness of what a remote serves) and an optional
  `FirstByteWithin` deadline (Miss coalescing);
- for mutable metadata, an optional **expected validator**, an algorithm and value the handler
  derived from another document of the same remote (`rubygems.md`'s `/info` MD5, named by the
  adopted `/versions` line): it replaces the TTL as the cached document's freshness test for this
  request, a matching recorded validator serving with no upstream request whatever the TTL says
  and a differing or absent one revalidating upstream before serving, under the serve-stale rule
  when the upstream fails; offline mode and a `read_only` remote serve the cached document
  whichever way the comparison goes. The recorded validator of that algorithm is the one the
  document's serve policy stores at adoption (`signing-service.md`, the `ETag` derivation
  `rubygems.md` requested of it) or the CAS digest (`rubygems.md`'s resolved info-freshness
  decision, was its Q6; AC31);
- nothing about who asked: the same request is made whether a client's request or a
  `proxy.revalidate` replay drove the handler (Revalidation outside the request), which is why the
  replay needs no entry of its own;
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
      coordinate-bound immutability violation (purged as the signal), a revision-bound one in
      each variant (recorded and alerted with no purge: the route serving the current
      revision's bytes and the old blob's cached reference ending with the new blob's commit,
      AC28; or the cached bytes kept with the new bytes never committed under the old
      coordinate), a flag mirrored
      with a divergence, an ordinary change with and without a handler-recorded divergence, a
      regression not adopted, and a fetch-time integrity failure that commits nothing and
      creates no negative entry.
- [ ] AC14: A repository exceeding its storage quota evicts least-recently-accessed cached
      files until the bytes its cached files still reference are back within quota - without waiting for a
      GC sweep, since the quota accounts referenced bytes - an evicted artifact is transparently
      re-fetched on the next request, and quota utilisation is observable without reading logs
      as `cache_referenced_bytes{repository}` against `cache_quota_bytes{repository}`, with
      `cache_evictions_total{repository}` and `cache_refetch_after_eviction_total{repository}`
      moving so that a quota set too low is detectable as `CacheThrash` from metrics alone. A
      cached file whose digest a declared list of the same remote holds is not evicted while it
      is declared, however far over quota the remote is, and becomes a candidate at the adoption
      that drops the digest from every list of the remote.
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
- [ ] AC18: This layer never polls an upstream in the background: with no client traffic on the
      remote or on any virtual listing it, no virtual created or member added, and no configured
      sync, a remote repository makes no upstream request across several metadata TTLs (asserted
      at the network layer), no `proxy.revalidate` job is ever enqueued in that window, and an
      upstream security signal is acted on at the first revalidation that observes it.
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
      Under `supply-chain-policy.md`'s refuse-until-scanned setting the same declared fetch
      delivers no byte to any client before the scan lands.
- [ ] AC22: A `remote` serves every cached metadata document with a `Last-Modified` taken from
      its cache-scoped record, never the upstream's header, through `signing-service.md`'s serving
      door with that record as the freshness source: on adopting a new revision the value is later
      than the previous one whatever the upstream's date or the clock says, and a matching `ETag`
      answers `304`. Under the default `exact` rule an `If-Modified-Since` equal to the record
      answers `304` and any other, earlier or later, receives the body with the current value;
      under a `not-earlier` rule the format declares, a condition not earlier than the record
      answers `304` and an earlier one the body, so no `200` carries a `Last-Modified` at or
      before the condition. An upstream revision older than the adopted one by the format's
      ordering or by upstream `Last-Modified` is not adopted and is recorded as a divergence; a
      handler-declared paired set (a database and its detached signature) is committed in one
      transaction and served under one record, with no request able to observe one member new and
      the other old; a regenerated document of a remote carries the record and no `Signature`
      row. Proven with the real clients whose behaviour found it: apt and pacman on both captured
      releases seeing a rollback under `exact`, a LuaRocks client whose later, unequal condition
      receives the body under `exact`, and brew 7.0.6's `--time-cond` receiving `304` to a later,
      unequal condition against the Homebrew API remote under `not-earlier`.
- [ ] AC23: On a `read_only` remote, fetch-and-cache refuses with a typed refusal before any
      upstream request, TTL revalidation does not run, the eviction pass skips the repository
      however far over quota it is, the freshness record is unchanged across the read-only
      window, and `thaw` restores all three (asserted at the network layer, sharing
      `repository-lifecycle.md` AC11's case). Deleting a remote ends every cached reference
      through the reference-ending call eviction uses and removes every current metadata
      document with its freshness record and declared blob-digest list in the same
      transaction, deletes no object, and the bytes leave the store only at the next sweep after
      grace.
- [ ] AC24: A cache refresh marks every cached metadata document and every negative entry of the
      remote due for revalidation, fetches nothing itself and creates no snapshot: the next real
      client request revalidates upstream inside the metadata TTL and a name negatively cached
      before the refresh is looked up upstream again inside the negative TTL (both asserted at
      the network layer), while a remote that received no refresh keeps both TTLs.
- [ ] AC25: Adopting a new upstream revision commits the new body or paired bodies, the advanced
      `adopted_at` and the effects of every hook registered on the adoption commit in one
      transaction: with `signing-service.md`'s `Adopt` registered, a remote's `FromUpstream`
      document and the `index.merge` job of every virtual listing the remote exist exactly when
      the adoption does; a hook that fails leaves the previous revision serving under its
      unchanged record and enqueues nothing; and a revision refused by the regression rule or an
      integrity failure runs no hook. The hook receives the records the handler's adoption check
      returned, and the check runs before any adoption.
- [ ] AC26: A remote reached only through a virtual is kept fresh by the virtual's reads: serving
      the virtual's merged document whose input from the remote is past the remote's TTL (or
      marked due by a refresh) enqueues, through `EnqueueRevalidation`, exactly one
      `proxy.revalidate` job per remote however
      many reads arrive in its window, the read itself is served the current merged set with no
      upstream request on its path, and the job's replay of the remote's own route makes one
      conditional upstream request per due document and, when the upstream changed, adopts it
      so the change is visible in the virtual within the merge's staleness bound. A member-input
      route the runtime derives from a document the job adopted in the same run (a `repomd.xml`'s
      hrefs) is replayed in the job's next round, a template route is expanded over the values
      the virtual's other members hold, and the job ends when a round returns no route not yet
      cached. A virtual's
      creation and a member-list change adding a never-adopted remote enqueue that remote's
      first fetch, so the virtual lists the remote's content with no request ever made to the
      remote's own URL. `EnqueueRevalidation` takes the caller's transaction: the creation and
      member-change enqueues exist exactly when their transaction commits and not after a
      rollback, and the read path's enqueue runs in a transaction holding only the job row, the
      read being served when that transaction fails. A replay meeting a
      `*upstream.RateLimitError` returns the job to `pending` with `run_at` no earlier than its
      `RetryAfter`, counted as an attempt, and no upstream request is made for the remote before
      then. Under `proxy.offline`, or with the remote `read_only` or deleted, no job is enqueued
      and a pending one ends without an upstream request. The replay is the only call into a
      handler that does not pass the shared authorizer, and the job is never scheduled; and
      `internal/proxy` imports neither `internal/index` nor `internal/signing`, the member-input
      paths of a never-adopted remote reaching the job through the interface this layer
      declares.
- [ ] AC27: A remote's retained revisions keep their blobs for exactly their declared lifetime
      and no longer. With a handler retaining one superseded revision and keeping, per revision,
      an index body and a lazily built map both above the inline threshold: after revision N+1
      is adopted, a sweep run with the repository's grace lapsed leaves N's body and map in the
      store, and a request for a file only N names, its cached reference evicted before the
      sweep, is re-fetched, verified against N's checksum and served; after N+2 is adopted, the
      next sweep past grace collects N's body and map, and a request for a file only N names
      answers `404` with no upstream request. A digest N's kept document only mentions in its
      body, undeclared, is collected by the first sweep past grace. A map for N finished after
      the adoption that dropped N is discarded and never declared. With the sweep paused after
      its mark and again after recording its deletion intents, an adoption and a map build
      committing in each pause leave every blob a current or retained revision declares in the
      store. A handler retaining two superseded revisions keeps N's blobs through N+2's
      adoption and releases them at N+3's, and a handler declaring zero releases N's body at
      N+1's adoption and declares nothing for a superseded revision. A set revisioned per package
      declares its blobs on that package's current document, not the repository-level one: two
      adoptions of different packages committing concurrently both succeed with no revision-token
      conflict on a shared row, and each package's retained blobs survive and are released on that
      package's own adoptions exactly as above.
- [ ] AC28: In the new-blob-beside-the-old variant, the adoption that changes a cached
      coordinate's checksum leaves the old blob's cached reference in place; the next request
      for the coordinate, from a client of either revision, fetches, verifies and serves the
      current revision's bytes, and the commit that creates the new blob's cached reference ends
      the old blob's in the same transaction, so no interleaving with the sweep leaves the
      coordinate with neither blob referenced or with both. The next sweep past grace collects
      the old blob, unless a hosted reference or another remote still holds its digest, and the
      divergence record naming both digests is still queryable afterwards. Where the cached file
      is addressed by its own digest (`homebrew.md`'s bottle remote), the new blob's commit ends
      nothing: a request for the old digest after the new commit and after a sweep past grace is
      served the old bytes from the store with no upstream request, and the old blob leaves only
      when LRU eviction ends its cached reference and the next sweep past grace runs.
- [ ] AC29: LRU eviction never reaches a remote's metadata. On a remote far over its quota,
      holding current documents at the repository, package and version levels, inline and
      CAS-backed, a paired set, a retained revision whose blobs are declared on a current
      document, and cached files, an eviction pass ends cached references of files only: every
      document, its freshness record and the paired set are unchanged, a sweep run afterwards with
      the grace lapsed leaves every CAS-backed document body and every declared blob in the store,
      a request for each document inside its TTL is served from the cache with no upstream request
      and the same `Last-Modified`, the same request under `proxy.offline` is served rather than
      failing as a miss, and the next adoption of a document advances its `adopted_at` beyond the
      value served before the pass even on an injected clock stepped backwards, and refuses an
      upstream revision older than the one adopted before the pass. The pass enqueues no
      `index.merge` and no `proxy.revalidate` for any virtual listing the remote. A document's body
      leaves the store only after an adoption supersedes it beyond the declared count, or after
      the remote's deletion, each followed by a sweep past grace. `cache_metadata_bytes{repository}`
      equals the inline bodies, CAS-backed bodies and declared blobs of the remote's current and
      retained metadata, and `cache_referenced_bytes{repository}` counts none of them. A cached
      file a declared list of the remote also holds counts in `cache_metadata_bytes` and not in
      `cache_referenced_bytes` while declared, survives the pass with its cached reference
      intact, and at the adoption that drops its digest from every list of the remote its bytes
      move to `cache_referenced_bytes` and the next pass may end it.
- [ ] AC30: The fetch-and-cache entry carries the two request fields its Obligation section
      gained from sibling specs, on a fixture handler through this layer's entry: a git location
      `{url, commit}` on a remote whose row names `https` is fetched through the `git` adapter
      under that row's allowlist with no credential presented to the git host, and is refused
      before any connection on a remote whose row names `distribution` or when its host is not
      on the row's allowlist (`upstream-adapters.md` AC34); and a request carrying an advisory
      key for a coordinate a rule condemns by that key is refused before any upstream request
      while the same request under the package name alone is not (`supply-chain-policy.md`
      AC24).
- [ ] AC31: A metadata fetch carrying an expected validator is served from the cache with no
      upstream request when the cached document's recorded validator of that algorithm matches,
      inside and past its TTL alike; when it differs, or the entry records no validator of that
      algorithm, the document is revalidated upstream before it is served even inside its TTL,
      the serve-stale rule applying if the upstream fails; a fetch without the field keeps the
      TTL rule unchanged; and under `proxy.offline` or on a `read_only` remote the cached
      document is served whichever way the comparison goes, with no upstream request (asserted
      at the network layer).

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
| AC13 | integration | `internal/proxy/upstream_removal_test.go` (test upstream presenting each event class of the table, including both immutability classes with a client holding the older metadata revision, both revision-bound variants, flag mirroring, an ordinary change with and without a handler-recorded divergence, a regression not adopted and a fetch-time integrity failure; a second remote repository of the same ecosystem and a hosted repository holding the same coordinate; network-level no-fetch assertion, record queried after a sweep, alert count across repeated revalidations; `cache_condemnations_total`, `cache_divergences_total`, `CachePurgedOnSignal`, `UpstreamDivergence` and the `cache.purge` audit event read through `telemetry.NewTestRecorder`) |
| AC14 | integration | `internal/proxy/eviction_test.go` (cached files the only eviction candidates, a file a declared list of the remote holds skipped while declared and evicted after the adoption that drops it; `cache_referenced_bytes`, `cache_quota_bytes`, `cache_evictions_total`, `cache_refetch_after_eviction_total` and the `CacheThrash` rule evaluated through `telemetry.NewTestRecorder`) |
| AC15 | ci | scheduled nightly workflow, proven by a written manual-dispatch procedure |
| AC16 | integration | `internal/proxy/eviction_test.go` (re-fetch between eviction and sweep, object-store delete assertion) |
| AC17 | integration + fault injection | `internal/proxy/singleflight_test.go` (per-client byte timelines against the commit, corrupt and truncated upstream bodies) |
| AC18 | integration | `internal/proxy/passive_detection_test.go` (injected clock across several TTLs with no traffic on the remote or on a virtual listing it, network-level assertion and an empty `proxy.revalidate` queue, then one request revalidating into a signal) |
| AC19 | integration | `internal/proxy/preconfigured_test.go` (fresh-install upstream set per shipped format, read from `internal/upstream/preconfigured`; `internal/upstream/preconfigured/profiles_test.go` is `upstream-adapters.md` AC24's equality test over the same set) |
| AC20 | integration + fault injection + architecture test | `internal/proxy/completion_mode_test.go` (neither-digest-nor-verifier refusal at the network layer; truncated, stalled and verifier-refused bodies against stand-ins; no `Blob` row and no negative entry; per-client byte timeline showing first byte before completion and completion after the verifier; short-close observed by `go`, `dotnet`, `mvn`, `composer` and `luarocks` in `conformance/<format>/proxied_test.go`; verdict recorded after commit with the client timeline unchanged; ordered candidates with an off-allowlist stand-in that fails on any connection) |
| AC21 | integration + conformance | `internal/proxy/singleflight_test.go` (waiter timelines with and without `FirstByteWithin`; short-close of attached waiters on a failing body); `conformance/julia/proxied_slow_test.go` (`julia.md` AC19's case: forty-second stand-in, two cold clients, one upstream fetch); a table test asserting which handlers declare the deadline; `internal/policy/refuse_until_scanned_test.go` (a `FirstByteWithin` fetch under refuse-until-scanned delivering no byte before the scan, shared with `supply-chain-policy.md`'s refuse-until-scanned case) |
| AC22 | integration + conformance | `internal/proxy/freshness_test.go` (record monotonic under a backwards clock and a backwards upstream date; under `exact`, equal, earlier and later-unequal conditions; under `not-earlier`, the same three with no `200` at or before the condition; older revision not adopted and divergence recorded; paired set committed atomically under concurrent reads; regenerated document has no `Signature` row, shared with `signing-service.md` AC20's assertion; the record's fields shared with `data-model.md` AC44; the rendering half is `signing-service.md` AC11's `internal/index/freshness_test.go` with the cache-scoped source); `conformance/debian/`, `conformance/arch/` and `conformance/luarocks/` proxied rollback cases with the real clients; `conformance/homebrew/freshness_test.go` (shared with `homebrew.md` AC4 and `signing-service.md` AC11: brew 7.0.6 against the API remote under `not-earlier`) |
| AC23 | integration | `internal/repository/readonly_remote_test.go` (shared with `repository-lifecycle.md` AC11: network-level assertion, eviction pass skipped over quota, record unchanged, `thaw`); `internal/proxy/eviction_test.go` (remote deletion ends references through the eviction call and removes current documents, records and declared lists in the same transaction, object-store delete assertion, blobs and document bodies gone only after the sweep; shared with `repository-lifecycle.md` AC16's `internal/repository/delete_remote_test.go`) |
| AC25 | integration + fault injection | `internal/proxy/adoption_test.go` (a registered hook's effects exist exactly when the adoption commits; an injected hook failure leaves the previous revision and record serving and no job enqueued; a regression and an integrity failure run no hook; the adoption check runs before commit and its records reach the hook); `internal/index/proxied_generation_test.go` (shared with `signing-service.md` AC20: `FromUpstream` inside the adoption through `Adopt`) |
| AC26 | integration + architecture test + conformance | `internal/proxy/revalidate_job_test.go` (many virtual reads past the remote's TTL or after a refresh enqueue one job per window; the read path makes no upstream request; the replay's conditional requests and adoption counted at the network layer; a fixture profile whose member-input routes derive from an adopted index replayed in a second round and a template route expanded over another member's values, the job ending when a round adds nothing; creation and member addition enqueue a first fetch in their transaction, absent after a rollback; the read-path enqueue in an enqueue-only transaction, a failed one still serving the read; a rate-limited replay deferred past `RetryAfter` as a counted attempt with no upstream request before it; `proxy.offline`, `read_only` and deletion enqueue nothing and end a pending job without a request; no `Schedule` of the kind exists; the discarding writer), shared with `signing-service.md` AC35's `internal/index/virtual_remote_member_test.go`, with `async-operations.md` AC29 (the kind on the production runner) and AC30 (no principal, the marker kept out of `last_error` and logs), and with `auth.md` AC36 (the discarding-writer case); `internal/proxy/arch_test.go` (the replay is the sole call into a handler below the shared authorizer, shared with `auth.md` AC36; no import of `internal/index` or `internal/signing`, shared with `signing-service.md` AC35); `conformance/opam/virtual_test.go` (shared with `opam.md` AC26 and `signing-service.md` AC35: the virtual lists a remote's packages with no request to the remote's own URL) |
| AC24 | integration + conformance | `internal/manage/refresh_test.go` (shared with `management-api.md` AC29: metadata and negative entries marked due, no fetch, no snapshot); `conformance/oci/refresh_test.go` (a real client's next pull revalidates inside the TTL, and a negatively cached tag is looked up again, observed at the upstream stand-in) |
| AC27 | integration + fault injection + property | `internal/proxy/retained_revision_test.go` (a fixture handler retaining one and then two superseded revisions, bodies and maps above the inline threshold, a stand-in counting upstream requests; a sweep on an injected clock with the grace lapsed after each adoption, the object store read after each; a retained revision's file evicted, re-fetched and verified against its checksum; an undeclared mentioned digest collected; a late map build discarded after its revision is dropped; the sweep paused after its mark and after intent recording while an adoption and a map build commit; a fixture handler declaring zero, the old body collected after N+1; a per-package set declared on package-level documents, two adoptions of different packages committed concurrently with no revision-token retry counted, each package's retained blobs released on its own adoptions); `internal/storage/gc_property_test.go` (declared-list births and ends interleaved with the sweep, the operation `storage-and-gc.md` AC16 already generates, with the adoption and the map build as its producers, on repository-level and package-level declaring documents) |
| AC28 | integration + fault injection | `internal/proxy/upstream_removal_test.go` (the new-blob variant: the old reference through the adoption and a sweep past grace; clients of both revisions served the current bytes; the reference move in one transaction with the sweep paused between its mark and its delete pass across the commit; the old blob collected at the next sweep and kept while a hosted repository references the same digest; the divergence record read afterwards; the digest-addressed case: the old digest served from the store across the new commit and a sweep past grace with no upstream request, then released only by an eviction and the following sweep), shared with `homebrew.md` AC13's `internal/format/homebrew/removal_test.go` |
| AC29 | integration + property | `internal/proxy/metadata_eviction_test.go` (a remote over quota holding documents at all three levels, inline and CAS-backed, a paired set, a declared retained revision and cached files; an eviction pass ends file references only, documents, records and paired set compared before and after; a sweep with the grace lapsed and the object store read; each document requested inside its TTL at the network layer, with and without `proxy.offline`; the next adoption on an injected clock stepped backwards and an older upstream revision refused; the `index.merge` and `proxy.revalidate` queues empty after the pass; supersession beyond the count and remote deletion each followed by a sweep; a cached file also on a declared list surviving the pass and counted in `cache_metadata_bytes` only, then moving to `cache_referenced_bytes` and evicted after the adoption that drops it, shared with `rpm.md`'s was-Q11 case; `cache_metadata_bytes` and `cache_referenced_bytes` read through `telemetry.NewTestRecorder`); `internal/storage/gc_property_test.go` (the eviction operation run over a remote holding current and retained documents, which must end no document reference, shared with `storage-and-gc.md` AC16) |
| AC30 | integration | `internal/proxy/fetch_request_test.go` (fixture handler: a git location on an `https` row fetched through the `git` adapter with no credential at the git host, refused before connect on a `distribution` row and for an unlisted host, each asserted at the network layer, the adapter half shared with `upstream-adapters.md` AC34's `internal/upstream/router_git_test.go`; an advisory-keyed request refused before any upstream request and the name-only request fetched, shared with `supply-chain-policy.md` AC24's `internal/policy/advisory_key_test.go`) |
| AC31 | integration | `internal/proxy/ttl_test.go` (expected validator: a matching recorded validator served inside and past the TTL with no upstream request; a differing one and an entry with no validator of that algorithm revalidated before serving inside the TTL, the stale header set when the stand-in fails; a fetch without the field under the TTL rule; `proxy.offline` and `read_only` serving the cached document either way; shared with `rubygems.md` AC19's `/info` case) |

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
  candidates (AC20), and the `FirstByteWithin` waiter exception (AC21); the git location and
  advisory-key request fields (AC30), each exercised when its first consumer lands (the git
  location with `terraform.md`'s proxied phase and `upstream-adapters.md` Phase 4, the advisory
  key with `supply-chain-policy.md`'s matcher)

### Phase 2: Policy
- TTLs, conditional revalidation, negative caching, serve-stale bounded and marked, the
  cache-scoped freshness record with paired document sets and never adopting an older revision,
  rendered through `signing-service.md`'s serving door under each document's declared
  conditional rule (AC22), the handler's adoption check and the adoption commit with its hook
  (AC25), the retained-revision set with its declared count (zero valid) and the declared
  blob-digest list of the set's declaring document, repository-level or package-level, rewritten
  by each adoption and appended by map builds (AC27), the
  `proxy.revalidate` job kind with `EnqueueRevalidation` taking the caller's transaction, the
  `RetryAt` deferral on a rate limit, and the replay of the handler's route below the authorizer
  (AC26), the cache refresh's layer half (AC24), the expected-validator condition on a metadata
  fetch (AC31). The job kind
  needs `async-operations.md`'s queue core, which lands at the start of charter step 4b; the
  replay has its first caller only when a format with a `Merge` builds its virtual phase, so
  AC26's conformance half waits on that format

### Phase 3: Operability
- Instance-wide offline mode (`proxy.offline`), encrypted upstream credentials through the
  adapter spec's redactor (AC6), LRU eviction under per-repository
  quota ending the cached reference only with reclamation left to the GC sweep, selecting cached
  files only, never a remote's metadata and never a file a declared list of the remote holds,
  with `cache_metadata_bytes` beside the quota (AC29),
  the
  `read_only` and deletion halves of `repository-lifecycle.md` (AC23), the
  security-signal rule's upstream channel (the condemnation record, the purge as ending cached
  references, refusal before any upstream fetch, one alert per condemnation) with passive
  detection and its exposure stated in the operator documentation, the event-class table
  executed from handler classifications (AC13) with the old blob's cached reference ending at
  the new blob's commit in the new-blob variant and kept until eviction where the file is
  digest-addressed (AC28), divergence flagging, the `observability.md`
  metric, alert and audit names (AC10, AC13, AC14), the preconfigured upstream set (AC19), the
  nightly real-upstream job with its NuGet and Maven Central rows

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None remain open. Q15 to Q22 were raised and adopted on 2026-09-28 on Opus while Fable was out of
credit, each under the owner's standing delegation, and each was re-examined on Fable on
2026-09-30 as if decided fresh: Q21 and Q22 (whether LRU eviction reaches a remote's current
metadata, it does not, and which document carries a per-package set's declared list, the
package-level one) confirmed, Q21 with its cost restated and an eviction-accounting amendment for
a file a declared list also holds; Q19 and Q20 (what keeps a remote's retained revisions alive,
and the old blob of a revision-bound violation) confirmed after an adversarial pass over every
format that declares under them; Q18 (the `proxy.revalidate` replay) amended, its member-input
interface now answering for the remote's current state in bounded rounds; Q15 (the
completion-only mode) confirmed; Q16 (`FirstByteWithin`) amended with its composition under
refuse-until-scanned; Q17 (the second extension of the preconfigured set) confirmed with its rule
stated precisely and flagged to the owner as the second extension of a set the owner settled.
Every one stays reversible by the owner; the verdict and what it changed is on each record. Q14 was raised and adopted on 2026-09-26 by the Wave 1 reconciliation, under
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

### Resolved: whether LRU eviction reaches a remote's metadata (was Q21, raised and adopted 2026-09-28)

**Adopted 2026-09-28 under the owner's standing delegation**, in the second wave of the data-loss
fix, on Opus. Option A: a remote's current metadata documents, at every level, are current
documents under the fourth mark root's current-document half and are never LRU-evicted; the
eviction pass selects cached files only. A document changes only when an adoption supersedes it
(its old body released unless the handler's declared count retains it) and ends only with the
remote's deletion. Metadata sits outside the quota's referenced bytes and is reported beside it as
`cache_metadata_bytes{repository}`. Folded into Scope, "The distinction that governs everything",
"Freshness of what a remote serves", Interaction with GC ("Eviction never reaches a remote's
metadata" and the quota bullet), the Obligation section, AC14, the new AC29 and Phase 3, and into
`data-model.md` (the cache-scoped record's bullet and non-root row, AC44) and `storage-and-gc.md`
(the fourth root's current-document half and its end of life, the property suite's eviction
operation, AC16).

The question: three specs disagreed on it. `data-model.md`'s non-root row called a remote's
current-document entry "a cached reference (the second root) or an evicted one", and its AC44
dropped the freshness record "with its entry at eviction"; this spec's retained-revision decision
(was Q19), the fourth root's motivating case under Interaction with GC, and `storage-and-gc.md`
AC16 treat a remote's current metadata as fourth-root current documents that eviction never
touches. Read the first way, a proxied repository's live index (a packument, an `APKINDEX`, a
conda `repodata.json`, an `InRelease`) could be evicted while it serves, and nothing said what the
next request for it receives or what happens to a virtual that merged it; read the second way, a
remote's metadata grows outside the quota, which nothing said either.

What evicting a document would break, each rule already settled: the freshness record moves
forward "whatever the clock does" only because every adoption reads the previous value, which an
evicted entry no longer has (AC22, `data-model.md` AC44); the regression rule compares against the
adopted revision, so after an eviction an upstream rolled back would be adopted silently, the apt
and TUF case the rule exists for; the declared list that keeps a retained revision's blobs sits on
a current document, so evicting it drops every retained revision at once, the unverifiable-files
outcome Q19's option B lost to; offline mode serves everything cached, and a cached file whose
metadata was evicted is unreachable by name; a paired set would have to evict as one; and a
per-request virtual would see a member's freshness value vanish and return, while a merging one
would either re-merge without the member's content or block on its re-fetch.

**Recommendation:** A, because every rule above already assumes it, it needs no new record and no
new root, and the quota then bounds exactly the class a pass can always reduce.

| Option | You get | It costs |
|---|---|---|
| **A. A remote's current documents are never evicted; the quota bounds cached files; metadata reported as its own gauge** | Freshness, regression, retained revisions, paired sets and offline serving hold for the remote's whole life with no new mechanism; a virtual's inputs never vanish under a member's quota pressure; an eviction pass can always reach its target; no new root and no schema change | Metadata storage bounded by the distinct names clients requested and the upstream index size times one plus the retention count, not by the quota; a document for a name nobody requests any more stays until the remote is deleted; one new gauge in `observability.md`'s catalogue |
| **B. Documents evictable under LRU like files, the record dropped with them** | One quota bounds all of a remote's storage | Each of the breaks above needs its own repair (a per-remote freshness high-water mark, an ordering value that outlives its document, retained sets evicted as a unit, an offline hole, re-merge or blocking on eviction); an index every request reads thrashes, a 188 MB conda-forge `repodata.json` re-fetched in full by the request after each eviction, instead of freeing space |
| **C. Evict package-level documents only, keeping a stub of the freshness record and ordering value; repository-level documents never** | Bounds per-name metadata (npm packuments, Simple pages), where unbounded growth actually lives, while freshness and regression survive through the stub | A stub is a new non-root record in `data-model.md`; offline serving and a virtual's inputs still break for evicted names; a per-package retained set (`puppet.md`, `vagrant.md`) is evicted with its document; two eviction classes in one pass and a quota split between them |

**Why this is yours:** it decides whether a remote's quota bounds all of its storage or only its
cached files, and whether a name a remote has served can ever stop resolving under quota pressure.

Accepted cost: metadata outside the quota, growing with the names requested and never reclaimed
short of deleting the remote, made visible through `cache_metadata_bytes` rather than bounded. B
lost to five separate repairs for a thrash that frees nothing on an index every request reads; C
to a new record and two still-broken rules for a bound on the per-name share alone. If per-name
growth proves material in operation, C's stub is the revision to raise then, with that evidence.

Rechecked on Fable 2026-09-30: confirmed, with the cost restated at its true magnitude, which the
record understated: gigabytes over the life of a busy npm or PyPI remote, with deleting the remote
as the operator's only lever and `cache_metadata_bytes` the thing to alert on (Design, Interaction
with GC). Amended in one place the fold did not reach: a cached file that a declared list of the
remote also holds (`rpm.md`'s resolved merge-input decision, was its Q11) is not an eviction
candidate while declared and counts in the metadata gauge, not the quota's, since ending its
reference reclaims nothing and forces a re-fetch of tens of megabytes (AC14, AC29).

### Resolved: which document carries a remote's declared blob-digest list (was Q22, raised and adopted 2026-09-28)

**Adopted 2026-09-28 under the owner's standing delegation**, in the same pass, on Opus. Option A:
a revisioned document set's kept blobs are declared on the current document at the set's own
level, the remote's repository-level document for a repository-wide index and the package-level
document for a set revisioned per package; an adoption and a map build rewrite that document's
row only, under its own revision token. Folded into Scope, "What a remote keeps past its current
revision", the adoption-commit bullet, the Obligation section, AC27 and Phase 2, and into
`data-model.md` ("Declared blob digests on a document, inline or CAS-backed", AC37) and
`storage-and-gc.md` (the fourth root's third reach, the property suite's declared-list producers,
AC16).

The question: Q19 put every kept blob on the repository-level document's list. `puppet.md` and
`vagrant.md` revision their sets per module and per box, so every adoption of any package rewrote
the one repository-level row: adoptions of different packages serialised on that row's revision
token and retried under contention, and the list grew with every package the remote had served,
rewritten whole at each adoption. `data-model.md` already makes the list a field of any document's
row, so the placement was a choice Q19 made for the formats it had, not a constraint.

**Recommendation:** A, because it puts the list on the row the adoption already writes, so no
adoption touches another package's state.

| Option | You get | It costs |
|---|---|---|
| **A. The list on the current document at the set's own level** | No shared row between packages, so no serialisation and no retry storm on a busy remote; each list sized to one package's kept revisions; no reach change, since the fourth root already marks the declared list of any current document | The property suite must generate a package-level declaring document on a remote; `puppet.md` and `vagrant.md` move their lists; safe only because no eviction reaches a package-level document (Q21) |
| **B. Keep one repository-level list per remote** | One place to read everything a remote keeps | Every adoption serialises on one row; the list's size and rewrite cost grow with every package served |
| **C. Let each handler choose per set, with no rule** | Flexibility | Two placements for the same shape, and a reviewer cannot tell a deliberate choice from an accident |

**Why this is yours:** it sets where a remote's keep-alive lives, which the GC property suite and
two format specs build against.

Accepted cost: a second declaring level to generate and test, and the two format specs' edits. B
lost to the serialisation it builds into every per-package remote; C to having no rule.

Rechecked on Fable 2026-09-30: confirmed. A package-level document on a remote is created at the
first request for the name and ended only by the remote's deletion, so a per-package remote's
document count grows with the names requested; that is the metadata-eviction decision's stated
cost, not a new one.

### Resolved: what keeps a remote's retained revisions alive (was Q19, raised and adopted 2026-09-28)

**Adopted 2026-09-28 under the owner's standing delegation**, in the data-loss fix following
`storage-and-gc.md`'s closing sweep, on Opus. Option A: every blob a handler keeps for a current or
retained revision is on the declared blob-digest list of the remote's repository-level document,
and the lifetime is a count of superseded revisions the handler declares, one by default, rewritten
by each adoption in its own transaction. Folded into Scope, Design ("What a remote keeps past its
current revision" under Interaction with GC, the adoption-commit bullet, the Obligation section),
AC27 and Phase 2, and into `rpm.md`, `alpine.md`, `arch.md`, `hackage.md` and `debian.md`.

The question: five formats keep a superseded upstream revision on a remote so that a client holding
it is not broken (`rpm.md`, `alpine.md` and `arch.md` "retained revisions" with a per-revision
filename or location map stored as CAS-backed metadata, `hackage.md`'s previous revision, and
`debian.md`'s two previous envelopes), and each said the revision's blobs live "while the revision
is retained". `storage-and-gc.md` settled that a digest a document merely mentions keeps nothing
alive and that a remote has no snapshots, so nothing held them: the first sweep past grace would
collect a map while a client's request still needs it. None of the five said how long a revision is
retained either.

**Recommendation:** A, because it uses the one keep-alive a document has, adds no mark root, and
ties the lifetime to the adoption, the only moment the remote's view of its upstream changes.

| Option | You get | It costs |
|---|---|---|
| **A. Declared list on the remote's repository-level document, lifetime a handler-declared count (one by default)** | The fourth root's existing reach, no new root and no schema change; the lifetime set in the adoption's own transaction, so a sweep sees a revision's blobs either declared or not; storage bounded by the count; the sweep race covered by the declared-list operation the property suite already generates | Retained metadata sits outside the quota's referenced bytes, bounded by the count; a lazily built map becomes a reference creation through the shared call, refused once its revision is dropped; a client holding a revision older than every retained one gets `404` on a file only that revision names |
| **B. Hold the blobs through cached references under LRU** | Retained metadata counted against the quota and evicted with everything else | A map or an index body is not a file, so it needs a `File`-shaped row for non-file metadata, a `data-model.md` change; eviction can take a retained revision's map while its files are still requested, leaving them unverifiable; the lifetime is whatever LRU gives, which no client can reason about |
| **C. Retain by time, a `proxy.revision_retention` duration** | Behaviour independent of how often the upstream publishes | A job to drop expired revisions, a write outside the adoption, a new key in `deployment.md`'s table, and storage proportional to upstream churn over the window (Hackage's index changes with every upload) |

**Why this is yours:** it sets how far back a client of a remote can lag and still install, and it
decides whether a remote's metadata may grow outside its quota.

Accepted cost: retained metadata outside the quota, bounded by the count; the map build's
reference creation and its refusal after the drop; and a `404` for a client older than every
retained revision, which is still gentler than the upstreams (Alpine's and Arch's mirrors answer
`404` for a superseded build at once, live in `alpine.md` and `arch.md`). B lost to the missing row
and to eviction breaking a revision it had not dropped; C to the job, the key and churn-scaled
storage. `debian.md` declares two, its format's own `by-hash` rule; the other four declare one.

Extended 2026-09-28, outcome unchanged: a declared count of zero is valid where no route reads a
superseded revision (`homebrew.md`'s API documents and manifests; `cpan.md` retains none);
`puppet.md` and `vagrant.md` declare one per module and per box, `vagrant.md` also declaring the
current revision's upstream body, which its rendered catalog leaves as no document's body; the
list sits on the document at the set's own level (the resolved declaring-document decision above,
was Q22); and the declaring document is never evicted (the resolved metadata-eviction decision
above, was Q21), which is what makes "a current document" a lifetime rather than a hope.

Rechecked on Fable 2026-09-30: confirmed. Tested adversarially against every format that declares
under it (`rpm.md`, `alpine.md`, `arch.md`, `hackage.md`, `debian.md`, `puppet.md`, `vagrant.md`,
and the zero-count declarers `homebrew.md`, `cpan.md`, `conda.md`, `cran.md`, `swift.md` and
`rubygems.md`): no path was found by which bytes a current or retained revision can still serve
become collectable, because every such blob is either a cached file re-fetched and re-verified
after eviction or on a list rewritten in the adoption's own transaction with the delete pass's
re-check counting it, and growth per set is bounded by one plus the count. The zero-count
examples were extended to conda, cran, swift and rubygems in Design.

### Resolved: the old blob of a revision-bound violation (was Q20, raised and adopted 2026-09-28)

**Adopted 2026-09-28 under the owner's standing delegation**, in the same fix, on Opus. Option A:
in the new-blob-beside-the-old variant the route resolves a digest-less path against the current
revision, and the commit that creates the new blob's cached reference at the coordinate ends the
old blob's in the same transaction; the sweep then reclaims the old blob. Folded into Scope, the
event-class table and the paragraph beneath it, AC13, AC28 and Phase 3, and into the removal tables
and criteria of `rpm.md`, `alpine.md`, `arch.md`, `hackage.md` and `cpan.md`.

The question: the variant said "the old blob stays servable while a retained metadata revision names
it", held by nothing the sweep follows. Before choosing a keep-alive it has to be asked who reads the
old blob. The class's own definition already said the route follows "the current one where the path
carries no digest", and every format in the variant requests a digest-less path (an RPM `location
href`, an apk `{P}-{V}.apk`, a pacman `%FILENAME%`, a Hackage tarball path, a CPAN author path), so
no route can tell which revision the client holds, and the claim in three format specs that each
revision's clients receive their own bytes could not be implemented.

**Recommendation:** A, because it keeps nothing that nothing serves and states what the wire allows.

| Option | You get | It costs |
|---|---|---|
| **A. End the old reference at the new commit; the route follows the current revision** | No storage held for bytes no request can reach; no schema change; a single reference per coordinate, moved in one transaction, so a sweep sees one blob or the other | A client still holding the older revision receives the current bytes and fails its own check until its next metadata refresh, exactly as against the upstream; `rpm.md`, `alpine.md` and `arch.md` withdraw the claim that each revision's clients get their own bytes |
| **B. Keep the old blob through a second cached reference until no retained revision names it** | The old bytes stay in the store for as long as a revision names them | No request can be served them, so it is storage nothing reads and a criterion no client can exercise; a second `File` per filename in a remote's version, a `data-model.md` change |
| **C. Put the old digest on the remote's declared list while a retained revision names it** | The same retention without a second `File` | As B, plus the bytes escape the quota and eviction |

**Why this is yours:** it changes what three format specs promised their clients, and it decides that
a remote does not preserve bytes the upstream replaced.

Accepted cost: the older-revision client's failure until it refreshes, the withdrawn claim, and
bytes the upstream replaced leaving the store at the next sweep; the divergence record keeps both
digests, so the replacement stays explainable. B and C lost because the bytes they keep have no
reader. A format whose request carries the revision or a digest would need B, raised as a revision
of the class when it arrives.

Extended 2026-09-28, outcome unchanged for the five: `homebrew.md` arrived with a route that
carries the digest (its OCI-shaped `blobs/sha256:{digest}`) and needed neither B nor a revision of
the class, because its cached bottle is a `File` addressed by that digest, so the rebuilt blob is a
second coordinate and the old one keeps its ordinary cached reference until LRU eviction (its
resolved rebuilt-tag decision, was its Q15). It sits in the new-blob variant, its flat route
following the current index, and AC28 carries the digest-addressed case. What would still need B
is a request carrying the **revision** at a digest-less path.

Rechecked on Fable 2026-09-30: confirmed. The test that decides the class is whether the request
carries a digest or a revision, stated under the event-class table, and `homebrew.md` is the
worked example of the digest case; a client mid-download of the old blob when the new commit ends
its reference is protected by the repository grace like any read across an eviction, which is
`storage-and-gc.md`'s rule and adds nothing here.

### Resolved: revalidating a remote reached only through a virtual (was Q18, raised and adopted 2026-09-28)

**Adopted 2026-09-28 under the owner's standing delegation**, in the closing reconciliation sweep,
on Opus. Option A: a job kind, `proxy.revalidate`, coalesced per remote, enqueued by a virtual's
read of a merged input past the remote's TTL and by a virtual's creation or a member-list change
adding a never-adopted remote, which replays the handler's own proxied route in process, below the
shared authorizer, with the current validators and a discarding writer. Folded into Scope, Design
("Revalidation outside the request", the adoption-commit bullet, the passive-detection paragraph,
negative caching's refresh, the Obligation section), AC18, AC26, Phase 2, and an extension note
on the was-Q12 record.

The question: `signing-service.md` adopted that the virtual's reads drive a remote member's
revalidation off the request path and that creation fetches a new remote (its resolved
remote-member decision, was its Q16, AC35), and left the seam here. A job has no request, but this
layer's revalidation is request-shaped: the upstream location is the handler's derivation, the
regression rule needs the format's ordering, the event classes are read off the format's own
wire, and `FromUpstream` needs the records the handler parses. Something must reach the handler.

**Recommendation:** A, because it makes the job a client of the remote rather than a second
revalidation path, which is the duplicated-path trap `CLAUDE.md` names, and it changes no pinned
method.

| Option | You get | It costs |
|---|---|---|
| **A. Replay the handler's own route in process, below the authorizer** | One revalidation path for direct clients and virtuals; the handler's derivation, adoption check and classification run unchanged; no new interface, the pin stays five; a conditional replay is a `304` with no render when nothing changed | A second call into a handler that does not pass the shared authorizer, held to one call site by an architecture test; each cached document's route recorded at first fetch, and for a never-adopted remote the member-input routes declared in the format's generator profile; discarded rendering work when a document did change |
| **B. A fourth optional handler interface, `Revalidator`, discovered at registration** | An explicit call with typed arguments; no synthetic request | A parallel metadata path in every format with a `Merge` that must stay equal to its request path, and a `format-handler-interface.md` re-open input against its three-interfaces verdict |
| **C. Revalidate in this layer alone from the recorded location and validators** | Nothing reaches a handler; a `304` costs one upstream request | A changed body cannot be classified, ordered or parsed without the handler, so signals and regressions on a remote reached only through a virtual go undetected, or the format knowledge moves into the layer |

**Why this is yours:** it opens an entry into handlers that bypasses the shared authorizer, a
boundary `CLAUDE.md` says must have a named enforcer, and it sets who pays for keeping a virtual's
remote members fresh.

Accepted cost: the below-authorizer entry (no principal, a replay marker, one call site asserted
in `internal/proxy/arch_test.go`, nothing returned to anyone), the recorded routes, the profile
declaration reported to `signing-service.md`, and discarded rendering when a document changed. B
lost to the duplicated path it creates in every merging format; C to the signals and regressions it
cannot see.

Later note (2026-09-28, the closing sweep's leftovers pass): every counterpart this record reported
has landed. `format-handler-interface.md` builds the entry in the composition root and injects it
into `internal/proxy` alone (its resolved replay-entry decision, was Q11 there, AC18); `auth.md`
names it the one entry that skips its authorizer and puts it on AC10's review surface (its AC36);
`async-operations.md` runs the kind and gives it no principal (its AC29, AC30, and its resolved
retry-time decision, was Q11 there, for the rate-limit deferral); and `signing-service.md` declares
the member-input paths in its `Profile` and fixed the import direction between the two packages
(its AC35 and its resolved proxy-import decision, was Q19 there). `EnqueueRevalidation` takes the
caller's transaction as the queue requires.

Rechecked on Fable 2026-09-30: amended. The adoption stands and its security bound is sound
(auth AC36, `format-handler-interface.md` AC18, one call site, no principal, the response
discarded), but its fold under-specified what the member-input interface returns. A static list
of declared paths cannot express a template expanded over the other members' values or a route
derived from a document adopted in the same job (a `repomd.xml`'s hrefs, `cpan.md`'s per-author
`CHECKSUMS`, `debian.md`'s paths under an envelope), which the format closing sweep found in four
formats; the interface now answers for the remote's current state and the job replays in bounded
rounds (Design, "Revalidation outside the request"; AC26). `signing-service.md` AC35's "exactly
the paths the profile declares" needs the matching change, reported as a consequence.

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

Rechecked on Fable 2026-09-30: confirmed. One cost the record left implicit is inherited from the
was-Q6 decision rather than new to this one: a verifier refusal creates no negative entry, so an
upstream that persistently serves a malformed body is re-fetched whole on every sequential request,
bounded only by coalescing and made visible through `cache_fetch_failures_total` and
`FetchIntegrityFailure`; the same holds for a digest mismatch under stream-and-verify, and a
backoff for repeated integrity failures is a revision to raise with operational evidence, not now.

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

Rechecked on Fable 2026-09-30: amended. The adoption stands; its fold omitted the composition
with `supply-chain-policy.md`'s refuse-until-scanned setting, under which no byte may reach any
client before the scan lands, so `FirstByteWithin` is not honoured there and a deadline-bearing
client fails its cold misses on such a repository, the setting's own cost made visible (Design,
Miss coalescing; AC21).

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

Rechecked on Fable 2026-09-30: confirmed, with the rule stated precisely, since it extends a set
the owner settled for the second time: the was-Q14 rule is a necessary condition, not a
sufficient one, and the trigger for each entry is the format's own adopted request for it. Go
modules, Helm, Debian and RPM are Tier 1 too and none asked (`go-modules.md` captures against
proxy.golang.org and requests no preconfiguration), so the set is six, not every Tier 1 upstream.
The owner may hold the set at any size; each entry is reversible by removing its profile row.

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

Extended 2026-09-28, outcome unchanged: a remote reached only through a virtual is revalidated
when the virtual is read, by the `proxy.revalidate` replay (the resolved revalidation-replay
decision, was Q18). That is client demand arriving through the virtual, never a schedule, so no
upstream is polled that no client is reading.

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
Extended again the same day by the metadata-eviction decision (was Q21): the cached content eviction
reaches is cached files; a remote's current metadata is never evicted and sits outside the quota,
reported as `cache_metadata_bytes`, so a deleted remote's documents end with the deletion itself
(`repository-lifecycle.md`, "Deletion" step 5), not through eviction's call.

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
| 2026-09-28 | 6e6d503 | cross-spec reconciliation sweep of the foundation wave. Not a review | Not a review. Applied sweep 1 item 2, verified against `data-model.md`'s current text: the cache-scoped freshness record is cited as that spec's ("Freshness scoped to the pointer, and the documents that hang on it", AC44) instead of "reported as a sibling consequence", and AC22's Test Plan row records `internal/proxy/freshness_test.go` as shared with AC44. `management-api.md` reconciliation 3 and proxy-cache reconciliation 6 were already this spec's own text (AC24). No question raised or adopted; `node scripts/check-spec.js` zero failures on this file. Stays draft pending a gate review. |
| 2026-09-28 | 181a63b | closing reconciliation sweep of the format batch 3 to 8 items and the signing-service closing-sweep item, on Opus. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` targeting this file from "From format batch 3 reconciliation" through "From the signing-service.md closing sweep" verified against the current text of the spec that raised it and of the format spec each row concerns. Signing-service closing sweep item 1: AC22 and "Freshness of what a remote serves" reworded so its two clauses are the two conditional rules of `signing-service.md`'s resolved later-condition decision (was its Q12), matched to its Design text and AC11 (`exact` default, `not-earlier` declared, brew's API remote per `homebrew.md` AC4), rendered through its serving door, cached files through `ServeFile`; the adoption commit made one transaction with a hook `Adopt` registers on (its was-Q16), fed by a new adoption check in the fetch-and-cache request (AC25); the revalidation seam adopted as Q18 (the `proxy.revalidate` job, coalesced per remote, enqueued by virtual reads past the TTL and by creation or member addition, replaying the handler's route below the authorizer; Option B, a fourth optional interface, and C, layer-only revalidation, rejected), folded through Scope, Design, the passive-detection paragraph, the refresh paragraph, AC18, AC26 and Phase 2, with an extension note on the was-Q12 record. Batch 7 item 2 is the same rewording and batch 7 item 5 the same seam. Event-class table: batch 4 item 6 (conda), batch 5 item 9 (hex, terraform, luarocks; luarocks.org and the Terraform registries), batch 6 item 13 (hackage, cpan), batch 7 item 13 (vagrant, composer, opam), batch 8 item 11 (swift, pub, pub.dev), each row read from that format's own removal table; the revision-bound class now names its two variants and the ordinary class a handler-recorded divergence (cpan, opam), AC13 and its row extended; `cpan.md`'s signature-verdict row recorded as in no class. Batch 4 item 6's Alpine half: named as a completion-only verifier consumer with swift, vagrant, chef, julia, hex and homebrew. Earlier items found already done: every item before format batch 3 is in the progress log and verified in the text (Open items 12 to 32 rows and requests, theme 7, upstream-adapters 1 to 3, repository-lifecycle 14, sweep 1 item 2); puppet's per-module gating (Open item 25) is handler-local in `puppet.md` and needs nothing here. Consequences for `async-operations.md` (the new kind), `signing-service.md`, `format-handler-interface.md`, `auth.md` and `homebrew.md` reported, not applied. One question adopted on Opus, so `fable_recheck` added. `node scripts/check-spec.js`: zero failures on this file. Stays draft pending a gate review. |
| 2026-09-28 | 93982ba | data-loss fix on Opus (storage-and-gc closing-sweep item 0): cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Applied item 0 of "From the storage-and-gc.md closing sweep" in `agents/spec-loop/consequences.md`, verified against `storage-and-gc.md`'s fourth mark root (its third reach, AC16) and `data-model.md` AC34, AC36 and AC45: a digest a document merely mentions keeps nothing alive, the declared blob-digest list is a document's only keep-alive, and a remote writes no content snapshot. The hole: the event-class row said the old blob "stays servable while a retained metadata revision names it", and five format specs kept retained revisions and per-revision maps as CAS-backed metadata named only inside a remote's document, so the sweep would collect them while clients could still request them. Two questions raised in decision shape and adopted under the standing delegation, `fable_recheck` extended. Q19: every blob a handler keeps for a current or retained revision is on the declared blob-digest list of the remote's repository-level document, the lifetime a handler-declared count of superseded revisions (one by default, `debian.md` two), rewritten by each adoption in its own transaction; a lazily built map is a reference creation through the shared call, discarded once its revision is dropped; files stay on their own cached references (B, cached references for metadata, lost to the missing `File` row and to eviction breaking a revision it had not dropped; C, time-based retention, to the job, the key and churn-scaled storage). Q20: in the new-blob variant the route follows the current revision, since every format in it requests a digest-less path, and the new blob's commit ends the old blob's cached reference in the same transaction (B and C kept bytes no request can reach). Folded into Scope, the event-class row and the paragraph beneath it, the adoption-commit bullet, a new "What a remote keeps past its current revision" under Interaction with GC, the Obligation section (kept digests from the adoption check, the retention count), AC13, Phases 2 and 3. AC27 (retained blobs survive a sweep with the grace lapsed and with the sweep paused after its mark and after intent recording across an adoption and a map build, and are collected after the dropping adoption) and AC28 (the reference move, both revisions' clients served the current bytes, the old blob collected, the divergence record kept) added with Test Plan rows naming `internal/proxy/retained_revision_test.go`, `internal/proxy/upstream_removal_test.go` and the shared `internal/storage/gc_property_test.go`. No mark root added; the set stays five. `node scripts/check-spec.js`: zero failures on this file. Stays draft pending a gate review. |
| 2026-09-28 | f0bfe75 | metadata-eviction reconciliation on Opus (data-loss fix second wave, items 0 and 1): cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Item 0 of "From the data-loss fix second wave" in `agents/spec-loop/consequences.md`, verified against `data-model.md`'s non-root row and AC44 and `storage-and-gc.md`'s fourth root and AC16: the three specs disagreed on whether a remote's current metadata could be LRU-evicted, which read one way let a proxied repository's live index be collected. Raised and adopted Q21 under the standing delegation (A: a remote's current documents at every level are never evicted, the pass selects cached files only, a document changes only by adoption and ends only with the remote's deletion, metadata outside the quota and reported as `cache_metadata_bytes{repository}`; B, documents evictable, lost to five separate repairs of settled rules (freshness, regression, retained revisions, offline, virtual inputs) and to an index every request reads thrashing; C, a package-level stub, to a new record and still-broken offline and virtual rules), folded through Scope, "The distinction that governs everything", "Freshness of what a remote serves", the new "Eviction never reaches a remote's metadata" paragraph and the quota bullet under Interaction with GC, the Obligation section, AC14, the new AC29 and Phase 3, and extension notes on was-Q8 and was-Q19. Item 1: homebrew moved from kept bytes to the new-blob variant as a digest-addressed `File` whose old blob keeps its cached reference until eviction, the paragraph under the table naming its OCI-shaped route, AC28 extended and a was-Q20 extension note; a declared count of zero made valid (homebrew's API documents and manifests, cpan); puppet and vagrant added as Q19 examples, vagrant's current upstream body among the kept blobs; and Q22 raised and adopted (A: a per-package set's declared list on its package-level document, B one repository-level list lost to serialising every adoption on one row, C handler choice to having no rule), AC27 extended. Mark-root check: nothing added, the set stays five. Two criteria changed in substance, one added, each with its Test Plan row. `fable_recheck` extended. `node scripts/check-spec.js`: zero failures on this file. Stays draft. |
| 2026-09-30 | d9f6f1c | Fable recheck: full review (claim verification against every cited sibling at HEAD, adversarial lens on data retention, constitution compliance, go-spec-reviewer inline) + re-examination of the Opus adoptions Q15 to Q22 | Every claim about a sibling (`storage-and-gc.md`'s fourth root and AC16, `data-model.md` AC34, AC37 and AC44, `signing-service.md` AC35 and its was-Q16 and was-Q19, `auth.md` AC36, `format-handler-interface.md` AC18, `async-operations.md`'s kind and `RetryAt`, `upstream-adapters.md`'s profile table and AC24 and AC34, `repository-lifecycle.md`'s deletion step 5, `julia.md`'s captured 20-second low-speed limit, every declaring format's retention text) read at this sha and found to match. Verdicts: Q15 confirmed (the no-negative-entry re-fetch cost named as inherited from was-Q6); Q16 amended (not honoured under refuse-until-scanned, Design and AC21); Q17 confirmed with the was-Q14 rule stated as necessary, not sufficient, flagged owner-facing as a second extension of a settled set; Q18 amended (the member-input interface answers for the remote's current state, templates expanded and derived routes replayed in bounded rounds, Design and AC26); Q19 confirmed after testing every declaring format for a served-bytes-collectable path, none found; Q20 confirmed; Q21 confirmed with its cost restated at gigabytes on a busy per-name remote and amended for a file a declared list also holds (not an eviction candidate, counted in `cache_metadata_bytes`; AC14, AC29, rpm's was-Q11); Q22 confirmed. Queued items applied and verified against their source specs: format closing sweep batch 1 item 2 (swift), batch 2 items 1 and 3 (templates, the dual-status blob), batch 3 item 6 (cran), rubygems authoring item 2 (the expected-validator condition as the new AC31 with its row, the event-class rows, `/versions` at count zero). A refresh's "marked due" given a per-remote realisation hint. Constitution: both paths, the shared data model, no handler-owned table, the named enforcers and the conformance gate all hold; no rule contradicted. No em-dashes on touched lines. `node scripts/check-spec.js`: zero failures on this file. `fable_recheck` cleared; Open Questions empty; 31 criteria each mapped; status draft to planned. |
| 2026-09-28 | 4278ce0 | leftovers pass of the closing sweep on Opus: cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Applied the items queued against this file after its eviction settlement, each verified against the owning spec's settled text. Async-operations closing sweep item 1: `EnqueueRevalidation(ctx, tx, remote)` takes the caller's transaction because the queue has no enqueue without one (`async-operations.md`, "Enqueue is transactional"): virtual creation and member change enqueue inside theirs, and `ServeDocument`'s read path opens one holding only the job row and serves the read whether or not it commits; `run_at` is now; a rate limit returns the job through `async.RetryAt(err, RetryAfter)`, counted as an attempt (that spec's resolved retry-time decision, was Q11, AC7); AC26 and its row extended, the row shared with `async-operations.md` AC29 and AC30. The import direction settled by `signing-service.md`'s resolved proxy-import decision (was Q19 there): `internal/proxy` imports neither `internal/index` nor `internal/signing`, the member-input paths arriving through a one-method interface this layer declares (AC26, the arch test row); the "reported to it" wording on the profile paths now cites `signing-service.md` AC35. Six-spec closing sweep item 3 and format-handler-interface closing sweep item 3: the Obligation list gains the git location `{url, commit}` (`upstream-adapters.md` was-Q9, AC34) and the advisory key (`supply-chain-policy.md` was-Q11, AC24), asserted at this layer's entry by the new AC30 with its Test Plan row and placed in Phase 1. Auth and data-model second passes item 2: "Revalidation outside the request" cites `auth.md` AC36 and `format-handler-interface.md` was-Q11 and AC18, and AC26's `revalidate_job_test.go` and `arch_test.go` are shared with `auth.md` AC36; format-handler-interface closing sweep item 3's second half: a dated note on the was-Q18 record names every counterpart that has landed. Repository-lifecycle's step 5 correction (eviction settlement item 5, raised against that spec) had the same stale shape here: the Scope bullet, the eviction paragraph, AC23 and its row, and the was-Q11 extension note now say a remote's deletion ends its current documents in the same transaction as its cached references, as current documents rather than in eviction's shape. Found already done: data-loss second wave item 1 (applied by the eviction settlement: homebrew in the new-blob variant, zero-valid count, puppet and vagrant examples, the package-level declaring document). No question raised or adopted; no mark root added; the fable_recheck marker is unchanged. 30 criteria, each with a Test Plan row. Stays draft. |
