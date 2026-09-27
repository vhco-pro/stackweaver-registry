---
status: draft
status_description: "Authored 2026-09-26 as a grounded first draft: the apt archive contract captured from apt 2.6.1 (Debian bookworm), 3.0.3 (Debian trixie, verifying with sqv), 2.8.3 (Ubuntu 24.04 and Linux Mint 22) and 2.4.14 (Ubuntu 22.04), all pinned by image digest, run against a logging stub serving archives built and signed with the bookworm image's own dpkg-deb, dpkg-source, apt-ftparchive and gpg, plus dput 1.1.3 and 1.2.4 uploads, apt-file, and a pass-through to the live deb.debian.org; checked against the Debian repository format, the apt 2.6.1 and 3.0.3 sources, the live Debian, Debian security and Ubuntu archives, and OSV. Nine questions written in decision shape and adopted under the owner's standing delegation; none open. Awaits a /spec review pass."
description: "Spec for the Debian apt archive format: the dists and pool layout with InRelease, Release and Release.gpg, the Packages, Sources, Contents indices and their by-hash forms, hosted through the shared signing and index service with the signed envelope scoped to the serving pointer, proxied as a byte-for-byte, chain-verified cache of an upstream archive, and merged into signed virtual views, with apt on four generations as the oracle."
author: michielvha
goal: "Serve Debian and Ubuntu fleets a private apt archive whose indices are generated and signed by a key the handler never holds and whose rollbacks apt actually sees, and a Debian or Ubuntu mirror cache whose every index and package is verified along the upstream's own signature chain, with apt on Debian bookworm and trixie and Ubuntu 22.04 and 24.04 as the oracle on both paths."
priority: "medium"
issue: 31
created: 2026-09-26
covers:
  - "internal/format/debian/**"
  - "conformance/debian/**"
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
and every signed envelope is produced by `docs/internal/plans/foundation/signing-service.md`
(to be authored in the spec loop), built at charter step 7 as the production form of what the
step 4a prototype learned. What this format requires of it is stated in Design ("What the
signing and index service must provide"), never designed here.

**The management API must be `planned` before Phase 2.** Publishing, the dput binding, suite
membership changes, deletion, suite configuration and key rotation are operations of
`docs/internal/plans/foundation/management-api.md` (to be authored in the spec loop), whose core
the charter builds at step 2 and completes at step 9. Nothing on apt's own wire writes.

**The data model must carry the pointer-scoped envelope before Phase 3.** The resolved envelope
decision below is a change to `data-model.md` raised by this spec, not a table this handler
owns; Phase 3 waits on that spec's revision.

**Asynchronous operations must be `planned` before Phase 5.** A virtual repository's merged
view is regenerated as deferred work on the step 6a subsystem,
`docs/internal/plans/foundation/async-operations.md` (to be authored in the spec loop).

**Upstream trust anchors.** The proxied path verifies every upstream `InRelease` against a
per-upstream OpenPGP keyring, which is requested of
`docs/internal/plans/foundation/upstream-adapters.md` (to be authored in the spec loop; the
charter's step 4) as configuration and of the signing service's verification entry as
mechanism. Nothing is required of `docs/internal/plans/foundation/artifact-verification.md` (to
be authored in the spec loop): apt verifies no per-package signature (Design, "Signing,
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
  into a suite, remove from a suite), version deletion with retirement, suite configuration
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
  release.
- apt 2.4, 2.6, 2.8 and 3.0 as the oracle on both paths, and the four named distributions.

**Out of scope for v1**, each with its reason, recorded because the interface spec's definition
of done requires the deliberately unimplemented surface to be named:

- **Flat repositories** (`deb http://host/path ./`). The format defines no `Contents` or
  `Translation` for them and no `by-hash`, so a flat hosted repository would reintroduce the
  publish race `by-hash` cures (captured, Design, "By-hash"); apt reads the `dists` layout on
  every version captured, so nothing is unreachable without it. A proxied flat upstream is
  refused at configuration with that reason.
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
spec **depends on three of its findings** and repeats none of its criteria:

- **Its question 1** (can a write-triggered service be expressed through the pinned five methods
  plus `Deps`) decides how this handler invokes the signing and index service. This spec is
  written for the answer the prototype is designed to test first, the handler calling the
  shared service through `Deps`; if the re-open instead adds a method, the Design sections that
  say "the handler submits" change their verb and nothing else.
- **Its question 2** (who owns the trigger) decides whether a publish's regeneration is
  requested by this handler or dispatched by the shared write path. Every trigger in the
  write-boundary declaration below is stated as an event, so either answer applies.
- **Its question 3** (one snapshot per publish under concurrency) is the property this spec's
  concurrency criterion extends from one suite to every (suite, component, architecture) cell
  a publish touches (AC11).

It depends on questions 4 to 6 only through the step 6a subsystem that runs a virtual
repository's regeneration (Design, "Virtual repositories").

What the prototype proves, this spec does not re-prove: its AC1 (both signature forms through
real apt, tamper refused), AC5 (no key in the handler) and AC6 (a CAS-backed `Release` across a
sweep) are the mechanism; the criteria here extend them to four apt generations, to the full
index matrix and to paths the prototype never exercises. **Three captured facts are new to it**
and are recorded as sibling consequences: apt discards a signed document dated older than the
one it holds, so a repoint is invisible unless the served envelope is re-dated (the resolved
envelope decision below); apt revalidates `InRelease` with `If-Modified-Since` alone, so a
`Last-Modified` that moves backwards on a repoint is answered `304` and masks it; and apt
requests `by-hash` under the strongest hash `Release` lists, so the hash set decides whether a
`by-hash` path is a CAS key (the resolved hash-set decision below). The prototype's Phase 3 is
the cheapest place to confirm the first two, and this spec asks for a repoint case there.

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
- The package-level document holds the **retirement set**: every deleted
  `{package}/{version}/{architecture}` coordinate, never republishable.
- The repository-level document holds the suite configurations, each suite's unsigned
  `Release` body (the template the envelope is signed from, all fields but `Date` and
  `Valid-Until`), the generated index documents, and each suite's **by-hash map** (below). The
  signed envelope is not repository content (the resolved envelope decision).

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
envelope decision, the split is:

- **Index documents are snapshot content.** A publish regenerates, through the signing and index
  service and inside the write, exactly the documents of the (suite, component, architecture)
  cells it changes, their compressed forms, the affected `Contents-{arch}`, `Sources` if it
  carries a source version, the suite's `Release` body and its by-hash map; every untouched cell
  keeps its bytes and its hashes (AC3). They land in the same completed logical write and the
  same snapshot as the change that triggered them, so no snapshot holds a `Release` body that
  disagrees with an index beside it, and a repoint restores them, as `data-model.md` AC13
  requires of all three levels.
- **The signed envelope belongs to the pointer.** `InRelease`, `Release` and `Release.gpg` for a
  suite are produced by the signing service from the `Release` body of the snapshot a pointer
  targets, stamped `Date` = the later of the signing time and the last `Date` served on that
  pointer, optionally `Valid-Until`, and stored beside the pointer rather than in the snapshot.
  It is produced when the default pointer advances (inside the write, so the client that
  published sees its package after its next update), when a promotion or rollback moves any
  pointer, on the `Valid-Until` cadence, and on a key rotation. Its `Last-Modified` is its
  signing time, so it only moves forward per pointer, and its `ETag` derives from its bytes.

That is what makes a rollback real on this format: the client that updated at snapshot N and is
then served snapshot N-1 through a moved pointer receives an envelope dated after its last one,
takes it, and fetches the older indices by hash (AC9). The accepted cost is that the envelope a
promoted environment serves is not byte-identical to the one the source environment served:
the indices and packages are, the `Date` and the signature are not, which is a qualification of
`data-model.md` AC22 this spec raises as a sibling consequence rather than quietly assumes.

### What the signing and index service must provide

Stated so the dependency on `docs/internal/plans/foundation/signing-service.md` (to be authored
in the spec loop) cannot be lost, and precisely enough that the service can be specced against
it:

1. **An OpenPGP signing key per hosted or virtual repository**, RSA 4096 by default or Ed25519,
   never below the `>=rsa3072,ed25519,ed448` horizon apt 2.8.3 names as its future policy, and a
   SHA-256 or stronger digest, never SHA-1 (captured refusals above). The handler never sees
   the private key; an architecture test asserts it as the prototype's AC5 does (AC24).
2. **Generation of every index representation** from the stored per-version stanzas, in
   `apt-ftparchive`'s field order and wrapping: `Packages`, `Sources` and `Contents-{arch}` with
   their `.gz` and `.xz` forms, the SHA256-only `Release` body with the fields above, and the
   by-hash map carrying the current and two previous generations, **incrementally**, so a
   publish touches only the cells it changes (AC3, AC12).
3. **The pointer-scoped envelope**: a clearsigned `InRelease` and a `Release` with its detached
   `Release.gpg`, signed together from one body, with the monotonic `Date` rule above, produced
   at every pointer transition, on the `Valid-Until` cadence (re-signing at half the configured
   window, which is not a write and creates no snapshot), and stored inline or CAS-backed under
   the fourth mark root's current-document half.
4. **Rotation with overlap**, exposed through the management API: a window during which every
   envelope carries two signatures, the old key's and the new, which clients holding either key
   accept (captured), then a re-sign under the new key alone. No content changes and no
   snapshot is created.
5. **The public key** as an ASCII-armoured block, served at `signing-key.asc` and shown in the
   management surface with its fingerprint, in the form `Signed-By` accepts both as a file and
   inline in a deb822 `.sources` file (captured on all four generations).
6. **A verification entry** that checks an upstream `InRelease`, or `Release` with
   `Release.gpg`, against a supplied keyring and reports which key verified, used by the proxied
   path and by the virtual merge before any upstream index is trusted.
7. **The virtual merge** (Design, "Virtual repositories"), run as deferred work, never on a
   request's path.

### The publish path and what counts as a write

Nothing on apt's wire writes. Hosted content arrives through the registry-owned management API,
`docs/internal/plans/foundation/management-api.md` (to be authored in the spec loop), and through
the dput HTTP upload served as a binding onto its publish operation (the resolved dput decision
below). What this format requires of that API, stated rather than designed:

| Operation | What it carries | Effect a client sees | Action |
|---|---|---|---|
| Publish a binary package | A `.deb`, a target suite and component | The version's stanza appears in every affected `binary-{arch}/Packages` and in `Contents`, and `apt-get install` of it succeeds after `apt-get update` | `push` |
| Publish a source package | A `.dsc`, every file its `Checksums-Sha256` names, a target suite and component | The stanza appears in `Sources` and `apt-get source` retrieves every file | `push` |
| Copy a version into a suite | Coordinate, target suite and component | The same pool file appears in the target suite's indices; the pool path is unchanged | `push` |
| Remove a version from a suite | Coordinate, suite | It leaves that suite's indices; the pool file keeps serving while any placement remains | `delete` |
| Delete a version | Coordinate | It leaves every suite, its pool files answer `404`, and its coordinates join the retirement set | `delete` |
| Configure a suite | Suite settings above | `Release` fields change after the next update; a changed `Codename` produces apt's captured error until the client passes `--allow-releaseinfo-change` | repository administration (`auth.md` AC28) |
| Rotate the signing key | Overlap window | Envelopes carry both signatures, then the new one alone | repository administration |

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
  coordinate is refused the same way**, the cross-format rule `npm.md`, `pypi.md`, `hex.md` and
  `maven.md` adopted. **A pool filename collision is refused**: pool filenames omit the epoch
  (`dpkg-deb` names `swhello_1.0-1_amd64.deb` for `1:1.0-1` and `1.0-1` alike), so two
  coordinates differing only in epoch, or a source tarball of the same name with different
  bytes, cannot share a pool path and the second is refused; a shared tarball with identical
  bytes is accepted.
- A publish to a proxied or virtual repository answers `405`.

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

### Signing, provenance and policy

apt trusts one thing, the repository signature over `Release`, and derives trust in every index
and pool file from the SHA256 chain below it; no captured apt checks a per-package signature. So
this format requires of `docs/internal/plans/foundation/artifact-verification.md` (to be
authored in the spec loop) nothing, and of the signing service everything listed above.

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
`Source`, or the package's own) under a **release qualifier the repository carries**: a remote
repository derives it at configuration from the upstream's `Origin` and `Version` (`Debian` and
`13.7` give `Debian:13`; `Ubuntu` and `24.04` give `Ubuntu:24.04:LTS` for an LTS release), and a
hosted repository has none unless the operator sets one, because its packages are not Debian's
and a name shared with a Debian source package is a coincidence, not an advisory. An
advisory-dependent rule on a repository with no qualifier is refused at configuration, which is
`supply-chain-policy.md` AC11's rule for an uncovered ecosystem.

### Authentication: Basic, preemptive, as apt sends it

apt presents HTTP Basic from `/etc/apt/auth.conf.d/*.conf` (netrc format) or from userinfo in
the `URIs:` value, **preemptively** on every request once an entry matches, with no challenge
round (captured on all four: the first request of the update already carried it). An entry
without a scheme is **refused by apt itself on plain HTTP**: `W: ... Credentials for
127.0.0.1:19401 match, but the protocol is not encrypted. Annotate with http:// to use.`, then
the `401` (captured on all four). That is the Basic presentation `auth.md` already verifies (its
AC31), so no new form is needed; the client table needs an `apt` and a `dput` row, listed in the
sibling consequences. How this meets `auth.md`, whose rules this spec does not bend:

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
| `dists/{suite}/InRelease`, `Release`, `Release.gpg` | none | - (the envelope enumerates the suite) |
| Every index file and every `by-hash` path | none | - (each enumerates names; a digest-addressed index is still a listing) |
| `pool/.../{package}_{version}_{arch}.deb` | named | `{package}/{version}/{architecture}` |
| `pool/.../` `.dsc` and source tarballs | named | `src:{source}/{version}/source` |
| `signing-key.asc` | none | - |
| dput `PUT` of a `.deb` | named | `{package}/{version}/{architecture}` from the filename, confirmed against `control` at commit, a disagreement refused |
| dput `PUT` of a `.dsc` or tarball | named | `src:{source}/{version}/source` from the filename |
| dput `PUT` of the `.changes` | named | `src:{source}/{version}/changes` from the filename, every file it binds having been authorized under its own object at its own `PUT` |
| Publish a `.deb` (management API) | named | `{package}/{version}/{architecture}` from `control`, read in a bounded peek at the `ar` archive's leading members, which is where `control.tar` sits |
| Copy, remove, delete (management API) | named | the coordinate |

What that gives and costs, applying `auth.md`'s rules rather than re-deciding them. **A
patterned `pull` cannot resolve through apt on this format**: every update starts with
`InRelease`, which reports none, so `apt-get update` under a token patterned `acme-*/**` fails at
the first request, while `curl` of an in-pattern pool file under the same token succeeds and an
out-of-pattern one is refused; the consequence `julia.md`, `cran.md` and `conda.md` record for
their listings. **A patterned `push` publishes**, through the management API and through dput,
because every upload names its object before its bytes are committed.

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines, on a
pool route of either path, the handler answers `403` with a `text/plain` body naming the policy
and rule. apt prints `403  Forbidden` and exits non-zero (captured), never the body, which is the
reason-phrase limit `pypi.md` named and `maven.md` and `hex.md` confirmed, confirmed here for a
fourth ecosystem. The index keeps listing the refused version (the resolved refusal decision
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
`deb.debian.org/debian-security`, `archive.ubuntu.com/ubuntu`, a derivative's archive) together
with an OpenPGP keyring, validated at configuration by fetching one configured suite's
`InRelease` and verifying it against the keyring (AC20). The chain this registry walks is apt's
own, done once for every client:

- **The envelope is mutable metadata with a TTL** and is served byte for byte. It is fetched with
  `If-Modified-Since`, and `If-None-Match` where the upstream serves an `ETag` (the live archive
  serves one, answers `304` to `If-Modified-Since` and sends `Cache-Control: public,
  max-age=120`, sampled), and before a fetched envelope is committed its
  signature is verified against the upstream's keyring through the signing service's
  verification entry. A failure is never committed; `proxy-cache.md`'s serve-stale rules apply
  and the operator is alerted, because on this format that is what an upstream key rotation
  looks like. The envelope is ~140 to 255 KB (trixie 140,421 bytes, bookworm 151,075, noble
  255,850), which crosses a small inline threshold, so it is a CAS-backed current document under
  the fourth mark root, the case that root was created for.
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
- Publish and every management operation against a proxied repository answer `405`.

Upstream removal maps onto the settled purge-or-flag table as Debian's side of that contract:

| Upstream event, as observed at revalidation | Classification |
|---|---|
| A version replaced by a newer version of the same package in the same index generation (a point release, a security update) | An **ordinary metadata change**: the new stanza is served, the old pool file keeps serving through the cumulative digest index, no divergence is recorded, because supersession is how this ecosystem ships every update |
| A package vanishing from a suite with no successor | Keep serving, record an operator-visible divergence; the wire carries no reason (a removal for release-critical bugs and a security removal look the same) |
| A pool file whose bytes change for an unchanged `Filename` | An **immutability violation** treated as the explicit signal: purge the cached file, alert, and re-fetch and verify against the new digest on demand, since every client that cached the old bytes now disagrees with the index |
| The envelope no longer verifies against the configured keyring | An integrity failure: not committed, serve stale within the limit, alert |
| `Suite` or `Codename` changes (a release transition moving `stable` from bookworm to trixie) | Served verbatim; the client's own captured `Codename` error is the upstream's behaviour and passes through |

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
  verified against the member's keyring and each index against the envelope's SHA256, so the
  virtual signature never covers an unverified stanza.
- **Regeneration is deferred.** A hosted member's write, or a remote member's envelope changing
  at revalidation, enqueues a regeneration on the step 6a asynchronous-operations subsystem; the
  virtual repository serves its last merged, signed state until the regeneration commits, so no
  signing ever runs on a client's request. A virtual repository creates no snapshots: its merged
  documents are derived state.
- **What it costs clients.** A client of a virtual repository trusts this registry's key for
  upstream packages too, and pinning or `unattended-upgrades` rules written against
  `origin=Debian` no longer match, since `Origin` is the virtual repository's. Both are stated in
  the operator documentation beside the recipe for listing a hosted and a proxied repository as
  two sources instead.

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
      different bytes, and so is a publish of a deleted coordinate, including after the delete's
      snapshot was pruned out of retention; a version differing from an existing one only in
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
      left idle for three windows under an injected clock is re-signed before each expiry, so
      `apt-get update` succeeds at every step, with no snapshot created by any re-sign.
- [ ] AC11: Two concurrent publishes into one suite, into the same and into different components
      and architectures, both land, each in exactly one snapshot, and the envelope served
      afterwards enumerates both with every `Release` checksum agreeing with the document it
      names, proven under property-test interleavings and then by a real `apt-get install` of
      both packages.
- [ ] AC12: The latency of a publish into a suite holding 10,000 versions is benchmarked against
      the same publish into an empty suite, and CI fails on a regression beyond a threshold
      recorded in the CI config and referenced from this spec, as `storage-and-gc.md` AC7 does for
      throughput.
- [ ] AC13: Copy, removal from a suite, deletion and a suite configuration change, driven through
      the management endpoint, each create exactly one snapshot with the effect Design names seen
      by a real client: a copied version installs from the target suite with its pool path
      unchanged, a removed version leaves only that suite, a deleted version answers `404` and is
      retired, and a changed `Codename` produces the captured error until
      `--allow-releaseinfo-change`; a principal holding `push` alone is refused removal and
      deletion, a non-administrator is refused suite configuration, and every one of them against
      a proxied or virtual repository answers `405`.
- [ ] AC14: A key rotation through the management API serves envelopes carrying both
      signatures during the overlap, accepted by clients holding the old key alone and the new key
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
- [ ] AC16: A token holding `pull` under the pattern `acme-*/**` fails `apt-get update` at
      `InRelease`, retrieves an in-pattern pool file with `curl` and is refused an out-of-pattern
      one and every `by-hash` path; a token holding `push` under the same pattern publishes
      `acme-tool` through the management API and through dput and is refused `other-tool`, with
      no snapshot created by a refusal; a `.deb` whose `control.tar` lies beyond the bounded peek
      is refused before any byte reaches the CAS; and in proxied mode the patterned `pull` token
      fetches an in-pattern pool file and is refused another.
- [ ] AC17: A pool file the shared policy layer refuses answers `403` with a `text/plain` body
      naming the policy, on the hosted and the proxied path, the index still listing the version;
      a real `apt-get install` of it with this registry as the only source exits non-zero
      printing `403  Forbidden`, with the body in the transcript; and with a second source
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
      the TTL and, absent an explicit refresh, not before; and neither a `by-hash` index nor a pool
      file is ever revalidated.
- [ ] AC20: Configuring a remote repository whose upstream envelope does not verify against the
      supplied keyring, or whose upstream is a flat repository, is refused at configuration with a
      message naming the reason; a stand-in envelope with a bad signature, an index disagreeing
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
      serving its previous signed state until the deferred regeneration commits and then serves
      the new version, with no signing operation on any client request path; and a remote
      member whose envelope fails verification contributes nothing to the merge.
- [ ] AC23: With a remote repository qualified `Debian:12` and an advisory rule attached, a binary
      whose stanza names an affected source package and source version is refused at resolution
      through the case-controlled advisory source, while the same binary name under an unaffected
      source is served, a `libssl3` stanza whose `Source` is `openssl` being matched as `openssl`;
      the qualifier is derived at configuration from the upstream's `Origin` and `Version`
      (`Debian` and `12.15` give `Debian:12`, `Ubuntu` and `24.04` give `Ubuntu:24.04:LTS`); and
      an advisory-dependent rule on a hosted repository with no qualifier is
      refused at configuration naming the missing qualifier.
- [ ] AC24: Every hosted and virtual index document and envelope is produced by the shared signing
      and index service, never by the handler, proven by an architecture test that the handler
      package imports neither key material nor a signing primitive; and a proxied envelope above
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

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/debian/hosted_test.go` (four generations, each as shipped and host-like; `Signed-By` as file and inline; `by-hash` and `304` asserted from the transcript; foreign architecture; no `Translation` request) |
| AC2 | conformance + integration | `conformance/debian/signing_test.go` (both envelope forms on four generations with no warning line; wrong-key and altered envelopes with each captured text asserted); `internal/format/debian/envelope_test.go` (the served envelope verified with a Go OpenPGP verifier; key algorithm and digest against the sqv horizon) |
| AC3 | conformance + integration | `conformance/debian/publish_test.go` (management-API publish, update, install); `internal/format/debian/publish_test.go` (snapshot count, untouched cells byte-compared, SHA256-only `Release`, envelope re-signed before the response) |
| AC4 | conformance + integration | `conformance/debian/dput_test.go` (dput 1.1.3 and 1.2.4, binary and source `.changes`, challenge and preemptive retry from the transcript, install of the uploaded bytes); `internal/format/debian/dput_commit_test.go` (no snapshot before the `.changes`, missing digest and control mismatch refused) |
| AC5 | conformance + integration | `conformance/debian/publish_test.go` (republish refusals through the endpoint); `internal/format/debian/immutability_test.go` (retirement after pruning under an injected clock; epoch and tarball collisions; shared identical tarball; grammar and architecture refusals) |
| AC6 | conformance | `conformance/debian/source_test.go` (three generations, byte comparison) |
| AC7 | conformance | `conformance/debian/contents_test.go` (`apt-file` on apt 2.6.1 and 2.8.3, `by-hash` fetch asserted) |
| AC8 | conformance + integration | `conformance/debian/race_test.go` (envelope served before a publish, indices after, via the harness's hold on the client between requests); `internal/format/debian/byhash_test.go` (map trimming, foreign-repository digest refused) |
| AC9 | conformance + integration | `conformance/debian/rollback_test.go` (four generations: update at N, repoint, update, install from N-1; promotion byte comparison); `internal/format/debian/envelope_date_test.go` (monotonic `Date` and `Last-Modified` with a clock stepped backwards) |
| AC10 | integration + conformance | `internal/format/debian/valid_until_test.go` (injected clock over three windows, snapshot count); `conformance/debian/valid_until_test.go` (a real update after each re-sign, and the captured expiry text when re-signing is disabled in a fault-injection build) |
| AC11 | integration + property | `internal/format/debian/concurrent_publish_test.go` (interleavings over cells, checksum agreement); `conformance/debian/concurrent_publish_test.go` (real install of both) |
| AC12 | benchmark | `internal/format/debian/publish_bench_test.go`, with the threshold in `.github/workflows/ci.yml` |
| AC13 | conformance + integration | `conformance/debian/manage_test.go` (copy, remove, delete, `Codename` change with the captured error); `internal/format/debian/manage_test.go` (snapshot per operation, `push`-only and non-administrator refusals, `405` on remote and virtual) |
| AC14 | conformance + integration | `conformance/debian/rotation_test.go` (old-key and new-key clients across the overlap and after it, four generations); `internal/format/debian/rotation_test.go` (no snapshot, indices unchanged) |
| AC15 | conformance + integration | `conformance/debian/auth_test.go` (challenge equality across existing and missing repositories; `auth.conf.d` and userinfo; wrong and `pull`-less tokens); `internal/format/debian/auth_test.go` (plaintext refusal under `auth.md` AC27) |
| AC16 | conformance + unit | `conformance/debian/auth_test.go` (the pattern-refusal case `format-handler-interface.md` AC7 and `auth.md` AC8 require, in both modes; pattern-scoped tokens through the `credentials` key; deep-`control.tar` fixture through `curl`); `internal/format/debian/scope_object_test.go` (the object table, per route, `format-handler-interface.md` AC12) |
| AC17 | conformance | `conformance/debian/policy_test.go` (hosted and proxied modes; rules through the `policies` key, a controlled advisory through `advisories`; sole-source failure and two-source fallback both asserted from the transcript) |
| AC18 | conformance + integration | `conformance/debian/proxied_test.go` (Debian and Ubuntu stand-ins serving recorded archives; stock keyrings; network-level assertion from fresh lists); `internal/format/debian/proxied_verify_test.go` (path-to-hash resolution, pool verification before commit) |
| AC19 | conformance | `conformance/debian/proxied_ttl_test.go` (mutating stand-in; `304` upstream at the network layer; no revalidation of `by-hash` or pool) |
| AC20 | integration | `internal/format/debian/upstream_config_test.go` (unverifiable envelope, flat upstream); `internal/format/debian/proxied_integrity_test.go` (bad signature, index mismatch, pool mismatch, unknown pool path, operator record) |
| AC21 | integration | `internal/format/debian/removal_test.go` (stand-in presenting each event class; the shared-layer half is `proxy-cache.md` AC13's; slash component; negative caching and throttling responses) |
| AC22 | conformance + integration | `conformance/debian/virtual_test.go` (four generations installing from both members; first-member-wins); `internal/format/debian/virtual_regen_test.go` (deferred regeneration held and released, no signing call on the request path, failed member excluded) |
| AC23 | integration | `internal/format/debian/advisory_coordinate_test.go` (source-package mapping, qualifier derivation, hosted refusal at configuration; the `advisories` fixture carrying a `Debian:12` record) |
| AC24 | architecture test + integration | `internal/format/debian/arch_test.go` (no key material or signing primitive in the handler); `internal/storage/metadata_root_test.go` (threshold crossing, sweep, serve through a real client in the conformance half) |
| AC25 | conformance | `conformance/debian/clients_test.go` (six distribution images pinned by digest; the Pop!_OS build recipe in `conformance/debian/images/`) |
| AC26 | conformance | `conformance/debian/replay_test.go` |
| AC27 | conformance | `conformance/debian/suite_config_test.go` (`apt-cache policy` priority on apt 2.6.1 and 3.0.3; codename alias; missing suite) |

The case set needs only keys already in the harness's closed `setup` vocabulary (its resolved
closed-vocabulary decision, was Q4): `repositories` with type and virtual member order and the
suite configuration in the repository metadata document, `credentials`, `upstreams` (fixture
servers serving recorded Debian and Ubuntu archives, a mutating variant and a flat variant),
`state` for pre-published, pre-copied and pre-deleted versions, and `policies` with
`advisories`. Two obligations on the harness are recorded rather than assumed and listed in the
sibling consequences: a hosted `state` entry is servable only once signed, so the seed path
invokes the same signing service the write path does; and the two-source fallback case and the
race case need the harness to place a second source in the client and to hold the client between
two requests.

## Implementation Phases

### Phase 1: Hosted reads and generated documents
- Waits on `docs/internal/plans/foundation/signing-service.md` reaching `planned` (Blocking
  preconditions)
- The format-first mount, suite configuration with codename aliases, the generated `Release`
  body and indices in three compressions with `Contents`, `by-hash` with its map, pool serving
  with `Range`, the default pointer's envelope, `signing-key.asc`, the challenge and scope
  mapping, the per-route addressed objects and the `403` rendering

### Phase 2: Publish and management
- Waits on `docs/internal/plans/foundation/management-api.md` reaching `planned`
- `.deb` and source publish with the bounded peek, immutability, epoch collisions and the
  retirement set; the dput binding over in-flight digests; copy, removal, deletion, suite
  configuration; the write-boundary declaration under concurrency; the publish benchmark

### Phase 3: Pointer envelopes
- Waits on the `data-model.md` revision for pointer-scoped envelopes (Blocking preconditions)
- Envelopes re-signed at every pointer transition with the monotonic `Date` and `Last-Modified`,
  the `Valid-Until` cadence, key rotation with overlap

### Phase 4: Proxied path
- Upstream keyring validation, envelope verification before commit, index-by-hash and
  path-to-hash serving, the cumulative digest index, pool stream-and-verify, negative caching,
  the removal table, the advisory qualifier, `405` on remote writes

### Phase 5: Virtual repositories
- Waits on `docs/internal/plans/foundation/async-operations.md` reaching `planned`
- The merge rules, verification before merge, deferred regeneration, the virtual envelope

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
the owner at any time. `grep -rn "standing delegation"` is the owner's review queue.

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

Accepted cost: the `data-model.md` revision and AC22's qualification, both listed as sibling
consequences. B lost on the warning; C lost because it makes the product's rollback feature a
lie on this format.

### Resolved: `Valid-Until` on hosted suites (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: no `Valid-Until` unless a
suite configures a window, and a configured window is kept alive by re-signing every pointer's
envelope at half the window (Design, "What the signing and index service must provide", item 3;
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
Phase 5's dependency on the asynchronous subsystem.

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

Accepted cost: the grace-period residue and the documented port limitation.

### Resolved: policy refusals, other sources, and index elision (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: refused pool files answer
`403`, the index keeps listing them, and the documentation states that enforcement holds only
where this registry is the client's only source for the governed versions (Design, "Policy
refusals on the wire"; AC17).

The question: apt installs an identical version from any other configured source when this
registry refuses it (captured on four generations), and eliding refused versions from the index
would re-sign a hosted suite per advisory sync and is impossible for proxied content.

**Recommendation:** A, the `conda.md` and `julia.md` precedents applied: honest refusals, no
policy evaluation in the generator, and the limit stated and tested rather than hidden.

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
through that spec's extension mechanism (its resolved preconfigured-set extension, was Q14).

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

Accepted cost: one more row for that reconciliation.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | e77404f | authoring pass: grounded first draft, not a review | Grounded the archive contract three ways: captured traffic from apt 2.6.1 (bookworm), 3.0.3 (trixie, sqv), 2.8.3 (Ubuntu 24.04 and Mint 22) and 2.4.14 (Ubuntu 22.04), pinned by digest, against a logging stub serving archives built and signed with the bookworm image's own dpkg-deb, dpkg-source, dpkg-genchanges, apt-ftparchive and gpg (cold and warm updates as shipped and host-like, the gz and xz preference, by-hash under SHA512 and SHA256 with path fallback, foreign architectures, `apt-get source`, `apt-file`, InRelease and detached forms, wrong-key, tampered, SHA1, RSA 1024, Ed25519, dual-signed and unsigned envelopes with each generation's text, expired, future, older, equal and absent `Date`, the `If-Modified-Since`-only revalidation that masks a repoint, a changed `Codename`, a suite mismatch, the publish race with and without by-hash, the two-source fallback on a `403`, Basic from `auth.conf.d` with and without the scheme and from userinfo, `Range` resume, `NotAutomatic`, a path-prefixed base URL), dput 1.1.3 and 1.2.4 uploads, and a pass-through to the live deb.debian.org verified with the stock keyring; the Debian repository format and the apt 2.6.1 and 3.0.3 sources (the older-`Date` discard, `Max-FutureTime`, the alternative-URI fallback); the live Debian, Debian security, Ubuntu and Pop!_OS archives; and OSV's Debian and Ubuntu ecosystems. Design: what this spec takes from the prototype (its findings 1 to 3; three new captured facts fed back); the generated layout; the shared-model mapping with a `src:` namespace and a retirement set; by-hash as the CAS key and the race cure; index documents as snapshot content and the envelope as pointer-scoped; a seven-item signing-service requirement list; the publish path, dput binding and write-boundary declaration; OSV by source package and release; Basic auth; the addressed-object table; the `403` rendering and its fallback limit; the chain-verified proxied path with Debian's removal rows; signed virtual merges. Nine questions written in decision shape and adopted under the standing delegation: pointer-scoped envelope (AC9, AC10, AC14), `Valid-Until` off by default (AC10), virtual signed and proxied unmodified (AC18, AC22), dput binding (AC4, AC16), no index elision (AC17), OSV coordinate (AC23), SHA256-only `Release` (AC3), no preconfigured upstream, membership actions (AC13). Twenty-seven criteria, each with a Test Plan row. Stays draft; awaits an independent review. |
