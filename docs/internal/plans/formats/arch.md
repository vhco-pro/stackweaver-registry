---
status: draft
status_description: "Format closing sweep 2026-09-28 at f8ad8b2 on Opus (not a review): Q13 adopted (a virtual composes a remote member's database only under a verified verdict, per signing-service AC36, so Arch's and Manjaro's unsigned official mirrors contribute nothing and the recipe puts them in a second section; AC23 extended); the merging profile declares member-input paths ({layout}/{db}.db and .files with their signatures), remote adoption re-merges and a virtual-only remote is revalidated by the virtual's reads (signing-service was-Q16, AC35; proxy-cache AC26); the architecture-set configure now has a client-observed effect, pacman's sync failing and then succeeding as the set loses and regains its architecture (management-surfaces item 14; AC9 extended); %BASE% reported as the version's advisory key so a future Arch source needs no code change (supply-chain was-Q11, AC24; AC24 extended); database revisions outside the quota and the declared list's placement confirmed (proxy-cache was-Q21, Q22; new AC28); packages through ServeFile (signing-service was-Q14), the exact conditional rule cited to its was-Q12; claims checked at declaration and at commit and the declared unchanged publish (management-api was-Q14, Q15; AC8); the stale pacman-row wording removed; two exception-list rows reported for conformance-harness. fable_recheck extended; 28 criteria. Earlier: Data-loss fix 2026-09-28 at 93982ba on Opus (not a review): a remote retains one superseded database revision per database and architecture, its .db body and filename map on the remote's declared blob-digest list, cached packages and signatures on their own cached references (proxy-cache was-Q19, AC27); a changed %SHA256SUM% now serves the current database's bytes and the new commit ends the old blob's cached reference (proxy-cache was-Q20, AC28), withdrawing the claim that each revision's clients receive their own bytes; AC22 and AC26 extended with sweeps run while the revision is retained. Earlier: Reconciled 2026-09-28 at 15ced69 with the foundation wave on Opus (not a review): databases and package signatures produced through signing-service's Indexer and generator package, signatures as Signature records rather than files, the announce-switch-retire profile as one atomic batch with no snapshot (AC10), freshness rendered from data-model's moved_at through ServeDocument (AC5), the virtual merge on the index.merge job (AC23); management operations on publish, delete-version, delete-package and configure with core-held retirement refused as retired (AC8, AC9); the key document a descriptor (AC13); refusals through WriteRefusal re-asserting the client-setting binding row (AC14); the openpgp all-flag entry and integrity entries of artifact-verification (AC3, AC17); upstream-adapters transport, proxy-cache paired sets, cache-scoped Last-Modified and removal classes (AC19, AC20, AC22); the Arch tracker kept out under supply-chain was-Q9; AC16's fallback half on declared stand-ins under the harness's client confinement; Capabilities with rename and virtual cases (AC27). Earlier: authored 2026-09-26 from captures of pacman 7.1.0 (Arch and Manjaro) and 6.0.2; twelve questions adopted under the standing delegation; none open. Awaits a /spec review pass."
description: "Spec for Arch Linux pacman repositories served to pacman 6 and 7: repositories holding many databases in Arch's {db}/os/{arch} layout, each database and files document generated and signed by the shared signing service on every write, every hosted package given a detached repository signature without its bytes changing, the database and package trust layers kept apart, a pointer-scoped forward-moving Last-Modified so a rollback reaches pacman's time-conditioned refresh, a proxied path serving Arch's unsigned databases and packager-signed packages verbatim, and virtual databases merged and re-signed."
author: michielvha
goal: "Serve Arch Linux and Manjaro hosts and container builds a private pacman repository and a verified cache of an Arch mirror that stock pacman 6 and 7 install from with the default SigLevel tightened to require database signatures, one repository key in the pacman keyring, credentials in a root-only Include file, and a network restricted to this registry."
priority: "low"
issue: 43
created: 2026-09-26
covers:
  - "internal/format/arch/**"
  - "conformance/arch/**"
fable_recheck: "authored on Opus 2026-09-27 while Fable was out of monthly credit; grounded in captured client traffic, but the design judgement was never Fable-reviewed; the data-loss fix on Opus 2026-09-28 folded proxy-cache's adopted Q19 and Q20 into the proxied path (retained-revision keep-alive on the remote's declared list, the changed-record row serving the current revision), which needs the same recheck; the format closing sweep on Opus 2026-09-28 raised and adopted Q13 (unsigned upstream databases contribute nothing to a virtual under signing-service AC36) and folded the member-input paths and the architecture-set client case without a question, all needing the same recheck"
---

# Plan: Arch Linux pacman repositories

The pacman repository format, hosted and proxied, on one handler: one `{db}.db` and one
`{db}.files` per database and architecture, each a compressed tar of per-package records with a
detached OpenPGP signature beside it, and the `.pkg.tar.zst` packages the records name, each with
its own detached `.sig`. pacman 7.1 and pacman 6.0.2 on Arch Linux, and pacman 7.1 on Manjaro,
are the oracle on both paths.

## Context

Arch sits in Tier 3 of `formats/catalogue.md` as the single-ecosystem family "Arch" (the row
"Arch (pacman)"). **Its build is gated by `project-charter.md` AC9 and `catalogue.md` AC5**: no
handler code for a Tier 2 or Tier 3 ecosystem exists before every Tier 1 format has met its
definition of done and the owner has recorded a `continue` verdict at the charter's build step 8.
This spec exists now because the owner directed on 2026-09-26 that everything be specced up front
(the catalogue's "Every ecosystem below is specced now; only building is gated"), so that the gate
decides what is built and never what is written; a `shrink` verdict parks it.

It is in the **signed-index class**. A database carries a detached signature that pacman checks
against its own keyring, and every package carries one too, so a hosted repository cannot exist
without the shared signing and index service the charter builds at step 7, before Helm. Debian
(`formats/debian.md`) and RPM (`formats/rpm.md`) are the Tier 1 members of the class and Alpine
(`formats/alpine.md`) the Tier 2 member; this spec follows their treatment of two trust layers, a
per-repository key and package-level refusal rendering, follows `cpan.md` and `debian.md` in
making freshness belong to the pointer, and states where pacman differs from all four.

Grounding for this draft, stated up front because the constitution asks for evidence or silence:

- **Captured client traffic.** No pacman runs on this Fedora host, so the clients were run as
  images pinned by digest (the linux/amd64 manifest; the index digest in brackets): Arch Linux
  with pacman 7.1.0, libalpm 16.0.1 and curl 8.22.0
  (`docker.io/library/archlinux@sha256:917e543c9d0f1f495d70907bdf05bf53607e791b351e1b01ccd3aec2442303ed`
  [`sha256:f3691b4dde62ba4c4b6f0ae2c1fbf28e8c0c8c4b9a35c7e06dc1f70e21aa29f6`]); the Arch Linux
  base image of 2024-01-01 with pacman 6.0.2, libalpm 13.0.2 and curl 8.5.0
  (`docker.io/library/archlinux@sha256:7b5aa07f86a6958bb072227e18e76ef37e59c65bff56a45aab695def2ddecd64`
  [`sha256:7ddb28e525cda55998a80d147967865193d170b0cf75c999ff2e3116d8f95a32`], tag
  `base-20240101.0.204074`); and Manjaro with pacman 7.1.0 and curl 8.18.0
  (`docker.io/manjarolinux/base@sha256:a411decb8d219cb4b16b39618e9aa8ce8228acad9cba5b10420f804a20ca5c84`
  [`sha256:bbf1f1d746f28e138eea610e140d2f28cbb5b7c5da2fbff034b883527aa604e9`]), included
  because its shipped `pacman.conf` omits the `DownloadUser = alpm` privilege drop Arch's 7.1
  configuration sets, which changes how credentials reach the downloader (captured). All three
  ship `SigLevel = Required DatabaseOptional` and a world-readable `/etc/pacman.conf`; the two
  Arch images also set `ParallelDownloads = 5`, and Manjaro ships `archlinux-keyring` beside its
  own `manjaro-keyring`. The stub was a logging
  HTTP and TLS server in a pinned `python:3.13-slim` container
  (`sha256:37134a49d21d2120e4c4d73bb76f8a4ab9aef31f096f7ec2ead48c2feead4332`) on a dedicated
  `--internal` Podman network, answering for `repo.test`, `other.test`, `mirror2.test` and, under
  a throwaway CA, `tls.test`; it recorded every request with its headers and applied per-path
  status, reason-phrase, redirect, Basic-credential, `Last-Modified` and conditional-request
  overrides, and a control route switched the served generation between commands. The fixtures
  were genuine: ten packages built with the 7.1 image's own `makepkg` (a dependency pair, three
  versions of one name, `swplus++`, an epoch `1:2.0`, a `1.0rc1` version, a name with a hyphen and
  digits, `x86_64` and `any` packages), signed detached with GnuPG 2.4.9 under a throwaway Ed25519
  packager key, a rogue RSA 3072 key, or not at all; databases made with `repo-add` 7.1.0 signed
  (`-s -k`) by a throwaway RSA 4096 repository key, unsigned, rogue-signed, with a stale
  signature, with two signatures in either order, with `--include-sigs`, and empty; the same
  packages indexed by `repo-add` 6.0.2 from the older image; and trees with swapped package bytes
  and swapped signatures. The stub is not a reference implementation; the captures prove what the
  clients send and how they react.
- **The published contract.** Arch has no standards-body specification. Read this run:
  `pacman.conf(5)` and `repo-add(8)` at tags `v7.1.0` and `v6.0.2`, pacman's NEWS, and the
  sources that decide behaviour the pages do not state, at both tags: `lib/libalpm/dload.c` (the
  curl options, the time condition, the error text, mirror retry, the signature download),
  `lib/libalpm/be_sync.c` (database download and validation, the `%FILENAME%` rule),
  `lib/libalpm/signing.c` (how a signature list is judged), `src/pacman/conf.c` and
  `scripts/repo-add.sh.in`; and makepkg's lint rules in the 7.1 image.
- **The live upstream.** geo.mirror.pkgbuild.com sampled directly: `core.db` (129,859 bytes, 299
  records, 257 `x86_64` and 42 `any`), `core.db.tar.gz` (the same bytes and `ETag`), `core.files`,
  `extra.db` (8,865,027 bytes, 15,000 records) and `extra.files` (51,106,163 bytes) with their
  headers; `core.db.sig` and `core.files.sig` answering `404`; conditional requests (an exact
  `If-Modified-Since` and a matching `If-None-Match` answered `304`, a later or earlier date
  `200`); a `206` to a range; `zlib-1:1.3.2-3-x86_64.pkg.tar.zst` and its `.sig` (an EdDSA
  signature, SHA-512 digest, byte-identical to the record's `%PGPSIG%`), its `%3A`-encoded form,
  and its two predecessors answering `404` on the mirror while archive.archlinux.org serves the
  previous one; the
  compression of every package in `core` and `extra` (15,298 `.pkg.tar.zst`, 1 `.pkg.tar.xz`); a
  Manjaro stable mirror's `core.db.sig` answering `404`; the mirror's only architecture directory,
  `x86_64`; and real `pacman -Sy` and `pacman -Sw zlib` from the pinned 7.1 image with its stock
  keyring (downloaded and verified) and from the 2024 image with its own (refused, "signature from "David Runge <dvzrv@archlinux.org>" is unknown trust").
- **OSV.** `ecosystems.txt` lists 46 ecosystems and no Arch or Manjaro, and a query naming `Arch
  Linux` answers `invalid ecosystem` (captured 2026-09-26). Arch's own security tracker publishes
  `issues/all.json`, 2,444 `AVG-` records keyed by package base with affected and fixed versions,
  85 still `Vulnerable`, in its own schema rather than OSV's. Detail in "Advisories, OSV and the
  security-signal rule".

Where the documentation and the captures disagree or the documentation is silent, the captures
win, and the differences are recorded because they would otherwise be built from the documents.
`pacman.conf(5)` describes `DatabaseOptional` as checking a signature if one is present; it does
not say that a `.db.sig` answered `403` or `404` counts as absent, so a refused or stripped
signature silently downgrades a database to unsigned under the shipped default (captured on all
three). `repo-add(8)` says a package's `.sig` "will automatically be embedded" and, since 6.1.0,
that `--include-sigs` embeds it; neither page says that pacman then verifies the embedded copy
while still requiring the detached file to exist (captured: a wrong `.sig` beside a correct
`%PGPSIG%` installed, a missing `.sig` beside one failed, on both lines). No page says that pacman
7.1 re-fetches `.db.sig` unconditionally while revalidating `.db` with `If-Modified-Since`, which
pairs an old database with a new signature when the server answers `304` (captured). And no page
says that, with Arch's shipped 7.1 configuration, `~/.netrc` stops working (captured).

Eight things make this format worth a careful spec. **Two independently signed layers, both
checked by default**: the shipped `SigLevel = Required DatabaseOptional` requires a trusted
signature on every package and checks a database signature only if one is served, and a
package's `%SHA256SUM%` and `%CSIZE%` in the database are checked as well (captured), so unlike
Alpine the package signature guards every repository install. **Every signature in a `.sig` must
verify with a trusted key** (`_alpm_check_pgp_helper` in signing.c; captured with two
signatures in either order), so a dual-signature rotation window, which apk and apt accept,
breaks every client missing either key. **The database and its signature are two separately
fetched files** with no shared version, and the two lines revalidate them differently, so a
database whose bytes change without its `Last-Modified` moving forward fails the next sync on
7.1 and is silently ignored forever on 6.0.2 (captured, Design, "Pointers, rollback and
freshness"). **A refused database fails the whole command**, where dnf, zypper and apk skip the
repository and install from others: `pacman -Sy swhello` exits 1 installing nothing (captured).
**But a refused database signature is silent** under the shipped default, which is why the
recommended configuration requires database signatures. **The first configured repository that
lists a name wins**, whatever version a later one offers (captured), the opposite of apk.
**A package can be fetched from another mirror of the same repository** after a refusal, when
the client lists two `Server` lines (captured). And **credentials depend on the configuration**:
curl sends URL userinfo only after a `401` challenge, and root's `~/.netrc` is read on 6.0.2 and
Manjaro but not under Arch's 7.1 `DownloadUser` (captured).

## Blocking preconditions

**The handler interface re-open must complete before this handler starts**, as for every handler
(`format-handler-interface.md` AC8). Arch is Tier 3, so the catalogue's Tier 1 gate (its AC5) and
the charter's breadth verdict (its AC9, build step 8) both precede it; the re-open is recorded
here anyway, from this side, because a gate enforced on one side only is enforced nowhere. This
format adds no root-anchored mount: pacman takes a `Server` URL with any path, so everything lives
under `/arch/{repository}/`.

**The shared signing and index service must be `planned` before Phase 1 and built before the
handler reaches `main`.** Every hosted and virtual database and its files document are generated
signed documents, and every hosted package carries a repository signature, all produced by
`docs/internal/plans/foundation/signing-service.md`, which the charter builds at step 7 before Helm
as the production form of what the step 4a prototype learned
(`write-triggered-services-prototype.md`). Arch is one of that spec's consumers of both halves: the
handler declares the optional `Indexer` interface, its generator lives in the sibling package
`internal/format/arch/index`, its profile declares the `announce-switch-retire` rotation profile,
and the service signs packages as stored blobs (`signing-service.md`, "Who depends on this", "The
generator contract", "Rotation profiles", "Signing stored blobs"). What this format requires of it
is stated in Design ("What the signing and index service must provide"), each item mapped onto that
spec. Every package also goes out through that spec's `ServeFile` form behind `Documents` in `Deps`
(its resolved handler-rendered decision, was Q14, AC32). Hosted reads cannot be tested without it,
because a database that was never generated has nothing for a client to read.

**The management API must be `planned` before Phase 2, and it is the only hosted write path.**
Publishing packages, deleting versions and packages, setting the architecture set and rotating the
key are operations of `docs/internal/plans/foundation/management-api.md`, placed by its
cross-format reconciliation table on `publish`, `delete-version`, `delete-package` and `configure`,
with key rotation arriving through its signing-key routes (its AC32; `signing-service.md` AC15). The
charter builds its core at step 2 and completes it at step 9; no pacman client writes. Phase 1's
hosted reads are testable without it, because the harness's `state` vocabulary seeds packages
through the shared write path, and the index runtime runs before every commit on a repository whose
handler declares an `Indexer`, the seed write included, so seeded state comes out generated and
signed with no seed-side code (`signing-service.md` AC21, `conformance-harness.md` AC24).

**The proxied path depends on two shared services, both now specified**: the transport of
`docs/internal/plans/foundation/upstream-adapters.md` (the `https` adapter with root-host-only
credentials, an allowlist for redirects, conditional revalidation and the upstream `Last-Modified`
returned per response; its requirements table answers this format with AC6, AC7, AC14, AC15 and
AC22; built at charter step 4), and the `openpgp` detached entry and the package-integrity entry
of `docs/internal/plans/foundation/artifact-verification.md` (its AC10 and AC18; built at step 4b).
Publish is synchronous (the resolved batch-publish decision below), so no write of this format is
deferred; the one deferred piece is the virtual merge, which `signing-service.md` runs as the
`index.merge` job on `docs/internal/plans/foundation/async-operations.md`'s runner, whose queue core
the charter lands at the start of step 4b, before this format could be built.

## Scope

**In scope:**

- **The pacman read surface** under `/arch/{repository}/{db}/os/{arch}/`: `{db}.db`,
  `{db}.db.sig`, `{db}.files`, `{db}.files.sig`, their `.db.tar.gz` and `.files.tar.gz` aliases
  (served by Arch's mirrors with the same bytes, live), every package a record names and its
  `.sig`; `GET` and `HEAD` on all of them, with single ranges on every file (curl resumes a partial
  package with `Range`, dload.c); and the key document at `/arch/{repository}/signing-key.asc`.
- **Repositories holding many databases** (the resolved layout decision below), each served per
  architecture of the repository's declared set in Arch's own `{db}/os/{arch}` layout, so one
  `Server = https://{host}/arch/{repository}/$repo/os/$arch` line serves every section a client
  names after one of the repository's databases.
- **Hosted packages** published through the management API, their bytes stored exactly as
  published, their `.PKGINFO` parsed into the version document, their database declared at
  publish.
- **Generated, signed databases**: on every write that changes a database, the shared signing and
  index service regenerates that database's `.db` and `.files` for each affected architecture, with
  `any` packages listed in every architecture's database, and signs both with the repository's
  key.
- **The two trust layers**: a detached package signature produced by the signing service with the
  repository's key for every hosted package, the package bytes unchanged, and the publisher's own
  signature, when supplied, verified as a verdict for policy (the resolved package-signing
  decision below); database signatures always produced by this registry for hosted and virtual
  databases.
- **Pointer-scoped freshness**: a forward-moving `Last-Modified` per pointer on every generated
  document, shared by a database and its signature, so a publish, a promotion and a rollback each
  reach pacman's time-conditioned refresh (the resolved freshness decision below).
- Deleting a version and a package, with the core-held retirement set and the write-boundary
  declaration `data-model.md` requires, and key rotation by announce-then-switch.
- Name, version and filename rules: case-sensitive names, `[epoch:]pkgver-pkgrel` versions compared
  only for equality, filenames resolved by lookup, and percent-decoding of the forms a client
  might send, `:` and `+` included.
- Non-interactive authentication in the forms pacman sends: Basic from URL userinfo and from
  `~/.netrc`, both after a `401` challenge.
- The per-route addressed objects `auth.md`'s pattern scopes evaluate, and the rendering of a
  shared policy refusal on every route.
- **The proxied path** against an Arch mirror (geo.mirror.pkgbuild.com or any mirror, a Manjaro
  mirror, or a private one): databases and files documents as mutable metadata with a TTL, adopted
  together with their signature as one revision, never adopting an upstream regression; packages
  and their signatures as immutable artifacts verified against the record's `%SHA256SUM%` and
  `%CSIZE%`; everything served verbatim; negative caching; this format's rows of the removal
  table.
- **Virtual repositories**, merged per database name and architecture with per-name first-member
  resolution and signed with the virtual repository's own key (the resolved virtual-repository
  decision below), a remote member contributing only a database that verified against its keys
  (the resolved unsigned-member decision below).
- The handler's `Capabilities()` declaration, repository rename and virtual aggregation
  (Design, "Capabilities and lifecycle").
- The three pinned clients above as conformance oracles on both paths, with the client network
  restricted to this registry and its stand-ins.

**Out of scope for v1**, each with its reason, recorded because the interface spec's definition
of done requires the deliberately unimplemented surface to be named:

- **Any client-side publish protocol.** None exists: pacman only reads, and `repo-add` writes a
  local directory. Hosted content arrives through
  `docs/internal/plans/foundation/management-api.md`.
- **Package compressions other than `.pkg.tar.zst` and `.pkg.tar.xz`.** makepkg's shipped
  `PKGEXT` is `.pkg.tar.zst`, and of 15,299 packages in `core` and `extra` one is `.xz` and none is
  anything else (live), so there is no ecosystem traffic to ground another form against; a capture
  of one installing reopens it. Anything else is refused at publish.
- **Embedded package signatures (`%PGPSIG%`) and `%MD5SUM%` in hosted databases.** `repo-add`
  7.1.0 writes neither by default (captured; 6.1.0's NEWS), both lines install without them
  (captured), and an embedded signature is the copy pacman verifies, which would make the
  detached `.sig` a route whose content nobody checks (captured). They are served verbatim on the
  proxied path, where Arch's databases carry them (live).
- **Serving mirror lists, `lastupdate` or `lastsync`.** pacman never requests them (captured), and
  a second `Server` line is the configuration that re-opens mirror fallback (Design, "How the
  clients decide").
- **Web Key Directory and keyserver publication of repository keys.** pacman looks an unknown key
  up remotely (captured: "could not be looked up remotely" on the restricted network), but an
  imported key has unknown trust and is refused until locally signed (captured), so publication
  would not remove the operator's `pacman-key --lsign-key` step.
- **The client's package cache, `CacheServer` and `XferCommand`.** They are client-side choices;
  the registry serves them as ordinary reads.

## Design

### The wire surface, as captured

Every route hangs off `/arch/{repository}/`, format-first per `format-handler-interface.md`'s
resolved URL-shape decision; no route is root-anchored. pacman builds every URL from a `Server`
line with `$repo` and `$arch` substituted and a file name appended (conf.c, be_sync.c), and a
record's `%FILENAME%` may not contain `/` or start with `.` (`_alpm_validate_filename` in
be_sync.c, which rejects the database as "inconsistent"), so no document can send a client to
another path or host and the handler never rewrites a document.

| Surface | Shape, as the pinned clients send it |
|---|---|
| Database | `GET {server}/{db}.db`, where `{db}` is the client's section name, then `GET {server}/{db}.db.sig`; `User-Agent: pacman/7.1.0 (Linux x86_64) libalpm/16.0.1` (`pacman/6.0.2 ... libalpm/13.0.2` on 6.0.2), `Accept: */*`, no `Cache-Control` and no `HEAD`. A refresh after the first sends `If-Modified-Since` equal to the local file's modification time, which the client sets to the server's `Last-Modified` after each download (`utimes_long` in dload.c), or to its own clock when the server sent none; `pacman -Syy` sends no condition. 7.1 fetches `.db.sig` with **no** condition on every refresh, while 6.0.2 sends the same `If-Modified-Since` on it (captured on both). The database is capped at 128 MiB and a signature at 16 KiB (be_sync.c, dload.c) |
| Files database | `pacman -Fy` fetches `{db}.files` and `{db}.files.sig` the same way (captured on both lines) |
| Packages | `GET {server}/{%FILENAME%}` for each package in the transaction, up to `ParallelDownloads` at once, then `GET {server}/{%FILENAME%}.sig` for each package that downloaded (dload.c adds the signature request only after a successful package response). `+` and `:` travel raw (`swplus++-1.0-1-any.pkg.tar.zst`, `swepoch-1:2.0-1-any.pkg.tar.zst`, captured). The record's `%CSIZE%` is the maximum the client accepts: a body larger than it is aborted as "Maximum file size exceeded" (captured on 7.1 with a swapped file; the same cap is set from the record in 6.0.2's sync.c) |
| Integrity | A package whose SHA-256 differs from `%SHA256SUM%` is refused ("invalid or corrupted package (checksum)"), and one whose detached signature does not verify is refused ("invalid or corrupted package (PGP signature)"), captured on both lines |
| Credentials | curl runs with `CURLAUTH_ANY` and `CURL_NETRC_OPTIONAL` (dload.c): URL userinfo and `~/.netrc` are both sent **only after a `401`** carrying `WWW-Authenticate: Basic`, one retry per request, so every file costs two requests (captured on all three). A wrong credential is not retried |
| Redirects | Followed up to ten; a cross-host `Location` drops the userinfo credential (captured on both lines). After a redirect, the signature is fetched from the redirected URL when its file name holds `.db` or `.pkg` (dload.c) |
| Retries | None per server: a `403`, `404` or `500` is requested once (captured). With several `Server` lines in a section the next one is tried, and three errors from one host skip it for the rest of the transaction (`server_error_limit` in dload.c; captured fallback below) |

**Error rendering**, captured, because a refusal nobody can read is a refusal nobody can act on:
no client prints a response body or the HTTP reason phrase. libalpm composes the text itself from
the numeric status, "The requested URL returned error: %ld" (dload.c), and prints "error: failed
retrieving file '{file}' from {host} : The requested URL returned error: 403", then "warning:
failed to retrieve some files" and "error: failed to commit transaction (failed to retrieve some
files)" on 7.1 ("(unexpected error)" on 6.0.2), exit status 1, with a custom reason phrase on the
wire changing nothing (captured). Only the host name is printed, never the credential. A database
refused prints the same first line and "error: failed to synchronize all databases". A database
signature that fails prints "error: {db}: signature from "{uid}" is invalid", "key "{fpr}" is
unknown" (after a failed remote lookup) or "is unknown trust", and "database '{db}' is not valid
(invalid or corrupted database (PGP signature))".

### How the clients decide, and the cross-format checks

**Does the client verify what it downloads? Yes, both layers by default, and each protects
something different.** Every package is checked three ways on both lines: its size against
`%CSIZE%` as a download cap, its SHA-256 against `%SHA256SUM%`, and its detached signature against
the pacman keyring, which under `Required` must exist, verify and come from a locally trusted key
(captured: a missing `.sig` fails the transaction, a rogue signature triggers a remote key lookup
and fails, a key that is present but not locally signed is "unknown trust", a valid signature over
other bytes is "invalid"). The database is checked only against its own signature, and under the
shipped `DatabaseOptional` only when one is served: an absent `.db.sig`, or one answered `403`,
installs silently, while a present one must verify (captured on all three). So the package
signature protects each package end to end; the database signature protects the database's
contents (which packages exist, their dependencies, and the checksums above); and with the shipped
default a party able to refuse or strip `.db.sig` can serve any database it likes, limited only by
the package signatures. The recommended configuration therefore sets `SigLevel = Required
DatabaseRequired` on this registry's sections (the resolved client-recipe decision below), under
which an absent database signature is "missing required signature" and fails the sync (captured).

**Is a rollback visible? Only if the served `Last-Modified` moves forward, and the two lines fail in
opposite ways when it does not.** Captured with a server moving from generation N (swhello 2.0) back
to generation N-1 (swhello 1.1):

| Server behaviour at the rollback | pacman 7.1 (Arch and Manjaro) | pacman 6.0.2 |
|---|---|---|
| Older `Last-Modified`, `304` when not newer | `.db` answered `304`, `.db.sig` fetched unconditionally and belonging to N-1: "signature ... is invalid", the sync exits 1, and the next `pacman -Sy` force-refreshes the invalid database and adopts N-1 | `.db` and `.db.sig` both `304`: the client stays on N silently, exit 0, on every later sync |
| Older `Last-Modified`, `304` only on an exact match (as Arch's nginx mirrors answer, live) | `200` with a `Last-Modified` older than the condition, which curl discards as an unmet time condition (`CURLINFO_CONDITION_UNMET`): the same failure and recovery | Both discarded: stays on N silently |
| N-1's bytes under N's unchanged `Last-Modified` (a republish without a new time) | The same failure and recovery | Stays on N silently |
| `Last-Modified` later than any served before | Adopts N-1, exit 0 | Adopts N-1, exit 0 |
| No `Last-Modified` at all | Every sync downloads the database whole and adopts it | The same |

A database carries no generation, date or expiry of its own, and pacman compares nothing between
one database and the next (a rollback served with a later time was adopted without comment,
captured), so nothing but `Last-Modified` orders generations: there is no downgrade protection
to trip, and equally no freeze protection. So, as in `cpan.md` and `debian.md`, **freshness belongs
to the pointer, not the snapshot** (Design, "Pointers, rollback and freshness").

**Does the client fall back when refused? Not to another repository; yes to another mirror of the
same repository; and a refused database fails the whole command.** Captured on all three:

| Refused | What pacman did |
|---|---|
| A package, with a second section listing the identical file | Failed the transaction, exit 1; no request reached the second section's copy, which installed only when named explicitly (`pacman -S swother/swhello`) |
| A package, with a second `Server` line in the same section | Printed the `403`, fetched the package and its signature from the second server and installed, exit 0 |
| A database, with a second section that synced | "failed to synchronize all databases", exit 1, and `pacman -Sy swhello` installed nothing from the other section; `pacman -S` without `-y` found no database |
| A database signature, under the shipped `DatabaseOptional` | Accepted the database as unsigned, exit 0 |
| A name present in a later section at a higher version | The first section's version installed and `pacman -Su` reported nothing to do |

pacman is therefore stricter than `rpm.md`'s dnf5 and zypper and `alpine.md`'s apk, which skip a
refused index silently: here the silent path is the signature, not the index. Three rules follow,
and the conformance cases assert them. **A policy refusal is always package-level**: a database
never fails because one package in it is refused (the resolved refusal-rendering decision below).
**The recommended configuration names one `Server` line per section, every section on this
registry, with database signatures required**; that configuration holds a refusal whatever the
client's egress allows (AC16). **A key lookup is the one egress a refusal cannot stop**: a
signature by an unknown key sends the client's GnuPG to a key directory or keyserver (captured as
a failed lookup), which carries no package bytes and grants no trust; the operator documentation
names it.

**Does the client rely only on the HTTP reason phrase? No: it relies on nothing but the status
code**, composing its own text (above). So, unlike `cpan.md`, nothing about this format pins
HTTP/1.1, and every route may be served over HTTP/2, which Arch's mirrors already use (live); the
refusal's detail reaches the operator through the refusal record and the user only through the
operator documentation's statement that a `403` from this registry on a package is a policy
decision.

### Two trust layers

The captures show that pacman verifies the two layers at different times, under different
`SigLevel` defaults, against one keyring, so the design keeps them apart end to end.

**The database signature** is a detached OpenPGP signature over the exact bytes of `{db}.db`
(likewise `{db}.files`), fetched as `{db}.db.sig`. `repo-add -s` writes a binary signature by the
chosen key (captured: 566 bytes for the RSA 4096 fixture key).

- Under `DatabaseRequired` an absent signature fails the sync; under `DatabaseOptional` it is
  accepted, and so is a `403` or `404` on the signature (captured on all three, above).
- A present signature must verify with a key in the pacman keyring that is locally signed or
  otherwise fully valid: a rogue key is looked up remotely and refused, an imported but unsigned
  key is "unknown trust", a stale signature is "invalid" (captured).
- **Every signature packet in the file must verify.** A `.sig` holding the repository's and a
  rogue key's signatures, in either order, failed on all three clients holding only the
  repository key, and installed on a client holding and trusting both (captured), as
  `_alpm_check_pgp_helper` states in code: any unknown, invalid or insufficiently trusted packet
  fails the whole list. A `KEY_EXPIRED` signature is still accepted (same function).
- Arch and Manjaro publish **unsigned** databases (live: `core.db.sig` and `core.files.sig` answer
  `404` on geo.mirror.pkgbuild.com, and Manjaro's `core.db.sig` likewise), which is why their
  shipped default is `DatabaseOptional`.

**The package signature** is a detached OpenPGP signature over the exact bytes of the package file,
fetched as `{filename}.sig`, or carried inside the database as `%PGPSIG%`.

- Under `Required` (the shipped default) it must exist, verify and come from a trusted key, or the
  transaction fails before anything is installed (captured).
- **When the database embeds `%PGPSIG%`, that copy is the one verified**, yet the detached `.sig`
  must still download: a wrong `.sig` beside a correct `%PGPSIG%` installed, and a missing `.sig`
  failed, on 7.1 and 6.0.2 (captured, as 6.0.0's NEWS announces "package signatures are always
  retrieved"). Arch's databases embed every signature (live: 299 of 299 in `core`, 15,000 of 15,000
  in `extra`, and zlib's embedded copy byte-identical to its `.sig`); `repo-add` has not embedded
  them by default since 6.1.0.
- The signature does not alter the package: it is a separate file, so a signature added, replaced
  or re-signed never changes the package's bytes, its `%SHA256SUM%` or its `%CSIZE%`. This is the
  difference from `rpm.md` and `alpine.md`, whose package signatures live inside the package, and
  it is what makes registry signing of packages cost-free for identity.
- The package's `%SHA256SUM%` and `%CSIZE%` link it to the database, so under a verified database a
  package is protected twice, and under an unverified one once.

Per the resolved package-signing decision below, **hosted packages are signed by the signing
service with the repository's key**, the bytes stored and served exactly as published; a
publisher's own `.sig`, when the publish carries one, is verified through
`artifact-verification.md` and its verdict recorded for policy, and is not served. Per the
resolved key decision below, hosted and virtual databases are signed with the repository's key,
and proxied databases and packages are served verbatim with whatever signatures the upstream has.
A client of a hosted repository therefore trusts one key for both layers.

### Databases, architectures and the layout

A client names a section, and pacman requests `{server}/{section}.db` with `$repo` and `$arch`
substituted into the server URL (conf.c). Arch's mirrors lay a database out as
`{db}/os/{arch}/{db}.db` beside its packages (live), and Arch's shipped mirror list writes
`Server = https://.../$repo/os/$arch` (captured in the 7.1 image). Per the resolved layout decision
below:

- **A repository holds any number of databases**, each named by the publish that first targets it.
  A database name is one segment of `[a-z0-9@._+-]`, not starting with `-` or `.`, and not
  `options`, which conf.c reserves as the configuration section.
- **Hosted and virtual repositories use Arch's fixed layout**, `{db}/os/{arch}/`, so one `Server =
  https://{host}/arch/{repository}/$repo/os/$arch` line serves every section named after one of
  the repository's databases, and a section named after no database answers `404` on its `.db`,
  which fails the client's whole sync (captured).
- **The repository declares its architecture set**, defaulting to `x86_64`, the only architecture
  Arch's official mirrors serve. Every database serves a signed `.db` and `.files` for each
  declared architecture, an architecture with no packages serving a signed empty database, which
  both lines accept (captured with a 45-byte empty database under `DatabaseRequired`); a request for
  an architecture outside the set answers `404`.
- **An `any` package is listed in every architecture's database** of its database name, as Arch's
  are (live: 42 `any` records in the `x86_64` `core.db`), and served from each
  `{db}/os/{arch}/` path, one file and one blob.
- **A remote repository's layout is its upstream's**: a client path is appended to the mirror root,
  and the remote declares a layout template with `{db}` and `{arch}` placeholders, defaulting to
  `{db}/os/{arch}` (Arch) and set to `stable/{db}/{arch}` for a Manjaro stable root, so the handler
  can identify a request's database and architecture and a virtual repository can merge it.

### Mapping onto the shared model

The levels are exactly those `data-model.md` provides; no table is added.

- **A `Package` is `{db}/{name}`**, the name exactly as `.PKGINFO`'s `pkgname` gives it: names are
  case-sensitive, and `pacman -S SWHELLO` answered "target not found" for `swhello` (captured).
  The database is part of the key because one name may carry different versions in `myrepo` and
  `myrepo-testing`.
- **A `Version` is the full version string**, `[epoch:]pkgver-pkgrel` as `.PKGINFO` writes it
  (`1:2.0-1`). Its document holds the record fields `repo-add` writes from `.PKGINFO` (`%BASE%`,
  `%DESC%`, `%GROUPS%`, `%URL%`, `%LICENSE%`, `%BUILDDATE%`, `%PACKAGER%`, `%ISIZE%`,
  `%REPLACES%`, `%CONFLICTS%`, `%PROVIDES%`, `%DEPENDS%`, `%OPTDEPENDS%`, `%MAKEDEPENDS%`,
  `%CHECKDEPENDS%`), the file list for `.files`, and per file the architecture, file name,
  `%CSIZE%`, SHA-256 and the publisher-signature verdict.
- **`File`**: per version, the package archive, one for an architecture-specific build and one for
  an `any` build listed in every architecture.
- **Signatures are not files.** The repository signature of a package and of every generated
  document is a `Signature` record keyed by (repository, body digest, key id, profile), produced by
  the signing service inside the write and never snapshot content (`signing-service.md`'s resolved
  signature-placement decision, was Q2 there; `data-model.md` AC37), served at `{filename}.sig`
  and `{db}.db.sig` by assembling it beside its body, which is a concatenation and never a signing
  operation (`signing-service.md` AC6). A key switch is therefore a batch of new records and creates
  no snapshot, and a record whose body no retained snapshot or pointer document holds is pruned
  with it.
- **The retirement set of deleted versions** is not in the package-level document: it is the
  core-held `Retirement` record `management-api.md` moved it to ("Retirement is core-held", its
  resolved retirement-placement decision, was Q3) and `data-model.md` owns (AC35), with the
  coordinate `{db}/{name}/{version}`. The package-level document holds nothing format-specific.
- **The repository-level document** holds the architecture set, the key reference, and per
  database and architecture the current `.db` and `.files` bodies as CAS digests, protected by the
  fourth GC mark root (`storage-and-gc.md` AC16), since a real database crosses any sensible inline
  threshold (live: `extra.db` is 8,865,027 bytes and `extra.files` 51,106,163).
- **Freshness is the pointer's, not this format's.** `data-model.md`'s per-pointer freshness record
  (`moved_at` and a generation counter, AC36) is what the served `Last-Modified` is rendered from
  (Design, "Pointers, rollback and freshness"); it is not snapshot content and this handler holds
  no freshness state of its own.
- A remote repository's document holds, per database and architecture it has served, the current
  and retained revisions with their upstream `Last-Modified`, verification results and the
  filename map built from each (below); none of it is snapshot content. It retains one superseded
  revision per database and architecture, the default count of `proxy-cache.md`'s resolved
  retained-revision decision (was its Q19), and every blob it keeps for the current or the
  retained revision (the `.db` body a map is built from and the map once built) is on this
  document's **declared blob-digest list**, the only way a document keeps another blob alive
  (`storage-and-gc.md` AC16). A `%SHA256SUM%` or a database digest a kept document merely names is
  metadata and keeps nothing alive; cached packages and signatures are held by their own cached
  references. The list sits on the repository-level document because a database per
  architecture is a repository-wide revision set, where `proxy-cache.md`'s resolved
  declaring-document decision (was Q22) places it, so adoptions of different databases and
  architectures of one remote serialise on that row, bounded by the handful a remote serves, each
  adopted at most once per TTL. None of it is ever LRU-evicted: a remote's current metadata ends
  only when an adoption supersedes it beyond the retained count or the remote is deleted, and is
  counted in `cache_metadata_bytes{repository}` outside the quota (its resolved metadata-eviction
  decision, was Q21, AC29), the mirrored files document of Arch's `extra` alone being 51 MB of it, while cached
  packages and signatures are files under the quota.

### The hosted publish path and what counts as a write

Nothing on pacman's wire writes. The hosted path is fed by the registry-owned management API,
`docs/internal/plans/foundation/management-api.md`. Per the cross-format precedent (`pypi.md`'s
resolved hosted-yank decision, with `rpm.md` and `alpine.md`), each operation is one completed
logical write through the shared write path, bound onto the kind that spec's cross-format
reconciliation table assigns the RPM, Alpine and Arch rows, carrying that kind's action, hosted
only, its trigger verified by this registry's integration tests and its effect by the real clients
(`docs/internal/analysis/management-surfaces-and-the-oracle.md`: Arch is a format none of whose
management triggers has a client). The handler declares the kinds through `Operator.Operations()`
and implements them in `Apply` inside the transaction `Submit` opens; it declares no bindings, since
no client writes. Every declared kind is driven by a `script` case (`management-api.md` AC24,
enforced by `conformance-harness.md` AC26):

| Operation | What the operation carries | Effect a client sees | Kind | Action |
|---|---|---|---|---|
| Publish packages | A database name and one or more package files, each optionally with the publisher's `.sig` (the resolved batch-publish decision below) | Every package appears in its architectures' databases with a repository signature and installs after the client's next `pacman -Sy` | `publish` | `push` on every object it adds |
| Delete a version | Database, name and version | It leaves every database; installing it fails; its package and signature routes answer `404`; the coordinate is retired | `delete-version` | `delete` |
| Delete a package | Database and name | Every version leaves and is retired; the `Package` row survives (`data-model.md` AC33) | `delete-package` | `delete` |
| Set the architecture set | A list of architecture names | Databases appear or stop for those architectures: a client of an architecture removed from the set finds its `{db}.db` answering `404`, which fails its whole sync, and one whose architecture is restored syncs and installs again on its next `pacman -Sy` (AC9) | `configure` | admin role |
| Announce, switch or retire a key | The phase (the resolved rotation decision below), through the signing-key routes: create a key in `announced` state, activate it, retire the old one | The key document and every signature change as that decision states | `configure` | admin role |

What this registry enforces on ingest:

- The files arrive through `management-api.md`'s publish, as committed upload-session blobs or a
  multipart convenience publish, both producing the same snapshot delta (its "Publish through the
  API", AC14, AC15); the handler's `Authorize` reads each file's `.PKGINFO`, the archive's first
  entry, by a bounded peek to report its object. Each package must be a
  `.pkg.tar.zst` or `.pkg.tar.xz` whose archive begins with a `.PKGINFO` holding `pkgname`,
  `pkgver` (the full `[epoch:]pkgver-pkgrel`) and `arch`, with a name satisfying makepkg's rule
  (ASCII alphanumerics and `+_.@-`, not starting with `-` or `.`, from `lint_one_pkgname` in the
  7.1 image) and a version whose `pkgver` part holds no `:`, `/`, `-` or whitespace; anything else
  is refused with `422` and nothing committed.
- The stored file name is the canonical `{pkgname}-{pkgver}-{arch}.pkg.tar.{ext}`, whatever the
  upload was called.
- A publisher `.sig` must be at most 16 KiB (the client's own cap, dload.c); it is verified inside
  the write against the repository's trust set through `Deps`' `Verifier`, under
  `artifact-verification.md`'s `openpgp` detached entry with the `all` flag, and its verdict
  recorded, not enforced (that spec's AC10 and AC21; below).
- **A coordinate that already exists in the database is refused with `409`** unless the bytes are
  identical, which is idempotent and creates no snapshot, the CI-retry case: this format declares
  `management-api.md`'s unchanged publish, so a publish whose every file finds identical bytes at
  its coordinate completes its `Operation` with no snapshot reference and `unchanged: true` (its
  resolved unchanged-publish decision, was Q15, AC5), while a batch mixing identical and new files
  commits the new ones. A **retired** coordinate is refused with any bytes, including after the
  deleting snapshot has been pruned and across a backwards repoint, by the shared write path with
  the `retired` problem (409) naming it: `Authorize` claims each file's `{db}/{name}/{version}`,
  and the write transaction checks the claims when they are declared, before `Apply` runs, and
  again at commit, so a deletion committing between the two cannot let the publish through
  (`management-api.md`'s resolved retirement-check decision, was Q14, AC12): the cross-format
  retirement rule, with nothing for this handler to carry forward. An `any` build and an architecture-specific build of
  one version in one database occupy the same record in that architecture's database, so the
  second is refused with `409` naming the first.
- An `arch` other than `any` and outside the repository's declared set is refused with `422`.
- Whether a package without a publisher signature, or with one by a key outside the repository's
  trusted publisher keys, is refused is a repository policy rule over the verifier's verdict
  (`supply-chain-policy.md`, "Signature and attestation state is a consumed verdict", its AC15).
- A publish or management operation against a remote or virtual repository answers `405` with the
  `repository-type` problem (`management-api.md` AC7).

`data-model.md` requires each format spec to declare its ecosystem's write boundaries. Arch's
declaration:

- **One publish is one completed logical write**, however many packages it carries, together with
  the signing of each package and the regeneration and re-signing of every database it changes,
  in one snapshot.
- **Each deletion is one write** however many versions it removes, the core writing each
  `Retirement` record in the same transaction; a retention pass over a repository is one write.
- **A change to the architecture set is one write** that regenerates every affected document.
- **A key rotation creates no snapshot.** Each phase is a `configure` operation on the signing-key
  routes, and the switch is one atomic batch of signature records under the new key for every
  currently served body and package, with no content change (`signing-service.md`'s resolved
  rotation decision, was Q11 there, AC7 and AC8).
- A proxied repository creates no snapshots; revisions and packages arriving from an upstream are
  cache materialisation.

### Every hosted database is a write-triggered signed document

Per the resolved key decision below, a database's documents are produced by the shared signing and
index service inside the write that changes them, **stored, never rendered on request**, the class
`write-triggered-services-prototype.md` defines for Debian's `Release`. The trigger is the shared
write path's: the index runtime is the registered consumer of the pre-commit hook every write
transaction runs (`data-model.md` AC37, `storage-and-gc.md` AC25), so a publish, a deletion, a
seeded `state` entry and a retention pass all come out regenerated and signed, and the handler holds
no code that requests it (`signing-service.md` AC1). The bytes come from the generator package
`internal/format/arch/index`, which imports nothing of the registry beyond `internal/index`'s value
types, and neither it nor the handler can reach a key or a signing library (`signing-service.md`
AC2). The rules the service applies for this format, stated as this format's requirements:

- **Regeneration inside the write.** A publish or deletion regenerates and signs the `.db` and
  `.files` of the architectures it touches in the database it targets, in the same snapshot as
  the change (`data-model.md`'s one-write-one-snapshot rule). An `any` package touches every
  architecture of its database; no other database is touched, so writes to different databases
  never contend: the generator's `Affects` maps a change to exactly those keys, and every other
  key keeps its bytes, signature and `ETag` (`signing-service.md` AC4).
- **Under contention, both land.** Two concurrent publishes into one database each produce a
  database listing the other's packages once both are complete: the runtime takes a per-document
  lock before it regenerates, with the revision-token retry `data-model.md` makes mandatory for
  what the lock does not cover (`signing-service.md` AC28).
- **Package files outlive the database that stops naming them only as the retention rule allows.** A
  client syncs and may install hours later from its cached database, so a package route serves any
  file a database of a retained snapshot names. A deletion is the exception by design: its routes
  answer `404` at once. Arch's mirrors remove a superseded build immediately (live: zlib's two
  predecessors answer `404`), so this registry is gentler than the upstream it replaces.
- **A publish between a client's `.db` and `.db.sig` requests fails that sync once.** The two are
  separate requests with no shared version, so a client can receive generation N's database and
  N+1's signature; it reports an invalid signature, exits 1, and its next `pacman -Sy`
  force-refreshes the database marked invalid and succeeds (captured as the recovery above). No
  server behaviour can pair the two requests, so the operator documentation states it.
- **No hosted route ever answers a redirect**, so a credential in URL userinfo never travels to a
  second origin by this registry's doing.
- **A repoint restores the databases.** The document bodies live in the repository-level document,
  so a rollback serves exactly the databases of the snapshot it targets, under a new
  `Last-Modified` (below); where a body has no signature record under the current key (a rollback
  across a key switch), the missing records are produced inside the repoint write
  (`signing-service.md` AC9). The retirement set is core-held and untouched by a repoint
  (`data-model.md` AC33, AC35).

### Pointers, rollback and freshness

Per the resolved freshness decision below, following `cpan.md`'s and now held by the shared
layers, freshness is the pointer's and is rendered by the service, never computed here.
`data-model.md` owns the record: every pointer carries `moved_at`, set at every transition (a write
advancing the default pointer, a promotion, a rollback, a key switch) to the later of the
transition time and one second after its previous value, so it never moves backwards whatever the
clock does (its "Freshness scoped to the pointer", AC36). `signing-service.md` owns rendering it:
every generated document is served through the runtime's `index.ServeDocument`, whose
`Last-Modified` is the record's `moved_at` when the document's bytes changed at that transition
and the previous value otherwise, so it is forward-moving per document (its "Freshness scoped to
the pointer: the split with `data-model.md`", AC11, AC27, which cites this spec for both rules
below). **A database and its signature share one `Last-Modified`**, and so do `.files` and its
signature, because 6.0.2 revalidates the signature with the database's time (captured). A
conditional request is answered `304` only when `If-Modified-Since` equals the document's current
`Last-Modified` exactly, as Arch's own mirrors do (live), or `If-None-Match` equals its
byte-derived `ETag`, which is the `exact` rule every profile gets by default
(`signing-service.md`'s resolved conditional-rule decision, was Q12, AC11); otherwise the body is sent with a `Last-Modified` later than anything the
client can hold, so curl never discards it. An architecture test holds that no handler package sets
these headers or evaluates the conditions itself (`signing-service.md` AC11).

| Transition | Served | `Last-Modified` | What a client that synced before sees on its next `pacman -Sy` |
|---|---|---|---|
| A write advances the default pointer | The new snapshot's documents | Advanced for each changed document and its signature | The new database, all three clients |
| Rollback to an earlier snapshot | That snapshot's documents, byte-identical to when it was current | Advanced | The earlier database, exit 0, all three clients (captured with a forward-moving time) |
| Promotion to an environment pointer | The promoted snapshot's documents, byte-identical | That pointer's own record | Identical bodies; only the headers differ |
| A key switch | Every document re-signed | Advanced for every signature and its document | The same database under the new key |
| Serving a snapshot's original generation time (never done) | | (backwards) | 7.1 fails the sync once, 6.0.2 silently keeps the newer database (captured) |

Because the bodies of a promoted snapshot are byte-identical to the source environment's, this
qualifies nothing in `data-model.md` AC22; only headers are pointer-scoped here, as in `cpan.md`.

### What the signing and index service must provide

Stated so the dependency on `docs/internal/plans/foundation/signing-service.md` cannot be lost,
following `rpm.md`'s and `alpine.md`'s statements of the same dependency; that spec lists these as
`arch.md`'s eight items (its "Who depends on this" table) and each is mapped onto its contract
below:

1. **Generation of a database per architecture** from the version-level records of every package in
   the database whose file is that architecture or `any`: a gzip-compressed tar holding one
   `{name}-{version}/desc` entry per package whose fields equal, field for field and in order, what
   `repo-add` 7.1.0 writes for the same packages (`%FILENAME%`, `%NAME%`, `%BASE%`, `%VERSION%`,
   `%DESC%`, `%CSIZE%`, `%ISIZE%`, `%SHA256SUM%`, then the `.PKGINFO`-derived fields in its order),
   with no `%PGPSIG%` and no `%MD5SUM%`; and the `.files` document, the same entries each with a
   `{name}-{version}/files` entry holding `%FILES%`. The tar holds only these entries and
   directories, never extended attributes of the generating host (`repo-add` in the fixture
   environment wrote SELinux attributes into its tar headers, which pacman ignored, captured).
   The bytes are produced once and stored; the signature is over those bytes, so the service never
   recompresses a signed document. This is the generator's `Generate`, deterministic over the same
   records (`signing-service.md` AC25), its output checked against `repo-add` by AC6 here.
2. **One OpenPGP key per hosted and per virtual repository**, RSA 4096 by default or Ed25519 on
   request (both verified by every client line, captured: RSA 4096 on databases, Ed25519 on
   packages), with a SHA-256 or stronger digest, and a signing operation over a document's or a
   package's bytes returning a **binary detached signature with exactly one signature packet**,
   because every packet must verify on every client (captured). The handler never sees the private
   key, which an architecture test asserts as `write-triggered-services-prototype.md` AC5 does for
   Debian (`signing-service.md` AC2). Every signature is self-checked through `internal/verify`
   before the write commits (its AC17), and a key is created on any custody backend that offers the
   algorithm (its AC13).
3. **Package signing inside the publish write**: one detached signature per published package
   file, produced by `SignBlob` over the committed package blob in one streaming pass
   (`signing-service.md`, "Signing stored blobs", AC18) and stored as a `Signature` record keyed by
   the package's digest, never snapshot content, never re-signed except by a key switch or by a
   repoint to a snapshot whose packages lack a record under the current key.
4. **The key document**: every currently valid public key of the repository, ASCII-armoured and
   concatenated, served at `/arch/{repository}/signing-key.asc` and shown in the management surface
   with each fingerprint, which the operator passes to `pacman-key --add` and `pacman-key
   --lsign-key`; a key that is added but not locally signed is refused as "unknown trust"
   (captured). The public form is byte-checked against `gpg --import` (`signing-service.md`
   AC12).
5. **Synchronous regeneration and signing inside the write**, dispatched by the pre-commit hook
   (`signing-service.md` AC1) within a management request's latency budget; there is no
   asynchronous half for a hosted write, which bounds a publish's cost to the databases it touches
   plus one signature per package.
6. **Rotation by announce-then-switch, never by dual signature** (the resolved rotation decision
   below): `signing-service.md`'s `announce-switch-retire` profile (its "Rotation profiles", AC7,
   AC8). *Announce* creates the new key in `announced` state and adds it to the key document
   without re-signing anything. *Switch* activates it: **one atomic batch of signature records, no
   snapshot**, re-signing every currently served database, files document and package of the
   repository with the new key alone and advancing every `Last-Modified`, no reader ever observing
   a document signed by a key the key document lacks. *Retire* removes the old key from the key
   document. A client that imported and locally signed the new key during the announce phase
   notices nothing; one that did not fails its next sync with "key ... is unknown" and a failed
   remote lookup, which the operator documentation states. Each phase is a `configure` operation on
   the signing-key routes (`management-api.md` AC32).
7. **Contention handling and storage** as in the sections above: the per-document lock and the
   revision-token retry (`signing-service.md` AC28), CAS storage above the inline threshold
   streamed without buffering (its AC5), byte-derived `ETag`s and the pointer's freshness record
   rendered through `ServeDocument` (its AC11), and retention of every package an unpruned
   snapshot's database names, which needs nothing of the service because the packages are snapshot
   content (its "Storage" section).
8. **The virtual merge** (below): the generator's `Merge`, run as the deferred `index.merge` job
   when a member's database changes, coalesced per virtual, never on a request's path, and signed
   with the virtual repository's key (`signing-service.md`, "Virtual merges", AC19), re-run when a
   remote member adopts a new database revision through the runtime's adoption hook and fed a
   never-adopted remote through the member-input paths the profile declares (its resolved
   remote-member decision, was Q16, AC35: the re-merge this spec asked for, now met).

Verification of upstream and publisher signatures is not the signing service's: it belongs to
artifact verification (`signing-service.md`, "The produce/verify boundary").

### What artifact verification must provide

Of `docs/internal/plans/foundation/artifact-verification.md`, per `supply-chain-policy.md`'s
resolved verification-ownership decision; that spec lists both items as `arch.md`'s requirements and
answers them with its `openpgp` detached entry and its integrity entries:

1. **An OpenPGP detached-signature verification entry** that takes a file's bytes, a signature (a
   detached file, or a record's base64 `%PGPSIG%`) and a key set, and answers verified (with every
   key id), untrusted or bad, with pacman's semantics: **every** signature packet must verify with
   a key in the set, and an expired key's valid signature counts as verified. It is used for
   publisher signatures at ingest, for upstream database signatures where an upstream serves one,
   and for upstream package signatures on the proxied path. Answered by the `openpgp` detached
   entry under its `all` flag, which counts a signature made before its key's expiry as verified
   and reports key and digest algorithms (`artifact-verification.md` AC10); the verdict is
   recorded, not enforced, for Arch package signatures (its AC21), and the handler reaches it only
   through `Deps`' `Verifier`, never importing `internal/verify` (`format-handler-interface.md`
   AC15). The keys come from the repository's trust set, provisioned in cases through the
   harness's `trust` key (`artifact-verification.md` AC25).
2. **Package integrity against a record**: the file's size against `%CSIZE%` and its SHA-256
   against `%SHA256SUM%`, answering each separately, so the proxied path can gate on them while
   the signature verdict stays a policy input. Answered by the integrity entries, which answer
   `match`, `mismatch` or `weak` and are never stored as verdicts, a `mismatch` on the proxied path
   leaving nothing in the CAS (`artifact-verification.md` AC18). The `.PKGINFO` and `%PGPSIG%`
   parsing a scheme needs lives in that spec's scheme package, the one place a format-entangled
   primitive may know a format.

The conformance matrix's verification column needs a passing hosted and a passing proxied
verification case for Arch (`artifact-verification.md` AC24), which AC3 and AC17 carry.

### Names, versions and filenames

- **Nothing folds.** Names are compared byte for byte (captured: `SWHELLO` resolves nothing);
  makepkg permits upper case, so the registry does not lower-case either.
- **Versions are libalpm's** (`vercmp`); the registry compares versions only for equality, and the
  epoch is part of the version string and of the file name (`swepoch-1:2.0-1-any.pkg.tar.zst`,
  captured; `zlib-1:1.3.2-3-x86_64.pkg.tar.zst`, live).
- **Filenames are resolved by lookup, never by splitting.** A name may hold hyphens and digits
  (`sw-2-tool`), so a request is looked up in the database's filename map, never cut at a hyphen.
- **Percent-decode every path before lookup, and never decode `+` as a space.** pacman sends `+` and
  `:` raw (captured); `%2B` and `%3A` from another client must resolve to the same file, as Arch's
  mirrors resolve `%3A` (live).

### Authentication: challenged Basic, and where the credential may live

pacman sends HTTP Basic, which `auth.md`'s verifier accepts as its universal Basic password form,
the token as the password and the username not an input ("Presentation forms", AC31). `auth.md`'s
client table carries the `pacman` row this spec's captures supplied (Basic only after a `401`, from
userinfo or `~/.netrc`, the latter unread under Arch 7.1's `DownloadUser`; a root-only included
`Server` line working on all three), so the auth cases are not gated on a missing row. How this
meets `auth.md`, whose rules this spec does not bend:

- **The forms.** URL userinfo in a `Server` line and `machine {host} login __token__ password
  {token}` in root's `~/.netrc` are both sent only after a `401` challenge (captured on all three).
  On Arch's 7.1 configuration, with `DownloadUser = alpm`, the downloader cannot read root's
  `~/.netrc` and the request stays at `401` (captured; removing the line or passing
  `--disable-sandbox` restored it, and Manjaro, which ships no `DownloadUser`, reads it).
- **The recommended form works everywhere.** Per the resolved client-recipe decision below, the
  operator documentation puts the `Server` line with userinfo in a file included from
  `pacman.conf` and readable only by root: pacman parses its configuration before dropping
  privileges, and the recipe installed on all three, Arch's 7.1 with `DownloadUser` in place
  (captured with a 0600 file under `/etc/pacman.d/`). It states that `pacman-conf` and `pacman --debug` print the password
  (captured), and that `/etc/pacman.conf` itself is world-readable.
- **The challenge is required.** No form sends anything until a `401` carrying `WWW-Authenticate:
  Basic realm="..."`, so a credential-less request to a repository that is not anonymously readable
  answers `401` with that header, identically for a private and a missing repository (`auth.md`
  AC17); a valid token lacking `pull` answers `404`; a rejected token answers `401` and is never
  served as anonymous (`auth.md` AC12).
- **No credential leaves for another host, and none is printed by the registry.** Hosted and virtual
  databases cannot name another host (`%FILENAME%` rules above), no hosted route redirects, and
  curl drops userinfo on a cross-host redirect anyway (captured).
- **TLS.** pacman sent Basic over plain HTTP without complaint (captured), so the protection is the
  server's: `auth.md` AC27 refuses a credential presented over a connection the server did not
  terminate with TLS. pacman trusts the system store; the harness installs its CA with `trust
  anchor` (captured over TLS on both lines).

### Addressed objects and pattern scopes

`auth.md`'s pattern scopes narrow a credential within one repository by matching the object each
request addresses, and the format declares which object each route reports ("Pattern scopes"
there; `format-handler-interface.md` AC12). The canonical object of a package is
`{db}/{name}/{version}`, the architecture not part of it, so a grant for a name covers every
architecture it is built for.

| Route | Object kind | Canonical object |
|---|---|---|
| `{db}.db`, `{db}.files`, their signatures and aliases (they enumerate the database's names) | none | - |
| The key document | descriptor | - (a signing-key document names no package, version or digest) |
| A package or its `.sig` (hosted or proxied) | named | `{db}/{name}/{version}` of the file the path resolves to |
| Publish packages (management API) | named | each file's `{db}/{name}/{version}` from its `.PKGINFO`, which is the archive's first entry; a publish carrying several files is authorized only if every object is |
| Delete a version (management API) | named | `{db}/{name}/{version}` |
| Delete a package (management API) | named | `{db}/{name}` |
| Architecture set, key rotation (management API) | none | - |

What that gives and costs, applying `auth.md`'s rules rather than re-deciding them. The key
document is a **descriptor**, `auth.md`'s fourth object kind for a repository-wide document that
names no object, which its table gives "a signing-key document" as an example (its resolved
name-free-document decision, was Q23); it passes the sentinel test every descriptor route must pass
(`format-handler-interface.md` AC12) and a patterned `pull` reads it. **A patterned `pull` still
cannot sync**: pacman must read the database, which enumerates the database's names and stays
none, so every client fails at `pacman -Sy` under a token patterned `swrepo/swhello/**`; this is
`rpm.md`'s and `alpine.md`'s consequence for the same reason, and `auth.md` names such enumerating
indexes as the case its descriptor kind does not unlock, since widening a patterned read to the
database would reveal names outside the pattern. A patterned `pull` still confines a
scripted fetch to in-pattern packages. **A patterned `push` publishes** in-pattern packages and is
refused an out-of-pattern one with no snapshot, and a patterned `delete` likewise.

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines, on a
package route or its `.sig` route on either path, the handler answers `403` with a JSON body
`{"errors": [{"status": "403", "title": "...", "detail": "..."}]}` naming the policy and rule,
written through the shared refusal writer `WriteRefusal` in `internal/format`
(`format-handler-interface.md` AC14), and nothing else changes: the databases still list the
package and still verify. On an HTTP/1.1 connection the writer also puts the condition into the
status line (`supply-chain-policy.md`'s resolved refusal-status-line decision, was Q10, AC18);
pacman composes its own text from the status code and prints neither, so the phrase is harmless
here and nothing about this format pins HTTP/1.1. Per the resolved
refusal-rendering decision below and captured on all three: pacman prints "failed retrieving file
'{file}' from {host} : The requested URL returned error: 403", neither the body nor the reason
phrase, and exits 1 with **nothing** from the transaction installed, the packages that downloaded
beside it included (captured: `swdep` downloaded and was not installed), which is stricter than
apk. pacman requests a refused file once per `Server` line and never requests the signature of a
package whose download failed (dload.c), so one install attempt through the recommended one-line
configuration produces one refusal record per refused package.

A database route never answers a policy refusal: the database is the repository as a whole, and a
refused database fails every sync of every client (captured), which would turn one refused package
into a denial of the whole repository.

These captures are what `supply-chain-policy.md`'s "When a refusal binds, per format" table records
for Arch as `client-setting` (the recipe's `SigLevel = Required DatabaseRequired`, without which a
`.db.sig` answered `403` or `404` is silently accepted), so AC14's case is not refused by the
harness's pending-row rule (`conformance-harness.md` AC26) and re-asserts the row.

### The proxied path

The handler owns the request and classifies for the proxy layer's fetch-and-cache API per the
settled decisions in `proxy-cache.md`. The upstream is a mirror root, for example
`https://geo.mirror.pkgbuild.com/`, and a client path under the remote repository is appended to
it. Per the resolved proxied-database decision below, **upstream databases, packages and signatures
are served verbatim**, so a client keeps its stock `archlinux-keyring` (captured: the pinned 7.1
image downloaded and verified a package from the live mirror with its stock keyring).

What this format needs of `docs/internal/plans/foundation/upstream-adapters.md`, which answers
each item in its requirements table (the `alpine.md` and `arch.md` row); the transport half is its
`https` adapter under the upstream's allowlist and credential role, and the protocol half (which
path to join, how to classify) stays this handler's:

- **Path joining under a mirror root**, with the remote's optional upstream credential (the
  `basic` kind) presented to that root's host only, over HTTPS (its AC6, AC19); an `http://` root
  is refused at configuration unless the upstream's `allow_http` is set (its AC22). Joining itself
  is the handler's derivation.
- **Cross-host redirects to an allowlist**: geo.mirror.pkgbuild.com answered every probe directly,
  but Arch's mirrors are independent operators, so the adapter follows redirects only to hosts on
  the upstream's `hosts` allowlist, makes no connection to any other, and forwards no credential
  beyond the root host (its AC7, AC8).
- **Conditional revalidation** of `.db` and `.files` with `If-None-Match` and `If-Modified-Since`:
  the live mirror sends `ETag` and `Last-Modified`, no `Cache-Control`, and answers a matching
  `ETag` or an exact date with `304` (live); the adapter sends both validators it holds (its AC15).
- **The upstream's `Last-Modified` returned to the handler** with each revision verbatim, which the
  non-regression rule below needs (its AC14).
- **Range pass-through is not required**: a miss fetches the whole file, and ranges are served from
  the CAS once it is committed.

Classification and behaviour:

- **`{db}.db` and `{db}.files` are mutable metadata with the proxy layer's TTL, and each is adopted
  together with its signature as one revision.** The handler declares each document and its `.sig`
  as a **paired set** (`proxy-cache.md`, "Freshness of what a remote serves", which names this
  format's finding): a revalidation fetches the document and its `.sig` (a `404` recorded as
  unsigned), and the set is verified together, committed in one transaction and served under one
  freshness record, so no request observes one member new and the other old (its AC22). Where the upstream signs and the remote has keys
  configured, the signature is verified before the revision is served, through the entry above; an
  unsigned upstream, which Arch and Manjaro are (live), is accepted on TLS alone and its revision
  recorded as unverified. A revision that fails is never served; the previous verified revision
  keeps serving under serve-stale and the operator is alerted.
- **An upstream regression is not adopted.** Per the resolved regression decision below, a new
  upstream revision whose upstream `Last-Modified` is earlier than the current revision's (a
  lagging mirror behind the same root, or a mirror switch) is not adopted; the current revision
  keeps serving and the regression is recorded for the operator. This is `proxy-cache.md`'s
  "Regression not adopted" class, which cites this format; a legitimate upstream rollback reaches
  clients only through the operator's refresh of the remote (`management-api.md` AC29).
- **A cache-scoped `Last-Modified`.** What a remote serves on `.db`, `.files` and their signatures
  is the remote's `adopted_at` for the paired set, set to the later of the adoption time and one
  second after the previous value, never the upstream's, with the `304` rule of "Pointers,
  rollback and freshness"; so a client of a remote sees each adoption and never pairs revisions.
  `proxy-cache.md` owns this record and `data-model.md` holds it on the remote's current-document
  entry (`proxy-cache.md` AC22, `data-model.md` AC44), the same rule `homebrew.md`'s resolved
  `Last-Modified` decision reached.
- **A filename map per revision.** A package can be verified only against its record, so the first
  package request under a revision builds, once per database digest, a map from `%FILENAME%` to
  `%CSIZE%`, `%SHA256SUM%` and version by streaming the database, stored as CAS-backed metadata on
  the remote's repository-level document and declared on its blob-digest list, the declaration
  committing only while that database's revision is current or retained, so a map finished after
  the adoption that dropped its revision is discarded; the adoption that drops a revision drops
  its body and map from the list in the same transaction (`proxy-cache.md` AC27). A package miss
  is then a lookup and a stream-and-verify fetch. A path that is neither a database document nor a package or signature the current or a
  retained revision names answers `404` with no upstream request, so the remote is not an open
  relay (`lastupdate` and `lastsync` included).
- **Packages are immutable artifacts**, verified under stream-and-verify against the record's
  `%CSIZE%` and `%SHA256SUM%` as a declared digest, never in `proxy-cache.md`'s completion-only
  mode, which this format does not need. **Their signatures are immutable too**, fetched when first requested
  and served verbatim; the package's signature verdict against the remote's configured upstream
  keys (for Arch, an export of `archlinux-keyring`) is recorded for policy, never a precondition of
  serving, because every client verifies it itself against its own keyring (captured) and a stale
  remote keyring would otherwise refuse good packages, as the 2024 image's keyring did (live). Where
  the record embeds `%PGPSIG%`, that is the signature the verdict is taken over, since it is the
  copy the clients verify (captured). Cached packages and signatures are served through
  `ServeFile`.
- **Database revisions sit outside the quota.** A cached `.db`, `.files`, their signatures and
  filename maps are the remote's current metadata, never LRU-evicted and counted in
  `cache_metadata_bytes`, while packages and their signatures are cached files under the quota
  (`proxy-cache.md`'s resolved metadata-eviction decision, was Q21, AC29).
- **Missing resources are negatively cached** with the short TTL on `404` and `410`; a `429` or
  `5xx` is never cached as absence (`proxy-cache.md` AC9).
- **URL rewriting** is none: pacman builds package URLs from the server URL and `%FILENAME%`.
- **Publish and every management operation against a remote repository answer `405`** with the
  `repository-type` problem (`management-api.md` AC7).

Upstream removal maps onto `proxy-cache.md`'s event-class table ("Upstream removal or
replacement", its AC13), which lists this format in the revision-bound and regression classes: the
handler classifies each event it observes, the layer executes the class. Arch keeps only the
current build of each package on its mirrors (live: zlib's two predecessors answer `404` on the
mirror, and the previous one is served by archive.archlinux.org), so a package leaving the database
is the ecosystem's normal flow:

| Upstream event, as observed at revalidation or fetch | Class in `proxy-cache.md` |
|---|---|
| A package leaves the database in a new revision (a superseding build, routine on every sync) | **Ordinary metadata change**: the new revision serves; the cached file stays fetchable by clients holding the retained older revision, the file held by its own cached reference until LRU eviction and the revision's body and map by the declared list until the adoption that drops the revision; after that drop the file name answers `404`; no divergence is recorded |
| A new revision lists a different `%SHA256SUM%` or `%CSIZE%` for a file name already cached | **Immutability violation, revision-bound**, in the new-blob variant: recorded and alerted, no purge. A `%FILENAME%` carries no digest and pacman names no revision in the request, so the package route serves the bytes the **current** database names; the new bytes are fetched and verified as a new blob on the next request, and that commit ends the old blob's cached reference in the same transaction, so the sweep reclaims the old bytes, which no request can be served afterwards (`proxy-cache.md`'s resolved old-blob decision, was its Q20). Because pacman verifies against the record it was given (captured), a client still holding the older database fails that package until its next `pacman -Sy`, exactly as against the upstream, while every synced client installs |
| A package fails `%CSIZE%` or `%SHA256SUM%`, a body is truncated, or a signed upstream's database fails its signature | **Integrity failure at fetch**: nothing committed, no negative entry, the previous verified revision keeps serving, the operator is alerted, the next request tries again |
| A new revision's upstream `Last-Modified` is earlier than the current one's | **Regression not adopted**: recorded as a regression for the operator (above) |
| A package's signature does not verify against the remote's configured keys | Not a removal event: the verdict is recorded for policy with the key id in the operator record, and the package is served, since the client decides with its own keyring |

### Advisories, OSV and the security-signal rule

Nothing on this wire is a security signal: a record carries no advisory, deprecation or quarantine
field, and Arch removes superseded builds without saying why. OSV has no Arch or Manjaro ecosystem
(captured), so **the shared security-signal rule never fires for this format from either channel**.

Per the resolved advisory decision below, this format takes its coverage from
`supply-chain-policy.md`'s advisory sources, read from each source's ecosystem list, as
`homebrew.md` did: an advisory-dependent rule attached to an Arch repository is refused at
configuration, naming the missing coverage (that spec's coverage table, whose Arch row reads "as
CPAN", and its AC11); coordinate rules and signature-verdict rules bind today. That spec has since
widened its single OSV feed to one OSV schema from several sources (its resolved advisory-sources
decision, was Q9, AC21), and this is why Arch's own security tracker (2,444 `AVG-` records keyed by
package base, captured) still stays out: it publishes its own schema, not OSV's, so it is not a
source `policy.feed.sources` can declare. An OSV-schema export of it, if one appears, is declared
there with no code change, because the handler already reports each version's `%BASE%` as its
**advisory key** whenever it differs from `%NAME%`, in the metadata-store write that records the
version and on a proxied miss's fetch-and-cache request, and the core stores it on the `Version`
row outside every document (`supply-chain-policy.md`'s resolved advisory-key decision, was Q11,
AC24; `data-model.md` AC46): the tracker keys by package base (`"packages": ["vim"]`, captured),
so a split package's advisory names its base, never its own name. The key is inert while no
source covers Arch, and it is what makes the "no code change" true.
Detection is passive, per `proxy-cache.md`'s resolved signal-detection decision (was Q12). No Arch
mirror is preconfigured, per `proxy-cache.md` AC19's closed set.

### Virtual repositories

`hex.md` found virtual repositories impossible because every registry resource is signed under the
repository's own name, and `rpm.md` and `alpine.md` found them possible with re-signing. pacman is
their case, more simply: a database names neither the host nor the repository (its entries are
per-package records, and `%FILENAME%` is a bare name), and a package signature is detached and
checked against the keyring whichever database listed it. **A virtual pacman repository is
therefore possible with re-signing of the databases alone**, and per the resolved
virtual-repository decision below:

- **A virtual database is the merge of its members' databases of the same name and architecture.**
  For each database name and architecture any member holds (a remote's located through its layout
  template), the service generates `.db` and `.files` from the members' records and signs them with
  the virtual repository's key. Remote members contribute their adopted revisions only where a
  revision's database verified against the remote's configured keys (the resolved
  unsigned-member decision below, was Q13): a composed database the virtual signs admits a
  member's database only under a `verified` verdict (`signing-service.md`'s resolved pass-through
  decision, was Q17, AC36), and Arch's and Manjaro's official mirrors sign no database (live), so a
  remote over them contributes nothing to a virtual and the operator record says why. Remote
  members are re-merged when their revisions change. The merge is the generator's `Merge`, run as the deferred
  `index.merge` job on the shared runner: enqueued by a member's write with the virtual as coalesce
  key, by a remote member's adoption of a new revision inside the adoption transaction through the
  runtime's adoption hook (`signing-service.md`'s resolved remote-member decision, was Q16, AC35;
  `proxy-cache.md` AC25), at the virtual's creation and on every member-list change, never on a
  request's path; it creates no snapshot, the previous merged set serving until the new one commits
  and a failed merge leaving it in place with an alert (`signing-service.md`, "Virtual merges",
  AC19). A member's change therefore reaches the virtual within that spec's staleness bound, not
  inside the member's write, and each merge commit moves the virtual's pointer record forward, so
  a merged database's `Last-Modified` never goes back, the rule pacman's freshness needs
  (`signing-service.md`'s resolved virtual-freshness decision, was Q15, AC34).
- **A remote reached only through the virtual is kept fresh by the virtual's reads**, and a
  never-adopted one is fetched before any client asks. Serving a merged database whose input from a
  remote is past the remote's TTL enqueues one coalesced `proxy.revalidate` job that replays the
  remote's own routes below the authorizer, off the request's path (`proxy-cache.md`,
  "Revalidation outside the request", AC26). The profile declares the **member-input paths** of
  every document the `Merge` reads from a member, under the member's mount through its layout
  template, which registration refuses a merging profile without (`signing-service.md` AC35):
  `{layout}/{db}.db` and `{layout}/{db}.files`, each replayed with its `.sig` as the paired set
  the handler declares. A virtual's creation, or a member-list change adding a remote never
  adopted, replays them for every database name and architecture another member of the virtual
  already holds, so the virtual lists the remote's packages there with no request ever made to the
  remote's own URL. A database only the remote holds reaches the virtual once a direct client of
  the remote has caused its adoption; a read-driven first fetch for it is `signing-service.md`'s
  to add, reported by this pass.
- **Resolution is per package name, in member order**: the first member whose database holds any
  version of a name contributes every version of it, and later members' versions of that name are
  omitted, including a name a later member only `provides`. pacman already prefers the first
  section that lists a name (captured), so a client listing a private section before a public one
  is protected without a virtual; the virtual gives the same protection inside one section, one
  `Server` line and one credential.
- **Package bytes and package signatures are the members'**, served through the virtual route and
  their records unchanged, merged records keeping a remote's embedded `%PGPSIG%` as they carry it.
  A client of a virtual therefore trusts the virtual key (databases), each hosted member's key
  (their packages) and, for a remote member, the upstream's keyring.
- A publish or management operation against a virtual repository answers `405` with the
  `repository-type` problem.

The recommended client configuration is one section per database of the virtual repository, each
with one `Server` line on it in a root-only included file and `SigLevel = Required
DatabaseRequired`, and the keys above added and locally signed; with that configuration a refusal
holds with egress open (AC16). For content from Arch's or Manjaro's official mirrors, which no
virtual can list, the recipe places the private section before a section on the remote, where
pacman's first-section preference already keeps a private name from being taken from the mirror
(captured).

### Content negotiation and headers

There is none: pacman sends `Accept: */*` on every request (captured) and every route has one
representation. Databases, files documents and their signatures are served
`application/octet-stream` with `Cache-Control: no-cache`, the pointer-scoped `Last-Modified` and a
byte-derived `ETag`, through `ServeDocument` with these values carried in the generator's profile
(`signing-service.md` AC11). Packages are served through `ServeFile` with the CAS digest as a
strong `ETag` and `Cache-Control: public, max-age=31536000, immutable` in a package-level serve
policy, since a coordinate binds one set of bytes for the life of the repository (its resolved
handler-rendered decision, was Q14, AC32). A package's
`.sig` is served `no-cache` with a byte-derived `ETag`, not `immutable`: it is assembled from the
`Signature` record under the current key, so a key switch changes the bytes at the same URL, which a
shared cache holding an immutable copy would keep serving to clients that no longer trust the old
key. The aliases `{db}.db.tar.gz` and `{db}.files.tar.gz` serve the same bytes, headers and
signature as `{db}.db` and `{db}.files`.

### What it needs from Deps

The pinned `Deps` (`format-handler-interface.md`): the CAS, the metadata store at all three levels
with snapshot-pointer resolution, the fetch-and-cache entry point with classification as an
argument, the central authorizer, and the request logger, with the policy-enforcing resolution
calls returning the typed refusal. Beyond the pin, each now specified by its owner rather than
invented here: the `Verifier` consumer interface for the OpenPGP and record-integrity entries of
`artifact-verification.md` (in `Deps`, `format-handler-interface.md` AC15); `upstream.Options` on
fetch-and-cache for the adapter's allowlist and credential role (`upstream-adapters.md`); the
refusal writer `WriteRefusal` (`format-handler-interface.md` AC14); the `Documents` serving forms,
the claim declaration on the write transaction and the advisory key on the metadata-store write
and the fetch-and-cache request (`format-handler-interface.md` AC17); and, outside `Deps`, the
optional `Indexer` interface through which `signing-service.md`'s runtime generates, signs and
serves every database and package signature, rendering the pointer's freshness record from
`data-model.md` and, on a remote, the cache-scoped record from `proxy-cache.md`, so the handler
reads neither directly.

### Capabilities and lifecycle

`Capabilities()` declares proxy support `supported`, reference-implementation availability
`available` (a `repo-add -s` tree behind a pinned static server, below), `Virtual: supported` (the
section above) and `Rename: supported`, the four fields `format-handler-interface.md` AC13 names.
Rename is supported because nothing a pacman client reads names the repository: a database names
neither host nor repository and `%FILENAME%` is a bare name, and the key document is served under
the repository's URL but names no repository in its bytes, so a renamed repository serves
byte-identical databases, signatures and packages under its new URL with every `SigningKey`,
signature record and public form unchanged and no re-sign (`signing-service.md` AC29), while the old
name answers `not-found` indistinguishably from a never-existing repository (`repository-lifecycle.md`
AC12). `repository-lifecycle.md` AC12 requires `conformance/arch/rename_test.go`, enforced by the
harness's case-set validator (`conformance-harness.md` AC26); AC27 carries it with the real clients.

### Conformance, the clients and the corpus

The three pinned clients differ in ways the captures made concrete: 6.0.2 revalidates the database
signature with `If-Modified-Since` and so ignores a non-advancing rollback silently, while 7.1 fetches
it unconditionally and fails once; Arch's 7.1 cannot read root's `~/.netrc` under `DownloadUser`,
while 6.0.2 and Manjaro can; and the 2024 image's keyring no longer trusts current Arch packagers.
The catalogue counts one ecosystem; all three appear in the matrix's Client column under the Arch
row, Manjaro as a distinct distribution, and every hosted and proxied case runs on all three unless
it names a line-specific behaviour.

**Every case runs with the client's network restricted to this registry and its stand-ins**, which
the harness now holds for every case with no opt-out (`conformance-harness.md`'s resolved
client-confinement decision, was Q6, AC23). AC16's fallback half, which this spec first wrote as an
open-egress case, is expressed the same way: the second section's host and the second `Server`
line's mirror are declared stand-ins on the case network, reachable exactly as a public host would
be, and the stand-in's transcript is what proves no request reached it. Each case writes its own
`pacman.conf` with the image's `[options]` kept and its distribution sections removed, writes its
root-only server include and optional `~/.netrc` in its `script`, runs `pacman-key --init`, adds and
locally signs the keys it names, and installs the harness CA with `trust anchor`. Cases that follow
a publish or rollback run a plain `pacman -Sy`, never `-Syy`, because the time-conditioned refresh
is what the freshness rule exists for.

The recorded surface for the replay corpus: against geo.mirror.pkgbuild.com, `core.db` and
`core.files` with a conditional revalidation, the absent `core.db.sig`, one package and its `.sig`,
and a superseded package's `404`; against a Manjaro stable mirror, `core.db` and one package. The
reference implementation for the hosted side is a static tree built by `repo-add -s` in the pinned
7.1 image over packages signed with GnuPG, served by a pinned static server, so `Capabilities()`
declares reference-implementation availability `available`; the hosted half recorded against it is
a local reference, so it is a row of `conformance-harness.md`'s authoritative-reference exception
list (its AC28), with the Arch and Manjaro mirrors authoritative for the read half. The write
surface has no reference (no client publishes), the second row of that list, and its manifest
declares no write corpus. Recording gates on the harness's redaction criterion
(`conformance-harness.md` AC13), whose allowlist applies to every position, the `Authorization`
header and URL userinfo included; `User-Agent` is normalised per client. Deliberate divergences go on the exception list
before their flow is expected to replay: signatures on hosted databases where Arch serves none, the
signature bytes, the tar entry metadata, the `Last-Modified` and `Cache-Control` values, `405` on
remote writes and `409` on republish.

## Acceptance Criteria

- [ ] AC1: With the client network restricted to this registry and `SigLevel = Required
      DatabaseRequired` on the section, a hosted database publishing `swhello` that depends on
      `swdep` installs both with `pacman -Sy` then `pacman -S swhello` on pacman 7.1 (Arch), 6.0.2
      (Arch) and 7.1 (Manjaro), each holding only the repository's key, added and locally signed,
      through the one line `Server = https://{host}/arch/{repository}/$repo/os/$arch` with `$repo`
      and `$arch` substituted by the client; the transcript shows `{db}.db`, `{db}.db.sig`, then each package and its `.sig` under
      `{db}/os/x86_64/`, and the installed files equal the published package's.
- [ ] AC2: Every hosted `.db` and `.files` document has a detached binary signature with exactly one
      signature packet by the repository key and a SHA-256 or stronger digest, verifying on all
      three clients; under `DatabaseRequired` a signature that is absent, made by another key, made
      by an added but not locally signed key, or stale after the document changed is refused with
      the captured message and `pacman -Sy` exits non-zero; and under the shipped `Required
      DatabaseOptional` a `.db.sig` answered `403` is accepted as unsigned, the behaviour the
      operator documentation's recommended `SigLevel` exists to prevent; `pacman -Fy` fetches
      `{db}.files` and `{db}.files.sig` and resolves a file's owner on all three; and the aliases
      `{db}.db.tar.gz` and `{db}.files.tar.gz` serve the same bytes, headers and signatures.
- [ ] AC3: Every hosted package route serves bytes whose digest equals the published bytes, asserted
      for every hosted package in the suite, and its `.sig` route a detached signature with exactly
      one packet by the repository key over those bytes; a publish carrying a publisher `.sig`
      records the verifier's verdict (verified, untrusted or bad) in the version document, and a
      repository rule requiring a verified publisher signature refuses an unsigned or rogue-signed
      publish with no snapshot; a client holding only the repository key installs a package whose
      publisher signed with a key the client does not hold; the publisher verdict is taken through
      `Deps`' `Verifier` under the `openpgp` entry's `all` flag against the repository's trust set,
      a `.sig` carrying a second, untrusted packet recording a failed verdict; and the served
      package `.sig` is a `Signature` record keyed by the package's digest, present in no
      snapshot's content set.
- [ ] AC4: A publish regenerates and re-signs the affected `.db` and `.files` and signs each new
      package in exactly one snapshot that holds them all; after a plain `pacman -Sy` all three
      clients see the new package; two concurrent publishes into one database both appear in the
      resulting database; a publish to one database leaves another database's documents
      byte-identical; and repointing to the predecessor serves its documents byte-identical.
- [ ] AC5: After a publish and after a rollback through a pointer, a client of each of the three
      lines that synced before sees the pointer's current database on its next plain `pacman -Sy`,
      exit 0 with no signature error; every `Last-Modified` a pointer serves on a document and its
      signature is equal between the two and strictly later than any it served before for that
      document; a conditional request is answered `304` only for an exact `If-Modified-Since` or a
      matching `If-None-Match`; every such `Last-Modified` is the pointer's `moved_at` from
      `data-model.md`'s freshness record, served through `ServeDocument`, and stays forward-moving
      under an injected clock stepped backwards, with no handler package setting the header; and a
      client whose `.db` and `.db.sig` straddled a publish recovers on its next plain `pacman -Sy`
      with exit 0.
- [ ] AC6: The `desc` and `files` entries of every generated `.db` and `.files`, for every fixture
      database and architecture, equal field for field and in order what `repo-add` 7.1.0 in the
      pinned image writes for the same packages, `%BASE%`, `%DESC%` and `%ISIZE%` included, each
      `%FILENAME%` a bare canonical file name, with `%CSIZE%` equal to each served file's length
      and `%SHA256SUM%` to its digest; no generated database contains `%PGPSIG%` or `%MD5SUM%`; and
      the tar holds no entry other than the package directories and their `desc` and `files`.
- [ ] AC7: An `any` package published into a repository declaring `x86_64` and `aarch64` is listed in
      both architectures' databases and served from both paths as one blob, and installs on all
      three from `{db}/os/x86_64/`; an architecture with no packages serves a signed empty database
      that all three accept under `DatabaseRequired`; an architecture outside the declared set and a
      section named after no database answer `404`; and a package whose `arch` is outside the set is
      refused with `422`.
- [ ] AC8: A publish of three package files to one database creates exactly one snapshot; a file that
      is not a `.pkg.tar.zst` or `.pkg.tar.xz`, one without `.PKGINFO` or lacking `pkgname`,
      `pkgver` or `arch`, a version not of the form `[epoch:]pkgver-pkgrel`, a name outside makepkg's rule, a publisher `.sig` above 16 KiB, and a
      database name outside the grammar or equal to `options` are each refused with `422` and
      nothing committed; a republish of identical bytes creates no snapshot, its `Operation`
      completing with no snapshot reference and `unchanged: true`, while a batch of one identical
      and one new file commits the new one in one snapshot; different bytes at an existing
      coordinate and an architecture-specific build colliding with an `any` build of the same
      version are refused with `409`; a retired coordinate is refused with the `retired` problem
      (409) from the shared write path, including after the deleting snapshot was pruned, across
      a backwards repoint, when seeded as a `Retirement` record through `state`, and when the
      deletion commits between the publish's claim declaration and its commit; and the stored
      file name is canonical whatever the upload was called.
- [ ] AC9: Deleting a version through the management endpoint removes it from every database in one
      snapshot, after which all three clients fail to install it and its package and signature
      routes answer `404`; deleting a package retires every version and keeps the `Package` row;
      the handler declares exactly `publish`, `delete-version`, `delete-package` and `configure`,
      each driven by a `script` case; every management operation is refused with no snapshot for a
      principal lacking its action (`push` for publish, `delete` for deletions, the admin role for
      the architecture set and key rotation) and answers `405` with the `repository-type` problem
      against a remote or virtual repository; and the architecture set's effect is observed by a
      real client: with `x86_64` removed from the set, `{db}/os/x86_64/{db}.db` answers `404` and
      `pacman -Sy` fails on all three, and with it restored the next `pacman -Sy` succeeds and
      `pacman -S swhello` installs from a newly generated and signed database.
- [ ] AC10: No hosted or virtual signature is made by the handler: an architecture test proves the
      handler package holds no key and performs no signing; after a key announce the key document
      serves both keys and no signature changes; after the switch every current database, files
      document and package signature carries exactly one packet, by the new key, produced as one
      atomic batch of signature records that creates no snapshot, with no interleaved reader ever
      served a signature by a key the key document lacks, and a client holding and trusting both
      keys installs across the switch on all three with a plain `pacman -Sy`; a client holding only
      the old key is refused naming the new key as unknown; a rollback to a snapshot published
      before the switch serves its packages and databases signed by the new key; each phase is a
      `configure` operation on the signing-key routes refused to a non-admin principal; and no
      signature this registry serves ever carries two packets.
- [ ] AC11: `pacman -S SWHELLO` does not resolve `swhello` on any client; `swplus++` and
      `swepoch` (`1:2.0-1`) install through their raw request forms, including
      `swepoch-1:2.0-1-any.pkg.tar.zst` with its colon unencoded, and `%2B` and `%3A` requests for
      the same files answer the same bytes, a `+` never decoding to a space; `swrc-1.0rc1-1`
      installs; and `sw-2-tool-1.0-1-any.pkg.tar.zst` resolves by lookup to the right name and
      version.
- [ ] AC12: On a private repository over TLS, all three clients install with the `Server` line and
      its userinfo in a root-only included file, each request carrying Basic only after a `401` with
      `WWW-Authenticate: Basic`; 6.0.2 and Manjaro install with root's `~/.netrc` while Arch's 7.1
      with its shipped `DownloadUser` stops at `401`, as the operator documentation states; a
      credential-less request answers `401` identically for a private and a missing repository, a
      token lacking `pull` answers `404`, a rejected token answers `401` and is never served as
      anonymous; no hosted route answers a redirect; and no credential appears in logs, error
      bodies or metrics.
- [ ] AC13: A token holding `pull` patterned `swrepo/swhello/**` fails at `{db}.db` on all three,
      reads the key document (a descriptor, which passes the sentinel test with a sentinel name,
      version and digest seeded) and fetches an in-pattern package and its `.sig` by `curl` while
      refused an out-of-pattern one; a
      token holding `push` patterned the same way publishes `swhello` into `swrepo` and is refused
      publishing `swdep` or into another database with no snapshot created; and in proxied mode the
      patterned `pull` token is refused an out-of-pattern package.
- [ ] AC14: A package the shared policy layer refuses answers `403` through `WriteRefusal` with the
      `{"errors": [...]}` body naming the policy on its package and `.sig` routes on the hosted and
      the proxied path, while
      every database still answers `200` and still verifies; `pacman -S` exits 1 on all three with
      "The requested URL returned error: 403", the body present in the transcript, and no package of
      that transaction installed, one downloaded beside it included; and each refused package
      produces exactly one refusal record per attempt through a one-line configuration.
- [ ] AC15: A database route never answers a policy refusal: with a policy refusing every version of
      one package, `pacman -Sy` succeeds on all three and only that package's install fails.
- [ ] AC16: With one `Server` line per section, every section on this registry, a refused package
      fails on all three with no request for it reaching any host but this registry, and with a
      second section on a declared stand-in host listing the identical file it still fails with no
      request reaching that stand-in, asserted from the stand-in's transcript and at the network
      layer; and the operator documentation's statement that a second `Server` line re-opens
      fallback is proven by a case in which a second `Server` line on a declared stand-in mirror
      does.
- [ ] AC17: A remote repository over a stand-in mirror serving an unsigned database with embedded
      `%PGPSIG%`, as Arch's are, and packages signed by a fixture packager key, the remote's upstream
      keys configured as a fixture stand-in for an `archlinux-keyring` export, installs on all three
      holding that key only: every database, files document, package and signature served is the
      upstream's byte for byte, every package was verified against `%CSIZE%` and `%SHA256SUM%`
      before commit, each package's signature verdict against the configured keys recorded and
      readable through the management API, and a second install from a fresh container reaches
      this registry while the stand-in receives no package request.
- [ ] AC18: A stand-in whose package mismatches `%CSIZE%` or `%SHA256SUM%` or whose body is
      truncated, or which signs its database and serves a failing or foreign-key signature to a
      remote with keys configured, is never committed to the CAS; the previous verified revision
      keeps serving and installing; the real reason is recorded observably to the operator; and the
      next request fetches again.
- [ ] AC19: A proxied `.db` is revalidated after its TTL and not before, conditionally against
      `ETag` and `Last-Modified` stand-ins, a package published upstream becoming installable after
      the TTL and not before absent an explicit refresh; the database and its signature are always
      served from one revision, asserted under a stand-in that changes both between two requests;
      the pair is declared to the proxy layer as a paired set and committed in one transaction;
      packages and signatures are never revalidated; a path no cached revision names, `lastupdate`
      and `lastsync` included, answers `404` with no upstream request; an upstream `404` is
      negatively cached while a `429` or `5xx` is neither cached as absence nor surfaced as
      not-found.
- [ ] AC20: A remote serves a cache-scoped `Last-Modified` that moves forward on every adoption,
      never the upstream's, the same value on a database and its signature, and all three clients
      see each adopted revision on a plain `pacman -Sy`; a stand-in that serves an older revision
      with an earlier upstream `Last-Modified` is not adopted, the current revision keeps serving,
      and the regression is recorded for the operator; and after the operator's refresh of the
      remote the older revision is adopted with a `Last-Modified` later than any served before.
- [ ] AC21: A remote over a stand-in mirror root answering package requests with a cross-host `302`
      installs through a host on its artifact allowlist, refuses a host outside it with the host in
      the operator record, and forwards the upstream credential to the configured root host only,
      asserted at the network layer; and a remote configured with an `http://` root is refused at
      configuration unless overridden.
- [ ] AC22: A stand-in presenting each removal-table event produces this format's classification: a
      package leaving the database serves the new revision with no divergence recorded while a
      client holding the old revision still fetches it, including after a sweep run with the
      grace lapsed while that revision is retained and after the file's cached reference was
      evicted, and answers `404` once a further adoption has dropped the revision; a changed
      `%SHA256SUM%` for a cached file name records and alerts a divergence, a client that synced
      the new database installs the new bytes, and after the next sweep past grace the old blob
      is gone from the store with the divergence record naming both digests; a package signature
      failing the remote's keys is recorded as a verdict and served; as this format's side of the
      removal policy in `proxy-cache.md` (its AC13, AC27, AC28).
- [ ] AC23: A virtual repository over a hosted member and a remote over a stand-in whose databases
      are signed by a key in the remote's trust set serves, per database name and
      architecture, merged `.db` and `.files` signed by the virtual repository's key, from which a
      hosted `swhello` placed first shadows an upstream `swhello-9.0` so that no upstream version of
      that name is listed or fetched, asserted at the network layer; all three clients install a
      hosted and a proxied package in one transaction through one section and one `Server` line
      holding the virtual key, the hosted member's key and the fixture packager key; package bytes
      and signatures are the members'; a member's change re-merges and re-signs through the
      deferred `index.merge` job within the staleness bound, creating no snapshot, with no merge on
      a request's path and the previous merged set serving until the new one commits; and publish
      to the virtual answers `405` with the `repository-type` problem. A virtual created over a
      hosted member holding `swrepo` for `x86_64` and a remote never adopted, over a stand-in whose
      databases are signed by a key in the remote's trust set, fetches the remote's
      `swrepo.db` and `swrepo.files` with their signatures through its layout template at
      creation, all three clients then installing a package only the remote's upstream holds
      with no request ever made to the remote's own URL; the remote's adoption of a new database
      revision enqueues the merge in the adoption transaction and the change is installable
      through the virtual on a plain `pacman -Sy` within the staleness bound, the merged
      database's `Last-Modified` later than any the virtual served before; with the remote
      reached only through the virtual, a read of the merged database past the remote's TTL
      enqueues one `proxy.revalidate` job and is served the current merged set with no upstream
      request on its path (`proxy-cache.md` AC26, `signing-service.md` AC35); a second remote over
      an Arch-shaped stand-in serving an unsigned database, listed in the same virtual,
      contributes no package and its exclusion is in the operator record, while the same stand-in
      installs through that remote's own URL (`signing-service.md` AC36); and registration
      refuses an Arch profile whose `Merge` reads a member document with no member-input path
      declared.
- [ ] AC24: A policy rule depending on advisory data attached to an Arch repository is refused at
      configuration with the `validation` problem naming the missing coverage, while no configured
      advisory source lists an Arch ecosystem; coordinate rules and signature-verdict rules attach
      and refuse as configured on the hosted and the proxied path; and a split package whose
      `%BASE%` differs from its `%NAME%` is recorded with that base as its advisory key on its
      `Version` row, on the hosted and the proxied path, and in no metadata document, while a
      package whose base equals its name reports none.
- [ ] AC25: Replay-match passes against a corpus recorded from geo.mirror.pkgbuild.com, a Manjaro
      stable mirror and a pinned static server over a `repo-add -s` tree, covering the recorded
      surface named in Design (`core.db` and `core.files` with a conditional revalidation, the
      absent `core.db.sig`, a package and its signature, a superseded package), with the `Authorization` header and URL userinfo redacted; and in the
      recording session the stock Arch 7.1 image through a remote over the Arch mirror and the stock
      Manjaro image through a remote over the Manjaro mirror each install a package holding only
      their stock keyrings (`archlinux-keyring`, and Manjaro's own).
- [ ] AC26: A database whose `.db` and `.files` exceed the inline metadata threshold is stored as CAS
      blobs that survive a GC sweep while a retained snapshot names them and install afterwards on
      all three, and a proxied `.db` body and filename map above the threshold survive a sweep run
      with the grace lapsed while their revision is current or the retained one, a package only
      that revision names then installing on all three, and are collected by the first sweep past
      grace after the adoption that drops their revision.
- [ ] AC27: The handler's `Capabilities()` declares proxy `supported`, reference-implementation
      `available`, `Virtual: supported` and `Rename: supported`; a renamed hosted repository keeps
      its identity, its keys and its signature records and serves byte-identical databases,
      signatures, key document and packages under the new name with no re-sign, all three clients
      installing from the new `Server` URL in both modes with their existing token and keyring,
      while the old name answers `not-found` indistinguishably from a never-existing repository;
      and the case set carries `rename_test.go`.
- [ ] AC28: On a remote far over its quota holding database revisions, their signatures,
      filename maps and cached packages, an eviction pass ends cached references of packages and
      package signatures only: every cached `.db`, `.files`, signature and map is unchanged and
      served inside the TTL with no upstream request and the same `Last-Modified`,
      `cache_metadata_bytes{repository}` counts them and `cache_referenced_bytes{repository}`
      does not; every package is served through `ServeFile` with its CAS digest as a strong
      `ETag`, no handler package setting a validator; and all three clients then install from the
      remote, evicted packages re-fetched and verified.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/arch/hosted_install_test.go` (three pinned images, network-restricted client containers, distribution sections removed, repository key added and locally signed; transcript order asserted; installed file comparison) |
| AC2 | conformance + unit | `conformance/arch/db_signature_test.go` (absent, foreign, unsigned-trust and stale signatures under `DatabaseRequired`, and a `403` signature under the shipped default, on all three; captured messages and exit status asserted); `internal/format/arch/signature_shape_test.go` (one packet, key, digest algorithm of every generated signature) |
| AC3 | conformance + integration | `conformance/arch/package_signature_test.go` (install holding only the repository key a package the publisher signed with a key the client lacks); `internal/format/arch/bytes_unaltered_test.go` (published digest equals served digest for every fixture; `.sig` verified with the repository key and read from a `Signature` record absent from the snapshot; publisher verdicts through `Verifier`, the two-packet fixture failing under `all`, the per-format fixture shared with `artifact-verification.md` AC10's `internal/verify/openpgp/detached_test.go`; the policy rule requiring a verified publisher signature, snapshot count unchanged) |
| AC4 | conformance + integration | `conformance/arch/republish_test.go` (publish then plain `pacman -Sy` on all three); `internal/format/arch/snapshot_test.go` (snapshot count, two concurrent writers into one database, databases independent, repoint byte comparison) |
| AC5 | conformance + integration | `conformance/arch/rollback_test.go` (publish, then rollback through a pointer, each followed by a plain `pacman -Sy` on all three; a straddled `.db` and `.db.sig` via an injected publish between the two requests and the recovery); `internal/format/arch/freshness_test.go` (monotonic `Last-Modified` per pointer under an injected backwards clock, database and signature equal, `304` only on exact match or `ETag`, the value read from `moved_at`; the runtime halves are `signing-service.md` AC11's `internal/index/freshness_test.go` and `internal/format/freshness_boundary_test.go`) |
| AC6 | integration | `internal/format/arch/repoadd_oracle_test.go` (every fixture database generated, compared entry by entry with `repo-add` 7.1.0 run in the pinned image; no `%PGPSIG%` or `%MD5SUM%`; tar entry set) |
| AC7 | conformance + integration | `conformance/arch/any_arch_test.go` (two-architecture repository, install on all three, empty-architecture database accepted under `DatabaseRequired`); `internal/format/arch/arch_set_test.go` (one blob, out-of-set `404` and `422`, unknown section `404`) |
| AC8 | integration | `internal/format/arch/ingest_test.go` (unsupported compression, missing `.PKGINFO` fields, bad name, oversized publisher signature, bad and reserved database names, idempotent republish with the unchanged `Operation` and a mixed batch, different bytes, retired coordinate after pruning under an injected clock, across a backwards repoint and with a deletion committed between declaration and commit, a `state`-seeded `Retirement`, `any` collision, canonical renaming, three-file batch snapshot count; the central refusal itself is `management-api.md` AC12's `internal/manage/retirement_test.go`, the commit-time check `storage-and-gc.md` AC30's) |
| AC9 | conformance + integration | `conformance/arch/manage_test.go` (every declared kind driven from the `script`, `management-api.md` AC24 and `conformance-harness.md` AC26; delete version and package, then real installs and a `curl` of the package and signature routes; the architecture set changed without and then with `x86_64`, each followed by `pacman -Sy` on all three); `internal/format/arch/manage_auth_test.go` (declared kinds, action refusals with snapshot count unchanged, `configure` refused to non-admins, `405` `repository-type` on remote and virtual) |
| AC10 | architecture test + conformance | `internal/format/arch/arch_test.go` (no key, no signing in the handler package); `conformance/arch/key_rotation_test.go` (announce, switch and retire through the signing-key routes on all three with both-key and old-key-only keyrings; packet count of every served signature; a rollback across the switch); `internal/format/arch/rotation_test.go` (snapshot count unchanged by every phase; the profile's atomicity is `signing-service.md` AC7 and AC8's `internal/signing/rotation_profiles_test.go` and `rotation_atomic_test.go`) |
| AC11 | conformance + unit | `conformance/arch/names_test.go` (case, `++`, epoch, `rc` version, hyphen-digit name on all three); `internal/format/arch/path_decode_test.go` (`%2B`, `%3A`, `+` literal, lookup-not-split) |
| AC12 | conformance + integration | `conformance/arch/auth_test.go` (private repository over TLS; root-only include on all three, `~/.netrc` on 6.0.2 and Manjaro and its `401` on Arch 7.1; challenge header asserted; anonymous, `pull`-less and rejected tokens; no redirect status on any hosted route); `internal/auth/leak_test.go` (Basic material redaction for this format) |
| AC13 | conformance + unit | `conformance/arch/pattern_test.go` (the pattern-refusal case `auth.md` AC8 and `format-handler-interface.md` AC7 require, in both modes; patterned `pull` failure on all three, patterned `push` in and out of pattern); `internal/format/arch/scope_object_test.go` (the object table, per route, with the sentinel check on the key document through the shared helper in `internal/format/scope_test.go`, `format-handler-interface.md` AC12) |
| AC14 | conformance + integration | `conformance/arch/policy_test.go` (hosted and proxied modes; rules through the `policies` key; exit status, client text, transcript body, nothing installed, database `200` asserted); `internal/format/arch/refusal_record_test.go` (one record per refused package per attempt) |
| AC15 | conformance | `conformance/arch/policy_db_test.go` (a refusing rule, then `pacman -Sy` exit 0 on all three and only the refused install failing) |
| AC16 | conformance | `conformance/arch/no_fallback_test.go` (a second section on a declared stand-in host listing the identical file, and the two-`Server` variant on a declared stand-in mirror that falls back; the stand-ins declared through `upstreams` `hosts`, `conformance-harness.md` AC23; stand-in transcripts and network-layer assertions) |
| AC17 | conformance | `conformance/arch/proxied_install_test.go` (Arch-shaped stand-in mirror with an unsigned database and embedded `%PGPSIG%`; the packager key through the `trust` key; all three with the packager key only; byte comparison; verdicts read through the management API, counted for `artifact-verification.md` AC24's proxied case; network-level second-install assertion) |
| AC18 | integration | `internal/format/arch/proxied_integrity_test.go` (`%CSIZE%` and `%SHA256SUM%` mismatches, truncated body, failing and foreign database signatures with keys configured; CAS and reference assertions; previous revision still serving; operator record) |
| AC19 | conformance + integration | `conformance/arch/proxied_ttl_test.go` (mutating stand-in with `ETag` and `Last-Modified` variants, network-level counts); `internal/format/arch/proxied_pairing_test.go` (database and signature declared as a paired set and served from one revision under a stand-in changing both; the layer half is `proxy-cache.md` AC22's `internal/proxy/freshness_test.go`); `internal/format/arch/proxied_negative_test.go` (unknown paths, `lastupdate` and `lastsync` with no upstream request, `404`, `429` and `5xx`) |
| AC20 | conformance + integration | `conformance/arch/proxied_freshness_test.go` (adoptions seen by a plain `pacman -Sy` on all three); `internal/format/arch/proxied_regression_test.go` (older upstream `Last-Modified` not adopted, operator record, cache-scoped time monotonic under an injected clock and shared by the pair, adoption after a refresh) |
| AC21 | integration + conformance | `internal/format/arch/upstream_redirect_test.go` (allowlisted and refused redirect hosts, credential scope, `http://` root refused); `conformance/arch/proxied_redirect_test.go` (install through a cross-host `302`) |
| AC22 | integration | `internal/format/arch/removal_test.go` (stand-in presenting each event; a sweep on an injected clock with the grace lapsed between adoptions, the object store read after each; the retained revision's package evicted then fetched; the changed-`%SHA256SUM%` file served the current bytes and the old blob gone after the next sweep; the shared-layer half is `proxy-cache.md` AC13, AC27 and AC28's) |
| AC23 | conformance + integration | `conformance/arch/virtual_test.go` (shadowing with the network layer showing no upstream request for the shadowed name; mixed install on all three through one `Server` line; `405`); `internal/format/arch/index/merge_test.go` (the generator's `Merge`: per-name first member including `provides`, remote layout templates, member signatures untouched); `internal/format/arch/virtual_merge_test.go` (re-merge on member change and on remote adoption as the deferred job within the staleness bound, no snapshot, forward-moving `Last-Modified`, shared with `signing-service.md` AC19's `internal/index/virtual_merge_test.go` and AC35's `internal/index/virtual_remote_member_test.go`); `conformance/arch/virtual_remote_test.go` (a virtual created over a never-adopted remote on a signed stand-in, the stand-in's transcript showing only the member-input paths and the network layer no request to the remote's URL; an upstream change adopted and merged; the virtual-only remote's revalidation from a read past its TTL, shared with `proxy-cache.md` AC26's `internal/proxy/revalidate_job_test.go`; a second remote on an unsigned stand-in contributing nothing, with its operator record, and installing through its own URL, the rule itself `signing-service.md` AC36's `internal/index/passthrough_test.go`); `internal/format/arch/index/profile_test.go` (the declared member-input paths through a layout template, and a profile lacking one refused at registration) |
| AC24 | integration + conformance | `internal/format/arch/policy_config_test.go` (advisory rule refused naming coverage; coordinate and signature-verdict rules; a split package's `%BASE%` stored as the version's advisory key on hosted publish and proxied adoption and absent from the document, none reported where base equals name; the storage half is `data-model.md` AC46's and `supply-chain-policy.md` AC24's); `conformance/arch/coordinate_policy_test.go` (both paths) |
| AC25 | conformance | `conformance/arch/replay_test.go` (corpus replay); `conformance/arch/real_upstream_test.go` (recording session: stock Arch 7.1 and Manjaro images through remotes over their mirrors) |
| AC26 | integration | `internal/storage/metadata_root_test.go` (threshold crossing with a generated database and a proxied filename map, sweep, serve); `internal/format/arch/proxied_retention_gc_test.go` (the current and the retained revision's `.db` body and map declared on the remote's list, a sweep with the grace lapsed while retained, an install of a package only the retained revision names, both collected after the dropping adoption, a late map build discarded); `conformance/arch/large_db_test.go` (all three install after the sweep) |
| AC27 | unit + conformance | `internal/format/arch/capabilities_test.go` (the four declarations, `format-handler-interface.md` AC13); `conformance/arch/rename_test.go` (`repository-lifecycle.md` AC12, presence enforced by `conformance-harness.md` AC26; byte-identical databases, signatures and key document and installs on all three under the new name in both modes; the key half is `signing-service.md` AC29's `internal/signing/lifecycle_test.go`; the old name's `not-found`) |
| AC28 | integration + conformance | `internal/format/arch/proxied_metadata_test.go` (an eviction pass over a remote far over quota; databases, signatures and maps untouched and served inside TTL; both gauges read through `telemetry.NewTestRecorder`; the layer half is `proxy-cache.md` AC29's); `internal/format/arch/serve_file_test.go` (packages through `ServeFile`, the `ETag` the CAS digest; the boundary is `signing-service.md` AC11's `internal/format/freshness_boundary_test.go`); `conformance/arch/proxied_evict_test.go` (all three install after the pass) |

The case set needs only keys already in the harness's closed `setup` vocabulary (its resolved
closed-vocabulary decision, was Q4): `repositories` with their type, virtual member order, the
repository metadata document (the architecture set and a remote's layout template) and a `signing`
sub-entry (a fixture private key file or `generate`, `conformance-harness.md` AC24); `trust` for the
trusted publisher keys and a remote's upstream keys (`artifact-verification.md` AC25);
`credentials`; `upstreams` (a stand-in mirror in Arch and Manjaro layouts, unsigned and signed
variants, variants for mutation, regression, corruption, redirection and throttling, and the second
hosts AC16 declares); `state` for pre-published packages and seeded `Retirement` records; and
`policies` for AC3, AC14, AC15 and AC24, which Arch's `client-setting` row in
`supply-chain-policy.md` lets past the harness's pending-row rule (`conformance-harness.md` AC26).
The two obligations this spec once placed on the harness are met: a `state` entry for a hosted
package comes out with its databases generated and signed because the index runtime runs before
every commit, the seed write included, with no seed-side code (`signing-service.md` AC21,
`conformance-harness.md` AC24), and the case's `script` reads the repository's public key from the
server before the client runs; and a pacman case writes its own `pacman.conf` and server include,
initialises the keyring and adds and locally signs its keys, because a stock image trusts Arch's or
Manjaro's keyring and lists their mirrors, which the case owns rather than the harness. The runner-enforced obligations, both modes and the unauthenticated,
unauthorized and pattern-refusal cases in each, apply from the sibling specs and are not restated
per criterion.

## Implementation Phases

### Phase 1: Hosted reads and the signed databases
- Waits on `docs/internal/plans/foundation/signing-service.md` reaching `planned` (Blocking
  preconditions)
- The format-first mount, the fixed layout and architecture parsing, the generator package
  `internal/format/arch/index` behind `Indexer`, database, files, alias, signature and key routes
  through `ServeDocument` and the package route through `ServeFile`, each with `HEAD` and ranges,
  filename lookup and percent-decoding, the
  Basic challenge, seeded packages through `state` with generated databases and package signatures,
  the pointer-scoped `Last-Modified` and the `304` rule, the per-route addressed objects with the
  descriptor key document, the `403` rendering through `WriteRefusal`, and `Capabilities()` with the
  rename case (AC27)

### Phase 2: Publish and management
- Waits on `docs/internal/plans/foundation/management-api.md` reaching `planned` (Blocking
  preconditions)
- The `Operator` declaration: batch publish with its ingest rules and publisher-signature verdicts
  through `Verifier`, the architecture set, deletion with the core-held retirement, announce-then-switch
  rotation on the signing-key routes, the write-boundary declaration exercised under concurrency

### Phase 3: Proxied path
- Waits on `upstream-adapters.md` and `artifact-verification.md` reaching `planned` (Blocking
  preconditions)
- Paired database and signature revisions declared as a paired set with TTL, conditional
  revalidation, non-regression and the cache-scoped `Last-Modified`, the filename map with the
  current and one retained revision declared on the remote's blob-digest list, verified
  packages with recorded signature verdicts, database revisions outside the quota in
  `cache_metadata_bytes` (AC28), each version's `%BASE%` reported as its advisory key, negative
  caching, the removal classes, layout templates, `405` on remote writes

### Phase 4: Virtual repositories, corpus and gate
- The per-database, per-architecture merge with per-name shadowing as the `index.merge` job, the
  profile's member-input paths, re-merge on remote adoption and the virtual-only remote's
  revalidation (AC23), the recorded corpus against the
  Arch and Manjaro mirrors and the `repo-add` reference, all three clients in the matrix, the
  exception-list entries named in Design

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. The twelve questions this draft raised, and the thirteenth the format closing sweep
raised, were each written in the template's decision
shape and then adopted at their own recommendation under the owner's standing delegation of
2026-09-26, so the loop can continue; each is recorded below as adopted rather than decided,
folded through Scope, Design, the criteria and the Test Plan in the same pass, and reversible by the
owner at any time. `grep -rn "standing delegation"` is the owner's review queue.

### Resolved: how a repository relates to the databases clients name (was Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a repository holds any
number of databases, named at first publish, served per declared architecture in Arch's fixed
`{db}/os/{arch}` layout on hosted and virtual repositories; a remote keeps its upstream's layout and
declares a template for it (Design, "Databases, architectures and the layout"; AC7, AC8, AC23).

The question: pacman requests `{server}/{section}.db`, so the section name a client writes is a
file name this registry must serve, and Arch keeps several databases (`core`, `extra`,
`multilib`) under one mirror root.

**Recommendation:** A. One `Server` line with `$repo` and `$arch` then covers every database of a
repository, exactly as Arch's own mirror list does; a remote over a mirror root necessarily holds
many databases, so hosted and proxied repositories share a shape; and writes to different
databases never contend.

| Option | You get | It costs |
|---|---|---|
| **A. Many databases per repository, fixed Arch layout, templates for remotes** | One repository per product; Arch's own `Server` line; symmetric with remotes | A database name in every coordinate and addressed object; a template field on remotes |
| **B. One database per repository** | The simplest model | A repository per `core`/`extra`-style split, and remotes that cannot be one mirror root |
| **C. Free-form tree paths as `alpine.md` has** | Any layout a user likes | A layout per repository to document, and a template on hosted repositories too |

**Why this is yours:** it fixes the unit users create, grant and point clients at.

Accepted cost: the database segment in the addressed object, which also lets a patterned grant
confine a token to one database.

### Resolved: who signs packages on the hosted path (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the signing service signs
every hosted package with the repository's key as a detached `.sig`, the package bytes unaltered; a
publisher's own signature is verified at ingest as a policy verdict and not served (Design, "Two
trust layers"; AC3).

The question: pacman's shipped `Required` refuses any package without a trusted signature
(captured), and a `.sig` may carry only signatures the client can all verify (captured), so exactly
one party's signature can be served per package.

**Recommendation:** A. A detached signature changes no package byte, so the objection `rpm.md` and
`alpine.md` had to registry signing does not arise here; a client then trusts one key for both
layers, as a single-owner private pacman repository does today with `repo-add -s` and `makepkg
--sign`; publishers need no key distribution to every client; and a policy rule still gives an
operator the end-to-end publisher check at ingest.

| Option | You get | It costs |
|---|---|---|
| **A. Repository key signs every package; publisher verdict for policy** | One key per client; unsigned CI builds publishable; identical bytes | Clients trust the registry's attestation rather than the publisher's |
| **B. Serve the publisher's `.sig` verbatim; require one at publish** | End-to-end publisher signatures | Every client imports and locally signs every publisher key; unsigned builds cannot be published |
| **C. Serve both in one `.sig`** | Both attestations | Every client must hold both keys or every install fails (captured) |

**Why this is yours:** it decides whose signature a pacman user trusts through this registry.

Accepted cost: the publisher's signature is not visible to clients; the operator documentation
says so and names the policy rule that enforces it at ingest.

### Resolved: the database key, its algorithm and its distribution (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: one OpenPGP key per hosted
and virtual repository, RSA 4096 by default or Ed25519 on request, signing binary one-packet
detached signatures with SHA-256 or stronger, its public key served at
`/arch/{repository}/signing-key.asc` under the repository's ordinary read authorization (Design,
"What the signing and index service must provide"; AC2, AC10).

**Recommendation:** A. A per-repository key bounds a compromise to one repository, as `rpm.md` and
`alpine.md` found; both algorithms verified on every client line tried (captured); and keeping the
key route inside authorization preserves `auth.md` AC17's rule that a private repository is
indistinguishable from a missing one, at no cost, since pacman never fetches keys from a repository
and the operator's `curl` can carry the credential.

| Option | You get | It costs |
|---|---|---|
| **A. Per-repository key, RSA 4096 or Ed25519, no authorization carve-out** | Contained compromise; the existence rule intact | One key to add and locally sign per repository on every client |
| **B. One instance-wide key, served anonymously** | One key for every client | One compromise re-signs every repository |

**Why this is yours:** it trades a client-configuration step against compromise scope.

Accepted cost: the `pacman-key --add` and `--lsign-key` step in the operator documentation.

### Resolved: rotating the key (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: announce, then switch in one
write, then retire; no signature this registry serves ever carries two packets (Design, "What the
signing and index service must provide", item 6; AC10).

The question: apk and apt accept an index signed by an old and a new key during a window; pacman
refuses a signature file unless every packet verifies with a trusted key (captured in both orders on
all three).

**Recommendation:** A. It is the only rotation a client can survive: clients that trust both keys
cross the switch unnoticed, and the announce phase is the window in which operators distribute the
new key, as Arch itself does by shipping new keys in `archlinux-keyring` before they sign.

| Option | You get | It costs |
|---|---|---|
| **A. Announce, switch, retire** | Rotation invisible to prepared clients | An operator step during the announce phase; clients that miss it fail at the switch |
| **B. A dual-signature window** | Apk-style rotation | Every client missing either key fails for the whole window (captured) |
| **C. No rotation; replace the repository** | Nothing to specify | Every client reconfigured, and no response to a compromised key short of it |

**Why this is yours:** it sets how much operator coordination a key change demands.

Accepted cost: the switch re-signs every package of the repository in one write, bounded by the
repository's size.

**Revised 2026-09-28 by reconciliation, not re-decided here.** `signing-service.md` built this
decision as its `announce-switch-retire` rotation profile and, by its resolved signature-placement
and rotation decisions (was Q2 and Q11 there), placed signatures in records outside snapshot
content, so the switch is **one atomic batch of signature records and creates no snapshot**, rather
than a write; the cost is unchanged in size (every currently served database, files document and
package re-signed) and bounded the same way.

### Resolved: rendering a package policy refusal (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: `403` with the `{"errors":
[...]}` body on the package and its `.sig` route, databases unchanged (Design, "Policy refusals on
the wire"; AC14, AC15, AC16).

**Recommendation:** A. It is the cross-format rendering; a refused package never falls back to
another section (captured), so the refusal holds under the recommended configuration; and refusing
a database fails every sync of the repository (captured), while removing the package from the
database would re-sign databases on every policy change and differ per caller.

| Option | You get | It costs |
|---|---|---|
| **A. `403` on the package route, databases unchanged** | One rendering; enforcement without touching signed documents | A bare "returned error: 403"; the reason reaches the operator, not the user |
| **B. Remove refused packages from the database** | The resolver never sees them | Per-policy regeneration, databases differing by caller, impossible for verbatim proxied databases |
| **C. Refuse the database** | A loud failure | Every package of the repository becomes uninstallable (captured) |

**Why this is yours:** it trades a terse client message against enforcement that cannot be
side-stepped.

Accepted cost: the operator documentation explains the message and the atomic transaction.

### Resolved: making a rollback reach pacman (was Q6)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a pointer-scoped
`Last-Modified` that moves forward on every transition, shared by a document and its signature,
with `304` only on an exact match (Design, "Pointers, rollback and freshness"; AC5).

**Recommendation:** A. Nothing in a database orders generations but `Last-Modified`, and a
non-advancing time fails 7.1's next sync and hides the change from 6.0.2 forever (captured), while a
forward-moving one made all three adopt a rollback cleanly (captured); it is `cpan.md`'s resolved
freshness decision, and exact matching is what Arch's own mirrors do (live).

| Option | You get | It costs |
|---|---|---|
| **A. Pointer-scoped, forward-moving, shared with the signature** | Rollbacks and promotions reach every client on its next sync | A freshness record per pointer |
| **B. Serve each snapshot's generation time** | Headers derivable from content | A rollback fails 7.1 once and never reaches 6.0.2 (captured) |
| **C. Send no `Last-Modified`** | Nothing to track | Every sync of every client downloads every database whole (captured) |

**Why this is yours:** it decides whether a rollback is a real operation for pacman users.

Accepted cost: a promoted environment's headers differ from its source's while the bodies match.

**Revised 2026-09-28 by reconciliation, not re-decided here.** The freshness record this decision
put on the pointer is now `data-model.md`'s per-pointer record (`moved_at` and a generation
counter, AC36), which names this spec among the seven formats that found it, and the rendering is
`signing-service.md`'s `ServeDocument` (AC11, AC27), which states this spec's two rules (a document
and its signature share one `Last-Modified`; `moved_at` is forward-moving even when the clock is
not). The handler holds no freshness state; the behaviour asserted by AC5 is unchanged.

### Resolved: what a proxied repository serves (was Q7)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: upstream databases, packages
and signatures are served verbatim, a database adopted together with its signature, verified where
the upstream signs and keys are configured (Design, "The proxied path"; AC17, AC18, AC19).

**Recommendation:** A. Arch and Manjaro publish unsigned databases (live), so re-signing would
invent a trust layer the upstream does not have and force every client to add this registry's key
for distribution content, while verbatim serving keeps stock keyrings working (captured) and the
packages keep their packager signatures, which every client checks itself.

| Option | You get | It costs |
|---|---|---|
| **A. Verbatim, paired, verified where possible** | Stock keyrings; no regeneration of 51 MB files documents | Proxied databases unsigned when the upstream's are |
| **B. Regenerate and re-sign under the remote's key** | `DatabaseRequired` possible for distribution content | Every client adds this registry's key, and every revision is regenerated |

**Why this is yours:** it decides whose key an Arch user trusts through this registry.

Accepted cost: the recommended `DatabaseRequired` applies to hosted and virtual sections; a section
on a remote of an unsigned upstream keeps the distribution's own `DatabaseOptional`, which the
operator documentation states.

### Resolved: an upstream regression on a remote (was Q8)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a revision whose upstream
`Last-Modified` is earlier than the current one's is not adopted, and a remote serves its own
cache-scoped, forward-moving `Last-Modified` (Design, "The proxied path"; AC20).

**Recommendation:** A. Arch's mirrors are independent operators that lag one another, and a remote
following a regression would hand its clients exactly the rollback failure captured above; not
adopting it, and serving the adoption time rather than the upstream's, is `homebrew.md`'s resolved
answer to the same hazard.

| Option | You get | It costs |
|---|---|---|
| **A. Never adopt an older upstream time; cache-scoped `Last-Modified`** | Clients never see a regression or a paired-revision failure | A deliberate upstream rollback is not followed until its time moves forward |
| **B. Adopt whatever the upstream serves** | Lock-step with the upstream | Mirror lag reaches clients as the captured failure |

**Why this is yours:** it decides whether a cache may disagree with its upstream.

Accepted cost: the operator record of refused regressions.

**Revised 2026-09-28 by reconciliation, not re-decided here.** `proxy-cache.md` now owns both halves
for every format and cites this one: the cache-scoped `adopted_at` record and the paired set of a
database and its signature ("Freshness of what a remote serves", AC22), and the "Regression not
adopted" class of its removal table. An upstream that legitimately rolls back reaches clients through
the operator's refresh of the remote after the divergence is read (`management-api.md` AC29).

### Resolved: virtual pacman repositories (was Q9)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a virtual database is the
per-name, per-architecture merge of its members' databases with per-name first-member resolution,
`provides` included, generated and signed with the virtual repository's key; package bytes and
signatures stay the members' (Design, "Virtual repositories"; AC23).

**Recommendation:** A. Nothing in a database names its host or repository and package signatures are
detached, so re-signing the merged databases is all a virtual needs; shadowing inside one section
matches what pacman's section order already gives across sections (captured).

| Option | You get | It costs |
|---|---|---|
| **A. Merged databases re-signed; members' package signatures** | One `Server` line and credential; shadowing | Clients trust the virtual key plus members' package keys |
| **B. Also re-sign every package with the virtual key** | One key for everything | A signature per upstream package per virtual (15,000 for `extra`, live), and the registry attesting distribution packages |
| **C. No virtual repositories** | Nothing to build | Several sections and credentials per client |

**Why this is yours:** it sets how many keys a virtual's client holds.

Accepted cost: the key list in the operator documentation's virtual recipe. `signing-service.md`
runs the merge as the deferred, coalesced `index.merge` job with a staleness bound (its "Virtual
merges", AC19), so a member's change reaches the virtual within that bound rather than inside the
member's write, and the handler's `Capabilities()` declares the choice as `Virtual: supported`
(`format-handler-interface.md` AC13). A remote member's re-merge is that spec's adoption hook (its
resolved remote-member decision, was Q16, AC35), with the member-input paths this profile declares
feeding a never-adopted remote (AC23); which remote members can contribute at all is the resolved
unsigned-member decision below (was Q13).

### Resolved: the write boundary of a multi-package publish (was Q10)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: one publish carries one or
more packages for one database and is one write with one regeneration (Design, "The hosted publish
path"; AC8).

**Recommendation:** A. A split `PKGBUILD` produces several packages that depend on one another, a
regeneration is proportional to the database rather than the change, and a half-published set
visible between two snapshots is a resolution failure a client can hit.

| Option | You get | It costs |
|---|---|---|
| **A. Batch publish, one write** | Atomic releases; one regeneration | A larger request, bounded by the spool |
| **B. One package per write** | The simplest API | A regeneration and a snapshot per package, and partial releases visible |

**Why this is yours:** it fixes a management-API shape that `management-api.md` inherits.

Accepted cost: recorded for `management-api.md`, whose reconciliation table now carries it: a
batch publish is one `publish` operation and one write, authorized only if every object it adds is
in pattern (its "The operation vocabulary", AC4, AC5).

### Resolved: advisory coverage (was Q11)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: follow
`supply-chain-policy.md`'s single OSV feed with coverage read from the feed's ecosystem list, so
advisory rules are refused for Arch today (Design, "Advisories, OSV and the security-signal rule";
AC24).

**Recommendation:** A. OSV has no Arch ecosystem (captured), and Arch's tracker publishes its own
schema; adding a second feed is `supply-chain-policy.md`'s decision, as `homebrew.md` found for the
same situation.

| Option | You get | It costs |
|---|---|---|
| **A. OSV only, data-driven coverage** | One feed; coverage arrives if OSV adds Arch | No advisory rules for Arch today |
| **B. Ingest the Arch security tracker here** | Advisory rules today | A second feed the policy spec rejected, keyed by package base |

**Why this is yours:** it leaves Arch users without advisory enforcement until a feed exists.

Accepted cost: the sibling consequence for `supply-chain-policy.md`.

**Revised 2026-09-28 by reconciliation, not re-decided here.** `supply-chain-policy.md` answered the
consequence: its resolved advisory-sources decision (was Q9 there) replaced the single OSV feed with
one OSV schema from several declared sources, and its coverage table records Arch as uncovered
"as CPAN". Coverage is still read from the sources' own ecosystem lists, so this adoption's effect
stands; what changed is the reason the Arch tracker stays out, which is now its schema rather than
the number of feeds: an OSV-schema export of it would be declared through `policy.feed.sources`
with no code change (Design, "Advisories, OSV and the security-signal rule"; AC24). The "no code
change" holds because the handler reports each version's `%BASE%` as its advisory key, the channel
`supply-chain-policy.md`'s resolved advisory-key decision (was Q11, AC24) settled after this record,
which closes the question of how the core would learn a package base it never parses.

### Resolved: the recommended client recipe and preconfigured mirrors (was Q12)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the operator documentation
recommends one section per database, `SigLevel = Required DatabaseRequired` on hosted and virtual
sections, one `Server` line with userinfo in a root-only file included from `pacman.conf`, and the
repository key added and locally signed; `~/.netrc` is documented as working only where
`DownloadUser` is unset; no Arch or Manjaro mirror is preconfigured (Design, "How the clients
decide", "Authentication"; AC2, AC12, AC16).

**Recommendation:** A. The root-only include is the one credential form that worked on all three
clients (captured); `DatabaseRequired` closes the silent downgrade the shipped default allows
(captured); one `Server` line is what makes a refusal hold (captured); and `proxy-cache.md` AC19
fixes the preconfigured set without Arch.

| Option | You get | It costs |
|---|---|---|
| **A. Root-only include, `DatabaseRequired`, one `Server` line, no preconfigured mirror** | A recipe that works on every captured client and holds refusals | A configuration step for every user; the password printed by `pacman-conf` |
| **B. `~/.netrc`, shipped `SigLevel`, a preconfigured Arch mirror** | Less configuration | Fails on Arch 7.1; a refused signature silently accepted; a preconfigured set `proxy-cache.md` does not allow |

**Why this is yours:** it sets the recipe every pacman user copies.

Accepted cost: proxied cases run against stand-ins; the real mirrors are exercised by the
recording session.

### Resolved: what an Arch virtual composes from an unsigned remote database (was Q13, raised and adopted 2026-09-28)

**Adopted 2026-09-28 under the owner's standing delegation**, in the format closing sweep, on
Opus. Option A: a virtual composes a remote member's database only when that revision's
database verified against the remote's configured keys, so a remote over Arch's or Manjaro's
official mirrors, which sign no database, contributes nothing to a virtual, with an operator
record; content from those mirrors reaches a client through a second section on the remote, after
the private one (Design, "Virtual repositories"; AC23).

The question: `signing-service.md`'s resolved pass-through decision (was Q17, AC36) admits a
member's document into a body the virtual signs only under a `verified` verdict. This format's
virtual signs its merged `.db` and `.files` with the virtual's key, and the upstreams it most
often proxies sign no database (live: Arch and Manjaro), so their revisions carry the verdict
`absent`, and the virtual this spec designed around a hosted member in front of Arch's mirror
cannot list the mirror's packages. Each package carries its own `%PGPSIG%` the client checks
against its keyring, which a record-level rule could use, but no foundation spec has one.

**Recommendation:** A, because it is the rule the foundation settled for every signed merge, and
the protection a virtual adds here is small: pacman already prefers the first section that lists
a name (captured), so a private section placed first closes dependency confusion without a
virtual, and the one-section convenience is not worth the registry's signature over records
fetched on TLS alone.

| Option | You get | It costs |
|---|---|---|
| **A. Verified databases only; unsigned upstreams contribute nothing** | The virtual's signature covers only checked content; no foundation change | No one-section virtual over Arch's or Manjaro's official mirrors; those users configure two sections |
| **B. Admit a record whose package signature verifies against the remote's keys** | One-section virtuals over official Arch mirrors, each record backed by the packager's signature the client also checks | A record-level admission rule `signing-service.md` does not have, and the virtual's database signature still vouches for `%CSIZE%` and `%SHA256SUM%` values nobody signed |
| **C. Re-sign unverified databases** | One key for clients | The registry's signature over bytes it could not verify, which that spec's boundary forbids |

**Why this is yours:** it removes a capability this spec's virtual-repository decision (was Q9)
promised for the commonest Arch upstream, to keep the produce/verify boundary intact.

Accepted cost: an Arch virtual lists hosted members and signed upstreams only, and the operator
documentation's recipe for Arch's official mirrors is a second section. B is reported to
`signing-service.md` as a possible per-profile record-level admission rule, which would restore
the one-section virtual if adopted there; C lost to the boundary.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | 2867914 | authoring pass: grounded first draft, not a review | Grounded four ways: captured traffic from pacman 7.1.0 (Arch Linux, with `DownloadUser`), pacman 6.0.2 (Arch base image of 2024-01-01) and pacman 7.1.0 (Manjaro, no `DownloadUser`), images pinned by digest, against a logging, rule-injecting stub on a dedicated `--internal` Podman network serving repositories built with the 7.1 image's own makepkg, `repo-add` 7.1.0 and GnuPG 2.4.9, plus `repo-add` 6.0.2 for comparison (request sequence and headers, `.db` then `.db.sig` then packages then `.sig`s, the shipped `Required DatabaseOptional` accepting an absent or `403` database signature while a present one must verify, every packet of a two-signature file required in either order, added-but-unsigned keys as unknown trust, embedded `%PGPSIG%` verified while the detached `.sig` must still exist, `%SHA256SUM%` and `%CSIZE%` enforced, rollback under five `Last-Modified` and conditional-request policies with 7.1 failing once on an unconditional `.db.sig` and 6.0.2 silently keeping the newer database, no reason phrase or body printed and an atomic transaction, mirror fallback within a section and none across sections, a refused database failing the whole command, first section winning over a higher version, credentials only after a `401` challenge, root's `~/.netrc` unread under Arch 7.1's `DownloadUser` and a root-only included `Server` line working on all three, cross-host redirects dropping credentials, TLS through `trust anchor`, raw `+` and `:`, case sensitivity, empty databases); `pacman.conf(5)`, `repo-add(8)`, NEWS and the libalpm sources at v7.1.0 and v6.0.2; the live geo.mirror.pkgbuild.com and a Manjaro mirror (unsigned databases, embedded signatures equal to detached ones, nginx exact-match `304`s, superseded builds removed, compression census, real downloads with stock keyrings); and OSV (no Arch ecosystem) with Arch's own AVG tracker. Twelve questions written in decision shape and adopted under the standing delegation: many databases in Arch's fixed layout (AC7, AC8, AC23), repository-signed detached package signatures with publisher verdicts for policy (AC3), a per-repository RSA 4096 or Ed25519 key (AC2, AC10), announce-then-switch rotation with no dual signatures (AC10), `403` package-level refusals (AC14, AC15, AC16), pointer-scoped forward-moving `Last-Modified` (AC5), verbatim paired proxied revisions (AC17, AC18, AC19), non-regression with a cache-scoped `Last-Modified` (AC20), merged and re-signed virtual databases (AC23), batch publish as one write (AC8), OSV-only advisory coverage (AC24), and the root-only include with `DatabaseRequired` as the client recipe (AC2, AC12, AC16). Twenty-six criteria, each with a Test Plan row. Stays draft; awaits an independent review. |
| 2026-09-28 | 15ced69 | cross-spec reconciliation of the foundation wave, on Opus. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` naming this file verified against the current text of its source spec before applying. From `signing-service.md` (items 9 and 11, consequences Open item 32): `Indexer` and generator package `internal/format/arch/index`, pre-commit dispatch, per-document lock, package signing by `SignBlob`, signatures as `Signature` records keyed by body digest rather than `File`s (the package `.sig` served `no-cache` because a switch changes it), rotation as the `announce-switch-retire` profile, one atomic batch with no snapshot (item 6 reworded, AC10, the rotation record revised), freshness from `data-model.md`'s `moved_at` through `ServeDocument` (the freshness record revised, AC5), the virtual merge as the `index.merge` job (AC23, the virtual record revised); the eight-item list mapped onto the contract. From `management-api.md`: kinds `publish`, `delete-version`, `delete-package`, `configure` with key phases on the signing-key routes, core-held retirement refused with `retired` (AC8, AC9), `405` as `repository-type`, the batch-publish record discharged. From `auth.md` was Q23: the key document is a descriptor (AC13); the `pacman` client-table row is still absent there (reported). From `artifact-verification.md`: the `openpgp` detached entry with the `all` flag and the integrity entries (AC10, AC18, AC21, AC24, AC25), verdicts through `Verifier` (AC3, AC17). From `upstream-adapters.md` item 12 and `proxy-cache.md` (reconciliation 10, AC22, event classes): the `https` adapter's allowlist, root-only `basic` credential and `http://` refusal, the paired set and cache-scoped `adopted_at`, removal rows named by class, regression-not-adopted cited (the regression record revised). From `supply-chain-policy.md` (was Q9, was Q10, reconciliation 10, binding table): the Arch tracker stays out because of its schema, not the feed count (the advisory record revised, AC24), `WriteRefusal` with the `client-setting` row re-asserted (AC14). From `conformance-harness.md` (reconciliation 4, was Q6, AC23, AC24, AC26): the seed-path obligation met, `signing` sub-entry and `trust` key, AC16's open-egress half re-expressed with declared stand-ins because the harness confines every client. From `repository-lifecycle.md` AC12 and `signing-service.md` AC29: Capabilities and lifecycle section, new AC27. Twenty-seven criteria, each with a Test Plan row; no question adopted, `fable_recheck` kept. `node scripts/check-spec.js` reports no failure in this file. Stays draft; awaits an independent review. |
| 2026-09-28 | 93982ba | data-loss fix on Opus (storage-and-gc closing-sweep item 0): cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Applied item 0 of "From the storage-and-gc.md closing sweep" in `agents/spec-loop/consequences.md`, verified against `storage-and-gc.md`'s fourth mark root (its third reach, AC16) and `data-model.md` AC34, AC36 and AC45: a digest a document merely mentions keeps nothing alive, the declared blob-digest list is a document's only keep-alive, and a remote writes no content snapshot. The holes: the remote's retained revisions and per-revision filename maps, stored as CAS-backed metadata on the remote's document, were named only in its body, and the changed-`%SHA256SUM%` row kept the old blob "for older revisions" through nothing the sweep follows and through a route that cannot tell which database pacman holds (`%FILENAME%` carries no digest). Now: one superseded revision retained per database and architecture, its `.db` body and map on the remote's declared blob-digest list, dropped by the adoption that pushes the revision out, a late map build discarded (proxy-cache was-Q19, AC27, chosen over a cached reference for the same reasons as `alpine.md`); cached packages and signatures held by their own cached references; the changed-record row serving the current database's bytes with the new commit ending the old blob's reference (proxy-cache was-Q20, AC28). AC22 and AC26 extended so each fails if a retained body or map is collected; Test Plan rows (`internal/format/arch/proxied_retention_gc_test.go` added) and Phase 3 updated. The hosted path is unchanged. No new question adopted here; `fable_recheck` extended for the folded decisions. `node scripts/check-spec.js`: zero failures on this file. Stays draft. |
| 2026-09-28 | f8ad8b2 | format closing sweep on Opus. Not a review | Not a review. Every still-open item in `agents/spec-loop/consequences.md` targeting this file, from every section, verified against the current text of its source spec and of this file. Applied: foundation-leftovers item 2 and `signing-service.md` AC35 (member-input paths `{layout}/{db}.db` and `.files` with their signatures, replayed for every database and architecture another member holds; a database only the remote holds reported as a gap), signing-service closing-sweep item 6 and proxy-cache closing-sweep item 6 (remote adoption re-merges, was-Q16, AC35; the virtual-only remote's revalidation, `proxy-cache.md` AC26; the virtual's forward-moving `Last-Modified`, was-Q15, AC34; item 8, the Q9 record, AC23 and its row); management-surfaces item 14 (the architecture-set `configure` observed by a real client: `pacman -Sy` fails with the client's architecture removed, from the captured 404-fails-the-sync behaviour, and succeeds after it is restored; AC9 and its row); supply-chain closing-sweep item 3 as it reaches this spec (`%BASE%` reported as the version's advisory key, supply-chain was-Q11, AC24, so the 'no code change' claim for a future Arch source holds; AC24, its row and the Q11 record); auth closing-sweep item 3 (the stale 'no pacman row yet' wording removed); eviction settlement (database revisions outside the quota, was-Q21; the repository-level declared list confirmed under was-Q22; new AC28); `signing-service.md` was-Q14 (packages through `ServeFile`) and was-Q12 (the exact conditional rule cited); management-api closing-sweep item 5 (claims at declaration and again at commit, was-Q14; declared unchanged publish, was-Q15; AC8 and its row). Q13 raised and adopted: `signing-service.md` AC36 admits a member's database into a signed merge only under `verified`, and Arch's and Manjaro's official mirrors sign no database, so the virtual this spec designed over them could list nothing from them; unsigned upstreams now contribute nothing, with a two-section recipe, and a record-level rule is reported to that spec. Data-loss wave 1 confirmed intact (AC22, AC26). The hosted half is recorded against a local `repo-add -s` tree with no exception-list row yet; both arch rows reported. Skipped: nothing. `fable_recheck` extended. 28 criteria, each with a Test Plan row. Stays draft. |
