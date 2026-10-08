---
status: planned
status_description: "Planned by the Fable gate review of 2026-10-08 at ecb2028: brought current with every queued consequence (auth helm row landed, harness exception row and digest manifest, member input, serving forms and serve policy, cacheability floor, spool bound and claims, advisory key, no-clock TTL case), the eight question records rechecked (Q3 amended: the documented cm-push context path is the repository's full path, captured; Q7 confirmed with the landed harness row; the rest confirmed), and one design correction: the proxied changed-digest case follows proxy-cache's new-blob-beside-the-old variant instead of pinning the cached digest. Earlier: Question records re-checked 2026-09-28 at 15ced69 (not a review): Q3 cites the renamed upload section, Q5 records how the optional after-commit .prov verdict sits beside never-signature-verified, Q7 notes its harness exception entry is still owed. Reconciled 2026-09-28 at 2cf0d01 with the foundation wave (not a review): index.yaml is the handler's Indexer generator in internal/format/helm/index run by signing-service's index runtime (AC3); deletion and attachment are the management-api kinds delete-version and attach on the Operator interface with core-held Retirement, conflict 409 and validation 422 (AC6, AC18); index.yaml stays none under auth's descriptor kind with the reason recorded; the .prov is artifact-verification's optional openpgp verdict source, recorded never enforced (AC7); WriteRefusal, the refusal status line and the binding-table row, and OSV lists no Helm ecosystem (AC17); capabilities, rename and a merged virtual index (new AC19). Earlier: Reconciled 2026-09-26 at da0aecd (not a review): Q2 revised to the registry-owned management API (ChartMuseum's upload stays the publish route; deletion and provenance attachment move to management-api.md and ChartMuseum's routes are not served, AC6, AC18, Phase 5), Q8 raised and adopted (upload object from a bounded Chart.yaml peek), per-route addressed objects (AC16) and the 403 policy rendering (AC17) added, retirement set placed in the package-level document, charter AC12 recorded. Earlier: Authored 2026-09-26 at 4d1aeb1 as a grounded first draft: the classic index.yaml wire contract captured from three real Helm releases (3.20.0, 3.22.0, 4.3.0) and the cm-push plugin against a logging server, the ChartMuseum write API grounded in its source, and the classic-versus-OCI relationship settled. All seven questions adopted under the owner's standing delegation; awaits its first review."
description: "Spec for the classic Helm chart repository format (index.yaml plus .tgz and .prov over HTTP), hosted and proxied, and how it relates to the OCI path that oci.md already covers."
author: michielvha
goal: "Serve and cache classic Helm chart repositories with the real helm client as the oracle, with the repository-wide generated index and the de facto ChartMuseum upload API handled deliberately rather than discovered."
priority: "medium"
issue: 19
created: 2026-09-26
covers:
  - "internal/format/helm/**"
  - "conformance/helm/**"
---

# Plan: Helm chart repository format

The classic Helm chart repository protocol, hosted and proxied: a generated `index.yaml`, chart
archives and their provenance files served over HTTP, uploaded through the ChartMuseum API the
ecosystem converged on, and the settled relationship to Helm's OCI path, which
`formats/oci.md` already owns.

## Context

Helm has two ways to distribute a chart and only one of them is this spec's. Since Helm 3.8 a
chart can be pushed to any OCI registry as an artifact, and `formats/oci.md` AC3 already requires
`helm push` and `helm pull` to round-trip against this registry's OCI handler. The older and
still far more widely deployed way is the **classic chart repository**: a directory of `.tgz`
archives with a single generated `index.yaml` describing all of them, served by any HTTP server.
Every GitHub Pages chart repository, ChartMuseum, and the Helm repositories of Gitea, GitLab,
Nexus and Artifactory speak this protocol, and `helm repo add`, `helm search repo`, `helm
install repo/chart` and `helm pull repo/chart` all consume it.

The catalogue lists the ecosystem's family as "Helm + OCI" (`formats/catalogue.md`, Tier 1),
which this spec reads as one ecosystem with two wire protocols: the classic path is the Helm
ecosystem row and is what this spec delivers; Helm-as-OCI is client reach of the OCI handler,
listed under the OCI row of the catalogue's multiplier table, and is proven by `oci.md` AC3.
Nothing here is counted twice, and the Helm row is advertised only when the classic path passes
both hosted and proxied conformance (catalogue AC4).

Three things make this format different from npm and PyPI, and each is a trap named in Design:

- **The index is one repository-wide, generated, mutable document.** `index.yaml` enumerates
  every version of every chart in the repository, is rewritten on every publish, and is fetched
  whole by every `helm repo update`: the client sends no conditional request (captured this
  run against 3.20.0, 3.22.0 and 4.3.0). At scale it is large: the prometheus-community index
  measured 6.4 MB on 2026-09-26 (`curl -sI`, `content-length: 6432433`). It is the unsigned
  relative of Debian's `Release`, the class `foundation/write-triggered-services-prototype.md`
  exists to study.
- **Chart URLs in the index may be relative or absolute, to any host.** The client resolves
  relative URLs against the repository URL and follows absolute ones verbatim, and it sends the
  repository's credentials only to the repository's own scheme and host unless told otherwise
  (`--pass-credentials`). Every proxied index this registry serves must therefore be rewritten
  to point at this registry, or the cache never sees the chart bytes.
- **There is no standard upload API.** The chart repository guide describes a static layout and
  says nothing about writing to it. ChartMuseum's `POST /api/charts` is the de facto write
  contract: the `helm cm-push` plugin drives it, and Gitea and GitLab expose the same shape, so
  it is served as this format's publish route. ChartMuseum's other write routes, provenance
  upload and delete, are driven by no Helm client, and under the cross-format precedent
  `pypi.md`, `npm.md` and `ansible-collections.md` adopted they are operations of the
  registry-owned management API instead (the resolved upload-API decision below, as revised by
  the 2026-09-26 reconciliation).

Grounding for this run: the Helm chart repository guide, the provenance guide and the
registries guide at helm.sh (read 2026-09-26); the Helm source at tags v3.20.0 and v4.3.0
(`pkg/repo/index.go`, `pkg/repo/chartrepo.go`, `pkg/downloader/chart_downloader.go`,
`pkg/getter/httpgetter.go`, `pkg/provenance/sign.go`, `pkg/registry/constants.go`, and their
`pkg/repo/v1` counterparts in v4); the ChartMuseum README and its `multitenant/api.go`,
`multitenant/handlers.go`, `repo/chart.go` and `repo/provenance.go`; the `helm-push` plugin
source and README; and, per the standing rule that the client is the specification, captured
traffic from the three real clients on this host (`helm` v3.20.0 installed at
`/usr/local/bin/helm`, plus v3.22.0 and v4.3.0 downloaded from get.helm.sh) and from
`helm cm-push` 0.11.1, all run against a logging HTTP server, with a local `registry:2` used
to compare the OCI and classic representations of one chart.

## Blocking preconditions

**The handler interface re-open must complete before this format starts.** Helm is Tier 1,
scheduled in the charter's build-order step 7 after Maven, Go modules, NuGet, Debian and RPM,
and `format-handler-interface.md` AC8 blocks all Tier 1 handler work on the post-OCI re-open.
Recorded here for the same one-sided-contract reason npm and PyPI record it.

**The management API must reach `planned` before Phase 5.** Chart-version deletion and
provenance attachment are two kinds of `docs/internal/plans/foundation/management-api.md`'s
closed operation vocabulary, `delete-version` and `attach`, whose kind table and cross-format
reconciliation table carry Helm's rows (deletion under `delete`, attachment under `push`, no
client binding because ChartMuseum's routes are not served). That spec owns their URL shape,
authorization, write accounting and problem types, and the handler receives them through its
optional `Operator` interface (its resolved dispatch decision, was Q2), so the index regenerates
inside the operation's write. AC6 and AC18 are untestable until that surface exists; what this
format required of it is now stated in Design ("Management operations") as citations of its
criteria.

**The shared signing and index service must reach `planned` before Phase 1.** Helm's
`index.yaml` is a generated document of `docs/internal/plans/foundation/signing-service.md`,
which the charter builds first in step 7, before Maven, Go modules, NuGet and then Helm; that
spec's consumer table lists Helm under "Unsigned generated index", and its resolved Helm question
(was Q1 there) settles that the service owns the regeneration and Helm consumes it. The handler's
part is the generator: the optional `Indexer` interface returns a pure generator from the sibling
package `internal/format/helm/index`, run by the index runtime inside every write on the
repository (its AC1), with no key created and no signature record because Helm's profile declares
no signing profile (its AC24). The charter's AC12 forbids Helm's handler reaching `main` before
the service's Phase 1 has met its criteria. The earlier assumption here, that the handler
regenerates the index itself through `Deps`, is withdrawn; Design ("The index document") now
states the generator contract.

**The handler interface re-open judges the `Indexer` callback.** `format-handler-interface.md`
records the `Indexer` beside `Operator` and `surface.Declarer` in "Optional interfaces discovered
at registration" (its resolved optional-interfaces decision, was Q10) and hands the fold-in
verdict to the post-OCI re-open its AC8 gates Tier 1 on; `write-triggered-services-prototype.md`
supplies that evidence from its Debian-shaped half. Whether the regeneration preserves one
snapshot per publish under concurrency is no longer this format's to assume: `signing-service.md`
AC1 and AC3 assert it for every consumer, and AC3 and AC4 here assert it for Helm's index.

## Scope

**In scope:**

- The classic repository read surface: `index.yaml`, chart archives and provenance files at the
  URLs the index advertises, for `helm repo add`, `helm repo update`, `helm search repo`,
  `helm pull` and `helm install` from a named repository, against pinned Helm 3 and Helm 4
  clients.
- Hosted index generation as a write-triggered, repository-wide document: regenerated by the
  shared index runtime as part of every completed write from this handler's `Indexer`
  generator, stored at the repository level of the shared model, captured in the snapshot
  delta, and served byte-for-byte.
- ChartMuseum's upload route as the hosted publish surface: `POST /api/charts` (raw or
  multipart with `chart` and optional `prov` fields), driven by the real `helm cm-push` plugin
  and by `curl`, with refusal of a republish under an existing coordinate (Resolved: republish
  and retirement, below).
- Chart-version deletion and after-the-fact provenance attachment as operations of the
  registry-owned management API, the kinds `delete-version` and `attach`, with every deleted
  coordinate retired through the core-held `Retirement` record (Design, "Management
  operations").
- The handler's `Capabilities()` declaration, repository rename and virtual aggregation over a
  merged index (Design, "Capabilities and lifecycle").
- The per-route addressed objects `auth.md`'s pattern scopes evaluate (Design, "Addressed objects
  and pattern scopes"), and the wire rendering of a shared policy refusal.
- Provenance files: stored and served next to their chart, coherence-checked on upload against
  the chart they name, verified end to end by `helm pull --verify` and `helm verify`.
- HTTP Basic with a registry token as password for reads and writes, plus the Bearer form
  `helm cm-push --access-token` sends, per `foundation/auth.md`.
- The proxied path against any classic upstream: index classification and URL rewriting for
  both relative and absolute upstream URLs, conditional revalidation, stream-and-verify against
  the index digest, negative caching, and Helm's rows of the settled removal table.
- The separation between this format and the OCI path (Resolved: classic and OCI, below),
  including the one place they meet, which is the shared CAS.

**Out of scope for v1**, each with a reason that is not effort, recorded because the interface
spec's definition of done requires the deliberately unimplemented surface to be named:

- **Cross-visibility between classic and OCI repositories.** Excluded on evidence: the ecosystem
  itself keeps the two paths as disjoint namespaces (`helm repo add oci://...` is refused by
  both Helm 3 and Helm 4, captured this run; `helm pull oci://` never reads an index), Harbor
  removed its classic path rather than unify the two, and building a projection would require
  one handler to read another's metadata, which the constitution forbids. Detail in the resolved
  decision.
- **ChartMuseum's `POST /api/prov` and `DELETE /api/charts/{name}/{version}` routes.** No Helm
  client drives either (`cm-push` uploads only the `chart` part, captured), so serving them
  would be a per-format alias of the registry-owned management operations, which the
  cross-format precedent declines exactly as `ansible-collections.md` declines Galaxy NG's own
  `DELETE` routes. A CI script calling them changes its URL to the management API's; the
  publish route every such script also calls is unchanged.
- **ChartMuseum's read API** (`GET /api/charts`, `GET /api/charts/{name}`,
  `HEAD /api/charts/{name}/{version}`, the `templates` and `values` sub-resources). No Helm
  client reads them: `helm cm-push` fetches `index.yaml` only when no context path is set, to
  detect a repository, and nothing else (captured; under the documented context path it fetches
  nothing before the upload), and the index is the ecosystem's read contract. A UI-era listing surface
  belongs to the registry's own management API, not to a per-format imitation.
- **Signature verification of provenance files by the handler.** Verification belongs to the
  shared producer `docs/internal/plans/foundation/artifact-verification.md`, per
  `supply-chain-policy.md`'s resolved verification-ownership decision (was Q6): that spec's
  `openpgp` cleartext entry lists Helm's `.prov` as an optional verdict source, verified only
  where the repository holds an `openpgp` trust set and otherwise `absent`, with the verdict
  recorded and never enforced (its "Per-format positions" and AC21). Provenance is designed to
  be verified by the client against its own keyring; the handler stores and serves it faithfully
  (coherence-checked, never signature-checked) and the shared verifier's verdict changes nothing
  about how the client verifies it (Design, "Provenance, `helm verify`, and supply-chain
  policy"; AC7).
- **Chart dependency resolution and `helm dependency update` flows.** They are client-side
  composition over the same read surface (a dependency's repository is fetched with the same
  `index.yaml` and `.tgz` requests); nothing new is served, so nothing new is asserted beyond
  the read cases.
- **Serving a classic index over an OCI upstream** (a `remote` Helm repository whose upstream is
  an OCI registry). The client speaks OCI to OCI registries directly, and a remote OCI
  repository on this registry already proxies that (`oci.md`, the proxied path). Synthesising an
  index from OCI tags would be a third representation with no client asking for it.

## Design

### The wire surface

Every row below is grounded in captured traffic from the real clients this run and in the
sources named in Context; per the standing rule the recorded corpus re-grounds the table when
the conformance cases are written, and the corpus wins any disagreement.

| Surface | Shape |
|---|---|
| Index | `GET {repo}/index.yaml`; the client joins `index.yaml` onto the configured repository URL (trailing slash added if absent, query string preserved); fetched whole, unconditionally, on `helm repo add`, every `helm repo update`, and `helm pull --repo` |
| Chart archive | `GET` on the entry's `urls[0]`, resolved against the repository URL if relative; the client sends `Accept: application/gzip,application/octet-stream`; hosted URL shape is `{repo}/charts/{name}-{version}.tgz` |
| Provenance | `GET` on the chart URL with `.prov` appended, only under `--verify` or `--prov`; a 404 is a hard error under `--verify` (`failed to fetch provenance "<url>"`) |
| Upload | `POST {repo}/api/charts`: multipart form with a `chart` file field and an optional `prov` field, or the raw `.tgz` as the body; `?force` query on a forced overwrite; `201 {"saved": true}` |
| Provenance upload, delete | ChartMuseum's `POST {repo}/api/prov` and `DELETE {repo}/api/charts/{name}/{version}` are **not served**; both operations are the registry-owned management API's (Design, "Management operations") |
| Liveness and identity | Nothing standard; `helm` probes nothing beyond the surfaces above |

Constraints the captures established, each load-bearing:

- **`index.yaml` is refetched whole on every update, by every client generation.** None of
  3.20.0, 3.22.0 or 4.3.0 sends `If-None-Match` or `If-Modified-Since`, and the HTTP getter
  source in both major versions contains no conditional-request logic. Helm 4's advertised
  content-based caching is a local chart cache (`HELM_CONTENT_CACHE`) that `helm pull` reads
  and, per the v4.3.0 downloader source, does not populate; the three pulls captured against
  4.3.0 all reached the server. So the index is the hot document of this format, and its size
  is paid on every update by every client.
- **Credentials are HTTP Basic, sent preemptively, and only to the repository's own scheme and
  host.** `helm repo add --username u --password p` produced `Authorization: Basic dTpw` on the
  index fetch and on chart and provenance fetches from the same host; a chart URL on a second
  host received no `Authorization` header until the repository was added with
  `--pass-credentials`, after which it did (all three clients). The rule in `httpgetter.go` is
  `passCredentialsAll || (same scheme && same host)`.
- **Relative and absolute URLs.** `helm repo index` writes bare filenames unless `--url` is
  given, in which case every URL is absolute. The client takes `urls[0]` only, and resolves a
  relative one with `ResolveReferenceURL`: parse, return as-is if absolute, else force a
  trailing slash on the base path and `url.ResolveReference`, then reapply the base URL's query
  string. The handler reproduces exactly this when resolving an upstream index.
- **The downloaded file is named after the URL's basename, and `helm verify` keys the checksum
  by that filename.** An index entry whose URL basename was `renamed.tgz` failed
  `helm pull --verify` with `provenance does not contain a SHA for a file named "renamed.tgz"`
  although the bytes were identical. A chart's URL must end in `{name}-{version}.tgz`, hosted
  and proxied alike, or verification breaks for a reason no user can diagnose.
- **`+` in a version is sent literally in the path.** `helm pull rel/demo --version
  0.2.0+build.1` requested `/rel/demo-0.2.0+build.1.tgz` with an unencoded `+`. A router that
  decodes `+` as a space (query-string semantics applied to a path) serves 404 to every chart
  with build metadata.
- **Names are exact and case-sensitive.** The client looks charts up by the `entries` key, not
  by the entry's `name` field: with the key `Demo` and the metadata name `demo`,
  `helm pull case/demo` failed (`no chart name found`) and `helm pull case/Demo` succeeded.
  There is no normalisation in this ecosystem, and this registry introduces none.
- **Index entries are validated at load and silently dropped.** An entry whose `version` is
  not valid semver is skipped with a log line (`skipping loading invalid entry for chart
  "demo" "not-a-version" ... chart.metadata.version "not-a-version" is invalid`) and the rest
  of the index loads; an index without `apiVersion` fails `helm repo add` with `no API version
  specified`; a 404 on `index.yaml` fails it with `not a valid chart repository or cannot be
  reached`. An index with `apiVersion: v1` and `entries: {}` is accepted by both majors, which
  is what an empty hosted repository serves.
- **The index `digest` is informational to the client, not verified, and Helm 4 parses it.**
  Neither major compares downloaded bytes to the entry's `digest` (a wrong but well-formed
  digest pulled fine on 3.20.0 and 4.3.0). Helm 4 does decode it as hex to key its content
  cache, so a malformed digest breaks the pull (`encoding/hex: invalid byte`), and a digit-only
  digest was read as the number `0` by the YAML layer and failed as `odd length hex string`.
  The digest must therefore always be the exact 64-hex-character sha256 of the bytes actually
  served, and the index must be rendered through a YAML serializer with the same scalar
  semantics as Helm's (`sigs.k8s.io/yaml`), never hand-templated.
- **`deprecated: true` on an entry changes nothing on the wire.** Both majors pulled a
  deprecated chart silently; `helm search repo` shows it. It is metadata, never a removal.
- **`helm search repo` never contacts the registry.** It reads the cached index only, so a
  case asserting that a publish is visible must run `helm repo update` first and assert the
  index fetch in the transcript, the same client-cache trap npm and PyPI carry.

### Classic and OCI: two wire protocols, one ecosystem

The two paths do not see each other, and this spec settles that deliberately (Resolved: classic
and OCI, below). A Helm repository on this registry has format `helm` and speaks the classic
protocol; a chart pushed with `helm push oci://` lands in a repository of format `oci`, served
by the OCI handler exactly as `oci.md` AC3 tests. A chart is visible on the path it was
published through and no other, matching the ecosystem's own behaviour: `helm repo add`
refuses an `oci://` URL (`failed to perform "FetchReference" on source: invalid reference`,
both majors), and `helm pull oci://` reads a manifest by tag, never an index.

They meet in exactly one place, and it is the shared CAS. Pushing the fixture chart to a local
`registry:2` with `helm push` produced a manifest whose chart layer has media type
`application/vnd.cncf.helm.chart.content.v1.tar+gzip` and digest
`sha256:da44814e...` - the sha256 of the `.tgz` file byte for byte, and the same value the
classic index carries as `digest` and the `.prov` carries under `files:`. The provenance layer
(`application/vnd.cncf.helm.chart.provenance.v1.prov`) is likewise the `.prov` bytes. So a
chart uploaded both ways stores one `Blob` (`data-model.md` AC2 is exactly this shape), while
its `Package`, `Version` and `File` rows exist once per repository, as for any other
duplicate publish. OCI tags map `+` to `_` (`0.2.0+build.1` became tag `0.2.0_build.1`); the
classic path keeps the `+`. That mapping is the OCI handler's concern and is named here only so
nobody expects the two coordinates to be string-equal.

### Mapping onto the shared model

The mapping uses the levels `data-model.md` provides and no others:

| Model entity | Helm meaning |
|---|---|
| `Package` | One chart name, exact string, case-sensitive |
| `Version` | One chart version, the exact semver string including build metadata; its metadata document is the chart's `Chart.yaml` metadata as the index entry carries it, plus `created` |
| `File` | `{name}-{version}.tgz`, and `{name}-{version}.tgz.prov` when a provenance file exists; two files per version is the norm this model already expects |
| `Blob` | The archive and provenance bytes, keyed by the canonical sha256 the CAS computes; the index `digest` is that key rendered as bare hex |
| `Repository` metadata document | **The generated `index.yaml` itself** for a hosted repository, and the rewritten upstream index for a proxied one |
| `RemoteFile` | For a proxied repository, one row per chart file per upstream URL, holding the resolved absolute upstream URL; several `urls` entries become several rows tried in order |

The package-level document carries nothing Helm needs: the chart's **retired coordinates**,
every version ever deleted from it, are core-held `Retirement` records (`data-model.md`, its
entity table and AC35; `management-api.md`, "Retirement is core-held", its resolved
retirement-placement decision, was Q3), written in the deleting operation's transaction, outside
snapshot content, never pruned, and refused by the shared write path on any later upload of the
coordinate. The handler carries nothing forward and a backwards repoint cannot resurrect a
retired coordinate. A chart with no live versions is absent from the index and still refuses its
retired versions, which is the cross-format retirement rule `pypi.md`, `npm.md` and
`ansible-collections.md` adopted and where Resolved: republish and retirement keeps its record.
Helm keeps no other package-wide mutable state (dist-tags and `latest` have no equivalent;
`helm` resolves the highest semver client-side from the index).

Every name-addressed read resolves through the snapshot pointer the handler is given, per the
model's binding constraint. For this format that is the index: the handler serves the
repository-level document of the pointed-at snapshot, so repointing an environment serves that
environment's index and the charts it names, and nothing else.

### The index document: write-triggered, repository-wide, mutable

The hosted index is **generated on write and stored, never rendered per read** (Resolved: index
generation, below), by the shared index runtime of `signing-service.md`. Every completed write
regenerates the whole `index.yaml` from the repository's post-write membership and version
documents, writes it as the repository-level metadata document, and the snapshot that the write
creates captures it in its delta like any other document. Reads serve the stored bytes. This is
the design the brief names: a write-triggered index, and at scale a CAS-backed metadata document.

The handler's part is the generator and nothing else: the optional `Indexer` interface returns a
pure `index.Generator` from `internal/format/helm/index`, which renders `index.yaml` from the
records the write leaves and names, through `Affects`, the one document key every write on the
repository invalidates; the runtime in `internal/index` regenerates before the write commits,
and the handler package holds no renderer and requests no regeneration (AC3). What this format
requires of the service, each a criterion of that spec: regeneration inside every completed
write, on an upload, a management operation, a seed-path write and a retention pass alike, with a
refused write leaving no document (its AC1); one snapshot per publish under concurrency, each
snapshot's index listing exactly the charts that snapshot holds (its AC3 and AC28, the contention
rule below); CAS storage above the inline threshold, surviving a sweep while referenced (its
AC5); generation with no key and no signature record, because Helm's index is unsigned (its
AC24); and serving through `ServeDocument` (its AC11), whose `Last-Modified` is the serving
pointer's forward-moving freshness record (`data-model.md`, "Freshness scoped to the pointer") and
whose `ETag` changes on a repoint, so no handler code sets those headers. Helm clients send no
conditional request (below), so those headers serve intermediaries rather than `helm`, but a
rollback is never hidden from a cache in between.

Why not render on read, as npm and PyPI do: their documents are per package, O(package) per
request. This one is O(repository), and the client fetches it whole on every update with no
conditional request. Rendering a multi-megabyte YAML document on every `helm repo update`
across a fleet is the hot path of the format spent on serialisation, and the same bytes would
be rendered identically every time between writes.

What the regeneration produces and how it is stored:

- `apiVersion: v1`, `generated` set to the write's time, `entries` keyed by exact chart name,
  each version entry carrying the version document's chart metadata, `created`, `digest` as
  bare hex of the CAS key, and a single `urls` entry `charts/{name}-{version}.tgz`, relative,
  so the same stored bytes are correct behind any externally visible base URL and the client's
  same-host credential rule covers the chart fetch. Entries are sorted newest version first
  within a chart, as `helm repo index` emits them.
- The document is inline below the model's size threshold and a digest-referenced CAS blob
  above it (`data-model.md`, resolved metadata document storage); a large hosted index is then
  protected by the **fourth mark root** (`storage-and-gc.md`, CAS-backed metadata documents,
  current and snapshot-held) and the snapshot delta stays O(change) because it references the
  document by digest. Each regeneration supersedes the previous digest, which is that root's
  ordinary end of life.
- Concurrent writes contend inside the runtime, not in the handler: the regeneration runs before
  each write's commit against the membership that write sees, under the runtime's lock wait and
  bounded retry (`signing-service.md` AC28, a lock timeout failing the write rather than
  committing without regeneration). Two concurrent uploads therefore produce two snapshots, each
  holding an index consistent with its own membership, and the later one enumerates both charts
  (its AC3; AC4 here).
- An empty repository serves `apiVersion: v1`, `entries: {}` and a `generated` timestamp from
  its creation, because `helm repo add` fetches the index immediately and refuses a 404.

Relation to `write-triggered-services-prototype.md`: this is the same class of service, one
publish invalidating a repository-wide document that must be regenerated before any client can
resolve anything, with the second of that document's three distinguishing properties absent.
Helm's index is **not signed by the repository**: signing in this ecosystem is per chart, by the
publisher's own key, in the `.prov` file, so no secret ever reaches the handler and only the
index half of the service is used (`signing-service.md`, "Two halves, one write"). The
prototype's question 1, whether the regeneration is expressed through the pinned five methods
plus `Deps` or needs a new method, is answered for every consumer by the `Indexer` optional
interface and the write path dispatching it (`signing-service.md`'s resolved trigger and
renderer decisions, was Q1 and Q3 there; `format-handler-interface.md`, "Optional interfaces
discovered at registration"), pending the re-open's verdict recorded in Blocking preconditions.
What carries over unchanged is its question 3: whether the regeneration lands in the same
snapshot as the publish under concurrency, which AC3 and AC4 assert for this format.

### The upload API is ChartMuseum's publish route

The chart repository guide specifies reads only. The publish contract this registry serves is
ChartMuseum's upload route (Resolved: upload API, below), because it is the one the ecosystem's
clients already drive: `helm cm-push` 0.11.1 was captured sending `POST .../api/.../charts` as a
chunked `multipart/form-data` body with a single `chart` file part
(`Content-Type: application/octet-stream`, `Transfer-Encoding: chunked`, no `Content-Length`,
`User-Agent: Go-http-client/1.1`), `?force` appended under `--force`, and `Authorization` as
Basic from `--username/--password` or the repository entry, or as `Bearer <token>` from
`--access-token`. Gitea's Helm registry documents `POST .../helm/api/charts` and GitLab's
`POST .../packages/helm/api/{channel}/charts` with `--form chart=@...`, so a user's existing
CI scripts and this contract agree.

In the terms of `management-surfaces-and-the-oracle.md`: the **effect** of every write here is
fully oracle-testable (a new entry in the index a real `helm repo update` fetches, a chart a
real `helm pull` retrieves), and the **trigger** has a real client for chart upload
(`cm-push`) and none for provenance attachment or deletion. That split decides which routes
are this format's: upload is the ecosystem's publish, served in ChartMuseum's shape, while the
two operations with no client are the registry-owned management API's (below), vouched for by
our own integration tests with their effects proven by `helm`, which is stated rather than
implied.

Two routing facts follow from the plugin's URL construction, both captured:

- `cm-push` builds the upload URL as `path.Join(contextPath, "api", trimPrefix(repoPath,
  contextPath), "charts")`. Captured again on the Fable recheck of 2026-10-08 against a logging
  server with a repository URL of `http://host/helm/{repo}`: with no context path it POSTs to
  **`/api/helm/{repo}/charts`**, a root-anchored path outside the handler's format-first mount,
  after a `GET /helm/{repo}/index.yaml`; with `--context-path /helm` it POSTs to
  `/helm/api/{repo}/charts`, outside the repository's own prefix, which would reserve `api` as
  a chart repository name; with **`--context-path /helm/{repo}`** (the repository's full path,
  or `HELM_REPO_CONTEXT_PATH` set to it) it POSTs to **`/helm/{repo}/api/charts`**, exactly the
  wire table's `{repo}/api/charts` and the shape Gitea's and GitLab's `curl` scripts use, and
  fetches no index first. This registry serves only that route, inside the repository's prefix,
  and claims no root-anchored mount and no reserved repository name (Resolved: cm-push URL
  shape, below); the documented invocation sets the context path to the repository's path, and
  the conformance case uses it.
- `cm-push` uploads only the `chart` part. A `.prov` file sitting next to the archive was
  **not** attached (three captures: archive with provenance beside it, archive alone, and a
  chart directory it packaged itself), and passing the `.prov` path as the chart argument is an
  error. Provenance therefore reaches a hosted repository only through the multipart `prov`
  field of an upload or the management API's attachment operation, both `curl`-driven.

Upload semantics this registry enforces, each with a refusal that names its reason in the body
because `cm-push` and `curl --fail-with-body` surface it:

- The chart name and version are read from the archive's `Chart.yaml`, never from the
  uploaded filename (ChartMuseum's `ChartPackageFilenameFromContent` does the same); an
  archive that is not a valid chart, or whose version is not valid semver, is refused, since
  the client would drop the entry at load and the version would be unreachable anyway.
- **A coordinate that already exists is refused with 409 and nothing is committed**, and
  `?force` does not override it; a coordinate deleted from the repository stays retired
  (Resolved: republish and retirement).
- A provenance file must name the chart coordinate it accompanies and carry a `files:` sum equal
  to that archive's CAS digest; otherwise it is refused and nothing is committed (Resolved:
  provenance coherence). The signature is not verified.
- The stored filename is `{name}-{version}.tgz` and the served URL basename is the same, for
  the `helm verify` reason above.
- The upload is the handler's own wire write in `management-api.md`'s terms. Its body is spooled
  through the bounded facility handed through `Deps` under `management.publish_spool_limit`
  (its resolved spool-bound decision, was Q20, AC36), which matters here because `cm-push` sends
  a chunked body with no `Content-Length` (captured), and an over-limit upload is refused
  `too-large` before parsing. The write declares its **claim**, the coordinate `{name}/{version}`
  read from the spooled archive's `Chart.yaml`, on the transaction it opens, checked when declared
  and again at commit (its resolved retirement-comparison decision, was Q14, AC12): the
  retirement and duplicate refusals compare the claim, never the bounded peek `Scope(r)` reported
  for authorization, so an archive whose `Chart.yaml` is not its first entry is still refused on
  its true coordinate. Helm declares **no unchanged publish** (its was-Q15): an identical
  re-upload is the 409 above, as ChartMuseum answers it, and `cm-push` retries nothing.

### Management operations

This format follows the precedent the Cluster 5 format specs share (`pypi.md`, `npm.md` and
`ansible-collections.md`), whose common home is
`docs/internal/plans/foundation/management-api.md`: each operation here is a kind of that spec's
closed operation vocabulary (its kind table and cross-format reconciliation table carry Helm's
rows), declared by the handler through the optional `Operator` interface (its resolved dispatch
decision, was Q2), with no client binding, because no Helm client drives either route and that
spec's binding rule refuses a route with nothing but `curl` behind it:

- **The surface is registry-owned, not ChartMuseum-shaped.** Deleting a chart version and
  attaching a provenance file to an existing version are the kinds `delete-version` and
  `attach` on the one management API. ChartMuseum's own routes for them are not served, so an
  alias would be a per-format management surface with nothing but `curl` behind it; the npm
  precedent of binding a client's own routes applies only where a client exists. This spec
  defines what each operation means and what `helm` sees afterwards; the shared spec defines
  URL shape, request form, authorization, problem types and audit.
- **Each operation is a completed logical write through the shared write path**, which here
  means the write that regenerates `index.yaml`: `Apply` runs inside the operation's write
  transaction and the same `Indexer` hook as an upload regenerates the index before commit
  (`signing-service.md` AC1), so exactly one snapshot per operation holds the regenerated index
  (`management-api.md` AC5), none for a refused one, and no blob-store object is deleted
  directly (its AC6), so space returns only through retention pruning and `storage-and-gc.md`'s
  single-deleter boundary holds unchanged.
- **The action follows the kind, never the format.** `delete-version` requires `delete` and
  `attach` requires `push` (the kind table); `Authorize` reports the object `{name}/{version}`
  for each, so a patterned grant manages only charts inside its pattern.
- **Hosted only.** A proxied or virtual repository creates no snapshots and takes its removals
  from the upstream per the removal table below, so either operation against one answers `405`
  with problem type `repository-type` (its AC7).

| Operation | Kind | Effect a client sees | Write | Action |
|---|---|---|---|---|
| Delete a chart version | `delete-version` | The next `helm repo update` no longer lists it, `helm pull` of it fails, the other versions still pull, and its coordinate is retired so a re-upload is refused | One write, removing the archive and its provenance and regenerating the index | `delete` |
| Attach a provenance file to an existing version | `attach` | `helm pull --verify` of a previously unverifiable chart succeeds; the index is unchanged, since it does not mention provenance | One write, adding a `File` | `push` |

What this format required of `management-api.md`, and what that spec now provides: the
operation's write reaches this handler through `Operator.Apply` inside the write transaction,
so deletion regenerates the index in the same snapshot (its "Dispatch" section names Helm's
requirement as the case it answers); `attach` runs the provenance coherence check above inside
`Apply` before anything is referenced, a coherence failure refused `validation` (422) and
attaching to a version that already has a provenance file refused `conflict` (409), since
replacing one would change bytes the client already verified (its kind table, Helm's `attach`
row); and the handler returns the deleted coordinate in the operation's `Outcome`, the core
writes the `Retirement` record in the same transaction, and the shared write path refuses any
later upload of it with `retired` (409) (its AC12; `data-model.md` AC35). The trigger of each is
verified by this registry's integration tests plus the `script`-driven conformance case
`management-api.md` AC24 requires for every declared kind, and the effect by a real `helm`.

### What counts as a write

`data-model.md` requires each format spec to declare its ecosystem's write boundaries. Helm's
declaration:

- One `POST /api/charts` is **one** completed logical write, whether it carries the archive
  alone or the archive and provenance together, and the index regeneration it triggers is part
  of that write, not a second one. One snapshot.
- One provenance attachment through the management API is one write: it adds a `File` to an
  existing version. The index does not mention provenance files, but the snapshot still records
  the new file. One snapshot.
- One chart-version deletion through the management API is one write, removing the archive and
  its provenance and regenerating the index, with the coordinate's `Retirement` record written
  in the same transaction outside snapshot content. One snapshot.
- A refused upload of any kind leaves no snapshot.
- A proxied repository creates no snapshots at all, per the model's settled rule; index
  arrival, revalidation and chart materialisation are cache materialisation.

### Provenance, `helm verify`, and supply-chain policy

A `.prov` file is a PGP clearsigned message: the chart's `Chart.yaml` content, a `...`
document separator, and a `files:` map of `{name}-{version}.tgz` to `sha256:<hex>`; a
detached signature over that text follows (grounded in `pkg/provenance/sign.go` and the
fixture produced this run). `helm verify` and `helm pull --verify` check the signature against
the client's keyring (`--keyring`, default `~/.gnupg/pubring.gpg`) and then compare the
archive's sha256 to the sum under its filename; the failure texts are `sha256 sum does not
match for demo-0.1.0.tgz: "sha256:..." != "sha256:..."` for tampered bytes and
`openpgp: invalid signature: hash tag doesn't match` for a tampered provenance.

The handler's role is transport with a coherence check, and its upload path verifies no
signature (the shared verifier's after-commit verdict, below, is `artifact-verification.md`'s
and never gates the upload). Two grounded reasons beyond the sibling ownership question: the ecosystem's own repositories never
verify (ChartMuseum's `ProvenanceFilenameFromContent` checks only that the file starts with the
PGP header and contains `name:` and `version:`), and a registry-side verdict would need a trust
root the model does not hold. The coherence check is cheap and needs no keys: the provenance's
`name` and `version` must equal the coordinate, and its `files:` entry for
`{name}-{version}.tgz` must equal the archive's CAS digest with the `sha256:` prefix stripped.
That catches the mistake `helm verify` would otherwise report as a tampered chart, at upload
time, where the uploader can act on it.

Where this meets `supply-chain-policy.md`: signature state is a policy input that spec consumes,
and its resolved verification-ownership decision (was Q6) names the producer, the shared
`docs/internal/plans/foundation/artifact-verification.md`. That spec exists and lists Helm's
`.prov` as an optional verdict source under its `openpgp` cleartext entry: where the repository
holds an `openpgp` trust set the stored `.prov` is verified after the commit against it and the
verdict is recorded and never enforced (its AC21), so a `.prov` signed by nobody the operator
trusts is still accepted and served exactly as the ecosystem's repositories do, and only a
`supply-chain-policy.md` rule requiring a `verified` verdict refuses the chart at resolution; with
no trust set the verdict is `absent` and nothing changes. The handler runs no verification and
imports nothing of `internal/verify` (`format-handler-interface.md` AC15); the one policy
behaviour it carries is rendering a refusal (Design, "Policy refusals on the wire"). The matrix's
verification column for Helm is filled by the hosted and proxied verification cases
`artifact-verification.md` AC24 requires of every format that asked for an entry, carried here by
AC7. One practical note that spec inherits, learned the hard way this run: Helm's OpenPGP library
rejected an Ed25519 key (`openpgp: unsupported feature: public key type: 22`), so the
conformance fixture key is RSA and the verifier's `openpgp` entry meets the same algorithm limits
as the client.

### Names, versions and the traps in them

- The chart name is an exact string. `Demo` and `demo` are two packages, and a lookup uses the
  index key byte for byte. Filenames on the hosted path are `{name}-{version}.tgz`, and the
  version may contain `+` and `-`, so the handler splits a filename only by looking up the
  coordinate it stored, never by parsing hyphens.
- The version is validated as semver on upload; `helm package` refuses to build a chart whose
  version is invalid, so only a hand-built archive can present one, and the registry refuses it
  rather than storing something every client will drop.
- The URL path carries `+` literally; the router matches it literally.
- `index.yaml` is served with `Content-Type: application/x-yaml`, as ChartMuseum does; charts
  as `application/gzip`; provenance as `text/plain`. The client ignores all three (it sends an
  `Accept` only on chart fetches and never negotiates), so there is no content negotiation to
  design, only a transcript to keep tidy.
- **Every byte goes out through the serving door**, and the handler sets no freshness or
  cacheability header (`signing-service.md` AC11): the hosted and merged index through
  `ServeDocument`, the rewritten proxied index through the same form under the cache-scoped
  record, and every archive and provenance file through `ServeFile` with the CAS digest as a
  strong `ETag` (its resolved non-generated-documents decision, was Q14, AC32). The serve policy
  Helm's profile declares (its was-Q18) is `Cache-Control: no-cache` on `index.yaml`, which is
  mutable and refetched whole, and `public, max-age=31536000, immutable` on archives and
  provenance files, whose coordinates never change bytes (Resolved: republish and retirement).
  Those values reach a cache only on an anonymous read of an anonymously readable repository:
  on a private repository, or on any request `helm` authenticated, the door serves `private`
  with `public` removed (its resolved cacheability decision, was Q25, AC38), and since `helm`
  sends Basic preemptively on every fetch of a private repository, a shared cache in front of
  the registry never stores a private chart. A `HEAD` on any hosted route is the `GET` with the
  body withheld, `Content-Length` included (its was-Q24).

### The proxied path

The upstream is any classic chart repository: a GitHub Pages site, a CDN-fronted host, a
ChartMuseum, another registry. The handler owns the request and classifies for the proxy
layer's fetch-and-cache API per the settled decisions in `proxy-cache.md`:

- **`index.yaml` is mutable metadata with a TTL**, revalidated conditionally where the upstream
  supports it: measured this run, charts.jetstack.io returns an `ETag` (and
  `cache-control: public, max-age=14400`), and the GitHub Pages repositories
  (prometheus-community, ingress-nginx, argo-helm) return both `ETag` and `Last-Modified`. The
  proxy sends `If-None-Match` / `If-Modified-Since` where it holds a validator, so an unchanged
  6 MB index costs a 304 rather than 6 MB, which is the whole economy of this path given the
  client never sends a conditional request itself. Serve-stale applies to it exactly as to a
  packument.
- **Every URL in a served index points at this registry**, and the rewrite happens at
  materialisation, not per read. The cached representation is the rewritten index, stored as
  the remote repository's repository-level document (a CAS blob above the threshold, protected
  by the current-document half of the fourth mark root, since a proxied repository has no
  snapshots to protect it). Materialisation resolves each entry's `urls` against the upstream
  repository URL with Helm's own `ResolveReferenceURL` semantics, records one `RemoteFile` per
  resolved upstream URL, and emits a single relative URL `charts/{basename}` where `basename`
  is the upstream URL's basename **preserved exactly**, because the client's local filename and
  `helm verify` depend on it. Without the rewrite, an index whose charts live on
  `github.com/.../releases/download/...` (the GitHub Pages norm) sends every pull straight past
  the cache, and the same-host credential rule means the client would not even authenticate
  there; AC9's no-upstream-contact assertion is what catches an unrewritten index.
- **The rewritten index keeps every other field verbatim**, including `digest`, `created`,
  `deprecated`, annotations and unknown keys, so a client sees the upstream's metadata with only
  the location changed. The `digest` is preserved because it is what stream-and-verify checks
  the fetched bytes against; an entry with no digest is fetched without verification and marked
  so in the `RemoteFile` row, stated here because it is a real gap in older upstream indexes.
- **Archives and provenance files are immutable artifacts**: cached indefinitely, fetched
  stream-and-verify against the index digest for archives, never committed on a mismatch or a
  truncated body. Provenance files have no digest in the index and are fetched unverified;
  they are self-verifying to the client, which is the only party holding the key.
- **Missing charts and missing provenance files are negatively cached** with the short TTL. A
  missing upstream `.prov` is common (most public charts are unsigned), and the client turns
  the 404 into its own `failed to fetch provenance` error under `--verify`, which the proxy must
  pass through as a 404 rather than an error page.
- **The upstream adapter, not the handler, decides which host gets the upstream credential.**
  A chart URL on a third host (GitHub releases behind a GitHub Pages index) receives the
  upstream repository's credential only if the upstream's host allowlist gives that host the
  `root` role, mirroring the client's own same-scheme-and-host rule; the default is not to
  forward (`upstream-adapters.md` AC6, which names this spec's request as the case it answers).
  The transport half of what this spec asked of an "adapter" is the `https` adapter under the
  upstream's allowlist and credential role; the protocol half, the `ResolveReferenceURL`
  resolution above, stays in this handler's proxied-path derivation, and the handler imports
  nothing of `internal/upstream` (its AC29).
- **The served index carries a cache-scoped `Last-Modified`.** A remote has no pointer, so the
  rewritten index is served under `proxy-cache.md`'s cache-scoped freshness record (its AC22):
  `Last-Modified` moves forward on every adopted upstream revision whatever the upstream's own
  header says, a `304` answers only an exact match, and an upstream revision older than the one
  adopted is not adopted and is recorded as a divergence. Helm clients send no conditional
  request, so this protects intermediaries, not `helm`; no handler code sets the header.

Helm has **no explicit security-removal signal** in its index format: no holding-package
convention, no status marker, nothing a purge rule could key on. Every upstream removal
therefore falls on the keep-and-flag side of the settled table, and a security purge reaches
Helm content only through the advisory channel of the shared security-signal rule that
`proxy-cache.md` and `supply-chain-policy.md` state verbatim. **That channel currently has nothing
to carry for Helm**: OSV's `ecosystems.txt`, fetched 2026-09-28, lists no Helm or chart
ecosystem, so Helm charts are uncovered under `supply-chain-policy.md`'s coverage rule ("What the
feed covers, per ecosystem"), an advisory-dependent rule on a Helm repository is refused at
configuration as unbindable (its AC11), and coverage arrives only when an operator declares an
OSV-schema source that lists one through `policy.feed.sources` (its resolved advisory-sources
decision, was Q9, and AC21). Coordinate rules and signature-verdict rules bind without it. The
handler reports no advisory key beyond the coordinate itself: the chart name and version are
the only names an advisory could carry, so the core-parsed key `supply-chain-policy.md`'s
resolved advisory-key decision (was Q11, AC24) stores is the package name and the version
string as written; and once a declared source covers Helm, a `local` repository matches public
advisories by coordinate with `coordinate_exemptions` as the operator's lever (its was-Q12,
AC25). The handler classifies each observed event into one of `proxy-cache.md`'s event classes ("Upstream
removal or replacement") and the layer executes the response; Helm's rows of its AC13 table:

| Upstream event, as observed at index revalidation | Classification |
|---|---|
| A version's entry vanishes from `index.yaml` (deleted upstream, or a regenerated index that dropped it) | **Removal with no signal**: keep serving the cached archive under the cached index entry, record an operator-visible divergence and alert once |
| A cached version's `digest` changes upstream (the same coordinate republished with different bytes) | The **revision-bound immutability** class in the layer's response, recorded and alerted, no purge, in its **new-blob-beside-the-old** variant (`proxy-cache.md`'s resolved old-blob decision, was Q20, and AC28): the chart path carries no digest, so the route follows the current adopted revision; the rewritten index this registry serves carries the current revision's `digest`, the next pull fetches the new bytes stream-and-verify against it as a new blob, the commit that creates the new blob's cached reference at the coordinate ends the old blob's in the same transaction, and the divergence record keeps both digests. The earlier reading here, that the served index kept advertising the cached digest and the new bytes were never fetched, was neither of the layer's two variants and is withdrawn on the Fable recheck: a served index whose `digest` disagreed with the bytes the registry would fetch is exactly the incoherence Helm 4's digest-keyed content cache punishes |
| `deprecated: true` appears, or any other metadata field changes | An **ordinary metadata change**, propagated at the next revalidation; never a removal event |
| An upstream index older than the adopted one (a rolled-back or lagging upstream) | **Regression not adopted**: the cached revision stands, a divergence is recorded (`proxy-cache.md` AC22) |
| The whole upstream index becomes unreachable | Serve-stale up to the bound, then error, per the settled revalidation-failure decision |

Detection happens at revalidation: per `proxy-cache.md`'s resolved answer (was Q12) the proxy
layer never polls an upstream, and the only active channel is `supply-chain-policy.md`'s
advisory feed.

What a Helm remote keeps, declared in the terms `proxy-cache.md` settled on its Fable recheck:
the handler retains **no superseded index revision** (its resolved retained-revisions decision,
was Q19: the declared count is zero, and the remote's repository-level document, the rewritten
index, carries no declared blob-digest list beyond itself, its was-Q22), because no chart route
can name a revision and the current rewritten index serves every client; the rewritten index is
a current metadata document LRU eviction never reaches (its was-Q21), while cached archives and
provenance files are cached files under the repository's quota, held by their ordinary cached
references. A `HEAD` on any proxied route is the `GET` with the body withheld, never forwarded,
filling the cache on a cold miss (its was-Q24, AC32); no Helm client sends one (captured: only
`GET` on every surface), so the rule serves intermediaries and `curl`.

Two assertion traps, both grounded this run. The client caches the index locally and reads it
for search and resolution, so a case proving a publish is visible runs `helm repo update` and
asserts the fetch in the transcript. And Helm 4 has a content cache that `helm pull` does not
populate but does consult, so every proxied case starts from fresh `HELM_REPOSITORY_CACHE` and
`HELM_CONTENT_CACHE` state and asserts both directions: the second pull reached this registry
(transcript) and this registry did not contact the upstream (network layer).

### Addressed objects and pattern scopes

`auth.md`'s pattern scopes narrow a credential within one repository by matching the object each
request addresses, and the format declares which object each route reports ("Pattern scopes"
there; `format-handler-interface.md` AC12). Chart names carry no `/` and are exact,
case-sensitive strings, so the canonical object is `{name}/{version}` with the version's literal
`+`, and a pattern for a family of charts is written `acme-*/**`.

| Route | Object kind | Canonical object |
|---|---|---|
| `GET index.yaml` | none | - |
| Chart archive and provenance fetches | named | `{name}/{version}`, resolved from the requested basename through the pointed-at snapshot's index on the hosted path and the cached index's `RemoteFile` rows on the proxied one; a basename resolving to no coordinate reports none, and is answered as the existence rule dictates |
| Upload, `POST api/charts` | named, or none | `{name}/{version}` from the archive's `Chart.yaml` when a bounded peek finds it as the archive's first entry; none otherwise (the resolved upload-object decision below) |

The management operations report `{name}/{version}` too, a requirement on
`management-api.md` recorded in "Management operations".

What that gives and costs, applying `auth.md`'s rules rather than re-deciding them. Every Helm
read starts from `index.yaml`, which enumerates every chart in the repository, so a credential
holding **only** a patterned `pull` is refused at the first request and no Helm read works under
it; `helm cm-push` under the documented context path fetches no index (captured 2026-10-08), so a
credential holding a patterned `push` alone publishes its own charts without any `pull`. `auth.md`'s fourth object kind, the
`descriptor` a patterned `pull` may read (its resolved name-free-document decision, was Q23),
does not apply here and the table above is unchanged by it: a descriptor is a repository-wide
document whose body carries no name, version or digest of any object the repository holds, held
by the sentinel test `format-handler-interface.md` AC12 runs on every descriptor route, and
`index.yaml` names every version and digest of every chart, so it fails that test by
construction and stays `none`. The limitation is therefore decided, not an oversight: helm, like
dnf and zypper, needs an unpatterned `pull`, where cargo runs end to end under a patterned one
because its `config.json` names nothing. Pattern narrowing on this format is practical for
writes: a CI credential confined to its own charts holds an unpatterned `pull` beside a `push`
(and, for deletion, a `delete`) patterned `acme-*/**`. A patterned `pull` still narrows direct
chart and provenance fetches, which AC16 asserts rather than leaving implied.

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines, on a
chart or provenance fetch of either path, the handler answers `403` with ChartMuseum's JSON
error shape (an `error` member) naming the policy and rule, or naming the signal for a coordinate
condemned under the shared security-signal rule, written through the shared refusal writer
`WriteRefusal` in `internal/format` (`format-handler-interface.md` AC14), which on an HTTP/1.1
connection also writes the status line `HTTP/1.1 403 Refused by policy: {condition}`
(`supply-chain-policy.md`'s resolved refusal-status-line decision, was Q10, and AC18), so a client
that shows only the status line still shows the condition. `403` rather than the existence
rule's `404`, because the caller is authorized and the content is what is refused. Whether
`helm pull` surfaces the body, the phrase or only the code is AC17's capture to settle, and the
same capture fills Helm's `pending` row of that spec's "When a refusal binds, per format" table
(whether `helm` falls back to another configured repository on a `403`) in the same change (its
AC20; the harness refuses a policy case while the row is `pending`, `conformance-harness.md`
AC26).

### Capabilities and lifecycle

`Capabilities()` declares proxy support `supported`, reference-implementation availability
`available` (ChartMuseum for the write half, Resolved: corpus reference), `Virtual: supported`
and `Rename: supported` (`format-handler-interface.md` AC13). Virtual aggregation is possible
where `hex.md` found it was not, because nothing on this wire is signed with or names the
repository: a virtual Helm repository serves one merged `index.yaml` over its members' indexes,
built by the same generator as a hosted index and run as the `index.merge` job on the shared
runner (`signing-service.md` AC19; `async-operations.md` AC11), with a chart name taken from
the first member in member order that holds any version of it and later members' versions of
that name omitted, the dependency-confusion-closing rule every format spec adopts; chart URLs
in the merged index are relative under the virtual mount and resolve through the member that
supplied the entry, the previous merged index serves until the new one commits, and no merge
runs on a request's path. The profile declares the one **member input** the merge reads from a
member, in the shape `signing-service.md`'s resolved member-input decision gives it (was Q21
there, AC35): the literal path `index.yaml` under the member's mount, no template and no
derivation, so the round bound is one, a virtual's creation or a member-list change adding a
never-adopted remote enqueues that remote's first fetch of exactly that path, and registration
refuses a profile without it. Helm's index is unsigned, so the signed-virtual admission rule
(its was-Q20) does not bind: a proxied member's rewritten index contributes under its own
adoption, whatever anchor class it adopted under. A rename changes no served byte: no Helm document carries the
repository name, every hosted URL is relative, so the index serves under the new base URL
unchanged and the old name answers exactly what a never-existing repository answers, while every
generated document, retirement and grant still resolves to the repository by identity
(`repository-lifecycle.md` AC12). That criterion requires `conformance/helm/rename_test.go`,
enforced by the harness's case-set validator (`conformance-harness.md` AC26); AC19 carries it
with a real `helm repo update` and `helm pull` from the renamed repository.

### Conformance, auth and the corpus

Helm authenticates classic repositories with HTTP Basic (`foundation/auth.md`, the Basic form:
token as password, username not an input); the harness's existing `setup` token provisioning
suffices, injected as `--username`/`--password` on `helm repo add` (and `--pass-credentials`
where a case's index deliberately points at a second host). `helm cm-push` reads the same
repository entry, or takes `--access-token` for the Bearer form, so no new harness vocabulary is
needed. `foundation/auth.md`'s client table carries the `helm` row from this spec's captures
(verified at HEAD on the Fable recheck: Basic only on the classic read path, sent preemptively
and confined to the repository's scheme and host unless `--pass-credentials`; Bearer only from
`cm-push --access-token`), so AC15 and AC16 are no longer gated on a correction. Every response
the authentication layer writes itself, the challenge, the authentication error and the
existence-rule `404` a private repository answers `helm repo add`, carries
`Cache-Control: private, no-store` (`auth.md`'s resolved refusal-cacheability decision, was Q27,
and AC38), which AC15 observes. The OCI path's `helm registry login` is the docker credential
flow `oci.md` owns.

`Scope(r)` for this handler: `GET index.yaml`, chart and provenance fetches map to `pull`;
`POST api/charts` to `push`; the addressed object each reports is declared in "Addressed objects
and pattern scopes" above. The management operations are the management API's routes, not this
handler's. A request the mapping cannot classify is denied as unauthorized, per the interface's
settled failure mode, and `helm repo add` against a repository the caller cannot read receives
the same 404-shaped `index.yaml` response as against one that does not exist (auth's
existence-oracle rule).

The pinned clients are one from each major: **Helm 3.22.0 and Helm 4.3.0**, the newest of each
line at authoring (releases page, 2026-09-26). The skew is real even though the wire traffic
was identical: Helm 4 decodes the index digest and consults a content cache that Helm 3 does
not have, and Helm 3 leaves security support in November 2026 while remaining the installed
majority. `cm-push` is pinned at 0.11.1.

The recorded surface for AC13's corpus, named now because a thin recording script yields a thin
specification: `helm repo add` (empty and populated), `helm repo update`, `helm search repo`,
`helm pull` by exact version, by constraint and by `--devel`, `helm pull --verify` with the
provenance present and absent, `helm install --dry-run` from a named repository, a pull of a
`+`-versioned chart, a relative-URL index and an absolute cross-host index, `cm-push` of a new
chart and of a duplicate (the 409), and `curl` upload of chart plus provenance. ChartMuseum's
provenance-upload and delete routes are not recorded, since this registry does not serve them;
the management operations that replace them have no reference implementation to record, and
their effects replay through the index-refetch and pull flows above. Recording gates on the
harness's redaction criterion (`conformance-harness.md` AC13). The reference for the read half is
two public repositories of different hosting classes; the reference for the write half is
ChartMuseum itself, because no public registry serves the write API (Resolved: corpus
reference, below): the harness's exception table carries the `helm` row, and the write half's
corpus manifest pins the ChartMuseum image by digest at recording time (its was-Q7, AC28).

## Acceptance Criteria

- [ ] AC1: `helm repo add`, `helm repo update`, `helm search repo` and `helm pull repo/chart`
      work against a hosted repository for both pinned clients (Helm 3.22.0 and Helm 4.3.0),
      including against a freshly created empty repository, with every index the registry
      serves loading in both clients with zero skipped entries, asserted from the clients'
      output and the transcript.
- [ ] AC2: A chart uploaded through the real `helm cm-push` plugin under the documented
      `--context-path /helm/{repo}`, reaching `POST /helm/{repo}/api/charts` and no other
      route, and a chart plus
      provenance uploaded through the multipart `chart` and `prov` fields, each become visible
      to a subsequent `helm repo update` and retrievable by `helm pull` with bytes whose sha256
      equals the index entry's `digest`; and `helm pull --verify` succeeds against the uploaded
      provenance, all through the real client.
- [ ] AC3: Each chart upload, and each provenance attachment and chart-version deletion through
      the management API, produces exactly one snapshot whose repository-level document is the
      regenerated `index.yaml`, produced by the shared index runtime from this handler's
      `Indexer` generator in `internal/format/helm/index` with no renderer and no regeneration
      request in the handler package; repointing the repository to an earlier snapshot serves
      that snapshot's index and charts to the real client with a `Last-Modified` that moved
      forward; and a refused upload leaves no snapshot and no regenerated document.
- [ ] AC4: N concurrent uploads of distinct charts produce N snapshots and a final index that
      enumerates every chart with a `digest` equal to the bytes served for it, with no entry
      lost to the concurrent regeneration; an index above the inline size threshold is stored as
      a CAS blob and still serves to the real client after a GC sweep.
- [ ] AC5: Uploading a chart whose coordinate already exists is refused with 409 and a reason
      in the body, with or without `?force`, and nothing is committed; a coordinate that has
      been deleted refuses re-upload the same way; an archive that is not a valid chart or
      whose version is not valid semver is refused with nothing committed.
- [ ] AC6: A chart version deleted through the registry-owned management API's `delete-version`
      operation loses its archive and its provenance, the next `helm repo update` no longer
      lists the version, `helm pull` of it fails, the repository's other versions still pull,
      proven through the real client, and a re-upload of the coordinate is refused `retired`
      through the core-held `Retirement` record after the deleting snapshot has been pruned and
      after a repoint to a snapshot older than the deletion; and a request to ChartMuseum's
      `DELETE /api/charts/{name}/{version}` or `POST /api/prov` route is not served and changes
      nothing.
- [ ] AC7: A provenance upload whose `name` or `version` differs from the coordinate, or whose
      `files:` sum differs from the archive's digest, is refused with nothing committed, both
      through the upload's multipart `prov` field and through the management API's attachment
      operation; a coherent one is served byte-identical, and `helm verify` on the
      pulled pair succeeds, while the handler verifies no signature (proven by an unverifiable
      signature from a key the registry never sees being accepted and then failing only at the
      client); and on a repository holding an `openpgp` trust set the shared verifier records a
      `verified` verdict for a `.prov` signed by a listed key and a `failed` one for the
      unverifiable signature, on the hosted and the proxied path, neither refusing the write or
      the serve until a policy rule requires `verified`.
- [ ] AC8: A chart versioned with build metadata (`0.2.0+build.1`) uploads, lists and pulls
      through the real client with the literal `+` in the request path; chart names are matched
      exactly and case-sensitively, so `Demo` and `demo` are distinct packages and a pull under
      the wrong case fails as it does against `helm repo index` output.
- [ ] AC9: The proxied path serves a chart fetched from an upstream repository and serves the
      second pull from cache, with the second pull reaching this registry and the upstream
      receiving no request, both asserted from the transcript and at the network layer against
      fresh `HELM_REPOSITORY_CACHE` and `HELM_CONTENT_CACHE` state, for an upstream index with
      relative URLs and for one with absolute URLs on a different host than the index, which
      also proves the served index carried no upstream URLs and preserved each chart's URL
      basename.
- [ ] AC10: A proxied index is revalidated after its TTL and not before, proven against a
      mutating test upstream: a version published upstream becomes visible to `helm repo
      update` after the TTL and, absent an explicit refresh, not before; and where the upstream
      returned an `ETag` or `Last-Modified`, the revalidation is a conditional request answered
      by 304, asserted at the network layer.
- [ ] AC11: A proxied archive whose bytes fail verification against the index `digest` commits
      nothing and is retried later; `helm pull --verify` through the proxy succeeds when the
      upstream serves a provenance file and fails with the client's own `failed to fetch
      provenance` error when it does not, the latter negatively cached so a repeat within the
      negative TTL makes no upstream request.
- [ ] AC12: A cached version vanishing from the upstream index keeps serving with a recorded
      operator-visible divergence; a cached version whose upstream `digest` changes is recorded
      and alerted with both digests, the served index carries the current digest, the next pull
      fetches and verifies the new bytes and the old blob's cached reference ends in that commit
      (`proxy-cache.md` AC28), with no purge of anything else; a `deprecated`
      mark appearing upstream propagates as an ordinary metadata change; an upstream index older
      than the adopted one is not adopted and the served index's `Last-Modified` never moves
      backwards; no upstream index event purges cached content - Helm's side of the settled
      removal table in `proxy-cache.md` (its AC13 and AC22).
- [ ] AC13: Replay-match passes against a corpus recorded from the two public reference
      repositories for the read surface and from a pinned ChartMuseum for the write surface,
      covering the recorded surface named in Design.
- [ ] AC14: A chart pushed with `helm push oci://` to an OCI repository on this registry
      appears in no classic index, a chart uploaded to a classic repository is not pullable by
      `oci://` reference, and the same archive published both ways results in exactly one
      stored object and one `Blob` row.
- [ ] AC15: The real client authenticates with a registry token as the Basic password on index,
      chart and provenance fetches; `helm cm-push` authenticates with the same token as Basic
      and as `Bearer`; an invalid token is rejected on every one of those paths; and an
      unauthenticated `helm repo add` against a private repository fails with the same
      `not a valid chart repository` outcome as against a repository that does not exist, that
      `404` carrying `Cache-Control: private, no-store` (`auth.md` AC38); and every authenticated
      index, chart and provenance response carries `private` without `public`, while an
      anonymous chart fetch from a public repository carries the declared `public, max-age=31536000,
      immutable` (`signing-service.md` AC38).
- [ ] AC16: A token holding an unpatterned `pull` beside `push` under the pattern `acme-*/**`
      uploads `acme-web` through the real `helm cm-push` and is refused uploading `other-web`,
      with no snapshot created by the refusal; an upload whose archive does not begin with
      `Chart.yaml` is refused to that token and accepted for an unpatterned `push`; a token
      holding only `pull` under the same pattern is refused `index.yaml`, so `helm repo add`
      under it fails, while a direct fetch of `acme-web`'s chart URL succeeds and of
      `other-web`'s is refused; and in proxied mode the patterned-`pull` token fetches an
      in-pattern chart URL and is refused another.
- [ ] AC17: A chart or provenance fetch the shared policy layer refuses answers `403` with a body
      naming the policy, written through `WriteRefusal` and carrying the status line
      `HTTP/1.1 403 Refused by policy: {condition}` on the raw socket, on the hosted and the
      proxied path; a real `helm pull` of the refused version exits non-zero with an error that
      names the refusal, and the same case captures whether `helm` falls back to a second
      configured repository offering the same chart, filling Helm's row of
      `supply-chain-policy.md`'s binding table; and an advisory-dependent policy rule attached
      to a Helm repository is refused at configuration as uncovered while no configured advisory
      source lists a Helm ecosystem.
- [ ] AC18: Provenance attached through the registry-owned management API's `attach` operation
      to a version that had none makes a previously unverifiable chart pass `helm pull
      --verify`; attaching to a version that already has one is refused `conflict` (409) and an
      incoherent one `validation` (422), each with nothing committed; deletion requires `delete`
      and attachment `push`, a principal without the needed action is refused with no snapshot
      created, and either operation against a proxied or virtual repository is refused `405`
      with problem type `repository-type`.
- [ ] AC19: The handler's `Capabilities()` declares proxy `supported`, reference-implementation
      availability `available`, `Virtual: supported` and `Rename: supported`; a real
      `helm repo update` and `helm pull` from a renamed repository succeed under the new name in
      both modes while the old name answers exactly what a never-existing repository answers,
      and a `cm-push` into the renamed repository regenerates its index as before; and a virtual
      repository over a hosted and a proxied member serves one merged `index.yaml` from which
      the real client pulls a chart of each, a chart name present in both members listing only
      the first member's versions, the merge having run on the shared runner and never on a
      request's path.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/helm/hosted_test.go` (pinned Helm 3.22.0 and 4.3.0; empty-repository case; zero-skipped-entries assertion on client output) |
| AC2 | conformance | `conformance/helm/publish_test.go` (cm-push with `--context-path /helm/{repo}`, the transcript showing only `POST /helm/{repo}/api/charts`; curl multipart chart+prov; digest assertion from the transcript) |
| AC3 | integration + architecture test | `internal/format/helm/snapshot_test.go` (snapshot count per write, refused-upload no-snapshot, repoint serves the older index with `Last-Modified` moved forward) + a conformance repoint case in `conformance/helm/hosted_test.go`; `internal/format/helm/arch_test.go` (no renderer and no regeneration request in the handler package; the generator lives in `internal/format/helm/index`); `internal/index/dispatch_test.go` (`signing-service.md` AC1, with the Helm generator as a registered fixture) |
| AC4 | integration + property | `internal/format/helm/concurrent_publish_test.go` (N concurrent uploads, index completeness and digest agreement); `internal/format/helm/large_index_test.go` (threshold crossing, sweep, then a real-client fetch) |
| AC5 | conformance | `conformance/helm/publish_test.go` (duplicate with and without `?force`; retired coordinate; invalid archive and invalid semver; snapshot-table assertion via the registry state, not the client) |
| AC6 | integration + conformance | trigger: `internal/format/helm/manage_delete_test.go` (the `delete-version` operation's snapshot, index regeneration and `Retirement` record; `retired` after pruning and across a backwards repoint on an injected clock, `management-api.md` AC12; the unserved ChartMuseum routes); effect: `conformance/helm/delete_test.go` (the `script` deletes through the management endpoint, then transcript assertions on the index refetch and the failed pull; the `script`-driven case `management-api.md` AC24 requires for the kind) |
| AC7 | conformance + integration | `conformance/helm/provenance_test.go` (`helm verify` round trip; unknown-key signature accepted then failing at the client); `internal/format/helm/prov_coherence_test.go` (name, version and sum mismatches through the multipart field and the attachment operation); `conformance/helm/verification_test.go` (hosted and proxied verdict cases over a `trust` entry holding the fixture RSA key, `artifact-verification.md` AC21 and AC24) |
| AC8 | conformance | `conformance/helm/naming_test.go` (`+` version through the real client; case-distinct packages) |
| AC9 | conformance | `conformance/helm/proxied_test.go` (transcript + network-level assertion; fresh client caches in setup; relative-URL and absolute-cross-host upstream fixtures; basename-preservation assertion on the served index) |
| AC10 | conformance | `conformance/helm/proxied_ttl_test.go` (mutating local stand-in upstream with and without validators; 304 asserted at the network layer; the remote's metadata TTL shortened to seconds through its `repositories` entry and waited through on the real clock, since the harness provides no clock, `conformance-harness.md`'s resolved time decision, was Q8, AC30) |
| AC11 | integration + conformance | `internal/format/helm/fetch_integrity_test.go` (digest mismatch commits nothing); `conformance/helm/proxied_verify_test.go` (`--verify` with and without an upstream `.prov`; negative-cache assertion at the network layer) |
| AC12 | integration | `internal/format/helm/removal_test.go` (test upstream presenting each event class, an older upstream index included, the changed-digest case asserting the new blob's fetch and the old reference's end in one commit; the shared-layer half is `proxy-cache.md` AC13's, AC22's and AC28's) |
| AC13 | conformance | `conformance/helm/replay_test.go` |
| AC14 | integration + conformance | `internal/format/helm/oci_separation_test.go` (one stored object, one `Blob` row, no cross-listing); `conformance/helm/separation_test.go` (`helm push oci://` then `helm repo update` on every classic repository; classic upload then `helm pull oci://` failing) |
| AC15 | conformance | `conformance/helm/auth_test.go` (Basic on reads; cm-push Basic and Bearer; invalid token on each path; private-versus-missing `helm repo add` outcome; `Cache-Control` asserted from the transcript on the `404`, on an authenticated chart fetch and on an anonymous public one) |
| AC16 | conformance + unit | `conformance/helm/auth_test.go` (the pattern-refusal case `format-handler-interface.md` AC7 requires, in both modes; pattern-scoped tokens provisioned through the `credentials` key; `curl` for the direct chart fetches); `internal/format/helm/scope_object_test.go` (the object table, per route, including the bounded-peek upload cases, `format-handler-interface.md` AC12) |
| AC17 | conformance + integration | `conformance/helm/policy_test.go` (hosted and proxied modes; rules through the `policies` key, a controlled advisory through `advisories` from a second declared source; raw-socket status line; second-repository fallback capture that fills the binding-table row, `supply-chain-policy.md` AC18 and AC20); `internal/format/helm/policy_config_test.go` (advisory rule refused as uncovered while no source lists a Helm ecosystem, `supply-chain-policy.md` AC11) |
| AC18 | integration + conformance | trigger: `internal/format/helm/manage_prov_test.go` (the `attach` operation's snapshot, `validation` on an incoherent file, `conflict` on an existing one, action refusals, `repository-type` on remote and virtual); effect: `conformance/helm/provenance_test.go` (the `script` attaches through the management endpoint, then `helm pull --verify` succeeds; the `script`-driven case `management-api.md` AC24 requires for the kind) |
| AC19 | unit + conformance | `internal/format/helm/capabilities_test.go` (the four declarations, `format-handler-interface.md` AC13); `conformance/helm/rename_test.go` (`repository-lifecycle.md` AC12, presence enforced by `conformance-harness.md` AC26; update, pull and `cm-push` under the new name); `conformance/helm/virtual_test.go` (merged index over a hosted and a proxied member, first-member chart resolution); `internal/format/helm/virtual_merge_test.go` (per-name first member; the merge runs as `index.merge`, `signing-service.md` AC19; the profile's literal member input `index.yaml` and registration refusing a profile without it, its AC35) |

The runner-enforced obligations, both modes with unauthenticated and unauthorized cases in each,
apply from the sibling specs and are not restated per criterion. The case set needs nothing
beyond keys already in the harness's closed `setup` vocabulary (its resolved closed-vocabulary
decision, was Q4): `repositories` (a virtual member order for AC19), `credentials` (AC16's
pattern-scoped tokens included), an `upstreams` stand-in, `state` for pre-published charts and a
pre-deleted coordinate (a seeded `Retirement` record), `trust` for AC7's `openpgp` key set, and
`policies` with `advisories` for AC17; fresh client cache directories are case-container state
rather than server provisioning. A hosted `state` entry is servable only once its index is
generated, which needs no seed-side code: the index runtime runs before every commit on a
repository whose handler declares an `Indexer`, the seed write included (`signing-service.md`
AC21; `conformance-harness.md` AC24). The management operations are called from a case's
`script`, since `setup` never calls a management endpoint.

## Implementation Phases

### Phase 1: Hosted read and write
- Waits on `docs/internal/plans/foundation/signing-service.md` Phase 1 (Blocking
  preconditions)
- The `Indexer` generator in `internal/format/helm/index` producing the repository-level index
  document on write, empty-repository index at creation, `Capabilities()`,
  chart and provenance serving under `charts/{name}-{version}.tgz`, ChartMuseum's upload route
  under the format-first mount, coordinate extraction from `Chart.yaml`, semver validation,
  republish and retirement refusals, provenance coherence on upload, the write-boundary
  declaration exercised end to end, the per-route addressed-object declaration with the
  bounded upload peek, the `403` policy rendering

### Phase 2: Scale, concurrency and lifecycle
- Threshold crossing into the CAS-backed document, concurrent-upload regeneration under the
  runtime's lock wait, the snapshot and repoint cases, the rename and virtual cases (AC19)

### Phase 3: Proxied path
- Index classification with conditional revalidation, `ResolveReferenceURL`-faithful
  resolution and URL rewriting at materialisation with basename preservation, `RemoteFile`
  rows per upstream URL, stream-and-verify against the index digest, negative caching of
  charts and provenance files, the removal table

### Phase 4: Corpus, clients and the seam
- Recording session across the named surface against the two public read references and a
  pinned ChartMuseum (after the harness redaction gate), replay-match, the second pinned
  client, the OCI separation cases, experiment-log entries

### Phase 5: Management operations
- Waits on `docs/internal/plans/foundation/management-api.md` reaching `planned`
- The `Operator` declaration of `delete-version` and `attach`, chart-version deletion with
  index regeneration and the core-held `Retirement` record, provenance attachment with the
  coherence check, their integration tests and `script`-driven effect cases (AC6, AC18)

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. Seven questions were raised while authoring and each was adopted at its own written
recommendation under the owner's standing delegation of 2026-09-26, recorded below as adopted
rather than decided so the owner can find and reverse any of them. Each is folded through
Scope, Design, the criteria and the Test Plan above. The 2026-09-26 cross-spec reconciliation
revised Q2's adoption to the registry-owned management API the Cluster 5 format specs converged
on, and raised and adopted Q8 on what an upload reports to the pattern scopes.

### Resolved: what an upload reports as its addressed object (was Q8, raised and adopted 2026-09-26)

**Adopted 2026-09-26 under the owner's standing delegation.** Option C: `Scope(r)` for
`POST api/charts` peeks a bounded prefix of the body and reports `{name}/{version}` from the
archive's `Chart.yaml` when that is the archive's first entry, which is where `helm package`
writes it; when the cap is reached first, or the first entry is anything else, it reports none.
Folded through Design ("Addressed objects and pattern scopes"), AC16 and Phase 1. Rechecked on
Fable 2026-10-08: confirmed, and the record under-stated one thing the fold now says: the peek
authorizes only; the coordinate the retirement and duplicate checks compare is the claim declared
from the spooled archive (`management-api.md` was-Q14), so a mis-placed `Chart.yaml` can widen
nothing.

The judgment call it settles: `auth.md` requires every route to report the object it addresses,
and an upload's coordinate is inside the gzipped tarball, never in the URL. The object has to be
known before the artifact is accepted, or authorizing a patterned `push` means spooling an upload
nobody has authorized yet; `ansible-collections.md` met the same problem with a multipart
filename that precedes the bytes, and this format's filename is not a reliable coordinate.

**Recommendation (adopted):** C, because it reads the coordinate from the only authoritative
source, before accepting the artifact, and fails safe whenever it cannot.

| Option | You get | It costs |
|---|---|---|
| **A. Upload reports none** | Nothing to parse before authorization | A patterned `push` can never upload, so a CI credential cannot be confined to its own charts on this format at all |
| **B. Split the multipart part's filename as `{name}-{version}.tgz`** | No body read before authorization | A chart name and a semver version both contain hyphens, so the split is ambiguous (`a-1.0.0-1.0.0.tgz`), the raw-body upload has no filename, and the filename is not what validation trusts, so a mislabelled part must be caught by a second check |
| **C. A bounded peek at the archive's first entry when it is `Chart.yaml`** | The coordinate validation will use, read before acceptance; works for the raw and multipart forms; fails safe to none | `Scope(r)` reads and replays a bounded body prefix, including a small `prov` part preceding the chart, and a hand-built archive with `Chart.yaml` elsewhere uploads only under an unpatterned `push` |

**Why this is yours:** it decides whether pattern-confined publishing exists on this format and
what `Scope(r)` may read to support it.

Accepted cost: the bounded replayed prefix, and hand-built archives needing an unpatterned
`push`. A lost because it removes the feature for the format's main write; B lost because its
answer is ambiguous exactly where chart names and prerelease versions meet.

### Resolved: classic and OCI are disjoint namespaces that share only the CAS (was Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a `helm` repository
speaks the classic protocol and an `oci` repository speaks OCI; a chart is visible on the path
it was published through and no other; the two representations deduplicate into one `Blob`
because the OCI chart layer is the `.tgz` byte for byte (measured this run).

The question was whether a chart pushed one way should be visible the other way, and what that
means for the shared model. The recommendation was A because the ecosystem draws the same line
(`helm repo add oci://` is refused by both majors; `helm pull oci://` never reads an index;
Harbor 2.8 removed its classic path instead of unifying), because every incumbent that offers
both keeps them as separate repositories (Gitea, GitLab), and because the alternatives break the
constitution: a projection needs one handler to read another's opaque metadata document, and a
unified handler would have the Helm handler serving under the OCI handler's root-anchored
`/v2/` claim.

| Option | You get | It costs |
|---|---|---|
| **A. Disjoint: two repository formats, one CAS** | Matches the ecosystem and every incumbent; no cross-handler read; the count stays honest (classic is the Helm row, OCI is OCI reach) | An operator wanting both must publish twice, and the duplicate costs only rows, never bytes |
| **B. Projection: a classic index generated over an OCI repository's charts** | One publish, two paths | The Helm handler must read the OCI handler's version documents to build the index, which is forbidden, and tag-to-version mapping (`_` for `+`) is guessed in reverse |
| **C. One unified Helm handler serving both wire protocols** | One namespace | The unified handler must serve `/v2/`, which the OCI handler claims root-anchored, and re-implements OCI push |

Accepted cost: no cross-visibility, stated in Scope. Why the alternatives lost: both require a
boundary crossing the constitution names as evidence the model is wrong, and neither is
something a Helm user expects, since the client itself treats the two as different worlds.
Folded into Context, Scope, the "Classic and OCI" section and AC14. Rechecked on Fable
2026-10-08: confirmed.

### Resolved: the ChartMuseum API is the hosted write surface (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation, and revised the same day by the
cross-spec reconciliation.** Option D, added in that revision: serve ChartMuseum's `POST
/api/charts` (raw or multipart `chart` plus optional `prov`) under the repository's format-first
path with its response shapes, as this format's publish route, serve none of its read API, and
serve neither `POST /api/prov` nor `DELETE /api/charts/{name}/{version}`: provenance attachment
and chart-version deletion are operations of the registry-owned management API,
`docs/internal/plans/foundation/management-api.md` (since authored: the kinds `attach` and
`delete-version`, whose reconciliation table carries Helm's rows).

As first adopted this record chose A, serving all three ChartMuseum write routes as the
format-local precedent, "as it is recommended in" the PyPI and Galaxy management questions of
the time. Those questions were then resolved the other way the same day: `pypi.md`'s resolved
hosted-yank decision (was Q1) and `ansible-collections.md`'s resolved version-deletion decision
(was Q5) put every management operation on one registry-owned API, binding a client's own route
onto it only where a client drives it (`npm.md`). A's own accepted cost foresaw exactly this:
"if the owner later settles a cross-format management surface, these endpoints remain as the
ecosystem-facing aliases". The revision declines the aliases, because the precedent that
settled the surface declines them wherever no client drives the route, and Helm's `POST
/api/prov` and `DELETE` have none.

The question was which upload API a format with no standard one should present, and it is the
management-surface precedent question `management-surfaces-and-the-oracle.md` frames: the
trigger for chart upload has a real client (`cm-push`), the triggers for provenance upload and
delete do not, and all three effects are oracle-testable through `helm`.

| Option | You get | It costs |
|---|---|---|
| **A. ChartMuseum's write API, verbatim shape** | `cm-push` and every existing curl-based CI script work unchanged; Gitea and GitLab users find the shape they know; chart upload has a real-client trigger | Two of three endpoints are verified by our integration tests plus the client-observed effect, stated rather than implied; a per-format convention rather than one cross-format surface |
| **B. A registry-owned generic upload endpoint** | One shape across formats | No Helm client drives it, so even chart upload loses its real-client trigger, and every user rewrites their pipeline |
| **C. No classic upload; classic repositories are populated by proxying or by OCI push** | Nothing verified without a client oracle | Hosted classic repositories become read-only, contradicting the family row's hosted claim, and pushes the Q1 projection back in through the side door |
| **D. ChartMuseum's upload route as the publish; deletion and provenance attachment on the registry-owned management API** (adopted in revision) | `cm-push` and every curl publish script work unchanged; chart upload keeps its real-client trigger; one management surface across formats, as PyPI, npm and Galaxy have | A CI script that deletes or attaches provenance through ChartMuseum's routes must change its URL, and those two operations wait on `management-api.md` |

Accepted cost: D's, stated in Scope; B lost because no Helm client drives it; C lost as above; A
lost in revision because its aliases are the per-format management surface the cross-format
precedent rules out wherever no client drives the route. Folded into Context, Scope, the wire
table, "The upload API is ChartMuseum's publish route", "Management operations", the
write-boundary declaration, AC2, AC3, AC5, AC6, AC7, AC18 and Phase 5. Rechecked on Fable
2026-10-08: confirmed; the publish is the handler's own wire write under the shared spool bound
and claim declaration (`management-api.md` was-Q14, was-Q20), stated in the upload semantics.

### Resolved: no root-anchored mount for cm-push's default URL (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: the handler claims only
its format-first mount and the documented `cm-push` invocation sets the context path. Rechecked
on Fable 2026-10-08: confirmed, and amended in the value. As adopted the documented flag was
`--context-path /helm`, under which the plugin POSTs to `/helm/api/{repo}/charts`: inside the
mount but outside the repository's prefix, so the handler would have had to reserve `api` as a
repository name and the route would have disagreed with the wire table's `{repo}/api/charts`.
Captured on the recheck: `--context-path /helm/{repo}` (the repository's full path, or
`HELM_REPO_CONTEXT_PATH` set to it) makes the plugin POST to `/helm/{repo}/api/charts`, the
wire table's route, with no index fetch first; that is the documented invocation now, folded
through "The upload API is ChartMuseum's publish route", AC2 and its row.

The question arose because without a context path the plugin POSTs to `/api/helm/{repo}/charts`,
outside any format-first mount, and `format-handler-interface.md` admits a root-anchored mount
only as a recorded carve-out for host-addressed ecosystems.

| Option | You get | It costs |
|---|---|---|
| **A. Claim a root-anchored `/api/` mount for the plugin's default shape** | `cm-push` works with no flag | A second root carve-out on a format that is not host-addressed, colliding with the registry's own `/api/` management surface (since reserved: `management-api.md` mounts under the reserved first segment `api`, and `format-handler-interface.md` AC11 refuses the collision at registration), for one plugin option the user can set in an environment variable |
| **B. Format-first only; document `--context-path /helm`** | The mount scheme stays as settled; no collision; `curl` users are unaffected because they type the full URL | One flag or environment variable in the documented `cm-push` invocation, and a user who omits it gets a 404 with a docs pointer |

Accepted cost: the flag. Why A lost: the carve-out class exists for ecosystems that leave no
room for a path prefix, and this one merely defaults to the wrong prefix. Folded into "The
upload API is ChartMuseum's publish route" (the section's name since the Q2 revision), AC2 and
its Test Plan row.

### Resolved: republish refused, deleted coordinates retired (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: an upload under an
existing coordinate is refused with 409 regardless of `?force`, and a coordinate deleted from
the repository cannot be re-uploaded.

ChartMuseum refuses by default and permits overwrite only when the operator enables it; the
proxy layer of this registry caches archives forever on the assumption that a coordinate's
bytes never change, and Helm 4 keys its content cache by the index digest. The question was
whether operator convenience outranks that immutability.

| Option | You get | It costs |
|---|---|---|
| **A. Refuse republish; retire deleted coordinates** | Coordinate-to-bytes immutability holds for every downstream cache and for this registry's own proxied-of-hosted deployments; matches ChartMuseum's default, so the write corpus replays | A botched upload is fixed by bumping the version, which operators occasionally resent |
| **B. Honour `?force` as ChartMuseum's `--allow-overwrite` does** | In-place correction | Downstream caches serve stale bytes under an unchanged digest-less coordinate forever, and the `digest` in old indexes silently stops matching |
| **C. Refuse while it exists, allow after delete** | Operators can correct through delete-then-upload | The same stale-cache hazard as B, one step later, and retention keeps the old bytes in snapshots anyway |

Accepted cost: bump the version. This follows the direction `pypi.md`'s resolved
filename-retirement decision (was Q3) adopted, for the same reason: immutability is what this
registry's own caching layer relies on for correctness. The retired coordinates are core-held
`Retirement` records, the cross-format home `management-api.md`'s resolved
retirement-placement decision (was Q3) settled after this record first placed them in the
package-level document; the semantics are unchanged.
Folded into Scope, the upload semantics, "What counts as a write", AC5 and AC6. Rechecked on
Fable 2026-10-08: confirmed, with the consequence stated that Helm declares no unchanged publish
(`management-api.md` was-Q15) and that the proxied changed-digest case follows the layer's
new-blob variant rather than pinning the cached digest.

### Resolved: provenance is coherence-checked, never signature-verified (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: an uploaded `.prov`
must name the coordinate it accompanies and carry a `files:` sum equal to the archive's CAS
digest, or it is refused; its signature is not verified by the registry.

| Option | You get | It costs |
|---|---|---|
| **A. Coherence check, no signature verification** | Catches the uploader's mistakes at upload time with no keys; stores exactly what the client will verify; leaves signature ownership to `supply-chain-policy.md` (its verification-ownership question, since resolved, was Q6) | A provenance signed by nobody the operator trusts is accepted and served, exactly as the ecosystem's repositories do |
| **B. Store verbatim with no checks, as ChartMuseum does** | Maximal fidelity to the reference | A mismatched provenance is served and every `helm pull --verify` of that chart fails with a tampering message that blames the registry |
| **C. Verify the signature against an operator-configured keyring** | Only trusted-key provenance is served | Pre-empts the producer question then open in `supply-chain-policy.md` (resolved since: the producer is `artifact-verification.md`), and the registry takes on keyring management that `auth.md`'s nothing-is-invented posture warns against |

Accepted cost: a divergence from ChartMuseum's accept-anything behaviour, which goes on the
recorded exception list before the write corpus is expected to replay. Folded into Scope,
"Provenance, helm verify, and supply-chain policy" and AC7.

What "never signature-verified" means since the producer was written: the handler and the upload
path still verify nothing and refuse nothing on signature grounds, which is this answer. The
signature ownership A left to `supply-chain-policy.md` landed in
`artifact-verification.md`, whose `openpgp` cleartext entry lists the stored `.prov` as an
optional verdict source: with an `openpgp` trust set on the repository the shared verifier
records a `verified` or `failed` verdict after the commit (its AC21), recorded and never
enforced, and only a policy rule requiring `verified` refuses the chart, at resolution. That is
not C: no keyring is required, nothing is refused at upload, and with no trust set the verdict
is `absent` and behaviour is exactly as adopted. AC7 asserts both halves. Rechecked on Fable
2026-10-08: confirmed.

### Resolved: the hosted index is generated on write and stored (was Q6)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: every completed write
regenerates `index.yaml` and stores it as the repository-level metadata document, inline below
the size threshold and as a CAS blob above it, captured in the snapshot delta; reads serve the
stored bytes.

| Option | You get | It costs |
|---|---|---|
| **A. Write-triggered, stored document** | Reads are a blob serve, however large the repository; the index is part of the snapshot so rollback restores it exactly; the fourth mark root protects it as designed | Every write pays an O(repository) regeneration and contends on one document's revision token; a regeneration bug is persisted until the next write |
| **B. Render from snapshot state on every read** | No stored document, no contention, the npm and PyPI shape | O(repository) YAML rendering on every `helm repo update` from every client, on a document the client refetches whole and unconditionally |
| **C. Render on read with a per-snapshot render cache** | Amortised rendering | A second cache with its own invalidation, doing what the metadata document already does |

Accepted cost: write-side regeneration cost and contention, both bounded by the index runtime's
lock wait and retry (`signing-service.md` AC28) and measured by AC4. Since adopted, the
regeneration moved from the handler's own write into the shared index runtime, which runs this
handler's `Indexer` generator before every commit (`signing-service.md`'s resolved Helm
question, was Q1 there); the stored-document shape this record chose is unchanged. Folded into
Scope, the mapping table, "The index document" and AC3, AC4. Rechecked on Fable 2026-10-08:
confirmed; the stored document now goes out through `ServeDocument` under the declared serve
policy, and the chart files through `ServeFile` (`signing-service.md` was-Q14, was-Q18).

### Resolved: corpus reference is two public read repositories plus ChartMuseum for writes (was Q7)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the read half of the
corpus is recorded against two public classic repositories of different hosting classes
(a GitHub Pages repository such as prometheus-community, and a CDN-fronted host such as
charts.jetstack.io), and the write half against a pinned ChartMuseum container, because no
public registry exposes the write API.

`conformance-harness.md`'s authoritative-reference rule names "the public canonical registry",
and this format has none: Artifact Hub is a catalogue, not a repository, and every public chart
repository is an independent static host.

| Option | You get | It costs |
|---|---|---|
| **A. Two public read references of different hosting classes; ChartMuseum for the write half** | The read corpus captures both validator behaviours (ETag-only and ETag plus Last-Modified) and both URL styles; the write corpus comes from the de facto standard's own implementation | The write half is recorded against a local reference, which the harness rule reserves for offline iteration, so it must sit on that spec's recorded exception list with this reason |
| **B. One public repository as canonical** | Simplest rule | Whichever is chosen is not canonical for anyone, and its hosting quirks become the specification |
| **C. ChartMuseum for everything** | One reference, both halves | The read corpus inherits ChartMuseum's serving quirks (its `application/x-yaml`, its absolute-URL option) as if they were the ecosystem's |

Accepted cost: an exception-list entry in `conformance-harness.md` for the write half, under its
resolved authoritative-reference decision (was Q3 there), which still names only public
registries as authoritative. Rechecked on Fable 2026-10-08: confirmed; the entry exists (that
spec's exception table, `helm` row, naming a ChartMuseum container and this record), and under
its resolved digest-placement decision (was Q7 there, AC28) the write half's corpus manifest
pins the ChartMuseum image by digest at recording time, so the row names the reference by kind
and version and the manifest carries the digest. Folded into "Conformance, auth and the corpus"
and AC13.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | 4d1aeb1 | authoring pass: grounded first draft, not a review | Wire contract captured from three real Helm releases (3.20.0 installed on this host, 3.22.0 and 4.3.0 downloaded) and `helm cm-push` 0.11.1 against a logging server: unconditional whole-index refetch on every update by every client, preemptive Basic auth confined to the repository's scheme and host unless `--pass-credentials`, `ResolveReferenceURL` semantics for relative URLs, literal `+` in the path, exact case-sensitive name keys, the filename dependency of `helm verify`, Helm 4's hex-decoded index digest and its non-populating content cache, `deprecated` as pure metadata, the chunked single-part `cm-push` upload that never attaches a `.prov`, and the plugin's `/api/{repo}/charts` versus `/{context}/api/{repo}/charts` URL shapes. Published contract grounded in the Helm chart repository, provenance and registries guides, the Helm source at v3.20.0 and v4.3.0, the ChartMuseum source and README, and the `helm-push` source. The classic-versus-OCI seam measured with a local `registry:2`: the OCI chart layer digest equals the `.tgz` sha256, the index `digest` and the `.prov` sum, so the paths share one `Blob` and nothing else. Public upstream validators measured with `curl -sI` (jetstack: ETag; GitHub Pages: ETag plus Last-Modified; prometheus-community index 6.4 MB). Seven questions written in the decision shape and adopted under the standing delegation: disjoint classic and OCI namespaces sharing only the CAS; the ChartMuseum write API as the management surface; no root-anchored mount for `cm-push`'s default URL; republish refused and deleted coordinates retired; provenance coherence-checked but never signature-verified; the hosted index generated on write and stored as the repository-level document; two public read references plus ChartMuseum for the write corpus. Fifteen criteria, each with a Test Plan row. Sibling consequences listed in the authoring report, not applied. Stays draft, awaiting first review. |
| 2026-09-26 | da0aecd | cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Applied: the management surface re-homed from ChartMuseum's routes onto the registry-owned management API (Q2 revised to option D; Context, preconditions, Scope, the wire table, a new 'Management operations' section stating what this format requires of `management-api.md`, the write boundary, AC2, AC3, AC6, AC7, the new AC18, Test Plan and Phase 5); the retirement set placed in the package-level document; the charter AC12 signing-and-index-service precondition; the addressed-object table with Q8 raised and adopted (bounded peek at a first-entry `Chart.yaml`, none otherwise) and AC16, including the consequence that patterned-only `pull` cannot run helm; the policy rendering (AC17); stale citations of supply-chain Q6, proxy-cache Q12, harness Q4, pypi Q1 and Q3 and ansible Q5 rewritten to what was adopted. Stays draft. |
| 2026-09-28 | 2cf0d01 | cross-spec reconciliation of the foundation wave. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` targeting this file verified against the source spec's current text before applying. Index: the handler's through-`Deps` regeneration assumption withdrawn for `signing-service.md`'s `Indexer` generator in `internal/format/helm/index` run by the index runtime (its resolved Helm question, was Q1; AC1, AC3, AC5, AC11, AC24, AC28), `Last-Modified` from the pointer's freshness record, the prototype's question 1 recorded as answered pending the re-open (AC3 gains the architecture half). Management: `delete-version` and `attach` as kinds on the `Operator` interface, `Apply` inside the write so the index regenerates in the same snapshot, `conflict` 409 for an existing `.prov` and `validation` 422 for an incoherent one (management-api reconciliation item 8), `repository-type` 405 on remote and virtual, the retirement set moved to the core-held `Retirement` record (AC6, AC18). Descriptor kind: `index.yaml` stays `none` with the reason recorded against `auth.md`'s resolved Q23 and the sentinel test (Open item 37). Verification: `artifact-verification.md`'s `openpgp` cleartext entry lists the `.prov` as an optional verdict source, recorded and never enforced (AC7 extended, verification case added). Policy: `WriteRefusal` and the refusal status line (`supply-chain-policy.md` was Q10, AC18), the binding-table row filled by AC17's case (AC20), and the coverage question answered: OSV `ecosystems.txt` fetched 2026-09-28 lists no Helm ecosystem, so Helm is uncovered until a `policy.feed.sources` source declares one (AC17 extended). Proxied: `upstream-adapters.md` AC6 and AC29 cited, cache-scoped freshness (proxy-cache AC22), the removal rows mapped onto the shared event classes with a regression row (AC12). New "Capabilities and lifecycle" section and AC19 (`Virtual: supported` over an `index.merge`-built merged index, `Rename: supported`, `rename_test.go`). Seeding through the write-path hook (signing-service AC21, harness AC24) and the `trust` key recorded. The `auth.md` `helm` row correction is still owed to that spec and now gates AC15 and AC16. Stays draft. |
| 2026-09-28 | 15ced69 | cross-spec reconciliation of the Wave 1 folds on Opus: completion check of the question records the interrupted batch-3 agent was finishing. Not a review | Not a review. Every `### Resolved:` record checked for completeness (decision shape, adoption line, accepted cost, folding list) and for folding into the body. Q1, Q2, Q4, Q6 and Q8 complete and folded. Fixed: Q3's folding list named the pre-revision section "The upload API is a management surface", now "The upload API is ChartMuseum's publish route"; Q5 ("never signature-verified") gained a paragraph reconciling it with the optional after-commit `openpgp` verdict `artifact-verification.md` AC21 records for a stored `.prov`, and the Design sentence "the registry ... verifies no signature" now says the handler's upload path, which the paragraph beneath it already assumed; Q7's accepted cost states its `conformance-harness.md` exception entry is still owed. No criterion changed. Stays draft. |
| 2026-10-08 | ecb2028 | Fable gate review: full review pass over the whole, the Opus reconciliation edits treated as unreviewed, plus re-examination of every question record | Brought current: `auth.md`'s `helm` row verified at HEAD and the AC15/AC16 gate wording lifted; `conformance-harness.md`'s `helm` exception row verified and its was-Q7 digest manifest cited (was-Q7 here confirmed); the virtual's literal member input `index.yaml` declared (`signing-service.md` was-Q21, AC35) and the signed-virtual admission rule recorded as not binding; every byte through the serving door with `ServeFile` for files and a declared serve policy (`no-cache` on the index, `immutable` on files), the cacheability floor on private repositories and authenticated requests (`signing-service.md` was-Q25, AC38; `auth.md` was-Q27, AC38) and `HEAD` as the body-withheld `GET` on both paths (`signing-service.md` was-Q24, `proxy-cache.md` was-Q24); the publish as a wire write under the spool bound with a declared claim and no unchanged publish (`management-api.md` was-Q14, was-Q15, was-Q20); retained revisions zero, index never evicted (`proxy-cache.md` was-Q19, was-Q21, was-Q22); the advisory key as the coordinate and `coordinate_exemptions` (`supply-chain-policy.md` was-Q11, was-Q12); AC10's TTL case on the real clock through a shortened repository TTL (`conformance-harness.md` was-Q8). Adversarial findings, each captured against `helm cm-push` 0.11.1 and a logging server on this host: the adopted `--context-path /helm` makes the plugin POST to `/helm/api/{repo}/charts`, outside the repository's prefix and disagreeing with the wire table, which would have reserved `api` as a repository name; `--context-path /helm/{repo}` POSTs to `/helm/{repo}/api/charts`, the wire table's route, with no index fetch first, so was-Q3 is amended to that value (AC2 and its row), and the claim that `cm-push` always reads the index before uploading is corrected (a patterned `push` alone can publish). The proxied changed-digest row pinned the cached digest and never fetched the new bytes, a shape neither of `proxy-cache.md`'s two variants allows; rewritten to the new-blob-beside-the-old variant (its was-Q20, AC28) with AC12 and its row amended. Q1, Q2, Q4, Q5, Q6, Q8 confirmed. Sibling consequences reported, not applied: `proxy-cache.md`'s event-class table carries no Helm rows. Open Questions empty, every criterion mapped: draft to planned. |
