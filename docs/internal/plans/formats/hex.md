---
status: draft
status_description: "Authored 2026-09-26 as a grounded first draft: the Hex repository and API contract captured from Hex 2.5.1 (Elixir 1.18.4, hex_core 0.18.0), Hex 2.0.6 (Elixir 1.14.5) and rebar3 3.27.0 (hex_core 0.12.2, with rebar3_hex 7.0.11 for publish, retire and docs) run in containers pinned by digest against a logging stub, checked against the hexpm/specifications documents, the hex_core protobuf schemas and source, the Hex and rebar3 client sources, and the live repo.hex.pm and hex.pm API. Eight questions written in decision shape and adopted under the owner's standing delegation; none open. Awaits a /spec review pass."
description: "Spec for the Hex (Elixir and Erlang) format: the signed protobuf registry resources, the package tarball with its inner and outer checksums, the HTTP API that mix and rebar3 publish and retire through, hosted and proxied, with the shared signing service producing every hosted registry document and hex.pm's signed payloads served unmodified on the proxied path."
author: michielvha
goal: "Serve Elixir and Erlang teams a private Hex repository whose registry is signed by a key the handler never holds, and a hex.pm cache whose signed payloads verify in an unmodified client, with mix and rebar3 as the oracles for reads, publish, retirement and revert alike."
priority: "medium"
issue: 23
created: 2026-09-26
covers:
  - "internal/format/hex/**"
  - "conformance/hex/**"
---

# Plan: Hex registry format

The Hex repository protocol and its HTTP API, hosted and proxied: three registry resources
that are gzip-compressed protobuf payloads wrapped in an RSA signature the client verifies
against a repository public key, a package tarball carrying two checksums the client checks
against that registry, and the API that `mix hex.publish`, `mix hex.retire`, `rebar3 hex
publish` and `rebar3 hex retire` drive, with both clients as the oracles on both paths.

## Context

Hex sits in Tier 2 of `formats/catalogue.md` as a single-ecosystem family ("Hex", Elixir and
Erlang). **Its build is gated by `project-charter.md` AC9 and `catalogue.md` AC5**: no handler
code for a Tier 2 ecosystem exists before every Tier 1 format has met its definition of done and
the owner has recorded a `continue` verdict at the charter's build step 8. This spec exists now
because the owner directed on 2026-09-26 that all 33 ecosystems be specced up front (the
catalogue's "Every ecosystem below is specced now; only building is gated"), so that the gate
decides what is built and never what is written; a `shrink` verdict parks it.

It is the **signed-index class** in miniature, and the first Tier 2 format in that class. Every
registry resource a client reads is signed by the repository's key and refused by the client if
the signature does not verify, so a hosted Hex repository cannot exist without the shared
signing and index service the charter builds at step 7 before Helm, and the proxied path has to
decide what to do with signatures it did not make. That question has a captured answer below:
hex.pm's payloads must be served byte for byte, because the client verifies them against
hex.pm's key under hex.pm's name, and a re-signed payload fails in every unmodified client.

Grounding for this draft, stated up front because the constitution asks for evidence or
silence:

- **Captured client traffic.** No Elixir or Erlang toolchain is installed on this host (`which
  mix rebar3 elixir erl` find nothing), so three pinned client images were run in containers on
  the host network against a logging stub that serves a directory as a Hex repository, answers
  the API routes with the shapes the API blueprint documents, and records every request:
  Elixir `1.18.4` on OTP 28 (`docker.io/library/elixir:1.18` at digest
  `sha256:45cd5b9be69e9bf62920762c732a0b8a09c4efb91ec5c499e9c6e8a3b1de1475`) running Hex
  `2.5.1` (hex_core 0.18.0); Elixir `1.14.5` on OTP 26 (`elixir:1.14` at
  `sha256:21a573f605ea744cf42e3d106e2af7295ca2c189539c33b2fb36c500e80c5dfa`) running Hex
  `2.0.6`; and rebar3 `3.27.0` on OTP 27 (`docker.io/library/erlang:27` at
  `sha256:412def5bcd4bb4fee893d6d0264318e6d2097dc3f9d44c3cb4d5c24e9451a2f0`), which bundles
  hex_core 0.12.2, with the `rebar3_hex` plugin pinned to `7.0.11` for its publish, retire and
  docs commands. The fixtures were genuine: tarballs built with the client's own vendored
  `hex_tarball`, and every registry resource built and signed with the client's own vendored
  `hex_registry` under a throwaway RSA key generated for the run, in three variants (the
  repository name the client would configure, a wrong name, and `hexpm`), plus the real
  `names`, `versions`, `packages/decimal`, `packages/jason` and `decimal` tarballs fetched from
  repo.hex.pm for the proxied cases. Every consumer capture started from a fresh `HEX_HOME` or
  rebar3 cache, and every row of the wire table was observed on all three clients unless the
  row says otherwise. The stub is not a reference implementation; what the captures prove is
  what the clients send and how they react.
- **The published contract.** The hexpm/specifications documents `registry-v2.md`,
  `endpoints.md`, `package_tarball.md`, `package_metadata.md` and `apiary.apib` (the HTTP API
  blueprint), read 2026-09-26; the protobuf schemas in hex_core (`hex_pb_signed.proto`,
  `hex_pb_names.proto`, `hex_pb_versions.proto`, `hex_pb_package.proto`); the hex_core source
  for the repository client (`hex_repo.erl`), the signing and verification code
  (`hex_registry.erl`), the API client (`hex_api.erl`, `hex_api_release.erl`) and the httpc
  adapter; the Hex client source (`lib/hex/repo.ex`, `registry/server.ex`, `scm.ex`,
  `remote_converger.ex`, `auth.ex`, the `hex.repo`, `hex.publish`, `hex.retire` and
  `hex.organization` tasks); the rebar3 source (`rebar_hex_repos.erl`, `rebar_packages.erl`,
  `rebar_pkg_resource.erl`) and the `rebar3_hex` source; and hex.pm's own package validation
  (`lib/hexpm/repository/package.ex`) for the name rule.
- **The live upstream.** `repo.hex.pm` sampled directly: `names`, `versions` and
  `packages/decimal` with their `ETag`, `Last-Modified` and `Cache-Control: public,
  max-age=3600` headers and `binary/octet-stream` content type, a `304` to `If-None-Match`, a
  `404` on a missing name and on `packages/Decimal`, a tarball served `application/octet-stream`
  with a seven-day `max-age`, a docs tarball with a one-day `max-age`, the `public_key` PEM,
  and `installs/hex-1.x.csv` answering `301` to `builds.hex.pm`. `hex.pm/api` sampled for the
  package and release JSON shapes, the `X-RateLimit-*` headers, a `403` on an unauthenticated
  retire and a `400` on a request with no `User-Agent`.

Where the documentation and the captures disagree, the captures win, and the disagreements are
recorded here because they would otherwise be built from the documents: the API blueprint
publishes releases at `POST /publish`, and Hex 2.5.1 (hex_core 0.18) posts to
`/packages/{name}/releases` while Hex 2.0.6 and rebar3_hex 7.0.11 post to `/publish`, so both
routes are the contract; the rebar3_hex README documents `rebar3 hex retire PACKAGE VERSION
--unretire`, and both 7.0.11 and the current 7.3.0 refuse the option; and the `endpoints.md`
note that mirrored repositories support `ETag` revalidation holds for Hex 2.0.6 and rebar3 but
not for Hex 2.5.1, which never sends `If-None-Match` for a registry resource (below).

Four things make this format worth a careful spec rather than a port of Cargo's. **The
registry resource carries the repository's name inside the signature**, and the client refuses
a payload whose name is not the name the client itself configured, so the wire name of a
repository is a property clients pin, not a URL detail. **Three documents are signed on every
write**, one per package and two repository-wide, by a key the handler must never hold. **The
proxied path cannot re-sign**: the client trusts hex.pm's key under the name `hexpm`, so a
cache serves the upstream's bytes or it serves nothing a client accepts. And **retirement is not
a yank**: both resolvers still select a retired version and only warn, so the format's one
client-driven management operation is a deprecation with a reason, and a registry that treated
it as a removal would break every lockfile that pins the version.

## Blocking preconditions

**The handler interface re-open must complete before this handler starts**, as for every
Tier 1 and Tier 2 handler (`format-handler-interface.md` AC8). Hex is Tier 2, so the
catalogue's Tier 1 gate (its AC5) and the charter's breadth verdict (its AC9, build step 8)
both precede it; the re-open is recorded here anyway, from this side, because a gate enforced
on one side only is enforced nowhere.

**The shared signing and index service must be `planned` before Phase 1.** Every registry
resource a hosted repository serves is a signed, write-triggered generated document produced by
`docs/internal/plans/foundation/signing-service.md` (to be authored in the spec loop), which the
charter builds at step 7 as the production form of what the step 4a prototype learned
(`write-triggered-services-prototype.md`). What this format requires of that service is stated
in Design ("What the signing service must provide"), never designed here; a Hex handler without
it can serve nothing, so Phase 1 waits on that spec.

**The management API must be `planned` before Phase 2's management half.** Retire, unretire,
revert and docs deletion are operations of
`docs/internal/plans/foundation/management-api.md` (to be authored in the spec loop), with the
clients' own routes served as bindings onto them (Design, "Retire, unretire and revert are
bindings"). AC6, AC7 and AC8 are untestable until that surface exists.

**Upstream signature verification and the trust anchor per upstream** are requested of the
signing service's verification entry and of `docs/internal/plans/foundation/upstream-adapters.md`
(to be authored in the spec loop) respectively, and are not assumed: the proxied path verifies
every cached payload against the upstream's configured public key before committing it (Design,
"The proxied path").

## Scope

**In scope:**

- The repository read surface under the format-first mount `/hex/{repository}/`: `names`,
  `versions`, `packages/{name}` as gzip-compressed `Signed` protobuf payloads, `tarballs/`,
  `docs/`, `public_key`, and the organization-prefixed forms `repos/{org}/...` where `{org}`
  equals the repository name.
- The HTTP API under `/hex/{repository}/api/`: both publish routes the client generations
  send, retire and unretire, revert (release deletion), docs publish and deletion, the package
  and user documents the publish flow and `mix hex.info` read, and the organization-prefixed
  forms of each; Erlang term format and JSON content negotiation on that surface.
- Signing: every hosted registry resource produced and signed inside the write by the shared
  signing service, the public key served at `public_key` with the OpenSSH-style fingerprint
  `mix hex.repo add --fetch-public-key` compares against, and the requirements this places on
  `signing-service.md`.
- The tarball contract: version 3 tarballs stored byte-identical, the inner and outer
  checksums computed server-side and advertised in the signed payload, and the addressed
  object taken from `metadata.config` with a bounded peek.
- Retirement with its five reasons and message as a metadata-only write; revert as a removal
  that retires the coordinate; docs as a replaceable file of the version; the write-boundary
  declaration `data-model.md` requires.
- Name and version rules exactly as hex.pm enforces them, and the repository-name binding the
  signed payload imposes on how clients configure a repository.
- Non-interactive authentication in the form both clients send (the bare token as the whole
  `Authorization` value on repository reads and on the API), the per-route addressed objects
  `auth.md`'s pattern scopes evaluate (AC11), and the `403` rendering of a shared policy
  refusal (AC12).
- The proxied path against hex.pm or a private Hex repository: classification per resource,
  no URL rewriting and no re-signing, verification of the upstream's signature before caching,
  stream-and-verify tarballs against the payload's `outer_checksum`, conditional revalidation,
  negative caching, organization upstreams, the `installs` pass-through, and Hex's rows of the
  upstream-removal table.
- Two pinned Hex generations and rebar3 as the conformance oracles, on both paths.

**Out of scope for v1**, each with its reason, recorded because the interface spec's definition
of done requires the deliberately unimplemented surface to be named:

- **The registry v1 format** (`registry.ets.gz` and `.signed`). `endpoints.md` marks it
  deprecated, no pinned client requests it, and Hex 2.0.6 refuses a repository that answers
  with a record it considers deprecated (captured: "Fetched deprecated registry record version
  ... For security reasons this registry version is no longer supported"). Serving it would put
  a surface in the matrix that the clients themselves reject.
- **Dependency policies** (`repos/{repo}/policies/{name}`, the `Policy` protobuf). Read by Hex
  only when a project sets `policy` (Hex 2.5.1's `HEX_POLICY`), never requested in any capture,
  and the concept (allow, deny, cooldown and retirement restrictions enforced at resolution) is
  the supply-chain policy `supply-chain-policy.md` already evaluates centrally; a second policy
  language served to one client would be a parallel enforcement path. Revisited by revising
  this spec when a consumer exists.
- **Virtual repositories.** A signed payload names exactly one repository and carries exactly
  one signature, and the client checks that name against the repository it configured, so a
  virtual repository could serve a hosted member's payload (named after itself) or an upstream
  member's (named `hexpm`) but never both under one client configuration. Not effort: the
  format's own verification rules make the merge unverifiable, and a configuration that creates
  one is refused (AC21; the resolved repository-name decision below).
- **Re-signing proxied content.** The captured reason is in Design; a client configured for
  hex.pm refuses a payload signed by anyone else (AC13), and a re-signed payload would carry
  our signature over content we did not author.
- **Hosted security advisories in the signed payload.** hex.pm embeds `SecurityAdvisory`
  entries (captured: `decimal 2.4.1 VULNERABLE! EEF-CVE-2026-32686`) and `mix hex.audit`
  reads them. A hosted repository has no advisory data that does not cross the policy boundary
  `supply-chain-policy.md` AC4 holds, and an empty `advisories` list is a "no known
  vulnerabilities" claim about content nobody checked, the false all-clear `npm.md` and
  `nuget.md` refused; hosted payloads therefore carry none, proxied payloads pass hex.pm's
  through verbatim (the resolved hosted-advisories decision below).
- **The API's user, key, owner, organization and search surfaces** beyond the two documents
  the publish flow reads. mix hex.user auth performs an OAuth device flow against hex.pm's
  own identity, `mix hex.organization` manages hex.pm tenancy, `mix hex.owner` mutates per-
  package ownership (the per-crate authorization `cargo.md` declined for the same central-
  authorization reason), and mix hex.search never reached the stub in any capture. Tokens are
  minted where `auth.md` and `credential-management.md` put them. The one exception kept in
  scope is `GET api/auth`, which the organization-auth task calls to validate a key and which
  costs one route (below).
- **hex.pm's mutation windows.** hex.pm allows a release to be replaced or reverted within one
  hour (24 hours for a new package); this registry refuses replacement outright and allows
  revert at any time under `delete` (the resolved immutability decision below), as `npm.md`
  decided for the public registry's own policy windows.
- **The `hexdocs` hosting surface.** Docs tarballs are stored and served at `docs/`, which is
  what `mix hex.docs fetch` reads; rendering them as a browsable site is UI-era work.

## Design

### The wire surface, as captured

Every path below hangs off the repository's base URL, `/hex/{repository}/`, format-first per
`format-handler-interface.md`'s resolved URL-shape decision. Both clients take an arbitrary
repository URL (`mix hex.repo add NAME URL`, rebar3's `repo_url`) and an arbitrary API URL
(`HEX_API_URL`, rebar3's `api_url`), so no root anchoring is needed; the API lives under the
repository at `/hex/{repository}/api/`, so one repository's read and write surfaces share one
prefix and one credential.

| Surface | Shape, as the pinned clients send it |
|---|---|
| Package resource | `GET {repo}/packages/{name}`, once per package involved in a resolution (direct and transitive), on **every** `mix deps.get`, `mix deps.update` and `rebar3 get-deps`, including runs that change nothing. No `Accept` header. Hex 2.5.1 sends `User-Agent: hex_core/0.18.0 hex/2.5.1 (elixir/1.18.4) (OTP/28) (erts/16.4.0.6)` and never a conditional header; Hex 2.0.6 sends `Hex/2.0.6 (Elixir/1.14.5) (OTP/26.2.5.15)`, `content-length: 0` on `GET`, and `if-none-match` with the stored `ETag`, taking the `304`; rebar3 sends `hex_core/0.12.2 (rebar3/3.27.0) (httpc) (OTP/27) (erts/15.2.7.13)`, `content-length: 0`, and no conditional header on this resource |
| `names`, `versions` | Never requested by any pinned client in any capture (dependency resolution is per package, `mix hex.search` uses the API). Defined by `registry-v2.md` and served for other consumers, signed like the package resource |
| Tarball | `GET {repo}/tarballs/{name}-{version}.tar`. Hex caches it under `HEX_HOME/packages/{repo}/` and re-downloads only when the cached file's outer checksum disagrees with the registry; rebar3 caches it with a sidecar `.etag` file and sends `if-none-match` on every later fetch, taking the `304` (captured on `rebar3 get-deps` after `rm -rf _build` and on `rebar3 upgrade`) |
| Docs tarball | `GET {repo}/docs/{name}-{version}.tar.gz` from `mix hex.docs fetch NAME VERSION`, extracted under `HEX_HOME/docs/{repo}/{name}/{version}/` |
| Public key | `GET {repo}/public_key` from `mix hex.repo add NAME URL --fetch-public-key FINGERPRINT`, with the `--auth-key` sent when given; the client compares the OpenSSH `SHA256:` fingerprint of the PEM's RSA key (`:mix_hex_repo.fingerprint`, the same form `mix hex.repo list` prints) and refuses on mismatch ("Public key fingerprint mismatch") |
| Update check | `GET {repo}/installs/hex-1.x.csv` on every registry-touching command, sent to whatever URL the `hexpm` repository resolves to (so to this registry when `HEX_MIRROR` or `mix hex.repo set hexpm --url` points here); a `404` costs only "Failed to check for new Hex version". Live repo.hex.pm answers `301` to `builds.hex.pm` |
| Organization forms | `GET {repo}/repos/{org}/packages/{name}` and `.../repos/{org}/tarballs/...` when the client's repository is `hexpm:{org}`, carrying `authorization: {org key}`; hex_core builds the prefix from `repo_organization` and verifies the payload's `repository` field against the organization name |
| Publish | Hex 2.5.1: `POST {api}/packages/{name}/releases?replace=false` (the name read from the tarball's own `metadata.config`), `Content-Type: application/octet-stream`, `content-length`, `expect: 100-continue`, `connection: close`. Hex 2.0.6 and rebar3_hex 7.0.11: `POST {api}/publish?replace=false`, no `Expect`. All three: `authorization: {api key}` as the whole header value and `accept: application/vnd.hex+erlang`; `--replace` sends `replace=true`; `--organization {org}` (Hex) inserts `repos/{org}/` after `{api}/`. The body is the version 3 tarball. The client expects `200` or `201` **with an Erlang-term body** (below); Hex 2.5.1 first sends `GET {api}/users/me` and reads the `organizations` of the answer |
| Retire, unretire | `POST {api}/packages/{name}/releases/{version}/retire` with `Content-Type: application/vnd.hex+erlang` and an Erlang-term map `%{"reason" => "security", "message" => "..."}` (`--message` is mandatory on both clients); `DELETE` on the same path unretires (`mix hex.retire ... --unretire`; rebar3_hex 7.0.11 and 7.3.0 refuse `--unretire` and offer no unretire, contrary to their README). Both answered `204` |
| Revert | `DELETE {api}/packages/{name}/releases/{version}` from `mix hex.publish --revert VERSION` and `rebar3 hex publish --revert VERSION`, answered `204` |
| Docs | `POST {api}/packages/{name}/releases/{version}/docs` with the gzip tarball as `application/octet-stream` (rebar3_hex `publish docs --doc-dir`, and after a successful package publish in `rebar3 hex publish`), answered `201`; `DELETE` on the same path (`publish docs --revert`), answered `204`. `mix hex.publish` runs the `docs` Mix task first and cannot publish docs without `ex_doc` |
| Package and user documents | `GET {api}/packages/{name}` (`mix hex.info`, and `mix hex.publish` without `--yes` to decide whether the package exists); `GET {api}/users/me` before publish and retire on Hex 2.5.1; `GET {api}/auth?domain=repository&resource={org}` with the organization key from `mix hex.organization auth {org} --key KEY`, expecting `204` |
| API error rendering | A non-2xx with an Erlang-term body `%{"status", "message", "errors"}` prints the message and each error (captured `422`: "Publishing failed / Validation error(s) / tarball: stub refused"); a `401` prints "Authentication failed (401)" (Hex) or "Failed to publish" with the status (rebar3_hex). A JSON body under `accept: application/vnd.hex+erlang` is decoded as `nil` and crashes the Hex publish flow (captured), so the API answers in the accepted format |
| Registry error rendering | Hex: on `404`, `401` or `403` from a package resource, "Failed to fetch record for {repo}/{name} from registry (using cache instead)" then "This could be because the package does not exist, it was spelled incorrectly or you don't have permissions to it" and `No package with name {name} ... in registry`; a `401` on a repository with no auth key configured first prompts "No authenticated user found. Do you want to authenticate now?" and fails non-interactively. A tarball failure prints `Request failed ({status})` and "Package fetch failed and no cached copy available ({url})". rebar3 prints "Failed to update package {name} from repo {repo}" and "Package not found in any repo: {name}" for every status |

Three facts about the clients' caches shape every second-request assertion. Hex re-fetches
every package resource on every run, so a warm `mix deps.get` is not a zero-request run: on
2.0.6 it is a run of `304`s and on 2.5.1 a run of full `200`s, and tarballs are served from
`HEX_HOME/packages` without a request as long as their outer checksum matches the registry.
rebar3 likewise re-fetches package resources and revalidates tarballs with `304`s. `HEX_OFFLINE=1`
makes zero requests and serves everything from the cache (captured). A case that proves this
registry served from cache therefore asserts at the network layer against the upstream, not
against the client's request count.

**The Hex 2.5.1 conditional-request regression is a captured fact, not an inference.** Its
registry server stores the resource's `ETag` from the response headers under a charlist key
(`headers[~c"etag"]` in `lib/hex/registry/server.ex`) while the hex_core httpc adapter it
bundles returns headers keyed by binaries, so the tag is never stored and `If-None-Match` is
never sent; Hex 2.0.6's headers map carries charlist keys (visible in its crash dump) and it
sends the tag. This registry serves `ETag` on every resource regardless, because 2.0.6 and rebar3
use it, and the corpus records both generations.

### Registry resources: signed protobuf, and what the client checks

The three resources are `Signed` protobuf messages, gzip-compressed **after** signing
(`hex_registry:build_*` signs the uncompressed payload and gzips the result): `payload` is the
serialised `Names`, `Versions` or `Package` message and `signature` is an RSA signature over
the SHA-512 digest of the payload, produced by `public_key:sign(Payload, sha512, Key)` and
checked by `public_key:verify(Payload, sha512, Signature, PublicKey)` (PKCS #1 v1.5 padding,
the OTP default for those calls). The client, per `hex_repo:get_protobuf/3` and
`hex_registry:decode_and_verify_signed/2`, gunzips, decodes `Signed`, verifies the signature
against the public key configured for the repository (`repo_verify`, off only under
`HEX_UNSAFE_REGISTRY=1` in both clients), decodes the payload, and then checks the payload's
`repository` field against the name it configured (`repo_verify_origin`, off only under
`HEX_NO_VERIFY_REPO_ORIGIN=1`, or `REBAR_NO_VERIFY_REPO_ORIGIN=1` for rebar3's default
repository; a rebar3 repository map may also set `repo_verify_origin => false`).

What each payload carries, from the schemas:

| Resource | Message | Fields this registry fills |
|---|---|---|
| `packages/{name}` | `Package` | `name`, `repository`, and one `Release` per version in publish order: `version`, `inner_checksum` (32 raw bytes), `outer_checksum` (32 raw bytes), `dependencies` (each `package`, `requirement`, `optional`, `app`, and `repository` **only when the dependency lives in another repository**), `retired` (`reason` enum and optional `message`) when retired, `published_at`. `advisories` and `advisory_indexes` are empty on the hosted path (Scope) |
| `versions` | `Versions` | `repository` and one `Package` per package: `name`, `versions` in publish order, `retired` as zero-based indexes into `versions`, `with_advisories` empty on the hosted path |
| `names` | `Names` | `repository` and one `Package` per package: `name`, `updated_at` |

The captured failure texts are the format's own conformance oracle for verification, and the
harness asserts them rather than paraphrases: a payload signed with another key makes Hex
2.5.1 print "Could not verify authenticity of fetched registry file because signature
verification failed ... Set HEX_UNSAFE_REGISTRY=1 to disable this check", Hex 2.0.6 print
"Could not verify authenticity of fetched registry file", and rebar3 log `Hex get_package
request failed: {error,bad_signature}` under `DEBUG=1`; a payload naming another repository
makes Hex 2.5.1 print "The configured repository name for your dependency {repo}/{name} does
not match the repository name in the registry ... Set HEX_NO_VERIFY_REPO_ORIGIN=1 to disable
this check", Hex 2.0.6 print the deprecated-record message quoted in Scope, and rebar3 report
the same generic failure as any other error.

### The repository name is inside the signature

This is the format's hardest trap and it decides two things at once. Because the `repository`
field is signed and checked against the client's own configuration, **the wire name of a hosted
repository is the name every client must configure**, and this registry has exactly one
candidate: the repository's own name, which is already the `{repository}` segment of its URL.
A hosted repository `acme` signs every payload with `repository: "acme"`, and a client consumes
it as `mix hex.repo add acme https://host/hex/acme --fetch-public-key SHA256:...` or rebar3
`#{name => <<"acme">>, repo_url => ..., repo_public_key => ...}`. A client that adds it under
any other name gets the origin failure above, which is honest: the name in the signature is
what the client is verifying. The organization-prefixed forms are served for the same reason:
`hexpm:acme` in a client resolves to `{hexpm url}/repos/acme/...` with the origin check against
`acme`, so `repos/{org}/` is served only when `{org}` equals the repository name and answers
`404` otherwise (AC21), and the API accepts `repos/{org}/` under the same rule so that
`mix hex.publish --organization acme` and `mix hex.retire --organization acme` reach the
repository they name.

On the proxied path the same rule points the other way. hex.pm signs `repository: "hexpm"`
with hex.pm's key, both clients ship that key and use it whenever the repository is called
`hexpm`, and the captures settle the consequence: the real `packages/decimal` payload served
byte for byte by the stub verified in all three clients configured with `HEX_MIRROR`,
`mix hex.repo set hexpm --url` or rebar3's `rebar_packages_cdn` and `hexpm` `repo_url`, while the
same content signed with this run's key under the name `hexpm` was refused by every client
until the client's key for `hexpm` was replaced (`mix hex.repo set hexpm --public-key`, rebar3
`repo_public_key` on the `hexpm` entry) or verification was disabled. A proxied hex.pm
repository is therefore **consumed as the client's `hexpm` repository and served unmodified**;
a proxied private organization on hex.pm (`https://repo.hex.pm/repos/{org}` as the upstream)
signs `repository: "{org}"` and is consumed as a plain client repository named `{org}` (the
resolved repository-name decision below). Nothing is re-signed and no name is rewritten,
because both would invalidate the one signature the client is willing to trust.

### Mapping onto the shared model

The levels are exactly those `data-model.md` provides; no table is added.

- `Package.name` holds the package name as hex.pm's rule defines it: `^[a-z][a-z0-9_]*$`,
  two to 255 bytes, so there is no folding and no display spelling; a request under any other
  case answers `404` as repo.hex.pm does for `packages/Decimal`. The package-level document
  holds the **retirement set** (every reverted `{name}/{version}` coordinate, never
  republishable), the package's `updated_at` for the `names` resource, and the stored
  `packages/{name}` document (below).
- `Version.version` holds the version string verbatim; hex.pm validates it as a semantic
  version (`Hexpm.Version.validate`), and this registry does the same at publish, refusing a
  string `Version.parse` would reject. The version-level document holds the parsed
  `metadata.config` the API's package document and the `Package` payload render (`app`,
  `description`, `licenses`, `requirements` with each entry's `app`, `optional`, `requirement`
  and optional `repository`, `build_tools`, `elixir`, `links`, `extra`), the inner and outer
  checksums, `published_at`, the retirement status, and the reference to the docs file.
- The tarball is the version's first `File`, its `Blob` keyed by the CAS digest of the bytes
  as received; that digest is, by the tarball specification, exactly the **outer checksum** the
  registry advertises, so the CAS key and the format's integrity value coincide as they do for
  Cargo, and the key is still the store's digest of the received bytes. The **inner checksum**
  (SHA-256 over `VERSION`, `metadata.config` and `contents.tar.gz` concatenated, uppercase hex
  in the tarball's own `CHECKSUM` entry) is computed at ingest, compared with the tarball's
  `CHECKSUM`, and kept in the version-level document; a tarball whose `CHECKSUM` disagrees is
  refused with `422`, because every client checks it on unpack (captured as Hex's
  `{inner_checksum_mismatch, ...}` and a rebar3 crash) and a registry that accepted it would
  publish a version nobody can install.
- The docs tarball is a second, replaceable `File` of the version (Design, "Docs are a
  replaceable file").
- The repository-level document holds the stored `names` and `versions` documents (below) and
  the identity of the repository's signing key as the signing service reports it; a `remote`
  repository's document caches the upstream's `names`, `versions` and `public_key` instead.

### Every hosted resource is a signed, write-triggered document

Per the resolved generation decision below, the three resources are produced by the shared
signing and index service inside the write that changes them, **stored, never rendered on
request**: `packages/{name}` in the package-level document, `names` and `versions` in the
repository-level document, each inline below `data-model.md`'s size threshold and as a CAS
blob above it, protected by the fourth GC mark root (`storage-and-gc.md`). hex.pm's `versions`
is 372 KB and its `names` 367 KB, so a repository proxying or mirroring at that scale crosses
the threshold; a private repository of a few dozen packages does not. Rendering on request
was rejected because a render is a signing operation, and signing on the read path puts key
material on the hot path of every resolution.

The rules the service applies for this format, stated as this format's requirements rather than
as the service's design:

- **Regeneration inside the write.** A publish regenerates `packages/{name}`, `names` and
  `versions`; a retirement or unretirement regenerates `packages/{name}` and `versions`; a
  revert regenerates all three; a docs publish regenerates none. Each lands in the same
  completed logical write and the same snapshot as the change that triggered it, so no
  snapshot serves a `versions` that disagrees with the `packages/{name}` beside it
  (`data-model.md`'s one-write-one-snapshot rule; the prototype's question 3).
- **Under contention, both land.** Two concurrent publishes into one repository each produce
  `names` and `versions` documents that include the other's package once both are complete,
  through the revision-token retry `data-model.md` makes mandatory, applied by the service.
- **Publish order is the order.** `Package.releases` and `Versions.Package.versions` list
  versions in publish order, as hex_core's builders emit them and as hex.pm serves them; the
  client sorts, the registry does not.
- **The `ETag` of a stored document is derived from its bytes**, so identical documents across
  snapshots share a tag, a repoint that changes the document changes it, and a `304` costs no
  signing.
- **A repoint restores the documents.** Because the documents live in the snapshot delta, a
  rollback serves exactly the signed resources of the snapshot it targets, signatures intact;
  a pointer moved backwards across a revert must preserve the retirement set
  (`data-model.md` AC33's obligation on the management surface).

### What the signing service must provide

Stated so the dependency on `docs/internal/plans/foundation/signing-service.md` (to be
authored in the spec loop) cannot be lost, and precisely enough that the service can be
specced against it:

1. **One RSA key pair per hosted Hex repository** of at least 2048 bits, and a signing
   operation that takes payload bytes and returns the RSA signature over their SHA-512 digest
   in the form `public_key:sign/3` produces, so that `hex_registry:decode_and_verify_signed/2`
   accepts it. The handler submits the serialised protobuf payload and receives the `Signed`
   message's signature; it never sees the private key, which an architecture test asserts as
   `write-triggered-services-prototype.md` AC5 does for Debian (AC22).
2. **The public key in SubjectPublicKeyInfo PEM**, served at `public_key` and shown in the
   management surface and UI together with its OpenSSH-style `SHA256:` fingerprint, because
   that fingerprint is what `mix hex.repo add --fetch-public-key` takes and `mix hex.repo list`
   prints; a wrong fingerprint form is a usability failure the captures showed (a SubjectPublicKeyInfo
   or PKCS #1 DER hash is refused).
3. **Synchronous signing inside a write**, three documents per publish, with the latency
   budget of a client's publish request; there is no asynchronous half on this format.
4. **Rotation as one write that re-signs every stored document of the repository** under the
   new key, exposed through the management API, together with the fact this spec records for
   operators: a Hex client pins exactly one key per repository and cannot hold two, so rotation
   is client-visible and every consumer re-adds the repository; the service's rotation
   operation is what makes the cutover atomic on the server side.
5. **A verification entry** that checks a `Signed` payload against a supplied public key PEM,
   used by the proxied path against the upstream's configured key (below), so that trust
   anchors and verification live in one place rather than in a handler.

Nothing is required of `docs/internal/plans/foundation/artifact-verification.md` (to be
authored in the spec loop): Hex signs the registry, never the artifact, and the tarball's only
integrity primitives are the two checksums the registry advertises. Advisory matching for Hex
coordinates is the policy engine's coordinate-level path (OSV carries the `Hex` ecosystem,
which is where hex.pm's own `SecurityAdvisory` entries point) and needs no handler cooperation.

### The publish path and what counts as a write

A publish is one `POST` carrying the whole tarball, at either of the two routes the client
generations send. What this registry enforces on ingest:

- The body is spooled to a bounded temporary buffer outside the CAS and parsed as a version 3
  tarball: a plain tar whose entries are `VERSION` (the ASCII integer `3`), `CHECKSUM`,
  `metadata.config` (an Erlang term file) and `contents.tar.gz`, in that order in every
  tarball the clients build (captured: `VERSION` at offset 0). A body that is not a tar, whose
  `VERSION` is not `3`, whose `metadata.config` fails to parse or lacks a required field, or
  whose `CHECKSUM` disagrees with the computed inner checksum is refused with `422` and an
  Erlang-term `errors` map naming the field, nothing committed; the client prints each error.
- The coordinate is `metadata.config`'s `name` and `version`, never anything in the URL:
  hex_core itself reads the name from the tarball to build the 2.5.1 route, and the `/publish`
  route carries none. The name must satisfy hex.pm's rule and the version must parse.
- **A coordinate that already exists is refused with `422`**, whether `replace` is `false` or
  `true`, and the message names the immutability rule (the resolved immutability decision
  below). The tarball at a coordinate is the artifact this registry's own proxy layer caches
  forever and both lockfiles pin by both checksums (`mix.lock`'s fourth and eighth fields,
  `rebar.lock`'s `pkg_hash` and `pkg_hash_ext`); a replacement would make every existing
  lockfile fail its checksum comparison against this registry.
- **A retired coordinate is refused the same way**: a reverted version joins the package's
  retirement set and is never republishable, with the same bytes or different ones, the
  cross-format rule `npm.md`, `pypi.md`, `nuget.md` and `maven.md` adopted.
- The response is `201` with an Erlang-term release document (`version`, `url`, `html_url`,
  `checksum` as the outer checksum in lowercase hex, `has_docs`, `retirement`, `inserted_at`,
  `updated_at`, `meta`, `requirements`, `publisher`), the shape the blueprint documents and
  the clients print from ("Package published to {html_url} ({checksum})").
- A publish to a proxied repository answers `405`.

`data-model.md` requires each format spec to declare its ecosystem's write boundaries and makes
metadata-only mutations snapshot-creating writes. Hex's declaration:

- **One publish `POST` is one completed logical write**: the version, its tarball file and the
  three regenerated signed documents land in one snapshot, and the `packages/{name}` served
  from the head snapshot carries the release before the response is sent.
- **Each retirement and each unretirement is one metadata-only write**, setting or clearing
  the version's `retired` status and regenerating `packages/{name}` and `versions`. Retirement
  deletes nothing and excludes nothing: both resolvers still select a retired version (captured
  on all three clients: Hex prints `RETIRED!` with the reason and message and "Found retired
  packages, see above for details"; rebar3 prints "Warning: package {name}-{version} is
  retired: ({reason}) {message}"), and `HEX_IGNORE_RETIREMENTS` silences the warning.
- **A revert is one removal write**: the version leaves the head snapshot, its coordinate
  enters the retirement set in the same write, and all three documents are regenerated.
- **Each docs publish is one write replacing the version's docs file**, and a docs deletion is
  one write removing it; neither regenerates a registry document, because no registry resource
  names docs.
- A proxied repository creates no snapshots at all; payload arrival and revalidation are cache
  materialisation.

### Retire, unretire and revert are bindings

`mix hex.retire`, `rebar3 hex retire`, `mix hex.publish --revert` and `rebar3 hex publish
--revert` are real client commands, so this format is in npm's and Cargo's category in
`docs/internal/analysis/management-surfaces-and-the-oracle.md`: trigger and effect are both
oracle-testable. Per the cross-format precedent (`pypi.md`'s resolved hosted-yank decision,
with `npm.md`, `ansible-collections.md`, `cargo.md` and `nuget.md`), each operation is an
operation of the registry-owned management API,
`docs/internal/plans/foundation/management-api.md` (to be authored in the spec loop), and the
clients' routes are **bindings onto the same operation**, one implementation behind two ways
in:

| Operation | Client binding | Effect a client sees | Action |
|---|---|---|---|
| Retire a version (reason, message) | `POST .../releases/{version}/retire` from `mix hex.retire` and `rebar3 hex retire` | `retired` on the release in `packages/{name}` and the version's index in `versions.retired`; both resolvers warn and still select it | `push` |
| Unretire a version | `DELETE .../releases/{version}/retire` from `mix hex.retire --unretire` (no rebar3 binding exists) | The status clears | `push` |
| Revert a version | `DELETE .../releases/{version}` from `mix hex.publish --revert` and `rebar3 hex publish --revert` | The version leaves every document, the tarball answers `404`, the coordinate is retired forever | `delete` |
| Delete docs | `DELETE .../releases/{version}/docs` from `rebar3 hex publish docs --revert` and `mix hex.publish docs --revert` | `docs/{name}-{version}.tar.gz` answers `404`, `has_docs` is false | `push` |

Rules, applying the precedent rather than re-deciding it: each operation is one completed
logical write through the shared write path, exactly one snapshot, none for a refused one, no
blob-store object deleted directly; authorization is the settled `(repository, action)`
vocabulary with no new action, retirement and docs deletion being metadata-class and revert
removal-class (the resolved retirement-action decision below); hosted only, a proxied
repository taking its retirements and removals from the upstream per the removal table; the
trigger is verified by the real clients through the bindings and by this registry's
integration tests through the management endpoint, and every effect by a real resolve. What
this format requires of `management-api.md`: the four operations above on the object
`{name}/{version}`, retirement carrying one of the five reasons (`other`, `invalid`,
`security`, `deprecated`, `renamed`) and a message of at most 140 characters as hex.pm bounds
it, the retirement set carried forward by every later write and preserved across a backwards
repoint, and the same semantics and authorization from either entry point (AC8).

hex.pm's own restriction that a package cannot be reverted after its window is hex.pm policy,
not enforced, as `npm.md` decided for the same class of rule.

### Docs are a replaceable file

hex.pm lets documentation be re-published at any time, and `rebar3 hex publish` uploads docs
after every package publish, so the docs tarball is the one coordinate on this format whose
bytes may legitimately change. It is stored as its own `File` of the version, replaced whole by
each docs publish, served byte-identical at `docs/{name}-{version}.tar.gz` with an `ETag`
derived from its bytes, and removed by docs deletion; the version's `has_docs` in the API's
release document follows it. On the proxied path it is mutable metadata with a TTL for the
same reason (below). Nothing in a registry resource references it, so its replacement is never
a registry regeneration.

### The API speaks Erlang terms

Both clients send `accept: application/vnd.hex+erlang` on every API request and encode request
bodies with `term_to_binary/1` under `Content-Type: application/vnd.hex+erlang` (the retire
body is captured as an external-term map with binary keys). hex_core decodes a response body
only when its `Content-Type` matches that type and yields `nil` otherwise, which crashed the
Hex publish flow against a JSON answer in this run. The API therefore answers in the external
term format whenever the request accepts it, encoding maps with binary keys, strings as
binaries, lists, integers, and the atoms `nil`, `true` and `false`, and answers JSON
(`application/json`) otherwise, so `curl` and the transcript stay readable; request bodies
are decoded with a safe decoder that creates no atoms beyond those three, the same restriction
hex_core's `hex_safe_binary_to_term` applies on the client side. The blueprint's error shape
`%{"status", "message", "errors"}` is used for every refusal on this surface. A request with no
`User-Agent` is answered `400` as hex.pm does, because the header is what identifies the client
generation in the transcript. The rate-limit headers hex.pm sends are not emulated: no client
reads them.

The two read documents the publish flow needs are minimal but real: `GET api/users/me` answers
the authenticated principal (`username`, `email`, `organizations` as an empty list, timestamps),
because Hex 2.5.1 fetches it before every publish and retire and reads `organizations`; and
`GET api/packages/{name}` answers the package document the blueprint defines (`name`,
`repository`, `meta`, `releases` with `version`, `url`, `has_docs` and `inserted_at`,
`retirements`, `downloads` as zeros, `owners` as the publishers recorded, `latest_version`,
`latest_stable_version`, `html_url`, `docs_html_url`, `configs`), because `mix hex.info` renders
it and a publish without `--yes` asks it whether the package exists. `GET api/auth` answers
`204` for a valid credential, because `mix hex.organization auth` validates its key there.

### Names and versions: nothing folds

Package names are lowercase by hex.pm's rule, and the registry matches them byte for byte on
every route; there is no display spelling to keep and no permutation to look up. A tarball
filename `{name}-{version}.tar` is parsed at the first `-`, which is unambiguous because a name
cannot contain one. Versions are matched verbatim and never normalised: `1.0.0` and `1.0` are
two strings and only the first is a valid Hex version. The one thing this registry validates
beyond hex.pm's rule is that a name in a URL matches `^[a-z][a-z0-9_]*$` before any lookup, so
a path such as `packages/../x` is refused rather than resolved.

### Authentication: a bare token, on reads and on the API alike

Both clients present a credential as **the token string alone, the whole `Authorization`
value, with no scheme**: on repository reads, `authorization: {auth key}` from `mix hex.repo
add --auth-key` or rebar3's `repo_key` (or `HEX_REPOS_KEY`), sent preemptively on every package,
tarball, docs and public-key request once configured; on the API, `authorization: {api key}` from
`HEX_API_KEY` or the user-auth task. That is exactly the scheme-less form `auth.md` added to its
client table and verifier for Cargo (its AC31), so no new presentation form is needed; the
client table needs a `mix` and a `rebar3` row, listed in this spec's sibling consequences. How
this meets `auth.md`, whose rules this spec does not bend:

- **The challenge is uniform and not an existence oracle.** A credential-less request under a
  repository that is not anonymously readable answers `401` whether the repository is private,
  missing or someone else's; a request carrying a valid token that lacks `pull` answers `404`,
  indistinguishable from a missing repository (`auth.md` AC17), and Hex's own message for both
  ("does not exist ... or you don't have permissions") already reads that way. A rejected
  credential answers `401` and is never served as anonymous (`auth.md` AC12). No
  `WWW-Authenticate` value is needed: neither client parses one for repository reads, and
  Hex's reaction to a `401` is to offer interactive authentication, which non-interactive runs
  decline (captured); so the operator documentation says to configure `--auth-key` up front.
- **API refusals.** A publish, retire or revert on a repository the caller can read but lacks
  the action on answers `403` with the term-format error body; a credential-less one answers
  `401`, which Hex renders as "Authentication failed (401)".
- **OAuth exchange is a hex.pm feature and is documented away.** Hex 2.5.1 exchanges an auth
  key for a short-lived OAuth token whenever the repository is `hexpm` or an organization of it,
  and hangs for a minute when the exchange endpoint is this registry (captured); a hexpm-named
  repository pointed here with a key therefore needs `mix hex.repo set hexpm
  --no-oauth-exchange`, after which the bare key arrives (captured). Repositories added under
  their own name default to no exchange and need nothing.
- **Untrusted mirrors send no credential**, by both clients' own contract: under `HEX_MIRROR`
  (Hex) or `HEX_MIRROR_URL` (rebar3) no auth key is sent, and rebar3 additionally switches
  signature and origin verification off for that mirror, which is why the documentation for a
  proxied repository names `mix hex.repo set hexpm --url` and rebar3's `rebar_packages_cdn` or
  `hexpm` `repo_url` rather than the mirror variables.
- **TLS.** `auth.md` requires TLS on every credential-bearing path and refuses plaintext
  credentials unless the operator's flag is set (its AC27); the harness's transcript capture
  terminates TLS with its CA injected through `HEX_CACERTS_PATH` for Hex. rebar3's CA
  injection was not exercised in this pass and is confirmed when its auth cases are written.

### Addressed objects and pattern scopes

`auth.md`'s pattern scopes narrow a credential within one repository by matching the object
each request addresses, and the format declares which object each route reports ("Pattern
scopes" there; `format-handler-interface.md` AC12). The canonical object is the package name,
and `{name}/{version}` where a version is addressed; both are literal on every route, and no
folding is needed because the ecosystem has none.

| Route | Object kind | Canonical object |
|---|---|---|
| `names`, `versions` | none | - (they enumerate the repository) |
| `packages/{name}` | named | `{name}` |
| `tarballs/{name}-{version}.tar`, `docs/{name}-{version}.tar.gz` | named | `{name}/{version}` |
| `public_key`, `installs/hex-1.x.csv` | none | - (repository-wide) |
| `repos/{org}/...` forms | as the unprefixed route | as the unprefixed route |
| Publish (both routes) | named | `{name}/{version}`, from `metadata.config` in a **bounded peek** at the tarball's leading entries in the streamed body (the resolved publish-object decision below); a body whose `metadata.config` is not found within the bound is refused before any byte reaches the CAS |
| Retire, unretire, revert, docs publish and deletion | named | `{name}/{version}`, from the URL |
| `api/packages/{name}` | named | `{name}` |
| `api/users/me`, `api/auth` | none | - (identity routes, no object) |

What that gives and costs, applying `auth.md`'s rules rather than re-deciding them. Nothing on
the read side fetches a repository-wide document first, so a credential holding only a
patterned `pull` under `acme_*` resolves every `acme_*` package and its in-pattern dependencies
through a real `mix deps.get` or `rebar3 get-deps`, fails on the first dependency outside it, and
is refused `names`, `versions` and `public_key` (so a patterned credential cannot use
`--fetch-public-key`; the fingerprint is pasted instead). On the write side the client
generation decides: rebar3_hex 7.0.11 and Hex 2.0.6 publish without touching an identity route,
so a `push` patterned `acme_*/**` publishes and retires through them, while Hex 2.5.1 fetches
`api/users/me` first and a patterned-only credential fails there, which AC11 asserts rather than
leaving implied, and which the operator documentation records beside the recipe (a patterned
`push` beside an unpatterned `pull` on the same token does not help, since the identity route
is under `push`'s action).

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines, on a
package, tarball or docs route of either path, the handler answers `403` with a `text/plain`
body naming the policy and rule, or naming the signal for a coordinate condemned under the
shared security-signal rule. `403` rather than the existence rule's `404`, because the caller is
authorized and the content is what is refused. The body reaches nobody through the pinned
clients: Hex prints its generic three-cause message for a refused package resource and
`Request failed (403)` for a refused tarball, and rebar3 its generic failure, all captured for
the same rendering paths with other statuses, so the body is for `curl` and the transcript.
That is the reason-phrase risk `pypi.md` named and `maven.md` confirmed, confirmed here for two
more clients and carried to `supply-chain-policy.md` as a finding rather than worked around.

### The proxied path

The handler owns the request and classifies for the proxy layer's fetch-and-cache API per the
settled decisions in `proxy-cache.md`; the upstream is a repository base URL (`https://repo.hex.pm`,
`https://repo.hex.pm/repos/{org}` with the organization key as the upstream credential, or a
private Hex repository) together with the upstream's public key PEM, defaulting to hex.pm's,
validated at configuration by fetching `public_key` and `names` and verifying the latter
against the former (AC21).

- **Every registry resource is served byte for byte**, verified before caching. `packages/{name}`,
  `names` and `versions` are mutable metadata with a TTL; repo.hex.pm serves `ETag`,
  `Last-Modified` and `Cache-Control: public, max-age=3600` and answers `304` to
  `If-None-Match` (captured), so revalidation uses the entity tag and an unchanged payload
  costs a `304` upstream. Before a fetched payload is committed, its signature is verified
  against the upstream's configured key through the signing service's verification entry and
  its `repository` field is checked against the upstream's expected name (`hexpm`, or the
  organization); a payload failing either is never committed, the serve-stale rules of
  `proxy-cache.md` apply, and the operator is alerted, because on this format that is what an
  upstream key rotation looks like. Clients' own conditional requests are answered `304` from
  the cache under this registry's `ETag` inside the TTL.
- **Tarballs are immutable artifacts**, cached indefinitely (repo.hex.pm serves them with a
  seven-day `max-age` and the coordinate is immutable by the ecosystem's own rule outside
  hex.pm's one-hour window), fetched **stream-and-verify against the `outer_checksum`** the
  cached `packages/{name}` payload advertises for that version, never committed on a mismatch
  or a truncated body. No completion-only mode is needed: every version on this wire carries a
  digest.
- **Docs tarballs are mutable metadata with a TTL** revalidated on the upstream's `ETag`, because
  hex.pm replaces them at any time (its one-day `max-age` says as much).
- **`public_key` is mutable metadata with a long TTL**, served verbatim so that
  `--fetch-public-key` against a proxied repository yields the upstream's key, which is the key
  the client needs for payloads it will receive unmodified.
- **`installs/hex-1.x.csv` is mutable metadata with a TTL**, fetched by following the
  upstream's redirect to `builds.hex.pm` in the adapter, because a client whose `hexpm`
  repository points here asks for it on every command and the `404` alternative prints a
  warning on every run.
- **No URL rewriting exists on this format.** No payload carries a registry URL: tarball and
  docs paths are derived by the client from the repository URL, and the only URLs in a
  `Package` payload are advisory links to osv.dev. Like Maven, this format has no
  externally-visible-base-URL dependency on the proxied path.
- **Organization upstreams need nothing new.** A remote repository bound to
  `https://repo.hex.pm/repos/{org}` fetches `packages/{name}` under that base with the
  organization key as its upstream credential; its payloads name `{org}` and clients consume the
  repository under that name (above). The client's own key is never forwarded; the upstream
  credential is the adapter's.
- **Missing packages are negatively cached** with the short TTL: repo.hex.pm answers `404`
  with a `text/plain` body and both clients treat it as "no such package"; a `429` or `5xx`
  is never cached as absence (`proxy-cache.md` AC9).
- **Publish and every management operation against a `remote` repository answer `405`.**

**Cross-repository dependencies are a client-side routing directive.** A `Dependency` whose
`repository` field is set names another repository, and the two clients read it differently:
Hex fetches that dependency from **its own** configured repository of that name (captured:
`zzcross` in the stub's repository depending on decimal with `repository: hexpm` sent Hex to
its `hexpm` repository, which was the mirror stub), while rebar3 ignores the field and asks
each of its configured repositories in order (captured: it asked the stub's repository for
decimal, took the `404`, then fetched it from `hexpm`). This registry serves the field
verbatim and rewrites nothing; a private package on a hosted repository that depends on hex.pm
packages therefore resolves them through whatever the consumer calls `hexpm`, which the
recipe makes this registry's hex.pm remote repository.

Upstream removal maps onto the settled purge-or-flag table as Hex's side of that contract:

| Upstream event, as observed at revalidation | Classification |
|---|---|
| A release gains or loses `retired` (any reason, `RETIRED_SECURITY` included), or `advisories` entries appear or change | An **ordinary metadata change**, propagated verbatim at the next revalidation: retirement keeps the version installable by the ecosystem's own semantics (both resolvers select it and warn), and advisory entries are the upstream's rendering of the OSV data the policy engine's feed already carries. Neither is an explicit security signal on this wire |
| A release vanishes from `packages/{name}` (hex.pm's revert within its window, or an administrative removal) | Keep serving, record an operator-visible divergence; the wire carries no reason |
| `packages/{name}` answers `404` where it previously existed | Keep serving, record a divergence |
| A release's `outer_checksum` or `inner_checksum` changes (hex.pm's replace within its window) | An **immutability violation** treated as the explicit signal: purge the cached tarball for that version and alert, then re-fetch and verify against the new digest on demand, because every consumer that locked the old checksums would otherwise disagree with this registry; hex.pm's replace is legitimate for an hour, which is why the alert says what happened rather than only that it happened |
| The payload's signature no longer verifies against the upstream's configured key, or its `repository` field changes | An integrity failure at fetch: not committed, serve stale within the limit, alert; the operator updates the upstream's key if the upstream rotated |

Detection happens at revalidation, passively, per `proxy-cache.md`'s resolved passive-detection
decision (was Q12); the active channel is the policy engine's advisory feed, which carries the
`Hex` ecosystem through OSV, and it is the only channel that condemns a Hex coordinate as
malicious under the shared security-signal rule. Nothing on this wire is an explicit security
signal.

### Conformance, the three clients and the corpus

The two pinned Hex generations straddle real watersheds: 2.0.6 posts to `/publish`, sends
`If-None-Match` on registry resources and `content-length: 0` on `GET`, prints the deprecated-
record message on an origin mismatch and `unauthorized` on a `401`; 2.5.1 posts to
`/packages/{name}/releases` with `Expect: 100-continue`, never sends a conditional header, fetches
`api/users/me` before writes, performs the OAuth exchange for hexpm-shaped repositories, and
prints the two verification messages quoted above. rebar3 3.27.0 is the second client of the
ecosystem (the catalogue counts one ecosystem and no multiplier row; both clients appear in the
matrix's Client column under the Hex row), with rebar3_hex 7.0.11 pinned for its write commands
because the current 7.3.0 fails before any request against rebar 3.27.0 (a `badmatch` in
hex_core's `hex_cli_auth`, captured under `DIAGNOSTIC=1`) and is recorded on the exception
list with the plugin's issue rather than worked around. Every hosted and proxied read case
runs on all three; every write case runs on both Hex generations and on rebar3_hex 7.0.11.

The recorded surface for the replay corpus, named now because a thin recording script yields a
thin specification: a cold `mix deps.get` of a package with a transitive dependency against
repo.hex.pm, the same on 2.0.6 with its `304`s, `rebar3 get-deps` with its tarball `304`s,
`mix deps.update --all`, `mix hex.docs fetch`, `mix hex.package fetch --unpack`, `mix hex.info`,
a missing package, and, against a private Hex reference server run in a container and pinned by
digest because hex.pm accepts no test publish, a publish on each client generation, the
duplicate and retired refusals, `mix hex.retire` and `--unretire`, `rebar3 hex retire`,
`rebar3 hex publish docs --doc-dir`, both reverts, and the `401` on a private read followed by
the keyed retry. Recording gates on the harness's redaction criterion (`conformance-harness.md`
AC13); the bare-token `Authorization` value is exactly the kind of header an allowlist must
name. Every deliberate divergence from hex.pm (replacement refused, revert allowed outside the
window, no advisories in hosted payloads, no `installs` on a hosted repository, `405` on remote
writes, and the rebar3_hex 7.3.0 exclusion) goes on the recorded exception list before its flow
is expected to replay.

## Acceptance Criteria

- [ ] AC1: `mix deps.get` resolves and installs a package and its transitive dependency from a
      hosted repository configured as `mix hex.repo add {repository} {format-first URL}
      --public-key`, on both pinned Hex generations (2.0.6 and 2.5.1), and `rebar3 get-deps`
      does the same with the repository in its `hex` `repos` list; the transcript shows one
      `packages/{name}` fetch per package and one tarball fetch per version, `mix.lock` and
      `rebar.lock` carry the inner and outer checksums the served payload advertised, a warm
      run on 2.0.6 and on rebar3 revalidates with `If-None-Match` and receives `304`s, and
      `HEX_OFFLINE=1` makes no request.
- [ ] AC2: Every hosted `packages/{name}`, `names` and `versions` resource is a gzip-compressed
      `Signed` payload whose signature verifies against the served `public_key` under
      `hex_registry:decode_and_verify_signed/2` and whose `repository` field equals the
      repository name; `mix hex.repo add --fetch-public-key` with the `SHA256:` fingerprint
      the management surface displays, equal to what `mix hex.repo list` prints for the same
      key, succeeds and with another fingerprint is refused; a
      repository consumed under a wrong public key produces each client's captured signature
      failure and one consumed under another name each client's captured origin failure, with
      `HEX_UNSAFE_REGISTRY=1` and `HEX_NO_VERIFY_REPO_ORIGIN=1` restoring each in turn.
- [ ] AC3: `mix hex.publish package --yes` on both pinned Hex generations and `rebar3 hex publish
      package --repo --yes` on rebar3_hex 7.0.11 are accepted with `201` and a term-format
      release document, whichever of the two publish routes the client sends, producing exactly
      one snapshot in which the tarball file and the regenerated `packages/{name}`, `names` and
      `versions` all land, with the package resource serving the release before the response
      is sent, the release carrying the `inner_checksum` and `outer_checksum` of the received
      bytes and its `published_at`, the `names` entry its `updated_at`, and the `201` document
      carrying `checksum`, `html_url`, `inserted_at` and `has_docs`; a subsequent resolve from
      a fresh client cache on every client installs exactly the published bytes, and a publish
      whose `CHECKSUM` disagrees with its contents, or whose `contents.tar.gz` entry is
      missing, is refused with `422` and nothing committed.
- [ ] AC4: A publish of an existing coordinate is refused with `422` whether or not `--replace`
      is given, on every client, with the client printing the refusal message and no snapshot
      created; a publish of a reverted coordinate is refused the same way with the same or
      different bytes, including after the revert's snapshot has been pruned out of retention;
      and a tarball whose name violates `^[a-z][a-z0-9_]*$` or whose version does not parse is
      refused with `422` naming the field.
- [ ] AC5: The API answers term-format bodies to a request accepting
      `application/vnd.hex+erlang` and JSON otherwise, encoding `nil`, `true` and `false` as
      atoms and every refusal as `%{"status", "message", "errors"}`, decodes term-format
      request bodies without creating atoms, answers `400` to a request with no `User-Agent`,
      answers `api/users/me` with the principal's `organizations` as an empty list so that Hex
      2.5.1's publish proceeds, and `mix hex.info {name}` renders the package document of a
      hosted package on both Hex generations.
- [ ] AC6: `mix hex.retire {name} {version} security --message ...` on both Hex generations and
      `rebar3 hex retire ... --repo` are each answered `204` and retire a version in exactly one snapshot: the release
      carries `retired` with the reason and message, `versions` lists the version's index in
      `retired`, a fresh `mix deps.get` and `rebar3 get-deps` still select the version and print
      their captured retirement warnings, `HEX_IGNORE_RETIREMENTS` silences Hex's, the tarball
      still serves, and `mix hex.retire --unretire` clears it with one further snapshot.
- [ ] AC7: `mix hex.publish --revert {version} --yes` and `rebar3 hex publish --revert` each remove
      the version in exactly one snapshot: it leaves all three documents, its tarball answers
      `404`, its coordinate is retired (AC4), and a resolve that pinned it fails on every client;
      `rebar3 hex publish docs --doc-dir --repo` stores a docs tarball that `mix hex.docs fetch`
      retrieves byte-identical and flips the release's `has_docs` to true, a second docs
      publish replaces it, and `publish docs --revert` removes it and flips `has_docs` back,
      none of the three touching a registry document.
- [ ] AC8: A retirement, an unretirement, a revert and a docs deletion driven through the
      registry-owned management endpoint produce the same served documents, exactly one
      snapshot each, and the same authorization outcome as the same operation driven through
      the client bindings; a principal holding `pull` alone is refused retirement and docs
      deletion, one holding `push` without `delete` is refused revert, through both entry points
      with no snapshot created; and every operation against a proxied repository answers `405`.
- [ ] AC9: `packages/{Name}` in any other case, `packages/../x`, and a tarball path whose name
      part is not a valid name each answer `404`; a hosted `repos/{org}/...` route answers as the
      unprefixed route when `{org}` is the repository name and `404` otherwise, and
      `mix hex.publish --organization {repository}` and `mix hex.retire --organization
      {repository}` reach the repository through the API's prefixed form.
- [ ] AC10: On a private repository a credential-less package, tarball or `public_key` request
      answers `401` byte-identical for a private and a non-existent repository, both Hex
      generations then resolve with the token as `--auth-key` and rebar3 with `repo_key`, the
      transcript showing the bare token as the whole `Authorization` value on every read,
      `content-length: 0` on the older clients' `GET`s accepted; a valid token lacking `pull`
      answers `404`; a rejected token answers `401` and is never served as anonymous;
      `HEX_API_KEY` carries the same token to the API as `authorization: {api key}` and a
      wrong key is refused `401` with Hex printing "Authentication failed (401)";
      `mix hex.organization auth {repository} --key` validates the key at `api/auth` and is
      answered `204`; a `hexpm`-named repository pointed here through
      `mix hex.repo set hexpm --url` with an auth key resolves only after
      `--no-oauth-exchange`, asserted from the transcript; and a credential presented over a
      connection this registry did not terminate with TLS is refused per `auth.md` AC27.
- [ ] AC11: A token holding only `pull` under the pattern `acme_*/**` resolves `acme_tool` and
      its in-pattern dependency through real `mix deps.get` (both generations) and `rebar3
      get-deps` and is refused `other_tool`'s package resource and tarball, `names`, `versions`
      and `public_key`; a token holding `push` under the same pattern publishes and retires
      `acme_tool` through rebar3_hex 7.0.11 and Hex 2.0.6 and is refused `other_tool`, with no
      snapshot created by a refusal, while Hex 2.5.1 under the same token fails at
      `api/users/me`, all asserted from the transcript; a tarball whose `metadata.config` lies
      beyond the bounded peek is refused before any byte reaches the CAS; and in proxied mode
      the patterned-`pull` token fetches an in-pattern package and is refused another.
- [ ] AC12: A package, tarball or docs request the shared policy layer refuses answers `403`
      with a `text/plain` body naming the policy, on the hosted and the proxied path, and real
      `mix deps.get` and `rebar3 get-deps` of the refused version exit non-zero naming the
      status, with the body captured in the transcript.
- [ ] AC13: The proxied path serves a hex.pm stand-in's `packages/{name}` payload byte-identical
      to the upstream's, and both Hex generations under `HEX_MIRROR` and `mix hex.repo set hexpm
      --url`, and rebar3 under `rebar_packages_cdn` and a `hexpm` `repo_url`, verify it with
      their built-in hex.pm key and install the package; from fresh client caches a second
      resolve on each client reaches this registry while the upstream receives no request,
      asserted at the network layer; the tarball was verified against the payload's
      `outer_checksum` before commit and is byte-identical; and the same payload re-signed under
      this registry's key is refused by every client configured for `hexpm`, which is the
      captured reason nothing is re-signed.
- [ ] AC14: A proxied `packages/{name}` is revalidated after its TTL and not before, with
      `If-None-Match` so an unchanged payload costs a `304` upstream; a version published
      upstream becomes visible to `mix deps.get` and `rebar3 get-deps` after the TTL and, absent
      an explicit refresh, not before; a client's own `If-None-Match` (Hex 2.0.6, rebar3 on
      tarballs) inside the TTL is answered `304` without an upstream request; and a proxied docs
      tarball replaced upstream is served anew after its TTL.
- [ ] AC15: A remote repository bound to an organization upstream stand-in (`.../repos/{org}`)
      with an upstream credential serves its payloads unmodified, the upstream receives that
      credential and never the client's, a client consuming the repository under the name
      `{org}` verifies and installs, and one consuming it under any other name gets its origin
      failure; and under `HEX_MIRROR` and `HEX_MIRROR_URL` no client credential reaches this
      registry, asserted from the transcript.
- [ ] AC16: An upstream retirement, unretirement or advisory change is propagated verbatim at
      the next revalidation with no divergence recorded; a release vanishing from the payload,
      or the payload answering `404`, keeps serving with a divergence recorded; a changed
      `outer_checksum` purges that version's cached tarball, raises the operator alert, and the
      next fetch verifies against the new digest; and a payload that no longer verifies against
      the upstream's key is not committed, is served stale within the limit, and raises the
      alert: Hex's side of the settled removal table in `proxy-cache.md` (its AC13), with a
      coordinate condemned through the advisory feed refused with no upstream request.
- [ ] AC17: A stand-in payload with a tampered signature, a tampered `repository` field, or a
      tarball whose bytes disagree with the advertised `outer_checksum`, is never committed to
      the CAS and attaches no cached reference, the client receives the same failure it would
      from a corrupt upstream, and the real failure reason is recorded observably to the
      operator.
- [ ] AC18: A package the upstream lacks is answered `404` and negatively cached, so a second
      request within the negative TTL makes no upstream request, while an upstream `429` or
      `5xx` is neither cached as absence nor surfaced as not-found and succeeds as soon as the
      upstream recovers.
- [ ] AC19: A hosted package whose dependency names `repository: hexpm` is served with the field
      intact, Hex resolves that dependency from its own `hexpm` repository (this registry's
      hex.pm remote repository in the recipe) and rebar3 from its repositories in order,
      both asserted from the transcripts, and a dependency with no `repository` resolves in the
      same repository as its parent on every client.
- [ ] AC20: Replay-match passes against a corpus recorded from repo.hex.pm and from the pinned
      private Hex reference server covering the recorded surface named in Design.
- [ ] AC21: Configuring a remote repository whose upstream does not answer a PEM `public_key`
      and a `names` payload that verifies against it is refused at configuration with a message
      naming the requirement; configuring a virtual repository of format `hex` is refused with
      a message naming the signed-repository rule; and a hosted `installs/hex-1.x.csv` answers
      `404` while a proxied one passes the upstream's CSV through, following its `301` to the
      `builds.hex.pm` stand-in, so that a `hexpm`-named client pointed at the proxied
      repository prints no update-check warning.
- [ ] AC22: Every hosted registry resource is produced and signed by the shared signing service
      inside the triggering write, never by the handler, proven by an architecture test that the
      handler package imports neither key material nor a signing primitive; two concurrent
      publishes into one repository both land and the served `names` and `versions` enumerate
      both, each regenerated document committing in the same snapshot as the file that
      triggered it, proven by repointing to that snapshot's predecessor and reading the previous
      documents with their previous signatures; a `versions` document above the inline size
      threshold is stored as a CAS blob, protected across a GC sweep by the CAS-backed-metadata
      mark root, and served to a real client afterwards; and a key rotation through the
      management surface re-signs every stored document in one write, after which a client that
      re-adds the repository with the new fingerprint resolves and one holding the old key gets
      its signature failure.
- [ ] AC23: A hosted `packages/{name}` carries no `SecurityAdvisory` entries in `advisories`
      and `versions` no `with_advisories` indexes, `mix hex.audit` against a hosted repository
      reports nothing; a proxied payload carrying upstream advisories is served verbatim and
      both Hex generations print the advisory on resolve and `mix hex.audit` reports it.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/hex/hosted_test.go` (both pinned Hex images and the rebar3 image; fresh `HEX_HOME` and rebar3 cache in setup; lock files parsed for both checksums; `304`s and the offline zero-request run asserted from the transcript and at the network layer) |
| AC2 | conformance + integration | `conformance/hex/signing_test.go` (`--fetch-public-key` with the displayed and a wrong fingerprint; wrong-key and wrong-name repositories on all three clients with each captured message asserted; the two escape hatches); `internal/format/hex/signed_docs_test.go` (every served resource decoded and verified with a Go port of `decode_and_verify_signed` against the served key; `repository` field asserted) |
| AC3 | conformance + integration | `conformance/hex/publish_test.go` (publish on each client, route per client asserted from the transcript, fresh-cache resolve on every client, byte comparison; a `CHECKSUM`-mismatched fixture through `curl`); `internal/format/hex/publish_test.go` (snapshot count and content set, head-snapshot visibility before the response) |
| AC4 | conformance + integration | `conformance/hex/publish_test.go` (duplicate with and without `--replace` per client; reverted coordinate republish through real clients); `internal/format/hex/immutability_test.go` (retirement with same and different bytes, after pruning under an injected clock; name and version refusals) |
| AC5 | conformance + unit | `conformance/hex/api_test.go` (`mix hex.info` on both generations; `curl` with and without the term-format `Accept`, and with no `User-Agent`); `internal/format/hex/etf_test.go` (encoder and safe decoder round-trips, atom creation refused) |
| AC6 | conformance + integration | `conformance/hex/retire_test.go` (retire through each client, resolve on every client with the warning text asserted, `HEX_IGNORE_RETIREMENTS`, unretire); `internal/format/hex/retire_test.go` (one snapshot per operation, tarball retained, `versions.retired` indexes) |
| AC7 | conformance + integration | `conformance/hex/revert_docs_test.go` (revert through each client, pinned resolve fails; rebar3_hex docs publish, `mix hex.docs fetch` byte comparison, docs replace and revert); `internal/format/hex/revert_test.go` (one snapshot, retirement set, docs writes touching no registry document) |
| AC8 | conformance + integration | `conformance/hex/manage_binding_test.go` (twin packages in one `script`: one operated through the management endpoint, one through the client binding; served documents compared); `internal/format/hex/manage_binding_test.go` (snapshot count per entry point, `pull`-only and `push`-only refusals, `405` on remote) |
| AC9 | conformance + unit | `conformance/hex/names_test.go` (`curl` for the case, traversal and invalid-name paths; `--organization` publish and retire through real `mix`); `internal/format/hex/route_test.go` (`repos/{org}` equality rule) |
| AC10 | conformance + integration | `conformance/hex/auth_test.go` (private repository on all three clients; challenge equality across existing and missing repositories; keyed retry; `pull`-less token; rejected token; `HEX_API_KEY` right and wrong; the `--no-oauth-exchange` case from the transcript); `internal/format/hex/auth_test.go` (plaintext refusal under `auth.md` AC27) |
| AC11 | conformance + unit | `conformance/hex/auth_test.go` (the pattern-refusal case `format-handler-interface.md` AC7 requires, in both modes; pattern-scoped tokens provisioned through the `credentials` key; reads on all three clients, writes on rebar3_hex 7.0.11 and Hex 2.0.6, the Hex 2.5.1 `users/me` failure asserted; a deep-`metadata.config` fixture through `curl`); `internal/format/hex/scope_object_test.go` (the object table, per route, `format-handler-interface.md` AC12) |
| AC12 | conformance | `conformance/hex/policy_test.go` (hosted and proxied modes; rules through the `policies` key, a controlled advisory through `advisories`; `mix` and `rebar3` transcripts) |
| AC13 | conformance + integration | `conformance/hex/proxied_test.go` (stand-in serving recorded repo.hex.pm payloads and tarballs; all three clients under each configuration form; network-level assertion from fresh caches; byte comparison; the re-signed variant refused); `internal/format/hex/proxied_verify_test.go` (outer-checksum verification before commit) |
| AC14 | conformance | `conformance/hex/proxied_ttl_test.go` (mutating stand-in serving `ETag`; upstream `304` and client `304` at the network layer; docs replacement) |
| AC15 | conformance | `conformance/hex/proxied_org_test.go` (organization stand-in with an upstream credential; consumption under the organization name and under a wrong one; mirror variables on both clients with the credential absence asserted) |
| AC16 | integration | `internal/format/hex/removal_test.go` (stand-in presenting each event class, including a key change; the shared-layer half is `proxy-cache.md` AC13's) |
| AC17 | integration | `internal/format/hex/proxied_integrity_test.go` (tampered signature, tampered name, mismatched tarball; CAS and reference assertions; operator record) |
| AC18 | conformance | `conformance/hex/proxied_test.go` (missing name and throttling stand-in responses, network-level counts) |
| AC19 | conformance | `conformance/hex/cross_repo_test.go` (a hosted package depending on a proxied hex.pm package; Hex and rebar3 transcripts; the same-repository default) |
| AC20 | conformance | `conformance/hex/replay_test.go` |
| AC21 | integration + conformance | `internal/format/hex/upstream_config_test.go` (non-PEM key, unverifiable `names`, virtual refusal); `conformance/hex/installs_test.go` (hosted `404`, proxied pass-through with the redirect stand-in, a `hexpm`-named client's output asserted free of the warning) |
| AC22 | architecture test + integration | `internal/format/hex/arch_test.go` (no key material or signing primitive in the handler); `internal/format/hex/concurrent_publish_test.go` (two writers, documents and predecessor repoint); `internal/storage/metadata_root_test.go` (threshold crossing, sweep, serve); `internal/format/hex/rotation_test.go` (re-sign in one write, old and new key verification through a real client in the conformance half) |
| AC23 | conformance | `conformance/hex/advisories_test.go` (hosted payload fields asserted with `curl` and a decoder; `mix hex.audit` on hosted and proxied repositories, the stand-in carrying a recorded advisory) |

The case set needs only keys already in the harness's closed `setup` vocabulary (its resolved
closed-vocabulary decision, was Q4): `repositories` with their visibility and type,
`credentials`, an `upstreams` stand-in (a fixture server serving recorded repo.hex.pm payloads,
tarballs, `public_key` and the `installs` redirect, and an organization variant), `state` for
pre-published, pre-retired and pre-reverted versions, and `policies` with `advisories` for AC12
and AC23. One obligation on the seed path is recorded rather than assumed: a `state` entry for a
hosted Hex version must be signed to be servable, so the seed path invokes the same signing
service the write path does, which is a requirement on `conformance-harness.md`'s provisioner
listed in the sibling consequences. The issued credential reaches the clients as `--auth-key`
and `HEX_API_KEY` (Hex) and as `repo_key` and `HEX_API_KEY` (rebar3). The runner-enforced
obligations, both modes and the unauthenticated, unauthorized and pattern-refusal cases in each,
apply from the sibling specs and are not restated per criterion here.

## Implementation Phases

### Phase 1: Hosted reads and the signed documents
- Waits on `docs/internal/plans/foundation/signing-service.md` reaching `planned` (Blocking
  preconditions)
- The format-first mount with the `repos/{org}` equality rule, `packages/{name}`, `names` and
  `versions` through the signing service with `ETag` and `304`, tarballs and docs through the
  CAS, `public_key` with the fingerprint in the management surface, the name rule, the
  challenge and scope mapping, the per-route addressed objects and the `403` policy rendering

### Phase 2: The API, publish and management
- Both publish routes with the bounded peek, tarball validation and both checksums, duplicate
  and retirement refusals, term-format content negotiation and the safe decoder, the user and
  package documents, `api/auth`, docs publish and deletion, the write-boundary declaration
  exercised end to end under concurrency
- Retire, unretire, revert and docs deletion as bindings onto the registry-owned operations,
  the retirement set, key rotation as a management operation: waits on
  `docs/internal/plans/foundation/management-api.md` reaching `planned` (Blocking
  preconditions; AC6, AC7, AC8, AC22's rotation half)

### Phase 3: Proxied path
- Upstream validation with the key and the `names` probe, verification of every payload
  against the upstream's key before commit, classification per resource, stream-and-verify
  tarballs against `outer_checksum`, `ETag` revalidation, negative caching, organization
  upstreams, the `installs` redirect pass-through, the removal table with the checksum and key
  rows, `405` on remote writes

### Phase 4: Corpus and gate
- Recording session across the named surface (after the harness redaction gate) against
  repo.hex.pm and the pinned private reference server, replay-match, the second pinned Hex
  generation and rebar3 with rebar3_hex 7.0.11, the exception-list entries named in Design, the
  matrix rows for the deliberately unimplemented policies, registry v1 and virtual repositories

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. The eight questions this draft raised were each written in the template's decision
shape and then adopted at their own recommendation under the owner's standing delegation of
2026-09-26, so the loop can continue; each is recorded below as adopted rather than decided,
folded through Scope, Design, the criteria and the Test Plan in the same pass, and reversible
by the owner at any time. `grep -rn "standing delegation"` is the owner's review queue.

### Resolved: the repository name in the signature, and what a proxied repository serves (was Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a hosted repository
signs `repository` as its own name and clients configure it under that name; a proxied
repository serves the upstream's payloads byte for byte, consumed under the upstream's name
(`hexpm`, or the organization); nothing is re-signed, and virtual repositories are refused for
this format (Scope; Design, "The repository name is inside the signature" and "The proxied
path"; AC2, AC13, AC15, AC21).

The question: the signed payload names its repository and the client checks that name against
its own configuration, so the registry must choose whose name and whose signature a proxied
payload carries. The capture settled the constraint: a hex.pm payload served unmodified verifies
under `hexpm` in all three clients, and the same content re-signed under this run's key was
refused by all three until the client's `hexpm` key was replaced.

**Recommendation:** A. It is what the unmodified clients accept, it keeps hex.pm's trust chain
intact (this registry never asserts authorship of content it did not author), it keeps key
material off the read path, and it costs one recipe line: point the client's `hexpm` at the
proxied repository rather than adding it under a new name.

| Option | You get | It costs |
|---|---|---|
| **A. Hosted signs as itself; proxied serves upstream bytes unmodified under the upstream's name; no virtual repositories** | Every unmodified client verifies; hex.pm's signature is what clients check; no signing on reads | A proxied hex.pm can only be the client's `hexpm`; a hosted repository's name is pinned by its clients; no virtual aggregation on this format |
| **B. Re-sign every proxied payload under the repository's own name and key** | A proxied repository can be consumed under any name, and a virtual repository becomes expressible | Every client must be reconfigured with this registry's key for hex.pm content, this registry's key vouches for content it did not author, upstream key rotation becomes invisible to consumers, and signing lands on every cache miss |
| **C. Serve both: unmodified at one mount, re-signed at another** | Both recipes work | Two signed representations of one upstream document, the B costs for the second, and a matrix claim per mount |

**Why this is yours:** it decides whether this registry is ever a signing authority over content
it proxies, a trust-posture call, and it removes virtual repositories from one format.

Accepted cost: the recipe and the exception-list entry for virtual repositories, and a hosted
repository that cannot be renamed without every consumer re-adding it.

### Resolved: replacement and revert against the immutability rule (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a publish of an
existing coordinate is refused with `422` whether or not `replace=true` is sent; revert is
allowed at any time under `delete` and retires the coordinate forever (Scope; Design, "The
publish path"; AC4, AC7).

The question: hex.pm allows `--replace` for an hour after a publish (a day for a new package)
and private packages "can be re-published or completely removed" per `private_packages.md`; the
cross-format rule the sibling specs adopted is refuse-and-retire.

**Recommendation:** A. Both lockfiles pin both checksums and compare them against the registry
on every fetch, the proxy layer caches the tarball forever, and a replaced tarball would make
every consumer's next fetch fail against this registry with the same checksum error a corrupt
download produces; revert is the honest correction, and retiring the coordinate is what keeps
the lockfiles that pinned it failing loudly rather than installing different bytes.

| Option | You get | It costs |
|---|---|---|
| **A. Refuse replacement; revert any time under `delete`; coordinate retired** | Coordinate-to-bytes immutability the lockfiles rely on; one rule with every sibling | A publisher who shipped a broken 1.0.0 bumps to 1.0.1; `--replace` is a real client flag that always fails here |
| **B. hex.pm's windows: replace and revert within an hour** | The public registry's habit | A mutable coordinate for an hour, caches and lockfiles disagreeing inside it, and a clock-dependent rule the corpus replays under one timing only |
| **C. Replace allowed for private repositories, as hex.pm allows for private packages** | Fix-in-place for teams | Every private consumer's lockfile breaks on the replacement, which is the failure mode the rule exists to prevent |

**Why this is yours:** it sets what operators may correct in place, against an immutability
property the proxy layer and every lockfile rely on.

Accepted cost: the `422` on `--replace` and the revert-outside-the-window divergence on the
exception list.

### Resolved: which action retirement requires (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: retirement,
unretirement and docs deletion require `push`; revert requires `delete` (Design, "Retire,
unretire and revert are bindings"; AC8).

The question: `auth.md` maps removal-class operations to `delete` and metadata changes to
`push`, `cargo.md` and `pypi.md` mapped yank to `delete`, `nuget.md` mapped unlist to `push`,
and `management-api.md` must reconcile them. Hex's retirement has to be placed.

**Recommendation:** A. Retirement is captured as a deprecation, not a yank: both resolvers still
select a retired version and warn, exactly as npm's deprecation message is surfaced, and unlike
a Cargo yank or a PyPI yank, which exclude the version from new resolutions. A metadata change
that removes nothing from resolution is `push` under `auth.md`'s own rule, and revert, which
removes, is `delete`.

| Option | You get | It costs |
|---|---|---|
| **A. Retire under `push`, revert under `delete`** | The vocabulary applied by effect: a publisher's key retires, only a removal-class key removes | A `push` key can mark a version `security`-retired, which is louder than a deprecation but still installs |
| **B. Retire under `delete`, as yank is** | One rule for every "mark a version" operation | Misclassifies an operation that removes nothing, and a CI key that publishes cannot retire its own release |

**Why this is yours:** it places an ecosystem's operation on a vocabulary you settled, and it is
an input to the reconciliation `management-api.md` owes.

Accepted cost: one more row for that reconciliation, recorded in the sibling consequences.

### Resolved: where the signed documents are produced (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: all three resources are
produced and signed by the shared signing and index service inside the triggering write,
stored at the package and repository levels, CAS-backed above the threshold, with the handler
holding no key (Design, "Every hosted resource is a signed, write-triggered document"; AC22;
the Phase 1 precondition).

The question: `cargo.md` and `nuget.md` render their unsigned package documents on request;
`helm.md` and `maven.md` store write-triggered documents; a signed document could in principle be
rendered and signed on each read.

**Recommendation:** A. A render on read is a signing operation on the hot path with the key
in reach of every request, `names` and `versions` are repository-scoped and contended exactly
as Maven's and Helm's documents are, and the service is built at the same step for this class.

| Option | You get | It costs |
|---|---|---|
| **A. The signing service generates, signs and stores all three inside the write** | No key on the read path; the snapshot rule holds by construction; one regeneration implementation with Maven, Helm, Debian and RPM | Phase 1 waits on that spec; three signatures per publish on the write's latency |
| **B. Render and sign on request** | No stored documents | Signing on every resolution of every package, key material reachable from the read path, and contention moved to a cache |
| **C. Render `packages/{name}` on request, store the repository-wide two** | Fewer stored documents | Two production paths for one signature, and the key on the read path for the document clients fetch most |

**Why this is yours:** it sequences this format behind a shared service and decides that a
signing key never serves a read.

Accepted cost: the precondition, and the requirement list on the signing service.

### Resolved: hex.pm as a preconfigured upstream (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: repo.hex.pm is
user-configured in v1 and not added to the preconfigured set; the trigger for revisiting is the
catalogue's Tier 2 verdict, through `proxy-cache.md`'s own extension mechanism (its resolved
preconfigured-set extension, was Q14), which left crates.io and pub.dev on the same footing.

**Recommendation:** B, for sequencing rather than effort: Hex is Tier 2 and built only if the
breadth gate says so, so amending a sibling's settled decision on its account now would be a
half-applied change against a format that may not be built.

| Option | You get | It costs |
|---|---|---|
| **A. Preconfigure repo.hex.pm now** | Elixir caching in thirty seconds | A sibling decision reopened from a Tier 2 spec before the gate that decides whether Tier 2 happens |
| **B. User-configured in v1, revisited on the Tier 2 verdict** | No sibling amendment; the adapter validation rule still ships | A worse first-run story than for npm until the revisit, and no nightly run against the real repo.hex.pm |

**Why this is yours:** it amends a set you priced for three upstreams, a product and sequencing
call.

Accepted cost: the proxied cases run against a stand-in only; the real repo.hex.pm is exercised
by the recording session and nothing scheduled, until the revisit.

### Resolved: security advisories in hosted payloads (was Q6)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: hosted payloads carry
no `advisories` and no `with_advisories`; proxied payloads pass hex.pm's through verbatim
(Scope; Design, "The proxied path"; AC23).

The question: hex.pm embeds OSV advisories in the `Package` payload and `mix hex.audit` and
the resolver render them; the policy engine holds OSV data for the `Hex` ecosystem, but the
handler cannot reach it without crossing the boundary `supply-chain-policy.md` AC4 holds, and
an empty list reads as an all-clear.

**Recommendation:** B, the `npm.md` and `nuget.md` precedent applied to a payload field: no
false all-clear, no boundary crossed, and the cache keeps every upstream warning. The
`Deps` advisory read `nuget.md` asked of `supply-chain-policy.md` is the same read this format
would use to fill the field later, and this spec adds a second consumer to that request rather
than a second request.

| Option | You get | It costs |
|---|---|---|
| **A. Fill hosted advisories from the policy engine's OSV data** | `mix hex.audit` works on private dependencies' public transitive packages | A new advisory read in `Deps` before its owner has specced it, and a signed payload whose content changes on every feed sync |
| **B. Hosted: none; proxied: verbatim** | Honest; nothing built twice | `mix hex.audit` against a hosted repository reports nothing, which the documentation states |
| **C. An empty list on hosted payloads as a positive claim** | The client is satisfied | The registry asserts "no known advisories" about content it never checked |

**Why this is yours:** it prices a false all-clear against a missing warning, a security-posture
claim the product will be held to.

Accepted cost: hosted audit is documentation until the `Deps` advisory read lands.

### Resolved: identity routes under the repository mount report no object (was Q7)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: `api/users/me` and
`api/auth` report `none`, so a patterned credential is refused them, and the consequence that
Hex 2.5.1 cannot publish under a patterned-only `push` is asserted and documented rather than
worked around (Design, "Addressed objects and pattern scopes"; AC11).

The question: Hex 2.5.1 fetches `api/users/me` before every write, and `auth.md` never
authorizes a `none` object for a patterned scope, so the one Hex generation that most people run
cannot use a patterned `push`. The route could instead be exempted from scope evaluation as an
authentication-only route.

**Recommendation:** A. An authentication-only route is a third object kind `auth.md` does not
have, and inventing it here would be a handler deciding its own authorization; rebar3_hex and
Hex 2.0.6 publish under a patterned `push` today, and the honest answer for 2.5.1 is a
documented limitation plus a sibling note that a future `auth.md` revision could add the kind.

| Option | You get | It costs |
|---|---|---|
| **A. `none`; limitation documented and asserted** | No new object kind; the rule applied as written | Patterned `push` publishes only through rebar3 and older Hex |
| **B. Exempt identity routes from the pattern rule** | Patterned `push` works on every client | A per-handler exception to the central rule, which is the class of thing `auth.md` AC18 exists to catch |

**Why this is yours:** it accepts a client-generation limitation rather than bending a security
rule you settled.

Accepted cost: the documentation line and the sibling note.

### Resolved: the addressed object of a publish (was Q8)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the publish reports
`{name}/{version}` from a bounded peek at the tarball's leading entries in the streamed body,
and a body whose `metadata.config` lies beyond the bound is refused before any byte is spooled
to the CAS (Design, "Addressed objects and pattern scopes"; AC11).

The question: the 2.5.1 route carries the name but neither route carries the version, and
the `/publish` route carries nothing; the coordinate lives in `metadata.config` inside the tar.
`nuget.md` and `helm.md` faced the same shape and adopted a bounded peek.

**Recommendation:** A. Every tarball the clients build places `VERSION`, `CHECKSUM` and
`metadata.config` as the first three entries (captured: `VERSION` at offset 0, the metadata a
few hundred bytes in), so a streaming reader finds the coordinate within a small bound; a tar
that hides it later is refused with the reason, a loud failure rather than an over-grant.

| Option | You get | It costs |
|---|---|---|
| **A. Bounded peek; refuse when not found** | Patterned `push` is expressible on this format; nothing unauthorized is spooled | A hand-built tarball with its metadata deep in the archive is refused until rebuilt |
| **B. Report `none` for publish** | No peek | A patterned `push` never authorizes a publish, so per-package CI credentials are impossible here |
| **C. Trust the 2.5.1 route's name and report `{name}` only** | No peek on the newer route | The older route carries no name at all, and the version is never in either URL, so the object is incomplete on both |

**Why this is yours:** it decides what a patterned CI credential can do on this format and adopts
a sibling's precedent for a security boundary.

Accepted cost: the bound is a configured constant, recorded with the refusal message.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | 9669f4b | authoring pass: grounded first draft, not a review | Grounded the wire contract three ways: captured traffic from Hex 2.5.1 (Elixir 1.18.4, OTP 28), Hex 2.0.6 (Elixir 1.14.5, OTP 26) and rebar3 3.27.0 (OTP 27, hex_core 0.12.2) with rebar3_hex 7.0.11, all pinned by image digest, run in containers against a logging stub serving registry resources built and signed with the client's own vendored hex_core under a run-local RSA key in three name variants, plus real repo.hex.pm payloads and tarballs for the proxied cases (cold and warm resolves with the `304` behaviour per client generation, offline, `deps.update`, wrong key and wrong name with each client's message, the two escape hatches, `--fetch-public-key` with the fingerprint form, auth-key reads with and without a key, the mirror forms of both clients with and without credentials, the OAuth-exchange hang and `--no-oauth-exchange`, hex.pm-shaped organizations through `mix hex.organization auth` and rebar3's `hexpm:org`, the real hex.pm payload verifying unmodified on all three clients and the re-signed one refused, publish on both routes with `--replace`, `--organization`, `--dry-run`, a `422` refusal and a wrong key, retire and unretire with their term-format bodies, revert, rebar3_hex docs publish and revert, `mix hex.docs fetch`, `mix hex.package fetch --unpack`, `mix hex.info`, `mix hex.audit`, a corrupt tarball on both clients, a missing package, a 3 MB tarball, a retired newest version and an exact pin on it, `HEX_IGNORE_RETIREMENTS`, a cross-repository dependency on both clients, and rebar3_hex 7.3.0 failing before any request); the hexpm/specifications documents, the hex_core protobuf schemas and source, the Hex, rebar3 and rebar3_hex sources (which explain the Hex 2.5.1 conditional-request regression and the `--unretire` gap), and hex.pm's name validation; and the live repo.hex.pm and hex.pm API (headers, `304`, `404` on case and absence, `public_key`, the `installs` redirect, the JSON shapes, rate-limit headers, the unauthenticated `403` and the `400` without a `User-Agent`). Design built from that: the signed protobuf resources and what the client verifies; the repository name inside the signature with its two consequences (hosted name pinned, proxied served unmodified under `hexpm`); the shared model mapping with both checksums; the three write-triggered signed documents produced by the shared signing service with a five-item requirement list; the publish path with both routes, the bounded peek and immutability; retirement as a deprecation-class binding under `push` and revert under `delete`; docs as a replaceable file; term-format content negotiation; the bare-token auth form already in `auth.md`'s verifier; the addressed-object table with the Hex 2.5.1 `users/me` consequence; the `403` rendering; the proxied classification with signature verification before commit, stream-and-verify against `outer_checksum`, organization upstreams, the `installs` redirect, no rewriting and no re-signing, the cross-repository directive read two ways by the two clients, and Hex's rows of the removal table. Eight questions written in decision shape and adopted under the standing delegation: the name-in-signature rule with no re-signing and no virtual repositories (AC2, AC13, AC15, AC21), replacement refused and revert retiring (AC4, AC7), retirement under `push` (AC8), the signing service producing stored documents (AC22), repo.hex.pm not preconfigured, no hosted advisories (AC23), identity routes as `none` (AC11), and the bounded-peek publish object (AC11). Twenty-three criteria, each with a Test Plan row. Sibling consequences recorded in the authoring report, not applied here: `auth.md` client-table rows for `mix` and `rebar3`; the `management-api.md` operations and the retirement row for its action reconciliation; the `signing-service.md` requirement list including the verification entry; the `upstream-adapters.md` per-upstream public key and the `builds.hex.pm` redirect; the `conformance-harness.md` seed path signing hosted `state`; Hex's rows in `proxy-cache.md`'s removal table; the reason-phrase finding for `supply-chain-policy.md` and a second consumer for its `Deps` advisory read; and a Hex row in the management-surfaces analysis. Stays draft; awaits an independent review. |
