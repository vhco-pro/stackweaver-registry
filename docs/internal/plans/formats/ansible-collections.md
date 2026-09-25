---
status: draft
status_description: "First review 2026-09-25 at 331ef25: wire contract pinned from captured client traffic (ansible-core 2.18.18rc1), proxied-path design and the write-boundary declaration added, replay and failed-import ACs added (now 8), and Q1-Q5 raised (import-task home, namespaces, signatures, preconfigured upstream, deletion). Stays draft until the owner answers."
description: "Spec for the Ansible Galaxy v3 collection format - the single format where free, easy, private hosting does not already exist."
author: michielvha
goal: "Serve the one ecosystem whose only free self-hosted options are heavy enough that practitioners abandon them."
priority: "medium"
issue: 10
created: 2026-09-21
covers:
  - "internal/format/ansible/**"
---

# Plan: Ansible Galaxy collections

A Galaxy v3 collection registry, hosted and proxied, with `ansible-galaxy` as the conformance
oracle end to end.

## Context

This format inverts the charter's general rule. Everywhere else, hosting alone is not
differentiating because Gitea does it for free. Ansible is the exception:

- Gitea's 23 package types do **not** include Ansible, and Forgejo's support is an unmerged
  community proposal (re-verified 2026-09-25: Forgejo's package registry documentation lists
  24 supported types and Ansible is not among them).
- The only free options are Galaxy NG and pulp_ansible, both built on Pulp with Django,
  PostgreSQL, Redis and workers. Practitioners describe running them as heavy to the point of
  abandonment.
- Nexus, Artifactory and ProGet either lack the format or are not free.
- The common fallback is installing collections from raw git, which has no versioning semantics,
  no discovery and no access control.

Evidence and sources: `docs/internal/research/prior-art-artifact-repositories.md`.

So here, **hosting alone is the product**, and a lightweight private collection registry with
SSO is a genuinely unserved need.

Sequencing note: this format sits in Tier 3 of `formats/catalogue.md` while the charter's
Phase 4 schedules it immediately after PyPI. Whether that early slot stands is owned by the
catalogue's Q4 and the charter's Q1, not decided here.

## Scope

**In scope:** Galaxy v3 version discovery (the available-versions document served at the
configured base URL), collection detail, version list and version detail, versioned artifact
download, multipart publish with the asynchronous import-task status endpoint the client polls,
token authentication in the `Authorization: Token <token>` header form the client sends
(Design, "The wire contract"), and the proxied path: pull-through caching of an upstream Galaxy
server with `download_url` rewriting (Design, "The proxied path").

**Out of scope:**

- Roles. They use the older v1 API, and their content is fetched from the role's source
  repository archive rather than from a registry-published artifact - a different feature
  wearing the same name.
- Write-through publishing to an upstream. `proxy-cache.md` rules it out for every format.
- Signature attachment and production, namespace ownership, and version deletion are **open
  questions** (Q3, Q2, Q5 below), not silent omissions.

## Design

### The wire contract, pinned from captured traffic

Provenance: captured 2026-09-25 by running `ansible-galaxy` (ansible-core 2.18.18rc1) against a
local logging server and against live galaxy.ansible.com, corroborated in the client source
(`lib/ansible/galaxy/api.py` and `lib/ansible/galaxy/token.py` in the ansible-core
distribution). Per the standing
rule, the recorded corpus re-grounds this table when the conformance cases are written (AC7);
what follows is the contract as the client enforces it today.

| Client action | Request |
|---|---|
| Discovery | `GET {base}/`, where `{base}` is the configured server URL taken verbatim; the response is the available-versions document (`{"available_versions": {"v3": "v3/"}}`), whose values join relative to `{base}` |
| Collection detail | `GET {base}/v3/collections/{namespace}/{name}/` |
| Version list | `GET {base}/v3/collections/{namespace}/{name}/versions/` - paginated; the client follows `links.next` |
| Version detail | `GET {base}/v3/collections/{namespace}/{name}/versions/{version}/` - carries `download_url` (an absolute URL the client follows verbatim), the artifact's filename, size and sha256, `metadata.dependencies`, and the `signatures` list |
| Publish | `POST {base}/v3/artifacts/collections/`, multipart form data; the response must carry a `task` URI |
| Import poll | `GET {base}/v3/imports/collections/{task_id}/` |

Constraints the captures established, each load-bearing:

- **The auth header is `Authorization: Token <token>`**, sent on every request including
  discovery (`GalaxyToken` in `token.py`). `Bearer` appears only under the separate Keycloak
  `auth_url` flow, and Basic only when a username/password pair is configured. The plain-token
  form is the v1 target and what AC5 asserts. This corrects the "Bearer or Basic" placeholder
  in `foundation/auth.md`'s client table, corrected there in the same pass. Authentication is
  fully non-interactive: the token comes from `ansible.cfg` or `--token`, so the conformance
  harness needs nothing beyond provisioning a token into the case's config.
- **The client builds every URL except `download_url` from its own configured base, never from
  response `href`s.** In particular, it takes the **last path segment** of the publish
  response's `task` URI as the task id and reconstructs the poll URL itself as
  `{base}/v3/imports/collections/{task_id}/` (`wait_import_task` in `api.py`). A server whose
  import endpoint lives anywhere else is unusable regardless of what URI its publish response
  returns.
- **The import poll contract**: the client tolerates 404 while the task is queued, terminates
  on a non-null `finished_at`, treats `state: failed` as an error rendered from `error.code`
  and `error.description`, and relays `messages[]` entries by `level`. These fields are the
  response contract, not decoration (AC8).
- **No root-anchored mount is needed.** Because every URL derives from an arbitrary configured
  base, the format-first mount `/{format}/{repository}/` works: the user configures
  `url=https://host/ansible/{repository}/` in `server_list`. This adds `ansible-galaxy` to the
  opinionated-client evidence in `format-handler-interface.md`'s URL-shape record, verified by
  a real run rather than at published-spec level.
- **Two routing styles exist upstream, and only one must be served.** galaxy.ansible.com
  answers the plain `/api/v3/...` paths while its response hrefs point at the Galaxy NG
  distribution-based style (`/api/content/{distribution}/v3/plugin/ansible/...`). Since the
  client ignores hrefs and joins from its base, this server serves only the plain style.

### Artifact validation

A collection artifact is a `namespace-name-version.tar.gz` containing `MANIFEST.json` and
`FILES.json`. The per-file SHA256 digests live in `FILES.json` (a `chksum_sha256` per entry);
`MANIFEST.json` carries `collection_info` - including the `dependencies` map that the version
detail's `metadata.dependencies` surfaces for AC4 - and anchors `FILES.json` by its digest in
`file_manifest_file`. Ingest validation is a tarball read, both digest chains verified, and
agreement between the filename, the URL and `collection_info` on namespace, name and version.

### Where the write boundary falls

Per `data-model.md`, each handler's spec declares its ecosystem's write boundaries, and the
declaration is a review item. For this format: **one successful import task is one completed
logical write and produces exactly one snapshot**; a failed import produces nothing. The
import-task record itself is not repository content and never enters a snapshot's content set.
Where that record lives in the shared model, which has no entity for an asynchronous operation,
is Q1.

### The proxied path

The upstream is another Galaxy v3 server - galaxy.ansible.com or a private one; whether
galaxy.ansible.com joins the preconfigured set is Q4. The handler classifies responses under
`proxy-cache.md`'s governing distinction, which the proxy layer never guesses: collection
detail, version lists and version detail are **mutable metadata** under TTL revalidation, and
artifacts are **immutable**, cached indefinitely and keyed by digest. The sha256 the version
metadata declares for the artifact is the integrity digest for the proxy layer's
stream-and-verify.

On the way back, the handler rewrites the version detail's absolute `download_url` to point at
this registry - the same transform `format-handler-interface.md` names for npm packument URLs.
Without the rewrite every proxied install fetches the artifact, which is nearly all of the
bytes, directly from the upstream and the cache never sees it. Publish and the import-task
endpoints are hosted-only.

### What the real client cannot oracle, recorded

Per item 4 of the definition of done in `format-handler-interface.md`, the parts of the Galaxy
surface deliberately unimplemented or not client-testable:

- The bare collection list (`GET /v3/collections/` with no namespace) is served by Galaxy NG
  but never requested by `ansible-galaxy`. If it is implemented for the UI later, it is
  integration-tested, not conformance material.
- Galaxy NG's namespace CRUD endpoints and its version DELETE endpoints have no
  `ansible-galaxy` oracle. Whether either is served at all is Q2 and Q5.
- Signature **serving** has a real-client oracle (`ansible-galaxy` verifies the signatures
  list against a GnuPG keyring when configured to require it); signature **attachment** has
  none, because the client cannot upload one. What v1 does about signatures is Q3, and per the
  precedent `supply-chain-policy.md` set for its own absent signature criterion, no signature
  AC exists here until the producer question is answered.

## Acceptance Criteria

- [ ] AC1: `ansible-galaxy collection publish` uploads a collection and the import task reports
      success through `{base}/v3/imports/collections/{task_id}/`, the URL the client
      reconstructs from its own configured base and the task id it parses from the publish
      response.
- [ ] AC2: `ansible-galaxy collection install` installs that collection into a clean environment
      with a matching content digest, for at least two pinned client versions.
- [ ] AC3: A `requirements.yml` naming this server installs correctly, and the server can be
      added to `ansible.cfg` `server_list` alongside public Galaxy.
- [ ] AC4: Collection dependency resolution works across two collections where one depends on
      the other, with the dependency expressed in the published artifact's `MANIFEST.json` and
      surfaced through the version detail's `metadata.dependencies`.
- [ ] AC5: Token authentication succeeds in the `Authorization: Token <token>` form the client
      sends, an invalid token is rejected, and the header form is verified from captured
      traffic rather than from documentation.
- [ ] AC6: The proxied path installs a collection through an upstream Galaxy server and serves
      it from cache on a second install with no upstream request, asserted at the network
      layer; the version metadata it serves carries a `download_url` pointing at this registry
      rather than the upstream, and the artifact bytes verify against the sha256 the upstream's
      version metadata declared.
- [ ] AC7: Replay-match passes against a corpus recorded from the authoritative reference,
      galaxy.ansible.com, per the conformance harness's authoritative-reference resolution.
- [ ] AC8: A publish whose artifact fails validation (a `FILES.json` entry not matching its
      `chksum_sha256`, or a filename disagreeing with `collection_info`) ends its import task
      with `state: failed` carrying `error.code`, `error.description` and `messages[]` the
      client displays, and no version becomes installable.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/ansible/publish_test.go` |
| AC2 | conformance | `conformance/ansible/install_test.go` |
| AC3 | conformance | `conformance/ansible/requirements_test.go` |
| AC4 | conformance | `conformance/ansible/deps_test.go` |
| AC5 | conformance | `conformance/ansible/auth_test.go` |
| AC6 | conformance | `conformance/ansible/proxied_test.go` |
| AC7 | conformance | `conformance/ansible/replay_test.go` |
| AC8 | conformance | `conformance/ansible/publish_test.go` (failed-import case) |

The case set needs nothing beyond the harness's existing `setup` vocabulary (repositories,
tokens, an upstream stand-in), so this format adds no pressure to `conformance-harness.md` Q4.
The runner-enforced obligations - both modes, unauthenticated and unauthorized cases in each -
apply from the sibling specs and are not restated per criterion here.

## Implementation Phases

### Phase 1: Hosted path
- Discovery, collection and version endpoints, artifact download, multipart publish with
  import-task validation, token auth

### Phase 2: Proxied path
- Response classification, `download_url` rewriting, cache and offline behaviour through the
  shared proxy layer

Charter sequencing places this after the post-OCI interface re-open; Q1's answer decides
whether the import-task mechanism rides that re-open.

## Tasks

Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

Q1 through Q5 were raised by the 2026-09-25 first review and await the owner. Implementation
cannot start while they stand.

### Q1: Where does the import-task record live, given the shared model has no entity for an asynchronous operation?

The publish flow is asynchronous on the wire: the POST returns a task URI and the client polls
`{base}/v3/imports/collections/{task_id}/` until `finished_at` is set. A task record is not a
package, version, file or blob - a failed import belongs to no version at all - so the shared
model gives it no home, handlers may not own tables, and `format-handler-interface.md`
deliberately excluded async import pipelines from the pinned method set (naming Galaxy import
tasks as the example), deferring the class to the post-OCI re-open with Debian as the prototype.

**Recommendation:** A - validate synchronously inside the POST and store the finished task
record in the repository-level opaque metadata document, pruned after a bounded window, and
feed this outcome to the interface re-open as evidence alongside the Debian prototype.
Validation is a tarball read plus digest checks, so the synchronous window is small, and the
client's first poll simply finds the task already finished.

| Option | You get | It costs |
|---|---|---|
| **A. Synchronous validation; task record in the repository-level metadata document** | Implementable against the settled model today with no schema or interface change; the poll contract is honoured trivially because the task is finished before the first poll | Concurrent publishes contend on one document's revision token (the settled retry-with-backoff path); task history is a bounded log squeezed into a metadata document rather than a queryable entity; a very large artifact holds the POST open for its validation |
| **B. Amend the shared data model with a first-class async-operation entity** | A real, queryable home that the other async formats (Debian index generation, future import pipelines) reuse | A schema change through `data-model.md`'s revision-and-re-review mechanism on one format's account before any evidence exists - the exact anticipation the shared model refuses |
| **C. Wait for the post-OCI re-open to decide the write-triggered services class, and take whatever mechanism it produces** | The placement is argued from evidence at the gate built for exactly this class; charter sequencing already puts this format after that re-open | If the re-open's Debian-shaped answer does not fit Galaxy's request-scoped task, this spec is back to A versus B with time lost, and the re-open's evidence set grows another obligation |

**Why this is yours:** it picks which architectural rule bends - squeezing an operation into a
metadata document, amending the shared schema early, or betting on the re-open - and that
ranking is the same constitution-level judgment class as `supply-chain-policy.md` Q3.

### Q2: Are namespaces a name prefix, or first-class objects with ownership?

Galaxy addresses a collection as `namespace.name`, and on Galaxy NG a namespace is an owned
object: publishing into one is permissioned per namespace. The client itself never touches
namespace endpoints during install or publish, so the wire needs nothing beyond the
`{namespace}/{name}` URL grammar. But the authorization model this registry has settled is
repository-scoped (`auth.md`): under it, any principal with push on the repository can publish
into **any** namespace in it, and per-namespace rights would need the path-pattern scoping that
is itself open (`auth.md` Q13).

**Recommendation:** A - namespace is a name segment of the package (stored as
`namespace.name`), v1 has no namespace objects, and per-namespace publish rights arrive as a
consumer of `auth.md` Q13's pattern scoping when that lands, with the dependency recorded
there. Teams needing isolation today get it the way the model already provides: separate
repositories.

| Option | You get | It costs |
|---|---|---|
| **A. Name prefix only; namespace permissions ride `auth.md` Q13 later** | No new authorization vocabulary; the repository stays the single RBAC unit; nothing to build that the client never asks for | A Galaxy NG migrant expecting namespace ownership finds a repository-wide push grant instead, and multi-team sharing of one repository waits on the pattern-scoping answer |
| **B. First-class namespace records with ownership, enforced centrally** | The isolation model Galaxy NG users arrive expecting, inside one repository | Invents a second authorization vocabulary beside the scope model while `auth.md` Q13 and Q16 are still open, and needs a home for namespace records the shared model does not have - two sibling questions pre-empted at once |

**Why this is yours:** it decides the product's isolation unit for Ansible users (repository
versus namespace), and option B pre-empts two open questions you have not answered in the spec
that owns them.

### Q3: What does v1 do about collection signatures?

The client has first-class signature support: the version detail carries a `signatures` list,
and `ansible-galaxy` verifies them against a GnuPG keyring when configured to require valid
signatures. Serving signatures therefore has a real-client oracle. Attaching them does not -
the client cannot upload a signature, so an attachment surface would be API-only - and no spec
owns signature production or verification: `supply-chain-policy.md` Q6 (open) is deciding
exactly who owns that, and its precedent is that an AC against an unspecced producer is
untestable.

**Recommendation:** A - v1 serves an empty `signatures` list and builds no signing or
attachment surface; the signature story lands with `supply-chain-policy.md` Q6's producer
spec, and this spec records the outbound dependency so the gap cannot be lost. This is
evidence sequencing, not effort: building an attachment surface now would pre-empt the sibling
question that owns verification.

| Option | You get | It costs |
|---|---|---|
| **A. Empty `signatures` in v1; the Q6 producer spec owns the feature** | No pre-emption of an open sibling question; the client works fine, since unsigned collections are the default posture | Private-registry users get no signed-collection story at launch, and Galaxy NG has one; if Q6 stalls, so does this |
| **B. Store-and-serve: an API surface accepts detached signatures and the version detail serves them; verification stays client-side against the keyring** | The signed-collection story ships without the server touching a key; the serving half is conformance-testable with the real client requiring valid signatures | The attachment half has no client oracle and becomes a bespoke API surface designed before the owner has decided who owns signature state (`supply-chain-policy.md` Q6, and its Q3 boundary problem) |
| **C. Server-side signing, Galaxy NG style** | Signatures exist without any user workflow | The registry takes on signing-key management - generation, storage, rotation - which `auth.md`'s nothing-is-invented posture treats as the most dangerous class of surface, for a format question that has not established the need |

**Why this is yours:** it sequences a security feature against `supply-chain-policy.md` Q6,
which is yours and open, and it decides whether this format launches with or without the one
supply-chain feature its main competitor ships.

### Q4: Does galaxy.ansible.com join the preconfigured upstreams and the nightly real-upstream job?

`proxy-cache.md` settled the preconfigured, enabled-by-default upstreams as npm, PyPI and
Docker Hub, with the nightly real-upstream job covering exactly the preconfigured set. This
format's proxied path therefore ships with no preconfigured upstream and no scheduled run
against the real galaxy.ansible.com - for the ecosystem that is this project's origin and the
one place hosting alone is differentiating.

**Recommendation:** A - add galaxy.ansible.com as a fourth preconfigured upstream, amending
`proxy-cache.md`'s resolved preconfigured-upstreams decision through its own revision
mechanism, and the nightly job gains the row when this format ships. The
works-in-thirty-seconds argument that settled the trio applies with extra force to the format
users would come here for specifically.

| Option | You get | It costs |
|---|---|---|
| **A. Preconfigure galaxy.ansible.com; nightly job covers it once the format ships** | The origin-story format works out of the box as a cache; real-upstream drift in the Galaxy API is caught by the scheduled job rather than by a user | A sibling's resolved decision reopens; galaxy.ansible.com's rate limits and auth quirks join the standing support surface |
| **B. Keep the trio; Galaxy upstreams are user-configured** | The settled decision stands untouched | The format the project exists for has a worse first-run story than npm, and no scheduled run ever exercises the real upstream this spec's proxied path was written against |

**Why this is yours:** it amends a decision you already made in a sibling spec, and ranking
this format's first-run experience against the standing support surface is a product call.

### Q5: Is version deletion served at all, and through what surface?

Galaxy NG serves DELETE on collections and collection versions; `ansible-galaxy` has no delete
command, so there is no real-client oracle for it. The shared model has already priced hosted
deletes (a delete is a snapshot-creating completed write, and space returns through retention
pruning), and `formats/oci.md` includes deletes because OCI's official suite tests them. As
this spec stands, a private registry has no way to remove a bad upload except rollback.

**Recommendation:** B - serve the two Galaxy NG DELETE endpoints, policed by integration tests
plus the settled snapshot machinery, and record them in the deliberately-unimplemented section
as protocol-observable-but-not-client-oracled. The alternative leaves content management to a
registry-wide management surface no spec has yet defined.

| Option | You get | It costs |
|---|---|---|
| **A. No delete surface in v1; recorded as deliberately unimplemented; deletion waits for the registry's own management surface** | Nothing ships without a real-client oracle; the conformance-first principle stays clean | The management surface it defers to does not exist in any spec, so "remove that upload" has no answer at launch beyond repointing snapshots |
| **B. Serve Galaxy NG's DELETE endpoints, integration-tested** | Content management exists at launch through the API a Galaxy NG migrant already scripts against; the write-boundary declaration extends naturally (a delete is one completed write) | The first endpoints in this format verified without the real client as oracle - a named, deliberate exception to the oracle principle rather than a silent one |

**Why this is yours:** it trades the real-client-oracle principle against a content-management
hole, and whichever way it goes the exception or the gap must be recorded by name.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-25 | 331ef25 | first review (never previously interrogated): protocol grounding by running the real client this pass (ansible-galaxy from ansible-core 2.18.18rc1 against a local logging server, live galaxy.ansible.com probes, and the client source on disk) + adversarial + cross-spec (format-handler-interface's pinned method set, URL-shape record and definition of done; data-model's write-boundary obligation and no-handler-owns-a-table rule; proxy-cache's classification, integrity and preconfigured-upstream decisions; auth's client table and repository-scoped model; conformance-harness's setup vocabulary, stand-in rule and authoritative-reference resolution; supply-chain-policy Q6; catalogue Q4 and charter Q1) + constitution + go-spec-reviewer. Claim verification against code vacuous pre-implementation: the tree holds only a stub `cmd/stackweaver-registry/main.go`, no `internal/` or `conformance/` exists, so protocol claims were verified against captured traffic instead of a tree. Independent: this reviewer authored none of the spec's prior content | The premise survived its refute-check (Forgejo's package docs, re-read this pass, list 24 types with no Ansible), but the draft understated its own protocol and missed sibling obligations. Wire contract pinned from capture: the auth header is `Authorization: Token <token>` on every request including discovery, correcting `foundation/auth.md`'s "Bearer or Basic" guess (synced there as a cross-spec row); the client rebuilds the import-poll URL from its own configured base plus the last path segment of the publish response's task URI, fixing where the endpoint must live; the poll contract (404 while queued, `finished_at`, `state: failed` with `error.code`/`error.description`, `messages[]`) recorded; the format-first mount verified by a real run, joining the URL-shape record's client evidence; the per-file digest claim corrected (`FILES.json` carries them, `MANIFEST.json` anchors `FILES.json` by digest). The proxied path had one AC and no design: classification declaration (metadata mutable under TTL, artifacts immutable), `download_url` rewriting (without which the cache never sees the artifact bytes) and the integrity digest added. The write-boundary declaration `data-model.md` makes a review item was absent and is now stated: one successful import task, one snapshot. Definition-of-done gaps closed: two pinned client versions (AC2), replay corpus (AC7), failed-import contract (AC8), and the deliberately-unimplemented recording added; AC6 corrected off "public Galaxy", since the main suite runs against stand-ins. Raised Q1 (the import-task record has no home in a model with no async-operation entity, the exact class the interface spec deferred to its re-open), Q2 (namespaces versus repository-scoped auth, touching open auth Q13/Q16), Q3 (signatures: serving has a client oracle, attachment has none, and supply-chain-policy Q6 owns the producer), Q4 (whether galaxy.ansible.com joins the preconfigured upstreams, amending a resolved proxy-cache decision), Q5 (deletion has no client oracle; the OCI precedent cuts the other way). Stays draft on Q1-Q5. |
