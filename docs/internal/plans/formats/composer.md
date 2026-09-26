---
status: draft
status_description: "Authored 2026-09-26 as a grounded first draft: the Composer v2 repository protocol captured from Composer 2.10.3 and 2.2.30 run in containers against a logging stub, with Composer 1.10.28 run on PHP 7.4 to ground the refusal of the v1 provider layout; checked against the Composer repository and config documentation, the composer, metadata-minifier and Satis sources, the Packagist Composer 1 shutdown notice and the live repo.packagist.org. Nine questions written in decision shape and adopted under the owner's standing delegation; none open. Awaits a /spec review pass."
description: "Spec for the Composer (PHP) repository format: the packages.json root, the per-package p2 metadata files with their minification and ~dev split, dist archives, the in-band filter-list and security-advisory channels, hosted through the registry-owned management API and proxied against Packagist, with Composer as the conformance oracle."
author: michielvha
goal: "Serve PHP teams a private Composer repository and a Packagist cache from one handler whose every served URL is its own, whose dist archives are verified and immutable, and whose supply-chain channels pass through without ever asserting an all-clear the registry did not compute."
priority: "medium"
issue: 24
created: 2026-09-26
covers:
  - "internal/format/composer/**"
  - "conformance/composer/**"
---

# Plan: Composer repository format

The Composer v2 repository protocol, hosted and proxied: a per-repository `packages.json` that
names where everything else is, one metadata file per package (plus a `~dev` twin for branch
versions) that the client fetches lazily and revalidates with `If-Modified-Since`, dist archives
addressed by absolute URLs the registry must own, and the ecosystem's in-band malware-list and
security-advisory channels, with `composer` as the oracle on both paths and the registry-owned
management API as the only way content enters the hosted path, because the ecosystem has no
publish protocol.

## Context

Composer sits in Tier 2 of `formats/catalogue.md` under its own single-member family
("Composer"), so it carries no client multiplier and no reach claim beyond `composer` itself.
**Its build is gated**: `project-charter.md` AC9 forbids any Tier 2 handler code on `main` before
an owner-recorded `continue` verdict at build step 8, and `catalogue.md` AC5 forbids Tier 2 work
until every Tier 1 format has met its definition of done. This spec exists now because the owner
directed on 2026-09-26 that all 33 ecosystems be specced up front (`project-charter.md`,
"Speccing is not gated; building is"), so the format's traps are on record before the gate and
the catalogue's AC1 holds; it does not pull the format forward.

Grounding for this draft, stated up front because the constitution asks for evidence or silence:

- **Captured client traffic.** No PHP toolchain is installed on this host (`which composer php`
  find nothing), so pinned client images were run in containers on the host network against a
  logging stub that serves the documented repository shapes under one path segment per
  experiment and records every request: Composer `2.10.3` (`docker.io/library/composer:2` at
  digest `sha256:bdd249749908be12facc9dec72e19704371bb893f96dff3e024ec89528a5a08d`, PHP 8.5.11)
  and Composer `2.2.30` (`composer:2.2` at
  `sha256:06ac19accf5e69a30e2dcbc7d3a3bc2cae283cc1ccd65795f18a5eff4e98526b`, the LTS line, still
  built on 2026-08-27). Composer `1.10.28` was run as well, to ground the v1 layout decision
  rather than assume it: the `composer:1` image
  (`sha256:49bb45619a75dab75bbbb496e06043d3c81cdd03d59e3be60fd83da43a76aba4`) ships PHP 8.5.6, on
  which Composer 1 dies in `stream_context_create` before its first request, so the 1.10.28 phar
  was run on `docker.io/library/php:7.4-cli`
  (`sha256:691f9ae2a3639de11d95f507bc29c723a7f27b79bdf91317aef8ded35f9864ce`). Every row of the
  wire table below was observed on both Composer 2 releases unless the row says otherwise, and
  every second-request and refusal case was re-run with a fresh `COMPOSER_HOME` and
  `COMPOSER_CACHE_DIR`, because the first rounds shared a cache and the client's degraded mode
  (below) turned refusals into green exits. 359 requests were recorded across five rounds. The
  stub is not a reference implementation; it answered with the shapes the published contract
  describes, and what the captures prove is what the client sends and how it reacts.
- **The published contract.** The Composer documentation's repository reference (`composer`
  repository type: `packages`, `notify-batch`, `metadata-url` with `available-packages` and
  `available-package-patterns`, `providers-api`, `list`, `provider-includes` and
  `providers-url`, rate limiting with `Retry-After`, and the `filter` section), the config
  reference's `policy` block and `secure-http`, and the authentication article, all read from the
  `composer/composer` source tree at `a971f4e` (2026-09-25); the client source itself for the
  behaviour no document states: `Repository/ComposerRepository.php` (name lowercasing, the `~dev`
  rule, `canonicalizeUrl`, the 404 and 304 handling, degraded mode, `mirrors`, the
  `security-advisories` precondition), `Util/AuthHelper.php` (preemptive credentials keyed by
  origin, non-interactive 401 and 403 rendering), `Downloader/FileDownloader.php` (the sha1
  check, retry only on 5xx, the next-URL fallback), `Package/Package.php` and
  `Util/ComposerMirror.php` (dist URL templating), `Installer/InstallationManager.php`
  (`notify-batch` body), `Util/HttpDownloader.php` (`warning` and `warning-versions`),
  `Package/Loader/ValidatingArrayLoader.php` (the name grammar) and `CHANGELOG.md` (filter lists
  in 2.10.0-RC1, install-time malware blocking in 2.10.0-RC2, advisory blocking in 2.9.0,
  `available-package-patterns` in 2.0); the `composer/metadata-minifier` source for the exact
  minification algorithm; Satis's `Builder/PackagesBuilder.php` for what the reference static
  generator emits; and the Packagist blog post on shutting down Composer 1.x support.
- **The live upstream.** `repo.packagist.org` sampled directly: `packages.json` and every key it
  advertises (`metadata-url`, `providers-url` still present, `metadata-changes-url`, `search`,
  `list`, `security-advisories` with `api-url`, `providers-api`, the Composer 1 `warning` with
  `warning-versions` `<1.999`, and `filter` with a `malware` list and `summary-url`); a p2 file's
  headers (`cache-control: public, max-age=900`, `etag`, `last-modified`), a `304` to
  `If-Modified-Since` and to `If-None-Match`; `monolog/monolog.json` minified (90 versions, the
  first entry full and every later one a diff carrying six `__unset` markers) with
  `security-advisories` inline; its dist URLs pointing at `api.github.com` zipballs with an
  **empty** `shasum`, answered `302` to `codeload.github.com` under a 60-requests-per-hour
  unauthenticated API rate limit; a `404` with a `text/html` body for a missing package and for
  the `~dev` file of a package with no branch versions; a `200` for a mixed-case path (a CDN
  fold); the malware `summary.json` (156 entries, `max-age=900`); the advisories API answering a
  form-encoded `POST` with `cache-control: max-age=0, must-revalidate, private`; and `list.json`.

Where the documentation and the captures disagreed, the captures win, and the disagreements are
recorded where they bite: the documentation says a `metadata-url` "must contain the placeholder"
and shows a path-absolute example, and the client resolves a path-absolute URL against the
repository's scheme and host only, dropping the repository path, while a relative one fails
outright (Design, "Every URL is absolute").

Five things make this format worth a careful spec rather than a port of npm's. **There is no
publish protocol**: Packagist ingests from VCS, Satis generates static files, and Private
Packagist's upload API is its own, so every hosted write on this registry is an operation of the
registry-owned management API and the real client oracles only the effects. **Every URL the
repository serves is absolute and the client resolves the others wrongly**, so the handler needs
the externally visible base URL for the hosted path too, not only for proxied rewriting. **Dist
archives live off the upstream**: Packagist's metadata sends the client to GitHub for bytes it
publishes no digest for, so the proxied path fetches from a second host, through a redirect,
under a rate limit, with completion-only verification. **The ecosystem's supply-chain channels
are in-band**: the same `packages.json` advertises malware filter lists and a security-advisory
API that the current client enforces at `update` and `install`, which is both the cleanest
explicit security signal in the catalogue and a way to assert an all-clear by silence. And
**metadata is minified by a stateful diff** in which the token `__unset` means "delete this
key", so a rendering bug in one version corrupts every version after it.

## Blocking preconditions

**The handler interface re-open must complete before this handler starts**, as for every Tier 1
and Tier 2 handler (`format-handler-interface.md` AC8). Composer is Tier 2, so the breadth gate
above precedes it in practice; the re-open is recorded here anyway, because a gate enforced on
one side only is enforced nowhere.

**The management API must be specced before Phase 2, and it is the only hosted write path.**
Publishing a version, deleting a version or a package and marking a package abandoned are all
operations of `docs/internal/plans/foundation/management-api.md` (to be authored in the spec
loop); nothing on the Composer wire writes. Phase 1's hosted reads are testable without it,
because the harness's `state` vocabulary seeds versions through the shared write path
(`conformance-harness.md`, "The `setup` vocabulary"); Phase 2 waits on that spec reaching
`planned`. What this format requires of it is stated in Design ("The hosted write path") rather
than designed here.

**Three shared-layer amendments this spec depends on are requested, not assumed**, each recorded
as a sibling consequence rather than made here:

- The completion-only fetch-and-cache mode `go-modules.md`, `nuget.md` and `maven.md` already
  requested of `proxy-cache.md`, because a Packagist dist carries no digest.
- Fetching a dist from a host other than the upstream's origin, through a redirect, within a
  per-repository dist-host allowlist, with a credential for that host from the upstream adapter
  (the resolved dist-host decision below), of `proxy-cache.md` and
  `docs/internal/plans/foundation/upstream-adapters.md` (to be authored in the spec loop).
- An uncached forwarded `POST`, for the advisories API (the resolved supply-chain-channel
  decision below), of the same two specs.

## Scope

**In scope:**

- The v2 protocol as both pinned clients speak it: `packages.json` with `metadata-url`,
  `available-packages`, `notify-batch` and `list`; the per-package `p2/{vendor}/{name}.json` and
  `~dev.json` files, minified; dist archives at absolute URLs this registry owns; conditional
  requests on `Last-Modified`; the `404` contract for absent packages.
- The format-first mount `/composer/{repository}/` in front of it, with every URL in every served
  document absolute under the externally visible base URL (Design, "Every URL is absolute").
- Names and versions: the lowercase name grammar, request folding, the `version_normalized`
  form computed by a port of `composer/semver`'s normaliser, newest-first ordering, and the
  split between tagged and `dev-*` versions.
- The hosted write path through the registry-owned management API: publish an archive as a
  version, delete a version, delete a package, mark a package abandoned; the write-boundary
  declaration `data-model.md` requires; tagged versions immutable and retired on deletion,
  branch versions mutable (the resolved branch-version decision below).
- Non-interactive authentication exactly as the client sends it: HTTP Basic with the token as
  password or `Authorization: Bearer`, preemptively on every request to the origin; the uniform
  challenge; the per-route addressed objects `auth.md`'s pattern scopes evaluate (AC9) and the
  wire rendering of a shared policy refusal (AC10).
- The proxied path against a v2 upstream (Packagist or a private v2 repository): classification
  per document kind, root and dist URL rewriting, off-origin dist fetching under an allowlist,
  `If-Modified-Since` revalidation, negative caching, the virtual merge, and Composer's rows of
  the upstream-removal table, with the upstream's malware list as the ecosystem's explicit
  security signal.
- The supply-chain channels: pass-through of `filter` lists and `security-advisories` on the
  proxied path under the name-forwarding rule of the resolved channel decision; nothing
  advertised on the hosted path until the policy engine can back it.
- Refusal of the Composer 1 layouts with the `warning` the ecosystem defines for exactly that
  (the resolved legacy-layout decision below).

**Out of scope for v1**, each with its reason, recorded because the interface spec's definition
of done requires the deliberately unimplemented surface to be named:

- **The v1 layout: `provider-includes` and `providers-url`.** Not effort: Packagist made its
  Composer 1 metadata read-only on 2025-02-01 and shut it down on 2025-08-01 (the shutdown post),
  and its live `packages.json` tells every Composer 1 client so; the format needs a `uid` per
  version that the v2 documents do not carry (captured: `Undefined array key "uid"` on 2.10.3,
  2.2.30 and 1.10.28 alike until the fixture grew one); and the only client that needs it,
  Composer 1, crashes on the PHP its own image ships. A Composer 1 client gets the same answer
  Packagist gives it (Design, "Legacy layouts are refused with the ecosystem's own warning").
- **Whole-repository documents: inline `packages` and `includes`.** Both clients resolve from
  them (captured, once the stub decoded the `%24` the client sends for `$`), but each is one
  document enumerating every version of every package, O(repository) to render on every fetch
  and the shape Satis emits precisely because it cannot serve lazily. `metadata-url` supersedes
  them for Composer 2 and nothing else needs them.
- **`providers-api` and `metadata-changes-url`.** Neither is consumed by `install`, `update`,
  `require` or `install` from a lock (captured: never requested); the first serves Packagist's
  "who provides this virtual package" page and the second is the mirror-sync feed Packagist
  mirrors poll. The change feed is worth a later revision as a proxied-revalidation input, once
  the proxy layer has a place for an upstream-driven invalidation; it is named so that revision
  knows where to start.
- **A hosted `search` endpoint.** With no `search` key advertised, `composer search` searched the
  `available-packages` list client-side and found both fixtures (captured), which is the whole of
  what a private repository needs; a ranked endpoint has no oracle, the reason `npm.md` gave.
  The proxied path forwards the upstream's search URL (Design, "The proxied path").
- **Hosted `security-advisories` and `filter` lists.** This registry advertises no advisory or
  filter data it did not compute (the resolved supply-chain-channel decision below); rendering
  the policy engine's verdicts through these channels is a revision of that section once
  `supply-chain-policy.md` exposes an advisory read through `Deps`, recorded as a sibling
  consequence, not built ahead of its data source.
- **`notify-batch` statistics.** The `POST` is accepted and discarded (the resolved notify
  decision below); download counts are a UI-era feature with no oracle and no consumer.
- **The `mirrors` key.** A preferred dist mirror makes the client try this registry first and
  the upstream URL next on any non-5xx failure (`FileDownloader.php`, the next-URL fallback),
  which is a cache bypass the metadata would advertise to every client; dist URLs are rewritten
  instead, so no fallback exists.
- **Caching `source` references.** A `source` block names a VCS the registry cannot cache
  through an HTTP handler, the same reason `cargo.md` gave for the git index; it passes through
  the proxied path unchanged and is absent from hosted versions, which are archives.
- **`path`, `vcs` and `artifact` repository types.** Client-side constructs with no wire.
- **Private Packagist's own APIs** (its upload, mirroring and organisation surfaces). Not a
  standard; the management API is the registry's, and nothing on the Composer wire binds to it.

## Design

### The wire surface, as captured

Every path below hangs off the repository's base URL, `/composer/{repository}/`, format-first
per `format-handler-interface.md`'s resolved URL-shape decision: the client takes an arbitrary
base URL from `repositories[].url` and appends `/packages.json` unless the URL already ends in
`.json` (`getPackagesJsonUrl`), and nothing needs root anchoring.

| Surface | Shape, as the pinned clients send it |
|---|---|
| Root document | `GET .../packages.json` first on every command that touches the repository, unconditionally on a fresh cache and with `If-Modified-Since` afterwards; a `304` is accepted and the cached copy used. Composer 2.10.3 fetches it on `composer install` from a lock too; 2.2.30 does not (captured: the lock install on 2.2.30 requested only dists and `notify`) |
| Package metadata | `GET {metadata-url with %package% replaced}`: `.../p2/{vendor}/{name}.json`, name lowercased by the client before the URL is built; with `If-Modified-Since` when a cached copy exists, `304` accepted. One request per package in the dependency graph, in parallel, including transitive ones |
| Branch versions | `GET .../p2/{vendor}/{name}~dev.json` beside every package file whenever dev stability is acceptable for that package: a `minimum-stability` of `dev`, an explicit `dev-main` requirement, or a lookup with no stability constraint (`composer show`, and the probe a `require` makes for a name the repository does not hold); never under `stable` for a `require` or `update` of a package the repository holds (captured on both) |
| Absence | A `404` on a package file or its `~dev` twin means "not in this repository" and is remembered for the run; the client moves on. When `available-packages` lists the repository's names, a name outside the list is **never requested** (captured: `acme/nope` produced no request under a listing and two `404` probes, `.json` and `~dev.json`, without one) |
| Dist download | `GET {dist.url}` verbatim, absolute; the body's sha1 compared with `dist.shasum` when non-empty, a mismatch failing the install ("The checksum verification of the file failed", exit 1, captured on both). A non-5xx failure is not retried against the same URL; 5xx is retried three times; 2.10.3 then stops ("Source fallback is disabled"), 2.2.30 falls back to cloning the `source` URL (captured) |
| Install from a lock | Dists by the absolute `dist.url` the lock recorded, `notify-batch`, and on 2.10.3 the root document; no package file is requested (captured on both) |
| Notify | `POST {notify-batch}` after every install that downloaded something, `Content-Type: application/json`, body `{"downloads":[{"name":"acme/lib","version":"1.1.0.0"}]}` with the **normalised** version, a six-second timeout, every failure swallowed (`notifyInstalls`) |
| Filter lists (2.10.3 only) | With `filter.summary-url` advertised, `GET {summary-url}` on `composer install` and `composer audit` (captured; `require` and `update` read the per-package `filter` entries the package files carry instead, when `filter.metadata` is true). A version the `malware` list names is filtered out of resolution ("1 (2%) were filtered away by dependency policies"), an exact requirement of it fails naming the list, the reason and the URL, and a lock pinning it fails `composer install` ("Your lock file does not contain a compatible set of packages"). 2.2.30 has no filter support and installed the listed version |
| Security advisories (2.10.3 only) | With `security-advisories.api-url` advertised, `POST {api-url}` with `Content-Type: application/x-www-form-urlencoded` and body `packages[0]=acme/lib` (one entry per package, captured) during `require` and `update`; a version an advisory covers is blocked from selection by default ("found acme/lib[1.0.0] but these were not loaded, because they are affected by security advisories"), and `composer audit` reports it. With `metadata: true` and no `api-url` the client reads advisories inline from the package files, but only if `available-packages` is present; otherwise it refuses the repository outright (`Repository/ComposerRepository.php`: "available-packages or available-package-patterns are required to be provided for performance reason"). 2.2.30 has no `audit` command and ignores both |
| Request headers | `User-Agent: Composer/{version} (Linux; {kernel}; PHP {version}; cURL {version}; cmd:{command})`, `Accept: */*` and `Accept-Encoding: deflate, gzip, br, zstd` on every request, `If-Modified-Since` where a cached copy exists, never a conditional `If-None-Match`, never `HEAD`. Composer 1.10.28 sends `User-Agent: Composer/1.10.28 (Linux; ...; PHP 7.4.33)` and no `Accept` |
| Authentication | `http-basic` credentials keyed by the origin **including the port** are sent as `Authorization: Basic` **preemptively on every request to that origin**: root document, package files, dist archives on the same origin, and the notify `POST` (captured on both). `bearer` credentials likewise as `Authorization: Bearer`. A credential keyed by the bare host is **not** sent to a port-qualified origin (captured). Non-interactively there is no challenge handling: a `401` fails the run with "The '...' URL required authentication (HTTP 401). You must be using the interactive console to authenticate", a `403` with "The '...' URL could not be accessed (HTTP 403): HTTP/1.1 403 Forbidden", the status line and never the body |
| Degraded mode | When a metadata fetch fails for any reason other than `404` and a cached copy exists, the client prints "could not be fully loaded (...), package information was loaded from the local cache and may be out of date" and **continues from the cache**, exit 0 (captured for a `401`, a `403` and a `secure-http` refusal). A fresh cache turns each into the hard failure above |
| Transport | With `secure-http` at its default of `true`, an `http://` repository is refused ("Your configuration does not allow connections to http://..."), loopback included; the captures ran with `secure-http: false`. Uppercase in a required name is refused client-side before any request ("require.Acme/Lib is invalid, it should not contain uppercase characters") |
| Rate limiting | Documented, not captured: a `429` with `Retry-After` of sixty seconds or less is waited out and retried up to three times, applied to the whole repository; a JSON body with a `warning` key is shown |

Three facts about the client's cache shape every second-request assertion. `COMPOSER_CACHE_DIR`
holds every document keyed by URL with its `Last-Modified`, and every dist archive keyed by URL
and sha1, so a warm `composer update` costs one conditional request per document and no dist
request, and a warm install from a lock costs nothing at all. Degraded mode means a stale cache
masks an authentication or policy refusal behind a warning and a green exit, so every refusal
case in this spec runs from a fresh `COMPOSER_HOME` and `COMPOSER_CACHE_DIR` and asserts the
status at the network layer, never the exit code alone. And `composer require` of a name the
repository does not hold probes the `~dev` file as well as the package file (captured), so a
case asserting the absence of a `~dev` request under `stable` does so for a name the
repository holds.

### Every URL is absolute, and the base URL is the handler's to know

The root document carries URLs, and the client's `canonicalizeUrl` resolves them in exactly one
of three ways (captured on both releases against three stub variants):

- An absolute URL is used as given.
- A path-absolute URL (`/p2/%package%.json`) is prefixed with the repository URL's **scheme and
  host only**, so a repository at `https://host/composer/team/` advertising `/p2/...` sends the
  client to `https://host/p2/...`, outside its own mount. Satis emits exactly this shape, with
  the site's path prepended, which is why it works for a static site and not for a mounted one.
- A relative URL (`p2/%package%.json`) is passed to the downloader as is and fails ("The
  "p2/acme/lib.json" file could not be downloaded: Failed to open stream"; a fatal `TypeError`
  on 2.2.30).

Dist URLs are worse: a path-absolute `dist.url` failed on both releases at download time
(`RemoteFilesystem.php`, captured), and the lock file records `dist.url` verbatim, so a wrong
form is frozen into every consumer's `composer.lock`.

This registry therefore emits **absolute URLs everywhere**, in `metadata-url`, `notify-batch`,
`list`, `filter.summary-url`, `security-advisories.api-url` and every `dist.url`, under the
externally visible base URL, on the hosted path as much as the proxied one. That is the
base-URL dependency `npm.md` has for its tarball URLs, here required by the hosted path too:
the handler renders nothing until it knows that URL, and an `http://` base is refused at
configuration unless the plaintext flag is set (AC20), because the client's own `secure-http`
default refuses it anyway.

The dist URL grammar this registry owns, on both paths:

`/composer/{repository}/dist/{vendor}/{name}/{version_normalized}/{key}.{type}`

where `{type}` is `zip` or `tar` and `{key}` is the archive's sha1 on the hosted path (also the
`shasum` and the `reference` the version advertises) and, on the proxied path, the upstream
version's `dist.reference` when it has one, otherwise `url-` followed by the sha256 of the
upstream `dist.url`. The key makes the URL immutable for the bytes it names, makes a branch
version's replacement a new URL rather than new bytes under an old one, and is derivable from
the metadata before any fetch, which is what lets a lock file pin it.

### Mapping onto the shared model

The levels are exactly those `data-model.md` provides; no table is added.

- `Package.name` holds the lowercase `{vendor}/{name}`, validated on write against the client's
  own grammar (`ValidatingArrayLoader.php`:
  `^[a-z0-9]([_.-]?[a-z0-9]+)*/[a-z0-9](([_.]|-{1,2})?[a-z0-9]+)*$`, matched case-insensitively
  there and lowercased here before storage). The package-level document holds the **abandoned**
  state (`false`, `true` or a replacement package name, rendered as the `abandoned` field of
  every version), the **retirement set** of deleted tagged version strings, and the
  `Last-Modified` value the package's rendered documents last carried (Design, "The rendered
  documents", for why it is stored).
- `Version.version` holds the pretty version string as published (`1.1.0`, `v2.0.0-beta1`,
  `dev-main`, `1.x-dev`); the version-level document holds the archive's `composer.json` as an
  opaque object plus what the rendering needs and the archive does not carry: the normalised
  form, the dist type, the publish time (`time`), and for a branch version its
  `version_normalized` alias state. The registry never interprets `composer.json` beyond `name`
  and `version` at publish time; everything else is rendered back verbatim.
- Each version has exactly one `File`, the dist archive, whose `Blob` is keyed by the CAS digest
  of its bytes; the sha1 the wire needs is metadata kept in the version-level document, never a
  storage key (`storage-and-gc.md`).
- A `remote` repository caches the upstream's root document in its repository-level document (as
  configuration, never served), each upstream package file and `~dev` file in the package-level
  document, the upstream's filter summary in the repository-level document, and every dist as a
  `File` with a `RemoteFile` whose upstream path is the upstream `dist.url` verbatim; the
  `RemoteFile` outlives the cached metadata that named it, so a dist URL a lock file pinned
  months ago still resolves to a re-fetch after eviction.

### The rendered documents: rendered on request, never stored

Every hosted document is a pure function of the repository's version rows and their documents,
so both are **rendered on request**, the class `cargo.md` and `nuget.md` argued for and
`maven.md` distinguished from its write-order state: there is no repository-wide document here
(a package file lists one package), nothing is signed, and nothing is a precondition for reads
that a write must regenerate. The shared signing and index service of charter step 7 is not
used, and the class `write-triggered-services-prototype.md` defines does not apply here. The
absence of a stored rendering is asserted by a criterion of its own (AC19) rather than left
implied.

| Document | Path | Content |
|---|---|---|
| Root | `packages.json` | `packages: []`, `metadata-url` (absolute, `%package%` literal), `available-packages` (every package name in the head snapshot, sorted), `notify-batch` (absolute), `list` (absolute), `warning` and `warning-versions: "<2"` (Design, "Legacy layouts"), and on the proxied path the pass-through channel keys. No `providers-url`, `provider-includes`, `includes`, `mirrors`, `search` or `providers-api` |
| Package file | `p2/{vendor}/{name}.json` | `{"minified":"composer/2.0","packages":{"{vendor}/{name}":[...]}}` with one entry per **tagged** version, newest first by normalised version, minified per the algorithm below. Each entry before minification is the version's `composer.json` with `name` (canonical), `version` (pretty), `version_normalized`, `dist` (`type`, absolute `url`, `shasum`, `reference` equal to the sha1), `time`, and `abandoned` when the package is marked, in that precedence over anything the archive claimed. A package with no tagged versions answers `404`; a name not in the repository answers `404` |
| Branch file | `p2/{vendor}/{name}~dev.json` | The same shape over the **branch** versions (normalised form ending in `-dev`, or `dev-` prefixed), each with its branch alias carried through; a package with no branch versions answers `404`, as Packagist does (captured for `akrai/api~dev.json`) |
| List | `list?filter={pattern}` | `{"packageNames":[...]}`, every name or those matching a filter in which `*` matches any substring, per the reference |
| Notify | `notify-batch` | `POST` answered `200` with `{}`; the body is not stored (the resolved notify decision) |
| Dist | the grammar above | The archive bytes, `Content-Type: application/zip` or `application/x-tar`, `Content-Length`, `ETag` the sha256 |

**Minification is exact or it is corruption.** The algorithm is `MetadataMinifier::minify()`
verbatim: the first entry is emitted whole; each later entry carries only the keys whose value
differs from the running state (compared by strict equality on the decoded JSON value), and, for
every key present in the running state and absent from the entry, the string `"__unset"`; the
running state is updated key by key as it goes. The client expands with `expand()`, which
applies each diff to the previous expanded entry. Two consequences the tests must hold: a key
whose value is the literal string `__unset` in a `composer.json` cannot be represented and is
refused at publish; and ordering is part of the contract, because the diff is against the
previous entry, so a rendering that sorts differently from the one the client cached still
expands correctly (each file is self-contained) but produces a different byte stream, which the
replay corpus normalises rather than forbids. Every version's `version_normalized` is emitted,
computed by a port of `composer/semver`'s `VersionParser::normalize()` verified against that
library's own test table (the resolved normalisation decision below); an absent field would make
the client compute it, but ordering and the tagged-versus-branch split need it server-side
anyway, and a wrong one is worse than none because the client trusts it.

**`Last-Modified` must move on every change, and HTTP dates have one-second resolution.** The
client revalidates with `If-Modified-Since` only (never `If-None-Match`), so two writes to one
package inside one second would leave a client that cached between them holding a `304` for a
document that changed. The package-level document therefore records the `Last-Modified` its
documents last carried, and a write sets the new value to the later of the write time and that
value plus one second; the root document does the same in the repository-level document. `ETag`
(the sha256 of the rendered bytes) is served as well, for other clients and the corpus, and a
matching `If-None-Match` answers `304` too.

**`available-packages` is always listed on the hosted path.** It costs one array of names in a
document fetched once per change (conditional thereafter), and it buys three things: no `404`
probes for names the repository lacks, a working client-side `composer search`, and the
precondition the client places on inline advisories should a later revision render them. A
`remote` repository cannot enumerate Packagist and omits it; a `virtual` repository lists the
union of its `local` members' names only when it has no `remote` member (Design, "The proxied
path").

### Names and versions: lowercase on the wire, normalised in the store

The client lowercases every name before it builds a URL (`strtolower` at every entry of
`Repository/ComposerRepository.php`) and refuses uppercase in a requirement before any request, so the
wire carries lowercase names only, and `Package.name` is the canonical lowercase form. A
request in any other case can come only from a hand-written URL; per the resolved
request-spelling decision below it is folded and served, every URL in the response canonical,
following `nuget.md`'s resolved non-canonical-spelling decision rather than `cargo.md`'s `404`,
because no Composer client behaviour depends on a wrong spelling failing.

Versions are stored as published and compared, ordered and split by their normalised form. The
normaliser is the trap: `composer/semver` turns `1.0` into `1.0.0.0`, `v2.0.0-beta1` into
`2.0.0.0-beta1`, `1.0.0-RC1` into `1.0.0.0-RC1`, `dev-main` into `dev-main`, `1.x-dev` into
`1.9999999.9999999.9999999-dev`, and refuses what it cannot parse; the Go port is verified
against the library's own test table so that every string the client accepts, this registry
accepts, and every string it refuses, this registry refuses at publish (AC4). A version whose
normalised form is a branch (`dev-` prefix, or a `-dev` suffix) is a **branch version** and
lives in the `~dev` file; every other version is **tagged** and lives in the package file.

### The hosted write path, and what counts as a write

Nothing on the Composer wire writes, so the hosted path is fed by the registry-owned management
API, `docs/internal/plans/foundation/management-api.md` (to be authored in the spec loop). Per
the cross-format precedent (`pypi.md`'s resolved hosted-yank decision, with `npm.md`,
`ansible-collections.md`, `cargo.md`, `nuget.md` and `maven.md`), each operation is one
completed logical write through the shared write path, authorised in the settled
`(repository, action)` vocabulary with no new action, hosted only, its trigger verified by this
registry's integration tests and its effect by the real client. What this format **requires**
of that API, stated rather than designed:

| Operation | What the operation carries | Effect a client sees | Action |
|---|---|---|---|
| Publish a version | The package name, the version string, and an archive (`zip` or `tar`) whose root holds a `composer.json`; the handler validates that the archive's `name` equals the named package after lowercasing and that its `version`, when present, normalises to the named version, refusing a disagreement before any byte reaches the CAS | The version appears in the package file (or the `~dev` file), `available-packages` gains the name on its first version, a real `composer require` resolves and installs it with a matching sha1 | `push` |
| Republish a branch version | The same, naming an existing `dev-*` or `*-dev` version | The branch version's dist, sha1 and `composer.json` change; a fresh `composer update` installs the new bytes; the old dist URL leaves the head | `push` |
| Delete a version | Name and version | The version leaves its file, its dist answers `404`, a lock pinning it fails to install; a tagged version's string joins the retirement set | `delete` |
| Delete a package | Name | Both files answer `404`, the name leaves `available-packages`, every tagged version is retired, the `Package` row stays (`data-model.md`, "A package outlives its versions") | `delete` |
| Mark abandoned, or clear it | Name and either `true` or a replacement package name, or `false` | Every version renders `abandoned`; the real client prints "Package {name} is abandoned, you should avoid using it. {Use replacement instead / No replacement was suggested}." on install (`Installer.php`) | `push` |

The declaration `data-model.md` requires:

- **A publish is one completed logical write**: the version row, its document, its one `File`
  and the package-level document (name listing, `Last-Modified`) in one snapshot.
- **A branch republish is one write** that replaces the version's document and `File`; the
  previous archive stays in retained snapshots and leaves the head, per the resolved
  branch-version decision below.
- **A tagged version is immutable**: a publish naming an existing tagged version is refused with
  the same or different bytes, and a deleted tagged version is retired forever in the
  package-level retirement set, which every later write carries forward and which a backwards
  repoint must preserve (`data-model.md` AC33's obligation on the management surface). The
  reasoning is the cross-format one: a `composer.lock` pins `dist.url`, `shasum` and
  `reference`, and this registry's own proxy layer caches the archive forever, so a coordinate
  binds one set of bytes for the life of the repository. The package name is not retired: a new
  version under it publishes normally.
- **Each delete and each abandoned-state change is one write**; a package delete is one write
  however many versions it removes, per the bulk-operation rule.
- A proxied repository creates no snapshots; metadata arrival and revalidation are cache
  materialisation.

No management operation is bound to a client route, because no client route exists; the row
this format adds to `docs/internal/analysis/management-surfaces-and-the-oracle.md` is PyPI's
shape (trigger untestable by a third party, every effect testable) and is recorded as a sibling
consequence.

### Authentication: preemptive Basic or Bearer, keyed by origin with its port

The captured form is a credential sent before any challenge on every request to the origin the
client configured under `http-basic` or `bearer` in `auth.json` or `COMPOSER_AUTH`, the origin
being `host` or `host:port` exactly as it appears in the repository URL. How this meets
`auth.md`, whose rules this spec does not bend:

- **Both native forms are forms `auth.md` already verifies** (its AC31): the registry token as
  the Basic password with any username (the `pip` and `mvn` convention), or as
  `Authorization: Bearer`. Nothing new is asked of the vocabulary; `auth.md`'s client table
  needs a `composer` row, recorded as a sibling consequence, and the harness writes the issued
  token into `COMPOSER_AUTH` keyed by the registry's host **and port**, because a bare-host key
  is silently not sent (captured), which is the kind of trap a case set must name rather than
  discover.
- **The challenge is uniform and not an existence oracle.** A credential-less request under a
  repository that is not anonymously readable answers `401` with `WWW-Authenticate: Basic
  realm="..."`, byte-identical for a private, a missing and someone else's repository, the
  mechanism every sibling uses; the client does not parse the challenge, but the header is what
  makes the response uniform and what `curl` users see. A request carrying a valid credential
  that lacks `pull` answers `404`, indistinguishable from a missing repository (`auth.md` AC17),
  which the client reports as a failed root-document fetch. A rejected credential answers `401`
  and is never served as anonymous (`auth.md` AC12).
- **Non-interactive failure is loud only on a fresh cache.** Degraded mode above means a CI job
  with a stale cache and a revoked token prints a warning and succeeds from cache; that is the
  client's behaviour, recorded here so no case mistakes it for the registry's.
- **TLS.** `auth.md` requires TLS on every credential-bearing path and refuses plaintext
  credentials unless the operator's explicit flag is set (its AC27); the client refuses `http://`
  repositories from its side unless `secure-http` is disabled. The harness therefore terminates
  TLS with its CA injected into each client container through `COMPOSER_CAFILE`, the per-client
  injection `conformance-harness.md` leaves to each format, and no case sets
  `secure-http: false` (AC20).

### Addressed objects and pattern scopes

`auth.md`'s pattern scopes narrow a credential within one repository by matching the object each
request addresses, and the format declares which object each route reports ("Pattern scopes"
there; `format-handler-interface.md` AC12). The canonical object is the lowercase package name,
two segments, with the normalised version as a third where a version is addressed, computable
from every spelling any route carries.

| Route | Object kind | Canonical object |
|---|---|---|
| `packages.json` | none | - (it enumerates every name through `available-packages`) |
| `p2/{vendor}/{name}.json` and `~dev.json` | named | `{vendor}/{name}` |
| Dist download | named | `{vendor}/{name}/{version_normalized}`, from the URL |
| `list` | none | - |
| `notify-batch` | none | - (a repository-wide report; the client swallows every failure) |
| Filter summary and advisories API (proxied) | none | - (repository-wide documents; the advisories `POST` names packages in its body, which is not read before authorization) |
| Publish, republish, delete a version (management API) | named | `{vendor}/{name}/{version_normalized}`, from the operation's explicit name and version, never from the archive; an archive whose `composer.json` disagrees is refused after authorization |
| Delete a package, mark abandoned (management API) | named | `{vendor}/{name}` |

What that gives and costs, applying `auth.md`'s rules rather than re-deciding them. Every
`composer` command fetches the root document first and the root enumerates names, so a
credential holding **only** a patterned `pull` is refused at its first request and no command
works under it, the consequence `nuget.md` records for the service index and `cargo.md` for
`config.json`. Pattern narrowing on this format is therefore practical for writes: a CI
credential confined to its own packages holds an unpatterned `pull` beside a `push` patterned
`acme/**`, and publishes only under that vendor through the management API. A patterned `pull`
still narrows direct package-file and dist requests, which AC9 asserts rather than leaving
implied, and a patterned credential is refused `notify-batch`, which the client does not notice.

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines, this
format renders it in two places, per the resolved refusal-rendering decision below:

- **On the package and branch files, a refused version is omitted** from the rendered document,
  on either path, and the refusal is recorded as that spec requires. The document is the
  solver's input, one entry per version, and a whole-document `403` for one condemned version
  would refuse every other version of the package to every consumer, which is not what a rule
  scoped to a version means. A package whose every version is refused answers `403` for the file
  itself.
- **On the dist route, a refused version answers `403`** with a `text/plain` body naming the
  policy and rule, or the signal for a coordinate condemned under the shared security-signal
  rule; this is the route a lock file reaches without the package file. `403` rather than the
  existence rule's `404`, because the caller is authorized and the content is what is refused.

The body reaches nobody through the pinned clients: both print "could not be accessed (HTTP
403): HTTP/1.1 403 Forbidden", the status line, for a package file (captured) and for a dist
(captured), so the body is for `curl` and the transcript, the reason-phrase limit `pypi.md`
named and `maven.md` confirmed, here confirmed for two more clients. One consequence is recorded
rather than worked around: on a dist `403`, Composer 2.2.30 falls back to cloning the version's
`source` URL (captured, "Now trying to download from source"), which on the proxied path is the
upstream's VCS and reaches it from the client's own network, outside this registry; 2.10.3
disabled that fallback by default ("Source fallback is disabled"). A refusal on this registry
therefore governs what this registry serves, not what a client with `source-fallback` enabled
fetches elsewhere, which is the same boundary every proxied format has with a client that can
be pointed at the upstream directly.

### The supply-chain channels: pass through, never assert

Composer's malware filter lists and security advisories are the ecosystem's own supply-chain
channels, enforced by the current client at `update`, `require` and, for malware, `install`
(the `policy` config block, defaults `advisories.block: true` and malware blocking on). They
are also a way to assert an all-clear by silence: with neither key advertised, `composer audit`
prints "No security vulnerability advisories found" (captured), the same shape `nuget.md` found
for the vulnerability resource and `npm.md` for the audit endpoints. Per the resolved
supply-chain-channel decision below:

- **A hosted repository advertises neither.** This registry makes no vulnerability or malware
  claim it did not compute, and the handler cannot compute one without crossing the policy
  boundary `supply-chain-policy.md` AC4 holds. The operator documentation says so plainly and
  names the client's own remedy, a second `composer` repository entry pointing at a repository
  that does serve them, or the proxied repository below. What this format asks of
  `supply-chain-policy.md`, recorded as a sibling consequence rather than built here: an
  advisory read through `Deps` scoped to one ecosystem and a set of names, and a condemnation
  read for the same, from which a later revision of this section renders
  `security-advisories.api-url` and a `filter` list of the policy engine's own verdicts for
  hosted repositories, which would give a hosted refusal the explanatory rendering the client
  already knows how to print ("flagged as malware reported by ...").
- **A `remote` repository passes both through.** Its root advertises `filter` exactly as the
  upstream does with `summary-url` rewritten to this registry, and `security-advisories` with
  `metadata` as the upstream states it and `api-url` rewritten to this registry. The summary is
  mutable metadata with the TTL, revalidated on `If-Modified-Since` (Packagist serves
  `max-age=900` and `Last-Modified`). The advisories `POST` is forwarded to the upstream's
  `api-url` uncached (Packagist answers `private, must-revalidate`) and its answer returned
  verbatim; the per-package `filter` and `security-advisories` members of a cached package file
  pass through inside the document. The names in a forwarded `POST` are names the client would
  have sent to the upstream directly had it been configured, so nothing private leaves.
- **A `virtual` repository forwards a name only to a remote member and only when no local member
  has that package.** The client posts every name in its lock to the one `api-url` the virtual
  root advertises; a name that resolves from a `local` member is private by construction and is
  never forwarded (answered as absent), the leak `npm.md`'s audit decision exists to prevent;
  every other name is forwarded to each `remote` member and the answers merged by name in
  member order. The virtual root advertises `filter` and `security-advisories` only when it has a
  `remote` member.

The upstream's malware list is also this format's **explicit security signal** (Design, "The
proxied path", the removal table): an entry naming a coordinate this registry has cached
condemns it under the shared security-signal rule, which is what makes the pass-through a
detection channel as well as a rendering.

### Signing and provenance

Nothing on the Composer wire carries a signature or an attestation: package files are unsigned,
dist archives are unsigned, and the one integrity primitive is the sha1 `shasum`, which
Packagist leaves empty. There is nothing here for
`docs/internal/plans/foundation/artifact-verification.md` (to be authored in the spec loop) to
verify and nothing this spec must meet; advisory matching is the policy engine's
coordinate-level path (OSV carries the `Packagist` ecosystem with `vendor/name` names) and needs
no handler cooperation, and the component inventory catalogues an archive as it does any
archive. What this format asks of `docs/internal/plans/foundation/signing-service.md` (to be
authored in the spec loop): nothing.

### The proxied path

The handler owns the request and classifies for the proxy layer's fetch-and-cache API per the
settled decisions in `proxy-cache.md`; the upstream is a v2 repository base URL (Packagist or a
private v2 repository), validated at configuration to be `https://` unless the plaintext flag
is set and to answer `packages.json` with a JSON document carrying `metadata-url` (AC17). An
upstream that offers only the v1 layout or only inline `packages` is refused at configuration,
the same reason those layouts are not served.

- **The upstream root document is mutable metadata with a TTL**, cached in the repository-level
  document and never served: it is how the handler learns the upstream's `metadata-url`,
  `search`, `list`, `filter` and `security-advisories` URLs, wherever they point (Packagist's
  `search` and `list` are on `packagist.org`, its `api-url` too, its metadata and summary on
  `repo.packagist.org`). This registry's own root is rendered from it with every URL rewritten
  to this registry, `available-packages` omitted, the upstream's `warning` keys dropped and
  this registry's own emitted (Design, "Legacy layouts").
- **Package and branch files are mutable metadata with the TTL**, revalidated with
  `If-Modified-Since` (Packagist answers `304` to it, captured; `If-None-Match` also works there
  but a private upstream may lack `ETag`, so the modification time is the primary token and the
  entity tag is used when both are present). The document is served after one transform: every
  `dist.url` is rewritten to this registry's dist grammar and the upstream URL recorded as the
  version's `RemoteFile` path; `source`, `dist.reference`, `dist.shasum`, `filter`,
  `security-advisories` and everything else pass through verbatim, the `minified` diff
  re-emitted over the rewritten entries. A client's own `If-Modified-Since` inside the TTL is
  answered from the cache under this registry's `Last-Modified` and `ETag`.
- **Dist archives are immutable artifacts**, cached indefinitely under the rewritten URL. The
  fetch is **stream-and-verify against `dist.shasum` when the upstream published one** (sha1,
  the ecosystem's own primitive) and otherwise the **completion-only mode** the sibling specs
  requested of `proxy-cache.md`: a truncated body is never committed, the CAS digest of the
  complete body is recorded, and the served archive is byte-identical to what the dist host
  sent. Packagist publishes an empty `shasum` for every GitHub-hosted package sampled, so on the
  preconfigured-shaped upstream the completion-only mode is the normal case, not the exception.
- **The dist host is not the upstream** (the resolved dist-host decision below). A `remote`
  repository carries a **dist-host allowlist**, defaulting for a Packagist upstream to
  `api.github.com`, `codeload.github.com`, `github.com`, `gitlab.com` and `bitbucket.org` and
  empty for any other upstream until the operator sets it; a rewritten dist whose upstream URL
  is on a host outside the list is refused with `502` and a body naming the host, and no fetch
  is made. Fetching follows the `302` from `api.github.com` to `codeload.github.com` only within
  the list, and presents the credential the upstream adapter holds for that host (a GitHub
  token lifts the 60-per-hour unauthenticated API limit), which is what this format requires of
  `docs/internal/plans/foundation/upstream-adapters.md` (to be authored in the spec loop): a
  per-host credential for hosts the upstream's metadata sends the client to, separate from the
  upstream's own. A `429` or `5xx` from a dist host is never cached as absence and never
  committed (`proxy-cache.md` AC9).
- **Search and list are forwarded** as mutable metadata with the short TTL, keyed by the query,
  the upstream's answer returned verbatim (search results carry `packagist.org` page URLs, which
  are documentation, not resolution); the root advertises this registry's `search` URL only when
  the upstream advertises one.
- **Missing packages are negatively cached** with the short TTL: the `404` on a package file is
  how the client learns a name is not in this repository, and Packagist answers it with a
  `text/html` body this registry replaces with its own JSON `404`. The `~dev` file of a package
  with no branches is a `404` on Packagist too and is negatively cached the same way. A `429` or
  `5xx` is never cached as absence.
- **`notify-batch` is answered locally and never forwarded** (the resolved notify decision).
- **Publish, delete and abandoned-state changes against a `remote` repository answer `405`.**
- **A `virtual` repository** renders a root of its own; its package file for a name is the
  concatenation of its members' entries in member order with a version present in more than
  one member taken from the first, then minified as one list; its dist URLs are its own and
  resolve through the member that supplied the entry; `available-packages` is listed only when
  every member is `local`; `list` is the union of its members' lists.

Upstream removal maps onto the settled purge-or-flag table as Composer's side of that contract:

| Upstream event, as observed at revalidation | Classification |
|---|---|
| The upstream's malware filter summary, or a package file's `filter.malware` entries, names a coordinate this registry holds (a name and a constraint, which may cover several versions) | The **explicit security signal**: from that moment every resolution of the named versions is refused with an error naming the list and its reason, no upstream fetch of them is made, the cached references end (the purge), a refusal record is written and the operator is alerted once, per the shared security-signal rule stated verbatim in `proxy-cache.md` and `supply-chain-policy.md`. The entry also passes through to clients, so a 2.10.3 client sees the same verdict from two directions |
| A version, or the whole package, vanishes from the upstream's package file | Keep serving, record an operator-visible divergence. Packagist lets maintainers delete versions and packages and the wire carries no signal distinguishing a takedown from a cleanup; the advisory feed condemns what is malicious |
| A `security-advisories` entry appears for cached versions | An ordinary metadata change, propagated at the next revalidation and passed through; never a removal, because an advisory is not a security signal under the shared rule (it is a vulnerability, refused only under a repository's threshold policy) |
| `abandoned` appears on a package, or a branch version's `reference` and `dist.url` move | An ordinary metadata change, propagated at the next revalidation; a branch version's new reference is a new dist URL under the grammar, and the old one keeps serving until eviction |
| A dist re-fetched after eviction differs from the recorded digest, and the upstream published **no** `shasum` | A **re-materialisation with a recorded divergence, not a purge**: the ecosystem makes no byte promise for such a dist (Packagist publishes an empty `shasum` for every GitHub-hosted archive sampled, because the archive is generated by the dist host on request rather than stored), so a changed archive is not evidence of an immutability violation. The recorded digest is replaced and the divergence is operator-visible |
| A dist re-fetched after eviction disagrees with a `shasum` the upstream **did** publish | A verification failure: never committed, the client's download fails, the operator is alerted; the same stream-and-verify rule as any digest-bearing format |

Detection happens at revalidation, passively, per `proxy-cache.md`'s resolved passive-detection
decision (was Q12); the active channel is the policy engine's advisory feed, which carries the
`Packagist` ecosystem through OSV, and a malware entry arriving through it and one arriving
through the upstream's list are one condemnation, never two purges.

Per the resolved preconfigured-upstream decision below, Packagist stays user-configured in v1,
the answer `cargo.md` and `pub.md` adopted for their Tier 2 upstreams and `proxy-cache.md`
confirmed (its resolved preconfigured-set extension, was Q14); the dist-host default above
applies whenever an operator configures it.

### Legacy layouts are refused with the ecosystem's own warning

The root document carries `warning` and `warning-versions: "<2"`, which Composer 1 prints
("Warning from {url}: ...", captured on 1.10.28) and Composer 2 ignores because its version is
outside the constraint (captured on both), exactly the mechanism Packagist uses for its own
shutdown notice. The message names the shutdown and the upgrade command. Requests under `/p/`
and `/include/` answer `404`. A Composer 1 client then fails with "Could not find a matching
version of package" after fetching only the root document (captured), the same outcome it gets
from Packagist today.

### Conformance, the pinned clients and the corpus

The two pinned Composer 2 releases straddle the ecosystem's real watershed: 2.2.30 is the LTS
line without `audit`, without advisory blocking and without filter lists, and with the
source-clone fallback on dist failure still enabled; 2.10.3 is current, blocks advisory-affected
and malware-listed versions by default, and fetches the root document even on a lock install.
Every hosted and proxied case runs on both; the channel cases assert enforcement on 2.10.3 and
its absence on 2.2.30. Composer 1.10.28 on PHP 7.4 runs the single legacy case (AC16) and
nothing else; it is not a supported client and appears in no matrix row.

The recorded surface for the replay corpus, named now because a thin recording script yields a
thin specification: reads against Packagist (a cold `composer require` of a package with a
transitive dependency, the same under `minimum-stability: dev` so `~dev` replays, a warm
`composer update` for the conditional requests, `composer install` from a lock on both releases,
a missing package, `composer show`, `composer audit` and a `require` blocked by an advisory, and
an install with the malware summary fetched); and hosted flows against a reference v2 repository
run in a container and pinned by digest, because no public Composer repository accepts an
upload (a Satis-generated site served statically, with its `metadata-url` set to an absolute
URL, is the reference for reads; writes have no reference and are exercised by this registry's
own cases). Recording gates on the harness's redaction criterion (`conformance-harness.md`
AC13); the Basic and Bearer values are exactly the headers an allowlist must name. Every
deliberate divergence from Packagist goes on the recorded exception list before its flow is
expected to replay: the JSON `404` body where Packagist sends `text/html`, `available-packages`
present on hosted roots, the rewritten dist URLs and the dropped `providers-url`,
`metadata-changes-url` and `providers-api` keys, the field order of re-minified documents, and
the empty `{}` answered to `notify-batch`.

## Acceptance Criteria

- [ ] AC1: `composer require` resolves and installs a package and its transitive dependency from a
      hosted repository configured as a format-first URL, on both pinned Composer releases
      (2.2.30 and 2.10.3), with the transcript showing the root document, one package file per
      package with lowercase names, no `~dev` request for a stable requirement under
      `composer update`, both files under `minimum-stability: dev`, each dist fetched by an
      absolute URL under this registry with a body whose sha1 equals the advertised `shasum`,
      and the `notify-batch` `POST` answered `200`; a warm `composer update` sends
      `If-Modified-Since` on every document, receives `304` and fetches no dist, and a resolve
      from a fresh `COMPOSER_HOME` and `COMPOSER_CACHE_DIR` makes every request again, both
      asserted at the network layer.
- [ ] AC2: `composer install` from a `composer.lock` produced against this registry, with a fresh
      cache, installs bytes identical to the published archives on both releases, the
      transcript showing only dist requests plus `notify-batch` (and the root document on
      2.10.3), every `dist.url` in the lock absolute under this registry's base URL, and a lock
      whose dist URL names a version since deleted fails with a `404` named in the client's
      output.
- [ ] AC3: A `composer require` of a name absent from a hosted repository makes no package-file
      request and fails naming the package, because `available-packages` lists every lowercase
      `Package.name`; `composer search` finds the repository's names from that listing with no
      further request and `composer show` of a package fetches its package file and its `~dev`
      file; a direct request for an absent package file, for the `~dev` file of a package with
      no branch versions, and for the package file of a package with no tagged versions each
      answers `404` with a JSON body, and a request in any other case of the name is folded and
      served with canonical URLs; and a package's first publish adds its name to
      `available-packages`.
- [ ] AC4: Every served package and branch file carries `"minified":"composer/2.0"` and expands
      through the client's `MetadataMinifier::expand()` to exactly the per-version entries the
      registry holds, with the first entry whole, each later entry a diff, and a key absent from
      a later version rendered as `"__unset"`, proven by a fixture whose versions add and drop
      keys; entries are ordered newest first by normalised version; `version_normalized` is
      computed by the registry's port of `composer/semver`'s normaliser, which passes that
      library's own normalisation test table verbatim (`1.0` to `1.0.0.0`, `v2.0.0-beta1` to
      `2.0.0.0-beta1`, `dev-main` unchanged, `1.x-dev` to `1.9999999.9999999.9999999-dev` among
      them), accepting every string it accepts and refusing every string it refuses at publish;
      a version whose normalised form carries the `dev-` prefix or the `-dev` suffix is served
      from the `~dev` file and every other version from the package file; and a `composer.json`
      value equal to the literal string `__unset` is refused at publish.
- [ ] AC5: Publishing a version through the registry-owned management API with an archive whose
      root `composer.json` matches the named package and version makes a real `composer
      require` on both releases install it with a matching sha1 in exactly one snapshot; an
      archive whose `name` disagrees after lowercasing, whose `version` normalises to something
      other than the named version, whose name fails the client's grammar or carries uppercase,
      or whose version the normaliser refuses, is refused with no snapshot; a publish naming an
      existing tagged version is refused with the same bytes and with different ones, including
      after the version was deleted and after the deletion's snapshot has been pruned out of
      retention, while a new version under the same name publishes normally; and a publish
      naming an existing branch version (`dev-*` or `*-dev`) replaces its archive in one
      snapshot, a fresh `composer update` installs the new bytes, and the previous dist URL
      answers `404`.
- [ ] AC6: Deleting a version, deleting a package and marking a package abandoned through the
      management API each produce exactly one snapshot; after a version delete the package file
      omits it, its dist answers `404` and a real `composer require` of that exact version fails;
      after a package delete both files answer `404`, the name leaves `available-packages`, the
      `Package` row and its retirement set survive, and a real `composer require` of the name
      fails; after an abandoned mark with a replacement a real install on both releases prints
      "is abandoned" naming the replacement, and clearing the mark stops it; a principal holding
      only `pull` is refused every operation with no snapshot created, `delete` is required for
      the deletes and `push` for publish and the abandoned mark; and every operation against a
      proxied repository answers `405`.
- [ ] AC7: A dist served on the hosted path carries `Content-Type`, `Content-Length` and an
      `ETag`, its bytes hash to the `dist.shasum` and `dist.reference` the package file
      advertises, and a version seeded through `state` with a `shasum` that disagrees with its bytes makes a real
      install on both releases fail with the checksum verification error naming the URL, with
      exactly one dist request in the transcript.
- [ ] AC8: On a private repository a credential-less request answers `401` with
      `WWW-Authenticate: Basic` byte-identical for a private and a non-existent repository; both
      pinned releases then resolve and install with the token in `COMPOSER_AUTH` as an
      `http-basic` password keyed by host and port, and again as a `bearer` value, every
      request including the dist and the `notify-batch` `POST` arriving with the credential
      before any challenge; the same token keyed by the bare host is not sent and the run fails
      with the `401` in the client's output from a fresh cache; a rejected credential answers
      `401` and is never served as anonymous; a valid token lacking `pull` answers `404` on the
      root document; and a credential presented over a connection this registry did not
      terminate with TLS is refused per `auth.md` AC27.
- [ ] AC9: A token holding an unpatterned `pull` and `push` under the pattern `acme/**` publishes
      `acme/tool` through the management API and is refused publishing `other/tool`, with no
      snapshot created by the refusal; with `delete` under the same pattern it deletes
      `acme/tool` versions and is refused `other/tool`; a token holding only a patterned `pull`
      is refused the root document so no `composer` command succeeds under it, while a direct
      package-file and dist request for `acme/tool` under it succeeds and the same for
      `other/tool` is refused; and in proxied mode the patterned-`pull` token fetches an
      in-pattern package file and dist and is refused another.
- [ ] AC10: A version the shared policy layer refuses is omitted from the package or branch file
      on the hosted and the proxied path, a package whose every version is refused answers `403`
      for its file, and the refused version's dist answers `403` with a `text/plain` body naming
      the policy or the signal, with the body captured in the transcript; a real `composer
      require` of an exact refused version on both releases fails naming no such version, and a
      real `composer install` from a lock pinning it fails naming the `403`; and on 2.10.3 no
      `source` fetch follows the refusal, asserted at the network layer, while 2.2.30's attempt
      to clone the `source` URL is recorded in the transcript as the client's own egress.
- [ ] AC11: The proxied path resolves a package and its dependency from a v2 upstream stand-in on
      both releases and, from fresh client caches, a second resolve reaches this registry while
      the upstream and the dist host receive no request, both asserted at the network layer;
      the served root document carries no upstream URL and no `available-packages`; every
      `dist.url` in a served package file is under this registry's grammar with the upstream
      version's `dist.reference` as its key; each dist is fetched from the dist-host stand-in
      through its `302`, verified against `dist.shasum` when the stand-in publishes one and
      through the completion-only mode when it publishes an empty one, a truncated body never
      committed, and served byte-identical; a dist whose upstream URL is on a host outside the
      repository's allowlist answers `502` naming the host with no fetch made, the default
      allowlist for a Packagist upstream naming `api.github.com`, `codeload.github.com`,
      `github.com`, `gitlab.com` and `bitbucket.org` and no other host; a missing package
      file and a missing `~dev` file are each negatively cached with a JSON `404` while a `429`
      or `5xx` from the upstream or the dist host is not; and the dist route for a URL a lock
      file pinned still resolves after the cached package file has been evicted.
- [ ] AC12: A proxied package file is revalidated after its TTL and not before, with
      `If-Modified-Since` so an unchanged document costs a `304` upstream; a version published
      upstream becomes visible to `composer update` after the TTL and, absent an explicit
      refresh, not before; a client `If-Modified-Since` inside the TTL is answered `304` from the
      cache; and on the hosted path two publishes to one package inside one second yield
      strictly increasing `Last-Modified` values so a client that cached between them receives
      `200` rather than `304`.
- [ ] AC13: A `remote` repository's root advertises `filter` with `filter.summary-url` rewritten
      to this registry and `security-advisories` with `security-advisories.api-url` rewritten,
      the summary is served from cache with the TTL and revalidated on `If-Modified-Since`, and
      the `POST` to the rewritten `api-url` is forwarded uncached with the upstream's answer
      returned verbatim; a real `composer require` on 2.10.3 skips a version the upstream's
      malware summary names and fails an exact requirement of it naming the list, is blocked
      from a version the advisories API covers, and `composer install` from a lock pinning the
      listed version fails, while 2.2.30 installs both; a `virtual` repository with a `local`
      and a `remote` member forwards to the remote member only the names no local member holds,
      asserted at the network layer with a private name in the client's lock; and a hosted
      repository advertises neither key, with `composer audit` on 2.10.3 reporting no
      advisories and the operator documentation naming the gap.
- [ ] AC14: An upstream malware-list entry naming a cached coordinate condemns the versions it
      covers under the security-signal rule: every cached reference ends, the next request for
      such a version is refused naming the list with no upstream request, a refusal record
      remains queryable after the sweep, and exactly one operator alert is raised; a version
      vanishing from the upstream's package file keeps serving with a divergence recorded; an
      advisory entry or an `abandoned` mark appearing propagates as an ordinary metadata
      change; a dist re-fetched after eviction whose bytes differ, with an empty upstream
      `shasum`, is re-materialised with a divergence recorded and no purge; and one whose bytes
      disagree with a published `shasum` is never committed and raises the alert: Composer's
      side of the settled removal table in `proxy-cache.md` (its AC13).
- [ ] AC15: The registry's own `Last-Modified` and `ETag` are served on the root document and on
      every package and branch file on both paths, a matching `If-Modified-Since` or
      `If-None-Match` answers `304` with an empty body, and every `404` on a package or branch
      file is answered without any upstream request on the hosted path.
- [ ] AC16: The hosted root document carries no `providers-url`, `provider-includes`,
      `includes`, inline `packages`, `mirrors`, `providers-api` or `metadata-changes-url`;
      requests under `/p/` and `/include/` answer `404`; the root carries `warning` and
      `warning-versions: "<2"`, which
      Composer 1.10.28, pinned by the `php:7.4-cli` image digest with the 1.10.28 phar, prints
      before failing to find any version, and which neither pinned Composer 2 release prints;
      and a `remote` repository whose upstream root lacks `metadata-url` is refused at
      configuration naming the requirement.
- [ ] AC17: Configuring a remote repository whose upstream URL is `http://` without the plaintext
      flag, or whose root document lacks `metadata-url`, is refused at configuration; a
      `virtual` repository's package file is the member-ordered concatenation of its members'
      entries with a duplicated version taken from the first member, its dist URLs are its own
      and resolve through the supplying member, `available-packages` is present only when every
      member is `local`, and `list` is the union, each proven by a real resolve that succeeds
      only through the merge.
- [ ] AC18: Replay-match passes against a corpus recorded from Packagist and from the pinned
      static reference repository covering the recorded surface named in Design.
- [ ] AC19: Every package and branch file on the hosted path is rendered from version rows at
      request time, proven by an architecture test that the handler writes no rendered
      document into any metadata level, and by a mutation to a version's document being
      visible in the next rendered file with no regeneration step in between.
- [ ] AC20: An `http://` externally visible base URL is refused at configuration unless the
      plaintext flag is set, and with TLS terminated by the harness with its CA in each client's
      `COMPOSER_CAFILE`, every pinned client resolves, installs and posts `notify-batch` with
      `secure-http` at its default.
- [ ] AC21: The hosted `list` route answers every package name as `packageNames`, filters with
      `*` matching any substring when `?filter=` is given, is refused to a patterned credential,
      and on the proxied path returns the upstream's answer from cache within the short TTL; a
      forwarded `search` on the proxied path likewise returns the upstream's answer, its
      `packagist.org` page URLs untouched, from cache within the short TTL, and no `search` key
      is advertised on a hosted root.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/composer/hosted_test.go` (both pinned releases; `require` then `update`; fresh `COMPOSER_HOME` and `COMPOSER_CACHE_DIR` in setup; network-level assertions for the warm and fresh runs; `minimum-stability` variants) |
| AC2 | conformance | `conformance/composer/lockfile_test.go` (lock produced in-case, fresh cache, byte comparison; deleted-version lock through a `state` mutation) |
| AC3 | conformance + integration | `conformance/composer/missing_test.go` (no package-file request under the listing; `composer search` and `composer show` transcripts); `internal/format/composer/render_test.go` (`404` bodies for absent, branch-less and tag-less packages; listing gains a name) |
| AC4 | unit | `internal/format/composer/minify_test.go` (round trip through a port of `expand()`, the `__unset` fixture, ordering); `internal/format/composer/normalize_test.go` (the `composer/semver` test table committed as a golden fixture; refusal parity; the literal `__unset` refusal) |
| AC5 | integration + conformance | `internal/format/composer/publish_test.go` (archive validation cases, snapshot count, immutability with same and different bytes, after deletion, after pruning under an injected clock, branch replacement); `conformance/composer/publish_test.go` (the `script` publishes through the management endpoint, then real `require` and `update`) |
| AC6 | integration + conformance | `internal/format/composer/manage_test.go` (one snapshot per operation, retirement set survival, `pull`-only refusal, action mapping, `405` on remote); `conformance/composer/manage_test.go` (real installs failing after deletes; the abandoned warning on both releases) |
| AC7 | conformance + unit | `conformance/composer/checksum_test.go` (seeded mismatch through `state`, one dist request); `internal/format/composer/dist_test.go` (headers, `shasum` and `reference` equality) |
| AC8 | conformance + integration | `conformance/composer/auth_test.go` (private repository on both releases; challenge equality across existing and missing repositories; `http-basic` and `bearer` through `COMPOSER_AUTH` keyed by host and port; the bare-host negative from a fresh cache; rejected credential; `pull`-less token); `internal/format/composer/auth_test.go` (plaintext refusal under `auth.md` AC27) |
| AC9 | conformance + unit | `conformance/composer/auth_test.go` (the pattern-refusal case `format-handler-interface.md` AC7 requires, in both modes; pattern-scoped tokens through the `credentials` key; management-endpoint publishes and deletes; direct file and dist requests); `internal/format/composer/scope_object_test.go` (the object table, per route, `format-handler-interface.md` AC12) |
| AC10 | conformance | `conformance/composer/policy_test.go` (hosted and proxied modes; rules through the `policies` key, a controlled advisory through `advisories`; omission from the file, `403` on the dist with the body in the transcript; exact-version `require` and lock install on both releases; network-level assertion of no `source` fetch on 2.10.3) |
| AC11 | conformance + integration | `conformance/composer/proxied_test.go` (v2 upstream stand-in and a dist-host stand-in answering `302` then bytes; transcript and network-level assertions; fresh client caches; byte comparison; `shasum` and empty-`shasum` variants; allowlist refusal; negative caching; throttling); `internal/format/composer/proxied_verify_test.go` (completion-only mode, truncation, `RemoteFile` resolution after eviction) |
| AC12 | conformance + integration | `conformance/composer/proxied_ttl_test.go` (mutating stand-in serving `Last-Modified`; upstream and client `304`s at the network layer); `internal/format/composer/lastmodified_test.go` (two writes in one second under an injected clock) |
| AC13 | conformance + integration | `conformance/composer/channels_test.go` (stand-in advertising `filter` and `security-advisories`; malware and advisory cases on 2.10.3 with the 2.2.30 negatives; the virtual forwarding case with a private name asserted at the network layer; the hosted `audit` case); `internal/format/composer/channels_test.go` (URL rewriting, summary caching, uncached forwarding, the name-forwarding rule) |
| AC14 | integration | `internal/format/composer/removal_test.go` (stand-in presenting each event class; the shared-layer half is `proxy-cache.md` AC13's) |
| AC15 | integration | `internal/format/composer/conditional_test.go` (`Last-Modified`, `ETag`, `304` on both validators, no upstream request on a hosted `404`) |
| AC16 | conformance + integration | `conformance/composer/legacy_test.go` (Composer 1.10.28 on the pinned `php:7.4-cli` image; the warning in its output; no warning on either Composer 2 release); `internal/format/composer/render_test.go` (absent keys, `/p/` and `/include/` `404`s); `internal/format/composer/upstream_config_test.go` (v1-only upstream refused) |
| AC17 | integration + conformance | `internal/format/composer/upstream_config_test.go` (`http://` upstream, missing `metadata-url`); `conformance/composer/virtual_test.go` (a virtual repository over a local and a remote member; a resolve that succeeds only through the merge; listing presence per member set) |
| AC18 | conformance | `conformance/composer/replay_test.go` |
| AC19 | architecture test + integration | `internal/format/composer/arch_test.go` (no stored rendering; render-on-request); `internal/format/composer/render_test.go` (a document mutation visible in the next render) |
| AC20 | integration + conformance | `internal/format/composer/base_url_test.go` (configuration refusal); every conformance case above runs behind the harness's TLS termination with `COMPOSER_CAFILE` set and no `secure-http: false` in any case's `composer.json`, asserted by the case definitions carrying none |
| AC21 | integration + conformance | `internal/format/composer/list_test.go` (filter semantics, patterned refusal, no hosted `search` key); `conformance/composer/proxied_test.go` (forwarded list and search from cache at the network layer) |

The case set needs only keys already in the harness's closed `setup` vocabulary (its resolved
closed-vocabulary decision, was Q4): `repositories` with their visibility and type,
`credentials`, an `upstreams` stand-in (two here, the v2 repository and the dist host, both
images pinned by digest), `state` for pre-published versions, a seeded `shasum` mismatch and a
deleted version, and `policies` with `advisories` for AC10. The issued credential reaches the
client as `COMPOSER_AUTH` keyed by the registry's host and port. The runner-enforced
obligations, both modes and the unauthenticated, unauthorized and pattern-refusal cases in
each, apply from the sibling specs and are not restated per criterion here.

## Implementation Phases

### Phase 1: Hosted reads
- The format-first mount and the externally visible base URL, the root document with
  `available-packages` and the legacy warning, package and branch files rendered on request
  with exact minification and the normaliser port, the tagged-versus-branch split, the dist
  grammar with `shasum` and `reference`, `Last-Modified` and `ETag` with the one-second rule,
  the `list` route, the challenge and scope mapping, the per-route addressed objects and the
  refusal rendering (omission on the files, `403` on the dist)

### Phase 2: The hosted write path
- Waits on `docs/internal/plans/foundation/management-api.md` reaching `planned` (Blocking
  preconditions)
- Publish with archive validation, branch replacement, tagged immutability and the retirement
  set, delete a version, delete a package, the abandoned mark, the write-boundary declaration
  exercised end to end

### Phase 3: Proxied path
- Upstream validation, root rewriting, package-file caching and dist URL rewriting,
  `If-Modified-Since` revalidation, the dist-host allowlist with redirect following and the
  adapter credential, `shasum` and completion-only verification, negative caching, search and
  list forwarding, the supply-chain channel pass-through with the virtual forwarding rule, the
  removal table with the malware list as the explicit signal, the virtual merge, `405` on
  remote writes

### Phase 4: Corpus and gate
- Recording session across the named surface (after the harness redaction gate), replay-match,
  the second pinned Composer release, the Composer 1 legacy case, the matrix rows for the
  deliberately unimplemented layouts and channels

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. The nine questions this draft raised were each written in the template's decision
shape and then adopted at their own recommendation under the owner's standing delegation of
2026-09-26, so the loop can continue; each is recorded below as adopted rather than decided,
folded through Scope, Design, the criteria and the Test Plan in the same pass, and reversible by
the owner at any time. `grep -rn "standing delegation"` is the owner's review queue.

### Resolved: the Composer 1 layouts are not served (was Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: neither the v1
`provider-includes` and `providers-url` layout nor the whole-repository `includes` and inline
`packages` layouts are served; the root carries the ecosystem's `warning` with
`warning-versions: "<2"`, and a v1-only upstream is refused at configuration (Scope; Design,
"Legacy layouts are refused with the ecosystem's own warning"; AC16).

The question: the documentation says a repository "ideally" provides both layouts for
compatibility, both pinned Composer 2 releases resolve from the v1 layout when the fixture
carries a `uid` per version (captured), and Satis still emits `includes` by default.

**Recommendation:** A. Packagist itself ended v1 metadata on 2025-08-01 and its live root tells
every Composer 1 client so; the only client that needs the layout crashes on the PHP its own
image ships; the layout needs per-version `uid`s and content-hashed filenames that are a second
rendering of every document; and the whole-repository layouts are O(repository) documents that
`metadata-url` exists to replace.

| Option | You get | It costs |
|---|---|---|
| **A. Serve v2 only; warn Composer 1 as Packagist does** | One rendering path; no hashed-filename document set; the same answer the ecosystem's own registry gives | A Composer 1 client cannot resolve from this registry, which is already true of Packagist |
| **B. Serve v1 beside v2** | Composer 1 keeps working against private repositories | A second document set with `uid`s, `provider-includes` hashes and `%hash%`-named files to render and keep consistent under concurrency, for a client that cannot run on current PHP |
| **C. Serve `includes` for Satis parity** | Byte-level familiarity for Satis users | A document that enumerates every version of every package, refetched on every change |

**Why this is yours:** it refuses a documented layout, a compatibility promise the product makes.

Accepted cost: one warning message to document, and the exception-list entries for the
dropped root keys.

### Resolved: package files are emitted minified (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: every package and branch
file is emitted minified with `"minified":"composer/2.0"`, the diff computed by an exact port of
`MetadataMinifier::minify()` and verified by round trip through a port of `expand()` (Design,
"The rendered documents"; AC4).

The question: minification is optional for the client, Packagist minifies, Satis minifies, and
the algorithm's `__unset` token is the trap the format hints named.

**Recommendation:** A. Both pinned releases expand it, Packagist's 90-version monolog file is
84 KB minified where the expanded form is several times that, and the replay corpus recorded
from Packagist is minified, so an expanded rendering would put every package file on the
exception list.

| Option | You get | It costs |
|---|---|---|
| **A. Minified, exactly as the library does it** | Packagist-shaped documents; smaller transfers; corpus replay without normalisation of the shape | An exact port whose one bug corrupts every version after the first, held by the round-trip test |
| **B. Expanded** | No diff algorithm to port | Larger documents, and every recorded package file diverges from ours in shape |

**Why this is yours:** it trades an implementation hazard for fidelity, on the document every
resolve reads.

Accepted cost: the round-trip and `__unset` fixtures, and the refusal of a literal `__unset`
value at publish.

### Resolved: branch versions are mutable, tagged versions are not (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a `dev-*` or `*-dev`
version may be republished, replacing its archive in one write under a new dist URL; a tagged
version is immutable and, once deleted, retired forever (Design, "The hosted write path"; AC5,
AC6).

The question: Composer's branch versions are, by the ecosystem's definition, moving targets
whose `reference` changes on every push, while the cross-format rule the sibling specs adopted
is that a version binds one set of bytes for the life of the repository.

**Recommendation:** A. A lock file pins a branch version by `reference`, not by version string,
so replacing the archive under a new key contradicts no consumer that pinned the old one, and a
registry that refused to update `dev-main` would make branch versions useless; tagged versions
carry the immutability every lock file and this registry's own proxy cache depend on.

| Option | You get | It costs |
|---|---|---|
| **A. Branch versions mutable under a keyed URL; tagged versions immutable and retired** | The ecosystem's own semantics for both kinds; lock files never contradicted | An old branch archive leaves the head on replacement, so a lock pinning it fails to install once it is replaced, as it does against Packagist when a branch is force-pushed |
| **B. Every version immutable** | One rule | Branch versions cannot move, which is what a branch version is for |
| **C. Every version mutable** | Operators can fix a tag in place | Every lock file that pinned the old `shasum` fails, and the proxy layer's cache-forever classification of dists becomes wrong |

**Why this is yours:** it decides what a version promises on this registry, per kind.

Accepted cost: the retirement set in the package-level document, carried by every later write.

### Resolved: non-canonical request spellings are folded (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a request naming a
package in any case is lowercased and served, every URL in the response canonical (Design,
"Names and versions"; AC3 through the canonical listing).

The question: the client never sends a non-lowercase name, Packagist's CDN folds one (captured
`200`), `nuget.md` chose to fold and `cargo.md` chose `404` because a client behaviour depended
on it.

**Recommendation:** A, `nuget.md`'s reasoning applied: folding is deterministic and free, the
canonical object for pattern scopes is the lowercase name regardless, and no Composer client
behaviour depends on a wrong spelling failing.

| Option | You get | It costs |
|---|---|---|
| **A. Fold and serve** | Every spelling works; one canonical URL space in every response | A hand-written URL is silently accepted, so a script that writes one never learns it |
| **B. `404` on non-canonical spellings** | Strictness | `curl` users who copy a display name get a `404` Packagist would not give them |

**Why this is yours:** it is the naming promise scripts build on.

Accepted cost: none beyond the acceptance.

### Resolved: the supply-chain channels on each path (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a hosted repository
advertises neither `filter` nor `security-advisories`; a `remote` repository passes both through
with its URLs rewritten, the summary cached and the advisories `POST` forwarded uncached; a
`virtual` repository forwards a name to its remote members only when no local member holds it;
and the policy engine's own verdicts are rendered through these channels by a later revision
once `supply-chain-policy.md` exposes an advisory read, recorded as a sibling consequence
(Design, "The supply-chain channels"; AC13).

The question: the channels are the ecosystem's native supply-chain surface and the current
client enforces them by default, so a hosted repository that advertises nothing silences
`composer audit`, while advertising data this registry did not compute is the false all-clear
`npm.md` and `nuget.md` refused, and forwarding a virtual repository's audit names to Packagist
leaks private package names.

**Recommendation:** A. It advertises only what was computed by someone (the upstream), forwards
only names the client would have sent to that upstream anyway, and leaves the hosted rendering
to the spec that owns the data rather than building an advisory surface twice.

| Option | You get | It costs |
|---|---|---|
| **A. Pass through on remote; local names never forwarded; nothing on hosted until the policy engine backs it** | No false all-clear; no leak; a Packagist cache loses no audit or malware signal | `composer audit` against a hosted repository reports nothing, documented as a gap, until the revision lands |
| **B. Render the policy engine's verdicts on hosted now** | Hosted refusals explained in the client's own words | Builds on an advisory read `supply-chain-policy.md` does not yet expose, the duplicate-surface trap |
| **C. Forward every name on a virtual repository** | Simplest forwarding | Sends private package names to a third party, the dependency-confusion leak |

**Why this is yours:** it sets what this registry asserts about vulnerabilities and what it
tells a third party, a security-posture and privacy claim.

Accepted cost: the documented hosted gap and the per-name forwarding rule to implement and test.

### Resolved: dists live on other hosts (was Q6)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a `remote` repository
carries a dist-host allowlist, defaulting for a Packagist upstream to the GitHub, GitLab and
Bitbucket hosts and empty otherwise; a dist outside it is refused with `502` and never fetched;
redirects are followed within the list only; and the upstream adapter holds a per-host
credential for those hosts (Design, "The proxied path"; AC11).

The question: Packagist's metadata sends the client to `api.github.com` for every sampled
dist, which redirects to `codeload.github.com` under a 60-per-hour unauthenticated rate limit,
and the proxy layer's fetch-and-cache API is shaped for one upstream origin; nothing in
`proxy-cache.md` says whether a handler may ask it to fetch from a host the upstream named.

**Recommendation:** A. Open fetching from any host the metadata names would make the proxy an
egress relay to arbitrary hosts, which is the boundary `format-handler-interface.md` AC6
exists to hold; refusing every off-origin dist would make a Packagist cache cache nothing; an
allowlist with a Packagist default and a credential per host is what Private Packagist's
mirroring effectively is.

| Option | You get | It costs |
|---|---|---|
| **A. A per-repository dist-host allowlist with a Packagist default and adapter credentials** | A working Packagist cache; bounded egress; the rate limit lifted with a token | A configuration surface and a requirement on two shared specs |
| **B. Fetch from any host the metadata names** | No configuration | An open egress relay from the proxy layer |
| **C. Refuse every off-origin dist** | No new shared-layer requirement | A Packagist cache that serves metadata and no archives |

**Why this is yours:** it widens where the proxy layer may send bytes to, a security boundary.

Accepted cost: the sibling consequences for `proxy-cache.md` and `upstream-adapters.md`.

### Resolved: Packagist as a preconfigured upstream (was Q7)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: Packagist stays
user-configured in v1, with the dist-host default applying whenever it is configured; the
preconfigured set is extended only through `proxy-cache.md`'s own mechanism once a `continue`
breadth-gate verdict authorizes this format to build (Design, "The proxied path").

The question: `proxy-cache.md`'s resolved preconfigured-set extension (was Q14) keeps Tier 2
upstreams user-configured until their formats are authorized, and `cargo.md` and `pub.md`
adopted exactly that for crates.io and pub.dev.

**Recommendation:** A, the precedent applied: preconfiguring an upstream commits a support
surface and a nightly job row to a format the gate may park.

| Option | You get | It costs |
|---|---|---|
| **A. User-configured until the format is authorized** | No support surface for an unbuilt format; consistent with the Tier 2 siblings | A worse first-run story for PHP users if and when the format ships, until the extension lands |
| **B. Preconfigure now** | A Packagist cache out of the box | Contradicts the proxy-cache decision and commits a nightly row and GitHub-token handling before any evidence the format ships |

**Why this is yours:** it extends a set the owner priced.

Accepted cost: an extension question to raise at build time.

### Resolved: what `notify-batch` does (was Q8)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the `POST` is answered
`200` with `{}` on every path, its body discarded, and never forwarded to an upstream (Design,
"The rendered documents", "The proxied path"; AC1).

The question: the client posts installed names and versions after every install, Packagist
counts downloads from it, and a proxied repository could forward it so the upstream's
statistics stay whole.

**Recommendation:** A. Forwarding sends the names and versions of everything a private
project installs to a third party, the same leak as forwarding an audit request; storing them
is a statistics feature with no oracle and no consumer until the UI exists; the client
swallows every failure, so an honest `200` costs nothing.

| Option | You get | It costs |
|---|---|---|
| **A. Accept, discard, never forward** | No leak; no unconsumed data | Packagist's download counts miss installs that went through this cache |
| **B. Forward on the proxied path** | Whole upstream statistics | A `POST` naming every installed private package to a third party |
| **C. Store as download statistics** | A future UI feature | Storage and a schema for data nothing reads yet |

**Why this is yours:** it decides what this registry tells a third party about its users'
installs.

Accepted cost: an exception-list entry for the `{}` body.

### Resolved: how a policy refusal renders on the metadata route (was Q9)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a refused version is
omitted from the package or branch file, a package whose every version is refused answers
`403` for the file, and the refused version's dist answers `403` with a `text/plain` body
(Design, "Policy refusals on the wire"; AC10).

The question: `npm.md` and `nuget.md` answer `403` on the document route, but a Composer
package file is the solver's input listing every version, and a rule scoped to one version
would refuse every version to every consumer if the whole file were refused.

**Recommendation:** A. Omission is exactly what the client's own filter lists do to a listed
version (it is "filtered away" from the pool, captured), so the solver's behaviour is the one
the ecosystem already defines; the dist route keeps the loud `403` for the lock-file path that
never reads the package file.

| Option | You get | It costs |
|---|---|---|
| **A. Omit from the file; `403` on the dist** | Version-scoped refusal that the solver handles natively; lock installs fail loudly | The client's message for a fresh resolve is "could not be found in any version", which names no policy; the transcript and the refusal record carry the reason |
| **B. `403` on the whole file when any version is refused** | The sibling specs' shape | One condemned version makes the package unresolvable at every version |
| **C. Render refused versions as `filter` entries** | The client explains the refusal in its own words | Requires advertising `filter` lists on hosted repositories, which the resolved channel decision (was Q5) defers until the policy engine backs them |

**Why this is yours:** it decides what a consumer sees when a version is refused, per route.

Accepted cost: an unexplained absence in the client's output on a fresh resolve, and C
recorded as the revision that follows the channel decision's.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | 9669f4b | authoring pass: grounded first draft, not a review | Grounded the wire contract three ways: captured traffic from Composer 2.10.3 and 2.2.30, pinned by digest, run in containers against a logging stub serving the documented repository shapes (cold and warm `require`, `update`, `install` from a lock, `show`, `search`, `audit`; `~dev` under `stable` and `dev`; a missing package with and without `available-packages`; a wrong `shasum`; `http-basic` and `bearer` through `COMPOSER_AUTH` keyed by host with and without the port; no credentials; `secure-http` at its default; relative, path-absolute and absolute `metadata-url` and dist URLs; an uppercase name; a malware filter list and an inline advisory on both releases; the v1, inline and `includes` layouts; `403` on a package file and on a dist; `--prefer-source` against an unreachable VCS), plus Composer 1.10.28 on a pinned `php:7.4-cli` image for the v1 layout, the `uid` requirement and the root warning; the Composer repository, config and authentication documentation and the client, metadata-minifier and Satis sources at 2026-09-25, and the Packagist Composer 1 shutdown post; and the live repo.packagist.org (root keys, p2 headers and minification, inline advisories, GitHub zipball dists with empty `shasum` and their `302` and rate limit, `304` on both validators, `404` bodies, a CDN case fold, the malware summary, the advisories `POST`, `list.json`). Design built from that: absolute URLs everywhere because the client resolves path-absolute ones against scheme and host only and relative ones not at all; documents rendered on request with exact minification, a normaliser port and a one-second `Last-Modified` rule; `available-packages` on hosted roots; the hosted write path stated as requirements of the management API with a per-operation write boundary, tagged immutability with a retirement set and mutable branch versions; preemptive Basic or Bearer keyed by origin with the port, the uniform challenge and the degraded-mode trap; the lowercase name as the addressed object; refusal by omission on the files and `403` on the dist with the reason-phrase limit confirmed and 2.2.30's source fallback recorded; the supply-chain channels passed through on remote with a name-forwarding rule for virtual and nothing advertised on hosted; the proxied classification with dist URL rewriting to a keyed grammar, an off-origin dist-host allowlist, completion-only verification for Packagist's empty `shasum`, `If-Modified-Since` revalidation, and Composer's rows of the removal table with the malware list as the explicit signal and regenerated GitHub archives as a divergence rather than a purge; and the Composer 1 refusal through the ecosystem's own `warning`. Nine questions written in decision shape and adopted under the standing delegation: legacy layouts refused (AC16), minified output (AC4), branch versions mutable (AC5, AC6), request spellings folded, the channels per path (AC13), the dist-host allowlist (AC11), Packagist user-configured, `notify-batch` discarded (AC1), refusal by omission (AC10). Twenty-one criteria, each with a Test Plan row. Sibling consequences recorded in the authoring report, not applied here: an `auth.md` client-table row for `composer`; the `proxy-cache.md` and `upstream-adapters.md` requirements (off-origin dist hosts with redirects and per-host credentials, an uncached forwarded `POST`, the completion-only mode) and Composer's rows in the removal table; the `management-api.md` operations and the AC33 retirement obligation; the `supply-chain-policy.md` advisory and condemnation reads for the later hosted rendering; a Composer row in the management-surfaces analysis. Stays draft; awaits an independent review. |
