---
status: draft
status_description: "First review 2026-09-23 at d078c46 reconciled this spec against proxy-cache's settled decisions, placed policy records outside the GC root set, and added AC8 (condemned content never fetched). Six open questions await the owner, three of them architectural: component inventory, the evaluation hook, and condemned-artifact disposition."
description: "Spec for scanning artifacts and enforcing supply-chain policy at the registry boundary - blocking by vulnerability, licence or signature state, on both hosted and proxied content."
author: michielvha
goal: "Make the registry a policy enforcement point rather than a passive store, so a rule about what may enter a build is applied where every artifact already passes."
priority: "medium"
issue: ""
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

Ordering: `proxy-cache.md` lists supply-chain policy out of its own scope with the note that
policy "needs this first", so this spec's proxied phase depends on the proxy layer landing at
charter build-order step 4. The dependency is recorded in both directions here so neither spec
discovers it has no counterparty. The same recording obligation applies to the conformance
harness: AC2 needs a case that provisions a policy rule and a controlled advisory source, and
`conformance-harness.md`'s case `setup` currently provisions only repositories, tokens and
upstreams, so that spec needs a matching extension before AC2's case can be expressed. A
conformance case may not depend on the live feed's contents, or it fails and passes on
somebody else's publishing schedule.

## Scope

**In scope**

- Vulnerability scanning of stored artifacts, on ingest and on a schedule as advisories change.
- Licence detection and policy.
- Signature and attestation state as a policy input (Cosign, Sigstore, npm provenance, PyPI
  attestations), without this spec owning signature verification itself.
- Policy evaluation at the boundary: allow, warn, or refuse, per repository.
- Enforcement on **both** paths, hosted and proxied.
- Policy decisions recorded and queryable, so a refusal can be explained after the fact.

**Out of scope**

- Being a vulnerability database. Advisory data comes from external feeds.
- Remediation. The registry refuses or flags; fixing the dependency is the build's job.

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
  that is compatible: the initiating client, and every coalesced waiter, can receive bytes a
  later scan condemns, and the window setting is the deliberate acceptance of exactly that.
  Under refuse-until-scanned it is not: no byte may reach any client before the scan lands, so
  the fetch must decouple from the client stream entirely - fetch, commit, scan, then serve from
  the CAS - and the initiating client becomes indistinguishable from a coalesced waiter.
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
  even while the upstream is unreachable. What happens when the advisory feed itself is stale
  is Q1.

Evaluation order on a miss follows from enforcement being synchronous at resolution: resolution
precedes the upstream fetch, so a rule decidable from coordinates alone - an advisory naming
the package and version, a licence already recorded - refuses before any upstream request is
made, and condemned bytes are neither fetched nor cached. Rules that need the bytes can only
bind after the fetch. The `streamed` download policy stores nothing at all, so cache-then-scan
never happens there and only coordinate-decidable rules can bind; what enforcement is allowed
to promise under `streamed` is part of Q3.

### Policy is per repository, evaluated centrally

Policy attaches to a repository and is evaluated in the shared layer, never in a handler - the
same boundary rule auth follows, and for the same reason: a handler that forgets to evaluate
policy is an unenforced policy.

Invoking auth's precedent obliges this spec to what made that precedent work, and it does not
yet have it. The central authorizer can evaluate a request only because `format-handler-interface.md`
pins `Scope(r)`: the handler translates its own URL grammar into a scope the shared layer
understands, because only the handler can parse its protocol's URLs and the core is forbidden
from learning to. Central policy evaluation needs the same translation - a request mapped to
the package and version being resolved - and no pinned method provides it. The interface is
deliberately pinned at five methods until the post-OCI re-open, so where the evaluation hook
lives, and whether it requires an interface addition riding that re-open, is Q4. The refusal
itself is rendered per format regardless: the shared layer decides, and the handler translates
the decision into the protocol's own error shape, because a policy refusal an OCI client shows
as a malformed response is a refusal nobody can act on.

### Where scanning gets its component inventory

Matching an artifact against an advisory needs to know what the artifact contains, and the two
sources of that knowledge are both walled off. The metadata documents that carry a package's
declared licence and dependencies are opaque to the core (`data-model.md`, the settled metadata
typing: features like "every artifact under this licence" explicitly need a separate index
built later, which is this spec's problem to solve now). And the artifact bytes are format
shaped: an npm tarball's `package.json`, a wheel's `METADATA`, and above all an OCI image,
whose vulnerabilities live in the OS packages and bundled libraries inside its layers, where
coordinate-level matching sees nothing at all. OCI being the first proxyable format means the
first consumer of this spec is the case where name-and-version matching is nearly worthless.

The core knows repository format, package name and version string, so coordinate-level advisory
matching (the OSV query shape) needs no parsing and crosses no boundary. Everything beyond
that - licence detection, bundled components, image layers - has to come from somewhere, and
each candidate strains a different rule: a handler-provided inventory hook amends the pinned
interface, a format-aware scanner in the shared layer re-derives per-format knowledge outside
the handlers, and coordinate-only matching quietly guts the feature for OCI. This is the spec's
central unresolved tension and it is Q3, not a detail to be discovered in Phase 1.

### One security event, two settled responses

`proxy-cache.md` has already settled what happens when an upstream removal carries an explicit
security signal: purge the cached content immediately and alert the operator. This spec adds a
second path that reacts to the same real-world event - a malware advisory - by refusing at
resolution while the content stays stored and the refusal is recorded. The two paths behave
differently on purpose-shaped questions: purge destroys the evidence AC5 wants queryable, and
refusal keeps serving nothing while still holding the bytes. `proxy-cache.md` Q12 also named
active advisory checking as "a later feature with its own spec"; this is that spec, so the
composition must be stated rather than left as two subsystems that will disagree the first time
an advisory and a revalidation race. What a stored artifact's disposition is once policy
condemns it - purged, retained and refused, or quarantined - is Q5, and its answer must also
say which path wins when both fire.

### Interaction with GC and eviction

Scan results and refusal records reference artifacts, and `storage-and-gc.md` marks blob
liveness from four enumerated roots with a standing rule that the root set is the shared data
model's to amend, never any sibling's to extend silently. This spec therefore takes a position:
policy and scan records reference content by digest and coordinate and are **not** a liveness
root - a refusal record must stay queryable after the blob it condemned is gone, so it cannot
depend on the blob's existence. If Q5 answers "quarantine", holding condemned bytes for
forensics does pin them, and that is a mark-root amendment that goes through the sibling's
revision-and-re-review mechanism, not a side effect of this spec.

Eviction makes the digest-independence load-bearing rather than theoretical: a refused cached
artifact is never read, so LRU eviction under the repository quota will take its bytes early.
AC7's refusal-without-re-ingest must survive that - the refusal binds to the coordinate and the
recorded scan result, not to bytes still being in the cache - or eviction becomes a way to
launder a condemned artifact back into the serve-pending-scan window on re-fetch.

### Signature and attestation state has no producer yet

Scope names signature and attestation state as a policy input while disclaiming ownership of
verification, and no sibling spec owns it either: `auth.md` authenticates clients, not
artifacts. As written this is a dangling dependency of exactly the shape `proxy-cache.md` had
to have recorded against it, and it is why no acceptance criterion below covers the signature
input - an AC against an unspecced producer is untestable. Q6 decides who owns verification;
the signature AC is added when it is answered.

## Acceptance Criteria

- [ ] AC1: An artifact with a known vulnerability above the repository's threshold is refused at
      resolution on the **hosted** path, and the client receives an error naming policy rather
      than a generic failure - proven by a conformance case asserting a real client surfaces
      the refusal, not only by an integration test reading our own response.
- [ ] AC2: The same artifact arriving through the **proxied** path is refused identically, proven
      by a conformance case against a real client, using a case-controlled advisory source
      rather than the live feed.
- [ ] AC3: An artifact whose licence violates repository policy is refused, and one that does not
      is served, on both the hosted and proxied paths.
- [ ] AC4: Policy evaluation happens in the shared layer: an architecture test asserts no handler
      package imports or evaluates the policy engine.
- [ ] AC5: Every refusal is recorded with the artifact, the rule that refused it and the
      advisory or licence that triggered it, and is queryable afterwards - including after the
      refused content's blob has been evicted or collected.
- [ ] AC6: A repository configured to refuse-until-scanned refuses an unscanned artifact; one
      configured to serve-pending-scan serves it and, when the scan finds a violation, refuses
      from then on. A scan failure leaves the artifact observably unscanned with an operator
      signal past the retry bound, never silently unservable.
- [ ] AC7: A new advisory affecting already-stored content causes that content to be refused on
      the next resolution without re-ingest, on both paths, including content whose cached
      bytes have since been evicted.
- [ ] AC8: A coordinate-refused artifact requested through a remote repository is refused
      without any upstream fetch, asserted at the network layer: condemned content is neither
      fetched nor cached.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | integration + conformance | `internal/policy/vulnerability_test.go`, `conformance/oci/policy_test.go` (hosted mode) |
| AC2 | conformance | `conformance/oci/policy_test.go` (proxied mode) |
| AC3 | integration | `internal/policy/licence_test.go` (both paths) |
| AC4 | architecture test | `internal/policy/arch_test.go` |
| AC5 | integration | `internal/policy/audit_test.go` (including post-eviction queryability) |
| AC6 | integration | `internal/policy/scan_window_test.go` (window states plus scan-failure observability) |
| AC7 | integration | `internal/policy/advisory_update_test.go` (both paths, including evicted content) |
| AC8 | integration | `internal/policy/prefetch_refusal_test.go` (network-level assertion) |

## Implementation Phases

### Phase 1: Scanning
Ingest-time and scheduled scanning, advisory feed ingestion, results stored against artifacts.

### Phase 2: Policy evaluation
Per-repository rules, central evaluation, refusal recording.

### Phase 3: The proxied path
Enforcement on cache misses, the scan-window setting, conformance cases on both paths.

## Tasks

Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

### Q1: Which advisory feed is authoritative, and what happens when it is unreachable?

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

### Q2: Does policy apply to already-cached content retroactively, or only to new resolutions?

AC7 asserts the retroactive behaviour, so it stands or falls with this answer.

**Recommendation:** A, retroactive - a cache that keeps serving a package after it is known
malicious is the failure this feature exists to prevent.

| Option | You get | It costs |
|---|---|---|
| **A. Retroactive: every resolution evaluates current policy state** | The guarantee the feature is sold on: a known-malicious package stops serving everywhere at once | A newly published advisory breaks a build that worked an hour ago, with no change on the user's side |
| **B. New resolutions only: content already cached keeps serving** | Build stability; a green pipeline stays green | The cache becomes a policy-evasion mechanism, and "we cached it before we knew" is the exact incident report this feature exists to prevent |

**Why this is yours:** it trades build stability against the guarantee the feature is sold on,
and the same tension was decided one way for upstream removals (purge on security signal).

### Q3: Where does scanning get its component inventory, given the core cannot parse handler metadata?

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

### Q4: Where does central policy evaluation intercept a request that only the handler can decode?

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

### Q5: What is a stored artifact's disposition once policy condemns it - purged, retained and refused, or quarantined?

`proxy-cache.md` purges on an explicit upstream security signal; this spec refuses and retains.
The same malware advisory can arrive through either channel, so the composition must be one
deliberate rule, and the answer decides whether condemned bytes pin a GC root.

**Recommendation:** B - retain and refuse, with the proxy's purge rule narrowed to apply as
refuse-and-retain once policy exists, because a refusal is reversible when an advisory is
withdrawn (they are, regularly) and the recorded evidence is what AC5 promises; a purge is
neither.

| Option | You get | It costs |
|---|---|---|
| **A. Purge wins: policy condemnation deletes cached bytes, matching the proxy rule** | One behaviour for both channels; condemned bytes provably gone from disk | Destroys the evidence AC5 makes queryable, is irreversible when an advisory is withdrawn, and a re-fetch after withdrawal re-enters the unscanned window |
| **B. Retain and refuse: bytes stay, nothing serves, the record explains why** | Reversible on advisory withdrawal; forensics intact; one disposition to test | Diverges from the settled proxy purge behaviour, which must then be amended in `proxy-cache.md`, and operators must accept known-bad bytes remaining on disk |
| **C. Quarantine: bytes moved or pinned in a non-serving state with retention** | Explicit forensic story; serving path provably cannot reach them | A new GC mark root, which the `storage-and-gc.md` revision mechanism must absorb, and a third content state every path must handle |

**Why this is yours:** it reconciles two settled specs that currently disagree, and the choice
between destroying and retaining known-bad content is a liability and posture decision, not an
engineering one.

### Q6: Who owns signature and attestation verification, which this spec consumes but nothing produces?

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

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-23 | d078c46 | first review: adversarial + constitution + cross-spec (proxy-cache's settled stream-and-verify, single-flight, serve-stale and security-purge decisions; data-model's opaque metadata typing; format-handler-interface's pinned five methods and `Scope(r)` precedent; storage-and-gc's four mark roots and eviction; auth's client-not-artifact boundary) + go-spec-reviewer; claim verification vacuous pre-code (no `internal/policy/` exists). The reviewer terminated on a spend limit before writing this row; it is recorded here from the diff | Three of `proxy-cache.md`'s settled decisions were shown to collide with cache-then-scan and the collisions stated rather than left for implementation: refuse-until-scanned is incompatible with streaming to the initiating client, the scan lands inside the coalescing latency bound every waiter shares, and serve-stale needs the advisory feed as its independent signal. Evaluation order on a miss derived (coordinate-decidable rules refuse before any upstream request, giving AC8: condemned content is neither fetched nor cached). The auth precedent this spec invokes was shown to be unearned - central evaluation needs a request-to-coordinate mapping no pinned method provides - raising Q4. Component inventory named as the central tension (Q3): the flagship first format is the one coordinate matching cannot see into. Two settled specs shown to disagree on one real event (purge versus refuse-and-retain), raising Q5. Signature state confirmed to have no producer in any spec, raising Q6 and explaining the deliberately absent AC. Policy records placed against the GC root set as explicitly not a root, so a refusal outlives the blob it condemned (AC5, AC7) and eviction cannot launder a condemned artifact. Scan failure separated from scan result (AC6). AC1/AC3/AC7 extended across both paths. Stays draft on Q1-Q6. |
