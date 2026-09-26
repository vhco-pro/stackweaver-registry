---
status: draft
status_description: "2026-09-26 at 0dbca1f: Q1-Q5 adopted under the owner's standing delegation and folded, and Q6-Q8 raised and adopted in the same pass. Synchronous import validation with the task record in a shared Operation entity data-model.md must gain (AC9); namespaces as a name segment isolated by auth pattern scopes (AC10); empty hosted signatures, proxied ones passed through, producer the to-be-authored artifact-verification.md (AC11); version deletion through the to-be-authored management-api.md with versions retired forever (AC12); galaxy.ansible.com preconfigured (AC13). Now Tier 1 at charter step 6a. No open questions; stays draft pending a gate review."
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

Sequencing: this format is **Tier 1**, third in build order after npm and PyPI. The catalogue
promoted it from Tier 3 on 2026-09-26 (its resolved tier-gate decision, was Q4), which keeps the
early slot the charter had already given it without making the tier gate ceremonial, and the
charter places it at build step 6a, immediately after the shared asynchronous-operation
subsystem it is the first client-visible consumer of (its resolved decision on extending the
phases past PyPI, was Q1).

## Blocking preconditions

Four gates hold before the phase that needs them, each recorded here as well as in the sibling
that owns it, because a contract enforced on one side only is enforced nowhere:

- **The handler-interface re-open, before any handler work.** As a Tier 1 format this one is
  bound by `format-handler-interface.md` AC8 independently of npm and PyPI, and in practice it
  follows both. The re-open's evidence includes the write-triggered services prototype, whose
  asynchronous half is built on a Galaxy-shaped publish-and-poll
  (`foundation/write-triggered-services-prototype.md`), so the interface this handler is built
  against was re-opened with this format's hardest mechanism in view.
- **The shared model's `Operation` entity, before Phase 1.** The import-task record lives in a
  first-class asynchronous-operation entity `data-model.md` does not yet have (Design, "Import
  tasks"). No handler owns a table, so Phase 1 cannot store a task record until the entity
  exists; the charter builds its production form as the asynchronous-operation subsystem at
  step 6a, immediately before this handler.
- **The preconfigured-upstreams amendment to `proxy-cache.md`, before Phase 2 ships.**
  galaxy.ansible.com joins the preconfigured, enabled-by-default upstreams and the nightly
  real-upstream job (Design, "The proxied path"), which revises a decision that spec settled.
- **`docs/internal/plans/foundation/management-api.md` (to be authored in the spec loop),
  before Phase 3.** Version and collection deletion are registry-owned management endpoints
  whose shape, authorization and write accounting that spec owns; AC12 is untestable until the
  surface exists.

## Scope

**In scope:** Galaxy v3 version discovery (the available-versions document served at the
configured base URL), collection detail, version list and version detail, versioned artifact
download, multipart publish with the asynchronous import-task status endpoint the client polls
(validated synchronously in v1, the task record kept in the shared `Operation` entity; Design,
"Import tasks"), refusal of a duplicate or retired version, token authentication in the
`Authorization: Token <token>` header form the client sends (Design, "The wire contract"),
namespaces as a name segment with per-namespace rights through the central authorizer's pattern
scopes (Design, "Namespaces"), an empty `signatures` list on hosted versions and the upstream's
list passed through on proxied ones (Design, "Signatures"), version and collection deletion
through the registry-owned management API (Design, "The management surface"), and the proxied
path: pull-through caching of an upstream Galaxy server with `download_url` rewriting, with
galaxy.ansible.com preconfigured and enabled by default (Design, "The proxied path").

**Out of scope:**

- Roles. They use the older v1 API, and their content is fetched from the role's source
  repository archive rather than from a registry-published artifact - a different feature
  wearing the same name.
- Write-through publishing to an upstream. `proxy-cache.md` rules it out for every format.
- Signature attachment, production and server-side verification. They belong to the shared
  producer `docs/internal/plans/foundation/artifact-verification.md` (to be authored in the
  spec loop), per the verification-ownership decision adopted in `supply-chain-policy.md`;
  building an attachment surface here would pre-empt it. Excluded on evidence sequencing, not
  effort.
- Namespace objects with their own ownership records. Namespace isolation comes from the
  settled authorization model, never from a second vocabulary (Design, "Namespaces").
- Galaxy NG's own management routes (namespace CRUD, its collection and version `DELETE`
  routes). No client this spec tests drives them, and the registry-owned management API is the
  one management surface (Design, "The management surface").

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

**A version that already exists, or ever existed, is refused.** The artifact is immutable in
this ecosystem: the version detail declares its sha256, and this registry's own proxy layer
caches artifacts forever on that assumption. So a publish of a version that is live, or that was
deleted through the management surface, ends its import task `state: failed` with an error
naming the reason, and nothing is written. Deleted versions sit in the collection's
**retirement set**, held in the package-level metadata document, carried forward by every later
write because writes build on the newest snapshot, and surviving deletion of the collection's
last version: a collection with no live versions is served as absent but still refuses its
retired versions. The rule is about the coordinate, not the bytes, so an identical re-publish is
refused too.

### Where the write boundary falls

Per `data-model.md`, each handler's spec declares its ecosystem's write boundaries, and the
declaration is a review item. For this format: **one successful import task is one completed
logical write and produces exactly one snapshot**; a failed import produces nothing. The
import-task record itself is not repository content and never enters a snapshot's content set:
it lives in the shared `Operation` entity (Design, "Import tasks"). A version or whole-collection
deletion through the management surface is one completed write however many versions it
removes, and records every removed version in the retirement set within that same write.

### Import tasks

The wire is asynchronous (publish, receive a task URI, poll), but **v1 validates synchronously
inside the publish request**: the tarball read and both digest chains run before the POST
answers, the version is committed (or the failure recorded) in that window, and the task record
is terminal by the time the response carries its URI. The client's first poll therefore finds
`finished_at` set, which honours the poll contract trivially. The accepted cost is that a very
large artifact holds the POST open for its validation.

The record lives in a first-class **`Operation` entity in the shared model**, which
`data-model.md` gains for this format and for the write-triggered services prototype's
asynchronous half (the resolved import-task-record decision below). The prototype exercises it
first, the step 4a re-open confirms or revises its shape on that evidence, and the charter's
step 6a builds its production form before this handler. The properties this spec relies on,
and therefore requires of that entity whatever the re-open changes:

- It is **not repository content**: never in a snapshot delta, untouched by repointing or
  rollback, and never a reason for a write to create a snapshot. A failed import writes an
  `Operation` and no snapshot.
- It carries a format-opaque **result document** the handler writes and the core never parses;
  Galaxy's is the poll response's `state`, `error.code`, `error.description` and `messages[]`.
- Its **terminal transition commits atomically with the snapshot** a successful import creates,
  so there is never a snapshot whose operation reads unfinished, or a finished operation whose
  snapshot is missing.
- Its identifier is the wire task id, generated unguessably, and it is **pruned after a bounded,
  configurable retention window** after finishing; a poll for a pruned or unknown task answers
  404, which the client already reads as "not yet".
- Reading it requires the authorization the write needed (Design, "Namespaces", for the object
  the poll reports), so a task id is not a side channel into another principal's publish.

Synchronous validation is a v1 choice, not a wire commitment. The write-triggered services
prototype builds a genuinely deferred import on the same entity before the interface re-open
(`foundation/write-triggered-services-prototype.md`); if its finding shows deferral is
expressible and worth having for large artifacts, this format can move to it with **no wire
change and no schema change**, because the client polls either way and the record's home is the
same.

### Namespaces

A namespace is a **segment of the collection's name**, stored as `namespace.name`, and v1 has no
namespace objects. The client never touches namespace endpoints during install or publish, so the
wire needs nothing beyond the `{namespace}/{name}` URL grammar, and publishing into a namespace
nobody has created before simply succeeds, where Galaxy NG would demand the namespace exist
first.

Isolation comes from the settled authorization model, never from a second vocabulary. A grant
without a pattern covers every namespace in the repository; a grant narrowed by the central
authorizer's pattern scopes (`auth.md`, "Pattern scopes") covers the namespaces its pattern
matches. For that, this handler reports the addressed object `auth.md` requires of every format,
in canonical form with `/` as the separator the pattern grammar uses:

| Route | Object kind | Canonical object |
|---|---|---|
| Discovery | none | - |
| Collection detail, version list | named | `{namespace}/{name}` |
| Version detail, artifact download | named | `{namespace}/{name}/{version}` |
| Publish | named | `{namespace}/{name}/{version}`, taken from the multipart file part's declared filename, which precedes the artifact bytes; validation refuses an artifact whose `collection_info` disagrees with it, so the pattern cannot be evaded by a mislabelled part |
| Import poll | named | the object of the publish the task records; an unknown task reports none and answers 404 |

So a token scoped `(repository, push, alpha/**)` publishes and polls any collection in namespace
`alpha` and is refused in `beta`. Teams needing harder isolation still have what the model has
always given them: separate repositories.

### Signatures

The version detail's `signatures` list has a real-client oracle for **serving**: `ansible-galaxy`
verifies the entries against a GnuPG keyring when told to require valid signatures. It has none
for **attaching**, since the client cannot upload one. So v1:

- **Hosted versions serve `signatures: []`**, always. Unsigned collections are the ecosystem's
  default posture, and a client that requires a valid signature refuses the install, which is
  the honest outcome. No signing, no attachment surface, no signing key.
- **Proxied versions pass the upstream's `signatures` list through unchanged**, as the proxied
  path passes every other field of the version detail. The entries are the upstream's claims,
  verified by the client against its own keyring; this registry neither verifies them nor
  strips them, and since the artifact bytes are digest-verified against the upstream's declared
  sha256, a signature valid upstream stays valid through the cache.

The signed-collection story for hosted content lands with the shared producer
`docs/internal/plans/foundation/artifact-verification.md` (to be authored in the spec loop). The
requirements this format places on it are recorded in the resolved signatures decision below, so
the gap cannot be lost.

### The management surface

A management operation has a **trigger** (the call that changes state) and an **effect** (what a
resolving client then sees), and the oracle's reach over them differs
(`docs/internal/analysis/management-surfaces-and-the-oracle.md`). `ansible-galaxy collection`
offers download, init, build, publish, install and list and nothing else, so no client triggers
a deletion; the effect, an install that no longer resolves, is fully client-observable.

This spec follows the precedent shared by the Cluster 5 format specs (`pypi.md`, `npm.md` and
this one), whose common home is `docs/internal/plans/foundation/management-api.md` (to be
authored in the spec loop):

- **The surface is registry-owned, not Galaxy NG-shaped.** Deletion is an endpoint of the one
  management API that spec defines. Galaxy NG's own `DELETE` routes are not served: they live
  under the distribution-based route style this server deliberately does not serve (Design,
  "The wire contract"), and serving them would make this the one format answering the
  management question its own way. This spec defines what each operation means and what the
  client sees afterwards; the shared spec defines URL shape, request form, authorization and
  audit.
- **Each operation is a completed logical write through the shared write path**: exactly one
  snapshot per operation, none for a refused one, and no blob-store object deleted directly,
  so space returns only through retention pruning and the single-deleter boundary in
  `storage-and-gc.md` holds unchanged.
- **Authorization uses the settled `(repository, action)` vocabulary with no new action.**
  Deletion is removal-class and requires `delete`, evaluated against the object table above,
  so a pattern-scoped grant deletes only inside its namespaces.
- **Hosted only.** A proxied repository creates no snapshots and takes its removals from the
  upstream per the settled removal table, so a deletion against one is refused.
- **Verification is split the way the oracle's reach is split, and the exception is named.**
  The trigger is verified by this registry's integration tests against the management endpoint
  and by nothing else; these are the first operations in this format with no real-client
  oracle for their trigger, and that is a deliberate, recorded exception rather than a silent
  one. The effect is verified by a real `ansible-galaxy collection install` in a conformance
  case whose `script` calls the management endpoint as any HTTP client would and then runs the
  client; `setup` never calls a management endpoint, per the harness's resolved decision on how
  `setup` is applied, so a case wanting only the effect seeds the post-deletion state through
  its `state` key instead.

| Operation | Effect a client sees | Write |
|---|---|---|
| Delete a collection version | The version leaves the version list and detail, and installing it fails; it joins the retirement set | One write |
| Delete a collection | Every version leaves, the collection detail answers 404, and installing any version fails; every removed version joins the retirement set | One write, however many versions |

### The proxied path

The upstream is another Galaxy v3 server - galaxy.ansible.com or a private one.
**galaxy.ansible.com ships preconfigured and enabled by default**, as the fourth preconfigured
upstream beside npm, PyPI and Docker Hub, and the nightly real-upstream job runs this format's
proxied suite against it once the format ships. The works-in-thirty-seconds argument that
settled the original three in `proxy-cache.md` applies with extra force to the ecosystem this
project exists for, and without a scheduled run nothing would ever exercise the real upstream
this path is written against. That revises `proxy-cache.md`'s settled preconfigured-upstreams
decision through its own revision mechanism (Blocking preconditions), and its accepted cost is
the same one that decision priced: galaxy.ansible.com's rate limits, authentication changes and
quirks join the standing support surface. The handler classifies responses under
`proxy-cache.md`'s governing distinction, which the proxy layer never guesses: collection
detail, version lists and version detail are **mutable metadata** under TTL revalidation, and
artifacts are **immutable**, cached indefinitely and keyed by digest. The sha256 the version
metadata declares for the artifact is the integrity digest for the proxy layer's
stream-and-verify.

On the way back, the handler rewrites the version detail's absolute `download_url` to point at
this registry - the same transform `format-handler-interface.md` names for npm packument URLs.
Without the rewrite every proxied install fetches the artifact, which is nearly all of the
bytes, directly from the upstream and the cache never sees it. The version detail's
`signatures` list is **not** rewritten or stripped: it passes through as the upstream served it
(Design, "Signatures"). Publish, the import-task endpoints and the management operations are
hosted-only.

### What the real client cannot oracle, recorded

Per item 4 of the definition of done in `format-handler-interface.md`, the parts of the Galaxy
surface deliberately unimplemented or not client-testable:

- The bare collection list (`GET /v3/collections/` with no namespace) is served by Galaxy NG
  but never requested by `ansible-galaxy`. If it is implemented for the UI later, it is
  integration-tested, not conformance material.
- Galaxy NG's namespace CRUD endpoints and its own version `DELETE` routes have no
  `ansible-galaxy` oracle, and neither is served: namespaces are a name segment (Design,
  "Namespaces") and deletion is the registry-owned management operation (Design, "The
  management surface").
- The **trigger** of that deletion has no client oracle either; it is verified by integration
  tests against the management endpoint, while its effect is a real-client conformance case
  (AC12). This is the format's one named exception to the real-client-oracle principle.
- Signature **serving** has a real-client oracle (`ansible-galaxy` verifies the signatures
  list against a GnuPG keyring when configured to require it), and AC11 uses it on both paths;
  signature **attachment** has none, because the client cannot upload one, and is not built
  (Design, "Signatures").
- Whether an import was really deferred is invisible to the client, which polls the same way
  either way. v1 does not defer; the prototype that does verifies its deferral by integration
  test, not by the client.

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
- [ ] AC9: A publish's import task is terminal before the publish response returns, so the
      client's first poll finds `finished_at` set; the task record is held in the shared
      `Operation` entity and appears in no snapshot's content set; a failed import creates an
      `Operation` and no snapshot, while a successful one creates exactly one snapshot committed
      atomically with the task's terminal state; and a poll for a task pruned after its
      retention window, or for an unknown id, answers 404.
- [ ] AC10: A principal holding unpatterned `push` on a repository publishes `alpha.tools` and
      `beta.tools` into it with neither namespace created beforehand, and the two install as
      distinct collections; a token scoped to `pull` and `push` under the pattern `alpha/**`
      publishes, polls and installs `alpha.tools` and is refused publishing `beta.tools`, the
      refused publish creating no snapshot.
- [ ] AC11: A hosted version detail serves `signatures: []` and an `ansible-galaxy collection
      install` requiring one valid signature refuses it; on the proxied path an upstream
      version carrying a signature is served with its `signatures` entries unchanged, and the
      same signature-requiring install, with the upstream's public key in the client keyring,
      succeeds through this registry.
- [ ] AC12: A version deleted through the registry-owned management API leaves the version list
      and detail and no longer installs through the real client, a whole-collection deletion
      does the same for every version in exactly one snapshot, a principal without `delete` is
      refused with no snapshot created, and a deletion against a proxied repository is refused;
      a publish of a live version, or of a deleted one with the same or different bytes, ends
      its import task `state: failed` naming the reason with nothing written, including after
      the deletion's snapshot has been pruned and after the collection's last version is gone.
- [ ] AC13: A fresh installation carries galaxy.ansible.com as an enabled Galaxy upstream with no
      operator configuration, a proxied install through that preconfigured upstream succeeds
      with the upstream swapped for a stand-in as the harness requires, and the nightly
      real-upstream job runs this format's proxied suite against the real galaxy.ansible.com.

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
| AC9 | conformance + integration | `conformance/ansible/publish_test.go` (transcript: the first poll already carries `finished_at`); `internal/format/ansible/import_task_test.go` (snapshot counts for success and failure, the record absent from every snapshot's content set, atomic terminal transition under an injected fault, pruning and unknown-id 404 under an injected clock) |
| AC10 | conformance + integration | `conformance/ansible/namespace_test.go` (unseen namespaces, and the `alpha/**` token's publish, poll, install and refusal); `internal/format/ansible/scope_object_test.go` (the object table, per route) |
| AC11 | conformance | `conformance/ansible/signatures_test.go` (hosted refusal under a signature requirement; a fixture stand-in upstream serving a collection signed with a fixture GnuPG key, which the `script` imports into the client keyring) |
| AC12 | integration + conformance | trigger: `internal/format/ansible/manage_delete_test.go` (snapshot count per operation, `delete` refusal, proxied refusal, retired-version refusal after pruning under an injected clock and after last-version deletion); effect: `conformance/ansible/delete_test.go` (the `script` deletes through the management endpoint, then the real client's install fails and a real republish is refused through the import task) |
| AC13 | integration + conformance + ci | `internal/format/ansible/preconfigured_test.go` (fresh-install upstream set); `conformance/ansible/proxied_test.go` (preconfigured-upstream case against the stand-in); the nightly real-upstream workflow `proxy-cache.md` AC15 defines, with this format's row |

The case set stays inside the harness's closed `setup` vocabulary: `credentials` carries AC10's
pattern-scoped token (the token scope of `auth.md`, patterns included), `upstreams` carries
AC11's signed stand-in as a fixture server, and `state` can seed a post-deletion collection
with its retirement set carried verbatim in the package-level document. AC12's deletion is
called from the case's `script`, since `setup` never calls a management endpoint, and AC11's
client keyring is imported by the `script` inside the client container.
The runner-enforced obligations - both modes, unauthenticated and unauthorized cases in each -
apply from the sibling specs and are not restated per criterion here.

## Implementation Phases

### Phase 1: Hosted path
- Waits on the shared `Operation` entity (Blocking preconditions)
- Discovery, collection and version endpoints, artifact download, multipart publish with
  synchronous import-task validation and the task record in the `Operation` entity, duplicate
  and retired version refusal, token auth, the per-route addressed-object table, `signatures: []`
  on hosted versions

### Phase 2: Proxied path
- Response classification, `download_url` rewriting, signature pass-through, cache and offline
  behaviour through the shared proxy layer, galaxy.ansible.com as a preconfigured upstream and
  its nightly row (after the `proxy-cache.md` amendment)

### Phase 3: Management surface
- Waits on `docs/internal/plans/foundation/management-api.md` reaching `planned`
- Version and collection deletion through the registry-owned management API, the retirement
  set, the trigger's integration tests and the effect's conformance cases

Charter sequencing places this after the post-OCI interface re-open. The import-task mechanism
does not ride that re-open: v1 validates synchronously on the shared `Operation` entity, and the
write-triggered services prototype's asynchronous half decides only whether deferral is offered
later, which changes neither wire nor schema.

## Tasks

Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. The 2026-09-25 first review raised Q1 through Q5; folding them on 2026-09-26 exposed
Q6 through Q8. All eight were adopted on 2026-09-26 under the owner's standing delegation and
folded through Scope, the blocking preconditions, Design, the criteria (AC9 to AC13), the Test
Plan and the Phases. The records below keep each question's framing, options and reasoning, so
an owner reversing an adoption has the whole trade in front of them.

### Resolved: import-task handling (was Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A for its mechanism:
validation runs synchronously inside the publish request, the task is terminal before the
client's first poll, and the outcome is fed to the interface re-open as evidence beside the
write-triggered services prototype (Design, "Import tasks"; AC9).

A's **storage** half did not survive folding and was re-decided as Q6 below: the
repository-level metadata document is snapshot content under the settled model, so storing task
records there would make every import, failed ones included, a snapshot-creating write, and
would let rollback rewind task history. The record lives in a shared `Operation` entity
instead.

Accepted cost: a very large artifact holds the POST open for its validation. Why the
alternatives lost: B as framed here (a schema change on one format's account before any
evidence) is superseded, because Q6 adopts the entity with the prototype as its second consumer
and its evidence; C would have left this spec answering A versus B again after the re-open, and
the extended prototype (`foundation/write-triggered-services-prototype.md`, which adopted a
Galaxy-shaped asynchronous half in the same pass) now gives the re-open the async evidence C was
waiting for without making this format wait.

The original question:

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
ranking is the same constitution-level judgment class as `supply-chain-policy.md`'s
component-inventory question.

### Resolved: namespaces (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a namespace is a name
segment (`namespace.name`), v1 has no namespace objects, and per-namespace rights come from the
central authorizer's pattern scopes. Those landed in `auth.md` during the same pass (its
resolved pattern-evaluation and pattern-grammar decisions), so the dependency this answer
anticipated is already met: this spec declares its per-route addressed objects in `/`-separated
canonical form, and a token scoped `alpha/**` is confined to namespace `alpha` (Design,
"Namespaces"; AC10).

Accepted cost: a Galaxy NG migrant expecting namespace ownership records finds repository
grants narrowed by patterns instead, and publishing into an unseen namespace succeeds where
Galaxy NG would refuse it. Why B lost: it invents a second authorization vocabulary beside the
scope model and needs a home for namespace records the shared model does not have.

The original question:

Galaxy addresses a collection as `namespace.name`, and on Galaxy NG a namespace is an owned
object: publishing into one is permissioned per namespace. The client itself never touches
namespace endpoints during install or publish, so the wire needs nothing beyond the
`{namespace}/{name}` URL grammar. But the authorization model this registry has settled is
repository-scoped (`auth.md`): under it, any principal with push on the repository can publish
into **any** namespace in it, and per-namespace rights would need the path-pattern scoping that
was then still open in `auth.md`.

**Recommendation:** A - namespace is a name segment of the package (stored as
`namespace.name`), v1 has no namespace objects, and per-namespace publish rights arrive as a
consumer of `auth.md`'s pattern scoping when that lands, with the dependency recorded
there. Teams needing isolation today get it the way the model already provides: separate
repositories.

| Option | You get | It costs |
|---|---|---|
| **A. Name prefix only; namespace permissions ride `auth.md`'s pattern scoping later** | No new authorization vocabulary; the repository stays the single RBAC unit; nothing to build that the client never asks for | A Galaxy NG migrant expecting namespace ownership finds a repository-wide push grant instead, and multi-team sharing of one repository waits on the pattern-scoping answer |
| **B. First-class namespace records with ownership, enforced centrally** | The isolation model Galaxy NG users arrive expecting, inside one repository | Invents a second authorization vocabulary beside the scope model while `auth.md`'s pattern and grant questions were still open, and needs a home for namespace records the shared model does not have - two sibling questions pre-empted at once |

**Why this is yours:** it decides the product's isolation unit for Ansible users (repository
versus namespace), and option B pre-empts two open questions you have not answered in the spec
that owns them.

### Resolved: collection signatures (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: hosted versions serve an
empty `signatures` list and v1 builds no signing or attachment surface (Design, "Signatures";
AC11). What the proxied path does with an upstream's signatures was a separate call, settled as
Q7 below.

Accepted cost: private-registry users get no signed-collection story for hosted content at
launch, where Galaxy NG has one, and the story stalls if its producer stalls. Why the
alternatives lost: B designs a bespoke attachment surface with no client oracle before the
producer spec exists, and C takes on signing-key management, the most dangerous class of
surface, for a need this spec has not established.

The producer is `docs/internal/plans/foundation/artifact-verification.md` (to be authored in
the spec loop), per the verification-ownership decision adopted in `supply-chain-policy.md`.
What this format requires of it, recorded so the dependency cannot be lost:

- A decision on how hosted collections acquire signatures: attached by users (store-and-serve,
  with or without server-side verification against a configured keyring) or produced
  server-side (which brings signing-key generation, storage and rotation).
- If attachment, the attachment surface is a management operation with no client trigger, so
  it is an endpoint of `docs/internal/plans/foundation/management-api.md`, never a
  Galaxy-specific route.
- The served entry shape, grounded in captured Galaxy traffic before it is specified: the
  signature text, the signing key's fingerprint and the signing service, and the object the
  client verifies a signature against.
- A position on proxied signatures, which this spec passes through unverified (Q7): whether the
  producer verifies them, and what the registry does with one that fails.
- A criterion shape for this spec's revision: hosted versions then serve signatures that a real
  `ansible-galaxy` requiring valid signatures accepts, and one tampered signature it refuses,
  with AC11 rewritten accordingly.
- A verdict the policy engine can consume as the signature-state input `supply-chain-policy.md`
  names.

The original question:

The client has first-class signature support: the version detail carries a `signatures` list,
and `ansible-galaxy` verifies them against a GnuPG keyring when configured to require valid
signatures. Serving signatures therefore has a real-client oracle. Attaching them does not -
the client cannot upload a signature, so an attachment surface would be API-only - and no spec
owned signature production or verification when this was raised: `supply-chain-policy.md` was
deciding exactly who owns that, and its precedent is that an AC against an unspecced producer is
untestable.

**Recommendation:** A - v1 serves an empty `signatures` list and builds no signing or
attachment surface; the signature story lands with the producer spec `supply-chain-policy.md`
recommends, and this spec records the outbound dependency so the gap cannot be lost. This is
evidence sequencing, not effort: building an attachment surface now would pre-empt the sibling
question that owns verification.

| Option | You get | It costs |
|---|---|---|
| **A. Empty `signatures` in v1; the producer spec owns the feature** | No pre-emption of an open sibling question; the client works fine, since unsigned collections are the default posture | Private-registry users get no signed-collection story at launch, and Galaxy NG has one; if the producer stalls, so does this |
| **B. Store-and-serve: an API surface accepts detached signatures and the version detail serves them; verification stays client-side against the keyring** | The signed-collection story ships without the server touching a key; the serving half is conformance-testable with the real client requiring valid signatures | The attachment half has no client oracle and becomes a bespoke API surface designed before the owner has decided who owns signature state |
| **C. Server-side signing, Galaxy NG style** | Signatures exist without any user workflow | The registry takes on signing-key management - generation, storage, rotation - which `auth.md`'s nothing-is-invented posture treats as the most dangerous class of surface, for a format question that has not established the need |

**Why this is yours:** it sequences a security feature against the verification-ownership
decision, and it decides whether this format launches with or without the one supply-chain
feature its main competitor ships.

### Resolved: galaxy.ansible.com as a preconfigured upstream (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: galaxy.ansible.com ships
preconfigured and enabled as the fourth preconfigured upstream, and the nightly real-upstream
job gains this format's row when the format ships (Design, "The proxied path"; AC13). The
amendment to `proxy-cache.md`'s settled preconfigured-upstreams decision goes through that
spec's own revision mechanism; it is recorded here as a blocking precondition of Phase 2 and was
not made from this spec.

Accepted cost: a sibling's settled decision reopens, and galaxy.ansible.com's rate limits and
authentication quirks join the standing support surface. Why B lost: the format the project
exists for would have a worse first-run story than npm, and no scheduled run would ever exercise
the real upstream this spec's proxied path was written against.

The original question:

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

### Resolved: version deletion (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B for its decision:
version deletion is served in v1, its trigger policed by integration tests and the settled
snapshot machinery, and the missing client oracle for the trigger recorded by name as a
deliberate exception (Design, "The management surface" and "What the real client cannot
oracle"; AC12). Whole-collection deletion comes with it as one write.

The **surface** is re-homed for consistency with the other Cluster 5 answers: deletion is an
endpoint of the registry-owned management API homed in
`docs/internal/plans/foundation/management-api.md` (to be authored in the spec loop), not
Galaxy NG's own `DELETE` routes. That is the shape `pypi.md` and `npm.md` adopted in the same
pass, and the reason is the one `docs/internal/analysis/management-surfaces-and-the-oracle.md`
gives against per-format endpoints: four specs answering one question four ways, each a new
deletion path and a new grant. Folding this answer also exposed whether a deleted version may be
re-published, settled as Q8 below.

Accepted cost: the first operations in this format verified without the real client as oracle
for their trigger, and a Galaxy NG migrant's existing deletion scripts do not work unchanged
against this registry. Why A lost: the management surface it deferred to did not exist in any
spec, so "remove that upload" had no answer at launch beyond repointing snapshots; the shared
spec now exists as a named dependency instead of a hope.

The original question:

Galaxy NG serves DELETE on collections and collection versions; `ansible-galaxy` has no delete
command, so there is no real-client oracle for it. The shared model has already priced hosted
deletes (a delete is a snapshot-creating completed write, and space returns through retention
pruning), and `formats/oci.md` includes deletes because OCI's official suite tests them. As
this spec stood, a private registry had no way to remove a bad upload except rollback.

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

### Resolved: where the import-task record lives (was Q6)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: a first-class,
format-agnostic `Operation` entity in the shared model, outside snapshot content, pruned after a
bounded window (Design, "Import tasks"; AC9; a blocking precondition of Phase 1). The entity
belongs to `data-model.md`, which this spec does not edit; the exact requirement is carried to
it as a sibling consequence.

The question as raised: Q1's recommendation put the finished task record in the
repository-level metadata document. Folding it against the settled model found that document is
snapshot content, captured in every delta and restored by repointing, and that a metadata-only
mutation is a snapshot-creating write. A task record written there therefore makes a failed
import create a snapshot, contradicting this spec's own write-boundary declaration and
`data-model.md` AC9, puts non-content into every snapshot, and lets a rollback rewind task
history. The home had to be chosen again.

**Recommendation:** B - the entity. It is the only home that keeps the task out of snapshots
without a handler-owned table, and the objection that once priced it ("one format's account,
before any evidence") no longer holds: the write-triggered services prototype adopted an
asynchronous half in the same pass, which is a second consumer and the evidence.

| Option | You get | It costs |
|---|---|---|
| **A. The repository-level metadata document (Q1's original home)** | No schema change | A failed import creates a snapshot, every snapshot carries task logs, rollback rewinds task history, and concurrent publishes contend on one revision token - a contradiction of two settled rules, not a trade |
| **B. A first-class `Operation` entity in `data-model.md`, not snapshot content, pruned after a bounded window** | A home the prototype's deferred imports and any later asynchronous format reuse; snapshots stay pure content; the terminal transition can commit atomically with the snapshot | A shared-model amendment through that spec's revision mechanism before this format is built, and an entity whose shape is then tested by the prototype rather than designed from two shipped formats |
| **C. Stateless: encode the terminal outcome in the task id itself** | No storage at all for synchronous imports | Error messages ride in a URL, the id must be signed to stop forgery, and it cannot express a task that is not yet finished, so it answers v1 and is useless to the prototype and every later asynchronous format |

**Why this is yours:** it amends the shared model on a format spec's evidence, which the
constitution treats as a spec change rather than a handler's licence.

Accepted cost: B's row. Why A lost: it is not a cost but a contradiction of settled rules. Why C
lost: it solves only the synchronous case and has to be replaced the moment anything defers.

### Resolved: proxied signatures (was Q7)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: on the proxied path the
upstream's `signatures` list passes through unchanged, neither verified nor stripped (Design,
"Signatures" and "The proxied path"; AC11).

The question as raised: Q3's answer serves an empty list on hosted versions, and it was silent
on proxied ones, whose upstream (a Galaxy NG or Automation Hub instance, for example) may sign
its collections. Either the proxy relays the upstream's entries or it blanks them.

**Recommendation:** A - pass through. The entries are the upstream's claims, verified by the
client against its own keyring, and the artifact bytes are digest-verified against the
upstream's declared sha256, so a signature valid upstream stays valid through the cache;
stripping would break every client that requires signatures from a signed upstream, for no
security gain.

| Option | You get | It costs |
|---|---|---|
| **A. Pass the upstream's `signatures` through unchanged** | Signature-requiring clients work through the cache exactly as against the upstream; the proxy stays a faithful relay of metadata | This registry relays security claims it has not verified, and an upstream serving a bad signature reaches the client, which is where verification happens anyway |
| **B. Serve `signatures: []` on proxied versions too** | One rule on both paths; the registry never relays a claim it did not check | Every client configured to require valid signatures refuses content from a signed upstream through this registry, so the cache breaks the one workflow signatures exist for |

**Why this is yours:** it decides whether the registry relays third-party security claims it
cannot yet verify, a posture a later verification producer inherits.

Accepted cost: A's row; whether the producer later verifies relayed signatures is recorded as
one of its requirements under Q3. Why B lost: it defeats the signature workflow for exactly the
users who configured it.

### Resolved: re-publishing a deleted version (was Q8)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a deleted version is
retired and can never be published again, with the same bytes or different ones, and a live
version's re-publish is refused the same way (Design, "Artifact validation"; AC12).

The question as raised: Q5's answer lets an authorized principal delete a version; the spec did
not say whether the coordinate is then free, nor even that re-publishing a live version is
refused.

**Recommendation:** A - retire. The version detail's sha256, the lockfile-free but
digest-checking client, and this registry's own proxy layer all bind bytes to
`namespace.name:version`, and caching artifacts forever is correct only if a coordinate never
changes bytes. This is the rule `pypi.md` (filenames) and `npm.md` (versions) adopted in the same
pass, so it is one cross-format rule rather than a Galaxy choice.

| Option | You get | It costs |
|---|---|---|
| **A. A version, once published, is retired forever; deletion never frees it** | One set of bytes per coordinate for the life of the repository; downstream caches, including this registry's own proxy of a hosted Galaxy, never disagree with the index | A botched version cannot be fixed in place; the operator publishes a new version |
| **B. Deletion frees the version for re-publishing** | An operator can correct a bad publish under the same version | A proxied-of-hosted cache that saw the old artifact serves it forever against version metadata declaring a different sha256, and every such install then fails verification |

**Why this is yours:** it is a promise about correcting mistakes, bounded by a correctness
property the proxy layer depends on.

Accepted cost: A's row. Why B lost: the failure it produces is silent until a digest check
somewhere downstream fails, far from the deletion that caused it.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-25 | 331ef25 | first review (never previously interrogated): protocol grounding by running the real client this pass (ansible-galaxy from ansible-core 2.18.18rc1 against a local logging server, live galaxy.ansible.com probes, and the client source on disk) + adversarial + cross-spec (format-handler-interface's pinned method set, URL-shape record and definition of done; data-model's write-boundary obligation and no-handler-owns-a-table rule; proxy-cache's classification, integrity and preconfigured-upstream decisions; auth's client table and repository-scoped model; conformance-harness's setup vocabulary, stand-in rule and authoritative-reference resolution; supply-chain-policy Q6; catalogue Q4 and charter Q1) + constitution + go-spec-reviewer. Claim verification against code vacuous pre-implementation: the tree holds only a stub `cmd/stackweaver-registry/main.go`, no `internal/` or `conformance/` exists, so protocol claims were verified against captured traffic instead of a tree. Independent: this reviewer authored none of the spec's prior content | The premise survived its refute-check (Forgejo's package docs, re-read this pass, list 24 types with no Ansible), but the draft understated its own protocol and missed sibling obligations. Wire contract pinned from capture: the auth header is `Authorization: Token <token>` on every request including discovery, correcting `foundation/auth.md`'s "Bearer or Basic" guess (synced there as a cross-spec row); the client rebuilds the import-poll URL from its own configured base plus the last path segment of the publish response's task URI, fixing where the endpoint must live; the poll contract (404 while queued, `finished_at`, `state: failed` with `error.code`/`error.description`, `messages[]`) recorded; the format-first mount verified by a real run, joining the URL-shape record's client evidence; the per-file digest claim corrected (`FILES.json` carries them, `MANIFEST.json` anchors `FILES.json` by digest). The proxied path had one AC and no design: classification declaration (metadata mutable under TTL, artifacts immutable), `download_url` rewriting (without which the cache never sees the artifact bytes) and the integrity digest added. The write-boundary declaration `data-model.md` makes a review item was absent and is now stated: one successful import task, one snapshot. Definition-of-done gaps closed: two pinned client versions (AC2), replay corpus (AC7), failed-import contract (AC8), and the deliberately-unimplemented recording added; AC6 corrected off "public Galaxy", since the main suite runs against stand-ins. Raised Q1 (the import-task record has no home in a model with no async-operation entity, the exact class the interface spec deferred to its re-open), Q2 (namespaces versus repository-scoped auth, touching open auth Q13/Q16), Q3 (signatures: serving has a client oracle, attachment has none, and supply-chain-policy Q6 owns the producer), Q4 (whether galaxy.ansible.com joins the preconfigured upstreams, amending a resolved proxy-cache decision), Q5 (deletion has no client oracle; the OCI precedent cuts the other way). Stays draft on Q1-Q5. |
| 2026-09-26 | 0dbca1f | folding adopted recommendations under the standing delegation | Not a review: adoption and application of this spec's own recommendations, made consistent with the Cluster 5 and Cluster 6 format specs and the prototype. Q1 adopted as A for its mechanism (synchronous validation, terminal before the first poll); folding found its storage half (the repository-level metadata document) contradicts settled rules, since that document is snapshot content and a failed import would create a snapshot, so the home was raised as Q6 in decision shape and adopted as B: a format-agnostic `Operation` entity in `data-model.md`, outside snapshot content, atomic with the snapshot it produces, pruned after a window (new Design section "Import tasks", AC9, a Phase 1 precondition). Q2 adopted as A, and since `auth.md` adopted pattern scopes in the same pass the per-route addressed-object table is declared now and a token scoped `alpha/**` is confined to its namespace (Design "Namespaces", AC10). Q3 adopted as A with the requirements this format places on `docs/internal/plans/foundation/artifact-verification.md` (to be authored) recorded; its silence on proxied signatures raised as Q7 and adopted as A, pass-through (Design "Signatures", AC11). Q4 adopted as A, the `proxy-cache.md` amendment recorded as a Phase 2 precondition for that spec to make (AC13). Q5 adopted as B for its decision, re-homed onto the registry-owned management API in `docs/internal/plans/foundation/management-api.md` (to be authored) instead of Galaxy NG routes, for consistency with pypi and npm (Design "The management surface", AC12, Phase 3); folding it raised Q8, re-publishing a deleted version, adopted as A: retired forever, live duplicates refused too (Artifact validation, AC12). Also: blocking preconditions section added (interface re-open, now binding since the catalogue promoted this format to Tier 1; Operation entity; proxy-cache amendment; management-api.md); sequencing note rewritten to Tier 1 at charter step 6a; sibling citations now resolved (auth pattern scoping and grants, supply-chain-policy component inventory and verification ownership, conformance-harness setup vocabulary) reframed with historical qualifiers; conformance notes aligned with the harness's closed vocabulary and seed path (management triggers called from `script`). Test Plan rows added for AC9 to AC13. Stays draft. |
