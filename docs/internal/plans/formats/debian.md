---
status: planned
status_description: "Planned by the Fable recheck of 2026-10-01 at 66ce5a0: a full review pass over the Opus-authored whole and the three Opus sweeps (claim verification of every sibling citation at HEAD, the adversarial lens at full strength on apt's by-hash and acquire races, Valid-Until, key rotation, dput and the digest index, constitution compliance) plus the re-examination of the ten questions adopted without Fable. All ten confirmed, none superseded; Q1, Q2, Q3, Q4, Q9 and Q10 with their fold or stated cost amended and Q5 extended to the virtual. Found and folded: the by-hash map is lineage-based, so a client mid-update across a non-adjacent repoint fails once and succeeds on its next update (stated, AC9); a backwards clock step makes the forward-only Date read as not-yet-valid for the size of the step (stated); a keyless Debian remote fails its first fetch because the hook treats the verifier's absent answer as the integrity failure, never adopting under class none (Design, AC20; proxy-cache was-Q23, artifact-verification AC31); the suite's three envelope forms are one paired adoption unit and a no-Acquire-By-Hash upstream's indices are verified by path (AC18); the cumulative digest index is bounded, per suite, and parsed once (AC21); the virtual merge drops a Filename collision across epochs (AC22), admits by anchor class under signing-service was-Q20 through Admission with the trust-set-revision transient stated, and loses Translation for upstream packages (owner-facing cost); the member inputs are the {suite} template over settings and a DeriveInputs derivation with round bound two (was-Q21, AC35); dput's .buildinfo, the omitted .orig tarball, Distribution and Section validation, the clearsigned .changes, the 201 answer and the per-file objects corrected for the epoch (AC4); signing-key.asc carries both keys during a rotation window (AC14); a frozen suite keeps renewing with conformance/debian/readonly_test.go (lifecycle was-Q11, AC10); an unplaced version keeps serving by path. Every open consequence against this file applied (signing-service recheck 5, storage recheck 7, lifecycle recheck 9). 28 criteria, each with a Test Plan row; zero open questions; check-spec zero failures; fable_recheck cleared. Sibling consequences reported, not applied. Earlier: Format closing sweep 2026-09-28 at a3a9d78 on Opus (not a review): the merging profile declares member-input paths (dists/{suite}/InRelease over the virtual's configured suites, then the Packages, Sources and Contents that envelope names by hash, a path derived from a document read earlier in the replay, which is signing-service's owed change); a remote member's adoption re-merges through the adoption hook, replacing the pre-commit trigger for remote members (signing-service was-Q16, AC35), a virtual-only remote is revalidated by the virtual's reads (proxy-cache AC26), and the virtual envelope's Date moves forward from the virtual pointer's record at every merge commit and member-list change (was-Q15, AC34); composed remote indices need a verified verdict (was-Q17, AC36), which every adopted Debian envelope has; DATA-LOSS AUDIT: a virtual has no snapshots, so the two previous merged generations its by-hash race needs are now on the virtual's declared blob-digest list (AC22 extended); the dput .changes object is a declared route-level object under management-api was-Q13 and retired claims are checked at declaration and again at commit (was-Q14; AC5 extended); pool files through ServeFile with a record-derived Last-Modified for apt's date-form If-Range and Cache-Control per format (signing-service was-Q14, Q18; AC24 extended); the source coordinate is the version's stored advisory key, on the fetch-and-cache request too (supply-chain was-Q11, AC24; data-model AC46; AC23 extended); the stale missing-auth-row gate on AC15 lifted. No question adopted; fable_recheck extended for two folded judgements; 28 criteria. Earlier: Data-loss fix 2026-09-28 at 93982ba on Opus (not a review): the hosted by-hash map keeps nothing alive, so for a pointer whose predecessors were pruned (a pinned environment, a quiet suite) a map-named digest whose blob is gone answers 404 and apt completes by path, the earlier generations deliberately not declared (AC8 extended); on a remote each index body is a cached file under its by-hash coordinate, the two predecessor envelopes and the cumulative digest index are on the remote's declared blob-digest list (proxy-cache was-Q19, this format declaring two), AC21 extended. Earlier: Reconciled 2026-09-28 at 15ced69 with the foundation wave (not a review): the index is this format's Indexer generator in internal/format/debian/index run by signing-service's write-path runtime; the envelope is a PointerDocument dated from data-model's per-pointer freshness record (AC36, AC37, AC22 qualified), served through ServeDocument (AC9, AC24); rotation is the dual-signature profile on the signing-key routes (AC14), the Valid-Until cadence a signing.resign schedule (AC10); management operations are publish, place, unplace, delete-version and configure on Operator with dput's .changes as the publish binding and core-held Retirement (AC5, AC13); the envelope and key are descriptors (AC16); WriteRefusal puts the policy condition in the reason phrase apt prints (AC17); the upstream keyring is the remote's trust set under artifact-verification's openpgp scheme, the proxied envelope under proxy-cache's cache-scoped Last-Modified with older envelopes not adopted (AC19); the release qualifier is supply-chain's declared advisory_ecosystem (Q6 revised, AC23); Q10 adopted (keyring and flat checks at first fetch, AC20); virtual merges on index.merge (AC22); Capabilities, rename, deletion and the settings document (new AC28). Earlier: authored 2026-09-26 from captures of apt 2.4.14, 2.6.1, 2.8.3 and 3.0.3 and dput 1.1.3 and 1.2.4; ten questions adopted under the standing delegation; none open. Awaits a /spec review pass."
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
serves the pointer's current document. **The map keeps nothing alive**: a digest it names is
metadata, never a reference (`storage-and-gc.md` AC16), so a previous generation's index blob lives
only while a snapshot holding it as its own index document is retained, through the snapshot mark
roots, which in the ordinary case is far longer than the seconds the race lasts. When the pointer
targets a snapshot whose predecessors have been pruned (an environment pinned past the retention
window, or a suite with no publish for longer than it), the map still names the earlier generations
but their blobs may be gone, and the handler answers `404` for such a digest exactly as for one the
map does not name, never a server error (AC8). No apt is affected by that `404`: a client only
ever requests a previous generation's digest while it holds that generation's envelope, and a
pointer that received no publish served no such envelope, so the clause is a server-side
equivalence the harness asserts with `curl`, not a client-visible event. The earlier
generations are deliberately not put on a declared blob-digest list: they exist for a publish race
lasting seconds, which a pointer receiving no publish does not have, and declaring them would pin
two extra generations of Debian-scale indexes to every long-pinned pointer. Path requests for
an index are served from the current generation. The same holds for `Contents`, whose `by-hash` sits under the component.

**What `by-hash` covers, and the one race it does not.** The map is lineage-based: the map in
snapshot N names the generations of N, N-1 and N-2 along the default pointer's publish history,
so a client that fetched the envelope of N and its indices after the publish of N+1 completes by
hash (AC8). A target-moving pointer transition to an adjacent snapshot is covered the same way.
A transition to a **non-adjacent** snapshot is not: after a rollback from N to T, or a promotion
of an environment pointer from T to N, a client that fetched the old target's envelope and
requests its indices after the move gets `404` by hash (the new target's map does not name the
old generation) and, by path, an index that disagrees with the envelope it holds, which apt
reports as its captured size or hash error and fails that one `apt-get update`; the client's
next update fetches the new target's envelope, dated later, and succeeds (AC9). The window is
the seconds of one client's update around a rare administrative event, and the client's own
retry heals it, so the cure, resolving a `by-hash` digest against the maps of every retained
snapshot of the repository, is declined: `data-model.md` records no previous target on a
`Pointer` and no per-repository index of document digests, and the race it would cure is
one bounded failure with a clear client message rather than data loss. The operator
documentation states it beside the rollback recipe. Rechecked on Fable 2026-10-01; the
lineage limit was unstated by the Opus passes.

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
pointer's freshness signals and pointer documents are not"), which this spec raised. A second
cost of the monotonic record, found on the Fable recheck of 2026-10-01: after the server clock
is stepped backwards by more than ten seconds, the next transition's `moved_at` (one second
after the previous value) is ahead of wall-clock time by the size of the step, and every apt
refuses the envelope as "not valid yet" (`Acquire::Max-FutureTime`, captured above) until the
clock catches up. That is inherent in any forward-only `Date` and is the price of the rollback
working at all; the operator documentation names it beside the NTP requirement, and AC9's
backwards-clock case asserts the `Date` ordering only, since the client-side refusal is the
captured behaviour and no design here changes it.

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
   file (captured on all four generations); its AC12 byte-checks every declared public form,
   "one or several concatenated". During a rotation window `signing-key.asc` carries the
   armoured block of **every** key the envelopes are currently signed by, old and new
   concatenated, so a client that re-fetches it during the overlap holds both keys and keeps
   verifying after the old signature is dropped, and a client that never re-fetches it is the
   one AC14's missing-key case describes; that a concatenated block works as `Signed-By`, as a
   file and inline, was not captured and is AC14's to prove.
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
| Remove a version from a suite | `unplace` | Coordinate, suite | It leaves that suite's indices; the pool file keeps serving by path whether or not a placement remains, since the version is still held and a client holding an older index may still fetch it, and `place` restores it to a suite; only `delete-version` answers `404` | `delete` |
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
  disagrees. A file the `.dsc` names that the publish does not carry is taken from the
  repository's existing pool file of that name when its digest matches, because a Debian
  revision of an unchanged upstream version (`1.0-2` after `1.0-1`) ships without the
  `.orig.tar.*` it names, as `dpkg-genchanges` writes the `.changes` unless `-sa` is passed;
  a missing or disagreeing one is the `422`.
- **A coordinate that already exists is refused with `409`**, with identical or different
  bytes; copying into another suite is the copy operation, not a republish. **A retired
  coordinate is refused** with `retired` (409), centrally by the shared write path against the
  core-held `Retirement` records (`management-api.md`, "Retirement is core-held"), the
  cross-format rule `npm.md`, `pypi.md`, `hex.md` and `maven.md` adopted. The claims are the
  coordinates `Authorize` reports, each binary's and the source's, checked when they are
  declared and again at commit, serialised with any retiring write on the repository head, so a
  `delete-version` committing between a publish's authorization and its commit cannot let it
  land (`management-api.md`'s resolved retirement-check decision, was Q14; `storage-and-gc.md`
  AC30). This format declares no unchanged publish (`management-api.md`'s resolved
  unchanged-publish decision, was Q15, is opt-in per format), so an identical republish stays
  the `409` above (AC5). **A pool filename collision is refused**: pool filenames omit the epoch
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
operator only under `dput -d` and through the transcript. Each accepted `PUT` answers `201`
with an empty body, the `.changes` included, since dput treats every `2xx` as success and
prints nothing of a success body (its `methods/http.py`, read for the capture).

Four details of the `.changes` the Fable recheck of 2026-10-01 found unstated, each refused
with the same `422` naming the field or file: a `Distribution` that names no configured suite
or codename; a `Section` whose component prefix names no configured component; a clearsigned
`.changes`, which `debsign` produces and `dput` sends as-is, is parsed from its signed body
with the signature not evaluated (Scope, "Uploader signatures"), and a body that is neither a
bare nor a clearsigned deb822 paragraph is the refusal; and a **`.buildinfo`**, which every
`dpkg-buildpackage` build lists in the `.changes` beside the `.deb`s and which dput uploads
like any other listed file, is bound by digest at the commit like them and stored as a file of
the source version the `.changes` names (of the binary version for a binary-only upload),
served under the version's pool directory and listed in no index, as the Debian archive keeps
it outside the indices; the upload fixtures for AC4 are built with `dpkg-buildpackage -us -uc`
in the bookworm image so each upload carries one, since the authoring capture's
`dpkg-genchanges` run did not. A file the `.dsc` names that the `.changes` does not carry
follows the publish rule above (the existing pool file of that name, digest matching).

How it meets `management-api.md`'s binding rule ("Bindings: one operation, two ways in"): dput is
one of the clients that rule names, the `.changes` `PUT` is the binding, and its route
implementation only parses the `.changes` into a `publish` operation whose declared blob digests
are the ones it names and submits it through `Submit`, with no authorization, write or
validation of its own; the per-file `PUT`s before it are uploads, not bindings, each authorized
under the object it names (the table in "Addressed objects and pattern scopes"). `Authorize`
then reports every object the publish adds, each binary coordinate and the source coordinate,
and `Submit` evaluates every pair, so a token patterned to cover the source but not one of its
binaries is refused the whole upload and nothing commits (an operation's pairs must all pass,
that spec's kind rules). `Scope(r)` reports exactly one object (`format-handler-interface.md`,
"The pinned method set") while a `.changes` publish reports several, so the binding's route
reports `src:{source}/{version}/changes`, which the `Binding` declares as its **route-level
object**: `management-api.md`'s resolved binding-scope decision (was Q13, its AC8) holds a
binding never wider than its operation, its route object one of `Authorize`'s, none, or a
declared route-level object, with `Submit` evaluating every pair `Authorize` reports on both ways
in. The binding is therefore stricter than the API where its wire forces it, never wider: a
principal holding only the route's object is still refused a `.changes` whose binaries fall
outside its pattern, and AC16 asserts exactly that. Several objects in one `Scope(r)` is left to
the interface re-open, recorded there as an input.

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
is refused at configuration as `validation` (422), `supply-chain-policy.md` AC11's rule. The
core never parses a stanza, so the handler **reports the source coordinate as the version's
advisory key** (one name, the source package, and one version, the source version) in the
metadata-store write that records the version, and the core stores it core-parsed on the
`Version` row, outside every metadata document (`supply-chain-policy.md`'s resolved advisory-key
decision, was Q11, AC24; `data-model.md` AC46). That closes the channel this spec's
reconciliation had reported as missing: resolution, the pre-fetch check on a proxied miss and
the request-free feed sync all match `libssl3` as `openssl` at its source version from the same
stored key. On the proxied path the digest index carries each pool file's `Source` and source
version beside its package, version and architecture, and the handler puts the key on the
fetch-and-cache request, so a condemned source is refused before any upstream fetch
(`proxy-cache.md`'s Obligation section, AC30). Source versions are compared under the Debian
ordering that spec implements.

### Authentication: Basic, preemptive, as apt sends it

apt presents HTTP Basic from `/etc/apt/auth.conf.d/*.conf` (netrc format) or from userinfo in
the `URIs:` value, **preemptively** on every request once an entry matches, with no challenge
round (captured on all four: the first request of the update already carried it). An entry
without a scheme is **refused by apt itself on plain HTTP**: `W: ... Credentials for
127.0.0.1:19401 match, but the protocol is not encrypted. Annotate with http:// to use.`, then
the `401` (captured on all four). That is the Basic presentation `auth.md` already verifies (its
AC31), so no new form is needed; `auth.md`'s client table carries the `apt` row and the `dput`
row from these captures, so AC15's auth cases rest on rows that exist. How this meets
`auth.md`, whose rules this spec does not bend:

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
resolves to nothing makes `Scope(r)` return an error, which denies with the shared not-found
denial (`format-handler-interface.md` AC10), the same answer the unknown-pool-path rule of the
proxied path gives, so a cold remote whose digest index holds nothing yet denies every pool
request until its first index is cached, which is that spec's interim bound on a `Scope(r)` that
reads repository state ("What `Scope(r)` may read"). On a virtual the pool path resolves through
the member that supplied the stanza and reports that member's object.

| Route | Object kind | Canonical object |
|---|---|---|
| `dists/{suite}/InRelease`, `Release`, `Release.gpg` | descriptor | - (the envelope names the suite's index files by path and SHA256, and its fields; no package, version or pool digest) |
| Every index file and every `by-hash` path | none | - (each enumerates names; a digest-addressed index is still a listing) |
| `pool/.../{package}_{version}_{arch}.deb` | named | `{package}/{version}/{architecture}` |
| `pool/.../` `.dsc` and source tarballs | named | `src:{source}/{version}/source` |
| `signing-key.asc` | descriptor | - (a signing-key document) |
| dput `PUT` of a `.deb` | named | `{package}/{version}/{architecture}` from `control`, read in the same bounded peek the management publish uses, the version epoch included; the filename must agree with it (package, epoch-less version, architecture, as `dpkg-deb` names the file) or the `PUT` is refused `422` before any byte reaches the CAS |
| dput `PUT` of a `.dsc` | named | `src:{source}/{version}/source` from the `.dsc`'s own `Source` and `Version` fields (a `.dsc` is small and read whole), the filename required to agree |
| dput `PUT` of a tarball or `.buildinfo` | named | `src:{source}/{version}/source` with the version **as the filename carries it**: an `.orig.tar.*` carries the upstream version alone (`swhello_1.0.orig.tar.gz` for `1.0-1`), a `.debian.tar.*` or native tarball the full version without epoch, a `.buildinfo` the full version without epoch; the object exists so that a patterned `push` names the source package before bytes are stored, and the coordinates that matter are the ones `Authorize` reports at the `.changes` commit |
| dput `PUT` of the `.changes` | named | `src:{source}/{version}/changes` from the filename (version without epoch, as `dpkg-genchanges` names it), every file it binds having been authorized under its own object at its own `PUT` |
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
re-signing the upstream's index. On a virtual the pool route resolves through the member that
supplied the stanza and is evaluated under that member's rules, exemptions and
`advisory_ecosystem` (`supply-chain-policy.md`'s resolved hosted-matching decision, was Q12
there), so the three paths refuse the same file the same way.

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
  key rotation looks like. **The signature is required on this wire, so it is never a class.**
  The hook on the envelope requires a `verified` result: a `failed` one and an `absent` one are
  the same integrity failure at fetch, and `absent` is exactly what `Verifier` answers when the
  remote's trust set holds no `openpgp` entry (`artifact-verification.md`, "Two products":
  no entry of the scheme's kind answers `absent`), so a remote configured with no keyring fails
  its first fetch with nothing committed (the resolved first-fetch decision below, was Q10) rather
  than adopting under anchor class `none` as a format with an optional signature would.
  `proxy-cache.md` states the rule for this layer once ("A signature the wire makes optional":
  where the wire requires the signature, `debian.md`'s envelope among its examples, no member
  is optional and an absent or unverifiable one is the integrity failure, never a class, its
  resolved withdrawn-signature decision, was Q23), and `artifact-verification.md` AC31 is what
  makes the consequence hold: every envelope a Debian remote ever adopts was adopted under class
  `signature` with a `verified` verdict, which is what "strict by construction" means in
  `signing-service.md`'s resolved admission decision (was Q20 there) and what lets a signed
  virtual admit every Debian remote member without a second check (Design, "Virtual
  repositories"). **The suite's envelope is one adoption unit**: `InRelease`, `Release` and
  `Release.gpg` are declared as one paired set per suite, fetched together on the first request
  for any of them, the set verifying through whichever signed form the upstream serves
  (`InRelease`, or `Release` with `Release.gpg`; an upstream serving all three is verified on
  `InRelease` and the detached pair checked against the same body), committed in one transaction
  so the three forms a client may read never disagree and the hash set a `by-hash` request is
  authorised against is one envelope's; an upstream `404` on one form is that form's negative
  entry inside the set (an upstream without `InRelease` serves the detached pair), and a set
  with no verifiable form at all is the integrity failure above. The envelope is ~140 to 255 KB (trixie 140,421 bytes, bookworm
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
- **Caching headers, through the one serving door.** This registry serves every `by-hash`
  document and pool file, hosted and proxied, with `Cache-Control: public, max-age=2592000`, the
  value the live archive uses for both, since neither can change under its path, and every
  envelope and path-addressed index with `Cache-Control: no-cache`, since both change with the
  pointer. The values travel in serve policies, never in handler code, and are the same on every
  Debian repository (`signing-service.md`'s resolved `Cache-Control` decision, was Q18, AC30):
  generated documents and envelopes through `ServeDocument` under the generator's profile, and
  pool files, hosted and cached alike, through **`ServeFile`** (its resolved handler-rendered
  decision, was Q14, AC32) under a package-level serve policy of this handler that asks for a
  `Last-Modified` from the `File` record's creation and for range support. apt resumes a partial
  pool download with `Range` and a date-form `If-Range` carrying the partial file's mtime
  (captured, "The wire surface"), so a `Last-Modified` stable per file is what gives a resume
  the chance to match, and a date that does not match returns the whole file, as `ServeFile`'s
  `If-Range` rule states; whether apt stamps the partial file from the interrupted response's
  `Last-Modified` was not captured and is confirmed by the resume case (AC24). The handler package sets no validator on
  any response.
- **Every index file is immutable by hash.** A `by-hash/SHA256/{hex}` request is served when the
  hash is one the cached envelope (or one of its two predecessors) lists, fetched from the
  upstream's own `by-hash` path (which the live archive serves with `max-age=2592000`) and
  verified by construction, since the path is the digest. **Each index body is a cached file under
  its `by-hash` coordinate**, whichever path the request used, held by its own cached reference,
  which no adoption ends and LRU eviction does; an index reclaimed after eviction is fetched again
  from the upstream's `by-hash` on the next request, and answers the upstream's `404` once the
  upstream has dropped it, apt then completing by path. The two predecessor envelopes are the
  remote's retained revisions, this format declaring two under `proxy-cache.md`'s resolved
  retained-revision decision (was its Q19) because the Debian rule quoted under "By-hash" asks for
  two previous versions: each predecessor's body is on the declared blob-digest list of the
  remote's repository-level document until the adoption that would make it the third, since a hash
  a kept envelope merely lists keeps nothing alive (`storage-and-gc.md` AC16). A path request for an index is
  resolved to the hash the **currently cached** envelope names for that path and served as that
  blob, so a client is never handed an index that disagrees with the envelope it was just
  served, which is the race the hosted path cures with `by-hash`. An upstream whose envelope
  carries no `Acquire-By-Hash` (a derivative archive) has no `by-hash` path to fetch from, so
  the index is fetched by its path and verified against the hash the cached envelope names
  before commit; a mismatch, which is the upstream's own sync race, commits nothing and answers
  the client `502` as any integrity failure at fetch does, and the next request fetches again. Files the envelope lists that
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
  upstream superseded it. The digest index is stored CAS-backed on the remote's repository-level
  document, **one blob per suite** so an adoption rewrites only its suite's index, every one
  declared on that document's blob-digest list, each rewrite replacing its suite's declared
  digest in the same write, so the current digest index is live and its predecessor collectable;
  the pool files it names are held by their own cached references, never by the index naming
  them. **Cumulative is bounded, not unbounded**: an entry stays while its `Filename` is named
  by the current envelope's indices or either predecessor's, or while a cached pool file exists
  under that `Filename`, and is dropped at the next rewrite once neither holds, so the index
  never grows past the three generations plus what the cache holds, and an entry dropped this way
  loses nothing a client could still be served (a file in no index and not in the cache is the
  `404` below either way). The lookup a pool request makes is against an in-process parse of
  the suite's index keyed by the document's digest and reloaded when the declared digest
  changes, never a per-request parse of a multi-megabyte blob; correctness never depends on the
  in-process copy, which is a cache of the declared document. Both were unstated before the
  Fable recheck of 2026-10-01. A pool path in no cached index answers `404` with no upstream request
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
  first, **and a stanza whose `Filename` an earlier member's stanza already carries dropped
  too**, with the operator record naming both: pool filenames omit the epoch, so two members
  can offer `1:1.0-1` and `1.0-1` of one package under one `Filename` with different bytes, and
  a merged index listing one path twice with two hashes would make apt fail whichever it
  fetched second (found by the Fable recheck of 2026-10-01; the hosted path refuses the same
  collision at publish). `Components` and `Architectures` are the union; `Origin`, `Label`,
  `Codename`, `NotAutomatic` and `ButAutomaticUpgrades` come from the virtual repository's own
  suite configuration. Pool paths are the members' paths under the virtual mount, each
  resolving through the member that supplied the stanza. `by-hash` and the envelope follow the
  hosted rules, the envelope scoped to the virtual repository.
- **Verification before merge.** A remote member's indices enter a merge only after its envelope
  verified against the member's trust set and each index against the envelope's SHA256, so the
  virtual signature never covers an unverified stanza; the merge verifies nothing itself. Every
  `Packages`, `Sources` and `Contents` the merge reads is a document it **composes** into a body
  the virtual signs, and what a signed virtual admits from a remote member is
  `signing-service.md`'s resolved admission decision (was Q20 there, which superseded the
  composed half of its was-Q17; AC36): admission follows the **anchor class** the member's
  current envelope was adopted under, read by the index runtime through its own `Admission`
  interface beside the verdict, never through `Deps` and never by this handler
  (`artifact-verification.md`, "Anchor class", AC31). On this format the rule is **strict by
  construction**, as that decision names Debian: the envelope's signature is required on the
  wire, so a Debian remote adopts every envelope under class `signature` with a `verified`
  verdict and nothing else, a remote with no keyring or a failing signature committing nothing
  at the fetch (Design, "The proxied path"; the resolved first-fetch decision below, was Q10).
  So no Debian remote is ever admitted under `none` and none is excluded for lacking an anchor;
  what AC36 changes here is the exclusion case, which on this format has exactly one cause: a
  failing upstream signature commits nothing, so the member's current envelope stays the last
  verified one and keeps being composed, but a **trust-set revision change** on the remote (a
  key imported ahead of an upstream rotation) makes every verdict computed under the older
  revision read `absent` until `artifact-verification.md`'s re-evaluation recomputes it or the
  next adoption records a new one, and under class `signature` an `absent` verdict is not
  admitted, so the member's packages leave the virtual's merged set for that interval and
  return with the re-evaluation, the operator record on the merged set's input record naming
  the member and the reason, and the virtual keeps serving its other members. The transient
  is `signing-service.md`'s rule, reported to it as a consequence rather than bent here.
  Nothing on this format is declared pass-through.
- **Regeneration is deferred.** The merge rule above is this format's generator's `Merge`. A
  hosted member's write enqueues an `index.merge` job on `internal/async` through the pre-commit
  hook, and so does a promotion into or a rollback of the hosted member's default pointer, which
  moves the head the virtual composes with no write (`signing-service.md` AC19, as its Fable
  recheck amended it; a repoint of the member's environment pointer changes nothing in the
  virtual); a remote member adopting a new upstream envelope, which is cache materialisation and not
  a write, enqueues it through the runtime's **adoption hook**, inside the adoption transaction
  (`signing-service.md`'s resolved remote-member decision, was Q16, AC35; `proxy-cache.md`
  AC25), replacing the pre-commit trigger this spec first assumed for remote members. Each is
  coalesced per virtual within `index.virtual_merge_window` (default 5 s) and visible within
  `index.virtual_staleness_bound` (default 60 s), with the first merge enqueued at the virtual's
  creation and one per member-list change (`signing-service.md`, "Virtual merges", AC19). A
  remote reached only through the virtual receives no request of its own, so serving a merged
  envelope whose input from the remote is past the remote's TTL enqueues one coalesced
  `proxy.revalidate` job that replays the remote's own routes below the authorizer, never on the
  request's path (`proxy-cache.md`, "Revalidation outside the request", AC26). The virtual
  repository serves its last merged, signed state until the regeneration commits atomically,
  and a failed merge leaves the previous set and an alert, never an empty index, so no signing
  ever runs on a client's request. A virtual repository creates no snapshots: its merged
  documents are derived state, stored as its current documents under the fourth mark root's
  current-document half (`storage-and-gc.md` AC16).
- **Member-input paths.** The profile declares, under the member's mount, how the path of
  every document the `Merge` reads from a member is obtained, in the three shapes
  `signing-service.md`'s resolved member-input decision provides (was Q21 there; its `Profile`
  bullet and AC35), registration refusing a merging profile without one. The envelope is a
  **template**, `dists/{suite}/InRelease`, whose one variable `{suite}` is sourced from the
  virtual's own `settings` document (the suites it configures) under the grammar one or two
  path segments of `[A-Za-z0-9][A-Za-z0-9.+-]*` (`bookworm`, `noble-updates`, and the
  two-segment `{codename}/updates` the older Debian security archive used), which admits no
  empty, dot or slash-bearing segment and so expands to nothing the template did not name.
  The indices are a **derivation**: this generator's `DeriveInputs` over the adopted envelope
  yields, for each (component, architecture) cell it lists, the `by-hash/SHA256/{hex}` path of
  the `Packages`, `Sources` and `Contents-{arch}` it names, in the `.xz` form where the envelope
  lists one and the `.gz` form otherwise (the two forms every live archive sampled serves; the
  uncompressed form is listed with its hash but not served by `deb.debian.org`), so the profile's
  round bound is two, the second of the two the decision names. A virtual's creation, or a
  member-list change adding a never-adopted remote, therefore fetches that remote's envelope in
  the first round and exactly the indices it names in the second, and the virtual lists the
  remote's packages with no request ever made to the remote's own URL (AC22). A suite the
  virtual configures that the remote does not hold answers the remote's negatively cached `404`
  and contributes nothing; no read-driven cell exists on this format, since every cell the
  merge reads is named by the envelope. The "owed change" this bullet recorded before the Fable
  recheck of 2026-10-01 landed as that decision.
- **Freshness moves forward at every merge commit.** A merge commit and a member-list change are
  document-only transitions of the virtual's default pointer (`signing-service.md`'s resolved
  virtual-freshness decision, was Q15, AC34; `data-model.md` AC36), so the envelope re-rendered
  and signed at every merge commit carries a `Date` from the virtual's pointer record, later than
  any the virtual served before whatever a member's own transitions did, and its
  `Last-Modified` moves with it, because apt discards an older `Release` from a virtual exactly
  as from a hosted suite (AC22).
- **By-hash on a virtual keeps its predecessors by declaration.** The hosted rule serves the
  current and two previous generations by hash through the snapshots that hold them, but a
  virtual has no snapshots, and a merge commit replaces its current documents, so a previous
  merged generation's index named only in the virtual's by-hash map would be held by nothing and
  collected by a sweep while a client that fetched the previous envelope still requests it,
  which is exactly the publish race `by-hash` exists to cure and which on a virtual recurs at
  every merge. Each merge commit therefore puts the index bodies of the two previous merged
  generations on the declared blob-digest list of the virtual's repository-level merged document
  and drops a generation from it in the merge that makes it the third, the declared list being
  the only way a document keeps another blob alive (`storage-and-gc.md` AC16; `data-model.md`,
  "Declared blob digests on a document, inline or CAS-backed", AC37), the count mirroring the
  two predecessor envelopes a remote keeps (Design, "The proxied path"). The hosted pinned-pointer
  choice (Design, "By-hash") does not transfer: a pinned hosted pointer receives no publish and
  so has no race, while a virtual's merges are its publishes.
- **What it costs clients.** A client of a virtual repository trusts this registry's key for
  upstream packages too, and pinning or `unattended-upgrades` rules written against
  `origin=Debian` no longer match, since `Origin` is the virtual repository's. A third cost,
  found by the Fable recheck of 2026-10-01: the merged envelope lists no `Translation` file
  (the hosted rule), while a Debian or Ubuntu `Packages` stanza carries only the first line of
  its description with a `Description-md5`, the long description living in `Translation-en`, so
  `apt show` of an upstream package through a virtual prints the short description alone;
  hosted members' stanzas carry their full `Description` and are unaffected. Merging the
  members' `Translation-en` is possible (apt matches entries by `Description-md5` and keeps an
  inline description where none matches) but uncaptured, so it is not adopted here; the cost is
  stated as owner-facing and revisitable. All three are stated in the operator documentation
  beside the recipe for listing a hosted and a proxied repository as two sources instead.

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
exactly what a never-existing repository answers. A virtual's rename enqueues one coalesced
`index.merge` in the rename transaction and calls no `Apply` (`signing-service.md` AC19), a
merge whose output on this format is byte-identical to the previous set.

**A frozen repository keeps renewing.** `read_only` refuses every publish, management operation
and key operation, but not the document-only transitions that keep a signed archive
installable: the `Valid-Until` cadence re-sign runs on a frozen suite through the write door's
document-only form under `Renewable` (`repository-lifecycle.md`'s resolved
document-only-transitions decision, was Q11 there, and its AC10; `signing-service.md` AC22),
so a frozen suite with a window never expires and its content stays bit-identical while its
envelope renews. `conformance/debian/readonly_test.go` is that spec's AC10 case for this
format and AC10's row here shares it. The cost is the operator's: every client's
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
      default-port endpoint, each produced by `dpkg-buildpackage` so it carries a `.buildinfo`,
      each creating exactly one snapshot at the `.changes` `PUT` and none
      before it, after the client's `401` challenge and its preemptive Basic retry, every
      accepted `PUT` answered `201`, the commit
      binding exactly the digests its `Checksums-Sha256` names with the `.buildinfo` stored
      under the version's pool directory and listed in no index; a clearsigned `.changes`
      commits the same as a bare one; a second-revision source upload whose `.changes` omits the
      `.orig.tar.*` its `.dsc` names commits against the pool's existing tarball when the digest
      matches and is refused `422` when it differs; a `.changes`
      naming a digest not in flight in the repository, naming a `Distribution` the suite
      configuration lacks, or a `.deb` whose `control` disagrees with
      its filename, is refused with `422` and nothing committed, and a real `apt-get install`
      then retrieves exactly the uploaded bytes.
- [ ] AC5: A publish of an existing coordinate is refused with `409` with identical and with
      different bytes, and a publish of a deleted coordinate is refused `409` `retired` by the
      shared write path, including after the delete's snapshot was pruned out of retention and
      after the default pointer was moved back to a snapshot that predates the deletion, and a
      publish whose coordinate a `delete-version` retires after the publish declared its claims
      and before it commits is refused `retired` at commit with nothing landed; a version
      differing from an existing one only in
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
      in the CAS through another repository, and apt then completes by path; and with an
      environment pointer targeting a snapshot whose two predecessors have been pruned and swept
      past the retention window on an injected clock, a `by-hash` request for a previous
      generation's digest the map still names answers a `404` byte-identical to the unnamed
      digest's, never a server error, asserted with `curl` since no apt holding that pointer's
      current envelope requests it, and a real `apt-get update` against that pointer completes
      by hash exactly as before the pruning.
- [ ] AC9: A client on each generation that updated against snapshot N sees snapshot N-1's
      content after an environment pointer is rolled back and one further `apt-get update`, and
      installs from it; the served envelope's `Date` is never earlier than any `Date` previously
      served on that pointer, including with the server clock stepped backwards under an injected
      clock, and its `Last-Modified` moves forward at every transition, so the client's
      `If-Modified-Since` is answered `200`; promoting a snapshot to a second pointer serves
      byte-identical indices and pool files there; a client that fetched the envelope before a
      rollback to the adjacent snapshot and its indices after it completes that update by hash,
      while one that did so across a rollback to a non-adjacent snapshot receives `404` by hash
      and apt's captured size or hash error by path on that update and completes the next one,
      the documented lineage limit of `by-hash`.
- [ ] AC10: A suite without a configured window serves no `Valid-Until`; a suite configured with
      one serves an envelope whose `Valid-Until` lies inside the window, and an environment pointer
      left idle for three windows under an injected clock is re-signed before each expiry by its
      `signing.resign` schedule, so `apt-get update` succeeds at every step, with no snapshot
      created by any re-sign; and the same holds with the repository set `read_only` for the
      three windows, its indices and pool files bit-identical throughout, while a publish, a
      `place` and a signing-key operation against it are refused `405` `read-only`
      (`repository-lifecycle.md` AC10, `signing-service.md` AC22).
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
      old-key client refuses with its generation's captured missing-key text (`NO_PUBKEY
      {keyid}` on gpgv, `Missing key {fingerprint}` on sqv); `signing-key.asc` fetched during
      the overlap carries both armoured blocks, and a client whose `Signed-By` names that
      fetched file, and one carrying it inline, verify on every generation before, during and
      after the window; no snapshot is created and no index document changes.
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
      through by hash; a stand-in serving `Release` with `Release.gpg` and no `InRelease`, and
      one serving all three, each adopt their suite's envelope set in one transaction and serve
      every form a client requests from that one set; a stand-in whose envelope carries no
      `Acquire-By-Hash` has its indices fetched by path and verified against the envelope's
      hash before commit, a mid-sync mismatch committing nothing and answering `502`; and every
      pool file was verified against the cached index's SHA256 before commit.
- [ ] AC19: A proxied envelope is revalidated after its TTL and not before, conditionally, so an
      unchanged one costs a `304` upstream; a version published upstream becomes installable after
      the TTL and, absent an explicit refresh, not before; neither a `by-hash` index nor a pool
      file is ever revalidated; every adopted envelope is served under a cache-scoped
      `Last-Modified` later than the previous one, never the upstream's; and an upstream envelope
      dated older than the adopted one is not adopted and records a divergence, so a real apt
      that updated before an upstream rollback keeps its lists and installs without error.
- [ ] AC20: A remote repository whose upstream envelope does not verify against its trust set,
      whose trust set holds no `openpgp` entry at all, or whose upstream is a flat repository, is
      accepted at configuration and fails its first fetch with nothing committed, the keyless
      case failing on the verifier's `absent` answer exactly as the failing one does and never
      adopting under anchor class `none`, the client receiving `502` and the operator an alert
      naming the reason (the keyring, or the flat layout); a stand-in envelope with a bad signature, an index disagreeing
      with the envelope, and a pool file disagreeing with the index are each never committed,
      attach no cached reference, and are recorded observably to the operator, the envelope case
      serving stale within the limit; and a pool path in no cached index answers `404` with no
      upstream request.
- [ ] AC21: A superseded upstream version keeps serving through the cumulative digest index with
      no divergence recorded, including after a sweep run with the grace lapsed and after its pool
      file's cached reference was evicted, the file then re-fetched and verified against the
      digest index; a `Filename` named by neither the current envelope's indices nor either
      predecessor's, with no cached pool file under it, is dropped from the digest index at the
      next rewrite and answers `404` with no upstream request, while one still backing a cached
      file is kept, so the index's entry count over a fixture of thirty adoptions stays bounded
      by three generations plus the cache; an adoption of one suite rewrites only that suite's
      digest-index blob; an index one of the two predecessor envelopes lists is served by hash after
      such a sweep, and a hash only the envelope a third adoption pushed out lists answers `404`
      with no upstream request once that adoption has committed; a package vanishing without successor keeps serving with a
      divergence recorded; a pool file whose bytes change under an unchanged `Filename` is purged
      with an alert and re-fetched against the new digest; an upstream `404` on a suite is
      negatively cached while a `429` or `5xx` is neither cached as absence nor surfaced as
      not-found; and a component name carrying a slash is served: Debian's side of
      `proxy-cache.md` AC13's table.
- [ ] AC22: A virtual repository over a hosted and a remote member serves, per suite, a merged
      envelope signed by its own key, from which every generation installs a hosted package and an
      upstream package; a (package, version, architecture) offered by both members is served from
      the first, and a stanza whose `Filename` an earlier member already supplied under another
      epoch is dropped with an operator record, the merged index never listing one path twice;
      after the remote member's upstream publishes, the virtual repository keeps
      serving its previous signed state until the deferred `index.merge` regeneration commits,
      within `index.virtual_staleness_bound`, and then serves the new version under an envelope
      whose `Date` and `Last-Modified` are later than the previous one's, with no signing
      operation on any client request path, the merge enqueued by the remote's adoption with no
      request to the virtual in between (`signing-service.md` AC35); a member-list change, and a
      merge after a member's rollback, likewise serve a later `Date` under an injected clock
      stepped backwards, and a real apt that updated before adopts it (`signing-service.md`
      AC34); a virtual created over a never-adopted remote lists the remote's packages for every
      suite it configures, the stand-in's transcript showing only `InRelease` and the indices it
      names by hash and the network layer no request to the remote's own URL, and a read of the
      merged envelope past the remote's TTL enqueues one revalidation and is served the current
      merged state with no upstream request on its path (`proxy-cache.md` AC26); a client that
      fetched the envelope before a merge and its indices after completes `apt-get update` by
      hash, including after a sweep run with the grace lapsed, while a generation three merges
      old answers `404` and apt completes by path; the merged envelope lists no `Translation`
      and the client requests none; and a remote member whose current envelope's verdict reads
      other than `verified` (its trust set revised after the adoption, before re-evaluation)
      contributes nothing to the next merge, with an operator record on the input record naming
      it, and returns to the merged set once the re-evaluation has recomputed the verdict.
- [ ] AC23: With a remote repository declaring `advisory_ecosystem: Debian:12` and an advisory
      rule attached, a binary whose stanza names an affected source package and source version is
      refused at resolution through the case-controlled advisory source, while the same binary
      name under an unaffected source is served, a `libssl3` stanza whose `Source` is `openssl`
      being matched as `openssl` at the source version, and refused on a cache miss before any
      upstream request; the key is the version's stored advisory key, so an advisory added after
      the pool file was cached condemns it at the next feed sync with no request in flight, and
      no metadata document is read to match it (`supply-chain-policy.md` AC24, `data-model.md`
      AC46); the same repository declaring
      `Ubuntu:24.04:LTS` matches the Ubuntu record set instead; and an advisory-dependent rule on
      a hosted repository with no declaration is refused at configuration as `validation` naming
      the missing declaration.
- [ ] AC24: Every hosted and virtual index document and envelope is produced by this format's
      generator run by the shared index runtime, never by the handler, proven by the architecture
      test that neither the handler package nor `internal/format/debian/index` imports
      `internal/signing/**`, key material or a signature library (`signing-service.md` AC2) and
      that the handler package sets no `Last-Modified` or `ETag` on any response, generated
      document or pool file (its AC11, module-wide under its was-Q14), a pool file answering a
      matching date-form `If-Range` with `206` and a stale one with the whole body through
      `ServeFile` (its AC32, AC30); and a proxied envelope above
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
| AC4 | conformance + integration | `conformance/debian/dput_test.go` (dput 1.1.3 and 1.2.4, binary and source `.changes` from `dpkg-buildpackage` fixtures with a `.buildinfo`, a clearsigned `.changes`, a second-revision upload omitting its `.orig.tar.*`, challenge and preemptive retry and the `201` answers from the transcript, install of the uploaded bytes); `internal/format/debian/dput_commit_test.go` (no snapshot before the `.changes`, the `.buildinfo` stored and unlisted, the existing-tarball reuse and its digest mismatch, missing digest, unconfigured `Distribution` and control mismatch refused) |
| AC5 | conformance + integration | `conformance/debian/publish_test.go` (republish refusals through the endpoint); `internal/format/debian/immutability_test.go` (retirement after pruning under an injected clock and across a backwards repoint, the claim-versus-deletion race checked at commit (`management-api.md` AC12, `storage-and-gc.md` AC30), the central refusal being `management-api.md`'s and `data-model.md` AC35's; epoch and tarball collisions; shared identical tarball; grammar and architecture refusals) |
| AC6 | conformance | `conformance/debian/source_test.go` (three generations, byte comparison) |
| AC7 | conformance | `conformance/debian/contents_test.go` (`apt-file` on apt 2.6.1 and 2.8.3, `by-hash` fetch asserted) |
| AC8 | conformance + integration | `conformance/debian/race_test.go` (envelope served before a publish, indices after, via a `holds` declaration on the client's first index request, `conformance-harness.md` AC27); `internal/format/debian/byhash_test.go` (map trimming, foreign-repository digest refused); `internal/format/debian/byhash_pruned_test.go` (a pinned environment pointer aged past the window on an injected clock, the predecessors pruned and swept, a `by-hash` request for a digest the map names but the store lost answering `404`, the object store read, the response byte-identical to the unnamed-digest `404`, and a real `apt-get update` against the pointer completing by hash afterwards) |
| AC9 | conformance + integration | `conformance/debian/rollback_test.go` (four generations: update at N, repoint, update, install from N-1; promotion byte comparison; the mid-update client across an adjacent and a non-adjacent rollback through a `holds` declaration, `conformance-harness.md` AC27, the second asserting apt's captured error and the completing next update; shared with `signing-service.md` AC10's apt half, and extending the prototype's single-generation `conformance/debian/repoint_test.go`, its AC13); `internal/format/debian/envelope_date_test.go` (monotonic `Date` from the pointer's freshness record and `Last-Modified` through `ServeDocument`, with a clock stepped backwards; the record itself is `data-model.md` AC36's) |
| AC10 | integration + conformance | `internal/format/debian/valid_until_test.go` (injected clock over three windows, snapshot count; the schedule mechanics are `signing-service.md` AC22's); `conformance/debian/valid_until_test.go` (a real update after each re-sign, and the captured expiry text when re-signing is disabled in a fault-injection build); `conformance/debian/readonly_test.go` (the frozen suite renewed over three windows and accepted by a real apt, content bit-identical, publish, `place` and key operation refused `read-only`; shared with `repository-lifecycle.md` AC10 and `signing-service.md` AC22) |
| AC11 | integration + property | `internal/format/debian/concurrent_publish_test.go` (interleavings over cells, checksum agreement); `conformance/debian/concurrent_publish_test.go` (real install of both) |
| AC12 | benchmark | `internal/format/debian/publish_bench_test.go`, with the threshold in `.github/workflows/ci.yml` |
| AC13 | conformance + integration | `conformance/debian/manage_test.go` (copy, remove, delete, `Codename` change with the captured error; each kind's trigger in the case's `script`, the per-kind case `management-api.md` AC24 requires); `internal/format/debian/manage_test.go` (snapshot per operation, `push`-only and non-administrator refusals, malformed `settings`, `405` `repository-type` on remote and virtual) |
| AC14 | conformance + integration | `conformance/debian/rotation_test.go` (old-key and new-key clients across the overlap and after it, the captured missing-key text per generation, and a client on the overlap-time `signing-key.asc` as a file and inline, four generations; the real-client half of `signing-service.md` AC7's `dual-signature` profile; the concatenated public form is its AC12's); `internal/format/debian/rotation_test.go` (no snapshot, indices unchanged, both blocks in `signing-key.asc` during the window) |
| AC15 | conformance + integration | `conformance/debian/auth_test.go` (challenge equality across existing and missing repositories; `auth.conf.d` and userinfo; wrong and `pull`-less tokens); `internal/format/debian/auth_test.go` (plaintext refusal under `auth.md` AC27) |
| AC16 | conformance + unit | `conformance/debian/auth_test.go` (the pattern-refusal case `format-handler-interface.md` AC7 and `auth.md` AC8 require, in both modes; pattern-scoped tokens through the `credentials` key; deep-`control.tar` fixture through `curl`); `internal/format/debian/scope_object_test.go` (the object table, per route, with the descriptor sentinel check on the envelope and the key through the shared helper in `internal/format/scope_test.go`, `format-handler-interface.md` AC12) |
| AC17 | conformance + integration | `conformance/debian/policy_test.go` (hosted and proxied modes; rules through the `policies` key, a controlled advisory through `advisories`; sole-source failure with the `Refused by policy` phrase in apt's output and two-source fallback both asserted from the transcript); `internal/format/debian/refusal_test.go` (the raw status line on the socket; the writer itself is `internal/format/refusal_writer_test.go`, `supply-chain-policy.md` AC18) |
| AC18 | conformance + integration | `conformance/debian/proxied_test.go` (Debian and Ubuntu stand-ins serving recorded archives; stock keyrings; network-level assertion from fresh lists; a detached-only stand-in and an all-three stand-in); `internal/format/debian/proxied_verify_test.go` (path-to-hash resolution, the envelope set adopted as one paired set in one transaction, the no-`Acquire-By-Hash` path fetch verified before commit with the mid-sync mismatch refused, pool verification before commit) |
| AC19 | conformance | `conformance/debian/proxied_ttl_test.go` (mutating stand-in; `304` upstream at the network layer; no revalidation of `by-hash` or pool); `conformance/debian/proxied_rollback_test.go` (the lagging stand-in serving an older envelope after a newer one, a real apt on each generation; the proxied rollback case `proxy-cache.md` AC22 names under `conformance/debian/`) |
| AC20 | integration | `internal/format/debian/upstream_config_test.go` (remote created against an unverifiable envelope, with an empty trust set, and against a flat upstream, accepted, then the first fetch failing with nothing committed and the alert naming the reason; the keyless case asserting no adoption under class `none`, the classifier's input being `artifact-verification.md` AC31's); `internal/format/debian/proxied_integrity_test.go` (bad signature, index mismatch, pool mismatch, unknown pool path, operator record) |
| AC21 | integration | `internal/format/debian/removal_test.go` (stand-in presenting each event class; the shared-layer half is `proxy-cache.md` AC13's; slash component; negative caching and throttling responses); `internal/format/debian/proxied_retention_gc_test.go` (a sweep on an injected clock with the grace lapsed after each adoption, the object store read after each; the per-suite digest-index blobs and both predecessor envelopes declared on the remote's list and surviving; an evicted pool file re-fetched and verified; a predecessor's index served by hash; the third adoption dropping the oldest envelope; the shared-layer half is `proxy-cache.md` AC27's); `internal/format/debian/digest_index_test.go` (thirty adoptions of a mutating stand-in, the entry bound, the kept-while-cached and dropped-when-neither rules, one suite's adoption leaving the other suite's blob digest unchanged, the in-process copy reloaded on a digest change) |
| AC22 | conformance + integration | `conformance/debian/virtual_test.go` (four generations installing from both members; first-member-wins on the coordinate and on the `Filename`, the epoch collision dropped with its record; no `Translation` requested; a second update after the merge adopting the new envelope; a member-list change and a member rollback each adopted; shared with `signing-service.md` AC34's apt half); `internal/format/debian/virtual_regen_test.go` (the `index.merge` job held and released through the kind pause, no signing call on the request path, the member excluded after a trust-set revision change with its operator record and restored after re-evaluation, forward-moving `Date` under a clock stepped backwards; the runtime halves are `signing-service.md` AC19's `internal/index/virtual_merge_test.go` and AC34's `internal/index/virtual_freshness_test.go`, the admission read `signing-service.md` AC36's); `conformance/debian/virtual_remote_test.go` (a virtual created over a never-adopted remote, the stand-in's transcript showing only the member-input paths and the network layer no request to the remote's URL; an upstream change adopted and merged with no virtual request; the virtual-only remote's revalidation from a read past its TTL, shared with `proxy-cache.md` AC26's `internal/proxy/revalidate_job_test.go` and `signing-service.md` AC35's `internal/index/virtual_remote_member_test.go`); `internal/format/debian/index/profile_test.go` (the `{suite}` template with its grammar refusing an empty, dot or slash-bearing value and the two-segment form accepted, `DeriveInputs` over a fixture envelope yielding the `.xz`-else-`.gz` `by-hash` paths of every cell and nothing else, the round bound of two, and a profile lacking an input refused at registration; the registration rules are `signing-service.md` AC35's); `internal/format/debian/virtual_byhash_gc_test.go` (the envelope held before a merge and the indices fetched after, a sweep on an injected clock with the grace lapsed between, the two previous generations on the virtual's declared list surviving and the third collected, the object store read after each; the fixture shared with `storage-and-gc.md` AC16's `metadata_blob_gc_test.go` and `signing-service.md` AC19; `conformance/debian/virtual_race_test.go` drives the same with a real apt through a `holds` declaration, `conformance-harness.md` AC27) |
| AC23 | integration | `internal/format/debian/advisory_coordinate_test.go` (source-package mapping under a declared `advisory_ecosystem`, `Debian:12` and `Ubuntu:24.04:LTS`; the advisory key reported on the version write and on the fetch-and-cache request, a network-level no-fetch assertion on a condemned miss, a feed sync condemning a cached file with no request; hosted refusal at configuration, the validation itself being `supply-chain-policy.md` AC11's; the `advisories` fixture carrying records for both); the stored key shares `internal/policy/advisory_key_test.go` (`supply-chain-policy.md` AC24) |
| AC24 | architecture test + integration | `internal/format/debian/arch_test.go` (no key material, signing primitive or `internal/signing` import in the handler or its generator package, beside `signing-service.md` AC2's module-wide test; no freshness header set by the handler, beside its AC11); `internal/format/debian/pool_serve_test.go` (a hosted and a cached pool file through `ServeFile`, a resumed range with a matching and a stale date-form `If-Range`, beside `signing-service.md` AC32's `ServeFile` cases); `internal/storage/metadata_root_test.go` (threshold crossing, sweep, serve through a real client in the conformance half) |
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
  index-by-hash and path-to-hash serving with each index a cached file under its `by-hash`
  coordinate, the suite's envelope set as one paired adoption unit with the required-signature
  rule, the two predecessor envelopes and the bounded per-suite digest indices on the remote's
  declared blob-digest list, pool stream-and-verify,
  negative caching, the removal table, the source coordinate reported as the version's advisory
  key and carried on the fetch-and-cache request under the declared `advisory_ecosystem`, pool
  files through `ServeFile`, `405` on remote writes

### Phase 5: Virtual repositories
- Waits on `docs/internal/plans/foundation/async-operations.md` reaching `planned`
- The generator's `Merge` with the coordinate and `Filename` collision rules, admission by
  anchor class, the `index.merge` deferred regeneration enqueued by member writes, remote
  adoptions and member repoints, the `{suite}` template and the `DeriveInputs` derivation, the
  virtual-only remote's revalidation, the virtual envelope with its forward-moving `Date`, the
  two previous merged generations on the virtual's declared list (AC22)

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
became `supply-chain-policy.md`'s declared `advisory_ecosystem`. All ten were adopted on Opus
and re-examined on Fable on 2026-10-01: each record below carries its verdict (ten confirmed,
six of them with their fold or stated cost amended, Q1, Q2, Q3, Q4, Q9 and Q10, and Q5's fold
extended to the virtual; none superseded).

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

Rechecked on Fable 2026-10-01: confirmed, with the mechanism the record under-stated made
explicit. The options were framed fairly and A is the same call `cargo.md` and `hex.md`
adopted. What the record left implicit is how a remote with **no** keyring fails rather than
adopting: `artifact-verification.md` answers `absent`, not `failed`, to a `Verify` against a
trust set with no entry of the scheme's kind, and its classifier would record such an adoption
under class `none`, so the first-fetch refusal rests on the handler's hook requiring
`verified` and treating `absent` as the integrity failure, which `proxy-cache.md`'s resolved
withdrawn-signature decision (was Q23 there) states for every wire that requires its signature,
Debian's envelope named. Design ("The proxied path") and AC20 now say so, and that is what
makes `signing-service.md`'s "strict by construction" (its was-Q20) true of this format rather
than asserted.

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

Rechecked on Fable 2026-10-01: confirmed; A is the only option under which the captured
discard rule and a working rollback coexist, and the mechanism has since been built into the
shared model and the signing service as the record says. Two costs the record under-stated are
now in Design: a forward-only `Date` runs ahead of wall-clock time after a backwards clock step
and apt refuses it as "not valid yet" for the size of the step (`Acquire::Max-FutureTime`), and
the `by-hash` map that makes the rollback race-free is lineage-based, so a client mid-update
across a rollback to a non-adjacent snapshot fails that one update and succeeds on the next
("By-hash, the CAS, and the publish race"; AC9).

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

Rechecked on Fable 2026-10-01: confirmed. The framing is fair (B's expiry-on-stall is the
availability risk that decides it) and the cadence now has a concrete home, the per-pointer
`signing.resign` schedule at `signing.resign_at_fraction`. Amended in fold: the record said
nothing about a frozen repository, where `read_only` as first written would have let the window
lapse; `repository-lifecycle.md`'s resolved document-only-transitions decision (was Q11 there)
keeps the cadence running under `Renewable`, folded into Design ("Capabilities, lifecycle and
the settings document") and AC10 with `conformance/debian/readonly_test.go`.

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
`index.merge` job kind on `internal/async` (`signing-service.md`, "Virtual merges", AC19),
enqueued for a remote member by its adoption hook (its was-Q16, AC35), and a remote member's
contribution is gated on the anchor class its adoption ran under, read by the index runtime
through its `Admission` interface, never a verification inside the merge (its was-Q20, which
superseded its was-Q17's composed half; AC36). Added 2026-09-28, the option unchanged: the
virtual declares the index bodies of its two previous merged generations on its merged
document's blob-digest list, since it has no snapshots to hold them for the by-hash race
(Design, "Virtual repositories").

Rechecked on Fable 2026-10-01: confirmed; A is right and B would remove the one-URL view that
makes a refusal enforceable. Amended in fold, three ways. The merge rule deduplicated on the
coordinate only, while pool filenames omit the epoch, so two members offering one `Filename`
under different epochs would have produced an index listing one path with two hashes; the
`Filename` collision is now first-member-wins with a record (AC22). The admission citation was
the superseded was-Q17 and a read "through `Deps`"; it is was-Q20 through `Admission`, and the
one exclusion a Debian member can meet, a trust-set revision change before re-evaluation, is
now stated rather than hidden behind "fails verification". And the merged envelope's lack of
`Translation` costs upstream packages their long description through a virtual, an unstated
client cost now recorded and owner-facing. The Opus fold of 2026-09-28 (the two previous merged
generations on the declared list) is confirmed: a virtual has no snapshot to hold them and its
merges are its publishes, so the hosted pinned-pointer choice does not transfer;
`signing-service.md` AC19 and `storage-and-gc.md` AC16 now carry the profile-declared count.

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
the one seam this spec reported, a multi-object publish under a binding whose `Scope(r)` reports
one object, is closed by its resolved binding-scope decision (was Q13, AC8): the `.changes`
object is declared route-level and `Submit` evaluates every pair (Design, "The dput binding").

Rechecked on Fable 2026-10-01: confirmed, the in-flight-digest rule being exactly what lets
dput work without the upload session the shared model forbids, and was-Q13's invariant (every
`Authorize` pair evaluated unconditionally, so the route object can only add a refusal) holding
the binding never wider than the API. Amended in fold, where the Opus authoring left the wire
under-specified: the `.buildinfo` every `dpkg-buildpackage` upload carries, which the commit
must bind or refuse; the `.orig.tar.*` a second revision's `.changes` omits, taken from the pool
by digest; `Distribution` and `Section` validated against the suite configuration; the
clearsigned `.changes`; the `201` answer; and the per-file objects, which the table derived
"from the filename" although a `.deb` filename lacks the epoch and an `.orig` tarball's carries
the upstream version alone, now derived from `control` and the `.dsc` where the file carries
them and from the filename as it is where it does not (Design, "The dput binding", the
addressed-object table; AC4).

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

Rechecked on Fable 2026-10-01: confirmed; the captured fallback makes B's benefit illusory on
any client with a second source, and the reason-phrase hijack has since made the refusal
legible. Added in fold: the virtual's pool route refuses under the supplying member's rules
(`supply-chain-policy.md`'s resolved hosted-matching decision, was Q12 there), so the three
paths agree.

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

Rechecked on Fable 2026-10-01: confirmed, the 2026-09-28 revision included. The revision
changed the mechanism and not the answer, and it is the better mechanism: the registry cannot
infer which release-keyed advisory set applies to a private rebuild of Debian packages, and
`management-api.md` makes no upstream request at creation, so an operator declaration validated
against the sources' ecosystem lists is the only honest shape. The stored advisory key
(`supply-chain-policy.md` was-Q11, AC24) is what makes the request-free feed sync match, which
option A as first written could not have promised.

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

Rechecked on Fable 2026-10-01: confirmed. The capture that apt requests `by-hash` under the
strongest listed hash is what makes B a second digest index per document, and no pinned client
needs `MD5Sum` or `SHA1`; Debian security's own SHA256-only `Release` is the precedent. The
cost is complete: a tool reading `MD5Sum` from `Release` is outside the matrix.

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

Rechecked on Fable 2026-10-01: confirmed. A preconfigured archive would also have to carry a
keyring choice, which the trust set makes an explicit operator act, and `proxy-cache.md`'s two
extensions since (was-Q14, was-Q17) left Debian out on the same reasoning.

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

Rechecked on Fable 2026-10-01: confirmed; the vocabulary applied by effect, and the cost (a
publishing CI key cannot withdraw) is the right side of B's. Amended in fold: the operations
table said a version's pool file "keeps serving while any placement remains", which read as a
`404` at zero placements; an unplaced version is still held and its files serve by path until
`delete-version`, which is what keeps a pin or an older list working and lets `place` restore
it (Design, "The publish path and what counts as a write").

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | e77404f | authoring pass: grounded first draft, not a review | Grounded the archive contract three ways: captured traffic from apt 2.6.1 (bookworm), 3.0.3 (trixie, sqv), 2.8.3 (Ubuntu 24.04 and Mint 22) and 2.4.14 (Ubuntu 22.04), pinned by digest, against a logging stub serving archives built and signed with the bookworm image's own dpkg-deb, dpkg-source, dpkg-genchanges, apt-ftparchive and gpg (cold and warm updates as shipped and host-like, the gz and xz preference, by-hash under SHA512 and SHA256 with path fallback, foreign architectures, `apt-get source`, `apt-file`, InRelease and detached forms, wrong-key, tampered, SHA1, RSA 1024, Ed25519, dual-signed and unsigned envelopes with each generation's text, expired, future, older, equal and absent `Date`, the `If-Modified-Since`-only revalidation that masks a repoint, a changed `Codename`, a suite mismatch, the publish race with and without by-hash, the two-source fallback on a `403`, Basic from `auth.conf.d` with and without the scheme and from userinfo, `Range` resume, `NotAutomatic`, a path-prefixed base URL), dput 1.1.3 and 1.2.4 uploads, and a pass-through to the live deb.debian.org verified with the stock keyring; the Debian repository format and the apt 2.6.1 and 3.0.3 sources (the older-`Date` discard, `Max-FutureTime`, the alternative-URI fallback); the live Debian, Debian security, Ubuntu and Pop!_OS archives; and OSV's Debian and Ubuntu ecosystems. Design: what this spec takes from the prototype (its findings 1 to 3; three new captured facts fed back); the generated layout; the shared-model mapping with a `src:` namespace and a retirement set; by-hash as the CAS key and the race cure; index documents as snapshot content and the envelope as pointer-scoped; a seven-item signing-service requirement list; the publish path, dput binding and write-boundary declaration; OSV by source package and release; Basic auth; the addressed-object table; the `403` rendering and its fallback limit; the chain-verified proxied path with Debian's removal rows; signed virtual merges. Nine questions written in decision shape and adopted under the standing delegation: pointer-scoped envelope (AC9, AC10, AC14), `Valid-Until` off by default (AC10), virtual signed and proxied unmodified (AC18, AC22), dput binding (AC4, AC16), no index elision (AC17), OSV coordinate (AC23), SHA256-only `Release` (AC3), no preconfigured upstream, membership actions (AC13). Twenty-seven criteria, each with a Test Plan row. Stays draft; awaits an independent review. |
| 2026-09-28 | 15ced69 | cross-spec reconciliation of the Wave 1 folds on Opus. Not a review | Not a review, and this spec's first reconciliation: every item in `agents/spec-loop/consequences.md` naming it verified against the current text of its source spec (signing-service 10, 11 and the verification routing; upstream-adapters 8 and 12; charter reconciliation 5; conformance-harness reconciliation 4 and 5; management-api 11 and 12; Open item 20's data-model, storage, signing, management, async, upstream and harness halves) and every requirement this spec placed on the ten foundation specs checked against what they say. Applied: every "to be authored" citation replaced by the real spec and criterion; the prototype's questions 1 to 3 answered by `signing-service.md` (optional `Indexer`, write-path trigger through `data-model.md` AC37's pre-commit hook) and the three captured facts marked met by the prototype's AC13 and `conformance/debian/repoint_test.go`; the pointer-scoped envelope as a `PointerDocument` dated from the pointer freshness record (`data-model.md` AC36, AC37; AC22 qualified there), `Last-Modified` through `ServeDocument`, the seven-item service list rewritten as citations (Debian key profile, generator package, `signing.resign` cadence at `signing.resign_at_fraction`, `dual-signature` rotation on the signing-key routes, public forms, the verification entry routed to `artifact-verification.md`'s `openpgp` scheme, `Merge` on `index.merge`); the management table gains the kinds (`publish` with the dput binding, `place`, `unplace`, `delete-version`, `configure`), the endpoint, `405` `repository-type` and per-kind cases; retirement moved to core-held `Retirement` (`retired` 409, AC5 across a backwards repoint); the envelope and `signing-key.asc` declared descriptors under `auth.md` was-Q23 with the sentinel check (AC16: apt now fails at the first index, not at `InRelease`); `WriteRefusal` and the `Refused by policy` reason phrase apt prints (AC17), the `package-level` binding row recorded; the proxied keyring moved to the remote's trust set, the `https` adapter with `allow_http`, the integrity-failure class, cache-scoped `Last-Modified` and a regression row with a proxied rollback case (AC19, `proxy-cache.md` AC22); the removal table named by event class; virtual merges on `index.merge` with a forward-moving virtual envelope `Date` (AC22); the seed path through the write-path hook, the `signing` sub-entry, `trust`, `holds` and the confined second source in the harness paragraph; a new Capabilities, lifecycle and settings section with AC28 (rename, deletion retiring keys, the declared `settings` document). Mismatches found, not queued: AC20 fetched the upstream at configuration, which `management-api.md` no longer does and whose keyring now lives in the trust set, so Q10 was raised in decision shape and adopted (first-fetch checks, A); Q6's derived qualifier contradicts `supply-chain-policy.md`'s operator-declared `advisory_ecosystem`, folded as a revision note under Q6 (the answer unchanged). Records Q1, Q3, Q4, Q5, Q8 and Q9 note what landed. `fable_recheck` extended, not removed. Stays draft. |
| 2026-09-28 | 93982ba | data-loss fix on Opus (storage-and-gc closing-sweep item 0): cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Applied item 0 of "From the storage-and-gc.md closing sweep" in `agents/spec-loop/consequences.md`, verified against `storage-and-gc.md`'s fourth mark root (its third reach, AC16) and `data-model.md` AC34, AC36 and AC45: a digest a document merely mentions keeps nothing alive, the declared blob-digest list is a document's only keep-alive, and a remote writes no content snapshot. The holes: the hosted by-hash text said previous generations "stay alive through the snapshot mark root", but the map naming them is a mention, so for a pointer targeting a snapshot whose predecessors were pruned (an environment pinned past the window, a suite quiet for longer) the map names blobs the sweep collects; on the remote, the two predecessor envelopes a `by-hash` request is authorised against and the cumulative digest index were held by nothing stated. Chosen, hosted: let them go and answer cleanly, the handler answering `404` for a map-named digest whose blob is gone exactly as for an unnamed one, apt completing by path (captured), rather than declaring two extra Debian-scale generations on every long-pinned pointer for a race such a pointer does not have (AC8 extended, `internal/format/debian/byhash_pruned_test.go`). Chosen, proxied: each index body a cached file under its `by-hash` coordinate on its own cached reference; the two predecessor envelopes the remote's retained revisions, this format declaring two under proxy-cache was-Q19, and the digest index, both on the remote's declared blob-digest list (AC21 extended so it fails if either is collected, `internal/format/debian/proxied_retention_gc_test.go`). Phase 4 updated. The pool-file row is coordinate-bound (purge), so proxy-cache was-Q20 does not apply. No new question adopted here; `fable_recheck` extended for the judgement. `node scripts/check-spec.js`: zero failures on this file. Stays draft. |
| 2026-09-28 | a3a9d78 | format closing sweep on Opus. Not a review | Not a review. Every still-open item in `agents/spec-loop/consequences.md` targeting this file, from every section, verified against the current text of its source spec and of this file. Applied: foundation-leftovers item 2 and `signing-service.md` AC35 (member-input paths `dists/{suite}/InRelease` over the virtual's configured suites, then each `Packages`, `Sources` and `Contents` that envelope names, by hash; the derived paths cite format closing sweep batch 2 item 1 as the owed change); signing-service closing-sweep item 6 (debian AC34 and AC35: the adoption hook replaces the pre-commit trigger this spec had for remote members, was-Q16; the virtual envelope's `Date` from the virtual pointer's record at every merge commit and member-list change, was-Q15, replacing the "does not yet state" wording); proxy-cache closing-sweep item 6 (the virtual-only remote's revalidation, AC26); batch 2 item 2 (AC36: every composed index needs `verified`, which every adopted Debian envelope has because a failing or keyring-less remote commits nothing, so the rule excludes only the already-stated failing member; AC36 left unchanged); management-api closing-sweep item 4 and management-surfaces item 6 ("The dput binding": the `.changes` object is a declared route-level object under was-Q13, AC8, the binding stricter than the API and never wider; the Q4 record's seam closed) and item 5 (claims checked at declaration and again at commit, was-Q14, `storage-and-gc.md` AC30; this format declares no unchanged publish, was-Q15 being opt-in; AC5 and its row); `signing-service.md` was-Q14 and Q18 (pool files through `ServeFile` under a package-level serve policy with a record-derived `Last-Modified` for apt's date-form `If-Range`, `Cache-Control` per format; AC24 and its row); supply-chain closing-sweep item 3 (the source package and version are the version's stored advisory key, was-Q11, AC24, `data-model.md` AC46, and ride the fetch-and-cache request from the digest index; AC23 and its row); auth closing-sweep item 3 (AC15's gate on the missing `apt` and `dput` rows lifted: both rows are in `auth.md`). DATA-LOSS AUDIT (batch 2 item 5 recorded this file as fine; re-checked): the hosted by-hash map, the remote's digest index and predecessor envelopes, and pool files on their own cached references are as the data-loss fix left them, but the virtual serves the hosted by-hash rule with no snapshots to hold the previous merged generations, so a previous generation named only in the virtual's map would be collected while a client in the race still requests it, a race a virtual meets at every merge; the two previous merged generations' index bodies are now on the virtual's declared blob-digest list (Design, "Virtual repositories"; AC22 and its row; the Q3 record). Found already done: charter reconciliation item 5 (prototype AC13), conformance-harness reconciliation items 4 and 5, the `reprepro` exception-list row in `conformance-harness.md`, Open item 20's halves, signing-service authoring item 10. Skipped: nothing. No question adopted; `fable_recheck` extended for two folded judgements. 28 criteria, each with a Test Plan row. Stays draft. |
| 2026-10-01 | 66ce5a0 | Fable recheck: full review (claim verification of every sibling citation at HEAD: `signing-service.md` was-Q20, was-Q21, AC12, AC19, AC22, AC35, AC36; `proxy-cache.md` was-Q23 and "A signature the wire makes optional"; `artifact-verification.md` "Two products", "Anchor class", AC31; `storage-and-gc.md` AC16; `repository-lifecycle.md` was-Q11, AC10; `management-api.md` was-Q13, AC8 and its Debian row; `supply-chain-policy.md` was-Q11, was-Q12, AC24 and its Debian rows; `auth.md`'s `apt` and `dput` rows; `data-model.md` AC36, which records no previous target on a `Pointer`; the tree holds no `internal/` or `conformance/` code, so no code claim was checkable) + adversarial lens at full strength on the Opus-authored design, the design judgement treated as unreviewed (apt's by-hash and acquire races, `Valid-Until`, rotation and the missing-key text, dput's upload shape, the digest index's keep-alive and growth) + constitution + re-examination of the ten adoptions made without Fable (Q1 to Q9 at authoring, Q10 at reconciliation) and the three judgements the Opus sweeps folded without a question | Brought current first: every item in `agents/spec-loop/consequences.md` targeting this file read in full and applied against the current text of its source (signing-service recheck item 5: strict by construction under was-Q20, the "owed change" replaced by was-Q21 and AC35 with `DeriveInputs` as the envelope derivation; storage-and-gc recheck item 7: AC22's row shares AC16's `metadata_blob_gc_test.go`; repository-lifecycle recheck item 9: the frozen envelope renews, `conformance/debian/readonly_test.go` shared with its AC10); every earlier item found applied by the Opus sweeps and re-verified. Verdicts: Q1 confirmed, two under-stated costs added (the forward-only `Date` after a backwards clock step, the lineage limit of the by-hash map); Q2 confirmed, fold amended for the frozen repository; Q3 confirmed, fold amended three ways (the `Filename` collision across epochs, admission by anchor class through `Admission` in place of the superseded was-Q17 and a `Deps` read, the `Translation` cost); Q4 confirmed, fold amended (`.buildinfo`, the omitted `.orig` tarball, `Distribution` and `Section`, the clearsigned `.changes`, the `201`, per-file objects derived from `control` and the `.dsc` since filenames lack the epoch); Q5 confirmed, extended to the virtual's pool route under the member's rules; Q6 confirmed with its 2026-09-28 revision; Q7, Q8 confirmed; Q9 confirmed, fold amended (an unplaced version keeps serving by path); Q10 confirmed, the mechanism made explicit (a keyless remote fails on the verifier's `absent`, never adopting under class `none`). The three Opus folds confirmed: the pruned pinned-pointer `404` (AC8 reworded so it no longer claims a client-visible event no apt would produce), the two predecessor envelopes and the digest index on the remote's declared list, the virtual's two previous merged generations on its declared list. Adversarial findings beyond the adoptions, each folded: the suite's three envelope forms as one paired adoption unit; a no-`Acquire-By-Hash` upstream's path fetch verified before commit (AC18); the cumulative digest index bounded, per suite and parsed once (AC21); `signing-key.asc` carrying both keys through a rotation window with the concatenated form put to AC14 since it was not captured; the trust-set-revision transient that drops a Debian member from a signed virtual until re-evaluation (AC22; a consequence for `signing-service.md`); the non-adjacent repoint race (AC9). Constitution: both paths and the virtual hold on every change, no handler table, the shared model untouched, nothing weakens `auth.md` AC10, no mark root added. Nothing superseded; no new question. 28 criteria, each with a Test Plan row; zero open questions; `node scripts/check-spec.js` zero failures on this file, advisories only; `fable_recheck` cleared. Sibling consequences reported to the orchestrator, not applied. draft to planned. |
