---
status: planned
status_description: "Planned by the Fable recheck of 2026-10-08 at 1743b4e: full review of the Opus-authored design and re-examination of its ten adoptions (six confirmed, four confirmed with folds amended, none superseded), every sibling citation verified at HEAD and the consequences queue applied (the universe's URL expansion as signing-service's Render stage with the runtime's ETag and per-encoding gzip, ServeRendered and ServeFile for the per-request documents and the tarball, the /universe member input for the merging profile, the body-read Scope(r) under the interface spec's interim bound with the mislabelled-part refusal after authorization, HEAD as the door's answer, the share spooled under management.publish_spool_limit). Adversarial findings folded: a versionless cookbook served as absent, the version route's credential forms and the pasted-version unshare, the annotate payload validated with replacement as the cookbook-document URL, the proxied download resolving the version document first and revalidating once before classing a size mismatch, lowercased name comparison in a virtual, search as a substring match on the exception list. Earlier: reconciled 2026-09-28 at b43c566 on Opus; authored 2026-09-26 from captures of Berkshelf 8.1.23 and 8.0.5, knife 19.3.2 and 17.10.0 and chef-cli 6.1.39 and 5.6.9. Open Questions empty; awaits /tasks."
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
write-triggered generated document produced by `docs/internal/plans/foundation/signing-service.md`,
which the charter builds at step 7 as the production form of what the step 4a prototype learned:
this handler declares the optional `Indexer` interface and its generator lives in
`internal/format/chef/index`. How this format's six requirements map onto that spec is stated in
Design ("What the signing and index service provides"); nothing is asked of its signing half,
because nothing on this wire is signed, and a format whose profile declares no signing profile
gets no key (its AC24).

**`auth.md` and `credential-management.md` must be `planned` before Phase 1's private reads and
Phase 2.** The resolved publish-authentication and private-read decisions below needed a
registered-public-key credential verified from Chef's signed headers and the `X-Jfrog-Art-Api`
header as a way to present a registry token. Both have landed as specs: `auth.md` carries the
`X-Jfrog-Art-Api` row of its presentation-form table, route-scoped to this format's read routes,
and the signed-request row, route-scoped to its write routes, with the verifier in "Signed
requests: the one client that carries no token" (its AC31 and AC34), and
`credential-management.md` carries the registered public key at `/api/v1/keys` (its AC12). Until
both reach `planned`, Phase 1 serves anonymously readable repositories only.

**The management API must be `planned` before Phase 3.** Removing a version, removing a cookbook
and deprecating a cookbook are kinds of `docs/internal/plans/foundation/management-api.md`'s
closed vocabulary (`delete-version`, `delete-package`, `annotate`), declared through its optional
`Operator` interface, whose core the charter builds at step 2 and completes at step 9;
`knife supermarket unshare` and the Supermarket version route are bindings onto them (that spec's
reconciliation table: "the two Supermarket `DELETE` routes").

**The proxy layer's completion-only fetch and the upstream adapters must be `planned` before
Phase 4.** A Supermarket tarball carries no digest on any read surface, so what binds it is a
check the handler can compute only over the complete body (Design, "The proxied path").
`proxy-cache.md` now offers exactly that: the completion-only mode with a handler-supplied
verifier run in its post-receipt hook before any commit (its resolved completion-only decision,
was Q15 there, AC20), which eight formats requested and this spec needs in no new shape. What
this format called "the Supermarket adapter" is `docs/internal/plans/foundation/upstream-adapters.md`'s
`https` adapter under a profile (its "Selecting an adapter": "What the formats called 'the
Supermarket adapter' ... is this adapter under a profile"), built at charter step 4: it follows
the upstream's cross-host `302` to object storage under the upstream's host allowlist and
revalidates the universe with `If-None-Match` (its AC7, AC8 and AC15); the protocol half stays in
this handler.

Nothing is required of `docs/internal/plans/foundation/async-operations.md` (a share completes
inside its request, captured `201`; the virtual merge is `signing-service.md`'s `index.merge` job
kind, which that spec owns) or of `docs/internal/plans/foundation/artifact-verification.md` (the
ecosystem has no artifact signature or attestation, so that spec lists `chef.md` in its
"Nothing" row and its verification column renders `none` for Chef, its AC24; charter step 4b is
not a dependency).

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
  protocol versions 1.0, 1.1 and 1.3 (`auth.md` AC34, `credential-management.md` AC12); private
  reads by a registry token in the `X-Jfrog-Art-Api` header or as Basic (`auth.md`'s
  presentation-form table, AC31); the uniform challenge; per-route addressed objects and the
  pattern-refusal case `auth.md` AC8 requires; the rendering of a shared policy refusal through
  the shared refusal writer.
- The handler's `Capabilities()` declaration, repository rename and virtual aggregation (AC26).
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
it is served. This registry is therefore where a cookbook's name, version and bytes are bound,
and its own read path is the only integrity check a Chef client ever gets: the CAS verifies a
blob's digest while streaming it on every read and aborts with an operator alert on a mismatch
(`storage-and-gc.md` AC21; `artifact-verification.md`'s resolved serve-time-verification decision, was Q5 there, whose question names
Chef among the clients that verify nothing).

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
  `replacement`. Deleted versions are core-held `Retirement` records, written by
  `management-api.md`'s `Submit` in the removing operation's transaction and never pruned
  (`data-model.md` AC35; `management-api.md`, "Retirement is core-held"), so no handler document
  carries them and no repoint can lose them.
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
because it is the one document whose cost is repository-wide. Each per-request document is
served through `ServeRendered`'s lazy form (the renderer and a validator identity over the
records it reads, the serving pointer as the freshness source) and the tarball through
`ServeFile` from its `File` record, the two forms `signing-service.md`'s resolved
handler-rendered decision added beside `ServeDocument` (was Q14 there, AC32; the `Documents`
door `format-handler-interface.md` carries in `Deps`), so no handler package sets a validator
and a conditional request answers `304` without rendering.

### The universe: a write-triggered generated document

Per the resolved universe decision below, the universe is **stored, never rendered from the
version records on request**, and it is **stored without URLs**:

- The stored form is `{spelling: {version: {"dependencies": {...}}}}`, with names in byte order of
  their lowercased form and versions in Chef version order, produced inside the write that
  changes it (a share, a version removal, a cookbook removal) by this format's generator
  (`internal/format/chef/index`, pure) run by `signing-service.md`'s write-path runtime before
  commit (its "The write path dispatches; the handler cannot forget", AC1). Deprecation does not
  touch it: the generator's `Affects` returns no key for an `annotate`.
- On a request the stored document is streamed with, inserted into each entry,
  `"location_type": "opscode"`, `"location_path": "{base}/api/v1"` and
  `"download_url": "{base}/api/v1/cookbooks/{spelling}/versions/{version}/download"` under the
  externally visible base URL of the repository. The insertion is the generator's **serve-time
  stage**: this format's profile declares one for the universe key, and the runtime calls the
  generator's `Render(ctx, stored, variant, inputs)` with `deployment.md`'s `server.public_url`,
  the repository's current name and its mount as the inputs (`signing-service.md`'s resolved
  serve-time decision, was Q13 there, AC31; the same stage `vagrant.md`'s catalogs use). The
  URLs are absolute because Policyfile resolves a relative `download_url` into a `NoMethodError`
  and knife resolves a relative `file` against its `chef_server_url` (both captured), and the
  insertion is a linear stream transform with no per-entry lookup, so `Render` returns a
  streaming writer rather than bytes: a Supermarket-scale universe approaches the memo bound
  (`index.render_memo_bytes`, 256 MiB by default across every memoised rendering of the
  process), and an output above it streams from `Render` on every request, which AC19's budget
  covers. The transform is this format's, so it lives in the generator package beside the
  renderer that wrote the stored form, never in the handler package, and the universe is served
  through `index.ServeDocument`, which sets the headers (`signing-service.md` AC11 holds that no
  handler package sets `Last-Modified` or `ETag`).
- It is served `Content-Type: application/json; charset=utf-8`, gzip-encoded when the client
  accepts it (every capture sent `Accept-Encoding: gzip`) through the key's serve policy, which
  offers `gzip` and so sets `Content-Encoding` and `Vary: Accept-Encoding` with a strong `ETag`
  distinct per encoding (`signing-service.md` AC30). The runtime derives the `ETag` from the
  stored body's digest, the variant and the inputs (the base URL and the name), never from the
  rendering, so an unchanged repository serves identical bytes and the same `ETag` across
  snapshots, a conditional request answers `304` on a matching `ETag` with zero `Render` calls
  although no pinned client sends one, and a changed `server.public_url` or a rename changes the
  bytes and the `ETag` with no write and no snapshot (its AC31); its `Last-Modified` is the
  serving pointer's forward-moving freshness record (`data-model.md` AC36), which no Chef client
  reads.
- A repoint restores it, since it lives in the snapshot delta at the repository level; a
  rollback therefore serves exactly the universe of the snapshot it targets (Design, "Rollback and
  promotion").

**What the signing and index service provides.** The six requirements this spec placed on
`docs/internal/plans/foundation/signing-service.md`, each checked against what that spec now
says:

1. **Unsigned generation** of the stored universe from the version-level records of every current
   version in the repository, in the ordering above; nothing is signed and the service's signing
   half is not used. Met: that spec lists Chef among the consumers that "use generation with no
   key", and a profile with no signing profile makes the format an unsigned consumer with no key
   created (its "Two halves, one write", AC24).
2. **Regeneration inside the triggering write**, landing in the same completed logical write and
   the same snapshot, so no snapshot serves a universe naming a version whose tarball it does not
   hold (`data-model.md`'s one-write-one-snapshot rule; the prototype's question 3), and two
   concurrent shares both land. Met by the pre-commit dispatch (its AC1) and by its per-document
   transaction lock with the revision-token retry behind it ("Contention", AC3, AC28).
3. **Incremental cost**: a write touching one cookbook reworks that cookbook's entries and copies
   the rest by stream, so a share into a Supermarket-sized repository (31,345 versions) does not
   re-read every version record. Met by the generator's `Affects` and the streaming writer
   `Generate` may return (its AC4); this spec's AC19 holds the budget.
4. **Storage as CAS-backed metadata above the inline threshold** (the fourth mark root,
   `storage-and-gc.md` AC16), since a hosted universe reaches megabytes and a proxied one is
   eight. Met (its "Storage" section, AC5).
5. **The virtual merge**, per name in member order (below), re-run when a member's universe
   changes. Met by the generator's `Merge` run as the `index.merge` job kind on
   `internal/async`: enqueued by a member's write through the pre-commit hook, coalesced within
   `index.virtual_merge_window`, the first merge enqueued at virtual creation, the previous merged
   universe serving until the new one commits (its "Virtual merges", AC19).
6. **The same generation on the proxied path** from the records parsed out of an upstream
   universe, so hosted, proxied and virtual repositories share one generator and one stored form.
   Met by `FromUpstream`, whose result is stored unsigned as the remote's current document with
   `proxy-cache.md`'s cache-scoped freshness (its "The proxied path", AC20).

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
  (`409`), policy refusal (`403`, written through `WriteRefusal`), and a share to a proxied or
  virtual repository (`405`, the status `management-api.md` fixed for every content write there,
  its problem type `repository-type`). Every refusal carries Supermarket's error body
  `{"error_code": ..., "error_messages": [...]}` as `application/json`, because knife prints
  `error_messages[0]` and fails on anything else (captured).
- **A version is immutable, and a deleted version is retired** (the resolved re-share decision
  below): a share of a version that exists answers `409` with Supermarket's wording, whatever its
  bytes, and so does a share of a coordinate with a `Retirement` record, which the shared write
  path refuses and this handler renders in Supermarket's shape (`data-model.md` AC35;
  `management-api.md`, "Retirement is core-held"). Identical re-shares cannot be made
  idempotent here, because knife rebuilds the tarball on every share and the bytes differ each time
  (captured: two shares of the same `acme-app` 1.0.0 had different content hashes).
- **A cookbook keeps its first spelling**: a share whose `metadata.json` name matches an existing
  cookbook case-insensitively but not byte for byte answers `409` naming the stored spelling (the
  resolved name-spelling decision below).
- **Each removal and each deprecation change is one write** (below). A proxied repository creates
  no snapshots: arrival and revalidation are cache materialisation.

**The tarball part is spooled, under the one shared bound.** Ingest rules 1 to 3 need the
whole archive (a second `metadata.json` or an escaping link can sit in its last entry) and the
content-hash check closes only over the complete part, so nothing may be written before the part
has ended; the handler therefore spools the tarball part through the bounded spool facility
`Deps` hands it and commits it to the CAS from the spool. The bound is
`management.publish_spool_limit`, the one bound on every publish body this registry spools, a
handler's own wire publish included (`management-api.md`'s resolved spool-bound decision, was Q20
there, AC36; `swift.md`, `puppet.md` and `conda.md` are the other wire-publish citers). A
`Content-Length` above it is refused `413` before any byte is spooled and a part that outgrows
it is cut at the bound and refused with nothing committed, in both cases with Supermarket's
error body, since knife prints `error_messages[0]` of whatever JSON it gets and a bare problem
document would print nothing useful. A cookbook tarball is tens of kilobytes to a few megabytes
(the live `apt` 7.5.0 is 24,497 bytes), so the default bound is never near.

Two concurrent shares of different cookbooks, or different versions of one, each read-modify-write
the universe through the revision-token retry and both land; two concurrent shares of the same
version produce one `201` and one `409`.

### Removes and deprecation are bindings

Per the cross-format precedent (`pypi.md`, `npm.md`, `cargo.md`, `conan.md`), each is a kind of
the registry-owned management API's closed vocabulary,
`docs/internal/plans/foundation/management-api.md` (its "Cross-format reconciliation" table
carries the Chef rows), submitted at `POST /api/v1/repositories/{name}/operations`, and the wire
routes are **bindings onto the same operations**. The handler declares them through the optional
`Operator` interface (`Operations()`, `Bindings()`, `Authorize`, `Apply`), and every entry point
calls the core's one `Submit` (`management-api.md`, "Dispatch: the optional `Operator`
interface"). The version route is no knife command's, but it is the reference Supermarket's own
route, which that spec's binding rule admits when the format spec records it ("a route of the
ecosystem's published reference API"):

| Operation | Kind | Client binding | Effect a client sees | Action |
|---|---|---|---|---|
| Remove a cookbook | `delete-package` | `DELETE /api/v1/cookbooks/{name}` from `knife supermarket unshare {name}` | The name leaves the universe and its documents answer `404`; every version is retired | `delete` |
| Remove a version | `delete-version` | `DELETE /api/v1/cookbooks/{name}/versions/{version}` (Supermarket route, `curl`) | The version leaves the universe and the cookbook's `versions`; it is retired | `delete` |
| Deprecate or undeprecate a cookbook, with an optional replacement | `annotate` | none | The cookbook document's `deprecated` and `replacement`, which knife's download reports | `push` |

Rules, applying the precedent rather than re-deciding it: each operation is one completed logical
write, exactly one snapshot, none for a refused one, and no blob-store object deleted directly
(`management-api.md`, "Every operation is one completed logical write"; `storage-and-gc.md`
AC15); authorization is the settled `(repository, action)` vocabulary with the action following
the kind, never the format (`management-api.md` AC9); hosted only, a proxied or virtual
repository answering `405` with problem type `repository-type` through both entry points; a
removal of something absent answers `404`, which knife reports as "The object you are looking
for could not be found" (captured). `delete-package` and `delete-version` return the
`{name}/{version}` coordinates they remove in their `Outcome` and `Submit` writes a `Retirement`
record for each, which a backwards repoint cannot undo because it is not snapshot content;
`annotate` retires nothing. Removing a cookbook's last version is allowed and leaves the
`Package` row (`data-model.md` AC33), where Supermarket refuses it with `409`, a divergence on the
exception list; a cookbook with no current version is **served as absent**, its document and
every route under it answering `404` with the not-found body, its name absent from the universe,
the list and search, because a cookbook document with a null `latest_version` is a shape no knife
command parses and Supermarket never serves; the row keeps the stored spelling and the category,
under which a later share of a new version revives it. Every declared kind has a `script`-driven
conformance case (`management-api.md` AC24, enforced by `conformance-harness.md` AC26), and the
same semantics and authorization hold from either entry point (`management-api.md` AC8).

Three wire details of the bindings. The version-removal route is reached by no knife command,
so its caller is `curl` or a script, presenting a registry token in any universal form (Bearer,
Basic) or a signed request, both of which the route-scoped declarations below admit on it.
`knife supermarket unshare {name} {version}` pastes the version into the path as
`DELETE /api/v1/cookbooks/{name}/{version}` (Context), which no route of this format matches:
it answers `404` by route grammar before any lookup, knife prints "could not be found", and the
cookbook is untouched, exactly as against Supermarket. The `annotate` payload carries
`deprecated` (a boolean) and `replacement` (a cookbook name of the same repository, or none);
`Apply` refuses `validation` a replacement naming no cookbook of the repository, because the
cookbook document renders `replacement` as the replacement's absolute cookbook-document URL
(Supermarket's `show.json.jbuilder`: `api_v1_cookbook_url(@cookbook.replacement)`), rendered at
serve time like every other document URL, and a URL that answers `404` would send a knife user
nowhere; a replacement later removed renders a URL that answers `404`, which is the operator's
to repair through a second `annotate`.

### Authentication: signed writes and a header for private reads

Neither of the two things Chef clients send was one of the verifier's presentation forms when
this spec was authored. The reconciliation it requested, per the two resolved decisions below,
has landed in `auth.md`, not as a per-handler exception: its client table carries the `knife`
and `berks` / `chef-cli` rows these captures grounded, its presentation-form table carries the
`X-Jfrog-Art-Api` and signed-request rows, and every check below runs in the shared
authentication layer. This section is this format's side of that design.

**Writes: Chef's signed-header requests against registered public keys.** knife signs `share`
and `unshare` with the RSA private key named by `client_key`, as the user named by `node_name`
(captured headers: `X-Ops-Sign: algorithm=sha1;version=1.0;` on share and `version=1.1;` on
unshare on both knife versions, `X-Ops-Userid`, `X-Ops-Timestamp`, `X-Ops-Content-Hash` and the
signature split across `X-Ops-Authorization-1` to `-6`). There is no field in which a bearer token
could travel. So:

- **A principal registers an RSA public key** as a credential through
  `credential-management.md`'s `POST /api/v1/keys` (its AC12): a PEM RSA key of at least 2048
  bits, with an immutable, instance-unique, non-secret **key name**, which the user sets as
  knife's `node_name` and which arrives as `X-Ops-Userid`; rotation is registering a new key
  and then `DELETE /api/v1/keys/{name}` on the old one. The registry never sees a private key,
  and what it stores, a public key, is not a secret, so `auth.md`'s "never stored recoverable"
  rule holds by construction. The key carries scopes exactly as a registry token does: bound to
  one repository unless the multi-repository opt-in was used, never exceeding its owner's grants
  (`auth.md` AC30), expiring by default, revocable on the next request.
- **The verifier is `auth.md`'s** ("Signed requests: the one client that carries no token", AC34),
  and what follows restates it only as this format's requirements, checked against it.
  **Verification uses the standard library only.** For protocols 1.0 and 1.1 the signature is a
  PKCS #1 v1.5 signature over the raw canonical string (mixlib's `private_encrypt`), verified by
  `rsa.VerifyPKCS1v15` with `crypto.Hash(0)`; for 1.3 it is PKCS #1 v1.5 over the SHA-256 of the
  canonical string. The canonical string is mixlib-authentication's
  (`SignedHeaderAuth#canonicalize_request`): method, the SHA-1 of the canonical path (repeated
  slashes collapsed, any trailing slash removed) in 1.0 and 1.1 or that path itself in 1.3, the content
  hash, the timestamp and the user id (SHA-1-hashed in 1.1), plus the sign description and
  `X-Ops-Server-Api-Version` in 1.3. Every captured request verified this way and failed when
  altered (Context). Building a canonical string is request parsing, not a cryptographic
  primitive, so `auth.md` AC9 holds; it is the ecosystem's published scheme, not one this registry
  designs, so "Nothing is invented" holds; and `auth.md` names canonical-string construction in
  its AC10 external-review scope "by name", because a canonicalisation mistake is a signature
  bypass.
- **The checks, all before anything is written:** the sign description is one of `sha1;1.0`,
  `sha1;1.1` or `sha256;1.3`; the timestamp is within 15 minutes of the server clock
  (mixlib's `authenticate_request` default); the key name resolves to an unexpired, unrevoked key;
  the signature verifies over the canonical string; and the content hash equals the digest of the
  request's file part for a multipart request (mixlib's `hashed_body` rule, which the capture
  confirms: `X-Ops-Content-Hash` equalled the SHA-1 of the tarball part, not of the whole body)
  and of the whole body otherwise. The signature and timestamp are checked when the headers
  arrive; the content hash is known only at the end of the tarball part, so the shared layer
  checks it there, and a mismatch aborts the write before commit, exactly as a failed digest does
  on an upload. How the pinned interface lets the shared layer see the end of a multipart part
  whose object the handler took from the part's filename is a re-open input
  `format-handler-interface.md` records under "Route-scoped and URL-borne credential
  declarations" (the Galaxy precedent). Every failure answers `401` with Supermarket's
  `AUTHENTICATION_FAILED` body.
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
the `X-Jfrog-Art-Api` header**, resolving to the same principal and scopes as every other form
(`auth.md` AC31), and accepts Basic wherever a client sends it. In `auth.md`'s presentation-form
table the header is **route-scoped** to this format's read routes: the handler declares, beside
its route-to-scope mapping, every `pull` route of this format (the universe, the cookbook,
version, search and list documents and the download) as accepting it, and the header presented on
the share or unshare route, or on any other format's route, is an authentication failure, never
anonymous (`auth.md`'s resolved off-route decision, was Q24 there). The signed-request form is
route-scoped the other way, to the two write routes and the version-removal route. The
documented recipe for
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
  whose object is none. `auth.md`'s fourth object kind, `descriptor` (its resolved
  name-free-document decision, was Q23 there), does not change that: the universe names every
  cookbook, version and dependency in the repository, so it fails the sentinel test by
  construction and stays none, exactly as Helm's `index.yaml` does, whereas the discovery routes
  `cargo.md` and `conan.md` first accepted the same limitation for are now descriptors. The
  working recipe is an **unpatterned `pull` beside a patterned `push` and `delete`**: `acme-*`
  shares and unshares `acme-tool` and nothing else. A patterned `pull` reads in-pattern documents
  and tarballs through `curl`. No route of this format is a descriptor.
- **A pattern refusal is answered as absence**, `404` with the not-found body, indistinguishable
  from a cookbook that does not exist, so a pattern is never an oracle over names outside it. On a
  version document Berkshelf then moves to its next source; on a share knife prints the message
  and fails; on an unshare it prints "could not be found".
- **The share's object is read from the request body**, the harder of the two reads
  `auth.md` admits for a `Scope(r)` ("A `Scope(r)` may read the request body to name its
  object", on its AC10 review surface by name), under `format-handler-interface.md`'s interim
  bound ("What `Scope(r)` may read", held by its AC12 helper): `Scope(r)` reads at most the
  leading part's headers and leaves the body readable in full for `ServeHTTP`, and whether such
  a read stays is the interface re-open's. What makes it safe is that nothing turns on the
  declared filename but the authorization outcome, and that a tarball whose `metadata.json`
  disagrees with it is refused **after** authorization by ingest rule 4, so a mislabelled part
  is authorized as one object and stored as nothing. The multipart part order is the client's
  (the `tarball` part first, captured on both knife generations); a share whose leading part is
  not the tarball gives `Scope(r)` no object, and a `Scope(r)` that cannot name its object is
  the authorizer's denial, the response an unauthorized caller receives (that spec's resolved
  failure-mode decision, was Q7 there: `401` credential-less, otherwise the existence rule's
  `404`), never a handler-rendered `400` before authorization, so the object is never guessed
  and the route never tells a caller whether the repository exists. The cost that decision
  names, a malformed upload presenting as a permissions problem with the cause only in the
  server log, falls on no pinned client.

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines, on a
version document or a download of either path, the handler answers `403` with
`{"error_code": "FORBIDDEN", "error_messages": ["{policy and rule, or the signal}"]}` as
`application/json`, written through the shared refusal writer `WriteRefusal` in
`internal/format` (`format-handler-interface.md` AC14), which on an HTTP/1.1 connection also
writes the status line `HTTP/1.1 403 Refused by policy: {condition}` (`supply-chain-policy.md`'s
resolved refusal-status-line decision, was Q10 there, and AC18). Berkshelf's download refusal
prints `Net::HTTPClientException 403` with the reason phrase in quotes (captured with the
canonical `"Forbidden"`), so the phrase is the one place the condition can reach a Berkshelf
user, which AC13's case captures. `403` rather than the existence rule's `404`, because the caller is authorized
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
(a byte-dependent rule at ingest) uses the same body, which knife prints (captured). This format's
row of `supply-chain-policy.md`'s "When a refusal binds, per format" table is `holds` ("Berkshelf
halts on `403` and falls through on any other universe status"), filled from these captures,
which AC13 asserts; that spec's warning that Berkshelf took a higher version from a second source
is closed by the virtual repository as the only source (Design, "Virtual repositories").

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
- **Search is a substring match, not a ranking.** Supermarket's `search` action is
  `Cookbook.search(q)`, a ranked full-text query with no fixed ordering (its
  `Api::V1::CookbooksController`), which no client depends on: knife prints every item it is
  given. This registry matches `q` case-insensitively as a substring of the cookbook's stored
  spelling or description, orders items by lowercased name as the list does, and answers an
  empty `q` as the list; a divergence on the exception list, so the recorded knife `search` flow
  replays against the item set and not the order.
- **`HEAD` is the serving door's answer, nothing of this format's.** No pinned client sends one
  (captured: every request was a `GET`, `POST` or `DELETE`). A `HEAD` on any route is the `GET`
  with the body withheld, the status and headers the same request would receive and no body,
  on the hosted path through `signing-service.md`'s door (its resolved `HEAD` decision, was Q24
  there, AC32) and on the proxied path cache-filling as the `GET` would be, never forwarded as a
  `HEAD` (`proxy-cache.md`'s resolved `HEAD` decision, was Q24 there, AC32); this format declares
  no revalidation probe, since no Supermarket route exposes a document's identity on a `HEAD`.

### Signing, provenance and policy

A Supermarket signs nothing and serves no signed document; Chef clients verify no signature on a
cookbook. The universe is write-triggered and generated but unsigned, so only the generation half
of the shared signing and index service is involved, and
`docs/internal/plans/foundation/artifact-verification.md` has no Chef scheme to verify: that spec
lists `chef.md` in its "Nothing" row and the conformance matrix's verification column renders
`none` for Chef (its AC24; `catalogue.md` AC7). Policyfile's lock `identifier` is a
client-computed content hash the registry neither produces nor sees.

**Advisory coverage is absent.** OSV has no Chef ecosystem (Context), and
`supply-chain-policy.md`'s coverage table records it ("Vagrant, Chef, Puppet, LuaRocks: no
ecosystem", its AC17), so the policy engine's coordinate-level matching finds nothing for a Chef
coordinate, an advisory-dependent rule attached to a Chef repository is refused at configuration
as `validation` naming the uncovered ecosystem (its AC11) unless an operator declares an
OSV-schema source that covers it through `policy.feed.sources` (its resolved advisory-sources
decision, was Q9 there), and the feed channel of the shared security-signal rule never condemns a
Chef coordinate. What remains is the byte-level cataloguer, which sees Ruby source and whatever
files a cookbook vendors, and licence rules, which depend on its coverage of a cookbook tarball
and are refused at configuration where it has none (the same AC11); the operator documentation
says so.

### The proxied path

The handler owns the request and classifies for the proxy layer's fetch-and-cache API per the
settled decisions in `proxy-cache.md`. The upstream is an `https://` Supermarket base URL
(`https://supermarket.chef.io`, or any Supermarket or Supermarket-compatible repository) on
`upstream-adapters.md`'s `https` adapter, validated at creation and `PATCH` by that spec's adapter
rules alone: an unreachable but well-formed upstream is accepted and no format probe runs inside
the creation transaction (its AC23; the same finding `cargo.md` answered in its resolved
sparse-only decision, was Q7 there). What this spec first checked at configuration, a JSON body
with `total` and `items` at `/api/v1/cookbooks?items=1`, is therefore checked at the first request
that needs the upstream: an upstream whose universe or listing is not the Supermarket shape answers
`502` with an error naming the requirement. The object-storage host the upstream's download
redirects to (S3 for supermarket.chef.io) is an entry of the upstream's host allowlist with role
`none`; the adapter follows the `302` inside itself, connects to no host off the list, never
records a presigned target as provenance or as a cached resolution, and lets no `Location`
reach a client (`upstream-adapters.md` AC7, AC8). An upstream credential, where the upstream needs
one, is presented by the adapter to the root host only (its AC6), and the client's credential is
never forwarded.

| Route | Classification |
|---|---|
| `/universe` | Mutable metadata with a TTL, revalidated with `If-None-Match` (the upstream answers `304`, captured; `upstream-adapters.md` AC15), parsed into records and regenerated into the stored form through the generator's `FromUpstream`, stored unsigned (`signing-service.md` AC20) |
| Cookbook document, version document, search, list | Mutable metadata with a TTL: the adoption check parses the upstream's JSON into a URL-free record stored as the cached document (`data-model.md` AC44's record), and the document is rendered per request from it through `ServeRendered` with this registry's URLs and the cache-scoped record as the freshness source, exactly as a hosted document is rendered from its package-level and version-level records; search and list entries are keyed by their query string (`q`, `items`, `start`), since the upstream's answer depends on it |
| Download | An immutable artifact: fetched through the upstream's `302` to object storage by the adapter, verified before commit (below), cached indefinitely, served `200` |
| Share, unshare, version removal | `405` with problem type `repository-type` |

**Freshness of the proxied universe.** Every document a remote serves carries the cache-scoped
`Last-Modified`, never the upstream's (`proxy-cache.md`, "Freshness of what a remote serves",
AC22; `data-model.md` AC44). supermarket.chef.io sends no `Last-Modified` and no version counter
in the universe (captured), so the layer has no ordering by which to recognise an older upstream
revision, and every revalidation answering `200` with a new `ETag` is adopted; the
regression-not-adopted rule has nothing to bind to on this wire, which is stated rather than
assumed. No Chef client revalidates the universe conditionally, so the record's only reader is
the transcript.

**URL rewriting is mandatory.** Every upstream URL (`location_path`, `download_url`,
`latest_version`, `versions`, `file`, `cookbook`) names the upstream, and a client given the
upstream's universe verbatim through this registry fetched the version document and tarball from
supermarket.chef.io directly (captured: the stub saw only `/universe`). Rewriting happens where
the stored form is expanded, so no upstream URL survives into any served document.

**Verification before commit.** No upstream document carries a digest, so the fetch uses
`proxy-cache.md`'s completion-only mode with a handler-supplied verifier (its resolved
completion-only decision, was Q15 there, AC20): the verifier checks the size against the version
document's `tarball_file_size`, and over the complete spooled body unpacks the tar index to apply
ingest rules 1 to 3 and check that `metadata.json` names the requested cookbook and version, a
handler-local structural check in that spec's sense. The size comes from the upstream version
document, which the handler resolves through the cache before the tarball fetch, fetching it
when absent, because Policyfile reaches a download straight from the universe and never requests
a version document (captured), so the download cannot rely on one being cached. A cached version
document can be stale against the upstream's own re-share of a version (Supermarket allows a
remove and re-share; its bytes and size then differ), so a size mismatch first revalidates the
version document once and retries the fetch once, and only a second mismatch, or a mismatch
against a freshly adopted document, is the integrity failure below; a `metadata.json` naming
another coordinate is one at once. Nothing is committed and no `Blob` row exists
unless it passes; a refusal creates no negative entry and is recorded for the operator under
`cache_fetch_failures_total`; the initiating client receives the body as it arrives but its
response completes only after the verifier passes, so a refusal is a short-closed transfer no
client accepts as the artifact; and coalesced waiters receive bytes only from the CAS after the
verified commit. The captured version swap is therefore never delivered through this registry
(AC22). **The first verified fetch pins the coordinate**: its CAS digest is recorded on the
`File`, and a refetch after eviction is made in the declared-digest mode against that pinned
digest, so a different body fails stream-and-verify as an integrity failure and one coordinate
serves one set of bytes for its life here even though the upstream promises nothing. What this
cannot catch is the captured tamper that keeps the name and version: with no upstream digest there
is nothing to catch it against on first fetch, which is stated as the ecosystem's limit rather
than assumed away.

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

These rows are Chef's instances of `proxy-cache.md`'s event classes ("Upstream removal or
replacement", which lists Supermarket under **removal with no signal**): a new version or changed
dependency set is an **ordinary metadata change**, a vanished version or cookbook is **removal
with no signal**, and a mismatched tarball is an **integrity failure at fetch**; the
regression-not-adopted class has no ordering to bind to on this wire (above). Detection happens at
revalidation, passively, per `proxy-cache.md`'s resolved passive-detection decision (was Q12).
**No row is an explicit security signal**: the Supermarket wire has none, and with no OSV data
the advisory feed has none either, so nothing condemns a Chef coordinate under the shared
security-signal rule; this is stated as a coverage gap.

### Virtual repositories

A virtual repository of format `chef` is possible, where `hex.md` found one impossible, because no
Chef document is signed or names a repository identity: the only repository-specific content is
the URLs, which this registry renders anyway. Per the resolved virtual-repository decision below,
resolution is **per cookbook name, in member order**:

- **The universe lists, for each name, the entries of the first member holding that name**, and
  nothing from later members under that name, whatever versions they hold. Names compare by
  their lowercased form, the key `Package.name` holds, and the supplying member's spelling is
  the one rendered, so a hosted `strongSwan-base` shadows an upstream `strongswan-base` as it
  would shadow the same spelling. A hosted member placed
  before a remote one therefore shadows the upstream's cookbook of the same name entirely, so the
  captured confusion (a higher upstream version winning Berkshelf's union) cannot occur for a
  client whose only source is the virtual repository.
- **The merging profile declares one member input**, the literal path `/universe` under each
  member's mount, with no template variable and no derivation, so the round bound is one
  (`signing-service.md`'s resolved member-input decision, was Q21 there, AC35; registration
  refuses a merging profile that declares none). A virtual's creation, or a member-list change
  adding a never-adopted remote, enqueues that remote's first fetch of exactly that route inside
  the transaction making the change, and a virtual read whose remote input is past the remote's
  TTL enqueues one revalidation of the remote per coalescing window, off the request's path,
  so a remote reached only through a virtual stays fresh (`proxy-cache.md` AC26).
- **Cookbook documents, version documents and downloads** resolve in the member that supplied the
  name, so a version document never mixes members.
- **Search and list** are the union by name, first member wins.
- A virtual repository creates no snapshots: its universe is the generator's `Merge` over the
  members' current universes, run as `signing-service.md`'s `index.merge` job when a member's
  changes and first at the virtual's creation, the previous merged universe serving until the new
  one commits (its "Virtual merges", AC19), unsigned like every Chef document; shares and removes
  against it answer `405` with problem type `repository-type`.

The accepted cost: a private cookbook shadows every upstream version of that name, including ones
the private repository never published, so a team that wants both must rename; the operator
documentation states it beside the recipe, and a member write is visible in the virtual only
within the merge staleness bound `signing-service.md` configures.

**Capabilities and rename.** `Capabilities()` declares proxy support `supported`,
reference-implementation availability `available` (the omnibus Supermarket, Design,
"Conformance, the clients and the corpus"), `Virtual: supported` and `Rename: supported`
(`format-handler-interface.md` AC13). A rename changes no stored byte: the stored universe carries
no URL, every absolute URL a document names is rendered at serve time from `server.public_url`
and the repository's current name, and every grant, retirement and snapshot resolves to the
repository by identity (`repository-lifecycle.md` AC12, whose rule for documents that embed the
name is met by rendering at serve time); the old name answers exactly what a never-existing
repository answers. The cost is the client configuration's, stated for operators: a Berksfile
`source` or a Policyfile `default_source` naming the old URL, and a Berksfile lock recording it,
must be updated. `repository-lifecycle.md` AC12 requires `conformance/chef/rename_test.go`,
enforced by the harness's case-set validator (`conformance-harness.md` AC26); AC26 carries it.

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
refusal of a respelled share, retirement of deleted versions, removal of a cookbook's last version
(and the cookbook then served as absent), the stored spelling kept, the `X-Jfrog-Art-Api` read
form, substring search in name order, and `quality_metrics` absent.

`Capabilities()` declares proxy support and the reference implementation `available`
(`format-handler-interface.md` AC13), the implementation being the omnibus Supermarket above, with
`Virtual` and `Rename` `supported` (Design, "Virtual repositories", its capabilities paragraph).

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
      newline), or arrives under a part filename whose name differs from `metadata.json`'s (the
      refusal after authorization that makes the body-read object safe); a share whose
      `Content-Length` exceeds `management.publish_spool_limit`, or whose tarball part outgrows
      it undeclared, is refused `413` in the Supermarket body with no byte spooled past the
      bound and no snapshot, through the spool facility `Deps` hands and under no bound of this
      handler's own; and a share whose name matches an existing cookbook in a different case is
      refused `409` naming the stored spelling.
- [ ] AC6: With knife's `node_name` set to a registered key name and `client_key` to its private
      key, a share or unshare whose `X-Ops-Content-Hash` differs from the tarball part's digest, whose
      tarball was altered after signing, which is signed by an unregistered, revoked, expired or
      other principal's key, carries an unknown key name in `X-Ops-Userid`, a timestamp more than 15 minutes from
      the server clock, a sign description other than `sha1;1.0`, `sha1;1.1` or `sha256;1.3`, or
      lacks any signed header, is refused `401` with the authentication-failed body, never treated
      as anonymous, with no snapshot; requests signed with protocol 1.0 and 1.1 by knife and with
      1.3 by mixlib-authentication directly are accepted; and a signed request over a connection
      this registry did not terminate with TLS is refused per `auth.md` AC27: this format's side of
      `auth.md` AC34, run through the real knife on both generations.
- [ ] AC7: A registered public-key credential created through `POST /api/v1/keys` is accepted
      only as a PEM RSA public key of at least 2048 bits under an unused key name, stores no
      private key material, is bound to one repository unless created with the multi-repository
      opt-in, is refused at creation with a scope its owner does not hold, expires by default, and
      after `DELETE /api/v1/keys/{name}`, after expiry or after its owner's grant is revoked is
      refused on the next signed request, while a new key registered under a new name signs a
      share at once: this format's side of `credential-management.md` AC12.
- [ ] AC8: `knife supermarket unshare {name}` on knife 19.3.2 and 17.10.0, and a `DELETE` of a
      version through `curl`, each remove exactly what they name in exactly one snapshot, after
      which the universe, the cookbook document and the version document no longer name it and a
      fresh resolution fails or falls back to a lower version; removing a cookbook's last version is
      allowed and leaves the `Package` row, after which the cookbook's document and every route
      under it answer `404`, its name is absent from the universe, list and search, and a share
      of a new version revives it under the stored spelling and category; `knife supermarket
      unshare {name} {version}` answers `404` and removes nothing; each removal writes a `Retirement` record per removed
      version, readable at `GET .../retirements`; a principal holding `push` without `delete` is
      refused `403` with knife printing its maintainer message; a removal of something absent
      answers `404`; and every removal against a proxied or virtual repository answers `405` with
      problem type `repository-type` and creates nothing.
- [ ] AC9: Each removal and a deprecation with a replacement, driven through the registry-owned
      management endpoint (`POST /api/v1/repositories/{name}/operations`, kinds
      `delete-package`, `delete-version` and `annotate`), produce the same served documents,
      exactly one snapshot each, and the same authorization outcome as the same operation through
      its client binding where one exists; a deprecation is accepted under `push` and writes no
      `Retirement` record; a deprecated cookbook's document carries `deprecated` and
      `replacement` as the replacement's absolute cookbook-document URL under the current base,
      which knife's download reports, a replacement naming no cookbook of the repository is
      refused `validation`, and the universe bytes are unchanged by it.
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
      principal and scopes; and `X-Jfrog-Art-Api` presented on the share route is rejected with
      an authentication error and never served as anonymous (the route-scoped rule).
- [ ] AC12: A signing key and token holding unpatterned `pull` with `push` and `delete` patterned
      `acme-*` share and unshare `acme-tool` through knife and are refused `404` with no snapshot on
      `other-tool`; a token holding only `pull` patterned `acme-*` is refused the universe, so
      Berkshelf and Policyfile resolve nothing through it, while `curl` with it reads `acme-tool`'s
      version document and tarball and is refused `other-tool`'s; in proxied mode the same
      patterned `pull` reads an in-pattern upstream cookbook through `curl` and is refused another;
      and a share whose leading multipart part is not the tarball is answered byte-identically
      to a share of an out-of-pattern object by the same credential (and `401` credential-less),
      never `400`, with no byte of the body past the leading part's headers read before
      authorization, asserted through the `Scope(r)` helper.
- [ ] AC13: A version document or download the shared policy layer refuses answers `403` with
      Supermarket's JSON error body naming the policy, written through `WriteRefusal` with the
      status line `403 Refused by policy: {condition}` on an HTTP/1.1 connection, on the hosted
      and the proxied path, the Berkshelf download failure printing that phrase;
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
      `opscode`, carries only absolute URLs under `server.public_url` and the repository's
      current name, and after the base URL is changed or the repository is renamed carries the
      new URLs with a changed `ETag`, no write and no snapshot; a matching `If-None-Match` and a
      second request for the same variant each call `Render` zero times; the gzip encoding
      carries `Vary: Accept-Encoding` and an `ETag` distinct from the identity encoding's; it is
      served through `index.ServeDocument`, the handler package setting neither `ETag` nor
      `Last-Modified`, and the URL expansion is the generator's `Render` stage in
      `internal/format/chef/index`, not in the handler package.
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
      at the network layer; the object-storage host is reached only because it is on the
      upstream's allowlist with role `none`, receives no upstream credential, and no `Location`
      reaches a client; from fresh client homes a second install reaches this registry while the
      stand-in receives no tarball request; and every tarball is byte-identical to the
      upstream's.
- [ ] AC21: Creating a remote whose upstream is a well-formed `https://` root succeeds with no
      upstream request inside the creation, and its first request against an upstream that does
      not answer the Supermarket shape answers `502` naming the requirement; a proxied universe
      is revalidated after its TTL and not before, with `If-None-Match`, and a `304` keeps the
      stored universe; every proxied document carries the cache-scoped `Last-Modified`, never the
      upstream's; a version published upstream becomes resolvable after
      the TTL; cached tarballs are never revalidated; an upstream `404` is negatively cached so a
      second request within the negative TTL makes no upstream request; an upstream `429` or `5xx`
      is neither cached as absence nor surfaced as not-found; upstream version keys that are not
      canonical `x.y.z` are absent from the served universe with a divergence recorded; and
      mixed-case upstream names are served byte for byte.
- [ ] AC22: A stand-in serving a tarball whose size differs from `tarball_file_size`, whose
      `metadata.json` names another version or cookbook (the captured version swap), which is not
      gzip tar or is truncated, or which after eviction arrives with a digest other than the pinned
      one, never has it committed or delivered in full to any client through this registry, the
      completion-only verifier refusing the first four and the pinned digest the last, with no
      `Blob` row and no negative entry created; a Policyfile download of a coordinate whose
      version document was never requested resolves that document before the fetch; a stand-in
      that re-shares a version with a new size has the second-size tarball committed after
      exactly one revalidation of the version document, while a size still disagreeing with the
      revalidated document is refused; the installing Berkshelf and Policyfile clients
      fail where a direct client installed the swapped bytes; and the real failure reason is
      recorded observably to the operator under `cache_fetch_failures_total`.
- [ ] AC23: A version vanishing from the upstream universe or answering `404`, and a cookbook
      answering `404` where it existed, leave the cached tarball served by coordinate, drop the name
      or version from the proxied universe, and record a divergence; and an ordinary upstream
      metadata change is propagated at the next revalidation: Chef's side of the settled removal
      table in `proxy-cache.md` (its AC13).
- [ ] AC24: A virtual repository whose members are a hosted repository then a supermarket.chef.io
      remote, configured as the only source, resolves a cookbook name held by the hosted member
      only from that member on both Berkshelf and both chef-cli versions even when the remote holds
      a higher version of the name or the same name in another case; resolves names only the
      remote holds from it; its creation fetches exactly `/universe` from a never-adopted remote
      member and nothing else, asserted at the network layer; serves every
      version document and download from the member that supplied the name; reflects a member's
      new version after the merge job runs, the previous merged universe serving until then; and
      answers `405` with problem type `repository-type` to shares and removals.
- [ ] AC25: Replay-match passes against a corpus recorded from supermarket.chef.io and from the
      pinned omnibus Supermarket covering the recorded surface named in Design, with every
      divergence named in Design on the exception list, `X-Remote-Request-Id` normalised, and no
      signed-header, `X-Jfrog-Art-Api`, Basic or session-cookie value in the committed corpus.
- [ ] AC26: The handler's `Capabilities()` declares proxy `supported`, reference-implementation
      availability `available`, `Virtual: supported` and `Rename: supported`; after a rename, a
      fresh `berks install` and `cinc install` on both generations resolve from the repository
      under its new name, every URL in the universe and the version documents naming the new
      name, in both modes, while the old name answers exactly what a never-existing repository
      answers.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/chef/hosted_berks_test.go` (both Berkshelf images; fresh `HOME`; transcript shape; byte comparison of the store; warm run request count at the network layer) |
| AC2 | conformance | `conformance/chef/hosted_policyfile_test.go` (both chef-cli images; lock identifiers recomputed by the harness from the fixture; `cinc export`) |
| AC3 | conformance | `conformance/chef/hosted_knife_test.go` (both knife images; a `state` seed of 150 cookbooks for list and search; each read command; `latest` through `curl`) |
| AC4 | conformance + integration | `conformance/chef/share_test.go` (both knife images; with and without category; duplicate share; follow-up installs); `internal/format/chef/share_test.go` (one snapshot holding version, tarball and universe; refusal creates none) |
| AC5 | integration + conformance | `internal/format/chef/ingest_test.go` (each crafted tarball through the handler; the declared and undeclared oversize parts through the `Deps` spool facility under an in-process bound change, the Supermarket-shaped `413`; the shared three-path assertion is `management-api.md` AC36's `internal/manage/spool_limit_test.go`); `conformance/chef/share_test.go` (a real-client share of a respelled name and of a README-less cookbook, message printed) |
| AC6 | integration + conformance | `internal/auth/signed_request_test.go` (the file `auth.md` AC34 names: each tampered header and body, each key state, each protocol version including a 1.3 fixture signed by mixlib-authentication in the client image, clock injection, the content-hash mismatch aborting before commit); `conformance/chef/auth_test.go` (knife with an unregistered key; plaintext refusal; the real `knife supermarket share` and `unshare` `auth.md` AC34 points at) |
| AC7 | integration + conformance | `internal/credential/public_key_test.go` (the file `credential-management.md` AC12 names: key size and type refusal, duplicate name, stored columns, scope binding, owner bound, expiry and revocation under an injected clock); `conformance/chef/signed_publish_test.go` (a registered key seeded as a `credentials` sub-entry with its private half delivered to the client container as a file, `conformance-harness.md` AC25; a share inside and outside scope, after expiry, after `DELETE /api/v1/keys/{name}`, and with a newly registered key) |
| AC8 | conformance + integration | `conformance/chef/remove_test.go` (both knife images; `curl` version removal under Bearer; last-version removal then the cookbook absent from every route and revived by a share; the pasted-version unshare; `push`-only refusal; absent target; proxied and virtual `405` `repository-type`); `internal/format/chef/remove_test.go` (one snapshot per operation, one `Retirement` row per removed version, the versionless cookbook's rendering) |
| AC9 | conformance + integration | `conformance/chef/manage_binding_test.go` (twin cookbooks, one per entry point, served documents compared; deprecation reported by knife download; the `script`-driven cases `management-api.md` AC24 requires for `delete-package`, `delete-version` and `annotate`, their presence enforced by `conformance-harness.md` AC26); `internal/format/chef/manage_binding_test.go` (snapshot count, authorization per entry point, universe bytes unchanged by deprecation; the cross-handler binding table test is `management-api.md` AC8's) |
| AC10 | conformance + integration | `conformance/chef/retirement_test.go` (re-share after removal through knife); `internal/format/chef/retirement_test.go` (after pruning under an injected clock, after whole-cookbook removal, across a backwards repoint) |
| AC11 | conformance + integration | `conformance/chef/auth_test.go` (private repository; both Berkshelf images with the `artifactory` source, both chef-cli images with `default_source :artifactory`; userinfo source; challenge equality; rejected and `pull`-less tokens; header assertions at the network layer; `X-Jfrog-Art-Api` on the share route refused); `internal/auth/credential_form_test.go` (the file `auth.md` AC31 names: every form resolving to one principal, the off-route presentation rejected) |
| AC12 | conformance + unit | `conformance/chef/auth_test.go` (the pattern-refusal case `auth.md` AC8 and `format-handler-interface.md` AC7 require, in both modes; patterned key and token through the `credentials` key; knife share and unshare; resolver refusal at the universe; `curl` reads; the leading-part case against the out-of-pattern answer); `internal/format/chef/scope_object_test.go` (the object table per route, `format-handler-interface.md` AC12; the body-read bound through its helper: the leading part's headers only, the body intact for `ServeHTTP`, a `Scope(r)` error on a non-tarball leading part) |
| AC13 | conformance + integration | `conformance/chef/policy_test.go` (hosted and proxied modes; rules through the `policies` key, admitted by the harness because this format's binding-table row is `holds`, `conformance-harness.md` AC26; a second-source stand-in holding the version; both Berkshelf and both chef-cli images; the raw status line and the Berkshelf output asserted; network-layer assertion); `internal/format/chef/policy_config_test.go` (advisory-dependent rule refused at configuration, `supply-chain-policy.md` AC11); `internal/format/refusal_writer_test.go` (the writer, `format-handler-interface.md` AC14 and `supply-chain-policy.md` AC18) |
| AC14 | integration | `internal/format/chef/download_binding_test.go` (download digest equals the shared tarball's across later writes, repoints and concurrent shares; property test over random write sequences) |
| AC15 | conformance + integration | `conformance/chef/rollback_test.go` (rollback through the management surface; `cinc update` on both chef-cli images; cold and warm Berkshelf with both remedies; promotion case); `internal/format/chef/pointer_universe_test.go` (universe bytes per pointer) |
| AC16 | conformance + unit | `conformance/chef/names_test.go` (`curl` for each case and version spelling; a mixed-case cookbook resolved by both Berkshelf images); `internal/format/chef/route_test.go` (segment grammar) |
| AC17 | integration + architecture test | `internal/format/chef/universe_test.go` (byte stability and `ETag` across unrelated writes, `304` and the memo hit with `Render` call counts, absolute URLs, base-URL change and rename without a snapshot, the per-encoding `ETag`; the Chef-shaped expansion fixture is shared with `signing-service.md` AC31's `internal/index/render_test.go`); `internal/format/chef/arch_test.go` (no URL expansion in the handler package); `internal/format/freshness_boundary_test.go` (no header setting in any handler package, `signing-service.md` AC11) |
| AC18 | integration | `internal/format/chef/concurrent_share_test.go` (two writers per case, fault injection at each write boundary, final universe and snapshot contents asserted) |
| AC19 | benchmark | `internal/format/chef/universe_bench_test.go` (a generated Supermarket-sized repository; share and universe serve; budgets and tolerance in the benchmark gate) |
| AC20 | conformance + integration | `conformance/chef/proxied_test.go` (stand-in serving recorded supermarket.chef.io answers and a second-host tarball declared as a `hosts` sub-entry of the `upstreams` entry, `conformance-harness.md` AC23; all six client images; network-layer assertions from fresh homes, including no credential at the object-storage host; byte comparison); `internal/format/chef/proxied_rewrite_test.go` (no upstream URL or `Location` in any served document or response) |
| AC21 | conformance + integration | `conformance/chef/proxied_ttl_test.go` (mutating stand-in with `ETag`; installs before and after the TTL); `internal/format/chef/proxied_universe_test.go` (creation with no upstream request and the first-request `502`, `upstream-adapters.md` AC23; the cache-scoped `Last-Modified`, `proxy-cache.md` AC22; non-canonical keys, mixed case, negative caching, throttling responses) |
| AC22 | integration + conformance | `internal/format/chef/proxied_integrity_test.go` (each bad tarball variant and a truncated body through the completion-only verifier; the version document resolved before a universe-only download; the upstream re-share with one revalidation then commit, and the persisting mismatch refused; CAS, `Blob` row and reference assertions; the pinned-digest refetch after eviction in the declared-digest mode; operator record, `proxy-cache.md` AC20); `conformance/chef/proxied_integrity_test.go` (the captured version swap through both Berkshelf and both chef-cli images, failing through this registry) |
| AC23 | integration | `internal/format/chef/removal_test.go` (stand-in presenting each event class; the shared-layer half is `proxy-cache.md` AC13's) |
| AC24 | conformance + integration | `conformance/chef/virtual_test.go` (hosted then remote members; a higher upstream version and a respelled case of the private name; both Berkshelf and both chef-cli images; provenance and the creation-time `/universe` fetch from the network layer; `405` on writes); `internal/index/virtual_merge_test.go` (shared with `signing-service.md` AC19 and AC35: the `index.merge` job for a Chef-shaped virtual, the previous universe serving until commit, the one literal member input and the round bound of one) |
| AC25 | conformance | `conformance/chef/replay_test.go` |
| AC26 | unit + conformance | `internal/format/chef/capabilities_test.go` (the four declarations, `format-handler-interface.md` AC13); `conformance/chef/rename_test.go` (`repository-lifecycle.md` AC12, presence enforced by `conformance-harness.md` AC26; Berkshelf and Policyfile resolving under the new name in both modes, old name `not-found`) |

The case set needs only keys already in the harness's closed `setup` vocabulary (its resolved
closed-vocabulary decision, was Q4): `repositories` with their visibility and type, including a
virtual repository's member order; `credentials`, patterned ones included, where the Chef cases
additionally need a registered public key under a key name, a `credentials` sub-entry whose
private half the runner delivers to the client container as a file (`conformance-harness.md`
AC25; `credential-management.md` AC12); an `upstreams` stand-in (a fixture server serving
recorded supermarket.chef.io answers with the object-storage second host as a `hosts`
sub-entry, the bad tarball variants, and a second-source stand-in for the fall-through and
refusal cases); `state` for pre-shared cookbooks and the `Retirement` records removed versions
would have left, the universe coming out of the seeded write through the write-path hook with no
seed-side code (`signing-service.md` AC21; `conformance-harness.md` AC24); and `policies` for
AC13. The runner-enforced obligations, both modes and the unauthenticated, unauthorized and
pattern-refusal cases in each, a `script`-driven case per declared management kind and
`rename_test.go`, apply from the sibling specs and the harness's case-set validator
(`conformance-harness.md` AC26) and are not restated per criterion here.

## Implementation Phases

### Phase 1: Hosted reads and the universe
- Waits on `docs/internal/plans/foundation/signing-service.md` reaching `planned`, and, for
  private repositories, on `auth.md` reaching `planned` with its route-scoped `X-Jfrog-Art-Api`
  form (Blocking preconditions)
- The format-first mount, the `Indexer` and its generator package `internal/format/chef/index`
  with the universe key's `Render` stage and gzip serve policy, the stored URL-free universe
  served through `index.ServeDocument`, the cookbook, version, search and list documents
  rendered through the pointer and served through `ServeRendered`, the direct download through
  `ServeFile`, name and version route grammar, the per-route addressed objects with the
  body-read bound on the share route, the `403` policy rendering through `WriteRefusal`, the
  universe benchmark

### Phase 2: Share
- Waits on `auth.md` (AC34) and `credential-management.md` (`/api/v1/keys`, AC12) reaching
  `planned` (Blocking preconditions)
- The signed-request route declaration with the end-of-part content-hash check in the shared
  layer, ingest validation, immutability and spelling rules, the write-boundary declaration
  exercised end to end under concurrency

### Phase 3: Removes and deprecation
- Waits on `docs/internal/plans/foundation/management-api.md` reaching `planned` (Blocking
  preconditions)
- The `Operator` declaration (`delete-package`, `delete-version`, `annotate`) with unshare and the
  version route as bindings, `Retirement` records through `Submit`

### Phase 4: Proxied path
- Waits on `proxy-cache.md` (its completion-only mode, AC20) and `upstream-adapters.md` (its
  `https` adapter) reaching `planned` (Blocking preconditions)
- Creation with no upstream probe and the first-request shape check, the object-storage host on
  the allowlist, classification per route, universe revalidation and regeneration through
  `FromUpstream`, the cache-scoped `Last-Modified`, URL rewriting, tarball verification and
  digest pinning, negative caching, the removal table, `405` `repository-type` on remote writes

### Phase 5: Virtual repositories and rename
- The per-name `Merge` as the `index.merge` job, member-scoped document and download resolution,
  `405` `repository-type` on virtual writes, `Capabilities()` with the rename case (AC26)

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
1.1), and `auth.md` then knew only registry tokens in four presentation forms, none of which knife can
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

Accepted cost: the `auth.md` and `credential-management.md` revisions, the SHA-1 and replay costs
named in Design, and a larger external review. Both revisions have landed: `auth.md` owns the
verifier ("Signed requests: the one client that carries no token", AC34) and names
canonical-string construction in its AC10 review scope, and `credential-management.md` carries the
registered public key at `/api/v1/keys` (PEM RSA of at least 2048 bits, an immutable
instance-unique key name that knife sends as `X-Ops-Userid`, rotation by registering a new key and
deleting the old; its AC12).

Rechecked on Fable 2026-10-08: confirmed. The options were framed fairly and B would have made
the ecosystem's publish command untestable here, which the charter's oracle stance cannot accept.
Under-stated in the record: the tarball part is spooled under `management.publish_spool_limit`
through the `Deps` facility, since the content hash and ingest rules 1 to 3 close only over the
complete part (Design, "The publish path"; AC5), and the body-read object this adoption
depends on is admitted by `auth.md` and bounded by `format-handler-interface.md`'s interim rule
(the was-Q6 record below).

### Resolved: how a private repository is read (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the central verifier accepts
a registry token in `X-Jfrog-Art-Api` as a presentation form (the fifth at the time; `auth.md`'s
table now holds it as a row route-scoped to this format's read routes), Basic keeps working where
a client sends it, every served URL stays absolute, and no download capability is minted; knife
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

Accepted cost: the `auth.md` revision and the documented knife limitation. The revision has
landed: the header is a route-scoped row of `auth.md`'s presentation-form table, asserted by its
AC31, and a presentation off those routes is an authentication failure (its resolved off-route
decision, was Q24 there).

Rechecked on Fable 2026-10-08: confirmed. B was priced honestly (a per-caller universe defeats
the stored document) and C gives up the format's reason to exist; the knife limitation is the
real cost and Scope names it.

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

Accepted cost: the serve-time transform and the `ETag` rule. `signing-service.md` has since
placed the renderer in this format's generator package (its resolved renderer-placement decision,
was Q3 there) and requires every generated document to be served through `index.ServeDocument`
(its AC11), so the transform lives beside the renderer, not in the handler.

Rechecked on Fable 2026-10-08: confirmed, fold amended. The gap the reconciliation reported
against `signing-service.md` is closed by that spec's resolved serve-time decision (was Q13
there): the expansion is the generator's `Render` stage declared on the universe key, with
`server.public_url`, the name and the mount as its inputs, memoised under
`index.render_memo_bytes`, and the `ETag` is the runtime's, derived from the stored body's
digest, the variant and the inputs and distinct per encoding (its AC30, AC31). This file had
kept the older wording (the base URL read through `Deps` as a re-open input, and the gap as
open); Design, "The universe", AC17 and its row now say what that spec says, and one cost the
record omitted is stated: a Supermarket-scale universe approaches the memo bound, so `Render`
streams and the serve cost sits in AC19's budget.

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

Accepted cost: the documented shadowing. The merge runs as `signing-service.md`'s `index.merge`
job (its "Virtual merges"), so a member's new version reaches the virtual within the configured
staleness bound rather than at once.

Rechecked on Fable 2026-10-08: confirmed, fold amended in two places. The record left the
name comparison implicit, and `Package.name` is lowercased, so the merge compares names by
their lowercased form and renders the supplying member's spelling (a hosted `strongSwan-base`
shadows an upstream `strongswan-base`); and `signing-service.md` AC35, adopted after this
record, requires a merging profile to declare its member inputs, which here is the one literal
`/universe` under each member's mount with a round bound of one (Design, "Virtual
repositories"; AC24 and its row).

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

Rechecked on Fable 2026-10-08: confirmed. One consequence the record left unstated is now in
Design: a cookbook whose last version is removed is served as absent until a new version is
shared, since a cookbook document with no `latest_version` is a shape no client parses and the
reference server never serves (Design, "Removes and deprecation are bindings"; AC8).

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

Accepted cost: the documented recipe and limitation. `auth.md` has since added a fourth object
kind, `descriptor`, for repository-wide documents that name no object (its resolved
name-free-document decision, was Q23 there), which lifted the same limitation for Cargo's
`config.json` and Conan's probe; it does not lift it here, because the universe names every
cookbook and would fail the kind's sentinel test, so it stays none as Helm's `index.yaml` does
(Design, "Addressed objects and pattern scopes").

Rechecked on Fable 2026-10-08: confirmed, fold amended. The record's third rule, that a share
whose first part is not the tarball is "refused `400` before any authorization decision", was
wrong on two counts: a handler-rendered status before authorization tells a caller the
repository exists, which the existence rule forbids, and it contradicts the interim bound
`format-handler-interface.md` put on a body-reading `Scope(r)` after this record was written
("What `Scope(r)` may read": at most the leading part's headers, the body left intact for the
handler) and `auth.md`'s admission of the read on its AC10 surface. The fold now says what
those specs say: a leading part that is not the tarball gives `Scope(r)` no object and is the
authorizer's denial (that spec's resolved failure-mode decision, was Q7 there), and the
mislabelled-part refusal is ingest rule 4's `400` after authorization, which is what makes the
read safe (Design, "Addressed objects and pattern scopes"; AC5 and AC12 and their rows). The
option chosen stands.

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

Rechecked on Fable 2026-10-08: confirmed. The decision rests on a captured asymmetry (`403`
halts both Berkshelf generations with a second source configured, `404` falls through), B
reproduces the confusion inside the registry, and the reason phrase through `WriteRefusal` is
the one channel the record under-sold, which AC13 now asserts.

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

Rechecked on Fable 2026-10-08: confirmed, fold amended. The record assumed the version
document is at hand when a tarball is fetched, and Policyfile never requests one (captured), so
the handler resolves it through the cache before the fetch; and it classed every size mismatch
as an integrity failure, which would also fire on a stale cached document after the upstream's
own remove-and-re-share and leave the coordinate unservable until the document's TTL lapsed.
The fold now revalidates the version document once and retries once before classing a mismatch
(Design, "Verification before commit"; AC22 and its row). The pin and the stated first-fetch
limit stand.

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

Rechecked on Fable 2026-10-08: confirmed. Berkshelf's exact key comparison is captured
behaviour, and the Supermarket rule it diverges from (`CookbookUpload#cookbook` assigning the
latest spelling) is a source citation, not a recollection.

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

Rechecked on Fable 2026-10-08: confirmed. `proxy-cache.md`'s set has since been extended
twice (its was-Q14 and was-Q17 mechanisms), each from a Tier 1 or Tier 2 spec, so the
sequencing argument holds unchanged for a Tier 3 format.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | 34a974d | authoring pass: grounded first draft, not a review | Grounded four ways: captured traffic from Berkshelf 8.1.23 and 8.0.5, chef-cli 6.1.39 and 5.6.9 and knife 19.3.2 and 17.10.0, from two Cinc Workstation images pinned by digest, on a dedicated Podman network against two logging, rule-injecting stubs implementing the Supermarket routes from its source (cold and warm installs, lockfile installs sending nothing, the underscored and dotted version spellings, Policyfile using `download_url` alone, direct `200` downloads accepted, knife download, show, search, list and install, share with and without a category, a duplicate share, unshare and the pasted version path, `401`, `403` and `409` renderings in JSON and text, a tampered and a version-swapped tarball installing silently, Policyfile's lock identifier failing only at export, Berkshelf's store keeping a rolled-back version while Policyfile adopted it, Berkshelf falling through on every universe status and on a version-document `404` but halting on `403`, Policyfile refusing conflicting sources, the captured dependency confusion, Basic from userinfo reaching only the universe, `X-Jfrog-Art-Api` reaching every URL, the Ruby 3.4 DSL failure, and `berks upload` targeting the Chef Infra Server); the captured signatures re-verified with Go's `crypto/rsa` alone; the Berkshelf, knife, mixlib-authentication, chef-cli, cookbook-omnifetch, Chef and Supermarket sources; the live supermarket.chef.io (universe size, shape, `ETag` and `304`, mixed-case names and newline versions, version document fields, the `302` to S3, case-insensitive routes, error shape); and OSV (no Chef ecosystem). The reference Supermarket was not run (no container image; uploads need a Chef Infra Server sign-in). Design built from that: the wire table; four decisive client behaviours; ingest and proxied verification rules; the shared-model mapping; the universe as a stored, URL-free, write-triggered document with the signing service's requirements; share as one write; removes and deprecation as management bindings; the auth.md reconciliation (registered public keys for signed writes, `X-Jfrog-Art-Api` for private reads); name objects with `404` pattern refusals; `403` policy refusals without elision; rollback served exactly, adopted by Policyfile and cold Berkshelf; the proxied classification with URL rewriting and verification; Chef's removal-table rows; per-name virtual repositories. Ten questions written in decision shape and adopted under the standing delegation: registered public keys (AC6, AC7), `X-Jfrog-Art-Api` reads (AC11), a URL-free stored universe (AC17), per-name virtual resolution (AC24), `409` and retirement (AC10), name objects and `404` pattern refusals (AC12), `403` without elision (AC13), size and identity verification with a digest pin (AC22), the first spelling kept (AC5), supermarket.chef.io user-configured. Twenty-five criteria, each with a Test Plan row. Sibling consequences recorded in the authoring report, not applied here. Stays draft; awaits an independent review. |
| 2026-09-28 | b43c566 | cross-spec reconciliation of the Wave 1 folds on Opus. Not a review | Not a review, and this spec's first reconciliation: every item in `agents/spec-loop/consequences.md` naming it verified against the current text of its source spec and of this file (Open item 24's requests, now met; themes 4, 5 and 8; auth reconciliation 4 and 6; credential-management 11; conformance-harness reconciliation 6; signing-service 11; upstream-adapters 12; management-api 11 and 12; artifact-verification 16; proxy-cache reconciliation 4, applied here though that item did not list this file; sweep 1 item 6). Applied: the universe as the `Indexer` generator's output, unsigned (`signing-service.md` AC24), served through `ServeDocument` with the URL expansion under `server.public_url` moved into the generator package (AC17), merged as the `index.merge` job (AC24) and regenerated through `FromUpstream`; the six index requirements checked one by one; signed writes cited as `auth.md` AC34 and `credential-management.md` AC12 (AC6, AC7 and their Test Plan rows now name those specs' files), the canonical-string review scope in `auth.md` AC10, the end-of-part content-hash check a recorded re-open input; `X-Jfrog-Art-Api` route-scoped with the off-route refusal (AC11); the management table carrying kinds through `Operator`, the version route admitted as a reference-API binding, `Retirement` core-held, `405` `repository-type` (AC8, AC9); the universe kept none under the descriptor kind, recorded in Design and the Q6 record; `WriteRefusal`, the reason phrase Berkshelf prints and the `holds` binding row (AC13); the proxied path on the `https` adapter with the object-storage host on the allowlist, the shape checked at first request under `cargo.md`'s was-Q7 precedent, the completion-only mode as offered with the pin refetched in declared-digest mode, the cache-scoped `Last-Modified` and the event-class mapping (AC20 to AC23); storage-and-gc AC21's read-path verification cited for a client that verifies nothing; the advisory gap cited to the coverage table; the public key seeded as a `credentials` sub-entry; new AC26 (`Capabilities()`, rename). Mismatches found, not queued: the configuration-time probe contradicts `upstream-adapters.md` AC23 (moved to first request, no judgement left); the handler-side URL expansion contradicts `signing-service.md` AC11 (moved to the generator package, with the missing serve-time expansion in `ServeDocument` reported). No new question; `fable_recheck` unchanged. Stays draft. |
| 2026-10-08 | 1743b4e | Fable recheck: full review + re-examination of the ten Opus-era adoptions, with the whole design under the adversarial lens as unreviewed (authored on Opus) | A review. Every sibling citation verified at HEAD (`signing-service.md` was-Q13, was-Q14, was-Q21, was-Q24 and AC1, AC3 to AC5, AC11, AC19 to AC21, AC24, AC28, AC30 to AC32, AC35; `format-handler-interface.md` "What `Scope(r)` may read", the credential-declaration re-open input, was-Q7, AC7, AC12 to AC14; `auth.md` "Signed requests", the body-reading `Scope(r)` bullet and its AC10 surface, AC7 to AC9, AC12, AC17, AC27, AC30, AC31, AC34, was-Q23, was-Q24; `management-api.md` the Chef rows, was-Q15 to was-Q20, AC8, AC9, AC24, AC36; `proxy-cache.md` was-Q12, was-Q15, was-Q19 to was-Q24, AC9, AC13, AC20, AC22, AC25, AC26, AC32; `credential-management.md` AC12; `upstream-adapters.md` AC6 to AC8, AC15, AC23; `conformance-harness.md` AC13, AC23 to AC26; `storage-and-gc.md` AC15, AC16, AC21; `data-model.md` AC33, AC35, AC36, AC44; `supply-chain-policy.md` AC11, AC17, AC18 and the `holds` row; `artifact-verification.md` AC24; `repository-lifecycle.md` AC12; `catalogue.md` AC5, AC7; `project-charter.md` AC9; `cargo.md` was-Q7); the Supermarket `show.json.jbuilder` and `Api::V1::CookbooksController` re-read for `replacement` and `search`. Brought current from `agents/spec-loop/consequences.md`: the serve-time URL expansion is `signing-service.md`'s `Render` stage with the runtime's `ETag` and per-encoding gzip (items 676, 718, 744, 789; Design, AC17); `ServeRendered` and `ServeFile` named for the per-request documents and the tarball, hosted and proxied; the member input `/universe` declared for the merging profile (item 862; AC24); the body-read `Scope(r)` under FHI's interim bound with the mislabelled-part refusal after authorization (items 993, 1111; AC5, AC12); `HEAD` as the door's answer on both paths; the spool bound on the share (management-api was-Q20; AC5). Adversarial findings folded: a cookbook with no current version is served as absent (AC8); the version-removal route's credential forms and the pasted-version unshare's `404` stated; the `annotate` payload validated and `replacement` rendered as the cookbook-document URL (AC9); the proxied download resolves the version document before the fetch and revalidates once before classing a size mismatch (AC22); virtual names compare lowercased (AC24); search defined as substring in name order, on the exception list. Verdicts: was-Q1, Q2, Q5, Q7, Q9, Q10 confirmed; was-Q3, Q4, Q6, Q8 confirmed with their folds amended; none superseded. Open Questions empty, 26 criteria each mapped, nothing blocking: `fable_recheck` cleared, `draft` to `planned`. |
