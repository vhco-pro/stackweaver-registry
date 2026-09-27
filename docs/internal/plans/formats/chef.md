---
status: draft
status_description: "Authored 2026-09-26 as a grounded first draft: the Supermarket API captured from Berkshelf 8.1.23 and 8.0.5, knife 19.3.2 and 17.10.0 and chef-cli (Policyfile) 6.1.39 and 5.6.9, run from two Cinc Workstation images pinned by digest on a dedicated Podman network against two logging, rule-injecting stubs that implement the Supermarket routes from the open-source Supermarket source; captured signed requests verified with the Go standard library; checked against the live supermarket.chef.io, the client, mixlib-authentication and Supermarket sources, and OSV. Ten questions written in decision shape and adopted under the owner's standing delegation; none open. Awaits a /spec review pass."
description: "Spec for the Chef cookbook format (the Supermarket API): a write-triggered repository-wide /universe document, cookbook and version documents, tarball downloads, knife supermarket share and unshare authenticated by Chef's signed-header scheme against registered public keys, private reads through the one header every resolver sends, a verifying supermarket.chef.io cache, and per-name virtual repositories that close the dependency confusion Berkshelf's source union opens, with Berkshelf, Policyfile and knife on two generations as the oracles."
author: michielvha
goal: "Serve Chef teams a private Supermarket whose cookbooks every resolver reads with one credential and publishes with the knife they already have, and a supermarket.chef.io cache that never delivers a tarball whose identity disagrees with its coordinate, with the real Berkshelf, Policyfile and knife as the oracle on both paths."
priority: "low"
issue: 35
created: 2026-09-26
covers:
  - "internal/format/chef/**"
  - "conformance/chef/**"
---

# Plan: Chef cookbook format (Supermarket API)

The Supermarket API, hosted, proxied and virtual: a repository-wide `/universe` document every
resolver fetches whole, cookbook and version documents, tarball downloads, and the two write
routes `knife supermarket share` and `unshare` drive with Chef's signed-header authentication.
Berkshelf, Policyfile (`chef install`, through chef-cli) and knife are the oracles on both paths,
each on two Chef Workstation generations.

## Context

Chef cookbooks sit in Tier 3 of `formats/catalogue.md` as the single-ecosystem family "Chef".
**Its build is gated by `project-charter.md` AC9 and `catalogue.md` AC5**: no handler code for a
Tier 3 ecosystem exists before every Tier 1 format has met its definition of done and the owner
has recorded a `continue` verdict at the charter's build step 8. This spec exists now because the
owner directed on 2026-09-26 that all 33 ecosystems be specced up front (the catalogue's "Every
ecosystem below is specced now; only building is gated"), so the gate decides what is built and
never what is written; a `shrink` verdict parks it.

The Supermarket API has **no published protocol specification**. It is defined by the
open-source Supermarket, a Rails application (`chef/supermarket`), and by what its consumers
send. So the grounding for this draft is captured traffic first and source second, stated up
front because the constitution asks for evidence or silence:

- **Captured client traffic.** No Chef client is installed on this host (`which berks knife chef
  cinc` finds nothing), so every client ran from Cinc Workstation images, the community
  distribution built from the same Chef, knife, Berkshelf and chef-cli sources, pinned by digest:
  `docker.io/cincproject/workstation@sha256:21475ee48077d510c71921e06430e27e05a761beec9301991d8b85207cb0e06c`
  (26.2.4, built 2026-09-14: Cinc Client 19.3.14, knife 19.3.2, Berkshelf 8.1.23, chef-cli 6.1.39,
  Ruby 3.4.10) and
  `docker.io/cincproject/workstation@sha256:4fe93546e41451af1b78e70bcd7c1512a0a0a2f6b99168abfdefd402b9aac429`
  (22.12.1024, built 2023-01-13: Cinc Client 17.10.0, knife 17.10.0, Berkshelf 8.0.5, chef-cli
  5.6.9, Ruby 3.0.3). Both share mixlib-authentication 3.0.10. Every run used a fresh `HOME` unless
  it says otherwise, on a dedicated Podman network (`chefcap-net`) with no other workload on it,
  against two logging stubs (`python:3.12-slim` pinned at
  `sha256:f77ac9e44ae96ef2c90b8053ea08c31f8be030f824196b0ae4db6d462c84e51f`) that implement the
  Supermarket routes from its source, record every request and response with the bodies of
  writes, and inject a status, body or document per path from a rules file. The second stub
  played a second source. The fixtures were genuine: cookbooks with `metadata.rb`, a README, a
  recipe and a dependency, shared through `knife supermarket share` so the tarballs and their
  `metadata.json` are the client's own; a tampered tarball; a version-swapped tarball; a higher
  version of a private name on the second source. The stub is not a reference implementation;
  what the captures prove is what the clients send and how they react.
- **The reference server was not run.** Supermarket ships as omnibus `deb` and `rpm` packages and
  as Habitat plans (its `.expeditor/` and `omnibus/` directories), with no published container
  image (`docker.io/chef/supermarket` and `cincproject/supermarket` do not exist), and it
  authenticates an upload only for a user whose `chef_oauth2` account and public key came from a
  sign-in through a Chef Infra Server's OAuth provider (`Api::V1::CookbookUploadsController#authenticate_user!`).
  The routes, documents and status codes were therefore taken from its source at commit
  `80d517b228fac3290fc83b06d3a873117d13b090` (2026-07-29) and the read shapes checked against the
  live supermarket.chef.io; the corpus plan below records against a seeded omnibus install.
- **The client and server sources**, read for the behaviour the captures surprised: Berkshelf
  (`berkshelf/source.rb`, `installer.rb`, `downloader.rb`, `community_rest.rb`,
  `resolver/graph.rb`, `ridley_compat.rb`, `api_client/connection.rb`, `berksfile.rb`), knife
  (`chef/knife/supermarket_*.rb`, `core/cookbook_site_streaming_uploader.rb`), mixlib-authentication
  3.0.10 (`signedheaderauth.rb`, `signatureverification.rb`), chef-cli
  (`policyfile/community_cookbook_source.rb`, `policyfile/cookbook_locks.rb`), cookbook-omnifetch
  0.12.2 (`artifactory.rb`), Chef 19.3.14 (`version_class.rb`, `cookbook/metadata.rb`), and
  Supermarket (`config/routes.rb`, `app/models/universe.rb`, `app/models/cookbook.rb`,
  `app/models/cookbook_upload/parameters.rb`, `app/controllers/api/v1/*`, the `api/v1` jbuilder
  views).
- **The live upstream.** supermarket.chef.io sampled directly on 2026-09-27: `/universe` (and
  `/api/v1/universe`) is 7,900,373 bytes of JSON served gzip-encoded, naming 4,074 cookbooks,
  31,345 versions and 56,931 dependency edges, every entry with the one `location_path`
  `https://supermarket.chef.io:443/api/v1`; it carries a weak `ETag`, answers `304` to
  `If-None-Match`, sends `Cache-Control: max-age=0, private, must-revalidate` and no
  `Last-Modified`; 45 names are mixed-case (`SysinternalsBginfo`, `strongSwan-base`) and four
  version keys end in a newline (`flyway` `"0.1.0\n"`). A version document carries
  `tarball_file_size` and a `file` URL and no digest; the download answers `302` to an S3 object
  whose `ETag` is the tarball's MD5 (`apt` 7.5.0: 24,497 bytes, MD5 `91dbd889...`, its
  `metadata.json` naming `apt` `7.5.0`). Name routes match case-insensitively (`APT` answers as
  `apt`), `versions/latest` resolves, and a miss answers `404` with
  `{"error_messages":["Resource does not exist."],"error_code":"NOT_FOUND"}`.
- **Signature verification.** Every captured signed request was re-verified with the Go
  standard library alone (`crypto/rsa.VerifyPKCS1v15`, host Go 1.25.5): protocol 1.0 and 1.1 over
  the raw canonical string with `crypto.Hash(0)`, and each verification failed with the content
  hash altered or with a different key.
- **OSV.** `ecosystems.txt` lists no Chef ecosystem, `Chef/all.zip` answers `404`, the query API
  answers `{"code":3,"message":"invalid ecosystem"}` for `"ecosystem":"Chef"` and nothing for
  `pkg:chef/apt@7.5.0`, and the schema's ecosystem enumeration (`validation/schema.json`) contains
  no Chef entry.

Where the sources and the captures disagree, the captures win. The knife source reads as though
`knife supermarket unshare acme-base/0.9.0` removes a version; it sends
`DELETE /api/v1/cookbooks/acme-base/0.9.0` (captured on both knife versions), a path no Supermarket
route matches, because `unshare` only ever deletes a whole cookbook.

Six things make this format worth a careful spec. **The index is one repository-wide generated
document**: every resolution starts with a `GET /universe` for the whole thing, never
conditional (captured: no `If-None-Match` from any client), which is the write-triggered class
`write-triggered-services-prototype.md` defines, unsigned. **Nothing on the read surface binds
bytes to a coordinate**: no digest exists in the universe or the version document, a tampered
tarball installed silently through Berkshelf and Policyfile, and a tarball of `1.0.0` served as
`1.1.0` through Berkshelf (captured), so the registry is the only place a cookbook's identity is checked.
**Berkshelf unions its sources and takes the highest version**: with this registry first and a
second source holding acme-base 9.9.9, both Berkshelf generations installed 9.9.9 from the
second source (captured), the dependency-confusion shape. **Berkshelf treats its local store as
candidates**, so a rolled-back version stays installed after `berks update` (captured), while
Policyfile's `chef update` adopts the rollback (captured). **Upload is signed with the client's
RSA key** (mixlib-authentication protocol 1.0 for `share`, 1.1 for `unshare`), whose content hash
covers the tarball part only, which `auth.md`'s registry-token model does not express. And
**private reads have exactly one credential form that reaches every URL**: JFrog's
`X-Jfrog-Art-Api` header, which Berkshelf's `artifactory` source and chef-cli's `artifactory`
default source send on every request, downloads included (captured).

## Blocking preconditions

**The handler interface re-open must complete before this handler starts**, as for every
handler (`format-handler-interface.md` AC8). Chef is Tier 3, so the catalogue's Tier 1 gate (its
AC5) and the charter's breadth verdict (its AC9, build step 8) both precede it; the re-open is
recorded here anyway, from this side, because a gate enforced on one side only is enforced
nowhere.

**The shared signing and index service must be `planned` before Phase 1.** The universe is a
write-triggered generated document produced by `docs/internal/plans/foundation/signing-service.md`
(to be authored in the spec loop), which the charter builds at step 7 as the production form of
what the step 4a prototype learned. What this format requires of that service is stated in
Design ("What the signing and index service must provide"), never designed here; nothing is
asked of its signing half, because nothing on this wire is signed.

**`auth.md` must carry two presentation forms before Phase 1's private reads and Phase 2.** The
resolved publish-authentication and private-read decisions below add a registered-public-key
credential verified from Chef's signed headers and the `X-Jfrog-Art-Api` header as a way to
present a registry token. Both are revisions of `auth.md` and of the owed
`foundation/credential-management.md`, raised as sibling consequences, never assumed here. Until
they land, Phase 1 serves anonymously readable repositories only.

**The management API must be `planned` before Phase 3.** Removing a version, removing a cookbook
and deprecating a cookbook are operations of `docs/internal/plans/foundation/management-api.md`
(to be authored in the spec loop), whose core the charter builds at step 2 and completes at step
9; `knife supermarket unshare` and the Supermarket version route are bindings onto them.

**The proxy layer must offer a completion-only fetch with a handler-supplied verifier, and the
upstream adapters a Supermarket adapter, before Phase 4.** A Supermarket tarball carries no digest
on any read surface, so what binds it is a check the handler can compute only over the complete
body (Design, "The proxied path"). The completion-only mode is already requested of
`proxy-cache.md` by `go-modules.md`, `nuget.md` and `conan.md`, the verifier hook by `conan.md`;
this spec adds no new shape to that request. The adapter, which follows the upstream's cross-host
`302` to object storage and revalidates the universe with `If-None-Match`, is requested of
`docs/internal/plans/foundation/upstream-adapters.md` (to be authored in the spec loop; charter
step 4).

Nothing is required of `docs/internal/plans/foundation/async-operations.md` (a share completes
inside its request, captured `201`) or of `docs/internal/plans/foundation/artifact-verification.md`
(the ecosystem has no artifact signature or attestation; charter step 4b is not a dependency).

## Scope

**In scope:**

- The Supermarket API under the format-first mount `/chef/{repository}/`: `GET /universe` and
  `/api/v1/universe`, `GET /api/v1/cookbooks` (list), `GET /api/v1/search`,
  `GET /api/v1/cookbooks/{name}`, `GET /api/v1/cookbooks/{name}/versions/{version}` in its dotted,
  underscored and `latest` forms, `GET .../versions/{version}/download`,
  `POST /api/v1/cookbooks` (share), `DELETE /api/v1/cookbooks/{name}` (unshare) and
  `DELETE /api/v1/cookbooks/{name}/versions/{version}`.
- The universe as a write-triggered, unsigned, repository-wide document regenerated inside every
  write that changes it, stored, restored by a repoint, and merged for a virtual repository.
- Hosted ingest of a shared tarball with its identity taken from the tarball's own
  `metadata.json` and checked against the request, immutability of a version, the retirement of
  deleted versions, and the write-boundary declaration `data-model.md` requires.
- Chef's signed-header authentication for the write routes against registered public keys,
  protocol versions 1.0, 1.1 and 1.3; private reads by a registry token in the `X-Jfrog-Art-Api`
  header or as Basic; the uniform challenge; per-route addressed objects and the pattern-refusal
  case `auth.md` AC8 requires; the rendering of a shared policy refusal.
- Removal of a version and of a cookbook, and deprecation, as bindings onto registry-owned
  management operations.
- The proxied path against supermarket.chef.io or any Supermarket: classification per route, URL
  rewriting, completion-only verification of every tarball against its coordinate, first-fetch
  digest pinning, universe revalidation, negative caching, and this format's rows of the removal
  table.
- Virtual repositories with per-name member-ordered resolution.
- Berkshelf 8.1.23 and 8.0.5, chef-cli 6.1.39 and 5.6.9 (Policyfile) and knife 19.3.2 and 17.10.0
  as the conformance oracles on both paths.

**Out of scope for v1**, each with its reason, recorded because the interface spec's definition
of done requires the deliberately unimplemented surface to be named:

- **The Chef Infra Server API** (Berkshelf's upload command, `knife cookbook upload`, Berkshelf's
  `source :chef_server`, Policyfile's `:chef_server` source, `chef push`). `berks upload` sends
  signed requests to `{chef_server_url}/users/{node}` and `/sandboxes` (captured on both
  Berkshelf versions), the checksum-sandbox protocol of a configuration-management server whose
  cookbook store is one part of an authority over nodes, roles, environments, data bags and
  policy groups. A registry serving that API would be half of a Chef Infra Server with none of
  the authority its cookbook routes answer to, a different product rather than a package
  repository; no registry of the kind this project competes with serves it either.
- **Supermarket's site features**: ratings, followers, collaborators, adoption,
  `contingent` (reverse dependencies), `users/{user}`, `tools`, `metrics`, `health`, the Fieri
  quality metrics and the web UI. No pinned client reads any of them (the capture set shows no
  request outside the in-scope routes), and each is a community-site function over the
  registry's own data rather than part of the resolution or publish contract. `quality_metrics`
  is omitted from version documents, as Supermarket itself omits it when Fieri is off.
- **Location types other than `opscode`** in a served universe (`uri`, `github`, `gitlab`,
  `file_store`, `chef_server`). Supermarket emits only `opscode` (`Universe::CHEF`, and every
  live entry), and the other types send the client to a host other than this registry, which
  would bypass the policy check on the blob read.
- **Private reads through knife** (`knife supermarket download`, `install`, `show`, `search`,
  `list`). knife sends no credential to an absolute byte URL (captured), and the resolved
  private-read decision below keeps absolute URLs; knife reads anonymously readable repositories
  on both paths.
- **A URL-borne download capability** (the resolved private-read decision below). It would make
  the universe per-caller, which defeats it being one generated document.
- **supermarket.chef.io as a preconfigured upstream** (the resolved preconfigured-upstream
  decision below): user-configured in v1, for sequencing.

## Design

### The wire surface, as captured

Every path hangs off the repository URL the client is given, `https://{host}/chef/{repository}`,
format-first per `format-handler-interface.md`'s resolved URL-shape decision. Berkshelf and
Policyfile append `/universe`; knife appends `/api/v1/...`; every client uses absolute URLs it
finds in documents as given. `{version}` in a path arrives in two spellings, `1_1_0` (Berkshelf's
`CommunityREST#find` and knife's explicit-version download, which replace dots with underscores)
and `1.1.0` (download URLs, and knife following `latest_version`).

| Surface | Shape, as the pinned clients send it |
|---|---|
| Universe | `GET /universe`, `Accept: application/json`, no conditional headers, at the start of every Berkshelf resolution not satisfied by its lockfile and store, and every Policyfile `install` without a lock or `update`; answered `{name: {version: {"location_type": "opscode", "location_path": "{base}/api/v1", "download_url": "{base}/api/v1/cookbooks/{name}/versions/{version}/download", "dependencies": {name: constraint}}}}`. Supermarket also serves it at `/api/v1/universe` |
| Version document | Berkshelf: `GET {location_path}/cookbooks/{name}/versions/{1_1_0}` for each installed cookbook, then the absolute `file` URL it names. knife: the same route with `1_0_0` for an explicit version, or `latest_version`'s dotted URL. Answered with `license`, `tarball_file_size`, `version`, `published_at`, `average_rating`, `cookbook`, `file`, `supports` and `dependencies` |
| Download | `GET .../versions/{version}/download`: Berkshelf and knife from `file`, Policyfile straight from the universe's `download_url` (it never reads a version document, captured). Supermarket answers `302` to object storage; all three clients accept a direct `200` with the tarball (captured on both generations) |
| Cookbook document | `GET /api/v1/cookbooks/{name}` from knife (`download` without a version, `show`, `install`, and `share` without a category): `name`, `maintainer`, `description`, `category`, `latest_version` (an absolute version-document URL), `versions` (absolute URLs, newest first), `deprecated`, `replacement` and the site fields |
| Search and list | `GET /api/v1/search?q={q}&items=9999999&start=0` and `GET /api/v1/cookbooks?items=9999999&start=0`, answered `{"start", "total", "items": [{"cookbook_name", "cookbook_maintainer", "cookbook_description", "cookbook"}]}` |
| Share | `POST /api/v1/cookbooks`, `multipart/form-data` with the `tarball` part first (`filename="{name}.tgz"`, a gzip tar holding `{name}/metadata.json`, which knife generates) and a `cookbook` part `{"category": "..."}`; signed (below); answered `201` with `{"uri": ...}`. Without a category argument knife first reads the cookbook document anonymously and uses its category, `Other` on a `404` |
| Unshare | `DELETE /api/v1/cookbooks/{name}` from `knife supermarket unshare`, signed through `Chef::ServerAPI` with `X-Ops-Server-Api-Version: 2`; whatever follows the name on the command line is pasted into the path |
| Version removal | `DELETE /api/v1/cookbooks/{name}/versions/{version}`, a Supermarket route no knife command reaches |
| Error rendering | knife `share` prints `error_messages[0]` of a JSON body for any status (a `409` printed "acme-app (1.0.0) already exists...", a `401` "Authentication failed due to an invalid signature.", a `403` "refused by policy P"), and a `text/plain` body makes it fail with a JSON "lexical error". knife `unshare` prints "Forbidden: You must be the maintainer..." on `403` and "Failed to authenticate to {chef_server_url} as {node} with key ..." on `401`. knife downloads print "You authenticated successfully to {chef_server_url} ... but you are not authorized" on `403` and no body. Berkshelf and Policyfile renderings are under "Four client behaviours" |

Every request carries `X-Chef-Version`; Berkshelf's and knife's also carry `X-Remote-Request-Id`
(Policyfile's do not), with `User-Agent: Chef Client/{version} (...)` or
`Cinc Client Knife/{version} (...)`, except the share, which `Chef::HTTP::BasicClient` sends as
`User-Agent: Ruby` (all captured).

**The two generations agree on the wire.** Every route, path spelling, header set, signing
protocol version and status handling above was identical on 26.2.4 and 22.12.1024 apart from the
version strings; the one divergence found is client-side, in the Berksfile DSL (the `artifactory`
source below).

### Four client behaviours that decide the design

**Nothing downloaded is checked.** Berkshelf's `Downloader#try_download` and knife's download
stream the tarball and unpack it; there is no digest to check against, and a tarball with a
malicious recipe served as acme-base 1.1.0 installed on both Berkshelf generations and on both
chef-cli versions, and on both Berkshelf generations the `1.0.0` tarball served as `1.1.0` was
stored as acme-base-1.1.0 with `"version": "1.0.0"` inside (captured). Policyfile records a content `identifier` per cookbook in
`Policyfile.lock.json` and checks it only when a lock is later exported or pushed
(`CookbookLocks#refresh!`: `chef export` failed with `CachedCookbookModified` after a tampered
re-download, captured), never at `install`, and never on the first resolution, which trusts what
it is served. This registry is therefore where a cookbook's name, version and bytes are bound.

**Berkshelf unions every source and prefers the highest version.** `Resolver::Graph#populate`
merges every source's universe (`cookbooks |= source.universe`) and the solver picks the highest
version satisfying the constraints; `Berksfile#source_for` then takes the first source listing
that exact version. A higher version of a private name on any configured source wins (captured:
acme-base 9.9.9 from the second stub over 1.1.0 from the first, both generations). Policyfile
refuses the same configuration outright ("Source ... and ... contain conflicting cookbooks",
naming `preferred_for` as the fix, captured). The design's answer is a virtual repository as the
client's only source (Design, "Virtual repositories").

**Berkshelf keeps what its store holds.** `Resolver::Graph#populate_store` adds every cookbook in
`~/.berkshelf/cookbooks` to the solver before any universe, so after the universe dropped
acme-base 1.1.0, `berks update` on a warm client still printed "Using acme-base (1.1.0)" and
locked it, on both generations, while a cold client resolved 1.0.0 (captured). A warm install
with a trusted lockfile sends no request at all (captured). Policyfile's `chef update` against the
same universe installed 1.0.0 (captured on both chef-cli versions).

**Where each client falls through, and where it stops.** Berkshelf fetches every source's
universe and treats any failure of one as a warning ("Error retrieving universe from source",
then `BadResponse` for `401` and `403`, `ServiceNotFound` for `404`, and `ServiceUnavailable`
after five retries with backoff for `500`), resolving from the others (captured for all four on 8.1.23, and for `401` on 8.0.5).
A `404` on a version document is `CookbookNotFound`, and the downloader moves to the next source
listing the same version (captured: the second stub served it); a `403` on a version document
halts with "An unexpected error occurred retrieving 'acme-base' (1.1.0) from the cookbook site"
(exit 123), and a `403` on the download halts with `Net::HTTPClientException 403 "Forbidden"` (exit
47), without the body (captured on both generations; a `404` there halted the same way on
8.1.23). Policyfile halts on a failed universe ("HTTP 401 Unauthorized: {body}") and on a
failed download, printing the status and the body verbatim (captured). knife has one site and no
fall-through. The consequences threaded through this design: a policy refusal is `403` at the
version document and the download, and the universe keeps listing the refused version so a
resolver reaches the refusal instead of another source's copy; the existence rule's `404` is a
fall-through to whatever else a Berkshelf user configured, stated in the operator documentation.

### What the registry verifies

Supermarket's own upload validation (`CookbookUpload::Parameters`) is the ingest contract, and
this registry applies it plus the checks it lacks, on hosted ingest and, where the check is
meaningful, on every proxied fetch:

1. The tarball is gzip-compressed tar, and no entry is absolute, climbs with `..`, or is a link
   pointing outside the archive.
2. Exactly one `{name}/metadata.json` (optionally `./`-prefixed) exists, parses as JSON, and
   carries `name` and `version`; a `{name}/README` (any extension, any case) exists and is
   non-empty (Supermarket's `missing_readme`).
3. `name` matches Supermarket's grammar `\A[\w_-]+\z` and `version` is canonical
   `\d+\.\d+\.\d+`. Chef's own parser (`Chef::Version#parse`) also accepts `x.y` as `x.y.0` and,
   through Ruby's line anchors, a trailing newline; knife's generated `metadata.json` always
   writes the canonical form (`Metadata#version` renders `Chef::Version#to_s`), so anything else
   is refused on ingest rather than stored under a spelling a second client normalises
   differently.
4. On a share, the tarball part's filename is `{name}.tgz` for that `name`, case-insensitively
   (knife names it so, captured), so the addressed object read before the body agrees with the
   identity read from it.
5. On a proxied fetch, the tarball's size equals the version document's `tarball_file_size`, its
   `metadata.json` names the requested cookbook and version, and, once a coordinate's bytes have
   been committed, a later fetch of it (after eviction) produces the same CAS digest.

Rules 1 to 3 on the proxied path are the identity rule 5 needs; an upstream tarball failing them
is an integrity failure, never a stored oddity.

### Mapping onto the shared model

The levels are exactly those `data-model.md` provides; no table is added.

- **`Package.name` is the lowercased cookbook name.** Supermarket keeps names unique
  case-insensitively (`Cookbook` validates `uniqueness: { case_sensitive: false }` and matches
  `lowercase_name`), and Berkshelf compares universe names exactly, so the **spelling** a cookbook
  was first published under is kept in the package-level document and rendered in the universe
  and every document, while every route matches case-insensitively (the resolved name-spelling
  decision below). The package-level document also holds the category, `deprecated` and its
  `replacement`, and the **retirement set** of deleted versions.
- **`Version.version` is the canonical `x.y.z`.** The version-level document holds the parsed
  `metadata.json` fields the documents render (`dependencies` with any self-dependency removed,
  as `Universe.generate` and the upload path both do; `platforms` as `supports`; `license`;
  `maintainer`; `description`), the tarball size, and the publish time served as `published_at`.
- **One `File` per version**, `{name}-{version}.tgz`, whose `Blob` is keyed by the CAS digest of
  the tarball exactly as shared; the tarball is served byte for byte.
- **The repository-level document holds the generated universe** in its stored, URL-free form
  (below).

The cookbook, version, search and list documents are rendered on request from the package-level
and version-level documents through the pointer; only the universe is generated and stored,
because it is the one document whose cost is repository-wide.

### The universe: a write-triggered generated document

Per the resolved universe decision below, the universe is **stored, never rendered from the
version records on request**, and it is **stored without URLs**:

- The stored form is `{spelling: {version: {"dependencies": {...}}}}`, with names in byte order of
  their lowercased form and versions in Chef version order, produced inside the write that
  changes it: a share, a version removal, a cookbook removal. Deprecation does not touch it.
- On a request the handler streams the stored document and inserts, into each entry,
  `"location_type": "opscode"`, `"location_path": "{base}/api/v1"` and
  `"download_url": "{base}/api/v1/cookbooks/{spelling}/versions/{version}/download"` under the
  externally visible base URL of the repository, the dependency `composer.md` and `npm.md` already
  have. The URLs are absolute because Policyfile resolves a relative `download_url` into a
  `NoMethodError` and knife resolves a relative `file` against its `chef_server_url` (both
  captured), and the insertion is a linear stream transform with no per-entry lookup.
- It is served `Content-Type: application/json; charset=utf-8`, gzip-encoded when the client
  accepts it (every capture sent `Accept-Encoding: gzip`), with a strong `ETag` derived from the
  stored bytes and the base URL, so an unchanged repository serves identical bytes and the same
  `ETag` across snapshots, and a conditional request answers `304` although no pinned client sends
  one.
- A repoint restores it, since it lives in the snapshot delta at the repository level; a
  rollback therefore serves exactly the universe of the snapshot it targets (Design, "Rollback and
  promotion").

**What the signing and index service must provide.** Stated so the dependency on
`docs/internal/plans/foundation/signing-service.md` (to be authored in the spec loop) cannot be
lost, and precisely enough that the service can be specced against it:

1. **Unsigned generation** of the stored universe from the version-level records of every current
   version in the repository, in the ordering above; nothing is signed and the service's signing
   half is not used.
2. **Regeneration inside the triggering write**, landing in the same completed logical write and
   the same snapshot, so no snapshot serves a universe naming a version whose tarball it does not
   hold (`data-model.md`'s one-write-one-snapshot rule; the prototype's question 3), under the
   revision-token retry `data-model.md` makes mandatory, so two concurrent shares both land.
3. **Incremental cost**: a write touching one cookbook reworks that cookbook's entries and copies
   the rest by stream, so a share into a Supermarket-sized repository (31,345 versions) does not
   re-read every version record (AC19 holds the budget).
4. **Storage as CAS-backed metadata above the inline threshold** (the fourth mark root,
   `storage-and-gc.md` AC16), since a hosted universe reaches megabytes and a proxied one is eight.
5. **The virtual merge**, per name in member order (below), re-run when a member's universe
   changes.
6. **The same generation on the proxied path** from the records parsed out of an upstream
   universe, so hosted, proxied and virtual repositories share one generator and one stored form.

### The publish path and what counts as a write

`knife supermarket share` is a real client command, so this format is in npm's and Cargo's
category in `docs/internal/analysis/management-surfaces-and-the-oracle.md` for publish and cookbook
removal: trigger and effect are both oracle-testable. Version removal and deprecation have no
client trigger (Supermarket does them in its web UI) and are driven through the management API
only. `data-model.md` requires each format spec to declare its write boundaries:

- **A share is one completed logical write**: one `POST`, one snapshot holding the new version,
  its tarball and the regenerated universe. It is synchronous, so no `Operation` is recorded.
- **A refused share writes nothing**: authentication failure (`401`), missing authorization
  (`403`, or `404` for a pattern refusal), invalid tarball (`400`), existing or retired version
  (`409`), policy refusal (`403`). Every refusal carries Supermarket's error body
  `{"error_code": ..., "error_messages": [...]}` as `application/json`, because knife prints
  `error_messages[0]` and fails on anything else (captured).
- **A version is immutable, and a deleted version is retired** (the resolved re-share decision
  below): a share of a version that exists answers `409` with Supermarket's wording, whatever its
  bytes, and so does a share of a version in the retirement set. Identical re-shares cannot be made
  idempotent here, because knife rebuilds the tarball on every share and the bytes differ each time
  (captured: two shares of the same `acme-app` 1.0.0 had different content hashes).
- **A cookbook keeps its first spelling**: a share whose `metadata.json` name matches an existing
  cookbook case-insensitively but not byte for byte answers `409` naming the stored spelling (the
  resolved name-spelling decision below).
- **Each removal and each deprecation change is one write** (below). A proxied repository creates
  no snapshots: arrival and revalidation are cache materialisation.

Two concurrent shares of different cookbooks, or different versions of one, each read-modify-write
the universe through the revision-token retry and both land; two concurrent shares of the same
version produce one `201` and one `409`.

### Removes and deprecation are bindings

Per the cross-format precedent (`pypi.md`, `npm.md`, `cargo.md`, `conan.md`), each is an operation
of the registry-owned management API, `docs/internal/plans/foundation/management-api.md` (to be
authored in the spec loop), and the wire routes are **bindings onto the same operations**:

| Operation | Client binding | Effect a client sees | Action |
|---|---|---|---|
| Remove a cookbook | `DELETE /api/v1/cookbooks/{name}` from `knife supermarket unshare {name}` | The name leaves the universe and its documents answer `404`; every version enters the retirement set | `delete` |
| Remove a version | `DELETE /api/v1/cookbooks/{name}/versions/{version}` (Supermarket route, `curl`) | The version leaves the universe and the cookbook's `versions`; it enters the retirement set | `delete` |
| Deprecate or undeprecate a cookbook, with an optional replacement | none | The cookbook document's `deprecated` and `replacement`, which knife's download reports | `push` |

Rules, applying the precedent rather than re-deciding it: each operation is one completed logical
write, exactly one snapshot, none for a refused one, and no blob-store object deleted directly
(`storage-and-gc.md` AC15); authorization is the settled `(repository, action)` vocabulary with no
new action; hosted only, a proxied or virtual repository answering `405`; a removal of something
absent answers `404`, which knife reports as "The object you are looking for could not be found"
(captured); removing a cookbook's last version is allowed and leaves the `Package` row and its
retirement set (`data-model.md` AC33), where Supermarket refuses it with `409`, a divergence on the
exception list. What this format requires of `management-api.md`: the three operations on the
object `{name}`, the version as an argument where it applies, the retirement set carried forward
by every later write and preserved across a backwards repoint, and identical semantics and
authorization from either entry point.

### Authentication: signed writes and a header for private reads

The client table in `auth.md` has no Chef row, and neither of the two things Chef clients send is
one of the verifier's four presentation forms. This section reconciles them explicitly, per the
two resolved decisions below, and the reconciliation is a revision request to `auth.md`, not a
per-handler exception: every check below runs in the shared authentication layer.

**Writes: Chef's signed-header requests against registered public keys.** knife signs `share`
and `unshare` with the RSA private key named by `client_key`, as the user named by `node_name`
(captured headers: `X-Ops-Sign: algorithm=sha1;version=1.0;` on share and `version=1.1;` on
unshare on both knife versions, `X-Ops-Userid`, `X-Ops-Timestamp`, `X-Ops-Content-Hash` and the
signature split across `X-Ops-Authorization-1` to `-6`). There is no field in which a bearer token
could travel. So:

- **A principal registers an RSA public key** as a credential, through the credential surface
  `auth.md` assigns to `foundation/credential-management.md`. The registry never sees a private
  key, and what it stores, a public key, is not a secret, so `auth.md`'s "never stored
  recoverable" rule holds by construction. The key has a non-secret **key name**, unique on the
  instance, which the user sets as knife's `node_name` and which arrives as `X-Ops-Userid`. It
  carries scopes exactly as a registry token does: bound to one repository unless the
  multi-repository opt-in was used, never exceeding its owner's grants, expiring by default,
  revocable on the next request.
- **Verification uses the standard library only.** For protocols 1.0 and 1.1 the signature is a
  PKCS #1 v1.5 signature over the raw canonical string (mixlib's `private_encrypt`), verified by
  `rsa.VerifyPKCS1v15` with `crypto.Hash(0)`; for 1.3 it is PKCS #1 v1.5 over the SHA-256 of the
  canonical string. The canonical string is mixlib-authentication's
  (`SignedHeaderAuth#canonicalize_request`): method, the SHA-1 of the canonical path (repeated
  slashes collapsed, any trailing slash removed) in 1.0 and 1.1 or that path itself in 1.3, the content
  hash, the timestamp and the user id (SHA-1-hashed in 1.1), plus the sign description and
  `X-Ops-Server-Api-Version` in 1.3. Every captured request verified this way and failed when
  altered (Context). Building a canonical string is request parsing, not a cryptographic
  primitive, so `auth.md` AC9 holds; it is the ecosystem's published scheme, not one this registry
  designs, so "Nothing is invented" holds; and the canonicalisation joins the scope of `auth.md`
  AC10's external review.
- **The checks, all before anything is written:** the sign description is one of `sha1;1.0`,
  `sha1;1.1` or `sha256;1.3`; the timestamp is within 15 minutes of the server clock
  (mixlib's `authenticate_request` default); the key name resolves to an unexpired, unrevoked key;
  the signature verifies over the canonical string; and the content hash equals the digest of the
  request's file part for a multipart request (mixlib's `hashed_body` rule, which the capture
  confirms: `X-Ops-Content-Hash` equalled the SHA-1 of the tarball part, not of the whole body)
  and of the whole body otherwise. The signature and timestamp are checked when the headers
  arrive; the content hash is known only at the end of the tarball part, so it is checked there,
  and a mismatch aborts the write before commit, exactly as a failed digest does on an upload.
  Every failure answers `401` with Supermarket's `AUTHENTICATION_FAILED` body.
- **The accepted costs**, named rather than discovered: protocols 1.0 and 1.1 hash with SHA-1,
  and knife uses them for share and unshare on both generations, so refusing them refuses the
  client; the signature binds the tarball and not the `cookbook` category part, which is display
  metadata only; it binds the path, not the host; and a captured request can be replayed within
  the 15-minute window, which the TLS requirement below bounds, and which buys an attacker a `409`
  for a share and a `404` for an already-executed unshare.
- **TLS** is required on this path as on every credential-bearing path, and a signed request over
  plaintext is refused unless the operator's flag is set (`auth.md` AC27), with the signed
  headers treated as credential material by the redaction rule (`auth.md` AC7). The harness
  injects its CA through knife's `trusted_certs_dir` and Berkshelf's `ssl.ca_file`; that injection
  was not exercised in this pass and is confirmed when the auth cases are written.

**Reads: a registry token in `X-Jfrog-Art-Api`, or as Basic.** A private repository's reads need a
credential on the universe, the version document and the download. Captured, per client:

| Client configuration | What reaches the registry |
|---|---|
| Berkshelf `source "https://u:{token}@host/chef/repo"` | `Authorization: Basic` on the universe only; the version document and download URLs come from the universe without userinfo and go out bare |
| Berkshelf `source({ artifactory: "https://host/chef/repo", api_key: ... })`, or with `ARTIFACTORY_API_KEY` set | `X-Jfrog-Art-Api: {token}` on the universe, every version document and every download, including a followed redirect |
| Policyfile `default_source :artifactory, "https://host/chef/repo"` with `ARTIFACTORY_API_KEY` | `X-Jfrog-Art-Api: {token}` on the universe and every download |
| Policyfile `default_source :supermarket` with userinfo | Basic on the universe only |
| knife `-m https://u:{token}@host/chef/repo` | Basic on the cookbook and version documents; the download URL goes out bare |

Per the resolved private-read decision below, **the central verifier accepts a registry token in
the `X-Jfrog-Art-Api` header** as a fifth presentation form, resolving to the same principal and
scopes as the other four, and accepts Basic wherever a client sends it. The documented recipe for
a private repository is the `artifactory` source type on Berkshelf and Policyfile, with the token
in `ARTIFACTORY_API_KEY`. On Berkshelf 8.1.23 the unbraced DSL form `source artifactory: "..."`
fails to parse under Ruby 3.4 ("wrong number of arguments (given 0, expected 1)", captured), while
the braced form works on both generations, so the recipe uses braces. The header's name is
JFrog's; it is served because it is the only form the clients send to every URL, and the operator
documentation says so.

**The challenge and the existence rule**, applying `auth.md` as written:

- A credential-less request to a repository that is not anonymously readable answers `401` with
  Supermarket's JSON error body, byte-identical for a private and a missing repository (`auth.md`
  AC17). Berkshelf then warns and resolves from its other sources (captured), or with this as its
  only source prints "Unable to find a solution" (captured); Policyfile prints the status and body
  and stops.
- A rejected token or signature answers `401` and is never served as anonymous (`auth.md` AC12).
- A valid credential lacking `pull` answers `404` (the existence rule), which Berkshelf treats as
  a source without the cookbook.
- A share needs `push` and an unshare `delete`; knife's category lookup before an uncategorised
  share is anonymous (`noauth_rest`, captured), so on a private repository it gets `401` and knife
  stops ("Unable to reach Supermarket"). The operator documentation therefore gives the category
  on the command line, which skips the lookup (captured: a share with a category sent only the
  `POST`).

### Addressed objects and pattern scopes

`auth.md`'s pattern scopes narrow a credential within one repository by matching the object each
request addresses, and the format declares which object each route reports
(`format-handler-interface.md` AC12). Per the resolved addressed-object decision below, the
canonical object is the **lowercased cookbook name**, so every route under a cookbook reports it,
whatever version it goes on to name:

| Route | Action | Object kind | Canonical object |
|---|---|---|---|
| `/universe`, `/api/v1/universe` | `pull` | none | - (enumerates every name) |
| `/api/v1/cookbooks` (list), `/api/v1/search` | `pull` | none | - |
| `GET /api/v1/cookbooks/{name}` | `pull` | named | `{name}` lowercased |
| `GET .../versions/{version}`, `GET .../versions/{version}/download` | `pull` | named | `{name}` lowercased |
| `POST /api/v1/cookbooks` | `push` | named | the tarball part's filename without `.tgz`, lowercased, read before the tarball bytes; the ingest rule 4 refuses a tarball whose `metadata.json` disagrees |
| `DELETE /api/v1/cookbooks/{name}` and `.../versions/{version}` | `delete` | named | `{name}` lowercased |

What that gives and costs, applying `auth.md`'s rules rather than re-deciding them:

- **A patterned `pull` cannot resolve anything**, because both resolvers start at the universe,
  whose object is none (the same consequence `cargo.md` and `conan.md` accepted for their
  discovery routes). The working recipe is an **unpatterned `pull` beside a patterned `push` and
  `delete`**: `acme-*` shares and unshares `acme-tool` and nothing else. A patterned `pull` reads
  in-pattern documents and tarballs through `curl`.
- **A pattern refusal is answered as absence**, `404` with the not-found body, indistinguishable
  from a cookbook that does not exist, so a pattern is never an oracle over names outside it. On a
  version document Berkshelf then moves to its next source; on a share knife prints the message
  and fails; on an unshare it prints "could not be found".
- The multipart part order is the client's (the `tarball` part first, captured), and a share
  whose first part is not the tarball is refused `400` before any authorization decision, so the
  object is never guessed.

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines, on a
version document or a download of either path, the handler answers `403` with
`{"error_code": "FORBIDDEN", "error_messages": ["{policy and rule, or the signal}"]}` as
`application/json`. `403` rather than the existence rule's `404`, because the caller is authorized
and the content is what is refused, and on this format the difference decides whether the client
goes elsewhere: a `404` on the version document sent Berkshelf to a second source holding the
same version (captured), while a `403` halted it on both generations even with that source
configured, with no request to it for that version (captured), and halted Policyfile. Per the
resolved policy-refusal decision below, **the universe keeps listing a refused version**, so a
resolver that selects it reaches the refusal rather than silently taking a lower version or
another source's copy; search and listings keep naming it too (the no-elision precedent
`conda.md`, `debian.md` and `conan.md` set). What the user sees differs by client: Policyfile
prints the body ("HTTP 403 Forbidden: refused by policy P: rule licence-deny", captured), Berkshelf
prints a generic failure without it, and knife a misleading authorization message without it
(captured); the operator documentation explains the last two. A policy refusal at share time
(a byte-dependent rule at ingest) uses the same body, which knife prints (captured).

### Rollback and promotion

A pointer repoint restores the stored universe with the snapshot, so a rolled-back environment
serves exactly the universe, documents and tarballs of the snapshot it targets, and a promoted one
serves the same records and tarballs as its source, with URLs under its own base. There is no
timestamp or serial in any Chef document, so nothing about the served bytes has to be bent to make
a rollback visible, unlike `conan.md`'s revision times or `debian.md`'s envelope. Whether the
client **adopts** it is the client's:

- Policyfile's `chef update` resolves the restored version (captured), and so does any Berkshelf
  resolution from a cold store (captured).
- A warm Berkshelf keeps a version its store holds whatever the universe says, because the store
  is a solver input (Design, "Four client behaviours"). No server response can change that. The
  operator documentation gives the two client-side remedies: a constraint in the Berksfile
  (`cookbook "{name}", "= {version}"`), or removing the store entry
  (`~/.berkshelf/cookbooks/{name}-{version}`) before `berks update`. AC15 asserts both work.

**The proxied analogue**: when an upstream removes its newest version, the next revalidation
drops it from the proxied universe (the removal table below), cold clients resolve the previous
version, and warm Berkshelf clients keep theirs exactly as they would against the upstream
directly.

### Names, versions and other traps

- **Names match case-insensitively on every route** (Supermarket's `Cookbook.with_name`; `APT`
  answered as `apt` live), while the universe and documents carry the stored spelling, because
  Berkshelf compares a Berksfile's `cookbook "strongSwan-base"` to universe keys exactly.
- **Version segments** are canonical `x.y.z` in dotted or underscored spelling, or `latest` on the
  version-document route (Supermarket's `VERSION_PATTERN` is `latest|([0-9_\-\.]+)`); anything else,
  including `1.0` for `1.0.0` and a traversal segment, answers `404` before any lookup.
- **Pagination is honoured as requested.** Both knife versions request `items=9999999`; knife's
  search, and knife 17.10.0's list, advance by the requested count rather than the returned one
  (`search_cookbook`, `get_cookbook_list`), so a server cap silently truncates their output (only
  knife 19.3.2's list pages correctly). Supermarket caps a page at 100 (`API_ITEM_LIMIT`); this
  registry returns every match the request asks for, streamed, a divergence on the exception list.
- **The download is served, never redirected.** Supermarket answers `302` to object storage; this
  registry answers `200` with the tarball, `Content-Type: application/gzip`, because a handler
  never opens storage directly and a presigned URL would bypass the policy-enforcing blob read
  (`terraform.md`'s finding), and because every pinned client accepts a direct answer (captured).
- **Every JSON answer is `application/json; charset=utf-8`** and every error body Supermarket's
  JSON shape, because knife's share fails on anything else (captured).
- **The self-dependency is dropped** from `dependencies` everywhere, as `Universe.generate` and
  Supermarket's upload both do.

### Signing, provenance and policy

A Supermarket signs nothing and serves no signed document; Chef clients verify no signature on a
cookbook. The universe is write-triggered and generated but unsigned, so only the generation half
of the shared signing and index service is involved, and
`docs/internal/plans/foundation/artifact-verification.md` (to be authored in the spec loop) has no
Chef scheme to verify: nothing is required of it. Policyfile's lock `identifier` is a
client-computed content hash the registry neither produces nor sees.

**Advisory coverage is absent.** OSV has no Chef ecosystem (Context), so the policy engine's
coordinate-level matching finds nothing for a Chef coordinate, an advisory-dependent rule attached
to a Chef repository is refused at configuration as `supply-chain-policy.md` requires of an
ecosystem the feed does not cover, and the feed channel of the shared security-signal rule never
condemns a Chef coordinate. What remains is the byte-level cataloguer, which sees Ruby source and
whatever files a cookbook vendors, and licence rules, which depend on its coverage of a cookbook
tarball and are refused at configuration where it has none; the operator documentation says so,
and the consequence is listed for `supply-chain-policy.md`.

### The proxied path

The handler owns the request and classifies for the proxy layer's fetch-and-cache API per the
settled decisions in `proxy-cache.md`. The upstream is a Supermarket base URL
(`https://supermarket.chef.io`, or any Supermarket or Supermarket-compatible repository),
validated at configuration by fetching `/api/v1/cookbooks?items=1` and requiring a JSON body with
`total` and `items`. An upstream credential, where the upstream needs one, is presented by the
adapter, and the client's credential is never forwarded.

| Route | Classification |
|---|---|
| `/universe` | Mutable metadata with a TTL, revalidated with `If-None-Match` (the upstream answers `304`, captured), parsed into records and regenerated into the stored form by the shared service |
| Cookbook document, version document, search, list | Mutable metadata with a TTL, fetched from the upstream and rendered with this registry's URLs |
| Download | An immutable artifact: fetched through the upstream's `302` to object storage by the adapter, verified before commit (below), cached indefinitely, served `200` |
| Share, unshare, version removal | `405` |

**URL rewriting is mandatory.** Every upstream URL (`location_path`, `download_url`,
`latest_version`, `versions`, `file`, `cookbook`) names the upstream, and a client given the
upstream's universe verbatim through this registry fetched the version document and tarball from
supermarket.chef.io directly (captured: the stub saw only `/universe`). Rewriting happens where
the stored form is expanded, so no upstream URL survives into any served document.

**Verification before commit.** No upstream document carries a digest, so the fetch uses the
completion-only mode with a handler-supplied verifier (Blocking preconditions): the verifier
checks the size against the version document's `tarball_file_size` as the body streams, and at the
end of the body unpacks the tar index to apply ingest rules 1 to 3 and check that `metadata.json`
names the requested cookbook and version. Nothing is committed unless it passes; the initiating
client's connection is aborted before its final bytes on a failure, and coalesced waiters receive
bytes only from the CAS after the verified commit, as the settled waiter rule requires. The
captured version swap is therefore never delivered through this registry (AC22). **The first
verified fetch pins the coordinate**: its CAS digest is recorded on the `File`, and a refetch after
eviction producing a different digest is an integrity failure, so one coordinate serves one set of
bytes for its life here even though the upstream promises nothing. What this cannot catch is the
captured tamper that keeps the name and version: with no upstream digest there is nothing to catch
it against on first fetch, which is stated as the ecosystem's limit rather than assumed away.

**Upstream records that cannot be served.** A universe version key that is not canonical `x.y.z`
(the four live keys ending in a newline) is left out of the proxied universe with a divergence
recorded, because no path this registry serves carries a newline in a segment; whether those four
install from supermarket.chef.io directly was not tested. Mixed-case names are kept byte for byte.

- **Missing cookbooks and versions are negatively cached** with the short TTL: the upstream answers
  `404` with its JSON body; a `429` or `5xx` is never cached as absence (`proxy-cache.md` AC9).
- **The upstream universe is large**: 7.9 MB decompressed, fetched only when its TTL has lapsed and
  then usually answered `304`, and stored as CAS-backed metadata.

Upstream removal maps onto the settled purge-or-flag table as Chef's side of that contract:

| Upstream event, as observed at revalidation | Classification |
|---|---|
| A new version, or a changed dependency set or deprecation | An **ordinary metadata change**, propagated at the next revalidation |
| A version vanishes from the upstream universe, or its version document answers `404` | Drop it from the proxied universe and documents; keep serving the cached tarball to a request for that coordinate; record an operator-visible divergence. The wire carries no reason |
| The cookbook answers `404` where it previously existed | Keep serving cached content by coordinate, drop it from the proxied universe, record a divergence |
| A refetched tarball's digest differs from the pinned one, its size differs from `tarball_file_size`, or its `metadata.json` names another coordinate | An **integrity failure at fetch**: never committed, `proxy-cache.md`'s serve-stale rules apply to metadata, and the operator is alerted |

Detection happens at revalidation, passively, per `proxy-cache.md`'s resolved passive-detection
decision (was Q12). **No row is an explicit security signal**: the Supermarket wire has none, and
with no OSV data the advisory feed has none either, so nothing condemns a Chef coordinate under the
shared security-signal rule; this is stated as a coverage gap.

### Virtual repositories

A virtual repository of format `chef` is possible, where `hex.md` found one impossible, because no
Chef document is signed or names a repository identity: the only repository-specific content is
the URLs, which this registry renders anyway. Per the resolved virtual-repository decision below,
resolution is **per cookbook name, in member order**:

- **The universe lists, for each name, the entries of the first member holding that name**, and
  nothing from later members under that name, whatever versions they hold. A hosted member placed
  before a remote one therefore shadows the upstream's cookbook of the same name entirely, so the
  captured confusion (a higher upstream version winning Berkshelf's union) cannot occur for a
  client whose only source is the virtual repository.
- **Cookbook documents, version documents and downloads** resolve in the member that supplied the
  name, so a version document never mixes members.
- **Search and list** are the union by name, first member wins.
- A virtual repository creates no snapshots: its universe is re-merged by the shared service when
  a member's changes, and shares and removes against it answer `405`.

The accepted cost: a private cookbook shadows every upstream version of that name, including ones
the private repository never published, so a team that wants both must rename; the operator
documentation states it beside the recipe.

### Conformance, the clients and the corpus

Three clients, each on two generations from the two pinned images: Berkshelf 8.1.23 and 8.0.5,
chef-cli 6.1.39 and 5.6.9 through `cinc install` and `cinc update`, and knife 19.3.2 and 17.10.0.
The catalogue counts one ecosystem and no multiplier row, and all three appear in the matrix's
Client column under the Chef row. Every hosted and proxied read case runs on all six; share and
unshare cases run on both knife versions. Each image is pinned by its digest in the case.

Four assertion traps are recorded where the cases are written. **The client store hides the
registry**: a warm Berkshelf with a lockfile sends nothing, and a warm store answers resolutions
from itself, so every case that proves a registry behaviour starts from a fresh `HOME` or asserts
the store it seeded. **The exit code hides fall-through**: Berkshelf succeeds from a second source
after this registry refused, so every refusal case either configures this registry as the only
source or asserts at the network layer. **Berkshelf retries a `5xx` for about 100 seconds**
(five retries with backoff, captured), so an injected `5xx` case budgets for it. **Knife reads the
signing key and a `chef_server_url` from its configuration even for Supermarket commands**, so the
case `script` writes `node_name`, `client_key` and a `chef_server_url` into `~/.cinc/config.rb`.

The recorded surface for the replay corpus, named now because a thin recording script yields a
thin specification: against supermarket.chef.io, a cold Berkshelf install, a Policyfile install,
knife `download`, `show`, `search` and `list`, a conditional universe fetch, a missing cookbook and
a missing version; against the reference Supermarket, installed from its omnibus package pinned by
version with a user and public key seeded through `rails runner` (since its OAuth sign-in needs a
Chef Infra Server), a share with and without a category, a duplicate share, an unshare, a version
removal and a signature refused. Recording gates on the harness's redaction criterion
(`conformance-harness.md` AC13); `X-Ops-Authorization-*`, `X-Ops-Content-Hash`, `X-Jfrog-Art-Api`,
Basic values, `X-Remote-Request-Id` and the Supermarket session cookies are what the allowlist must
name. Every deliberate divergence from the reference Supermarket goes on the recorded exception
list before its flow is expected to replay: the direct `200` download, uncapped pagination,
refusal of a respelled share, retirement of deleted versions, removal of a cookbook's last version,
the stored spelling kept, the `X-Jfrog-Art-Api` read form, and `quality_metrics` absent.

`Capabilities()` declares proxy support and the reference implementation `available`
(`format-handler-interface.md` AC13), the implementation being the omnibus Supermarket above.

## Acceptance Criteria

- [ ] AC1: From a fresh `HOME`, `berks install` on Berkshelf 8.1.23 and 8.0.5 with a Berksfile
      whose only source is `https://{host}/chef/{repository}` resolves a cookbook and its
      dependency from a hosted repository with the highest version satisfying the constraint, the
      transcript showing the universe, each version document in its underscored spelling and each
      download answered `200` with no redirect, every JSON answer `application/json`, no version
      document carrying `quality_metrics`, and every installed file byte-identical to the shared
      tarball's; and a second `berks install` with the written lockfile makes no request.
- [ ] AC2: From a fresh `HOME`, `cinc install` on chef-cli 6.1.39 and 5.6.9 with
      `default_source :supermarket, "https://{host}/chef/{repository}"` locks and installs the same
      cookbooks through the universe and the absolute `download_url` alone, with the lock's
      `identifier` for each cookbook equal to the one computed from the shared tarball's content,
      and `cinc export` of that lock succeeds.
- [ ] AC3: On knife 19.3.2 and 17.10.0, `knife supermarket download {name}` retrieves the latest
      version through `latest_version`, `download {name} {version}` retrieves that version through
      the underscored route, `show`, `search` and `list` print every cookbook of a repository holding
      more than 100 with none missing, `install` walks the dependency, and a version document
      requested as `latest` resolves; each tarball byte-identical to the shared one.
- [ ] AC4: `knife supermarket share {name} {category}` on knife 19.3.2 and 17.10.0 is answered `201`
      and creates exactly one snapshot, in which the version, its tarball and a universe listing it
      with its dependencies (self-dependency removed, as Supermarket's `Universe.generate` does) all
      appear together, no request reaching the configured `chef_server_url`, and a fresh `berks
      install` and `cinc install` then resolve it; a share without a category argument against an
      anonymously readable repository reads the cookbook document first and succeeds; a second
      share of an existing version is answered `409` with the client printing the Supermarket
      message and no snapshot created.
- [ ] AC5: A share is refused `400` with the reason in `error_messages[0]` as knife prints it and no
      snapshot, when the tarball is not gzip tar, holds an absolute, `..` or escaping link entry,
      has no `metadata.json` or more than one, has no non-empty README, names a cookbook outside
      `\A[\w_-]+\z`, carries a version other than canonical `x.y.z` (including `1.0` and a trailing
      newline), or arrives under a part filename whose name differs from `metadata.json`'s, or
      when the first multipart part is not the tarball; and a share whose name matches an existing
      cookbook in a different case is refused `409` naming the stored spelling.
- [ ] AC6: With knife's `node_name` set to a registered key name and `client_key` to its private
      key, a share or unshare whose `X-Ops-Content-Hash` differs from the tarball part's digest, whose
      tarball was altered after signing, which is signed by an unregistered, revoked, expired or
      other principal's key, carries an unknown key name in `X-Ops-Userid`, a timestamp more than 15 minutes from
      the server clock, a sign description other than `sha1;1.0`, `sha1;1.1` or `sha256;1.3`, or
      lacks any signed header, is refused `401` with the authentication-failed body, never treated
      as anonymous, with no snapshot; requests signed with protocol 1.0 and 1.1 by knife and with
      1.3 by mixlib-authentication directly are accepted; and a signed request over a connection
      this registry did not terminate with TLS is refused per `auth.md` AC27.
- [ ] AC7: A registered public-key credential is accepted only as an RSA public key of at least
      2048 bits, stores no private key material, is bound to one repository unless created with
      the multi-repository opt-in, is refused at creation with a scope its owner does not hold,
      expires by default, and after revocation or after its owner's grant is revoked is refused on
      the next signed request.
- [ ] AC8: `knife supermarket unshare {name}` on knife 19.3.2 and 17.10.0, and a `DELETE` of a
      version through `curl`, each remove exactly what they name in exactly one snapshot, after
      which the universe, the cookbook document and the version document no longer name it and a
      fresh resolution fails or falls back to a lower version; removing a cookbook's last version is
      allowed and leaves the `Package` row; a principal holding `push` without `delete` is refused
      `403` with knife printing its maintainer message; a removal of something absent answers `404`;
      and every removal against a proxied or virtual repository answers `405`.
- [ ] AC9: Each removal and a deprecation with a replacement, driven through the registry-owned
      management endpoint, produce the same served documents, exactly one snapshot each, and the
      same authorization outcome as the same operation through its client binding where one
      exists; a deprecated cookbook's document carries `deprecated` and `replacement`, which knife's
      download reports, and the universe bytes are unchanged by it.
- [ ] AC10: A share of a removed version is refused `409` with the same or different content, after
      the removal's snapshot has been pruned out of retention, after a whole-cookbook removal, and
      after a pointer is moved back across the removal, while a new version of the same cookbook
      shares normally.
- [ ] AC11: On a private repository, Berkshelf 8.1.23 with the braced `artifactory` source and
      8.0.5 with either form, and chef-cli 6.1.39 and 5.6.9 with `default_source :artifactory`,
      each with the token in `ARTIFACTORY_API_KEY`, install through requests that all carry
      `X-Jfrog-Art-Api` and succeed; a credential-less universe request answers `401`
      byte-identical for a private and a non-existent repository; a Berkshelf userinfo source
      authenticates its universe request with Basic; a rejected token answers `401` and is never
      served as anonymous; a valid token lacking `pull` answers `404`; and the same token presented
      as `X-Jfrog-Art-Api`, Bearer, Basic password, `Token` and scheme-less resolves to the same
      principal and scopes.
- [ ] AC12: A signing key and token holding unpatterned `pull` with `push` and `delete` patterned
      `acme-*` share and unshare `acme-tool` through knife and are refused `404` with no snapshot on
      `other-tool`; a token holding only `pull` patterned `acme-*` is refused the universe, so
      Berkshelf and Policyfile resolve nothing through it, while `curl` with it reads `acme-tool`'s
      version document and tarball and is refused `other-tool`'s; and in proxied mode the same
      patterned `pull` reads an in-pattern upstream cookbook through `curl` and is refused another.
- [ ] AC13: A version document or download the shared policy layer refuses answers `403` with
      Supermarket's JSON error body naming the policy, on the hosted and the proxied path;
      Berkshelf on both generations exits non-zero with a second source holding the same version
      configured and makes no request to that source for it, asserted at the network layer;
      Policyfile on both generations prints the body and stops; the universe, search and listings
      still name the refused version; and an advisory-dependent rule attached to a Chef repository
      is refused at configuration naming the absent OSV coverage.
- [ ] AC14: A tarball served through this registry is always the one the coordinate's metadata was
      generated from: a hosted version's download is byte-identical to its shared tarball for the
      life of the repository, and no request path serves bytes for a coordinate from a `File`
      belonging to another version.
- [ ] AC15: After an environment pointer is rolled back to a snapshot without the newest version of
      a cookbook, the universe served for it is byte-identical to the one that snapshot served;
      `cinc update` on both chef-cli versions and a cold `berks install` on both Berkshelf versions
      resolve the restored version (the `chef update` path); a warm Berkshelf holding the newer version in its store resolves
      the restored version after either documented remedy (a Berksfile equality constraint, or
      removing the store entry before `berks update`); and a promoted environment serves the same
      universe records and tarballs as its source.
- [ ] AC16: Name routes answer for any case spelling of a cookbook with the stored spelling in every
      document; version routes answer for the dotted and underscored spellings and `latest`, and
      answer `404` for `1.0`, a traversal segment and any other form; and a cookbook published as
      `strongSwan-base` resolves through a Berksfile naming it with that spelling on both Berkshelf
      versions.
- [ ] AC17: The universe of an unchanged repository is byte-identical with an unchanged `ETag`
      across snapshots, answers `304` to `If-None-Match`, gives every entry the `location_type`
      `opscode`, carries only absolute URLs under the
      configured base URL, and after the base URL is changed carries the new URLs with no write
      and no snapshot.
- [ ] AC18: Two concurrent shares of different cookbooks, and of different versions of one, both
      land with each universe listing both once they are complete; two concurrent shares of one
      version produce exactly one `201` and one `409`; and under fault injection at each write
      boundary no snapshot serves a universe naming a version whose tarball it does not hold, or a
      tarball its universe does not name, with no lost update across the revision-token retry.
- [ ] AC19: A share into a hosted repository holding 4,074 cookbooks and 31,345 versions, and a
      universe request against it, each complete within the budgets recorded in the benchmark
      suite, and CI fails on a regression beyond its tolerance.
- [ ] AC20: The proxied path installs cookbooks from a supermarket.chef.io stand-in serving recorded
      answers, including its `302` to a second host, on all six clients, with every URL in every
      served document naming this registry and no client request reaching the stand-in, asserted
      at the network layer; from fresh client homes a second install reaches this registry while
      the stand-in receives no tarball request; and every tarball is byte-identical to the
      upstream's.
- [ ] AC21: A proxied universe is revalidated after its TTL and not before, with `If-None-Match`,
      and a `304` keeps the stored universe; a version published upstream becomes resolvable after
      the TTL; cached tarballs are never revalidated; an upstream `404` is negatively cached so a
      second request within the negative TTL makes no upstream request; an upstream `429` or `5xx`
      is neither cached as absence nor surfaced as not-found; upstream version keys that are not
      canonical `x.y.z` are absent from the served universe with a divergence recorded; and
      mixed-case upstream names are served byte for byte.
- [ ] AC22: A stand-in serving a tarball whose size differs from `tarball_file_size`, whose
      `metadata.json` names another version or cookbook (the captured version swap), which is not
      gzip tar or is truncated, or which after eviction arrives with a digest other than the pinned
      one, never has it committed or delivered in full to any client through this registry; the
      installing Berkshelf and Policyfile clients fail where a direct client installed the swapped
      bytes; and the real failure reason is recorded observably to the operator.
- [ ] AC23: A version vanishing from the upstream universe or answering `404`, and a cookbook
      answering `404` where it existed, leave the cached tarball served by coordinate, drop the name
      or version from the proxied universe, and record a divergence; and an ordinary upstream
      metadata change is propagated at the next revalidation: Chef's side of the settled removal
      table in `proxy-cache.md` (its AC13).
- [ ] AC24: A virtual repository whose members are a hosted repository then a supermarket.chef.io
      remote, configured as the only source, resolves a cookbook name held by the hosted member
      only from that member on both Berkshelf and both chef-cli versions even when the remote holds
      a higher version of the name; resolves names only the remote holds from it; serves every
      version document and download from the member that supplied the name; and answers `405` to
      shares and removals.
- [ ] AC25: Replay-match passes against a corpus recorded from supermarket.chef.io and from the
      pinned omnibus Supermarket covering the recorded surface named in Design, with every
      divergence named in Design on the exception list, `X-Remote-Request-Id` normalised, and no
      signed-header, `X-Jfrog-Art-Api`, Basic or session-cookie value in the committed corpus.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/chef/hosted_berks_test.go` (both Berkshelf images; fresh `HOME`; transcript shape; byte comparison of the store; warm run request count at the network layer) |
| AC2 | conformance | `conformance/chef/hosted_policyfile_test.go` (both chef-cli images; lock identifiers recomputed by the harness from the fixture; `cinc export`) |
| AC3 | conformance | `conformance/chef/hosted_knife_test.go` (both knife images; a `state` seed of 150 cookbooks for list and search; each read command; `latest` through `curl`) |
| AC4 | conformance + integration | `conformance/chef/share_test.go` (both knife images; with and without category; duplicate share; follow-up installs); `internal/format/chef/share_test.go` (one snapshot holding version, tarball and universe; refusal creates none) |
| AC5 | integration + conformance | `internal/format/chef/ingest_test.go` (each crafted tarball and part order through the handler); `conformance/chef/share_test.go` (a real-client share of a respelled name and of a README-less cookbook, message printed) |
| AC6 | integration + conformance | `internal/auth/chefsig_test.go` (each tampered header and body, each key state, each protocol version including a 1.3 fixture signed by mixlib-authentication in the client image, clock injection); `conformance/chef/auth_test.go` (knife with an unregistered key; plaintext refusal) |
| AC7 | integration | `internal/auth/chefkey_test.go` (key size and type refusal, stored columns, scope binding, owner bound, expiry and revocation under an injected clock) |
| AC8 | conformance + integration | `conformance/chef/remove_test.go` (both knife images; `curl` version removal; last-version removal; `push`-only refusal; absent target; proxied and virtual `405`); `internal/format/chef/remove_test.go` (one snapshot per operation, retirement set written) |
| AC9 | conformance + integration | `conformance/chef/manage_binding_test.go` (twin cookbooks, one per entry point, served documents compared; deprecation reported by knife download); `internal/format/chef/manage_binding_test.go` (snapshot count, authorization per entry point, universe bytes unchanged by deprecation) |
| AC10 | conformance + integration | `conformance/chef/retirement_test.go` (re-share after removal through knife); `internal/format/chef/retirement_test.go` (after pruning under an injected clock, after whole-cookbook removal, across a backwards repoint) |
| AC11 | conformance + integration | `conformance/chef/auth_test.go` (private repository; both Berkshelf images with the `artifactory` source, both chef-cli images with `default_source :artifactory`; userinfo source; challenge equality; rejected and `pull`-less tokens; header assertions at the network layer); `internal/auth/verifier_test.go` (five presentation forms, one principal) |
| AC12 | conformance + unit | `conformance/chef/auth_test.go` (the pattern-refusal case `auth.md` AC8 and `format-handler-interface.md` AC7 require, in both modes; patterned key and token through the `credentials` key; knife share and unshare; resolver refusal at the universe; `curl` reads); `internal/format/chef/scope_object_test.go` (the object table per route, `format-handler-interface.md` AC12) |
| AC13 | conformance + integration | `conformance/chef/policy_test.go` (hosted and proxied modes; rules through the `policies` key; a second-source stand-in holding the version; both Berkshelf and both chef-cli images; network-layer assertion); `internal/format/chef/policy_config_test.go` (advisory-dependent rule refused at configuration) |
| AC14 | integration | `internal/format/chef/download_binding_test.go` (download digest equals the shared tarball's across later writes, repoints and concurrent shares; property test over random write sequences) |
| AC15 | conformance + integration | `conformance/chef/rollback_test.go` (rollback through the management surface; `cinc update` on both chef-cli images; cold and warm Berkshelf with both remedies; promotion case); `internal/format/chef/pointer_universe_test.go` (universe bytes per pointer) |
| AC16 | conformance + unit | `conformance/chef/names_test.go` (`curl` for each case and version spelling; a mixed-case cookbook resolved by both Berkshelf images); `internal/format/chef/route_test.go` (segment grammar) |
| AC17 | integration | `internal/format/chef/universe_test.go` (byte stability and `ETag` across unrelated writes, `304`, absolute URLs, base-URL change without a snapshot) |
| AC18 | integration | `internal/format/chef/concurrent_share_test.go` (two writers per case, fault injection at each write boundary, final universe and snapshot contents asserted) |
| AC19 | benchmark | `internal/format/chef/universe_bench_test.go` (a generated Supermarket-sized repository; share and universe serve; budgets and tolerance in the benchmark gate) |
| AC20 | conformance + integration | `conformance/chef/proxied_test.go` (stand-in serving recorded supermarket.chef.io answers and a second-host tarball; all six client images; network-layer assertions from fresh homes; byte comparison); `internal/format/chef/proxied_rewrite_test.go` (no upstream URL in any served document) |
| AC21 | conformance + integration | `conformance/chef/proxied_ttl_test.go` (mutating stand-in with `ETag`; installs before and after the TTL); `internal/format/chef/proxied_universe_test.go` (non-canonical keys, mixed case, negative caching, throttling responses) |
| AC22 | integration + conformance | `internal/format/chef/proxied_integrity_test.go` (each bad tarball variant and a truncated body; CAS and reference assertions; the pinned-digest refetch after eviction; operator record); `conformance/chef/proxied_integrity_test.go` (the captured version swap through both Berkshelf and both chef-cli images, failing through this registry) |
| AC23 | integration | `internal/format/chef/removal_test.go` (stand-in presenting each event class; the shared-layer half is `proxy-cache.md` AC13's) |
| AC24 | conformance | `conformance/chef/virtual_test.go` (hosted then remote members; a higher upstream version of the private name; both Berkshelf and both chef-cli images; provenance from the network layer; `405` on writes) |
| AC25 | conformance | `conformance/chef/replay_test.go` |

The case set needs only keys already in the harness's closed `setup` vocabulary (its resolved
closed-vocabulary decision, was Q4): `repositories` with their visibility and type, including a
virtual repository's member order; `credentials`, patterned ones included, where the Chef cases
additionally need a registered public key issued as a credential (a sibling consequence for the
harness, since the key's private half must reach the client container as a file); an `upstreams`
stand-in (a fixture server serving recorded supermarket.chef.io answers, the object-storage
second host, the bad tarball variants, and a second-source stand-in for the fall-through and
refusal cases); `state` for pre-shared cookbooks, removed versions with their retirement set, and
the stored universe carried verbatim in the repository-level document; and `policies` for AC13.
The runner-enforced obligations, both modes and the unauthenticated, unauthorized and
pattern-refusal cases in each, apply from the sibling specs and are not restated per criterion
here.

## Implementation Phases

### Phase 1: Hosted reads and the universe
- Waits on `docs/internal/plans/foundation/signing-service.md` reaching `planned`, and, for
  private repositories, on the `auth.md` revision adding the `X-Jfrog-Art-Api` form (Blocking
  preconditions)
- The format-first mount, the stored URL-free universe and its streamed expansion under the base
  URL, the cookbook, version, search and list documents rendered through the pointer, the direct
  download, name and version route grammar, the per-route addressed objects, the `403` policy
  rendering, the universe benchmark

### Phase 2: Share
- Waits on the `auth.md` and `credential-management.md` revisions for registered public keys
  (Blocking preconditions)
- Signed-request verification in the shared layer with the end-of-part content-hash check, ingest
  validation, immutability and spelling rules, the write-boundary declaration exercised end to end
  under concurrency

### Phase 3: Removes and deprecation
- Waits on `docs/internal/plans/foundation/management-api.md` reaching `planned` (Blocking
  preconditions)
- The three operations with unshare and the version route bound onto them, the retirement set and
  its preservation across a backwards repoint

### Phase 4: Proxied path
- Waits on `proxy-cache.md` offering the completion-only mode with a handler-supplied verifier and
  on the Supermarket adapter in `upstream-adapters.md` (Blocking preconditions)
- Upstream validation, classification per route, universe revalidation and regeneration from
  parsed records, URL rewriting, tarball verification and digest pinning, negative caching, the
  removal table, `405` on remote writes

### Phase 5: Virtual repositories
- The per-name merge in the shared service, member-scoped document and download resolution, `405`
  on virtual writes

### Phase 6: Corpus and gate
- Recording session across the named surface (after the harness redaction gate) against
  supermarket.chef.io and the seeded omnibus Supermarket, replay-match, the exception-list entries
  named in Design, and the matrix rows for the deliberately unimplemented surface

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. The ten questions this draft raised were each written in the template's decision shape
and then adopted at their own recommendation under the owner's standing delegation of 2026-09-26,
so the loop can continue; each is recorded below as adopted rather than decided, folded through
Scope, Design, the criteria and the Test Plan in the same pass, and reversible by the owner at any
time. `grep -rn "standing delegation"` is the owner's review queue.

### Resolved: how a share is authenticated (was Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a principal registers an
RSA public key as a credential with a key name knife sends as `X-Ops-Userid`, and the shared layer
verifies Chef's signed headers against it with the standard library, protocols 1.0, 1.1 and 1.3,
with the content hash checked at the end of the tarball part (Design, "Authentication"; AC4, AC6,
AC7, AC12).

The question: knife signs `share` and `unshare` with an RSA private key (captured, protocol 1.0 and
1.1), and `auth.md` knows only registry tokens in four presentation forms, none of which knife can
send. Supermarket verifies against a public key it obtained from a Chef Infra Server sign-in.

**Recommendation:** A. It serves the real client's publish command, so trigger and effect stay
oracle-testable; the registry holds only a public key, which removes the stored-secret problem
entirely; and verification needs nothing but `crypto/rsa`, proven on the captured requests.

| Option | You get | It costs |
|---|---|---|
| **A. Registered public keys, signed headers verified centrally** | knife share and unshare work unchanged; nothing secret stored; the key is scoped, expiring and revocable like a token | A second credential kind in `auth.md` and `credential-management.md`; SHA-1 protocols accepted because knife uses them; a 15-minute replay window; the canonicalisation in `auth.md` AC10's review scope |
| **B. Publish only through the management API; signed requests refused** | No new credential kind | `knife supermarket share` fails on this registry, so the ecosystem's publish command is untestable here and every team needs a bespoke upload step |
| **C. Registry-generated key pairs, the private key shown once** | Keys the registry controls end to end | The registry generates and transmits private keys, a secret-handling surface A avoids, for no gain in what is verified |

**Why this is yours:** it adds a credential kind to the security foundation you settled on tokens,
and accepts SHA-1 on a write path because the client leaves no alternative.

Accepted cost: the `auth.md` and `credential-management.md` revisions, both sibling consequences,
the SHA-1 and replay costs named in Design, and a larger external review.

### Resolved: how a private repository is read (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the central verifier accepts
a registry token in `X-Jfrog-Art-Api` as a fifth presentation form, Basic keeps working where a
client sends it, every served URL stays absolute, and no download capability is minted; knife
reads private repositories not at all (Scope; Design, "Authentication"; AC11).

The question: Berkshelf's and Policyfile's `supermarket` sources send Basic from URL userinfo to
the universe only, knife to the documents it builds URLs for only, and both resolvers' `artifactory`
source types send `X-Jfrog-Art-Api` to every URL (captured). Relative URLs would carry userinfo
further for Berkshelf but break Policyfile's download and knife's (captured).

**Recommendation:** A. It is the one form both resolvers already send everywhere, it needs no URL
change, and it keeps the universe one document for every caller; a URL-borne capability would make
the universe per-caller and mint one capability per version per request.

| Option | You get | It costs |
|---|---|---|
| **A. `X-Jfrog-Art-Api` as a presentation form; absolute URLs; no capability** | Berkshelf and Policyfile read private repositories on both generations with one environment variable; the universe stays generated once | A JFrog-named header in `auth.md`'s verifier; knife cannot read private repositories |
| **B. A download capability in byte URLs plus a relative `location_path`** | Basic from userinfo works on all three clients | A per-caller universe with thousands of minted capabilities per request, and the stored-document design lost |
| **C. Chef repositories are anonymous-read only** | No new form | No private cookbooks, which is the reason a team runs its own Supermarket |

**Why this is yours:** it admits a vendor-named header into the security foundation and gives up
private knife reads.

Accepted cost: the `auth.md` revision and the documented knife limitation.

### Resolved: how the universe is stored and where its URLs come from (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the shared service stores a
URL-free universe inside each write, and the handler inserts the three URL-bearing fields per entry
while streaming it under the current base URL (Design, "The universe"; AC17, AC19).

The question: the universe is repository-wide and fetched whole on every resolution, so rendering
it from every version record on request costs O(repository) per install, while storing it with
absolute URLs bakes the base URL into every snapshot.

**Recommendation:** A. The aggregation is done once per write, the expansion is a linear stream
with no lookup, and a base-URL change needs no write.

| Option | You get | It costs |
|---|---|---|
| **A. Stored URL-free, expanded on serve** | One generation per write; base URL free to change; byte-stable output | A stream transform on every serve, and the `ETag` must fold in the base URL |
| **B. Stored fully rendered** | A pure stream copy on serve | A base-URL change needs a regeneration write in every Chef repository, and snapshots record a deployment detail |
| **C. Rendered on request from version records** | No stored document | O(repository) reads per install, and no share in the write-triggered service CRAN, Helm and Debian share |

**Why this is yours:** it fixes the split of work between the shared service and the handler for
this format's index.

Accepted cost: the serve-time transform and the `ETag` rule.

### Resolved: virtual repositories (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: per-name resolution, the
first member holding a name supplying all of that name's entries (Design, "Virtual repositories";
AC24).

The question: nothing binds a Chef document to a repository, so a merge is expressible; the rule
matters because Berkshelf's own union takes the highest version across sources (captured), the
dependency-confusion path.

**Recommendation:** A. Member order is `data-model.md`'s resolution rule, per-name shadowing is the
defence against the captured confusion, and per-member document resolution keeps a version document
and its tarball from different members apart.

| Option | You get | It costs |
|---|---|---|
| **A. Per name, first member wins** | Private names cannot be overridden by upstream versions | A private cookbook hides every upstream version of that name |
| **B. Per version, union of all members** | Every version of every member visible | Reproduces Berkshelf's confusion inside the registry |
| **C. No virtual repositories** | Nothing to specify | Users configure two sources and Berkshelf's union decides for them |

**Why this is yours:** it sets the precedence between private and public content, a supply-chain
posture.

Accepted cost: the documented shadowing.

### Resolved: re-shares and removed versions (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: an existing version answers
`409`, and a removed version is retired forever (Design, "The publish path"; AC4, AC10).

The question: Supermarket refuses a duplicate version and lets a removed one be shared again; the
cross-format rule (`npm.md`, `pypi.md`, `hex.md`) retires removed coordinates so one coordinate
binds one set of bytes; and a Chef version has no content-derived identity that could make a return
safe, as `conan.md`'s bound revisions do.

**Recommendation:** A. With no identity binding bytes to a version, the retirement set is the only
protection against a removed coordinate returning with different content to clients that cached the
first.

| Option | You get | It costs |
|---|---|---|
| **A. `409` on existing; removed versions retired** | One set of bytes per coordinate for the repository's life | A Supermarket workflow (remove then re-share) fails, on the exception list |
| **B. Supermarket's behaviour** | Replay-faithful | A coordinate can return with different bytes |
| **C. Replace on re-share** | Last writer wins | Different bytes under one coordinate over time |

**Why this is yours:** it diverges from the reference server to keep a cross-format guarantee.

Accepted cost: the divergence and its operator note.

### Resolved: the addressed object, and what a pattern refusal looks like (was Q6)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: every per-cookbook route
reports the lowercased name, the share its part filename's, the universe, search and list none, and
a pattern refusal answers `404` (Design, "Addressed objects and pattern scopes"; AC12).

**Recommendation:** A. It applies `auth.md` as written, as `cargo.md` and `conan.md` did; the usable
recipe narrows what CI may write, which is what patterns are for; and `404` keeps a pattern from
being an oracle.

| Option | You get | It costs |
|---|---|---|
| **A. Name object; universe none; refusal `404`** | No new object kind; no oracle; write narrowing works | A patterned-only `pull` cannot resolve; an out-of-pattern read falls through Berkshelf to its next source |
| **B. Exempt the universe from the pattern rule** | Patterned `pull` resolves | The universe enumerates every name, the exact leak the none rule exists to stop |
| **C. Pattern refusal as `403`** | An out-of-pattern read halts Berkshelf | A distinguishable refusal for names outside the pattern |

**Why this is yours:** it accepts a client-wide limitation rather than bending a security rule you
settled.

Accepted cost: the documented recipe and limitation.

### Resolved: how a policy refusal is rendered (was Q7)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: `403` with Supermarket's
JSON error body on the version document and the download, and no elision from the universe, search
or listings (Design, "Policy refusals on the wire"; AC13).

**Recommendation:** A. `403` is the status that halts Berkshelf instead of sending it to another
source (captured), and listing the refused version is what makes the resolver reach the refusal.

| Option | You get | It costs |
|---|---|---|
| **A. `403`, listed in the universe** | The refusal holds whatever sources the user configured | Berkshelf and knife show a generic message without the reason |
| **B. Elide refused versions from the universe** | Resolvers pick an allowed version silently | Berkshelf takes a refused version from any other source, and the user never learns why |
| **C. `404`** | Consistent with absence | Berkshelf falls through to another source holding the same version (captured) |

**Why this is yours:** it trades user-visible explanation against whether a refusal holds.

Accepted cost: the operator documentation explaining the Berkshelf and knife messages.

### Resolved: how a proxied tarball is verified (was Q8)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: completion-only verification
of size and `metadata.json` identity, and the first verified digest pinned on the coordinate
(Design, "The proxied path"; AC22).

**Recommendation:** A. With no upstream digest these are the only bindings available, and the pin
makes the coordinate immutable here from the first fetch on.

| Option | You get | It costs |
|---|---|---|
| **A. Size and identity verified; first digest pinned** | The captured swap is never delivered; later upstream changes are detected | A tamper that keeps name and version passes the first fetch |
| **B. Serve upstream bytes unverified** | Nothing to build | The registry repeats the client's blindness |
| **C. Refuse to proxy an ecosystem without digests** | No trust-on-first-use | No supermarket.chef.io cache, the format's main proxy use |

**Why this is yours:** it accepts trust on first use where the ecosystem offers nothing stronger.

Accepted cost: the stated first-fetch limit.

### Resolved: a respelled share of an existing cookbook (was Q9)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the stored spelling is kept
and a share differing only in case answers `409` naming it (Design, "The publish path"; AC5).

**Recommendation:** A. Berkshelf matches universe names exactly, so a spelling change would break
every Berksfile using the old one; Supermarket instead rewrites the name to the latest upload's
spelling (`CookbookUpload#cookbook` assigns `book.name`).

| Option | You get | It costs |
|---|---|---|
| **A. Keep the first spelling; refuse a respelling** | Stable universe keys | A deliberate respelling needs a new cookbook name |
| **B. Follow the latest upload, as Supermarket does** | Replay-faithful | Existing Berksfiles break on the next share |

**Why this is yours:** it diverges from the reference server on a name rule.

Accepted cost: the exception-list entry.

### Resolved: supermarket.chef.io as a preconfigured upstream (was Q10)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: user-configured in v1, not
added to the preconfigured set; revisited on the catalogue's Tier 3 verdict through
`proxy-cache.md`'s own extension mechanism (its resolved preconfigured-set extension, was Q14),
the same footing `conan.md` left ConanCenter on.

**Recommendation:** B, for sequencing: Chef is Tier 3 and built only if the breadth gate says so.

| Option | You get | It costs |
|---|---|---|
| **A. Preconfigure supermarket.chef.io now** | Cookbook caching with no configuration | A sibling decision reopened from a Tier 3 spec before the gate |
| **B. User-configured in v1, revisited at the verdict** | No sibling amendment | No nightly run against the real Supermarket until then |

**Why this is yours:** it amends a set you priced for a few upstreams.

Accepted cost: the proxied cases run against a stand-in; the real upstream is exercised by the
recording session.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | 34a974d | authoring pass: grounded first draft, not a review | Grounded four ways: captured traffic from Berkshelf 8.1.23 and 8.0.5, chef-cli 6.1.39 and 5.6.9 and knife 19.3.2 and 17.10.0, from two Cinc Workstation images pinned by digest, on a dedicated Podman network against two logging, rule-injecting stubs implementing the Supermarket routes from its source (cold and warm installs, lockfile installs sending nothing, the underscored and dotted version spellings, Policyfile using `download_url` alone, direct `200` downloads accepted, knife download, show, search, list and install, share with and without a category, a duplicate share, unshare and the pasted version path, `401`, `403` and `409` renderings in JSON and text, a tampered and a version-swapped tarball installing silently, Policyfile's lock identifier failing only at export, Berkshelf's store keeping a rolled-back version while Policyfile adopted it, Berkshelf falling through on every universe status and on a version-document `404` but halting on `403`, Policyfile refusing conflicting sources, the captured dependency confusion, Basic from userinfo reaching only the universe, `X-Jfrog-Art-Api` reaching every URL, the Ruby 3.4 DSL failure, and `berks upload` targeting the Chef Infra Server); the captured signatures re-verified with Go's `crypto/rsa` alone; the Berkshelf, knife, mixlib-authentication, chef-cli, cookbook-omnifetch, Chef and Supermarket sources; the live supermarket.chef.io (universe size, shape, `ETag` and `304`, mixed-case names and newline versions, version document fields, the `302` to S3, case-insensitive routes, error shape); and OSV (no Chef ecosystem). The reference Supermarket was not run (no container image; uploads need a Chef Infra Server sign-in). Design built from that: the wire table; four decisive client behaviours; ingest and proxied verification rules; the shared-model mapping; the universe as a stored, URL-free, write-triggered document with the signing service's requirements; share as one write; removes and deprecation as management bindings; the auth.md reconciliation (registered public keys for signed writes, `X-Jfrog-Art-Api` for private reads); name objects with `404` pattern refusals; `403` policy refusals without elision; rollback served exactly, adopted by Policyfile and cold Berkshelf; the proxied classification with URL rewriting and verification; Chef's removal-table rows; per-name virtual repositories. Ten questions written in decision shape and adopted under the standing delegation: registered public keys (AC6, AC7), `X-Jfrog-Art-Api` reads (AC11), a URL-free stored universe (AC17), per-name virtual resolution (AC24), `409` and retirement (AC10), name objects and `404` pattern refusals (AC12), `403` without elision (AC13), size and identity verification with a digest pin (AC22), the first spelling kept (AC5), supermarket.chef.io user-configured. Twenty-five criteria, each with a Test Plan row. Sibling consequences recorded in the authoring report, not applied here. Stays draft; awaits an independent review. |
