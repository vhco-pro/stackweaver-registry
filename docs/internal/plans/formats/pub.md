---
status: draft
status_description: "Authored 2026-09-26 at 4d1aeb1 as a grounded first draft; never reviewed. Every question the draft raised was written in decision shape and adopted at its own recommendation under the owner's standing delegation, so Open Questions holds zero open entries and five adopted records (grep 'standing delegation' to find and reverse them). Awaits a first independent review before it can reach planned."
description: "Spec for the Pub format (Dart and Flutter): the hosted pub repository API v2, hosted and proxied, where the client unilaterally enforces content hashes, excludes retracted versions, and deletes its stored token on any 401."
author: michielvha
goal: "Give Dart and Flutter teams a private and caching pub repository whose behaviour is pinned to what the real dart pub client does, including the three rules it enforces without asking the server: content-hash verification, retracted-version exclusion, and stored-token deletion on 401."
priority: "low"
issue: ""
created: 2026-09-26
covers:
  - "internal/format/pub/**"
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
Dart SDK. This spec tests `dart pub` only (AC1); whether the family's Flutter reach demands a
Flutter-driven run is the catalogue's open client-reach question, not this spec's, and the
advertised reach must not exceed the tested one in the meantime.

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

## Blocking preconditions

**Tier 2 work begins only after the breadth gate.** `formats/catalogue.md` AC5 requires Tier 1
complete before any Tier 2 work, and `project-charter.md` AC9 requires the continue-or-shrink
verdict recorded in the experiment log first. Pub is Tier 2, so this spec is reachable only if
that verdict is "continue". It inherits the handler-interface re-open gate
(`format-handler-interface.md` AC8) transitively, since that gate precedes all of Tier 1.

**The management-surface precedent is adopted here, not settled here.** The retraction and
discontinuation surface below takes the same position `pypi.md` Q1 recommends for yank, under
the owner's standing delegation. `foundation/question-triage.md` names that decision as one
cross-format precedent (its Cluster 5) that should not be answered four ways by four format
specs; if the owner settles Cluster 5 differently, the adopted record here is reversed in the
same pass, and the surface section changes with it.

## Scope

**In scope:**

- The version listing (`GET /api/packages/{package}`) rendered from stored state with `latest`,
  `versions`, per-version `archive_url` and `archive_sha256`, `retracted`, and the package-level
  `isDiscontinued` and `replacedBy` fields.
- Archive serving at a registry-chosen `archive_url` under the hosted URL, and the two deprecated
  endpoints older clients use (version info and the `/packages/{p}/versions/{v}.tar.gz` redirect).
- The three-step publish flow (initiate, multipart upload, finalize) with refusal of a version
  that already exists and of an archive that fails validation.
- Retraction, un-retraction and discontinuation on the hosted path through handler-served
  endpoints in pub.dev's own `options` shape, with the effect verified through the real client
  (the adopted retraction-surface record below).
- Bearer authentication per `foundation/auth.md`, including the spec-mandated
  `WWW-Authenticate` challenge and the 401/403/404 split that keeps the client's token intact
  (the adopted challenge record below).
- The proxied path against pub.dev: classification, `archive_url` rewriting, conditional
  revalidation, negative caching, the advisories relay, and pub's rows of the removal table.
- Non-interactive client configuration through `PUB_HOSTED_URL`, per-dependency `hosted: url:`
  and `publish_to`, which is what makes the format-first mount work without a carve-out.

**Out of scope for v1**, each with its reason, recorded because the interface spec's definition
of done requires the deliberately unimplemented surface to be named:

- **Advisory data on the hosted path.** The repository spec's advisories endpoint serves OSV
  documents, and real advisory data belongs to `supply-chain-policy.md`, whose feed authority is
  its own open question. The hosted listing omits `advisoriesUpdated`, so the client never asks
  (the adopted advisories record below); on the proxied path the upstream's advisories are
  relayed as metadata fidelity. Building a hosted advisory source here would prejudge the
  sibling's feed decision, which is evidence sequencing, not effort.
- **pub.dev's site API**: search, account and likes endpoints, uploader and publisher management,
  automated-publishing configuration. None of it is in the repository specification, no client
  in the install-or-publish loop calls it, and advertising a pub.dev-proprietary surface would
  put a claim in the matrix that no oracle backs.
- **Automated publishing** (pub.dev's OIDC exchange from CI providers). Credential issuance
  belongs to `foundation/auth.md`, which outsources identity flows to the identity provider; a
  pub-specific issuance flow here would prejudge it, the same reason PyPI excludes Trusted
  Publishing.
- **Hard deletion of a version or package.** The ecosystem has no delete surface: pub.dev never
  deletes on an author's request, retraction is its removal semantics, and a vanished version
  on pub.dev is always administrative moderation. A registry-wide hard-delete surface is the
  cross-format management decision `foundation/question-triage.md` Cluster 5 names, and until it
  exists a bad upload is handled by retraction or by rollback through the snapshot pointer. This
  is a shape-of-precedent reason, not an effort one.
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
| Advisories | `GET <hosted-url>/api/packages/{package}/advisories`; `{"advisories": [OSV...], "advisoriesUpdated": <date-time>}`; requested by the client only when the listing carries `advisoriesUpdated` |
| Deprecated version info | `GET <hosted-url>/api/packages/{package}/versions/{version}`, kept for pre-2.8 clients; pub.dev still answers it (probed 200) |
| Deprecated download | `GET <hosted-url>/packages/{package}/versions/{version}.tar.gz`; pub.dev answers `303` to the `archive_url` (probed) |
| Retraction | `GET` and `PUT <hosted-url>/api/packages/{package}/versions/{version}/options` with `{"isRetracted": bool}`: pub.dev's own API (`setVersionOptions` in its `pubapi.dart`), not part of the repository spec |
| Discontinuation | `GET` and `PUT <hosted-url>/api/packages/{package}/options` with `{"isDiscontinued": bool, "replacedBy": string?}`: likewise pub.dev's own (`setPackageOptions`) |
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
  else (since Dart 3.0). The token encoding `foundation/auth.md` issues, prefix and separator
  included, has to fall inside that set, which is recorded here because a token minted for npm
  would not be checked against it.
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

The status split, settled by the adopted challenge record below and stated here as the rule the
handler's `Scope(r)` mapping and the shared authorizer together produce:

| Caller | Response |
|---|---|
| No credential at all, repository private or nonexistent | `401` with `WWW-Authenticate: Bearer realm="pub", message="..."`, uniformly, so the challenge is not an existence oracle; the message names `dart pub token add <hosted-url>` with the real hosted URL, which is what the client prints |
| No credential, repository with anonymous read enabled | served |
| Invalid, expired or revoked credential | `401` with the challenge (`foundation/auth.md` AC12 and the spec agree, and the client deleting that token is correct) |
| Valid credential without read access | `404`, indistinguishable from a nonexistent repository (`foundation/auth.md` AC17); never `403`, which would confirm the name |
| Valid credential with read but without the scope a write needs (publish, options) | `403` with the challenge and a message naming the missing permission; the client keeps the token, and the caller already knows the repository exists |

A `401` is never sent to a valid token, because the spec says the client "knows for sure" the
token is invalid on 401 and acts on it.

### The publish flow: three steps, one write

The flow is designed so that nothing is visible until the finalize `GET`, which the spec allows
("the server is allowed to consider the publishing incomplete until the GET request for
finalize-upload-url has been issued"), and so that every step survives the client's retries.

1. **Initiate.** `GET .../api/packages/versions/new` under `push` scope opens an upload session:
   the record is written before any bytes arrive, the write-ahead ordering
   `storage-and-gc.md` requires so an abandoned upload is enumerable. The response's `url` is
   `<hosted-url>/api/packages/versions/newUpload/{upload-id}` and `fields` is an empty object.
2. **Upload.** The multipart `POST` streams `file` into the CAS as an in-flight blob under the
   repository-scoped grace period, keyed by the digest computed on the way in. The client sends
   this with redirect-following off and reads the `Location` header from whatever status it
   gets, so the answer is the spec's `204` plus `Location:
   <hosted-url>/api/packages/versions/newUploadFinish/{upload-id}`. A retried `POST` for the same
   upload id replaces the staged archive; the upload id is unguessable and bound to the
   repository and the uploading principal.
3. **Finalize.** The `GET` validates and commits: the archive is a gzipped tar with `pubspec.yaml`
   at its root; the pubspec parses, its `name` satisfies the grammar above and its `version`
   parses; the version does not already exist; then `Version`, `File` and the version document
   are written through the shared model as **one** completed logical write, producing exactly
   one snapshot and advancing the default pointer. Success is `200` with a message the client
   echoes as "Message from server: ...". Finalize is idempotent for its upload id, so a retry
   after a success returns the same success rather than a version-exists refusal.

Refusals are `400` with an `error.code` and a `message`, because the client prints the message
and does not switch on the code: an existing version (`VersionExists`), a malformed archive, a
pubspec whose name or version fails, an unknown or expired upload id. A refused finalize leaves
no snapshot; the staged blob is collected by the upload-session cleanup once its session expires
and the repository's grace lapses (`storage-and-gc.md` AC3). Republishing an existing version is
refused as pub.dev refuses it, and for the reason every immutable-artifact format shares: this
registry's own proxy layer caches archives forever on that assumption, and the client's lockfile
pins the hash.

Only a `local` repository accepts a publish. A `remote` or `virtual` repository answers step 1
with `400` and a code naming the repository type, so the client prints an explanation instead of
the misleading "insufficient permissions" it would render for a `403`; write-through is out of
scope per `proxy-cache.md`, and a virtual repository's default deployment target is a product
decision this spec does not take.

### What counts as a write

`data-model.md` requires each format spec to declare its ecosystem's write boundaries, and makes
metadata-only mutations snapshot-creating writes. Pub's declaration:

- A publish is **one** completed logical write, completed by the finalize `GET`; steps 1 and 2
  create in-flight upload state and no snapshot.
- A retraction or un-retraction is one metadata-only write on the version document.
- A discontinuation, or a change to `replacedBy`, is one metadata-only write on the package
  document.
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
does not include. Per the adopted retraction-surface record, this registry serves those two
endpoints on `local` repositories in exactly pub.dev's document shapes (`VersionOptions` and
`PkgOptions` in pub.dev's `package_api.dart`), under `push` scope, with the `GET` forms
returning current state. The shape is borrowed rather than invented so that nothing new is
designed ahead of the cross-format management API, which can wrap these when it exists. The
trigger is verified by this registry's own integration tests, and that is stated as such rather
than implied to be conformance-covered.

Two pub.dev policies are deliberately **not** mirrored, on the reasoning `npm.md` Q3 recommends
for unpublish: pub.dev allows retraction only within seven days of publication and undo only
within seven days of retraction (`canBeRetracted` and `canUndoRetracted` in its `models.dart`).
Those windows protect a public commons; a private registry has operators and RBAC, so
authorization is the only gate, and the divergence goes on the recorded exception list.
`replacedBy` is stored verbatim; the client sanitises it for terminal display, and it may name a
package on another repository, so its existence is not checked.

On the proxied path the trigger is absent and the marks arrive from upstream (the removal table
below). The `options` endpoints answer `404` on `remote` and `virtual` repositories.

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
  accident.
- **Archives are immutable artifacts**: cached indefinitely, fetched stream-and-verify against the
  listing's `archive_sha256`, never committed on mismatch or truncation. pub.dev's `archive_url`
  is `https://pub.dev/api/archives/{package}-{version}.tar.gz`, which has historically redirected
  to Google Cloud Storage and today answers directly; the fetch follows redirects either way,
  and the upstream URL is retained as `RemoteFile` provenance.
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

Upstream events map onto the settled purge-or-flag table as pub's side of that contract:

| Upstream event, as observed at revalidation | Classification |
|---|---|
| `retracted: true` appears on a cached version | **Neither purge nor divergence-free**, the twin of the settled PyPI-yank row in `proxy-cache.md` (its AC13): mirror the mark at the next revalidation, keep the cached archive, record the divergence. New resolutions then exclude the version and locked resolutions keep installing it, which is the client's half of the composed contract |
| `archive_sha256` changes for a cached version | The **explicit signal**, per the adopted hash-change record: purge the cached archive, alert the operator, and serve the fresh listing. A frozen old hash would fail every client, because the client verifies bytes against the fresh listing |
| A version vanishes from the listing, or the whole package answers `404` | Keep serving from cache, record an operator-visible divergence and raise it as an alert. pub.dev has no author unpublish, so on that upstream a vanished version is always administrative moderation; the signal is real but not machine-distinguishable from a private upstream's deletion, which is why it falls to the settled keep-and-flag backstop with the flag loud |
| An OSV advisory appears in `/advisories` for a cached version | Not a removal event: relayed at the next revalidation. The client (Dart 3.4 and later) surfaces the advisory itself unless the project lists it under `ignored_advisories`; `supply-chain-policy.md`'s own evaluation is a separate, central path |
| `isDiscontinued`, `replacedBy` or an unknown field changes | An ordinary metadata change, propagated at the next revalidation |

Detection happens at revalidation; whether anything more active exists is `proxy-cache.md` Q12
and is owned there. pub.dev is not among the preconfigured upstreams, per the adopted
preconfigured-upstream record below; a remote repository against it is user-configured.

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
from this format, and no producer for its open ownership question to name; this is recorded as
an honest absence rather than a deferral. What pub does carry is advisory state, and the
composition is stated so two mechanisms do not disagree: the client acts on relayed OSV
advisories by itself, and central policy evaluation at resolution (through the shared calls in
`Deps`, per that spec's recommended hook) is an independent refusal path that renders in pub's
error shape when it fires. pub.dev's per-package OSV documents are the same schema
`supply-chain-policy.md` recommends as its feed; whether they may seed that feed is that spec's
feed-authority question, not this one's.

### What this format needs from `Deps`, and what it does not need

The blob store for archives and the staged upload, the metadata store at all three levels with
snapshot-pointer resolution, the fetch-and-cache entry point for the proxied path, the central
authorizer for the status split above, and the request logger. Nothing beyond the pinned
`Deps`. No write-triggered service is involved: pub has no repository-wide signed index, the
listing is rendered on read from stored state, and publish is synchronous on the wire, so this
format contributes no evidence to `write-triggered-services-prototype.md` and asks nothing of
it. The two-step upload with a later finalize is served entirely by `storage-and-gc.md`'s
upload-session lifecycle.

### Conformance, auth and the corpus

Two pinned SDKs, straddling the content-hash watershed so both client paths get a real oracle:
one from the 2.18 line, which honours retraction (2.15) and stores tokens but records no
content hash, and one current 3.x, which verifies hashes (2.19), validates tokens (3.0) and
surfaces advisories (3.4). Client images are pinned by digest per the harness rule.

The recorded surface for AC13's corpus, named now because a thin recording script yields a thin
specification: cold `dart pub get`, warm `dart pub get` with a fresh `PUB_CACHE`,
`dart pub get --enforce-lockfile`, `dart pub add`, `dart pub upgrade`, `dart pub outdated`,
`dart pub global activate`, `dart pub unpack`, a resolution against a package with a retracted
version (found on pub.dev at recording time, since retractions are public state), an advisories
fetch for an affected package, a missing-package failure, and the unauthenticated
`versions/new` challenge (probed 2026-09-26: `401`, the challenge header, and a JSON body).
**The publish flow cannot be recorded against pub.dev**, because a publish there is permanent
and unrecordable without leaving a package behind; its corpus is recorded against a local
stand-in and sits on the recorded exception list with that reason, per the harness's
authoritative-reference resolution. Recording gates on the harness's redaction criterion
(`conformance-harness.md` AC13), and every deliberate divergence, the seven-day windows and the
stand-in publish among them, goes on the exception list before its flow is expected to replay.

Provisioning a retracted or discontinued state for a case goes through the `options` endpoints;
whether that is expressible in the case's `setup` block or must run in the script is decided by
`conformance-harness.md` Q4's answer on how the vocabulary grows, and this spec records the need
rather than assuming the key.

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
      way; and an upload whose finalize never arrives leaves no version and its staged blob is
      collected once its session expires and the repository's grace lapses.
- [ ] AC4: `dart pub token add --env-var` followed by `dart pub get` and `dart pub publish`
      succeeds against a private hosted repository, including the archive download; an
      unauthenticated `dart pub get` receives `401` with the `WWW-Authenticate` challenge and
      the client prints the server message and exits non-zero; an invalid token receives `401`
      and the client deletes it, asserted from the token store afterwards; a valid pull-only
      token receives `403` on publish and keeps its token; and a valid token without read
      access receives a `404` indistinguishable from a nonexistent repository.
- [ ] AC5: For every version in a served listing, hosted and proxied, `archive_sha256` equals the
      sha256 of the bytes the `archive_url` serves, proven by `dart pub get --enforce-lockfile`
      succeeding on a second client with a fresh `PUB_CACHE` against a lockfile produced on the
      first; and no served archive response carries an `x-goog-hash` header.
- [ ] AC6: Setting `isRetracted` through the version `options` endpoint on a hosted repository
      makes a fresh `dart pub get` select the previous version and annotate the retracted one,
      while a project whose `pubspec.lock` already pins it, and one pinning it by exact
      `dependency_overrides`, still install it; clearing the flag restores it to resolution; and
      each change is one metadata-only write producing one snapshot.
- [ ] AC7: Setting `isDiscontinued` and `replacedBy` through the package `options` endpoint makes
      `dart pub get` print the discontinued notice for a direct dependency and
      `dart pub outdated` show the replacement, and the listing carries both fields.
- [ ] AC8: The proxied path installs a package from a pub.dev stand-in and serves it from cache on
      a second `dart pub get` with a fresh `PUB_CACHE`, with the second run reaching this
      registry and the upstream receiving no request, both asserted from the transcript and at
      the network layer; the served listing carries no upstream `archive_url`, preserves the
      upstream's `published` field, and a missing name is negatively cached so the client's
      not-found error costs one upstream request within the negative TTL.
- [ ] AC9: A listing is revalidated after its TTL and not before, proven through the pub proxied
      path against a mutating stand-in: a version published upstream becomes visible to
      `dart pub get` after the TTL and, absent an explicit refresh, not before; and revalidation
      of an unchanged listing is a conditional request answered `304`, asserted at the network
      layer.
- [ ] AC10: An upstream `retracted` mark is mirrored at the next revalidation with the cached
      archive kept and a divergence recorded; a changed upstream `archive_sha256` purges the
      cached archive and raises the operator alert; a version vanishing from the listing, or a
      package answering `404` at revalidation, keeps serving with a divergence alert; a new
      upstream advisory is relayed without being treated as a removal; and `isDiscontinued`
      propagates as an ordinary change, as pub's side of the settled removal table in
      `proxy-cache.md` (its AC13).
- [ ] AC11: A hosted listing omits `advisoriesUpdated` and the client makes no request to the
      advisories endpoint, asserted from the transcript; a proxied listing preserves the
      upstream's `advisoriesUpdated`, the advisories document is served from cache, and the
      3.x client surfaces the advisory for an affected version.
- [ ] AC12: A listing request with the v2 `Accept` header receives the v2 content type and one
      with no `Accept` header receives the same document; the deprecated version-info endpoint
      answers from the same stored state as the listing, proven by a publish appearing in both;
      and the deprecated tarball path answers `303` to the `archive_url`.
- [ ] AC13: Replay-match passes against a corpus recorded from pub.dev covering the recorded
      surface named in Design, with the publish flow replayed from its stand-in corpus on the
      recorded exception list.
- [ ] AC14: The `options` endpoints require `push` scope on a `local` repository, a pull-only
      token receives `403` and a request against a `remote` repository receives `404`; and a
      publish initiated against a `remote` or `virtual` repository is refused at step 1 with
      `400` and a code naming the repository type, which the client prints.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/pub/hosted_test.go` (pinned 2.18-line and 3.x SDKs; `PUB_HOSTED_URL` and `hosted: url:` cases; lockfile `url` and `sha256` assertions) |
| AC2 | conformance | `conformance/pub/publish_test.go` |
| AC3 | conformance + integration | `conformance/pub/publish_test.go` (republish and malformed-archive refusals, message in client output); `internal/format/pub/upload_session_test.go` (snapshot-table assertion; abandoned-upload collection against the storage layer's cleanup) |
| AC4 | conformance | `conformance/pub/auth_test.go` (token store inspected after the invalid-token case; the 404 case shares `conformance/core/existence_oracle_test.go`'s assertion shape) |
| AC5 | conformance + integration | `conformance/pub/enforce_lockfile_test.go` (two clients, fresh cache); `internal/format/pub/listing_test.go` (hash-equals-digest across every version; header assertion on archive responses) |
| AC6 | conformance + integration | `conformance/pub/retraction_test.go` (fresh resolution, locked pin, override pin, un-retract); `internal/format/pub/options_test.go` (write-boundary and snapshot assertions) |
| AC7 | conformance | `conformance/pub/discontinued_test.go` |
| AC8 | conformance | `conformance/pub/proxied_test.go` (transcript + network-level assertion, fresh `PUB_CACHE` in setup; missing-name case) |
| AC9 | conformance | `conformance/pub/proxied_ttl_test.go` (mutating local stand-in upstream with `ETag` support; network-level `304` assertion) |
| AC10 | integration | `internal/format/pub/removal_test.go` (test upstream presenting each event class; the shared-layer half is `proxy-cache.md` AC13's) |
| AC11 | conformance | `conformance/pub/advisories_test.go` (hosted transcript negative; proxied relay with an affected-version fixture) |
| AC12 | integration | `internal/format/pub/negotiation_test.go`; `internal/format/pub/legacy_endpoints_test.go` (no client oracle: the current client never requests these) |
| AC13 | conformance | `conformance/pub/replay_test.go` |
| AC14 | integration + conformance | `internal/format/pub/options_test.go` (scope and repository-type cases); `conformance/pub/publish_test.go` (publish against a remote repository, message in client output) |

The runner-enforced obligations, both modes and unauthenticated and unauthorized cases in each,
apply from the sibling specs and are not restated per criterion here; AC4 covers pub's specific
status semantics on top of them.

## Implementation Phases

### Phase 1: Hosted core
- Listing rendering with `latest` and content hashes, archive serving under the hosted URL, the
  deprecated endpoints, the three-step publish with validation, republish refusal and the
  upload-session lifecycle, the 401/403/404 split and the challenge header

### Phase 2: Mutation surface
- The `options` endpoints for retraction and discontinuation in pub.dev's shapes; the
  write-boundary declaration exercised end to end

### Phase 3: Proxied path
- Classification, `archive_url` rewriting with unknown-field preservation, conditional
  revalidation, negative caching, the advisories relay, the removal table including the
  hash-change purge, header stripping on archives

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
owner. Each is folded through Scope, Design, the criteria and the Test Plan above.

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
mechanism the spec provides for exactly this situation; C lost because it is the oracle.

### Resolved: the hosted retraction and discontinuation surface (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: v1 serves pub.dev's
`options` endpoints on `local` repositories under `push` scope, with no time windows, the
trigger integration-tested and the effect conformance-tested through the real client. Folded
into Scope, the retraction section of Design, the write-boundary declaration, AC6, AC7 and
AC14.

Retraction and discontinuation are the ecosystem's only removal semantics and their effects are
standardised in the client, but no client command triggers them and the repository spec has no
endpoint for them; pub.dev's own web UI uses an API of its own. This is the same question
`pypi.md` Q1 asks about yank, and `foundation/question-triage.md` Cluster 5 names it as one
cross-format precedent.

**Recommendation:** A, matching `pypi.md` Q1's recommendation so the precedent is set once. The
shape is pub.dev's rather than invented, so nothing is designed ahead of the cross-format
management API; the model already treats a metadata-only mutation as a write; and a hosted pub
repository that cannot retract can only hard-delete, which is the destructive operation
retraction exists to avoid and which this ecosystem does not even have.

| Option | You get | It costs |
|---|---|---|
| **A. Serve pub.dev's `options` endpoints on hosted repositories now, authorization-only** | Hosted retraction and discontinuation are real and client-testable; the shape already exists in the ecosystem; operators get the soft delete instead of nothing | A management write surface on a format handler ahead of a management-API design, verified by our tests alone at the trigger; and a divergence from pub.dev's seven-day windows on the exception list |
| **B. Proxied-only marks in v1; hosted retraction waits for the management-surface era** | No precedent set ahead of the cross-format decision | A hosted repository has no removal semantics at all, not even a hard delete, and the matrix must record hosted retraction as absent |
| **C. Mirror pub.dev's seven-day retract and undo windows as well** | Replay-faithful to pub.dev's policy | Encodes public-commons policy against a private registry's data, blocks an operator from retracting their own week-old mistake, and the windows need pub.dev's clock semantics to mean anything |

**Why this is yours:** it sets the precedent for what a format handler's management surface is,
ahead of any UI or management-API spec, the same product-surface sequencing call `pypi.md` Q1
and `ansible-collections.md` Q5 carry, and it is owned by Cluster 5 rather than by any one
format.

Accepted cost: the trigger is verified only by this registry's own integration tests, stated as
such in the Test Plan rather than implied to be conformance-covered; the seven-day divergence is
an exception-list entry; and if Cluster 5 is settled toward a single cross-format surface, these
endpoints become that surface's pub rendering rather than being removed. B lost because it
leaves a hosted repository with no removal path in an ecosystem whose only removal is this one;
C lost for the reason `npm.md` Q3's recommendation gives against mirroring unpublish windows.

### Resolved: advisories on the hosted path (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the hosted listing omits
`advisoriesUpdated`, so the client never requests the advisories endpoint and no claim is made;
the proxied path relays the upstream's field and document. Folded into Scope, the proxied-path
and supply-chain sections of Design, and AC11.

The client fetches `/api/packages/{package}/advisories` only when the listing carries
`advisoriesUpdated`, and since Dart 3.4 surfaces affected versions during resolution. Real
advisory data belongs to `supply-chain-policy.md`, whose feed authority is open. This is npm's
audit-request question in a kinder shape: the client asks only when told it may.

**Recommendation:** A, because omission is silent and honest: no warning in any build, no
false all-clear, and no hosted package name sent anywhere.

| Option | You get | It costs |
|---|---|---|
| **A. Omit `advisoriesUpdated` on hosted listings; relay on proxied** | No false security claim; no client noise; the proxied path keeps the ecosystem's own signal intact | Hosted packages get no advisory surface until `supply-chain-policy.md` has a feed to serve, and the field's later appearance is a behaviour change clients will notice |
| **B. Advertise the field and serve an empty advisory list** | Looks like a fully featured repository | Asserts "no known advisories" about content nothing checked, silently, on every resolution |
| **C. Forward hosted package names to pub.dev's advisories endpoint** | Real answers for names that also exist publicly | An egress path from the hosted surface that leaks private package names to a third party, the dependency-confusion shape `npm.md` Q2 refuses |

**Why this is yours:** it is a security-posture and privacy claim the product will be held to,
priced against a feature gap on the hosted path.

Accepted cost: hosted repositories carry no advisory data in v1, and adding the field later is
a visible change. B lost because it is a silent false claim; C lost because it leaks.

### Resolved: pub.dev as a preconfigured upstream (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: pub.dev is not added to
the preconfigured upstreams or the nightly real-upstream job by this spec; a remote repository
against it is user-configured, and the question is revisited with `ansible-collections.md` Q4.
Folded into the proxied-path section of Design.

`proxy-cache.md` settled the preconfigured, enabled-by-default upstreams as npm, PyPI and Docker
Hub, and the nightly job covers exactly that set. A Flutter team is the archetypal user of a
pub cache, so the works-in-thirty-seconds argument applies, and `ansible-collections.md` Q4 asks
the same question for Galaxy.

**Recommendation:** B, because the preconfigured set is a decision the owner actually made, and
the standing delegation does not extend to amending one from a sibling spec; the delegation
covers this spec's questions, not `proxy-cache.md`'s resolved record. The right vehicle is the
revision `ansible-collections.md` Q4 already requests of that spec, and pub.dev can ride it.

| Option | You get | It costs |
|---|---|---|
| **A. Preconfigure pub.dev and add it to the nightly job when the format ships** | The archetypal user's first run works without configuration; real-upstream drift is caught on a schedule | Amends an owner-made sibling decision from a Tier 2 spec, outside what the delegation licenses; one more real-upstream support surface |
| **B. User-configured in v1; revisit with `ansible-collections.md` Q4's revision** | The sibling's resolved decision is untouched; one revision carries both candidates | A worse first-run story for pub than for npm, and no scheduled run against the real pub.dev until that revision lands |

**Why this is yours:** it extends a set you settled in `proxy-cache.md`, and ranking a Tier 2
format's first-run experience against the standing support surface is a product call.

Accepted cost: the format's proxied path ships with no preconfigured upstream and no nightly
row, and the gap is named for the sibling revision rather than fixed here. A lost on the
delegation's own boundary, not on merit.

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
inconsistent by construction.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | 4d1aeb1 | authoring pass: grounded first draft, not a review | Grounded, with no client on the host, against the client source at `dart-lang/pub` master (hosted source, publish command, token store and authenticated client, HTTP retry and 406 handling, solver retraction rule, report and name validator), the repository specification v2 in the same repository, pub.dev's server source for the `options` API and its seven-day windows and `latest` rule, live pub.dev probes for the listing's `ETag`/`304` behaviour, the archive's `x-goog-hash` headers, the XML `404` and the unauthenticated `versions/new` challenge, and the SDK changelog for the 2.15/2.19/3.0/3.4 client watersheds. Design records the spec-versus-client disagreement on the hosted-url trailing slash (the client wins and the lockfile records it), the three client-enforced rules that shape the server (content hash against the fresh listing, retracted exclusion with the lockfile and override exceptions, token deletion on any 401 under the hosted URL), the prefix-only token attachment that forces every server-issued URL under the hosted URL, the `fields`-must-exist and `Location`-with-redirects-off shape of the publish flow, the 406 trap, and pub's rows of the removal table. Five questions written in decision shape and adopted at their recommendations under the standing delegation: the challenge-versus-oracle split (uniform 401 for no credential, 404 for authenticated-without-read, 403 only for missing write scope), the retraction and discontinuation surface (pub.dev's `options` shape, authorization-only, matching `pypi.md` Q1's recommendation), hosted advisories (omit the field), pub.dev as a preconfigured upstream (not from here: an owner-made sibling decision, deferred to `ansible-collections.md` Q4's revision), and a changed upstream content hash (purge and alert). Fourteen criteria, each with a Test Plan row. Sibling consequences named, not made: `foundation/auth.md` should record pub's mandated challenge beside OCI's and add a pub row to its client table. Stays draft, awaiting an independent first review. |
