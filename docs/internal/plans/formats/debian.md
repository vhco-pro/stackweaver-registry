---
status: draft
status_description: "Reconciled 2026-09-28 at 15ced69 with the foundation wave (not a review): the index is this format's Indexer generator in internal/format/debian/index run by signing-service's write-path runtime; the envelope is a PointerDocument dated from data-model's per-pointer freshness record (AC36, AC37, AC22 qualified), served through ServeDocument (AC9, AC24); rotation is the dual-signature profile on the signing-key routes (AC14), the Valid-Until cadence a signing.resign schedule (AC10); management operations are publish, place, unplace, delete-version and configure on Operator with dput's .changes as the publish binding and core-held Retirement (AC5, AC13); the envelope and key are descriptors (AC16); WriteRefusal puts the policy condition in the reason phrase apt prints (AC17); the upstream keyring is the remote's trust set under artifact-verification's openpgp scheme, the proxied envelope under proxy-cache's cache-scoped Last-Modified with older envelopes not adopted (AC19); the release qualifier is supply-chain's declared advisory_ecosystem (Q6 revised, AC23); Q10 adopted (keyring and flat checks at first fetch, AC20); virtual merges on index.merge (AC22); Capabilities, rename, deletion and the settings document (new AC28). Earlier: authored 2026-09-26 from captures of apt 2.4.14, 2.6.1, 2.8.3 and 3.0.3 and dput 1.1.3 and 1.2.4; ten questions adopted under the standing delegation; none open. Awaits a /spec review pass."
description: "Spec for the Debian apt archive format: the dists and pool layout with InRelease, Release and Release.gpg, the Packages, Sources, Contents indices and their by-hash forms, hosted through the shared signing and index service with the signed envelope scoped to the serving pointer, proxied as a byte-for-byte, chain-verified cache of an upstream archive, and merged into signed virtual views, with apt on four generations as the oracle."
author: michielvha
goal: "Serve Debian and Ubuntu fleets a private apt archive whose indices are generated and signed by a key the handler never holds and whose rollbacks apt actually sees, and a Debian or Ubuntu mirror cache whose every index and package is verified along the upstream's own signature chain, with apt on Debian bookworm and trixie and Ubuntu 22.04 and 24.04 as the oracle on both paths."
priority: "medium"
issue: 31
created: 2026-09-26
covers:
  - "internal/format/debian/**"
  - "conformance/debian/**"
fable_recheck: "authored on Opus 2026-09-27 while Fable was out of monthly credit; grounded in captured client traffic, but the design judgement was never Fable-reviewed. Cross-spec reconciliation on Opus 2026-09-28 adopted Q10 (upstream keyring and flat-layout checks at first fetch) and revised Q6's qualifier mechanism to the declared advisory_ecosystem, also never Fable-reviewed"
---

# Plan: Debian apt archive format

The Debian repository format, hosted, proxied and virtual: a `dists/{suite}/` tree whose
`InRelease` (or `Release` with a detached `Release.gpg`) carries the SHA256 of every index below
it and is verified by apt against a keyring the client names, index files (`Packages`, `Sources`,
`Contents-{arch}`) in several compressions and under `by-hash/SHA256/`, and a `pool/` of `.deb`,
`.dsc` and source tarballs that apt verifies against the index. apt on four generations is the
oracle for reads, and dput is the oracle for the one upload trigger the ecosystem has.

## Context

Debian sits in Tier 1 of `formats/catalogue.md` as the "Debian archive" family, the eighth of
nine, and "the first format requiring GPG-signed indexes; clients hard-refuse without them".
The charter builds it at step 7, after the **shared signing and index service** that is step 7's
first item and before RPM (`project-charter.md`, build order), so the Debian handler is a
consumer of that service, never its first implementation. The catalogue's multiplier row claims
"apt on Debian, Ubuntu, Mint and Pop!_OS", and its resolved client-reach decision makes each of
those a claim to prove against this one handler (AC25).

This spec follows `foundation/write-triggered-services-prototype.md`, whose Debian-shaped half
exists to discover whether signed-index generation fits the pinned interface, and it builds on
that prototype rather than repeating it (Design, "What this spec takes from the prototype").

Grounding for this draft, stated up front because the constitution asks for evidence or
silence:

- **Captured client traffic.** No apt is installed on this host (`which apt` finds nothing), so
  five pinned images were run with Podman on the host network against a logging stub that
  serves a directory as an archive, records every request with its headers, and can refuse,
  swap generations, demand Basic credentials or disable conditional answers per path:
  `docker.io/library/debian:bookworm` at
  `sha256:704583dbf243593da87cf949fc0543ffeca24a28d36c2760dc9545410cb8ed02` (apt 2.6.1, gpgv
  2.2.40), `debian:trixie` at
  `sha256:d5ce19d4736f0ebbacd686d1040271a5aeb0cc920f5990c1bfae1717627f0674` (apt 3.0.3,
  verifying through `/usr/bin/sqv`), `ubuntu:24.04` at
  `sha256:496754492fb28b4d3049432f2ca787449331e23fb14f0dd3fffea86bf5a93eb4` (apt 2.8.3, gpgv
  2.4.4), `ubuntu:22.04` at
  `sha256:281c5745f657873d78e5531fc5ba8575f46ab7769b94550ac99543f122679986` (apt 2.4.14, gpgv
  2.2.27), and `docker.io/linuxmintd/mint22-amd64` at
  `sha256:34ff53d1dca48a73486c3051425306421278225ae02b6d5066a3c940183cae1f` (apt 2.8.3, an
  Ubuntu noble base with `packages.linuxmint.com wilma` configured). The fixtures were genuine:
  `.deb` files built with the bookworm image's own `dpkg-deb` (an `all` library, an `amd64`
  package depending on it in two versions, an `arm64` build), a native source package built
  with `dpkg-source` and a `.changes` with `dpkg-genchanges`, indices and `Release` written by
  `apt-ftparchive`, `Contents-{arch}` by `apt-ftparchive contents`, and every signature made by
  that image's `gpg` with run-local keys (RSA 4096, a second RSA 4096 as the wrong key, Ed25519,
  and RSA 1024), in variants: SHA512-signed with all four hash sections, SHA256-only, no
  `Acquire-By-Hash`, SHA1-digest, wrong key, dual-signed, tampered inline and detached, expired
  `Valid-Until`, a future `Date`, an older `Date`, no `Date`, a changed `Codename`, a publish
  race, `NotAutomatic`, and no `Translation` entries. dput 1.1.3 (bookworm) and 1.2.4 (trixie)
  uploaded against the same stub, and `apt-file` from each image's own archive read `Contents`.
  A pass-through to the live `deb.debian.org` served trixie and bookworm to apt verifying with
  the stock `debian-archive-keyring`. Every capture started from an empty `/var/lib/apt/lists`
  unless it says otherwise. The stub is not a reference implementation; what the captures prove
  is what the clients send and how they react.
- **The published contract and the client source.** The Debian repository format
  (`wiki.debian.org/DebianRepository/Format`, read 2026-09-26) and the apt sources at tags 2.6.1
  and 3.0.3 (`apt-pkg/acquire-item.cc`, `apt-pkg/deb/debmetaindex.cc`), read for the behaviour
  the captures surprised: the older-`Date` discard, the future-time tolerance and the
  alternative-URI fallback across sources.
- **The live upstreams.** `deb.debian.org/debian` (trixie and bookworm `InRelease` headers and
  fields, a `304` to `If-Modified-Since`, `by-hash` and path headers, index sizes, a pool file's
  headers and a `404`), `deb.debian.org/debian-security` (trixie-security, which carries
  `Valid-Until`), `archive.ubuntu.com/ubuntu` (noble) and `apt.pop-os.org/release` (noble).
- **OSV.** `ecosystems.txt` lists `Debian` and `Ubuntu`; the query API sampled for `openssl`
  under `Debian:12`, `Debian`, `Ubuntu:24.04:LTS` and a `pkg:deb` PURL, and for the binary name
  `libssl3`.

Where the documentation and the captures disagree or the documentation is silent, the captures
win, and the disagreements are recorded because they would otherwise be built from the
documents. The format page says nothing about what a client does with a `Release` older than
the one it holds, and apt silently keeps the newer one (below). It lists `Translation-$LANG` as
`.bz2`, and every live archive sampled lists `.xz` (Ubuntu `.gz` beside it) and no `.bz2`. It calls `Date` required, and apt accepts
a `Release` without one, warning on every update.

Five things make this format worth a careful spec. **The signed document is repository-wide and
dated, and apt discards a signed document older than the one it holds**, so a rollback served
from a snapshot's stored bytes is invisible to every client that already updated; the signature
has to be scoped to the pointer that serves it, not to the snapshot it certifies. **The
index-to-release consistency is a race apt reports as "Mirror sync in progress?"**, and
`by-hash`, whose SHA256 path is exactly this registry's CAS key, is the archive's own cure.
**apt falls back to any other configured source that offers the identical version** when this
registry refuses a package, silently, so a policy refusal is enforceable only where this
registry is the client's sole source for the version. **Nothing in the signature binds the
repository's identity** beyond the key the client names, which is why a virtual repository is
possible here where `hex.md` found it impossible. And **the ecosystem's advisories are keyed by
source package and release**, not by the binary name a client installs.

## Blocking preconditions

**The handler interface re-open must complete before this handler starts**
(`format-handler-interface.md` AC8), and its evidence includes the signed-index half of the
prototype this format was the vehicle for. Debian is Tier 1, so it is not gated by the breadth
verdict; it is gated by its place in step 7.

**The shared signing and index service must be `planned` before Phase 1.** Every hosted index
and every signed envelope is produced by `docs/internal/plans/foundation/signing-service.md`,
built at charter step 7 as the production form of what the step 4a prototype learned; its
Phase 2 (pointer documents, the cadence and the rotation profiles) is the gate for this format's
Phase 1 (its "Implementation Phases"; `project-charter.md` AC12: Debian's handler follows the
service's pointer documents and rotation profiles), and its Phase 4 (the `index.merge` worker)
precedes this format's virtual phase. What
this format required of it, and where that spec provides each item, is Design ("What the
signing and index service provides"), never designed here.

**The management API must be `planned` before Phase 2.** Publishing, the dput binding, suite
membership changes, deletion, suite configuration and key rotation are operations of
`docs/internal/plans/foundation/management-api.md`, whose kind table and cross-format
reconciliation table carry Debian's rows (`publish` with dput's HTTP upload as its binding,
`place`, `unplace`, `delete-version`, `configure`), and whose core the charter builds at step 2
and completes at step 9. Nothing on apt's own wire writes.

**The pointer-scoped envelope is in the shared model.** The resolved envelope decision below
asked `data-model.md` for a pointer-held document outside snapshot content and for the
qualification of its AC22. Both landed: its "Freshness scoped to the pointer, and the documents
that hang on it" carries the per-pointer freshness record (`moved_at` and a generation
counter, AC36) and the `PointerDocument` and `Signature` records (AC37), its AC22 is qualified
(content byte-identical across environments, pointer documents and freshness signals not), and
`storage-and-gc.md` AC16 extends the fourth mark root's current-document half to pointer
documents. Phase 3 waits only on those specs reaching `planned`, which Phase 1's gate already
implies.

**Asynchronous operations must be `planned` before Phase 5.** A virtual repository's merged
view is regenerated as deferred work: the `index.merge` job kind of
`docs/internal/plans/foundation/async-operations.md`, enqueued by `signing-service.md`'s index
runtime (its "Virtual merges", AC19). The queue core lands at the start of charter step 4b, so
this precondition is met in build order before step 7; it is recorded from this side anyway.

**Upstream trust anchors.** The proxied path verifies every upstream `InRelease` against the
upstream's OpenPGP keyring. That keyring is the remote repository's **trust set** in
`docs/internal/plans/foundation/artifact-verification.md` (`openpgp` entries, administered
through `management-api.md`'s trust routes), never a field on `upstream-adapters.md`'s
`Upstream` row, which carries only the transport (that spec's requirement table, the Debian
row); and the check is that spec's `openpgp` scheme reached through `Deps`' `Verifier`, which is
where `signing-service.md`'s resolved boundary decision (was Q5 there) routed the verification
entry this spec first asked of the signing service. Nothing else is required of
`artifact-verification.md`: apt verifies no per-package signature, and that spec lists Debian
among the formats with nothing to verify, every digest answering `absent` (Design, "Signing,
provenance and policy").

## Scope

**In scope:**

- The archive read surface under the format-first mount `/debian/{repository}/`:
  `dists/{suite}/InRelease`, `Release`, `Release.gpg`; per component `binary-{arch}/Packages`,
  `source/Sources` and `Contents-{arch}` in their uncompressed, `.gz` and `.xz` forms, each also
  under `by-hash/SHA256/`; `pool/` files (`.deb`, `.dsc`, source tarballs); a suite reachable by
  its suite name and its codename; the `signing-key.asc` convenience route.
- Hosted generation through the shared signing and index service: incremental index
  regeneration inside the write, a SHA256-only `Release` with `Acquire-By-Hash: yes`, the
  previous two generations of every index kept reachable by hash, and a signed envelope
  (`InRelease`, `Release`, `Release.gpg`) scoped to each pointer, dated monotonically, re-signed
  when the pointer moves, on a cadence when the suite sets `Valid-Until`, and dual-signed across
  a key rotation.
- Source packages (`Sources`, `apt-get source`) and `Contents-{arch}` (`apt-file`).
- Publishing through the management API (a `.deb`, or a source package with its files) and the
  dput HTTP upload served as a binding onto the same publish; suite membership operations (copy
  into a suite, remove from a suite), version deletion with core-held retirement, suite configuration
  (codename, components, architectures, `Origin`, `Label`, `NotAutomatic`,
  `ButAutomaticUpgrades`, `Valid-Until`) and key rotation; the write-boundary declaration.
- The proxied path against a Debian-format upstream (Debian, Debian security, Ubuntu, a
  derivative's own archive): the upstream envelope served byte for byte after verification
  against the upstream's keyring, index files verified against it and served by hash, pool
  files verified against the index, negative caching, and Debian's rows of the removal table.
- Virtual repositories whose merged suites are signed by the virtual repository's own key.
- Non-interactive client authentication as apt sends it (Basic from `auth.conf` or URL
  userinfo), the per-route addressed objects `auth.md`'s pattern scopes evaluate, and the `403`
  rendering of a shared policy refusal.
- Advisory matching through OSV's `Debian` and `Ubuntu` ecosystems by source package and
  release, under the repository's declared `advisory_ecosystem`.
- The handler's `Capabilities()` declaration, repository rename and deletion, and its `settings`
  document (Design, "Capabilities, lifecycle and the settings document").
- apt 2.4, 2.6, 2.8 and 3.0 as the oracle on both paths, and the four named distributions.

**Out of scope for v1**, each with its reason, recorded because the interface spec's definition
of done requires the deliberately unimplemented surface to be named:

- **Flat repositories** (`deb http://host/path ./`). The format defines no `Contents` or
  `Translation` for them and no `by-hash`, so a flat hosted repository would reintroduce the
  publish race `by-hash` cures (captured, Design, "By-hash"); apt reads the `dists` layout on
  every version captured, so nothing is unreachable without it. A proxied flat upstream is
  refused with that reason at its first fetch (the resolved first-fetch validation decision
  below, was Q10).
- **Hosted `Translation-{lang}` files.** A hosted `Packages` carries the full `Description`, as
  `apt-ftparchive` writes it, and a `Release` that lists no `i18n/` file makes apt request none
  and render the description from `Packages` (captured on apt 2.6.1 and 2.8.3 with languages
  enabled). Generating translations would add a document per suite that carries no information
  `Packages` lacks. A proxied upstream's `Translation` files pass through (Design, "The proxied
  path").
- **Hosted pdiffs** (`Packages.diff/Index`). Neither Debian stable (bookworm, trixie), Debian
  security nor Ubuntu noble lists one in its `Release` (sampled 2026-09-26), and apt fetches the
  full index when none is listed; a pdiff chain is a second, stateful representation of a
  document `by-hash` already makes cheap to re-fetch. A proxied upstream that lists them passes
  them through by hash like any other listed file.
- **Hosted `dep11`, `cnf` and `udeb` indices.** Their consumers are AppStream, command-not-found
  and the Debian installer, none of them apt resolving packages, and apt requests only what
  `Release` lists; a proxied Ubuntu upstream's `dep11` and `cnf` pass through.
- **Per-package signatures** (`debsig-verify`, `dpkg-sig`). No captured apt consults them, so a
  verdict on them would change nothing a client does; supply-chain policy can already refuse by
  coordinate and by content.
- **Uploader signatures on `.changes`.** dput with `allow_unsigned_uploads` sends an unsigned
  `.changes` (captured), and the identity of an upload is the registry token per `auth.md`;
  verifying a Debian-maintainer keyring would be a second identity system beside it. A signed
  `.changes` is accepted and its signature is not evaluated.
- **Re-signing proxied content.** A proxied repository serves the upstream's envelope
  unmodified, so every client keeps verifying with the distribution's own keyring (captured
  against `deb.debian.org` with `debian-archive-keyring`), and this registry never vouches for
  upstream content except inside a virtual repository whose clients chose its key (the resolved
  virtual-repository decision below).
- **Package-level `Packages-Require-Authorization`.** A paid-archive feature of apt that the
  repository-scoped authorization in `auth.md` already covers without client cooperation.

## Design

### What this spec takes from the prototype

`write-triggered-services-prototype.md` builds enough of this format to make one publish
regenerate and sign one suite, and it answers six questions for the scheduled re-open. This
spec **depends on three of its findings** and repeats none of its criteria. Each now has a
design-side answer in a sibling spec, which the prototype confirms or refutes before this
format's Phase 1:

- **Its question 1** (can a write-triggered service be expressed through the pinned five methods
  plus `Deps`): `signing-service.md` answers with the optional `Indexer` interface, discovered at
  registration like `Operator` and not a pinned method, whose generator lives in this format's
  own generator package `internal/format/debian/index` (records in, bytes out, no `Deps`, no
  signing import; its "The generator contract", AC2). The handler therefore never submits
  anything to the service; its HTTP package serves what the runtime stored. If the re-open
  refutes the answer, the Design sections that name the generator change their mechanism and
  nothing else.
- **Its question 2** (who owns the trigger): the shared write path does, through the pre-commit
  hook `data-model.md` defines (AC37) and `storage-and-gc.md`'s sole write-transaction
  constructor runs (AC25); every write on this repository, a publish, a dput commit, a
  management operation, a retention pass or a seed, ends with the runtime regenerating what it
  invalidated (`signing-service.md`, "The write path dispatches", AC1). Every trigger in the
  write-boundary declaration below is stated as an event, so it maps onto that hook unchanged.
- **Its question 3** (one snapshot per publish under concurrency) holds by construction under
  that answer, and this spec's concurrency criterion extends it from one suite to every (suite,
  component, architecture) cell a publish touches (AC11; `signing-service.md` AC3 uses this
  format's `conformance/debian/concurrent_publish_test.go` as its real-client half).

Questions 4 to 6 reach this format only through the deferred virtual merge, the `index.merge`
job on `async-operations.md`'s runner (Design, "Virtual repositories").

What the prototype proves, this spec does not re-prove: its AC1 (both signature forms through
real apt, tamper refused), AC5 (no key in the handler) and AC6 (a CAS-backed `Release` across a
sweep) are the mechanism; the criteria here extend them to four apt generations, to the full
index matrix and to paths the prototype never exercises. **Three captured facts were new to it**
when this spec was authored: apt discards a signed document dated older than the one it holds,
so a repoint is invisible unless the served envelope is re-dated (the resolved envelope decision
below); apt revalidates `InRelease` with `If-Modified-Since` alone, so a `Last-Modified` that
moves backwards on a repoint is answered `304` and masks it; and apt requests `by-hash` under
the strongest hash `Release` lists, so the hash set decides whether a `by-hash` path is a CAS
key (the resolved hash-set decision below). This spec asked for a repoint case in the
prototype's Phase 3, and the prototype now carries it: its AC13 asserts that a real apt that
updated before a repoint adopts the older content on its next update, with a forward-moving
`InRelease` date and `Last-Modified`, and that every `by-hash` path apt requests resolves as a
CAS key, in `conformance/debian/repoint_test.go`. They are confirmations of this spec's design,
recorded there as such rather than as a seventh question.

### The wire surface, as captured

Every path hangs off the repository's base URL `/debian/{repository}/`, format-first per
`format-handler-interface.md`'s resolved URL-shape decision: apt appends `dists/...` and
`pool/...` to whatever `URIs:` names, including a path prefix (captured:
`http://127.0.0.1:19401/debian/acme/` on apt 2.6.1), so no root anchoring is needed.

| Surface | Shape, as the pinned clients send it |
|---|---|
| Signed envelope | `GET dists/{suite}/InRelease` first on every `apt-get update`, `Accept: text/*`, `Cache-Control: max-age=0`, `User-Agent: Debian APT-HTTP/1.3 ({apt version})`. A warm update sends `If-Modified-Since` with the stored `Last-Modified` and **never** `If-None-Match`, although the stub served an `ETag` (all four generations); a `304` prints `Hit:` and ends the update for that suite. On a `404` apt requests `dists/{suite}/Release`, then `Release.gpg` (all four) |
| Index files | For each (component, target) the `Release` lists and the client wants: `binary-{arch}/Packages` for the native and every added foreign architecture, `source/Sources` when `Types` includes `deb-src`, `i18n/Translation-en` when `Acquire::Languages` is not `none` and the file is listed, `Contents-{arch}` when `apt-file` is installed. With `Acquire-By-Hash: yes`, apt requests `{dir}/by-hash/{hash}/{hex}` first, where `{hash}` is the **strongest** hash `Release` lists (`SHA512` when present, `SHA256` when it is the only one), and on a `404` falls back to the path (`Ign:` then `Get:`). Without the field it requests the path directly. The compression is the first listed form in `Acquire::CompressionTypes::Order`: `.xz` on a stock system, `.gz` in the official container images, which ship `docker-gzip-indexes` (captured on all four as shipped and with the file removed) |
| Pool files | `GET {Filename}` exactly as the index's `Filename` field names it, no conditional header; a partially downloaded file is resumed with `Range: bytes={n}-` and `If-Range: {partial file's mtime}` (captured on apt 2.6.1) |
| Source files | `apt-get source` fetches the `.dsc` and each file its `Files` list names from the `Sources` stanza's `Directory` (captured on three generations) |
| Contents | `apt-file update` fetches `{component}/by-hash/SHA256/{hex}` for `Contents-{arch}.gz`, the `by-hash` directory sitting beside the file rather than below a subdirectory (captured on apt 2.6.1 and 2.8.3) |
| Upload (dput) | `PUT {incoming}/{filename}` per file, the `.changes` last, `User-Agent: dput`, `Connection: close`, `Content-Length`, no `Content-Type`; a `401` with `WWW-Authenticate: Basic` makes it prompt for a password and repeat with `Authorization: Basic`, then send every later file preemptively; any other non-2xx prints `Upload failed: {status} {reason}` and the body only under `-d` (dput 1.2.4's `methods/http.py`). dput 1.2.4 drops the port from `fqdn` (captured under `-d`: `HTTP-PUT to URL: http://127.0.0.1/...`), so it reaches only the scheme's default port |
| Error rendering | apt prints the status line and the reason phrase, never the body: `Err:2 ... 403  Forbidden [IP: ...]` and `E: Failed to fetch {url}  403  Forbidden`. A `401` or `403` on `InRelease` is followed by `E: The repository '{uri} {suite} InRelease' is not signed.`, which names the wrong cause; the transcript, not the client text, is the evidence of the real one |

The signature failure texts are the format's own oracle for verification and the harness
asserts them rather than paraphrasing:

| Case | apt 2.4.14, 2.6.1 and 2.8.3 (gpgv) | apt 3.0.3 (sqv) |
|---|---|---|
| Signed by a key the client does not hold | `The following signatures couldn't be verified because the public key is not available: NO_PUBKEY {keyid}` | `Missing key {fingerprint}, which is needed to verify signature.` |
| Content altered after signing | `The following signatures were invalid: BADSIG {keyid} {uid}` | `Message has been manipulated` |
| SHA1 digest | `The following signatures were invalid: {fingerprint}`, with `(untrusted digest algorithm: SHA1)` on 2.8.3 | `Policy rejected non-revocation signature (Text) requiring collision resistance because: SHA1 is not considered secure since 2013-02-01` |
| RSA 1024 key | accepted; 2.8.3 warns `Signature by key {fingerprint} uses weak algorithm (rsa1024)` | `Policy rejected asymmetric algorithm because: RSA1024 is not considered secure since 2014-02-01` |
| Unsigned (`Release` only) | `E: The repository '{uri} {suite} Release' is not signed.` (captured on 2.6.1 and 2.8.3) | not captured |
| `Valid-Until` passed | `E: Release file for {url} is expired (invalid since {duration}). Updates for this repository will not be applied.` | the same |
| `Date` in the future | `E: Release file for {url} is not valid yet (invalid for another {duration}). ...` | the same |
| `Codename` changed | `E: Repository '{uri} {suite} InRelease' changed its 'Codename' value from '{old}' to '{new}'`, cleared by `--allow-releaseinfo-change` | the same |
| `Suite` requested differs from `Suite` and `Codename` | `W: Conflicting distribution: {uri} {suite} InRelease (expected {suite} but got {codename})`, then the update succeeds (captured on 2.6.1) | the same |

Ed25519 and RSA 4096 keys with a SHA512 digest were accepted without a warning by all four, and
an `InRelease` carrying two signatures was accepted by a client holding either key alone, and
the detached form by a client holding the second key alone (captured on all four). apt 2.8.3 ships
`APT::Key::Assert-Pubkey-Algo::Future ">=rsa3072,ed25519,ed448"`, and apt 3.0.3's
`/usr/share/apt/default-sequoia.config` retires `rsa2048` on 2030-02-01; the signing service's
key requirement below is set by that stricter horizon.

### Three client behaviours that decide the design

**apt keeps the newer `Release` and discards an older one silently.** A client that updated
against a `Release` dated 12:00 and then received a valid `Release` dated 10:00 (or the day
before) fetched it, verified it, printed `Get:1`, kept the 12:00 indices, and failed its next
install with a `404` on the pool file the newer index named (captured on all four generations).
The apt source states the rule: "Did we get a file older than what we have? This is a last
minute IMS hit and doubles as a prevention of downgrading us to older (still valid) files"
(`pkgAcqMetaBase::VerifyVendor`, identical at 2.6.1 and 3.0.3). An equal `Date` is accepted
(captured: a second generation carrying the first's `Date` replaced it on apt 2.6.1 and
3.0.3). A `Release` with no `Date` is never discarded but prints `W: Invalid 'Date' entry in
Release file` on every update (captured on all four). And `Acquire::Max-FutureTime` defaults to
ten seconds (`debmetaindex.cc`), so a `Date` ahead of the client's clock by more than that is the
"not valid yet" error.

**apt revalidates with `If-Modified-Since` alone.** When the stub answered conditional requests
by modification time, a switch to an older generation whose files were no newer than the
client's stored `Last-Modified` was answered `304` and apt printed `Hit:` (captured on all four).
So the `Last-Modified` of a served envelope must move forward whenever its bytes change, whatever
the age of the snapshot behind it.

**apt falls back across sources for an identical version.** With two configured sources offering
the same version with the same hashes, a `403` from the first printed `Ign:2 ... swhello amd64
1.0-1` and the package came from the second with exit status 0 and no warning (captured on all
four); only when both refused did apt print the `403` and fail. The source explains it:
`pkgAcqArchive` pushes an alternative URI for every trusted source whose index lists the version
(`PushAlternativeURI` in its constructor). A differing hash for "the same" version from two
sources is a `Sources disagree on hashes` warning in the same code.

### The archive layout this registry generates

For each hosted suite the repository's configuration names the suite, an optional codename that
serves the same tree, its components and architectures, and its `Origin`, `Label`,
`NotAutomatic`, `ButAutomaticUpgrades` and `Valid-Until` settings. A generated `Release` carries:

- `Origin`, `Label`, `Suite`, `Codename`, `Date`, `Architectures` (the configured list, and `all`
  is never a separate index), `Components`, `Acquire-By-Hash: yes`, and
  `No-Support-for-Architecture-all: Packages`, the Debian archive's own statement that an `all`
  package appears in every `binary-{arch}/Packages` (sampled in bookworm and trixie);
- `NotAutomatic: yes` and `ButAutomaticUpgrades: yes` when configured, which give the suite's
  versions pin priority 100 (captured on apt 2.6.1 and 3.0.3);
- `Valid-Until` only when the suite configures a window (the resolved `Valid-Until` decision);
- a **`SHA256` section only** (the resolved hash-set decision), listing each index in its
  uncompressed, `.gz` and `.xz` forms, which apt verifies after decompression.

Under each component: `binary-{arch}/Packages` with one stanza per (package, version,
architecture) placed in the suite and component, `all` packages repeated per architecture;
`source/Sources` with one stanza per source version; `Contents-{arch}` listing every path in
every placed `.deb` of that architecture (`all` included) against its `{section}/{package}`, and
its `.gz` form, which is what `apt-file` fetches. The stanzas are the control fields of the
`.deb` plus `Filename`, `Size`, `SHA256` and `Description` in full, exactly as
`apt-ftparchive packages` writes them; `Sources` stanzas are the `.dsc` fields plus `Directory`,
`Package` and `Checksums-Sha256`.

Pool paths are `pool/{component}/{prefix}/{source}/{filename}`, `{prefix}` being the source
name's first letter or `lib` plus its fourth letter, as every Debian archive lays them out; the
component is that of the file's first placement and the path never changes afterwards, so a
cache or a pin that saw it keeps working when the file is copied into another suite.

### Mapping onto the shared model

The levels are exactly those `data-model.md` provides; no table is added by this handler.

- A **binary package** is a `Package` named by its Debian name; a **source package** is a
  `Package` named `src:{name}`, apt's own notation for the source namespace, because the two
  namespaces collide (source `openssl` builds binary `openssl` and `libssl3`). Names satisfy
  Debian's rule, lowercase `[a-z0-9][a-z0-9+.-]+` of at least two characters, and match byte for
  byte; there is nothing to fold.
- A `Version` is one Debian version string, epoch included (`1:2.3-1`), matched verbatim; its
  version-level document holds, per architecture, the control stanza, the file list for
  `Contents`, the pool path, and the set of (suite, component) placements; a source version's
  document holds the `.dsc` fields and its file list.
- Each architecture's `.deb` is a `File` of the version, and a source version's `.dsc` and
  tarballs are its files, each `Blob` keyed by the CAS digest, which is the SHA256 the index
  advertises. Two source versions sharing an upstream tarball (`1.0-1` and `1.0-2` naming one
  `.orig.tar.gz`) are two `File` rows over one blob.
- Deleted coordinates are **retired** as core-held `Retirement` records, one per
  `{package}/{version}/{architecture}` (and `src:{source}/{version}/source`) the deletion
  removes, written in the deleting operation's transaction, outside snapshot content, and never
  republishable (`management-api.md`'s resolved retirement-placement decision, was Q3 there;
  `data-model.md` AC35). This spec first placed the set in the package-level document; the
  semantics are unchanged, and the shared write path, not this handler, refuses a retired
  coordinate with `retired` (409), across a backwards repoint by construction.
- The repository-level document holds the suite configurations the `settings` document sets
  (Design, "Capabilities, lifecycle and the settings document"), each suite's unsigned `Release`
  body (the template the envelope is rendered from, all fields but `Date` and `Valid-Until`),
  the generated index documents, and each suite's **by-hash map** (below), every generated one
  written by the `Indexer` generator through the index runtime, never by the handler. The
  signed envelope is not repository content: it is a `PointerDocument` (the resolved envelope
  decision; `data-model.md` AC37).

### By-hash, the CAS, and the publish race

A client's `apt-get update` is not atomic: it reads `InRelease`, then the indices it names. A
publish landing between the two made every generation fail with `File has unexpected size (868
!= 708). Mirror sync in progress?` when the index was fetched by path, and succeed when the
previous generation's index stayed reachable under `by-hash` (captured on all four, the stub
serving the older `InRelease` beside the newer indices). The format asks the same of servers:
"The current version must and two or more previous versions of a file should be available if
support for by-hash is indicated."

So a hosted suite serves, under `by-hash/SHA256/{hex}`, every index document of the current and
the two previous generations of that suite, looked up in the suite's by-hash map in the
repository-level document of the snapshot the pointer targets, which every write carries
forward and trims. **Because the `Release` lists SHA256 only, the `by-hash` path is the CAS key
of the document** and a `by-hash` read is a lookup of a digest the map names, never a read of an
arbitrary CAS digest, which would make the route an existence oracle across repositories. A
digest the map no longer names answers `404`, and apt then fetches the path (captured), which
serves the pointer's current document; the blobs of the previous generations stay alive through
the snapshot mark root for as long as the retention window holds those snapshots, which is far
longer than the seconds the race lasts. Path requests for an index are served from the current
generation. The same holds for `Contents`, whose `by-hash` sits under the component.

### Every hosted index is a write-triggered document, and the envelope belongs to the pointer

Per the resolved generation decision in `hex.md`, `maven.md` and `cran.md` and this spec's own
envelope decision, the split is the one `signing-service.md` built its storage model on
("Storage: bodies in the snapshot, signatures as records, envelopes on the pointer"):

- **Index documents are snapshot content.** A publish regenerates, through this format's
  `Indexer` generator run by the index runtime before commit, exactly the documents of the
  (suite, component, architecture) cells its change invalidates (the generator's `Affects`),
  their compressed forms, the affected `Contents-{arch}`, `Sources` if it carries a source
  version, the suite's `Release` body and its by-hash map; every untouched cell keeps its bytes
  and its hashes (AC3; `signing-service.md` AC4). They land in the same completed logical write
  and the same snapshot as the change that triggered them, so no snapshot holds a `Release`
  body that disagrees with an index beside it, and a repoint restores them, as `data-model.md`
  AC13 requires of all three levels. A `Packages` at Debian scale is streamed to the CAS as it
  is produced, never buffered whole (the generator contract's streaming writer).
- **The signed envelope belongs to the pointer.** `InRelease`, `Release` and `Release.gpg` for a
  suite are a `PointerDocument` (`data-model.md` AC37): rendered by the generator from the
  `Release` body of the snapshot a pointer targets, its `Date` written from the pointer's
  freshness record, whose `moved_at` is the later of the transition time and one second after
  its previous value (`data-model.md` AC36), optionally `Valid-Until`, signed under the
  repository's active key, and stored beside the pointer rather than in the snapshot. It is
  produced inside the write when the default pointer advances (so the client that published
  sees its package after its next update), inside every promotion and rollback, on the
  `Valid-Until` cadence, and at a key rotation (`signing-service.md` AC10). Its `Last-Modified`
  is the record's `moved_at`, served by the runtime's `ServeDocument`, which also answers `304`
  only on an exact `If-Modified-Since` match (`signing-service.md` AC11), so it only moves
  forward per pointer; its `ETag` derives from its bytes. The handler sets neither header.

That is what makes a rollback real on this format: the client that updated at snapshot N and is
then served snapshot N-1 through a moved pointer receives an envelope dated after its last one,
takes it, and fetches the older indices by hash (AC9). The accepted cost is that the envelope a
promoted environment serves is not byte-identical to the one the source environment served:
the indices and packages are, the `Date` and the signature are not. `data-model.md` states that
qualification of its AC22 in its own words ("content is byte-identical across environments, the
pointer's freshness signals and pointer documents are not"), which this spec raised.

### What the signing and index service provides

This spec first stated seven requirements so the dependency on
`docs/internal/plans/foundation/signing-service.md` could not be lost. That spec was written
against them; each is now a citation, and a disagreement between the two is a defect in one of
them:

1. **An OpenPGP signing key per hosted or virtual repository**, RSA 4096 by default or Ed25519,
   never below the `>=rsa3072,ed25519,ed448` horizon apt 2.8.3 names as its future policy, and a
   SHA-256 or stronger digest, never SHA-1 (captured refusals above): the Debian signing profile
   in its "Key custody", refused at key creation on a backend that cannot produce it (its AC13),
   the key created with the repository under `signing.default_backend` and no instance-wide key.
   The handler never sees the private key: neither the handler nor the generator package may
   import `internal/signing/**` or any signature library (its AC2), which is the prototype's AC5
   held on the production runtime (AC24 here).
2. **Generation of every index representation** from the stored per-version stanzas, in
   `apt-ftparchive`'s field order and wrapping: `Packages`, `Sources` and `Contents-{arch}` with
   their `.gz` and `.xz` forms, the SHA256-only `Release` body with the fields above, and the
   by-hash map carrying the current and two previous generations, **incrementally**: this
   format's generator package, deterministic (its AC25), touching only the cells a change
   invalidates (its AC4; AC3, AC12 here), with the stanza bytes proven against
   `apt-ftparchive` by this spec (AC3), since that spec leaves each format's renderer
   knowledge to the format ("The renderers' format knowledge").
3. **The pointer-scoped envelope**: a clearsigned `InRelease` and a `Release` with its detached
   `Release.gpg`, signed together from one body, with the monotonic `Date` above, a
   `PointerDocument` produced at every pointer transition (its AC10) and stored inline or
   CAS-backed under the fourth mark root's current-document half (`storage-and-gc.md` AC16).
   The `Valid-Until` cadence is a `signing.resign` `Schedule` on `internal/async`, one per signed
   pointer, re-signing at `signing.resign_at_fraction` of the window (default `0.5`, the half
   this spec asked for), which creates no snapshot (its "Rotation profiles", AC22).
4. **Rotation with overlap**: the `dual-signature` rotation profile, under which activating the
   new key produces a second signature for every served body and every envelope carries both for
   `signing.rotation_window` (default 30 days), then the old records are dropped; an atomic
   cutover creating no snapshot (its AC7, AC8). The operations are `management-api.md`'s
   signing-key routes (`POST /api/v1/repositories/{name}/signing-keys`, `.../activate`,
   `.../retire`, `.../import`), `configure` operations under the admin role.
5. **The public key** as an ASCII-armoured block, served at `signing-key.asc` from the public
   forms the service keeps (its `PublicKeys`) and listed in the management surface with its
   fingerprint, in the form `Signed-By` accepts both as a file and inline in a deb822 `.sources`
   file (captured on all four generations); its AC12 byte-checks every declared public form.
6. **A verification entry** that checks an upstream `InRelease`, or `Release` with
   `Release.gpg`, against a supplied keyring: routed by that spec's resolved boundary decision
   (was Q5 there) to `artifact-verification.md`'s `openpgp` scheme (cleartext and detached forms,
   flag `any` so an upstream's dual-signed envelope verifies with either key), run against the
   remote's trust set (Design, "The proxied path").
7. **The virtual merge**: this generator's `Merge` with Debian's rule (Design, "Virtual
   repositories"), run as the deferred `index.merge` job, never on a request's path (its
   "Virtual merges", AC19).

### The publish path and what counts as a write

Nothing on apt's wire writes. Hosted content arrives through the registry-owned management API,
`docs/internal/plans/foundation/management-api.md`, and through the dput HTTP upload served as a
binding onto its `publish` operation (the resolved dput decision below). The handler implements
that spec's optional `Operator` interface, declaring the kinds below through `Operations()` and
the dput routes through `Bindings()`; every operation arrives through `Submit`, runs the
handler's `Apply` inside one write transaction, and the index runtime regenerates and re-signs
before the same commit. The kind of each row, and so its action, is that spec's cross-format
reconciliation table, where Debian's rows sit (the action follows the kind, never the format):

| Operation | Kind | What it carries | Effect a client sees | Action |
|---|---|---|---|---|
| Publish a binary package | `publish` | A `.deb`, a target suite and component | The version's stanza appears in every affected `binary-{arch}/Packages` and in `Contents`, and `apt-get install` of it succeeds after `apt-get update` | `push` |
| Publish a source package | `publish` | A `.dsc`, every file its `Checksums-Sha256` names, a target suite and component | The stanza appears in `Sources` and `apt-get source` retrieves every file | `push` on every object it adds |
| Copy a version into a suite | `place` | Coordinate, target suite and component | The same pool file appears in the target suite's indices; the pool path is unchanged | `push` |
| Remove a version from a suite | `unplace` | Coordinate, suite | It leaves that suite's indices; the pool file keeps serving while any placement remains | `delete` |
| Delete a version | `delete-version` | Coordinate | It leaves every suite, its pool files answer `404`, and its coordinates are retired | `delete` |
| Configure a suite | `configure` | The `settings` document (Design, "Capabilities, lifecycle and the settings document") | `Release` fields change after the next update; a changed `Codename` produces apt's captured error until the client passes `--allow-releaseinfo-change` | admin role |
| Rotate the signing key | `configure`, through the signing-key routes | Create, activate, retire | Envelopes carry both signatures for the window, then the new one alone | admin role |

The content operations are `POST /api/v1/repositories/{name}/operations` with the kind and a
`target` coordinate; suite configuration arrives as the repository's `settings` on create or
`PATCH`, dispatched to the handler as `configure` and a completed write because it changes
`Release` (`management-api.md`, repository administration); key rotation is the signing-key
routes, whose `Apply` is `signing-service.md`'s with this generator called in the same
transaction. Every kind this handler declares has a `script`-driven conformance case
(`management-api.md` AC24, enforced by `conformance-harness.md` AC26), which AC13 and AC14 are.

What this registry enforces on ingest:

- A `.deb` is spooled to a bounded temporary buffer outside the CAS and parsed as an `ar`
  archive whose first member is `debian-binary` (`2.0`) and whose `control.tar` member carries
  a `control` file with `Package`, `Version` and `Architecture`; the `data.tar` member's listing
  is read once for `Contents`. A body that is not such an archive, a name or version outside
  Debian's grammar, or an architecture the suite does not configure (other than `all`), is
  refused with `422` naming the field, nothing committed.
- A source publish is refused with `422` when any file the `.dsc` names is missing or its SHA256
  disagrees.
- **A coordinate that already exists is refused with `409`**, with identical or different
  bytes; copying into another suite is the copy operation, not a republish. **A retired
  coordinate is refused** with `retired` (409), centrally by the shared write path against the
  core-held `Retirement` records (`management-api.md`, "Retirement is core-held"), the
  cross-format rule `npm.md`, `pypi.md`, `hex.md` and `maven.md` adopted. **A pool filename collision is refused**: pool filenames omit the epoch
  (`dpkg-deb` names `swhello_1.0-1_amd64.deb` for `1:1.0-1` and `1.0-1` alike), so two
  coordinates differing only in epoch, or a source tarball of the same name with different
  bytes, cannot share a pool path and the second is refused; a shared tarball with identical
  bytes is accepted.
- A publish or any other operation against a proxied or virtual repository answers `405` with
  problem type `repository-type`, identically through the API and through the dput binding
  (`management-api.md` AC7).

`data-model.md` requires each format spec to declare its write boundaries. Debian's:

- **One publish is one completed logical write**: the version's files, every regenerated index
  document and the suite's `Release` body land in one snapshot, and the default pointer's
  envelope is re-signed before the response is sent.
- **One dput upload is one write**, committed when its `.changes` arrives (below); the files
  before it are uploads, not writes.
- **Each copy, removal, deletion and suite configuration change is one write**; a bulk removal
  the management API groups is one write however many versions it touches, per the grouping
  rule `formats/generic.md` set.
- **Re-signing an envelope is never a write**: a pointer transition, the `Valid-Until` cadence
  and a key rotation change what is served and create no snapshot, because the envelope is not
  content.
- A proxied repository creates no snapshots; a virtual repository's merged documents are derived
  state and create none.

### The dput binding

dput is the ecosystem's one client that uploads over HTTP (captured, "The wire surface"), and
its shape maps onto the shared model without an upload session of its own. Each `PUT` of a
`.deb`, `.dsc` or tarball under `/debian/{repository}/upload/` is a single-request upload whose
blob commits into the repository's CAS and is then **in flight in the repository** in
`data-model.md`'s sense, protected by the repository-scoped grace period. The `.changes` `PUT`
is the publish: its `Distribution` names the suite, each file's `Section` names the component
(`contrib/misc` means `contrib`, a bare section means the suite's first component), and its
`Checksums-Sha256` names every file **by digest**, so the commit binds digests in flight in the
repository, never "the files this client sent": `data-model.md` forbids keying on an uploader
or a push session, and none is needed. A `.changes` naming a digest that is not in flight in the
repository, or whose files fail ingest, is refused with `422` and a `text/plain` body naming the
file, nothing committed; the in-flight blobs then age out through the grace period like any
unreferenced upload. dput prints the status and reason on a refusal, so the body reaches the
operator only under `dput -d` and through the transcript.

How it meets `management-api.md`'s binding rule ("Bindings: one operation, two ways in"): dput is
one of the clients that rule names, the `.changes` `PUT` is the binding, and its route
implementation only parses the `.changes` into a `publish` operation whose declared blob digests
are the ones it names and submits it through `Submit`, with no authorization, write or
validation of its own; the per-file `PUT`s before it are uploads, not bindings, each authorized
under the object it names (the table in "Addressed objects and pattern scopes"). `Authorize`
then reports every object the publish adds, each binary coordinate and the source coordinate,
and `Submit` evaluates every pair, so a token patterned to cover the source but not one of its
binaries is refused the whole upload and nothing commits (an operation's pairs must all pass,
that spec's kind rules). One seam is recorded rather than smoothed over: that spec's AC8 holds a
binding's `Scope(r)` equal to its operation's `Authorize` result, while `Scope(r)` reports
exactly one object (`format-handler-interface.md`, "The pinned method set") and a `.changes`
publish reports several; the route reports `src:{source}/{version}/changes` and the equality
AC8 checks cannot hold for a multi-object binding as written. The gap is `management-api.md`'s
to close, listed as a sibling consequence of this pass.

### Signing, provenance and policy

apt trusts one thing, the repository signature over `Release`, and derives trust in every index
and pool file from the SHA256 chain below it; no captured apt checks a per-package signature. So
this format requires of `docs/internal/plans/foundation/artifact-verification.md` no artifact
entry (that spec lists Debian among the formats with nothing to verify: every digest answers
`absent`, and the conformance matrix's verification column reads `none` with this spec cited,
its AC24), only the `openpgp` scheme the proxied path uses for upstream envelopes, and of the
signing service everything listed above.

Advisory matching goes through OSV, which **covers Debian and Ubuntu, keyed by source package
and by release** (sampled 2026-09-26): `openssl` at `3.0.11-1~deb12u2` under `Debian:12` matched
46 records (`DEBIAN-CVE-2023-5678` and on), each `affected` entry naming
`pkg:deb/debian/openssl?arch=source&distro=bookworm` with an `ECOSYSTEM` range over Debian
version ordering; the same query under the bare `Debian` matched 69 across releases;
`Ubuntu:24.04:LTS` matched 47 `UBUNTU-CVE-*` records; and the binary name `libssl3` under
`Debian:12` matched **nothing**. No `MAL-` record exists for either ecosystem, so no advisory
here is a malware signal and none purges. Per the resolved advisory-coordinate decision below,
the coordinate this format hands the policy engine is the source package (the stanza's `Source`
field, or the package name when absent) with the source version (the version in parentheses in
`Source`, or the package's own) under a **release qualifier the repository carries**. That
qualifier is `supply-chain-policy.md`'s `advisory_ecosystem`, a core-parsed repository field
the operator declares (`Debian:12`, `Ubuntu:24.04:LTS`), validated at configuration against the
advisory sources' ecosystem lists and never read by this handler ("OS-package repositories
declare their ecosystem"; `data-model.md` stores it beside the retention rules). The operator
documentation gives the mapping from an upstream's `Origin` and `Version` (`Debian` and `13.7`
give `Debian:13`; `Ubuntu` and `24.04` give `Ubuntu:24.04:LTS` for an LTS release), which this
spec first had the registry derive at configuration (the revision under the resolved
advisory-coordinate decision, was Q6). A hosted repository declares none unless the operator
sets one, because its packages are not Debian's and a name shared with a Debian source package is
a coincidence, not an advisory. An advisory-dependent rule on a repository with no declaration
is refused at configuration as `validation` (422), `supply-chain-policy.md` AC11's rule; the
handler's part is handing the source coordinate to the shared resolution call, and its source
versions are compared under the Debian ordering that spec implements.

### Authentication: Basic, preemptive, as apt sends it

apt presents HTTP Basic from `/etc/apt/auth.conf.d/*.conf` (netrc format) or from userinfo in
the `URIs:` value, **preemptively** on every request once an entry matches, with no challenge
round (captured on all four: the first request of the update already carried it). An entry
without a scheme is **refused by apt itself on plain HTTP**: `W: ... Credentials for
127.0.0.1:19401 match, but the protocol is not encrypted. Annotate with http:// to use.`, then
the `401` (captured on all four). That is the Basic presentation `auth.md` already verifies (its
AC31), so no new form is needed; the client table needs an `apt` and a `dput` row, which this
spec's authoring pass listed as a sibling consequence and which `auth.md` does not yet carry
(checked 2026-09-28), so it is listed again, and AC15's auth cases wait on it per that spec's
rule that each row is confirmed against captured traffic first. How this meets `auth.md`, whose rules this spec does not bend:

- **The challenge is uniform.** A credential-less request under a repository that is not
  anonymously readable answers `401` with `WWW-Authenticate: Basic`, byte-identical for a
  private and a non-existent repository; a valid credential lacking `pull` answers `404`
  (`auth.md` AC17); a rejected credential answers `401` and is never served as anonymous (its
  AC12). apt renders all three on `InRelease` as the misleading "is not signed" error above, so
  the operator documentation names the transcript, and dput reacts to the `401` challenge by
  prompting, which is why its uploads are configured with `login` and fed the token.
- **TLS.** `auth.md` AC27 refuses a credential over a connection this registry did not terminate
  with TLS unless the operator's flag is set; apt already declines to send an unannotated
  credential over HTTP, so the two agree on the default. The harness's transcript capture
  terminates TLS with its CA injected into the client image's trust store.

### Addressed objects and pattern scopes

`auth.md`'s pattern scopes narrow a credential within one repository by matching the object each
request addresses, and the format declares which object each route reports
(`format-handler-interface.md` AC12). The canonical named object is
`{package}/{version}/{architecture}` for a binary file and `src:{source}/{version}/source` for a
source file, with the version as stored (epoch included), resolved by looking the pool path up
in the pointer's snapshot (hosted) or the remote's digest index (proxied); a pool path that
resolves to nothing makes `Scope(r)` return an error, which denies with the unauthorized
response.

| Route | Object kind | Canonical object |
|---|---|---|
| `dists/{suite}/InRelease`, `Release`, `Release.gpg` | descriptor | - (the envelope names the suite's index files by path and SHA256, and its fields; no package, version or pool digest) |
| Every index file and every `by-hash` path | none | - (each enumerates names; a digest-addressed index is still a listing) |
| `pool/.../{package}_{version}_{arch}.deb` | named | `{package}/{version}/{architecture}` |
| `pool/.../` `.dsc` and source tarballs | named | `src:{source}/{version}/source` |
| `signing-key.asc` | descriptor | - (a signing-key document) |
| dput `PUT` of a `.deb` | named | `{package}/{version}/{architecture}` from the filename, confirmed against `control` at commit, a disagreement refused |
| dput `PUT` of a `.dsc` or tarball | named | `src:{source}/{version}/source` from the filename |
| dput `PUT` of the `.changes` | named | `src:{source}/{version}/changes` from the filename, every file it binds having been authorized under its own object at its own `PUT` |
| Publish a `.deb` (management API) | named | `{package}/{version}/{architecture}` from `control`, read in a bounded peek at the `ar` archive's leading members, which is where `control.tar` sits |
| Copy, remove, delete (management API) | named | the coordinate |

What that gives and costs, applying `auth.md`'s rules rather than re-deciding them. The envelope
and the key are **descriptors** (`auth.md`'s resolved name-free-document decision, was Q23:
"an index of metadata files named by checksum and type" and "a signing-key document" are its
own examples, with RPM's `repomd.xml` the nearest sibling), held by the sentinel test
`format-handler-interface.md` AC12 runs on every descriptor route (a sentinel package seeded,
the envelope fetched, any of its name, version or pool digest in the body failing the table);
the index documents a digest in the envelope names are not objects the repository holds but
generated listings. **A patterned `pull` still cannot resolve through apt on this format**: a
token patterned `acme-*/**` now reads `InRelease`, and `apt-get update` fails at the first
`Packages` it requests, by `by-hash` or by path, because every index enumerates names and
reports none; `curl` of an in-pattern pool file under the same token succeeds and an
out-of-pattern one is refused. That is the consequence `julia.md`, `cran.md` and `conda.md`
record for their listings, and the one helm, dnf and zypper share, whose first enumerating
document is also unavoidable. **A patterned `push` publishes**, through the
management API and through dput, because every upload names its object before its bytes are
committed.

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines, on a
pool route of either path, the handler answers `403` with a `text/plain` body naming the policy
and rule, written through the shared refusal writer `WriteRefusal` in `internal/format`
(`format-handler-interface.md` AC14). apt prints the status line and its reason phrase and exits
non-zero, never the body (captured with the canonical phrase: `403  Forbidden`), which is the
reason-phrase limit `pypi.md` named and `maven.md` and `hex.md` confirmed, confirmed here for a
fourth ecosystem. `supply-chain-policy.md` answered it (its resolved refusal-status-line decision,
was Q10, and AC18): on an HTTP/1.1 connection the writer hijacks the connection and writes
`HTTP/1.1 403 Refused by policy: {condition}`, and `deployment.md` keeps the main listener on
HTTP/1.1 by default (`server.http2: false`), so the phrase apt prints names the condition
instead of `Forbidden`; over HTTP/2 it falls back to the canonical phrase with the condition in
the body. The refusal rule for this format is `package-level` in that spec's "When a refusal
binds, per format" table, filled from this spec's captures (below) and asserted by AC17. The index keeps listing the refused version (the resolved refusal decision
below; `conda.md`'s no-elision precedent), because eliding it would mean regenerating and
re-signing a hosted suite on every advisory sync and is impossible on the proxied path without
re-signing the upstream's index.

**Whether the refusal holds is decided by the client's other sources, not by this registry**
(captured, "Three client behaviours"): a client that also lists the upstream directly, or a
second mirror, installs the identical version from there silently. The operator documentation
therefore states that enforcement requires this registry to be the client's only source for the
versions it governs, and AC17 asserts both outcomes rather than claiming the first.

### The proxied path

The handler owns the request and classifies for the proxy layer's fetch-and-cache API per the
settled decisions in `proxy-cache.md`. The upstream is an archive base URL (`deb.debian.org/debian`,
`deb.debian.org/debian-security`, `archive.ubuntu.com/ubuntu`, a derivative's archive), bound as
an `Upstream` row of `upstream-adapters.md`'s `https` adapter (an `https://` root, or an
`http://` one only with `allow_http` set, that spec's AC22; the transport half is the adapter's,
the path derivation from the cached `Release` is this handler's), together with the upstream's
OpenPGP keyring as `openpgp` entries of the remote's trust set (`artifact-verification.md`,
administered through `PUT /api/v1/repositories/{name}/trust` or `.../trust/import`). Neither is
checked against the live upstream at configuration, because `management-api.md` accepts a
well-formed upstream it cannot reach; the first fetch is the check (the resolved first-fetch
validation decision below, was Q10; AC20). The chain this registry walks is apt's own, done
once for every client:

- **The envelope is mutable metadata with a TTL** and is served byte for byte. It is fetched with
  `If-Modified-Since`, and `If-None-Match` where the upstream serves an `ETag` (the live archive
  serves one, answers `304` to `If-Modified-Since` and sends `Cache-Control: public,
  max-age=120`, sampled), and before a fetched envelope is committed its signature is verified
  against the remote's trust set through `Deps`' `Verifier` (`artifact-verification.md`'s
  `openpgp` scheme, flag `any`, since an upstream mid-rotation dual-signs; the handler imports
  nothing of `internal/verify`, `format-handler-interface.md` AC15), inside the proxy layer's
  fetch, where an integrity call may refuse the commit (`proxy-cache.md`, "Integrity of fetched
  content"). A failure is `proxy-cache.md`'s **integrity failure at fetch** class: never
  committed, the previous verified envelope keeps serving within the stale-if-error limit, and
  the operator is alerted with the real reason, because on this format that is what an upstream
  key rotation looks like. The envelope is ~140 to 255 KB (trixie 140,421 bytes, bookworm
  151,075, noble 255,850), which crosses a small inline threshold, so it is a CAS-backed current
  document under the fourth mark root, the case that root was created for.
- **Freshness is the cache's.** The proxied envelope is served byte for byte, its own `Date`
  included, but its `Last-Modified` is the remote's cache-scoped record (`proxy-cache.md`,
  "Freshness of what a remote serves", AC22; `data-model.md` AC44's `adopted_at`), forward-moving
  on every adopted revision and never the upstream's header, and a conditional request is `304`
  only on an exact match. An upstream envelope whose `Date` is older than the adopted one's (a
  lagging mirror behind a round-robin name, or an upstream rollback) is **not adopted**: the
  cached revision stands and a divergence is recorded, because apt would discard the older
  `Release` anyway and serving it would only pair an older envelope with clients' newer lists.
- **Caching headers.** This registry serves every `by-hash` document and pool file, hosted and
  proxied, with `Cache-Control: public, max-age=2592000`, the value the live archive uses for
  both, since neither can change under its path, and every envelope and path-addressed index
  with `Cache-Control: no-cache`, since both change with the pointer.
- **Every index file is immutable by hash.** A `by-hash/SHA256/{hex}` request is served when the
  hash is one the cached envelope (or one of its two predecessors) lists, fetched from the
  upstream's own `by-hash` path (which the live archive serves with `max-age=2592000`) and
  verified by construction, since the path is the digest. A path request for an index is
  resolved to the hash the **currently cached** envelope names for that path and served as that
  blob, so a client is never handed an index that disagrees with the envelope it was just
  served, which is the race the hosted path cures with `by-hash`. Files the envelope lists that
  this registry does not generate on the hosted path (`Translation`, `dep11`, `cnf`, pdiffs,
  debian-installer indices) pass through on the same rule, and components carrying a slash
  (`updates/main` in Debian security, sampled) are served because the route grammar follows the
  cached `Release` rather than a fixed depth.
- **Pool files are immutable artifacts**, cached indefinitely (the live archive serves them with
  `max-age=2592000` and `application/vnd.debian.binary-package`), fetched **stream-and-verify
  against the SHA256 the cached index names for that `Filename`**, never committed on a mismatch
  or a truncated body. The handler keeps a **digest index**, `Filename` to SHA256, package,
  version and architecture, parsed from each cached `Packages` and `Sources` and cumulative
  across generations, so a client holding yesterday's lists still gets a verified file after the
  upstream superseded it. A pool path in no cached index answers `404` with no upstream request
  (the resolved unknown-coordinate precedent in `julia.md`), because a file with no digest to
  verify against cannot be cached forever.
- **The suite set is the upstream's.** A suite this registry has never fetched is requested
  upstream on first use; an upstream `404` on `InRelease` and on `Release` is negatively cached
  with the short TTL, and a `429` or `5xx` never is (`proxy-cache.md` AC9).
- **No URL rewriting exists on this format**: `Filename` and `Directory` are relative to the
  archive base, so a proxied index is served unmodified.
- `Valid-Until` bounds serve-stale in practice: an upstream envelope past its own `Valid-Until`
  (Debian security's is seven days, sampled) is refused by every client, so the operator alert
  names the expiry when a stale envelope nears it.
- Publish and every management operation against a proxied repository answer `405` with
  problem type `repository-type` (`management-api.md` AC7).

Upstream removal maps onto the settled purge-or-flag table as Debian's side of that contract: the
handler classifies each observed event into one of `proxy-cache.md`'s event classes ("Upstream
removal or replacement", which names Debian in the rows below) and the layer executes the
response:

| Upstream event, as observed at revalidation | Classification |
|---|---|
| A version replaced by a newer version of the same package in the same index generation (a point release, a security update) | An **ordinary metadata change**: the new stanza is served, the old pool file keeps serving through the cumulative digest index, no divergence is recorded, because supersession is how this ecosystem ships every update |
| A package vanishing from a suite with no successor | **Removal with no signal**: keep serving, record an operator-visible divergence and alert once; the wire carries no reason (a removal for release-critical bugs and a security removal look the same) |
| A pool file whose bytes change for an unchanged `Filename` | A **coordinate-bound immutability violation**, treated as the explicit signal: purge the cached file, alert, and re-fetch and verify against the new digest on demand, since every client that cached the old bytes now disagrees with the index |
| The envelope no longer verifies against the remote's trust set | An **integrity failure at fetch**: not committed, serve stale within the limit, alert |
| An upstream envelope dated older than the adopted one | **Regression not adopted**: the cached revision stands and a divergence is recorded (`proxy-cache.md` AC22) |
| `Suite` or `Codename` changes (a release transition moving `stable` from bookworm to trixie) | An **ordinary metadata change**, served verbatim; the client's own captured `Codename` error is the upstream's behaviour and passes through |

Detection happens at revalidation, passively (`proxy-cache.md`, the resolved passive-detection
decision); the active channel is the advisory feed, which carries vulnerability advisories and
no malware signal for these ecosystems, so nothing on this wire is an explicit security signal.

### Virtual repositories

Per the resolved virtual-repository decision below, a virtual repository of format `debian`
serves, for each suite name, the merge of its members' suites of that name, **signed by the
virtual repository's own key**. That is expressible here and not in Hex because apt binds no
repository identity inside the signature: the only trust input is the keyring the client's
`Signed-By` names, and a `Suite` that differs from the requested one is a warning (captured,
"Conflicting distribution"). What the virtual repository's signature asserts is precise and is
documented as such: "these stanzas are the ones this registry published, or the ones the
upstream's own signature chain certified and this registry verified before merging them".

- **Merge rules.** Per (suite, component, architecture), the stanzas of every member in member
  order, with a (package, version, architecture) offered by several members taken from the
  first; `Components` and `Architectures` are the union; `Origin`, `Label`, `Codename`,
  `NotAutomatic` and `ButAutomaticUpgrades` come from the virtual repository's own suite
  configuration. Pool paths are the members' paths under the virtual mount, each resolving
  through the member that supplied the stanza. `by-hash` and the envelope follow the hosted
  rules, the envelope scoped to the virtual repository.
- **Verification before merge.** A remote member's indices enter a merge only after its envelope
  verified against the member's trust set and each index against the envelope's SHA256, so the
  virtual signature never covers an unverified stanza; the merge reads that verdict from the
  verdict store through `Deps` and verifies nothing itself (`signing-service.md`, "The
  produce/verify boundary").
- **Regeneration is deferred.** The merge rule above is this format's generator's `Merge`. A
  hosted member's write, or a remote member's envelope changing at revalidation, enqueues an
  `index.merge` job on `internal/async` through the pre-commit hook, coalesced per virtual
  within `index.virtual_merge_window` (default 5 s) and visible within
  `index.virtual_staleness_bound` (default 60 s), with the first merge enqueued at the virtual's
  creation and one per member-list change (`signing-service.md`, "Virtual merges", AC19). The
  virtual repository serves its last merged, signed state until the regeneration commits
  atomically, and a failed merge leaves the previous set and an alert, never an empty index, so
  no signing ever runs on a client's request. A virtual repository creates no snapshots: its
  merged documents are derived state, stored as its current documents under the fourth mark
  root's current-document half (`storage-and-gc.md` AC16). Its envelope is re-rendered and
  signed at every merge commit with a `Date` never earlier than the last one the virtual served,
  because apt discards an older `Release` from a virtual exactly as from a hosted suite; the
  natural source is the freshness record of the virtual's own default pointer advanced at each
  merge commit, which `signing-service.md`'s "Virtual merges" does not yet state and which this
  pass lists as a sibling consequence (AC22 asserts the forward-moving `Date`).
- **What it costs clients.** A client of a virtual repository trusts this registry's key for
  upstream packages too, and pinning or `unattended-upgrades` rules written against
  `origin=Debian` no longer match, since `Origin` is the virtual repository's. Both are stated in
  the operator documentation beside the recipe for listing a hosted and a proxied repository as
  two sources instead.

### Capabilities, lifecycle and the settings document

`Capabilities()` declares proxy support `supported`, reference-implementation availability
`available` (`reprepro`, the corpus reference below), `Virtual: supported` and
`Rename: supported` (`format-handler-interface.md` AC13). Virtual is supported for the reason
the resolved virtual-repository decision gives: nothing in apt's signature binds the
repository's identity.

**Rename changes no stored byte.** No served document carries the repository's name: `Origin`
and `Label` come from the suite settings below, not from the name, `Filename` and `Directory`
are relative to the base URL, and the signing key follows the repository's identity, so the
keyring every client's `Signed-By` names keeps verifying (`signing-service.md` AC29;
`repository-lifecycle.md` AC12). The handler receives the rename as a `configure` operation
inside the rename transaction, re-renders nothing and produces no snapshot; the old name answers
exactly what a never-existing repository answers. The cost is the operator's: every client's
`URIs:` line names the old path and must be edited, since `repository-lifecycle.md`'s resolved
alias decision (was Q2 there) provides no redirect. `repository-lifecycle.md` AC12 requires
`conformance/debian/rename_test.go`, enforced by the harness's case-set validator
(`conformance-harness.md` AC26); AC28 carries it with a real `apt-get update` and install from
the new name.

**Deletion retires the keys.** Deleting a repository moves every signing key of it to `retired`
in the deletion transaction, keeps the public forms retrievable by digest until tombstone time,
and destroys private material at tombstone time (`signing-service.md` AC29); its
`signing.resign` schedules are disabled and its pending `index.merge` jobs cancelled in the same
transaction (`async-operations.md` AC28). A client that fetched an envelope inside the retention
window can still verify it; nothing new is signed.

**The `settings` document.** `repository-lifecycle.md` leaves each format to declare its
`settings` document, validated and applied through `configure` at creation and on change. This
format's, for a `local` or `virtual` repository, is a list of suites, each with `suite`, an
optional `codename`, `components`, `architectures`, `origin`, `label`, `not_automatic`,
`but_automatic_upgrades` and an optional `valid_until` window; the handler's `Apply` validates it
(a suite or codename colliding with another, an empty component or architecture list, a window
shorter than the re-sign cadence can keep alive) and refuses a bad one as `validation` (422)
naming the field, and stores it in the repository-level document, so a change is one completed
write whose next envelope carries the new fields. A `remote` declares none: its suite set is the
upstream's. `advisory_ecosystem` is not a setting: it is the core-parsed field of
`supply-chain-policy.md`, never read by the handler.

### Conformance, the clients and the corpus

The four apt generations straddle real watersheds: 2.4.14 and 2.8.3 verify through gpgv and
3.0.3 through sqv, with different failure texts and different key policies; 2.8.3 warns on
RSA 1024 where 3.0.3 refuses it; the official container images prefer `.gz` indices where a stock
system prefers `.xz`. Every hosted and proxied case runs on all four, in the image as shipped
(container builds are the dominant CI use) and with `docker-gzip-indexes` and
`docker-no-languages` removed, which is how a host behaves. **Client reach**: the Linux Mint 22 image
(`linuxmintd/mint22-amd64`, the Mint project's own build image, which configures
`packages.linuxmint.com wilma` over an Ubuntu 24.04 base) reports apt 2.8.3, the Ubuntu 24.04
generation (captured), and a cold install through it matched Ubuntu's transcript, and Pop!_OS 24.04's release repository ships
no `apt` of its own (its `Packages` sampled), so Pop!_OS runs Ubuntu's too; the two are proven
as distribution configurations, each distribution's image running the install cases on both
paths (AC25). No official Pop!_OS image exists (`docker.io/pop-os/pop` and `ghcr.io/pop-os/pop`
do not resolve; only community images are published), so its image is built by the harness
from the pinned `ubuntu:24.04` digest with `apt.pop-os.org/release` added, the recipe pinned in
the case directory. dput 1.1.3 and 1.2.4 are the upload clients; 1.2.4's cases run against an
endpoint on the scheme's default port, because it drops the port.

The recorded surface for the replay corpus, named now because a thin recording script yields a
thin specification: a cold and a warm `apt-get update` and `apt-get install` against
`deb.debian.org` for bookworm and trixie and `archive.ubuntu.com` for noble and jammy, `apt-get
source`, `apt-file update`, a missing suite, and, against a hosted reference archive run in a
container pinned by digest (`reprepro` serving a tree it generated, because the public archives
accept no test upload), a publish's visibility, a dput upload, a Basic-authenticated update, a
`by-hash` fetch of a previous generation and a rollback. Recording gates on the harness's
redaction criterion (`conformance-harness.md` AC13); the Basic `Authorization` value is exactly
what the allowlist must name. Deliberate divergences from the reference go on the recorded
exception list before their flow is expected to replay: SHA256-only `Release`, no hosted
`Translation`, pointer-scoped envelopes re-dated on a repoint, and `409` on a republish.

## Acceptance Criteria

- [ ] AC1: `apt-get update` and `apt-get install` of a package with an `all` dependency succeed
      from a hosted repository configured as a deb822 source whose `URIs:` names its
      format-first URL, with `Signed-By` naming the served `signing-key.asc`, as a file and
      inline, on apt 2.4.14, 2.6.1, 2.8.3 and 3.0.3, both in each image as shipped (fetching
      `.gz`) and with `docker-gzip-indexes` and `docker-no-languages` removed (fetching `.xz`);
      `by-hash` and pool responses carry `Cache-Control: public, max-age=2592000` and the
      envelope `Cache-Control: no-cache`; the transcript shows `InRelease` first
      and every index fetched by `by-hash/SHA256`, a warm update sends `If-Modified-Since` and
      receives a `304` for `InRelease` with no other request, a foreign architecture added with
      `dpkg --add-architecture` fetches its own `Packages` and downloads its `.deb`, and a
      `Release` listing no `Translation` makes the client request none.
- [ ] AC2: Every hosted envelope verifies on all four generations in both forms, the clearsigned
      `InRelease` and `Release` with `Release.gpg` (the latter with `InRelease` answering `404`),
      with no warning on any of them; a client holding another key, and a client served an
      altered envelope, each fail with that generation's captured text from Design; and the
      service's key and digest are accepted by apt 3.0.3's sqv policy and are not flagged weak by
      apt 2.8.3.
- [ ] AC3: A publish of a `.deb` through the management API into one suite and component creates
      exactly one snapshot in which the file, the regenerated documents of every cell it touches
      and the suite's `Release` body land, the default pointer's envelope is re-signed before the
      response, and a client that updated before sees the new version after one further `apt-get
      update`; every index document of a cell the publish did not touch, and of every other
      suite, is byte-identical before and after; every `Release` lists only a `SHA256` section
      and carries `Acquire-By-Hash: yes`; and each generated `Packages` stanza carries the fields
      `apt-ftparchive` writes for the same `.deb`, in its order.
- [ ] AC4: dput 1.1.3 uploads a binary and a source `.changes`, and dput 1.2.4 the same against a
      default-port endpoint, each creating exactly one snapshot at the `.changes` `PUT` and none
      before it, after the client's `401` challenge and its preemptive Basic retry, the commit
      binding exactly the digests its `Checksums-Sha256` names; a `.changes`
      naming a digest not in flight in the repository, or a `.deb` whose `control` disagrees with
      its filename, is refused with `422` and nothing committed, and a real `apt-get install`
      then retrieves exactly the uploaded bytes.
- [ ] AC5: A publish of an existing coordinate is refused with `409` with identical and with
      different bytes, and a publish of a deleted coordinate is refused `409` `retired` by the
      shared write path, including after the delete's snapshot was pruned out of retention and
      after the default pointer was moved back to a snapshot that predates the deletion; a version differing from an existing one only in
      epoch, and a source tarball of an existing name with different bytes, are refused as pool
      filename collisions, while a second source version sharing an identical tarball is
      accepted; and a `.deb` whose name or version is outside Debian's grammar, or whose
      architecture the suite does not configure, is refused with `422` naming the field.
- [ ] AC6: A published source package appears in `Sources` with its `Checksums-Sha256`, and `apt-get source --download-only`
      on three generations retrieves the `.dsc` and every file it names byte-identical, from
      a `deb-src` source.
- [ ] AC7: After a publish, `apt-get update` and `apt-file update` fetch the component's
      `Contents-{arch}.gz` by hash, and `apt-file search` for a path inside the published `.deb`
      names its package, on apt 2.6.1 and 2.8.3.
- [ ] AC8: A client that fetched a suite's envelope before a publish and its indices after it
      completes `apt-get update` without a size or hash error, because the previous two
      generations of every index stay reachable under `by-hash/SHA256`; a `by-hash` request for a
      digest the suite's by-hash map does not name answers `404`, including a digest that exists
      in the CAS through another repository, and apt then completes by path.
- [ ] AC9: A client on each generation that updated against snapshot N sees snapshot N-1's
      content after an environment pointer is rolled back and one further `apt-get update`, and
      installs from it; the served envelope's `Date` is never earlier than any `Date` previously
      served on that pointer, including with the server clock stepped backwards under an injected
      clock, and its `Last-Modified` moves forward at every transition, so the client's
      `If-Modified-Since` is answered `200`; and promoting a snapshot to a second pointer serves
      byte-identical indices and pool files there.
- [ ] AC10: A suite without a configured window serves no `Valid-Until`; a suite configured with
      one serves an envelope whose `Valid-Until` lies inside the window, and an environment pointer
      left idle for three windows under an injected clock is re-signed before each expiry by its
      `signing.resign` schedule, so `apt-get update` succeeds at every step, with no snapshot
      created by any re-sign.
- [ ] AC11: Two concurrent publishes into one suite, into the same and into different components
      and architectures, both land, each in exactly one snapshot, and the envelope served
      afterwards enumerates both with every `Release` checksum agreeing with the document it
      names, proven under property-test interleavings and then by a real `apt-get install` of
      both packages.
- [ ] AC12: The latency of a publish into a suite holding 10,000 versions is benchmarked against
      the same publish into an empty suite, and CI fails on a regression beyond a threshold
      recorded in the CI config and referenced from this spec, as `storage-and-gc.md` AC7 does for
      throughput.
- [ ] AC13: Copy (`place`), removal from a suite (`unplace`), deletion (`delete-version`) and a
      suite configuration change (`configure` through the repository's `settings`), driven
      through the management API, each create exactly one snapshot with the effect Design names
      seen by a real client: a copied version installs from the target suite with its pool path
      unchanged, a removed version leaves only that suite, a deleted version answers `404` and is
      retired, and a changed `Codename` produces the captured error until
      `--allow-releaseinfo-change`; a principal holding `push` alone is refused removal and
      deletion, a non-administrator is refused suite configuration, a malformed `settings`
      document is refused `validation` (422) naming the field with no snapshot, and every one of
      them against a proxied or virtual repository answers `405` `repository-type`.
- [ ] AC14: A key rotation through the management API's signing-key routes (create, activate,
      retire, under the `dual-signature` profile) serves envelopes carrying both signatures
      during the overlap, accepted by clients holding the old key alone and the new key
      alone on all four generations, then envelopes signed by the new key alone, which the
      old-key client refuses with its generation's captured missing-key text; no snapshot is
      created and no index document changes.
- [ ] AC15: On a private repository a credential-less `InRelease` request answers `401` with a
      Basic challenge byte-identical for a private and a non-existent repository; each generation
      then updates and installs with the token in an `auth.conf.d` entry annotated with the
      scheme, and with URL userinfo, the transcript showing Basic on the first request; a wrong
      token answers `401` and is never served as anonymous; a valid token lacking `pull` answers
      `404`; and a credential presented over a connection this registry did not terminate with
      TLS is refused per `auth.md` AC27.
- [ ] AC16: A token holding `pull` under the pattern `acme-*/**` reads `InRelease`, `Release`,
      `Release.gpg` and `signing-key.asc` (descriptors) and fails `apt-get update` at the first
      index it requests, retrieves an in-pattern pool file with `curl` and is refused an
      out-of-pattern one and every `by-hash` path; the envelope's body carries none of a seeded
      sentinel package's name, version or pool digest (the descriptor sentinel check of
      `format-handler-interface.md` AC12); a token holding `push` under the same pattern publishes
      `acme-tool` through the management API and through dput and is refused `other-tool`, with
      no snapshot created by a refusal; a `.deb` whose `control.tar` lies beyond the bounded peek
      is refused before any byte reaches the CAS; and in proxied mode the patterned `pull` token
      fetches an in-pattern pool file and is refused another.
- [ ] AC17: A pool file the shared policy layer refuses answers `403` with a `text/plain` body
      naming the policy, on the hosted and the proxied path, the index still listing the version;
      over HTTP/1.1 the raw status line is `HTTP/1.1 403 Refused by policy: {condition}`
      (`supply-chain-policy.md` AC18); a real `apt-get install` of it with this registry as the
      only source exits non-zero printing that reason phrase, with the body in the transcript; and with a second source
      offering the identical version configured, the same install succeeds from that source with
      exit status 0, asserted from the transcript, which is the documented limit of enforcement.
- [ ] AC18: The proxied path serves a Debian stand-in's `InRelease` byte-identical to the
      upstream's, and apt 2.6.1 and 3.0.3 verify it with the stock `debian-archive-keyring`, and
      apt 2.4.14 and 2.8.3 an Ubuntu stand-in's with the stock `ubuntu-keyring`, and install; from
      fresh client lists a second update and install reach this registry while the upstream
      receives no request, asserted at the network layer; a path request for an index is served
      as the blob the cached envelope names; a listed `Translation`, `dep11` or `cnf` file passes
      through by hash; and every pool file was verified against the cached index's SHA256
      before commit.
- [ ] AC19: A proxied envelope is revalidated after its TTL and not before, conditionally, so an
      unchanged one costs a `304` upstream; a version published upstream becomes installable after
      the TTL and, absent an explicit refresh, not before; neither a `by-hash` index nor a pool
      file is ever revalidated; every adopted envelope is served under a cache-scoped
      `Last-Modified` later than the previous one, never the upstream's; and an upstream envelope
      dated older than the adopted one is not adopted and records a divergence, so a real apt
      that updated before an upstream rollback keeps its lists and installs without error.
- [ ] AC20: A remote repository whose upstream envelope does not verify against its trust set,
      or whose upstream is a flat repository, is accepted at configuration and fails its first
      fetch with nothing committed, the client receiving `502` and the operator an alert naming
      the reason (the keyring, or the flat layout); a stand-in envelope with a bad signature, an index disagreeing
      with the envelope, and a pool file disagreeing with the index are each never committed,
      attach no cached reference, and are recorded observably to the operator, the envelope case
      serving stale within the limit; and a pool path in no cached index answers `404` with no
      upstream request.
- [ ] AC21: A superseded upstream version keeps serving through the cumulative digest index with
      no divergence recorded; a package vanishing without successor keeps serving with a
      divergence recorded; a pool file whose bytes change under an unchanged `Filename` is purged
      with an alert and re-fetched against the new digest; an upstream `404` on a suite is
      negatively cached while a `429` or `5xx` is neither cached as absence nor surfaced as
      not-found; and a component name carrying a slash is served: Debian's side of
      `proxy-cache.md` AC13's table.
- [ ] AC22: A virtual repository over a hosted and a remote member serves, per suite, a merged
      envelope signed by its own key, from which every generation installs a hosted package and an
      upstream package; a (package, version, architecture) offered by both members is served from
      the first; after the remote member's upstream publishes, the virtual repository keeps
      serving its previous signed state until the deferred `index.merge` regeneration commits,
      within `index.virtual_staleness_bound`, and then serves the new version under an envelope
      whose `Date` and `Last-Modified` are later than the previous one's, with no signing
      operation on any client request path; and a remote member whose envelope fails
      verification contributes nothing to the merge.
- [ ] AC23: With a remote repository declaring `advisory_ecosystem: Debian:12` and an advisory
      rule attached, a binary whose stanza names an affected source package and source version is
      refused at resolution through the case-controlled advisory source, while the same binary
      name under an unaffected source is served, a `libssl3` stanza whose `Source` is `openssl`
      being matched as `openssl` at the source version; the same repository declaring
      `Ubuntu:24.04:LTS` matches the Ubuntu record set instead; and an advisory-dependent rule on
      a hosted repository with no declaration is refused at configuration as `validation` naming
      the missing declaration.
- [ ] AC24: Every hosted and virtual index document and envelope is produced by this format's
      generator run by the shared index runtime, never by the handler, proven by the architecture
      test that neither the handler package nor `internal/format/debian/index` imports
      `internal/signing/**`, key material or a signature library (`signing-service.md` AC2) and
      that the handler sets no `Last-Modified` or `ETag` on a generated document (its AC11); and a proxied envelope above
      the inline threshold, and a hosted `Packages` above it, are CAS-backed, survive a GC sweep
      through the fourth mark root, and serve to a real client afterwards.
- [ ] AC25: Debian (bookworm, trixie), Ubuntu (22.04, 24.04), Linux Mint 22 and Pop!_OS 24.04,
      each in an image pinned by digest (Pop!_OS's built from the pinned `ubuntu:24.04` by the
      recipe in its case directory), pass AC1's install case and AC18's proxied case, as the
      catalogue's client-reach criterion (its AC2) requires of every distribution its multiplier
      table names.
- [ ] AC26: Replay-match passes against a corpus recorded from `deb.debian.org`,
      `archive.ubuntu.com` and the pinned `reprepro` reference archive covering the recorded
      surface named in Design.
- [ ] AC27: A suite configured `NotAutomatic` with `ButAutomaticUpgrades` gives its versions pin
      priority 100 in `apt-cache policy` on apt 2.6.1 and 3.0.3, and a suite requested by its
      codename serves the same envelope as by its suite name; a suite that does not exist answers
      `404` on `InRelease` and `Release`, and apt reports that the repository has no `Release`
      file.
- [ ] AC28: The handler's `Capabilities()` declares proxy `supported`, reference-implementation
      availability `available`, `Virtual: supported` and `Rename: supported`; after a rename a
      real `apt-get update` and `apt-get install` from the new name succeed in both modes with
      the same `Signed-By` keyring and no snapshot created by the rename, while the old name
      answers exactly what a never-existing repository answers; and after a repository deletion
      no envelope is signed under its keys while its public key stays retrievable until
      tombstone time.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/debian/hosted_test.go` (four generations, each as shipped and host-like; `Signed-By` as file and inline; `by-hash` and `304` asserted from the transcript; foreign architecture; no `Translation` request) |
| AC2 | conformance + integration | `conformance/debian/signing_test.go` (both envelope forms on four generations with no warning line; wrong-key and altered envelopes with each captured text asserted); `internal/format/debian/envelope_test.go` (the served envelope verified with a Go OpenPGP verifier; key algorithm and digest against the sqv horizon) |
| AC3 | conformance + integration | `conformance/debian/publish_test.go` (management-API publish, update, install); `internal/format/debian/publish_test.go` (snapshot count, untouched cells byte-compared, SHA256-only `Release`, envelope re-signed before the response) |
| AC4 | conformance + integration | `conformance/debian/dput_test.go` (dput 1.1.3 and 1.2.4, binary and source `.changes`, challenge and preemptive retry from the transcript, install of the uploaded bytes); `internal/format/debian/dput_commit_test.go` (no snapshot before the `.changes`, missing digest and control mismatch refused) |
| AC5 | conformance + integration | `conformance/debian/publish_test.go` (republish refusals through the endpoint); `internal/format/debian/immutability_test.go` (retirement after pruning under an injected clock and across a backwards repoint, the central refusal being `management-api.md`'s and `data-model.md` AC35's; epoch and tarball collisions; shared identical tarball; grammar and architecture refusals) |
| AC6 | conformance | `conformance/debian/source_test.go` (three generations, byte comparison) |
| AC7 | conformance | `conformance/debian/contents_test.go` (`apt-file` on apt 2.6.1 and 2.8.3, `by-hash` fetch asserted) |
| AC8 | conformance + integration | `conformance/debian/race_test.go` (envelope served before a publish, indices after, via a `holds` declaration on the client's first index request, `conformance-harness.md` AC27); `internal/format/debian/byhash_test.go` (map trimming, foreign-repository digest refused) |
| AC9 | conformance + integration | `conformance/debian/rollback_test.go` (four generations: update at N, repoint, update, install from N-1; promotion byte comparison; shared with `signing-service.md` AC10's apt half, and extending the prototype's single-generation `conformance/debian/repoint_test.go`, its AC13); `internal/format/debian/envelope_date_test.go` (monotonic `Date` from the pointer's freshness record and `Last-Modified` through `ServeDocument`, with a clock stepped backwards; the record itself is `data-model.md` AC36's) |
| AC10 | integration + conformance | `internal/format/debian/valid_until_test.go` (injected clock over three windows, snapshot count; the schedule mechanics are `signing-service.md` AC22's); `conformance/debian/valid_until_test.go` (a real update after each re-sign, and the captured expiry text when re-signing is disabled in a fault-injection build) |
| AC11 | integration + property | `internal/format/debian/concurrent_publish_test.go` (interleavings over cells, checksum agreement); `conformance/debian/concurrent_publish_test.go` (real install of both) |
| AC12 | benchmark | `internal/format/debian/publish_bench_test.go`, with the threshold in `.github/workflows/ci.yml` |
| AC13 | conformance + integration | `conformance/debian/manage_test.go` (copy, remove, delete, `Codename` change with the captured error; each kind's trigger in the case's `script`, the per-kind case `management-api.md` AC24 requires); `internal/format/debian/manage_test.go` (snapshot per operation, `push`-only and non-administrator refusals, malformed `settings`, `405` `repository-type` on remote and virtual) |
| AC14 | conformance + integration | `conformance/debian/rotation_test.go` (old-key and new-key clients across the overlap and after it, four generations; the real-client half of `signing-service.md` AC7's `dual-signature` profile); `internal/format/debian/rotation_test.go` (no snapshot, indices unchanged) |
| AC15 | conformance + integration | `conformance/debian/auth_test.go` (challenge equality across existing and missing repositories; `auth.conf.d` and userinfo; wrong and `pull`-less tokens); `internal/format/debian/auth_test.go` (plaintext refusal under `auth.md` AC27) |
| AC16 | conformance + unit | `conformance/debian/auth_test.go` (the pattern-refusal case `format-handler-interface.md` AC7 and `auth.md` AC8 require, in both modes; pattern-scoped tokens through the `credentials` key; deep-`control.tar` fixture through `curl`); `internal/format/debian/scope_object_test.go` (the object table, per route, with the descriptor sentinel check on the envelope and the key through the shared helper in `internal/format/scope_test.go`, `format-handler-interface.md` AC12) |
| AC17 | conformance + integration | `conformance/debian/policy_test.go` (hosted and proxied modes; rules through the `policies` key, a controlled advisory through `advisories`; sole-source failure with the `Refused by policy` phrase in apt's output and two-source fallback both asserted from the transcript); `internal/format/debian/refusal_test.go` (the raw status line on the socket; the writer itself is `internal/format/refusal_writer_test.go`, `supply-chain-policy.md` AC18) |
| AC18 | conformance + integration | `conformance/debian/proxied_test.go` (Debian and Ubuntu stand-ins serving recorded archives; stock keyrings; network-level assertion from fresh lists); `internal/format/debian/proxied_verify_test.go` (path-to-hash resolution, pool verification before commit) |
| AC19 | conformance | `conformance/debian/proxied_ttl_test.go` (mutating stand-in; `304` upstream at the network layer; no revalidation of `by-hash` or pool); `conformance/debian/proxied_rollback_test.go` (the lagging stand-in serving an older envelope after a newer one, a real apt on each generation; the proxied rollback case `proxy-cache.md` AC22 names under `conformance/debian/`) |
| AC20 | integration | `internal/format/debian/upstream_config_test.go` (remote created against an unverifiable envelope and against a flat upstream, accepted, then the first fetch failing with nothing committed and the alert naming the reason); `internal/format/debian/proxied_integrity_test.go` (bad signature, index mismatch, pool mismatch, unknown pool path, operator record) |
| AC21 | integration | `internal/format/debian/removal_test.go` (stand-in presenting each event class; the shared-layer half is `proxy-cache.md` AC13's; slash component; negative caching and throttling responses) |
| AC22 | conformance + integration | `conformance/debian/virtual_test.go` (four generations installing from both members; first-member-wins; a second update after the merge adopting the new envelope); `internal/format/debian/virtual_regen_test.go` (the `index.merge` job held and released through the kind pause, no signing call on the request path, failed member excluded, forward-moving `Date`; the runtime half is `signing-service.md` AC19's) |
| AC23 | integration | `internal/format/debian/advisory_coordinate_test.go` (source-package mapping under a declared `advisory_ecosystem`, `Debian:12` and `Ubuntu:24.04:LTS`; hosted refusal at configuration, the validation itself being `supply-chain-policy.md` AC11's; the `advisories` fixture carrying records for both) |
| AC24 | architecture test + integration | `internal/format/debian/arch_test.go` (no key material, signing primitive or `internal/signing` import in the handler or its generator package, beside `signing-service.md` AC2's module-wide test; no freshness header set by the handler, beside its AC11); `internal/storage/metadata_root_test.go` (threshold crossing, sweep, serve through a real client in the conformance half) |
| AC25 | conformance | `conformance/debian/clients_test.go` (six distribution images pinned by digest; the Pop!_OS build recipe in `conformance/debian/images/`) |
| AC26 | conformance | `conformance/debian/replay_test.go` |
| AC27 | conformance | `conformance/debian/suite_config_test.go` (`apt-cache policy` priority on apt 2.6.1 and 3.0.3; codename alias; missing suite) |
| AC28 | unit + conformance + integration | `internal/format/debian/capabilities_test.go` (the four declarations, `format-handler-interface.md` AC13); `conformance/debian/rename_test.go` (`repository-lifecycle.md` AC12, presence enforced by `conformance-harness.md` AC26; update and install from the new name, same keyring); `internal/format/debian/delete_keys_test.go` (no envelope signed after deletion, public key retrievable to tombstone time; the key lifecycle itself is `signing-service.md` AC29's) |

The case set needs only keys already in the harness's closed `setup` vocabulary (its resolved
closed-vocabulary decision, was Q4): `repositories` with type, virtual member order, the suite
`settings` and a `signing` sub-entry (a fixture private key file or `generate`), `credentials`
(patterned tokens included), `upstreams` (fixture servers serving recorded Debian and Ubuntu
archives, a mutating variant, a lagging variant serving an older envelope and a flat variant),
`trust` for a remote's upstream keyring (`artifact-verification.md` AC25), `state` for
pre-published, pre-copied and pre-deleted versions and seeded `Retirement` records, and
`policies` with `advisories`. The two obligations this spec first recorded on the harness are
met there: a hosted `state` entry comes out generated and signed because the index runtime runs
before every commit, the seed write included, with no seed-side code (`signing-service.md` AC21,
`conformance-harness.md` AC24), and the case reads the repository's public key from the server
before its client runs; and the race case holds the client between two requests with a `holds`
declaration (`conformance-harness.md` AC27), while the two-source fallback case's second source
is an `upstreams` stand-in on the case network that the client's second `sources.list` line
names, the client reaching nothing else (the harness's resolved client-confinement decision, was
Q6 there, AC23). The runner-enforced obligations, both modes, the unauthenticated, unauthorized
and pattern-refusal cases, a `script`-driven case per declared management kind and
`rename_test.go`, apply through `conformance-harness.md` AC26 and are not restated per criterion.

## Implementation Phases

### Phase 1: Hosted reads and generated documents
- Waits on `docs/internal/plans/foundation/signing-service.md` reaching `planned` (Blocking
  preconditions)
- The format-first mount, the `settings` document with codename aliases, the `Indexer`
  generator in `internal/format/debian/index` producing the `Release` body and indices in three
  compressions with `Contents`, `by-hash` with its map, pool serving with `Range`, the default
  pointer's envelope, `signing-key.asc`, the challenge and scope mapping, the per-route
  addressed objects with the descriptor sentinel check, the `403` rendering through
  `WriteRefusal`; `Capabilities()` with the rename case (AC28)

### Phase 2: Publish and management
- Waits on `docs/internal/plans/foundation/management-api.md` reaching `planned`
- The `Operator` interface declaring `publish`, `place`, `unplace`, `delete-version` and
  `configure`, with dput's `.changes` route as the `publish` binding; `.deb` and source publish
  with the bounded peek, immutability, epoch collisions and core-held retirement; the dput
  binding over in-flight digests; copy, removal, deletion, suite configuration; the
  write-boundary declaration under concurrency; the publish benchmark

### Phase 3: Pointer envelopes
- The pointer-scoped envelope is in `data-model.md` (AC36, AC37) and `signing-service.md`
  (pointer documents, AC10); nothing further to wait on beyond Phase 1's gate
- Envelopes re-rendered at every pointer transition with the monotonic `Date` and
  `Last-Modified`, the `Valid-Until` cadence on `signing.resign`, key rotation under the
  `dual-signature` profile

### Phase 4: Proxied path
- The `https` upstream binding and the trust-set keyring, envelope verification before commit
  with the first-fetch checks, cache-scoped freshness with older envelopes not adopted,
  index-by-hash and path-to-hash serving, the cumulative digest index, pool stream-and-verify,
  negative caching, the removal table, the source coordinate under the declared
  `advisory_ecosystem`, `405` on remote writes

### Phase 5: Virtual repositories
- Waits on `docs/internal/plans/foundation/async-operations.md` reaching `planned`
- The generator's `Merge`, verification before merge, the `index.merge` deferred
  regeneration, the virtual envelope with its forward-moving `Date`

### Phase 6: Corpus and gate
- Recording across the named surface after the harness redaction gate, replay-match, the four
  generations as shipped and host-like, the six distribution images, dput on both versions, the
  exception-list entries named in Design

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. The nine questions this draft raised were each written in the template's decision
shape and then adopted at their own recommendation under the owner's standing delegation of
2026-09-26, so the loop can continue; each is recorded below as adopted rather than decided,
folded through Scope, Design, the criteria and the Test Plan in the same pass, and reversible by
the owner at any time. `grep -rn "standing delegation"` is the owner's review queue. A tenth,
where the upstream keyring and flat-layout checks run once `management-api.md` accepts an
unreachable upstream at creation, was raised and adopted the same way by the 2026-09-28
reconciliation with the foundation wave, which also recorded under Q6 how the release qualifier
became `supply-chain-policy.md`'s declared `advisory_ecosystem`.

### Resolved: where the upstream keyring and flat-layout checks run (was Q10, raised and adopted 2026-09-28)

**Adopted 2026-09-28 under the owner's standing delegation.** Option A: a remote repository is
accepted at configuration with its `https` upstream and, separately, its trust set, and the
first fetch is the check: an upstream envelope that does not verify against the trust set, or
an upstream with no `dists/{suite}/InRelease` or `Release` where a flat repository's `./Release`
answers, fails that fetch with nothing committed, a `502` to the client and an operator alert
naming the reason. Folded through Scope (flat repositories), Design ("The proxied path"), AC20
and its Test Plan row, and Phase 4.

The question: this spec's AC20 refused, **at configuration**, a remote whose upstream envelope
does not verify against the supplied keyring or whose upstream is flat, by fetching one suite's
`InRelease` during configuration. The foundation specs since written make that impossible as
stated: `management-api.md` validates a remote's upstream with `upstream.Validate` inside the
creation transaction and accepts "an unreachable but well-formed upstream" (no network request
at creation), and the keyring is no longer part of the upstream at all but the remote's trust
set in `artifact-verification.md`, written through its own admin route, possibly after the
remote exists.

**Recommendation (adopted):** A, because it needs no creation-time network request and no new
handler hook, and the property the old criterion protected, that no unverified envelope is ever
committed or served, is unchanged: the integrity-failure class commits nothing whatever the
configuration said.

| Option | You get | It costs |
|---|---|---|
| **A. Accept at configuration; the first fetch verifies and detects a flat layout, failing with an alert** | One configuration rule across formats; no probe inside a transaction; the trust set can be set before or after the upstream | A misconfigured remote is discovered at its first client request, not at creation |
| **B. A handler hook that fetches and verifies at creation and on every trust-set change** | The refusal at configuration, as first written | A new optional interface for the re-open and a network request inside creation, which `management-api.md` declined for every format; and the trust set can change without the upstream changing, so the hook would need a second trigger |
| **C. A management-side "test upstream" operation the operator runs** | An explicit check without blocking creation | A new operation kind outside the closed vocabulary for one format's convenience; the first fetch still has to handle failure anyway |

**Why this is yours:** it trades an earlier failure for one uniform configuration rule, which
is an operator-experience call, and it is the same call `cargo.md` adopted for its sparse check.

Accepted cost: a remote with a wrong keyring or a flat upstream fails at first use; the alert
names the reason and the operator documentation says to run one `apt-get update` after creating
a remote. B lost because it adds an interface and a creation-time probe; C lost because it adds
a kind to a closed vocabulary to do what the first fetch already does.

### Resolved: where the signature lives, given that apt discards an older `Release` (was Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: index documents and the
unsigned `Release` body are snapshot content; the signed envelope is scoped to the pointer,
re-dated at every transition with a `Date` never earlier than the pointer's last, and stored
outside snapshot content, which this spec raises as a revision of `data-model.md` rather than a
table of its own (Design, "Every hosted index is a write-triggered document, and the envelope
belongs to the pointer"; AC9, AC10, AC14; Phase 3 and its precondition).

The question: `data-model.md` makes rollback and promotion pointer moves over immutable
snapshots, and apt keeps a newer `Release` over an older one silently (captured on four
generations; the apt source calls it a downgrade prevention), so a snapshot-held signed
`Release` makes every rollback invisible to clients that already updated.

**Recommendation:** A. It is the only option under which a rollback works for apt without a
warning on every update, and the signing it adds happens at pointer transitions, which are rare
administrative events, never on a read.

| Option | You get | It costs |
|---|---|---|
| **A. Pointer-scoped envelope, re-dated at each transition** | Rollback and promotion work on every generation; `Valid-Until` and rotation become re-signs that create no snapshot | A shared-model revision (a pointer-held document outside snapshot content), and a promoted environment's envelope is not byte-identical to the source's, qualifying `data-model.md` AC22 |
| **B. Omit `Date` from every `Release`** | Snapshot-held signed documents; rollback visible | `W: Invalid 'Date' entry` on every update on every generation, against a field the format calls required, one apt release away from an error |
| **C. Snapshot-held envelope dated at the write** | No model change | Every rollback is silently ignored by every client that updated past it, and the next install fails on a `404` for the newer pool file |

**Why this is yours:** it asks the shared model to carry a new kind of record for one format's
client rule, and it bends a promotion guarantee you settled.

Accepted cost: the `data-model.md` revision and AC22's qualification, both raised as sibling
consequences and both since landed (`data-model.md`, "Freshness scoped to the pointer, and the
documents that hang on it", AC22 qualified, AC36 and AC37; `signing-service.md`'s pointer
documents, AC10, which state this record's rule for every consumer). B lost on the warning; C
lost because it makes the product's rollback feature a lie on this format.

### Resolved: `Valid-Until` on hosted suites (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: no `Valid-Until` unless a
suite configures a window, and a configured window is kept alive by re-signing every pointer's
envelope at half the window (Design, "What the signing and index service provides", item 3;
AC10).

The question: `Valid-Until` defends against a replayed stale `Release`, the Debian security
archive sets seven days and the main archive sets none (sampled), and any served envelope that
outlives its window is refused by every client.

**Recommendation:** A. TLS already defeats replay on the path this registry controls, an idle
environment pointer must not expire because nobody published, and operators who want the
freshness guarantee get it with the cadence that keeps it safe.

| Option | You get | It costs |
|---|---|---|
| **A. Off by default; configurable, with cadence re-signing** | No expiry surprise; freshness available to those who ask | A signing cadence per pointer when enabled |
| **B. A default window on every suite** | Freeze-attack protection everywhere | An expiry on every idle pointer the moment re-signing stalls, a build outage from a background job |
| **C. Never** | Nothing to schedule | No way to offer what Debian security offers |

**Why this is yours:** it trades an availability risk against a replay defence clients already
get from TLS.

Accepted cost: the cadence, and the documentation of what enabling it asks of the signing
service's availability.

### Resolved: virtual repositories, and whether this registry signs content it proxies (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: proxied repositories
serve the upstream envelope byte for byte and are never re-signed; virtual repositories merge
their members' suites and sign the merge with their own key, after verifying every remote member
along its upstream chain, and regenerate as deferred work (Scope; Design, "Virtual
repositories" and "The proxied path"; AC18, AC22).

The question: `hex.md` refused virtual repositories because its signed payload names the
repository and the client pins that name; a Debian virtual view must be signed by someone, and
the signer vouches for whatever the merge contains.

**Recommendation:** A. apt binds no repository identity in the signature (captured: a suite
mismatch is a warning, the keyring is the only trust input), so the merge is verifiable, and it
is the one-URL view that makes a policy refusal enforceable for clients who use nothing else.
Proxied content stays under the distribution's own key, which every client already holds.

| Option | You get | It costs |
|---|---|---|
| **A. Proxied unmodified; virtual signed by its own key after verified merge** | Stock keyrings work on the proxied path; a single signed source for mixed private and public packages | Clients of a virtual repository trust this registry for upstream content; `origin=Debian` pins stop matching; a deferred regeneration subsystem dependency |
| **B. Refuse virtual repositories, as Hex does** | This registry never signs what it did not publish | No aggregation on a Tier 1 format whose clients handle several sources anyway, and refusals stay unenforceable against the second source |
| **C. Re-sign proxied repositories too** | One key for everything | Every client reconfigured for Debian's own packages, and upstream key rotation invisible |

**Why this is yours:** it decides when this registry becomes a signing authority over content
it did not author, a trust-posture call.

Accepted cost: the trust statement and the pinning caveat in the operator documentation, and
Phase 5's dependency on the asynchronous subsystem, which is now concrete: the merge is the
`index.merge` job kind on `internal/async` (`signing-service.md`, "Virtual merges", AC19), and a
remote member's contribution is gated on its verdict read through `Deps`, never a verification
inside the merge.

### Resolved: dput as a binding onto publish (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: dput's HTTP `PUT`s are
served as single-request uploads into the repository, and the `.changes` `PUT` is the publish,
binding digests in flight in the repository (Design, "The dput binding"; AC4, AC16).

The question: Debian's own publishing path is an upload queue processed by the archive (dak,
reprepro); dput's HTTP method is the only ecosystem client that speaks HTTP, and the management
API alone would leave no client-driven trigger.

**Recommendation:** A. It makes the trigger oracle-testable for the one operation that has a
client, as the cross-format precedent (`pypi.md`'s resolved hosted-yank decision and its
successors) asks, and the in-flight digest rule means it needs no upload session the shared
model forbids.

| Option | You get | It costs |
|---|---|---|
| **A. dput binding, committed at the `.changes`** | `dput` works unmodified; one implementation behind two entry points | Staged blobs that never get a `.changes` wait out the grace period; dput 1.2.4 reaches only the default port |
| **B. Management API only** | One entry point | A format whose only publish path no ecosystem client can drive |

**Why this is yours:** it adds a client binding to the management surface.

Accepted cost: the grace-period residue and the documented port limitation. `management-api.md`
since carried the answer: its reconciliation table lists Debian's `publish` with "dput's HTTP
upload" as the binding and its binding rule names dput among the clients a binding may serve;
the one seam left, a multi-object publish under a binding whose `Scope(r)` reports one object,
is stated in Design ("The dput binding") and listed as a consequence for that spec.

### Resolved: policy refusals, other sources, and index elision (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: refused pool files answer
`403`, the index keeps listing them, and the documentation states that enforcement holds only
where this registry is the client's only source for the governed versions (Design, "Policy
refusals on the wire"; AC17).

The question: apt installs an identical version from any other configured source when this
registry refuses it (captured on four generations), and eliding refused versions from the index
would re-sign a hosted suite per advisory sync and is impossible for proxied content.

**Recommendation:** A, the `conda.md` and `julia.md` precedents applied: honest refusals, no
policy evaluation in the generator, and the limit stated and tested rather than hidden. Since
adopted, `supply-chain-policy.md` recorded this answer as Debian's `package-level` row of its
"When a refusal binds, per format" table, and its resolved refusal-status-line decision (was
Q10 there) made the refusal legible to apt: the status line's reason phrase, which apt prints,
now names the condition (Design, "Policy refusals on the wire"; AC17).

| Option | You get | It costs |
|---|---|---|
| **A. `403`, no elision, limit documented and asserted** | No generator coupling to policy; the proxied path untouched | A client with a second source installs the refused version silently |
| **B. Elide refused versions from hosted indices** | apt picks another version automatically on hosted suites | A re-sign per advisory sync, policy inside the generator, and still nothing possible on the proxied path |

**Why this is yours:** it prices an enforcement guarantee against coupling policy into signed
index generation.

Accepted cost: the documented limit.

### Resolved: how Debian coordinates meet OSV (was Q6)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the policy coordinate is
the source package and source version under a repository release qualifier, derived for remote
repositories from the upstream `Release` and absent on hosted ones unless set (Design, "Signing,
provenance and policy"; AC23).

The question: OSV keys Debian and Ubuntu advisories by source package within a release
(`Debian:12`), and a binary-name query matches nothing (sampled).

**Recommendation:** A. It is the only mapping under which the feed matches at all, and a hosted
repository's private package sharing a Debian source name must not inherit Debian's advisories
by accident.

| Option | You get | It costs |
|---|---|---|
| **A. Source coordinate, per-repository qualifier, none on hosted by default** | Real matches on proxied archives; no false matches on private packages | A qualifier to set when a hosted repository rebuilds Debian packages; a coordinate shape `supply-chain-policy.md` must accept |
| **B. Binary coordinate under the bare ecosystem** | No qualifier | Matches nothing, a policy that looks configured and never fires |
| **C. Source coordinate under the bare `Debian` ecosystem everywhere** | No configuration | Cross-release false positives, and private packages matched against Debian's |

**Why this is yours:** it sets what an advisory rule on this format can promise.

Accepted cost: the coordinate requirement recorded for `supply-chain-policy.md`.

Revision of the mechanism, not the answer (2026-09-28 reconciliation): the qualifier this record
had the registry derive at configuration from the upstream `Release` is now
`supply-chain-policy.md`'s `advisory_ecosystem`, which the operator declares and the core
validates against the advisory sources' ecosystem lists ("OS-package repositories declare their
ecosystem", its AC11), because that spec settled that the core cannot infer which release-keyed
set applies and `management-api.md` makes no upstream request at creation. Option A stands
unchanged in substance: source coordinate, per-repository qualifier, none on hosted by default.
The derivation survives as the operator documentation's mapping from `Origin` and `Version`
(Design, "Signing, provenance and policy"; AC23).

### Resolved: the hash set of a generated `Release` (was Q7)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: `SHA256` only (Design,
"The archive layout this registry generates"; AC3).

The question: apt requests `by-hash` under the strongest hash listed (captured: `SHA512` when
`apt-ftparchive`'s default four sections are present, `SHA256` when alone), and the CAS key is
SHA256.

**Recommendation:** A. It is what Debian security serves, it makes every `by-hash` path the CAS
key, and the format requires only SHA256.

| Option | You get | It costs |
|---|---|---|
| **A. SHA256 only** | `by-hash` path equals the CAS digest; no second index of digests | Tools that read `MD5Sum` from `Release` find none |
| **B. MD5Sum, SHA1, SHA256, SHA512** | `apt-ftparchive` parity | apt uses SHA512 for `by-hash`, which needs a second digest index per document |

**Why this is yours:** it is a compatibility floor against a storage simplification.

Accepted cost: the exception-list entry against the reference archive's four sections.

### Resolved: an upstream archive as a preconfigured upstream (was Q8)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: no Debian or Ubuntu
upstream is preconfigured in v1, consistent with `proxy-cache.md` AC19; the question is revisited
through that spec's extension mechanism (its resolved preconfigured-set extension, was Q14). Its
second extension (was Q17 there, adding api.nuget.org and repo.maven.apache.org) left Debian out
again, and `upstream-adapters.md`'s profile table carries no Debian or Ubuntu row, so this
answer stands.

**Recommendation:** B. A Debian upstream is distribution-specific, so one preconfigured archive
is wrong for three of the four distributions this format names, and each needs its keyring
chosen.

| Option | You get | It costs |
|---|---|---|
| **A. Preconfigure `deb.debian.org`** | Debian caching with no setup | Wrong for Ubuntu, Mint and Pop!_OS; a sibling decision reopened |
| **B. User-configured** | No sibling amendment; the keyring is chosen deliberately | A slower first run than npm's |

**Why this is yours:** it amends a set you priced.

Accepted cost: the proxied cases run against stand-ins; the live archives are exercised by the
recording session.

### Resolved: which action suite membership changes require (was Q9)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: copying into a suite
requires `push`; removing from a suite and deleting require `delete`; suite configuration and
key rotation are repository administration (Design, "The publish path"; AC13).

**Recommendation:** A. Copying adds content to resolution, removing takes it away, which is
`auth.md`'s metadata-versus-removal rule applied by effect as `hex.md` applied it to retirement.

| Option | You get | It costs |
|---|---|---|
| **A. Copy `push`; remove and delete `delete`; configuration administrative** | The vocabulary applied by effect | A CI key that publishes cannot withdraw a bad upload from a suite |
| **B. Every membership change under `push`** | One key promotes and demotes | A publish credential can remove packages from every suite |

**Why this is yours:** it places operations on a vocabulary you settled and feeds the
reconciliation `management-api.md` owes.

Accepted cost: one more row for that reconciliation. That reconciliation has been made and
matches this answer: copy is the `place` kind under `push`, removal from a suite `unplace` and
deletion `delete-version` under `delete`, suite configuration and key rotation `configure` under
the admin role (`management-api.md`'s kind table and its Debian rows).

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | e77404f | authoring pass: grounded first draft, not a review | Grounded the archive contract three ways: captured traffic from apt 2.6.1 (bookworm), 3.0.3 (trixie, sqv), 2.8.3 (Ubuntu 24.04 and Mint 22) and 2.4.14 (Ubuntu 22.04), pinned by digest, against a logging stub serving archives built and signed with the bookworm image's own dpkg-deb, dpkg-source, dpkg-genchanges, apt-ftparchive and gpg (cold and warm updates as shipped and host-like, the gz and xz preference, by-hash under SHA512 and SHA256 with path fallback, foreign architectures, `apt-get source`, `apt-file`, InRelease and detached forms, wrong-key, tampered, SHA1, RSA 1024, Ed25519, dual-signed and unsigned envelopes with each generation's text, expired, future, older, equal and absent `Date`, the `If-Modified-Since`-only revalidation that masks a repoint, a changed `Codename`, a suite mismatch, the publish race with and without by-hash, the two-source fallback on a `403`, Basic from `auth.conf.d` with and without the scheme and from userinfo, `Range` resume, `NotAutomatic`, a path-prefixed base URL), dput 1.1.3 and 1.2.4 uploads, and a pass-through to the live deb.debian.org verified with the stock keyring; the Debian repository format and the apt 2.6.1 and 3.0.3 sources (the older-`Date` discard, `Max-FutureTime`, the alternative-URI fallback); the live Debian, Debian security, Ubuntu and Pop!_OS archives; and OSV's Debian and Ubuntu ecosystems. Design: what this spec takes from the prototype (its findings 1 to 3; three new captured facts fed back); the generated layout; the shared-model mapping with a `src:` namespace and a retirement set; by-hash as the CAS key and the race cure; index documents as snapshot content and the envelope as pointer-scoped; a seven-item signing-service requirement list; the publish path, dput binding and write-boundary declaration; OSV by source package and release; Basic auth; the addressed-object table; the `403` rendering and its fallback limit; the chain-verified proxied path with Debian's removal rows; signed virtual merges. Nine questions written in decision shape and adopted under the standing delegation: pointer-scoped envelope (AC9, AC10, AC14), `Valid-Until` off by default (AC10), virtual signed and proxied unmodified (AC18, AC22), dput binding (AC4, AC16), no index elision (AC17), OSV coordinate (AC23), SHA256-only `Release` (AC3), no preconfigured upstream, membership actions (AC13). Twenty-seven criteria, each with a Test Plan row. Stays draft; awaits an independent review. |
| 2026-09-28 | 15ced69 | cross-spec reconciliation of the Wave 1 folds on Opus. Not a review | Not a review, and this spec's first reconciliation: every item in `agents/spec-loop/consequences.md` naming it verified against the current text of its source spec (signing-service 10, 11 and the verification routing; upstream-adapters 8 and 12; charter reconciliation 5; conformance-harness reconciliation 4 and 5; management-api 11 and 12; Open item 20's data-model, storage, signing, management, async, upstream and harness halves) and every requirement this spec placed on the ten foundation specs checked against what they say. Applied: every "to be authored" citation replaced by the real spec and criterion; the prototype's questions 1 to 3 answered by `signing-service.md` (optional `Indexer`, write-path trigger through `data-model.md` AC37's pre-commit hook) and the three captured facts marked met by the prototype's AC13 and `conformance/debian/repoint_test.go`; the pointer-scoped envelope as a `PointerDocument` dated from the pointer freshness record (`data-model.md` AC36, AC37; AC22 qualified there), `Last-Modified` through `ServeDocument`, the seven-item service list rewritten as citations (Debian key profile, generator package, `signing.resign` cadence at `signing.resign_at_fraction`, `dual-signature` rotation on the signing-key routes, public forms, the verification entry routed to `artifact-verification.md`'s `openpgp` scheme, `Merge` on `index.merge`); the management table gains the kinds (`publish` with the dput binding, `place`, `unplace`, `delete-version`, `configure`), the endpoint, `405` `repository-type` and per-kind cases; retirement moved to core-held `Retirement` (`retired` 409, AC5 across a backwards repoint); the envelope and `signing-key.asc` declared descriptors under `auth.md` was-Q23 with the sentinel check (AC16: apt now fails at the first index, not at `InRelease`); `WriteRefusal` and the `Refused by policy` reason phrase apt prints (AC17), the `package-level` binding row recorded; the proxied keyring moved to the remote's trust set, the `https` adapter with `allow_http`, the integrity-failure class, cache-scoped `Last-Modified` and a regression row with a proxied rollback case (AC19, `proxy-cache.md` AC22); the removal table named by event class; virtual merges on `index.merge` with a forward-moving virtual envelope `Date` (AC22); the seed path through the write-path hook, the `signing` sub-entry, `trust`, `holds` and the confined second source in the harness paragraph; a new Capabilities, lifecycle and settings section with AC28 (rename, deletion retiring keys, the declared `settings` document). Mismatches found, not queued: AC20 fetched the upstream at configuration, which `management-api.md` no longer does and whose keyring now lives in the trust set, so Q10 was raised in decision shape and adopted (first-fetch checks, A); Q6's derived qualifier contradicts `supply-chain-policy.md`'s operator-declared `advisory_ecosystem`, folded as a revision note under Q6 (the answer unchanged). Records Q1, Q3, Q4, Q5, Q8 and Q9 note what landed. `fable_recheck` extended, not removed. Stays draft. |
