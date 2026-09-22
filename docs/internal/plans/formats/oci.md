---
status: draft
status_description: "All open questions answered by the owner and folded in; awaiting a /spec review pass to earn planned."
description: "Spec for the OCI distribution format - the hardest protocol with the strongest oracle, implemented as the harness's proving ground rather than to replace Harbor."
author: michielvha
goal: "Pass the official OCI distribution-spec conformance suite with zero skips, proving the harness and the shared layers against a standards-body gate."
priority: "high"
issue: 7
created: 2026-09-21
covers:
  - "internal/format/oci/**"
---

# Plan: OCI distribution format

Container images, Helm charts as OCI, and arbitrary OCI artifacts, per the OCI distribution
specification.

## Context

OCI is implemented here for a specific reason, and it is not that the world needs another
container registry - Harbor is free, Apache 2.0, excellent, and two lines of Compose away.

It is implemented because **the OCI distribution spec ships an official conformance suite**.
That makes it the only format where the pass/fail gate is written by the standards body rather
than inferred from client behaviour. It is simultaneously the hardest protocol in the roadmap
and the one with the strongest oracle, which is exactly what a harness needs to be proven
against.

It also forces the shared layers to be right early: chunked and resumable uploads, content
addressing, and a separate token-based auth flow are all OCI requirements that later formats
benefit from having solved.

## Scope

**In scope:** the distribution spec's pull, push, content discovery and content management
surfaces; chunked and resumable blob upload; manifest lists; the referrers API; and the OCI
token authentication flow.

**Out of scope for v1:** replication between instances, vulnerability scanning, and signature
verification enforcement. Harbor does these well and integration beats reimplementation.

## Design notes

The auth model is the part most likely to be underestimated. OCI clients do not perform an OIDC
browser flow; they follow a `WWW-Authenticate` challenge to a token endpoint and receive a
scoped token carrying access claims. That is a distinct subsystem from the platform's user-facing
SSO and must be specced as one, not assumed to fall out of existing token handling.

## Acceptance Criteria

- [ ] AC1: The official `opencontainers/distribution-spec` conformance suite passes with zero
      skips across all four workflow categories.
- [ ] AC2: `docker push` and `docker pull` round-trip an image with a byte-identical digest, for
      at least two pinned Docker client versions.
- [ ] AC3: `helm push` and `helm pull` round-trip a chart as an OCI artifact.
- [ ] AC4: A chunked upload interrupted partway resumes and completes with a correct digest.
- [ ] AC5: The token auth flow issues correctly scoped tokens, and a token scoped to one
      repository cannot read another.
- [ ] AC6: The proxied path serves an image fetched from an upstream registry and serves it from
      cache on the second pull without contacting the upstream.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/oci/official_test.go` |
| AC2 | conformance | `conformance/oci/hosted_test.go` |
| AC3 | conformance | `conformance/oci/helm_test.go` |
| AC4 | conformance | `conformance/oci/chunked_test.go` |
| AC5 | integration | `internal/format/oci/token_test.go` |
| AC6 | conformance | `conformance/oci/proxied_test.go` |

## Open Questions

None. Every question this spec raised has been answered by the owner and folded into
Design and Scope above, with each decision's accepted cost recorded beside it.

Resolved decisions are kept rather than deleted, so the reasoning survives the next time
someone asks why it was done this way.

### Resolved: build approach (was Q1)

**Settled 2026-09-22: implement the distribution spec directly.** Embedding
`distribution/distribution` would pass the official conformance suite on day one and prove
nothing about our harness, which is the entire reason OCI is on the list at all. It would also
impose its storage model in place of our CAS and snapshot model.

Accepted cost: months of protocol work on a format Harbor already solves well. That cost is the
point - OCI is the hardest protocol with the strongest oracle, so it is where the harness earns
its credibility.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
