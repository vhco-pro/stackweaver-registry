---
status: planned
status_description: "Fable follow-up round 2 of 2026-10-01 at 369f502, still planned: the four items queued against this spec since round 1 applied and verified against their sources' text at HEAD, none declined (the policy.feed_sync exclusivity key is feed_sync:{source}, the source's name, as async-operations' kind table has it, not the kind, so sources sync concurrently and one source never twice at once, in the feed section and AC23; because two sources can now sync at once, two carrying one malware advisory converge on one condemnation with both sources, one purge and one alert, AC13 extended with its test case; the policy.feed.import event's source reads osv when the route's parameter is absent, in the feed section, AC16 and its row; the import route refuses unauthorized to every non-admin principal and unauthenticated to a credential-less request per management-api's resolved refusal-type decision, was Q18, and its AC35, replacing the existence-oracle wording in AC16's row; the HijackReporter item found already applied in round 1, with format-handler-interface's first-reporter-once-after-the-write detail folded as a precision); 25 criteria, each mapped; zero open questions. Earlier: Fable follow-up of 2026-10-01 at 5303c57, still planned: the two items queued against this spec since its recheck applied and verified against their sources' text at HEAD, none declined (the advisory import is the route POST /api/v1/system/advisories/import?exported_at=&source= of management-api AC34, admin only, emitting one policy.feed.import audit event with source, exported_at and records on every import and no Operation, in the feed section and AC16; the freshness and degraded gauges are per source, policy_advisory_feed_freshness_timestamp_seconds{source} and policy_advisory_feed_degraded{source}, in the feed section, AC9 and AC21), the proxy-cache recheck's FirstByteWithin item found already applied at the recheck; the one judgment made is that every source has a name, the default feed's being osv, reserved, since the source label, the schedule label and the import route all need a value for it; the staleness_threshold key's meaning still read 'newest record' against was-Q13 and is corrected; the refusal writer's report to the middleware now cites format-handler-interface's HijackReporter and observability's wrapper (AC18); 25 criteria, each mapped; zero open questions. Planned by the Fable recheck of 2026-09-30 at f2b770b: a full review pass plus the re-examination of the four questions adopted on Opus. Q9 confirmed (a revision of the delegation-adopted Q1, within bounds; the owner's purge decision untouched) and amended (one record per source per id, aliases never identity; an ecosystem two sources list fails closed when either is stale; AC21 rewritten); Q10 confirmed and amended in its cost (the hijacked write must emit the pre-set headers, report its status to the request metrics and log, and drain or close; the phrase's condition set is AC5's; AC18 extended); Q11 confirmed and amended in its fold (RubyGems platform gems and Arch %BASE% added as key rows, a later write replaces the stored key, the late-report cost stated; AC24 extended; julia.md never received the fold, reported); Q12 confirmed and amended (the reader still returns component-level condemnations for an exempted name, a virtual resolves under its member's exemptions and ecosystem, an exemption names the coordinate as keyed; AC19 and AC25 extended). Q5's option D confirmed intact. Q13 raised and adopted under the delegation: a source's freshness is its last completed sync or the export time an import declares, floored by the newest record, because the newest record alone reads every quiet ecosystem as stale (checked against OSV's Hackage export; revises Q7's measure; AC9 and AC16 rewritten). Queued items applied: the RubyGems binding row split from the grouped pending row and its coverage row grounded, the Swift proxied key from the upstream list's canonical and alternate links, FirstByteWithin not honoured under refuse-until-scanned (AC6, shared test with proxy-cache AC21), data-model AC46 cited. go-spec-reviewer inline: approved after the fixes. 25 criteria, each with a Test Plan row; zero open questions; fable_recheck cleared. Consequences reported for julia, rubygems, observability, management-api, deployment, format-handler-interface, data-model, question-triage and lessons. Earlier: closing sweep 2026-09-28 at f4a9246 on Opus (not a review): the coverage table re-read against every format spec (Helm and Ansible collections uncovered, no OSV ecosystem as of 2026-09-28; Open VSX across every VSCode variant; Hackage, R numeric_version, Homebrew PkgVersion, NuGet, Packagist and RubyGems orderings added to the vendored set, version.pm owed if a CPAN source appears) and the binding table likewise (Composer, Go, NuGet, Cargo, Pub, Hex, CRAN, Julia, Homebrew, Arch, LuaRocks rows from their captures; the union warning closed per format by its recipe; Composer, dotnet and the code-only clients in the rendering paragraph). Q11 adopted (the handler reports an advisory key, origin, source package, UUID or bound URLs, stored core-parsed on Package or Version and carried on fetch-and-cache; AC24) and Q12 (hosted repositories match public coordinates with operator coordinate_exemptions on local repositories, the advisory reader keyed by repository and applying them; AC25). 25 criteria, zero open questions; fable_recheck added. Sweep 2026-09-28 at 6e6d503 (not a review): format-handler-interface AC14, data-model AC28, catalogue AC8 and conformance-harness AC26 cited where this spec had recorded consequences. Reconciled 2026-09-28 at 33679fb with the foundation authoring wave (not a review): artifact-verification's verdict shape (chain, revocation, superseded revision) consumed in AC15; scans and feed syncs as async-operations jobs and schedules; the policy. key table, the refusals route, rule administration through the repository PATCH, the lifecycle rule at tombstone, and observability's metrics, alerts and audit events all cited from their owners. Two Design sections built once for the format wave's findings: per-ecosystem OSV coverage with coordinate mapping and version ordering (Julia by UUID, Swift by URL, OS-package repositories by declared release, conda only through the cataloguer's pkg:conda PURLs) and per-format refusal binding with a closed Binds set and pending rows for uncaptured formats. Q9 adopted (one OSV schema, several sources; Homebrew's database becomes usable by configuration) and Q10 (a hijacked HTTP/1.1 status line naming the condition, canonical fallback on HTTP/2). 23 criteria, zero open questions; stays draft pending a gate review."
description: "Spec for scanning artifacts and enforcing supply-chain policy at the registry boundary - blocking by vulnerability, licence or signature state, on both hosted and proxied content."
author: michielvha
goal: "Make the registry a policy enforcement point rather than a passive store, so a rule about what may enter a build is applied where every artifact already passes."
priority: "medium"
issue: 15
created: 2026-09-23
covers:
  - "internal/policy/**"
  - "conformance/*/policy_test.go"
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
`docs/internal/plans/foundation/artifact-verification.md`, authored 2026-09-27. This spec defines
the consumer interface that sibling implements, so the verdict's shape is pinned on the consuming
side (the resolved verification-ownership question); `artifact-verification.md` AC1 proves its
`internal/verify` against this spec's AC15 rule in place of the fixture source.

The foundation authoring wave of 2026-09-27 placed four more counterparties this spec now cites
rather than owes. Scans and feed syncs run on the shared queue of `async-operations.md`, whose
Q9 moved the queue core to the start of step 4b so that verification and policy consume it
rather than each carrying a runner. Policy rules are administered, refusal records read and an
advisory export imported through `management-api.md`, and `web-ui.md` renders those records on
its Refusals tab. The
`policy.` configuration keys are tabled here in the three-column shape `deployment.md`'s
`scripts/check-config-keys.js` checks, and `deployment.md` also records two facts this spec acts
on in "Rendering a refusal": Go's `net/http` writes only the canonical reason phrase, and the
main listener speaks HTTP/1.1 by default so that a phrase reaches the clients that show nothing
else. `observability.md` names this layer's metrics, alerts and audit events, which the Test
Plan rows of AC5 and AC6 now assert. `repository-lifecycle.md` fixes what happens to this
layer's records when a repository is deleted.

Every Tier 2 and Tier 3 format spec was authored in the same wave against captured client
traffic, and each reported to this spec what its clients do with a refusal and what OSV holds
for its ecosystem. Those findings are folded into two Design sections, "What the feed covers,
per ecosystem" and "When a refusal binds, per format", and into two decisions adopted under the
standing delegation: advisory sources (was Q9) and the refusal status line (was Q10). The
closing sweep of that reconciliation added two more the format specs' findings forced: the
advisory key a handler reports where an advisory does not name the package itself (was Q11), and
coordinate matching on hosted repositories (was Q12). Where a
format spec has not yet captured its clients' fallback behaviour the table says `pending`, and
the format's policy conformance case (AC1 for the hosted path) is where the row gets filled,
because the exact response shape and the client's reaction are checked against captured traffic
when that case is written, never assumed from another format's.

## Scope

**In scope**

- Vulnerability scanning of stored artifacts, on ingest and whenever advisories change, matching
  both the artifact's coordinates and a component inventory catalogued from its bytes against
  advisory data in one schema, OSV's: the OSV feed by default, plus operator-declared sources
  in the same schema (the resolved advisory-sources decision, was Q9).
- Per-ecosystem coverage decided from the sources' own ecosystem lists, the per-ecosystem
  coordinate mapping and version ordering the matcher needs, and a per-repository ecosystem
  declaration for OS-package formats whose OSV ecosystems are keyed by distribution release.
- The advisory key: where an ecosystem's advisories name a package by something other than its
  package name and version (an origin or source package, a UUID, a Git URL, a platform gem's bare
  version number), the handler reports that key when it records the package or version and the
  core stores it as core-parsed data, replaced by any later write recording the same row, so the
  matcher never parses a version document (the resolved advisory-key decision, was Q11).
- Advisory freshness measured per source as the last completed sync or, for an import, the
  export time the import declares, so a quiet ecosystem is never stale for publishing nothing
  (the resolved freshness-measure decision, was Q13).
- Coordinate matching on hosted repositories, where a private package sharing a public name
  inherits the public package's advisories unless the operator exempts the name, for rules and
  the advisory reader alike (the resolved hosted-matching decision, was Q12).
- Licence detection from the artifact bytes, and licence policy.
- Signature and attestation state as a policy input, consumed as a verdict produced by
  `docs/internal/plans/foundation/artifact-verification.md` through a consumer interface this
  spec defines.
- A read-only advisory and condemnation query reached through `Deps`, keyed by the repository a
  handler serves, so a handler can render its ecosystem's in-band advisory channel (NuGet `VulnerabilityInfo`, Hex advisory links,
  Composer's security-advisories route, Open VSX's control document) without importing the
  policy layer.
- The rendering of a refusal at the transport level: the status line's reason phrase on HTTP/1.1
  and the canonical fallback (the resolved refusal-status-line decision, was Q10); the body stays
  the handler's, in its protocol's shape.
- A per-format statement of when a refusal binds on the client, with the deployment precondition
  each row carries, generated into the operator documentation by `deployment.md`.
- The `policy.` configuration keys, scans and feed syncs as `internal/async` work, the
  management API's rule administration and refusal read route, and this layer's metrics, alerts
  and audit events, each cited from its owning spec.
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
- Advisory data in any schema but OSV's. CPANSA and the Arch security tracker publish their own
  schemas and are not consumed until an OSV-schema export of them exists (the resolved
  advisory-sources decision, was Q9, records why).
- Restricting a client's egress. Where a refusal binds only with restricted egress, the control
  is on the build fleet and `deployment.md` ("Refusal enforceability is a deployment
  precondition") owns the operational half; this spec states the condition per format.

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

A scan is a job of kind `policy.scan` on the shared queue (`async-operations.md`, its kind
table), enqueued by the ingest hook on the hosted path and by the cache-commit hook on the
proxied path, in the committing transaction, so a committed artifact always has a scan queued
and an aborted commit never does. Its coalesce key is `scan:{digest}`, so one blob reaching the
store through two coordinates is scanned once. The kind declares its own retry bound and
backoff rather than taking the runner's defaults, because under refuse-until-scanned a scan
that gives up is a refusal with no finding behind it; past that bound the artifact is counted in
the `policy_unscanned_past_bound` gauge, whose alert `ArtifactUnscannedPastBound`
(`observability.md`) is the operator signal AC6 requires, and the job's `last_error` is what the
operator reads. The bound is `policy.scan.unscanned_alert_after` (Configuration, below), measured
from the commit that enqueued the scan, so a queue that never ran the job counts the same as one
that ran it eight times and failed. This layer owns no runner, worker pool or ticker: the
architecture test `async-operations.md` AC17 generalises holds `internal/policy` to that.

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

Advisory data comes in one schema, OSV's, from one feed by default (the resolved feed question,
was Q1, as revised by the resolved advisory-sources decision, was Q9). OSV is format-aware across
most of the catalogue's ecosystems, speaks the coordinate query shape the core can answer without
parsing, and carries package URLs the component inventory can be matched against. One schema
means no merge semantics for disagreeing advisories and no two severity scales, which is what the
single-feed decision was bought for; the format authoring wave then showed that nine ecosystems
have no OSV data while two of them have OSV-schema databases published elsewhere (Homebrew's, with
13,023 records, `homebrew.md`), so the unit the decision protects is the **schema**, not the
**host**. An operator may therefore declare additional sources in `policy.feed.sources`, each an
OSV-schema bulk export (`ecosystems.txt` plus `{ecosystem}/all.zip` at a root URL) declaring the
ecosystems it covers. Sources are a union, never a merge: a record is one source's statement
about one advisory `id`, so the same `id` from two sources is two records that never contradict
each other because each is evaluated on its own fields (a threshold rule fires on the stricter),
a condemnation both support carries both sources, and `aliases` are carried for display and never
used as identity, since identity by alias is a merge rule under another name. Freshness, sync and
staleness (below) apply per source, and an ecosystem is covered when at least one configured
source lists it; an ecosystem two sources list fails closed when either is stale, because each was
declared authoritative for it, which is what a source's `ecosystems` restriction exists to bound
(a private source restricted to its own ecosystem cannot take npm down with it). Every source has
a **name**, which is the value of the `source` label on this layer's per-source gauges
(`observability.md`), the schedule label of its `policy.feed_sync` schedule and the `source` the
import route (below) takes: a declared source's name is its `policy.feed.sources` entry's `name`,
and the default feed's is `osv`, reserved, so a `policy.feed.sources` entry named `osv` is refused
at configuration as a duplicate. Data in any other
schema is out of scope; CPANSA (2,117 advisories, `cpan.md`) and the Arch security tracker
(2,444 records, `arch.md`) are named in the coverage table below as the reason a conversion would
be worth having, and nothing here consumes them until one exists.

An ecosystem no configured source covers has no advisory data, and a rule depending on it is
refused at configuration like any other rule that cannot bind (the resolved
enforcement-under-`streamed` question states the general rule). Coverage is decided from the
sources' own ecosystem lists at sync time, never from a list compiled into the binary, because
OSV adds ecosystems (it recognises `Homebrew` while serving no records for it, `homebrew.md`) and
an ecosystem with a name and no records is uncovered: a rule binds when the ecosystem is listed
**and** its export is non-empty, and the refusal at configuration names which of the two failed.

Feed sync is on by default, alongside the preconfigured upstreams in `proxy-cache.md`, because
the security-signal rule's feed channel is only a guarantee if it runs without configuration. It
is a `Schedule` of kind `policy.feed_sync` on the shared scheduler (`async-operations.md`, "The
scheduler" and its kind table), one per source, with period `policy.feed.sync_interval` and
exclusivity key `feed_sync:{source}`, the source's name, so two processes never sync the same
source at once while different sources sync concurrently; under offline mode the schedule is
disabled, which is how "suspends the feed's network sync" is implemented rather than a flag the
sync checks. Because sources sync concurrently, two that carry one malware advisory for one
coordinate can meet the security-signal rule's second-channel clause (below) at the same moment:
the condemnation is written once, under a serialisation on the coordinate, the later sync adds
its source to it, and there is one purge and one alert, exactly as for the two arrival orders
(AC13). A source's **freshness** is the time its data was last shown to be what the source
publishes (the resolved freshness-measure decision, was Q13): for a synced source, the completion
of its last successful sync, one that read the root's `ecosystems.txt` and fetched or conditionally
confirmed every consumed export, with a sync that fails partway advancing nothing; for an imported
source, the export time the import declares (below). It is never the newest record's `modified`
time on its own, because a quiet ecosystem publishes nothing for months and is not stale for it,
and the export carries no production time of its own that could stand in (OSV's `Hackage/all.zip`
fetched 2026-09-29 held 33 records, every entry timestamp zeroed to 1980 and no manifest). Past an
instance-level staleness threshold
(`policy.feed.staleness_threshold`, default 24 hours) policy **fails closed**: a repository whose policy carries an
advisory-dependent rule (a vulnerability threshold or a malware rule) refuses resolutions with a
refusal naming stale advisory data rather than any advisory, recorded like every other refusal,
and the operator is alerted. Freshness is exported per source as
`policy_advisory_feed_freshness_timestamp_seconds{source}`, and staleness as
`policy_advisory_feed_degraded{source}`, `1` while that source's freshness is older than the
threshold, which is the `AdvisoryFeedDegraded` alert's input, one alert per source so the operator
sees which one (`observability.md`'s catalogue and alert table). Rules that do not read advisory data (licence, signature verdict)
keep evaluating. A remote repository with no policy attached is not refused: fail-closed is a
posture a repository opts into by attaching policy, and the proxy must keep serving an instance
that configured none. For such a repository a stale feed means the security-signal rule's feed
channel is degraded, which alerts the operator and refuses nothing. The accepted cost is that an
advisory-feed outage becomes a build outage for every repository that enforces advisories, which
is the deliberate direction: a policy engine that silently stops enforcing when nobody is
watching is the failure it must not have.

Offline mode (`proxy-cache.md`, a single instance-level switch) suspends the feed's network sync
along with every upstream request, because an air gap that still syncs advisories is not one.
The feed therefore also accepts a **local import** of OSV-schema bulk exports, carried across the
air gap by the operator together with the export's production time, the root's `Last-Modified` at
download, which the import names. Freshness is that declared time, never the moment of the import,
and an import naming no time, or a time earlier than the newest `modified` among its records, is
refused as inconsistent, so carrying an old export in does not make stale data look fresh by
accident; an operator who declares a false time has told the registry a lie the audit line
records, and holds the same power as one who removes the rule (the resolved freshness-measure
decision, was Q13, which revised the measure the offline-freshness decision, was Q7, had chosen).
The import is the administrative route
`POST /api/v1/system/advisories/import?exported_at=&source=` (`management-api.md` AC34 and its
endpoint table), admin only, refused `unauthorized` to every other principal and
`unauthenticated` to a request carrying no credential, because the route is registry-wide and
the existence oracle has nothing to protect there (`management-api.md`'s resolved refusal-type
decision, was Q18, and its AC35), in the shape of replication's archive import: the export is
streamed in the body, `exported_at` is the declared time and is required, and `source` names the
source the export belongs to, `osv` or a `policy.feed.sources` name, defaulting to `osv` when
absent, so an explicit `source=osv` and an absent `source` are one and the same import; an
import naming no configured source is refused `validation` like one naming no time. Every import,
applied or refused, emits one `policy.feed.import` audit event, registered by this spec with the
attributes `source`, `exported_at` and `records` (the count imported, zero on a refusal), `source`
being the name the import ran under, `osv` when the parameter was absent, and
leaves no `Operation`, because the import completes inside the request (`observability.md`'s audit
vocabulary carries the row). `deployment.md`'s air-gap recipe carries the `Last-Modified` beside
the archive and names both on that route. The staleness threshold is not suspended offline (the resolved
offline-freshness question): an air-gapped instance that enforces advisory policy imports on a
cadence inside the threshold, or fails closed. Offline mode is the single key `proxy.offline`
(`proxy-cache.md` AC5); this spec adds no second switch.

### What the feed covers, per ecosystem

Coordinate-level matching needs, per ecosystem, a coordinate the core knows mapped onto the
coordinate OSV keys the ecosystem by, and a version ordering under which OSV's `ECOSYSTEM` ranges
are evaluated. Both are ecosystem-specific and both were grounded by the format specs against
OSV's `ecosystems.txt` and query API (each row names the spec that captured it). The matcher
therefore carries a per-ecosystem table in `internal/policy`, which is core-owned knowledge about
the feed's key space, not format knowledge: it never parses an artifact or a request, and the
cataloguer's PURL types are the same table's third column, so the coordinate tier and the
inventory tier agree on what a package is called. Version ordering is taken from a vendored
implementation per scheme, and a range under an ordering the matcher does not implement binds no
rule: the ecosystem is treated as uncovered and the configuration refusal says why. The vendored
set is therefore exactly the orderings the covered rows below need, and a row is covered only
if its ordering is in it:

- semver (npm, Hex, Pub, Julia, `SwiftURL`, `VSCode`), Cargo's, PEP 440, Maven, NuGet's,
  Composer's normalised versions (Packagist), RubyGems', Go's;
- the OS-package orderings: RPM EVR with epoch, Debian, Alpine;
- opam's, where `~` sorts before everything (`opam.md`);
- Hackage's: dot-separated components compared as integers, left to right (`hackage.md`, which
  also refuses at publish two versions differing only by trailing zeros);
- R's `numeric_version`: components split on `.` or `-` and compared as integers, so `1.0-1`
  equals `1.0.1`, `1.01` equals `1.1` and `1.0` is below `1.0.0` (`cran.md`);
- Homebrew's `PkgVersion`: the version under Homebrew's tokenised comparison, then the `_revision`
  suffix as an integer, absent meaning `0`, which the records of Homebrew's own OSV-format
  database range over (`fixed` at `2.9.3_1`, `homebrew.md`), so declaring that database as a
  source binds rules without a code change.

`version.pm`'s ordering is not in the set: it is the only correct one for CPAN (`1.1` equals
`1.10`, `0.9` is above `0.10`, `cpan.md`), and CPAN has no OSV-schema source anyone can declare
today, so vendoring it is owed the moment one appears, and until it is vendored a declared CPAN
source still leaves the CPAN row uncovered by this rule. AC17 asserts the mapping and the ordering
per row.

| Ecosystem | OSV data | Coordinate the matcher keys on | Grounded in |
|---|---|---|---|
| npm, PyPI, Maven, Go, crates.io, NuGet, Packagist, Pub, Hex | covered | name and version as the ecosystem spells them (Maven as `groupId:artifactId`, Packagist as `vendor/name`), each under its own ordering in the vendored set; Go's `GO-` advisories arrive through OSV; RustSec is OSV's crates.io data | `npm.md`, `pypi.md`, `maven.md`, `go-modules.md`, `cargo.md`, `nuget.md`, `composer.md`, `pub.md`, `hex.md` |
| RubyGems | covered (`RubyGems`) | the name as spelled and the **version number without its platform**, under RubyGems' ordering; a platform gem's version string carries the platform (`1.1.0-x86_64-linux` is one RubyGems version entry), which RubyGems' ordering would read as a pre-release of `1.1.0`, so for such a version the handler reports the bare number as the version's advisory key (below) | `rubygems.md` (its "Policy refusals on the wire"; the key is this spec's consequence to it) |
| OCI images, generic | no ecosystem, by construction | nothing at coordinate level; OCI is matched through the component inventory (AC10); generic has no ecosystem to match | `oci.md`, `generic.md` |
| Helm charts | uncovered: OSV's `ecosystems.txt`, fetched 2026-09-28, lists no Helm or chart ecosystem | advisory rules refused at configuration unless a `policy.feed.sources` source declares one; coordinate and signature-verdict rules bind without it | `helm.md` |
| Ansible collections | uncovered: OSV's `ecosystems.txt`, fetched 2026-09-28, lists no Ansible or Galaxy ecosystem | advisory rules refused at configuration unless a `policy.feed.sources` source declares one, when the matcher keys on `{namespace}.{name}` under semver | `ansible-collections.md` |
| CRAN | covered (`CRAN`, RSEC advisories, `pkg:cran/`) | package name and canonical version under R's `numeric_version` ordering | `cran.md` |
| Hackage | covered (`Hackage`, 32 HSEC advisories, none withdrawn or `MAL-`; OSV's separate `GHC` ecosystem concerns the compiler, which no repository of this format serves) | package name, matched byte for byte, and version under Hackage's component-wise integer ordering | `hackage.md` |
| opam | covered (29 OSEC advisories over 18 packages, no `MAL-` entries) | package name and version under **opam's** version ordering, where `~` sorts before everything | `opam.md` |
| Julia | covered (`Julia`, 1,717 JLSEC advisories, no `MAL-` entries) | the package **UUID** as the advisory key, `pkg:julia/{name}?uuid={uuid}`, never the name alone, because a name is unique only within one registry; semver ordering | `julia.md` |
| Swift | covered only as `SwiftURL`, keyed by Git URL | the package's **bound repository URLs** in OSV's normalised `host/path` form as the advisory key, not its scope and name: on a hosted repository the URLs its first-claim binding holds (rewritten by a `rebind`), on a proxied one the normalised `canonical` and `alternate` links of the upstream's release list, reported when that list is adopted and carried on each version route's fetch-and-cache request; a package with no bound URL has no key and matches nothing | `swift.md` (its "Advisory coverage exists, keyed by Git URL", AC23) |
| Open VSX | covered (`VSCode` and `VSCode:https://open-vsx.org` today, 21 advisories, all `MAL-`) | `namespace.name` matched **case-insensitively** across **every** `VSCode` ecosystem variant, the Marketplace's `VSCode` and any `VSCode:{url}`, including ones OSV adds later, semver ordering, PURL type `vscode-extension`; every entry is a security signal under the shared rule | `openvsx.md` (its resolved OSV-matching decision, was Q17) |
| Debian, Ubuntu | covered, keyed by **source** package and release (`Debian:12`, `Ubuntu:24.04:LTS`) | the source package and source version as the advisory key, under the repository's declared release qualifier (below) | `debian.md` |
| RPM distributions | covered for `Red Hat`, `Rocky Linux`, `AlmaLinux`, `SUSE`, `openSUSE`, each by release; **Fedora is not an OSV ecosystem** | package name and EVR under the repository's declared ecosystem (below) | `rpm.md` |
| Alpine | covered (`Alpine:v3.N`, 4,679 records, no `MAL-` entries; none for edge) | the **origin** package as the advisory key, never the `pkgname` (in `Alpine:v3.22` `libssl3` matches nothing and its origin `openssl` 48 records), under the repository's declared release (below) | `alpine.md` |
| Conda | no ecosystem in the OSV schema | nothing at coordinate level; the cataloguer must open `.conda` and `.tar.bz2` archives and emit `pkg:conda/` PURLs, which the Phase 1 library selection checks for; until it does, byte-dependent rules on conda are refused like any uncovered format | `conda.md` |
| Terraform / OpenTofu | no ecosystem | advisory rules refused at configuration | `terraform.md` |
| Conan | `ConanCenter` is defined and holds **no data** | advisory rules refused at configuration: a listed ecosystem with an empty export is uncovered | `conan.md` |
| Vagrant, Chef, Puppet, LuaRocks | no ecosystem (Puppet also has no PURL type) | advisory rules refused at configuration | `vagrant.md`, `chef.md`, `puppet.md`, `luarocks.md` |
| CPAN | no ecosystem; CPANSA publishes 2,117 advisories in its own schema | advisory rules refused at configuration until an OSV-schema export of CPANSA is declared as a source **and** `version.pm`'s ordering is vendored (above) | `cpan.md` |
| Arch | no ecosystem; Arch's tracker publishes 2,444 records keyed by package base in its own schema | as CPAN, except that the handler already reports a split package's `%BASE%` as the version's advisory key (below), inert while no source lists an Arch ecosystem, so an OSV-schema export of the tracker binds when declared with no code change | `arch.md` (its "Advisories, OSV and the security-signal rule", AC24) |
| Homebrew | `Homebrew` is recognised by OSV's query API, absent from its exported `ecosystems.txt`, and `Homebrew/all.zip` answers `404`; Homebrew's own OSV-format database holds 13,023 records | uncovered by the default feed; covered the moment the operator declares Homebrew's database as a source, with no code change, which is the case the advisory-sources decision exists for: formula name (the PURL `brew` name) and version under Homebrew's `PkgVersion` ordering with its `_revision` suffix | `homebrew.md` |

**OS-package repositories declare their ecosystem.** OSV keys the Debian, Ubuntu, RPM and Alpine
ecosystems by distribution release, and a repository of one of those formats can serve any
release, so the core cannot infer which advisory set applies. A `local` or `remote` repository of
a format in this class carries an `advisory_ecosystem` setting (`Alpine:v3.20`, `Debian:12`,
`Rocky Linux:9`) validated at configuration against the sources' ecosystem lists and refused with
the unknown value named; an advisory-dependent rule on such a repository with no declaration is
refused at configuration as unbindable, and coordinate matching for the repository uses the
declared ecosystem and nothing else. The setting is a core-parsed field of the repository, not
part of the handler's opaque `settings` document, because the core evaluates it and the handler
never reads it (`data-model.md` AC28 stores it, and the `policy` document, beside the retention
rules, absent from every snapshot and from any handler `settings`).

**Where an advisory names something other than the package, the handler reports the key.** Five
rows key their advisories on a value that is not the core's `Package.name` and version string:
Alpine on the version's `origin` (from its `.PKGINFO`, the `o:` of its index entry), Debian and
Ubuntu on the source package and source version (the stanza's `Source` field), Julia on the
package UUID, Swift on the package's bound repository URLs, and RubyGems, for a platform gem only,
on the version number without the platform its version string carries; Arch reports a split
package's `%BASE%` the same way ahead of any coverage. The core never parses a version's
opaque metadata document, so it cannot find these itself, and a key supplied only with a request
would leave the feed sync blind to them, because re-matching a new advisory against stored
content (AC7, AC14) happens with no request in flight. Per the resolved advisory-key decision (was
Q11), the key is **reported by the handler and stored by the core**: an **advisory key** is one or
more names and at most one version, core-parsed and never part of any metadata document, held on
the `Package` for a key that is the package's (Julia's UUID, Swift's bound URLs) and on the
`Version` for a key that is the version's (Alpine's origin, Debian's source package and source
version, a RubyGems platform gem's bare number, Arch's base), a version-level key replacing the
package-level one. The handler supplies it in the same metadata-store write that records the
package or version, on the hosted and the proxied path alike, and **a later write recording the
same package or version replaces the stored key**, which is the general rule a Swift `rebind`
rewriting the URLs in its own write is one instance of; a version first recorded before the
document that names its key was read (a proxied package fetched ahead of its index) is matched by
its name until the next write reports the key, which is the reporting side of the silent
mis-match cost below. On a proxied miss the key also rides the fetch-and-cache request, taken from
the upstream document the handler already read, so the refusal before any upstream fetch (AC8)
keys on it too. Absent a key, the matcher keys on the package name and the version string, which
is every other row. The key is matched in the ecosystem the row or the repository's
`advisory_ecosystem` names, and a handler that reports a wrong key mis-matches silently, which
AC17's cases (one per covered row) and each format's policy conformance case are there to catch.
How the key travels through `Deps` is recorded in `format-handler-interface.md` (its AC17, a
re-open input with no method change, since it rides calls the pin already has); where it is stored
is `data-model.md` AC46. AC24 asserts it.

**Hosted repositories match public coordinates.** Coordinate matching keys on the ecosystem's
name space, which a hosted repository shares with the public registry of its ecosystem: a
private `acme/lib` on a hosted Composer repository and Packagist's `acme/lib` are one coordinate
to the matcher (`composer.md`, its resolved hosted-channel decision, was Q11 there). Per the
resolved hosted-matching decision (was Q12), a `local` repository whose policy carries an
advisory-dependent rule matches its versions against the public advisories exactly as a remote
does, so a private package that shares a public name inherits the public package's advisories.
That is deliberate: the collision is the dependency-confusion shape, a refusal naming the advisory
makes it visible, and over-refusal is the safe error. The remedy is an exemption the operator
declares, not a silent default: the `policy` document of a `local` repository may carry
`coordinate_exemptions`, a list of `{name, reason}` entries the operator asserts are not the
public package of that name, `name` being the coordinate as the matcher keys it for the format
(the advisory key where a row reports one). An exempted name is matched at neither tier by its own coordinate (a
catalogued component whose PURL is the exempted package itself is skipped too), while the
components catalogued inside it still match, so a private package's vulnerable dependency is still
found. An exemption on a `remote` repository is refused at configuration as `validation`, because a
remote's names are its upstream's by construction, and on a `virtual`, which holds no versions of
its own: a resolution through a virtual is evaluated on the version the resolving member holds,
under that member's `advisory_ecosystem` and exemptions, whether the rule is the virtual's or the
member's, and an advisory-dependent rule on a virtual of an OS-package format binds only while
every member declares an ecosystem, refused otherwise as AC11 refuses any rule that cannot bind.
Adding or removing one is a rule change and emits `policy.rule.update`. The OS-package
formats already have the opt-in shape for hosted content: a hosted repository with no
`advisory_ecosystem` matches nothing, as `debian.md` records. The advisory reader applies the same
exemptions (below), so what a handler renders never disagrees with what the rules enforce. AC25
asserts it.

### Configuration

The keys this spec owns, in the three-column shape `deployment.md`'s `scripts/check-config-keys.js`
(built in its Phase 1; not yet in the tree) checks against its schema:

| Key | Default | Meaning |
|---|---|---|
| `policy.feed.url` | `https://osv-vulnerabilities.storage.googleapis.com` | Root of the default OSV bulk export: `ecosystems.txt` and `{ecosystem}/all.zip` under it |
| `policy.feed.sources` | `[]` | Additional OSV-schema sources, each `{name, url, ecosystems}`; file-only; `name` is the source's `source` label and import name, unique and never `osv`, the default feed's reserved name; `ecosystems` restricts which of the source's listed ecosystems this instance consumes, empty meaning all |
| `policy.feed.sync_interval` | `1h` | Period of each source's `policy.feed_sync` schedule |
| `policy.feed.staleness_threshold` | `24h` | Age of a source's freshness (its last completed sync, or the export time its import declared) past which advisory-dependent rules on its ecosystems fail closed |
| `policy.scan.unscanned_alert_after` | `1h` | Time from commit after which an unscanned artifact counts in `policy_unscanned_past_bound` |

The advisory feed's own request path is an egress the adapter layer does not own: it is not an
upstream of any repository, so `upstream-adapters.md`'s allowlists do not apply, and the sync
client follows no redirect off the configured root and sends no credential, which
`internal/policy/feed_sync_test.go` asserts at the network layer alongside AC16.

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
  explainable event by this spec's own AC5. A handler's `FirstByteWithin` declaration
  (`proxy-cache.md`'s resolved first-byte-deadline decision, was Q16, as amended on its recheck)
  is **not honoured** under refuse-until-scanned: no byte reaches any client before the scan
  lands, so a client whose first-byte deadline is shorter than scan latency (Julia's Pkg abandons
  a request after twenty seconds without a byte) fails its cold misses on such a repository and
  does whatever its binding row says it does next. That is the setting's cost stated where it is
  paid, not a third path, and `internal/policy/refuse_until_scanned_test.go` asserts it, shared
  with `proxy-cache.md` AC21 (AC6).
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
`internal/format`, so a handler recognises it without importing `internal/policy` (AC4;
`format-handler-interface.md` AC14 holds the declaration from its side), and renders it in its
protocol's own error shape, because a policy refusal an OCI client shows as a malformed response
is a refusal nobody can act on. AC1's conformance case polices that rendering per format, since
only a real client can show whether the refusal surfaces as one; the exact response shape each
format's clients need is checked against that format's captured traffic when its policy case is
written, and each format spec authored in the wave carries a section on rendering the shared
refusal on its wire that AC1 tests against.

Rules are administered through the management API: the repository's `policy` document is a
field of `PATCH /api/v1/repositories/{name}` (admin, `management-api.md`'s repository
administration), and a rule that cannot bind is refused there as `validation` (422) with the
reason AC11 names, so an unenforceable policy never exists as a stored one. Each accepted change
emits the `policy.rule.update` audit event (`observability.md`). Refusal records are read at
`GET /api/v1/repositories/{name}/refusals` under `pull` (`management-api.md`'s endpoint table;
`web-ui.md`'s Refusals tab renders the same route), which is the "queryable afterwards" of AC5
made concrete: a principal who may pull the repository may learn why a pull was refused.
`repository-lifecycle.md` fixes the records' fate on deletion: rules are dropped at tombstone
time with the repository's other configuration, and condemnation and refusal records are never
dropped, because a refusal record must explain a refusal after the repository as well as after
the blob is gone (AC22).

### A handler may read advisories, never evaluate them

Four format specs need advisory data in a served document rather than as a refusal: NuGet's
registration pages carry `VulnerabilityInfo` (`nuget.md`), Hex's package payload carries
advisory links (`hex.md`), Composer serves a security-advisories route (`composer.md`), and Open
VSX's control document carries a `malicious` list that is the only refusal an editor explains
(`openvsx.md`). Without a shared read each handler would either invent its own advisory source or
import `internal/policy`, and AC4 forbids the second. `Deps` therefore carries a fourth
policy-layer consumer interface, the **advisory reader**, declared in `internal/format` beside the
refusal type: given the repository the handler is serving and a coordinate or a coordinate
range, it returns the advisory records matching it and the condemnations standing against it
(each with its sources), read from the same data the evaluator uses, and nothing else. It keys
the question the way the evaluator does, which is why it takes the repository rather than an
ecosystem string: the ecosystem is the format's row or the repository's `advisory_ecosystem`, the
coordinate's stored advisory key replaces its name where one was reported, a name the
repository exempts (`coordinate_exemptions`, the resolved hosted-matching decision, was Q12)
answers with no coordinate-matched advisory record while a condemnation standing against the
version through its catalogued components is still returned, because the rules still refuse on
it and a reader that hid it would be the disagreement the reader exists to prevent, and on a
`virtual` the answer is the resolving member's, under that member's ecosystem and exemptions. A
handler rendering an in-band channel for a hosted repository therefore never
shows a private package the public package's advisories after the operator has exempted it, and
before then shows exactly what the rules enforce; whether a format renders a channel on hosted
repositories at all stays the format's decision (`composer.md` declines for its default-blocking
client, its was-Q11). It refuses nothing, evaluates no rule and reads no bytes, so it is not
policy-enforcing and cannot be used to bypass the three policy-enforcing calls: it returns facts
about coordinates, never content. A handler renders what it reads in its own document shape;
under a stale feed it reads whatever the last sync stored, because a served advisory list is
informational and the fail-closed rule belongs to the enforcing calls. The five pinned methods are unchanged, and `format-handler-interface.md` records
the interface beside `Verifier` and the refusal type, together with the refusal writer
`WriteRefusal` as the module's only hand-written status line ("The pinned method set", its AC14);
its `internal/format/refusal_writer_test.go` and `internal/policy/advisory_reader_test.go` are the
same files AC18 and AC19 here name. AC19 proves the reader against a fixture handler holding only
`Deps`. The reader takes the repository served rather than an ecosystem since the hosted-matching
decision, which `format-handler-interface.md` records in that shape ("The pinned method set", its
AC14 and AC17); the signature is this spec's to own, per its rule that dependency interfaces'
signatures belong to the layers' owners.

### Rendering a refusal: the status line, the phrase and the body

The format authoring wave captured what each client shows its user when this registry answers a
refusal, and the finding is uncomfortable: many clients print only the HTTP status line and
never the body. Maven prints `status code: 403, reason phrase: Forbidden (403)` and Gradle
`Received status code 403 from server: Forbidden` (`maven.md`); apt prints `403  Forbidden` and
then blames the signature (`debian.md`); both pinned Composer releases print the response's own
status line verbatim, `could not be accessed (HTTP 403): HTTP/1.1 403 Forbidden`, taken from the
status-line header itself, the plainest case of the phrase reaching a user (`composer.md`);
`dotnet` reports `403 (Forbidden)` (`nuget.md`); R and pak show the status line (`cran.md`); the
CPAN clients show the status and phrase (`cpan.md`); conda's four clients each print the status
line (`conda.md`); Berkshelf and knife print a generic or misleading message without the body
(`chef.md`); Hex's `mix` and `rebar3` print a generic message and never the body, and whether
either shows the phrase is still to be captured (`hex.md`). A second group shows only the status
code, so no phrase reaches its user either and the reason reaches only the operator, through the
refusal record: dnf and zypper (`rpm.md`), brew and Vagrant through curl's `The requested URL
returned error: 403` (`homebrew.md`, `vagrant.md`), opam (`opam.md`), cabal (`hackage.md`), and
renv, which prints not even the status (`cran.md`). The counter-examples that show the body are
few: SwiftPM prints a problem document's `detail`, but only on its JSON routes and never on the
archive route (`swift.md`); Conan prints it under a misleading "Permission denied" prefix
(`conan.md`); Chef's Policyfile prints it (`chef.md`); the `go` command prints the status line and
a `text/plain` body (`go-modules.md`); the Puppet agents print the message and the status line
(`puppet.md`); pacman builds its own message from the status code (`arch.md`). For the first group
the only text this registry can put in front of a user is the reason phrase, and HTTP/2 has no
reason phrase (RFC 9113 removes it). `deployment.md` settled the transport half: the main listener speaks HTTP/1.1 by
default (`server.http2: false`, its resolved HTTP-version decision), and behind a proxy the
requirement is documented rather than enforced.

The half this spec owns is the write. Go's `net/http` writes the canonical `http.StatusText` for
every status and offers no API for another phrase, so a phrase naming the condition needs the
shared refusal path to take the connection (`http.Hijacker`) and write the status line itself,
which only works on HTTP/1.1 (the resolved refusal-status-line decision, was Q10). The refusal
writer lives in `internal/format` beside the refusal type, as `WriteRefusal(w, r, refusal, body)`,
`body` a `[]byte` so the writer frames it with `Content-Length` and never chunks: the handler
chooses the status code and the body in its protocol's shape and calls the writer;
on an HTTP/1.1 connection the writer hijacks, writes the status line `HTTP/1.1 {code} {phrase}`
with a phrase of the form `Refused by policy: {condition}` (ASCII, at most 120 bytes, the
condition being AC5's condition set: the advisory or signal id, the licence, the producer's
`failed` reason, `stale advisory data` or `unscanned`, never a URL and never CR or LF), writes the
headers already set on the `ResponseWriter` (the `X-Request-Id` echo every response carries,
`observability.md` AC14) and then the handler's headers and body, reports the status code and body
size to the request middleware it bypassed through `HijackReporter`, the one-method interface
(`Hijacked(status int, size int64)`) `format-handler-interface.md` declares beside the writer and
the writer calls once, after the connection is written, on the first reporter it finds through
the `Unwrap() http.ResponseWriter` chain, which `observability.md`'s
wrapper implements, so the refusal is counted in
`http_server_request_duration_seconds` and appears in the request log like any response rather
than vanishing at the hijack, drains or discards the unread request body, and closes or returns
the connection according to the request's keep-alive state, closing whenever the body was not
fully read; on HTTP/2, or wherever the
`ResponseWriter` is not a `Hijacker`, it falls back to the standard write with the canonical
phrase, and the body carries the same condition. The writer is the only place a status line is
hand-written in this codebase, held by an architecture test (AC18), because a hand-written status
line is a protocol bug waiting to happen and it must happen in exactly one place. The status code
is the handler's choice within its protocol (OCI's `DENIED` error under `403`, Conan's `403`
because its client falls through only on `404`, Chef's `403` because Berkshelf halts on nothing
else), and the phrase is the same across formats so an operator recognises it in any client's
output. AC18 asserts the raw status line on an HTTP/1.1 socket and the canonical fallback on
HTTP/2; the first reason-phrase-only client to reach conformance (Maven, Tier 1) asserts that
the phrase reaches the user, in that format's policy case.

### When a refusal binds, per format

A refusal is only a control if the client stops. The wave found three ways a client does not: it
falls back to another configured repository or to the ecosystem's origin, it follows URLs inside
the metadata this registry served, or it takes a refused index as "skip this repository" and
installs from another. The general answer to the second, from `opam.md` and `openvsx.md`, is a
rule every proxied format now follows: **the registry regenerates every served document and owns
every URL in it**. An opam file's source URL is rewritten to this registry's archive route with
mirrors and `swhid` removed; an Open VSX document is rendered from records, never relayed, so its
`files.download` URL is ours. `upstream-adapters.md` holds the transport half of the same rule:
no upstream `Location` reaches a client (its AC8) and no credential follows metadata to another
host (its AC6). A document relayed as fetched can refuse nothing, because the client will fetch
its URLs from wherever they point.

The first and third have no registry-side fix, and the table below states per format what
holds, under what condition, and what the client shows. The `Binds` column takes one of five
values: `holds` (the client stops on the refusal with no setting); `client-setting` (holds only
under a named client configuration, which the format spec's recipe sets); `restricted-egress`
(holds only when the client's network egress is restricted to this registry, the deployment
precondition `deployment.md` operationalises); `package-level` (a refused package holds but a
refused index makes the client skip the repository, so refusals must stay at package
granularity and the recipe configures a single source); `pending` (not yet captured; filled when
the format's policy case is written). `deployment.md` generates its operator page "When a
refusal actually blocks an install" from this table, so the table's shape is fixed and AC20
checks it lists every catalogue ecosystem.

| Format | Binds | Condition and what the client shows | Grounded in |
|---|---|---|---|
| generic | pending | no ecosystem client; a plain HTTP error | `generic.md` |
| OCI | pending | `DENIED` error under `403`; fallback behaviour of `docker`, `podman`, `oras` not yet captured | `oci.md` |
| npm, PyPI, Ansible collections, Helm | pending | rendering sections exist; whether the client prints the body or the phrase, and whether it falls back to another configured source (PyPI's `--extra-index-url`, Ansible's next `server_list` entry, a second Helm repository), is the format's policy case to capture: npm AC20, pypi AC16, ansible-collections AC14, helm AC17 | `npm.md`, `pypi.md`, `ansible-collections.md`, `helm.md` |
| RubyGems | pending | both clients print the phrase and never the body: `bundle install` retries the download four times and exits `5`, `gem install` exits `1` (captured on 4.0.20, 3.5.22 and 3.4.19); a refusal on `/info` or `/versions` is a bypass, not a refusal, since Bundler falls back silently through the dependency API and the legacy index to the quick spec and the `.gem`, so refusals bind on the `.gem`, quick-spec and attestation routes and the indexes keep listing the version; whether `gem install` with two configured sources falls back after a refusal is rubygems AC22's capture, which fills this row | `rubygems.md` (its resolved refusal-placement decision, was Q12) |
| Go modules | pending | `go` prints the status line and the `text/plain` body; the reference gives `403` the meaning "not on an approved list", on which the client is expected to stop rather than try the next proxy, and go-modules AC10's case captures that fallback before the row leaves `pending` | `go-modules.md` |
| NuGet | pending | `dotnet` prints the status line only and retries a download six times; fallback to another configured source is nuget AC12's capture | `nuget.md` |
| Cargo | pending | `cargo` prints `detail` verbatim on API refusals; index and download rendering and fallback to another source are cargo AC18's capture | `cargo.md` |
| Pub | pending | the refusal's message rides the `WWW-Authenticate` challenge, never a `401` (the client deletes its token on one); whether it is printed on an archive fetch and whether a second hosted URL falls back is pub AC16's capture | `pub.md` |
| Maven | pending | Maven and Gradle print the status line only; multi-repository fallback is maven AC13's capture, which is also AC18's proof that the phrase reaches both | `maven.md` |
| Debian | package-level | apt prints the status line and phrase; a refused package leaks when a second source offers the identical version (apt installs it with exit 0), so the recipe is a single source | `debian.md` |
| RPM | package-level | a refused package does not fall back; a refused `repomd.xml` makes dnf5 (`skip_if_unavailable` default) and zypper skip the repository and install from others; recipe is a single `baseurl` | `rpm.md` |
| Alpine | package-level | a refused package does not fall back; a refused or untrusted index is skipped silently; apk installs the highest version across all configured repositories, so dependency confusion is the default and the recipe is a single repository | `alpine.md` |
| Composer | pending | a refused version is omitted from the package file, so it is absent to the solver, and its dist answers `403`; on a dist `403` Composer 2.10.3 stops (source fallback is off by default) while 2.2.30 clones the version's `source` URL, so on 2.2.30 the refusal holds only with egress restricted; both print the raw status line, so the phrase reaches the user; whether a second configured repository (Packagist left enabled) supplies an omitted version is not captured, and composer AC10's case settles it before the row leaves `pending` (`conformance-harness.md` AC26 refuses the case until then); Packagist's malware list is a security signal | `composer.md` |
| Conda | pending | each of the four clients prints the status line, never the body, after solving from an index that still lists the refused record; fallback to a second channel is conda AC10's capture | `conda.md` |
| Conan | holds | halts on `401`, `403` and `5xx`; falls through only on `404`, so a policy refusal is `403` | `conan.md` |
| Swift | holds | on version routes: a `problem` entry in the release list makes 6.4 downgrade silently, so refusals never go there; detail shown on JSON routes only; each pinned client has one registry per scope and no fallback host | `swift.md` |
| Hex | pending | `mix` prints a generic message or `Request failed (403)` and `rebar3` a generic failure, never the body; whether either prints the phrase, and whether either falls back on a `403` (`rebar3` already asks each configured repository in order after a `404`), is hex AC12's capture | `hex.md` |
| CRAN | pending | R and pak show the status line, renv nothing; one fallback is already known: pak adds `https://cran.r-project.org` for a repository not named `CRAN` in `options(repos)`, so the recipe names it `CRAN` and pak's value can be no better than `client-setting`; the rest is cran AC10's capture | `cran.md` |
| Terraform / OpenTofu | holds | no client falls back to origin (captured with egress open); a provider `403` is misreported by the client as a credential rejection | `terraform.md` |
| Vagrant | holds | direct URL lists fall back on a `GET` failure, so refusals answer `HEAD` and `GET` alike; the client shows curl's rendering of the status code, never the body or the phrase | `vagrant.md` |
| Chef | holds | Berkshelf halts on `403` and falls through on any other universe status, so `403` is the only refusal code | `chef.md` |
| Puppet | holds | one Forge per client; `403` fails the run with no other host contacted; both agent lines print the message and the status line, r10k the `errors` strings | `puppet.md` |
| LuaRocks | restricted-egress | a refused manifest falls through to the next server group and luarocks.org stays behind any `--server`; the client unions servers and takes the highest version; a refused file halts the install even with a second server group holding it, so the refusal holds for a client configured with this registry alone (`--only-server`, or `rocks_servers` naming one virtual repository) or whose egress is restricted to it | `luarocks.md` |
| Hackage | holds (hosted, virtual) / restricted-egress (remote) | hosted and virtual repositories sign an empty `mirrors.json`; a remote serves Hackage's own, and both cabal lines retry a refused request on every signed mirror | `hackage.md` |
| CPAN | restricted-egress or client-setting | every client has a route back to public CPAN (Carton hard-codes cpan.metacpan.org and backpan; cpanm consults cpanmetadb and MetaCPAN; cpm never reads the mirror index by default; CPAN.pm 2.38 `pushy_https` ignores the mirror list); `cpanm --mirror-only` is the one captured setting that holds | `cpan.md` |
| opam | holds | by rewrite: every source URL is ours, mirrors and `swhid` removed, the relative `archive-mirrors: "cache"` kept; the user sees only the status code | `opam.md` |
| Julia | restricted-egress | Pkg falls back to GitHub on any server failure: a `403` on a proxied General package installed from GitHub with exit 0 and no message on both clients; a hosted package, which carries no `repo`, fails with no egress attempt | `julia.md` |
| Homebrew | client-setting | holds under the recipe (`HOMEBREW_ARTIFACT_DOMAIN`, with `HOMEBREW_ARTIFACT_DOMAIN_NO_FALLBACK` on 7.x) and on hosted tap bottles; under `HOMEBREW_BOTTLE_DOMAIN` only with egress restricted, since brew falls back to `ghcr.io` with no switch; the API domain falls back to `formulae.brew.sh` on any failure; brew shows curl's rendering of the status code, never the phrase or the body | `homebrew.md` |
| Open VSX | holds | by regeneration: editors retry at `fallbackAssetUri` and follow any `files.download` URL, so every URL is ours; a refused download is written out as a corrupt package, and whole-extension condemnations are rendered into the control document's `malicious` list, the only refusal an editor explains | `openvsx.md` |
| Arch | client-setting | `SigLevel = Required DatabaseRequired` in the recipe: under the shipped `DatabaseOptional` a `.db.sig` answering `403` or `404` is silently accepted; a refused package fails the whole transaction with nothing installed; database routes never answer a policy refusal, since a refused database fails every sync; pacman builds its own message | `arch.md` |

Three rows carry a warning beyond the refusal: apk and the LuaRocks client union every configured
repository and take the highest version, and Chef's Berkshelf unions its sources the same way
(`alpine.md`, `luarocks.md`, `chef.md`), so on those formats a second configured source can
supply a higher version, or the refused one, whatever this registry answers. Each format spec
closes it with the same recipe, this registry as the client's only source (a single repository
for Alpine, `--only-server` or a `rocks_servers` naming one virtual repository for LuaRocks, a
virtual repository as Berkshelf's only source for Chef), and the operator documentation says
beside the table that the row holds only under that recipe. The security-signal rule's
purge is unaffected by any row: content that is gone from the cache cannot be served whatever
the client does next.

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
coverage, where coverage is checked row by row against the per-ecosystem table above: in
particular the library must open `.conda` and `.tar.bz2` archives and emit `pkg:conda/` PURLs,
because conda has no coordinate-level coverage at all (`conda.md`) and the inventory is the only
tier that can condemn a conda package. The PURL types the cataloguer emits are the same table's
column, so the inventory tier and the coordinate tier match against the same OSV keys. It
catalogues only; matching is against the configured OSV-schema sources, so the inventory tier
adds no advisory source of its own. Licences are detected from the bytes by the same pass, which
is what AC3 enforces against.

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
`docs/internal/plans/foundation/artifact-verification.md`, and this spec consumes its output (the
resolved verification-ownership question).

The consumer owns the interface, per the `go` skill: `internal/policy` defines a verdict source
answering, per artifact digest, one of verified, failed or absent, with the identity a verified
verdict was checked against. The producer, `internal/verify`, implements it (its AC1) and fixed
three things on the verdict this spec's rules now read. A verified verdict carries a **chain**,
`publisher` when the artifact's own signature or attestation verified, or `repository-chain` when
the artifact is vouched for by a verified signed index that names its digest (CPAN `CHECKSUMS`,
Hackage's TUF chain, Homebrew's JWS documents, apk and Arch database entries, RPM `repomd.xml`,
Terraform `SHA256SUMS`); a rule requiring a publisher identity binds only to `publisher`, and a
rule requiring any verified verdict accepts both. A verdict carries a **revocation** field with
the state the producer's revocation mode yielded, so a rule may be strict on revocation (refuse
unless revocation was checked and clear) or accept a `cached`-mode answer. And a verdict computed
under a **superseded trust-set revision** is answered `absent` until re-evaluation replaces it, so
a trust change fails closed on this side without this spec doing anything. A repository rule may
require a verified verdict, optionally with chain `publisher`, optionally from a named identity in
the producer's canonical identity form, optionally strict on revocation; an absent verdict is not a
verified one, and a `failed` reason from the producer's closed list is recorded in the refusal
(AC5) as the condition. A signature rule on a format whose producer entry answers absent for every
artifact (Puppet, Vagrant, `puppet.md` and `vagrant.md`) is not refused at configuration, because
the verdict source exists and answers; it refuses every artifact, which is the rule's meaning and
the operator's choice. AC15 proves the consumer side against a fixture source, and the producer's
own AC1 runs the same test with `internal/verify` in the fixture's place, so the rule's semantics
are fixed on this side and met on that one.

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
      advisory, licence, security signal, verdict failure or stale-feed condition that triggered
      it, and is queryable afterwards through `GET /api/v1/repositories/{name}/refusals` under
      `pull` - including after the refused content's blob has been evicted, purged or collected;
      each refusal increments `policy_refusals_total{format,condition}` and emits the
      `policy.refusal` audit event, each condemnation the `policy.condemnation` event, and each
      accepted rule change the `policy.rule.update` event, with the attributes
      `observability.md` registers.
- [ ] AC6: A repository configured to refuse-until-scanned refuses an unscanned artifact, and on
      a cache miss no byte reaches any client, the initiating one included, before the scan
      result lands; one configured to serve-pending-scan serves it and, when the scan finds a
      violation, refuses from then on. Every committed artifact has exactly one `policy.scan` job
      enqueued in its committing transaction (coalesced by digest), and an aborted commit
      enqueues none. A scan failure leaves the artifact observably unscanned, never silently
      unservable: past `policy.scan.unscanned_alert_after` it counts in
      `policy_unscanned_past_bound`, which is the `ArtifactUnscannedPastBound` alert's input, and
      the job's `last_error` names the failure. Under refuse-until-scanned a fetch whose handler
      declared `FirstByteWithin` delivers no byte to any client before the scan lands either.
- [ ] AC7: A new advisory affecting already-stored content causes that content to be refused on
      the next resolution without re-ingest and without re-reading its bytes, on both paths,
      including content whose cached bytes have since been evicted.
- [ ] AC8: A coordinate-refused artifact requested through a remote repository is refused
      without any upstream fetch, asserted at the network layer: condemned content is neither
      fetched nor cached.
- [ ] AC9: When a source's freshness is older than `policy.feed.staleness_threshold`, a
      repository whose policy carries an advisory-dependent rule on an ecosystem that source
      lists refuses resolutions with an error naming stale advisory data and the operator is
      alerted (`policy_advisory_feed_degraded{source}` at `1` for that source and `0` for every
      other, the `AdvisoryFeedDegraded` alert's input, one alert per source), while a repository
      with only licence rules and a remote repository with no policy keep serving; freshness is
      the completion of the source's last successful sync, exported per source as
      `policy_advisory_feed_freshness_timestamp_seconds{source}` with `osv` as the default feed's
      label value, so a source whose ecosystems have published no new record for longer than the
      threshold stays fresh while its syncs complete and a sync that fails partway advances
      nothing; the first completed sync that restores freshness lifts those refusals with no
      operator action and returns the gauge to `0`.
- [ ] AC10: An OCI image whose repository, name and tag match no advisory, but whose layers
      contain an OS package an advisory names above the repository's threshold, is refused at
      resolution with the matched component in the refusal record, and the handler's metadata
      documents are byte-identical before and after the image was catalogued.
- [ ] AC11: A byte-dependent rule (licence, component-level vulnerability) attached to a remote
      repository under the `streamed` download policy, or to a format the cataloguer does not
      cover, and an advisory-dependent rule on an ecosystem no configured source covers (not
      listed, or listed with an empty export, as Conan's `ConanCenter` is) or on an OS-package
      repository with no `advisory_ecosystem` declaration, are each refused at configuration
      through `PATCH /api/v1/repositories/{name}` as `validation` with an error naming which
      condition failed; an `advisory_ecosystem` value absent from every source's list is refused
      the same way; coordinate-level rules on the same repositories are accepted and enforced,
      and no unbindable rule is ever stored.
- [ ] AC12: No content resolves around the policy check: a fixture handler constructed only with
      `Deps` receives the typed refusal from the metadata-resolution, blob-read and
      fetch-and-cache calls for a condemned coordinate, and no call it holds returns the
      condemned content's bytes.
- [ ] AC13: A malware advisory from the feed for a coordinate already condemned by the upstream
      security signal, and the same pair in the reverse order, leave one condemnation carrying
      both sources, one purge and one operator alert, and the coordinate stays refused until
      both sources have withdrawn; the same malware advisory carried by two configured sources
      whose `policy.feed_sync` schedules run concurrently leaves one condemnation carrying both
      sources, one purge and one alert; a vulnerability condemnation of cached content ends no
      cached reference, and its withdrawal lifts the refusal in place with no re-fetch.
- [ ] AC14: A malware advisory published to the feed for a coordinate cached in a remote
      repository that receives no requests is acted on at the next feed sync, with no client
      request involved: the cached references end, the refusal record exists and the operator
      alert fires.
- [ ] AC15: A repository rule requiring a verified signature refuses an artifact whose consumed
      verdict is failed or absent and serves one whose verdict is verified, proven against a
      fixture implementation of this spec's verdict-source interface; a rule requiring chain
      `publisher` refuses a `repository-chain` verdict and a rule requiring any verified verdict
      accepts it; a rule strict on revocation refuses a verdict whose revocation state is not
      clear; a verdict under a superseded trust-set revision is treated as absent; the refusal
      record carries the producer's `failed` reason as its condition; with no verdict source
      configured, the rule is refused at configuration. `artifact-verification.md` AC1 runs the
      same cases with `internal/verify` in the fixture's place.
- [ ] AC16: With the instance in offline mode (`proxy.offline`) every `policy.feed_sync` schedule
      is disabled and the advisory feed performs no network sync (asserted at the network layer),
      a local import of an OSV-schema bulk export through
      `POST /api/v1/system/advisories/import?exported_at=&source=` (admin, every other
      principal refused `unauthorized` and a credential-less request `unauthenticated`;
      `management-api.md` AC34 and AC35) updates the named source's advisory data, `osv` or a
      `policy.feed.sources` name and `osv` when `source` is absent, freshness after the
      import is the export time the import declared and never the time of the import, an import
      declaring no time, a time earlier than the newest `modified` among its records, or a
      `source` no configuration names is refused `validation`
      with nothing imported and the freshness unchanged, importing an export whose declared time is older than the
      staleness threshold leaves advisory-dependent policy failing closed, and every import,
      applied or refused, emits exactly one `policy.feed.import` audit event carrying `source`
      (`osv` when the parameter was absent), `exported_at` and `records` (zero on a refusal)
      and leaves no `Operation`.
- [ ] AC17: For every row of "What the feed covers, per ecosystem" that is covered, a fixture
      advisory in that ecosystem's OSV key form condemns the artifact whose core coordinate maps
      onto it and nothing else: Julia by UUID and not by name, Swift by bound repository URL,
      Debian by source package and the repository's declared release, Alpine by origin package,
      Open VSX case-insensitively across every `VSCode` ecosystem variant (the bare `VSCode`,
      `VSCode:https://open-vsx.org` and a fixture `VSCode:{url}` OSV does not hold today), and
      version ranges evaluated under the ecosystem's own ordering (opam's `~` sorting before
      every other version, RPM EVR with epoch, Debian versions, PEP 440 pre-releases, semver,
      Hackage's component-wise integers, R's `numeric_version` with `1.0-1` equal to `1.0.1` and
      `1.0` below `1.0.0`, and, with Homebrew's database declared as a source, Homebrew's
      `PkgVersion` with `2.9.3_1` above `2.9.3`); a range under an ordering the matcher does not
      implement leaves the ecosystem uncovered with the refusal at configuration naming the
      ordering, and the Helm and Ansible collections rows are refused as uncovered while no
      configured source lists their ecosystem.
- [ ] AC18: A refusal served on an HTTP/1.1 connection carries the status line
      `HTTP/1.1 {code} Refused by policy: {condition}` observed on the raw socket, with the
      `X-Request-Id` the middleware set, the handler's headers and body intact, the connection's
      keep-alive state honoured (closed when the request body was not fully read), and the
      refusal counted in `http_server_request_duration_seconds` with its status code and present
      in the request log exactly as a non-hijacked response would be; the same
      refusal over HTTP/2, or through a `ResponseWriter` that is not a `Hijacker`, carries the
      canonical phrase and the same condition in the body; the status and size reach the
      middleware through the `HijackReporter` the writer finds on the `Unwrap` chain, exactly
      once, and a chain holding no reporter still gets the refusal written; an architecture test
      asserts that `internal/format`'s refusal writer is the only site in the module that writes
      a status line by hand; the first reason-phrase-only client to reach conformance shows the
      phrase to the user in its policy case.
- [ ] AC19: A fixture handler constructed only with `Deps` reads, through the advisory reader, the
      advisory records and standing condemnations (with sources) for the repository it serves and
      a coordinate or range, keyed as the evaluator keys them (the format's ecosystem or the
      repository's `advisory_ecosystem`, the stored advisory key in place of the name), receives
      an empty answer for an uncovered ecosystem rather than an error, receives for a name the
      repository exempts no coordinate-matched advisory record but still any condemnation
      standing against the version through its catalogued components, receives for a `virtual`
      the resolving member's answer under that member's ecosystem and exemptions, obtains no
      content bytes through it, and imports nothing from
      `internal/policy`; under a stale feed the reader answers from the last sync while the
      enforcing calls fail closed.
- [ ] AC20: "When a refusal binds, per format" lists every ecosystem of `catalogue.md` exactly
      once with a `Binds` value from the closed set, checked by `make verify`; `deployment.md`'s
      operator page is generated from it and never hand-copied; and a `pending` row is replaced
      by a captured value in the same change that lands that format's policy conformance case, so
      no format reaches its policy case with its row still `pending`.
- [ ] AC21: Advisory data from a second OSV-schema source declared in `policy.feed.sources` covers
      the ecosystems it lists and no others: an advisory `id` present in both sources is stored
      once per source, each record evaluated on its own fields with a threshold rule firing on
      the stricter, and a condemnation both support carries both sources, while an alias shared
      by two ids never merges them; an ecosystem covered only by the second source binds rules,
      a stale second source fails closed for the ecosystems it lists alone, those the default feed
      also lists included, while the default feed's other ecosystems keep evaluating, and a source
      whose `ecosystems` restriction omits an ecosystem neither covers nor fails it; a source
      whose `ecosystems.txt` cannot be read is refused at configuration; a source in any other
      schema is refused at configuration naming the schema; a source named `osv`, or two sources
      sharing a name, are refused at configuration as duplicates, and each configured source
      exports its own `policy_advisory_feed_freshness_timestamp_seconds{source}` and
      `policy_advisory_feed_degraded{source}` series under its name.
- [ ] AC22: Deleting a repository leaves every condemnation and refusal record it held readable
      with its reason, through the tombstone at and after tombstone time, while its policy rules
      are dropped at tombstone time; recreating a repository under the same name starts with no
      rules and inherits no refusal record.
- [ ] AC23: Every `policy.` key in the Configuration table exists in `deployment.md`'s schema with
      the same default and no other spec tables it, checked by `scripts/check-config-keys.js`
      under `make verify`; each source's `policy.feed_sync` schedule runs at
      `policy.feed.sync_interval` on the injected clock under exclusivity key
      `feed_sync:{source}`, so two sources sync concurrently and one source never runs twice at
      once; the feed sync connects only to
      configured source roots, follows no redirect off a root and sends no credential, asserted
      at the network layer.
- [ ] AC24: A version whose handler reported an advisory key differing from its package name
      and version (an Alpine subpackage `swhello-doc` with origin `swhello`, a Debian binary
      package whose `Source` names another source package and version, a Julia package by
      UUID, a Swift release by its bound URLs, a RubyGems platform gem `1.1.0-x86_64-linux`
      keyed `1.1.0`, an Arch split package keyed by its base) is condemned by an advisory naming
      the key and not by one naming only the package name or the version string, both at
      resolution and at a feed sync with no request in flight; the key is stored as core-parsed
      data on the `Package` or `Version`, a version-level key replacing a package-level one, and
      never read from a metadata document; a proxied miss whose fetch-and-cache request carries
      the key is refused before any upstream request; a later write recording the same package
      or version replaces the stored key, a Swift `rebind` moving the matched URLs in its own
      write being one case and a proxied version first recorded without a key and re-reported
      with one another; and a version reported with no key is matched on its package name and
      version string.
- [ ] AC25: On a `local` repository whose policy carries an advisory-dependent rule, a version
      whose package name equals a public advisory's coordinate is refused exactly as on a
      `remote`; with that name in the policy's `coordinate_exemptions` it is served, it is no
      longer matched by its own coordinate at either tier while a vulnerable component
      catalogued inside it still refuses it, the advisory reader answers no coordinate-matched
      record for the name on that repository and not on another while still answering that
      component condemnation, the same version resolved through a `virtual` holding the
      repository as a member is refused and served exactly as the member alone would, and the
      change emits `policy.rule.update`; `coordinate_exemptions` on a `remote` or `virtual`
      repository is refused at configuration as `validation` naming the repository type, and
      nothing is stored.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | integration + conformance | `internal/policy/vulnerability_test.go`, `conformance/oci/policy_test.go` (hosted mode) |
| AC2 | conformance | `conformance/oci/policy_test.go` (proxied mode; rule and advisory through the `policies` and `advisories` keys); `conformance/core/seed_test.go` (both provisioners reached through the seed path) |
| AC3 | integration | `internal/policy/licence_test.go` (both paths, licence detected by the cataloguer) |
| AC4 | architecture test | `internal/policy/arch_test.go` (both import directions) |
| AC5 | integration | `internal/policy/audit_test.go` (including post-eviction, post-purge, stale-feed and verdict-failure records; `policy_refusals_total`, `policy.refusal`, `policy.condemnation` and `policy.rule.update` through `telemetry.NewTestRecorder`); `internal/manage/reads_test.go` (the refusals route under `pull`, shared with `management-api.md` AC28) |
| AC6 | integration | `internal/policy/scan_window_test.go` (window states, no byte to the initiating client under refuse-until-scanned; one `policy.scan` job per commit and none on abort against the fixture runner; scan failure past `policy.scan.unscanned_alert_after` observed as `policy_unscanned_past_bound` through `telemetry.NewTestRecorder` with `last_error` set); `internal/policy/refuse_until_scanned_test.go` (a `FirstByteWithin` fetch under refuse-until-scanned delivering no byte before the scan; shared with `proxy-cache.md` AC21) |
| AC7 | integration | `internal/policy/advisory_update_test.go` (both paths, including evicted content; cataloguer instrumented to prove no re-read) |
| AC8 | integration | `internal/policy/prefetch_refusal_test.go` (network-level assertion) |
| AC9 | integration | `internal/policy/feed_staleness_test.go` (injected clock across the threshold, three repository shapes, recovery sync; a source with no new record whose syncs keep completing stays fresh, a sync failing partway leaves freshness where it was; `policy_advisory_feed_freshness_timestamp_seconds{source}` and `policy_advisory_feed_degraded{source}` through `telemetry.NewTestRecorder`, one series per source with `osv` for the default feed, the degraded gauge at `1` for the stale source alone and back to `0` on the recovery sync; shared with `observability.md` AC18's alert-input row) |
| AC10 | integration | `internal/policy/inventory_test.go` (fixture OCI image with a vulnerable OS package in a layer, metadata-document digest compared before and after) |
| AC11 | unit + integration | `internal/policy/rule_binding_test.go` (configuration rejection for each unbindable case, listed-but-empty ecosystem, missing and unknown `advisory_ecosystem`, enforcement of the accepted coordinate rules); `internal/manage/repository_test.go` (`validation` on `PATCH`, nothing stored) |
| AC12 | integration | `internal/policy/deps_enforcement_test.go` (fixture handler holding only `Deps`) |
| AC13 | integration | `internal/policy/security_signal_test.go` (both arrival orders, two sources syncing concurrently with one malware advisory, withdrawal of one then both sources, vulnerability withdrawal in place) |
| AC14 | integration | `internal/policy/security_signal_test.go` (unrequested cached coordinate, sync-driven) |
| AC15 | integration | `internal/policy/signature_verdict_test.go` (fixture verdict source: chain, revocation, superseded revision, failed reason in the record; `artifact-verification.md` AC1 reruns it over `internal/verify`) |
| AC16 | integration | `internal/policy/feed_import_test.go` (schedules disabled and network-level assertion under offline mode; an export imported through the route with a fresh declared time, with an old one, with none, with one earlier than its newest record, and naming an unconfigured `source`, the last three refused `validation` with nothing imported and freshness unchanged; `source` absent defaulting to `osv`, the event's `source` reading `osv`; one `policy.feed.import` event per import with `source`, `exported_at` and `records`, zero on a refusal, through `telemetry.NewTestRecorder`; no `Operation` row; shared with `management-api.md` AC34's `internal/manage/advisory_import_test.go`, which drives the same cases through the route as admin and asserts `unauthorized` for every non-admin principal and `unauthenticated` for a credential-less request, its AC35) |
| AC17 | unit + integration | `internal/policy/ecosystem_mapping_test.go` (one case per covered row: key form, ordering, negative case; every `VSCode` variant including an unknown `{url}`; unimplemented ordering refused; Helm and Ansible refused as uncovered); `internal/policy/version_order_test.go` (each vendored ordering against a table generated by the ecosystem's own implementation, including Hackage, `numeric_version` and Homebrew `_revision` cases) |
| AC18 | integration + architecture test + conformance | `internal/format/refusal_writer_test.go` (raw HTTP/1.1 socket status line, keep-alive and the close on an unread body, the `X-Request-Id` and other pre-set headers on the wire, the refusal observed in `http_server_request_duration_seconds` and the request log through `telemetry.NewTestRecorder`, the `HijackReporter` called exactly once with the written status and size and a chain without one still answered, HTTP/2 canonical fallback, non-Hijacker fallback; shared with `format-handler-interface.md` AC14 and `observability.md`'s `internal/telemetry/hijack_test.go`); `internal/format/arch_test.go` (single hand-written status line site, shared with the same); `conformance/maven/policy_test.go` (phrase visible in Maven's and Gradle's output) |
| AC19 | integration | `internal/policy/advisory_reader_test.go` (fixture handler holding only `Deps`; keyed by repository, `advisory_ecosystem` and stored advisory key; uncovered ecosystem; exempted name with and without a component condemnation; a virtual answering as its resolving member; stale feed; import assertion; shared with `format-handler-interface.md` AC14) |
| AC20 | ci | structure check in `make verify` over this spec's binding table against `catalogue.md`'s rows and the closed `Binds` set (the same check `catalogue.md` AC8 names from its side, on its AC6 row parser); `deployment.md`'s docs build generating the operator page; the per-format policy case's validator refusing a `pending` row for its format (`conformance-harness.md` AC26) |
| AC21 | integration | `internal/policy/feed_sources_test.go` (two stand-in sources; one `id` in both stored as two records, the stricter winning a threshold rule and the condemnation carrying both sources; two ids sharing an alias kept apart; per-source staleness including an ecosystem both list failing closed when either is stale and an `ecosystems`-restricted source leaving the rest untouched; unreadable list; non-OSV schema refused) |
| AC22 | integration | `internal/storage/retention_test.go` (records readable at and after tombstone; rules dropped; recreated name clean; shared with `repository-lifecycle.md` AC24) |
| AC23 | script + integration | `scripts/check-config-keys.js` under `make verify` (`deployment.md` AC5's fixtures); `internal/policy/feed_sync_test.go` (network-level: source roots only, no off-root redirect, no credential; the per-source exclusivity key, two sources running concurrently and one source single-flight across two processes, shared with `async-operations.md` AC14's `internal/async/scheduler_test.go`) |
| AC24 | integration | `internal/policy/advisory_key_test.go` (the six key shapes at resolution and at a request-free sync, package-level and version-level keys, the fetch-and-cache key before any upstream request asserted at the network layer, replacement by a later write in the `rebind` and the late-report shapes, the no-key default); `internal/model/advisory_key_test.go` (the key outside every metadata document; shared with `data-model.md` AC46) |
| AC25 | integration | `internal/policy/hosted_match_test.go` (a colliding private name refused, then served once exempted, a vulnerable catalogued component still refusing it and still answered by the reader, the reader's coordinate answer empty on the exempting repository only, the same version through a virtual member refused and served as the member alone, `policy.rule.update` through `telemetry.NewTestRecorder`); `internal/manage/repository_test.go` (`validation` on `PATCH` for an exemption on a remote and a virtual, nothing stored) |

## Implementation Phases

### Phase 1: Scanning
OSV-schema source sync (the default feed, named `osv`, and `policy.feed.sources`) as
`policy.feed_sync` schedules, local bulk import with its declared export time behind
`management-api.md` AC34's route with its `policy.feed.import` audit event, per-source freshness
tracking (last completed sync or declared export time) against the staleness threshold with the
two per-source gauges, the
per-ecosystem mapping and ordering table with the vendored orderings it lists, the
`advisory_ecosystem` repository setting, the advisory key stored on `Package` and `Version` and
carried on the fetch-and-cache request, the coordinate index, the byte-level cataloguer (library selected here against the coverage table,
`pkg:conda/` included) and the component inventory index, `policy.scan` jobs from the ingest and
cache-commit hooks, and re-matching stored coordinates and inventories whenever an advisory
changes. The `policy.` keys land in the configuration schema here.

### Phase 2: Policy evaluation
Per-repository rules administered through the management API with configuration-time rejection
of rules that cannot bind, the policy-enforcing `Deps` implementations and the typed refusal, the
refusal writer and its status line, the advisory reader in `Deps` keyed by repository,
`coordinate_exemptions` on `local` repositories, refusal recording and the
refusals read route, the metrics, alerts and audit events, fail-closed on stale advisory data,
the verdict-source consumer interface with chain and revocation, and the feed as the
security-signal rule's second channel on the proxy layer's condemnation record.

### Phase 3: The proxied path
Enforcement on cache misses and refusal before any upstream fetch, the scan-window setting on the
proxy's waiter path, `streamed` rule rejection, the offline-mode feed behaviour, the
`policies` and `advisories` provisioners on the harness's seed path, the binding-table structure
check and the generated operator page, and conformance cases on both paths, each filling its
format's `pending` row from captured traffic.

## Tasks

Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None remain open. Q1 to Q6 were adopted on 2026-09-26 under the owner's standing delegation, and
folding them raised Q7 and Q8, adopted the same way. The 2026-09-28 reconciliation with the
foundation authoring wave raised Q9 (advisory sources, revising Q1's single-feed answer on the
evidence of nine uncovered ecosystems) and Q10 (the refusal status line), both adopted the same
way. The closing sweep of the same reconciliation pass raised Q11 (where the matcher learns an
advisory key that differs from the package name) and Q12 (hosted repositories and public names),
adopted the same way on Opus. The Fable recheck of 2026-09-30 re-examined Q9 to Q12 (each
confirmed, each amended in its fold or its stated cost, recorded on its section) and raised Q13
(how a source's freshness is measured, revising Q7's measure), adopted the same way; all thirteen
are folded into Scope, Design, the acceptance criteria and the Test Plan above. Q5
was adopted in a form other than its written recommendation, because that recommendation would
have reversed a decision the owner made; the reason is recorded in its section. Every adopted
answer is reversible by the owner.

### Resolved: the advisory feed and its staleness (was Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: OSV is the single feed,
and policy that depends on advisory data fails closed when that data is stale beyond an
instance-level threshold (default 24 hours). Folded into Scope, "The advisory feed and its
freshness", AC9 and AC16. **Revised 2026-09-28 by the resolved advisory-sources decision (was
Q9)**: the single feed became the single schema, with operator-declared OSV-schema sources
allowed; the fail-closed half stands unchanged and now applies per source.

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
`docs/internal/plans/foundation/artifact-verification.md` (authored 2026-09-27, after this
adoption), owns signature and attestation verification, and this spec consumes its verdict
through a verdict-source interface it defines. Folded into Context, Scope, "Signature and
attestation state is a consumed verdict", Phase 2 and AC15.

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
"The advisory feed and its freshness", Phase 3 and AC16. **Revised 2026-09-30 by the resolved
freshness-measure decision (was Q13)**: the measure became the export time the import declares,
floored by the newest record's `modified`, because the newest record alone reads every quiet
ecosystem as stale; the threshold and the no-offline-exemption rule stand unchanged.

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

### Resolved: advisory sources beyond the OSV feed (was Q9, raised by the format authoring wave)

**Adopted 2026-09-28 under the owner's standing delegation.** Option B: the unit Q1 fixed is the
OSV **schema**, not the OSV **host**. The default feed stays OSV's bulk export, and an operator
may declare additional sources in the same schema (`policy.feed.sources`), each covering the
ecosystems its own `ecosystems.txt` lists; sources are a union keyed by advisory id, never a
merge; freshness and fail-closed apply per source. Data in any other schema is not consumed.
Folded into Scope, "The advisory feed and its freshness", "What the feed covers, per ecosystem",
Configuration, AC11, AC21 and AC23. Q1's record carries the revision note. This revises an answer
adopted under the delegation, not an owner decision.

Rechecked on Fable 2026-09-30: confirmed. The revision is within the delegation's bounds (Q1 was
itself adopted under it on 2026-09-26, and the owner's one decision in this area, the purge on a
security signal, is untouched) and right on the merits: the thing Q1 bought is the schema, and a
second host in the same schema costs none of it. Amended in its fold: the record identity was
stated two ways (one record with two sources in the feed section and AC21, two records in this
record's cost), now settled as one record per source per `id` with `aliases` never used as
identity, since identity by alias is the merge rule Q1 refused; and an ecosystem two sources list
now fails closed when either is stale, a cost this record had not priced and that a source's
`ecosystems` restriction exists to bound. AC21 rewritten accordingly.

Accepted cost: a second source is a second thing that can go stale, and an ecosystem covered by
two sources whose records disagree on severity gets two records, each evaluated on its own
fields, so a threshold rule fires on the stricter. Option A lost because it leaves Homebrew
uncovered while a 13,023-record OSV-format database of exactly its ecosystem exists, and because
the argument for one feed (no merge semantics, one severity scale) is an argument about schema
that a second host in the same schema does not weaken. Option C lost for the reason Q1 gave: a
schema translation layer for CPANSA and the Arch tracker is merge semantics under another name,
and it would put this project in the business of maintaining advisory conversions, which is the
"being a vulnerability database" Scope rules out; the right place for those conversions is
upstream, and the moment one exists it is option B's case.

The format authoring wave found nine ecosystems with no usable OSV data (conda, Terraform,
Conan, Vagrant, Chef, LuaRocks, CPAN, Puppet, Arch) and one more listed with no records
(Homebrew), against three advisory databases that exist outside OSV: CPANSA (2,117 advisories,
own schema), the Arch security tracker (2,444 records, own schema) and Homebrew's database
(13,023 records, OSV schema). Q1 chose one feed to avoid merge semantics and two severity
scales. The question is whether that reasoning also forbids a second host of the same schema.

**Recommendation:** B - one schema, several sources - because it keeps everything Q1 bought
(one record shape, one severity vocabulary, one matcher) while removing the one cost Q1 did not
price, an ecosystem whose advisories exist in the right schema and cannot be used.

| Option | You get | It costs |
|---|---|---|
| **A. OSV's feed alone, as adopted** | One host, one staleness clock, nothing to configure | Homebrew stays uncovered with its OSV-format database in plain sight, and any future OSV-schema database (an operator's private advisories, a vendor's) is unusable |
| **B. One schema, several sources: the OSV feed plus operator-declared OSV-schema bulk exports** | Homebrew covered by configuration; private and vendor OSV-schema sources usable; the matcher, record shape and severity vocabulary unchanged; union by advisory id needs no merge rule | A staleness clock per source; two sources disagreeing on one advisory yield two records and the stricter wins a threshold rule |
| **C. Several schemas, translated into OSV on import** | CPANSA and the Arch tracker covered today | A conversion per schema maintained here, which is merge semantics under another name and makes this project a vulnerability database, the thing Scope excludes; conversions belong upstream |

**Why this is yours:** it decides whether the registry's advisory posture is "what OSV knows" or
"what the operator can prove in OSV's shape", which is a product boundary, not a technical one.

### Resolved: the refusal status line (was Q10, raised by the format authoring wave)

**Adopted 2026-09-28 under the owner's standing delegation.** Option B: on HTTP/1.1 the shared
refusal writer in `internal/format` hijacks the connection and writes a status line whose phrase
names the condition, `Refused by policy: {condition}`, then the handler's headers and body; on
HTTP/2 or where the writer cannot hijack it writes the canonical phrase, with the condition in
the body. The writer is the only hand-written status line in the module, held by an architecture
test. Folded into Scope, "Rendering a refusal: the status line, the phrase and the body" and
AC18, with the transport half cited from `deployment.md`'s resolved HTTP-version decision.

Accepted cost: a hijacked write bypasses `net/http`'s response machinery, so the writer owns
keep-alive handling, header serialisation and the content-length or chunked framing for that
one response, and every future middleware that wraps the `ResponseWriter` must preserve
`Hijacker` or lose the phrase (the architecture test catches the first, the fallback makes the
second a degradation rather than a failure). Option A lost because it leaves Maven, Gradle, apt,
R, Chef, CPAN, Hex and conda users with `403 Forbidden` and no way to learn which advisory
refused them, which is the diagnosability AC5's record exists to provide and the exact reason
`deployment.md` turned HTTP/2 off; option C lost because a status code cannot carry an advisory
id and the registered codes that come closest (`451`) mean something else to several clients
(Cargo treats `451` as a security signal, `cargo.md`).

Rechecked on Fable 2026-09-30: confirmed, the options fairly framed and B the right one. Amended
in its stated cost, which stopped at framing and keep-alive: a hijacked write also bypasses the
response middleware, so unless the writer emits the headers the middleware already set (the
`X-Request-Id` echo `observability.md` AC14 promises on every response), reports its status and
size to the request metrics and log, and drains or closes on an unread body, every policy
refusal disappears from `http_server_request_duration_seconds`, from `HighErrorRate` and from the
request log, on the one response class an operator most needs to find. The phrase's condition set
also omitted the verdict failure AC5 records; it is now AC5's set. AC18 and its Test Plan row
extended; `observability.md`'s middleware wrapper must implement `http.Hijacker` and accept the
reported status, a consequence reported to it and since met: the report travels through
`HijackReporter`, declared by `format-handler-interface.md` beside the writer, and
`observability.md`'s wrapper implements it beside `Hijacker` and `Unwrap`.

The format authoring wave confirmed for Maven, Gradle, apt, R, renv, Chef, the CPAN clients,
`mix`, `rebar3` and conda's four clients that the user sees only the status line of a refusal,
and `deployment.md` recorded that Go's `net/http` writes only the canonical phrase. The question
is whether the shared refusal path takes the connection to write its own.

**Recommendation:** B - hijack on HTTP/1.1, canonical fallback elsewhere - because the phrase is
the only channel to those users and HTTP/1.1 is now the default transport precisely so that
channel exists.

| Option | You get | It costs |
|---|---|---|
| **A. Canonical phrases only; the body carries the condition** | No hijacking, no hand-written protocol | The clients the whole transport decision was made for still see `403 Forbidden` and nothing else |
| **B. Hijack on HTTP/1.1 and write `Refused by policy: {condition}`; canonical fallback on HTTP/2 or without a `Hijacker`** | The condition reaches every client that prints the status line; degrades to A, never fails | One hand-written status line, owned by one function under an architecture test; middleware must preserve `Hijacker` |
| **C. Encode the condition in the status code** | Nothing hand-written | No code carries an advisory id, and the nearest registered code (`451`) is a security signal to Cargo |

**Why this is yours:** it accepts a deliberate step outside the standard library's response
path in the security-facing part of the codebase, for a user-facing gain; pricing that is a
posture call.

### Resolved: where the matcher learns an advisory key that is not the package name (was Q11, raised by the closing sweep)

**Adopted 2026-09-28 under the owner's standing delegation.** Option A: the handler reports the
advisory key (one or more names and at most one version) when it records the package or version,
the core stores it as core-parsed data on `Package` or `Version`, and a proxied miss also carries
it on the fetch-and-cache request. Folded into Scope, "What the feed covers, per ecosystem" (the
coverage rows for Julia, Swift, Debian and Alpine, and "Where an advisory names something other
than the package"), the reader section, Phase 1 and AC24.

Accepted cost: two core-parsed fields beyond the version string, one on `Package` and one on
`Version`, which `data-model.md` must add, and a key on a metadata-store write and on the
fetch-and-cache request, which `format-handler-interface.md` records as a re-open input with no
method change; a handler reporting the wrong key mis-matches without any error, bounded by AC17's
per-row cases and each format's policy case. Option B lost because a key supplied only with a
request leaves the feed sync blind: retroactive re-matching (AC7) and the request-free
condemnation of cached content (AC14) run with no request in flight, so an advisory against
`openssl` would never condemn a cached `libssl3` until someone asked for it. Option C lost because
the cataloguer reads bytes, so it cannot key the refusal before any upstream fetch (AC8), it has no
reliable source for a Julia UUID or a Swift binding, and it would move the coordinate tier's
correctness onto the inventory tier's vendored library.

Rechecked on Fable 2026-09-30: confirmed; A is the only option under which the request-free sync
sees the key, and the cost is priced honestly. Amended in its fold, which was incomplete in three
ways: two rows were missing (a RubyGems platform gem's version string carries its platform, which
RubyGems' own ordering reads as a pre-release of the bare number, so it needs the bare number as a
version-level key or every platform gem mis-matches silently; Arch reports `%BASE%` ahead of any
coverage, per `arch.md` AC24); the replacement rule was stated only for Swift's `rebind`, where
it is general (any later write recording the same row replaces the key), and without it a proxied
version first recorded before the document naming its key was read would keep the wrong key for
ever; and `julia.md` never received the fold at all, still supplying the UUID "when it calls the
shared resolution", reported. The coverage table's Swift row now carries the proxied key the
format closing sweep queued (the upstream list's `canonical` and `alternate` links). AC24 extended
with the two rows and the replacement rule; `data-model.md` AC46 cited as the storage half.

The coverage table keys four rows on something other than `Package.name` and the version string:
Alpine's origin, Debian's source package and source version, Julia's UUID and Swift's bound
repository URLs. `alpine.md` and `debian.md` report the value from the handler, `julia.md` and
`swift.md` say the handler supplies it "when it calls the shared resolution", and this spec's
matcher never parses a version's opaque metadata document. Nothing said where the core learns the
key, and a key present only at request time cannot serve the matching that happens without a
request.

**Recommendation:** A - the handler reports, the core stores, because it is the only option under
which all three matching moments (resolution, the pre-fetch check on a miss, and the request-free
feed sync) see the same key, and it keeps the core out of every version document.

| Option | You get | It costs |
|---|---|---|
| **A. Handler-reported, core-stored key on `Package` or `Version`, also on the fetch-and-cache request** | One key seen by resolution, the pre-fetch check and the feed sync; no document parsing by the core | Two core-parsed fields in `data-model.md` and a key on two `Deps` calls; a wrong report mis-matches silently |
| **B. Supplied with each request to the enforcing calls, as `swift.md` and `julia.md` assumed** | No stored field | Retroactive and request-free matching (AC7, AC14) cannot see the key, so a new advisory condemns nothing until a client asks |
| **C. Derived by the cataloguer from the bytes (an `upstream` PURL qualifier)** | No handler cooperation for stored content | Nothing before the fetch (AC8), no UUID or URL binding, and coordinate correctness depending on the inventory library |

**Why this is yours:** it decides whether the core's model of a package grows fields that exist
only for advisory matching, which is a shape the data model will carry for every format.

### Resolved: hosted repositories and public names (was Q12, raised by the closing sweep)

**Adopted 2026-09-28 under the owner's standing delegation.** Option B: a `local` repository with
an advisory-dependent rule matches public advisories by coordinate exactly as a remote does, so a
private package sharing a public name inherits the public package's advisories, and the operator
may exempt names through the `policy` document's `coordinate_exemptions`, accepted on `local`
repositories only; the advisory reader is keyed by the repository and applies the same
exemptions. Folded into Scope, "Hosted repositories match public coordinates", the reader
section, Phase 2, AC19 and AC25.

Accepted cost: an operator whose private names collide with public ones sees refusals until the
names are exempted, and an exemption is a hole the operator owns, visible in the policy document
and in the audit trail; the reader now takes a repository rather than an ecosystem string, a
wording change for `format-handler-interface.md` and the formats that describe it. Option A lost
because with no exemption the only remedies are renaming a private package or removing the
advisory rule from the whole repository, and a rule operators must turn off to live with is an
unenforced rule. Option C lost because it fails open for the common case, public packages
republished into a hosted repository and names that collide on purpose, which is exactly the
dependency-confusion shape the policy exists to catch; over-refusal is the safe error, as
`openvsx.md` also chose for its variants.

Rechecked on Fable 2026-09-30: confirmed; B is right and its cost is honest. Amended in its fold,
which contradicted its own promise in one place: the reader "answering empty" for an exempted name
would hide an inventory-tier condemnation the rules still enforce (the exemption removes the name's
own coordinate from matching, not its catalogued components), which is exactly the
rules-versus-rendering disagreement the reader exists to prevent, so the reader now answers no
coordinate-matched record while still returning standing condemnations. Two gaps closed beside
it: a resolution through a `virtual`, which holds no versions and may carry no exemption, is
evaluated on the resolving member's version under that member's `advisory_ecosystem` and
exemptions, rules and reader alike, with an advisory rule on an OS-package virtual bindable only
while every member declares an ecosystem; and an exemption's `name` is the coordinate as the
matcher keys it for the format. AC19 and AC25 extended.

`composer.md`'s resolved hosted-channel decision (was Q11 there) found that coordinate matching
treats a private `acme/lib` on a hosted repository and Packagist's `acme/lib` as one coordinate,
so the private package inherits the public one's advisories, and it declined to render
Composer's advisory channel on hosted repositories partly for that reason, reporting that this
spec's own hosted matching has the same property. This spec had not said whether that is
intended, for its rules or for its reader, which Open VSX's hosted control document and every
future hosted rendering consume.

**Recommendation:** B - match by coordinate on hosted repositories, with operator exemptions,
because the collision is itself the risk the matcher should surface, and an exemption is the
narrowest way for an operator to say "this name is ours" without disabling the rule.

| Option | You get | It costs |
|---|---|---|
| **A. Match hosted repositories by coordinate, no exemption** | Nothing new to build; collisions always surface | A false positive can be cleared only by renaming or by dropping the rule for the whole repository |
| **B. Match by coordinate, with `coordinate_exemptions` on `local` repositories, applied by rules and reader alike** | Collisions surface by default; the operator clears a known-private name narrowly; rendered advisories agree with enforcement | An exemption list to validate and audit; the reader keyed by repository |
| **C. No coordinate matching on hosted repositories unless the operator opts in** | No false positive on private names | Fails open for republished public packages and deliberate name collisions, the dependency-confusion shape |

**Why this is yours:** it decides what the registry assumes about a name nobody has told it about,
public by default or private by default, which is a security posture rather than a technical
choice.

### Resolved: how a source's freshness is measured (was Q13, raised and adopted on the Fable recheck)

**Adopted 2026-09-30 under the owner's standing delegation.** Option A: a synced source is fresh
as of the completion of its last successful sync, one that read the root's `ecosystems.txt` and
fetched or conditionally confirmed every consumed export; an imported source is fresh as of the
export time the import declares, and an import declaring none, or a time earlier than the newest
`modified` among its records, is refused with nothing imported. This revises the measure the
offline-freshness decision (was Q7) chose, a delegation adoption, and keeps its threshold and its
no-offline-exemption rule; it reverses no owner decision. Folded into Scope, "The advisory feed
and its freshness", AC9, AC16 and Phase 1; Q7's record carries the revision note.

Accepted cost: a declared export time is the operator's assertion, checked only against the
records' own dates, so an old export declared new is a lie the registry cannot detect, which the
audit line records and which is no more power than removing the rule; and the time must travel
across the air gap beside the archive, because the archive carries none. Option B lost because it
fails closed on every quiet ecosystem on both paths: a synced private source with no change in a
day is stale for ever, and an air-gapped instance importing exactly what the upstream publishes is
stale within a day of the import, so the deployment Q7 meant to keep honest is the one it makes
unusable. Option C lost for the reason Q7 gave: an undeclared import time makes an old export
carried in look fresh.

Q7 measured freshness from the newest `modified` among a source's records so that re-importing an
old export could not launder staleness. Checked against the feed on 2026-09-29: OSV's
`Hackage/all.zip` holds 33 records whose entry timestamps are zeroed to 1980 with no manifest, so
an export carries no production time of its own, and `HSEC-2023-0001` was last modified
2025-11-14; a source is stale under Q7 whenever nothing in it changed for a threshold, whether or
not it was just synced or imported, which for a quiet ecosystem is the normal state.

**Recommendation:** A, because the evidence that advisory data is current is that the live root
was read, or that the operator says when the export was produced; the records' own dates are
evidence of change, not of currency.

| Option | You get | It costs |
|---|---|---|
| **A. Last completed sync for a synced source; a declared export time, floored by the newest record, for an import** | Quiet ecosystems stay fresh; an accidental re-import of an old export is refused; the sync's evidence is the live root itself | An operator can declare a false time deliberately; the time must be carried beside the archive |
| **B. Newest record `modified`, as Q7 adopted** | Nothing to declare; laundering impossible | Every quiet ecosystem fails closed within a threshold of its last advisory, and an air gap cannot be kept fresh by importing what the upstream publishes |
| **C. Time of the sync or the import, undeclared** | Simplest | An old export carried in reads fresh, the laundering Q7 refused |

**Why this is yours:** it decides what counts as evidence that advisory data is current on an air
gap, the operator's word against the records' dates, which is a posture call about who the
registry trusts when it cannot check.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | 4d1aeb1 | folding adopted recommendations under the standing delegation | Not a review. Adopted Q1 (A: OSV, fail closed on stale data), Q2 (A: retroactive), Q3 (C: byte-level cataloguer in `internal/policy`, coordinate matching always on), Q4 (B: policy-enforcing `Deps` implementations returning a typed refusal) and Q6 (A: sibling `artifact-verification.md`, to be authored in the spec loop, with the verdict-source interface defined here). Q5 adopted as a new option D rather than its written recommendation B, recorded as such in its section: B would have narrowed `proxy-cache.md`'s owner-settled purge to refuse-and-retain, which the delegation may not reverse, so a security signal purges through either channel and every other condemnation is refused and retained; the security-signal rule is stated verbatim in both specs and adds no GC mark root, so `storage-and-gc.md` is untouched. Folding raised and adopted Q7 (no offline exemption from the staleness threshold; local OSV bulk import, freshness from the newest imported record) and Q8 (a rule that cannot bind is refused at configuration: `streamed` remotes, uncovered formats and ecosystems, signature rules before a verdict source). Body changes: Context gained the proxy-layer and verification dependencies; Scope and Out of scope rewritten; Design gained the advisory-feed section and the security-signal rule, and its evaluation-hook, inventory, GC and signature sections were rewritten from open tension to adopted design, including what each `Deps` call refuses. AC3, AC4, AC5, AC6 and AC7 rewritten; AC9-AC16 added with Test Plan rows; phases rewritten. |
| 2026-09-28 | 33679fb | cross-spec reconciliation of the foundation authoring wave. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` naming this file verified against the current text of its source before applying. Charter item 9 and harness item 6 found already applied at fe54272. From the authoring sections: `artifact-verification.md` exists (the "to be authored" wording dropped in Context, Scope, Design and the Q6 record) and its verdict carries a chain, a revocation field and the superseded-revision-reads-absent rule, folded into the verdict section and AC15; `async-operations.md`'s `policy.scan` job (coalesce key `scan:{digest}`, kind-declared retry bound feeding AC6's alert) and `policy.feed_sync` schedule disabled under `proxy.offline`, folded into Design, AC6 and AC16; `repository-lifecycle.md`'s rule at tombstone (rules dropped, condemnation and refusal records never), folded with new AC22; `observability.md`'s metrics, alerts and audit events into AC5 and AC6 and their Test Plan rows; `deployment.md`'s two facts (the `policy.` key table, now five keys in the checked shape with AC23; Go's canonical-only reason phrase and HTTP/1.1 on the main listener) into a new Configuration section and a new rendering section; `web-ui.md`'s and `management-api.md`'s refusals route into AC5, and rule administration as the `policy` field of the repository `PATCH` refused `validation` (AC11); `upstream-adapters.md` AC6 and AC8 cited as the transport half of the ownership-of-URLs rule. From the Open items: 5 (rendering checked per format against captured traffic when its policy case is written), 9, 12, 13 and 31 (the advisory reader in `Deps`, a new Design section and AC19), 11, 12, 14, 15, 17 (reason-phrase and coverage findings), 14 (conda: no OSV ecosystem, cataloguer must emit `pkg:conda/`), 16 (Julia: restricted egress, match by UUID), 18 to 30 and 32 (per-ecosystem coverage, coordinate mapping, ordering, `advisory_ecosystem` for OS-package repositories, per-format binding conditions). Themes 2 and 5 designed once here: "When a refusal binds, per format" with a closed `Binds` set and `pending` rows (AC20) and "What the feed covers, per ecosystem" (AC17). Two questions adopted under the delegation: Q9 (one schema, several OSV-schema sources; revises Q1's delegation-adopted single feed, reverses no owner decision; AC21) and Q10 (hijacked HTTP/1.1 status line `Refused by policy: {condition}` with canonical fallback; AC18). Seven criteria added (AC17 to AC23), four amended (AC5, AC6, AC11, AC15), each with a Test Plan row; phases updated. `node scripts/check-spec.js` run against this file with zero failures. |
| 2026-09-26 | fe54272 | cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. From the charter fold: Context's ordering paragraph now states the build at step 4b, after artifact verification and the step 4a re-open and before npm, per the charter's build order and AC12. From the harness and generic fold: the Context claim that `conformance-harness.md` provisions only repositories, tokens and upstreams and needs a matching extension was stale, since its closed vocabulary already defines `policies` and `advisories` as landing with this spec; rewritten, Phase 3 now builds both provisioners on the seed path, and AC2 asserts its case is provisioned through them. Found already consistent: the refusal type declared beside `Deps` in `internal/format` (now also stated in `format-handler-interface.md`), and no GC mark root added (now also placed in `data-model.md`'s non-root table). |
| 2026-09-23 | d078c46 | first review: adversarial + constitution + cross-spec (proxy-cache's settled stream-and-verify, single-flight, serve-stale and security-purge decisions; data-model's opaque metadata typing; format-handler-interface's pinned five methods and `Scope(r)` precedent; storage-and-gc's four mark roots and eviction; auth's client-not-artifact boundary) + go-spec-reviewer; claim verification vacuous pre-code (no `internal/policy/` exists). The reviewer terminated on a spend limit before writing this row; it is recorded here from the diff | Three of `proxy-cache.md`'s settled decisions were shown to collide with cache-then-scan and the collisions stated rather than left for implementation: refuse-until-scanned is incompatible with streaming to the initiating client, the scan lands inside the coalescing latency bound every waiter shares, and serve-stale needs the advisory feed as its independent signal. Evaluation order on a miss derived (coordinate-decidable rules refuse before any upstream request, giving AC8: condemned content is neither fetched nor cached). The auth precedent this spec invokes was shown to be unearned - central evaluation needs a request-to-coordinate mapping no pinned method provides - raising Q4. Component inventory named as the central tension (Q3): the flagship first format is the one coordinate matching cannot see into. Two settled specs shown to disagree on one real event (purge versus refuse-and-retain), raising Q5. Signature state confirmed to have no producer in any spec, raising Q6 and explaining the deliberately absent AC. Policy records placed against the GC root set as explicitly not a root, so a refusal outlives the blob it condemned (AC5, AC7) and eviction cannot launder a condemned artifact. Scan failure separated from scan result (AC6). AC1/AC3/AC7 extended across both paths. Stays draft on Q1-Q6. |
| 2026-09-26 | 2edd42c | folding owner answers to storage-and-gc Q10 and proxy-cache Q11 | Not a review, and only a consequential update: neither decision is this spec's. The GC-and-eviction section now says five enumerated roots (pointer-targeted snapshots became the fifth on 2026-09-26) and states eviction correctly under proxy-cache's answer - it drops the cached reference and the sweep reclaims the bytes, eviction itself deleting nothing - which leaves the digest-independence argument behind AC7 intact and if anything longer-lived. Q5 is left open and unanswered; only its option C wording was corrected, since the mark root quarantine would add is now a sixth rather than a fifth. This spec's position that policy records are not a root is unchanged. |
| 2026-09-28 | 6e6d503 | cross-spec reconciliation sweep of the foundation wave. Not a review | Not a review. Applied sweep 1 item 3 and charter reconciliation 6, verified against the sources' current text: the advisory reader and refusal writer are cited to `format-handler-interface.md` ("The pinned method set", AC14) with `internal/format/refusal_writer_test.go` and `internal/policy/advisory_reader_test.go` recorded as shared in AC18's and AC19's rows; the `advisory_ecosystem` paragraph cites `data-model.md` AC28; AC20's row names `catalogue.md` AC8 as the same structure check from the catalogue's side and `conformance-harness.md` AC26 as the validator rule's home. No question raised or adopted; `node scripts/check-spec.js` zero failures on this file. Stays draft pending a gate review. |
| 2026-09-28 | f4a9246 | closing reconciliation sweep on Opus: cross-spec reconciliation of the format batches and closing sweeps. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` targeting this file verified against the current text of its source spec and of this file. Found already done: sweep 1 item 3 and charter reconciliation 6 (at 6e6d503). Applied: format batch 2 item 3 (Ansible collections uncovered, keyed on `{namespace}.{name}` under semver if a source declares it; the NuGet, Maven, Go and Ansible binding rows stay `pending`, each naming the case that fills it); batch 3 item 9 (Helm uncovered, OSV `ecosystems.txt` of 2026-09-28 lists none); batch 4 item 9 (the advisory key, adopted as Q11); batch 6 item 8 (Hackage's component-wise integer ordering vendored; `version.pm` named as owed if a CPAN source is ever declared, the CPAN row needing both; Open VSX matched across every `VSCode` variant, AC17); batch 8 item 8 (R's `numeric_version` vendored); batch 7 item 9 (the Composer row from `composer.md`'s captures: omission from the package file, 2.10.3 holding on a dist `403`, 2.2.30 cloning `source` so holding only under restricted egress, the second-repository question still open, so `pending` under `conformance-harness.md` AC26; Composer placed in the rendering paragraph with the clients whose status line is printed verbatim, since it prints the raw status line and the phrase therefore reaches its user, rather than beside SwiftPM and pacman as the item worded it); batch 7 item 10 (hosted matching, adopted as Q12); batch 7 item 11 (Homebrew's `PkgVersion` with `_revision` vendored, so the database Q9 was adopted for binds). Every coverage and binding row re-read against its format spec: Go, NuGet, Cargo and Pub split out of the grouped pending row with their captured rendering; Hex, CRAN (pak's `cran.r-project.org` fallback), Conda, Swift, Vagrant, Puppet, opam, Julia (hosted packages fail with no egress), Homebrew (recipe, tap bottles, `HOMEBREW_BOTTLE_DOMAIN` under restricted egress), Arch (`SigLevel = Required DatabaseRequired`) and LuaRocks (`--only-server`) rows corrected; the union warning now names Alpine, LuaRocks and Chef, each closed by its single-source recipe. Gap found and fixed beyond the queue: NuGet, Packagist and RubyGems rows claimed covered with no vendored ordering, now in the set. The rendering paragraph re-sorted into status-line clients, code-only clients (dnf, zypper, brew, Vagrant, opam, cabal, renv) and body-showing counter-examples (SwiftPM, Conan, Policyfile, `go`, Puppet, pacman). Two questions raised and adopted on Opus under the standing delegation, in template shape: Q11 (A: the handler reports an advisory key, stored core-parsed on `Package` or `Version` and carried on the fetch-and-cache request, because a request-time key leaves the request-free feed sync blind; AC24) and Q12 (B: `local` repositories match public coordinates, `coordinate_exemptions` on `local` only, the advisory reader keyed by repository and applying them; AC25, AC19 amended). Two criteria added, two amended, each with a Test Plan row; phases updated; `fable_recheck` added. `node scripts/check-spec.js`: zero failures and no advisory on this file. Stays draft pending a gate review. |
| 2026-09-30 | f2b770b | Fable recheck: full review (claim verification at HEAD against every cited sibling and format spec, adversarial lens, constitution compliance, go-spec-reviewer inline) + re-examination of the Opus adoptions Q9 to Q12 + the queued consequences | The tree still holds only `cmd/stackweaver-registry/main.go`, so claim verification ran against the sibling specs and the live OSV feed. Queued items applied first: rubygems item 5 (RubyGems split out of the grouped pending binding row with its captured rendering and the byte-route binding of its was-Q12; its coverage row grounded on the bare version number under RubyGems' ordering), format closing sweep batch 1 item 3 (the Swift proxied key from the upstream list's `canonical` and `alternate` links), proxy-cache recheck item 4 (`FirstByteWithin` not honoured under refuse-until-scanned, in the proxied-path section and AC6 with `internal/policy/refuse_until_scanned_test.go` shared with proxy-cache AC21), second-pass item 3 (`data-model.md` AC46 cited in Design and AC24's row); the `check-config-keys.js` wording corrected, since the script is not in the tree. Verdicts: Q9 confirmed and amended (a revision of delegation-adopted Q1, within bounds, the owner's purge decision untouched; record identity had been stated two ways and is now one record per source per id with aliases never identity; an ecosystem two sources list fails closed when either is stale; AC21 rewritten). Q10 confirmed and amended in its cost (a hijacked write bypasses the response middleware, so the writer emits the pre-set headers including the `X-Request-Id` echo, reports its status to `http_server_request_duration_seconds` and the request log, and drains or closes on an unread body; the condition set is AC5's, adding the verdict failure; `body` is a `[]byte`; AC18 extended). Q11 confirmed and amended in its fold (two key rows missing: a RubyGems platform gem's version string, which RubyGems' ordering reads as a pre-release, and Arch's `%BASE%` reported ahead of coverage; the replacement rule generalised from Swift's `rebind` to any later write, with the late-report cost stated; `julia.md` still supplies the UUID at resolution, reported; AC24 extended). Q12 confirmed and amended (the reader "answering empty" for an exempted name would hide an inventory-tier condemnation the rules enforce, so it answers no coordinate-matched record and still the standing condemnations; a resolution through a virtual applies the resolving member's exemptions and ecosystem, an OS-package virtual's advisory rule bindable only while every member declares one; an exemption's `name` is the coordinate as keyed; AC19 and AC25 extended). Q5's option D checked against every later change: intact, the security-signal rule verbatim in both specs and no root added. Adversarial finding beyond the adoptions: Q7's freshness measure (the newest record's `modified`) reads every quiet ecosystem as stale on both paths and makes the air gap it protects unusable; OSV's `Hackage/all.zip` fetched 2026-09-29 carries no production time of its own (entries zeroed to 1980, no manifest). Raised as Q13 in decision shape and adopted under the delegation: last completed sync for a synced source, a declared export time floored by the newest record for an import; Q7's record carries the revision; AC9 and AC16 rewritten, Scope and Phase 1 updated; the import's surface reported to `management-api.md`. Constitution: both paths, the shared model, no handler table, the named enforcers and the conformance gate all hold; no rule contradicted. go-spec-reviewer inline: approved after the fixes. `node scripts/check-spec.js`: zero failures. Every criterion testable and mapped, Open Questions empty, `fable_recheck` cleared: draft to planned. |
| 2026-10-01 | 5303c57 | Fable follow-up: queued cross-spec items since the recheck | A review, narrower than the recheck: the whole of `agents/spec-loop/consequences.md` read, every item targeting this file after the f2b770b row collected and each verified against the source spec's text at HEAD. Applied: management-api recheck item 3 (the import is `POST /api/v1/system/advisories/import?exported_at=&source=`, its AC34, admin only, in the shape of replication's archive import, `source` defaulting to the default feed and an unconfigured name refused `validation`; `policy.feed.import` registered here with `source`, `exported_at` and `records`, zero on a refusal, no `Operation`; the feed section, AC16 and its row now shared with `internal/manage/advisory_import_test.go`; Phase 1) and observability recheck item 3 (the gauges are per source, `policy_advisory_feed_freshness_timestamp_seconds{source}` and `policy_advisory_feed_degraded{source}`, one `AdvisoryFeedDegraded` alert per source; the feed section, AC9, AC21 and the AC9 row). Found already applied at 5edf701: proxy-cache recheck item 4 (`FirstByteWithin` under refuse-until-scanned). Nothing declined. One judgment made and recorded in the feed section rather than as a question, since it is a naming fact the three consumers force: every source has a name, the `policy.feed.sources` entry's `name` or `osv` for the default feed, reserved and refused as a duplicate in `policy.feed.sources`, the value the `source` label, the `policy.feed_sync:{source}` schedule label and the import route share; AC21 asserts the refusal and the per-source series. Adversarial pass on the changed text: the Configuration table's `policy.feed.staleness_threshold` meaning still measured from the newest record, contradicting was-Q13 since the recheck, corrected; the refusal writer's "reports to the middleware it bypassed" now names `HijackReporter` (`format-handler-interface.md`, declared beside the writer, found on the `Unwrap` chain) and `observability.md`'s wrapper as its implementer, the was-Q10 consequence recorded as met, AC18 and its row extended (exactly one report, a reporterless chain still answered; `internal/telemetry/hijack_test.go` shared). No criterion contradicted, no sibling planned text contradicted (management-api AC34, observability's catalogue, audit row and alert table, deployment's air-gap recipe and async-operations' kind table all read the same facts). Consequences: management-api AC34's row cites a `feed_offline_test.go` this spec never named (its file is `feed_import_test.go`) and may name `osv`; observability, deployment and async-operations may name `osv` as the default feed's label, recipe and key value. `node scripts/check-spec.js`: zero failures. 25 criteria, each mapped; Open Questions empty: stays planned. |
| 2026-10-01 | 369f502 | Fable follow-up: queued cross-spec items since the recheck (round 2) | A review, narrower than the recheck: the whole of `agents/spec-loop/consequences.md` read, every item targeting this file after the 5303c57 row collected, every earlier item re-verified as applied (charter reconciliation 6, sweep 1 item 3, second-pass item 3, format closing sweep batch 1 item 3, rubygems item 5, proxy-cache recheck item 4), and each queued item checked against its source's text at HEAD. Applied: round-2 async-operations follow-up item 1 (the `policy.feed_sync` exclusivity key is `feed_sync:{source}`, the source's name, per `async-operations.md`'s kind table and scheduler section, where this spec said "the kind", which would have serialised every source and contradicted its own "the same source" clause; the feed section and AC23, its row sharing `internal/async/scheduler_test.go` with async AC14); the optional wording item (the `policy.feed.import` event's `source` is `osv` when the route's parameter is absent, as `observability.md`'s audit row and `management-api.md`'s endpoint row state; the feed section, AC16 and its row); and the management-api round-2 item the coordinator added (its resolved refusal-type decision, was Q18, and AC35: the import route is registry-wide, so a non-admin is refused `unauthorized` and a credential-less request `unauthenticated`, replacing "asserts the existence oracle" in AC16's row; the feed section and AC16 cite AC35). Found already applied at 5303c57: format-handler-interface follow-up item 1 (`HijackReporter` in the writer paragraph, AC18 and its row); its text at HEAD adds that the writer calls the first reporter once, after the connection is written, folded as a precision. Nothing declined. Adversarial pass on the changed text: a per-source key lets two sources sync at once, which a kind-wide key had excluded, so two sources carrying one malware advisory for one coordinate now meet the security-signal rule's second-channel clause concurrently; stated in the feed section (one condemnation under a serialisation on the coordinate, one purge, one alert) and AC13 extended with the case and its `security_signal_test.go` row, since "one purge, one alert" is a promise concurrency could otherwise break. No criterion contradicted; no sibling planned text contradicted (async-operations' kind table and AC14, observability's audit row, management-api's endpoint row, AC34 and AC35 read the same facts). No question raised or adopted. `node scripts/check-spec.js`: zero failures. 25 criteria, each mapped; Open Questions empty: stays planned. |
