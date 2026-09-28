---
status: draft
status_description: "Data-loss fix, second wave, 2026-09-28 at 36a137d on Opus (not a review): Q15 adopted under the standing delegation: a rebuilt tag's old blob had been kept referenced by the flat-filename resolution record, a mention that keeps nothing alive, and the OCI-shaped route requests it by the digest a pre-rebuild API document names, so it is reachable; now a bottle remote caches a bottle as a File addressed by image and blob digest, held by its own cached reference until LRU eviction, while the flat route follows the current index; API documents and manifests are current-document bodies with a declared retained-revision count of zero, since no route requests a superseded one (proxy-cache was-Q19); AC13 and AC25 extended to sweeps with the grace lapsed. Also applied proxy-cache closing-sweep item 5: AC4 and the Freshness section cite the not-earlier rule of proxy-cache AC22. Earlier: Reconciled 2026-09-28 at 7c4d5bb with the foundation wave on Opus (not a review), this spec's first reconciliation: publish and deletion are management-api's publish and delete-file kinds through Operator, the record as args and the per-file root_url in the result document, validation 422, conflict and retired 409 through core-held Retirement, the identical-bytes 200 replaced by Idempotency-Key, unauthorized for out-of-pattern files, 405 repository-type (AC6, AC7, AC15, AC18, AC19); the API remote fetches in proxy-cache's completion-only mode with the JWS entry (artifact-verification AC16, a raw-keys trust set) as the verifier-hook integrity call, regressions not adopted by generated_at and, for legacy documents, by upstream Last-Modified (AC3, AC5); the bottle remote on upstream-adapters' distribution adapter with the anonymous exchange and the none-role redirect host (AC10); the served Last-Modified is proxy-cache AC22's adopted_at, keeping this spec's not-earlier 304 rule where AC22's exact-match clause leaves brew's later condition undefined (reported) (AC4); the virtual's served time derived from member and pointer records, a member-list change reported as a data-model gap (AC20); the verdict is repository-chain (AC21); homebrew advisories through a declared policy.feed.sources source per supply-chain was-Q9, its version ordering reported (AC22); oci was-Q8 cited; WriteRefusal with the client-setting row; harness stand-ins as hosts sub-entries and the signed API snapshot met; Capabilities with rename (AC28). No new question. Earlier: authored 2026-09-26 from captures of brew 7.0.6 and 4.6.20; fourteen questions adopted under the standing delegation; none open. Awaits a /spec review pass and a Fable recheck."
description: "Spec for Homebrew bottles served to brew: hosted bottles at a tap's root_url in the legacy flat layout, a verified cache of ghcr.io's homebrew/core bottles in both the flat layout HOMEBREW_BOTTLE_DOMAIN reads and the OCI-shaped layout HOMEBREW_ARTIFACT_DOMAIN reads, and a byte-for-byte cache of formulae.brew.sh's JWS-signed API documents that no registry can re-sign, with a cache-scoped Last-Modified that lets a new API generation reach a client whose curl discards anything not newer, taps left on Git, and every route back to Homebrew's own hosts named because a refusal holds only where that route is closed."
author: michielvha
goal: "Serve Homebrew users a private bottle host their taps point at and a verified cache of Homebrew's bottles and signed API that stock brew (7.0.6 and 4.6.20) installs from on both paths, with the configuration that keeps brew from falling back to ghcr.io and formulae.brew.sh proven at the network layer rather than assumed."
priority: "low"
issue: 41
created: 2026-09-26
covers:
  - "internal/format/homebrew/**"
  - "conformance/homebrew/**"
fable_recheck: "authored on Opus 2026-09-27 while Fable was out of monthly credit; grounded in captured client traffic, but the design judgement was never Fable-reviewed; the data-loss fix on Opus 2026-09-28 raised and adopted Q15 (a bottle remote caches bottles as Files addressed by image and blob digest, the flat route follows the current index after a rebuilt tag and the old blob keeps its own cached reference until eviction, no retained revision on either remote), which also needs a Fable recheck"
---

# Plan: Homebrew bottles

Homebrew's binary packages as brew fetches them, hosted, proxied and virtual, on one handler: bottle
archives in the legacy flat layout `{name}-{pkg_version}.{bottle_tag}.bottle[.{rebuild}].tar.gz`
that a tap's `root_url` and `HOMEBREW_BOTTLE_DOMAIN` address, the OCI-shaped manifest and blob routes
`HOMEBREW_ARTIFACT_DOMAIN` rewrites ghcr.io onto, the bottle manifests whose `sh.brew.*` annotations
carry relocation metadata, and the JWS-signed JSON API documents `HOMEBREW_API_DOMAIN` points at. The
oracles are brew 7.0.6 and brew 4.6.20.

## Context

Homebrew sits in Tier 3 of `formats/catalogue.md` as the single-ecosystem family "Bottles" (the row
"Homebrew bottles"). **Its build is gated by `project-charter.md` AC9 and `catalogue.md` AC5**: no
handler code for a Tier 3 ecosystem exists before every Tier 1 format has met its definition of done
and the owner has recorded a `continue` verdict at the charter's build step 8, and Tier 3 handlers are
built at step 11. This spec exists now because the owner directed on 2026-09-26 that all 33
ecosystems be specced up front (the catalogue's "Every ecosystem below is specced now; only building
is gated"), so the gate decides what is built and never what is written; a `shrink` verdict parks it.

Homebrew has **no published registry protocol**. Bottles live on GitHub Packages (ghcr.io) as OCI
artifacts, the JSON API is a set of files GitHub Pages serves at `formulae.brew.sh/api`, and what a
mirror must serve is whatever brew's download code requests. So the grounding for this draft is
captured traffic first and client source second, stated up front because the constitution asks for
evidence or silence:

- **Captured client traffic.** `which brew` finds nothing on this host, so both clients ran in the
  official images, pinned by digest, `linux/amd64`:
  `ghcr.io/homebrew/brew@sha256:dc736ae8ebe7326b8f6d272c1aa906f6545531fb6031b2e79d56611c1068c66e`
  (tag `7.0.6`, Ubuntu 24.04.5, curl 8.5.0, the current release) and
  `docker.io/homebrew/brew@sha256:5f90674511c6ce602eab9df639833fb4abf98b556b000e90fe16192a003079d3`
  (tag `4.6.20`, Ubuntu 22.04.5, curl 7.81.0). Docker Hub's last `homebrew/brew` tag is 4.6.20,
  pushed 2025-11-03; every later release, 5.0.0 through 7.0.6, is published on ghcr.io only,
  so the older pin is also the last image of the old distribution channel (ghcr.io carries 355 tags through 7.0.6). The two differ on
  the wire in ways that matter: 4.6.20 reads `formula.jws.json`, `cask.jws.json` and the two
  `*_tap_migrations.jws.json` documents, where 7.0.6 always reads one
  `internal/packages.{bottle_tag}.jws.json`; 7.0.6 fetches bottle manifests under
  `HOMEBREW_BOTTLE_DOMAIN` and 4.6.20 does not; 7.0.6 falls back from `HOMEBREW_ARTIFACT_DOMAIN` to
  ghcr.io unless told not to and 4.6.20 never does. Every run used a fresh container on a dedicated
  `--internal` Podman network (`brewcap-net`) with `HOMEBREW_NO_AUTO_UPDATE`,
  `HOMEBREW_NO_ANALYTICS` and `HOMEBREW_NO_INSTALL_CLEANUP` set, against a logging stub in
  `python:3.12-slim` pinned at
  `sha256:f77ac9e44ae96ef2c90b8053ea08c31f8be030f824196b0ae4db6d462c84e51f`, serving repositories
  under `/homebrew/{name}/` with per-path rules injecting statuses, reason phrases, bodies, Basic and
  Bearer challenges, byte swaps and three `If-Modified-Since` policies. The stub also sat on a second
  network with egress (`brewcap-egress`) to pass requests through byte for byte to the live
  `formulae.brew.sh/api` and `ghcr.io`, the latter with ghcr.io's anonymous token exchange, and one
  fallback case ran its client on that network. Runs that needed state across invocations bound a
  cache directory to `~/.cache/Homebrew`. The stub is not a reference implementation; the captures
  prove what the clients send and how they react.
- **The fixtures were Homebrew's own.** The `hello` 2.12.3 bottle for `x86_64_linux` (rebuild 1,
  100,747 bytes, `sha256:ab40f400...`) and its OCI image index, both fetched from ghcr.io; two
  genuine generations of `internal/packages.x86_64_linux.jws.json` fetched ten minutes apart
  (`metadata.generated_at` 1790531141 and 1790531698), whose Homebrew signatures the clients accept;
  and derived variants of the first: its payload altered in one bottle digest, its payload re-signed
  with a throwaway 4096-bit RSA key under PS512 and `kid` `homebrew-1`, the same signature under
  another `kid`, and the bare payload with no envelope. A local tap made with
  `brew tap-new --no-git acme/tools` carried a `hello` formula whose `bottle do` block set
  `root_url` to the stub.
- **The sources, read this run**, from both images: `Library/Homebrew/api.rb`
  (`fetch_json_api_file`, `verify_and_parse_jws`, `skip_download?`), `api/internal.rb`,
  `api/formula.rb`, `api/json_download.rb`, `api/homebrew-1.pem`, `bottle.rb`
  (`github_packages_manifest_resource`, `fallback_on_error?`, `root_url`, `Bottle::Filename`),
  `utils/bottles.rb` (`path_resolved_basename`), `github_packages.rb` (`image_formula_name`,
  `version_rebuild`, `URL_REGEX`), the curl and GitHub Packages download strategies,
  `utils/curl.rb` (`curl_download`), `brew.sh` (`HOMEBREW_GITHUB_PACKAGES_AUTH`), `env_config.rb`,
  `formula_installer.rb` and `dev-cmd/pr-upload.rb`.
- **The live upstream**, sampled 2026-09-27. `formulae.brew.sh` is GitHub Pages
  (`server: GitHub.com`): `formula.jws.json` is 34,871,866 bytes (5,354,085 gzip-encoded on
  request), `cask.jws.json` 20,660,804, `internal/packages.x86_64_linux.jws.json` 15,483,674 (3,724,681
  gzip-encoded) naming 8,620 formulae and 7,764 casks; every document carries
  `Cache-Control: max-age=600`, a `Last-Modified`, a weak `ETag` of the form
  `W/"{mtime hex}-{size hex}"` and `Vary: Accept-Encoding`; and two requests for the same document a
  minute apart answered `Last-Modified` 17:49:49 and then 17:49:48, so the CDN does not always move
  forward. Every document is a JWS in general JSON serialization whose protected header is
  `{"alg":"PS512","b64":false,"crit":["b64"]}` with `kid` `homebrew-1`. On ghcr.io a blob request
  with no `Authorization` answers `401` with
  `WWW-Authenticate: Bearer realm="https://ghcr.io/token",service="ghcr.io",scope="repository:homebrew/core/hello:pull"`;
  the token endpoint answers anonymously with an opaque token (base64 of
  `v1:homebrew/core/hello:{n}`, not a JWT); **any** Bearer value, `QQ==` and `Zm9v` alike, is
  answered `307` to a signed `pkg-containers.githubusercontent.com` URL; and a bottle's image index
  (tag `2.12.3-1`, `com.github.package.type: homebrew_bottle`) holds one manifest per bottle tag
  annotated with `org.opencontainers.image.ref.name` (`2.12.3.x86_64_linux.1`),
  `sh.brew.bottle.digest`, `sh.brew.bottle.size`, `sh.brew.tab`, `sh.brew.bottle.glibc.version` and an
  SPDX supplement naming `pkg:brew/hello@2.12.3`.
- **OSV, the Homebrew advisory database and purl.** OSV's `ecosystems.txt` (46 entries) lists no
  Homebrew ecosystem and `Homebrew/all.zip` answers `404`. The query API accepts `"Homebrew"` as an
  ecosystem (it answers `{}`, where an unknown name answers `{"code":3,"message":"invalid ecosystem"}`)
  but returns nothing, even for `abcde` 2.9.3, which an advisory names. The OSV schema documents a
  `Homebrew` ecosystem and a `BREW` prefix sourced from `Homebrew/advisory-database`, a repository
  created 2026-06-28 holding 13,023 OSV-format records (schema 1.7.3, for example
  `BREW-abcde-CPANSA-Mojolicious-2014-01`, fixed at `2.9.3_1`), and `api.osv.dev/v1/vulns/` answers
  "Vulnerability not found" for them. The purl `brew` type names the formula, lowercased, with the tap
  as an optional namespace and `@` encoded as `%40`.

Where the documents and the captures disagree, the captures win, and four disagreements are recorded
because they would otherwise be built from the documents. **`HOMEBREW_ARTIFACT_DOMAIN` does not
prefix every download**, though its description says so: on both versions a source build went to
`ftpmirror.gnu.org` and the formula source to `raw.githubusercontent.com` directly, and only ghcr.io
URLs were rewritten (captured; `CurlDownloadStrategy` substitutes the ghcr.io prefix alone).
**Answering `304` only for an exact `If-Modified-Since` match does not make a rollback visible**, as it
did for `cpan.md`: brew revalidates with `curl --time-cond`, and curl itself discards a `200` whose
`Last-Modified` is not newer than the condition, closing the connection mid-body and leaving the old
document in place (captured). **The signed API documents carry no freshness**: 7.0.6 accepted an
older, genuinely signed generation in place of a newer one, and nothing reads `generated_at` (captured,
and source). And **4.6.20 sent no conditional header** when it refreshed its API documents, although
its source passes `--time-cond` (captured on a revalidating run with a persisted cache).

Seven things make this format worth a careful spec. **The API is signed with a key compiled into
brew**, so a registry can cache Homebrew's documents but can never produce one brew accepts: a
document re-signed under `kid` `homebrew-1` failed "signature mismatch" and one under any other `kid`
"key not found" (captured). **A tap is a Git repository**, and third-party formulae reach brew only
through one. **Two mirror layouts coexist**, the legacy flat one whose filenames do not parse without
a lookup (9 of the 8,620 live formulae break the obvious rule) and the OCI-shaped one Homebrew now
recommends, each with its own credential behaviour. **ghcr.io will not serve an anonymous request
without a token**, so the upstream adapter must perform an exchange brew itself skips by sending a
placeholder. **Every download is checked against a signed digest**, which makes the proxied path's
integrity cheap and a virtual repository safe, but the manifest that carries relocation metadata is
checked by nothing. **Almost every refusal sends brew back to Homebrew's own hosts**, through three
routes, only one of which a setting closes. And **a new API generation reaches a caching client only if
the served `Last-Modified` is later than the client's own clock at its last fetch**.

## Blocking preconditions

**The handler interface re-open must complete before this handler starts**, as for every handler
(`format-handler-interface.md` AC8). Homebrew is Tier 3, so the catalogue's Tier 1 gate (its AC5) and
the charter's breadth verdict (its AC9, build step 8) both precede it, and it is built at step 11. This
format needs only the format-first mount `/homebrew/{repository}/`: `HOMEBREW_API_DOMAIN`,
`HOMEBREW_BOTTLE_DOMAIN`, `HOMEBREW_ARTIFACT_DOMAIN` and a formula's `root_url` are all prefixes brew
appends to, path included (captured under `/homebrew/{name}/` for all four on both versions), so no
root-anchored claim is made. `HOMEBREW_ARTIFACT_DOMAIN` produces `{domain}/v2/{org}/{repo}/...`, which
under this mount never reaches the OCI handler's root-anchored `/v2/`.

**The management API must be `planned` before Phase 2.** Publishing and deleting a hosted bottle are
operations of `management-api.md`, placed on its closed kind vocabulary (its reconciliation table's
Homebrew rows: `publish` for a bottle with its record, `delete-file` per file) and reaching this
handler through the optional `Operator` interface (its resolved dispatch decision, was Q2), whose
core the charter builds at step 2 and completes at step 9. No Homebrew client publishes to a
registry other than GitHub: `brew pr-upload` recognises GitHub Releases and GitHub Packages and
otherwise stops with "Service specified by root_url is not recognized" (source), so there is no
client binding to add.

**The proxied path's shared services now exist**, each cited where Design uses it, all `planned`
before Phase 3: `upstream-adapters.md` (its requirements row for this spec: ghcr.io's anonymous
token exchange in the `distribution` adapter with no placeholder, its AC16; the `307` to
`pkg-containers.githubusercontent.com` with no `Authorization`, its AC6; identity encoding, its
AC5); `artifact-verification.md` (the JWS entry, its AC16, whose verdict chain is
`repository-chain`); and `proxy-cache.md`, whose completion-only mode carries the post-receipt
verifier hook the API documents need (its resolved completion-only decision, was Q15, AC20) and
whose cache-scoped `Last-Modified` is the revision this spec asked for ("Freshness of what a
remote serves", AC22, with `data-model.md` AC44 holding the record).

**Two shared services are deliberately not needed.** `signing-service.md` lists this format under
"Nothing, stated": it generates no document and signs nothing, because the only signed documents on
its wire are Homebrew's and cannot be re-signed (Design, "The signed API documents"), so the handler
declares no `Indexer`. And `async-operations.md` records this spec among those that ask nothing of
the queue, because a virtual repository merges nothing (Design, "Virtual repositories").

## Scope

**In scope:**

- **The hosted read surface** under `/homebrew/{repository}/`: bottle archives in the flat layout a
  formula's `root_url` addresses.
- **The proxied read surfaces**: the flat bottle layout and the `{image}/manifests/{tag}` route that
  `HOMEBREW_BOTTLE_DOMAIN` produces; the OCI-shaped manifest-by-tag and blob-by-digest routes
  `HOMEBREW_ARTIFACT_DOMAIN` produces under `v2/{org}/{repo}/{image}/`; and the signed API documents
  `HOMEBREW_API_DOMAIN` reads, in both generations' names.
- **Two clients as oracles on both paths**, brew 7.0.6 and brew 4.6.20, installing core formulae
  through a cache and tap formulae from a hosted repository.
- **Hosted publish and deletion** through the management API as the `publish` and `delete-file` kinds,
  with ingest validation of the bottle archive and its `brew bottle --json` record, and retirement
  through the core-held `Retirement` record.
- **The handler's `Capabilities()` declaration and repository rename** (AC28).
- **Non-interactive authentication** in the three forms brew sends (a Bearer or Basic header on the
  OCI-shaped routes, and a netrc credential through `HOMEBREW_CURLRC` everywhere), and the per-route
  addressed objects `auth.md`'s pattern scopes evaluate, including the pattern-refusal case its AC8
  requires.
- **The rendering of a shared policy refusal**, and the absence of advisory coverage in the feed.
- **The proxied path** against ghcr.io (a bottle remote over configured namespaces, `homebrew/core`
  first) and against `formulae.brew.sh/api` (an API remote), with integrity gates, ghcr.io's anonymous
  token exchange in the adapter, and this format's rows of the removal table.
- **Virtual repositories** over hosted bottles, a bottle remote and an API remote.
- **Every route from brew back to ghcr.io and formulae.brew.sh**, named, with the configuration that
  closes the closable one proven at the network layer.

**Out of scope for v1**, each with its reason, recorded because the interface spec's definition of
done requires the deliberately unimplemented surface to be named:

- **Taps as Git repositories**, hosted or proxied, per the resolved tap decision below. A tap is a Git
  checkout brew clones and pulls; serving it is a Git smart-HTTP server, a different serving stack
  from the HTTP handler this interface pins, and proxying one puts a Git client in the handler's egress
  path, the same reasons `cargo.md` and `julia.md` recorded for their Git protocols. Formulae stay in
  the customer's Git host; this registry serves the bottles they name.
- **Hosted or merged API documents.** brew verifies every `*.jws.json` against `homebrew-1.pem`, a key
  in its own source tree with no configuration to add another (source `jws_public_key_pem`; captured
  refusals under a foreign key and a foreign `kid`), and the API describes only `homebrew/core` and
  `homebrew/cask`. A registry cannot produce a document brew accepts, so this is impossible rather than
  deferred. A hosted repository answers `404` on every API route.
- **Source archives, formula Ruby sources and cask artifacts.** brew fetches them from their own hosts
  (`ftpmirror.gnu.org`, `raw.githubusercontent.com`, vendor URLs) whatever `HOMEBREW_ARTIFACT_DOMAIN`
  says (captured on both versions), so no route of this format can receive the request. A user who
  needs them cached configures a generic remote per host outside brew; the operator documentation names
  this exposure.
- **OCI push, chunked upload, tag listing, referrers and deletion on the OCI-shaped routes.** No
  Homebrew client pushes to a registry other than ghcr.io (`pr-upload`, source) and brew never lists
  (captured). A team that wants to push bottles with `skopeo` or `oras` uses the OCI format.
- **The unsigned per-name API documents** (`formula/{name}.json`, `cask/{name}.json`) and the
  analytics documents. No command in the matrix requested one (captured), nothing verifies them, and
  7.0.6 reads no per-name formula document at all (source). They answer `404`.
- **GitHub build-provenance attestations** (`HOMEBREW_VERIFY_ATTESTATIONS`). brew fetches them from
  GitHub's API through `gh`, never through a bottle route; a byte-identical cached bottle keeps its
  digest, so its attestation still verifies (Design, "Signing, provenance and policy").
- **Generating bottle manifests for hosted bottles.** brew requests a manifest only for a ghcr.io
  `root_url` or under `HOMEBREW_BOTTLE_DOMAIN` (source `github_packages_manifest_resource`), never for
  a tap's own non-ghcr `root_url`, so a hosted manifest would have no reader.

## Design

### The wire surface, as captured

Every route hangs off `/homebrew/{repository}/`, format-first per `format-handler-interface.md`'s
resolved URL-shape decision. brew is pointed at a repository by four prefixes, each taken as given with
no trailing slash:

| Setting | What brew requests under it, as captured |
|---|---|
| `HOMEBREW_API_DOMAIN={base}` | 7.0.6: `GET {base}/internal/packages.x86_64_linux.jws.json`. 4.6.20: `GET {base}/formula.jws.json`, `{base}/formula_tap_migrations.jws.json`, `{base}/cask.jws.json`, and on some commands `{base}/cask_tap_migrations.jws.json`; with `HOMEBREW_USE_INTERNAL_API` set, `internal/formula.{tag}.jws.json` and `internal/cask.{tag}.jws.json` (source). Always `Accept-Encoding: deflate, gzip, br, zstd` (`curl --compressed`), never an `Authorization` |
| `HOMEBREW_BOTTLE_DOMAIN={base}` (core formulae only) | 7.0.6: `GET {base}/{image}/manifests/{version_rebuild}` with `Accept: application/vnd.oci.image.index.v1+json` and `Authorization: Bearer QQ==`, then `HEAD` and `GET {base}/{flat filename}` (a second `GET` followed on every successful run). 4.6.20: the flat `HEAD` and `GET`s only, no manifest |
| `HOMEBREW_ARTIFACT_DOMAIN={base}` (every ghcr.io URL) | Both: `GET {base}/v2/{org}/{repo}/{image}/manifests/{version_rebuild}` with the index `Accept`, then `GET {base}/v2/{org}/{repo}/{image}/blobs/sha256:{digest}`; no `HEAD`, no token exchange |
| A tap formula's `root_url "{base}"` | Both: `HEAD` and `GET {base}/{flat filename}`, never a manifest, never an `Authorization` header |
| User agent | `Linuxbrew/7.0.6 (Linux; x86_64 Ubuntu 24.04.5 LTS) curl/8.5.0` and `Linuxbrew/4.6.20 (Linux; x86_64 Ubuntu 22.04.5 LTS) curl/7.81.0` |

The flat filename is `ERB::Util.url_encode("{name}-{pkg_version}.{bottle_tag}.bottle{.rebuild}.tar.gz")`
(source `Bottle::Filename#url_encode`): `hello-2.12.3.x86_64_linux.bottle.1.tar.gz`, and for a
versioned formula `openssl%403-3.6.4.x86_64_linux.bottle.tar.gz` (both captured). The OCI image name is
the formula name with `@` turned into `/` and `+` into `x` (`openssl/3`, captured; source
`image_formula_name`), and the manifest tag is `{pkg_version}` with `-{rebuild}` appended when the
rebuild is positive (`2.12.3-1`, captured). A failed flat fetch is retried (7.0.6 sent `HEAD`, `GET`,
`HEAD`, `GET`, `GET` against a `404`, captured), a failed manifest twice.

**Error rendering**, captured, because a refusal nobody can read is a refusal nobody can act on. **brew
prints neither the response body nor the reason phrase.** Every download runs through `curl --fail`, and
what reaches the user is `curl: (22) The requested URL returned error: 403` followed by `Error: Failed
to download resource "hello"` (7.0.6) or `Error: hello: Failed to download resource "hello"` (4.6.20),
captured with a custom reason phrase and a body on both layouts. The status code is the whole channel.

### How the clients decide, and the cross-format checks

**Does the client verify what it downloads? Yes, every bottle and every API document, and not the
manifest.** Both versions check each bottle's SHA-256 against the digest the formula names (from the
signed API for a core formula, from the tap's Ruby for a tap formula) and refuse a mismatch with no
fallback: "Error: Bottle reports different checksum: ab40... SHA-256 checksum of downloaded file:
a7aa..." on 7.0.6 and "Error: hello: SHA-256 mismatch" on 4.6.20, captured on the flat and the
OCI-shaped layouts. Both verify every `*.jws.json` document before using it (below). The bottle
manifest is fetched by tag and checked by nothing, and its `sh.brew.tab` annotation feeds relocation
("Annotations are not covered by the bottle checksum", source comment in `utils/bottles.rb`), so on the
proxied path the manifest is the one document whose integrity is this registry's alone (Design, "The
proxied path").

**Is a rollback visible? The hosted path serves nothing mutable, and on the proxied path a new API
generation reaches a caching client only through a `Last-Modified` later than that client's last
fetch.** A hosted repository serves only bottle archives whose coordinates bind one set of bytes for the
life of the repository (Design, "The hosted publish path"), so no pointer-scoped freshness is needed
here, unlike the five formats before it. What is mutable is the cached API document, and 7.0.6 showed
exactly what it takes (captured, cache persisted across runs): its revalidation carries
`If-Modified-Since` equal to the local file's modification time, which brew sets to the client's own
clock after every successful download rather than to the server's `Last-Modified`; a server answering
`304` whenever its `Last-Modified` is not later kept the client on the newer generation after the
server moved back to the older one; a server answering `304` only on an exact match sent `200` with the
older `Last-Modified`, and curl closed the connection mid-body and kept the old file, with brew then
refreshing its modification time as if the download had succeeded; and serving the older generation
with a `Last-Modified` later than the client's last fetch made 7.0.6 adopt it, `generated_at` going
backwards without comment. 4.6.20 sent no conditional header and replaced its documents whole on every
refresh (captured). Between refreshes, neither version asks at all: 7.0.6 waits 450 seconds for
`install`, `upgrade`, `outdated` and the other auto-update commands and seven days for the rest, 4.6.20
450 seconds and one day, and with
`HOMEBREW_NO_AUTO_UPDATE` set neither refreshes (source `skip_download?` and `fetch_api_files!`). So
**freshness belongs to the serving repository, not to the upstream** (Design, "Freshness").

**Does the client fall back when refused? Yes, by three routes, and only one setting closes one of
them.** Captured on the internal network as attempts to resolve the public host, and once with egress
as a successful install from it:

| Configuration | Route to Homebrew's hosts after a refusal or a miss | What closes it |
|---|---|---|
| `HOMEBREW_API_DOMAIN`, both versions | Any failure of the configured domain, a `403` or a `404` alike, retries the same path at `https://formulae.brew.sh/api` (captured; with egress the install then succeeded) | client egress restricted to this registry; brew has no setting that removes it (source `fetch_json_api_file`) |
| `HOMEBREW_BOTTLE_DOMAIN`, both versions | "Warning: Bottle missing, falling back to the default domain..." and the manifest and blob from `https://ghcr.io/v2/homebrew/core` (captured; with egress it installed); on 7.0.6 a failed manifest also falls back to ghcr.io as its mirror (source) | client egress restricted to this registry (source `fallback_on_error?` has no switch) |
| `HOMEBREW_ARTIFACT_DOMAIN`, 7.0.6 | After a `401` the same path was tried at `https://ghcr.io/` (captured), and after any other failure (source: the rewritten and original URLs are interleaved) | `HOMEBREW_ARTIFACT_DOMAIN_NO_FALLBACK=1`: only the configured domain was requested and the install failed (captured) |
| `HOMEBREW_ARTIFACT_DOMAIN`, 4.6.20 | None: a `403` ended the install with no other host tried (captured) | nothing needed |
| A tap's `root_url` | None: a `401` ended the install (captured) | nothing needed |
| Source builds and formula sources, both | Always their own hosts (captured) | client egress restricted to this registry, or a generic remote per host |

A policy refusal therefore holds on the recipe configuration (`HOMEBREW_ARTIFACT_DOMAIN`, with
`HOMEBREW_ARTIFACT_DOMAIN_NO_FALLBACK` on 7.x) and on hosted tap bottles, and holds under
`HOMEBREW_BOTTLE_DOMAIN` only with egress closed. The API fallback matters less for policy, since
policy refuses bottles and not the index, but it is the route by which a patterned or misconfigured
client silently reads Homebrew's API instead of this registry's. The operator documentation carries the
recipe and every exposure in the right-hand column, and AC17 proves each at the network layer.

**Does the client rely only on the HTTP reason phrase? No: it relies on nothing but the status code**
(the error rendering above). So, unlike `cpan.md`, nothing about this format pins HTTP/1.1, and every
route may be served over HTTP/2; the refusal's detail reaches the operator through the refusal record
and the user only through the operator documentation's statement that a `403` from this registry is a
policy decision.

### How much of this `oci.md` already covers

Bottles are OCI artifacts on ghcr.io, so the question is exact, and the answer is that `oci.md` covers
the wire grammar of a subset of these routes and none of the behaviour a brew client reaches:

| Homebrew needs | `oci.md` | This spec |
|---|---|---|
| Manifest by tag, blob by digest, the OCI image index and manifest media types, `application/vnd.oci.image.layer.v1.tar+gzip` | Specified, under the OCI handler's root-anchored `/v2/` | The same shapes as a read-only subset under `/homebrew/{repository}/v2/`, since handlers never call each other |
| Authentication | The challenge, token endpoint and JWT flow | Not used: brew never follows a challenge; it sends a registry token directly as Bearer or Basic, or nothing (captured) |
| One remote over an upstream namespace (`ghcr.io/homebrew/core/*`, 8,620 images) | Specified since its resolved name-split decision (was Q8): the first component of an OCI name is the registry repository and the rest is the image, so one OCI remote covers a whole upstream registry as `{remote}/homebrew/core/hello` | A bottle remote serving configured namespaces under `/homebrew/{repository}/v2/`, kept regardless, because brew's paths are this mount's and handlers never call each other |
| ghcr.io's anonymous token exchange | The `distribution` adapter's (`upstream-adapters.md` AC16), which `oci.md` uses | The same adapter, with credential `none` for the anonymous exchange |
| `sh.brew.*` annotations | Not read | Read: `sh.brew.bottle.digest` and `org.opencontainers.image.ref.name` resolve the flat layout |
| Push, chunked upload, mount, tag list, referrers, deletion | Specified | Not served (Scope) |
| The flat layout, the signed API documents, curl's time condition | Nothing | New |

A bottle pushed to this registry's OCI format with skopeo is reachable by no brew configuration:
`HOMEBREW_ARTIFACT_DOMAIN` rewrites only ghcr.io URLs and a non-ghcr `root_url` always takes the flat
layout (source `path_resolved_basename`). The OCI format stays the home for OCI tooling; this handler
serves what brew requests.

### The signed API documents

Every API document brew reads is a JWS in general JSON serialization: an object with a `payload`
string, the JSON text itself, unencoded under RFC 7797 (`"b64": false`), and a `signatures` array.
Both versions pick the signature whose unprotected `header.kid` is `homebrew-1`, require
`alg` `PS512` and `b64` `false` in its protected header, and verify RSASSA-PSS with SHA-512, salt
length equal to the digest and MGF1-SHA-512, over `{protected}.{payload}`, against the 4096-bit key in
`Library/Homebrew/api/homebrew-1.pem`, identical in both images (source `verify_and_parse_jws`). A
failure ends the command with no fallback: "Error: Failed to verify integrity (signature mismatch) of:
{url} Potential MITM attempt detected. Please run `brew update` and try again." for an altered payload
and for our own signature under `kid` `homebrew-1`, and "(key not found)" for another `kid` and for a
bare payload (all captured on 7.0.6).

That settles the two questions this format raises for signed documents:

- **A proxy can serve upstream JWS unmodified, and must.** The signature covers the payload string, so
  a byte-for-byte copy verifies wherever it is served from: both versions installed through the
  pass-through to `formulae.brew.sh` (captured). Transfer encoding is free, since brew decompresses
  before parsing; the stored bytes are the identity bytes.
- **A hosted tap's API would be signed with nothing brew accepts.** There is no key to configure, and
  the API describes only Homebrew's two taps; a third-party tap reaches brew through its Git checkout.
  So this format asks `signing-service.md` for nothing, and a hosted or virtual repository never
  synthesises an API document (the resolved hosted-surface decision below).

What this format asked of `artifact-verification.md`, which owns verification per
`supply-chain-policy.md`'s resolved verification-ownership decision, is now its JWS entry (its
requirements table's `homebrew.md` row and AC16): **a JWS verification** taking a document in general
JSON serialization, a `kid` and a public key, supporting PS512 with an unencoded payload and the `crit`
header, and answering verified or failed with the reason (unknown `kid`, wrong algorithm, signature
mismatch). The key is a `raw-keys` entry of the API remote's trust set (its "RSA for JWS (Homebrew,
`kid`)"), defaulting to Homebrew's published `homebrew-1` key. It reaches the handler through the
`Verifier` consumer interface `Deps` carries (`format-handler-interface.md`, "The pinned method set"),
and on the proxied path it runs as an **integrity call** inside the completion-only mode's post-receipt
verifier hook, refusing the commit of a document that would fail in the client (its "When verification
runs": "Homebrew's JWS document that 'would fail in the client'"; Design, "The proxied path"); its
verdict, recorded afterwards, feeds the bottle verdict (Design, "Signing, provenance and policy").

### Mapping onto the shared model

The levels are exactly those `data-model.md` provides; no table is added.

- **A `Package` is a formula name** (`hello`, `openssl@3`), byte for byte, the purl `brew` name.
- **A `Version` is a `pkg_version`**: the formula version with `_{revision}` when the revision is
  positive. Its document holds, per file, the bottle tag, the rebuild, the cellar, the SHA-256 and size,
  the `brew bottle --json` record it was published with (including its `tab`), and the publish time.
- **`File`**: on a hosted repository, one per bottle tag and rebuild, keyed by its served flat
  filename; on a bottle remote, one per image and blob digest, the coordinate the OCI-shaped blob
  route names, which the flat route reaches through its resolution (the resolved rebuilt-tag
  decision below, was Q15); stored by CAS digest either way.
- **Deleted files are core-held `Retirement` records** at file granularity (`data-model.md` AC35;
  `management-api.md`, "Retirement is core-held"), not a set in any document.
- **The repository-level document** of a bottle remote holds its namespace list (`homebrew/core` and
  any operator-listed taps whose bottles live on ghcr.io), and of a virtual repository nothing beyond
  its members.
- **Not snapshot content**: a remote's cached API documents, manifests and blobs, its flat-filename
  resolutions (filename to manifest digest and blob digest), each cached document's cache-scoped
  freshness record (`adopted_at`, `data-model.md` AC44) and last adopted `generated_at`, and the JWS
  verdicts (`artifact-verification.md`'s verdict records). A proxied repository creates no
  snapshots.

What keeps each of these alive is exact, because a digest a record merely mentions keeps nothing
alive (`storage-and-gc.md` AC16):

- **An API document** is large (15 to 35 MB), far above any inline metadata threshold, so it is the
  CAS-backed body of the API remote's current document for its path, marked by the fourth root's
  current-document half for exactly as long as it is current. **A manifest** by tag is likewise the
  bottle remote's current document for its tag, inline or CAS-backed by size.
- **Neither remote retains a superseded revision.** Every API path and every manifest route names a
  document and carries no generation and no digest, so no route can serve a superseded one, and a
  regression or a failed verification keeps the adopted document current rather than falling back
  to a retained one (Design, "The proxied path"). Under `proxy-cache.md`'s resolved
  retained-revision decision (was its Q19) this handler declares a count of zero for both document
  sets, as `cpan.md`'s remote keeps no superseded `CHECKSUMS`: the adoption that replaces a document
  ends its old body's reference, and the old body is collectable at the next sweep past grace. So
  nothing is on a declared blob-digest list of either remote.
- **A cached bottle** is a `File` of the bottle remote addressed by its image and blob digest, the
  coordinate the OCI-shaped blob route names, and it is held by its own cached reference, the second
  root, ended only by LRU eviction under the quota or by a purge. The flat route reaches the same
  `File` through its resolution. A flat-filename resolution, the digests an API document names and a
  manifest's `sh.brew.bottle.digest` are metadata naming that digest, so none of them keeps a bottle
  alive, and none needs to (the resolved rebuilt-tag decision below, was Q15).

AC25 proves each half: the current documents and cached bottles survive a sweep run with the
repository's grace lapsed, and a superseded body does not.

### The hosted publish path and what counts as a write

Publishing is the `publish` kind of `management-api.md`, declared through `Operator`, per the resolved
publish-input decision below: **one operation carries one formula version's bottle archives with the
JSON `brew bottle --json` wrote for them**, the pair Homebrew's own pipeline produces before `brew
pr-upload`, the archives committed through upload sessions (or in one request through the multipart
convenience form, a binding onto the same operation) and the record as the operation's `args`
(`management-api.md`, "Publish through the API"). `brew bottle` names the local file
`{name}--{pkg_version}...` with a double hyphen and the URL uses a single one (source `Filename#to_str`
and `#url_encode`); the registry serves the URL form whatever the part was called, and the operation's
result document returns, per file, the served filename, its SHA-256, the cellar and the `root_url` the
formula's `bottle do` block must carry, the response that spec names this format for. Refusals are
`management-api.md`'s problem types: `validation` (422) for every ingest rule below, `conflict` (409)
for an existing file, `retired` (409) for a deleted one, `unauthenticated` (401), and `405`
`repository-type` against a remote or virtual repository before authorization. The CI-retry case this
spec first answered with an identical-bytes `200` is `management-api.md`'s `Idempotency-Key`: a retry
carrying the first request's key and payload replays its outcome and creates no snapshot (its AC17).

What `Apply` enforces over the committed blobs, each refusal naming the rule and committing nothing:

- **The formula name**: `[a-z0-9][a-z0-9+_.@-]*`, lowercase (no live formula name holds an uppercase
  letter, captured over 8,620), containing no hyphen directly followed by a digit, per the resolved
  addressed-object decision below.
- **The `pkg_version`**: it starts with a digit, may contain `.`, `-` and letters, and ends in an
  optional `_{revision}`; together with the name rule this makes every hosted flat filename split at its
  first hyphen followed by a digit. The rule refuses shapes Homebrew itself uses (the live formulae
  `ns-3` and `ntfs-3g`, and seven versions such as `r475` and `svn1113`, 9 of 8,620, measured this run),
  which is its accepted cost.
- **The bottle tag**: `[a-z0-9_]+` (`x86_64_linux`, `arm64_linux`, `arm64_sequoia`, captured in the
  live index), and **the rebuild** a non-negative integer.
- **The archive**: a gzip-compressed tar whose every entry lies under `{name}/{pkg_version}/`, with
  regular files, directories and symbolic links whose targets resolve inside that directory; no
  absolute path, no `..` segment, no hard link outside it, no device. The captured `hello` bottle holds
  157 entries under `hello/2.12.3/`, 57 files and 100 directories, including `.brew/hello.rb` and
  `sbom.spdx.json`.
- **The record**: the JSON's formula name, version, bottle tag, rebuild and cellar agree with the
  archive and the request, and its SHA-256 equals the SHA-256 of the stored bytes.
- **Coordinates bind one set of bytes for the life of the repository.** A file that exists is refused
  `conflict`, and a deleted file `retired` by the shared write path with any bytes, including after
  the deleting snapshot is pruned and after a backwards repoint, because its `Retirement` record is
  not snapshot content.

`data-model.md` requires each format spec to declare its ecosystem's write boundaries. Homebrew's
declaration:

- **One publish request is one completed logical write and one snapshot**, carrying every bottle file
  it names for one formula version (a `brew bottle --merge` record lists several tags) and the version
  document.
- **A deletion request is one write**, however many files of one version it removes; a retention pass
  is one write however many versions it removes.
- **Two concurrent publishes** of different files each read-modify-write the version document through
  the revision-token retry `data-model.md` makes mandatory (its AC20): both land. Two publishes of the
  same file with different bytes land one and refuse the other `conflict`.
- **A proxied repository creates no snapshots.**

### Deletion

Each operation is a kind of `management-api.md`'s closed vocabulary (its reconciliation table's
Homebrew rows), declared by this handler through `Operator` (`Operations()` returning `publish` and
`delete-file`, `Bindings()` returning none), one completed logical write through the shared write path
with an `Operation` completed in the request, hosted only, its trigger verified by integration tests
and a `script`-driven conformance case per kind (`management-api.md` AC24, enforced by
`conformance-harness.md` AC26), and its effect by the real client
(`docs/internal/analysis/management-surfaces-and-the-oracle.md`). **No Homebrew client triggers either
operation.**

| Operation | Kind | Effect a client sees | Action |
|---|---|---|---|
| Publish a formula version's bottles | `publish` | Each file served at its flat filename; the tap formula naming it installs | `push` on every file's `{name}/{pkg_version}/{bottle_tag}/{rebuild}` |
| Delete one or more bottle files of a version | `delete-file` | Each answers `404`, so a formula naming it fails to install with a non-zero exit (brew never builds from source in its place, captured); each file's coordinate is retired | `delete` on each file |

Rules, applying the precedent: every operation is one snapshot, none for a refused one, and no blob is
deleted directly, so space returns only through retention pruning and `storage-and-gc.md`'s
single-deleter boundary (its AC15) holds; `delete-file` returns each removed file's coordinate in its
`Outcome` and `Submit` writes the `Retirement` records in the same transaction, so the retirement holds
across a backwards repoint by construction; the `Package` row outlives its versions (`data-model.md`
AC33). There is no yank: nothing in brew's model says "not for new installs", and a formula
unpublishes a bottle by changing its own `bottle do` block in Git.

### The proxied path

The handler owns the request and classifies for the proxy layer's fetch-and-cache API per the settled
decisions in `proxy-cache.md`. Per the resolved remote-shape decision below, **a Homebrew remote has
one of two kinds of upstream**, since `data-model.md` AC16 gives a remote exactly one: an **API remote**
over an API base (`https://formulae.brew.sh/api` or a mirror of it), and a **bottle remote** over an
OCI registry with a namespace list (`https://ghcr.io` with `homebrew/core`). A client sets
`HOMEBREW_API_DOMAIN` and `HOMEBREW_ARTIFACT_DOMAIN` separately anyway, and a virtual repository puts
both behind one URL.

**The API remote:**

- **Serves only signed documents**: paths matching `{word}.jws.json` or
  `internal/{word}.{bottle_tag}.jws.json`, the shapes both versions request; every other path answers
  `404` without an upstream request.
- **Mutable metadata**, revalidated under the proxy layer's TTL with the upstream's validators, fetched
  on the `https` adapter with its default `Accept-Encoding: identity` so the stored bytes are the
  signed bytes (`upstream-adapters.md`, "Request hygiene", naming these documents), and fetched in
  `proxy-cache.md`'s **completion-only mode**, since a JWS document cannot be verified as a stream:
  the body is spooled, and the post-receipt verifier hook runs the JWS entry as an integrity call
  (`artifact-verification.md` AC16) before anything is committed (`proxy-cache.md` AC20). A
  document that fails is never cached or served and leaves no negative entry; the previously cached
  document keeps serving, and the failure is recorded and alerted, because brew would stop dead on
  it with no fallback (captured).
- **Never adopts a regression**, per the resolved regression decision below and `proxy-cache.md`'s
  rule that a remote never adopts an older upstream revision (its AC22): an `internal/packages.*`
  document is ordered by its `metadata.generated_at`, the format's own ordering, so one older than the
  cached one's is not adopted, and is recorded and alerted as a divergence, since the upstream CDN
  answered an older `Last-Modified` a minute after a newer one (Context) and brew would accept the
  older document (captured). The legacy documents carry no generation field, so they are ordered by
  the upstream's `Last-Modified`, which the adapter returns verbatim, an earlier value included (its
  AC14): a response dated earlier than the adopted revision is not adopted. The accepted cost is that
  a genuinely newer legacy document served under a spuriously earlier CDN date waits for a later
  revalidation that returns a later date.
- **Serves a cache-scoped `Last-Modified`** (Design, "Freshness").

**The bottle remote:**

- **Serves only its namespaces.** An OCI-shaped route `v2/{org}/{repo}/{image}/...` outside the
  namespace list answers `404` without an upstream request, so the remote is not an open relay to every
  public image on ghcr.io. The flat and `{image}/manifests/{tag}` routes resolve in the first namespace,
  `homebrew/core`, which is what `HOMEBREW_BOTTLE_DOMAIN`'s default names.
- **The upstream is fetched through `upstream-adapters.md`'s `distribution` adapter**, as `oci.md`'s
  remote is: ghcr.io's anonymous token exchange with credential `none`, a token per
  `(realm, service, scope)` cached for its lifetime and never a placeholder (its AC16), and the
  `307` to `pkg-containers.githubusercontent.com` followed inside the adapter to an allowlist entry
  with role `none`, so no `Authorization` follows it (its AC6, AC8; its "Preconfigured profiles"
  names that entry as the recipe for an operator-configured ghcr.io).
- **Manifests by tag are mutable metadata**, revalidated under the TTL, served byte for byte with the
  upstream's media type, and **committed only when their bytes hash to the upstream's
  `Docker-Content-Digest`**, which the `distribution` adapter reads as the declared digest, as it does
  for `oci.md`; it is the one integrity check a manifest gets, since brew checks none.
- **Blobs are immutable artifacts**, committed only when their bytes hash to the digest in the path,
  a declared digest under stream-and-verify (`proxy-cache.md` AC10); a truncated or mismatching body
  is never committed.
- **A flat filename resolves through the upstream index**, per the resolved flat-resolution decision
  below. The handler percent-decodes the filename, takes the bottle tag and rebuild from its suffix,
  and tries each split of `{name}-{pkg_version}` at a hyphen, rightmost first, as an image
  (the image-name mapping above) and a manifest tag (`{pkg_version}` or `{pkg_version}-{rebuild}`); the first
  index that exists and holds a manifest whose `org.opencontainers.image.ref.name` equals
  `{pkg_version}.{bottle_tag}` with `.{rebuild}` appended when positive supplies
  `sh.brew.bottle.digest`, and the blob is fetched and committed only against that digest. Rightmost
  first finds hyphenated names (1,844 live) in one step and hyphenated versions (101 live) after at
  most one miss per hyphen; each miss is negatively cached. The resolution is recorded, so a repeat
  request makes no manifest request inside the TTL.
- **Missing content is negatively cached** with the short TTL; a `429` or `5xx` is never cached as
  absence (`proxy-cache.md` AC9).
- **Publish and every management operation against a remote answer `405`** with problem type
  `repository-type` (`management-api.md`, "Hosted only").

Everything this format asked of `upstream-adapters.md` is in its requirements table's `homebrew.md` row
and met: the anonymous exchange with no placeholder (AC16), the cross-host `307` with no
`Authorization` (AC6), identity encoding (AC5), and the upstream's validators returned verbatim with an
earlier `Last-Modified` reported rather than hidden (AC14); a private tap's packages take a
`token-exchange` upstream credential for the same exchange. The post-receipt verifier hook is
`proxy-cache.md`'s, as that row says. No request is made at configuration: a well-formed but
unreachable upstream is accepted (`upstream-adapters.md` AC23).

Upstream removal maps onto the event classes of `proxy-cache.md`'s "Upstream removal or replacement",
as this format's side of that contract; each row names its class, and that table lists this format
under the revision-bound class and under "Regression not adopted":

| Upstream event, as observed at revalidation or fetch | Classification |
|---|---|
| A new API generation | An **ordinary metadata change**, adopted after verification |
| An API document older by `generated_at` (or, for a legacy document, by upstream `Last-Modified`) | **Regression not adopted**: the cached document keeps serving under its unchanged record; recorded and alerted (`proxy-cache.md` AC22) |
| An API document failing verification, or a body truncated | An **integrity failure at fetch**: not committed, no negative entry, the cached document keeps serving; recorded and alerted |
| A formula disappears from the API, or moves to another tap | An **ordinary metadata change**; cached bottles stay fetchable by digest |
| A formula marked `disabled` or `deprecated` in the API | An **ordinary metadata change**; brew enforces it itself; no security signal |
| A manifest tag's index changes digest (a rebuild under the same tag) | **Immutability violation, revision-bound**, recorded and alerted with both digests, no purge (the resolved rebuilt-tag decision below, was Q15). The flat route follows the current index, since a flat filename carries no digest: after the adoption the filename is re-resolved, and the new blob is fetched and verified against the new `sh.brew.bottle.digest` as a new blob. The old blob is not released: it is a `File` addressed by its own digest and held by its own cached reference, which neither the adoption nor the re-resolution ends, because the OCI-shaped route requests a blob by the digest the client's API document names, so a client still holding the pre-rebuild API document is served the old bytes it verifies against. Its end is LRU eviction, after which a request for it by digest re-fetches from the upstream against the digest in the path and answers the upstream's `404` once the upstream no longer holds it |
| A blob the cache holds answers `404` upstream | **Removal with no signal**: cached bytes keep serving, the divergence recorded and alerted |

No upstream security signal exists on the Homebrew wire: nothing in the API, the manifest or the tag
list marks a bottle malicious. Per the resolved preconfigured-upstream decision below, no Homebrew
upstream is preconfigured; the operator documentation gives both remotes.

### Freshness

Per the resolved freshness decision below, **every mutable document a remote or virtual repository
serves (API documents and bottle manifests) carries a cache-scoped `Last-Modified`**, never the
upstream's. This spec raised it as a revision of `proxy-cache.md`, which now owns it ("Freshness of
what a remote serves", its AC22): the value is the cached document's `adopted_at`, a record on the
remote's current-document entry (`data-model.md` AC44), set when a new upstream revision is adopted
to the later of the adoption time and one second after its previous value, so it never moves
backwards whatever the clock or the upstream's own dates do. It is set by the shared serving helper
`proxy-cache.md` names, never by the handler (`signing-service.md` AC11's freshness boundary). The
consequences, from the captures:

| Event | A 7.0.6 client that fetched before it | A 4.6.20 client |
|---|---|---|
| The remote adopts a new generation | Its next revalidation carries an earlier `If-Modified-Since`, gets `200`, and adopts | Adopts on its next refresh |
| The upstream CDN regresses | Not adopted by the remote (Design, "The proxied path"); the client sees nothing | The same |
| Serving the upstream's own `Last-Modified` instead (never done) | A `304` or a discarded `200` for a generation newer than its last fetch but generated before it: a lag of one or more generations (both mechanisms captured) | Unaffected |
| A virtual repository's API member changes | The virtual's served time moves forward (Design, "Virtual repositories") | Adopts on its next refresh |

**The conditional rule, and the gap it closed in the shared one.** brew's `If-Modified-Since` is its own clock at
its last successful download (captured), not a date this registry served, so it is almost never
equal to the served `Last-Modified`. This spec answers `304` when `If-Modified-Since` is not earlier
than the served `Last-Modified` (or `If-None-Match` equals its byte-derived `ETag`) and `200`
otherwise, so a `200` always carries a `Last-Modified` later than the condition and curl never
discards it. This is the `not-earlier` conditional rule of `proxy-cache.md` AC22, which this format
declares for its API remote ("Freshness of what a remote serves" there), rendered by
`signing-service.md`'s serving door under its resolved later-condition decision (was its Q12, its
AC11). The case this spec first reported, a brew revalidation made after the last adoption (the
condition later than the record and unequal to it), which the earlier exact-match clause left
undefined, answers `304` under that rule; the client in that case already holds a document at least
as new as the record. AC4 asserts it.

The accepted cost is clock skew: `If-Modified-Since` is the client's clock, so a client whose clock runs
ahead of the registry's by more than the gap since an adoption keeps its copy until the next one, which
the operator documentation states. This is the proxied-path counterpart of the pointer-scoped
`Last-Modified` `data-model.md` holds for hosted indexes; a hosted Homebrew repository serves nothing
mutable, so it needs no pointer-scoped signal.

### Virtual repositories

**A virtual repository is possible, and merges nothing**, per the resolved virtual decision below:

- **API routes are served byte for byte from the first member that serves them**, which is an API
  remote; no document is merged or re-signed, because none could be, so the generator contract of
  `signing-service.md` has no part here and no `index.merge` job runs. A hosted member serves no API
  route. The served `Last-Modified` is the later of the supplying member's cache-scoped record and
  the virtual's own pointer record, so it moves forward when the member adopts a generation. What
  keeps it forward across a member-list change (a different API member supplying the route) is the
  virtual's own record advancing at that change; `data-model.md` gives a virtual no record of its own
  beyond its pointer's and does not list a member-list change among pointer transitions, a gap this
  pass reports rather than fills.
- **Flat bottle routes resolve in member order**, hosted members first, then bottle remotes. A flat
  filename carries no tap, so a hosted bottle named like a core one (`hello-2.12.3.x86_64_linux...`)
  shadows the core bottle for core installs too; brew then refuses the mismatched bytes against the
  signed digest (captured), so a collision fails loudly and never substitutes. The operator
  documentation recommends hosted formula names distinct from core ones.
- **OCI-shaped and manifest routes resolve from the first bottle remote whose namespaces include the
  name.** Blobs are addressed by digest, so no member can substitute content.
- **Publish and management operations against a virtual repository answer `405`** with problem type
  `repository-type`.

Dependency confusion needs no reserved namespaces here, unlike `cpan.md`: every bottle brew installs is
checked against a digest from the signed API or from the tap's own Git, neither of which this registry
supplies for the other's formulae.

### Names, versions and other traps

- **Three spellings of one coordinate.** The flat filename is `{name}-{pkg_version}.{tag}.bottle{.rebuild}.tar.gz`,
  percent-encoded (`openssl%403-...`); the OCI image is `{name}` with `@` as `/` and `+` as `x`; the
  manifest tag is `{pkg_version}` or `{pkg_version}-{rebuild}`; and the index's child ref name is
  `{pkg_version}.{tag}` or `{pkg_version}.{tag}.{rebuild}` (all captured). The `+` to `x` mapping is
  lossy (19 live names hold a `+`), so the image name is never mapped back to a formula name.
- **Local and served names differ.** `brew bottle` writes `{name}--{pkg_version}...` with two hyphens;
  the served name has one (source).
- **Flat filenames do not parse without a lookup upstream.** A split at the first hyphen followed by a
  digit is wrong for 9 live formulae and 549 live stems have another formula name as a prefix at some
  hyphen (measured this run), which is why the remote resolves through the index and hosted ingest
  enforces a shape that parses.
- **Nothing folds.** Formula names are lowercase on the live index and matched exactly; an uppercase
  request answers `404`.

### Authentication

What brew sends, captured, and never anything else:

| Route family | 7.0.6 | 4.6.20 |
|---|---|---|
| OCI-shaped routes under `HOMEBREW_ARTIFACT_DOMAIN` | `Bearer {HOMEBREW_DOCKER_REGISTRY_TOKEN}`, else `Basic {HOMEBREW_DOCKER_REGISTRY_BASIC_AUTH_TOKEN}`, else nothing | The same |
| Manifest under `HOMEBREW_BOTTLE_DOMAIN` | The same header, else the placeholder `Bearer QQ==`; nothing with `HOMEBREW_DOCKER_REGISTRY_BASIC_AUTH_TOKEN=none` (source `brew.sh`) | No manifest request |
| Flat routes, a tap's `root_url`, API routes | Never a header; a netrc credential when `HOMEBREW_CURLRC` names a curl config with `netrc-file`, sent as preemptive Basic (captured on the hosted tap) | The same |

brew's curl runs with `--disable`, so `~/.curlrc` and `~/.netrc` are ignored unless `HOMEBREW_CURLRC`
names a config, which then applies to every download (captured in the command line). A netrc entry is
host-scoped, so it sends the credential only to this registry; the operator documentation prefers it to
a curl config header for that reason. `HOMEBREW_DOCKER_REGISTRY_TOKEN` is not sent to a tap's
non-ghcr `root_url` (captured: `401` with no header on both versions), so a private hosted repository
needs the netrc recipe.

How this meets `auth.md`, whose rules this spec does not bend: a registry token as Bearer, or as the
Basic password with any username, authenticates as the same principal (both universal rows of its
"Presentation forms" table, AC31), so both of brew's header forms and the netrc form carry a registry
token and the handler declares no route-scoped form. `auth.md`'s client table still has no `brew` row,
which this pass reports again (the auth half of the consequences queue's Open item 30 was never
applied). **The placeholder is not special**, per the
resolved placeholder decision below: `Bearer QQ==` is an invalid credential in a recognised form, so it
answers `401` and is never served as anonymous (`auth.md` AC12), which on 7.0.6 makes the manifest fall
back to ghcr.io, or, with egress closed, the install proceed with the warning "No bottle relocation
metadata was found for this `HOMEBREW_BOTTLE_DOMAIN`" and full relocation (captured with a missing
manifest; brew prints that it should use `HOMEBREW_ARTIFACT_DOMAIN` instead). The recipe sets a token or
`none`. The `401` this format answers carries `WWW-Authenticate: Basic realm="{repository}"` on every
route and is identical for a private and a missing repository (`auth.md` AC17); a valid token lacking
`pull` answers `404`; plain HTTP carrying a credential is refused before lookup (`auth.md` AC27).

### Addressed objects and pattern scopes

`auth.md`'s pattern scopes narrow a credential within one repository by matching the object each
request addresses, and the format declares which object each route reports ("Pattern scopes" there;
`format-handler-interface.md` AC12). Per the resolved addressed-object decision below, the canonical
object depends on the repository kind, since a scope binds to one repository:

| Route | Canonical object | Action | Object kind |
|---|---|---|---|
| Hosted flat bottle `{filename}` | `{name}/{pkg_version}/{bottle_tag}/{rebuild}`, parsed from the filename at its first hyphen followed by a digit (unambiguous by the ingest rule) | `pull` | named |
| Publish (management API, one object per file, all must match) | `{name}/{pkg_version}/{bottle_tag}/{rebuild}` | `push` | named |
| Delete (management API, per file) | `{name}/{pkg_version}/{bottle_tag}/{rebuild}` | `delete` | named |
| Remote OCI-shaped `v2/{org}/{repo}/{image}/manifests/{tag}` | `{org}/{repo}/{image}/{tag}` (the image may hold `/`) | `pull` | named |
| Remote `{image}/manifests/{tag}` (the flat namespace) | `homebrew/core/{image}/{tag}`, the same object as the OCI route | `pull` | named |
| Remote `v2/.../blobs/sha256:{digest}` | - | `pull` | content-addressed |
| Remote flat bottle (resolves only by an upstream lookup) | - | `pull` | none |
| API routes (they enumerate every formula, so they are not descriptors under `auth.md`'s resolved name-free-document decision, was Q23) | - | `pull` | none |
| Any other route | - (answered `404`) | `pull` | none |

A virtual repository reports the object of the route shape it serves, so a pattern on a virtual
repository is written against the shape of the member it is meant to reach. What that gives, applying
`auth.md`'s rules rather than re-deciding them: **a patterned `pull` confines hosted bottle downloads**,
`acme-cli/**` fetching every `acme-cli` bottle and answering `404` for any other; **a patterned `pull`
on a remote works through `HOMEBREW_ARTIFACT_DOMAIN`**, where `homebrew/core/hello/**` fetches `hello`'s
manifest and its blob by digest and is refused `jq`'s manifest; **a patterned `pull` cannot read the API
or the remote flat layout**, both reporting none, and brew then falls back to Homebrew's hosts unless
egress is closed, which the operator documentation states; **a pattern refusal on a named route is
answered as absence**, `404`; and **a patterned `push` publishes only inside its pattern**, an
out-of-pattern file refusing the whole operation `unauthorized` (403) with no snapshot
(`management-api.md` AC3, AC4).

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines on a **bottle
route** (a flat file, an OCI-shaped blob or manifest) on either path, the handler answers `403`, per the
resolved refusal-rendering decision below: on flat routes with `Content-Type: text/plain` and the body
`refused by policy {policy}, rule {rule}: {detail}` (or naming the signal, for a coordinate condemned
under the shared security-signal rule); on OCI-shaped routes in the distribution error envelope with
code `DENIED` and that message, as `oci.md` renders it. Both are written through the shared refusal
writer `WriteRefusal(w, r, refusal, body)` in `internal/format` (`format-handler-interface.md` AC14;
`supply-chain-policy.md`, its resolved refusal-status-line decision, was Q10), which puts
`Refused by policy: {condition}` in the status line on HTTP/1.1. Neither the phrase nor the body
reaches a brew user, who sees curl's rendering of the status code (captured), which
`supply-chain-policy.md` records as the reason nothing forces HTTP/1.1 for this format; the refusal
record is the channel that carries the reason, every refused request writes one naming the
coordinate, and brew retries (a flat refusal drew five requests on 7.0.6, captured). Where the
refusal holds is `supply-chain-policy.md`'s `client-setting` row for this format, from the fallback
table above.

**The API keeps naming a refused bottle**, the no-elision precedent of `conan.md`, `debian.md`,
`puppet.md`, `hackage.md` and `cpan.md`, and here without choice: the API is Homebrew's signed document.
Whether the refusal holds is the fallback table's question: it holds for the recipe configuration and
for hosted tap bottles, and under `HOMEBREW_BOTTLE_DOMAIN` only with egress restricted.

### Signing, provenance and policy

**Homebrew signs its index, not its bottles.** The API's JWS names each bottle's SHA-256, so per the
resolved signature-verdict decision below the verdict source `supply-chain-policy.md` consumes answers
**verified, with chain `repository-chain`** (`artifact-verification.md`'s "CPAN, Hackage, Homebrew"
paragraph) for a remote bottle whose blob digest is named by the bottle entry of an API document the
remote verified, with the verifying key's `kid`; **absent** for a remote bottle no verified document
names (a third-party tap's ghcr.io bottle) and for every hosted bottle, whose digest comes from the
customer's Git. A rule requiring a **publisher** identity does not accept a `repository-chain` verdict
and one requiring any verified verdict does (`supply-chain-policy.md`, "Signature and attestation state
is a consumed verdict"). A rule requiring a verified signature therefore refuses every hosted bottle
(`supply-chain-policy.md` AC15), which the operator documentation states. GitHub's build-provenance
attestations stay out of band (Scope); a cached bottle is byte-identical, so `gh attestation verify`
still succeeds for a user who runs it.

**Advisory coverage is absent from the default feed, and exists beside it.** OSV's exported ecosystem
list has no Homebrew entry and `Homebrew/all.zip` answers `404`, although the query API recognises the
name and the OSV schema documents it (Context). Per the resolved advisory decision below, as revised by
`supply-chain-policy.md`'s resolved advisory-sources decision (was Q9: one OSV schema, several
sources), coverage is determined from the configured sources' own ecosystem lists: with the default
feed alone an advisory-dependent rule attached to a Homebrew repository is refused at configuration
and the feed channel of the shared security-signal rule never condemns a Homebrew coordinate, and the
moment an operator declares Homebrew's own OSV-format database (13,023 records, keyed by formula name
with `_revision` versions, the purl `brew` name) as a `policy.feed.sources` entry listing the
`Homebrew` ecosystem, the same rule becomes configurable with no change here (its coverage table's
Homebrew row). One condition that row does not state is reported rather than assumed: the records'
`ECOSYSTEM` ranges (`fixed` at `2.9.3_1`) need Homebrew's version ordering with its `_revision`
suffix, which is not among the orderings the matcher vendors, and a range under an ordering the
matcher lacks binds no rule. Byte-level rules depend on the shared cataloguer's reading of bottle
archives, which that spec decides.

### Content negotiation and headers

- **API documents**: `Content-Type: application/json`; gzip-encoded when the request accepts it (brew
  always does, captured) with `Vary: Accept-Encoding` and an `ETag` that differs per encoding, since the
  signature is inside the content; the cache-scoped `Last-Modified`; `Cache-Control: no-cache`. The
  validators come from the shared serving helper, never the handler; that helper states no on-request
  compression with a per-encoding `ETag`, which `chef.md`'s gzip-encoded universe needs too, so the
  requirement is reported beside the serve-time rendering gaps already raised against
  `signing-service.md`.
- **Bottles**, flat and blob: no `Content-Encoding`, since each is a `.tar.gz` hashed as served (brew
  sends `Accept: */*` and no `Accept-Encoding` for them, captured); `Content-Type: application/gzip` on
  flat routes and the OCI layer media type on blobs, never a `text/*` type (brew treats a `text/`
  response differently in its download cache, source); `Accept-Ranges: bytes` with one byte range
  answered `206`, because brew resumes a partial download with `curl --continue-at -` when the server
  advertises ranges (source `curl_download`); `Cache-Control: public, max-age=31536000, immutable`;
  `HEAD` answered like `GET` without a body.
- **Manifests**: the upstream's media type and `Docker-Content-Digest`, the cache-scoped
  `Last-Modified`, `Cache-Control: no-cache`.
- **No hosted route answers a redirect**, and every route may be served over HTTP/1.1 or HTTP/2.

### What it needs from Deps

The pinned `Deps` (`format-handler-interface.md`, "The pinned method set"): the CAS, the metadata store
at all three levels with snapshot-pointer resolution, the fetch-and-cache entry point with
classification and `upstream.Options` as arguments, the central authorizer, the `*slog.Logger` with
request correlation, the policy-enforcing resolution calls returning the typed refusal and
`WriteRefusal` beside it, and the `Verifier` consumer interface. The three things this spec first
requested of siblings are now theirs and reached through that set: the JWS entry of
`artifact-verification.md` through `Verifier`, the completion-only mode's post-receipt verifier hook
of `proxy-cache.md` through fetch-and-cache, and the cache-scoped `Last-Modified` of `proxy-cache.md`
through its serving helper. The handler also reads a bottle remote's cached manifest while resolving a
flat filename; that is the same handler reading its own repository's cache through `Deps`. It imports
none of `internal/verify`, `internal/upstream`, `internal/policy` or `internal/manage`
(`format-handler-interface.md` AC15).

### Conformance, the clients and the corpus

Every case runs on both clients unless it names a version-specific behaviour, and the catalogue counts
one ecosystem, brew appearing in the matrix's Client column under the Homebrew row. **The skew that
matters** is the API's shape (four legacy documents against one internal document), 7.0.6's manifest
fetch under `HOMEBREW_BOTTLE_DOMAIN`, its fallback from `HOMEBREW_ARTIFACT_DOMAIN` and the switch that
closes it, 4.6.20's unconditional API refresh, and `none` as a Basic token value, which only 7.0.6
understands. The images are used as published, and a runtime check uses a formula whose bottle runs on
both (a current `jq` bottle installed on 4.6.20's Ubuntu 22.04 and failed to run for want of glibc
2.38, captured; `hello` runs on both).

**Every case runs with the client's network restricted to this registry and its stand-ins**, except
the recording session. The stand-ins answer as `ghcr.io` (with its token endpoint and a
`pkg-containers.githubusercontent.com` blob host behind a `307`), `formulae.brew.sh`,
`raw.githubusercontent.com` and a source host, on the case network with the harness CA installed in the
image's system trust store, which brew's curl uses. Client containers reach only the case network
(`conformance-harness.md` AC23, its resolved client-confinement decision, was Q6). The two harness
obligations this spec first recorded are met there: **the API stand-in serves a recorded snapshot of
genuinely Homebrew-signed documents**, since no other key is accepted (the signed documents of two
successive generations and the bottles and manifests they name for the matrix's formulae; that spec's
"Upstream bindings" states it for this format); and the stand-ins resolve by name inside the client
container as `hosts` sub-entries of their `upstreams` entry (its AC23), which is what lets AC17 stand in
for four public hosts.

The case set needs only keys already in the harness's closed `setup` vocabulary: `repositories` with
type, virtual member order and a bottle remote's namespace list in its repository document,
`credentials` (patterned tokens included), `upstreams` (the stand-ins above, with variants for a
regressed generation, a failing signature, a rebuilt tag, a removed blob, swapped bytes and a
throttled answer), `trust` for the API remote's `homebrew-1` key (`artifact-verification.md` AC25),
`state` for pre-published hosted bottles and the `Retirement` records a deletion would have left, and
`advisories` and `policies`, the latter runnable because this format's binding row is not `pending`
(`conformance-harness.md` AC26). The case `script` writes the tap formula, the `HOMEBREW_*` environment
and the curl config, and drives each declared management kind through the operations endpoint.

### Capabilities and rename

`Capabilities()` declares proxy support `supported`, reference-implementation availability `available`,
`Virtual: supported` and `Rename: supported` (`format-handler-interface.md` AC13). No document this
format serves carries the repository's name: hosted bottles are archives and remote API documents are
Homebrew's bytes, so a rename changes nothing the handler serves and needs no `configure` operation
(`repository-lifecycle.md`, "Renaming"). The client-side cost is that spec's accepted one (its resolved
rename-alias decision, was Q2), in Homebrew's shape: every tap formula's `bottle do` block carries a
`root_url` naming the old repository, and every `HOMEBREW_*_DOMAIN` setting does too, so installs fail
with the status code until the tap's formulae and the environment are updated. The case the harness
requires of every format (`conformance/homebrew/rename_test.go`, `repository-lifecycle.md` AC12,
presence enforced by `conformance-harness.md` AC26) proves both halves on both clients (AC28).

The recorded surface for the replay corpus: against `formulae.brew.sh`, one internal and one legacy
document; against ghcr.io, one index manifest, one blob request through its `307`, and an unknown tag.
The reference implementation for reads is Homebrew's own hosting, so `Capabilities()` declares
reference-implementation availability `available`; publish has no reference, since no Homebrew tool
publishes elsewhere. Recording gates on the harness's redaction criterion (`conformance-harness.md`
AC13), whose rule for this format names the `Authorization` header, netrc credentials and ghcr.io's
anonymous tokens and signed redirect URLs. Deliberate divergences go on the exception list before their
flow is expected to replay: the cache-scoped `Last-Modified`, the path prefix, `404` on unsigned API
paths and outside the namespace list, and `405` on remote writes.

## Acceptance Criteria

- [ ] AC1: With the client network restricted to this registry, brew 7.0.6 with `HOMEBREW_API_DOMAIN`
      set to an API remote and `HOMEBREW_ARTIFACT_DOMAIN` set to a bottle remote with
      `HOMEBREW_ARTIFACT_DOMAIN_NO_FALLBACK=1`, and brew 4.6.20 with the same two settings, each install
      `hello` and a formula with a bottled runtime dependency; the transcript shows each version's API
      documents (`internal/packages.x86_64_linux.jws.json` on 7.0.6; `formula.jws.json`,
      `formula_tap_migrations.jws.json` and `cask.jws.json` on 4.6.20), then per formula a manifest
      `GET` with the OCI index `Accept` and one blob `GET`; and `hello` runs on both.
- [ ] AC2: With `HOMEBREW_BOTTLE_DOMAIN` set to a bottle remote and the network restricted, both
      versions install `hello` and `openssl@3` through the flat layout, requesting
      `openssl%403-{version}.x86_64_linux.bottle.tar.gz`; 7.0.6 first fetches
      `openssl/3/manifests/{version}` (and for a rebuilt bottle the tag
      `{pkg_version}-{rebuild}`) and prints no relocation warning when
      `HOMEBREW_DOCKER_REGISTRY_BASIC_AUTH_TOKEN=none` is set; and 4.6.20 requests no manifest.
- [ ] AC3: An API remote serves every document byte-identical to the upstream's identity bytes, each
      upstream request carrying `Accept-Encoding: identity`; an upstream document whose payload was
      altered, re-signed with another key under `kid` `homebrew-1`, signed under another `kid`, or
      stripped of its envelope is never cached or served and leaves no negative entry, the JWS entry
      running as an integrity call in the completion-only mode's verifier hook before any commit, the
      previously cached document keeps serving and brew keeps installing from it, and the reason
      reaches the operator record; and a path that is not a signed-document shape answers `404` with
      no upstream request.
- [ ] AC4: After the API remote adopts a newer generation, brew 7.0.6 continuing its cache revalidates,
      receives `200` and holds the newer document, and 4.6.20 holds it after its next refresh; every
      cached document is served with the `Last-Modified` of its cache-scoped `adopted_at`, never the
      upstream's, no earlier than the time the remote began serving its bytes and later than any it
      served before on that route, including with the clock stepped backwards; a conditional request
      earlier than it answers `200` and one not earlier answers `304`, including one later than it
      and unequal, under the `not-earlier` rule `proxy-cache.md` AC22 lets this format declare; and no
      response is a `200` whose `Last-Modified` is not later than the request's
      `If-Modified-Since`.
- [ ] AC5: When the upstream answers an `internal/packages.*` document whose `metadata.generated_at` is
      older than the cached one's, or a legacy document whose `Last-Modified` is earlier than the
      adopted revision's, the remote keeps serving the cached document under its unchanged record,
      records and alerts the regression, and brew 7.0.6 continues with the newer document.
- [ ] AC6: A `publish` operation through the operations endpoint, naming a bottle archive committed
      through an upload session with its `brew bottle --json` record, stores it in exactly one snapshot
      at its single-hyphen flat filename, including when the part carries `brew bottle`'s local name
      `{name}--{pkg_version}...`, and its result document returns the filename, SHA-256, cellar and
      `root_url`; a tap formula whose `bottle do` block carries that `root_url` and SHA-256 then
      installs on both versions with `HOMEBREW_CURLRC` naming a netrc credential; a retry carrying the
      first request's `Idempotency-Key` and payload replays its outcome with no snapshot; a publish of
      an existing file is refused `conflict` (409) with the same or different bytes; and a deleted file
      is refused `retired` (409) with any bytes, including after the deleting snapshot is pruned.
- [ ] AC7: Each of these publishes is refused `validation` (422) naming the rule, with nothing
      committed and no snapshot:
      a formula name outside the grammar, with an uppercase letter, or with a hyphen followed by a digit;
      a version not starting with a digit; a bottle tag outside `[a-z0-9_]+`; an archive entry outside
      `{name}/{pkg_version}/`, an absolute or `..` path, a symbolic or hard link resolving outside that
      directory, or a device; and a record whose name, version, tag, rebuild, cellar or SHA-256 disagrees
      with the archive or the request.
- [ ] AC8: A bottle altered in storage by fault injection is refused by 7.0.6 with "Bottle reports
      different checksum" and by 4.6.20 with "SHA-256 mismatch", both exiting non-zero with no altered
      byte installed, on the hosted flat route and on the remote's flat and OCI-shaped routes.
- [ ] AC9: On a bottle remote, a blob whose bytes do not hash to the digest in its path, a manifest whose
      bytes do not hash to the upstream's `Docker-Content-Digest`, a flat resolution whose blob does not
      match the index's `sh.brew.bottle.digest`, and a truncated body are never committed, with the real
      reason in the operator record; an upstream `404` is negatively cached while a `429` or `5xx` is
      neither cached as absence nor surfaced as not-found.
- [ ] AC10: Against a ghcr.io stand-in that refuses a request with no token or with a token its endpoint
      did not issue, a bottle remote obtains a pull token per image scope from the challenge's realm,
      reuses it within its lifetime, follows the `307` to the stand-in `pkg-containers.githubusercontent.com` blob
      host without an `Authorization` header, and serves the blob, asserted at the network layer.
- [ ] AC11: A bottle remote answers `404` with no upstream request for an OCI-shaped route outside its
      namespace list, and serves one inside a second listed namespace.
- [ ] AC12: A bottle remote resolves flat filenames for a formula with a hyphenated name, one with a
      hyphenated version, one whose name contains a hyphen followed by a digit, `openssl@3`, a
      formula whose name contains `+`, and a `pkg_version` with a `_{revision}` suffix, each to the blob
      whose index child carries the matching `org.opencontainers.image.ref.name`, and a repeat request inside the
      TTL makes no manifest request; an unresolvable filename answers `404` and is negatively cached.
- [ ] AC13: A stand-in presenting each removal-table event produces this format's classification in the
      table, including a rebuilt tag: after the adoption the flat route serves the new blob, verified
      against the new `sh.brew.bottle.digest`, to both versions holding the new API document; both
      versions holding the pre-rebuild API document (`HOMEBREW_NO_AUTO_UPDATE` set) on
      `HOMEBREW_ARTIFACT_DOMAIN` are served the old blob by its digest and install, including after a sweep run with the repository's grace lapsed
      while the new index is current; the divergence record names both digests; and once LRU
      eviction ends the old blob's cached reference, the next sweep past grace collects it and a
      request for its digest re-fetches from the stand-in, answering `404` when the stand-in no
      longer holds it.
- [ ] AC14: On a private repository over TLS, both versions install through `HOMEBREW_ARTIFACT_DOMAIN`
      with `HOMEBREW_DOCKER_REGISTRY_TOKEN` (sent as Bearer) and with
      `HOMEBREW_DOCKER_REGISTRY_BASIC_AUTH_TOKEN` (sent as Basic), and install a hosted tap bottle and
      read the API with a netrc credential through `HOMEBREW_CURLRC`; a request with no credential
      answers `401` with a Basic challenge identically for a private and a missing repository;
      `Bearer QQ==` answers `401` and is never served as anonymous, including on a repository with
      anonymous read; a token lacking `pull` answers `404`; plain HTTP carrying a credential is refused
      before lookup; and no credential appears in the registry's logs, error bodies or metrics.
- [ ] AC15: In hosted and proxied mode, a token holding `pull` patterned `acme-cli/**` on a hosted
      repository installs `acme-cli` and is answered `404` for another formula's bottle, the answer a
      nonexistent file gets; a token holding `pull` patterned `homebrew/core/hello/**` on a bottle remote
      fetches `hello`'s manifest and blob through `HOMEBREW_ARTIFACT_DOMAIN` and is answered `404` for
      `jq`'s manifest; the same token is refused every API route and the remote flat route; and a token
      holding `push` patterned `acme-cli/**` publishes `acme-cli` and is refused `unauthorized` (403)
      on `acme-other` with no snapshot.
- [ ] AC16: A bottle the shared policy layer refuses answers `403` on the hosted flat route and on the
      remote's flat and OCI-shaped routes, with a `text/plain` body naming the policy on flat routes and a
      `DENIED` error envelope on OCI-shaped routes, while the API keeps naming it; brew 7.0.6 with
      `HOMEBREW_ARTIFACT_DOMAIN_NO_FALLBACK` and brew 4.6.20 print "The requested URL returned error:
      403" and exit non-zero with no request to any other host, asserted at the network layer; and each
      refused request produces a refusal record naming the coordinate.
- [ ] AC17: With stand-ins answering as `ghcr.io`, `formulae.brew.sh`, `raw.githubusercontent.com` and a
      source host on the client network, the recipe configuration (`HOMEBREW_API_DOMAIN` and
      `HOMEBREW_ARTIFACT_DOMAIN`, with `HOMEBREW_ARTIFACT_DOMAIN_NO_FALLBACK` on 7.0.6) sends no request to
      the `ghcr.io` stand-in through a bottle refusal on either version; and each exposure the
      documentation names does reach its stand-in: a `HOMEBREW_BOTTLE_DOMAIN` refusal on both versions,
      a refused or missing API document on both, 7.0.6's `HOMEBREW_ARTIFACT_DOMAIN` without the switch,
      and a source build, so the documentation's warnings are true.
- [ ] AC18: Deleting a hosted bottle file through the `delete-file` kind creates one snapshot and one
      `Retirement` record per file, after which it answers `404` and a tap formula naming it fails to
      install on both versions with a non-zero exit and no source build; the file stays retired after
      a backwards repoint and after the deleting snapshot is pruned; and after every file of a formula
      is deleted the `Package` row survives.
- [ ] AC19: The handler's `Operations()` declares exactly `publish` and `delete-file`, each driven by a
      `script` case; publish and deletion are refused with no snapshot for a principal lacking `push`
      or `delete` respectively, and answer `405` with problem type `repository-type` against a remote
      or virtual repository.
- [ ] AC20: A virtual repository over a hosted repository, a bottle remote and an API remote serves the
      API remote's documents byte for byte with a `Last-Modified` that moves forward when the member
      adopts a generation, a hosted flat
      bottle before a remote one, and OCI-shaped routes from the bottle remote; both versions install
      core and tap formulae from it with only this registry reachable; a hosted bottle whose flat
      filename equals a core bottle's makes brew refuse the core install with a checksum error rather
      than install the hosted bytes; a hosted member answers `404` on API routes; and publish to the
      virtual repository answers `405` with problem type `repository-type`.
- [ ] AC21: A remote bottle whose digest is named by a verified API document carries the verdict
      verified with chain `repository-chain` and the key's `kid`, a remote bottle no verified document
      names and every hosted bottle carry absent, a policy rule requiring any verified signature serves
      the first and refuses the others naming the reason, and a rule requiring a publisher identity
      refuses all three.
- [ ] AC22: With only the default feed, an advisory-dependent rule attached to a Homebrew repository is
      refused at configuration naming the absent coverage and no Homebrew coordinate is condemned by
      the feed; and a fixture second source declared through `policy.feed.sources` whose ecosystem list
      names Homebrew makes the same rule configurable with no change to this handler.
- [ ] AC23: API documents answer `Content-Type: application/json`, gzip-encoded with
      `Vary: Accept-Encoding` when accepted and with an `ETag` distinct per encoding; bottles carry no
      `Content-Encoding` and no `text/*` type, advertise `Accept-Ranges: bytes`, answer one byte range
      with `206`, and carry the immutable caching header; a brew download interrupted mid-bottle resumes
      with a range request and installs; `HEAD` answers like `GET` without a body; and no hosted route
      answers a redirect.
- [ ] AC24: Replay-match passes against a corpus recorded from `formulae.brew.sh` and ghcr.io covering the
      recorded surface named in Design, with the `Authorization` header, netrc credentials, ghcr.io
      tokens and signed redirect URLs redacted.
- [ ] AC25: A hosted repository's bottles survive a GC sweep while a retained snapshot or a pointer
      holds them; an API remote's current documents (each above the inline threshold) and a bottle
      remote's current manifests and cached bottles survive a sweep run with the repository's grace
      lapsed, with no declared blob-digest list on either remote, and serve both clients afterwards;
      after an adoption replaces an API document or a manifest, the next sweep past grace collects
      the superseded body, which no route can request; and a digest that only a flat-filename
      resolution or an API document names, with no cached reference of its own, is collected by
      the first sweep past grace.
- [ ] AC26: A hosted repository answers `404` on every API route and on `v2/` routes, and brew with
      `HOMEBREW_API_DOMAIN` pointed at it installs nothing from it when egress is closed, printing the
      failed fetch of the default domain, which is the documented reason a hosted repository is never an
      API domain.
- [ ] AC27: Every name is matched exactly on every route: an uppercase formula name, an unencoded `@` in
      a flat filename brew never sends, and a manifest tag that differs only in its rebuild suffix each
      answer `404`, while the forms brew sends resolve.
- [ ] AC28: The handler's `Capabilities()` declares proxy `supported`, reference-implementation
      `available`, `Virtual: supported` and `Rename: supported`; after a rename, both versions install a
      tap bottle and a core formula from the new name once the tap's `root_url` and the `HOMEBREW_*`
      settings name it, a request to the old name answers `not-found`, and a tap formula still naming
      the old `root_url` fails to install with a non-zero exit.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/homebrew/artifact_domain_test.go` (both images, network-restricted client containers, API and bottle remotes over the stand-ins, transcript order per version, `hello` run) |
| AC2 | conformance | `conformance/homebrew/bottle_domain_test.go` (flat layout on both versions, percent-encoded `openssl@3`, 7.0.6 manifest request and absence of the relocation warning with the `none` token, no manifest on 4.6.20) |
| AC3 | integration + conformance | `internal/format/homebrew/api_verify_test.go` (the four failing variants against the JWS integrity call in the verifier hook, commit refused, no negative entry, previous document served, operator record, `404` shapes, identity encoding upstream; the layer half being `proxy-cache.md` AC20's `internal/proxy/completion_mode_test.go`, the entry `artifact-verification.md` AC16's `internal/verify/jws/jws_test.go`); `conformance/homebrew/api_remote_test.go` (byte comparison, install from the retained document) |
| AC4 | conformance + integration | `conformance/homebrew/freshness_test.go` (two recorded generations, 7.0.6 and 4.6.20 with persisted caches; the proxied rollback case `proxy-cache.md` AC22 names under `conformance/homebrew/`); `internal/format/homebrew/last_modified_test.go` (the served value from `adopted_at`, the not-earlier `304` rule including a later unequal condition, never a `200` older than the condition, injected clock stepped backwards; the record half being `proxy-cache.md` AC22's and `data-model.md` AC44's `internal/proxy/freshness_test.go`) |
| AC5 | integration + conformance | `internal/format/homebrew/regression_test.go` (older `generated_at`, and an earlier legacy `Last-Modified`, not adopted, alert); `conformance/homebrew/regression_test.go` (7.0.6 keeps the newer document) |
| AC6 | integration + conformance | `internal/format/homebrew/publish_test.go` (snapshot count, served filename, result-document fields, `conflict` on an existing file, `retired` after deletion and pruning); `internal/manage/idempotency_test.go` (the keyed replay, `management-api.md` AC17); `conformance/homebrew/hosted_tap_test.go` (the `script` publishes through the operations endpoint; tap formula with `root_url`, netrc through `HOMEBREW_CURLRC`, both versions) |
| AC7 | integration | `internal/format/homebrew/ingest_test.go` (one malformed or hostile archive or record per rule through `Apply`'s peek, `validation`, CAS and snapshot unchanged) |
| AC8 | conformance | `conformance/homebrew/tamper_test.go` (storage fault injection, hosted and proxied, flat and OCI-shaped, both versions, exit status and text) |
| AC9 | integration | `internal/format/homebrew/proxied_gate_test.go` (blob, manifest and flat-resolution mismatches, truncation, operator record); `internal/format/homebrew/proxied_negative_test.go` (`404`, `429`, `5xx`) |
| AC10 | integration | `internal/format/homebrew/ghcr_adapter_test.go` (stand-in token endpoint and blob host, per-scope token reuse, no `Authorization` across the redirect, network-layer assertion; the adapter half being `upstream-adapters.md` AC16's and AC6's) |
| AC11 | integration | `internal/format/homebrew/namespace_test.go` (outside and second listed namespace, no upstream request) |
| AC12 | integration | `internal/format/homebrew/flat_resolution_test.go` (the five name shapes against a stand-in index, request counts inside the TTL, negative cache) |
| AC13 | integration + conformance | `internal/format/homebrew/removal_test.go` (a stand-in presenting each removal-table event; a rebuilt tag with the flat route before and after the re-resolution, the old blob requested by digest across a sweep on an injected clock with the grace lapsed, the object store and the divergence record read afterwards, then the old blob evicted, swept and re-fetched against a stand-in that holds it and one that answers `404`); `conformance/homebrew/rebuilt_tag_test.go` (both versions with the pre-rebuild API document and `HOMEBREW_NO_AUTO_UPDATE` installing through `HOMEBREW_ARTIFACT_DOMAIN`, both versions with the new API document installing through the flat and OCI-shaped layouts) |
| AC14 | conformance + integration | `conformance/homebrew/auth_test.go` (TLS private repository, Bearer and Basic on both versions, netrc for tap and API, anonymous, placeholder, `pull`-less and plain-HTTP cases); `internal/auth/leak_test.go` (redaction for this format) |
| AC15 | conformance + unit | `conformance/homebrew/pattern_test.go` (the pattern-refusal case `auth.md` AC8 and `format-handler-interface.md` AC7 require, both modes, hosted and remote patterns, API refusal, patterned publish); `internal/format/homebrew/scope_object_test.go` (the object table per route, `format-handler-interface.md` AC12) |
| AC16 | conformance + integration | `conformance/homebrew/policy_test.go` (hosted and proxied through the `policies` key, both versions, network-layer assertion); `internal/format/homebrew/refusal_record_test.go` (a record per refused request, both body shapes); `internal/format/refusal_writer_test.go` (`supply-chain-policy.md` AC18) |
| AC17 | conformance | `conformance/homebrew/fallback_test.go` (stand-ins for the four public hosts with the harness CA, the recipe and each named exposure, network-layer assertions) |
| AC18 | conformance + integration | `conformance/homebrew/delete_test.go` (the `script` deletes through the operations endpoint; tap install failing after deletion, both versions); `internal/format/homebrew/retirement_test.go` (`Retirement` rows, backwards repoint, pruning, `Package` row survival) |
| AC19 | integration + conformance | `internal/format/homebrew/manage_auth_test.go` (the declared `Operations()` set, action refusals per operation, `405` `repository-type` on remote and virtual); the `script`-driven case per declared kind `management-api.md` AC24 requires, presence enforced by `conformance-harness.md` AC26, is the pair of conformance files in the AC6 and AC18 rows |
| AC20 | conformance + integration | `conformance/homebrew/virtual_test.go` (installs from one URL on both versions, collision refused by brew, `405`); `internal/format/homebrew/virtual_resolution_test.go` (member order per route family, API pass-through and its own `Last-Modified`, hosted `404` on API) |
| AC21 | integration | `internal/format/homebrew/signature_verdict_test.go` (verified with chain `repository-chain`, absent for an unnamed remote bottle and for hosted, outcomes under an any-verified and a publisher rule) |
| AC22 | integration | `internal/format/homebrew/advisory_config_test.go` (rule refused with the default feed, no condemnation, a fixture second source listing Homebrew through `policy.feed.sources`; shared with `supply-chain-policy.md` AC21) |
| AC23 | integration + conformance | `internal/format/homebrew/headers_test.go` (types, encodings, per-encoding `ETag`, ranges, caching, `HEAD`, no redirects); `conformance/homebrew/resume_test.go` (interrupted download resumed by brew) |
| AC24 | conformance | `conformance/homebrew/replay_test.go` (corpus replay against the recorded surface with the named redactions) |
| AC25 | integration + property | `internal/storage/metadata_root_test.go` (cached API documents, bottles and hosted bottles across a sweep, then serving); `internal/format/homebrew/proxied_gc_test.go` (a sweep on an injected clock with the grace lapsed after each adoption of an API document and of a manifest, the object store read afterwards: current bodies and cached bottles present, superseded bodies and digests only a resolution or an API document names collected); `internal/storage/gc_property_test.go` (supersession of a CAS-backed document interleaved with the sweep, `storage-and-gc.md` AC16) |
| AC26 | conformance + integration | `conformance/homebrew/hosted_api_test.go` (brew against a hosted repository as API domain with egress closed); `internal/format/homebrew/routes_test.go` (`404` on API and `v2/` routes of a hosted repository) |
| AC27 | integration + conformance | `internal/format/homebrew/names_test.go` (uppercase, unencoded `@`, wrong rebuild suffix); `conformance/homebrew/names_test.go` (the forms brew sends on both versions) |
| AC28 | unit + conformance | `internal/format/homebrew/capabilities_test.go` (the four declarations, `format-handler-interface.md` AC13); `conformance/homebrew/rename_test.go` (`repository-lifecycle.md` AC12, presence enforced by `conformance-harness.md` AC26; both versions, old name `not-found`, a stale `root_url` failing) |

## Implementation Phases

### Phase 1: Hosted reads
- The format-first mount, the hosted flat route, headers and ranges, seeded bottles through `state`,
  the per-route addressed objects, the `403` rendering through `WriteRefusal`

### Phase 2: Publish and deletion
- Waits on `management-api.md` reaching `planned`
- The `Operator` declaration (`publish`, `delete-file`), publish from upload sessions with `Apply`'s
  ingest validation of archive and record, the served filename in the result document, deletion
  with core-held `Retirement`, the write-boundary declaration under concurrency, a `script` case per
  kind

### Phase 3: Proxied path
- Waits on `upstream-adapters.md`, `artifact-verification.md` and `proxy-cache.md`'s completion-only
  mode and cache-scoped freshness, all now specified
- The API remote with the JWS integrity call in the completion-only verifier hook, the regression
  guard and cache-scoped times; the bottle remote on the `distribution` adapter with namespaces,
  manifest and blob gates, flat resolution and ghcr.io's token exchange, cached bottles addressed by
  image and blob digest and no retained revision on either remote (was Q15); negative caching; the
  removal table; the `repository-chain` verdict; `405` `repository-type` on remote writes

### Phase 4: Virtual repositories and rename
- Per-route member resolution, API pass-through with the forward-moving served time,
  `Capabilities()` with the rename case (AC28)

### Phase 5: Corpus, fallbacks and gate
- The recorded signed fixture snapshot and the corpus against `formulae.brew.sh` and ghcr.io, the
  public-host stand-ins and the fallback cases, both clients in the matrix, the exception-list entries
  named in Design

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. The fourteen questions this draft raised were each written in the template's decision shape
and then adopted at their own recommendation under the owner's standing delegation of 2026-09-26, so
the loop can continue; each is recorded below as adopted rather than decided, folded through Scope,
Design, the criteria and the Test Plan in the same pass, and reversible by the owner at any time. The
2026-09-28 reconciliation with the foundation specs adopted no new question; where a foundation
decision changed what a record says, the record carries a dated note. The data-loss fix of
2026-09-28 raised and adopted one more the same way, on Opus (Q15, what a rebuilt bottle tag does
to the old bottle and what keeps a remote's content alive), awaiting a Fable recheck. `grep -rn
"standing delegation"` is the owner's review queue.

### Resolved: what a hosted repository serves (was Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: hosted repositories serve bottle
archives in the flat layout a tap's `root_url` addresses, and nothing else; no API document and no
manifest (Scope; Design, "The signed API documents"; AC6, AC26).

The question: brew can reach a registry through a tap's bottles, through the API, or through bottle
manifests, and only the first can be hosted without either Homebrew's private key or a reader.

**Recommendation:** A. The API is verifiable only under Homebrew's compiled-in key (captured), and brew
never requests a manifest for a non-ghcr `root_url` (source).

| Option | You get | It costs |
|---|---|---|
| **A. Flat bottles only** | Every hosted bottle brew can reach, nothing that cannot be verified | Private formulae live in the customer's Git tap |
| **B. Also a hosted API** | One URL for private formulae | Impossible without patching brew's trust root |
| **C. Also generated manifests** | Relocation metadata for hosted bottles | A document no brew configuration requests |

**Why this is yours:** it decides that this registry is a bottle host for taps, not a replacement for
them.

Accepted cost: formulae stay in Git.

### Resolved: taps as Git repositories (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: taps are not served or proxied;
the Git protocol is deliberately unimplemented for this format, as for Cargo and Julia (Scope).

**Recommendation:** A. A Git smart-HTTP server is a different serving stack from the pinned HTTP
handler, and a Git client in the handler's egress path is the bypass class the interface's egress rule
cannot see; neither is an effort argument.

| Option | You get | It costs |
|---|---|---|
| **A. Bottles here, formulae in the customer's Git host** | One serving stack, no Git egress | Two systems for one private tap |
| **B. Serve taps over Git** | One system | A Git server in a handler and formulae Ruby this registry hosts but brew evaluates |
| **C. Proxy upstream taps** | Cached tap clones | A Git client behind the egress boundary |

**Why this is yours:** it bounds the format at what a registry can serve over HTTP.

Accepted cost: private taps need a Git host.

### Resolved: the shape of a remote (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: two remote kinds, an API remote
over an API base and a bottle remote over an OCI registry with a namespace list, each with one upstream;
a virtual repository joins them (Design, "The proxied path"; AC1, AC11, AC20).

**Recommendation:** A. `data-model.md` AC16 gives a remote one upstream, brew configures the API and the
bottles separately, and a namespace list keeps a bottle remote from relaying arbitrary ghcr.io images.

| Option | You get | It costs |
|---|---|---|
| **A. API remote and bottle remote** | One upstream each; namespaces closed | Two remotes to configure, or one virtual |
| **B. One remote with two upstreams** | One object | A change to the shared model |
| **C. A bottle remote over all of ghcr.io** | No namespace list | An open relay to every public image |

**Why this is yours:** it sets the configuration a Homebrew operator writes.

Accepted cost: two remotes.

### Resolved: resolving the flat layout on a remote (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: resolve a flat filename through
the upstream image index, trying name and version splits rightmost first and matching the child ref
name, and commit the blob against `sh.brew.bottle.digest` (Design, "The proxied path"; AC2, AC9, AC12).

**Recommendation:** A. Flat filenames do not parse alone (9 live counterexamples to the obvious rule)
and a bottle remote has no API upstream to look names up in.

| Option | You get | It costs |
|---|---|---|
| **A. Resolve through the index** | Every live formula, one upstream | At most one extra manifest request per hyphen on a first miss |
| **B. Parse at the first hyphen before a digit** | No lookups | Nine live formulae unreachable |
| **C. Read the cached API** | Exact names | A bottle remote that depends on an API remote |

**Why this is yours:** it trades a few upstream requests for coverage of the whole core.

Accepted cost: the extra manifest requests, negatively cached.

### Resolved: the Last-Modified a cache serves (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: cache-scoped `Last-Modified`
(the time this repository began serving the bytes, never backwards), `304` when the condition is not
earlier, never a `200` curl would discard (Design, "Freshness"; AC4, AC20).

**Recommendation:** A. brew's condition is its own clock at its last fetch and curl discards an older
`200` (captured), so the upstream's time makes new generations lag.

| Option | You get | It costs |
|---|---|---|
| **A. Cache-scoped time** | Every adopted generation reaches every revalidating client | A `proxy-cache.md` revision; client clock skew can mask one generation |
| **B. The upstream's time** | No revision | A lag of one or more generations (captured) |
| **C. Never answer `304`** | Always fresh | 15 to 35 MB per revalidation, and curl still discards an older `200` |

**Why this is yours:** it asks the shared proxy layer for a rule on this format's account.

Accepted cost: the revision and the clock-skew note. Reconciled 2026-09-28: the revision landed as
`proxy-cache.md`'s "Freshness of what a remote serves" and its AC22, with the record in
`data-model.md` AC44. Its first wording, an exact-match `304` clause, left this record's
later-condition case undefined; the case was closed by `signing-service.md`'s resolved
later-condition decision (was its Q12), which `proxy-cache.md` AC22 now states as the `not-earlier`
rule this format declares for its API remote (Design, "Freshness").

### Resolved: an API regression upstream (was Q6)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a remote never adopts an
`internal/packages.*` document older by `generated_at` than the cached one, and alerts (Design, "The
proxied path"; AC5).

**Recommendation:** A. brew accepts an older signed generation (captured) and the upstream CDN answered
an older `Last-Modified` after a newer one (captured), so the cache is the only place a freeze can be
stopped.

| Option | You get | It costs |
|---|---|---|
| **A. Monotonic by `generated_at`** | No silent rollback through the cache | A legitimate upstream rollback needs an operator override |
| **B. Follow the upstream** | Pure mirroring | Replays and CDN regressions reach clients |

**Why this is yours:** it lets the cache overrule its upstream.

Accepted cost: the override for a deliberate upstream rollback (`management-api.md`'s remote refresh,
`POST /api/v1/repositories/{name}/refresh`, after the divergence is read). Reconciled 2026-09-28: the
legacy documents are no longer unguarded, because `proxy-cache.md` AC22 orders a revision with no
format ordering by upstream `Last-Modified` and never adopts an older one.

### Resolved: the placeholder bearer token (was Q7)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: `Bearer QQ==` is an invalid
credential like any other, answered `401`; the operator recipe sets a token or `none` (Design,
"Authentication"; AC2, AC14).

**Recommendation:** A. `auth.md` AC12 and AC31 forbid treating a rejected credential as anonymous, and
the placeholder reaches this registry only on 7.0.6's manifest request under `HOMEBREW_BOTTLE_DOMAIN`,
whose failure costs relocation metadata and not the install (captured).

| Option | You get | It costs |
|---|---|---|
| **A. No special case** | `auth.md` intact | The default `HOMEBREW_BOTTLE_DOMAIN` setup loses relocation metadata until configured |
| **B. Treat the placeholder as anonymous** | Zero configuration | A change to `auth.md` for one client's literal |

**Why this is yours:** it weighs a default-configuration nicety against a security rule.

Accepted cost: one setting in the recipe.

### Resolved: the recommended client configuration (was Q8)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the recipe is
`HOMEBREW_API_DOMAIN` plus `HOMEBREW_ARTIFACT_DOMAIN`, with `HOMEBREW_ARTIFACT_DOMAIN_NO_FALLBACK` on
7.x; `HOMEBREW_BOTTLE_DOMAIN` is supported with its unclosable fallback named (Design, the fallback
table; AC1, AC2, AC17).

**Recommendation:** A. It is the only configuration in which a bottle refusal holds without egress
control on both versions, and 7.0.6 itself tells `HOMEBREW_BOTTLE_DOMAIN` users to switch (captured).

| Option | You get | It costs |
|---|---|---|
| **A. The OCI-shaped recipe, flat supported** | Refusals hold; relocation metadata present | The API fallback still needs egress control |
| **B. Flat layout as the recipe** | The older mirror convention | Every refusal falls back to ghcr.io |

**Why this is yours:** it sets what the documentation tells users to type.

Accepted cost: the API exposure, documented.

### Resolved: addressed objects (was Q9)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: hosted bottles report
`{name}/{pkg_version}/{bottle_tag}/{rebuild}`, made unambiguous by ingest refusing names with a hyphen
before a digit and versions not starting with one; remote OCI routes and the flat-namespace manifest
report `{org}/{repo}/{image}/{tag}`; remote flat bottles and API routes report none (Design, "Addressed
objects"; AC7, AC15).

**Recommendation:** A. Patterned hosted downloads need a parse that never guesses, which the ingest rule
guarantees, and a remote's flat filenames resolve only by lookup, which the precedent reports as none.

| Option | You get | It costs |
|---|---|---|
| **A. Unambiguous hosted objects, none where a lookup is needed** | Patterns on hosted bottles and remote OCI routes | Nine live name shapes cannot be hosted |
| **B. The filename as one segment** | Any name hostable | Patterns like `hello-*` also match `hello-world` |
| **C. None on every bottle route** | No ingest rule | Patterned tokens cannot download at all |

**Why this is yours:** it trades hostable names for patterned access.

Accepted cost: the name and version shapes the rule refuses.

### Resolved: rendering a policy refusal (was Q10)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: `403` with a text body on flat
routes and a `DENIED` envelope on OCI-shaped routes, the API unchanged, no transport pinned (Design,
"Policy refusals on the wire"; AC16).

**Recommendation:** A. brew shows only the status (captured), so no reason-phrase trick helps, and the
bodies serve scripts and the OCI convention.

| Option | You get | It costs |
|---|---|---|
| **A. `403` with bodies, any HTTP version** | A clear status; records carry the reason | The user sees no policy name |
| **B. `404` for a refused bottle** | Nothing revealed | A refusal indistinguishable from absence, and a fallback trigger under the flat layout anyway |

**Why this is yours:** it accepts that the reason cannot reach a brew user on the wire.

Accepted cost: the reason travels only through the refusal record and the documentation.

### Resolved: the signature verdict (was Q11)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: verified (Homebrew API) for a
remote bottle whose digest a verified API document names; absent otherwise, hosted included (Design,
"Signing, provenance and policy"; AC21).

**Recommendation:** A. The API's signature is the only signature on the wire, and it covers the digest.

| Option | You get | It costs |
|---|---|---|
| **A. Verified through the API chain** | Signature rules work for core bottles | Hosted bottles never verify |
| **B. Absent for everything** | Nothing to compute | Signature rules refuse all Homebrew content |

**Why this is yours:** it decides what "signed" means for a bottle.

Accepted cost: the hosted refusal under signature rules, documented.

### Resolved: virtual repositories (was Q12)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: per-route member resolution with
the API passed through from one member and no merge (Design, "Virtual repositories"; AC20).

**Recommendation:** A. No API document can be merged, and brew's digest checks make first-member bottle
resolution safe.

| Option | You get | It costs |
|---|---|---|
| **A. Per-route resolution, no merge** | One URL for all three settings | A flat collision fails the core install loudly |
| **B. No virtual repositories** | Nothing to specify | Users configure three URLs |

**Why this is yours:** it accepts loud collisions instead of a namespace list.

Accepted cost: the collision note.

### Resolved: advisory coverage (was Q13)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: follow `supply-chain-policy.md`'s
single OSV feed with coverage read from the feed's ecosystem list, so advisory rules are refused today
and become available when OSV exports Homebrew (Design, "Signing, provenance and policy"; AC22).
Reconciled 2026-09-28: `supply-chain-policy.md` revised its single-feed decision into one OSV schema
from several sources (its resolved advisory-sources decision, was Q9), which is this record's option B
made the policy spec's own: an operator who declares Homebrew's database as a `policy.feed.sources`
entry has Homebrew coverage with no change to this handler, and coverage is still read from the
configured sources' ecosystem lists, so this record's data-driven rule holds unchanged.

**Recommendation:** A. Homebrew already publishes 13,023 OSV-format records that osv.dev recognises by
name but does not serve (captured), so coverage is a matter of time, and a second feed is that spec's
decision.

| Option | You get | It costs |
|---|---|---|
| **A. OSV only, data-driven coverage** | One feed; Homebrew coverage arrives automatically | No advisory rules for Homebrew today |
| **B. Ingest `Homebrew/advisory-database` here** | Advisory rules today | A second feed the policy spec rejected |

**Why this is yours:** it leaves Homebrew users without advisory enforcement until OSV exports it.

Accepted cost: the sibling consequence for `supply-chain-policy.md`, met by its was-Q9 decision and its
coverage table's Homebrew row; the Homebrew version ordering that row needs is reported.

### Resolved: publish input, deletion and preconfigured upstreams (was Q14)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: publish takes one version's
archives with their `brew bottle --json` record and returns what the formula must carry; deletion
removes files, retires them and answers `404`, with no yank; no Homebrew upstream is preconfigured
(Design, "The hosted publish path", "Deletion" and "The proxied path"; AC6, AC7, AC18).

**Recommendation:** A. The record is what Homebrew's pipeline already produces, brew has no yank
semantics, and `proxy-cache.md` AC19 names the preconfigured set (its extensions, was Q14 and was Q17,
admitted no Tier 3 upstream).

| Option | You get | It costs |
|---|---|---|
| **A. Record-based publish, removal, no preconfiguration** | Homebrew's pipeline output uploads unchanged; real removal | A configuration step for the remotes |
| **B. Archive-only publish** | One part per request | Cellar and tab lost; the formula's block cannot be derived |
| **C. Preconfigure both upstreams** | Zero configuration | A change to `proxy-cache.md`'s criterion and nightly job |

**Why this is yours:** it sets the release workflow and the first-run behaviour.

Accepted cost: the configuration step. Reconciled 2026-09-28: publish and deletion are
`management-api.md`'s `publish` and `delete-file` kinds, the record travelling as the operation's
`args` and the per-file response as its result document; the identical-bytes `200` became the API's
`Idempotency-Key` replay, and the retirement set its core-held `Retirement` record.

### Resolved: a rebuilt bottle tag on a remote, and what keeps a remote's content alive (was Q15, raised and adopted 2026-09-28)

**Adopted 2026-09-28 under the owner's standing delegation**, in the data-loss fix following
`storage-and-gc.md`'s closing sweep, on Opus. Option A: a bottle remote caches a bottle as a `File`
addressed by image and blob digest; after a rebuilt tag is adopted the flat route follows the
current index, and the old blob keeps its own cached reference until LRU eviction ends it; neither
remote retains a superseded document (Design, "Mapping onto the shared model", "The proxied path";
AC13, AC25).

The question: the removal table said a rebuilt tag's old blob was "kept referenced by the record",
the flat-filename resolution. That record is metadata naming a digest, and a digest a record merely
mentions keeps nothing alive (`storage-and-gc.md` AC16), so nothing the sweep follows held the old
blob; the row also named the kept-bytes variant of `proxy-cache.md`'s revision-bound class while
describing a re-resolution, which is the other variant. Before choosing a keep-alive it has to be
asked who reads the old blob, the check `proxy-cache.md`'s resolved old-blob decision (was its Q20)
made for five formats whose routes carry no digest. Here one route does: the OCI-shaped route
requests `blobs/sha256:{digest}` with the digest built from the checksum the client's API document
names (source: the bottle's blob URL is built from the formula's checksum, the digest brew then
verifies the bottle against), so a client still holding
the pre-rebuild API document, on the recipe configuration, requests the old bytes by their digest.
The flat route carries no digest and follows the current index. The API documents, by contrast,
were said to be "referenced from its cache records and marked through them"; they are current
documents, and no route requests a superseded one.

**Recommendation:** A, because the old bytes have a reader, the ordinary cached reference already
holds a digest-addressed blob for as long as the cache holds it, and it matches the upstream, where
ghcr.io serves a blob by its digest for as long as it holds it and a flat filename names one set of
bytes at a time.

| Option | You get | It costs |
|---|---|---|
| **A. Digest-addressed `File`s; the flat route follows the current index; the old blob held by its own cached reference until eviction** | Both routes behave as the upstream does; no declared list, no retention count and no new mechanism, since a rebuild changes no coordinate the OCI-shaped route has; storage bounded by the quota like any cached bottle | A `HOMEBREW_BOTTLE_DOMAIN` client holding the pre-rebuild API document is served the new bytes and refuses them until its next API refresh (450 seconds for `install`), as against any flat mirror; after eviction the old digest is re-fetched, or answers the upstream's `404` once ghcr.io no longer holds it; `proxy-cache.md`'s table lists this format under kept bytes and has to move it |
| **B. Kept bytes: the flat filename stays bound to its first-resolved blob** | A client holding the pre-rebuild API document keeps installing on the flat route | Every client that refreshes its API document (every 450 seconds on `install`) gets the new digest and refuses the kept bytes on the flat route, indefinitely, until an operator acts; the OCI-shaped route serves the new digest anyway, so the two layouts disagree |
| **C. Release the old blob at the new blob's commit, as `proxy-cache.md` was-Q20 does** | The old bytes leave the store at the next sweep | A client holding the pre-rebuild API document on the recipe configuration gets a re-fetch, or the upstream's `404`, for bytes the cache held a moment before; the release needs a coordinate the OCI-shaped route does not have, so it would be a reference-ending path keyed on the resolution record; nothing gained that eviction does not already give |

**Why this is yours:** it decides what a client sees across an upstream rebuild on each layout, and
that a remote keeps bytes the upstream re-tagged away from for as long as its quota allows.

Accepted cost: the flat-route refusal until the next API refresh, the re-fetch or `404` after
eviction, and the move of this format's row in `proxy-cache.md`'s event-class table, reported to
that spec rather than applied here. B lost to the indefinite refusal of every refreshed client; C
to breaking a live reader for storage LRU already reclaims. The API remote and the bottle remote's
manifests declare a retained-revision count of zero under `proxy-cache.md`'s resolved
retained-revision decision (was its Q19), since no route requests a superseded document, so neither
remote has a declared blob-digest list; `proxy-cache.md` says "one by default" and is reported the
zero, as `cpan.md`'s remote already retains none.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | 81e5062 | authoring pass: grounded first draft, not a review | Grounded five ways: captured traffic from brew 7.0.6 (ghcr.io image) and 4.6.20 (last docker.io image), both pinned by digest, on dedicated Podman networks against a logging stub serving the flat bottle layout, the OCI-shaped `HOMEBREW_ARTIFACT_DOMAIN` layout, two genuine signed generations of the internal API document and tampered, re-signed, wrong-kid and unsigned variants (all refused, no fallback), swapped bottle bytes (refused on both), missing manifests (7.0.6's relocation warning), `403` refusals (status-only rendering; fallback to ghcr.io and formulae.brew.sh captured with egress; closed only by `HOMEBREW_ARTIFACT_DOMAIN_NO_FALLBACK` on 7.0.6, absent on 4.6.20), Bearer, Basic and netrc credentials (the `Bearer QQ==` placeholder on 7.0.6's manifest; no header to a tap `root_url`), a hosted tap bottle, and rollback under three conditional-request policies (curl discarding an older `200`; an older generation adopted once its `Last-Modified` moved forward; 4.6.20 sending no condition); byte-for-byte pass-throughs to the live formulae.brew.sh and ghcr.io; both clients' sources; ghcr.io's `401`, anonymous token and any-bearer `307`; the live API documents, their JWS header and naming statistics; OSV (no export, name recognised), the Homebrew advisory database (13,023 records) and purl. Fourteen questions adopted: flat bottles only on hosted (AC6, AC26), taps left on Git, API and bottle remotes (AC1, AC11, AC20), flat resolution through the index (AC2, AC9, AC12), cache-scoped `Last-Modified` (AC4, AC20), no API regression (AC5), no placeholder special case (AC2, AC14), the OCI-shaped recipe (AC1, AC2, AC17), addressed objects (AC7, AC15), `403` rendering (AC16), the API-chain verdict (AC21), unmerged virtual repositories (AC20), data-driven OSV coverage (AC22), record-based publish and deletion (AC6, AC7, AC18). Twenty-seven criteria, each with a Test Plan row. Stays draft; awaits an independent review. |
| 2026-09-28 | 7c4d5bb | cross-spec reconciliation of the Wave 1 folds on Opus. Not a review | Not a review, and this spec's first reconciliation: every item in `agents/spec-loop/consequences.md` naming it verified against the current text of its source spec and of this file (Open item 30's requests, now met or routed; themes 1, 2, 4, 5 and 7; management-api 11 and 12; upstream-adapters 12; signing-service 11; conformance-harness reconciliation 2; proxy-cache reconciliation 10; supply-chain reconciliation 10; format batch 1 item 3). Applied: publish and deletion as `management-api.md`'s `publish` and `delete-file` kinds through `Operator` with no bindings, upload sessions, the record as `args` and the per-file `root_url` in the result document, `validation`, `conflict`, `retired` through core-held `Retirement`, the identical-bytes `200` replaced by `Idempotency-Key`, `unauthorized` for out-of-pattern files, `405` `repository-type`, a `script` case per kind (AC6, AC7, AC15, AC18, AC19; the Q14 record); the API remote in `proxy-cache.md`'s completion-only mode with the JWS entry of `artifact-verification.md` (AC16, `raw-keys`, reached through `Verifier`) as the hook's integrity call (AC3), regressions not adopted by `generated_at` and, for legacy documents, by upstream `Last-Modified` per `proxy-cache.md` AC22 (AC5; the Q6 record, which no longer leaves them unguarded); the bottle remote on the `distribution` adapter (`upstream-adapters.md` AC16, AC6, AC8, AC23; `Docker-Content-Digest` as the declared digest, as `oci.md` reads it; AC10 row); the `oci.md` coverage table updated for its was-Q8 name split; the removal table mapped onto `proxy-cache.md`'s event classes; the served `Last-Modified` as `adopted_at` (`data-model.md` AC44) set by the shared helper (AC4, the Q5 record); the virtual's served time derived from its member's and its own pointer's records (AC20); the verdict as `repository-chain` with the publisher-rule outcome (AC21); advisories through a declared second source per `supply-chain-policy.md` was-Q9 (AC22, the Q13 record); `WriteRefusal` and the `client-setting` binding row; the `auth.md` universal forms cited; `Deps` restated against the pinned set and the import boundary (`format-handler-interface.md` AC15); harness stand-ins as `hosts` sub-entries, the signed API snapshot and the `trust` key cited; new AC28 (`Capabilities()`, rename, stale `root_url`). Mismatches found, resolved without a new question: `proxy-cache.md` AC22's exact-match `304` clause and its no-stale-`200` clause jointly leave brew's later-and-unequal `If-Modified-Since` undefined, so this spec keeps its adopted not-earlier rule (was Q5), the only answer satisfying the second clause, and reports the case to `proxy-cache.md` and `signing-service.md` AC11. Gaps reported, not queued: no virtual-scoped freshness record or member-list pointer transition in `data-model.md`; no on-request compression with a per-encoding `ETag` in the shared serving helper; no Homebrew version ordering behind `supply-chain-policy.md`'s coverage row; `auth.md` still has no `brew` client row. No new question; `fable_recheck` unchanged. Stays draft. |
| 2026-09-28 | 36a137d | data-loss fix, second wave, on Opus (storage-and-gc closing-sweep item 0 and data-loss fix item 1): cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Applied item 1 of "From the data-loss fix" in `agents/spec-loop/consequences.md`, verified against `proxy-cache.md`'s resolved retained-revision and old-blob decisions (was its Q19 and Q20, AC27, AC28) and `storage-and-gc.md` AC16: a digest a document merely mentions keeps nothing alive. The holes: the removal table kept a rebuilt tag's old blob "referenced by the record", the flat-filename resolution, which is metadata naming a digest and held nothing the sweep follows; the API documents were "referenced from its cache records and marked through them", a mention-shaped description of what is in fact a current document's body; and AC25 asserted survival "while current or retained" with no retained revision defined anywhere. Reachability checked first, and it differs from the first wave's five formats: the flat route carries no digest and follows the current index, but the OCI-shaped route, the recipe configuration, requests `blobs/sha256:{digest}` built from the checksum the client's API document names, so a client holding the pre-rebuild document requests the old bytes. Neither Q19 nor Q20 fits as written: Q20 would release bytes a live route reads, and there is no revision the bottle remote could count, since the revision the client holds is the API remote's. Q15 raised in decision shape and adopted under the standing delegation, `fable_recheck` extended: a bottle remote caches a bottle as a `File` addressed by image and blob digest, the coordinate the OCI-shaped route names, held by its own cached reference until LRU eviction, which no adoption and no re-resolution ends; the flat route follows the current index (B, kept bytes on the flat route, lost to indefinite refusal of every client that refreshes its API; C, Q20's release at the new commit, to breaking a live reader for storage eviction already reclaims). API documents and manifests: current-document bodies under the fourth root, a declared retained-revision count of zero because no route requests a superseded one, so neither remote has a declared list. Folded into the `File` mapping, a new keep-alive list under "Mapping onto the shared model", the removal row, AC13 and AC25 (a sweep with the grace lapsed while the new index is current, the old blob served by digest to both versions holding the pre-rebuild API document, collected only after eviction; superseded bodies and mention-only digests collected), their Test Plan rows (`internal/format/homebrew/proxied_gc_test.go` and `conformance/homebrew/rebuilt_tag_test.go` added, the shared `internal/storage/gc_property_test.go` named) and Phase 3. Also applied "From the proxy-cache.md closing sweep" item 5, verified against `proxy-cache.md` AC22 and `signing-service.md` was-Q12: AC4, the Freshness paragraph and the Q5 record now cite the `not-earlier` rule this format declares instead of calling the case undefined. Consequences for `proxy-cache.md` reported. `node scripts/check-spec.js`: zero failures on this file. Stays draft. |
