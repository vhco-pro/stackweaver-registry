---
status: draft
status_description: "Reconciled 2026-09-26 at fe54272 with the Wave 1 folds (not a review): Context now places the build at charter step 4b, after artifact verification and the interface re-open and before npm (charter AC12); the stale claim that the harness needs a matching extension is replaced by the harness's existing policies and advisories keys, whose provisioners this spec builds (Phase 3; AC2 extended). Earlier: all six questions adopted under the owner's standing delegation plus Q7 and Q8; Q5 adopted as D, not its written B, to keep the owner's purge decision. 16 criteria, zero open questions; stays draft pending a gate review."
description: "Spec for scanning artifacts and enforcing supply-chain policy at the registry boundary - blocking by vulnerability, licence or signature state, on both hosted and proxied content."
author: michielvha
goal: "Make the registry a policy enforcement point rather than a passive store, so a rule about what may enter a build is applied where every artifact already passes."
priority: "medium"
issue: 15
created: 2026-09-23
covers:
  - "internal/policy/**"
---

# Plan: Supply-chain policy and scanning

Scan what passes through, and refuse what policy forbids.

## Context

This was previously deferred with the reasoning "Harbor does these well; integrate later, do not
reimplement". That reasoning was about build effort, which stopped being a constraint on
2026-09-23 (`project-charter.md`, the standing scope decision), so it is reconsidered here.

The case for building rather than integrating is that **the registry is the only place every
artifact already passes**, hosted and proxied alike. A scanner bolted on beside it sees hosted
content and misses the proxy path, which is precisely where third-party risk enters. Enforcement
at the boundary is also the difference between a report nobody reads and a build that fails.

This matters most for the proxied path, which is this project's differentiator: a caching proxy
that can refuse a known-malicious package is a supply-chain control, while one that cannot is a
faster way to fetch it.

Ordering: this spec is built at charter build-order step 4b (`project-charter.md`, its build
order and AC12), after artifact verification, whose verdicts it consumes, and after the step 4a
interface re-open, and **before npm**, so every format from npm onward is built with enforcement
on both paths from its first commit and any bend this spec forces in the handler interface lands
before the measurement baseline rather than inside the Tier 1 series. `proxy-cache.md` lists
supply-chain policy out of its own scope with the note that policy "needs this first", so this
spec's proxied phase depends on the proxy layer landing at step 4, which precedes it. The dependency is recorded in both directions here so neither spec
discovers it has no counterparty. The proxy layer also lands the first half of the
security-signal rule this spec shares with it (Design, below): the condemnation record, the
refusal before any upstream fetch, and the upstream channel as the record's first source. This
spec adds the advisory feed as the second channel rather than building a second mechanism. The
same recording obligation applies to the conformance harness: AC2 needs a case that provisions
a policy rule and a controlled advisory source. `conformance-harness.md`'s closed `setup`
vocabulary already defines the two keys, `policies` and `advisories`, with this spec named as
where they land (its resolved closed-vocabulary decision), and its runner rejects them as "not
yet landed" until then. Building both provisioners on the harness's seed path is therefore this
spec's work, not the harness's (Phase 3), and AC2's case is expressed through them. A
conformance case may not depend on the live feed's contents, or it fails and passes on somebody
else's publishing schedule.

A third dependency is forward rather than backward: signature and attestation state is consumed
here as a verdict and produced by a sibling spec,
`docs/internal/plans/foundation/artifact-verification.md` (to be authored in the spec loop). This
spec defines the consumer interface that sibling implements, so the verdict's shape is pinned on
the consuming side (the resolved verification-ownership question).

## Scope

**In scope**

- Vulnerability scanning of stored artifacts, on ingest and whenever advisories change, matching
  both the artifact's coordinates and a component inventory catalogued from its bytes against a
  single advisory feed, OSV.
- Licence detection from the artifact bytes, and licence policy.
- Signature and attestation state as a policy input, consumed as a verdict produced by
  `docs/internal/plans/foundation/artifact-verification.md` (to be authored in the spec loop),
  through a consumer interface this spec defines.
- Policy evaluation at the boundary: allow, warn, or refuse, per repository, evaluated inside the
  shared resolution calls every handler already depends on.
- Enforcement on **both** paths, hosted and proxied, and retroactively: every resolution
  evaluates the policy state the artifact has now.
- The security-signal rule shared verbatim with `proxy-cache.md`, for which the advisory feed is
  the second channel.
- Advisory freshness: policy that depends on advisory data fails closed when that data is stale,
  and an offline instance keeps it fresh by importing the feed's bulk exports.
- Policy decisions recorded and queryable, so a refusal can be explained after the fact.

**Out of scope**

- Being a vulnerability database. Advisory data comes from an external feed.
- Remediation. The registry refuses or flags; fixing the dependency is the build's job.
- Signature and attestation verification itself: trust roots, key distribution and per-format
  signature envelopes belong to `artifact-verification.md`.
- A quarantine content state. Condemned content is either purged or retained-and-refused (the
  resolved disposition question); no third state exists.

## Design

### Scanning is asynchronous; enforcement is synchronous

An artifact is scanned after ingest, not during it, because holding a push open for a scan turns
every publish into a scanner-latency problem. Enforcement is synchronous at **resolution** time,
against the policy state the artifact currently has.

That split creates a window: an artifact can be served between ingest and its first scan result.
A repository's policy declares what happens in that window - serve, or refuse until scanned -
and the strict setting is the one a policy-enforcing deployment wants.

A failed scan is not a scan result. Under refuse-until-scanned, a scanner crash or an
unreachable feed would otherwise leave an artifact unscanned and therefore refused forever,
with nothing telling the operator why. Scan failures retry, and an artifact that stays
unscanned past a bound raises an operator alert rather than silently never serving.

Enforcement is **retroactive** (the resolved retroactivity question): every resolution evaluates
the policy state the artifact has now, not the state it had when it was published or cached, so
an advisory published this morning refuses content cached last year, on both paths. Applying a
new advisory needs no byte to be read again. The feed sync re-matches each new or changed
advisory against the stored coordinates and the stored component inventories, so a condemnation
exists as soon as the advisory lands rather than when a client next asks; bytes are re-catalogued
only when the cataloguer itself changes. The accepted cost is the one the feature is sold on: a
build that worked an hour ago can fail with no change on the user's side, and the refusal naming
the advisory is what makes that diagnosable.

### The advisory feed and its freshness

OSV is the single advisory feed (the resolved feed question). It is format-aware across most of
the catalogue's ecosystems, speaks the coordinate query shape the core can answer without
parsing, and carries package URLs the component inventory can be matched against. One feed means
no merge semantics for disagreeing advisories and no two severity scales. An ecosystem OSV does
not cover has no advisory data, and a rule depending on it is refused at configuration like any
other rule that cannot bind (the resolved enforcement-under-`streamed` question states the
general rule).

Feed sync is on by default, alongside the preconfigured upstreams in `proxy-cache.md`, because
the security-signal rule's feed channel is only a guarantee if it runs without configuration.
Advisory data has a freshness time, and past an instance-level staleness threshold (configurable,
defaulting to 24 hours) policy **fails closed**: a repository whose policy carries an
advisory-dependent rule (a vulnerability threshold or a malware rule) refuses resolutions with a
refusal naming stale advisory data rather than any advisory, recorded like every other refusal,
and the operator is alerted. Rules that do not read advisory data (licence, signature verdict)
keep evaluating. A remote repository with no policy attached is not refused: fail-closed is a
posture a repository opts into by attaching policy, and the proxy must keep serving an instance
that configured none. For such a repository a stale feed means the security-signal rule's feed
channel is degraded, which alerts the operator and refuses nothing. The accepted cost is that an
advisory-feed outage becomes a build outage for every repository that enforces advisories, which
is the deliberate direction: a policy engine that silently stops enforcing when nobody is
watching is the failure it must not have.

Offline mode (`proxy-cache.md`, a single instance-level switch) suspends the feed's network sync
along with every upstream request, because an air gap that still syncs advisories is not one.
The feed therefore also accepts a **local import** of OSV's per-ecosystem bulk exports, carried
across the air gap by the operator, and freshness is measured from the newest modification time
among the imported records, never from the time of the import, so carrying an old export in does
not make stale data look fresh. The staleness threshold is not suspended offline (the resolved
offline-freshness question): an air-gapped instance that enforces advisory policy imports on a
cadence inside the threshold, or fails closed.

### The proxied path is the hard one

A hosted artifact is scanned once on publish. A proxied artifact arrives on demand, in the middle
of a client's request, and scanning it first would add scanner latency to every cache miss.

The interaction with the settled `on_demand` policy therefore needs stating: content is cached on
fetch and scanned after, with the same window rule as hosted content. A repository configured to
refuse-until-scanned turns a cache miss into a wait, which is a deliberate and costly choice
rather than a default.

Cache-then-scan collides with three decisions `proxy-cache.md` has already settled, and the
collisions are stated here rather than discovered in implementation:

- **Stream-and-verify.** The settled integrity decision streams fetched bytes to the initiating
  client while hashing, committing to the CAS only on a digest match. Under serve-pending-scan
  that is compatible: the initiating client can receive bytes a later scan condemns, and the
  window setting is the deliberate acceptance of exactly that. Under refuse-until-scanned it is
  not: no byte may reach any client before the scan lands, so the fetch must decouple from the
  client stream entirely - fetch, commit, scan, then serve from the CAS - and the initiating
  client becomes indistinguishable from a coalesced waiter. `proxy-cache.md` has since settled
  the waiter path (its resolved coalesced-waiter question): waiters receive bytes only from the
  CAS after the verified commit. Refuse-until-scanned is therefore that same path with the scan
  inserted between commit and serve, applied to the initiating client too, not a third path.
- **Single-flight coalescing.** The coalescing timeout is the waiters' latency bound; under
  refuse-until-scanned the scan is inside that bound, so scanner latency adds to what every
  coalesced waiter of a cold-start miss experiences. When the scan lands red, every waiter
  receives the policy refusal, not a network error - the mid-stream-abort ambiguity the
  integrity decision tolerates is not acceptable here, because a policy refusal is an
  explainable event by this spec's own AC5.
- **Serve-stale.** During a serve-stale outage no upstream security signal can arrive, which
  `proxy-cache.md` already names as the exposure window. The advisory feed is the independent
  detection channel that keeps working through an upstream outage, and stale-served responses
  still pass through policy evaluation like any other resolution, so a refusal takes effect
  even while the upstream is unreachable. When the advisory feed is itself stale, policy that
  depends on it fails closed, as above.

Evaluation order on a miss follows from enforcement being synchronous at resolution: resolution
precedes the upstream fetch, so a rule decidable from coordinates alone - an advisory naming
the package and version, a licence already recorded - refuses before any upstream request is
made, and condemned bytes are neither fetched nor cached. Rules that need the bytes can only
bind after the fetch. The `streamed` download policy stores nothing at all, so cache-then-scan
never happens there and only coordinate-decidable rules can bind; a byte-dependent rule attached
to a `streamed` remote repository is refused at configuration rather than accepted and silently
unenforced (the resolved enforcement-under-`streamed` question).

### Policy is per repository, evaluated inside the shared resolution calls

Policy attaches to a repository and is evaluated in the shared layer, never in a handler - the
same boundary rule auth follows, and for the same reason: a handler that forgets to evaluate
policy is an unenforced policy.

Auth's precedent needed a pinned method, `Scope(r)`, because the central authorizer runs before
the handler and only the handler can parse its URLs. Policy does not need one (the resolved
evaluation-hook question), because it evaluates where the coordinates are already known: after
parsing its URL, a handler resolves content through the interfaces `Deps` hands it
(`format-handler-interface.md`) - the metadata store's version resolution (repository, package,
version), the blob store's read by digest, and the proxy layer's fetch-and-cache entry. The
server core hands every handler **policy-enforcing implementations** of those three: each
evaluates the repository's policy for the coordinate or digest before returning content, and
returns a typed policy refusal instead of content when policy refuses. No content can resolve
without passing the check, because there is no other call to resolve it through; that holds
because a handler has no storage or egress access except through `Deps`, which
`format-handler-interface.md` already enforces mechanically. The five pinned methods are
unchanged.

What each call refuses: a version resolution refuses a condemned version; a blob read by digest
refuses a digest a verdict condemns directly - a blob a byte-level finding was made in, or a
file of a coordinate-condemned version that no uncondemned version also holds. A layer shared
between a condemned image and a clean one is not refused when read by digest, because the
condemned image's manifest is, and the layer is not the thing the finding names. The
fetch-and-cache entry evaluates coordinate-decidable rules before any upstream request (AC8).

The accepted cost is that evaluation happens mid-request rather than up front: a handler may
have parsed and begun work before the refusal arrives, and every handler must render the typed
refusal correctly. The refusal type is declared beside the `Deps` consumer interfaces in
`internal/format`, so a handler recognises it without importing `internal/policy` (AC4), and
renders it in its protocol's own error shape, because a policy refusal an OCI client shows as a
malformed response is a refusal nobody can act on. AC1's conformance case polices that rendering
per format, since only a real client can show whether the refusal surfaces as one.

### Where scanning gets its component inventory

Matching an artifact against an advisory needs to know what the artifact contains. The core
knows repository format, package name and version string, so **coordinate-level matching** (the
OSV query shape) needs no parsing, crosses no boundary, and is always on. It sees nothing inside
an OCI image, whose vulnerabilities live in the OS packages and bundled libraries inside its
layers, and OCI is the first proxyable format.

So scanning has a second tier (the resolved component-inventory question): a **byte-level
cataloguer in the shared layer** (`internal/policy`) reads artifact bytes from the CAS and
produces a component inventory - package URLs with versions and detected licences, including
the OS packages and bundled libraries inside OCI layers. It is an embedded library of the Syft
or OSV-SCALIBR class, selected in Phase 1 against Apache 2.0 compatibility and catalogue
coverage. It catalogues only; matching is against the one OSV feed, so the inventory tier adds
no second advisory source. Licences are detected from the bytes by the same pass, which is what
AC3 enforces against.

The opaque-metadata rule (`data-model.md`, the settled metadata typing) is untouched, because it
governs the shared schema's metadata documents, and the cataloguer neither reads nor writes
them. The inventory lives in the policy layer's own index, which is the "separate index built
later" that settled decision predicted for features like "every artifact under this licence".
No handler emits anything, so the pinned interface gains no inventory hook.

The accepted cost is that per-format knowledge now lives in a second place, the cataloguer's
format tables, and drifts independently of our handlers. Two things bound it: the tables are a
vendored library's, maintained upstream rather than re-derived here, and the policy layer may
import no handler package (AC4), so the second place cannot couple to the first. Where the
cataloguer does not cover a format, byte-dependent rules are refused at configuration rather than
accepted and unenforced.

### One security event, two channels, one rule

`proxy-cache.md` settled that an explicit upstream security signal purges the cached content and
alerts the operator, and this spec's advisory feed can deliver the same real-world event, a
malware advisory, through a second channel. The two specs therefore state one rule, verbatim in
both (the resolved disposition question):

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

The split follows what each event is. A security signal names content that is hostile in itself,
and the owner has already decided such content must not be kept (`proxy-cache.md`, resolved
upstream removal); purging it costs no evidence, because the refusal record binds to coordinate
and digest rather than to the bytes (AC5). A vulnerability or licence condemnation names content
that is unwanted by one repository's policy, and those advisories are withdrawn and re-scored
regularly, so a refusal that lifts in place is correct where a purge would force a re-fetch
through the scan window for nothing.

The condemnation record and its refusal-before-fetch check are built with the proxy layer, whose
upstream channel is their first source; this spec's evaluation extends the same check inside the
policy-enforcing `Deps` implementations rather than adding a second one.

### Interaction with GC and eviction

Scan results and refusal records reference artifacts, and `storage-and-gc.md` marks blob
liveness from five enumerated roots with a standing rule that the root set is the shared data
model's to amend, never any sibling's to extend silently. This spec adds **no** mark root:
policy records, condemnation records and component inventories reference content by digest and
coordinate and are not a liveness root, because a refusal record must stay queryable after the
blob it condemned is gone, so it cannot depend on the blob's existence. Neither disposition
needs a root. A purge ends cached references, the same operation eviction performs, so the
sweep reclaims the bytes and the purge is held by `storage-and-gc.md` AC15 (only the sweep and
the orphan scan delete objects) exactly as eviction is. Retained-and-refused content keeps the
reference it already had - a cached reference or a published one - so it stays under the roots
it was already under. Quarantine, the option that would have pinned condemned bytes as a sixth
root, was rejected.

Eviction makes the digest-independence load-bearing rather than theoretical: a refused cached
artifact is never read, so LRU eviction under the repository quota will drop its cached
reference early and the GC sweep will then reclaim the bytes (`proxy-cache.md`, resolved
eviction-mechanics question - eviction itself deletes nothing). Retention of refused content is
therefore retention until eviction, not forever, which is accepted: the record is the evidence,
the bytes are a convenience. AC7's refusal-without-re-ingest must survive that - the refusal
binds to the coordinate and the recorded scan result, not to bytes still being in the cache - or
eviction becomes a way to launder a condemned artifact back into the serve-pending-scan window
on re-fetch.

### Signature and attestation state is a consumed verdict

Verification is format-entangled - Cosign lives in OCI referrers, npm provenance in the
packument, PyPI attestations in the simple index - and it has hard questions of its own (trust
roots, key distribution, transparency-log checks). It is owned by a sibling spec,
`docs/internal/plans/foundation/artifact-verification.md` (to be authored in the spec loop), and
this spec consumes its output (the resolved verification-ownership question).

The consumer owns the interface, per the `go` skill: `internal/policy` defines a verdict source
answering, per artifact digest, one of verified, failed or absent, with the identity a verified
verdict was checked against. A repository rule may require a verified verdict, optionally from a
named identity; an absent verdict is not a verified one. Until the producer exists there is no
real verdict source, and a signature rule is refused at configuration like any rule that cannot
bind. AC15 proves the consumer side against a fixture source, so the rule's semantics are fixed
before the producer is written rather than shaped by it.

## Acceptance Criteria

- [ ] AC1: An artifact with a known vulnerability above the repository's threshold is refused at
      resolution on the **hosted** path, and the client receives an error naming policy rather
      than a generic failure - proven by a conformance case asserting a real client surfaces
      the refusal, not only by an integration test reading our own response.
- [ ] AC2: The same artifact arriving through the **proxied** path is refused identically, proven
      by a conformance case against a real client, using a case-controlled advisory source
      rather than the live feed, with the rule and the advisory provisioned through the
      harness's `policies` and `advisories` `setup` keys, whose provisioners this spec
      builds, so the runner no longer rejects either as not yet landed.
- [ ] AC3: An artifact whose licence, as detected from its bytes, violates repository policy is
      refused, and one that does not is served, on both the hosted and proxied paths.
- [ ] AC4: Policy evaluation happens in the shared layer and the policy layer stays off the
      handlers: an architecture test asserts no handler package (`internal/format/<name>`)
      imports `internal/policy/**`, and `internal/policy/**`, the cataloguer included, imports
      no handler package.
- [ ] AC5: Every refusal is recorded with the artifact, the rule that refused it and the
      advisory, licence, security signal or stale-feed condition that triggered it, and is
      queryable afterwards - including after the refused content's blob has been evicted,
      purged or collected.
- [ ] AC6: A repository configured to refuse-until-scanned refuses an unscanned artifact, and on
      a cache miss no byte reaches any client, the initiating one included, before the scan
      result lands; one configured to serve-pending-scan serves it and, when the scan finds a
      violation, refuses from then on. A scan failure leaves the artifact observably unscanned
      with an operator signal past the retry bound, never silently unservable.
- [ ] AC7: A new advisory affecting already-stored content causes that content to be refused on
      the next resolution without re-ingest and without re-reading its bytes, on both paths,
      including content whose cached bytes have since been evicted.
- [ ] AC8: A coordinate-refused artifact requested through a remote repository is refused
      without any upstream fetch, asserted at the network layer: condemned content is neither
      fetched nor cached.
- [ ] AC9: When advisory data is older than the staleness threshold, a repository whose policy
      carries an advisory-dependent rule refuses resolutions with an error naming stale
      advisory data and the operator is alerted, while a repository with only licence rules and
      a remote repository with no policy keep serving; the first sync that restores freshness
      lifts those refusals with no operator action.
- [ ] AC10: An OCI image whose repository, name and tag match no advisory, but whose layers
      contain an OS package an advisory names above the repository's threshold, is refused at
      resolution with the matched component in the refusal record, and the handler's metadata
      documents are byte-identical before and after the image was catalogued.
- [ ] AC11: A byte-dependent rule (licence, component-level vulnerability) attached to a remote
      repository under the `streamed` download policy, or to a format the cataloguer does not
      cover, and an advisory-dependent rule on an ecosystem the feed does not cover, are each
      refused at configuration with an error naming why; coordinate-level rules on the same
      repositories are accepted and enforced.
- [ ] AC12: No content resolves around the policy check: a fixture handler constructed only with
      `Deps` receives the typed refusal from the metadata-resolution, blob-read and
      fetch-and-cache calls for a condemned coordinate, and no call it holds returns the
      condemned content's bytes.
- [ ] AC13: A malware advisory from the feed for a coordinate already condemned by the upstream
      security signal, and the same pair in the reverse order, leave one condemnation carrying
      both sources, one purge and one operator alert, and the coordinate stays refused until
      both sources have withdrawn; a vulnerability condemnation of cached content ends no
      cached reference, and its withdrawal lifts the refusal in place with no re-fetch.
- [ ] AC14: A malware advisory published to the feed for a coordinate cached in a remote
      repository that receives no requests is acted on at the next feed sync, with no client
      request involved: the cached references end, the refusal record exists and the operator
      alert fires.
- [ ] AC15: A repository rule requiring a verified signature refuses an artifact whose consumed
      verdict is failed or absent and serves one whose verdict is verified, proven against a
      fixture implementation of this spec's verdict-source interface; with no verdict source
      configured, the rule is refused at configuration.
- [ ] AC16: With the instance in offline mode the advisory feed performs no network sync
      (asserted at the network layer), a local import of an OSV bulk export updates advisory
      data, and freshness after the import is the newest modification time among the imported
      records, so importing an export older than the staleness threshold leaves advisory-
      dependent policy failing closed.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | integration + conformance | `internal/policy/vulnerability_test.go`, `conformance/oci/policy_test.go` (hosted mode) |
| AC2 | conformance | `conformance/oci/policy_test.go` (proxied mode; rule and advisory through the `policies` and `advisories` keys); `conformance/core/seed_test.go` (both provisioners reached through the seed path) |
| AC3 | integration | `internal/policy/licence_test.go` (both paths, licence detected by the cataloguer) |
| AC4 | architecture test | `internal/policy/arch_test.go` (both import directions) |
| AC5 | integration | `internal/policy/audit_test.go` (including post-eviction, post-purge and stale-feed records) |
| AC6 | integration | `internal/policy/scan_window_test.go` (window states, no byte to the initiating client under refuse-until-scanned, scan-failure observability) |
| AC7 | integration | `internal/policy/advisory_update_test.go` (both paths, including evicted content; cataloguer instrumented to prove no re-read) |
| AC8 | integration | `internal/policy/prefetch_refusal_test.go` (network-level assertion) |
| AC9 | integration | `internal/policy/feed_staleness_test.go` (injected clock across the threshold, three repository shapes, recovery sync) |
| AC10 | integration | `internal/policy/inventory_test.go` (fixture OCI image with a vulnerable OS package in a layer, metadata-document digest compared before and after) |
| AC11 | unit + integration | `internal/policy/rule_binding_test.go` (configuration rejection for each unbindable case, enforcement of the accepted coordinate rules) |
| AC12 | integration | `internal/policy/deps_enforcement_test.go` (fixture handler holding only `Deps`) |
| AC13 | integration | `internal/policy/security_signal_test.go` (both arrival orders, withdrawal of one then both sources, vulnerability withdrawal in place) |
| AC14 | integration | `internal/policy/security_signal_test.go` (unrequested cached coordinate, sync-driven) |
| AC15 | integration | `internal/policy/signature_verdict_test.go` (fixture verdict source) |
| AC16 | integration | `internal/policy/feed_import_test.go` (network-level assertion under offline mode, old and fresh exports) |

## Implementation Phases

### Phase 1: Scanning
OSV feed sync and local bulk import, freshness tracking against the staleness threshold, the
coordinate index, the byte-level cataloguer (library selected here) and the component inventory
index, ingest-time cataloguing, and re-matching stored coordinates and inventories whenever an
advisory changes.

### Phase 2: Policy evaluation
Per-repository rules with configuration-time rejection of rules that cannot bind, the
policy-enforcing `Deps` implementations and the typed refusal, refusal recording, fail-closed on
stale advisory data, the verdict-source consumer interface, and the feed as the security-signal
rule's second channel on the proxy layer's condemnation record.

### Phase 3: The proxied path
Enforcement on cache misses and refusal before any upstream fetch, the scan-window setting on the
proxy's waiter path, `streamed` rule rejection, the offline-mode feed behaviour, the
`policies` and `advisories` provisioners on the harness's seed path, and conformance cases on
both paths.

## Tasks

Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None remain open. Q1 to Q6 were adopted on 2026-09-26 under the owner's standing delegation, and
folding them raised Q7 and Q8, adopted the same way; all eight are folded into Scope, Design, the
acceptance criteria and the Test Plan above. Q5 was adopted in a form other than its written
recommendation, because that recommendation would have reversed a decision the owner made; the
reason is recorded in its section. Every adopted answer is reversible by the owner.

### Resolved: the advisory feed and its staleness (was Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: OSV is the single feed,
and policy that depends on advisory data fails closed when that data is stale beyond an
instance-level threshold (default 24 hours). Folded into Scope, "The advisory feed and its
freshness", AC9 and AC16.

Accepted cost: an advisory-feed outage becomes a build outage for every repository whose policy
enforces advisories. It is bounded to those repositories: licence and signature rules keep
evaluating, and a remote repository with no policy attached keeps serving with an operator
alert, because fail-closed is a posture a repository opts into. Option B lost because a policy
that silently stops enforcing during a feed outage is the one failure a policy engine must not
have; option C lost because merging disagreeing advisories and reconciling severity scales is a
design problem of its own that one feed avoids, and OSV already aggregates several upstream
databases.

**Recommendation:** OSV as the primary feed, because it is format-aware across most of the
catalogue's ecosystems, with a fail-closed default when advisory data is stale beyond a
threshold.

| Option | You get | It costs |
|---|---|---|
| **A. OSV, fail closed on stale data** | One feed covering most ecosystems; a stale database cannot silently stop enforcing | An advisory-feed outage degrades into refusals, so an availability problem becomes a build outage |
| **B. OSV, fail open on stale data** | Availability preserved through feed outages | Policy silently stops being enforced exactly when nobody is watching, which is the failure a policy engine must not have |
| **C. Several feeds, merged** | Better coverage, no single point of failure | Merge semantics for disagreeing advisories become a design problem of their own, and severity scales differ between sources |

**Why this is yours:** it sets whether a policy failure degrades toward availability or toward
safety, which is a posture decision rather than a technical one.

### Resolved: retroactive policy (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: every resolution
evaluates current policy state, so a new advisory refuses content already stored or cached, on
both paths, without re-ingest. Folded into Scope, the enforcement section of Design (including
the sync-time re-matching that makes it cheap), AC7 and AC14.

Accepted cost: a newly published advisory can break a build that worked an hour ago with no
change on the user's side; the refusal names the advisory, and the repository's warn setting is
the tool for a team that wants a grace period. Option B lost because it makes the cache a
policy-evasion mechanism, and it would contradict the owner's own direction on the same tension
for upstream removals.

AC7 asserts the retroactive behaviour, so it stands or falls with this answer.

**Recommendation:** A, retroactive - a cache that keeps serving a package after it is known
malicious is the failure this feature exists to prevent.

| Option | You get | It costs |
|---|---|---|
| **A. Retroactive: every resolution evaluates current policy state** | The guarantee the feature is sold on: a known-malicious package stops serving everywhere at once | A newly published advisory breaks a build that worked an hour ago, with no change on the user's side |
| **B. New resolutions only: content already cached keeps serving** | Build stability; a green pipeline stays green | The cache becomes a policy-evasion mechanism, and "we cached it before we knew" is the exact incident report this feature exists to prevent |

**Why this is yours:** it trades build stability against the guarantee the feature is sold on,
and the same tension was decided one way for upstream removals (purge on security signal).

### Resolved: component inventory (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option C, with coordinate-level
matching as the always-on fast path: a byte-level cataloguer in `internal/policy` reads artifact
bytes from the CAS and writes a component inventory into the policy layer's own index, matched
against the one OSV feed. The `streamed` half of this question is answered separately as Q8,
which folding exposed as its own judgment. Folded into Scope, "Where scanning gets its component
inventory", AC3, AC4, AC10 and AC11.

Accepted cost: a second home for per-format knowledge, the cataloguer's format tables, which
drift independently of our handlers. Bounded by vendoring a maintained library rather than
re-deriving the tables, by AC4 forbidding the policy layer from importing any handler package,
and by refusing byte-dependent rules where the cataloguer does not cover a format. Option A lost
because it gives the flagship first format a scanner that cannot see inside its layers; option B
lost because it amends the pinned interface ahead of the evidence-based re-open for knowledge a
maintained cataloguer already has, and it would put a security-relevant emission in every
handler.

Coordinate-level matching (repository format, package name, version - all core-known) crosses no
boundary but sees nothing inside an OCI image, and OCI is the first proxyable format. Anything
deeper needs either the handler or a format-aware scanner to read content the core is forbidden
to interpret. The answer must also say what enforcement can promise under the `streamed`
download policy, where no bytes are retained to scan.

**Recommendation:** C, with coordinate-level matching as the always-on fast path - the
opaque-metadata rule governs the shared schema's metadata documents, not artifact bytes, and an
embedded scanner's format tables (the Trivy/Grype class) already cover most of the catalogue,
so the boundary the data model exists to protect is not the one a byte-level scanner crosses.

| Option | You get | It costs |
|---|---|---|
| **A. Coordinate-level matching only** | No boundary is touched, no interface change, works identically for every format including `streamed` | Near-worthless for OCI, whose vulnerabilities live inside layers; the flagship first format gets a scanner that cannot see them |
| **B. A handler inventory hook (the handler emits components/licence into a queryable shared index)** | Format knowledge stays where it lives; the separate licence index `data-model.md` predicted falls out naturally | Amends the pinned five-method interface, which is re-opened only after OCI ships on evidence, so this either waits for the re-open or forces it early |
| **C. A byte-level scanner in the shared layer that parses artifact content directly** | Sees inside OCI layers and archives; matches how every existing scanner works; no interface change | Re-derives per-format knowledge outside the handlers, a second place that must learn each ecosystem, and its format tables drift independently of our handlers |

**Why this is yours:** it decides which architectural rule bends - the pinned interface, the
single home of format knowledge, or the usefulness of scanning for the format that matters
most - and that ranking is a constitution-level judgment, not something measurable.

### Resolved: the evaluation hook (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: the server core hands
handlers policy-enforcing implementations of the metadata-resolution, blob-read and
fetch-and-cache interfaces in `Deps`, which return a typed refusal the handler renders. No pinned
method is added. Folded into "Policy is per repository, evaluated inside the shared resolution
calls", AC4 and AC12, with AC1 carrying the per-format rendering.

Accepted cost: evaluation happens mid-request, and every handler must render the typed refusal
correctly, which AC1's conformance case polices format by format. Option A lost because it
amends the pinned interface outside the scheduled re-open and duplicates URL parsing the handler
does anyway; option C lost because it teaches shared security-critical code every format's URL
grammar, the exact coupling `Scope(r)` exists to prevent.

Handlers serve HTTP directly and only they can map a URL to the package and version being
resolved - the reason auth needed the pinned `Scope(r)`. Policy evaluation needs the same
mapping, and no pinned method provides it.

**Recommendation:** B - enforce inside the shared resolution/read path the handler already
calls through `Deps`, returning a typed refusal the handler renders, because it needs no
interface amendment and a handler cannot forget a check that lives inside the call it cannot
serve content without.

| Option | You get | It costs |
|---|---|---|
| **A. A `PolicySubject(r)`-style pinned method, mirroring `Scope(r)`** | Evaluation happens before any handler logic runs, symmetrical with auth | Amends the pinned interface outside the scheduled re-open, and duplicates URL parsing the handler will do again to serve the request |
| **B. Enforcement inside the shared metadata/blob resolution calls in `Deps`** | Un-forgettable by construction: no content resolves without passing the check; no interface change | Evaluation happens mid-request rather than up front, and the refusal must round-trip as a typed error every handler renders correctly, which AC1's conformance case must then police per format |
| **C. Central middleware parsing per-format URLs** | One enforcement point visible in one place | Teaches shared security-critical code every format's URL grammar, the exact coupling `Scope(r)` exists to prevent - listed for completeness, and it contradicts the auth precedent |

**Why this is yours:** it fixes the enforcement topology every format inherits, and B trades
an architectural guarantee (cannot-forget) against evaluation happening later in the request
than a security reviewer might expect; pricing that is a posture call.

### Resolved: condemned-artifact disposition (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option D, split by signal class:
a security signal purges, through either channel, and every other condemnation is refused and
retained. The one rule for both channels is "The security-signal rule", stated verbatim here and
in `proxy-cache.md`. No mark root is added. Folded into Scope, "One security event, two
channels, one rule", "Interaction with GC and eviction", AC5, AC13 and AC14.

**The written recommendation, B, was not adopted as written.** B narrows `proxy-cache.md`'s
purge rule to refuse-and-retain for explicit security signals, and that purge rule is a decision
the owner made (`proxy-cache.md`, resolved upstream removal, where the owner rejected
keep-and-flag for security removals on security grounds). The standing delegation never
reverses an owner decision, so B's reach over security signals could not be adopted. Option D
is B wherever the owner has not decided - vulnerability and licence condemnations, which are the
cases B's reversibility argument was strongest for - and the owner's purge rule wherever the
owner has, now applied to the advisory feed's malware entries too so that one event gets one
response. The owner can adopt B in full by revisiting their own upstream-removal decision.

Accepted cost: a malware condemnation later withdrawn cannot be undone in place; the content is
fetched again through the scan window, and if the upstream no longer has it, it is gone. Purged
bytes are unavailable for forensics, though the refusal record, which binds to coordinate and
digest, is not. Option A lost because purging vulnerability and licence condemnations throws
away content whose condemnation is routinely withdrawn or re-scored; option C lost because it
adds a sixth GC mark root and a third content state every path must handle, for a forensic
benefit the digest-bound refusal record already mostly provides.

`proxy-cache.md` purges on an explicit upstream security signal; this spec refuses and retains.
The same malware advisory can arrive through either channel, so the composition must be one
deliberate rule, and the answer decides whether condemned bytes pin a GC root.

**Recommendation (as written):** B - retain and refuse, with the proxy's purge rule narrowed to
apply as refuse-and-retain once policy exists, because a refusal is reversible when an advisory
is withdrawn (they are, regularly) and the recorded evidence is what AC5 promises; a purge is
neither. **Revised on adoption to D**, for the reason above.

| Option | You get | It costs |
|---|---|---|
| **A. Purge wins: policy condemnation deletes cached bytes, matching the proxy rule** | One behaviour for both channels; condemned bytes provably gone from disk | Destroys the evidence AC5 makes queryable, is irreversible when an advisory is withdrawn, and a re-fetch after withdrawal re-enters the unscanned window |
| **B. Retain and refuse: bytes stay, nothing serves, the record explains why** | Reversible on advisory withdrawal; forensics intact; one disposition to test | Diverges from the settled proxy purge behaviour, which must then be amended in `proxy-cache.md`, and operators must accept known-bad bytes remaining on disk |
| **C. Quarantine: bytes moved or pinned in a non-serving state with retention** | Explicit forensic story; serving path provably cannot reach them | A new GC mark root - a sixth, after pointer targets were settled as the fifth on 2026-09-26 - which the `storage-and-gc.md` revision mechanism must absorb, and a third content state every path must handle |
| **D. Split by signal class: a security signal purges through either channel; every other condemnation is refused and retained** | The owner's purge rule kept and extended to the feed, so one event gets one response; reversibility where condemnations are routinely withdrawn; no mark root; the per-format removal tables in `npm.md` and `pypi.md` stay true | Two dispositions to test instead of one, and a withdrawn malware advisory cannot be undone in place |

**Why this is yours:** it reconciles two settled specs that currently disagree, and the choice
between destroying and retaining known-bad content is a liability and posture decision, not an
engineering one.

### Resolved: verification ownership (was Q6)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a sibling spec,
`docs/internal/plans/foundation/artifact-verification.md` (to be authored in the spec loop),
owns signature and attestation verification, and this spec consumes its verdict through a
verdict-source interface it defines. Folded into Context, Scope, "Signature and attestation
state is a consumed verdict", Phase 2 and AC15.

Accepted cost: signature rules cannot be configured until the producer lands; AC15 fixes their
semantics now against a fixture source. Option B lost because it would make this spec own trust
roots and per-format signature envelopes, entangling it with the component-inventory boundary;
option C lost because the standing scope decision rules out effort as a reason and no
correctness argument for dropping the input exists.

Scope names signature state as a policy input; no spec owns producing it, so the input is
currently dangling and carries no acceptance criterion.

**Recommendation:** A - a separate verification spec that this one consumes, because
verification is format-entangled (Cosign lives in OCI referrers, npm provenance in the
packument, PyPI attestations in the simple index) and burying it here would make this spec own
exactly the per-format knowledge Q3 is trying to place carefully.

| Option | You get | It costs |
|---|---|---|
| **A. A sibling verification spec; this spec consumes its verdict as an input** | Each spec stays one decision deep; verification's own hard questions (trust roots, key distribution, Rekor) get their own gate | Signature policy waits on another spec landing, and the signature AC here stays absent until it does |
| **B. This spec grows verification** | One document, no cross-spec dependency to sequence | This spec absorbs trust-root management and per-format signature envelopes, doubling its surface and entangling it with Q3's boundary problem |
| **C. Drop signature state from v1 scope** | Nothing dangles | Removes a named differentiator from the policy engine - and the standing scope decision means effort cannot be the reason, so this option needs a correctness or evidence argument it does not currently have |

**Why this is yours:** it is a spec-portfolio decision - what gets its own gate versus what
rides along - and the sequencing of a security feature's trust model is precisely the kind of
call the experiment reserves for the owner.

### Resolved: advisory freshness under offline mode (was Q7, raised while folding Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: offline mode suspends
the feed's network sync, a local import of OSV bulk exports keeps the data current, freshness is
the newest record's modification time, and the staleness threshold still applies. Folded into
"The advisory feed and its freshness", Phase 3 and AC16.

Accepted cost: an air-gapped instance that enforces advisory policy owes a recurring import
inside the threshold, or it fails closed. Option B lost because it makes the air-gapped
deployment, the one most likely to be run for security reasons, the one where policy silently
stops meaning anything.

Folding Q1 exposed this: offline mode (`proxy-cache.md`) forbids upstream egress instance-wide,
so an air-gapped instance cannot sync the feed, and under fail-closed its advisory policy would
refuse everything within a day of going offline.

**Recommendation:** A - no offline exemption from the threshold, with a local bulk-import path,
because an exemption is fail-open under another name.

| Option | You get | It costs |
|---|---|---|
| **A. Offline suspends network sync; a local bulk import feeds the data; the threshold still applies, measured from the newest imported record** | Air-gapped policy means what it says; staleness cannot be laundered by re-importing an old export | The operator of an enforcing air-gapped instance owes a recurring import across the gap |
| **B. Offline mode suspends the staleness threshold** | An air-gapped instance keeps serving with no operator chore | Policy silently degrades to whatever the last sync knew, indefinitely, which is fail-open under another name |

**Why this is yours:** it decides whether the air-gap promise and the fail-closed promise can
both hold, and which yields when they cannot.

### Resolved: enforcement under the `streamed` download policy (was Q8, raised while folding Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a rule that cannot bind
is refused at configuration. Under `streamed` only coordinate-level rules can bind, so a
byte-dependent rule attached to a `streamed` remote repository is refused with an error naming
the download policy; the same rule of refusal covers formats the cataloguer does not cover,
ecosystems the feed does not cover, and signature rules before a verdict source exists. Folded
into the proxied-path and inventory sections of Design, AC11 and AC15.

Accepted cost: an operator who wants licence or component-level policy on a `streamed` remote
must change its download policy, which means storing its content. Option B lost because a rule
that is accepted and never enforced is an unenforced policy that looks like an enforced one;
option C lost because scanning inside the stream means holding the client response until the
scan completes, which is the synchronous-scan latency this spec's design rejects.

Q3 required its answer to say what enforcement promises under `streamed`, where no bytes are
retained to scan; folding it showed the answer generalises to every case where a rule cannot
bind, so it is recorded as its own decision.

**Recommendation:** A - refuse unbindable rules at configuration, because the promise a policy
makes must be one it can keep.

| Option | You get | It costs |
|---|---|---|
| **A. Refuse byte-dependent rules on `streamed` remotes (and anywhere else a rule cannot bind) at configuration** | Every accepted rule is enforced; the gap is visible at the moment it is created | Licence and component policy require storing the content |
| **B. Accept the rule and enforce only its coordinate-decidable part** | Configuration never fails | The repository advertises a policy it does not enforce, silently |
| **C. Buffer and scan inside the stream on `streamed` remotes** | Full policy on every download policy | Every cache miss waits for a scan, the latency the asynchronous design exists to avoid, on the policy whose point is to store nothing |

**Why this is yours:** it sets whether configuration or enforcement is where a policy gap
surfaces, which is a product promise about what "attached policy" means.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | 4d1aeb1 | folding adopted recommendations under the standing delegation | Not a review. Adopted Q1 (A: OSV, fail closed on stale data), Q2 (A: retroactive), Q3 (C: byte-level cataloguer in `internal/policy`, coordinate matching always on), Q4 (B: policy-enforcing `Deps` implementations returning a typed refusal) and Q6 (A: sibling `artifact-verification.md`, to be authored in the spec loop, with the verdict-source interface defined here). Q5 adopted as a new option D rather than its written recommendation B, recorded as such in its section: B would have narrowed `proxy-cache.md`'s owner-settled purge to refuse-and-retain, which the delegation may not reverse, so a security signal purges through either channel and every other condemnation is refused and retained; the security-signal rule is stated verbatim in both specs and adds no GC mark root, so `storage-and-gc.md` is untouched. Folding raised and adopted Q7 (no offline exemption from the staleness threshold; local OSV bulk import, freshness from the newest imported record) and Q8 (a rule that cannot bind is refused at configuration: `streamed` remotes, uncovered formats and ecosystems, signature rules before a verdict source). Body changes: Context gained the proxy-layer and verification dependencies; Scope and Out of scope rewritten; Design gained the advisory-feed section and the security-signal rule, and its evaluation-hook, inventory, GC and signature sections were rewritten from open tension to adopted design, including what each `Deps` call refuses. AC3, AC4, AC5, AC6 and AC7 rewritten; AC9-AC16 added with Test Plan rows; phases rewritten. |
| 2026-09-26 | fe54272 | cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. From the charter fold: Context's ordering paragraph now states the build at step 4b, after artifact verification and the step 4a re-open and before npm, per the charter's build order and AC12. From the harness and generic fold: the Context claim that `conformance-harness.md` provisions only repositories, tokens and upstreams and needs a matching extension was stale, since its closed vocabulary already defines `policies` and `advisories` as landing with this spec; rewritten, Phase 3 now builds both provisioners on the seed path, and AC2 asserts its case is provisioned through them. Found already consistent: the refusal type declared beside `Deps` in `internal/format` (now also stated in `format-handler-interface.md`), and no GC mark root added (now also placed in `data-model.md`'s non-root table). |
| 2026-09-23 | d078c46 | first review: adversarial + constitution + cross-spec (proxy-cache's settled stream-and-verify, single-flight, serve-stale and security-purge decisions; data-model's opaque metadata typing; format-handler-interface's pinned five methods and `Scope(r)` precedent; storage-and-gc's four mark roots and eviction; auth's client-not-artifact boundary) + go-spec-reviewer; claim verification vacuous pre-code (no `internal/policy/` exists). The reviewer terminated on a spend limit before writing this row; it is recorded here from the diff | Three of `proxy-cache.md`'s settled decisions were shown to collide with cache-then-scan and the collisions stated rather than left for implementation: refuse-until-scanned is incompatible with streaming to the initiating client, the scan lands inside the coalescing latency bound every waiter shares, and serve-stale needs the advisory feed as its independent signal. Evaluation order on a miss derived (coordinate-decidable rules refuse before any upstream request, giving AC8: condemned content is neither fetched nor cached). The auth precedent this spec invokes was shown to be unearned - central evaluation needs a request-to-coordinate mapping no pinned method provides - raising Q4. Component inventory named as the central tension (Q3): the flagship first format is the one coordinate matching cannot see into. Two settled specs shown to disagree on one real event (purge versus refuse-and-retain), raising Q5. Signature state confirmed to have no producer in any spec, raising Q6 and explaining the deliberately absent AC. Policy records placed against the GC root set as explicitly not a root, so a refusal outlives the blob it condemned (AC5, AC7) and eviction cannot launder a condemned artifact. Scan failure separated from scan result (AC6). AC1/AC3/AC7 extended across both paths. Stays draft on Q1-Q6. |
| 2026-09-26 | 2edd42c | folding owner answers to storage-and-gc Q10 and proxy-cache Q11 | Not a review, and only a consequential update: neither decision is this spec's. The GC-and-eviction section now says five enumerated roots (pointer-targeted snapshots became the fifth on 2026-09-26) and states eviction correctly under proxy-cache's answer - it drops the cached reference and the sweep reclaims the bytes, eviction itself deleting nothing - which leaves the digest-independence argument behind AC7 intact and if anything longer-lived. Q5 is left open and unanswered; only its option C wording was corrected, since the mark root quarantine would add is now a sixth rather than a fifth. This spec's position that policy records are not a root is unchanged. |
