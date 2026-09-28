---
status: draft
status_description: "Format closing sweep 2026-09-28 at a3a9d78 on Opus (not a review): the merging profile declares its member-input path (01-index.tar.gz, literal, one index per repository, whose remote route fetches the whole revision as a paired set); a remote member's adoption re-merges through the adoption hook (signing-service was-Q16, AC35) and a virtual-only remote is revalidated by the virtual's reads (proxy-cache AC26); the virtual's TUF version rises from its pointer's counter at every merge commit and member-list change (was-Q15, AC34); composed remote indices need a verified verdict, which every adopted revision has (was-Q17, AC36); root.json and mirrors.json renewal cited to signing-service AC33, index byte ranges over declared segments to its AC30, tarballs through ServeFile (was-Q14) and Cache-Control per format (was-Q18); the identical republish is management-api's declared unchanged publish (was-Q15) and the retired claim is checked at declaration and again at commit (was-Q14; AC12 extended); Operations() declares publish, annotate and delete-version only, configure arriving on the signing-key routes, and AC16's row names its entry point (management-surfaces item 10); Hackage's ordering cited as vendored (supply-chain AC17); the publish half recorded against a pinned hackage-server, one exception-list row reported (AC31). DATA-LOSS AUDIT: nothing further held by mention. No question adopted; 34 criteria. Earlier: Data-loss fix 2026-09-28 at 93982ba on Opus (not a review): a remote's previous revision is retained until the next adoption (was 'for the stale limit', a duration nothing enforced), its index chunks the current revision does not declare and any CAS-backed TUF document on the remote's declared blob-digest list (proxy-cache was-Q19, AC27); a changed SHA-256 for a cached release now ends the old blob's cached reference at the new commit, the route already following the current revision (proxy-cache was-Q20, AC28); the integrity-failure rows and AC25 say 'the adopted revision' so 'previous revision' means only the retained one; AC26 and AC28 extended. Earlier: Reconciled 2026-09-28 at 20ff418 with the foundation wave on Opus (not a review): the index and every TUF document generated through signing-service's Indexer and generator package internal/format/hackage/index on the pre-commit hook; timestamp and snapshot versions are data-model's per-pointer generation counter and expires is moved_at plus the window (AC6, AC36 there); the four TUF documents are PointerDocument records, root.json and mirrors.json identical on every pointer under adopted Q16 (AC34); segments declared through data-model's blob-digest list (AC28); ed25519 SigningKey roles, the root-chain rotation profile, the external backend for an operator-held root and the signing.resign cadence (AC9 to AC11, AC8); publish, annotate and delete-version on management-api with the POST upload binding and core-held retirement (AC12, AC17, AC18); X-ApiKey now in auth.md AC31 (AC20); TUF documents are descriptors so a patterned pull reads them and fails at the index (AC21); WriteRefusal and the holds/restricted-egress binding row (AC22, AC23); the tuf entry, tuf-root trust set and repository-chain verdict (AC25, AC29); paired revisions, regression not adopted and proxy-cache event classes (AC25, AC26); index.merge with a rising virtual version (AC27); Capabilities and the rename case (AC33). Earlier: authored 2026-09-26 from captures of cabal-install 3.16 and 3.8 and Stack 3.11 and 2.9; fifteen questions adopted under the standing delegation, a sixteenth at this reconciliation; none open. Awaits a /spec review pass."
description: "Spec for Hackage (Haskell) repositories served to cabal-install and Stack through hackage-security: the only catalogue format with The Update Framework, so hosted and virtual repositories get root, snapshot, timestamp and mirrors metadata from the shared signing service with per-pointer version counters that make a rollback reach clients instead of failing them, an append-only 01-index.tar.gz built as appended gzip members so incremental Range updates survive every publish, uploads through cabal upload --publish, revisions, preferred-versions deprecation and rebasing deletion as registry-owned operations, a byte-for-byte proxied cache that never re-signs Hackage's metadata, and re-signed virtual repositories."
author: michielvha
goal: "Serve Haskell users a private Hackage and a verified cache of hackage.haskell.org that stock cabal-install (3.16 and 3.8) and Stack (3.11 and 2.9) update, verify end to end against root keys they hold, and install from, with a rollback that reaches every client and no refusal a signed mirror list can route around."
priority: "low"
issue: 37
created: 2026-09-26
covers:
  - "internal/format/hackage/**"
  - "conformance/hackage/**"
fable_recheck: "authored on Opus 2026-09-27 while Fable was out of monthly credit; grounded in captured client traffic, but the design judgement was never Fable-reviewed. Reconciled on Opus 2026-09-28 (format batch 6), adopting Q16 (root.json and mirrors.json as PointerDocument records identical on every pointer, re-rendered in one batch on any root or mirror change), which also needs a Fable recheck; the data-loss fix on Opus 2026-09-28 folded proxy-cache's adopted Q19 and Q20 into the proxied path (the previous revision retained until the next adoption with its blobs on the remote's declared list, the old tarball blob released at the new commit), which needs the same recheck"
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
`docs/internal/plans/foundation/signing-service.md`, the first item of the charter's step 7:
through the optional `Indexer` interface and this format's generator package
`internal/format/hackage/index`, run by the shared write path's pre-commit hook (its "The generator
contract" and "The write path dispatches", AC1). Its Phase 2 (pointer documents, cadence re-signing
and the rotation profiles) and its Phase 3 (the `external` backend and the TUF root chain,
"completing the TUF root chain for Hackage" in the charter's step 11) are what this handler needs
beyond Phase 1. What this format requires of it is stated in Design ("What the signing and index
service must provide"), each item mapped onto that spec's contract, never designed here.

**The management API must be `planned` before Phase 2.** Publish, metadata revisions,
deprecation and deletion are operations of `docs/internal/plans/foundation/management-api.md`,
whose core the charter builds at step 2 and whose publish and bindings land in its Phases 2 and 3;
its cross-format reconciliation table carries this format's four rows, and `cabal upload
--publish` is the binding `POST upload` onto its `publish` kind. Key rotation and the operator-held
root are `configure` operations on its signing-key routes, applied by `signing-service.md` (its
AC15, AC16; `management-api.md` AC32).

**The data model carries what this format needs; it must be `planned` before Phase 1**, which the
signing service's own Phase 1 entry condition already requires. The two
revisions this spec raised are in `data-model.md`: the pointer's freshness record with its
generation counter and the `PointerDocument` record outside snapshot content, which this format's
`timestamp.json` and `snapshot.json` are (its "Freshness scoped to the pointer, and the documents
that hang on it", AC36), and the declared blob-digest list a document uses to name the blobs it
consists of, which the segmented index is (the same section, AC37), marked through by
`storage-and-gc.md`'s fourth root (its AC16). Neither is a table this handler owns.

**The proxied path depends on shared services that now exist as specs**: the transport of
`docs/internal/plans/foundation/upstream-adapters.md` (charter step 4; its requirements table row
for this format: incremental `Range` fetches and redirects followed inside the adapter, its AC8
and AC15), the fetch-and-cache contract of `proxy-cache.md` (declared digests, paired revisions,
the cache-scoped freshness record, the removal event classes), and the TUF chain entry of
`docs/internal/plans/foundation/artifact-verification.md` (its `tuf` scheme and AC17, built with
this format in its Phase 4 at step 11). The virtual merge runs as the `index.merge` job on
`docs/internal/plans/foundation/async-operations.md`'s queue core, which the charter builds at the
start of step 4b, so it exists long before this handler; that spec must be `planned` before
Phase 5.

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
- **The declared capabilities** `format-handler-interface.md` AC13 names, and the shared rename
  case `repository-lifecycle.md` AC12 requires of every format.

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
  time). The retirement set of deleted versions is **not** here: it is core-held, a `Retirement`
  record per retired coordinate outside snapshot content, written in the deleting operation's
  transaction and never pruned (`management-api.md`, "Retirement is core-held", its resolved
  retirement-placement decision, was Q3 there; `data-model.md` AC35), so no repoint can restore a
  document that predates a retirement.
- **The repository-level document** holds the **index manifest**: the ordered list of segments, one
  per write, each naming the CAS digest of its raw tar bytes and of its gzip member, the running
  lengths, and the SHA-256 state of the tar and gzip streams after the last segment, so the next
  write hashes only what it appends. It also holds the repository's case index of names.
- **Not snapshot content**: all four TUF documents are `PointerDocument` records
  (`data-model.md` AC36; `signing-service.md`, "Storage"): `timestamp.json` and `snapshot.json`
  carry the pointer's own version, and `root.json` and `mirrors.json` carry the repository's current
  root and mirror list, byte-identical on every pointer, per the resolved root-placement decision
  below (was Q16). The keys themselves are `SigningKey` records. So no repoint can restore an older
  root or a lower version (next sections).
- **A remote repository's current documents** are its adopted upstream revision, each carrying
  `proxy-cache.md`'s cache-scoped `adopted_at` and one paired-set id for the whole revision
  (`data-model.md` AC44), with the previous revision retained until the next adoption drops it,
  the default count of `proxy-cache.md`'s resolved retained-revision decision (was its Q19); every
  blob kept for the retained revision (its index chunks the current revision does not also declare,
  and any of its TUF documents stored CAS-backed) is on the declared blob-digest list of the remote's
  repository-level document, the only way a document keeps another blob alive (`storage-and-gc.md`
  AC16), because a digest the retained revision's `snapshot.json` or index merely names keeps
  nothing alive (Design, "The proxied path"); the verdict on each cached tarball is `artifact-verification.md`'s record, keyed by
  the tarball's digest, outside the format entity model (`data-model.md`'s verification-records
  row). None of it is snapshot content.

**The segments need the core to see them, and now it does.** The manifest names segment blobs
inside an opaque document, which no mark root can read, and the per-write alternative (a whole
index blob per generation) costs a gigabyte per write at Hackage's scale. Per the resolved
index-storage decision below, the document **declares the digests of its segments** to the core:
the generator's `Generate` returns them beside the document (`signing-service.md`, "The generator
contract"), `data-model.md` carries the declared blob-digest list (its "Freshness scoped to the
pointer, and the documents that hang on it", AC37), and `storage-and-gc.md`'s fourth mark root
marks through it, so a segment is live while any current or retained document declares it and
collectable once none does (its AC16; `signing-service.md` AC5 asserts the survival). A remote's
chunked upstream index declares its chunks the same way, and the retained previous revision's
chunks stay declared on the remote's repository-level document until the adoption that drops that
revision (`proxy-cache.md` AC27).

### The hosted publish path and what counts as a write

`cabal upload --publish` is the one write a client triggers, so, following `debian.md`'s dput
decision and `puppet.md`'s Forge binding, **`POST {base}/upload` is a client binding onto the
`publish` kind of `docs/internal/plans/foundation/management-api.md`**, the binding its
cross-format reconciliation table names for the Hackage row (its "Bindings: one operation, two ways
in"). The handler declares it through the optional `Operator` interface's `Bindings()`, and the
route has no behaviour of its own: it streams the part named `package` into the CAS as an upload
session's bytes, its SHA-256 computed in the stream, constructs the `publish` operation with the
committed digest and the coordinate the filename declares, and submits it through `Submit`, the
same entry point the API's publish uses, so the two produce byte-identical documents and snapshot
deltas (`management-api.md` AC8). The binding renders the operation's outcome in cabal's wire, and
cabal prints the body of every refusal (captured): `200` with a one-line body (cabal prints it under
"Warnings:"); `400` naming the rule for content the handler's `Apply` refuses as `validation`;
`409` for an existing coordinate with different bytes (`conflict`) and for a retired one, which the
shared write path refuses with the `retired` problem, checking the claimed `{name}/{version}` when
`Authorize` declares it, before `Apply` runs, and again at commit, serialised with any retiring
write on the repository head, so a deletion committing in between cannot let the publish land
(`management-api.md`'s resolved retirement-check decision, was Q14, AC12; `storage-and-gc.md`
AC30);
`401` and `404` per `auth.md`; `405` with the `repository-type` problem against a remote or virtual
repository, identically through the binding and the API (`management-api.md` AC7).

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
  `409` unless the bytes are identical, which answers `200` and creates no snapshot: this handler
  declares `management-api.md`'s unchanged publish (its resolved unchanged-publish decision, was
  Q15, AC5), so the `Operation` completes with `unchanged: true` and no snapshot reference and no
  pointer, version counter or TUF document moves, which is what lets a CI retry of `cabal upload
  --publish` succeed; a deleted
  version answers `409` with any bytes, including after the deleting snapshot is pruned and across a
  backwards repoint, because its `Retirement` record is core-held and checked centrally, with
  nothing for this handler to carry forward (`management-api.md` AC12, `data-model.md` AC35); a
  version differing from an existing one only by trailing zeros (`1.2` beside `1.2.0`) answers
  `409`, as hackage-server refuses it.
- **Names**: a new package whose name differs only in case from an existing one answers `409`
  (hackage-server's case-clash rule; this registry has no maintainer groups to except anyone); a name
  whose index paths do not fit a ustar entry's name and prefix fields answers `400`.

`data-model.md` requires each format spec to declare its ecosystem's write boundaries. Hackage's
declaration:

- **One publish is one completed logical write and one snapshot**, appending one index segment with
  the release's `package.json` and `.cabal` entries, in that order, as the live index writes them;
  the one exception is the declared unchanged publish above, which completes with no snapshot.
- **A metadata revision, a change of a package's `preferred-versions` and a deletion are each one
  write**; a retention pass over a repository is one write however many versions it removes.
- **Two concurrent publishes** queue on the signing service's per-document transaction lock over the
  index manifest (`signing-service.md`, "Contention", AC28) and fall back to the revision-token retry
  `data-model.md` makes mandatory (its AC20) where the lock does not cover them; both land as two
  snapshots, each segment after the other, and each entry's time is the later of the write's commit
  time and the manifest's last entry time, so the log never goes back in time, whatever the clock
  does. The two publishes are never merged into one regeneration (`signing-service.md`, "The write
  path dispatches").
- **A deletion is one write**, the core writing its `Retirement` record in the same transaction.
- **Re-signing** the TUF documents on the expiry cadence, at a key rotation or when an operator-held
  root is accepted is not a write and creates no snapshot: it produces `PointerDocument` records
  only (`signing-service.md` AC8, AC22). A proxied repository creates no snapshots.

### Every hosted index is a write-triggered signed document

Per `write-triggered-services-prototype.md`'s class and `debian.md`'s split, which this spec follows
rather than re-deciding, and as `signing-service.md` now specifies it (its "Storage: bodies in the
snapshot, signatures as records, envelopes on the pointer"):

- **Index segments are snapshot content**, produced by this format's generator inside the write that
  triggers them, dispatched by the shared write path's pre-commit hook with no call from the handler
  (`signing-service.md` AC1; `data-model.md` AC37's hook), in the same snapshot as the change, so a
  repoint restores them, as `data-model.md` AC13 requires of all three levels. An untouched package
  never changes bytes.
- **`snapshot.json` and `timestamp.json` belong to the pointer**: `PointerDocument` records
  produced inside the write for the default pointer (so the publisher sees the release at its next
  update), at every promotion or rollback inside the repoint, on the expiry cadence and at key
  rotation, and never snapshot content (`signing-service.md` AC10; `data-model.md` AC36).
- **`root.json` and `mirrors.json` belong to no snapshot either**: they are `PointerDocument`
  records carrying the repository's current root and mirror list, byte-identical on every pointer
  and re-rendered on every pointer at once whenever either changes (the resolved root-placement
  decision below, was Q16), so every pointer's `snapshot.json` names the current ones and no repoint
  restores an older root.
- **A deletion rebases the index**: the generator regenerates the log without the deleted release's
  entries as one new segment list, a non-prefix change every client absorbs with one whole download
  after two failed incremental attempts (captured for any non-prefix change). Rebases are therefore
  rare administrative events, which the operator documentation says of deletion and of retention
  rules on this format; a retention pass is a write like any deletion and runs the same generator
  (`signing-service.md` AC1).

### Pointers, rollback and the version counter

Each pointer carries a **version counter**, and it is not this handler's: it is the **generation
counter** of the pointer's freshness record in `data-model.md`, advanced by one at every pointer
transition (a write advancing the default pointer, a promotion, a rollback, a key switch, a cadence
re-sign), written only by the transition itself in the transaction that moves the pointer, and never
lowered by a clock step (its "Freshness scoped to the pointer", AC36). Per the resolved
pointer-metadata decision below, every `timestamp.json` and `snapshot.json` produced for a pointer
carries that counter's value as its TUF `version`, so both documents share one sequence that only
rises, and the counter is the one this spec's per-pointer requirement asked for. The generator
writes it from the record and never computes it, and `expires` is the record's `moved_at` plus the
role's window, so no freshness value in a served TUF document comes from a clock in the handler or
the service (`signing-service.md`, "Freshness scoped to the pointer: the split with
`data-model.md`", AC10, AC27). Versions may skip numbers where a transition re-renders nothing on a
pointer; the clients refuse only a decrease (verifyRole', captured), so a gap is harmless. What each
transition does:

| Transition | Index served | `snapshot.json` and `timestamp.json` | What a client that updated before sees |
|---|---|---|---|
| A write advances the default pointer | The new generation, an extension of the last | Re-signed at the pointer's advanced counter, inside the write | An incremental `Range` update |
| Rollback to an earlier snapshot | That snapshot's generation, a prefix of what the client holds | Re-signed at the advanced counter over the earlier index, inside the repoint | The earlier index: one `Range` request inside 64 KiB, otherwise a whole download (captured) |
| Promotion to an environment pointer | The promoted snapshot's generation | Re-signed on that pointer's own counter | Byte-identical index and tarballs; metadata that differ only in version, expiry and signature |
| A deletion (rebase) | A regenerated generation | Re-signed at the advanced counter | Two failed incremental attempts, then a whole download (captured) |
| Re-sign on the expiry cadence | Unchanged | Re-signed at the advanced counter with a new expiry | `timestamp.json` and `snapshot.json` only |
| A key switch, a root renewal or an accepted operator-held root | Unchanged | Every pointer's four documents re-rendered, each pointer's counter advanced | The new root or key, followed as in the rotation item below |
| Serving an older snapshot's metadata as stored | (never done) | (lower versions) | "Version of <repo>/timestamp.json is less than the previous version", exit 1 (captured) |

The accepted cost, as in `debian.md`, is that a promoted environment's metadata are not
byte-identical to the source environment's: the index and tarballs are, the version, expiry and
signatures are not. `data-model.md` now states this qualification of its AC22 for both formats
("AC22 is qualified, not weakened": content is byte-identical across environments, pointer
documents and freshness signals are not; its AC36). A version equal to the last with different
content is accepted by the clients (verifyRole' refuses only a decrease; captured), but the counter
never relies on it.

Every TUF document and the index are served through the index runtime's `ServeDocument`, never by a
header this handler sets (`signing-service.md` AC11's architecture test): a byte-derived `ETag`, the
`Cache-Control` this format's profile declares (below), and a `Last-Modified` from the record's
`moved_at`, which no pinned client reads, since none sends a conditional request (captured).

### What the signing and index service must provide

Stated so the dependency on `docs/internal/plans/foundation/signing-service.md` cannot be lost, in
the shape `debian.md` and `alpine.md` use; that spec lists these as `hackage.md`'s ten items (its
"Who depends on this" table) and each is mapped onto its contract below:

1. **Keys per hosted and per virtual repository, ed25519 only**, the one scheme hackage-security
   reads (every key in the live root is ed25519): a root role of three keys at threshold two by
   default (hackage-repo-tool's default), one snapshot key, one timestamp key and one mirrors key,
   each a `SigningKey` whose purpose is its TUF role (`signing-service.md`, "Key custody": `root`,
   `snapshot`, `timestamp`, `mirrors`), and a `targets` role declared in `root.json` with no keys,
   the live Hackage's shape, which every client accepts (captured through the pass-through), so no
   `targets` key exists. The profile constrains every role to ed25519 ("Hackage ed25519 only"), so a
   role requested on the `pkcs11` backend, which offers no Ed25519, is refused at key creation with a
   message naming the ceiling, never at the first publish (its AC13). Key ids are the SHA-256 of the
   key's canonical JSON form, as hackage-repo-tool and the live root compute them, and equal to
   hackage-repo-tool's (its AC12). Neither the handler nor the generator package can reach a private
   key or import a signature library, which `signing-service.md` AC2's architecture tests assert for
   every format, as `write-triggered-services-prototype.md` AC5 does for Debian.
2. **Canonical JSON signing byte-compatible with hackage-security**: signatures over the canonical
   form of `signed`, `"method": "ed25519"`, every signing key listed in the document's key
   environment; the service's TUF canonical-JSON envelope codec in `internal/signing/tuf`, its
   assembly a framing of the signatures into the document, never a signing operation on a read
   (its "Key custody", AC6). Every signature is self-checked before commit through
   `artifact-verification.md`'s `tuf` entry with the public material the service publishes (its
   AC17), and the same verifier checks the live Hackage's metadata in this spec's AC9, so producer
   and verifier agree on canonical JSON against a reference neither wrote.
3. **The documents**, declared in the generator's `Profile` as pointer-level document keys
   (`signing-service.md`, "The generator contract"): `root.json` (version, expiry one year by
   default, keys, roles), `mirrors.json` (an empty list unless the operator configures mirrors,
   expiry one year), and per pointer `snapshot.json`, naming `<repo>/01-index.tar.gz`,
   `<repo>/01-index.tar`, `<repo>/root.json` and `<repo>/mirrors.json` each with `sha256` and
   `length`, and `timestamp.json`, naming `<repo>/snapshot.json`; both expire three days after
   signing by default, the live Hackage's window. The windows are this format's profile
   declarations, not instance keys.
4. **The version counter per pointer**, durable across restarts and never lowered by a clock step:
   `data-model.md`'s generation counter, rendered by the generator (the section above;
   `signing-service.md` AC27).
5. **Re-signing without a write**: `timestamp.json` and `snapshot.json` at half their window,
   `root.json` and `mirrors.json` at half theirs, for every pointer including idle environments,
   creating no snapshot, which is the `signing.resign` schedule at `signing.resign_at_fraction`
   (default `0.5`), its next run derived from the stored documents' expiry so a restart loses
   nothing (`signing-service.md`, "Rotation profiles", AC22). A root or mirror list the service holds
   is renewed as one new version for the repository and re-rendered on every pointer in one batch,
   never once per pointer (the resolved root-placement decision below), by the one
   repository-scoped `signing.resign` schedule, exclusive per repository, which alone renews a
   repository-scoped pointer document (`signing-service.md` AC33); where the operator holds the
   root, the `SigningDocumentExpiring` alert fires `signing.external_expiry_lead` (default 14 days)
   before its expiry (its AC22). The default clients ignore expiry (captured), so this is for the
   opt-in clients, and it is a hard requirement for them.
6. **Index generation inside the write**: the generator's `Generate` appends one segment for the
   write, ustar entries with a fixed owner (the live index carries the uploader's name, which leaks
   identities to every reader), each entry's time as in the write boundary above, one gzip member
   per segment plus a final trailer member, the running SHA-256 and lengths carried in the manifest,
   and returns the segment digests as the document's declared blob list (`signing-service.md`, "The
   generator contract"); it never recompresses a published segment, streams each member to the CAS
   without buffering the index (its AC5), is deterministic over the same records (its AC25), and
   `Affects` names only the manifest and the pointer documents, never another package's entries
   (its AC4). A rebase regenerates the whole log once.
7. **Rotation with overlap**, through the management API: `signing-service.md`'s `root-chain`
   rotation profile (its "Rotation profiles", AC7), an atomic cutover that creates no snapshot (its
   AC8), each step a `configure` operation on the signing-key routes (`management-api.md` AC32;
   `signing-service.md` AC15). Online keys (snapshot, timestamp, mirrors) rotate by a new root
   version signed by the current root threshold: clients meet the unknown key, fetch the root and
   continue (captured on both cabal lines: "Could not deserialize <repo>/timestamp.json: Unknown
   key", then success). Root keys rotate by a new root whose root role holds the new keys, whose key
   map keeps the old root keys, and which carries a threshold of signatures from both, which a
   client still holding the first root accepts directly and a fresh client bootstraps from with
   either set's ids (captured on both cabal lines). A root signed by the new keys alone is refused by
   such a client ("does not have enough signatures", captured), and one carrying an old key's
   signature without listing that key fails to parse ("Unknown key", captured), because
   hackage-security checks only against the cached root and never walks intermediate versions. The
   old root keys therefore keep cross-signing for `signing.rotation_window` (default 30 days, an
   operator-set window), and rotation is announced, because a client bootstrapping with ids the new
   root's signatures no longer reach fails: Stack 2.9.1's built-in pre-2025 Hackage key ids fail
   against the live root today ("<repo>/root.json does not have enough signatures signed with the
   appropriate keys", captured).
8. **Operator-held root keys**, per the resolved root-custody decision below: the `external`
   custody backend, which holds public material only, and its submit operation, which accepts a
   `root.json` the operator signed offline (with hackage-repo-tool, for instance), verifies it
   against the current root under this format's rule, refuses it with a problem naming the failing
   check otherwise, and serves it (`signing-service.md`, "Key custody", AC16), so a deployment can
   keep its root keys off the server while the online roles live on the `file` backend, the mix TUF
   intends.
9. **The key ids and threshold** shown in the management surface's key listing with each key's
   fingerprint (`signing-service.md` AC12), in the forms cabal's `root-keys` and Stack's `keyids`
   take, readable by a conformance case's `script` before its client runs (its AC21).
10. **The virtual merge** (Design, "Virtual repositories"): the generator's `Merge`, run as the
    deferred `index.merge` job when a member's document set changes or a remote member adopts a new
    revision (its adoption hook, was Q16, AC35), coalesced per virtual, never on a request's path,
    signed with the virtual repository's own keys at a TUF version the virtual pointer's counter
    raises at every merge commit (its was-Q15, AC34) (`signing-service.md`, "Virtual merges", AC19),
    with the member-input path the profile declares.

Verification of an upstream's TUF chain is not the signing service's: it belongs to artifact
verification (`signing-service.md`, "The produce/verify boundary"; Design, "The proxied path").

### Revisions, deprecation and deletion

Per the cross-format precedent (`pypi.md`'s resolved hosted-yank decision, with `npm.md`,
`cargo.md`, `julia.md`, `puppet.md` and `conan.md`), each operation is a completed logical write
through the shared write path, bound onto the kind `management-api.md`'s cross-format
reconciliation table assigns the Hackage rows, carrying that kind's action, hosted only, its trigger
verified by integration tests and its effect by the real clients
(`docs/internal/analysis/management-surfaces-and-the-oracle.md`). **No client in the matrix triggers
any of them but publish**: neither cabal line nor Stack has a revise, deprecate or delete command.
The handler declares the kinds through `Operator.Operations()` and implements them in `Apply` inside
the transaction `Submit` opens, and every declared kind is driven by a `script` case
(`management-api.md` AC24, enforced before any container starts by `conformance-harness.md` AC26).
**`Operations()` declares exactly `publish`, `annotate` and `delete-version`.** `configure` is not
among them: this format declares no `settings` document, so no repository `PATCH` dispatches a
`configure` to this handler, and the key operations of the last row arrive only on
`management-api.md`'s signing-key routes, each a `configure` whose `Apply` is `internal/signing`'s
with this format's generator run in the same transaction (its "Signing keys"; `signing-service.md`
AC15). The rename notice `management-api.md` hands every `Operator` inside a rename transaction is
accepted and changes nothing, since nothing this format serves names the repository (Design,
"Capabilities and lifecycle"). The per-kind rule therefore asks for three `script` cases, which
AC12, AC15, AC16 and AC17 are, and AC10 and AC11 drive the signing-key routes from their case
`script` as well:

| Operation | Effect a client sees | Kind | Action |
|---|---|---|---|
| Publish a release | The release appears in the index | `publish` (binding: `POST upload`) | `push` |
| Revise a release's `.cabal` | A new `.cabal` entry with the next `x-revision` is appended; `cabal info` and `cabal get` use it (captured) | `annotate` | `push` |
| Set a package's `preferred-versions` | A new `preferred-versions` entry is appended; versions outside it are avoided but still chosen when nothing else satisfies (captured) | `annotate` | `push` |
| Delete a release | The index is rebased without it, the tarball answers `404`, the coordinate is retired; a pinned build fails "Unexpected response 404" (captured shape) | `delete-version` | `delete` |
| Rotate keys, renew or replace the root | New metadata; clients follow as in the rotation item above | `configure` on the signing-key routes, applied by `signing-service.md` | admin role |

Revision and preferred versions are both `annotate`, the kind for "metadata that excludes nothing
from resolution", which that table names for "Hackage preferred versions and metadata revisions";
the handler's `args` document says which, and deprecation here is a preference that never
excludes, unlike yank, which is why it is not `withdraw`. Rules, applying the precedent: every
operation is one snapshot, none for a refused one, and no blob is deleted directly, so space
returns only through retention pruning and `storage-and-gc.md`'s single-deleter boundary (its AC15;
`management-api.md` AC6) holds; the coordinate a `delete-version` returns in its `Outcome` becomes a
core-held `Retirement` record written in the same transaction, refused centrally on every later
write for the life of the repository and unaffected by any repoint (`management-api.md`, "Retirement
is core-held", AC12; `data-model.md` AC35); the `Package` row outlives its versions (`data-model.md`
AC33). A revision must keep `name` and `version` and carry `x-revision` equal to the previous number
plus one, and nothing else about it is checked (the resolved revision-checking decision below); the
revision's author and time are recorded. Key operations are `configure` operations whose `Apply` is
`internal/signing`'s, not the handler's, with this format's generator run in the same transaction to
re-render the documents the rotation changes; they are admin-only and no repository-scoped token can
perform them (`auth.md` AC30; `signing-service.md` AC15). A publish or management operation against
a remote or virtual repository answers `405` with the `repository-type` problem (`management-api.md`
AC7).

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
3.16's `X-ApiKey` scheme is now one of `auth.md`'s presentation forms**: its Design table lists
`Authorization: X-ApiKey <token>` as a universal form, its client table carries the `cabal` /
`stack` row from these captures, and its AC31 asserts the form resolves to the same principal as
the same token in Basic, with redaction (its AC7) and the plaintext refusal (its AC27), so the
resolved client-scheme decision below is met in the shared verifier and this handler never reads a
credential. The `401` this format
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
| `root.json`, `timestamp.json`, `snapshot.json`, `mirrors.json` (keys, roles, versions, expiries, mirror hosts, and the digests of the index and of each other; no package name, version or tarball digest) | - | `pull` | descriptor |
| `01-index.tar.gz`, `01-index.tar` (they enumerate every name) | - | `pull` | none |
| `package/{name}-{version}.tar.gz`, `package/{name}-{version}/{name}-{version}.tar.gz` | `{name}/{version}` parsed from the path | `pull` | named |
| `POST upload`, multipart with the `package` part's filename before its bytes | `{name}/{version}` from the filename | `push` | named |
| `POST upload` with no filename before the bytes | - | `push` | none |
| `POST packages/candidates`, `PUT package/{id}/docs`, `PUT package/{id}/candidate/docs` | `{name}/{version}` | `push` | named |
| Revise, set preferred versions (management API) | `{name}/{version}`, `{name}` | `push` | named |
| Delete (management API) | `{name}/{version}` | `delete` | named |
| Any other route | - (answered `404`) | `pull` | none |

What that gives, applying `auth.md`'s rules rather than re-deciding them. **The four TUF documents
are descriptors** (`auth.md`'s resolved name-free-document decision, was Q23 there): each is a
repository-wide document whose body names no package, version or tarball digest, `snapshot.json`
naming only the index and the other metadata files by digest, the shape `auth.md` gives RPM's
`repomd.xml` ("an index of metadata files named by checksum and type"), so a patterned `pull` reads
them. The sentinel test `format-handler-interface.md` AC12 and `auth.md` AC32 require on every
descriptor route holds each one to that definition: a repository seeded with a sentinel release is
fetched on all four routes and fails the test if the sentinel's name, version or tarball digest
appears in a body. **A patterned `pull` still cannot update**: every client must read the index,
which enumerates every name and reports none, so `cabal update` and `stack update` read the TUF
metadata and then fail at the index request under a token patterned `acme-*/**`, the consequence
`rpm.md` records for `primary`; a patterned `pull` still confines a scripted tarball fetch to
in-pattern releases. **A pattern refusal on a named route is answered as absence**, `404`,
indistinguishable from a release that does not exist. **A patterned `push` publishes** in-pattern
releases through `cabal upload --publish`, whose part header names the file first (captured), and is
refused an out-of-pattern one with no snapshot; ingest refuses an archive whose identity disagrees
with the filename, so a mislabelled part cannot evade the pattern (the resolved publish-object
decision below). The binding's `Scope(r)` reports the object the `publish` operation's `Authorize`
reports, or none when no filename precedes the bytes, so the binding is never wider than its
operation (`management-api.md`'s resolved binding-scope decision, was Q13, AC8).

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines on a
**tarball route** of either path, the handler answers `403` with `Content-Type: text/plain` and the
body `refused by policy {policy}, rule {rule}: {detail}` (or naming the signal, for a coordinate
condemned under the shared security-signal rule), per the resolved refusal-rendering decision below.
It writes the response through the shared refusal writer `WriteRefusal`, never a status line of its
own (`format-handler-interface.md` AC14; `supply-chain-policy.md` AC18), so on the HTTP/1.1 the main
listener speaks by default the status line carries `Refused by policy: {condition}` as its phrase.
What reaches the user, captured: Stack 2.9.1 prints the body; cabal prints "Unexpected response 403 for
{url}" and never the body; Stack 3.11.1 prints "Error: [S-5170]". Whether either line prints the
phrase was not captured, so nothing is claimed for it and nothing here depends on HTTP/1.1. The
reason is therefore guaranteed only in the registry's refusal record, readable at `GET
/api/v1/repositories/{name}/refusals` (`supply-chain-policy.md` AC5), which the operator
documentation points to, and each refused download produces exactly one. Where the repository's
signed mirror list is empty (every hosted and virtual repository) no client goes anywhere else; a
remote serving an upstream list is the fallback case above. `supply-chain-policy.md`'s table "When a
refusal binds, per format" carries this as the Hackage row, `holds` for hosted and virtual
repositories and `restricted-egress` for a remote (its AC20), and the operator page `deployment.md`
generates from that table is where a Haskell operator reads the egress precondition.

**The index keeps naming a refused release.** Eliding it is impossible on a remote, whose index is
signed upstream, and on a hosted or virtual repository it would be a rebase per policy change and a
silent downgrade, the no-elision precedent of `conan.md`, `debian.md` and `puppet.md`.

### Signing, provenance and policy

**TUF is repository signing, not author signing.** No field carries a publisher's signature, and the
`targets` role, the only place TUF offers one, has no keys on the live Hackage. So
`docs/internal/plans/foundation/artifact-verification.md` is asked for one entry, per
`supply-chain-policy.md`'s resolved verification-ownership decision, and provides it as its `tuf`
scheme (its entry table, AC17): **a hackage-security chain verification** taking a TUF revision
(root, timestamp, snapshot, mirrors, index) and the trusted root key ids and threshold, and
answering verified with the verifying keys per role, or the first failing link with
hackage-security's own reason (signatures, version, expiry, hash), with canonical JSON and the
root-update rule exactly as hackage-security applies them. The trusted ids and threshold are the
remote's **trust set**, a `tuf-root` entry holding the root key ids, the threshold and the current
root document (`artifact-verification.md`, "Trust sets"), administered through
`PUT /api/v1/repositories/{name}/trust` (its AC3) and provisioned in a case through the harness's
`trust` key (its AC25). The handler reaches the entry only through the `Verifier` consumer
interface in `Deps` and never imports `internal/verify` (`format-handler-interface.md` AC15). The
verdict source `supply-chain-policy.md` consumes answers, per the resolved signature-verdict decision
below, **verified with chain `repository-chain`** for a proxied tarball whose digest matches an index
entry of a verified upstream revision, and **absent** for a hosted tarball, whose only signature is
this registry's over its own index (`artifact-verification.md`, "CPAN, Hackage, Homebrew", AC17). A
rule requiring any verified verdict therefore serves verified proxied releases and refuses every
hosted release, while a rule requiring a **publisher** identity accepts no `repository-chain`
verdict and so refuses every release on both paths (`supply-chain-policy.md` AC15), which the
operator documentation states. The conformance matrix's verification column needs a passing hosted
and a passing proxied verification case for Hackage (`artifact-verification.md` AC24), which AC29
and AC25 carry.

**Advisory coverage exists.** OSV's `Hackage` ecosystem holds 32 `HSEC-` advisories with `ECOSYSTEM`
ranges and explicit version lists, twenty carrying CVE aliases, and none withdrawn or malicious-package
entries (captured). The coordinate is `(Hackage, {name}, {version})`, name matched byte for byte
(purl's `hackage` type is case-sensitive), and version ranges evaluate under the component-wise
integer order above; `supply-chain-policy.md`'s coverage table carries the row ("Hackage | covered
... | package name, matched byte for byte, and version under Hackage's component-wise integer
ordering", its AC17). Its matcher binds a range only under an ordering it vendors, and Hackage's
component-wise integer ordering is in that vendored set (its AC17, whose ordering test carries
Hackage cases), so advisory rules bind on both paths. OSV's separate `GHC`
ecosystem (three advisories) concerns the compiler and its boot packages, which no repository of
this format serves. Byte-level rules depend on the shared cataloguer's coverage of sdists, which
that spec decides.

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
`mirrors.json` when changed, then the index, and asks artifact verification's `tuf` entry to verify
the whole chain against the remote's trust set, its `tuf-root` entry holding the upstream's root key
ids and threshold (or, for a remote configured without them, the root it bootstrapped, as a client
would). The chain check is an integrity call that may refuse the commit, never a verdict recorded
afterwards (`proxy-cache.md`, "Completion-only mode and the verifier hook": its catalogue names the
TUF chain). The five documents are declared to the proxy layer as **one paired set**: fetched
together, verified together, committed in one transaction and served under one cache-scoped
freshness record, the paired-set id `data-model.md` AC44 carries, so a client never meets a
timestamp whose snapshot or index is not already cached (`proxy-cache.md`, "Freshness of what a
remote serves", AC22); the revision it supersedes is retained, its blobs declared on the remote's
repository-level document, until the next adoption drops it (`proxy-cache.md`'s resolved
retained-revision decision, was its Q19, AC27), so a tarball only that revision names can still be
fetched and verified against its `package.json`. Upstream `root.json`
changes are verified against the cached upstream root, exactly as the clients verify them. **A
revision whose versions decrease is not adopted**: the TUF `version` is this format's revision
ordering, which `proxy-cache.md` names ("a TUF `version`"), so the cached revision keeps serving,
its record unchanged, and the regression is recorded for the operator as a divergence. A revision
whose timestamp has expired, or whose chain fails, commits nothing and is alerted with the real
reason, and the previous one keeps serving within `proxy-cache.md`'s stale-if-error bound.

The transport is `upstream-adapters.md`'s `https` adapter under the upstream's allowlist and
credential role; the protocol half (which documents to fetch, the splice, the chain) stays in this
handler's derivation. That spec's requirements table carries this format's row ("Incremental index
fetch by `Range`; `301` followed inside the adapter", its AC8 and AC15), and each item this spec
asked of it is placed:

- **Incremental index fetches**: the adapter sends `Range: bytes={cached size - 65536}-` when the
  handler asks, reporting a `206` as `PartialContent` and a `200` to a ranged request as `OK` so the
  handler knows the upstream ignored the range (its "Request hygiene", AC15). The splice and the
  verification against the new snapshot's hash are the handler's, falling back to a whole fetch on a
  mismatch, as the clients do, so revalidating a 138 MB index costs one small request per upstream
  publish.
- **Storage of the upstream index as chunks reused across revisions** is not the adapter's but the
  handler's and the shared model's: the remote's current index document declares its chunk digests
  through `data-model.md`'s declared blob-digest list (AC37), which `storage-and-gc.md`'s fourth
  root marks through for a remote's current documents as for hosted ones (its AC16), so a revision
  stores only the bytes the upstream changed and the hash state is resumed at the last unchanged
  chunk. A chunk only the retained previous revision still uses (the tail an upstream rebase
  replaced) is declared on the remote's repository-level document until the adoption that drops
  that revision, and is collectable at the next sweep past grace after it.
- **Redirects followed inside the adapter**: the live Hackage answers `package/{id}.tar.gz` with `301`
  to `package/{id}/{id}.tar.gz` (captured), a same-host redirect the adapter follows, and no upstream
  `Location` ever reaches a client (its AC8).
- **An optional upstream credential**, `basic`, or `header` naming `X-ApiKey` for a Hackage-shaped
  upstream (its credential-kind table), sent only to the upstream's root host over HTTPS (its AC6,
  AC22).

Classification and behaviour:

- **TUF documents and the index are mutable metadata** revalidated as one revision; the live Hackage
  marks them `Cache-Control: public, no-transform, max-age=60` (captured), and the proxy layer's TTL
  governs. They are served through the same `ServeDocument` helper hosted documents use, with the
  cache-scoped record in place of the pointer's (`proxy-cache.md`, "Freshness of what a remote
  serves"), and never re-dated, since the remote's documents are byte-identical to the upstream's.
- **Tarballs are immutable artifacts**, fetched on a miss with a **declared digest**: the SHA-256 and
  length of their `package.json` in the current or the retained revision, the current one's where
  both name the release, which the fetch-and-cache
  request carries so the bytes are verified while streaming (`proxy-cache.md`, "Completion-only mode
  and the verifier hook": a request carries a declared digest or a verifier, never neither, AC20).
  A tarball neither cached nor named by such a revision answers `404` with no upstream request, so
  the remote is not an open relay. A truncated or mismatching body is never committed. After the
  commit, the `repository-chain` verdict is recorded against the tarball's digest (above), never
  gating the client.
- **A remote serves the upstream's `mirrors.json`**, since the snapshot hashes it: the live one lists
  `http://hackage.fpcomplete.com/` and `http://objects-us-east-1.dream.io/hackage-mirror/`, which every
  client falls back to on any refusal from this registry. The operator documentation says a remote's
  policy refusals hold only with client egress restricted (`supply-chain-policy.md`'s
  `restricted-egress` row, above), and that a virtual repository over the remote signs an empty list
  instead.
- **Expiry is the upstream's.** A cached revision keeps its upstream expiry through serve-stale and
  offline mode: the default clients ignore it (captured), an opt-in client fails once the live
  Hackage's three-day window passes, and the registry never re-dates upstream metadata, which the
  operator documentation states beside `proxy-cache.md`'s offline mode (`proxy.offline`) and the
  `read_only` remote, which freezes the cache record in the same way (`repository-lifecycle.md`).
- **Missing tarballs are negatively cached** with the short TTL; a `429` or `5xx` is never cached as
  absence (`proxy-cache.md` AC9). The operator's "refresh now", `POST
  /api/v1/repositories/{name}/refresh`, marks the revision and every negative entry due for
  revalidation (`management-api.md` AC29; `proxy-cache.md` AC24).
- **Publish and every management operation against a remote repository answer `405`** with the
  `repository-type` problem (`management-api.md` AC7).

Upstream removal maps onto `proxy-cache.md`'s event classes ("Upstream removal or replacement"), the
handler classifying and the layer responding, as this format's side of that contract:

| Upstream event, as observed at revalidation or fetch | Class | What this format adds |
|---|---|---|
| A revision appends a `.cabal` or `preferred-versions` entry | Ordinary metadata change | Mirrored by serving the new revision |
| A new revision's index does not extend the cached one (an upstream rebase) | Removal with no signal, for the entries that vanished | Served, since the upstream signed it; cached tarballs of vanished releases stay fetchable at their paths |
| A new revision gives a cached release a different SHA-256 | Immutability violation, revision-bound, the new-blob variant | Because the tarball path carries no digest, the route serves the bytes the current revision names: the new bytes are fetched and verified as a new blob on the next request, and that commit ends the old blob's cached reference in the same transaction, so the sweep reclaims the old bytes, which no request can be served afterwards (`proxy-cache.md`'s resolved old-blob decision, was its Q20); the divergence record keeps both digests |
| An indexed release's tarball answers `404` or `410` upstream | Removal with no signal | Cached bytes keep serving |
| The upstream root rotates and fails verification against the cached root | Integrity failure at fetch | The adopted revision keeps serving within the stale bound |
| A revision's timestamp has expired, or its chain fails | Integrity failure at fetch | As above |
| A revision's version decreases | Regression not adopted | The cached revision stands |

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
- **Remote members are verified before they are merged**: a remote's current revision is adopted only
  after the chain verification above passes, so the merge reads verified documents by construction,
  and a revision that failed is never a remote's current one. The merge **composes** a remote's index
  into a body the virtual signs, so it contributes only under a `verified` verdict
  (`signing-service.md`'s resolved pass-through decision, was Q17, AC36; nothing on this format is
  declared pass-through, since a virtual serves no upstream-signed document unchanged). On this
  format the rule excludes no remote that serves anything: every adopted revision passed the chain
  check against the remote's trust set, including a trust set bootstrapped from the first root the
  remote saw rather than configured, whose virtual then vouches for a root no operator named, which
  the operator documentation states. The end-to-end check to Hackage's keys becomes a check by this
  registry followed by its own signature, the accepted cost.
- **Retroactive shadowing rebases.** When a member earlier in the order gains a name a later member's
  entries already supplied, the merge regenerates the log without them, one whole download per client,
  which is what keeps a private `acme-base` from being resolved against a public squatter's releases
  published first.
- **Tarballs are the members' bytes**, served through the virtual route, so the merged index's digests
  are the members'.
- **The virtual repository signs an empty mirror list**, so its refusals hold; publish and management
  operations against it answer `405` with the `repository-type` problem.
- **The merge is the generator's `Merge`**, run as the deferred `index.merge` job on
  `internal/async`, enqueued by a member's write through the pre-commit hook and by a remote member's
  adoption of a new upstream revision through the runtime's adoption hook, inside the adoption
  transaction, since cache materialisation is not a write (`signing-service.md`'s resolved
  remote-member decision, was Q16, AC35; `proxy-cache.md` AC25), coalesced per virtual inside
  `index.virtual_merge_window`, visible within `index.virtual_staleness_bound`, with the previous
  merged set serving until the new one commits atomically and a failed merge leaving it and firing
  `VirtualMergeFailed` (`signing-service.md`, "Virtual merges", AC19; `async-operations.md`'s kind
  table). A virtual created over members has its first merge enqueued at creation, so its documents
  exist before the first request. A remote reached only through the virtual receives no request of
  its own, so serving the virtual's merged documents while the remote's revision is past its TTL
  enqueues one coalesced `proxy.revalidate` job that replays the remote's own routes below the
  authorizer, never on the request's path (`proxy-cache.md`, "Revalidation outside the request",
  AC26). The merged index is the virtual's current document, declaring its segment digests as a
  hosted index does, and its four TUF documents are signed with the virtual repository's own keys.
- **Member-input paths.** The profile declares, under the member's mount, the path of every
  document the `Merge` reads from a member, as `signing-service.md`'s `Profile` requires and
  registration refuses a merging profile without (its AC35): `01-index.tar.gz`, the one document
  the merge reads, requested on the remote's own route, where the proxied path fetches and verifies
  the whole revision (`timestamp.json`, `snapshot.json`, `root.json`, `mirrors.json` and the index)
  as one paired set before anything is adopted (Design, "The proxied path"). The path is literal:
  a Hackage repository has one index, so no template and no path derived from an earlier document
  is needed, and a virtual's creation, or a member-list change adding a never-adopted remote,
  fetches that remote's revision with no request ever made to the remote's own URL.
- **Each merge commit raises the virtual's TUF version.** A merge that served the same version with a
  new index would be adopted but one that served a lower version would fail every client (the
  rollback finding above), so a merge commit and a member-list change are document-only transitions
  of the virtual's default pointer that advance its generation counter and `moved_at` with no
  snapshot (`signing-service.md`'s resolved virtual-freshness decision, was Q15, AC34;
  `data-model.md` AC36), and the virtual's `timestamp.json` and `snapshot.json` carry that counter
  as their version exactly as a hosted pointer's do (Design, "Pointers, rollback and the version
  counter"), higher after every merge whatever a member's own transitions did.

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
so the headers serve intermediaries. No hosted route answers a redirect. The TUF documents and the
index are generated documents, so their headers come from `ServeDocument` and this format's profile
declares `no-cache` for them (`signing-service.md`, "Freshness scoped to the pointer"), one value
for every Hackage repository (its resolved `Cache-Control` decision, was Q18, AC30). The index is
also the one generated document a client fetches by byte range, and `ServeDocument` answers a single
byte range over a document consisting of declared blobs with `206` and `Content-Range`, an
unsatisfiable one with `416` and a stale `If-Range` with the whole body, mapping the range onto the
covering segments through `storage-and-gc.md`'s segment-verified range read without assembling the
index (`signing-service.md`, "Serving: one door for every validator", AC30, naming this format's
incremental `01-index.tar.gz`), under a profile that offers no encoding, so no `Content-Encoding` is
ever set (AC32). Tarballs, hosted and cached, are served through `ServeFile` (its resolved
handler-rendered decision, was Q14, AC32) under a package-level serve policy of this handler
carrying the immutable caching header, range support and no encoding, with the CAS digest as the
strong `ETag`, and the shared read path verifies the digest while streaming (`storage-and-gc.md`
AC21); the handler sets no validator on any response.

### What it needs from Deps

The pinned `Deps` (`format-handler-interface.md`): the CAS, the metadata store at all three levels
with snapshot-pointer resolution, the fetch-and-cache entry point with classification as an
argument and the request shape `proxy-cache.md`'s "Obligation to the handler interface" states
(a declared digest or a verifier, a paired set; a re-open input), the central authorizer, and the request logger, with the
policy-enforcing resolution calls returning the typed refusal. Beyond the pin, each now specified by
its owner rather than invented here: the `Verifier` consumer interface for the `tuf` entry of
`artifact-verification.md` (`format-handler-interface.md` AC15); `upstream.Options` on
fetch-and-cache for the adapter's allowlist, credential role and `Range` (`upstream-adapters.md`);
the refusal writer `WriteRefusal` (`format-handler-interface.md` AC14); and, outside `Deps`, the
optional `Indexer` interface through which `signing-service.md`'s runtime generates, signs and
serves the index and every TUF document, rendering the pointer's generation counter and `moved_at`
from `data-model.md` and, on a remote, the cache-scoped record from `proxy-cache.md`, and the
optional `Operator` interface through which `management-api.md`'s `Submit` reaches `publish`,
`annotate` and `delete-version` (three optional interfaces held apart until the re-open,
`format-handler-interface.md`'s resolved optional-interfaces decision, was Q10 there).

### Capabilities and lifecycle

`Capabilities()` declares proxy support `supported`, reference-implementation availability
`available` (below), `Virtual: supported` (the section above) and `Rename: supported`, the four
fields `format-handler-interface.md` AC13 names. Rename is supported because nothing a client reads
names the repository: every TUF target path is the literal `<repo>/...` placeholder hackage-security
uses, `root.json` and `mirrors.json` name keys and mirror hosts, and the index names packages, so a
renamed repository serves byte-identical TUF documents, index and tarballs under its new URL with
every `SigningKey`, `PointerDocument` and public form unchanged and no re-sign
(`signing-service.md` AC29), clients keep verifying with the same root key ids once their `url:` or
`download-prefix` names the new path, and the old name answers `not-found` indistinguishably from a
never-existing repository (`repository-lifecycle.md` AC12). `repository-lifecycle.md` AC12 requires
`conformance/hackage/rename_test.go`, enforced by the harness's case-set validator
(`conformance-harness.md` AC26); AC33 carries it with the real clients. Deleting a repository
retires its keys in the deletion transaction and destroys their private material at tombstone time
(`signing-service.md` AC29), which the operator documentation states, because a Haskell client
configured with the deleted repository's root key ids cannot be pointed at a recreated one under the
same name without new ids.

### Conformance, the clients and the corpus

The two cabal lines' TUF behaviour was identical in every captured case: bootstrap, incremental and
whole updates, the verification loop, rollback in both forms, expiry in both directions, mirror
fallback, rotation and revisions. **The skew is in cabal-install's transport and upload**: 3.8.1.0
sends no download credential and publishes only with Digest, 3.16.1.0 authenticates over HTTPS and
publishes with a token. **Between the Stack lines** the skew is the configuration key and the error
text. Every hosted and proxied case runs on all four unless it names a client-specific behaviour; the
catalogue counts one ecosystem, and the four appear in the matrix's Client column under the Hackage row.

**Every case runs with the client's network restricted to this registry and its stand-ins**, which
the harness now does for every case: each client container reaches only the hostnames its case
declares (`conformance-harness.md`'s resolved client-confinement decision, was Q6 there, AC23), the
recording session being the one run with egress. The fallback case's mirror is a declared second
instance (`conformance-harness.md` AC16), so it stays inside. The client images are the upstream
images named in Context, pinned by digest (`conformance-harness.md` AC4); each case writes the
client's configuration with the repository's root key ids read from the server in the case `script`,
adds the harness CA (`CURL_CA_BUNDLE` for cabal, the system store for Stack 2.9.1), and gives each
client a fresh home unless it continues one. A hosted case's repository carries the `signing`
sub-entry (a fixture key file or `generate`), and its `state` entries come out appended and signed
by the write-path hook with no seed-side code, byte-identical to a publish of the same content, with
the root key ids readable before the client runs (`signing-service.md` AC21; `conformance-harness.md`
AC24). A proxied case declares the remote's `tuf-root` through the `trust` key
(`artifact-verification.md` AC25).

The recorded surface for the replay corpus: against hackage.haskell.org, a bootstrap (root, timestamp,
snapshot, mirrors, a whole index), an incremental update, one tarball through its redirect, and an
unknown tarball. The reference implementation for reads is the live Hackage, so `Capabilities()` declares
reference-implementation availability `available`; for publish the reference is hackage-server, which is
runnable locally and is recorded in Phase 6 (not captured this run): a `cabal upload --publish` with a
token and with a password, an identical republish and a changed-bytes republish, against a
hackage-server container pinned by digest, because hackage.haskell.org accepts no test upload (an
upload needs a maintainer account and the live endpoint offers Digest alone, captured). That write
half recorded against a local reference is a row of `conformance-harness.md`'s authoritative-reference
exception list (its AC28), which this pass reports rather than adds, since that file is not this
spec's to edit; the read half stays recorded against hackage.haskell.org and needs no row. Recording gates on the harness's
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
      and a whole download otherwise; each document's `version` equals the pointer's generation
      counter in `data-model.md`'s freshness record at the transition that produced it, and its
      `expires` that record's `moved_at` plus the role's window; and no pointer ever serves either
      document at a version lower than one it served, including with the clock stepped backwards.
- [ ] AC7: Promoting a snapshot to a second pointer serves byte-identical index and tarball bytes there,
      with `timestamp.json` and `snapshot.json` on that pointer's own counter, and every client of the
      second pointer updates and installs from it.
- [ ] AC8: An idle default pointer and an idle environment pointer are each re-signed before their
      `timestamp.json` and `snapshot.json` expire, over three windows under an injected clock, by the
      `signing.resign` schedule on the production scheduler, surviving a restart mid-schedule, with no
      snapshot created; `cabal --ignore-expiry update` on both cabal lines and Stack with
      `ignore-expiry: false` on both lines succeed at every step.
- [ ] AC9: Every served TUF document verifies under hackage-security's canonical JSON rules with ed25519
      keys only; the root role, snapshot, timestamp and mirrors keys and an empty `targets` role are as
      Design states, each role a `SigningKey` of that purpose; the TUF key ids equal
      hackage-repo-tool's for the same keys; a role requested on the `pkcs11` backend is refused at key
      creation naming the Ed25519 ceiling; the verifier that self-checks every produced signature also
      verifies the live Hackage's current metadata; and no handler or generator package holds a
      private key or performs signing, asserted by an architecture test.
- [ ] AC10: Rotating the snapshot, timestamp and mirrors keys makes every client that holds the previous
      root update successfully through one root download; rotating the root keys serves a root whose root
      role holds the new keys, whose key map keeps the old root keys, and which carries a threshold of both
      sets' signatures, which a client holding the original root accepts directly and a fresh client
      configured with either set's ids bootstraps from; the old root keys keep cross-signing for
      `signing.rotation_window`; each step is an admin-only `configure` operation on the signing-key
      routes; and neither rotation creates a snapshot.
- [ ] AC11: A `root.json` signed offline by an operator and submitted through the `external`
      backend's submit operation is accepted only when a threshold of the current root keys signed it
      and every signing key appears in its key map, and is then served on every pointer to every
      client, which follows it; a root failing either check is refused with a problem naming the
      failing check and never served; the service never holds the root's private keys; and
      `SigningDocumentExpiring` fires `signing.external_expiry_lead` before an operator-held root
      expires.
- [ ] AC12: `cabal upload --publish --token` from cabal 3.16.1.0, sent as `POST upload` to
      `https://{host}/hackage/{repo}`, stores the release in exactly one snapshot, prints the response under "Warnings:", and the release then
      installs on all four clients; `--username` and `--password` over HTTPS publish the same way; an
      identical republish answers `200` with a completed `Operation` carrying `unchanged: true`, no
      snapshot and no change to any TUF document's version (`management-api.md` AC5); different bytes
      at an existing or deleted coordinate, including after the deleting snapshot is pruned and after a
      backwards repoint, and a trailing-zero variant answer `409`, which cabal prints with its body, the
      deleted coordinate refused by the shared write path's retirement check before the handler runs,
      and a publish whose coordinate a `delete-version` retires after its claim was declared and
      before it commits refused `retired` at commit with nothing landed (`management-api.md` AC12,
      `storage-and-gc.md` AC30); and the same release
      published through the binding and through the management API's `publish` yields byte-identical
      served documents and snapshot deltas.
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
- [ ] AC17: Deleting `acme-base` 1.1.0 through the `delete-version` operation rebases the index in one
      snapshot without its entries and writes its `Retirement` record in the same transaction, its
      tarball answers `404`, every client's next update succeeds with a whole index download, the
      coordinate stays retired after a backwards repoint and after the deleting snapshot is pruned with no
      retirement state in any package-level document, and the `Package` row survives deleting its last
      release.
- [ ] AC18: Every management operation and the upload binding is refused with no snapshot for a principal
      lacking its action (`push` for `publish` and `annotate`, `delete` for `delete-version`), answers
      `405` with the `repository-type` problem against a remote or virtual repository, identically through
      the binding and the API, and key operations are refused for every repository-scoped token,
      including one holding every action.
- [ ] AC19: On a private repository over TLS, cabal 3.16.1.0 with userinfo in `url:` updates and installs,
      the transcript showing each request answered `401` with `WWW-Authenticate: Basic` and repeated with
      `Authorization: Basic`, index `Range` requests included; both Stack lines with userinfo in
      `download-prefix` update and unpack with preemptive Basic; cabal 3.8.1.0 is answered `401` and
      installs nothing; a credential-less request answers `401` identically for a private and a missing
      repository; a token lacking `pull` answers `404`; a rejected token answers `401`; plain HTTP carrying
      a credential is refused before lookup; and no credential appears in logs, error bodies or metrics.
- [ ] AC20: cabal 3.16.1.0's `Authorization: X-ApiKey {token}`, the presentation form `auth.md` AC31
      lists, authenticates as the same principal as the same token in Basic, and an `X-ApiKey` value
      naming no token answers `401`; and cabal 3.8.1.0's password upload, sent by `--digest`, exits
      non-zero with "http code 401" against this registry.
- [ ] AC21: A token holding `pull` patterned `acme-*/**` reads `root.json`, `timestamp.json`,
      `snapshot.json` and `mirrors.json`, each a descriptor passing the sentinel test, and is refused
      `cabal update` and `stack update` at the index request on every client, in hosted and proxied mode,
      while a scripted fetch
      under it downloads `acme-base` tarballs and answers `404` for `other-pkg`, the answer a nonexistent
      release gets; a token holding `push` patterned `acme-*/**` publishes `acme-new` through `cabal upload
      --publish` and is refused `other-new` with no snapshot; and an upload whose `package` part names no
      filename before its bytes is refused for that patterned `push` and accepted for an unpatterned one.
- [ ] AC22: A release the shared policy layer refuses answers `403` with `text/plain` naming the policy on
      its tarball routes, written through `WriteRefusal`, on the hosted and the proxied path, while the
      index keeps naming it; Stack 2.9.1
      prints the body, cabal exits 1 with "Unexpected response 403", Stack 3.11.1 exits non-zero; on a
      hosted repository no request reaches any other host, asserted at the network layer; and each refused
      download produces exactly one refusal record.
- [ ] AC23: With a stand-in upstream whose signed mirror list names a reachable second instance, a remote
      repository's `403` on a tarball sends both cabal lines to that instance, while a hosted and a virtual
      repository serve an empty signed mirror list so the same refusal sends no client anywhere, asserted at
      the network layer; and the operator documentation states the remote's exposure, which
      `supply-chain-policy.md`'s binding table records as `restricted-egress` for a remote and `holds`
      for hosted and virtual repositories.
- [ ] AC24: A remote repository over a stand-in hackage-security repository served under a path prefix,
      and separately over the live hackage.haskell.org in the nightly job, serves `root.json`,
      `timestamp.json`, `snapshot.json`, `mirrors.json` and the index byte-identical to the upstream's, and
      every client configured with the upstream's root key ids updates and installs through it with only
      this registry reachable, the remote's trust set holding those ids as its `tuf-root` entry; the
      upstream receives one incremental index request per upstream change, answered `206` and spliced, and
      a second install from fresh containers produces no upstream request.
- [ ] AC25: For a proxied upstream revision whose snapshot hash, index hash, signature or root fails the
      `tuf` entry's chain verification, or whose timestamp has expired, nothing is committed, the adopted
      revision keeps serving within the stale bound, and the real reason reaches the operator record; a
      revision whose versions decrease is not adopted, the cached revision and its cache-scoped record
      standing and a divergence recorded; the five documents of a revision are committed and served as one
      paired set, so clients never receive a timestamp whose snapshot or index is not cached; a proxied
      tarball whose bytes do not match the declared SHA-256 and length of its `package.json`, or whose
      body is truncated, is never committed; and a committed proxied tarball carries a `verified` verdict
      with chain `repository-chain`.
- [ ] AC26: A tarball request for a release no current or retained upstream revision names answers `404`
      with no upstream request, asserted at the network layer; an upstream tarball `404` is negatively
      cached while a `429` or `5xx` is neither cached as absence nor surfaced as not-found; an upstream
      redirect on the tarball route never reaches the client; a refresh through the management API makes
      the next request revalidate the revision and the negative entries; a stand-in presenting each
      removal-table event produces the `proxy-cache.md` event class the table names; and a new revision
      giving a cached release a different SHA-256 serves every client the current revision's bytes, and
      after the next sweep past grace the old blob is gone from the store while the divergence record
      naming both digests is still queryable (`proxy-cache.md` AC28).
- [ ] AC27: A virtual repository over a hosted and a remote member serves a merged index signed with its
      own keys, which every client verifies with the virtual repository's key ids; a hosted `acme-base`
      placed first shadows the remote's `acme-base` so that no upstream release of it is listed or fetched,
      asserted at the network layer, including when the remote's release was merged first and the shadowing
      rebases the index; `cabal update '{repo},{instant}'` resolves by member entry times; Stack 3.11.1 and
      2.9.1 update against a merged log whose entry times are not monotonic; a member publish is visible
      in the virtual within the staleness bound through the `index.merge` job, never on a request's path,
      with every client of the virtual adopting the new merge because its TUF version rose; an upstream
      change adopted by the remote member is merged with no request to the virtual in between
      (`signing-service.md` AC35), and a member-list change and a merge after a member's rollback each
      serve a higher version than any served before, under an injected clock stepped backwards
      (`signing-service.md` AC34); a virtual created over a never-adopted remote lists the remote's
      packages, the stand-in's transcript showing only the revision the member-input path fetches and
      the network layer no request to the remote's own URL, and a read of the virtual past the
      remote's TTL enqueues one revalidation and is served the current merged set with no upstream
      request on its path (`proxy-cache.md` AC26); and publish to the virtual repository answers `405`.
- [ ] AC28: A proxied index stored as declared chunks, and a hosted index manifest whose segments are CAS
      blobs named in its declared blob-digest list, survive a GC sweep while current or retained and serve
      every client afterwards, and a segment no current or retained document declares is collected; on a
      remote, after an upstream rebase, a chunk only the retained previous revision uses survives a sweep
      run with the grace lapsed, a tarball only that revision names is then fetched, verified against its
      `package.json` and installed, and the chunk is collected by the first sweep past grace after the
      adoption that drops that revision (`proxy-cache.md` AC27); and a hosted repository's storage grows
      by the appended segment, not by a whole index, per publish.
- [ ] AC29: A policy rule depending on advisory data attached to a Hackage repository binds on both paths
      through the `Hackage` OSV ecosystem, refusing a release an advisory's range covers under the
      component-wise integer version order; a rule requiring any verified verdict serves a proxied tarball
      whose chain verified and refuses every hosted release with the reason that no author signature
      exists; and a rule requiring a publisher identity refuses both.
- [ ] AC30: The candidate route answers `400` whose body names `--publish`, the docs routes and
      `00-index.tar.gz` answer `404`, and a bare `cabal upload` and `cabal upload -d` on cabal 3.16.1.0 print
      those bodies and exit non-zero.
- [ ] AC31: Replay-match passes against a corpus recorded from hackage.haskell.org, with the publish
      half recorded from a pinned hackage-server container, covering the recorded surface named in
      Design, with the `Authorization` header, URL userinfo, `X-ApiKey` values and upload bodies
      redacted; the corpus manifest names that local reference for the write half, matching a Hackage
      row of `conformance-harness.md`'s authoritative-reference exception list (its AC28).
- [ ] AC32: No response of this format carries a `Content-Encoding`, including to Stack's
      `Accept-Encoding: gzip`; every response carries `Accept-Ranges: bytes`; the index and tarball routes
      answer one byte range with `206` and `Content-Range` and an unsatisfiable one with `416`; both tarball
      routes, `package/{name}-{version}.tar.gz` and `package/{name}-{version}/{name}-{version}.tar.gz`,
      serve the same bytes with no redirect; TUF documents and the index carry `Cache-Control: no-cache`
      and a byte-derived `ETag` set by `ServeDocument`, never by the handler, the index answering a
      range over its declared segments without being assembled (`signing-service.md` AC30), and
      tarballs the immutable caching header and their CAS digest as `ETag` through `ServeFile`
      (`signing-service.md` AC32).
- [ ] AC33: `Capabilities()` declares proxy `supported`, reference implementation `available`,
      `Virtual: supported` and `Rename: supported`; after a hosted repository is renamed, all four clients,
      reconfigured with the new URL and the unchanged root key ids, update and install from it with
      byte-identical TUF documents, index and tarballs and no key re-created or re-signed, and the old
      name answers `not-found` exactly as a never-existing repository does.
- [ ] AC34: `root.json` and `mirrors.json` are served byte-identical on every pointer of a repository and
      appear in no snapshot's content; renewing the root on the cadence, rotating a key or accepting an
      operator-held root produces exactly one new root version for the repository and re-renders every
      pointer's four documents in one batch with each pointer's counter advanced; and after a root
      rotation, repointing to a snapshot older than it serves the current root, which every client that
      holds the new root accepts.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/hackage/cabal_install_test.go` (both cabal images, network-restricted client containers, transcript order, key ids written into the stanza from the server in the case `script`, program output) |
| AC2 | conformance | `conformance/hackage/stack_unpack_test.go` (both Stack images with their configuration keys, unpacked tree compared with the sdist) |
| AC3 | conformance + property | `conformance/hackage/incremental_test.go` (index above 64 KiB, `Range` header and `206` asserted on all four); `internal/format/hackage/segment_prefix_test.go` (thirty writes, two compressor builds, prefix property) |
| AC4 | integration + property | `internal/format/hackage/index_consistency_test.go` (snapshot hashes against served bytes, trailer, entry order, injected clock stepped backwards) |
| AC5 | conformance | `conformance/hackage/tamper_test.go` (storage fault injection on tarball and index segment, each client's error text) |
| AC6 | conformance + integration | `conformance/hackage/rollback_test.go` (all four clients, repoint inside and beyond 64 KiB; shared with `signing-service.md` AC10); `internal/format/hackage/index/pointer_version_test.go` (version and expiry read from the freshness record under an injected clock stepped backwards; the record itself is `data-model.md` AC36's `internal/model/pointer_freshness_test.go`) |
| AC7 | conformance | `conformance/hackage/promotion_test.go` (second pointer, byte comparison of index and tarballs, installs) |
| AC8 | conformance + integration | `conformance/hackage/expiry_test.go` (injected clock over three windows, expiry-checking cabal and Stack runs); `internal/format/hackage/resign_test.go` (no snapshot created; the schedule's restart behaviour is `signing-service.md` AC22's) |
| AC9 | unit + integration | `internal/signing/tuf/canonical_test.go` (canonical JSON and ed25519 against hackage-repo-tool output); `internal/verify/tuf/chain_test.go` (the live Hackage metadata, shared with `artifact-verification.md` AC17); `internal/signing/public_forms_test.go` (key ids against `hackage-repo-tool`, `signing-service.md` AC12); `internal/signing/backends_test.go` (the `pkcs11` Ed25519 refusal, `signing-service.md` AC13); the module-wide import architecture test of `signing-service.md` AC2 covering `internal/format/hackage/**` |
| AC10 | conformance + integration | `conformance/hackage/rotation_test.go` (online and root rotation through the signing-key routes from the case `script`, clients holding the original root, fresh bootstraps with old and new ids); `internal/signing/rotation_profiles_test.go` (the `root-chain` row with the `hackage-security` vectors, no snapshot, `signing-service.md` AC7, AC8) |
| AC11 | integration + conformance | `internal/signing/external_test.go` (offline-signed `root.json` fixtures: valid, under-threshold, unlisted signer; shared with `signing-service.md` AC16); `internal/format/hackage/index/offline_root_test.go` (the accepted root re-rendered on every pointer); `conformance/hackage/offline_root_test.go` (clients follow the accepted root); the expiry alert through `telemetry.NewTestRecorder` |
| AC12 | conformance + integration | `conformance/hackage/publish_test.go` (cabal 3.16.1.0 token and password uploads, install on all four, idempotent republish, `409` cases with printed bodies); `internal/format/hackage/publish_snapshot_test.go` (snapshot counts, the `unchanged` operation with no snapshot and no pointer-document change, retirement after pruning and a backwards repoint, the claim-versus-deletion race at commit); the binding-equivalence table test of `management-api.md` AC8 enumerating this handler's `Bindings()` |
| AC13 | integration | `internal/format/hackage/ingest_test.go` (one malformed or hostile sdist per rule, CAS and snapshot unchanged) |
| AC14 | integration | `internal/format/hackage/names_test.go` (case-clash refusal, exact-case lookups, spelling in index and routes) |
| AC15 | conformance + integration | `conformance/hackage/revision_test.go` (management endpoint from the case `script`, `cabal info` and `cabal get` on both lines); `internal/format/hackage/revision_rules_test.go` (identity and sequence refusals) |
| AC16 | conformance | `conformance/hackage/preferred_versions_test.go` (the `annotate` operation with a preferred-versions `args` document posted to `POST /api/v1/repositories/{name}/operations` from the case `script`, the entry point `management-api.md` AC24 and `conformance-harness.md` AC26 require for a declared kind; then parentheses, resolution, all-deprecated install, `index-state` before the entry, on both cabal lines) |
| AC17 | conformance + integration | `conformance/hackage/delete_test.go` (the `delete-version` operation from the case `script`, rebase absorbed by all four, `404` on the tarball); `internal/format/hackage/retirement_test.go` (the `Retirement` record in the deleting transaction, backwards repoint, pruning, no retirement state in any document, `Package` row survival) |
| AC18 | integration | `internal/format/hackage/manage_auth_test.go` (action refusals per kind and binding, `405` `repository-type` on remote and virtual through both entry points, key operations refused for tokens holding every action) |
| AC19 | conformance + integration | `conformance/hackage/auth_test.go` (TLS private repository, challenge transcript on cabal 3.16.1.0, preemptive Basic on both Stack lines, cabal 3.8.1.0 refused, anonymous, `pull`-less, rejected and plain-HTTP cases); `internal/auth/leak_test.go` (redaction for this format) |
| AC20 | conformance + unit | `conformance/hackage/upload_auth_test.go` (`X-ApiKey` upload, cabal 3.8.1.0 password upload); `internal/auth/credential_form_test.go` (the `X-ApiKey` form resolving as Basic does, `auth.md` AC31) |
| AC21 | conformance + unit | `conformance/hackage/pattern_test.go` (the pattern-refusal case `auth.md` AC8 and `format-handler-interface.md` AC7 require, both modes, TUF documents read and all four clients refused at the index, scripted tarball fetches, patterned publish); `internal/format/hackage/scope_object_test.go` (the object table per route and the sentinel test on the four descriptor routes through the shared helper in `internal/format/scope_test.go`, `format-handler-interface.md` AC12, `auth.md` AC32) |
| AC22 | conformance + integration | `conformance/hackage/policy_test.go` (hosted and proxied modes through the `policies` key, printed text and exit status per client, network-layer assertion; admitted by the case-set validator because the Hackage binding row is not `pending`, `conformance-harness.md` AC26); `internal/format/hackage/refusal_record_test.go` (one record per refused download, `WriteRefusal` the only writer, `format-handler-interface.md` AC14) |
| AC23 | conformance | `conformance/hackage/mirror_fallback_test.go` (a second declared instance as the signed mirror, remote versus hosted and virtual, network-layer assertion) |
| AC24 | conformance | `conformance/hackage/proxied_install_test.go` (prefixed stand-in, the remote's `tuf-root` through the `trust` key, byte comparison of every TUF document and the index, upstream request counts and `206` answers, second install with no upstream request); nightly `conformance/hackage/live_upstream_test.go` (hackage.haskell.org) |
| AC25 | integration | `internal/format/hackage/proxied_chain_test.go` (each failing link, a decreasing version not adopted, the paired-set commit, stale bound, operator record, tarball mismatch and truncation, the recorded `repository-chain` verdict); `internal/proxy/freshness_test.go` (the paired set and the regression rule, shared with `proxy-cache.md` AC22) |
| AC26 | integration | `internal/format/hackage/proxied_negative_test.go` (unnamed tarball, `404`, `429`, `5xx`, redirect, refresh); `internal/format/hackage/removal_test.go` (stand-in presenting each removal-table event, asserting the event class; a changed SHA-256 served as the current bytes, a sweep on an injected clock past grace, the object store and the divergence record read afterwards) |
| AC27 | conformance + integration | `conformance/hackage/virtual_test.go` (merged index on all four clients, shadowing and the rebase, `index-state`, non-monotonic merged times on both Stack lines, a member publish adopted after the merge, a member-list change and a member rollback adopted, `405`; shared with `signing-service.md` AC34's cabal half); `internal/format/hackage/index/merge_test.go` (per-package member order, rising virtual version from the virtual pointer's counter under a clock stepped backwards); the `index.merge` contract is `signing-service.md` AC19's `internal/index/merge_test.go` and the version source its AC34's `internal/index/virtual_freshness_test.go`; `conformance/hackage/virtual_remote_test.go` (a virtual created over a never-adopted remote, the stand-in's transcript showing only the member-input fetch and the network layer no request to the remote's URL; an upstream change adopted and merged; the virtual-only remote's revalidation from a read past its TTL, shared with `proxy-cache.md` AC26's `internal/proxy/revalidate_job_test.go` and `signing-service.md` AC35's `internal/index/virtual_remote_member_test.go`); `internal/format/hackage/index/profile_test.go` (the declared member-input path, and a profile lacking one refused at registration) |
| AC28 | integration | `internal/storage/metadata_blob_gc_test.go` (declared segment and chunk lists across a sweep, then serving; an undeclared segment collected; shared with `data-model.md` AC37); `internal/format/hackage/proxied_retention_gc_test.go` (a rebasing stand-in, the retained revision's chunks declared on the remote's list, a sweep with the grace lapsed while retained, a tarball only the retained revision names fetched and verified, the chunks collected after the dropping adoption); `internal/format/hackage/segment_growth_test.go` (storage delta per publish) |
| AC29 | integration | `internal/format/hackage/policy_config_test.go` (advisory rule through the `advisories` key on both paths, any-verified and publisher-identity signature rules against proxied and hosted releases) |
| AC30 | conformance | `conformance/hackage/unsupported_routes_test.go` (candidate, docs and legacy answers, cabal 3.16.1.0 output) |
| AC31 | conformance + unit | `conformance/hackage/replay_test.go` (corpus replay against the recorded Hackage surface with the named redactions, the publish half against the hackage-server recording); the manifest-versus-table check is `conformance-harness.md` AC28's `conformance/record/reference_exceptions_test.go`, which fails while the Hackage write row is absent from its table |
| AC32 | integration + conformance | `internal/format/hackage/headers_test.go` (every route's encoding, range, type and caching headers, both tarball routes compared, a tarball's digest `ETag`); `conformance/hackage/no_range_test.go` (all four clients send `Range` on their second update against the served headers); the freshness-boundary architecture test of `signing-service.md` AC11, and the range over declared blobs and `ServeFile` cases of its AC30 and AC32 rows |
| AC33 | unit + conformance | `internal/format/capabilities_test.go` (this handler's four declarations, `format-handler-interface.md` AC13); `conformance/hackage/rename_test.go` (all four clients against the renamed repository, byte comparison, old name `not-found`; required by `repository-lifecycle.md` AC12) |
| AC34 | integration + conformance | `internal/format/hackage/index/root_placement_test.go` (identical bytes on every pointer, absent from snapshot content, one root version per renewal, one batch across pointers; the runtime half is `signing-service.md` AC33's `internal/index/repository_pointer_documents_test.go`, including the repository-scoped `signing.resign` schedule alone renewing); `conformance/hackage/rotation_test.go` (the repoint-after-rotation case on all four clients, shared with `signing-service.md` AC33) |

The case set needs only keys already in the harness's closed `setup` vocabulary (its resolved
closed-vocabulary decision, was Q4): `repositories` with type, virtual member order and the `signing`
sub-entry, `credentials` (patterned tokens included), `upstreams` (stand-in hackage-security
repositories with variants for a path prefix, mutation, rebase, rotation, corruption, expiry and a
mirror list), `trust` for a remote's `tuf-root`, `state` for pre-published releases, revisions and
preferred versions, and `advisories` and `policies`, plus a second server instance for AC23. The two
obligations this spec once recorded on the harness are met by the sibling specs: a hosted `state`
entry comes out appended and signed because the write-path hook runs the index runtime on the seed
write too, with no seed-side code (`signing-service.md` AC21; `conformance-harness.md` AC24), and the
client's root key ids are readable from the server before the client runs (the same criteria), which
the case `script` writes into the client's configuration. The runner-enforced obligations, both modes
and the unauthenticated, unauthorized and pattern-refusal cases in each, a `script` case per declared
kind and the shared rename case (`conformance-harness.md` AC26), apply from the sibling specs.

## Implementation Phases

### Phase 1: Hosted reads and the signed index
- Waits on `docs/internal/plans/foundation/signing-service.md` reaching `planned` (Blocking
  preconditions), its Phases 1 to 3 built (the runtime and the `Indexer` contract, pointer documents
  and cadence, the TUF canonical-JSON codec) and its Phase 4's seed-path equivalence
- The format-first mount, the generator package `internal/format/hackage/index`, TUF documents from the
  signing service, the segmented index with appended gzip members and its declared blob list, tarball
  routes through `ServeFile`, headers and ranges through `ServeDocument`, seeded releases through `state` with the
  `signing` sub-entry, the per-route addressed objects with the descriptor sentinel test, the `403`
  policy rendering through `WriteRefusal`, `Capabilities()` and the rename case (AC33)

### Phase 2: Publish and management
- Waits on `docs/internal/plans/foundation/management-api.md` reaching `planned` (its Phases 2 and 3:
  publish, `Operator`, bindings)
- The `Operator` interface with `publish`, `annotate` and `delete-version` (no `configure`) and the
  `POST upload` binding, the declared unchanged publish, claims checked at declaration and at
  commit, ingest validation, revisions, preferred versions, rebasing deletion with core-held
  retirement, the write-boundary declaration under concurrency

### Phase 3: Pointers, keys and rotation
- Waits on `data-model.md` reaching `planned` (the freshness record, `PointerDocument`, declared blob
  lists), already required by Phase 1's documents, and on `signing-service.md`'s Phase 3 for the
  `root-chain` profile and the `external` backend
- Per-pointer versions from the generation counter, rollback and promotion, the expiry cadence, the
  four TUF documents as pointer documents (AC34), key rotation and operator-held roots through the
  signing-key routes

### Phase 4: Proxied path
- Waits on `upstream-adapters.md` and `artifact-verification.md` (its `tuf` entry, built here with this
  format in its Phase 4 at charter step 11) reaching `planned`
- Verified upstream revisions as paired sets, the previous revision retained until the next adoption
  with its blobs on the remote's declared list, incremental upstream index fetches, chunked storage,
  verified tarball caching with declared digests and `repository-chain` verdicts, negative caching, the
  removal event classes, `405` on remote writes

### Phase 5: Virtual repositories
- Waits on `async-operations.md` reaching `planned` (its queue core exists from charter step 4b) and
  `signing-service.md`'s Phase 4 (virtual merges)
- The merge as the `index.merge` job with per-package member order, remote verification before merge,
  rebasing on retroactive shadowing, a virtual version raised by the virtual pointer's counter at
  every merge commit and member-list change, the adoption re-merge, the member-input path and the
  virtual-only remote's revalidation, the virtual repository's keys

### Phase 6: Corpus and gate
- The recorded corpus against hackage.haskell.org and a local hackage-server for publish, all four clients
  in the matrix, the exception-list entries named in Design, the matrix's verification column
  (`artifact-verification.md` AC24)

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. The fifteen questions the authoring draft raised, and a sixteenth the 2026-09-28
reconciliation raised on Opus (where `root.json` and `mirrors.json` live, which the foundation specs
left unstated), were each written in the template's decision shape and then adopted at their own
recommendation under the owner's standing delegation of 2026-09-26, so the loop can continue; each is recorded below as adopted rather than decided, folded through Scope, Design,
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

Accepted cost: the shared revision and `data-model.md` AC22's qualification, both now made: the
per-pointer generation counter and `PointerDocument` are in `data-model.md` (AC36, which states the
qualification), and `signing-service.md` renders the TUF version from the counter (its AC10, AC27),
so the counter this record adopted is that one rather than one the handler keeps. B lost because it
turns the product's rollback into an outage; C lost on cost and on abusing the trust root as a cache
flush.

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

Accepted cost: the shared revision, now made: `data-model.md` carries the declared blob-digest list
(AC37), `storage-and-gc.md`'s fourth root marks through it (its AC16), and `signing-service.md`'s
generator returns the digests beside the document (AC5 there asserts the survival).

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
default and accepts an operator-signed root (Design, signing-service requirement 8; AC11). The shared
spec now provides both modes: the `file` backend by default and the `external` backend with its
submit operation for an operator-held root (`signing-service.md`, "Key custody", AC16).

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
AC29). `artifact-verification.md` records it as a `verified` verdict with chain `repository-chain`
(its AC17), which a rule requiring any verified verdict accepts and a rule requiring a publisher
identity does not.

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

Accepted cost: the sibling change, now made: `auth.md` lists the `X-ApiKey` scheme as a universal
presentation form in its Design table and asserts it in AC31, with the `cabal` / `stack` row in its
client table.

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

### Resolved: where `root.json` and `mirrors.json` live (was Q16, raised and adopted 2026-09-28)

**Adopted 2026-09-28 under the owner's standing delegation**, during the reconciliation with the
foundation wave, on Opus. Option A: `root.json` and `mirrors.json` are `PointerDocument` records on
every pointer of the repository, byte-identical across pointers, re-rendered on all of them in one
batch whenever either document changes (a root-chain rotation, an online-key rotation, a cadence
renewal, an accepted operator-held root), each pointer's counter advanced in the same batch (Design,
"Mapping onto the shared model", "Every hosted index is a write-triggered signed document",
"Pointers, rollback and the version counter"; AC34; Phase 3).

The question: this spec always said the two documents "belong to the repository's signing record,
outside every snapshot", because a repoint that restored an older `root.json` would serve a root
version below the one a client holds, and hackage-security refuses a decreasing version. The
foundation specs gave the index runtime three places to store a generated body: snapshot content
at the `repository`, `package` or `version` level, a `PointerDocument` at the `pointer` level, and a
`Signature` record (`signing-service.md`, "Storage"). None of them is "a per-repository record
outside every snapshot", and neither `signing-service.md` nor `data-model.md` states where these two
documents go, so a Phase 1 implementer would have to choose.

**Recommendation:** A. It uses a record the shared model already has, it keeps both documents out of
snapshot content, and every pointer's `snapshot.json` must be re-signed whenever either document
changes anyway, because it names their hashes, so the batch costs one more small document per
pointer and nothing structural.

| Option | You get | It costs |
|---|---|---|
| **A. Pointer documents, identical on every pointer** | No new record; no repoint can restore an older root; one mechanism for all four TUF documents; replication carries them with the pointer set as it carries every pointer document (`signing-service.md` AC23) | N copies of two small documents; a renewal must produce one root version and fan it out to every pointer in one batch, which `signing-service.md`'s per-pointer `signing.resign` schedule does not yet say (reported as a sibling consequence) |
| **B. A new repository-scoped, non-snapshot document record** | One copy, the shape this spec first described | A record `data-model.md` and `signing-service.md` would have to add for one format, and a second freshness path beside the pointer's |
| **C. Snapshot content at the `repository` level** | No new mechanism at all | A repoint across a rotation serves a lower root version, which every client that updated refuses, the same outage the resolved pointer-metadata decision (was Q1) exists to prevent |

**Why this is yours:** it decides where a trust root lives in the shared model, and it asks
`signing-service.md` for a repository-wide renewal it does not state.

Accepted cost: the fan-out and its consequence on `signing-service.md` (a renewal of a
repository-wide pointer document is one run per repository, exclusive per repository, not one per
pointer) and on `data-model.md` (an accepted operator-held root is a transition on every pointer).
B lost because it adds a record for one format when an existing one serves; C lost because it
reintroduces the rollback failure. Both consequences have landed: `signing-service.md` states
repository-scoped pointer documents, renewed only by one repository-scoped `signing.resign`
schedule exclusive per repository and re-rendered on every pointer in one batch (its "Re-signing
on a cadence", AC33, whose conformance half is this spec's `conformance/hackage/rotation_test.go`),
and `data-model.md` lists a repository batch as a document-only transition on every pointer (its
"Freshness scoped to the pointer", AC36).

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | d31e54b | authoring pass: grounded first draft, not a review | Grounded five ways: captured traffic from cabal-install 3.16.1.0 and 3.8.1.0 and Stack 3.11.1 and 2.9.1, each from the upstream haskell image pinned by digest, on dedicated Podman networks against a logging stub (HTTP, TLS, and a second instance as a signed mirror) serving repositories built and signed with hackage-repo-tool 0.1.1.5 and crafted generations (bootstrap and every update path, the `Range` incremental index against a 505 KB index, a changed compressor failing twice then downloading whole, appended gzip members read whole and incrementally by all four, rollback as stored failing every client in a five-iteration verification loop and re-signed at a higher version adopted by all four, expiry checked only under cabal's inverted `--ignore-expiry` and Stack's `ignore-expiry: false`, fallback to a signed mirror on any `403`, online-key rotation followed and root rotation accepted only with retained old keys and cross-signatures, revisions and `preferred-versions` as appended entries, `index-state`, a malformed `.cabal`, tampered tarballs, the credential split between the cabal lines and between their uploads, Stack's two configuration keys, cabal's repository combining); the hackage-security, cabal-install, hackage-server and Stack sources and docs; the live hackage.haskell.org (TUF metadata and its signatures verified independently, index shape and 358,366 monotonic entries, headers, redirects, Digest-only upload challenges, a byte-for-byte pass-through that cabal 3.16.1.0 and Stack 3.11.1 verified with Hackage's own keys, and Stack 2.9.1's pre-rotation key ids failing against the live root); and OSV (32 `HSEC-` advisories under `Hackage`) and purl. Fifteen questions written in decision shape and adopted under the standing delegation: pointer-scoped timestamp and snapshot with a per-pointer counter (AC6, AC7, AC8), appended gzip members (AC3), segmented index storage with declared blob references (AC28), remotes byte for byte and never re-signed (AC24, AC25), re-signed per-package virtual merges (AC27), candidates refused (AC30), rebasing deletion (AC17), revisions checked for identity and sequence only (AC15), service-held roots with an operator-held option (AC11), Hackage's name rules (AC13, AC14), `403` at the tarball (AC22), the repository-chain signature verdict (AC29), `X-ApiKey` in the shared verifier (AC20), the publish object from the multipart filename (AC21), no preconfigured upstream. Thirty-two criteria, each with a Test Plan row. Stays draft; awaits an independent review. |
| 2026-09-28 | 20ff418 | cross-spec reconciliation of the Wave 1 folds and the foundation wave, on Opus. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` naming this file verified against the current text of its source spec before applying: format-management item 11 and management-api items 11 and 12 (retirement core-held, kinds `publish`, `annotate`, `delete-version`, `configure` with the `POST upload` binding, `Operator`, `repository-type` and `retired`; AC12, AC17, AC18); auth reconciliation item 4 (the `X-ApiKey` form is in `auth.md` AC31 and its Design table; the resolved scheme record discharged; AC20); signing-service item 11 (freshness is `data-model.md`'s generation counter and `moved_at`, generator contract and package, pre-commit dispatch, per-document lock, `root-chain` profile, `external` backend, `signing.resign`, `ServeDocument`; the ten-item list mapped onto the contract; AC6, AC8 to AC11); upstream-adapters item 12 (`https` adapter, `Range` and redirects AC8 and AC15, chunk storage placed on the declared blob list, credential kinds); conformance-harness reconciliation item 4 and client confinement (seed-path signing through the write-path hook, `signing` sub-entry, `trust` key, was-Q6 AC23; the Test Plan obligations paragraph discharged); supply-chain reconciliation item 10 and theme 2 (the `holds` / `restricted-egress` row, `WriteRefusal`, the refusals read route; AC22, AC23); auth was-Q23 (the four TUF documents are descriptors with the sentinel test; AC21); artifact-verification (the `tuf` entry, `tuf-root` trust set, `repository-chain` verdict and publisher-identity nuance; AC25, AC29); proxy-cache (paired revision sets, the TUF version as revision ordering with regression not adopted, declared tarball digests, event classes, refresh; AC25, AC26); data-model AC36 and AC37 and storage-and-gc AC16 (the two revisions this spec raised are made, Q1 and Q3 records discharged); async-operations (`index.merge`, queue core at step 4b; AC27); repository-lifecycle AC12 and FHI AC13 (Capabilities and lifecycle section, new AC33). Adopted Q16 (where `root.json` and `mirrors.json` live: pointer documents identical on every pointer), new AC34, `fable_recheck` extended. Found and reported rather than assumed: `signing-service.md` states no `Range` behaviour for `ServeDocument`, no repository-wide renewal of a pointer document, and no rising version for a virtual's signed documents at each merge; `data-model.md` does not list an accepted operator-held root as a pointer transition; `supply-chain-policy.md`'s vendored orderings omit Hackage's. Thirty-four criteria, each with a Test Plan row. `node scripts/check-spec.js` reports no failure in this file. Stays draft; awaits an independent review. |
| 2026-09-28 | 93982ba | data-loss fix on Opus (storage-and-gc closing-sweep item 0): cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Applied item 0 of "From the storage-and-gc.md closing sweep" in `agents/spec-loop/consequences.md`, verified against `storage-and-gc.md`'s fourth mark root (its third reach, AC16) and `data-model.md` AC34, AC36 and AC45: a digest a document merely mentions keeps nothing alive, the declared blob-digest list is a document's only keep-alive, and a remote writes no content snapshot. The holes: the remote's previous revision, "retained for the stale bound", kept its blobs through nothing (its index chunks the current revision does not declare, such as the tail an upstream rebase replaced, were declared only by a non-current document), and the changed-SHA-256 row said the old blob "stays referenced while its revision is retained" through nothing the sweep follows, although the route already served the current revision's bytes so no request could reach it. Now: the previous revision retained until the next adoption drops it, its non-shared chunks and any CAS-backed TUF document on the remote's repository-level declared blob-digest list (proxy-cache was-Q19, AC27; the declared list chosen because the chunks are already declared-list citizens on the current revision and must live exactly as long as the revision authorises tarball fetches); the old tarball's cached reference ending at the new blob's commit (proxy-cache was-Q20, AC28). The integrity-failure row and AC25 now say "the adopted revision keeps serving", separating it from the retained one. AC26 and AC28 extended (a rebase leaving a chunk only the retained revision uses, a sweep with the grace lapsed, a tarball only that revision names fetched and verified; the old blob collected after a changed SHA-256); Test Plan rows (`internal/format/hackage/proxied_retention_gc_test.go` added) and Phase 4 updated. No new question adopted here; `fable_recheck` extended for the folded decisions. `node scripts/check-spec.js`: zero failures on this file. Stays draft. |
| 2026-09-28 | a3a9d78 | format closing sweep on Opus. Not a review | Not a review. Every still-open item in `agents/spec-loop/consequences.md` targeting this file, from every section, verified against the current text of its source spec and of this file. Applied: foundation-leftovers item 2 and `signing-service.md` AC35 (member-input path `01-index.tar.gz`, literal, since a repository has one index and the remote's route fetches the whole revision as a paired set, so no template and no batch 2 item 1 dependency); signing-service closing-sweep item 6 (hackage AC30: the index's byte ranges over its declared segments are `ServeDocument`'s, the "reported as a sibling consequence" text replaced, AC32 and its row; AC33: the repository-scoped `signing.resign` renewal cited in the service list, the Q16 record's accepted cost and the AC34 row; AC34: the virtual's TUF version from its pointer's counter at every merge commit and member-list change, replacing the "does not yet state" text; AC35: the adoption hook replacing the unnamed second trigger); proxy-cache closing-sweep item 6 (the virtual-only remote's revalidation, AC26); batch 2 item 2 (AC36: composed indices need `verified`, which every adopted revision has, including a trust set bootstrapped on first use, stated; AC36 unchanged); `signing-service.md` was-Q14 and Q18 (tarballs through `ServeFile`, `Cache-Control` per format); management-api closing-sweep items 4 and 5 (the identical republish is the declared unchanged publish, was-Q15, AC5; the retired claim checked at declaration and again at commit, was-Q14, `storage-and-gc.md` AC30; the binding never wider than its operation, was-Q13; AC12 and its row, the write boundary); management-surfaces item 10 (`Operations()` declares `publish`, `annotate` and `delete-version` only, `configure` arriving on the signing-key routes with `internal/signing`'s `Apply` and the rename notice changing nothing; AC16's row names its entry point, the `annotate` operation from the case `script`); supply-chain closing-sweep item 3 (the component-wise integer ordering is vendored, its AC17, the "reported" text replaced); six-spec item 6 (the publish half recorded against a pinned hackage-server, a write row for `conformance-harness.md`'s exception list reported; AC31 and its row). DATA-LOSS AUDIT: the hosted segments and a remote's chunks are declared, the retained revision's blobs are on the remote's list (data-loss fix), tarballs are held by their own cached references, and the virtual's merged index declares its segments; no map or body is held by mention, and the by-hash race `debian.md` has on a virtual does not arise, since a Hackage client verifies the index it fetches against the snapshot it fetched first. Found already done: auth reconciliation item 4 (the `X-ApiKey` form in `auth.md` AC31), the `cabal` / `stack` auth row, the `restricted-egress` binding row, conformance-harness reconciliation item 4. Skipped: nothing. No question adopted; `fable_recheck` unchanged. 34 criteria, each with a Test Plan row. Stays draft. |
