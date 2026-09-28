---
status: draft
status_description: "Authored 2026-09-26 as a grounded first draft: the hackage-security repository contract captured from cabal-install 3.16.1.0 and 3.8.1.0 and Stack 3.11.1 and 2.9.1, each in the upstream haskell image pinned by digest, on dedicated Podman networks against a logging stub (HTTP, TLS and a second instance as a signed mirror) serving repositories built and signed with hackage-repo-tool 0.1.1.5 and crafted generations (incremental and rebased indexes, two gzip schemes, rolled-back and re-signed metadata, expired metadata, rotated online and root keys, revisions, preferred-versions, a signed mirror list); cabal upload with tokens and passwords; checked against the hackage-security, cabal-install, hackage-server and Stack sources and docs, the live hackage.haskell.org (TUF metadata, index, headers, upload challenges, a byte-for-byte pass-through that cabal and Stack verified with Hackage's own keys, and Stack 2.9.1's pre-rotation keys failing against the live root), OSV and purl. Fifteen questions written in decision shape and adopted under the owner's standing delegation; none open. Awaits a /spec review pass."
description: "Spec for Hackage (Haskell) repositories served to cabal-install and Stack through hackage-security: the only catalogue format with The Update Framework, so hosted and virtual repositories get root, snapshot, timestamp and mirrors metadata from the shared signing service with per-pointer version counters that make a rollback reach clients instead of failing them, an append-only 01-index.tar.gz built as appended gzip members so incremental Range updates survive every publish, uploads through cabal upload --publish, revisions, preferred-versions deprecation and rebasing deletion as registry-owned operations, a byte-for-byte proxied cache that never re-signs Hackage's metadata, and re-signed virtual repositories."
author: michielvha
goal: "Serve Haskell users a private Hackage and a verified cache of hackage.haskell.org that stock cabal-install (3.16 and 3.8) and Stack (3.11 and 2.9) update, verify end to end against root keys they hold, and install from, with a rollback that reaches every client and no refusal a signed mirror list can route around."
priority: "low"
issue: 37
created: 2026-09-26
covers:
  - "internal/format/hackage/**"
  - "conformance/hackage/**"
fable_recheck: "authored on Opus 2026-09-27 while Fable was out of monthly credit; grounded in captured client traffic, but the design judgement was never Fable-reviewed"
---

# Plan: Hackage (hackage-security repositories)

The Hackage repository format as hackage-security defines it, hosted, proxied and virtual, on one
handler: The Update Framework (TUF) metadata `root.json`, `timestamp.json`, `snapshot.json` and
`mirrors.json`, the append-only package index `01-index.tar.gz` with its incremental `Range`
updates, package tarballs verified against the index, and upload through `cabal upload --publish`.
The oracles are cabal-install 3.16.1.0 and 3.8.1.0 and Stack 3.11.1 and 2.9.1.

## Context

Hackage sits in Tier 3 of `formats/catalogue.md` as the single-ecosystem family "Hackage" (the row
"Hackage (Haskell)"). **Its build is gated by `project-charter.md` AC9 and `catalogue.md` AC5**: no
handler code for a Tier 3 ecosystem exists before every Tier 1 format has met its definition of
done and the owner has recorded a `continue` verdict at the charter's build step 8, and Tier 3
handlers are built at step 11. This spec exists now because the owner directed on 2026-09-26 that
all 33 ecosystems be specced up front (the catalogue's "Every ecosystem below is specced now; only
building is gated"), so the gate decides what is built and never what is written; a `shrink`
verdict parks it. The shared signing and index service this format depends on is the first item
of the charter's step 7, so it exists before this handler whatever the verdict.

Grounding for this draft, stated up front because the constitution asks for evidence or silence:

- **Captured client traffic.** `which cabal ghcup stack` finds none of them on this host, so every
  client ran from the upstream `haskell` image pinned by digest, `linux/amd64`:
  `docker.io/library/haskell@sha256:6c7ba1aeae633b302ca46ffdc97cca70a498f0bd14ed9162ef50eae3d4eb907a`
  (tag `9.14.1-bookworm`: cabal-install 3.16.1.0, Stack 3.11.1, GHC 9.14.1) and
  `docker.io/library/haskell@sha256:3fa8506447e892ba21664d9e7bfd25b67589e4975aa041eef7e226722dde43e1`
  (tag `8.10.7`: cabal-install 3.8.1.0, Stack 2.9.1, GHC 8.10.7, Debian 10). Both cabal lines
  select their `curl` transport ("Selected http transport implementation: curl", captured). The
  repositories were built and signed with **hackage-repo-tool 0.1.1.5**, hackage-security's own
  repository tool, compiled from the live Hackage by the pinned cabal 3.16.1.0: `create-keys`
  (ed25519: three root keys, three target keys, three mirrors keys, one timestamp key, one snapshot
  key), `bootstrap`, `update`, `create-root`, `create-mirrors` and `sign`. Further generations were
  assembled by a script around `hackage-repo-tool sign`, to control versions, expiry, the gzip
  scheme, rollbacks and rotated roots. Fixtures were real sdists made by `cabal sdist`: `acme-base`
  1.0.0, 1.1.0, 2.0.0, 2.1.0, a squatting `acme-base` 9.0.0 in a second repository, `acme-app`
  1.0.0 depending on `acme-base >=1 && <2`, three hundred filler packages that grow the compressed
  index to 505,145 bytes (beyond the 64 KiB window below), an index-appended revision, two
  `preferred-versions` entries and a malformed `.cabal` file. The stub was a logging static server
  in a pinned `python:3.13-slim` container
  (`sha256:37134a49d21d2120e4c4d73bb76f8a4ab9aef31f096f7ec2ead48c2feead4332`) on a dedicated
  `--internal` Podman network, serving the repository under a path prefix, over HTTP and over TLS
  under a throwaway CA, with a second instance acting as a mirror, and per-path rules injecting
  statuses, bodies, Basic challenges, redirects, tampered bytes and suppressed `Range` support. A
  second network with egress ran cabal 3.16.1.0 and Stack 3.11.1 against the live Hackage through a
  byte-for-byte pass-through proxy under a path prefix. The stub is not a reference
  implementation; the captures prove what the clients send and how they react.
- **The sources, read this run.** hackage-security's `Client.hs` (`checkForUpdates`,
  `updateRoot`, `downloadPackage`), `Client/Repository/Remote.hs` (`pickDownloadMethod`,
  `withMirror`, the incremental `update`), `Client/Repository/Cache.hs` (the incremental unzip and
  `clearCache`), `Trusted/TCB.hs` (`verifyRole'` and the error texts) and its changelog up to
  0.6.4.0; cabal-install's `CmdUpdate.hs`, `GlobalFlags.hs` (`initSecureRepo`), `HttpUtils.hs`,
  `Upload.hs` and `IndexUtils.hs` on master, and `HttpUtils.hs` and `CmdUpdate.hs` at
  `cabal-install-v3.8.1.0`; hackage-server's `Features/Upload.hs`, `Packages/Unpack.hs` and
  `Util/CabalRevisions.hs`; the Cabal user guide's package-description page; and Stack's
  `configure/yaml/non-project.md`.
- **The live upstream.** `hackage.haskell.org` sampled directly: `root.json` (version 8, six root
  keys at threshold 3, four signatures, a `targets` role with no keys), `timestamp.json` and
  `snapshot.json` (version 110900, expiring three days after issue), `mirrors.json` (version 13,
  two plain-HTTP mirrors), `01-index.tar` (1,039,283,712 bytes) and `01-index.tar.gz`
  (138,773,140 bytes) with `Range` answered `206`, the headers of every route, the index's tail
  entries, the whole index's 358,366 entries (153,934 `package.json`, 200,657 `.cabal`, 3,775
  `preferred-versions`, and no entry time ever lower than its predecessor's), package-name case,
  the tarball redirect, and the upload endpoints' authentication challenge. Every key id in the live
  root is the SHA-256 of the key's compact, key-sorted JSON form, and every live signature verifies
  over that form of `signed` (checked this run with an independent ed25519 implementation).
- **OSV and purl.** `ecosystems.txt` (46 entries) lists `Hackage` and `GHC`; `Hackage/all.zip`
  holds 32 advisories, every one an `HSEC-` record with `ECOSYSTEM` ranges; the query API answers
  `aeson` by name and by `pkg:hackage/aeson@2.0.0.0`; the purl type `hackage` exists and is
  case-sensitive (all captured 2026-09-27).

Where the published contracts and the captures disagree, the captures and the sources win, and the
differences are recorded because they would otherwise be built from the documents. TUF expects a
client to refuse expired metadata; **both cabal lines check expiry only when `--ignore-expiry` is
passed**, because `CmdUpdate.hs` hands `checkForUpdates` the current time exactly when
`repoContextIgnoreExpiry` is set and `Nothing` otherwise (read at master and at 3.8.1.0, captured
both ways), and Stack's `ignore-expiry` defaults to `true` (its docs; captured). TUF walks a
client through every intermediate root; **hackage-security downloads only the current
`root.json` and verifies it against the cached root's keys alone** (`updateRoot`, captured).
Stack's docs date `package-index` to 2.9.3; captured, **2.9.1 ignores it and 3.11.1 ignores
`package-indices`, each silently sending every request to hackage.haskell.org** instead.

Seven things make this format worth a careful spec. **It is the only catalogue format with TUF**:
four signed roles, version numbers a client refuses to see decrease, and expiry. **A rollback
served as stored fails every client loudly**, so a pointer move must re-sign rather than restore.
**The index is an append-only log fetched by `Range`**, so the compressed bytes of every generation
must extend the previous one's, or every client pays a full download after two failed attempts.
**A signed mirror list turns every refusal into a fallback**, on any HTTP error. **A proxy cannot
re-sign**, so it serves Hackage's metadata to the byte and verifies it on the way in, and a virtual
repository is a different trust root. **Credentials split by client line**: cabal 3.8 sends none on
downloads and only Digest on upload. And **metadata revisions and deprecations are appended, not
edited**, with the entry times forming a client-side time machine (`index-state`).

## Blocking preconditions

**The handler interface re-open must complete before this handler starts**, as for every handler
(`format-handler-interface.md` AC8). Hackage is Tier 3, so the catalogue's Tier 1 gate (its AC5) and
the charter's breadth verdict (its AC9, build step 8) both precede it, and it is built at step 11.
This format needs only the format-first mount `/hackage/{repository}/`: every client appends
`root.json`, `01-index.tar.gz`, `package/...`, `upload` and `packages/candidates` to whatever base
it is given, path included (captured under the prefix `/r1/` for all four clients and for
upload), so no root-anchored claim is made.

**The shared signing and index service must be `planned` before Phase 1.** Every hosted and virtual
TUF document and every index generation is produced by
`docs/internal/plans/foundation/signing-service.md` (to be authored in the spec loop), the first
item of the charter's step 7. What this format requires of it is stated in Design ("What the
signing and index service must provide"), never designed here.

**The management API must be `planned` before Phase 2.** Publish, metadata revisions,
deprecation, deletion and key rotation are operations of
`docs/internal/plans/foundation/management-api.md` (to be authored in the spec loop), whose core
the charter builds at step 2 and completes at step 9; `cabal upload --publish` is a client binding
onto its publish operation.

**The data model must carry two things before Phase 3**: the pointer-held signed document that
`debian.md` already raised for its envelope, which this format's `timestamp.json` and
`snapshot.json` also need (Design, "Pointers, rollback and the version counter"), and a
core-visible list of the blobs a metadata document depends on, which the segmented index needs
(Design, "Mapping onto the shared model"). Both are revisions of `data-model.md` and
`storage-and-gc.md` raised by this spec, not tables this handler owns.

**The proxied path depends on shared services that are requested, not assumed**: the upstream
adapter behaviour in Design ("The proxied path") of
`docs/internal/plans/foundation/upstream-adapters.md` (to be authored in the spec loop, charter step
4), and the TUF chain verification requested of
`docs/internal/plans/foundation/artifact-verification.md` (to be authored in the spec loop, step
4b). The virtual merge runs as deferred work on
`docs/internal/plans/foundation/async-operations.md` (to be authored in the spec loop, step 6a),
which must be `planned` before Phase 5.

## Scope

**In scope:**

- **The read surface** under `/hackage/{repository}/`: `root.json`, `timestamp.json`,
  `snapshot.json`, `mirrors.json`, `01-index.tar.gz` and `01-index.tar` with single byte ranges,
  and package tarballs at `package/{name}-{version}.tar.gz` and Hackage's own
  `package/{name}-{version}/{name}-{version}.tar.gz`.
- **Four clients as oracles on both paths**: cabal-install 3.16.1.0 and 3.8.1.0 (`update`,
  `install`, `fetch`, `get`, `upload --publish`) and Stack 3.11.1 and 2.9.1 (`update`, `unpack`).
- **TUF metadata** for hosted and virtual repositories, produced, re-signed, expired and rotated by
  the shared signing service, with timestamp and snapshot scoped to the serving pointer.
- **The append-only index**, generated inside each write as appended gzip members, and rebased only
  by deletion.
- **Hosted publish** through `POST upload`, a binding onto the management API's publish, with
  ingest validation of the sdist.
- **Metadata revisions, version deprecation (`preferred-versions`) and deletion** as registry-owned
  management operations, each with its write boundary.
- **Non-interactive authentication** in the forms the clients send, and the per-route addressed
  objects `auth.md`'s pattern scopes evaluate, including the pattern-refusal case its AC8 requires.
- **The rendering of a shared policy refusal**, and OSV coverage through the `Hackage` ecosystem.
- **The proxied path** against any hackage-security repository, hackage.haskell.org first: TUF
  revisions verified as a chain and served byte for byte, incremental upstream index fetches,
  tarballs verified against the index, and this format's rows of the removal table.
- **Virtual repositories**, merged and re-signed with the virtual repository's own keys.

**Out of scope for v1**, each with its reason, recorded because the interface spec's definition of
done requires the deliberately unimplemented surface to be named:

- **Candidate uploads**, the default of a bare `cabal upload`
  (`POST packages/candidates`). A candidate is a second, unindexed namespace per version that no
  client resolves; this registry stages releases through promotion pointers instead. The route
  answers `400` with a body telling the user to pass `--publish`, which cabal prints (the resolved
  candidate decision below).
- **Documentation upload and hosting** (`cabal upload -d`, `PUT package/{id}/docs` and
  `.../candidate/docs`, captured). The payload is HTML for a web interface, and no client reads it;
  the route answers `404` with a body saying so, which cabal prints.
- **Legacy non-secure repositories.** A `secure: False` stanza requests `00-index.tar.gz`
  (captured on both cabal lines), an unsigned index that strips every guarantee TUF gives; both
  cabal lines default to the secure layout. The route answers `404` ("failed to download ... HTTP
  code 404", captured).
- **Hackage's web and JSON interface**: `packages/`, `package/{name}/preferred`,
  `packages/deprecated`, search, accounts, maintainer groups, build reports (`cabal report`) and
  the legacy `POST packages/`. No client in the matrix requests any of them (captured); the
  registry's own interface is where packages are browsed.
- **Package-level deprecation** ("deprecated in favour of"). Hackage keeps it outside the index:
  the deprecated `2captcha` has no index entry of any kind beyond its releases (captured), so no
  client can read it. Version-level deprecation, which lives in the index, is in scope.
- **Stackage snapshots and Casa.** Stack resolves snapshots from Stackage and fetches file trees
  from `casa.stackage.org` (its `casa` setting, docs), which are separate protocols with their own
  services; this spec serves only the Hackage index and tarballs, which Stack reads through
  `package-index`. Nothing about Casa was captured, so nothing is claimed.
- **Author signing through TUF target delegations.** No implementation exists: the live `targets`
  role has no keys and every `package.json` carries `"signatures": []` (captured).

## Design

### The wire surface, as captured

Every route hangs off `/hackage/{repository}/`, format-first per `format-handler-interface.md`'s
resolved URL-shape decision. cabal names it in a `repository` stanza (`url:`, `secure: True`,
`root-keys:`, `key-threshold:`); Stack 3.11 in `package-index` and Stack 2.9 in
`package-indices` (`download-prefix:`, `hackage-security: keyids, key-threshold, ignore-expiry`).

| Surface | Shape, as the pinned clients send it |
|---|---|
| Bootstrap | The first update with no cache requests `root.json` and verifies it against the configured key ids and threshold; a cabal stanza with no `root-keys` trusts the first root it sees (captured). At bootstrap cabal also queries DNS for mirrors of the configured host ("Trying to locate mirrors via DNS for initial bootstrap", two found for hackage.haskell.org, `DnsHostNotFound` for the stub; `initSecureRepo`) |
| Update | `GET timestamp.json` on every run; `snapshot.json` only when the timestamp names a different snapshot; `root.json` when the snapshot names a different root, then the whole check restarts; `mirrors.json` when it changed; the index when it changed (source `checkForUpdates`; captured on all four). User agents `cabal-install/{version} (linux; x86_64)` and `Haskell pantry package`; no conditional header on any request, although the stub sent an `ETag` (captured) |
| Index | The first download is a whole `GET 01-index.tar.gz`. Later ones send `Range: bytes={cached gz size - 65536}-{new gz size - 1}`, splice the cached prefix with the answer and verify the result's SHA-256 against `snapshot.json` (`pickDownloadMethod`'s `updateTail = 65536`, "max gzip block size"; captured `Range: bytes=439609-505242` against a 505,145-byte cache on all four). When the range start lies beyond the new size, cabal sends a plain `GET` (captured). `01-index.tar` is never requested (captured) |
| Range capability | Stack 3.11.1 sends no `Range` when responses carry `Accept-Ranges: none`; cabal sends it anyway and accepts a `200` with the whole body (captured). hackage-security learns the capability from `Accept-Ranges: bytes` (`updateServerCapabilities`) |
| Verification failure | Any verification error re-downloads `root.json` and restarts, at most five iterations, then fails with "Verification loop. Errors in order:" and exit 1 (captured). An incremental index whose hash fails is retried once and then downloaded whole: "Verification error: Invalid hash for <repo>/01-index.tar.gz" twice, then "Cannot update index (update failed twice)" (captured on all four) |
| Tarball | `GET package/{name}-{version}.tar.gz`, verified against the SHA-256 and length in the index's `{name}/{version}/package.json`; Stack adds `Accept-Encoding: gzip`; redirects are followed (captured). Tampered bytes: cabal "Invalid hash for <repo>/package/{id}.tar.gz"; Stack 2.9.1 "Mismatched SHA256 hash from {url}" with both digests; Stack 3.11.1 only "Error: [S-5170] While trying to unpack ..." (captured) |
| Publish | `POST {base}/upload`, `multipart/form-data` with one part `name="package"; filename="{name}-{version}.tar.gz"` whose headers precede the bytes; a candidate goes to `POST {base}/packages/candidates` (captured). The target is the **last** remote repository in the configuration (`last` in cabal-install's Upload.hs). A `200` or `204` prints the body under "Warnings:"; anything else prints "Error uploading {path}: http code {n}" and the body, and exits non-zero (captured `409`) |

**Error rendering**, captured, because a refusal nobody can read is a refusal nobody can act on.
cabal prints "Unexpected response {status} for {url}" with any URL password masked as `u:...`, never
the body, and only after every mirror has failed (below). Stack 2.9.1 prints the `HttpException`
with the status and the body; Stack 3.11.1 prints only "Error: [S-5170]". Stack reads the body of a
refused metadata request as the file itself, so a `403` on `timestamp.json` surfaces as a JSON
parse error ("unexpected "r" expecting white space or JSON value", captured on 2.9.1) inside the
verification loop.

### How the clients decide, and the three cross-format checks

**Does the client verify what it downloads? Yes, along a chain that ends at keys the client
holds.** Every tarball is checked against the SHA-256 and length in its `package.json`; the index
holding that file is checked against `snapshot.json`; the snapshot against `timestamp.json`; and
each against signatures from the roles `root.json` names, whose own signatures are checked against
the key ids in the client's configuration (source; a tampered tarball and a mismatched index refused
on all four, and a root signed by the wrong keys on both cabal lines, captured). That is the strongest check in the catalogue: unlike `puppet.md`, where the
checksum comes from the server that serves the bytes, a registry here cannot serve bytes the
repository's keys did not cover. The one weak link is that `package.json` itself is unsigned
(`targets` has no keys on the live Hackage), so the tarball's integrity rides entirely on the
index hash.

**Is a rollback visible? Only if the pointer move re-signs, and then to every client.** Serving an
older snapshot's `timestamp.json` and `snapshot.json` as stored fails every client: "Verification
loop. Errors in order: Version of <repo>/timestamp.json is less than the previous version", five
times, exit 1 (captured on all four; hackage-security's verifyRole' in the source). The same
content re-signed with a higher version is adopted by all four: an incremental range when the rollback distance lies inside
the 64 KiB window, a whole download otherwise, the local tar rewritten because its prefix no
longer matches (`unzipIncremental`), and Stack reporting "Forcing a recache" (captured). So where
`debian.md` and `conan.md` found clients that silently keep a newer document, TUF fails loudly,
and the cure is the same shape: the documents that carry the version belong to the pointer, not the
snapshot (Design, "Pointers, rollback and the version counter").

**Does the client fall back when refused? Yes, to every mirror the signed `mirrors.json` lists, on
any HTTP error.** With a second instance listed as a mirror, a `403` on `timestamp.json` and a
`403` on a tarball each sent cabal 3.16.1.0 and 3.8.1.0 to the mirror, which served them, exit 0
("Exception Unexpected response 403 ... when using mirror ...", "Selected mirror ...", captured);
Stack 3.11.1 reached the mirror for metadata after its five-iteration loop, and neither Stack line
retried a refused tarball on a mirror (captured). hackage-security builds the list from the
configured URL, the DNS-discovered bootstrap mirrors and `mirrors.json`, catching every remote error
but the last (`withMirror`), and cabal enables the TUF list unconditionally
(`Sec.Remote.defaultRepoOpts`). So **a refusal holds only where the repository's signed mirror list
is empty or the client cannot reach the listed hosts**: hosted and virtual repositories sign an empty
list, and a remote that serves Hackage's list (two plain-HTTP mirrors) is enforceable only with
egress restricted, which the operator documentation states.

### The index is an append-only log

What the clients read from `01-index.tar`, captured and read in `IndexUtils.hs`:

- **Three entry kinds**: `{name}/{version}/{name}.cabal`, `{name}/{version}/package.json` and
  `{name}/preferred-versions`; anything else is skipped. On the live index these are the only three
  kinds present.
- **The last entry for a path wins.** A revised `.cabal` appended with `x-revision: 1` is what `cabal
  info` shows and what `cabal get` writes over the tarball's own file (captured on both lines). The
  live index carries 200,657 `.cabal` entries for 153,934 releases.
- **Entry times are the client's time machine.** cabal's `index-state` keeps the entries whose own
  time is at or before the requested instant (its filterCache is a filter over entry times, not a prefix), so
  `cabal update 'acme,{instant}'` before a deprecation resolved the deprecated release again
  (captured). The live index's 358,366 entries never go back in time.
- **`package.json`** is a TUF `Targets` document with `"signatures": []`, `"expires": null` and one
  target, `<repo>/package/{name}-{version}.tar.gz`, with its `sha256` and `length` (live and
  hackage-repo-tool alike; the live one adds `md5`, which hackage-security ignores, its 0.5.2.2
  changelog). The live index writes `package.json` before the `.cabal` of a release.
- **`preferred-versions`** holds one version range; a version outside it is shown in parentheses
  and avoided, but a deprecated release is still chosen when nothing else satisfies (captured:
  `acme-base >=2` deprecated every release `acme-app` accepts and cabal installed 1.1.0 anyway). It
  is a preference, not PyPI's yank.
- **A malformed `.cabal` breaks only its own release**, which the solver rejects, while every other
  package resolves (captured on both lines).
- **The tar ends with 1,024 zero bytes** (live and generated alike), which the incremental unzip
  checks before appending (`Cache.hs`).

**The compressed index must extend the previous one byte for byte**, except within the last 64 KiB
the client re-fetches. hackage-repo-tool recompresses the whole tar and still gets there, its
generations sharing all but the final 6,772 bytes, because the same deflate implementation with the
same settings emits the same prefix. Change the compressor and every client fails its incremental
update twice and downloads the whole index (captured on all four, level 9 against level 6). Per the
resolved index-compression decision below, this registry therefore never recompresses: **each write
appends one gzip member** holding its new entries, followed by a final member holding the trailer.
The previous generation's bytes, minus that final member of a few dozen bytes, are a prefix of the
next, whatever compressor version produced them; all four clients read the multi-member stream
whole and incrementally (captured: `Range: bytes=437361-503400` answered `206` and verified).

### Mapping onto the shared model

The levels are exactly those `data-model.md` provides; no table is added.

- **A `Package` is the package name**, byte for byte, in Cabal's grammar restricted to ASCII (the
  resolved name decision below).
- **A `Version` is the version string**, `[0-9]+(\.[0-9]+)*`. Its document holds the sdist's
  `.cabal` file as published, every revision with its `x-revision` number, author and entry time,
  the tarball's SHA-256 and length, and the entry times of its `package.json` and `.cabal` entries.
- **`File`**: one per version, `{name}-{version}.tar.gz`, keyed by CAS digest.
- **The package-level document** holds the `preferred-versions` history (each range with its entry
  time) and the retirement set of deleted versions.
- **The repository-level document** holds the **index manifest**: the ordered list of segments, one
  per write, each naming the CAS digest of its raw tar bytes and of its gzip member, the running
  lengths, and the SHA-256 state of the tar and gzip streams after the last segment, so the next
  write hashes only what it appends. It also holds the repository's case index of names.
- **Not snapshot content**: `timestamp.json` and `snapshot.json` belong to the pointer, and
  `root.json` and `mirrors.json` to the signing service's per-repository records, so no repoint can
  restore an older root or a lower version (next sections).
- **A remote repository's document** holds its current and retained upstream revisions (Design, "The
  proxied path") and the verification record of each cached tarball; none of it is snapshot
  content.

**The segments need the core to see them.** The manifest names segment blobs inside an opaque
document, which no mark root can read, and the per-write alternative (a whole index blob per
generation) costs a gigabyte per write at Hackage's scale. Per the resolved index-storage decision
below, a metadata document may declare to the core the blob digests it depends on, which GC marks
wherever the document itself is marked, the fourth root's reach extended from a document's own blob
to the blobs it declares. That is a revision of `data-model.md` and `storage-and-gc.md`, listed in
the sibling consequences.

### The hosted publish path and what counts as a write

`cabal upload --publish` is the one write a client triggers, so, following `debian.md`'s dput
decision and `puppet.md`'s Forge binding, **`POST {base}/upload` is a client binding onto the
publish operation of `docs/internal/plans/foundation/management-api.md`** (to be authored in the
spec loop). The part named `package` is streamed into the CAS, its SHA-256 computed in the stream,
and committed only once ingest validation passes. Responses: `200` with a one-line body (cabal
prints it under "Warnings:"); `400` naming the rule for content that fails validation; `409` for an
existing or retired coordinate with different bytes; `401` and `404` per `auth.md`; `405` against a
remote or virtual repository. cabal prints the body of every refusal (captured).

What ingest enforces, following hackage-server's `Unpack.hs` and `Upload.hs` where the rule does not
need Cabal's own parser, each refusal naming the rule and committing nothing:

- **The archive**: a gzip-compressed tar whose every entry sits under one top directory
  `{name}-{version}`, holding exactly one `{name}.cabal` at its top; regular files and directories
  only (no symlink, hard link, device or FIFO), no absolute path and no `..` segment.
- **Identity**: the `.cabal` file's top-level `name` and `version` fields agree with the directory
  and with the multipart filename; the name is in the grammar below; the version is
  `[0-9]+(\.[0-9]+)*`; and no `x-revision` field is present, since a new release starts at revision
  zero (hackage-server refuses the same). Only these fields are read: the rest of the `.cabal` file
  is the client's to parse, and a file the client cannot parse breaks only that release (captured),
  per the resolved revision-checking decision below.
- **Coordinates bind one set of bytes for the life of the repository.** An existing version answers
  `409` unless the bytes are identical, which answers `200` and creates no snapshot; a deleted
  version answers `409` with any bytes, including after the deleting snapshot is pruned; a version
  differing from an existing one only by trailing zeros (`1.2` beside `1.2.0`) answers `409`, as
  hackage-server refuses it.
- **Names**: a new package whose name differs only in case from an existing one answers `409`
  (hackage-server's case-clash rule; this registry has no maintainer groups to except anyone); a name
  whose index paths do not fit a ustar entry's name and prefix fields answers `400`.

`data-model.md` requires each format spec to declare its ecosystem's write boundaries. Hackage's
declaration:

- **One publish is one completed logical write and one snapshot**, appending one index segment with
  the release's `package.json` and `.cabal` entries, in that order, as the live index writes them.
- **A metadata revision, a change of a package's `preferred-versions` and a deletion are each one
  write**; a retention pass over a repository is one write however many versions it removes.
- **Two concurrent publishes** each read-modify-write the repository-level manifest through the
  revision-token retry `data-model.md` makes mandatory (its AC20); both land, each segment after the
  other, and each entry's time is the later of the write's commit time and the manifest's last entry
  time, so the log never goes back in time, whatever the clock does.
- **Re-signing** `timestamp.json` and `snapshot.json` on the expiry cadence or at a key rotation is
  not a write and creates no snapshot. A proxied repository creates no snapshots.

### Every hosted index is a write-triggered signed document

Per `write-triggered-services-prototype.md`'s class and `debian.md`'s split, which this spec follows
rather than re-deciding:

- **Index segments are snapshot content**, produced by the signing and index service inside the
  write that triggers them, in the same snapshot as the change, so a repoint restores them, as
  `data-model.md` AC13 requires of all three levels. An untouched package never changes bytes.
- **`snapshot.json` and `timestamp.json` belong to the pointer**, produced inside the write for the
  default pointer (so the publisher sees the release at its next update), at every promotion or
  rollback, on the expiry cadence and at key rotation, and stored beside the pointer.
- **`root.json` and `mirrors.json` belong to the repository's signing record**, outside every
  snapshot; every pointer's `snapshot.json` names the current ones.
- **A deletion rebases the index**: the service regenerates the log without the deleted release's
  entries as one new segment list, a non-prefix change every client absorbs with one whole download
  after two failed incremental attempts (captured for any non-prefix change). Rebases are therefore
  rare administrative events, which the operator documentation says of deletion and of retention
  rules on this format.

### Pointers, rollback and the version counter

Each pointer carries a **TUF version counter**. Every `timestamp.json` and `snapshot.json` produced
for a pointer takes the version one above the highest either document has ever carried on that
pointer, per the resolved pointer-metadata decision below. What each transition does:

| Transition | Index served | `snapshot.json` and `timestamp.json` | What a client that updated before sees |
|---|---|---|---|
| A write advances the default pointer | The new generation, an extension of the last | Re-signed at the next version, inside the write | An incremental `Range` update |
| Rollback to an earlier snapshot | That snapshot's generation, a prefix of what the client holds | Re-signed at the next version over the earlier index | The earlier index: one `Range` request inside 64 KiB, otherwise a whole download (captured) |
| Promotion to an environment pointer | The promoted snapshot's generation | Re-signed on that pointer's own counter | Byte-identical index and tarballs; metadata that differ only in version, expiry and signature |
| A deletion (rebase) | A regenerated generation | Re-signed at the next version | Two failed incremental attempts, then a whole download (captured) |
| Re-sign on the expiry cadence | Unchanged | Re-signed at the next version with a new expiry | `timestamp.json` and `snapshot.json` only |
| Serving an older snapshot's metadata as stored | (never done) | (lower versions) | "Version of <repo>/timestamp.json is less than the previous version", exit 1 (captured) |

The accepted cost, as in `debian.md`, is that a promoted environment's metadata are not
byte-identical to the source environment's: the index and tarballs are, the version, expiry and
signatures are not, the same qualification of `data-model.md` AC22 that spec raised. A version equal
to the last with different content is accepted by the clients (verifyRole' refuses only a
decrease; captured), but the counter never relies on it.

### What the signing and index service must provide

Stated so the dependency on `docs/internal/plans/foundation/signing-service.md` (to be authored in
the spec loop) cannot be lost, in the shape `debian.md` and `alpine.md` use, and precisely enough
that the service can be specced against it:

1. **Keys per hosted and per virtual repository, ed25519 only**, the one scheme hackage-security
   reads (every key in the live root is ed25519): a root role of three keys at threshold two by
   default (hackage-repo-tool's default), one snapshot key, one timestamp key and one mirrors key,
   and a `targets` role declared with no keys, the live Hackage's shape, which every client accepts
   (captured through the pass-through). Key ids are the SHA-256 of the key's canonical JSON form, as
   hackage-repo-tool and the live root compute them. The handler never sees a private key, which an
   architecture test asserts as `write-triggered-services-prototype.md` AC5 does for Debian.
2. **Canonical JSON signing byte-compatible with hackage-security**: signatures over the canonical
   form of `signed`, `"method": "ed25519"`, every signing key listed in the document's key
   environment; proven by the real clients and by verifying the live Hackage's metadata with the same
   code path in a test.
3. **The documents**: `root.json` (version, expiry one year by default, keys, roles),
   `mirrors.json` (an empty list unless the operator configures mirrors, expiry one year), and per
   pointer `snapshot.json`, naming `<repo>/01-index.tar.gz`, `<repo>/01-index.tar`,
   `<repo>/root.json` and `<repo>/mirrors.json` each with `sha256` and `length`, and
   `timestamp.json`, naming `<repo>/snapshot.json`; both expire three days after signing by
   default, the live Hackage's window.
4. **The version counter per pointer** as above, durable across restarts and never lowered by a
   clock step.
5. **Re-signing without a write**: `timestamp.json` and `snapshot.json` at half their window,
   `root.json` and `mirrors.json` at half theirs (a new root version signed by the current root
   keys, or, where the operator holds them, an alert to the operator well before expiry), for every
   pointer including idle environments, creating no snapshot. The default clients ignore expiry
   (captured), so this is for the opt-in clients, and it is a hard requirement for them.
6. **Index generation inside the write**: ustar entries with a fixed owner (the live index carries
   the uploader's name, which leaks identities to every reader), each entry's time as in the write
   boundary above, one gzip member per segment plus a final trailer member, and the running SHA-256
   and lengths carried in the manifest; the service never recompresses a published segment. A
   rebase regenerates the whole log once.
7. **Rotation with overlap**, through the management API. Online keys (snapshot, timestamp,
   mirrors) rotate by a new root version signed by the current root threshold: clients meet the
   unknown key, fetch the root and continue (captured on both cabal lines: "Could not deserialize
   <repo>/timestamp.json: Unknown key", then success). Root keys rotate by a new root whose root role
   holds the new keys, whose key map keeps the old root keys, and which carries a threshold of
   signatures from both, which a client still holding the first root accepts directly and a fresh client
   bootstraps from with either set's ids (captured on both cabal lines). A
   root signed by the new keys alone is refused by such a client ("does not have enough signatures",
   captured), and one carrying an old key's signature without listing that key fails to parse
   ("Unknown key", captured), because hackage-security checks only against the cached root and never
   walks intermediate versions. The old root keys therefore keep cross-signing for an
   operator-set window, and rotation is announced, because a client bootstrapping with ids the new
   root's signatures no longer reach fails: Stack 2.9.1's built-in pre-2025 Hackage key ids fail
   against the live root today ("<repo>/root.json does not have enough signatures signed with the
   appropriate keys", captured).
8. **Operator-held root keys**, per the resolved root-custody decision below: the service accepts a
   `root.json` the operator signed offline (with hackage-repo-tool, for instance), verifies it
   against the current root, and serves it, so a deployment can keep its root keys off the server.
9. **The key ids and threshold** shown in the management surface, in the forms cabal's `root-keys`
   and Stack's `keyids` take.
10. **The virtual merge** (Design, "Virtual repositories"), run as deferred work and signed with the
    virtual repository's keys.

Verification of an upstream's TUF chain is not the signing service's: it belongs to artifact
verification (Design, "The proxied path").

### Revisions, deprecation and deletion

Per the cross-format precedent (`pypi.md`'s resolved hosted-yank decision, with `npm.md`,
`cargo.md`, `julia.md`, `puppet.md` and `conan.md`), each operation is a completed logical write
through the shared write path, authorized in the settled `(repository, action)` vocabulary with no
new action, hosted only, its trigger verified by integration tests and its effect by the real clients
(`docs/internal/analysis/management-surfaces-and-the-oracle.md`). **No client in the matrix triggers
any of them but publish**: neither cabal line nor Stack has a revise, deprecate or delete command.

| Operation | Effect a client sees | Action |
|---|---|---|
| Publish a release | The release appears in the index | `push` |
| Revise a release's `.cabal` | A new `.cabal` entry with the next `x-revision` is appended; `cabal info` and `cabal get` use it (captured) | `push` |
| Set a package's `preferred-versions` | A new `preferred-versions` entry is appended; versions outside it are avoided but still chosen when nothing else satisfies (captured) | `push` |
| Delete a release | The index is rebased without it, the tarball answers `404`, the coordinate joins the retirement set; a pinned build fails "Unexpected response 404" (captured shape) | `delete` |
| Rotate keys, renew or replace the root | New metadata; clients follow as in the list above | administrative |

Rules, applying the precedent: every operation is one snapshot, none for a refused one, and no blob
is deleted directly, so space returns only through retention pruning and `storage-and-gc.md`'s
single-deleter boundary (its AC15) holds; the retirement set is carried forward by every later write
and preserved across a backwards repoint (`data-model.md` AC33's obligation on the management
surface); the `Package` row outlives its versions. A revision must keep `name` and `version` and carry
`x-revision` equal to the previous number plus one, and nothing else about it is checked (the resolved
revision-checking decision below); the revision's author and time are recorded. Key operations are
administrative: `management-api.md` decides their authorization, and no repository-scoped token can
perform them (`auth.md` AC30). What this format requires of `management-api.md`: the five operations
above on the objects in the addressed-object table, one implementation behind the upload binding and
the endpoint, and the note that deprecation here is a preference that never excludes, unlike yank.

### Names, versions and case

- **Nothing folds.** Hackage matches names case-sensitively (`package/HTTP` answers `200` and
  `package/http` `404`, captured), and cabal only suggests: "There is no package named 'acme'.
  However, the following package name exists: 'ACME'" (captured through the pass-through).
- **Grammar**: Cabal's package name, hyphen-separated alphanumeric words none of which is all digits
  (the user guide), restricted to ASCII letters and digits as Hackage restricts it. A new name
  differing only in case from an existing one is refused at publish (above).
- **Tarball paths parse without a lookup**: `{name}-{version}.tar.gz` splits at the last hyphen,
  since a version holds no hyphen and no name word is all digits.
- **Versions** compare component-wise as integers, and no two versions of a package differ only by
  trailing zeros, because publish refuses the second.

### Authentication

What each client sends, captured, since the four differ:

| Client | Downloads | Upload |
|---|---|---|
| cabal 3.16.1.0 | URL userinfo in `url:`; over HTTPS curl answers a challenge (`--anyauth`): every request is sent bare, draws `401` with `WWW-Authenticate: Basic`, and is repeated with `Authorization: Basic` (captured, index `Range` requests included); over plain HTTP it forces Digest (`--digest`) and never sends Basic (captured `401`, source) | `--token` sends `Authorization: X-ApiKey {token}` preemptively; `--username` and `--password` over HTTPS answer a Basic challenge (captured) |
| cabal 3.8.1.0 | Nothing: userinfo produced no `Authorization` header over HTTPS against a Basic challenge (captured) | No `--token` ("unrecognized 'upload' option", captured); a password is sent only by Digest (`--digest` in its `HttpUtils.hs`), so a Basic challenge fails "http code 401" (captured) |
| Stack 3.11.1 and 2.9.1 | URL userinfo in `download-prefix`, sent as preemptive Basic on every request over TLS (captured on both), and over plain HTTP as readily (captured on 3.11.1) | none |

How this meets `auth.md`, whose rules this spec does not bend: its verifier accepts the Basic password
(its AC31), which covers both Stack lines and cabal 3.16's downloads and password upload. **cabal
3.16's `X-ApiKey` scheme is not among AC31's four forms**, so `auth.md` needs this format's scheme
added to its verifier, or cabal 3.16's token upload is rejected; the adopted client-scheme decision
below asks for it as a sibling consequence rather than widening anything here. The `401` this format
answers carries `WWW-Authenticate: Basic realm="{repository}"`, because cabal 3.16 sends nothing
without one; it is identical for a private and a missing repository (`auth.md` AC17), a valid token
lacking `pull` answers `404`, and a rejected token answers `401` and is never served as anonymous
(`auth.md` AC12). Plain HTTP is refused before lookup (`auth.md` AC27), which also protects Stack's
preemptive Basic. **Digest is not offered**: it needs the server to hold a password-equivalent
secret, which `auth.md`'s hashed tokens exclude, so cabal 3.8 can read an anonymously readable
repository and cannot publish, which the operator documentation states. The live Hackage offers
Digest alone on its upload routes (captured), so users migrating from it change their method.

### Addressed objects and pattern scopes

`auth.md`'s pattern scopes narrow a credential within one repository by matching the object each
request addresses, and the format declares which object each route reports ("Pattern scopes" there;
`format-handler-interface.md` AC12). The canonical object is `{name}/{version}` for a release and
`{name}` for a package, so a family is a pattern such as `acme-*/**`.

| Route | Canonical object | Action | Object kind |
|---|---|---|---|
| `root.json`, `timestamp.json`, `snapshot.json`, `mirrors.json` | - | `pull` | none |
| `01-index.tar.gz`, `01-index.tar` (they enumerate every name) | - | `pull` | none |
| `package/{name}-{version}.tar.gz`, `package/{name}-{version}/{name}-{version}.tar.gz` | `{name}/{version}` parsed from the path | `pull` | named |
| `POST upload`, multipart with the `package` part's filename before its bytes | `{name}/{version}` from the filename | `push` | named |
| `POST upload` with no filename before the bytes | - | `push` | none |
| `POST packages/candidates`, `PUT package/{id}/docs`, `PUT package/{id}/candidate/docs` | `{name}/{version}` | `push` | named |
| Revise, set preferred versions (management API) | `{name}/{version}`, `{name}` | `push` | named |
| Delete (management API) | `{name}/{version}` | `delete` | named |
| Any other route | - (answered `404`) | `pull` | none |

What that gives, applying `auth.md`'s rules rather than re-deciding them. **A patterned `pull` cannot
update**: every client must read the index, which reports none, so `cabal update` and `stack update`
fail at the first request under a token patterned `acme-*/**`, the consequence `alpine.md` and
`rpm.md` recorded for the same reason; a patterned `pull` still confines a scripted tarball fetch to
in-pattern releases. **A pattern refusal on a named route is answered as absence**, `404`,
indistinguishable from a release that does not exist. **A patterned `push` publishes** in-pattern
releases through `cabal upload --publish`, whose part header names the file first (captured), and is
refused an out-of-pattern one with no snapshot; ingest refuses an archive whose identity disagrees
with the filename, so a mislabelled part cannot evade the pattern (the resolved publish-object
decision below).

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines on a
**tarball route** of either path, the handler answers `403` with `Content-Type: text/plain` and the
body `refused by policy {policy}, rule {rule}: {detail}` (or naming the signal, for a coordinate
condemned under the shared security-signal rule), per the resolved refusal-rendering decision below.
What reaches the user, captured: Stack 2.9.1 prints the body; cabal prints "Unexpected response 403 for
{url}" and never the body; Stack 3.11.1 prints "Error: [S-5170]". The reason is therefore guaranteed
only in the registry's refusal record, which the operator documentation points to, and each refused
download produces exactly one. Where the repository's signed mirror list is empty (every hosted and
virtual repository) no client goes anywhere else; a remote serving an upstream list is the fallback
case above.

**The index keeps naming a refused release.** Eliding it is impossible on a remote, whose index is
signed upstream, and on a hosted or virtual repository it would be a rebase per policy change and a
silent downgrade, the no-elision precedent of `conan.md`, `debian.md` and `puppet.md`.

### Signing, provenance and policy

**TUF is repository signing, not author signing.** No field carries a publisher's signature, and the
`targets` role, the only place TUF offers one, has no keys on the live Hackage. So
`docs/internal/plans/foundation/artifact-verification.md` (to be authored in the spec loop) is asked
for one entry, per `supply-chain-policy.md`'s resolved verification-ownership decision: **a
hackage-security chain verification** taking a TUF revision (root, timestamp, snapshot, mirrors,
index) and the trusted root key ids and threshold, and answering verified with the verifying keys per
role, or the first failing link with hackage-security's own reason (signatures, version, expiry,
hash), with canonical JSON and the root-update rule exactly as hackage-security applies them. The
verdict source `supply-chain-policy.md` consumes answers, per the resolved signature-verdict decision
below, **verified (repository chain)** for a proxied tarball whose digest matches an index entry of a
verified upstream revision, and **absent** for a hosted tarball, whose only signature is this
registry's over its own index; a rule requiring a verified signature therefore refuses every hosted
release (its AC15), which the operator documentation states.

**Advisory coverage exists.** OSV's `Hackage` ecosystem holds 32 `HSEC-` advisories with `ECOSYSTEM`
ranges and explicit version lists, twenty carrying CVE aliases, and none withdrawn or malicious-package
entries (captured). The coordinate is `(Hackage, {name}, {version})`, name matched byte for byte
(purl's `hackage` type is case-sensitive), and version ranges evaluate under the component-wise
integer order above. Advisory rules therefore bind on both paths. OSV's separate `GHC` ecosystem (three
advisories) concerns the compiler and its boot packages, which no repository of this format serves.
Byte-level rules depend on the shared cataloguer's coverage of sdists, which that spec decides.

**No upstream security signal exists on the Hackage wire**: nothing in the index or TUF metadata marks
a release as malicious. A future OSV malicious-package entry for Hackage condemns under the shared
security-signal rule through the advisory feed, which detects it actively (`proxy-cache.md`'s resolved
signal-detection decision, was Q12).

### The proxied path

The handler owns the request and classifies for the proxy layer's fetch-and-cache API per the settled
decisions in `proxy-cache.md`. A remote repository's upstream is any hackage-security repository base
URL, hackage.haskell.org first. Per the resolved remote-metadata decision below, **a remote serves the
upstream's TUF metadata and index byte for byte and never re-signs**: the clients are configured with
the upstream's root key ids, and the chain they verify ends at the upstream's keys. That works under a
path prefix on another host: cabal 3.16.1.0 and Stack 3.11.1 updated through the pass-through at
`/hackage/hk-remote/` with the live root's six key ids at threshold three, verified the 138,773,140-byte
index, and installed verified tarballs (captured), because nothing in TUF metadata names a host.

**What may be re-signed, and by whom**, stated once because it is the question this format adds to
the proxy design:

| Repository type | Signs | May never |
|---|---|---|
| Hosted | Its own root, snapshot, timestamp and mirrors metadata, through the signing service | Serve metadata at a version below one it served on the pointer |
| Remote | Nothing | Re-sign, edit or re-date any byte of the upstream's `root.json`, `timestamp.json`, `snapshot.json`, `mirrors.json` or index, or elide an index entry, since any of these breaks the chain the client verifies or silently changes whose keys it trusts |
| Virtual | Everything it serves, with its own keys, only after verifying each remote member's chain | Present the upstream's keys as its own, or serve a member's signed documents unchanged beside its own |

**The upstream revision is the unit of metadata caching.** On a miss or after the TTL, the handler
fetches `timestamp.json`; if it names a different snapshot, `snapshot.json`, then `root.json` and
`mirrors.json` when changed, then the index, and asks artifact verification to verify the whole chain
against the remote's configured upstream root key ids and threshold (or, for a remote configured
without them, the root it bootstrapped, as a client would). Only a verified revision replaces the
current one, atomically, so a client never meets a timestamp whose snapshot or index is not already
cached; the previous revision is retained for the stale limit. Upstream `root.json` changes are
verified against the cached upstream root, exactly as the clients verify them. A revision whose
versions decrease or whose timestamp has expired is refused, recorded and alerted, and the previous one
keeps serving within `proxy-cache.md`'s stale-if-error bound.

What this format requires of `docs/internal/plans/foundation/upstream-adapters.md` (to be authored in
the spec loop):

- **Incremental index fetches**: `Range: bytes={cached size - 65536}-` against the upstream's index,
  spliced and verified against the new snapshot's hash, falling back to a whole fetch on a mismatch,
  as the clients do, so revalidating a 138 MB index costs one small request per upstream publish.
- **Storage of the upstream index as chunks reused across revisions**, so a revision stores only the
  bytes the upstream changed and the hash state is resumed at the last unchanged chunk; this is the
  remote half of the declared-blob-references revision above.
- **Redirects followed inside the adapter**: the live Hackage answers `package/{id}.tar.gz` with `301`
  to `package/{id}/{id}.tar.gz` (captured), and a client never sees an upstream `Location`.
- **An optional upstream credential**, sent only to the upstream's host over HTTPS.

Classification and behaviour:

- **TUF documents and the index are mutable metadata** revalidated as one revision; the live Hackage
  marks them `Cache-Control: public, no-transform, max-age=60` (captured), and the proxy layer's TTL
  governs.
- **Tarballs are immutable artifacts**, fetched on a miss and verified under stream-and-verify against
  the SHA-256 and length of their `package.json` in the current or a retained revision; a tarball
  neither cached nor named by such a revision answers `404` with no upstream request, so the remote is
  not an open relay. A truncated or mismatching body is never committed.
- **A remote serves the upstream's `mirrors.json`**, since the snapshot hashes it: the live one lists
  `http://hackage.fpcomplete.com/` and `http://objects-us-east-1.dream.io/hackage-mirror/`, which every
  client falls back to on any refusal from this registry. The operator documentation says a remote's
  policy refusals hold only with client egress restricted, and that a virtual repository over the
  remote signs an empty list instead.
- **Expiry is the upstream's.** A cached revision keeps its upstream expiry through serve-stale and
  offline mode: the default clients ignore it (captured), an opt-in client fails once the live
  Hackage's three-day window passes, and the registry never re-dates upstream metadata, which the
  operator documentation states beside `proxy-cache.md`'s offline mode.
- **Missing tarballs are negatively cached** with the short TTL; a `429` or `5xx` is never cached as
  absence (`proxy-cache.md` AC9).
- **Publish and every management operation against a remote repository answer `405`.**

Upstream removal maps onto the settled purge-or-flag table as this format's side of that contract
(`proxy-cache.md`, "Upstream removal or replacement"):

| Upstream event, as observed at revalidation or fetch | Classification |
|---|---|
| A revision appends a `.cabal` or `preferred-versions` entry | An ordinary metadata change, mirrored by serving the new revision |
| A new revision's index does not extend the cached one (an upstream rebase) | Served, since the upstream signed it; the divergence and the vanished entries recorded and alerted; cached tarballs of vanished releases stay fetchable at their paths |
| A new revision gives a cached release a different SHA-256 | The route follows the served index, which is signed upstream, so the new bytes are fetched and verified as a new blob; the old blob stays referenced by the record; recorded and alerted as an immutability violation |
| An indexed release's tarball answers `404` or `410` upstream | An author or administrator removal with no security signal: cached bytes keep serving, the divergence recorded and alerted |
| The upstream root rotates | Verified against the cached upstream root; a root that fails is refused, alerted, and the previous revision serves within the stale bound |
| A revision's version decreases or its timestamp has expired | Refused, recorded and alerted; the previous revision serves within the stale bound |

Per the resolved preconfigured-upstream decision below, no Hackage upstream is preconfigured; the
operator documentation gives the remote for `https://hackage.haskell.org/` with its root key ids.

### Virtual repositories

A remote cannot re-sign, so **a virtual repository is a different trust root**: its index is a merge
this registry signs with the virtual repository's own keys, and its clients configure its root key ids
instead of Hackage's, per the resolved virtual-repository decision below:

- **The merged index is an append-only log of member entries in merge order.** Resolution is per
  package in member order: the first member holding any release of a name supplies every entry of that
  name, `preferred-versions` included, and later members' entries for it are not merged. Entries keep
  their member's times, so an `index-state` pin keeps meaning what it meant against the member, which
  cabal tolerates because it filters by entry time rather than position (its filterCache, source); Stack's
  behaviour on a merged log whose times are not monotonic was not captured and is asserted by a case
  before this path ships.
- **Remote members are verified before they are merged**, through the chain verification above; the
  end-to-end check to Hackage's keys becomes a check by this registry followed by its own signature, the
  accepted cost.
- **Retroactive shadowing rebases.** When a member earlier in the order gains a name a later member's
  entries already supplied, the merge regenerates the log without them, one whole download per client,
  which is what keeps a private `acme-base` from being resolved against a public squatter's releases
  published first.
- **Tarballs are the members' bytes**, served through the virtual route, so the merged index's digests
  are the members'.
- **The virtual repository signs an empty mirror list**, so its refusals hold; publish and management
  operations against it answer `405`.

**cabal users have a second way that keeps end-to-end verification**: two `repository` stanzas, the
remote with Hackage's key ids and the hosted repository with its own, and
`active-repositories: {remote}, {hosted}:override`. Captured on cabal 3.16.1.0: without it cabal merges
repositories and a squatting `acme-base` 9.0.0 in the public one wins; with it the private 2.1.0 wins.
Stack reads one package index, and its docs warn that an index which does not mirror Hackage breaks most
snapshots, so a Stack user combining private and public packages needs the virtual repository. The
operator documentation carries both recipes.

### Content negotiation and headers

No route of this format ever applies a `Content-Encoding`, because every byte is hashed (Stack sends
`Accept-Encoding: gzip` on tarballs, captured). Every response carries `Accept-Ranges: bytes`, since
Stack 3.11.1 sends no `Range` without it (captured), and the index and tarball routes honour one byte range
with `206` and `Content-Range`, and `416` for an unsatisfiable one. Types are `application/json`,
`application/x-gzip` and `application/x-tar`, the live Hackage's. TUF documents and the index are
served `Cache-Control: no-cache` with a byte-derived `ETag`, tarballs
`Cache-Control: public, max-age=31536000, immutable`; no client sends a conditional request (captured),
so the headers serve intermediaries. No hosted route answers a redirect.

### Conformance, the clients and the corpus

The two cabal lines' TUF behaviour was identical in every captured case: bootstrap, incremental and
whole updates, the verification loop, rollback in both forms, expiry in both directions, mirror
fallback, rotation and revisions. **The skew is in cabal-install's transport and upload**: 3.8.1.0
sends no download credential and publishes only with Digest, 3.16.1.0 authenticates over HTTPS and
publishes with a token. **Between the Stack lines** the skew is the configuration key and the error
text. Every hosted and proxied case runs on all four unless it names a client-specific behaviour; the
catalogue counts one ecosystem, and the four appear in the matrix's Client column under the Hackage row.

**Every case runs with the client's network restricted to this registry and its stand-ins**, except
the recording session; the fallback case's mirror is a declared second instance, so it stays inside. The client images are the
upstream images named in Context, pinned by digest (`conformance-harness.md` AC4); each case writes the
client's configuration with the repository's root key ids read from the server in the case `script`,
adds the harness CA (`CURL_CA_BUNDLE` for cabal, the system store for Stack 2.9.1), and gives each
client a fresh home unless it continues one. The fallback case declares a second server instance as the
mirror (`conformance-harness.md` AC16).

The recorded surface for the replay corpus: against hackage.haskell.org, a bootstrap (root, timestamp,
snapshot, mirrors, a whole index), an incremental update, one tarball through its redirect, and an
unknown tarball. The reference implementation for reads is the live Hackage, so `Capabilities()` declares
reference-implementation availability `available`; for publish the reference is hackage-server, which is
runnable locally and is recorded in Phase 6 (not captured this run). Recording gates on the harness's
redaction criterion (`conformance-harness.md` AC13), whose rule for this format names the
`Authorization` header, URL userinfo, the `X-ApiKey` value and upload bodies. Deliberate divergences go
on the exception list before their flow is expected to replay: a multi-member index, a fixed entry
owner, re-signed metadata bytes, no redirect on the tarball route, `400` on candidates, `404` on docs
and legacy routes, and `405` on remote writes.

## Acceptance Criteria

- [ ] AC1: With the client network restricted to this registry, a fresh cabal 3.16.1.0 and 3.8.1.0
      configured with the repository's `root-keys` and `key-threshold` run `cabal update` and then `cabal
      install acme-app`, resolving `acme-base` 1.1.0 while 2.0.0 and 2.1.0 are published; the transcript
      shows `root.json`, `timestamp.json`, `snapshot.json`, `mirrors.json`, a whole `01-index.tar.gz`,
      then one tarball request per package; and the installed program runs.
- [ ] AC2: Stack 3.11.1 configured through `package-index` and Stack 2.9.1 through `package-indices`, each
      with the repository's key ids, run `stack update` and `stack unpack acme-base-1.0.0` with only this
      registry reachable, and the unpacked tree equals the published sdist's contents.
- [ ] AC3: After a further publish, every client's next update sends exactly one index request carrying
      `Range: bytes={cached gz size - 65536}-{new gz size - 1}` answered `206`, verifies it, and resolves
      the new release, for an index larger than 64 KiB compressed; across thirty consecutive writes under
      two different compressor builds, every generation's compressed bytes minus its final member are a
      prefix of the next generation's.
- [ ] AC4: Every generation's `snapshot.json` names the SHA-256 and length of exactly the bytes the
      `01-index.tar.gz` and `01-index.tar` routes serve, each index ends with 1,024 zero bytes, every
      entry's time is no earlier than its predecessor's including with the server clock stepped backwards,
      a publish appends the release's `package.json` before its `.cabal` in one segment, and every
      `package.json` is a `Targets` document with `"signatures": []`, `"expires": null` and one target
      naming the tarball's SHA-256 and length.
- [ ] AC5: Bytes altered in storage by fault injection are refused by all four clients: a tarball with
      cabal's "Invalid hash for <repo>/package/...", Stack 2.9.1's "Mismatched SHA256 hash", and Stack
      3.11.1's failure; and an index segment with every client's hash error; with no altered byte
      installed.
- [ ] AC6: After `acme-base` 2.1.0 is published and every client has updated, moving the repository's
      pointer back to the snapshot before it serves that snapshot's index with `timestamp.json` and
      `snapshot.json` at a version above any previously served on the pointer; every client's next update
      succeeds and no longer offers 2.1.0, with one `Range` request when the rollback lies inside 64 KiB
      and a whole download otherwise; and no pointer ever serves either document at a version lower than
      one it served, including with the clock stepped backwards.
- [ ] AC7: Promoting a snapshot to a second pointer serves byte-identical index and tarball bytes there,
      with `timestamp.json` and `snapshot.json` on that pointer's own counter, and every client of the
      second pointer updates and installs from it.
- [ ] AC8: An idle default pointer and an idle environment pointer are each re-signed before their
      `timestamp.json` and `snapshot.json` expire, over three windows under an injected clock, with no
      snapshot created; `cabal --ignore-expiry update` on both cabal lines and Stack with
      `ignore-expiry: false` on both lines succeed at every step.
- [ ] AC9: Every served TUF document verifies under hackage-security's canonical JSON rules with ed25519
      keys only; the root role, snapshot, timestamp and mirrors keys and an empty `targets` role are as
      Design states; the signing test path also verifies the live Hackage's current metadata; and no
      handler package holds a private key or performs signing, asserted by an architecture test.
- [ ] AC10: Rotating the snapshot, timestamp and mirrors keys makes every client that holds the previous
      root update successfully through one root download; rotating the root keys serves a root whose root
      role holds the new keys, whose key map keeps the old root keys, and which carries a threshold of both
      sets' signatures, which a client holding the original root accepts directly and a fresh client
      configured with either set's ids bootstraps from; and neither rotation creates a snapshot.
- [ ] AC11: A `root.json` signed offline by an operator is accepted only when a threshold of the current
      root keys signed it and every signing key appears in its key map, and is then served to every
      client, which follows it; a root failing either check is refused with the reason and never served.
- [ ] AC12: `cabal upload --publish --token` from cabal 3.16.1.0, sent as `POST upload` to
      `https://{host}/hackage/{repo}`, stores the release in exactly one snapshot, prints the response under "Warnings:", and the release then
      installs on all four clients; `--username` and `--password` over HTTPS publish the same way; an
      identical republish answers `200` with no snapshot; different bytes at an existing or deleted
      coordinate, including after the deleting snapshot is pruned, and a trailing-zero variant answer `409`,
      which cabal prints with its body.
- [ ] AC13: Each of these publishes answers `400` naming the rule, with nothing committed and no snapshot:
      an archive that is not gzip-compressed tar; an entry outside `{name}-{version}/`; a missing or second
      `{name}.cabal`; a `.cabal` `name` or `version` disagreeing with the directory or the filename; an
      `x-revision` field; a symlink, hard link, device, absolute path or `..` path; a name outside the
      grammar or with non-ASCII characters; and a version outside `[0-9]+(\.[0-9]+)*`.
- [ ] AC14: With `acme-base` published, a publish of `ACME-base` answers `409` with no snapshot; requests
      for `ACME-base` releases answer `404`; and every index entry and route spells a package exactly as
      published.
- [ ] AC15: A metadata revision through the management endpoint appends one `.cabal` entry with the next
      `x-revision` in one snapshot, after which `cabal info` on both lines shows the revised field and
      `cabal get` writes the revised file; a revision changing `name` or `version`, or skipping a number, is
      refused with no snapshot.
- [ ] AC16: Setting `acme-base`'s preferred versions to exclude 1.1.0 appends one `preferred-versions`
      entry in one snapshot, after which both cabal lines list 1.1.0 in parentheses and resolve `acme-app` to 1.0.0; with every
      release `acme-app` accepts excluded, both still install one; and `cabal update '{repo},{instant}'`
      before the entry resolves 1.1.0 again.
- [ ] AC17: Deleting `acme-base` 1.1.0 rebases the index in one snapshot without its entries, its tarball
      answers `404`, every client's next update succeeds with a whole index download, the coordinate stays
      retired after a backwards repoint and after the deleting snapshot is pruned, and the `Package` row
      survives deleting its last release.
- [ ] AC18: Every management operation and the upload binding is refused with no snapshot for a principal
      lacking its action (`push` for publish, revision and preferred versions, `delete` for deletion), answers
      `405` against a remote or virtual repository, and key operations are refused for every
      repository-scoped token.
- [ ] AC19: On a private repository over TLS, cabal 3.16.1.0 with userinfo in `url:` updates and installs,
      the transcript showing each request answered `401` with `WWW-Authenticate: Basic` and repeated with
      `Authorization: Basic`, index `Range` requests included; both Stack lines with userinfo in
      `download-prefix` update and unpack with preemptive Basic; cabal 3.8.1.0 is answered `401` and
      installs nothing; a credential-less request answers `401` identically for a private and a missing
      repository; a token lacking `pull` answers `404`; a rejected token answers `401`; plain HTTP carrying
      a credential is refused before lookup; and no credential appears in logs, error bodies or metrics.
- [ ] AC20: cabal 3.16.1.0's `Authorization: X-ApiKey {token}` authenticates as the same principal as the
      same token in Basic, and an `X-ApiKey` value naming no token answers `401`; and cabal 3.8.1.0's
      password upload, sent by `--digest`, exits non-zero with "http code 401" against this registry.
- [ ] AC21: A token holding `pull` patterned `acme-*/**` is refused `cabal update` and `stack update` at the
      first index or metadata request on every client, in hosted and proxied mode, while a scripted fetch
      under it downloads `acme-base` tarballs and answers `404` for `other-pkg`, the answer a nonexistent
      release gets; a token holding `push` patterned `acme-*/**` publishes `acme-new` through `cabal upload
      --publish` and is refused `other-new` with no snapshot; and an upload whose `package` part names no
      filename before its bytes is refused for that patterned `push` and accepted for an unpatterned one.
- [ ] AC22: A release the shared policy layer refuses answers `403` with `text/plain` naming the policy on
      its tarball routes, on the hosted and the proxied path, while the index keeps naming it; Stack 2.9.1
      prints the body, cabal exits 1 with "Unexpected response 403", Stack 3.11.1 exits non-zero; on a
      hosted repository no request reaches any other host, asserted at the network layer; and each refused
      download produces exactly one refusal record.
- [ ] AC23: With a stand-in upstream whose signed mirror list names a reachable second instance, a remote
      repository's `403` on a tarball sends both cabal lines to that instance, while a hosted and a virtual
      repository serve an empty signed mirror list so the same refusal sends no client anywhere, asserted at
      the network layer; and the operator documentation states the remote's exposure.
- [ ] AC24: A remote repository over a stand-in hackage-security repository served under a path prefix,
      and separately over the live hackage.haskell.org in the nightly job, serves `root.json`,
      `timestamp.json`, `snapshot.json`, `mirrors.json` and the index byte-identical to the upstream's, and
      every client configured with the upstream's root key ids updates and installs through it with only
      this registry reachable; the upstream receives one incremental index request per upstream change, and
      a second install from fresh containers produces no upstream request.
- [ ] AC25: For a proxied upstream revision whose snapshot hash, index hash, signature, root or version fails
      verification, or whose timestamp has expired, nothing is committed, the previous revision keeps
      serving within the stale bound, clients never receive a timestamp whose snapshot or index is not
      cached, and the real reason reaches the operator record; and a proxied tarball whose bytes do not
      match its `package.json`, or whose body is truncated, is never committed.
- [ ] AC26: A tarball request for a release no current or retained upstream revision names answers `404`
      with no upstream request, asserted at the network layer; an upstream tarball `404` is negatively
      cached while a `429` or `5xx` is neither cached as absence nor surfaced as not-found; an upstream
      redirect on the tarball route never reaches the client; and a stand-in presenting each removal-table
      event produces this format's classification in the table.
- [ ] AC27: A virtual repository over a hosted and a remote member serves a merged index signed with its
      own keys, which every client verifies with the virtual repository's key ids; a hosted `acme-base`
      placed first shadows the remote's `acme-base` so that no upstream release of it is listed or fetched,
      asserted at the network layer, including when the remote's release was merged first and the shadowing
      rebases the index; `cabal update '{repo},{instant}'` resolves by member entry times; Stack 3.11.1 and
      2.9.1 update against a merged log whose entry times are not monotonic; and publish to the virtual
      repository answers `405`.
- [ ] AC28: A proxied index above the inline metadata threshold, and a hosted index manifest whose segments
      are CAS blobs, survive a GC sweep while current or retained and serve every client afterwards; and a
      hosted repository's storage grows by the appended segment, not by a whole index, per publish.
- [ ] AC29: A policy rule depending on advisory data attached to a Hackage repository binds on both paths
      through the `Hackage` OSV ecosystem, refusing a release an advisory's range covers; and a rule
      requiring a verified signature serves a proxied tarball whose chain verified and refuses every hosted
      release with the reason that no author signature exists.
- [ ] AC30: The candidate route answers `400` whose body names `--publish`, the docs routes and
      `00-index.tar.gz` answer `404`, and a bare `cabal upload` and `cabal upload -d` on cabal 3.16.1.0 print
      those bodies and exit non-zero.
- [ ] AC31: Replay-match passes against a corpus recorded from hackage.haskell.org covering the recorded
      surface named in Design, with the `Authorization` header, URL userinfo, `X-ApiKey` values and upload
      bodies redacted.
- [ ] AC32: No response of this format carries a `Content-Encoding`, including to Stack's
      `Accept-Encoding: gzip`; every response carries `Accept-Ranges: bytes`; the index and tarball routes
      answer one byte range with `206` and `Content-Range` and an unsatisfiable one with `416`; both tarball
      routes, `package/{name}-{version}.tar.gz` and `package/{name}-{version}/{name}-{version}.tar.gz`,
      serve the same bytes with no redirect; TUF documents and the index carry `Cache-Control: no-cache`
      and a byte-derived `ETag`, and tarballs the immutable caching header.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/hackage/cabal_install_test.go` (both cabal images, network-restricted client containers, transcript order, key ids written into the stanza from the server in the case `script`, program output) |
| AC2 | conformance | `conformance/hackage/stack_unpack_test.go` (both Stack images with their configuration keys, unpacked tree compared with the sdist) |
| AC3 | conformance + property | `conformance/hackage/incremental_test.go` (index above 64 KiB, `Range` header and `206` asserted on all four); `internal/format/hackage/segment_prefix_test.go` (thirty writes, two compressor builds, prefix property) |
| AC4 | integration + property | `internal/format/hackage/index_consistency_test.go` (snapshot hashes against served bytes, trailer, entry order, injected clock stepped backwards) |
| AC5 | conformance | `conformance/hackage/tamper_test.go` (storage fault injection on tarball and index segment, each client's error text) |
| AC6 | conformance + integration | `conformance/hackage/rollback_test.go` (all four clients, repoint inside and beyond 64 KiB); `internal/format/hackage/pointer_version_test.go` (per-pointer counter under an injected clock stepped backwards) |
| AC7 | conformance | `conformance/hackage/promotion_test.go` (second pointer, byte comparison of index and tarballs, installs) |
| AC8 | conformance + integration | `conformance/hackage/expiry_test.go` (injected clock over three windows, expiry-checking cabal and Stack runs); `internal/format/hackage/resign_test.go` (no snapshot created) |
| AC9 | unit + integration | `internal/signing/tuf_canonical_test.go` (canonical JSON and ed25519 against hackage-repo-tool output and the live Hackage metadata); `internal/format/hackage/arch_test.go` (no key material in the handler) |
| AC10 | conformance | `conformance/hackage/rotation_test.go` (online and root rotation, clients holding the original root, fresh bootstraps with old and new ids) |
| AC11 | integration + conformance | `internal/format/hackage/offline_root_test.go` (threshold and key-map checks, refusal reasons); `conformance/hackage/offline_root_test.go` (clients follow the accepted root) |
| AC12 | conformance + integration | `conformance/hackage/publish_test.go` (cabal 3.16.1.0 token and password uploads, install on all four, idempotent republish, `409` cases with printed bodies); `internal/format/hackage/publish_snapshot_test.go` (snapshot counts, retirement after pruning) |
| AC13 | integration | `internal/format/hackage/ingest_test.go` (one malformed or hostile sdist per rule, CAS and snapshot unchanged) |
| AC14 | integration | `internal/format/hackage/names_test.go` (case-clash refusal, exact-case lookups, spelling in index and routes) |
| AC15 | conformance + integration | `conformance/hackage/revision_test.go` (management endpoint from the case `script`, `cabal info` and `cabal get` on both lines); `internal/format/hackage/revision_rules_test.go` (identity and sequence refusals) |
| AC16 | conformance | `conformance/hackage/preferred_versions_test.go` (parentheses, resolution, all-deprecated install, `index-state` before the entry) |
| AC17 | conformance + integration | `conformance/hackage/delete_test.go` (rebase absorbed by all four, `404` on the tarball); `internal/format/hackage/retirement_test.go` (backwards repoint, pruning, `Package` row survival) |
| AC18 | integration | `internal/format/hackage/manage_auth_test.go` (action refusals per operation and binding, `405` on remote and virtual, key operations refused for tokens) |
| AC19 | conformance + integration | `conformance/hackage/auth_test.go` (TLS private repository, challenge transcript on cabal 3.16.1.0, preemptive Basic on both Stack lines, cabal 3.8.1.0 refused, anonymous, `pull`-less, rejected and plain-HTTP cases); `internal/auth/leak_test.go` (redaction for this format) |
| AC20 | conformance + unit | `conformance/hackage/upload_auth_test.go` (`X-ApiKey` upload, cabal 3.8.1.0 password upload); `internal/auth/verifier_test.go` (`X-ApiKey` form, the sibling change to `auth.md`) |
| AC21 | conformance + unit | `conformance/hackage/pattern_test.go` (the pattern-refusal case `auth.md` AC8 and `format-handler-interface.md` AC7 require, both modes, all four clients refused at the index, scripted tarball fetches, patterned publish); `internal/format/hackage/scope_object_test.go` (the object table per route, `format-handler-interface.md` AC12) |
| AC22 | conformance + integration | `conformance/hackage/policy_test.go` (hosted and proxied modes through the `policies` key, printed text and exit status per client, network-layer assertion); `internal/format/hackage/refusal_record_test.go` (one record per refused download) |
| AC23 | conformance | `conformance/hackage/mirror_fallback_test.go` (a second declared instance as the signed mirror, remote versus hosted and virtual, network-layer assertion) |
| AC24 | conformance | `conformance/hackage/proxied_install_test.go` (prefixed stand-in, byte comparison of every TUF document and the index, upstream request counts, second install with no upstream request); nightly `conformance/hackage/live_upstream_test.go` (hackage.haskell.org) |
| AC25 | integration | `internal/format/hackage/proxied_chain_test.go` (each failing link, atomic revision switch, stale bound, operator record, tarball mismatch and truncation) |
| AC26 | integration | `internal/format/hackage/proxied_negative_test.go` (unnamed tarball, `404`, `429`, `5xx`, redirect); `internal/format/hackage/removal_test.go` (stand-in presenting each removal-table event) |
| AC27 | conformance + integration | `conformance/hackage/virtual_test.go` (merged index on all four clients, shadowing and the rebase, `index-state`, non-monotonic merged times on both Stack lines, `405`); `internal/format/hackage/virtual_merge_test.go` (per-package member order) |
| AC28 | integration | `internal/storage/metadata_root_test.go` (declared segment blobs and a proxied index across a sweep, then serving); `internal/format/hackage/segment_growth_test.go` (storage delta per publish) |
| AC29 | integration | `internal/format/hackage/policy_config_test.go` (advisory rule through the `advisories` key on both paths, signature rule against proxied and hosted releases) |
| AC30 | conformance | `conformance/hackage/unsupported_routes_test.go` (candidate, docs and legacy answers, cabal 3.16.1.0 output) |
| AC31 | conformance | `conformance/hackage/replay_test.go` (corpus replay against the recorded Hackage surface with the named redactions) |
| AC32 | integration + conformance | `internal/format/hackage/headers_test.go` (every route's encoding, range, type and caching headers, both tarball routes compared); `conformance/hackage/no_range_test.go` (all four clients send `Range` on their second update against the served headers) |

The case set needs only keys already in the harness's closed `setup` vocabulary (its resolved
closed-vocabulary decision, was Q4): `repositories` with type and virtual member order, `credentials`
(patterned tokens included), `upstreams` (stand-in hackage-security repositories with variants for a path
prefix, mutation, rebase, rotation, corruption, expiry and a mirror list), `state` for pre-published
releases, revisions and preferred versions, and `advisories` and `policies`, plus a second server instance
for AC23. Two obligations on the harness are recorded rather than assumed and listed in the sibling
consequences: a hosted `state` entry is servable only once the signing and index service has appended it
and signed the pointer's metadata, so the seed path invokes the same service the write path does, as
`debian.md` also requires; and the client's root key ids exist only once the repository does, so the case
`script` reads them from the server before writing the client's configuration, which is client-side work
the vocabulary already leaves to the script. The runner-enforced obligations, both modes and the
unauthenticated, unauthorized and pattern-refusal cases in each, apply from the sibling specs.

## Implementation Phases

### Phase 1: Hosted reads and the signed index
- Waits on `docs/internal/plans/foundation/signing-service.md` reaching `planned` (Blocking
  preconditions)
- The format-first mount, TUF documents from the signing service, the segmented index with appended gzip
  members, tarball routes, headers and ranges, seeded releases through `state`, the per-route addressed
  objects, the `403` policy rendering

### Phase 2: Publish and management
- Waits on `docs/internal/plans/foundation/management-api.md` reaching `planned`
- The upload binding with ingest validation, revisions, preferred versions, rebasing deletion and the
  retirement set, key rotation and offline roots, the write-boundary declaration under concurrency

### Phase 3: Pointers
- Waits on the `data-model.md` revisions (pointer-held documents, declared blob references)
- Per-pointer version counters, rollback and promotion, the expiry cadence

### Phase 4: Proxied path
- Waits on `upstream-adapters.md` and `artifact-verification.md`
- Verified upstream revisions, incremental upstream index fetches, chunked storage, verified tarball
  caching, negative caching, the removal table, `405` on remote writes

### Phase 5: Virtual repositories
- Waits on `async-operations.md`
- The merge with per-package member order, remote verification before merge, rebasing on retroactive
  shadowing, the virtual repository's keys

### Phase 6: Corpus and gate
- The recorded corpus against hackage.haskell.org and a local hackage-server for publish, all four clients
  in the matrix, the exception-list entries named in Design

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. The fifteen questions this draft raised were each written in the template's decision shape
and then adopted at their own recommendation under the owner's standing delegation of 2026-09-26, so the
loop can continue; each is recorded below as adopted rather than decided, folded through Scope, Design,
the criteria and the Test Plan in the same pass, and reversible by the owner at any time.
`grep -rn "standing delegation"` is the owner's review queue.

### Resolved: where timestamp and snapshot live, and what a pointer move does to their versions (was Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: `timestamp.json` and
`snapshot.json` belong to the pointer, each pointer carrying a counter that every re-signing raises by
one, so a rollback serves the earlier index under higher versions (Design, "Pointers, rollback and the
version counter"; AC6, AC7, AC8; Phase 3 and its precondition).

The question: a repoint serves an older snapshot, and every client refuses a TUF document whose version
is lower than the one it holds (captured on all four: "Version of <repo>/timestamp.json is less than the
previous version", exit 1).

**Recommendation:** A. It is the only option under which a rollback reaches a client at all, it matches
`debian.md`'s pointer-scoped envelope, whose data-model revision it shares, and the signing happens at
pointer transitions, never on a read.

| Option | You get | It costs |
|---|---|---|
| **A. Pointer-scoped documents with a per-pointer counter** | Rollback and promotion work on every client; expiry re-signs create no snapshot | The pointer-held document revision `debian.md` raised; promoted metadata are not byte-identical to the source's |
| **B. Snapshot-held documents numbered by snapshot** | No model change | Every rollback fails every client that updated past it, hard, until the pointer moves forward again |
| **C. Rotate the root at every repoint, clearing clients' cached versions** | Snapshot-held documents | A root rotation per rollback, each costing every client a root download and the operator a signing ceremony |

**Why this is yours:** it asks the shared model for a pointer-held record on a second format's account and
qualifies a promotion guarantee you settled.

Accepted cost: the shared revision and `data-model.md` AC22's qualification. B lost because it turns the
product's rollback into an outage; C lost on cost and on abusing the trust root as a cache flush.

### Resolved: how the compressed index is produced (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: each write appends one gzip member
and a final member holds the tar trailer; published members are never recompressed (Design, "The index is
an append-only log"; AC3).

**Recommendation:** A. All four clients read a multi-member index whole and incrementally (captured), and the
prefix stays stable across compressor versions, which Go does not promise for deflate output.

| Option | You get | It costs |
|---|---|---|
| **A. Appended gzip members** | Incremental updates survive every publish and every toolchain upgrade; each write compresses only its own entries | A divergence from Hackage's single-member file, on the exception list |
| **B. Whole recompression with one pinned compressor** | Hackage's shape | Any compressor change costs every client two failed attempts and a whole download (captured), and each write recompresses the whole index |
| **C. No incremental updates** | Simplicity | Every update downloads the whole index |

**Why this is yours:** it trades byte-likeness to Hackage for bandwidth that grows with the index.

Accepted cost: the exception-list entry.

### Resolved: how the index is stored (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the repository-level document holds a
manifest of segment blobs, one per write, which the core marks through a declared blob list (Design,
"Mapping onto the shared model"; AC28; Phase 3 precondition).

**Recommendation:** A. A whole-index blob per write is a gigabyte per write at Hackage's scale, and the
segments already exist as the gzip members of Q2's answer.

| Option | You get | It costs |
|---|---|---|
| **A. Segments with a declared blob list** | Storage and hashing per write proportional to the write | A revision of `data-model.md` and `storage-and-gc.md` |
| **B. One index blob per generation** | No model change | Storage per write proportional to the whole index, for every retained snapshot |

**Why this is yours:** it changes what the shared model lets a document reference.

Accepted cost: the shared revision, listed in the sibling consequences.

### Resolved: what a remote serves, and whether it may re-sign (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a remote serves the upstream's TUF
metadata and index byte for byte, verifies the chain on the way in, and never re-signs (Design, "The proxied
path"; AC24, AC25).

**Recommendation:** A. Clients keep verifying to Hackage's own keys (captured through the pass-through), and a
registry that holds no upstream key cannot re-sign without becoming a different trust root, which is what a
virtual repository is.

| Option | You get | It costs |
|---|---|---|
| **A. Byte-for-byte, verified, never re-signed** | End-to-end verification to the upstream's keys | The upstream's mirror list and expiry come with it |
| **B. Re-sign the remote with its own keys** | An empty mirror list and self-set expiry | Clients lose the upstream chain, and the remote duplicates the virtual repository |

**Why this is yours:** it decides whose keys a Haskell user trusts through a cache.

Accepted cost: the mirror-list and expiry exposure, stated in the operator documentation.

### Resolved: virtual repositories (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a virtual repository merges its members
per package in member order, verifies remote members first, signs with its own keys, and rebases on
retroactive shadowing (Design, "Virtual repositories"; AC27; Phase 5).

**Recommendation:** A. Stack reads one package index, so a Stack user with private packages has no other way,
and first-member-per-package stops a public squatter outranking a private package (captured with cabal's
default merge).

| Option | You get | It costs |
|---|---|---|
| **A. Re-signed per-package merge** | One URL for private and public packages on every client | A second trust root, and a rebase whenever shadowing changes retroactively |
| **B. No virtual repositories; cabal's `:override` only** | End-to-end verification everywhere | Stack users cannot combine private and public packages |

**Why this is yours:** it trades end-to-end verification for reach.

Accepted cost: the operator documentation gives cabal users the `:override` recipe that keeps end-to-end
verification.

### Resolved: candidate uploads (was Q6)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: `POST packages/candidates` answers `400`
telling the user to pass `--publish` (Scope; AC30).

**Recommendation:** A. A candidate is an unindexed per-version namespace no client resolves, and promotion
pointers already stage releases here.

| Option | You get | It costs |
|---|---|---|
| **A. Refuse with a message** | One namespace; a clear instruction cabal prints | A bare `cabal upload` fails until the user adds `--publish` |
| **B. Model candidates as a staging area** | Hackage parity | A second namespace per version beside pointers, with no client to test it |
| **C. Treat a candidate as a publish** | Nothing breaks | A user who meant to preview publishes for good |

**Why this is yours:** it changes the default command's outcome for Hackage users.

Accepted cost: the migration note.

### Resolved: what deletion means on an append-only index (was Q7)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: deletion rebases the index without the
release, answers `404` for its tarball and retires the coordinate (Design, "Revisions, deprecation and
deletion"; AC17).

**Recommendation:** A. A leaked secret in a tarball must be removable, and every client absorbs a rebase with one
whole download (captured).

| Option | You get | It costs |
|---|---|---|
| **A. Rebase and retire** | Real removal | One whole index download per client per deletion, and retention rules that rebase |
| **B. No deletion, as Hackage** | An index that only grows | Nothing can be removed, including secrets |
| **C. Keep the entries, remove the tarball** | No rebase | Clients still resolve the release and fail to download it |

**Why this is yours:** it decides whether removal costs every client a download.

Accepted cost: the operator documentation's warning about deletion and retention on this format.

### Resolved: how revisions are checked (was Q8)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a revision keeps `name` and `version` and
takes the next `x-revision`; nothing else is checked, and the author is recorded (Design, "Revisions,
deprecation and deletion"; AC15).

**Recommendation:** A. hackage-server's rules are a semantic diff through Cabal's own parser
(`CabalRevisions.hs`), which a Go server cannot reproduce faithfully, and a revision is authorized by the same
`push` that can publish anything.

| Option | You get | It costs |
|---|---|---|
| **A. Identity and sequence only** | Revisions for bound fixes | Revisions can change more than Hackage allows |
| **B. No revisions** | No metadata changes after publish | No way to fix bounds without a new release |
| **C. Reimplement Hackage's semantic rules** | Hackage parity | A second Cabal parser that disagrees with the real one |

**Why this is yours:** it decides how much a revision may change what gets built.

Accepted cost: the operator documentation says the rules are looser than Hackage's.

### Resolved: who holds the root keys (was Q9)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the signing service holds them by
default and accepts an operator-signed root (Design, signing-service requirement 8; AC11).

**Recommendation:** A. Most deployments cannot run a key ceremony, and the ones that can get TUF's offline-root
property.

| Option | You get | It costs |
|---|---|---|
| **A. Service-held by default, operator-held optional** | Works out of the box; offline roots available | Two custody modes to test |
| **B. Service-held only** | One mode | Root compromise equals server compromise, always |
| **C. Operator-held only** | TUF's intended custody | No repository without a key ceremony |

**Why this is yours:** it sets the trust model's default.

Accepted cost: the offline-root case in the suite.

### Resolved: names (was Q10)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: exact match, ASCII letters and digits,
case-clashing new names and trailing-zero variants refused (Design, "Names, versions and case"; AC13, AC14).

**Recommendation:** A. It is hackage-server's rule set minus its maintainer exception, which this registry has
no groups to express.

| Option | You get | It costs |
|---|---|---|
| **A. Hackage's rules** | No lookalike names or equal-looking versions | Migrated case-clashing pairs cannot both be published anew |
| **B. Cabal's grammar only** | Every name Cabal accepts | Lookalikes, and versions that look equal |

**Why this is yours:** it decides which names a private repository accepts.

Accepted cost: the migration note.

### Resolved: rendering a policy refusal (was Q11)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: `403` in `text/plain` on the tarball
routes, the index unchanged (Design, "Policy refusals on the wire"; AC22).

**Recommendation:** A. Eliding from a signed append-only index is a rebase per policy change on hosted and
impossible on a remote, and a refusal at the tarball reaches Stack 2.9.1's user with its reason.

| Option | You get | It costs |
|---|---|---|
| **A. `403` at the tarball** | No silent downgrade; one mechanism on every path | cabal and Stack 3.11.1 users see no reason, only the record does |
| **B. Elide from the index** | Resolution picks an allowed release | A rebase per policy change, impossible on remotes |

**Why this is yours:** it trades an explained refusal against resolution around it.

Accepted cost: the operator documentation points cabal users at the refusal record.

### Resolved: the signature verdict for this format (was Q12)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: verified (repository chain) for a proxied
tarball under a verified upstream revision, absent for a hosted one (Design, "Signing, provenance and policy";
AC29).

**Recommendation:** A. The upstream chain is a real signature over the tarball's digest by keys the operator
chose to trust, and this registry signing its own index attests nothing about the author.

| Option | You get | It costs |
|---|---|---|
| **A. Chain verdict proxied, absent hosted** | Signature rules meaningful on remotes | Such a rule refuses every hosted release |
| **B. Absent everywhere** | No claim about repository signing | Signature rules useless for Haskell |

**Why this is yours:** it decides what "signed" means in a Haskell policy.

Accepted cost: the operator documentation states the hosted consequence.

### Resolved: the `X-ApiKey` scheme (was Q13)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: `auth.md`'s verifier gains cabal's
`X-ApiKey` scheme as a fifth presentation form of the same token (Design, "Authentication"; AC20).

**Recommendation:** A. cabal 3.16's only token upload sends it (captured), and it is the same token, with no new
credential kind.

| Option | You get | It costs |
|---|---|---|
| **A. Accept `X-ApiKey`** | Token uploads from cabal | A change to `auth.md`'s AC31 |
| **B. Basic only** | No change to `auth.md` | cabal users upload with a password prompt or flag |

**Why this is yours:** it changes the shared verifier for one client.

Accepted cost: the sibling change, listed in the consequences.

### Resolved: the addressed object of an upload (was Q14)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: an upload whose `package` part names its
filename before the bytes reports `{name}/{version}` from it; any other reports none (Design, "Addressed
objects and pattern scopes"; AC21).

**Recommendation:** A. It is the fail-safe rule of `pypi.md`, `ansible-collections.md` and `puppet.md`, and cabal
sends the filename first (captured).

| Option | You get | It costs |
|---|---|---|
| **A. Filename when first, else none** | Patterned `push` works for cabal; fails safe otherwise | Nothing for the pinned clients |
| **B. Buffer and parse before authorizing** | Patterned `push` for any body | Spooling unauthorized uploads |

**Why this is yours:** it decides which uploads a narrow token supports.

Accepted cost: none for the pinned clients.

### Resolved: hackage.haskell.org as a preconfigured upstream (was Q15)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: not preconfigured; the operator
documentation gives the remote and Hackage's root key ids (Design, "The proxied path").

**Recommendation:** A. `proxy-cache.md` AC19 names the preconfigured set, and adding a Tier 3 format there is a
change to that spec.

| Option | You get | It costs |
|---|---|---|
| **A. User-configured** | No change to the shared set | A configuration step |
| **B. Preconfigure Hackage** | Zero configuration | A change to `proxy-cache.md`'s criterion and nightly job |

**Why this is yours:** it sets Haskell users' first-run behaviour.

Accepted cost: the configuration step.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | d31e54b | authoring pass: grounded first draft, not a review | Grounded five ways: captured traffic from cabal-install 3.16.1.0 and 3.8.1.0 and Stack 3.11.1 and 2.9.1, each from the upstream haskell image pinned by digest, on dedicated Podman networks against a logging stub (HTTP, TLS, and a second instance as a signed mirror) serving repositories built and signed with hackage-repo-tool 0.1.1.5 and crafted generations (bootstrap and every update path, the `Range` incremental index against a 505 KB index, a changed compressor failing twice then downloading whole, appended gzip members read whole and incrementally by all four, rollback as stored failing every client in a five-iteration verification loop and re-signed at a higher version adopted by all four, expiry checked only under cabal's inverted `--ignore-expiry` and Stack's `ignore-expiry: false`, fallback to a signed mirror on any `403`, online-key rotation followed and root rotation accepted only with retained old keys and cross-signatures, revisions and `preferred-versions` as appended entries, `index-state`, a malformed `.cabal`, tampered tarballs, the credential split between the cabal lines and between their uploads, Stack's two configuration keys, cabal's repository combining); the hackage-security, cabal-install, hackage-server and Stack sources and docs; the live hackage.haskell.org (TUF metadata and its signatures verified independently, index shape and 358,366 monotonic entries, headers, redirects, Digest-only upload challenges, a byte-for-byte pass-through that cabal 3.16.1.0 and Stack 3.11.1 verified with Hackage's own keys, and Stack 2.9.1's pre-rotation key ids failing against the live root); and OSV (32 `HSEC-` advisories under `Hackage`) and purl. Fifteen questions written in decision shape and adopted under the standing delegation: pointer-scoped timestamp and snapshot with a per-pointer counter (AC6, AC7, AC8), appended gzip members (AC3), segmented index storage with declared blob references (AC28), remotes byte for byte and never re-signed (AC24, AC25), re-signed per-package virtual merges (AC27), candidates refused (AC30), rebasing deletion (AC17), revisions checked for identity and sequence only (AC15), service-held roots with an operator-held option (AC11), Hackage's name rules (AC13, AC14), `403` at the tarball (AC22), the repository-chain signature verdict (AC29), `X-ApiKey` in the shared verifier (AC20), the publish object from the multipart filename (AC21), no preconfigured upstream. Thirty-two criteria, each with a Test Plan row. Stays draft; awaits an independent review. |
