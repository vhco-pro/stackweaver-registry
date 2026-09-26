---
status: draft
status_description: "Authored 2026-09-26 as a grounded first draft: the NuGet v3 wire contract captured from the .NET SDK 6.0 (NuGet 6.3.4) and 9.0 (NuGet 6.14.3) images against a logging stub, checked against the Microsoft NuGet server API documentation, the NuGet.Client source and the live api.nuget.org. Eight questions written in decision shape and adopted under the owner's standing delegation; none open. Awaits a /spec review pass."
description: "Spec for the NuGet v3 registry format: the service index, the flat container, the paged registration hives, search and the PackagePublish push and unlist surface, hosted and proxied, with the dotnet CLI as the conformance oracle."
author: michielvha
goal: "Serve .NET teams a private NuGet feed and a nuget.org cache from one handler whose every URL hangs off a service index this registry owns, with unlisting, hard deletion and deprecation as registry-owned management operations the real client observes."
priority: "medium"
issue: 21
created: 2026-09-26
covers:
  - "internal/format/nuget/**"
  - "conformance/nuget/**"
---

# Plan: NuGet registry format

The NuGet v3 protocol, hosted and proxied: a per-repository service index that is the root of
every other URL, the flat container that restore actually reads, the registration hives that
`dotnet add package` and the package listings read, search, and the `PackagePublish` push and
unlist surface, with `dotnet` as the oracle on both paths.

## Context

NuGet sits in Tier 1 of `formats/catalogue.md` under its own single-member family ("NuGet"),
sixth in the charter's build order at step 7, after Maven and Go modules and before Helm
(`project-charter.md`, "Build order"). It is there for its enterprise install base rather than
for protocol novelty, and the protocol is unusually well documented: Microsoft publishes a
resource-by-resource server API reference and a server implementation guide, and the client is
open source. What the documentation does not say, the captures below do.

Count integrity: this spec tests the `dotnet` CLI only, in the two forms the SDK ships (the
MSBuild restore task that `dotnet restore` and `dotnet add package` drive, and the `xplat`
command that `dotnet nuget push`, `dotnet nuget delete` and `dotnet package search` drive; both
are the same NuGet.Client assembly and identify themselves as such). `nuget.exe` and the Visual
Studio package manager are not exercised, so the matrix claims no reach beyond `dotnet`.

Grounding for this draft, stated up front because the constitution asks for evidence or silence:

- **Captured client traffic.** No .NET SDK is installed on this host (`which dotnet nuget mono`
  find nothing), so two pinned SDK images were run in containers against a logging stub:
  `mcr.microsoft.com/dotnet/sdk:9.0` at digest
  `sha256:76077b509918af4ad1d6fcf73e40fe7ffdda263fa0db49ff2125592f9debd034` (SDK 9.0.318, NuGet
  6.14.3) and `mcr.microsoft.com/dotnet/sdk:6.0` at digest
  `sha256:30c73e32dee47a989c2224ffa449a60d836a7ef570fbf9e168ac328d6c6e63c6` (NuGet 6.3.4). The
  fixtures were genuine packages produced by `dotnet pack` in the 9.0 image (`ZzBar 1.0.0`,
  `ZzFoo` at 1.0.0, 1.1.0, 1.2.0 and `2.0.0-Beta.1+Build.7`, the last depending on `ZzBar`),
  every capture ran with fresh `NUGET_PACKAGES` and `NUGET_HTTP_CACHE_PATH` directories, and
  every row of the wire table was observed on both images unless the row says otherwise. The
  stub is not a reference implementation; it answered with the shapes the Microsoft docs
  describe, and what the captures prove is what the client sends and how it reacts.
- **The published contract.** The Microsoft NuGet server API reference, read 2026-09-26: the API
  overview, service index, package content (`PackageBaseAddress`), package metadata
  (`RegistrationsBaseUrl`), search, push and delete (`PackagePublish`), symbol package publish,
  catalog, repository signatures and vulnerability info pages; the server implementation guide;
  the package versioning reference (normalised version numbers, SemVer 2.0.0 membership); the
  signed packages reference; the trust-boundary and authenticated-feed consumer guides; the
  nuget.org deletion policy; and the .NET SDK documents on signed-package verification, on
  `dotnet restore` auditing by default from the .NET 8 SDK, and on `dotnet nuget verify`. From
  the NuGet.Client source at `dev`: `PackageUpdateResource.cs` (the push and delete requests)
  and `HttpFileSystemBasedFindPackageByIdResource.cs` (the flat-container URL construction).
- **The live upstream.** `api.nuget.org` sampled directly: its service index and the resource
  set it advertises, the flat container's version list and package responses with their cache
  headers, the registration hives (an 86-version package inlined in two pages, a 178-version
  package split into three pages that are not inlined, an unlisted entry's `listed` and
  `published` values), a registration leaf, the vulnerability index, the repository-signatures
  index, the catalog index, conditional requests, a 404 on a non-normalised version and on a
  mixed-case registration path, and the CDN header that makes mixed-case flat-container paths
  work there.

Where the contract is unpublished the design says so and names what it was grounded against
instead. Per the standing rule, the recorded corpus re-grounds every row when the conformance
cases are written, and the corpus wins any disagreement.

Four things make this format worth a careful spec rather than a port of npm's. **The service
index is the root every other URL hangs off**, so URL rewriting on the proxied path is total:
a served index that leaks one upstream URL sends every client past the cache, and the
implementation guide itself forbids advertising `api.nuget.org` in a third-party index without
a switch to turn it off. **The registration hive is a generated, paged, mutable document set**:
one index per package, pages the server splits by its own heuristic, leaves per version, three
hives that differ by compression and SemVer 2.0.0 membership, all changing on every publish and
every unlist, so it is a rendering problem with paging in it. **Identifiers are lowercased and
versions normalised by the client before any flat-container URL is built**, so a registry that
stores what the publisher spelled serves 404s to every correct client. And **`dotnet nuget push`
authenticates with a header of its own**, `X-NuGet-ApiKey`, which is not one of the credential
forms `auth.md`'s client table knows; the row it needs is a sibling consequence of this spec.

## Blocking preconditions

**The handler interface re-open must complete before this format starts.** NuGet is Tier 1,
and `format-handler-interface.md` AC8 blocks all Tier 1 handler work on the post-OCI re-open;
npm and PyPI record the gate from their sides and this spec records it here because a contract
enforced on one side only is enforced nowhere. At build step 7 the gate is discharged long
before this format is reachable, but it binds this spec independently.

**The management API must be specced before Phase 2's management operations.** Unlisting,
relisting, hard deletion and deprecation are registry-owned management operations whose URL
shape, authorization and write accounting belong to
`docs/internal/plans/foundation/management-api.md` (to be authored in the spec loop), and the
client's own `DELETE` route is served as a binding onto the unlist operation (Design, "Unlist,
relist, delete and deprecate"). AC7, AC8 and AC19 are untestable until that surface exists, so
Phase 2's management half waits on that spec reaching `planned`. Phase 1, the publish half of
Phase 2, and Phases 3 and 4 do not.

**One shared-layer amendment this spec depends on is requested, not assumed.** The proxied
`.nupkg` fetch has no digest to verify against, because the NuGet read surface publishes none
(Design, "The proxied path"); it needs the completion-only fetch-and-cache mode `go-modules.md`
already requested of `proxy-cache.md` for the same reason, and this spec does not edit that
sibling.

## Scope

**In scope:**

- The service index, generated per repository, with every resource URL under this registry
  (Design, "The service index is the root").
- The flat container: the version list, `.nupkg` download and `.nuspec` download, with the
  lowercased identifier and normalised version the client sends.
- The three registration hives (`RegistrationsBaseUrl`, `/3.4.0`, `/3.6.0`) rendered from one
  stored state: index, pages and leaves, inlining and paging, gzip, SemVer 2.0.0 exclusion from
  the older hives, the `listed` flag and the 1900 `published` sentinel, and the `deprecation`
  and `dependencyGroups` fields.
- Search (`SearchQueryService` and its `/3.5.0` form) with `q`, `skip`, `take`, `prerelease`,
  `semVerLevel` and `packageType`, unlisted versions excluded, and proxied search forwarded
  and rewritten.
- `PackagePublish/2.0.0`: push as the client sends it (a chunked `multipart/form-data` `PUT`
  with the `X-NuGet-ApiKey` header), a duplicate refused with `409`, and the `DELETE` route
  served as a binding onto the registry-owned unlist operation.
- The management operations this format needs from the registry-owned management API: unlist,
  relist, hard delete and deprecate, each a completed logical write, with hard deletion
  retiring the coordinate forever.
- Name and version rules: lowercase folding of identifiers, NuGet version normalisation, the
  case-insensitive pre-release label, SemVer 2.0.0 membership including the dependency-range
  rule, and the uniqueness those rules force.
- Non-interactive authentication as the client performs it: the API key header on the publish
  routes, HTTP Basic after a `401` challenge on every other route, the per-route addressed
  objects `auth.md`'s pattern scopes evaluate, and the `403` rendering of a shared policy
  refusal.
- The proxied path against a v3 upstream (nuget.org or a private v3 feed): classification per
  document, total URL rewriting, conditional revalidation as the live upstream actually
  supports it, negative caching, proxied registration paging, proxied search, proxied
  vulnerability pages, and NuGet's rows of the upstream-removal table.
- Byte fidelity for signed packages, and the requirements this format places on the shared
  verification and signing services.
- The write-boundary declaration `data-model.md` requires.

**Out of scope for v1**, each with its reason, recorded because the interface spec's definition
of done requires the deliberately unimplemented surface to be named:

- **The V2 OData API** (`LegacyGallery`). The overview says the V2 protocol "is intentionally
  undocumented", the implementation guide says the recommended protocol since 2015 is V3, and
  neither pinned client sends a V2 request in any capture; the only official consumer named is
  `nuget.exe list`, which this spec does not test. A surface with no documented contract and no
  oracle in the loop would put a claim in the matrix that nothing backs.
- **The catalog resource** (the resolved catalog decision below). The docs say "the catalog is
  not used by the official NuGet client, not all package sources implement the catalog"; it is
  an append-only event log that the shared model already represents as snapshot history, and
  consuming an upstream's catalog would be the background polling `proxy-cache.md`'s resolved
  signal-detection decision (was Q12) rejected.
- **Repository signing** and the `RepositorySignatures` resource (the resolved repository-signing
  decision below). Countersigning rewrites the package bytes, which contradicts the byte
  fidelity signed packages depend on unless the shared signing service does it before the CAS
  commit; that service is `docs/internal/plans/foundation/signing-service.md` (to be authored in
  the spec loop), built at charter step 7 before Helm, and what NuGet requires of it is stated
  in Design rather than built here. Author-signed packages are stored and served unmodified.
- **Signature verification.** Verification of author and repository signatures belongs to
  `docs/internal/plans/foundation/artifact-verification.md` (to be authored in the spec loop),
  per the verification-ownership decision `supply-chain-policy.md` adopted (was its Q6); this
  spec states what NuGet needs from it (Design, "Signing and provenance").
- **Symbol packages** (`SymbolPackagePublish`, `.snupkg`; the resolved symbol-package decision
  below). A symbol package is consumed through a symbol-server protocol that is not NuGet v3
  and has no client in this loop, so stored symbols would be a claim nothing tests; the client
  skips the symbol push silently when the resource is absent (captured on both images).
- **A hosted vulnerability feed** (the resolved audit-data decision below). The handler has no
  path to advisory data that does not cross the policy boundary `supply-chain-policy.md` AC4
  holds, and an empty page is a "no known vulnerabilities" claim about content nobody checked,
  the false all-clear `npm.md` refused for its audit endpoints. Proxied repositories pass the
  upstream's pages through.
- **The autocomplete, report-abuse, package-details, owner-details and README URI-template
  resources.** All optional in the overview's resource table; the docs say autocomplete must be
  "disabled gracefully" when absent and the client falls back for report-abuse; none is
  requested by either pinned client in any capture, so none has an oracle here. UI-era work.
- **Package-type-specific behaviour** (`dotnet tool install`'s package-type filtering beyond the
  `packageType` search parameter). `dotnet tool search` "unconditionally accesses nuget.org"
  (captured: it refuses a config without nuget.org), so it cannot be pointed at this registry
  and has no oracle here.

## Design

### The wire surface, as captured

| Surface | Shape, as both pinned clients send it |
|---|---|
| Service index | `GET {source}`, the configured source URL itself (`.../index.json`), fetched first by every command. `User-Agent` is `NuGet .NET Core MSBuild Task/{version}` for restore and `NuGet xplat/{version}` for the CLI commands; every request carries `X-NuGet-Session-Id`, `X-NuGet-Client-Version` and `Accept-Encoding: gzip, deflate`, no `Accept`, and never a conditional header |
| Version list | `GET {PackageBaseAddress}{lower_id}/index.json`. Restore asks this first for every package, direct and transitive; the client lowercases the identifier (`ZZFOO` in the project file produced `/zzfoo/index.json`) and a `404` means "no versions" |
| Package download | `GET {PackageBaseAddress}{lower_id}/{lower_version}/{lower_id}.{lower_version}.nupkg`; a `PackageReference` to `2.0.0-Beta.1+Build.7` requested `/zzfoo/2.0.0-beta.1/zzfoo.2.0.0-beta.1.nupkg` (normalised, metadata stripped, lowercased) and a reference to `[1.02.0.0]` requested `/zzfoo/1.2.0/...`. Restore never fetched a `.nuspec` or a registration document on either image |
| Registration index | `GET {RegistrationsBaseUrl/3.6.0}{lower_id}/index.json`, read by `dotnet add package`, `dotnet list package --outdated` and, when no vulnerability resource is advertised, `--vulnerable`; both clients chose the `/3.6.0` hive when all three were advertised. When a page object carries no `items`, `add package` fetched every page by its `@id` before choosing a version |
| Search | `GET {SearchQueryService}?q={query}&skip=0&take=20&prerelease=false&semVerLevel=2.0.0` from `dotnet package search` (9.0); `dotnet add package` did not search |
| Vulnerability data | `GET {VulnerabilityInfo}` then each page's `@id` on every cold restore on 9.0 (NuGetAudit); never on 6.0. A `NU1903` warning names the page's URL and severity |
| Push | `PUT {PackagePublish}/` (the client appends a trailing slash to the resource `@id`), `Transfer-Encoding: chunked`, `Content-Type: multipart/form-data; boundary="{guid}"`, one part `Content-Disposition: form-data; name=package; filename=package.nupkg` with `Content-Type: application/octet-stream`, and `X-NuGet-ApiKey: {key}` when `--api-key` was given and no header at all when it was not. `201` prints "Your package was pushed"; `409` exits 1 with "Response status code does not indicate success: 409" unless `--skip-duplicate`, which prints "already exists at feed" and exits 0; `400` and `403` exit 1 |
| Symbol push | After a `201`, `PUT {SymbolPackagePublish}/` with the `.snupkg` found beside the `.nupkg`, same body shape and header, only when the resource is advertised; skipped silently otherwise |
| Unlist | `DELETE {PackagePublish}/{ID}/{VERSION}` with the identifier and version as typed (`/ZzFoo/1.0.0`), `X-NuGet-ApiKey` when given. `204` prints "was deleted successfully"; `404` and `403` exit 1 |
| Relist | `POST {PackagePublish}/{ID}/{VERSION}` per the docs; no `dotnet` command sends it |
| Authentication | Every request goes out anonymous first; a `401` with `WWW-Authenticate: Basic` is retried with `Authorization: Basic` from `packageSourceCredentials` or `NuGetPackageSourceCredentials_{name}`, and a rejected retry is repeated a dozen times over six seconds before `NU1301`. A push under a challenging source is retried with **both** `Authorization: Basic` and `X-NuGet-ApiKey` |
| Transport | 9.0 refuses `push` and `delete` against an `http://` source outright unless the source carries `allowInsecureConnections="true"`, and restore warns `NU1803` on 6.0; advertising `RepositorySignatures` over `http://` fails the whole source with `NU1301: Repository Signatures resouce must be served over HTTPS` |

Two facts about the client's own caches shape every second-request assertion in this spec.
The HTTP cache (`NUGET_HTTP_CACHE_PATH`) answered a forced re-restore and a restore of a second
project with **zero requests** to the stub, and the global packages folder (`NUGET_PACKAGES`)
holds extracted packages; a case that wants to prove this registry served from cache starts
from fresh directories for both and asserts at the network layer, as npm's and PyPI's specs
already require.

### The service index is the root, and every URL is ours

The service index is a JSON document whose `resources` carry absolute `@id` URLs, and the
docs say the base URL of every other resource "must be dynamically fetched from the service
index by the client". Nothing else on the wire is predictable from the source URL. This
registry therefore generates one service index per repository at
`/nuget/{repository}/index.json` (format-first, per `format-handler-interface.md`'s resolved
URL-shape decision; the client takes an arbitrary source URL, so no root anchoring is needed),
and every resource it advertises lives **beneath that path**:

| `@type` values advertised | Resource | Why |
|---|---|---|
| `PackageBaseAddress/3.0.0` | `/nuget/{repository}/flat/` | Required; what restore reads |
| `RegistrationsBaseUrl`, `/3.0.0-beta`, `/3.0.0-rc`, `/3.4.0`, `/3.6.0`, `/Versioned` | `/nuget/{repository}/registration/`, `/registration-gz/`, `/registration-gz-semver2/` | Required; three hives, one renderer (below) |
| `SearchQueryService`, `/3.0.0-beta`, `/3.0.0-rc`, `/3.5.0` | `/nuget/{repository}/query` | Required |
| `PackagePublish/2.0.0` | `/nuget/{repository}/publish` | Required; the push and unlist routes hang off it |
| `VulnerabilityInfo/6.7.0` | `/nuget/{repository}/vulnerabilities/index.json` | Proxied repositories only (the resolved audit-data decision) |

Deliberately absent, by the resolved decisions below: `SymbolPackagePublish`,
`RepositorySignatures` and `Catalog`; and, as UI-era surface with no oracle, the autocomplete
and URI-template resources. Absence is honest here because the client treats each of these as
optional (the symbol push is skipped, the docs say autocomplete degrades gracefully), whereas a
present-but-empty resource would be a claim.

Two consequences of the beneath-the-index layout, one for the proxied path and one for auth.
On the proxied path the upstream's index is never served: what clients receive is always this
registry's own document, exactly as `cargo.md` never serves an upstream `config.json` verbatim,
and the upstream's resource URLs (nuget.org's search lives on a different host entirely) are
what the handler uses to compose upstream requests. This is the format-specific transform
`format-handler-interface.md` canonicalises with npm's packument URLs, and it needs the
externally visible base URL rather than the bind address. For auth, the implementation guide
says the client since NuGet 6.7 pre-authenticates requests to URLs "in the same virtual
directory, or a subdirectory" of a URL already authenticated, which the layout satisfies. The
captures did not show that saving: with the index at the stub's root and every resource beneath
it, both 6.14.3 and 6.3.4 still sent every request anonymously first and retried it with Basic
after the `401`. The registry therefore budgets two requests per document on a private
repository and does not rely on pre-authentication; the layout is kept because it costs nothing
and is what the guide asks for.

The index itself is served with `Cache-Control: no-cache` as nuget.org serves it, because it
encodes the repository's visibility and resource set and a stale copy on a proxy would survive
a repository being made private.

### Mapping onto the shared model

The levels are exactly those `data-model.md` provides; no table is added.

- `Package.name` holds the **lowercased identifier**, the key every flat-container and
  registration URL carries and the key uniqueness is enforced on. The display spelling
  (`ZzFoo`) lives in the package-level metadata document with the package's **retirement set**
  (every hard-deleted version, below) and its deprecation record.
- `Version.version` holds the **lowercased normalised version**, the token the flat container
  uses (`2.0.0-beta.1`). The version-level document holds the normalised version with its
  pre-release case as `pack` wrote it (`2.0.0-Beta.1`, which the registration `version` field
  carries as nuget.org does), the verbatim `.nuspec` version (`2.0.0-Beta.1+Build.7`), the
  parsed `.nuspec` metadata the registration and search documents render (`authors`,
  `description`, `tags`, `dependencyGroups` with their target frameworks and ranges,
  `requireLicenseAcceptance`, `licenseExpression`, `packageTypes` and the rest), the SemVer
  2.0.0 membership flag, the `listed` flag with its listing time, and the package's own SHA-512
  (nuget.org's `packageHashAlgorithm`), kept as metadata because the CAS key is the server-side
  sha256 (`storage-and-gc.md`, addressing).
- The `.nupkg` is the version's first `File`, its `Blob` keyed by the CAS digest of the bytes
  as received. The `.nuspec` is a second, small `File` extracted from the archive on ingest,
  the same shape `pypi.md` uses for the wheel's core-metadata file; the flat container's
  `.nuspec` route serves it without opening the archive.
- The repository-level document holds nothing on the hosted path: the service index is a pure
  function of the base URL, the repository's visibility and type. A remote repository's
  document caches the upstream's service index (below).

### Registration documents are rendered, paged, never stored

A registration index, its pages and its leaves are projections of the package's versions in
the snapshot the pointer names, rendered on request and never stored as documents of record,
exactly as npm renders its packument. One renderer serves the three hives, whose `@type`
values differ only in two properties the docs define:

| Hive | Encoding | SemVer 2.0.0 packages |
|---|---|---|
| `RegistrationsBaseUrl` (and its `-beta`, `-rc` aliases) | identity | excluded |
| `RegistrationsBaseUrl/3.4.0` | `Content-Encoding: gzip` | excluded |
| `RegistrationsBaseUrl/3.6.0` (and `/Versioned`) | `Content-Encoding: gzip` | included |

The two gzip hives answer gzip-encoded to a request that accepts it, which every pinned client
does on every request; the identity hive never compresses. A **SemVer 2.0.0 package** is one
whose version has a dot-separated pre-release label or build metadata, or whose any dependency
range has a SemVer 2.0.0-only bound (the versioning reference's definition, which nuget.org
applies); such a version is absent from the older hives and from search unless the query says
`semVerLevel=2.0.0`, the "invisible to older clients" behaviour the reference describes.

Paging follows nuget.org's published heuristic so the corpus replays: fewer than 128 versions
inline every leaf in the index, and 128 or more split into pages of 64 that the index lists
without `items`. The page and leaf URLs are ours to shape, since the docs say a client "should
never" assume them, and they are
`/nuget/{repository}/{hive}/{lower_id}/page/{lower}/{upper}.json` and
`/nuget/{repository}/{hive}/{lower_id}/{lower_version}.json`. Pages are ordered by SemVer 2.0.0
precedence and the `lower` and `upper` bounds are normalised versions without metadata, both
as the docs require. Each leaf carries `catalogEntry` with `id` in the display spelling,
`version` normalised with its case, `listed`, `published` (the listing time, or
`1900-01-01T00:00:00+00:00` when unlisted, the sentinel nuget.org emits and older clients read),
`packageContent` pointing at this registry's flat container, `dependencyGroups` with each
dependency's `registration` URL pointing at this registry's index for that identifier, and
`deprecation` when the management surface has set one. The `catalogEntry.@id` is a URL under
the leaf, since this registry serves no catalog. The `vulnerabilities` property is **omitted**
on the hosted path and passed through on the proxied path (the resolved audit-data decision).

The `ETag` of every registration document derives from the package and the snapshot number, so
a repoint changes it and a `304` costs no rendering; the client sends no conditional headers,
but other tools do.

The relationship to `write-triggered-services-prototype.md` is the one `cargo.md` states: these
documents are package-scoped, unsigned and a pure function of version rows, not the
repository-scoped signed class the prototype exists for. A publish is one `Version`, two
`File`s and one snapshot; no regeneration step, no secret, no contention beyond the ordinary
revision token on the package-level document.

### Names and versions: the client folds before it asks

The client lowercases the identifier with `ToLowerInvariant` and normalises the version before
building any flat-container URL (captured, and `HttpFileSystemBasedFindPackageByIdResource.cs`
builds `{baseUri}{idInLowerCase}/{version}/{idInLowerCase}.{version}.nupkg` from
`version.ToNormalizedString().ToLowerInvariant()`). Normalisation, per the versioning
reference: leading zeros removed from each numeric part, a fourth part of zero omitted, build
metadata removed, at least three parts (`1`, `1.0`, `1.0.0` and `1.0.0.0` are equal), and
pre-release labels compared case-insensitively (`1.0.0-alpha` equals `1.0.0-Alpha`). `pack`
itself normalises: the fixture packed as `1.02.0.0` was written as `1.2.0` in its `.nuspec` and
filename, and `2.0.0-Beta.1+Build.7` kept its label case in the `.nuspec` while the filename
lost the metadata. The reference then binds servers: "a repository that contains version 1.0 of
a package should not also host version 1.0.0 as a separate and different package".

The rules, stated as rules:

- A package is addressed by its lowercased identifier and a version by its lowercased
  normalised string, on every route, hosted and proxied. Two pushes whose identifiers differ
  only by case, or whose versions normalise to the same string, are one coordinate, and the
  second is a duplicate refused with `409`.
- **Any spelling reaches the same content** (the resolved request-folding decision below): a
  request in mixed case or with a non-normalised version is folded and served, with every URL
  in the response canonical. nuget.org's registration hive answers `404` to `Newtonsoft.Json`
  while its flat container answers `200` only because a CDN rewrite (`X-CDN-Rewrite: Lowercase
  blobs in v3-flatcontainer`) folds for it; this registry folds itself.
- The display spelling is preserved: `id` in registration and search documents is `ZzFoo`, and
  the client writes that spelling into the project file (`add package zzfoo` produced
  `Include="ZzFoo"` on both images).
- The `DELETE` route receives the identifier and version as the user typed them and folds
  them the same way.

### The publish path

`dotnet nuget push` sends one `PUT` per package, chunked, as a `multipart/form-data` body whose
first part is the `.nupkg` bytes; the docs say "subsequent items in the multipart body are
ignored" and "the file name or any other headers of the multipart items are ignored", and the
client sends exactly one part. The route is the `PackagePublish` `@id` with or without the
trailing slash the client appends.

What this registry enforces on ingest:

- The body is spooled to a bounded temporary buffer outside the CAS, the archive is opened, and
  the `.nuspec` is parsed; the identifier and version it declares are the coordinate, and the
  filename is ignored as the docs say. A body that is not a zip, has no single `.nuspec` at its
  root, or whose `.nuspec` fails to parse is refused with `400`, nothing committed.
- **A coordinate that already exists is refused with `409`**, as nuget.org refuses it ("if the
  package with the provided ID and version already exists, nuget.org will reject the push")
  and as the client expects (its `--skip-duplicate` flag exists for exactly this status). The
  `.nupkg` at a coordinate is the immutable artifact this registry's own proxy layer caches
  forever, and lock files pin its content hash; accepting a replacement would rewrite what
  every downstream cache and lock file already holds.
- **A retired coordinate is refused the same way**: a hard-deleted version joins the package's
  retirement set and is never republishable, with the same bytes or different ones, the
  cross-format rule `npm.md`, `pypi.md` and `go-modules.md` adopted. The docs note that on
  nuget.org a deleted-and-republished coordinate "breaks the official client's assumption that
  a package ID and version imply a specific package content".
- The bytes commit to the CAS unmodified, whatever signatures they carry (Design, "Signing and
  provenance"); the `.nuspec` commits as the second file; the response is `201` with an empty
  body, the status the 9.0 client reports as "Created" and both report as pushed.
- A push to a proxied repository is refused: the docs' `PackagePublish` is required, so the
  resource is advertised on a remote repository too, and its routes answer `405` there.

### What counts as a write

`data-model.md` requires each format spec to declare its ecosystem's write boundaries and makes
metadata-only mutations snapshot-creating writes. NuGet's declaration:

- **One push `PUT` is one completed logical write**: the version, its two files and the
  registration state it produces land in one snapshot, and the flat container's version list
  rendered from the head snapshot includes it before the response is sent.
- **Each unlist and each relist is one metadata-only write**, flipping `listed` and moving
  `published`, and producing a snapshot. Unlisting deletes nothing: the docs say an unlisted
  package "can still be downloaded and installed by using an exact version number", and the
  capture confirms that a `PackageReference` to the unlisted `1.1.0` restored it while
  `add package` chose the newest listed version.
- **Each deprecation, or its removal, is one metadata-only write.**
- **A hard delete is one write per management action**, removing the version from the head
  snapshot and recording it in the retirement set within that same write.
- A proxied repository creates no snapshots at all; document arrival and revalidation are cache
  materialisation.

### Unlist, relist, delete and deprecate

A management operation has a trigger and an effect, and the oracle's reach over them differs
(`docs/internal/analysis/management-surfaces-and-the-oracle.md`). NuGet is between npm and
PyPI on that analysis's table: `dotnet nuget delete` is a real client command that triggers an
unlist, while relist, hard deletion and deprecation have no `dotnet` command at all (nuget.org
drives them from its web UI). Every effect is client-observable: `listed` and `published` in
the registration hive, absence from search, resolution behaviour in `add package`, and the
`deprecation` record that `dotnet list package --deprecated` reads.

This spec follows the precedent the Cluster 5 format specs share, whose common home is
`docs/internal/plans/foundation/management-api.md` (to be authored in the spec loop):

- **Each operation is a registry-owned management operation**, exposed through that one
  management API, and the client's own `DELETE {PackagePublish}/{ID}/{VERSION}` is served as a
  **binding onto the unlist operation** with identical semantics, authorization and write
  accounting (the resolved delete-semantics decision below), because a .NET team whose
  `dotnet nuget delete` does nothing, or destroys a version their lock files pin, does not have
  a NuGet registry. The docs' `POST` relist route is served as the binding onto relist for the
  same reason, though no `dotnet` command drives it. There is one operation and two ways in.
- **Each operation is a completed logical write through the shared write path**: exactly one
  snapshot per operation, none for a refused one, no blob-store object deleted directly.
- **Authorization uses the settled `(repository, action)` vocabulary with no new action.**
  Unlist, relist and deprecation are metadata-only and require `push`, the action the client's
  single API key already holds for pushing; hard deletion is removal-class and requires
  `delete`. `auth.md` records that the mapping of management operations onto the vocabulary
  is `management-api.md`'s to reconcile across formats, and this spec's mapping is an input to
  that reconciliation, not a decision over it.
- **Hosted only.** A proxied repository takes its unlists and removals from the upstream per
  the removal table, so every operation against one is refused.
- **Verification is split the way the oracle's reach is split.** The unlist trigger is verified
  by the real client through the binding (AC7); the relist, delete and deprecate triggers are
  verified by this registry's integration tests against the management endpoint, and nothing
  else vouches for them; every effect is verified by a real `dotnet` command.

| Operation | Client binding | Effect a client sees | Action |
|---|---|---|---|
| Unlist a version | `dotnet nuget delete` (`DELETE {PackagePublish}/{ID}/{VERSION}`) | `listed: false` and the 1900 `published` in every hive; absent from search; `add package` and floating restore skip it unless it is the only match; an exact `PackageReference` still restores it; the flat container still lists it, as the docs require | `push` |
| Relist a version | the docs' `POST {PackagePublish}/{ID}/{VERSION}`; no `dotnet` command | The marks revert and normal resolution returns | `push` |
| Hard delete a version | none | The version leaves every hive and the version list, the download answers `404`, the coordinate is retired | `delete` |
| Deprecate or undeprecate a version | none | The registration `deprecation` object with its `reasons`, `message` and `alternatePackage`, which `dotnet list package --deprecated` reports | `push` |

The docs' 72-hour and dependent-count restrictions are nuget.org's own policy (the deletion
policy page) and are not enforced, as `npm.md` decided for the same class of rule.

### Authentication: an API key header, and Basic after a challenge

Two credential forms, both captured on both images. On the `PackagePublish` routes the client
presents `X-NuGet-ApiKey` with the value of `--api-key`, and sends **no header at all** when
the option is absent; the docs call the key "an opaque string gotten from the package source
by the user", and the overview says nuget.org authenticates only this resource, "via a special
API key header". On every route, including the publish routes, the client sends nothing until a
`401` with `WWW-Authenticate: Basic` arrives, then retries with `Authorization: Basic` from
`packageSourceCredentials` or the `NuGetPackageSourceCredentials_{name}` environment variable
(the authenticated-feeds guide's order, captured for both). A push under a challenging source
therefore arrives twice, the second time carrying both headers.

How this meets `auth.md`, whose rules this spec does not bend:

- **The API key is a registry token, presented in a fifth form.** No separate key kind exists:
  the value in `X-NuGet-ApiKey` is a token `auth.md` issued, verified by the same one-way
  lookup, and the header is accepted on the `PackagePublish` routes only. When a request
  carries both the header and `Authorization: Basic`, both are verified, a failure of either
  rejects the request (`auth.md` AC12, never downgraded to anonymous), and the request's
  authority is the intersection of the two. The client table in `auth.md` has no `dotnet` row
  and its verifier's presentation forms (its AC31) do not include a bare header; the row and
  the form are listed in this spec's sibling consequences and must land there before this
  format's auth cases are written, per that spec's rule that each row is confirmed against
  captured traffic (it now is).
- **The Basic form is the token-as-password convention** `auth.md` already defines for pip:
  the token in the password field, the username not an authentication input. The harness
  writes the issued token into the client container as
  `NuGetPackageSourceCredentials_{name}=Username=token;Password={token}` and, for push, passes
  it as `--api-key`; nothing new is asked of the `setup` vocabulary.
- **The challenge is uniform and not an existence oracle.** A credential-less request under a
  repository that is not anonymously readable answers `401` with `WWW-Authenticate: Basic`,
  whether the repository is private, missing or someone else's, the mechanism `cargo.md` and
  `oci.md` already use with their own challenge strings; a request carrying a valid credential
  that lacks `pull` answers `404`, indistinguishable from a missing repository (`auth.md`
  AC17). A rejected credential answers `401` and is never served as anonymous; the client then
  retries it a dozen times and reports `NU1301`, which is the ecosystem's own cost.
- **Push refusals.** A push or unlist on a repository the caller can read but lacks the action
  on answers `403`, which both clients render as "Forbidden" and exit 1 on; a credential-less
  push on an anonymously readable repository is likewise `403`, since the client sends no
  header when it has no key and a `401` would only make it ask for a Basic credential it does
  not have.
- **TLS.** `auth.md` requires TLS on every credential-bearing path and refuses plaintext
  credentials unless the operator's explicit flag is set (its AC27); the API key header joins
  the forms that rule covers, and the 9.0 client enforces the same from its side by refusing
  `http://` sources for push and delete. The harness's transcript capture therefore terminates
  TLS with its CA injected into the client container's trust store, the per-client injection
  `conformance-harness.md` leaves to each format.

### Addressed objects and pattern scopes

`auth.md`'s pattern scopes narrow a credential within one repository by matching the object
each request addresses, and the format declares which object each route reports ("Pattern
scopes" there; `format-handler-interface.md` AC12). The canonical object is built from the
lowercased identifier and, where a version is addressed, its lowercased normalised string,
because both are computable from every spelling any route carries and a pattern must match
byte for byte against a canonical form.

| Route | Object kind | Canonical object |
|---|---|---|
| Service index | none | - |
| Version list (flat container) | named | `{id}` |
| `.nupkg` and `.nuspec` download | named | `{id}/{version}` |
| Registration index, page and leaf | named | `{id}` (pages and leaves address versions of one package, and a leaf reports `{id}/{version}`) |
| Search | none | - |
| Vulnerability index and pages | none | - |
| Push | named | `{id}/{version}`, taken from a **bounded peek** at the archive's leading entries in the streamed body (the resolved push-object decision below); a body whose `.nuspec` is not found within the bound is refused before any byte is spooled to the CAS |
| Unlist and relist bindings | named | `{id}/{version}`, folded from the URL |

What that gives and costs, applying `auth.md`'s rules rather than re-deciding them. Every
`dotnet` command fetches the service index first, and the index addresses the repository as a
whole, so a credential holding **only** a patterned `pull` is refused at its first request and
no `dotnet` command works under it, the same consequence `cargo.md` records for `config.json`.
Pattern narrowing on this format is therefore practical for writes: a CI credential confined to
its own packages holds an unpatterned `pull` beside a `push` patterned `acme.*/**`, and pushes
and unlists only those packages. A patterned `pull` still narrows direct flat-container and
registration requests, which AC11 asserts rather than leaving implied. Search and the
vulnerability pages are refused to a patterned credential as they are to any credential-less
request on a private repository.

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines, on a
version-list, download or registration route of either path, the handler answers `403` with a
plain-text body naming the policy and rule, or naming the signal for a coordinate condemned
under the shared security-signal rule. `403` rather than the existence rule's `404`, because
the caller is authorized and the content is what is refused; and plain text because NuGet v3
defines no error body, and the client reports the status line ("Response status code does not
indicate success: 403 (Forbidden)", captured for a refused push). The client retries a failed
`.nupkg` download six times before giving up (captured), so a refused download costs six
requests and a `NU1101`-class error rather than one; whether the body text reaches the user is
what AC12's case proves.

### Audit data and the vulnerability resource

From the .NET 8 SDK `dotnet restore` audits every restored package by default (the breaking
change "'dotnet restore' produces security vulnerability warnings"), reading the
`VulnerabilityInfo` resource of each source; captured on 9.0 as a fetch of the index and both
pages on every cold restore, a `NU1903` naming the advisory URL from the page, and nothing on
6.0. When no source advertises the resource, `dotnet list package --vulnerable` read the
registration index's `vulnerabilities` property instead and reported "no vulnerable packages"
(captured), so an absent property is read as an all-clear too.

Per the resolved audit-data decision below: a **hosted** repository advertises no
`VulnerabilityInfo` resource and omits the `vulnerabilities` property from registration and
search documents, because this registry makes no vulnerability claim it did not compute, and
the handler cannot compute one without crossing the policy boundary `supply-chain-policy.md`
AC4 holds. The operator documentation names the implementation guide's own recipe for exactly
this case, an `auditSources` entry pointing at `https://data.nuget.org/v3/index.json`, "which
only serves vulnerability data, not packages". What this format asks of
`supply-chain-policy.md`, recorded as a sibling consequence rather than built here: an
advisory read through `Deps` scoped to one ecosystem and coordinate range, from which a later
revision of this spec renders the resource for hosted repositories. A **proxied** repository
advertises the resource and passes the upstream's index and pages through as mutable metadata
with a TTL, every page `@id` rewritten to this registry, and passes registration
`vulnerabilities` through unchanged, so a nuget.org cache loses no audit signal.

### Signing and provenance

A signed `.nupkg` carries its signature inside the archive (`.signature.p7s`; the signed
packages reference defines author and repository signatures, a repository signature being a
countersignature added by the source, and nuget.org repository-signs everything it serves,
captured by `dotnet nuget verify` on a nuget.org package showing "author primary signature"
and "repository countersignature"). Two facts follow for a registry:

- **Signed bytes are the artifact.** The signature is part of the package bytes, the lock
  file's content hash is over those bytes, and the trust-boundary guide says a package whose
  content "has been modified since it was signed" is refused with `NU3008`. The implementation
  guide is explicit: packages "must not be modified, as client features (lock files and signed
  packages) will detect modifications". This registry therefore commits and serves every
  `.nupkg` byte-identical, on both paths, and never repacks, re-zips or strips anything; the
  `.nuspec` it serves separately is extracted, not the archive rewritten.
- **The `RepositorySignatures` resource must be served over HTTPS** and, with
  `allRepositorySigned: true`, obliges every package on the source to carry a repository
  signature from a listed certificate; on a repository with proxied content that signature is
  nuget.org's, not ours, and advertising the resource over plain HTTP fails the whole source
  (captured). Per the resolved repository-signing decision below, v1 advertises no such
  resource and signs nothing.

What NuGet requires of the shared services, stated so the dependency cannot be lost:

- Of `docs/internal/plans/foundation/artifact-verification.md` (to be authored in the spec
  loop): verification of an author signature and a repository countersignature inside a
  `.nupkg`, with the trust roots the SDK's own bundle semantics imply (verification on Linux
  needs a root store valid for code signing and timestamping; the SDK falls back to its own
  bundle), yielding the per-digest verdict `supply-chain-policy.md` consumes and the signer
  identity; and a position on nuget.org's revocation checks, which the capture could not
  complete offline (`NU3018`, `NU3028` warnings).
- Of `docs/internal/plans/foundation/signing-service.md` (to be authored in the spec loop):
  should repository signing ever be adopted, a countersigning step on the publish path that
  produces the stored bytes **before** the CAS commit, so the committed digest is the signed
  package's, an HTTPS-only certificate list to advertise, and the re-signing of every affected
  package on certificate removal that the repository-signatures docs require.

Advisory matching for NuGet packages is the policy engine's coordinate-level path (OSV carries
the NuGet ecosystem) and needs no handler cooperation.

### The proxied path

The handler owns the request and classifies for the proxy layer's fetch-and-cache API per the
settled decisions in `proxy-cache.md`; the upstream is a v3 service index URL, validated at
configuration to answer a JSON document with a `version` of major 3 and the three required
resources (AC22).

- **The upstream service index** is mutable metadata with a TTL, cached in the repository-level
  document and never served: it is how the handler discovers the upstream's resource URLs,
  wherever they point (nuget.org's search is on `azuresearch-*.nuget.org`). The upstream's
  highest available registration hive (`/3.6.0` on nuget.org) is the one consumed, so SemVer
  2.0.0 versions are never lost in transit, and this registry's own three hives are rendered
  from it as on the hosted path.
- **The version list is mutable metadata with a TTL.** The live flat container serves `ETag`
  and `Last-Modified` with `Cache-Control: max-age=0, no-cache`, and answered `304` to
  `If-Modified-Since` but `200` to `If-None-Match` (captured), so revalidation uses the
  modification time. Clients' own conditional requests are answered from the cache under this
  registry's `ETag`.
- **Registration documents are mutable metadata with a TTL**, revalidated on the upstream's
  `Last-Modified`. Every `@id`, `packageContent`, `registration` and `catalogEntry` URL in a
  served document points at this registry. The paging trap: when the upstream's index lists
  pages without `items`, this registry's index lists its own page URLs, and a request for one
  resolves to the upstream page by the `lower` and `upper` bounds the cached index recorded,
  because the docs say a page URL is opaque and this registry may not assume the upstream's
  shape any more than a client may assume ours.
- **`.nupkg` and `.nuspec` files are immutable artifacts**, cached indefinitely (nuget.org
  serves them with a one-day `max-age`, and the coordinate is immutable by the ecosystem's own
  rule). The read surface publishes **no digest** for them: the flat container carries none,
  the registration leaf carries none, and the only hash on the wire, the catalog's
  `packageHash`, is in a resource the client does not read and this registry does not consume.
  The fetch therefore uses the completion-only fetch-and-cache mode `go-modules.md` requested
  of `proxy-cache.md`: a truncated body is never committed, the CAS digest of the complete body
  is recorded, and a served package is byte-identical to what the upstream sent.
- **Search is forwarded** as mutable metadata with the short TTL, keyed by the normalised query
  string, with every `registration` and `@id` URL in the response rewritten. A virtual
  repository queries each member and merges results by lowercased identifier in member order.
- **Vulnerability pages** pass through as described above.
- **Missing identifiers are negatively cached** with the short TTL: the flat container's `404`
  is the docs' "no versions" answer and the client's `NU1101`; a `429` or `5xx` is never cached
  as absence (`proxy-cache.md` AC9).
- **HTTPS everywhere.** The 9.0 client refuses an `http://` source for push and delete, warns on
  restore, and refuses any source advertising repository signatures over HTTP; this registry's
  served index carries the scheme of its externally visible base URL and nothing else.

Upstream removal maps onto the settled purge-or-flag table as NuGet's side of that contract:

| Upstream event, as observed at revalidation | Classification |
|---|---|
| A version's `listed` flips to false (`published` becomes the 1900 sentinel) | **Mirror the flag**, keep the cached package, and record an operator-visible divergence: the same class as the PyPI-yank and Cargo-yank rows of `proxy-cache.md` AC13, because unlisting means "hidden from search and new adoption, existing consumers keep working" (the deletion policy). New resolutions then skip it because the client does; that is the client's half, and ours is serving the flag faithfully |
| A version or the whole identifier vanishes from the version list and the hive | Keep serving, record an operator-visible divergence. nuget.org deletes only for policy violations, malware among them, and the wire carries no signal distinguishing a takedown from a rare owner-requested deletion; the catalog would (`PackageDelete` items), but it is not consumed. The security-signal rule's other channel, the advisory feed, is what condemns a NuGet coordinate OSV names as malicious, and this registry never observes an explicit NuGet security signal on this channel |
| A `deprecation` object appears on a version, or `vulnerabilities` entries appear or change | An ordinary metadata change, propagated at the next revalidation; never a removal event |
| A `.nupkg` re-fetched after eviction differs from the recorded digest | An **immutability violation** treated as the explicit signal: purge and alert, because the ecosystem's own rule is that a coordinate implies its bytes and every lock file that pinned the old hash would otherwise disagree with this registry |

Detection happens at revalidation, passively, per `proxy-cache.md`'s resolved passive-detection
decision (was Q12); the active channel is the policy engine's advisory feed, which carries
NuGet through OSV.

### Conformance, the two clients and the corpus

The two pinned clients straddle the meaningful watershed. NuGet 6.3.4 (SDK 6.0) audits nothing,
never fetches the vulnerability resource, and tolerates `http://` with a warning; NuGet 6.14.3
(SDK 9.0) fetches the vulnerability index and pages on every cold restore, warns `NU1903`,
refuses `http://` for push and delete, and refuses a source advertising repository signatures
over HTTP. Every hosted and proxied case runs on both; the audit cases run on 9.0 and assert
the absence of any vulnerability request on 6.0 as a negative case, so the watershed is proven
rather than believed.

The recorded surface for the replay corpus, named now because a thin recording script yields a
thin specification: the service index fetch, a cold `dotnet restore` of a package with a
transitive dependency, the warm restore (zero requests, asserted), a restore pinning a SemVer
2.0.0 version, a restore of an unlisted version by exact reference, `dotnet add package` of a
mixed-case identifier with and without `--prerelease`, `add package` of a package whose hive
is paged, `dotnet package search`, `dotnet list package --outdated`, `--deprecated` and
`--vulnerable`, `dotnet nuget push` succeeding, refused as a duplicate on each client (with and
without `--skip-duplicate`), refused as invalid and refused for a bad key, `dotnet nuget
delete`, a push with a `.snupkg` beside the package, the `401` challenge with a subsequent
authenticated restore and push, and a missing identifier. Recording gates on the harness's
redaction criterion (`conformance-harness.md` AC13); the API key header and the Basic value are
exactly the kind of header an allowlist must name to redact. Every deliberate divergence from
nuget.org (the absent symbol, catalog, repository-signature and hosted vulnerability resources;
the unenforced deletion-policy windows; a `.nuspec` served without the archive's CDN headers)
goes on the recorded exception list before its flow is expected to replay.

## Acceptance Criteria

- [ ] AC1: `dotnet restore` resolves and installs a package and its transitive dependency from a
      hosted repository configured as a format-first service index URL, for both pinned clients
      (NuGet 6.3.4 and 6.14.3), with the transcript showing the version list and `.nupkg`
      requests under the lowercased identifier and normalised version and no registration
      request; a warm restore with the client's HTTP cache intact makes zero requests, and a
      restore from fresh caches makes them again, both asserted at the network layer.
- [ ] AC2: `dotnet nuget push` of a genuine `dotnet pack` output is accepted with `201` on both
      pinned clients, produces exactly one snapshot, and a subsequent `dotnet restore` from
      fresh caches on either client downloads exactly the pushed bytes; the flat container's
      version list and every registration hive reflect the version before the push response is
      sent, and the `.nuspec` route serves the archive's manifest byte-identical.
- [ ] AC3: A push whose coordinate already exists is refused with `409` and no snapshot, and the
      client exits non-zero, then exits zero with "already exists" under `--skip-duplicate`, on
      both pinned clients; a push whose identifier differs from an existing package's only by
      case, or whose version normalises to an existing one (`1.0` against `1.0.0`,
      `1.0.0-Alpha` against `1.0.0-alpha`), is refused the same way; and a body that is not a
      valid package is refused with `400`, nothing committed.
- [ ] AC4: Every `@id` in a served service index, hosted and proxied, is a URL beneath that
      repository's index on this registry's externally visible base URL, proven by a transcript
      of a full proxied restore, `add package` and `package search` in which no request reaches
      the upstream host directly; a hosted index advertises no `SymbolPackagePublish`,
      `RepositorySignatures`, `Catalog` or `VulnerabilityInfo` resource, the `@type` set it
      advertises is exactly the table in Design, and the index is served with
      `Cache-Control: no-cache`.
- [ ] AC5: A package pushed as `ZzFoo` `2.0.0-Beta.1+Build.7` is listed as `2.0.0-beta.1` in the
      version list and served at that flat-container path, its registration `version` reads
      `2.0.0-Beta.1` and its `id` reads `ZzFoo`; the same requests with a mixed-case identifier
      or the non-normalised version `2.0.0.0-BETA.1` answer the same content with canonical URLs;
      `dotnet add package zzfoo --prerelease` writes `Include="ZzFoo"` with that version on both
      clients; and a `PackageReference` to `[1.02.0.0]` restores the version stored as `1.2.0`.
- [ ] AC6: With 127 versions the registration index inlines every leaf; with 128 it lists pages
      of 64 without `items`, and `dotnet add package` resolves the newest version by fetching
      the pages through their `@id` URLs, asserted from the transcript; the identity hive
      serves uncompressed and the `/3.4.0` and `/3.6.0` hives serve `Content-Encoding: gzip`,
      and a SemVer 2.0.0 version (dot-separated pre-release label, build metadata, or a SemVer
      2.0.0-only dependency bound) appears in the `/3.6.0` hive and in `semVerLevel=2.0.0`
      search only, absent from the two older hives and from search without that parameter;
      every leaf carries a `catalogEntry` whose `dependencyGroups` name this registry's
      registration index for each dependency and whose `packageContent` names this registry's
      flat container; and `dotnet list package --outdated` reports the newest listed version,
      read from the registration index as the transcript shows.
- [ ] AC7: `dotnet nuget delete` through the real client unlists a version in exactly one
      snapshot: every hive serves `listed: false` and the 1900 `published`, search omits it,
      `dotnet add package` on both clients selects the newest listed version instead, a
      floating `PackageReference` still resolves to it when it is the highest match (the
      documented exception), an exact `PackageReference` still restores it, the version list
      still lists it, and the `.nupkg` is never removed; a relist through the management
      binding restores the marks with one further snapshot; the identifier and version in the
      `DELETE` URL are folded, so `/zzfoo/1.0.0` and `/ZzFoo/1.0.0` unlist the same version.
- [ ] AC8: A version hard-deleted through the registry-owned management API leaves every hive
      and the version list in exactly one snapshot, its download answers `404`, and a later push
      of the same coordinate is refused as AC3 refuses a duplicate, with the same bytes or
      different ones, including after the deletion's snapshot has been pruned out of retention;
      a principal without `delete` is refused with no snapshot created, and the same operation
      against a proxied repository is refused.
- [ ] AC9: `dotnet package search` returns pushed packages with `id`, `version`, `versions[]`
      with `@id` and `downloads`, `registration` and `packageTypes`, honouring `q` over
      identifier, description and tags, `skip` and `take`, `prerelease` and `packageType`;
      unlisted versions never appear; and on a virtual repository the results of two members
      are merged by identifier in member order, asserted from the served document.
- [ ] AC10: On a private repository a credential-less request answers `401` with
      `WWW-Authenticate: Basic` byte-identical for a private and a non-existent repository, both
      clients then restore with a Basic credential from `packageSourceCredentials` and from the
      `NuGetPackageSourceCredentials_{name}` variable, asserted from the transcript; a valid
      token lacking `pull` receives `404`; a rejected credential receives `401` and is never
      served as anonymous, the client reporting `NU1301`; `dotnet nuget push` with `--api-key` carrying an issued token is
      accepted with the header alone, with a wrong key is refused `403` and exits 1, and under
      a challenging source is retried with both `Authorization: Basic` and `X-NuGet-ApiKey` and
      accepted; and a credential presented over a connection this registry did not terminate
      with TLS is refused per `auth.md` AC27 whether it arrives as the header or as Basic.
- [ ] AC11: A token holding an unpatterned `pull` beside `push` under the pattern `acme.*/**`
      pushes and unlists `Acme.Tool` through the real 6.14.3 client and is refused pushing or
      unlisting `Other.Tool`, with no snapshot created by a refusal; a token holding only
      `pull` under the same pattern fetches `acme.tool`'s version list, package and
      registration index and is refused `other.tool`'s (the handler reporting `{id}` and
      `{id}/{version}` as the canonical objects, per the route table), is refused the service index, and a
      real `dotnet restore` under it therefore fails at its first request; a push whose
      `.nuspec` is not found within the bounded peek is refused before any byte reaches the
      CAS; and in proxied mode the patterned-`pull` token downloads an in-pattern package and
      is refused another.
- [ ] AC12: A version-list, download or registration request the shared policy layer refuses
      answers `403` with a body naming the policy, on the hosted and the proxied path, and a
      real `dotnet restore` of the refused version exits non-zero naming the status, with the
      refusal text captured in the transcript.
- [ ] AC13: The proxied path restores a package and its dependency from a v3 upstream stand-in
      and, from fresh client caches, a second `dotnet restore` reaches this registry and the
      upstream receives no request, both asserted at the network layer; the served `.nupkg` is
      byte-identical to the upstream's; the served index, version list, registration documents
      and search results carry no upstream URL; and a request for an identifier the upstream
      lacks is answered `404` (`NU1101` on the client) and negatively cached, while an upstream
      `429` or `5xx` is not.
- [ ] AC14: A proxied version list and registration index are revalidated after their TTL and
      not before, using `If-Modified-Since` so an unchanged document costs a `304` upstream; a
      version published upstream becomes visible to `dotnet restore` and `add package` after
      the TTL and, absent an explicit refresh, not before; and a client's own conditional
      request inside the TTL is answered `304` without an upstream request.
- [ ] AC15: An upstream `listed` flip to false is mirrored at the next revalidation with the
      cached package kept and a divergence recorded; a version or identifier vanishing upstream
      keeps serving with a divergence recorded; a `deprecation` object or `vulnerabilities`
      entries appearing upstream propagate as ordinary metadata; and a re-fetched package whose
      bytes differ from the recorded digest purges that version's cached file and raises the
      operator alert: NuGet's side of the settled removal table in `proxy-cache.md` (its AC13).
- [ ] AC16: A proxied package whose upstream registration index lists pages without `items` is
      served with this registry's own page URLs, `dotnet add package` resolves its newest version
      by fetching those pages through this registry, and the upstream receives page requests
      only for pages the client asked for, asserted at the network layer; and `dotnet package
      search` against the proxied repository returns the upstream's results with every URL
      rewritten.
- [ ] AC17: A hosted repository's index advertises no `VulnerabilityInfo` resource and its
      registration and search documents carry no `vulnerabilities` property, so a 6.14.3
      restore makes no vulnerability request; a proxied repository advertises the resource and
      serves the upstream's index and pages with every `@id` rewritten, a 6.14.3 restore of an
      upstream-flagged package prints `NU1903` naming the upstream advisory, and a 6.3.4 restore
      of the same makes no vulnerability request; the upstream `vulnerabilities` property
      passes through registration unchanged; and `dotnet list package --vulnerable` against the
      proxied repository reports the upstream advisory.
- [ ] AC18: A repository-signed package fetched through the proxied path and an author-signed
      package pushed through the hosted path are each served byte-identical, proven by
      `dotnet nuget verify` on the served bytes reporting the same signatures and fingerprints
      as on the originals and by equal digests; the served `.nuspec` equals the archive's; and
      no `RepositorySignatures` resource is advertised on either path.
- [ ] AC19: An unlist driven through the registry-owned management endpoint produces the same
      served registration documents, exactly one snapshot, and the same authorization outcome
      as the same operation driven through `dotnet nuget delete`; a relist and a deprecation
      through the endpoint produce one snapshot each, and `dotnet list package --deprecated`
      reports the deprecation with its reasons and alternate package; a principal holding
      `pull` without `push` is refused through both entry points with no snapshot created; and
      every operation against a proxied repository is refused.
- [ ] AC20: Replay-match passes against a corpus recorded from nuget.org covering the recorded
      surface named in Design.
- [ ] AC21: `dotnet nuget push` with a `.snupkg` beside the `.nupkg` makes exactly one `PUT`,
      exits 0, and stores nothing but the `.nupkg` on both pinned clients, and a `PUT` to a
      symbol-package path under the publish resource answers `404`.
- [ ] AC22: Configuring a remote repository whose upstream URL does not answer a v3 service index
      with a major version of 3 carrying `PackageBaseAddress`, `RegistrationsBaseUrl` and
      `SearchQueryService` resources (a V2 `api/v2` URL among the refused inputs) is refused at
      configuration with a message naming the requirement, and a push or management operation
      against a remote repository answers `405`.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/nuget/hosted_test.go` (both pinned clients; request paths and the zero-request warm restore asserted from the transcript and at the network layer; fresh `NUGET_PACKAGES` and `NUGET_HTTP_CACHE_PATH` in setup) |
| AC2 | conformance + integration | `conformance/nuget/publish_test.go` (push then restore from fresh caches on each client; `.nuspec` byte comparison); `internal/format/nuget/publish_test.go` (snapshot count, head-snapshot visibility before the response) |
| AC3 | conformance + integration | `conformance/nuget/publish_test.go` (duplicate with and without `--skip-duplicate` per client; invalid body); `internal/format/nuget/names_test.go` (case and normalisation collisions, snapshot count unchanged) |
| AC4 | conformance + unit | `conformance/nuget/service_index_test.go` (URL-space assertion over every served document during a proxied restore, `add package` and `package search`; network-level no-direct-upstream assertion); `internal/format/nuget/service_index_test.go` (resource set per repository type, cache header) |
| AC5 | conformance + integration | `conformance/nuget/names_test.go` (SemVer 2.0.0 push and restore, mixed-case `add package` on both clients, the `[1.02.0.0]` reference); `internal/format/nuget/names_test.go` (folding table over identifier case and version normalisation forms) |
| AC6 | conformance + integration | `conformance/nuget/registration_test.go` (127- and 128-version packages seeded through `state`; `add package` page fetches from the transcript; hive encoding and SemVer 2.0.0 exclusion asserted with `curl`); `internal/format/nuget/registration_render_test.go` (paging boundaries, hive membership, gzip) |
| AC7 | conformance + integration | `conformance/nuget/unlist_test.go` (real `dotnet nuget delete`, then `add package` on both clients, floating, exact and search assertions; folded `DELETE` URL spellings); `internal/format/nuget/unlist_test.go` (one snapshot per unlist and relist, file retained) |
| AC8 | integration + conformance | `internal/format/nuget/manage_delete_test.go` (one snapshot, retirement with same and different bytes, after pruning under an injected clock, `delete` refusal, proxied refusal); `conformance/nuget/hosted_delete_test.go` (the `script` deletes through the management endpoint, real restore then fails, real push of the coordinate is refused) |
| AC9 | conformance + integration | `conformance/nuget/search_test.go` (`dotnet package search` over each parameter; unlisted exclusion); `internal/format/nuget/search_test.go` (virtual merge order) |
| AC10 | conformance + integration | `conformance/nuget/auth_test.go` (private repository on both clients; challenge equality across existing and missing repositories from the transcript; config-file and environment credentials; push with header alone, wrong key, and the double-header retry); `internal/format/nuget/apikey_test.go` (header acceptance limited to the publish routes; plaintext refusal for the header form under `auth.md` AC27) |
| AC11 | conformance + unit | `conformance/nuget/auth_test.go` (the pattern-refusal case `format-handler-interface.md` AC7 requires, in both modes; pattern-scoped tokens provisioned through the `credentials` key; `curl` for the direct requests of the patterned-`pull` token; an archive with the `.nuspec` beyond the peek bound); `internal/format/nuget/scope_object_test.go` (the object table, per route, including folding of every spelling and the bounded peek, `format-handler-interface.md` AC12) |
| AC12 | conformance | `conformance/nuget/policy_test.go` (hosted and proxied modes; rules through the `policies` key, a controlled advisory through `advisories`; the refused restore's transcript) |
| AC13 | conformance | `conformance/nuget/proxied_test.go` (transcript + network-level assertion, fresh client caches in setup; byte comparison of the served package; missing identifier and throttling stand-in responses) |
| AC14 | conformance | `conformance/nuget/proxied_ttl_test.go` (mutating v3 stand-in serving `Last-Modified`; upstream `304` and client `304` both asserted at the network layer) |
| AC15 | integration | `internal/format/nuget/removal_test.go` (stand-in presenting each event class; the shared-layer half is `proxy-cache.md` AC13's) |
| AC16 | conformance | `conformance/nuget/proxied_paging_test.go` (stand-in with a paged, non-inlined hive; page requests upstream counted at the network layer; proxied `package search` URL-space assertion) |
| AC17 | conformance | `conformance/nuget/audit_test.go` (hosted: no vulnerability request on 6.14.3, no property in served documents; proxied: stand-in vulnerability pages, `NU1903` on 6.14.3, no request on 6.3.4, passthrough of the registration property) |
| AC18 | conformance | `conformance/nuget/signed_test.go` (a committed repository-signed fixture from nuget.org served through a stand-in; an author-signed fixture pushed; `dotnet nuget verify` output and digests compared; index resource-set assertion) |
| AC19 | conformance + integration | `conformance/nuget/manage_binding_test.go` (twin packages in one `script`: one unlisted through the management endpoint, one through real `dotnet nuget delete`; served documents compared; deprecation then `dotnet list package --deprecated`); `internal/format/nuget/manage_binding_test.go` (snapshot count per entry point and operation, `push`-only and `pull`-only refusals, proxied refusal) |
| AC20 | conformance | `conformance/nuget/replay_test.go` |
| AC21 | conformance | `conformance/nuget/symbols_test.go` (push with a `.snupkg` beside the package on both clients; single `PUT` from the transcript; direct `PUT` to the symbol path) |
| AC22 | integration | `internal/format/nuget/upstream_config_test.go` (V2 URL, non-JSON, wrong major version, missing required resource; `405` on push and management routes of a remote repository) |

The case set needs only keys already in the harness's closed `setup` vocabulary (its resolved
closed-vocabulary decision, was Q4): `repositories` with their visibility and type,
`credentials`, an `upstreams` stand-in, `state` for pre-published, pre-unlisted and paged
packages, and `policies` with `advisories` for AC12. The issued credential reaches the client as
`NuGetPackageSourceCredentials_{name}` and as the `--api-key` argument. The runner-enforced
obligations, both modes and the unauthenticated, unauthorized and pattern-refusal cases in
each, apply from the sibling specs and are not restated per criterion here.

## Implementation Phases

### Phase 1: Hosted reads
- The per-repository service index from visibility, type and base URL; the flat container from
  the head snapshot; the three registration hives from one renderer with inlining, paging,
  gzip and SemVer 2.0.0 exclusion; search; identifier and version folding; the challenge and
  scope mapping; the per-route addressed objects and the `403` policy rendering

### Phase 2: Publish and management
- Push with the bounded peek, archive validation, duplicate and retirement refusals, the API
  key header on the publish routes, the write-boundary declaration exercised end to end
- Unlist and relist as bindings onto the registry-owned operations, hard deletion and
  deprecation through the management API, the retirement set: waits on
  `docs/internal/plans/foundation/management-api.md` reaching `planned` (Blocking
  preconditions; AC7, AC8, AC19)

### Phase 3: Proxied path
- Upstream index discovery and validation, total URL rewriting, conditional revalidation on
  `Last-Modified`, proxied paging, proxied search and vulnerability passthrough, negative
  caching, the completion-only fetch mode, the removal table

### Phase 4: Corpus and gate
- Recording session across the named surface (after the harness redaction gate), replay-match,
  the second pinned client, the matrix rows for the deliberately absent resources and the
  `dotnet`-only client reach

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. The eight questions this draft raised were each written in the template's decision
shape and then adopted at their own recommendation under the owner's standing delegation of
2026-09-26, so the loop can continue; each is recorded below as adopted rather than decided,
folded through Scope, Design, the criteria and the Test Plan in the same pass, and reversible
by the owner at any time. `grep -rn "standing delegation"` is the owner's review queue.

### Resolved: what the PackagePublish DELETE does (was Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the client's `DELETE`
is an **unlist**, served as a binding onto the registry-owned unlist operation and authorized by
`push`; hard deletion exists only as a management-API operation under `delete`, and a deleted
coordinate is retired forever (Design, "Unlist, relist, delete and deprecate"; AC7, AC8, AC19).

The question: the docs say nuget.org "interprets the package delete request as an unlist" while
"other server implementations are free to interpret this signal as a hard delete, soft delete,
or unlist", and `dotnet nuget delete` is the one management command the real client has.

**Recommendation:** A, because it is what the client's users expect from the command's only
public reference, because unlisting is the ecosystem's yank and the docs say a deleted-then-
republished coordinate breaks the client's identity assumption, and because the destructive
operation then requires the removal-class action rather than the key every publisher holds.

| Option | You get | It costs |
|---|---|---|
| **A. Unlist, bound onto the registry-owned operation; hard delete through the management API only** | nuget.org semantics, so the recorded flow replays; the destructive path needs `delete`; lock files that pin the version keep working | A team wanting `dotnet nuget delete` to free space cannot; the relist, delete and deprecate triggers have no client oracle |
| **B. Hard delete** | One command removes content | Every lock file pinning the version breaks, the coordinate must still be retired, and the destructive action rides the key every publisher holds |
| **C. Configurable per repository** | Both behaviours | A command whose meaning depends on server configuration, and a recorded flow that replays under one setting only |

**Why this is yours:** it sets what the one client-driven management command promises operators,
and which action authorizes a destructive operation, a product and security call.

Accepted cost: relist, hard delete and deprecation are verified by this registry's own
integration tests plus the client-observable effect, and the divergence from nuget.org's
72-hour and dependent-count policy sits on the exception list.

### Resolved: the catalog resource (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: no catalog, on either
path, recorded as deliberately unimplemented so the matrix implies no coverage; the index
advertises no `Catalog` resource (AC4).

The question: the catalog is an append-only, time-indexed log of every package event that
nuget.org uses to keep its own resources current and recommends to mirrors for change
detection; the official client does not read it.

**Recommendation:** A. The reasons are not effort: the client never reads it, so no oracle
would back the claim; the shared model already holds every hosted event as snapshot history and
a second history would drift from it; and consuming an upstream's catalog to notice removals
is the background polling `proxy-cache.md`'s resolved signal-detection decision (was Q12)
rejected in favour of passive revalidation plus the advisory feed.

| Option | You get | It costs |
|---|---|---|
| **A. No catalog** | Nothing unbacked in the matrix; one history, the snapshot one | Third-party mirroring tools that walk a catalog cannot mirror this registry, and upstream `PackageDelete` events are not distinguished from other disappearances |
| **B. Render a hosted catalog from snapshot history** | Mirroring tools work | A second, publicly promised shape over snapshot history with no client oracle and cursor semantics to keep exact |
| **C. Consume the upstream catalog for removal detection** | Takedowns distinguished from deletions | Background polling of a rate-limited upstream, the decision that spec already made against |

**Why this is yours:** it decides whether this registry is a mirrorable source in the way
nuget.org is, a product-positioning call.

Accepted cost: the vanishing-version row of the removal table stays keep-and-flag.

### Resolved: repository signing (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: v1 signs nothing and
advertises no `RepositorySignatures` resource; every package is committed and served
byte-identical, author-signed or not, and what this format requires of the shared signing and
verification services is stated in Design (AC18).

The question: nuget.org repository-signs every package it serves; a source may advertise its
certificates and, with `allRepositorySigned`, promise that every package carries one; the
resource must be HTTPS-only; and countersigning rewrites the package bytes.

**Recommendation:** A. A repository signature changes the bytes the CAS stores, so it can only
be applied by the shared signing service before the commit, and that service is
`docs/internal/plans/foundation/signing-service.md` (to be authored in the spec loop) at charter
step 7; adopting it here would be defining a shared service's shape from a format. And
`allRepositorySigned: true` is unsatisfiable on any repository serving proxied content, whose
signatures are the upstream's, so the promise the resource exists to make could only be made
for pure hosted repositories.

| Option | You get | It costs |
|---|---|---|
| **A. No repository signing in v1; byte fidelity; requirements stated** | Signed upstream packages verify exactly as from nuget.org; no key in any handler; the shared service is asked, not built | Hosted packages carry no repository signature, so a `trustedSigners` policy cannot name this registry |
| **B. Countersign hosted packages through the signing service now** | A registry certificate operators can trust | Defines the signing service's publish-path hook from this spec, ahead of the prototype's finding and the service's own spec |
| **C. Advertise the resource with `allRepositorySigned: false` and an empty list** | The resource exists | It promises nothing and costs an HTTPS-only endpoint whose certificate list is empty |

**Why this is yours:** it decides whether this registry is a trust anchor for .NET consumers in
v1, and it sequences a shared-service dependency.

Accepted cost: a `trustedSigners` repository entry for this registry is not possible until the
signing service lands and this section is revised.

### Resolved: audit data and the vulnerability resource (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: a hosted repository
advertises no `VulnerabilityInfo` resource and omits the `vulnerabilities` property; a proxied
repository passes the upstream's index and pages through, rewritten (Design, "Audit data and
the vulnerability resource"; AC17).

The question: the .NET 8 SDK and later audit every restore against the source's vulnerability
resource, and when none is advertised the client reads the registration's `vulnerabilities`
property and reports an all-clear. The handler cannot reach advisory data without crossing the
policy boundary.

**Recommendation:** B, the npm precedent applied to a resource rather than an endpoint: an empty
page or an absent property is a "no known vulnerabilities" claim, so the honest hosted answer
is no resource and no property, with the implementation guide's own `auditSources` recipe
documented; proxied passthrough keeps nuget.org's audit signal intact for the cache use case.

| Option | You get | It costs |
|---|---|---|
| **A. Serve hosted pages from the policy engine's OSV data** | Real audit warnings on private packages' dependencies | A new advisory read in `Deps`, a shared-layer change with no owner yet, and a page that is only as fresh as the feed's staleness rule allows |
| **B. Hosted: none; proxied: passthrough** | No false all-clear; the cache keeps every upstream warning; nothing built twice before the policy layer offers a read | Hosted consumers see no restore-time warnings from this source and must configure an audit source |
| **C. Serve an empty page on hosted repositories** | The client is satisfied | The registry asserts "no known vulnerabilities" about content it never checked, by default, to every client |

**Why this is yours:** it prices a false all-clear against a missing warning on the hosted path,
a security-posture claim the product will be held to.

Accepted cost: the `Deps` advisory read is a sibling consequence for `supply-chain-policy.md`,
and hosted audit is documentation until it lands.

### Resolved: symbol packages (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: no
`SymbolPackagePublish` resource and no symbol storage; the client skips the symbol push
silently, and a direct push to a symbol path answers `404` (AC21).

The question: `dotnet nuget push` pushes a `.snupkg` found beside the package whenever the
index advertises the resource, and nuget.org serves symbols to debuggers through a separate
symbol-server protocol.

**Recommendation:** A. Symbols are consumed through a protocol that is not NuGet v3 and by a
client (a debugger) that is not in this loop, so stored symbols would be a claim nothing tests;
the client's own behaviour when the resource is absent (captured on both images) makes absence
free of user-visible cost.

| Option | You get | It costs |
|---|---|---|
| **A. No resource, no storage** | Nothing unbacked; the push flow is unchanged for users | Teams cannot host symbols here |
| **B. Accept and store the `.snupkg` as a second file of the version** | Symbols retained for a later symbol server | A stored artifact with no way to consume it, and a false claim in the matrix until a symbol-server spec exists |

**Why this is yours:** it sets whether this registry claims the .NET debugging surface, a
product call.

Accepted cost: a symbol-server spec, if ever wanted, revises this section and adds the resource.

### Resolved: the addressed object of a push (was Q6)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the push reports
`{id}/{version}` from a bounded peek at the leading entries of the archive in the streamed body,
and a body whose `.nuspec` lies beyond the bound is refused before any byte is spooled to the
CAS (Design, "Addressed objects and pattern scopes"; AC11).

The question: a NuGet push names no object on the wire; the identifier and version live in the
`.nuspec` inside the zip, and the only ordering guarantee a zip offers is its central directory
at the end. `helm.md` faced the same shape and adopted a bounded peek at a leading
`Chart.yaml`.

**Recommendation:** A. Both `dotnet pack` and nuget.org's own packages place the `.nuspec`
within the first entries (offset 321 in a fresh pack, offset 698 in a 2.4 MB nuget.org package)
with sizes in the local headers, so a streaming reader finds it within a small bound; a package
that hides it later is refused with the reason, which is a loud failure rather than an
over-grant.

| Option | You get | It costs |
|---|---|---|
| **A. Bounded peek; refuse when not found** | Patterned `push` works, which is the useful narrowing on this format; nothing unauthorized is spooled | A package whose `.nuspec` sits deep in the archive is refused until repacked |
| **B. Report `none` for push** | No peek | A patterned `push` never authorizes a push, so per-package CI credentials are impossible here |
| **C. Spool the whole body, then classify** | Every package classifiable | Unauthorized bytes are spooled to the size bound before the refusal, on the one route that accepts arbitrary uploads |

**Why this is yours:** it decides what a patterned CI credential can do on this format, and it
adopts a sibling's precedent for a security boundary.

Accepted cost: the bound is a configured constant, recorded with the refusal message.

### Resolved: nuget.org as a preconfigured upstream (was Q7)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: `api.nuget.org` joins
the preconfigured, enabled-by-default upstream set through `proxy-cache.md`'s own extension
mechanism (its resolved preconfigured-set extension, was Q14), the amendment recorded as a
sibling consequence of this spec rather than made here, with the nightly real-upstream job
gaining its row when NuGet ships.

The question: `proxy-cache.md` extended the owner's npm, PyPI and Docker Hub set with
galaxy.ansible.com because that format is Tier 1, and left the Tier 2 formats' upstreams
user-configured until a `continue` verdict. NuGet is Tier 1.

**Recommendation:** A, the precedent applied: NuGet is Tier 1 with no gate between it and
being built, a nuget.org cache is the enterprise use case the catalogue row names, and "works
in thirty seconds" is the pitch that decision was made for.

| Option | You get | It costs |
|---|---|---|
| **A. Preconfigure api.nuget.org through proxy-cache.md's extension mechanism** | A nuget.org cache out of the box; nightly coverage against the real upstream | nuget.org's CDN and search quirks join the support surface, and a sibling amendment lands from this spec |
| **B. User-configured in v1** | No sibling amendment | A worse first-run story for the one Tier 1 ecosystem whose row is justified by its install base |

**Why this is yours:** it extends a set the owner priced for three upstreams, a product and
support-surface call.

Accepted cost: the proxied conformance cases run against a stand-in in the main suite; the real
nuget.org is exercised by the recording session and the nightly job.

### Resolved: non-canonical request spellings (was Q8)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a request in any
identifier case or with a non-normalised version is folded and served, every URL in the
response canonical (Design, "Names and versions"; AC5).

The question: the docs mandate that the client lowercases and normalises, and nuget.org's
registration hive answers `404` to a mixed-case path while its flat container folds only
through a CDN rewrite; `cargo.md` chose `404` for a non-registered spelling.

**Recommendation:** A. Folding is deterministic and free, the canonical object for pattern
scopes is the folded key regardless, and a `404` to a hand-written URL would be a sharp edge
that the upstream itself avoids on its busiest resource; unlike Cargo, no client behaviour
depends on a wrong spelling failing.

| Option | You get | It costs |
|---|---|---|
| **A. Fold and serve** | Every spelling works; one canonical URL space in every response | A non-canonical URL is silently accepted, so a tool that writes one never learns it |
| **B. `404` on non-canonical spellings** | Strictness matching nuget.org's registration hive | `curl` users and scripts that copy an identifier's display case get `404`s the flat container on nuget.org would not give them |

**Why this is yours:** it is the naming promise scripts build on, a product rule.

Accepted cost: a redirect-free acceptance that never corrects a caller.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | 6641886 | authoring pass: grounded first draft, not a review | Grounded the wire contract three ways: captured traffic from the .NET SDK 6.0 (NuGet 6.3.4) and 9.0 (NuGet 6.14.3) images, pinned by digest, run in containers against a logging stub with `dotnet pack` fixtures (cold and warm restore, a SemVer 2.0.0 reference, a non-normalised reference, a mixed-case identifier, floating and exact restores of an unlisted version, `add package` with and without `--prerelease` and against a paged hive, `package search`, `list package --outdated` and `--vulnerable`, push accepted, duplicate with and without `--skip-duplicate`, invalid, key-less and wrong-key, push with a `.snupkg` beside the package with and without the symbol resource, `nuget delete` accepted, `404` and key-less, the `401` challenge with config-file and environment credentials on restore and push, a rejected credential, a repository-signatures resource over HTTP, `nuget verify` on an unsigned and a nuget.org package, restore with and without a vulnerability resource, and a missing identifier); the Microsoft NuGet server API reference (overview, service index, package content, package metadata, search, push and delete, symbol publish, catalog, repository signatures, vulnerability info), the implementation guide, the versioning, signed-packages, trust-boundary and authenticated-feed pages, the deletion policy, the SDK's signed-package-verification, restore-audit and verify pages, and the NuGet.Client source for the push and flat-container requests; and the live api.nuget.org (resource set, inlined and non-inlined registration paging, an unlisted leaf, cache and conditional-request behaviour, the CDN lowercase rewrite, `404`s on non-normalised and mixed-case paths). Design built from that: the per-repository service index beneath which every resource lives and total URL rewriting on the proxied path; the three registration hives from one renderer with nuget.org's 128/64 paging heuristic, gzip and SemVer 2.0.0 exclusion; lowercase and normalised keys with the display spelling and label case in the documents; the chunked multipart push with the bounded `.nuspec` peek as its addressed object; the write-boundary declaration with unlist and relist as metadata-only writes and hard deletion retiring the coordinate; unlist, relist, hard delete and deprecate as registry-owned management operations with the client's `DELETE` bound onto unlist; the API key header as a fifth presentation of a registry token beside Basic-after-challenge, with the double-header retry and the twelve-attempt `NU1301` storm recorded; the `403` policy rendering; hosted repositories making no vulnerability claim while proxied ones pass the upstream's pages through; byte fidelity for signed packages with the requirements on the shared verification and signing services stated; the proxied classification with `Last-Modified` revalidation (the live flat container ignores `If-None-Match`), opaque page-URL mapping, forwarded search, the completion-only fetch mode `go-modules.md` requested, and NuGet's rows of the removal table; and the client-cache trap. Eight questions written in decision shape and adopted under the standing delegation: `DELETE` is unlist with hard deletion under `delete` (AC7, AC8, AC19); no catalog (AC4); no repository signing in v1 with byte fidelity (AC18); hosted audit data absent and proxied passthrough (AC17); no symbol packages (AC21); the bounded-peek push object (AC11); api.nuget.org preconfigured through `proxy-cache.md`'s extension mechanism (sibling consequence); non-canonical spellings folded and served (AC5). Twenty-two criteria, each with a Test Plan row; check-spec clean with zero advisories. Sibling consequences recorded in the authoring report, not applied here: an `auth.md` client-table row for `dotnet` and the header form in its AC31, the `proxy-cache.md` preconfigured-set extension and a NuGet unlist row in its removal table, the `management-api.md` operations and action mapping, the `supply-chain-policy.md` advisory read through `Deps`, the verification and signing requirements, and a NuGet row in the management-surfaces analysis. Stays draft; awaits an independent review. |
