---
status: draft
status_description: "Reconciled 2026-09-28 at 20ff418 with the foundation wave on Opus (not a review): hosted packages signed through signing-service's Indexer with no generated document and SignBlob under its one-copy Ed25519 bound, the signature a Signature record and the .sigzip assembled on read, the by-digest rotation profile (AC14, AC28); removed (version, target) pairs retired core-held and refused in the reference's wording (AC7); ovsx unpublish bound onto delete-version and delete-package, the verified declaration a configure operation (AC30); auth.md now carries the ovsx row and the query, header and read-segment forms, and an off-route query token is an authentication failure under auth was-Q24 (AC9); api/version is a descriptor (AC11); WriteRefusal with the Refused by policy phrase and the control document rendered from the advisory reader, binding row holds (AC16); declared digests from the prior .sha256 request under proxy-cache AC20, a structural verifier where none is declared, the storage host an off-origin allowlist entry with role none, pinned keys as the trust set, and a bad upstream signature now a failed verdict recorded not enforced per artifact-verification AC21 (AC21 to AC23); proxy-cache event classes and refresh (AC25); Capabilities with the rename case (AC32); trusted publishing adopted as a binding onto credential-management's exchange under Q19 (AC33). Earlier: authored 2026-09-26 from captures of ovsx 0.10.12 and 1.2.0, VSCodium 1.99 and 1.135, code-server 4.139.1 and VS Code 1.139.1; eighteen questions adopted under the standing delegation, a nineteenth at this reconciliation; none open. Awaits a /spec review pass."
description: "Spec for the Open VSX format: the Open VSX registry API (/api metadata, per-target .vsix files, publish and unpublish with a token that released ovsx clients send only in the query string) and the VS Marketplace-compatible gallery surface (a POST extensionquery with a flags bitfield and typed criteria, and /vscode/asset routes), where every served URL, including the fallbackAssetUri the editor falls back to, names this registry, namespace ownership is expressed as auth.md pattern scopes through a namespace-bound publish base, hosted versions carry a .sigzip signed by the shared signing service, policy refusals reach the editor through a registry-served control manifest, and an open-vsx.org cache regenerates every document it serves, with ovsx 0.10.12 and 1.2.0, VSCodium 1.99 and 1.135 and code-server 4.139.1 as the oracles."
author: michielvha
goal: "Serve editor teams a private Open VSX registry and an open-vsx.org cache that VSCodium, code-server and ovsx use as they are, in which every extension an editor installs comes from the registry, is bound to the bytes the registry verified, and can be refused by policy with no request leaving the registry, with namespace ownership mapped onto the registry's own pattern scopes and the real clients as the oracle on both paths."
priority: "low"
issue: 42
created: 2026-09-26
covers:
  - "internal/format/openvsx/**"
  - "conformance/openvsx/**"
fable_recheck: "authored on Opus 2026-09-27 while Fable was out of monthly credit; grounded in captured client traffic, but the design judgement was never Fable-reviewed. Reconciled on Opus 2026-09-28 (format batch 6), adopting Q19 (trusted publishing brought into scope as a binding onto credential-management's OIDC exchange, its wire still to be captured), which also needs a Fable recheck"
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
credential form `auth.md` had to add as a route-scoped presentation form. **No editor verifies what it installs, and the one that
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
client-native wire write that signs its package inside the same write, with a registry key the
service holds (the resolved hosted-signing decision below). That service is
`docs/internal/plans/foundation/signing-service.md`, which the charter builds at step 7 as the
production form of what the step 4a prototype learned; this format is one of its two consumers
that use signing with no generated index ("nothing is asked of its index half", its "Two halves,
one write"), reached through the optional `Indexer` interface with a profile that declares no
document keys and one signing profile (its AC24), and `SignBlob` over the committed package under
its memory bound (its "Signing stored blobs, and the memory bound", AC18). What this format
requires of it is stated in Design ("What the signing service must provide"), each item mapped onto
that spec's contract, never designed here.

**The management API must be `planned` before Phase 2.** `ovsx unpublish` is a client-driven route
served as a binding onto the registry-owned `delete-version` and `delete-package` kinds, and
declaring a namespace verified is a `configure` operation with no client trigger (the resolved
unpublish and verified-namespace decisions below). Both are rows of
`docs/internal/plans/foundation/management-api.md`'s cross-format reconciliation table, whose core
the charter builds at step 2 and whose bindings land in its Phase 3. The trusted-publishing route is
a binding onto `docs/internal/plans/foundation/credential-management.md`'s OIDC exchange, which lands
in that spec's Phase 3, between OCI and PyPI (the resolved trusted-publishing decision below, was
Q19), so it too exists before this handler.

**Artifact verification must be `planned` before Phase 3.** A proxied package's upstream signature
is verified against the remote repository's pinned upstream keys, and the verdict is what
`supply-chain-policy.md`'s signature rules consume (Design, "Signing, provenance and policy"). That
producer is `docs/internal/plans/foundation/artifact-verification.md`, whose core lands at charter
step 4b and whose raw Ed25519 entry (its `raw` scheme, AC16) is built with this format in its
Phase 4 at step 11. This format supplies it the first Ed25519 raw-signature envelope in the
catalogue.

**The proxy layer and the upstream transport this format needs now exist as specs; both must be
`planned` before Phase 3.** The gallery response that leads a client to a package carries no
digest; the digest lives in a separate `.sha256` file named by the version's `/api` metadata.
`proxy-cache.md` accepts exactly that: "a digest a handler obtained through a prior metadata
request, such as Open VSX's `.sha256`, is a declared digest like any other" (its "Completion-only
mode and the verifier hook", the resolved completion-only decision, was Q15 there, AC20). The
transport is `docs/internal/plans/foundation/upstream-adapters.md`'s `https` adapter (charter step
4), whose requirements table carries this format's row ("Storage-host allowlist; control-document
fetch; pinned upstream keys", its AC7): the upstream's `302` to its storage host is followed inside
the adapter only to a host on the remote's off-origin allowlist (the shape `composer.md` requested
in its resolved dist-host decision, was Q6), the control document is fetched by the handler through
fetch-and-cache from a second allowlisted host, and the pinned upstream keys are the remote's
trust set, `artifact-verification.md`'s, not the adapter's.

Nothing is required of `docs/internal/plans/foundation/async-operations.md`, which records Open VSX
among the formats that ask nothing of it: every write this format makes completes inside its
request, as the reference server's own `201` does, and a virtual repository renders its documents
per request with no merge job.

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
- Hosted signing: every hosted package is signed inside its publish by a registry key held by the
  shared signing service, the signature kept as a `Signature` record and served as a `.sigzip` in
  the reference's layout, with a `.sha256` beside it and public keys addressed by digest.
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
- Trusted publishing: ovsx 1.2.0's `api/-/trusted-publishing/token` route as a binding onto
  `credential-management.md`'s OIDC exchange (the resolved trusted-publishing decision below, was
  Q19).
- The declared capabilities `format-handler-interface.md` AC13 names, and the shared rename case
  `repository-lifecycle.md` AC12 requires of every format.
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
  `extensionId`, generated at the first publish of the name and never changed) and the principal of
  each publish for `publishedBy`. The removed `(version, target)` pairs are **not** here: each is a
  core-held `Retirement` record, written in the removing operation's transaction, outside snapshot
  content and never pruned (`management-api.md`, "Retirement is core-held", its resolved
  retirement-placement decision, was Q3 there; `data-model.md` AC35), so no repoint can restore a
  document that predates a removal.
- **`Version.version` is the version string**, exactly as the manifest's `Identity` declares it. The
  version-level document holds, **per target platform**, what ingest read from the package's
  `extension.vsixmanifest` and `extension/package.json` (display name, description, `engines`,
  `extensionDependencies`, `extensionPack`, categories, tags, `extensionKind`, localized languages,
  licence, repository, gallery colour and theme, whether the `Microsoft.VisualStudio.Code.PreRelease`
  property is `true`), the package's SHA-256, the SHA-256 of each zip entry (what the `.sigzip`'s
  `.signature.manifest` lists), the member names of each extracted asset, and the publish time. A version with packages for several targets is one
  `Version` with several targets in its document (the resolved target-platform decision below).
- **Files per target** `{t}`: `{t}/{namespace}.{extension}-{version}[@{t}].vsix` (the `@{t}` suffix
  omitted for `universal`, the reference's file name, `NamingUtil`), the matching `.sha256`, and each
  extracted asset (`package.json`, `extension.vsixmanifest`, the readme, changelog, licence and icon
  the manifest's `Assets` name), each a `File` over a `Blob` keyed by its CAS digest. Two targets with
  byte-identical packages share one blob.
- **The signature is a record, not a file**: a `Signature` record keyed by the package's digest and
  the signing key, outside snapshot content, pruned with the package it signs (`signing-service.md`,
  "Storage: bodies in the snapshot, signatures as records"; `data-model.md` AC37). The `.sigzip` a
  client downloads is **assembled** from that record and the version document's entry digests by a
  deterministic framing (the reference's three entries, fixed zip metadata), never by a signing
  operation on a read (`signing-service.md` AC6), so a key rotation never rewrites a snapshot.
- **The repository-level document** holds the namespace UUIDs (the gallery's `publisherId`, generated
  at the first publish into a namespace), the set of namespaces an administrator declared verified,
  and the case-folded name set that enforces case-insensitive uniqueness.
- **A `remote` repository** holds, in each package-level document, the regenerated record of the
  upstream extension (every version and target with the fields above, the upstream UUIDs, the
  upstream's declared SHA-256 per package once fetched, and the upstream's `verified` flag), a current
  document carrying `proxy-cache.md`'s cache-scoped `adopted_at` (`data-model.md` AC44) and
  CAS-backed above the inline threshold (`storage-and-gc.md` AC16); in its repository-level document
  the record of its control document; and each fetched package, and the upstream's `.sigzip` bytes
  beside it, as a `File` with a `RemoteFile` whose upstream path is the reference's file route. The
  upstream's pinned public keys are the remote's **trust set**, `raw-keys` entries by digest
  (`artifact-verification.md`, "Trust sets"), not a document of this handler's, and each fetched
  package's verdict is that spec's record, keyed by the package digest.

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
   reference serves it), written by the handler, and the package's signature, produced by the signing
   runtime from the shared write path's pre-commit hook with no call from the handler
   (`signing-service.md` AC1, AC24; Design, "Signing, provenance and policy").

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
  wording, which `--skip-duplicate` deliberately does not swallow. The retirement check itself is the
  shared write path's, against the core-held `Retirement` records, for the coordinate the handler
  reports for the write, `{namespace}/{extension}/{version}@{target}`, which is finer than the route's
  authorization object; the handler renders that refusal in the reference's status and wording rather
  than as the management API's `retired` (409), because the wording is what ovsx matches
  (`management-api.md`, "Retirement is core-held", AC12). Another target of an existing version
  publishes normally.
- **A spelling that differs case-insensitively from a stored namespace or extension name answers
  `409`** (the resolved name decision below).
- **An unpublish is one write** however many `(version, target)` pairs it removes; the handler returns
  each removed pair in its `Outcome` and the core writes a `Retirement` record for it in the same
  transaction, with nothing for the handler to carry forward (`management-api.md` AC12,
  `data-model.md` AC35), and removing an extension's last package leaves its `Package` row
  (`data-model.md` AC33).
- **`verify-pat` and `namespace/create` write nothing** (the resolved namespace decision below).
- **All are synchronous.** A wire publish records no `Operation`; an unpublish and a verified
  declaration, being management operations, complete in-request and leave the `Operation` record every
  management operation leaves (`data-model.md`'s "Operations", widened to every management
  operation).
- **A proxied repository creates no snapshots**: arrival and revalidation are cache materialisation.

Two concurrent publishes of different targets of one version each read-modify-write the version
document through `data-model.md`'s revision-token retry (its AC20) and both land; two concurrent publishes of
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
removal kinds** of `docs/internal/plans/foundation/management-api.md`, the binding its
cross-format reconciliation table names for the Open VSX row (`ovsx unpublish` onto `delete-version`
and `delete-package`), per the cross-format precedent (`cargo.md`'s resolved yank-binding decision,
was Q6): authorized by `delete` in the settled `(repository, action)` vocabulary, hosted only (a
proxied or virtual repository answers `405` with the `repository-type` problem, identically through
the binding and the API, `management-api.md` AC7), its trigger verified by this registry's
integration tests and by ovsx 1.2.0, its effect by the editors. The handler declares the kinds
through the optional `Operator` interface's `Operations()` and the route through `Bindings()`; the
route has no behaviour of its own beyond parsing the version and target list into the operation and
rendering the outcome in the reference's JSON, and its `Scope(r)` reports what the operation's
`Authorize` reports (`management-api.md`, "Bindings: one operation, two ways in", AC8). Every
declared kind is driven by a `script` case (`management-api.md` AC24, enforced by
`conformance-harness.md` AC26). `api/version` answers `{"version": "v1.3.0", "maxExtensionSize":
...}`, the lowest reference version whose client contract this spec serves (the header token forms
included), so ovsx 1.2.0's unpublish check passes and the unreleased ovsx that sends
`Authorization: Bearer` to 1.3.0 and later is served too (the resolved credential-form decision
below):

| Operation | What it carries | Effect a client sees | Kind | Action |
|---|---|---|---|---|
| Remove packages (`ovsx unpublish -v ... [-t ...]`) | Namespace, extension, and a list of versions, each optionally with a target | Removed packages leave every metadata document and query answer; their file and asset routes answer `404`; `--update-extensions` never moves an installed copy back, and `--install-extension --force` installs the newest remaining version (captured); each removed pair is retired | `delete-version` (binding: `api/{namespace}/{extension}/delete` with a body) | `delete` |
| Remove an extension (`ovsx unpublish` with no `-v`) | Namespace and extension | Every package leaves and is retired; the query answers nothing for the name; the `Package` row and its UUID stay | `delete-package` (binding: the same route with `allVersions=true`) | `delete` |
| Declare a namespace verified, or withdraw it | Namespace | `verified` in `api/{namespace}` and in extension metadata turns true or false; ovsx prints "(verified)" and "verified publisher" (captured) | `configure` | admin role |

`delete-version`'s retirement granularity is the handler's: it retires each `(version, target)` pair
it removed, not the whole version, which the kind table allows ("Granularity is the handler's") and
which the reference's per-target removal requires. The verified declaration is a `configure`
operation whose `Apply` is this handler's, changing the repository-level document's verified set in
one snapshot; no repository-scoped token can perform it (`auth.md` AC30).

### Trusted publishing is a binding onto the OIDC exchange

ovsx 1.2.0 can publish from CI with no stored token by exchanging the CI provider's OIDC identity
token at the reference's `api/-/trusted-publishing/token`. The exchange is
`credential-management.md`'s (`POST /api/v1/tokens/exchange`, its "OIDC exchange": a robot's trust
policy names the issuer and claim constraints, and the minted token is an ordinary token owned by
that robot, scoped within its grants and expiring within `credentials.exchange_token_lifetime`; its
AC13), and that spec names this format as one of its two first consumers, written as a format-side
binding. Per the resolved trusted-publishing decision below (was Q19), the handler serves
`api/-/trusted-publishing/token` as a binding that translates the client's request into that
exchange and returns the minted token in the shape ovsx expects, and nothing else, so there is one
exchange and two ways in; the token it returns is then presented on the write routes like any other
(Design, "Authentication"). The route's exact request and response shape was not captured by the
authoring pass, so it is grounded in captured ovsx 1.2.0 traffic against the pinned reference server
when the binding is written, before its case is expected to pass, never in the reference's
documentation. The route answers `405` against a remote or virtual repository.

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

`auth.md` now carries this format's client row (`ovsx` / VS Code-family editors) and the three
forms this section needs in its presentation-form table: the `token` query parameter and the
`X-OpenVSX-Token` header, route-scoped to this format's four write routes, and the read token segment
`-/t/{token}/`, route-scoped to its read routes and honoured only for a `pull`-only token; its AC31
asserts every one of them, with redaction (its AC7) and the plaintext refusal (its AC27) (the
resolved credential-form and private-read decisions below, whose sibling consequence is thereby
met). Where a route-scoped form sits is declared by this handler beside its route-to-scope mapping
and extracted by the shared layer, so the handler never reads a credential (`auth.md`, "Where the
credential sits is declared, never guessed"; the declaration's home is the interface re-open input
`format-handler-interface.md` records for route-scoped and URL-borne credentials). Every check below
runs in the shared authentication layer.

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
- **A query-string token on any other route is an authentication failure, never anonymous, and
  redacted** (`auth.md` AC31; its resolved off-route decision, was Q24, which chose this over serving
  such a request credential-less): a token pasted into a read URL answers `401`, grants nothing and is
  never logged.

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
inside each publish, the signing runtime produces a pure Ed25519 signature over the committed
package blob with the repository's current key and stores it as a `Signature` record; the `.sigzip`
is assembled from it in the reference's layout (entries in the order `.signature.sig`,
`.signature.manifest`, `.signature.p7s`, deterministic zip metadata) when a client asks for it.
Public keys are served at `api/-/public-key/{id}` where `{id}` is the lowercase hex SHA-256 of the
key's DER `SubjectPublicKeyInfo`, so the route is content-addressed; retired keys stay served for as
long as a package they signed is. The gallery advertises the signature and public-key assets as the
reference does: VSCodium and code-server never fetch them (captured), and Microsoft VS Code refuses
Open VSX signatures and unsigned packages alike (captured), so withholding them from the gallery
would change nothing for any client, while the `/api` surface's `files.signature` and
`files.publicKey` are what `ovsx verify` needs.

**What the signing service must provide**, stated so the dependency on
`docs/internal/plans/foundation/signing-service.md` cannot be lost; that spec lists these as
`openvsx.md`'s five items (its "Who depends on this" table, "Signed per-version document") and each
is mapped onto its contract below:

1. **Pure Ed25519 (RFC 8032) detached signatures over a stored blob**, not Ed25519ph, which no
   verifier of this ecosystem accepts (the reference's source comment on `createSignatureFile`):
   the profile "Open VSX pure Ed25519, not Ed25519ph" with the Ed25519 raw envelope codec in
   `internal/signing/raw` (its "Key custody"). A key requested on the `pkcs11` backend, which offers
   no Ed25519, is refused at key creation naming the ceiling (its AC13).
2. **Bounded memory for a large package.** Pure Ed25519 hashes the message twice, and the reference
   needed a 2 GB heap to sign a 300 MB package until it read the package once into one array (its
   issue #1450, cited in the same comment). `SignBlob(profile, digest)` holds peak allocation to the
   blob's size plus a constant, reading the committed CAS blob once into a buffer sized from its
   known length, and refuses a package above `signing.max_blob_sign_size` (default 1 GiB, above this
   format's 262,144,000-byte default maximum) at publish; its benchmark gate is this format's
   requirement stated from that side (`signing-service.md`, "Signing stored blobs, and the memory
   bound", AC18), and AC28 here holds the publish end to end.
3. **Signing inside the triggering write**, so the signature exists in the same transaction as the
   package: the handler declares an `Indexer` whose profile names no generated document and one
   signing profile, and the runtime, run by the shared write path's pre-commit hook, calls
   `SignBlob` for each newly committed package (`signing-service.md` AC1, AC24). Every signature is
   self-checked through `artifact-verification.md`'s `raw` entry before the write commits (its
   AC17), and neither the handler nor its generator package can reach a key (its AC2).
4. **A key per repository, rotatable, with every public key retrievable by its digest** for as long
   as a retained snapshot references a signature it made: the `by-digest` rotation profile, whose
   activation signs new packages with the new key while every existing signature keeps its key
   (`signing-service.md`, "Rotation profiles", AC7), each step a `configure` operation on the
   signing-key routes (`management-api.md` AC32), creating no snapshot (`signing-service.md` AC8).
   The key's public form is the SPKI PEM `api/-/public-key/{id}` serves, byte-checked in
   `signing-service.md` AC12.
5. **Nothing repository-wide**: this format has no generated index, so the service's index half is
   not used (`signing-service.md` AC24's second half: signing with no generated document).

**Proxied packages keep the upstream's signature**, per the resolved proxied-signature decision
below: the remote's trust set pins the upstream's public keys as `raw-keys` entries by digest,
fetched at configuration from the upstream's `publicKey` URLs and on first sight of a new key
identifier, each new key creating a trust-set revision with a recorded divergence
(`artifact-verification.md`, "Trust sets", AC16, AC23); that spec's `raw` scheme verifies each
fetched package's `.signature.sig` against the pinned key its metadata names, from the committed CAS
blob after the verified commit and never from bytes in flight (`proxy-cache.md`, "Verdicts come
after the commit and never gate it"), and its verdict (`verified` with that key's identity,
`failed`, or `absent`) is what `supply-chain-policy.md` AC15's rule consumes, recorded and not
enforced (`artifact-verification.md` AC21). The handler reaches the entry only through the
`Verifier` consumer interface in `Deps` (`format-handler-interface.md` AC15). The registry serves the
upstream's `.sigzip` bytes and the upstream key under its digest, so `ovsx verify` through the cache
proves the package is the one the upstream signed; no `Signature` record ever names a remote
(`signing-service.md` AC20). A virtual repository serves each package with its supplying member's
signature. The conformance matrix's verification column needs a passing hosted and a passing
proxied verification case for Open VSX (`artifact-verification.md` AC24), which AC14 and AC23
carry.

**The registry is the only integrity check an editor has** (Design, "Nothing verifies"), so the
shared read path verifies every package's digest while streaming it to a client and aborts with an
operator alert on a mismatch (`storage-and-gc.md` AC21), which is what makes a storage alteration
visible although no editor would notice it.

**Advisory coverage exists.** OSV carries a `VSCode` ecosystem (Context), so coordinate-level rules
are accepted at configuration (`supply-chain-policy.md` AC11 refuses only uncovered ecosystems).
`supply-chain-policy.md`'s coverage table carries the row this spec asked for, per the resolved
OSV-mapping decision below: `namespace.name` matched case-insensitively across both ecosystem
spellings, semantic-version ordering, purl type `vscode-extension`, and every entry a security signal
under the shared rule (its AC17). This spec adopted every `VSCode` variant (the Marketplace's
`VSCode` and any `VSCode:{url}`), because a namespace on one registry may be the same publisher or a
squatter of it on another and the safe error is over-refusal; that table names the two spellings
OSV holds today, which is the same set until a third registry URL appears, and the difference is
reported as a sibling consequence rather than decided here. The purl is
`pkg:vscode-extension/{namespace}/{extension}@{version}` with the `platform` qualifier. Every
advisory today is a `MAL-` entry, so the feed channel of the shared security-signal rule condemns
Open VSX coordinates now. The byte-level cataloguer sees a zip holding a Node package tree; licence
and component rules depend on its coverage of that layout, which `supply-chain-policy.md` measures
in its own Phase 1 and refuses at configuration where it has none.

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines, the
handler renders it per the resolved refusal-rendering decision below:

- **On every route of the refused package** (the `.vsix`, every extracted asset, the `.sigzip`, the
  `.sha256`, on both surfaces): `403` with `{"error": "refused by policy {policy}, rule {rule}:
  {detail}"}` (or naming the security signal), written through the shared refusal writer
  `WriteRefusal`, never a status line of the handler's own (`format-handler-interface.md` AC14), so
  on the HTTP/1.1 the main listener speaks by default (`deployment.md`'s `server.http2: false`) the
  status line carries the phrase `Refused by policy: {condition}`, the condition being the advisory
  or signal id, the licence, `stale advisory data` or `unscanned` (`supply-chain-policy.md`,
  "Rendering a refusal", its resolved refusal-status-line decision, was Q10 there, AC18). ovsx prints
  the reason phrase on a download and the body on metadata (captured shapes); an editor fails at its
  first manifest request with "Server returned 403", before any package byte, with no request to any
  other host because every URL it holds names this registry.
- **An extension condemned as a whole** (every version refused: a malware advisory or upstream
  signal with no fixed version, or a rule naming the extension) is listed in the repository's
  control document `vscode/control.json`, which the handler renders from what the **advisory
  reader** in `Deps` returns for the repository's extensions (the advisory records and standing
  condemnations, with their sources; `supply-chain-policy.md`, "A handler may read advisories, never
  evaluate them", AC19, which names this document as one of the reader's four consumers), as `{"malicious": ["{namespace}.{extension}", ...],
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
(`updateControlCache`). `supply-chain-policy.md`'s table "When a refusal binds, per format" carries
this as the Open VSX row, `holds` by regeneration (its AC20): the editors retry at
`fallbackAssetUri` and follow any `files.download`, so the refusal holds only because every URL is
this registry's (Design, "Serving documents that cannot leave the registry"), the general rule that
table states for every proxied format. Each refusal writes one record, readable at
`GET /api/v1/repositories/{name}/refusals` (`supply-chain-policy.md` AC5).

### Serving documents that cannot leave the registry

Per the resolved regeneration decision below, every document the registry serves is **rendered from
its own records**, on all three paths, and every URL-valued field in it names this registry under the
externally visible base URL that `npm.md` and `composer.md` already require the handler to know
(`deployment.md`'s `server.public_url`, read through `Deps` until the interface re-open settles its
home):
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
pointer freshness record: this format generates no document through the index runtime (its
documents are rendered per request from records), so neither the pointer's `moved_at` nor
`proxy-cache.md`'s cache-scoped record reaches its headers, and consequences Open item 31 recorded
that no pointer-scoped freshness is needed. One constraint crosses from the shared layer:
`signing-service.md` AC11's architecture test holds that no handler package sets `ETag` or
`Last-Modified` or evaluates a conditional request itself, and it is worded for every handler
package, while this format's `ETag`s and `304`s are on rendered documents and stored files that are
not generated documents. The headers here are therefore required to come from a shared helper that
takes a rendered body or a file's digest, the same conditional rule `ServeDocument` applies, rather
than from handler code; that helper, or the test's scope narrowed to generated documents, is
reported as a sibling consequence on `signing-service.md` rather than assumed. What a rollback does
to editors is theirs: an installed newer version stays until a forced install (captured), which the
operator documentation says beside the promotion recipe.

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
| `api/version` (`maxExtensionSize` and the reported version; no name, version or digest of anything the repository holds) | `pull` | descriptor | - |
| `vscode/gallery/extensionquery`, `api/-/search`, `vscode/control.json` (its `malicious` list names extensions) | `pull` | none | - (answers over every name) |
| `api/-/publish`, `api/-/namespace/create` on the ordinary base | `push` | none | - (the name is only in the body) |
| `-/ns/{namespace}/api/-/publish`, `.../api/-/namespace/create`, `api/{namespace}/verify-pat` (either base) | `push` | named | `{namespace}` |
| `api/{namespace}/{extension}/delete` (either base) | `delete` | named | `{namespace}/{extension}` |
| `api/-/trusted-publishing/token` | none | none | - (no registry credential is presented: the OIDC identity token is verified by `credential-management.md`'s exchange, and the minted token carries the robot's grants) |

A path not of one of these shapes makes `Scope(r)` return an error, which denies it as an
unauthorized request (`format-handler-interface.md` AC10). What that gives and costs, applying
`auth.md` rather than re-deciding it:

- **`api/version` is a descriptor** (`auth.md`'s resolved name-free-document decision, was Q23 there),
  held to that definition by the sentinel test `format-handler-interface.md` AC12 and `auth.md` AC32
  require on every descriptor route; a patterned `pull` reads it. **A patterned `pull` still cannot
  drive an editor**, because resolution starts at the query, whose object is none, and the descriptor
  kind does not change that, since an enumerating answer is never a descriptor: the editor reports
  "not found", the consequence `rpm.md` and `hackage.md` record for their enumerating indexes. A
  patterned `pull` reads in-pattern extensions with `ovsx get`, whose metadata and file
  routes are named.
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
one extension's metadata, beside the transport validation `upstream-adapters.md` runs on every remote
create and update (its "Configuration-time validation", AC23; an invalid upstream is refused
`upstream-invalid`). The transport is its `https` adapter under the upstream's allowlist and
credential role; the protocol half (which documents to fetch, how records are parsed, what is
rendered) stays in this handler. An upstream credential, where one is needed, is one of the kinds
that adapter accepts (`none` by default; `bearer`, or `path-token` for an upstream that is itself an
instance of this registry), presented by the adapter to the root host only (its AC6); the client's
credential is never forwarded.

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
100 sampled live versions have one), whose 64 hex digits it fetches through the same
fetch-and-cache entry. The package is then fetched from the upstream's file route with that value as
the request's **declared digest** (`proxy-cache.md`, "Completion-only mode and the verifier hook": a
digest obtained through a prior metadata request "is a declared digest like any other", AC20), so the
body is verified while it streams. The upstream's `302` to its storage host
(`openvsx.eclipsecontent.org` for open-vsx.org, captured) is followed inside the adapter only to a
host on the remote's **storage-host allowlist**, entries of the upstream's off-origin allowlist with
role `none` so no credential follows the redirect, defaulting to that one host for an open-vsx.org
upstream and empty otherwise (`upstream-adapters.md` AC6, AC7, AC8); a redirect elsewhere is refused
by the adapter before any connection and answered `502`, and no upstream `Location` ever reaches a
client. The package is committed only if it matches the declared digest, the initiating client's
connection closed short before its final bytes otherwise and coalesced waiters served only from the
CAS after the verified commit, per the settled waiter rule. Where an upstream declares no digest, the
request carries a handler-supplied **verifier** instead, never neither (AC20 there): the VSIX
reader's bounded structural check that the package's identity names the requested coordinate, run
over the complete spooled body before the commit; the first verified fetch then pins the CAS digest
on the `File`, and a refetch after eviction with another digest fails the next fetch's integrity
check. The signature verdict is computed after the commit and never gates it (Design, "Signing,
provenance and policy").

- **Missing extensions and packages are negatively cached** with the short TTL; a `429` or `5xx` is
  never cached as absence (`proxy-cache.md` AC9). The operator's "refresh now",
  `POST /api/v1/repositories/{name}/refresh`, marks every record and negative entry due for
  revalidation (`management-api.md` AC29; `proxy-cache.md` AC24).
- **Upstream UUIDs are kept**, so an editor that installed an extension from open-vsx.org keeps
  updating it through the cache.

**The upstream control document.** Per the resolved control-document decision below, the handler
fetches the remote's configured control-document URL (for an open-vsx.org upstream the
`EclipseFdn/publish-extensions` file VSCodium names, on a second allowlisted host, role `none`)
through fetch-and-cache as mutable metadata, revalidated when the repository's own control document
is requested, which every editor install does (captured); the fetch is the handler's, the transport
the adapter's (`upstream-adapters.md`'s requirements row). Each identifier in its `malicious` list is
an **explicit upstream security signal** for that extension (or, for a bare publisher, every
extension of that namespace) under the shared security-signal rule, the class `proxy-cache.md`'s
event table lists for this document by name; its `deprecated`, `migrateToPreRelease`,
`extensionsEnabledWithPreRelease` and `search` entries are ignored, so no upstream text can make an
editor install a different extension than it asked for.

Upstream removal maps onto `proxy-cache.md`'s event classes ("Upstream removal or replacement"), the
handler classifying and the layer responding, as Open VSX's side of that contract:

| Upstream event, as observed at revalidation or fetch | Class | What this format adds |
|---|---|---|
| A new version or target, or changed descriptive fields (display name, `verified`, `deprecated`) | Ordinary metadata change | Propagated at the next revalidation |
| A `(version, target)` or a whole extension vanishes (an `ovsx unpublish`, an administrator's removal, a namespace rename) | Removal with no signal | Dropped from the served record; cached files keep serving by URL. The wire carries no reason |
| An identifier appears in the upstream control document's `malicious` list | Explicit security signal | The shared security-signal rule condemns the extension, and it enters this repository's control document |
| A package's declared `sha256` changes, or a fetched package fails it or is truncated | Integrity failure at fetch | Nothing committed; a cached copy keeps serving; the operator is alerted with the real reason |
| A fetched package's signature fails against the pinned key | None: a verdict, not an event | Committed with a `failed` verdict, recorded and not enforced; refused at resolution only where a rule requiring `verified` binds (`artifact-verification.md` AC21) |
| A package's metadata names a public key not yet pinned | None: a trust-set change | The key is fetched and pinned as a new trust-set revision with a recorded divergence (`artifact-verification.md` AC16, AC23); a cached package whose metadata later names a different key keeps serving its cached bytes and signature, and the change is recorded as a divergence and alerted |

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
- A virtual repository creates no snapshots, and every write route answers `405` with the
  `repository-type` problem.
- **Nothing is merged ahead of time.** Every virtual document is rendered per request from the
  members' records, so the format declares no `Merge` and no `index.merge` job exists for it
  (`signing-service.md`, "The generator contract": a format whose virtual is a union of listings
  declares no merge), and a member's write is visible in the virtual at the next request.

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
the gallery and control URLs explicitly, and asserts at the network layer. Every client container
reaches only the hostnames its case declares (`conformance-harness.md`'s resolved client-confinement
decision, was Q6 there, AC23); the open-vsx.org stand-in's storage host and control-document host are
`hosts` sub-entries of its `upstreams` entry, resolvable by their declared names inside the client
container (the same criterion). The catalogue counts one ecosystem and no multiplier row.

Five assertion traps are recorded where the cases are written. **An editor's download failure writes
the error body as the package**, so a refusal case asserts the requests and the message, never only
the exit code. **ovsx `get` succeeds on any bytes**, so a download case hashes what it saved.
**Defaults reach open-vsx.org and GitHub**, so every case sets every URL and asserts no request left
the test network; the harness's confinement makes a default that slipped through fail at name
resolution rather than reach the internet. **VSCodium's platform is the container's**, so target cases run on `linux-x64` and
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

### What it needs from Deps

The pinned `Deps` (`format-handler-interface.md`): the CAS, the metadata store at all three levels
with snapshot-pointer resolution, the fetch-and-cache entry point with classification as an argument
and the request shape `proxy-cache.md`'s "Obligation to the handler interface" states (a declared
digest or a verifier; a re-open input), the central authorizer, and the request logger, with the
policy-enforcing resolution calls returning the typed refusal. Beyond the pin, each now specified by
its owner rather than invented here: the `Verifier` consumer interface for the `raw` entry of
`artifact-verification.md` (`format-handler-interface.md` AC15); the advisory reader for the control
document and the refusal writer `WriteRefusal` (`format-handler-interface.md` AC14;
`supply-chain-policy.md` AC19, AC18); `upstream.Options` on fetch-and-cache for the adapter's
allowlist and credential role (`upstream-adapters.md`); the externally visible base URL (`npm.md`'s
and `composer.md`'s requirement, a re-open input); the route-scoped credential declaration for the
`token` parameter, the header and the `-/t/` segment (a re-open input); and, outside `Deps`, the
optional `Indexer` interface through which `signing-service.md`'s runtime signs each hosted package,
and the optional `Operator` interface through which `management-api.md`'s `Submit` reaches
`delete-version`, `delete-package` and `configure` (optional interfaces held apart until the re-open,
`format-handler-interface.md`'s resolved optional-interfaces decision, was Q10 there).

### Capabilities and lifecycle

`Capabilities()` declares proxy support `supported`, reference-implementation availability
`available` (the Eclipse Open VSX server), `Virtual: supported` (Design, "Virtual repositories") and
`Rename: supported`, the four fields `format-handler-interface.md` AC13 names. Rename is supported
because no stored byte names the repository: every URL-valued field is rendered per request from the
externally visible base URL and the repository's current name, a `.sigzip` is assembled from a
signature record and entry digests that name no repository, public keys are addressed by digest, and
the extension and namespace UUIDs are unchanged, so an editor repointed at the new gallery URL keeps
updating its installed extensions. After a rename the repository serves byte-identical packages and
signatures, every rendered URL names the new name, every `SigningKey` and signature record is
unchanged with no re-sign (`signing-service.md` AC29), and the old name answers `not-found`
indistinguishably from a never-existing repository (`repository-lifecycle.md` AC12).
`repository-lifecycle.md` AC12 requires `conformance/openvsx/rename_test.go`, enforced by the
harness's case-set validator (`conformance-harness.md` AC26); AC32 carries it with the real
clients.

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
      and with different bytes; after it is unpublished the pair is refused, through the shared write
      path's check of its core-held `Retirement` record and in the reference's wording, after the
      removal's snapshot is pruned, after a whole-extension removal and after a pointer is moved back
      across the removal, with no retirement state in any package-level document, while another
      target of the same version and a new version publish normally.
- [ ] AC8: No package is executed and no process is started by the registry: an architecture test
      asserts that `internal/format/openvsx` imports no `os/exec`, creates no process and uses no
      cgo; and packages holding a zip bomb, an entry named with `..`, an absolute path, a
      backslash or NUL, a manifest over 1 MiB, an XML external entity, or a `vscode:prepublish`
      script that would create a file are each refused `400` within the request timeout with no
      snapshot and no file created on the server, or stored inert.
- [ ] AC9: The `token` query parameter, `Authorization: Bearer` and `X-OpenVSX-Token` each
      authenticate the same principal on the four write routes; a `token` query parameter on a read
      route is an authentication failure answered `401`, never served as anonymous and never logged; a rejected token answers `401` with "Invalid access token." printed by
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
      `acme/**` reads `api/version`, a descriptor passing the sentinel test, and reads `acme.tool`
      through `ovsx get` and is refused `404` with
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
      `api/-/public-key/{sha256 of the key}`; the signature is a `Signature` record keyed by the
      package digest, absent from every snapshot's content, produced inside the publish by the
      pre-commit hook and assembled on read with no signing operation; `ovsx verify` passes for the
      published package and fails for tampered bytes of the same identity; and after a `by-digest`
      key rotation through the signing-key routes, which creates no snapshot, new packages carry the
      new key and old packages still verify with the old one.
- [ ] AC15: Microsoft VS Code 1.139.1 with `extensions.verifySignature: false` installs extensions
      from a hosted, a proxied and a virtual repository.
- [ ] AC16: A version the shared policy layer refuses answers `403`, written through `WriteRefusal`
      with the status line `Refused by policy: {condition}` over HTTP/1.1, and `{"error": ...}`
      naming the policy on its package, asset, signature and checksum routes on both surfaces, on the
      hosted and the proxied path; ovsx `get` prints that phrase; both
      VSCodium versions fail with "Server returned 403" before any package byte and with no request
      to any other host; every metadata document and query answer still lists the version; an
      extension condemned as a whole appears in `vscode/control.json`, rendered from the advisory
      reader's answer, and both VSCodium versions
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
- [ ] AC21: A stand-in package that fails its declared `.sha256`, is truncated, or after eviction
      arrives with a digest other than the pinned one (for an upstream declaring none, fetched with
      the handler's structural verifier) is never committed or delivered in full to any client
      through this registry, the installing client failing and the real reason recorded observably to
      the operator; a stand-in package whose signature fails against the pinned key is committed with
      a `failed` verdict, installs where no signature rule applies and is refused at resolution once a
      rule requiring `verified` binds; and a verified package's verdict names the pinned key's
      identity.
- [ ] AC22: A stand-in redirect to a host outside the remote's storage-host allowlist answers `502`
      with no connection to that host; the open-vsx.org default allowlist holds exactly the upstream's
      storage host with role `none`, so no upstream credential follows the redirect; the client's
      credential is never forwarded; and a proxied manifest request is
      served from the verified cached package with no request to the upstream's asset routes.
- [ ] AC23: Through a remote repository, `ovsx verify` on a package fetched from the stand-in passes
      against the upstream key served under its digest, and the served `.sigzip` is byte-identical
      to the stand-in's; a package whose metadata names an unpinned key pins it as a new revision of
      the remote's trust set and records a divergence.
- [ ] AC24: An identifier added to the stand-in's control document `malicious` list condemns that
      extension under the shared security-signal rule at the next control-document revalidation,
      the extension then appearing in the repository's `vscode/control.json` with its cached
      references ended and the operator alerted once; and the stand-in's `deprecated`,
      `migrateToPreRelease` and `search` entries never appear in any served document.
- [ ] AC25: A version or target, and a whole extension, vanishing from the stand-in, and a changed
      declared digest, each keep cached files served by URL, change the served record as the
      removal table says, and record a divergence; an ordinary upstream metadata change is propagated
      at the next revalidation; each event produces the `proxy-cache.md` event class the table names
      (its AC13); and a refresh through the management API makes the next request revalidate every
      record and negative entry.
- [ ] AC26: A virtual repository whose members are a hosted repository then an open-vsx.org remote
      resolves each `{namespace}.{extension}` the hosted member holds only from that member on both VSCodium versions
      even when the remote holds a higher version of it or of a case variant; resolves extensions only
      the remote holds from it; answers a UUID criterion only from the supplying member, after which
      the editor's repeat by name installs it; merges search without duplicates; serves every file
      from the supplying member; makes a member's publish visible at the next request with no merge
      job; and answers `405` with the `repository-type` problem to every write route.
- [ ] AC27: A coordinate rule over an OSV-shaped `MAL-` advisory under `VSCode:https://open-vsx.org`
      for `CodeInKlingon.git-worktree-menu` refuses `codeinklingon.git-worktree-menu` requested in
      lowercase on hosted, proxied and virtual repositories; one under `VSCode` refuses the same
      coordinate; a range `introduced: 0, fixed: 2.58.0` refuses 2.57.0 and serves 2.58.0; an
      advisory with a `versions` list refuses exactly those versions and keeps the extension out of
      the control document; and the rule is accepted at configuration.
- [ ] AC28: A query over a hosted repository holding 18,472 extensions, a publish of a package at the
      maximum size including its signature, and a proxied install through a cold cache each
      complete within the budgets recorded in the benchmark suite, the publish's signing within
      `signing-service.md` AC18's bound of the blob's size plus a constant, and CI fails on a
      regression beyond its tolerance.
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
      answers `404`; the same removal submitted through the binding and through the management API's
      `delete-version` and `delete-package` produces byte-identical served documents and snapshot
      deltas; every write route against a remote or virtual repository answers `405`; the verified
      declaration is a `configure` operation refused to every non-admin principal; and a hosted
      publish whose `extensionDependencies` name an extension the repository lacks is accepted.
- [ ] AC31: Replay-match passes against a corpus recorded from open-vsx.org and from the pinned
      reference server image, covering the recorded surface named in Design, with every divergence
      named in Design on the exception list and no `token` parameter, `-/t/` segment or token header
      value in the committed corpus.
- [ ] AC32: `Capabilities()` declares proxy `supported`, reference implementation `available`,
      `Virtual: supported` and `Rename: supported`; after a hosted repository is renamed, both
      VSCodium versions and code-server repointed at the new gallery URL update an extension installed
      before the rename and install another, ovsx 1.2.0 `get` and `verify` pass under the new URL,
      every rendered URL names the new name, packages and signatures are byte-identical with no key
      re-created, and the old name answers `not-found` exactly as a never-existing repository does.
- [ ] AC33: ovsx 1.2.0 in trusted-publishing mode, given an identity token from the harness's fixture
      OIDC issuer matching a robot's trust policy, obtains a token through
      `api/-/trusted-publishing/token` and publishes under the robot's grants, the token expiring
      within `credentials.exchange_token_lifetime`; an identity token matching no trust policy is
      refused with nothing minted; and the route answers `405` against a remote or virtual
      repository.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/openvsx/hosted_install_test.go` (VSCodium 1.99 and 1.135, code-server; fresh directories; request set at the network layer; installed-file byte comparison) |
| AC2 | conformance | `conformance/openvsx/ovsx_publish_get_test.go` (both ovsx versions; query-token publish; `get` with and without `-t`; hash of the saved file; `show`, `list`, `search` on 1.2.0) |
| AC3 | property + conformance | `internal/format/openvsx/query_property_test.go` (generated bodies over every criterion type, flag and paging combination, against the semantics table); `conformance/openvsx/query_replay_test.go` (the recorded 950 and 439 bodies from the editors) |
| AC4 | conformance | `conformance/openvsx/target_platform_test.go` (multi-target, mixed-version and win32-only fixtures on both VSCodium versions and code-server; `ovsx get -t`) |
| AC5 | conformance | `conformance/openvsx/prerelease_update_test.go` (both VSCodium versions; `--pre-release`, `@version`, `--update-extensions` after a publish) |
| AC6 | integration + conformance | `internal/format/openvsx/publish_validation_test.go` (each refusal, no snapshot, size bound while streaming chunked bodies); `conformance/openvsx/ovsx_refusals_test.go` (both ovsx versions; printed errors; `--skip-duplicate` on duplicate and on retired pairs) |
| AC7 | integration | `internal/format/openvsx/retirement_test.go` (duplicate with same and different bytes, pruned snapshot under an injected clock, whole-extension removal, backwards repoint, other target and new version, no retirement state in any document; the core check is `management-api.md` AC12's) |
| AC8 | architecture test + integration | `internal/format/openvsx/arch_test.go` (import, process and cgo audit); `internal/format/openvsx/hostile_vsix_test.go` (bomb, path, size, XXE and prepublish-script cases; bounded time; no file created; no snapshot) |
| AC9 | conformance + integration | `conformance/openvsx/write_credentials_test.go` (both ovsx versions with the query form; Bearer and header forms by `curl`; rejected token; off-route query token `401`; plaintext refusal; `unpublish` proceeding); `internal/auth/credential_form_test.go` (the forms and the off-route failure, `auth.md` AC31); `internal/auth/leak_test.go` (query-string token absent from logs, traces, metrics and bodies after real publishes, `auth.md` AC7) |
| AC10 | conformance + integration | `conformance/openvsx/private_read_test.go` (both VSCodium versions, code-server and `ovsx get` through `-/t/`; prefix on every URL; cache headers; challenge equality; push-bearing token refused); `internal/auth/leak_test.go` (path-segment token case) |
| AC11 | conformance + unit | `conformance/openvsx/auth_pattern_test.go` (the pattern-refusal case `auth.md` AC8 and `format-handler-interface.md` AC7 require, in both modes; patterned credentials through the `credentials` key; namespace-bound publishes, `verify-pat`, `create-namespace`, patterned `get`, `api/version` read and query refusal); `internal/format/openvsx/scope_object_test.go` (the object table per route and the sentinel test on `api/version` through the shared helper in `internal/format/scope_test.go`, `format-handler-interface.md` AC12, `auth.md` AC32) |
| AC12 | integration + conformance | `internal/format/openvsx/verified_test.go` (declaration, withdrawal, admin-only, remote passthrough); `conformance/openvsx/verified_display_test.go` (ovsx 1.2.0 output) |
| AC13 | conformance + integration | `conformance/openvsx/names_test.go` (mixed-case publish; lowercase and uppercase installs on both VSCodium versions; `ovsx get`); `internal/format/openvsx/name_uniqueness_test.go` (case-folded `409`; pattern match on the lowercased object) |
| AC14 | integration + conformance | `internal/format/openvsx/sigzip_test.go` (layout, deterministic assembly from the record, raw Ed25519 verification, key digest route, rotation); `internal/signing/rotation_profiles_test.go` (the `by-digest` row with `ovsx verify`, `signing-service.md` AC7); `internal/model/signature_record_test.go` (absent from snapshots, `data-model.md` AC37); `conformance/openvsx/ovsx_verify_test.go` (genuine and tampered packages through ovsx 1.2.0) |
| AC15 | conformance | `conformance/openvsx/vscode_microsoft_test.go` (VS Code server 1.139.1 with the machine setting; hosted, proxied and virtual installs) |
| AC16 | conformance + integration | `conformance/openvsx/policy_test.go` (hosted and proxied; rules and advisories through the `policies` and `advisories` keys, admitted because the Open VSX binding row is `holds`, `conformance-harness.md` AC26; ovsx and both VSCodium versions; the phrase in ovsx's output; network-layer assertion; listing kept; control-document refusal for a whole-extension condemnation and absence for a version-level one); `internal/format/openvsx/policy_publish_test.go` (byte-dependent refusal at publish); `internal/format/refusal_writer_test.go` and `internal/policy/advisory_reader_test.go` (the writer and the reader, shared with `supply-chain-policy.md` AC18, AC19) |
| AC17 | property + conformance | `internal/format/openvsx/served_hosts_test.go` (every served document on all three paths scanned for foreign hosts); `conformance/openvsx/fallback_containment_test.go` (primary asset `403`, `404`, `500` and wrong bytes; network-layer assertion on both VSCodium versions; the foreign-fallback control case) |
| AC18 | conformance + integration | `conformance/openvsx/headers_test.go` (`ETag`, `Cache-Control`, `304`, set by the shared helper, never the handler); `conformance/openvsx/rollback_test.go` (rollback through the management surface's pointer routes from the case `script`; query, `--update-extensions` and `--force` on both VSCodium versions) |
| AC19 | conformance + integration | `conformance/openvsx/proxied_test.go` (stand-in serving recorded open-vsx.org answers and a storage-host redirect to a declared `hosts` stand-in; both VSCodium versions, code-server, both ovsx versions; fresh containers; UUID continuity); `internal/format/openvsx/proxied_render_test.go` (regenerated documents differ from the stand-in's only in the named fields) |
| AC20 | conformance + integration | `conformance/openvsx/proxied_ttl_test.go` (mutating stand-in; installs before and after the TTL); `internal/format/openvsx/proxied_negative_test.go` (negative caching, throttling responses) |
| AC21 | integration + conformance | `internal/format/openvsx/proxied_integrity_test.go` (checksum mismatch, truncation, pinned-digest refetch through the structural verifier; CAS and reference assertions; operator record; bad signature committed with a `failed` verdict and refused only under a signature rule; verdict identity); `internal/verify/raw/ed25519_test.go` (shared with `artifact-verification.md` AC16); `conformance/openvsx/proxied_integrity_test.go` (a tampered package failing through both VSCodium versions) |
| AC22 | integration | `internal/format/openvsx/storage_allowlist_test.go` (allowlisted and refused redirect hosts, the open-vsx.org default with role `none`, credential non-forwarding, manifest from the cached package, asserted at the network layer; the adapter half is `upstream-adapters.md` AC6 to AC8) |
| AC23 | conformance + integration | `conformance/openvsx/proxied_verify_test.go` (ovsx 1.2.0 `verify` through the remote, the pinned keys provisioned through the `trust` key, `artifact-verification.md` AC25); `internal/format/openvsx/key_pinning_test.go` (byte-identical `.sigzip`, unpinned key pinned as a trust-set revision with a divergence) |
| AC24 | integration + conformance | `internal/format/openvsx/upstream_control_test.go` (malicious entry to condemnation, purge and single alert; ignored entry kinds); `conformance/openvsx/upstream_control_test.go` (the served control document refusing the install on both VSCodium versions) |
| AC25 | integration | `internal/format/openvsx/removal_test.go` (stand-in presenting each event, asserting the class; refresh; the shared-layer half is `proxy-cache.md` AC13's and AC24's) |
| AC26 | conformance | `conformance/openvsx/virtual_test.go` (hosted then remote members; higher upstream version and a case variant of the private name; UUID criterion and repeat by name; search merge; a member publish visible at the next request; both VSCodium versions; provenance from the network layer; `405`) |
| AC27 | integration | `internal/policy/openvsx_osv_match_test.go` (both ecosystem variants, case-insensitive names, `fixed` range, `versions` list, control-document exclusion) |
| AC28 | benchmark | `internal/format/openvsx/bench_test.go` (a generated 18,472-extension repository; query, maximum-size publish with signing and its peak memory, cold proxied install; budgets and tolerance in the benchmark gate, a `// gate:` comment under `scripts/bench-gate.sh`); the `SignBlob` allocation bound is `signing-service.md` AC18's |
| AC29 | integration | `internal/format/openvsx/concurrent_publish_test.go` (two writers per case, publish racing unpublish, fault injection at each write boundary, final documents and snapshot contents asserted) |
| AC30 | conformance + integration | `conformance/openvsx/unpublish_test.go` (ovsx 1.2.0 through the management binding; version, target and extension removal; the verified declaration from the case `script`; editor effects; remote and virtual `405`); `internal/format/openvsx/unpublish_test.go` (one snapshot per operation, `push`-only refusal, absent target, admin-only `configure`, unresolved dependency accepted); the binding-equivalence table test of `management-api.md` AC8 enumerating this handler's `Bindings()` |
| AC31 | conformance | `conformance/openvsx/replay_test.go` |
| AC32 | unit + conformance | `internal/format/capabilities_test.go` (this handler's four declarations, `format-handler-interface.md` AC13); `conformance/openvsx/rename_test.go` (editors and ovsx against the renamed repository, rendered URLs, byte comparison, old name `not-found`; required by `repository-lifecycle.md` AC12) |
| AC33 | conformance + integration | `conformance/openvsx/trusted_publishing_test.go` (fixture OIDC issuer in a container, ovsx 1.2.0 minting through the binding and publishing; no-match refusal); `internal/format/openvsx/oidc_binding_test.go` (the binding translates into `POST /api/v1/tokens/exchange` and nothing else; `405` on remote and virtual) |

The case set needs only keys already in the harness's closed `setup` vocabulary (its resolved
closed-vocabulary decision, was Q4): `repositories` with their visibility and type, including a
virtual repository's member order and a remote's storage-host allowlist and control-document URL,
and the `signing` sub-entry of a hosted repository; `credentials`, patterned, `pull`-only and
robot-owned ones included (`conformance-harness.md` AC25), the robot carrying a trust policy for
AC33; `trust` for a remote's pinned upstream keys (`artifact-verification.md` AC25); an `upstreams`
stand-in (a fixture server serving recorded open-vsx.org answers, its storage-host redirect and a
control document on declared `hosts` stand-ins, and the tampered, truncated, badly signed and
vanishing variants); `state` for pre-published packages, retired pairs (`management-api.md`,
"Retirement is core-held": retirements are seedable) and verified namespaces, where a seeded hosted
package comes out signed by the write-path hook exactly as a publish would, with no `.sigzip` seeded
(`signing-service.md` AC21; `conformance-harness.md` AC24); and `policies` and `advisories` for AC16
and AC27. The fixture OIDC issuer AC33 needs is a case container, as `pypi.md`'s trusted-publishing
case uses. The runner-enforced obligations, both modes and the unauthenticated, unauthorized and
pattern-refusal cases in each, a `script` case per declared kind and the shared rename case
(`conformance-harness.md` AC26), apply from the sibling specs and are not restated per criterion
here.

## Implementation Phases

### Phase 1: Hosted core
- Waits on `docs/internal/plans/foundation/signing-service.md` reaching `planned` (Blocking
  preconditions), its Phase 1 built (the runtime and the `Indexer` contract) and its Phase 2 (the
  Ed25519 raw codec, `SignBlob` under its memory bound and the `by-digest` rotation profile)
- The format-first mount, the VSIX reader and its architecture test, the `/api` and gallery read
  surfaces with the query semantics, target platforms, publish with its validation, the `.sha256` and
  the signature record through the pre-commit hook, the assembled `.sigzip`, duplicate handling and
  the core-held retirement check in the reference's wording, names, the write credential forms and
  the read segment through the shared verifier, the namespace-bound base, `verify-pat` and
  `create-namespace`, per-route addressed objects with the descriptor sentinel test, freshness
  headers through the shared helper, the `403` policy rendering through `WriteRefusal` and the
  control document through the advisory reader, `Capabilities()` and the rename case (AC32), the
  benchmarks

### Phase 2: Management bindings
- Waits on `docs/internal/plans/foundation/management-api.md` reaching `planned` (its Phase 3:
  `Operator` and bindings) and, for the trusted-publishing binding, on
  `credential-management.md`'s Phase 3 (the OIDC exchange)
- The `Operator` interface with `delete-version`, `delete-package` and `configure`, `ovsx unpublish`
  as a binding onto the first two, the verified-namespace declaration, the trusted-publishing binding
  with its wire grounded by a capture first (AC33), and the write boundaries exercised end to end
  under concurrency and fault injection

### Phase 3: Proxied path
- Waits on `artifact-verification.md` (its `raw` entry, built here with this format in its Phase 4 at
  charter step 11), `proxy-cache.md` and `upstream-adapters.md` reaching `planned` (Blocking
  preconditions)
- Upstream validation, per-extension records and their revalidation, regenerated documents, forwarded
  search, package fetch through the storage-host allowlist with a declared digest or the structural
  verifier, signature verdicts after the commit, key pinning in the trust set, the upstream control
  document as a security signal, negative caching and refresh, the removal event classes, `405` on
  remote writes

### Phase 4: Virtual repositories
- Per-extension member-ordered resolution rendered per request, UUID resolution in the supplying
  member, merged search, the merged control document, `405` on virtual writes

### Phase 5: Corpus and gate
- Recording session across the named surface (after the harness redaction gate) against
  open-vsx.org and the pinned reference server, replay-match, the exception-list entries named in
  Design, the matrix rows for the deliberately unimplemented surface, and the matrix's verification
  column (`artifact-verification.md` AC24)

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. The eighteen questions the authoring draft raised, and a nineteenth the 2026-09-28
reconciliation raised on Opus (trusted publishing, once the exchange it waited on existed), were each
written in the template's decision shape and then adopted at their own recommendation under the
owner's standing delegation of 2026-09-26, so the loop can continue; each is recorded below as adopted rather than decided, folded
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

Accepted cost: the `auth.md` client-table row and verifier amendment, now made (its client table's
`ovsx` row, its presentation-form table's `X-OpenVSX-Token` and `token` query parameter rows, route-
scoped to the four write routes, and AC31), and redaction of query strings. `auth.md`'s resolved
off-route decision (was Q24 there) settled the one point this record left open, in the direction
this record did not take: a query-string token on any other route is an authentication failure,
never served credential-less.

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

Accepted cost: the verifier amendment, now made (`auth.md`'s read token segment row, honoured only for
a `pull`-only token, and AC31), the operator guidance on rotation, and redaction of the path
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

Accepted cost: the requirements on `signing-service.md`, including bounded-memory pure Ed25519, now
met: the Open VSX pure-Ed25519 profile, `SignBlob` under its one-copy bound (its AC18) and the
`by-digest` rotation profile. The signature is a `Signature` record rather than a stored `.sigzip`
file, per that spec's resolved signature-placement decision (was Q2 there), which changes where the
bytes live and not what a client downloads.

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

Accepted cost: the verdict requirement on `artifact-verification.md`, now met by its `raw` scheme and
pinned `raw-keys` trust-set entries (its AC16, AC23), and the key-divergence alerts. That spec records
this verdict as recorded, not enforced (its AC21), so a bad upstream signature commits with a `failed`
verdict and refuses only where a rule requiring `verified` binds, which AC21 here now states.

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

Accepted cost: the requirements on `proxy-cache.md` and `upstream-adapters.md`, now met: a digest from
a prior metadata request is a declared digest (`proxy-cache.md` AC20), an upstream declaring none is
fetched with the handler's structural verifier, and the storage host is an off-origin allowlist entry
with role `none` (`upstream-adapters.md` AC7).

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

Accepted cost: the dependency on `management-api.md`, whose reconciliation table now carries the
binding onto `delete-version` and `delete-package`.

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

Accepted cost: the matcher requirement on `supply-chain-policy.md`, now met by its coverage row (its
AC17), which names the two ecosystem spellings OSV holds today; "every variant" and "both spellings"
are the same set until a third appears, reported as a sibling consequence.

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

### Resolved: trusted publishing (was Q19, raised and adopted 2026-09-28)

**Adopted 2026-09-28 under the owner's standing delegation**, during the reconciliation with the
foundation wave, on Opus. Option A: ovsx 1.2.0's `api/-/trusted-publishing/token` is served as a
binding onto `credential-management.md`'s OIDC exchange, its wire grounded in a capture before its
case is expected to pass (Scope; Design, "Trusted publishing is a binding onto the OIDC exchange";
AC33; Phase 2).

The question: the authoring draft put trusted publishing out of scope because issuing credentials
"belongs to the token surface `auth.md` places in `foundation/credential-management.md` (owed), not to
a format". That spec now exists, builds the exchange in its Phase 3, before this handler, and names
this format as one of its two first consumers, "whose clients call a format-shaped route that binds
onto this exchange" (consequences item credential-management 12). The reason for the exclusion is
gone, so the question is whether to serve the route.

**Recommendation:** A. The exchange is built anyway, `pypi.md` binds onto it the same way (its AC19),
and a binding adds no credential logic to the handler; the only cost is the capture the authoring
pass did not make.

| Option | You get | It costs |
|---|---|---|
| **A. Bind the route onto the exchange, grounded by capture** | ovsx 1.2.0 publishes from CI with no stored secret; one exchange, two ways in | A capture of ovsx 1.2.0's exchange before the binding is written, since the authoring pass recorded none |
| **B. Keep it out of scope** | Nothing to capture | CI publishers keep a long-lived token in their secrets, for no remaining reason |
| **C. Serve the reference's exchange semantics in the handler** | No dependency on `credential-management.md` | A second credential issuer inside a handler, which `auth.md`'s nothing-is-invented posture and `credential-management.md`'s boundary both forbid |

**Why this is yours:** it widens the format's scope and adds a credential-minting route under its
mount.

Accepted cost: the capture, recorded as Phase 2's first step; C lost on the boundary, B because its
reason expired.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | 05cf090 | authoring pass: grounded first draft, not a review | Grounded four ways: captured traffic from ovsx 0.10.12 and 1.2.0, VSCodium 1.99.32846 and 1.135.06055, code-server 4.139.1 and Microsoft VS Code server 1.139.1, each pinned, on a dedicated Podman network against a logging, rule-injecting stub (the query-string token on every write of both ovsx versions whatever version the registry reports, chunked publish bodies, the `api/version` probe and the client-side unpublish floor, the `--skip-duplicate` string match, ovsx following foreign download URLs and redirects and printing only the reason phrase on downloads, the gallery query bodies with flags 950 and 439 by name and UUID, lowercased identifiers, target selection preferring the newest version, the win32-only refusal, pre-release and pinned installs, `--update-extensions` moving forward only and `--force` applying a rollback, the editor falling back to `fallbackAssetUri` on another host, a tampered package installed unverified by VSCodium and code-server, Microsoft VS Code refusing Open VSX-signed and unsigned packages unless `extensions.verifySignature` is off, userinfo ignored and a Basic challenge read as not found, a refused package written out as a corrupt zip after six requests, a refused manifest shown as `Server returned 403`, and the control document's `malicious` list refusing an install and its dependents); the eclipse/openvsx server and CLI sources and VS Code's gallery client at three versions; the live open-vsx.org (version report, headers and ignored conditional requests, CDN redirects, 100 of 100 sampled versions with `sha256` and `signature`, a raw Ed25519 signature over the whole package verified with openssl, eleven targets for one extension, case-insensitive lookup, the GitHub control document with 948 malicious entries); and OSV (a `VSCode` ecosystem with the `VSCode:https://open-vsx.org` variant, 21 `MAL-` advisories, case-sensitive name matching) and the `vscode-extension` purl. Design built from that: the wire table; seven decisive client behaviours; the shared-model mapping with targets as files of one version; publish as a client-native write with its write-boundary declaration and the reference's duplicate wording; unpublish and the verified declaration as management bindings; the full query semantics with the overloaded type 8 and per-target latest-only; names case-preserved and folded; write credentials in the query string and header forms; `pull`-only path tokens for private reads; namespace ownership as `{namespace}/**` patterns with a namespace-bound publish base; `verified` by declaration; hosted `.sigzip` signing through the shared service with its requirements, proxied signatures verified and relayed, OSV matching across variants; `403` with reason phrases, whole-extension condemnations in a registry-served control document, no elision; every served document regenerated; ETag-only freshness; a non-executing, bounded VSIX reader; per-route addressed objects; the proxied path with declared-digest verification, a storage-host allowlist, assets from the verified package and the upstream control document as a security signal, with Open VSX's removal-table rows; per-extension virtual resolution. Eighteen questions adopted under the standing delegation: write credential forms and the reported version (AC9), path-token private reads (AC10), namespaces as pattern scopes (AC11), `verified` by declaration (AC12), names (AC13), targets as files (AC4, AC7), query semantics (AC3), hosted signing (AC14), relayed proxied signatures (AC21, AC23), refusal rendering (AC16), regeneration (AC17, AC19), proxied fetch and integrity (AC21, AC22), the upstream control document (AC24), virtual repositories (AC26), unpublish as a binding (AC30), unresolved dependencies accepted (AC30), OSV matching (AC27), open-vsx.org user-configured. Thirty-one criteria, each with a Test Plan row. Sibling consequences recorded in the authoring report, not applied here. Stays draft; awaits an independent review. |
| 2026-09-28 | 20ff418 | cross-spec reconciliation of the Wave 1 folds and the foundation wave, on Opus. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` naming this file verified against the current text of its source spec before applying: auth reconciliation items 1 and 4 (an off-route query token is an authentication failure, never anonymous, under `auth.md` was-Q24; the forms and the client row are in `auth.md` AC31 and its tables; AC9); credential-management item 12 (trusted publishing homed in the OIDC exchange: adopted Q19, a binding, new AC33); format-management item 11 and management-api items 11 and 12 (retirement core-held, rendered in the reference's wording; kinds `delete-version`, `delete-package`, `configure` with the `ovsx unpublish` binding and `Operator`; AC7, AC30); signing-service item 11 (no index half, `Indexer` with no document keys, `SignBlob` under AC18's bound, signature records assembled into the `.sigzip`, `by-digest` profile, the five items mapped onto the contract; AC14, AC28); upstream-adapters item 12 (`https` adapter, storage host as an allowlist entry with role `none`, control-document fetch the handler's, pinned keys the trust set; AC22); proxy-cache reconciliation item 4 (the prior-metadata digest is a declared digest, AC20 there; the precondition discharged; a structural verifier where no digest is declared); artifact-verification (the `raw` entry and key pinning, AC16 and AC23 there; its AC21 records Open VSX verdicts as recorded, not enforced, so AC21 here no longer refuses the commit on a bad signature); supply-chain (the `holds` row, the `VSCode` coverage row, `WriteRefusal` and the fixed phrase shape, the advisory reader for the control document; AC16); auth was-Q23 (`api/version` a descriptor; AC11); proxy-cache event classes and refresh (AC25); conformance-harness client confinement, `hosts` stand-ins, `trust` key and seed-path signing; storage-and-gc AC21 read-path verification cited; repository-lifecycle AC12 and FHI AC13 (Capabilities and lifecycle section, new AC32); async-operations (asks nothing, confirmed, queue core at step 4b). Adopted Q19 (trusted publishing), `fable_recheck` extended. Found and reported rather than assumed: `signing-service.md` AC11's architecture test, worded for every handler package, forbids the `ETag` and `304` this format sets on per-request-rendered documents and files that are not generated documents; `supply-chain-policy.md`'s coverage row names two `VSCode` spellings where this spec adopted every variant; the auth-table and presentation forms are in place. Thirty-three criteria, each with a Test Plan row. `node scripts/check-spec.js` reports no failure in this file. Stays draft; awaits an independent review. |
