---
status: draft
status_description: "Reconciled 2026-09-28 at ddc73fb with the foundation wave (not a review): Q9 raised and adopted under the standing delegation, the import runs deferred as the publish kind on async-operations' runner with the pause-held conformance case (AC9, revising was-Q1); hosted signatures by management-api attach verified per artifact-verification AC9, served in pulp_ansible's shape, proxied ones with a verdict (AC11); deletion as delete-version and delete-package kinds with the core-held Retirement record (AC12); discovery a descriptor (AC10); refusals through WriteRefusal, no OSV ecosystem for Galaxy so advisory rules are uncovered and the binding row is filled by the policy case (AC14); Capabilities with rename and virtual cases (AC15). Earlier: 2026-09-26 at da0aecd, the Operation entity and galaxy.ansible.com preconfigured recorded as met, AC14 added; 2026-09-26 at 0dbca1f, Q1-Q8 adopted and folded. Tier 1 at charter step 6a. No open questions; stays draft pending a gate review."
description: "Spec for the Ansible Galaxy v3 collection format - the single format where free, easy, private hosting does not already exist."
author: michielvha
goal: "Serve the one ecosystem whose only free self-hosted options are heavy enough that practitioners abandon them."
priority: "medium"
issue: 10
created: 2026-09-21
covers:
  - "internal/format/ansible/**"
  - "conformance/ansible/**"
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
charter places it at build step 6a, "the deferred management operation on the async runner,
then Ansible collections": the queue core (`async-operations.md` Phases 1 to 3) lands at the
start of step 4b, its deferred-operation consumer (Phase 4) at 6a, and this format is the first
client-visible consumer of that deferred path (the charter's resolved decision on extending the
phases past PyPI, was Q1; `async-operations.md`'s resolved placement decision, was Q9 there).

## Blocking preconditions

Five gates hold before the phase that needs them, each recorded here as well as in the sibling
that owns it, because a contract enforced on one side only is enforced nowhere:

- **The handler-interface re-open, before any handler work.** As a Tier 1 format this one is
  bound by `format-handler-interface.md` AC8 independently of npm and PyPI, and in practice it
  follows both. The re-open's evidence includes the write-triggered services prototype, whose
  asynchronous half is built on a Galaxy-shaped publish-and-poll
  (`foundation/write-triggered-services-prototype.md`), so the interface this handler is built
  against was re-opened with this format's hardest mechanism in view.
- **The shared model's `Operation` entity and the shared runner's deferred path, before
  Phase 1.** The import-task record lives in the first-class `Operation` entity `data-model.md`
  specifies (its "Operations" section and AC32; Design, "Import tasks" here), and the import
  itself runs as a deferred `publish` operation on `internal/async` (`async-operations.md` AC5;
  `management-api.md` AC16; the resolved deferred-import decision below, was Q9). No handler owns
  a table or a goroutine, so Phase 1 cannot store a task record or run an import until both are
  built; the charter lands the queue core at the start of step 4b and its deferred management
  operation at step 6a, immediately before this handler.
- **The preconfigured-upstreams amendment to `proxy-cache.md`: made.** galaxy.ansible.com joins
  the preconfigured, enabled-by-default upstreams and the nightly real-upstream job (Design,
  "The proxied path") through that spec's resolved preconfigured-set extension (was Q14), with
  its AC15 and AC19 carrying the row and `upstream-adapters.md` holding the profile row (its
  AC24); what remains for Phase 2 is building it.
- **`docs/internal/plans/foundation/management-api.md` reaching `planned`, before Phase 3.**
  Version and collection deletion are the `delete-version` and `delete-package` kinds of that
  spec's closed operation vocabulary and signature attachment is its `attach` kind (its kind
  table and cross-format reconciliation table carry Galaxy's rows); it owns their URL shape,
  authorization and write accounting, and AC11's attachment and AC12 are untestable until the
  surface exists.
- **`docs/internal/plans/foundation/artifact-verification.md` reaching `planned`, before the
  signature half of Phase 3.** The attached signature is verified over the stored
  `MANIFEST.json` against the repository's `openpgp` trust set before it is stored (its AC9,
  its resolved Galaxy-signatures decision, was Q6 there), and the `trust` setup key that seeds
  the keyring lands with that spec (its AC25).

## Scope

**In scope:** Galaxy v3 version discovery (the available-versions document served at the
configured base URL), collection detail, version list and version detail, versioned artifact
download, multipart publish with the asynchronous import-task status endpoint the client polls
(the import a deferred `publish` operation on the shared runner, its record the shared
`Operation` entity; Design, "Import tasks"), refusal of a duplicate or retired version, token
authentication in the `Authorization: Token <token>` header form the client sends (Design, "The
wire contract"), namespaces as a name segment with per-namespace rights through the central
authorizer's pattern scopes (Design, "Namespaces"), hosted signatures attached through the
management API's `attach` kind and verified before storage, with the upstream's list passed
through on proxied ones (Design, "Signatures"), version and collection deletion through the
registry-owned management API (Design, "The management surface"), the proxied path:
pull-through caching of an upstream Galaxy server with `download_url` rewriting, with
galaxy.ansible.com preconfigured and enabled by default (Design, "The proxied path"), the wire
rendering of a shared policy refusal (Design, "Policy refusals on the wire"), and the handler's
`Capabilities()` declaration with repository rename and virtual aggregation (Design,
"Capabilities and lifecycle").

**Out of scope:**

- Roles. They use the older v1 API, and their content is fetched from the role's source
  repository archive rather than from a registry-published artifact - a different feature
  wearing the same name.
- Write-through publishing to an upstream. `proxy-cache.md` rules it out for every format.
- Server-side signature production. `signing-service.md` declined Galaxy server-side signing
  (its resolved Galaxy decision, was Q10 there), so `signing_service` is `null` on every served
  entry and no key exists in this handler; signatures arrive by user attachment, verified by
  `docs/internal/plans/foundation/artifact-verification.md` (its AC9), per the
  verification-ownership decision adopted in `supply-chain-policy.md`. The registry verifying
  what it serves is the whole of its part.
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
naming the reason, and nothing is written. A deleted version is a **core-held `Retirement`
record** (`data-model.md`, its entity table and AC35; `management-api.md`, "Retirement is
core-held", its resolved retirement-placement decision, was Q3), not part of the package-level
document: the handler returns `{namespace}/{name}/{version}` as the coordinate to retire in the
deleting operation's `Outcome`, the core writes the record in that transaction, and the shared
write path refuses any later write claiming the coordinate with `retired` before this handler's
import runs, across a backwards repoint and after every snapshot that held the version has been
pruned, with nothing for the handler to carry forward. The handler renders that refusal in
Galaxy's shape, an import task ending `state: failed` whose `error.description` names the
retired coordinate, because the client reads the poll, never the status of the write. A
collection with no live versions keeps its `Package` row and package-level document
(`data-model.md` AC33), is served as absent, and still refuses its retired versions. The rule is
about the coordinate, not the bytes, so an identical re-publish is refused too.

### Where the write boundary falls

Per `data-model.md`, each handler's spec declares its ecosystem's write boundaries, and the
declaration is a review item. For this format: **one successful import task is one completed
logical write and produces exactly one snapshot**, committed in the runner's `Finish` together
with the task's terminal state; a failed import produces nothing but the failed `Operation`. The
import-task record itself is not repository content and never enters a snapshot's content set:
it lives in the shared `Operation` entity (Design, "Import tasks"). A version or whole-collection
deletion through the management surface is one completed write however many versions it
removes, and the core writes one `Retirement` record per removed version in that same
transaction (`data-model.md` AC35). A signature attachment is one metadata-only write on the
version it joins (Design, "Signatures").

### Import tasks

The wire is asynchronous (publish, receive a task URI, poll), and **the import is genuinely
deferred**: it runs as the `publish` kind declared deferred on the shared runner (the resolved
deferred-import decision below, was Q9; `management-api.md` AC16, `async-operations.md` AC5).
The publish route is a binding onto that operation: it spools the multipart artifact into the
CAS through the shared upload path, reports the addressed object from the file part's declared
filename (Design, "Namespaces"), and `Submit` inserts the `pending` `Operation` and its
`manage.apply` job in one transaction and answers with the task URI. The runner claims the job,
and the handler's `Apply` does the import inside the transaction the core opened: the tarball
read, both digest chains, the agreement of filename, URL and `collection_info`, the duplicate
and retirement refusals, and the version commit. `Finish` commits the snapshot and the
`Operation`'s terminal state together. A large artifact therefore no longer holds the POST open
for its validation; the client polls, as it was built to.

The record lives in the first-class **`Operation` entity in the shared model**, which
`data-model.md` gained for this format and for the write-triggered services prototype's
asynchronous half (the resolved import-task-record decision below; its "Operations" section and
AC32). The prototype's Galaxy-shaped half exercises the deferred path first on this handler's
package (`async-operations.md` names `internal/format/ansible/deferred_crash_test.go` as the
prototype's instance), the step 4a re-open confirms or revises the dispatch shape on that
evidence, and the charter's step 6a builds the production form immediately before this handler.
The properties this spec relies on, each now asserted by the owning spec:

- It is **not repository content**: never in a snapshot delta, untouched by repointing or
  rollback, and never a reason for a write to create a snapshot. A failed import writes an
  `Operation` and no snapshot (`data-model.md` AC32).
- It carries a format-opaque **result document** the handler writes and the core never parses;
  Galaxy's is the poll response's `state`, `error.code`, `error.description` and `messages[]`.
- Its **terminal transition commits atomically with the snapshot** a successful import creates,
  so there is never a snapshot whose operation reads unfinished, or a finished operation whose
  snapshot is missing (`async-operations.md` AC5); a server killed at any fault point leaves the
  operation terminal within a bounded time with the import applied at most once (its AC6), and
  the pending import's artifact blob is protected by the job-held grace until the job is
  terminal (its resolved grace decision, was Q4 there), so a sweep past grace cannot collect it.
- Its identifier is the wire task id, generated unguessably, and it is **pruned after a bounded,
  configurable retention window** after finishing; a poll for a pruned or unknown task answers
  404, which the client already reads as "not yet". While the job is queued or running the poll
  answers the task with `finished_at` null, the other shape the client reads as "not yet".
- Reading it requires the authorization the write needed (Design, "Namespaces", for the object
  the poll reports), so a task id is not a side channel into another principal's publish
  (`management-api.md` AC16's poll rule).
- **The harness holds an import without any test-only code in the server.** The admin pause
  routes of `management-api.md` pause the `manage.apply` kind (`async-operations.md` AC10): a
  case's `script` pauses, publishes, polls once and sees unfinished, resumes, and polls to
  completion, which is how `write-triggered-services-prototype.md` AC8 is satisfied with the
  real client and how AC9 here proves the deferral rather than believing it.

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
| Discovery | descriptor | - (the available-versions document names API versions and nothing the repository holds; `auth.md`'s resolved name-free-document decision, was Q23; `format-handler-interface.md` AC12's sentinel test runs against it) |
| Collection detail, version list | named | `{namespace}/{name}` |
| Version detail, artifact download | named | `{namespace}/{name}/{version}` |
| Publish | named | `{namespace}/{name}/{version}`, taken from the multipart file part's declared filename, which precedes the artifact bytes; validation refuses an artifact whose `collection_info` disagrees with it, so the pattern cannot be evaded by a mislabelled part |
| Import poll | named | the object of the publish the task records; an unknown task reports none and answers 404 |

So a token scoped `(repository, push, alpha/**)` publishes and polls any collection in namespace
`alpha` and is refused in `beta`, and a token holding only a patterned `pull` passes discovery,
which every `ansible-galaxy` command sends first, and installs the collections inside its
pattern; before `auth.md` adopted the descriptor kind this table reported discovery as `none`,
under which AC10's patterned install could not have passed its first request, a latent
contradiction that decision closed (`auth.md`'s own Galaxy consumer bullet still says discovery
reports none; that is a consequence for it). Teams needing harder isolation still have what
the model has always given them: separate repositories.

### Signatures

The version detail's `signatures` list has a real-client oracle for **serving**: `ansible-galaxy`
verifies the entries against a GnuPG keyring when told to require valid signatures. It has none
for **attaching**, since the client cannot upload one. The producer this spec waited for,
`docs/internal/plans/foundation/artifact-verification.md`, answered every requirement the
resolved signatures decision below recorded (its resolved Galaxy-signatures decision, was Q6
there, and its AC9), and this is the result:

- **Hosted versions acquire signatures by user attachment through the management API**: an
  `attach` operation on the version (`management-api.md`'s kind table, `push` on the version)
  carrying a detached OpenPGP signature over the version's stored `MANIFEST.json`. The handler's
  `Apply` runs the coherence check the kind requires through `Deps`' `Verifier`: the signature
  must verify over the exact stored `MANIFEST.json` bytes with a key in the repository's
  `openpgp` trust set, otherwise the attachment is refused `validation` with the reason and
  nothing is stored, because a served signature this registry could not verify is exactly what a
  client that requires valid signatures will act on. A version nobody has signed serves
  `signatures: []`, the ecosystem's default posture, and a client requiring a valid signature
  refuses it, which is the honest outcome. No signing and no signing key in this handler:
  `signing_service` is `null` on every served entry because `signing-service.md` declined
  server-side Galaxy signing (its resolved Galaxy decision, was Q10 there), while keeping the
  same verified `attach` path open should a later producer want it.
- **The served entry shape** is pulp_ansible's, grounded there in Galaxy's real traffic:
  `signatures: [{signature, pubkey_fingerprint, signing_service: null, pulp_created}]`, of which
  `ansible-galaxy` reads `signature` and verifies it against its own keyring.
- **Proxied versions pass the upstream's `signatures` list through unchanged**, as the proxied
  path passes every other field of the version detail (the resolved proxied-signatures decision
  below, was Q7), now **with a verdict**: the same `openpgp` entry verifies each relayed
  signature against the remote's trust set at commit and records the result for
  `supply-chain-policy.md` to consume, without stripping or altering the entry, since the
  artifact bytes are digest-verified against the upstream's declared sha256 and a signature
  valid upstream stays valid through the cache.

### The management surface

A management operation has a **trigger** (the call that changes state) and an **effect** (what a
resolving client then sees), and the oracle's reach over them differs
(`docs/internal/analysis/management-surfaces-and-the-oracle.md`). `ansible-galaxy collection`
offers download, init, build, publish, install and list and nothing else, so no client triggers
a deletion; the effect, an install that no longer resolves, is fully client-observable.

This spec follows the precedent shared by the Cluster 5 format specs (`pypi.md`, `npm.md` and
this one), whose common home is `docs/internal/plans/foundation/management-api.md`, which now
fixes the vocabulary:

- **The surface is registry-owned, not Galaxy NG-shaped.** Each operation is a **kind** of that
  spec's closed vocabulary, and the action follows the kind, never the format (its kind table
  and cross-format reconciliation table carry Galaxy's rows). The handler implements that spec's
  optional `Operator` interface, declaring `publish` (deferred; Design, "Import tasks"),
  `delete-version`, `delete-package` and `attach`, reporting each operation's object through
  `Authorize` (the table above) and applying it inside the write transaction the core opened
  through `Apply`. Galaxy NG's own `DELETE` routes are not served and nothing is a binding except
  the publish route: they live under the distribution-based route style this server deliberately
  does not serve (Design, "The wire contract"), no client in the matrix drives them, and serving
  them would make this the one format answering the management question its own way. This spec
  defines what each operation means and what the client sees afterwards; the shared spec defines
  URL shape, request form, authorization and audit.
- **Each operation is a completed logical write through the shared write path**: exactly one
  snapshot per operation, none for a refused one, and no blob-store object deleted directly,
  so space returns only through retention pruning and the single-deleter boundary in
  `storage-and-gc.md` holds unchanged (`management-api.md` AC5, AC6).
- **Authorization uses the settled `(repository, action)` vocabulary with no new action.**
  Deletion is removal-class and requires `delete`, attachment adds to a version and requires
  `push`, each evaluated against the object table above, so a pattern-scoped grant deletes and
  attaches only inside its namespaces.
- **Hosted only.** A proxied repository creates no snapshots and takes its removals from the
  upstream per the settled removal table, so every operation against one is refused `405` with
  problem type `repository-type` (`management-api.md` AC7).
- **Verification is split the way the oracle's reach is split, and the exception is named.**
  The trigger is verified by this registry's integration tests against the management endpoint
  plus the `script`-driven conformance case `management-api.md` AC24 requires for every declared
  kind, and by nothing else; these are the first operations in this format with no real-client
  oracle for their trigger, and that is a deliberate, recorded exception rather than a silent
  one. The effect is verified by a real `ansible-galaxy collection install` in a conformance
  case whose `script` calls the management endpoint as any HTTP client would and then runs the
  client; `setup` never calls a management endpoint, per the harness's resolved decision on how
  `setup` is applied, so a case wanting only the effect seeds the post-deletion state, including
  its `Retirement` records, through its `state` key instead.

| Operation | Kind | Effect a client sees | Action | Write |
|---|---|---|---|---|
| Delete a collection version | `delete-version` | The version leaves the version list and detail, and installing it fails; its coordinate is retired | `delete` | One write |
| Delete a collection | `delete-package` | Every version leaves, the collection detail answers 404, and installing any version fails; every removed version's coordinate is retired | `delete` | One write, however many versions |
| Attach a signature to a version | `attach` | The version detail's `signatures` list carries the verified entry, and a client requiring one valid signature installs the version (Design, "Signatures") | `push` | One metadata-only write |

### The proxied path

The upstream is another Galaxy v3 server - galaxy.ansible.com or a private one.
**galaxy.ansible.com ships preconfigured and enabled by default**, as the fourth preconfigured
upstream beside npm, PyPI and Docker Hub, and the nightly real-upstream job runs this format's
proxied suite against it once the format ships. The works-in-thirty-seconds argument that
settled the original three in `proxy-cache.md` applies with extra force to the ecosystem this
project exists for, and without a scheduled run nothing would ever exercise the real upstream
this path is written against. `proxy-cache.md` made that revision of its settled
preconfigured-upstreams decision through its own mechanism (its resolved preconfigured-set
extension, was Q14), and its accepted cost is
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

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines, on the
version-detail or artifact-download route of either path, the handler answers `403` with a JSON
error body naming the policy and rule, or naming the signal for a coordinate condemned under the
shared security-signal rule, written through the shared refusal writer `WriteRefusal` in
`internal/format` (`format-handler-interface.md` AC14), which on an HTTP/1.1 connection also
puts the condition into the status line's reason phrase (`supply-chain-policy.md`'s resolved
refusal-status-line decision, was Q10, and its AC18); the body's exact shape follows the error
shape the recorded corpus shows galaxy.ansible.com using for a refused read, since
`ansible-galaxy` renders whatever that server sends. `403` rather than the existence rule's
`404`, because the caller is authorized and the content is what is refused. Whether the client
prints the text, and whether it falls back to another `server_list` entry on the refusal, is
what AC14 captures, and that capture fills this format's `pending` row of
`supply-chain-policy.md`'s "When a refusal binds, per format" table in the same change (its
AC20; the harness refuses a policy case while the row is `pending`, `conformance-harness.md`
AC26). A publish is never refused this way: policy governs resolution, and an import that fails
validation keeps its own contract (AC8).

**Advisory coverage.** OSV's `ecosystems.txt` (fetched 2026-09-28 from
`osv-vulnerabilities.storage.googleapis.com`) lists no Ansible or Galaxy ecosystem, so
`supply-chain-policy.md`'s coverage table row for Ansible collections is **uncovered** by the
default feed: a coordinate-level advisory rule on this format is refused at configuration as
uncovered (its coverage rule), until a second OSV-schema source declaring such an ecosystem is
configured through `policy.feed.sources` (its AC21), and the matcher would then key on
`{namespace}.{name}` under semver ordering. AC14's policy case therefore condemns through a
rule that needs no advisory (a licence rule, or a standing condemnation record), never through
an `advisories` fixture in an ecosystem the feed does not define. Filling that spec's row is a
consequence for it.

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
  tests against the management endpoint and the `script`-driven case per declared kind, while
  its effect is a real-client conformance case (AC12). Signature **attachment** is the same
  shape: the client cannot upload a signature, so the `attach` trigger is a `script` call and
  its effect, a signature-requiring install that succeeds, is the real client's (AC11). These are
  the format's named exceptions to the real-client-oracle principle.
- Signature **serving** has a real-client oracle (`ansible-galaxy` verifies the signatures
  list against a GnuPG keyring when configured to require it), and AC11 uses it on both paths.
- Whether an import was really deferred is invisible to the client, which polls the same way
  either way; the harness makes it visible by pausing the `manage.apply` kind from the case's
  `script` so the first poll answers unfinished (AC9), with no test-only code in the server.

### Capabilities and lifecycle

`Capabilities()` declares proxy support `supported`, reference-implementation availability
`available`, `Virtual: supported` and `Rename: supported` (`format-handler-interface.md` AC13).
A virtual Galaxy repository resolves `{namespace}/{name}` in its first member that holds it, the
dependency-confusion-closing order every format spec adopts; nothing on this wire is signed with
the repository name (a collection signature covers `MANIFEST.json`), so aggregation is possible
where `hex.md` found it was not. A rename changes no served byte the client keeps: every URL
except `download_url` is rebuilt by the client from its configured base, and the rewritten
`download_url` is rendered per request under the new name, while the old name answers exactly
what a never-existing repository answers. `repository-lifecycle.md` AC12 requires
`conformance/ansible/rename_test.go`, enforced by the harness's case-set validator
(`conformance-harness.md` AC26); AC15 carries it with a real install from the renamed
repository.

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
- [ ] AC9: A publish's import runs as a deferred `publish` operation on the shared runner: the
      publish response carries the task URI once the `pending` `Operation` and its `manage.apply`
      job are committed together, the handler's `Apply` runs inside the job, and the task record
      is held in the shared `Operation` entity and appears in no snapshot's content set; a failed
      import ends the `Operation` `failed` with no snapshot, while a successful one creates
      exactly one snapshot committed atomically with the task's terminal state; with the
      `manage.apply` kind paused through the admin routes from the case's `script`, a real
      `ansible-galaxy collection publish`'s first poll answers unfinished (`finished_at` null) and
      the poll after resume answers finished and a following install succeeds, with no test-only
      hold in the server (`async-operations.md` AC10; `write-triggered-services-prototype.md`
      AC8); a server killed at each of the runner's fault points leaves the operation terminal
      within a bounded time with the import applied at most once and the pending import's
      artifact blob never collected before then (`async-operations.md` AC6); and a poll for a
      task pruned after its retention window, or for an unknown id, answers 404.
- [ ] AC10: A principal holding unpatterned `push` on a repository publishes `alpha.tools` and
      `beta.tools` into it with neither namespace created beforehand, and the two install as
      distinct collections; a token scoped to `pull` and `push` under the pattern `alpha/**`
      publishes, polls and installs `alpha.tools` and is refused publishing `beta.tools`, the
      refused publish creating no snapshot.
- [ ] AC11: A hosted version detail serves `signatures: []` until a signature is attached, and an
      `ansible-galaxy collection install` requiring one valid signature refuses it; a detached
      OpenPGP signature attached through the management API's `attach` kind is accepted only
      when it verifies over the version's stored `MANIFEST.json` with a key in the repository's
      `openpgp` trust set, and refused `validation` with the reason and nothing stored otherwise;
      the version detail then serves `signatures: [{signature, pubkey_fingerprint,
      signing_service: null, pulp_created}]`, the same signature-requiring install, with the
      signing key in the client keyring, installs the attached-and-verified collection, and the
      same client refuses a collection whose stored `MANIFEST.json` was tampered after
      attachment; a principal without `push` is refused the attachment with no snapshot created;
      and on the proxied path an upstream version carrying a signature is served with its
      `signatures` entries unchanged, a verdict recorded under the remote's trust set, and the
      signature-requiring install with the upstream's public key in the client keyring succeeds
      through this registry (this format's half of `artifact-verification.md` AC9).
- [ ] AC12: A version deleted through the registry-owned management API (`delete-version`)
      leaves the version list and detail and no longer installs through the real client, a
      whole-collection deletion (`delete-package`) does the same for every version in exactly one
      snapshot, a principal without `delete` is refused with no snapshot created, and a deletion
      against a proxied repository is refused `405`; each declared kind has a `script`-driven
      conformance case (`management-api.md` AC24); and a publish of a live version, or of a
      deleted one with the same or different bytes, ends its import task `state: failed` naming
      the reason with nothing written, on the core-held `Retirement` record, including after the
      deletion's snapshot has been pruned, after the default pointer has been repointed to a
      snapshot older than the deletion and back, and after the collection's last version is gone.
- [ ] AC13: A fresh installation carries galaxy.ansible.com as an enabled Galaxy upstream with no
      operator configuration, a proxied install through that preconfigured upstream succeeds
      with the upstream swapped for a stand-in as the harness requires, and the nightly
      real-upstream job runs this format's proxied suite against the real galaxy.ansible.com.
- [ ] AC14: A version-detail or artifact request the shared policy layer refuses answers `403`
      through `WriteRefusal` with a body naming the policy and, on the HTTP/1.1 connection the
      harness terminates, the status line `Refused by policy: {condition}` observed on the raw
      socket, on the hosted and the proxied path, the condemning rule being one that needs no
      advisory ecosystem (Design, "Policy refusals on the wire"); a real `ansible-galaxy
      collection install` of the refused version exits non-zero with that text in its output; a
      coordinate-level advisory rule configured on this format is refused at configuration as
      uncovered while no configured feed source declares an Ansible ecosystem; and the case's
      capture of whether the client falls back to a second `server_list` entry fills this
      format's row of `supply-chain-policy.md`'s "When a refusal binds, per format" table in the
      same change (its AC20).
- [ ] AC15: The handler's `Capabilities()` declares proxy `supported`, reference-implementation
      availability `available`, `Virtual: supported` and `Rename: supported`; a real
      `ansible-galaxy collection install` from a renamed repository succeeds under the new name
      in both modes, its `download_url` rendered under the new name, while the old name answers
      exactly what a never-existing repository answers; and a virtual repository of two members
      installs a collection present in both from the first member.

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
| AC9 | conformance + integration + fault injection | `conformance/ansible/deferred_publish_test.go` (real client; the `script` pauses `manage.apply` through the admin routes, publishes, polls once and sees unfinished, resumes, polls to completion and installs; shared with `async-operations.md` AC5 and AC10 and `write-triggered-services-prototype.md` AC8); `internal/format/ansible/import_task_test.go` (snapshot counts for success and failure, the record absent from every snapshot's content set, atomic terminal transition under an injected fault, pruning and unknown-id 404 under an injected clock); `internal/format/ansible/deferred_crash_test.go` (process kill at each fault point, applied at most once, the pending artifact blob surviving a forced sweep; the prototype's instance of `async-operations.md` AC6) |
| AC10 | conformance + integration | `conformance/ansible/namespace_test.go` (unseen namespaces, and the `alpha/**` token's publish, poll, install and refusal; a patterned-`pull`-only token's discovery and in-pattern install); `internal/format/ansible/scope_object_test.go` (the object table, per route, with the sentinel check on discovery, `format-handler-interface.md` AC12) |
| AC11 | conformance | `conformance/ansible/signatures_test.go` (hosted refusal under a signature requirement; the `script` attaches a detached signature through the management API, then the real client requiring one valid signature installs; a tampered `MANIFEST.json` seeded through `state` refused by the client; a `push`-less attachment refused; a fixture stand-in upstream serving a collection signed with a fixture GnuPG key, which the `script` imports into the client keyring, with the verdict asserted; the repository's `openpgp` trust set seeded through the `trust` key; shared with `artifact-verification.md` AC9) |
| AC12 | integration + conformance | trigger: `internal/format/ansible/manage_delete_test.go` (snapshot count per operation, `delete` refusal, proxied `405`, retired-version refusal on the core-held record after pruning under an injected clock, after a backwards repoint and back, and after last-version deletion); effect: `conformance/ansible/delete_test.go` (one `script`-driven case per declared kind, `management-api.md` AC24 and `conformance-harness.md` AC26: the `script` deletes through the management endpoint, then the real client's install fails and a real republish is refused through the import task; a second case starts from a `Retirement` record seeded through `state`) |
| AC13 | integration + conformance + ci | `internal/format/ansible/preconfigured_test.go` (fresh-install upstream set); `conformance/ansible/proxied_test.go` (preconfigured-upstream case against the stand-in); the nightly real-upstream workflow `proxy-cache.md` AC15 defines, with this format's row |
| AC14 | conformance + integration | `conformance/ansible/policy_test.go` (hosted and proxied modes; a licence rule or a standing condemnation through the `policies` key; the raw status line read from the socket; the client's output; a second `server_list` entry to capture fallback for `supply-chain-policy.md` AC20's row); `internal/format/ansible/policy_coverage_test.go` (an advisory rule refused at configuration as uncovered, shared with `supply-chain-policy.md` AC17's coverage rows) |
| AC15 | unit + conformance | `internal/format/ansible/capabilities_test.go` (the four declarations, `format-handler-interface.md` AC13); `conformance/ansible/rename_test.go` (`repository-lifecycle.md` AC12, presence enforced by `conformance-harness.md` AC26; the rewritten `download_url` under the new name); `conformance/ansible/virtual_test.go` (first-member resolution through a real install) |

The case set stays inside the harness's closed `setup` vocabulary: `credentials` carries AC10's
pattern-scoped token (the token scope of `auth.md`, patterns included), `upstreams` carries
AC11's signed stand-in as a fixture server, `trust` carries the repository's `openpgp` trust set
for AC11 (`artifact-verification.md` AC25), and `state` can seed a post-deletion collection with
its `Retirement` records (`management-api.md`, "Retirement is core-held") and a tampered
`MANIFEST.json`. AC9's hold, AC11's attachment and AC12's deletion are called from the case's
`script`, since `setup` never calls a management endpoint, and AC11's client keyring is imported
by the `script` inside the client container. The runner-enforced obligations - both modes,
unauthenticated, unauthorized and pattern-refusal cases in each - apply from the sibling specs
and are not restated per criterion here.

## Implementation Phases

### Phase 1: Hosted path
- Waits on the shared `Operation` entity and the runner's deferred management operation
  (Blocking preconditions; charter step 6a)
- Discovery, collection and version endpoints, artifact download, the publish route as a
  binding onto the deferred `publish` kind with the import in `Apply` on the shared runner and
  the task record in the `Operation` entity, the pause-held conformance case (AC9), duplicate
  and retired version refusal rendered as a failed import, token auth, the per-route
  addressed-object table with the descriptor sentinel check, `signatures: []` on unsigned
  versions, the `403` rendering of the typed policy refusal through `WriteRefusal`,
  `Capabilities()` with the rename and virtual cases (AC15)

### Phase 2: Proxied path
- Response classification, `download_url` rewriting, signature pass-through with the recorded
  verdict, cache and offline behaviour through the shared proxy layer, galaxy.ansible.com as a
  preconfigured upstream and its nightly row (per `proxy-cache.md`'s preconfigured-set
  extension)

### Phase 3: Management surface
- Waits on `docs/internal/plans/foundation/management-api.md` reaching `planned`, and on
  `docs/internal/plans/foundation/artifact-verification.md` for the signature half
- The `Operator` interface declaring `delete-version`, `delete-package` and `attach`, the
  `Retirement` coordinates returned in `Outcome`, the attachment verified through `Deps`'
  `Verifier` and the served entry shape (AC11), the trigger's integration tests and the
  effect's conformance cases

Charter sequencing places this after the post-OCI interface re-open. The import-task mechanism
rides the shared runner, not this format: the write-triggered services prototype's asynchronous
half is built on this handler's package and feeds the re-open, and the wire and the record's
home are the same whether the import is deferred or not.

## Tasks

Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. The 2026-09-25 first review raised Q1 through Q5; folding them on 2026-09-26 exposed
Q6 through Q8, and the 2026-09-28 reconciliation with the foundation wave raised and adopted Q9.
All nine were adopted under the owner's standing delegation and folded through Scope, the
blocking preconditions, Design, the criteria (AC9 to AC15), the Test Plan and the Phases. The
records below keep each question's framing, options and reasoning, so an owner reversing an
adoption has the whole trade in front of them.

### Resolved: import-task handling (was Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A for its mechanism:
validation runs synchronously inside the publish request, the task is terminal before the
client's first poll, and the outcome is fed to the interface re-open as evidence beside the
write-triggered services prototype (Design, "Import tasks"; AC9).

**Revised 2026-09-28 by the resolved deferred-import decision (was Q9, below):** the mechanism
half is superseded too. The import now runs deferred on the shared runner, so the task is
terminal within a bounded time rather than before the first poll, and the accepted cost of a
large artifact holding the POST open is gone. The record stands as the history of how the
question was first answered.

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

**Answered 2026-09-27 by the producer, applied here 2026-09-28.** `artifact-verification.md`'s
resolved Galaxy-signatures decision (was Q6 there, adopted under the same delegation) took
option B's shape with the verification A lacked: user attachment through `management-api.md`'s
`attach` kind, verified over the stored `MANIFEST.json` against the repository's `openpgp` trust
set before storage, the pulp_ansible entry shape, a verdict on relayed proxied signatures, and
`signing-service.md` declining server-side signing (option C). AC11 was rewritten to the
criterion shape this record asked for (Design, "Signatures"). The accepted cost of A, no signed
story at launch, therefore lasted until the producer's phase; the story now lands with Phase 3.

Accepted cost, as first recorded: private-registry users get no signed-collection story for
hosted content at launch, where Galaxy NG has one, and the story stalls if its producer stalls.
Why the alternatives lost at the time: B designs a bespoke attachment surface with no client
oracle before the producer spec exists, and C takes on signing-key management, the most
dangerous class of surface, for a need this spec has not established.

The producer is `docs/internal/plans/foundation/artifact-verification.md`, per the
verification-ownership decision adopted in `supply-chain-policy.md`. What this format required
of it, each now answered:

- A decision on how hosted collections acquire signatures: attached by users (store-and-serve,
  with or without server-side verification against a configured keyring) or produced
  server-side (which brings signing-key generation, storage and rotation). Answered: user
  attachment, verified before storage; server-side signing declined (`signing-service.md`, was
  Q10 there).
- If attachment, the attachment surface is a management operation with no client trigger, so
  it is an endpoint of `docs/internal/plans/foundation/management-api.md`, never a
  Galaxy-specific route. Answered: the `attach` kind, `push` on the version.
- The served entry shape, grounded in captured Galaxy traffic before it is specified: the
  signature text, the signing key's fingerprint and the signing service, and the object the
  client verifies a signature against. Answered: `{signature, pubkey_fingerprint,
  signing_service: null, pulp_created}` over `MANIFEST.json`.
- A position on proxied signatures, which this spec passes through unverified (Q7): whether the
  producer verifies them, and what the registry does with one that fails. Answered: passed
  through unchanged with a verdict recorded under the remote's trust set; a failing verdict is
  policy's input, never a stripped entry.
- A criterion shape for this spec's revision: hosted versions then serve signatures that a real
  `ansible-galaxy` requiring valid signatures accepts, and one tampered signature it refuses,
  with AC11 rewritten accordingly. Answered: AC11 as it now reads.
- A verdict the policy engine can consume as the signature-state input `supply-chain-policy.md`
  names. Answered: the `openpgp` entry's verdict, recorded per digest.

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
spec's own revision mechanism; it was recorded here as a blocking precondition of Phase 2 and was
not made from this spec. That spec has since made it, as its resolved preconfigured-set extension
(was Q14), so the precondition is discharged.

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
`docs/internal/plans/foundation/management-api.md` (the `delete-version` and `delete-package`
kinds of its vocabulary since 2026-09-27), not Galaxy NG's own `DELETE` routes. That is the shape `pypi.md` and `npm.md` adopted in the same
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
belongs to `data-model.md`, which this spec does not edit; the requirement was carried to it as
a sibling consequence and is met (its "Operations" section and AC32, widened by
`management-api.md` to every management operation and by `async-operations.md` to the
`cancelled` terminal state and the `Job` that executes a deferred one).

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

Accepted cost: A's row; whether the producer later verifies relayed signatures was recorded as
one of its requirements under Q3, and it does: `artifact-verification.md` AC9 records a verdict
under the remote's trust set for every relayed entry while the entry passes through unchanged
(Design, "Signatures"). Why B lost: it defeats the signature workflow for exactly the users who
configured it.

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
somewhere downstream fails, far from the deletion that caused it. Since 2026-09-28 the retired
coordinates are core-held `Retirement` records (`management-api.md` was Q3, `data-model.md`
AC35) rather than a set in the package-level document; the rule is unchanged, its home moved
(Design, "Artifact validation").

### Resolved: the import runs deferred on the shared runner (was Q9, raised and adopted 2026-09-28)

**Adopted 2026-09-28 under the owner's standing delegation.** Option A: the import is the
`publish` kind declared deferred, executed by the `manage.apply` job on `internal/async`; the
publish route is a binding that spools the artifact and submits the operation; `Apply` runs the
validation and the commit inside the runner's transaction; the harness holds an import through
the admin pause of the kind (Design, "Import tasks"; AC9; the Phase 1 precondition; the was-Q1
record revised).

The question: this spec's was-Q1 answer validated synchronously inside the publish request and
reserved deferral for later, and `async-operations.md`'s Context still describes it that way.
But the siblings written since assume the deferred path runs here: `async-operations.md` AC10
requires a paused `manage.apply` to hold "a real `ansible-galaxy collection publish`'s import",
its AC5 and AC6 name `conformance/ansible/deferred_publish_test.go` and
`internal/format/ansible/deferred_crash_test.go`, `write-triggered-services-prototype.md` AC8
runs the real client against the asynchronous vehicle held by that pause, and the charter's
step 6a builds "the deferred management operation on the async runner, then Ansible
collections" for this format. A synchronous import has no job to pause, so those criteria and
this spec could not both be true.

**Recommendation:** A, because the wire is already asynchronous and the client already polls,
because the queue core now exists as a shared mechanism with crash-safety, grace and
cancellation criteria this spec would otherwise have to re-derive for large artifacts later,
because the prototype's Galaxy-shaped half is built on this handler's package and its finding
is worthless if the shipping handler does not use the path it proved, and because it removes
the one accepted cost was-Q1 carried (a large artifact holding the POST open).

| Option | You get | It costs |
|---|---|---|
| **A. Deferred on the shared runner; publish route binds onto the `publish` kind** | One asynchronous mechanism for every format; the charter's step 6a, the prototype's AC8 and `async-operations.md` AC5, AC6 and AC10 are satisfied by the shipping handler; the first poll may answer "not yet", which the client was built for | Phase 1 waits on the runner's deferred operation (already sequenced at 6a); a crashed import is observable to the client only through its terminal state after a bounded time |
| **B. Synchronous in-request, as was-Q1 adopted** | The first poll always answers finished; no queue dependency | Contradicts `async-operations.md` AC10, the prototype's AC8 vehicle and the charter's 6a placement; a large artifact holds the POST open; the prototype's finding is proved on a path the handler does not use |
| **C. Configurable per repository** | Both behaviours | Two code paths for one wire, and a conformance suite that proves whichever the case set happens to configure |

**Why this is yours:** it decides whether the one format built for the asynchronous path uses
it, and it sequences this handler behind the shared runner.

Accepted cost: the runner dependency in Phase 1, and a client whose first poll may say "not
yet". B lost because it contradicts three adopted sibling criteria; C lost on the duplicated
path. `async-operations.md`'s Context sentence describing this spec as synchronous is a
consequence for it.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-25 | 331ef25 | first review (never previously interrogated): protocol grounding by running the real client this pass (ansible-galaxy from ansible-core 2.18.18rc1 against a local logging server, live galaxy.ansible.com probes, and the client source on disk) + adversarial + cross-spec (format-handler-interface's pinned method set, URL-shape record and definition of done; data-model's write-boundary obligation and no-handler-owns-a-table rule; proxy-cache's classification, integrity and preconfigured-upstream decisions; auth's client table and repository-scoped model; conformance-harness's setup vocabulary, stand-in rule and authoritative-reference resolution; supply-chain-policy Q6; catalogue Q4 and charter Q1) + constitution + go-spec-reviewer. Claim verification against code vacuous pre-implementation: the tree holds only a stub `cmd/stackweaver-registry/main.go`, no `internal/` or `conformance/` exists, so protocol claims were verified against captured traffic instead of a tree. Independent: this reviewer authored none of the spec's prior content | The premise survived its refute-check (Forgejo's package docs, re-read this pass, list 24 types with no Ansible), but the draft understated its own protocol and missed sibling obligations. Wire contract pinned from capture: the auth header is `Authorization: Token <token>` on every request including discovery, correcting `foundation/auth.md`'s "Bearer or Basic" guess (synced there as a cross-spec row); the client rebuilds the import-poll URL from its own configured base plus the last path segment of the publish response's task URI, fixing where the endpoint must live; the poll contract (404 while queued, `finished_at`, `state: failed` with `error.code`/`error.description`, `messages[]`) recorded; the format-first mount verified by a real run, joining the URL-shape record's client evidence; the per-file digest claim corrected (`FILES.json` carries them, `MANIFEST.json` anchors `FILES.json` by digest). The proxied path had one AC and no design: classification declaration (metadata mutable under TTL, artifacts immutable), `download_url` rewriting (without which the cache never sees the artifact bytes) and the integrity digest added. The write-boundary declaration `data-model.md` makes a review item was absent and is now stated: one successful import task, one snapshot. Definition-of-done gaps closed: two pinned client versions (AC2), replay corpus (AC7), failed-import contract (AC8), and the deliberately-unimplemented recording added; AC6 corrected off "public Galaxy", since the main suite runs against stand-ins. Raised Q1 (the import-task record has no home in a model with no async-operation entity, the exact class the interface spec deferred to its re-open), Q2 (namespaces versus repository-scoped auth, touching open auth Q13/Q16), Q3 (signatures: serving has a client oracle, attachment has none, and supply-chain-policy Q6 owns the producer), Q4 (whether galaxy.ansible.com joins the preconfigured upstreams, amending a resolved proxy-cache decision), Q5 (deletion has no client oracle; the OCI precedent cuts the other way). Stays draft on Q1-Q5. |
| 2026-09-26 | 0dbca1f | folding adopted recommendations under the standing delegation | Not a review: adoption and application of this spec's own recommendations, made consistent with the Cluster 5 and Cluster 6 format specs and the prototype. Q1 adopted as A for its mechanism (synchronous validation, terminal before the first poll); folding found its storage half (the repository-level metadata document) contradicts settled rules, since that document is snapshot content and a failed import would create a snapshot, so the home was raised as Q6 in decision shape and adopted as B: a format-agnostic `Operation` entity in `data-model.md`, outside snapshot content, atomic with the snapshot it produces, pruned after a window (new Design section "Import tasks", AC9, a Phase 1 precondition). Q2 adopted as A, and since `auth.md` adopted pattern scopes in the same pass the per-route addressed-object table is declared now and a token scoped `alpha/**` is confined to its namespace (Design "Namespaces", AC10). Q3 adopted as A with the requirements this format places on `docs/internal/plans/foundation/artifact-verification.md` (to be authored) recorded; its silence on proxied signatures raised as Q7 and adopted as A, pass-through (Design "Signatures", AC11). Q4 adopted as A, the `proxy-cache.md` amendment recorded as a Phase 2 precondition for that spec to make (AC13). Q5 adopted as B for its decision, re-homed onto the registry-owned management API in `docs/internal/plans/foundation/management-api.md` (to be authored) instead of Galaxy NG routes, for consistency with pypi and npm (Design "The management surface", AC12, Phase 3); folding it raised Q8, re-publishing a deleted version, adopted as A: retired forever, live duplicates refused too (Artifact validation, AC12). Also: blocking preconditions section added (interface re-open, now binding since the catalogue promoted this format to Tier 1; Operation entity; proxy-cache amendment; management-api.md); sequencing note rewritten to Tier 1 at charter step 6a; sibling citations now resolved (auth pattern scoping and grants, supply-chain-policy component inventory and verification ownership, conformance-harness setup vocabulary) reframed with historical qualifiers; conformance notes aligned with the harness's closed vocabulary and seed path (management triggers called from `script`). Test Plan rows added for AC9 to AC13. Stays draft. |
| 2026-09-26 | da0aecd | cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Found already done by the interrupted fold (d56e1ff): the Tier 1 sequencing (charter item), the resolved supply-chain Q3 and Q6 citations, the harness closed-vocabulary note, the auth Q13 citations and the per-route addressed-object table. Applied: the per-format policy rendering (403 naming the policy, AC14, `conformance/ansible/policy_test.go`); the Operation precondition now cites `data-model.md`'s Operations section and AC32; the preconfigured-upstreams precondition recorded as discharged by `proxy-cache.md`'s resolved preconfigured-set extension (was Q14), in the preconditions, the proxied path, Phase 2 and the Q4 record. Stays draft. |
| 2026-09-28 | ddc73fb | cross-spec reconciliation of the foundation wave. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` naming this file verified against the current text of its source spec before applying. Judgment call raised and adopted as Q9 under the standing delegation: `async-operations.md` AC5, AC6 and AC10, `write-triggered-services-prototype.md` AC8 and the charter's step 6a all assume this handler's import runs deferred on the shared runner, while this spec (was Q1) validated synchronously; adopted A, the import is the deferred `publish` kind executed by `manage.apply`, the publish route a binding, the harness holding an import through the admin pause (Design 'Import tasks' rewritten, AC9 rewritten with `deferred_publish_test.go` and `deferred_crash_test.go`, Phase 1 precondition, was-Q1 record revised). From `artifact-verification.md` (item 9: its resolved Galaxy-signatures decision, was Q6, AC9, AC25) and `signing-service.md` (was Q10): hosted signatures by user attachment through `management-api.md`'s `attach` kind, verified over the stored `MANIFEST.json` against the `openpgp` trust set before storage, served as `{signature, pubkey_fingerprint, signing_service: null, pulp_created}`, proxied entries passed through with a verdict; Scope, Design 'Signatures', the management table, AC11 and its row rewritten, `trust` key in the Test Plan note; the was-Q3 requirement list annotated with each answer and the was-Q7 record with the verdict. From `management-api.md` (kind table, reconciliation table, AC5, AC6, AC7, AC24) and its was Q3 with `data-model.md` AC35: `delete-version`, `delete-package` and `attach` declared through `Operator`, no Galaxy NG binding, retirement core-held and rendered as a failed import (Artifact validation, the write boundary, AC12, the was-Q5 and was-Q8 records). From `auth.md` was Q23: discovery is a descriptor, closing the latent contradiction under which AC10's patterned install could not pass its first request; sentinel check in the scope test. From `supply-chain-policy.md` (was Q10, AC17, AC18, AC20, AC21) and `format-handler-interface.md` AC14: refusals through `WriteRefusal`; OSV's `ecosystems.txt` fetched 2026-09-28 lists no Ansible ecosystem, so the coverage row is uncovered, advisory rules refused at configuration, AC14's case condemns without an advisory and fills the binding row. From `repository-lifecycle.md` AC12 and `format-handler-interface.md` AC13: a Capabilities and lifecycle section, new AC15 with `rename_test.go` and `virtual_test.go`. Charter step 6a wording, the `upstream-adapters.md` profile row, `conformance/ansible/**` in `covers`. Fifteen criteria, each with a Test Plan row. Consequences for other files: `auth.md`'s Galaxy consumer bullet says discovery reports none, now descriptor; `async-operations.md` Context (~l.133) says this spec validates synchronously; `supply-chain-policy.md`'s Ansible coverage row (uncovered, no OSV ecosystem) and binding row (filled by AC14's case). Stays draft pending a gate review. |
