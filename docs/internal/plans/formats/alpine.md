---
status: draft
status_description: "Authored 2026-09-26 as a grounded first draft: the apk repository contract captured from apk-tools 2.14.12 (Alpine 3.22.6) and apk-tools 3.0.8 (Alpine 3.24.2), with signature and dual-signature cases spot-checked on apk-tools 2.14.4 (Alpine 3.20.10) and 3.0.8 (Alpine 3.23.6), every image pinned by digest, against a logging stub on dedicated Podman networks serving repositories built with the images' own abuild 3.15.0 and 3.17.0 (abuild-keygen, abuild-sign, apk index, apk mkndx); checked against the apk-tools 2.14.12 and 3.0.8 manual pages and sources, the Alpine wiki's apk format page, the live dl-cdn.alpinelinux.org mirror and OSV's Alpine ecosystem. Eleven questions written in decision shape and adopted under the owner's standing delegation; none open. Awaits a /spec review pass."
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
handler reaches `main`.** Every hosted and virtual tree's index is a write-triggered signed
document produced by `docs/internal/plans/foundation/signing-service.md` (to be authored in the
spec loop), which the charter builds at step 7 before Helm as the production form of what the
step 4a prototype learned (`write-triggered-services-prototype.md`). What this format requires of
it is stated in Design ("What the signing and index service must provide"), never designed here.
Hosted reads cannot be tested without it, because a tree with no generated index has nothing for
a client to read.

**The management API must be `planned` before Phase 2, and it is the only hosted write path.**
Publishing packages, deleting versions and packages, setting a repository's architecture set and
rotating its key are operations of `docs/internal/plans/foundation/management-api.md` (to be
authored in the spec loop), whose core the charter builds at step 2 and completes at step 9; no
apk client writes. Phase 1's hosted reads are testable without it, because the harness's `state`
vocabulary seeds packages through the shared write path, whose seed path must invoke the signing
service (sibling consequences).

**The proxied path depends on shared services that are requested, not assumed**: the upstream
adapter behaviour stated in Design ("The proxied path") of
`docs/internal/plans/foundation/upstream-adapters.md` (to be authored in the spec loop, built at
charter step 4), and the verification entries requested of
`docs/internal/plans/foundation/artifact-verification.md` (to be authored in the spec loop,
built at step 4b). Publish is synchronous (the resolved batch-publish decision below), so nothing
is asked of `docs/internal/plans/foundation/async-operations.md` (to be authored in the spec
loop, step 6a).

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
- Deleting a version and a package, with the retirement set and the write-boundary declaration
  `data-model.md` requires, and key rotation through a dual-signature window.
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
- The two pinned clients above as conformance oracles on both paths, with the client network
  restricted to this registry and its stand-ins.

**Out of scope for v1**, each with its reason, recorded because the interface spec's definition
of done requires the deliberately unimplemented surface to be named:

- **Any client-side publish protocol.** None exists: apk only reads. Hosted content arrives
  through `docs/internal/plans/foundation/management-api.md` (to be authored in the spec loop);
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
repository were absent.

### Fallback: what a refusal can and cannot stop

`julia.md` found that Pkg falls back to origin on every refusal, `terraform.md` that Terraform
never does, and `rpm.md` that a refused package does not fall back while a refused index does.
apk behaves like `rpm.md`'s Fedora and zypper clients, on both lines, including with client
egress open (captured):

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
- **The package-level document** holds the retirement set of deleted versions.
- **The repository-level document** holds the architecture set, the key reference, the OSV
  ecosystem when declared, and per tree and architecture the current index as a CAS digest with
  its signature facts, protected by the fourth GC mark root (`storage-and-gc.md` AC16), since a
  large tree's index crosses any sensible inline threshold (live: v3.24 main's is 528,388 bytes
  compressed and 2,370,051 bytes of `APKINDEX` text).
- A remote repository's document holds, per tree and architecture it has served, the current and
  retained index revisions, their verification results, and the filename map built from each
  (below); none of it is snapshot content.

### The hosted publish path and what counts as a write

Nothing on any apk wire writes. The hosted path is fed by the registry-owned management API,
`docs/internal/plans/foundation/management-api.md` (to be authored in the spec loop). Per the
cross-format precedent (`pypi.md`'s resolved hosted-yank decision, with `npm.md`, `cargo.md`,
`hex.md`, `rpm.md` and `terraform.md`), each operation is one completed logical write through the
shared write path, authorized in the settled `(repository, action)` vocabulary with no new action,
hosted only, its trigger verified by this registry's integration tests and its effect by the real
clients (`docs/internal/analysis/management-surfaces-and-the-oracle.md`: Alpine is a format none
of whose management triggers has a client). What this format **requires** of that API, stated
rather than designed:

| Operation | What the operation carries | Effect a client sees | Action |
|---|---|---|---|
| Publish packages | A tree path and one or more `.apk` files (the resolved batch-publish decision below) | Every package appears in its architectures' indexes and installs after the client's next `apk -U` or `apk update --force-refresh` | `push` |
| Delete a version | Tree, name and version | It leaves every index; installing it fails; its package routes answer `404`; the coordinate is retired | `delete` |
| Delete a package | Tree and name | Every version leaves and is retired; the `Package` row survives (`data-model.md`, "A package outlives its versions") | `delete` |
| Set the architecture set | A list of architecture names | Indexes appear or stop for those architectures in every tree | repository configuration, the grant `management-api.md` assigns to it |
| Rotate the key | None | The dual-signature window of item 5 below | repository configuration, as above |

What this registry enforces on ingest:

- The body is spooled to a bounded temporary buffer outside the CAS. Each file must be a v2
  package: two or three concatenated gzip streams whose tar content is an optional signature
  segment, a control segment beginning with `.PKGINFO`, and a data tarball, with `pkgname`,
  `pkgver` and `arch` present and `datahash` equal to the SHA-256 of the data stream; anything
  else, a v3 package included, is refused with `422` and nothing committed. The package's
  signature is verified through the entry requested of `artifact-verification.md` and its verdict
  recorded, not enforced (below).
- The stored filename is the canonical `{pkgname}-{pkgver}.apk`, whatever the upload was called.
- **A coordinate that already exists in the tree is refused with `409`** unless the bytes are
  identical, which is idempotent and creates no snapshot, the CI-retry case; so is a retired
  coordinate, with any bytes, including after the deleting snapshot has been pruned: the
  cross-format retirement rule. A `noarch` build and an architecture-specific build of one
  version in one tree occupy the same path in that architecture's index, so the second is refused
  with `409` naming the first.
- An architecture outside the repository's declared set is refused with `422`.
- Whether an unsigned package, or one signed by a key outside the repository's trusted package
  keys, is refused is a repository policy rule over the verifier's verdict (`supply-chain-policy.md`,
  "Signature and attestation state is a consumed verdict"); the operator documentation says that
  no repository install checks it.
- A publish or management operation against a remote or virtual repository answers `405`.

`data-model.md` requires each format spec to declare its ecosystem's write boundaries. Alpine's
declaration:

- **One publish is one completed logical write**, however many packages it carries, together
  with the regeneration and re-signing of every index it changes, in one snapshot.
- **Each deletion is one write** however many versions it removes, the retirement set updated in
  the same write; a retention pass over a repository is one write.
- **A change to the architecture set, and a key rotation, are each one write** that regenerates
  and re-signs every affected index.
- A proxied repository creates no snapshots; index revisions and packages arriving from an
  upstream are cache materialisation.

### Every hosted index is a write-triggered signed document

Per the resolved index-key decision below, a tree's indexes are produced by the shared signing
and index service inside the write that changes them, **stored, never rendered on request**,
exactly the class `write-triggered-services-prototype.md` defines for Debian's `Release`. The
rules the service applies for this format, stated as this format's requirements:

- **Regeneration inside the write.** A publish or deletion regenerates and signs the indexes of
  the architectures it touches in the tree it targets, in the same snapshot as the change
  (`data-model.md`'s one-write-one-snapshot rule). A `noarch` package touches every architecture
  of the tree; no other tree is touched, so writes to different trees never contend.
- **Under contention, both land.** Two concurrent publishes into one tree each produce indexes
  listing the other's packages once both are complete, through the revision-token retry
  `data-model.md` makes mandatory, applied by the service.
- **Package files outlive the index that stops naming them only as the retention rule allows.** A
  client fetches the index and then the packages it names, and caches the index for four hours; a
  package route therefore serves any file an index of a retained snapshot names, so a client
  holding an older index is not broken by a later publish. A deletion is the exception by design:
  its routes answer `404` at once, and the client prints "package mentioned in index not found"
  (captured).
- **`APKINDEX.tar.gz` is served with `Cache-Control: no-cache`** and a byte-derived `ETag`, and
  packages with `Cache-Control: public, max-age=31536000, immutable`. No client sends a
  conditional request (captured), so the headers serve intermediaries rather than the clients.
- **No hosted route ever answers a redirect**, because a `301` prints the client's credential in
  clear (captured).
- **A repoint restores the indexes.** The index set lives in the repository-level document, so a
  rollback serves exactly the signed indexes of the snapshot it targets; a pointer moved
  backwards across a deletion must preserve the retirement set (`data-model.md` AC33's obligation
  on the management surface).

### What the signing and index service must provide

Stated so the dependency on `docs/internal/plans/foundation/signing-service.md` (to be authored
in the spec loop) cannot be lost, and precisely enough that the service can be specced against
it, following `rpm.md`'s and `hex.md`'s statements of the same dependency:

1. **Generation of a tree's index per architecture** from the version-level records of every
   package in the tree whose file is that architecture or `noarch`: an `APKINDEX` text whose
   records equal, field for field and in order, what `apk index --rewrite-arch {arch}` from
   apk-tools 2.14.12 writes for the same packages (so `A:` is the index's architecture for a
   `noarch` package, `C:` is `Q1` plus the base64 SHA-1 of the control stream, `S:` the file
   size), a `DESCRIPTION` naming the repository, tree and snapshot (apk prints it in `apk update`
   output), both in one gzip-compressed tar stream ending in end-of-archive blocks. The stream's
   bytes are produced once and stored; the signature is over those bytes, so the service never
   recompresses a signed index.
2. **One RSA key per hosted and per virtual repository**, 4096 bits as `abuild-keygen` makes them,
   with a **key name** unique for the key's lifetime and never reused, of the form
   `{repository}@{instance host}-{8 hex}` after abuild's `{email}-{hex}` convention, and a signing
   operation over the index stream's bytes returning an RSA PKCS #1 v1.5 signature over SHA-256.
   The service wraps it as a gzip-compressed tar segment holding one file,
   `.SIGN.RSA256.{keyname}.rsa.pub`, with no end-of-archive blocks, and prepends it; a plain
   ustar entry without the PAX header `abuild-sign` writes verified on both lines (captured).
   `RSA256` rather than Alpine's own `RSA` because it avoids SHA-1 at no cost: 2.14.4, 2.14.12 and
   3.0.8 all accept it (captured). The handler never sees the private key, which an architecture
   test asserts as `write-triggered-services-prototype.md` AC5 does for Debian.
3. **The key document**: the PEM public key served at `/apk/{repository}/keys/{keyname}.rsa.pub`
   and shown in the management surface with its name, because the client must save it under
   exactly that name (captured); every key currently valid for the repository is served there.
4. **Synchronous regeneration and signing inside the write**, within a management request's
   latency budget; there is no asynchronous half.
5. **Rotation through a dual-signature window.** A rotation creates a new key and, in one write,
   re-signs every current index of the repository with **two** signature segments over the same
   index stream, the old key's and the new key's; a client holding either key file verifies it
   (captured in both orders). Ending the window is a second write that drops the old signature.
   apk has no mechanism to fetch a key (apk-keys(5): keys are files an administrator adds), so
   rotation is invisible to clients that install the new key file during the window and breaks
   those that do not, which the operator documentation states.
6. **Contention handling and storage** as in the section above: the revision-token retry, CAS
   storage above the inline threshold, byte-derived `ETag`s, and retention of every package file
   an unpruned snapshot's index names.
7. **The virtual merge** (below), re-run when a member's tree changes, and signed with the virtual
   repository's key.

Verification of upstream signatures is not the signing service's: it belongs to artifact
verification.

### What artifact verification must provide

Of `docs/internal/plans/foundation/artifact-verification.md` (to be authored in the spec loop),
per `supply-chain-policy.md`'s resolved verification-ownership decision:

1. **An apk v2 signed-stream verification entry** that takes a file (an index or a package), a
   set of named public keys, and answers verified with the key name, untrusted, or bad, with the
   client's own semantics: signatures are read from the leading segment in order, those naming no
   configured key are skipped, and the first naming a configured key decides; `RSA`, `RSA256` and
   `RSA512` are supported, and the digest is over the stream that follows the segment (the index
   stream, or the control stream of a package).
2. **Package integrity**: the control stream's SHA-1 compared with an expected `C:`, the file size
   with `S:`, and the data stream's SHA-256 with the `datahash` in `.PKGINFO`, answering each
   separately, together with the package signature's verdict against the repository's trusted
   package keys (hosted) or the upstream's keys (proxied), so policy can rule on it. The v2 format
   parsing this needs is format knowledge the verifier owns, as `supply-chain-policy.md`
   anticipates for every format-entangled signature.

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

apk sends HTTP Basic, which `auth.md`'s verifier accepts with the token as the password and the
username not an input; the client table needs an `apk` row (sibling consequences). How this meets
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
| The key document | none | - |
| A package (`{tree}/{arch}/{file}`, hosted or proxied) | named | `{tree}/{name}/{version}` of the file the path resolves to |
| Publish packages (management API) | named | each file's `{tree}/{name}/{version}` from its `.PKGINFO`, which precedes its data stream; a publish carrying several files is authorized only if every object is |
| Delete a version (management API) | named | `{tree}/{name}/{version}` |
| Delete a package (management API) | named | `{tree}/{name}` |
| Architecture set, key rotation (management API) | none | - |

What that gives and costs, applying `auth.md`'s rules rather than re-deciding them. **A patterned
`pull` cannot install anything**: apk must read the index, which reports none, so both lines fail
at the first request under a token patterned `v3.24/main/swhello/**`; this is `rpm.md`'s
consequence for the same reason, recorded rather than worked round, since widening a patterned
read to the index would reveal names outside the pattern. A patterned `pull` still confines a
scripted fetch to in-pattern packages. **A patterned `push` publishes** in-pattern packages and is
refused an out-of-pattern one with no snapshot, and a patterned `delete` likewise.

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines, on the
package route of either path, the handler answers `403` with a JSON body
`{"errors": [{"status": "403", "title": "...", "detail": "..."}]}` naming the policy and rule, and
nothing else changes: the tree's indexes still list the package and still verify. Per the
resolved refusal-rendering decision below and captured on both lines: 2.14.12 prints "ERROR:
{name}-{version}: Permission denied", 3.0.8 prints "HTTP 403: Forbidden", neither prints the body,
and `apk add` exits non-zero. apk requests a refused file once, so one install attempt produces one
refusal record per refused package. Packages fetched before the refused one in the same
transaction are installed (captured: `swdep` installed, `swhello` refused), which the operator
documentation states.

An index route never answers a policy refusal: the index is the tree as a whole, and refusing it
turns enforcement into a skipped repository (Design, "Fallback").

### The proxied path

The handler owns the request and classifies for the proxy layer's fetch-and-cache API per the
settled decisions in `proxy-cache.md`. The upstream is a mirror root, for example
`https://dl-cdn.alpinelinux.org/alpine/v3.24/` (per the resolved OSV decision below, one remote
per Alpine branch is the recommended shape), and a client path under the remote repository is
appended to it. Per the resolved proxied-index decision below, **upstream indexes and packages are
served verbatim**, so a client keeps the stock `alpine-keys` it already has (captured: both pinned
images installed from dl-cdn with their stock keys).

What this format requires of `docs/internal/plans/foundation/upstream-adapters.md` (to be
authored in the spec loop):

- **Path joining under a mirror root**, with the remote's optional upstream credential (Basic)
  forwarded to that root's host only, over HTTPS (dl-cdn also answers plain HTTP, live, and the
  remote's configuration refuses an `http://` root unless an operator overrides it).
- **Cross-host redirects to an allowlist**: dl-cdn answered every probe directly, but mirrors in
  `MIRRORS.txt` are independent operators, so the adapter follows redirects only to hosts on a
  per-remote artifact allowlist and forwards no credential beyond the root host.
- **Conditional revalidation** of `APKINDEX.tar.gz` with `If-None-Match` and `If-Modified-Since`:
  dl-cdn sends `ETag` and `Last-Modified`, no `Cache-Control`, and answers both conditionals with
  `304` (live).
- **Range pass-through is not required**: a miss fetches the whole file, and ranges are served
  from the CAS once it is committed.

Classification and behaviour:

- **`APKINDEX.tar.gz` is mutable metadata with the proxy layer's TTL.** A new revision is verified
  before it is served, through the entry above, against the remote's configured upstream keys (for
  Alpine, the `alpine-keys` set, the live v3.24 main index being signed by
  `alpine-devel@lists.alpinelinux.org-6165ee59.rsa.pub`); a remote with no keys configured
  accepts on TLS alone, which its configuration records as unverified. A revision that fails is
  never served; the previous verified revision keeps serving under serve-stale and the operator is
  alerted.
- **A filename map per index revision.** A package can be verified only against its record, so
  the first package request under a revision builds, once per index digest, a map from
  `{P}-{V}.apk` to `C:`, `S:` and version by streaming the index, stored as CAS-backed metadata on
  the remote's repository-level document; a package miss is then a lookup and a stream-and-verify
  fetch. A path that is neither an index nor a file the current or a retained revision names
  answers `404` with no upstream request, so the remote is not an open relay (`last-updated` and
  `MIRRORS.txt` included).
- **Packages are immutable artifacts**, verified under stream-and-verify against the record's `S:`
  and `C:` and the `datahash` inside them, and their signature verdict recorded for policy against
  the remote's upstream keys, never as a precondition of serving.
- **Missing resources are negatively cached** with the short TTL on `404` and `410`; a `429` or
  `5xx` is never cached as absence (`proxy-cache.md` AC9).
- **URL rewriting** is none: apk builds package URLs from the base URL and the record.
- **Publish and every management operation against a remote repository answer `405`.**

Upstream removal maps onto the settled purge-or-flag table as this format's side of that contract
(`proxy-cache.md`, "Upstream removal or replacement"). Alpine's stable branches keep only the
current build of each package: `busybox-1.37.0-r31` is on dl-cdn's v3.24 and `r30` and `r29`
answer `404` (live), so a package leaving the index is the ecosystem's normal flow:

| Upstream event, as observed at revalidation or fetch | Classification |
|---|---|
| A package leaves the index in a new revision (a superseding build, routine on every branch) | An ordinary metadata change: the new revision serves; the cached file stays fetchable by clients holding a retained older revision, and is then evictable; no divergence is recorded |
| A new revision lists a different `C:` or `S:` for a filename already cached | An immutability violation recorded and alerted; the package route serves the bytes matching the revision the client holds, the new bytes fetched and verified as a new blob and the old blob kept for older revisions, because apk verifies against the record it was given (captured) |
| A new index fails its signature, or a package fails `C:`, `S:` or `datahash`, or a body is truncated | An integrity failure: nothing committed, no negative entry, the previous verified revision keeps serving, the operator is alerted, the next request tries again |
| A new index is signed by a key outside the configured set (an Alpine key rotation) | The same integrity failure, with the key name in the operator record, so the operator adds the key deliberately |

### Advisories, OSV and the security-signal rule

Nothing on this wire is a security signal: the index carries no advisory, deprecation or
quarantine field, and Alpine removes superseded builds without saying why. OSV's Alpine
ecosystem holds only `ALPINE-CVE-*` vulnerability records and no `MAL-` record (captured), so
**the shared security-signal rule never fires for this format from either channel**.

Advisory-dependent rules can bind only when the repository says which release its packages
belong to, because OSV keys Alpine by release (Alpine:v3.22, Alpine:v3.24; none for edge) and
by the **origin** package: `openssl` in `Alpine:v3.22` matches 48 records while its binary
`libssl3` matches none (captured). Per the resolved OSV decision below, a repository may declare
one OSV ecosystem string, and matching uses each version's `origin` field, never its `pkgname`;
an advisory-dependent rule attached to a repository without a declaration, or with one OSV does
not list, is refused at configuration, as `supply-chain-policy.md` refuses any rule that cannot
bind. Coordinate rules and signature-verdict rules bind without it. Detection is passive, per
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
  members' records and signs it with the virtual repository's key. Remote members contribute
  their cached revisions and are re-merged when those revalidate.
- **Resolution is per package name, in member order**: the first member whose tree holds any
  version of a name contributes every version of it, and later members' versions of that name are
  omitted. This matters more here than for RPM, because apk installs the highest version across
  all it can see (captured), so without shadowing a public `swhello-9.0` beats a private
  `swhello-1.1`. The same rule applies to `provides` names: a name a first member provides is not
  taken from a later member's `provides`.
- **Package bytes are the members'**, served through the virtual route, their `C:` unchanged; since
  no repository install checks the package signature, a client of a virtual repository needs only
  the virtual repository's key file, whatever its members' keys are.
- A publish or management operation against a virtual repository answers `405`.

The recommended client configuration is one line in `/etc/apk/repositories` per virtual tree, the
virtual repository's key file in `/etc/apk/keys`, and credentials in `.netrc`; with that
configuration a refusal holds with egress open (AC14).

### Conformance, the clients and the corpus

The two pinned client lines differ in ways the captures made concrete: 2.14.12 skips a repeated
`apk update` within its cache age, cannot read a `v3` line, prints userinfo passwords in `apk
policy`, and words its errors as `errno` strings ("Permission denied"); 3.0.8 re-fetches on every
`apk update`, reads `Packages.adb`, masks passwords except in the redirect warning, and prints
HTTP status lines. The catalogue counts one ecosystem; both lines appear in the matrix's Client
column under the Alpine row, and every hosted and proxied case runs on both unless it names a
line-specific behaviour.

**Every case runs with the client's network restricted to this registry and its stand-ins**,
except AC14's open-egress half, which exists to prove no fallback occurs. Each case writes
`/etc/apk/repositories`, empties `/etc/apk/keys` of the image's Alpine keys, installs the key
files it names and the harness CA into the system store, and runs `apk -U` or `apk update
--force-refresh` after a publish, because a plain `apk update` on 2.14.12 may not fetch (Design,
wire surface).

The recorded surface for the replay corpus: against dl-cdn.alpinelinux.org, `v3.22` and `v3.24`
`main/x86_64/APKINDEX.tar.gz` with a conditional revalidation, one package per branch, and a
missing package. The reference implementation for the hosted side is a static tree built by
`apk index --rewrite-arch` and signed by `abuild-sign -t RSA256` in the pinned 3.22 image,
served by a pinned static server, so `Capabilities()` declares reference-implementation
availability `available`. The write surface has no reference (no client publishes), an
exception-list entry. Recording gates on the harness's redaction criterion
(`conformance-harness.md` AC13), whose rule for this format names the `Authorization` header and
URL userinfo. Deliberate divergences go on the exception list before their flow is expected to
replay: `RSA256` where Alpine signs `RSA`, the `DESCRIPTION` text, signature bytes, the
`Cache-Control` on indexes, `405` on remote writes and `409` on republish.

## Acceptance Criteria

- [ ] AC1: With the client network restricted to this registry, a hosted tree publishing a
      publisher-signed `swhello` that depends on `swdep` installs both with `apk -U add swhello`
      on Alpine 3.22.6 (apk-tools 2.14.12) and Alpine 3.24.2 (apk-tools 3.0.8) holding only the
      repository's key file; the transcript shows `APKINDEX.tar.gz` and then each package at
      `{tree}/x86_64/{name}-{version}.apk`, and the installed files equal the published package's.
- [ ] AC2: Every hosted `APKINDEX.tar.gz` is a leading gzip stream holding a tar segment with
      exactly one `.SIGN.RSA256.{keyname}.rsa.pub` entry and no end-of-archive blocks, followed by
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
      are refused as "UNTRUSTED signature"; and the version document records the verifier's
      verdict for each.
- [ ] AC4: A publish regenerates and re-signs the affected indexes in exactly one snapshot that
      holds the packages and the indexes; after `apk -U` or `apk update --force-refresh` both
      lines see the new package, the index served with `Cache-Control: no-cache`; two concurrent
      publishes into one tree both appear in the resulting index; a publish to one tree
      leaves another tree's indexes byte-identical; and repointing to the predecessor serves its
      indexes byte-identical.
- [ ] AC5: A `noarch` package published into a tree of a repository declaring `x86_64` and
      `aarch64` is listed in both indexes with `A:` equal to the index's architecture, no hosted
      index contains `A:noarch`, and it installs on both lines from `{tree}/x86_64/`; an
      architecture with no packages serves a signed index with no records that both lines accept;
      an architecture outside the declared set answers `404`; a package whose architecture is
      outside the set is refused with `422`; and `Packages.adb` answers `404` on every hosted tree.
- [ ] AC6: A publish of three `.apk` files to one tree creates exactly one snapshot; a file that is
      not a v2 package, a v3 package, a package whose `datahash` differs from its data stream, one
      whose `.PKGINFO` lacks `pkgname`, `pkgver` or `arch`, and a tree path outside the grammar are
      each refused with `422` and nothing committed; a republish of identical bytes creates no snapshot;
      different bytes at an existing coordinate, a retired coordinate (including after the
      deleting snapshot was pruned) and an architecture-specific build colliding with a `noarch`
      build of the same version are refused with `409`; and the stored filename is
      `{pkgname}-{pkgver}.apk` whatever the upload was called.
- [ ] AC7: The `APKINDEX` member of every generated index, for every fixture tree and architecture,
      equals field for field and in order what `apk index --rewrite-arch {arch}` from the pinned
      Alpine 3.22.6 image writes for the same packages, including `C:` as `Q1` plus the base64
      SHA-1 of each control stream and `S:` as each file's size.
- [ ] AC8: Deleting a version through the management endpoint removes it from every index in one
      snapshot, after which both lines fail to install it and its package routes answer `404`;
      deleting a package retires every version and keeps the `Package` row; every management
      operation is refused with no snapshot for a principal lacking its action (`push` for
      publish, `delete` for deletions) and answers `405` against a remote or virtual repository.
- [ ] AC9: No hosted or virtual index is signed by the handler: an architecture test proves the
      handler package holds no key and performs no signing; after a key rotation every current
      index carries two signature segments over the same stream, a client holding only the old
      key file and a client holding only the new one both install on both lines, the key document
      route serves both keys, and after the window ends a client holding only the old key file is
      refused as "UNTRUSTED signature".
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
      both lines and fetches an in-pattern package by `curl` while refused an out-of-pattern one;
      a token holding `push` patterned the same way publishes `swhello` into `v3.24/main` and is
      refused publishing `swdep` or into `v3.22/main` with no snapshot created; and in proxied mode
      the patterned `pull` token is refused an out-of-pattern package.
- [ ] AC13: A package the shared policy layer refuses answers `403` with the `{"errors": [...]}`
      body naming the policy on the hosted and the proxied path, while every index still answers
      `200` and still verifies; `apk add` exits non-zero on both lines with the captured message
      ("Permission denied" on 2.14.12, "HTTP 403: Forbidden" on 3.0.8), the body present in the
      transcript; and each refused package produces exactly one refusal record.
- [ ] AC14: With client egress open and one repository line on this registry, a refused package
      fails on both lines with no request for it reaching any host but this registry, and with a
      second configured repository listing the identical package it still fails with no request
      to the second repository's package, asserted at the network layer.
- [ ] AC15: A remote repository over a stand-in mirror whose indexes are signed by a fixture vendor
      key, in `RSA`, `RSA256` and `RSA512` variants, installs on both lines holding that vendor key
      file only: `APKINDEX.tar.gz` and every
      package served are the upstream's byte for byte, the index signature was verified against
      the configured key before the revision was served, every package was verified against `S:`,
      `C:` and its `datahash` before commit, and a second install from a fresh container reaches
      this registry while the stand-in receives no request.
- [ ] AC16: A stand-in whose new index fails its signature or is signed by a key outside the
      configured set, whose package mismatches `C:`, `S:` or its `datahash`, or whose body is
      truncated, is never committed to the CAS; the previous verified revision keeps serving and
      installing; the real reason, and for a foreign key its name, is recorded observably to the
      operator; and the next request fetches again.
- [ ] AC17: A proxied `APKINDEX.tar.gz` is revalidated after its TTL and not before, conditionally
      against `ETag` and `Last-Modified` stand-ins, a package published upstream becoming
      installable after the TTL and not before absent an explicit refresh; packages are never
      revalidated; a path no cached revision names, `MIRRORS.txt` and `last-updated` included, answers `404`
      with no upstream request; an upstream `404` is negatively cached while a `429` or `5xx` is neither cached as absence nor
      surfaced as not-found.
- [ ] AC18: A remote over a stand-in mirror root answering package requests with a cross-host
      `302` installs through a host on its artifact allowlist, refuses a host outside it with the
      host in the operator record, and forwards the upstream credential to the configured root host
      only, asserted at the network layer; and a remote configured with an `http://` root is
      refused at configuration unless overridden.
- [ ] AC19: A stand-in presenting each removal-table event produces this format's classification:
      a package leaving the index serves the new revision with no divergence recorded while a
      client holding the old revision still fetches it; a changed `C:` for a cached filename
      records and alerts a divergence while each revision's clients receive the bytes their index
      names and install; as this format's side of the removal policy in `proxy-cache.md` (its
      AC13).
- [ ] AC20: A virtual repository over a hosted and a remote member serves, per tree and
      architecture, a merged index signed by the virtual repository's key, from which a hosted
      `swhello-1.1` placed first shadows an upstream `swhello-9.0` so that no upstream version of
      that name is listed or fetched, asserted at the network layer; both lines install a hosted
      and a proxied package in one transaction through one repository line holding only the
      virtual key file; a member's change re-merges and re-signs the tree in one write; and publish
      to the virtual answers `405`.
- [ ] AC21: A policy rule depending on advisory data attached to an Alpine repository with no
      declared OSV ecosystem, or declaring `Alpine:edge`, is refused at configuration naming the
      reason; with `Alpine:v3.24` declared, an advisory from the controlled source naming origin
      `swhello` refuses a cached subpackage `swhello-doc` whose `origin` is `swhello` on the
      proxied path and the same rule refuses a hosted package; an advisory naming only the
      subpackage's own name refuses nothing; coordinate rules and signature-verdict rules attach
      and refuse as configured on both paths.
- [ ] AC22: Replay-match passes against a corpus recorded from dl-cdn.alpinelinux.org and from a
      pinned static server over an `apk index` and `abuild-sign` tree, covering the recorded
      surface named in Design, with the `Authorization` header and URL userinfo redacted; and in
      the recording session both stock images, holding only their `alpine-keys`, install through a
      remote configured over dl-cdn.
- [ ] AC23: A tree whose index exceeds the inline metadata threshold is stored as CAS blobs that
      survive a GC sweep while a retained snapshot names them and install afterwards on both lines,
      and a proxied filename map above the threshold survives a sweep while its revision is current
      or retained.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/alpine/hosted_install_test.go` (both pinned images, network-restricted client containers, image keys removed; transcript order asserted; installed file comparison) |
| AC2 | conformance + unit | `conformance/alpine/index_signature_test.go` (valid, absent, foreign-key, stale signatures, a renamed key file and `--allow-untrusted`, both lines, captured messages and `apk update` exit status asserted); `internal/format/alpine/signature_shape_test.go` (segment shape, entry name, key size, digest algorithm of every generated index) |
| AC3 | conformance + integration | `conformance/alpine/package_signature_test.go` (unsigned and foreign-key packages from a hosted tree, then as local files, both lines); `internal/format/alpine/bytes_unaltered_test.go` (published digest equals served digest for every fixture; verdict recorded) |
| AC4 | conformance + integration | `conformance/alpine/republish_test.go` (publish then `apk -U` and `apk update --force-refresh`; index `Cache-Control` asserted); `internal/format/alpine/snapshot_test.go` (snapshot count, two concurrent writers into one tree, trees independent, repoint byte comparison) |
| AC5 | conformance + integration | `conformance/alpine/noarch_test.go` (two-architecture repository, install on both lines, empty-architecture index accepted); `internal/format/alpine/arch_set_test.go` (no `A:noarch` in any generated index, out-of-set `404` and `422`, `Packages.adb` `404`) |
| AC6 | integration | `internal/format/alpine/ingest_test.go` (non-package, v3 package, `datahash` mismatch, missing fields, bad tree path, idempotent republish, different bytes, retired coordinate after pruning under an injected clock, `noarch` collision, canonical renaming, three-file batch snapshot count) |
| AC7 | integration | `internal/format/alpine/apkindex_oracle_test.go` (every fixture tree generated, compared with `apk index --rewrite-arch` run in the pinned 3.22.6 image) |
| AC8 | conformance + integration | `conformance/alpine/manage_test.go` (delete version and package, then real installs and a `curl` of the package route); `internal/format/alpine/manage_auth_test.go` (action refusals with snapshot count unchanged, `405` on remote and virtual) |
| AC9 | architecture test + conformance | `internal/format/alpine/arch_test.go` (no key, no signing in the handler package); `conformance/alpine/key_rotation_test.go` (dual-signature window on both lines with old-only and new-only key files, window end) |
| AC10 | conformance + unit | `conformance/alpine/names_test.go` (case, `++`, `_rc1`, hyphen-digit name, both lines); `internal/format/alpine/path_decode_test.go` (`%2B`, `+` literal, lookup-not-split) |
| AC11 | conformance + integration | `conformance/alpine/auth_test.go` (private repository over TLS; userinfo, `.netrc` and `HTTP_AUTH`, challenge header asserted; anonymous, `pull`-less and rejected tokens; no redirect status on any hosted route); `internal/auth/leak_test.go` (Basic material redaction for this format) |
| AC12 | conformance + unit | `conformance/alpine/pattern_test.go` (the pattern-refusal case `auth.md` AC8 and `format-handler-interface.md` AC7 require, in both modes; patterned `pull` failure on both lines, patterned `push` in and out of pattern); `internal/format/alpine/scope_object_test.go` (the object table, per route, `format-handler-interface.md` AC12) |
| AC13 | conformance + integration | `conformance/alpine/policy_test.go` (hosted and proxied modes; rules through the `policies` key; exit status, client text, transcript body and index `200` asserted); `internal/format/alpine/refusal_record_test.go` (one record per refused package) |
| AC14 | conformance | `conformance/alpine/no_fallback_test.go` (open-egress client network with a second repository stand-in listing the identical package; network-layer assertion) |
| AC15 | conformance | `conformance/alpine/proxied_install_test.go` (vendor-signed stand-in mirror in `RSA`, `RSA256` and `RSA512` variants; both lines with the vendor key only; byte comparison; network-level second-install assertion) |
| AC16 | integration | `internal/format/alpine/proxied_integrity_test.go` (bad and foreign-key signatures, `C:`, `S:` and `datahash` mismatches, truncated body; CAS and reference assertions; previous revision still serving; operator record) |
| AC17 | conformance + integration | `conformance/alpine/proxied_ttl_test.go` (mutating stand-in with `ETag` and `Last-Modified` variants, network-level counts); `internal/format/alpine/proxied_negative_test.go` (unknown paths, `MIRRORS.txt` and `last-updated` with no upstream request, `404`, `429` and `5xx`) |
| AC18 | integration + conformance | `internal/format/alpine/upstream_redirect_test.go` (allowlisted and refused redirect hosts, credential scope, `http://` root refused); `conformance/alpine/proxied_redirect_test.go` (install through a cross-host `302`) |
| AC19 | integration | `internal/format/alpine/removal_test.go` (stand-in presenting each event; the shared-layer half is `proxy-cache.md` AC13's) |
| AC20 | conformance + integration | `conformance/alpine/virtual_test.go` (shadowing with the network layer showing no upstream request for the shadowed name; mixed install on both lines with one key file; `405`); `internal/format/alpine/virtual_merge_test.go` (per-name first member including `provides`, re-merge on member change in one write) |
| AC21 | integration + conformance | `internal/format/alpine/policy_config_test.go` (advisory rule without, or with an unlisted, ecosystem refused; origin matching; coordinate and signature-verdict rules); `conformance/alpine/advisory_policy_test.go` (controlled advisory through the `advisories` key, both paths) |
| AC22 | conformance | `conformance/alpine/replay_test.go` (corpus replay); `conformance/alpine/real_upstream_test.go` (recording session: both stock images with only their `alpine-keys` through a remote over dl-cdn) |
| AC23 | integration | `internal/storage/metadata_root_test.go` (threshold crossing with a generated index and a proxied filename map, sweep, serve); `conformance/alpine/large_tree_test.go` (both lines install after the sweep) |

The case set needs only keys already in the harness's closed `setup` vocabulary (its resolved
closed-vocabulary decision, was Q4): `repositories` with their type, virtual member order and
repository metadata document (the architecture set, the OSV ecosystem declaration and trusted
package keys included), `credentials`, `upstreams` (a stand-in mirror signed by a fixture vendor
key, variants for mutation, corruption, key rotation, redirection and throttling), `state` for
pre-published packages, `advisories` and `policies` for AC13 and AC21. Two obligations on the
harness are recorded rather than assumed, and listed in the sibling consequences: a `state` entry
for a hosted package is servable only once its tree's indexes are generated and signed, so the
seed path invokes the same signing and index service the write path does; and an Alpine case must
empty `/etc/apk/keys` of the image's keys and write its own key files and repository lines,
because a stock image trusts Alpine's keys and lists dl-cdn. The runner-enforced obligations, both
modes and the unauthenticated, unauthorized and pattern-refusal cases in each, apply from the
sibling specs and are not restated per criterion.

## Implementation Phases

### Phase 1: Hosted reads and the signed indexes
- Waits on `docs/internal/plans/foundation/signing-service.md` reaching `planned` (Blocking
  preconditions)
- The format-first mount, tree and architecture parsing, the index, package and key routes with
  `HEAD` and ranges, filename lookup and percent-decoding, the Basic challenge, seeded packages
  through `state` with generated and signed indexes, the per-route addressed objects and the `403`
  rendering

### Phase 2: Publish and management
- Waits on `docs/internal/plans/foundation/management-api.md` reaching `planned` (Blocking
  preconditions)
- Batch publish with its ingest rules, the architecture set, deletion with the retirement set,
  key rotation through the dual-signature window, the write-boundary declaration exercised under
  concurrency

### Phase 3: Proxied path
- Waits on `upstream-adapters.md` and `artifact-verification.md` (Blocking preconditions)
- Verified index revisions with TTL and conditional revalidation, the filename map, verified
  packages, negative caching, the removal table, the OSV declaration, `405` on remote writes

### Phase 4: Virtual repositories, corpus and gate
- The per-tree, per-architecture merge with per-name shadowing, the recorded corpus against
  dl-cdn and the `apk index` reference, both client lines in the matrix, the exception-list
  entries named in Design

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. The eleven questions this draft raised were each written in the template's decision
shape and then adopted at their own recommendation under the owner's standing delegation of
2026-09-26, so the loop can continue; each is recorded below as adopted rather than decided,
folded through Scope, Design, the criteria and the Test Plan in the same pass, and reversible by
the owner at any time. `grep -rn "standing delegation"` is the owner's review queue.

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

Accepted cost: the key-file step in the operator documentation.

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

Accepted cost: recorded for `management-api.md`.

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

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | 99075e9 | authoring pass: grounded first draft, not a review | Grounded four ways: captured traffic from apk-tools 2.14.12 (Alpine 3.22.6) and 3.0.8 (Alpine 3.24.2), with signature cases repeated on 2.14.4 (3.20.10) and 3.0.8 (3.23.6), images pinned by digest, against a logging stub on dedicated Podman networks serving repositories built with the images' own abuild 3.15.0 and 3.17.0, `abuild-keygen`, `abuild-sign`, `apk index` and `apk mkndx` (request sequence and `libfetch/2.0` agent, the `A:noarch` path trap, `RSA` and `RSA256` index signatures, unsigned, foreign-key, stale and renamed-key refusals, dual signatures accepted in either order with the first trusted one deciding, unsigned and foreign-key packages installing from a trusted index while local-file installs refuse them, swapped control and data streams refused, `403`, `401`, `404` and 500 rendering with no body and no retries, no fallback for a refused package and a silently skipped refused index with exit 0, highest version winning across repositories, preemptive userinfo and challenged `.netrc` and `HTTP_AUTH`, userinfo printed by 2.14.12's `apk policy` and by both lines' `301` warning, cross-host redirects dropping credentials, index caching with 2.14.12 skipping a repeated `apk update`, `v3` lines and `Packages.adb`, absolute `pkgname-spec`, case, `++` and `_rc1`); the Alpine wiki's apk format page and the apk-tools 2.14.12 and 3.0.8 manual pages and sources; the live dl-cdn mirror (headers and `304`s, layout, the v3.24 index and a package taken apart with `C:` recomputed, signature scope recomputed with raw RSA, superseded builds removed, real installs with stock keys); and OSV's Alpine ecosystem (release-keyed, origin-keyed, no `MAL-` records). Eleven questions written in decision shape and adopted under the standing delegation: many trees per repository (AC4, AC6, AC12), a declared architecture set with `noarch` rewritten (AC5, AC7), publisher-signed packages never altered (AC3), a per-repository `RSA256` key with no authorization carve-out (AC2, AC9), `403` package-level refusals with indexes unchanged (AC13, AC14), verbatim proxied indexes (AC15, AC16), merged and re-signed virtual trees with per-name shadowing (AC20), v2 only (AC6), batch publish as one write (AC6), a per-repository OSV declaration matched on origin (AC21), `.netrc` recommended and no preconfigured mirror (AC11). Twenty-three criteria, each with a Test Plan row. Stays draft; awaits an independent review. |
