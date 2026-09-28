---
status: draft
status_description: "Authored 2026-09-26 as a grounded first draft: the Open VSX API and the VS Marketplace-compatible gallery contract captured from ovsx 0.10.12 and 1.2.0, VSCodium 1.99.32846 and 1.135.06055 (remote extension host builds), code-server 4.139.1 and, for signature handling only, Microsoft VS Code server 1.139.1, all pinned by digest or tarball checksum and run on a dedicated Podman network against a logging, rule-injecting stub implementing the /api and /vscode routes from the reference source (genuine VSIX fixtures across four target platforms, pre-release, dependencies, a pack, a tampered package, foreign-host fallbacks, refusals with reason phrases, a Basic challenge, a control document, rollback) and through a pass-through to the live open-vsx.org and its CDN; checked against eclipse/openvsx at a6cfaf7 (server and CLI), VS Code 1.99.3, 1.135.0 and 1.139.1, the live open-vsx.org (headers, 302s, 100 sampled versions all with sha256 and signature, an Ed25519 .sigzip verified with openssl, case-insensitive lookup, the GitHub control document) and OSV (21 MAL- advisories under VSCode and VSCode:https://open-vsx.org). Eighteen questions written in decision shape and adopted under the owner's standing delegation; none open. Awaits a /spec review pass."
description: "Spec for the Open VSX format: the Open VSX registry API (/api metadata, per-target .vsix files, publish and unpublish with a token that released ovsx clients send only in the query string) and the VS Marketplace-compatible gallery surface (a POST extensionquery with a flags bitfield and typed criteria, and /vscode/asset routes), where every served URL, including the fallbackAssetUri the editor falls back to, names this registry, namespace ownership is expressed as auth.md pattern scopes through a namespace-bound publish base, hosted versions carry a .sigzip signed by the shared signing service, policy refusals reach the editor through a registry-served control manifest, and an open-vsx.org cache regenerates every document it serves, with ovsx 0.10.12 and 1.2.0, VSCodium 1.99 and 1.135 and code-server 4.139.1 as the oracles."
author: michielvha
goal: "Serve editor teams a private Open VSX registry and an open-vsx.org cache that VSCodium, code-server and ovsx use as they are, in which every extension an editor installs comes from the registry, is bound to the bytes the registry verified, and can be refused by policy with no request leaving the registry, with namespace ownership mapped onto the registry's own pattern scopes and the real clients as the oracle on both paths."
priority: "low"
issue: 42
created: 2026-09-26
covers:
  - "internal/format/openvsx/**"
  - "conformance/openvsx/**"
fable_recheck: "authored on Opus 2026-09-27 while Fable was out of monthly credit; grounded in captured client traffic, but the design judgement was never Fable-reviewed"
---

# Plan: Open VSX format

The Open VSX registry, hosted, proxied and virtual: the Open VSX REST API under `/api` that the
`ovsx` command line publishes to and downloads from, and the VS Marketplace-compatible gallery
under `/vscode` that VSCodium, code-server and (with one setting changed) Microsoft VS Code query
with a JSON `POST` and download `.vsix` packages from, one package per extension version and
target platform. ovsx 0.10.12 and 1.2.0, VSCodium 1.99.32846 and 1.135.06055, and code-server
4.139.1 are the oracles on both paths.

## Context

Open VSX sits in Tier 3 of `formats/catalogue.md` as the single-ecosystem family "Open VSX". **Its
build is gated by `project-charter.md` AC9 and `catalogue.md` AC5**: no handler code for a Tier 3
ecosystem exists before every Tier 1 format has met its definition of done and the owner has
recorded a `continue` verdict at the charter's build step 8. This spec exists now because the owner
directed on 2026-09-26 that all 33 ecosystems be specced up front (the catalogue's "Every ecosystem
below is specced now; only building is gated"), so the gate decides what is built and never what
is written; a `shrink` verdict parks it.

Open VSX has **two wire contracts and no specification for either**. The `/api` surface is defined
by the Eclipse Open VSX server (`eclipse/openvsx`, its `RegistryAPI`) and consumed by `ovsx`, the
Open VSX command line from the same repository. The `/vscode` surface is a reimplementation of the
Visual Studio Marketplace's undocumented gallery protocol (the server's `VSCodeAPI` and
`LocalVSCodeService`), consumed by every editor built from the VS Code source. So the grounding is
captured traffic first and source second, stated up front because the constitution asks for
evidence or silence:

- **Captured client traffic.** Neither `ovsx` nor `codium` is installed on this host (`which ovsx
  codium` finds nothing; `/usr/bin/code` is Microsoft VS Code 1.133.0, which cannot be pointed at a
  custom gallery without editing its install), so every client ran in a container on a dedicated
  Podman network (`vsxcap-net`) with no other workload on it, against a logging, rule-injecting
  stub (`docker.io/library/python:3.12-slim@sha256:f77ac9e44ae96ef2c90b8053ea08c31f8be030f824196b0ae4db6d462c84e51f`
  with `cryptography` 46.0.1 for Ed25519) that implements the Open VSX `/api` routes and the gallery
  `extensionquery` and `/vscode/asset` routes from the server source, records every request with its
  headers and body, and injects a status, reason phrase, body or file per request from a rules file;
  a second network alias on the stub played "another host" so a request's destination is visible,
  and a pass-through mode relayed requests to the live open-vsx.org and its CDN for the flows where
  the real server's answers matter. The clients:
  - **ovsx 0.10.12** (the last 0.x release, npm integrity
    `sha512-WwMj1iQDvCk02029oxPnkFXsPrHZ+WzmoNW5pJ8JGepHtL30i2JE4s3C3wqzQqj6a35vx2hp0gV3TdfefGmvMg==`)
    and **ovsx 1.2.0** (the current release, 2026-09-10,
    `sha512-12mauBqsLehlJ0cRiroQz4uKYVjblVS5OobgSJ278CdCtkDfRQD+SI3NQ00GNalDqzp5PDN11yx84miFUojeMw==`),
    installed into `docker.io/library/node:22-bookworm-slim@sha256:43ac6c60b8f89723f746e8a92ce91abd5017e627ce1ddfe4238355d3a30b772c`.
  - **VSCodium 1.99.32846** (April 2025, VS Code 1.99.3, Node 20.18.2) and **VSCodium 1.135.06055**
    (the current release, 2026-09-09, Node 24.18.1), as their headless remote-extension-host builds
    (`vscodium-reh-linux-x64` tarballs, sha256 `1249c8fd86745bf7c822b27cfc5ba1ccb36dd4d873f1b128a42366d5f69f55ac`
    and `bd23015a35b915bac3c6fca962ca5db427f5c8f049702e48ddeb72757ab32745`) on
    `docker.io/library/debian:bookworm-slim@sha256:3783cc01769c7b2b1b83a5c5ad96c815348e28ed7da68e2e3687004faa906251`,
    driven by `codium-server --install-extension`, `--update-extensions` and `--list-extensions`,
    with the gallery set through VSCodium's product overrides `VSCODE_GALLERY_SERVICE_URL` and
    `VSCODE_GALLERY_CONTROL_URL` (both versions; 1.135 adds `VSCODE_GALLERY_ITEM_URL` and
    `VSCODE_GALLERY_LATEST_URL_TEMPLATE`, found in the build's `server-main.js`).
  - **code-server 4.139.1** (Code 1.139.1),
    `docker.io/codercom/code-server@sha256:0c067c3cf09ed1830ce282387826be8feefef8a5828f462791c2df3f1007ee17`,
    with the gallery set through its `EXTENSIONS_GALLERY` JSON.
  - **Microsoft VS Code server 1.139.1** (commit `04c0d99f`, tarball sha256
    `e2ce35b8c0b90cf217feee9873a19c1e2ee414cf01a5989d67c87e0ef8416894`), its `product.json`
    `extensionsGallery` rewritten inside the container, run for the one question the others cannot
    answer: what a client that verifies signatures does with this ecosystem's signatures.

  The fixtures were genuine VSIX packages in the layout `vsce` writes (`extension.vsixmanifest`,
  `[Content_Types].xml`, `extension/package.json`): a universal extension at three versions with the
  newest marked pre-release, one extension published for four target platforms plus universal, an
  extension with an `extensionDependencies` entry, an extension pack, an extension whose only target
  is `win32-x64`, one whose universal version is newer than its `linux-x64` version, a tampered
  package with a genuine identity, and a namespace nobody owned. The stub is not a reference
  implementation; what the captures prove is what the clients send and how they react.
- **The source**, read for what the captures surprised or could not show: `eclipse/openvsx` at
  `a6cfaf7` (2026-09-25): the server's `RegistryAPI`, `LocalRegistryService`,
  PublishExtensionVersionHandler, `ExtensionValidator`, `ExtensionVersionIntegrityService`,
  `MirrorExtensionService`, `UserService`, `NamespaceMembershipJooqRepository`, the adapter package
  (`VSCodeAPI`, `LocalVSCodeService`, `ExtensionQueryParam`, `ExtensionQueryResult`,
  `DefaultExtensionQueryRequestHandler`), `TargetPlatform` and `NamingUtil`, and the CLI sources
  (registry.ts, `publish.ts`, get.ts, `verify.ts`, `util.ts`), cross-checked against the
  compiled JavaScript of the two released ovsx versions; and VS Code 1.99.3, 1.135.0 and 1.139.1
  (`extensionGalleryService.ts`, `extensionGalleryManifestService.ts`,
  `abstractExtensionManagementService.ts`, `extensionManagementService.ts`,
  `extensionDownloader.ts`).
- **The live upstream**, open-vsx.org on 2026-09-27: `/api/version` answers
  `{"maxExtensionSize":262144000,"version":"v1.1.2"}`; `/api/-/search` reports 18,472 extensions;
  extension metadata carries a strong `ETag` and `Cache-Control: no-cache, public` but answers `200`
  to both `If-None-Match` with that `ETag` and `If-Modified-Since`; every `/api/.../file/...` route
  and every `/vscode/asset/...` route answers `302` to `openvsx.eclipsecontent.org` with
  `Cache-Control: max-age=604800, public`; the gallery query answers
  `application/json;api-version=3.0-preview.1` with `Cache-Control: public, max-age=600`, and for
  `redhat.java` with the flags VS Code sends lists eleven target platforms; lookups are
  case-insensitive (`/api/hookyqr/BEAUTIFY` answers `HookyQR.beautify`); of 100 sampled versions (the
  40 oldest by timestamp, from 2020, and 60 mid-ranked) every one carried a `sha256` file and a
  `signature` file; the `.sigzip` of `esbenp.prettier-vscode` 12.4.0 is a zip of
  `.signature.sig` (64 bytes), `.signature.manifest` (JSON of the package digest and a SHA-256 per
  entry) and an empty `.signature.p7s`, and `.signature.sig` verified with `openssl pkeyutl -verify
  -rawin` as a raw Ed25519 signature over the **whole `.vsix`**, against the PEM the metadata's
  `publicKey` URL serves. The editor's extension-control document VSCodium is configured with lives
  on GitHub (`EclipseFdn/publish-extensions`, `extension-control/extensions.json`) and lists 948
  `malicious` identifiers and 128 `deprecated` entries beside `migrateToPreRelease`,
  `extensionsEnabledWithPreRelease` and `search`.
- **OSV.** `ecosystems.txt` lists `VSCode`; `VSCode/all.zip` holds 21 advisories, every one a `MAL-`
  malicious-package entry, 4 under the ecosystem `VSCode` (the Marketplace) and 17 under
  `VSCode:https://open-vsx.org`, the OSV schema's registry-URL suffix form. Names are
  `{publisher}.{name}` with their published case, and the query API matches them case-sensitively:
  `CodeInKlingon.git-worktree-menu` under `VSCode:https://open-vsx.org` answers `MAL-2025-191158`,
  the lowercased name answers nothing. Most advisories carry `introduced: 0` with no fix; two carry a
  `fixed` version (`checkmarx.ast-results` fixed at 2.58.0: 2.57.0 matches, 2.58.0 does not) and four
  carry only an explicit `versions` list. The purl specification defines `vscode-extension`, with
  case-insensitive namespace and name, a `platform` qualifier and `repository_url` for Open VSX.

Where the source and the captures disagree, the captures win, and the disagreement is recorded
because it would otherwise be built from the source. **The repository head of ovsx sends the token
as `Authorization: Bearer` to a registry reporting version 1.3.0 or later; no released ovsx does.**
Both released versions sent the token only as the `token` query parameter, to a stub reporting
`v1.1.2` and to one reporting `v1.3.0` alike (captured), and the compiled 1.2.0 builds every token
URL with `{ token: pat }` unconditionally.

Seven things make this format worth a careful spec. **The editor falls back to a second URL our own
metadata names**: when an asset request to a version's `assetUri` fails, the client repeats it at
the version's `fallbackAssetUri`, and a stub whose `fallbackAssetUri` named another host saw the
editor go there (captured), so every URL in every served document must name this registry. **The
gallery query is a `POST` of typed criteria and a flags bitfield**, whose semantics exist only in
two codebases and whose filter type 8 means one thing to the editor and another to the server.
**Target platforms make an extension version several packages**, which the client selects among
by a rule that prefers the newest version over the most specific target (captured). **Namespace
ownership is Open VSX's whole authorization model** and has to become this registry's pattern
scopes without a second vocabulary. **Released publishers put the token in the query string**, a
credential form `auth.md` does not have. **No editor verifies what it installs, and the one that
tries rejects this ecosystem's signatures**: VSCodium and code-server installed a tampered package
with exit 0 and never fetched the signature, while Microsoft VS Code refused both an Open VSX
signature and no signature (all captured). And **no editor can present a credential or show a
refusal's reason**: a `401` with a Basic challenge reads as "not found", URL userinfo is dropped,
and a refused download surfaces as a zip parse error (all captured).

## Blocking preconditions

**The handler interface re-open must complete before this handler starts**, as for every handler
(`format-handler-interface.md` AC8). Open VSX is Tier 3, so the catalogue's Tier 1 gate (its AC5)
and the charter's breadth verdict (its AC9, build step 8) both precede it; the re-open is recorded
here anyway, from this side, because a gate enforced on one side only is enforced nowhere.

**The shared signing and index service must be `planned` before Phase 1.** A hosted publish is a
client-native wire write that produces a per-version `.sigzip` inside the same write, signed by a
registry key the service holds (the resolved hosted-signing decision below). That service is
`docs/internal/plans/foundation/signing-service.md` (to be authored in the spec loop), which the
charter builds at step 7 as the production form of what the step 4a prototype learned. What this
format requires of it is stated in Design ("What the signing service must provide"), never designed
here. Nothing is asked of its index half: this format has no repository-wide generated index.

**The management API must be `planned` before Phase 2.** `ovsx unpublish` is a client-driven route
served as a binding onto the registry-owned removal operation, and marking a namespace verified is a
registry-owned operation with no client trigger (the resolved unpublish and verified-namespace
decisions below). Both belong to `docs/internal/plans/foundation/management-api.md` (to be authored
in the spec loop), whose core the charter builds at step 2 and completes at step 9.

**Artifact verification must be `planned` before Phase 3.** A proxied package's upstream signature
is verified against the remote repository's pinned upstream keys, and the verdict is what
`supply-chain-policy.md`'s signature rules consume (Design, "Signing, provenance and policy"). That
producer is `docs/internal/plans/foundation/artifact-verification.md` (to be authored in the spec
loop; charter step 4b). This format supplies it the first Ed25519 raw-signature envelope in the
catalogue.

**The proxy layer must accept a declared digest obtained by a second metadata request, and the Open
VSX upstream adapter must exist, before Phase 3.** The gallery response that leads a client to a
package carries no digest; the digest lives in a separate `.sha256` file named by the version's
`/api` metadata, so stream-and-verify must take a digest the handler fetched beforehand through the
same fetch-and-cache entry. The adapter, requested of
`docs/internal/plans/foundation/upstream-adapters.md` (to be authored in the spec loop; charter
step 4), follows the upstream's `302` to its storage host only within an allowlist (the shape
`composer.md` requested in its resolved dist-host decision, was Q6), fetches and revalidates the
upstream's extension-control document, and holds the remote's pinned upstream public keys.

Nothing is required of `docs/internal/plans/foundation/async-operations.md` (charter step 6a): every
write this format makes completes inside its request, as the reference server's own `201` does.

## Scope

**In scope:**

- The Open VSX API read surface under the format-first mount `/openvsx/{repository}/`:
  `api/version`, `api/{namespace}`, extension metadata at `api/{namespace}/{extension}` with an
  optional target platform and an optional version (`latest` and `pre-release` included), the
  `versions` and `version-references` listings, files at `.../{version}/file/{name}`, `api/-/search`
  and `api/-/public-key/{id}`; `GET` and `HEAD`.
- The client-native write surface: `api/-/publish` (a raw `.vsix` body, chunked), `api/{namespace}/verify-pat`,
  `api/-/namespace/create`, and `api/{namespace}/{extension}/delete`, with the token accepted as
  the `token` query parameter, as `Authorization: Bearer` and as `X-OpenVSX-Token`, on these routes
  only.
- The gallery surface under `vscode/`: `gallery/extensionquery` (`POST`) with the full criteria and
  flags vocabulary, `asset/{namespace}/{extension}/{version}/{assetType}` with the `targetPlatform`
  query parameter, and the latest-version routes `gallery/{namespace}/{extension}/latest` and
  `gallery/vscode/{namespace}/{extension}/latest`.
- A registry-served extension-control document at `vscode/control.json`, listing only the
  extensions this repository condemns as a whole.
- Target platforms: one package per `(version, target)`, the twelve target names the reference
  server accepts, per-target retirement and removal.
- Hosted signing: every hosted package gets a `.sigzip` and a `.sha256` produced inside its publish,
  signed by a registry key held by the shared signing service, with public keys addressed by digest.
- Names: case-preserving namespaces and extension names, unique case-insensitively, looked up
  case-insensitively; the canonical addressed object lowercased.
- Namespace ownership as `auth.md` pattern scopes, with a namespace-bound write base so a
  namespace-patterned token can publish; the `verified` flag as an administrator's declaration.
- Private reads for clients that cannot send a credential, through a read-only registry token
  carried as a path segment.
- Per-route addressed objects with the pattern-refusal case `auth.md` AC8 requires, and the
  rendering of a shared policy refusal on both surfaces.
- A VSIX reader that never executes anything and bounds every read.
- The proxied path against open-vsx.org or any Open VSX server: metadata regenerated from parsed
  upstream records and never relayed, packages fetched through the adapter and verified against the
  upstream's declared SHA-256 and its signature, assets served from the verified package, the
  upstream control document's `malicious` list as an explicit upstream security signal, negative
  caching, and this format's rows of the removal table.
- Virtual repositories with per-extension member-ordered resolution.
- ovsx 0.10.12 and 1.2.0, VSCodium 1.99.32846 and 1.135.06055 and code-server 4.139.1 as the
  conformance oracles on both paths, and Microsoft VS Code 1.139.1 with signature verification
  switched off as a documented additional client.

**Out of scope for v1**, each with its reason, recorded because the interface spec's definition of
done requires the deliberately unimplemented surface to be named:

- **Reviews and ratings** (`api/{namespace}/{extension}/reviews`, `review`, `review/delete`). They
  are user-generated social content attached to a web identity, not artifacts; no captured client
  reads or writes them, and the statistics they feed are served as absent.
- **Download counts.** The reference increments a counter on every package download. A counter is a
  write per read, which the shared model deliberately has no place for (`data-model.md`: only a
  completed logical write creates state); counts are served as zero.
- **Trusted publishing** (`api/-/trusted-publishing/token`, the OIDC exchange ovsx 1.2.0 performs in
  CI). It issues registry credentials in exchange for a CI provider's identity token, which is
  credential issuance and belongs to the token surface `auth.md` places in
  `foundation/credential-management.md` (owed), not to a format.
- **Deprecation, replacement and pre-release migration as published state.** Their only effect on
  an editor is through the control document's `deprecated` and `migrateToPreRelease` entries, which
  make the editor install a different extension than the one requested
  (`abstractExtensionManagementService.ts`, `checkAndGetCompatibleVersion`, the `autoMigrate`
  branch), a steering channel this spec keeps off the wire (the resolved control-document decision
  below).
- **The web UI's routes** (`api/user/*`, `api/{namespace}/details`, `api/{namespace}/logo/...`,
  `vscode/item`, which redirects a browser to an extension page). They serve a browser session on
  the reference's own website; this registry's web UI is `project-charter.md`'s step 9 and renders
  the shared model, not these documents.
- **Web-extension resources** (`vscode/unpkg/...`, the gallery's `resourceUrlTemplate`, the
  `Microsoft.VisualStudio.Code.WebResources` asset). They serve files of an uninstalled extension to
  a browser-hosted workbench such as vscode.dev; code-server and VSCodium install server-side, and no
  captured client requested them.
- **The mirror and change feeds** (`api/-/version-changes`, `api/-/query`, `api/v2/-/query`). They
  exist for another registry or a scanner to follow this one; no captured client requested them, and
  instance-to-instance following is `replication.md`'s surface.
- **The `GET` form of `extensionquery`.** No captured client sent it; every editor sends the `POST`.
- **Open VSX's own publish-time scanning and namespace-claim workflow.** Scanning is
  `supply-chain-policy.md`'s shared cataloguer; namespace claims are replaced by the pattern-scope
  model (the resolved namespace decision below).
- **open-vsx.org as a preconfigured upstream** (the resolved preconfigured-upstream decision below):
  user-configured in v1, for sequencing.

## Design

### The wire surface, as captured

Every path hangs off the repository URL, `https://{host}/openvsx/{repository}`, format-first per
`format-handler-interface.md`'s resolved URL-shape decision. ovsx takes it as `-r` (or
`OVSX_REGISTRY_URL`) and keeps any path, stripping one trailing slash (captured against
`http://vsxstub:8080/n/acme/`); an editor takes `{base}/vscode/gallery` as its gallery service URL,
posts to `{serviceUrl}/extensionquery`, and takes every later URL from the responses.

| Surface | Shape, as the pinned clients send it |
|---|---|
| ovsx publish | `POST {base}/api/-/publish?token={pat}` with `Content-Type: application/octet-stream`, `Transfer-Encoding: chunked`, no `Content-Length`, no `User-Agent`, no `Accept`, and the raw `.vsix` as the body; `201` with the version's metadata JSON, from which ovsx prints "Published acme.native v1.0.0@linux-x64" (captured on both). ovsx 1.2.0 first sends `GET {base}/api/version` with no credential, to read `maxExtensionSize` (captured; `publish.js`) |
| ovsx namespace and token checks | `POST {base}/api/-/namespace/create?token={pat}` with `{"name":"other"}`; `GET {base}/api/{namespace}/verify-pat?token={pat}` (captured on both) |
| ovsx unpublish (1.2.0 only) | `GET {base}/api/version`, then `POST {base}/api/{namespace}/{extension}/delete?token={pat}` with `[{"version":"1.0.0"}]` or `[{"version":"1.0.0","targetPlatform":"alpine-x64"}]`, or with `allVersions=true` and no body for the whole extension (the first two captured, the third
from registry.ts). The client refuses before sending when `api/version` reports below 1.2.0: "The registry at ... runs version v1.1.2, but deleting extensions requires version 1.2.0 or later." (captured) |
| ovsx get | `GET {base}/api/{namespace}/{extension}` (or `.../{target}` with `-t`), then a `GET` of the metadata's `files.download` URL **whatever host it names**, following redirects across hosts (captured: `vsxother` served the package after a metadata document named it, and after a `302`), saved under the last path segment of that URL (captured: a URL ending `/redir` saved as `redir`). No credential, no `User-Agent`, no conditional header, no verification of any kind (get.ts) |
| ovsx show, list, search, verify (1.2.0) | `api/{namespace}/{extension}` then `.../version-references?size=100&offset=0`; `api/{namespace}`; `api/-/search?size=20&offset=0&query=...`; and for `verify`, the metadata, its `files.signature` and its `files.publicKey` (captured) |
| Gallery query | `POST {serviceUrl}/extensionquery`, `Content-Type: application/json`, `Accept: application/json;api-version=3.0-preview.1`, `Accept-Encoding: gzip`, `User-Agent: VSCode 1.135.06055 (VSCodium)` (or `VSCode 1.99.32846 (VSCodium)`, `VSCode 1.139.1 (code-server)`), `X-Market-Client-Id`. Body: one filter whose criteria are the extension name (type 7, lowercased by the client: ACME.Hello was sent as `acme.hello`), type 8 `Microsoft.VisualStudio.Code` and type 12 `4096`, `pageNumber` 1, `pageSize` the number of names, `sortBy` 0, `sortOrder` 0, and `flags` 950 for a resolve; then, when the latest-only answer does not settle it, the same by extension id (type 4, the UUID from the first answer) or by name with `flags` 439 (captured on all three) |
| Gallery assets | `GET {assetUri}/Microsoft.VisualStudio.Code.Manifest?targetPlatform={t}` (twice per install), then `GET {fallbackAssetUri}/Microsoft.VisualStudio.Services.VSIXPackage?redirect=true&targetPlatform={t}&install=true` (or `update=true`), `targetPlatform=universal` included for a universal package (captured on all three). No signature asset is ever requested by VSCodium or code-server (captured); Microsoft VS Code requests `.../Microsoft.VisualStudio.Services.VsixSignature` after the package (captured) |
| Control document | `GET {controlUrl}` once per install, with no `User-Agent` (captured) |
| Error rendering | ovsx prints a JSON body's `error` or `message` for metadata, publish and management errors, but only "The server responded with status 403: {reason phrase}" for a download (captured on both); editors print "Server returned 403" or "Server returned 500" and never a body or a reason phrase, and a 4xx from the query reads as "Extension 'acme.hello' not found." (captured) |

**The two versions of each client agree on the wire** for every route above. ovsx 1.2.0 adds the
`api/version` probe, `unpublish`, `show`, `list`, `search` and `verify`; VSCodium 1.135 adds two
override variables and reworded one message ("... for the Linux 64 bit." became "... for the Linux
64 bit platform."). code-server sends the same requests as VSCodium, and Microsoft VS Code the
same plus the signature asset.

### Seven client behaviours that decide the design

**The editor falls back to `fallbackAssetUri`, and ovsx goes wherever `files.download` says.** A
manifest request refused at a version's `assetUri` was repeated at its `fallbackAssetUri`, which the
stub had pointed at another host, and that host received the request (captured on both VSCodium
versions); the download itself always uses `fallbackAssetUri` first ("always use fallbackAssetUri
for download asset", `getDownloadAsset`). ovsx followed an absolute `files.download` naming another
host, and a cross-host redirect, with exit 0 (captured). The reference points both asset URIs at
itself and redirects to its CDN host (live). So a registry that relayed upstream documents would
hand the editor a fallback outside every refusal; every URL-valued field this registry serves names
this registry (the resolved regeneration decision below; AC17).

**Nothing verifies, and the one verifier rejects this ecosystem.** VSCodium 1.99 and 1.135 and
code-server installed a package whose bytes differed from what the registry published, printing
"successfully installed" and exit 0, with no request for the signature asset (captured: the installed
README read `TAMPERED`). ovsx `get` hashes nothing (get.ts). Microsoft VS Code downloaded the
signature and then refused the install with "Signature verification failed with 'UnknownError'
error." for a stub-signed package and for `esbenp.prettier-vscode` from the live open-vsx.org, and
refused an unsigned package with "'NotSigned'"; it installed only with `extensions.verifySignature:
false` in the server's machine settings (all captured). Its verifier, the bundled `@vscode/vsce-sign`,
does not accept the Ed25519 envelope, whose `.signature.p7s` Open VSX leaves empty. The only verifier
of Open VSX signatures is
`ovsx verify` (1.2.0), on demand, against the key the registry names (captured: "This package is
identical to acme.hello v1.1.0 as published to ..." and, for tampered bytes, "does not match the
version published to ..."). So the registry is the root of trust for everything an editor installs,
and what it verifies on ingest and on proxied fetch (Design, "Signing, provenance and policy") is
all the protection there is.

**No editor can authenticate.** A gallery service URL carrying userinfo sent no `Authorization`
header on any request (captured), and a `401` with `WWW-Authenticate: Basic` on the query was
reported as "Extension 'acme.hello' not found." with no retry (captured on VSCodium 1.135 and
code-server); VS Code's query code turns every 4xx into an empty result
(queryRawGalleryExtensions). Released ovsx sends a credential only on its write routes. This is
what decides the resolved private-read decision below.

**No editor shows why.** A package refused with `403`, a JSON body and a custom reason phrase was
requested six times (the download URL and its fallback, three rounds), the refusal body was written
out as the package, and the install failed with "End of central directory record signature not
found. Either not a zip file, or file is truncated." (captured on both VSCodium versions). A refused
manifest gave "Server returned 403" (captured). The one refusal an editor explains is its control
document's `malicious` list: an extension on it, or one whose dependency is on it, failed with
"Can't install 'acme.hello' extension since it was reported to be problematic." before any package
request (captured on both). That is what decides the resolved refusal-rendering decision below.

**Target selection prefers the newest version over the most specific target.** With `linux-x64`,
`linux-arm64`, `win32-x64` and universal packages of one version, a linux-x64 editor installed the
`linux-x64` package; with a universal 2.0.0 and a `linux-x64` 1.0.0 it installed the universal
2.0.0; with only `win32-x64` it failed "The 'acme.winonly' extension is not available in VSCodium
for the Linux 64 bit platform." (all captured on both). The client computes its own platform and
asks for each asset with `targetPlatform` set, `universal` included (captured).

**A rollback is visible at the next query and applied only on request.** The query is a `POST`
sent with no conditional header, so no freshness header can hide a change. After hello 1.4.0 was
published, `--update-extensions` installed it; after 1.4.0 was removed again, `--update-extensions`
answered "No extension to update", and `--install-extension acme.hello --force` then printed
"Updating the extension 'acme.hello' to the version 1.3.0" and installed it (captured on both
VSCodium versions, with 1.5.0 standing in on 1.135). So the pointer-scoped `Last-Modified` that
`debian.md`, `conan.md`, `hackage.md` and `luarocks.md` needed is not needed here (Design,
"Freshness headers and rollback").

**Released ovsx puts the token in the URL, and the duplicate check is a string match.** Every
token-bearing request of both versions carried `?token={pat}` and nothing else (captured), and
`--skip-duplicate` succeeds only when the error message ends with "is already published." (captured:
"Extension acme.hello 1.0.0 is already published. Skipping publish.", exit 0; `publish.js`). ovsx
defaults to `https://open-vsx.org` when neither `-r` nor `OVSX_REGISTRY_URL` is given
(registry.ts, `DEFAULT_URL`), so a mistyped CI variable publishes a private extension to the
public registry; the operator documentation says so beside the recipe.

### Mapping onto the shared model

The levels are exactly those `data-model.md` provides; no table is added.

- **`Package.name` is `{namespace}.{extension}`** as first published, case preserved (the resolved
  name decision below). The package-level document holds the extension's **UUID** (the gallery's
  `extensionId`, generated at the first publish of the name and never changed), the **retirement
  set** of removed `(version, target)` pairs, and the principal of each publish for `publishedBy`.
- **`Version.version` is the version string**, exactly as the manifest's `Identity` declares it. The
  version-level document holds, **per target platform**, what ingest read from the package's
  `extension.vsixmanifest` and `extension/package.json` (display name, description, `engines`,
  `extensionDependencies`, `extensionPack`, categories, tags, `extensionKind`, localized languages,
  licence, repository, gallery colour and theme, whether the `Microsoft.VisualStudio.Code.PreRelease`
  property is `true`), the package's SHA-256, the signing key's digest, the member names of each
  extracted asset, and the publish time. A version with packages for several targets is one
  `Version` with several targets in its document (the resolved target-platform decision below).
- **Files per target** `{t}`: `{t}/{namespace}.{extension}-{version}[@{t}].vsix` (the `@{t}` suffix
  omitted for `universal`, the reference's file name, `NamingUtil`), the matching `.sigzip` and
  `.sha256`, and each extracted asset (`package.json`, `extension.vsixmanifest`, the readme,
  changelog, licence and icon the manifest's `Assets` name), each a `File` over a `Blob` keyed by its
  CAS digest. Two targets with byte-identical packages share one blob.
- **The repository-level document** holds the namespace UUIDs (the gallery's `publisherId`, generated
  at the first publish into a namespace), the set of namespaces an administrator declared verified,
  and the case-folded name set that enforces case-insensitive uniqueness.
- **A `remote` repository** holds, in each package-level document, the regenerated record of the
  upstream extension (every version and target with the fields above, the upstream UUIDs, the
  upstream's declared SHA-256 per package once fetched, and the upstream's `verified` flag), CAS-backed
  above the inline threshold (`storage-and-gc.md` AC16); in its repository-level document the
  upstream's pinned public keys and the record of its control document; and each fetched package as a
  `File` with a `RemoteFile` whose upstream path is the reference's file route.

### Publishing, and what counts as a write

A publish is a client-native wire write, like `npm publish`: ovsx sends the package and the
registry commits it or refuses it inside the request. What ingest does, in order, before anything is
committed:

1. **Authorize before reading.** The body is not read until the central authorizer has accepted the
   request's `Scope(r)`, whose object comes from the URL alone (Design, "Namespaces as pattern
   scopes"), so no unauthorized upload is spooled (the `puppet.md` and `pypi.md` precedent).
2. **Stream to the CAS with a bound.** The chunked body is streamed into an unreferenced blob,
   refused `413` with a JSON `error` the moment it passes the repository's maximum package size, the
   same number `api/version` reports as `maxExtensionSize` (ovsx 1.2.0 checks it before sending,
   `publish.js`); the default is the reference's 262,144,000 bytes.
3. **Read the package without executing it** (Design, "Reading a VSIX"): its identity from
   `extension.vsixmanifest` (`Publisher`, `Id`, `Version`, optional `TargetPlatform`) and its
   manifest from `extension/package.json`.
4. **Validate**: the identity equals the manifest's `publisher`, `name` and `version`; namespace and
   extension names match `[A-Za-z0-9_+$~-]+` (the reference's `ExtensionValidator` pattern); the
   version is semantic versioning (the reference's `SemanticVersion` grammar); the target is one of
   the twelve names in "Target platforms"; `engines.vscode` is present; the namespace matches the
   namespace-bound base where one was used; and every extracted asset stays within its bound.
5. **Produce the derived files inside the write**: the `.sha256` (the package's hex digest, as the
   reference serves it) and the `.sigzip` (Design, "Signing, provenance and policy").

The declaration `data-model.md` requires, per the resolved write-boundary decision below:

- **A publish is one completed logical write**: the `Package` row and its UUID if new, the `Version`
  row if new or one more target in its document, the package, the `.sigzip`, the `.sha256` and the
  extracted assets, in one snapshot. A refused publish writes nothing and leaves the spooled blob
  unreferenced for the sweep. A malformed package, an identity mismatch, a grammar violation, a
  non-semver version, an unknown target, a missing `engines.vscode`, or an asset over its bound
  answers `400` with `{"error": "..."}`, which ovsx prints (captured shape); a namespace-bound base
  receiving another namespace's package answers `400`; a size overrun answers `413`; a policy refusal
  at publish answers `403`.
- **A `(version, target)` that exists answers `400` with `{"error": "Extension acme.native 1.0.0
  (linux-x64) is already published."}`**, the reference's status and wording (`NamingUtil.toLogFormat`,
  PublishExtensionVersionHandler), so ovsx's `--skip-duplicate` recognises it. **A retired one
  answers `400` with "... is already published and was removed. Extension versions are immutable, so
  this version's identity stays permanently reserved and cannot be republished."**, the reference's
  wording, which `--skip-duplicate` deliberately does not swallow. Another target of an existing
  version publishes normally.
- **A spelling that differs case-insensitively from a stored namespace or extension name answers
  `409`** (the resolved name decision below).
- **An unpublish is one write** however many `(version, target)` pairs it removes; each removed pair
  joins the retirement set, carried forward by every later write (`data-model.md` AC33's
  obligation), and removing an extension's last package leaves its `Package` row.
- **`verify-pat` and `namespace/create` write nothing** (the resolved namespace decision below).
- **All are synchronous**: no `Operation` is recorded.
- **A proxied repository creates no snapshots**: arrival and revalidation are cache materialisation.

Two concurrent publishes of different targets of one version each read-modify-write the version
document through `data-model.md`'s revision-token retry and both land; two concurrent publishes of
one `(version, target)` produce one success and one duplicate refusal. Removal rules apply the
precedent rather than re-deciding it: no blob-store object is deleted directly (`storage-and-gc.md`
AC15), and removing something absent answers `404` with `{"error": "Extension not found: ..."}`.

**Dependencies are not resolved at publish.** The reference refuses a publish whose
`extensionDependencies` name an extension it does not hold ("Cannot resolve dependency: ...",
PublishExtensionVersionHandler). This registry accepts it, because a dependency commonly resolves
through the virtual repository an editor is pointed at, from a member the hosted repository cannot
see (the resolved dependency decision below); the divergence is on the recorded exception list.

### Unpublish, namespaces and the management API

`ovsx unpublish` is a client-driven route and is served as a **binding onto the registry-owned
removal operation** of `docs/internal/plans/foundation/management-api.md` (to be authored in the
spec loop), per the cross-format precedent (`cargo.md`'s resolved yank-binding decision, was Q6):
authorized by `delete` in the settled `(repository, action)` vocabulary, hosted only (a proxied or
virtual repository answers `405`), its trigger verified by this registry's integration tests and by
ovsx 1.2.0, its effect by the editors. `api/version` answers `{"version": "v1.3.0",
"maxExtensionSize": ...}`, the lowest reference version whose client contract this spec serves (the
header token forms included), so ovsx 1.2.0's unpublish check passes and the unreleased ovsx that
sends `Authorization: Bearer` to 1.3.0 and later is served too (the resolved credential-form decision
below). What this format **requires** of that API, stated rather than designed:

| Operation | What it carries | Effect a client sees | Action |
|---|---|---|---|
| Remove packages (`ovsx unpublish -v ... [-t ...]`) | Namespace, extension, and a list of versions, each optionally with a target | Removed packages leave every metadata document and query answer; their file and asset routes answer `404`; `--update-extensions` never moves an installed copy back, and `--install-extension --force` installs the newest remaining version (captured) | `delete` |
| Remove an extension (`ovsx unpublish` with no `-v`) | Namespace and extension | Every package leaves; the query answers nothing for the name; the `Package` row, its UUID and its retirement set stay | `delete` |
| Declare a namespace verified, or withdraw it | Namespace | `verified` in `api/{namespace}` and in extension metadata turns true or false; ovsx prints "(verified)" and "verified publisher" (captured) | admin role |

### The gallery query: what the `POST` body means

The query's contract is the intersection of what VS Code sends (`extensionGalleryService.ts`,
queryRawGalleryExtensions; the criteria and flag values in `extensionGalleryManifestService.ts`)
and what the reference answers (`LocalVSCodeService.extensionQuery`). Per the resolved query decision
below, the handler implements it as follows, and nothing else in the body changes an answer:

- **Only the first filter is read**, as the reference does; VS Code sends exactly one.
- **Criteria by type**: 4 is an extension UUID, 7 an extension name `{namespace}.{extension}`
  compared case-insensitively, 10 search text, 1 a tag (used as search text when no type 10 is
  present, as the reference does), 5 a category, 9 featured (answered with no results: this
  registry features nothing), 12 exclude-with-flags (always satisfied, since removed packages are
  never listed), and **8 is overloaded**: VS Code sends the installation target
  `Microsoft.VisualStudio.Code` in every query (captured), which matches everything, while a valid
  target-platform name restricts the versions returned to that platform (the reference's
  `TargetPlatform.isValid` test). Any other type is ignored.
- **Precedence**: UUID criteria, when present, decide the result set; otherwise name criteria;
  otherwise search, category and tag. Several criteria of one type are a union (captured: a pack's
  two dependencies in one query with `pageSize` 2).
- **Flags**, a bitfield: `0x1` all versions, `0x2` files, `0x4` categories and tags, `0x10` version
  properties, `0x20` exclude non-validated (always satisfied), `0x80` asset URIs, `0x100`
  statistics, `0x200` latest version only, which means **the newest version per target platform**
  (the reference groups by target), and `0x1000` unpublished (never listed). With neither `0x1`,
  `0x10` nor `0x200`, `versions` is empty. The captured values are 950 (`0x3B6`, latest only) and 439
  (`0x1B7`, all versions).
- **Paging**: `pageNumber` is one-based and `pageSize` bounds each page; `sortBy` 0 relevance, 4
  install count (all zero here, so relevance), 5 published date, 6 rating (none, so relevance);
  `sortOrder` 1 ascending, anything else descending. Search results are ordered deterministically
  by relevance then name.
- **The answer**: `{"results":[{"extensions":[...],"resultMetadata":[{"metadataType":"ResultCount","metadataItems":[{"name":"TotalCount","count":N}]}]}]}`,
  each extension carrying `extensionId`, `extensionName`, `displayName`, `shortDescription`, a
  `publisher` of `displayName`, `publisherId`, `publisherName` and `domain` and `isDomainVerified`
  both `null` (as the reference answers, live), `versions`, `statistics`, `tags`, `releaseDate`,
  `publishedDate`, `lastUpdated`, `categories` and `flags`; each version carrying `version`,
  `lastUpdated`, `targetPlatform`, and as the flags ask `assetUri` and `fallbackAssetUri` (both this
  registry's), `files` (`assetType` and `source`, sources on this registry's file route) and
  `properties` (engine, dependencies, pack, localized languages, pre-release, web extension, source
  link, sponsor link, branding), versions ordered newest first. Content type
  `application/json;api-version=3.0-preview.1`, as the reference answers.
- **Errors**: a malformed body answers `400`, which every editor reads as "not found"; a body over
  64 KiB answers `413` without being parsed.

**The UUID is identity.** VS Code resolves by name, then asks again by the UUID the first answer
gave, and stores it with the installed extension (captured: the second query's type 4 criterion was
the first answer's `extensionId`). A UUID therefore never changes for a name in a repository, a
proxied extension keeps the upstream's UUID, and a UUID criterion that resolves to no extension
answers nothing, after which the client repeats the query by name
(`galleryService:additionalQueryByName` in `getExtensions`).

**The latest-version routes** `vscode/gallery/{namespace}/{extension}/latest` and
`vscode/gallery/vscode/{namespace}/{extension}/latest` answer one gallery extension object with the
newest version per target, all properties, files and asset URIs, as the reference does (both answer
`200` live). No captured client requested either; VSCodium's `product.json` names the first
(`latestUrlTemplate`) and VS Code 1.135's gallery manifest the second, so an editor build that uses
them is served.

### Target platforms

The twelve names are the reference's (`TargetPlatform`): `win32-x64`, `win32-ia32`, `win32-arm64`,
`linux-x64`, `linux-arm64`, `linux-armhf`, `alpine-x64`, `alpine-arm64`, `darwin-x64`,
`darwin-arm64`, `web` and `universal`. What they mean on this wire, per the resolved target-platform
decision below:

- **The package coordinate is `(namespace, extension, version, target)`.** A target comes only from
  the manifest's `TargetPlatform` attribute (absent means `universal`); ovsx's `--target` is ignored
  for a prebuilt package ("Ignoring option '--target' for prepackaged extension.", `main.ts`).
- **Routes**: `api/{namespace}/{extension}/{target}/{version}` addresses one package and
  `api/{namespace}/{extension}/{version}` the universal one, falling back to the newest-published
  target when there is no universal package (the reference's answer for a version with no universal
  package was not captured, so this fallback is this registry's rule and sits on the exception list
  until the recording session settles it); `/vscode/asset/...` takes the target from
  `targetPlatform`, `universal` when absent.
- **The metadata document** of `api/{namespace}/{extension}` lists every target of the chosen
  version under `downloads`, as the reference does (live).
- **Selection is the client's**: the registry answers every target of every version and never picks
  for the editor; the captured behaviours above are asserted, not reimplemented (AC4).
- **Retirement is per pair**: removing `alpine-x64` of 1.0.0 retires that pair only, and a
  `linux-x64` of 1.0.0 still publishes if it was never published.

### Names: case preserved, unique and looked up case-insensitively

Open VSX stores names with their published case (`HookyQR`, `CoenraadS`, live), resolves them
case-insensitively (`/api/hookyqr/BEAUTIFY` answered `HookyQR.beautify`, live), and editors lowercase
every identifier before asking (captured) and install into lowercased directories
(`hookyqr.beautify-1.4.11-universal`, captured through the pass-through). Per the resolved name
decision below, a name is served exactly as first published, every route resolves it
case-insensitively, and a publish spelling an existing namespace or extension differently answers
`409` naming the stored spelling. The canonical addressed object is the lowercased
`{namespace}/{extension}` (Design, "Namespaces as pattern scopes"), so no spelling reaches around a
pattern.

### Authentication: the token in the query string, and reads that cannot authenticate

The client table in `auth.md` has no Open VSX row, and the form released ovsx sends is none of the
verifier's four presentation forms. This section reconciles both surfaces, per the resolved
credential-form and private-read decisions below, and every check runs in the shared authentication
layer.

**Writes: a registry token as the `token` query parameter, `Authorization: Bearer`, or
`X-OpenVSX-Token`.** The central verifier accepts the `token` query parameter and the
`X-OpenVSX-Token` header, beside the existing Bearer form, **on this format's four write routes
only**, resolving to the same principal and scopes. What follows from a credential in a query
string, named rather than discovered:

- **Redaction covers the query string**: the parameter is credential material for `auth.md` AC7's
  scan and for the harness's redaction (`conformance-harness.md` AC13), in access logs, traces,
  metric labels and error bodies. ovsx 1.2.0 prints URLs without their query (`redactUrl`); the
  compiled 0.10.12 contains no such function.
- **Plaintext is refused before lookup**: a token in the query string over a connection the server
  did not terminate with TLS is refused identically for a valid and an invalid token, as `auth.md`
  AC27 requires of the other forms.
- **A rejected token** answers `401` with `{"error": "Invalid access token."}`, which both versions
  print (captured); never `403`, and never served as anonymous (`auth.md` AC12).
- **A query-string token on any other route is not a credential**: the route is served as
  credential-less, so a token pasted into a read URL grants nothing and is never logged.

**Reads: a read-only registry token as a path segment, `{base}/-/t/{token}/...`.** No editor and no
released ovsx read sends a credential (captured), so a private repository is otherwise unreadable by
every client of this ecosystem. The verifier accepts a registry token as the segment after `-/t/` on
this format's read routes, **only when the token carries no action but `pull`**; a token holding
`push` or `delete` presented there is refused `401`, so the credential that ends up in an editor's
configuration can never publish. What follows:

- **Every URL the registry renders in a response to such a request carries the same prefix**
  (`assetUri`, `fallbackAssetUri`, `files`, `allVersions`), because the editor takes every later URL
  from the response; such responses carry `Cache-Control: private, no-store`.
- **The token is in the editor's configuration and in its error output** (VS Code logs the failing
  URL, `getLatestRawGalleryExtensionWithFallback`), which the operator documentation states beside
  the recipe: a `pull`-only token scoped to the one repository, rotated like a password.
- **Redaction and plaintext refusal apply to the path segment** exactly as to the query parameter.

**The challenge and the existence rule**, applying `auth.md` as written:

- A credential-less request to a repository that is not anonymously readable answers `401` with
  `WWW-Authenticate: Bearer realm="..."` and `{"error": "..."}`, byte-identical for a private and a
  missing repository (`auth.md` AC17). Editors read it as "not found" (captured); the operator
  documentation names the path-token recipe as the answer.
- A valid token lacking `pull` answers `404`; a valid token lacking `push` on a write answers `403`
  with `{"error": "Insufficient access rights for namespace: acme"}`, the reference's wording, which
  ovsx prints (captured).
- `api/version` follows the same rule; ovsx 1.2.0 tolerates its failure (`getMaxExtensionSize` and
  `ensureUnpublishSupported` both catch it and proceed).

### Namespaces as pattern scopes

In the reference, a namespace is an owned object: its members (owner or contributor) may publish into
it, only an owner changes membership, and `create-namespace` makes one
(`NamespaceMembershipJooqRepository.canPublish`, `UserService.setNamespaceMember`). Per the resolved
namespace decision below, **this registry has no namespace objects**: namespace ownership is a pattern
scope `{namespace}/**` over the lowercased `{namespace}/{extension}` object, granted like any other
(`auth.md`, "Pattern scopes" and "Human grants"), exactly as `ansible-collections.md` settled for
Galaxy namespaces. What each Open VSX operation becomes:

- **Publish needs an object the URL names.** The body is a zip whose central directory is at its
  end, so the extension cannot be known before the whole body is read. The ordinary publish route
  `{base}/api/-/publish` therefore reports **none**, which only an unpatterned `push` authorizes. A
  **namespace-bound write base** `{base}/-/ns/{namespace}` serves the four write routes and
  `api/version` under it (captured: ovsx keeps a path in `-r`), and there publish reports the named
  object `{namespace}`, which a pattern `acme/**` authorizes (`**` matches zero segments), and ingest
  refuses `400` a package whose namespace differs, so a mislabelled package cannot evade the
  pattern.
- **`verify-pat {namespace}`** answers `200` with `{"success": "..."}` when the credential's `push`
  authorizes the object `{namespace}`. Otherwise the central authorizer's existence rule decides: a
  caller that cannot read the namespace, a pattern refusal included, gets `404`; one that can read
  it but lacks `push` gets `403` with the reference's "Insufficient access rights for namespace"
  wording and status (`LocalRegistryService.verifyToken`), the message ovsx printed (captured). It
  writes nothing.
- **`create-namespace {name}`** writes nothing: there is no namespace to create. It answers `201`
  with `{"success": "Created namespace {name}"}` when the credential's `push` authorizes the object
  `{name}` (the name taken from the namespace-bound base, or from the tiny JSON body on the ordinary
  base, where the route's object is none and only an unpatterned `push` passes), so a CI script that
  runs it before publishing keeps working; and `403` otherwise.
- **Namespace members, owners and claims** have no route: they are grants, administered through
  `auth.md`'s human grants, and the operator documentation maps a contributor onto a
  `{namespace}/**` grant of `push` and an owner onto one of `push` and `delete`.

### What `verified` means

ovsx prints "acme (verified)" and "verified publisher" from the metadata's `verified` field
(captured); editors receive `isDomainVerified: null` and show nothing (live, and `toQueryExtension`
in the reference). In the reference it is true when the publishing user is a member of a namespace
that has an owner. Here every publish is by an authorized principal, so that rule would make every
extension verified and the word meaningless. Per the resolved verified decision below, **`verified`
is true exactly when an administrator has declared the namespace verified** in the repository (a
registry-owned operation, Design, "Unpublish, namespaces and the management API"), false by default;
a remote repository serves the upstream's value for its extensions, and a virtual repository the
supplying member's.

### Signing, provenance and policy

**What the ecosystem signs.** The reference signs every package with a registry-wide Ed25519 key
pair: `.signature.sig` is a raw 64-byte Ed25519 signature over the whole `.vsix`,
`.signature.manifest` a JSON of the package's and each entry's SHA-256, `.signature.p7s` an empty
entry kept "because VS Code checks if it exists" (`ExtensionVersionIntegrityService`, verified live
with `openssl`). The public key is served as PEM at `api/-/public-key/{publicId}`, named by each
version's `files.publicKey`; a key pair is renewable, and old versions keep their old key. The
signature binds a package to the registry that signed it, not to its author: it is a registry
attestation, verified by `ovsx verify` and by the reference's own mirror
(`MirrorExtensionService`, which fetches the upstream's public key and refuses a package that fails).

**Hosted packages are signed by this registry**, per the resolved hosted-signing decision below:
inside each publish, the handler asks the shared signing service for an Ed25519 signature over the
package blob with the repository's current key, and assembles the `.sigzip` in the reference's layout
(entries in the order `.signature.sig`, `.signature.manifest`, `.signature.p7s`, deterministic zip
metadata). Public keys are served at `api/-/public-key/{id}` where `{id}` is the lowercase hex
SHA-256 of the key's DER `SubjectPublicKeyInfo`, so the route is content-addressed; retired keys stay
served for as long as a package they signed is. The gallery advertises the signature and public-key
assets as the reference does: VSCodium and code-server never fetch them (captured), and Microsoft VS
Code refuses Open VSX signatures and unsigned packages alike (captured), so withholding them from
the gallery would change nothing for any client, while the `/api` surface's `files.signature` and
`files.publicKey` are what `ovsx verify` needs.

**What the signing service must provide**, stated so the dependency on
`docs/internal/plans/foundation/signing-service.md` (to be authored in the spec loop) cannot be
lost, and precisely enough that the service can be specced against it:

1. **Pure Ed25519 (RFC 8032) detached signatures over a stored blob**, not Ed25519ph, which no
   verifier of this ecosystem accepts (the reference's source comment on `createSignatureFile`).
2. **Bounded memory for a large package.** Pure Ed25519 hashes the message twice, and the
   reference needed a 2 GB heap to sign a 300 MB package until it read the package once into one
   array (its issue #1450, cited in the same comment); the service signs a package up to the
   maximum package size without holding more than one copy of it, or by two streaming passes over
   the CAS blob, and the benchmark suite holds the budget (AC28).
3. **Signing inside the triggering write**, so the `.sigzip` lands in the same snapshot as the
   package, under `data-model.md`'s revision-token retry.
4. **A key per repository, rotatable, with every public key retrievable by its digest** for as long
   as a retained snapshot references a signature it made.
5. **Nothing repository-wide**: this format has no generated index, so the service's index half is
   not used.

**Proxied packages keep the upstream's signature**, per the resolved proxied-signature decision
below: the adapter pins the upstream's public keys in the remote repository (fetched at
configuration from the upstream's `publicKey` URLs and on first sight of a new key identifier, each
new key recorded with a divergence), `docs/internal/plans/foundation/artifact-verification.md` (to be
authored in the spec loop) verifies each fetched package's `.signature.sig` against the pinned key
its metadata names, and its verdict (verified with that key's identity, failed, or absent) is what
`supply-chain-policy.md` AC15's rule consumes. The registry serves the upstream's `.sigzip` bytes
and the upstream key under its digest, so `ovsx verify` through the cache proves the package is the
one the upstream signed. A virtual repository serves each package with its supplying member's
signature. What this format requires of that service: the Ed25519 raw envelope above, key pinning
per remote, and a verdict computed from the CAS blob after the verified commit, never from bytes in
flight.

**Advisory coverage exists.** OSV carries a `VSCode` ecosystem (Context), so coordinate-level rules
are accepted at configuration (`supply-chain-policy.md` AC11 refuses only uncovered ecosystems). What
matching requires, per the resolved OSV-mapping decision below, listed as consequences for
`supply-chain-policy.md`: every Open VSX repository matches advisories of **every** `VSCode`
variant (the Marketplace's `VSCode` and any `VSCode:{url}`), because a namespace on one registry may
be the same publisher or a squatter of it on another and the safe error is over-refusal; names are
matched **case-insensitively** on both sides, because the registry resolves them so and OSV's own
query does not; an advisory's `versions` list and `ECOSYSTEM` ranges are ordered by semantic
versioning; and the purl is `pkg:vscode-extension/{namespace}/{extension}@{version}` with the
`platform` qualifier. Every advisory today is a `MAL-` entry, so the feed channel of the shared
security-signal rule condemns Open VSX coordinates now. The byte-level cataloguer sees a zip holding
a Node package tree; licence and component rules depend on its coverage of that layout, which
`supply-chain-policy.md` measures in its own Phase 1 and refuses at configuration where it has none.

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines, the
handler renders it per the resolved refusal-rendering decision below:

- **On every route of the refused package** (the `.vsix`, every extracted asset, the `.sigzip`, the
  `.sha256`, on both surfaces): `403` with the reason phrase `Refused by policy {policy} rule {rule}`
  (or naming the security signal) and `{"error": "..."}` with the same text, served over HTTP/1.1.
  ovsx prints the reason phrase on a download and the body on metadata (captured shapes); an editor
  fails at its first manifest request with "Server returned 403", before any package byte, with no
  request to any other host because every URL it holds names this registry.
- **An extension condemned as a whole** (every version refused: a malware advisory or upstream
  signal with no fixed version, or a rule naming the extension) is listed in the repository's
  control document `vscode/control.json` as `{"malicious": ["{namespace}.{extension}", ...],
  "deprecated": {}, "search": []}`, in its stored spelling; an editor configured with it refuses the
  install, and the install of anything depending on it, with "Can't install ... since it was reported
  to be problematic." before any package request (captured). A version-level condemnation is never
  listed there, because the list has no version granularity and would block the extension's clean
  versions.
- **Refused versions stay listed** in every metadata document and query answer, the no-elision
  precedent of `conda.md`, `debian.md`, `conan.md`, `chef.md`, `luarocks.md` and `opam.md`: an editor
  that selects one reaches the refusal rather than silently installing an older version.
- **A refusal at publish** (a byte-dependent rule) answers `403` with `{"error": "..."}`, which ovsx
  prints (captured shape).

The operator documentation sets the editors' `controlUrl` to the repository's control document; an
editor left on VSCodium's default reads the GitHub document instead and learns nothing of this
registry's condemnations, and one whose control fetch fails treats the list as empty
(`updateControlCache`).

### Serving documents that cannot leave the registry

Per the resolved regeneration decision below, every document the registry serves is **rendered from
its own records**, on all three paths, and every URL-valued field in it names this registry under the
externally visible base URL that `npm.md` and `composer.md` already require the handler to know:
`assetUri`, `fallbackAssetUri` and every `files[].source` in query answers; `files`, `downloads`,
`allVersions`, `allVersionsUrl`, `namespaceUrl`, `reviewsUrl` and `url` fields in `/api` documents;
and the dependency and bundled-extension references. File routes are served, never redirected,
because a handler never opens storage directly and a redirect to another host would take the editor
off the registry. A string field an upstream controls but no client dereferences (`homepage`,
`repository`, `bugs`, `sponsorLink`) is passed through as text.

### Freshness headers and rollback

Because the query is a `POST` and neither client sends a conditional header (captured), a pointer
change, a rollback included, is in the next answer whatever the headers say. What the headers must
still get right is any HTTP cache between, and another registry proxying this one. So `/api`
metadata documents carry a strong `ETag` over their bytes, `Cache-Control: no-cache`, and no
`Last-Modified`, so no comparison of times can go backwards across a rollback, and `If-None-Match`
matching the current `ETag` answers `304`; query answers carry `Cache-Control: no-cache`, unlike the
reference's `public, max-age=600`; file and asset routes carry the file's digest as `ETag` and
`Cache-Control: public, max-age=604800, immutable` on anonymously readable repositories and
`private` otherwise, since a URL's bytes never change. Nothing is required of `data-model.md`'s
pointer. What a rollback does to editors is theirs: an installed newer version stays until a forced
install (captured), which the operator documentation says beside the promotion recipe.

### Reading a VSIX

Per the resolved never-execute decision below, the registry reads a package as a zip archive in
process and **executes nothing**: no extension script, no `vscode:prepublish`, no `vsce`, no `node`,
no subprocess over repository content. Reading is bounded: the central directory is read from the
stored blob, at most a fixed number of entries, every entry name a relative path with no `..`
segment, no absolute path, no backslash and no NUL; `extension.vsixmanifest` and
`extension/package.json` at most 1 MiB each after decompression, and every extracted asset at most a
fixed size, with the decompression ratio bounded so a zip bomb is refused rather than expanded; the
manifest is parsed as XML with external entities and DTDs disabled. A package failing any bound is
refused `400` on hosted publish and never committed on a proxied fetch. An architecture test holds
the handler package to an import allowlist without `os/exec`, process creation or cgo (AC8), on top
of the interface's depguard allowlist (`format-handler-interface.md` AC9). An extension's code runs
in the installing editor's extension host; the registry passes it through as it passes any archive,
and the operator documentation says so.

### Addressed objects and pattern scopes

`auth.md`'s pattern scopes narrow a credential within one repository by matching the object each
request addresses, and the format declares which object each route reports
(`format-handler-interface.md` AC12). Per the resolved namespace and addressed-object decisions
below, the canonical object is the lowercased `{namespace}/{extension}`:

| Route | Action | Object kind | Canonical object |
|---|---|---|---|
| `api/{namespace}/{extension}[/{target}][/{version}]`, `versions`, `version-references`, `.../file/{name}` | `pull` | named | `{namespace}/{extension}` |
| `vscode/asset/{namespace}/{extension}/...`, the two latest-version routes | `pull` | named | `{namespace}/{extension}` |
| `api/{namespace}` (lists that namespace's extensions) | `pull` | named | `{namespace}` |
| `api/-/public-key/{id}` | `pull` | content-addressed | the key identified by its digest |
| `vscode/gallery/extensionquery`, `api/-/search`, `vscode/control.json`, `api/version` | `pull` | none | - (answers over every name) |
| `api/-/publish`, `api/-/namespace/create` on the ordinary base | `push` | none | - (the name is only in the body) |
| `-/ns/{namespace}/api/-/publish`, `.../api/-/namespace/create`, `api/{namespace}/verify-pat` (either base) | `push` | named | `{namespace}` |
| `api/{namespace}/{extension}/delete` (either base) | `delete` | named | `{namespace}/{extension}` |

A path not of one of these shapes makes `Scope(r)` return an error, which denies it as an
unauthorized request (`format-handler-interface.md` AC10). What that gives and costs, applying
`auth.md` rather than re-deciding it:

- **A patterned `pull` cannot drive an editor**, because resolution starts at the query, whose object
  is none: the editor reports "not found" (the consequence `cargo.md`, `conan.md`, `chef.md`,
  `luarocks.md` and `opam.md` accepted). A patterned `pull` reads in-pattern extensions with `ovsx
  get`, whose metadata and file routes are named.
- **A namespace listing is named by its namespace**, because every name it reveals lies under that
  namespace, so `acme/**` authorizes it and `acme/hello` does not.
- **A pattern refusal is answered as absence**: `404` with `{"error": "Extension not found: ..."}`,
  indistinguishable from an extension that does not exist.
- **A patterned `push` publishes through the namespace-bound base only**, refused there `400` for a
  package of another namespace and refused `404` with no snapshot for a namespace outside its
  pattern.

### The proxied path

The handler owns the request and classifies for the proxy layer's fetch-and-cache API per the settled
decisions in `proxy-cache.md`. The upstream is an Open VSX server base URL (`https://open-vsx.org`, a
self-hosted reference, or another registry), validated at configuration by fetching `api/version` and
one extension's metadata. An upstream credential, where one is needed, is presented by the adapter;
the client's credential is never forwarded.

| Route | Classification |
|---|---|
| Query answers, `/api` metadata, latest-version routes, namespace listings, search | Mutable metadata with a TTL, **never relayed**: rendered from the remote's per-extension records (below) |
| Per-extension record | Mutable metadata with a TTL: the upstream's gallery query for the one name with flags `0x1\|0x2\|0x4\|0x10\|0x80\|0x100`, parsed into the record; refreshed when its TTL has lapsed and a request needs it |
| `.vsix`, `.sigzip`, `.sha256`, public keys | Immutable by `(version, target, name)`: fetched once through the adapter, verified before commit, cached indefinitely |
| Extracted assets (manifest, readme, icon and the rest) | Served from the verified cached `.vsix`, never fetched from the upstream's asset routes: a manifest request fetches the package first, which the editor requests next anyway (captured order) |
| Upstream control document | Mutable metadata with a TTL; its `malicious` list is an explicit upstream security signal (below); nothing of it is served |
| Write routes | `405` |

**Search on a remote** is forwarded to the upstream's `api/-/search` or query with name criteria
removed, and its results are rendered from records refreshed for each extension returned, so a
search answer never carries an upstream URL either.

**Fetching a package.** On a miss for a `(version, target)` the record lists, the handler first
obtains the upstream's declared digest: the version's `/api` document names a `sha256` file (100 of
100 sampled live versions have one), whose 64 hex digits the adapter fetches through the same
fetch-and-cache entry. The package is then fetched from the upstream's file route; the upstream's
`302` to its storage host (`openvsx.eclipsecontent.org` for open-vsx.org, captured) is followed only
to hosts on the remote's **storage-host allowlist**, which defaults to that one host for an
open-vsx.org upstream and is empty otherwise; a redirect elsewhere answers `502`. The body is
streamed through SHA-256 and committed only if it matches the declared digest, the initiating
client's connection aborted before its final bytes otherwise and coalesced waiters served only from
the CAS after the verified commit, per the settled waiter rule. Where an upstream declares no digest,
the first verified fetch pins the CAS digest on the `File`, and a refetch after eviction with another
digest is an integrity failure. The signature verdict is computed after the commit (Design, "Signing,
provenance and policy").

- **Missing extensions and packages are negatively cached** with the short TTL; a `429` or `5xx` is
  never cached as absence (`proxy-cache.md` AC9).
- **Upstream UUIDs are kept**, so an editor that installed an extension from open-vsx.org keeps
  updating it through the cache.

**The upstream control document.** Per the resolved control-document decision below, the adapter
fetches the remote's configured control-document URL (for an open-vsx.org upstream the
`EclipseFdn/publish-extensions` file VSCodium names, on a second allowlisted host) as mutable
metadata, revalidated when the repository's own control document is requested, which every editor
install does (captured). Each identifier in its `malicious` list is an **explicit upstream security
signal** for that extension (or, for a bare publisher, every extension of that namespace) under the
shared security-signal rule; its `deprecated`, `migrateToPreRelease`, `extensionsEnabledWithPreRelease`
and `search` entries are ignored, so no upstream text can make an editor install a different
extension than it asked for.

Upstream removal maps onto the settled purge-or-flag table as Open VSX's side of that contract:

| Upstream event, as observed at revalidation | Classification |
|---|---|
| A new version or target, or changed descriptive fields (display name, `verified`, `deprecated`) | An **ordinary metadata change**, propagated at the next revalidation |
| A `(version, target)` or a whole extension vanishes (an `ovsx unpublish`, an administrator's removal, a namespace rename) | Drop it from the served record; keep serving cached files by URL; record an operator-visible divergence. The wire carries no reason |
| An identifier appears in the upstream control document's `malicious` list | An **explicit upstream security signal**: the shared security-signal rule condemns the extension, and it enters this repository's control document |
| A package's declared `sha256` changes, or a fetched package fails it, or its signature fails against the pinned key | An **integrity failure**: never committed, a cached copy keeps serving, and the operator is alerted |
| A package's metadata names a public key not yet pinned | The key is fetched, pinned and recorded as a divergence; an already-verified package whose key identifier changes is an integrity failure |

Detection happens at revalidation, passively, per `proxy-cache.md`'s resolved passive-detection
decision (was Q12). The control document is this ecosystem's upstream signal channel and OSV's `MAL-`
entries its feed channel, so both halves of the shared rule have a source here, stated rather than
assumed.

### Virtual repositories

A virtual repository of format `openvsx` is possible: nothing is signed repository-wide, every
document is rendered, and the reference itself merges a local registry with an upstream by extension
(`DefaultExtensionQueryRequestHandler`: local first, an upstream extension added only when its id is
not already present). Per the resolved virtual-repository decision below, resolution is **per
extension, in member order**:

- **Each `{namespace}.{extension}` (case-insensitively) is supplied entirely by the first member
  holding it**, every version and target, whatever later members hold. A hosted `acme.hello` placed
  before an open-vsx.org remote shadows the upstream's `acme.hello`, so the dependency-confusion
  shape (a public extension outranking a private name) cannot occur for an editor pointed at the
  virtual repository.
- **A UUID criterion resolves only in the member that supplies the name the UUID belongs to**;
  otherwise it answers nothing and the editor repeats by name (Design, "The gallery query").
- **Search merges members in order**, dropping an extension an earlier member already supplied, as
  the reference's merge does, with `TotalCount` adjusted.
- **Every URL names the virtual repository**, and file and asset routes resolve in the member that
  supplied the extension; `verified` and signatures are the supplying member's.
- **The control document** lists the condemned extensions each name's supplying member condemns.
- A virtual repository creates no snapshots, and every write route answers `405`.

The accepted cost: a private extension shadows every upstream version of its name, so a team that
wants both must rename; the operator documentation says so beside the recipe.

### Content negotiation and the other traps

- **Nothing is negotiated.** `/api` documents are `application/json`, query answers
  `application/json;api-version=3.0-preview.1`, packages and signature archives
  `application/octet-stream`, public keys `text/plain`, whatever `Accept` says. A query answer is
  gzip-encoded when the request's `Accept-Encoding` allows it (every editor sends `gzip`, captured);
  files never are.
- **`HEAD`** answers every `GET` route with the same headers, although no pinned client sends one.
- **Publish bodies arrive chunked** (captured), so the size bound is enforced while streaming.
- **The asset query parameters `redirect`, `install` and `update` are ignored**: routes are served,
  not redirected, and downloads are not counted.
- **The editor's exit code is honest, ovsx's `get` is not a verifier.** `--install-extension` exited
  1 on every failure whose exit code was captured; `ovsx get` exits 0 on any bytes it receives.
  Conformance cases assert bytes and requests, not exit codes alone.
- **ovsx without `-r` targets open-vsx.org**, and VSCodium without overrides queries open-vsx.org and
  reads GitHub's control document; the operator documentation's recipes set every variable.

### Conformance, the clients and the corpus

The clients are those named in Context, each pinned by digest or tarball checksum
(`conformance-harness.md` AC4): ovsx 0.10.12 and 1.2.0 in one Node image, VSCodium 1.99.32846 and
1.135.06055 in one Debian image, and code-server 4.139.1; Microsoft VS Code 1.139.1 with
`extensions.verifySignature: false` joins the proxied and hosted install cases as a documented
additional client. Each editor case uses a fresh extensions directory and user data directory, sets
the gallery and control URLs explicitly, and asserts at the network layer. The catalogue counts one
ecosystem and no multiplier row.

Five assertion traps are recorded where the cases are written. **An editor's download failure writes
the error body as the package**, so a refusal case asserts the requests and the message, never only
the exit code. **ovsx `get` succeeds on any bytes**, so a download case hashes what it saved.
**Defaults reach open-vsx.org and GitHub**, so every case sets every URL and asserts no request left
the test network. **VSCodium's platform is the container's**, so target cases run on `linux-x64` and
name what they expect. **The editor retries a failed download three rounds**, so request-count
assertions allow six requests per refused package.

The recorded surface for the replay corpus, named now because a thin recording script yields a thin
specification: against open-vsx.org, the gallery queries with flags 950 and 439 by name and by UUID,
a platform-specific extension's query, `/api` metadata with and without target and version,
`version-references`, `search`, a namespace listing, a public key, a `.sha256`, and the latest-version
routes; against the reference server (the `eclipse/openvsx` server image, pinned by digest at
recording), a publish per target, a duplicate, an unknown namespace, a namespace creation, `verify-pat`
and an unpublish. Recording gates on the harness's redaction criterion (`conformance-harness.md`
AC13); the `token` query parameter, the `-/t/` path segment and `X-OpenVSX-Token` are what the
allowlist must name. Every deliberate divergence from the reference goes on the recorded exception
list before its flow is expected to replay: every URL on this registry and served rather than
redirected, `Cache-Control` on query answers and metadata, zero statistics and no reviews,
`verified` by declaration, public keys addressed by digest, `api/version` reporting `v1.3.0`,
publishes with unresolved dependencies accepted, differently spelled names refused `409`, the
namespace-bound base, `create-namespace` writing nothing, and the target fallback for a version with
no universal package.

`Capabilities()` declares proxy support and the reference implementation `available`
(`format-handler-interface.md` AC13), the implementation being the Eclipse Open VSX server.

## Acceptance Criteria

- [ ] AC1: On a hosted repository, VSCodium 1.99.32846 and 1.135.06055 and code-server 4.139.1, each
      with fresh directories and every gallery and control URL set to the registry,
      `--install-extension` a universal extension, an extension with an `extensionDependencies`
      entry (installing the dependency too) and an extension pack, the transcript showing only
      requests to this registry, every query and asset request answered `200` with no redirect,
      and every installed file byte-identical to the published package's.
- [ ] AC2: ovsx 0.10.12 and 1.2.0 publish packages with the token as the `token` query parameter
      (each publish one snapshot, printing "Published ..."), and `ovsx get` on both, with and
      without `-t`, saves bytes identical to the published package under the reference's file
      name; ovsx 1.2.0's `show` (through `version-references`), `list` and `search` print the
      published extensions.
- [ ] AC3: The query endpoint answers the recorded request bodies (flags 950 and 439, by name and by
      UUID, several names in one filter) and a property-generated set of bodies over criteria types
      1, 4, 5, 7, 8, 9, 10 and 12, every flag combination, `pageNumber`, `pageSize`, `sortBy` and
      `sortOrder`, exactly as the
      semantics in Design state: UUID over name over search precedence, case-insensitive names,
      type 8 `Microsoft.VisualStudio.Code` ignored and a platform name filtering versions, `0x200`
      giving the newest version per target, `versions` empty without `0x1`, `0x10` or `0x200`,
      `TotalCount` equal to the full result size, every extension carrying the answer fields
      Design lists (`displayName` and the rest), every extension's `extensionId` and
      `publisherId` stable across publishes of new versions, and a malformed or oversize body
      refused `400` or `413` without being processed.
- [ ] AC4: For an extension with `linux-x64`, `linux-arm64`, `win32-x64` and universal packages of
      one version, one whose universal version is newer than its `linux-x64` version, and one
      published only for `win32-x64`, both VSCodium versions and code-server install the
      `linux-x64` package, the newer universal package, and nothing with the "not available ...
      for the Linux 64 bit" message, respectively; each target is its own `(version, target)`
      coordinate on the `/api` routes and on asset routes selected by `targetPlatform`; and `ovsx
      get -t linux-arm64` saves that package.
- [ ] AC5: `--install-extension acme.hello --pre-release` installs the newest pre-release version,
      `acme.hello@{version}` installs that version, and after a newer version is published
      `--update-extensions` installs it, on both VSCodium versions.
- [ ] AC6: A publish is refused `400` with `{"error": "..."}`, no snapshot, and ovsx exiting 1 with the error printed when
      the body is not a zip, lacks `extension.vsixmanifest` or `extension/package.json`, its identity
      disagrees with its manifest, a name breaks the grammar, the version is not semantic
      versioning, the target is unknown, or `engines.vscode` is missing; refused `413` past the
      maximum package size reported by `api/version`; and a duplicate `(version, target)` answers
      the reference's "is already published." message so `--skip-duplicate` exits 0 on both
      clients, while a retired pair answers the reference's "was removed" message and
      `--skip-duplicate` exits 1.
- [ ] AC7: A publish of an existing `(version, target)` answers the duplicate refusal with the same
      and with different bytes; after it is unpublished the pair is refused after the removal's
      snapshot is pruned, after a whole-extension removal and after a pointer is moved back across
      the removal, while another target of the same version and a new version publish normally.
- [ ] AC8: No package is executed and no process is started by the registry: an architecture test
      asserts that `internal/format/openvsx` imports no `os/exec`, creates no process and uses no
      cgo; and packages holding a zip bomb, an entry named with `..`, an absolute path, a
      backslash or NUL, a manifest over 1 MiB, an XML external entity, or a `vscode:prepublish`
      script that would create a file are each refused `400` within the request timeout with no
      snapshot and no file created on the server, or stored inert.
- [ ] AC9: The `token` query parameter, `Authorization: Bearer` and `X-OpenVSX-Token` each
      authenticate the same principal on the four write routes; a `token` query parameter on a read
      route grants nothing; a rejected token answers `401` with "Invalid access token." printed by
      both clients and is never served as anonymous; a token in the query string over plain HTTP is
      refused identically for a valid and an invalid token; `api/version` answers `v1.3.0` with
      the repository's maximum package size as `maxExtensionSize`, which ovsx 1.2.0 checks before
      sending, so its `unpublish` proceeds; and after successful and
      failed publishes no access log, trace, metric or error body contains the token.
- [ ] AC10: On a private repository, a credential-less query, metadata, file or asset request
      answers `401` with a body byte-identical for a private and a non-existent repository; both
      VSCodium versions, code-server and `ovsx get` configured with `{base}/-/t/{token}` for a
      `pull`-only token install and download, every URL in every answer (`assetUri`,
      `fallbackAssetUri`, `files`, `allVersions`) carrying the prefix and
      every such answer carrying `Cache-Control: private, no-store`; the same path with a token that
      holds `push` answers `401`; and no log, trace, metric or error body contains the token.
- [ ] AC11: A token holding `push` patterned `acme/**` publishes `acme.tool` through
      `{base}/-/ns/acme`, is refused `400` there for a package of namespace `other`, is refused `404`
      with no snapshot through `{base}/-/ns/other` and through the ordinary base, and passes
      `verify-pat acme` while `verify-pat other` answers `404`; a token holding unpatterned `pull`
      and no `push` fails `verify-pat acme` with `403` and "Insufficient access rights";
      `create-namespace` answers `201` and writes no snapshot; a token holding `pull` patterned
      `acme/**` reads `acme.tool` through `ovsx get` and is refused `404` with
      `{"error": "Extension not found: ..."}` on `other.tool`, and the
      query refuses it; the same pattern cases hold in proxied mode.
- [ ] AC12: `verified` is false in `api/{namespace}` and extension metadata until an administrator
      declares the namespace verified, true after, false again after withdrawal, with ovsx 1.2.0
      printing "(verified)" only while it is true; a remote repository serves the upstream's value;
      and the declaration is refused for every non-admin principal.
- [ ] AC13: An extension published as `HookyQR.beautify` is served as `HookyQR.beautify` in every
      document and route and installs through `--install-extension hookyqr.beautify` and
      `HOOKYQR.BEAUTIFY` on both VSCodium versions and `ovsx get hookyqr.beautify`; a publish of
      `hookyqr.Beautify` or `HOOKYQR.other` answers `409` naming the stored spelling; and a pattern
      `hookyqr/**` authorizes it whatever spelling the request uses.
- [ ] AC14: Every hosted package has a `.sigzip` in the reference's layout (`.signature.sig`,
      `.signature.manifest`, an empty `.signature.p7s`) whose `.signature.sig` verifies as raw
      Ed25519 over the package against the key its metadata's `files.publicKey` names (the archive
      itself named by `files.signature`), served at
      `api/-/public-key/{sha256 of the key}`; `ovsx verify` passes for the published package and
      fails for tampered bytes of the same identity; after a key rotation new packages carry the new
      key and old packages still verify with the old one.
- [ ] AC15: Microsoft VS Code 1.139.1 with `extensions.verifySignature: false` installs extensions
      from a hosted, a proxied and a virtual repository.
- [ ] AC16: A version the shared policy layer refuses answers `403` with a reason phrase and
      `{"error": ...}` naming the policy on its package, asset, signature and checksum routes on both
      surfaces, on the hosted and the proxied path; ovsx `get` prints the reason phrase; both
      VSCodium versions fail with "Server returned 403" before any package byte and with no request
      to any other host; every metadata document and query answer still lists the version; an
      extension condemned as a whole appears in `vscode/control.json` and both VSCodium versions
      refuse it and anything depending on it with "reported to be problematic" before any package
      request, while a version-level condemnation never appears there; and a publish refused by a
      byte-dependent rule answers `403`.
- [ ] AC17: No document served on the hosted, proxied or virtual path names any host but this
      registry in any URL-valued field (`assetUri`, `fallbackAssetUri`, `files.download` and every
      other); so with the primary asset route answering `403`, `404`,
      `500` or wrong bytes, each editor's fallback request goes to this registry, where the captured
      behaviour against a document naming another host is a request to that host.
- [ ] AC18: `/api` metadata carries a strong `ETag`, `Cache-Control: no-cache` and no
      `Last-Modified`, and answers `304` to `If-None-Match` with the current `ETag`; file and asset
      routes carry their digest as `ETag`; and after an environment pointer is rolled back past a
      version, the next query answer omits it, `--update-extensions` on both VSCodium versions
      leaves an installed copy in place, and `--install-extension --force` installs the restored
      newest version.
- [ ] AC19: The proxied path installs extensions on both VSCodium versions and code-server, and
      downloads them with both ovsx versions, from an open-vsx.org stand-in serving recorded answers
      including its `302` to a storage host, every document regenerated by this registry and every
      package fetched by the registry; from fresh containers a second install reaches this registry
      while the stand-in receives no package request; and an extension installed from the stand-in
      keeps its upstream `extensionId` and `publisherId` in the query answers.
- [ ] AC20: A proxied per-extension record is revalidated after its TTL and not before; a version
      published upstream becomes installable after the TTL; cached packages are never revalidated;
      an extension missing upstream is negatively cached so a second request within the negative
      TTL makes no upstream request; and an upstream `429` or `5xx` is neither cached as absence nor
      surfaced as not-found.
- [ ] AC21: A stand-in package that fails its declared `.sha256`, is truncated, fails its signature
      against the pinned key, or after eviction arrives with a digest other than the pinned one (for
      an upstream declaring none) is never committed or delivered in full to any client through this
      registry, the installing client failing and the real reason recorded observably to the
      operator; and a verified package's verdict names the pinned key's identity.
- [ ] AC22: A stand-in redirect to a host outside the remote's storage-host allowlist answers `502`
      with no request to that host; the open-vsx.org default allowlist holds exactly the upstream's
      storage host; the client's credential is never forwarded; and a proxied manifest request is
      served from the verified cached package with no request to the upstream's asset routes.
- [ ] AC23: Through a remote repository, `ovsx verify` on a package fetched from the stand-in passes
      against the upstream key served under its digest, and the served `.sigzip` is byte-identical
      to the stand-in's; a package whose metadata names an unpinned key pins it and records a
      divergence.
- [ ] AC24: An identifier added to the stand-in's control document `malicious` list condemns that
      extension under the shared security-signal rule at the next control-document revalidation,
      the extension then appearing in the repository's `vscode/control.json` with its cached
      references ended and the operator alerted once; and the stand-in's `deprecated`,
      `migrateToPreRelease` and `search` entries never appear in any served document.
- [ ] AC25: A version or target, and a whole extension, vanishing from the stand-in, and a changed
      declared digest, each keep cached files served by URL, change the served record as the
      removal table says, and record a divergence; and an ordinary upstream metadata change is
      propagated at the next revalidation: Open VSX's side of the settled removal table in
      `proxy-cache.md` (its AC13).
- [ ] AC26: A virtual repository whose members are a hosted repository then an open-vsx.org remote
      resolves each `{namespace}.{extension}` the hosted member holds only from that member on both VSCodium versions
      even when the remote holds a higher version of it or of a case variant; resolves extensions only
      the remote holds from it; answers a UUID criterion only from the supplying member, after which
      the editor's repeat by name installs it; merges search without duplicates; serves every file
      from the supplying member; and answers `405` to every write route.
- [ ] AC27: A coordinate rule over an OSV-shaped `MAL-` advisory under `VSCode:https://open-vsx.org`
      for `CodeInKlingon.git-worktree-menu` refuses `codeinklingon.git-worktree-menu` requested in
      lowercase on hosted, proxied and virtual repositories; one under `VSCode` refuses the same
      coordinate; a range `introduced: 0, fixed: 2.58.0` refuses 2.57.0 and serves 2.58.0; an
      advisory with a `versions` list refuses exactly those versions and keeps the extension out of
      the control document; and the rule is accepted at configuration.
- [ ] AC28: A query over a hosted repository holding 18,472 extensions, a publish of a package at the
      maximum size including its signature, and a proxied install through a cold cache each
      complete within the budgets recorded in the benchmark suite, the publish within its peak
      memory budget, and CI fails on a regression beyond its tolerance.
- [ ] AC29: Two concurrent publishes of different targets of one version, and of different versions,
      both land with the metadata listing both; two concurrent publishes of one `(version, target)`
      produce exactly one success and one duplicate refusal; a publish racing an unpublish of its
      extension either lands before it or is refused; and under fault injection at each write
      boundary no snapshot serves a metadata document naming a package, signature or checksum it
      does not hold, with no lost update across the revision-token retry.
- [ ] AC30: `ovsx unpublish` (1.2.0) of one version, of one target of a version (`alpine-x64`), and of a whole
      extension through the management binding each change exactly what they name in exactly one
      snapshot, after which the query answers and metadata omit them and their routes answer `404`;
      a principal holding `push` without `delete` is refused `403`; an unpublish of something absent
      answers `404`; every write route against a remote or virtual repository answers `405`; and a
      hosted publish whose `extensionDependencies` name an extension the repository lacks is
      accepted.
- [ ] AC31: Replay-match passes against a corpus recorded from open-vsx.org and from the pinned
      reference server image, covering the recorded surface named in Design, with every divergence
      named in Design on the exception list and no `token` parameter, `-/t/` segment or token header
      value in the committed corpus.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/openvsx/hosted_install_test.go` (VSCodium 1.99 and 1.135, code-server; fresh directories; request set at the network layer; installed-file byte comparison) |
| AC2 | conformance | `conformance/openvsx/ovsx_publish_get_test.go` (both ovsx versions; query-token publish; `get` with and without `-t`; hash of the saved file; `show`, `list`, `search` on 1.2.0) |
| AC3 | property + conformance | `internal/format/openvsx/query_property_test.go` (generated bodies over every criterion type, flag and paging combination, against the semantics table); `conformance/openvsx/query_replay_test.go` (the recorded 950 and 439 bodies from the editors) |
| AC4 | conformance | `conformance/openvsx/target_platform_test.go` (multi-target, mixed-version and win32-only fixtures on both VSCodium versions and code-server; `ovsx get -t`) |
| AC5 | conformance | `conformance/openvsx/prerelease_update_test.go` (both VSCodium versions; `--pre-release`, `@version`, `--update-extensions` after a publish) |
| AC6 | integration + conformance | `internal/format/openvsx/publish_validation_test.go` (each refusal, no snapshot, size bound while streaming chunked bodies); `conformance/openvsx/ovsx_refusals_test.go` (both ovsx versions; printed errors; `--skip-duplicate` on duplicate and on retired pairs) |
| AC7 | integration | `internal/format/openvsx/retirement_test.go` (duplicate with same and different bytes, pruned snapshot under an injected clock, whole-extension removal, backwards repoint, other target and new version) |
| AC8 | architecture test + integration | `internal/format/openvsx/arch_test.go` (import, process and cgo audit); `internal/format/openvsx/hostile_vsix_test.go` (bomb, path, size, XXE and prepublish-script cases; bounded time; no file created; no snapshot) |
| AC9 | conformance + integration | `conformance/openvsx/write_credentials_test.go` (both ovsx versions with the query form; Bearer and header forms by `curl`; rejected token; plaintext refusal; `unpublish` proceeding); `internal/auth/redaction_scan_test.go` (query-string token absent from logs, traces, metrics and bodies after real publishes) |
| AC10 | conformance + integration | `conformance/openvsx/private_read_test.go` (both VSCodium versions, code-server and `ovsx get` through `-/t/`; prefix on every URL; cache headers; challenge equality; push-bearing token refused); `internal/auth/redaction_scan_test.go` (path-segment token case) |
| AC11 | conformance + unit | `conformance/openvsx/auth_pattern_test.go` (the pattern-refusal case `auth.md` AC8 and `format-handler-interface.md` AC7 require, in both modes; patterned credentials through the `credentials` key; namespace-bound publishes, `verify-pat`, `create-namespace`, patterned `get` and query refusal); `internal/format/openvsx/scope_object_test.go` (the object table per route, `format-handler-interface.md` AC12) |
| AC12 | integration + conformance | `internal/format/openvsx/verified_test.go` (declaration, withdrawal, admin-only, remote passthrough); `conformance/openvsx/verified_display_test.go` (ovsx 1.2.0 output) |
| AC13 | conformance + integration | `conformance/openvsx/names_test.go` (mixed-case publish; lowercase and uppercase installs on both VSCodium versions; `ovsx get`); `internal/format/openvsx/name_uniqueness_test.go` (case-folded `409`; pattern match on the lowercased object) |
| AC14 | integration + conformance | `internal/format/openvsx/sigzip_test.go` (layout, raw Ed25519 verification, key digest route, rotation); `conformance/openvsx/ovsx_verify_test.go` (genuine and tampered packages through ovsx 1.2.0) |
| AC15 | conformance | `conformance/openvsx/vscode_microsoft_test.go` (VS Code server 1.139.1 with the machine setting; hosted, proxied and virtual installs) |
| AC16 | conformance + integration | `conformance/openvsx/policy_test.go` (hosted and proxied; rules and advisories through the `policies` and `advisories` keys; ovsx and both VSCodium versions; network-layer assertion; listing kept; control-document refusal for a whole-extension condemnation and absence for a version-level one); `internal/format/openvsx/policy_publish_test.go` (byte-dependent refusal at publish) |
| AC17 | property + conformance | `internal/format/openvsx/served_hosts_test.go` (every served document on all three paths scanned for foreign hosts); `conformance/openvsx/fallback_containment_test.go` (primary asset `403`, `404`, `500` and wrong bytes; network-layer assertion on both VSCodium versions; the foreign-fallback control case) |
| AC18 | conformance + integration | `conformance/openvsx/headers_test.go` (`ETag`, `Cache-Control`, `304`); `conformance/openvsx/rollback_test.go` (rollback through the management surface; query, `--update-extensions` and `--force` on both VSCodium versions) |
| AC19 | conformance + integration | `conformance/openvsx/proxied_test.go` (stand-in serving recorded open-vsx.org answers and a storage-host redirect; both VSCodium versions, code-server, both ovsx versions; fresh containers; UUID continuity); `internal/format/openvsx/proxied_render_test.go` (regenerated documents differ from the stand-in's only in the named fields) |
| AC20 | conformance + integration | `conformance/openvsx/proxied_ttl_test.go` (mutating stand-in; installs before and after the TTL); `internal/format/openvsx/proxied_negative_test.go` (negative caching, throttling responses) |
| AC21 | integration + conformance | `internal/format/openvsx/proxied_integrity_test.go` (checksum mismatch, truncation, bad signature, pinned-digest refetch; CAS and reference assertions; operator record; verdict identity); `conformance/openvsx/proxied_integrity_test.go` (a tampered package failing through both VSCodium versions) |
| AC22 | integration | `internal/format/openvsx/storage_allowlist_test.go` (allowlisted and refused redirect hosts, the open-vsx.org default, credential non-forwarding, manifest from the cached package, asserted at the network layer) |
| AC23 | conformance + integration | `conformance/openvsx/proxied_verify_test.go` (ovsx 1.2.0 `verify` through the remote); `internal/format/openvsx/key_pinning_test.go` (byte-identical `.sigzip`, unpinned key pinned with a divergence) |
| AC24 | integration + conformance | `internal/format/openvsx/upstream_control_test.go` (malicious entry to condemnation, purge and single alert; ignored entry kinds); `conformance/openvsx/upstream_control_test.go` (the served control document refusing the install on both VSCodium versions) |
| AC25 | integration | `internal/format/openvsx/removal_test.go` (stand-in presenting each event class; the shared-layer half is `proxy-cache.md` AC13's) |
| AC26 | conformance | `conformance/openvsx/virtual_test.go` (hosted then remote members; higher upstream version and a case variant of the private name; UUID criterion and repeat by name; search merge; both VSCodium versions; provenance from the network layer; `405`) |
| AC27 | integration | `internal/policy/openvsx_osv_match_test.go` (both ecosystem variants, case-insensitive names, `fixed` range, `versions` list, control-document exclusion) |
| AC28 | benchmark | `internal/format/openvsx/bench_test.go` (a generated 18,472-extension repository; query, maximum-size publish with signing and its peak memory, cold proxied install; budgets and tolerance in the benchmark gate) |
| AC29 | integration | `internal/format/openvsx/concurrent_publish_test.go` (two writers per case, publish racing unpublish, fault injection at each write boundary, final documents and snapshot contents asserted) |
| AC30 | conformance + integration | `conformance/openvsx/unpublish_test.go` (ovsx 1.2.0 through the management binding; version, target and extension removal; editor effects; remote and virtual `405`); `internal/format/openvsx/unpublish_test.go` (one snapshot per operation, `push`-only refusal, absent target, unresolved dependency accepted) |
| AC31 | conformance | `conformance/openvsx/replay_test.go` |

The case set needs only keys already in the harness's closed `setup` vocabulary (its resolved
closed-vocabulary decision, was Q4): `repositories` with their visibility and type, including a
virtual repository's member order and a remote's storage-host allowlist, control-document URL and
pinned keys in its repository metadata document; `credentials`, patterned and `pull`-only ones
included; an `upstreams` stand-in (a fixture server serving recorded open-vsx.org answers, its
storage-host redirect, a control document, and the tampered, truncated, badly signed and vanishing
variants); `state` for pre-published packages with their derived files, retired pairs and verified
namespaces; and `policies` and `advisories` for AC16 and AC27. The runner-enforced obligations, both
modes and the unauthenticated, unauthorized and pattern-refusal cases in each, apply from the
sibling specs and are not restated per criterion here.

## Implementation Phases

### Phase 1: Hosted core
- Waits on `docs/internal/plans/foundation/signing-service.md` reaching `planned` (Blocking
  preconditions)
- The format-first mount, the VSIX reader and its architecture test, the `/api` and gallery read
  surfaces with the query semantics, target platforms, publish with its validation, derived files and
  signing, duplicate and retirement handling, names, the write credential forms and their redaction,
  private reads through the path token, the namespace-bound base, `verify-pat` and `create-namespace`,
  per-route addressed objects, freshness headers, the `403` policy rendering and the control
  document, the benchmarks

### Phase 2: Management bindings
- Waits on `docs/internal/plans/foundation/management-api.md` reaching `planned` (Blocking
  preconditions)
- `ovsx unpublish` as a binding onto the removal operation, the verified-namespace declaration, and
  the write boundaries exercised end to end under concurrency and fault injection

### Phase 3: Proxied path
- Waits on `artifact-verification.md` reaching `planned`, on `proxy-cache.md` accepting a declared
  digest from a prior metadata request, and on the Open VSX adapter in `upstream-adapters.md`
  (Blocking preconditions)
- Upstream validation, per-extension records and their revalidation, regenerated documents, forwarded
  search, package fetch through the storage-host allowlist with digest and signature verification,
  key pinning, the upstream control document as a security signal, negative caching, the removal
  table, `405` on remote writes

### Phase 4: Virtual repositories
- Per-extension member-ordered resolution, UUID resolution in the supplying member, merged search,
  the merged control document, `405` on virtual writes

### Phase 5: Corpus and gate
- Recording session across the named surface (after the harness redaction gate) against
  open-vsx.org and the pinned reference server, replay-match, the exception-list entries named in
  Design, and the matrix rows for the deliberately unimplemented surface

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. The eighteen questions this draft raised were each written in the template's decision
shape and then adopted at their own recommendation under the owner's standing delegation of
2026-09-26, so the loop can continue; each is recorded below as adopted rather than decided, folded
through Scope, Design, the criteria and the Test Plan in the same pass, and reversible by the owner
at any time. `grep -rn "standing delegation"` is the owner's review queue.

### Resolved: the write credential forms and the reported version (was Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the central verifier accepts
a registry token as the `token` query parameter and as `X-OpenVSX-Token`, beside Bearer, on this
format's four write routes only, with redaction and plaintext refusal covering both; `api/version`
reports `v1.3.0` (Design, "Authentication"; AC9).

The question: every released ovsx sends the token only in the query string (captured), a form
`auth.md`'s verifier does not accept, and ovsx 1.2.0 refuses to unpublish against a registry reporting
below 1.2.0 (captured).

**Recommendation:** A. It is the only form released publishers send, `luarocks.md` already set the
precedent of a format-scoped non-header form in the shared verifier, and reporting 1.3.0 is truthful
about the contract served, header forms included.

| Option | You get | It costs |
|---|---|---|
| **A. Query and header forms on write routes; report 1.3.0** | Every released and the next ovsx publish and unpublish unchanged | A credential in URLs, which redaction must cover wherever a URL is recorded |
| **B. Bearer only** | No new form in the verifier | No released ovsx can publish; every CI pipeline must wait for an unreleased client |
| **C. Query form everywhere** | Uniformity | Read URLs carrying credentials into caches and logs for no client that needs it |

**Why this is yours:** it widens the shared verifier's accepted forms, which `auth.md` owns.

Accepted cost: the `auth.md` client-table row and verifier amendment, listed as a sibling
consequence, and redaction of query strings.

### Resolved: private reads for clients that cannot authenticate (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a `pull`-only registry token
as the path segment after `-/t/` on read routes, every rendered URL carrying the prefix, responses
`private, no-store`, and a token holding any other action refused there (Design, "Authentication";
AC10).

The question: no editor sends a credential by any mechanism (userinfo dropped, Basic challenge read as
"not found", captured), and released ovsx sends none on reads, so a private repository is unreadable
by the ecosystem's clients.

**Recommendation:** A. Private extension hosting is the main reason to run a private Open VSX, and a
read-only, one-repository token confines what the credential in an editor's configuration can do.

| Option | You get | It costs |
|---|---|---|
| **A. `pull`-only path token** | Private repositories usable by every captured client | A token in editor configuration and error output |
| **B. Anonymous read only; private repositories unsupported for this format** | No credential in URLs | Private extensions exposed to anyone with network reach, or not hostable |
| **C. Network-level controls only, documented** | No registry change | The registry's own RBAC does not apply to its main clients |

**Why this is yours:** it adds a credential presentation form to the shared verifier and accepts
credential-bearing URLs.

Accepted cost: the verifier amendment, the operator guidance on rotation, and redaction of the path
segment.

### Resolved: namespace ownership as pattern scopes (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: no namespace objects;
ownership is a `{namespace}/**` grant over the lowercased `{namespace}/{extension}` object; a
namespace-bound write base lets a namespace-patterned token publish; `verify-pat` and
`create-namespace` are authorization checks that write nothing (Design, "Namespaces as pattern
scopes"; AC11).

The question: Open VSX's authorization is namespace membership, while `auth.md` settled one central
vocabulary with patterns, and a raw `.vsix` body names its namespace only after the whole body is
read.

**Recommendation:** A. It keeps one authorization vocabulary, as `ansible-collections.md` and
`cargo.md` chose, reads nothing before authorizing, as `puppet.md` and `pypi.md` require, and still
gives Open VSX's namespace-scoped publisher a working `ovsx publish`.

| Option | You get | It costs |
|---|---|---|
| **A. Pattern scopes, namespace-bound base, no-write checks** | One vocabulary; patterned publishing; unchanged CI scripts | A second base URL to document; `create-namespace` creates nothing |
| **B. Pattern scopes, ordinary base only** | No second base | Only an unpatterned `push` can publish, so namespace isolation needs one repository per namespace |
| **C. Namespace records with members, enforced centrally** | The reference's model | A second authorization vocabulary beside `auth.md`'s, and a home in the shared model for records it does not have |
| **D. Buffer the body and read the identity before authorizing** | Patterned publishing on the ordinary base | Spooling up to 250 MiB from principals the pattern may refuse |

**Why this is yours:** it sets the isolation unit for editor-extension publishers.

Accepted cost: the operator mapping of owners and contributors onto grants, and the exception-list
entries for the namespace-bound base and `create-namespace`.

### Resolved: what `verified` means (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: true exactly when an
administrator has declared the namespace verified in the repository; the upstream's value on remotes
(Design, "What `verified` means"; AC12).

**Recommendation:** A. ovsx shows the word to users as a trust signal (captured), and the reference's
membership rule would mark everything verified here.

| Option | You get | It costs |
|---|---|---|
| **A. Administrator declaration** | A deliberate trust signal | A management operation and one set in the repository document |
| **B. Always false on hosted** | Nothing to manage | Internal publishers' extensions look like unvetted third-party ones |
| **C. True for every hosted publish** | Parity with "published by a member" | A signal that says nothing |

**Why this is yours:** it defines a trust label users see.

Accepted cost: the declaration operation in `management-api.md`.

### Resolved: names (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: case preserved, looked up and
unique case-insensitively, a differently spelled publish refused `409`, the addressed object
lowercased (Design, "Names"; AC13).

**Recommendation:** A. Editors lowercase every identifier (captured), the reference resolves
case-insensitively (live), and a pattern must not be evadable by spelling.

| Option | You get | It costs |
|---|---|---|
| **A. Preserve, fold for lookup and uniqueness, refuse other spellings** | Real names served as written; no ambiguity | A publisher cannot change a name's case |
| **B. Fold other spellings into the stored name silently** | No refusal | A package whose identity differs from the name it is served under |
| **C. Lowercase everything** | One spelling | Names such as `HookyQR` served differently from every other registry |

**Why this is yours:** it limits what a publisher may name an extension.

Accepted cost: the exception-list entry for the `409`.

### Resolved: target platforms in the shared model (was Q6)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: one `Version` per version
string with its targets in the version document and one set of files per target; the coordinate,
duplicate check and retirement are per `(version, target)` (Design, "Mapping onto the shared model",
"Target platforms"; AC4, AC7).

**Recommendation:** A. The client treats targets as packages of one version (captured selection), the
shared model forbids new tables, and per-pair retirement is how the reference reports removed targets.

| Option | You get | It costs |
|---|---|---|
| **A. Targets as files of one version** | One version row; per-target publish and removal | Per-target state inside a version document the handler must merge under the revision token |
| **B. A version row per `(version, target)`** | Simple rows | Version strings that are not versions, and every version listing de-duplicated |
| **C. Universal only** | Nothing to model | 11 target platforms of real extensions (live) unhostable |

**Why this is yours:** it shapes how a multi-package release sits in the shared model.

Accepted cost: the per-target merge and its concurrency test.

### Resolved: the gallery query's semantics (was Q7)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: implement the full criteria
and flags vocabulary as Design states, with the reference's precedence, the per-target meaning of
latest-only, and type 8 read both ways (Design, "The gallery query"; AC3).

**Recommendation:** A. The editors send only a fraction today (captured), but their search, category
and featured views send the rest (`extensionGalleryService.ts`), and the reference's reading is the
de facto contract.

| Option | You get | It costs |
|---|---|---|
| **A. Full vocabulary, reference semantics** | Every editor view works | A property-tested query engine |
| **B. Name and UUID criteria only** | The install path | Search and browsing return nothing |
| **C. Forward hosted queries to a search engine** | Relevance ranking | A second store and its consistency with snapshots |

**Why this is yours:** it fixes the contract of an undocumented protocol.

Accepted cost: the property suite and deterministic relevance ordering.

### Resolved: signing hosted packages (was Q8)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: every hosted package gets a
`.sigzip` in the reference's layout, signed inside its publish by the shared signing service with a
per-repository Ed25519 key, public keys addressed by digest, and the gallery advertising the assets
as the reference does (Design, "Signing, provenance and policy"; AC14).

**Recommendation:** A. `ovsx verify` is the ecosystem's only verifier and needs it, and withholding the
assets changes nothing for any editor (captured: two ignore them, one rejects every Open VSX package
regardless).

| Option | You get | It costs |
|---|---|---|
| **A. Sign with a registry key via the shared service** | `ovsx verify` works; parity with the reference | A signing dependency on the publish path |
| **B. Do not sign** | No dependency | `ovsx verify` fails for every hosted package |
| **C. Sign in the handler** | No service dependency | Key custody inside a handler, which the shared service exists to prevent |

**Why this is yours:** it puts a registry key's attestation on every hosted package.

Accepted cost: the requirements on `signing-service.md`, including bounded-memory pure Ed25519.

### Resolved: signatures on proxied packages (was Q9)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: verify the upstream's signature
against pinned upstream keys, serve the upstream's `.sigzip` and key unchanged under this registry's
URLs, and hand the verdict to policy (Design, "Signing, provenance and policy"; AC21, AC23).

**Recommendation:** A. It preserves the provenance the upstream attested, which is what a signature rule
wants to bind to, and it is what the reference's own mirror checks.

| Option | You get | It costs |
|---|---|---|
| **A. Verify and relay the upstream's signature** | `ovsx verify` proves the upstream's attestation; a real verdict | Key pinning and rotation handling per remote |
| **B. Re-sign with this registry's key** | One key for everything | The upstream's attestation replaced by a claim that this registry served the bytes |
| **C. Serve no signature for proxied packages** | Nothing to pin | No verdict for signature rules on the proxied path |

**Why this is yours:** it decides whose attestation a cached package carries.

Accepted cost: the verdict requirement on `artifact-verification.md` and the key-divergence alerts.

### Resolved: how a policy refusal reaches an editor (was Q10)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: `403` with a reason phrase and
JSON body on every route of a refused package, whole-extension condemnations in the repository's
control document, and no elision (Design, "Policy refusals on the wire"; AC16).

**Recommendation:** A. The control document is the only refusal an editor explains (captured), a
manifest refusal stops the install before any package byte (captured), and ovsx shows the reason phrase.

| Option | You get | It costs |
|---|---|---|
| **A. `403` everywhere, control document for whole-extension condemnations, listed** | An explained refusal where the ecosystem allows one; a halt elsewhere | Version-level refusals show only "Server returned 403" in editors |
| **B. Elide refused versions** | The editor silently takes an older version | A refusal nobody sees, and a downgrade nobody chose |
| **C. List every condemned extension in the control document** | Every refusal explained | Clean versions of partly condemned extensions blocked |

**Why this is yours:** it trades explanation against precision of a refusal.

Accepted cost: the operator documentation on the editor's generic message and on configuring
`controlUrl`.

### Resolved: regenerate every served document (was Q11)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: every document on every path is
rendered from records, every URL-valued field names this registry, files are served not redirected,
and the remote's per-extension record is parsed from the upstream's gallery answer (Design, "Serving
documents that cannot leave the registry", "The proxied path"; AC17, AC19).

**Recommendation:** A. The editor falls back to a URL our metadata names and ovsx follows any host
(captured), so a relayed upstream document would route clients around every refusal.

| Option | You get | It costs |
|---|---|---|
| **A. Render everything; serve files** | Refusals and offline mode hold; one rendering path for all three repository types | Divergence from the reference's redirects and cache headers |
| **B. Relay upstream documents with URL rewriting** | Upstream fields preserved verbatim | Any URL field the rewrite misses is an escape |
| **C. Redirect to the upstream's storage** | No package bytes stored | No cache, no verification, no refusal |

**Why this is yours:** it decides whether the cache may present upstream documents as its own.

Accepted cost: the exception-list entries.

### Resolved: where proxied packages come from and how they are checked (was Q12)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the upstream's declared
`.sha256` fetched first, the package fetched through a storage-host allowlist defaulting to the
upstream's one storage host, verified before commit, pinned where nothing is declared, and assets
served from the verified package (Design, "The proxied path"; AC21, AC22).

**Recommendation:** A. Every sampled upstream version declares a SHA-256 (live), the storage redirect
is to one known host, and serving assets from the verified package gives one integrity point.

| Option | You get | It costs |
|---|---|---|
| **A. Declared digest first; allowlisted storage host; assets from the package** | Verified bytes, bounded egress | One extra small request per package; a manifest request fetches the package |
| **B. Follow any redirect** | No configuration | An open egress relay |
| **C. Trust the signature alone** | No digest request | A verdict that depends on a key the upstream serves beside the package |

**Why this is yours:** it widens where the proxy layer may send requests.

Accepted cost: the requirements on `proxy-cache.md` and `upstream-adapters.md`.

### Resolved: the upstream control document (was Q13)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: its `malicious` list is an
explicit upstream security signal under the shared rule; every other entry is ignored and nothing of it
is served (Design, "The proxied path"; AC24).

**Recommendation:** A. The 948 `malicious` identifiers are the ecosystem's own condemnations (live),
while `deprecated` and `migrateToPreRelease` make an editor install a different extension (source).

| Option | You get | It costs |
|---|---|---|
| **A. `malicious` as a signal; the rest ignored** | Upstream condemnations enforced on every path | Upstream deprecation notices not shown |
| **B. Relay the upstream document** | Parity with VSCodium's default | Upstream text steering editors to other extensions |
| **C. Ignore it** | Nothing to fetch | An upstream signal channel left unused |

**Why this is yours:** it decides what upstream text may steer an editor.

Accepted cost: an adapter fetch from a second allowlisted host.

### Resolved: virtual repositories (was Q14)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: per-extension resolution, the
first member holding a name (case-insensitively) supplying all its versions and targets, UUIDs
resolved only in the supplying member (Design, "Virtual repositories"; AC26).

**Recommendation:** A. Member order is `data-model.md`'s resolution rule, per-extension shadowing is the
defence against dependency confusion, and the reference merges the same way.

| Option | You get | It costs |
|---|---|---|
| **A. Per extension, first member wins** | Private names cannot be outranked by upstream versions | A private extension hides every upstream version of its name |
| **B. Per version, union of members** | Every version visible | An upstream version outranks a private one |
| **C. No virtual repositories** | Nothing to specify | Editors take one gallery, so private and public extensions could not be combined at all |

**Why this is yours:** it sets precedence between private and public content.

Accepted cost: the documented shadowing.

### Resolved: unpublish as a management binding (was Q15)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: `ovsx unpublish` is a binding
onto the registry-owned removal operation, authorized by `delete`, hosted only, removed pairs retired
(Design, "Unpublish, namespaces and the management API"; AC30).

**Recommendation:** A. It is the cross-format precedent (`cargo.md`, `npm.md`), and a removal's
authorization must not depend on the wire it arrived over.

| Option | You get | It costs |
|---|---|---|
| **A. Binding, `delete`, retirement** | One removal rule across formats | A publisher needs `delete` to unpublish; Phase 2 waits on `management-api.md` |
| **B. A format-local route authorized by `push`** | The reference's "members may delete" model | Two removal rules for one operation |

**Why this is yours:** it applies a cross-format rule to a client-native route.

Accepted cost: the dependency on `management-api.md`.

### Resolved: unresolved dependencies at publish (was Q16)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: accept the publish (Design,
"Publishing"; AC30).

**Recommendation:** A. An editor resolves dependencies through the virtual repository it is pointed at
(captured: dependencies are queried by name at install), which a hosted repository cannot see.

| Option | You get | It costs |
|---|---|---|
| **A. Accept** | Private extensions depending on public ones publish | A package whose dependency is missing everywhere installs to an error |
| **B. Refuse, as the reference does** | Parity | Every hosted extension depending on an open-vsx.org extension refused |

**Why this is yours:** it diverges from the reference's publish contract.

Accepted cost: the exception-list entry.

### Resolved: OSV matching for this ecosystem (was Q17)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: every Open VSX repository
matches advisories of every `VSCode` ecosystem variant, case-insensitively, ordered by semantic
versioning (Design, "Signing, provenance and policy"; AC27).

**Recommendation:** A. A namespace on one registry may be the same publisher or a squatter of it on
another, all 21 advisories are malware, and over-refusal is the safe error.

| Option | You get | It costs |
|---|---|---|
| **A. All variants, case-insensitive** | Malware named anywhere refused everywhere | False positives for an unrelated same-named namespace |
| **B. Match only the upstream's own variant** | Precise attribution | A Marketplace malware entry missed on open-vsx.org |
| **C. Case-sensitive, as OSV's query does** | Parity with OSV | A lowercase request evades the advisory |

**Why this is yours:** it trades attribution precision against missed malware.

Accepted cost: the matcher requirement on `supply-chain-policy.md`.

### Resolved: open-vsx.org as a preconfigured upstream (was Q18)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: user-configured in v1, not
added to the preconfigured set; revisited on the catalogue's Tier 3 verdict through `proxy-cache.md`'s
own extension mechanism (its resolved preconfigured-set extension, was Q14), the footing `conan.md`,
`chef.md`, `luarocks.md` and `opam.md` left their upstreams on (Scope).

**Recommendation:** B, for sequencing: Open VSX is Tier 3 and built only if the breadth gate says so.

| Option | You get | It costs |
|---|---|---|
| **A. Preconfigure open-vsx.org now** | Editor-extension caching with no configuration | A sibling decision reopened from a Tier 3 spec before the gate |
| **B. User-configured in v1, revisited at the verdict** | No sibling amendment | No nightly run against the real open-vsx.org until then |

**Why this is yours:** it amends a set you priced for a few upstreams.

Accepted cost: the proxied cases run against a stand-in; the real upstream is exercised by the
recording session.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | 05cf090 | authoring pass: grounded first draft, not a review | Grounded four ways: captured traffic from ovsx 0.10.12 and 1.2.0, VSCodium 1.99.32846 and 1.135.06055, code-server 4.139.1 and Microsoft VS Code server 1.139.1, each pinned, on a dedicated Podman network against a logging, rule-injecting stub (the query-string token on every write of both ovsx versions whatever version the registry reports, chunked publish bodies, the `api/version` probe and the client-side unpublish floor, the `--skip-duplicate` string match, ovsx following foreign download URLs and redirects and printing only the reason phrase on downloads, the gallery query bodies with flags 950 and 439 by name and UUID, lowercased identifiers, target selection preferring the newest version, the win32-only refusal, pre-release and pinned installs, `--update-extensions` moving forward only and `--force` applying a rollback, the editor falling back to `fallbackAssetUri` on another host, a tampered package installed unverified by VSCodium and code-server, Microsoft VS Code refusing Open VSX-signed and unsigned packages unless `extensions.verifySignature` is off, userinfo ignored and a Basic challenge read as not found, a refused package written out as a corrupt zip after six requests, a refused manifest shown as `Server returned 403`, and the control document's `malicious` list refusing an install and its dependents); the eclipse/openvsx server and CLI sources and VS Code's gallery client at three versions; the live open-vsx.org (version report, headers and ignored conditional requests, CDN redirects, 100 of 100 sampled versions with `sha256` and `signature`, a raw Ed25519 signature over the whole package verified with openssl, eleven targets for one extension, case-insensitive lookup, the GitHub control document with 948 malicious entries); and OSV (a `VSCode` ecosystem with the `VSCode:https://open-vsx.org` variant, 21 `MAL-` advisories, case-sensitive name matching) and the `vscode-extension` purl. Design built from that: the wire table; seven decisive client behaviours; the shared-model mapping with targets as files of one version; publish as a client-native write with its write-boundary declaration and the reference's duplicate wording; unpublish and the verified declaration as management bindings; the full query semantics with the overloaded type 8 and per-target latest-only; names case-preserved and folded; write credentials in the query string and header forms; `pull`-only path tokens for private reads; namespace ownership as `{namespace}/**` patterns with a namespace-bound publish base; `verified` by declaration; hosted `.sigzip` signing through the shared service with its requirements, proxied signatures verified and relayed, OSV matching across variants; `403` with reason phrases, whole-extension condemnations in a registry-served control document, no elision; every served document regenerated; ETag-only freshness; a non-executing, bounded VSIX reader; per-route addressed objects; the proxied path with declared-digest verification, a storage-host allowlist, assets from the verified package and the upstream control document as a security signal, with Open VSX's removal-table rows; per-extension virtual resolution. Eighteen questions adopted under the standing delegation: write credential forms and the reported version (AC9), path-token private reads (AC10), namespaces as pattern scopes (AC11), `verified` by declaration (AC12), names (AC13), targets as files (AC4, AC7), query semantics (AC3), hosted signing (AC14), relayed proxied signatures (AC21, AC23), refusal rendering (AC16), regeneration (AC17, AC19), proxied fetch and integrity (AC21, AC22), the upstream control document (AC24), virtual repositories (AC26), unpublish as a binding (AC30), unresolved dependencies accepted (AC30), OSV matching (AC27), open-vsx.org user-configured. Thirty-one criteria, each with a Test Plan row. Sibling consequences recorded in the authoring report, not applied here. Stays draft; awaits an independent review. |
