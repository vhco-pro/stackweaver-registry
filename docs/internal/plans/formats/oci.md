---
status: draft
status_description: "Reviewed 2026-09-22 at afbb4e4: the pass expanded Design (suite pinning, zero-skips implications, the data-model mapping gap, the durability split) and raised Q2-Q6 for the owner; stays draft until they are answered."
description: "Spec for the OCI distribution format - the hardest protocol with the strongest oracle, implemented as the harness's proving ground rather than to replace Harbor."
author: michielvha
goal: "Pass the official OCI distribution-spec conformance suite with zero skips, proving the harness and the shared layers against a standards-body gate."
priority: "high"
issue: 7
created: 2026-09-21
covers:
  - "internal/format/oci/**"
  - "conformance/oci/**"
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

## Design

### Token auth is a separate subsystem

The auth model is the part most likely to be underestimated. OCI clients do not perform an OIDC
browser flow; they follow a `WWW-Authenticate` challenge to a token endpoint and receive a
scoped token carrying access claims. That is a distinct subsystem from the platform's
user-facing SSO and must be specced as one, not assumed to fall out of existing token handling.

The handler boundary rules make the split concrete: a handler never implements its own auth
check (`format-handler-interface.md`, and the standing rule in `CLAUDE.md`), so token issuance
and validation are a shared auth-layer service. The OCI handler owns rendering the
`WWW-Authenticate` challenge and the scope grammar (`repository:<name>:<actions>`), which are
wire format. What credential a non-interactive `docker login` presents against that endpoint,
and where it comes from, is Q3. The auth foundation it rests on is no longer a gap:
`foundation/auth.md` settles repository-plus-action scopes, the OCI token flow's signing and
expiry obligations, and the bounded revocation window an already-issued token carries.

### The official suite, pinned, and what zero skips actually buys

The four workflow categories in AC1 are those of the v1.1.x suite: Pull, Push, Content
Discovery and Content Management, enabled by `OCI_TEST_PULL`, `OCI_TEST_PUSH`,
`OCI_TEST_CONTENT_DISCOVERY` and `OCI_TEST_CONTENT_MANAGEMENT` (conformance README at tag
v1.1.1, read 2026-09-22). The suite on the repository's main branch has since been restructured
around different variables and categories, so the suite itself is **pinned to a tagged
release**, exactly as client containers are pinned by digest (`conformance-harness.md` AC4),
and a suite upgrade is a deliberate, separately reviewed change rather than an ambient one.

"Zero skips" is a stronger claim than "the suite is green": the suite auto-skips surfaces a
registry declares unsupported or leaves unconfigured, and it can hide disabled workflows from
its report entirely. Meeting AC1 as written therefore means every workflow is enabled and every
optional surface is implemented - blob and manifest delete, cross-repository blob mount
(`OCI_CROSSMOUNT_NAMESPACE`), and the referrers API among them. Manifest lists and the
referrers API are exercised through AC1's pinned suite; if a pinned release turns out not to
cover a surface this spec puts in scope, that surface gets bespoke harness cases rather than
silent non-coverage. What happens when a case cannot pass for a reason outside our control is
Q4; the cross-mount policy across private repositories is Q5.

### Mapping onto the shared data model

This is the least-resolved part of the spec. OCI content is a reference graph: a tag names a
manifest, an image index references child manifests, manifests reference config and layer
blobs, and a referrers listing is a reverse lookup over manifests' `subject` fields. The shared
model (`data-model.md`) provides `Version -> File -> Blob` and deliberately never parses the
format-specific metadata document - which means GC cannot mark through references recorded only
inside that document, and the referrers API cannot be served from it either. Untagged child
manifests must nonetheless be pullable by digest and counted live by GC. The shared model
therefore carries a format-agnostic `Reference` edge between versions, with OCI's `subject`
recorded queryably: GC marks through it, and the referrers API is one indexed lookup rather than
something the core would have to parse manifests to answer. That was a `data-model.md` spec
change rather than a local workaround, settled there and here together.

### Chunked upload and the durability split

AC4 asserts the client-visible half of resumable upload: interrupt, resume, complete with a
correct digest. Everything conformance cannot see - orphaned chunks from abandoned sessions, GC
eligibility during the commit-to-reference window, crash consistency - is owned by
`storage-and-gc.md` (its AC3, AC5 and AC6), and per the standing rule a client-level
conformance run is not evidence for any of it. The upload session lifetime, which the wire
protocol surfaces as a 404 on an expired session, is Q6.

### The proxied path

A tag-to-digest mapping is mutable metadata under the proxy layer's TTL rules
(`proxy-cache.md`); blobs and by-digest manifests are immutable and cache indefinitely.
Upstream authentication and quirks (Docker Hub's token exchange, rate limits) belong to the
upstream adapter axis (`format-handler-interface.md`, resolved Q4), not to this handler.

## Acceptance Criteria

- [ ] AC1: The official `opencontainers/distribution-spec` conformance suite, at a pinned
      tagged release, passes with zero skips across all four workflow categories.
- [ ] AC2: `docker push` and `docker pull` round-trip an image with an unchanged digest, for
      at least two pinned Docker client versions.
- [ ] AC3: `helm push` and `helm pull` round-trip a chart as an OCI artifact.
- [ ] AC4: A chunked upload interrupted partway resumes and completes with a correct digest.
- [ ] AC5: The token auth flow issues correctly scoped tokens, and a token scoped to one
      repository cannot read another.
- [ ] AC6: The proxied path serves an image fetched from an upstream registry and serves the
      second pull entirely from cache, with no upstream request within the metadata TTL,
      asserted at the network layer.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/oci/official_test.go` |
| AC2 | conformance | `conformance/oci/hosted_test.go` |
| AC3 | conformance | `conformance/oci/helm_test.go` |
| AC4 | conformance | `conformance/oci/chunked_test.go` (scripted client; the durability half lives in `storage-and-gc.md`'s plan) |
| AC5 | integration | `internal/format/oci/token_test.go` |
| AC6 | conformance | `conformance/oci/proxied_test.go` (network-level assertion) |

## Implementation Phases

### Phase 1: Pull and push
- Manifest and blob endpoints with monolithic upload, wired to the shared CAS and the token
  auth service

### Phase 2: Chunked and resumable upload
- Sessions, ranges, resume, against the storage layer's upload lifecycle

### Phase 3: Content discovery and management
- Tag listing, blob and manifest delete, manifest lists, the referrers API

### Phase 4: Proxied path
- Upstream adapter for the distribution API, cache policy per resource class

### Phase 5: The gate
- Official suite at zero skips, the client version matrix (Docker x2, Helm), matrix reporting

## Tasks

Left empty by design. Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

Q2 through Q6 were raised by the 2026-09-22 review and await the owner. The resolved decision
that follows them is kept rather than deleted, so the reasoning survives the next time someone
asks why it was done this way.

### Resolved: the manifest reference graph (was Q2)

**Settled 2026-09-23 together with `foundation/data-model.md` Q9: a format-agnostic `Reference`
edge between versions**, with the relation - OCI's `subject` - recorded and queryable.

GC marks through the edge, so an index's untagged child manifests stay live. The referrers API
becomes one indexed query rather than something the core would have to parse manifests to
answer. Both specs previously carried opposite recommendations for this one decision; this
settles both.

Accepted cost: the shared model gains an entity on OCI's account. The alternative was flattening
the graph into `File` rows, which keeps GC sound but loses the referrers query that OCI
conformance tests - putting the zero-skips goal at risk.

### Q3: What credential does a non-interactive docker login present, and where does it come from?

**Recommendation:** A - personal access tokens (and later robot accounts) usable as the
password at the token endpoint; every incumbent registry converged on this, and docker cannot
perform a browser flow.

| Option | You get | It costs |
|---|---|---|
| **A. Personal access tokens as the docker login credential** | Works with every OCI client today; scoping and revocation are natural | A token-management surface (issue, list, revoke) lands on the critical path before OCI ships |
| **B. Static per-user passwords on the SSO account** | No new surface | Encourages long-lived primary credentials in CI secrets, and collides with an SSO-first identity model where users may have no password at all |

**Why this is yours:** it creates the platform's first credential-management product surface,
whose shape outlives OCI. `foundation/auth.md` settles how a credential is verified and scoped;
what remains open here is how a non-interactive `docker login` obtains one in the first place,
which is a product decision rather than a security-mechanism one.

### Q4: What is the recourse when a conformance case cannot pass for a reason outside our control?

**Recommendation:** B - a documented exception list: each such case carries an upstream issue
link and a named line in this spec, and AC1's zero-skips gate applies to everything else. A
gate with no defined failure mode gets renegotiated ad hoc under deadline pressure.

| Option | You get | It costs |
|---|---|---|
| **A. Absolute: AC1 stays unticked until the suite is fixed upstream** | Maximum credibility, zero judgment calls | A single upstream suite defect blocks the format, and the experiment's headline gate, indefinitely |
| **B. Documented exceptions: upstream issue link plus a named line here; zero skips for everything else** | The gate survives contact with suite defects without going soft | Someone must police that the list holds only genuine upstream defects, never our own gaps |

**Why this is yours:** AC1 is the experiment's flagship gate; only the owner decides what may
weaken it and by how much.

### Q5: May a cross-repository blob mount reveal that a blob exists in a repository the client cannot read?

**Recommendation:** A - a mount succeeds only when the client has proven read access to the
named source repository, and otherwise falls back to the spec-permitted "start a regular
upload" response, which leaks nothing.

| Option | You get | It costs |
|---|---|---|
| **A. Mount requires read access to the source; silent fallback to a normal upload otherwise** | No existence oracle across private repositories, while staying spec-conformant (the fallback is a defined behavior) | An extra authorization check on the mount path, and the cross-mount conformance case must run with a suitably scoped token |
| **B. Mount by digest from anywhere - the pure CAS view** | Maximum deduplication convenience | Any authenticated user can probe whether any digest exists in any private repository, a real leak class in multi-tenant registries built on shared CAS |

**Why this is yours:** it is a security-posture trade between convenience and a cross-tenant
information leak inherent to shared content addressing, and it constrains how AC5's scoping
test must be written.

### Q6: How long does an idle resumable upload session live before it expires?

**Recommendation:** B - sliding idle expiry with an absolute cap, both recorded in
`storage-and-gc.md` alongside orphan cleanup, with the handler answering an expired session as
the distribution spec prescribes.

| Option | You get | It costs |
|---|---|---|
| **A. A fixed TTL from session creation** | Trivial to reason about and to fault-inject | A slow but legitimate multi-gigabyte push can die mid-flight at the cap |
| **B. Sliding idle expiry with an absolute cap** | Survives bursty CI pauses while still bounding orphan lifetime | Two parameters instead of one, and expiry interacts with the GC grace period in both directions |

**Why this is yours:** it draws the line between "resumable", a promise made to clients, and
"orphan", what cleanup may reap; the wrong value either strands storage or kills real pushes,
and no measurement can derive it.

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
| 2026-09-22 | afbb4e4 | adversarial + constitution + go-spec-reviewer (claim verification vacuous pre-code; suite claims grounded against the v1.1.1 and main conformance READMEs) | Expanded Design: suite pinned to a tagged release, zero-skips implications spelled out, token-service placement derived from the handler boundary, data-model mapping gap and durability split named; tightened AC1/AC2/AC6; raised Q2-Q6 (manifest graph, docker login credential, zero-skips escape hatch, cross-mount leak policy, session lifetime); stays draft. |
