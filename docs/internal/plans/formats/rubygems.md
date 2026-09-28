---
status: draft
status_description: "Authored 2026-09-28 at a3a9d78 on Opus as a grounded first draft, not a review: captured from RubyGems and Bundler 4.0.20, 3.5.22 and 3.4.19 in containers against a geminabox 4.0.1 reference behind a logging proxy, from rubygems.org sampled live, and from rubygems.org's own source. Twelve questions written in decision shape and adopted under the owner's standing delegation (yank is delete-version, the hosted /versions is an uncompacted segment log, the ETag is the body's MD5, Marshal is written never parsed into objects, download objects resolve through the served index, /info freshness is keyed on the /versions line, virtual supported with an appending merge, attestations verified on both paths, owners and signin refused, rubygems.org user-configured, gem push binds onto publish, refusals bind on byte routes); none open. 32 criteria, each with a Test Plan row. Awaits a /spec review pass and a Fable recheck."
description: "Spec for the RubyGems format: the compact index (/versions, /info, /names) with its append-only, Range-fetched versions file, the legacy Marshal index, gem push and gem yank, hosted and proxied, with gem and bundle as the conformance oracle across three client generations."
author: michielvha
goal: "Serve Ruby teams a private gem server and a rubygems.org cache from one handler that every supported gem and bundle generation installs from incrementally, without ever parsing untrusted Marshal into objects."
priority: "medium"
issue: 54
created: 2026-09-26
fable_recheck: "authored on Opus 5.5 2026-09-28 with twelve questions adopted under the standing delegation; never Fable-reviewed"
covers:
  - "internal/format/rubygems/**"
  - "conformance/rubygems/**"
---

# Plan: RubyGems format

The RubyGems compact index and legacy index, `gem push` and `gem yank`, hosted and proxied, with
`gem` and `bundle` as the oracle for every read and for both client-driven writes.

## Context

RubyGems sits in Tier 2 of `formats/catalogue.md` under its own single-member family ("RubyGems
compact index"). **Its build is gated**: `project-charter.md` AC9 forbids Tier 2 handler code on
`main` before an owner-recorded `continue` verdict, and `catalogue.md` AC5 forbids it until every
Tier 1 format is complete and the verdict is in the experiment log. This spec exists now because
the owner directed that every catalogue ecosystem be specced up front ("Speccing is not gated;
building is", the charter), not to pull the format forward. It is the 33rd format specced and the
last (`docs/internal/HANDOFF.md`).

Three properties make this format worth its own design rather than a port of Cargo's:

- **The versions file is an append-only log clients fetch by byte offset.** Bundler keeps a local
  copy of `/versions` and of every `/info/{gem}` it has read, and refreshes each with `Range:
  bytes={local size - 1}-` plus `If-None-Match`, appending what arrives and checking the whole
  result against a digest header. A server whose document is not a byte extension of what the
  client holds makes every client pay an extra round trip, and a server that gets the validators
  wrong silently demotes the oldest supported generation to a legacy code path. The proxy must
  keep this property against a 24 MB upstream file that is appended all month and rewritten on
  the first of each month.
- **The legacy index is Ruby `Marshal`.** `specs.4.8.gz`, its two siblings and every
  `quick/Marshal.4.8/*.gemspec.rz` are Marshal streams, and `gem install` fetches the quick spec
  on every generation even when the compact index is available (captured). RubyGems 3.4.19 loads
  them with plain `Marshal.load` (its `source.rb`), which instantiates arbitrary classes; 3.5 and
  later use `Gem::SafeMarshal` with a class allowlist. A registry serving these documents is on
  the deserialisation path of every old client, and a registry that parses them is on its own.
- **`gem yank` is a deletion, not a withdrawal.** Unlike Cargo's and PyPI's yank, a RubyGems yank
  removes the version from the index for everyone, removes its file from storage, breaks every
  lockfile that pins it and forbids the coordinate's reuse (rubygems.org's `Deletion` model and
  `Pusher`, captured; Bundler's "the author of zzbar (1.2.0) has removed it", captured). The name
  is shared; the effect is not.

Grounding for this draft, stated up front because the constitution asks for evidence or silence:

- **Captured client traffic.** Ruby is not installed on this host (`which gem bundle` finds
  nothing), so three pinned client generations ran in containers against a logging reverse proxy
  (`/tmp/gemcap/logproxy.py`, which also crafted bodies, validators, statuses and challenges on
  demand) in front of a geminabox 4.0.1 reference server with `compact_index` 0.15.0: RubyGems
  4.0.20 and Bundler 4.0.20 on Ruby 4.0.7 (`ruby:latest`,
  `sha256:6fbb66820141be4399d81f3c8109fd07edb87ee2f4a07b06644d6a50e7b09f04`); RubyGems 3.5.22 and
  Bundler 2.5.22 on Ruby 3.3.12 (`ruby:3.3`,
  `sha256:7930e42c707772b6079924702c806a14792bb2916ad3802083cc80fd27cad688`); RubyGems 3.4.19 and
  Bundler 2.4.19 on Ruby 3.2.11 (`ruby:3.2`,
  `sha256:bc043730565f2c8a6a5cb1ba9ce9085b27683b10917b4ac77146691aa2a0d16a`). A previous stopped
  run had captured `gem push` from 4.0.20 and 3.5.22 against gemstash 2.8.2, which also showed
  gemstash answering `/names` with `403 Not yet supported`; that capture was reused. Every row of
  the wire table was observed on the generations it names.
- **The published contract.** The RubyGems compact index specification
  (guides.rubygems.org/rubygems-org-compact-index-api) and the rubygems.org API reference
  (guides.rubygems.org/rubygems-org-api), both fetched this run; the client source copied out of
  each pinned image (Bundler's `CompactIndexClient`, its `Updater`, `CacheFile`, `Parser`,
  `Fetcher::Downloader` and `Fetcher::CompactIndex`; RubyGems' `Gem::Source`, `Gem::SafeMarshal`,
  `Gem::Specification#_dump`, `Gem::RemoteFetcher#cache_update_path`, `Gem::GemcutterUtilities`
  and the push, yank and owner commands); and rubygems.org's own server source for the rules
  the public registry enforces (`Pusher`, `Deletion`, `Api::V1::DeletionsController`,
  `Rubygem`, `Patterns`, extracted this run).
- **The live upstream.** `index.rubygems.org` and `rubygems.org` sampled directly on 2026-09-28:
  `/versions` at 23,860,466 bytes with `created_at: 2026-09-01T00:00:04Z` and 215,108 lines,
  `/info/rack`, `/names`, the three legacy index files, a quick spec, a `.gem`, a `206` for a
  ranged `/versions`, a `304` on `If-None-Match`, the answer to an unsatisfiable range, a `404` for
  a missing gem, `404` for `/api/v1/dependencies`, and the attestation route.

Where a contract is unpublished the design says so and names what it was grounded against. The
recorded corpus re-grounds every row when the conformance cases are written, and the corpus wins
any disagreement.

## Blocking preconditions

**The breadth gate decides whether this format is built at all** (`project-charter.md` AC9,
`catalogue.md` AC5; after a `shrink` verdict this spec is `parked`). **The handler interface
re-open must complete first** (`format-handler-interface.md` AC8), as for every Tier 1 and Tier 2
handler, and this spec brings it one input (Design, "Addressed objects and pattern scopes": a
`Scope(r)` that resolves a download filename through the served index).

Shared services this format needs, each cited by the build step the charter gives it:

- The management surface core (charter step 2, full at step 9) and
  `docs/internal/plans/foundation/management-api.md` reaching `planned` before Phase 2's
  bindings: `gem push` binds onto `publish` and `gem yank` onto `delete-version`.
- The upstream adapters (charter step 4, `upstream-adapters.md`), for the proxied path's ranged
  revalidation.
- Artifact verification (charter step 4b, `artifact-verification.md`), for the Sigstore
  attestations `gem push --attestation` carries.
- The shared signing and generated-index service (charter step 7, `signing-service.md`), whose
  index half generates every hosted document and whose serving door serves every document this
  format has. This format is an **unsigned consumer**: it uses the index half and no key.

## Scope

**In scope:**

- The compact index: `/versions` with its append-only log semantics, `Range` refreshes and
  representation digest; `/info/{gem}`; `/names`.
- The legacy index: `specs.4.8.gz`, `latest_specs.4.8.gz`, `prerelease_specs.4.8.gz` and
  `quick/Marshal.4.8/{full_name}.gemspec.rz`, generated by a restricted Marshal writer on the
  hosted path and passed through a Marshal allowlist verifier on the proxied path.
- Gem downloads at `/gems/{full_name}.gem`.
- The two client-driven writes, as bindings onto the management API: `gem push` (`POST
  /api/v1/gems`, including the multipart form 4.0.20 sends with `--attestation`) and `gem yank`
  (`DELETE /api/v1/gems/yank`); `delete-package` through the management API alone.
- The probe each client generation makes before choosing an index: RubyGems 3.4.19's `HEAD` on the
  source root and 3.5.22's and 4.0.20's `HEAD /versions`.
- Authentication in the forms the clients send: preemptive Basic on reads from Bundler's
  credential configuration or URL userinfo, and the scheme-less API key on writes.
- Name rules: case-insensitive uniqueness, case-sensitive serving, the character set rubygems.org
  enforces, and platform gems as distinct versions.
- The proxied path against a compact-index upstream (rubygems.org or a private gem server),
  including ranged revalidation, `/info` freshness keyed on the `/versions` line, RubyGems' rows
  of the upstream-removal table, the Bundler mirror recipe, and a legacy-only upstream served
  through the clients' own fallback.
- Sigstore attestations: verified on push and re-hosted from upstream, served at the rubygems.org
  route.
- The write-boundary declaration `data-model.md` requires, the addressed-object table
  `auth.md` requires, the policy-refusal rendering `supply-chain-policy.md` requires, and
  `Capabilities()` with rename and virtual aggregation.

**Out of scope for v1**, each with its reason:

- **The dependency API** (`/api/v1/dependencies`). rubygems.org answers it `404` (captured
  2026-09-28), so no client in the matrix depends on it: every pinned generation probes it only
  on the way to the legacy index, and falls through a `404` to `specs.4.8.gz` (captured on all
  three). Serving it would be a third resolution surface with no public reference to replay.
- **`ruby_abi` coordinates.** rubygems.org's content-addressable pushes carry a `ruby_abi` behind
  a feature flag (`Pusher#find`, `FeatureFlag::CONTENT_ADDRESSABLE_GEM_PUSHES`), but no pinned
  client sends it: `gem yank` posts `gem_name`, `version` and optional `platform` only (captured
  body `gem_name=zzbar&version=1.1.0`), so a claim in the matrix would have no oracle.
- **Owners, `gem signin` and API key minting** (`/api/v1/gems/{name}/owners*`,
  `/api/v1/api_key`). Refused with the reason in the body (the resolved owners-and-signin
  decision below, was Q9): per-gem ownership is authorization evaluated in a handler, which the
  constitution forbids, and a signin route would be a second path that mints registry tokens
  beside `credential-management.md`'s.
- **Unyank.** No pinned client has one (`gem yank` has no `--undo`, captured in the 3.4.19 and
  4.0.20 sources), rubygems.org's `Deletion#restore!` is support-only, and a yank retires its
  coordinate (the resolved yank-kind decision below, was Q1), so there is nothing to restore into.
- **The gem's own X.509 signatures** (`gem cert`, the `.sig` entries inside a `.gem`). The trust
  decision is the installing user's (`gem install -P HighSecurity` against certificates they
  added), so there is no verification entry to ask of `artifact-verification.md`; the registry's
  whole duty is never to alter a `.gem`'s bytes, which AC27 asserts through both paths.
- **The crates-style search and web surfaces** (`/api/v1/search.json`, `/api/v1/gems/{name}.json`,
  `/api/v1/versions/*`). `gem search -r` reads `latest_specs.4.8.gz` (captured), not the JSON API,
  so no pinned client command consumes them.

## Design

### The wire surface, as captured

| Surface | Shape, as the pinned clients send and read it |
|---|---|
| Index probe | RubyGems 3.4.19 sends `HEAD {source}/` and uses the compact index when it answers `2xx`; 3.5.22 and 4.0.20 send `HEAD {source}/versions` (`Gem::Source#dependency_resolver_set` in 3.4.19 against `new_dependency_resolver_set` in 4.0.20, and captured on all three). Any failure, `401` included, selects the legacy index (captured: an unauthenticated `HEAD /versions` answered `401` was followed by `GET /specs.4.8.gz`). Bundler probes nothing: it fetches `/versions` directly |
| `/versions` | `created_at: {time}\n---\n` then one line per event, `{name} {v}[,{v}...] {md5}`, a `-` before a version removing it, the last MD5 for a name naming its current `/info` file (the specification; the live file's tail shows `cosby -0.0.1 bcbd...` style removal lines). Bundler fetches it whole the first time (`Accept-Encoding: gzip;q=1.0,deflate;q=0.6,identity;q=0.3`, added by `Net::HTTP` because no `Range` is set) and afterwards with `Range: bytes={size - 1}-` and `If-None-Match: "{etag}"` and no `Accept-Encoding` (captured on 2.5.22 and 4.0.20; `Net::HTTP` adds none when `Range` is present) |
| `/info/{gem}` | `---\n` then one line per version, `{version}[-{platform}] {dep}:{req}[&{req}],...\|checksum:{sha256 hex},ruby:{req},rubygems:{req}[,created_at:{time}]`. Fetched by Bundler only for names it needs, only when its cached file's MD5 differs from the `/versions` line, with the same `Range` refresh; fetched whole and unconditionally by `gem install` (captured). The path segment is the name exactly as spelled: `/info/ZzCase` and `/info/zzcase` are different documents (captured `404` for `zzcase` when `ZzCase` is registered) |
| `/names` | `---\n` then one name per line. No pinned client requested it in any captured flow |
| Legacy index | `specs.4.8.gz`, `prerelease_specs.4.8.gz` (the Bundler fallback, captured on all three after `/versions` and `/api/v1/dependencies` answered `404`), `latest_specs.4.8.gz` (`gem search -r`, and `gem install`'s "Possible alternatives" after an `/info` `404`, captured). RubyGems sends `If-Modified-Since` set to **its own local file's modification time**, not a served value (`Gem::RemoteFetcher#cache_update_path`; captured `If-Modified-Since: 14:25:06` against a served `Last-Modified: 14:23:35`) |
| Quick spec | `GET quick/Marshal.4.8/{name}-{version}[-{platform}].gemspec.rz`, a zlib-deflated Marshal of `Gem::Specification#_dump`'s array. Fetched by `gem install` for every resolved gem on all three generations, even with the compact index in use (captured), and by Bundler 2.4.19 on its legacy path |
| Gem download | `GET gems/{name}-{version}[-{platform}].gem`, the credential sent preemptively where one is configured (captured). Bundler downloads through Bundler's own user agent on 2.5.22 and 4.0.20 and through RubyGems' on 2.4.19 (captured `User-Agent: Ruby, RubyGems/3.4.19`) |
| Push | `POST {host}/api/v1/gems`, `Content-Type: application/octet-stream`, `Authorization: {api key}` with no scheme, the `.gem` as the body, whose first tar entry is `metadata.gz` on every captured push. With `--attestation` (4.0.20 only), `multipart/form-data` with a `gem` part and an `attestations` part holding a JSON array of Sigstore bundles (`push_command.rb`). The client prints the response body and exits `0` on `2xx`, `1` otherwise (captured on 4.0.20 and 3.4.19) |
| Yank | `DELETE {host}/api/v1/gems/yank`, `application/x-www-form-urlencoded` body `gem_name`, `version` and optional `platform`, same key and output rules (captured) |
| Path prefixes | Every client keeps a source's or host's path: `/rubygems/r1/versions`, `HEAD /rubygems/r1/`, `POST /rubygems/r1/api/v1/gems` (captured on 4.0.20 and 3.4.19), so the format-first mount needs no carve-out |
| Errors | Bundler maps `401` to "Please supply credentials for this source" (exit 17), `403` to a forbidden error, `404` to a fallback to the next index, `416` to a retry without `Range`, `429` to a slow-down (`Fetcher::Downloader#fetch`). `gem` prints the reason phrase and URL of a failed download, never the body (captured) |

### The versions file is a log, and two validators make it one

What each generation checks when it appends, read in the source and then provoked on the wire:

- **Bundler 2.5.22 and 4.0.20 verify the representation digest.** After a `206` they drop the
  one overlapping byte, append the rest, and compare the SHA-256 of the whole local file with
  `Repr-Digest` (or `Digest`) (`CacheFile#append`, `Updater#append`). On a mismatch they
  discard the append and fetch the whole document without `Range` (`append || replace`). With no
  digest header at all they never append: every refresh of a changed document is a whole fetch
  ("appending is too error prone to do without digests"). Captured: a crafted non-prefix body
  served as `206` drew a second, unranged request on both, and resolution succeeded.
- **Bundler 2.4.19 verifies the `ETag` as the body's MD5.** It compares the quoted lowercase MD5
  of the local file with the response `ETag` after every fetch, retries once unranged, and on a
  second disagreement gives up on the compact index (`Updater#update`). Captured: an opaque
  `ETag` on `/versions` sent 2.4.19 straight to `GET /api/v1/dependencies`, which against a
  registry that does not serve it means the Marshal legacy index. A wrong `ETag` is therefore
  invisible to 2.5 and 4.0 and a silent downgrade to the least safe code path on 2.4.
- **An unsatisfiable range is retried whole.** 4.0.20 answered `416` repeated the request without
  `Range` and with its `If-None-Match` (captured), which drew the `200`. rubygems.org answers an
  unsatisfiable range with `200` and the whole body instead (captured), which the clients also
  accept.
- **Every live server agrees on the validators.** rubygems.org's `ETag` for `/versions` and
  `/info/rack` is the MD5 of the body (`md5sum` of `/info/rack` equals its `ETag`, captured), and
  it sends `Repr-Digest` with the SHA-256 of the whole file on `200` and `206` alike, in a quoted
  form (`sha-256="..."`) Bundler accepts beside the RFC 9530 byte-sequence form geminabox sends
  (`sha-256=:...:`, which all three accepted). Neither ever compresses these documents: with
  `Accept-Encoding: gzip` rubygems.org still answers identity (captured), which matters because a
  range over a compressed representation is a range over bytes the client never stored.

The rules this format therefore imposes on every compact index document it serves, on every path
(the resolved validator decision below, was Q3): the `ETag` is the quoted lowercase hex MD5 of the
whole identity body; `Repr-Digest: sha-256=:{base64}:` over the whole identity body on `200` and
`206`; a single `bytes={n}-` range answered `206` with `Content-Range`; an unsatisfiable range
answered `416`; `If-None-Match` equal to the current `ETag` answered `304`; no `Content-Encoding`
ever. The handler sets none of these itself: the freshness boundary forbids a handler to set
`ETag` or read a conditional header (`signing-service.md` AC11), so they are serve policy the
door applies (`signing-service.md`, "Serving: one door for every validator"), and this format needs
two things of that policy it does not yet carry, a consequence recorded in the report: an `ETag`
derivation "MD5 of the identity body", and a `Repr-Digest` emission over the whole representation.
Both are computed at generation or adoption time and stored with the document, never per request.

### Mapping onto the shared model

The levels are exactly those `data-model.md` provides; no table is added.

- **A `Package` is a gem.** `Package.name` holds the **folded key**, the name lowercased, which is
  what uniqueness is enforced on (rubygems.org validates names `uniqueness: { case_sensitive:
  false }`, captured in `Rubygem`). The **registered spelling** (`ZzCase`) is in the package-level
  document and is what every index line and path carries. A request whose name, compared exactly,
  is not the registered spelling answers `404` even when it folds to the same key, which is what
  both clients expect: Bundler looks names up exactly in `/versions` and never requests the other
  spelling, and `gem install zzcase` requests `/info/zzcase`, gets `404` and prints "Possible
  alternatives: ZzCase" from `latest_specs` (captured).
- **A `Version` is one RubyGems version entry**, the version number plus its platform, spelled as
  the index spells it: `1.1.0` for the `ruby` platform and `1.1.0-x86_64-linux` otherwise. This is
  RubyGems' own unit: each platform build has its own `/info` line, quick spec, `.gem`, lockfile
  entry and yank (`gem yank --platform`, captured, and rubygems.org's `Version` keyed by number and
  platform). The version-level document holds the number and platform separately, the runtime
  dependencies, `required_ruby_version`, `required_rubygems_version`, the descriptive fields
  `Gem::Specification#_dump` needs, the publish time, and the Sigstore verdict references.
- **A `File` is the `.gem`**, one per version, its `Blob` keyed by the CAS SHA-256, which is exactly
  the value the `/info` line advertises as `checksum:` and the value Bundler 4.0.20 writes into the
  lockfile's `CHECKSUMS` section (captured `zzbar (1.2.0) sha256=ec56d2...`), so one digest binds
  the CAS, the index and every lockfile. The CAS computes it from the received bytes; the index
  never advertises a digest the store did not verify.
- **Generated documents, all snapshot content**, produced by this format's generator package
  `internal/format/rubygems/index` inside the write that invalidates them (`signing-service.md`,
  "The write path dispatches"; `data-model.md` AC37's pre-commit hook), none signed:

  | Document key | Level | Changes when |
  |---|---|---|
  | `versions` | repository | every write, by appending one segment |
  | `names` | repository | a name gains its first or loses its last served version |
  | `specs.4.8.gz`, `latest_specs.4.8.gz`, `prerelease_specs.4.8.gz` | repository | every write that adds or removes a version |
  | `info` | package | every write touching the gem |
  | `quick` | version | the version's publish |

  The `versions` document **consists of declared blobs**: its repository-level manifest names one
  segment blob per write in order, with the running byte length and the MD5 and SHA-256 states of
  the stream after the last segment, so each write hashes only what it appends. `hackage.md`'s
  append-only index is the model, and `data-model.md`'s declared blob-digest list is the mechanism
  (its "Declared blob digests on a document"): the generator's `Generate` returns the segment
  digests beside the document (`signing-service.md`, "The generator contract").
- **What keeps what alive.** The declared segment list on the `versions` document is that
  document's only keep-alive (`storage-and-gc.md` AC16, the fourth root's third reach). Every
  digest the documents merely **mention** keeps nothing alive (`data-model.md` AC34): the MD5s
  inside `/versions` lines, the SHA-256 `checksum:` inside `/info` lines. A `.gem` is kept by its
  `File` row, the first root, and nothing else.

Rendering rules the generator follows, from the specification and the geminabox and rubygems.org
captures:

- `/info` lists the non-removed versions in publish order, each line appended at publish, so a
  publish extends the document byte for byte. Dependencies are the runtime ones only, sorted by
  name, each requirement list rendered as `compact_index` 0.15.0 renders it (captured
  `zzbar:~> 1.0,zzbaz:< 2&>= 0.1`); `ruby:` and `rubygems:` are omitted when the requirement is
  `>= 0`; `created_at:` is the publish time, as the live file carries it.
- `/versions` gains one segment per write: a publish appends `{name} {version} {md5 of the new
  /info}`; a `delete-version` appends `{name} -{version} {md5 of the rewritten /info}`; a
  `delete-package` appends one removal line naming every removed version. No event rewrites
  earlier bytes.
- `specs.4.8.gz` holds `[name, Gem::Version, platform]` for every released version, prerelease
  versions (a letter in the number, `Gem::Version#prerelease?`) go to `prerelease_specs.4.8.gz`,
  and `latest_specs.4.8.gz` holds the highest released version per name and platform.
- A quick spec is the Marshal of the eighteen-element array `Gem::Specification#_dump` builds, from
  the abbreviated specification (`Gem::Specification#abbreviate`: no file lists, no certificate
  chain), zlib-deflated.

### Marshal: written, never parsed into objects

Per the resolved Marshal decision below (was Q4), this registry never turns a Marshal stream into
objects anywhere:

- **Hosted, it only writes.** The publish path reads `metadata.gz`, which is YAML, not Marshal
  (captured: `--- !ruby/object:Gem::Specification` with `Gem::Version`, `Gem::Requirement` and
  `Gem::Dependency` tags). The YAML is decoded by a restricted reader that admits exactly those
  four tags and plain scalars, sequences and maps, and refuses aliases and anchors (rubygems.org
  refuses aliases too, `Pusher#notify_yaml_alias_error`). The generator's Marshal **writer**
  emits only the classes RubyGems' `Gem::SafeMarshal` permits (`Gem::Specification`,
  `Gem::Version`, `Gem::Requirement`, `Gem::Dependency`, `Gem::Platform`, `Time`, plus core
  strings, symbols, arrays and hashes), from values the YAML reader typed. What the registry emits
  is therefore loadable by 3.5's and 4.0's allowlist and safe under 3.4's plain `Marshal.load`,
  because nothing an uploader controls selects a class.
- **Proxied, it only verifies.** An upstream Marshal document (a legacy index file or a quick
  spec) is passed through byte for byte, but only after a **structural allowlist walk** over the
  complete body: a bounded reader of the Marshal 4.8 stream that visits every value, refuses any
  class, symbol or instance variable outside `Gem::SafeMarshal`'s `PERMITTED_CLASSES`,
  `PERMITTED_SYMBOLS` and `PERMITTED_IVARS` (captured from the 4.0.20 source), refuses a depth or
  size beyond a bound, and returns nothing but pass or the rule it broke. For a quick spec the walk
  also checks that the embedded name, version and platform equal the requested filename's. The
  walk is the handler's post-receipt verifier for quick specs (`proxy-cache.md`'s completion-only
  mode, since no index carries a digest for them) and part of the adoption check for the three
  index files. A refusal is the "Integrity failure at fetch" class: nothing committed, the
  previous revision keeps serving, the operator alerted, no negative entry. The point is the
  3.4.19 client, which would `Marshal.load` whatever the upstream sent.

### The hosted publish path and what counts as a write

`gem push` is a **binding onto the `publish` kind** of
`docs/internal/plans/foundation/management-api.md` (the resolved publish-binding decision below,
was Q11), declared through the handler's optional `Operator` interface (`Operations()` and
`Bindings()`, that spec's "Dispatch"), as `hackage.md` binds `cabal upload` and `debian.md` binds
dput. The route streams the `.gem` (or the multipart `gem` part) into the CAS as an upload
session's bytes, constructs the `publish` operation with the committed digest and the coordinate
read from `metadata.gz`, and submits it through `Submit`, the entry point the API's own publish
uses, so the two produce byte-identical documents and snapshot deltas (`management-api.md` AC8).
The API's publish is the second way in: an upload session plus the operation, for a publisher
without the `gem` client.

What `Apply` enforces, each refusal committing nothing and rendered as a `text/plain` body `gem`
prints:

- **The archive**: a tar whose entries are `metadata.gz`, `data.tar.gz`, optionally
  `checksums.yaml.gz` and `.sig` files, nothing else; `checksums.yaml.gz`, where present, must
  name the SHA-256 of `metadata.gz` and `data.tar.gz` as they arrived (captured shape).
  `data.tar.gz` is stored, never unpacked: installing it is the client's.
- **Identity**: `name`, `version` and `platform` from the YAML; the name in the grammar below; the
  version matching `Gem::Version::VERSION_PATTERN`; the platform `ruby` or a `Gem::Platform`
  triple (rubygems.org refuses "malformed platform attributes" with `409`, `Pusher#validate`).
- **Coordinates bind one set of bytes for the life of the repository**, which is rubygems.org's
  rule in `Pusher#find`: identical bytes at an existing version answer `200` "Gem was already
  pushed" and create no snapshot (the unchanged publish of `management-api.md`, its resolved
  unchanged-publish decision, was Q15, which this format declares); different bytes answer `409`
  "Repushing of gem versions is not allowed"; a yanked or deleted version answers `409` whatever
  the bytes, refused centrally as `retired` before `Apply` runs (`management-api.md` AC12,
  `data-model.md` AC35). Captured on geminabox: the identical push answered `200` and exited `0`,
  the changed one `409` and exited `1`, both printing the body, on 4.0.20 and 3.4.19.
- **Names**: the character set rubygems.org's `Patterns::NAME_PATTERN` declares (ASCII letters,
  digits, `.`, `-`, `_`), at least one letter (`Patterns::LETTER_REGEXP`), no leading `.`, `-` or
  `_` (`Patterns::SPECIAL_CHAR_PREFIX_REGEXP`), no banned extension suffix
  (`Patterns::BANNED_EXTENSIONS`), refused `422` naming the rule. A new name that folds to an
  existing gem's key is refused `409` naming the registered spelling. Hyphen and underscore are
  **not** folded: `zz-sep` and `zz_sep` coexist, as they do on rubygems.org and geminabox
  (captured push of both), because neither client requests a separator permutation, so the
  shadowing Cargo guards against does not arise here.
- **Filename uniqueness**: a publish whose `{name}-{version}[-{platform}]` equals an existing
  gem's filename under another name is refused `409` (Design, "Addressed objects").

`data-model.md` requires each format spec to declare its write boundaries. RubyGems':

- **One push is one completed logical write and one snapshot**: the version, its `.gem`, and every
  generated document it invalidates, inside the transaction, so a client that installs the
  moment `gem push` returns sees the gem.
- **An identical republish is no write** and creates no snapshot, as above.
- **Each `delete-version` (a yank, one platform entry) and each `delete-package` is one write**,
  with the core writing the `Retirement` records in the same transaction.
- A proxied repository creates no snapshots; arrival and revalidation are cache materialisation.

Two concurrent pushes queue on the per-document lock the index runtime takes over the
`versions` manifest (`signing-service.md`, "Contention") and land as two snapshots, each segment
after the other. They are never merged into one regeneration.

The client-side trap to document, not fix: a gemspec whose metadata sets `allowed_push_host` to
another host makes `gem push` refuse locally before any request (`GemcutterUtilities#rubygems_api_request`,
source), which is how many public gems are configured.

### The management surface

A management operation has a trigger and an effect
(`docs/internal/analysis/management-surfaces-and-the-oracle.md`). Here both writes have a real
client trigger, and every effect is observed by `bundle` and `gem`:

| Operation | Kind | Client binding | Effect a client sees | Action and object |
|---|---|---|---|---|
| Publish | `publish` (unchanged publish declared) | `gem push`, `POST {base}/api/v1/gems` | `bundle install` and `gem install` resolve and install it | `push` on `{name}/{version}` |
| Yank one version entry | `delete-version`, retiring `{name}/{version}` | `gem yank [--platform]`, `DELETE {base}/api/v1/gems/yank` | the version leaves `/info` and `/versions`, its `.gem` and quick spec answer `404`, a lockfile pinning it fails, a republish is refused | `delete` on `{name}/{version}` |
| Delete a gem | `delete-package`, retiring every version | none (client-less) | every version as above; the `Package` row survives (`data-model.md` AC33) | `delete` on `{name}` |

The rules `management-api.md` fixes, applied rather than re-decided:

- **The binding has no behaviour of its own** and is **never wider than its operation** (its
  resolved binding-scope decision, was Q13): the push route's `Scope(r)` reports the object read by
  a bounded peek at the first tar entry, which `Authorize` reports too, and `Submit` evaluates
  every pair on both ways in; when the first entry is not `metadata.gz` within the bound, the
  route reports `none`, so only an unpatterned `push` passes the route while the API accepts a
  patterned one, the stricter-binding case that spec admits.
- **Claims equal objects**: a publish claims `{name}/{version}`, and a `delete-version` retires the
  same string, so the retirement check compares like with like (its resolved claimed-coordinate
  decision, was Q14).
- **Hosted only**: against a `remote` or `virtual` both bindings and the API answer `405` with
  problem type `repository-type` (its AC7), the bindings rendering it as a `text/plain` body `gem`
  prints (its resolved wire-rendering decision, was Q16).
- **The refusal is central, the rendering is the wire's.** `retired` answers `409` with
  rubygems.org's wording, "A yanked version already exists ({full_name}). Repushing of gem
  versions is not allowed. Please use a new version and retry", which `gem push` prints.
- **Two bodies the client treats as commands, never sent.** `gem` retries a `401` interactively
  when its body starts with "You have enabled multifactor authentication" (`mfa_unauthorized?`)
  and a `403` when its body starts with "The API key doesn't have access"
  (`api_key_forbidden?`, which starts an interactive sign-in and a `PUT api/v1/api_key`). A
  registry that echoed either wording would hang a CI push on a prompt; no refusal this handler
  or the shared layer writes on these routes starts with either (AC14).
- **Verification**: the trigger of `publish` and `delete-version` by the real client through the
  bindings and by this registry's integration tests through the API; `delete-package`'s trigger by
  the integration tests alone, its effect by a `script`-driven conformance case
  (`management-api.md` AC24, enforced by `conformance-harness.md` AC26).

### Freshness under pointers, and the conditional rule per document

`data-model.md` owns the pointer's freshness record (`moved_at` and the generation counter, its
AC36) and `signing-service.md` renders it. Decided here, per document, with the reason:

- **Compact index documents: the `ETag` is the freshness signal, and it is byte-derived.** No
  pinned client sends `If-Modified-Since` for `/versions`, `/info` or `/names` (captured on all
  three), so correctness rests on the MD5 `ETag` and the byte log, and the pointer record adds
  only a `Last-Modified` under the default `exact` rule for intermediaries. A generation's bytes
  are identical whichever pointer serves them, so its `ETag` is too, and a `304` means exactly
  "you hold these bytes".
- **The log survives every pointer transition.** Every snapshot's `versions` generation is a
  byte prefix of every later snapshot's, because each write appends and none rewrites
  (Mapping, above). So a write advancing the default pointer, and a promotion forward, serve an
  extension, which a warm client fetches as a `206`; a rollback, or a promotion to an older
  snapshot, serves a prefix of what a client may hold, so its `Range` start lies past the end and
  the door answers `416`, which Bundler retries unranged and receives the whole earlier
  generation (captured on 4.0.20 against a 458-byte prefix of a 686-byte cache). The client then
  resolves exactly what the earlier snapshot holds. `/info` behaves the same per gem, except that a
  yank rewrites it, which every generation absorbs with one extra whole fetch (captured). There is
  no case in which a client keeps bytes the served pointer does not hold, which is the rollback
  visibility `data-model.md`'s record exists for, reached here through the byte log rather than
  through a date.
- **Legacy index documents: `not-earlier`, from the pointer's `Last-Modified`.** RubyGems'
  condition on `specs.4.8.gz` and its siblings is its own file's modification time (captured), a
  client clock, which is `signing-service.md`'s `not-earlier` population (its resolved
  later-condition decision, was Q12, beside `homebrew.md`). Under `exact` every `gem search -r`
  would transfer the whole document again. The record's `Last-Modified` moves forward at every
  transition that changes the document, a rollback included, so a client whose file predates the
  rollback receives the body.
- **Quick specs and `.gem` files are served through `ServeFile`** (a quick spec is a stored
  document of the version, served through `ServeDocument`); neither client sends a condition for
  them (captured), so they carry the digest `ETag` and no conditional semantics matter.
- **The hosted `versions` log is never compacted in v1** (the resolved compaction decision below,
  was Q2). rubygems.org rewrites its file monthly; this registry's grows by one line per write,
  and a compaction would be a non-prefix change costing every warm client one extra whole fetch
  for no correctness gain.

### Authentication: preemptive Basic to read, a bare key to write

Captured on all three generations, and nothing here bends `auth.md`:

- **Reads carry Basic preemptively** when a credential is configured, on every request including
  the `HEAD` probe and the `.gem` download: Bundler from `bundle config set {host} user:pass`, the
  `BUNDLE_{HOST}` environment variable (`BUNDLE_127__0__0__1` for `127.0.0.1`, the name Bundler
  prints), or URL userinfo in the `source`; `gem` from userinfo in `--source`. The lockfile keeps
  the source without userinfo (captured `remote: http://127.0.0.1:8808/`). This is the universal
  Basic form (`auth.md`, "Presentation forms"), the token as the password and the username
  ignored.
- **Bundler keys a configured credential by host**, so one credential reaches every repository on
  the host. A Gemfile naming two repositories of this registry needs a token spanning both (the
  opt-in `auth.md`'s resolved two-repository decision allows) or URL userinfo per `source`, which
  keeps each token to its own repository.
- **Writes carry the API key as the whole `Authorization` value**, the scheme-less form
  (`auth.md`, "Presentation forms"), from `GEM_HOST_API_KEY` or `~/.gem/credentials` (captured
  `Authorization: testkey123`). The harness sets `GEM_HOST_API_KEY` and never runs `gem signin`.
- **A credential-less read of a private repository answers `401` with `WWW-Authenticate: Basic
  realm="..."`**, byte-identical for a private, a missing and someone else's repository
  (`auth.md` AC17's uniform challenge). No pinned client needs the challenge, since all send
  preemptively, but Bundler turns the `401` into "Please supply credentials for this source"
  and exit 17 (captured), which is the right message, where a `404` would have sent it down the
  legacy fallback path. A valid credential lacking `pull` answers `404`; a rejected one `401`,
  never anonymous (`auth.md` AC12).

### Addressed objects and pattern scopes

`auth.md`'s pattern scopes match the object each route reports (`format-handler-interface.md`
AC12). The canonical gem name is the folded key; the canonical version is the version entry
string (`1.1.0`, `1.1.0-x86_64-linux`).

| Route | Object kind | Canonical object |
|---|---|---|
| `HEAD` and `GET` on the mount root | descriptor | - (a probe; the body names nothing) |
| `/versions`, `/names`, the three legacy index files | none | - (each enumerates names) |
| `/info/{gem}` | named | `{gem}` |
| Quick spec, `.gem`, attestations | named | `{gem}/{version}`, resolved from the filename through the served index |
| Push | named | `{gem}/{version}` from the bounded peek, else none |
| Yank | named | `{gem}/{version}` from the form's `gem_name`, `version` and `platform` |
| `/api/v1/dependencies`, owners, `api_key` | none | - (answered `404` or refused before evaluation, Scope) |

**A download filename cannot be parsed without the index** (the resolved filename-resolution
decision below, was Q5). `{name}-{version}[-{platform}]` is ambiguous whenever a name ends in a
hyphen and digits: on rubygems.org 169 names are another name plus `-{digit}...`, such as `iso`
beside `iso-639` and `levenshtein` beside `levenshtein-19` (counted in the live `/versions` this
run). So the handler's `Scope(r)` resolves the filename through the index the route would serve,
the snapshot the request's pointer names on a hosted repository and the cached index on a remote,
and reports `none` when it resolves to nothing, so a patterned credential is refused exactly as
for an out-of-pattern name and an unpatterned one reaches the `404`. A `Scope(r)` that reads
repository data is a re-open input for `format-handler-interface.md`, recorded in the report.

What that gives, applying `auth.md`'s rules: `/versions` enumerates every name, so a credential
holding only a patterned `pull` is refused the first request of every Bundler run, then its
`/api/v1/dependencies` and `specs.4.8.gz` fallbacks, and installs nothing; RubyGems joins Helm,
dnf and zypper as a format whose readers need an unpatterned `pull`. Narrowing works for writes:
a CI token holding unpatterned `pull` beside `push` and `delete` patterned `acme-*/**` pushes and
yanks only `acme-` gems.

### Policy refusals on the wire

A typed refusal from the shared resolution calls answers `403` through `WriteRefusal`
(`format-handler-interface.md` AC14), with a `text/plain` body naming the policy and rule and the
status line `HTTP/1.1 403 Refused by policy: {condition}` (`supply-chain-policy.md` AC18). The
status line is what reaches the user: captured on all three generations, `bundle install` printed
"bad response Refused by policy: advisory GHSA-test 403" through four download retries and exited
`5`, and `gem install` printed the same phrase and exited `1`; neither printed the body.

**The refusal binds on the byte routes, and the indexes keep listing** (the resolved
refusal-placement decision below, was Q12). Captured on 4.0.20: a `403` on `/info/zzbaz` made
Bundler fall back silently to `/api/v1/dependencies` and then to `specs.4.8.gz`, the quick spec and
the `.gem`, and install the gem. A refusal on an index document is therefore a bypass, not a
refusal. The `.gem`, the quick spec and the attestation route refuse; `/info` and `/versions`
keep the version, so resolution selects it and stops with the phrase at download. The advisory
coordinate is the name as spelled and the version number without its platform, under RubyGems'
ordering (`supply-chain-policy.md`'s coverage table: RubyGems is covered by OSV). Whether `gem
install` with two configured sources falls back to the second after a refusal is not captured, so
RubyGems' row of that spec's binding table stays `pending` until AC22's case fills it.

### The proxied path

Classification for `proxy-cache.md`'s fetch-and-cache API, with the upstream an `https://` root
(`upstream-adapters.md` AC22):

- **`/versions` is mutable metadata revalidated by range.** The remote's current document is a
  multi-blob document like the hosted one: its segments are on the declared blob-digest list of
  the remote's repository-level document, rewritten by each adoption, the list being that
  document's only keep-alive (`proxy-cache.md`'s resolved declaring-document decision, was Q22).
  After the TTL the handler asks the adapter for `Range: bytes={N - 1}-` with the upstream's
  `ETag` as `If-None-Match` (the `Range` option `upstream.Options` carries, reported as partial or
  whole content, the `hackage.md` precedent). A `304` adopts nothing. A `206` whose tail makes a
  body whose SHA-256 equals the upstream `Repr-Digest` is adopted as the current body plus one new
  segment. Anything else (a digest mismatch, a `200`, a new `created_at`: the monthly rewrite) is
  fetched whole and verified against `Repr-Digest` before adoption, which is the "Ordinary
  metadata change" class. What clients receive is always the adopted bytes verbatim, so every
  body this remote ever served is a prefix of the next except across a rewrite, which clients
  absorb with one extra request (captured).
- **The ordering check.** The adoption check returns `(created_at, length)` as the revision's
  ordering value: an upstream body with the adopted `created_at` and fewer bytes, or an older
  `created_at`, is an upstream edge serving an older generation, the "Regression not adopted"
  class (`proxy-cache.md` AC22). The two rubygems.org hosts serve different generations at the same
  moment (captured: `specs.4.8.gz` at 6,248,620 bytes from `rubygems.org` and 6,245,377 from
  `index.rubygems.org`), so this is not hypothetical.
- **A name-to-MD5 map is derived per revision.** The adoption check reads the complete body, or on a
  ranged adoption only the appended lines merged into the previous map, and returns a map of each
  name's last MD5, kept as a blob on the same declared list while its revision is current (the
  "digests of the blobs it keeps for the revision" the adoption check returns, `proxy-cache.md`'s
  Obligation section). Retained revisions: **zero**, since no route reads a superseded
  `/versions` (`proxy-cache.md`'s resolved retained-revision decision, was Q19).
- **`/info/{gem}` is mutable metadata whose freshness is the `/versions` line** (the resolved
  info-freshness decision below, was Q6). A cached `/info` whose MD5 equals the MD5 the adopted
  `/versions` names for that gem is current by the upstream's own contract ("only the last MD5 for
  a gem name ... should be considered accurate", the specification) and is served with no upstream
  request; one whose MD5 differs is revalidated upstream, by range, before it is served, whatever
  its TTL. This needs one thing of fetch-and-cache it does not yet carry, an **expected-validator
  condition** on a metadata fetch, recorded in the report. A name absent from the map, and a
  `404`, are negatively cached with the short TTL (`gem install` requests `/info` for unknown names,
  captured).
- **`/names`** and **the three legacy index files** are mutable metadata adopted verbatim, the
  legacy files only after the Marshal allowlist walk; their served `Last-Modified` is the cache's
  `adopted_at` under `not-earlier`, the compact documents' under `exact`, never the upstream's
  (`proxy-cache.md` AC22).
- **Quick specs are immutable artifacts in completion-only mode** with the Marshal walk as the
  verifier (Design, "Marshal"), since no index carries their digest.
- **`.gem` files are immutable artifacts, stream-and-verify** against the `checksum:` of the
  `/info` line this registry served for that version entry.
- **Attestations** are fetched with the `.gem` from `/api/v1/attestations/{full_name}.json`
  (captured on rubygems.org: a JSON array of `application/vnd.dev.sigstore.bundle.v0.3+json`
  bundles, `[]` for a gem without), verified, and re-hosted (Design, "Signatures and
  attestations").
- **Every document is served through the door**: `ServeDocument` for the adopted documents with
  the cache record as freshness source and the validator rules above, `ServeFile` for cached files
  (`signing-service.md` AC11, AC30).
- **What eviction does not touch.** The current `/versions` with its segments and map, `/names`, the
  legacy files and every adopted `/info` are current documents no LRU eviction reaches
  (`proxy-cache.md`'s resolved metadata-eviction decision, was Q21): for rubygems.org roughly 24 MB
  of `/versions`, about 10 MB of map (197,479 names) and 8 MB of legacy files, plus one `/info` per
  requested gem, reported in `cache_metadata_bytes` beside the quota. Quick specs and `.gem` files
  are cached files the quota evicts.

**The upstream binding.** rubygems.org is not preconfigured (the resolved preconfigured-upstream
decision below, was Q10). The operator recipe: root `https://index.rubygems.org/`, which serves every
route this format requests with no redirect (captured `/gems/rack-3.1.0.gem`, a quick spec and
`specs.4.8.gz` at `200` from that host), so the allowlist needs no off-origin host; it is the host
Bundler itself rewrites `rubygems.org` to (`Fetcher::Base#fetch_uri`). A private gem server that
wants Basic is configured with the `basic` credential kind, presented to the root only
(`upstream-adapters.md` AC6). An upstream with no compact index (an older gem server) answers
`/versions` `404`, which this remote passes on, and the clients take their captured fallback to the
legacy files, which the remote serves: slower, and supported.

**The Bundler mirror recipe.** A Gemfile keeps `source "https://rubygems.org"` and the machine sets
`bundle config set mirror.https://rubygems.org https://{registry}/rubygems/{remote}`; Bundler then
fetches everything from this registry and the lockfile still says `remote: https://rubygems.org/`
(captured), so lockfiles stay portable. `gem` has no mirror setting; it takes `--source` or a
`.gemrc` `:sources:` list.

Upstream removal maps onto `proxy-cache.md`'s event classes as RubyGems' side of that table:

| Upstream event, as observed at revalidation | Classification |
|---|---|
| A `/versions` line removes a version (`-{version}`), or a version leaves `/info`, for a version whose `.gem` this remote has cached | **Removal with no signal**: the index is mirrored verbatim, so new resolutions and lockfiles stop reaching it exactly as against the upstream; the cached `.gem` is kept, a divergence recorded and the operator alerted once. rubygems.org's yank is a deletion with no reason on the wire (its `Deletion`), and its malware takedowns look identical |
| The same, for a version this remote never cached | An **ordinary metadata change**: nothing held diverges |
| `/info/{gem}` answers `404` or `410` where it existed | **Removal with no signal**, as above |
| A version entry's `checksum:` changes | A **coordinate-bound immutability violation**, treated as the explicit signal: purge the cached `.gem` and alert; a `CHECKSUMS` lockfile (4.0.20) would fail against the old bytes anyway |
| `/versions` rewritten with a new `created_at` | An **ordinary metadata change**: adopted whole after verification |
| An older `/versions` generation (same `created_at` and shorter, or an older `created_at`) | **Regression not adopted** |
| A Marshal document failing the allowlist walk, a quick spec naming another coordinate, a `.gem` failing its checksum, a `/versions` failing its `Repr-Digest` | **Integrity failure at fetch** |

No wire signal here is explicit: rubygems.org has no holding package, no `451`, no advisory field.
The active channel is `supply-chain-policy.md`'s advisory feed, whose OSV malware entries for the
RubyGems ecosystem condemn a coordinate in every remote of this format under the shared
security-signal rule.

The assertion trap, sharper than npm's: Bundler caches every compact index document under the user's home and every
`.gem` in its install path, and RubyGems keeps the legacy files and quick specs under
`~/.local/share/gem/specs` (captured in the 3.4.19 container), so a second install from a warm home
proves nothing about this registry. A case asserting a cache hit starts from an
empty home and asserts both directions at the network layer.

### Signatures and attestations

`gem push --attestation` (4.0.20) sends Sigstore bundles beside the gem, and rubygems.org verifies
them against the pushing trusted publisher's identity, refusing `422` "Attestation verification
failed" (`Pusher#verify_sigstore`) and serving them at `/api/v1/attestations/{full_name}.json`.
No pinned client reads that route (no reference outside `push_command.rb` in the 4.0.20 source), so
the verdict is what matters, as input to `supply-chain-policy.md`'s signature rules. Per the
resolved attestation decision below (was Q8):

- **Hosted**: each bundle is verified inside the push, before commit, through `Deps`' `Verifier`
  against the repository's `sigstore-root` and `identity-policy` (`artifact-verification.md`'s
  Sigstore entry, the PEP 740 precedent); a failure refuses the push `422` with the reason and
  commits nothing; verified bundles are stored as a file of the version and served at the
  rubygems.org route; a push without attestations commits with the verdict `absent`.
- **Proxied**: the upstream's bundles are fetched with the `.gem`, verified against the remote's
  trust set, re-hosted at the same route on this registry and never passed through unverified, the
  rule `npm.md` follows; a failing bundle is not served and the verdict is `failed`.
- This asks `artifact-verification.md` for a RubyGems row naming its Sigstore entry, hosted and
  proxied, which its AC24 then holds to a passing case on each path.

### Virtual repositories

Per the resolved virtual decision below (was Q7), `Virtual: supported`. A virtual resolves each gem
from the **first member in member order that holds a name folding to the same key**, omitting every
later member's versions of it, so a remote's `rack` can never shadow a hosted `Rack`; the virtual
serves the supplying member's `/info` bytes verbatim, so their MD5 is the member's. The merged
`/versions` is an **appending log of its own**: each merge (`signing-service.md`'s `index.merge`)
computes, per name, the delta between the version set the virtual last served and the new one, and
appends lines expressing it with the `-` syntax, so a warm client receives each merge as a `206`.
This needs `signing-service.md`'s `Merge` to receive the virtual's previous merged document set,
recorded in the report. The legacy files of a virtual are generated from the merged compact-index
records by the same Marshal writer, never merged from members' Marshal bytes. Quick specs, `.gem`
files and attestations resolve through the supplying member.

### Capabilities and lifecycle

`Capabilities()` declares proxy `supported`, reference-implementation availability `available`
(geminabox, below), `Virtual: supported` and `Rename: supported`. A rename changes no stored byte:
no document names the repository. Its cost is the ecosystem's, stated for operators: the source
URL is lockfile identity, so a renamed repository is a new `remote:` to every `Gemfile.lock` that
named the old one, and `repository-lifecycle.md`'s resolved alias decision (was Q2 there) provides
no redirect; Bundler's cache slug is per source URI, so every client refetches from the new name.
`repository-lifecycle.md` AC12 requires `conformance/rubygems/rename_test.go`, which AC25 carries.

### Conformance, the three clients and the corpus

Three pinned generations, because each watershed changes what the registry must get right:

- **RubyGems 4.0.20 and Bundler 4.0.20** (Ruby 4.0.7): current; `HEAD /versions` probe; digest-verified
  appends; `CHECKSUMS` in the lockfile; the only generation with `--attestation`.
- **RubyGems 3.5.22 and Bundler 2.5.22** (Ruby 3.3.12): the first generation with
  `Gem::SafeMarshal` and digest-verified appends.
- **RubyGems 3.4.19 and Bundler 2.4.19** (Ruby 3.2.11): the last with plain `Marshal.load`, the
  MD5 `ETag` check and the `HEAD /` probe. Kept because it is the generation a wrong validator or an
  unverified Marshal document harms, which is exactly what the matrix must prove absent.

Every hosted and proxied read case runs on all three; `--attestation` cases on 4.0.20 alone.

The harness needs nothing new: the token reaches Bundler as `BUNDLE_{HOST}=x:{token}`, `gem` as
userinfo in `--source` and `GEM_HOST_API_KEY` for writes; TLS trust through `SSL_CERT_FILE`, which
both clients honour; pre-yanked and pre-published state through `state`; the rubygems.org stand-in
through `upstreams`; the Sigstore fixture through `trust`; refusals through `policies` and
`advisories`.

The recorded surface for the corpus: `HEAD /` and `HEAD /versions` probes, a cold `bundle install`
of a gem with dependencies and a platform variant, the warm ranged refresh after a publish, the
refresh after a yank (the non-prefix `/info`), a `304` refresh, `gem install` with its quick specs,
`gem search -r` twice (the own-clock condition), `gem push` new, identical and changed, `gem yank`
with and without `--platform`, a lockfile install of a yanked version, a mixed-case lookup, a
missing gem, the unauthenticated `401` and a Basic-authenticated install, and the legacy fallback.
The read half is recorded against rubygems.org. **The hosted and write halves are recorded against
a local reference**, because rubygems.org accepts pushes only into the one public namespace from a
real account, where a test gem is permanent publication and a yank of a version older than thirty
days is refused (`Deletion::MAXIMUM_VERSION_AGE`), so this spec adds a row to
`conformance-harness.md`'s authoritative-reference exception list (reported). Deliberate
divergences on the recorded exception list before their flows replay: owners and signin refused,
the dependency API absent, no thirty-day or download-count limit on yank (rubygems.org's commons
policy, meaningless against a private repository's data, the `npm.md` precedent), `/versions`
never compacted, and `delete-package` with no client.

## Acceptance Criteria

- [ ] AC1: `bundle install` and `gem install` resolve and install a gem with two dependencies from a
      hosted repository at `/rubygems/{repository}/` on all three pinned generations; every
      downloaded `.gem` is byte-identical to the one pushed and its SHA-256 equals the `/info`
      `checksum:` and Bundler 4.0.20's lockfile `CHECKSUMS` entry; RubyGems 3.4.19's `HEAD` on the
      mount root and 3.5.22's and 4.0.20's `HEAD /versions` are answered `200`, and no generation
      requests `/api/v1/dependencies` or `specs.4.8.gz`, asserted from the transcript; a newly
      created, empty repository serves `/versions` as its `created_at` header followed by `---\n`,
      and every generation's `bundle install` against it fails only with "Could not find gem".
- [ ] AC2: `gem push` publishes on all three generations, printing the success body and exiting `0`,
      and a `bundle install` from an empty home started the moment the push returns installs the
      new version, proving every generated document of the head snapshot reflected it before the
      response.
- [ ] AC3: An identical re-push answers `200`, exits `0` and creates no snapshot; a push of different
      bytes at an existing version answers `409`, the client prints the body and exits non-zero,
      and no snapshot is created; both on all three generations.
- [ ] AC4: `gem yank`, whose form carries `gem_name`, `version` and, with `--platform`, `platform`,
      removes exactly the named version entry in one
      snapshot: `/versions` gains one appended removal line and its previous bytes are unchanged,
      `/info` no longer lists the entry, its `.gem` and quick spec answer `404`, a fresh `bundle
      install` resolves around it, a lockfile pinning it fails with Bundler's "has removed it"
      error, and a later push of that coordinate answers `409` with the retired wording, including
      after every snapshot that held it has been pruned.
- [ ] AC5: After a publish, a warm Bundler 2.5.22 and 4.0.20 refresh `/versions` and the changed
      `/info` with `Range: bytes={cached size - 1}-`, receive `206` whose `Repr-Digest` equals the
      SHA-256 of the whole served body, and end with local copies byte-identical to it; Bundler
      2.4.19 appends and resolves with the same result; every `versions` generation a write produces
      is a byte extension of the previous one.
- [ ] AC6: Every compact index document served on the hosted, proxied and virtual paths carries an
      `ETag` equal to the quoted MD5 of its whole identity body and `Repr-Digest` over the whole
      body on `200` and `206`, never carries `Content-Encoding` even when `gzip` is accepted, and
      answers `304` to a matching `If-None-Match`; with those validators Bundler 2.4.19 completes
      every hosted and proxied install without requesting `/api/v1/dependencies` or any legacy file.
- [ ] AC7: After a yank rewrites a gem's `/info`, every generation converges with at most one
      additional whole fetch and no legacy fallback; after a named pointer is rolled back to an
      earlier snapshot, a Bundler 4.0.20 client holding the later `/versions` receives `416`, then
      `200` with the earlier generation, and resolves exactly the earlier snapshot's versions.
- [ ] AC8: The legacy index serves every generation: `gem search -r` (reading
      `latest_specs.4.8.gz`), `gem list -r --all` and `gem list -r --prerelease` list exactly the
      served versions, `gem install` loads every quick spec, each the eighteen-element
      `Gem::Specification#_dump` array (under 3.4.19's `Marshal.load` and 3.5.22's and 4.0.20's
      `SafeMarshal`), and with the
      compact index unreachable a Bundler install completes through `specs.4.8.gz`,
      `prerelease_specs.4.8.gz` and the quick specs; every Marshal stream the generator emits
      passes the structural allowlist walk.
- [ ] AC9: A second `gem search -r` with no intervening write sends its own file time as
      `If-Modified-Since` and receives `304`; after a publish, and after a rollback, the next one
      receives `200` with the new list and a `Last-Modified` later than any previously served.
- [ ] AC10: A gem published as `ZzCase` is served at `/info/ZzCase`; `bundle` naming `zzcase` fails
      with "Could not find gem" and `gem install zzcase` suggests `ZzCase`; a push of `zzcase`
      answers `409` naming `ZzCase`; `zz-sep` and `zz_sep` both publish and install; a name outside
      the grammar answers `422` naming the rule.
- [ ] AC11: A version with a `ruby` entry and a `1.1.0-x86_64-linux` entry installs the platform entry on
      `x86_64-linux` and the `ruby` entry when the lockfile's platforms require it, and
      `gem yank --platform x86_64-linux` removes only that entry, both entries being separate
      `/info` lines, quick specs, `.gem` files and retirements.
- [ ] AC12: The downloads of `zzamb` 1.0.0 and of `zzamb-1` 0.5.0 report the objects
      `zzamb/1.0.0` and `zzamb-1/0.5.0` from filenames of the shape `{name}-{version}[-{platform}]`,
      so a token whose `pull` is patterned `zzamb/**` downloads
      the first and is refused the second with the response a missing file receives; a filename
      that resolves to no version reports none; a push reports `{gem}/{version}` read from its first
      tar entry `metadata.gz`, and none when `metadata.gz` is not the first entry, so only an
      unpatterned `push` publishes it; and a push whose filename equals an existing gem's filename
      answers `409`.
- [ ] AC13: On a private repository a Basic credential from `BUNDLE_{HOST}` and from `source` or
      `--source` userinfo is accepted on every read on all three generations; a credential-less
      request answers `401` with a `WWW-Authenticate: Basic` challenge byte-identical for a private
      and a missing repository, and Bundler exits 17 printing "Please supply credentials"; a valid
      token lacking `pull` receives `404`; a rejected token receives `401` and is never served as
      anonymous; the lockfile never contains the credential.
- [ ] AC14: Every `401` and `403` answered on the push, yank, owners and `api_key` routes has a body
      starting with neither "You have enabled multifactor authentication" nor "The API key doesn't
      have access", and a refused `gem push` and `gem yank` in a container with no terminal exit
      non-zero within ten seconds without prompting.
- [ ] AC15: On a repository with anonymous read enabled both clients install without a credential,
      and `gem push` and `gem yank` without `GEM_HOST_API_KEY`'s key, or with a key lacking the
      action, are refused with no snapshot created.
- [ ] AC16: A token holding unpatterned `pull` and `push` and `delete` patterned `acme-*/**` pushes
      and yanks `acme-tool` through the real 4.0.20 client and is refused pushing or yanking
      `other-tool` with no snapshot created; a token holding only a patterned `pull` is refused
      `/versions`, `/api/v1/dependencies` and `specs.4.8.gz`, and a real `bundle install` under it
      fails, in the hosted and the proxied mode.
- [ ] AC17: A proxied repository serves `bundle install` and `gem install` from a compact-index
      upstream stand-in on all three generations; from an empty home a second install reaches this
      registry and the upstream receives no request, both asserted at the network layer; each
      `.gem` was verified against its `/info` `checksum:` before it was committed.
- [ ] AC18: A proxied `/versions` past its TTL is revalidated with a `Range` from its cached size
      minus one and the upstream `ETag`: an appended upstream is adopted as an extension verified
      against the upstream `Repr-Digest` and a warm client then receives it from this registry as
      a `206`; an upstream rewrite with a new `created_at` is adopted whole and warm clients
      converge with at most one extra fetch; an older generation is not adopted and records a
      divergence; and every adopted revision is served under a cache-scoped `Last-Modified` later
      than the previous one.
- [ ] AC19: A cached proxied `/info` whose MD5 equals the adopted `/versions` line is served past its
      TTL with no upstream request, and one whose MD5 differs is revalidated upstream before it is
      served, inside its TTL, asserted from the stand-in's request log.
- [ ] AC20: RubyGems' rows of the removal table hold on the proxied path: a removal line for a
      cached version keeps the `.gem`, mirrors the index and records a divergence with one alert, and
      for an uncached version records none; an `/info` `404` on a previously served gem keeps
      serving with a divergence; a changed `checksum:` purges the cached `.gem` and alerts, the next
      download re-fetching and verifying against the new digest; each proven against a stand-in.
- [ ] AC21: A proxied quick spec or legacy index file carrying a class, symbol or instance variable
      outside `Gem::SafeMarshal`'s allowlist, or a quick spec whose embedded coordinate differs from
      its filename, is never committed or served, the previous revision keeps serving, no negative
      entry is written, and a RubyGems 3.4.19 client requesting it receives an error rather than the
      bytes.
- [ ] AC22: A `.gem` or quick spec the shared policy layer refuses answers `403` with the status
      line `Refused by policy: {condition}` on the hosted and the proxied path, `bundle install`
      and `gem install` exit non-zero printing that phrase, `/info` still lists the version, and
      `supply-chain-policy.md`'s RubyGems binding row is filled from the same case, including whether
      `gem install` with a second source falls back.
- [ ] AC23: A publish and a yank driven through the management API (`POST
      /api/v1/repositories/{name}/operations`, kinds `publish` and `delete-version`) and through
      `gem push` and `gem yank` on twin gems produce byte-identical `/info` and `/versions` lines
      and exactly one snapshot each; a principal holding `push` without `delete` is refused the yank
      through both entry points with no snapshot; a push or yank against a proxied or virtual
      repository answers `405` with problem type `repository-type` through both, printed by `gem`.
- [ ] AC24: A `delete-package` driven by a case `script` retires every version: afterwards
      `bundle install` and `gem install` of the gem fail, a push of any of its versions answers
      `409`, `/versions` gained one removal line, and the `Package` row and its registered spelling
      survive, so a push of a new version under a differently cased name is still refused.
- [ ] AC25: `Capabilities()` declares proxy `supported`, reference `available`, `Virtual: supported`
      and `Rename: supported`; a real `bundle install` from a renamed repository succeeds under the
      new name in both modes while the old name answers what a never-existing repository answers;
      a virtual over a hosted member holding `Rack` and a remote holding `rack` serves only the
      hosted member's gem under either spelling, and a warm client receives the virtual's second
      merge as a `206`.
- [ ] AC26: `gem push --attestation` (4.0.20) with a fixture Sigstore bundle satisfying the
      repository's identity policy commits and serves the bundle at
      `/api/v1/attestations/{full_name}.json`; a failing bundle answers `422` with nothing committed;
      a proxied gem's upstream bundles are verified and re-hosted, and a failing one is not served;
      the verdict is readable in both modes.
- [ ] AC27: A gem signed with `gem cert` installs with `gem install -P HighSecurity` through the
      hosted and the proxied path, its `.gem` served byte-identical to the pushed or upstream bytes.
- [ ] AC28: With `bundle config set mirror.https://rubygems.org` pointing at a proxied repository,
      `bundle install` of a `source "https://rubygems.org"` Gemfile reaches only this registry at
      the network layer and writes `remote: https://rubygems.org/` to the lockfile.
- [ ] AC29: Configuring a remote whose upstream is not an `https://` root is refused with
      `upstream-invalid`; the `https://index.rubygems.org/` recipe's shape (a stand-in serving every
      route from its root) needs no allowlist host; a private upstream's `basic` credential reaches
      the root only; and a legacy-only upstream stand-in answering `/versions` `404` serves both
      clients through their fallback to the legacy files.
- [ ] AC30: Replay-match passes against a corpus whose read half is recorded from rubygems.org and
      whose hosted and write halves are recorded from the geminabox reference named in
      `conformance-harness.md`'s exception list, covering the recorded surface named in Design.
- [ ] AC31: `/api/v1/dependencies` answers `404` in every mode; the owners routes and
      `/api/v1/api_key` are refused with a body naming repository grants and token minting as the
      mechanisms, with no state change; `gem owner` and `gem signin` print that body and exit
      non-zero.
- [ ] AC32: A push is refused `422` naming the rule, with nothing committed and no blob referenced,
      when its archive holds an entry other than `metadata.gz`, `data.tar.gz`, `checksums.yaml.gz`
      and `.sig` files, when `checksums.yaml.gz` names a SHA-256 its `metadata.gz` or `data.tar.gz`
      does not have, when `metadata.gz` carries a YAML alias or anchor or a tag other than
      `Gem::Specification`, `Gem::Version`, `Gem::Requirement` and `Gem::Dependency`, or when its
      platform is not `ruby` or a valid `Gem::Platform`; `gem push` prints the reason.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/rubygems/hosted_test.go` (three generations; checksum from the transcript and the lockfile; probe and no-fallback asserted from the transcript) |
| AC2 | conformance | `conformance/rubygems/publish_test.go` (install from an empty home immediately after the push) |
| AC3 | conformance + integration | `conformance/rubygems/publish_test.go` (identical and changed push per generation); `internal/format/rubygems/publish_test.go` (snapshot count, unchanged publish, shared with `management-api.md` AC5) |
| AC4 | conformance + integration | `conformance/rubygems/yank_test.go` (both platform forms, lockfile install, republish after pruning); `internal/format/rubygems/index/versions_test.go` (prefix preserved across a removal) |
| AC5 | conformance + unit | `conformance/rubygems/range_test.go` (warm refresh per generation, local copy compared with the served body); `internal/format/rubygems/index/versions_test.go` (extension property over a sequence of writes) |
| AC6 | conformance + integration | `conformance/rubygems/validators_test.go` (all three paths, `gzip` requested, 2.4.19 transcript with no fallback); `internal/index/serve_policy_test.go` (the MD5 and `Repr-Digest` policy, shared with `signing-service.md` AC30) |
| AC7 | conformance | `conformance/rubygems/range_test.go` (yank refresh per generation; rollback through `management-api.md`'s pointer route in the case `script`) |
| AC8 | conformance + unit | `conformance/rubygems/legacy_test.go` (three generations; fallback forced by a stand-in path answering `/versions` `404`); `internal/format/rubygems/index/marshal_test.go` (writer output through the allowlist walk, and fuzzed specifications) |
| AC9 | conformance | `conformance/rubygems/legacy_test.go` (`If-Modified-Since` and `Last-Modified` from the transcript across a publish and a rollback) |
| AC10 | conformance + integration | `conformance/rubygems/names_test.go`; `internal/format/rubygems/names_test.go` (grammar and case-collision refusals) |
| AC11 | conformance | `conformance/rubygems/platform_test.go` |
| AC12 | unit + conformance | `internal/format/rubygems/scope_object_test.go` (the object table per route, filename resolution, none on no match, the descriptor sentinel check through `internal/format/scope_test.go`); `conformance/rubygems/auth_test.go` (the patterned download case) |
| AC13 | conformance | `conformance/rubygems/auth_test.go` (both credential sources per generation; challenge equality from the transcript; lockfile scanned) |
| AC14 | integration + conformance | `internal/format/rubygems/refusal_body_test.go` (every refusal the handler and the shared layer write on those routes); `conformance/rubygems/auth_test.go` (no-TTY container, bounded run time) |
| AC15 | conformance | `conformance/rubygems/auth_test.go` (anonymous-read repository) |
| AC16 | conformance | `conformance/rubygems/auth_test.go` (the pattern-refusal case `format-handler-interface.md` AC7 requires, both modes) |
| AC17 | conformance | `conformance/rubygems/proxied_test.go` (empty home, network-level assertion) |
| AC18 | conformance + integration | `conformance/rubygems/proxied_versions_test.go` (mutating stand-in: append, rewrite, lagging edge); `internal/format/rubygems/adoption_test.go` (ordering value, ranged adoption, `Last-Modified` shared with `proxy-cache.md` AC22's `internal/proxy/freshness_test.go`) |
| AC19 | integration | `internal/format/rubygems/info_freshness_test.go` (stand-in request log) |
| AC20 | integration | `internal/format/rubygems/removal_test.go` (a stand-in presenting each row; the shared half is `proxy-cache.md` AC13's) |
| AC21 | integration + unit | `internal/format/rubygems/marshal_verify_test.go` (crafted streams per forbidden construct, fuzzed); `conformance/rubygems/proxied_test.go` (3.4.19 against a stand-in serving a crafted quick spec) |
| AC22 | conformance | `conformance/rubygems/policy_test.go` (both modes, both clients, a second source for `gem`) |
| AC23 | conformance + integration | `conformance/rubygems/manage_binding_test.go` (twin gems in one `script`, the `script` case `management-api.md` AC24 requires for `publish` and `delete-version`); `internal/format/rubygems/manage_binding_test.go` (snapshot counts, `push`-only refusal, `405` on remote and virtual; the cross-handler table is `management-api.md` AC8's) |
| AC24 | conformance | `conformance/rubygems/manage_package_test.go` (the `script` case for `delete-package`) |
| AC25 | unit + conformance | `internal/format/rubygems/capabilities_test.go`; `conformance/rubygems/rename_test.go` (`repository-lifecycle.md` AC12); `conformance/rubygems/virtual_test.go` (folded first-member resolution, appending merge) |
| AC26 | conformance | `conformance/rubygems/attestation_test.go` (fixture Sigstore through the `trust` key; shared with `artifact-verification.md` AC24) |
| AC27 | conformance | `conformance/rubygems/signed_gem_test.go` (both modes) |
| AC28 | conformance | `conformance/rubygems/mirror_test.go` (network-level assertion, lockfile read) |
| AC29 | integration + conformance | `internal/format/rubygems/upstream_config_test.go` (refusals through `management-api.md`'s remote create; credential reach from the stand-in log); `conformance/rubygems/proxied_test.go` (legacy-only stand-in) |
| AC30 | conformance | `conformance/rubygems/replay_test.go` (manifest checked by `conformance-harness.md` AC28) |
| AC31 | conformance + integration | `conformance/rubygems/unsupported_test.go`; `internal/format/rubygems/routes_test.go` |
| AC32 | integration + conformance | `internal/format/rubygems/ingest_test.go` (one crafted archive per rule, fuzzed YAML through the restricted reader); `conformance/rubygems/publish_test.go` (the printed reason on 4.0.20 and 3.4.19) |

The case set needs only keys already in the harness's closed `setup` vocabulary: `repositories`
with visibility, `credentials` (patterned tokens included), `upstreams` stand-ins, `state` for
pre-published and pre-yanked versions, `trust` for the Sigstore fixture, and `policies` and
`advisories`. The runner-enforced obligations (both modes; the unauthenticated, unauthorized and
pattern-refusal cases in each; a `script` case per declared kind; `rename_test.go`) apply from
`conformance-harness.md` AC26 and are not restated per criterion.

## Implementation Phases

### Phase 1: Hosted reads and the generator
- The generator package: `versions` as a segment log with MD5 and SHA-256 states, `info`, `names`,
  the restricted YAML reader, the Marshal writer and the three legacy files, the quick spec; the
  serve policies (MD5 `ETag`, `Repr-Digest`, ranges, identity only; `not-earlier` on the legacy
  files); the probe routes; name and platform rules; the object table with filename resolution;
  `Capabilities()` (AC1, AC5 to AC12, AC25)

### Phase 2: Writes and management
- The `Operator` with `publish`, `delete-version` and `delete-package`, the push and yank bindings,
  the unchanged publish, the refusal bodies, attestations on push, the policy rendering, the
  refused routes, the ingest rules; waits on `management-api.md` reaching `planned` (AC2 to AC4,
  AC13 to AC16, AC22 to AC24, AC26, AC27, AC31, AC32)

### Phase 3: Proxied path
- Ranged `/versions` adoption with the ordering value and the name map, `/info` freshness keyed on
  the map, the Marshal allowlist walk as verifier and adoption check, `.gem` stream-and-verify,
  attestation re-hosting, the removal rows, the mirror and legacy-only recipes, the virtual's
  appending merge (AC17 to AC21, AC25, AC28, AC29)

### Phase 4: Corpus and gate
- The geminabox reference and the rubygems.org recording across the named surface after the
  harness redaction gate, replay-match, the three-generation matrix rows (AC30)

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. Each of the twelve questions below was written in the template's decision shape and
adopted at its own recommendation under the owner's standing delegation, recorded as adopted
rather than decided, folded through the body in the same pass, and reversible by the owner at any
time. `grep -rn "standing delegation"` is the owner's review queue.

### Resolved: which kind `gem yank` is (was Q1)

**Adopted 2026-09-28 under the owner's standing delegation.** Option A: `gem yank` is a binding
onto `delete-version`, retiring the version entry. Folded through Context, Scope, "The hosted
publish path", "The management surface", AC4 and AC23.

The question: Cargo's and PyPI's yank are `withdraw` (not for new resolution, lockfiles keep
working). RubyGems uses the same word for an operation whose effect is different: rubygems.org
removes the version from every index and its `.gem` and quick spec from storage (`Deletion`,
`remove_from_storage`), refuses the coordinate's reuse (`Pusher#republish_notification`), and a
lockfile pinning it fails (captured). `management-api.md` places a kind by its effect.

**Recommendation:** A, because the effect rule decides kinds and the effect is removal for
everyone, captured.

| Option | You get | It costs |
|---|---|---|
| **A. `delete-version`, retiring the entry** | The ecosystem's semantics; the real client's effect matches rubygems.org's | The same word means two kinds across formats, which the management-surfaces analysis must say |
| **B. `withdraw`, keeping the `.gem` downloadable** | One meaning of "yank" across formats | A behaviour no RubyGems client or server has: Bundler refuses the lockfile anyway because the index no longer lists the version, so the kept file helps nobody |

**Why this is yours:** it names what an operator's yank does to every downstream build.

Accepted cost: a mistaken yank cannot be undone by republishing the same version, as on
rubygems.org. B lost because its only difference is a file no client can reach.

### Resolved: whether the hosted versions log is compacted (was Q2)

**Adopted 2026-09-28 under the owner's standing delegation.** Option A: never in v1; the log grows
one line per write. Folded through Mapping, "Freshness under pointers" and AC5.

**Recommendation:** A: compaction buys nothing but size, and every compaction is a non-prefix change
every warm client pays for with an extra whole fetch; a private repository's log is small (one short
line per write).

| Option | You get | It costs |
|---|---|---|
| **A. Never compact in v1** | Every generation is an extension of the last, forever; no rebase logic | The log keeps removal lines and superseded MD5s; one blob per write |
| **B. Compact monthly, as rubygems.org does** | A shorter file | A scheduled non-prefix rewrite and a rebase path through pointers, for bytes a private repository barely has |
| **C. Compact at a size threshold** | Bounded size | The same rebase path, triggered unpredictably |

**Why this is yours:** it trades storage and blob count against client traffic, a sizing call.

Accepted cost: segment count grows with writes; revisit with a measured size if one appears.

### Resolved: the validators of the compact index (was Q3)

**Adopted 2026-09-28 under the owner's standing delegation.** Option A: the `ETag` is the quoted
MD5 of the whole identity body, `Repr-Digest` is sent on `200` and `206`, and no encoding is ever
applied, as serve policy the door applies. Folded through "The versions file is a log", the
proxied path, AC5 and AC6; the door's two missing capabilities are a sibling consequence.

**Recommendation:** A: both servers sampled (rubygems.org and geminabox) do it, it costs one
stored hash, and without it Bundler 2.4.19 silently falls to the legacy Marshal path (captured).

| Option | You get | It costs |
|---|---|---|
| **A. MD5 `ETag` and `Repr-Digest` as door policy** | All three generations append; no silent downgrade | `signing-service.md` gains an `ETag` derivation and a digest header |
| **B. The door's own `ETag`, `Repr-Digest` only** | No door change for the `ETag` | 2.4.19 degrades to `/api/v1/dependencies` then the legacy index on every run |
| **C. A handler-set `ETag`** | No door change | Breaks the freshness boundary the architecture test holds |

**Why this is yours:** it asks a foundation spec for a format-driven capability.

Accepted cost: an MD5 kept beside every compact document, and a policy option only this format
uses today.

### Resolved: how the registry handles Marshal (was Q4)

**Adopted 2026-09-28 under the owner's standing delegation.** Option A: hosted Marshal is written
by a restricted writer from typed YAML; proxied Marshal passes through only after a structural
allowlist walk; nothing is ever deserialised into objects. Folded through "Marshal", the proxied
path, the removal table, AC8 and AC21.

**Recommendation:** A, because it keeps the one client that runs plain `Marshal.load` (3.4.19)
safe from anything an uploader or an upstream controls, without a Ruby runtime in the registry.

| Option | You get | It costs |
|---|---|---|
| **A. Write hosted, verify proxied, never parse into objects** | Byte-faithful proxying; no gadget can reach 3.4 clients through us | A Marshal writer and a validating reader to maintain |
| **B. Regenerate every proxied Marshal document from compact-index records** | No reader at all | Quick specs cannot be regenerated (the compact index lacks their fields), and replay-match against rubygems.org fails for every legacy file |
| **C. Pass upstream Marshal through unchecked** | Least code | The registry relays whatever an upstream or its compromise sends into `Marshal.load` |

**Why this is yours:** it sets how far the registry trusts an upstream's serialised objects.

Accepted cost: two bounded Marshal components under fuzzing. C lost on safety, B on fidelity.

### Resolved: the object a download reports (was Q5)

**Adopted 2026-09-28 under the owner's standing delegation.** Option A: `Scope(r)` resolves the
filename through the served index and reports `{gem}/{version}`, or none. Folded through
"Addressed objects", AC12; the data-reading `Scope(r)` is a re-open input.

**Recommendation:** A, because the filename grammar is ambiguous on real data (169 name pairs on
rubygems.org) and any purely syntactic split misattributes some gem to another's pattern.

| Option | You get | It costs |
|---|---|---|
| **A. Resolve through the index** | The right object for every file | `Scope(r)` reads the snapshot or cached index |
| **B. Split at the first `-{digit}`** | A pure function | `levenshtein-19` 1.0 reported as `levenshtein`, so a `levenshtein/**` token downloads another gem |
| **C. Report the filename stem** | Pure and unambiguous | Patterns over stems (`acme-tool-*`) also match `acme-tool-extra`, a cross-gem leak |

**Why this is yours:** it widens what `Scope(r)` may do, which the interface re-open adjudicates.

Accepted cost: a read before authorization, whose result reaches the caller only as the
authorization outcome, identical for out-of-pattern and missing.

### Resolved: what keeps a proxied info file fresh (was Q6)

**Adopted 2026-09-28 under the owner's standing delegation.** Option A: the `/versions` line's MD5
decides; the TTL does not. Folded through the proxied path and AC19; the fetch-and-cache condition
is a sibling consequence.

**Recommendation:** A: it is the upstream's own freshness contract, it removes one upstream request
per gem per TTL for unchanged gems, and it revalidates a changed gem the moment `/versions` says so.

| Option | You get | It costs |
|---|---|---|
| **A. Keyed on the `/versions` MD5** | Consistency between the two documents; far fewer upstream requests | An expected-validator condition on fetch-and-cache |
| **B. Plain TTL per document** | No new capability | `/info` and `/versions` disagree for up to a TTL, and every requested gem is revalidated every TTL |

**Why this is yours:** it asks the proxy layer for a condition no other format has needed.

Accepted cost: `/info` freshness follows `/versions` freshness, which follows its TTL.

### Resolved: virtual repositories (was Q7)

**Adopted 2026-09-28 under the owner's standing delegation.** Option A: supported, with folded
first-member-wins and an appending merged log. Folded through "Virtual repositories",
Capabilities and AC25; the previous-set input to `Merge` is a sibling consequence.

**Recommendation:** A: nothing on this wire names or signs the repository, and the append property
can be kept by the merge itself.

| Option | You get | It costs |
|---|---|---|
| **A. Supported, appending merge** | Hosted plus rubygems.org behind one source, incremental for clients | `Merge` must see the previous merged set |
| **B. Supported, full rebuild per merge** | No `Merge` change | Each merge is a non-prefix change of a log that may be 24 MB, one extra whole fetch per client per merge |
| **C. Unsupported** | Nothing to build | The most-requested Ruby setup, private gems beside a cache, needs two sources |

**Why this is yours:** it asks a foundation contract to change for one format's virtual.

Accepted cost: delta computation per merge and one more `Merge` input.

### Resolved: attestations (was Q8)

**Adopted 2026-09-28 under the owner's standing delegation.** Option A: verify on push and on
proxy, serve at the rubygems.org route. Folded through "Signatures and attestations" and AC26.

**Recommendation:** A: the verdict feeds policy even though no client reads the route, and
passing unverified provenance through is what `npm.md` refused.

| Option | You get | It costs |
|---|---|---|
| **A. Verify both paths, re-host** | Policy can require verified provenance for Ruby gems | A proxied fetch per `.gem` for its bundles |
| **B. Verify hosted only** | Less proxied work | No verdict on cached gems, which are most of them |
| **C. Refuse `--attestation` pushes** | Nothing to build | `gem push --attestation` fails against this registry |

**Why this is yours:** it sets what provenance the registry vouches for in one more ecosystem.

Accepted cost: the route has no client oracle; its cases read it with `curl` and the verdict API.

### Resolved: owners and signin (was Q9)

**Adopted 2026-09-28 under the owner's standing delegation.** Option A: refuse every owners route
and `/api/v1/api_key` with a body naming the mechanism. Folded through Scope and AC31.

**Recommendation:** A: `cargo.md`'s listing has no RubyGems equivalent worth serving (the YAML
carries emails and handles principals may not have), and a signin route would mint tokens outside
`credential-management.md`.

| Option | You get | It costs |
|---|---|---|
| **A. Refuse all, body explains** | One authorization model, one minting path | `gem owner` and `gem signin` fail against this registry |
| **B. Serve an owners listing from publisher records** | `gem owner` lists something | A YAML shape with no truthful content, for no build step |
| **C. `404` without a body** | Nothing to write | A bare failure that reads as a broken registry |

**Why this is yours:** it sets what "owner" and "sign in" mean on this registry.

Accepted cost: two refusals on the exception list.

### Resolved: rubygems.org as a preconfigured upstream (was Q10)

**Adopted 2026-09-28 under the owner's standing delegation.** Option B: user-configured in v1,
revisited at the Tier 2 verdict through `proxy-cache.md`'s extension mechanism, as `cargo.md` did.
Folded through the upstream binding and AC29.

**Recommendation:** B, for sequencing: this format may never be built, and the preconfigured set is
a support surface the owner sized.

| Option | You get | It costs |
|---|---|---|
| **A. Preconfigure now** | Ruby caching with no setup | A sibling decision reopened from a gated Tier 2 spec |
| **B. User-configured, revisit at the verdict** | No premature sibling change | A longer first-run story for Ruby, and no nightly real-upstream run |

**Why this is yours:** it amends a set you sized.

Accepted cost: proxied cases run against a stand-in; rubygems.org only in the recording.

### Resolved: how `gem push` reaches the write path (was Q11)

**Adopted 2026-09-28 under the owner's standing delegation.** Option A: a binding onto `publish`,
declaring the unchanged publish. Folded through "The hosted publish path", "The management
surface", AC3 and AC23.

**Recommendation:** A: rubygems.org answers an identical re-push `200` with no change, which is
exactly `management-api.md`'s unchanged publish, and that rule belongs to the `publish` kind.

| Option | You get | It costs |
|---|---|---|
| **A. Binding onto `publish`** | The unchanged-publish rule and API parity for free | The push route reports its object from a bounded body peek |
| **B. A wire write of the handler's own** | No binding test | The handler reimplements the unchanged-publish accounting outside the kind that owns it |

**Why this is yours:** it chooses which shared contract a client write is held to.

Accepted cost: a push whose first tar entry is not `metadata.gz` passes only an unpatterned `push`.

### Resolved: where a policy refusal binds (was Q12)

**Adopted 2026-09-28 under the owner's standing delegation.** Option A: on the byte routes; the
indexes keep listing. Folded through "Policy refusals on the wire" and AC22.

**Recommendation:** A: a refusal on `/info` is a bypass (captured: Bundler fell back to the legacy
index and installed), and omitting refused versions from the index would make generated bytes
depend on policy that changes without a write.

| Option | You get | It costs |
|---|---|---|
| **A. Refuse `.gem`, quick spec and attestations** | A refusal no client path routes around; stable index bytes | The resolver selects the refused version and fails, rather than choosing another |
| **B. Omit refused versions from the indexes** | Resolution picks an allowed version | Policy-dependent index bytes, a non-prefix change at every rule change, and the legacy files to keep in step |

**Why this is yours:** it decides whether a refused install fails loudly or quietly resolves elsewhere.

Accepted cost: a refused version fails the build rather than being skipped.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-28 | a3a9d78 | authoring pass on Opus 5.5: grounded first draft, not a review | Resumed a stopped capture run and reused its geminabox and gemstash images, logging proxy, rubygems.org source extracts and gemstash push captures. Captured RubyGems and Bundler 4.0.20, 3.5.22 and 3.4.19 against geminabox 4.0.1: push new, identical and changed; yank with the form body; cold and ranged warm installs; a yank's non-prefix `/info`; crafted non-prefix `206`, opaque `ETag` (2.4.19 falls to the dependency API), `416` rollback, legacy fallback, the `HEAD /` and `HEAD /versions` probes, quick specs on every `gem install`, the own-clock `If-Modified-Since`, preemptive Basic and the `401` message, the scheme-less key, path prefixes, case lookups, the lockfile of a yanked version, the mirror setting, the owner routes, and `403` renderings including the `/info` refusal bypass. Grounded against the compact index specification and API reference fetched this run, the clients' source from each image, rubygems.org's server source, and rubygems.org live (validators, ranges, 169 ambiguous filenames, 178 case pairs, the dependency API's `404`, the attestation route). Twelve questions adopted under the standing delegation, none open; 32 criteria each with a Test Plan row. Stays draft; `fable_recheck` set. |
