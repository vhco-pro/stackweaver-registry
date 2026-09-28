---
status: draft
status_description: "Format closing sweep 2026-09-28 at a3a9d78 on Opus (not a review): DATA-LOSS AUDIT: the proxied digest index was held only by being named in the remote's document; it is now declared on the remote's repository-level blob-digest list with a retained count of zero, archive-only coordinates verified in the completion-only mode with the DESCRIPTION verifier rather than against a superseded map, package files on their own cached references, and every remote index, Meta/ document and the map outside the quota in cache_metadata_bytes (proxy-cache was-Q19, Q21, Q22; new AC24; AC11 extended); the merging profile declares member-input paths ({tree}/PACKAGES.gz as a template over src/contrib and the trees other members hold, and src/contrib/Meta/archive.rds; the template is signing-service's owed change), remote adoption re-merges and a virtual-only remote is revalidated by the virtual's reads (signing-service was-Q16, AC35; proxy-cache AC26), the virtual's Last-Modified moves forward at each merge commit (was-Q15, AC34), and unsigned remote documents contribute with no verdict, AC36 governing signed bodies (AC17 extended); package files through ServeFile (was-Q14) and Cache-Control per format with no repository override (was-Q18, AC30; AC22 extended); the identical republish is management-api's declared unchanged publish (was-Q15) and the retired claim is checked at declaration and again at commit (was-Q14; AC4 extended); numeric_version cited as vendored (supply-chain AC17); the hosted read half recorded against a pinned write_PACKAGES tree and no write corpus, two exception-list rows reported for conformance-harness (AC21). No question adopted; fable_recheck added for three folded judgements; 24 criteria. Earlier: Reconciled 2026-09-28 at fe2a39f with the foundation wave on Opus (not a review), this spec's first reconciliation: every tree's three index representations and both Meta documents are this format's Indexer generator output (internal/format/cran/index, holding the R serialisation writer and latestOnly) under signing-service's write-path runtime as an unsigned consumer with no key, dispatched at the pre-commit hook, stored in snapshot content and served through ServeDocument with Last-Modified from the pointer's moved_at (AC2, AC5, AC22); the virtual merge is the index.merge job and the proxied index FromUpstream under proxy-cache's cache-scoped Last-Modified (AC12, AC17); publish, delete-file (per tree, now retiring the version coordinate rather than management-api's unplace), delete-version and delete-package on management-api with core-held Retirement records refused centrally as retired, validation and conflict problem types, 405 repository-type (AC3, AC4); digest-less binary trees through proxy-cache's completion-only mode with a DESCRIPTION verifier (AC11); the P3M and PACKAGES checks moved from configuration to the first request per upstream-adapters AC23, the non-R agent being that spec's default User-Agent (AC20); refusals through WriteRefusal with the status-line phrase R and pak print, the capture filling CRAN's pending binding row (AC10); storage-and-gc's read-path verification as the only integrity check CRAN clients get (AC16); removal rows named by proxy-cache event class; pak's public-host stand-ins under the harness's client confinement; Capabilities and the rename case (AC23). Earlier: authored 2026-09-26 from captures of R 4.5.1 and 4.3.3, pak 0.11.1 and renv 1.1.5; nine questions adopted under the standing delegation; none open. Awaits a /spec review pass."
description: "Spec for the CRAN (R) repository format: the per-tree PACKAGES index in its plain, gzip and rds representations, the source tree with its Archive/ directory of superseded versions, binary trees keyed by operating system, build and R minor version, publishing and deletion through the registry-owned management API because the ecosystem has no publish protocol, hosted and proxied, with base R, pak and renv as the conformance oracles."
author: michielvha
goal: "Serve R teams a private CRAN-like repository whose index is regenerated in every representation by the shared index service on every publish, whose superseded versions move into Archive/ exactly as CRAN's do so that pak and renv find them, and a CRAN cache whose superseded coordinates never 404 under a client's hour-old index."
priority: "medium"
issue: 26
created: 2026-09-26
covers:
  - "internal/format/cran/**"
  - "conformance/cran/**"
fable_recheck: "the format closing sweep on Opus 2026-09-28 folded three design judgements without a question, which need a Fable recheck: the member-input tree template expanded over the trees the virtual's other members hold; the digest index's retained count of zero, with every archive-only coordinate verified in the completion-only mode by the DESCRIPTION verifier instead of against a retained map; and the hosted read half of the corpus recorded against a pinned write_PACKAGES tree instead of against this registry"
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
a hosted tree serves is a write-triggered generated document produced by the write-path runtime of
`docs/internal/plans/foundation/signing-service.md` through this format's `Indexer` and its
generator package `internal/format/cran/index` ("The generator contract, and where a generator
lives"), which the charter builds at step 7 as the production form of what the step 4a
prototype learned (`write-triggered-services-prototype.md`); this format is one of that spec's
unsigned consumers (its consumer table and AC24). How this format's requirements map onto the
contract is stated in Design ("What the signing and index service provides"); nothing is asked
of the signing half, because nothing on this wire is signed (Scope). A CRAN handler without it
can serve no tree at all, so Phase 1 waits on that spec's Phase 1 (the runtime and the unsigned
consumer), and the virtual and proxied halves of Phase 3 on its Phase 4.

**The management API must be `planned` before Phase 2, and it is the only hosted write path.**
Publishing a file into a tree, deleting a file from one tree, deleting a version and deleting a
package are the `publish`, `delete-file`, `delete-version` and `delete-package` kinds of
`docs/internal/plans/foundation/management-api.md` (its operation vocabulary and cross-format
reconciliation table); nothing on the CRAN wire writes (Design, "The publish path"). Phase 1's
hosted reads are testable without it, because the harness's `state` vocabulary seeds versions
through the shared write path (`conformance-harness.md`, "The `setup` vocabulary"); AC3, AC4 and
AC18 are untestable until that surface exists.

**The completion-only fetch mode this format needs is offered.** A proxied file from a tree
whose index carries no digest (CRAN's Windows tree, and any `write_PACKAGES` binary tree) has
nothing to verify against by digest; `proxy-cache.md`'s resolved completion-only decision (was
Q15, its AC20) gives the fetch-and-cache request a handler-supplied verifier in place of a
declared digest, which this format supplies (Design, "The proxied path"). A virtual
repository's merged index runs as the `index.merge` job on `async-operations.md`'s queue
(`signing-service.md` AC19), whose core the charter builds at the start of step 4b, well before
this Tier 2 format.

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
  `Meta/archive.rds`, every one a generated, unsigned, write-triggered document produced by this
  format's generator package under `signing-service.md`'s generator contract, regenerated inside
  the write, stored, CAS-backed above the inline threshold and served through its
  `ServeDocument`, including the R serialisation writer the generator package holds.
- Supersession as CRAN performs it: one listed version per package per tree, the superseded
  file's coordinate moving into `Archive/{package}/` in the same write, `Meta/` regenerated
  with it, and every coordinate resolvable at both its current and its archive path on both
  paths (the resolved supersession and archive-resolution decisions below).
- The hosted write path through the registry-owned management API: publish a file into a tree,
  delete a version from one tree or from every tree, delete a package; ingest validation
  against the archive's own `DESCRIPTION`; server-computed digests; immutability and the
  core-held retirement set; the write-boundary declaration `data-model.md` requires.
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
  Posit Package Manager's `User-Agent`-negotiated binary URLs at the first request, and CRAN's
  rows of the upstream-removal table.
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
  refused at its first request, before any upstream request, naming the plain source path (the
  resolved P3M decision below).
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
  The package-level document holds nothing format-specific; `latest` is derived from the
  version rows by `numeric_version` order, never stored. The **retirement set** (every
  `{package}/{canonical version}` coordinate this repository ever deleted, never
  republishable) is not in any document: it is the core-held `Retirement` record
  (`data-model.md` AC35; `management-api.md`, "Retirement is core-held"), written in the
  deleting operation's transaction, outside snapshot content, and refused centrally.
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
- The repository-level document holds the tree list, and the generated documents per tree and
  the two `Meta/` documents are named members of it, the generator's output at level
  `repository` (`signing-service.md`, "Storage: bodies in the snapshot"), inline below the
  threshold and a CAS blob above it; a `remote` repository's current documents are the
  generator's `FromUpstream` output and the two `Meta/` documents passed through, and the
  digest index the proxied path builds from the upstream's records is held on the remote's
  repository-level document's declared blob-digest list, never by mention (Design, "The proxied
  path").

### Every hosted index document is a write-triggered document

Per the resolved generation decision below, every representation of every tree and the two
`Meta/` documents are produced inside the write that changes them, **stored, never rendered on
request**: `signing-service.md`'s write-path runtime runs at the write transaction's pre-commit
hook on every write to a repository whose handler declares an `Indexer`, calls this format's
generator for the document keys the change invalidates, and stores the output as members of the
repository-level document in the same snapshot, CAS-backed above the threshold and protected by
the fourth GC mark root ("The write path dispatches; the handler cannot forget", its AC1 and AC5;
`storage-and-gc.md` AC16). The handler never requests regeneration, so no write path can forget
it. Rendering on request was rejected because a CRAN-mirror index is a 7 MB document fetched
whole by every cold `install.packages`, because three representations rendered at three moments
can disagree, and because a tree is a repository-wide document under exactly the concurrency
`maven.md` captured on its metadata.

The rules the generator and the runtime apply for this format:

- **Regeneration inside the write.** A file landing in a tree invalidates that tree's three
  representations; a file landing in the source tree also invalidates `Meta/current.rds`, and,
  when the publish supersedes a version, `Meta/archive.rds`; a deletion invalidates the trees it
  touched and both `Meta/` documents. The generator's `Affects` names exactly those keys, so a
  tree the write did not touch keeps its bytes, digest and `ETag` (`signing-service.md` AC4).
  Each lands in the same completed logical write and the same snapshot as the change that
  triggered it, so no snapshot serves a `.rds` that disagrees with its `.gz` or an index that
  lists a file the snapshot does not hold (`data-model.md`'s one-write-one-snapshot rule; the
  prototype's question 3).
- **Under contention, both land.** Two concurrent publishes into one tree queue on the runtime's
  per-document lock, and the revision-token retry `data-model.md` makes mandatory covers what the
  lock does not, so each produces its own snapshot whose index lists every file that snapshot
  holds (`signing-service.md`, "Contention", AC3 and AC28).
- **One listed version per package per tree.** The index lists, for each package, the file of
  its highest canonical version in that tree, exactly what `write_PACKAGES(latestOnly = TRUE)`
  emits; every other file of the package in the source tree is archived (below) and absent from
  the index. The `duplicates` filter therefore never sees a duplicate on this registry. The
  selection is format knowledge and lives in the generator package, as `signing-service.md` names
  CRAN's `latestOnly` there.
- **The record is the archive's `DESCRIPTION`, reduced to the field set.** Fields are taken
  from the file at ingest, never from the operation's request; `MD5sum` and `SHA256sum` are the
  registry's; `NeedsCompilation` is the `DESCRIPTION`'s.
- **Byte-stable text, served by the shared helper.** The DCF is written in package order with
  the wrapping `write.dcf` applies, and the generator is deterministic (`signing-service.md`
  AC25), so an unchanged tree yields byte-identical documents across regenerations and the
  byte-derived `ETag` is shared across snapshots that did not change it. Every index document is
  served through `index.ServeDocument` (`signing-service.md` AC11): its `Last-Modified` is the
  serving pointer's forward-moving `moved_at` from the transition that last changed the
  document's bytes (`data-model.md` AC36), a conditional request is `304` only on an exact
  `If-Modified-Since` or a matching `ETag`, and the handler sets none of those headers itself.
  `Accept-Ranges: bytes` and `Cache-Control: max-age=1800` (CRAN's own value) travel in the
  generator's profile, one value for every CRAN repository: `signing-service.md` declined a
  per-repository override (its resolved `Cache-Control` decision, was Q18, AC30), so an operator
  wanting another `max-age` sets it in a reverse proxy. Every package file, at its current and
  its archive path, is served through `ServeFile` (`signing-service.md`'s resolved
  handler-rendered decision, was Q14, AC32), whose serve policy is a package-level constant of
  this handler carrying `Cache-Control: public, max-age=31536000, immutable` and range support,
  because a coordinate binds its bytes for the life of the repository; the strong `ETag` is the
  CAS digest, and the handler sets no validator on a file either.
- **A repoint restores the documents.** Because the documents live in snapshot content, a
  rollback serves exactly the index of the snapshot it targets, under a `Last-Modified` that
  moves forward rather than back; the retirement set is untouched by the repoint because it is
  core-held and not snapshot content (`management-api.md`, "Retirement is core-held";
  `data-model.md` AC35).
- **Virtual repositories merge** (the resolved virtual-repository decision below): a `virtual`
  repository's index for a tree lists, per package, the record of the first member in order
  that holds the package in that tree, whatever version the later members hold; its
  `Meta/archive.rds` is the union by package with the first member's entries first; a package
  file or archive path resolves through the members in order. The merge is the generator's
  `Merge`, run by the runtime as the deferred, coalesced `index.merge` job, enqueued by a member's
  write and by a remote member's adoption, with the member-input paths the profile declares
  (Design, "Virtual repositories").

### What the signing and index service provides

The six requirements this format first placed on `signing-service.md`, each now mapped onto its
generator contract and criteria:

1. **Unsigned generation of a tree's index** is the generator's `Generate` over the
   version-level records of every file current in that tree: the DCF text in `write.dcf`'s
   wrapping and package order, its gzip form, and the xz-compressed R serialisation of the same
   records as a character matrix with `dimnames`, exactly as `saveRDS` writes one; plus the
   source tree's `Meta/current.rds` and `Meta/archive.rds` in the `file.info` data-frame shapes
   CRAN serves, a CRAN-scale document written through the contract's streaming writer rather than
   buffered whole. The R serialisation writer lives in `internal/format/cran/index`, the one
   novel obligation no sibling needs, and its proof is a real `readRDS` (AC2). The profile
   declares no signing profile, so the service creates no key for a CRAN repository and no
   `Signature` record (its AC24).
2. **`latestOnly` selection at generation** over the canonical version order is generator code,
   with the superseded files' archive placement carried in the records the handler stores.
3. **Regeneration inside the triggering write** is the pre-commit-hook dispatch (its AC1) with
   the per-document lock and retry (its AC28) and the incremental `Affects` (its AC4).
4. **Storage as CAS-backed metadata above the inline threshold** is its "Storage" section (its
   AC5), so a CRAN-sized proxied index (AC13) is a set of blobs the fourth mark root protects and
   a stream copy serves.
5. **The virtual merge** is the generator's `Merge`, run as the `index.merge` job: enqueued by a
   member's write and coalesced within the merge window, the first merge enqueued at the
   virtual's creation, the previous merged set serving until the new one commits, a failure
   leaving the previous set and an alert (its "Virtual merges" and AC19). A remote member
   adopting a new upstream revision is cache materialisation, not a write, and it re-merges
   through the runtime's adoption hook, inside the adoption transaction
   (`signing-service.md`'s resolved remote-member decision, was Q16, AC35; `proxy-cache.md`
   AC25); a remote reached only through the virtual is revalidated by the virtual's reads
   (`proxy-cache.md` AC26); and each merge commit moves the virtual's freshness forward
   (`signing-service.md`'s resolved virtual-freshness decision, was Q15, AC34). The profile
   declares the member-input paths each merge input is read from (Design, "Virtual
   repositories").
6. **The same generation on the proxied path** is the generator's `FromUpstream` over records
   parsed out of an upstream's `PACKAGES.gz` (the resolved proxied-index decision below), stored
   unsigned as the remote's current document (its AC20), so hosted and proxied trees share one
   generator and one representation set.

Nothing is asked of the service's signing half and nothing of `artifact-verification.md`: CRAN
trees sign nothing.

### The publish path and what counts as a write

Nothing on the CRAN wire writes, so the hosted path is fed by the registry-owned management API,
`docs/internal/plans/foundation/management-api.md`. Per the cross-format precedent (`pypi.md`'s
resolved hosted-yank decision, with `npm.md`, `ansible-collections.md`, `cargo.md`, `nuget.md`,
`maven.md`, `hex.md`, `composer.md` and `conda.md`), each operation is one completed logical
write through the shared write path (`management-api.md`, "Every operation is one completed
logical write", its AC5), authorised in the settled `(repository, action)` vocabulary with no new
action, hosted only, its trigger verified by this registry's integration tests and its effect by
the real clients. The handler implements the `Operator` interface and declares these kinds, each
from `management-api.md`'s closed vocabulary, with no binding (no CRAN client drives any of them):

| Operation | Kind | What the operation carries | Effect a client sees | Action |
|---|---|---|---|---|
| Publish a file into a tree | `publish` | Committed digests and a declared coordinate: the tree path, and the package and canonical version when the publisher names them; the handler peeks the committed archive (`.tar.gz`, `.zip` or `.tgz` by tree) for `{package}/DESCRIPTION` and takes `Package` and `Version` from it, refusing a declaration or filename that disagrees after canonicalisation | The file appears in the tree's index in all three representations; a real `install.packages`, `pak::pkg_install` and `renv::install` resolve and install it from a fresh cache; when it supersedes the tree's listed version of the package, that version leaves the index and (source tree) its file becomes reachable at `Archive/{package}/`; when it is older than the listed version it goes straight to `Archive/` and the index is unchanged (the resolved supersession decision below) | `push` |
| Delete a version from one tree | `delete-file` | Package, canonical version and the tree | The version's file leaves that tree, the tree's index lists the package's next-highest version current or archived there, `Meta/` follows, its paths in that tree answer `404`, the version's files in other trees keep serving, and the coordinate `{package}/{canonical version}` is retired | `delete` |
| Delete a version | `delete-version` | Package and canonical version | Its files leave every tree, each index lists the next-highest version of the package if one is current-or-archived in that tree, `Meta/` follows, its paths answer `404`, and the coordinate is retired | `delete` |
| Delete a package | `delete-package` | Package | Every version's files leave every tree, the index omits the package, every coordinate is retired, and the `Package` row survives (`data-model.md`, "A package outlives its versions", AC33) | `delete` |

The per-tree deletion is `delete-file`, not the `unplace` kind `management-api.md`'s
reconciliation table first placed it on: `unplace` retires nothing, and a CRAN tree's file is
its own bytes (a source tarball, a Windows zip and a macOS gzip tar of one version are three
files), so an unretired removal would let different bytes be republished at a path this registry
serves as `immutable`. Granularity is the handler's (`management-api.md`, "Retirement is
core-held"): every retiring kind here returns the coordinate `{package}/{canonical version}` in
its `Outcome`, so a version deleted from one tree is never republished into any tree, which is
the rule this spec adopted before the core held the set. `management-api.md`'s reconciliation
table now carries the correction (its CRAN rows and the `delete-file` kind row naming CRAN's
one-tree deletion; `unplace` no longer names CRAN).

What this registry enforces on ingest:

- The bytes arrive through `management-api.md`'s upload sessions or its multipart convenience
  form, bounded by the configured spool limit, and are committed to the CAS with their digest
  computed in the stream ("Publish through the API", its AC14 and AC15); the handler's `Apply`
  then parses the committed blob as the format its tree names: a gzip tar for `.tar.gz` (source,
  or a Linux binary carrying `Built`), a zip for `.zip`, a gzip tar for `.tgz`. A body that is not
  its named format, that lacks a `DESCRIPTION` at the package root, or whose `DESCRIPTION` lacks
  `Package` or `Version` or carries a value outside the grammars below, is refused `validation`
  (422) and nothing is referenced; a binary archive whose `DESCRIPTION` carries no `Built` field,
  or a source tarball whose `DESCRIPTION` carries one, is refused the same way, so a binary cannot
  land in the source tree. The committed but unreferenced blob a refusal leaves is the orphan
  `storage-and-gc.md` AC3 collects (`management-api.md` AC13).
- `MD5sum`, `SHA256sum` and size are computed from the committed bytes; nothing client-supplied
  is trusted for integrity.
- **A coordinate that already exists in the tree with identical bytes is idempotent** (no
  snapshot: the CI retry); **with different bytes it is refused `conflict` (409)**. The
  ecosystem's own convention is that a rebuild bumps the version (CRAN never accepts the same
  version twice), and every `renv.lock` pins the version. The identical republish is
  `management-api.md`'s declared unchanged publish (its resolved unchanged-publish decision,
  was Q15, AC5): this handler declares it, and the operation completes with `unchanged: true`
  and no snapshot reference, so no pointer or freshness record moves.
- **A retired coordinate is refused centrally**, with the same bytes or different ones, in every
  tree: the shared write path answers `retired` (409) naming the coordinate for the life of the
  repository, including after every snapshot that held it is pruned and across a backwards
  repoint (`management-api.md` AC12), so the handler carries no set forward. The publish
  declares the coordinate it claims, `{package}/{canonical version}`, and the core checks it
  when it is declared and again at commit, serialised with any retiring write on the repository
  head, so a deletion committing between the two cannot let the publish land
  (`management-api.md`'s resolved retirement-check decision, was Q14; `storage-and-gc.md` AC30).
- The response is `201` with a completed `Operation` whose result document the handler writes:
  the tree, the stored path, the record's `SHA256sum`, the supersession it performed (which
  version moved to the archive, if any) and the snapshot; any operation against a `remote` or
  `virtual` repository answers `405` with problem type `repository-type` before authorization
  (`management-api.md` AC7).

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
  `data-model.md`'s bulk-operation rule; its `Retirement` records are written in the same
  transaction (`data-model.md` AC35).
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
  credential, the universal Basic-password row of its "Presentation forms" table (its AC31),
  under which URL userinfo arrives. The harness writes the issued token into the repository URL
  as userinfo (`http://__token__:{token}@host/cran/{repository}`) for all three clients, and
  nothing new is asked of the `setup` vocabulary. `auth.md`'s client table carries the `R` /
  `renv` / `pak` row this spec's captures grounded.
- **The challenge is uniform and not an existence oracle.** A credential-less request under a
  repository that is not anonymously readable answers `401` with `WWW-Authenticate: Basic
  realm="..."`, byte-identical for a private, a missing and someone else's repository, the
  mechanism every sibling uses and the one pak's userinfo retry depends on (`auth.md`, "A
  credential-less request is challenged, and the challenge is uniform", which names pak among
  the clients that send nothing until challenged); a request carrying
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
| Publish (management API, `publish`) | named | `{package}/{canonical version}` from the operation's declared coordinate when it names one, confirmed against the archive's `DESCRIPTION` in `Apply`, a disagreement refused `validation`; none when the operation names no coordinate, in which case only an unpatterned `push` authorizes it (the resolved publish-object decision below, which `management-api.md` generalised to every format in "Publish through the API" and its AC13) |
| Delete a version from one tree or from every tree (management API, `delete-file`, `delete-version`) | named | `{package}/{canonical version}` |
| Delete a package (management API, `delete-package`) | named | `{package}` |
| A directory URL, `Archive/`, `Archive/{package}/` | none | - (answers `404` in any case) |

What that gives and costs, applying `auth.md`'s rules rather than re-deciding them. **A
patterned `pull` cannot resolve on this format**: every client reads a tree-wide index first,
and the index reports `none`, which a patterned scope never authorizes, so a real
`install.packages`, `pak::pkg_install` or `renv::install` under a token patterned `acme*/**`
fails at the index with the client's absent-index rendering, while `curl` of an in-pattern
tarball under the same token succeeds and an out-of-pattern one is refused; the same consequence
`conda.md` and `composer.md` record. No CRAN index is a descriptor in `auth.md`'s sense (its
resolved name-free-document decision, was Q23): every representation and both `Meta/` documents
name every package the tree holds, so they fail the sentinel test and stay none, as Helm's
`index.yaml` does. AC9 asserts that rather than leaving it implied, and the operator
documentation states that a CRAN credential that must resolve holds an unpatterned `pull`. **A
patterned `push` publishes** through the management API when the operation
declares its coordinate, because the registry confirms it against the archive's own
`DESCRIPTION`, so per-package CI publish credentials are expressible on this format even though
per-package read credentials are not.

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines, on a
package-file or archive route of either path, the handler answers `403` with a `text/plain`
body naming the policy and rule, or naming the signal for a coordinate condemned under the
shared security-signal rule, written through `WriteRefusal`, the refusal writer
`format-handler-interface.md` places in `Deps`' package (its AC14). `403` rather than the
existence rule's `404`, because the caller is authorized and the content is what is refused. On
an HTTP/1.1 connection the writer puts the condition in the status line's reason phrase,
`HTTP/1.1 403 Refused by policy: {condition}` (`supply-chain-policy.md`'s resolved
refusal-status-line decision, was Q10, its AC18), and `deployment.md` keeps the main listener on
HTTP/1.1 by default for exactly this. The refusal bites at the file download, after the client
has resolved from an index that still lists the record (the resolved index-elision decision
below, `conda.md`'s precedent), so every client fails after resolution: base R prints "cannot
open URL '{url}': HTTP status was '403 Forbidden'" and "download of package '{package}' failed",
pak "Failed to download {package} from `{url}` and `{archive url}`" (both paths refused alike,
captured), renv "error downloading '{url}' [cannot open URL '{url}']" with no status at all. The
body reaches nobody through the pinned clients, so it is for `curl` and the transcript: this is
the reason-phrase finding `supply-chain-policy.md` records for R, pak and renv ("Rendering a
refusal"), and the phrase is the one place a condition can reach a base R or pak user, since
both print the status line; renv prints no status, so nothing reaches its user.

Whether the phrase does reach the user, and whether a client falls back to another repository
when refused, is what AC10's case captures, and that capture fills CRAN's `pending` row of
`supply-chain-policy.md`'s "When a refusal binds, per format" table in the same change (its
AC20; the harness refuses a policy case while the row is `pending`, `conformance-harness.md`
AC26). One fallback route is already known and goes into that capture: pak, for a repository not
named `CRAN` in `options(repos)`, adds `https://cran.r-project.org` to its own resolution set
(Design, "The wire surface"), so the recipe names the repository `CRAN` and the row cannot be
better than `client-setting` for pak.

### Integrity, signing and provenance

Every source record carries `MD5sum` (`write_PACKAGES` writes it; CRAN serves it), CRAN's macOS
tree adds `SHA256sum`, and its Windows tree carries neither; **no pinned client verifies
either** (a byte flipped mid-body was downloaded by all three and failed only at extraction),
so on the hosted path the digests are documentation for `curl` users and the lock-file tools
that read the index, and on the proxied path they are what this registry verifies against
before commit. This registry emits both for every tree, computed from the stored bytes, which
is more than `write_PACKAGES` emits for a binary tree and goes on the exception list. Because no
client verifies, the registry's own read path is the only integrity check a CRAN user gets:
`storage-and-gc.md` verifies every blob's digest while streaming it out and aborts with an
operator alert on a mismatch (its AC21), so bytes altered in storage reach a CRAN client as an
aborted download it reports as a failure, never as a tarball it extracts (AC16). Nothing on
this wire is signed: CRAN signs no tree and no package, and the ecosystem has no artifact
signature or attestation convention a client checks.

What CRAN asks of the shared services is therefore nothing beyond generation:
`artifact-verification.md` lists CRAN among its "Formats with nothing to verify", answering
absent for every digest, and the conformance matrix carries `none` in CRAN's verification column
with this spec cited (its AC24); `signing-service.md` gives the unsigned generation above and
creates no key (its AC24).

Advisory matching for CRAN coordinates is the policy engine's coordinate-level path: unlike
Conda, whose ecosystem OSV does not define (`conda.md`'s finding), **OSV defines the `CRAN`
ecosystem** (read 2026-09-26; `Bioconductor` beside it) and serves advisories under it, the R
Consortium's `RSEC-*` series with `pkg:cran/{package}` PURLs (captured: `readxl`, `jsonlite`,
`commonmark`), so the feed condemns a CRAN coordinate by name with no handler cooperation and
`supply-chain-policy.md`'s advisory-dependent rules bind on this format; its coverage table
carries the row (covered, keyed on package name and canonical version, its AC17). The version
ordering the matcher needs is R's `numeric_version`, which is in that spec's vendored set
(components split on `.` or `-` and compared as integers, so `1.0-1` equals `1.0.1`), so a
range-based advisory binds CRAN versions under the same order this registry's canonical form
uses (its AC17, whose ordering test carries `numeric_version` cases). Byte-level cataloguing of a
source tarball or an installed-package archive is the cataloguer's business; whether the library
selected at that spec's Phase 1 emits `pkg:cran/` PURLs is checked there.

### The proxied path

The handler owns the request and classifies for the proxy layer's fetch-and-cache API per the
settled decisions in `proxy-cache.md`; the upstream is a repository base URL (a CRAN mirror, a
Bioconductor release repository, a private `write_PACKAGES` tree behind any file server) on
`upstream-adapters.md`'s `https` adapter, validated at creation and `PATCH` by that spec's adapter
rules alone: an unreachable but well-formed upstream is accepted and no format probe runs inside
the creation transaction (its AC23, the finding `cargo.md` answered in its resolved sparse-only
decision, was Q7 there). What this spec first checked at configuration is therefore checked at
the first request that needs the upstream: an upstream whose `src/contrib/PACKAGES.gz`, and
failing that `src/contrib/PACKAGES`, does not parse as DCF with a `Package` field in its first
record answers `502` with a `text/plain` body naming the requirement (AC20). An upstream URL
carrying a `__linux__` segment is answered the same way, naming the plain source path, before
any upstream request is made (the resolved P3M decision below). The adapter presents its fixed
`User-Agent`, `stackweaver-registry/<version> (+<server.public_url>)` (`upstream-adapters.md`
AC5), which is not an R agent, so an upstream that negotiates on it serves source; the handler
never sets the `User-Agent` override `upstream.Options` offers, which is all this format asked of
that spec. An upstream credential, where a private tree needs one, is the adapter's own,
presented to the root host only (its AC6), and the client's credential is never forwarded.

- **The index of every tree is mutable metadata with a TTL**, but it is not served byte for
  byte (the resolved proxied-index decision below): at each revalidation the registry fetches
  the upstream's `PACKAGES.gz` (falling back to `PACKAGES`, the two documents every generator
  writes and pak reads), parses the DCF into records, and hands them to the generator's
  `FromUpstream`, which produces the three served representations and stores them, unsigned, as
  the remote's current documents (`signing-service.md`, "The proxied path", its AC20). A CRAN
  mirror serves `ETag`, `Last-Modified` and `max-age=1800` and answers `304` to `If-None-Match`
  (captured), so revalidation uses the entity tag and an unchanged 1.9 MB `.gz` costs a `304`
  upstream; a private tree without an `ETag` is refetched whole at the TTL. The served documents
  carry the cache-scoped freshness record, never the upstream's dates: `Last-Modified` is the
  remote's forward-moving `adopted_at`, and a revalidation returning an index older than the
  adopted one by upstream `Last-Modified` is not adopted and is recorded as a divergence
  (`proxy-cache.md` AC22; `data-model.md` AC44). Clients' own requests inside the TTL are
  answered from the stored documents through the same `ServeDocument` helper hosted documents
  use, with the cache record in place of the pointer record (no pinned client sends a
  conditional request for an index, so the `304` path serves `curl` and the corpus). The
  `Meta/` documents are mutable metadata with the same TTL and the same cache-scoped
  `Last-Modified`, passed through byte for byte, because their consumers parse the upstream's
  shape and nothing in them names a URL.
- **Package files are immutable artifacts** cached indefinitely: CRAN never republishes a
  version under the same number, and every lock file pins the version. The fetch is
  **stream-and-verify against the record's `SHA256sum` when the upstream's index carries one,
  else its `MD5sum`**, never committed on a mismatch or a truncated body; a tree whose index
  carries neither (CRAN's Windows tree, every `write_PACKAGES` binary tree) uses
  `proxy-cache.md`'s completion-only mode (its resolved completion-only decision, was Q15, AC20)
  with a handler-supplied verifier: the committed-to-be bytes must parse as the tree's archive
  format with a `DESCRIPTION` whose `Package` and `Version` equal the record's coordinate and
  whose binary-ness matches the tree, the same checks hosted ingest applies, so a body that is
  truncated, of the wrong format or of another package is never committed; the client streams
  while the fetch runs and its response completes only once the verifier passes. The served
  records are `FromUpstream` output, produced at adoption before any file is fetched, so they
  carry the upstream record's digests, which for every file this registry has cached equal the
  digests it computed (a mismatch never commits), and a digest-less tree's records carry none
  on the proxied path, exactly as the upstream's do. The record a fetch verifies against comes
  from the **digest index**: a map from tree and filename to the upstream record's `SHA256sum`
  or `MD5sum`, built from the same parse `FromUpstream` consumes, once per adopted index
  revision, so a package miss never re-parses a 7 MB index. It is stored as metadata on the
  remote's repository-level document, inline below the threshold and a CAS blob above it, and
  **declared on that document's blob-digest list**, the only way a document keeps another blob
  alive (`storage-and-gc.md` AC16; `data-model.md`, "Declared blob digests on a document, inline
  or CAS-backed", AC37); named only inside the document's body, the first sweep past grace would
  collect it while it still serves. The handler declares a retained count of **zero**
  (`proxy-cache.md`'s resolved retained-revision decision, was Q19, where zero is valid): a
  package request is verified against the current index's record, so the adoption of a new
  index drops the previous map from the list in the same transaction, and a map finished after
  that adoption is discarded rather than declared (its AC27). The list sits on the
  repository-level document because a tree's index is repository-wide, not revisioned per
  package (its resolved declaring-document decision, was Q22). A coordinate the current digest
  index does not list, which is every fetch that reaches the upstream's `Archive/` (CRAN's
  `Meta/archive.rds` carries `file.info` rows and no digest, and a version superseded since the
  client's index is absent from the current one), is fetched in the completion-only mode with
  the same `DESCRIPTION` verifier, so no route depends on a superseded map. The package files
  themselves are cached files, each held by its own cached reference under the remote's quota
  and evictable; after an eviction a request re-fetches and re-verifies against the current
  digest index or the verifier.
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
- **Publish and every management operation against a `remote` repository answer `405`** with
  problem type `repository-type` (`management-api.md` AC7).
- **A cache refresh and a read-only remote behave as the shared layer defines.** The operator's
  "refresh now" (`POST .../refresh`, `management-api.md` AC29) marks every cached index, `Meta/`
  document and negative entry due for revalidation (`proxy-cache.md` AC24); a `read_only` remote
  fetches and revalidates nothing and serves its cache under a frozen `Last-Modified`
  (`proxy-cache.md` AC23).
- **CRAN scale is the design point** (AC13): the source index is 7.3 MB plain, 1.9 MB gzip and
  1.3 MB rds, above the inline threshold in every representation, so every one lives in the
  CAS under the fourth mark root, the read path is a byte copy with `Range` honoured (CRAN
  serves `Accept-Ranges: bytes` and so does this registry), and the parse-and-regenerate per
  revalidation is bounded by a streaming DCF reader with a CI benchmark gate on its time and
  peak memory because `CLAUDE.md` makes performance a gate rather than a hope.
- **The remote's metadata sits outside the quota.** Every tree's three served representations,
  the two `Meta/` documents and the digest index are the remote's current metadata, which LRU
  eviction never reaches and which ends only when an adoption supersedes it or the remote is
  deleted; they are counted in `cache_metadata_bytes{repository}` beside the quota's
  referenced bytes, never in them (`proxy-cache.md`'s resolved metadata-eviction decision, was
  Q21, AC29). Package files are the only evictable class. A CRAN remote therefore holds about
  17 MB of source-tree metadata (the three representations, `Meta/archive.rds` at 5.4 MB and
  `Meta/current.rds` at 0.7 MB) plus each binary tree a client has asked for, visible in that
  gauge and not bounded by the quota, which is that decision's accepted cost at this format's
  scale (AC24).

Upstream removal maps onto `proxy-cache.md`'s event classes ("Upstream removal or replacement")
as CRAN's side of that contract, each row naming its class:

| Upstream event, as observed at revalidation | Classification |
|---|---|
| A version leaves the source index and its file answers `404` at the current path while `Archive/{package}/` holds it (supersession by a newer release) | **Ordinary metadata change**: the newer version is listed at the next revalidation, and the cached coordinate keeps serving at both paths; no divergence recorded, because the bytes never changed |
| A package leaves the index with every version in `Archive/` and none current (CRAN's "archived" state: a policy violation or a maintainer's request, with no machine-readable reason) | **Removal with no signal** (the class names CRAN's archive): keep serving the cached coordinates, record an operator-visible divergence and alert once; the wire carries no signal distinguishing a takedown from a retirement |
| A re-fetched file disagrees with the recorded digest, or an index record's `MD5sum` changes for a version this registry holds | **Immutability violation, coordinate-bound** (the class names `cran.md`), treated as the explicit signal: purge the cached file and alert, then re-fetch and verify against the new digest on demand, because CRAN's own rule is that a version is published once and every consumer that verified the old digest would otherwise disagree with this registry |
| A `Depends`, `Imports` or other record field changes for the same version (CRAN's own metadata corrections) | **Ordinary metadata change**, propagated at the next revalidation |
| A binary tree gains or loses a version (CRAN rebuilds binaries on its own schedule) | **Ordinary metadata change**, propagated at the next revalidation; a cached binary keeps serving until eviction |
| The index answers `404` where it previously existed | **Removal with no signal**: keep serving, record a divergence |
| A revalidated index is older, by upstream `Last-Modified`, than the adopted one | **Regression not adopted**: the cached index keeps serving under its record, a divergence recorded (`proxy-cache.md` AC22) |

Detection happens at revalidation, passively, per `proxy-cache.md`'s resolved passive-detection
decision (was Q12); the active channel is the policy engine's advisory feed, which carries the
`CRAN` ecosystem through OSV, and it is the only channel that condemns a CRAN coordinate as
malicious under the shared security-signal rule. Nothing on this wire is an explicit security
signal.

Per the resolved preconfigured-upstream decision below, `cloud.r-project.org` stays
user-configured in v1, the answer `cargo.md`, `pub.md`, `hex.md`, `composer.md` and `conda.md`
adopted for their Tier 2 upstreams and `proxy-cache.md` confirmed (its resolved
preconfigured-set extension, was Q14; its second extension, was Q17, added only api.nuget.org
and repo.maven.apache.org).

### Virtual repositories, and why CRAN can have what Hex cannot

`hex.md` found virtual repositories impossible because every registry resource is signed under
the repository's own name and the client checks that name. Nothing on a CRAN tree is signed and
no document names the repository: `available.packages` fills its `Repository` column from the
URL the client itself used, a record names a package and a version, and a file is bound to its
digest. A `virtual` CRAN repository is therefore expressible and is served (the resolved
virtual-repository decision below): its per-tree index is the merge described under
generation, a file or archive request resolves through the members in order, and to every
client it is one repository, served from the merged documents the `index.merge` job keeps
current (`signing-service.md` AC19: within its staleness bound of a member's write, never on a
request's path, the previous set serving until the new one commits). Two semantics follow and
are stated rather than discovered: the
merge is **by package, first member wins**, not by version, because a virtual repository's
member order is `data-model.md`'s resolution order and a private build of a public package must
shadow the public one whatever version the mirror carries (a merge by highest version would let
CRAN's next release silently un-shadow a private fork); and the `Archive/` of a virtual
repository is the union, so pak's and renv's version-pinned lookups find a version whichever
member holds it, the first in order supplying the bytes on a collision. Artifactory and Nexus
both offer virtual CRAN repositories, so the shape is the one users arrive expecting.

How a remote member feeds the merge, each piece `signing-service.md`'s or `proxy-cache.md`'s and
applied here rather than re-decided:

- **Adoption re-merges.** A remote member adopting a new upstream index revision is cache
  materialisation, not a write, and it enqueues `index.merge` for every virtual listing the
  remote inside the adoption transaction, through the runtime's adoption hook, after
  `FromUpstream` has run over exactly the records the handler's adoption check returned
  (`signing-service.md`'s resolved remote-member decision, was Q16, AC35; `proxy-cache.md`
  AC25). A remote reached only through the virtual receives no request of its own, so serving a
  merged document whose input from the remote is past the remote's TTL enqueues one coalesced
  `proxy.revalidate` job that replays the remote's own routes below the authorizer, never on
  the request's path (`proxy-cache.md`, "Revalidation outside the request", AC26).
- **Member-input paths.** The profile declares, under the member's mount, the path of every
  document the `Merge` reads from a member, as `signing-service.md`'s `Profile` requires and
  registration refuses a merging profile without (its AC35): `{tree}/PACKAGES.gz` for each tree
  (the representation every generator writes and pak reads; on a remote, requesting it runs the
  upstream fetch and the `FromUpstream` that produce all three representations) and, for the
  source tree, `src/contrib/Meta/archive.rds` (the archive union's input). `{tree}` is a
  **template**: a virtual's creation, or a member-list change adding a never-adopted remote,
  replays these paths on that remote for `src/contrib`, which every CRAN repository holds, and
  for every binary tree another member of the virtual already holds, so the virtual lists the
  remote's records there with no request ever made to the remote's own URL. `signing-service.md`
  AC35 fetches "exactly the member-input paths the format's profile declares", with no variable
  expanding over the trees the other members hold, so the template is a change that spec owes
  (format closing sweep batch 2 item 1 in `agents/spec-loop/consequences.md`, raised by `rpm.md`,
  `alpine.md` and `conda.md` for the same shape). A binary tree held by the remote alone is
  unknown to the virtual until the remote has adopted it, which a direct client of the remote
  causes; a read-driven first fetch for such a tree is part of the same owed change.
- **Remote documents contribute with no verdict.** Nothing on this wire is signed, so every
  remote document's verdict is `absent`, and it still contributes: `signing-service.md`'s rule
  that a composed document needs a `verified` verdict governs a body the virtual signs (its
  resolved pass-through decision, was Q17, AC36), and a CRAN virtual signs nothing, so its merged
  index vouches for nothing a client could mistake for the registry's verification; a file
  fetched through the virtual is verified at the remote exactly as at the remote's own URL.
  AC36 is written for signed bodies and does not say so; that it does not bind an unsigned
  consumer is the statement format closing sweep batch 2 item 2 asks `signing-service.md` to
  make explicit.
- **Freshness moves forward at every merge commit.** A merge commit and a member-list change are
  document-only transitions of the virtual's default pointer (`signing-service.md`'s resolved
  virtual-freshness decision, was Q15, AC34; `data-model.md` AC36), so every merged index is
  served with a `Last-Modified` later than any the virtual served before, whatever a member's own
  transitions did. No pinned R client sends a conditional request for an index, so this protects
  `curl` and the corpus rather than a captured client failure.

### Capabilities and lifecycle

`Capabilities()` declares proxy support `supported`, reference-implementation availability
`available` (a `write_PACKAGES` tree behind a plain file server, below), `Virtual: supported`
(the section above) and `Rename: supported`, the four fields `format-handler-interface.md` AC13
names. Rename is supported because nothing a client reads names the repository: no generated
document carries a URL or the repository's name, `available.packages` fills its `Repository`
column from the URL the client itself configured, and the retirement set, the generated
documents and every record bind the repository's identity, so a renamed repository serves
byte-identical trees under the new name; only the `repos` URL in a client's configuration (and
in an `renv.lock`'s repository list) must name the new path. The old name answers `not-found`
indistinguishably from a never-existing repository (`repository-lifecycle.md` AC12), which
requires `conformance/cran/rename_test.go`, enforced by the harness's case-set validator
(`conformance-harness.md` AC26); AC23 carries it with the real clients.

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
and Bioconductor's repositories on every metadata update, which the harness's client
confinement makes unreachable (every client container resolves only names on the case network,
`conformance-harness.md`'s resolved client-confinement decision, was Q6, its AC23). The pak
cases therefore give those hostnames stand-ins on the case network, a fixture answering `404`
fast declared through an `upstreams` entry's `hosts` sub-entry (the mechanism `cpan.md` and
`homebrew.md` use for their public-host stand-ins), and AC1's pak run asserts that pak completes
under them rather than assuming it. The stand-in answers rather than leaving the name
unresolvable for a captured reason: with those three hostnames bound to a loopback address that
refuses connections, the same `pak::pkg_install` completed correctly but took 13 minutes 50
seconds, all of it in pak's metadata update, and nothing captured says a name-resolution failure
is faster, so a case that merely isolated the client might pass and cost a quarter of an hour
per run.

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
registry's management endpoint and verified by the real clients' resolves, with the write half
recorded as having no corpus (below) rather than left for the matrix to imply; the read surface's reference
implementation is a `write_PACKAGES` tree behind a plain file server, which is exactly what a
CRAN mirror is, so `Capabilities()` declares reference-implementation availability `available`.
Recording gates on the harness's redaction criterion (`conformance-harness.md` AC13); the
userinfo credential travels in the URL as well as in the `Authorization` header, and that
criterion redacts URL userinfo always, whatever the format's permitted list says.

The halves are recorded against references `conformance-harness.md` AC28 accepts, and never
against this registry, whose own transcripts would replay-match by construction. The read half
is recorded against `cloud.r-project.org`, the public canonical registry. The hosted read half
(the trees a publish produces as each client reads them: a supersession with its `Archive/`
move and `Meta/` documents, a version older than the listed one, a Windows, macOS and Linux
binary tree, an empty tree) is recorded against a tree the real `tools::write_PACKAGES` of the
pinned R 4.5.1 image generates from the corpus's packages, behind a pinned static server, and
has no public reference because CRAN accepts no test upload. The write half has no corpus: no
CRAN client publishes, so there is nothing to record, and the four declared kinds are
`script`-driven cases (`conformance-harness.md` AC26) proven by the effect a real client
observes. Both are rows of that spec's authoritative-reference exception list, which this pass
reports rather than adds, since that file is not this spec's to edit. Every deliberate
divergence from a `write_PACKAGES` tree behind a file server goes on this format's recorded
exception list before its flow is expected to replay: the `SHA256sum` and `MD5sum` on binary-tree records, the empty index
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
      with the tree (a `Built` field in a source tarball, none in a binary), or whose declared
      coordinate disagrees with its `DESCRIPTION`, is refused `validation` (422) with nothing
      referenced and no snapshot, the committed blob collected as an orphan once its session
      expires.
- [ ] AC4: A publish of an existing coordinate with identical bytes answers `201` with a
      completed `Operation` carrying `unchanged: true` and no snapshot reference, and moves no
      pointer or `Last-Modified` (`management-api.md` AC5); one with different bytes is refused
      `conflict` (409); a `delete-version`
      removes the version's files from every tree in one snapshot, the index lists the
      package's next-highest remaining version or omits the package, its paths answer `404`,
      `Meta/` follows, and a real install of the deleted version fails on every client; a
      `delete-file` naming one tree removes the version's file from that tree alone in one
      snapshot while its files in other trees keep serving; a `delete-package` retires every
      coordinate in one snapshot and leaves the `Package` row; a coordinate retired by any of
      the three is refused `retired` (409) on republication with the same or different bytes,
      into any tree, including after the deletion's snapshot has been pruned out of retention
      and after a repoint to a snapshot older than the deletion, with a `Retirement` record per
      coordinate and nothing in any metadata document, and a publish of a coordinate whose
      deletion commits after the publish declared its claim and before the publish commits is
      refused `retired` at commit with nothing landed (`management-api.md` AC12,
      `storage-and-gc.md` AC30); a principal holding `pull` alone is
      refused every operation, one holding `push` without `delete` is refused deletion, no
      snapshot is created by a refusal, and every operation against a `remote` or `virtual`
      repository answers `405` `repository-type`.
- [ ] AC5: Every hosted index document is produced by this format's generator inside the
      triggering write, dispatched by the write-path runtime at the pre-commit hook and never
      requested by the handler, proven by architecture tests that the handler package holds no
      DCF, gzip-index or R-serialisation writer and that the generator package
      `internal/format/cran/index` imports nothing of the registry beyond `internal/index`'s
      value types (`signing-service.md` AC2); no key and no `Signature` record exists for any
      CRAN repository (`signing-service.md` AC24); two concurrent publishes into one tree both
      land and every representation lists both files, the regenerated documents committing in
      the same snapshot as the file that triggered them, proven by repointing to that
      snapshot's predecessor and reading the previous documents; a publish into one tree
      leaves another tree's documents and `ETag`s unchanged; the generator produces identical
      bytes from identical records across two runs; and an index above the inline size
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
      through `WriteRefusal` with a `text/plain` body naming the policy, on the hosted and the
      proxied path, the index still listing the record, the status line read from the socket
      carrying the phrase `Refused by policy: {condition}` on HTTP/1.1; real installs on both R
      generations, pak and renv exit non-zero printing their `403` renderings, each naming the
      refused `{url}` (pak's naming both paths, renv's naming no status), with base R's and
      pak's output asserted to contain the phrase and the body captured in the transcript; and
      the case's fallback observation (a second repository configured, and pak under a
      non-`CRAN` name) fills CRAN's `pending` row of `supply-chain-policy.md`'s binding table in
      the same change.
- [ ] AC11: The proxied path resolves a package and its dependency from a `write_PACKAGES`
      stand-in on both R generations, pak and renv, serving an index generated from the
      stand-in's `PACKAGES.gz` in all three representations; from fresh client caches a second
      resolve on each client reaches this registry while the upstream receives no request,
      asserted at the network layer; every package file was verified against the record's
      `SHA256sum` when the stand-in's index carries one, its `MD5sum` otherwise, and through
      the completion-only mode with the handler's `DESCRIPTION` verifier when it carries
      neither, before commit, a digest-less file whose `DESCRIPTION` names another package or
      version committing nothing; a stand-in whose `PACKAGES.gz` is absent is read from its
      `PACKAGES`; the served records carry the upstream record's digests, equal to the digests
      this registry computed for every file it has cached; and a request for a version present
      only under the stand-in's `Archive/`, absent from its current index, is fetched in the
      completion-only mode with the `DESCRIPTION` verifier and never against a superseded
      digest index.
- [ ] AC12: A proxied index is revalidated after its TTL and not before, with `If-None-Match`
      so an unchanged document costs a `304` upstream; a version published upstream becomes
      visible to every client after the TTL and, absent an explicit refresh, not before, with
      base R's session cache defeated by a fresh session; a `curl` conditional request inside
      the TTL is answered `304` without an upstream request; every served index and `Meta/`
      document carries the remote's cache-scoped `Last-Modified`, never the stand-in's, and a
      stand-in index older by `Last-Modified` than the adopted one is not adopted and records a
      divergence; and the `Meta/` documents are passed through byte for byte and revalidated on
      the same schedule.
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
      client receives the same failure it would from a corrupt upstream, and the real failure
      reason is recorded observably to the operator; on the hosted path a tarball whose stored
      bytes are altered by fault injection is never delivered whole, the read path aborting the
      response with an operator alert (`storage-and-gc.md` AC21), every client failing without
      installing, and the transcript asserting that no client compared the index digest.
- [ ] AC17: A virtual repository over a local and a remote member serves each tree's merged
      index in every representation with, per package, the first member's record whatever
      version the second holds, its `Meta/archive.rds` the union; every pinned client resolves
      through it a package that exists only in the second member; a package present in both
      installs the first member's version and bytes on every client, asserted by digest, even
      when the second member's version is higher; and `renv::install("{package}@{version}")`
      of a version only the second member archives installs it through the merge; the merged
      documents exist before the virtual's first request, a member's publish is visible in them
      within the `index.merge` staleness bound, and no merge runs on a request's path
      (`signing-service.md` AC19); an upstream change adopted by the remote member is visible in
      the merged documents within the staleness bound with no request to the virtual in
      between (`signing-service.md` AC35); a virtual created over a never-adopted remote lists
      the remote's `src/contrib` records and those of a binary tree the local member holds, the
      stand-in's transcript showing only the member-input paths and the network layer no request
      to the remote's own URL; a read of the merged index past the remote's TTL enqueues one
      revalidation and is served the current merged set with no upstream request on its path
      (`proxy-cache.md` AC26); the remote's documents, whose verdict is `absent`, contribute to
      the merge; and every merge commit and member-list change serves the merged index under a
      `Last-Modified` later than any served before, under an injected clock stepped backwards
      (`signing-service.md` AC34).
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
- [ ] AC20: Creating a remote repository whose upstream is a well-formed `https://` root
      succeeds with no upstream request inside the creation (`upstream-adapters.md` AC23); its
      first request against an upstream answering neither a parseable `src/contrib/PACKAGES.gz`
      nor a parseable `src/contrib/PACKAGES` answers `502` with a body naming the requirement,
      and a remote whose URL carries a `__linux__` segment answers `502` naming the plain source
      path with no upstream request made, asserted at the network layer; every upstream request
      of this format carries `User-Agent: stackweaver-registry/<version> (+<server.public_url>)`,
      asserted from the stand-in's transcript; a `virtual` repository of format `cran` is
      accepted; and a publish or management operation against a remote repository answers
      `405` `repository-type`.
- [ ] AC21: Replay-match passes against a corpus recorded from `cloud.r-project.org`, with the
      hosted read half recorded from a pinned static server over a tree the pinned R 4.5.1
      image's `tools::write_PACKAGES` generates, covering the recorded surface named in Design;
      the corpus manifest names that local reference for the hosted half and no write reference,
      each matching a CRAN row of `conformance-harness.md`'s authoritative-reference exception
      list (its AC28), and no transcript recorded against this registry is part of the corpus.
- [ ] AC22: A hosted tree's `Cache-Control: max-age=1800`, `ETag`, `Last-Modified` and
      `Accept-Ranges: bytes` headers are served on every index document through `ServeDocument`,
      a matching `If-None-Match` or an exactly matching `If-Modified-Since` answers `304`, every
      package file is served with an `immutable` cache header, an index the repository's writes
      did not change keeps its `ETag` and `Last-Modified` across snapshots while a repoint that
      changes it changes the tag and moves `Last-Modified` forward, never back (`data-model.md`
      AC36), and no header of an index document is set by the handler package; every package
      file is served through `ServeFile` with its CAS digest as a strong `ETag`, a matching
      `If-None-Match` answering `304` and a byte range answering `206`, at its current and its
      archive path alike, and the handler package sets no validator on a file either
      (`signing-service.md` AC30, AC32); and the index's `Cache-Control` is the same on every
      CRAN repository, with no repository setting that changes it.
- [ ] AC23: `Capabilities()` declares proxy `supported`, reference implementation `available`,
      `Virtual: supported` and `Rename: supported`; after a rename, `install.packages` on both R
      generations, `pak::pkg_install` and `renv::install` resolve and install from the new name
      with byte-identical index documents and files, the old name answers `not-found`
      indistinguishably from a never-existing repository, and a coordinate retired before the
      rename is still refused `retired`.
- [ ] AC24: On a remote far over its quota holding the source tree's three representations,
      both `Meta/` documents, a binary tree's index, a digest index above the inline threshold
      and cached package files, an eviction pass ends cached references of package files only:
      every index document, `Meta/` document and the digest index are unchanged, a request for
      each inside its TTL is served from the cache with no upstream request and the same
      `Last-Modified`, and `cache_metadata_bytes{repository}` counts them while
      `cache_referenced_bytes{repository}` does not; a sweep run with the grace lapsed leaves
      the current revision's digest index in the store, and after an adoption of a new
      `PACKAGES.gz` the next sweep past grace collects the previous revision's map, a map
      finished after that adoption is discarded rather than declared, and an evicted package
      the new index still lists is re-fetched, verified and installed on a real client
      afterwards.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/cran/hosted_test.go` (both R images, pak and renv in the 4.5.1 image; fresh session, library, `pak::meta_clean()`, `pak::cache_clean()` and a fresh `RENV_PATHS_CACHE` in setup; the third-party hostnames bound to a fast-`404` fixture in the pak client container; per-client index representation and headers asserted from the transcript; the warm runs asserted at the network layer) |
| AC2 | conformance + integration | `conformance/cran/documents_test.go` (`curl` and `readRDS` in both R images over every representation and both `Meta/` documents; the empty-tree `download.packages` runs on both generations; wrong-spelling, directory and out-of-grammar paths through `curl`); `internal/format/cran/documents_test.go` (record agreement across representations, server-computed digests, the R serialisation writer against a golden `saveRDS` output) |
| AC3 | conformance + integration | `conformance/cran/publish_test.go` (the `script` publishes through the management endpoint, then real installs on all three clients from fresh caches with digest comparison; a newer publish then `renv::install("{package}@{version}")` of the archived one; refusal fixtures through `curl`); `internal/format/cran/publish_test.go` (snapshot count and content set, head-snapshot visibility before the response, the supersession move and `Meta/` regeneration in one write, the older-than-listed case, `DESCRIPTION`, grammar and declared-coordinate refusals as `validation`, the orphaned blob collected) |
| AC4 | conformance + integration | `conformance/cran/manage_test.go` (identical and changed-bytes republish through the management endpoint; the `script` drives `delete-file`, `delete-version` and `delete-package` through it, then real installs fail on all three clients; the case-set validator requires a `script` case per declared kind, `conformance-harness.md` AC26); `internal/format/cran/manage_test.go` (one snapshot per operation, the identical republish completing `unchanged` with no snapshot, `retired` with same and different bytes and across trees, a deletion committing between a publish's claim declaration and its commit, after pruning under an injected clock and across a backwards repoint, `Retirement` records and no document mention, action refusals, `405` `repository-type` on remote and virtual; the retirement half shares `internal/manage/retirement_test.go` with `management-api.md` AC12) |
| AC5 | architecture test + integration | `internal/format/cran/arch_test.go` (no DCF, gzip-index or serialisation writer in the handler package); `internal/format/signing_boundary_test.go` and `internal/index/generator_purity_test.go` (`signing-service.md` AC2, covering `internal/format/cran/index`); `internal/format/cran/concurrent_publish_test.go` (two writers into one tree, every representation, predecessor repoint, untouched tree's `ETag`s stable, no key or `Signature` row); `internal/format/cran/index/golden_test.go` (determinism over golden fixtures, run by the runtime's determinism harness, `signing-service.md` AC25); `internal/storage/metadata_root_test.go` (threshold crossing, sweep, serve) |
| AC6 | conformance + integration | `conformance/cran/archive_test.go` (`curl` at both paths for superseded, current and never-held versions; `renv::install("{package}@{version}")` and `pak::pkg_install("url::...")` from fresh caches; pak's archive probe, which its `packages_make_sources` records as every package's second source, asserted `200`; the `pak::pkg_install("{package}@{version}")` run recorded); `internal/format/cran/coordinate_paths_test.go` (both paths resolve one `File`) |
| AC7 | conformance + unit | `conformance/cran/filters_test.go` (the `R (>= 9.0.0)` fixture on all three clients with each captured message; `available.packages(filters = list())`; the missing-package transcripts); `internal/format/cran/version_test.go` (canonical form table: `1.0-1` against `1.0.1`, `1.01` against `1.1`, `1.0` against `1.0.0`; duplicate refusal; the `File` field) |
| AC8 | conformance + integration | `conformance/cran/auth_test.go` (private repository on all three clients with userinfo credentials; challenge equality across existing and missing repositories from the transcript; pak's `401` retry and the others' preemptive header asserted; `pull`-less and rejected tokens); `internal/format/cran/auth_test.go` (plaintext refusal under `auth.md` AC27); every conformance case runs behind the harness's TLS termination with `CURL_CA_BUNDLE` and `SSL_CERT_FILE` set in the client containers and no insecure opt-in |
| AC9 | conformance + unit | `conformance/cran/auth_test.go` (the pattern-refusal case `format-handler-interface.md` AC7 requires, in both modes; pattern-scoped tokens through the `credentials` key; the index refusal under real installs on all three clients; in-pattern and out-of-pattern publishes through the management endpoint, the mislabelled and the undeclared-coordinate fixtures); `internal/format/cran/scope_object_test.go` (the object table, per route, `format-handler-interface.md` AC12) |
| AC10 | conformance | `conformance/cran/policy_test.go` (hosted and proxied modes; rules through the `policies` key, a controlled advisory through `advisories`; the raw status line read from the socket; all three clients' transcripts and output on both R generations; a second configured repository and a non-`CRAN`-named pak run capture fallback for the `supply-chain-policy.md` AC20 row); the phrase itself shares `internal/format/refusal_writer_test.go` (`supply-chain-policy.md` AC18) |
| AC11 | conformance + integration | `conformance/cran/proxied_test.go` (a `write_PACKAGES` stand-in with `SHA256sum`, `MD5sum`-only and digest-less trees, and a `.gz`-less variant; all three clients on both R generations; network-level assertion from fresh caches; served records compared with the stand-in's; short-close observation in the completion-only mode, as `proxy-cache.md` AC20 places it); `internal/format/cran/proxied_verify_test.go` (digest priority, the `DESCRIPTION` verifier refusing another package's archive, the digest index from a revalidated index, an archive-only coordinate routed to the completion-only mode) |
| AC12 | conformance + integration | `conformance/cran/proxied_ttl_test.go` (mutating stand-in serving `ETag`; upstream `304` and `curl` `304` at the network layer; visibility on every client after the TTL from a fresh session; `Meta/` pass-through); `internal/format/cran/proxied_freshness_test.go` (cache-scoped `Last-Modified`, the older index not adopted; shares `internal/proxy/freshness_test.go`'s assertions, `proxy-cache.md` AC22) |
| AC13 | benchmark + conformance | `internal/format/cran/scale_bench_test.go` (regeneration over the recorded `cloud.r-project.org` index, peak RSS and time against the gate thresholds); `conformance/cran/scale_test.go` (the recorded index behind a stand-in; every client resolves; `Range`; warm zero-request run) |
| AC14 | conformance + integration | `conformance/cran/proxied_archive_test.go` (stand-in mutated between runs; installs on both R generations with a pre-mutation session cache, `renv::install` at the archive path; pak's probe answered `200`; missing-version and absent-binary-tree cases; throttling stand-in responses); `internal/format/cran/negative_cache_test.go` (both-paths-tried rule, the not-negatively-cached current-path miss) |
| AC15 | integration | `internal/format/cran/removal_test.go` (stand-in presenting each event class; the shared-layer half is `proxy-cache.md` AC13's; the advisory-feed refusal with a network-level no-fetch assertion) |
| AC16 | integration + conformance | `internal/format/cran/proxied_integrity_test.go` (corrupt file, truncated body; CAS and reference assertions; operator record); `conformance/cran/integrity_test.go` (a hosted tarball altered in storage by fault injection on all three clients: the aborted response, the operator alert, no install, the transcript asserted free of any digest comparison; the abort shares `internal/storage/read_verify_test.go`, `storage-and-gc.md` AC21) |
| AC17 | integration + conformance | `internal/format/cran/index/merge_test.go` (the generator's `Merge` per tree, first-member-wins with a higher second-member version, archive union); `internal/format/cran/virtual_merge_test.go` (the `index.merge` job on the production runtime: merged set present at creation, staleness bound, no request-path merge; shares `signing-service.md` AC19's harness); `conformance/cran/virtual_test.go` (a virtual repository over a local and a remote member; resolves on all three clients; digest assertion on the shadowed package; the archived-version install through the merge; the merged index's `Last-Modified` after a merge commit and a member removal, shared with `signing-service.md` AC34's `internal/index/virtual_freshness_test.go`); `conformance/cran/virtual_remote_test.go` (a virtual created over a never-adopted remote, the stand-in's transcript showing only the member-input paths for `src/contrib` and the local member's binary tree and the network layer no request to the remote's URL; an upstream change adopted and merged; the virtual-only remote's revalidation from a read past its TTL, shared with `proxy-cache.md` AC26's `internal/proxy/revalidate_job_test.go` and `signing-service.md` AC35's `internal/index/virtual_remote_member_test.go`; the unsigned remote documents contributing, the rule itself `signing-service.md` AC36's `internal/index/passthrough_test.go`); `internal/format/cran/index/profile_test.go` (the declared member-input paths, and a profile lacking one refused at registration) |
| AC18 | conformance + integration | `conformance/cran/binary_trees_test.go` (Windows and macOS binaries built in the 4.5.1 image, published through the management endpoint in the `script`; `download.packages` on both R images with the tree path per generation asserted from the transcript; the Linux tree through `contriburl`); `internal/format/cran/tree_test.go` (tree grammar, `Built` rule, cross-tree refusals) |
| AC19 | conformance | `conformance/cran/generations_test.go` (transcript diff between the two R images; the `.rds`-less and `.gz`-less trees on all three clients; the non-`CRAN`-name pak run with its transcript asserted) |
| AC20 | integration | `internal/format/cran/upstream_first_request_test.go` (creation with no upstream request; the unparseable first request and the `__linux__` URL each answered `502`, the latter with no upstream request at the network layer; virtual acceptance; `405` `repository-type` on remote writes; the adapter `User-Agent` asserted from a stand-in transcript, `upstream-adapters.md` AC5) |
| AC21 | conformance + unit | `conformance/cran/replay_test.go` (replay of the public and the hosted halves); the manifest-versus-table check is `conformance-harness.md` AC28's `conformance/record/reference_exceptions_test.go`, which fails while the two CRAN rows are absent from its table |
| AC22 | conformance + unit | `conformance/cran/headers_test.go` (`curl` over index and file routes at both file paths, `If-None-Match`, exact `If-Modified-Since` and a byte range); `internal/format/cran/etag_test.go` (stable across unrelated writes, changed by a repoint, `Last-Modified` forward after a repoint under an injected clock); the no-handler-header rule is `signing-service.md` AC11's architecture test, and the per-format `Cache-Control` and `ServeFile` behaviour its AC30 and AC32 rows |
| AC23 | unit + conformance | `internal/format/capabilities_test.go` (this handler's four declarations, `format-handler-interface.md` AC13); `conformance/cran/rename_test.go` (all three clients against the renamed repository on both R generations, byte comparison, old name `not-found`, a pre-rename retirement still refused; required by `repository-lifecycle.md` AC12) |
| AC24 | integration | `internal/format/cran/proxied_metadata_test.go` (an eviction pass over a remote far over quota, documents and digest index untouched and served inside TTL, both gauges read through `telemetry.NewTestRecorder`; a sweep with the grace lapsed before and after an adoption, a late map build discarded; the layer halves are `proxy-cache.md` AC27's and AC29's); `conformance/cran/proxied_evict_test.go` (a real `install.packages` after the eviction pass and the sweep) |

The case set needs only keys already in the harness's closed `setup` vocabulary (its resolved
closed-vocabulary decision, was Q4): `repositories` with their visibility and type,
`credentials`, an `upstreams` stand-in (a fixture file server serving `write_PACKAGES` trees in
the variants AC11 and AC14 name, and the recorded `cloud.r-project.org` documents for AC13),
`state` for pre-published and pre-superseded versions and for pre-deleted ones with their
`Retirement` records (the core-held records a management operation would have left, which the
key seeds), and `policies` with `advisories` for AC10. A `state` entry for a hosted CRAN file is
servable only once its tree's documents exist, and that is met without seed-side code: the seed
write is a completed logical write through the same store, so the write-path runtime generates
the tree's documents at its pre-commit hook exactly as for a publish (`signing-service.md` AC21,
`conformance-harness.md` AC24); a CRAN repository needs no `signing` sub-entry because the
format signs nothing. The pak cases' public-host stand-ins are `upstreams` entries' `hosts`
sub-entries (`conformance-harness.md` AC23). The issued credential reaches every client as the
repository URL's userinfo. The runner-enforced obligations, both modes, the unauthenticated,
unauthorized and pattern-refusal cases in each, a `script` case per declared management kind and
`rename_test.go` (`conformance-harness.md` AC22, AC26), apply from the sibling specs and are not
restated per criterion here.

## Implementation Phases

### Phase 1: Hosted reads and the generated documents
- Waits on `docs/internal/plans/foundation/signing-service.md` reaching `planned` and its Phase 1
  (the runtime and the unsigned consumer) landing (Blocking preconditions)
- The format-first mount, the tree grammar with the empty index for every well-formed tree, the
  filename and version grammars with the canonical form, the `Indexer` and the generator package
  `internal/format/cran/index` producing every index representation and both `Meta/` documents
  including the R serialisation writer, served through `ServeDocument`, package files through
  `ServeFile` at both coordinate paths, the challenge and scope mapping with the per-route addressed
  objects, the `403` policy rendering through `WriteRefusal`, and `Capabilities()` with the
  rename case (AC23)

### Phase 2: Publish and management
- Waits on `docs/internal/plans/foundation/management-api.md` reaching `planned` (Blocking
  preconditions; AC3, AC4, AC18)
- The `Operator` interface declaring `publish`, `delete-file`, `delete-version` and
  `delete-package`; publish from committed blobs with format and `DESCRIPTION` validation in
  `Apply`, server-computed digests, immutability with the idempotent and `conflict` cases,
  supersession into `Archive/` with `Meta/archive.rds`, the declared unchanged publish,
  retirement returned in `Outcome` and held by the core with the claim checked at declaration
  and at commit, the write-boundary declaration exercised end to end under concurrency

### Phase 3: Proxied path and virtual repositories
- Waits on `signing-service.md` Phase 4 (virtual merges and the proxied path) and the queue core
  of `async-operations.md` for the `index.merge` job (Blocking preconditions)
- The first-request upstream check with the `__linux__` refusal, the adapter's default
  `User-Agent`, index regeneration through `FromUpstream` from the upstream's `PACKAGES.gz`, the
  digest index, digest-priority stream-and-verify and the completion-only mode with the
  `DESCRIPTION` verifier, `ETag` revalidation under the cache-scoped `Last-Modified`, the
  both-paths coordinate resolution, negative caching with the current-path exception, the
  removal table by event class, `405` on remote writes, the digest index on the remote's
  declared blob-digest list with a retained count of zero and the metadata outside the quota
  (AC24), the virtual merge as `index.merge` with the member-input paths, the adoption re-merge
  and the virtual-only remote's revalidation (AC17), and the CRAN-scale benchmark gate

### Phase 4: Corpus and gate
- Recording session across the named surface (after the harness redaction gate, extended to
  URL userinfo) against `cloud.r-project.org`, the hosted read half against the pinned
  `write_PACKAGES` tree once `conformance-harness.md`'s exception list carries the CRAN rows
  (AC21), replay-match, the second R generation, pak and
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
serialisation writer. Landed 2026-09-28 as `signing-service.md`'s generator contract: the
writer lives in this format's generator package, dispatched at the write path's pre-commit hook,
and the six requirements are mapped in Design ("What the signing and index service provides").

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

Accepted cost: the exception-list entry and the streaming parser the scale gate bounds. The
regeneration is `signing-service.md`'s `FromUpstream` (its AC20), served under
`proxy-cache.md`'s cache-scoped `Last-Modified` (its AC22).

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

Accepted cost: the configuration refusal and one documentation line for rocker users. **Reconciled
2026-09-28, the option unchanged:** the refusal moved from
configuration to the remote's first request, answered `502` naming the plain source path before
any upstream request, because `upstream-adapters.md` runs no format probe inside creation (its
AC23); the non-R agent is that spec's default `User-Agent` (its AC5), which the handler never
overrides.

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
revalidation. The merge is `signing-service.md`'s `Merge`, run as the deferred `index.merge` job
(its AC19); the re-run on a remote member's revalidation is its adoption hook (its resolved
remote-member decision, was Q16, AC35), with the member-input paths this profile declares
(Design, "Virtual repositories"), whose tree template is a change that spec still owes.

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
its coordinate. That requirement is met: `management-api.md` generalised this rule to every
format ("Publish through the API", its AC13), and a mislabelled publish now leaves a committed
blob its upload session's expiry collects as an orphan rather than a spooled body.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | 1a6daa5 | authoring pass: grounded first draft, not a review | Grounded the wire contract three ways: captured traffic from R 4.5.1 and R 4.3.3 (`available.packages`, `install.packages`, `download.packages` in every type, `old.packages`, `update.packages`), pak 0.11.1 with pkgcache 2.2.5.9000 and renv 1.1.5, in rocker/r-ver images pinned by digest, run in containers against a logging stub serving trees written by the real `tools::write_PACKAGES` (a source tree with an `Archive/`, a `latestOnly = FALSE` tree, a Windows binary tree, a `Meta/` directory in CRAN's shape), across four rounds (cold, warm-in-session and fresh-session installs with each client's index representation, headers and probe order; the `.rds`-less, `.gz`-less and index-less trees; a package hidden by the `R_version` filter; a two-version index under the `duplicates` filter; missing packages and repositories; Basic from URL userinfo, no credential and a wrong one; a policy-shaped `403`; a tarball corrupted mid-body; binary-tree paths for `win.binary`, `mac.binary` and `mac.binary.big-sur-arm64` on both generations and `type = "both"` on Linux; renv and pak version-pinned installs from `Archive/`, pak's `url::` form and its archive probe on every download; pak with the repository under a non-`CRAN` name and against a `__linux__`-shaped URL; pak's and renv's caches); the R Installation and Administration manual's repository section, the `write_PACKAGES` reference, and the `utils` sources in both images for the read side the manual leaves to the code; the pkgcache, pkgdepends and renv sources for the archive URL construction, the CRAN-name rule, the third-party metadata fetch, the P3M binary-index path and the Artifactory and Nexus layout detection; the OSV ecosystem table and API (the `CRAN` ecosystem exists and carries `RSEC-*` advisories); and the live cloud.r-project.org (sizes, headers, `304`, records, `Archive/` listings, `Meta/` shapes, the binary trees per R minor and macOS build) and p3m.dev (one URL, three objects by `User-Agent`). Design built from that: the tree grammar with binary trees keyed by R minor, build and distro and an empty index for every well-formed tree; the index as three representations including an R serialisation this registry must write; the shared model mapping with a tree-keyed record map and a retirement set; every document as a write-triggered document of the shared index service with a six-item requirement list; the management API as the only write path, supersession into `Archive/` inside the publish, `latestOnly` selection and the write-boundary declaration; the canonical version form under which `1.0-1` and `1.0.1` are one coordinate; URL-userinfo Basic on all three clients with pak's `401` retry; the addressed-object table with the consequence that a patterned `pull` cannot resolve; the `403` rendering on three clients; the digests no client verifies and the OSV finding that CRAN is covered; the proxied path with the index regenerated from the upstream's `PACKAGES.gz`, both-path coordinate resolution, negative caching with the current-path exception, the `__linux__` refusal and CRAN's rows of the removal table; and virtual repositories merged by member order, against Hex's refusal. Nine questions written in decision shape and adopted under the standing delegation: supersession into `Archive/` (AC3, AC7), generation by the index service (AC2, AC5), the proxied index regenerated from the `.gz` (AC11 to AC13), both coordinate paths (AC6, AC14), any tree in the grammar with an empty index (AC2, AC18), P3M refused (AC20), virtual repositories first-member-wins (AC17), no preconfigured mirror, and the declared-coordinate publish object (AC9). Twenty-two criteria, each with a Test Plan row. Sibling consequences recorded in the authoring report, not applied here: `auth.md` client-table rows for `R`, `pak` and `renv`; the `management-api.md` operations including a publish that declares its coordinate and tree; the `signing-service.md` requirement list including the R serialisation writer; the `upstream-adapters.md` fixed non-R `User-Agent`; the `proxy-cache.md` completion-only mode (already requested by four siblings) and CRAN's rows in its removal table; the `conformance-harness.md` seed path invoking the index service, the URL-userinfo redaction rule and the pak third-party-hostname binding; the reason-phrase finding for `supply-chain-policy.md` and the confirmation that OSV covers CRAN; and a CRAN row in the management-surfaces analysis. Stays draft; awaits an independent review. |
| 2026-09-28 | fe2a39f | cross-spec reconciliation of the Wave 1 folds and the foundation wave, on Opus. Not a review | Not a review, and this spec's first reconciliation: every item in `agents/spec-loop/consequences.md` naming this file verified against the current text of its source spec and of this file. Applied: signing-service item 11 (the six service requirements mapped onto the generator contract: `Indexer`, generator package `internal/format/cran/index` holding the R serialisation writer and `latestOnly`, pre-commit-hook dispatch, per-document lock, determinism, unsigned consumer with no key, `ServeDocument` with `Last-Modified` from the pointer's `moved_at`, `Merge` as the `index.merge` job, `FromUpstream`; AC2, AC5, AC17, AC22); conformance-harness reconciliation item 4 (seed path through the write-path hook, `signing-service.md` AC21, harness AC24; the Test Plan obligation discharged); management-api items 11 and 12 and format-management item 11 (kinds `publish`, `delete-file`, `delete-version`, `delete-package`, no bindings; retirement core-held and refused centrally as `retired`; `validation`, `conflict` and `repository-type`; the upload-session and convenience publish forms; AC3, AC4); proxy-cache reconciliation item 4 (completion-only mode offered, was-Q15 AC20, with a `DESCRIPTION` verifier the handler supplies; AC11); upstream-adapters item 12 and the AC23 finding (https adapter; the `PACKAGES` shape and `__linux__` checks moved from configuration to the first request, the non-R agent being that spec's default `User-Agent`; AC20, Q6 record noted, option unchanged); supply-chain reconciliation items 10 and 11 and theme 3 (`WriteRefusal` and the status-line phrase R and pak print; the capture fills the `pending` binding row; pak's non-`CRAN`-name fallback named; AC10); artifact-verification item 16 (verification column `none`); theme 4 (storage-and-gc AC21 read-path verification as the only integrity check; AC16 revised); proxy-cache classes named on every removal row, cache-scoped `Last-Modified`, refresh and read-only remotes (AC12); repository-lifecycle AC12 and FHI AC13 (Capabilities section, new AC23); auth rows found already done (`R` / `renv` / `pak`); harness client confinement for pak's public hosts. Found and resolved here: `management-api.md` placed CRAN's per-tree deletion on `unplace`, which retires nothing; this spec declares `delete-file` retiring the version coordinate, keeping its adopted never-republishable rule. No question adopted, so no `fable_recheck`. Reported rather than assumed: `unplace` to `delete-file` in management-api's CRAN row, an identical republish completing with no snapshot against its AC5, R `numeric_version` missing from supply-chain's vendored orderings, a per-repository `Cache-Control` on signing-service's profile, pak's stand-in hosts in the harness, `cran.md` in async-operations' virtual-merge consumers. Twenty-three criteria, each with a Test Plan row. `node scripts/check-spec.js` reports no failure in this file. Stays draft; awaits an independent review. |
| 2026-09-28 | a3a9d78 | format closing sweep on Opus. Not a review | Not a review. Every still-open item in `agents/spec-loop/consequences.md` targeting this file, from every section, verified against the current text of its source spec and of this file. DATA-LOSS AUDIT (format closing sweep batch 2 item 5): the proxied digest index was built "once per revalidated index and kept with the remote's current documents" with no storage stated, so a CAS-backed map named only in the remote's document would be collected by the first sweep past grace; it is now metadata on the remote's repository-level document, declared on its blob-digest list with a retained count of zero (`proxy-cache.md` was-Q19, zero valid; the repository-level placement per was-Q22, a tree's index being repository-wide), a late map discarded, and the files it names confirmed held by their own cached references. Verifying the count exposed that an archive-only coordinate (every fetch reaching the upstream's `Archive/`) had no stated verification: it now goes through the completion-only mode with the `DESCRIPTION` verifier, so no route reads a superseded map (AC11 extended). Eviction settlement item 7's "huge-index formats" line applied: every remote index, `Meta/` document and the map outside the quota in `cache_metadata_bytes`, about 17 MB per source tree (was-Q21; new AC24). The rest of the file grepped for other maps or bodies held only by mention: none (hosted documents are snapshot content; hosted and cached files are `File` rows; the remote's `Meta/` documents are current documents). Foundation leftovers item 2 and `signing-service.md` AC35: member-input paths `{tree}/PACKAGES.gz` and `src/contrib/Meta/archive.rds`, the tree a template over `src/contrib` and the trees other members hold, citing batch 2 item 1 as the owed change and the remote-only tree as a gap; signing-service closing-sweep item 6 (cran was-Q18, AC35) and proxy-cache closing-sweep item 6 (adoption re-merges, was-Q16; the virtual-only remote's revalidation, `proxy-cache.md` AC26; freshness per was-Q15, AC34; the service requirement 5, the Q7 record, AC17 and its row); batch 2 item 2: unsigned remote documents contribute with an `absent` verdict, AC36 governing signed bodies, recorded without changing AC36. `signing-service.md` was-Q14 (package files through `ServeFile`) and was-Q18 (per-format `Cache-Control`, the per-repository request withdrawn; AC22 extended). Management-api closing-sweep items 4 and 5: the identical republish is the declared unchanged publish (was-Q15, AC5; the cran AC5 request met), the claim checked at declaration and again at commit (was-Q14, `storage-and-gc.md` AC30; AC4 and its row extended), and the `unplace` correction found applied in its table. Supply-chain closing-sweep item 3: `numeric_version` is vendored (its AC17). Six-spec item 6: the corpus now records the hosted read half against a pinned `write_PACKAGES` tree and no write half, never against this registry (AC21 and its row); the two `conformance-harness.md` rows are reported. Found while verifying: the proxied path claimed its served records carry "the digests this registry computed", but `FromUpstream` runs at adoption before any fetch, so the records carry the upstream's, equal to ours for every cached file; corrected in Design and AC11. Found already done: the `R` / `pak` / `renv` auth row, pak's stand-ins in the harness, `cran.md` among async-operations' merge consumers. Skipped: nothing. No question adopted; `fable_recheck` added for three folded judgements. 24 criteria, each with a Test Plan row. Stays draft. |
