---
status: draft
status_description: "Folded 2026-09-26 at 4d1aeb1 under the owner's standing delegation: Q3 (registry token as the docker login credential, no refresh token), Q4 (documented exception list, with v1.1.1's four structural skips grounded against the suite source), Q5 (cross-mount only with proven read on the source, indistinguishable 202 fallback), Q6 (sliding idle expiry with a cap, defined once in data-model.md) and the new Q7 (a two-repository suite credential) adopted; AC1 rewritten, AC7-AC10 added. Zero open questions; stays draft until a gate review, and AC1 depends on auth.md defining a credential kind that can span two repositories."
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
surfaces; chunked and resumable blob upload with bounded session lifetime; cross-repository
blob mount that reveals nothing about repositories the client cannot read; manifest lists; the
referrers API; and the OCI token authentication flow, with registry tokens as the `docker login`
credential.

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
wire format. The auth foundation it rests on is no longer a gap: `foundation/auth.md` settles
repository-plus-action scopes, the OCI token flow's signing and expiry obligations, and the
bounded revocation window an already-issued token carries.

**The `docker login` credential is a registry token** (adopted 2026-09-26, the resolved
docker-login-credential decision below). A non-interactive `docker login` presents the
scoped, revocable registry token `auth.md` already defines for machine identity - the
personal access token of the adopted option, not a new credential kind - as the password of
the Basic credential it sends to the token endpoint, and the username is not an authentication
input, exactly as `auth.md`'s Basic-form semantics state for pip. An SSO-only user, who has no
password at all, mints such a token and uses it the same way. Two consequences are derived
rather than chosen. First, **the token endpoint never issues a refresh token**: the token
specification makes one optional, and a refresh token would be a second long-lived credential
outside `auth.md`'s hash-only storage and revocation model, so a revoked registry token is
refused at the client's next exchange and its reach ends with the already-issued access
token's lifetime (`auth.md` AC5). Second, **token issuance, listing and revocation are on this
format's critical path**: OCI cannot ship before a user can obtain the credential `docker
login` needs, so Phase 1 depends on that surface. It is cross-format (npm, pip and Maven present
the same tokens), so it is not specced here: `auth.md`'s resolved expiry-warning placement names
it as a credential-management surface spec of its own, which must also carry the expiry-warning
criterion, and that spec does not exist yet.

Under `auth.md`'s single-repository tokens, a registry token authorizes one repository, and the
token service grants the subset of a multi-repository scope request the token covers. That is
what makes a real `docker` client's cross-repository mount fall back (see "Cross-repository
mount") and what the suite credential below cannot be.

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
its report entirely (`OCI_HIDE_SKIPPED_WORKFLOWS`, which the harness never sets). Meeting AC1
therefore means every workflow is enabled and every optional surface is implemented - blob and
manifest delete, cross-repository blob mount (`OCI_CROSSMOUNT_NAMESPACE`), and the referrers
API among them. Manifest lists and the referrers API are exercised through AC1's pinned suite;
if a pinned release turns out not to cover a surface this spec puts in scope, that surface gets
bespoke harness cases rather than silent non-coverage.

**Literal zero skips is unreachable at v1.1.1, for any registry.** Read against the suite's
source at the v1.1.1 tag (2026-09-26), several cases sit in complementary pairs whose members
are guarded by opposite conditions (`RunOnlyIf` and `RunOnlyIfNot` in `setup.go`, which call
`g.Skip`), so every configuration skips one member of each pair however complete the registry
is. That makes the recourse for a case that cannot pass or run for reasons outside our control
a present need rather than a hypothetical one, and it is settled as a **documented exception
list** (adopted 2026-09-26, the resolved conformance-exceptions decision below). The rule:

- AC1's gate applies to every case the pinned suite reports, and a skip or failure not on the
  list below fails the run.
- An entry is admissible in exactly two classes. **Upstream defect**: the case is wrong
  against the distribution spec, carrying a link to the upstream issue. **Structural**: the
  suite's own control flow makes the case unreachable for a registry in our declared
  configuration, cited against the suite source at the pinned tag. **A surface we have not
  implemented, or implemented wrongly, is never admissible**: that is our gap, and listing it
  is the soft gate this rule exists to prevent.
- Every entry carries a tracking issue number, which is what `CLAUDE.md` and
  `conformance-harness.md` AC5 require of any skip, and a named line in the table below. A
  structural entry also names its partner case, and holds only while that partner ran and
  passed in the same run - so an exception can never hide the behaviour its pair exists to
  test.
- **An entry that no longer applies fails the run**: an excepted case that runs and passes, or
  an upstream defect fixed at a newly pinned tag, forces its entry's removal, so the list only
  shrinks by evidence and never quietly outlives its cause.
- Adding an entry is a change to this spec, reviewed as one; a suite upgrade re-derives the
  list against the new tag's source.

The list at v1.1.1, all four entries structural:

| Case skipped (v1.1.1) | Why it cannot run | Partner that must run and pass | Issue |
|---|---|---|---|
| Pull: "Get tag name from environment" | Runs only when content is pre-seeded through `OCI_TAG_NAME`, `OCI_MANIFEST_DIGEST` and `OCI_BLOB_DIGEST`; the harness lets the suite push its own content, which exercises more of the registry | Pull: the "Populate registry with test ..." setup cases | to be filed before AC1 is first claimed; an entry without one fails the runner |
| Content Discovery: "Populate registry with test tags (no push)" | Runs only when `OCI_TAG_LIST` pre-seeds tags; same reasoning | Content Discovery: "Populate registry with test tags" | as above |
| Push: "Cross-mounting of nonexistent blob should yield session id" | Runs only when the preceding mount of an existing blob answers `202`; ours answers `201`, because the suite credential can read the source (the resolved suite-credential decision below) | Push: "GET request to test digest within cross-mount namespace should return 200" | as above |
| Push: "Cross-mounting without from, and automatic content discovery enabled should return a 201" | Runs only under `OCI_AUTOMATIC_CROSSMOUNT=true`; a mount without `from` never mounts here (see "Cross-repository mount"), so the harness declares it `false` | Push: "Cross-mounting without from, and automatic content discovery disabled should return a 202" | as above |

**The suite credential spans two repositories.** The pinned suite configures one client from
`OCI_USERNAME` and `OCI_PASSWORD` and uses it both for `OCI_NAMESPACE` and for mounting into
`OCI_CROSSMOUNT_NAMESPACE` from it (v1.1.1 `setup.go` and `02_push_test.go`). The harness
therefore provisions, for AC1, a credential granting `pull`, `push` and `delete` on the namespace
and `pull` and `push` on the cross-mount namespace, and the mount-into-another-repository case
answers `201` under it (adopted 2026-09-26, the resolved suite-credential decision below).
Which credential kind can hold grants on two repositories is `auth.md`'s to define; this spec
states the requirement, and AC1 is unsatisfiable until some credential kind meets it. Pointing
the cross-mount namespace at the namespace itself, or listing the cross-mount cases as
exceptions, would pass the gate without testing the surface, and both are ruled out.

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

An OCI upload session is exactly the upload session `data-model.md` defines ("Upload sessions
and the upload scope"): one blob, one repository, ended by commit or expiry, with the upload URL
carrying its identity. There is no push session, and nothing in this handler may key on one:
the blobs of one push are independent sessions, and the manifest `PUT` that eventually names
them carries no session at all. What spans the gap from a blob's commit to that manifest - the
grace period and in-flight digest reads - is scoped to the repository, per the same definition.

AC4 asserts the client-visible half of resumable upload: interrupt, resume, complete with a
correct digest. Everything conformance cannot see - orphaned chunks from abandoned sessions, GC
eligibility during the commit-to-reference window, crash consistency - is owned by
`storage-and-gc.md` (its AC3, AC5 and AC6), and per the standing rule a client-level
conformance run is not evidence for any of it.

**Session lifetime is sliding idle expiry with an absolute cap** (adopted 2026-09-26, the
resolved session-lifetime decision below). The rule and its defaults - one hour idle, 24 hours
absolute, every continuation refreshing the idle period and nothing refreshing the cap - are
format-agnostic and live in `data-model.md`'s definition, since chunked upload is not OCI's
alone. What is OCI's is the wire answer: a `PATCH`, a status `GET` or a closing `PUT` against an
expired session returns `404` with the `BLOB_UPLOAD_UNKNOWN` error code (the distribution
spec's failure status for end-5, end-6 and end-13, and its code-3), exactly as for a session
that never existed, so the client restarts that blob. Committed blobs are unaffected by any
session's expiry: their survival until the manifest arrives is the repository-scoped grace
period's job, and an open session holds that grace open.

### Cross-repository mount

A mount (`POST /v2/<name>/blobs/uploads/?mount=<digest>&from=<other>`) asks the registry to make
a blob in another repository available in this one without re-sending its bytes. Under a shared
CAS the bytes are nearly always present somewhere, which is exactly why a mount answered "from
anywhere" would be an existence oracle across private repositories.

The rule (adopted 2026-09-26, the resolved cross-mount decision below): **a mount succeeds
(`201 Created`) only when the request's access token grants `pull` on the named source
repository and the digest resolves in that source** under `data-model.md`'s rule that a digest
resolves in a repository only through that repository's own content. In every other case - no
`pull` on the source, a source that does not exist, a digest the source does not hold though
another repository or the CAS does, a digest held nowhere - the registry answers exactly as for
a mount it cannot perform: `202 Accepted` with a fresh upload session, which the distribution
spec defines as the response for a registry "unable to mount the requested blob". Those
responses are indistinguishable from each other, so the mount reveals nothing about the
source. The fallback never answers `401` or `403` on the source's account, because a denial
naming the source is itself a signal.

A mount without `from` never mounts from anywhere: it always starts a regular upload session.
The spec permits a registry to treat `from` as optional and search for the blob, and that search
is precisely the cross-repository oracle this rule closes. The harness therefore declares
`OCI_AUTOMATIC_CROSSMOUNT=false`, which is what the fourth entry in the exception list records.

A successful mount is an upload session that opens and commits at once, so the mounted blob is
**in flight in the target repository** under the upload scope: resolvable by digest there,
protected by the target's grace until a manifest references it, and routed through the shared
reference-creation barrier like every other reference-to-an-old-blob path
(`storage-and-gc.md`'s write barrier already names cross-repository mount among them). The
target never depends on the source keeping the blob.

Accepted cost, visible to users: a client whose credential cannot read the source never
mounts, and pushes the bytes again - and under `auth.md`'s single-repository tokens that is
every client presenting a registry token, so for now a real `docker` push never mounts at all. That costs bandwidth, not storage, because the CAS stores the re-sent content
once.

### The proxied path

A tag-to-digest mapping is mutable metadata under the proxy layer's TTL rules
(`proxy-cache.md`); blobs and by-digest manifests are immutable and cache indefinitely.
Upstream authentication and quirks (Docker Hub's token exchange, rate limits) belong to the
upstream adapter axis (`format-handler-interface.md`, resolved Q4), not to this handler.

## Acceptance Criteria

- [ ] AC1: The official `opencontainers/distribution-spec` conformance suite, at a pinned
      tagged release, with all four workflow categories enabled and run under one credential
      that can pull from `OCI_NAMESPACE` and push to `OCI_CROSSMOUNT_NAMESPACE`, reports no
      failure and no skip outside this spec's exception list; every listed structural
      exception's partner case ran and passed in the same run; and the run fails if any listed
      case runs and passes or any entry lacks an issue number. That last rule also fails a run
      whose credential cannot read the source namespace, since the mount then answers `202`
      and the excepted `202`-branch case runs.
- [ ] AC2: `docker push` and `docker pull` round-trip an image with an unchanged digest, for
      at least two pinned Docker client versions.
- [ ] AC3: `helm push` and `helm pull` round-trip a chart as an OCI artifact.
- [ ] AC4: A chunked upload interrupted partway resumes and completes with a correct digest.
- [ ] AC5: The token auth flow issues correctly scoped tokens, and a token scoped to one
      repository cannot read another.
- [ ] AC6: The proxied path serves an image fetched from an upstream registry and serves the
      second pull entirely from cache, with no upstream request within the metadata TTL,
      asserted at the network layer.
- [ ] AC7: An upload session answers `404` with `BLOB_UPLOAD_UNKNOWN` to a `PATCH`, a status
      `GET` and a closing `PUT` once it has sat idle past the idle period or reached the
      absolute cap, and not before: on an injected clock, a session receiving a chunk inside
      every idle window completes after more than one idle period has elapsed, and a blob
      committed before another session in the same repository expired is still accepted by the
      manifest that names it, inside the repository's grace.
- [ ] AC8: A real `docker` client that pulled an image from repository A and then pushes it to
      repository B under a credential that cannot read A completes the push, and every mount
      request it sends is answered `202` with an upload session, asserted at the network
      layer; a run observing no mount request fails rather than passing vacuously. A scripted client
      then shows the mount responses for a blob A holds but the caller cannot read, a digest
      held only by a third repository, a nonexistent source repository and a digest held
      nowhere are identical in status, headers other than the session location, and body.
- [ ] AC9: A mount answers `201` and the blob then resolves by digest in the target only when
      the access token grants `pull` on the source and the source holds the digest (including a
      blob in flight in the source); a mount without `from` always answers `202`; and a mounted
      blob that no manifest in the target references stays resolvable in the target after the
      source deletes its own reference, until the target's grace lapses.
- [ ] AC10: `docker login --password-stdin`, given a registry token as the password and an
      arbitrary username, succeeds non-interactively for both pinned Docker versions, and a
      push and pull then work under it; the token endpoint's responses carry no refresh token;
      and once the registry token is revoked, the next token exchange is refused.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/oci/official_test.go` (the exception list's machine-readable copy in `conformance/oci/`, read by the runner) |
| AC2 | conformance | `conformance/oci/hosted_test.go` |
| AC3 | conformance | `conformance/oci/helm_test.go` |
| AC4 | conformance | `conformance/oci/chunked_test.go` (scripted client; the durability half lives in `storage-and-gc.md`'s plan) |
| AC5 | integration | `internal/format/oci/token_test.go` |
| AC6 | conformance | `conformance/oci/proxied_test.go` (network-level assertion) |
| AC7 | integration | `internal/format/oci/upload_session_test.go` (scripted wire client, injected clock) |
| AC8 | conformance | `conformance/oci/crossmount_test.go` (real `docker` client, network-level assertion; scripted client for the indistinguishability cases) |
| AC9 | integration | `internal/format/oci/crossmount_test.go` (access tokens minted by the token service with the scopes under test) |
| AC10 | conformance | `conformance/oci/login_test.go` (both pinned Docker versions; revocation via the auth layer) |

## Implementation Phases

### Phase 1: Pull and push
- Manifest and blob endpoints with monolithic upload, wired to the shared CAS and the token
  auth service
- `docker login` with a registry token at the token endpoint, no refresh token (AC10); depends
  on the credential-management surface (token issuance and revocation) being specced and built
  first

### Phase 2: Chunked and resumable upload
- Sessions, ranges, resume, against the storage layer's upload lifecycle
- Session expiry per `data-model.md`'s definition, answered as `BLOB_UPLOAD_UNKNOWN` (AC7)

### Phase 3: Content discovery and management
- Tag listing, blob and manifest delete, manifest lists, the referrers API
- Cross-repository mount under the read-proof rule, with the indistinguishable fallback (AC8,
  AC9)

### Phase 4: Proxied path
- Upstream adapter for the distribution API, cache policy per resource class

### Phase 5: The gate
- Official suite at zero skips outside the exception list, with its issues filed and its
  machine-readable copy in `conformance/oci/`; the two-repository suite credential; the client
  version matrix (Docker x2, Helm), matrix reporting

## Tasks

Left empty by design. Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None are open. Q3 through Q6, raised by the 2026-09-22 review, and Q7, raised while folding
them, were adopted on 2026-09-26 under the owner's standing delegation and folded through Design,
AC1 and AC7 through AC10, the Test Plan and the phases. Resolved decisions are kept rather than
deleted, so the reasoning survives the next time someone asks why it was done this way.

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

### Resolved: the docker login credential (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a registry token -
the scoped, revocable machine credential `auth.md` defines, called a personal access token in
this question - presented as the password of the Basic credential at the token endpoint, with
the username not an authentication input. Robot accounts are not part of this adoption; they
would be a new principal kind, which is `auth.md`'s to define.

**Recommendation (as written before adoption):** A - personal access tokens (and later robot
accounts) usable as the password at the token endpoint; every incumbent registry converged on
this, and docker cannot perform a browser flow.

| Option | You get | It costs |
|---|---|---|
| **A. Personal access tokens as the docker login credential** | Works with every OCI client today; scoping and revocation are natural | A token-management surface (issue, list, revoke) lands on the critical path before OCI ships |
| **B. Static per-user passwords on the SSO account** | No new surface | Encourages long-lived primary credentials in CI secrets, and collides with an SSO-first identity model where users may have no password at all |

**Why this was the owner's:** it creates the platform's first credential-management product
surface, whose shape outlives OCI. `foundation/auth.md` settles how a credential is verified and
scoped; what remained open here was how a non-interactive `docker login` obtains one.

Accepted cost: token issuance, listing and revocation sit on OCI's critical path (Phase 1), in
a credential-management surface spec that `auth.md` names and nobody has written yet.
Option B lost because an SSO-first identity model has users with no password at all, and a
static password in CI secrets is exactly the long-lived primary credential `auth.md`'s design
avoids. Derived in folding, not separately decided: the token endpoint issues no refresh token,
because one would be a second long-lived credential outside `auth.md`'s hash-only storage and
revocation model. Folded into Design ("Token auth is a separate subsystem"), AC10 and Phase 1.

### Resolved: recourse when a conformance case cannot pass (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: a documented exception
list, with the admissibility rule, the partner rule for structural entries and the
stale-entry rule stated in Design ("The official suite, pinned, and what zero skips actually
buys"). AC1's gate applies to everything else.

**Recommendation (as written before adoption):** B - a documented exception list: each such
case carries an upstream issue link and a named line in this spec, and AC1's zero-skips gate
applies to everything else. A gate with no defined failure mode gets renegotiated ad hoc under
deadline pressure.

| Option | You get | It costs |
|---|---|---|
| **A. Absolute: AC1 stays unticked until the suite is fixed upstream** | Maximum credibility, zero judgment calls | A single upstream suite defect blocks the format, and the experiment's headline gate, indefinitely |
| **B. Documented exceptions: upstream issue link plus a named line here; zero skips for everything else** | The gate survives contact with suite defects without going soft | Someone must police that the list holds only genuine upstream defects, never our own gaps |

**Why this was the owner's:** AC1 is the experiment's flagship gate; only the owner decides what
may weaken it and by how much.

Accepted cost: the list must be policed so it never holds our own gaps. The policing is made
mechanical where it can be - admissibility is limited to two named classes, a structural entry
holds only while its partner passes, and an entry whose case runs and passes fails the run - and
adding an entry is a spec change under review. Option A lost more decisively than the question
anticipated: grounding against the v1.1.1 suite source while folding showed its complementary
case pairs make literal zero skips unreachable for every registry, so option A would have left
AC1 permanently unticked. The upstream-link requirement was widened in folding to two classes,
because a structural skip is not an upstream defect and has no upstream issue to link; every
entry still carries a tracking issue number, as `CLAUDE.md` requires of any skip. Folded into
Design, AC1, the Test Plan and Phase 5.

### Resolved: cross-repository mount across private repositories (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a mount succeeds only
when the access token grants `pull` on the named source and the source holds the digest;
otherwise the registry starts a regular upload, indistinguishably for every reason it could not
mount. A mount without `from` never mounts.

**Recommendation (as written before adoption):** A - a mount succeeds only when the client has
proven read access to the named source repository, and otherwise falls back to the
spec-permitted "start a regular upload" response, which leaks nothing.

| Option | You get | It costs |
|---|---|---|
| **A. Mount requires read access to the source; silent fallback to a normal upload otherwise** | No existence oracle across private repositories, while staying spec-conformant (the fallback is a defined behavior) | An extra authorization check on the mount path, and the cross-mount conformance case must run with a suitably scoped token |
| **B. Mount by digest from anywhere - the pure CAS view** | Maximum deduplication convenience | Any authenticated user can probe whether any digest exists in any private repository, a real leak class in multi-tenant registries built on shared CAS |

**Why this was the owner's:** it is a security-posture trade between convenience and a
cross-tenant information leak inherent to shared content addressing.

Accepted cost: an authorization check on the mount path, a suite credential that must read the
source namespace (the resolved suite-credential decision below), and re-sent bytes for every
client that cannot read the source. Option B lost because a shared CAS makes "mount from
anywhere" a digest-existence probe into every private repository, which `auth.md`'s resolved
existence-oracle decision refuses at the repository level already. Folded into Design
("Cross-repository mount"), AC8 (the leak closed through a real `docker` client, with the
fallback responses proven indistinguishable) and AC9 (the success path and the mounted blob's
place under the target's upload scope), and Phase 3.

### Resolved: upload session lifetime (was Q6)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: sliding idle expiry
with an absolute cap. The recommendation named `storage-and-gc.md` as the rule's home; it is
recorded instead in `data-model.md`'s single definition of an upload session, because this
question was the third collision of one root cause (a session the wire does not have) and the
answer is a definition every consumer cites, and because `storage-and-gc.md` is `planned` and
not edited in this pass. The values were a new judgment call and are that spec's resolved
session-lifetime-defaults decision: one hour idle, 24 hours absolute.

**Recommendation (as written before adoption):** B - sliding idle expiry with an absolute cap,
both recorded in `storage-and-gc.md` alongside orphan cleanup, with the handler answering an
expired session as the distribution spec prescribes.

| Option | You get | It costs |
|---|---|---|
| **A. A fixed TTL from session creation** | Trivial to reason about and to fault-inject | A slow but legitimate multi-gigabyte push can die mid-flight at the cap |
| **B. Sliding idle expiry with an absolute cap** | Survives bursty CI pauses while still bounding orphan lifetime | Two parameters instead of one, and expiry interacts with the GC grace period in both directions |

**Why this was the owner's:** it draws the line between "resumable", a promise made to clients,
and "orphan", what cleanup may reap.

Accepted cost: two parameters, and the interaction with grace. Both directions of that
interaction are now closed by the definition rather than by tuning: an expired session's bytes
are collected only once its repository's grace has also lapsed, and an unexpired session holds
its repository's grace open, so a client paused inside the idle window never loses a layer it
already committed. Option A lost because a fixed window kills a slow but live push at its cap
while giving an abandoned one the same full window. Folded into Design ("Chunked upload and the
durability split"), AC7 and Phase 2.

### Resolved: the official suite's credential (was Q7)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the harness provisions
a credential granting `pull`, `push` and `delete` on `OCI_NAMESPACE` and `pull` and `push` on
`OCI_CROSSMOUNT_NAMESPACE`, and the cross-mount cases run for real under it.

Raised while folding Q4 and Q5. The pinned suite configures one client from `OCI_USERNAME` and
`OCI_PASSWORD` and uses it on two repositories: the namespace, and the cross-mount namespace it
mounts into from the namespace. Under Q5's rule that mount succeeds only if the credential can
read the source, and `auth.md` has adopted single-repository registry tokens, so no registry
token can hold that credential's grants. Left unstated, the harness author would
find the conflict at run time and resolve it by whichever shortcut made the run green.

**Recommendation (as written before adoption):** A - state the two-repository requirement here
and place the credential kind on `auth.md`, because both alternatives pass the gate without
testing the surface.

| Option | You get | It costs |
|---|---|---|
| **A. A two-repository suite credential, with the credential kind defined by `auth.md`** | The cross-mount cases exercise a real mount from a readable source; AC1 stays the standards body's gate | AC1 depends on `auth.md` offering some credential kind that can hold grants on two repositories, which its single-repository tokens do not provide on their own |
| **B. Point `OCI_CROSSMOUNT_NAMESPACE` at `OCI_NAMESPACE`** | A single-repository token suffices | A mount into its own source is a no-op; the case passes while testing nothing |
| **C. Add the cross-mount cases to the exception list** | No credential dependency | An exception covering a surface we implement is our own gap by definition, inadmissible under Q4's rule |

**Why this is the owner's:** it decides whether the flagship gate may depend on a credential
shape another spec has not yet settled.

Accepted cost: AC1 cannot be met until `auth.md` defines a credential kind that holds grants on
two repositories, whether a multi-repository registry token or another principal kind. Options
B and C lost because each passes the gate without exercising the surface, which is the soft
gate Q4's rule exists to prevent. Folded into Design and AC1.

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
| 2026-09-26 | 4d1aeb1 | folding adopted recommendations under the standing delegation | Not a review. Adopted Q3 option A (the `auth.md` registry token as the Basic password at the token endpoint; derived: no refresh token, and token issuance on the Phase 1 critical path), Q4 option B (documented exception list; grounding against the v1.1.1 suite source showed complementary `RunOnlyIf`/`RunOnlyIfNot` pairs make literal zero skips unreachable for any registry, so the list holds four structural entries, each needing its partner to pass, and the admissible classes widened to upstream-defect and structural), Q5 option A (mount only with `pull` on the source and the digest held there, indistinguishable `202` fallback otherwise, no mount without `from`, `OCI_AUTOMATIC_CROSSMOUNT=false`), Q6 option B (sliding idle expiry with a cap, recorded in `data-model.md`'s single upload-session definition because the storage spec is planned and was not edited). Also raised and adopted in this pass: Q7 (the suite presents one credential across two repositories, so the harness needs a credential holding grants on both; `auth.md` must supply the kind). Changed: Scope, the token-auth, suite, chunked-upload and new cross-repository-mount Design sections, AC1 rewritten, AC7 (session expiry on the wire), AC8 (the mount leak closed through a real `docker` client plus indistinguishable scripted responses), AC9 (mount success path and the mounted blob under the target's upload scope) and AC10 (`docker login` with a registry token) added, Test Plan rows and all phases but Phase 4. Zero open questions. |
| 2026-09-22 | afbb4e4 | adversarial + constitution + go-spec-reviewer (claim verification vacuous pre-code; suite claims grounded against the v1.1.1 and main conformance READMEs) | Expanded Design: suite pinned to a tagged release, zero-skips implications spelled out, token-service placement derived from the handler boundary, data-model mapping gap and durability split named; tightened AC1/AC2/AC6; raised Q2-Q6 (manifest graph, docker login credential, zero-skips escape hatch, cross-mount leak policy, session lifetime); stays draft. |
