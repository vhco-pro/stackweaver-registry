---
status: draft
status_description: "Authored 2026-09-26 as a grounded first draft: the CRAN repository contract captured from R 4.5.1 and R 4.3.3 (base install.packages, available.packages and download.packages), pak 0.11.1 with its vendored pkgcache 2.2.5.9000, and renv 1.1.5, run in rocker/r-ver containers pinned by digest against a logging stub serving trees written by R's own tools::write_PACKAGES, checked against the R Installation and Administration manual, the utils and tools sources shipped in the pinned images, the pkgcache, pkgdepends and renv sources, OSV's ecosystem list and API, and the live cloud.r-project.org and p3m.dev. Nine questions written in decision shape and adopted under the owner's standing delegation; none open. Awaits a /spec review pass."
description: "Spec for the CRAN (R) repository format: the per-tree PACKAGES index in its plain, gzip and rds representations, the source tree with its Archive/ directory of superseded versions, binary trees keyed by operating system, build and R minor version, publishing and deletion through the registry-owned management API because the ecosystem has no publish protocol, hosted and proxied, with base R, pak and renv as the conformance oracles."
author: michielvha
goal: "Serve R teams a private CRAN-like repository whose index is regenerated in every representation by the shared index service on every publish, whose superseded versions move into Archive/ exactly as CRAN's do so that pak and renv find them, and a CRAN cache whose superseded coordinates never 404 under a client's hour-old index."
priority: "medium"
issue: 26
created: 2026-09-26
covers:
  - "internal/format/cran/**"
  - "conformance/cran/**"
---

# Plan: CRAN repository format

The CRAN-style repository layout, hosted and proxied: a static directory convention in which
every terminal directory (a "tree") carries one generated index in three representations that
must agree, the source tree lists exactly one version per package and moves the rest into an
`Archive/` directory that only the newer clients know how to read, binary trees are keyed by
operating system, build and the R minor version of the client, no publish protocol exists, and
base R, pak and renv are the oracles on both paths.

## Context

CRAN sits in Tier 2 of `formats/catalogue.md` as a single-ecosystem family ("CRAN"). **Its
build is gated by `project-charter.md` AC9 and `catalogue.md` AC5**: no handler code for a Tier 2
ecosystem exists before every Tier 1 format has met its definition of done and the owner has
recorded a `continue` verdict at the charter's build step 8. This spec exists now because the
owner directed on 2026-09-26 that all 33 ecosystems be specced up front (the catalogue's "Every
ecosystem below is specced now; only building is gated"), so that the gate decides what is built
and never what is written; a `shrink` verdict parks it.

It is the **generated-index class without a signature**, like Conda and Maven: every tree is
described by one index the server produces, which the clients read in three representations (a
DCF text file, its gzip form, and an R-serialised matrix), so a hosted repository cannot exist
without the shared signing and index service the charter builds at step 7 before Helm. Three
things set it apart from those siblings. **The index lists one version per package and the rest
live elsewhere**: `tools::write_PACKAGES` defaults to `latestOnly = TRUE`, CRAN moves every
superseded tarball into `src/contrib/Archive/{package}/`, base R can install only what the index
lists, and pak and renv fetch older versions from `Archive/` by a path convention that no index
advertises. **Binary trees are keyed by the client's R minor version**, so one repository holds
one source tree and any number of binary trees (`bin/windows/contrib/4.5/`,
`bin/macosx/big-sur-arm64/contrib/4.5/`, and Posit's Linux shape that pak reads), each with its
own index, each addressed by a path the client computes from its own version and platform. And
**there is no publish API at all**: every CRAN-like repository is written by a tool on the
server's filesystem (`write_PACKAGES`, drat, miniCRAN) and read over plain HTTP, so publishing
and every management operation are the registry-owned management API's, and the real clients
oracle only the effects.

Grounding for this draft, stated up front because the constitution asks for evidence or silence:

- **Captured client traffic.** No R is installed on this host (`which R Rscript` find nothing),
  so two pinned R images were run in containers on the host network against a logging stub that
  serves a directory tree and records every request: `docker.io/rocker/r-ver:4.5.1` at digest
  `sha256:03b023fbf7b1b24ac1bb8b2ac5fd7e15a767e67b40ff50c155e328110981c2aa` (R 4.5.1, libcurl
  8.5.0) and `rocker/r-ver:4.3.3` at
  `sha256:732d15020af326da9e919c07f70ca32bf5d3e409220af32e0a4b6d0a89437309` (R 4.3.3, libcurl
  7.81.0). Base R's `available.packages`, `install.packages`, `download.packages`,
  `old.packages` and `update.packages` were driven on both; `pak` 0.11.1 (with its vendored
  `pkgcache` 2.2.5.9000 and `pkgdepends`) and `renv` 1.1.5 were installed into the 4.5.1 image
  from r-lib's pak repository and Posit Package Manager and driven there. The fixture tree was
  genuine in the way that matters: four packages built by `R CMD build`, indexed by the real
  `tools::write_PACKAGES` of R 4.5.1 into a source tree with an `Archive/zzdemo/` holding a
  superseded version, a second source tree written with `latestOnly = FALSE`, a Windows binary
  tree built as a zip of the installed package and indexed with `type = "win.binary"`, and a
  `Meta/` directory in the shape CRAN's carries. Every consumer capture started from a fresh
  session, library and (for pak and renv) package cache unless the row says otherwise, and
  every row of the wire table was observed on both R generations unless the row says otherwise.
  The stub is not a reference implementation; what the captures prove is what the clients send
  and how they react.
- **The published contract.** The R Installation and Administration manual, section 6.6
  "Setting up a package repository" (read 2026-09-26 from cran.r-project.org), which fixes the
  tree layout (`src/contrib`; `bin/os/build/contrib/x.y`), the file extensions (`.tar.gz`,
  `.zip`, `.tgz`), the `PACKAGES` file as "a concatenation of the `DESCRIPTION` files of the
  packages separated by blank lines", `PACKAGES.rds` and `PACKAGES.gz` as "downloaded in
  preference to `PACKAGES`", and the `Path` field for subdirectories; the `write_PACKAGES`
  reference (arguments, the `latestOnly` default, the standard field set, `rds_compress`); and,
  because the manual leaves the read side to the code, the `utils` sources shipped in both
  pinned images: `available.packages` (the `PACKAGES.rds`, `PACKAGES.gz`, `PACKAGES` order, the
  per-session `tempdir()` cache under `R_AVAILABLE_PACKAGES_CACHE_CONTROL_MAX_AGE`, the default
  filters `R_version`, `OS_type`, `subarch` and `duplicates`), `contrib.url` (how the tree path
  is built from the type and `R.version`), `install.packages` and `download.packages` (the
  filename grammar and the `File` and `Repository` columns). The pkgcache and pkgdepends
  sources vendored in pak (`packages_make_sources`, `type_cran_resolve_version`,
  `cmc__get_cache_files`, `ppm_binary_url`, `cac__update_replica`) and the renv sources
  (`renv_retrieve_repos_archive_formatter`, `renv_retrieve_repos_impl`,
  `renv_available_packages_latest_archive`, `renv_ppm_transform_impl`) for the behaviour no
  document states. The OSV schema's ecosystem table and its query API for advisory coverage.
  The drat `insertPackage` reference and the miniCRAN introduction as prior art for how the
  ecosystem's own generators handle superseded versions.
- **The live upstreams.** `cloud.r-project.org` sampled directly: `src/contrib/PACKAGES`
  (7,278,834 bytes), `PACKAGES.gz` (1,928,372, `application/x-gzip`) and `PACKAGES.rds`
  (1,296,580), every one served with `Cache-Control: max-age=1800`, an `ETag`, `Last-Modified`
  and `Accept-Ranges: bytes`, a `304` to `If-None-Match`; records carrying `MD5sum`,
  `NeedsCompilation` and a `Published` timestamp; `src/contrib/Archive/` and
  `Archive/jsonlite/` as Apache HTML listings; `Archive/jsonlite/jsonlite_1.8.8.tar.gz` served
  `application/x-gzip` with its own `ETag`; `Meta/current.rds` (670,609 bytes, a data frame of
  `file.info` rows keyed by current tarball name) and `Meta/archive.rds` (5,363,611 bytes, a
  named list of 27,991 packages, each a data frame of `file.info` rows keyed
  `{package}/{package}_{version}.tar.gz`); a `404` with a `text/html` body for a missing
  tarball; `bin/windows/contrib/` holding trees `4.0` through `4.7`, its `4.5/PACKAGES` records
  carrying no `MD5sum`; `bin/macosx/` holding `big-sur-arm64/`, `big-sur-x86_64/`,
  `sonoma-arm64/` and a legacy `contrib/` with trees `4.0` to `4.2`, the
  `big-sur-arm64/contrib/4.5/PACKAGES` records carrying both `MD5sum` and `SHA256sum`, and
  `bin/macosx/contrib/4.5/PACKAGES` answering `404`. `p3m.dev` sampled for Posit Package
  Manager's Linux-binary scheme: one tarball URL under `__linux__/noble/latest/src/contrib/`
  answering `307` to three different objects by `User-Agent` (`x-package-type: binary` with
  `x-package-binary-tag: 4.5-noble` for an R 4.5.1 agent, `4.3-noble` for R 4.3.3, source for
  `curl`), the index bytes identical for all three, and a Linux-binary index at
  `cran/latest/bin/linux/4.5-noble/contrib/4.5/PACKAGES.gz`. `api.osv.dev` queried for the
  `CRAN` ecosystem: `readxl` answers three `RSEC-2023-*` advisories with the PURL
  `pkg:cran/readxl`, `jsonlite` one, `commonmark` three.

Where the documentation and the captures disagree, or the documentation is silent, the captures
win and the gap is recorded here because it would otherwise be built from the documents: the
manual says `PACKAGES.rds` and `PACKAGES.gz` are "downloaded in preference to `PACKAGES`" and
the capture fixes the order, the fallback trigger and the one client that never reads the `.rds`
(pak reads `PACKAGES.gz` first and falls back to `PACKAGES`); `write_PACKAGES` writes
`MD5sum` for a source tree and not for a Windows binary tree, and no pinned client verifies it
on either; the manual describes `Archive/` nowhere, yet two of the three clients build URLs into
it; and pak, for any repository named `CRAN`, fetches extended metadata from a third-party
service (`cran.r-pkg.org`) and, for a repository under any other name, adds the real CRAN mirror
to its resolution set by itself.

Five things make this format worth a careful spec rather than a port of Conda's. **The index is
one document in three representations that must agree**, one of them an R serialisation format
this registry must write and that a real `readRDS` must accept. **Supersession is a move**: a
publish of a newer version removes the previous version from the tree's index and, on CRAN,
from the tree's directory, into `Archive/{package}/`, so a coordinate's URL changes over its
life while its bytes do not, and a client holding an hour-old index requests a path that no
longer exists. **Binary trees multiply**: every R minor version and every macOS build is its own
tree with its own index, the client computes the path from `R.version` and `.Platform$pkgType`,
and a tree that is absent costs a warning on every install from a Windows or macOS client.
**There is no publish API**, so the hosted write surface is the management API's and the real
clients oracle effects only. And **the clients resolve from the index client-side**: dependency
resolution, the `R_version` filter that hides a package whose `Depends` names a newer R, and the
`duplicates` filter that keeps the highest version all run in the client over the whole index,
so a hosted index is fetched whole on every cold run and the proxied index is a 7 MB mutable
document with a 30-minute upstream TTL.

## Blocking preconditions

**The handler interface re-open must complete before this handler starts**, as for every Tier 1
and Tier 2 handler (`format-handler-interface.md` AC8). CRAN is Tier 2, so the catalogue's
Tier 1 gate (its AC5) and the charter's breadth verdict (its AC9, build step 8) both precede it;
the re-open is recorded here anyway, from this side, because a gate enforced on one side only is
enforced nowhere.

**The shared signing and index service must be `planned` before Phase 1.** Every index document
a hosted tree serves is a write-triggered generated document produced by
`docs/internal/plans/foundation/signing-service.md` (to be authored in the spec loop), which the
charter builds at step 7 as the production form of what the step 4a prototype learned
(`write-triggered-services-prototype.md`). What this format requires of that service is stated
in Design ("What the signing and index service must provide"), never designed here; nothing is
asked of its signing half, because nothing on this wire is signed (Scope). A CRAN handler
without it can serve no tree at all, so Phase 1 waits on that spec.

**The management API must be `planned` before Phase 2, and it is the only hosted write path.**
Publishing a file into a tree, deleting a version and deleting a package are operations of
`docs/internal/plans/foundation/management-api.md` (to be authored in the spec loop); nothing on
the CRAN wire writes (Design, "The publish path"). Phase 1's hosted reads are testable without
it, because the harness's `state` vocabulary seeds versions through the shared write path
(`conformance-harness.md`, "The `setup` vocabulary"); AC3, AC4 and AC18 are untestable until
that surface exists.

**One shared-layer amendment this spec depends on is requested, not assumed.** A proxied file
from a tree whose index carries no digest (CRAN's Windows tree, and any `write_PACKAGES` binary
tree) has nothing to verify against and needs the completion-only fetch-and-cache mode
`go-modules.md`, `nuget.md`, `maven.md` and `composer.md` already requested of `proxy-cache.md`;
this spec does not edit that sibling.

## Scope

**In scope:**

- The tree layout under the format-first mount `/cran/{repository}/`: the source tree
  `src/contrib/` with its `Archive/{package}/` directory and `Meta/` documents, and binary
  trees at `bin/windows/contrib/{x.y}/`, `bin/macosx/contrib/{x.y}/`,
  `bin/macosx/{build}/contrib/{x.y}/` and `bin/linux/{x.y}-{distro}/contrib/{x.y}/`, each a
  terminal directory with its own index; package files at `{package}_{version}.tar.gz`,
  `.zip` and `.tgz` by tree.
- The index of every tree in the three representations the pinned clients read (`PACKAGES`,
  `PACKAGES.gz`, `PACKAGES.rds`) and the source tree's `Meta/current.rds` and
  `Meta/archive.rds`, every one a generated, unsigned, write-triggered document of the shared
  index service, regenerated inside the write, stored, CAS-backed above the inline threshold,
  and the requirements this places on `signing-service.md`, including an R serialisation
  writer.
- Supersession as CRAN performs it: one listed version per package per tree, the superseded
  file's coordinate moving into `Archive/{package}/` in the same write, `Meta/` regenerated
  with it, and every coordinate resolvable at both its current and its archive path on both
  paths (the resolved supersession and archive-resolution decisions below).
- The hosted write path through the registry-owned management API: publish a file into a tree,
  delete a version, delete a package; ingest validation against the archive's own
  `DESCRIPTION`; server-computed digests; immutability and the retirement set; the
  write-boundary declaration `data-model.md` requires.
- Name, version and filename rules exactly as R enforces them, the canonical version form under
  which `1.0-1` and `1.0.1` are one version, and the tree-path grammar.
- Non-interactive authentication in the one form all three clients share, HTTP Basic from URL
  userinfo, preemptive on base R and renv and after a `401` on pak; the per-route addressed
  objects `auth.md`'s pattern scopes evaluate (AC9); and the `403` rendering of a shared policy
  refusal (AC10).
- Integrity: the `MD5sum` and `SHA256sum` every generated index carries, computed by the
  registry, verified by the proxied path before commit, and the finding that no pinned client
  verifies either.
- The proxied path against a CRAN mirror, a Bioconductor repository (the same wire under
  `packages/{release}/bioc/`, which pak reads identically), or a private `write_PACKAGES` tree:
  classification per document, the index generated from the upstream's `PACKAGES.gz`,
  conditional revalidation, negative caching, the archive-path resolution, the refusal of
  Posit Package Manager's `User-Agent`-negotiated binary URLs at configuration, and CRAN's rows
  of the upstream-removal table.
- Virtual repositories, with the per-tree merge rules (the resolved virtual-repository decision
  below), because nothing on this wire is signed under a repository name.
- Two pinned R generations as the primary oracles and pak and renv as proven clients, on both
  paths; the binary trees exercised through `available.packages(type = ...)` and
  `download.packages(type = ...)` on Linux, since no Windows or macOS R runs in a container on
  this harness.

**Out of scope for v1**, each with its reason, recorded because the interface spec's definition
of done requires the deliberately unimplemented surface to be named:

- **A wire publish protocol.** None exists to implement: every CRAN-like repository is written
  by a tool on its own filesystem (`write_PACKAGES`, drat's `insertPackage`, miniCRAN's
  `addPackage`) and no R client uploads anything. Publishing is the management API's (Design,
  "The publish path").
- **Subdirectory repositories (the `Path` field).** The manual and `write_PACKAGES` support
  packages in subdirectories through a `Path` line in each record. No pinned client was
  exercised against one, CRAN and every generator sampled emit a flat tree, and a hosted layout
  this registry chooses gains nothing from the field. Revisited by revising this spec when a
  consumer needs it; on the proxied path a `Path` field passes through inside the record.
- **Posit Package Manager's `__linux__` URL scheme as an upstream or as a hosted URL form.**
  P3M serves different bytes at one URL by `User-Agent` (captured: three objects for one path),
  which a cache keyed by URL cannot represent; its Linux-binary tree is served here at the plain
  `bin/linux/{x.y}-{distro}/contrib/{x.y}/` path pak constructs, and a `__linux__` upstream is
  refused at configuration naming the plain source path (the resolved P3M decision below).
- **HTML directory listings.** CRAN's `Archive/` and `Archive/{package}/` answer Apache
  listings; no pinned client parsed one (renv and pak build the archive URL from the version
  they want, captured), and a browsing surface is UI-era work. Directory URLs answer `404`.
- **The `mac.cran.dev` alternative source.** pkgcache records `https://mac.cran.dev/{target}`
  as a second download source for macOS binaries from a CRAN-type repository
  (`packages_make_sources`), a client-side egress past any registry that this spec cannot
  intercept and does not emulate; it is documented, and not exercised on this Linux host.
- **`Meta/` documents beyond `current.rds` and `archive.rds`.** Those two are the ones the
  pinned clients' sources read (renv's latest-archived-version lookup, pkgcache's archive
  replica); CRAN carries others whose consumers were not found in any pinned client.
- **`remotes::install_version` and other third-party installers.** Not run in this pass;
  nothing here is grounded for them, and a claim without a capture is what this spec refuses
  to make. The corpus and the client-drift job are where they join.

## Design

### The wire surface, as captured

Every path below hangs off the repository's base URL, `/cran/{repository}/`, format-first per
`format-handler-interface.md`'s resolved URL-shape decision. Every pinned client takes an
arbitrary repository URL (`repos = "http://host/path"`, `options(repos = c(CRAN = ...))`,
renv's `repos` argument, pak's `options(repos)`), appends the tree path itself
(`contrib.url` strips one trailing slash and adds `src/contrib` or the binary path), and nothing
needs root anchoring.

| Surface | Shape, as the pinned clients send it |
|---|---|
| Index, base R | `GET {tree}/PACKAGES.rds`; on any failure (`404`, `401`, a refused connection) `GET {tree}/PACKAGES.gz`; then `GET {tree}/PACKAGES`. Every index request carries `Pragma: no-cache` (from `download.file(cacheOK = FALSE)`), `Accept: */*`, no `Accept-Encoding`, no conditional header, never `HEAD` or `Range`. `User-Agent: R/4.5.1 R (4.5.1 x86_64-pc-linux-gnu x86_64 linux-gnu)` (the version segment differs per generation and nothing else does). The parsed index is cached per repository in `tempdir()` for `R_AVAILABLE_PACKAGES_CACHE_CONTROL_MAX_AGE` seconds (3600 by default), so a second `available.packages`, `install.packages`, `old.packages` or `update.packages` in the same session makes **no** index request, and `ignore_repo_cache = TRUE` refetches; a fresh session refetches everything |
| Index, renv 1.1.5 | Through base R's `available.packages`, so the same three-step order and the same session cache, under `User-Agent: renv (1.1.5); R/4.5.1 R (4.5.1 ...)` |
| Index, pak 0.11.1 | `GET {tree}/PACKAGES.gz` with `Accept-Encoding: deflate, gzip`, falling back to `GET {tree}/PACKAGES` on any failure; **never** `PACKAGES.rds`. `User-Agent: R (4.5.1 x86_64-pc-linux-gnu x86_64 linux-gnu)` (no `R/` prefix). `pak::repo_status()` sends `HEAD` for all three files. pkgcache keeps an `ETag` per index file and a warm run makes no request (captured); the conditional revalidation itself was not captured in this pass. For every repository named `CRAN` (or `ppm`, `rspm`, `p3m`) pak also fetches `https://cran.r-pkg.org/metadata/src/contrib/METADATA2.gz`, a third-party extended-metadata document, and Bioconductor's five `PACKAGES.gz`; for a repository under any other name pak adds `https://cran.r-project.org` to its own resolution set (captured: a repository named `myrepo` produced a `CRAN-*` raw file from the real mirror) |
| Package file, base R and renv | `GET {tree}/{package}_{version}.tar.gz` (or `.zip`, `.tgz`), one per package in dependency order, `Accept: */*`, no cache and no conditional header: a second `install.packages` in the same session refetches the target tarball and skips only the index and an already-installed dependency; a fresh session refetches everything. renv keeps a global installed-package cache (`RENV_PATHS_CACHE`) and a second install of a cached package makes no request at all (captured), so every renv case starts from a fresh cache directory |
| Package file, pak | `GET {tree}/{package}_{version}.tar.gz` **and** `GET {tree}/Archive/{package}/{package}_{version}.tar.gz`, both, for every source package of a CRAN-type repository (captured: `200` then `404` on the archive path for every current version; `packages_make_sources` records both URLs as the package's sources). A refusal on both prints "Failed to download {package} from `{url}` and `{archive url}`". pak's package cache serves a second install of the same coordinate, in any library, with no request (captured), so every pak case clears it |
| Archived version | renv: `renv::install("zzdemo@1.0.0")` fetches `GET src/contrib/Archive/zzdemo/zzdemo_1.0.0.tar.gz` and installs 1.0.0, after one `GET` of the repository base URL (renv's source chooses an archive layout from the `x-artifactory-id` and `Server` headers of the repository, and this registry sends neither, so renv uses CRAN's layout); a version the archive lacks answers `404` and renv prints "failed to find source for 'zzdemo 0.9.0' in package repositories". pak: `pkg_install("zzdemo@1.0.0")` fetches the same archive path (`type_cran_resolve_version` builds it from the CRAN mirror) and then, against this fixture, failed to solve with "dependency conflict", while the identical form against `cloud.r-project.org` (`jsonlite@1.8.8`) installed, and `url::{archive url}` against the fixture installed 1.0.0; the difference is recorded for the corpus rather than explained here. Base R has no archive lookup |
| Binary trees | `download.packages("zzdemo", type = "win.binary")` fetches `bin/windows/contrib/4.5/PACKAGES.rds` then `zzdemo_1.1.0.zip` on R 4.5.1, and `bin/windows/contrib/4.3/...` on R 4.3.3; `type = "mac.binary"` builds `bin/macosx/contrib/{x.y}`, `type = "mac.binary.big-sur-arm64"` builds `bin/macosx/big-sur-arm64/contrib/{x.y}` (from `contrib.url`: the segment after `mac.binary.` is inserted after `macosx`). An absent tree costs three `404`s and "Warning: unable to access index for repository {tree}: cannot open URL '{tree}/PACKAGES'" then "no package 'zzdemo' at the repositories". `install.packages(type = "both")` on Linux stops with "type == "both" can only be used on Windows or a CRAN build for macOS". pak against a `__linux__` repository URL requests `{base}/{repo}/{version}/bin/linux/{x.y}-{distro}/contrib/{x.y}/PACKAGES.gz` (captured against the stub; live p3m.dev answers that path) |
| Client-side filters | The default `available.packages` filters (`R_version`, `OS_type`, `subarch`, `duplicates`) run in the client over the whole index: a record whose `Depends` names `R (>= 9.0.0)` is hidden and `install.packages` prints "package 'zzfuture' is not available for this version of R / 'zzfuture' version 1.0.0 is in the repositories but depends on R (>= 9.0.0)"; an index written with `latestOnly = FALSE` listing two versions is reduced to the highest by `duplicates` (captured: 1.1.0 installed, both shown under `filters = list()`); pak prints "Needs R >= 9.0.0" for the same record. A missing package makes no tarball request: "package 'nonexistent' is not available for this version of R" (base R), "Can't find package called nonexistent" (pak), "package 'nonexistent' is not available" (renv) |
| Failure rendering | An index answering `404` on all three representations, or `401` on all three: base R prints "Warning: unable to access index for repository {tree}: cannot open URL '{tree}/PACKAGES'" and then the not-available message; renv prints "renv was unable to query available packages from the following repositories" with the three URLs; pak prints "source packages are missing from CRAN: Not Found (HTTP 404)" or "Unauthorized (HTTP 401)" then "Can't find package called {package}". A `403` on a tarball: base R "cannot open URL '{url}': HTTP status was '403 Forbidden'" and "download of package 'zzdemo' failed"; renv "error downloading '{url}' [cannot open URL '{url}']"; pak the two-URL message above. None of the three shows a response body. A corrupt tarball (one byte flipped mid-body) is downloaded and fails at extraction: base R and pak "Error in untar2(...): incomplete block on file", renv "error decompressing archive [error code 2]" from its own `tar`; **no pinned client compares the download with the index's `MD5sum`** |
| Authentication | URL userinfo, `http://user:tok@host/...`, is the one form all three clients share: base R and renv send `Authorization: Basic` preemptively on every index and tarball request; pak sends the first request without a credential, takes the `401`, and retries with Basic (captured). None reacts to a `WWW-Authenticate` challenge otherwise, and a wrong credential renders exactly as a missing index. R's libcurl also honours `~/.netrc`, which was not exercised |
| Transport | Every client used R's `libcurl` method (`getOption("download.file.method")` is `"libcurl"` in both images). `http://` repositories are accepted by every client with no opt-in |

Three facts about the clients' caches shape every second-request assertion. Base R caches the
parsed index per session and never a tarball, so a warm run inside a session costs the tarballs
and not the index, and a warm run in a new session costs everything: a case that proves this
registry served from cache asserts at the network layer against the upstream, never against
the client's request count. pak keeps both a metadata cache keyed by `ETag` and a package cache
keyed by coordinate, and installs a cached coordinate into any library without a request, so
every pak case clears both (`pak::meta_clean()`, `pak::cache_clean()`) in its setup. renv keeps
a global cache of built packages and copies from it without a request, so every renv case sets
a fresh `RENV_PATHS_CACHE`.

### Trees, files and the index

A repository is a set of **trees**, each a terminal directory carrying one index, addressed by
the path the client computes:

| Tree | Path under the repository | Files | Who computes it |
|---|---|---|---|
| Source | `src/contrib/` | `{package}_{version}.tar.gz` | `contrib.url(type = "source")`, every client |
| Windows binary | `bin/windows/contrib/{x.y}/` | `{package}_{version}.zip` | `contrib.url(type = "win.binary")` with `{x.y}` from `R.version` major and minor |
| macOS binary, legacy | `bin/macosx/contrib/{x.y}/` | `{package}_{version}.tgz` | `type = "mac.binary"`; CRAN holds trees 4.0 to 4.2 there |
| macOS binary, per build | `bin/macosx/{build}/contrib/{x.y}/` | `{package}_{version}.tgz` | `type = "mac.binary.{build}"`; CRAN holds `big-sur-arm64`, `big-sur-x86_64`, `sonoma-arm64` |
| Linux binary | `bin/linux/{x.y}-{distro}/contrib/{x.y}/` | `{package}_{version}.tar.gz` (an installed package archived, `Built:` in its `DESCRIPTION`) | pak's `ppm_binary_url` for a P3M-shaped repository URL; base R through an explicit `contriburl` |

The source tree additionally carries `Archive/{package}/{package}_{version}.tar.gz` for every
superseded version and `Meta/current.rds` and `Meta/archive.rds` describing the current files
and the archive; binary trees carry neither (CRAN keeps no archive of binaries, and neither
pinned client asks for one). `{x.y}` is two integers joined by a period, `{build}` and
`{distro}` are `[a-z0-9][a-z0-9-]*`, and a path that fits none of the rows answers `404` before
any lookup. **Every well-formed tree path answers an index**, empty when the repository holds
no file for it (the resolved binary-tree decision below), because a Windows or macOS client
installing from a source-only repository otherwise prints the absent-index warning on every
run; a request for a package file in a tree that holds none answers `404`.

### The index is one document in three representations

What a tree's index carries, as `write_PACKAGES` writes it and the clients read it, all produced
from one stored state (Design, "Every hosted index document is a write-triggered document"):

| Document | Content | Who reads it |
|---|---|---|
| `PACKAGES` | DCF text: one record per listed file, records separated by a blank line, fields wrapped at 80 columns with continuation lines indented, in package order. Standard fields (`tools:::.get_standard_repository_db_fields()`, which `available.packages` requires): `Package`, `Version`, `Priority`, `Depends`, `Imports`, `LinkingTo`, `Suggests`, `Enhances`, `License`, `License_is_FOSS`, `License_restricts_use`, `OS_type`, `Archs`, `MD5sum`, `NeedsCompilation`, with empty fields omitted from the text; plus `File` when a file's name is not `{package}_{version}.{ext}`, `Path` for subdirectories (out of scope), and any field the generator adds (CRAN adds `Published`; its macOS tree adds `SHA256sum`). This registry writes the standard fields plus `MD5sum` and `SHA256sum` for every tree, computed from the stored bytes (below) | The last fallback of every client |
| `PACKAGES.gz` | The same bytes, gzip | pak first; base R and renv second |
| `PACKAGES.rds` | The same records as an R character matrix serialised with `saveRDS`: one row per record, one column per standard field, `NA` where the text omits a field, `dimnames` carrying the package names as row names and the field names as column names, compressed with xz (`rds_compress = "xz"`, the `write_PACKAGES` default; `readRDS` accepts gzip, bzip2 and xz) | base R and renv first |
| `Meta/current.rds` (source tree) | A data frame of `file.info` rows, one per current file, keyed by filename | pkgcache's replica; no pinned client in this pass |
| `Meta/archive.rds` (source tree) | A named list, one element per package with an archive, each a data frame of `file.info` rows keyed `{package}/{package}_{version}.tar.gz` | renv's `renv_available_packages_latest_archive` (the newest archived version of a package the index does not list); pkgcache's `cac__update_replica` with an `ETag` file. Neither was requested in any capture of this pass |

Two consequences of the representation set are load-bearing. **They must be regenerated
together**: base R reads the `.rds`, pak reads the `.gz`, and a repository that regenerates them
at different moments serves two clients two different trees. And **the `.rds` is a wire format
this registry writes**: R's serialisation format (version 3, XDR big-endian, a `STRSXP` matrix
with a `dim` attribute and a `dimnames` list) is documented in R Internals and stable since R
3.5, and the only acceptable proof of a writer is a real `readRDS` in both pinned generations
returning a matrix `available.packages` then resolves from (AC2).

### Mapping onto the shared model

The levels are exactly those `data-model.md` provides; no table is added.

- `Package.name` holds the package name under R's grammar (Writing R Extensions: at least two
  characters, a letter first, letters, digits and periods only, not ending in a period),
  case-sensitive and matched byte for byte, so there is no folding and no display spelling.
  The package-level document holds the **retirement set** (every `{package}/{version}`
  coordinate this repository ever deleted, never republishable) and nothing else; `latest` is
  derived from the version rows by `numeric_version` order, never stored.
- `Version.version` holds the canonical version string (Design, "Names, versions and
  filenames"): integer components joined by periods, so `1.0-1` and `1.0.1` are one row. The
  version-level document holds a **tree-keyed map** of file records, one per tree the version
  has a file in: the fields parsed from the archive's own `DESCRIPTION` (the standard field set
  above plus `Built` for a binary), the server-computed `MD5sum`, `SHA256sum` and size, the
  filename as published (the `File` field when it is not the canonical one), and whether the
  file is the tree's current file or an archived one. The join against the version's `File`
  rows is by tree and filename, the same filename-keyed map `pypi.md` and `conda.md` use.
- Every package file is a `File` of the version at the relative path `{tree}/{filename}`, or
  `src/contrib/Archive/{package}/{filename}` once superseded, its `Blob` keyed by the CAS digest
  of the bytes as received; that digest is exactly the `SHA256sum` the record advertises. The
  `MD5sum` is computed at ingest and kept in the record because it is the field every CRAN
  source record carries.
- The repository-level document holds the tree list, the generated documents per tree (each
  representation's reference, inline below the threshold and a CAS blob above it), the two
  `Meta/` documents, and the identity of the generation that produced them; a `remote`
  repository's document caches the upstream's documents and the digest index the proxied path
  builds from them (below).

### Every hosted index document is a write-triggered document

Per the resolved generation decision below, every representation of every tree and the two
`Meta/` documents are produced by the shared signing and index service inside the write that
changes them, **stored, never rendered on request**: the documents in the repository-level
document, CAS-backed above the threshold, protected by the fourth GC mark root
(`storage-and-gc.md` AC16). Rendering on request was rejected because a CRAN-mirror index is a
7 MB document fetched whole by every cold `install.packages`, because three representations
rendered at three moments can disagree, and because a tree is a repository-wide document under
exactly the concurrency `maven.md` captured on its metadata.

The rules the service applies for this format, stated as this format's requirements rather than
as the service's design:

- **Regeneration inside the write.** A file landing in a tree regenerates that tree's three
  representations; a file landing in the source tree also regenerates `Meta/current.rds`, and,
  when the publish supersedes a version, `Meta/archive.rds`; a deletion regenerates the trees
  it touched and both `Meta/` documents. Each lands in the same completed logical write and the
  same snapshot as the change that triggered it, so no snapshot serves a `.rds` that disagrees
  with its `.gz` or an index that lists a file the snapshot does not hold (`data-model.md`'s
  one-write-one-snapshot rule; the prototype's question 3).
- **Under contention, both land.** Two concurrent publishes into one tree each produce an index
  that lists the other's file once both are complete, through the revision-token retry
  `data-model.md` makes mandatory, applied by the service.
- **One listed version per package per tree.** The index lists, for each package, the file of
  its highest canonical version in that tree, exactly what `write_PACKAGES(latestOnly = TRUE)`
  emits; every other file of the package in the source tree is archived (below) and absent from
  the index. The `duplicates` filter therefore never sees a duplicate on this registry.
- **The record is the archive's `DESCRIPTION`, reduced to the field set.** Fields are taken
  from the file at ingest, never from the operation's request; `MD5sum` and `SHA256sum` are the
  registry's; `NeedsCompilation` is the `DESCRIPTION`'s.
- **Byte-stable text.** The DCF is written in package order with the wrapping `write.dcf`
  applies, so an unchanged tree yields byte-identical documents across regenerations and the
  `ETag` of a stored document, derived from its bytes, is shared across snapshots that did not
  change it; every index document is served with `Last-Modified`, `Accept-Ranges: bytes` and
  `Cache-Control: max-age={index TTL}` (default 1800 seconds, per repository, CRAN's own value),
  and every package file with `Cache-Control: public, max-age=31536000, immutable`, because a
  coordinate binds its bytes for the life of the repository.
- **A repoint restores the documents.** Because the documents live in the snapshot delta, a
  rollback serves exactly the index of the snapshot it targets; a pointer moved backwards
  across a deletion must preserve the retirement set (`data-model.md` AC33's obligation on the
  management surface).
- **Virtual repositories merge** (the resolved virtual-repository decision below): a `virtual`
  repository's index for a tree lists, per package, the record of the first member in order
  that holds the package in that tree, whatever version the later members hold; its
  `Meta/archive.rds` is the union by package with the first member's entries first; a package
  file or archive path resolves through the members in order.

### What the signing and index service must provide

Stated so the dependency on `docs/internal/plans/foundation/signing-service.md` (to be authored
in the spec loop) cannot be lost, and precisely enough that the service can be specced against
it:

1. **Unsigned generation of a tree's index** from the version-level records of every file
   current in that tree: the DCF text in `write.dcf`'s wrapping and package order, its gzip
   form, and the xz-compressed R serialisation of the same records as a character matrix with
   `dimnames`, exactly as `saveRDS` writes one; plus the source tree's `Meta/current.rds` and
   `Meta/archive.rds` in the `file.info` data-frame shapes CRAN serves. The R serialisation
   writer is the one novel obligation: no sibling format needs it, and its proof is a real
   `readRDS`. Nothing is signed; the service's signing half is not used by this format.
2. **`latestOnly` selection at generation** over the canonical version order, with the
   superseded files' archive placement carried in the records the handler stores.
3. **Regeneration inside the triggering write**, under the revision-token retry, with the
   incremental property that a tree the write did not touch keeps its documents and their
   `ETag`s.
4. **Storage as CAS-backed metadata above the inline threshold** with byte-derived `ETag`s, so
   a CRAN-sized proxied index (AC13) is a set of blobs the fourth mark root protects and a
   stream copy serves.
5. **The virtual merge** with the rules above, re-run when a member's documents change.
6. **The same generation on the proxied path** from records parsed out of an upstream's
   `PACKAGES.gz` (the resolved proxied-index decision below), so hosted and proxied trees share
   one generator and one representation set.

Nothing is required of the service's verification entry: CRAN trees sign nothing.

### The publish path and what counts as a write

Nothing on the CRAN wire writes, so the hosted path is fed by the registry-owned management API,
`docs/internal/plans/foundation/management-api.md` (to be authored in the spec loop). Per the
cross-format precedent (`pypi.md`'s resolved hosted-yank decision, with `npm.md`,
`ansible-collections.md`, `cargo.md`, `nuget.md`, `maven.md`, `hex.md`, `composer.md` and
`conda.md`), each operation is one completed logical write through the shared write path,
authorised in the settled `(repository, action)` vocabulary with no new action, hosted only,
its trigger verified by this registry's integration tests and its effect by the real clients.
What this format **requires** of that API, stated rather than designed:

| Operation | What the operation carries | Effect a client sees | Action |
|---|---|---|---|
| Publish a file into a tree | The tree path and an archive (`.tar.gz`, `.zip` or `.tgz` by tree); the handler reads `DESCRIPTION` from the archive (`{package}/DESCRIPTION` in a source tarball or an installed-package archive) and takes `Package` and `Version` from it, refusing an archive whose filename, when the operation names one, disagrees after canonicalisation | The file appears in the tree's index in all three representations; a real `install.packages`, `pak::pkg_install` and `renv::install` resolve and install it from a fresh cache; when it supersedes the tree's listed version of the package, that version leaves the index and (source tree) its file becomes reachable at `Archive/{package}/`; when it is older than the listed version it goes straight to `Archive/` and the index is unchanged (the resolved supersession decision below) | `push` |
| Delete a version | Package and canonical version, optionally one tree | Its files leave the trees (or the one tree), the index lists the next-highest version of the package if one is current-or-archived in that tree, `Meta/` follows, its paths answer `404`, and the coordinate joins the retirement set | `delete` |
| Delete a package | Package | Every version's files leave every tree, the index omits the package, every coordinate is retired, and the `Package` row survives (`data-model.md`, "A package outlives its versions") | `delete` |

What this registry enforces on ingest:

- The body is spooled to a bounded temporary buffer outside the CAS and parsed as the format
  its tree names: a gzip tar for `.tar.gz` (source, or a Linux binary carrying `Built`), a zip
  for `.zip`, a gzip tar for `.tgz`; a body that is not its named format, that lacks a
  `DESCRIPTION` at the package root, or whose `DESCRIPTION` lacks `Package` or `Version` or
  carries a value outside the grammars below, is refused with `422` and nothing committed. A
  binary archive whose `DESCRIPTION` carries no `Built` field, or a source tarball whose
  `DESCRIPTION` carries one, is refused the same way, so a binary cannot land in the source
  tree.
- `MD5sum`, `SHA256sum` and size are computed from the received bytes; nothing client-supplied
  is trusted for integrity.
- **A coordinate that already exists in the tree with identical bytes is idempotent** (no
  snapshot: the CI retry); **with different bytes it is refused with `409`**. The ecosystem's
  own convention is that a rebuild bumps the version (CRAN never accepts the same version
  twice), and every `renv.lock` pins the version.
- **A retired coordinate is refused the same way**, with the same bytes or different ones, in
  every tree: a deleted version joins the package's retirement set and is never republishable,
  the cross-format rule the sibling specs adopted.
- The response is `201` with a JSON body naming the tree, the stored path, the record's
  `SHA256sum`, the supersession it performed (which version moved to the archive, if any) and
  the snapshot; a publish to a proxied repository answers `405`.

`data-model.md` requires each format spec to declare its ecosystem's write boundaries and makes
metadata-only mutations snapshot-creating writes. CRAN's declaration:

- **One file publish is one completed logical write**: the file, its record, the supersession
  move, every regenerated representation of the tree and the `Meta/` documents land in one
  snapshot, and the tree's index served from the head snapshot lists the file before the
  response is sent. A publisher publishing a source tarball and a Windows binary of one version
  performs two writes, faithful to an ecosystem whose trees are independent.
- **A supersession is part of the publish, never a second write**: the previous file's move to
  `Archive/{package}/` and the regeneration of `Meta/archive.rds` are the same write.
- **Each deletion is one write** however many trees and files it touches, per
  `data-model.md`'s bulk-operation rule; the retirement set is updated in the same write.
- A proxied repository creates no snapshots at all; document arrival and revalidation are
  cache materialisation.

The prior art confirms the shape rather than contradicting it: drat's `insertPackage(action =
"archive")` "place[s] any previous versions into a package-specific archive folder", CRAN's own
practice is exactly that move, and miniCRAN's `addOldPackage` fetches from `Archive/` and warns
that duplicate versions must be removed by hand before the index is rebuilt, which is the
`latestOnly` rule this registry applies automatically.

### Names, versions and filenames

Package names are matched byte for byte and never folded (`Matrix` and `matrix` are two CRAN
packages), under the grammar above; a request naming a package under any other spelling answers
`404`. A filename splits at its **first** underscore, because a package name cannot contain
one and a version can contain a hyphen but never an underscore: `{package}_{version}{ext}`.

Versions are the trap. R compares versions as `numeric_version`: a sequence of at least two
non-negative integers separated by `.` or `-`, compared component-wise as integers, so `1.0-1`
equals `1.0.1`, `1.01` equals `1.1`, and `1.0` is less than `1.0.0`. This registry keys a
version by its **canonical form**, the integer components with leading zeros dropped and joined
by periods, so that two files the client would treat as one version cannot both be listed or
both be current; the filename as published is kept in the record and served as the `File` field
when it differs from `{package}_{canonical version}{ext}`, so `install.packages` fetches the
name the tree holds (captured in the source: `install.packages` and `download.packages` use
`File` when present). A version outside the grammar is refused at publish. The one ordering
this registry performs is the canonical order for `latestOnly` selection; the client re-sorts
by its own `numeric_version` and agrees by construction.

### Authentication: URL userinfo, and clients that never see a challenge

The captured form is HTTP Basic carried in the repository URL's userinfo, on every client: base
R and renv send it preemptively on every request, pak after one `401`. No client reads a
`WWW-Authenticate` value, no client has a stored-login form for a CRAN repository beyond
`.netrc`, and none prints a status for a refused index (the three-request fallback renders as
"unable to access index"). How this meets `auth.md`, whose rules this spec does not bend:

- **The form is the token-as-password convention** `auth.md` already defines: the registry token
  in the password field, the username not an authentication input, verified as any Basic
  credential (its AC31). The harness writes the issued token into the repository URL as
  userinfo (`http://__token__:{token}@host/cran/{repository}`) for all three clients, and
  nothing new is asked of the `setup` vocabulary. `auth.md`'s client table needs rows for
  `R`, `pak` and `renv`, recorded as a sibling consequence.
- **The challenge is uniform and not an existence oracle.** A credential-less request under a
  repository that is not anonymously readable answers `401` with `WWW-Authenticate: Basic
  realm="..."`, byte-identical for a private, a missing and someone else's repository, the
  mechanism every sibling uses and the one pak's userinfo retry depends on; a request carrying
  a valid token that lacks `pull` answers `404`, indistinguishable from a missing repository
  (`auth.md` AC17), and every client's absent-index rendering already reads as "repository does
  not exist". A rejected credential answers `401` and is never served as anonymous (`auth.md`
  AC12).
- **TLS.** `auth.md` requires TLS on every credential-bearing path and refuses plaintext
  credentials unless the operator's flag is set (its AC27); every pinned client accepted an
  `http://` repository without an opt-in, so this registry's externally visible base URL is
  `https://` in every configuration the documentation shows. The harness's transcript capture
  terminates TLS with its CA injected through `CURL_CA_BUNDLE`, which R's libcurl method
  documents, for base R and renv, and `SSL_CERT_FILE` for pak's bundled curl, the per-client
  injection `conformance-harness.md` leaves to each format; neither was exercised in this pass
  and both are confirmed when the auth cases are written.

### Addressed objects and pattern scopes

`auth.md`'s pattern scopes narrow a credential within one repository by matching the object each
request addresses, and the format declares which object each route reports ("Pattern scopes"
there; `format-handler-interface.md` AC12). The canonical object is `{package}/{canonical
version}` for a file and `{package}` where only a package is addressed; the tree is not part of
the object, so a credential patterned to a package covers its source and binary files alike.

| Route | Object kind | Canonical object |
|---|---|---|
| `{tree}/PACKAGES`, `PACKAGES.gz`, `PACKAGES.rds`, `src/contrib/Meta/current.rds`, `Meta/archive.rds` | none | - (each enumerates the repository) |
| `{tree}/{package}_{version}{ext}` | named | `{package}/{canonical version}`, parsed from the filename |
| `src/contrib/Archive/{package}/{package}_{version}.tar.gz` | named | `{package}/{canonical version}` |
| Publish (management API) | named | `{package}/{canonical version}` from the operation's declared coordinate when it names one, confirmed against the archive's `DESCRIPTION` after the body arrives, a disagreement refused; none when the operation names no coordinate, in which case only an unpatterned `push` authorizes it (the resolved publish-object decision below) |
| Delete a version (management API) | named | `{package}/{canonical version}` |
| Delete a package (management API) | named | `{package}` |
| A directory URL, `Archive/`, `Archive/{package}/` | none | - (answers `404` in any case) |

What that gives and costs, applying `auth.md`'s rules rather than re-deciding them. **A
patterned `pull` cannot resolve on this format**: every client reads a tree-wide index first,
and the index reports `none`, which a patterned scope never authorizes, so a real
`install.packages`, `pak::pkg_install` or `renv::install` under a token patterned `acme*/**`
fails at the index with the client's absent-index rendering, while `curl` of an in-pattern
tarball under the same token succeeds and an out-of-pattern one is refused; the same consequence
`conda.md` and `composer.md` record. AC9 asserts that rather than leaving it implied, and the
operator documentation states that a CRAN credential that must resolve holds an unpatterned
`pull`. **A patterned `push` publishes** through the management API when the operation
declares its coordinate, because the registry confirms it against the archive's own
`DESCRIPTION`, so per-package CI publish credentials are expressible on this format even though
per-package read credentials are not.

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines, on a
package-file or archive route of either path, the handler answers `403` with a `text/plain`
body naming the policy and rule, or naming the signal for a coordinate condemned under the
shared security-signal rule. `403` rather than the existence rule's `404`, because the caller
is authorized and the content is what is refused. The refusal bites at the file download, after
the client has resolved from an index that still lists the record (the resolved index-elision
decision below, `conda.md`'s precedent), so every client fails after resolution: base R prints
"cannot open URL '{url}': HTTP status was '403 Forbidden'" and "download of package '{package}'
failed", pak "Failed to download {package} from `{url}` and `{archive url}`" (both paths refused
alike, captured), renv "error downloading '{url}' [cannot open URL '{url}']" with no status at
all. The body reaches nobody through the pinned clients, so it is for `curl` and the
transcript: the reason-phrase risk `pypi.md` named and `maven.md`, `hex.md`, `composer.md` and
`conda.md` confirmed, confirmed here for three more clients, one of which shows not even the
status, and carried to `supply-chain-policy.md` as a finding rather than worked around.

### Integrity, signing and provenance

Every source record carries `MD5sum` (`write_PACKAGES` writes it; CRAN serves it), CRAN's macOS
tree adds `SHA256sum`, and its Windows tree carries neither; **no pinned client verifies
either** (a byte flipped mid-body was downloaded by all three and failed only at extraction),
so on the hosted path the digests are documentation for `curl` users and the lock-file tools
that read the index, and on the proxied path they are what this registry verifies against
before commit. This registry emits both for every tree, computed from the stored bytes, which
is more than `write_PACKAGES` emits for a binary tree and goes on the exception list. Nothing on
this wire is signed: CRAN signs no tree and no package, and the ecosystem has no artifact
signature or attestation convention a client checks.

What CRAN requires of the shared services, stated so the dependency cannot be lost:

- Of `docs/internal/plans/foundation/artifact-verification.md` (to be authored in the spec
  loop): nothing. There is no signature envelope to verify and no attestation format to store.
- Of `docs/internal/plans/foundation/signing-service.md` (to be authored in the spec loop):
  nothing beyond the unsigned generation above.

Advisory matching for CRAN coordinates is the policy engine's coordinate-level path: unlike
Conda, whose ecosystem OSV does not define (`conda.md`'s finding), **OSV defines the `CRAN`
ecosystem** (read 2026-09-26; `Bioconductor` beside it) and serves advisories under it, the R
Consortium's `RSEC-*` series with `pkg:cran/{package}` PURLs (captured: `readxl`, `jsonlite`,
`commonmark`), so the feed condemns a CRAN coordinate by name with no handler cooperation and
`supply-chain-policy.md`'s advisory-dependent rules bind on this format. Byte-level cataloguing
of a source tarball or an installed-package archive is the cataloguer's business; whether the
library selected at that spec's Phase 1 emits `pkg:cran/` PURLs is checked there.

### The proxied path

The handler owns the request and classifies for the proxy layer's fetch-and-cache API per the
settled decisions in `proxy-cache.md`; the upstream is a repository base URL (a CRAN mirror, a
Bioconductor release repository, a private `write_PACKAGES` tree behind any file server),
validated at configuration by fetching `src/contrib/PACKAGES.gz` or, failing that,
`src/contrib/PACKAGES`, and requiring one of them to parse as DCF with a `Package` field in its
first record (AC20). An upstream URL carrying a `__linux__` segment is refused at configuration
with a message naming the plain source path (the resolved P3M decision below), and the adapter
presents a `User-Agent` that is not an R agent, so an upstream that negotiates on it serves
source. What this format requires of `docs/internal/plans/foundation/upstream-adapters.md` (to
be authored in the spec loop) is exactly that: a fixed non-R `User-Agent` on every upstream
request of this format.

- **The index of every tree is mutable metadata with a TTL**, but it is not served byte for
  byte (the resolved proxied-index decision below): at each revalidation the registry fetches
  the upstream's `PACKAGES.gz` (falling back to `PACKAGES`, the two documents every generator
  writes and pak reads), parses the DCF into records, and hands them to the index service,
  which generates the three served representations and stores them as it does for a hosted
  tree. A CRAN mirror serves `ETag`, `Last-Modified` and `max-age=1800` and answers `304` to
  `If-None-Match` (captured), so revalidation uses the entity tag and an unchanged 1.9 MB
  `.gz` costs a `304` upstream; a private tree without an `ETag` is refetched whole at the TTL.
  Clients' own requests inside the TTL are answered from the stored documents under this
  registry's `ETag` (no pinned client sends a conditional request for an index, so the `304`
  path serves `curl` and the corpus). The `Meta/` documents are mutable metadata with the same
  TTL, passed through byte for byte, because their consumers parse the upstream's shape and
  nothing in them names a URL.
- **Package files are immutable artifacts** cached indefinitely: CRAN never republishes a
  version under the same number, and every lock file pins the version. The fetch is
  **stream-and-verify against the record's `SHA256sum` when the upstream's index carries one,
  else its `MD5sum`**, never committed on a mismatch or a truncated body; a tree whose index
  carries neither (CRAN's Windows tree, every `write_PACKAGES` binary tree) uses the
  completion-only mode requested of `proxy-cache.md`, and the served record then carries the
  digests this registry computed. The record comes from the **digest index** the handler
  builds once per revalidated index and stores in the repository-level document.
- **A coordinate resolves at both its paths** (the resolved archive-resolution decision below).
  A request for `src/contrib/{package}_{version}.tar.gz` or for
  `src/contrib/Archive/{package}/{package}_{version}.tar.gz` is one coordinate; on a miss the
  registry fetches the current path first and the archive path second, whichever the client
  asked for, caches the bytes once, and serves them at both paths from then on. A client whose
  hour-old index still lists a version CRAN superseded ten minutes ago therefore installs it
  from this registry where the mirror would answer `404`, and pak's archive probe of a current
  version answers `200` here where CRAN answers `404`; both go on the exception list.
- **Missing coordinates are negatively cached** with the short TTL, after both paths have been
  tried: a `404` on both is how a client learns a version does not exist; a `404` on a tree's
  index (a binary tree the upstream lacks) is negatively cached and answered as the empty
  index a hosted tree would serve, so a Windows client of a source-only upstream gets no
  warning; a `429` or `5xx` is never cached as absence (`proxy-cache.md` AC9). A `404` on a
  current-path file the cached index still lists is the one miss that is not negatively
  cached: it means the upstream superseded the version, and the archive path is tried instead.
- **Directory URLs answer `404`** on both paths; the upstream's HTML listings are never fetched.
- **Publish and every management operation against a `remote` repository answer `405`.**
- **CRAN scale is the design point** (AC13): the source index is 7.3 MB plain, 1.9 MB gzip and
  1.3 MB rds, above the inline threshold in every representation, so every one lives in the
  CAS under the fourth mark root, the read path is a byte copy with `Range` honoured (CRAN
  serves `Accept-Ranges: bytes` and so does this registry), and the parse-and-regenerate per
  revalidation is bounded by a streaming DCF reader with a CI benchmark gate on its time and
  peak memory because `CLAUDE.md` makes performance a gate rather than a hope.

Upstream removal maps onto the settled purge-or-flag table as CRAN's side of that contract:

| Upstream event, as observed at revalidation | Classification |
|---|---|
| A version leaves the source index and its file answers `404` at the current path while `Archive/{package}/` holds it (supersession by a newer release) | An **ordinary metadata change**: the newer version is listed at the next revalidation, and the cached coordinate keeps serving at both paths; no divergence recorded, because the bytes never changed |
| A package leaves the index with every version in `Archive/` and none current (CRAN's "archived" state: a policy violation or a maintainer's request, with no machine-readable reason) | Keep serving the cached coordinates, record an operator-visible divergence; the wire carries no signal distinguishing a takedown from a retirement |
| A re-fetched file disagrees with the recorded digest, or an index record's `MD5sum` changes for a version this registry holds | An **immutability violation** treated as the explicit signal: purge the cached file and alert, then re-fetch and verify against the new digest on demand, because CRAN's own rule is that a version is published once and every consumer that verified the old digest would otherwise disagree with this registry |
| A `Depends`, `Imports` or other record field changes for the same version (CRAN's own metadata corrections) | An ordinary metadata change, propagated at the next revalidation |
| A binary tree gains or loses a version (CRAN rebuilds binaries on its own schedule) | An ordinary metadata change, propagated at the next revalidation; a cached binary keeps serving until eviction |
| The index answers `404` where it previously existed | Keep serving, record a divergence |

Detection happens at revalidation, passively, per `proxy-cache.md`'s resolved passive-detection
decision (was Q12); the active channel is the policy engine's advisory feed, which carries the
`CRAN` ecosystem through OSV, and it is the only channel that condemns a CRAN coordinate as
malicious under the shared security-signal rule. Nothing on this wire is an explicit security
signal.

Per the resolved preconfigured-upstream decision below, `cloud.r-project.org` stays
user-configured in v1, the answer `cargo.md`, `pub.md`, `hex.md`, `composer.md` and `conda.md`
adopted for their Tier 2 upstreams and `proxy-cache.md` confirmed (its resolved
preconfigured-set extension, was Q14).

### Virtual repositories, and why CRAN can have what Hex cannot

`hex.md` found virtual repositories impossible because every registry resource is signed under
the repository's own name and the client checks that name. Nothing on a CRAN tree is signed and
no document names the repository: `available.packages` fills its `Repository` column from the
URL the client itself used, a record names a package and a version, and a file is bound to its
digest. A `virtual` CRAN repository is therefore expressible and is served (the resolved
virtual-repository decision below): its per-tree index is the merge described under
generation, a file or archive request resolves through the members in order, and to every
client it is one repository. Two semantics follow and are stated rather than discovered: the
merge is **by package, first member wins**, not by version, because a virtual repository's
member order is `data-model.md`'s resolution order and a private build of a public package must
shadow the public one whatever version the mirror carries (a merge by highest version would let
CRAN's next release silently un-shadow a private fork); and the `Archive/` of a virtual
repository is the union, so pak's and renv's version-pinned lookups find a version whichever
member holds it, the first in order supplying the bytes on a collision. Artifactory and Nexus
both offer virtual CRAN repositories, so the shape is the one users arrive expecting.

### Conformance, the three clients and the corpus

The two pinned R generations are two years apart (4.3.3 of February 2024, 4.5.1 of June 2025)
and **behaved identically on this wire**: the same three-step index order, the same headers, the
same session cache, the same filter messages, the same failure texts, differing only in the
`{x.y}` segment of the binary tree paths (`4.3` against `4.5`) and in the libcurl behind them,
which is itself the finding, and which is why the binary-tree criterion (AC18) runs on both.
pak 0.11.1 and renv 1.1.5 are the second and third clients of the ecosystem (the catalogue counts
one ecosystem and no multiplier row; all three appear in the matrix's Client column under the
CRAN row): pak reads a different representation, probes the archive on every download and
carries the CRAN-name and third-party-metadata behaviours above; renv reads through base R and
adds the archive lookup. Every hosted and proxied read case runs on all three; the archive cases
run on pak and renv; the binary-tree cases run on both R generations through `download.packages`.

Two pak behaviours are named for the harness rather than left to be found. pak resolves only
from a repository named `CRAN` (any other name makes it add the real mirror), so every pak case
names the registry repository `CRAN` in `options(repos)`; and pak contacts `cran.r-pkg.org`
and Bioconductor's repositories on every metadata update, which the harness's network-isolated
client container cannot reach, so the pak cases bind those hostnames inside the client
container to a fixture answering `404` fast, and AC1's pak run asserts that pak completes under
that binding rather than assuming it. The binding answers rather than refuses for a captured
reason: with those three hostnames bound to a loopback address that refuses connections, the
same `pak::pkg_install` completed correctly but took 13 minutes 50 seconds, all of it in pak's
metadata update, so a case that merely isolated the client would pass and cost a quarter of an
hour per run.

The recorded surface for the replay corpus, named now because a thin recording script yields a
thin specification: against `cloud.r-project.org`, a cold `install.packages` of a package with a
dependency on each R generation (the `.rds` index and the tarballs), the same warm inside the
session cache, `available.packages` with `ignore_repo_cache`, `download.packages` of a Windows
binary and a macOS binary on each generation, a missing package, a package hidden by the
`R_version` filter, `pak::pkg_install` (the `.gz` index, the archive probe), `renv::install` of
a current and of an archived version, `pak::pkg_install("{package}@{version}")` for an archived
version (the flow this pass could not reproduce against the fixture), and an `Archive/` fetch
of a superseded version. For the hosted write surface there is **no reference implementation of
a publish**: no wire publish exists anywhere, so the publish flows are exercised through this
registry's management endpoint and verified by the real clients' resolves, recorded as an
exception-list entry rather than left for the matrix to imply; the read surface's reference
implementation is a `write_PACKAGES` tree behind a plain file server, which is exactly what a
CRAN mirror is, so `Capabilities()` declares reference-implementation availability `available`.
Recording gates on the harness's redaction criterion (`conformance-harness.md` AC13); the
userinfo credential travels in the URL as well as in the `Authorization` header, so the
redaction rule for this format names the URL userinfo too. Every deliberate divergence from a
`write_PACKAGES` tree behind a file server goes on the recorded exception list before its flow
is expected to replay: the `SHA256sum` and `MD5sum` on binary-tree records, the empty index
served for a tree the repository holds no file for, a current version answering `200` at its
archive path, a superseded version answering `200` at its current path, the `404` on directory
URLs, the `405` on remote writes, the `409` on a changed-bytes republish, and the regenerated
(rather than pass-through) index bytes on the proxied path.

## Acceptance Criteria

- [ ] AC1: `install.packages` on both pinned R generations (4.3.3 and 4.5.1), `pak::pkg_install`
      (0.11.1, with the repository named `CRAN` and `cran.r-pkg.org` and Bioconductor bound to
      a fast-`404` fixture in the client container) and `renv::install` (1.1.5) each resolve and
      install a package and its dependency from a hosted repository configured as a
      format-first URL, from a fresh session, library and client cache; the transcript shows
      base R and renv fetching `PACKAGES.rds` and pak fetching `PACKAGES.gz`, each with the
      captured headers (`Pragma: no-cache` on base R's index request, `Accept-Encoding:
      deflate, gzip` on pak's), then one tarball per package, pak additionally probing
      `Archive/{package}/` for each; a second `install.packages` in the same session makes no
      index request and a second pak or renv install of the same coordinate makes no request
      at all, both asserted at the network layer.
- [ ] AC2: Every hosted tree serves `PACKAGES`, `PACKAGES.gz` and `PACKAGES.rds` generated from
      one stored state and agreeing record for record: the `.gz` decompresses to the bytes of
      the text, which is written in `write.dcf`'s wrapping and package order, the `.rds` is
      xz-compressed and `readRDS` in both pinned generations returns a character matrix whose
      `dimnames` carry the package names as row names and the standard field set as column
      names, from which `available.packages` resolves the same versions the text lists; every
      record carries `NeedsCompilation` from the archive's `DESCRIPTION` and `MD5sum` and
      `SHA256sum` computed by the registry from the stored bytes; the source tree serves
      `Meta/current.rds` and `Meta/archive.rds` in the
      `file.info` data-frame shapes CRAN serves, readable by `readRDS`; a well-formed tree path
      the repository holds no file for (`bin/windows/contrib/4.3/`, `bin/macosx/big-sur-arm64/
      contrib/4.5/`) serves an empty index in all three representations so that
      `download.packages` on either generation prints no absent-index warning; and a path
      outside the tree grammar, a directory URL and a file under any other spelling of a
      package name answer `404`.
- [ ] AC3: Publishing a source tarball into `src/contrib` through the registry-owned management
      API makes a real `install.packages` (both generations), `pak::pkg_install` and
      `renv::install` resolve and install it from fresh caches with the served `SHA256sum`
      matching the bytes, in exactly one snapshot in which the file, its record, the
      regenerated representations and `Meta/current.rds` land, the index serving the record
      before the response is sent; publishing a newer version of the same package lists only
      the newer one, moves the older file to `Archive/{package}/` and regenerates
      `Meta/archive.rds` in that same one snapshot, after which the older version installs
      through `renv::install("{package}@{version}")` and is unlisted for base R; publishing a
      version older than the listed one lands in `Archive/` with the index unchanged; and a
      body that is not its tree's format, lacks a root `DESCRIPTION`, whose `DESCRIPTION` lacks
      `Package` or `Version` or carries one outside the grammar, or whose binary-ness disagrees
      with the tree (a `Built` field in a source tarball, none in a binary), is refused with
      `422` and nothing committed.
- [ ] AC4: A publish of an existing coordinate with identical bytes answers `201` and creates
      no snapshot; one with different bytes answers `409`; deleting a version through the
      management API removes its files from every tree in one snapshot, the index lists the
      package's next-highest remaining version or omits the package, its paths answer `404`,
      `Meta/` follows, and a real install of the deleted version fails on every client; deleting
      a package retires every coordinate in one snapshot and leaves the `Package` row; a deleted
      coordinate is refused republication with the same or different bytes, in any tree,
      including after the deletion's snapshot has been pruned out of retention; a principal
      holding `pull` alone is refused every operation, one holding `push` without `delete` is
      refused deletion, no snapshot is created by a refusal, and every operation against a
      proxied repository answers `405`.
- [ ] AC5: Every hosted index document is produced by the shared index service inside the
      triggering write, never by the handler, proven by an architecture test that the handler
      package holds no DCF, gzip-index or R-serialisation writer; two concurrent publishes into
      one tree both land and every representation lists both files, the regenerated documents
      committing in the same snapshot as the file that triggered them, proven by repointing to
      that snapshot's predecessor and reading the previous documents; a publish into one tree
      leaves another tree's documents and `ETag`s unchanged; and an index above the inline size
      threshold is stored as a CAS blob, protected across a GC sweep by the CAS-backed-metadata
      mark root, and served to a real client afterwards.
- [ ] AC6: A hosted coordinate resolves at both its paths: a superseded version answers `200`
      with identical bytes at `src/contrib/{package}_{version}.tar.gz` and at
      `src/contrib/Archive/{package}/{package}_{version}.tar.gz`, a current version answers
      `200` at both too, a version the repository never held answers `404` at both, and
      `renv::install("{package}@{version}")` of a superseded version and
      `pak::pkg_install("url::{archive url}")` each install it from a fresh cache while
      `pak::pkg_install("{package}@{version}")` is recorded with its outcome in the corpus
      rather than asserted.
- [ ] AC7: A version whose `Depends` names a newer R than the client is hidden by every
      client's `R_version` filter with its captured message and no tarball request, under the
      default filter set (`R_version`, `OS_type`, `subarch`, `duplicates`); a hosted tree lists
      exactly one version per package even when the repository holds several (the
      `latestOnly` rule), so `available.packages(filters = list())` shows one row per package
      and the `duplicates` filter never sees a duplicate; a missing package makes no tarball
      request on any client; and a version published as `1.0-1` when `1.0.1` exists is refused
      as a duplicate coordinate, because `numeric_version` compares them equal, while its file,
      when published first, is served under the name it was published with through the index's
      `File` field.
- [ ] AC8: On a private repository a credential-less index request answers `401` with
      `WWW-Authenticate: Basic`, byte-identical for a private and a non-existent repository,
      each client printing its captured absent-index rendering; base R (both generations),
      pak and renv then resolve with the token as the repository URL's userinfo password, the
      transcript showing base R and renv preemptive and pak retrying after the `401`, and the
      credential on every tarball request; a valid token lacking `pull` answers `404`; a
      rejected credential answers `401` and is never served as anonymous; and a credential
      presented over a connection this registry did not terminate with TLS is refused per
      `auth.md` AC27, while under the harness's TLS termination with its CA injected through
      `CURL_CA_BUNDLE` and `SSL_CERT_FILE` every client resolves with no insecure opt-in.
- [ ] AC9: A token holding only `pull` under the pattern `acme*/**` is refused every index and
      `Meta/` route so that a real `install.packages`, `pak::pkg_install` and `renv::install`
      under it fail at the index, fetches an in-pattern tarball through `curl` at its current
      and archive paths and is refused an out-of-pattern one; a token holding `push` under the
      same pattern publishes `acmetool` through the management API with the coordinate declared
      and is refused `othertool`, with no snapshot created by a refusal, an archive whose
      `DESCRIPTION` names an out-of-pattern package refused after the body arrives, and a
      publish declaring no coordinate refused under the patterned token; and in proxied mode
      the patterned `pull` token fetches an in-pattern tarball and is refused another.
- [ ] AC10: A package-file or archive request the shared policy layer refuses answers `403`
      with a `text/plain` body naming the policy, on the hosted and the proxied path, the index
      still listing the record, and real installs on both R generations, pak and renv exit
      non-zero printing their captured `403` renderings, each naming the refused `{url}`
      (pak's naming both paths, renv's naming no status), with the body captured in the
      transcript.
- [ ] AC11: The proxied path resolves a package and its dependency from a `write_PACKAGES`
      stand-in on both R generations, pak and renv, serving an index generated from the
      stand-in's `PACKAGES.gz` in all three representations; from fresh client caches a second
      resolve on each client reaches this registry while the upstream receives no request,
      asserted at the network layer; every package file was verified against the record's
      `SHA256sum` when the stand-in's index carries one, its `MD5sum` otherwise, and through
      the completion-only mode when it carries neither, before commit; a stand-in whose
      `PACKAGES.gz` is absent is read from its `PACKAGES`; and the served records carry the
      digests this registry computed.
- [ ] AC12: A proxied index is revalidated after its TTL and not before, with `If-None-Match`
      so an unchanged document costs a `304` upstream; a version published upstream becomes
      visible to every client after the TTL and, absent an explicit refresh, not before, with
      base R's session cache defeated by a fresh session; a `curl` conditional request inside
      the TTL is answered `304` without an upstream request; and the `Meta/` documents are
      passed through byte for byte and revalidated on the same schedule.
- [ ] AC13: Against a stand-in serving the recorded `cloud.r-project.org` source index (7.3 MB
      plain, 1.9 MB gzip, 1.3 MB rds) and `Meta/` documents, every client resolves a real
      package through the proxied path, the regeneration per revalidation runs with the
      server's peak memory and time under the thresholds a CI benchmark gate fails on, every
      representation is served as a CAS-backed blob by a stream copy with `Range` honoured, and
      a warm resolve on each client costs no upstream request.
- [ ] AC14: A superseded coordinate on the proxied path serves at both its paths after the
      upstream has moved it: with the stand-in mutated so a version leaves `src/contrib` and
      appears under `Archive/{package}/`, a client holding the pre-mutation index installs it
      from this registry at its current path, a client asking for the archive path gets the
      same bytes, no divergence is recorded, and pak's archive probe of a current version
      answers `200`; a version neither path holds is answered `404` and negatively cached after
      both paths were tried, while a `404` on a current-path file the cached index still lists
      is not negatively cached and resolves through the archive path; a binary tree the
      upstream lacks is answered as an empty index; and an upstream `429` or `5xx` is neither
      cached as absence nor surfaced as not-found and succeeds as soon as the upstream recovers.
- [ ] AC15: A re-fetched file whose bytes differ from the digest this registry stored, or an
      index entry whose `MD5sum` changes for a held version, purges that file's cached references, raises the
      operator alert and re-verifies the next fetch against the new digest; a package leaving
      the index with every version archived keeps serving with a divergence recorded; a
      changed dependency field, a binary tree gaining or losing a version and a supersession
      propagate as ordinary metadata changes with no divergence; an index answering `404` keeps
      serving with a divergence: CRAN's side of the settled removal table in `proxy-cache.md`
      (its AC13); and a coordinate condemned through the advisory feed's `CRAN` ecosystem is
      refused with no upstream request.
- [ ] AC16: A stand-in serving a file whose bytes disagree with the record's digest, or a
      truncated body, never commits anything to the CAS and attaches no cached reference, the
      client receives the same failure it would from a corrupt upstream (each client's captured
      extraction error on the hosted path is the control, and the fact that no client verified
      the index digest is asserted from the hosted control's transcript), and the real failure
      reason is recorded observably to the operator.
- [ ] AC17: A virtual repository over a local and a remote member serves each tree's merged
      index in every representation with, per package, the first member's record whatever
      version the second holds, its `Meta/archive.rds` the union; every pinned client resolves
      through it a package that exists only in the second member; a package present in both
      installs the first member's version and bytes on every client, asserted by digest, even
      when the second member's version is higher; and `renv::install("{package}@{version}")`
      of a version only the second member archives installs it through the merge.
- [ ] AC18: A Windows binary (a zip of an installed package) published into
      `bin/windows/contrib/4.5/` and a macOS binary (a gzip tar of an installed package)
      published into `bin/macosx/big-sur-arm64/contrib/4.5/` through the management API are
      listed by their trees' indexes as `{package}_{version}.zip` and `{package}_{version}.tgz`
      with `Built` absent from the text and `MD5sum` and `SHA256sum` present, and
      `download.packages(type = "win.binary")` and
      `download.packages(type = "mac.binary.big-sur-arm64")` on R 4.5.1 fetch the `4.5` trees'
      `PACKAGES.rds` and the files with matching digests at the paths `contrib.url` computes,
      while the same calls on R 4.3.3 fetch the `4.3` trees, receive the empty index and report
      no package; a Linux binary published
      into `bin/linux/4.5-noble/contrib/4.5/` is listed there and fetched by
      `download.packages` with that tree as `contriburl`; and a binary published into the
      source tree, or a source tarball into a binary tree, is refused with `422`.
- [ ] AC19: The generation and client differences are asserted, not assumed: both R
      generations produce byte-identical request sequences and headers apart from the `{x.y}`
      segment; pak never requests `PACKAGES.rds` and reads `PACKAGES` when `PACKAGES.gz` is
      absent, renv and base R read `PACKAGES.gz` when the `.rds` is absent and `PACKAGES` when
      both are; pak with the repository under a name other than `CRAN` in `options(repos)` resolves the package
      from no request to this registry's tarball route, asserted from the transcript, and the
      operator documentation names the `CRAN`-name requirement and pak's third-party metadata
      egress.
- [ ] AC20: Configuring a remote repository whose upstream answers neither a parseable
      `src/contrib/PACKAGES.gz` nor a parseable `src/contrib/PACKAGES`, or whose URL carries a
      `__linux__` segment, is refused at configuration with a message naming the requirement
      (and, for `__linux__`, the plain source path); every upstream request of this format
      carries the adapter's non-R `User-Agent`, asserted from the stand-in's transcript; a
      `virtual` repository of format `cran` is accepted; and a publish or management operation
      against a remote repository answers `405`.
- [ ] AC21: Replay-match passes against a corpus recorded from `cloud.r-project.org` covering
      the recorded surface named in Design, with the hosted publish flows on the exception list
      as flows exercised through this registry's management endpoint.
- [ ] AC22: A hosted tree's `Cache-Control`, `ETag`, `Last-Modified` and `Accept-Ranges: bytes`
      headers are served on every index document, a matching `If-None-Match` answers `304`,
      every package file is served with an `immutable` cache header, and an index the
      repository's writes did not change keeps its `ETag` across snapshots while a repoint that
      changes it changes the tag.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/cran/hosted_test.go` (both R images, pak and renv in the 4.5.1 image; fresh session, library, `pak::meta_clean()`, `pak::cache_clean()` and a fresh `RENV_PATHS_CACHE` in setup; the third-party hostnames bound to a fast-`404` fixture in the pak client container; per-client index representation and headers asserted from the transcript; the warm runs asserted at the network layer) |
| AC2 | conformance + integration | `conformance/cran/documents_test.go` (`curl` and `readRDS` in both R images over every representation and both `Meta/` documents; the empty-tree `download.packages` runs on both generations; wrong-spelling, directory and out-of-grammar paths through `curl`); `internal/format/cran/documents_test.go` (record agreement across representations, server-computed digests, the R serialisation writer against a golden `saveRDS` output) |
| AC3 | conformance + integration | `conformance/cran/publish_test.go` (the `script` publishes through the management endpoint, then real installs on all three clients from fresh caches with digest comparison; a newer publish then `renv::install("{package}@{version}")` of the archived one; refusal fixtures through `curl`); `internal/format/cran/publish_test.go` (snapshot count and content set, head-snapshot visibility before the response, the supersession move and `Meta/` regeneration in one write, the older-than-listed case, `DESCRIPTION` and grammar refusals) |
| AC4 | conformance + integration | `conformance/cran/manage_test.go` (identical and changed-bytes republish through `curl`; the `script` deletes through the management endpoint, then real installs fail on all three clients); `internal/format/cran/manage_test.go` (one snapshot per operation, retirement with same and different bytes and across trees, after pruning under an injected clock, action refusals, `405` on remote) |
| AC5 | architecture test + integration | `internal/format/cran/arch_test.go` (no DCF, gzip-index or serialisation writer in the handler package); `internal/format/cran/concurrent_publish_test.go` (two writers into one tree, every representation, predecessor repoint, untouched tree's `ETag`s stable); `internal/storage/metadata_root_test.go` (threshold crossing, sweep, serve) |
| AC6 | conformance + integration | `conformance/cran/archive_test.go` (`curl` at both paths for superseded, current and never-held versions; `renv::install("{package}@{version}")` and `pak::pkg_install("url::...")` from fresh caches; pak's archive probe, which its `packages_make_sources` records as every package's second source, asserted `200`; the `pak::pkg_install("{package}@{version}")` run recorded); `internal/format/cran/coordinate_paths_test.go` (both paths resolve one `File`) |
| AC7 | conformance + unit | `conformance/cran/filters_test.go` (the `R (>= 9.0.0)` fixture on all three clients with each captured message; `available.packages(filters = list())`; the missing-package transcripts); `internal/format/cran/version_test.go` (canonical form table: `1.0-1` against `1.0.1`, `1.01` against `1.1`, `1.0` against `1.0.0`; duplicate refusal; the `File` field) |
| AC8 | conformance + integration | `conformance/cran/auth_test.go` (private repository on all three clients with userinfo credentials; challenge equality across existing and missing repositories from the transcript; pak's `401` retry and the others' preemptive header asserted; `pull`-less and rejected tokens); `internal/format/cran/auth_test.go` (plaintext refusal under `auth.md` AC27); every conformance case runs behind the harness's TLS termination with `CURL_CA_BUNDLE` and `SSL_CERT_FILE` set in the client containers and no insecure opt-in |
| AC9 | conformance + unit | `conformance/cran/auth_test.go` (the pattern-refusal case `format-handler-interface.md` AC7 requires, in both modes; pattern-scoped tokens through the `credentials` key; the index refusal under real installs on all three clients; in-pattern and out-of-pattern publishes through the management endpoint, the mislabelled and the undeclared-coordinate fixtures); `internal/format/cran/scope_object_test.go` (the object table, per route, `format-handler-interface.md` AC12) |
| AC10 | conformance | `conformance/cran/policy_test.go` (hosted and proxied modes; rules through the `policies` key, a controlled advisory through `advisories`; all three clients' transcripts on both R generations) |
| AC11 | conformance + integration | `conformance/cran/proxied_test.go` (a `write_PACKAGES` stand-in with `SHA256sum`, `MD5sum`-only and digest-less trees, and a `.gz`-less variant; all three clients on both R generations; network-level assertion from fresh caches; served records compared with the stand-in's); `internal/format/cran/proxied_verify_test.go` (digest priority, completion-only mode, the digest index from a revalidated index) |
| AC12 | conformance | `conformance/cran/proxied_ttl_test.go` (mutating stand-in serving `ETag`; upstream `304` and `curl` `304` at the network layer; visibility on every client after the TTL from a fresh session; `Meta/` pass-through) |
| AC13 | benchmark + conformance | `internal/format/cran/scale_bench_test.go` (regeneration over the recorded `cloud.r-project.org` index, peak RSS and time against the gate thresholds); `conformance/cran/scale_test.go` (the recorded index behind a stand-in; every client resolves; `Range`; warm zero-request run) |
| AC14 | conformance + integration | `conformance/cran/proxied_archive_test.go` (stand-in mutated between runs; installs on both R generations with a pre-mutation session cache, `renv::install` at the archive path; pak's probe answered `200`; missing-version and absent-binary-tree cases; throttling stand-in responses); `internal/format/cran/negative_cache_test.go` (both-paths-tried rule, the not-negatively-cached current-path miss) |
| AC15 | integration | `internal/format/cran/removal_test.go` (stand-in presenting each event class; the shared-layer half is `proxy-cache.md` AC13's; the advisory-feed refusal with a network-level no-fetch assertion) |
| AC16 | integration + conformance | `internal/format/cran/proxied_integrity_test.go` (corrupt file, truncated body; CAS and reference assertions; operator record); `conformance/cran/integrity_test.go` (the hosted corrupt-tarball control on all three clients with each captured extraction message, the transcript asserted free of any digest comparison) |
| AC17 | integration + conformance | `internal/format/cran/virtual_merge_test.go` (merge rules per tree, first-member-wins with a higher second-member version, archive union); `conformance/cran/virtual_test.go` (a virtual repository over a local and a remote member; resolves on all three clients; digest assertion on the shadowed package; the archived-version install through the merge) |
| AC18 | conformance + integration | `conformance/cran/binary_trees_test.go` (Windows and macOS binaries built in the 4.5.1 image, published through the management endpoint in the `script`; `download.packages` on both R images with the tree path per generation asserted from the transcript; the Linux tree through `contriburl`); `internal/format/cran/tree_test.go` (tree grammar, `Built` rule, cross-tree refusals) |
| AC19 | conformance | `conformance/cran/generations_test.go` (transcript diff between the two R images; the `.rds`-less and `.gz`-less trees on all three clients; the non-`CRAN`-name pak run with its transcript asserted) |
| AC20 | integration | `internal/format/cran/upstream_config_test.go` (unparseable probe, `__linux__` refusal, virtual acceptance, `405` on remote writes, the adapter `User-Agent` asserted from a stand-in transcript) |
| AC21 | conformance | `conformance/cran/replay_test.go` |
| AC22 | conformance + unit | `conformance/cran/headers_test.go` (`curl` over index and file routes, `If-None-Match`); `internal/format/cran/etag_test.go` (stable across unrelated writes, changed by a repoint) |

The case set needs only keys already in the harness's closed `setup` vocabulary (its resolved
closed-vocabulary decision, was Q4): `repositories` with their visibility and type,
`credentials`, an `upstreams` stand-in (a fixture file server serving `write_PACKAGES` trees in
the variants AC11 and AC14 name, and the recorded `cloud.r-project.org` documents for AC13),
`state` for pre-published, pre-superseded and pre-deleted versions with their retirement set
carried verbatim in the metadata documents, and `policies` with `advisories` for AC10. One
obligation on the seed path is recorded rather than assumed: a `state` entry for a hosted CRAN
file is servable only once its tree's documents exist, so the seed path invokes the same index
service the write path does, the requirement `hex.md` and `conda.md` recorded applied here. The
issued credential reaches every client as the repository URL's userinfo. The runner-enforced
obligations, both modes and the unauthenticated, unauthorized and pattern-refusal cases in each,
apply from the sibling specs and are not restated per criterion here.

## Implementation Phases

### Phase 1: Hosted reads and the generated documents
- Waits on `docs/internal/plans/foundation/signing-service.md` reaching `planned` (Blocking
  preconditions)
- The format-first mount, the tree grammar with the empty index for every well-formed tree, the
  filename and version grammars with the canonical form, every index representation and both
  `Meta/` documents through the shared index service with byte-derived `ETag`s, conditional
  requests and `Range`, package files through the CAS at both coordinate paths, the challenge
  and scope mapping with the per-route addressed objects, and the `403` policy rendering

### Phase 2: Publish and management
- Waits on `docs/internal/plans/foundation/management-api.md` reaching `planned` (Blocking
  preconditions; AC3, AC4, AC18)
- Publish into a tree with the bounded spool, format and `DESCRIPTION` validation,
  server-computed digests, immutability with the idempotent and `409` cases, supersession into
  `Archive/` with `Meta/archive.rds`, the retirement set, delete a version and delete a
  package, the write-boundary declaration exercised end to end under concurrency

### Phase 3: Proxied path and virtual repositories
- Upstream validation with the `__linux__` refusal and the adapter `User-Agent`, index
  regeneration from the upstream's `PACKAGES.gz`, the digest index, digest-priority and
  completion-only stream-and-verify, `ETag` revalidation, the both-paths coordinate resolution,
  negative caching with the current-path exception, the removal table, `405` on remote writes,
  the virtual merge, and the CRAN-scale benchmark gate

### Phase 4: Corpus and gate
- Recording session across the named surface (after the harness redaction gate, extended to
  URL userinfo) against `cloud.r-project.org`, replay-match, the second R generation, pak and
  renv, the exception-list entries named in Design, the matrix rows for the deliberately
  unimplemented `Path` subdirectories, P3M's `__linux__` scheme and the `mac.cran.dev` source

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. The nine questions this draft raised were each written in the template's decision
shape and then adopted at their own recommendation under the owner's standing delegation of
2026-09-26, so the loop can continue; each is recorded below as adopted rather than decided,
folded through Scope, Design, the criteria and the Test Plan in the same pass, and reversible
by the owner at any time. `grep -rn "standing delegation"` is the owner's review queue.

### Resolved: what a publish does to the previous version (was Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a tree lists one
version per package, the highest in canonical order, and a publish that supersedes the listed
version moves the previous file's coordinate into `Archive/{package}/` in the same write, with
`Meta/archive.rds` regenerated; a publish older than the listed version lands in `Archive/`
directly (Scope; Design, "The publish path"; AC3, AC7).

The question: `write_PACKAGES` defaults to `latestOnly = TRUE` and CRAN archives superseded
versions; drat defaults to `latestOnly = FALSE` and lists every version side by side; a registry
must choose what its index says when a package has several versions.

**Recommendation:** A. Base R can install only a listed version and its `duplicates` filter
keeps the highest anyway, so listing every version buys base R nothing and makes the index grow
with history; pak and renv fetch older versions from `Archive/` by path and never from a
multi-version index; and CRAN's own shape is the one every mirror, corpus and client was built
against.

| Option | You get | It costs |
|---|---|---|
| **A. One listed version; supersession moves the previous into `Archive/`** | CRAN's shape; a bounded index; pak's and renv's archive lookups work; the `duplicates` filter is never exercised | A version published out of order lands unlisted, which the response says |
| **B. List every version (`latestOnly = FALSE`, drat's default)** | Every version visible in the index; no archive move | Base R still installs only the highest; the index grows with history; pak and renv still look in `Archive/`, which would then be empty |
| **C. Refuse a publish older than the listed version** | The index is always the newest | A backport or a patch release for an older line cannot be published at all |

**Why this is yours:** it decides what a hosted CRAN index promises about versions, which
consumers read as a contract.

Accepted cost: the supersession move inside the publish write, and the exception-list entries
for a coordinate answering at both paths.

### Resolved: where the index documents are produced (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: every representation of
every tree and both `Meta/` documents are produced by the shared index service inside the
triggering write, stored at the repository level, CAS-backed above the threshold, with the
handler holding no writer (Design, "Every hosted index document is a write-triggered document";
AC2, AC5; the Phase 1 precondition).

The question: `cargo.md` and `nuget.md` render their per-package documents on request;
`helm.md`, `maven.md`, `hex.md` and `conda.md` store write-triggered documents. A CRAN tree's
index is repository-wide, contended, read whole by every cold run, and served in three
representations, one of which is an R serialisation this registry must write.

**Recommendation:** A. A render on read of a 7 MB document per cold `install.packages` is
unserveable at CRAN-mirror scale, the three representations must be produced from one state at
one moment, the R serialisation writer belongs in one place, and the service is built at the
same step for this class.

| Option | You get | It costs |
|---|---|---|
| **A. The index service generates and stores every representation inside the write** | The representations agree by construction; the read path is a byte copy; one regeneration implementation with Maven, Helm, Debian, RPM, Hex and Conda | Phase 1 waits on that spec; a publish pays the regeneration of its tree; the service gains an R serialisation writer |
| **B. Render on request** | No stored documents | A 7 MB render per cold run on the proxied path, and no moment at which the representations are guaranteed to agree |
| **C. Store the DCF, derive the `.gz` and `.rds` on request** | Fewer stored bytes | A serialisation per request of the document every base R and renv run reads, on the hot path |

**Why this is yours:** it sequences this format behind a shared service and decides that a
tree-wide index is never rendered on a read.

Accepted cost: the precondition, and the requirement list on the index service including the
serialisation writer.

### Resolved: how the proxied index is served (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the proxied path
fetches the upstream's `PACKAGES.gz` (falling back to `PACKAGES`) as the one canonical document,
parses it, and has the index service generate and store the three served representations, the
`Meta/` documents passing through byte for byte (Design, "The proxied path"; AC11, AC12, AC13).

The question: `hex.md` and `conda.md` serve upstream documents byte for byte, one because they
are signed, the other because every representation is content-bound; a CRAN tree's three
representations are unsigned, fetched independently, and regenerated by the upstream at three
slightly different moments (captured: CRAN's `.rds` three seconds after its `PACKAGES`).

**Recommendation:** A. Three independently fetched documents can disagree across a
revalidation boundary and serve base R and pak two different trees; one canonical fetch and one
generator, shared with the hosted path, cannot, and the virtual merge needs parsed records
anyway; the `.gz` is the smallest representation every generator writes and the one pak already
reads.

| Option | You get | It costs |
|---|---|---|
| **A. Fetch the `.gz`, regenerate all three** | Representations agree by construction; one generator for both paths; the merge has records to merge | The served `.rds` and `.gz` bytes are ours, not the upstream's, on the exception list; a parse per revalidation |
| **B. Pass all three through as fetched** | Byte-faithful documents; no parser on the proxied path | Three moments of truth per tree, and a virtual merge that must parse anyway |
| **C. Fetch all three as one set under one revalidation** | Byte-faithful and consistent when the upstream is | Three fetches per revalidation, and consistency only as good as the upstream's own regeneration window |

**Why this is yours:** it trades replay fidelity for consistency on the document every client
resolves from.

Accepted cost: the exception-list entry and the streaming parser the scale gate bounds.

### Resolved: a coordinate resolves at both its paths (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: on both paths a
`{package}/{version}` coordinate is one artifact reachable at `src/contrib/` and at
`src/contrib/Archive/{package}/`, a proxied miss trying the current path first and the archive
path second whichever the client asked for, cached once and served at both (Design, "The
proxied path"; AC6, AC14).

The question: on CRAN a superseded version's URL changes while its bytes do not, base R caches
its index for an hour and cannot follow the move, and pak asks for both paths on every download;
a proxy that mirrors the upstream's `404`s faithfully fails the very client that trusted the
index it served.

**Recommendation:** A. The bytes at both paths are the same bytes bound to the same
coordinate, so serving them at both lies to nobody; it is what pak's downloader already assumes
by trying both; and it closes the hour-long window in which a just-superseded version is
listed by this registry's own served index and `404`s at the path that index implies.

| Option | You get | It costs |
|---|---|---|
| **A. Both paths resolve one coordinate; proxied misses try both upstream paths** | No `404` under a stale index; pak's probe succeeds; one cache entry per coordinate | Two exception-list entries (a current version at the archive path, a superseded one at the current path) and a second upstream request on a true miss |
| **B. Mirror the upstream's paths faithfully** | Byte-for-byte replay of the mirror's `404`s | A version superseded inside the client's index cache window fails to install, and pak's probe costs a negative-cache entry per package |

**Why this is yours:** it decides what a URL promises on this registry against what the mirror
promises, a product rule.

Accepted cost: the two exception-list entries and the second upstream request on a true miss.

### Resolved: binary trees, and an index for every well-formed tree (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: any tree in the grammar
(`src/contrib`, `bin/windows/contrib/{x.y}`, `bin/macosx/contrib/{x.y}`,
`bin/macosx/{build}/contrib/{x.y}`, `bin/linux/{x.y}-{distro}/contrib/{x.y}`) is a tree an
operator can publish into, each with its own generated index and its own file grammar, the
registry never synthesising a binary, and every well-formed tree path answering an index, empty
when it holds nothing (Design, "Trees, files and the index"; AC2, AC18).

The question: CRAN keeps binary trees per R minor version and per macOS build, Posit Package
Manager adds a Linux shape pak knows, base R warns on every install from a Windows or macOS
client when the tree its version computes is absent, and a registry must decide which trees
exist and what an absent one answers.

**Recommendation:** A. The client computes the path from its own version and platform and the
registry cannot know which R minors and builds its users run, so the grammar rather than a
closed list decides what is a tree; an empty index is what CRAN itself serves for a tree it
has just opened and it silences the warning a source-only repository would otherwise print on
every Windows and macOS install; and the R-minor segment is an opaque key, because a binary
built for one minor does not load in another.

| Option | You get | It costs |
|---|---|---|
| **A. Any tree in the grammar; empty index for an absent one** | Every client's computed path is answered; no warning on source-only repositories; the P3M Linux shape works for pak | An index generated per tree path requested, and a `404` on a package file the tree lacks rather than on the tree |
| **B. Only the trees the operator declares; `404` otherwise** | An explicit tree list | Every Windows and macOS install from a source-only repository prints the absent-index warning, and a new R minor needs an operator action before its tree answers |
| **C. Source tree only** | The smallest surface | Binary consumers cannot be served at all, which a private CRAN mirror exists to do |

**Why this is yours:** it sets what a hosted repository answers a client whose R version it has
never heard of.

Accepted cost: the empty-index exception-list entry, and the `Built` rule that keeps binaries
and sources in their own trees.

### Resolved: Posit Package Manager's `User-Agent`-negotiated binaries (was Q6)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: an upstream URL carrying
a `__linux__` segment is refused at configuration with a message naming the plain source path,
and every upstream request of this format carries the adapter's non-R `User-Agent`, so an
upstream that negotiates on it serves source; hosted Linux binaries live at the plain
`bin/linux/{x.y}-{distro}/contrib/{x.y}/` tree (Scope; Design, "The proxied path"; AC20).

The question: P3M serves three different objects at one tarball URL by `User-Agent` (captured:
a `4.5-noble` binary, a `4.3-noble` binary and the source), which the proxy layer's URL-keyed
cache and the CAS's coordinate-to-bytes rule cannot represent; and rocker images ship P3M's
`__linux__` URL as their default repository.

**Recommendation:** A. A cache that stored whichever variant its own fetch happened to receive
would serve a Linux binary to a macOS client or a source to a Linux one under the same
coordinate; keying the cache on the client's `User-Agent` would be a per-format exception to
the shared cache model on a header any client can forge; and the source path exists on P3M at
the same base without the segment.

| Option | You get | It costs |
|---|---|---|
| **A. Refuse `__linux__` upstreams; fetch as a non-R agent; plain Linux trees hosted** | One object per coordinate; the shared cache model untouched; Linux binaries still servable when published | Operators who cache P3M lose its Linux binaries and point the upstream at the plain source path |
| **B. Key the cache on the client's `User-Agent`** | P3M's Linux binaries cached per R minor and distro | A per-format cache key on a forgeable header, and a `File` with several blobs, which the shared model has no shape for |
| **C. Fetch as the requesting client's agent, cache nothing for `__linux__` upstreams** | P3M works through this registry | A proxy that is not a cache, which is the product's differentiator inverted |

**Why this is yours:** it refuses a documented upstream form, a compatibility promise.

Accepted cost: the configuration refusal and one documentation line for rocker users.

### Resolved: virtual repositories and the merge rule (was Q7)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: `virtual` CRAN
repositories are served, each tree's index merged by package with the first member in order
that holds the package winning whatever version the later members hold, `Meta/archive.rds` the
union, and files and archive paths resolved through the members in order (Scope; Design,
"Virtual repositories"; AC17, AC20).

The question: `hex.md` refused virtual repositories because its resources are signed under a
repository name; CRAN's are unsigned and nameless, so a merge is possible, and the merge rule is
a product choice: by version, as the client's `duplicates` filter would decide, or by member
order, as `data-model.md`'s resolution order says.

**Recommendation:** A. The use case is a private build in front of a CRAN mirror, and a merge
by highest version would let the mirror's next release un-shadow the private build silently;
member order is the one failover and precedence mechanism the shared model has, and
`conda.md`'s first-member-wins rule is the same choice for the same reason.

| Option | You get | It costs |
|---|---|---|
| **A. Serve virtual repositories; first member holding the package wins** | One URL over private and proxied content; a private build shadows the public one durably | A member's newer version is invisible while an earlier member holds the package; operators learn that precedence is order, not version |
| **B. Merge by highest version** | The newest version always wins, as the client's filter would choose | A private fork is un-shadowed by the upstream's next release without any action on the operator's side |
| **C. Refuse virtual repositories, as Hex does** | No merge code | Users configure two repositories and rely on `available.packages`'s own merge, which is by highest version and has the same un-shadowing hazard |

**Why this is yours:** it decides a precedence rule users will read as a promise, and it
commits the index service to a merge for one more format.

Accepted cost: the merge requirement on the index service and its re-run on member
revalidation.

### Resolved: `cloud.r-project.org` as a preconfigured upstream (was Q8)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: a CRAN mirror is
user-configured in v1 and not added to the preconfigured set; the trigger for revisiting is the
catalogue's Tier 2 verdict, through `proxy-cache.md`'s own extension mechanism (its resolved
preconfigured-set extension, was Q14), which left crates.io, pub.dev, repo.hex.pm, Packagist and
conda-forge on the same footing.

**Recommendation:** B, for sequencing rather than effort: CRAN is Tier 2 and built only if the
breadth gate says so, so amending a sibling's settled decision on its account now would be a
half-applied change against a format that may not be built.

| Option | You get | It costs |
|---|---|---|
| **A. Preconfigure a CRAN mirror now** | An R cache in thirty seconds | A sibling decision reopened from a Tier 2 spec before the gate that decides whether Tier 2 happens |
| **B. User-configured in v1, revisited on the Tier 2 verdict** | No sibling amendment; the adapter validation rule still ships | A worse first-run story than for npm until the revisit, and no nightly run against a real mirror |

**Why this is yours:** it amends a set you priced for three upstreams, a product and sequencing
call.

Accepted cost: the proxied cases run against a stand-in only; the real mirror is exercised by
the recording session and the scale benchmark's recorded documents, and nothing scheduled,
until the revisit.

### Resolved: the addressed object of a publish (was Q9)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the publish reports
`{package}/{canonical version}` from the coordinate the management operation declares, which
precedes the body, confirmed against the archive's `DESCRIPTION` after the body arrives with a
disagreement refused; an operation that declares no coordinate reports `none`, so only an
unpatterned `push` authorizes it (Design, "Addressed objects and pattern scopes"; AC9).

The question: there is no wire publish, so the management API's operation shape decides what
is known before the bytes; the archive's `DESCRIPTION` is the coordinate's source of truth, and
it sits inside a compressed tar or a zip whose reading is a spool.

**Recommendation:** A. It is `conda.md`'s filename-first rule applied to a declared
coordinate: the object is known before any byte is spooled, a lie cannot land under the pattern
it claimed because the mismatch is refused, and the undeclared case fails safe rather than
peeking, which for a `.tar.gz` is a full decompression anyway.

| Option | You get | It costs |
|---|---|---|
| **A. Object from the declared coordinate; confirmed against `DESCRIPTION`; `none` when undeclared** | Patterned `push` works when the operation declares; nothing unauthorized is spooled | A mislabelled publish is spooled to the bounded buffer before it is refused; a publish that declares nothing needs an unpatterned `push` |
| **B. Bounded peek into the archive for `DESCRIPTION`** | Authorization from the package's own metadata | A gzip tar has no index and a zip's directory sits at its end, so the peek is a spool anyway |
| **C. Report `none` for every publish** | No parsing before authorization | A patterned `push` never authorizes a publish, so per-package CI credentials are impossible here |

**Why this is yours:** it decides what a patterned CI credential can do on this format and
adopts a sibling's precedent for a security boundary.

Accepted cost: the bounded spool of a refused mislabelled publish, sized by the same constant
that bounds every publish, and the requirement on `management-api.md` that a publish may declare
its coordinate.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | 1a6daa5 | authoring pass: grounded first draft, not a review | Grounded the wire contract three ways: captured traffic from R 4.5.1 and R 4.3.3 (`available.packages`, `install.packages`, `download.packages` in every type, `old.packages`, `update.packages`), pak 0.11.1 with pkgcache 2.2.5.9000 and renv 1.1.5, in rocker/r-ver images pinned by digest, run in containers against a logging stub serving trees written by the real `tools::write_PACKAGES` (a source tree with an `Archive/`, a `latestOnly = FALSE` tree, a Windows binary tree, a `Meta/` directory in CRAN's shape), across four rounds (cold, warm-in-session and fresh-session installs with each client's index representation, headers and probe order; the `.rds`-less, `.gz`-less and index-less trees; a package hidden by the `R_version` filter; a two-version index under the `duplicates` filter; missing packages and repositories; Basic from URL userinfo, no credential and a wrong one; a policy-shaped `403`; a tarball corrupted mid-body; binary-tree paths for `win.binary`, `mac.binary` and `mac.binary.big-sur-arm64` on both generations and `type = "both"` on Linux; renv and pak version-pinned installs from `Archive/`, pak's `url::` form and its archive probe on every download; pak with the repository under a non-`CRAN` name and against a `__linux__`-shaped URL; pak's and renv's caches); the R Installation and Administration manual's repository section, the `write_PACKAGES` reference, and the `utils` sources in both images for the read side the manual leaves to the code; the pkgcache, pkgdepends and renv sources for the archive URL construction, the CRAN-name rule, the third-party metadata fetch, the P3M binary-index path and the Artifactory and Nexus layout detection; the OSV ecosystem table and API (the `CRAN` ecosystem exists and carries `RSEC-*` advisories); and the live cloud.r-project.org (sizes, headers, `304`, records, `Archive/` listings, `Meta/` shapes, the binary trees per R minor and macOS build) and p3m.dev (one URL, three objects by `User-Agent`). Design built from that: the tree grammar with binary trees keyed by R minor, build and distro and an empty index for every well-formed tree; the index as three representations including an R serialisation this registry must write; the shared model mapping with a tree-keyed record map and a retirement set; every document as a write-triggered document of the shared index service with a six-item requirement list; the management API as the only write path, supersession into `Archive/` inside the publish, `latestOnly` selection and the write-boundary declaration; the canonical version form under which `1.0-1` and `1.0.1` are one coordinate; URL-userinfo Basic on all three clients with pak's `401` retry; the addressed-object table with the consequence that a patterned `pull` cannot resolve; the `403` rendering on three clients; the digests no client verifies and the OSV finding that CRAN is covered; the proxied path with the index regenerated from the upstream's `PACKAGES.gz`, both-path coordinate resolution, negative caching with the current-path exception, the `__linux__` refusal and CRAN's rows of the removal table; and virtual repositories merged by member order, against Hex's refusal. Nine questions written in decision shape and adopted under the standing delegation: supersession into `Archive/` (AC3, AC7), generation by the index service (AC2, AC5), the proxied index regenerated from the `.gz` (AC11 to AC13), both coordinate paths (AC6, AC14), any tree in the grammar with an empty index (AC2, AC18), P3M refused (AC20), virtual repositories first-member-wins (AC17), no preconfigured mirror, and the declared-coordinate publish object (AC9). Twenty-two criteria, each with a Test Plan row. Sibling consequences recorded in the authoring report, not applied here: `auth.md` client-table rows for `R`, `pak` and `renv`; the `management-api.md` operations including a publish that declares its coordinate and tree; the `signing-service.md` requirement list including the R serialisation writer; the `upstream-adapters.md` fixed non-R `User-Agent`; the `proxy-cache.md` completion-only mode (already requested by four siblings) and CRAN's rows in its removal table; the `conformance-harness.md` seed path invoking the index service, the URL-userinfo redaction rule and the pak third-party-hostname binding; the reason-phrase finding for `supply-chain-policy.md` and the confirmation that OSV covers CRAN; and a CRAN row in the management-surfaces analysis. Stays draft; awaits an independent review. |
