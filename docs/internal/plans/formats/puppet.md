---
status: draft
status_description: "Authored 2026-09-26 as a grounded first draft: the Forge API v3 contract captured from Puppet 7.20.0 and OpenVox 8.28.1 (puppet module install, upgrade) and r10k 5.0.3 (Puppetfile installs), each in its upstream image pinned by digest, plus the publish paths of puppet-blacksmith 9.1.0 and PDK 3.4.0 (its exact puppet_forge upload calls), on dedicated Podman networks against a logging Forge API stub with HTTP and TLS; checked against the installed client sources, the Forge's own OpenAPI document (v29), the live forgeapi.puppet.com (both agents and r10k run against it), OSV and the purl type list. Fourteen questions written in decision shape and adopted under the owner's standing delegation; none open. Awaits a /spec review pass."
description: "Spec for Puppet modules served to puppet module install and upgrade (Puppet 7 and OpenVox 8) and r10k: the Forge API v3 read surface under a format-first mount with every URI rendered relative to the configured base, whole-module release lists, SHA-256 and MD5 on every release, publish through the Forge's POST /v3/releases (path-respecting for puppet-blacksmith, root-anchored on a bound hostname for PDK), deprecation, withdrawal and hard deletion as bindings onto registry-owned management operations, a verifying Forge cache that handles premium and login-required modules explicitly, and per-module virtual repositories."
author: michielvha
goal: "Serve Puppet users a private Forge and a verified cache of forgeapi.puppet.com that stock puppet module install (Puppet 7 and OpenVox 8) and r10k resolve, verify and install from with a token in forge_authorization or r10k.yaml, the registry in module_repository or forge.baseurl, and a network restricted to this registry."
priority: "low"
issue: 36
created: 2026-09-26
covers:
  - "internal/format/puppet/**"
  - "conformance/puppet/**"
fable_recheck: "authored on Opus 2026-09-27 while Fable was out of monthly credit; grounded in captured client traffic, but the design judgement was never Fable-reviewed"
---

# Plan: Puppet modules (Puppet Forge API v3)

The Puppet Forge API v3 read surface (module documents, paginated release lists, release documents
and release tarballs) and its publish endpoint, hosted, proxied and virtual, on one handler. The
oracles are `puppet module install` and `puppet module upgrade` from Puppet 7.20.0 and OpenVox
8.28.1, and r10k 5.0.3 installing from a Puppetfile, whose use of the API differs from the module
tool's in which endpoints it reads, how it picks a version and what it will install.

## Context

Puppet modules sit in Tier 3 of `formats/catalogue.md` as the single-ecosystem family "Puppet Forge"
(the row "Puppet modules"). **Its build is gated by `project-charter.md` AC9 and `catalogue.md`
AC5**: no handler code for a Tier 3 ecosystem exists before every Tier 1 format has met its definition
of done and the owner has recorded a `continue` verdict at the charter's build step 8, and Tier 3
handlers are built at step 11. This spec exists now because the owner directed on 2026-09-26 that
all 33 ecosystems be specced up front (the catalogue's "Every ecosystem below is specced now; only
building is gated"), so the gate decides what is built and never what is written; a `shrink` verdict
parks it.

**The ecosystem changed hands in a way that bears on this spec.** Perforce announced in November
2024 that new Puppet binaries and packages would ship to a private repository under a EULA, with a
commercial licence beyond 25 nodes (DevClass and The New Stack, found through a search this run), and the
Puppet blog's developer FAQ lists Puppet Core and PDK 3.5 and later under the Developer EULA. The
community forked the agent as **OpenVox** (Vox Pupuli), whose `openvoxagent` image is one of this
spec's oracles; Docker Hub's official `puppet/puppet-agent` tags stop at `7.20.0` and the last
public `puppet` gem is 8.10.0 (2024-10-22, rubygems.org, captured). The Forge itself stayed public
for reads, with two classes of gated module described in Design ("Gated upstream modules").

Grounding for this draft, stated up front because the constitution asks for evidence or silence:

- **Captured client traffic.** `which puppet r10k` finds neither on this host, so every client ran
  from its upstream image pinned by digest: `docker.io/puppet/puppet-agent@sha256:9223a40ef490ae331b41ff36edaaba3470caf02e984b4bf107c4184b99a32f0a`
  (Puppet 7.20.0, Ruby 2.7.6, `semantic_puppet` 1.0.4, Ubuntu 18.04),
  `ghcr.io/openvoxproject/openvoxagent@sha256:29407ad539b2ab0b465ff45b68fb8cc8e559a82cdbc728d524dc4fc0e1feae9e`
  (OpenVox 8.28.1, Ruby 3.2.11, `semantic_puppet` 1.1.1, Ubuntu 26.04) and
  `ghcr.io/voxpupuli/r10k@sha256:4153ac35d377c147cf81e029ff1accf4aa9025c84a8c3b93318476df843036ff`
  (r10k 5.0.3 with the `puppet_forge` gem 6.2.0, Faraday 2.14.3 and `faraday-follow_redirects`
  0.5.0, Ruby 3.4.9, Alpine), all `linux/amd64`. The two publishers were driven from their own code:
  puppet-blacksmith 9.1.0's `Blacksmith::Forge#push!` loaded from the released gem, and PDK 3.4.0's
  `run_publish` calls (`PuppetForge.host=`, `PuppetForge::Connection.authorization=`,
  `PuppetForge::V3::Release.upload`, read from the released gem) executed against the `puppet_forge`
  6.2.0 in the r10k image; PDK 3.4.0 is the last release outside the Developer EULA. The stub was a
  logging Forge API v3 server in a pinned `python:3.13-slim` container
  (`sha256:37134a49d21d2120e4c4d73bb76f8a4ab9aef31f096f7ec2ead48c2feead4332`) on a dedicated
  `--internal` Podman network, so the clients had no other egress, answering for `forge.test`,
  `files.test` and a second instance for `other.test`, over HTTP and over TLS under a throwaway CA
  appended to each image's trust bundle. It implemented `/v3/modules/{slug}`, `/v3/releases` (module
  filter, `sort_by`, `exclude_fields`, `limit`, `offset`, `show_deleted`, pagination links),
  `/v3/releases/{slug}`, `/v3/files/{file}`, `POST /v3/releases` (JSON and multipart),
  `PATCH /v3/modules/{slug}` and both `DELETE`s, with a mount prefix, three `file_uri` styles, case
  folding, and per-path rules injecting statuses, bodies, Bearer and Basic requirements, redirects,
  tampered bytes and wrong or missing checksums. Fixtures were real module tarballs (a top directory
  `{owner}-{name}-{version}` holding `metadata.json`, `manifests/init.pp` and a README):
  `acme-base` 1.0.0, 1.1.0, 2.0.0 and 2.1.0-rc1, `acme-app` 1.0.0 depending on
  `acme/base >= 1.0.0 < 2.0.0`, a mixed-case owner `AcmeCo-tool`, and hostile archives with a
  symlink, a `..` path and a mismatched top directory. A second network with egress ran all three
  clients against the live Forge. The stub is not a reference implementation; the captures prove
  what the clients send and how they react.
- **The clients' source**, read at their installed paths: `puppet/forge.rb`,
  `puppet/forge/repository.rb`, `puppet/forge/errors.rb`, `puppet/module_tool/` (installer,
  upgrader, unpacker, `tar/mini.rb`) and `puppet/defaults.rb` from both agent images;
  `r10k/module/forge.rb`, `r10k/forge/module_release.rb`, `r10k/module_loader/puppetfile.rb` and
  `r10k/settings.rb`; `puppet_forge`'s `connection.rb`, `v3/base.rb` and `v3/release.rb`;
  puppet-blacksmith's `forge.rb`; PDK's `module/release.rb` and `cli/release/publish.rb`.
- **The published contract.** The Forge publishes an OpenAPI 3.0 document,
  `https://forgeapi.puppet.com/v3/openapi.json` (read this run, version 29), and states the API is
  "regression-stable" and that "clients must ignore any properties they do not recognize". It is
  the one format-level document, and it is silent or wrong on several points the captures settle
  (below).
- **The live upstream.** `forgeapi.puppet.com` sampled directly: module, release, release-list and
  file responses and their headers; a soft-deleted release (`puppetlabs-stdlib-10.0.0`, deleted
  2026-06-04 "accidental major version release") absent from the release list (93 of 94) and still
  answering `200` on its release document and its file; every one of the 221 `puppetlabs` modules'
  current files requested anonymously (209 answered `200`, 12 answered `401`); the `premium` and
  `login_required` flags; `exclude_fields` honoured; `If-Modified-Since` answered `304`;
  `If-None-Match` not honoured; `limit` clamped to 100; owner names folded case-insensitively and
  module names not; the unknown-module release list answered `200` with no results; the JSON error
  shape; and the `malware_scan` field. Puppet 7.20.0, OpenVox 8.28.1 and r10k 5.0.3 were each run
  against it.
- **OSV and purl.** `ecosystems.txt` (46 entries) lists no Puppet ecosystem; queries naming
  `Puppet` and `Puppet Forge` answer `invalid ecosystem`; `Puppet/all.zip` answers `404`; the OSV
  schema names no Puppet ecosystem; and the purl specification's `types/` directory has no
  `puppet` type (all captured 2026-09-26).

Where the published contract and the captures disagree or the contract is silent, the captures and
the source win, and the differences are recorded because they would otherwise be built from the
document. The OpenAPI document's `sort_by` enumeration is `downloads`, `release_date` and `module`;
**the module tool sends `sort_by=version`** on every request (captured) and the live Forge honours it
(descending, captured). The document describes `file_uri` as a "Relative or absolute URL to
download this release's tarball"; **both agent lines append it to their configured base and refuse
an absolute one** ("Path must start with forward slash", captured), so it must be relative, and under
a path prefix the prefix must be absent from it. The document says a deleted release "will still be
available for direct download"; it does not say that **r10k installs a deleted release** (captured,
live and stubbed) while the module tool cannot. And nothing documents that **the module tool never
shows a deprecation warning against the live Forge**, because it asks for the one field the warning
reads to be excluded (captured).

Seven things make this format worth a careful spec. **Every URI the API returns is relative to the
client's base URL**, so the mount prefix must never appear in one. **PDK publishes to the host root
whatever path it is given**, which a format-first mount cannot receive. **The two client families
choose versions differently**: the module tool resolves dependencies over whole release lists and
keeps what is installed, while r10k installs exactly what a Puppetfile pins or what the server calls
`current_release`, and so follows a rollback downwards. **Deletion on the Forge is soft**: hidden
from lists and still served by exact name, which r10k relies on. **Both clients verify every file
against the server's SHA-256** and neither checks anything the server did not also say. **Gated
modules** exist upstream that no anonymous cache can serve. And **no client falls back**: one Forge
per client, a refusal fails the run.

## Blocking preconditions

**The handler interface re-open must complete before this handler starts**, as for every handler
(`format-handler-interface.md` AC8). Puppet is Tier 3, so the catalogue's Tier 1 gate (its AC5) and
the charter's breadth verdict (its AC9, build step 8) both precede it, and it is built at step 11;
the re-open is recorded here anyway, from this side, because a gate enforced on one side only is
enforced nowhere. This format needs the format-first mount `/puppet/{repository}/` and, per the
resolved PDK-publish decision below, one **root-anchored claim on `/v3/`** served only on hostnames
bound to a Puppet repository: a carve-out `format-handler-interface.md`'s registration layer must
list, in the same class as Terraform's root discovery document (`terraform.md`'s resolved
host-binding decision, which this spec follows rather than re-deciding). It needs **no externally
visible base URL**, because every URI it renders is base-relative (Design, "Base-relative URIs").

**The management API must be `planned` before Phase 2.** Deprecation, withdrawal, restoration and
deletion are operations of `docs/internal/plans/foundation/management-api.md` (to be authored in the
spec loop), whose core the charter builds at step 2 and completes at step 9. Publish is a client
binding this handler serves (Design, "Publish"); the Forge's own deprecate and delete routes are
bindings onto the management operations (the resolved Forge-management-routes decision below).
Phase 1's hosted reads are testable without it, because the harness's `state` vocabulary seeds
modules through the shared write path.

**The proxied path depends on shared services that are requested, not assumed**: the upstream
adapter behaviour stated in Design ("The proxied path") of
`docs/internal/plans/foundation/upstream-adapters.md` (to be authored in the spec loop, built at
charter step 4), and the release-integrity entry requested of
`docs/internal/plans/foundation/artifact-verification.md` (to be authored in the spec loop, built at
step 4b). This format serves no signed or generated index, so it needs nothing of
`docs/internal/plans/foundation/signing-service.md` (to be authored in the spec loop, step 7), and
publish is synchronous, so nothing of `docs/internal/plans/foundation/async-operations.md` (to be
authored in the spec loop, step 6a).

## Scope

**In scope:**

- **The read surface** under `/puppet/{repository}/`: `GET /v3/modules/{slug}`,
  `GET /v3/releases?module={slug}` with the parameters the clients send, `GET /v3/releases/{slug}`
  and `GET /v3/files/{owner}-{name}-{version}.tar.gz`, in the Forge's JSON shapes, with every URI
  rendered relative to the client's base.
- **Two client families as oracles on both paths**: `puppet module install` and
  `puppet module upgrade` on Puppet 7.20.0 and OpenVox 8.28.1, and r10k 5.0.3's
  `puppetfile install` for pinned and `:latest` entries.
- **Hosted publish** through the Forge's `POST /v3/releases`, as puppet-blacksmith sends it
  (multipart, path-respecting) under the format-first mount, and as PDK sends it (JSON with a base64
  body, always to the host root) on a hostname bound to one Puppet repository.
- **Ingest validation** of module tarballs: archive shape, top directory, `metadata.json` identity,
  the name and version grammars, dependency syntax, and path safety.
- **Deprecation, withdrawal (the Forge's soft delete), restoration and hard deletion** as
  registry-owned management operations, with the Forge's `PATCH /v3/modules/{slug}`,
  `DELETE /v3/releases/{slug}` and `DELETE /v3/modules/{slug}` served as bindings onto them, each
  with its write boundary and the retirement set.
- **Non-interactive authentication** in the forms the clients send: the module tool's
  `forge_authorization` header value and URL userinfo, r10k's `authorization_token` (Bearer, or
  scheme-less) and userinfo, and the publishers' Bearer.
- The per-route addressed objects `auth.md`'s pattern scopes evaluate, including the pattern-refusal
  case its AC8 requires, and the rendering of a shared policy refusal.
- **The proxied path** against any Forge API v3 base (forgeapi.puppet.com, another registry's Forge
  endpoint with a path): module revisions as mutable metadata with a TTL, files as immutable
  artifacts verified against the upstream's SHA-256 (or MD5, recorded as weak), gated modules
  handled explicitly, negative caching, and this format's rows of the removal table.
- **Virtual repositories**, resolved per module in member order.

**Out of scope for v1**, each with its reason, recorded because the interface spec's definition of
done requires the deliberately unimplemented surface to be named:

- **Search and browse routes**: `GET /v3/modules` (with `query`, `owner` or any filter),
  `GET /v3/releases` without a `module` parameter, `/v3/users`, `/v3/search_filters` and
  `/v3/releases/{slug}/plans`. No client in the matrix requests any of them (`puppet module search`
  is gone from both agent lines, "'module' has no 'search' action", captured; r10k reads modules by
  slug), so there is no oracle for them, and the Forge's ranking and filter semantics (downloads,
  endorsements, quality scores, operating-system compatibility) are unpublished. They answer `404`
  in the Forge's error shape. The registry's UI is where modules are browsed.
- **Download counts, feedback scores, endorsements, `pdk` and `validation_score`** carry no meaning
  on this registry, and no client reads them (source): hosted documents serve `downloads: 0` and
  `null` for the others; proxied documents carry the upstream's values as the upstream wrote them.
- **Rendering README, CHANGELOG, LICENSE and REFERENCE to HTML** (`with_html`). The text is served
  as extracted; rendering is a presentation concern the UI owns, and no client asks for it.
- **Puppet Enterprise's `module_groups`** (`pe_only`) and the PE-licence authorization path both
  clients carry (`PELicense` in the module tool, the `pe_license` feature in r10k). Both exist to
  reach Puppet's commercial catalogue through a commercial licence file, which this registry
  neither holds nor issues; the parameter is accepted and ignored.
- **Bolt, Code Manager and `puppet-forge-server`-style tooling** are not in the matrix. Bolt and Code
  Manager embed r10k's installer, but nothing here was captured from them, so nothing is claimed.
- **Signatures.** The ecosystem has none to verify (Design, "Signing, provenance and policy").

## Design

### The wire surface, as captured

Every route hangs off `/puppet/{repository}/`, format-first per `format-handler-interface.md`'s
resolved URL-shape decision. A user sets `module_repository` (the module tool,
`--module_repository` or `puppet config set`) or `forge.baseurl` in `r10k.yaml` to
`https://{host}/puppet/{repository}`; both clients keep the path (captured). The one root-anchored
exception is the bound hostname for PDK (below).

| Surface | Shape, as the pinned clients send it |
|---|---|
| Module tool: version discovery | `GET {base}/v3/releases?module={owner}-{name}&sort_by=version&exclude_fields=readme,changelog,license,uri,module,tags,supported,file_size,downloads,created_at,updated_at,deleted_at` (commas percent-encoded), one request per module named on the command line and one per dependency discovered, `User-Agent: PMT/1.1.1 (v3; Net::HTTP) Puppet/{version} Ruby/{version}`, no `Accept` beyond `*/*`, no conditional header, no `limit` (captured on both lines). `module={owner}/{name}` from the command line is sent as `{owner}-{name}` (captured); the owner's case is sent as typed |
| Module tool: pagination | While `pagination.next` is non-null, the client URI-decodes it, treats `+` as a space, requires it to begin with `/`, and appends it to its base (source; captured: a `next` carrying the mount prefix was requested as `/puppet/repo/puppet/repo/v3/releases...` and answered `404`) |
| Module tool: selection | Client-side, over every listed release: the highest SemVer satisfying the constraint and every dependency's range; prereleases only when requested exactly (`--version 2.1.0-rc1` installed it; the default and `>=2.0.0-a` both chose 2.0.0, captured). A release whose `metadata.json` has a dependency the client cannot parse is skipped with "Cannot consider release" (captured against the live Forge). A listed release whose `metadata.name` differs from the requested name is not a candidate ("No releases are available", captured with a case-folding server) |
| Module tool: download | `GET {base}{file_uri}`, then the whole file is hashed and compared with `file_sha256`, else `file_md5`, else the install fails ("Forge module is missing SHA256 and MD5 checksums"); a mismatch fails ("Downloaded release for acme-base did not match expected checksum ...") (source and captured). Redirects are followed across hosts, dropping `Authorization` (captured) |
| Module tool: installed modules | `install` of a module already present reads the release list and answers "Module acme-base 2.0.0 is already installed"; `upgrade` never moves to a lower version ("The installed version is already the latest version"); `--force` installs the newest available (captured) |
| r10k: per module | `GET {base}/v3/modules/{owner}-{name}` (for `deprecated_at`, and `current_release.version` when the Puppetfile says `:latest`), then `GET {base}/v3/releases/{owner}-{name}-{version}` (for `file_uri`, `file_sha256`, `file_md5`), then `GET {base}/v3/files/...`, `User-Agent: PuppetForge.gem/6.2.0 Faraday/2.14.3 Ruby/...` (captured). No dependency resolution, no release list, no pagination (source) |
| r10k: download and cache | The file URL is `URI.join(base, file_uri without its leading slash)`, so a relative `file_uri` resolves under the base path and an absolute one is used as is (source; captured with both). Verification is SHA-256 when the release carries it, else MD5 (captured); the tarball and its checksum are cached in `~/.r10k/cache/{slug}/tarball/`: a module already at its pinned version triggers no request, and a reinstall after the module directory is removed requests only the module document and uses the cached tarball and checksum (captured) |
| r10k: forge selection | `forge.baseurl` from `r10k.yaml`, default `https://forgeapi.puppet.com`; the Puppetfile's `forge` line is ignored unless `allow_puppetfile_override` is set and passed to the action ("Ignoring Forge declaration in Puppetfile", captured; with no `r10k.yaml` a Puppetfile naming `other.test` went to forgeapi.puppet.com) |
| Publish, puppet-blacksmith | `POST {url}/v3/releases`, `multipart/form-data` with one part `name="file"; filename="{owner}-{name}-{version}.tar.gz"` whose part headers precede the bytes, `Authorization: Bearer {api_key or token}`; any non-2xx fails with the status and body printed (captured `201`, `409`, `401`) |
| Publish, PDK path | `PuppetForge.host = {forge-upload-url}` then `POST /v3/releases` resolved against the **host root**, dropping any path (captured: both `http://forge.test/puppet/repo/v3/releases` and `http://forge.test/puppet/repo` posted to `http://forge.test/v3/releases`), `Content-Type: application/json`, body `{"file": "{base64}"}`, `Authorization` the token verbatim unless it is 64 lowercase hex, which gets `Bearer ` prepended (captured) |

**Error rendering**, captured, because a refusal nobody can read is a refusal nobody can act on. The
module tool prints "Request to Puppet Forge failed", the URL, "The HTTP response we received was
'{status line}'" and "The message we received said '{message}'", the last taken from the JSON body's
`message` (source: `forge/errors.rb`; captured with a custom `message` on `401`, `403`, `404`, `429`
and `500`), and exits 1. r10k prints "the server responded with status {n} for GET {url}" for any
status on metadata routes, "The module {slug} does not exist on {base}" for a `404` there, and for a
`403` on a file download "403 Forbidden" followed by "The following errors were returned from the
server:" and each string of the body's `errors` array (captured), and exits 1. Neither client retries
any status (one request each, captured). Puppet 7.20.0 prints the full URL including userinfo in
these errors; OpenVox 8.28.1 omits it (captured).

**The error body is therefore the Forge's**: `{"message": "...", "errors": ["..."]}` with
`Content-Type: application/json`, the shape the OpenAPI document specifies and the live Forge sends
(`{"message": "404 Not Found", "errors": ["The requested resource cannot be found"]}`, captured),
because it is the one both clients render. Every refusal this handler issues puts its reason in both
`message` and `errors`.

### How the clients decide, and the three cross-format checks

**Does the client verify what it downloads? Yes, against the server's own word.** Both agent lines
and r10k hash every tarball and compare with `file_sha256`, falling back to `file_md5`, and fail on a
mismatch (captured with tampered bytes, a wrong SHA-256, a missing SHA-256 with a correct and a
wrong MD5); the module tool fails when both are missing and r10k fails because it compares against
an empty MD5 (captured). That is `conan.md`'s opposite: a Conan client verifies nothing. It is still
only a transit and storage check, because the checksum comes from the same server as the bytes, and
the module tool refuses MD5 only in FIPS mode (source). So the registry's obligations are to serve
both digests of exactly the stored bytes on every release document and list entry, and to make the
proxied path's verification real (Design, "The proxied path").

**Is a rollback visible? To r10k's `:latest`, yes; to the module tool, no.** After a repoint that
removed `acme-base` 2.0.0, r10k's next run read `current_release` 1.1.0 and replaced the installed
2.0.0 with 1.1.0, while `puppet module upgrade` answered "already the latest version" and `install`
"already installed" on both lines, and only `install --force` moved to 1.1.0 (captured). Pinned
Puppetfile entries never move. Nothing on the wire carries a time a client compares, so, unlike
`debian.md` and `conan.md`, there is no stale-newer-copy problem for the registry to solve: a
repoint serves the predecessor snapshot's documents exactly, r10k follows them, and the operator
documentation says the module tool does not.

**Does the client fall back when refused? No.** Each client has one Forge: `module_repository` for
the module tool and `forge.baseurl` for r10k, which also ignores the Puppetfile's `forge` line by
default (captured). A `403` on a file failed the install with no request to any other host (captured
on all three), the same as `terraform.md` and `conan.md` and the opposite of `julia.md`. The exposure
is configuration: an unset `module_repository` or a missing `r10k.yaml` sends every request to
forgeapi.puppet.com (defaults in `puppet/defaults.rb` and `puppet_forge.rb`; captured), which the
operator documentation states. One client path does leave the host: both clients follow a redirect
across hosts (captured), so **no hosted route answers a redirect**.

### Base-relative URIs

Every URI in a response is **relative to the client's base URL and begins with `/v3/`**:
`file_uri`, every `uri`, the `releases[].uri` and `releases[].file_uri` of a module document, and
every link in `pagination` (`first`, `previous`, `current`, `next`). This is not a style choice. The
module tool appends `file_uri` and `next` to its base and refuses an absolute URI; r10k resolves
`file_uri` against its base path; and a URI carrying the mount prefix is doubled by all three
(captured: `pfx-prefixed`, `pfx-absolute`, `pfx-next`). The live Forge's URIs have the same form,
since it lives at a host root.

Two consequences carry through the design. A stored or assembled document **never varies with the
base URL a client used**, so the handler needs no externally visible base URL and performs no
serve-time URL rewriting, unlike `npm.md` and `vagrant.md`; and a proxied upstream's URIs, which are
relative to the upstream's own base, are already correct for this registry's base once the file route
maps them to cached content (below).

### Mapping onto the shared model

The levels are exactly those `data-model.md` provides; no table is added.

- **A `Package` is `{owner}-{name}`**, byte for byte as published (the resolved name decision
  below): `owner` is the Forge's `[a-zA-Z0-9]+` and `name` is `[a-z][a-z0-9_]*`, the patterns the
  OpenAPI document gives for a module slug and the module tool enforces ("the module name contains
  non-alphanumeric (or underscore) characters", captured). Neither part can contain `-`, which is
  what makes the slug and the filename parse unambiguously.
- **A `Version` is the SemVer string**, the Forge's `X.Y.Z` with an optional prerelease. Its document
  holds `metadata.json` verbatim; the README, CHANGELOG, LICENSE and REFERENCE text extracted at
  ingest when present, each capped at the inline threshold with the remainder in a CAS blob; the task
  and plan names found under `tasks/` and `plans/`; the file size; the SHA-256 and MD5 of the
  tarball; the publish time; and, when withdrawn, `deleted_at` and `deleted_for`.
- **`File`**: one per version, `{owner}-{name}-{version}.tar.gz`, keyed by CAS digest.
- **The package-level document** holds the deprecation (`deprecated_at`, the reason, the replacement
  slug), whether the module is deleted in the Forge's soft sense, and the retirement set of
  hard-deleted versions.
- **The repository-level document** holds the case index of owners (the resolved name decision
  below). A hostname binding is instance configuration, as in `terraform.md`, not repository
  metadata.
- **A remote repository's document** holds, per module it has served, the current and retained
  upstream module revisions (below) and the verification record of each cached file; none of it is
  snapshot content.

**Documents are assembled on request, not generated on write.** The module document, the release
list and the release document are pure functions of one snapshot's package and version documents,
with nothing signed and no base URL to render, so no document of this format is a write-triggered
or signed index in the sense of `write-triggered-services-prototype.md`, the same conclusion
`conan.md` reached. `current_release` is the highest non-prerelease SemVer among the module's
non-withdrawn versions, or the highest prerelease when there is no other; r10k's `:latest` installs
exactly it (captured), so the rule is part of the contract. The live Forge's rule is unpublished and
the 446 modules sampled cannot distinguish "highest version" from "latest published", since in every
one the two coincide; this registry's rule is the SemVer one, which is also what the module tool
selects.

### Release lists, pagination and the parameters clients send

- **A request without `limit` receives the module's whole release list in one page** (the resolved
  pagination decision below). Neither the module tool nor r10k ever sends `limit` (captured), so a
  module tool's resolution reads one snapshot in one request, and a publish landing between two page
  requests cannot shift an offset under a resolving client. An explicit `limit` is honoured up to
  100, the Forge's maximum (captured clamp), with base-relative `next` links computed against the
  snapshot that answered; `offset` beyond the end answers an empty page.
- **`sort_by`**: `version` (descending SemVer, the module tool's value), `release_date` and
  `module` are honoured; any other value is ignored, as the live Forge ignores it (captured `200`).
- **`exclude_fields` and `include_fields`** are honoured over top-level keys, **except that `module`
  is always present on a release, carrying at least `slug`, `name`, `owner` and `deprecated_at`**
  (the resolved deprecation-warning decision below). The module tool excludes `module` and so never
  warns about a deprecated module against the live Forge; with `module` present it prints "acme-base
  has been deprecated by its author!" and installs (captured on both lines).
- **`show_deleted=true`** includes withdrawn releases with `deleted_at` set; without it they are
  omitted, as on the live Forge (captured 93 of 94).
- **An unknown module's list answers `200` with no results** (the live Forge's shape, captured),
  which both agent lines report as "No releases are available from {base}"; an unknown module,
  release or file answers `404` in the Forge's error shape. Both are also what a pattern refusal
  looks like (Design, "Addressed objects and pattern scopes").
- `module_groups`, `with_html`, `with_pdk` and the other filters are accepted and ignored.

Caching headers: JSON documents are served `Cache-Control: no-cache` with a byte-derived `ETag`
and `Last-Modified`, and a matching `If-None-Match` or `If-Modified-Since` answers `304`; no client
sends one (captured), so the headers serve intermediaries. Files are served
`Content-Type: application/octet-stream`, `Content-Disposition: attachment; filename={file}`,
`Cache-Control: public, max-age=31536000, immutable` and an `ETag`.

### Publish

Publish is the one operation a client triggers, so, following `debian.md`'s resolved dput decision
and `conan.md`'s bindings, **the Forge's `POST /v3/releases` is a client binding onto the publish
operation of `docs/internal/plans/foundation/management-api.md`** (to be authored in the spec loop):
one implementation behind two ways in, the binding verified by the real publishers and the
management endpoint by integration tests.

- **puppet-blacksmith** posts to `{url}/v3/releases` under whatever path `url` carries (captured),
  so it publishes to `/puppet/{repository}/v3/releases` like any client of the mount.
- **PDK** posts to `/v3/releases` at the host root whatever it is told (captured), so under the
  resolved PDK-publish decision below it publishes only on a **hostname bound to one Puppet
  repository** by instance configuration, where the root-anchored `/v3/` serves that repository's
  whole surface, reads included. On any other hostname the root `/v3/` answers `404` in the Forge's
  error shape and nothing is stored. A bound hostname can also be the `module_repository` itself,
  which is how a Puppet user gets the bare-host configuration the Forge's own documentation shows.
- **Both body forms are accepted**: `multipart/form-data` with the tarball in the part named `file`,
  and `application/json` with the tarball base64-encoded in `file`, the two forms the OpenAPI document
  names. The bytes are streamed into the CAS, their SHA-256 and MD5 computed in the stream, and
  committed only once ingest validation passes.
- **Responses**: `201` with the release document; `400` with the Forge's error shape for content
  that fails validation (the status the OpenAPI document and `puppet_forge`'s `ReleaseBadContent`
  mapping expect); `409` for an existing or retired coordinate with different bytes; `401` and `403`
  per `auth.md`; `405` against a remote or virtual repository.

What ingest enforces, each refusal naming the rule and committing nothing:

- **The archive**: a gzip-compressed tar with exactly one top-level directory named
  `{owner}-{name}-{version}`, holding `metadata.json`. Every entry is a regular file or a directory;
  a symlink, hard link, device or FIFO, an absolute path, and any path with a `..` segment are
  refused. The clients' own handling of these is inconsistent (a symlink is dropped with a warning by
  both lines and by r10k; a `..` path fails GNU tar on both lines and r10k's unpacker; a wrong top
  directory installs silently, all captured), so the registry refuses rather than serving something
  each client unpacks differently.
- **Identity**: `metadata.json`'s `name` (`{owner}-{name}` or `{owner}/{name}`) and `version` agree
  with the top directory and, for multipart, with the part's filename; `owner` and `name` match the
  grammar above; the version is SemVer 2.0.0 with an optional prerelease and **no build metadata**
  (the resolved version-grammar decision below).
- **Dependencies**: each entry has a `name` in the same grammar and, when present, a
  `version_requirement` the module tool's range grammar parses, because a release with an unparsable
  dependency is silently skipped by the module tool (captured "Cannot consider release ... Malformed
  dependency" on the live Forge's `puppetlabs-mrepo` 0.1.1 and 0.1.2).
- **Coordinates bind one set of bytes for the life of the repository.** A `(module, version)` that
  exists answers `409` unless the bytes are identical, which answers `201` with the existing release
  and creates no snapshot (the CI-retry case, as in `vagrant.md`); a hard-deleted coordinate answers
  `409` with any bytes, including after the deleting snapshot has been pruned; a withdrawn
  coordinate is not free either, since its release still serves by slug.
- **Owner case**: a publish whose owner differs only in case from an owner already present in the
  repository answers `409` (the resolved name decision below).

`data-model.md` requires each format spec to declare its ecosystem's write boundaries. Puppet's
declaration:

- **One publish is one completed logical write**: one release, one snapshot. The bytes streamed
  before validation are an upload in flight, not a write.
- **A deprecation, an undeprecation, a withdrawal and a restoration are each one metadata-only
  write**; a hard deletion of a release is one write that adds the coordinate to the retirement set;
  the Forge's module delete is one write however many releases it withdraws; a retention pass over a
  repository is one write.
- Two concurrent publishes of different versions of one module each read-modify-write the
  package-level document through the revision-token retry `data-model.md` makes mandatory (its
  AC20), and both land.
- A proxied repository creates no snapshots; module revisions and files arriving from an upstream
  are cache materialisation.

### Deprecation, withdrawal and deletion

Per the cross-format precedent (`pypi.md`'s resolved hosted-yank decision, with `npm.md`,
`cargo.md`, `julia.md`, `vagrant.md` and `conan.md`), each operation is a completed logical write
through the shared write path, authorized in the settled `(repository, action)` vocabulary with no
new action, hosted only, its trigger verified by this registry's integration tests and its effect by
the real clients (`docs/internal/analysis/management-surfaces-and-the-oracle.md`). **No client in the
matrix triggers any of them**: neither agent line, r10k, puppet-blacksmith nor PDK has a deprecate or
delete command (source). The Forge's own routes for them are documented in its OpenAPI document and
are therefore served as **bindings** onto the management operations (the resolved
Forge-management-routes decision below), so scripts written against the Forge keep working; they are
driven in conformance by the case `script` as any HTTP client would, never claimed as a client
trigger.

| Operation | Forge binding | Effect a client sees | Action |
|---|---|---|---|
| Publish a release | `POST /v3/releases` (puppet-blacksmith, PDK) | The release appears in the list, module and release documents | `push` |
| Deprecate a module, with an optional reason and replacement slug | `PATCH /v3/modules/{slug}` with `{"action": "deprecate", "params": {"reason", "replacement_slug"}}`, answered `204` | `deprecated_at`, `deprecated_for` and `superseded_by` on the module document and `module.deprecated_at` on every release: r10k warns "has been deprecated" and both agent lines print the author-deprecation warning, all installing as before (captured) | `push` |
| Undeprecate a module | none (the Forge says deprecation is one-way; the management API is not bound by that) | The marks disappear | `push` |
| Withdraw a release (the Forge's soft delete), with an optional reason | `DELETE /v3/releases/{slug}?reason=`, answered `204` | Omitted from release lists, `module.releases` keeps it with `deleted_at`, the release document and file keep answering `200`: the module tool can no longer select it ("No releases matching '1.1.0'", and a dependency range resolves to the next release) while r10k's pinned entry still installs it (captured on the stub and on the live Forge's `puppetlabs-stdlib-10.0.0`) | `delete` |
| Restore a withdrawn release | none | Normal resolution returns | `delete` |
| Delete a module (the Forge's soft delete) | `DELETE /v3/modules/{slug}?reason=`, answered `204` | Every release withdrawn and the module document answers `404`; release documents and files keep answering, as the OpenAPI document describes | `delete` |
| Hard-delete a release | none | The release, its document and its file answer `404`; the coordinate joins the retirement set; r10k's pinned entry fails | `delete` |

Rules, applying the precedent rather than re-deciding it: every operation is one snapshot, none for
a refused one, and no blob-store object is deleted directly, so space returns only through retention
pruning and `storage-and-gc.md`'s single-deleter boundary (its AC15) holds; the retirement set is
carried forward by every later write and preserved across a backwards repoint (`data-model.md`
AC33's obligation on the management surface); the `Package` row outlives its versions; an operation
against something absent answers `404`; and against a remote or virtual repository, `405`. What
this format requires of `management-api.md`: the seven operations above on the objects in the
addressed-object table, identical semantics and authorization from either entry point, and the
note that this format's withdrawal is PyPI's yank in effect (hidden from resolution, still installed
when pinned), so the `delete` action applies to it as `julia.md` settled for yank.

### Names, versions and case

- **Nothing folds.** A request whose owner or name differs in case from the published spelling
  answers as absent. The live Forge folds the owner (`PuppetLabs-stdlib` answers `200` with the
  canonical slug, captured) but **the module tool fails anyway**: it discards listed releases whose
  `metadata.name` differs from the name it asked for, so `puppet module install PuppetLabs-stdlib`
  failed against the live Forge on OpenVox 8.28.1 and `acmeco-tool` failed against a folding stub on
  both lines (captured). Folding would help only r10k, and would give a module two spellings in
  grants.
- **An owner differing only in case from one already present is refused at publish**, so
  `ACME-base` cannot be published beside `acme-base`: the Forge's owners are case-insensitively
  unique, and two local spellings would confuse every human and every pattern.
- **Separators.** A request may name a module as `{owner}-{name}` or `{owner}/{name}` in a path
  or in the `module` parameter; both resolve to the stored `{owner}-{name}`, and every response
  spells it with `-`, as the Forge does.
- **Versions** are compared by SemVer precedence, and no two versions of a module share a
  precedence, because build metadata is refused at publish.
- **Percent-decode before lookup**; the grammars admit no character that needs encoding.

### Authentication

Every client sends its credential **preemptively on every request**, files included, and never
responds to a challenge (captured: a `401` with `WWW-Authenticate` ended the run with one request).

- **The module tool**: the `forge_authorization` setting (`--forge_authorization` or
  `puppet.conf`) is sent verbatim as the `Authorization` header, so `"Bearer {token}"` is the form
  to configure; when it is set, URL userinfo is cleared (source). Without it, userinfo in
  `module_repository` is sent as preemptive Basic (captured on both lines). The value goes over plain
  HTTP as readily as over TLS (captured).
- **r10k**: `forge.authorization_token` in `r10k.yaml`, sent as `Bearer {token}` when the value is
  64 lowercase hex and verbatim otherwise, so `"Bearer {token}"` works and a bare non-hex token is
  sent as the scheme-less `Authorization: {token}` (captured all three). Userinfo in `forge.baseurl`
  is sent as Basic (captured).
- **Publishers**: puppet-blacksmith sends `Authorization: Bearer {api_key or token}`; the PDK path
  sends its token as r10k does (captured).
- **Redirects**: both clients drop `Authorization` on a cross-host redirect (captured), and no hosted
  route answers one.

How this meets `auth.md`, whose rules this spec does not bend: its verifier accepts Bearer, the
Basic password and the scheme-less value (its AC31), so every form above authenticates the same
principal, and its client table needs a `puppet` row (sibling consequences). A credential-less
request to a repository that is not anonymously readable answers `401` identically for a private and
a missing repository (`auth.md` AC17); a valid token lacking `pull` answers `404`; a rejected token
answers `401` and is never served as anonymous (`auth.md` AC12). The clients send credentials over
plain HTTP when the base says `http://`, so `auth.md` AC27's TLS refusal is what protects them. The
operator documentation recommends `forge_authorization` over userinfo, because Puppet 7.20.0 prints
the URL with its userinfo in every error (captured).

### Addressed objects and pattern scopes

`auth.md`'s pattern scopes narrow a credential within one repository by matching the object each
request addresses, and the format declares which object each route reports ("Pattern scopes" there;
`format-handler-interface.md` AC12). The canonical object is written with `/` separators so a module
family is a pattern such as `acme/**`: `{owner}/{name}` for a module and `{owner}/{name}/{version}`
for a release. The slug and the filename parse unambiguously, because neither `owner` nor `name` can
contain `-`, so a file's object is read from its URL with no lookup, hosted and proxied alike.

| Route | Canonical object | Action | Object kind |
|---|---|---|---|
| `GET /v3/releases?module={slug}` | `{owner}/{name}` | `pull` | named |
| `GET /v3/modules/{slug}` | `{owner}/{name}` | `pull` | named |
| `GET /v3/releases/{owner}-{name}-{version}` | `{owner}/{name}/{version}` | `pull` | named |
| `GET /v3/files/{owner}-{name}-{version}.tar.gz` | `{owner}/{name}/{version}` | `pull` | named |
| `POST /v3/releases`, multipart with the `file` part's filename before its bytes | `{owner}/{name}/{version}` parsed from the filename | `push` | named |
| `POST /v3/releases`, JSON body or a multipart part with no filename | - | `push` | none |
| `PATCH /v3/modules/{slug}`, `DELETE /v3/modules/{slug}` | `{owner}/{name}` | `push`, `delete` | named |
| `DELETE /v3/releases/{slug}` | `{owner}/{name}/{version}` | `delete` | named |
| Any out-of-scope route (search, browse, users) | - (answered `404`) | `pull` | none |

The publish rows are the resolved publish-object decision below, the same judgment `pypi.md` and
`ansible-collections.md` made: the object must be known before the bytes arrive, puppet-blacksmith's
multipart part header names the file first (captured), and ingest refuses a tarball whose identity
disagrees with that filename, so a mislabelled part cannot evade the pattern. The PDK path's JSON
body carries the name only inside the base64 tarball, so it reports none and only an unpatterned
`push` authorizes it.

What that gives, applying `auth.md`'s rules rather than re-deciding them. **A patterned `pull` runs
every install end to end**, because no route either client uses reports none: `acme/**` lets both
agent lines install `acme-app` with its `acme-base` dependency and r10k install both, and refuses
`other/**`. A dependency outside the pattern fails the whole install, so a build with public
dependencies holds an unpatterned `pull` on the repository serving them. **A pattern refusal is
answered as absence**, indistinguishable from a module that does not exist: `200` with no results on
the list route ("No releases are available", captured shape), `404` in the Forge's error shape
elsewhere ("does not exist on", captured shape on r10k). A patterned `push` publishes in-pattern
releases through puppet-blacksmith and is refused out-of-pattern ones with no snapshot.

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines on the
**file route** of either path, the handler answers `403` with
`{"message": "403 Forbidden: refused by policy {policy}, rule {rule}", "errors": ["{policy}: {rule}: {detail}"]}`
(or naming the signal, for a coordinate condemned under the shared security-signal rule). Per the
resolved refusal-rendering decision below and captured: both agent lines print the `message`
("The message we received said ..."), r10k prints each `errors` string after "The following errors
were returned from the server", and each exits 1 without contacting another host. `403` rather than
the existence rule's `404`, because the caller is authorized and the content is what is refused. A
refused file is requested once per run (no client retries, captured), so one refused install produces
one refusal record.

The list, module and release documents keep naming a refused release, the no-elision precedent
`conan.md`, `vagrant.md` and `debian.md` set: eliding it would make the module tool silently choose an
older allowed release, and a policy change would downgrade fleets with no message. The release
document answers `200` because r10k reads it before the file and renders a `403` there without the
reason (captured on the module route); the reason reaches every client at the file.

### Signing, provenance and policy

The Forge ecosystem has **no signature scheme**: no Forge API field, `metadata.json` key or client
check carries one (OpenAPI document, the clients' source), and a `checksums.json` inside a
module holds per-file MD5s (the module tool's `Checksums` class) in the same archive it describes,
which the install path never reads; only the checksummer behind `puppet module changes` compares an
installed tree against it (source).
So `docs/internal/plans/foundation/artifact-verification.md` (to be authored in the spec loop) is
asked for one thing, per `supply-chain-policy.md`'s resolved verification-ownership decision: **a
release-integrity entry** taking a file, an expected SHA-256 and an optional MD5 and answering
match, mismatch or weak (MD5 only), used by the proxied path. The verdict source
`supply-chain-policy.md` consumes answers **absent** for every Puppet artifact, and a rule requiring
a verified signature refuses every release (its AC15), which the operator documentation states.

**Advisory coverage is absent.** OSV has no Puppet ecosystem, the schema defines none and purl has no
`puppet` type (Context), so no coordinate can match an advisory, and per the resolved advisory
decision below an advisory-dependent rule attached to a Puppet repository is refused at
configuration, as `supply-chain-policy.md` requires of an ecosystem the feed does not cover (its
AC11). Coordinate rules that need no advisory (a name or version pattern) bind on both paths.
Byte-level rules depend on the shared cataloguer's coverage of module tarballs, which that spec
decides.

The Forge's `malware_scan` field is a VirusTotal analysis of the release file (`links.item` names
the file's SHA-256; 9 of 446 sampled current releases carry one, every one with `malicious: 0`,
captured). It is carried through on the proxied path verbatim and **is not a security signal**: it
is a third-party scan attached to content the Forge still serves, not an upstream removal, so an
analysis reporting `malicious` or `suspicious` greater than zero is recorded and alerted to the
operator and condemns nothing (the resolved advisory decision below). Detection of signals is
passive, per `proxy-cache.md`'s resolved signal-detection decision (was Q12).

### Gated upstream modules

Two module-level flags on the live Forge gate downloads: `premium` (for example
`puppetlabs-sce_linux`, `puppetlabs-security_policy`) and `login_required` (for example
`puppetlabs-cd4peadm`, `puppetlabs-complyadm`). For every such module, metadata stays anonymous
while **every release file answers `401`** without a valid API key: all 15 releases of
`puppetlabs-sce_linux` back to 2024-05-07 and all 18 of `puppetlabs-cd4peadm` back to 2024-05-07,
with `{"message": "401 Unauthorized", "errors": ["This request requires valid Authorization"]}` and
no challenge, and `WWW-Authenticate: OAuth realm="forgeapi.puppet.com", error="invalid_token"` for a
wrong key (captured). Of the 221 `puppetlabs` modules, 12 are gated this way; the other 209,
`puppetlabs-stdlib` and `puppetlabs-apache` among them, download anonymously (captured). The gating
is per module, not per release: no module sampled has open older releases and gated newer ones. The
key is a Forge API key sent as `Authorization: Bearer`, the form r10k's `authorization_token` and the
module tool's `forge_authorization` send (Forge API documentation; captured forms).

What that means for a proxied Forge, per the resolved gated-content decision below:

- **A remote without an upstream credential** answers a gated module's file route `403` with a
  message naming the upstream's authorization requirement and the module's gate, never `401` (which
  the client would read as its own credential failing), never a negative cache entry, and never a
  `404`.
- **A remote with a Forge API key** fetches gated files with it, sent only to the upstream's host,
  and records the gate on the cached module revision.
- **A gated module is never served from a repository with anonymous read enabled**, remote or virtual
  over a remote: its file route answers `403` naming the gate, because the key holder's entitlement
  is not a licence to republish to the world. Beyond that, serving cached gated content only to
  entitled principals is the operator's obligation, expressed through ordinary repository grants,
  which the operator documentation says.

### The proxied path

The handler owns the request and classifies for the proxy layer's fetch-and-cache API per the settled
decisions in `proxy-cache.md`. A remote repository's upstream is a Forge API v3 base URL, with or
without a path (the Forge at a host root; another registry's Forge endpoint under a prefix).

**The module revision is the unit of metadata caching** (the resolved proxied-module decision
below). On a miss or after the TTL, the handler fetches the upstream's module document and its whole
release list (`/v3/releases?module={slug}&show_deleted=true`, following base-relative `next` links
against the upstream's base until exhausted) as one revision, and answers every client query from
it: the list with the client's `sort_by`, `exclude_fields` and paging applied locally, the module
document, and each release document. Client queries are never forwarded upstream one by one, so the
set of distinct query strings two clients send (the module tool's exclusions, r10k's none) does not
multiply upstream traffic or cache entries.

What this format requires of `docs/internal/plans/foundation/upstream-adapters.md` (to be authored in
the spec loop):

- **Base-relative resolution against the upstream's base**: `next` links and `file_uri` values are
  resolved as the clients resolve them (appended to the base path), and an absolute `file_uri` from an
  upstream is accepted when its host is on the remote's artifact allowlist.
- **An optional upstream credential** sent as `Authorization: Bearer` to the upstream's host only,
  over HTTPS unless an operator overrides it, never forwarded on a redirect to another host.
- **Conditional revalidation**: `If-Modified-Since` with the revision's `Last-Modified` (the live
  Forge answers `304`, captured); `If-None-Match` is sent where an upstream honours it (the live
  Forge ignored it, captured).
- **A `User-Agent`** identifying the registry, which the OpenAPI document asks every caller to send.

Classification and behaviour:

- **The module revision is mutable metadata with the proxy layer's TTL.** A new revision is parsed;
  a release whose `metadata.name` or `slug` does not match the requested module, or whose file cannot
  be mapped to this registry's file route, is omitted from what is served and named in the operator
  record; the rest of the revision serves. Every served URI is re-rendered base-relative from the
  release's coordinate, which for a root-hosted upstream reproduces the upstream's own strings.
- **Files are immutable artifacts.** A file request resolves its slug through the current or a
  retained revision; a slug no revision names triggers one module-revision fetch and then answers
  `404` with no file request, so the remote is not an open relay. The fetch is verified under
  stream-and-verify against the revision's `file_sha256`; when an upstream publishes only
  `file_md5`, against that, recorded as weak, and the served release then carries this registry's
  SHA-256 of the cached bytes beside the upstream's MD5 (the same rule `vagrant.md` adopted for
  missing checksums); an upstream release with neither is omitted from what is served and recorded.
  A truncated or mismatching body is never committed.
- **Withdrawal is mirrored**: an upstream release carrying `deleted_at` is served exactly as a hosted
  withdrawal is, listed only under `show_deleted`, its release document and file still served, so
  r10k pins keep working through the cache as they do against the Forge.
- **Missing resources are negatively cached** with the short TTL: an upstream module `404`, and an
  upstream release list answering `200` with no results, which is the Forge's not-found shape
  (captured). A `429` or `5xx` is never cached as absence (`proxy-cache.md` AC9). An upstream `401`
  or `403` on a file is the gated-module case above, never absence.
- **Publish and every management operation against a remote repository answer `405`.**

Upstream removal maps onto the settled purge-or-flag table as this format's side of that contract
(`proxy-cache.md`, "Upstream removal or replacement"). Nothing on the Forge wire is an explicit
security signal.

| Upstream event, as observed at revalidation or fetch | Classification |
|---|---|
| A release gains `deleted_at` (the Forge's soft delete) | Mirrored as a withdrawal: no purge, cached bytes keep serving by slug, the divergence recorded, as PyPI's yank row keeps serving |
| A release leaves the list and its release document answers `404` | An author removal with no security signal: the cached file stays fetchable at its slug for clients that already resolved it, the served list follows the upstream, and the divergence is recorded and alerted |
| The module gains `deprecated_at`, or loses it | Mirrored; no divergence |
| The module document answers `404` (the Forge's module delete) | Served as a hosted module delete is: module document `404`, releases withdrawn, cached files still served; the divergence recorded and alerted |
| A new revision lists a different `file_sha256` or `file_md5` for a cached release | An immutability violation recorded and alerted; the route keeps serving the cached bytes, whose digests the served documents keep, and the new bytes are never fetched under the old coordinate |
| A file fails its upstream checksum, or a body is truncated | An integrity failure: nothing committed, no negative entry, the operator alerted with the real reason, the next request tries again |
| The module becomes `premium` or `login_required` | The gate is recorded on the revision; uncached files follow the gated-module rules; cached files keep serving under the same rules |
| A `malware_scan` reports `malicious` or `suspicious` above zero | Recorded and alerted; not a condemnation (Design, "Signing, provenance and policy") |

Per the resolved preconfigured-upstream decision below, no Puppet upstream is preconfigured; the
operator documentation gives the one-line remote for `https://forgeapi.puppet.com`.

### Virtual repositories

Nothing in a Forge document is signed and every URI is base-relative, so a `virtual` Puppet
repository needs neither re-signing nor rewriting. Per the resolved virtual-repository decision
below:

- **Resolution is per module, in member order**: the first member holding any release of
  `{owner}-{name}` (any withdrawn release included) supplies the module document, the release list
  and every release document and file of that module; later members' releases of that module are not
  merged in. Each dependency is resolved the same way independently, so a module in a hosted member
  can depend on one only a remote member holds.
- **This is where a virtual repository earns its place.** Each client names one Forge, so private and
  public modules can only share a `module_repository` through a virtual repository, and a hosted
  module placed first shadows a public one of the same name, which is what keeps a private
  `acme-base` from being resolved against a public squatter's releases.
- Publish and management operations against a virtual repository answer `405`, and a virtual
  repository with anonymous read enabled applies the gated-module rule to every remote member.

### Conformance, the clients and the corpus

The two agent lines' module tools send byte-identical requests apart from the `User-Agent`
(captured), and their `forge.rb` differs only cosmetically; what differs is the Ruby and
`semantic_puppet` versions under the resolver, the tar invocation, and userinfo in error output. The
meaningful skew is between **the module tool and r10k**, which read different endpoints, select
versions by different rules and treat withdrawn releases differently, and every hosted and proxied
case runs on all three unless it names a client-specific behaviour. The catalogue counts one
ecosystem; the three clients appear in the matrix's Client column under the Puppet row.

**Every case runs with the client's network restricted to this registry and its stand-ins**, except
the recording session. The client images are the upstream images named in Context, pinned by digest
(`conformance-harness.md` AC4); each case appends the harness CA to
`/opt/puppetlabs/puppet/ssl/cert.pem` (the agents) or `/etc/ssl/certs/ca-certificates.crt` (r10k,
run as root for that), writes `r10k.yaml` with `forge.baseurl`, and gives each client a fresh home
unless it continues one (upgrade, rollback). The publishers run from a pinned image carrying
puppet-blacksmith 9.1.0 and the `puppet_forge` gem PDK 3.4.0 uses, pinned by the digest of the built
image.

The recorded surface for the replay corpus: against forgeapi.puppet.com, the module tool's release
list for a module with more than one page, r10k's module and release documents, one file, an
unknown module's list and module document, a soft-deleted release's document and file, and a gated
module's file refusal. The reference implementation for reads is the live Forge, so `Capabilities()`
declares reference-implementation availability `available`; the publish surface has no reference that
can be recorded without an account on the public Forge, an exception-list entry. Recording gates on
the harness's redaction criterion (`conformance-harness.md` AC13), whose rule for this format names
the `Authorization` header, URL userinfo and the multipart and JSON bodies of a publish. Deliberate
divergences go on the exception list before their flow is expected to replay: `module` present
despite `exclude_fields`, whole-list pages when `limit` is absent, `downloads: 0`, `404` on the
out-of-scope routes, exact-case owner lookup, idempotent `201` on an identical republish, and `405`
on remote writes.

## Acceptance Criteria

- [ ] AC1: With the client network restricted to this registry, `puppet module install acme-app
      --module_repository https://{host}/puppet/{repo}` on Puppet 7.20.0 and OpenVox 8.28.1 installs
      `acme-app` 1.0.0 and resolves its dependency to `acme-base` 1.1.0 while 2.0.0 is published; the
      transcript shows one release-list request per module carrying `sort_by=version` and the
      client's `exclude_fields`, then one file request per module; the checksum step passes; and
      every installed file equals the published tarball's content byte for byte.
- [ ] AC2: r10k 5.0.3 with `forge.baseurl` naming the repository installs a Puppetfile pinning
      `acme-app` 1.0.0 and naming `acme-base` as `:latest`: the transcript shows `/v3/modules`, then
      `/v3/releases/{slug}`, then `/v3/files` per module; `:latest` installs `current_release`,
      which is the highest non-prerelease version while `2.1.0-rc1` is published; a further run with
      the module installed makes no request; and after the module directory is removed, a run
      with the tarball cache warm requests only the module document and reinstalls the same bytes.
- [ ] AC3: Every `file_uri`, every `uri` and every `pagination` link in every response of every
      route is base-relative and begins with `/v3/`, asserted across all fixtures on the mount and on
      a bound hostname; the same document is byte-identical when requested through two different
      base URLs with no configuration change; and installs through a base with a path succeed on
      all three clients.
- [ ] AC4: A module with 150 releases is resolved by both agent lines with exactly one release-list
      request; an explicit `limit=20` yields base-relative `next` links that `puppet module install`
      follows to completion; `limit=500` is clamped to 100; `sort_by=version`, `release_date` and
      `module` order as specified, an unknown `sort_by` is ignored, and `module_groups` and
      `with_html` are accepted and ignored; and a publish committed
      between two explicit-`limit` page requests never makes the module tool install a release
      that fails its constraint.
- [ ] AC5: Every release document and list entry carries `file_sha256` and `file_md5` equal to the
      digests of the bytes the file route serves, asserted over every hosted fixture and every
      proxied cached release; hosted documents carry `downloads: 0`; files carry the immutable caching header, an
      `ETag` and `Content-Disposition`; JSON documents carry `Cache-Control: no-cache` and answer `304` to a
      matching `If-None-Match` and `If-Modified-Since`; and bytes altered in storage by fault
      injection are refused by all three clients with their checksum error.
- [ ] AC6: A multipart publish from puppet-blacksmith 9.1.0 to `https://{host}/puppet/{repo}/v3/releases`
      answers `201` with the release document, creates exactly one snapshot, and the release then
      installs on all three clients; republishing identical bytes answers `201` and creates no
      snapshot; different bytes at an existing coordinate, and a hard-deleted coordinate including
      after the deleting snapshot was pruned, answer `409`; and puppet-blacksmith exits non-zero on
      each refusal with the body printed.
- [ ] AC7: Each of these publishes answers `400` in the Forge's error shape with nothing committed and
      no snapshot: an archive that is not gzip-compressed tar; more than one top-level directory; a
      top directory, `metadata.json` identity or multipart filename that disagree; a symlink, a hard
      link, an absolute path or a `..` path; an owner or name outside the grammar; a version with
      build metadata or outside SemVer; a dependency with an unparsable name or
      `version_requirement`; and a missing `metadata.json`.
- [ ] AC8: On a hostname bound to a Puppet repository, the PDK 3.4.0 publish path through
      `puppet_forge` posts JSON with a base64 body to the root `/v3/releases` and publishes into the bound repository with one
      snapshot, and both agent lines and r10k install from that hostname's bare root as their base;
      on an unbound hostname the same post answers `404` in the Forge's error shape and stores
      nothing; and registration refuses a second repository bound to the same hostname.
- [ ] AC9: With `AcmeCo-tool` published, `puppet module install acmeco-tool` fails on both agent lines
      with "No releases are available" and r10k naming `acmeco-tool` fails with "does not exist",
      while `AcmeCo-tool` and `AcmeCo/tool` install on both lines; a publish of `ACME-base` while
      `acme-base` exists answers `409` with no snapshot; and every response spells a module as
      `{owner}-{name}` exactly as published.
- [ ] AC10: Deprecating `acme-base` through the management endpoint and, separately, through
      `PATCH /v3/modules/acme-base` each creates one metadata-only snapshot, after which the module
      document carries `deprecated_at`, `deprecated_for` and `superseded_by`, every release carries
      `module.deprecated_at` even when the request excludes `module`, both agent lines print the
      author-deprecation warning and install, r10k prints its deprecation warning and installs, and
      undeprecating removes the warnings in one further snapshot.
- [ ] AC11: Withdrawing `acme-base` 1.1.0 through the management endpoint and, separately, through
      `DELETE /v3/releases/acme-base-1.1.0?reason=broken` each creates one snapshot, after which
      the release list omits it unless `show_deleted=true`, `puppet module install acme-app` resolves
      `acme-base` 1.0.0 and `--version 1.1.0` fails on both agent lines with "No releases matching",
      r10k's pinned entry installs 1.1.0, and the release document answers `200` carrying
      `deleted_at` and `deleted_for`; restoring it returns normal resolution in one snapshot; and
      `DELETE /v3/modules/acme-base` makes the module document answer `404` while every release
      document and file still answers `200`.
- [ ] AC12: Hard-deleting a release through the management endpoint makes its release document and
      file answer `404`, r10k's pinned entry fail, and the coordinate retired including after a
      backwards repoint and after the deleting snapshot is pruned; the `Package` row survives
      deleting its last release; every management operation and binding is refused with no snapshot
      for a principal lacking its action (`push` for publish and deprecation, `delete` for
      withdrawal, restoration and deletion) and answers `405` against a remote or virtual repository.
- [ ] AC13: After `acme-base` 2.0.0 is installed by all three clients and the repository's pointer is
      moved back to the snapshot before 2.0.0 was published, every document is served byte-identical
      to that snapshot's, r10k's next `:latest` run installs 1.1.0, `puppet module upgrade` on both agent
      lines answers that the installed version is already the latest and `install` that it is already
      installed, and `install --force` installs 1.1.0.
- [ ] AC14: On a private repository over TLS, both agent lines install with
      `forge_authorization "Bearer {token}"` and with userinfo in `module_repository`, and r10k with
      `authorization_token` set to `Bearer {token}`, to the bare token, and with userinfo in
      `forge.baseurl`, the transcript showing the credential on every request including the file;
      a credential-less request answers `401` identically for a private and a missing repository;
      a token lacking `pull` answers `404`; a rejected token answers `401` and is never served as
      anonymous; the same token over plain HTTP is refused before lookup; no hosted route answers a
      redirect; and no credential appears in logs, error bodies or metrics.
- [ ] AC15: A token holding `pull` patterned `acme/**` installs `acme-app` with `acme-base` on both agent
      lines and through r10k, in hosted and proxied mode, and is refused `other-mod`, whose list
      answers `200` with no results and whose module, release and file routes answer `404`, the
      same answers a nonexistent module receives; a token holding `push` patterned `acme/**`
      publishes `acme-newmod` through puppet-blacksmith and is refused `other-newmod` with no
      snapshot; and a JSON-body publish is refused for that patterned `push` and accepted for an
      unpatterned one.
- [ ] AC16: A release the shared policy layer refuses answers `403` on its file route with the Forge
      error body naming the policy in `message` and in `errors`, on the hosted and the proxied path,
      while its list, module and release documents still answer `200` naming it; both agent lines
      exit 1 printing the policy from `message`, r10k exits 1 printing the `errors` strings; no
      request reaches any other host, asserted at the network layer; and each refused install
      produces exactly one refusal record.
- [ ] AC17: A remote repository over a stand-in Forge served under a path prefix, whose release lists
      span three pages and whose `file_uri` values are relative to its own base, installs
      `acme-app` with its dependency on all three clients with only this registry reachable: served
      documents carry base-relative URIs to this registry, the installed files equal the stand-in's
      bytes, the stand-in receives one module document and one full paged list per module per TTL
      whatever query strings the clients sent, and a second install from fresh containers produces
      no stand-in request.
- [ ] AC18: For a proxied release whose bytes do not match the upstream `file_sha256`, nothing is
      committed, the previous state keeps serving and the next request tries again; for an upstream
      carrying only `file_md5`, the matching file is cached, recorded as weakly verified, and served
      with this registry's SHA-256 beside the upstream's MD5; a release with neither checksum is
      omitted from what is served; a truncated body is never committed; and the real reason reaches
      the operator record in each case.
- [ ] AC19: A proxied module revision is revalidated after its TTL and not before, with
      `If-Modified-Since` against a stand-in that answers `304`; a release published upstream becomes
      installable after the TTL and not before absent an explicit refresh; a release whose `metadata.name` differs from the
      requested module is omitted from what is served and recorded; files are never revalidated; an upstream module `404` and an upstream empty release list are negatively
      cached, while a `429` or `5xx` is neither cached as absence nor surfaced as not-found; and a
      file request for a slug no revision names causes one module-revision fetch and a `404`, with
      no file request upstream, asserted at the network layer.
- [ ] AC20: Against a stand-in gating modules the way the live Forge gates `puppetlabs-sce_linux`
      (`premium`) and `puppetlabs-cd4peadm` (`login_required`), a remote without a credential answers the gated file `403` with a
      message naming the upstream's authorization requirement, which both agent lines and r10k
      print, and creates no negative entry; a remote holding a Forge API key fetches it, the key
      reaching only the upstream's host and not a redirect's other host, asserted at the network
      layer; and a remote or virtual repository with anonymous read enabled answers every gated
      module's file `403` naming the gate.
- [ ] AC21: A stand-in presenting each removal-table event produces this format's classification: a
      release gaining `deleted_at` is mirrored as a withdrawal with its cached file still served by
      slug; a release vanishing is followed by the served list while its cached file stays fetchable
      by slug and the divergence is recorded and alerted; a module `404` serves as a module delete;
      a changed checksum for a cached release keeps serving the cached bytes and records a
      violation; and a `malware_scan` reporting `malicious` or `suspicious` above zero is recorded and
      alerted while the release keeps serving.
- [ ] AC22: A policy rule depending on advisory data attached to a Puppet repository is refused at
      configuration naming the reason; a coordinate rule over a name or version pattern attaches and
      refuses as configured on both paths; and a rule requiring a verified signature refuses every
      release with the reason that no signature exists.
- [ ] AC23: A virtual repository over a hosted and a remote member installs, on all three clients, a
      hosted module whose dependency only the remote holds; a hosted `acme-base` placed first
      shadows an upstream `acme-base` so that no upstream release of that module is listed or
      fetched, asserted at the network layer; and publish to the virtual repository answers `405`.
- [ ] AC24: With `acme-base` 2.1.0-rc1 published above 2.0.0, `puppet module install acme-base`
      installs 2.0.0 on both agent lines and `--version 2.1.0-rc1` installs the prerelease;
      `current_release` names 2.0.0; and for a module whose only release is a prerelease,
      `current_release` names it and r10k's `:latest` installs it.
- [ ] AC25: A proxied module revision above the inline metadata threshold (the size of
      `puppetlabs-stdlib`'s, whose module document is 335,715 bytes) survives a GC sweep while it is
      current or retained and still serves an install on all three clients afterwards.
- [ ] AC26: Replay-match passes against a corpus recorded from forgeapi.puppet.com covering the
      recorded surface named in Design, with the `Authorization` header, URL userinfo and publish
      bodies redacted.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/puppet/module_install_test.go` (both agent images, network-restricted client containers, transcript order and query strings asserted, installed tree compared with the tarball) |
| AC2 | conformance | `conformance/puppet/r10k_install_test.go` (pinned and `:latest` entries, prerelease present, rerun and reinstall from the warm tarball cache with request counts asserted) |
| AC3 | integration + conformance | `internal/format/puppet/uri_render_test.go` (every route's URIs over every fixture, two bases compared byte for byte, mount and bound hostname); `conformance/puppet/base_path_test.go` (all three clients through a base with a path) |
| AC4 | integration + conformance | `internal/format/puppet/pagination_test.go` (whole-list page without `limit`, clamp, sort orders, unknown `sort_by`, a publish injected between page requests with the resolution result checked); `conformance/puppet/pagination_test.go` (150-release module, request counts on both agent lines, explicit-`limit` pages followed) |
| AC5 | integration + conformance | `internal/format/puppet/digest_test.go` (both digests equal the served bytes on every hosted and cached release; header assertions; `304` answers); `conformance/puppet/checksum_test.go` (storage fault injection, all three clients refusing) |
| AC6 | conformance + integration | `conformance/puppet/publish_blacksmith_test.go` (publish, install on all three, idempotent republish, `409` cases, the publisher's exit status and output); `internal/format/puppet/publish_snapshot_test.go` (snapshot counts, retired coordinate after pruning under an injected clock) |
| AC7 | integration | `internal/format/puppet/ingest_test.go` (one hostile or malformed archive per rule, each refused `400` with the Forge error shape, CAS and snapshot unchanged) |
| AC8 | conformance + integration | `conformance/puppet/publish_pdk_test.go` (the PDK 3.4.0 upload calls against a bound and an unbound hostname; installs from the bare root on all three clients); `internal/format/puppet/host_binding_test.go` (duplicate binding refused at registration) |
| AC9 | conformance + integration | `conformance/puppet/names_test.go` (case variants and separators on both agent lines and r10k); `internal/format/puppet/owner_case_test.go` (case-colliding owner refused, spelling of every response) |
| AC10 | conformance + integration | `conformance/puppet/deprecate_test.go` (management endpoint and `PATCH` binding driven from the case `script`, warnings asserted on all three clients); `internal/format/puppet/deprecate_test.go` (snapshot counts, `module` present under exclusion) |
| AC11 | conformance + integration | `conformance/puppet/withdraw_test.go` (management endpoint and `DELETE` binding, module tool resolution and `--version` failure, r10k pinned install, module delete); `internal/format/puppet/withdraw_test.go` (`show_deleted`, release and file answers, restore, snapshot counts) |
| AC12 | conformance + integration | `conformance/puppet/hard_delete_test.go` (r10k pinned failure after hard delete); `internal/format/puppet/manage_auth_test.go` (action refusals per operation and binding with snapshot count unchanged, `405` on remote and virtual, retirement across a backwards repoint and after pruning, `Package` row survival) |
| AC13 | conformance | `conformance/puppet/rollback_test.go` (install on all three, repoint, r10k downgrade, `upgrade` and `install` messages on both agent lines, `--force`, served documents compared with the predecessor snapshot's) |
| AC14 | conformance + integration | `conformance/puppet/auth_test.go` (private repository over TLS, every credential form on its clients, anonymous, `pull`-less and rejected tokens, plain-HTTP refusal, no redirect status on any hosted route); `internal/auth/leak_test.go` (redaction for this format) |
| AC15 | conformance + unit | `conformance/puppet/pattern_test.go` (the pattern-refusal case `auth.md` AC8 and `format-handler-interface.md` AC7 require, both modes, all three clients, patterned `push` through puppet-blacksmith and the JSON path); `internal/format/puppet/scope_object_test.go` (the object table per route, `format-handler-interface.md` AC12) |
| AC16 | conformance + integration | `conformance/puppet/policy_test.go` (hosted and proxied modes, rules through the `policies` key, exit status and printed text per client, documents still `200`, network-layer assertion of no other host); `internal/format/puppet/refusal_record_test.go` (one record per refused install) |
| AC17 | conformance | `conformance/puppet/proxied_install_test.go` (prefixed paginated stand-in, all three clients, URI assertions, byte comparison, upstream request counts per module, second install with the network layer showing no stand-in request) |
| AC18 | integration | `internal/format/puppet/proxied_integrity_test.go` (SHA-256 mismatch, MD5-only with SHA-256 filled once cached, no checksum, truncated body; CAS and reference assertions; operator record) |
| AC19 | conformance + integration | `conformance/puppet/proxied_ttl_test.go` (mutating stand-in answering `304`, network-level counts, publish visibility after the TTL); `internal/format/puppet/proxied_negative_test.go` (module `404`, empty list, `429`, `5xx`, unknown slug with no file fetch) |
| AC20 | conformance + integration | `conformance/puppet/gated_test.go` (gated stand-in, printed messages on all three clients); `internal/format/puppet/gated_remote_test.go` (credential scope at the network layer, cross-host redirect, anonymous-read repositories, no negative entry) |
| AC21 | integration | `internal/format/puppet/removal_test.go` (stand-in presenting each event; the shared-layer half is `proxy-cache.md`'s) |
| AC22 | integration | `internal/format/puppet/policy_config_test.go` (advisory rule refused at configuration, pattern rule on both paths through the `advisories` and `policies` keys, signature rule refusing with its reason) |
| AC23 | conformance + integration | `conformance/puppet/virtual_test.go` (cross-member dependency on all three clients, shadowing with the network layer showing no upstream request for the shadowed module, `405`); `internal/format/puppet/virtual_resolve_test.go` (first-member-per-module resolution) |
| AC24 | conformance + unit | `conformance/puppet/prerelease_test.go` (default and exact-version installs on both agent lines, r10k `:latest` on a prerelease-only module); `internal/format/puppet/current_release_test.go` (the `current_release` rule over generated version sets) |
| AC25 | integration + conformance | `internal/storage/metadata_root_test.go` (threshold crossing with a proxied module revision, sweep, serve); `conformance/puppet/large_module_test.go` (all three clients install after the sweep) |
| AC26 | conformance | `conformance/puppet/replay_test.go` (corpus replay against the recorded Forge surface with the named redactions) |

The case set needs only keys already in the harness's closed `setup` vocabulary (its resolved
closed-vocabulary decision, was Q4): `repositories` with their type, virtual member order and hostname
binding, `credentials` (patterned tokens included), `upstreams` (a Forge stand-in with variants for a
path prefix, pagination, mutation, corruption, missing checksums, gating and removal), `state` for
pre-published modules, and `advisories` and `policies` for AC16 and AC22. One obligation on the
harness is recorded rather than assumed, and listed in the sibling consequences: a hostname binding
is repository configuration the `repositories` key must be able to express, since AC8 needs a case
with a bound hostname. The runner-enforced obligations, both modes and the unauthenticated,
unauthorized and pattern-refusal cases in each, apply from the sibling specs and are not restated per
criterion.

## Implementation Phases

### Phase 1: Hosted reads
- The format-first mount, the four read routes with base-relative URIs, whole-list pages,
  `exclude_fields` with `module` kept, `current_release`, both digests, caching headers, the Forge
  error shape, seeded modules through `state`, the per-route addressed objects, the `403` policy
  rendering on the file route

### Phase 2: Publish and management
- Waits on `docs/internal/plans/foundation/management-api.md` reaching `planned` (Blocking
  preconditions)
- `POST /v3/releases` in both body forms with ingest validation, the hostname binding and its
  root-anchored `/v3/`, deprecation, withdrawal, restoration, module delete and hard delete with the
  Forge bindings and the retirement set, the write-boundary declaration exercised under concurrency

### Phase 3: Proxied path
- Waits on `upstream-adapters.md` and `artifact-verification.md` (Blocking preconditions)
- Module revisions with TTL and conditional revalidation, verified file caching with the MD5
  fallback, gated modules, withdrawal mirroring, negative caching, the removal table, `405` on remote
  writes

### Phase 4: Virtual repositories, corpus and gate
- Per-module virtual resolution, the recorded corpus against forgeapi.puppet.com, all three clients
  in the matrix, the exception-list entries named in Design

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. The fourteen questions this draft raised were each written in the template's decision
shape and then adopted at their own recommendation under the owner's standing delegation of
2026-09-26, so the loop can continue; each is recorded below as adopted rather than decided, folded
through Scope, Design, the criteria and the Test Plan in the same pass, and reversible by the owner
at any time. `grep -rn "standing delegation"` is the owner's review queue.

### Resolved: how PDK's root-path publish reaches a repository (was Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a hostname may be bound to
one Puppet repository by instance configuration, and on a bound hostname the handler serves the
root-anchored `/v3/` for that repository, publish included; unbound hostnames answer `404` there
(Design, "Publish"; Blocking preconditions; AC8).

The question: PDK's publish, through `puppet_forge`'s `Release.upload`, posts to `/v3/releases` at the
host root whatever path its upload URL carries (captured), so a format-first mount never receives it,
while puppet-blacksmith respects the path (captured).

**Recommendation:** A. It follows `terraform.md`'s adopted host binding rather than inventing a
second mechanism, needs no routing by credential, and gives Puppet users the bare-host
`module_repository` the Forge's own documentation shows.

| Option | You get | It costs |
|---|---|---|
| **A. Host binding with a root-anchored `/v3/`** | PDK publishes unmodified; bare-host configuration works for every client | A dedicated hostname and certificate per PDK-published repository; a second root-anchored claim in the registration carve-out list |
| **B. Route the root `/v3/releases` by the token's single repository** | No hostname to provision | The repository is chosen by a credential rather than the URL, a new authorization shape `auth.md` never considered, and ambiguous for multi-repository tokens |
| **C. No PDK publish; puppet-blacksmith and the management API only** | No root-anchored claim | PDK users, the ecosystem's standard tool, cannot publish |

**Why this is yours:** it adds a root-anchored claim and a deployment-shape commitment.

Accepted cost: the binding is instance configuration and an input to the interface re-open, and the
operator documentation carries the recipe.

### Resolved: what the Forge's "delete release" means here (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the Forge's delete is a
**withdrawal**, hidden from lists and still served by slug and file, with a separate hard delete in
the management API only (Design, "Deprecation, withdrawal and deletion"; AC11, AC12).

**Recommendation:** A. It is exactly what the live Forge does (captured on
`puppetlabs-stdlib-10.0.0`), r10k Puppetfiles pinned to a withdrawn release keep deploying
(captured), and the destructive operation remains available where the registry owns it.

| Option | You get | It costs |
|---|---|---|
| **A. Soft withdrawal, plus a management-only hard delete** | Forge semantics; pinned deployments survive a withdrawal | Two operations where the Forge documents one |
| **B. The Forge route hard-deletes** | One operation | Every r10k deployment pinned to the release breaks, where the Forge would have kept it working |

**Why this is yours:** it decides whether removing a release breaks existing deployments.

Accepted cost: `management-api.md` carries both operations.

### Resolved: whether the module tool sees deprecation (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: every release carries
`module` with at least `slug`, `name`, `owner` and `deprecated_at`, even when the request excludes
it (Design, "Release lists"; AC10).

**Recommendation:** A. The module tool's warning reads `module.deprecated_at` and the module tool
itself asks for `module` to be excluded, so honouring the exclusion hides every deprecation from
Puppet users (captured against the live Forge's deprecated `puppetlabs-mrepo`); the OpenAPI document
tells clients to ignore unrecognised properties, and both lines accept the extra field and warn
(captured).

| Option | You get | It costs |
|---|---|---|
| **A. Keep `module` despite exclusion** | Deprecation reaches module-tool users | A documented divergence from the Forge's handling of `exclude_fields` |
| **B. Honour exclusions exactly** | Byte-likeness to the Forge | Deprecation never reaches the module tool |

**Why this is yours:** it trades protocol fidelity for a warning users otherwise never see.

Accepted cost: the exception-list entry.

### Resolved: serving the Forge's management routes (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: `PATCH /v3/modules/{slug}`,
`DELETE /v3/releases/{slug}` and `DELETE /v3/modules/{slug}` are served as bindings onto the
management operations (Design, "Deprecation, withdrawal and deletion"; AC10, AC11).

**Recommendation:** A. They are part of the published OpenAPI contract, so scripts written for the
Forge work unchanged, and one implementation behind two entry points is the precedent `conan.md` and
`debian.md` set.

| Option | You get | It costs |
|---|---|---|
| **A. Bindings onto the management API** | Forge-targeting scripts work; one implementation | Triggers verified by integration tests and case scripts only, since no client in the matrix drives them |
| **B. Management API only** | One entry point | A documented part of the Forge API answering `404` |

**Why this is yours:** it adds client-shaped entry points to the management surface.

Accepted cost: the trigger is not vouched for by any third-party client, which is stated.

### Resolved: module name matching and owner case (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: names match byte for byte,
and a publish whose owner differs only in case from an existing owner is refused (Design, "Names,
versions and case"; AC9).

**Recommendation:** A. The module tool fails on a differently spelled name even against the folding
live Forge (captured), so folding buys nothing for it, and pattern grants match canonical strings byte
for byte.

| Option | You get | It costs |
|---|---|---|
| **A. Exact match; case-colliding owners refused** | One spelling per module, locally and in grants | r10k users who relied on the Forge's folding fix their Puppetfile |
| **B. Fold owners as the Forge does** | r10k tolerance of case | Two spellings of one module in grants, and no gain for the module tool |

**Why this is yours:** it decides whether migrated Puppetfiles need editing.

Accepted cost: the migration note.

### Resolved: the version grammar at publish (was Q6)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: SemVer 2.0.0 with an
optional prerelease and no build metadata (Design, "Publish"; AC7).

**Recommendation:** A. Two versions differing only in build metadata share a precedence, so
"highest" and `current_release` would be ambiguous and the filenames would differ for one
precedence; the Forge's own release-slug pattern admits prereleases, which the clients handle
(captured).

| Option | You get | It costs |
|---|---|---|
| **A. SemVer without build metadata** | One precedence per version; an unambiguous `current_release` | Publishers using `+build` renumber |
| **B. Any SemVer** | The Forge's slug pattern in full | Ambiguous selection between equal-precedence versions |

**Why this is yours:** it decides which version strings the registry accepts.

Accepted cost: the renumbering note; proxied revisions keep whatever the upstream publishes.

### Resolved: release-list pagination (was Q7)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a request without `limit`
receives the whole release list in one page; explicit limits are honoured up to 100 (Design,
"Release lists"; AC4).

**Recommendation:** A. Neither client sends `limit` (captured), so resolution reads one snapshot in
one request and a concurrent publish cannot shift an offset under it; the module tool follows `next`
correctly when a client does page.

| Option | You get | It costs |
|---|---|---|
| **A. Whole list by default** | Single-snapshot resolution; fewer requests | Large responses for modules with long histories, bounded by the module's size |
| **B. The Forge's default of 20** | Byte-likeness to the Forge | Resolution across several snapshots when a publish lands mid-resolution |

**Why this is yours:** it trades a protocol default for consistency under concurrent writes.

Accepted cost: the exception-list entry.

### Resolved: the addressed object of a publish (was Q8)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a multipart publish whose
`file` part names its filename before the bytes reports `{owner}/{name}/{version}` from it; any other
publish reports none (Design, "Addressed objects and pattern scopes"; AC15).

**Recommendation:** A. It is `pypi.md`'s and `ansible-collections.md`'s fail-safe rule:
puppet-blacksmith's part header precedes the bytes (captured), and ingest refuses a disagreeing
tarball, while PDK's JSON body hides the name inside base64.

| Option | You get | It costs |
|---|---|---|
| **A. Filename when first, else none** | Patterned `push` works for puppet-blacksmith; fails safe otherwise | PDK publishes need an unpatterned `push` |
| **B. Buffer and parse every body before authorizing** | Patterned `push` for PDK too | Spooling unauthorized uploads, which the precedent refuses |

**Why this is yours:** it decides which publishers a narrowly scoped token supports.

Accepted cost: the operator note for PDK users.

### Resolved: gated upstream modules (was Q9)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: gated files are fetched only
with a remote's Forge API key, answered `403` naming the gate without one, and never served from a
repository with anonymous read enabled (Design, "Gated upstream modules"; AC20).

**Recommendation:** A. The live Forge gates 12 of Puppet's 221 modules per module (captured); a
registry that serves them anonymously would republish licensed content, and one that answers `401`
would make every client blame its own credential.

| Option | You get | It costs |
|---|---|---|
| **A. Credentialed fetch, explicit `403`, no anonymous serving** | Entitled organisations can cache gated modules; no accidental republication | Gated modules need a key and a non-anonymous repository |
| **B. Pass the upstream's `401` through** | No special handling | Clients report their own credential as wrong |
| **C. Never proxy gated modules** | No licensing exposure at all | Entitled customers cannot cache what they paid for |

**Why this is yours:** it sets how the registry treats a vendor's licensed content.

Accepted cost: the operator documentation states the entitlement obligation.

### Resolved: rendering a policy refusal (was Q10)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: `403` on the file route with
the reason in the Forge body's `message` and `errors`; the list, module and release documents keep
the release (Design, "Policy refusals on the wire"; AC16).

**Recommendation:** A. The module tool prints only `message` and r10k only `errors` (captured), so
the reason must be in both; refusing at the file keeps the documents truthful and reaches r10k with
its reason, which a refused release document would not (captured on the module route).

| Option | You get | It costs |
|---|---|---|
| **A. `403` on the file, documents unchanged** | Every client shows the reason; no silent downgrade | A client resolves a refused release before learning it is refused |
| **B. Elide refused releases from the documents** | The module tool picks an allowed release | Silent downgrades when a policy changes; r10k pins fail as "does not exist" |

**Why this is yours:** it trades an early refusal against a truthful one.

Accepted cost: none beyond the resolution step.

### Resolved: virtual repositories (was Q11)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: resolution per module in
member order, the first member holding the module supplying all of it (Design, "Virtual
repositories"; AC23).

**Recommendation:** A. Each client names one Forge (captured), so a virtual repository is the only
way to combine private and public modules, and first-member-per-module stops a public squatter's
releases being merged into a private module.

| Option | You get | It costs |
|---|---|---|
| **A. First member per module** | Private modules shadow public ones; no mixed release lists | A module split across members serves only the first member's releases |
| **B. Merge release lists across members** | Every version from every member | A public release outranking a private one of the same name |

**Why this is yours:** it decides how private and public modules of one name combine.

Accepted cost: the shadowing rule in the operator documentation.

### Resolved: advisory binding and the Forge's malware scan (was Q12)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: advisory-dependent rules are
refused at configuration; `malware_scan` is recorded and alerted, never a condemnation (Design,
"Signing, provenance and policy"; AC21, AC22).

**Recommendation:** A. OSV has no Puppet ecosystem (captured), so an advisory rule would bind
nothing; and a VirusTotal analysis attached to content the Forge still serves is not the explicit
removal signal the shared security-signal rule condemns on.

| Option | You get | It costs |
|---|---|---|
| **A. Refuse advisory rules; record scans** | No rule that silently binds nothing; scan results reach the operator | No vulnerability policy for Puppet until a feed exists |
| **B. Treat a positive scan as a security signal** | Automatic purge on a scan hit | Third-party scanner false positives purge content fleet-wide |

**Why this is yours:** it states plainly that Puppet vulnerability policy is not offered yet.

Accepted cost: recorded for `supply-chain-policy.md`.

### Resolved: what a proxied module serves (was Q13)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the unit of metadata caching
is a module revision (the module document plus the full release list), and every client query is
answered locally from it (Design, "The proxied path"; AC17, AC19).

**Recommendation:** A. The clients' query strings differ (captured), so forwarding them caches one
entry per string and multiplies upstream traffic, while a revision answers all of them from one
fetch and lets withdrawn releases stay resolvable for r10k.

| Option | You get | It costs |
|---|---|---|
| **A. Module revisions** | One upstream fetch per module per TTL; consistent answers across routes | The whole list is fetched even for one release document |
| **B. Forward and cache each query** | Upstream bytes verbatim | Cache entries per query string; module and list answers from different upstream moments |

**Why this is yours:** it sets the proxied path's upstream load and consistency.

Accepted cost: full-list fetches for large modules.

### Resolved: forgeapi.puppet.com as a preconfigured upstream (was Q14)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: not preconfigured; the
operator documentation gives the one-line remote (Design, "The proxied path").

**Recommendation:** A. `proxy-cache.md` AC19 names the four preconfigured formats and the nightly
real-upstream job covers them; adding a Tier 3 format there is a change to that spec, not this one.

| Option | You get | It costs |
|---|---|---|
| **A. User-configured** | No change to the shared preconfigured set | A configuration step for Puppet users |
| **B. Preconfigure the Forge** | Zero-configuration caching | A change to `proxy-cache.md`'s criterion and nightly job |

**Why this is yours:** it sets the first-run behaviour for Puppet users.

Accepted cost: the configuration step.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | 409d44e | authoring pass: grounded first draft, not a review | Grounded four ways: captured traffic from Puppet 7.20.0 and OpenVox 8.28.1 (`puppet module install`, `upgrade`) and r10k 5.0.3, each from its upstream image pinned by digest, plus puppet-blacksmith 9.1.0's and PDK 3.4.0's publish code paths, on dedicated Podman networks against a logging Forge API v3 stub over HTTP and TLS (the module tool's list-driven resolution with `sort_by=version` and `exclude_fields` excluding `module`, r10k's module-then-release-then-file reads with `current_release` for `:latest`, base-relative `file_uri` and `next` required under a path prefix, SHA-256 and MD5 verification on all three, prerelease selection, case sensitivity against a folding server, deprecation invisible to the module tool unless `module` is kept, soft-deleted releases unresolvable by the module tool and installed by r10k, rollback followed by r10k and ignored by the module tool, every credential form and cross-host redirects dropping it, error rendering and no retries, no fallback, symlinks and `..` paths, puppet-blacksmith's multipart publish under a path and PDK's JSON publish to the host root); the installed client and publisher sources; the Forge's OpenAPI document; the live forgeapi.puppet.com (soft deletion, gated `premium` and `login_required` modules answering `401`, `exclude_fields`, conditional answers, owner-case folding, not-found shapes, `malware_scan`, all three clients run against it); and OSV and purl (no Puppet ecosystem or type). Fourteen questions written in decision shape and adopted under the standing delegation: PDK via host binding (AC8), soft withdrawal plus hard delete (AC11, AC12), `module` kept for deprecation (AC10), Forge management routes as bindings (AC10, AC11), exact names with case-colliding owners refused (AC9), SemVer without build metadata (AC7), whole-list pages (AC4), publish object from the multipart filename (AC15), gated upstream modules (AC20), `403` on the file route (AC16), per-module virtual resolution (AC23), advisory rules refused and scans recorded (AC21, AC22), module revisions as the proxied unit (AC17, AC19), no preconfigured upstream. Twenty-six criteria, each with a Test Plan row. Stays draft; awaits an independent review. |
