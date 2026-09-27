---
status: draft
status_description: "First grounded draft, authored 2026-09-27 against 1fbf1e7 from the requirements twenty-two format specs, write-triggered-services-prototype.md, replication.md, artifact-verification.md, management-api.md and the consequences queue placed on this spec. Eleven questions raised in the template's decision shape and adopted under the owner's standing delegation: the write path dispatches regeneration, signatures are records keyed by body digest and key rather than snapshot content, renderers are per-format generator packages discovered by an optional interface, the freshness mechanism is split with data-model.md, verification stays artifact-verification.md's, keys are per repository, file custody is the default with KMS and PKCS#11 behind one crypto.Signer seam, contention is serialised per document, followers serve pointer documents verbatim, and Galaxy server-side signing is not built. Never gate-reviewed; awaits review."
description: "Spec for the shared signing and generated-index service: the production form of the write-triggered services prototype's signed-index half. It regenerates every repository-wide or version-scoped generated document inside the write that invalidates it, stores it as CAS-backed metadata, keeps signatures as records outside snapshot content so rotation and rollback never rewrite history, renders pointer-scoped freshness (dated envelopes, TUF versions, forward-moving Last-Modified), holds every signing key behind one custody seam (encrypted file, KMS, PKCS#11, operator-held) that no handler can reach, publishes public keys in each ecosystem's form, and runs virtual merges as deferred work. Twenty-two formats consume it; it produces and never verifies."
author: michielvha
goal: "Make every signed or generated index in the registry the output of one shared service with one custody model, so that a format that only needs an index costs a generator function rather than a signing subsystem, and no handler ever holds a key."
priority: "high"
issue: 47
created: 2026-09-27
covers:
  - internal/signing/**
  - internal/index/**
  - internal/format/*/index/**
---

# Plan: the signing and generated-index service

One shared service in two packages, `internal/index` (generated documents: when they are
regenerated, where they are stored, how they are served fresh) and `internal/signing` (keys,
signatures, custody, rotation, public-key publication), consumed through `Deps` and an optional
per-format generator interface. It is the production form of the signed-index half of
`write-triggered-services-prototype.md`, built first in charter step 7, and it produces
signatures and documents while `artifact-verification.md` verifies them.

## Context

### Who depends on this

Twenty-two format specs state a requirements list titled "What the signing and index service must
provide" (or "What the signing service must provide", or "What the index service must provide")
and cite this file as "to be authored in the spec loop". Each was read for this draft and its
requirements are asserted below. Grouped by what they ask for:

| Ask | Formats, with the requirement's home |
|---|---|
| Signed repository-wide index, OpenPGP | `debian.md` ("What the signing and index service must provide", seven items; pointer-scoped envelope), `rpm.md` (seven items; armored single-packet signature over `repomd.xml`, key document), `arch.md` (eight items; binary single-packet signatures over databases and every hosted package), `cpan.md` (six items; `CPAN::Checksums`-compatible cleartext signing, signature records keyed by body digest) |
| Signed repository-wide index, other schemes | `alpine.md` (seven items; RSA PKCS #1 v1.5 over the index stream as a prepended tar segment, key named by file), `hex.md` (five items; RSA-SHA512 in `public_key:sign/3` form over a protobuf payload, SPKI PEM with an OpenSSH fingerprint), `hackage.md` (ten items; TUF root, snapshot, timestamp and mirrors roles, ed25519 only, per-pointer version counter, operator-held root) |
| Signed per-version document | `terraform.md` (four items; binary detached RSA signature over `SHA256SUMS`, additive rotation), `openvsx.md` (five items; pure Ed25519 over a stored blob under a memory bound) |
| Unsigned generated index | `maven.md` (three `maven-metadata.xml` levels, virtual merge, contention-safe), `conda.md` (five items; every repodata representation, patch application, shards), `cran.md` (six items; an R serialisation writer, `latestOnly`, generation from upstream records), `julia.md` (six items; registry tree, tree hash, deterministic tar), `luarocks.md` (eight items; data-only serializer, pointer-derived `Last-Modified`), `opam.md` (seven items; deterministic tar with byte-range rewrite), `chef.md` (six items; the universe), `vagrant.md` (six items; one catalog per box, the first unsigned consumer), `helm.md` (unsigned `index.yaml` regenerated in the same snapshot; consumes this service if it owns regeneration, which it does) |
| Reserved, on a sibling's decision | `nuget.md` (a repository countersignature before the CAS commit, should repository signing ever be adopted; its resolved repository-signing decision declined it), `ansible-collections.md` through `artifact-verification.md`'s resolved Galaxy decision (was Q6 there: server-side signing "remains `signing-service.md`'s"), `npm.md` through the same spec's Context (hosted `dist.signatures` and our own `/-/npm/v1/keys` are this service's) |
| Nothing, stated | `composer.md`, `homebrew.md` (brew accepts only Homebrew's own key), `puppet.md`, `swift.md`, `conan.md`, `cargo.md`, `go-modules.md`, `pypi.md`, `pub.md`, `oci.md`, `generic.md` |

Beyond the formats: `replication.md` (freeze re-signs through the target repository's key, its
resolved freeze decision, was Q10 there; an instance archive key "belongs to the shared signing
infrastructure" if its resolved trust-root decision, was Q7, is ever reversed; a follower "must
serve indexes it did not sign", charter step 10), `management-api.md` (owns the `configure` kind
key operations arrive as and who may call them; this spec owns "key generation, rotation with
overlap and the document a rotation produces"), `artifact-verification.md` (the produce/verify
boundary: it "never produces a signature", and "a service that both signs and verifies with the
same key material is the class of surface `auth.md`'s nothing-is-invented posture warns
against"), `conformance-harness.md` (the seed path applies `state` through the shared layers, so
seeded hosted state must come out generated and signed), and `data-model.md` and
`storage-and-gc.md`, whose fourth mark root exists because of Debian's `Release`.

The consequences queue (`agents/spec-loop/consequences.md`) places further requirements here:
the replication fold's item 6 (archive signing and freeze re-signing), Open items 9 (NuGet
countersignature before the CAS commit), 11 (Maven metadata generation, contention-safe, virtual
merge, ETag from snapshot), 12 (Hex), 14 (conda), 15 (CRAN), 16 (Julia), 17 (Swift: nothing),
18 (Terraform), 19 (RPM), 20 (Debian; pointer-scoped wrapper), 21 (Alpine), 23 (Vagrant), 24
(Chef), 26 (Hackage), 27 (LuaRocks), 28 (CPAN), 29 (opam), 30 (Homebrew: nothing), 31 (Open
VSX), 32 (Arch), cross-cutting theme 1 (forward-moving freshness scoped to the pointer or the
cache, seven formats), management-api item 14 (key-operation semantics are this spec's, the wire
shape is management-api's) and artifact-verification item 13 (the produce/verify boundary).

### The charter's placement

`project-charter.md` step 7 builds "the shared signing and index service" first in the Tier 1
remainder, "the production form of what the step 4a prototype learned, built once before Helm,
the first remaining format with a write-triggered generated index, so Helm, Debian and RPM
consume one service rather than the first of them growing it inside a handler and charging a
shared layer to its own cost line". Its AC12 forbids a handler reaching `main` before the shared
subsystem it needs has met its criteria, and its cost procedure charges this service to the
`signing` shared line with no `triggered-by`. Maven precedes Helm inside the step because it
uses only the unsigned half (`maven.md`, Context), so this spec's Phase 1 must serve an
unsigned consumer before any signed one.

### What the prototype established and what it left to this spec

`write-triggered-services-prototype.md` defines the class: "a publish invalidates a
repository-wide signed document, and that document must be regenerated and re-signed before any
client can resolve anything at all", with three properties (repository-scoped, needs a secret the
handler must not own, a precondition for reads). Its finding (AC7 there) answers whether the
mechanism is expressible through the pinned five methods plus `Deps`, who owns the trigger, and
whether one snapshot per publish holds under concurrency. This spec states the production
design on the same three axes and names, for each, the finding that would revise it: it is
written before the finding exists, as `helm.md` and `maven.md` did, so that the re-open has a
production proposal to test against rather than a blank.

The prototype excluded "signing key management as a product feature" because "operators need
rotation, hardware backing and per-repository keys" and "the prototype's finding does not depend
on which of them are made". Those are this spec's.

### Prior art, and what is taken from it

Gathered 2026-09-27 by fetching the cited pages; what each does, what is taken and what is
rejected.

- **Pulp's `SigningService`** (pulpcore admin guide "Signing metadata"; pulp_deb's
  `AptReleaseSigningService` guide). Signing is delegated to an operator-supplied executable
  script: it "Must accept the path to the file to be signed as a argument" and "Must return a
  JSON dict detailing the path to any signed files", `{"signatures": {"inline": ".../InRelease",
  "detached": ".../Release.gpg"}}` for apt; the service stores `pubkey_fingerprint` and
  `public_key`; keys live "in the GPG keyring of the Pulp worker user account"; the script must
  be at an absolute path on every worker; a signing service attaches per repository, per
  publication, or per distribution through `signing_service_release_overrides`. **Taken:** the
  separation of "what to sign" (the plugin's format knowledge) from "how to sign" (a service
  chosen per repository), the stored public key and fingerprint, and per-release-component key
  choice as a per-repository setting. **Rejected:** the shell-script seam. An executable the
  server forks is an unbounded capability with no typed contract, no way to hold the "handler
  never sees the key" boundary mechanically, and no place for a `crypto.Signer`; this spec's
  seam is a Go interface with three custody backends behind it.
- **reprepro** (`reprepro(1)`, `SignWith` in `conf/distributions`). Values are "yes" or
  "default" (the default gpg key), a key id, or "!script" for an external hook run with three
  arguments (the `Release` path, the inline output path, the detached output path); reprepro
  "aborts distribution export unless the script exits with code 0"; passphrases go through
  gpg-agent with pinentry rather than `--ask-passphrase`. **Taken:** signing is a step of the
  export that fails the export, never a best effort, and the key is named per distribution.
  **Rejected:** interactive passphrase handling; a server has no pinentry.
- **aptly** (`aptly publish`). "Key generation, storage, backup and revocation is out of scope of
  this document"; signing is skipped with `gpgDisableSign` or `--skip-signing`; the public part
  "should be exported from your keyring using `gpg --export --armor` and imported into apt
  keyring". **Taken:** the honesty that custody is a product surface, which is exactly why this
  spec exists. **Rejected:** unsigned publishing as a switch; here a format that declares a
  signing profile is never served unsigned.
- **Nexus Repository** (Yum and APT hosted). Per repository "Signing Key" (the private key,
  ASCII-armored, pasted into the form) and "Passphrase"; "The signing process occurs during
  metadata file generation, not when RPMs are downloaded"; "by default, Yum metadata is
  generated after 60 seconds when you upload an RPM" with a "Rebuild Yum repository metadata"
  repair task; "Nexus Repository does not sign the actual RPM packages themselves"; APT proxies
  offer "Passthrough Mode" (upstream metadata served) or "Re-signing Mode" (Nexus "generates and
  signs metadata"). **Taken:** per-repository keys, signing at generation time, and the two
  proxy modes named (this spec chooses passthrough for remotes and re-signing only for virtual
  repositories, below). **Rejected:** a private key pasted into a form and stored by the
  application, asynchronous regeneration with a repair task (the class of eventual consistency
  `data-model.md`'s one-write-one-snapshot rule forbids), and metadata-only signing as a
  ceiling, since `arch.md` needs package signatures.
- **Artifactory** (GPG signing). Signing keys are managed under Administration, Security, Keys
  Management; "Starting from version 2.8.1, Distribution supports managing multiple pairs of GPG
  signing keys"; "If you are using a Vault, see Vault for instructions". Its repository signing
  (Debian, YUM, Alpine) historically used one instance-wide key pair. **Taken:** external vault
  backing as a first-class option, and a keys-management surface in the administration API.
  **Rejected:** the instance-wide key (the resolved key-scope decision below).
- **TUF** (specification, latest). Root and targets keys offline, timestamp online ("the risk
  posed to clients by the compromise of this key is minimal", 2.1.4); rotation by "a new
  root.json file that lists the updated trusted keys" signed "with both the new and old root
  keys" (6.1); clients walk `N+1.root.json` incrementally and "The version number of the new
  root metadata ... MUST be exactly ... N+1" (5.3); "All keys, except those for the timestamp and
  mirrors roles, should be stored securely offline (e.g. encrypted and on a separate machine, in
  special-purpose hardware, etc.)" while the specification "does not prescribe how keys should
  be encrypted and stored". **Taken:** roles with distinct custody (an online role may live in
  the file backend while the root is operator-held), rotation as a new root signed by both
  thresholds, and monotonic versions as the anti-rollback primitive that `hackage.md` grounds
  in captured client behaviour. Note that `hackage.md` records hackage-security's departure from
  5.3: it "checks only against the cached root and never walks intermediate versions", so the
  old root keys keep cross-signing for an operator-set window.
- **Sigstore's KMS seam** (`github.com/sigstore/sigstore/pkg/signature/kms`). `Get(ctx,
  keyResourceID, hashFunc, opts)` "returns a KMS SignerVerifier for the given resource string";
  providers register through `AddProvider`; built-in schemes `awskms://`, `gcpkms://`,
  `azurekms://`, `hashivault://`; the `SignerVerifier` exposes `CryptoSigner()`. **Taken:** the
  URI-addressed backend and the `crypto.Signer` it yields, so one signing code path serves every
  backend.
- **PKCS #11 in Go** (`github.com/ThalesGroup/crypto11`). "Enables access to cryptographic keys
  from PKCS#11 using Go crypto API": `Configure` with `Path`, `TokenLabel`, `Pin`;
  `FindKeyPair`, `GenerateRSAKeyPair`, `GenerateECDSAKeyPair`; implements `crypto.Signer` with
  PKCS #1 v1.5, PSS and ECDSA; uses `miekg/pkcs11` through cgo; Ed25519 is not offered.
  **Taken:** the backend and its algorithm ceiling, which is why a key's algorithm is checked
  against its backend at creation (an ed25519 Hackage role cannot live on such a token).
- **OpenPGP in Go** (`github.com/ProtonMail/go-crypto/openpgp`, `v2` and `packet`). Detached
  signing through `DetachSign`, `DetachSignWithParams` and `ArmoredDetachSign`, clearsigning
  through its `clearsign` package, several signers in one operation (`signers []Entity`), and
  `packet.NewSignerPrivateKey(creationTime, signer)` for an external `crypto.Signer`; algorithms
  include RSA, ECDSA, EdDSA, Ed25519 and Ed448. **Taken:** the one OpenPGP library
  `artifact-verification.md` already allowlists, so producer and verifier share a codec, and the
  external-signer constructor that makes KMS and PKCS #11 keys sign OpenPGP.
- **The Debian repository format** (wiki.debian.org/DebianRepository/Format). "Servers shall
  provide the InRelease file, and might provide a Release files and its signed counterparts";
  "Clients updating a local on-disk cache should ignore a Release file with an earlier date than
  the date in the already stored Release file"; "Clients may not use the MD5Sum and SHA1 fields
  for security purposes, and must require a SHA256 or a SHA512 field". **Taken:** the `Date`
  rule as the published statement of what `debian.md` captured, and the reason the pointer holds
  the envelope.

## Scope

**In scope**

- The generation runtime: regeneration of every generated document inside the write that
  invalidates it, dispatched by the shared write path, landing in the same snapshot; incremental
  regeneration scoped to the cells a write touches; per-document serialisation under
  contention; storage inline or CAS-backed under `data-model.md`'s threshold; byte-derived
  `ETag`s; deterministic output.
- The signing runtime: signing of generated bodies and of stored blobs (Arch package signatures,
  Open VSX `.sigzip`, Terraform `SHA256SUMS`) inside the write, under a memory bound; signatures
  kept as records keyed by body digest and key, outside snapshot content; assembly of a served
  document from body and signature by concatenation, never by signing on a read path; a
  self-check of every produced signature with `artifact-verification.md`'s verifier before
  commit.
- Pointer-scoped documents and freshness: the pointer-held envelope (`debian.md`), the
  per-pointer TUF `snapshot.json` and `timestamp.json` with their version counter
  (`hackage.md`), signature records produced at pointer transitions (`cpan.md`), re-signing on
  an expiry cadence without a snapshot, and the forward-moving per-pointer `Last-Modified` with
  exact-match `304` that `cpan.md`, `luarocks.md`, `arch.md` and `homebrew.md` require (theme 1;
  the data-model half of the split is stated and reported as a consequence).
- Key custody: per-repository key sets with format-declared purposes and algorithms; three
  backends behind one `crypto.Signer` seam (encrypted file, KMS by URI, PKCS #11) plus
  operator-held public-only keys (Hackage's offline root); import of an existing key for
  migration; the guarantee that no handler package, log, response or export ever carries
  private material.
- Rotation: seven client-grounded rotation profiles (dual-signature overlap, key-document
  overlap, announce-switch-retire, atomic re-sign, additive, TUF root chain, retrieval by digest),
  each an atomic cutover; rollback across a rotation; key operations as admin-only `configure`
  operations of `management-api.md`.
- Public-key publication in every consumer's form: ASCII-armoured OpenPGP blocks (one or several
  concatenated), the 16-hex key id, SubjectPublicKeyInfo PEM with the OpenSSH `SHA256:`
  fingerprint, apk's exact key filename, TUF key ids and thresholds, and npm's keys document;
  the management surface's listing with fingerprints.
- Virtual merges as deferred, coalesced work signed with the virtual repository's key, and
  generation on the proxied path from records an upstream adapter parsed, unsigned.
- What replication carries: pointer documents and signature records travel with the pointer set;
  a follower signs nothing while linked; takeover requires the keys to be resolvable.
- The seed path: `state` seeding produces exactly what a publish would.
- Per-format generators as sibling packages of each handler, discovered by an optional
  interface, with the architecture tests that hold the boundary.

**Out of scope, with the reason**

- **Verifying anything**, including upstream `InRelease`, TUF chains, Hex payloads against an
  upstream key, and the "verification entry" `debian.md` item 6 and `hex.md` item 5 ask of this
  service: owned by `artifact-verification.md` (its `tuf`, `openpgp` and `raw` schemes and its
  resolved reach decision, was Q9 there). Excluded on ownership and on the boundary that spec
  drew: a component that both signs and verifies with the same key material is the surface
  `auth.md`'s nothing-is-invented posture warns against. The resolved boundary decision below
  routes those two requests and reports the consequence.
- **The renderers' format knowledge**: what a `Packages` stanza, an `APKINDEX` record, a
  `repodata` shard or a `maven-metadata.xml` contains, field for field, is each format spec's,
  proven against the reference tool named there (`apt-ftparchive`, `apk index`, `createrepo_c`,
  `repo-add`, `conda-index`, `tools::write_PACKAGES`, `hackage-repo-tool`). This spec owns the
  contract a generator meets and the runtime that calls it, never the bytes. Excluded because a
  service holding twenty renderers is a second set of handlers wearing a shared layer's name.
- **Deferred execution itself** (workers, retries, cancellation): `async-operations.md` (owed,
  charter step 6a). The virtual merge is expressed as deferred work with a staleness bound; how
  it runs is that spec's.
- **The cache-scoped `Last-Modified` of a remote repository** and the rule that a remote never
  adopts an older upstream revision (`homebrew.md`, `arch.md`, consequences items 30 and 32):
  `proxy-cache.md`'s, because the record it derives from is the cache's, not a pointer's. Named
  here so the split in theme 1 is complete.
- **Galaxy server-side signing**: not built (the resolved Galaxy decision below);
  `artifact-verification.md` chose verified attachment and this spec finds no consumer that
  requires the registry's own signature on a collection.
- **NuGet repository countersigning**: the pre-commit transform hook is specified as an interface
  and left unimplemented because `nuget.md`'s resolved repository-signing decision declined the
  `RepositorySignatures` resource. Excluded on the consumer's decision, not effort; the hook's
  shape is here so adopting it later is a generator, not a redesign.
- **An instance archive key** for replication exports: `replication.md` adopted an out-of-band
  digest (its resolved trust-root decision, was Q7). The `archive` key purpose is reserved with
  instance scope so a reversal lands here, and nothing is built.
- **Signing content this registry proxies**: a `remote` repository serves upstream documents and
  signatures verbatim (`hex.md`: "re-signing is refused by every unmodified client, captured";
  `debian.md`'s resolved virtual-and-proxied decision, was Q3 there). Excluded because the
  clients say so.
- **The web UI's rendering of keys and fingerprints**: charter step 9; the data it renders is the
  management listing this spec defines.

## Design

### Two halves, one write

The service has an **index half** and a **signing half**, and the format specs are explicit that
a consumer may use either alone: Maven, conda, CRAN, Julia, LuaRocks, opam, Chef, Vagrant and
Helm use generation with no key ("nothing is signed and the service's signing half is not
used"); Terraform and Open VSX use signing with no repository-wide index ("nothing is asked of
its index half"); Debian, RPM, Alpine, Arch, Hex, Hackage and CPAN use both. The two halves are
therefore two packages with one contract between them:

- `internal/index` owns **when a generated document is produced** (inside the write that
  invalidates it, at a pointer transition, on an expiry cadence, as a deferred merge), **where it
  lives** (the metadata document at the level the generator declares, inline or CAS-backed; a
  pointer document; a signature record) and **how it is served fresh** (`ETag`, the pointer's
  `Last-Modified`, conditional requests).
- `internal/signing` owns **keys** (custody, algorithms, purposes, rotation state, public forms)
  and **signatures** (producing one over bytes or a stored blob under a named profile, and
  self-checking it). It exposes no operation that returns private material, to anyone.

Both are reached only through `Deps` and the generator contract below. A handler's HTTP package
never imports either (AC2).

### The generator contract, and where a generator lives

The prototype's first question is whether a write-triggered service is expressible through the
pinned five methods plus `Deps` "or does it require a new method", noting that "if the shared
layer must instead call back into the handler to produce format-specific index bytes, that is a
sixth method". Per the resolved renderer-placement decision below, the shared layer does call
back for bytes, and the callback is **not a pinned method**: it is an optional interface
discovered by type assertion at registration, the idiom `management-api.md` adopted for
`Operator` and that `io.WriterTo` and `http.Flusher` use. A handler that generates nothing
implements none of it.

`internal/format` declares, beside `Deps`, `Operator` and the typed policy refusal, the value
types and the one-method consumer interface:

- `Indexer`, asserted at registration: `Generator() index.Generator`. The handler returns a value
  from its own sibling package `internal/format/<name>/index`, which is the **generator
  package**: it imports `internal/index`'s value types and nothing else of the registry (no
  `Deps`, no `net/http`, no `internal/signing`, no `crypto/*`), and it is pure: records in, bytes
  out.
- `index.Generator` is the contract the runtime calls, with these members, each named so a
  format spec's requirement list maps onto one:
  - `Profile() index.Profile`: the format's declaration. Which **document keys** it produces and
    at which level (`repository`, `package`, `version`, or `pointer`), how a change maps to the
    keys it invalidates (`Affects(change) []DocumentKey`, the incremental property every spec
    requires), which keys are **signed** and under which **signing profile** and **assembly**
    (below), the **rotation profile**, whether the format has a **pointer document** and a
    **version counter**, and its **freshness rule** (`Last-Modified` from the pointer, `ETag`
    only, or none, as `opam.md` requires). A profile with no signing profile makes the format an
    unsigned consumer and the service creates no key for it (AC24, `vagrant.md` item 6).
  - `Generate(ctx, in) (out, error)`: `in` carries a read view of the repository at the pending
    state of the transaction (the version-level records the generator reads, through the same
    metadata store the handler reads, scoped to the repository), the previous document set by key
    with digests, the change, the pointer's freshness record when the key is pointer-scoped, and
    a `Signing` handle; `out` carries, per affected key, either bytes or a streaming writer (a
    Debian-scale `Packages` or a conda repodata is written to the CAS as it is produced, never
    buffered whole), plus the declared blob digests a multi-blob document consists of
    (`hackage.md`'s segments, `cpan.md`'s manifest). Every key not in `out` keeps its previous
    bytes and digest, which is what makes an untouched cell's `ETag` stable (AC4).
  - `Merge(ctx, members) (out, error)`: the virtual merge over the members' current document
    sets, with the format's own rule (first member wins, union in member order, newest
    `lastUpdated`). A format whose virtual is a concatenation or a union of listings
    (`julia.md`) or that cannot have virtual repositories (`hex.md`) declares no merge.
  - `FromUpstream(ctx, records) (out, error)`: the proxied-path generation from records an
    upstream adapter parsed (`cran.md`, `luarocks.md`, `chef.md`, `opam.md`), sharing the
    renderer with the hosted path so "hosted, proxied and virtual repositories share one
    generator and one stored form".
- The `Signing` handle a generator receives inside `Generate` is a **capability scoped to the
  transaction and to the repository's active keys**: `Sign(profile, bytes)` and
  `SignBlob(profile, digest)` return a signature; `PublicKeys(purpose)` returns public forms for
  embedding (Terraform's `ascii_armor` and `key_id` in the download document, RPM's key document,
  Alpine's key name). It never returns private material, it refuses outside a write transaction,
  pointer transition or rotation (AC6), and it is a value the runtime constructs, so a generator
  cannot obtain one any other way.

Format knowledge that a spec places "in the service" (conda's `_apply_instructions` patch
semantics, CRAN's `latestOnly`, Vagrant's provider ordering, LuaRocks' data-only serializer,
opam's byte-range rewrite, Julia's tree hash) lives in that format's generator package. The
architecture tests then say what each format spec asked for in its own words: the handler
package "never builds index bytes" (`opam.md` AC4, `luarocks.md` AC4) because only the generator
package does and only the runtime calls it; the handler "never sees the private key"
(`write-triggered-services-prototype.md` AC5) because neither the handler nor the generator can
import a signing library or reach a key.

**What this feeds the re-open.** `format-handler-interface.md`'s scheduled re-open takes the
prototype's finding as an input (its AC8). This spec's answer to question 1 is "no new pinned
method: an optional `Indexer`, discovered like `Operator`"; if the prototype finds the callback
needs request context a generator cannot be given, the contract here is revised before Phase 1,
exactly as `helm.md` and `maven.md` committed to for their own index sections.

### The write path dispatches; the handler cannot forget

Per the resolved trigger decision below, **the shared write path owns the trigger**. Every write
transaction the metadata store opens on a repository whose handler declared an `Indexer` ends,
before commit, with the runtime computing the change from the transaction's recorded delta,
asking the generator's `Affects` which keys it invalidates, calling `Generate` for them, signing
what the profile signs, storing the results as part of the same delta, and only then committing.
That holds for a handler's own wire write (a Hex publish `POST`, a LuaRocks upload, a Chef
share), for a management operation (`Submit` opens the transaction and calls `Apply`, then the
runtime runs), for the harness seed path (a `state` entry is a completed logical write through
the same store, so seeded state comes out generated and signed with no seed-side code, AC21),
for a retention pass (`julia.md` item 4: "writes made by the shared retention pass, which
removes versions like any deletion"), and for replication's freeze (a publish through the target
repository's hosted ingest, `replication.md`'s resolved freeze decision, so the frozen mirror's
`Release` is signed by that repository's key, as that spec accepts).

The alternative, a handler calling `Deps.Index.Regenerate` at the right moment, was rejected
because a forgotten call is a snapshot whose index disagrees with its content set, which no
client-level oracle detects until a client resolves the missing package; the constitution asks
for a mechanical enforcer per boundary, and "the write path runs it" is the enforcer. It also
answers the prototype's question 2 in the direction that makes question 3 hold by construction:
one write, one transaction, one snapshot (AC1, `data-model.md`'s one-write-one-snapshot rule).

The one-snapshot rule shapes what is and is not coalesced. **Two concurrent publishes are two
snapshots**, each with a consistent document set that lists what its snapshot holds; the service
never merges two publishes into one regeneration, because a snapshot listing a package it does
not contain is exactly the disagreement the rule forbids. Coalescing applies only where no
snapshot is involved: the virtual merge, envelope re-signing on a cadence, and the proxied
path's generation from upstream records.

### Contention: serialise per document, then retry

`data-model.md` makes the optimistic revision-token retry mandatory and warns that "a hot
document under contention livelocks without it". Repository-wide generated documents are the
hottest documents in the registry (`maven.md` captured a lost update between two concurrent
deploys; `rpm.md`, `alpine.md`, `arch.md` and `hex.md` each require that "under contention, both
land"). Per the resolved contention decision below, the runtime takes a **per-document
transaction lock** (a PostgreSQL advisory lock keyed by repository and document key, held for the
transaction) before it regenerates, so concurrent writes that invalidate the same document queue
rather than retry against each other, and the revision-token retry remains for the case the lock
does not cover: a write whose `Affects` set is decided by records another transaction is
changing. The wait is bounded by a configured budget and a timeout is an error the write returns,
never a silent skip; the benchmark in AC28 holds the budget (N concurrent publishes into one
tree complete within it with a bounded retry count).

### Storage: bodies in the snapshot, signatures as records, envelopes on the pointer

Three kinds of stored thing, each placed against `data-model.md`'s model and
`storage-and-gc.md`'s root set, none of them a new mark root, and the two records this spec
needs from the shared model specified precisely and reported as consequences rather than added
here.

**Generated bodies are metadata documents in snapshot content.** A generator's output for a
key at level `repository`, `package` or `version` is stored as that level's opaque document (or
a named member of it), inline below the size threshold and as a CAS blob above it, protected by
the fourth mark root (`storage-and-gc.md` AC16), and restored by a repoint with everything else
at its level (`data-model.md` AC13). A document that consists of several blobs (Hackage's index
segments, each a gzip member; CPAN's generated-body manifest) declares its blob digests in the
document, and the fourth root marks through the declared list: that extension of the root's
reach is `hackage.md`'s and `cpan.md`'s request of `data-model.md` and `storage-and-gc.md`,
restated here as a consequence (AC5 asserts the survival). Retention of every file a retained
snapshot's document names (`rpm.md` item 5, `alpine.md` item 6, `arch.md` item 7) needs nothing
of this service: the files are snapshot content and the snapshot is retained, so a route that
resolves a checksum-named file against every retained snapshot (their handlers' rule) finds it.

**Signatures are records keyed by body digest and key, never snapshot content.** Per the
resolved signature-placement decision below, generalising `cpan.md`'s design ("a signing-service
record keyed by the body's digest and the key, produced inside the write for a new body, at every
pointer transition for a body the pointer will serve with no signature under the current key,
and at a key rotation for every body any pointer serves, and never on a read"): a `Signature`
record holds (repository, body digest, key id, signing profile, signature bytes, created). A
served document is **assembled** from body and signature by the profile's assembly rule, which is
always a concatenation or a framing, never a cryptographic operation: Alpine's prepended
`.SIGN.RSA256.{keyname}.rsa.pub` tar segment before the index stream, Hex's `Signed{payload,
signature}` protobuf, RPM's `repomd.xml.asc` beside `repomd.xml`, Arch's `.db.sig` beside
`.db`, Terraform's `SHA256SUMS.sig`, Open VSX's `.sigzip`, CPAN's cleartext armour around the
body. The consequences: rotation never rewrites a snapshot (it produces new records for every
currently served body, one atomic batch, no snapshot: AC7, AC8); a rollback to a snapshot whose
bodies have no record under the current key produces the missing records inside the repoint
write (AC9), so a client never meets a signature by a retired key; the `ETag` of a served
document derives from the assembled bytes, so a re-sign changes it and a `304` costs no signing
(`hex.md` item 4's `ETag` requirement, `rpm.md` item 5). The record is not a mark root: its body
digest is kept alive by the document that declares it, and a record whose body no retained
snapshot holds is pruned with it. The `Signature` record is `data-model.md`'s to add (consequence
below); AC6 gates code on it.

This changes the wording, not the effect, of four format specs that described rotation as "one
write that re-signs every stored document" (`hex.md` item 4, `arch.md` item 6, `rpm.md` item 6,
`alpine.md` item 5): the cutover is one atomic batch of signature records and creates no
snapshot, which is what `debian.md` already says of its envelope ("No content changes and no
snapshot is created") and what `data-model.md` requires of anything that is not content. Each is
a sibling consequence.

**Pointer documents are re-rendered bodies scoped to the pointer.** Where a client's freshness
rule reads a field inside the signed bytes (apt's `Date`, TUF's `version` and `expires`), a
signature record is not enough, because the body itself must change at every pointer move. A
`PointerDocument` record holds (pointer, document key, inline bytes or CAS digest, produced-at,
the counter value it carries): Debian's `InRelease`, `Release` and `Release.gpg` for a suite,
Hackage's `snapshot.json` and `timestamp.json`. It is produced inside the write for the default
pointer, at every promotion and rollback (inside the repoint), on the expiry cadence and at a
rotation; it is never snapshot content; it is protected by the fourth root's current-document
half when CAS-backed (`storage-and-gc.md`'s consequence from `debian.md`, item 20); and a
promoted environment's pointer document is by design not byte-identical to the source's, which
qualifies `data-model.md` AC22 exactly as `debian.md` and `hackage.md` raised. The record is
`data-model.md`'s to add; AC10 gates on it.

### Freshness scoped to the pointer: the split with `data-model.md`

Seven formats arrived at the same finding from different clients (theme 1): apt ignores an older
`Release`; TUF clients fail hard on a lower version and adopt the same content at a higher one;
Conan keeps a newer cached revision; LuaRocks, CPAN and Arch revalidate with `If-Modified-Since`
and a `304` hides a rollback; curl's `--time-cond` in brew "discards any 200 whose Last-Modified
is not newer than brew's own clock at its last fetch", so the signal must be **monotonic and
forward-moving**, and "exact-match 304 is insufficient for curl-based clients". Per the resolved
freshness-split decision below, the mechanism is one and it is split by ownership:

**`data-model.md` owns the record**: a per-pointer **freshness record** on `Pointer`, carrying
(a) `moved_at`, set at every pointer transition (a write advancing the default pointer, a
promotion, a rollback, a key switch, a cadence re-sign) to the later of the transition time and
one second after the previous value, so it never moves backwards whatever the clock does
(`cpan.md`, `arch.md`); (b) a per-pointer **generation counter** incremented by one at every
transition and every re-signing, durable and never lowered by a clock step (`hackage.md` item 4);
and (c) the `PointerDocument` record above. It qualifies AC22 there: content is byte-identical
across environments, the pointer's freshness signals and pointer documents are not. Conan's
"last-repoint time" (item 22) and LuaRocks' "monotonic per-pointer change time" (item 27) are
this record; the formats cite it rather than each carrying one.

**This service owns rendering the record into each format's signal**, so no handler computes
freshness: the envelope's `Date` and TUF's `version` are written from the record by the
generator; the `Last-Modified` of every generated document a pointer serves is the record's
`moved_at` when the document's bytes changed at that transition and the previous value
otherwise, so it is forward-moving per document; a document and its signature share one
`Last-Modified` (`arch.md`: 6.0.2 revalidates the signature with the database's time); a
conditional request is answered `304` only when `If-Modified-Since` equals the current
`Last-Modified` exactly or `If-None-Match` equals the byte-derived `ETag`, otherwise the body is
sent with a `Last-Modified` later than anything the client can hold. The runtime exposes this as
`index.ServeDocument(w, r, key)`, which every handler uses to serve a generated document, and an
architecture test holds that no handler package sets `Last-Modified`, `ETag` or evaluates
`If-Modified-Since` itself (AC11). Formats whose clients fetch whole and unconditionally
(`opam.md`: strong `ETag`, `Cache-Control: no-cache`, no `Last-Modified`) declare that rule in
their profile and the helper honours it. `Cache-Control` values are the format's
(`rpm.md`, `alpine.md`: `no-cache` on the index, `immutable` on checksum-named files) and travel
in the profile.

**`proxy-cache.md` owns the cache-scoped record** for `remote` repositories, which have no
pointer: a remote's served `Last-Modified` is the cache's, never the upstream's, forward-moving,
and a remote never adopts an older upstream revision; a db and its signature are adopted as one
revision (items 30 and 32). Named here so the three owners are stated once.

### Key custody

A **key** belongs to exactly one repository (hosted or virtual), has a **purpose** the format's
profile names (`index`, `package`, `document`, or a TUF role: `root`, `snapshot`, `timestamp`,
`mirrors`), an **algorithm** the profile constrains, a **state** (`announced`, `active`,
`retired`), a **custody backend**, and public material in every form the profile serves. Per the
resolved key-scope decision below there is **no instance-wide signing key**: the blast radius of
one key across every repository, and the per-repository key names Alpine and Hex build into the
client's configuration, rule it out; the only instance-scoped purpose is the reserved `archive`
(`replication.md`), unbuilt. A key is created when a repository whose format declares a signing
profile is created, or by an explicit operation; a format with no signing profile gets none
(AC24).

**Algorithms are the clients'**, taken from the format specs' captured refusals and stated in the
profile so the service refuses a key the clients would: Debian RSA 4096 by default or Ed25519,
never below `rsa3072,ed25519,ed448`, SHA-256 or stronger; RPM RSA of at least 3072 bits,
armoured, exactly one signature packet (dnf5 refuses two); Arch RSA 4096 or Ed25519, binary,
exactly one packet; Alpine RSA 4096 with `RSA256`; Hex RSA of at least 2048 bits, SHA-512;
Terraform RSA of at least 3072 bits, binary (1.5.7 refuses Ed25519, every client refuses
armour); Hackage ed25519 only; Open VSX pure Ed25519, not Ed25519ph; CPAN RSA; npm ECDSA P-256.
A **signing profile** names the algorithm, the digest, the envelope (OpenPGP detached binary,
OpenPGP detached armoured, OpenPGP cleartext with `CPAN::Checksums`' framing, PKCS #1 v1.5 raw,
RSA-SHA512 raw, Ed25519 raw, TUF canonical JSON, npm's `name@version:integrity` ECDSA), the
packet constraints, and the assembly. Envelope codecs live in `internal/signing/openpgp`,
`internal/signing/tuf`, `internal/signing/raw` and `internal/signing/jws`, and no package outside
`internal/signing/**` imports a signature library (AC2), mirroring `artifact-verification.md`'s
allowlist for its verifier.

**Three custody backends, one seam.** Every backend yields a `crypto.Signer` (and, for
Ed25519, the standard library's `ed25519.PrivateKey`, which satisfies it), and every envelope
codec signs through that interface: OpenPGP through `packet.NewSignerPrivateKey`, TUF and raw
through `Sign` directly. So there is one signing code path whatever holds the key, and the tests
that prove a codec's bytes against a real client prove them for every backend.

| Backend | What it is | Private material | Algorithm ceiling | Grounding |
|---|---|---|---|---|
| `file` (default) | Software keys generated by the service, stored in the shared database **encrypted at rest** under the instance master key the upstream-credential store already uses (`proxy-cache.md` AC6's "stored encrypted"), never on a filesystem path | Decrypted in process memory for the duration of a signing call | Any algorithm the standard library and go-crypto implement | Pulp and reprepro keep keys in a worker's gpg keyring; Nexus stores a pasted key; this backend is that class made encrypted, auditable and exportable never |
| `kms` | A key resolved by URI through `sigstore/sigstore`'s `kms.Get`: `awskms://`, `gcpkms://`, `azurekms://`, `hashivault://` | Never leaves the provider; the service holds a reference and a credential | What the provider offers for that key; checked at creation by signing a probe and verifying it | Sigstore's seam; Artifactory's Vault option |
| `pkcs11` | A key on a PKCS #11 token through `crypto11` (`Path`, `TokenLabel`, PIN from the environment or a file, never a flag) | Never leaves the token | RSA and ECDSA; **no Ed25519**, so a Hackage role or an Ed25519 Arch or Open VSX key on this backend is refused at creation with a message naming the ceiling | `crypto11`'s documented algorithm set |
| `external` | Public material only; signatures are produced off the server and submitted | The service never has it | Whatever the operator signs with; the submitted document is checked against the current one before it is served | TUF 6.1 offline root; `hackage.md` item 8 ("accepts a `root.json` the operator signed offline, verifies it against the current root, and serves it") |

A repository's keys may mix backends by purpose: a Hackage repository with an `external` root and
`file` snapshot, timestamp and mirrors keys is TUF's intended shape (2.1.4). A backend that cannot
produce the profile's algorithm is refused at key creation, not discovered at the first publish
(AC13). Creating a key on any backend ends with a **probe**: the service signs a fixed message
and verifies it through `artifact-verification.md`'s verifier with the public material it will
publish, so a miswired KMS key or a token holding a different key than its label says fails at
creation (AC13). **Import** of an existing key (a migration from aptly, reprepro, Nexus, or a
manually run `gpg`) is a `file`-backend creation carrying the private key once, over TLS, in a
request body that is never logged and is refused on a plaintext listener (`auth.md` AC27's
posture); a KMS or PKCS #11 key is imported by reference only.

**Private material never leaves the backend.** No API response, list, export, replication
message, log line, metric label, error body or problem detail carries it; the `file` backend has
no export operation at all, so the only way to move a `file` key is to have created it as a KMS
or PKCS #11 key in the first place, which the operator documentation says before the first
repository is created. AC14 scans every response and the emitted log of every key operation,
in the shape `credential-management.md`'s display-once test uses, and a database dump test proves
the at-rest encryption.

**Key operations arrive as `configure` operations.** `management-api.md` owns the wire shape
(the `configure` kind, admin role, RFC 9457 refusals, `Operation` record and audit line) and says
this spec owns "key generation, rotation with overlap and the document a rotation produces". The
operations are: create (a key in `announced` state), activate (the cutover under the format's
rotation profile), retire, import, and, for `external`, submit a signed document. They mount under
`/api/v1/repositories/{name}/signing-keys` inside the `api` reservation, are submitted through
`Submit` as `configure` operations, and their `Apply` is this service's, not the handler's; the
handler's generator is then called within the same transaction to produce whatever the rotation
profile requires (the RPM key document, the dual-signed Alpine index). No repository-scoped
token can perform any of them (`auth.md` AC30), and every one leaves an audit line and an
`Operation` (AC15). The management surface lists a repository's keys with purpose, algorithm,
state, backend kind (never the URI's secret parts), created-at and the public forms with
fingerprints (`debian.md` item 5, `rpm.md` item 3, `alpine.md` item 3, `arch.md` item 4,
`hex.md` item 2, `hackage.md` item 9, `cpan.md` item 1).

### Rotation profiles

Every format spec captured what its clients do when a key changes, and they do seven different
things. The service therefore has seven **rotation profiles**, each declared by the format's
generator and each an **atomic cutover**: no reader observes a document under the new key while
the key document or the signature set still lacks it (AC8). Every profile is expressed with the
three key states and the signature-record model; none creates a snapshot.

| Profile | Cutover | Formats, with the captured client behaviour that requires it |
|---|---|---|
| `dual-signature` | Activate produces, for every currently served body, a second signature record under the new key, and every served document carries both signatures for an operator-set window; ending the window drops the old records | Debian ("clients holding either key accept", captured on four generations), Alpine ("a client holding either key file verifies it, captured in both orders") |
| `key-document` | Activate re-signs every currently served body under the new key alone and lists old and new keys in the published key document for a window | RPM (dnf5 "refuses two" signature packets, so dual signatures are impossible; `--gpg-auto-import-keys` clients follow the key document) |
| `announce-switch-retire` | Announce adds the new key to the key document and signs nothing; switch re-signs every served body and package signature under the new key alone and advances every `Last-Modified`; retire removes the old key from the key document | Arch ("every signature packet must verify with a trusted key", so a dual signature fails; `pacman-key --lsign-key` is manual) |
| `atomic-resign` | Activate re-signs every served body under the new key in one batch and the old key is retired in the same transaction; client-visible by design | Hex ("a Hex client pins exactly one key per repository and cannot hold two") |
| `additive` | Activate signs only what is produced from then on; every existing signature keeps its key, and the document that lists keys lists every key that signed anything still served; retiring a key outright re-signs everything it signed | Terraform ("all four clients accept a signature by any listed key", captured with two keys) |
| `root-chain` | A new `root.json` version whose key map keeps the old keys and which carries a threshold of signatures from both sets, kept cross-signed for an operator-set window; online roles rotate by a new root signed by the current root threshold | Hackage (a root "signed by the new keys alone is refused", "Unknown key" when an old signer is unlisted; captured on both cabal lines) |
| `by-digest` | Activate signs new documents with the new key; every public key stays retrievable by its digest for as long as a retained snapshot references a signature it made | Open VSX ("every public key retrievable by its digest") |

CPAN uses `dual-signature`'s shape without dual signatures: the new public key is exposed before
it signs, for a window, then signature records are produced under the new key (`cpan.md` item 5;
its clients hold a keyring, not one key). The window lengths are per repository configuration
with a default in this spec's configuration table. What rotation is **visible** to unattended
clients (RPM without `--gpg-auto-import-keys`, Arch without a locally signed key, Hex always,
Alpine clients that did not install the new key file) is each format's finding and is stated in
that format's operator documentation; the service's obligation is that the cutover is atomic
and that a client which did what the documentation says notices nothing.

**Re-signing on a cadence** (`debian.md` item 3: `Valid-Until` re-signed at half the window;
`hackage.md` item 5: `timestamp.json` and `snapshot.json` at half their window, `root.json` and
`mirrors.json` at half theirs, "for every pointer including idle environments") is a scheduled
production of pointer documents under the current keys, creating no snapshot, durable across a
restart (the schedule derives from the stored documents' expiry, not from a timer in memory), and
for an `external` root it is an operator alert emitted well before expiry, at a configured lead
(AC22).

### Signing stored blobs, and the memory bound

Three consumers sign a blob rather than a generated body: Arch signs every hosted package
inside the publish write ("one detached signature per published package file, stored as a `File`
of its version", `arch.md` item 3), Open VSX signs the package into a `.sigzip` in the same
snapshot (`openvsx.md` item 3), and Terraform signs a `SHA256SUMS` the generator produced
(`terraform.md` item 3). `SignBlob(profile, digest)` streams the committed CAS blob into the
signer. For digest-then-sign schemes (OpenPGP, RSA-SHA512, ECDSA) that is a single streaming pass
with constant memory. Pure Ed25519 signs the message, not a digest, and the standard library
takes the whole message: `openvsx.md` records the reference "needed a 2 GB heap to sign a 300 MB
package" and requires the service to sign "without holding more than one copy of it". The bound
this spec sets is **one copy**: the blob is read once into a buffer sized from the CAS's known
length, signed, and released; a package above the configured maximum is refused at publish, and
the benchmark holds peak allocation to blob size plus a constant (AC18, which is `openvsx.md`
AC28's requirement stated from this side).

### The produce/verify boundary

`artifact-verification.md` "never produces a signature" and this service never decides whether
one is valid for a client. Three requests in the format specs fall on the verify side and are
routed there rather than built here (the resolved boundary decision below): `debian.md` item 6
("a verification entry that checks an upstream `InRelease` ... used by the proxied path and by
the virtual merge before any upstream index is trusted") is that spec's `openpgp` scheme;
`hex.md` item 5 ("a verification entry that checks a `Signed` payload against a supplied public
key PEM") is its `raw` scheme; `hackage.md`'s upstream TUF chain is its `tuf` scheme, which that
format spec already assigns there. A virtual repository whose member is a `remote` merges only
documents whose verdict is verified, which is a read of the verdict store through `Deps`, not a
verification here.

One verifying call does happen inside this service, and it is not a boundary crossing: **every
signature the service produces is checked before commit** through `artifact-verification.md`'s
`Verifier` with the public material the service publishes, and a failure fails the write with
nothing committed (AC17). It uses public material only, it is the probe that catches a miswired
backend (a KMS key whose public half the service recorded wrongly signs every index into a
repository no client can use), and it costs one verification per signature on the write path,
which the benchmark budgets.

What flows the other way: this service may produce **attachments** through the verified `attach`
path that spec defines ("it stays available to `signing-service.md` as a producer of attachments
through the same verified `attach` path"). No format requires it in v1 (the resolved Galaxy
decision below); the capability is named so that adopting it is a generator and a profile.

### Virtual merges: deferred, coalesced, signed with the virtual's key

A virtual repository's document set is derived state: it creates no snapshot (`debian.md`'s
write boundaries) and is re-run "when a member's document set changes" (`rpm.md` item 7,
`alpine.md` item 7, `arch.md` item 8, `conda.md` item 5, `cran.md` item 5, `luarocks.md` item 7,
`chef.md` item 5, `vagrant.md` item 5), "run as deferred work, never on a request's path"
(`debian.md` item 7, `hackage.md` item 10, `cpan.md` item 6). The service's obligations:

- **Trigger and coalescing.** A completed write on a member enqueues a merge for every virtual
  that lists it; merges for one virtual within a coalescing window run once; the window and a
  staleness bound (a member write is visible in the virtual within it) are configuration. This
  is the one place the service coalesces, because no snapshot is at stake.
- **Never a gap.** The previous merged document set serves until the new one commits atomically;
  a merge that fails leaves the previous set and an alert, never an empty index.
- **Signed with the virtual repository's own key** under its format's profile, so a virtual is a
  repository in every client-visible sense; `hex.md` declares no merge because "the repository
  name is inside the signed payload", and `data-model.md`'s per-format virtual capability
  (consequences item 12) is what the profile's absent `Merge` expresses.
- **Storage** as the virtual's current documents, CAS-backed above the threshold, protected by the
  fourth root's current-document half (the `storage-and-gc.md` consequence from item 20).
- **Execution** belongs to `async-operations.md`; this spec fixes the contract (enqueue on member
  commit, coalesce, atomic swap, staleness bound) and AC19 asserts it against a fixture runner
  until that spec's runtime exists.

### The proxied path

A `remote` repository's documents are the upstream's, served verbatim with the upstream's
signatures (Scope). Where a format regenerates on the proxied path (`cran.md` item 6,
`luarocks.md` item 8, `chef.md` item 6, `opam.md` item 7: "the same generation on the proxied
path from records parsed out of the upstream"), the upstream adapter hands the parsed records to
`FromUpstream` and the result is stored as the remote's current document, **unsigned**, with the
cache-scoped freshness `proxy-cache.md` owns. The service creates no key for a `remote`, and a
test asserts that no `Signature` record ever names a `remote` repository (AC20).

### Replication: pointer documents travel, followers sign nothing

`replication.md` transfers snapshots and the pointer set; with signatures and pointer documents
outside snapshot content, a follower that only received snapshots would have to sign envelopes
it has no key for. Per the resolved follower decision below, `Signature` and `PointerDocument`
records **travel with the pointer set** as opaque records on the replication read surface, the
follower serves them verbatim (its `Last-Modified` is the leader's freshness record, replicated
with the pointer), and a follower **signs nothing while a link is active**. At takeover the
follower must sign: the takeover is refused with a problem naming the missing keys unless every
active key of the repository is resolvable on the follower, which means a `kms` or `pkcs11` key
reachable from both instances, or a `file` key created on the follower and announced under the
repository's rotation profile before the takeover, which the operator guide describes as the
replicated-repository key recipe. AC23 asserts both halves. This is a consequence for
`replication.md` (its read surface and its takeover preconditions) and is why a `file` key is
the wrong choice for a replicated repository, which the documentation says.

### Configuration and CLI stance

Following the vendored `cobra-viper` skill, `internal/signing` and `internal/index` each receive
a typed `Config` with a default for every key, import neither Viper nor Cobra, and every key is
settable by flag, environment variable and configuration file in that skill's precedence order
(AC26). There is no CLI in v1 beyond the server binary, matching `management-api.md`'s resolved
API-first decision; key operations are API calls. The deployment spec (owed) documents the keys;
they are named here because they are this service's policy:

| Key | Default | Meaning |
|---|---|---|
| `signing.default_backend` | `file` | Backend for keys created with a repository |
| `signing.master_key` | none; required when any `file` key exists | Reference to the instance master key that encrypts `file` keys at rest (the upstream-credential store's), from an environment variable or a file, never a flag value |
| `signing.kms.allowed_schemes` | `awskms, gcpkms, azurekms, hashivault` | KMS URI schemes a key may reference |
| `signing.pkcs11.module` | none | Path to the PKCS #11 library; enables the backend |
| `signing.pkcs11.token_label` | none | The token's label |
| `signing.pkcs11.pin_file` | none | File holding the user PIN; the PIN is never a flag or a logged value |
| `signing.rotation_window` | `720h` (30 days) | Default overlap window for `dual-signature`, `key-document` and `root-chain` |
| `signing.resign_at_fraction` | `0.5` | Fraction of a document's validity window at which it is re-signed on the cadence |
| `signing.external_expiry_lead` | `336h` (14 days) | How long before an `external` key's document expires the operator alert fires |
| `signing.max_blob_sign_size` | `1 GiB` | Largest blob `SignBlob` accepts under a whole-message scheme |
| `index.lock_wait` | `30s` | Longest a write waits for a per-document lock before failing |
| `index.max_retries` | `8` | Revision-token retries before a write fails |
| `index.virtual_merge_window` | `5s` | Coalescing window for merges of one virtual |
| `index.virtual_staleness_bound` | `60s` | Longest a member write may take to become visible in a virtual |

The inline size threshold is `data-model.md`'s knob, not this spec's.

### Package shape

`internal/index`: the runtime (`Runtime` with `Regenerate`, invoked by the metadata store's
commit hook; `Transition`, invoked by the pointer store at a repoint; `Merge`, the deferred
entry; `ServeDocument`), the value types a generator uses (`Generator`, `Profile`, `DocumentKey`,
`Change`, `Input`, `Output`), and the freshness helper. `internal/signing`: `Service` with `Sign`,
`SignBlob`, `PublicKeys`, and the key operations; backends in `internal/signing/filekey`,
`internal/signing/kms`, `internal/signing/pkcs11` and `internal/signing/external`, each yielding
a `crypto.Signer`; envelope codecs in `internal/signing/openpgp`, `internal/signing/tuf`,
`internal/signing/raw` and `internal/signing/jws`; HTTP handlers for the key routes registered
under the `api` mount. The consumer interfaces (`Indexer` and the `Signing` handle's interface)
are declared in `internal/format` beside `Deps`, in the go skill's sense: the consumer owns the
interface, the concrete types satisfy it. Each format's generator is `internal/format/<name>/index`.
Neither package starts a goroutine that outlives a request except the cadence scheduler, whose
shutdown is governed by the server's context and tested under `testing/synctest`.

### Mechanical enforcers

Per the constitution, every boundary this spec introduces names the test that holds it:

| Boundary | Enforcer |
|---|---|
| No handler package (`internal/format/<name>`) and no generator package (`internal/format/<name>/index`) imports `internal/signing/**`, a signature library, or `crypto/*` signing primitives; only `internal/signing/**` imports a signature library | `internal/format/signing_boundary_test.go` (import graph, module-wide), the shape `artifact-verification.md` AC4 and `auth.md` AC9 use |
| A generator package imports nothing of the registry but `internal/index`'s value types: no `Deps`, no `net/http`, no store | `internal/index/generator_purity_test.go` (import graph over every `internal/format/*/index`) |
| Generation runs only inside the runtime: no package outside `internal/index` calls a `Generator`'s `Generate`, `Merge` or `FromUpstream` | `internal/index/arch_test.go` (call-graph scan) |
| Every write transaction on a repository with an `Indexer` regenerates before commit; a handler cannot skip it | `internal/index/dispatch_test.go` (fixture handler; a write with the hook disabled fails to commit) |
| Signing refuses outside a write transaction, pointer transition or rotation; no read path can sign | `internal/signing/context_test.go` plus `internal/index/read_path_test.go` (serving a document with the signer instrumented; zero calls) |
| No handler sets `Last-Modified` or `ETag` or reads `If-Modified-Since` itself | `internal/format/freshness_boundary_test.go` (string-literal and header-constant scan over handler packages) |
| Private material appears in no response, log line, metric, error or export | `internal/signing/never_display_test.go`, the shape `credential-management.md`'s display-once test uses |
| Every produced signature verifies under `internal/verify` before commit | `internal/signing/selfcheck_test.go` (fault-injected backend returning a bad signature) |
| Key routes are under `api`, mapped through the central authorizer, admin only, and in the OpenAPI document | `internal/signing/arch_test.go` (the shape `management-api.md` AC2 uses); `management-api.md` AC25's `internal/manage/openapi/openapi_test.go` covers the routes |
| One write, one snapshot, generated documents included; a refused write leaves no document | `internal/index/accounting_test.go` (property test with fault injection) |

## Acceptance Criteria

- [ ] AC1: A completed logical write on a repository whose handler declares an `Indexer`
      produces exactly one snapshot that holds both the change and every document
      `Affects` names regenerated, with no code in the handler package requesting
      regeneration, on a wire write, a management operation, a seed-path write and a
      retention pass alike; a write refused or failed at any point leaves no snapshot and
      no generated document, counted across the write.
- [ ] AC2: No package under `internal/format/**` imports `internal/signing/**`, a signature
      library or a `crypto/*` signing primitive, and no package outside `internal/signing/**`
      imports a signature library; a generator package imports nothing of the registry beyond
      `internal/index`'s value types; verified by architecture tests over the whole module.
- [ ] AC3: N concurrent publishes into one repository each produce their own snapshot whose
      document set lists every package present in that snapshot and nothing else, with no
      document whose checksums disagree with a document beside it, for N up to the benchmark
      count, and a real client (`apt-get update` and `install` on the prototype's Debian
      vehicle) resolves every package afterwards.
- [ ] AC4: A write that invalidates one document key of many regenerates only that key: every
      other key's bytes, digest and `ETag` are unchanged after the write, and the write's cost
      grows with the touched cell, not the repository, under a benchmark budget for a
      repository of the largest consumer's scale named in its spec.
- [ ] AC5: A generated document above the inline threshold, and a document declaring several
      blob digests, is stored in the CAS, survives a GC sweep while any current document row or
      retained snapshot references it, is collected once none does, and streams to a client
      without being buffered whole.
- [ ] AC6: A signature is a `Signature` record keyed by body digest and key, absent from every
      snapshot's content set, and a served signed document is assembled from body and record
      without a signing operation: the signer, instrumented, records zero calls across the
      whole read surface of every signed consumer's fixture, and a call outside a write
      transaction, pointer transition or rotation is refused.
- [ ] AC7: Each of the seven rotation profiles (`dual-signature`, `key-document`,
      `announce-switch-retire`, `atomic-resign`, `additive`, `root-chain`, `by-digest`) produces
      the state its table row states: dual signatures for the window then one; a key document listing both keys with bodies under
      the new; announce without signing, switch under the new key alone with advanced
      `Last-Modified`, retire; a single-batch re-sign with the old key retired in the same
      transaction; new documents only, old signatures kept, every listed key served; a new root
      version cross-signed by both thresholds for the window; every key retrievable by digest
      while a retained snapshot references its signature; each proven by the reference verifier
      of its ecosystem over the served bytes.
- [ ] AC8: A rotation is atomic: an interleaved reader never observes a document signed by a key
      the concurrently served key document or signature set does not carry, under a property
      test that interleaves reads with the cutover; a rotation creates no snapshot.
- [ ] AC9: Repointing to a snapshot whose bodies carry no signature under the current key
      produces the missing signature records inside the repoint write, so the served documents
      verify under the current key immediately after the repoint and a real client resolves
      them.
- [ ] AC10: A pointer document is re-rendered at every pointer transition, on the cadence and
      at a rotation, with its `Date` or version taken from the pointer's freshness record so it
      never decreases under an injected clock stepped backwards, is stored outside snapshot
      content, and a real client that updated at snapshot N adopts snapshot N-1 after a
      rollback (apt through `Date`, cabal and Stack through the TUF version).
- [ ] AC11: Every generated document is served through `ServeDocument`: its `Last-Modified` is the
      serving pointer's forward-moving record, a document and its signature carry one
      `Last-Modified`, a conditional request is answered `304` only on an exact
      `If-Modified-Since` match or a matching `ETag`, a rollback moves `Last-Modified` forward,
      and no handler package sets these headers itself; proven with a curl `--time-cond` client
      that sees a rollback.
- [ ] AC12: Every public form a profile declares is byte-checked against its ecosystem's tool:
      an armoured block `gpg --import` accepts with the expected fingerprint, one or several
      concatenated; a 16-hex key id equal to `gpg`'s; an SPKI PEM whose `ssh-keygen -lf`
      fingerprint equals the served `SHA256:` value; an apk key served under exactly its key
      name; TUF key ids equal to `hackage-repo-tool`'s; an npm keys document `npm audit
      signatures` accepts; and the management listing shows each key's fingerprint.
- [ ] AC13: A key is created on the `file`, `kms` and `pkcs11` backends (SoftHSM2 through
      `crypto11` in CI, a fixture KMS provider) and on `external` (public only), every backend
      reached through one `crypto.Signer` seam, each creation ending with a probe signature
      verified through `internal/verify`; a backend that cannot produce the profile's algorithm
      (Ed25519 on `pkcs11`) is refused at creation with a message naming the ceiling; a miswired
      key fails the probe and creates nothing; the same envelope test vectors pass on every
      backend.
- [ ] AC14: No private key material appears in any API response, listing, export, replication
      message, log line, metric, error body or problem detail across every key operation and
      every failure, `file` keys are unreadable in a database dump without the master key, and
      the `file` backend offers no export operation.
- [ ] AC15: Create (a key in `announced` state), activate, retire, import and submit-external
      are `configure` operations
      submitted through `Submit`, refused `unauthorized` for every repository-scoped token
      including an admin-owned one, mounted under `/api/v1/repositories/{name}/signing-keys`,
      present in the OpenAPI document, and each leaves exactly one audit line and one
      `Operation`.
- [ ] AC16: An `external` key's document (a `root.json` signed offline) is accepted only when it
      verifies against the current root under the format's rule, is refused otherwise with a
      problem naming the failing check, and is served afterwards; the service never holds the
      key.
- [ ] AC17: Every signature the service produces is verified through `internal/verify` with the
      published public material before the write commits; a backend fault-injected to return a
      wrong signature fails the write with nothing committed and an operator alert.
- [ ] AC18: `SignBlob(profile, digest)` over a stored blob of the configured maximum size under
      pure Ed25519 holds peak
      allocation to the blob's size plus a constant, under digest-then-sign schemes to a
      constant, both as benchmark gates; a blob above the maximum is refused at publish.
- [ ] AC19: A completed write on a member of a virtual repository makes the member's change
      visible in the virtual's documents within the staleness bound, merges for one virtual
      inside the coalescing window run once, the previous merged set serves without a gap until
      the new one commits, a failed merge leaves the previous set and alerts, the merged set is
      signed with the virtual repository's own key, and no merge runs on a request's path.
- [ ] AC20: A `remote` repository's regenerated documents (CRAN, LuaRocks, Chef, opam from
      upstream records) are produced through `FromUpstream` by the same generator as the hosted
      path and stored
      unsigned; no `Signature` record and no key ever names a `remote` repository.
- [ ] AC21: A repository seeded through the harness's `state` entries serves generated and signed
      documents byte-identical to those a publish of the same content produces, and the case can
      read the repository's public keys from the server before its client runs.
- [ ] AC22: A document with a validity window is re-signed at the configured fraction of its
      window for every pointer including idle environment pointers, creating no snapshot, on a
      schedule that survives a restart; an `external` key's document nearing expiry raises an
      operator alert at the configured lead.
- [ ] AC23: `Signature` and `PointerDocument` records travel with the pointer set to a
      follower, which serves them verbatim under the leader's freshness record and produces no
      signature while linked; a takeover is refused with a problem naming the unresolvable keys
      unless every active key of the repository resolves on the follower, and succeeds when
      they do.
- [ ] AC24: A format whose profile declares no signing profile receives generation with no key
      created for its repositories and no signature record, and a format whose profile declares
      no document keys receives signing with no generated document.
- [ ] AC25: Every generator is deterministic: the same records, freshness record and key set
      produce identical bytes across two runs and across a restart, proven by the runtime's
      determinism harness over every registered generator's golden fixtures.
- [ ] AC26: Every configuration key in the table has a default, is settable by flag, environment
      variable and file in the documented precedence, and `internal/signing` and
      `internal/index` import neither Viper nor Cobra; the PIN and master key are never
      accepted as flag values.
- [ ] AC27: The runtime and the pointer store hold the split: the pointer's `moved_at` and
      generation counter are written only by `data-model.md`'s pointer transition, and every
      freshness value this service renders (`Date`, TUF version, `Last-Modified`) is read from
      that record, never computed from a clock in this service, proven by an injected clock
      whose value never appears in a served header or document.
- [ ] AC28: N concurrent publishes into one tree complete within the configured lock wait with a
      bounded retry count and no livelock, and a lock timeout fails the write with a problem
      rather than committing without regeneration, as benchmark and property gates.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | integration + property | `internal/index/dispatch_test.go` (fixture handler: wire write, `Submit`, seed subcommand, retention pass; hook-disabled write refused); `internal/index/accounting_test.go` (snapshot counting under fault injection) |
| AC2 | architecture test | `internal/format/signing_boundary_test.go`; `internal/index/generator_purity_test.go`; `internal/signing/library_allowlist_test.go` |
| AC3 | property + conformance | `internal/index/concurrent_publish_test.go`; `conformance/debian/concurrent_publish_test.go` (real apt after N concurrent publishes, the prototype's vehicle) |
| AC4 | integration + benchmark | `internal/index/incremental_test.go`; `internal/index/bench_incremental_test.go` (touch-one-of-N at the largest consumer's scale) |
| AC5 | integration + property | `internal/storage/metadata_blob_gc_test.go` (extended: declared blob lists); `internal/index/stream_serve_test.go` |
| AC6 | integration + architecture | `internal/index/read_path_test.go` (instrumented signer, zero calls over every signed fixture's read surface); `internal/signing/context_test.go` |
| AC7 | integration | `internal/signing/rotation_profiles_test.go`, table-driven over the seven profiles with each ecosystem's reference verifier (`gpg`, `apk verify` via the fixture image, `hex_core`, `terraform providers mirror`, `hackage-security` vectors, `ovsx verify`) on the served bytes |
| AC8 | property | `internal/signing/rotation_atomic_test.go` (interleaved reads across the cutover; snapshot count unchanged) |
| AC9 | integration + conformance | `internal/index/repoint_resign_test.go`; `conformance/debian/rollback_after_rotation_test.go` |
| AC10 | integration + conformance | `internal/index/pointer_document_test.go` (injected clock stepped backwards); `conformance/debian/rollback_test.go` and `conformance/hackage/rollback_test.go` (real clients adopt N-1) |
| AC11 | integration + architecture + conformance | `internal/index/freshness_test.go`; `internal/format/freshness_boundary_test.go`; `conformance/core/timecond_rollback_test.go` (curl `--time-cond` sees a rollback) |
| AC12 | integration | `internal/signing/public_forms_test.go` (`gpg --import`, `ssh-keygen -lf`, `hackage-repo-tool` key ids in fixture containers; `npm audit signatures` against the keys document) |
| AC13 | integration | `internal/signing/backends_test.go` (`file`; `kms` fixture provider registered through `AddProvider`; `pkcs11` against SoftHSM2 in CI; `external`); shared envelope vectors run per backend |
| AC14 | integration | `internal/signing/never_display_test.go`; `internal/signing/at_rest_test.go` (database dump scan) |
| AC15 | integration | `internal/signing/operations_test.go` (through `Submit`; refusals per `auth.md` AC30; audit and `Operation` counts); `internal/manage/openapi/openapi_test.go` (routes present) |
| AC16 | integration | `internal/signing/external_test.go` (offline-signed `root.json` fixtures: valid, under-threshold, unlisted signer) |
| AC17 | integration + fault injection | `internal/signing/selfcheck_test.go` |
| AC18 | benchmark | `internal/signing/bench_signblob_test.go` (peak allocation under `testing.AllocsPerRun` and a memory ceiling; refusal above maximum) |
| AC19 | integration | `internal/index/virtual_merge_test.go` (fixture runner: staleness bound, coalescing count, atomic swap, failure keeps previous set, virtual key) |
| AC20 | integration | `internal/index/proxied_generation_test.go` (same generator, unsigned; no `Signature` row, no key for a `remote`) |
| AC21 | integration + conformance | `internal/index/seed_equivalence_test.go` (seeded versus published bytes); `conformance/core/seed_signed_state_test.go` (case reads public keys, real client installs) |
| AC22 | integration | `internal/signing/cadence_test.go` under `testing/synctest` (injected clock; restart mid-schedule; idle pointers; `external` alert lead) |
| AC23 | integration | `internal/replication/signing_records_test.go` (records in the read surface; follower signs nothing); `internal/replication/takeover_keys_test.go` (refused without resolvable keys, succeeds with a shared `kms` fixture key) |
| AC24 | integration | `internal/index/unsigned_consumer_test.go` (Vagrant-shaped and Terraform-shaped fixture profiles) |
| AC25 | integration | `internal/index/determinism_test.go` (every registered generator's golden fixtures, two runs and a restart) |
| AC26 | unit | `internal/signing/config_test.go`; `internal/index/config_test.go` (defaults, precedence, no Viper import, PIN and master key refused as flags) |
| AC27 | integration | `internal/index/freshness_source_test.go` (injected service clock never appears in a header or document; only the pointer record's values do) |
| AC28 | property + benchmark | `internal/index/contention_test.go`; `internal/index/bench_contention_test.go` |

## Implementation Phases

### Phase 1: Runtime, file custody and the unsigned consumer (charter step 7, first item)
- Entry: `write-triggered-services-prototype.md` AC7's finding recorded and the re-open complete
  (`format-handler-interface.md` AC8); `data-model.md` carries the `Signature`,
  `PointerDocument` and pointer freshness records (consequences below); `management-api.md`
  Phase 1's `Submit` and `configure` exist.
- `internal/index`: `Indexer` discovery, the write-path hook, `Affects`-scoped regeneration,
  per-document locking and retry, inline and CAS-backed storage with declared blob lists,
  `ServeDocument` with the pointer freshness rule, the determinism harness (AC1, AC2, AC3
  property half, AC4, AC5, AC11, AC25, AC26 index half, AC27, AC28).
- `internal/signing`: the `file` backend under the master key, OpenPGP detached and armoured
  codecs, the `Signing` handle, signature records and assembly, the self-check, the key
  operations through `Submit`, public forms for OpenPGP (AC6, AC12 OpenPGP forms, AC13 `file`,
  AC14, AC15, AC17, AC26 signing half).
- The Maven generator consumes the index half before any signed consumer, per the charter's
  ordering inside step 7; the prototype's Debian generator is rebuilt as
  `internal/format/debian/index` on the production runtime (AC3 conformance half, AC24 for a
  Maven-shaped profile).

### Phase 2: Pointer documents, cadence and the seven rotation profiles
- Pointer documents and their transition and cadence production (AC10, AC22); repoint re-signing
  (AC9); the seven rotation profiles with atomic cutover (AC7, AC8); the OpenPGP cleartext
  (`CPAN::Checksums` framing), PKCS #1 v1.5 raw, RSA-SHA512 raw and Ed25519 raw codecs and their
  public forms (AC12 remainder); `SignBlob` with the memory bound (AC18).
- Gate for Debian's and RPM's Phase 1 (charter AC12), then Alpine, Arch, Hex, CPAN, Terraform and
  Open VSX as their tiers allow.

### Phase 3: KMS, PKCS #11 and operator-held keys
- The `kms` backend through `kms.Get`, the `pkcs11` backend through `crypto11` against SoftHSM2 in
  CI, the `external` backend and its submit operation, the algorithm-ceiling refusal and the
  creation probe (AC13 remainder, AC16); the TUF canonical-JSON codec and the `root-chain`
  profile complete for Hackage.

### Phase 4: Virtual merges and the proxied path
- The merge contract on a fixture runner, then on `async-operations.md`'s runtime when it lands
  (AC19); `FromUpstream` for the proxied consumers (AC20); the seed-path equivalence (AC21).

### Phase 5: Replication and reserved producers
- Records on the replication read surface and the takeover precondition (AC23), with
  `replication.md` at charter step 10.
- The npm ECDSA P-256 profile and keys document when `npm.md` adopts hosted signatures (AC12's
  npm form); the `attach` producer and the NuGet pre-commit transform hook stay unimplemented
  until a consumer adopts them.

## Tasks

Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. Eleven questions were raised in this pass and adopted under the owner's standing
delegation; each is recorded below and folded through Scope, Design, the criteria and the Test
Plan. `grep -rn "standing delegation"` is the owner's review queue.

### Resolved: who owns the trigger (was Q1)

**Adopted 2026-09-27 under the owner's standing delegation.** Option B: the shared write path
dispatches regeneration before every commit on a repository whose handler declares an `Indexer`,
and the handler has no call to make (Design, "The write path dispatches; the handler cannot
forget"; AC1; the dispatch enforcer).

Accepted cost: every write transaction on such a repository pays the `Affects` computation even
when nothing it changed is indexed (a docs-only Hex publish, `hex.md`), and the metadata store
gains a commit hook that `data-model.md`'s implementation must expose. Why the alternatives lost:
A (the handler calls `Deps.Index.Regenerate`) leaves the one-snapshot rule to twenty handlers'
discipline with no mechanical enforcer and no client oracle for a forgotten call; C (regenerate
asynchronously after commit, Nexus's 60-second model) breaks the rule outright and is the
eventual consistency `data-model.md` forbids.

The question: the prototype's question 2 asks "does the handler request regeneration, or does
the shared write path notice and dispatch?", and the seed path, the retention pass and freeze
are all writers that are not the handler's HTTP code.

**Recommendation:** B, because the seed path, retention and freeze already show three writers
that would each need to remember to call, and a forgotten regeneration is undetectable until a
client fails.

| Option | You get | It costs |
|---|---|---|
| **A. Handler calls regenerate** | The handler decides exactly when; no commit hook | Twenty places to forget; the rule enforced by review; seed, retention and freeze each need their own call |
| **B. Write path dispatches** | One enforcer; the seed path and every other writer get it free; one snapshot by construction | A commit hook in the store; `Affects` runs on every write |
| **C. Asynchronous after commit** | No write-path latency | A snapshot whose index disagrees with its content; the prototype's question 3 answered "no" |

**Why this is yours:** it decides where the constitution's mechanical enforcer for the
one-snapshot rule lives, and it commits `data-model.md` to a hook.

### Resolved: where a signature lives (was Q2)

**Adopted 2026-09-27 under the owner's standing delegation.** Option B: signatures are
`Signature` records keyed by body digest and key, outside snapshot content, and served documents
are assembled by concatenation; rotation and repoint produce records and never rewrite a snapshot
(Design, "Storage"; AC6, AC7, AC8, AC9).

Accepted cost: a `data-model.md` record, an assembly step per profile on the read path
(concatenation, not cryptography), and rewording in `hex.md`, `arch.md`, `rpm.md` and `alpine.md`,
which described rotation as "one write that re-signs every stored document"; each is a sibling
consequence. Why the alternatives lost: A (signatures inside the snapshot-held body, as those four
specs implied) makes a rotation a content change that needs a snapshot per repository, and a
rollback to any snapshot older than the rotation serves signatures under a retired key that every
client refuses, which turns the product's rollback into an outage on every signed format; C (sign
on read) puts key material on the hot path, which `hex.md`'s resolved production decision (was Q4
there) already rejected.

The question: `cpan.md` designed its signatures as records keyed by body digest and key; the
other signed formats described re-signing as writes, and `debian.md`'s pointer-held envelope sits
between the two.

**Recommendation:** B, because it is the only model under which rotation and rollback compose:
CPAN's design generalises to every format whose signature is separable from its body by framing,
which is all of them.

| Option | You get | It costs |
|---|---|---|
| **A. Signature inside the snapshot-held body** | Nothing to assemble on read | A snapshot per rotation; rollback across a rotation fails every client |
| **B. Signature records, assembled on read** | Rotation and rollback never rewrite history; `ETag` still byte-derived | A record; a framing step on read; four specs reworded |
| **C. Sign on read** | No stored signatures | Key material on the read path; the decision `hex.md` already rejected |

**Why this is yours:** it asks the shared model for a record on every signed format's account and
changes what four format specs said a rotation is.

### Resolved: where the renderer lives (was Q3)

**Adopted 2026-09-27 under the owner's standing delegation.** Option B: each format's renderer
is a sibling generator package, `internal/format/<name>/index`, pure and import-restricted,
handed to the runtime through the optional `Indexer` interface discovered at registration
(Design, "The generator contract"; AC2; the purity and call-graph enforcers).

Accepted cost: a callback from the shared layer into format code, which the prototype's question
1 names as the shape that could require a sixth method; this spec answers it with an optional
interface rather than a pinned method and the re-open judges. Why the alternatives lost: A (the
renderers inside `internal/index`) makes the service a second set of twenty handlers, violates the
format-knowledge-in-handlers rule and makes format N+1 a change to a shared package; C (the
handler's own package renders) is what `luarocks.md` AC4 and `opam.md` AC4 forbid ("the handler
never builds index bytes") and leaves the signing call in reach of request-handling code.

The question: `rpm.md` says the service generates "as createrepo_c 1.2.1 renders them field for
field", `conda.md` "as conda-index 0.13.0 encodes them"; twenty renderers' format knowledge has
to live somewhere that is neither the request path nor the shared runtime.

**Recommendation:** B, because it is the `Operator` idiom `management-api.md` adopted for the
same problem (format code the core must call), and because a pure package is what makes the
"never builds index bytes" and "never sees a key" tests mechanical.

| Option | You get | It costs |
|---|---|---|
| **A. Renderers inside the service** | One package to audit | Twenty formats' knowledge in a shared layer; every new format edits it |
| **B. Per-format generator package, optional interface** | Pure, testable renderers; mechanical boundaries; no pinned-method change | A callback the re-open must bless |
| **C. The handler package renders** | No new package | Index bytes and the signing call in request-handling code; two format specs' ACs violated |

**Why this is yours:** it takes a position on the prototype's first question before the finding
exists and it shapes what the re-open sees.

### Resolved: the freshness split between this spec and `data-model.md` (was Q4)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: `data-model.md` owns the
per-pointer freshness record (`moved_at`, the generation counter, the `PointerDocument`
record) and qualifies its AC22; this service owns rendering it into every format's signal and the
`ServeDocument` helper; `proxy-cache.md` owns the cache-scoped record for remotes (Design,
"Freshness scoped to the pointer"; AC10, AC11, AC27).

Accepted cost: three specs share one mechanism and each must cite the other two, and every
format spec that wrote its own freshness rule (`cpan.md`, `arch.md`, `luarocks.md`, `hackage.md`,
`debian.md`, `conan.md`) cites the shared record rather than carrying one. Why the alternatives
lost: B (this service owns the record too) puts a pointer field in a package that does not own
pointers, so a repoint that bypassed the service would leave the record stale; C (each format
owns its rule) is the seven-fold duplication theme 1 exists to end.

The question: theme 1 asks to "decide what is the signing/index service's and what is
data-model's, and state the split".

**Recommendation:** A, because the record changes when a pointer moves and only the pointer's
owner sees every move, while the signal changes per format and only the format's generator knows
its shape.

| Option | You get | It costs |
|---|---|---|
| **A. Record in data-model, rendering here, cache record in proxy-cache** | Each owner sees every event it must react to | Three specs cite each other |
| **B. Record and rendering here** | One spec | A pointer field owned outside the pointer's owner; a bypassed update is possible |
| **C. Per-format rules** | No shared change | The duplication that produced seven findings |

**Why this is yours:** it distributes one mechanism across three foundation specs and qualifies a
promotion guarantee you settled.

### Resolved: the produce/verify boundary and the requested verification entries (was Q5)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: this service verifies
nothing for a client; the verification entries `debian.md` item 6 and `hex.md` item 5 request are
`artifact-verification.md`'s `openpgp` and `raw` schemes; the one verifying call here is the
self-check of the service's own output with public material before commit (Design, "The
produce/verify boundary"; AC17; Scope).

Accepted cost: two format specs cite a different sibling for their verification entry (sibling
consequences), and every signature costs a verification on the write path. Why the alternatives
lost: B (build the requested entries here) is the both-sides surface `artifact-verification.md`
excluded on `auth.md`'s posture and would give two evaluators of one signature; C (no self-check)
leaves a miswired backend to be discovered by the first client, which for an index format is
every client.

The question: consequences item 13 asks for the boundary to be stated citing
`artifact-verification.md`; two format specs asked this service for verification entries before
that spec existed.

**Recommendation:** A, because the boundary is already drawn on the verify side and a producer's
self-check with public material does not cross it.

| Option | You get | It costs |
|---|---|---|
| **A. Verify nothing for clients; self-check own output** | One verifier; a miswired key caught at creation and at every write | Two specs re-cited; a verification per signature on the write path |
| **B. Build the requested entries here** | The two format specs unchanged | Two verifiers of one scheme; the surface `auth.md` warns against |
| **C. No self-check** | A cheaper write path | A wrong public key bricks every client of a repository until noticed |

**Why this is yours:** it settles a boundary between two shared services on the security-critical
side.

### Resolved: per-repository keys or an instance key (was Q6)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: one key set per hosted or
virtual repository, purposes and algorithms from the format's profile; no instance-wide signing
key; the `archive` purpose reserved at instance scope and unbuilt (Design, "Key custody"; AC24).

Accepted cost: an operator with many repositories manages many keys, and clients configure a key
per repository, which is what the format specs' clients already require (Alpine names the key
file per repository, Hex pins one per repository). Why the alternatives lost: B (Artifactory's
instance key) makes one compromise a compromise of every repository and cannot express Alpine's
key naming or Hex's per-repository pin; C (per repository with an opt-in shared key) adds a
sharing surface no consumer asked for and the same blast radius on opt-in.

**Recommendation:** A, because every consumer spec asks for "per hosted and per virtual
repository" and none asks for sharing.

| Option | You get | It costs |
|---|---|---|
| **A. Per repository** | Blast radius one repository; matches every consumer | Many keys to manage |
| **B. Instance key** | One key to manage | One compromise is total; Alpine and Hex unexpressible |
| **C. Per repository, optional sharing** | Fewer keys where wanted | A surface with no consumer |

**Why this is yours:** it sets the blast radius of a key compromise for the whole product.

### Resolved: the default custody backend (was Q7)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: `file` (software keys
encrypted at rest under the instance master key) is the default, with `kms`, `pkcs11` and
`external` behind the same `crypto.Signer` seam, all chosen per key (Design, "Key custody";
AC13, AC14).

Accepted cost: the default deployment's keys are only as safe as the master key and the process
memory, which the operator documentation says, and a replicated repository on `file` keys cannot
be taken over without a key recipe (the resolved follower decision). Why the alternatives lost: B
(require KMS or PKCS #11) makes the registry unusable on a laptop, in the conformance harness and
in the deployments Debian's own tooling serves with a gpg keyring; C (unencrypted software keys,
Pulp's and reprepro's keyring model) is below the posture `proxy-cache.md` AC6 already sets for
upstream credentials.

**Recommendation:** A, because it makes the secure options a configuration change rather than a
migration, while the default is no weaker than the credential store the registry already has.

| Option | You get | It costs |
|---|---|---|
| **A. Encrypted file default, KMS and PKCS #11 available** | Works everywhere; one signing path | Software keys by default |
| **B. Require KMS or PKCS #11** | No software key ever | Unusable without infrastructure; the harness cannot run it |
| **C. Plain software keys** | Simplest | Below the registry's own credential posture |

**Why this is yours:** it sets what a default installation's signing keys are protected by.

### Resolved: contention under concurrent writes (was Q8)

**Adopted 2026-09-27 under the owner's standing delegation.** Option B: a per-document
transaction lock serialises writes that invalidate the same document, with the mandatory
revision-token retry kept for conflicts the lock does not cover (Design, "Contention"; AC28).

Accepted cost: a write into a hot tree waits rather than fails fast, bounded by `index.lock_wait`,
and a lock adds a PostgreSQL round trip to every indexed write. Why the alternatives lost: A
(pure optimistic retry) regenerates a repository-wide document N times for N concurrent
publishes and livelocks under a CI fleet, which is `maven.md`'s captured scenario; C (queue
publishes through a single writer per repository) serialises writes to different trees that
never contend (`rpm.md`: "writes to different trees never contend").

**Recommendation:** B, because a lock scoped to the document key preserves the parallelism the
format specs rely on and turns a retry storm into a queue.

| Option | You get | It costs |
|---|---|---|
| **A. Optimistic retry only** | No lock | N regenerations for N writes; livelock on hot documents |
| **B. Per-document lock plus retry** | Parallel across documents, serial within; bounded | A lock round trip; a bounded wait |
| **C. One writer per repository** | Simple | Serialises independent trees |

**Why this is yours:** it trades write latency against regeneration cost on the hottest documents
in the registry.

### Resolved: what a follower serves and who signs at takeover (was Q9)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: `Signature` and
`PointerDocument` records travel with the pointer set; a follower serves them verbatim and signs
nothing while linked; takeover requires every active key to resolve on the follower (Design,
"Replication"; AC23).

Accepted cost: the replication read surface carries two more record kinds (a `replication.md`
consequence), and a replicated repository on `file` keys needs a documented key recipe before
takeover. Why the alternatives lost: B (the follower re-signs with its own key) makes every
client of a follower configure a second key and makes a follower's `Date` diverge from the
leader's, so promotion across instances stops being byte-comparable; C (replicate the private
key) moves private material over the wire, which AC14 forbids in every form.

**Recommendation:** A, because it is the only option under which "a follower must serve indexes
it did not sign" (charter step 10) holds without moving a key.

| Option | You get | It costs |
|---|---|---|
| **A. Records travel; follower signs nothing; takeover needs keys** | No key movement; identical bytes on both instances | Two records on the read surface; a key recipe for takeover |
| **B. Follower re-signs** | No key sharing at all | Two keys per client; divergent envelopes |
| **C. Replicate private keys** | Takeover always possible | Private material on the wire |

**Why this is yours:** it decides whether a disaster-recovery takeover can be refused for want of
a key.

### Resolved: Galaxy server-side signing (was Q10)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: not built; the `attach`
producer capability is named so a later adoption is a generator and a profile (Scope; Design,
"The produce/verify boundary").

Accepted cost: `ansible-collections.md`'s `signing_service` stays `null` and publishers sign
themselves. Why the alternatives lost: B (build it) puts the registry's key on every hosted
collection with no format spec requiring it, after `artifact-verification.md` chose verified
attachment (its resolved Galaxy decision, was Q6 there) precisely to keep key material out of the
verification step.

**Recommendation:** A, because no consumer requires it and the verification spec already priced
the publisher workflow against custody and chose the workflow.

| Option | You get | It costs |
|---|---|---|
| **A. Not built; capability named** | No unrequested key on hosted content | Publishers run `gpg` |
| **B. Build it** | Signatures without a publisher workflow | A key on every collection nobody asked for |

**Why this is yours:** it is a producer question a format spec deferred to two foundation specs
in turn.

### Resolved: rotation and the one-snapshot rule (was Q11)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: a rotation, a repoint's
re-signing and a cadence re-sign create no snapshot, because signatures and pointer documents are
not content; only a generator's body change is a write (Design, "Storage"; AC8, AC22; folded into
the resolved signature-placement decision's consequences).

Accepted cost: four format specs' "one write" phrasing is corrected (sibling consequences), and a
rotation is not visible in the snapshot history, only in the audit line and `Operation` record.
Why the alternative lost: B (a rotation is a write and a snapshot) makes a rollback across it
serve retired-key signatures and means an idle environment pointer's cadence re-sign would
create snapshots on a repository nobody wrote to, which `data-model.md`'s rule that a snapshot is
"exactly one per completed logical write" does not admit.

**Recommendation:** A, because `debian.md` already states it for its envelope and the signature
record model makes it true for every format.

| Option | You get | It costs |
|---|---|---|
| **A. No snapshot** | Rotation and rollback compose; idle pointers re-sign silently | Four specs reworded; rotation absent from snapshot history |
| **B. A snapshot per rotation** | Rotation in the history | Rollback across it fails; cadence re-signs write to idle repositories |

**Why this is yours:** it decides what counts as a write on every signed format, a rule you
settled in `data-model.md`.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-27 | 1fbf1e7 | authoring pass: grounded first draft, not a review | Not a review. Gathered the requirement lists of the twenty-two format specs that cite this file, the prototype spec, `replication.md`, `artifact-verification.md`, `management-api.md`, `conformance-harness.md`, `data-model.md`, `storage-and-gc.md` and `format-handler-interface.md`, and the items the consequences queue placed here (replication item 6; Open items 9, 11, 12, 14 to 32; theme 1; management-api item 14; artifact-verification item 13). Grounded prior art by fetching Pulp's signing-service guides, reprepro(1), aptly's publish guide, Nexus's Yum and APT signing pages, Artifactory's GPG signing page, the TUF specification, the Debian repository format, and the Go seams (`sigstore/sigstore` `kms.Get`, `crypto11`, go-crypto's `NewSignerPrivateKey`), each cited with what is taken and rejected. Eleven questions written in the decision shape and adopted under the standing delegation: write-path dispatch, signature records outside snapshot content, per-format generator packages behind an optional `Indexer`, the freshness split with `data-model.md` and `proxy-cache.md`, the produce/verify boundary with a self-check, per-repository keys, `file` custody by default behind one `crypto.Signer` seam with KMS, PKCS #11 and operator-held keys, per-document locking, verbatim pointer documents on followers with a takeover precondition, no Galaxy server-side signing, and rotation as a snapshot-less operation. Twenty-eight criteria with Test Plan rows; ten mechanical enforcers named; five phases. Sibling consequences reported to the caller, not applied. `node scripts/check-spec.js` run on this file. Stays draft. |
