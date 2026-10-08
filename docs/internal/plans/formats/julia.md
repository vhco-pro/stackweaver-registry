---
status: planned
status_description: "Planned by the Fable recheck of 2026-10-08 at 792cd2e: a full review pass over the Opus-authored whole (every sibling citation verified at HEAD, the protocol claims re-read in the pinned julia:1.13.0 image's Pkg, Tar, Artifacts and Downloads sources, the adversarial lens at full strength on the Pkg server protocol, the General tree, resolution, the 1.13-only markers and pinned manifests, constitution compliance) plus the re-examination of the eight questions adopted on Opus: all eight confirmed, Q2, Q3 and Q4 with their folds amended. Folded: supply-chain was-Q11 (the UUID a package-level advisory key reported at write time, AC26); proxy-cache was-Q19, Q21, Q23 and Q24 (retained count zero, the index and listing never evicted, anchor class none, HEAD on proxied routes); signing-service was-Q14 and Q24 (ServeFile for every stored file, ServeRendered for the virtual listing, HEAD as the GET without its body); management-api was-Q14, Q15 and Q20 (claims checked again at commit, the unchanged publish, the spool bound); upstream-adapters AC23 (the flavor probe moved from configuration to the first request, AC20 rewritten); the auth Pkg row now present. Found and fixed: no entry rules or decompression bound on the hosted ingest and the proxied verifier (AC9); a proxied representation keyed by the request rather than the body's magic bytes (AC10); a package with every version deleted still named in Registry.toml (AC27); JuliaArtifacts.toml unhandled (AC11); virtual resolution underspecified when two members hold one UUID, and a refusal that could fall through (AC14, AC22); the window between a generation's fetch and its index build (AC24); build metadata as part of a claim's identity (AC4). Two rows owed to conformance-harness.md's exception list, reported. 28 criteria, each with a Test Plan row; zero open questions; check-spec zero failures. Earlier: reconciled 2026-09-28 at 20ff418 on Opus with the foundation wave; authored 2026-09-26 on Opus from captures of Julia 1.10.12 and 1.13.0 with eight questions adopted under the standing delegation."
description: "Spec for the Julia format: the Pkg server protocol (the registries listing, registry, package and artifact tarballs addressed by git tree hash), hosted as a registry this registry generates from management-API publishes and proxied from pkg.julialang.org, with the tree hash verified as a coordinate rather than used as a storage key, and virtual repositories as the one way a client sees a private registry beside General."
author: michielvha
goal: "Serve Julia teams a private registry that Pkg consumes through JULIA_PKG_SERVER with no git anywhere, and a pkg.julialang.org cache whose every package and artifact tree is verified against its git tree hash before it is committed, with Pkg on the LTS and current lines as the oracle."
priority: "low"
issue: 27
created: 2026-09-26
covers:
  - "internal/format/julia/**"
  - "conformance/julia/**"
---

# Plan: Julia Pkg server format

The Julia Pkg server protocol, hosted and proxied: a four-route, GET-and-HEAD-only wire on which
a registry listing names each registry by UUID and git tree hash, and every registry, package
source tree and artifact is a tarball addressed by the git tree hash of its unpacked contents,
which the client recomputes and compares. Pkg itself, on the LTS line and on the current line,
is the oracle on both paths.

## Context

Julia sits in Tier 3 of `formats/catalogue.md` as the single-ecosystem family "Julia Pkg
server" (the row "Julia General"). **Its build is gated by `project-charter.md` AC9 and
`catalogue.md` AC5**: no handler code for a Tier 3 ecosystem exists before every Tier 1 format
has met its definition of done and the owner has recorded a `continue` verdict at the charter's
build step 8. This spec exists now because the owner directed on 2026-09-26 that all 33
ecosystems be specced up front (the catalogue's "Every ecosystem below is specced now; only
building is gated"), so that the gate decides what is built and never what is written; a
`shrink` verdict parks it.

The family name is itself a finding the catalogue recorded: "Git-backed" was split on
2026-09-26 (its resolved Git-backed decision) because Go, Swift and Julia name a resolution
model, not a wire protocol. For Julia that is literally true: Pkg can resolve everything over
git, and the Pkg server protocol exists precisely to take git off the wire (the protocol
reference's own "Decoupling from Git and GitHub"). This spec therefore specs the Pkg server
protocol as the registry path and puts git out of scope with its reason (Scope).

Grounding for this draft, stated up front because the constitution asks for evidence or
silence:

- **Captured client traffic.** No Julia is installed on this host (`which julia` finds
  nothing), so two pinned official images were run with Podman on the host network against a
  logging stub that serves a directory tree, answers `/registries` from a control file,
  records every request with its headers, and can refuse, swap, redirect or delay any path:
  Julia `1.10.12` with Pkg `1.10.0` (`docker.io/library/julia:1.10.12` at digest
  `sha256:238c8f5760477abfc0c8fd2828bbcbfa2a7f5510d11a26f1884a2fbfdb28b365`), the LTS line,
  and Julia `1.13.0` with Pkg `1.13.0` (`docker.io/library/julia:1.13.0` at
  `sha256:41aea62f20f65cabd8ae2ef4d49e778d8a95d4e3d3748928259e18ab58b22386`), the current line.
  The fixtures were genuine: a registry StubReg with three packages (one depending on
  General's `Example`, one carrying an `Artifacts.toml`), a yanked version, a second registry
  generation, a deprecated-package generation, and an artifact, every tree hashed with the
  pinned image's own `Pkg.GitTools.tree_hash` and packed with its own `Tar.create`, plus the
  real General registry tarball (tree `d5fd0134...`, 11,463,725 bytes gzip) and the real
  `Example` 0.5.5 tarball fetched from the live service. Every capture started from a fresh
  `JULIA_DEPOT_PATH` unless it says otherwise. Two captures ran on a Podman `--internal`
  network, with the stub in a pinned `python:3.13-slim` container
  (`sha256:7c61056e61ac89e852de05f3dc6fa51a6dd2181797bceed46aa725dd7cb2cd3b`), so that the
  client could reach the registry and nothing else. The stub is not a reference
  implementation; what the captures prove is what the clients send and how they react.
- **The published contract.** The protocol reference (`docs/src/protocol.md`, "Package and
  Storage Server Protocol Reference") and the registry documentation (`docs/src/registries.md`)
  shipped inside the Pkg stdlib of the 1.13.0 image; the Pkg sources in both images
  (`Registry/Registry.jl`, `Registry/registry_instance.jl`, `Operations.jl`, `Artifacts.jl`,
  `PlatformEngines.jl`, `GitTools.jl`, `Types.jl`), the `Tar` stdlib's `tree_hash` and its
  `skip_empty` documentation, `Downloads`' curl options, and `NetworkOptions`' CA-root
  variables.
- **The reference implementation.** PkgServer.jl at commit `88c6d808f47ff1b98d181205be7398e3a67a9159`
  (2026-07-03): its request handler (`src/PkgServer.jl`), its storage client
  (`src/resource.jl`) and its generated-`Artifacts.toml` route (`src/dynamic.jl`).
- **The live upstream.** `pkg.julialang.org` sampled directly: a `301` geo-redirect to
  `eu-central.pkg.julialang.org`; `/registries` answering `302` to `/registries.conservative`;
  `/registries.eager` and `/registries.conservative` each `text/plain`, 88 bytes, one line, no
  `ETag`, no `Last-Modified`, no `Cache-Control`; `/meta` answering JSON; every `/registry/`,
  `/package/` and `/artifact/` path answering `302` to `storage.julialang.net`, to
  `{path}.tar.zst` when the request carries `Accept-Encoding: zstd, gzip`; storage answering
  `binary/octet-stream` with an `ETag` and `Cache-Control: max-age=14400`, and a `404` with an
  HTML body for an unknown tree hash (the Pkg server itself answered `302` even for that
  hash). The General tarball was 11,463,725 bytes gzip and 7,607,256 bytes zstd for one tree.
- **OSV.** `ecosystems.txt` lists `Julia`; the ecosystem's export held 1,717 records on
  2026-09-26, every one a `JLSEC-*` advisory from JuliaLang/SecurityAdvisories.jl (aliases
  `CVE`, `GHSA`, `EUVD`), none a `MAL-` entry, each `affected` entry naming the package as
  `pkg:julia/{name}?uuid={uuid}` with `SEMVER` ranges (captured: `JLSEC-2025-1` for `HTTP`).

Where the documentation and the captures disagree, or the documentation is silent, the captures
win, and the disagreements are recorded because they would otherwise be built from the
documents. The protocol reference says the server "will indicate" that resources are cacheable
forever "with the appropriate HTTP headers", and the live `/registries` carries no caching
header at all. It says that after a failed refresh "the Pkg client will present the body of
the error response", and neither client printed any body for a `401`, a `403` or a `503`
(captured). It lists no fallback, and every failure of the server sends Pkg somewhere else
(below).

Five things make this format worth a careful spec. **Content is addressed by a git tree hash,
not by any digest of the bytes**: one tree has many valid tarballs (gzip and zstd, any
compressor), the artifact the pkg server serves is not the tarball whose SHA-256 the package's
own `Artifacts.toml` records (captured: `5ea2442a...` served against `364f5bcd...` recorded), and
the hash is SHA-1, which the protocol reference itself calls compromised. **Every server
failure is a silent fallback to origin**: a failed `/registries` makes a fresh client clone
General from GitHub, a failed package makes it fetch GitHub's tarball API or `git clone` the
registry's `repo` URL, and a failed artifact makes it fetch the URL in `Artifacts.toml`, so a
policy refusal on a proxied General package is invisible unless the client's network makes it
visible (captured both ways). **The registry is a git repository in the ecosystem and a tarball
on this wire**, published through a GitHub bot (Registrator) or a local git tool
(LocalRegistry.jl), neither of which speaks to a Pkg server, so no client publishes. **A client
talks to exactly one Pkg server** (`JULIA_PKG_SERVER` is one URL), so a private registry beside
General is reachable only through a server that lists both. And **the resolver needs every
dependency named in any version of a package to be in some installed registry**, so a private
package that depends on General cannot even resolve against a server that lists only the
private registry (captured below).

## Blocking preconditions

**The handler interface re-open must complete before this handler starts**, as for every
handler (`format-handler-interface.md` AC8). Julia is Tier 3, so the catalogue's Tier 1 gate
(its AC5) and the charter's breadth verdict (its AC9, build step 8) both precede it; the re-open
is recorded here anyway, from this side, because a gate enforced on one side only is enforced
nowhere.

**The shared signing and index service, `planned` on Fable 2026-09-30, precedes Phase 1.** Every registry
tarball a hosted repository serves is a write-triggered generated document produced by
`docs/internal/plans/foundation/signing-service.md`, which the charter builds at step 7 as the
production form of what the step 4a prototype learned (`write-triggered-services-prototype.md`):
through the optional `Indexer` interface and this format's generator package
`internal/format/julia/index`, run by the shared write path's pre-commit hook (its "The generator
contract" and "The write path dispatches", AC1). This format is one of that spec's unsigned
consumers ("nothing is signed and the service's signing half is not used"): its profile declares no
signing profile, so no key is created for its repositories (its AC24). What this format requires
of that service is stated in Design ("What the signing and index service must provide"), each item
mapped onto its contract, never designed here. A Julia handler without it can serve no registry,
and a Pkg server with no registry serves nothing a client can resolve.

**The management API, `planned` on Fable 2026-09-30, precedes Phase 2 and is the only hosted write path.**
Publish, yank, unyank, deprecate, delete a version and delete a package are operations of
`docs/internal/plans/foundation/management-api.md`, whose core the charter builds at step 2 and
whose publish lands in its Phase 2; its cross-format reconciliation table carries this format's four
rows, none with a binding, since nothing on the Pkg wire writes. Phase 1's hosted reads are testable
without it, because the harness's `state` vocabulary seeds versions through the shared write path
and the write-path hook regenerates the registry for seeded state as for any write; the publish and
management criteria are untestable until that surface exists.

**The proxied path depends on shared services that are now `planned`** (`proxy-cache.md` on
2026-09-30, `upstream-adapters.md` and `artifact-verification.md` on 2026-10-01): the transport of
`docs/internal/plans/foundation/upstream-adapters.md` (built at charter step 4; its requirements
table row for this format: cross-host redirects, the credential to the configured host only, the
zstd opt-in and no `Julia-CI-Variables`, its AC4 to AC8), the fetch-and-cache contract of
`proxy-cache.md` (the handler-supplied verifier of its completion-only mode, and the
`FirstByteWithin` declaration its resolved first-byte-deadline decision adopted for this format's
client), and the tree-hash integrity entry of
`docs/internal/plans/foundation/artifact-verification.md` (`internal/verify/treehash`, its AC18,
built with this format in its Phase 4 at step 11), because the proxy layer's stream-and-verify
knows digests of bytes and this format's integrity value is not one.

## Scope

**In scope:**

- The Pkg protocol's resource surface under the format-first mount `/julia/{repository}/`,
  which a client reaches as `JULIA_PKG_SERVER=https://{host}/julia/{repository}` (captured: the
  path prefix is kept on every request): `/registries`, with `/registries.eager` and
  `/registries.conservative` as identical aliases; `/registry/{uuid}/{hash}`;
  `/package/{uuid}/{hash}`; `/artifact/{hash}`; `GET` and `HEAD` on every one.
- The tree hash as a verified coordinate: computed by this registry on every tree it stores,
  on both paths, with the exact semantics the client uses for each resource kind, and never a
  storage key (the resolved tree-hash decision below).
- Compression negotiation as the protocol reference defines it: gzip by default, zstd when the
  request's `Accept-Encoding` names it, each a separate stored representation verified against
  the same tree hash.
- The hosted repository as **one Julia registry this registry generates** (the resolved
  hosted-registry decision below): its UUID minted at repository creation, its name the
  repository's, its tree regenerated by the shared index service inside every write, its
  packages published through the management API from a source tree carrying a `Project.toml`,
  and artifacts published with the versions that name them.
- The management operations the ecosystem's registry format expresses and no client drives:
  publish, yank and unyank (`yanked = true` in `Versions.toml`), deprecate and undeprecate a
  package (`[metadata.deprecated]` in `Package.toml`, read by Pkg 1.13), delete a version and
  delete a package, with core-held retirement of deleted coordinates and the write-boundary
  declaration `data-model.md` requires.
- Name, UUID and version rules: a package is its UUID; its name is unique within a registry,
  case-insensitively; versions are Julia `VersionNumber`s in canonical form, build metadata
  included.
- Non-interactive authentication in the one form Pkg sends, `Authorization: Bearer` from
  `{depot}/servers/{host}/auth.toml`; the per-route addressed objects `auth.md`'s pattern
  scopes evaluate (AC13); and the `403` rendering of a shared policy refusal together with
  what the client's fallback does to it (AC14).
- The proxied path against a Pkg server (`pkg.julialang.org`, or a private PkgServer.jl):
  the listing as short-TTL mutable metadata fetched in one configured flavor, registry,
  package and artifact tarballs as immutable artifacts verified against their tree hash before
  commit, the index this registry builds from each cached registry generation, negative
  caching, and Julia's rows of the upstream-removal table.
- Virtual repositories as a union of registries by UUID (the resolved virtual-repository
  decision below), which is also the only way a client resolves a private package that
  depends on General.
- Advisory matching by package UUID through OSV's `Julia` ecosystem.
- Pkg 1.10 and Pkg 1.13 as the conformance oracles on both paths, with the client's network
  restricted to this registry.
- The declared capabilities `format-handler-interface.md` AC13 names, and the shared rename case
  `repository-lifecycle.md` AC12 requires of every format.

**Out of scope for v1**, each with its reason, recorded because the interface spec's definition
of done requires the deliberately unimplemented surface to be named:

- **Git on the wire: serving a registry or a package as a git repository, receiving a
  `git push` from LocalRegistry.jl or Registrator, and proxying a git registry or package
  repository.** The catalogue split this family out of "Git-backed" because the Pkg server
  protocol is the registry path and git is a different wire protocol (smart HTTP with
  pack negotiation) that no other handler, the proxy layer or the upstream adapters speak.
  A pushed registry commit would also be a document asserting tree hashes for package trees
  this registry never received, since in the ecosystem the packages live in other
  repositories; a registry this registry did not generate cannot keep the "every listed
  version is servable" property that makes the hosted path honest (the resolved
  hosted-registry decision below). Pkg keeps its own git path for unregistered packages
  (`Pkg.add(url=...)`), which never touches a Pkg server.
- **Importing an existing git registry.** Every package version such a registry names lives
  in a separate git repository at a commit; importing means cloning each, a git egress path
  (above). An operator migrates by publishing each version's tree through the management API,
  which a script over a LocalRegistry.jl checkout can drive; nothing on this wire changes.
- **Diffs and bundles.** The protocol reference mentions "a standard system for asking for
  diffs" and "a bundle mechanism"; no route for either is specified there, neither client
  requested one in any capture, and PkgServer.jl serves neither.
- **`/meta`, `/metrics`, `/admin` and the generated `/artifact/{hash}/{name}` route.** These
  are PkgServer.jl's operational and convenience surfaces (the last renders an
  `Artifacts.toml` for an artifact); no Pkg client requests any of them. They answer `404`.
- **Registry flavors as distinct listings.** PkgServer.jl redirects `/registries` by the
  `Julia-Registry-Preference` header (`eager` or `conservative`, CI clients defaulting to
  `eager`), and the difference is only whether the storage servers have finished fetching the
  newest generation. This registry serves what it holds, so it has one listing, answered under
  all three paths; a proxied repository fetches the flavor it is configured with (Design).
- **Anything specific to unpacked registries (`JULIA_PKG_UNPACK_REGISTRY`).** An unpacked
  registry is the same tarball unpacked by the client; nothing differs on the wire.
- **Package `subdir` in hosted registries.** `subdir` names a directory inside a git
  repository; a hosted package is published as its own tree, so the field has nothing to
  point into. On the proxied path it is carried inside the upstream registry verbatim and the
  pkg server already serves the subdirectory's tree under the package's hash.

## Design

### The wire surface, as captured

Every path hangs off the repository's base URL `/julia/{repository}`, format-first per
`format-handler-interface.md`'s resolved URL-shape decision; `pkg_server()` in both clients
takes an arbitrary URL, strips a trailing slash and prefixes `https://` when no scheme is
given, and the captured requests kept `/julia/acme` on every path. No root anchoring is needed.

| Surface | Shape, as the pinned clients send it |
|---|---|
| Listing | `GET {server}/registries`, `Accept: */*`, `User-Agent: curl/8.18.0 julia/1.13` (1.13) or `curl/8.4.0 julia/1.10` (1.10), and the metadata headers `Julia-Pkg-Protocol: 1.0`, `Julia-Pkg-Server: {server}`, `Julia-Version`, `Julia-System` (the platform triplet), `Julia-CI-Variables` (twelve CI variable states) and `Julia-Interactive`, plus one `Julia-{Words}` header per `JULIA_PKG_SERVER_{WORDS}` environment variable. Requested **several times per operation** (captured: four to five times in one cold `Pkg.add`, once per phase that asks which registries the server tracks: registry install, package download, artifact download), never conditionally. Each line matching `^/registry/{uuid}/{hash}$` is taken; other lines are ignored. A failure is retried with one-second delays, four attempts in all (captured on `401` and `503`) |
| Registry | `GET {server}/registry/{uuid}/{hash}` with the metadata headers and, on 1.13 only, `Accept-Encoding: zstd, gzip`. Fetched when a registry is added (a fresh depot adds General and **every** registry the listing names; `Pkg.Registry.add()` with no argument adds every listed registry on a populated depot; `Pkg.Registry.add(uuid = ...)` adds one) and whenever the listing's hash for an installed registry changes (`Pkg.Registry.update()`, and automatically once per session). The client computes `Tar.tree_hash` over the archive and refuses a mismatch: "Warning: tarball content does not match expected git-tree-sha1" then "ERROR: unable to verify download from {url}" on both. The registry is kept packed as `registries/{name}.tar.gz` (or `.tar.zst`, detected by magic bytes) beside a `{name}.toml` recording its UUID and tree hash; the name is read from the tarball's `Registry.toml` |
| Package | `GET {server}/package/{uuid}/{hash}`, the same headers, **only for a package whose UUID is in an installed registry that the listing names** (`is_pkg_in_pkgserver_registry`). The client unpacks it and computes `GitTools.tree_hash` over the unpacked directory; a mismatch prints "tarball content of url {url} does not match git-tree-sha1, expected {hash}, got ..." (1.13) or "tarball content does not match git-tree-sha1" (1.10) and moves to the next source |
| Artifact | `GET {server}/artifact/{hash}`, the same headers, for each artifact of a package that the package-eligibility rule above admits; retried three times on failure (captured: three `404`s) before the next source; verified by `GitTools.tree_hash` over the unpacked directory, "Tree Hash Mismatch!" on failure unless `JULIA_PKG_IGNORE_HASHES` is set |
| Offline | `JULIA_PKG_OFFLINE=true` on a warm depot: 1.10 made no request; 1.13 still requested `/registries` twice and nothing else (captured) |
| Authentication | `Authorization: Bearer` with the `access_token` read from `{depot}/servers/{host}_{port}/auth.toml` (the host part of the server URL with `:` replaced by `_`), sent on every request whose URL starts with the server URL, and never to another host (captured: absent on the artifact fallback). Sent only when the URL is `https://` or points at `localhost` or `127.0.0.1`; otherwise Pkg warns "refusing to send auth info over insecure connection" |
| Error rendering | Neither client prints a response body. A failed listing prints "Warning: could not download {server}/registries" with `RequestError: HTTP/1.1 {status} {reason}`; a failed package or artifact prints nothing at all when a fallback succeeds |

**The fallback chain is the client's, and it is the format's defining behaviour.** Every
failure above sends Pkg to origin rather than to an error:

| This registry fails | Pkg then (captured) |
|---|---|
| The listing, on a depot with no registries | Clones General from `https://github.com/JuliaRegistries/General.git` ("Cloning registry from ...", both clients) |
| A package tarball (any non-2xx, a tree-hash mismatch, a body that will not unpack) | For a registry `repo` on GitHub, fetches `https://api.github.com/repos/{owner}/{repo}/tarball/{hash}`; then `git clone`s the `repo` URL ("Cloning [{uuid}] {name} from {repo}"); a package with no `repo` fails with no egress: "Package {name} [{uuid}] has no repository URL available" on 1.13, the unhelpful "ArgumentError: collection must be non-empty" on 1.10 |
| An artifact tarball | Fetches each `download` URL of the artifact's entry in the package's own `Artifacts.toml`, with no Julia headers and no credential (captured: `/fallback/zzart.tar.gz` on the second stub) |
| A package whose registry the listing does not name | Never asks this registry at all; goes straight to the chain above |

The capture that fixes the design: with a `403` from the stub on General's `Example` tarball,
**both clients installed `Example` anyway and exited 0 with no message** (it came from
GitHub). On a Podman `--internal` network, where the client could reach only the stub, the
same run failed with "Cloning [7876af07-...] Example from https://github.com/JuliaLang/Example.jl.git"
and "failed to resolve address for github.com". The registry is the client's only source only
when the network makes it so (the resolved policy-bypass decision below).

**Two resolver facts shape every recipe**, both captured. A package whose `Deps.toml` names,
in any version range, a UUID found in no installed registry cannot be resolved at all, even
at a version that does not depend on it: `Pkg.add(name = "ZzDemo", version = "1.0.0")` against
a server listing only StubReg failed with "cannot find name corresponding to UUID
7876af07-990d-54b4-ab0e-23690620f79a in a registry" because 1.1.0 depends on `Example`. And
`Pkg.Registry.add("StubReg")` by name fails on both clients with "no path or url specified for
registry": only General is known by name, and every other registry is added by UUID or by the
no-argument form.

**The low-speed abort is a proxy-layer constraint.** `Downloads` sets `CURLOPT_LOW_SPEED_LIMIT`
1 and `CURLOPT_LOW_SPEED_TIME` 20, so a request that receives no body byte for 20 seconds is
abandoned ("Operation too slow. Less than 1 bytes/sec transferred the last 20 seconds"). A
first stub that buffered the 11 MB General tarball from upstream before answering failed every
client that way, and Pkg then fell back to GitHub for the package it was fetching. A proxied
miss therefore has to stream to every waiting client within 20 seconds, which the settled
coalesced-waiter rule (waiters receive bytes only after the verified commit) did not guarantee
for a large tarball on a slow upstream. `proxy-cache.md` resolved it for this format by name (its
resolved first-byte-deadline decision, was Q16 there, AC21): the handler declares
`FirstByteWithin` of 20 seconds on every registry, package and artifact fetch, and for such a
fetch the coalesced waiters are attached to the in-flight spool, receiving the bytes already
received from upstream progressively, with every response completing only after the verified
commit; a body that fails verification closes every attached response short at end-of-body, the
blast-radius cost that decision accepted for formats whose alternative is failing every waiter.
The initiating client already streams under the completion-only mode, so no client waits for the
whole upstream fetch before its first byte. AC19 states the end state and shares its case with
`proxy-cache.md` AC21.

### Registries, packages and artifacts, as this wire sees them

A registry tree, as General's and the fixture's show and `registries.md` documents:
`Registry.toml` carries `name`, `uuid`, an optional `repo` and `description`, and a `[packages]`
table mapping each package UUID to `{ name, path }`; each package directory carries
`Package.toml` (`name`, `uuid`, optional `repo`, optional `subdir`, optional `[metadata]`),
`Versions.toml` (each version to its `git-tree-sha1`, optionally `yanked = true`), and optional
`Deps.toml`, `Compat.toml`, `WeakDeps.toml` and `WeakCompat.toml` whose keys are version ranges
(`load_deps_data` parses each key with `VersionRange`, so a single-version key is as valid as
General's compressed ranges). `repo` is optional in both clients' parsers, and its absence is
what makes a hosted package fail closed rather than egress (the table above).

The **three tree-hash computations are not the same function**, and a verifier that uses the
wrong one refuses valid content or accepts content the client refuses:

| Resource | Client computation | Semantics |
|---|---|---|
| Registry | `Tar.tree_hash` over the compressed archive (`verify_archive_tree_hash`) | Git's tree hashing over the tar's entries, **empty directories included** (`skip_empty = false`, the default) |
| Package | `GitTools.tree_hash` over the unpacked directory | Git's tree hashing with **empty directories skipped and every `.git` directory skipped**, file modes reduced to git's `100644`, `100755` and `120000` |
| Artifact | `GitTools.tree_hash` over the unpacked directory | As for a package |

PkgServer.jl's own code names the history behind this: tree hashes computed by git skip empty
directories, so its (now commented-out) verifier hashed every download both ways. This
registry generates registry trees that contain no empty directory, so on the hosted path the
two semantics coincide by construction; on the proxied path each resource is verified with the
semantics its client uses.

### The tree hash is a verified coordinate, never a storage key

Per the resolved tree-hash decision below, the shared model stores and verifies this format's
content without a second content address, and `data-model.md` now states the rule with this format
as its example ("A coordinate is not a storage key": one tree hash backed by several `File` rows,
each keyed by its own blob digest, the tree hash "a coordinate the handler verifies and records,
never a key the store resolves"):

- **Every stored representation is a `File` whose `Blob` is keyed by the CAS digest of its
  bytes**, as `storage-and-gc.md` requires of every blob. A package version holds up to two
  such files, `{hash}.tar.gz` and `{hash}.tar.zst`; they share nothing in the store because
  they share no bytes, and either may be absent until it is first needed.
- **The tree hash is a coordinate in metadata**, exactly where a version string lives: the
  version-level document records it, the package-level document maps the package's UUID to its
  versions, and the repository-level document holds the lookup from a request's
  `(uuid, hash)` or artifact `hash` to the version that owns it. A tree hash is never a key
  into the blob store, never a filename in it and never deduplicated on; deduplication is the
  CAS digest's, so two tarballs of one tree are two blobs and one tarball held by two
  repositories is one.
- **Verification is the ingest gate.** Before any representation is committed, its bytes are
  decompressed and the tree hash is computed over the resulting tar with the semantics of the
  resource kind (above); a representation whose tree hash differs from the coordinate it would
  be stored under is never committed, on either path. Because the computation needs the whole
  archive, it runs while the bytes stream through (a streaming tar reader feeding per-entry git
  blob hashes, whose sizes the tar headers carry ahead of the content), so it costs no second
  read. The computation is `artifact-verification.md`'s tree-hash integrity entry,
  `internal/verify/treehash`, with the resource-kind flag and collision-detecting SHA-1, streaming
  over the compressed archive (its entry table, AC18), answering `match` or `mismatch` and never
  stored as a verdict; it adds no second pass over the bytes (its AC26), and the handler reaches it
  only through the `Verifier` consumer interface in `Deps`, never importing `internal/verify`
  (`format-handler-interface.md` AC15). On the proxied path it runs as the handler-supplied verifier
  of `proxy-cache.md`'s completion-only mode, whose catalogue names the tree hash, over the complete
  spooled body before the commit (its AC20).
- **SHA-1 is computed with collision detection.** The protocol reference records that SHA-1
  "is considered to be cryptographically compromised"; git itself hashes with collision
  detection. This registry does the same, in the shared entry, and a tree containing a blob whose
  SHA-1 computation detects a collision attack is refused at ingest on both paths. The client does
  not detect collisions, so this is the only place in the chain that can.
- **The hosted path stores a canonical re-pack, not the received bytes.** A publish's tree is
  hashed, then written by this registry as a canonical tar (entries sorted, owner and group
  `0`, modification time `0`, modes `0644` and `0755`, symlinks kept, empty directories and
  `.git` directories omitted, which is the shape Tar.jl's canonical writer and the live storage
  server produce, captured in `tar -tv` of the `Example` tarball), then compressed in each
  representation; the re-pack's tree hash is recomputed and must equal the coordinate before
  commit. What the client unpacks is then exactly what was hashed, and a received tarball with
  hard links never reaches a client in its original form. The received archive is read under
  the rules the client's own extraction implies: an entry whose path is absolute, climbs with
  `..` or repeats an earlier path, and a device, FIFO or socket entry, is refused `validation`
  (422), because no git tree can hold it and the tree hash is undefined for it; a hard link is
  materialised as the file it names, which is what `GitTools.tree_hash` sees after extraction.
  Materialising the tree for the re-pack is the one place this format holds a whole archive, so
  it runs under a **decompression bound**, a handler constant on entry count and on total
  uncompressed bytes as a multiple of the compressed size (`homebrew.md`'s and `conan.md`'s
  shape), refused `validation` naming the bound after reading at most the bound; the multipart
  form that may carry the archive is bounded before it by `management.publish_spool_limit`
  (`management-api.md`'s resolved spool-bound decision, was Q20, AC36). On the proxied path the
  handler-supplied verifier wraps the shared entry in the same bound, and an archive that
  exceeds it is a verifier refusal: nothing committed, no negative entry, the reason recorded
  (`proxy-cache.md` AC20).

The consequence stated for operators: the SHA-256 that a package's `Artifacts.toml` records
for its `download` URLs is the upstream builder's tarball digest and matches neither
representation this registry serves (captured on the live service), so it is never used for
verification of a pkg-server-served artifact, on either side of the wire.

### Compression negotiation

The protocol reference defines it and the captures confirm it: 1.13 sends `Accept-Encoding:
zstd, gzip` on registry, package and artifact requests and 1.10 sends none; both detect the
format by magic bytes after download, and both installed a zstd body (1.10 when zstd was served
without being asked, captured). This registry serves the zstd representation to a request whose
`Accept-Encoding` names `zstd`, and gzip otherwise, with `Content-Type:
application/octet-stream`, **no `Content-Encoding`** (the body is the archive, not an encoding of
it, which is what the live storage server does), and `Vary: Accept-Encoding`. A representation
not yet held is produced on demand: on the hosted path by compressing the canonical re-pack, on
the proxied path by fetching the upstream's representation for the same coordinate; both are
verified before commit. On the proxied path the representation a fetch yields is keyed by the
magic bytes of the body that arrived, never by the `Accept-Encoding` the handler sent: a private
PkgServer.jl without zstd answers a zstd-accepting request with the gzip tarball, which is stored
as the gzip representation and served as it is to the zstd-accepting client, since both clients
detect the format by magic bytes (captured). The listing is plain text and never compressed.

A `HEAD` on any route of either path is the `GET` with the body withheld. On the hosted path
the shared doors answer it with the `GET`'s status and headers, `Content-Length` included,
rendering nothing for a stored document or file (`signing-service.md`'s resolved HEAD decision,
was Q24, AC32); on the proxied path the layer never forwards a `HEAD`, a cold one makes the
upstream `GET`, fills the cache after the verified commit and is answered from it
(`proxy-cache.md`'s resolved HEAD decision, was Q24, AC32). Neither client sends a `HEAD`; the
rule is for `curl` and is stated here so that this handler carries no branch on the method.

### Mapping onto the shared model

The levels are exactly those `data-model.md` provides; no table is added.

- `Package.name` holds the Julia package name as published, and the package-level document
  holds the UUID and the `[metadata.deprecated]` table when set. The UUID is also reported as
  the package's **advisory key** on the metadata-store write that records the row, hosted and
  proxied alike, and stored core-parsed on the `Package` row outside the document
  (`supply-chain-policy.md`'s resolved advisory-key decision, was Q11, AC24; `data-model.md`
  AC46), each version reporting its canonical version string as the version-level key; the
  policy engine matches on the stored key, never on a value supplied with a request (Design,
  "Integrity, signing and provenance"). Deleted versions are **not**
  recorded here: each is a core-held `Retirement` record, written in the deleting operation's
  transaction, outside snapshot content and never pruned (`management-api.md`, "Retirement is
  core-held", its resolved retirement-placement decision, was Q3 there; `data-model.md` AC35), so
  no repoint can restore a document that predates a deletion. Julia identifies a package by its UUID, not its name, and the name is
  unique within one registry; a hosted repository is one registry, and a proxied repository's
  names come from its upstream's registries, so a `Package` row per name per repository is
  sound. A proxied repository's `Package` and `Version` rows are created at the first request
  for a package, from the registry index (cache materialisation, which creates cached references
  and rows and never content), so a General remote carries rows only for what its clients asked
  for, and the advisory key rides that first write. A virtual repository has no rows of its own.
- `Version.version` holds the canonical `VersionNumber` string (`1.0` is stored and served as
  `1.0.0`; build metadata such as `1.18.0+0`, which every JLL package uses, is kept). The
  version-level document holds the tree hash, the dependency, compatibility, weak-dependency
  and weak-compatibility entries read from the published `Project.toml`, the `yanked` flag,
  and the tree hashes of the artifacts the version carries.
- Each version's files are its package representations and the representations of each
  artifact it carries, all keyed by CAS digest and served through `ServeFile`, whose `ETag` is
  the CAS digest (`signing-service.md` AC11, AC32), so no handler code sets a validator.
- The repository-level document of a hosted repository holds the registry's UUID, name and
  description fixed at creation, the generated registry documents (below), and the lookup
  from `(uuid, hash)` and artifact `hash` to owning versions; a `remote` repository's holds its
  upstream's cached listing, a current document carrying `proxy-cache.md`'s cache-scoped
  `adopted_at` (`data-model.md` AC44), and the **registry index** built from each cached registry
  generation (Design, "The proxied path").

### Every hosted registry tarball is a write-triggered document

Per the resolved hosted-registry decision below, the registry tree, its tree hash, its two
compressed representations and the one-line listing are produced by the shared index service
inside the write that changes them, **stored, never rendered on request**, in the
repository-level document, CAS-backed above the inline threshold and protected by the fourth
GC mark root (`storage-and-gc.md` AC16; `signing-service.md`, "Storage", AC5), and served through
the runtime's `ServeDocument` with a byte-derived `ETag` (its AC11). Rendering on request was rejected because a render is
a tree hash over the whole registry and a tar and two compressions on every cold client, and
because the listing and the tarball it names must never disagree.

The rules the service applies for this format, stated as this format's requirements rather than
as the service's design:

- **Regeneration inside the write.** Every completed write that changes a version, a yank flag,
  a deprecation or membership (a publish, a management operation, a retention pass) regenerates
  the registry tree and listing in the same completed logical write and the same snapshot, so
  no snapshot lists a tree hash whose tarball it does not hold or holds a version its registry
  does not name (`data-model.md`'s one-write-one-snapshot rule; the prototype's question 3).
- **Under contention, both land.** Two concurrent publishes into one repository each produce a
  registry that lists the other's version once both are complete: the service's per-document
  transaction lock queues them and the revision-token retry `data-model.md` makes mandatory covers
  what the lock does not (`signing-service.md`, "Contention", AC28), each publish its own snapshot,
  never merged into one regeneration.
- **Deterministic bytes.** The tree is written with a fixed layout (`{first letter
  uppercased}/{name}/` per package, as General does), TOML in a fixed key order with one key
  per version in `Versions.toml`, `Deps.toml` and `Compat.toml` (no range compression, which
  Pkg does not require), and no empty directory; the canonical tar and both compressions are
  byte-stable, so an unchanged registry keeps its tree hash, its tarball bytes and its `ETag`
  across snapshots.
- **The previous generation stays servable.** Pkg reads the listing and then fetches the
  registry it names in a separate request (captured), so a publish landing between the two
  would otherwise answer `404` to a client that did nothing wrong. The repository-level
  document therefore keeps the tarballs of the current generation and of the one before it,
  and a request for either is served; an older hash answers `404`, and the client's next
  command reads the listing again.
- **A package with no current version is omitted.** `Registry.toml` names only packages holding
  at least one current version (yanked ones included); after `delete-package`, or once every
  version is deleted, the package leaves the generated tree while its `Package` row survives, so
  the client's `is_pkg_in_pkgserver_registry` answers no and `Pkg.instantiate()` of a manifest
  pinning a deleted version goes straight to the fallback chain, which a hosted package ends
  with no egress. Pkg tolerates a listed package without a `Versions.toml`
  (`registry_instance.jl` reads an empty table, checked in the 1.13.0 image), so this is a
  choice, made so that the registry never names a package that resolves to nothing.
- **A repoint restores the documents.** Because the generated documents live in the snapshot
  delta, a rollback serves exactly the registry of the snapshot it targets; a pointer moved
  backwards across a deletion leaves the deleted coordinate retired, because its `Retirement`
  record is core-held and untouched by any repoint (`management-api.md` AC12). No client of this
  format compares freshness (the listing is fetched unconditionally and the registry by its tree
  hash, captured), so the pointer's freshness record reaches nothing a client reads beyond the
  `Last-Modified` `ServeDocument` sets.
- **Tree hashes are computed by the service, the registry's with `skip_empty = false`
  semantics**, which equal git's for a tree with no empty directory.

### What the signing and index service must provide

Stated so the dependency on `docs/internal/plans/foundation/signing-service.md` cannot be lost;
that spec lists these as `julia.md`'s six items (its "Who depends on this" table, "Unsigned generated
index") and each is mapped onto its contract below:

1. **Unsigned generation of a Julia registry tree** from the version-level records of every
   version current in the repository: `Registry.toml` with the repository's registry name,
   UUID and description; per package `Package.toml` (no `repo`, no `subdir`, the
   `[metadata.deprecated]` table when set), `Versions.toml` with `yanked = true` where set, and
   `Deps.toml`, `Compat.toml`, `WeakDeps.toml` and `WeakCompat.toml` with single-version keys,
   in the deterministic layout above. This is the generator's `Generate`, reading the records
   through the same metadata store the handler reads (its "The generator contract"), with a
   profile that declares no signing profile, so no key is created (its AC24).
2. **The tree hash of the generated tree**, with collision-detecting SHA-1, and the canonical
   tar with its gzip and zstd representations. The tree hash is format knowledge the service
   places in the generator package ("Julia's tree hash" among the knowledge a spec places "in the
   service" that "lives in that format's generator package"), computed there with the same
   semantics the shared `internal/verify/treehash` entry checks, and the generator's output is
   deterministic over the same records (its AC25), so an unchanged registry keeps its bytes.
3. **The listing**, one line `/registry/{uuid}/{hash}` naming the current generation. The
   line is server-relative and carries no mount prefix, because the client prepends its own
   server URL (captured: `{server}/registry/...` built from the line).
4. **Regeneration inside the triggering write**, dispatched by the pre-commit hook for every write,
   including writes made by the shared retention pass, which removes versions like any deletion
   (`signing-service.md` quotes this item in "The write path dispatches"; its AC1), under the
   per-document lock and the revision-token retry (its AC28).
5. **Storage as CAS-backed metadata above the inline threshold** with byte-derived `ETag`s,
   keeping the previous generation's tarballs beside the current one: the generator receives the
   previous document set with its digests and carries the current generation forward under a
   second document key when it produces a new one, so two generations are always servable and
   the third is released to the ordinary retention of snapshot content (its "The generator
   contract", AC5).
6. Nothing for the proxied path and nothing for virtual repositories: a proxied registry is the
   upstream's tarball cached byte for byte, and a virtual listing is a concatenation of member
   listings (Design, "Virtual repositories"), neither of which is generated; the service records
   that a format whose virtual is "a union of listings (`julia.md`)" declares no merge (its "The
   generator contract").

Nothing is required of the service's signing half: nothing on this wire is signed.

### The hosted publish path and what counts as a write

Nothing on the Pkg wire writes, and no Julia client publishes to a Pkg server: Registrator
opens a pull request against a git registry and LocalRegistry.jl commits to one. The hosted path
is therefore fed by the registry-owned management API,
`docs/internal/plans/foundation/management-api.md`. Per the cross-format precedent (`pypi.md`'s
resolved hosted-yank decision, with `npm.md`, `ansible-collections.md`, `cargo.md`, `nuget.md`,
`maven.md`, `hex.md`, `composer.md`, `conda.md` and `cran.md`), each operation is one completed
logical write through the shared write path, bound onto the kind that spec's cross-format
reconciliation table assigns the Julia rows, carrying that kind's action, hosted only, its trigger
verified by this registry's integration tests and its effect by the real clients
(`docs/internal/analysis/management-surfaces-and-the-oracle.md`: Julia is a format whose every
management trigger has no client). The handler declares the kinds through the optional `Operator`
interface's `Operations()` and implements them in `Apply` inside the transaction `Submit` opens; it
declares no bindings, since no client writes. Every declared kind is driven by a `script` case
(`management-api.md` AC24, enforced before any container starts by `conformance-harness.md` AC26):

| Operation | What the operation carries | Effect a client sees | Kind | Action |
|---|---|---|---|---|
| Publish a version | A package source tree as a tarball with a `Project.toml` at its root, optionally the declared coordinate (`{name}/{version}`), and zero or more artifact tarballs, each named by the tree hash it claims, or references to artifacts the repository already holds | The version appears in the next registry generation; a fresh `Pkg.add` on both clients installs exactly its tree, the `Manifest.toml` records the tree hash this registry computed, and each artifact its `Artifacts.toml` names and the publish carried installs from this registry | `publish` | `push` |
| Yank or unyank a version | Package and version | Yanked: excluded from resolution (captured on both: "restricted to versions 1.2.0 by an explicit requirement - no versions left"), still installed from a `Manifest.toml` that pins it (captured on both), marked `[yanked]` with a warning by 1.13; unyank: resolvable again | `withdraw`, `restore` | `delete` |
| Deprecate or undeprecate a package | Package, optional `reason` and `alternative` | 1.13 marks the package `[deprecated]` in every status and prints the reason and alternative under `status --deprecated` (captured); 1.10 shows nothing and installs it normally (captured); undeprecate clears it | `annotate` | `push` |
| Delete a version | Package and version | It leaves the registry, its tarballs answer `404`, a `Manifest.toml` pinning it fails with no egress attempted, because hosted packages carry no `repo` (1.13's no-repository error, 1.10's "collection must be non-empty"), and its coordinate is retired | `delete-version` | `delete` |
| Delete a package | Package | Every version leaves, every coordinate is retired, the name and UUID stay bound to each other, and the `Package` row survives (`data-model.md`, "A package outlives its versions", AC33) | `delete-package` | `delete` |

The publish arrives through `management-api.md`'s upload sessions or its multipart convenience
form, both producing the same snapshot delta (its "Publish through the API", AC14, AC15), under
the declared-coordinate rule that spec generalised from this format and `cran.md`: a publish naming
no coordinate reports the object none, so only an unpatterned `push` authorizes it, and the
handler's `Authorize` peeks the committed source tarball's `Project.toml` to confirm a declared one
before anything is referenced, refusing a disagreement with `validation` (422). A version and the
artifacts it carries are one publish, "several files for one write" (its "Publish through the
API"). The `Operation` result document carries what the `201` body names below.

What this registry enforces on ingest:

- The body arrives as committed upload-session blobs, streamed into the CAS with their digest
  computed in the stream (`management-api.md`, "Publish through the API"), and is read as a gzip
  or zstd tar; a body that is not one, that has no `Project.toml` at its root, or whose
  `Project.toml` lacks `name`, `uuid` or `version` or carries a value outside the grammars below is
  refused `validation` (422) and nothing is referenced, the unreferenced blob left for the orphan
  sweep (`storage-and-gc.md` AC3). The coordinate is `Project.toml`'s; a declared coordinate that
  disagrees is refused the same way.
- `deps`, `weakdeps`, `compat` and `[extensions]` are read from `Project.toml` into the
  version-level document. A dependency UUID need not be in this registry: a private package
  may depend on General, which is why a hosted repository is consumed through a virtual
  repository (below).
- **The name and the UUID bind on first publish**: a later publish of the same name with
  another UUID, or of the same UUID under another name, is refused with `409`; so is a name
  equal to an existing one under Unicode-insensitive case folding, because Pkg installs into
  `{depot}/packages/{name}/` and two such names collide on a case-insensitive file system.
- **A coordinate that already exists with the same tree hash is idempotent**: the handler
  declares the unchanged publish and the operation completes with no snapshot, no pointer or
  freshness change and `unchanged: true` in its `Operation` (the CI retry; `management-api.md`'s
  resolved unchanged-publish decision, was Q15, AC5); **with a different tree hash it is refused
  with `409`**, because every `Manifest.toml` pins the tree hash. **A retired coordinate is
  refused** with any tree, including after the deleting snapshot has been pruned and across a
  backwards repoint, by the shared write path when the claim `{name}/{version}` is declared,
  before `Apply` runs, and again at commit under the repository head, with the `retired` problem
  (409) naming it (`management-api.md`'s resolved claim decision, was Q14, AC12; `data-model.md`
  AC35): the cross-format rule, with nothing for this handler to carry forward. The claim is the
  canonical `VersionNumber` string with its build metadata, because Julia orders build metadata
  (`v"1.18.0+1"` is a distinct version above `v"1.18.0+0"`, the form every JLL release takes,
  checked in the 1.13.0 image) and the registry lists them as distinct versions, so retiring
  `1.18.0+0` leaves `1.18.0+1` publishable.
- Each carried artifact tarball is hashed with the artifact semantics and refused with `422`
  when its tree hash differs from the one it claims or from every hash the version's
  `Artifacts.toml` names (or `JuliaArtifacts.toml`, which `Artifacts.jl` looks for first, its
  `artifact_names`); an artifact the `Artifacts.toml` names and the publish neither carries
  nor references is allowed and is served by the client's own fallback to its `download` URLs,
  which the response records so the operator sees what this registry will not serve.
- The response is `201` with a completed `Operation` whose result document names the coordinate,
  the tree hash, each artifact stored, each artifact named but not carried, the new registry tree
  hash and the snapshot; a publish to a proxied or virtual repository answers `405` with the
  `repository-type` problem (`management-api.md` AC7).

`data-model.md` requires each format spec to declare its ecosystem's write boundaries and makes
metadata-only mutations snapshot-creating writes. Julia's declaration:

- **One publish is one completed logical write**: the version, its package representations,
  its artifacts and the regenerated registry land in one snapshot, and the listing served from
  the head snapshot names the new generation before the response is sent.
- **Each yank, unyank, deprecation and undeprecation is one metadata-only write** that
  regenerates the registry; none deletes a file.
- **Each deletion is one write** however many versions it removes, per `data-model.md`'s
  bulk-operation rule, the core writing each `Retirement` record in the same transaction; a
  retention pass is one write and runs the same generator as any deletion.
- A proxied repository creates no snapshots at all; listing, registry, package and artifact
  arrival are cache materialisation.

### Artifacts belong to the versions that carry them

Per the resolved artifacts decision below, a hosted artifact is a `File` of every version whose
publish carried or referenced it: its bytes are one blob by CAS digest however many versions
hold it, the repository-level lookup maps its tree hash to the versions that hold it, and
`/artifact/{hash}` serves it while any version in the served snapshot holds it and answers
`404` once none does. An artifact therefore cannot exist unreferenced (it would have no mark
root), deleting one version never removes an artifact another still holds, and the GC story is
the ordinary one. On the proxied path an artifact is cached on first request as an immutable
artifact keyed by its tree hash and verified against it, with no owning version needed, because
cache materialisation creates cached references rather than content.

### Names, UUIDs and versions

- **UUIDs** are matched in canonical lowercase hyphenated form, the form both clients build
  URLs from; any other spelling in a URL answers `404`.
- **Tree hashes** are 40 lowercase hexadecimal characters; any other form answers `404`.
- **Package names** are matched byte for byte, and a published name must be a Julia
  identifier without a `.jl` suffix (the form `Project.toml` and the registry use); the
  case-folding rule above prevents two names that differ only in case.
- **Registry names** default to the repository's name at creation, are fixed then (a later
  rename of the repository leaves them unchanged, Design, "Capabilities and lifecycle"), and must be
  an identifier the client can use as a file name in `{depot}/registries/`. A registry named `General` is refused at
  creation, because Pkg keeps packed registries as `{depot}/registries/{name}.toml` and
  replaces an existing file of that name when it installs another (`download_registries`,
  `mv(...; force = true)`), and because `Pkg.Registry.add("General")` resolves the name to the
  public registry's UUID.
- **Dependency confusion is structurally absent** in this ecosystem, and the design keeps it
  so rather than defending against it: every resolution and every `Manifest.toml` entry is by
  UUID, and a name registered in two installed registries is an error on `Pkg.add` by name
  (1.13: "there are multiple registered `{name}` packages, explicitly set the uuid"; 1.10 prompts,
  which fails non-interactively; both from the Pkg source in the pinned images).
- **Versions** are parsed as `VersionNumber` and stored canonically; two strings with one
  canonical form are one version.

### Authentication: a Bearer token from `auth.toml`

Pkg's one presentation form is `Authorization: Bearer` with the `access_token` from
`{depot}/servers/{host}/auth.toml` (the protocol reference's "Authentication" and
`get_auth_header`), which `auth.md`'s verifier accepts as its universal `Bearer` form (its
presentation-form table, AC31) and whose client table carries the `julia` (Pkg) row from this
spec's capture (the file keyed by host and port, sent only over `https://` or to a loopback host,
four listing retries). How this meets `auth.md`, whose rules this spec does not bend:

- **Provisioning is a file.** The harness writes `access_token = "{token}"` to
  `{depot}/servers/{host}/auth.toml` before the client starts (captured working on both at
  `servers/127.0.0.1_27411/auth.toml`). `expires_at` may be written from the token's expiry,
  after which Pkg keeps sending the token and warns "expired auth without refresh keys"; this
  registry offers no `refresh_url`, because `auth.md`'s tokens are minted where it puts them
  and a refresh endpoint would be a second issuance path.
- **One token per host.** The file is keyed by the server URL's host and port only, never its
  path, so every repository on one host shares one `auth.toml`. A client uses one server at a
  time, so one token suffices; a user switching `JULIA_PKG_SERVER` between repositories on one
  host swaps the file or holds a token under `auth.md`'s explicit multi-repository opt-in (its
  AC29), minted through `credential-management.md`'s `POST /api/v1/tokens` with
  `multi_repository: true` (its AC7). The virtual repository is the recommended single URL.
- **The challenge is uniform and not an existence oracle.** A credential-less request to a
  repository that is not anonymously readable answers `401` whether the repository is private
  or missing; a valid token lacking `pull` answers `404` (`auth.md` AC17); a rejected token
  answers `401` and is never served as anonymous (`auth.md` AC12). No `WWW-Authenticate` is
  needed: Pkg reads none. Neither client prints the body, and both retry the listing four
  times (captured), so the operator documentation states that a `401` on a fresh depot sends
  the client to GitHub for General (the fallback table) unless its network is restricted.
- **TLS.** Pkg sends credentials only over `https://` (or to a loopback host), and `auth.md`
  refuses credentials on a connection this registry did not terminate with TLS unless the
  plaintext flag is set (its AC27); the harness injects its CA through
  `JULIA_SSL_CA_ROOTS_PATH`, which `NetworkOptions` reads in both images.

### Addressed objects and pattern scopes

`auth.md`'s pattern scopes narrow a credential within one repository by matching the object each
request addresses, and the format declares which object each route reports ("Pattern scopes"
there; `format-handler-interface.md` AC12). The canonical named object is `{name}/{version}`,
the package name and canonical version that the `(uuid, hash)` resolves to through the
repository's lookup (hosted) or its registry index (proxied); a `(uuid, hash)` that resolves to
nothing makes `Scope(r)` return an error, which denies the request with the unauthorized
response, a `404` for an authenticated caller. That lookup is a metadata-store read and nothing
else, inside the interim bound `format-handler-interface.md` sets on what `Scope(r)` may read
("What `Scope(r)` may read"); on a cold remote the index is empty, so the request is denied
exactly as the unknown-coordinate rule would refuse it (AC24). When several versions of one
package share a tree (one tree registered under two version numbers, which nothing in the
registry format forbids), the request addresses every one of them and is authorized only when
every one is in pattern.

| Route | Object kind | Canonical object |
|---|---|---|
| `/registries` and its two aliases | none | - (enumerates the repository) |
| `/registry/{uuid}/{hash}` | none | - (the registry enumerates every package) |
| `/package/{uuid}/{hash}` | named | `{name}/{version}` |
| `/artifact/{hash}` | content-addressed | - (a tree hash the caller already knows) |
| Publish (management API) | named | `{name}/{version}` from the declared coordinate, confirmed against `Project.toml` after the body arrives, a disagreement refused; none when no coordinate is declared, in which case only an unpatterned `push` authorizes it |
| Yank, unyank, delete a version (management API) | named | `{name}/{version}` |
| Deprecate, undeprecate, delete a package (management API) | named | `{name}` |

What that gives and costs, applying `auth.md`'s rules rather than re-deciding them. No route of this
format is a descriptor (`auth.md`'s resolved name-free-document decision, was Q23 there): the
listing names each registry's tree hash, which changes whenever any package does, and the registry
tarball enumerates every package, so both stay none. **A patterned `pull` cannot resolve on this
format**: every client reads the listing and the registry first, both report `none`, and a patterned scope never authorizes `none`, so a real
`Pkg.add` under a token patterned `Acme*/**` fails at the listing (and, on a fresh depot, then
tries GitHub), while `curl` of an in-pattern package tarball under the same token succeeds and
an out-of-pattern one is refused; the consequence `cran.md`, `conda.md` and `composer.md`
record. Artifacts are content-addressed and so admitted for `pull` under any pattern, which
is `auth.md`'s accepted cost for content fetched by a hash the caller already holds. **A
patterned `push` publishes** through the management API when the operation declares its
coordinate. In a virtual repository an in-pattern name matches that name in every member
registry, since the object carries no UUID; the operator documentation states it.

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines, on a
package or artifact route of either path, the handler answers `403` with a `text/plain` body
naming the policy and rule, or naming the signal for a coordinate condemned under the shared
security-signal rule. `403` rather than the existence rule's `404`, because the caller is
authorized and the content is what is refused. The handler writes it through the shared refusal
writer `WriteRefusal`, never a status line of its own (`format-handler-interface.md` AC14;
`supply-chain-policy.md` AC18), so the status line carries `Refused by policy: {condition}` over
HTTP/1.1, which neither client prints for a package or artifact. The registry listing and tarball keep naming
the refused version (the resolved policy-bypass decision below; `conda.md`'s index-elision
precedent), because the registry tarball is a content-addressed document shared by every
caller and the proxied one is the upstream's bytes.

**What the client does with the refusal is decided by its network, not by this registry**
(captured, Design, "The wire surface"): with open egress both clients fall back to GitHub for a
proxied General package and install it silently; with egress restricted to this registry both
fail naming the `git clone` of the package's `repo`; for a hosted package, which carries no
`repo`, both fail with no egress attempt (1.13's no-repository error, 1.10's "collection must
be non-empty"). The body reaches nobody
through either client, so it is for `curl` and the transcript: the reason-phrase finding
`pypi.md` named, confirmed here for a client that prints not even the status, and a stronger
finding carried to `supply-chain-policy.md`: on this format a refusal is enforceable only where
the client's egress is restricted to the registry, which the protocol reference itself names as
the intended deployment ("Firewall problems": Pkg needs "to talk to a single service").
`supply-chain-policy.md`'s table "When a refusal binds, per format" now carries it as the Julia row,
`restricted-egress` (its AC20), and `deployment.md` states the precondition as a control on the
build fleet and cites this format's capture ("Refusal enforceability is a deployment
precondition"), generating the operator page from that table. Each refusal writes one record,
readable at `GET /api/v1/repositories/{name}/refusals` (`supply-chain-policy.md` AC5).

Three edges of the refusal, stated so no implementation guesses them. A package route whose tree
is shared by several versions is refused when the shared resolution refuses any of them, since
the bytes are the same. An artifact route carries no coordinate, so the shared resolution
evaluates it by blob digest alone (scan verdicts and digest-level condemnations); a coordinate
rule naming a package does not reach the artifacts its versions carry, the policy-side twin of
`auth.md`'s content-addressed cost. In a virtual repository the refusal is the answer: a
`(uuid, hash)` the first member holding it refuses is never resolved through a later member.
And under `supply-chain-policy.md`'s refuse-until-scanned setting `FirstByteWithin` is not
honoured (its "Scanning is asynchronous"; `proxy-cache.md` AC21 as amended on its recheck), so a
cold proxied miss on such a repository fails Pkg's 20-second deadline and the client does what
its binding row says, failing with restricted egress and installing from GitHub without it: the
setting's cost on this format, stated where it is paid.

### Integrity, signing and provenance

The git tree hash is the ecosystem's only integrity primitive, carried by the registry for
packages and by each package's `Artifacts.toml` for artifacts, and the registry's own tree hash
is carried only by the listing over TLS. Nothing is signed: no registry, package or artifact
signature exists in the ecosystem, and neither client checks one.

What Julia requires of the shared services, stated so the dependency cannot be lost, and where
each now lives:

- Of `docs/internal/plans/foundation/artifact-verification.md`: **a tree-hash verification entry**,
  usable in stream by the proxy layer's fetch-and-cache and by the hosted ingest, that takes a
  compressed archive stream, a compression format, a resource kind (registry semantics with empty
  directories, or package and artifact semantics without empty directories and `.git`) and an
  expected SHA-1 tree hash, computes it with collision detection, and answers match, mismatch or
  collision detected. It is that spec's integrity entry `internal/verify/treehash` ("Julia's git
  tree hash with collision-detecting SHA-1, resource-kind flag, streaming over the compressed
  archive"), asserted under both resource kinds with a `mismatch` on the proxied path leaving
  nothing in the CAS (its AC18); an integrity entry is never stored as a verdict, which suits a
  format with nothing signed. Because this spec asked for an entry, the conformance matrix's
  verification column needs a passing hosted and a passing proxied verification case for Julia
  (`artifact-verification.md` AC24), which AC9 and AC17 here carry.
- Of `docs/internal/plans/foundation/signing-service.md`: nothing beyond the unsigned generation
  above.

Advisory matching for Julia coordinates is the policy engine's coordinate-level path: **OSV
defines the `Julia` ecosystem** and every record names its package by name **and** UUID
(`pkg:julia/{name}?uuid={uuid}`). Matching by name alone would condemn a private package that
happens to share a public name, the one confusion Julia's UUIDs otherwise rule out, so the
requirement carried to `supply-chain-policy.md` is that a Julia coordinate is matched by its
UUID, which the handler reports as the package-level advisory key on the write that records the
`Package` row (a hosted publish; on the proxied path the index-driven materialisation of the row
at first request) and the fetch-and-cache request carries, stored core-parsed outside the
document and matched at resolution and at a feed sync with no request in flight (its resolved
advisory-key decision, was Q11, AC24; `data-model.md` AC46), never supplied per request; that
spec's coverage table carries it ("Julia | covered (`Julia`, 1,717 JLSEC advisories, no `MAL-`
entries) | the package UUID, `pkg:julia/{name}?uuid={uuid}`, never the name alone", its AC17),
with the advisories' `SEMVER` ranges under its vendored semver ordering over the version-level
key, the canonical version string. AC26 states the end state. No `MAL-` entry exists for the ecosystem today, so the feed carries no security signal for
Julia yet; the shared rule applies unchanged if one appears.

### The proxied path

The handler owns the request and classifies for the proxy layer's fetch-and-cache API per the
settled decisions in `proxy-cache.md`. The upstream is a Pkg server base URL
(`https://pkg.julialang.org` or a private PkgServer.jl) with a configured **flavor**
(`conservative` by default, `eager` by choice). Creation runs only the transport validation
`upstream-adapters.md` runs on every remote create and update (its AC23, which accepts an
unreachable but well-formed upstream and refuses a malformed one `upstream-invalid`); the
protocol check runs at the first request that needs the upstream, where every format's moved
once that sibling settled it: a `/registries.{flavor}` whose body holds no line of the listing
grammar is a fetch failure answered `502` naming the flavor path, recorded under
`cache_fetch_failures_total`, adopted as nothing and retried at the next request (AC20). The
transport is that spec's `https` adapter under
the upstream's allowlist and credential role, and its requirements table carries this format's row;
the protocol half (which documents to fetch, the flavor, the registry index) stays in this handler.
Each item this spec asked of it is placed: redirects across hosts are followed inside the adapter
(`pkg.julialang.org` answers `301` to a regional host, which answers `302` to
`storage.julialang.net`, captured), each hop admitted only if the host is on the upstream's
off-origin allowlist, the regional and storage hosts entered with role `none`, and no upstream
`Location` ever reaches a client (its AC7, AC8); an upstream credential (`bearer` or `basic`, for a
private PkgServer.jl) reaches the configured root host and no other (its AC6); the request is built
only from the handler's `Request` fields, so no `Julia-CI-Variables` or other client header is ever
forwarded (its AC4); and `Accept-Encoding` is `identity` unless the handler opts in per request,
which it does with `zstd, gzip` only for the zstd representation, receiving the body still encoded
(its AC5, which names this format's opt-in). Requesting `/registries.{flavor}` rather than
`/registries`, so the upstream's per-client flavor redirect never applies, is the handler's.

- **The listing is mutable metadata with a short TTL**, refetched whole: the live listing
  carries no `ETag`, no `Last-Modified` and no caching header (captured), so a conditional
  request is impossible and the 88-byte body is cheaper to refetch than to validate. General's
  tree hash changes many times a day (the live `/meta` reported a registry update seconds
  before the sample), so the default TTL is the proxy layer's metadata default
  and a newly registered version becomes visible when it passes. Clients' own listing requests
  are answered from the cached listing inside the TTL, and every line is passed through
  verbatim; lines outside the grammar are dropped.
- **Registry tarballs are immutable artifacts** keyed by `(uuid, hash)` and cached
  indefinitely: a tree hash names one tree forever. Every generation a client has been told
  about stays servable while cached, so a client that read the listing just before it
  changed still installs. The fetch carries the tree-hash entry with registry semantics as the
  handler-supplied **verifier** of `proxy-cache.md`'s completion-only mode (the tree hash is not a
  digest of bytes, so no declared digest exists), and a `FirstByteWithin` of 20 seconds (Design,
  "The wire surface"); nothing mismatched is committed (its AC20, AC21).
- **Each cached registry generation is parsed into the registry index**, held in the
  repository-level document and CAS-backed above the threshold: for every package, UUID to
  name, and for every version, tree hash to version and yanked flag. The index only grows (a
  version that leaves a later generation stays resolvable, per the removal table below). It is
  what resolves a `/package/{uuid}/{hash}` to the `{name}/{version}` the policy call and the
  addressed object need; General at 11 MB gzip is the design point, so the parse streams and
  a CI benchmark gate bounds its time and peak memory (AC15), because `CLAUDE.md` makes
  performance a gate. The parse runs inside the fetch that caches the generation, in the
  handler's verifier once the tree hash has matched, and the index is rewritten in the commit
  that creates the tarball's cached reference, so a version new in a generation is resolvable
  from the moment a client holds that generation (the race AC24 closes). The index and the
  cached listing are the remote's current documents: never LRU-evicted, outside the cache quota
  and counted in `cache_metadata_bytes{repository}` (`proxy-cache.md`'s resolved
  metadata-eviction decision, was Q21, AC29), the honest cost of an index that only grows,
  bounded by General's version count rather than by any request. The format declares a
  retained-revision count of zero (its was-Q19, AC27): every generation a client can request is
  a cached file under its own reference, no superseded listing is kept, and nothing is held by
  mention. Nothing on this wire is signed, so each adoption runs under anchor class `none` (its
  AC25; `data-model.md` AC44) and what a signed virtual may admit never arises.
- **Package and artifact tarballs are immutable artifacts**, cached indefinitely, fetched with the
  tree-hash entry with package and artifact semantics as the verifier and the same
  `FirstByteWithin`, never committed on a mismatch, a truncated body (the adapter's `ErrTruncated`
  never reads as a clean end, `upstream-adapters.md` AC13) or an archive that will not unpack. A package request whose
  `(uuid, hash)` is not in the registry index answers `404` without an upstream request (the
  resolved unknown-coordinate decision below); an artifact request needs no index, because its
  hash is the whole coordinate and there is no version for policy to evaluate beyond the
  artifact itself.
- **The same tree in different bytes is not an event.** The upstream may recompress, and a
  re-fetch whose bytes differ but whose tree hash matches is simply another valid
  representation. The only integrity failure is a tree that does not match its hash, which is
  never committed; there is no immutability-violation row on this format because the
  coordinate is the tree, not the bytes.
- **Missing resources are negatively cached** with the short TTL: the upstream's `404` (from
  the storage host, after the pkg server's `302`) for a package or artifact is how absence is
  learned, and both clients retry an artifact three times, so a negative entry saves two
  upstream requests per client; a `429` or `5xx` is never cached as absence (`proxy-cache.md`
  AC9). The operator's "refresh now", `POST /api/v1/repositories/{name}/refresh`, marks the listing
  and every negative entry due for revalidation (`management-api.md` AC29; `proxy-cache.md` AC24),
  the explicit refresh AC16 names.
- **No URL rewriting exists on this format.** No resource carries a registry URL: the client
  builds every URL from its own server setting. The `repo` fields in a proxied General point
  at GitHub and are served untouched, because the registry tarball is content-addressed and
  rewriting it would make this registry the author of a different General (the resolved
  policy-bypass decision below).
- **Publish and every management operation against a `remote` repository answer `405`** with the
  `repository-type` problem (`management-api.md` AC7).

Upstream removal maps onto `proxy-cache.md`'s event classes ("Upstream removal or replacement"), the
handler classifying and the layer responding, as Julia's side of that contract:

| Upstream event, as observed at revalidation | Class | What this format adds |
|---|---|---|
| A new listing names a new generation in which a version gains `yanked = true`, or a package gains `[metadata.deprecated]` | Ordinary metadata change | The new generation is served when a client asks, the cached tarballs keep serving, and yank semantics (a pinned version still installs) are the ecosystem's own; `proxy-cache.md` names "Julia `yanked`" as an ordinary metadata change on this wire |
| A version, or a whole package, is absent from a new generation (General's rare administrative removals) | Removal with no signal | Keep serving the cached tarballs and keep the index entry; the wire carries no reason |
| The upstream answers `404` for a package or artifact this registry holds | Removal with no signal | Keep serving |
| The listing names a registry UUID that disappears | Ordinary metadata change | Cached generations keep serving |
| The listing names a generation older than one already seen | Ordinary metadata change | `proxy-cache.md`'s regression rule has nothing to compare here: the listing carries no `Last-Modified` and a generation's tree hash has no order. Every generation stays servable by its tree hash, a client asks for the one the listing names, and no client compares generations |
| A fetched representation's tree does not match its hash | Integrity failure at fetch | Not committed, no negative entry, the operator alerted, the next request tries again |

Detection happens at revalidation, passively, per `proxy-cache.md`'s resolved passive-detection
decision (was Q12); the active channel is the policy engine's advisory feed, which carries the
`Julia` ecosystem through OSV, and it is the only channel that could condemn a Julia coordinate
as malicious under the shared security-signal rule. Nothing on this wire is an explicit
security signal.

Per the resolved preconfigured-upstream decision below, `pkg.julialang.org` stays
user-configured in v1, the answer the Tier 2 specs adopted and `proxy-cache.md` confirmed (its
resolved preconfigured-set extension, was Q14).

### Virtual repositories, and why Julia can have what Hex cannot

`hex.md` found virtual repositories impossible because every registry resource is signed under
the repository's own name and the client checks that name. A Julia registry is unsigned, names
only itself, and is addressed by its own UUID; the protocol reference already defines a Pkg
server as serving **several** registries in one listing, and both clients install every
registry a fresh depot's server lists (captured: General and StubReg from one listing). A
`virtual` Julia repository is therefore expressible and is served, and it needs **no merge of
any document** (the resolved virtual-repository decision below):

- Its listing is the concatenation of its members' listings in member order, **deduplicated by
  registry UUID, first member wins**; a hosted member contributes its one line and a remote
  member the lines of its cached upstream listing. It is rendered per request through
  `ServeRendered`'s lazy form, its `Last-Modified` the latest of the virtual's own pointer
  record and its members' records and its `ETag` covering that value (`signing-service.md`
  AC32), because no handler sets a validator itself (its AC11); Pkg reads neither, so the
  door's rule costs nothing here.
- A registry, package or artifact request resolves through the members in order by its whole
  coordinate: a registry by `(uuid, hash)`, a package by `(uuid, hash)` through the first member
  whose registry index or lookup holds that pair (two members may hold one UUID, a hosted fork
  beside General, and only the member holding the requested tree serves it), an artifact by hash
  through each member in turn. Content addressing makes the first match authoritative, since a
  tree hash names one tree; a refusal by the first member holding the pair is the answer, never
  a fall-through (Design, "Policy refusals on the wire").
- Configuring a virtual repository whose members' registries share a **name** under different
  UUIDs is refused at configuration naming both, because Pkg files packed registries by name
  and the second would replace the first in the client's depot.
- **Nothing is merged, so nothing is deferred**: the listing is concatenated per request from the
  members' current listings, the format's generator declares no `Merge` (`signing-service.md`, "The
  generator contract", which names this format's union as the case), no `index.merge` job exists
  for it, and a member's write is visible in the virtual at the next listing request. A virtual
  repository creates no snapshots, and every management operation against it answers `405` with the
  `repository-type` problem.

The virtual repository is **the recipe, not an option**: `JULIA_PKG_SERVER` is one URL, and a
private package that depends on General resolves only when General is installed beside the
private registry (captured failure above), so a team with a hosted repository points its
clients at a virtual repository over that hosted repository and a General remote. On a fresh
depot both registries install automatically; on a depot that already holds General,
`Pkg.Registry.add()` with no argument adds the hosted one (captured on both).

### What it needs from Deps

The pinned `Deps` (`format-handler-interface.md`): the CAS, the metadata store at all three levels
with snapshot-pointer resolution, the fetch-and-cache entry point with classification as an argument
and the request shape `proxy-cache.md`'s "Obligation to the handler interface" states (a
handler-supplied verifier, `FirstByteWithin`; a re-open input), the central authorizer, and the
request logger, with the policy-enforcing resolution calls returning the typed refusal. Beyond the
pin, each now specified by its owner rather than invented here: the `Verifier` consumer interface
for the tree-hash integrity entry of `artifact-verification.md` (`format-handler-interface.md`
AC15); `upstream.Options` on fetch-and-cache for the adapter's allowlist, credential role and
encoding opt-in (`upstream-adapters.md`); the refusal writer `WriteRefusal`
(`format-handler-interface.md` AC14); and, outside `Deps`, the optional `Indexer` interface through
which `signing-service.md`'s runtime generates and serves the registry and the listing, and the
optional `Operator` interface through which `management-api.md`'s `Submit` reaches `publish`,
`withdraw`, `restore`, `annotate`, `delete-version` and `delete-package` (optional interfaces held
apart until the re-open, `format-handler-interface.md`'s resolved optional-interfaces decision, was
Q10 there).

### Capabilities and lifecycle

`Capabilities()` declares proxy support `supported`, reference-implementation availability
`available` (PkgServer.jl, below), `Virtual: supported` (the section above, and the norm for this
format, which `data-model.md` records by name: "a virtual repository is the only way a private
package that depends on the General registry can resolve") and `Rename: supported`, the four fields
`format-handler-interface.md` AC13 names. Rename is supported because nothing a client reads names
the repository: the listing's line is server-relative, and the registry's name and UUID are fixed
at repository creation in the repository-level document, not derived from the repository's current
name, so a renamed repository serves a byte-identical registry under the same tree hash and the
client's depot entry `{name}.toml` is unaffected; only `JULIA_PKG_SERVER` must name the new path,
which the operator documentation states beside the note that the registry keeps its creation-time
name. The old name answers `not-found` indistinguishably from a never-existing repository
(`repository-lifecycle.md` AC12). `repository-lifecycle.md` AC12 requires
`conformance/julia/rename_test.go`, enforced by the harness's case-set validator
(`conformance-harness.md` AC26); AC28 carries it with the real clients.

### Conformance, the two clients and the corpus

The two pinned Pkg generations straddle real differences, all captured: only 1.13 sends
`Accept-Encoding: zstd, gzip`; 1.13 still requests the listing under `JULIA_PKG_OFFLINE`; 1.13
marks yanked and deprecated packages and 1.10 shows neither; 1.13's tree-hash warning names the
URL and 1.10's does not; 1.13 reports a package with no source as "has no repository URL
available" where 1.10 attempts the clone first; and 1.10 prints "Updating registry at" on
every operation that fetched the listing. Julia has one client, so the catalogue counts one
ecosystem and no multiplier row, and both versions appear in the matrix's Client column under
the Julia row. Every hosted and proxied case runs on both.

**Every Julia case runs with the client's network restricted to this registry and its
stand-ins.** An open network makes almost every failure case pass silently through the
fallback chain, so a case that forgot the restriction would assert nothing. This format first
stated that restriction as an obligation of its own; it is now inherited: every client container
reaches only the hostnames its case declares (`conformance-harness.md`'s resolved
client-confinement decision, was Q6 there, AC23), and the redirect chain's regional and storage
stand-ins are `hosts` sub-entries of the `upstreams` entry, resolvable by their declared names
inside the client container (the same criterion). AC14's hosted and proxied halves still assert
that the restriction is in force by observing the fallback's name-resolution failure, because a
case that passed through an unrestricted network would prove nothing about enforcement.

The recorded surface for the replay corpus, named now because a thin recording script yields a
thin specification: against `pkg.julialang.org`, a cold `Pkg.add` of a package with a
dependency and an artifact on each client (listing, General tarball, package and artifact
tarballs, the redirect chain), the same with zstd on 1.13, `Pkg.Registry.update()` across a
General generation change, `Pkg.instantiate()` of a `Manifest.toml` pinning a yanked version,
and a missing package. The reference implementation for the read surface is PkgServer.jl, run
in a container pinned by digest in front of a storage stand-in, so `Capabilities()` declares
reference-implementation availability `available`; one fact about it is recorded rather than
trusted: at the pinned commit its download verification is commented out
(`src/resource.jl`), so the corpus asserts this registry's verification against the recorded
hashes, never against the reference's behaviour. Both halves are rows of
`conformance-harness.md`'s authoritative-reference exception list (its AC28, which fails an
unlisted local reference): the hosted read half, recorded against that PkgServer.jl in front of
a storage stand-in serving the fixture registry, packages and artifact hashed by the pinned
images' own Pkg, because no public Pkg server serves a registry a test can publish into, while
the proxied half is recorded against `pkg.julialang.org`; and a write row reading none, because
no Julia client publishes to a Pkg server (the ecosystem publishes through git), so publish and
every management kind are `script`-driven cases proven by the effect the real clients observe
(its AC26). The rows are reported to that spec as a sibling consequence; the reference's digest
lives in the corpus manifest (its resolved digest-location decision, was Q7). Recording gates
on the harness's redaction criterion
(`conformance-harness.md` AC13); the `Authorization` header and the `auth.toml` written into
the depot are both named by this format's redaction rule, and `Julia-System`,
`Julia-CI-Variables` and `Julia-Interactive` are normalised out of replay because they describe
the recording host. Every deliberate divergence goes on the exception list before its flow is
expected to replay: one listing for all three listing paths, no `/meta`, no flavor redirect,
the previous registry generation served after an update, `404` for a package coordinate the
index does not know, `405` on remote writes and `409` on a changed-tree republish.

## Acceptance Criteria

- [ ] AC1: With `JULIA_PKG_SERVER` set to a hosted repository's format-first URL and the client
      network restricted to this registry, `Pkg.add` on Julia 1.10.12 and 1.13.0 from a fresh
      depot adds the registry, resolves a package and its in-registry dependency, installs
      exactly the published trees, and writes a `Manifest.toml` whose `git-tree-sha1` for each
      equals the tree hash this registry computed; the transcript shows the metadata headers on
      every request and the path prefix kept; a warm `Pkg.add` in a new environment fetches no
      package tarball; and under `JULIA_PKG_OFFLINE=true` a warm run makes no request on 1.10
      and only listing requests on 1.13.
- [ ] AC2: The listing answers `text/plain` lines of exactly the form `/registry/{uuid}/{hash}`
      with no mount prefix, identically at `/registries`, `/registries.eager` and
      `/registries.conservative` and under `HEAD`; the registry tarball it names has that tree
      hash under `Tar.tree_hash` and a `Registry.toml` carrying the repository's registry name
      and the UUID minted at creation; `Pkg.Registry.add(uuid = ...)` and the no-argument
      `Pkg.Registry.add()` on a depot already holding General each add it on both clients,
      while `Pkg.Registry.add("{name}")` fails with the captured "no path or url specified for
      registry"; and creating a repository whose registry name is `General` is refused.
- [ ] AC3: A publish through the management API's `publish` kind of a source tree with a
      `Project.toml` produces exactly one snapshot in which the version, its package
      representations and the regenerated registry land, the head listing naming the new
      generation before the response is sent; the stored tarball is the canonical re-pack whose
      tree hash equals the coordinate; the `201` `Operation` result carries the coordinate, the tree
      hash and the registry tree hash; a fresh `Pkg.add` on both clients installs it; and a body
      that is not a tar, has no root `Project.toml`, lacks `name`, `uuid` or `version`, or disagrees
      with its declared coordinate is refused `validation` (422) with nothing referenced.
- [ ] AC4: A republish with the same tree hash creates no snapshot and completes with
      `unchanged: true` in its `Operation`; one with a different tree hash is refused with `409`; a publish binding an existing name to another UUID, an
      existing UUID to another name, or a name equal to an existing one under case folding is
      refused with `409`; a deleted coordinate is refused with any tree by the shared write path's
      retirement check with the `retired` problem, including after the deleting snapshot has been
      pruned out of retention and after a backwards repoint; and versions are parsed as a
      `VersionNumber`, so `1.0` and `1.0.0` publish as one version stored as `1.0.0`, and build
      metadata such as `1.18.0+0` is kept, so that after `1.18.0+0` is deleted and retired,
      `1.18.0+1` publishes and `1.18.0+0` is refused `retired`.
- [ ] AC5: A yank through the management API's `withdraw` kind regenerates the registry in one snapshot,
      after which `Pkg.add(name = ..., version = ...)` of the yanked version fails on both
      clients with the captured unsatisfiable-requirements message, `Pkg.instantiate()` of a
      `Manifest.toml` pinning it installs it on both, 1.13's status marks it `[yanked]`, the
      tarball still serves, and an unyank (`restore`) makes it resolvable again in one further
      snapshot, neither retiring anything.
- [ ] AC6: A deprecation through the management API's `annotate` kind regenerates the registry in one
      snapshot with a `[metadata.deprecated]` table carrying the reason and alternative in the
      package's `Package.toml`, after which 1.13 marks the package `[deprecated]` and `status --deprecated`
      prints the reason and alternative, 1.10 installs it with no marker, and an undeprecation
      clears the marker in one further snapshot.
- [ ] AC7: Deleting a version through the `delete-version` kind removes it from the registry in one
      snapshot and writes its `Retirement` record in the same transaction, its tarballs answer
      `404`, and `Pkg.instantiate()` of a `Manifest.toml` pinning it fails on 1.13 with the
      captured "has no repository URL available" error and on 1.10 with the captured
      "ArgumentError: collection must be non-empty", with no
      request leaving the client for any host but this registry; deleting a package through
      `delete-package` retires every version, removes the package from the generated registry
      so that neither client asks this registry for any of its trees afterwards (the
      `is_pkg_in_pkgserver_registry` check answering no, asserted at the network layer), and
      keeps its name bound to its UUID; and no package-level document carries retirement state.
- [ ] AC8: Every management operation driven through the registry-owned endpoint produces the
      documented effect in exactly one snapshot, is refused with no snapshot for a principal
      lacking its kind's action (`push` for `publish` and `annotate`; `delete` for `withdraw`,
      `restore`, `delete-version` and `delete-package`), and answers `405` with the
      `repository-type` problem against a proxied or virtual repository.
- [ ] AC9: Registry tarballs are verified with `Tar.tree_hash` semantics (`skip_empty = false`)
      and package and artifact tarballs with `GitTools.tree_hash` semantics: a published tree containing an empty directory, a `.git` directory, an executable
      file and a symlink is stored under the tree hash `GitTools.tree_hash` computes and
      installs on both clients; the shared tree-hash entry's SHA-1 reports a detected collision on the
      SHAttered inputs, and a tree whose hashing reports one is refused at ingest with the
      collision named on the hosted path and on the proxied path; a received tarball holding a
      hard link is served only as the canonical re-pack with the link materialised as a file,
      one holding an absolute path, a `..` segment, a repeated path or a device entry is refused
      `validation` (422), and an archive exceeding the decompression bound is refused
      `validation` on the hosted path and never committed on the proxied path, each after
      reading at most the bound.
- [ ] AC10: A package, registry or artifact request whose `Accept-Encoding` names `zstd` (1.13's
      `Accept-Encoding: zstd, gzip`) is
      answered with a zstd body and any other request with a gzip body, both with
      `Content-Type: application/octet-stream`, no `Content-Encoding` and `Vary:
      Accept-Encoding`; each representation is a distinct blob verified against the same tree
      hash before commit; 1.13 installs the zstd body and 1.10 the gzip body of one version; a
      proxied zstd-accepting fetch answered by a stand-in with a gzip body stores and serves it
      as the gzip representation; and a `HEAD` on every route of both paths answers the `GET`'s
      status and headers with `Content-Length` and no body, a cold proxied `HEAD` filling the
      cache with one upstream `GET`.
- [ ] AC11: A publish carrying an artifact tarball makes `/artifact/{hash}` serve it and both
      clients install the artifact from this registry with no request to its `download` URL;
      an artifact claimed under a wrong tree hash is refused with `422`; an artifact carried
      by two versions is one blob and survives the deletion of one of them; after the last
      holder is deleted it answers `404`; and an artifact the `Artifacts.toml` (or
      `JuliaArtifacts.toml`) names but the publish did not carry is listed in the `201` body.
- [ ] AC12: On a private repository a credential-less request answers `401` byte-identical for
      a private and a non-existent repository; both clients with the token as `access_token` in
      `{depot}/servers/{host}/auth.toml` resolve and install, the transcript showing
      `Authorization: Bearer` on every request to this registry and on none to any other host;
      a valid token lacking `pull` answers `404`; a rejected token answers `401` and is never
      served as anonymous; the clients reach this registry over TLS with the harness CA in
      `JULIA_SSL_CA_ROOTS_PATH`; and a credential over a connection this registry did not
      terminate with TLS is refused per `auth.md` AC27.
- [ ] AC13: A token holding only `pull` under the pattern `Acme*/**` is refused the listing and
      the registry so that `Pkg.add` under it fails on both clients, fetches an in-pattern
      package tarball through `curl` and is refused an out-of-pattern one, and fetches an
      artifact by hash; a token holding `push` under the same pattern publishes `AcmeTool`
      with the coordinate declared and is refused `OtherTool`, with no snapshot created by a
      refusal, a tree whose `Project.toml` names an out-of-pattern package refused after the
      body arrives, and an undeclared publish refused; and in proxied mode the patterned
      `pull` token fetches an in-pattern package tarball and is refused another.
- [ ] AC14: A package or artifact request the shared policy layer refuses answers `403` with a
      `text/plain` body naming the policy, written through `WriteRefusal`, on the hosted and the
      proxied path; with the client
      network restricted to this registry, `Pkg.add` of a refused hosted version exits
      non-zero on both clients with their captured no-repository errors and a refused proxied General version
      exits non-zero on both clients naming the failed clone of its GitHub `repo`, with the
      body captured in the transcript and no request reaching any other host; and a version
      refused in the first member of a virtual repository that holds it is refused through the
      virtual, never served by a later member holding the same tree.
- [ ] AC15: Against a stand-in serving the recorded General tarball (11,463,725 bytes gzip)
      behind the recorded `302` to a storage stand-in, both clients install a General package
      with an artifact through a proxied repository; each tarball was verified against its tree
      hash before commit; from a fresh depot a second install on each client reaches this
      registry while the upstream receives no request for any tarball, asserted at the network
      layer; and building the registry index from that generation runs with peak memory and
      time under the thresholds a CI benchmark gate fails on.
- [ ] AC16: A proxied listing is refetched after its TTL and not before, a new upstream
      generation becoming visible to `Pkg.Registry.update()` after the TTL and, absent an
      explicit refresh through `POST /api/v1/repositories/{name}/refresh`, not before; the upstream receives `/registries.{flavor}` with the
      configured flavor whatever preference header the client sends; and the previous
      generation's tarball is still served to a client that read the older listing.
- [ ] AC17: A stand-in serving a package, artifact or registry tarball whose tree does not match
      its hash, a truncated body, or an archive that will not unpack, is never committed to
      the CAS and attaches no cached reference, the real reason is recorded observably to the
      operator, and the next request fetches again; and a stand-in serving the same tree
      recompressed with different bytes is accepted as a valid representation with no
      divergence recorded.
- [ ] AC18: A package or artifact the upstream lacks is answered `404` and negatively cached,
      so an artifact install that the client retries three times causes one upstream request,
      while an upstream `429` or `5xx` is neither cached as absence nor surfaced as not-found
      and succeeds as soon as the upstream recovers.
- [ ] AC19: Two clients starting a cold install concurrently against a stand-in that delivers
      the General-sized registry tarball over 40 seconds both complete, neither aborting on
      Pkg's 20-second low-speed limit, because the handler's fetch declares `FirstByteWithin` of
      20 seconds and both responses stream from the in-flight spool and complete only after the
      verified commit; and the upstream serves the tarball once.
- [ ] AC20: Creating a remote repository makes no upstream request; the first listing request
      against a stand-in answering the configured `/registries.{flavor}` with no line of the
      listing grammar is answered `502` naming the flavor path with nothing adopted, and the
      request after the stand-in is corrected succeeds; a proxied fetch follows the stand-in's cross-host
      redirects, forwards the upstream credential to the configured host only, and sends no
      `Julia-CI-Variables` header, asserted at the network layer.
- [ ] AC21: An upstream generation that yanks a version or deprecates a package is propagated at
      the next revalidation with no divergence recorded, and the yanked version's cached
      tarball still installs from a `Manifest.toml`; a version or package absent from a new
      generation, or answered `404` upstream, keeps serving with a divergence recorded; and a
      coordinate condemned through the advisory feed is refused with no upstream request; each
      event produces the `proxy-cache.md` event class the table names (its AC13).
- [ ] AC22: A virtual repository over a hosted repository and a General remote lists both
      registries, deduplicated by UUID with the first member winning, and both clients
      install from a fresh depot a hosted package that depends on a General package, while the
      same install against the hosted repository alone fails with the captured "cannot find
      name corresponding to UUID" error; package, registry and artifact requests resolve
      through the members in order by their whole coordinate, a package UUID held by both
      members resolving to whichever holds the requested tree; and configuring a virtual repository whose members'
      registries share a name under different UUIDs is refused naming both; and a member's publish is
      visible in the virtual listing at the next request with no merge job.
- [ ] AC23: Every hosted registry generation is produced by the shared index service inside the
      triggering write through this format's generator package, never by the handler, proven by
      an architecture test that the handler package contains no registry-tree writer and imports no
      signing library; two concurrent publishes into one repository
      both land and the served registry lists both; repointing to a snapshot's predecessor
      serves the previous listing and tarball byte-identical; a registry generation above the
      inline threshold is stored as a CAS blob, survives a GC sweep under the CAS-backed
      metadata mark root and is served to a real client afterwards; and a publish landing
      between a client's listing request and its registry request leaves that client's install
      succeeding.
- [ ] AC24: A proxied `/package/{uuid}/{hash}` whose coordinate is in no cached registry
      generation answers `404` with no upstream request, a version new in a generation is served
      to the client that just received that generation's tarball with no window in which the
      tarball is held and the version unknown, a version absent from the newest
      generation but present in an earlier cached one still serves, and a UUID or hash in a
      non-canonical spelling answers `404` on both paths.
- [ ] AC25: Replay-match passes against a corpus recorded from `pkg.julialang.org` and from a
      pinned PkgServer.jl in front of a storage stand-in, covering the recorded surface named
      in Design, with `Julia-System`, `Julia-CI-Variables` and `Julia-Interactive` normalised
      out and the `Authorization` header and depot `auth.toml` redacted.
- [ ] AC26: With a case-controlled advisory naming `pkg:julia/{name}?uuid={uuid}`, a policy
      refusing it refuses that package's affected version on the hosted and the proxied path,
      at resolution and at a feed sync with no request in flight, the UUID being the stored
      package-level advisory key and the version string the version-level one, and a package
      of the same name under another UUID in another member of the same virtual repository
      still installs on both clients.

- [ ] AC27: A hosted registry generation carries exactly the published state: `Registry.toml`
      names every package holding a current version, yanked ones included, by UUID, name and
      path, and no package whose every version is deleted; each `Package.toml` carries `name` and
      `uuid` and no `repo`; `Versions.toml` maps each version to the tree hash this registry
      computed, with `yanked = true` on yanked versions; `Deps.toml`, `Compat.toml`,
      `WeakDeps.toml` and `WeakCompat.toml` carry each version's `Project.toml` entries under
      single-version keys that Pkg resolves on both clients; and regenerating an unchanged
      registry yields byte-identical tarballs with the same tree hash and `ETag`.
- [ ] AC28: `Capabilities()` declares proxy `supported`, reference implementation `available`,
      `Virtual: supported` and `Rename: supported`; after a hosted repository is renamed, both
      clients with `JULIA_PKG_SERVER` set to the new path update and install from it, the registry
      keeping its creation-time name, UUID and tree hash with byte-identical tarballs and each
      client's existing depot entry `{name}.toml` still naming it, and the old
      name answers `not-found` exactly as a never-existing repository does.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/julia/hosted_test.go` (both pinned images, network-restricted client containers, fresh depots in setup; `Manifest.toml` parsed for tree hashes; warm and offline runs asserted from the transcript and at the network layer) |
| AC2 | conformance + integration | `conformance/julia/registry_test.go` (`curl` on the three listing paths and `HEAD`; `Pkg.Registry.add` by UUID, with no argument and by name on both clients); `internal/format/julia/listing_test.go` (line grammar, no prefix, `Tar.tree_hash`-equivalent verification of the served tarball, `General` name refusal) |
| AC3 | conformance + integration | `conformance/julia/publish_test.go` (the `script` publishes through the management endpoint, then real installs on both clients from fresh depots; refusal fixtures through `curl`); `internal/format/julia/publish_test.go` (snapshot count and content set, head-listing visibility before the response, canonical re-pack hash) |
| AC4 | integration | `internal/format/julia/immutability_test.go` (idempotent republish with `unchanged: true` and no snapshot, `management-api.md` AC5; changed tree; name and UUID binding; case-fold collision; retired coordinate after pruning under an injected clock and after a backwards repoint, and the `1.18.0+1` sibling of a retired `1.18.0+0`; the core check is `management-api.md` AC12's) |
| AC5 | conformance + integration | `conformance/julia/yank_test.go` (explicit pin refused on both; `Pkg.instantiate` of a pinned manifest on both; 1.13 marker; unyank); `internal/format/julia/yank_test.go` (one snapshot per operation, tarball retained) |
| AC6 | conformance | `conformance/julia/deprecate_test.go` (1.13 status and `status --deprecated` text, 1.10 unaffected, undeprecate) |
| AC7 | conformance + integration | `conformance/julia/delete_test.go` (the operations from the case `script`; pinned manifest fails on both, network layer showing no other host contacted; after `delete-package` the generated `Registry.toml` omits the package and the network layer shows no package request for it); `internal/format/julia/delete_test.go` (`Retirement` records in the deleting transaction, no retirement state in any document, name-UUID binding kept) |
| AC8 | conformance + integration | `conformance/julia/manage_test.go` (each declared kind through the management endpoint from the case `script`, followed by a real resolve; the per-kind case rule of `management-api.md` AC24 and `conformance-harness.md` AC26); `internal/format/julia/manage_auth_test.go` (`pull`-only and `push`-only refusals with snapshot count unchanged, `405` `repository-type` on remote and virtual) |
| AC9 | conformance + unit + integration | `conformance/julia/treehash_test.go` (the edge-case tree installed on both clients); `internal/verify/treehash/treehash_test.go` (the shared entry checked against `Pkg.GitTools.tree_hash` and `Tar.tree_hash` outputs recorded from the pinned images under both resource kinds; the SHAttered inputs through the collision-detecting SHA-1; shared with `artifact-verification.md` AC18); `internal/format/julia/repack_test.go` (hard-link materialisation; absolute, climbing, repeated and device entries refused; the decompression bound refused on the hosted ingest and uncommitted on the proxied fetch, memory bounded); `internal/format/julia/collision_ingest_test.go` (a detected collision injected at the `Verifier` seam on the hosted ingest and the proxied fetch, nothing committed) |
| AC10 | conformance + integration | `conformance/julia/encoding_test.go` (1.13 and 1.10 transcripts, magic bytes, headers; `curl -I` on each route of both paths); `internal/format/julia/representation_test.go` (two blobs, one tree hash, verification before commit on both paths; a gzip body behind a zstd-accepting proxied fetch keyed by its magic bytes); `internal/proxy/head_test.go` (the cold proxied `HEAD`, shared with `proxy-cache.md` AC32) and the serving doors' `HEAD` cases of `signing-service.md` AC32 |
| AC11 | conformance + integration | `conformance/julia/artifact_test.go` (artifact installed from this registry on both clients, the `download` URL's stand-in asserting no request); `internal/format/julia/artifact_test.go` (wrong-hash refusal, shared blob, deletion of one and of both holders, the `201` listing) |
| AC12 | conformance + integration | `conformance/julia/auth_test.go` (private repository on both clients with `auth.toml` written by the case; challenge equality; `pull`-less and rejected tokens; TLS through the harness CA; the credential absent from the fallback host); `internal/format/julia/auth_test.go` (plaintext refusal under `auth.md` AC27) |
| AC13 | conformance + unit | `conformance/julia/pattern_test.go` (the pattern-refusal case `format-handler-interface.md` AC7 requires, in both modes; pattern-scoped tokens provisioned through the `credentials` key; `Pkg.add` failing at the listing on both; `curl` in and out of pattern; artifact by hash; patterned publishes, the mislabelled and undeclared fixtures); `internal/format/julia/scope_object_test.go` (the object table, per route, `format-handler-interface.md` AC12) |
| AC14 | conformance + integration | `conformance/julia/policy_test.go` (hosted and proxied modes, network-restricted clients; rules through the `policies` key, admitted because the Julia binding row is `restricted-egress`, `conformance-harness.md` AC26; a controlled advisory through `advisories`; exit status, failure text and the transcript's `403` body asserted; a virtual over two members holding the refused tree, refused through the virtual); `internal/format/refusal_writer_test.go` (`WriteRefusal` the only writer, shared with `supply-chain-policy.md` AC18) |
| AC15 | conformance + benchmark | `conformance/julia/proxied_test.go` (the recorded General tarball and a package with an artifact behind a redirecting stand-in; both clients; network-level assertion from fresh depots); `internal/format/julia/index_bench_test.go` (index build over the recorded General tarball, peak RSS and time against the gate thresholds) |
| AC16 | conformance | `conformance/julia/proxied_ttl_test.go` (mutating stand-in listing; `Pkg.Registry.update` before and after the TTL and after a refresh from the case `script`; the flavor path asserted at the network layer under both preference headers; the previous generation's tarball) |
| AC17 | integration | `internal/format/julia/proxied_integrity_test.go` (mismatched tree, truncated body, unpackable archive, recompressed same tree; CAS and reference assertions; operator record); the verifier-hook contract is `proxy-cache.md` AC20's |
| AC18 | conformance | `conformance/julia/proxied_negative_test.go` (missing package and artifact, throttling and error stand-in responses, network-level counts including the three client retries) |
| AC19 | conformance | `conformance/julia/proxied_slow_test.go` (a stand-in throttled to 40 seconds for the General-sized tarball; two concurrent clients; both complete; one upstream fetch; shared with `proxy-cache.md` AC21) |
| AC20 | integration + conformance | `internal/format/julia/upstream_first_request_test.go` (creation with no upstream request at the network layer; the grammar-less first listing answered `502` naming the flavor path with nothing adopted, the corrected stand-in succeeding on the next request); `conformance/julia/proxied_redirect_test.go` (two-host redirect chain to declared `hosts` stand-ins, credential only to the configured host at the network layer; the adapter half is `upstream-adapters.md` AC4 to AC8) |
| AC21 | integration + conformance | `internal/format/julia/removal_test.go` (stand-in presenting each event, asserting the class; the shared-layer half is `proxy-cache.md` AC13's); `conformance/julia/removal_test.go` (upstream-yanked version installed from a manifest; advisory-condemned coordinate refused with no upstream request) |
| AC22 | conformance + integration | `conformance/julia/virtual_test.go` (hosted plus General remote; cross-registry dependency on both clients; the hosted-only failure text; member-order resolution, including a UUID held by both members resolved to the member holding the requested tree; a member publish visible at the next listing); `internal/format/julia/virtual_config_test.go` (UUID deduplication, registry-name collision refusal) |
| AC23 | architecture test + integration | `internal/format/julia/arch_test.go` (no registry-tree writer in the handler); the module-wide import test of `signing-service.md` AC2 covering `internal/format/julia/**`; `internal/format/julia/concurrent_publish_test.go` (two writers, both listed, predecessor repoint byte comparison); `internal/storage/metadata_blob_gc_test.go` (threshold crossing, sweep, serve); `conformance/julia/registry_race_test.go` (a publish injected between a client's listing and registry requests) |
| AC24 | conformance + unit | `conformance/julia/proxied_index_test.go` (unknown coordinate with the network layer showing no upstream request; a version new in a generation requested by the client that just fetched it, with a hold on the inspecting proxy between the two requests, `conformance-harness.md` AC27; a version dropped from the newest generation still served); `internal/format/julia/route_test.go` (non-canonical UUID and hash spellings on both paths) |
| AC25 | conformance | `conformance/julia/replay_test.go` |
| AC26 | conformance + integration | `conformance/julia/advisory_uuid_test.go` (a virtual repository whose two members each hold a package of one name under different UUIDs; the advisory through the `advisories` key; both clients); `internal/policy/advisory_key_test.go` (the UUID stored on the `Package` row and matched at a feed sync with no request in flight, shared with `supply-chain-policy.md` AC24 and `data-model.md` AC46) |
| AC27 | integration + conformance | `internal/format/julia/index/registry_gen_test.go` (generated files parsed and compared with the published `Project.toml` entries; byte-identical regeneration under the runtime's determinism harness, `signing-service.md` AC25); `conformance/julia/registry_gen_test.go` (a version-specific dependency and compat bound resolved on both clients) |
| AC28 | unit + conformance | `internal/format/capabilities_test.go` (this handler's four declarations, `format-handler-interface.md` AC13); `conformance/julia/rename_test.go` (both clients against the renamed repository, byte comparison, old name `not-found`; required by `repository-lifecycle.md` AC12) |

The case set needs only keys already in the harness's closed `setup` vocabulary (its resolved
closed-vocabulary decision, was Q4): `repositories` with their visibility, type and virtual
member order, `credentials`, an `upstreams` stand-in (a fixture server serving the recorded
listing, General tarball, packages and artifacts behind a two-host redirect whose second host is a
`hosts` sub-entry, with variants for mutation, throttling and corruption), `state` for
pre-published, yanked, deprecated and deleted versions and their artifacts (retired coordinates
seedable, `management-api.md`, "Retirement is core-held"), and `policies` with `advisories` for
AC14, AC21 and AC26. The obligation this spec once recorded on the seed path is met by the sibling
specs: a hosted `state` entry comes out with the registry regenerated because the write-path hook
runs the index runtime on the seed write too, with no seed-side code (`signing-service.md` AC21;
`conformance-harness.md` AC24). The issued credential reaches the client as the `auth.toml` the
case writes into the depot before the client starts. The runner-enforced obligations, both modes
and the unauthenticated, unauthorized and pattern-refusal cases in each, a `script` case per
declared kind and the shared rename case (`conformance-harness.md` AC26), apply from the sibling
specs and are not restated per criterion here.

## Implementation Phases

### Phase 1: Hosted reads and the generated registry
- Waits on `docs/internal/plans/foundation/signing-service.md` reaching `planned` (Blocking
  preconditions), its Phase 1 built (the runtime, the `Indexer` contract, the unsigned consumer)
  and its Phase 4's seed-path equivalence
- The format-first mount, the generator package `internal/format/julia/index`, the listing and its
  aliases, registry, package and artifact routes with `HEAD`, compression negotiation, the
  tree-hash verification through the shared entry with both semantics and collision detection,
  the canonical re-pack, the challenge and scope mapping, the per-route addressed objects and the
  `403` rendering through `WriteRefusal`, seeded state through `state`, `Capabilities()` and the
  rename case (AC28)

### Phase 2: Publish and management
- Waits on `docs/internal/plans/foundation/management-api.md` reaching `planned` (its Phase 2:
  publish and upload sessions; its Phase 3: `Operator`)
- The `Operator` interface with `publish`, `withdraw`, `restore`, `annotate`, `delete-version` and
  `delete-package`, publish with artifacts, the name-UUID binding, core-held retirement, the
  write-boundary declaration exercised end to end under concurrency, the previous-generation rule

### Phase 3: Proxied path and virtual repositories
- Waits on `upstream-adapters.md`, `proxy-cache.md` and `artifact-verification.md` (its tree-hash
  entry, built here with this format in its Phase 4 at charter step 11) reaching `planned`
- Upstream validation per flavor, the listing TTL and refresh, registry, package and artifact
  caching with the tree-hash verifier and `FirstByteWithin`, the registry index with its benchmark
  gate, negative caching, the removal event classes, `405` on remote writes, the slow-upstream
  waiter case
- Virtual repositories: the deduplicated listing, member-order resolution, the name-collision
  refusal, the cross-registry dependency recipe

### Phase 4: Corpus and gate
- Recording session across the named surface (after the harness redaction gate) against
  `pkg.julialang.org` and a pinned PkgServer.jl, replay-match, both client generations in the
  matrix, the exception-list entries named in Design, the advisory matching by UUID, and the
  matrix's verification column (`artifact-verification.md` AC24)

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. The eight questions this draft raised were each written in the template's decision
shape and then adopted at their own recommendation under the owner's standing delegation of
2026-09-26, so the loop can continue; each is recorded below as adopted rather than decided,
folded through Scope, Design, the criteria and the Test Plan in the same pass, and reversible by
the owner at any time. `grep -rn "standing delegation"` is the owner's review queue.

### Resolved: what hosted means for Julia (was Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a hosted repository is
one Julia registry this registry generates, its UUID minted at creation and its name the
repository's, fed by management-API publishes of source trees, served over the Pkg protocol
only, with no `repo` in any `Package.toml` (Scope; Design, "Every hosted registry tarball is a
write-triggered document", "The hosted publish path"; AC2, AC3, AC7, AC23).

The question: in the ecosystem a registry is a git repository and publishing is a pull request
(Registrator) or a commit (LocalRegistry.jl), neither of which touches a Pkg server, and
`CLAUDE.md` requires a hosted path for every format but `generic`.

**Recommendation:** A. It is the only option under which every version a registry lists is a
tree this registry holds and verified, which is what a Pkg server's "completeness" guarantee
(the protocol reference) means; it keeps git off the wire, as the catalogue's split requires;
and omitting `repo` makes every hosted failure fail closed instead of egressing (captured).

| Option | You get | It costs |
|---|---|---|
| **A. A generated registry fed by management-API publishes** | Every listed version servable and verified; no git; hosted failures fail closed; one generator with the other write-triggered formats | No client publishes, so the trigger is only ever verified by our own tests; LocalRegistry.jl and Registrator users change tools; `Pkg.develop` of a hosted package has no `repo` to clone |
| **B. Accept `git push` of a registry from LocalRegistry.jl or Registrator** | Existing tooling unchanged | A git server on the wire; a registry naming package trees this registry never received, so listed versions may be unservable and the fallback sends clients to wherever `repo` points |
| **C. No hosted path; proxy only, as `generic` is exempted the other way** | Nothing to generate | A constitution change (`CLAUDE.md` permits the exemption for `generic` only), and no private Julia packages, which is the reason teams run a registry |

**Why this is yours:** it decides the publishing tool Julia teams must adopt and trades
ecosystem-tool compatibility for a registry whose contents are all verified.

Accepted cost: the publish path is a registry-specific API call and the exception list records
that no reference implementation of it exists.

Rechecked on Fable 2026-10-08: confirmed. The options were fairly framed, B being a git server
on the wire no sibling speaks and C a constitution change. One cost the record under-stated: a
package none of whose versions is current leaves the generated registry (Design, "Every hosted
registry tarball is a write-triggered document"), so deleting every version of a package also
removes it from `Registry.toml`, which is what makes a manifest pinning a deleted version fail
closed.

### Resolved: how the shared model stores and verifies tree-hash-addressed content (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: blobs stay keyed by the
CAS digest of their bytes; the git tree hash is a coordinate held in metadata and verified at
ingest on both paths with collision-detecting SHA-1 and the client's semantics per resource
kind; the hosted path stores a canonical re-pack (Design, "The tree hash is a verified
coordinate"; AC9, AC10, AC17).

The question: the Pkg protocol addresses content by the git tree hash of its unpacked tree, and
`CLAUDE.md` forbids keying a blob by anything but its digest.

**Recommendation:** A. A tree hash is not a digest of bytes: one tree has a gzip and a zstd
tarball, and the upstream may recompress (captured: 11.4 MB and 7.6 MB for one General tree), so
it cannot key bytes even in principle; treated as a coordinate, it needs no new entity, the CAS
keeps its one address, and verification becomes an ingest gate like any integrity value.

| Option | You get | It costs |
|---|---|---|
| **A. CAS digest keys bytes; tree hash is a verified coordinate; canonical re-pack on hosted** | One content address; two representations of one tree coexist; verification in one shared entry; what clients unpack is what was hashed | A streaming tar-and-hash pass on every ingest; the received tarball bytes are not what is served on the hosted path |
| **B. Key blobs by tree hash for this format** | A lookup with no metadata hop | Violates the digest-only rule, cannot hold two representations of one tree, and deduplication across formats breaks |
| **C. Serve received bytes as-is on the hosted path, verify only** | Byte-faithful to the publisher | A tarball can unpack differently on different clients (hard links, modes), so the served bytes can disagree with the hash they were verified against |

**Why this is yours:** it settles how a non-digest content address enters a model designed
around digests, a precedent for the next format that addresses by something other than bytes.

Accepted cost: a verification entry requested of `artifact-verification.md` that no other
format needs, now provided as its tree-hash integrity entry `internal/verify/treehash` (its AC18),
and the hosted re-pack recorded on the exception list. `data-model.md` states the rule this record
adopted, with this format as its example ("A coordinate is not a storage key").

Rechecked on Fable 2026-10-08: confirmed, fold amended. The record said what the re-pack keeps
and not what the ingest refuses, and it bounded nothing: absolute, climbing, repeated and device
entries are now refused, hard links materialised, and both paths run under a decompression bound
(Design, "The tree hash is a verified coordinate"; AC9), since the re-pack is the one place this
format materialises a whole archive. The verification semantics were re-read in the 1.13.0
image: `verify_archive_tree_hash` is `Tar.tree_hash` under its `skip_empty = false` default,
as the table states.

### Resolved: policy refusals against a client that falls back to origin (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: refuse with `403`,
leave the registry documents untouched, state that enforcement requires the client's egress to
be restricted to this registry, and run every conformance case that way (Design, "Policy
refusals on the wire", "Conformance, the two clients and the corpus"; AC14).

The question: both clients silently install a refused proxied General package from GitHub when
they can reach it (captured), so a refusal this registry sends is only as strong as the client's
network.

**Recommendation:** A. The alternatives cannot close the hole: rewriting the proxied General to
strip `repo` fields changes its tree hash (this registry becomes the author of a different
General) and still leaves the artifact fallback, whose URLs live inside content-addressed
package trees that cannot be rewritten without breaking every `Manifest.toml`. The protocol
itself assumes a firewall that admits only the Pkg server, and the harness already isolates
clients.

| Option | You get | It costs |
|---|---|---|
| **A. `403`, documents untouched, egress restriction as the documented requirement** | Honest behaviour; no authored copy of General; the refusal holds wherever the protocol's own deployment model holds | With open egress a refusal is advisory; the operator documentation must say so prominently |
| **B. Serve a derived General with every `repo` removed** | The package fallback cannot reach GitHub | A registry this registry authored under General's UUID, regenerated every few minutes; `Pkg.develop` breaks; artifact fallback still open |
| **C. Drop refused versions from a derived General** | The resolver never picks a refused version | B's costs, plus lockfiles pinning the version fail with a resolver error instead of a refusal, and refusal lift requires regeneration |

**Why this is yours:** it states what the product promises about supply-chain enforcement for a
client the product does not control, a claim customers will hold it to.

Accepted cost: the documentation and the per-case network restriction, both now shared:
`supply-chain-policy.md` records the Julia row as `restricted-egress` (its AC20), `deployment.md`
makes client egress restriction the deployment precondition and cites this capture, and the
harness confines every client container to its case network (`conformance-harness.md`'s resolved
client-confinement decision, was Q6 there, AC23).

Rechecked on Fable 2026-10-08: confirmed. Each sibling fold verified at HEAD:
`supply-chain-policy.md`'s binding row (`restricted-egress`), `deployment.md`'s precondition
paragraph and `conformance-harness.md`'s confinement (was Q6, AC23) each cite this capture. Two
edges added to the fold: a refusal in a virtual never falls through to a later member (AC14),
and refuse-until-scanned withholds the first byte Pkg's deadline needs, a cost now stated
(Design, "Policy refusals on the wire").

### Resolved: virtual repositories as a union of registries (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a virtual repository
lists its members' registries deduplicated by UUID, first member wins, resolves resources
through members in order, merges no document, and refuses members whose registries share a name
under different UUIDs (Design, "Virtual repositories"; AC22, AC26).

The question: `hex.md` refused virtual repositories because its registry is signed under the
repository's name; `cran.md` and `conda.md` merged indexes. Julia's registry is unsigned and
addressed by UUID, and a client must see General beside a private registry to resolve at all.

**Recommendation:** A. The protocol already lets one server list several registries and both
clients install them all, so the union is the ecosystem's own composition and needs no
generated document; merging registry contents instead would forge a registry under someone
else's UUID.

| Option | You get | It costs |
|---|---|---|
| **A. Union of registries by UUID, no merge** | Nothing generated; content addressing makes resolution order safe; the only single-URL recipe for private plus General | Two members listing one UUID at different generations show only the first's; operators learn that a hosted repository alone cannot serve packages depending on General |
| **B. Merge member registries into one generated registry** | One registry in the client depot | A registry authored under a new UUID containing General's packages, regenerated on every General change, and every `Manifest.toml` recording that UUID |
| **C. No virtual repositories** | Nothing to specify | Private packages that depend on General cannot be resolved by any client, since `JULIA_PKG_SERVER` is one URL |

**Why this is yours:** it makes a composition feature the required way to use a hosted Julia
repository, a product and documentation commitment.

Accepted cost: the recipe in the operator documentation and the name-collision refusal.

Rechecked on Fable 2026-10-08: confirmed, fold amended. Resolution is by the whole
`(uuid, hash)`, so two members holding one UUID (a hosted fork beside General) serve whichever
holds the requested tree, and a refusal never falls through; the per-request listing goes
through `ServeRendered`'s lazy form so no handler sets a validator (`signing-service.md` AC11,
AC32; AC22).

### Resolved: how hosted artifacts are stored and owned (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: an artifact is a `File`
of every version whose publish carried or referenced it, served while any version in the served
snapshot holds it (Design, "Artifacts belong to the versions that carry them"; AC11).

The question: artifacts are addressed by tree hash alone, with no package in the URL, and many
versions of many packages share one artifact; the shared model hangs files off versions.

**Recommendation:** A. It needs no new entity and no new mark root: ownership and deletion
follow the versions, deduplication is the CAS digest's, and an unreferenced artifact cannot
exist.

| Option | You get | It costs |
|---|---|---|
| **A. Files of the versions that carry them** | Ordinary GC and retention; no orphans; deletion semantics fall out | An artifact cannot be uploaded before a version that needs it; a publish re-references artifacts it shares |
| **B. A reserved package per repository holding artifacts as versions** | Artifacts publishable on their own | A synthetic package name in the model and in pattern scopes, and orphan artifacts that retention must learn to find |
| **C. Hosted repositories serve no artifacts; clients use their `download` URLs** | Nothing to store | A private JLL package's binaries leave the registry's control, and a network-restricted client cannot install them |

**Why this is yours:** it decides whether artifacts are first-class publishable objects or
belong to packages, which shapes the management API.

Accepted cost: the publish operation carries artifacts, now `management-api.md`'s rule ("`julia.md`'s
artifacts-with-the-version rule", one publish carrying several files).

Rechecked on Fable 2026-10-08: confirmed. The fold now names `JuliaArtifacts.toml`, which
`Artifacts.jl` reads before `Artifacts.toml` (its `artifact_names`, checked in the 1.13.0
image), and states that an artifact route is evaluated by digest alone, no coordinate rule
reaching it.

### Resolved: which action yank requires (was Q6)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: yank and unyank require
`delete`; deprecation requires `push`; deletions require `delete` (Design, "The hosted publish
path"; AC8).

The question: `auth.md` records the Cargo (`push`) and PyPI (`delete`) yank divergence for
`management-api.md` to reconcile, and Julia's yank excludes a version from new resolutions while
a pinned manifest still installs it (captured).

**Recommendation:** A. Julia's yank has no client, as PyPI's has none, and removes the version
from resolution as PyPI's does; the registry-owned precedent is `delete`. Deprecation removes
nothing (1.10 does not even show it), so it is a metadata change under `push`.

| Option | You get | It costs |
|---|---|---|
| **A. Yank under `delete`, deprecation under `push`** | Consistent with the registry-owned yank precedent; a publish-only CI key cannot pull versions out of resolution | A publisher needs a `delete` grant to yank its own bad release |
| **B. Yank under `push`, as Cargo's client-native yank** | A publisher yanks its own release | A second registry-owned yank rule diverging from PyPI's, one more row for `management-api.md` to reconcile against itself |

**Why this is yours:** it places an ecosystem operation on a vocabulary you settled, and it is
an input to the reconciliation `management-api.md` owes.

Accepted cost: one row in that reconciliation, now made: `management-api.md` places Julia yank and
unyank on its `withdraw` and `restore` kinds under `delete` and deprecation on `annotate` under
`push` (its resolved withdraw-action decision, was Q1 there, which settled the Cargo and PyPI
divergence this record cited in the same direction).

Rechecked on Fable 2026-10-08: confirmed. `management-api.md`'s Julia rows carry `withdraw` and
`restore` under `delete` and `annotate` under `push`, verified at HEAD; the `[yanked]` and
`[deprecated]` markers the record relies on are 1.13's `Operations.status` output and the
`[metadata.deprecated]` table its `registry_instance.jl` reads, found in the image's source,
and 1.10 has neither.

### Resolved: a proxied package coordinate the registry index does not know (was Q7)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: answer `404` with no
upstream request; the index covers every cached generation and only grows (Design, "The
proxied path"; AC24).

The question: a `/package/{uuid}/{hash}` not in any cached registry generation cannot be named
as a version, so policy cannot evaluate it; the upstream might still hold it.

**Recommendation:** A. Clients request package hashes from registries this registry served, so
an unknown one is a manifest from a newer upstream generation (fixed at the next listing
refresh) or a probe; fetching it would serve content no policy evaluated.

| Option | You get | It costs |
|---|---|---|
| **A. `404` without an upstream request** | Policy evaluates every served package; no fetch for probes | A `Manifest.toml` from a machine with a newer General fails until the listing TTL passes and the client updates |
| **B. Refresh the listing and registry synchronously, then decide** | The newer-manifest case works at once | An 11 MB fetch and parse inside a client request, triggerable by any caller with a random hash |
| **C. Fetch from the upstream unconditionally** | Transparent | Content served with no version for policy to evaluate, a policy bypass through the cache |

**Why this is yours:** it trades a transient failure for policy completeness on the proxied
path.

Accepted cost: the transient failure, stated in the operator documentation.

Rechecked on Fable 2026-10-08: confirmed. The accepted cost is tighter than the record said: the
index is rewritten in the commit that caches a generation, so the only window is the listing TTL
and no client holding a generation is answered `404` for a version it names (AC24).

### Resolved: `pkg.julialang.org` as a preconfigured upstream (was Q8)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: user-configured in v1,
revisited through `proxy-cache.md`'s own extension mechanism (its resolved preconfigured-set
extension, was Q14) on the catalogue's verdict for Tier 3 (Design, "The proxied path").

**Recommendation:** B, for sequencing rather than effort: Julia is Tier 3 and built only if the
breadth gate says so, so amending a sibling's settled set on its account now would be a
half-applied change against a format that may not be built.

| Option | You get | It costs |
|---|---|---|
| **A. Preconfigure `pkg.julialang.org` now** | A thirty-second Julia cache | A sibling decision reopened from a Tier 3 spec before the gate that decides whether Tier 3 happens |
| **B. User-configured in v1, revisited on the verdict** | No sibling amendment | A worse first-run story and no nightly run against the real service until the revisit |

**Why this is yours:** it amends a set you priced for three upstreams, a product and sequencing
call.

Accepted cost: proxied cases run against a stand-in only until the revisit; the real service is
exercised by the recording session.

Rechecked on Fable 2026-10-08: confirmed. `proxy-cache.md`'s extension mechanism (was Q14,
extended by was Q17) stands for the revisit, and nothing in this spec depends on the
preconfigured entry.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | 5cf8b0c | authoring pass: grounded first draft, not a review | Grounded the Pkg server protocol four ways: captured traffic from Julia 1.10.12 (Pkg 1.10.0) and 1.13.0 (Pkg 1.13.0), the official images pinned by digest, against a logging stub serving a registry, packages and an artifact tree-hashed with the images' own GitTools and Tar plus the real General tarball and `Example` (fresh and warm installs, offline, registry update, yanked resolve and manifest-pinned install, deprecation on both, tree-hash mismatch on registry and package, 404 and 403 with the fallback chain to GitHub, to the registry `repo` and to `Artifacts.toml` URLs, the same refusal on a Podman internal network failing closed, the `/registries` failure cloning General, Bearer auth from `auth.toml` right, wrong and absent, the format-first path prefix, zstd negotiation both ways, no-argument and by-name `Registry.add`, the missing-dependency resolver failure, and Downloads' 20-second low-speed abort found through a buffering stub); the protocol reference and registry documentation shipped in the image, the Pkg, Tar, Downloads and NetworkOptions sources; PkgServer.jl at 88c6d80 (flavor redirect, storage client, verification commented out); the live pkg.julialang.org and storage.julialang.net (redirect chain, no caching headers on the listing, zstd variant, 404 shape); and OSV's Julia ecosystem (1,717 JLSEC records keyed by name and UUID, no MAL entries). Design: the tree hash as a verified coordinate with three client semantics, collision-detecting SHA-1 and a canonical hosted re-pack; compression negotiation as two blobs per tree; a hosted repository as one generated registry fed by management-API publishes with artifacts owned by versions; the index service's requirement list; the Bearer `auth.toml` form keyed per host; addressed objects with registry routes as none; the `403` rendering and the client's origin fallback; the proxied path with flavor, listing TTL, the growing registry index and Julia's removal rows; virtual repositories as a union of registries by UUID, required for any private package depending on General. Eight questions written in decision shape and adopted under the standing delegation: hosted as a generated registry (AC2, AC3, AC7, AC23, AC27), tree hash as coordinate (AC9, AC10, AC17), refusals enforceable only under egress restriction (AC14), virtual as a union (AC22, AC26), artifacts as files of versions (AC11), yank under `delete` (AC8), unknown proxied coordinates answered 404 (AC24), pkg.julialang.org user-configured. Twenty-seven criteria, each with a Test Plan row. Stays draft; awaits an independent review. |
| 2026-09-28 | 20ff418 | cross-spec reconciliation of the Wave 1 folds and the foundation wave, on Opus. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` naming this file verified against the current text of its source spec before applying: conformance-harness reconciliation items 1 and 4 (client confinement inherited from was-Q6 and AC23, redirect stand-ins as `hosts` sub-entries; seed-path regeneration through the write-path hook, AC24 and `signing-service.md` AC21; the Test Plan obligation discharged); proxy-cache reconciliation item 3 (the 20-second abort resolved by was-Q16, `FirstByteWithin` on every tarball fetch, AC19 sharing `conformance/julia/proxied_slow_test.go` with its AC21; the Design paragraph rewritten from a request into its answer); format-management item 11 and management-api items 11 and 12 (retirement core-held; kinds `publish`, `withdraw`, `restore`, `annotate`, `delete-version`, `delete-package`, no bindings; the declared-coordinate rule; `repository-type` and `retired`; AC3 to AC8; the yank-action record discharged); signing-service item 11 (generator contract and package, unsigned consumer with no key, previous generation carried by the generator, per-document lock, determinism; the six items mapped; AC23, AC27); upstream-adapters item 12 (`https` adapter, allowlisted regional and storage hosts with role `none`, credential to the root host, no client header forwarded, the zstd opt-in; AC20); supply-chain reconciliation item 10 (the `restricted-egress` row, the UUID coverage row, `WriteRefusal`; AC14); artifact-verification (the tree-hash integrity entry AC18, reached through `Verifier`, as the completion-only verifier; AC9, AC17; the verification-column obligation); data-model (the coordinate rule cites this spec; AC44 cache record); auth was-Q23 (no descriptor: listing and registry enumerate); repository-lifecycle AC12 and FHI AC13 (Capabilities and lifecycle section, the registry name fixed at creation, new AC28); async-operations (no merge job: the virtual is an unmerged union, which `signing-service.md` names). No question adopted, `fable_recheck` kept. Found and reported rather than assumed: `auth.md` still has no Pkg client row, which consequences Open item 16 asked for. Twenty-eight criteria, each with a Test Plan row. `node scripts/check-spec.js` reports no failure in this file. Stays draft; awaits an independent review. |
| 2026-10-08 | 792cd2e | Fable recheck: full review (claim verification at HEAD against every cited sibling; the protocol claims re-read in the pinned `julia:1.13.0` image's Pkg, Tar, Artifacts and Downloads sources; adversarial lens at full strength on the Opus-authored whole; constitution compliance) + re-examination of the Opus adoptions Q1 to Q8 + the queued consequences | A review. The tree holds no `internal/format/julia`, so claim verification ran against the sibling specs at HEAD and the pinned image. Every sibling citation verified: `auth.md`'s `julia` (Pkg) row, AC12, AC17, AC27, AC29, AC31 and was-Q23; `signing-service.md`'s consumer table (six items), AC1, AC2, AC5, AC11, AC21, AC24, AC25, AC28, AC32 and was-Q24; `proxy-cache.md` AC9, AC13 (Julia `yanked` an ordinary metadata change), AC20, AC21 as amended, AC24, AC25, AC27, AC29, AC32, was-Q16 and was-Q19 to Q24; `management-api.md`'s four Julia rows, AC5, AC7, AC12, AC14, AC15, AC24, AC29, AC36 and was-Q13 to Q20; `supply-chain-policy.md`'s coverage and binding rows, AC5, AC17, AC18, AC20, AC24; `artifact-verification.md` AC18, AC24, AC26 and its entry table; `upstream-adapters.md`'s requirements row, AC4 to AC8, AC13, AC23; `data-model.md` AC33, AC35, AC44, AC46; `conformance-harness.md` AC13, AC23, AC24, AC26, AC28; `format-handler-interface.md` AC7, AC8, AC12 to AC15 and "What `Scope(r)` may read"; `repository-lifecycle.md` AC12; `storage-and-gc.md` AC3, AC16; `catalogue.md` AC5 and the charter's AC9. In the image: the `[metadata.deprecated]` table (`registry_instance.jl`), the `[yanked]` and `[deprecated]` markers (`Operations.status`), `get_server_dir`, `is_pkg_in_pkgserver_registry`, the listing regex, `CURLOPT_LOW_SPEED_TIME` 20 with limit 1, `verify_archive_tree_hash` as `Tar.tree_hash` under `skip_empty = false`, `artifact_names` reading `JuliaArtifacts.toml` first, a listed package tolerated without `Versions.toml`, and `v"1.18.0+1" > v"1.18.0+0"`. Consequences applied: the supply-chain recheck's item 1 (was-Q11: the UUID a package-level advisory key reported at write time, matched at a feed sync; AC26's row shares `advisory_key_test.go`); the auth closing sweep's stale-wording item (the Pkg row exists); the management-api closing sweep's optional item 5 (claims checked again at commit, was-Q14) with was-Q15 (the unchanged publish, AC4) and was-Q20 (the spool bound); proxy-cache was-Q19 (count zero), was-Q21 (index and listing never evicted, `cache_metadata_bytes`), was-Q23 (anchor class `none`) and was-Q24 (HEAD on proxied routes, AC10); signing-service was-Q14 (`ServeFile` for every stored file, `ServeRendered` for the virtual listing) and was-Q24 (HEAD on the doors); the blocking preconditions updated to the siblings' planned dates. Found by the adversarial lens and fixed: AC20 refused an upstream at configuration, contradicting `upstream-adapters.md` AC23 (the probe moved to the first request, `502` naming the flavor path); no entry rules and no decompression bound on the hosted ingest or the proxied verifier, the one place the format materialises a whole archive (AC9); a proxied representation keyed by the request's `Accept-Encoding` rather than the body's magic bytes, wrong for a PkgServer.jl without zstd (AC10); a package with every version deleted still named in `Registry.toml` (AC27); `JuliaArtifacts.toml` unhandled (AC11); virtual resolution underspecified when two members hold one UUID and a refusal could fall through to a later member (AC14, AC22); the window between a generation's fetch and its index build in which a client holding the generation could be answered `404` (AC24); build metadata as part of a claim's identity (AC4); several versions sharing one tree, for scopes and policy; artifacts evaluated by digest alone; the refuse-until-scanned cost on Pkg's deadline; `Scope(r)` reading the metadata store alone. Verdicts: Q1, Q5, Q6, Q7, Q8 confirmed; Q2, Q3, Q4 confirmed with their folds amended; none superseded. Reported, not applied: two rows owed to `conformance-harness.md`'s exception list (the hosted read half against PkgServer.jl `88c6d80` in front of a storage stand-in; a write row reading none). Twenty-eight criteria, each with a Test Plan row; no open question; `fable_recheck` cleared; `node scripts/check-spec.js` reports no failure in this file. draft -> planned. |
