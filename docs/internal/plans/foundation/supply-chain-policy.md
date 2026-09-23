---
status: draft
status_description: "Drafted 2026-09-23 when supply-chain policy came into scope; not yet reviewed, and its open questions await the owner."
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

### The proxied path is the hard one

A hosted artifact is scanned once on publish. A proxied artifact arrives on demand, in the middle
of a client's request, and scanning it first would add scanner latency to every cache miss.

The interaction with the settled `on_demand` policy therefore needs stating: content is cached on
fetch and scanned after, with the same window rule as hosted content. A repository configured to
refuse-until-scanned turns a cache miss into a wait, which is a deliberate and costly choice
rather than a default.

### Policy is per repository, evaluated centrally

Policy attaches to a repository and is evaluated in the shared layer, never in a handler - the
same boundary rule auth follows, and for the same reason: a handler that forgets to evaluate
policy is an unenforced policy.

## Acceptance Criteria

- [ ] AC1: An artifact with a known vulnerability above the repository's threshold is refused at
      resolution, and the client receives an error naming policy rather than a generic failure.
- [ ] AC2: The same artifact arriving through the **proxied** path is refused identically, proven
      by a conformance case against a real client.
- [ ] AC3: An artifact whose licence violates repository policy is refused, and one that does not
      is served.
- [ ] AC4: Policy evaluation happens in the shared layer: an architecture test asserts no handler
      package evaluates policy.
- [ ] AC5: Every refusal is recorded with the artifact, the rule that refused it and the
      advisory or licence that triggered it, and is queryable afterwards.
- [ ] AC6: A repository configured to refuse-until-scanned refuses an unscanned artifact; one
      configured to serve-pending-scan serves it and refuses later once the scan lands.
- [ ] AC7: A new advisory affecting already-stored content causes that content to be refused on
      the next resolution without re-ingest.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | integration | `internal/policy/vulnerability_test.go` |
| AC2 | conformance | `conformance/oci/policy_test.go` |
| AC3 | integration | `internal/policy/licence_test.go` |
| AC4 | architecture test | `internal/policy/arch_test.go` |
| AC5 | integration | `internal/policy/audit_test.go` |
| AC6 | integration | `internal/policy/scan_window_test.go` |
| AC7 | integration | `internal/policy/advisory_update_test.go` |

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

AC7 asserts the retroactive behaviour, but the cost is that a newly published advisory can break
a build that worked an hour ago, with no change on the user's side.

**Recommendation:** retroactive, because a cache that keeps serving a package after it is known
malicious is the failure this feature exists to prevent.

**Why this is yours:** it trades build stability against the guarantee the feature is sold on,
and the same tension was decided one way for upstream removals (purge on security signal).

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
