---
status: planned
status_description: "Planned by the Fable recheck of 2026-10-08 at 485f58d: a full review pass (every sibling citation verified at HEAD; the client source at dart-lang/pub master re-read; the adversarial lens on the repository spec v2, the three-step publish, retraction and discontinuation, the lockfile path, the two SDKs and the hosted-url forms; constitution compliance) plus the re-examination of the Opus adoption Q6 (confirmed, its cost and fold amended: a lockfile pinning a shadowed member's version re-resolves loudly; the per-request virtual form with the member-list floor; advisories follow the supplying member; shadowing by exact spelling) and of Q1, Q2, Q4 and Q5 (confirmed). New Q7 adopted on Fable, owner-facing, superseding Q3: a hosted listing carries advisoriesUpdated only for a package some advisory record stands against, the value the feed's forward-moving freshness because the client replaces its cache only on a later value, the advisories document rendered from the reader with versions enumerated because the client ignores ranges (AC11). Found in the client source and folded: the current client sends If-None-Match and resolves from its cache on a 304, so the listing goes through ServeRendered's lazy form with the advisory input in its validator identity, archives through ServeFile, HEAD and Cache-Control narrowing through the door (new AC19). Brought current from the consequences queue: the stale auth and management-api wording, the spool bound (management-api was-Q20) and a decompression bound at finalize (AC3), the unchanged publish declined (was-Q15), proxy-cache was-Q19 (count zero), was-Q21 and was-Q24, the authorizer out of Deps, the publish stand-in named (pub-dev's fake server) with its exception row reported. Seven resolved, none open; 19 criteria, each with a Test Plan row; check-spec zero failures; fable_recheck cleared. Earlier: reconciled 2026-09-28 at fe2a39f with the foundation wave on Opus (not a review): retraction, un-retraction and discontinuation are management-api's withdraw, restore and annotate kinds (delete, delete, push) with no binding, 405 repository-type on remote and virtual, the wire publish keeping its 400 (AC6, AC7, AC14); the swr_ token shape checked against the client's token grammar (AC4); the Bearer challenge as auth's per-format declaration; upload sessions per data-model AC26 and AC27; refusals through WriteRefusal, the capture filling pub's pending binding row (AC16); proxied archives through allowlisted redirects, cache-scoped Last-Modified, removal rows by proxy-cache event class (AC8 to AC10); nothing to verify or sign, cited from artifact-verification and signing-service; the advisory reader noted for Q3's later revisit; Q6 adopted, virtual repositories served first member wins per package (AC17); Capabilities and the rename case (AC18). Earlier, 2026-09-26 at da0aecd: Q2 revised to the registry-owned management API, per-route addressed objects and the 403 rendering added. Authored 2026-09-26 at 4d1aeb1 as a grounded first draft from the client source, the repository specification v2 and live pub.dev probes, with no client captured. Six questions adopted under the owner's standing delegation; none open. Awaits a first independent review before it can reach planned."
description: "Spec for the Pub format (Dart and Flutter): the hosted pub repository API v2, hosted and proxied, where the client unilaterally enforces content hashes, excludes retracted versions, and deletes its stored token on any 401."
author: michielvha
goal: "Give Dart and Flutter teams a private and caching pub repository whose behaviour is pinned to what the real dart pub client does, including the three rules it enforces without asking the server: content-hash verification, retracted-version exclusion, and stored-token deletion on 401."
priority: "low"
issue: 20
created: 2026-09-26
covers:
  - "internal/format/pub/**"
  - "conformance/pub/**"
---

# Plan: Pub (Dart and Flutter) format

The hosted pub repository API, version 2, hosted and proxied: version listings with content
hashes, gzipped-tar archives, the three-step publish flow, retraction and discontinuation as
the ecosystem's own removal semantics, and the proxied path against pub.dev with `archive_url`
rewriting.

## Context

Pub sits in Tier 2 of `formats/catalogue.md` as a single-ecosystem family ("Pub", reaching Dart
and Flutter). Unlike npm, whose write half is undocumented, and unlike PyPI, whose upload is a
convention without a PEP, pub's read and write halves are both published in one document: the
Hosted Pub Repository Specification v2 in the `dart-lang/pub` repository, which also holds the
client. That makes the protocol cheap to describe and does not make it easy to serve, because
the client enforces three rules unilaterally, none of which a server can negotiate away:

- **It verifies content hashes.** Since Dart 2.19 the client hashes every downloaded archive and
  compares it to the listing's `archive_sha256`; a mismatch is reported as "a problem on the
  package repository" and the lockfile records the hash so a later `dart pub get` can detect
  drift (`_downloadAndExtract` in `lib/src/source/hosted.dart`; SDK changelog for 2.19.0).
- **It excludes retracted versions from resolution** unless the version is already in
  `pubspec.lock` or pinned by an exact `dependency_overrides` entry (`_getAllowedRetracted` in
  `lib/src/solver/version_solver.dart`). Retraction is the ecosystem's soft delete, and the
  client, not the server, is what makes it mean anything.
- **It deletes its stored token on any 401** from a URL under the hosted URL, on the reasoning
  that the server has told it the token is invalid (`_AuthenticatedClient.send` and
  `withAuthenticatedClient` in `lib/src/authentication/client.dart`). A registry that answers 401
  where the spec says 403 or 404 logs its users out of it.

One count-integrity note, the same shape as npm's and PyPI's: the catalogue's row reaches Dart
and Flutter through one client. dart.dev states that `flutter pub <subcommand>` and
`dart pub <subcommand>` drive the same pub command-line interface, and the Flutter SDK bundles a
Dart SDK. The catalogue's resolved client-reach decision (was Q5, its AC2) makes every client its
multiplier table names a claim proven per client, and Pub has no multiplier row: it counts one
client, `dart pub`, which this spec tests (AC1), and Flutter is the language reach of that
client rather than a second counted one. Counting `flutter pub` separately would need a row in
that table and its own run first.

**Grounding for this draft, stated plainly.** Neither `dart` nor `flutter` is installed on the
authoring host (`which dart flutter` found nothing), so no traffic was captured this run. Every
protocol claim below is grounded against, in this order of authority: the client source at
`dart-lang/pub` master (fetched 2026-09-26: `lib/src/source/hosted.dart`,
`lib/src/command/lish.dart`, `lib/src/command/token_add.dart`, `lib/src/authentication/*.dart`,
`lib/src/http.dart`, `lib/src/solver/version_solver.dart`, `lib/src/solver/report.dart`,
`lib/src/validator/name.dart`); the repository specification v2 in the same repository
(`doc/repository-spec-v2.md`); the pub.dev server source at `dart-lang/pub-dev` for the parts
the specification does not cover (retraction and discontinuation are pub.dev's own API, not
the spec's); live probes of pub.dev on 2026-09-26 for the upstream's actual headers, redirect
and error shapes; and the Dart SDK changelog for the client versions at which behaviours
appeared. Where the specification and the client disagree, the client wins, and one such
disagreement is recorded below (the hosted-url trailing slash). Per the standing rule, every row
is re-grounded in captured traffic when the recording corpus is made, and the corpus wins any
disagreement with this document.

The Fable recheck of 2026-10-08 re-read the client source at `dart-lang/pub` master
(`lib/src/source/hosted.dart`, `lib/src/http.dart`, `lib/src/command/lish.dart`,
`lib/src/solver/report.dart`) and found three facts the draft had not recorded, each folded
below: the current client sends `If-None-Match` with the listing's cached `ETag` and uses its
cached listing on a `304` (`_fetchVersionsNoPrefetching`; the `ETag` must satisfy its RFC 9110
entity-tag grammar, `_isValidETag`); its advisories cache is replaced only when the listing's
`advisoriesUpdated` is **later** than the cached document's (`_getAdvisories`, `isAfter`), so the
field must move forward, never merely change; and it matches an advisory to a package through
`affected[].package.name` and `ecosystem` and reads only the enumerated `versions` list, never
`ranges`, with `aliases` and `summary` mandatory (`_extractAdvisoryDetailsForPackage`). Which
pinned SDK first carries the conditional fetch is the corpus's to record, not this document's.

## Blocking preconditions

**Tier 2 work begins only after the breadth gate.** `formats/catalogue.md` AC5 requires Tier 1
complete before any Tier 2 work, and `project-charter.md` AC9 requires the continue-or-shrink
verdict recorded in the experiment log first. Pub is Tier 2, so this spec is reachable only if
that verdict is "continue". It inherits the handler-interface re-open gate
(`format-handler-interface.md` AC8) transitively, since that gate precedes all of Tier 1.

**The management API must be `planned` before Phase 2.** Retraction, un-retraction and
discontinuation are operations of the registry-owned management API the cross-format precedent
settled on (`pypi.md`'s resolved hosted-yank decision, was Q1, with `npm.md` and
`ansible-collections.md`): the `withdraw`, `restore` and `annotate` kinds of
`docs/internal/plans/foundation/management-api.md` (its operation vocabulary and the pub rows of
its cross-format reconciliation table), which owns their URL shape, authorization, write
accounting and audit. AC6, AC7 and AC14 are untestable until that surface exists, so Phase 2
waits on that spec reaching `planned`; how this format's requirements land there is stated in
Design.

**Nothing else is asked of the foundation wave beyond what it already gives.** The proxied path
runs on `docs/internal/plans/foundation/upstream-adapters.md`'s `https` adapter (redirects followed
inside the adapter to allowlisted hosts, its AC7 and AC8) and `proxy-cache.md`'s declared-digest
stream-and-verify, since every archive has an `archive_sha256`; nothing is signed or generated, so
`signing-service.md` records this format in its "Nothing, stated" row, and nothing is verified, so
`artifact-verification.md` lists it among its "Formats with nothing to verify" (its AC24 renders
`none` in the verification column); publish is synchronous on the wire, so nothing is asked of
`async-operations.md`.

## Scope

**In scope:**

- The version listing (`GET /api/packages/{package}`) rendered from stored state with `latest`,
  `versions`, per-version `archive_url` and `archive_sha256`, `retracted`, and the package-level
  `isDiscontinued` and `replacedBy` fields.
- Archive serving at a registry-chosen `archive_url` under the hosted URL, and the two deprecated
  endpoints older clients use (version info and the `/packages/{p}/versions/{v}.tar.gz` redirect).
- The three-step publish flow (initiate, multipart upload, finalize) with refusal of a version
  that already exists and of an archive that fails validation.
- Retraction, un-retraction and discontinuation on the hosted path as operations of the
  registry-owned management API, with the effect verified through the real client (the adopted
  retraction-surface record below).
- Bearer authentication per `foundation/auth.md`, including the spec-mandated
  `WWW-Authenticate` challenge and the 401/403/404 split that keeps the client's token intact
  (the adopted challenge record below).
- Advisories on both paths: the hosted listing carries `advisoriesUpdated` and the advisories
  endpoint answers from `supply-chain-policy.md`'s advisory reader for the repository served,
  under its `coordinate_exemptions`, only for a package some advisory record stands against
  (the resolved hosted-advisories decision below, was Q7, superseding was Q3); the proxied path
  relays the upstream's field and document.
- The proxied path against pub.dev: classification, `archive_url` rewriting, conditional
  revalidation, negative caching, the advisories relay, and pub's rows of the removal table.
- Serving through `signing-service.md`'s door: the listing and the advisories document through
  `ServeRendered`'s lazy form, archives through `ServeFile`, with the strong `ETag` and `304`
  the current client's `If-None-Match` relies on, `HEAD` as the `GET` without its body, and the
  door's `Cache-Control` narrowing on a private repository or a credentialed request.
- The per-route addressed objects `auth.md`'s pattern scopes evaluate, and the wire rendering of
  a shared policy refusal.
- Virtual repositories with a per-package, first-member-wins merge (the resolved
  virtual-repository decision below), and the capabilities and rename behaviour
  `format-handler-interface.md` AC13 and `repository-lifecycle.md` AC12 require.
- Non-interactive client configuration through `PUB_HOSTED_URL`, per-dependency `hosted: url:`
  and `publish_to`, which is what makes the format-first mount work without a carve-out.

**Out of scope for v1**, each with its reason, recorded because the interface spec's definition
of done requires the deliberately unimplemented surface to be named:

- **Rendering a condemnation or a policy verdict as an advisory.** The hosted advisories
  endpoint renders advisory records the reader returns, which are data; what the operator's rules
  refuse reaches the client through the refusal path ("Policy refusals on the wire"), never as a
  second rendering of the verdict in advisory shape, the option `composer.md`'s equivalent
  decision (was Q12 there) declined for the same reason.
- **pub.dev's site API**: search, account and likes endpoints, uploader and publisher management,
  automated-publishing configuration. None of it is in the repository specification, no client
  in the install-or-publish loop calls it, and advertising a pub.dev-proprietary surface would
  put a claim in the matrix that no oracle backs.
- **Automated publishing** (pub.dev accepting a CI provider's OIDC token). Credential issuance
  belongs to `foundation/credential-management.md`, whose OIDC exchange (`POST
  /api/v1/tokens/exchange`, its Phase 3) mints a registry token from a CI provider's OIDC token
  under a robot's trust policy; a CI job hands that token to `dart pub token add --env-var` like
  any other, and no `dart pub` route drives an exchange against a third-party hosted URL, so
  there is no pub-shaped route to bind, unlike PyPI's and Open VSX's trusted-publishing routes,
  which are bindings onto the same exchange (`pypi.md` AC19). Accepting a raw OIDC token as the
  Bearer, as pub.dev does, would be a new presentation form, which is `auth.md`'s to decide.
- **Hard deletion of a version or package.** The ecosystem has no delete surface: pub.dev never
  deletes on an author's request, retraction is its removal semantics, and a vanished version
  on pub.dev is always administrative moderation. `management-api.md`'s vocabulary has
  `delete-version` and `delete-package` kinds, but this handler declares neither: a bad upload is
  handled by retraction or by rollback through the snapshot pointer, the ecosystem's own answer.
  If a deletion kind is ever declared, the core-held retirement rule applies and the coordinate is
  never reusable (`management-api.md`, "Retirement is core-held"), since every lockfile pins its
  content hash.
- **pub.dev's own `options` endpoints** (`PUT .../versions/{version}/options` and
  `PUT .../options`). No `dart pub` command drives them; pub.dev's web UI does. Serving them
  would be a per-format alias of the registry-owned retraction and discontinuation operations,
  which the cross-format precedent declines wherever no client drives the route, exactly as
  `ansible-collections.md` declines Galaxy NG's own `DELETE` routes.
- **Interactive `dart pub login`.** The client uses its OAuth2 flow only for the hard-coded
  official servers (`_publish` in `lib/src/command/lish.dart`), never for a third-party hosted
  URL, so no login surface is applicable.
- **Write-through publishing to an upstream.** `proxy-cache.md` rules it out for every format.

## Design

### The wire surface

| Surface | Shape |
|---|---|
| Version listing | `GET <hosted-url>/api/packages/{package}`, `Accept: application/vnd.pub.v2+json`; body carries `name`, optional `isDiscontinued`, `replacedBy` and `advisoriesUpdated`, a `latest` object, and `versions[]` each with `version`, optional `retracted`, `archive_url`, `archive_sha256` and the `pubspec` as a JSON object; pub.dev adds a `published` timestamp per version that the spec does not list |
| Archive | `GET` on the listing's `archive_url`, following redirects; a gzipped tar. Ours is `<hosted-url>/api/archives/{package}-{version}.tar.gz`, served directly |
| Publish, step 1 | `GET <hosted-url>/api/packages/versions/new` with the Bearer token; response `{"url": <multipart-upload-url>, "fields": {...}}`, and `fields` must be present even when empty because the client rejects its absence (`_expectField` in `lib/src/command/lish.dart`) |
| Publish, step 2 | multipart `POST` to `<multipart-upload-url>` carrying every field plus `file` (`package.tar.gz`), sent with redirect-following disabled; response `204 No Content` with a `Location` header naming the finalize URL |
| Publish, step 3 | `GET <finalize-upload-url>`; `200` with `{"success": {"message": ...}}`, or `400` with `{"error": {"code": ..., "message": ...}}` |
| Advisories | `GET <hosted-url>/api/packages/{package}/advisories`; `{"advisories": [OSV...], "advisoriesUpdated": <date-time>}`; requested by the client only when the listing carries `advisoriesUpdated`, and refetched only when that value is later than the cached document's. Hosted: rendered from the advisory reader (Design, "Advisories on the hosted path"); proxied: the upstream's document relayed |
| Deprecated version info | `GET <hosted-url>/api/packages/{package}/versions/{version}`, kept for pre-2.8 clients; pub.dev still answers it (probed 200) |
| Deprecated download | `GET <hosted-url>/packages/{package}/versions/{version}.tar.gz`; pub.dev answers `303` to the `archive_url` (probed) |
| Retraction | pub.dev's `GET` and `PUT <hosted-url>/api/packages/{package}/versions/{version}/options` with `{"isRetracted": bool}` is its own API (`setVersionOptions` in its `pubapi.dart`), not part of the repository spec, and is **not served** here: retraction is a registry-owned management operation (Design, "Retraction and discontinuation") |
| Discontinuation | pub.dev's `GET` and `PUT <hosted-url>/api/packages/{package}/options` with `{"isDiscontinued": bool, "replacedBy": string?}` (`setPackageOptions`), likewise **not served**: a registry-owned management operation |
| Errors | `{"error": {"code": ..., "message": ...}}` on 4xx; `401` and `403` additionally carry `WWW-Authenticate: Bearer realm="pub", message="..."` |

The client attaches `User-Agent: Dart pub <sdk-version>` and retries failed requests with
exponential backoff, up to seven attempts by default, on 5xx, 408 and 429
(`retryForHttp` and `throwIfNotOk` in `lib/src/http.dart`). Two consequences: every endpoint
above must tolerate a repeated request, including the multipart upload and the finalize `GET`;
and a 429 is retried rather than surfaced, so upstream throttling on the proxied path is
absorbed by the settled proxy-core rule rather than reaching the user as an error.

### URL shape, and where the spec and the client disagree

The hosted URL is an arbitrary `http` or `https` base with an optional path prefix (the spec's
own examples include `https://some-server.com/prefix/pub`), configured three ways: `PUB_HOSTED_URL`
for every dependency, `hosted: url:` on one dependency, and `publish_to` for publishing. The
client builds every request by resolving `api/...` against that base, so the format-first mount
`/pub/{repository}/` works with no root anchoring, and pub joins the opinionated-client evidence
in `format-handler-interface.md`'s URL-shape record at client-source level.

The spec says the hosted URL "should always be normalized such that it doesn't end with a
slash". The client does the opposite for any URL with a path: `validateAndNormalizeHostedUrl`
in `lib/src/source/hosted.dart` appends a trailing slash when the path is non-empty, strips
user-info, refuses query strings and fragments, and folds `pub.dartlang.org` into `pub.dev`. The
client wins, and it matters three times over: the hosted URL this registry must treat as
canonical is `https://host/pub/{repository}/` with the slash; that exact string is what
`pubspec.lock` records as `url` for every package resolved from it
(`serializeForLockfile` there); and it is the prefix the credential check compares against, so
every URL this registry hands the client that must carry the token has to start with it.

### Names, versions and the absence of normalisation

Pub has no PyPI-style normalisation, and that absence is itself the trap: the name is an exact,
case-sensitive key. The client's own validator (`_checkName` in `lib/src/validator/name.dart`)
rejects a name outside `[a-zA-Z0-9_]`, one that does not begin with a letter or underscore, and
any Dart reserved word, and warns on uppercase. This registry accepts a published name only
under the lowercase grammar `^[a-z_][a-z0-9_]*$` and outside the reserved-word list, which the
spec permits as a repository-specific constraint; the proxied path relays upstream names
verbatim. The listing's `pubspec.name` must equal the requested package (the client parses each
version's pubspec with `expectedName` set to the requested name) and each `version` must parse
as a pub semantic version, or the whole listing is rejected as malformed.

### The listing, `latest`, and content hashes

The listing is assembled on every read from snapshot state through the pointer the handler is
given; on the hosted path it is never stored as a document of record. The mapping uses exactly
the levels `data-model.md` provides, and needs nothing new:

- `Package`: the exact name. Its package-level document holds `isDiscontinued`, `replacedBy`
  and, on the proxied path only, the upstream's `advisoriesUpdated` and cached advisories.
- `Version`: its document holds the pubspec as JSON (the solver's input for dependencies and SDK
  constraints), `retracted`, and the publish time rendered as `published`.
- `File`: one `{package}-{version}.tar.gz` per version, whose `Blob` is keyed by digest.

`archive_sha256` is the `File` row's digest rendered as hex: the CAS's canonical digest is
sha256 (`storage-and-gc.md`, addressing), so the listing never advertises a hash the store did
not compute itself, and on the proxied path the upstream's declared hash is the stream-and-verify
target whose match is exactly the CAS key. This is the tightest fit any format has had with the
store, and it is what makes AC5's equality between listing and bytes cheap to hold.

`latest` follows pub.dev's rule (`updateVersions` in its `models.dart`): the highest version by
pub ordering among non-retracted versions, preferring a stable release over a prerelease, and
falling back to the retracted set only when every version is retracted. The current client does
not read `latest` at all (it parses `versions` only), so the field is fidelity for other
consumers rather than a resolution input.

### Serving: the door, the client's `If-None-Match`, `HEAD` and `Cache-Control`

Nothing this format serves is a stored generated document, so it reaches `signing-service.md`'s
serving door through the two forms its resolved handler-rendered decision added (was Q14 there;
`format-handler-interface.md` AC17 carries `Documents` in `Deps`), and no handler package sets
`ETag`, `Last-Modified` or `Cache-Control` or reads a conditional header (that spec's AC11 scan):

- **The listing and the advisories document** go through `ServeRendered`'s **lazy form**: the
  handler passes a renderer and a validator identity, never bytes, so the door derives the strong
  `ETag` without rendering and a `304` costs no render (its AC32). The identity is the package's
  identity, the serving snapshot's identity, the hosted URL the body embeds, and the advisory
  input the hosted listing renders (the `advisoriesUpdated` value or its absence, below), so a
  feed change that adds or drops a record changes the `ETag` and the client's conditional fetch
  receives the new field rather than a `304` over a stale one. The freshness source is the serving
  pointer on a hosted repository, the remote's cache-scoped record on the proxied path, and on a
  virtual the virtual's own pointer and the supplying member's record for that name, served as the
  latest of them; the door sets `Last-Modified` from it, forward-moving on a rollback. This matters
  because the current client sends `If-None-Match` with the `ETag` it stored beside its cached
  listing and answers itself from that cache on a `304` (`_fetchVersionsNoPrefetching`; the value
  must be an RFC 9110 entity-tag, which the door's quoted strong `ETag` is), so a `304` that hides
  a rollback, a retraction or a new advisory field would leave every client on a listing this
  registry no longer serves; the door's `exact` rule and the identity above are what prevent it,
  and AC19 holds it with the real client. The client's own three-day listing cache, which it
  trusts without any request when a lockfile is present, is a second cache the registry cannot
  invalidate and the reason AC8 runs against a fresh `PUB_CACHE`.
- **Archives** go through `ServeFile`: a strong `ETag` from the CAS digest, which is also the
  listing's `archive_sha256`, and byte ranges where the policy offers them.
- **Serve policies**, declared as package-level constants: the listing and the advisories document
  carry pointer `Last-Modified`, the `exact` conditional rule and `Cache-Control: max-age=120`,
  the value pub.dev serves on its listing (probed 2026-09-26); archives carry `ETag` only and
  `public, max-age=31536000, immutable`, the immutable-artifact value, with range support and no
  content encoding, since the client hashes the bytes it receives. The door narrows every value
  under its cacheability rule (`signing-service.md`'s resolved cacheability decision, was Q25,
  AC38): on a repository that is not anonymously readable, and on any response to a request the
  authorizer authenticated, `public` and `s-maxage` are dropped and `private` added, so a private
  Flutter team's archives are never stored by a shared cache between the registry and the fleet,
  while a public mirror's archives keep the declared value for anonymous reads. Pub presents no
  URL-borne credential, so the door's `private, no-store` case never arises here.
- **`HEAD`** is answered by the door as the `GET` with the body withheld, `Content-Length`
  included (its resolved HEAD decision, was Q24, AC32; on the proxied path `proxy-cache.md`'s
  resolved HEAD decision, was Q24 there, AC32: never forwarded, cache-filling, answered after
  the verified commit). `dart pub` sends no `HEAD` (none in `hosted.dart` or `lish.dart`), so
  the rule costs this format nothing and is held by the shared tests rather than a pub case.

The client's content-hash rules decide what the registry may never do. It compares the
**freshly fetched** listing's hash to the bytes it downloads, deliberately not the lockfile's, so
that an upstream content change results in an updated lockfile plus a warning rather than a
failed download; `--enforce-lockfile` turns that warning into a failure. A mismatch between
listing and bytes is a `PackageIntegrityException` attributed to the repository, retried, then
fatal. So the served listing and the served bytes must agree at every instant, including across
a proxied revalidation, which is why the removal table below treats a changed upstream hash as
an event rather than a field update.

One header trap rides with this. When a response carries `x-goog-hash: crc32c=...`, the client
verifies the crc32c of the body against it and fails the download on mismatch
(`_validateCrc32c` there). pub.dev serves archives from Google Cloud Storage with that header
(probed 2026-09-26), so a proxied archive response that forwarded the upstream's headers over
different bytes would fail every client; served archives carry no `x-goog-hash` at all.

### Content negotiation and the 406 trap

The client sends `Accept: application/vnd.pub.v2+json` on every API request and the spec says a
server without an `Accept` header should assume v2. pub.dev itself serves the listing as
`application/json` from a static object and the client does not check the content type; this
registry answers with the spec's type. What it must never do is answer that `Accept` with 406:
the client turns exactly that pair into "Pub is incompatible with the current version of
<host>, upgrade pub" (`throwIfNotOk` in `lib/src/http.dart`), a message that sends the user to
upgrade a client that was never the problem.

### Authentication: the token, the challenge, and the deletion trap

The client presents `Authorization: Bearer <token>` from a store written by
`dart pub token add <hosted-url>`, which is non-interactive with `--env-var NAME`
(`lib/src/command/token_add.dart`): the harness's existing `setup` token provisioning suffices,
injecting the issued token as an environment variable and running `token add` in the case
script, so nothing new is asked of the harness vocabulary for auth. Three client rules shape the
server:

- **Tokens must match `^[a-zA-Z0-9._~+/=-]+$`**; the client refuses to store or send anything
  else (since Dart 3.0). The token shape `foundation/auth.md` fixes, `swr_<lookup prefix><secret>`
  in base32 without padding (its "Nothing is invented"; `credential-management.md`
  mints it), falls inside that set, underscore and all, and AC4 asserts it through a real
  `token add`, because a later change to the shape made for another format would not be checked
  against this one.
- **The token is attached only to URLs under the hosted-url prefix**, compared lowercased and
  slash-normalised (`Credential.canAuthenticate` in `lib/src/authentication/credential.dart`),
  as a client-side leak guard for archives served from third-party blob storage. Every URL this
  registry hands the client that needs the token, the `archive_url`, the multipart upload URL
  and the finalize URL, therefore lives under the hosted URL; one placed elsewhere arrives
  unauthenticated, a private repository answers it 401, and that 401 deletes the user's stored
  token. The finalize URL additionally has to share the hosted URL's origin, or the client
  rethrows a raw HTTP failure instead of printing the refusal message it was sent
  (`_publish` in `lib/src/command/lish.dart` compares origins before calling `handleJsonError`).
- **`token add` refuses a plain-`http` hosted URL unless the host is `localhost`, `127.0.0.1` or
  `::1`.** The client offers no certificate-authority option of its own (none exists in its HTTP
  layer) and trusts the platform store, so the harness CA is installed into the client image's
  system trust store as part of pub's case setup, per the harness's per-client trust-store rule.

The token is presented in `auth.md`'s universal `Bearer` form (its "Presentation forms" table,
AC31). The challenge is the one this format declares under `auth.md`'s uniform-challenge rule ("A
credential-less request is challenged, and the challenge is uniform", which makes the scheme a
per-format declaration and emits it byte-identically for a private and a missing repository, its
AC17), so pub's mandated `Bearer realm="pub", message="..."` needs no exception; that spec's
client table carries a `dart pub` row written from this section (grounded in client source, which
its row says, and which AC4's capture supplies), its uniform-challenge rule names pub beside OCI,
Open VSX, Swift and Vagrant as declaring `Bearer`, and its `Bearer` presentation row lists dart pub
among the clients needing it. The status split, settled by the adopted challenge record below and
stated here as the rule the handler's `Scope(r)` mapping and the shared authorizer together
produce (the authorizer runs before any handler and is not a `Deps` entry; the handler
contributes the per-route object, "Addressed objects and pattern scopes"):

| Caller | Response |
|---|---|
| No credential at all, repository private or nonexistent | `401` with `WWW-Authenticate: Bearer realm="pub", message="..."`, uniformly, so the challenge is not an existence oracle; the message names `dart pub token add <hosted-url>` with the real hosted URL, which is what the client prints |
| No credential, repository with anonymous read enabled | served |
| Invalid, expired or revoked credential | `401` with the challenge (`foundation/auth.md` AC12 and the spec agree, and the client deleting that token is correct) |
| Valid credential without read access | `404`, indistinguishable from a nonexistent repository (`foundation/auth.md` AC17); never `403`, which would confirm the name |
| Valid credential with read but without the scope a write needs (publish) | `403` with the challenge and a message naming the missing permission; the client keeps the token, and the caller already knows the repository exists |

A `401` is never sent to a valid token, because the spec says the client "knows for sure" the
token is invalid on 401 and acts on it.

### The publish flow: three steps, one write

The flow is designed so that nothing is visible until the finalize `GET`, which the spec allows
("the server is allowed to consider the publishing incomplete until the GET request for
finalize-upload-url has been issued"), and so that every step survives the client's retries.

1. **Initiate.** `GET .../api/packages/versions/new` under `push` scope opens an upload session,
   `data-model.md`'s one definition of a session (its idle period and cap, AC26), whose unexpired
   life holds the repository's grace open (its AC27): the record is written before any bytes
   arrive, the write-ahead ordering `storage-and-gc.md` requires so an abandoned upload is
   enumerable. The response's `url` is
   `<hosted-url>/api/packages/versions/newUpload/{upload-id}` and `fields` is an empty object.
2. **Upload.** The multipart `POST` is received through the bounded spool `Deps` hands every
   handler, under `management.publish_spool_limit`, the one bound on every publish body this
   registry spools, a handler's own wire publish included (`management-api.md`'s resolved
   spool-bound decision, was Q20, AC36): a `Content-Length` above it is refused `413` before any
   byte is read, and a body that outgrows it undeclared is cut at the bound and refused with
   nothing staged, both with pub's error body, which the client prints since the upload URL
   shares the hosted URL's origin. The `file` part is then committed to the CAS as an in-flight
   blob under the repository-scoped grace period, keyed by the digest computed on the way in. The
   client sends this with redirect-following off and reads the `Location` header from whatever
   status it gets, so the answer is the spec's `204` plus `Location:
   <hosted-url>/api/packages/versions/newUploadFinish/{upload-id}`. A retried `POST` for the same
   upload id replaces the staged archive; the upload id is unguessable and bound to the
   repository and the uploading principal.
3. **Finalize.** The `GET` validates and commits: the archive is a gzipped tar with `pubspec.yaml`
   at its root, read under a **decompression bound**, a handler constant on the decompressed bytes
   and entries walked to reach the pubspec, so an archive whose gzip stream expands past it is
   refused rather than inflated (the bound `homebrew.md`, `conan.md` and `julia.md` place on their
   ingests); the pubspec parses, its `name` satisfies the grammar above and its `version`
   parses; the version does not already exist; then `Version`, `File` and the version document
   are written through the shared model as **one** completed logical write, producing exactly
   one snapshot and advancing the default pointer. The central retirement check runs on this
   write like every other (`management-api.md`, "Retirement is core-held"), and finds nothing,
   because this handler declares no retiring kind. Success is `200` with a message the client
   echoes as "Message from server: ...". Finalize is idempotent for its upload id, so a retry
   after a success returns the same success rather than a version-exists refusal.

Refusals are `400` with an `error.code` and a `message`, because the client prints the message
and does not switch on the code: an existing version (`VersionExists`), a malformed archive, a
pubspec whose name or version fails, an unknown or expired upload id. A refused finalize leaves
no snapshot; the staged blob is collected by the upload-session cleanup once its session expires
and the repository's grace lapses (`storage-and-gc.md` AC3). Republishing an existing version is
refused as pub.dev refuses it, and for the reason every immutable-artifact format shares: this
registry's own proxy layer caches archives forever on that assumption, and the client's lockfile
pins the hash. This format does **not** declare `management-api.md`'s unchanged publish (its
resolved unchanged-publish decision, was Q15), under which identical bytes at an existing
coordinate complete with no snapshot: pub.dev refuses a republish whatever the bytes, the client
prints that refusal, and a CI retry of a `dart pub publish` that landed is already answered by the
finalize's idempotency for its upload id, so the declaration would buy nothing and diverge from the
reference. A retry that opens a new upload session for a version that exists is refused
`VersionExists`, as on pub.dev.

Only a `local` repository accepts a publish. A `remote` or `virtual` repository answers step 1
with `400` and a code naming the repository type, so the client prints an explanation instead of
the misleading "insufficient permissions" it would render for a `403`; write-through is out of
scope per `proxy-cache.md`, and a virtual repository's default deployment target is a product
decision this spec does not take. This is the format's own wire publish, not a binding onto
`management-api.md`'s `publish`, so the `405` `repository-type` that spec's AC7 fixes for its
operations and bindings does not reach it: its AC7 and its resolved wire-rendering decision (was
Q16) scope a handler's own non-binding wire publish out of the criterion and name this format's
`400` at step 1 as the case. The management operations below, which do go through that API,
answer `405` `repository-type` against those types.

### What counts as a write

`data-model.md` requires each format spec to declare its ecosystem's write boundaries, and makes
metadata-only mutations snapshot-creating writes. Pub's declaration:

- A publish is **one** completed logical write, completed by the finalize `GET`; steps 1 and 2
  create in-flight upload state and no snapshot.
- A retraction or un-retraction through the management API is one metadata-only write on the
  version document.
- A discontinuation, or a change to `replacedBy`, through the management API is one
  metadata-only write on the package document.
- A proxied repository creates no snapshots at all, per the model's settled rule; listing
  arrival, advisories arrival and revalidation are cache materialisation.

No digest-addressed read exists on pub's wire, so the in-flight read carve-out
`data-model.md` makes for OCI is not needed here and its open scoping question does not bind
this format; the staged archive is reachable only through the finalize URL bound to its upload
session.

### Retraction and discontinuation: the effect is the client's, the trigger is ours

**The effect is fully specified by the client and fully testable through it.** A retracted
version is excluded from resolution unless it is already the locked version or an exact
`dependency_overrides` pin (`_getAllowedRetracted`); `dart pub get` annotates such a package
"retracted" in its report and `dart pub outdated` shows it (`lib/src/solver/report.dart`,
`lib/src/command/outdated.dart`). A discontinued direct or dev dependency makes `dart pub get`
print "1 package is discontinued", or "discontinued replaced by <name>" per package, and
`dart pub outdated` shows the replacement (`reportDiscontinued` in `report.dart`). This is the
trigger-versus-effect split `docs/internal/analysis/management-surfaces-and-the-oracle.md`
draws: the harness provisions the state and the real client proves the behaviour.

**The trigger has no client.** `dart pub` has no retract, discontinue or delete subcommand
(dart.dev's command list, re-read 2026-09-26), and dart.dev documents retraction and
discontinuation as actions on pub.dev's Admin tab. pub.dev's web UI performs them through its
own API, `PUT .../versions/{version}/options` and `PUT .../options`, which the repository spec
does not include. Per the adopted retraction-surface record, this registry does not serve those
endpoints: retraction, un-retraction and discontinuation are operations of the registry-owned
management API, `docs/internal/plans/foundation/management-api.md`, the one management surface
the cross-format precedent settled on, and with no client driving pub.dev's routes there is
nothing for a binding to bind (that spec's binding rule names `pub.md`'s refusal as the case it
excludes, "Bindings: one operation, two ways in"). This spec defines what each operation means
and what `dart pub` sees afterwards; the shared spec defines URL shape, request form,
authorization and audit. The handler implements that spec's `Operator` interface and declares the
three kinds below, matching its reconciliation table's pub rows, with no binding. The trigger is
verified by this registry's own integration tests against the management endpoint, and that is
stated as such rather than implied to be conformance-covered; the effect is verified by the real
client in cases whose `script` calls the management endpoint, which the harness's case-set
validator requires once per declared kind (`conformance-harness.md` AC26), or whose `state` seeds
the retracted or discontinued state.

| Operation | Kind | Effect a client sees | Write | Action |
|---|---|---|---|---|
| Retract a version | `withdraw` | A fresh `dart pub get` selects another version and annotates it "retracted"; a locked or exact-override pin still installs it | One metadata-only write on the version document | `delete` |
| Un-retract a version | `restore` | The version returns to resolution | One metadata-only write | `delete` |
| Discontinue a package, optionally naming `replacedBy`, or clear it | `annotate` | `dart pub get` prints the discontinued notice and `dart pub outdated` shows the replacement, or they stop | One metadata-only write on the package document | `push` |

The actions follow the cross-format mapping rather than pub.dev's single permission: retraction
is yank-class, removal-class like PyPI's yank and so `delete`, which `management-api.md` fixed for
every `withdraw` by the same effect rule (its resolved withdraw-action decision, was Q1, and AC9);
discontinuation is a notice like npm's deprecation and so `push`, the `annotate` kind's action.
`Authorize` reports the object `{package}/{version}` for the first two and `{package}` for the
third, and each is hosted only: against a `remote` or `virtual` repository it is refused `405`
`repository-type` before authorization (`management-api.md` AC7), the marks there arriving from
upstream. None of the three retires anything.

Two pub.dev policies are deliberately **not** mirrored, on the reasoning `npm.md`'s resolved
hosted-unpublish decision (was Q3) adopted for unpublish: pub.dev allows retraction only within
seven days of publication and undo only
within seven days of retraction (`canBeRetracted` and `canUndoRetracted` in its `models.dart`).
Those windows protect a public commons; a private registry has operators and RBAC, so
authorization is the only gate, and the divergence goes on the recorded exception list.
`replacedBy` is stored verbatim; the client sanitises it for terminal display, and it may name a
package on another repository, so its existence is not checked.

On the proxied path the trigger is absent and the marks arrive from upstream (the removal table
below).

### Advisories on the hosted path: rendered from the reader, silent when nothing stands

Per the resolved hosted-advisories decision below (was Q7, superseding was Q3), a hosted
repository renders pub's advisories shape from `supply-chain-policy.md`'s advisory reader, the
`Deps` entry that returns, for the repository served and a coordinate, the advisory records
matching it and the condemnations standing against it, under that repository's
`coordinate_exemptions` and evaluating nothing (its "A handler may read advisories, never
evaluate them", AC19, and its resolved hosted-matching decision, was Q12, AC25;
`format-handler-interface.md` AC14). The client's two rules shape the rendering:

- **The field is present only when something stands.** Rendering a listing, the handler asks the
  reader for the package (the range form, every version). When no record matches, the listing
  omits `advisoriesUpdated`, the client makes no advisories request and prints nothing, which is
  the behaviour was-Q3 chose, now a computed silence rather than an uncomputed one. When a record
  matches, the listing carries `advisoriesUpdated` and the advisories endpoint answers.
- **The value is the feed's freshness, never the records' dates.** The client replaces its cached
  advisories document only when the listing's `advisoriesUpdated` is later than the cached one
  (`_getAdvisories`), so the value must move forward. The newest `modified` among the matching
  records does not: a withdrawn newest record moves it backwards and every client keeps the
  withdrawn advisory in its cache. The value is therefore the latest freshness value among the
  sources the matching records came from (`supply-chain-policy.md`'s resolved feed-freshness
  decision, was Q13: the last completed sync or the declared export time), which advances on
  every sync by construction. Accepted cost: a client refetches the advisories document, a small
  one, once per feed sync per package it resolves that has a standing record; a record that stops
  standing without a successor makes the field vanish, which the client reads as no advisories.
- **The document enumerates versions.** Each record renders as OSV with `id`, `summary`,
  `aliases` (always a list, empty when the record has none, since the client refuses its
  absence), `affected` carrying `package.ecosystem` `Pub` and `package.name`, the enumerated
  `versions` list, `database_specific.pub_display_url` where the record carries a URL, and the
  listing's `advisoriesUpdated`. The `versions` list is the stored versions of the package the
  reader matches when asked per version, because the client reads `versions` only and ignores
  `ranges`, and the match under pub ordering is the policy layer's, never re-derived here; the
  per-version reads are paid only by a package with a standing record. The shape is held against
  the corpus's pub.dev advisories document (AC13), not recollection.
- **Nothing is evaluated, and nothing leaves.** The client surfaces an advisory itself
  ("Dependencies are affected by security advisories" with footnotes in the resolution report,
  silenced per advisory by `ignored_advisories` in the root pubspec, `report.dart`); the
  operator's rules refuse through "Policy refusals on the wire"; the two are the composition the
  supply-chain section states. The reader is local, so no hosted package name leaves the
  registry, the leak was-Q3's option C refused. A failed advisories fetch against a hosted URL
  that is not pub.dev is a warning in the client, never a failed resolution
  (`_fetchAdvisories`, `isPubDevUrl`).
- **On a virtual**, a package supplied by a `local` member carries what the reader answers for
  that member, under that member's exemptions (the reader's rule on a virtual); a package supplied
  by a `remote` member carries the upstream's relayed field and document.

The listing's validator identity includes the rendered `advisoriesUpdated` value or its absence
(Design, "Serving"), so a feed change is never hidden behind a `304`.

### The proxied path

The handler owns the request and classifies for the proxy layer's fetch-and-cache API per the
settled decisions in `proxy-cache.md`. Upstream facts are from live pub.dev probes on
2026-09-26 and are re-grounded by the corpus and the nightly drift job rather than trusted
forever:

- **The listing is mutable metadata with a TTL**, revalidated conditionally: pub.dev serves it as
  a static object with a weak `ETag`, `Last-Modified` and `cache-control: max-age=120`, and
  answers `If-None-Match` with `304` (probed), so an unchanged listing costs no body. The cached
  representation preserves fields this spec does not know (`published`, and whatever arrives
  next), because the client is the consumer and a lossy relay is a protocol change made by
  accident. The served listing carries the remote's cache-scoped `Last-Modified`, never pub.dev's,
  and a revalidated listing older by upstream `Last-Modified` than the adopted one is not adopted
  and is recorded as a divergence (`proxy-cache.md` AC22; `data-model.md` AC44). The listing and
  the advisories document are the remote's current documents, which LRU eviction never reaches
  and which count in `cache_metadata_bytes`, not the quota (that spec's resolved
  metadata-eviction decision, was Q21, AC29); no route reads a superseded listing revision, so the
  handler declares a retained-revision count of **zero** and keeps no blob past an adoption
  (its resolved retained-revision decision, was Q19, AC27). The `ETag` the client sends back as
  `If-None-Match` is the one the door derived for the cached entry, never pub.dev's weak one.
- **Archives are immutable artifacts**: cached indefinitely, fetched stream-and-verify against the
  listing's `archive_sha256` as fetch-and-cache's declared digest, never committed on mismatch or
  truncation. pub.dev's `archive_url` is `https://pub.dev/api/archives/{package}-{version}.tar.gz`,
  which has historically redirected to Google Cloud Storage and today answers directly; the
  upstream's `https` adapter follows a redirect inside itself only to a host on the upstream's
  allowlist (`upstream-adapters.md` AC7, AC8), so an operator whose upstream redirects lists the
  storage host with role `none`, and a redirect elsewhere makes no connection and fails the fetch
  with the host named. The requested location, never a presigned target, is retained as
  `RemoteFile` provenance (its AC8). The remote is created under that spec's adapter validation
  alone, with no probe of the upstream inside the creation (its AC23); this format never had a
  configuration-time probe, so nothing moves to the first request.
- **Every `archive_url` in a served listing points at this registry**, under the hosted URL so the
  client attaches the token for private remote repositories. This is the same format-specific
  transform `format-handler-interface.md` canonicalises with npm's packument URLs; without it
  the client fetches every archive from pub.dev directly and the cache never sees the bytes,
  which AC8's no-upstream-contact assertion catches. Served archives carry none of the
  upstream's `x-goog-hash` headers.
- **The advisories document is mutable metadata** cached under the same TTL and additionally
  invalidated when the listing's `advisoriesUpdated` advances, mirroring the client's own cache
  rule for it. It is relayed because the client asks for it whenever the listing carries the
  timestamp and warns when it cannot fetch it; relaying pub.dev's OSV advisories is the
  ecosystem's own signal reaching the client unchanged, not this registry making an advisory
  claim.
- **Missing names are negatively cached** with the short TTL. pub.dev answers an unknown name with
  a `404` whose body is the storage service's XML `NoSuchKey` (probed); this registry serves its
  own JSON error shape, and the client needs only the status. A `404` at revalidation for a
  package this registry already holds is a divergence event (below), never a negative-cache
  entry.
- **Legacy endpoints** are rendered from the cached listing: the deprecated version-info document
  from the same state, the deprecated tarball path as a `303` to the rewritten `archive_url`.
- **A cache refresh and a read-only remote behave as the shared layer defines**: "refresh now"
  (`management-api.md` AC29) marks the cached listings, advisories and negative entries due
  (`proxy-cache.md` AC24), and a `read_only` remote fetches nothing and serves its cache
  (`proxy-cache.md` AC23).

Upstream events map onto `proxy-cache.md`'s event classes ("Upstream removal or replacement") as
pub's side of that contract, each row naming its class:

| Upstream event, as observed at revalidation | Classification |
|---|---|
| `retracted: true` appears on a cached version | **Flag mirroring**, the twin of the PyPI-yank row in that class (its AC13): neither purge nor divergence-free; mirror the mark at the next revalidation, keep the cached archive, record the divergence. New resolutions then exclude the version and locked resolutions keep installing it, which is the client's half of the composed contract |
| `archive_sha256` changes for a cached version | **Immutability violation, coordinate-bound**, treated as the explicit signal per the adopted hash-change record: purge the cached archive, alert the operator, and serve the fresh listing. A frozen old hash would fail every client, because the client verifies bytes against the fresh listing |
| A version vanishes from the listing, or the whole package answers `404` | **Removal with no signal**: keep serving from cache, record an operator-visible divergence and raise it as an alert. pub.dev has no author unpublish, so on that upstream a vanished version is always administrative moderation; the signal is real but not machine-distinguishable from a private upstream's deletion, which is why it falls to the settled keep-and-flag backstop with the flag loud |
| An OSV advisory appears in `/advisories` for a cached version | **Ordinary metadata change**, not a removal event: relayed at the next revalidation. The client (Dart 3.4 and later) surfaces the advisory itself unless the project lists it under `ignored_advisories`; `supply-chain-policy.md`'s own evaluation is a separate, central path |
| `isDiscontinued`, `replacedBy` or an unknown field changes | **Ordinary metadata change**, propagated at the next revalidation |

Detection happens at revalidation: per `proxy-cache.md`'s resolved answer (was Q12) the proxy
layer never polls an upstream, and the active channel is `supply-chain-policy.md`'s advisory
feed under the shared security-signal rule. pub.dev is not among the preconfigured upstreams: a
remote repository against it is user-configured, per the adopted preconfigured-upstream record
below and `proxy-cache.md`'s resolved preconfigured-set extension (was Q14), which deferred
pub.dev until a `continue` verdict authorizes this format; its second extension (was Q17) added
only api.nuget.org and repo.maven.apache.org.

One assertion trap, inherited from the npm and PyPI reviews: the client keeps a listing cache and
a package cache under `PUB_CACHE`, and with a lockfile present it accepts a listing up to three
days old, so a second `dart pub get` that never contacts this registry proves nothing. AC8's
case asserts both directions, the second run reached this registry (transcript) and this
registry did not contact the upstream (network layer), against a fresh `PUB_CACHE` in the case
setup.

A property to document rather than a bug: `pubspec.lock` records the hosted URL and, since
2.19, the content hash for every package resolved through this registry. A lockfile produced
against a remote repository here therefore pins `url: https://host/pub/{repository}/` on every
hosted dependency, and moving the project between this registry and pub.dev directly rewrites
those lines. `PUB_HOSTED_URL` makes the switch global; the hashes are unchanged because the
bytes are.

### Signing, provenance and supply-chain policy

The ecosystem signs nothing: pub has no package signature, no attestation and no provenance
field on the wire. There is therefore no signature state for `supply-chain-policy.md` to consume
from this format, and nothing for the verification producer its resolved ownership decision (was
Q6) names, `docs/internal/plans/foundation/artifact-verification.md`, to verify: that spec lists
pub among its "Formats with nothing to verify", answering absent for every digest, and the
conformance matrix carries `none` in pub's verification column (its AC24). `signing-service.md`
records pub in its "Nothing, stated" row. This is an honest absence rather than a deferral. What
pub does carry is advisory state, and the composition is stated so two mechanisms do not disagree:
the client acts on the advisories it is served by itself, rendered from the reader on the hosted
path and relayed from pub.dev on the proxied one, and central policy evaluation at resolution
(through the shared calls in `Deps`, that spec's resolved evaluation hook, was Q4) is an
independent refusal path that renders as "Policy refusals on the wire" below states. OSV covers
`Pub`, keyed on name and version (`supply-chain-policy.md`'s coverage table, its AC17); this
handler reports no advisory key, since the exact name is the key. pub.dev's per-package OSV
documents are the same schema that spec's resolved advisory-sources decision (was Q9, which
revised the single-feed decision, was Q1) reads from its declared sources, and they are relayed on
the proxied path as the ecosystem's own signal, never ingested as a source.

### Addressed objects and pattern scopes

`auth.md`'s pattern scopes narrow a credential within one repository by matching the object each
request addresses, and the format declares which object each route reports ("Pattern scopes"
there; `format-handler-interface.md` AC12). Pub names are exact and contain no `-` or `/`, so the
archive filename `{package}-{version}.tar.gz` splits unambiguously at its first hyphen, and a
pattern for a family of packages is written `acme_*/**`.

| Route | Object kind | Canonical object |
|---|---|---|
| Version listing, advisories | named | `{package}` |
| Archive, deprecated version info, deprecated download | named | `{package}/{version}` |
| Publish step 1 (`versions/new`) and step 2 (the multipart upload) | content-addressed | - |
| Publish step 3 (finalize) | named | `{package}/{version}` from the staged archive's pubspec, recorded in the upload session at step 2; an unknown or expired upload id reports none |

The publish rows follow OCI's shape on purpose: steps 1 and 2 open and fill an upload session
bound to the digest it commits under, which is `auth.md`'s content-addressed kind, and the named
write, the finalize that makes a version visible, is where the pattern governs. The residual is
the one `auth.md` names for OCI: a patterned `push` can stage bytes outside its pattern, which
never become a version and are collected by the upload-session cleanup. No route is a descriptor
in `auth.md`'s sense (its resolved name-free-document decision, was Q23): every document this
format serves names a package. Retraction and discontinuation report their objects through the
management API's `Authorize` (above).

A refusal under a pattern follows the status table above, reading the pattern as the caller's
scope for that object: a read outside it is the no-read-access row, `404`, and a finalize outside
it by a caller who can read the repository is the missing-write-scope row, `403`. It is **never**
`401`, since the token is valid and a `401` would make the client delete it.

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines, on a
listing, archive or deprecated route of either path, the handler answers `403` with pub's error
body and the `WWW-Authenticate` challenge, whose `message` names the policy and rule, or names
the signal for a coordinate condemned under the shared security-signal rule: the challenge
message is the mechanism the repository spec gives a server to put text in front of the user.
The response is written through `WriteRefusal`, the refusal writer `format-handler-interface.md`
places beside `Deps` (its AC14), which on HTTP/1.1 also puts the condition in the status line's
phrase (`supply-chain-policy.md`'s resolved refusal-status-line decision, was Q10, its AC18), a
second place the text can surface if the client prints the status line. `403` rather than the
existence rule's `404`, because the caller is authorized and the content is what is refused, and
never `401`, for the token-deletion reason above. Whether the client prints the message, or the
phrase, on an archive fetch as it does on an API call, and whether a project with a second hosted
URL for another dependency falls back, is AC16's capture to settle; that capture fills pub's
`pending` row of `supply-chain-policy.md`'s "When a refusal binds, per format" table in the same
change (its AC20; the harness refuses a policy case while the row is `pending`,
`conformance-harness.md` AC26).

### What this format needs from `Deps`, and what it does not need

The blob store for archives and the staged upload, the metadata store at all three levels with
snapshot-pointer resolution, the fetch-and-cache entry point for the proxied path, the bounded
spool for the multipart upload, the `Documents` door (`ServeRendered` and `ServeFile`), the
advisory reader for the hosted listing and advisories routes, the refusal writer, and the request
logger. Nothing beyond the pinned `Deps`: this format calls neither the `Verifier` nor the
server-host lookup, the shared authorizer runs before it rather than inside it, and its
management kinds reach it through the optional `Operator` interface `management-api.md` defines,
not through `Deps`. No write-triggered service is involved: pub has no repository-wide signed index, the
listing is rendered on read from stored state, and publish is synchronous on the wire, so this
format contributes no evidence to `write-triggered-services-prototype.md` and asks nothing of
it. The two-step upload with a later finalize is served entirely by `storage-and-gc.md`'s
upload-session lifecycle.

### Virtual repositories

Nothing a pub client reads is signed or names the repository beyond the hosted URL the handler
renders per request, so a `virtual` pub repository is expressible, and per the resolved
virtual-repository decision below it is served, **merged by package, first member wins**: for each
package name the first member in order that holds the package supplies its whole listing, its
advisories document and its archives, and no later member contributes versions to it. Member order
is `data-model.md`'s resolution order (its `virtual` row and AC6), and a merge by version would let a
proxied pub.dev member's newer release of a name shadow the private package the local member was
placed first to provide, which is the dependency-confusion shape a Flutter team's virtual
repository exists to close. The listing's `archive_url` values are rendered under the virtual's own
hosted URL, so the client attaches its token to them (Design, "Authentication"), and an archive
request resolves through the member that supplied the listing. Nothing is generated, so the merge
runs per request and no `index.merge` job exists for it; the listing is served through the door's
per-request virtual form, its `Last-Modified` the latest of the virtual's pointer and the
supplying member's record for that name, floored so a member's removal never moves it backwards
(`data-model.md` AC36; `signing-service.md` AC32). Advisories follow the supplying member
(Design, "Advisories on the hosted path"). Publish step 1 against a virtual answers `400` naming
the repository type as it does for a remote, and every management operation answers `405`
`repository-type`.

Two consequences of total shadowing are stated because a user reads the rule as a promise. A
project that locked a later member's version of a name before an earlier member came to hold it
(`acme_tool` 2.0.0 from the pub.dev member, then the local member publishes `acme_tool` 1.0.0)
re-resolves on its next `dart pub get`: the locked version is absent from the listing the
virtual now serves, so the solver picks from the local member's versions and the lockfile's
`url`, `version` and `sha256` lines change, loudly rather than silently. And the shadowing is by
exact spelling, because pub names are exact (`rubygems.md`'s recheck found a folded key let any
`push` holder hide a public gem; pub has no folding to exploit).

### Capabilities and lifecycle

`Capabilities()` declares proxy support `supported`, reference-implementation availability
`available` (pub.dev for the read surface, and a local stand-in for the publish flow on the
recorded exception list, below), `Virtual: supported` (the section above) and `Rename: supported`,
the four fields `format-handler-interface.md` AC13 names. Rename is supported because nothing
stored names the repository: the listing, its `archive_url` values and the publish flow's upload
and finalize URLs are rendered per request under the repository's current hosted URL, and every
record binds the repository's identity. A consumer points `PUB_HOSTED_URL` or `hosted: url:` at the
new path; `pubspec.lock` records the hosted URL, so its `url` lines change on the next resolution
while the content hashes stay, because the bytes are identical (the same property Design records
for moving between this registry and pub.dev). The old name answers `not-found`
indistinguishably from a never-existing repository (`repository-lifecycle.md` AC12), which
requires `conformance/pub/rename_test.go`, enforced by the harness's case-set validator
(`conformance-harness.md` AC26); AC18 carries it with the real client.

### Conformance, auth and the corpus

Two pinned SDKs, straddling the content-hash watershed so both client paths get a real oracle:
one from the 2.18 line, which honours retraction (2.15) and stores tokens but records no
content hash, and one current 3.x, which verifies hashes (2.19), validates tokens (3.0) and
surfaces advisories (3.4). Client images are pinned by digest per the harness rule
(`conformance-harness.md` AC4), each client container is confined to the case network (its
resolved client-confinement decision, was Q6, AC23), and the harness CA goes into the image's
system trust store, since the client offers no CA option of its own.

The recorded surface for AC13's corpus, named now because a thin recording script yields a thin
specification: cold `dart pub get`, warm `dart pub get` with a fresh `PUB_CACHE`,
`dart pub get --enforce-lockfile`, `dart pub add`, `dart pub upgrade`, `dart pub outdated`,
`dart pub global activate`, `dart pub unpack`, a resolution against a package with a retracted
version (found on pub.dev at recording time, since retractions are public state), an advisories
fetch for an affected package and the advisories document itself (the shape AC11's hosted
rendering is held to), a second listing fetch carrying `If-None-Match` and answered `304` where
the pinned client sends it, a missing-package failure, and the unauthenticated
`versions/new` challenge (probed 2026-09-26: `401`, the challenge header, and a JSON body).
**The publish flow cannot be recorded against pub.dev**, because a publish there is permanent
and unrecordable without leaving a package behind; its corpus is recorded against a local
stand-in, pub.dev's own server run in its fake mode (`app/bin/fake_server.dart` in
`dart-lang/pub-dev`, the real application over in-memory services, pinned at a commit and by the
built image's digest), and sits on the recorded exception list with that reason, per the
harness's authoritative-reference resolution: a `pub | Write` row naming that stand-in, which
`conformance-harness.md`'s table does not yet carry and its AC28 fails without, is reported to
that spec. Recording gates on the harness's redaction criterion
(`conformance-harness.md` AC13), and every deliberate divergence, the seven-day windows and the
stand-in publish among them, goes on the exception list before its flow is expected to replay.

Provisioning a retracted or discontinued state for a case follows the harness's resolved
decisions on the closed vocabulary and on how `setup` is applied (was Q4 and Q5 there): `setup`
never calls a management endpoint, so a case wanting only the effect seeds the state through its
`state` key, and a case exercising trigger and effect together calls the management endpoint
from its `script` and then runs the client; the case-set validator requires one such `script`
case per declared kind (`withdraw`, `restore`, `annotate`) and a `rename_test.go`
(`conformance-harness.md` AC26). The pattern-scoped tokens AC15 needs come from the
`credentials` key, and AC16's rules from `policies` and `advisories`.

## Acceptance Criteria

- [ ] AC1: `dart pub get` resolves and installs a package from a hosted repository for two pinned
      SDKs, one before 2.19 and one current 3.x, pointed at the registry once through
      `PUB_HOSTED_URL` and once through a per-dependency `hosted: url:`, with the resulting
      `pubspec.lock` recording the trailing-slash hosted URL as `url` and, on the 3.x client,
      a `sha256` equal to the listing's `archive_sha256`.
- [ ] AC2: `dart pub publish` completes the three-step flow against a hosted repository, the
      client prints the finalize success message, and a subsequent `dart pub get` from a fresh
      `PUB_CACHE` installs the published version with a content hash matching the listing.
- [ ] AC3: A finalize for a version that already exists is refused with `400`, a `VersionExists`
      code and a message the client prints, leaving no new snapshot; an archive without a root
      `pubspec.yaml`, or whose pubspec name or version fails the grammar, is refused the same
      way; an archive whose gzip stream expands past the decompression bound is refused at
      finalize with nothing committed; a multipart upload whose `Content-Length` exceeds
      `management.publish_spool_limit` is refused `413` with pub's error body before any byte is
      read and one that outgrows it undeclared is cut and refused with nothing staged, the client
      printing the message (`management-api.md` AC36); and an upload whose finalize never arrives
      leaves no version and its staged blob is collected once its session expires under
      `data-model.md`'s idle period and cap (its AC26) and the repository's grace lapses
      (`storage-and-gc.md` AC3).
- [ ] AC4: `dart pub token add --env-var` with a token of the `swr_` shape `auth.md` fixes is
      accepted by both pinned clients, and `dart pub get` and `dart pub publish` then succeed
      against a private hosted repository, including the archive download; an
      unauthenticated `dart pub get` receives `401` with the `WWW-Authenticate` challenge and
      the client prints the server message and exits non-zero; an invalid token receives `401`
      and the client deletes it, asserted from the token store afterwards; a valid pull-only
      token receives `403` on publish and keeps its token; and a valid token without read
      access receives a `404` indistinguishable from a nonexistent repository.
- [ ] AC5: For every version in a served listing, hosted and proxied, `archive_sha256` equals the
      sha256 of the bytes the `archive_url` serves, proven by `dart pub get --enforce-lockfile`
      succeeding on a second client with a fresh `PUB_CACHE` against a lockfile produced on the
      first; and no served archive response carries an `x-goog-hash` header.
- [ ] AC6: Retracting a version through the registry-owned management API's `withdraw` kind on a
      hosted repository
      makes a fresh `dart pub get` select the previous version and annotate the retracted one,
      while a project whose `pubspec.lock` already pins it, and one pinning it by exact
      `dependency_overrides`, still install it; a `restore` clears the flag and returns it to
      resolution; and each change is one metadata-only write producing one snapshot and no
      `Retirement` record.
- [ ] AC7: Discontinuing a package with a `replacedBy` through the registry-owned management API's
      `annotate` kind makes
      `dart pub get` print the discontinued notice for a direct dependency and
      `dart pub outdated` show the replacement, and the listing carries both fields.
- [ ] AC8: The proxied path installs a package from a pub.dev stand-in and serves it from cache on
      a second `dart pub get` with a fresh `PUB_CACHE`, with the second run reaching this
      registry and the upstream receiving no request, both asserted from the transcript and at
      the network layer; the served listing carries no upstream `archive_url`, preserves the
      upstream's `published` field, and carries the remote's cache-scoped `Last-Modified`, never
      the stand-in's; an archive redirect to a host the upstream's allowlist names is followed
      inside the adapter and one to an unlisted host makes no connection; and a missing name is
      negatively cached so the client's not-found error costs one upstream request within the
      negative TTL.
- [ ] AC9: A listing is revalidated after its TTL and not before, proven through the pub proxied
      path against a mutating stand-in: a version published upstream becomes visible to
      `dart pub get` after the TTL and, absent an explicit refresh, not before; and revalidation
      of an unchanged listing is a conditional request answered `304`, asserted at the network
      layer; and a revalidated listing older by `Last-Modified` than the adopted one is not
      adopted and records a divergence.
- [ ] AC10: An upstream `retracted` mark is mirrored at the next revalidation with the cached
      archive kept and a divergence recorded; a changed upstream `archive_sha256` purges the
      cached archive and raises the operator alert; a version vanishing from the listing, or a
      package answering `404` at revalidation, keeps serving with a divergence alert; a new
      upstream advisory is relayed without being treated as a removal; and `isDiscontinued`
      propagates as an ordinary change, as pub's side of the settled removal table in
      `proxy-cache.md` (its AC13).
- [ ] AC11: On a hosted repository, a package no advisory record stands against is listed
      without `advisoriesUpdated` and the client makes no advisories request, asserted from the
      transcript; a package a controlled advisory (the `advisories` setup key) stands against is
      listed with `advisoriesUpdated` equal to the source's freshness value, its advisories
      document enumerates the affected stored versions with `aliases` present, the 3.x client
      prints the advisory for the affected version in its resolution report and is silent for it
      under `ignored_advisories`; after the source's freshness advances the client refetches the
      document, after the record is withdrawn the field is absent and the client prints nothing,
      and a name the repository's `coordinate_exemptions` exempts is listed without the field. On
      the proxied path a listing preserves the upstream's `advisoriesUpdated`, the advisories
      document is served from cache, and the 3.x client surfaces the advisory for an affected
      version.
- [ ] AC12: A listing request with the v2 `Accept` header receives the v2 content type and one
      with no `Accept` header receives the same document; the deprecated version-info endpoint
      answers from the same stored state as the listing, proven by a publish appearing in both;
      and the deprecated tarball path answers `303` to the `archive_url`.
- [ ] AC13: Replay-match passes against a corpus recorded from pub.dev covering the recorded
      surface named in Design, with the publish flow replayed from its stand-in corpus on the
      recorded exception list.
- [ ] AC14: Retraction and un-retraction (`withdraw`, `restore`) require `delete` and
      discontinuation (`annotate`) requires `push` on a `local` repository, a principal without the
      needed action is refused with no snapshot created, and each operation against a `remote` or
      `virtual` repository is refused `405` `repository-type`; a request to pub.dev's `options`
      routes is not served and changes nothing; and a publish initiated against a `remote` or
      `virtual` repository is refused at step 1 with `400` and a code naming the repository type,
      which the client prints.
- [ ] AC15: A token holding `pull` and `push` under the pattern `acme_*/**` publishes `acme_tool`
      through the real three-step `dart pub publish` and installs it with `dart pub get`, and is
      refused publishing `other_tool` at finalize with a `403` the client prints while keeping
      its stored token, with no snapshot created, and refused resolving `other_tool` with a
      `404`; and in proxied mode it installs an in-pattern package through the cache and is
      refused another, never receiving a `401`.
- [ ] AC16: A listing or archive request the shared policy layer refuses answers `403` through
      `WriteRefusal` with the error body and a challenge `message` naming the policy, on the
      hosted and the proxied path, the status line carrying the `Refused by policy:` phrase on
      HTTP/1.1, and a real `dart pub get` of the refused version exits non-zero with that text in
      its output and its stored token intact; the case's fallback observation fills pub's
      `pending` row of `supply-chain-policy.md`'s binding table in the same change.
- [ ] AC17: A virtual repository over a local member holding `acme_tool` 1.0.0 and a remote member
      whose stand-in upstream offers `acme_tool` 2.0.0 and `http` serves the local member's
      listing alone for `acme_tool` and the remote's for `http`, every `archive_url` under the
      virtual's hosted URL; `dart pub get` on both pinned SDKs installs the local 1.0.0 and the
      upstream package with content hashes matching the listings; publish step 1 against the
      virtual answers `400` naming the repository type; and a management operation against it
      answers `405` `repository-type`.
- [ ] AC18: `Capabilities()` declares proxy `supported`, reference implementation `available`,
      `Virtual: supported` and `Rename: supported`; after a rename, `dart pub get` on both pinned
      SDKs resolves from the new hosted URL with byte-identical archives and unchanged content
      hashes in `pubspec.lock`, `dart pub publish` completes its three steps against the new name,
      and the old name answers `not-found` indistinguishably from a never-existing repository.
- [ ] AC19: Every listing and advisories response carries a strong `ETag` satisfying the
      client's entity-tag grammar and a `Last-Modified`, and every archive response a strong
      `ETag` equal to its CAS digest, none set by the handler package; a second `dart pub get`
      from a client that sends `If-None-Match` is answered `304` on an unchanged listing and
      resolves from its cache, while a retraction, a rollback of the default pointer to a
      snapshot the pointer served before, and a new standing advisory each change the `ETag` so
      the same client receives `200` with the new listing and `Last-Modified` has moved
      forward, on the hosted and the proxied path; a `HEAD` on a listing and on an archive
      answers the `GET`'s status and headers with `Content-Length` and no body; and on a private
      repository every response carries `private` with no `public` or `s-maxage`, while an
      anonymously readable repository answers a credential-less archive request with the
      declared immutable value.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/pub/hosted_test.go` (pinned 2.18-line and 3.x SDKs; `PUB_HOSTED_URL` and `hosted: url:` cases; lockfile `url` and `sha256` assertions) |
| AC2 | conformance | `conformance/pub/publish_test.go` |
| AC3 | conformance + integration | `conformance/pub/publish_test.go` (republish, malformed-archive and over-bound refusals, message in client output); `internal/format/pub/upload_session_test.go` (snapshot-table assertion; abandoned-upload collection against the storage layer's cleanup); `internal/format/pub/ingest_bounds_test.go` (the decompression bound; the spool bound's three cases under an in-process key change, shared with `management-api.md` AC36's `internal/manage/spool_limit_test.go`) |
| AC4 | conformance | `conformance/pub/auth_test.go` (a `swr_` token issued through the `credentials` key and added with `--env-var` on both SDKs; token store inspected after the invalid-token case; the 404 case shares `conformance/core/existence_oracle_test.go`'s assertion shape) |
| AC5 | conformance + integration | `conformance/pub/enforce_lockfile_test.go` (two clients, fresh cache); `internal/format/pub/listing_test.go` (hash-equals-digest across every version; header assertion on archive responses) |
| AC6 | conformance + integration | `conformance/pub/retraction_test.go` (the `script` drives `withdraw` and `restore` through the management endpoint; fresh resolution, locked pin, override pin, un-retract; a second case seeds the retracted state through `state`); `internal/format/pub/manage_retract_test.go` (write-boundary and snapshot assertions, no `Retirement` record) |
| AC7 | conformance | `conformance/pub/discontinued_test.go` (the `script` drives `annotate` through the management endpoint) |
| AC8 | conformance | `conformance/pub/proxied_test.go` (transcript + network-level assertion, fresh `PUB_CACHE` in setup; missing-name case; a redirecting stand-in with its storage host as a `hosts` sub-entry, and one redirecting off the allowlist) |
| AC9 | conformance + integration | `conformance/pub/proxied_ttl_test.go` (mutating local stand-in upstream with `ETag` support; network-level `304` assertion); `internal/format/pub/proxied_freshness_test.go` (cache-scoped `Last-Modified`, the older listing not adopted; shares `internal/proxy/freshness_test.go`'s assertions, `proxy-cache.md` AC22) |
| AC10 | integration | `internal/format/pub/removal_test.go` (test upstream presenting each event class; the shared-layer half is `proxy-cache.md` AC13's) |
| AC11 | conformance + integration | `conformance/pub/advisories_test.go` (hosted: the silent package, the affected package through the `advisories` key with the client's report and `ignored_advisories`, the refetch after a freshness advance, the withdrawn record, the exempted name; proxied relay with an affected-version fixture); `internal/format/pub/advisories_render_test.go` (the OSV shape against the corpus's pub.dev document; `aliases` always a list; `versions` enumerated from per-version reader answers; the freshness value forward-moving across a withdrawal; shared with `supply-chain-policy.md` AC19's `internal/policy/advisory_reader_test.go` for the reader's answers) |
| AC12 | integration | `internal/format/pub/negotiation_test.go`; `internal/format/pub/legacy_endpoints_test.go` (no client oracle: the current client never requests these) |
| AC13 | conformance | `conformance/pub/replay_test.go` |
| AC14 | integration + conformance | `internal/format/pub/manage_retract_test.go` (action and repository-type cases, sharing `management-api.md` AC9's action table and AC7's `repository-type` case; the unserved `options` routes); `conformance/pub/publish_test.go` (publish against a remote repository, message in client output) |
| AC15 | conformance + unit | `conformance/pub/auth_test.go` (the pattern-refusal case `format-handler-interface.md` AC7 requires, in both modes; token store inspected after each refusal); `internal/format/pub/scope_object_test.go` (the object table, per route, including the content-addressed publish steps and the finalize lookup, `format-handler-interface.md` AC12) |
| AC16 | conformance | `conformance/pub/policy_test.go` (hosted and proxied modes; rules through the `policies` key, a controlled advisory through `advisories`; the raw status line read from the socket; a second hosted URL in the project to capture fallback for the `supply-chain-policy.md` AC20 row); the phrase shares `internal/format/refusal_writer_test.go` (`supply-chain-policy.md` AC18) |
| AC17 | conformance + integration | `conformance/pub/virtual_test.go` (a virtual over a local and a remote member; both SDKs; archive URLs and hashes asserted); `internal/format/pub/virtual_merge_test.go` (per-package first-member-wins with a higher later-member version, advisories from the winning member, the `400` and `405` refusals) |
| AC18 | unit + conformance | `internal/format/capabilities_test.go` (this handler's four declarations, `format-handler-interface.md` AC13); `conformance/pub/rename_test.go` (both SDKs against the renamed repository, byte and lockfile-hash comparison, publish under the new name, old name `not-found`; required by `repository-lifecycle.md` AC12) |
| AC19 | conformance + integration + architecture | `conformance/pub/freshness_test.go` (the conditional second fetch on the SDK that sends `If-None-Match`, answered `304`, then `200` after a retraction, a rollback and a new advisory, in both modes; the private-repository header assertion); `internal/format/pub/serving_test.go` (the validator identity covering the advisory input, the serve policies, `HEAD` on each route through the door; shares `internal/index/head_test.go` and `internal/index/cacheability_test.go` with `signing-service.md` AC32 and AC38); the no-header scan is `signing-service.md` AC11's `internal/index/freshness_boundary_test.go`, which covers this package |

The runner-enforced obligations, both modes and unauthenticated and unauthorized cases in each,
apply from the sibling specs and are not restated per criterion here; AC4 covers pub's specific
status semantics on top of them.

## Implementation Phases

### Phase 1: Hosted core
- Listing rendering with `latest` and content hashes, archive serving under the hosted URL, the
  deprecated endpoints, the three-step publish with validation, the spool and decompression
  bounds, republish refusal and the upload-session lifecycle, the 401/403/404 split and the
  challenge header, the per-route addressed-object declaration, the `403` policy rendering
  through `WriteRefusal`, the listing and advisories document through `ServeRendered`'s lazy
  form and archives through `ServeFile` with the serve policies (AC19), the hosted advisories
  rendering from the reader (AC11), and `Capabilities()` with the rename case (AC18)

### Phase 2: Mutation surface
- Waits on `docs/internal/plans/foundation/management-api.md` reaching `planned` (Blocking
  preconditions)
- The `Operator` interface declaring `withdraw`, `restore` and `annotate` for retraction,
  un-retraction and discontinuation; the write-boundary declaration exercised end to end

### Phase 3: Proxied path
- Classification, `archive_url` rewriting with unknown-field preservation, conditional
  revalidation under the cache-scoped `Last-Modified`, allowlisted archive redirects, negative
  caching, the advisories relay, the removal table by event class including the hash-change
  purge, header stripping on archives; the per-package virtual merge (AC17)

### Phase 4: Corpus and gate
- Recording session across the named surface (after the harness redaction gate), the stand-in
  publish corpus and its exception-list entry, replay-match, the second pinned SDK,
  experiment-log entries

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. The five questions this draft raised were each written in the template's decision
shape and then adopted at their own recommendation under the owner's standing delegation of
2026-09-26 (`CLAUDE.md`), so that the loop keeps running; each record below opens with the
adoption line so `grep -rn "standing delegation"` finds it, and every one is reversible by the
owner. Each is folded through Scope, Design, the criteria and the Test Plan above. The
2026-09-26 cross-spec reconciliation revised Q2's adoption to the registry-owned management API
the Cluster 5 format specs converged on, and recorded that the revision Q4 waited for has
happened. The 2026-09-28 reconciliation with the foundation wave adopted a sixth on Opus (was Q6,
virtual repositories), because `format-handler-interface.md` AC13 now requires every handler to
declare the capability and this spec had never decided it, and added landing notes to the records
the foundation specs answered. The Fable recheck of 2026-10-08 re-examined Q6 (confirmed, its
cost amended), confirmed Q1, Q2, Q4 and Q5, and adopted a seventh on Fable (was Q7, hosted
advisories rendered from the advisory reader), which supersedes Q3, an Opus-era adoption whose
only stated reason, the absence of a feed, no longer held.

### Resolved: the authentication challenge versus the existence oracle (was Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: an unauthenticated
request to a private or nonexistent repository receives the spec-mandated `401` challenge
uniformly; an authenticated caller without read access receives `404`; `403` is reserved for a
valid token that can read but lacks the scope a write needs. Folded into the status table in
Design, AC4 and AC14.

The repository spec requires `401` with a `WWW-Authenticate` challenge when authentication is
missing or the token is invalid, and `403` when a valid token lacks permission, and the client
deletes its stored token on `401`. `foundation/auth.md` settled that missing and forbidden are
indistinguishable to a caller without read access, both `404`, so private names cannot be
enumerated. The two contracts collide on the unauthenticated request to a private repository.

**Recommendation:** A, because it honours both contracts where each has force: the challenge
carries the message that tells a user how to obtain a token, which is the whole reason the
spec mandates it, and a challenge returned uniformly for every unauthenticated request against
anything not anonymously readable reveals nothing about which names exist. It is the same shape
`foundation/auth.md` already accepts for OCI's mandated challenge.

| Option | You get | It costs |
|---|---|---|
| **A. Uniform `401` challenge when no credential is presented; `404` for an authenticated caller without read; `403` only for a readable repository's missing write scope** | The client prints the token-acquisition message; no valid token is ever deleted; no existence oracle, since the unauthenticated response does not depend on the name | An unauthenticated request for a nonexistent repository says "authenticate" rather than "not found", a mild oddity the message can explain |
| **B. `404` everywhere `auth.md` says so, including the unauthenticated case** | One rule, applied literally | An unauthenticated user is told the package does not exist instead of being told to add a token, and the spec's message mechanism is dead on this registry |
| **C. `403` for an authenticated caller without read, as the spec's permission case reads** | Closest literal reading of the spec | Confirms the existence of every private name to any token holder, the enumeration `auth.md`'s existence-oracle decision exists to prevent |

**Why this is yours:** it reconciles a protocol-mandated response with a security posture the
owner settled in a sibling spec, and it decides which a pub user experiences; a grep cannot
price a client message against an enumeration surface.

Accepted cost: the uniform challenge means the unauthenticated not-found case is reported as an
authentication requirement, and `foundation/auth.md`'s client table and existence-oracle section
should record pub's mandated challenge beside OCI's as a second protocol-driven exception, a
sibling edit listed for the next pass rather than made here. B lost because it silences the
mechanism the spec provides for exactly this situation; C lost because it is the oracle. Since then
`auth.md` has made the challenge a per-format declaration it emits byte-identically
(its uniform-challenge rule and AC17), so pub's challenge needs no exception; its client table
carries the `dart pub` row and its uniform-challenge rule names pub among the formats declaring
`Bearer`, so nothing is owed there. Rechecked on Fable 2026-10-08: confirmed; the fold was
complete, and the client source re-read this pass still deletes the token on any `401` under the
hosted URL and handles `401` and `403` on publish as separate cases (`_publish` in `lish.dart`),
so the split stands as written.

### Resolved: the hosted retraction and discontinuation surface (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation, and revised the same day by the
cross-spec reconciliation.** Option D, added in that revision: retraction, un-retraction and
discontinuation are operations of the registry-owned management API,
`docs/internal/plans/foundation/management-api.md`, with no
time windows, retraction under `delete` and discontinuation under `push`, the trigger
integration-tested and the effect conformance-tested through the real client; pub.dev's own
`options` routes are not served. Folded into the blocking preconditions, Scope, the wire table,
the retraction section of Design, the write-boundary declaration, AC6, AC7, AC14 and Phase 2.

As first adopted this record chose A, serving pub.dev's `options` endpoints under `push`, on the
reading that A matched the PyPI yank recommendation of the time. That recommendation was then
adopted in a different form: `pypi.md`'s resolved hosted-yank decision (was Q1), with `npm.md`
and `ansible-collections.md` beside it, put every management operation on one registry-owned API
and served a client's own route as a binding only where a client drives it. A's own accepted cost
foresaw this ("if Cluster 5 is settled toward a single cross-format surface, these endpoints
become that surface's pub rendering"); the revision goes one step further and declines the
pub.dev routes, because no `dart pub` command drives them. The action split follows the
cross-format mapping `auth.md` records for management operations: retraction is yank-class, so
`delete`; discontinuation is deprecation-class, so `push`.

Retraction and discontinuation are the ecosystem's only removal semantics and their effects are
standardised in the client, but no client command triggers them and the repository spec has no
endpoint for them; pub.dev's own web UI uses an API of its own. This is the same question
`pypi.md` asked about yank (was its Q1), and `foundation/question-triage.md` Cluster 5 named it
as one cross-format precedent.

**Recommendation (as first written):** A, matching the PyPI yank recommendation of the time
(`pypi.md`, was Q1) so the precedent is set once. The
shape is pub.dev's rather than invented, so nothing is designed ahead of the cross-format
management API; the model already treats a metadata-only mutation as a write; and a hosted pub
repository that cannot retract can only hard-delete, which is the destructive operation
retraction exists to avoid and which this ecosystem does not even have.

| Option | You get | It costs |
|---|---|---|
| **A. Serve pub.dev's `options` endpoints on hosted repositories now, authorization-only** | Hosted retraction and discontinuation are real and client-testable; the shape already exists in the ecosystem; operators get the soft delete instead of nothing | A management write surface on a format handler ahead of a management-API design, verified by our tests alone at the trigger; and a divergence from pub.dev's seven-day windows on the exception list |
| **B. Proxied-only marks in v1; hosted retraction waits for the management-surface era** | No precedent set ahead of the cross-format decision | A hosted repository has no removal semantics at all, not even a hard delete, and the matrix must record hosted retraction as absent |
| **C. Mirror pub.dev's seven-day retract and undo windows as well** | Replay-faithful to pub.dev's policy | Encodes public-commons policy against a private registry's data, blocks an operator from retracting their own week-old mistake, and the windows need pub.dev's clock semantics to mean anything |
| **D. Registry-owned management operations, pub.dev's routes not served** (adopted in revision) | One management surface across formats, as PyPI, npm and Galaxy have; hosted retraction and discontinuation stay real and client-testable; no per-format route with only `curl` behind it | Phase 2 waits on `management-api.md`; an operator used to pub.dev's Admin tab finds the registry's management surface instead; a publisher needs `delete` to retract |

**Why this is yours:** it sets the precedent for what a format handler's management surface is,
the same product-surface sequencing call the PyPI and Galaxy management questions carried (was
Q1 in `pypi.md`, was Q5 in `ansible-collections.md`), and it was owned by Cluster 5 rather than
by any one format.

Accepted cost: D's, stated in the table, plus the trigger being verified only by this registry's
own integration tests, stated as such in the Test Plan, and the seven-day divergence as an
exception-list entry. A lost in revision because its per-format routes are the surface the
cross-format precedent rules out wherever no client drives them; B lost because it leaves a
hosted repository with no removal path in an ecosystem whose only removal is this one; C lost
for the reason `npm.md`'s resolved hosted-unpublish decision (was Q3) gives against mirroring
unpublish windows. `management-api.md` has since landed D as written: retraction and un-retraction are its
`withdraw` and `restore` kinds under `delete` (its resolved withdraw-action decision, was Q1),
discontinuation its `annotate` kind under `push`, and its binding rule names this spec's refusal of
pub.dev's routes as the case a binding may not cover. Rechecked on Fable 2026-10-08: confirmed;
the two pub rows of that spec's reconciliation table read `withdraw`, `restore` under `delete`
and `annotate` under `push` with no binding, its `withdraw` and `annotate` kind rows name pub
retraction and discontinuation, and the trigger-versus-effect split is held by AC6 and AC7 as
written.

### Resolved: advisories on the hosted path (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the hosted listing omits
`advisoriesUpdated`, so the client never requests the advisories endpoint and no claim is made;
the proxied path relays the upstream's field and document. Folded into Scope, the proxied-path
and supply-chain sections of Design, and AC11.

The client fetches `/api/packages/{package}/advisories` only when the listing carries
`advisoriesUpdated`, and since Dart 3.4 surfaces affected versions during resolution. Real
advisory data belongs to `supply-chain-policy.md`, whose feed authority was then open (settled
since as OSV, its resolved advisory-feed decision, was Q1). This is npm's
audit-request question in a kinder shape: the client asks only when told it may.

**Recommendation:** A, because omission is silent and honest: no warning in any build, no
false all-clear, and no hosted package name sent anywhere.

| Option | You get | It costs |
|---|---|---|
| **A. Omit `advisoriesUpdated` on hosted listings; relay on proxied** | No false security claim; no client noise; the proxied path keeps the ecosystem's own signal intact | Hosted packages get no advisory surface until `supply-chain-policy.md` has a feed to serve, and the field's later appearance is a behaviour change clients will notice |
| **B. Advertise the field and serve an empty advisory list** | Looks like a fully featured repository | Asserts "no known advisories" about content nothing checked, silently, on every resolution |
| **C. Forward hosted package names to pub.dev's advisories endpoint** | Real answers for names that also exist publicly | An egress path from the hosted surface that leaks private package names to a third party, the dependency-confusion shape `npm.md`'s resolved audit-request decision (was Q2) refuses |

**Why this is yours:** it is a security-posture and privacy claim the product will be held to,
priced against a feature gap on the hosted path.

Accepted cost: hosted repositories carry no advisory data in v1, and adding the field later is
a visible change. B lost because it is a silent false claim; C lost because it leaks. The feed this
record waited for now has a handler-side read: `supply-chain-policy.md`'s advisory
reader in `Deps` (its AC19; `format-handler-interface.md` AC14), which returns the advisory records
standing against a coordinate without evaluating anything. Rendering it into a hosted listing
would change what the listing claims about packages nothing but the feed checked, so it is left to
a revision of this record rather than taken in a reconciliation pass, and the omission stands.

**Superseded on Fable 2026-10-08 by the resolved hosted-advisories decision below (was Q7).**
This record's option A was adopted because `supply-chain-policy.md` had no feed to serve, its
accepted cost named the field's later appearance as the planned revision, and the recheck found
the reader in `Deps` and the hosted-matching decision (was Q12 there) in place. Omission stays
the answer for a package no record stands against, now computed rather than assumed; the
privacy reason against option C is unchanged, since the reader is local.

### Resolved: pub.dev as a preconfigured upstream (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: pub.dev is not added to
the preconfigured upstreams or the nightly real-upstream job by this spec; a remote repository
against it is user-configured, and the question is revisited through the revision
`ansible-collections.md`'s Galaxy decision (was its Q4) requested of `proxy-cache.md`. Folded
into the proxied-path section of Design.

That revision has since happened, and it answered for pub.dev too: `proxy-cache.md`'s resolved
preconfigured-set extension (was Q14) added galaxy.ansible.com and deliberately left pub.dev and
crates.io user-configured until a `continue` breadth-gate verdict authorizes their formats, each
then decided as its own extension. So B stands, now as that spec's decision rather than a
deferral pending it, and the revisit this record promised is the post-verdict extension.

`proxy-cache.md` settled the preconfigured, enabled-by-default upstreams as npm, PyPI and Docker
Hub, and the nightly job covered exactly that set. A Flutter team is the archetypal user of a
pub cache, so the works-in-thirty-seconds argument applies, and `ansible-collections.md` asked
the same question for Galaxy (its preconfigured-upstream question, was Q4).

**Recommendation:** B, because the preconfigured set is a decision the owner actually made, and
the standing delegation does not extend to amending one from a sibling spec; the delegation
covers this spec's questions, not `proxy-cache.md`'s resolved record. The right vehicle is the
revision the Galaxy decision requests of that spec (was Q4 there), and pub.dev can ride it.

| Option | You get | It costs |
|---|---|---|
| **A. Preconfigure pub.dev and add it to the nightly job when the format ships** | The archetypal user's first run works without configuration; real-upstream drift is caught on a schedule | Amends an owner-made sibling decision from a Tier 2 spec, outside what the delegation licenses; one more real-upstream support surface |
| **B. User-configured in v1; revisit with the Galaxy decision's revision (`ansible-collections.md`, was Q4)** | The sibling's resolved decision is untouched; one revision carries both candidates | A worse first-run story for pub than for npm, and no scheduled run against the real pub.dev until that revision lands |

**Why this is yours:** it extends a set you settled in `proxy-cache.md`, and ranking a Tier 2
format's first-run experience against the standing support surface is a product call.

Accepted cost: the format's proxied path ships with no preconfigured upstream and no nightly
row until a post-verdict extension of `proxy-cache.md` adds them. A lost on the delegation's own
boundary, not on merit, and `proxy-cache.md` later rejected the same option there (its option B)
because it commits support surface to a format the breadth gate may park. Its second extension (was
Q17), adding api.nuget.org and repo.maven.apache.org for two Tier 1
formats, left pub.dev where this record put it. Rechecked on Fable 2026-10-08: confirmed;
`proxy-cache.md`'s preconfigured set at HEAD still leaves pub.dev user-configured until a
`continue` verdict, so the deferral is that spec's decision and nothing here is owed.

### Resolved: a changed upstream content hash (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a changed
`archive_sha256` for a version this registry has cached is treated as the explicit signal of the
settled removal table: the cached archive is purged, the operator is alerted, and the fresh
listing is served. Folded into the removal table in Design and AC10.

The settled table in `proxy-cache.md` purges on an explicit security signal and keeps-and-flags
otherwise, and its motivating case is npm's security-holding replacement: the same "immutable"
coordinate returning different bytes. Pub's content-hash rule makes that case sharper than
anywhere else, because the client verifies downloaded bytes against the **fresh** listing's hash
and reports a mismatch as the repository's fault. A proxy therefore cannot keep old bytes and
relay a new hash; it must either follow the upstream or freeze both.

**Recommendation:** A, because it is the settled table applied to the one case where the
ecosystem gives the proxy a machine-checkable signal, and because the alternative, freezing the
old listing and bytes, turns the cache into a fork that silently diverges from the upstream for
every client behind it.

| Option | You get | It costs |
|---|---|---|
| **A. Purge the cached archive, alert, serve the fresh listing** | Follows the settled table; clients see exactly what pub.dev serves; lockfile holders get the client's own warning or, under `--enforce-lockfile`, a deliberate failure | If the upstream change is itself malicious, the proxy propagates it; the alert is the mitigation, and `supply-chain-policy.md` is the refusal path |
| **B. Freeze: keep the cached listing hash and bytes, alert** | The proxy never serves bytes it did not verify against the hash it first saw | The registry becomes an unannounced fork of the upstream; new clients and `dart pub upgrade` runs resolve against a listing the upstream no longer serves, and the divergence persists until an operator acts |
| **C. Keep the cached bytes, relay the new listing** | Nothing is purged | Every download fails the client's content-hash check with an error blaming this registry, which is the worst of both |

**Why this is yours:** it applies a removal policy you settled to a signal that is genuine but
not necessarily benign, and pricing propagation of an upstream change against forking the
upstream is a posture call.

Accepted cost: a malicious upstream replacement propagates to clients until the alert is acted
on or a policy refusal lands; that is the cost the settled table already accepted for npm's
holding-package case, and `--enforce-lockfile` gives pub users a client-side stop the npm case
lacks. B lost because a silent fork is a worse security posture than a loud propagation; C is
inconsistent by construction. Rechecked on Fable 2026-10-08: confirmed; `proxy-cache.md`'s
event-class table names pub's `archive_sha256` change under the coordinate-bound immutability
violation and its `retracted: true` under flag mirroring, the client source re-read this pass
still hashes the download against the freshly fetched listing's `archive_sha256` rather than
the lockfile's (`_downloadAndExtract`), and the retained-revision count of zero added this pass
means no superseded listing revision could ever serve the old hash.

### Resolved: virtual repositories and the merge rule (was Q6)

**Adopted 2026-09-28 under the owner's standing delegation**, on Opus during the foundation-wave
reconciliation. Option A: `virtual` pub repositories are served, merged by package with the first
member in order that holds the package supplying its whole listing, advisories and archives, every
`archive_url` rendered under the virtual's hosted URL (Scope; Design, "Virtual repositories";
AC17).

The question: `format-handler-interface.md` AC13 now requires every handler to declare `Virtual`
as `supported` or `unsupported`, and `repository-lifecycle.md` refuses a virtual repository of a
format that declares it unsupported, but this spec never decided whether a pub repository may be
virtual or how members combine; it only said publish against one is refused.

**Recommendation:** A. Nothing a pub client reads is signed or names the repository beyond the
hosted URL the handler renders per request, so `hex.md`'s reason for refusing does not apply; the
client resolves from one hosted URL per dependency, so a virtual repository is the only way a
Flutter team combines private packages with a pub.dev cache under one `PUB_HOSTED_URL`; and member
order is `data-model.md`'s resolution order, so first-member-wins per package is the rule already
settled for content, the one `cran.md`, `swift.md`, `puppet.md` and `conda.md` adopted for the
same dependency-confusion reason.

| Option | You get | It costs |
|---|---|---|
| **A. Serve virtual repositories; first member wins per package** | One hosted URL over private and proxied packages; a private package shadows a public one of the same name durably | A later member's versions of a name are invisible while an earlier member holds it; operators learn precedence is order, not version |
| **B. Merge listings by version across members** | Every version from every member | A public release outranks a private one of the same name, the dependency-confusion shape, and one listing mixes two publishers' archives |
| **C. Declare `Virtual: unsupported`** | No merge code | Private and public packages need two hosted URLs, which only per-dependency `hosted: url:` can express, and `PUB_HOSTED_URL` users lose the cache for everything else |

**Why this is yours:** it decides a shadowing rule users will read as a promise, and it is a
capability declaration the whole registry honours.

Accepted cost: the shadowing is total per package name, which the operator documentation states.
B lost to the dependency-confusion hazard; C lost because it makes the proxy cache and private
hosting mutually exclusive for the common single-URL configuration.

**Rechecked on Fable 2026-10-08: confirmed, with the cost stated more fully and the fold
amended.** The options were framed fairly and A is right: the client resolves one hosted URL per
dependency, and a merge by version is the dependency-confusion shape the virtual exists to close.
The record under-stated the cost in one case a user will meet: a project that locked a later
member's version of a name before an earlier member came to hold it re-resolves on its next
`dart pub get`, rewriting the lockfile's `url`, `version` and `sha256` lines, loudly (Design,
"Virtual repositories"). The fold was amended in three places the Opus pass did not reach: the
virtual's listing is served through the door's per-request virtual form with the member-list
floor (`data-model.md` AC36, `signing-service.md` AC32); a local member's package carries what
the advisory reader answers for that member and a remote member's the relayed field (was-Q7);
and the shadowing is by exact spelling, since pub names fold nothing, so the hole `rubygems.md`'s
recheck closed in its folded key cannot open here.

### Resolved: advisories on the hosted path, rendered from the advisory reader (was Q7, raised and adopted 2026-10-08)

**Adopted 2026-10-08 under the owner's standing delegation, on Fable, superseding the resolved
advisories decision above (was Q3), an Opus-era adoption and not an owner decision, and
owner-facing**: it changes what a hosted listing asserts to a Dart client about vulnerabilities.
Option A: a hosted listing carries `advisoriesUpdated` only for a package some advisory record
stands against, the value being the latest freshness value of the sources the records came from
so that it moves forward as the client requires; the advisories endpoint renders those records in
pub's OSV shape with the affected versions enumerated from per-version reader answers, under the
repository's `coordinate_exemptions`; a package nothing stands against omits the field and the
client is silent; a virtual follows the supplying member. Folded through Scope (in and out),
Design ("The wire surface", "Serving", "Advisories on the hosted path", the supply-chain
section, "Virtual repositories", `Deps`), AC11, AC19, their Test Plan rows, Phase 1, the corpus's
recorded surface and the Q3 record.

The question: was-Q3 omitted the field because `supply-chain-policy.md` had no feed to serve and
named the field's later appearance as the revision to make; the feed, the advisory reader in
`Deps` and the hosted-matching decision now exist, `composer.md`'s recheck rendered its hosted
channel from the reader for the same reason, and format batch 8's reconciliation flagged this
record for revisiting. The client's shape is the same as Composer's in one respect and different
in another: it reads an advisories field the listing advertises, but with the field absent it
prints nothing rather than an all-clear, so omission here is silence, not a false claim. What
remains to decide is whether a hosted repository should say anything, and if so what.

**Recommendation:** A. With the reader in place, silence is no longer the honest choice when a
record stands: a Flutter team on a hosted repository holding a private package that shares a
public name, or a package an operator-declared source names, would get the client's own warning
against pub.dev and nothing here; A gives them the warning the feed holds, computed, under the
operator's exemptions, and keeps the silence exactly where nothing stands. The forward-moving
value is forced by the client's `isAfter` rule, and enumerated versions by its `versions`-only
reading; both are client facts, not judgment.

| Option | You get | It costs |
|---|---|---|
| **A. Render from the reader; field present only when a record stands; feed freshness as the value** (adopted) | The client's advisory report works on hosted repositories from the same feed the policy engine uses; no uncomputed claim either way; one rendering of data, none of verdicts; nothing leaves the registry | A reader call per listing render and per stored version of an affected package; a client refetches the small advisories document once per feed sync per affected package; the OSV-to-`versions` enumeration held against the corpus; a behaviour change for existing hosted users, who start seeing warnings |
| **B. Keep omitting the field (was Q3)** | No change; no client noise | A private package sharing a public name is warned about on pub.dev and not here, the gap the reader exists to close; the record's own stated revision never made |
| **C. Advertise the field on every hosted listing, serving an empty list where nothing stands** | Uniform listings; the client's cache always primed | An advisories request per package per resolution for every hosted package, almost all answering empty; and a date on every listing that must still move forward per package, which an empty answer gives no source for |
| **D. The newest record `modified` as the value** | A per-package value that changes only when that package's advisories change | A withdrawn newest record moves it backwards and the client keeps the withdrawn advisory in its cache indefinitely (`_getAdvisories` replaces the cache only on a later value) |

**Why this is yours:** it decides what this registry asserts to a Dart client about content it
hosts, and it reverses an earlier adoption rather than confirming one.

Accepted cost: A's, as stated in the table, and the field's appearance being the visible change
was-Q3's cost foresaw. B lost on the gap; C on cost without content and on having no
forward-moving source; D on the client's cache rule.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | 4d1aeb1 | authoring pass: grounded first draft, not a review | Grounded, with no client on the host, against the client source at `dart-lang/pub` master (hosted source, publish command, token store and authenticated client, HTTP retry and 406 handling, solver retraction rule, report and name validator), the repository specification v2 in the same repository, pub.dev's server source for the `options` API and its seven-day windows and `latest` rule, live pub.dev probes for the listing's `ETag`/`304` behaviour, the archive's `x-goog-hash` headers, the XML `404` and the unauthenticated `versions/new` challenge, and the SDK changelog for the 2.15/2.19/3.0/3.4 client watersheds. Design records the spec-versus-client disagreement on the hosted-url trailing slash (the client wins and the lockfile records it), the three client-enforced rules that shape the server (content hash against the fresh listing, retracted exclusion with the lockfile and override exceptions, token deletion on any 401 under the hosted URL), the prefix-only token attachment that forces every server-issued URL under the hosted URL, the `fields`-must-exist and `Location`-with-redirects-off shape of the publish flow, the 406 trap, and pub's rows of the removal table. Five questions written in decision shape and adopted at their recommendations under the standing delegation: the challenge-versus-oracle split (uniform 401 for no credential, 404 for authenticated-without-read, 403 only for missing write scope), the retraction and discontinuation surface (pub.dev's `options` shape, authorization-only, matching `pypi.md` Q1's recommendation), hosted advisories (omit the field), pub.dev as a preconfigured upstream (not from here: an owner-made sibling decision, deferred to `ansible-collections.md` Q4's revision), and a changed upstream content hash (purge and alert). Fourteen criteria, each with a Test Plan row. Sibling consequences named, not made: `foundation/auth.md` should record pub's mandated challenge beside OCI's and add a pub row to its client table. Stays draft, awaiting an independent first review. |
| 2026-09-26 | da0aecd | cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Applied: the management surface re-homed from pub.dev's `options` routes onto the registry-owned management API (Q2 revised to option D; preconditions, Scope, out of scope, the wire table, the write boundary, the retraction section with its operation table and action split, AC6, AC7, AC14 and Phase 2); the addressed-object table (listing and advisories `{package}`, archive and deprecated routes `{package}/{version}`, publish steps 1 and 2 content-addressed, finalize named from the staged pubspec) with AC15 and the never-401 rule; the policy rendering (AC16); the client-reach note, the advisory-feed, verification-ownership and evaluation-hook citations, the harness setup note and the npm Q2 and Q3 citations rewritten to what was adopted. The preconfigured-upstream item (ride the ansible revision) was checked against the landed foundation and not applied as queued: `proxy-cache.md`'s resolved Q14 made that revision and deliberately left pub.dev user-configured until a `continue` verdict, so the Q4 record keeps option B and cites it. Stays draft. |
| 2026-09-28 | fe2a39f | cross-spec reconciliation of the Wave 1 folds and the foundation wave, on Opus. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` naming this file verified against the current text of its source spec and of this file. Found already done at da0aecd: format-management item 10 (the stale pypi, npm and ansible citations; the registry-owned management API instead of pub.dev's routes; the preconfigured-upstream item, answered by proxy-cache's was-Q14). Applied: Open item 4 and management-api items 11 and 12 (retraction, un-retraction and discontinuation as the `withdraw`, `restore` and `annotate` kinds, `delete`, `delete` and `push`, no binding, `405` `repository-type` against remote and virtual; no retiring kind declared; AC6, AC7, AC14); artifact-verification item 16 and signing-service's consumer table (nothing to verify or sign, cited); supply-chain was-Q9 replacing the single-feed citation, the advisory reader in `Deps` noted as unblocking Q3's revisit, `WriteRefusal` and the `pending` binding row filled by AC16's capture; credential-management's OIDC exchange replacing the stale automated-publishing reason; auth's `swr_` token shape checked against the client's token grammar (AC4) and the uniform-challenge rule answering Q1's owed amendment; data-model's upload-session definition (AC26, AC27) in the publish flow; the https adapter's allowlisted redirects, cache-scoped `Last-Modified`, refresh and read-only remotes, and every removal row named by proxy-cache event class (AC8 to AC10); repository-lifecycle AC12 and FHI AC13 (Capabilities section, new AC18); `conformance/pub/**` added to `covers`. Adopted Q6 under the standing delegation: virtual repositories served, first member wins per package (new AC17), because FHI AC13 now requires the declaration and this spec had never made it; `fable_recheck` added. Reported: `auth.md` needs a `dart pub` client row and pub named in its challenge list; management-api AC7's "every publish" should say whether it reaches a handler's own wire publish, which here keeps pub's `400`; proxy-cache's event-class table should name pub under flag mirroring and coordinate-bound immutability. Eighteen criteria, each with a Test Plan row. `node scripts/check-spec.js` reports no failure in this file. Stays draft, awaiting an independent first review. |
| 2026-10-08 | 485f58d | Fable recheck: full review + re-examination of the Opus adoption Q6, with the 2026-09-28 reconciliation treated as unreviewed | A review. Claim verification at HEAD: every sibling citation checked against the current text (`auth.md`'s `dart pub` row, its uniform-challenge list naming pub and its `Bearer` row; `management-api.md`'s two pub reconciliation rows, the `withdraw` and `annotate` kind rows, AC7 as scoped by was-Q16, was-Q15, was-Q20 and AC36, "Retirement is core-held"; `proxy-cache.md`'s event-class rows naming pub, was-Q19, was-Q21, was-Q24 and AC32, the Obligation list; `signing-service.md`'s "Nothing, stated" row, "Serving", was-Q14 as extended, was-Q24, was-Q25, AC11, AC32, AC38; `supply-chain-policy.md`'s Pub coverage and `pending` binding rows, "A handler may read advisories", was-Q12, was-Q13, AC19, AC24, AC25; `data-model.md` AC6, AC26, AC27, AC36, AC44; `format-handler-interface.md` AC13, AC14, AC17; `conformance-harness.md` AC13, AC26, AC28, AC30 and its exception table; `storage-and-gc.md` AC3; `repository-lifecycle.md` AC12; `upstream-adapters.md` AC7, AC8, AC23; `artifact-verification.md`'s "Nothing" row; `credential-management.md`'s exchange route; `catalogue.md`'s Pub row; the management-surfaces analysis row). The tree holds no `internal/format/pub`, so the protocol claims were re-grounded in the client source at `dart-lang/pub` master fetched this pass (`hosted.dart`, `http.dart`, `lish.dart`, `report.dart`): the token-deletion, content-hash-against-the-fresh-listing, `x-goog-hash`, 406, retry, `fields`, `Location`, same-origin and `latest`-unread claims all hold; three facts were missing and are folded (the conditional listing fetch with `If-None-Match` and the `304` path; the advisories cache replaced only on a later `advisoriesUpdated`; `versions`-only matching with `aliases` mandatory). Brought current from the whole of `agents/spec-loop/consequences.md`: the auth closing sweep's stale-wording item (~l.306, the was-Q1 cost), the management-api closing sweep's AC7 item (was-Q16), the supply-chain closing sweep's reader-keyed-by-repository item, batch 8 item 14 (Q3's revisit), management-api was-Q20 (the spool bound on the multipart upload, AC3), was-Q15 (the unchanged publish declined, with the reason), proxy-cache was-Q19 (count zero), was-Q21 (listing and advisories never evicted) and was-Q24, signing-service was-Q14, was-Q24 and was-Q25, and `format-handler-interface.md`'s removal of the authorizer from `Deps`. Verdicts: Q1, Q2, Q4, Q5 confirmed (each record annotated); Q6 confirmed, cost and fold amended (the lockfile re-resolution on a newly shadowed name; the door's per-request virtual form and the member-list floor; advisories per supplying member; exact-spelling shadowing). Q3 SUPERSEDED by new Q7, adopted on Fable under the standing delegation and owner-facing: hosted advisories rendered from the advisory reader, the field present only when a record stands, its value the feed's freshness (forced forward-moving by the client's `isAfter` rule, which refutes the newest-`modified` option), versions enumerated per the client's reading, a virtual following the supplying member (Scope, "Advisories on the hosted path", AC11 and its row). Found under the adversarial lens and fixed: no serving-door statement at all, so the client's `If-None-Match` had no answer and a `304` could hide a retraction, a rollback or a new advisory (new "Serving" section: `ServeRendered`'s lazy form with the advisory input in the validator identity, `ServeFile` for archives, the serve policies, `HEAD`, the `Cache-Control` narrowing; new AC19 and its row); no bound on the multipart body or on the gzip stream read at finalize (AC3); `Deps` named the central authorizer, which `format-handler-interface.md` removed; the publish stand-in was unnamed and the harness's exception table carries no pub row, so AC28 would fail the corpus (pub-dev's `fake_server.dart` named; the row reported). Constitution: both paths hold on every new clause (hosted advisories from the reader, proxied relayed; the door on both), no handler table, every boundary keeps its named enforcer (the freshness scan, the sentinel test, the refusal writer, the spool through `Deps`), the conformance gate untouched, nothing weakens `auth.md` AC10. go-spec-reviewer inline: the handler holds `Deps` alone, reads the reader and the door through it, branches on no method and reads no key; approved. No em-dashes on touched lines. `node scripts/check-spec.js`: zero failures on this file. Sibling consequences reported, not applied. Seven resolved, none open; 19 criteria, each mapped; `fable_recheck` cleared; draft to planned. |
