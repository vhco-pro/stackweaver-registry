---
status: planned
status_description: "Planned by the Fable recheck of 2026-10-01 at 90102bf: a full review pass over the Opus-authored whole (claim verification at HEAD of every sibling citation, adversarial lens at full strength on the captured behaviour of both apk lines, key rotation, the architecture-set client case, origin as the advisory key and the data-loss keep-alive, constitution compliance) plus the re-examination of the eleven questions adopted at authoring and the three question-less Opus judgements. Brought current first: a keyless remote now contributes to a signed virtual under anchor class none with verdict absent (signing-service was-Q20, AC36; artifact-verification was-Q2 as amended), the alpine-keys recipe is advice for class signature, the member input is the was-Q21 template over the other members' trees and architectures with the was-Q22 read-driven cell for a tree only the remote holds (AC20), and the arch recheck's optional-member finding does not arise because the signature is inside the one document. Verdicts: Q1, Q3, Q5, Q8, Q9, Q10, Q11 confirmed; Q2 confirmed with the index-404 honesty note; Q4 amended (the key name's instance host defined; AC2 scoped outside a rotation window); Q6 amended in vocabulary; Q7 amended in fold and superseded in part by Q12, owner-facing (literal-name shadowing, records composed whole, the provider case captured, the rewrite held as fallback); Q13 raised and adopted after rpm was-Q12 (a withdrawn .SIGN entry on a keyless remote is a regression not adopted; AC19). The keep-alive fold confirmed with its row-contention and dl-cdn-404 costs stated. 25 criteria, each with a Test Plan row; thirteen questions resolved, zero open; check-spec zero failures; fable_recheck cleared. Build stays gated by the Tier 1 definition of done (charter AC9, catalogue AC5) and on signing-service, management-api, upstream-adapters and artifact-verification, all planned."
description: "Spec for Alpine apk repositories served to apk-tools 2 and 3: repositories holding many trees with one APKINDEX.tar.gz per tree and architecture, generated and signed by the shared signing service with a prepended RSA signature segment, publisher-signed packages whose bytes the registry never alters and whose own signature no repository install checks, the two trust layers kept apart, a proxied path serving Alpine's signed indexes verbatim after verification, and virtual trees merged with per-name shadowing and re-signed."
author: michielvha
goal: "Serve Alpine hosts and container builds a private apk repository and a verified cache of an Alpine mirror that stock apk-tools 2 and 3 install from with only a key file added to /etc/apk/keys, credentials only in the repository line or netrc, and a network restricted to this registry."
priority: "medium"
issue: 32
created: 2026-09-26
covers:
  - "internal/format/alpine/**"
  - "conformance/alpine/**"
---

# Plan: Alpine apk repositories

The Alpine package repository format, hosted and proxied, on one handler: one `APKINDEX.tar.gz`
per repository tree and architecture, a signature carried inside it as a prepended gzip-compressed
tar segment, and the `.apk` packages its records locate. apk-tools 2.14 and apk-tools 3.0, on the
Alpine releases that ship them, are the oracle on both paths.

## Context

Alpine sits in Tier 2 of `formats/catalogue.md` as the single-ecosystem family "Alpine" (the row
"Alpine (apk)"). **Its build is gated by `project-charter.md` AC9 and `catalogue.md` AC5**: no
handler code for a Tier 2 ecosystem exists before every Tier 1 format has met its definition of
done and the owner has recorded a `continue` verdict at the charter's build step 8. This spec
exists now because the owner directed on 2026-09-26 that all 33 ecosystems be specced up front
(the catalogue's "Every ecosystem below is specced now; only building is gated"), so that the gate
decides what is built and never what is written; a `shrink` verdict parks it.

It is in the **signed-index class**. Every tree's index carries a signature the client checks
against a key file it holds, and the client refuses an index whose signature does not verify, so
a hosted Alpine repository cannot exist without the shared signing and index service the charter
builds at step 7, before Helm. RPM (`formats/rpm.md`) and Debian (`formats/debian.md`) are the
Tier 1 members of the class; this spec follows `rpm.md`'s treatment of two trust layers, its
per-repository key and its refusal rendering, and states where apk differs.

Grounding for this draft, stated up front because the constitution asks for evidence or silence:

- **Captured client traffic.** No Alpine client runs on this Fedora host, so the official images
  were run pinned by digest (the linux/amd64 manifest; the index digest in brackets): Alpine
  3.22.6 (`docker.io/library/alpine@sha256:3e9b4b680bfc9fb5269227cffbd6d42be39fbf7c0b908123913864aa4447e764`
  [`sha256:5291449c3df73caf6ed85e649dec1b9e818b39a5d8c871e97afc13e9cd5e8fa8`]; apk-tools 2.14.12)
  and Alpine 3.24.2 (`docker.io/library/alpine@sha256:d56c381f961d307a21b3ca004cf1e3910f106644aefb1f43e654c8a56c4fd395`
  [`sha256:294b683cb724975bec92580e1e685676bd4b50bda910ddb8c51d4cabeaec77e6`]; apk-tools 3.0.8),
  the two client lines, with the signature cases repeated on Alpine 3.20.10
  (`sha256:c64c687cbea9300178b30c95835354e34c4e4febc4badfe27102879de0483b5e`; apk-tools 2.14.4) and
  Alpine 3.23.6 (`sha256:1f3591b8a02ea153f41c5bba878ad477f63ab3d19349762cb77504db02a23e15`;
  apk-tools 3.0.8). The stub was a logging HTTP and TLS server in a pinned `python:3.13-slim`
  container (`sha256:37134a49d21d2120e4c4d73bb76f8a4ab9aef31f096f7ec2ead48c2feead4332`) on two
  dedicated Podman networks, one `--internal`, answering for `repo.test`, `other.test` and
  `mirror.test` under a throwaway CA; it recorded every request with its headers and applied
  per-path status, host, redirect and Basic-credential overrides. The fixtures were genuine:
  seven packages built with each image's own `abuild` (3.15.0 on 3.22, 3.17.0 on 3.24; both emit
  v2 packages): a dependency pair, three versions of one name, a name with `++`, a `_rc1` version,
  an `x86_64` package and `noarch` packages; keys made with `abuild-keygen` (RSA 4096) for a
  repository, a publisher and a rogue; indexes made with `apk index` (with and without
  `--rewrite-arch`) and signed with `abuild-sign` as `RSA` and `RSA256`, by the right key, the
  wrong key, none, two keys in both orders, and over stale content; packages unsigned,
  rogue-signed, and with their data or control stream swapped; and v3 `Packages.adb` indexes made
  with `apk mkndx --sign-key`. The stub is not a reference implementation; the captures prove
  what the clients send and how they react.
- **The published contract.** Alpine has no standards-body specification. Read this run: the
  Alpine wiki's "Apk spec" page (package and index layout, `C:` checksum, `.PKGINFO` fields), the
  apk-tools manual pages at tags `v2.14.12` and `v3.0.8` (`apk(8)`, `apk-repositories(5)`,
  apk-keys(5), `apk-v2(5)`, `apk-mkndx(8)`, `apk-index(8)`, `apk-cache(5)`), and the sources that
  decide behaviour the pages do not state: `src/database.c` and `src/apk.c` at `v2.14.12`,
  `src/context.c` at `v3.0.8` (the four-hour index cache default) and `libfetch/http.c` at
  `v3.0.8` (credential sources, `If-Modified-Since`, `Range` on resume, redirect handling).
- **The live upstream.** dl-cdn.alpinelinux.org sampled directly: `v3.24`, `v3.22` and `edge`
  `main/x86_64/APKINDEX.tar.gz` with their headers, `304` answers to `If-Modified-Since` and
  `If-None-Match`, a `206` to a range, a `404` on `Packages.adb`, the architecture directories,
  `MIRRORS.txt` and `last-updated`; the v3.24 main index taken apart (5,961 records, every one
  `A:x86_64`, signed `.SIGN.RSA.alpine-devel@lists.alpinelinux.org-6165ee59.rsa.pub`); the
  `zlib-1.3.2-r0` package taken apart and its `C:` recomputed; superseded versions probed; and a
  real `apk add` from the mirror on both pinned images with their stock keys.
- **OSV.** `ecosystems.txt` lists `Alpine`; the Alpine export holds 4,679 records, every one an
  `ALPINE-CVE-*` and none a `MAL-` record, across 23 `Alpine:v3.N` release variants and none for
  edge, each keyed by the source package (`purl` qualifier `arch=source`); `openssl` in
  `Alpine:v3.22` at `3.5.0-r0` answers 48 records and its binary subpackage `libssl3` answers none
  (captured 2026-09-26). Detail in "Advisories, OSV and the security-signal rule".

Where the documentation and the captures disagree or the documentation is silent, the captures
win, and the differences are recorded because they would otherwise be built from the documents.
`apk-v2(5)` states what a signature covers in terms of whether a data hash is present;
recomputed with raw RSA against the captures, that means exactly the index's own gzip stream for
an index and exactly the control stream for a package. Nothing documents that
installing from a trusted index never checks the package's own signature, which both client
lines do (captured). `apk-repositories(5)` gives the package path as `$base_url/$arch/...`
without saying `$arch` is the package's own `A:` field rather than the index's directory, which
sends a `noarch` record to a `noarch/` directory (captured). No page says that an `apk update`
seconds after another makes no request on apk-tools 2.14.12 (captured), or that a `301` on a
repository whose URL carries credentials prints the password in clear (captured on both).

Seven things make this format worth a careful spec. **The index is a signed, per-tree,
per-architecture document**: one publish regenerates and re-signs every index its packages
appear in. **The signature is a tar segment glued in front of the index**, a separate gzip
stream carrying `.SIGN.{alg}.{keyname}`, and the key it names is found by **exact filename** in
`/etc/apk/keys`, so a key's name is part of the wire contract. **The package's own signature is
not a trust input on a repository install**: a trusted index vouches for each package through
`C:`, the SHA-1 of its control stream, and the `datahash` inside it, so an unsigned package
installs and a tampered one does not (captured). **The package path comes from the record's
architecture**, so a `noarch` record must be rewritten or served under `noarch/`. **apk picks
the highest version across every configured repository**, whichever repository lists it
(captured), so dependency confusion is the default behaviour. **Credentials in the repository
URL leak**: apk-tools 2.14.12 prints them in `apk policy`, and both lines print them in the
warning a `301` produces. And **a refusal is enforceable only at the package level**: a refused
package fails the install with no fallback, but a refused index makes apk skip the repository
and `apk add` install from others with exit status 0 (captured, Design, "Fallback").

## Blocking preconditions

**The handler interface re-open must complete before this handler starts**, as for every Tier 1
and Tier 2 handler (`format-handler-interface.md` AC8). Alpine is Tier 2, so the catalogue's
Tier 1 gate (its AC5) and the charter's breadth verdict (its AC9, build step 8) both precede it;
the re-open is recorded here anyway, from this side, because a gate enforced on one side only is
enforced nowhere. This format adds no root-anchored mount: apk takes a base URL with any path, so
everything lives under `/apk/{repository}/`.

**The shared signing and index service must be `planned` before Phase 1 and built before the
handler reaches `main`.** Every hosted and virtual tree's index is a generated signed document
produced by `docs/internal/plans/foundation/signing-service.md`, which the charter builds at step 7
before Helm as the production form of what the step 4a prototype learned
(`write-triggered-services-prototype.md`). Alpine is one of that spec's consumers of both halves:
the handler declares the optional `Indexer` interface, its generator lives in the sibling package
`internal/format/alpine/index`, its profile declares the prepended-segment assembly and the
`dual-signature` rotation profile (`signing-service.md`, "Who depends on this", "The generator
contract", "Storage", "Rotation profiles"). What this format requires of it is stated in Design
("What the signing and index service must provide"), each item mapped onto that spec. Every
package also goes out through that spec's `ServeFile` form behind `Documents` in `Deps` (its
resolved handler-rendered decision, was Q14, AC32). Hosted reads cannot be tested without it,
because a tree with no generated index has nothing for a client to read.

**The management API must be `planned` before Phase 2, and it is the only hosted write path.**
Publishing packages, deleting versions and packages, setting a repository's architecture set and
rotating its key are operations of `docs/internal/plans/foundation/management-api.md`, placed by
its cross-format reconciliation table on `publish`, `delete-version`, `delete-package` and
`configure`, with key rotation arriving through its signing-key routes (its AC32;
`signing-service.md` AC15). The charter builds its core at step 2 and completes it at step 9; no apk
client writes. Phase 1's hosted reads are testable without it, because the harness's `state`
vocabulary seeds packages through the shared write path, and the index runtime runs before every
commit on a repository whose handler declares an `Indexer`, the seed write included, so seeded
state comes out generated and signed with no seed-side code (`signing-service.md` AC21,
`conformance-harness.md` AC24).

**The proxied path depends on two shared services, both now specified**: the transport of
`docs/internal/plans/foundation/upstream-adapters.md` (the `https` adapter with root-host-only
credentials, an allowlist for redirects, conditional revalidation and `http://` roots refused; its
requirements table answers this format with AC6, AC7, AC14, AC15 and AC22; built at charter step
4), and the apk signed-stream and package-integrity entry of
`docs/internal/plans/foundation/artifact-verification.md` (its AC12; built at step 4b). Publish is
synchronous (the resolved batch-publish decision below), so no write of this format is deferred; the
one deferred piece is the virtual merge, which `signing-service.md` runs as the `index.merge` job on
`docs/internal/plans/foundation/async-operations.md`'s runner, whose queue core the charter lands at
the start of step 4b, before this format could be built.

## Scope

**In scope:**

- **The apk v2 read surface** under `/apk/{repository}/{tree}/{arch}/`: `APKINDEX.tar.gz` and the
  packages its records locate, `GET` and `HEAD` on both, with single ranges on every file (the
  `Range: bytes={offset}-` libfetch sends when resuming a partial download); and the key document
  at `/apk/{repository}/keys/{keyname}.rsa.pub`.
- **Repositories holding many trees** (the resolved tree decision below): a tree is the base URL
  a client's `/etc/apk/repositories` line names, identified by a path inside the repository, so
  one repository can hold `v3.24/main` and `v3.22/main` as Alpine's own mirror does; each tree
  serves one index per architecture of the repository's declared architecture set.
- **Hosted packages** published through the management API, their bytes stored exactly as
  published, their `.PKGINFO` parsed into the version document, their placement in a tree
  declared at publish.
- **Generated, signed indexes**: on every write that changes a tree, the shared signing and index
  service regenerates each affected architecture's `APKINDEX.tar.gz`, with `noarch` records
  rewritten to that architecture (the resolved `noarch` decision below), and signs it with the
  repository's key as an `RSA256` signature segment.
- **The two trust layers**: package signatures carried by the publisher, never added or altered
  by this registry, and verified by it only as a verdict for policy (the resolved package-signing
  decision below); index signatures always produced by this registry for hosted and virtual trees.
- Deleting a version and a package, with the core-held retirement set and the write-boundary
  declaration `data-model.md` requires, and key rotation through a dual-signature window.
- Name, version and filename rules: case-sensitive names, `pkgver-rN` versions compared only for
  equality, filenames resolved by lookup and never by splitting, and percent-decoding of the forms
  a client might send.
- Non-interactive authentication in the forms apk sends: Basic from URL userinfo (preemptive),
  from `~/.netrc` and from `HTTP_AUTH` (both after a challenge).
- The per-route addressed objects `auth.md`'s pattern scopes evaluate, and the rendering of a
  shared policy refusal on every route.
- **The proxied path** against an Alpine mirror (dl-cdn.alpinelinux.org or any mirror in
  `MIRRORS.txt`, or a private one): `APKINDEX.tar.gz` as mutable metadata with a TTL, verified
  against configured upstream keys before it is served; packages as immutable artifacts verified
  against the index record's `C:`, `S:` and the `datahash` inside them; upstream indexes and
  packages served verbatim; negative caching; this format's rows of the removal table.
- **Virtual repositories**, merged per tree and architecture with per-name first-member
  resolution and signed with the virtual repository's own key (the resolved virtual-repository
  decision below).
- Advisory binding through a per-repository OSV ecosystem declaration, matched on the package's
  origin (the resolved OSV decision below).
- The handler's `Capabilities()` declaration, repository rename and virtual aggregation (Design,
  "Capabilities and lifecycle").
- The two pinned clients above as conformance oracles on both paths, with the client network
  restricted to this registry and its stand-ins.

**Out of scope for v1**, each with its reason, recorded because the interface spec's definition
of done requires the deliberately unimplemented surface to be named:

- **Any client-side publish protocol.** None exists: apk only reads. Hosted content arrives
  through `docs/internal/plans/foundation/management-api.md`;
  `abuild` writes to a local directory, never to a server.
- **The v3 index (`Packages.adb`) and v3 packages.** apk-tools 2.14.12 cannot read a v3 index
  ("opening v3 ...: No such file or directory", captured), every Alpine release's default
  repository lines are untyped and therefore v2 on both lines, dl-cdn publishes no `Packages.adb`
  (live `404` on v3.24 and edge), and both pinned `abuild` versions emit v2 packages, so there is
  neither a client that needs v3 nor an upstream to proxy it from (the resolved v3 decision
  below). A v3 package presented at publish is refused.
- **Registry-applied package signatures.** No repository install checks them (captured), and
  re-signing rewrites the file's first stream, so the served bytes and `S:` would differ from the
  publisher's; the resolved package-signing decision below records the choice.
- **Serving `MIRRORS.txt`, `last-updated` or a mirror list.** A client pointed at one base URL on
  this registry has no mirror to choose, and a second configured mirror is the configuration that
  re-opens fallback (Design, "Fallback").
- **Absolute `pkgname-spec` and any other redirection of package fetches to another host.** It
  exists only in v3 indexes, which are out of scope, and it sent apk-tools 3.0.8 to another host
  (captured with `apk mkndx --pkgname-spec https://other.test/...`); a hosted index never names
  another host.
- **The client's local package cache and `apk cache`.** They live on the client; the registry
  serves them as ordinary reads.

## Design

### The wire surface, as captured

Every route hangs off `/apk/{repository}/`, format-first per `format-handler-interface.md`'s
resolved URL-shape decision; no route is root-anchored. apk builds every URL from the base URL it
was given, so the handler never needs the externally visible base URL and never rewrites a
document.

| Surface | Shape, as the pinned clients send it |
|---|---|
| Index | `GET {base}/{arch}/APKINDEX.tar.gz`, `User-Agent: libfetch/2.0` on both lines, no `Accept`, no conditional header. `apk update --force-refresh` adds `Cache-Control: no-cache`. The client caches the index as `/var/cache/apk/APKINDEX.{8 hex}.tar.gz` and treats it as fresh for four hours by default (`4*60*60` in `database.c` at 2.14.12 and `context.c` at 3.0.8); a second `apk update` seconds after the first made **no request** on 2.14.12 and a full `GET` on 3.0.8, while `apk -U` and `--force-refresh` re-fetched on both (captured) |
| Repository line | An untyped line is a v2 repository on both lines (`apk-repositories(5)`); a `v3` line makes 3.0.8 fetch `{base}/{arch}/Packages.adb`, while 2.14.12 takes the whole line as a location and warns "opening v3 https://...: No such file or directory" (captured). Neither line probed `Packages.adb` for an untyped line |
| Packages | `GET {base}/{A}/{P}-{V}.apk` where `{A}`, `{P}` and `{V}` are the record's `A:`, `P:` and `V:` fields: a record with `A:noarch` in the `x86_64` index sent both lines to `{base}/noarch/...` (captured, `404`). `+` travels raw (`swplus++-1.0-r0.apk`), and no client sent `HEAD`. libfetch sends `Range: bytes={offset}-` only when resuming a partial file (source); no capture resumed |
| Integrity | A package is accepted when its control stream's SHA-1 equals the record's `C:` and its data stream's SHA-256 equals the `datahash` in its `.PKGINFO`; a swapped data stream and a swapped control stream were each refused ("BAD signature" on 2.14.12, "v2 package integrity error" on 3.0.8) |
| Credentials | URL userinfo (`https://__token__:secret@host/...`) is sent as `Authorization: Basic` **preemptively on every request**; `~/.netrc` and `HTTP_AUTH=basic:{realm}:{user}:{password}` are sent **only after a `401`**, one retry per request, so every file costs two requests (captured on both lines). A wrong credential is not retried |
| Redirects | Followed: a same-host absolute-path `Location` keeps the userinfo credential, a full URL to another host drops it (captured, and `libfetch/http.c`). A `301` makes both lines print "WARNING: Permanently redirected to https://__token__:s3cret@repo.test:443/..." with the password in clear (captured) |
| Retries | None: each refused or failed file is requested once per command (captured with `403`, `404` and 500) |

**Error rendering**, captured, because a refusal nobody can read is a refusal nobody can act on:
neither line prints a response body on any status. A package answered `403` prints "ERROR:
swhello-1.1-r0: Permission denied" on 2.14.12 and "ERROR: swhello-1.1-r0: HTTP 403: Forbidden" on
3.0.8; a `404` prints "package mentioned in index not found (try 'apk update')" and "HTTP 404: Not
Found"; `apk add` exits with the number of failed packages. An index answered `401`, `403` or
500 prints "WARNING: updating and opening {url}: Permission denied" (both `401` and `403`) or
"remote server returned error" on 2.14.12, and "HTTP 401: Unauthorized", "HTTP 403: Forbidden" or
"HTTP 500: Internal Server Error" on 3.0.8. An index whose signature fails prints "UNTRUSTED
signature" or "BAD signature". Either way the repository counts as unavailable, `apk update`
exits non-zero (2 on 2.14.12, 1 on 3.0.8, for one repository), and `apk add` resolves as if the
repository were absent. A `404` on the index itself was not among the captures (the captured
`404` is the package path a `noarch` record sends the client to); this spec reads it as one more
repository-level failure rendered like the three above, and AC8's architecture-set case, which
answers exactly that `404` to a real client of a removed architecture, is where the reading is
proved rather than assumed.

### Fallback: what a refusal can and cannot stop

`julia.md` found that Pkg falls back to origin on every refusal, `terraform.md` that Terraform
never does, and `rpm.md` that a refused package does not fall back while a refused index does.
apk behaves like `rpm.md`'s Fedora and zypper clients, on both lines, including with client
egress open (captured); `supply-chain-policy.md`'s "When a refusal binds, per format" table records
it as `package-level`:

- **A refused package does not fall back to another repository.** With two repositories
  configured and both listing the identical `swhello-1.1-r0` (same `C:`), a `403` on the first
  failed the install with exit status 1; no request reached the second repository's copy. apk
  does not retry or re-plan.
- **A refused index makes the repository disappear.** A `401`, `403` or 500 on the first
  repository's `APKINDEX.tar.gz`, or a signature it cannot verify, printed a warning, and `apk add
  swhello` installed the package from the second repository and **exited 0**.
- **Across repositories the highest version wins, not the first repository.** With a repository
  listing `swhello` 1.0 and 1.1 first and another listing 1.2 second, both lines installed 1.2
  from the second (captured). Order breaks ties between identical versions only.

Three rules follow, and the conformance cases assert them. **A policy refusal is always
package-level**: an index never fails because one package in it is refused, so a refusal can
never turn into a skipped repository (the resolved refusal-rendering decision below). **The
recommended configuration names one repository line on this registry**, usually a virtual tree,
with no other line; that configuration holds a refusal whatever the client's egress allows
(AC14). **A repository-level failure is not enforcement**: an authentication failure or an outage
silently hands resolution to whatever else is configured, which the operator documentation states
in those words.

### Two trust layers

The captures show that apk verifies the two layers at different times, against keys found the
same way, and that only one of them guards a repository install, so the design keeps them apart
end to end.

**The index signature** is the first gzip stream of `APKINDEX.tar.gz`: a tar segment without
end-of-archive blocks holding one or more files named `.SIGN.{alg}.{keyname}`, followed by the
index's own gzip stream holding `DESCRIPTION` and `APKINDEX` and ending in end-of-archive blocks
(the live v3.24 index and every generated fixture, taken apart). The signature is RSA PKCS #1 v1.5
over the digest of exactly the index stream: SHA-1 for `RSA`, SHA-256 for `RSA256` (recomputed with
raw RSA against the captures); `apk-v2(5)` also names `RSA512` and `DSA`.

- Both lines and 2.14.4 accept `RSA` and `RSA256` (captured); Alpine itself signs `RSA`, meaning
  SHA-1, with 512-byte signatures from RSA 4096 keys (live).
- The key is `/etc/apk/keys/{keyname}` by **exact filename**: the same public key installed under
  another name was refused as "UNTRUSTED signature" by both lines for a v2 index, while apk-tools
  3.0.8 matched a v3 index by key identity whatever the name (captured, as apk-keys(5) states).
- An unsigned index and one signed by an unknown key are "UNTRUSTED signature"; an index whose
  body changed after signing is "BAD signature" (captured).
- **Several signatures are allowed, and the first one whose key the client holds decides**: an
  index carrying a rogue signature and then a valid repository signature, both over the index
  stream, verified in either order on 2.14.4, 2.14.12 and 3.0.8; an index whose first trusted
  signature was invalid was "BAD signature" although an untrusted one followed (captured). This is
  what makes key rotation possible without breaking clients (Design, "What the signing and index
  service must provide", item 5).
- `--allow-untrusted` accepts an unsigned index (captured); the operator documentation never
  recommends it.

**The package signature** is the first gzip stream of the `.apk`, the same shape, over exactly the
control stream (the `.PKGINFO` and any install scripts); the data stream is covered by the
`datahash` inside `.PKGINFO` (recomputed against the captures).

- **A package installed from a trusted index is never checked against its own signature.** An
  unsigned package and one signed by a key the client does not hold both installed from a
  repository-signed index on both lines, and so did a package signed by the publisher's key on a
  client holding only the repository key (captured). What protects the package is the index:
  `C:` is the SHA-1 of the control stream, `S:` its size, and the control stream holds the
  `datahash`, so a swapped control or data stream is refused (Integrity row above).
- The package signature is checked when a package is installed as a local file (`apk add
  ./x.apk` refused "UNTRUSTED signature", exit 99, without the publisher key and installed with
  it), by `apk verify`, and by apk-tools 2.14.12's `apk index`, which refused to index packages signed by
  an untrusted key unless given `--allow-untrusted` (captured).
- The index-to-package link is SHA-1 over the control stream, and the control stream carries the
  install scripts. That is the ecosystem's own limit, not this registry's: a SHA-1 collision on a
  control stream would pass `C:`. The registry cannot strengthen what the client checks; it
  records the SHA-256 of every whole file as its CAS digest, verifies proxied packages against
  every check the client makes plus the `datahash`, and never serves bytes other than the ones
  whose `C:` it indexed.

Per the resolved package-signing decision below, the package layer is the **publisher's**: the
registry stores and serves package bytes exactly as published, verifies the signature against the
repository's trusted package keys through `artifact-verification.md` so policy can require a
verdict, and never signs a package. Per the resolved index-key decision below, hosted and virtual
indexes are signed by the shared signing service with the **repository's** key, and proxied
indexes serve the upstream's signature verbatim. Unlike RPM, a client of a hosted repository
needs only the repository's key file for repository installs.

### Trees and architectures

A client names a base URL, and apk appends `/{arch}/APKINDEX.tar.gz` (live layout:
`/alpine/v3.24/main/x86_64/`). Per the resolved tree decision below:

- **A repository holds any number of trees.** A tree is identified by its path inside the
  repository, zero or more segments of `[A-Za-z0-9._+-]`, none equal to `.` or `..`, and a first
  segment other than `keys`; the empty path is the repository root. The path is declared by every
  publish, so `v3.24/main` and `v3.22/main` in one repository are independently generated and
  signed trees.
- **A request path splits at its last two segments**: the file, and the architecture before it;
  everything earlier is the tree. There is no ambiguity, because the architecture is always the
  second-to-last segment.
- **The repository declares its architecture set** (the resolved `noarch` decision below),
  defaulting to the nine dl-cdn serves for v3.24 (`aarch64`, `armhf`, `armv7`, `loongarch64`,
  `ppc64le`, `riscv64`, `s390x`, `x86`, `x86_64`, live). Every tree serves a signed index for each
  of them, an architecture with no packages serving a signed index with no records, which both
  lines accept (captured); a request for an architecture outside the set answers `404`.
- **A remote repository's trees and architectures are the upstream's**: the path is appended to
  the mirror root.

### Mapping onto the shared model

The levels are exactly those `data-model.md` provides; no table is added.

- **A `Package` is `{tree}/{name}`** (or `{name}` for the root tree), with the name exactly as
  `.PKGINFO`'s `pkgname` gives it: names are case-sensitive, and `apk add SWHELLO` found nothing
  for `swhello` on both lines (captured).
- **A `Version` is the `pkgver` string**, `{version}-r{rel}` as apk writes it (`1.0_rc1-r0`). Its
  document holds the `.PKGINFO` fields an index record carries (`pkgdesc`, `url`, `license`,
  `origin`, `maintainer`, `builddate`, `commit`, `provider_priority`, `size` as installed size,
  and the repeated `depend`, `provides`, `install_if` and `replaces`), and per file the
  architecture, `C:` value, size, SHA-256, `datahash` and the signature facts (key name,
  algorithm) the verifier reported.
- **`File`**: one per architecture a version is built for, `{arch}/{name}-{version}.apk`, keyed by
  CAS digest; a `noarch` version has one file, listed in every architecture's index (below).
- **The retirement set of deleted versions** is not in the package-level document: it is the
  core-held `Retirement` record `management-api.md` moved it to ("Retirement is core-held", its
  resolved retirement-placement decision, was Q3) and `data-model.md` owns (AC35), with the
  coordinate `{tree}/{name}/{version}`. The package-level document holds nothing format-specific.
- **The repository-level document** holds the architecture set, the key reference, and per tree
  and architecture the current index body (the index's own gzip stream) as a CAS digest, protected
  by the fourth GC mark root (`storage-and-gc.md` AC16), since a large tree's index crosses any
  sensible inline threshold (live: v3.24 main's is 528,388 bytes compressed and 2,370,051 bytes of
  `APKINDEX` text).
- **The signature segment is not snapshot content.** Each signature is a `Signature` record keyed
  by (repository, body digest, key id, profile), and the served `APKINDEX.tar.gz` is assembled at
  serve time by framing the records as the prepended `.SIGN.RSA256.{keyname}.rsa.pub` tar segment
  before the stored body, a concatenation and never a signing operation (`signing-service.md`'s
  resolved signature-placement decision, was Q2 there, which names Alpine's segment as an assembly
  rule; its AC6; `data-model.md` AC37). A key rotation is therefore a batch of records, never a
  snapshot.
- **The OSV ecosystem declaration is not in this handler's documents.** It is the core-parsed
  `advisory_ecosystem` field of the repository (`Alpine:v3.24`), stored beside the retention rules
  and the `policy` document, absent from every snapshot and from the handler's `settings`, which the
  core validates and evaluates and the handler never reads (`supply-chain-policy.md`, "OS-package
  repositories declare their ecosystem"; `data-model.md` AC28; `repository-lifecycle.md`,
  "Configuration").
- A remote repository's document holds, per tree and architecture it has served, the current and
  retained index revisions, their verification results, and the filename map built from each
  (below); none of it is snapshot content. It retains one superseded revision per tree and
  architecture, the default count of `proxy-cache.md`'s resolved retained-revision decision (was
  its Q19), and every blob it keeps for the current or the retained revision (the
  `APKINDEX.tar.gz` body a map is built from and the map once built) is on this document's
  **declared blob-digest list**, the only way a document keeps another blob alive
  (`storage-and-gc.md` AC16). A `C:` or an index digest a kept document merely names is metadata
  and keeps nothing alive; cached packages are held by their own cached references. The list sits
  on the repository-level document because a tree's index per architecture is a repository-wide
  revision set, where `proxy-cache.md`'s resolved declaring-document decision (was Q22) places
  it, so adoptions of different trees and architectures of one remote serialise on that row under
  the revision-token retry `data-model.md` makes mandatory. The honest bound is the remote's
  trees times its architectures, not a handful: a remote over a whole mirror root
  (`https://dl-cdn.alpinelinux.org/alpine/`) serves every branch dl-cdn keeps times nine, each
  cell adopted at most once per TTL and a filename map built at most once per adopted revision,
  so the row sees at most that many commits per TTL, spread by the clients that drive them; the
  recommended one-remote-per-branch shape (the resolved OSV decision below) keeps it at the
  branch's components times nine. None of it is ever
  LRU-evicted: a remote's current metadata ends only when an adoption supersedes it beyond the
  retained count or the remote is deleted, and is counted in `cache_metadata_bytes{repository}`
  outside the quota (its resolved metadata-eviction decision, was Q21, AC29), while cached
  packages are files under the quota.

### The hosted publish path and what counts as a write

Nothing on any apk wire writes. The hosted path is fed by the registry-owned management API,
`docs/internal/plans/foundation/management-api.md`. Per the cross-format precedent (`pypi.md`'s
resolved hosted-yank decision, with `npm.md`, `cargo.md`, `hex.md`, `rpm.md` and `terraform.md`),
each operation is one completed logical write through the shared write path, bound onto the kind
that spec's cross-format reconciliation table assigns the RPM, Alpine and Arch rows, carrying that
kind's action, hosted only, its trigger verified by this registry's integration tests and its
effect by the real clients (`docs/internal/analysis/management-surfaces-and-the-oracle.md`: Alpine
is a format none of whose management triggers has a client). The handler declares the kinds through
`Operator.Operations()` and implements them in `Apply` inside the transaction `Submit` opens; it
declares no bindings, since no client writes. Every declared kind is driven by a `script` case
(`management-api.md` AC24, enforced by `conformance-harness.md` AC26):

| Operation | What the operation carries | Effect a client sees | Kind | Action |
|---|---|---|---|---|
| Publish packages | A tree path and one or more `.apk` files (the resolved batch-publish decision below) | Every package appears in its architectures' indexes and installs after the client's next `apk -U` or `apk update --force-refresh` | `publish` | `push` on every object it adds |
| Delete a version | Tree, name and version | It leaves every index; installing it fails; its package routes answer `404`; the coordinate is retired | `delete-version` | `delete` |
| Delete a package | Tree and name | Every version leaves and is retired; the `Package` row survives (`data-model.md` AC33) | `delete-package` | `delete` |
| Set the architecture set | A list of architecture names | Indexes appear or stop for those architectures in every tree: a client of an architecture removed from the set finds its index answering `404` and installs nothing from the tree, and one whose architecture is restored installs again after its next `apk -U` (AC8) | `configure` | admin role |
| Rotate the key | The phase, through the signing-key routes: create the new key, activate it (opening the window), retire the old one (closing it) | The dual-signature window of item 5 below | `configure` | admin role |

What this registry enforces on ingest:

- The files arrive through `management-api.md`'s publish, as committed upload-session blobs or a
  multipart convenience publish, both producing the same snapshot delta (its "Publish through the
  API", AC14, AC15); the handler's `Authorize` reads each file's `.PKGINFO`, which precedes its data
  stream, by a bounded peek to report its object. Each file must be a v2
  package: two or three concatenated gzip streams whose tar content is an optional signature
  segment, a control segment beginning with `.PKGINFO`, and a data tarball, with `pkgname`,
  `pkgver` and `arch` present and `datahash` equal to the SHA-256 of the data stream; anything
  else, a v3 package included, is refused with `422` and nothing committed. The package's
  signature is verified inside the write through `Deps`' `Verifier` under
  `artifact-verification.md`'s apk entry against the repository's trust set, and its verdict
  recorded, not enforced (that spec's AC12 and AC21; below).
- The stored filename is the canonical `{pkgname}-{pkgver}.apk`, whatever the upload was called.
- **A coordinate that already exists in the tree is refused with `409`** unless the bytes are
  identical, which is idempotent and creates no snapshot, the CI-retry case: this format declares
  `management-api.md`'s unchanged publish, so a publish whose every file finds identical bytes at
  its coordinate completes its `Operation` with no snapshot reference and `unchanged: true` (its
  resolved unchanged-publish decision, was Q15, AC5), while a batch mixing identical and new files
  commits the new ones. A **retired** coordinate is refused with any bytes, including after the
  deleting snapshot has been pruned and across a backwards repoint, by the shared write path with
  the `retired` problem (409) naming it: `Authorize` claims each file's `{tree}/{name}/{version}`,
  and the write transaction checks the claims when they are declared, before `Apply` runs, and
  again at commit, so a deletion committing between the two cannot let the publish through
  (`management-api.md`'s resolved retirement-check decision, was Q14, AC12): the cross-format
  retirement rule, with nothing for this handler to carry forward. A `noarch` build and an architecture-specific build of one
  version in one tree occupy the same path in that architecture's index, so the second is refused
  with `409` naming the first.
- An architecture outside the repository's declared set is refused with `422`.
- Whether an unsigned package, or one signed by a key outside the repository's trusted package
  keys, is refused is a repository policy rule over the verifier's verdict (`supply-chain-policy.md`,
  "Signature and attestation state is a consumed verdict", its AC15); the operator documentation
  says that no repository install checks it.
- A publish or management operation against a remote or virtual repository answers `405` with the
  `repository-type` problem (`management-api.md` AC7).

`data-model.md` requires each format spec to declare its ecosystem's write boundaries. Alpine's
declaration:

- **One publish is one completed logical write**, however many packages it carries, together
  with the regeneration and re-signing of every index it changes, in one snapshot.
- **Each deletion is one write** however many versions it removes, the core writing each
  `Retirement` record in the same transaction; a retention pass over a repository is one write.
- **A change to the architecture set is one write** that regenerates and re-signs every affected
  index.
- **A key rotation creates no snapshot.** Opening and closing the dual-signature window are each
  one atomic batch of signature records with no content change (`signing-service.md`'s resolved
  rotation decision, was Q11 there, AC7 and AC8).
- A proxied repository creates no snapshots; index revisions and packages arriving from an
  upstream are cache materialisation.

### Every hosted index is a write-triggered signed document

Per the resolved index-key decision below, a tree's indexes are produced by the shared signing
and index service inside the write that changes them, **stored, never rendered on request**,
exactly the class `write-triggered-services-prototype.md` defines for Debian's `Release`. The
trigger is the shared write path's: the index runtime is the registered consumer of the pre-commit
hook every write transaction runs (`data-model.md` AC37, `storage-and-gc.md` AC25), so a publish,
a deletion, a seeded `state` entry and a retention pass all come out regenerated and signed, and
the handler holds no code that requests it (`signing-service.md` AC1). The bytes come from the
generator package `internal/format/alpine/index`, which imports nothing of the registry beyond
`internal/index`'s value types, and neither it nor the handler can reach a key or a signing library
(`signing-service.md` AC2). The rules the service applies for this format, stated as this format's
requirements:

- **Regeneration inside the write.** A publish or deletion regenerates and signs the indexes of
  the architectures it touches in the tree it targets, in the same snapshot as the change
  (`data-model.md`'s one-write-one-snapshot rule). A `noarch` package touches every architecture
  of the tree; no other tree is touched, so writes to different trees never contend: the
  generator's `Affects` maps a change to exactly those keys, and every other key keeps its bytes,
  signature and `ETag` (`signing-service.md` AC4).
- **Under contention, both land.** Two concurrent publishes into one tree each produce indexes
  listing the other's packages once both are complete: the runtime takes a per-document lock
  before it regenerates, with the revision-token retry `data-model.md` makes mandatory for what the
  lock does not cover (`signing-service.md` AC28).
- **Package files outlive the index that stops naming them only as the retention rule allows.** A
  client fetches the index and then the packages it names, and caches the index for four hours; a
  package route therefore serves any file an index of a retained snapshot names, so a client
  holding an older index is not broken by a later publish. A deletion is the exception by design:
  its routes answer `404` at once, and the client prints "package mentioned in index not found"
  (captured).
- **`APKINDEX.tar.gz` is served with `Cache-Control: no-cache`** and an `ETag` derived from the
  assembled bytes, so a re-sign changes it, and packages with `Cache-Control: public,
  max-age=31536000, immutable`; the index goes out through the runtime's `index.ServeDocument` with
  these values carried in the generator's profile (`signing-service.md` AC11, which names
  `alpine.md`'s values), and every package through `ServeFile`, with the CAS digest as a strong
  `ETag` under a package-level serve policy carrying the `immutable` header (its AC32). No client sends a conditional request (captured), so the headers serve
  intermediaries rather than the clients.
- **No hosted route ever answers a redirect**, because a `301` prints the client's credential in
  clear (captured).
- **A repoint restores the indexes.** The index bodies live in the repository-level document, so
  a rollback serves exactly the indexes of the snapshot it targets; where a body has no signature
  record under the current key (a rollback across a rotation), the missing records are produced
  inside the repoint write (`signing-service.md` AC9). The retirement set is core-held and
  untouched by a repoint (`data-model.md` AC33, AC35).
- **No pointer-scoped signed wrapper is needed, confirmed.** `debian.md` found that apt ignores a
  `Release` older than its own, and the consequences queue asked whether an `APKINDEX` needs the
  same pointer-held envelope. It does not: the signature segment carries no date, no version and
  no expiry, the index text has none either, and apk compares nothing between the index it holds
  and the one it fetches; it re-fetches whole once its four-hour cache age lapses or on `apk -U`,
  sends no conditional request (captured), and adopts whatever verifies. A rollback therefore
  reaches every client at its next fetch, and this format declares no pointer document in its
  profile. The served `Last-Modified` is still the pointer's forward-moving `moved_at`
  (`data-model.md` AC36), rendered by `ServeDocument`, which costs nothing here and keeps an
  intermediary cache honest.

### What the signing and index service must provide

Stated so the dependency on `docs/internal/plans/foundation/signing-service.md` cannot be lost,
following `rpm.md`'s and `hex.md`'s statements of the same dependency; that spec lists these as
`alpine.md`'s seven items (its "Who depends on this" table) and each is mapped onto its contract
below:

1. **Generation of a tree's index per architecture** from the version-level records of every
   package in the tree whose file is that architecture or `noarch`: an `APKINDEX` text whose
   records equal, field for field and in order, what `apk index --rewrite-arch {arch}` from
   apk-tools 2.14.12 writes for the same packages (so `A:` is the index's architecture for a
   `noarch` package, `C:` is `Q1` plus the base64 SHA-1 of the control stream, `S:` the file
   size), a `DESCRIPTION` naming the tree and the snapshot (apk prints it in `apk update`
   output), both in one gzip-compressed tar stream ending in end-of-archive blocks. The stream's
   bytes are produced once and stored; the signature is over those bytes, so the service never
   recompresses a signed index. This is the generator's `Generate`, deterministic over the same
   records (`signing-service.md` AC25), its output checked against `apk index` by AC7 here. The
   `DESCRIPTION` names the tree and the snapshot, not the repository's name, so that a rename
   changes no index byte and needs no re-sign (Design, "Capabilities and lifecycle";
   `signing-service.md` AC29).
2. **One RSA key per hosted and per virtual repository**, 4096 bits as `abuild-keygen` makes them,
   with a **key name** unique for the key's lifetime and never reused, of the form
   `{repository}@{instance host}-{8 hex}` after abuild's `{email}-{hex}` convention, where
   `{repository}` is the name at the key's creation (the grammar
   `^[a-z0-9]+(?:[._-][a-z0-9]+)*$` of `repository-lifecycle.md` AC2 makes it a valid
   `/etc/apk/keys` filename) and `{instance host}` the host of `server.public_url` then
   (`deployment.md`), both fixed in the name from that moment: a rename or a changed public URL
   changes no key name, because the name is a file on every client (Design, "Capabilities and
   lifecycle"); and a signing
   operation over the index stream's bytes returning an RSA PKCS #1 v1.5 signature over SHA-256.
   The signature is stored as a `Signature` record and **framed onto the body at serve time** by
   the profile's assembly rule: a gzip-compressed tar segment holding one file per signature,
   `.SIGN.RSA256.{keyname}.rsa.pub`, with no end-of-archive blocks, prepended to the stored body
   (`signing-service.md`, "Storage: bodies in the snapshot, signatures as records", AC6); a plain
   ustar entry without the PAX header `abuild-sign` writes verified on both lines (captured).
   `RSA256` rather than Alpine's own `RSA` because it avoids SHA-1 at no cost: 2.14.4, 2.14.12 and
   3.0.8 all accept it (captured). The handler never sees the private key, which an architecture
   test asserts as `write-triggered-services-prototype.md` AC5 does for Debian
   (`signing-service.md` AC2); every signature is self-checked through `internal/verify` before the
   write commits (its AC17).
3. **The key document**: the PEM public key served at `/apk/{repository}/keys/{keyname}.rsa.pub`
   and shown in the management surface with its name, because the client must save it under
   exactly that name (captured); every key currently valid for the repository is served there. The
   public form is byte-checked as "an apk key served under exactly its key name"
   (`signing-service.md` AC12).
4. **Synchronous regeneration and signing inside the write**, dispatched by the pre-commit hook
   (`signing-service.md` AC1) within a management request's latency budget; there is no
   asynchronous half for a hosted write.
5. **Rotation through a dual-signature window**: `signing-service.md`'s `dual-signature` rotation
   profile, which cites this format's capture (its "Rotation profiles", AC7, AC8). Activating the
   new key produces, for every currently served index of the repository, hosted or virtual alike,
   a second signature record under it, so every served index carries **two** `.SIGN` entries in
   its leading segment over the same index stream, the old key's and the new key's, and a client
   holding either key file verifies it (captured in both orders); closing the window drops the
   old records, and AC2's one-entry shape is the shape outside a window. Each is **one atomic batch of signature records, no
   snapshot**, and no reader observes an index signed by a key the key document lacks. apk has no
   mechanism to fetch a key (apk-keys(5): keys are files an administrator adds), so rotation is
   invisible to clients that install the new key file during the window and breaks those that do
   not, which the operator documentation states. Each phase is a `configure` operation on the
   signing-key routes (`management-api.md` AC32).
6. **Contention handling and storage** as in the section above: the per-document lock and the
   revision-token retry (`signing-service.md` AC28), CAS storage above the inline threshold
   streamed without buffering (its AC5), byte-derived `ETag`s through `ServeDocument` (its AC11),
   and retention of every package an unpruned snapshot's index names, which needs nothing of the
   service because the packages are snapshot content (its "Storage" section).
7. **The virtual merge** (below): the generator's `Merge`, run as the deferred `index.merge` job
   when a member's tree changes, coalesced per virtual, never on a request's path, and signed with
   the virtual repository's key (`signing-service.md`, "Virtual merges", AC19), re-run when a
   remote member adopts a new index revision through the runtime's adoption hook and fed a
   never-adopted remote through the member-input paths the profile declares (its resolved
   remote-member decision, was Q16, AC35: the re-merge on member revalidation this spec asked
   for, now met).

Verification of upstream signatures is not the signing service's: it belongs to artifact
verification (`signing-service.md`, "The produce/verify boundary").

### What artifact verification must provide

Of `docs/internal/plans/foundation/artifact-verification.md`, per `supply-chain-policy.md`'s
resolved verification-ownership decision; that spec lists both items as `alpine.md`'s requirements
and answers them with its apk v2 signed-stream entry and the integrity entry beside it:

1. **An apk v2 signed-stream verification entry** that takes a file (an index or a package), a
   set of named public keys, and answers in that spec's vocabulary: `verified` with the key name,
   `failed` with the reason `untrusted-key` (every signature names a key outside the set, or
   there is no signature) or `bad-signature` (a configured key's signature does not verify), or
   `absent` when the trust set holds no apk key at all (its resolved verdict decision, was Q2
   there, as amended on Fable: `untrusted-key` needs at least one entry of the kind, so a keyless
   remote's documents never read `failed`), with the client's own semantics: signatures are read
   from the leading segment in order, those naming no configured key are skipped, and the first
   naming a configured key decides; `RSA`, `RSA256` and `RSA512` are supported, and the digest is
   over the stream that follows the segment (the index stream, or the control stream of a
   package). Answered by the `apk` scheme with the first-trusted-key rule
   (`artifact-verification.md` AC12), reached only through `Deps`' `Verifier`, never by importing
   `internal/verify` (`format-handler-interface.md` AC15); the keys are the repository's trust
   set, provisioned in cases through the harness's `trust` key (`artifact-verification.md`
   AC25).
2. **Package integrity**: the control stream's SHA-1 compared with an expected `C:`, the file size
   with `S:`, and the data stream's SHA-256 with the `datahash` in `.PKGINFO`, answering each
   separately, together with the package signature's verdict against the repository's trusted
   package keys (hosted) or the upstream's keys (proxied), so policy can rule on it. Answered by
   the same entry, which answers `C:`, `S:` and `datahash` separately with `mismatch` on each
   tampered case (`artifact-verification.md` AC12); a package-signature verdict is recorded, not
   enforced (its AC21), computed from the single reader the caller commits from (its AC26). The v2
   format parsing (the leading tar segment) lives in that spec's `apk` scheme package, the one place
   a format-entangled primitive may know a format.

The conformance matrix's verification column needs a passing hosted and a passing proxied
verification case for Alpine (`artifact-verification.md` AC24), which AC3 and AC15 carry together
with that spec's own `conformance/alpine/signature_test.go`.

### Names, versions and filenames

- **Nothing folds.** Names and versions are compared byte for byte (captured: `SWHELLO` resolves
  nothing).
- **Versions are apk's** (`1.0_rc1-r0` sorts before `1.0-r0` by `apk version -t`, captured);
  ordering is the client's, and the registry compares versions only for equality.
- **Filenames are resolved by lookup, never by splitting.** Names contain hyphens and digits
  (`py3-foo`), so `{name}-{version}.apk` is parsed by looking the whole filename up in the tree's
  map for that architecture, never by cutting at a hyphen.
- **Percent-decode every path before lookup, and never decode `+` as a space.** apk sends `+` raw
  (captured); `%2B` from another HTTP client must resolve to the same file.

### Authentication: preemptive userinfo, challenged netrc

apk sends HTTP Basic, which `auth.md`'s verifier accepts as its universal Basic password form,
the token as the password and the username not an input, URL userinfo arriving in that form
("Presentation forms", AC31). `auth.md`'s client table carries the `apk` row this spec's captures
supplied (userinfo preemptive on every request; `.netrc` and `HTTP_AUTH` only after a `401`, the
latter not scoped by host), so the auth cases are not gated on a missing row. How this meets
`auth.md`, whose rules this spec does not bend:

- **The forms.** URL userinfo in the repository line is sent preemptively on every request;
  `~/.netrc` (`machine {host} login __token__ password {token}`) and `HTTP_AUTH` are sent after a
  `401` (captured). Per the resolved credential-form decision below the operator documentation
  recommends `.netrc`, because apk-tools 2.14.12's `apk policy` prints userinfo passwords in clear
  (captured) and a repository line is often baked into an image layer, and it warns that
  `HTTP_AUTH` is answered to **any** host that challenges, since libfetch does not scope it by host
  (`libfetch/http.c`).
- **The challenge is required.** `.netrc` and `HTTP_AUTH` send nothing until a `401` carrying
  `WWW-Authenticate: Basic realm="..."`. A credential-less request to a repository that is not
  anonymously readable therefore answers `401` with that header, identically for a private and a
  missing repository (`auth.md` AC17); a valid token lacking `pull` answers `404`; a rejected
  token answers `401` and is never served as anonymous (`auth.md` AC12).
- **No credential leaves for another host, and none is printed.** Hosted and virtual indexes never
  name another host (the v3 package name specification is out of scope), and no hosted route redirects.
- **TLS.** apk sent the userinfo credential over plain HTTP without complaint (captured on port
  80), so the protection is the server's: `auth.md` AC27 refuses a credential presented over a
  connection the server did not terminate with TLS. apk takes the CA from `/etc/apk/ca.pem` or the
  system store (`apk(8)`); the harness installs its CA in the system store.

### Addressed objects and pattern scopes

`auth.md`'s pattern scopes narrow a credential within one repository by matching the object each
request addresses, and the format declares which object each route reports ("Pattern scopes"
there; `format-handler-interface.md` AC12). The canonical object of a package is
`{tree}/{name}/{version}`, the tree segments first (none for the root tree) and the architecture
not part of it, so a grant for a name covers every architecture it is built for.

| Route | Object kind | Canonical object |
|---|---|---|
| `APKINDEX.tar.gz` (it enumerates the tree's names) | none | - |
| The key document | descriptor | - (a signing-key document names no package, version or digest) |
| A package (`{tree}/{arch}/{file}`, hosted or proxied) | named | `{tree}/{name}/{version}` of the file the path resolves to |
| Publish packages (management API) | named | each file's `{tree}/{name}/{version}` from its `.PKGINFO`, which precedes its data stream; a publish carrying several files is authorized only if every object is |
| Delete a version (management API) | named | `{tree}/{name}/{version}` |
| Delete a package (management API) | named | `{tree}/{name}` |
| Architecture set, key rotation (management API) | none | - |

What that gives and costs, applying `auth.md`'s rules rather than re-deciding them. The key
document is a **descriptor**, `auth.md`'s fourth object kind for a repository-wide document that
names no object, which its table gives "a signing-key document" as an example (its resolved
name-free-document decision, was Q23); it passes the sentinel test every descriptor route must pass
(`format-handler-interface.md` AC12), so a patterned `pull` can fetch the key file an operator
installs. **A patterned `pull` still cannot install anything**: apk must read the index, which
enumerates the tree's names and stays none, so both lines fail at the first request under a token
patterned `v3.24/main/swhello/**`; this is `rpm.md`'s consequence for the same reason, and
`auth.md` names such enumerating indexes as the case its descriptor kind does not unlock, since
widening a patterned read to the index would reveal names outside the pattern. A patterned `pull` still confines a
scripted fetch to in-pattern packages. **A patterned `push` publishes** in-pattern packages and is
refused an out-of-pattern one with no snapshot, and a patterned `delete` likewise.

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines, on the
package route of either path, the handler answers `403` with a JSON body
`{"errors": [{"status": "403", "title": "...", "detail": "..."}]}` naming the policy and rule,
written through the shared refusal writer `WriteRefusal` in `internal/format`
(`format-handler-interface.md` AC14), and nothing else changes: the tree's indexes still list the
package and still verify. On an HTTP/1.1 connection the writer also puts the condition into the
status line, `HTTP/1.1 403 Refused by policy: {condition}` (`supply-chain-policy.md`'s resolved
refusal-status-line decision, was Q10, AC18). Per the resolved refusal-rendering decision below and
captured on both lines against a canonical status line: 2.14.12 prints "ERROR:
{name}-{version}: Permission denied", an `errno` string that cannot carry the phrase, 3.0.8 prints
"HTTP 403: Forbidden", which may be the reason phrase and is what AC13's case records, neither
prints the body, and `apk add` exits non-zero. apk requests a refused file once, so one install attempt produces one
refusal record per refused package. Packages fetched before the refused one in the same
transaction are installed (captured: `swdep` installed, `swhello` refused), which the operator
documentation states.

An index route never answers a policy refusal: the index is the tree as a whole, and refusing it
turns enforcement into a skipped repository (Design, "Fallback"). These captures are what
`supply-chain-policy.md`'s "When a refusal binds, per format" table records for Alpine as
`package-level`, so AC13's case is not refused by the harness's pending-row rule
(`conformance-harness.md` AC26) and re-asserts the row.

### The proxied path

The handler owns the request and classifies for the proxy layer's fetch-and-cache API per the
settled decisions in `proxy-cache.md`. The upstream is a mirror root, for example
`https://dl-cdn.alpinelinux.org/alpine/v3.24/` (per the resolved OSV decision below, one remote
per Alpine branch is the recommended shape), and a client path under the remote repository is
appended to it. Per the resolved proxied-index decision below, **upstream indexes and packages are
served verbatim**, so a client keeps the stock `alpine-keys` it already has (captured: both pinned
images installed from dl-cdn with their stock keys).

What this format needs of `docs/internal/plans/foundation/upstream-adapters.md`, which answers
each item in its requirements table (the `alpine.md` and `arch.md` row); the transport half is its
`https` adapter under the upstream's allowlist and credential role, and the protocol half (which
path to join, how to classify) stays this handler's:

- **Path joining under a mirror root**, with the remote's optional upstream credential (the
  `basic` kind) presented to that root's host only, over HTTPS (its AC6, AC19); dl-cdn also answers
  plain HTTP (live), and an `http://` root is refused at configuration unless the upstream's
  `allow_http` is set (its AC22). Joining itself is the handler's derivation.
- **Cross-host redirects to an allowlist**: dl-cdn answered every probe directly, but mirrors in
  `MIRRORS.txt` are independent operators, so the adapter follows redirects only to hosts on the
  upstream's `hosts` allowlist, makes no connection to any other, and forwards no credential beyond
  the root host (its AC7, AC8).
- **Conditional revalidation** of `APKINDEX.tar.gz` with `If-None-Match` and `If-Modified-Since`:
  dl-cdn sends `ETag` and `Last-Modified`, no `Cache-Control`, and answers both conditionals with
  `304` (live); the adapter sends both validators it holds (its AC15).
- **Range pass-through is not required**: a miss fetches the whole file, and ranges are served
  from the CAS once it is committed.

Classification and behaviour:

- **`APKINDEX.tar.gz` is mutable metadata with the proxy layer's TTL.** A new revision is verified
  before it is served, through the entry above, against the remote's configured upstream keys (for
  Alpine, the `alpine-keys` set, the live v3.24 main index being signed by
  `alpine-devel@lists.alpinelinux.org-6165ee59.rsa.pub`). The fetch-and-cache request declares the
  `apk` `Verify` hook over the one document, and what the adoption records beside `adopted_at` is
  the **anchor class** `artifact-verification.md` derives from that hook and the remote's trust set
  as it stood (its "Anchor class", AC31; `proxy-cache.md` AC25), which is what a signed virtual
  later admits the revision by (below; `signing-service.md` AC36). With at least one apk key in
  the trust set the class is `signature`: a revision whose verdict is `verified` is adopted and
  served, and one whose verdict is `failed`, because its signature names a key outside the set
  (reason `untrusted-key`), does not verify (`bad-signature`), or is missing altogether, is never
  adopted, the previous verified revision keeps serving under serve-stale and the operator is
  alerted. That last case is right for this format where it was a trap for Arch: an Alpine index
  without a signature is one no apk client installs from without `--allow-untrusted` (captured),
  so refusing to adopt it matches the client, and because the signature is a segment inside the
  one document rather than a separately served optional member, there is no adoption whose hook
  "did not apply" and no third case (`arch.md`'s "The proxied path" has one; this format has not).
  With no apk key configured the class is `none` and every revision's verdict reads `absent`
  (`artifact-verification.md`'s resolved verdict decision, was Q2 there, as amended on Fable:
  `untrusted-key` needs at least one entry of the kind): the revision is adopted on TLS to the
  configured upstream alone and served, and the operator record says so. **A signature the
  upstream stops serving is a regression not adopted** (the resolved withdrawn-signature
  decision below, was Q13, which takes `rpm.md`'s resolved decision of the same name, was Q12
  there, for this format): on such a remote the handler's adoption check records, as its own
  fact on the remote's document, whether each adopted revision's leading segment carried a
  `.SIGN` entry, and a revision arriving with none for a tree and architecture whose current
  revision carried one is classed "regression not adopted" like an older revision would be,
  the signed revision keeps serving, a divergence naming the missing signature is recorded, and
  the operator's refresh is what adopts the unsigned successor; a cell first adopted without a
  signature never arms the rule. Without it, a mirror that stripped the signature Alpine serves
  would be composed into a signed virtual under class `none` while a direct client holding the
  stock keys refuses it. The verification is an
  integrity call through `Deps`' `Verifier` under the `apk` entry, which may refuse the commit
  (`artifact-verification.md` AC12; `proxy-cache.md`'s line between integrity calls and verdicts);
  the class is never a read of the handler's, which has no way to reach it
  (`format-handler-interface.md` AC15). The upstream keys are the remote's trust set. What a remote
  serves as `Last-Modified` is its cache-scoped `adopted_at`, never the upstream's, forward-moving
  on each adopted revision (`proxy-cache.md` AC22), which apk ignores and an intermediary honours.
- **A filename map per index revision.** A package can be verified only against its record, so
  the first package request under a revision builds, once per index digest, a map from
  `{P}-{V}.apk` to `C:`, `S:` and version by streaming the index, stored as CAS-backed metadata on
  the remote's repository-level document and declared on its blob-digest list, the declaration
  committing only while that index's revision is current or retained, so a map finished after the
  adoption that dropped its revision is discarded; the adoption that drops a revision drops its
  body and map from the list in the same transaction (`proxy-cache.md` AC27). A package miss is
  then a lookup and a stream-and-verify fetch. A path that is neither an index nor a file the current or a retained revision names
  answers `404` with no upstream request, so the remote is not an open relay (`last-updated` and
  `MIRRORS.txt` included).
- **Packages are immutable artifacts**, verified under stream-and-verify against the record's `S:`
  and `C:` and the `datahash` inside them, and their signature verdict recorded for policy against
  the remote's upstream keys (`absent` on a remote holding no apk key), never as a precondition of
  serving. Because `C:` is a SHA-1 over the
  control stream rather than a digest of the whole file, the handler supplies the integrity check
  as `proxy-cache.md`'s post-receipt verifier over the complete body (its resolved completion-only
  decision, was Q15, AC20, whose entry catalogue names the apk segment), with `S:` as the size
  bound; the initiating client streams and a failure short-closes its response. A package the
  handler reports carries its `origin` as the advisory key on the fetch-and-cache request when it
  differs from its name, so a rule condemning the origin refuses the miss before any upstream
  request (`supply-chain-policy.md` AC24; `proxy-cache.md` AC30). Cached packages are served
  through `ServeFile`.
- **Index revisions sit outside the quota.** A cached `APKINDEX.tar.gz` and its filename map are
  the remote's current metadata, never LRU-evicted and counted in `cache_metadata_bytes`, while
  packages are cached files under the quota (`proxy-cache.md`'s resolved metadata-eviction
  decision, was Q21, AC29).
- **Missing resources are negatively cached** with the short TTL on `404` and `410`; a `429` or
  `5xx` is never cached as absence (`proxy-cache.md` AC9).
- **URL rewriting** is none: apk builds package URLs from the base URL and the record.
- **Publish and every management operation against a remote repository answer `405`** with the
  `repository-type` problem (`management-api.md` AC7).

Upstream removal maps onto `proxy-cache.md`'s event-class table ("Upstream removal or
replacement", its AC13), which lists this format in the revision-bound class and among the
integrity failures ("an Alpine index failing its keyring"): the handler classifies each event it
observes, the layer executes the class. Alpine's stable branches keep only the current build of
each package: `busybox-1.37.0-r31` is on dl-cdn's v3.24 and `r30` and `r29` answer `404` (live), so
a package leaving the index is the ecosystem's normal flow:

| Upstream event, as observed at revalidation or fetch | Class in `proxy-cache.md` |
|---|---|
| A package leaves the index in a new revision (a superseding build, routine on every branch) | **Ordinary metadata change**: the new revision serves; the cached file stays fetchable by clients holding the retained older revision, the file held by its own cached reference until LRU eviction and the revision's body and map by the declared list until the adoption that drops the revision; after that drop the filename answers `404`; no divergence is recorded. Stated honestly, as `proxy-cache.md`'s resolved retained-revision decision (was its Q19) accepts: once LRU eviction has ended the file's cached reference, a client of the retained revision is served again only if the upstream still has the build, which a stand-in does and an Alpine mirror does not (a superseded build answers `404` on dl-cdn at once, live), so against the real mirror that client meets the negative entry and "package mentioned in index not found", exactly as it would against the mirror itself |
| A new revision lists a different `C:` or `S:` for a filename already cached | **Immutability violation, revision-bound**, in the new-blob variant: recorded and alerted, no purge. A package path carries no digest and apk names no revision in the request, so the package route serves the bytes the **current** index names; the new bytes are fetched and verified as a new blob on the next request, and that commit ends the old blob's cached reference in the same transaction, so the sweep reclaims the old bytes, which no request can be served afterwards (`proxy-cache.md`'s resolved old-blob decision, was its Q20). Because apk verifies against the record it was given (captured), a client still holding the older index fails that package until its next `apk update`, exactly as against the upstream, while every refreshed client installs |
| A new index fails its signature, or a package fails `C:`, `S:` or `datahash`, or a body is truncated | **Integrity failure at fetch**: nothing committed, no negative entry, the previous verified revision keeps serving, the operator is alerted, the next request tries again |
| A new index is signed by a key outside the configured set (an Alpine key rotation) | **Integrity failure at fetch**, with the key name in the operator record, so the operator adds the key deliberately |
| A new index arrives with no `.SIGN` entry on a remote holding no apk key, for a tree and architecture whose current revision carried one | **Regression not adopted** (the resolved withdrawn-signature decision below, was Q13, after `rpm.md` was-Q12): the signed revision stands, a divergence naming the missing signature is recorded, and only the operator's refresh adopts the unsigned successor; a cell first adopted unsigned never arms it. On a remote holding apk keys the same index is the integrity failure above, since an unsigned index reads `failed` there |

### Advisories, OSV and the security-signal rule

Nothing on this wire is a security signal: the index carries no advisory, deprecation or
quarantine field, and Alpine removes superseded builds without saying why. OSV's Alpine
ecosystem holds only `ALPINE-CVE-*` vulnerability records and no `MAL-` record (captured), so
**the shared security-signal rule never fires for this format from either channel**.

Advisory-dependent rules can bind only when the repository says which release its packages
belong to, because OSV keys Alpine by release (Alpine:v3.22, Alpine:v3.24; none for edge) and
by the **origin** package: `openssl` in `Alpine:v3.22` matches 48 records while its binary
`libssl3` matches none (captured). Per the resolved OSV decision below, a repository may declare
one OSV ecosystem string, and matching uses each version's `origin` field, never its `pkgname`.
`supply-chain-policy.md` built exactly this for every OS-package format: the declaration is the
core-parsed repository field `advisory_ecosystem`, set through `management-api.md`'s repository
`PATCH` and validated against the configured sources' ecosystem lists, a value no source lists
(`Alpine:edge` today) refused `validation` (422) naming it; the matcher keys Alpine on the origin
package under the declared release with Alpine's own version ordering (its coverage table, "OS-package
repositories declare their ecosystem", AC11, AC17). The handler's part is to know each version's
`origin` from its `.PKGINFO` and report it as the version's **advisory key** in the metadata-store
write that records the version, and on the fetch-and-cache request of a proxied miss, whenever the
origin differs from `pkgname`; the core stores the key as core-parsed data on `Version`, outside
every metadata document, and the matcher reads it there, since the core never parses the
handler's opaque version document (`supply-chain-policy.md`'s resolved advisory-key decision, was
Q11, AC24; `data-model.md` AC46; `format-handler-interface.md` AC17). This closes the channel this
spec first reported as unspecified, which Debian's source package shared. An advisory-dependent
rule attached to a repository without a declaration is refused at configuration as unbindable.
Coordinate rules and signature-verdict rules bind without it. Detection is passive, per
`proxy-cache.md`'s resolved signal-detection decision (was Q12).

Per the resolved preconfigured-upstream decision below, no Alpine mirror is preconfigured.

### Virtual repositories

`hex.md` found virtual repositories impossible because every registry resource is signed under
the repository's own name, and `rpm.md` found them possible with re-signing. apk is `rpm.md`'s
case: nothing in the index names the repository or the host, and the key is whatever file the
client holds. A `virtual` Alpine repository is therefore expressible, at the cost that its index
is this registry's, and per the resolved virtual-repository decision below:

- **A virtual tree is the merge of its members' trees at the same path and architecture.** For
  each tree path and architecture any member holds, the service generates an index from the
  members' records and signs it with the virtual repository's key; the virtual's architecture set
  for a tree is therefore the union of its members' (a hosted member's declared set, a remote's
  upstream directories), and a hosted member's `noarch` versions are listed in every architecture
  of that union, outside the member's own declared set included, since the merge reads records
  rather than the member's indexes. A remote member contributes its **current adopted revision**
  of each tree and architecture, admitted by the **anchor class** that adoption ran under
  (`signing-service.md`'s resolved admission decision, was Q20 there, AC36, which superseded the
  `verified`-only rule this spec first wrote under its was-Q17): class `signature`, a remote
  holding at least one apk key, admits only a `verified` revision, and a verdict read as `absent`
  after a trust-set change excludes it until re-evaluation; class `none`, a remote holding no
  apk key, admits the current revision, which was adopted on TLS to the configured upstream
  alone with verdict `absent` (Design, "The proxied path"); a `failed` verdict is never adopted,
  so it is never current and never admitted. Each member's admission or exclusion is recorded
  with its class on the merged set's input record (`data-model.md` AC45), which is this
  format's operator record. What the virtual's signature attests is composition from members at
  the trust level the operator configured for each, which the operator documentation states in
  those words; configuring the `alpine-keys` set on a remote is the advice for a virtual whose
  clients should get class `signature` behind it, not a condition of contributing. Remote
  members are re-merged when their revisions revalidate. The merge is the
  generator's `Merge`, run as the deferred `index.merge` job on the shared runner: enqueued by a
  member's write with the virtual as coalesce key, by a remote member's adoption of a new index
  revision inside the adoption transaction through the runtime's adoption hook
  (`signing-service.md`'s resolved remote-member decision, was Q16, AC35; `proxy-cache.md` AC25),
  at the virtual's creation and on every member-list change, never on a request's path; it
  creates no snapshot, the previous merged set serving until the new one commits and a failed
  merge leaving it in place with an alert (`signing-service.md`, "Virtual merges", AC19). A
  member's change therefore reaches the virtual within that spec's staleness bound, not inside
  the member's write.
- **A remote reached only through the virtual is kept fresh by the virtual's reads**, and a
  never-adopted one is fetched before any client asks. Serving a merged index whose input from a
  remote is past the remote's TTL enqueues one coalesced `proxy.revalidate` job that replays the
  remote's own routes below the authorizer, off the request's path (`proxy-cache.md`,
  "Revalidation outside the request", AC26). The profile declares the **member input** of the one
  document the `Merge` reads from a member, under the member's mount, in the shape
  `signing-service.md`'s resolved member-input decision (was Q21 there, AC35) gives it: the
  template `{tree}/{arch}/APKINDEX.tar.gz` over two variables, `{tree}` sourced from the tree
  paths the virtual's other members hold under the tree grammar of "Trees and architectures"
  (segments of `[A-Za-z0-9._+-]`, none `.` or `..`), and `{arch}` from the architectures they
  hold under `[a-z0-9_]+`, with no derivation, so the profile's round bound is one; registration
  refuses the profile without the template, a variable without a source, or a grammar admitting
  an empty, `.` or `..` segment. A virtual's creation, or a member-list change adding a remote
  never adopted, expands it over the other members' values and replays every cell, so the
  virtual lists the remote's packages there with no request ever made to the remote's own URL.
  **A tree or architecture only the remote holds** is covered by no member and is fetched
  **read-driven**: a request to the virtual for `{tree}/{arch}/APKINDEX.tar.gz` at a cell that
  fits both grammars and that no member input covered is answered from the merged set as it
  stands (a `404`), records the cell on the virtual's input record and enqueues each remote
  member's revalidation in an enqueue-only transaction, after which the remote's replay requests
  that cell, a cell the upstream answers `404` becomes the remote's negative entry and is not
  asked again until it lapses, and a cell the upstream holds is in the merged set within the
  staleness bound; the set is bounded by `index.requested_cells_max` and pruned once a cell is
  cached or its negative entry lapsed unrequested (`signing-service.md`'s resolved requested-cell
  decision, was Q22 there; `proxy-cache.md` AC26). The gap this spec once reported here is closed
  by that mechanism.
- **Resolution is per package name, in member order, by literal name**: the first member whose
  tree holds any version of a name contributes every version of it, and later members' versions
  of that name are omitted. This matters more here than for RPM, because apk installs the highest
  version across all it can see (captured), so without shadowing a public `swhello-9.0` beats a
  private `swhello-1.1`. Records are composed whole: a later member's package that **provides** a
  name a first member holds keeps its `p:` field, because stripping it would make the merged
  record say less than the package's own `.PKGINFO`, which apk reads at install and reconciles
  with the index it holds, and no capture shows what either line does with that divergence. Which
  of a first member's real package and a later member's provider of its name apk selects, with
  and without `provider_priority` on the provider, is therefore recorded by AC20's case on both
  lines rather than designed around; the resolved shadowing decision below (was Q12) holds the
  record rewrite as the fallback should the capture show the provider winning.
- **Package bytes are the members'**, served through the virtual route, their `C:` unchanged; since
  no repository install checks the package signature, a client of a virtual repository needs only
  the virtual repository's key file, whatever its members' keys are.
- A publish or management operation against a virtual repository answers `405` with the
  `repository-type` problem.

The recommended client configuration is one line in `/etc/apk/repositories` per virtual tree, the
virtual repository's key file in `/etc/apk/keys`, and credentials in `.netrc`; with that
configuration a refusal holds with egress open (AC14).

### Capabilities and lifecycle

`Capabilities()` declares proxy support `supported`, reference-implementation availability
`available` (an `apk index` and `abuild-sign` tree behind a pinned static server, below), `Virtual:
supported` (the section above) and `Rename: supported`, the four fields `format-handler-interface.md`
AC13 names. Rename is supported because nothing an apk client reads names the repository: the index
names neither host nor repository (its `DESCRIPTION` names the tree and the snapshot, item 1 of the
service requirements), package paths come from the base URL and the record, and a key's name is an
opaque identifier fixed for its lifetime, so a renamed repository serves byte-identical indexes,
signature segments, key files and packages under its new URL with every `SigningKey`, signature
record and public form unchanged and no re-sign (`signing-service.md` AC29), and a client keeps
its key file. The old name answers `not-found` indistinguishably from a never-existing repository
(`repository-lifecycle.md` AC12), which an apk client renders as a repository that could not be
opened, skipping it as "Fallback" describes; the operator documentation states that a rename needs
every client's repository line changed at once. `repository-lifecycle.md` AC12 requires
`conformance/alpine/rename_test.go`, enforced by the harness's case-set validator
(`conformance-harness.md` AC26); AC24 carries it with the real clients.

### Conformance, the clients and the corpus

The two pinned client lines differ in ways the captures made concrete: 2.14.12 skips a repeated
`apk update` within its cache age, cannot read a `v3` line, prints userinfo passwords in `apk
policy`, and words its errors as `errno` strings ("Permission denied"); 3.0.8 re-fetches on every
`apk update`, reads `Packages.adb`, masks passwords except in the redirect warning, and prints
HTTP status lines. The catalogue counts one ecosystem; both lines appear in the matrix's Client
column under the Alpine row, and every hosted and proxied case runs on both unless it names a
line-specific behaviour.

**Every case runs with the client's network restricted to this registry and its stand-ins**,
which the harness now holds for every case with no opt-out (`conformance-harness.md`'s resolved
client-confinement decision, was Q6, AC23). AC14's no-fallback half, which this spec first wrote as
an open-egress case, is expressed the same way: the second repository's host is a declared stand-in
on the case network, reachable exactly as a public host would be, and the stand-in's transcript is
what proves no request reached it. Each case writes
`/etc/apk/repositories`, empties `/etc/apk/keys` of the image's Alpine keys, installs the key
files it names and the harness CA into the system store, and runs `apk -U` or `apk update
--force-refresh` after a publish, because a plain `apk update` on 2.14.12 may not fetch (Design,
wire surface).

The recorded surface for the replay corpus: against dl-cdn.alpinelinux.org, `v3.22` and `v3.24`
`main/x86_64/APKINDEX.tar.gz` with a conditional revalidation, one package per branch, and a
missing package. The reference implementation for the hosted side is a static tree built by
`apk index --rewrite-arch` and signed by `abuild-sign -t RSA256` in the pinned 3.22 image,
served by a pinned static server, so `Capabilities()` declares reference-implementation
availability `available`; the hosted half recorded against it is a local reference, so it is a
row of `conformance-harness.md`'s authoritative-reference exception list (its AC28), with dl-cdn
authoritative for the read half. The write surface has no reference (no client publishes), the
second row of that list, and its manifest declares no write corpus. Recording gates on the harness's redaction criterion
(`conformance-harness.md` AC13), whose allowlist applies to every position, the `Authorization`
header and URL userinfo included (the harness names `alpine.md` among the userinfo formats).
Deliberate divergences go on the exception list before their flow is expected to
replay: `RSA256` where Alpine signs `RSA`, the `DESCRIPTION` text, signature bytes, the
`Cache-Control` on indexes, `405` on remote writes and `409` on republish.

## Acceptance Criteria

- [ ] AC1: With the client network restricted to this registry, a hosted tree publishing a
      publisher-signed `swhello` that depends on `swdep` installs both with `apk -U add swhello`
      on Alpine 3.22.6 (apk-tools 2.14.12) and Alpine 3.24.2 (apk-tools 3.0.8) holding only the
      repository's key file; the transcript shows `APKINDEX.tar.gz` and then each package at
      `{tree}/x86_64/{name}-{version}.apk`, and the installed files equal the published package's.
- [ ] AC2: Every hosted `APKINDEX.tar.gz` is a leading gzip stream holding a tar segment with
      exactly one `.SIGN.RSA256.{keyname}.rsa.pub` entry outside a rotation window (two inside
      one, AC9) and no end-of-archive blocks, followed by
      the index stream, the signature an RSA 4096 PKCS #1 v1.5 signature over the SHA-256 of that
      stream, verifying on both lines; an index whose signature is removed, made by another key, or
      left stale after the stream changes is refused as "UNTRUSTED signature" or "BAD signature"
      by both, `apk update` exiting non-zero; the repository's key saved under any other filename
      is refused as "UNTRUSTED signature"; and an unsigned index is accepted only under
      `--allow-untrusted`.
- [ ] AC3: The two trust layers stay independent: the bytes every hosted package route serves have
      the digest of the bytes published, asserted for every hosted package in the suite; an
      unsigned package and one signed by a key the client does not hold both install from a hosted
      tree on both lines; the same packages installed as local files without the publisher's key
      are refused as "UNTRUSTED signature"; the version document records the verifier's verdict
      for each, taken through `Deps`' `Verifier` under the `apk` entry against the repository's
      trust set, the unsigned and foreign-key packages still committing and installing while no
      rule requiring a verified signature binds; and every served index's signature segment is
      assembled from a `Signature` record present in no snapshot's content set.
- [ ] AC4: A publish regenerates and re-signs the affected indexes in exactly one snapshot that
      holds the packages and the indexes; after `apk -U` or `apk update --force-refresh` both
      lines see the new package, the index served with `Cache-Control: no-cache`; two concurrent
      publishes into one tree both appear in the resulting index; a publish to one tree
      leaves another tree's indexes byte-identical; repointing to the predecessor serves its
      indexes byte-identical and both lines adopt it on their next `apk -U` with no pointer
      document in the profile; and a seeded `state` entry serves an index byte-identical to a
      publish of the same package.
- [ ] AC5: A `noarch` package published into a tree of a repository declaring `x86_64` and
      `aarch64` is listed in both indexes with `A:` equal to the index's architecture, no hosted
      index contains `A:noarch`, and it installs on both lines from `{tree}/x86_64/`; an
      architecture with no packages serves a signed index with no records that both lines accept;
      an architecture outside the declared set answers `404`; a package whose architecture is
      outside the set is refused with `422`; and `Packages.adb` answers `404` on every hosted tree.
- [ ] AC6: A publish of three `.apk` files to one tree creates exactly one snapshot; a file that is
      not a v2 package, a v3 package, a package whose `datahash` differs from its data stream, one
      whose `.PKGINFO` lacks `pkgname`, `pkgver` or `arch`, and a tree path outside the grammar are
      each refused with `422` and nothing committed; a republish of identical bytes creates no snapshot,
      its `Operation` completing with no snapshot reference and `unchanged: true`, while a batch of
      one identical and one new file commits the new one in one snapshot; different bytes at an
      existing coordinate and an architecture-specific build colliding with a `noarch` build of
      the same version are refused with `409`; a retired coordinate is refused with the `retired`
      problem (409) from the shared write path, including after the deleting snapshot was pruned,
      across a backwards repoint, when seeded as a `Retirement` record through `state`, and when
      the deletion commits between the publish's claim declaration and its commit; and the stored
      filename is `{pkgname}-{pkgver}.apk` whatever the upload was called.
- [ ] AC7: The `APKINDEX` member of every generated hosted index, for every fixture tree and
      architecture, equals field for field and in order what `apk index --rewrite-arch {arch}` from the pinned
      Alpine 3.22.6 image writes for the same packages, including `C:` as `Q1` plus the base64
      SHA-1 of each control stream and `S:` as each file's size; and the `DESCRIPTION` names the
      tree and the snapshot and not the repository's name.
- [ ] AC8: Deleting a version through the management endpoint removes it from every index in one
      snapshot, after which both lines fail to install it and its package routes answer `404`;
      deleting a package retires every version and keeps the `Package` row; the handler declares
      exactly `publish`, `delete-version`, `delete-package` and `configure`, each driven by a
      `script` case; every management operation is refused with no snapshot for a principal
      lacking its action (`push` for publish, `delete` for deletions, the admin role for the
      architecture set and key rotation) and answers `405` with the `repository-type` problem
      against a remote or virtual repository; and the architecture set's effect is observed by a
      real client: with `x86_64` removed from the set, the tree's `x86_64/APKINDEX.tar.gz`
      answers `404` and `apk -U add swhello` installs nothing and exits non-zero on both lines,
      and with it restored the next `apk -U add swhello` installs from a newly generated and
      signed index.
- [ ] AC9: No hosted or virtual index is signed by the handler: an architecture test proves the
      handler package holds no key and performs no signing; after the new key is activated every
      current index carries two signature segments over the same stream, produced as one atomic
      batch of signature records that creates no snapshot, with no interleaved reader served an
      index signed by a key the key document lacks; a client holding only the old key file and a
      client holding only the new one both install on both lines, the key document route serves
      both keys, and after the window ends, again with no snapshot, a client holding only the old
      key file is refused as "UNTRUSTED signature"; each phase is a `configure` operation on the
      signing-key routes refused to a non-admin principal.
- [ ] AC10: `apk add SWHELLO` does not resolve `swhello` on either line; `swplus++` installs through
      its raw request form and a `%2B` request for the same file answers the same bytes, a `+`
      never decoding to a space; `swver-1.0_rc1-r0` installs; and a package whose name contains a
      hyphen followed by digits (`sw-2-tool-1.0-r0.apk`) resolves by lookup to the right name and
      version.
- [ ] AC11: On a private repository over TLS, both lines install with URL userinfo, sending Basic
      on every request, and with `.netrc` and with `HTTP_AUTH`, each after a `401` carrying
      `WWW-Authenticate: Basic`; a credential-less request answers `401` identically for a private
      and a missing repository, a token lacking `pull` answers `404`, a rejected token answers
      `401` and is never served as anonymous; no hosted route answers a redirect; and no credential
      appears in logs, error bodies or metrics.
- [ ] AC12: A token holding `pull` patterned `v3.24/main/swhello/**` fails at `APKINDEX.tar.gz` on
      both lines, fetches the key document (a descriptor, which passes the sentinel test with a
      sentinel name, version and digest seeded) and fetches an in-pattern package by `curl` while
      refused an out-of-pattern one;
      a token holding `push` patterned the same way publishes `swhello` into `v3.24/main` and is
      refused publishing `swdep` or into `v3.22/main` with no snapshot created; and in proxied mode
      the patterned `pull` token is refused an out-of-pattern package.
- [ ] AC13: A package the shared policy layer refuses answers `403` through `WriteRefusal` with the
      `{"errors": [...]}` body naming the policy and, on the HTTP/1.1 connection the harness
      terminates, the status line `Refused by policy: {condition}` observed on the raw socket, on
      the hosted and the proxied path, while every index still answers `200` and still verifies;
      `apk add` exits non-zero on both lines, 2.14.12 printing "Permission denied" and 3.0.8 its
      `HTTP 403` line, the body and the phrase present in the transcript and each line's output
      recorded for whether the phrase reaches the user; and each refused package produces exactly
      one refusal record.
- [ ] AC14: With one repository line on this registry, a refused package fails on both lines with
      no request for it reaching any host but this registry, and with a second configured
      repository on a declared stand-in host listing the identical package it still fails with no
      request reaching that stand-in's package, asserted from the stand-in's transcript and at the
      network layer.
- [ ] AC15: A remote repository over a stand-in mirror whose indexes are signed by a fixture vendor
      key, in `RSA`, `RSA256` and `RSA512` variants, installs on both lines holding that vendor key
      file only: `APKINDEX.tar.gz` and every
      package served are the upstream's byte for byte, the index signature was verified against
      the configured key before the revision was served, every package was verified against `S:`,
      `C:` and its `datahash` before commit, through the handler-supplied verifier with nothing
      committed before it passed, each package's signature verdict against the vendor key
      recorded and readable through the management API, and a second install from a fresh
      container reaches this registry while the stand-in receives no request.
- [ ] AC16: A stand-in whose new index fails its signature or is signed by a key outside the
      configured set, whose package mismatches `C:`, `S:` or its `datahash`, or whose body is
      truncated, is never committed to the CAS; the previous verified revision keeps serving and
      installing; the real reason, and for a foreign key its name, is recorded observably to the
      operator; and the next request fetches again.
- [ ] AC17: A proxied `APKINDEX.tar.gz` is revalidated after its TTL and not before, conditionally
      against `ETag` and `Last-Modified` stand-ins, a package published upstream becoming
      installable after the TTL and not before absent an explicit refresh; packages are never
      revalidated; the index is served with the remote's cache-scoped `Last-Modified`, never the
      upstream's, later than the previous value on each adopted revision; a path no cached
      revision names, `MIRRORS.txt` and `last-updated` included, answers `404` with no upstream
      request; an upstream `404` is negatively cached while a `429` or `5xx` is neither cached as
      absence nor surfaced as not-found.
- [ ] AC18: A remote over a stand-in mirror root answering package requests with a cross-host
      `302` installs through a host on its artifact allowlist, refuses a host outside it with the
      host in the operator record, and forwards the upstream credential to the configured root host
      only, asserted at the network layer; and a remote configured with an `http://` root is
      refused at configuration unless overridden.
- [ ] AC19: A stand-in presenting each removal-table event produces this format's classification:
      a package leaving the index serves the new revision with no divergence recorded while a
      client holding the old revision still fetches it, including after a sweep run with the
      grace lapsed while that revision is retained and, against a stand-in that still serves the
      build, after the file's cached reference was evicted, while against a stand-in that answers
      `404` for it as dl-cdn does the evicted file meets the negative entry and that client fails
      as it would at the mirror; and the filename answers `404` once a further adoption has
      dropped the revision; a changed `C:`
      for a cached filename records and alerts a divergence, a client that updated to the new
      index installs the new bytes on both lines, and after the next sweep past grace the old
      blob is gone from the store with the divergence record naming both digests; on a remote
      holding no apk key, an index arriving with no `.SIGN` entry for a cell whose current
      revision carried one is not adopted, the signed revision still serving and installing on
      both lines, a divergence naming the missing signature recorded, the operator's refresh then
      adopting it, while a cell first adopted unsigned adopts its unsigned successor with no
      divergence; as this format's side of the removal policy in `proxy-cache.md` (its AC13,
      AC27, AC28).
- [ ] AC20: A virtual repository over a hosted and a remote member serves, per tree and
      architecture, a merged index signed by the virtual repository's key, from which a hosted
      `swhello-1.1` placed first shadows an upstream `swhello-9.0` so that no upstream version of
      that name is listed or fetched, asserted at the network layer; a hosted `noarch` version of
      the first member is listed in an architecture only the remote holds and installs from the
      virtual there; a later member's package providing `swhello` keeps its `p:` field in the
      merged record, and what each line installs for `apk add swhello` with that provider
      present, once without and once with `provider_priority` on it, is recorded in the case's
      transcript, the case failing only if the merged record differs from the member's; both
      lines install a hosted and a proxied package in one transaction through one repository
      line holding only the virtual key file; a member's change re-merges and re-signs the tree
      through the deferred `index.merge` job within the staleness bound, creating no snapshot,
      with no merge on a request's path and the previous merged set serving until the new one
      commits; and publish to the virtual answers `405` with the `repository-type` problem. A
      virtual created over a hosted member holding `v3.24/main` for `x86_64` and a remote never
      adopted fetches the remote's `v3.24/main/x86_64/APKINDEX.tar.gz` at creation, both lines
      then installing a package only the remote's upstream holds with no request ever made to
      the remote's own URL; a request to the virtual for `v3.24/community/x86_64/APKINDEX.tar.gz`,
      a tree no member but the remote holds, answers `404`, records the cell and enqueues one
      revalidation, after which the remote's replay fetches that cell and both lines install a
      package only that tree holds through the virtual within the staleness bound, while a cell
      with a `..` segment is neither recorded nor fetched; the remote's adoption of a new index
      revision enqueues the merge in the adoption transaction and the change is installable
      through the virtual within the staleness bound; with the remote reached only through the
      virtual, a read of the merged index past the remote's TTL enqueues one `proxy.revalidate`
      job and is served the current merged index with no upstream request on its path
      (`proxy-cache.md` AC26, `signing-service.md` AC35); a second remote with no upstream keys
      configured, listed in the same virtual, is adopted under anchor class `none` with verdict
      `absent` and **contributes** its packages, both lines installing one through the virtual,
      its admission and class on the operator record, while a third remote holding the vendor
      key whose stand-in serves an index signed by another key never becomes current and
      contributes nothing (`signing-service.md` AC36); and registration refuses an Alpine
      profile whose `Merge` reads a member document with no member input declared, or whose
      `{tree}` or `{arch}` variable has no source or a grammar admitting a `.` or `..` segment.
- [ ] AC21: A policy rule depending on advisory data attached to an Alpine repository with no
      `advisory_ecosystem` declared is refused at configuration as unbindable, and declaring
      `Alpine:edge`, which no configured source lists, is refused `validation` naming the value;
      with `advisory_ecosystem` `Alpine:v3.24` declared, an advisory from the controlled source naming origin
      `swhello` refuses a cached subpackage `swhello-doc` whose `origin` is `swhello` on the
      proxied path, the miss refused before any upstream request, and the same rule refuses a
      hosted package; an advisory naming only the subpackage's own name refuses nothing; the
      origin is stored as the version's advisory key on its `Version` row and in no metadata
      document, reported only where it differs from `pkgname`; coordinate rules and
      signature-verdict rules attach and refuse as configured on both paths.
- [ ] AC22: Replay-match passes against a corpus recorded from dl-cdn.alpinelinux.org and from a
      pinned static server over an `apk index` and `abuild-sign` tree, covering the recorded
      surface named in Design, with the `Authorization` header and URL userinfo redacted; and in
      the recording session both stock images, holding only their `alpine-keys`, install through a
      remote configured over dl-cdn.
- [ ] AC23: A tree whose index exceeds the inline metadata threshold is stored as CAS blobs that
      survive a GC sweep while a retained snapshot names them and install afterwards on both lines,
      and a proxied index body and filename map above the threshold survive a sweep run with the
      grace lapsed while their revision is current or the retained one, a package only that
      revision names then installing on both lines, and are collected by the first sweep past
      grace after the adoption that drops their revision.
- [ ] AC24: The handler's `Capabilities()` declares proxy `supported`, reference-implementation
      `available`, `Virtual: supported` and `Rename: supported`; a renamed hosted repository keeps
      its identity, its keys and its signature records and serves byte-identical indexes, key files
      and packages under the new name with no re-sign, both lines installing from the new
      repository line in both modes with their existing key file and token, while the old name
      answers `not-found` indistinguishably from a never-existing repository; and the case set
      carries `rename_test.go`.
- [ ] AC25: On a remote far over its quota holding index revisions, their filename maps and
      cached packages, an eviction pass ends cached references of packages only: every cached
      index, its signature segment and map are unchanged and served inside the TTL with no
      upstream request and the same `Last-Modified`, `cache_metadata_bytes{repository}` counts
      them and `cache_referenced_bytes{repository}` does not; every package is served through
      `ServeFile` with its CAS digest as a strong `ETag`, no handler package setting a
      validator; and both lines then install from the remote, evicted packages re-fetched and
      verified.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/alpine/hosted_install_test.go` (both pinned images, network-restricted client containers, image keys removed; transcript order asserted; installed file comparison) |
| AC2 | conformance + unit | `conformance/alpine/index_signature_test.go` (valid, absent, foreign-key, stale signatures, a renamed key file and `--allow-untrusted`, both lines, captured messages and `apk update` exit status asserted); `internal/format/alpine/signature_shape_test.go` (segment shape, entry name, key size, digest algorithm of every generated index) |
| AC3 | conformance + integration | `conformance/alpine/package_signature_test.go` (unsigned and foreign-key packages from a hosted tree, then as local files, both lines); `internal/format/alpine/bytes_unaltered_test.go` (published digest equals served digest for every fixture; verdict recorded through `Verifier`; the segment assembled from `Signature` records absent from the snapshot); `conformance/alpine/signature_test.go`, shared with `artifact-verification.md` AC12 and counted for its AC24 hosted case (a real `apk add` with the index and package verdicts recorded) |
| AC4 | conformance + integration | `conformance/alpine/republish_test.go` (publish then `apk -U` and `apk update --force-refresh`; index `Cache-Control` asserted); `internal/format/alpine/snapshot_test.go` (snapshot count, two concurrent writers into one tree, trees independent, repoint byte comparison); `conformance/alpine/rollback_test.go` (a repoint to the predecessor adopted on both lines at their next `apk -U`); `internal/format/alpine/seed_test.go` (seeded versus published index bytes, `signing-service.md` AC21) |
| AC5 | conformance + integration | `conformance/alpine/noarch_test.go` (two-architecture repository, install on both lines, empty-architecture index accepted); `internal/format/alpine/arch_set_test.go` (no `A:noarch` in any generated index, out-of-set `404` and `422`, `Packages.adb` `404`) |
| AC6 | integration | `internal/format/alpine/ingest_test.go` (non-package, v3 package, `datahash` mismatch, missing fields, bad tree path, idempotent republish with the unchanged `Operation` and a mixed batch, different bytes, retired coordinate after pruning under an injected clock, across a backwards repoint and with a deletion committed between declaration and commit, a `state`-seeded `Retirement`, `noarch` collision, canonical renaming, three-file batch snapshot count; the central refusal itself is `management-api.md` AC12's `internal/manage/retirement_test.go`, the commit-time check `storage-and-gc.md` AC30's) |
| AC7 | integration | `internal/format/alpine/apkindex_oracle_test.go` (every fixture tree generated, compared with `apk index --rewrite-arch` run in the pinned 3.22.6 image; the `DESCRIPTION` text); `internal/format/alpine/index/golden_test.go` (the generator's fixtures, registered with `signing-service.md` AC25's determinism harness) |
| AC8 | conformance + integration | `conformance/alpine/manage_test.go` (every declared kind driven from the `script`, `management-api.md` AC24 and `conformance-harness.md` AC26; delete version and package, then real installs and a `curl` of the package route; the architecture set changed without and then with `x86_64`, each followed by `apk -U add` on both lines); `internal/format/alpine/manage_auth_test.go` (declared kinds, action refusals with snapshot count unchanged, `configure` refused to non-admins, `405` `repository-type` on remote and virtual) |
| AC9 | architecture test + conformance | `internal/format/alpine/arch_test.go` (no key, no signing in the handler package); `conformance/alpine/key_rotation_test.go` (dual-signature window opened and closed through the signing-key routes on both lines with old-only and new-only key files); `internal/format/alpine/rotation_test.go` (snapshot count unchanged by both phases; the profile's atomicity is `signing-service.md` AC7 and AC8's `internal/signing/rotation_profiles_test.go` and `rotation_atomic_test.go`) |
| AC10 | conformance + unit | `conformance/alpine/names_test.go` (case, `++`, `_rc1`, hyphen-digit name, both lines); `internal/format/alpine/path_decode_test.go` (`%2B`, `+` literal, lookup-not-split) |
| AC11 | conformance + integration | `conformance/alpine/auth_test.go` (private repository over TLS; userinfo, `.netrc` and `HTTP_AUTH`, challenge header asserted; anonymous, `pull`-less and rejected tokens; no redirect status on any hosted route); `internal/auth/leak_test.go` (Basic material redaction for this format) |
| AC12 | conformance + unit | `conformance/alpine/pattern_test.go` (the pattern-refusal case `auth.md` AC8 and `format-handler-interface.md` AC7 require, in both modes; patterned `pull` failure on both lines, patterned `push` in and out of pattern); `internal/format/alpine/scope_object_test.go` (the object table, per route, with the sentinel check on the key document through the shared helper in `internal/format/scope_test.go`, `format-handler-interface.md` AC12) |
| AC13 | conformance + integration | `conformance/alpine/policy_test.go` (hosted and proxied modes; rules through the `policies` key; the raw status line read from the socket; exit status, client text, transcript body and index `200` asserted); `internal/format/alpine/refusal_record_test.go` (one record per refused package) |
| AC14 | conformance | `conformance/alpine/no_fallback_test.go` (a second repository on a declared stand-in host listing the identical package, declared through `upstreams` `hosts`, `conformance-harness.md` AC23; stand-in transcript and network-layer assertion) |
| AC15 | conformance | `conformance/alpine/proxied_install_test.go` (vendor-signed stand-in mirror in `RSA`, `RSA256` and `RSA512` variants; the vendor key through the `trust` key; both lines with the vendor key only; byte comparison; verdicts read through the management API, counted for `artifact-verification.md` AC24's proxied case; network-level second-install assertion) |
| AC16 | integration | `internal/format/alpine/proxied_integrity_test.go` (bad and foreign-key signatures, `C:`, `S:` and `datahash` mismatches, truncated body; CAS and reference assertions; previous revision still serving; operator record) |
| AC17 | conformance + integration | `conformance/alpine/proxied_ttl_test.go` (mutating stand-in with `ETag` and `Last-Modified` variants, network-level counts); `internal/format/alpine/proxied_negative_test.go` (unknown paths, `MIRRORS.txt` and `last-updated` with no upstream request, `404`, `429` and `5xx`); `internal/format/alpine/proxied_freshness_test.go` (the cache-scoped `Last-Modified` under a stand-in whose dates move backwards; the layer half is `proxy-cache.md` AC22's `internal/proxy/freshness_test.go`) |
| AC18 | integration + conformance | `internal/format/alpine/upstream_redirect_test.go` (allowlisted and refused redirect hosts, credential scope, `http://` root refused); `conformance/alpine/proxied_redirect_test.go` (install through a cross-host `302`) |
| AC19 | integration + conformance | `internal/format/alpine/removal_test.go` (stand-in presenting each event; a sweep on an injected clock with the grace lapsed between adoptions, the object store read after each; the retained revision's package evicted then fetched from a stand-in that serves it and refused by one answering `404`; the changed-`C:` filename served the current bytes and the old blob gone after the next sweep; a keyless remote's index arriving without its `.SIGN` entry not adopted, the divergence, the refresh, and the never-armed unsigned-first cell; the shared-layer half is `proxy-cache.md` AC13, AC27 and AC28's); `conformance/alpine/proxied_withdrawn_signature_test.go` (both lines still installing from the signed revision while the stand-in serves the stripped index) |
| AC20 | conformance + integration | `conformance/alpine/virtual_test.go` (shadowing with the network layer showing no upstream request for the shadowed name; the first member's `noarch` version in a remote-only architecture; the provider case on both lines, the transcript recording each line's choice without and with `provider_priority`, the assertion being the unmodified `p:` field; mixed install on both lines with one key file; `405`); `internal/format/alpine/index/merge_test.go` (the generator's `Merge`: per-name first member by literal name, records composed whole, the architecture union); `internal/format/alpine/virtual_merge_test.go` (re-merge on member change and on remote adoption as the deferred job within the staleness bound, no snapshot, shared with `signing-service.md` AC19's `internal/index/virtual_merge_test.go` and AC35's `internal/index/virtual_remote_member_test.go`); `conformance/alpine/virtual_remote_test.go` (a virtual created over a never-adopted remote, the stand-in's transcript showing only the expanded member-input cells and the network layer no request to the remote's URL; the remote-only tree fetched read-driven after the virtual's `404`, the `..` cell refused, shared with `signing-service.md` AC35's row; an upstream change adopted and merged; the virtual-only remote's revalidation from a read past its TTL, shared with `proxy-cache.md` AC26's `internal/proxy/revalidate_job_test.go`; the keyless remote admitted under class `none` and installed from, and the foreign-key remote never current, with the operator record, shared with `signing-service.md` AC36's conformance row, the admission rule itself its `internal/index/admission_test.go`); `internal/format/alpine/index/profile_test.go` (the template with its two sourced variables and grammars, round bound one, and a profile lacking the template, a source or a safe grammar refused at registration) |
| AC21 | integration + conformance | `internal/format/alpine/policy_config_test.go` (advisory rule without an `advisory_ecosystem` refused, an unlisted value refused `validation` through the repository `PATCH`; each version's `origin` reported as its advisory key where it differs from `pkgname`, stored on the `Version` row and absent from the document, and carried on a proxied miss's fetch-and-cache request refused before any upstream request; coordinate and signature-verdict rules; the matcher and storage halves are `supply-chain-policy.md` AC17's and AC24's and `data-model.md` AC46's); `conformance/alpine/advisory_policy_test.go` (controlled advisory through the `advisories` key, both paths) |
| AC22 | conformance | `conformance/alpine/replay_test.go` (corpus replay); `conformance/alpine/real_upstream_test.go` (recording session: both stock images with only their `alpine-keys` through a remote over dl-cdn) |
| AC23 | integration | `internal/storage/metadata_root_test.go` (threshold crossing with a generated index and a proxied filename map, sweep, serve); `internal/format/alpine/proxied_retention_gc_test.go` (the current and the retained revision's body and map declared on the remote's list, a sweep with the grace lapsed while retained, an install of a package only the retained revision names, both collected after the dropping adoption, a late map build discarded); `conformance/alpine/large_tree_test.go` (both lines install after the sweep) |
| AC24 | unit + conformance | `internal/format/alpine/capabilities_test.go` (the four declarations, `format-handler-interface.md` AC13); `conformance/alpine/rename_test.go` (`repository-lifecycle.md` AC12, presence enforced by `conformance-harness.md` AC26; byte-identical indexes, key files and packages and installs on both lines under the new name in both modes; the key half is `signing-service.md` AC29's `internal/signing/lifecycle_test.go`; the old name's `not-found`) |
| AC25 | integration + conformance | `internal/format/alpine/proxied_metadata_test.go` (an eviction pass over a remote far over quota; indexes, segments and maps untouched and served inside TTL; both gauges read through `telemetry.NewTestRecorder`; the layer half is `proxy-cache.md` AC29's); `internal/format/alpine/serve_file_test.go` (packages through `ServeFile`, the `ETag` the CAS digest; the boundary is `signing-service.md` AC11's `internal/format/freshness_boundary_test.go`); `conformance/alpine/proxied_evict_test.go` (both lines install after the pass) |

The case set needs only keys already in the harness's closed `setup` vocabulary (its resolved
closed-vocabulary decision, was Q4): `repositories` with their type, virtual member order, the
repository metadata document (the architecture set) and a `signing` sub-entry (a fixture private
key file or `generate`, `conformance-harness.md` AC24), the `advisory_ecosystem` declaration being
repository configuration set through the same entry's core-parsed fields; `trust` for the trusted
package keys and a remote's vendor keys (`artifact-verification.md` AC25); `credentials`;
`upstreams` (a stand-in mirror signed by a fixture vendor key, variants for mutation, corruption,
key rotation, redirection and throttling, and the second host AC14 declares); `state` for
pre-published packages and seeded `Retirement` records; and `advisories` and `policies` for AC13
and AC21, which Alpine's `package-level` row in `supply-chain-policy.md` lets past the harness's
pending-row rule (`conformance-harness.md` AC26). The two obligations this spec once placed on the
harness are met: a `state` entry for a hosted package comes out with its tree's indexes generated
and signed because the index runtime runs before every commit, the seed write included, with no
seed-side code (`signing-service.md` AC21, `conformance-harness.md` AC24), and the case's `script`
reads the repository's key file from the server before the client runs; and an Alpine case
empties `/etc/apk/keys` of the image's keys and writes its own key files and repository lines,
because a stock image trusts Alpine's keys and lists dl-cdn, which the case owns rather than the
harness. The runner-enforced obligations, both
modes and the unauthenticated, unauthorized and pattern-refusal cases in each, apply from the
sibling specs and are not restated per criterion.

## Implementation Phases

### Phase 1: Hosted reads and the signed indexes
- Waits on `docs/internal/plans/foundation/signing-service.md` reaching `planned` (Blocking
  preconditions)
- The format-first mount, tree and architecture parsing, the generator package
  `internal/format/alpine/index` behind `Indexer`, the index and key routes through
  `ServeDocument` and the package route through `ServeFile`, each with `HEAD` and ranges, filename lookup and percent-decoding, the Basic challenge,
  seeded packages through `state` with generated and signed indexes, the per-route addressed
  objects with the descriptor key document, the `403` rendering through `WriteRefusal`, and
  `Capabilities()` with the rename case (AC24)

### Phase 2: Publish and management
- Waits on `docs/internal/plans/foundation/management-api.md` reaching `planned` (Blocking
  preconditions)
- The `Operator` declaration: batch publish with its ingest rules and package-signature verdicts
  through `Verifier`, the architecture set, deletion with the core-held retirement, key rotation
  through the dual-signature window on the signing-key routes, the write-boundary declaration
  exercised under concurrency

### Phase 3: Proxied path
- Waits on `upstream-adapters.md` and `artifact-verification.md` reaching `planned` (Blocking
  preconditions)
- Verified index revisions with TTL, conditional revalidation and the cache-scoped
  `Last-Modified`, the filename map with the current and one retained revision declared on the
  remote's blob-digest list, packages verified by the handler-supplied verifier with
  recorded signature verdicts, index revisions outside the quota in `cache_metadata_bytes`
  (AC25), negative caching, the removal classes, each version's `origin` reported as its advisory
  key for the core's `advisory_ecosystem` matching, `405` on remote writes

### Phase 4: Virtual repositories, corpus and gate
- The per-tree, per-architecture merge with per-name shadowing as the `index.merge` job, the
  profile's member-input path, re-merge on remote adoption and the virtual-only remote's
  revalidation (AC20), the recorded corpus against
  dl-cdn and the `apk index` reference, both client lines in the matrix, the exception-list
  entries named in Design

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. The eleven questions this draft raised were each written in the template's decision
shape and then adopted at their own recommendation under the owner's standing delegation of
2026-09-26, so the loop can continue; each is recorded below as adopted rather than decided,
folded through Scope, Design, the criteria and the Test Plan in the same pass, and reversible by
the owner at any time, and each carries the verdict of the Fable recheck of 2026-10-01. A
twelfth, raised and adopted in that recheck, supersedes one clause of the seventh and is
owner-facing. `grep -rn "standing delegation"` is the owner's review queue.

### Resolved: how a repository relates to the base URLs clients name (was Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a repository holds any
number of trees identified by a path declared at publish, each served per architecture and
independently generated and signed; a remote's trees are its upstream's paths (Design, "Trees and
architectures"; AC4, AC6, AC12).

The question: an apk repository line names one base URL, and Alpine keeps one per branch and
component (`v3.24/main`, `v3.24/community`).

**Recommendation:** A. It gives hosted and proxied repositories the same shape, a remote over a
mirror root necessarily holding many trees; it lets one repository carry a product for several
Alpine branches; and it keeps writes to different trees uncontended. It is `rpm.md`'s resolved
tree decision applied to the same problem.

| Option | You get | It costs |
|---|---|---|
| **A. Many trees per repository, path declared at publish** | One repository per product or team; symmetric with remotes; per-tree regeneration | A tree path in every coordinate and addressed object; a grammar for it |
| **B. One tree per repository** | The simplest model | A hosted repository per branch and component, and remotes that cannot be one mirror root |

**Why this is yours:** it fixes the unit users create, grant and point clients at.

Accepted cost: the tree segment in the addressed object, which also lets a patterned grant confine
a token to one branch.

Rechecked on Fable 2026-10-01: confirmed. Under-stated: the tree path is also the `{tree}`
variable of the virtual's member-input template, so the grammar stated in "Trees and
architectures" is what registration checks for a safe expansion (was-Q21 of
`signing-service.md`; AC20).

### Resolved: where `noarch` packages live and which architectures a tree serves (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the repository declares
its architecture set, defaulting to dl-cdn's nine; every tree serves a signed index per declared
architecture, empty ones included; a `noarch` package is listed in each with `A:` rewritten to that
architecture and served from `{tree}/{arch}/` (Design, "Trees and architectures"; AC5, AC7).

The question: apk fetches a package from the directory its record's `A:` names, so a record
saying `A:noarch` sends the client to `{base}/noarch/` (captured), while Alpine's own indexes
rewrite every record to the index's architecture (live: 5,961 of 5,961 records `A:x86_64`).

**Recommendation:** A. It reproduces exactly what `apk index --rewrite-arch` and Alpine's mirrors
produce, which gives the generator a byte-level oracle (AC7), and a declared set answers the
question "which indexes exist" before any architecture-specific package arrives, so `apk update`
never fails for an architecture that simply has nothing yet (an empty signed index is accepted,
captured).

| Option | You get | It costs |
|---|---|---|
| **A. Declared set, `A:` rewritten, per-architecture paths** | Alpine's own layout; an oracle; no failing `apk update` | Nine indexes re-signed per `noarch` publish by default |
| **B. Keep `A:noarch`, serve `{tree}/noarch/`** | One path per `noarch` file | A layout no Alpine mirror uses, so no oracle, and the architecture set still needs declaring |
| **C. Architectures inferred from published packages** | No configuration | A tree with only `noarch` packages serves no index at all |

**Why this is yours:** it sets a repository-configuration field every operator sees.

Accepted cost: the nine-index regeneration, bounded by narrowing the declared set.

Rechecked on Fable 2026-10-01: confirmed. Two things the record under-stated: the set lives in
the repository-level document, so it is snapshot content and a repoint restores set and index
bodies together (the management-api wording "a `settings` document" names the `configure` shape,
as `arch.md` reads it too); and in a virtual the set per tree is the union of the members', a
hosted `noarch` version appearing across it (Design, "Virtual repositories"). The client case the
format sweep chose for AC8 (a removed architecture's index answering `404`, then restored) is
confirmed, with the honesty note that an index `404` was not itself captured and the case is
its proof (Design, "The wire surface").

### Resolved: who signs packages on the hosted path (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: packages carry their
publisher's signature, or none; the registry stores and serves the published bytes unaltered,
verifies the signature for policy, and never signs a package (Design, "Two trust layers"; AC3).

The question: `apk index` refuses to index packages signed by a key it does not trust (captured),
so Alpine's tooling treats the package key as an indexing-time check; this registry is the indexer.

**Recommendation:** A. No repository install checks the package signature (captured on both
lines), so registry signing would buy nothing a client verifies, while changing the file's first
stream and therefore its bytes and `S:`, losing dedup across repositories and making hosted and
proxied packages differ in kind; a policy rule over the verifier's verdict gives an operator the
indexing-time check `apk index` performs.

| Option | You get | It costs |
|---|---|---|
| **A. Publisher-signed or unsigned, bytes never altered, verdict for policy** | Package identity equals the published digest; one rule on both paths | Local-file installs of an unsigned package need `--allow-untrusted` |
| **B. Registry signs every package at ingest** | Local-file installs work with the repository key | Served bytes differ from published ones for a check no repository install makes |
| **C. Refuse unsigned or untrusted packages at ingest, as `apk index` does** | Alpine's tooling behaviour by default | A fixed rule where a policy rule already expresses it per repository |

**Why this is yours:** it decides what "signed" means for a package in this registry.

Accepted cost: the operator documentation's note on local-file installs.

Rechecked on Fable 2026-10-01: confirmed. The options were framed fairly and the capture that
decides it (no repository install checks the package signature, on both lines) is the strongest
in the spec. Under-stated: the verdict a policy rule reads is `absent` on a hosted repository
whose trust set holds no package key, so "require a verified signature" binds nothing until the
operator provisions publisher keys, which the operator documentation states.

### Resolved: the index key, its algorithm and its distribution (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: one RSA 4096 key per hosted
and virtual repository, held by the signing service, signing `RSA256`, its public key served at
`/apk/{repository}/keys/{keyname}.rsa.pub` under the repository's ordinary read authorization
(Design, "What the signing and index service must provide", "Authentication"; AC2, AC9).

The question: apk finds the key by exact filename and has no way to fetch one, so the key's name
is a wire contract and the file reaches the client by the operator's hand.

**Recommendation:** A. A per-repository key bounds a compromise to one repository, as `rpm.md`'s
resolved metadata-key decision found; `RSA256` avoids SHA-1 and verified on every client line
tried; and keeping the key route inside authorization preserves `auth.md` AC17's rule that a
private repository is indistinguishable from a missing one, at no cost here, since apk never
fetches keys itself and the operator's `wget` can carry the credential.

| Option | You get | It costs |
|---|---|---|
| **A. Per-repository key, `RSA256`, no authorization carve-out** | Contained compromise; no SHA-1; the existence rule intact | One key file per repository on every client |
| **B. Alpine's `RSA` (SHA-1) signatures** | Byte-level likeness to Alpine's indexes | A SHA-1 signature where a SHA-256 one costs nothing |
| **C. One instance-wide key, served anonymously** | One key file for every client | One key compromise re-signs every repository's index |

**Why this is yours:** it trades a client-configuration step against compromise scope.

Accepted cost: the key-file step in the operator documentation. The key route is now a
descriptor under `auth.md`'s resolved name-free-document decision (was Q23 there), so a patterned
`pull` reads it; the existence rule is untouched, since a descriptor still needs a scope on the
repository.

Rechecked on Fable 2026-10-01: confirmed, amended in two details. The key name's
`{instance host}` was undefined and is now the host of `server.public_url` at creation, fixed
in the name with the repository name of that moment (a rename changes no key name, which is
what makes `Rename: supported` true); and AC2's "exactly one `.SIGN` entry" was contradicted by
the dual-signature window AC9 asserts, so AC2 now says outside a window. The rotation profile
itself (item 5) was examined against the captures: both orders verify, the first trusted
signature decides, and a window is the only cutover that lets a client install the new key file
on its own schedule; a virtual's key rotates under the same profile.

### Resolved: rendering a package policy refusal (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: `403` with the
`{"errors": [...]}` body on the package route, indexes unchanged (Design, "Policy refusals on the
wire"; AC13, AC14).

**Recommendation:** A. It is the cross-format rendering; a refused package never falls back to
another repository (captured), so the refusal holds; and removing the package from the index would
mean re-signing trees on every policy change, and could not be done at all to a proxied index
served verbatim under Alpine's signature.

| Option | You get | It costs |
|---|---|---|
| **A. `403` on the package route, index unchanged** | One rendering; enforcement without touching signed indexes | Clients print a bare "Permission denied" or "HTTP 403"; the reason reaches the operator, not the user |
| **B. Remove refused packages from the index** | The resolver picks another version | Per-policy regeneration, indexes differing by caller, impossible for verbatim proxied indexes |
| **C. Refuse the index** | A loud warning | apk skips the repository and installs from others with exit 0 (captured) |

**Why this is yours:** it trades a terse client message against enforcement that cannot be
side-stepped.

Accepted cost: the operator documentation explains both lines' messages.

Rechecked on Fable 2026-10-01: confirmed. The capture that a refused package never falls back
while a refused index is skipped silently is what makes A the only enforceable option, and the
`package-level` row `supply-chain-policy.md` carries for Alpine says so.

### Resolved: what a proxied tree serves (was Q6)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: upstream indexes and
packages are served verbatim after verification against the remote's configured upstream keys
(Design, "The proxied path"; AC15, AC16).

**Recommendation:** A. An Alpine host keeps its stock `alpine-keys` (captured installing from
dl-cdn on both lines); nothing half a megabyte large is regenerated on every upstream refresh; and
an upstream key rotation surfaces as a deliberate operator step instead of a silent re-signing.

| Option | You get | It costs |
|---|---|---|
| **A. Verbatim after verification** | Stock keys work; no regeneration; lock-step with the upstream | An unverified record for remotes with no keys configured; an operator step when Alpine adds a key |
| **B. Regenerate and re-sign under the remote's key** | One trust anchor for all content | Every client adds this registry's key for Alpine content, and every revision is regenerated |

**Why this is yours:** it decides whose key an Alpine user trusts through this registry.

Accepted cost: the operator record of unverified remotes and of foreign-key revisions.

Rechecked on Fable 2026-10-01: confirmed, and amended in vocabulary. "Unverified" is now the
taxonomy's: a remote with no apk key adopts under anchor class `none` with verdict `absent`,
never `failed` (`artifact-verification.md` was-Q2 as amended; Design, "The proxied path"), which
is also what lets such a remote contribute to a signed virtual (was-Q20 there). The cost the
record under-stated: a remote whose trust set holds apk keys for package verdicts refuses an
unsigned upstream index as `failed`, which is right here because no apk client installs from one
either, and is stated so that the Arch-shaped trap is seen not to apply. The one path the
vocabulary change opened, a keyless remote whose upstream stops serving the signature it served,
is closed by the resolved withdrawn-signature decision below (was Q13).

### Resolved: virtual Alpine repositories (was Q7)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a virtual tree is the
per-path, per-architecture merge of its members' trees with per-name first-member resolution,
`provides` included, generated and signed with the virtual repository's key (Design, "Virtual
repositories"; AC20).

**Recommendation:** A. apk installs the highest version it can see across every repository
(captured), so a client listing a private and a public repository side by side is exposed to
dependency confusion by default; a merged index with per-name shadowing is the one configuration
that closes it, and since packages are trusted through the index, the client needs one key file.

| Option | You get | It costs |
|---|---|---|
| **A. Merged per tree and architecture, per-name first member, re-signed** | One repository line; shadowing; one key file | A merge on every member change |
| **B. No virtual repositories; clients list several lines** | Upstream signatures untouched | Highest version wins across lines, and a refused index is skipped silently (captured) |
| **C. Union of every version from every member** | Every version visible | A public version of a private name becomes installable |

**Why this is yours:** it sets precedence semantics users rely on for private names.

Accepted cost: re-merging upstream trees on revalidation, and the note on shadowed versions.
`signing-service.md` runs the merge as the deferred, coalesced `index.merge` job with a staleness
bound (its "Virtual merges", AC19), so a member's change reaches the virtual within that bound
rather than inside the member's write, and the handler's `Capabilities()` declares the choice as
`Virtual: supported` (`format-handler-interface.md` AC13). The re-merge on revalidation is that
spec's adoption hook (its resolved remote-member decision, was Q16, AC35), with the member-input
path this profile declares feeding a never-adopted remote (AC20).

Rechecked on Fable 2026-10-01: confirmed in its shape (a merged, re-signed tree with per-name
shadowing is the one configuration that closes the highest-version-wins exposure), amended in
its fold, and **superseded in part** by the resolved shadowing decision below (was Q12), which
is owner-facing. The fold: what a remote member contributes is decided by the anchor class its
adoption ran under (`signing-service.md` was-Q20, AC36), so the "verified only" exclusion this
record's body carried, written under that spec's was-Q17 and then applied by the format sweep as
"a keyless remote contributes nothing", is gone; a keyless remote contributes under class `none`
and the `alpine-keys` recipe is advice for class `signature`. The member input is a template
over the other members' trees and architectures with a read-driven cell for a tree only the
remote holds (its was-Q21, was-Q22), which closes the gap the sweep reported. Costs the record
under-stated: the virtual's architecture set per tree is the union of its members', with a hosted
member's `noarch` versions listed across it; and the shadowing of `provides` names, which this
option's text included, is the part superseded, since it needs a merged record that says less
than the package's own `.PKGINFO` and no capture backs that.

### Resolved: the v3 index and v3 packages (was Q8)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: v2 only; `Packages.adb`
is not served, and v3 packages are refused at publish (Scope; AC6).

**Recommendation:** A, for reasons other than effort: apk-tools 2.14 cannot read a v3 index
(captured), no Alpine release's default configuration names one, dl-cdn publishes none (live), so
there is nothing to proxy, and both pinned `abuild` versions still emit v2 packages; a v3 surface
would be tested by no ecosystem traffic and would bring the v3 index's package name specification, which sent a client to
another host (captured).

| Option | You get | It costs |
|---|---|---|
| **A. v2 only** | One index form every client line reads; an oracle in `apk index` | A revisit when Alpine switches its mirrors to v3 |
| **B. Serve both v2 and v3 indexes per tree** | Ready for a v3 switch | Two signed documents per architecture per write, one read by no default configuration |

**Why this is yours:** it decides whether the registry anticipates an ecosystem transition.

Accepted cost: the revisit, whose trigger is dl-cdn publishing `Packages.adb`.

Rechecked on Fable 2026-10-01: confirmed. The adversarial question is whether Alpine 3.24's
apk-tools 3.0.8 changes the answer; it does not, because its default repository lines are
untyped and therefore v2 (captured), so every stock client still reads what this spec serves.

### Resolved: the write boundary of a multi-package publish (was Q9)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: one publish carries one or
more packages for one tree and is one write with one regeneration (Design, "The hosted publish
path"; AC6).

**Recommendation:** A. An `abuild` run of one `APKBUILD` produces a package and its subpackages
(`-doc`, `-dev`) that depend on one another, a regeneration is proportional to the tree rather
than the change, and a half-published set visible between two snapshots is a resolution failure a
client can hit.

| Option | You get | It costs |
|---|---|---|
| **A. Batch publish, one write** | Atomic releases; one regeneration | A larger request, bounded by the spool |
| **B. One package per write** | The simplest API | A regeneration and a snapshot per package, and partial releases visible |

**Why this is yours:** it fixes a management-API shape that `management-api.md` inherits.

Accepted cost: recorded for `management-api.md`, whose reconciliation table now carries it: a
batch publish is one `publish` operation and one write, authorized only if every object it adds is
in pattern (its "The operation vocabulary", AC4, AC5).

Rechecked on Fable 2026-10-01: confirmed; `management-api.md`'s reconciliation table carries
the "RPM, Alpine, Arch | batch publish (one write)" row at this sha.

### Resolved: how an Alpine repository binds to OSV (was Q10)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a repository may declare
one OSV ecosystem string, matched on each version's `origin`; without it, advisory-dependent rules
are refused at configuration (Design, "Advisories, OSV and the security-signal rule"; AC21).

**Recommendation:** A. OSV keys Alpine by release and by origin package (captured), so a name and
version mean different things on different branches and a binary subpackage matches nothing by its
own name; a declaration per repository is the smallest unit that can be right, and it matches
`rpm.md`'s resolved OSV decision.

| Option | You get | It costs |
|---|---|---|
| **A. Per-repository declaration, origin matching** | Correct matching; refusal where none is declared | One remote per Alpine branch for advisory policy |
| **B. Infer the release from the tree's first segment (`v3.24`)** | One remote over the whole mirror | Hosted trees name branches freely, and a wrong inference matches the wrong advisories |
| **C. Match on `pkgname`** | No origin parsing | Subpackages such as `libssl3` never match their source's advisories (captured) |

**Why this is yours:** it sets what an operator must configure before advisory policy works.

Accepted cost: the configuration step, recorded for `supply-chain-policy.md`.

**Revised 2026-09-28 by reconciliation, not re-decided here.** `supply-chain-policy.md` adopted this
shape for every OS-package format ("OS-package repositories declare their ecosystem"): the
declaration is the core-parsed `advisory_ecosystem` repository field, validated against the
configured sources' ecosystem lists and refused `validation` naming an unknown value, stored beside
the retention rules and never in the handler's documents (`data-model.md` AC28), and the matcher
keys Alpine on the origin package (its coverage table, AC17). This handler therefore holds no
declaration; it knows each version's `origin` and reports it as the version's advisory key, the
channel `supply-chain-policy.md`'s resolved advisory-key decision (was Q11, AC24) settled, which
closes the consequence this record once left open (Design, "Advisories, OSV and the
security-signal rule"; AC21).

Rechecked on Fable 2026-10-01: confirmed, as revised by the reconciliation: the declaration is
`supply-chain-policy.md`'s core-parsed `advisory_ecosystem` and the handler reports the origin
as the version's advisory key, both verified in that spec's text at this sha (its "OS-package
repositories declare their ecosystem", AC11, AC24).

### Resolved: the recommended credential form and preconfigured mirrors (was Q11)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the operator documentation
recommends `.netrc`, supports userinfo and `HTTP_AUTH` with their caveats, and no Alpine mirror is
preconfigured (Design, "Authentication", "Advisories, OSV and the security-signal rule"; AC11).

**Recommendation:** A. `.netrc` is host-scoped and never printed, where userinfo is printed by
apk-tools 2.14.12's `apk policy` and by both lines' redirect warning, and `HTTP_AUTH` is answered
to any host that challenges (captured and `libfetch/http.c`); the cost is one `401` round trip per
file. No mirror is preconfigured because the advisory binding needs one remote per branch (was
Q10), and any single branch preconfigured would be the wrong one for most installations.

| Option | You get | It costs |
|---|---|---|
| **A. Recommend `.netrc`; no preconfigured mirror** | Credentials off the command line and out of output; no privileged branch | Twice the requests per file; a configuration step for every user |
| **B. Recommend userinfo; preconfigure dl-cdn's current stable branch** | One request per file; a zero-configuration cache | Passwords in `apk policy` output and image layers; a branch that ages with every release |

**Why this is yours:** it sets the recipe every Alpine user copies.

Accepted cost: proxied cases run against stand-ins; the real mirror is exercised by the recording
session and the nightly job once configured.

Rechecked on Fable 2026-10-01: confirmed. The record under-stated one cost, now stated:
`.netrc` doubles the requests per file and therefore per `apk add`, which on a tree of a few
hundred packages is a few hundred `401`s a run, all logged by `auth.md`'s request log, so the
operator documentation's recipe should say that the `401`s are the protocol and not a fault.

### Resolved: shadowing by literal name, records composed whole (was Q12, raised and adopted 2026-10-01)

**Adopted 2026-10-01 under the owner's standing delegation**, in the Fable recheck. Option A: a
virtual tree shadows by **literal package name** only, the first member holding a name
contributing every version of it and later members' versions of it omitted; every merged record
is the member's record whole, its `p:` field included; and the client's own choice between a
first member's real package and a later member's provider of that name is captured by AC20's case
on both lines, once without and once with `provider_priority` on the provider, with the record
rewrite of option B held as the fallback should the capture show the provider winning (Design,
"Virtual repositories"; AC20). **This supersedes, in part, the resolved virtual-repository
decision above (was Q7)**, an Opus adoption whose option A read "the same rule applies to
`provides` names". It is owner-facing.

The question: Q7 closed dependency confusion by name, and extended the same shadowing to
`provides`, so that a public member's package providing a private name would lose its `p:` entry
in the merged index. That needs the merge to rewrite a record field, and the rewritten record
then says less than the package's own `.PKGINFO`, which both apk lines read at install and
reconcile with the index they hold; nothing in this spec's captures shows what either line does
with that divergence, and `arch.md`'s Fable recheck decided the identical shape for pacman as
literal-name shadowing with providers kept whole (its was-Q14). Whether a provider can beat a
real package at all is the client's rule, with `provider_priority` as its lever, and it was never
captured.

**Recommendation:** A, because it keeps every merged record equal to a member's record, which is
what AC7's oracle and the "package bytes are the members'" rule assume; it turns an unverified
protection into a recorded fact at the first conformance run; and it keeps the one case where
the rewrite would matter, a provider winning over a real package, as a fallback that the capture
either justifies or retires.

| Option | You get | It costs |
|---|---|---|
| **A. Literal-name shadowing; records whole; the provider case captured; rewrite as fallback** | Merged records identical to the members'; the client's real resolution on record; consistent with `arch.md` | A provider in a later member stays visible to the resolver until the capture says whether that matters |
| **B. Shadow `provides` too, by rewriting later members' `p:` fields** | No provider of a first-member name reaches the resolver | A merged record that contradicts the package's `.PKGINFO` at install, with no capture of either line's behaviour; a rewrite step in `Merge` the oracle cannot check |
| **C. Drop any later-member package that provides a first-member name** | No rewrite, no provider | Whole packages vanish from the virtual because of one `provides` line, which shadows far more than the name |

**Why this is yours:** it sets what a virtual's shadowing promises for names a package provides
rather than carries, and it reverses one clause of an adopted decision.

Accepted cost: the provider case is recorded rather than refused until the capture exists; the
exposure, if the capture shows it, is a public member's `provider_priority` beating a private
name, cured by the fallback or by the operator placing no public member before a private one. B
lost to the unverified divergence; C to over-shadowing.

### Resolved: a signature the upstream stops serving (was Q13, raised and adopted 2026-10-01)

**Adopted 2026-10-01 under the owner's standing delegation**, in the Fable recheck, taking
`rpm.md`'s resolved decision of the same name (was Q12 there, adopted on Fable the same day) for
this format. Option A: on a remote holding no apk key, an `APKINDEX.tar.gz` revision arriving
with no `.SIGN` entry for a tree and architecture whose current revision carried one is a
**regression not adopted**: the signed revision keeps serving, a divergence naming the missing
signature is recorded, and the operator's refresh is what adopts the unsigned successor; a cell
first adopted without a signature never arms the rule. The fact the rule reads is the handler's
own, recorded by its adoption check on the remote's document (whether the revision's leading
segment carried a `.SIGN` entry), never the anchor class (Design, "The proxied path", the removal
table; AC19).

The question: `signing-service.md`'s admission-by-anchor-class decision (was Q20 there) lets a
keyless remote compose into a signed virtual, which this spec now states. Alpine's mirrors always
sign (live; apk refuses an unsigned index without `--allow-untrusted`, captured), so a mirror,
or whoever controls one, that stops serving the segment is the signature-stripping case: a direct
client holding the stock keys refuses it, but a virtual re-signing the composed tree would admit
it under class `none` and its clients would trust the registry's signature over an index Alpine
no longer vouches for. Where RPM's signature is a separately served `.asc`, so that its hook has
to follow what was served, Alpine's is inside the one document and its hook is always declared;
the shape of the downgrade is nevertheless the same. `arch.md` read an unserved optional `.sig`
as class `none`; that reading is being aligned there and is not copied here.

**Recommendation:** A, for `rpm.md`'s reasons: the regression class already exists for an older
revision, a withdrawn signature is a regression of the same kind, `proxy-cache.md` already gives
every regression its cure, and nothing is read that the handler is forbidden.

| Option | You get | It costs |
|---|---|---|
| **A. A withdrawn signature is a regression not adopted** | No silent downgrade into a signed virtual; the cure is the existing refresh; no new read for the handler | A legitimately unsigning upstream serves its last signed revision until an operator refreshes; one more divergence kind |
| **B. Class `none` adopts whatever arrives** | One rule, nothing to refresh | A stripping mirror composed into a signed virtual silently; the virtual weaker than a direct client with the stock keys |
| **C. Require the operator to configure `alpine-keys` on every remote a virtual lists** | Strict by configuration | Reinstates the exclusion was-Q20 removed, for every private TLS upstream too |

**Why this is yours:** it decides whether the registry's signature on a virtual can cover a
tree whose upstream signature vanished, and it adds a regression kind to a settled class.

Accepted cost: the refresh-gated adoption of a genuinely unsigned successor, and the divergence
kind; `proxy-cache.md`'s "Regression not adopted" row may name this format for it (reported). B
lost to the silent downgrade; C to reinstating the exclusion.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | 99075e9 | authoring pass: grounded first draft, not a review | Grounded four ways: captured traffic from apk-tools 2.14.12 (Alpine 3.22.6) and 3.0.8 (Alpine 3.24.2), with signature cases repeated on 2.14.4 (3.20.10) and 3.0.8 (3.23.6), images pinned by digest, against a logging stub on dedicated Podman networks serving repositories built with the images' own abuild 3.15.0 and 3.17.0, `abuild-keygen`, `abuild-sign`, `apk index` and `apk mkndx` (request sequence and `libfetch/2.0` agent, the `A:noarch` path trap, `RSA` and `RSA256` index signatures, unsigned, foreign-key, stale and renamed-key refusals, dual signatures accepted in either order with the first trusted one deciding, unsigned and foreign-key packages installing from a trusted index while local-file installs refuse them, swapped control and data streams refused, `403`, `401`, `404` and 500 rendering with no body and no retries, no fallback for a refused package and a silently skipped refused index with exit 0, highest version winning across repositories, preemptive userinfo and challenged `.netrc` and `HTTP_AUTH`, userinfo printed by 2.14.12's `apk policy` and by both lines' `301` warning, cross-host redirects dropping credentials, index caching with 2.14.12 skipping a repeated `apk update`, `v3` lines and `Packages.adb`, absolute `pkgname-spec`, case, `++` and `_rc1`); the Alpine wiki's apk format page and the apk-tools 2.14.12 and 3.0.8 manual pages and sources; the live dl-cdn mirror (headers and `304`s, layout, the v3.24 index and a package taken apart with `C:` recomputed, signature scope recomputed with raw RSA, superseded builds removed, real installs with stock keys); and OSV's Alpine ecosystem (release-keyed, origin-keyed, no `MAL-` records). Eleven questions written in decision shape and adopted under the standing delegation: many trees per repository (AC4, AC6, AC12), a declared architecture set with `noarch` rewritten (AC5, AC7), publisher-signed packages never altered (AC3), a per-repository `RSA256` key with no authorization carve-out (AC2, AC9), `403` package-level refusals with indexes unchanged (AC13, AC14), verbatim proxied indexes (AC15, AC16), merged and re-signed virtual trees with per-name shadowing (AC20), v2 only (AC6), batch publish as one write (AC6), a per-repository OSV declaration matched on origin (AC21), `.netrc` recommended and no preconfigured mirror (AC11). Twenty-three criteria, each with a Test Plan row. Stays draft; awaits an independent review. |
| 2026-09-28 | 15ced69 | cross-spec reconciliation of the foundation wave, on Opus. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` naming this file verified against the current text of its source spec before applying. From `signing-service.md` (item 9, consequences Open item 21): `Indexer` and generator package `internal/format/alpine/index`, pre-commit dispatch, per-document lock, the signature a `Signature` record framed onto the stored body as the prepended segment at serve time, rotation as the `dual-signature` profile with opening and closing each one atomic batch and no snapshot (item 5 reworded, AC9), the virtual merge as the `index.merge` job (AC20); Open item 21's question answered: no pointer-scoped signed wrapper, since neither the segment nor the index carries a date and apk adopts whatever verifies, AC4 extended with a rollback case; the seven-item list mapped onto the contract; `DESCRIPTION` no longer names the repository so a rename changes no index byte (`signing-service.md` AC29). From `management-api.md`: kinds `publish`, `delete-version`, `delete-package`, `configure` with key phases on the signing-key routes, core-held retirement refused with `retired` (AC6, AC8), `405` as `repository-type`, the batch-publish record discharged. From `auth.md` was Q23: the key document is a descriptor (AC12); the `apk` client-table row is still absent there (reported). From `artifact-verification.md` (AC12, AC21, AC24, AC25): the `apk` entry and integrity answers through `Verifier` (AC3, AC15), sharing its `conformance/alpine/signature_test.go`. From `upstream-adapters.md` item 12 and `proxy-cache.md` (was Q15, AC22, event classes): the `https` adapter's allowlist, root-only `basic` credential and `http://` refusal, packages fetched in verifier mode because `C:` is not a whole-file digest, cache-scoped `Last-Modified` (AC17), removal rows named by class. From `supply-chain-policy.md` (binding and coverage tables, was Q10, AC18): `WriteRefusal` and the phrase captured on 3.0.8 (AC13), the `package-level` row re-asserted, the OSV declaration now the core-parsed `advisory_ecosystem` (the OSV record revised, AC21), with the channel by which the core learns a version's origin reported as unspecified. From `conformance-harness.md` (reconciliation 4, was Q6, AC23, AC24, AC26): the seed-path obligation met, `signing` sub-entry and `trust` key, AC14's open-egress half re-expressed with a declared stand-in. From `repository-lifecycle.md` AC12: Capabilities and lifecycle section, new AC24. Twenty-four criteria, each with a Test Plan row; no question adopted, `fable_recheck` kept. `node scripts/check-spec.js` reports no failure in this file. Stays draft; awaits an independent review. |
| 2026-09-28 | 93982ba | data-loss fix on Opus (storage-and-gc closing-sweep item 0): cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Applied item 0 of "From the storage-and-gc.md closing sweep" in `agents/spec-loop/consequences.md`, verified against `storage-and-gc.md`'s fourth mark root (its third reach, AC16) and `data-model.md` AC34, AC36 and AC45: a digest a document merely mentions keeps nothing alive, the declared blob-digest list is a document's only keep-alive, and a remote writes no content snapshot. The holes: the remote's retained index revisions and per-revision filename maps, stored as CAS-backed metadata on the remote's document, were named only in its body, and the changed-`C:` row kept the old blob "for older revisions" through nothing the sweep follows and through a route that cannot tell which revision apk holds (`{P}-{V}.apk` carries no digest). Now: one superseded revision retained per tree and architecture, its `APKINDEX.tar.gz` body and map on the remote's declared blob-digest list, dropped by the adoption that pushes the revision out, a late map build discarded (proxy-cache was-Q19, AC27, chosen over a cached reference because a map is metadata with no `File` row and must not be evicted while its revision still serves); cached packages held by their own cached references; the changed-record row serving the current index's bytes with the new commit ending the old blob's reference (proxy-cache was-Q20, AC28). AC19 and AC23 extended so each fails if a retained body or map is collected; Test Plan rows (`internal/format/alpine/proxied_retention_gc_test.go` added) and Phase 3 updated. The hosted path is unchanged. No new question adopted here; `fable_recheck` extended for the folded decisions. `node scripts/check-spec.js`: zero failures on this file. Stays draft. |
| 2026-09-28 | f8ad8b2 | format closing sweep on Opus. Not a review | Not a review. Every still-open item in `agents/spec-loop/consequences.md` targeting this file, from every section, verified against the current text of its source spec and of this file. Applied: foundation-leftovers item 2 and `signing-service.md` AC35 (member-input path `{tree}/{arch}/APKINDEX.tar.gz`, replayed for every tree and architecture another member holds; a tree only the remote holds reported as a gap), signing-service closing-sweep item 6 and proxy-cache closing-sweep item 6 (remote adoption re-merges, was-Q16, AC35; the virtual-only remote's revalidation, `proxy-cache.md` AC26; item 7 of the service requirements and the Q7 record updated; AC20 and its row extended); management-surfaces item 14 (the architecture-set `configure` observed by a real client: `apk` installs nothing with the client's architecture removed and installs after it is restored, from captured 404 behaviour; AC8 and its row extended); supply-chain closing-sweep item 3 (origin reported as the version's advisory key, supply-chain was-Q11, AC24, `data-model.md` AC46, closing the channel this spec had reported; AC21, its row, the Q10 record and Phase 3); auth closing-sweep item 3 (the stale 'no apk row yet' wording removed); eviction settlement (index revisions outside the quota, was-Q21; the repository-level declared list confirmed under was-Q22; new AC25); `signing-service.md` was-Q14 (packages through `ServeFile`, Blocking preconditions, Phase 1); management-api closing-sweep item 5 (claims at declaration and again at commit, was-Q14; the declared unchanged publish, was-Q15; AC6 and its row). Found while verifying: `signing-service.md` AC36 excludes a remote accepted on TLS alone from a signed merge; stated and asserted. Data-loss wave 1 confirmed intact (AC19, AC23). The hosted half is recorded against a local `apk index` tree with no exception-list row yet; both alpine rows reported. Found already done: Open item 21's signing half, the no-pointer-wrapper confirmation. Skipped: nothing. No question adopted; `fable_recheck` extended for the member-input expansion and the architecture-set client case. 25 criteria, each with a Test Plan row. Stays draft. |
| 2026-10-01 | 90102bf | Fable recheck: full review (claim verification at HEAD of every sibling citation: `signing-service.md` was-Q20 to was-Q22, AC7, AC8, AC11, AC12, AC19, AC25, AC28, AC29, AC35, AC36, its rotation profiles, "The produce/verify boundary" and "Virtual merges"; `artifact-verification.md` was-Q2 as amended, "Anchor class", AC12, AC21, AC24 to AC26, AC31; `proxy-cache.md` was-Q19 to was-Q22, AC9, AC13, AC14, AC20, AC22, AC25 to AC31, "Freshness of what a remote serves", "Revalidation outside the request" and its removal table; `supply-chain-policy.md`'s Alpine coverage and binding rows, AC11, AC18, AC24; `auth.md`'s `apk` row, AC12, AC17, AC27, AC31, AC36, was-Q23; `management-api.md`'s Alpine rows and `configure` paragraph, AC4, AC5, AC7, AC12, AC14, AC15, AC24, AC32; `data-model.md` AC28, AC33, AC35 to AC37, AC44 to AC46; `storage-and-gc.md` AC8, AC16, AC25, AC30; `conformance-harness.md`'s alpine exception rows, AC13, AC23, AC24, AC26, AC28; `upstream-adapters.md`'s alpine row, AC6 to AC8, AC14, AC15, AC19, AC22; `async-operations.md`'s `index.merge` and `proxy.revalidate` rows; `repository-lifecycle.md` AC2, AC12, AC29; `format-handler-interface.md` AC7, AC8, AC12 to AC15, AC17, AC18; `deployment.md`'s `server.public_url`; the catalogue, charter, prototype and management-surfaces rows; `rpm.md` was-Q12 at this sha; `arch.md`'s recheck as the sibling precedent; the tree holds no Alpine code, so no code claim was testable) + adversarial lens at full strength on the Opus-authored whole (the captured behaviour of both apk lines, key rotation, the architecture-set client case, origin as the advisory key, the data-loss keep-alive) + go-spec-reviewer inline (vacuous on code; the interface shape is pinned by the siblings) + constitution + re-examination of the eleven adoptions made without Fable and the three question-less Opus judgements | Brought current first: every open consequence against this file applied and verified against its source (signing-service recheck item 3: AC20's keyless-remote clause inverted, admission by anchor class stated, the `alpine-keys` recipe advice for class `signature`, the member input as the was-Q21 template with the was-Q22 read-driven cell replacing the gap the sweep reported; artifact-verification recheck item 8 and was-Q2 as amended: `verified`, `failed` with reason, `absent`, a keyless remote reading `absent` and class `none`; the arch recheck's optional-member finding checked and found not to arise, since the signature is inside the one document, stated). The coordinator's mid-pass item, `rpm.md` was-Q12, examined and found to be the same downgrade on a keyless remote: Q13 raised in decision shape and adopted (a withdrawn `.SIGN` entry is a regression not adopted; the removal table, AC19 and its rows). Verdicts: Q1, Q3, Q5, Q8, Q9, Q10, Q11 confirmed, each with an under-stated cost or edge recorded; Q2 confirmed, the architecture-set client case confirmed with the honesty note that an index `404` was not captured and AC8 is its proof; Q4 confirmed and amended (the key name's `{instance host}` defined and fixed at creation; AC2's one-entry shape scoped outside a rotation window, which AC9 had contradicted); Q6 confirmed and amended in vocabulary; Q7 confirmed in shape, amended in fold (admission by anchor class, the template and read-driven cell, the union of architectures with `noarch` across it) and SUPERSEDED IN PART by Q12, owner-facing (literal-name shadowing, records composed whole, the provider case captured on both lines with the record rewrite held as the fallback, matching `arch.md`'s was-Q14), because the `provides` clause needed a merged record saying less than the package's `.PKGINFO` with no capture of either line's behaviour. The data-loss fold (was-Q19, was-Q20) confirmed with two costs stated honestly: the repository-level row serialises trees times architectures, not a handful, and an evicted file of a retained revision is re-fetchable from a stand-in but meets `404` on dl-cdn (the removal table, AC19). The member-input expansion confirmed as the template it had anticipated. AC7 scoped to hosted indexes. Constitution: both paths asserted on every criterion that has them, no handler-owned table, every boundary named to an enforcer, the conformance gate intact, findings in this document; no em-dashes on touched lines. Sibling consequences reported to the orchestrator, not applied: proxy-cache (the "Regression not adopted" row may name Alpine), signing-service (AC36's conformance row may name the alpine keyless case), question-triage (alpine's row), the management-surfaces analysis (no change needed). 25 criteria, each with a Test Plan row; thirteen questions resolved, zero open; `node scripts/check-spec.js` zero failures; `fable_recheck` cleared. draft -> planned. |
