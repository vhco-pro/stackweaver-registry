---
status: draft
status_description: "Authored 2026-09-26 as a grounded first draft: the Conan remote contract captured from Conan 2.32.0, Conan 2.0.17 and Conan 1.66.0 (revisions off and on) run in containers built on a digest-pinned Python image, on a dedicated Podman network, against a logging and rule-injecting stub in front of the reference conan_server 2.32.0, plus a pass-through to the live center2.conan.io; checked against the Conan client and conan_server sources, the Conan revisions documentation, the ConanCenter Conan 1 freeze notice, the live ConanCenter remotes and OSV. Ten questions written in decision shape and adopted under the owner's standing delegation; none open. Awaits a /spec review pass."
description: "Spec for the Conan (C and C++) remote format: the v2 REST API with recipe and package revisions, package IDs derived from settings and options, uploads as independent file PUTs verified against the manifest the revisions are hashed from, removes as bindings onto registry-owned management operations, pointer-scoped revision times so a rollback reaches clients, a verifying ConanCenter cache and member-ordered virtual repositories, with Conan 2 on two generations and Conan 1 in revisions mode as the oracles."
author: michielvha
goal: "Serve C and C++ teams a private Conan remote whose revisions are verified against their own manifests before any client can resolve them and whose rollbacks the client actually adopts, and a ConanCenter cache that never delivers bytes its revision does not describe, with the real conan CLI as the oracle on both paths."
priority: "medium"
issue: 33
created: 2026-09-26
covers:
  - "internal/format/conan/**"
  - "conformance/conan/**"
fable_recheck: "authored on Opus 2026-09-27 while Fable was out of monthly credit; grounded in captured client traffic, but the design judgement was never Fable-reviewed"
---

# Plan: Conan remote format

The Conan remote protocol, hosted, proxied and virtual: a capability probe, a token exchange,
recipe and package revision listings whose order is decided by server-assigned times, revision
file sets uploaded one `PUT` at a time with the manifest last, and binaries addressed by a package
ID the client derives from settings and options. The `conan` CLI is the oracle for reads, uploads
and removes on both paths, on Conan 2.32.0 and 2.0.17, with Conan 1.66.0 in revisions mode as a
third client.

## Context

Conan sits in Tier 2 of `formats/catalogue.md` as a single-ecosystem family ("Conan", C and
C++). **Its build is gated by `project-charter.md` AC9 and `catalogue.md` AC5**: no handler code
for a Tier 2 ecosystem exists before every Tier 1 format has met its definition of done and the
owner has recorded a `continue` verdict at the charter's build step 8. This spec exists now
because the owner directed on 2026-09-26 that all 33 ecosystems be specced up front (the
catalogue's "Every ecosystem below is specced now; only building is gated"), so that the gate
decides what is built and never what is written; a `shrink` verdict parks it.

Conan has **no published protocol specification**. Its remote API is defined by the client and by
the reference server, `conan_server`, both distributed on PyPI (`conan` and, for Conan 2,
`conan-server`), and implemented a second time by Artifactory, which serves ConanCenter. So the
grounding for this draft is captured traffic first and source second, stated up front because
the constitution asks for evidence or silence:

- **Captured client traffic.** No Conan client is installed on this host (`which conan` finds
  nothing), so client images were built from `docker.io/library/python:3.12-slim` pinned at
  `sha256:44ff437bba879d4941b710a369a8f19266aea34b29002807f0c487fabc9eec9b` with
  `pip install conan==2.32.0` (released 2026-08-31, the current release), `conan==2.0.17`
  (2024-01-10, the last 2.0.x) and `conan==1.66.0` (2024-12-02, the last Conan 1 release), and a
  reference server image from the same base with `pip install conan-server==2.32.0`. Every run
  used a fresh `CONAN_HOME` unless it says otherwise, on a dedicated Podman network
  (`conancap-net`) with no other workload on it, against a logging stub that records every request
  and response and can inject a status or body per path from a rules file, forwarding everything
  else to the reference server; a third stub forwarded to the live `https://center2.conan.io`. The
  fixtures were genuine: a recipe declaring `os`, `arch`, `compiler` and `build_type` settings and
  a `shared` option, built by `conan create` for two build types, re-exported into four recipe
  revisions, a second recipe readable only by an authenticated user, a copy exported after an
  `mtime` change, a tampered `conan_package.tgz`, and a binary built by Conan 1.66.0. The stub is
  not a reference implementation; what the captures prove is what the clients send and how they
  react.
- **The client and reference server source**, read for the behaviour the captures surprised:
  the Conan 2.32.0 package (`conan/internal/rest/rest_routes.py`, `rest_client_v2.py`,
  `file_uploader.py`, `caching_file_downloader.py`, `remote_credentials.py`, `pkg_sign.py`;
  `conan/internal/model/manifest.py`; `conan/internal/api/export.py`; `conan/internal/methods.py`;
  `conan/internal/cache/integrity_check.py`; `conan/api/model/refs.py`;
  `conan/internal/api/audit/providers.py`), the Conan 1.66.0 package
  (`conans/client/rest/rest_client.py`, `client_routes.py`, `conans/model/info.py`) and
  `conan-server` 2.32.0 (`conans/server/rest/controller/v2/`, `conans/server/revision_list.py`).
- **The documentation.** The Conan 2 revisions tutorial (`docs.conan.io/2/tutorial/versioning/
  revisions.html`, read 2026-09-26: "the latest uploaded revision becomes the latest one", a
  revision uploaded later from another machine "will still become the latest in the server side",
  and "every revision represents an immutable source"), and the Conan blog's notice that
  ConanCenter stopped Conan 1 updates on 4 November 2024, froze the Conan 1 remote, and publishes
  new content only to `https://center2.conan.io`.
- **The live upstreams.** `center2.conan.io` and `center.conan.io` sampled directly: both answer
  `/v1/ping` with `X-Conan-Server-Capabilities: complex_search,checksum_deploy,revisions,
  matrix_params`; `latest`, `revisions` and package search JSON with `Cache-Control:
  public,max-age=300` and no `ETag` or `Last-Modified`; revision files with `ETag`,
  `Last-Modified`, `X-Checksum-Md5`, `X-Checksum-Sha1`, `X-Checksum-Sha256` and `max-age=3600`,
  answering `304` to `If-None-Match` and to `If-Modified-Since`; JSON `404` bodies of the shape
  `{"errors": [{"status": 404, "message": "Not Found"}]}`; `404` on a wrong-case name or revision;
  `404` on `users/authenticate` and `users/check_credentials` (anonymous only); and the package
  search ignoring its `q` filter while advertising `complex_search`. The revision and package
  identities of a live ConanCenter binary (`zlib/1.3.1`) were recomputed from its own files.
- **OSV.** `ecosystems.txt` lists no Conan ecosystem, `ConanCenter/all.zip` answers `404`, and
  queries for `zlib` and `openssl` under `ConanCenter` and for `pkg:conan/zlib@1.2.11` return
  nothing, although the OSV schema defines `ConanCenter` ("the `name` field is a Conan package
  name").

Where the sources and the captures disagree, the captures win, and the disagreements are recorded
because they would otherwise be built from the source. The client's upload loop says it sends the
manifest last "to avoid uploading conaninfo.txt or conanamanifest.txt with missing files due to a
network failure", and it uploads the manifest after an earlier file of the same revision was
refused (captured with a `409` on `conanfile.py`). The reference server lists a revision as soon as
its first file lands, so it served that incomplete revision as `latest` (captured). And a forced
re-upload of the oldest revision duplicated its entry in the reference server's list (captured;
`RevisionList.add_revision` tests `if index:`, which is false for index 0).

Five things make this format worth a careful spec. **Every identity in a Conan coordinate is
computed by the client from content, and the client never checks a download against it**: the
recipe revision is the MD5 over the manifest's file lines (or a commit id in the `scm` modes), the
package revision always is, the package ID is the SHA-1 of `conaninfo.txt` under Conan 2, and a
tampered `conan_package.tgz` installed silently, noticed only by `conan cache check-integrity`
(captured), so the registry is the only place those identities are enforced. **An upload has no
publish request**: it is independent file `PUT`s, the manifest last by convention only, so
visibility has to be gated on a verified, complete file set. **`latest` is decided by
server-assigned time, and the client keeps a newer cached revision over an older remote one**
(captured on both Conan 2 generations), which is `debian.md`'s rollback problem in another shape.
**The client falls through to the next remote on any `404`**, the capability probe included,
**and halts on `401`, `403` and `5xx`**, while `--update` asks every remote and takes the newest
time. And **revision identity is not archive identity**: the same recipe revision re-exported after
an `mtime` change produced a different `conan_sources.tgz` (captured), so immutability has to be
stated over content, not over bytes.

## Blocking preconditions

**The handler interface re-open must complete before this handler starts**, as for every Tier 1
and Tier 2 handler (`format-handler-interface.md` AC8). Conan is Tier 2, so the catalogue's Tier 1
gate (its AC5) and the charter's breadth verdict (its AC9, build step 8) both precede it; the
re-open is recorded here anyway, from this side, because a gate enforced on one side only is
enforced nowhere.

**The data model must carry a pointer's last repoint time before Phase 1 serves a `time`.** The
resolved rollback decision below serves a latest revision's `time` as no earlier than the moment its
pointer was last promoted or rolled back, which needs that moment on `Pointer`. It is a field on an
existing entity, raised as a revision of `data-model.md` (and compatible with the pointer-held
record `debian.md` raised for its envelope), never a table this handler owns.

**The management API must be `planned` before Phase 3.** The five `conan remove` routes and the
cleanup of abandoned incomplete revisions are operations of
`docs/internal/plans/foundation/management-api.md` (to be authored in the spec loop), whose core
the charter builds at step 2 and completes at step 9, with the client's routes served as bindings
onto them (Design, "Removes are bindings").

**The proxy layer must offer a completion-only fetch with a handler-supplied verifier before
Phase 4.** A Conan revision file carries no digest on the read surface that names it (the `files`
listing is `{"conanmanifest.txt": {}}`), and what binds its bytes is a check the handler can
compute only over the complete body (Design, "The proxied path"). The completion-only mode is
already requested of `proxy-cache.md` by `go-modules.md` and `nuget.md`; this spec adds the
verifier hook to that request and does not edit the sibling. The ConanCenter adapter, including the
Conan 1 remote that stays frozen at `center.conan.io`, is requested of
`docs/internal/plans/foundation/upstream-adapters.md` (to be authored in the spec loop; charter
step 4).

Nothing is required of the shared signing and index service (no Conan document is signed by a
remote), of `docs/internal/plans/foundation/async-operations.md` (no Conan operation is deferred),
or, in v1, of `docs/internal/plans/foundation/artifact-verification.md` (Design, "Signing,
provenance and policy").

## Scope

**In scope:**

- The v2 remote API under the format-first mount `/conan/{repository}/`: the capability probe,
  the token exchange and credential check, recipe and package `latest` and `revisions`, revision
  file listings and files, recipe search and package search, and file `PUT`s for recipes,
  packages and their `metadata/` files.
- Conan 1 in revisions mode through the same v2 file API plus the one v1 route it still calls
  (`/v1/users/authenticate`), and an explicit refusal of the v1 file API that stops a Conan 1
  client without revisions from falling through to another remote (the resolved Conan 1 decision
  below).
- The identity rules: recipe revisions verified against the manifest's summary hash where they
  claim hash mode, package revisions always, package IDs against `conaninfo.txt` in its Conan 2
  form, and every archive entry against its manifest line, on both paths.
- The upload write boundary with visibility gated on a verified, complete revision; content-level
  immutability with idempotent re-uploads; a forced re-upload re-stamping an older revision as
  latest; `metadata/` files as replaceable files under an immutable revision.
- Removes of a package revision, a package ID, a recipe revision's binaries, a recipe revision and
  a whole reference, as bindings onto registry-owned management operations, and which removed
  revisions may come back.
- Pointer-scoped revision times so that a rollback or promotion reaches a client that already
  holds a newer revision.
- User and channel as part of the package's identity in the shared model, and the reference
  grammar the client enforces.
- Non-interactive authentication in the form the client sends (Basic at the token exchange, then
  Bearer), the uniform challenge, the per-route addressed objects `auth.md`'s pattern scopes
  evaluate (AC15), and the `403` rendering of a shared policy refusal (AC16).
- The proxied path against ConanCenter or any Conan remote: classification per route, no URL
  rewriting, completion-only verification of every revision file against its revision before
  commit, TTL revalidation, negative caching, and Conan's rows of the upstream-removal table.
- Virtual repositories with member-ordered resolution per reference.
- Conan 2.32.0 and 2.0.17 as the conformance oracles on both paths, and Conan 1.66.0 in revisions
  mode as a third client for reads and uploads.

**Out of scope for v1**, each with its reason, recorded because the interface spec's definition
of done requires the deliberately unimplemented surface to be named:

- **The v1 file API** (`/v1/conans/{ref}/digest`, `download_urls`, `upload_urls` and the rest of
  Conan 1's non-revision routes). It has no revisions, so a file at a reference is mutable by
  construction, which contradicts the immutability every other part of this design depends on;
  the reference server of the current generation does not serve it (captured `404`), and
  ConanCenter has published nothing for it since 4 November 2024. It is refused with a message
  that tells the user how to enable revisions (the resolved Conan 1 decision below).
- **The `checksum_deploy` capability.** Advertising it makes the client send an empty-body `PUT`
  with `X-Checksum-Deploy: true` and skip the upload on `201` (`FileUploader._dedup`), which is a
  lookup of existing content by SHA-1, a digest the CAS is not keyed by, and an optimisation no
  client needs to function; a server that does not understand the header stores an empty file.
- **The `matrix_params`, `complex_search` and `oauth_token` capabilities.** No captured Conan 2
  request uses the first two (package search is filtered client-side, per `search_packages` in the
  client's v2 REST module, and ConanCenter ignores the query while advertising `complex_search`), and
  Conan 1 uses its OAuth exchange only when `oauth_token` is advertised
  (`conans/client/rest/rest_client.py`), falling back to the plain exchange this spec serves.
  Conan 1's remote `search -q` without `complex_search` is confirmed when its cases are written.
- **`conan audit`.** Its providers query `https://audit.conan.io/` or a JFrog Catalog GraphQL
  endpoint (`providers.py`), never the remote, so no audit request reaches this registry and there
  is nothing to answer; emulating JFrog Catalog would be a different product's API.
- **Package signature verification.** The client's package-signing plugin stores
  `metadata/sign/pkgsign-manifest.json` and `pkgsign-signatures.json` whose `method` and
  `provider` are plugin-defined, with no standard scheme to verify against; they are stored and
  served byte for byte as metadata files (Design, "Signing, provenance and policy").
- **The reference server's user store and permission file** (`[users]`, `[read_permissions]`,
  `[write_permissions]`). Identity and authorization are `auth.md`'s, and tokens are minted where
  `auth.md` and `credential-management.md` put them.
- **ConanCenter as a preconfigured upstream** (the resolved preconfigured-upstream decision
  below): user-configured in v1, for sequencing.

## Design

### The wire surface, as captured

Every path hangs off the remote URL the client is given, `https://{host}/conan/{repository}`,
format-first per `format-handler-interface.md`'s resolved URL-shape decision. Both Conan 2
generations append `/v1/ping` and `/v2/...` to a URL carrying a path and strip a trailing slash
(captured: `GET /conan/acme-cpp/v1/ping` from `conan remote add pfx .../conan/acme-cpp` and
`.../conan/acme-cpp/`), so no root anchoring is needed. Below, `{ref}` is
`{name}/{version}/{user}/{channel}` with `_` for an absent user or channel, exactly as the client
sends it.

| Surface | Shape, as the pinned clients send it |
|---|---|
| Capability probe | `GET /v1/ping`, at the start of every remote session, anonymously or with the stored Bearer. The client reads only `X-Conan-Server-Capabilities` and refuses a remote without `revisions` ("The remote doesn't support revisions"); a non-2xx response **without** that header raises, so `403` halts and `401` starts authentication, while **`404` makes the client skip the whole remote silently** ("Unable to find ... in remotes", captured on both Conan 2 generations) |
| Token exchange | `GET /v2/users/authenticate` with `Authorization: Basic`, answered `200` with the token as a `text/plain` body; Conan 1.66.0 calls `GET /v1/users/authenticate` instead, in revisions mode too (captured) |
| Credential check | `GET /v2/users/check_credentials` with the Bearer, answered `200` with the user name as text; sent before every upload and remove |
| Recipe latest | `GET /v2/conans/{ref}/latest`, answered `{"revision": ..., "time": ...}`; what a resolution without a pinned revision reads |
| Recipe revisions | `GET /v2/conans/{ref}/revisions`, answered `{"revisions": [{"revision", "time"}, ...]}` newest first; read for a pinned revision (a lockfile or `ref#rrev`, which the client finds by scanning the list), before every upload to decide what exists, and by `conan list` and `conan remove` |
| Revision files | `GET /v2/conans/{ref}/revisions/{rrev}/files`, answered `{"files": {"conanfile.py": {}, "conanmanifest.txt": {}, "conan_export.tgz": {}, "conan_sources.tgz": {}}}` with whichever exist; then `GET .../files/{path}` for `conanmanifest.txt` and `conanfile.py` (and `conan_export.tgz` when listed) in parallel threads, and `conan_sources.tgz` only when building from source |
| Package latest and revisions | `GET .../revisions/{rrev}/packages/{package_id}/latest` and `.../revisions`, the package ID computed by the client from the profile, with no search first |
| Package files | `GET .../packages/{package_id}/revisions/{prev}/files`, then `conanmanifest.txt`, `conaninfo.txt` and `conan_package.tgz`, sequentially |
| Package search | `GET .../revisions/{rrev}/search?list_only=False` (2.32.0) or `.../revisions/{rrev}/search` (2.0.17), answered `{"{package_id}": {"content": "{conaninfo.txt}"}}` by the reference server and with parsed `settings`, `options` and `requires` beside it by ConanCenter; from `conan list ...:*` and before a remove of binaries |
| Recipe search | `GET /v2/conans/search?q={glob}`, adding `ignorecase=False` only when asked; answered `{"results": ["hello/1.0", ...]}` (ConanCenter spells an absent user and channel as `@_/_`, which the client strips); from `conan search`, `conan list` and **every version-range resolution**, as `q={name}/*` |
| File upload | `PUT .../revisions/{rrev}/files/{path}` and `PUT .../packages/{package_id}/revisions/{prev}/files/{path}`, one per file, in sorted order so `conanmanifest.txt` is last, recipe files before package files, each carrying `X-Checksum-Sha1` of its body; answered `200`. Before uploading, the client reads `revisions` and each binary's `revisions` and skips what exists unless `--force` |
| Metadata files | `PUT` and `GET` of `.../files/metadata/{path}` under a recipe or package revision, from `conan upload --metadata` and `conan download --metadata`, re-uploadable under an existing revision (captured) |
| Remove | `DELETE .../packages/{package_id}/revisions/{prev}` per binary revision (both generations enumerate rather than using the bulk routes), `DELETE /v2/conans/{ref}/revisions/{rrev}` per recipe revision; the reference server also serves `DELETE .../revisions/{rrev}/packages`, `.../packages/{package_id}` and `/v2/conans/{ref}`, which no captured command reached |
| Error rendering | `401`: the client obtains credentials from its auth plugin, `credentials.json`, then `CONAN_LOGIN_USERNAME_{REMOTE}` and `CONAN_PASSWORD_{REMOTE}`, then a prompt, which fails non-interactively ("Conan interactive mode disabled"). `403`: "Permission denied for user: '{user}': {body}. [Remote: {remote}]", halting. `404` on a read: the next remote is tried. `5xx`: retried by the HTTP layer ("too many 500 error responses") then fatal. On a `PUT`, `401` and `403` abort the upload at once, while `400`, `404` and `409` are logged, the loop **continues with the next file of the revision**, and the command fails at the end ("Execute upload again to retry upload the failed files") |
| Content types | A JSON answer must carry `Content-Type: application/json` (optionally `; charset=utf-8`) or the client refuses it ("Response from remote is not json", `_get_json`); an error body containing `html>` is treated as an invalid server |

Every Conan 2 request carries `X-Client-Anonymous-Id`, a SHA-1 of the machine's MAC address
(`_get_mac_digest`), and a `User-Agent` of the form `Conan/2.32.0 (Linux ...; Python 3.12.14;
x86_64)`; the first is an identifier the corpus redaction rule must treat as personal data.

### Three client behaviours that decide the design

**The client keeps a newer cached revision over an older remote one.** A client holding revision
B (time 00:29) ran `conan install --update` against a remote whose `latest` answered revision A with
its original time (00:27): it printed `Newer` and kept B (captured on 2.32.0 and 2.0.17). Served
the same revision A stamped 01:00, it printed "Latest from 'stub1' was found in the cache, using it
and updating its timestamp" and adopted A. Without `--update` a cached reference makes no request
at all (captured: a warm install and a warm version-range install sent nothing), so a remote change
reaches a warm cache only under `--update`, and when it does, the served `time` decides.

**The client verifies nothing it downloads.** The download path (`ConanInternalCacheDownloader`)
checks no digest, and a `conan_package.tgz` replaced with different content under the same package
revision installed and reported "Package installed" (captured); `conan cache check-integrity`
later reported "Manifest mismatch". The client's own integrity rule
(`conan/internal/cache/integrity_check.py`) is that the manifest recomputed from the unpacked
folders equals the stored manifest, and this registry is where that rule has to run, before any
client receives the bytes.

**The client's remote order has two holes and one wall.** A `404` on `latest`, on a package's
`latest` or on the capability probe sends the client to its next remote (captured, the binary
lookup falling through independently of the recipe's). `--update` asks every remote and takes the
newest `time`, so a recipe revision can come from one remote and its binary from another (captured:
"Updated (stub2)" for the recipe, "Download (stub1)" for the binary). `401`, `403` and `5xx` halt the
resolution, `--update` included (captured on both generations). Consequences threaded through this
design: a policy refusal is `403` and holds whatever else the client has configured; the existence
rule's `404` is a fall-through to whatever the user listed next, which the operator documentation
states; and because `--update` lets the newest `time` win across remotes, the documented recipe for
mixing private and public packages is a virtual repository as the client's only remote (Design,
"Virtual repositories").

### Revisions, package IDs and what the registry verifies

The captures and the source agree on four derivations, and each was recomputed from a live
ConanCenter binary as well as from the fixtures:

- **The recipe revision** is `manifest.summary_hash` in the default `hash` mode: the MD5 of the
  manifest's `path: md5` lines, sorted, newline-joined with a trailing newline, **excluding** the
  first line, which is an integer timestamp (`FileTreeManifest.summary_hash`). In the `scm` and
  `scm_folder` modes it is the Git commit id (`_calc_revision` in `conan/internal/api/export.py`),
  which never has the 32 hexadecimal characters of an MD5.
- **The package revision** is always the summary hash of the package manifest
  (`conan/internal/methods.py`). The same package content yields the same package revision under
  different recipes (captured: `af37c393...` under `hello` and `private`), so a package revision is
  unique only within its package ID.
- **The package ID** is the SHA-1 of `conaninfo.txt` as the client uploads it, under Conan 2
  (captured: the `X-Checksum-Sha1` of every Conan 2 `conaninfo.txt` equals its package ID, and
  ConanCenter's `zlib` binary verifies the same way). `conaninfo.txt` carries the binary's
  `[settings]`, `[options]` and requirements, which is how settings and options become the package
  ID. Conan 1 derives its package ID from a serialisation of selected sections instead
  (`ConanInfo.package_id` in `conans/model/info.py`), and its `conaninfo.txt` has `[full_settings]`,
  `[full_options]`, `[recipe_hash]` and `[env]` sections that Conan 2's does not; a Conan 1 binary's
  ID is therefore not verifiable from the file (captured: `e7c1133d...` for a file whose SHA-1 is
  `3879d5b0...`). Recipe revisions agree across the generations (captured: Conan 1.66.0 and Conan
  2.32.0 exported the same recipe as the same `0bec80fc...`).
- **The manifest covers the unpacked content, not the archives.** A recipe manifest's lines are
  `conanfile.py`, every entry of `conan_export.tgz` at its own path, and every entry of
  `conan_sources.tgz` under `export_source/`; a package manifest's are `conaninfo.txt` and every
  entry of `conan_package.tgz` (`FileTreeManifest.create`, confirmed against the fixtures and
  ConanCenter's `zlib/1.3.1`, whose export archive holds `conandata.yml` and whose sources archive
  holds the patch its manifest lists as `export_source/patches/...`). A symbolic link contributes the
  MD5 of its target path.

What the registry verifies, on hosted ingest and on every proxied fetch alike, is therefore the
client's own `check-integrity` rule plus the three bindings, applied before content becomes
servable:

1. The manifest parses (an integer first line, then `path: md5` lines).
2. The set of `path: md5` pairs recomputed from `conanfile.py` and the archives (or from
   `conaninfo.txt` and `conan_package.tgz`) equals the manifest's, exactly: no missing line, no
   extra entry, no differing MD5.
3. A recipe revision of 32 lowercase hexadecimal characters equals the manifest's summary hash;
   any other form is accepted as a commit id and recorded as **unbound** (its content is verified
   against its manifest, but nothing binds the manifest to the identifier). A package revision
   always equals its summary hash.
4. A package ID equals the SHA-1 of `conaninfo.txt` when the file is in the Conan 2 form (no
   `[full_settings]` section); a Conan 1 form is accepted and recorded as unbound.
5. On a `PUT`, the body's SHA-1 equals the `X-Checksum-Sha1` the client sent.

MD5 and SHA-1 are the ecosystem's identifiers and are weak against a deliberate collision; the
CAS still keys every blob by its own digest (`storage-and-gc.md`), so these checks bind content to
Conan's identifiers without ever keying storage by them.

### Mapping onto the shared model

The levels are exactly those `data-model.md` provides; no table is added.

- **`Package.name` is the name with its user and channel**: `hello` for `hello/1.0@_/_`, and
  `hello@acme/stable` for `hello/1.0@acme/stable` (the resolved package-identity decision below).
  A user and channel are namespaces that version independently in Conan, so they are separate
  packages here, and `@` cannot occur in a name under the client's grammar. The package-level
  document holds the **retirement set** of removed unbound recipe revisions.
- **`Version.version` is the version string verbatim** (`1.0`). The version-level document holds
  every recipe revision of the reference: its registry-assigned time, whether it is complete,
  whether it is bound, its manifest's summary, its file set with each file's reference, its
  `metadata/` files, and per package ID the parsed `conaninfo.txt` (settings, options,
  requirements, and whether the ID is bound) and that ID's package revisions with the same
  fields. Every JSON document the wire serves is rendered from this one document on request.
- **Each revision file is a `File`** whose relative path encodes its place,
  `{rrev}/export/{path}` and `{rrev}/package/{package_id}/{prev}/{path}`, and whose `Blob` is keyed
  by the CAS digest of the bytes as first accepted. Conan's MD5, SHA-1 and revision strings are
  metadata, never storage keys.
- The repository-level document holds nothing format-specific; the capability header is a
  constant.

**How a revision relates to a snapshot.** They answer different questions and never substitute for
each other. A revision is an identity the client computes from content, immutable for its life and
meaningful across remotes: the same revision is the same content on ConanCenter, on this registry
and in a lockfile. A snapshot is this registry's record of one repository's state after one write:
which revisions of which references exist and are complete, what time each was stamped with, which
binaries exist under each. A new revision enters a repository through writes, a remove takes it out
through a write, and a repoint moves a pointer between snapshots without creating, altering or
re-identifying any revision, only changing which of them the pointer serves and which is `latest`.
`latest` is therefore a function of a snapshot and the pointer serving it, never a property of a
revision.

### The upload path and what counts as a write

`data-model.md` requires each format spec to declare its ecosystem's write boundaries. The Conan
wire has no publish request: an upload is independent `PUT`s, and the one ordering the client
keeps (manifest last) is not a completion signal, because the client uploads the manifest after an
earlier file failed (captured). Per the resolved write-boundary decision below, following the
per-file precedent `maven.md` set for the same wire shape:

- **Each accepted file `PUT` is one completed logical write**, recording the file under its
  revision in the version-level document. A revision (or package revision) is **incomplete** until
  its verified file set is complete, and an incomplete revision is invisible: it is absent from
  `latest`, `revisions`, `files`, package listings and search, and its files answer `404`, exactly
  as if nothing had arrived. The write in which the last required file lands, and verification (the
  five rules above) passes, is the write that makes it visible and stamps its `time`; a package
  revision becomes visible only once its recipe revision is also complete. A recipe with two
  binaries is therefore nine writes and nine snapshots, one visible change.
- **Required files.** A recipe revision needs `conanmanifest.txt`, `conanfile.py`, and each archive
  whose entries the manifest implies (`conan_export.tgz` for any line other than `conanfile.py` and
  `export_source/...`, `conan_sources.tgz` for any `export_source/...` line). A package revision
  needs `conanmanifest.txt`, `conaninfo.txt` and `conan_package.tgz`. A complete set that fails
  verification is refused on the `PUT` that completed it, with `400` and a text body naming the rule
  and the file, and that `PUT`'s file is not recorded; the client reports the failure and a
  re-upload retries.
- **A `PUT` to a complete revision writes nothing** when its content agrees with that revision:
  identical bytes, or, for an archive, different bytes whose unpacked entries match the manifest
  (the re-export case, captured). It is answered `200` and the stored bytes are kept, so a
  coordinate serves one set of bytes for its whole life whatever a later client re-sends. A `PUT`
  whose content disagrees is refused with `403` naming the immutability rule, which aborts the
  client's upload immediately rather than letting it continue file by file (the resolved
  immutability decision below).
- **A forced re-upload of a complete revision that is not the latest re-stamps it**: its manifest
  `PUT` is one metadata-only write setting its `time` to now, which makes it `latest`, the
  reference server's behaviour and the documentation's ("it will still become the latest in the
  server side"), with no duplicate entry in any list. The same holds for a package revision under
  its package ID.
- **A `metadata/` file `PUT` is one write replacing that file** under its complete revision. It
  changes neither the revision's identity, its `time`, nor `latest`, because the client treats
  metadata as mutable without a new revision (`_upload_files`: "metadata files are mutable without
  a new revision").
- **Abandoned incomplete revisions are dropped** by the next write to the same version once their
  last file write is older than the upload-session absolute cap `data-model.md` sets (24 hours by
  default), and by a management operation that drops them on demand, each one write.
- **Each remove is one write** (below), and a proxied repository creates no snapshots at all:
  arrival and revalidation are cache materialisation.

Two concurrent uploads into one version (two recipe revisions, or two binaries under one revision,
which the client's parallel upload setting produces) each read-modify-write the version-level
document through the revision-token retry `data-model.md` makes mandatory, and both land; `latest`
is the one whose completing write committed later.

### Removes are bindings

`conan remove ... -r {remote}` is a real client command, so this format is in npm's and Cargo's
category in `docs/internal/analysis/management-surfaces-and-the-oracle.md`: trigger and effect are
both oracle-testable. Per the cross-format precedent (`pypi.md`, `npm.md`, `cargo.md`, `hex.md`),
each remove is an operation of the registry-owned management API,
`docs/internal/plans/foundation/management-api.md` (to be authored in the spec loop), and the
client's `DELETE` routes are **bindings onto the same operations**, one implementation behind two
ways in:

| Operation | Client binding | Effect a client sees | Action |
|---|---|---|---|
| Remove a package revision | `DELETE .../packages/{package_id}/revisions/{prev}` from `conan remove "{ref}#{rrev}:{package_id}#{prev}"` and, enumerated, `"{ref}#{rrev}:*"` | The binary revision leaves `packages/{package_id}/revisions`; if it was the latest, the previous one becomes `latest` | `delete` |
| Remove a package ID | `DELETE .../packages/{package_id}` (reference-server route) | Every revision of that binary leaves | `delete` |
| Remove a recipe revision's binaries | `DELETE .../revisions/{rrev}/packages` (reference-server route; 2.0.17 carries a client path to it) | The recipe revision stays with no binaries | `delete` |
| Remove a recipe revision | `DELETE /v2/conans/{ref}/revisions/{rrev}` from `conan remove "{ref}#{rrev}"`, and enumerated from `conan remove "{ref}"` | The revision and all its binaries leave; the previous revision becomes `latest` | `delete` |
| Remove a reference | `DELETE /v2/conans/{ref}` (reference-server route) | Every revision leaves; the name answers `404` | `delete` |
| Drop abandoned incomplete revisions | none | Nothing visible changes | `delete` |

Rules, applying the precedent rather than re-deciding it: each operation is one completed logical
write through the shared write path, exactly one snapshot, none for a refused one, and no
blob-store object deleted directly, so space returns only through retention pruning and the
single-deleter boundary in `storage-and-gc.md` (its AC15) holds; authorization is the settled
`(repository, action)` vocabulary with no new action, every remove being removal-class; hosted
only, a proxied repository answering `405`, which the client prints as "Server exception 405"; a
remove of something absent answers `404`, which the client reports as an error rather than
treating as done (`remove_recipe` and `remove_packages` in the client's v2 REST module); and the trigger is
verified by the real client through the bindings and by integration tests through the management
endpoint (AC8). What this format requires of `management-api.md`: the six operations above on the
object `{ref}`, with the recipe revision, package ID and package revision as their arguments; the
retirement set carried forward by every later write and preserved across a backwards repoint
(`data-model.md` AC33's obligation); and identical semantics and authorization from either entry
point.

**Which removed revisions may return** (the resolved retirement decision below). A removed **bound**
revision, recipe or package, may be uploaded again: its identifier is the digest of its manifest,
which verification recomputes, so the only content that can ever be accepted under it is the
content it named before, and the reference server and the documentation both treat a re-upload as
making it `latest`. A removed **unbound** recipe revision (a commit id) is retired: its coordinate
enters the package-level retirement set and every later `PUT` under it is refused with `403`,
because nothing but the retirement set stops different content arriving under the same commit id.

### Revision times belong to the pointer

The served `time` of each revision is the registry-assigned time of the write that completed or
re-stamped it, in ISO 8601 with microseconds and an explicit offset (`2026-09-27T00:29:12.187964+00:00`,
the reference server's form; the client also parses ConanCenter's `+0000` form, captured). Because
the client keeps a newer cached revision over an older remote one, a rollback served with stored
times reaches no client that updated past it. Per the resolved rollback decision below:

- **Each pointer carries the time it was last repointed by promotion or rollback** (not by the
  default pointer's advance on an ordinary write), which is the revision of `data-model.md` this
  spec raises.
- **Through a pointer, the latest recipe revision of a reference is served with the later of its
  own time and that repoint time**, and so is the latest package revision of each package ID; every
  other revision keeps its own time, so the served lists stay ordered newest first with `latest` at
  the top.
- So a client holding revision B that `--update`s after the environment was rolled back to a
  snapshot whose latest is A receives A with a time later than anything that pointer served before
  the rollback, and adopts it (AC6). A later ordinary write produces revisions stamped after the
  repoint, which win naturally; references the rollback did not touch keep serving one stable time.

The accepted costs: a promoted environment's JSON is not byte-identical to its source's (the
revisions, files and binaries are; the `time` of a latest revision is not), which qualifies
`data-model.md` AC22 exactly as `debian.md`'s envelope does and is recorded as a sibling
consequence; and a warm client that never runs `--update` never sees a rollback, which is the
client's own caching contract and is stated in the operator documentation rather than worked
around.

**Is there a rollback problem on the proxied path?** Yes, and it is the upstream's: when an upstream
moves its `latest` backwards (it removed its newest revision), this registry serves the upstream's
times verbatim, and warm clients keep the newer revision exactly as they would against the upstream
directly. A proxied repository has no pointers to scope a time to, and inventing times for content
this registry did not author would misstate the upstream.

### Names, references and other traps

- **The reference grammar is the client's**: name, version, user and channel each match
  `^[a-z0-9_][a-z0-9_+.-]{1,100}$` and the whole reference is lowercase and at most 200 characters
  (`RecipeReference.validate_ref`); the client refuses anything else before sending it unless the
  deprecated `core:allow_uppercase_pkg_names` is set. This registry matches every path segment byte
  for byte, answers `404` to a mixed-case reference or revision as ConanCenter does (captured), and
  refuses an upload whose reference violates the grammar with `400`, so an uppercase reference
  pushed under the deprecated setting is refused rather than stored under a spelling no current
  client can request.
- **`_` is the absent user or channel**, never a name, and a reference with a user but no channel
  (or the reverse) is refused with `400`, since the client cannot express it.
- **Revision and package ID segments are lowercase hexadecimal** or, for an unbound recipe revision,
  a commit id; anything else is refused before any lookup, so a traversal such as
  `revisions/../x` never resolves.
- **Search globs** use `*` only, match the full reference string case-insensitively unless
  `ignorecase=False` is sent, and never match an incomplete revision's reference.
- **Every JSON answer is `application/json`**, every error body `text/plain`, and no error body
  contains HTML, because the client rejects the first mismatch and treats the second as an invalid
  server (`_get_json`, `_check_error_response`).

### Authentication: a token exchange that returns the token

The client authenticates anonymously first and, on `401`, obtains a user name and password from its
credential sources and exchanges them at `users/authenticate` for a token it stores in
`$CONAN_HOME/.conan.db` (the `users_remotes` table, in plaintext, captured) and presents as
`Authorization: Bearer` on every later request to that remote (captured: `401`, then Basic to
`users/authenticate`, then the retried request with the Bearer). Per the resolved token-exchange
decision below:

- **The exchange takes a registry token as the Basic password and returns the same token as its
  `text/plain` body.** The user name is not an authentication input, as `auth.md`'s Basic rule
  states, so `conan remote login {remote} ci -p {token}`, `CONAN_LOGIN_USERNAME_{REMOTE}` with
  `CONAN_PASSWORD_{REMOTE}`, and `credentials.json` all work with any user name. Every later
  request presents the token as Bearer, a form `auth.md`'s verifier already accepts, so no new
  presentation form is needed; the client table needs a `conan` row, listed in this spec's sibling
  consequences. Conan 1's `/v1/users/authenticate` is the same exchange on a second route.
- **`users/check_credentials` answers the principal's display name** for a valid Bearer and `401`
  otherwise.
- **The challenge is uniform and not an existence oracle.** A credential-less request to a
  repository that is not anonymously readable answers `401` whether the repository is private,
  missing or someone else's, the capability probe included, which starts the client's
  authentication (`auth.md` AC17); no `WWW-Authenticate` value is needed, because the client parses
  none.
- **A valid token lacking `pull` answers `404`**, the existence rule, and the client then skips this
  remote and tries its next one silently (captured on the probe). The operator documentation
  states this, because it is the one place the existence rule sends a request elsewhere.
- **A rejected token answers `401` and is never served as anonymous** (`auth.md` AC12); the client
  re-authenticates from its credential sources, and fails non-interactively without them.
- **Uploads read first.** Every captured upload reads `revisions` before writing, so a Conan
  publishing credential needs `pull` as well as `push`, which the operator documentation states
  beside the token recipe.
- **TLS.** `auth.md` requires TLS on every credential-bearing path and refuses plaintext
  credentials unless the operator's flag is set (its AC27). The harness injects its CA through the
  client's `core.net.http:cacert_path` setting; that injection was not exercised in this pass and is
  confirmed when the auth cases are written.

### Addressed objects and pattern scopes

`auth.md`'s pattern scopes narrow a credential within one repository by matching the object each
request addresses, and the format declares which object each route reports ("Pattern scopes" there;
`format-handler-interface.md` AC12). Per the resolved addressed-object decision below, the canonical
object is the reference as the wire spells it, `{name}/{version}/{user}/{channel}` with `_` for an
absent part, so every route under a reference reports it, whatever revision, package ID or package
revision it goes on to name:

| Route | Action | Object kind | Canonical object |
|---|---|---|---|
| `/v1/ping`, `users/authenticate`, `users/check_credentials`, `/v1/users/authenticate` | `pull` | none | - (the remote as a whole) |
| `conans/search?q=` | `pull` | none | - (enumerates references) |
| `latest`, `revisions`, `files`, file `GET`, package `latest`, `revisions`, `files`, file `GET`, package search | `pull` | named | `{ref}` |
| File `PUT` under a recipe or package revision, including `metadata/` | `push` | named | `{ref}` |
| Every `DELETE` | `delete` | named | `{ref}` |
| The v1 file API routes | `pull` | none | - (answered `400` before anything is resolved) |

What that gives and costs, applying `auth.md`'s rules rather than re-deciding them:

- **A patterned `pull` alone cannot run any Conan command**, because every command starts with the
  capability probe, whose object is none (the same consequence `cargo.md` accepted for
  `config.json`). The working recipe is an **unpatterned `pull` beside a patterned `push` and
  `delete`**, which reads the repository and writes only inside the pattern: `acme-*/**` uploads and
  removes `acme-tool/1.0/_/_`, and `*/*/acme/**` confines writes to the `acme` user namespace. AC15
  asserts both, and the patterned-`pull` refusal at the probe.
- **A pattern refusal is answered as absence**, `404`, indistinguishable from a reference that does
  not exist, so a pattern is never an oracle over names outside it. On a read the client moves to its
  next remote, exactly as it would for a missing reference; on a `PUT` it logs the failure and the
  upload fails; on a `DELETE` it reports "not found".
- Version ranges resolve through recipe search (object none), so a credential whose `pull` is
  patterned could not resolve a range even if it passed the probe; the recipe above has an
  unpatterned `pull` and is unaffected.

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines, on a recipe
route (the version resolution) or a revision file route (the blob read) of either path, the handler
answers `403` with a `text/plain` body naming the policy and rule, or naming the signal for a
coordinate condemned under the shared security-signal rule. `403` rather than the existence rule's
`404`, because the caller is authorized and the content is what is refused, and on this format the
difference is decisive: the client prints the body ("Permission denied for user: 'None': refused by
policy P. [Remote: stub1]", captured on both Conan 2 generations, for a recipe and for a binary)
and **halts**, with no fall-through to a second remote offering the same version, even under
`--update` (captured). A policy refusal therefore holds whatever the client has configured, the
opposite of `debian.md`'s and `julia.md`'s findings and the same as `terraform.md`'s, and unlike
apt, Hex and Maven the client shows the reason, though under a misleading "Permission denied"
prefix the operator documentation explains. Search and listings keep naming a refused revision
(the no-elision precedent `conda.md` and `debian.md` set), because the refusal is at resolution.

### Signing, provenance and policy

A Conan remote signs nothing and serves no signed index, so no document of this format is a
write-triggered or signed index in the sense of `write-triggered-services-prototype.md`: every JSON
answer is rendered on request from the version-level document through the pointer, its cost bounded
by one version's revisions, and the only generated state is the version-level document each write
updates. The shared signing and index service is not involved.

The ecosystem's signing is client-side: the package-signing plugin writes `pkgsign-manifest.json`
(the SHA-256 of each artifact file) and `pkgsign-signatures.json` (a list of signatures whose
`method` and `provider` are plugin-defined) under `metadata/sign/`, uploaded and downloaded as
metadata files (`pkg_sign.py`). This registry stores and serves them byte for byte on both paths and
verifies nothing, because there is no standard scheme; when
`docs/internal/plans/foundation/artifact-verification.md` (to be authored in the spec loop) defines
a verdict for a signature scheme a Conan plugin uses, the input it needs is exactly those two files
beside the artifact files they list, and nothing else is required of it now.

**Advisory coverage is absent.** OSV defines the `ConanCenter` ecosystem and carries no data for it
(Context), so the policy engine's coordinate-level matching finds nothing for a Conan coordinate, an
advisory-dependent rule attached to a Conan repository is refused at configuration as
`supply-chain-policy.md` requires of an ecosystem OSV does not cover, and the feed channel of the
shared security-signal rule never condemns a Conan coordinate. What remains is the byte-level
cataloguer, which can inventory the libraries inside `conan_package.tgz`, and licence and signature
rules; the operator documentation says so, and the consequence is listed for
`supply-chain-policy.md`.

### The proxied path

The handler owns the request and classifies for the proxy layer's fetch-and-cache API per the
settled decisions in `proxy-cache.md`. The upstream is a remote URL (`https://center2.conan.io` for
Conan 2, `https://center.conan.io` for the frozen Conan 1 content, or any Conan remote) validated at
configuration by probing `/v1/ping` for the `revisions` capability; an upstream credential, where the
upstream needs one, is exchanged at its `users/authenticate` by the adapter, and the client's own
token is never forwarded.

| Route | Classification |
|---|---|
| `/v1/ping`, `users/*` | Never forwarded: answered locally with this registry's capability and credentials |
| Recipe and package `latest` and `revisions`, recipe search, package search | Mutable metadata with a TTL. ConanCenter serves these with `max-age=300` and no validator (captured), so revalidation is a full `GET`, never a `304` |
| A revision's `files` listing | Mutable metadata with a TTL, because `metadata/` files may appear under an existing revision |
| `conanmanifest.txt`, `conanfile.py`, the three archives, `conaninfo.txt` under a revision | Immutable artifacts, cached indefinitely, verified before commit (below) |
| `metadata/` files | Mutable metadata with a TTL, served verbatim |

**Verification before commit.** A revision file has no digest on the route that names it, so the
fetch uses the completion-only mode with a handler-supplied verifier this spec requests of
`proxy-cache.md`: the handler obtains the revision's manifest first (from the cache, or fetched and
checked against the revision identifier when bound), and the verifier then applies the five rules to
the file as it streams: an archive's entries are MD5-checked against the manifest as they
decompress, `conaninfo.txt` is SHA-1-checked against the package ID in its Conan 2 form, and where
the upstream sends `X-Checksum-Sha256` (ConanCenter does, captured) the body is also checked against
it. Nothing is committed unless the verifier passes at end of body, the initiating client's
connection is aborted before its final bytes on a failure, and coalesced waiters receive bytes only
from the CAS after the verified commit, as the settled waiter rule requires. The captured
consequence is the point of the design: the tampered archive a direct client installed silently is
never delivered by this registry (AC19). The client fetches recipe files in parallel threads, so the
archive request can arrive before the manifest's; the handler's own manifest fetch, coalesced with
the client's, is what orders them.

- **No URL rewriting exists on this format.** No v2 answer carries a URL (v1's `download_urls` did,
  and is out of scope), so the proxied path has no externally-visible-base-URL dependency.
- **Upstream times are served verbatim**, in whichever ISO form the upstream uses, which the client
  parses in both forms (captured).
- **Missing references are negatively cached** with the short TTL: ConanCenter answers `404` with a
  JSON error body and the client treats it as "not in this remote"; a `429` or `5xx` is never cached
  as absence (`proxy-cache.md` AC9).
- **Uploads and removes against a `remote` repository answer `405`.**

Upstream removal maps onto the settled purge-or-flag table as Conan's side of that contract:

| Upstream event, as observed at revalidation | Classification |
|---|---|
| `latest` moves to another revision (newer, or older because the upstream removed its newest), or a revision's `time` changes | An **ordinary metadata change**, propagated at the next revalidation; cached revision files keep serving |
| A recipe revision or package revision vanishes from the upstream's lists | Keep serving the cached content under its pinned identifier, record an operator-visible divergence; the wire carries no reason |
| The reference answers `404` where it previously existed | Keep serving, record a divergence |
| A bound revision's manifest no longer hashes to it, an archive disagrees with the manifest, or a Conan 2 `conaninfo.txt` no longer hashes to its package ID | An **integrity failure at fetch**: never committed, `proxy-cache.md`'s serve-stale rules apply to metadata, and the operator is alerted |
| The same revision re-served with different archive bytes whose content still matches (an upstream re-upload after an `mtime` change) | Not an event: the cached bytes are kept, because the coordinate is immutable and its content unchanged |

Detection happens at revalidation, passively, per `proxy-cache.md`'s resolved passive-detection
decision (was Q12). **No row is an explicit security signal**: ConanCenter's wire has none, and with
no OSV data the advisory feed has none either, so nothing condemns a Conan coordinate under the
shared security-signal rule; this is stated as a coverage gap, not assumed away.

### Virtual repositories

A virtual repository of format `conan` is possible, where `hex.md` found one impossible, because no
Conan answer binds a repository identity: revisions are content identities valid on any remote, and
nothing is signed by the remote. Per the resolved virtual-repository decision below, resolution is
**per reference, in member order**:

- **`latest` and a package's `latest`** come from the first member, in position order, that holds
  the reference (a complete revision of it), with that member's served time. A hosted member placed
  first therefore shadows the same reference upstream, and because the client configured with only
  the virtual repository has no second remote to compare, `--update` cannot let an upstream's newer
  time override a private reference.
- **`revisions` is the union** of the members' complete revisions, each entry with the time from the
  first member holding it, ordered newest first, so a lockfile pinning an upstream revision still
  finds it (the client scans this list for a pinned revision).
- **Revision-addressed routes** (a revision's files, its packages, a package revision's files)
  resolve in the first member holding that exact revision, which by the identity rules is the same
  content wherever it is held; a binary is served from the member that holds it under that revision.
- **Search** is the union of the members' results.
- A virtual repository creates no snapshots: its answers are derived from its members' at request
  time, and uploads and removes against it answer `405`.

The accepted cost: `latest`'s `time` comes from whichever member supplies it, so reordering members
can move a reference's served time backwards, and warm clients then keep what they had, which the
operator documentation states beside the member-order recipe.

### Conformance, the clients and the corpus

Conan 2.32.0 and 2.0.17 are the two pinned Conan 2 generations; they differ on the wire in the
package search query (`list_only=False` on 2.32.0), in the bulk remove route 2.0.17's API still
carries, and in their default `conancenter` remote (2.32.0 ships `https://center2.conan.io`, captured;
2.0.17 ships the frozen `https://center.conan.io`, in `conans/client/cache/remote_registry.py`), so a
proxied recipe names each generation's own default as the remote to replace; and they agree on every behaviour in "Three client
behaviours" (captured on both). Conan 1.66.0, the final Conan 1 release, is the third client, in
revisions mode (`conan config set general.revisions_enabled=1`) for install and upload; its
non-revisions mode is exercised only for the `400` refusal. The catalogue counts one ecosystem and
no multiplier row, and all three appear in the matrix's Client column under the Conan row. Every
hosted and proxied read case runs on all three; every upload and remove case on both Conan 2
generations and upload on Conan 1.66.0. Each image is built from the digest-pinned Python base with
the pip pin and then pinned by its own digest in the case.

Three assertion traps are recorded where the cases are written. **The client cache hides the
registry**: a warm install without `--update` sends nothing, so every case that proves a registry
behaviour starts from a fresh `CONAN_HOME` or runs `--update`. **The exit code hides fall-through**:
a refused or missing reference on this remote can succeed from the next one, so every refusal case
either configures this registry as the only remote or asserts the transcript and the network layer.
**Non-interactive runs must be forced**: the harness sets `core:non_interactive=True` in
`global.conf`, or a `401` prompts and hangs.

The recorded surface for the replay corpus, named now because a thin recording script yields a thin
specification: against the reference `conan_server` 2.32.0 run in a container pinned by digest, a
cold and a `--update` install, a version-range install, an upload of a recipe with two binaries, a
second revision, a forced re-upload of an older revision, `conan list` and `conan search`, each
remove shape, a `--metadata` upload and download, a private read with the `401` and the exchange,
and Conan 1.66.0's revisions-mode upload; against ConanCenter, a cold install of a recipe and its
binary, a missing reference and a missing binary. Recording gates on the harness's redaction
criterion (`conformance-harness.md` AC13); the Basic value at the exchange, the returned token, the
Bearer and `X-Client-Anonymous-Id` are what the allowlist must name. Every deliberate divergence
from the reference server goes on the recorded exception list before its flow is expected to replay:
incomplete revisions invisible, re-upload idempotent without duplicate entries, pointer-scoped
times, the capability header without `complex_search`, and the `400` on the v1 file API.

## Acceptance Criteria

- [ ] AC1: `conan install --requires {name}/{version}` from a fresh `CONAN_HOME` resolves a recipe and
      its binary from a hosted repository added as `https://{host}/conan/{repository}` on Conan
      2.32.0, 2.0.17 and Conan 1.66.0 in revisions mode, the installed files byte-identical to the
      published ones; the transcript shows the probe answered with
      `X-Conan-Server-Capabilities: revisions` and none of `checksum_deploy`, `complex_search`,
      `matrix_params` or `oauth_token`, then `latest`, the revision `files`, the manifest and
      `conanfile.py`, the package `latest`, `files` and the three package files, every JSON answer
      carrying `Content-Type: application/json` as the client's `_get_json` requires and no error
      body containing `html>`; a warm install makes no
      request, and a warm `--update` makes only the two `latest` requests.
- [ ] AC2: `conan upload {ref} -c` of a recipe with two binaries on Conan 2.32.0 and 2.0.17, and on
      Conan 1.66.0 in revisions mode after its `/v1/users/authenticate` exchange, is answered `200`
      on every `PUT` with no `X-Checksum-Deploy` request in the transcript, produces one snapshot per
      accepted file, and makes the recipe revision and both binaries visible in the write of their
      last verified file, with a `time` in the ISO form the client parses; a fresh install on every
      client then retrieves exactly the uploaded bytes, and a user-and-channel reference
      (`{name}/{version}@acme/stable`) round-trips the same way as a package separate from the
      unqualified one.
- [ ] AC3: An upload is refused with `400` naming the rule and the file, the refused file not
      recorded and the revision never visible, when the manifest does not parse as an integer line followed by
      `path: md5` lines, a 32-character recipe revision differs from its manifest's summary hash, a package revision differs from its summary hash, a Conan 2
      `conaninfo.txt` does not hash to its package ID, an archive entry's MD5 differs from its
      manifest line, the manifest names a file no archive contains, an archive holds an entry the
      manifest omits, or a body disagrees with its `X-Checksum-Sha1`; while a commit-id recipe
      revision and a Conan 1 `conaninfo.txt` (one carrying `[full_settings]`) whose content verifies
      are accepted and recorded as unbound.
- [ ] AC4: With a fault-injected refusal of `conanfile.py` reproducing the captured sequence in
      which the client still uploads the manifest, the incomplete revision is absent from `latest`,
      `revisions`, `files` and search and its files answer `404`, as is a revision whose
      `conanmanifest.txt` implies a `conan_export.tgz` or `conan_sources.tgz` that has not landed, a fresh install resolves the
      previous latest revision, a repeated `conan upload` completes it, and an incomplete revision
      left for longer than the upload-session cap under an injected clock is gone after the next
      write to its version and after the management drop operation, each one snapshot.
- [ ] AC5: `conan upload --force` of a complete revision with identical bytes, and of the same
      revision re-exported after an `mtime` change so its archives differ in bytes and agree in
      content, is answered `200` on every `PUT`, creates no snapshot for the unchanged files, and a
      later download returns the originally stored bytes; a `PUT` whose content disagrees with a
      complete revision's manifest is answered `403` and the client aborts the upload at that file;
      and a forced re-upload of a complete revision that is not the latest makes it `latest` in
      exactly one metadata-only snapshot, listed once in `revisions`.
- [ ] AC6: After an environment pointer is rolled back to a snapshot whose latest revision is older
      than the one it served, a client on Conan 2.32.0 and on 2.0.17 holding the newer revision in
      its cache runs `conan install --update` against that environment and adopts the restored
      recipe revision and, for a rolled-back binary, the restored package revision; the served
      `time` of each restored latest is no earlier than the rollback, every other revision keeps its
      own time, the lists stay newest first, and a promoted environment serves the same revisions
      and binaries as its source with latest times no earlier than its own promotion.
- [ ] AC7: `conan remove` of a package revision, of every binary of a recipe revision, and of a
      recipe revision, on Conan 2.32.0 and 2.0.17, and a `DELETE` of a package ID and of a whole
      reference through `curl`, each remove exactly what they name in exactly one snapshot, after
      which `latest` falls back to the previous revision or the reference answers `404`; a
      principal holding `push` without `delete` is refused `403` with the client printing the body
      and no snapshot created; a remove of something absent is reported by the client as an error;
      and every remove against a proxied repository answers `405`.
- [ ] AC8: Each remove operation and the incomplete-revision drop driven through the registry-owned
      management endpoint produce the same served documents, exactly one snapshot each, and the
      same authorization outcome as the same operation driven through the client binding, with
      `delete` required through both entry points.
- [ ] AC9: A removed bound recipe revision and a removed package revision uploaded again are
      accepted and become `latest`, including after the remove's snapshot has been pruned out of
      retention; a removed commit-id recipe revision is refused `403` on every later `PUT` under
      it, with the same or different content, after pruning, after a whole-reference remove, and
      after a pointer is moved back across the remove, while a new revision of the same reference
      uploads normally.
- [ ] AC10: `conan upload --metadata="*"` of a file under a complete revision stores it in one
      write, a second upload of changed content replaces it in one further write, `conan download
      --metadata="*"` retrieves the replacement, and neither write changes the revision's identity,
      its `time`, its archives or which revision is `latest`; `metadata/sign/` files written by the
      signing plugin are served byte-identical on both paths.
- [ ] AC11: From fresh caches on both Conan 2 generations, `conan search "{glob}" -r`, `conan list
      "{name}/*#*:*#*" -r` and `conan install --requires "{name}/[>=1.0 <2]"` return exactly the
      complete revisions, their binaries with the settings and options of each `conaninfo.txt`, and
      the highest version in range; the glob matches case-insensitively and exactly under
      `ignorecase=False`; and no incomplete revision appears in any of them.
- [ ] AC12: A mixed-case reference or revision, a traversal segment, a revision or package ID that
      is not lowercase hexadecimal (other than a commit id for a recipe revision), and a reference
      with a user but no channel each answer `404` on reads and `400` on uploads; and an upload of a
      reference with an uppercase name, sent by a client with `core:allow_uppercase_pkg_names`, is
      refused with `400`.
- [ ] AC13: Conan 1.66.0 without revisions receives `400` on its first v1 file route (`download_urls`) with a body
      telling it to enable revisions, prints that body and stops without requesting anything from a
      second configured remote, asserted at the network layer; and with revisions enabled it
      installs and uploads as AC1 and AC2 state.
- [ ] AC14: On a private repository a credential-less probe or `latest` answers `401` byte-identical
      for a private and a non-existent repository; `CONAN_LOGIN_USERNAME_{REMOTE}` with any user
      name and `CONAN_PASSWORD_{REMOTE}` carrying a registry token, `conan remote login {remote}
      {any} -p {token}`, and `credentials.json` each lead to a `users/authenticate` exchange whose
      body is the token and to Bearer requests that succeed; `users/check_credentials` answers the
      principal's name; a rejected token answers `401`, is never served as anonymous, and fails
      non-interactively; a valid token lacking `pull` answers `404` on the probe and the client
      resolves from its second configured remote, asserted from both transcripts; and a credential
      over a connection this registry did not terminate with TLS is refused per `auth.md` AC27.
- [ ] AC15: A token holding unpatterned `pull` and `push` and `delete` patterned `acme-*/**` uploads
      and removes `acme-tool/1.0` through the real client and is refused, `404` with no snapshot, on
      `other-tool/1.0`; one patterned `*/*/acme/**` uploads `tool/1.0@acme/stable` and is refused
      `tool/1.0@other/stable`; a token holding only `pull` patterned `acme-*/**` is refused the
      probe, so the real client resolves nothing through it, while `curl` with its Bearer reads
      `acme-tool`'s `latest` and is refused `other-tool`'s; and in proxied mode the same patterned
      `pull` reads an in-pattern upstream reference through `curl` and is refused another.
- [ ] AC16: A recipe or binary request the shared policy layer refuses answers `403` with a
      `text/plain` body naming the policy, on the hosted and the proxied path; `conan install` on
      both Conan 2 generations prints that body and exits non-zero, including when a second
      configured remote holds the same revision and under `--update`, with no request reaching the
      second remote, asserted at the network layer; and search and listings still name the refused
      revision.
- [ ] AC17: The proxied path installs a recipe and its binary from a ConanCenter stand-in serving
      recorded `center2.conan.io` answers on all three clients; from fresh client caches a second
      install reaches this registry while the upstream receives no request for any revision file,
      asserted at the network layer; every file is byte-identical to the upstream's; and the probe
      and `users/*` routes are never forwarded.
- [ ] AC18: A proxied `latest` is revalidated after its TTL and not before, by a full `GET` against
      a stand-in that sends no validator; a revision published upstream becomes visible to `conan
      install --update` after the TTL and, absent an explicit refresh, not before; a `metadata/`
      file replaced upstream is served anew after its TTL; and cached revision files are never
      revalidated.
- [ ] AC19: A stand-in serving a revision whose archive content disagrees with its manifest (the
      captured tampered `conan_package.tgz`), whose bound manifest does not hash to its revision,
      whose `conaninfo.txt` does not hash to its package ID, whose body disagrees with its
      `X-Checksum-Sha256`, or whose body is truncated, never has the file committed or delivered in
      full to any client through this registry, the installing client fails where a direct client
      installed the tampered bytes, and the real failure reason is recorded observably to the
      operator.
- [ ] AC20: An upstream `latest` moving to an older revision is propagated at the next revalidation
      and served with the upstream's time; a revision vanishing from the upstream's lists, or the
      reference answering `404`, keeps serving with a divergence recorded; a re-served revision with
      different archive bytes and the same content leaves the cached bytes in place; an upstream
      `404` is negatively cached so a second request within the negative TTL makes no upstream
      request; and an upstream `429` or `5xx` is neither cached as absence nor surfaced as
      not-found: Conan's side of the settled removal table in `proxy-cache.md` (its AC13).
- [ ] AC21: A virtual repository whose members are a hosted repository then a ConanCenter remote,
      configured as a client's only remote, serves a private reference's `latest` from the hosted
      member even when the upstream holds the same reference with a later time, under `conan install
      --update`; resolves a lockfile pinning an upstream-only revision of that reference through the
      union `revisions` list; serves each binary from the member holding it under that revision; and
      answers `405` to uploads and removes.
- [ ] AC22: Two concurrent uploads of different recipe revisions of one reference, and two
      concurrent uploads of binaries under one recipe revision, both land with every revision and
      binary listed, `latest` naming the one whose completing write committed later, with no lost
      update across the revision-token retry, proven with fault injection at each write boundary.
- [ ] AC23: Replay-match passes against a corpus recorded from the pinned reference `conan_server`
      and from ConanCenter covering the recorded surface named in Design, with every divergence
      named in Design on the exception list and no Basic value, token, Bearer or
      `X-Client-Anonymous-Id` value in the committed corpus.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/conan/hosted_test.go` (all three client images; fresh `CONAN_HOME` in setup; byte comparison; transcript shape; warm and `--update` request counts at the network layer) |
| AC2 | conformance + integration | `conformance/conan/upload_test.go` (each client, a two-binary recipe, the user-and-channel reference, fresh-cache install on every client); `internal/format/conan/upload_test.go` (snapshot per accepted file, visibility at the completing write, time format) |
| AC3 | integration + conformance | `internal/format/conan/verify_test.go` (each rule with a crafted fixture through the handler; commit-id and Conan 1 fixtures accepted unbound); `conformance/conan/upload_test.go` (a real-client upload of a tampered archive refused, `curl` for the header mismatch) |
| AC4 | conformance + integration | `conformance/conan/partial_upload_test.go` (fault-injected `conanfile.py` refusal, invisibility, fresh install, repeated upload); `internal/format/conan/incomplete_test.go` (injected clock, drop by the next write and by the management operation) |
| AC5 | conformance + integration | `conformance/conan/reupload_test.go` (identical and re-exported `--force` uploads, stored bytes on download, the `403` abort, the re-stamp); `internal/format/conan/immutability_test.go` (snapshot counts, single list entry) |
| AC6 | conformance + integration | `conformance/conan/rollback_test.go` (both Conan 2 images, warm cache holding the newer revision, rollback through the management surface, `--update` adoption for recipe and binary; promotion case); `internal/format/conan/pointer_time_test.go` (served times per pointer, list order) |
| AC7 | conformance + integration | `conformance/conan/remove_test.go` (each remove shape on both Conan 2 generations, `curl` for the two reference-server routes, `push`-only refusal, absent-target error, proxied `405`); `internal/format/conan/remove_test.go` (one snapshot per operation) |
| AC8 | conformance + integration | `conformance/conan/manage_binding_test.go` (twin references in one `script`: one removed through the management endpoint, one through `conan remove`; served documents compared); `internal/format/conan/manage_binding_test.go` (snapshot count and authorization per entry point) |
| AC9 | conformance + integration | `conformance/conan/retirement_test.go` (re-upload of a removed bound revision and package revision; commit-id revision refused); `internal/format/conan/retirement_test.go` (after pruning under an injected clock, after whole-reference remove, across a backwards repoint) |
| AC10 | conformance | `conformance/conan/metadata_test.go` (both Conan 2 generations, upload and replace, download, revision and `latest` unchanged; signing-plugin files byte comparison in both modes) |
| AC11 | conformance | `conformance/conan/search_test.go` (search, list and range install from fresh caches on both Conan 2 generations; `ignorecase=False` through `curl`; an incomplete revision present during the case) |
| AC12 | conformance + unit | `conformance/conan/names_test.go` (`curl` for each malformed path; an uppercase upload with the deprecated setting); `internal/format/conan/route_test.go` (segment grammar) |
| AC13 | conformance | `conformance/conan/conan1_test.go` (Conan 1.66.0 image with and without revisions, a second remote stand-in, network-layer assertion of no request to it) |
| AC14 | conformance + integration | `conformance/conan/auth_test.go` (private repository on every client; challenge equality across existing and missing repositories; each credential source; `check_credentials`; rejected token; `pull`-less token with a second remote; transcript assertions); `internal/format/conan/auth_test.go` (plaintext refusal under `auth.md` AC27) |
| AC15 | conformance + unit | `conformance/conan/auth_test.go` (the pattern-refusal case `format-handler-interface.md` AC7 requires, in both modes; pattern-scoped tokens provisioned through the `credentials` key; real-client uploads and removes; the probe refusal; `curl` reads with the Bearer); `internal/format/conan/scope_object_test.go` (the object table, per route, `format-handler-interface.md` AC12) |
| AC16 | conformance | `conformance/conan/policy_test.go` (hosted and proxied modes; rules through the `policies` key; a second remote stand-in holding the same revision; `--update`; network-layer assertion) |
| AC17 | conformance + integration | `conformance/conan/proxied_test.go` (stand-in serving recorded ConanCenter answers; all three clients; network-level assertion from fresh caches; byte comparison); `internal/format/conan/proxied_local_routes_test.go` (probe and `users/*` never forwarded) |
| AC18 | conformance | `conformance/conan/proxied_ttl_test.go` (mutating stand-in without validators; `--update` before and after the TTL; metadata-file replacement) |
| AC19 | integration + conformance | `internal/format/conan/proxied_integrity_test.go` (each tampered variant and a truncated body; CAS and reference assertions; operator record); `conformance/conan/proxied_integrity_test.go` (the captured tampered archive through a real client, failing through this registry) |
| AC20 | integration | `internal/format/conan/removal_test.go` (stand-in presenting each event class, negative caching and throttling responses; the shared-layer half is `proxy-cache.md` AC13's) |
| AC21 | conformance | `conformance/conan/virtual_test.go` (hosted then remote members; `--update` with a later upstream time; a lockfile pinning an upstream-only revision; binary provenance from the transcript; `405` on writes) |
| AC22 | integration | `internal/format/conan/concurrent_upload_test.go` (two writers per case, fault injection at each write boundary, final document asserted) |
| AC23 | conformance | `conformance/conan/replay_test.go` |

The case set needs only keys already in the harness's closed `setup` vocabulary (its resolved
closed-vocabulary decision, was Q4): `repositories` with their visibility and type, including a
virtual repository's member order; `credentials`, patterned ones included; an `upstreams` stand-in
(a fixture server serving recorded ConanCenter answers and the tampered variants, and a second-remote
stand-in for the fall-through and refusal cases); `state` for pre-published revisions, removed
revisions with their retirement set and incomplete revisions carried verbatim in the version-level
document; and `policies` for AC16. The issued credential reaches the client as
`CONAN_LOGIN_USERNAME_{REMOTE}` and `CONAN_PASSWORD_{REMOTE}`, with `core:non_interactive=True`
written into `global.conf` by the case `script`. The runner-enforced obligations, both modes and
the unauthenticated, unauthorized and pattern-refusal cases in each, apply from the sibling specs and
are not restated per criterion here.

## Implementation Phases

### Phase 1: Hosted reads
- Waits on the `data-model.md` revision carrying a pointer's last repoint time (Blocking
  preconditions)
- The format-first mount, the capability probe, the token exchange on both routes and the
  credential check, the reference grammar, the version-level document and every read route
  rendered from it through the pointer with pointer-scoped times, the per-route addressed objects,
  the `403` policy rendering, and the `400` on the v1 file API

### Phase 2: Uploads
- Per-file writes with completion gating, the five verification rules, content-level immutability
  and the re-stamp, `metadata/` files, the drop of abandoned incomplete revisions by the next write,
  and the write-boundary declaration exercised end to end under concurrency

### Phase 3: Removes
- Waits on `docs/internal/plans/foundation/management-api.md` reaching `planned` (Blocking
  preconditions)
- The six operations with the client's routes bound onto them, the retirement set for unbound
  revisions, and its preservation across a backwards repoint

### Phase 4: Proxied path
- Waits on `proxy-cache.md` offering the completion-only mode with a handler-supplied verifier and on
  the ConanCenter adapter in `upstream-adapters.md` (Blocking preconditions)
- Upstream validation by probe, classification per route, verification before commit, TTL
  revalidation without validators, negative caching, the removal table, `405` on remote writes

### Phase 5: Virtual repositories
- Per-reference member-ordered resolution, the union lists, revision-addressed resolution across
  members, `405` on virtual writes

### Phase 6: Corpus and gate
- Recording session across the named surface (after the harness redaction gate) against the pinned
  reference server and ConanCenter, replay-match, the second Conan 2 generation and Conan 1.66.0,
  the exception-list entries named in Design, and the matrix rows for the deliberately unimplemented
  v1 file API and capabilities

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. The ten questions this draft raised were each written in the template's decision shape
and then adopted at their own recommendation under the owner's standing delegation of 2026-09-26, so
the loop can continue; each is recorded below as adopted rather than decided, folded through Scope,
Design, the criteria and the Test Plan in the same pass, and reversible by the owner at any time.
`grep -rn "standing delegation"` is the owner's review queue.

### Resolved: whether and how Conan 1 is served (was Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: Conan 1 is served in
revisions mode, through the v2 file API plus the one v1 route it still calls,
`/v1/users/authenticate`; the v1 file API is answered `400` with a body telling the user to enable
revisions (Scope; Design, "The wire surface" and "Conformance"; AC1, AC2, AC13).

The question: Conan 1 without revisions speaks a v1 API with no revisions (captured:
`GET /v1/conans/{ref}/download_urls`), which the current reference server does not serve (captured
`404`); with `general.revisions_enabled=1` it speaks the v2 file API and calls
`/v1/users/authenticate` for its token (captured). ConanCenter froze its Conan 1 remote on 4 November
2024 and 1.66.0 of 2 December 2024 is the last release, but ConanCenter still answers the v1 API and
existing Conan 1 builds still run.

**Recommendation:** B. Revisions mode costs one route and one client image, gives teams still on
Conan 1 a registry with the same immutability as Conan 2, and the refusal matters more than the
support: a `404` on the v1 route would send a non-revisions Conan 1 client to its next remote
silently, while a `400` stops it and prints the fix (captured).

| Option | You get | It costs |
|---|---|---|
| **A. Conan 2 only** | The smallest surface | Conan 1 teams get nothing, and a Conan 1 client falls through this remote silently on `404`s |
| **B. Conan 1 in revisions mode; v1 file API refused with `400`** | Conan 1 teams served with full immutability; a loud, self-explaining refusal otherwise | One route, one pinned client, and a third client in the matrix |
| **C. The full v1 API** | Every Conan 1 configuration works | Files mutable at a reference with no revision, contradicting the immutability model, and a signed-URL indirection (`download_urls`) the v2 API dropped |

**Why this is yours:** it decides whether a frozen client generation is part of the product's claim.

Accepted cost: the Conan 1.66.0 image and its cases, and the exception-list entry for the refused v1
file API.

### Resolved: where a revision's served time comes from, given that the client keeps a newer cached revision (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a pointer carries the time of
its last promotion or rollback, and through it the latest recipe revision of each reference, and the
latest package revision of each package ID, is served with the later of its own time and that time
(Design, "Revision times belong to the pointer"; AC6; the Phase 1 precondition).

The question: `latest` is ordered by server-assigned time, and a client holding a newer revision
keeps it when the remote serves an older one with its original time (captured on both Conan 2
generations), adopting it only when the served time is later (captured). Rollback and promotion in
`data-model.md` are pointer moves over immutable snapshots, so stored times make a rollback invisible
to every client that already updated. This is the analogue of `debian.md`'s older-`Release` finding.

**Recommendation:** A. It is the only option under which a rollback reaches a client, it adds one
field to an existing entity rather than a record, and it changes no revision's identity or content.

| Option | You get | It costs |
|---|---|---|
| **A. Pointer-scoped floor on the latest revision's time** | Rollback and promotion reach `--update` clients on both generations | A `data-model.md` revision (a repoint time on `Pointer`), and a promoted environment's JSON differs from its source's in one field, qualifying `data-model.md` AC22 |
| **B. Serve stored times** | No model change | Every rollback silently ignored by every client that updated past it |
| **C. Make a rollback a write that re-stamps** | Rollback visible | A rollback that creates a snapshot is not a rollback in the shared model, and it cannot be undone by repointing |

**Why this is yours:** it asks the shared model to carry a field for one format's client rule and
bends a promotion guarantee you settled.

Accepted cost: the `data-model.md` revision and AC22's qualification, both sibling consequences, and
the documented fact that a client that never runs `--update` never sees a rollback.

### Resolved: the write boundary of an upload (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: each accepted file `PUT` is
one completed logical write, and a revision becomes visible only in the write that completes its
verified file set (Design, "The upload path and what counts as a write"; AC2, AC4).

The question: the wire has no publish request, the manifest-last order is a convention the client
breaks after a failed file (captured), and the reference server serves a revision as soon as its
first file lands (captured), so an incomplete revision can become `latest`.

**Recommendation:** A, following `maven.md`'s per-file precedent for the same wire shape: it keys on
nothing the wire lacks, and gating visibility on the verified set closes the reference server's
incomplete-`latest` hazard where it bites.

| Option | You get | It costs |
|---|---|---|
| **A. One write per file; visibility gated on the verified complete set** | Faithful to the wire; no invented session; an interrupted upload is invisible and resumable | Several snapshots per upload, and abandoned incomplete revisions to drop |
| **B. The manifest `PUT` as the single write** | One snapshot per revision | The earlier files need a path-labelled in-flight record the shared model does not have, and the manifest can arrive while a file is missing |
| **C. The reference server's behaviour** | Replay-faithful | An incomplete revision served as `latest`, which fails every fresh install until someone re-uploads |

**Why this is yours:** it decides what an upload promises on this registry and accepts a snapshot per
file on the hosted path.

Accepted cost: N snapshots per upload and the drop rule for abandoned revisions; C's divergence goes
on the exception list.

### Resolved: what a re-upload to an existing revision does (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: content that agrees with a
complete revision is accepted idempotently with the stored bytes kept; content that disagrees is
refused `403`; a forced re-upload of a complete revision that is not the latest re-stamps it as
latest in one metadata-only write (Design, "The upload path and what counts as a write"; AC5).

The question: the same revision re-exported from another checkout carries different archive bytes
with the same content (captured), `conan upload --force` re-sends every file, and the reference
server and the documentation make a re-uploaded older revision the latest.

**Recommendation:** A. Immutability is stated over content, which is what the revision identifies,
so a legitimate re-export is not a conflict; keeping the first bytes means one coordinate serves one
set of bytes for its life; and `403` is the one status that aborts the client's upload at the
offending file rather than letting it continue.

| Option | You get | It costs |
|---|---|---|
| **A. Content-level idempotence, `403` on conflict, re-stamp on forced re-upload** | Legitimate re-exports succeed; one byte set per coordinate; the documented "re-upload makes it latest" workflow works | Archive re-verification on every forced re-upload; the `403` prints under a "Permission denied" prefix |
| **B. Byte-level immutability** | A simpler check | A re-export after an `mtime` change fails as a conflict although nothing changed |
| **C. Replace the stored bytes on every re-upload** | Last writer wins | Different bytes served under one coordinate over time, to caches that already hold the first |

**Why this is yours:** it sets what "immutable" means on a format whose identities are content
hashes over unpacked files, not over the bytes on the wire.

Accepted cost: the re-verification work and the documented `403` wording.

### Resolved: which removed revisions may come back (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: a removed bound revision may
be uploaded again; a removed unbound (commit-id) recipe revision is retired forever (Design, "Removes
are bindings"; AC9).

The question: the cross-format rule `npm.md`, `pypi.md` and `hex.md` adopted retires a removed
coordinate so it can never carry different bytes; the reference server and the documentation let a
removed revision be uploaded again, and it becomes the latest.

**Recommendation:** B. The retirement rule exists to stop a coordinate carrying different content;
for a bound revision the identifier is the digest of its manifest and verification recomputes it, so
the only content that can return is the content that left, and retiring it would break a documented
Conan workflow for no protection. A commit id binds nothing, so there the retirement set is the only
protection and the cross-format rule applies unchanged.

| Option | You get | It costs |
|---|---|---|
| **A. Retire every removed revision** | One rule with every sibling | A documented re-upload fails although it could only restore identical content |
| **B. Bound revisions return; unbound are retired** | The rule's protection exactly where it is needed; the workflow works | Two cases to explain, and the retirement set holds only commit ids |
| **C. Every removed revision may return** | Replay-faithful | A commit-id revision can come back with different content |

**Why this is yours:** it refines a cross-format rule for a format whose identifiers already carry
what the rule protects.

Accepted cost: the two-case rule in the operator documentation.

### Resolved: what the token exchange returns (was Q6)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: `users/authenticate` verifies
the Basic password as a registry token, ignores the user name, and returns the same token as its body
(Design, "Authentication"; AC14).

The question: the client exchanges a user name and password for a token it then presents as Bearer
and stores in plaintext in `.conan.db` (captured). The registry could return the presented token or
mint a short-lived one, as the OCI token service does.

**Recommendation:** A. Nothing is invented: the client already holds the registry token, since it
had to present it; a short-lived token would expire and send the client back to its credential
sources, which must hold the long-lived token anyway, so exposure does not shrink, while revocation
would lag by the short token's lifetime, the window `auth.md` accepts only where the distribution spec
forces it.

| Option | You get | It costs |
|---|---|---|
| **A. Return the presented token** | No second token product; revocation immediate; any user name works | The long-lived token is written to `.conan.db` in plaintext, where the client puts whatever it is given |
| **B. Mint a short-lived token** | Only a short-lived value on disk | A second token-service product, a revocation window, and re-authentication through credential sources that must hold the long-lived token regardless |

**Why this is yours:** it trades what sits in a developer's client database against a second token
product and a revocation window.

Accepted cost: the operator documentation says what the client stores and where.

### Resolved: the addressed objects, and what a pattern refusal looks like (was Q7)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: every route under a reference
reports `{name}/{version}/{user}/{channel}`; the probe, the user routes and search report none under
`pull`; a pattern refusal answers `404` (Design, "Addressed objects and pattern scopes"; AC15).

The question: every Conan command starts with a probe that addresses nothing, `auth.md` never
authorizes a none object for a patterned scope, and the status of a pattern refusal decides whether
the client tries its next remote (`404`) or halts (`403`).

**Recommendation:** A. It applies `auth.md` as written, as `cargo.md` and `hex.md` did for their
identity and discovery routes, rather than inventing a kind; the usable recipe (unpatterned `pull`,
patterned `push` and `delete`) covers the case patterns exist for, narrowing what CI may write; and
`404` keeps a pattern from being an oracle and makes an out-of-pattern name behave like one this
remote does not hold.

| Option | You get | It costs |
|---|---|---|
| **A. Reference object; identity routes none; refusal `404`** | No new object kind; no oracle; write narrowing works | A patterned-only `pull` cannot run the client at all; an out-of-pattern read falls through to the next remote |
| **B. Exempt the probe and user routes from the pattern rule** | Patterned `pull` works | A per-handler exception to the central rule, the class `auth.md` AC18 exists to catch |
| **C. Pattern refusal as `403`** | An out-of-pattern read halts the client | A distinguishable refusal for names outside the pattern, and every public dependency behind this remote fails instead of resolving from the next one |

**Why this is yours:** it accepts a client-wide limitation rather than bending a security rule you
settled, and it decides which way a refusal moves the client.

Accepted cost: the documented recipe and the limitation, and a sibling note that an `auth.md` revision
adding a repository-constant object kind would lift it.

### Resolved: virtual repositories (was Q8)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: virtual repositories are
supported, with `latest` from the first member holding the reference, a union `revisions` list, and
revision-addressed routes from the first member holding that revision (Design, "Virtual
repositories"; AC21).

The question: nothing in a Conan answer binds a repository, so a merge is expressible; the choice is
the resolution rule, and it matters because `--update` across separately configured remotes lets the
newest time win (captured).

**Recommendation:** A. Member order is `data-model.md`'s resolution rule, it makes a private reference
shadow an upstream one for a client whose only remote is the virtual repository, which is the
defence against `--update`'s newest-time rule, and the union list keeps lockfiles that pinned an
upstream revision working.

| Option | You get | It costs |
|---|---|---|
| **A. Per-reference member order, union lists, revision lookup across members** | Private names shadow public ones; pinned upstream revisions resolve | `latest` can disagree with the newest entry of the union list, and member reordering can move a served time backwards |
| **B. Newest time across members, as the client's `--update` does** | Matches the client's own merge | Reintroduces the dependency-confusion path inside the registry |
| **C. No virtual repositories** | Nothing to specify | Users must list two remotes, and `--update` then lets an upstream override a private reference |

**Why this is yours:** it sets the precedence between private and public content, a supply-chain
posture.

Accepted cost: the documented time regression on member reordering.

### Resolved: where user and channel live in the shared model (was Q9)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: `Package.name` carries the
name with its user and channel (`hello@acme/stable`), `Version.version` the version alone (Design,
"Mapping onto the shared model"; AC2).

The question: a Conan reference is name, version, user and channel, the shared model has a package
name and a version string, and retention, policy coordinates and the UI all read those two fields.

**Recommendation:** A. User and channel are namespaces whose versions move independently (a `stable`
and a `testing` line), so per-package retention and listings mean what an operator expects; the
unqualified package keeps the bare name that ConanCenter and any future OSV data use; and `@` cannot
collide with a name under the client's grammar.

| Option | You get | It costs |
|---|---|---|
| **A. User and channel in the package name** | Channels as separate lines; bare names match ConanCenter | A policy rule on `hello` does not cover `hello@acme/stable` unless written for it |
| **B. User and channel in the version string** | One package per name | Retention counts versions across channels, and the version string is no longer a version |
| **C. One version per revision** | Revisions as first-class rows | The version string stops being the ecosystem's version, and revisions already have a home in the version-level document |

**Why this is yours:** it fixes the coordinate policy rules, retention and the UI address for this
format.

Accepted cost: the policy-rule note in the operator documentation.

### Resolved: ConanCenter as a preconfigured upstream (was Q10)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: ConanCenter is
user-configured in v1 and not added to the preconfigured set; the trigger for revisiting is the
catalogue's Tier 2 verdict, through `proxy-cache.md`'s own extension mechanism (its resolved
preconfigured-set extension, was Q14), which left crates.io, pub.dev and repo.hex.pm on the same
footing.

**Recommendation:** B, for sequencing rather than effort: Conan is Tier 2 and built only if the
breadth gate says so, so amending a sibling's settled decision on its account now would be a
half-applied change against a format that may not be built.

| Option | You get | It costs |
|---|---|---|
| **A. Preconfigure center2.conan.io now** | C and C++ caching with no configuration | A sibling decision reopened from a Tier 2 spec before the gate that decides whether Tier 2 happens |
| **B. User-configured in v1, revisited on the Tier 2 verdict** | No sibling amendment | No nightly run against the real ConanCenter until the revisit |

**Why this is yours:** it amends a set you priced for a few upstreams, a product and sequencing call.

Accepted cost: the proxied cases run against a stand-in only; the real ConanCenter is exercised by the
recording session until the revisit.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | cb5699f | authoring pass: grounded first draft, not a review | Grounded three ways: captured traffic from Conan 2.32.0, Conan 2.0.17 and Conan 1.66.0 (revisions off and on), in images built on `python:3.12-slim` pinned by digest, on a dedicated Podman network, against a logging and rule-injecting stub in front of the reference `conan_server` 2.32.0 and a pass-through to the live center2.conan.io (the probe and capability header, the Basic-to-Bearer token exchange and its storage in `.conan.db`, cold, warm and `--update` installs, a version-range install through recipe search, uploads with `X-Checksum-Sha1` and the manifest last, re-uploads plain and forced, an older revision re-stamped as latest, a `409` mid-upload after which the client still sent the manifest, `metadata/` upload, replace and download, every remove shape, `list` and `search`, lockfile pinning, rollback served with the old and with a later time on both Conan 2 generations, `403`, `404`, `401` and `500` on recipes, binaries, the probe and deletes with and without a second remote and under `--update`, credential sources and a non-interactive `401`, a tampered package archive installing silently, the same revision re-exported with different archive bytes, Conan 1's v1 routes and its `/v1/users/authenticate`, a prefixed remote URL, and a ConanCenter recipe and binary); the Conan client, Conan 1 and `conan-server` sources (routes, upload and download paths, error mapping, manifest and revision derivation, package ID derivation, reference grammar, audit providers, package signing, the reference server's revision list); the revisions documentation and the ConanCenter Conan 1 freeze notice; the live center2.conan.io and center.conan.io (capabilities, headers and conditional answers, JSON error shape, case sensitivity, anonymous-only user routes, the ignored package-search query, revision and package ID identities recomputed from real files); and OSV (no ConanCenter data although the schema defines the ecosystem). Design built from that: the wire table; the three decisive client behaviours (newer cached revision kept, nothing verified on download, `404` falls through while `401`, `403` and `5xx` halt); the five verification rules and bound versus unbound identities; the shared-model mapping with the revision-to-snapshot relation; per-file writes gated on a verified complete set; content-level immutability with the re-stamp; removes as bindings onto `management-api.md`; pointer-scoped revision times as the rollback answer, with the proxied analogue stated; the token exchange returning the registry token; reference-level addressed objects with the probe as none; the `403` policy rendering that halts the client; no signed index; the proxied classification with completion-only verification against the manifest; Conan's removal-table rows with no security signal; member-ordered virtual repositories. Ten questions written in decision shape and adopted under the standing delegation: Conan 1 in revisions mode with the v1 file API refused (AC13), pointer-scoped times (AC6), per-file write boundary (AC2, AC4), content-level re-upload rule (AC5), bound revisions returnable and commit ids retired (AC9), the token exchange returning the token (AC14), reference objects with `404` pattern refusals (AC15), virtual repositories (AC21), user and channel in the package name (AC2), ConanCenter user-configured. Twenty-three criteria, each with a Test Plan row; check-spec clean with zero advisories after folding eleven Design terms into criteria. Sibling consequences recorded in the authoring report, not applied here. Stays draft; awaits an independent review. |
