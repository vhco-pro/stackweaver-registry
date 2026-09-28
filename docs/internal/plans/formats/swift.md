---
status: draft
status_description: "Reconciled 2026-09-28 at fe2a39f with the foundation wave on Opus (not a review), this spec's first reconciliation: SE-0391 validity and trust are artifact-verification's CMS entry Swift profile reached through Deps' Verifier, trust from the repository's x509-roots trust set as a publisher verdict (AC14); unavailability, restore, deletion and the first-claim URL rebind are management-api's withdraw, restore, delete-version and rebind kinds (push on the bound identity and delete on the displaced one, as adopted here), with core-held Retirement refused centrally and rendered as this wire's 409 (AC3, AC7, AC9); Q11 adopted, making login and availability pull descriptors under auth's Q23 and revising Q7 (AC12); the Bearer challenge is auth's per-format declaration with no amendment needed (AC10); refusals through WriteRefusal (AC13); the proxied path on the https adapter with the presigned store allowlisted, pagination as the handler's derivation, completion-only manifests with a swift-tools-version verifier, cache-scoped Last-Modified, and the Content-Version check moved to the first response per upstream-adapters AC23 (AC16 to AC18, AC21); removal rows by proxy-cache event class, the checksum change now revision-bound rather than an explicit signal (AC20); Capabilities and the rename case (AC25). Earlier: authored 2026-09-26 from captures of SwiftPM 5.10.1 and 6.4.0 (6.1.3 corroborating); ten questions adopted under the standing delegation, eleven now; none open. Awaits a /spec review pass."
description: "Spec for the Swift package registry format (SE-0292): the per-package release list, release metadata, manifests with their version-specific alternates, source archives, the identifiers lookup that bridges Git dependencies, and the multipart publish with SE-0391 publisher signatures, hosted and proxied, with SwiftPM 5.10 and 6.4 as the conformance oracles."
author: michielvha
goal: "Serve Swift teams a private package registry that swift package resolve and swift package-registry publish accept unmodified on both an old and a current toolchain, whose publisher signatures pass through untouched so a proxied or virtual repository is as verifiable as a hosted one, and whose identities, credentials and refusals behave the way SwiftPM actually reads them rather than the way the documents describe."
priority: "medium"
issue: 28
created: 2026-09-26
covers:
  - "internal/format/swift/**"
  - "conformance/swift/**"
fable_recheck: "authored on Opus 2026-09-27 while Fable was out of monthly credit; grounded in captured client traffic, but the design judgement was never Fable-reviewed. Reconciled on Opus 2026-09-28 (format batch 8), adopting Q11 (login and availability as pull descriptors under auth.md's descriptor kind, revising Q7), which also needs a Fable recheck"
---

# Plan: Swift package registry format

The Swift package registry protocol of SE-0292 and its service specification, hosted and
proxied: a per-package JSON release list, per-version release metadata carrying the archive
checksum and an optional SE-0391 signature, the package manifest with its version-specific
alternates, the Zip source archive, the `identifiers` lookup that maps a Git URL to a registry
identity, and the multipart `PUT` that `swift package-registry publish` sends, with SwiftPM
5.10.1 and 6.4.0 as the oracles on both paths.

## Context

The Swift package registry sits in Tier 2 of `formats/catalogue.md` as its own single-ecosystem
family, "Swift package registry (SE-0292)". **Its build is gated by `project-charter.md` AC9 and
`catalogue.md` AC5**: no handler code for a Tier 2 ecosystem exists before every Tier 1 format
has met its definition of done and the owner has recorded a `continue` verdict at the charter's
build step 8. This spec exists now because the owner directed on 2026-09-26 that all 33
ecosystems be specced up front (the catalogue's "Every ecosystem below is specced now; only
building is gated"), so that the gate decides what is built and never what is written; a
`shrink` verdict parks it.

**How it relates to Git-based resolution.** The catalogue once filed Swift under a "Git-backed"
family and split it out on 2026-09-26 (its resolved family decision), because SwiftPM resolves
two kinds of dependency by two different protocols. A `.package(url:)` dependency is resolved
by cloning the Git repository and reading tags; nothing about it touches a registry, and this
registry does not serve Git. A `.package(id: "scope.name")` dependency is resolved entirely
through the HTTP protocol this spec covers, with no Git on the wire: versions come from a JSON
list, manifests and archives from registry URLs. The two meet at exactly one route, the
`identifiers` lookup, which SwiftPM calls under `--use-registry-identity-for-scm` or
`--replace-scm-with-registry` to ask the registry which identity a Git URL corresponds to, so
that a graph naming one package both ways is deduplicated or fetched from the registry instead
of cloned (captured under both flags on 5.10.1 and 6.1.3, and under `--replace-scm-with-registry`
on 6.4.0, below). Serving that lookup honestly is where the
Git world and this format touch, and it is where this spec's hardest identity decision lives.

It is the **publisher-signed class without a registry signature**, the only one in the Tier 2
set: nothing the registry generates is signed or index-shaped, every document is rendered per
request from the shared model like Cargo's package documents, and the signatures that do exist
are made by the publisher over the source archive (SE-0391's `cms-1.0.0`) and verified by the
client against its own trust roots. So a hosted Swift repository needs neither the signing
service nor any write-triggered generation, and a proxied one serves the upstream publisher's
signatures without re-signing anything, which is why a virtual repository is possible here where
`hex.md` found it impossible.

Grounding for this draft, stated up front because the constitution asks for evidence or silence:

- **Captured client traffic.** No Swift toolchain is installed on this host (`which swift`
  finds nothing), so the official images were run under `podman` on the host network against a
  logging stub (`/tmp/swift-spec/stub.py`, a Python server that serves a fixture directory in
  deliberately varied flavours selected by the first path segment and records every request as
  JSON lines) with its CA injected into each container's system trust store:
  `docker.io/library/swift:5.10` at index digest
  `sha256:ffc42e399ad0cad324f68d58f65e4d5f2c22eb9df73c4dfa249e898d497254b3` (Swift 5.10.1,
  `User-Agent: SwiftPackageManager/5.10.1-dev`) and `swift:6.4` at
  `sha256:bb6e5d5f2a97bc07cf8022c1a3e062f8164b8fd078698327ce2ab097e02a91dc` (Swift 6.4, the
  current release, `SwiftPackageManager/6.4.0-dev`), each extended only with the `zip` package
  that `swift package archive-source` needs on Linux; `swift:6.1` at
  `sha256:3991e5dd5c40b04580c1e56f1ad6042f3173829b1995ffa53b84957371c25876` (6.1.3) was run
  through the resolve, content-type, pagination, identity-case, SCM and scope scenarios by an
  earlier pass whose captures were reused where their stub variant and image are recorded,
  and corroborates the 5.10 behaviour everywhere it was run. The fixtures were genuine:
  packages created by `swift package init`, archived by the client's own `swift package
  archive-source`, checksummed by `swift package compute-checksum`, one carrying a
  `Package@swift-5.9.swift` alternate beside a tools-6.1 `Package.swift`, one depending on the
  other through the registry, a prerelease, and a signed release produced by a real `swift
  package-registry publish --dry-run` with a throwaway ECDSA P-256 code-signing certificate
  under a throwaway root. Every consumer run started from a fresh container, so from empty
  caches, configuration and fingerprint stores unless the row says otherwise: 144 runs in this
  pass (84 on 6.4.0, 60 on 5.10.1, 1,074 recorded requests), beside the earlier pass's 101 runs
  on 6.1.3 and 100 on 5.10.1 (1,113 requests), whose captures were discarded wherever their
  fixture or harness was defective (its signed fixture declared tools 6.1, which 5.10 cannot
  read; its publish runs lacked a scratch directory; its credential runs looked for netrc under
  `HOME`, which SwiftPM does not read). The stub is not a reference implementation; what the
  captures prove is what the clients send and how they react.
- **The published contract.** `Documentation/PackageRegistry/Registry.md` (the service
  specification) and `PackageRegistryUsage.md` from the swift-package-manager repository at
  `24a8a7b` (read 2026-09-26); SE-0292 (the registry service), SE-0321 (publish) and SE-0391
  (publish and signing); the OSV schema's ecosystem table and query API; and the
  `swiftlang/swift-package-registry-compatibility-test-suite` repository (maintained, last
  pushed 2026-06), whose `PackageRegistryExample` server is the ecosystem's reference
  implementation and whose `package-registry-compatibility` tool tests every endpoint of the
  service specification; neither was run in this pass.
- **The client source.** `RegistryClient.swift`, `RegistryConfiguration.swift`,
  `SignatureValidation.swift` and the `package-registry` login and publish commands at
  `swift-5.10.1-RELEASE`, `swift-6.1.3-RELEASE` and `main`, for the rules no document states:
  which responses must carry `Content-Version`, how a `Content-Type` with parameters is
  matched, that the release list's `url` values are never read, how credentials are keyed, where
  the login request goes, and that the downloaded archive must hold a single top-level
  directory (`stripFirstLevel` in `FileSystem+Extensions.swift`). `PackageDescription`'s
  `Version.swift` for version equality. The 6.4 binary was checked directly for the
  environment-variable credential names, because no `swift-6.4-RELEASE` tag exists in the
  SwiftPM repository to read.
- **The live upstream.** The Tuist public registry at `https://tuist.dev/api/registry/swift`,
  the one public SE-0292 registry, sampled directly: `availability` answering `200` with
  `content-version: 1`; the release list and release metadata as `application/json;
  charset=utf-8` with `cache-control: max-age=0, private, must-revalidate`, no `ETag`, release
  `url` values that are **root-relative paths** (`/api/registry/swift/apple/swift-argument-parser/1.5.1`),
  release metadata with no `metadata` key and no `publishedAt`; a manifest carrying a
  root-relative `Link` alternate; the archive answered `303` to a presigned object-store URL
  with a 600-second expiry, whose bytes hash to the advertised checksum; a case-varied
  identity (`apple/Swift-Argument-Parser`) answering `200`; a missing package answering `404`
  with `application/json` `{"message":"Not Found"}` rather than a problem document; and a `PUT`
  answering `404`. OSV's API queried for the `SwiftURL` ecosystem.

Where the documents and the captures disagree, the captures win, and the disagreements are
recorded here because they would otherwise be built from the documents:

- `PackageRegistryUsage.md` documents `SWIFTPM_REGISTRY_TOKEN`, `SWIFTPM_REGISTRY_LOGIN`,
  `SWIFTPM_REGISTRY_PASSWORD` and `SWIFTPM_NETRC_DATA` for CI. They landed in April 2026 and
  only 6.4 honours them; 5.10 and 6.1 send no credential under any of them (captured `401`s).
- SE-0292 says `Package.resolved` records each registry release's checksum. The version 2
  resolved files every pinned client wrote carry `"kind": "registry"`, an empty `location` and
  the version, and no checksum; the integrity pin lives in the per-machine fingerprint store
  under `~/.swiftpm/security/fingerprints/` instead (captured), so a fresh CI machine trusts
  whatever the registry serves first.
- Registry.md says a client locates a release by the list's `url` value. SwiftPM never reads it:
  it builds every URL from the configured registry URL and the version key (client source; every
  capture), so a wrong `url` breaks nobody using SwiftPM and a root-relative one breaks any
  client that does read it.
- Registry.md makes the release document's `metadata` key required. Tuist omits it and the
  client's decoder treats it as optional.
- Registry.md lets a client poll an asynchronous publication. Neither pinned client polls: on
  `202` both print the status URL and exit `0` (captured), so a CI step that publishes and then
  resolves races the registry.
- `--disable-signature-validation` does not let either client install a release whose signature
  fails to verify (captured on both).

Six things make this format worth a careful spec rather than a port of Cargo's. **Identity is
case-insensitive and the wire carries whatever spelling the consumer typed**: a manifest
declaring `ACME.ZZTool` sends `/ACME/ZZTool` and a publish typed that way sends
`PUT /ACME/ZZTool/1.0.1`, and both must reach the package published as `acme.zztool`. **The
manifest has alternates an old client depends on**: 5.10 cannot parse a tools-6.x
`Package.swift`, finds a `Package@swift-5.9.swift` only through the `Link` header of the
manifest response, and asks for it as `?swift-version=5.9.0` although the file says `5.9`.
**Credentials are per host, not per repository**: SwiftPM keys both its configuration and its
netrc lookup by host, so every repository a consumer reads from one registry host sees one
credential. **A refusal's reason reaches the user on the JSON routes and never on the
archive route**, so where a policy bites decides whether anyone learns why. **A `401` with a
Basic challenge hangs the older clients** until they are killed. And **`Content-Version: 1` is
mandatory** on every JSON and error response: without it the client refuses a perfectly good
document, and an error without it loses its detail.

## Blocking preconditions

**The handler interface re-open must complete before this handler starts**, as for every Tier 1
and Tier 2 handler (`format-handler-interface.md` AC8). Swift is Tier 2, so the catalogue's
Tier 1 gate (its AC5) and the charter's breadth verdict (its AC9, build step 8) both precede it;
the re-open is recorded here anyway, from this side, because a gate enforced on one side only
is enforced nowhere.

**Artifact verification must be `planned` before Phase 2's signed-publish half.** Validating an
SE-0391 signature at publish, and producing the signature verdict the policy engine consumes, is
the Swift profile of the CMS entry in `docs/internal/plans/foundation/artifact-verification.md`
(its entry catalogue and AC15), which the charter builds at step 4b and whose per-format entries
are built with their formats. How that spec answers this format's five requirements is stated in
Design ("What artifact verification provides"). Unsigned publish and every read path are
testable without it.

**The management API must be `planned` before Phase 2's management half.** Marking a release
unavailable, restoring it, deleting a release and rebinding a repository URL have no client
command and no route in the service specification, so they are the `withdraw`, `restore`,
`delete-version` and `rebind` kinds of `docs/internal/plans/foundation/management-api.md` (its
operation vocabulary and the Swift rows of its cross-format reconciliation table), whose core the
charter builds at step 2 and completes at step 9. AC9 and the rebind half of AC7 are untestable
until that surface exists.

**The proxied path runs on the upstream adapters.** Following an upstream archive's `303` to a
presigned object-store URL and presenting an upstream credential are
`docs/internal/plans/foundation/upstream-adapters.md`'s `https` adapter (its AC6, AC7, AC8 and
AC19), built at charter step 4; following a paginated release list to completion is this
handler's own derivation of the next upstream request, which that spec leaves to the handler
("Which upstream URL to ask next"). Nothing is asked of `foundation/signing-service.md` (charter
step 7), which records this format in its "Nothing, stated" row, or of
`foundation/async-operations.md`, which lists this format among those asking nothing of it: the
registry signs nothing on this format, every publish is synchronous (the resolved
publication-mode decision below), and a virtual repository is resolved per request rather than
merged.

## Scope

**In scope:**

- The read surface under the format-first mount `/swift/{repository}/`: the release list
  `{scope}/{name}`, release metadata `{scope}/{name}/{version}`, the manifest
  `{scope}/{name}/{version}/Package.swift` with its `swift-version` query, the source archive
  `{scope}/{name}/{version}.zip`, the `identifiers` lookup, `availability`, and the `.json`
  suffix forms the service specification allows; `HEAD` on every `GET` route.
- The login route SwiftPM posts to (`POST` on the registry URL itself, or `/login` when the URL
  has no path) and the credential forms both clients present.
- Publish: the multipart `PUT {scope}/{name}/{version}` with its archive, metadata and the two
  optional signatures, answered synchronously, with the `Expect: 100-continue` refusals made
  before the body is read, and the write-boundary declaration `data-model.md` requires.
- Identity: scope and name grammars, case-insensitive matching with the first-published
  spelling kept for display, SemVer versions with SwiftPM's precedence equality, and the
  version-suffix ambiguity the `.zip` and `.json` routes create.
- Manifests: every `Package.swift` and `Package@swift-*.swift` at the archive root extracted at
  publish, served byte-identical, advertised through the `Link` alternates, and matched to the
  normalised `swift-version` the client sends.
- The identifiers lookup's URL-to-identity bindings, and their rebinding as a management
  operation.
- Signing and provenance: SE-0391 signatures accepted at publish, verified through
  `artifact-verification.md`'s CMS entry (its Swift profile), served in the release metadata and
  as archive response headers, and passed through unmodified on the proxied path.
- Unavailability, restoration, deletion and rebinding as `management-api.md` operation kinds
  with their client-visible effects, and the capabilities and rename behaviour
  `format-handler-interface.md` AC13 and `repository-lifecycle.md` AC12 require.
- Non-interactive authentication in every form each pinned client reads, the per-route
  addressed objects `auth.md`'s pattern scopes evaluate, and the rendering of a shared policy
  refusal.
- The proxied path against any SE-0292 registry (the Tuist public registry, a private Artifactory
  or CodeArtifact Swift repository, another instance of this registry): classification per
  route, URL rewriting, archive redirects followed in the adapter, stream-and-verify against
  the release checksum, pagination folded, negative caching, and Swift's rows of the removal
  table.
- Virtual repositories with a per-package, first-member-wins merge.
- SwiftPM 5.10.1 and 6.4.0 as the conformance oracles on both paths, the reference server as the
  replay source, and the compatibility suite as a second case source.

**Out of scope for v1**, each with its reason, recorded because the interface spec's definition
of done requires the deliberately unimplemented surface to be named:

- **Asynchronous publication** (`202` with a status resource, and `DELETE` on it to cancel).
  Neither pinned client polls the status resource: both print its URL and exit `0` (captured),
  so a `202` tells a CI pipeline that a release exists before it does. Every publish is
  answered `201` or refused (the resolved publication-mode decision below). The `Prefer:
  respond-async` header both clients send on every publish is therefore ignored, as RFC 7240
  permits.
- **Synthesising a registry from Git repositories** (a remote whose upstream is a Git host,
  with versions read from tags and archives built by the registry). A Git tag is mutable and an
  archive built from it is this registry's artefact, not the upstream's, so the proxied path
  would have no upstream digest to verify against and the checksum every consumer then pins in
  its fingerprint store would be this registry's invention; the ingest would also be an egress
  of a second protocol the upstream adapters do not carry. The Tuist registry already performs
  that synthesis and publishes the result as an SE-0292 upstream, which this spec proxies like
  any other.
- **Redirecting hosted archive downloads** to presigned object-store URLs or mirrors (`303`, or
  `Link` with `rel="duplicate"`). Both clients follow a `303` (captured), so this would work; it
  is excluded because a presigned URL carries its own bearer authority for its lifetime and is
  served without the authorization check and the policy evaluation that every read through
  `Deps` receives, so a refusal issued after the redirect would not bind.
- **Package collections** (SE-0291's signed JSON collections). They are static documents at
  arbitrary URLs, not part of the registry protocol, and any static host serves them; the
  `generic` format stores one.
- **`OPTIONS *` with `service-doc` and `service-desc` links.** The asterisk form addresses the
  whole host rather than a repository mount, so it could not be served without a root carve-out
  in `format-handler-interface.md`'s registration list, and no pinned client sends it.
- **Search.** The service specification defines no search endpoint (SE-0292 lists it under
  future directions), so there is nothing to serve.

## Design

### The wire surface, as captured

Every path below hangs off the repository's base URL, `/swift/{repository}`, format-first per
`format-handler-interface.md`'s resolved URL-shape decision. Both clients take an arbitrary
registry URL with a path (`swift package-registry set https://host/swift/acme`, captured with a
path prefix and at the host root alike), so no root anchoring is needed.

| Surface | Shape, as the pinned clients send it |
|---|---|
| Release list | `GET {base}/{scope}/{name}` with `Accept: application/vnd.swift.registry.v1+json`, `Accept-Encoding: deflate, gzip, br, zstd`, once per package per resolution. The client requires `Content-Version: 1` and a `Content-Type` of `application/json`, optionally with parameters (`; charset=utf-8` accepted on all three; `application/vnd.swift.registry.v1+json` refused with "invalid registry response content type '', expected 'application/json'"). Versions are the keys of `releases`; an entry carrying `problem` is excluded; `url` is never read; a `Link` with `rel="next"` is followed by 6.1 and 6.4 (captured `?page=2`, `?page=3`) and **ignored by 5.10**, which resolved `acme.zzcore` at 1.0.0 from the first page where the others found 1.1.0 on the second (captured; 5.10's `RegistryClient` has no pagination code); `canonical` and `alternate` links are read for SCM reconciliation |
| Release metadata | `GET {base}/{scope}/{name}/{version}`, same `Accept`, fetched during resolution **before** the manifest and again before the download. `resources[]` with `name: source-archive` carries the `checksum` the archive is verified against and, when signed, `signing` (`signatureBase64Encoded`, `signatureFormat`); `id` is not compared with the request (an upper-cased `id` was accepted on all three) |
| Manifest | `GET {base}/{scope}/{name}/{version}/Package.swift` with `Accept: application/vnd.swift.registry.v1+swift`; `Content-Type: text/x-swift` (parameters accepted); `Content-Version: 1` required on this unqualified fetch, optional on the qualified one. The `Link` header lists each alternate as `<...?swift-version=X>; rel="alternate"; filename="Package@swift-X.swift"; swift-tools-version="X"`. 5.10, facing a tools-6.1 `Package.swift`, requests `?swift-version=5.9.0` for a link that advertised `swift-version=5.9` and the file `Package@swift-5.9.swift`; with no `Link` it fails "contains incompatible tools version (6.1.0)" (captured). 6.1 and 6.4 read the tools-6.1 manifest directly and request no alternate |
| Source archive | `GET {base}/{scope}/{name}/{version}.zip` with `Accept: application/vnd.swift.registry.v1+zip`; `Content-Type: application/zip` required (`application/octet-stream` refused); the bytes must hash to the release metadata's `checksum` ("invalid registry source archive checksum '{actual}', expected '{advertised}'"); a `303` is followed on both; a missing `Digest` header is accepted; the archive must hold exactly one top-level directory, which the client strips |
| Identifiers | `GET {base}/identifiers?url={url}` with the URL unescaped as declared in the manifest (captured `?url=https://github.com/acme/zztool`), under `--use-registry-identity-for-scm` or `--replace-scm-with-registry` only; a `403` prints "failed querying registry identity for '{url}'" with the problem detail and falls back to cloning (6.4, captured) |
| Availability | `GET {base}/availability` with `Accept: */*`, only when `supportsAvailability` is `true` in `registries.json` (`set` writes `false`), before every other request; `404` makes the client refuse the registry: "registry at '{url}' is not available at this time, please try again later" |
| Login | `swift package-registry login {url}` sends `POST` with `Accept: */*`, `Content-Length: 0` and the credential **to the registry URL's own path** (`POST /auth` for `https://host/auth`), or to `/login` when the URL has no path (captured both); only `200` is success. On success it writes `~/.netrc` (`machine {host} login {user or "token"} password {secret}`, port dropped) and an `authentication` entry keyed `{host}:{port}` with `type` (`basic` or `token`) and `loginAPIPath` into the **user-level** `registries.json`, resolved from the passwd home even when `$HOME` points elsewhere (captured) |
| Publish | `PUT {base}/{scope}/{name}/{version}` with the path in the spelling typed on the command line, `Content-Type: multipart/form-data;boundary="{uuid}"`, `Content-Length`, `Expect: 100-continue`, `Prefer: respond-async`, `Accept: application/vnd.swift.registry.v1+json`, and `X-Swift-Package-Signature-Format: cms-1.0.0` when signed. Parts in order: `source-archive` (`application/zip`, `Content-Transfer-Encoding: binary`), `source-archive-signature` (`application/octet-stream`, binary) when signed, `metadata` (`application/json`) only when a metadata file exists, `metadata-signature` when signed. The archive's single top-level directory is named after the identity as typed (`acme.zztool/`, `ACME.ZZTool/`). `201` prints "{id} version {v} was successfully published to {registry} and is available at '{Location}'" |
| Error rendering | A non-2xx whose body is `application/problem+json` with `Content-Version: 1` prints `server error {status}: {detail}` on the list, release, manifest, identifiers, login and publish routes (captured `401`, `403`, `405`, `409`, `410`, `422`). Without that shape the detail is lost: `401` prints "missing or invalid authentication credentials", `403` "forbidden", and a list `404` always prints "package not found on registry". On the **archive** route the detail is dropped whatever the body: 5.10 prints "forbidden" or "package version not found on registry", 6.4 `badResponseStatusCode(403)` (captured) |

Three client facts shape every second-request assertion. The shared download cache
(`~/.cache/org.swift.swiftpm`) serves a warm archive with no request at all, so a case proving
this registry served from its own cache asserts at the network layer against the upstream, not
against the client's request count. The fingerprint store records, per version, the SHA-256 of
the archive and of the unqualified manifest together with the registry URL they came from, so a
coordinate that ever serves different bytes fails every machine that fetched it before
(captured, "Integrity" below). And `--force-resolved-versions` resolves a pinned version by its
release metadata and archive alone, without consulting the list (captured on both), so anything
this registry wants to make unresolvable for pinned consumers has to be refused at the version's
own routes, not only marked in the list.

**The two pinned toolchains straddle real watersheds.** 5.10.1 sends credentials only
when `registries.json` has an `authentication` entry for the host, ignores every environment
credential, hangs on a `401` carrying `WWW-Authenticate: Basic` (6.1.3 hangs too; both were
killed at the capture timeout), needs the manifest alternates, reads only the first page of a
paginated release list, and prints "forbidden" for a refused archive. 6.4.0 sends a netrc or
environment credential with no `authentication` entry, returns at once from a Basic-challenged
`401`, reads tools-6.x manifests, and prints
`badResponseStatusCode` for a refused archive. On a pinned version newly marked with a
`problem`, 5.10 fails the resolve ("no versions of 'acme.zzcore' match the requirement") and 6.4
silently re-resolves to the previous version and rewrites `Package.resolved` (captured). One
6.4 defect is recorded rather than worked around: `swift package-registry login` and `publish`
intermittently abort at process exit ("Object ... of class _MultiHandle deallocated with
non-zero retain count 2", exit `134`) after the request has completed and its effect is written
(captured on three of three logins and one of five publishes, never on 5.10), so 6.4's exit code
for those two commands is not an oracle and the cases assert the transcript and the server state
instead.

### Identity: case-insensitive, spelled as typed, stored once

A package identity is `{scope}.{name}`. The scope matches
`\A[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}\z` and the name
`\A[a-zA-Z0-9](?:[a-zA-Z0-9]|[-_](?=[a-zA-Z0-9])){0,99}\z`, and SE-0292 fixes that both "are
compared using locale-independent case folding". Both grammars are ASCII, so the fold is ASCII
lowercasing and nothing else. The clients never normalise: a manifest declaring
`.package(id: "ACME.ZZTool", ...)` requests `/ACME/ZZTool` (captured on all three), a
`swift package-registry publish ACME.ZZTool 1.0.1` sends `PUT /ACME/ZZTool/1.0.1` with the
archive's top-level directory named `ACME.ZZTool/` (captured), and the client's scope-to-registry
mapping in `registries.json` matches case-insensitively too (a `--scope ACME` mapping served
`acme.zztool`, captured on 6.4). This registry therefore:

- keys the package by the **canonical identity**, the ASCII-lowercased `{scope}.{name}`, which is
  `Package.name` in the shared model, so every spelling reaches one package and a publish in a
  new spelling of an existing package is a publish into that package, never a second one;
- keeps the **display spelling** of the first publish in the package-level document and serves it
  as the release document's `id`, exactly as `cargo.md` keeps a crate's registered spelling;
- answers `404` with a problem document for a scope or name outside the grammars, before any
  lookup, so a path such as `/../x` or `/acme-/zztool` resolves nothing (the clients reject such
  identities themselves: 6.4's manifest evaluation fails on `acme-.zztool`, and `publish` refuses
  `zztool` as "invalid package identifier", captured).

Versions are SemVer 2.0: the clients refuse `v1.0.1` and `1.0` at publish before any request
(captured). Two rules come from how SwiftPM compares them rather than from the grammar.
**Equality is precedence**: `PackageDescription`'s `Version.==` is `!(lhs < rhs) && !(lhs > rhs)`,
so `1.0.0` and `1.0.0+build.7` are the same version to every client, and a repository that
listed both would hand the client two keys it cannot tell apart. The registry therefore stores the
published string verbatim and serves it, and refuses a publish whose version equals an existing
or retired version under precedence. **The suffix routes are ambiguous for some legal versions**:
`1.0.0-rc.zip` is a valid SemVer string, and `{version}.zip` for version `1.0.0-rc` is the same
path, as is `.json` against the service specification's optional `.json` suffix. A hosted publish
of a version whose final dot-separated identifier is `zip` or `json` is refused with `422` naming
the rule, and on the proxied path an upstream version of that shape is routed by the request's
`Accept` (`+zip` to the archive, `+json` or absent to the metadata), which is what both clients
send (captured).

### Mapping onto the shared model

The levels are exactly those `data-model.md` provides; no table is added.

- `Package.name` holds the canonical identity. The package-level document holds the display
  spelling, a **deleted-versions list** (each version this repository deleted, with the deletion
  time and reason that render as its `problem` and its `410`), and the repository URLs the
  package's releases have claimed with the binding state of each (Design, "The identifiers
  lookup"). The list is display state only: that a deleted version is never republishable is the
  core-held `Retirement` record's (`data-model.md` AC35; `management-api.md`, "Retirement is
  core-held"), written in the deleting operation's transaction, outside snapshot content, and
  checked centrally, so a pointer moved backwards past a deletion cannot make the coordinate
  publishable again even though it restores the list as it was.
- `Version.version` holds the version string verbatim. The version-level document holds the
  metadata part exactly as received (its bytes, so a signed metadata document stays verifiable),
  the metadata signature when one was sent, the server-populated fields (`publishedAt`), the
  archive checksum, the `signing` block (format and base64 signature) and the signing entity
  artifact verification reported, the list of manifests with each filename and its parsed
  `swift-tools-version`, and the unavailability state when a release is marked unavailable
  (reason and time).
- The source archive is the version's first `File`, its `Blob` keyed by the CAS digest of the
  bytes as received. That digest is, by construction, the SHA-256 the release metadata advertises
  as `checksum` (`swift package compute-checksum` is a SHA-256 of the file, captured as equal to
  `sha256sum` for every fixture), so the CAS key and the format's integrity value coincide as they
  do for Cargo and Hex, and the key is still the store's digest of the received bytes.
- Each manifest at the archive root is a further `File` of the version at its own filename
  (`Package.swift`, `Package@swift-5.9.swift`), its bytes extracted from the archive at publish
  and never re-encoded, because the fingerprint store pins the manifest's bytes and a signed
  archive's manifests carry their signature in their last line.
- The repository-level document holds the **binding index** from a normalised repository URL to
  the canonical identity bound to it, because the `identifiers` lookup is keyed by URL across
  every package of the repository; on a `remote` repository it holds nothing format-specific.

Nothing on this format is a generated document: the release list, the release metadata and every
`Link` header are rendered per request from the head snapshot through the pointer, so there is no
write-triggered service, nothing for `write-triggered-services-prototype.md`'s class to produce,
and nothing for the fourth GC mark root beyond what any metadata document over the inline
threshold already gets (`storage-and-gc.md`).

### Manifests and the `swift-version` match

Registry.md makes the manifest route **MUST** carry a `Link` alternate for every file in the
archive matching `\APackage@swift-(\d+)(?:\.(\d+))?(?:\.(\d+))?.swift\z`, and the captures show why
the rule is load-bearing rather than decorative: 5.10 never requests an alternate the header did
not advertise, and without the header it fails a package whose `Package.swift` declares a newer
tools version. At publish the handler reads the archive's central directory, requires exactly one
top-level directory (the client's `stripFirstLevel` refuses anything else with "requires single
top level directory"), requires `Package.swift` directly inside it, extracts every file whose
name matches the pattern beside it, and parses each file's `swift-tools-version` comment for the
link attribute. A manifest nested deeper is not an alternate, because the client's
`ManifestLoader.findManifest` looks for version-specific manifests only in the package root.

A qualified request `?swift-version=X` is matched by **numeric equivalence**, not by string:
`X` and each alternate's version are split on `.`, padded with zeros to three components, and
compared as integers, so `5.9.0`, `5.9` and `5` name `Package@swift-5.9.swift`, `...-5.9.swift`
and `...-5.swift` respectively and nothing else. A matching alternate is served `200` with its
filename in `Content-Disposition`; no match is answered `303 See Other` to the unqualified
manifest, as the specification directs. A server that matched the filename literally would answer
5.10's `5.9.0` with the `303`, hand it the tools-6.1 manifest, and fail the resolve.

Every manifest response carries `Content-Type: text/x-swift`, `Content-Version: 1`,
`Cache-Control: public, immutable`, `Content-Disposition: attachment; filename="..."` and, on the
unqualified manifest, the `Link` alternates as absolute URLs under this repository's externally
visible base.

### The identifiers lookup

The lookup answers which identities a Git URL corresponds to, and SwiftPM acts on the answer
without further checks: under `--replace-scm-with-registry` it downloads the returned identity from
the registry **instead of cloning the URL** (captured: `https://github.com/acme/zztool` became the
pins `acme.zztool` and `acme.zzcore`, kind `registry`). The URLs come from the publisher's own
`repositoryURLs` in the release metadata, and Registry.md says only that a server "SHOULD validate
the package author's ownership claim". Serving every claim would let anyone holding `push` on any
package of a repository capture the URL of a package they do not own, so that every consumer
bridging that URL installs their code in its place.

Per the resolved identifier-binding decision below, a claim **binds on first publication**: the
first release that claims a normalised URL binds it to its package, later releases of the same
package keep it, and a release of another package claiming a bound URL is published (the claim is
not a reason to refuse code) but its claim is recorded as **unbound** and not served, and the
operator sees the conflict. A binding moves only through the management API's rebind operation.
Normalisation, so that the variants SE-0292 calls insignificant find one binding: the scp form
`git@host:owner/repo.git` becomes `host/owner/repo`, the scheme and user-info are dropped, the host
is lowercased, one trailing `.git` and trailing slashes are dropped, and the path compares
case-insensitively, which is how the hosting services this format meets in practice treat it. The
same normalised form is the OSV `SwiftURL` name (Design, "Integrity, signing and provenance").

The route answers `200` with `{"identifiers": [...]}` (display spellings) for a bound URL, `404`
with a problem document for an unbound or unknown one, and `400` when `url` is missing.

### The publish path and what counts as a write

A publish is one multipart `PUT`. Everything that can be decided from the request line and headers
is decided **before** the body is read, so that no byte of a refused publish is spooled: the
credential is authenticated, `push` is authorized on the path's object, the version is parsed and
checked against the existing versions of the package, and each refusal is sent as a final
response in place of `100 Continue`. Both clients render such an early `401` or `409` with its
detail and exit non-zero (captured, "early refusal before 100-continue", on both), so the early
answer costs nothing in rendering. What this registry enforces on the body:

- The body is spooled to a bounded temporary buffer outside the CAS. The `source-archive` part is
  required; `source-archive-signature`, `metadata` and `metadata-signature` are optional, and a
  signature part without `X-Swift-Package-Signature-Format: cms-1.0.0`, or with another format,
  is refused with `422`.
- The archive is validated as described under manifests: a Zip, one top-level directory,
  `Package.swift` inside it. Anything else is refused with `422` naming the defect ("package
  doesn't contain a valid manifest (Package.swift) file", the specification's example).
- The `metadata` part must parse as JSON and conform to the service specification's Appendix B
  schema, else `422` ("invalid JSON provided for release metadata"). A publish without it is
  accepted, and the release document then carries `"metadata": {}` (captured: no part is sent when
  the package has no `package-metadata.json`).
- **A coordinate that already exists is refused with `409`**, and so is a version equal to it under
  precedence: the specification's own rule ("If a release already exists ... 409") and the
  immutability every fingerprint store relies on. **A retired coordinate is refused centrally**:
  the shared write path answers `retired` (409) for the object this route's `Scope(r)` reports, for
  the life of the repository, including after the deleting snapshot has aged out of retention and
  across a backwards repoint (`management-api.md` AC12), and the handler renders it as its own
  `409` problem document with `Content-Version: 1`, the wire rendering of a central refusal the
  format batch 6 reconciliation queued on `management-api.md`. There is no idempotent same-bytes case, because
  `swift package-registry publish` rebuilds the archive on every run and a retry is never
  byte-identical to the attempt it retries.
- A signed publish is verified before commit through `Deps`' `Verifier` (below); a signature that
  fails, a signed archive whose manifests are not signed, or manifests signed by a different signer
  than the archive are refused with `422`, because every client would refuse to install the release
  (`artifact-verification.md`, "When verification runs", and its AC15).
- The response is `201` with `Location: {base}/{scope}/{name}/{version}` in the canonical spelling
  and `Content-Version: 1`, which the client prints. A publish to a `remote` or `virtual` repository
  answers `405` with a problem document ("publishing isn't supported"), rendered by both clients as
  `server error 405: ...` (captured), the status `management-api.md` AC7 fixes for every write
  against those types.

`data-model.md` requires each format spec to declare its ecosystem's write boundaries and makes
metadata-only mutations snapshot-creating writes. Swift's declaration:

- **One publish `PUT` is one completed logical write**: the version, its archive and manifest files,
  its version-level document, the package-level document's display spelling and claims, and the
  repository-level binding index land in one snapshot, and the release list served from the head
  snapshot lists the version before the `201` is sent. Two concurrent publishes into one package or
  one repository both land through the revision-token retry `data-model.md` makes mandatory, and two
  concurrent publishes of one coordinate yield exactly one `201` and one `409`.
- **Marking a release unavailable, and restoring it, is each one metadata-only write.**
- **A deletion is one removal write**: the version leaves the head snapshot, its `Retirement`
  record is written in the same transaction, and any binding only it held is released, in the
  same write.
- **A rebind is one metadata-only write** on the package-level and repository-level documents.
- A proxied repository creates no snapshots at all; list arrival and revalidation are cache
  materialisation.

### Unavailability and deletion are management operations

The service specification has no route that removes or withdraws a release, and no client command
triggers one, so this format is in PyPI's and Galaxy's category in
`docs/internal/analysis/management-surfaces-and-the-oracle.md`: the trigger is verified by this
registry's integration tests through the management endpoint, and every effect by a real client.
Per the cross-format precedent (`pypi.md`'s resolved hosted-yank decision, with the siblings that
followed it), each operation is a kind of the registry-owned management API,
`docs/internal/plans/foundation/management-api.md`, authorised in the settled
`(repository, action)` vocabulary with no new action. The handler implements that spec's
`Operator` interface and declares these kinds, with no binding, since no client drives any of
them (its reconciliation table's Swift rows):

| Operation | Kind | What it carries | Effect a client sees | Action |
|---|---|---|---|---|
| Mark a release unavailable | `withdraw` | `{scope}/{name}/{version}` and a reason text | The list carries the version with `problem: {status: 410, title: "Unavailable", detail: reason}`; a fresh 6.4 resolve selects the next eligible version, a 5.10 resolve pinned to it fails, and a `--force-resolved-versions` resolve still installs it, because the release metadata, manifest and archive keep serving (all captured against the stub) | `delete` |
| Restore a release | `restore` | `{scope}/{name}/{version}` | The `problem` clears | `delete` |
| Delete a release | `delete-version` | `{scope}/{name}/{version}` and a reason text | The version leaves the snapshot and its coordinate is retired; the list keeps it as an entry carrying `problem: {status: 410, title: "Gone", detail: reason}` so a client learns why rather than seeing a version vanish, and its release metadata, manifests and archive answer `410` with the same problem document (captured rendering: "server error 410: {detail}" at the release-information step) | `delete` |
| Rebind a repository URL | `rebind` | A normalised URL and a canonical identity, or none to unbind | `identifiers?url=` answers the new identity (or `404`); the displaced package's claim becomes unbound | `push` on the identity it binds to and `delete` on the one it displaces, both required |

Unavailability is Swift's analogue of a yank, and the capture shows it is stronger than PyPI's: the
ecosystem's only withdrawal signal, a list `problem`, removes the version from every non-forced
resolution, including one that pinned it, while forced pins keep working because the version's own
routes are untouched. That is why this spec put it under `delete` (the resolved
unavailability-action decision below), and `management-api.md` placed the whole `withdraw` class
there by the same effect rule (its resolved withdraw-action decision, was Q1, and AC9); `rebind`'s
two-action rule is that spec's kind table taking this spec's resolved identifier-binding decision
as written. Every operation is hosted only: a proxied repository takes its withdrawals from the
upstream per the removal table, and each operation against a `remote` or `virtual` repository
answers `405` with problem type `repository-type` before authorization (`management-api.md`
AC7). `withdraw`, `restore` and `rebind` retire nothing; `delete-version` returns
`{scope}/{name}/{version}` to retire in its `Outcome`, and the core holds it (AC3's `retired`
refusal), so no document carries the set across a repoint.

### Content negotiation, headers and errors

Every response this handler sends, success or error, carries `Content-Version: 1`, because the client
checks it on every JSON response and on every error body it wants to render, and treats a missing or
unknown value as "invalid registry response content version '', expected '1'" (captured for a missing
header and for `Content-Version: 2`, on all three). JSON responses carry `Content-Type:
application/json`; every error is `application/problem+json` with `status`, `title` and `detail`, and
`Content-Language: en`, the specification's shape and the only one whose `detail` the clients print.

`Accept` is honoured as the specification's grammar defines it: `application/vnd.swift.registry.v1`
with `+json`, `+swift` or `+zip`, or the bare vendor type for JSON; a request without `Accept`, or with
`*/*` as login and availability send, is served as version 1 so that `curl` and the transcript stay
readable; an unknown or malformed version is `400` ("invalid API version") and a valid but unsupported
one (`v2`) is `415`. The optional `.json` suffix on the list and release routes is served as the
unsuffixed route. `HEAD` is answered on every `GET` route with the headers of the `GET`, as the
specification recommends, although no pinned client sends it.

The release list carries, besides `releases`, a `Link` with `rel="latest-version"` to the highest
precedence available release and, when the latest release's metadata names repository URLs, a
`canonical` link to its bound URL and `alternate` links to the rest, which SwiftPM reads to reconcile
identities and URLs. The release document carries `latest-version`, `successor-version` and
`predecessor-version` links. The archive response carries `Content-Length`, `Accept-Ranges: bytes`
with range requests honoured, `Cache-Control: public, immutable`, `Content-Disposition: attachment;
filename="{name}-{version}.zip"`, `Digest: sha-256={base64}`, and, for a signed release,
`X-Swift-Package-Signature-Format` and `X-Swift-Package-Signature`, which the specification makes
mandatory for a signed archive. A hosted list is never paginated: 5.10 reads only the first page
and would silently resolve an older version from a paginated list (captured), and the per-package
document is small enough that pagination buys nothing.

`availability` answers `200` with an empty body, so a consumer who sets `supportsAvailability` gets a
working registry rather than the refusal a `404` produces (captured).

### Authentication: per host, Basic or Bearer, and never a Basic challenge

The captured forms are the two universal rows of `auth.md`'s "Presentation forms" table (its AC31):
`Authorization: Bearer {token}`
from `login --token` (or `--token-file`, which both toolchains' help lists) or, on 6.4,
`SWIFTPM_REGISTRY_TOKEN`; and `Authorization:
Basic` from `login --username --password`, a netrc entry whose `authentication` type is `basic`, or, on
6.4, `SWIFTPM_REGISTRY_LOGIN` with `SWIFTPM_REGISTRY_PASSWORD`. Once configured, the credential is sent
preemptively on every request to the host, including the archive and the publish (captured). The
registry token is the Bearer value, or the Basic password with any username, under `auth.md`'s
token-as-password convention. `auth.md`'s client table has no `swift` row yet and neither form's
"Needed by" column names SwiftPM; both are reported for that spec. How this meets `auth.md`, whose
rules this spec does not bend:

- **Where the client looks decides the recipe.** 5.10 (and 6.1, by source) sends a credential only
  when the merged `registries.json` has an `authentication` entry for `{host}:{port}` and the netrc
  holds the host (captured: netrc alone gave `401`; a hand-written project-level `authentication`
  entry plus netrc resolved); 6.4 sends a netrc or environment credential with no entry (captured).
  The recipe the documentation shows is therefore `swift package-registry login {base} --token
  {token} --no-confirm`, which writes both halves on every pinned client, with the 6.4 environment
  variables as the CI alternative and the hand-written entry as the 5.10 alternative for credentials
  that cannot log in (below).
- **One credential per host.** The `authentication` entry is keyed by host and port and the netrc
  entry by host alone (`machine localhost`, captured), so every repository a consumer maps from one
  registry host receives the same credential. A consumer reading two repositories of this registry
  therefore either points `[default]` at one **virtual repository** over both, which is the recipe the
  documentation leads with, or presents one token spanning both under `auth.md`'s explicit
  multi-repository opt-in (its AC29). A single-repository token mapped to two repositories resolves
  the first and gets `404` on the second, which AC11 asserts.
- **The challenge is Bearer, never Basic.** A credential-less request to a repository that is not
  anonymously readable answers `401` with `WWW-Authenticate: Bearer realm="{externally visible
  base}"` and a problem body, byte-identical for a private, a missing and someone else's repository
  (`auth.md` AC17). The scheme is forced by the capture: the same `401` with `WWW-Authenticate: Basic`
  left 5.10 and 6.1 hanging until the harness killed them, while a Bearer challenge, or none, made
  every client fail at once with "server error 401: authentication required" (the resolved
  challenge-scheme decision below). This departs from the Basic challenge `composer.md` and `cran.md`
  send, and needs no amendment of the shared layer: `auth.md` already makes the challenge a
  per-format declaration ("A credential-less request is challenged, and the challenge is uniform":
  "`Basic realm="..."` for most, `Bearer` for OCI and Open VSX") and emits it identically, with its
  AC17 comparing the declared value byte for byte per format. Naming Swift in that sentence is a
  reported consequence.
- **Refusals.** A valid token lacking `pull` answers `404`, indistinguishable from a missing package,
  which the client prints as "package not found on registry". A rejected credential answers `401` and
  is never served as anonymous (`auth.md` AC12). `swift package-registry login` with a rejected
  credential prints "registry login using {url} failed: server error 401: ..." and writes nothing.
- **The login route is the repository base.** `POST {base}` and `POST {base}/` answer `200` with an
  empty body when the credential authenticates and holds the scope the route reports (below), and
  `401` otherwise; a host-level `POST /login` is not served, because the documentation always gives a
  URL with the repository's path and the client then posts to that path, and a root `/login` would
  be a root-anchored claim `format-handler-interface.md`'s carve-out list does not hold.
- **TLS.** `auth.md` refuses plaintext credentials unless the operator's flag is set (its AC27). The
  clients mostly agree: `swift package-registry set` refuses an `http://` URL on 5.10 ("invalid URL")
  and requires `--allow-insecure-http` on 6.x, and `publish` refuses one on both unless given the
  `--allow-insecure-http` only 6.x offers, but 5.10 resolves from a hand-edited `http://` entry
  without complaint (captured), so the server-side refusal is the real gate. The harness injects
  its CA into the client container's system trust store (`update-ca-certificates`), the mechanism
  every capture used.

### Addressed objects and pattern scopes

`auth.md`'s pattern scopes narrow a credential within one repository by matching the object each
request addresses, and the format declares which object each route reports ("Pattern scopes" there;
`format-handler-interface.md` AC12). The canonical object is `{scope}/{name}` and
`{scope}/{name}/{version}`, **with scope and name ASCII-lowercased** before matching, so that a request
spelled `/ACME/ZZTool` evaluates as `acme/zztool` and a pattern written in any other case cannot be
evaded by respelling; the slash separator lets `acme/**` grant a scope, which is how Swift teams
partition a registry.

| Route | Object kind | Canonical object |
|---|---|---|
| `{scope}/{name}` (and `.json`) | named | `{scope}/{name}` |
| `{scope}/{name}/{version}` (and `.json`), `.../Package.swift` with or without `swift-version`, `{scope}/{name}/{version}.zip` | named | `{scope}/{name}/{version}` |
| Publish `PUT {scope}/{name}/{version}` | named | `{scope}/{name}/{version}`, from the URL, evaluated before `100 Continue`; the archive carries no identity to disagree with it |
| `identifiers?url=` | none | - (its answer enumerates identities) |
| `availability`, login `POST {base}` | descriptor | - (an empty body naming no object) |
| Management operations (`withdraw`, `restore`, `delete-version`) | named | `{scope}/{name}/{version}` |
| Management operation `rebind` | named | `{scope}/{name}` it binds to (`push`) and the one it displaces (`delete`) |

Login and `availability` report `pull` on a descriptor, and the list, release, manifest and archive
routes report `pull`; publish reports `push`. What that gives and costs, applying `auth.md`'s rules
rather than re-deciding them. **A patterned `pull` resolves on this format**: nothing on the read
path fetches a repository-wide document that names objects, so a token patterned `acme/**`
resolves every `acme.*` package through a real `swift package resolve` and fails on the first
dependency outside the pattern with "package not found on registry". It is refused the
`identifiers` lookup, which 6.4 turns into a warning and a Git fallback (captured with a `403`),
so the SCM bridge simply does not engage for a patterned consumer; the lookup's answer names
identities, so it can never be a descriptor. It **can log in**, and reach `availability`, because
both answer an empty body that names nothing and `auth.md` authorizes a descriptor for `pull`
under a pattern (its resolved name-free-document decision, was Q23, and AC32; the resolved
login-and-availability decision below, was Q11, revising the login-scope decision, was Q7). A
credential holding only a patterned `push` still cannot log in, since login reports `pull` and a
descriptor is never authorized for `push`, so it is configured by the 6.4 environment variables or
the hand-written `authentication` entry, which AC12 asserts. Both routes pass `auth.md`'s sentinel
test by construction (their body is empty), and `internal/format/swift/scope_object_test.go` runs
it (`format-handler-interface.md` AC12). **A patterned `push` publishes**, because the object is in
the URL and is evaluated before a byte is read, so per-scope CI publish credentials are
expressible.

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines, the handler
answers `403` with an `application/problem+json` body, `Content-Version: 1`, and a `detail` naming the
policy and rule, or the signal for a coordinate condemned under the shared security-signal rule,
written through `WriteRefusal`, the refusal writer `format-handler-interface.md` places beside
`Deps` (its AC14), which on HTTP/1.1 also carries the condition in the status line's phrase
(`supply-chain-policy.md`'s resolved refusal-status-line decision, was Q10, its AC18); SwiftPM
prints the body's `detail`, not the phrase, so the phrase is for `curl` and the transcript here.
`403` rather than the existence rule's `404`, because the caller is authorized and the content is
what is refused. The version's release metadata, manifests and archive all resolve through the
policy-enforcing version resolution, so all three refuse. Unlike almost every sibling, **the reason
reaches the user**: SwiftPM fetches a selected version's release metadata before anything else of
it, and both pinned clients print the refusal verbatim at that step, "failed fetching acme.zztool
version 1.0.0 release information from {registry}: server error 403: refused by policy
'block-critical' (rule: cvss >= 9.0) ..." (captured on 5.10 and 6.4, and identically for a refused
manifest and a refused list). A `text/plain` body loses it ("forbidden"), and the archive route loses
it whatever the body, which is why the refusal must never be only an archive refusal. This satisfies
`supply-chain-policy.md` AC1's "error naming policy rather than a generic failure" on this format
through the client's own rendering rather than through a transcript, and that spec records the
finding as the counter-example to the reason-phrase risk its siblings confirmed ("Rendering a
refusal"). Its "When a refusal binds, per format" table carries Swift as `holds` on version routes
from these captures (its AC20), and each pinned client has one registry per scope with no fallback
host, so the row needs no egress precondition.

The release list itself is rendered without consulting policy, so a refused version is still listed
and the client selects it, fetches its release metadata and fails loudly naming the rule (the
resolved list-refusal decision below, `conda.md`'s precedent): a version that silently vanished from
the list would re-resolve every 6.4 consumer to an older release with no message at all, which is
exactly what the capture shows a list `problem` does.

### Integrity, signing and provenance

**Integrity is two layers, and neither is the lockfile.** Every download is checked against the
release metadata's `checksum`, and every download after the first on a machine is checked against the
fingerprint store: after a first resolve recorded `acme.zzcore 1.1.0`, the stub swapped the archive
and its advertised checksum together, and both clients refused with "invalid registry source archive
checksum '51f8...', expected 'b3f4...'", the expected value being the recorded one;
`--resolver-fingerprint-checking warn` downgraded it to "does not match previously recorded value"
(5.10, captured). The unqualified manifest's fingerprint is recorded beside the archive's in the
same store (captured). So coordinate immutability is not a courtesy
on this format: a registry that ever serves different bytes for a version breaks every machine that
fetched it, and one that serves different bytes to a machine that never fetched it is trusted
silently. The hosted rules above (no replacement, a retirement set, manifests stored byte-identical)
and the proxied rules below (verify before commit, never revalidate an immutable route) are what hold
it.

**SE-0391 signing** is the publisher's, over the source archive: a CMS `SignedData` in format
`cms-1.0.0`, detached, one signer, SHA-256 message digest, ECDSA P-256, the certificate (and
optionally its chain) embedded; the metadata document signed the same way; and each manifest signed
individually with the signature appended as its last line (`// signature: cms-1.0.0;{base64}`,
captured in the archive `publish` built) **before** the archive is built and signed. The client
validates according to its own `registries.json` security configuration: by default an unsigned
release and an untrusted signer each produce a warning and install (captured), under
`onUnsigned: error` an unsigned release is refused ("source archive from {registry} is not signed"),
under `onUntrustedCertificate: error` a signer outside the configured roots is refused ("the signer
SigningEntity[...] is not trusted"), with the root in `trustedRootCertificatesPath` it installs
silently, and a signature that does not verify is refused on both clients even under
`--disable-signature-validation` (all captured). The client also keeps publisher trust-on-first-use
per package under `~/.swiftpm/security/signing-entities/`, warning by default when the signer changes
(`PackageRegistryUsage.md`; both toolchains' help gives `--resolver-signing-entity-checking` a
default of `warn`).

This registry signs nothing and re-signs nothing (`signing-service.md` records this format in its
"Nothing, stated" row). It serves the signature it received in the release metadata's `signing`
block and in the archive's headers, on both paths.

### What artifact verification provides

The five requirements this format placed on
`docs/internal/plans/foundation/artifact-verification.md`, each now answered by that spec's CMS
entry and its Swift profile (its entry catalogue, "Swift", and AC15):

1. **A synchronous verification entry the handler reaches at ingest**, before the publish
   commits, taking the archive bytes, the detached `cms-1.0.0` signature, the metadata bytes with
   their signature, and each manifest's bytes, and returning valid or a reason. The handler reaches
   it through the `Verifier` consumer interface `Deps` carries (`format-handler-interface.md`, "The
   pinned method set"), declared beside `Deps` so the handler never imports `internal/verify`; the
   handler holds no certificate parser and no signature primitive. Swift is one of the ecosystems
   whose upload carries its own proof, so a `failed` answer refuses the write and nothing commits
   (that spec's "When verification runs").
2. **Validity rules the clients enforce**, so that nothing is stored that every client would refuse:
   a well-formed `SignedData` with exactly one signer, a SHA-256 digest over exactly the archive
   bytes, an ECDSA P-256 signature that verifies against the embedded certificate, the code-signing
   extended key usage on that certificate, a signed metadata document when the metadata was signed,
   every manifest signed when the archive is, and one signer across archive and manifests. Its AC15
   refuses each at ingest with `422` and nothing committed.
3. **Trust as a verdict, not a gate at ingest.** Whether the chain reaches a root the repository
   trusts is the repository's revisioned trust set, whose `x509-roots` entries are DER roots as the
   client's own `trustedRootCertificatesPath` is, with per-entry `certificateExpiration` and
   `certificateRevocation` options named as Swift names them; the answer is a verified, failed or
   absent verdict with chain `publisher` and the signing identity, which `supply-chain-policy.md`
   consumes (its AC15), so a repository rule can require a verified signature from a named identity
   (an `identity-policy` entry over the signing entity). A verdict under a superseded trust revision
   reads as absent. The trust set is administered through `management-api.md`'s
   `/api/v1/repositories/{name}/trust` routes and provisioned in cases through the harness's `trust`
   key (`artifact-verification.md` AC25).
4. **The signing entity** (common name, organisational unit, organisation, as the client prints it)
   is returned to the handler by the verifier and written into the version-level document, so the UI
   and the corpus can show what a client's publisher trust-on-first-use will record (`web-ui.md`'s
   version page shows it), and a change of signer between releases of one package is visible to the
   operator before a client warns about it.
5. **The same entry for proxied content** runs when a release is committed to a remote's cache, to
   produce the verdict; a failed trust records `failed` and refuses nothing by itself (a repository
   rule decides), because the client performs its own verification regardless (its AC15's remote
   half).

**Advisory coverage exists, keyed by Git URL.** OSV defines the `SwiftURL` ecosystem, "the name is a
Git URL to the source of the package", with PURLs `pkg:swift/{host}/{path}` (captured: seven
advisories for `github.com/vapor/vapor`, five for `github.com/apple/swift-nio`), and a query for a
registry identity such as `apple.swift-argument-parser` returns nothing. A Swift coordinate therefore
cannot be matched by name; it is matched through an **alias**: the bound repository URLs of its package
(Design, "The identifiers lookup") in the normalised `host/path` form OSV uses, with the release's
version as the version. Per the resolved advisory-alias decision below, the handler supplies those
aliases to the policy-enforcing version resolution. `supply-chain-policy.md` has adopted the keying
(its coverage table's Swift row matches on "the package's bound repository URLs", asserted by its
AC17), and how the aliases travel with a request's coordinate is a named input to
`format-handler-interface.md`'s scheduled re-open ("Route-scoped and URL-borne credential
declarations", which carries "Swift's request coordinate able to carry the aliases its identifiers
lookup binds"); a package with no bound URL has no advisory identity, which the operator sees on the
package, and an unbound claim never lends one, so a hijacked URL cannot launder another project's
advisories onto a package or away from it.

### The proxied path

The handler owns the request and classifies for the proxy layer's fetch-and-cache API per the settled
decisions in `proxy-cache.md`. The upstream is an SE-0292 registry base URL on
`upstream-adapters.md`'s `https` adapter, with an optional upstream credential of kind `bearer` or
`basic` (the adapter's own, presented to the root host only, never the client's; its AC6 and
AC19). It is validated at creation and `PATCH` by that spec's adapter rules alone: an unreachable
but well-formed upstream is accepted and no format probe runs inside the creation transaction (its
AC23, the finding `cargo.md` answered in its resolved sparse-only decision, was Q7 there). What
this spec first checked at configuration is therefore checked on the first upstream response the
handler receives: every SE-0292 response carries `Content-Version: 1`, which the service
specification requires and the Tuist registry sends, so an upstream response without it (an HTML
`404`, a missing header) is not adopted and the client's request answers `502` with a problem
document naming the requirement (AC21). The object-storage host an upstream's archives redirect to
(Tuist's presigned store) is an entry of the upstream's host allowlist with role `none`, which the
operator adds when creating the remote: the allowlist is empty by default, and a redirect to a
host absent from it makes no connection and returns `HostNotAllowedError`, rendered as a `502`
problem naming the host (`upstream-adapters.md` AC7). Per the resolved preconfigured-upstream
decision below, the Tuist registry stays user-configured in v1.

- **The release list is mutable metadata with a TTL.** On a miss or after the TTL the handler fetches
  it through fetch-and-cache and follows `Link` `rel="next"` to completion within a configured page
  bound, deriving each next request itself (never passing pages through, because 5.10 would see only
  the first; `upstream-adapters.md` names walking a paginated Swift release list as the handler's
  derivation, not the adapter's), and the handler parses
  the union of `releases`, keeps every entry's `problem` verbatim, and serves one unpaginated list whose
  `url` values and `Link` headers it **renders under this repository's externally visible base**:
  upstream `url` values are absolute or, on Tuist, root-relative paths that would otherwise resolve
  against this registry's host at a path it does not serve. The upstream's `canonical` and `alternate`
  repository links are passed through, because they name Git repositories, not the registry. Tuist
  sends `max-age=0` and no validator, so revalidation there is a full refetch at this repository's
  TTL, never at the upstream's zero; an upstream that sends an `ETag` is revalidated with it. The
  served list carries the remote's cache-scoped `Last-Modified`, never the upstream's, and a
  revalidation older than the adopted list by upstream `Last-Modified` is not adopted
  (`proxy-cache.md` AC22; `data-model.md` AC44).
- **Release metadata, manifests and archives are immutable** and cached indefinitely, because the
  service specification forbids a published release's resources to change and the fingerprint store
  punishes any change. Release metadata is served byte for byte (it names no registry URL); the handler
  renders its own `Link` headers. A manifest is served byte for byte, its `Link` alternates re-rendered
  under this base from the upstream's `filename` and `swift-tools-version` attributes, and a
  `swift-version` request is forwarded upstream normalised as the client sent it, an upstream `303`
  becoming this registry's `303` to its own unqualified manifest.
- **The archive is fetched stream-and-verify against the cached release metadata's `checksum`**
  (the release metadata is fetched first when a request reaches the archive before it, which no
  pinned client does), never committed on a mismatch or a truncated body. The adapter follows an
  upstream `303` to its allowlisted target (Tuist's presigned object-store URLs expire after 600
  seconds, captured), so the presigned target is never recorded as provenance or cached as a
  resolution and no `Location` reaches the client (`upstream-adapters.md` AC8). The signature
  headers of a signed archive are rendered from the cached release metadata's `signing` block
  rather than trusted from the redirect target.
- **Manifests carry no digest.** Nothing the upstream publishes lets a proxy verify a manifest before
  it has the archive, and resolution fetches manifests of many versions whose archives it never
  downloads, so manifests use `proxy-cache.md`'s **completion-only** fetch-and-cache mode (its resolved
  completion-only decision, was Q15, AC20) with a handler-supplied verifier that accepts a body the
  adapter reports complete whose first line is a `swift-tools-version` declaration, the attribute the
  handler parses anyway to render the `Link` alternates; a truncated or foreign body commits nothing.
  Once a version's archive is committed, the
  handler compares the cached manifests with the archive's own and records an operator-visible
  divergence on a mismatch, without changing the bytes clients have already fingerprinted.
- **`identifiers` is mutable metadata with the TTL**, forwarded with the query URL, its answer cached
  per normalised URL and served with the identities as the upstream spells them.
- **Missing coordinates are negatively cached** with the short TTL: an upstream `404` in any content
  type (Tuist answers `application/json` `{"message":"Not Found"}`) is normalised to this registry's
  problem document; a `429` or `5xx` is never cached as absence (`proxy-cache.md` AC9).
- **`availability` and login are answered by this registry**, never forwarded: they describe this
  registry and this credential.
- **Publish and every management operation against a `remote` repository answer `405`**
  (`management-api.md` AC7).
- **A cache refresh and a read-only remote behave as the shared layer defines**: "refresh now"
  (`management-api.md` AC29) marks the cached lists, `identifiers` answers and negative entries due
  (`proxy-cache.md` AC24), and a `read_only` remote fetches nothing and serves its cache
  (`proxy-cache.md` AC23).

Upstream removal maps onto `proxy-cache.md`'s event classes ("Upstream removal or replacement") as
Swift's side of that contract, each row naming its class:

| Upstream event, as observed at revalidation | Classification |
|---|---|
| A version gains or loses `problem` in the upstream list | **Ordinary metadata change** (as that table records Hex `retired` and Julia `yanked`), propagated verbatim at the next revalidation: the ecosystem's own withdrawal signal, which clients honour for new resolutions and forced pins ignore, as they do for a hosted unavailability; nothing is purged, because the cached release still serves forced pins exactly as the upstream's own routes would |
| A version vanishes from the upstream list | **Removal with no signal**: keep serving the cached release, record an operator-visible divergence and alert once; the wire carries no reason |
| The upstream list answers `404` where it previously existed | **Removal with no signal**: keep serving, record a divergence |
| An archive re-fetched after eviction disagrees with the cached release metadata's `checksum`, or the upstream's release metadata re-fetched after eviction advertises a different `checksum` | **Immutability violation, revision-bound**, as `terraform.md` and `puppet.md` apply that class: nothing purged, the new bytes never committed under the old coordinate, the cached release metadata kept as the one revision this registry serves (the release routes are never revalidated), and the operator alerted naming both digests, because every consumer that fingerprinted the old archive would otherwise be told this registry changed it |
| An upstream release metadata or archive answers `410` or `404` on a re-fetch after eviction | **Removal with no signal**: the coordinate cannot be re-materialised, so answer `404`, record a divergence, and keep the cached release metadata so that the removal is visible rather than silent |

Detection happens at revalidation, passively, per `proxy-cache.md`'s resolved passive-detection
decision (was Q12). Nothing on this wire is an explicit security signal: a `problem` is free text with
an HTTP status, and no registry standardises a malware marker in it. The active channel is the policy
engine's advisory feed through the `SwiftURL` alias above, which is the only channel that condemns a
Swift coordinate under the shared security-signal rule.

### Virtual repositories, and why Swift can have what Hex cannot

`hex.md` found virtual repositories impossible because every registry resource is signed under the
repository's own name and the client checks that name. Nothing a Swift registry serves names the
registry or is signed by it: the release list and metadata are unsigned JSON whose only URLs this
registry renders anyway, the signatures that exist are publishers' over archive bytes, and the client
verifies them against its own roots wherever the bytes came from. A `virtual` Swift repository is
therefore expressible and is served (the resolved virtual-repository decision below), and it is also
the natural answer to the per-host credential rule: one URL, one credential, every member.

The merge is **by package identity, first member wins**, not by version: for each canonical identity
the first member in order that has the package serves its list, release metadata, manifests and
archives, and no later member contributes versions to it. A merge by version would let a remote
member's newer release of `acme.zztool` shadow the private one the local member was placed first to
provide, and would mix two publishers' signatures under one identity, which the client's publisher
trust-on-first-use reports as a changed signer. `identifiers` answers from the first member that binds
the URL, and only with identities that member also wins. Publish and management operations against a
`virtual` repository answer `405`, as on every sibling. Nothing here is a generated document, so the
virtual is resolved per request through the members in order and no `index.merge` job exists for
it (`signing-service.md`'s merge obligations bind only formats that declare an `Indexer`).

### Capabilities and lifecycle

`Capabilities()` declares proxy support `supported`, reference-implementation availability
`available` (the compatibility suite's `PackageRegistryExample`, below), `Virtual: supported` (the
section above) and `Rename: supported`, the four fields `format-handler-interface.md` AC13 names.
Rename is supported because nothing stored names the repository: the release list, release
metadata and `Link` headers are rendered per request under the repository's current externally
visible base, the identifier bindings and display spellings live in documents bound to the
repository's identity, and the retirement set is core-held against that identity. A consumer
updates its `registries.json` mapping (`swift package-registry set`) to the new path; the per-host
credential, keyed by host and port, is unaffected; the fingerprint store records the registry URL
a version came from, and since the renamed repository serves byte-identical archives and
manifests no fingerprint can disagree, which AC25 asserts on a machine that fetched before the
rename rather than assuming how the store keys the new URL. The old name answers `not-found`
indistinguishably from a never-existing repository (`repository-lifecycle.md` AC12), which
requires `conformance/swift/rename_test.go`, enforced by the harness's case-set validator
(`conformance-harness.md` AC26); AC25 carries it with the real clients.

### Conformance, the two toolchains and the corpus

The two pinned toolchains are SwiftPM 5.10.1 and 6.4.0, the watersheds above, with 6.1.3 kept in the
corpus as the midpoint that locates each watershed: it shares 5.10's credential rules and
Basic-challenge hang, and 6.4's pagination and tools-6.x manifest handling. Every hosted and
proxied case runs on both. Three harness obligations are recorded because the captures found them the
hard way:

- **SwiftPM reads netrc and user-level configuration from the passwd home, not `$HOME`**, while its
  download cache follows `$HOME` (captured: `login` wrote `/root/.netrc` and
  `/root/.swiftpm/configuration/registries.json` with `HOME` set to the run directory). Cases therefore
  pass `--config-path`, `--security-path`, `--cache-path` and `--netrc-file` explicitly, all four of
  which both toolchains accept, rather than relying on the environment.
- **The shared download cache hides requests.** Every case that asserts a network-level fact clears
  or isolates `--cache-path` first; the forced-pin and TOFU captures were confounded by it until they
  did.
- **6.4's exit code is unreliable for `login` and `publish`** (the `_MultiHandle` abort). Those cases
  assert the transcript and the server state, and the defect goes on the exception list with the
  upstream issue filed when the case is written.

The official compatibility suite (`package-registry-compatibility` from
`swiftlang/swift-package-registry-compatibility-test-suite`, pinned by commit) runs as a second case
source against a hosted repository, the way `oci.md` runs the distribution-spec suite, with any check
it skips failing the run unless it matches a declared exception (`conformance-harness.md` AC21), and
every client container confined to the case network (its resolved client-confinement decision, was
Q6, AC23), the Tuist stand-in and its presigned-store stand-in declared as an `upstreams` entry and
its `hosts` sub-entry. The
recording session runs the pinned clients against the suite's `PackageRegistryExample` reference
server in a container pinned by digest for the hosted surface, and against the Tuist registry for the
proxied read surface; `Capabilities()` declares a reference implementation `available`. The recorded
surface, named now because a thin recording script yields a thin specification: a cold resolve of a
package with a transitive dependency on each toolchain, the 5.10 alternate-manifest fetch, a
prerelease pin, the identity-case variant, a paginated list, `--replace-scm-with-registry` and
`--use-registry-identity-for-scm`, `availability`, a missing package, a publish unsigned, signed and
without metadata, the duplicate refusal, login with a token and with a username, and the `401` on a
private read followed by the credentialed retry. Recording gates on the harness's redaction criterion
(`conformance-harness.md` AC13): the Bearer and Basic values, and the netrc the clients write, are
exactly what the allowlist must name. Every deliberate divergence from the reference server and from
Tuist (synchronous publish only, the Bearer challenge, `405` on remote and virtual writes, `410` for a
deleted release, the unbound-claim rule, the 6.4 abort) goes on the recorded exception list before its
flow is expected to replay.

## Acceptance Criteria

- [ ] AC1: `swift package resolve` of a package that depends through the registry on a second package
      resolves and builds from a hosted repository on both pinned toolchains (5.10.1 and 6.4.0) from
      fresh caches, and the transcript shows, per package, one release list, the release metadata
      before the manifest, one archive per selected version and, on 5.10.1 for a package whose
      `Package.swift` declares tools 6.1, the request `Package.swift?swift-version=5.9.0` answered
      with the bytes of `Package@swift-5.9.swift`; `Package.resolved` carries `kind: registry` pins
      at the published versions, the installed sources are byte-identical to the published archives,
      and every response carries `Content-Version: 1`.
- [ ] AC2: `swift package-registry publish {scope}.{name} {version}` on both toolchains, with a
      metadata file and without one, is answered `201` with a `Location` the client prints, in
      exactly one snapshot containing the archive, every root manifest file and the version-level
      document, with the release list serving the version before the response is sent; the release
      metadata then carries `checksum` equal to the CAS digest of the received archive, the
      metadata exactly as submitted (or `{}`), and `publishedAt`; the unqualified manifest's `Link`
      header lists each `Package@swift-*.swift` with its `filename` and `swift-tools-version`; and a
      fresh resolve on each toolchain installs exactly the published bytes.
- [ ] AC3: A publish of an existing version or of a version equal to one under SemVer precedence
      (`1.0.0+build.7` beside `1.0.0`) is refused with `409`, and a publish of a deleted version is
      refused `409` by the shared write path's central `retired` check, rendered as this format's
      problem document with `Content-Version: 1`, including after the deleting snapshot has aged
      out of retention and after a repoint to a snapshot older than the deletion; a version whose final identifier is
      `zip` or `json`, an archive with two top-level directories or no `Package.swift`, an invalid
      metadata document, and a signature part with another format are each refused with `422` naming
      the defect; an unauthenticated publish and a duplicate are refused before `100 Continue` with
      no body byte spooled; each client prints `server error {status}: {detail}`; and no refusal
      creates a snapshot.
- [ ] AC4: A manifest declaring `ACME.ZZTool` resolves the package published as `acme.zztool` on
      both toolchains; `swift package-registry publish ACME.ZZTool 1.0.1` into a repository holding
      `acme.zztool` lands in that package (and a duplicate version is refused `409`), never creating
      a second package; the release document's `id` is the first-published spelling; and a scope or
      name outside the grammars, or `/../x`, answers `404` with a problem document.
- [ ] AC5: `Package.swift?swift-version=5.9.0`, `?swift-version=5.9` and `?swift-version=5.9.0.0`
      each answer the bytes of `Package@swift-5.9.swift`, a `swift-version` with no matching alternate
      answers `303` to the unqualified manifest, every manifest served is byte-identical to the file
      in the archive including a signed manifest's final signature line, and a manifest nested below
      the archive's top-level directory is never advertised.
- [ ] AC6: Every response carries `Content-Version: 1`; JSON responses carry `application/json`
      and every error `application/problem+json` with `status`, `title` and `detail`; a request with
      no `Accept` or `*/*` is served as version 1, an unknown version is answered `400` and `v2` is
      answered `415`; the `.json` suffix routes answer as their unsuffixed forms; `HEAD` on each
      `GET` route answers the `GET`'s headers with no body; archive and manifest responses carry
      `Cache-Control: public, immutable`; the archive honours a `Range` request;
      and `availability` answers `200`, so a client configured with `supportsAvailability: true`
      resolves on both toolchains.
- [ ] AC7: `swift package resolve --replace-scm-with-registry` of a manifest naming
      `https://github.com/acme/zztool` resolves `acme.zztool` from the registry with `kind: registry`
      pins and no clone after one `identifiers?url=` lookup, and `--use-registry-identity-for-scm` deduplicates a graph naming it both
      ways, on both toolchains; `ssh://`, scp-style, `.git`-suffixed, trailing-slash and case-varied
      forms of the URL return the same identity; a second package claiming the bound URL is published
      but the lookup keeps answering the first, with the conflict visible to the operator; a
      `rebind` operation through the management API moves the answer in one snapshot and is refused
      with no snapshot to a principal lacking `push` on the identity it binds to or `delete` on the
      one it displaces; an unknown URL answers `404` and a missing `url` answers `400`.
- [ ] AC8: Two concurrent publishes of different versions into one package, and into two packages
      of one repository, both land, each in its own snapshot, with the list and the binding index
      enumerating both; two concurrent publishes of one coordinate yield exactly one `201` and one
      `409`; and repointing to the predecessor snapshot serves the previous release list.
- [ ] AC9: A `withdraw` operation through the management API is one snapshot after which the list
      carries the release's `problem`, a fresh 6.4.0 resolve selects the previous eligible version, a
      5.10.1 resolve pinned to it fails, and a `--force-resolved-versions` resolve on both still
      installs it; a `restore` clears it in one further snapshot; a `delete-version` is one snapshot
      after which the release metadata, manifests and archive answer `410` with the operator's
      reason, which both clients print at the release-information step, and the coordinate has a
      `Retirement` record and is refused on republication (AC3); a principal holding `push` without
      `delete` is refused all three operations with no snapshot, and each operation against a
      `remote` or `virtual` repository answers `405` `repository-type`.
- [ ] AC10: On a private repository a credential-less list, release, manifest or archive request
      answers `401` with `WWW-Authenticate: Bearer`, the challenge this format declares under
      `auth.md`'s uniform-challenge rule (its AC17), and a problem body, byte-identical for a private
      and a non-existent repository, and both toolchains exit non-zero within ten seconds printing
      "server error 401"; `swift package-registry login {base} --token` and `--username --password`
      reach `POST {base}` and succeed, after which every request carries `Authorization: Bearer` or
      `Basic` respectively; on 6.4.0 `SWIFTPM_REGISTRY_TOKEN` and the netrc alone each resolve with no
      login, and on 5.10.1 a hand-written `authentication` entry with a netrc resolves; a rejected
      token fails login and resolve with `401` and is never served as anonymous; a valid token lacking
      `pull` answers `404`, printed as "package not found on registry"; and a credential presented over
      a connection this registry did not terminate with TLS, driven from 6.4.0 with
      `--allow-insecure-http` and from 5.10.1 through a hand-edited `http://` entry, is refused per
      `auth.md` AC27.
- [ ] AC11: A consumer mapping two repositories of one registry host by scope resolves from both
      under one token carrying `auth.md`'s multi-repository opt-in, and fails the second repository
      with `404` under a single-repository token, on both toolchains; the same consumer pointing
      `[default]` at a virtual repository over both resolves with a single-repository token on that
      virtual repository.
- [ ] AC12: A token holding only `pull` under the pattern `acme/**` resolves `acme.zztool` and its
      dependency `acme.zzcore` through real resolves on both toolchains, including when the manifest
      spells the identity `ACME.ZZTool`, and is refused `other.zztool`'s list, release, manifest and
      archive and the `identifiers` lookup (6.4.0 falling back to Git, asserted from its output),
      while `swift package-registry login` and `availability` succeed under it, both reported as
      `pull` descriptors that pass the sentinel test; a token holding only `push` under the same
      pattern is refused login, is configured without it, publishes `acme.zztool` and is refused
      `other.zztool` before `100 Continue` with no snapshot created; and in proxied mode the
      patterned `pull` token resolves an in-pattern package and is refused another.
- [ ] AC13: A version the shared policy layer refuses answers `403` through `WriteRefusal` with a
      problem document naming the policy and rule and `Content-Version: 1` on its release metadata,
      manifest and archive, on the hosted and the proxied path, the status line carrying the
      `Refused by policy:` phrase on HTTP/1.1, while the release list still lists it; a real resolve that selects it exits non-zero on
      both toolchains printing `server error 403:` followed by the policy name at the
      release-information step; and a coordinate condemned by a case-controlled advisory is refused
      the same way with no upstream request.
- [ ] AC14: A publish signed with `--private-key-path` and `--cert-chain-paths`, carrying
      `source-archive-signature` and `metadata-signature` parts that are `cms-1.0.0` `SignedData`, is
      accepted after the CMS entry's Swift profile verifies it through `Deps`' `Verifier`, its
      release metadata carries the `signing` block and its archive the two signature headers; a client whose `trustedRootCertificatesPath` holds the
      signing root and whose configuration
      sets `onUnsigned` and `onUntrustedCertificate` to `error` installs it with no warning on both
      toolchains, while the same client without the root refuses it as untrusted; a publish whose
      archive signature does not verify, whose manifests are unsigned while the archive is signed, or
      whose manifests carry another signer is refused `422` with no snapshot; the signing entity is
      recorded on the version; the verdict is `verified` with chain `publisher` when the signing root
      is in the repository's trust set (provisioned through the `trust` key) and `failed` when it
      is not, the publish committing in both cases; and a repository rule requiring a verified
      signature refuses an unsigned version at resolution.
- [ ] AC15: No operation on a hosted repository makes a coordinate serve different archive or manifest
      bytes: after a client has fetched a version into its fingerprint store, a republish, a delete
      followed by a republish, and a backwards repoint followed by a republish are each refused, and a
      fresh resolve on the same machine installs the original bytes with no fingerprint error, on both
      toolchains.
- [ ] AC16: A remote repository bound to a stand-in serving recorded Tuist responses (root-relative
      `url` values, no `metadata`, no `ETag`, archives answered `303` to a presigned stand-in URL that
      expires, on a host the remote's allowlist names with role `none`, and one version whose final
      identifier is `zip`) serves both toolchains a resolve from
      fresh caches, the `zip`-suffixed version's two routes told apart by `Accept` (`+zip` to the
      archive); the served list's `url` values and
      `Link` headers are absolute under this repository's base, no response carries an upstream
      `Location` or host, the archive was verified against the cached `checksum` before commit and is
      byte-identical, the presigned target is never recorded as provenance, a remote whose allowlist
      lacks the store's host answers the archive `502` naming the host with no connection made to
      it, and a second resolve from fresh client caches reaches this registry while the upstream
      receives no request, asserted at the network layer.
- [ ] AC17: A proxied release list is revalidated after its TTL and not before, a version published
      upstream becomes visible to a resolve after the TTL and, absent an explicit refresh, not before,
      and an upstream `ETag` is used when offered; release metadata, manifests and archives are never
      revalidated; every served list carries the remote's cache-scoped `Last-Modified`, never the
      upstream's; and a paginated upstream list is followed through its `rel="next"` links to
      completion and served as one unpaginated list, from which 5.10.1 resolves the version found on
      the upstream's last page.
- [ ] AC18: A stand-in archive whose bytes disagree with the advertised `checksum`, or whose body is
      truncated, is never committed to the CAS and attaches no cached reference, the client receives
      the same failure it would from a corrupt upstream, and the real reason is recorded observably
      to the operator; a manifest is cached through the completion-only mode only after a complete
      body whose first line declares `swift-tools-version`, a truncated or foreign body committing
      nothing, and a cached manifest that disagrees with its later-committed archive records a
      divergence without changing the served bytes.
- [ ] AC19: A package the upstream lacks answers `404` with a problem document whatever the
      upstream's error body, and is negatively cached, so a second request within the negative TTL
      makes no upstream request; an upstream `429` or `5xx` is neither cached as absence nor surfaced
      as not-found and succeeds as soon as the upstream recovers.
- [ ] AC20: An upstream `problem` appearing on or clearing from a version is propagated at the next
      revalidation with no divergence recorded, a forced pin to that version still installing from the
      cache; a version vanishing from the upstream list, or the list answering `404`, keeps serving with
      a divergence recorded; and an archive re-fetched after eviction that disagrees with the cached
      `checksum` is not committed, nothing is purged, and the operator alert names both digests:
      Swift's side of `proxy-cache.md`'s event classes (its AC13).
- [ ] AC21: Creating a remote repository whose upstream is a well-formed `https://` root succeeds
      with no upstream request inside the creation (`upstream-adapters.md` AC23); an upstream
      response lacking `Content-Version: 1` (an HTML `404`, a missing header) is never adopted and
      the client's request answers `502` with a problem document naming the requirement, which both
      toolchains print; configuring a virtual repository of format `swift` is accepted; and publish
      and every management operation against a remote or virtual repository answer `405`, which both
      toolchains print as `server error 405:`.
- [ ] AC22: A virtual repository over a local member holding `acme.zztool` 1.0.0 and a remote member
      whose upstream offers `acme.zztool` 2.0.0 and `apple.swift-argument-parser` serves the local
      package's list alone for `acme.zztool` and the remote's for the other, a resolve on both
      toolchains installing the local 1.0.0 and the upstream package, whatever the identity's case;
      and its `identifiers` answer comes from the first member that binds the URL.
- [ ] AC23: A case-controlled OSV advisory in the `SwiftURL` ecosystem for `github.com/acme/zzcore`
      condemns the versions of the package bound to that URL, on the hosted and the proxied path, and
      a policy rule on it refuses them at resolution; the same advisory does not match a package whose
      claim on that URL is unbound; and a package with no bound URL is shown to the operator as having
      no advisory identity.
- [ ] AC24: Replay-match passes against a corpus recorded from the pinned reference server and the
      Tuist registry covering the recorded surface named in Design, and the pinned compatibility suite
      passes against a hosted repository with every skip matching a declared exception.
- [ ] AC25: `Capabilities()` declares proxy `supported`, reference implementation `available`,
      `Virtual: supported` and `Rename: supported`; after a rename, both toolchains resolve from the
      new name with byte-identical release documents, manifests and archives, a machine that
      fetched a version before the rename resolves it afterwards with no fingerprint error, the
      identifiers lookup answers the same bindings, the old name answers `not-found`
      indistinguishably from a never-existing repository, and a coordinate retired before the
      rename is still refused.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/swift/hosted_test.go` (both pinned images; `--cache-path`, `--config-path`, `--security-path` and `--netrc-file` isolated in setup, because the client reads netrc and user configuration from the passwd home and ignores `$HOME` for them; transcript assertions per route and order; `Package.resolved` parsed; source byte comparison; the tools-6.1 fixture with its 5.9 alternate) |
| AC2 | conformance + integration | `conformance/swift/publish_test.go` (publish with and without metadata on each toolchain, asserted from the transcript and the server state because of the 6.4 abort; fresh-cache resolve and byte comparison); `internal/format/swift/publish_test.go` (snapshot count and content set, head-snapshot visibility before the response, `checksum` equal to the CAS digest, `Link` alternates) |
| AC3 | conformance + integration | `conformance/swift/publish_test.go` (duplicate, precedence-equal and deleted-version publishes through real clients, the deleted version seeded through `state` with its `Retirement` record; early `401` and `409` before `100 Continue` asserted from the transcript); `internal/format/swift/immutability_test.go` (the central `retired` refusal rendered with `Content-Version: 1` after pruning under an injected clock and across a backwards repoint, sharing `internal/manage/retirement_test.go`'s interleavings, `management-api.md` AC12; `.zip` and `.json` suffix versions; archive, metadata and signature-format refusals; spool counter at zero for early refusals) |
| AC4 | conformance + unit | `conformance/swift/identity_test.go` (mixed-case manifest and publish on both toolchains; second-package absence asserted through the management API); `internal/format/swift/identity_test.go` (grammar table, canonical folding, display spelling, traversal) |
| AC5 | conformance + unit | `conformance/swift/manifest_test.go` (5.10 alternate fetch; `curl` for each `swift-version` form and the `303`; signed-manifest byte comparison); `internal/format/swift/manifest_test.go` (numeric equivalence table, nested-manifest exclusion) |
| AC6 | conformance + unit | `conformance/swift/negotiation_test.go` (`curl` across `Accept` values, `.json` routes, `HEAD`, `Range`; `supportsAvailability: true` resolve on both); `internal/format/swift/headers_test.go` (`Content-Version` on every route including every error path) |
| AC7 | conformance + integration | `conformance/swift/identifiers_test.go` (both SCM flags on both toolchains, URL variants, conflicting claim, `rebind` driven from the case `script` through the management endpoint); `internal/format/swift/binding_test.go` (normalisation table, first-claimant rule, rebind snapshot, the two-action refusal sharing `internal/manage/authz_test.go`'s `rebind` case, `management-api.md` AC4) |
| AC8 | integration | `internal/format/swift/concurrent_publish_test.go` (two writers per shape, revision-token retry, predecessor repoint) |
| AC9 | conformance + integration | `conformance/swift/unavailable_test.go` (`withdraw`, `restore` and `delete-version` driven from the case `script` through the management endpoint, the case-set validator requiring one per declared kind, `conformance-harness.md` AC26; 6.4 re-resolve, 5.10 pinned failure and forced installs on both asserted from output and `Package.resolved`; `410` rendering); `internal/format/swift/manage_test.go` (one snapshot per operation, the `Retirement` record, `push`-only refusal sharing `management-api.md` AC9's action table, `405` `repository-type` on remote and virtual) |
| AC10 | conformance + integration | `conformance/swift/auth_test.go` (private repository on both toolchains; challenge equality across existing and missing repositories; no-hang bound on 5.10; login with token and with username; 6.4 environment and netrc-only; 5.10 hand-written entry; rejected and `pull`-less tokens); `internal/format/swift/auth_test.go` (plaintext refusal under `auth.md` AC27, Bearer challenge on every `401`) |
| AC11 | conformance | `conformance/swift/per_host_test.go` (two scope-mapped repositories with a multi-repository token through the `credentials` key, and with a single-repository token; virtual alternative) |
| AC12 | conformance + unit | `conformance/swift/auth_test.go` (the pattern-refusal case `auth.md` AC8, `format-handler-interface.md` AC7 and `conformance-harness.md` AC22 require, in both modes; pattern-scoped tokens provisioned through the `credentials` key; the patterned `pull` token's login and `availability`, the patterned `push` token configured without login; reads on both toolchains, the 6.4 Git fallback, patterned publish before `100 Continue`); `internal/format/swift/scope_object_test.go` (the object table per route with case-folded objects and the sentinel test on login and `availability`, `format-handler-interface.md` AC12, `auth.md` AC32) |
| AC13 | conformance | `conformance/swift/policy_test.go` (hosted and proxied modes; rules through the `policies` key, a controlled advisory through `advisories`; both toolchains' output asserted to contain the policy name; the raw status line read from the socket; list still listing the version); the phrase shares `internal/format/refusal_writer_test.go` (`supply-chain-policy.md` AC18) |
| AC14 | conformance + integration | `conformance/swift/signing_test.go` (signed publish with the fixture chain; the repository's trust set through the `trust` key; strict client configuration with and without the root on both toolchains; tampered signature, unsigned manifest and mismatched signer publishes; shares `conformance/swift/signed_publish_test.go`'s fixtures with `artifact-verification.md` AC15); `internal/format/swift/signing_test.go` (the `Verifier` called before commit, signing entity recorded, verified and failed verdicts, verdict consumed by a policy rule) |
| AC15 | conformance + integration | `conformance/swift/tofu_test.go` (a first resolve into an isolated `--security-path`, then republish, delete-and-republish and repoint-and-republish attempts, then a fresh resolve on the same security path on both toolchains); `internal/format/swift/immutability_test.go` (the refusals under repoint) |
| AC16 | conformance + integration | `conformance/swift/proxied_test.go` (Tuist stand-in built from the recorded responses, including an expiring `303` target served on a `hosts` stand-in; both toolchains; network-level assertion from fresh caches; byte comparison; no upstream host in any response; the allowlist-less variant refused with no connection); `internal/format/swift/proxied_render_test.go` (URL and `Link` rendering from root-relative and absolute upstream values) |
| AC17 | conformance + integration | `conformance/swift/proxied_ttl_test.go` (mutating stand-in with and without `ETag`; a paginated stand-in; upstream request counts at the network layer); `internal/format/swift/proxied_freshness_test.go` (cache-scoped `Last-Modified`; shares `internal/proxy/freshness_test.go`'s assertions, `proxy-cache.md` AC22) |
| AC18 | integration | `internal/format/swift/proxied_integrity_test.go` (mismatched and truncated archives; completion-only manifests with the `swift-tools-version` verifier, truncated and foreign bodies; the manifest-archive divergence; CAS and reference assertions; operator record) |
| AC19 | conformance | `conformance/swift/proxied_test.go` (missing identity with the stand-in's JSON `404`, throttling and server-error stand-in responses, network-level counts) |
| AC20 | integration | `internal/format/swift/removal_test.go` (stand-in presenting each event class; the shared-layer half is `proxy-cache.md` AC13's) |
| AC21 | integration + conformance | `internal/format/swift/upstream_first_request_test.go` (creation with no upstream request; HTML `404` and missing-header responses answered `502` on the first request; virtual accepted); `conformance/swift/remote_write_test.go` (publish against remote and virtual repositories on both toolchains) |
| AC22 | conformance + integration | `conformance/swift/virtual_test.go` (local plus remote members; both toolchains; case-varied identity); `internal/format/swift/virtual_merge_test.go` (package-level shadowing, identifiers from the first binding member) |
| AC23 | integration + conformance | `internal/format/swift/advisory_alias_test.go` (alias supplied to the policy-enforcing resolution for bound URLs only; no-identity marking); `conformance/swift/policy_test.go` (the advisory case in both modes) |
| AC24 | conformance | `conformance/swift/replay_test.go`; `conformance/swift/compat_suite_test.go` (the pinned compatibility suite as an external case source) |
| AC25 | unit + conformance | `internal/format/capabilities_test.go` (this handler's four declarations, `format-handler-interface.md` AC13); `conformance/swift/rename_test.go` (both toolchains against the renamed repository, one isolated `--security-path` spanning the rename, byte comparison, identifiers answer, old name `not-found`, a pre-rename retirement still refused; required by `repository-lifecycle.md` AC12) |

The case set needs only keys already in the harness's closed `setup` vocabulary (its resolved
closed-vocabulary decision, was Q4): `repositories` with their visibility and type, including a
`virtual` over a local and a remote member; `credentials`, including a pattern-scoped token and a
multi-repository token; an `upstreams` stand-in serving recorded Tuist responses, a paginated
variant, an `ETag` variant and an expiring-redirect object server; `state` for pre-published,
pre-signed, unavailable and deleted versions (a deleted one with its `Retirement` record) and a
bound URL; `trust` for the repository's `x509-roots` (`artifact-verification.md` AC25); and
`policies` with `advisories` for AC13 and AC23. A signed `state` entry is seeded with the fixture
signature and manifests exactly as a publish would store them; the seed path does not call the
verifier, so a case asserting a verdict (AC14) publishes through the real client instead of
seeding. The `upstreams` entry's `hosts` sub-entry names the presigned-store stand-in
(`conformance-harness.md` AC23). The issued credential reaches the clients as a netrc file passed
with `--netrc-file` plus an `authentication` entry in the configuration passed with
`--config-path`, and as `SWIFTPM_REGISTRY_TOKEN` on 6.4. The runner-enforced obligations, both
modes, the unauthenticated, unauthorized and pattern-refusal cases in each, a `script` case per
declared management kind and `rename_test.go` (`conformance-harness.md` AC22, AC26), apply from
the sibling specs and are not restated per criterion here.

## Implementation Phases

### Phase 1: Hosted reads, identity and negotiation
- The format-first mount, the release list, release metadata, manifests with alternates and the
  numeric `swift-version` match, archives with their headers and ranges, `availability`, the `.json`
  and `HEAD` forms, `Content-Version` and problem documents on every path, canonical identity with
  display spelling, the Bearer challenge and scope mapping with case-folded objects and the two
  descriptor routes, the login route, the `403` policy rendering through `WriteRefusal`, and
  `Capabilities()` with the rename case (AC25), all against `state`-seeded versions

### Phase 2: Publish, bindings and management
- The multipart publish with refusals before `100 Continue`, archive and manifest extraction,
  metadata validation, immutability with precedence equality and the retirement set, the
  identifiers lookup with first-claimant bindings, and the write-boundary declaration exercised under
  concurrency
- Signed publish and the signing entity through the CMS entry's Swift profile: waits on
  `docs/internal/plans/foundation/artifact-verification.md` reaching `planned` (Blocking
  preconditions; AC14)
- The `Operator` interface declaring `withdraw`, `restore`, `delete-version` and `rebind`: waits on
  `docs/internal/plans/foundation/management-api.md` reaching `planned` (Blocking preconditions; AC9
  and the rebind half of AC7)

### Phase 3: Proxied path and virtual repositories
- The first-response `Content-Version` check, the list fetched across pages by the handler's own
  derivation and rendered under this base with the cache-scoped `Last-Modified`, immutable release
  metadata, manifests through the completion-only mode, stream-and-verify archives with allowlisted
  redirects followed in the adapter, the identifiers pass-through, negative caching, the removal
  table by event class, `405` on remote writes, and the per-package virtual resolution; waits on
  `docs/internal/plans/foundation/upstream-adapters.md`'s `https` adapter for redirect following
  and upstream credentials

### Phase 4: Advisories, corpus and gate
- The `SwiftURL` advisory alias through the policy-enforcing resolution, the recording session against
  the pinned reference server and the Tuist registry (after the harness redaction gate), replay-match,
  the compatibility suite as a case source, and the exception-list entries named in Design

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. The ten questions this draft raised were each written in the template's decision shape and
then adopted at their own recommendation under the owner's standing delegation of 2026-09-26, so the
loop can continue; each is recorded below as adopted rather than decided, folded through Scope,
Design, the criteria and the Test Plan in the same pass, and reversible by the owner at any time.
The 2026-09-28 reconciliation with the foundation wave adopted an eleventh on Opus (was Q11), which
revises Q7 now that `auth.md` has a descriptor kind, and added landing notes to the records the
foundation specs answered. `grep -rn "standing delegation"` is the owner's review queue.

### Resolved: synchronous publication only (was Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: every publish is answered
`201` or refused; `Prefer: respond-async` is ignored and no status resource exists (Scope; Design,
"The publish path"; AC2).

The question: the service specification lets a server answer `202` with a status resource the client
may poll, both clients send `Prefer: respond-async` on every publish, and the charter builds an
asynchronous-operations subsystem at step 6a that this format could use.

**Recommendation:** A. Neither pinned client polls: on `202` both print the status URL and exit `0`
(captured three times on each), so a pipeline that publishes and then resolves would race the
registry, and a failed asynchronous validation would surface nowhere a publisher looks. Validation
here is bounded (a Zip directory read, a JSON schema, a signature verification), so the synchronous
latency is small.

| Option | You get | It costs |
|---|---|---|
| **A. Synchronous only** | A publish that exits `0` means the release exists; no dependency on the asynchronous subsystem | The `Prefer` header is ignored; a very large archive holds the connection for its validation |
| **B. Honour `Prefer: respond-async`** | Long validations off the request path | Every pinned client exits `0` before the release exists, and failures are invisible to them |
| **C. Asynchronous for signed publishes only** | Verification latency off the path | Two behaviours for one command, and the same invisible failures for exactly the publishes that need verification |

**Why this is yours:** it picks the semantics a CI pipeline will build on and declines a shared
subsystem this format could have used.

Accepted cost: the header is ignored, recorded on the exception list.

### Resolved: which action unavailability requires (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: marking a release unavailable
and restoring it require `delete`, as deletion does; a rebind requires `push` on the identity it binds
to and `delete` on the one it displaces (Design, "Unavailability and deletion are management
operations"; AC9).

The question: `auth.md` maps removal-class operations to `delete` and metadata changes to `push`;
`hex.md` placed retirement under `push` because both Hex resolvers still select a retired version,
and `pypi.md` placed its yank under `delete`. Swift's unavailability is a metadata change whose
effect must decide it.

**Recommendation:** A. The capture shows a list `problem` removes the version from every non-forced
resolution, including one already pinned (5.10 fails the pin, 6.4 silently moves it), which is a
removal by effect and stronger than PyPI's yank; `auth.md`'s own rule then puts it under `delete`.

| Option | You get | It costs |
|---|---|---|
| **A. `delete` for unavailability and restore** | The vocabulary applied by effect; a CI key that publishes cannot withdraw releases | A publisher's own key cannot withdraw its own bad release without the removal-class grant |
| **B. `push`, as Hex's retirement** | Publishers withdraw their own releases | A publish credential can re-pin every consumer of a package to an older release |

**Why this is yours:** it places an ecosystem's operation on a vocabulary you settled, an input to the
reconciliation `management-api.md` owes.

Accepted cost: one more row for that reconciliation, recorded in the sibling consequences. That
reconciliation has landed: `management-api.md` places the `withdraw` kind, Swift
unavailability by name, under `delete` by the same effect rule (its resolved withdraw-action
decision, was Q1, and AC9), and its `rebind` kind carries exactly the two-action rule adopted here.

### Resolved: identifier bindings bind on first publication (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the first release claiming a
normalised repository URL binds it to its package; a later conflicting claim is recorded as unbound
and not served; the management API rebinds (Design, "The identifiers lookup"; AC7, AC23).

The question: the `identifiers` lookup is served from publisher-supplied `repositoryURLs`, SwiftPM
replaces a Git dependency with whatever identity it returns, and the specification leaves ownership
validation to the server.

**Recommendation:** A. It closes the capture of a Git URL by any holder of `push` without refusing
anyone's code, it needs no external proof of repository ownership (which this registry has no
standing to demand of arbitrary hosts), and it gives the advisory alias a binding it can trust.

| Option | You get | It costs |
|---|---|---|
| **A. First claimant binds; conflicts unbound; management rebind** | No URL hijack through a publish; forks still publish | A legitimate new owner of a URL needs an operator rebind |
| **B. Serve every claim** | Nothing to manage | Any `push` holder redirects every consumer bridging that URL to their package |
| **C. Operator-approved bindings only** | Nothing served that an operator did not approve | Every new package's SCM bridge is dark until an operator acts |
| **D. Verify ownership against the Git host** | The strongest claim | A second protocol's egress and a proof scheme no Git host standardises |

**Why this is yours:** it is a trust decision about what a publish credential can make other
consumers install.

Accepted cost: the conflict record and the rebind operation.

### Resolved: policy-refused versions stay listed (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the release list is rendered
without consulting policy and the refusal bites at the version's release metadata, manifests and
archive (Design, "Policy refusals on the wire"; AC13).

The question: the list's `problem` mechanism would let the handler mark a refused version so the client
routes around it, which the capture shows the clients do.

**Recommendation:** A, `conda.md`'s precedent with a stronger reason here: the refusal on the release
metadata is printed verbatim with the policy's name by both clients, whereas a listed `problem` makes 6.4
re-resolve to an older release with no message at all, and marking it would put a policy evaluation per
version into every list render.

| Option | You get | It costs |
|---|---|---|
| **A. List unaware of policy; refuse at the version's routes** | A loud failure naming the rule, on both toolchains | A resolve fails rather than choosing an allowed version |
| **B. Render refused versions with a `problem` in the list** | Clients route around the refusal | A silent downgrade on 6.4, a pinned failure with no reason on 5.10, and a policy evaluation per version per list |

**Why this is yours:** it trades an automatic route-around for a failure that says why.

Accepted cost: the failing resolve, which names the rule.

### Resolved: virtual repositories and the merge rule (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: `virtual` Swift repositories are
served, merged by package identity with the first member winning (Scope; Design, "Virtual repositories";
AC11, AC21, AC22).

The question: `hex.md` refused virtual repositories because its payloads are signed under a repository
name; Swift's are not, so the merge is possible and its rule is a product choice.

**Recommendation:** A. Nothing the client verifies names the registry, the per-host credential rule
makes one URL the natural consumption shape, and member order is `data-model.md`'s only failover
mechanism, so first-member-wins by identity is the rule already settled for content, which `cran.md`
applied the same way for the same dependency-confusion reason.

| Option | You get | It costs |
|---|---|---|
| **A. Serve virtual repositories; first member wins per identity** | One URL and one credential over private and proxied packages; private builds shadow public ones | A private package hides every upstream version of the same identity |
| **B. Merge by version across members** | Upstream versions a private member lacks are visible | A newer upstream release silently shadows the private one, and two publishers' signatures under one identity |
| **C. Refuse virtual repositories** | No merge | Consumers juggle scope mappings under one host credential |

**Why this is yours:** it decides a shadowing rule users will read as a promise.

Accepted cost: the shadowing is total per identity, which the documentation states.

### Resolved: the Tuist registry as a preconfigured upstream (was Q6)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: the Tuist public registry is
user-configured in v1 and not added to the preconfigured set; the trigger for revisiting is the
catalogue's Tier 2 verdict, through `proxy-cache.md`'s own extension mechanism (its resolved
preconfigured-set extension, was Q14), which left crates.io, pub.dev, repo.hex.pm and CRAN on the same
footing (Design, "The proxied path").

**Recommendation:** B, for sequencing rather than effort: Swift is Tier 2 and built only if the breadth
gate says so, and a third-party service whose terms and continuity this project has not assessed is a
weaker default than a language's official index.

| Option | You get | It costs |
|---|---|---|
| **A. Preconfigure the Tuist registry now** | A public Swift cache in thirty seconds | A sibling decision reopened from a Tier 2 spec, for a third-party service |
| **B. User-configured in v1, revisited on the Tier 2 verdict** | No sibling amendment | No nightly run against the real upstream until the revisit |

**Why this is yours:** it amends a set you priced for three upstreams, a product and sequencing call.

Accepted cost: the proxied cases run against a stand-in only; the real registry is exercised by the
recording session. `proxy-cache.md`'s second extension (was Q17) since added api.nuget.org and
repo.maven.apache.org only, leaving this record's footing unchanged.

### Resolved: the login route reports `pull` with no object (was Q7)

**Revised 2026-09-28 by the resolved login-and-availability decision below (was Q11)**, which makes
login and `availability` `pull` descriptors now that `auth.md` has the kind whose absence this
record priced; the record stands as the reasoning that decision revises.

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: `POST {base}` reports `pull` on
the repository with object `none`, so a patterned or push-only credential cannot log in and is
configured by environment or by hand (Design, "Authentication" and "Addressed objects"; AC10, AC12).

The question: the login route authorizes nothing by itself, but `Scope(r)` must report an action and an
object, and `hex.md` settled that identity routes report `none` rather than inventing an
authentication-only kind.

**Recommendation:** A. It follows `hex.md`'s resolved identity-route decision exactly, invents no object
kind, and costs little here because both recipes that avoid login were captured working (6.4's
environment variables; 5.10's hand-written `authentication` entry with a netrc).

| Option | You get | It costs |
|---|---|---|
| **A. `pull`, `none`** | No new object kind; one rule with Hex | Patterned and push-only credentials use the environment or a hand-written entry |
| **B. Authentication-only, no scope** | `login` works for every credential | A third object kind `auth.md` does not have, decided by a handler |
| **C. `push` when the token holds only `push`** | Publish-only tokens can log in | An action chosen per credential, which `Scope(r)` cannot express |

**Why this is yours:** it accepts a recipe limitation rather than bending a settled security rule.

Accepted cost: the documented alternative recipe.

### Resolved: OSV advisories bind through the package's bound URLs (was Q8)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the handler supplies a Swift
coordinate's bound repository URLs, normalised to OSV's `SwiftURL` form, as advisory aliases to the
policy-enforcing resolution; a package with none has no advisory identity (Design, "Integrity, signing
and provenance"; AC23).

The question: OSV covers Swift only under Git URLs, so a registry identity matches nothing by name, and
the only link between the two is the publisher's claim.

**Recommendation:** A. It gives Swift real advisory coverage, and the first-claimant binding makes the
alias as trustworthy as the lookup that SwiftPM itself acts on, so a hijacked claim can neither import
nor shed another project's advisories.

| Option | You get | It costs |
|---|---|---|
| **A. Aliases from bound URLs** | Advisory rules bind for every package with a bound URL | A requirement on the policy path and the interface re-open; unbound packages are unmatched |
| **B. Declare advisory rules unbindable for Swift** | No new requirement | No vulnerability policy on the format at all, refused at configuration per `supply-chain-policy.md` AC11 |
| **C. An operator-maintained identity-to-URL map** | Precise matches | A second binding table to keep in step with the first |

**Why this is yours:** it decides whether this format has vulnerability policy, at the price of a
cross-spec requirement.

Accepted cost: the sibling requirement, and the operator-visible "no advisory identity" state.
`supply-chain-policy.md` has adopted the keying (its coverage table's Swift row, AC17), and the
alias's passage with the request coordinate is a named input to `format-handler-interface.md`'s
scheduled re-open.

### Resolved: signature validity at publish, trust as a verdict (was Q9)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a signature that is malformed,
does not verify, or disagrees between archive and manifests is refused at publish with `422`; whether
the signer is trusted is a verdict the policy engine consumes, never an ingest refusal (Design, "What
artifact verification provides"; AC3, AC14).

The question: SE-0391 has the registry validate the signature and the chain "meets registry policy",
and the client independently refuses an invalid signature and treats trust per its own configuration.

**Recommendation:** A. Nothing is stored that every client refuses (the capture shows an invalid
signature is unrecoverable client-side, even with validation disabled), and trust stays where
`supply-chain-policy.md` put signature state, as a verdict a repository rule may require, rather than a
second trust gate inside publish.

| Option | You get | It costs |
|---|---|---|
| **A. Refuse invalid at publish; trust as a verdict** | No uninstallable releases; one home for trust policy | Signed publish waits on artifact verification |
| **B. Store signatures unverified** | No dependency on the producer | Releases every client refuses, discovered by consumers |
| **C. Refuse untrusted signers at publish** | A registry that holds only trusted signatures | Trust policy in two places, and a repository cannot accept a signer before its root is configured |

**Why this is yours:** it sets what a signed publish promises and where trust is decided.

Accepted cost: the Phase 2 precondition on artifact verification. The precondition is
`artifact-verification.md`'s CMS entry and its Swift profile (its AC15), which
refuses the validity failures at ingest and records trust as a verdict exactly as adopted here.

### Resolved: the `401` challenge is Bearer (was Q10)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: every `401` this handler causes
carries `WWW-Authenticate: Bearer realm="{externally visible base}"` with a problem body, byte-identical
across private, missing and foreign repositories (Design, "Authentication"; AC10).

The question: the siblings answer `401` with a Basic challenge, and 5.10 and 6.1 hang on one when they
hold no credential.

**Recommendation:** A. It keeps a challenge header, so the response stays uniform and self-describing
for `curl`, while every pinned client returns at once (captured with Bearer and with no challenge); a
Basic challenge would turn a missing credential into a CI job that never ends.

| Option | You get | It costs |
|---|---|---|
| **A. Bearer challenge** | No hang; a uniform, self-describing `401` | A per-format challenge the shared layer must allow |
| **B. No challenge header** | No hang | A `401` without the header RFC 9110 requires |
| **C. Basic, as the siblings** | One challenge everywhere | 5.10 and 6.1 hang until killed |

**Why this is yours:** it asks the shared auth layer for a per-format exception, captured as necessary.

Accepted cost: the sibling amendment to `auth.md`, recorded in the sibling consequences. No
amendment turned out to be needed: `auth.md`'s uniform-challenge rule already makes the
challenge a per-format declaration it emits identically (its AC17); naming Swift in that rule's
list, and adding the `swift` client row, are reported to that spec.

### Resolved: login and `availability` as `pull` descriptors (was Q11)

**Adopted 2026-09-28 under the owner's standing delegation**, on Opus during the foundation-wave
reconciliation. Option A: `POST {base}` and `GET {base}/availability` report `pull` on a
**descriptor** object, so a credential holding only a patterned `pull` logs in and passes the
availability probe, while a credential holding only `push` still cannot log in (Design,
"Addressed objects and pattern scopes"; AC12). This revises the login-scope decision (was Q7),
whose option B lost for want of an object kind `auth.md` did not then have.

The question: `auth.md` has since adopted a fourth addressed-object kind, the descriptor, for a
repository-wide document whose body names no object, authorized for `pull` under a pattern (its
resolved name-free-document decision, was Q23, and AC32), and `hex.md`, whose identity-route
decision Q7 followed exactly, revised its own identity routes to `pull` descriptors (its resolved
identity-route decision, was Q10). Login answers an empty `200` and `availability` an empty `200`,
so both pass the sentinel test by construction; Q7's reasoning no longer holds, and whether to
follow the revised precedent is a scope decision on a security surface.

**Recommendation:** A. It applies `auth.md`'s settled evaluation rule rather than a format-local
one, keeps this format aligned with the precedent Q7 was written to follow, and removes a recipe
limitation (patterned `pull` consumers could not use the one login command both toolchains
document) at no cost to what a pattern protects: the body names nothing, and the credential
already holds a scope on the repository, so neither its existence nor its availability is a
secret from it. A push-only credential gains nothing, because a descriptor is never authorized for
`push`.

| Option | You get | It costs |
|---|---|---|
| **A. Login and `availability` as `pull` descriptors** | Patterned `pull` consumers log in and can enable `supportsAvailability`; one rule with `hex.md` and `auth.md`'s descriptor examples | A patterned credential learns the repository answers, which it already knew; push-only credentials keep the environment or hand-written recipe |
| **B. Keep Q7: both report none** | No change to a recorded decision | Patterned `pull` consumers cannot log in or use availability, for a reason the shared layer has since removed, and the format diverges from the precedent it cited |
| **C. Login as a descriptor for any action** | Push-only credentials log in too | A descriptor authorized for `push`, which `auth.md` forbids; a handler overriding a shared evaluation rule |

**Why this is yours:** it changes what a narrowly scoped credential can do on this format, a
security-scope call, and it revises an answer adopted under the same delegation two days earlier.

Accepted cost: the `identifiers` lookup stays none (its answer names identities), so the SCM bridge
still does not engage for a patterned consumer, and push-only credentials keep the documented
alternative recipe. B lost because its only reason is gone; C lost because it bends `auth.md`.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | 5cf8b0c | authoring pass: grounded first draft, not a review | Grounded the wire contract four ways: captured traffic from SwiftPM 5.10.1 and 6.4.0 in the official swift images pinned by digest, with 6.1.3 corroborating from an earlier pass whose captures were reused where their image and stub variant were recorded, run against a logging stub serving fixtures built by the client's own archive-source, compute-checksum and signed dry-run publish (cold resolves with the transcript order, the 5.10 alternate-manifest fetch as `swift-version=5.9.0`, content-type and content-version variants, pagination, identity case in manifest, publish and scope mapping, prerelease, missing and invalid identities, archive redirects, list `problem` entries with fresh, pinned and forced resolves, `410` and `403` refusals with problem and plain bodies on every route, the identifiers lookup under both SCM flags and refused, availability, unsigned, signed, metadata-less, duplicate, rejected, asynchronous and early-refused publishes, login by token and username with the files written at the passwd home, every credential form per toolchain including the 6.4-only environment variables and the 5.10 hand-written entry, the Basic-challenge hang, trusted, untrusted, invalid and strict-unsigned signature handling, fingerprint TOFU with an archive swapped under a recorded version, and the 6.4 exit abort); the swift-package-manager Registry.md and PackageRegistryUsage.md at 24a8a7b, SE-0292, SE-0321 and SE-0391; the SwiftPM registry client, configuration, login and publish sources at three refs and PackageDescription's version equality; OSV's SwiftURL ecosystem; and the live Tuist registry (relative URLs, missing metadata, expiring archive redirects, JSON 404s). Design built from that: case-folded identity with display spelling and precedence-equal versions, the suffix ambiguity, the shared-model mapping with the archive checksum as the CAS digest and manifests as files, numeric `swift-version` matching and mandatory alternates, first-claimant identifier bindings, a synchronous publish refusing before `100 Continue`, unavailability and deletion as management operations, `Content-Version` on every response, per-host credentials with a Bearer challenge, case-folded addressed objects, the `403` rendering that reaches the user, publisher signing passed through with a five-item requirement list for artifact verification, OSV coverage through bound-URL aliases, the proxied classification with URL rendering, redirect following, completion-only manifests and Swift's removal rows, and a per-identity virtual merge. Ten questions written in decision shape and adopted under the standing delegation: synchronous publication (AC2), unavailability under `delete` (AC9), first-claimant bindings (AC7, AC23), policy-unaware lists (AC13), virtual repositories (AC22), the Tuist registry user-configured, login as `pull` with no object (AC10, AC12), OSV aliases (AC23), validity at publish with trust as a verdict (AC14) and the Bearer challenge (AC10). Twenty-four criteria, each with a Test Plan row. Sibling consequences recorded in the authoring report, not applied here. Stays draft; awaits an independent review. |
| 2026-09-28 | fe2a39f | cross-spec reconciliation of the Wave 1 folds and the foundation wave, on Opus. Not a review | Not a review, and this spec's first reconciliation: every item in `agents/spec-loop/consequences.md` naming this file verified against the current text of its source spec and of this file. Applied: Open item 17's requests, now met or routed (artifact-verification's CMS entry Swift profile through `Deps`' `Verifier`, trust from the `x509-roots` trust set as a `publisher` verdict, AC14; management-api's `withdraw`, `restore`, `delete-version` and `rebind` kinds, the security-critical first-claim binding moving only through `rebind` with `push` on the bound identity and `delete` on the displaced one exactly as adopted here, AC7, AC9; auth's uniform-challenge rule already permitting the Bearer challenge, AC10; supply-chain's Swift coverage and `holds` binding rows; FHI's re-open input carrying the alias coordinate; the https adapter following the `303` to an allowlisted store host, pagination as the handler's derivation, AC16); management-api items 11 and 12 (retirement core-held, the deleted-versions list kept as display state, the central `retired` refusal rendered as this wire's `409`, AC3); upstream-adapters item 12 and the AC23 finding (the `Content-Version` probe moved to the first upstream response, AC21); proxy-cache reconciliation (completion-only manifests with a `swift-tools-version` verifier, AC18; cache-scoped `Last-Modified`, AC17; every removal row named by event class, the checksum change reclassified from explicit signal to revision-bound as `puppet.md` and `terraform.md` apply it, AC20); supply-chain theme 3 (`WriteRefusal`, AC13); sweep 1 item 6 (FHI's route-scoped and URL-borne input cited); repository-lifecycle AC12 and FHI AC13 (Capabilities section, new AC25). Adopted Q11 under the standing delegation: login and `availability` report `pull` descriptors under auth's was-Q23, revising Q7 whose cited `hex.md` precedent was itself revised (AC12); `fable_recheck` extended. The reserved mounts, carve-outs and `server.hosts` were checked: every Swift route is under the format-first mount, the host-level `/login` stays unserved. Reported: `auth.md` has no `swift` client row and its challenge list and Bearer and Basic rows do not name SwiftPM; proxy-cache's event-class table should name Swift. Twenty-five criteria, each with a Test Plan row. `node scripts/check-spec.js` reports no failure in this file. Stays draft; awaits an independent review. |
