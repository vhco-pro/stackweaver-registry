---
status: draft
status_description: "Authored 2026-09-26 at 4d1aeb1 as a grounded first draft: the classic index.yaml wire contract captured from three real Helm releases (3.20.0, 3.22.0, 4.3.0) and the cm-push plugin against a logging server, the ChartMuseum write API grounded in its source, and the classic-versus-OCI relationship settled. All seven questions adopted under the owner's standing delegation; awaits its first review."
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
  contract: the `helm cm-push` plugin drives it, and Gitea and GitLab expose the same shape.
  Adopting it is a management-surface decision in the sense of
  `docs/internal/analysis/management-surfaces-and-the-oracle.md`, and it is taken deliberately
  below rather than by default.

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

**The write-triggered services finding must exist.** `write-triggered-services-prototype.md`
AC7 produces the finding on whether a write-triggered regeneration is expressed through the
pinned five methods plus `Deps` or needs a new method, and whether it preserves one snapshot
per publish under concurrency. This format's index regeneration is the unsigned instance of
that class, and Design assumes the through-`Deps` shape; if the finding says otherwise, the
"index document" section is revised to the mechanism the re-open adopts before Phase 1 begins.

## Scope

**In scope:**

- The classic repository read surface: `index.yaml`, chart archives and provenance files at the
  URLs the index advertises, for `helm repo add`, `helm repo update`, `helm search repo`,
  `helm pull` and `helm install` from a named repository, against pinned Helm 3 and Helm 4
  clients.
- Hosted index generation as a write-triggered, repository-wide document: regenerated as part
  of every completed write, stored at the repository level of the shared model, captured in the
  snapshot delta, and served byte-for-byte.
- The ChartMuseum write API as the hosted upload surface: `POST /api/charts` (raw or multipart
  with `chart` and optional `prov` fields), `POST /api/prov`, and
  `DELETE /api/charts/{name}/{version}`, driven by the real `helm cm-push` plugin and by
  `curl`, with refusal of a republish under an existing coordinate (Resolved: republish and
  retirement, below).
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
- **ChartMuseum's read API** (`GET /api/charts`, `GET /api/charts/{name}`,
  `HEAD /api/charts/{name}/{version}`, the `templates` and `values` sub-resources). No Helm
  client reads them: `helm cm-push` fetches `index.yaml` to detect a repository and nothing
  else (captured), and the index is the ecosystem's read contract. A UI-era listing surface
  belongs to the registry's own management API, not to a per-format imitation.
- **Signature verification of provenance files by the registry.** `supply-chain-policy.md` Q6
  owns who verifies signatures, and provenance is designed to be verified by the client against
  its own keyring; the registry stores and serves it faithfully (coherence-checked, not
  signature-checked). The signature AC arrives with that producer spec, per the precedent that
  spec set.
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
| Provenance upload | `POST {repo}/api/prov`, raw `.prov` body; `201 {"saved": true}` |
| Delete | `DELETE {repo}/api/charts/{name}/{version}`; removes the archive and its provenance; `200 {"deleted": true}` |
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

The package-level document carries nothing in v1: Helm keeps no package-wide mutable state
(dist-tags and `latest` have no equivalent; `helm` resolves the highest semver client-side from
the index). The level stays available.

Every name-addressed read resolves through the snapshot pointer the handler is given, per the
model's binding constraint. For this format that is the index: the handler serves the
repository-level document of the pointed-at snapshot, so repointing an environment serves that
environment's index and the charts it names, and nothing else.

### The index document: write-triggered, repository-wide, mutable

The hosted index is **generated on write and stored, never rendered per read** (Resolved: index
generation, below). Every completed write regenerates the whole `index.yaml` from the
repository's post-write membership and version documents, writes it as the repository-level
metadata document, and the snapshot that the write creates captures it in its delta like any
other document. Reads serve the stored bytes. This is the design the brief names: a
write-triggered index, and at scale a CAS-backed metadata document.

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
- Concurrent writes contend on the repository document's optimistic revision token. The
  regeneration reads membership after its own write committed and writes the document with the
  revision it read; a stale-revision rejection retries with backoff, per the model's settled
  concurrency rule. Two concurrent uploads therefore produce two snapshots, each holding an
  index consistent with its own membership, and the later one enumerates both charts.
- An empty repository serves `apiVersion: v1`, `entries: {}` and a `generated` timestamp from
  its creation, because `helm repo add` fetches the index immediately and refuses a 404.

Relation to `write-triggered-services-prototype.md`: this is the same class of service, one
publish invalidating a repository-wide document that must be regenerated before any client can
resolve anything, with the second of that document's three distinguishing properties absent.
Helm's index is **not signed by the repository**: signing in this ecosystem is per chart, by the
publisher's own key, in the `.prov` file, so no secret ever reaches the handler and the
signing-service half of the prototype's question does not arise here. What does carry over is
its Q3: whether the regeneration lands in the same snapshot as the publish under concurrency,
which AC3 and AC4 assert for this format. Design assumes the handler performs the regeneration
inside its own write through the metadata store in `Deps`, requiring no interface addition;
this is the precondition recorded above.

### The upload API is a management surface, chosen deliberately

The chart repository guide specifies reads only. The write contract this registry serves is
ChartMuseum's (Resolved: upload API, below), because it is the one the ecosystem's clients
already drive: `helm cm-push` 0.11.1 was captured sending `POST .../api/.../charts` as a
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
(`cm-push`), a `curl`-only path for provenance upload and delete, and no ecosystem client at
all for the last two. So provenance upload and delete are the endpoints our own integration
tests vouch for, with their effects proven by `helm`; that is stated rather than implied.

Two routing facts follow from the plugin's URL construction, both captured:

- `cm-push` builds the upload URL as `path.Join(contextPath, "api", trimPrefix(repoPath,
  contextPath), "charts")`. With a repository URL of `http://host/helm/{repo}` and no context
  path, it POSTs to **`/api/helm/{repo}/charts`**, a root-anchored path outside the handler's
  format-first mount. With `--context-path /helm` (or `HELM_REPO_CONTEXT_PATH=/helm`) it POSTs
  to `/helm/api/{repo}/charts`. This registry serves the latter and claims no root-anchored
  mount (Resolved: cm-push URL shape, below); the documented invocation sets the context path,
  and the conformance case uses it.
- `cm-push` uploads only the `chart` part. A `.prov` file sitting next to the archive was
  **not** attached (three captures: archive with provenance beside it, archive alone, and a
  chart directory it packaged itself), and passing the `.prov` path as the chart argument is an
  error. Provenance therefore reaches a hosted repository only through `POST /api/prov` or the
  multipart `prov` field, both `curl`-driven.

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

### What counts as a write

`data-model.md` requires each format spec to declare its ecosystem's write boundaries. Helm's
declaration:

- One `POST /api/charts` is **one** completed logical write, whether it carries the archive
  alone or the archive and provenance together, and the index regeneration it triggers is part
  of that write, not a second one. One snapshot.
- One `POST /api/prov` is one write: it adds a `File` to an existing version. The index does
  not mention provenance files, but the snapshot still records the new file. One snapshot.
- One `DELETE /api/charts/{name}/{version}` is one write, removing the archive and its
  provenance and regenerating the index. One snapshot.
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

The registry's role is transport with a coherence check, and it verifies no signature. Two
grounded reasons beyond the sibling ownership question: the ecosystem's own repositories never
verify (ChartMuseum's `ProvenanceFilenameFromContent` checks only that the file starts with the
PGP header and contains `name:` and `version:`), and a registry-side verdict would need a trust
root the model does not hold. The coherence check is cheap and needs no keys: the provenance's
`name` and `version` must equal the coordinate, and its `files:` entry for
`{name}-{version}.tgz` must equal the archive's CAS digest with the `sha256:` prefix stripped.
That catches the mistake `helm verify` would otherwise report as a tampered chart, at upload
time, where the uploader can act on it.

Where this meets `supply-chain-policy.md`: signature state is a policy input that spec consumes
and nothing yet produces (its Q6 recommends a sibling verification spec). A stored `.prov` is
that future producer's raw material, retrievable by digest, and this spec adds no policy
behaviour and no signature criterion until the producer exists, per that spec's own precedent.
One practical note for that future spec, learned the hard way this run: Helm's OpenPGP library
rejected an Ed25519 key (`openpgp: unsupported feature: public key type: 22`), so the
conformance fixture key is RSA and any registry-side verification will inherit the same
algorithm limits as the client.

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
  upstream repository's credential only if the upstream configuration says so, mirroring the
  client's own same-scheme-and-host rule; the default is not to forward. Provider quirks live in
  the adapter axis, per `format-handler-interface.md`.

Helm has **no explicit security-removal signal** in its index format: no holding-package
convention, no status marker, nothing a purge rule could key on. Every upstream removal
therefore falls on the keep-and-flag side of the settled table, and a security purge reaches
Helm content only through `supply-chain-policy.md`'s advisory path when that lands. Helm's rows
of `proxy-cache.md` AC13's table:

| Upstream event, as observed at index revalidation | Classification |
|---|---|
| A version's entry vanishes from `index.yaml` (deleted upstream, or a regenerated index that dropped it) | Keep serving the cached archive under the cached index entry, record an operator-visible divergence |
| A cached version's `digest` changes upstream (the same coordinate republished with different bytes) | Keep serving the cached bytes and keep advertising the digest of those bytes, never the new one; record a divergence and alert, because a silent byte swap under one coordinate is the shape of a supply-chain event even though the format cannot mark it as one |
| `deprecated: true` appears, or any other metadata field changes | An ordinary metadata change, propagated at the next revalidation; never a removal event |
| The whole upstream index becomes unreachable | Serve-stale up to the bound, then error, per the settled revalidation-failure decision |

Detection happens at revalidation; whether anything more active exists is `proxy-cache.md` Q12
and is owned there.

Two assertion traps, both grounded this run. The client caches the index locally and reads it
for search and resolution, so a case proving a publish is visible runs `helm repo update` and
asserts the fetch in the transcript. And Helm 4 has a content cache that `helm pull` does not
populate but does consult, so every proxied case starts from fresh `HELM_REPOSITORY_CACHE` and
`HELM_CONTENT_CACHE` state and asserts both directions: the second pull reached this registry
(transcript) and this registry did not contact the upstream (network layer).

### Conformance, auth and the corpus

Helm authenticates classic repositories with HTTP Basic (`foundation/auth.md`, the Basic form:
token as password, username not an input); the harness's existing `setup` token provisioning
suffices, injected as `--username`/`--password` on `helm repo add` (and `--pass-credentials`
where a case's index deliberately points at a second host). `helm cm-push` reads the same
repository entry, or takes `--access-token` for the Bearer form, so no new harness vocabulary is
needed. Two corrections to the `foundation/auth.md` client table follow from the captures and
are listed for that spec rather than applied here: the classic read path is Basic only, sent
preemptively, with no bearer option in `helm repo add`; and Bearer appears on the classic path
only from the `cm-push` plugin's `--access-token`. The OCI path's `helm registry login` is
the docker credential flow `oci.md` owns.

`Scope(r)` for this handler: `GET index.yaml`, chart and provenance fetches map to `pull`;
`POST api/charts` and `POST api/prov` to `push`; `DELETE api/charts/...` to `delete`. A request
the mapping cannot classify is denied as unauthorized, per the interface's settled failure mode,
and `helm repo add` against a repository the caller cannot read receives the same 404-shaped
`index.yaml` response as against one that does not exist (auth's existence-oracle rule).

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
chart and of a duplicate (the 409), `curl` upload of chart plus provenance, `curl` provenance
upload alone, and a delete. Recording gates on the harness's redaction criterion
(`conformance-harness.md` AC13). The reference for the read half is two public repositories of
different hosting classes; the reference for the write half is ChartMuseum itself, because no
public registry serves the write API (Resolved: corpus reference, below).

## Acceptance Criteria

- [ ] AC1: `helm repo add`, `helm repo update`, `helm search repo` and `helm pull repo/chart`
      work against a hosted repository for both pinned clients (Helm 3.22.0 and Helm 4.3.0),
      including against a freshly created empty repository, with every index the registry
      serves loading in both clients with zero skipped entries, asserted from the clients'
      output and the transcript.
- [ ] AC2: A chart uploaded through the real `helm cm-push` plugin, and a chart plus
      provenance uploaded through the multipart `chart` and `prov` fields, each become visible
      to a subsequent `helm repo update` and retrievable by `helm pull` with bytes whose sha256
      equals the index entry's `digest`; `helm pull --verify` succeeds against the uploaded
      provenance, and a provenance uploaded afterwards through `POST /api/prov` makes a
      previously unverifiable chart verify, all through the real client.
- [ ] AC3: Each chart upload, provenance upload and delete produces exactly one snapshot whose
      repository-level document is the regenerated `index.yaml`; repointing the repository to
      an earlier snapshot serves that snapshot's index and charts to the real client, and a
      refused upload leaves no snapshot.
- [ ] AC4: N concurrent uploads of distinct charts produce N snapshots and a final index that
      enumerates every chart with a `digest` equal to the bytes served for it, with no entry
      lost to the concurrent regeneration; an index above the inline size threshold is stored as
      a CAS blob and still serves to the real client after a GC sweep.
- [ ] AC5: Uploading a chart whose coordinate already exists is refused with 409 and a reason
      in the body, with or without `?force`, and nothing is committed; a coordinate that has
      been deleted refuses re-upload the same way; an archive that is not a valid chart or
      whose version is not valid semver is refused with nothing committed.
- [ ] AC6: `DELETE /api/charts/{name}/{version}` removes the archive and its provenance, the
      next `helm repo update` no longer lists the version, `helm pull` of it fails, and the
      repository's other versions still pull, proven through the real client.
- [ ] AC7: A provenance upload whose `name` or `version` differs from the coordinate, or whose
      `files:` sum differs from the archive's digest, is refused with nothing committed through
      both upload forms; a coherent one is served byte-identical, and `helm verify` on the
      pulled pair succeeds, while the registry verifies no signature (proven by an unverifiable
      signature from a key the registry never sees being accepted and then failing only at the
      client).
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
      operator-visible divergence; a cached version whose upstream `digest` changes keeps
      serving the cached bytes under the cached digest with a divergence alert; a `deprecated`
      mark appearing upstream propagates as an ordinary metadata change; no upstream index event
      purges cached content - Helm's side of the settled removal table in `proxy-cache.md`
      (its AC13).
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
      `not a valid chart repository` outcome as against a repository that does not exist.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/helm/hosted_test.go` (pinned Helm 3.22.0 and 4.3.0; empty-repository case; zero-skipped-entries assertion on client output) |
| AC2 | conformance | `conformance/helm/publish_test.go` (cm-push with `--context-path`; curl multipart chart+prov; curl `POST /api/prov` after the fact; digest assertion from the transcript) |
| AC3 | integration | `internal/format/helm/snapshot_test.go` (snapshot count per write, refused-upload no-snapshot, repoint serves the older index) + a conformance repoint case in `conformance/helm/hosted_test.go` |
| AC4 | integration + property | `internal/format/helm/concurrent_publish_test.go` (N concurrent uploads, index completeness and digest agreement); `internal/format/helm/large_index_test.go` (threshold crossing, sweep, then a real-client fetch) |
| AC5 | conformance | `conformance/helm/publish_test.go` (duplicate with and without `?force`; retired coordinate; invalid archive and invalid semver; snapshot-table assertion via the registry state, not the client) |
| AC6 | conformance | `conformance/helm/delete_test.go` (transcript assertions on the index refetch and the failed pull) |
| AC7 | conformance + integration | `conformance/helm/provenance_test.go` (`helm verify` round trip; unknown-key signature accepted then failing at the client); `internal/format/helm/prov_coherence_test.go` (name, version and sum mismatches through both upload forms) |
| AC8 | conformance | `conformance/helm/naming_test.go` (`+` version through the real client; case-distinct packages) |
| AC9 | conformance | `conformance/helm/proxied_test.go` (transcript + network-level assertion; fresh client caches in setup; relative-URL and absolute-cross-host upstream fixtures; basename-preservation assertion on the served index) |
| AC10 | conformance | `conformance/helm/proxied_ttl_test.go` (mutating local stand-in upstream with and without validators; 304 asserted at the network layer) |
| AC11 | integration + conformance | `internal/format/helm/fetch_integrity_test.go` (digest mismatch commits nothing); `conformance/helm/proxied_verify_test.go` (`--verify` with and without an upstream `.prov`; negative-cache assertion at the network layer) |
| AC12 | integration | `internal/format/helm/removal_test.go` (test upstream presenting each event class; the shared-layer half is `proxy-cache.md` AC13's) |
| AC13 | conformance | `conformance/helm/replay_test.go` |
| AC14 | integration + conformance | `internal/format/helm/oci_separation_test.go` (one stored object, one `Blob` row, no cross-listing); `conformance/helm/separation_test.go` (`helm push oci://` then `helm repo update` on every classic repository; classic upload then `helm pull oci://` failing) |
| AC15 | conformance | `conformance/helm/auth_test.go` (Basic on reads; cm-push Basic and Bearer; invalid token on each path; private-versus-missing `helm repo add` outcome) |

The runner-enforced obligations, both modes with unauthenticated and unauthorized cases in each,
apply from the sibling specs and are not restated per criterion. The case set needs nothing
beyond the harness's existing `setup` vocabulary (repositories, tokens, a local stand-in
upstream, and fresh client cache directories, which are case-container state rather than
server provisioning), so this format adds no pressure to `conformance-harness.md` Q4.

## Implementation Phases

### Phase 1: Hosted read and write
- Repository-level index document generated on write, empty-repository index at creation,
  chart and provenance serving under `charts/{name}-{version}.tgz`, the ChartMuseum write
  API under the format-first mount, coordinate extraction from `Chart.yaml`, semver
  validation, republish and retirement refusals, provenance coherence, delete, the
  write-boundary declaration exercised end to end

### Phase 2: Scale and concurrency
- Threshold crossing into the CAS-backed document, concurrent-upload regeneration under the
  revision token, the snapshot and repoint cases

### Phase 3: Proxied path
- Index classification with conditional revalidation, `ResolveReferenceURL`-faithful
  resolution and URL rewriting at materialisation with basename preservation, `RemoteFile`
  rows per upstream URL, stream-and-verify against the index digest, negative caching of
  charts and provenance files, the removal table

### Phase 4: Corpus, clients and the seam
- Recording session across the named surface against the two public read references and a
  pinned ChartMuseum (after the harness redaction gate), replay-match, the second pinned
  client, the OCI separation cases, experiment-log entries

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. Seven questions were raised while authoring and each was adopted at its own written
recommendation under the owner's standing delegation of 2026-09-26, recorded below as adopted
rather than decided so the owner can find and reverse any of them. Each is folded through
Scope, Design, the criteria and the Test Plan above.

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
Folded into Context, Scope, the "Classic and OCI" section and AC14.

### Resolved: the ChartMuseum API is the hosted write surface (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: serve `POST
/api/charts` (raw or multipart `chart` plus optional `prov`), `POST /api/prov` and
`DELETE /api/charts/{name}/{version}` under the repository's format-first path, with
ChartMuseum's response shapes, and serve none of its read API.

The question was which upload API a format with no standard one should present, and it is the
management-surface precedent question `management-surfaces-and-the-oracle.md` frames: the
trigger for chart upload has a real client (`cm-push`), the triggers for provenance upload and
delete do not, and all three effects are oracle-testable through `helm`.

| Option | You get | It costs |
|---|---|---|
| **A. ChartMuseum's write API, verbatim shape** | `cm-push` and every existing curl-based CI script work unchanged; Gitea and GitLab users find the shape they know; chart upload has a real-client trigger | Two of three endpoints are verified by our integration tests plus the client-observed effect, stated rather than implied; a per-format convention rather than one cross-format surface |
| **B. A registry-owned generic upload endpoint** | One shape across formats | No Helm client drives it, so even chart upload loses its real-client trigger, and every user rewrites their pipeline |
| **C. No classic upload; classic repositories are populated by proxying or by OCI push** | Nothing verified without a client oracle | Hosted classic repositories become read-only, contradicting the family row's hosted claim, and pushes the Q1 projection back in through the side door |

Accepted cost: the format-local precedent (each format mirrors its ecosystem's convention) is
set here as it is recommended in `pypi.md` Q1 and `ansible-collections.md` Q5; if the owner
later settles a cross-format management surface, these endpoints remain as the ecosystem-facing
aliases. Folded into Scope, "The upload API is a management surface", the write-boundary
declaration, AC2, AC5, AC6 and AC7.

### Resolved: no root-anchored mount for cm-push's default URL (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: the handler claims only
its format-first mount and the documented `cm-push` invocation sets `--context-path /helm`
(or `HELM_REPO_CONTEXT_PATH=/helm`), under which the plugin POSTs to `/helm/api/{repo}/charts`
inside the mount, as captured this run.

The question arose because without a context path the plugin POSTs to `/api/helm/{repo}/charts`,
outside any format-first mount, and `format-handler-interface.md` admits a root-anchored mount
only as a recorded carve-out for host-addressed ecosystems.

| Option | You get | It costs |
|---|---|---|
| **A. Claim a root-anchored `/api/` mount for the plugin's default shape** | `cm-push` works with no flag | A second root carve-out on a format that is not host-addressed, colliding with the registry's own future `/api/` management surface, for one plugin option the user can set in an environment variable |
| **B. Format-first only; document `--context-path /helm`** | The mount scheme stays as settled; no collision; `curl` users are unaffected because they type the full URL | One flag or environment variable in the documented `cm-push` invocation, and a user who omits it gets a 404 with a docs pointer |

Accepted cost: the flag. Why A lost: the carve-out class exists for ecosystems that leave no
room for a path prefix, and this one merely defaults to the wrong prefix. Folded into "The
upload API is a management surface", AC2 and its Test Plan row.

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

Accepted cost: bump the version. This follows the direction `pypi.md` Q3 recommends, for the
same reason: immutability is what this registry's own caching layer relies on for correctness.
Folded into Scope, the upload semantics, "What counts as a write" and AC5.

### Resolved: provenance is coherence-checked, never signature-verified (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: an uploaded `.prov`
must name the coordinate it accompanies and carry a `files:` sum equal to the archive's CAS
digest, or it is refused; its signature is not verified by the registry.

| Option | You get | It costs |
|---|---|---|
| **A. Coherence check, no signature verification** | Catches the uploader's mistakes at upload time with no keys; stores exactly what the client will verify; leaves signature ownership to `supply-chain-policy.md` Q6 | A provenance signed by nobody the operator trusts is accepted and served, exactly as the ecosystem's repositories do |
| **B. Store verbatim with no checks, as ChartMuseum does** | Maximal fidelity to the reference | A mismatched provenance is served and every `helm pull --verify` of that chart fails with a tampering message that blames the registry |
| **C. Verify the signature against an operator-configured keyring** | Only trusted-key provenance is served | Pre-empts the open producer question in `supply-chain-policy.md`, and the registry takes on keyring management that `auth.md`'s nothing-is-invented posture warns against |

Accepted cost: a divergence from ChartMuseum's accept-anything behaviour, which goes on the
recorded exception list before the write corpus is expected to replay. Folded into Scope,
"Provenance, helm verify, and supply-chain policy" and AC7.

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

Accepted cost: write-side regeneration cost and contention, both bounded by the retry-with-
backoff rule and measured by AC4. Folded into Scope, the mapping table, "The index document"
and AC3, AC4.

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

Accepted cost: an exception-list entry in `conformance-harness.md` for the write half, listed as
a sibling consequence rather than applied here. Folded into "Conformance, auth and the corpus"
and AC13.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | 4d1aeb1 | authoring pass: grounded first draft, not a review | Wire contract captured from three real Helm releases (3.20.0 installed on this host, 3.22.0 and 4.3.0 downloaded) and `helm cm-push` 0.11.1 against a logging server: unconditional whole-index refetch on every update by every client, preemptive Basic auth confined to the repository's scheme and host unless `--pass-credentials`, `ResolveReferenceURL` semantics for relative URLs, literal `+` in the path, exact case-sensitive name keys, the filename dependency of `helm verify`, Helm 4's hex-decoded index digest and its non-populating content cache, `deprecated` as pure metadata, the chunked single-part `cm-push` upload that never attaches a `.prov`, and the plugin's `/api/{repo}/charts` versus `/{context}/api/{repo}/charts` URL shapes. Published contract grounded in the Helm chart repository, provenance and registries guides, the Helm source at v3.20.0 and v4.3.0, the ChartMuseum source and README, and the `helm-push` source. The classic-versus-OCI seam measured with a local `registry:2`: the OCI chart layer digest equals the `.tgz` sha256, the index `digest` and the `.prov` sum, so the paths share one `Blob` and nothing else. Public upstream validators measured with `curl -sI` (jetstack: ETag; GitHub Pages: ETag plus Last-Modified; prometheus-community index 6.4 MB). Seven questions written in the decision shape and adopted under the standing delegation: disjoint classic and OCI namespaces sharing only the CAS; the ChartMuseum write API as the management surface; no root-anchored mount for `cm-push`'s default URL; republish refused and deleted coordinates retired; provenance coherence-checked but never signature-verified; the hosted index generated on write and stored as the repository-level document; two public read references plus ChartMuseum for the write corpus. Fifteen criteria, each with a Test Plan row. Sibling consequences listed in the authoring report, not applied. Stays draft, awaiting first review. |
