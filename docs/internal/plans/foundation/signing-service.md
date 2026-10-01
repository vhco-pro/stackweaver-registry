---
status: planned
status_description: "Fable follow-up round 3, 2026-10-01 at f2e400a, still planned: the seven items queued since round 1 applied and verified against their sources, none declined (cpan's per-author CHECKSUMS is a template over {authordir} sourced from the other members' author sets, not a DeriveInputs derivation, which over a public mirror would fetch 14,748 author directories at a virtual's creation; the generator contract, AC35, AC25's determinism row and the was-Q21 record corrected, the round bound now one for every merging profile but rpm's and debian's; takeover re-signs in the request and registers the cadence through the named entry point signing.Service.RegisterSchedules(ctx, tx, repository, nextRun), the only creator of signing.resign rows, called by the runtime at a pointer's first signed document with the expiry-derived next run and by the takeover transaction with now, with the failing-key outcome on AC23 and its rows per replication was-Q12; the eviction pass never ending a declared primary; AC36's conformance rows naming arch's DatabaseRequired, provider and remote-only cases, the withdrawn-signature refusal and alpine's keyless remote with apk in the criterion; index_requested_cells leader-exported with _other by maximum). Earlier: Fable follow-up 2026-10-01 at 939a304: the six items the sibling rechecks queued after this spec was planned applied (template variable grammars with the router-authorized, swap-surviving, capped and pruned requested-cell set under new Q22, owner-facing; the verdict and anchor-class reads as the runtime's own Admission interface, never Deps; the keyless-remote coherence of the admission rule; no flag on any signing.* or index.* key; the cadence re-sign under read_only with key operations refused, the deletion write running no generator, and a virtual's rename enqueuing one merge), three found already applied; 37 criteria, 22 questions resolved, zero open, stays planned. Earlier: Planned by the Fable recheck of 2026-09-30 at ccb9ac9: a full review pass plus the re-examination of all nineteen questions adopted without Fable (Q1 to Q11 in the cloud-session authoring, Q12 to Q19 on Opus). Fifteen confirmed; Q8 amended (the per-document locks precede the head lock storage-and-gc takes last), Q16 amended (member inputs cannot be a static list, and a local member's rollback or promotion is a merge trigger through Transition), Q19 amended (the member-input interface answers for the remote's current state in bounded rounds); Q17's composed half SUPERSEDED by Q20, owner-facing: a signed virtual admits a remote member's current document by the anchor class its adoption ran under (signature needs a verified verdict, an integrity anchor such as a metalink admits, no anchor admits on TLS alone, a failed verdict never), recorded per document on the merged set's input record, and the rule binds signed bodies only, so Arch's and Manjaro's official mirrors, Fedora and TLS-only remotes contribute to a signed virtual again and unsigned virtuals (CRAN, conda, RubyGems) admit everything (AC36 rewritten). Q21 adopted: member inputs as literals, templates over sourced variables and DeriveInputs derivations, replayed in rounds bounded at registration, with a read-driven first fetch for a cell only the remote holds (AC35 rewritten). Queued items applied: the merge reads every input by declared digest and receives the previous merged set, the swap writes the merged document's declared list with retained generations (AC19), and the stored body-md5 ETag and Repr-Digest validators (AC30). The sibling consequences (arch, rpm, alpine, cpan, debian, cran, conda, rubygems, proxy-cache, data-model, artifact-verification, format-handler-interface, async-operations, repository-lifecycle, question-triage) are reported, not applied. 37 criteria, each with a Test Plan row; 21 questions resolved, zero open; fable_recheck cleared. Earlier: leftovers pass of the closing sweep 2026-09-28 at 4278ce0 on Opus (member-input paths in Profile, the enqueue-only read-path transaction, Adopt fed by the adoption check, Q19 adopted); closing reconciliation sweep 2026-09-28 at 173da1b on Opus (Q12 to Q18 adopted: the conditional rule per document, the serve-time Render stage, ServeRendered and ServeFile with a module-wide boundary, virtual freshness as pointer transitions, remote-member adoption and revalidation, verdict-free pass-through, Cache-Control per format; AC30 to AC37); reconciled 2026-09-28 at 3a82b21 with the foundation authoring wave (index.merge and signing.resign on internal/async, security.master_key, lifecycle AC29, the telemetry names, generate defined); authored 2026-09-27 against 1fbf1e7 with eleven questions adopted under the standing delegation."
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
and, when they were authored, cited this file as "to be authored in the spec loop"; each has since
been reconciled against the generator contract below. Each was read for this draft and its
requirements are asserted below. Grouped by what they ask for:

| Ask | Formats, with the requirement's home |
|---|---|
| Signed repository-wide index, OpenPGP | `debian.md` ("What the signing and index service must provide", seven items; pointer-scoped envelope), `rpm.md` (seven items; armored single-packet signature over `repomd.xml`, key document), `arch.md` (eight items; binary single-packet signatures over databases and every hosted package), `cpan.md` (six items; `CPAN::Checksums`-compatible cleartext signing, signature records keyed by body digest) |
| Signed repository-wide index, other schemes | `alpine.md` (seven items; RSA PKCS #1 v1.5 over the index stream as a prepended tar segment, key named by file), `hex.md` (five items; RSA-SHA512 in `public_key:sign/3` form over a protobuf payload, SPKI PEM with an OpenSSH fingerprint), `hackage.md` (ten items; TUF root, snapshot, timestamp and mirrors roles, ed25519 only, per-pointer version counter, operator-held root) |
| Signed per-version document | `terraform.md` (four items; binary detached RSA signature over `SHA256SUMS`, additive rotation), `openvsx.md` (five items; pure Ed25519 over a stored blob under a memory bound) |
| Unsigned generated index | `maven.md` (three `maven-metadata.xml` levels, virtual merge, contention-safe), `conda.md` (five items; every repodata representation, patch application, shards), `cran.md` (six items; an R serialisation writer, `latestOnly`, generation from upstream records), `julia.md` (six items; registry tree, tree hash, deterministic tar), `luarocks.md` (eight items; data-only serializer, pointer-derived `Last-Modified`), `opam.md` (seven items; deterministic tar with byte-range rewrite), `chef.md` (six items; the universe), `vagrant.md` (six items; one catalog per box, the first unsigned consumer), `helm.md` (unsigned `index.yaml` regenerated in the same snapshot; consumes this service if it owns regeneration, which it does), `rubygems.md` (the compact index `/versions`, `/info` and `/names` and the legacy Marshal files; an `ETag` that is the body's MD5 and a `Repr-Digest` on `200` and `206`, stored at generation or adoption; a virtual `/versions` that appends, so `Merge` receives the previous merged set) |
| Reserved, on a sibling's decision | `nuget.md` (a repository countersignature before the CAS commit, should repository signing ever be adopted; its resolved repository-signing decision declined it), `ansible-collections.md` through `artifact-verification.md`'s resolved Galaxy decision (was Q6 there: server-side signing "remains `signing-service.md`'s"), `npm.md` through the same spec's Context (hosted `dist.signatures` and our own `/-/npm/v1/keys` are this service's) |
| Nothing, stated | `composer.md`, `homebrew.md` (brew accepts only Homebrew's own key), `puppet.md`, `swift.md`, `conan.md`, `cargo.md`, `go-modules.md`, `pypi.md`, `pub.md`, `oci.md`, `generic.md` |

"Nothing" means nothing generated and nothing signed. It does not mean nothing served: the format
batch reconciliations found that every handler which renders a document per request (`composer.md`
was-Q10, `cargo.md`, `npm.md`, `nuget.md`, `pypi.md`, `openvsx.md`, `puppet.md`) or serves a
remote's cached documents (`homebrew.md`) needs its validators from the same shared serving door
the generated documents use, because this spec's freshness boundary forbids every handler package
to set them (Design, "Serving: one door for every validator", the resolved handler-rendered
decision below, was Q14).

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
The format batch reconciliations then placed a second round here (batch 3 item 6, batch 4 item 7,
batch 5 items 4 and 5, batch 6 items 1 to 6, batch 7 items 1 to 5, batch 8 item 9), which cluster
into five gaps this spec now closes: what the serving door renders and for whom, byte ranges, a
signed document whose version is the repository's rather than a pointer's, what moves a virtual
repository's freshness and what keeps its remote members fresh, and which remote documents a
virtual may pass through unverified.

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
  (`hackage.md`), repository-scoped pointer documents identical on every pointer and renewed once
  per repository (`hackage.md`'s `root.json` and `mirrors.json`), signature records produced at
  pointer transitions (`cpan.md`), re-signing on an expiry cadence without a snapshot, and the
  forward-moving `Last-Modified` that `cpan.md`, `luarocks.md`, `arch.md` and `homebrew.md`
  require, with a conditional rule declared per document: exact-match `304` by default, and
  not-earlier `304` for clients whose condition is their own clock (theme 1; the data-model half
  of the split is `data-model.md`'s AC36).
- The serving door: every validator a handler's response carries (`Last-Modified`, `ETag`,
  `Cache-Control`, the answers to `If-Modified-Since`, `If-None-Match`, `If-Range` and `Range`)
  comes from one of three runtime forms, for a stored document, a handler-rendered document and a
  stored file; a serve-time stage a generator may declare for variants rendered on request,
  deployment values expanded into the body, and on-request compression, memoised and folded into
  the `ETag`; stored validators a policy derives at generation or adoption and never per request
  (an `ETag` that is the identity body's MD5, a `Repr-Digest` over the whole representation on
  `200` and `206`; `rubygems.md`); and a public-key read for per-request documents that list the
  keys a body is signed by (Terraform's `signing_keys`).
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
- Virtual merges as deferred, coalesced work signed with the virtual repository's key, whose
  freshness moves forward at every merge commit, re-run when a member's default pointer moves or a
  remote member adopts a new upstream revision, reading every member input by the digest the
  member's current document declares, with a remote reached only through a virtual kept fresh by
  the virtual's own reads and first fetched through member inputs the profile declares as
  templates and derivations, with a read-driven cell set that only an authorized read of the
  virtual can grow, within each variable's grammar, bounded by a cap and pruned; admission of a remote member's document into a body the virtual
  signs decided by the trust anchor the member was adopted under (a signature verdict, an
  integrity anchor, or TLS alone, never a `failed` verdict), a declared pass-through for
  upstream-signed documents the virtual serves verbatim, and no admission rule at all for a
  virtual that signs nothing; the merged document's declared blob-digest list carrying its parts
  and a profile-declared number of predecessor generations; and generation on the proxied path
  from records an upstream adapter parsed, unsigned.
- What replication carries: pointer documents and signature records travel with the pointer set;
  a follower signs nothing while linked; takeover requires the keys to be resolvable, registers
  the repository's cadence schedules through a named entry point in the transaction that ends
  the link, and re-signs every pointer document under those keys in the same request.
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
- **Deferred execution itself** (workers, leases, retries, cancellation, the scheduler):
  `async-operations.md`, whose queue core lands at the start of charter step 4b, before this
  spec's Phase 1 at step 7. The virtual merge is the `index.merge` job kind and the cadence
  re-sign the `signing.resign` kind on `internal/async`; this spec fixes their contract (enqueue,
  coalescing window, atomic swap, staleness bound, expiry-derived next run) and that spec runs
  them (its kind table, AC11, AC14).
- **The cache-scoped `Last-Modified` of a remote repository** and the rule that a remote never
  adopts an older upstream revision (`homebrew.md`, `arch.md`, consequences items 30 and 32):
  `proxy-cache.md`'s, because the record it derives from is the cache's, not a pointer's; its
  AC22 holds it (forward-moving cache-scoped `Last-Modified`, no adoption of an older revision,
  a db and its signature as one paired set). The conditional answer rendered from that record is
  this spec's serving door, under the same declared rule as a hosted document (the resolved
  later-condition decision below, was Q12), which is the one point where the two specs meet.
  Named here so the split in theme 1 is complete.
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
a consumer may use either alone: Maven, conda, CRAN, Julia, LuaRocks, opam, Chef, Vagrant, Helm
and RubyGems use generation with no key ("nothing is signed and the service's signing half is not
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
never imports `internal/signing` (AC2), and it reaches `internal/index`'s runtime only through the
`Documents` consumer interface `Deps` carries (Design, "Serving: one door for every validator");
it may name `internal/index`'s value types, as its `Indexer` method must, and nothing else of it.

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
    unsigned consumer and the service creates no key for it (AC24, `vagrant.md` item 6). Per
    document key the profile also carries a **serve policy** (Design, "Serving": the conditional
    rule, `Cache-Control`, the encodings offered, range support) and, where the key has one, a
    **serve-time stage**: the finite set of **variants** rendered on request from the one stored
    body, and the **serve-time inputs** a rendering reads (`server.public_url`, the serving
    repository's current name and mount). A key that is signed may declare variants and inputs
    only where they leave the signed bytes untouched (an HTTP content encoding does; a URL
    expansion does not), and registration refuses a profile that breaks this, because a signature
    over stored bytes cannot survive a serve-time rewrite and the read path never signs (AC6,
    AC31). A profile that declares a `Merge` also declares, for each document key the merge reads
    from a member, that document's **member input**: how its path under the member's mount, the
    route a client of the member requests, is obtained (the resolved member-input decision below,
    was Q21). A member input is one of three shapes. A **literal** path (`hackage.md`'s
    `01-index.tar.gz`). A **template** over a closed set of variables the profile names, each
    bound to a source: the values the virtual's other members hold for it (`cran.md`'s `{tree}`,
    `conda.md`'s `{subdir}`, `alpine.md`'s `{tree}/{arch}`, `arch.md`'s `{layout}` and `{db}`,
    `rpm.md`'s `{tree}`, and `cpan.md`'s `{authordir}` over the author directories the other
    members hold, a hosted member's author records and a remote member's the directories its
    adopted index names, so that exactly the directories more than one member can hold, the
    composed ones, are ever fetched as inputs), a format constant (`noarch`, `src/contrib`), the virtual's own
    `settings` document (`debian.md`'s `{suite}`), or a cell a client of the virtual requested that
    no other source covered (below). Each variable also declares its **grammar**: one or more
    path segments, each drawn from a character class the profile names, none empty, none `.` or
    `..`, no slash inside a segment and no percent-encoding, so a value that fits it expands to a
    path that normalises to itself under the remote's mount and can name no route the template
    did not. Registration refuses a grammar admitting any of those, and the runtime checks every
    value against its grammar before expanding, whatever its source: a value from another
    member, from `settings` or from a request that does not fit is never expanded and never
    recorded (`auth.md` AC36, which bounds the request-derived source to exactly this; AC35). A
    **derivation** from a document key read earlier in the same
    replay: the generator's `DeriveInputs` (below) turns that document's stored body into the paths
    it names (`rpm.md`'s `location href`s under `repomd.xml`, `debian.md`'s `by-hash` indices
    under the envelope). A derivation is the right shape only where every path the document
    names is an input the merge needs: `cpan.md`'s per-author `CHECKSUMS` is not one, because a
    derivation sees the index body alone and over a public mirror would name every author
    directory the index does (14,748 `CHECKSUMS` from `www.cpan.org` at a virtual's creation)
    while only the directories a second member also holds are ever composed, so that generator
    declares the `{authordir}` template above and no derivation (`cpan.md`, "Virtual
    repositories", its resolved virtual decision, was Q12 there, as rechecked). `proxy-cache.md`'s
    `proxy.revalidate` job asks the runtime for a never-adopted remote's inputs through the
    interface that layer declares (Design, "Package shape"), and the runtime answers for the
    remote's **current state**: the templates expanded over their sources less the routes already
    cached, plus the derivations over the documents the remote has adopted so far, so the job
    replays in rounds and ends when a round adds no route not yet cached or negatively cached (its
    "Revalidation outside the request", AC26). Registration computes the **round bound** as the
    longest derivation chain in the profile plus one (two for `rpm.md`'s and `debian.md`'s
    profiles, the only ones declaring a derivation; one for every other merging profile declared
    so far) and the interface reports it. Once a document is cached its route is recorded with the entry and
    the declaration is not read again. Registration refuses a merging profile with a member-read
    key that declares no input, a template naming a variable with no source, or a derivation from
    a key that is not itself a declared input (AC35).
  - `Generate(ctx, in) (out, error)`: `in` carries a read view of the repository at the pending
    state of the transaction (the version-level records the generator reads, through the same
    metadata store the handler reads, scoped to the repository), the previous document set by key
    with digests, the change, the pointer's freshness record when the key is pointer-scoped, and
    a `Signing` handle; `out` carries, per affected key, either bytes or a streaming writer (a
    Debian-scale `Packages` or a conda repodata is written to the CAS as it is produced, never
    buffered whole), plus the declared blob digests a multi-blob document consists of
    (`hackage.md`'s segments, `cpan.md`'s manifest). Every key not in `out` keeps its previous
    bytes and digest, which is what makes an untouched cell's `ETag` stable (AC4).
  - `Merge(ctx, members, previous) (out, error)`: the virtual merge over the members' current
    document sets, with the format's own rule (first member wins, union in member order, newest
    `lastUpdated`). `members` carries, per member in member order, the documents the profile's
    member inputs name, each read by the digest the member's current document declares (Design,
    "Virtual merges"), the member's admission outcome for each (below, "The produce/verify
    boundary") and its freshness value; `previous` is the virtual's previous merged document set
    by key with digests, exactly as `Generate` receives a repository's, so a merged log can append
    rather than rewrite (`rubygems.md`'s `/versions`, whose warm clients fetch by byte offset; its
    resolved virtual decision, was Q7 there). A format whose virtual is a concatenation or a union
    of listings (`julia.md`) or that cannot have virtual repositories (`hex.md`) declares no
    merge.
  - `DeriveInputs(key, body) ([]Path, error)`: for a member input declared as a derivation, the
    paths a stored member document names, from its bytes alone (`repomd.xml`'s hrefs, an
    envelope's `by-hash` entries). Pure and deterministic like the rest of the generator, called
    only by the runtime when it answers the revalidation job, and never called for a generator
    whose profile declares no derivation (every merging profile but `rpm.md`'s and
    `debian.md`'s), which answers an empty list for every key.
  - `FromUpstream(ctx, records) (out, error)`: the proxied-path generation from records an
    upstream adapter parsed (`cran.md`, `luarocks.md`, `chef.md`, `opam.md`), sharing the
    renderer with the hosted path so "hosted, proxied and virtual repositories share one
    generator and one stored form".
  - `Render(ctx, stored, variant, inputs) (out, error)`: the serve-time stage, for a key whose
    profile declares one. It reads one stored body (a record set, a URL-free document) and
    returns the bytes or a streaming writer for one variant under the given serve-time inputs:
    LuaRocks' 36 manifests (two scopes, six Lua selections, three encodings of the manifest
    itself) from one stored record set, opam's whole-gzip `index.tar.gz` and `repo` from its
    record set, Chef's universe and Vagrant's catalogs with absolute URLs inserted into a stored
    URL-free body. It is pure like the rest of the generator (no clock, no `Deps`, no
    `Signing` handle), deterministic over (stored body, variant, inputs), and called only by the
    runtime, which memoises its output (Design, "Serving").
- The `Signing` handle a generator receives inside `Generate` is a **capability scoped to the
  transaction and to the repository's active keys**: `Sign(profile, bytes)` and
  `SignBlob(profile, digest)` return a signature; `PublicKeys(purpose)` returns public forms for
  embedding in a generated document (RPM's key document, Alpine's key name). A document rendered
  per request that lists signing keys (Terraform's `ascii_armor` and `key_id` in the download
  document) reads them through the serving door's `SignedBy` instead, since no `Signing` handle
  exists outside a write (Design, "Serving"). It never returns private material, it refuses outside a write transaction,
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
method: an optional `Indexer`, discovered like `Operator`", and that spec records it as such in
"Optional interfaces discovered at registration", where `Indexer` sits beside `Operator` and
`surface.Declarer` as three separate type-asserted interfaces held apart until the re-open (its
resolved optional-interfaces decision, was Q10 there; AC16 there holds the pin at five by
reflection). If the prototype finds the callback needs request context a generator cannot be
given, the contract here is revised before Phase 1, exactly as `helm.md` and `maven.md` committed
to for their own index sections.

### The write path dispatches; the handler cannot forget

Per the resolved trigger decision below, **the shared write path owns the trigger**. Every write
transaction the metadata store opens on a repository whose handler declared an `Indexer` ends,
before commit, with the runtime computing the change from the transaction's recorded delta,
asking the generator's `Affects` which keys it invalidates, calling `Generate` for them, signing
what the profile signs, storing the results as part of the same delta, and only then committing.
The seam is the **pre-commit hook** the shared write path exposes: `data-model.md` defines it
("The write transaction exposes a pre-commit hook", AC37: after the handler's changes, before
commit, in the same transaction, with the snapshot's content set visible; a failing hook commits
nothing) and `storage-and-gc.md`'s sole write-transaction constructor runs it (its AC25). This
runtime is the hook's registered consumer. That holds for a handler's own wire write (a Hex
publish `POST`, a LuaRocks upload, a Chef share), for a management operation (`Submit` opens
the transaction and calls `Apply`, then the runtime runs), for the harness seed path (a `state`
entry is a completed logical write through the same store, so seeded state comes out generated
and signed with no seed-side code, AC21; `conformance-harness.md` AC24, whose `repositories`
entry carries a `signing` sub-entry that is either a fixture private key file, imported through
the `file` backend's import operation, or `generate`, meaning the service generates the
repository's keys under the `file` backend at repository creation exactly as a production
creation with `signing.default_backend: file` does),
for a retention pass (`julia.md` item 4: "writes made by the shared retention pass, which
removes versions like any deletion"), and for replication's freeze (a publish through the target
repository's hosted ingest, `replication.md`'s resolved freeze decision, so the frozen mirror's
`Release` is signed by that repository's key, as that spec accepts). The one completed write it
does not hold for is the deletion write (Design, "Key custody": exempt from the hook, no
generator, no pointer document).

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
tree complete within it with a bounded retry count). The per-document locks are taken inside the
pre-commit hook, before the write transaction takes the repository head lock, which
`storage-and-gc.md`'s sole constructor takes **last** and holds to commit (its AC30, the claim
check's ordering); so every indexed write acquires locks in one order, document keys then head, and
two writes into one tree cannot deadlock across the two layers.

### Storage: bodies in the snapshot, signatures as records, envelopes on the pointer

Three kinds of stored thing, each placed against `data-model.md`'s model and
`storage-and-gc.md`'s root set, none of them a new mark root. The records this spec needs from
the shared model are in `data-model.md` (its "Freshness scoped to the pointer, and the documents
that hang on it": `Signature`, `PointerDocument`, `SigningKey`, the pointer freshness record and
the declared blob-digest list; AC36, AC37 there), specified here and held there.

**Generated bodies are metadata documents in snapshot content.** A generator's output for a
key at level `repository`, `package` or `version` is stored as that level's opaque document (or
a named member of it), inline below the size threshold and as a CAS blob above it, protected by
the fourth mark root (`storage-and-gc.md` AC16), and restored by a repoint with everything else
at its level (`data-model.md` AC13). A document that consists of several blobs (Hackage's index
segments, each a gzip member; CPAN's generated-body manifest) declares its blob digests in the
document, and the fourth root marks through the declared list: `data-model.md` carries the
declared blob-digest list (AC37) and `storage-and-gc.md` AC16 widens the fourth root's reach to
it, which was `hackage.md`'s and `cpan.md`'s request (AC5 asserts the survival). Retention of every file a retained
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
snapshot or pointer document holds is pruned with it (`data-model.md` AC37). The `Signature`
record is added in `data-model.md` (Design "Freshness scoped to the pointer", AC37); AC6 here
asserts the behaviour on it.

This changes the wording, not the effect, of four format specs that described rotation as "one
write that re-signs every stored document" (`hex.md` item 4, `arch.md` item 6, `rpm.md` item 6,
`alpine.md` item 5): the cutover is one atomic batch of signature records and creates no
snapshot, which is what `debian.md` already says of its envelope ("No content changes and no
snapshot is created") and what `data-model.md` requires of anything that is not content. All four
now say so (applied by the format batch 3 to 5 reconciliations: `rpm.md` and `hex.md` as an atomic
batch of records, `arch.md`'s announce-switch-retire with no snapshot, `alpine.md`'s framed
dual-signature batches).

**Pointer documents are re-rendered bodies scoped to the pointer.** Where a client's freshness
rule reads a field inside the signed bytes (apt's `Date`, TUF's `version` and `expires`), a
signature record is not enough, because the body itself must change at every pointer move. A
`PointerDocument` record holds (pointer, document key, inline bytes or CAS digest, produced-at,
the counter value it carries): Debian's `InRelease`, `Release` and `Release.gpg` for a suite,
Hackage's `snapshot.json` and `timestamp.json`. It is produced inside the write for the default
pointer, at every promotion and rollback (inside the repoint), on the expiry cadence and at a
rotation; it is never snapshot content; it is protected by the fourth root's current-document
half when CAS-backed (`storage-and-gc.md` AC16); and a promoted environment's pointer document is
by design not byte-identical to the source's, which qualifies `data-model.md` AC22 exactly as
`debian.md` and `hackage.md` raised, and as that spec now states ("AC22 is qualified, not
weakened"). The record is added in `data-model.md` (AC36); AC10 here asserts the behaviour on it.

**Some pointer documents belong to the repository, not to one pointer.** Hackage's `root.json` and
`mirrors.json` carry a version that must never decrease for any client of the repository, and every
pointer's `snapshot.json` names them by hash, so they can be neither snapshot content (a repoint
would restore an older root, which every client that updated refuses) nor a per-pointer document
with a per-pointer version (two pointers would serve two different roots under one version
number). `hackage.md`'s resolved root-placement decision (was Q16 there) places them as
`PointerDocument` records identical on every pointer, and this service owns what that requires. A
profile declares such a key **repository-scoped**. Its body is produced once per change with one
version for the repository, one more than the version every pointer currently carries, and is
stored as a `PointerDocument` on every pointer of the repository, byte-identical, so a repoint
never restores an older one and replication carries it with the pointer set like any pointer
document (AC23). It changes only in a **repository batch**: a renewal on the cadence, a
`root-chain` or online-key rotation, or an accepted `external` document produces the new body and,
in one transaction, re-renders it on every pointer together with every pointer-scoped document
that names it (each pointer's `snapshot.json` and `timestamp.json`), advancing every pointer's
freshness record, with no snapshot. A pointer created later receives the repository's current body
at creation. The batch is a transition on every pointer of the repository, which `data-model.md`
lists among its document-only transitions ("Freshness scoped to the pointer", AC36). AC33 asserts
it.

### Freshness scoped to the pointer: the split with `data-model.md`

Seven formats arrived at the same finding from different clients (theme 1): apt ignores an older
`Release`; TUF clients fail hard on a lower version and adopt the same content at a higher one;
Conan keeps a newer cached revision; LuaRocks, CPAN and Arch revalidate with `If-Modified-Since`
and a `304` hides a rollback; curl's `--time-cond` in brew "discards any 200 whose Last-Modified
is not newer than brew's own clock at its last fetch", so the signal must be **monotonic and
forward-moving**, and "exact-match 304 is insufficient for curl-based clients". Per the resolved
freshness-split decision below, the mechanism is one and it is split by ownership:

**`data-model.md` owns the record** (its "Freshness scoped to the pointer", AC36): a per-pointer
**freshness record** on `Pointer`, carrying
(a) `moved_at`, set at every pointer transition (a write advancing the default pointer, a
promotion, a rollback, a key switch, a cadence re-sign; and, from this spec's closing
reconciliation, a repository batch on every pointer of the repository and a virtual's merge commit
or member-list change, which `data-model.md` lists as document-only transitions, its AC36) to the later of the transition time and
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
`Last-Modified` (`arch.md`: 6.0.2 revalidates the signature with the database's time). A matching
`If-None-Match` is always answered `304`. An `If-Modified-Since` is answered under the
**conditional rule** the document's serve policy declares, per the resolved later-condition
decision below (was Q12), because two captured client populations need opposite answers to a
condition later than the served value:

- **`exact`, the default.** `304` only when `If-Modified-Since` equals the current `Last-Modified`;
  any other condition, earlier **or later**, gets `200` with the current value. This is what
  clients that echo the server's own `Last-Modified` need (cpm and Carton, `wget` and `curl` under
  LuaRocks, pacman, apt): after a rollback the echoed value is older than the moved record, so the
  body is sent. It is also what CPAN.pm's own fallback needs: after `wget` left a zero-length
  temporary file from a refused host, HTTP::Tiny sent that file's time, a date later than anything
  served, to the next host, and a server answering `304` to any later date left CPAN.pm with an
  empty archive while an exact-match server let it install (`cpan.md`, captured; `luarocks.md`
  AC15 asserts the `200` on a later condition).
- **`not-earlier`, declared.** `304` when `If-Modified-Since` is not earlier than the current
  `Last-Modified`, `200` otherwise, so every `200` carries a `Last-Modified` later than the
  condition. This is what a client whose condition is its own clock needs when its transport
  discards a `200` that is not newer than the condition: brew's `curl --time-cond` sends the time
  of its last successful download, almost never equal to anything served, and under `exact` every
  revalidation would send the whole body (tens of megabytes for Homebrew's API documents) for curl
  to discard mid-transfer (`homebrew.md`, its resolved freshness decision, was Q5 there, AC4).

Both rules rest on the record moving forward: every value a client could have been served is at
or before the current one, so `exact` never answers `304` to a client holding older bytes, and
`not-earlier` answers `304` to a later condition only when the client fetched after the last
change, clock skew being its stated cost. A document with no `Last-Modified` (the `ETag`-only rule
below) ignores `If-Modified-Since`. Formats whose clients fetch whole and unconditionally
(`opam.md`: strong `ETag`, `Cache-Control: no-cache`, no `Last-Modified`) declare the `ETag`-only
freshness rule and the helper honours it. `Cache-Control` values are the format's (`rpm.md`,
`alpine.md`: `no-cache` on the index, `immutable` on checksum-named files; `cran.md`: CRAN's own
`max-age=1800`) and travel in the serve policy, per format and not per repository (the resolved
cache-control decision below, was Q18). The runtime renders all of this through the serving door
(next section), and an architecture test holds that no handler package sets `Last-Modified` or
`ETag` or reads a conditional header itself (AC11).

**`proxy-cache.md` owns the cache-scoped record** for `remote` repositories, which have no
pointer: a remote's served `Last-Modified` is the cache's, never the upstream's, forward-moving,
and a remote never adopts an older upstream revision; a db and its signature are adopted as one
paired set (items 30 and 32; its AC22 asserts all of it; the cache-scoped record on the remote's
current document is `data-model.md` AC44). Named here so the three owners are stated once. The
conditional answer rendered from that record is this service's, under the same two rules; a
remote's cached document is served through `ServeDocument` with the cache-scoped record as its
freshness source, as `proxy-cache.md` already states ("the same shared serving helper hosted
documents use, with the cache record in place of the pointer record"). Its AC22 states the answer
as "`304` only on an exact match" and "no `200` at or before the condition" jointly, which leaves a
later, unequal condition undefined; under this spec's rules the first clause is `exact`'s and the
second is `not-earlier`'s, and `proxy-cache.md` now states its AC22 as those two declared rules,
rendered through this door.

### Serving: one door for every validator

The freshness boundary forbids every handler package to set `Last-Modified` or `ETag` or to read a
conditional header, and the format reconciliations found that most of what handlers serve is not a
stored generated document: Composer, Cargo, npm, NuGet, PyPI, Open VSX and Puppet render documents
per request from records; Homebrew serves a remote's cached documents; Open VSX, Puppet, CRAN and
every other format serve stored files that carry a digest `ETag`; Hackage fetches its index by byte
range. Per the resolved handler-rendered decision below (was Q14), the boundary stays module-wide
and the runtime offers three forms, reached by handlers through the **`Documents`** consumer
interface declared in `internal/format` beside `Deps` and carried by it (the format specs cite the
first form as `index.ServeDocument`):

- **`ServeDocument(w, r, ref)`** serves a stored document: a generated document of a hosted or
  virtual repository, or a cached metadata document of a remote, verbatim or `FromUpstream`
  output. `ref` names the **serving repository** (whose pointer or cache record is the freshness
  source, and whose name and mount are the serve-time inputs), the **source** of the stored body
  (the same repository, or the member a per-request virtual resolved the name to, as
  `vagrant.md`'s virtual serves a member's catalog under its own name), the document key, and the
  variant where the key declares a serve-time stage.
- **`ServeRendered(w, r, rendered)`** serves a document the handler renders per request. The
  handler passes either the bytes, or a **lazy renderer with a validator identity** (the document's
  identity, the serving snapshot's identity and any serve-time inputs the bytes depend on), from
  which the runtime derives a strong `ETag` without rendering, so a `304` costs no render (the
  property `cargo.md` and `nuget.md` built their snapshot-derived `ETag`s for). It also passes the
  **freshness source**, never a date: the serving pointer on a hosted repository, a remote's
  cache-scoped record, or, for a virtual that renders per request (`composer.md`, `homebrew.md`),
  the virtual's own pointer and each member's record for that name, served as the latest of them.
- **`ServeFile(w, r, file)`** serves a stored file from its `File` record: a strong `ETag` from the
  CAS digest, a `Last-Modified` from the record's creation where the policy asks for one, and byte
  ranges as below.

Each form reads a **serve policy**: for a generated key, the one its profile declares; otherwise a
value the handler declares as a package-level constant. A serve policy carries the freshness rule
(pointer `Last-Modified`, `ETag` only, or none), the conditional rule (`exact` or `not-earlier`),
the `Cache-Control` value, the encodings offered and range support, and no date, so a handler
cannot smuggle one in. What the forms do with it:

- **Serve-time rendering, memoised** (the resolved serve-time decision below, was Q13). A key with
  a serve-time stage is served by calling its generator's `Render` for the requested variant under
  the serving repository's inputs. The `ETag` is derived from the stored body's digest, the variant
  and the inputs, never from rendering, so a `304` costs no render and a changed
  `server.public_url` or a rename changes the `ETag` and the bytes with no write and no snapshot
  (`chef.md` AC17). The output is memoised in process under a byte bound
  (`index.render_memo_bytes`), keyed by (stored body digest, variant, inputs), so `opam.md`'s memo
  key (the record set's digest, the base URL and the current name) and `luarocks.md`'s (record
  set, scope, Lua selection, encoding) are both this key; a memo entry is disposable state, never
  snapshot content, and an output above the bound streams from `Render` on every miss.
- **On-request compression.** A policy that offers `gzip` compresses when `Accept-Encoding`
  admits it, sets `Content-Encoding` and `Vary: Accept-Encoding`, derives a distinct strong `ETag`
  per encoding, and memoises the encoded bytes like a rendering (`homebrew.md`'s API documents,
  `chef.md`'s universe). A policy that offers none never sets `Content-Encoding` (`hackage.md`
  AC32).
- **Byte ranges.** A policy with range support answers a single byte range with `206` and
  `Content-Range`, an unsatisfiable one with `416`, and honours `If-Range` against the current
  validators, on a stored document including one that consists of declared blobs, whose range maps
  onto the covering blobs through `storage-and-gc.md`'s segment-verified range read (its AC21)
  without assembling the document (`hackage.md`'s incremental `01-index.tar.gz`, its AC3 and AC32).
  `ServeFile` additionally answers several ranges as `multipart/byteranges`, which `rpm.md`'s
  zchunk refresh sends. A generated document with a serve-time stage is not range-served, since
  its bytes are not stored.
- **Stored validators.** A policy's `ETag` derivation is `assembled` by default (the strong
  `ETag` over the served bytes, so a re-sign changes it) or `body-md5`: the quoted lowercase hex
  MD5 of the whole identity body, which Bundler 2.4.19 compares with the MD5 of what it stored
  and, on a mismatch, abandons the compact index for the Marshal one (`rubygems.md`, captured;
  its resolved validator decision, was Q3 there). A policy may also declare a **`Repr-Digest`**
  (`sha-256` over the whole identity representation, RFC 9530's byte-sequence form), sent on
  `200` and on every `206`, so a client appending a range can check the whole file it now holds.
  Both are computed once, by the runtime at generation (a hosted document) or by `Adopt` at
  adoption (a remote's), and stored with the document as its validators, never recomputed per
  request; a remote's stored validator of the policy's algorithm is also what `proxy-cache.md`'s
  expected-validator condition compares (its AC31). Registration refuses `body-md5` or a
  `Repr-Digest` on a key that offers a content encoding or a serve-time stage, since both are
  statements about the identity bytes the client stores.
- **The keys a body is signed by.** `SignedBy(ctx, ref)` returns the public forms of the keys
  whose current `Signature` records the served body carries, and nothing private. It is how
  Terraform's per-request download document lists `signing_keys` as `ascii_armor` and `key_id`
  without the handler importing `internal/signing`: the handler renders the document and reads the
  key list from `SignedBy` over the version's `SHA256SUMS`, so an outright retirement under the
  `additive` profile, which re-signs with no snapshot, changes the listed key at the next request
  (`terraform.md` AC2, AC10; AC37).

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
| `file` (default) | Software keys generated by the service, stored in the shared database **encrypted at rest** under the one instance master key, `deployment.md`'s `security.master_key` (its resolved master-key decision, was Q5 there: envelope encryption through `internal/security`, the same key the upstream-credential store and the OIDC exchange use), never on a filesystem path | Decrypted in process memory for the duration of a signing call | Any algorithm the standard library and go-crypto implement | Pulp and reprepro keep keys in a worker's gpg keyring; Nexus stores a pasted key; this backend is that class made encrypted, auditable and exportable never |
| `kms` | A key resolved by URI through `sigstore/sigstore`'s `kms.Get`: `awskms://`, `gcpkms://`, `azurekms://`, `hashivault://` | Never leaves the provider; the service holds a reference and a credential | What the provider offers for that key; checked at creation by signing a probe and verifying it | Sigstore's seam; Artifactory's Vault option |
| `pkcs11` | A key on a PKCS #11 token through `crypto11` (`Path`, `TokenLabel`, PIN from the environment or a file, never a flag) | Never leaves the token | RSA and ECDSA; **no Ed25519**, so a Hackage role or an Ed25519 Arch or Open VSX key on this backend is refused at creation with a message naming the ceiling | `crypto11`'s documented algorithm set |
| `external` | Public material only; signatures are produced off the server and submitted | The service never has it | Whatever the operator signs with; the submitted document is checked against the current one before it is served | TUF 6.1 offline root; `hackage.md` item 8 ("accepts a `root.json` the operator signed offline, verifies it against the current root, and serves it") |

**Keys follow the repository's lifecycle** (`repository-lifecycle.md`, deletion step 10 and
"Tombstone"). A rename changes nothing: `SigningKey` references the repository's identity, and
the key name a client configures (Alpine's key filename, Hex's pinned key) is a public form the
profile derives from the key, never from the repository name. Deleting a repository moves
**every key of the repository to `retired` in the deletion transaction**, so no document can be
signed under them afterwards; the keys' **public forms stay retrievable by digest until tombstone
time**, because a client that fetched a signed
document inside the retention window may still verify it against the key route; and the
**private material is destroyed at tombstone time**, when the pruner drops the `SigningKey`
material with the repository's last snapshot: a `file` key's encrypted row is deleted, a `kms`
or `pkcs11` reference is dropped (the provider's key is the operator's to destroy, said in the
operator guide), and an `external` key has nothing to destroy. The deletion write itself, the
completed write that produces a `local`'s final empty checkpoint snapshot, is the one completed
write on an `Indexer` repository that **runs no generator and renders no pointer document**: it
is exempt from the pre-commit hook (`repository-lifecycle.md`'s deletion steps, whose Fable
recheck exempted the deletion write from the hook and the pointer-document render;
`storage-and-gc.md` AC25; `data-model.md` AC36's one exception for the deletion's
default-pointer move), since a document set for a snapshot holding
nothing would be signed under keys the same transaction retires. AC29 asserts all four.

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
profile requires (the RPM key document, the dual-signed Alpine index). `management-api.md`'s
endpoint table carries the routes with that dispatch. No repository-scoped token can perform any
of them (`auth.md` AC30); on a `read_only` repository every one is refused `405` `read-only`,
because a `configure` through `Submit` opens a completed write that `repository.Writable`
refuses, and a rotation batch re-signs every served body, which is a client-visible change to
what a frozen repository serves: an operator who must rotate an archived repository's key, or
renew an `external` key's document, thaws, operates and freezes again
(`repository-lifecycle.md`, "Read-only", its was-Q11 and AC10; AC15). Every one that runs leaves
an audit line and an `Operation` (AC15): the
audit events are `signing.key.create`, `.activate`, `.retire`, `.import` and `.submit_external`
with `key_id`, `backend` and `profile` as extension attributes, registered in
`observability.md`'s audit vocabulary and emitted through `telemetry.Auditor.Emit`. The
management surface lists a repository's keys with purpose, algorithm,
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
| `announce-switch-retire` | Announce adds the new key to the key document and signs nothing; switch re-signs every served body and package signature under the new key alone and advances every `Last-Modified`; retire removes the old key from the key document | Arch ("every signature packet must verify with a trusted key", so a dual signature fails; `pacman-key --lsign-key` is manual); CPAN (its clients hold a keyring, and PAUSE's own 2027 subkey reached `check_sigs` users only through keyservers, so the new public key is published before it signs, then every `CHECKSUMS` any pointer serves is re-signed under it as one batch: `cpan.md` item 5, AC11) |
| `atomic-resign` | Activate re-signs every served body under the new key in one batch and the old key is retired in the same transaction; client-visible by design | Hex ("a Hex client pins exactly one key per repository and cannot hold two") |
| `additive` | Activate signs only what is produced from then on; every existing signature keeps its key, and the document that lists keys lists every key that signed anything still served; retiring a key outright re-signs everything it signed | Terraform ("all four clients accept a signature by any listed key", captured with two keys) |
| `root-chain` | A new `root.json` version whose key map keeps the old keys and which carries a threshold of signatures from both sets, kept cross-signed for an operator-set window; online roles rotate by a new root signed by the current root threshold | Hackage (a root "signed by the new keys alone is refused", "Unknown key" when an old signer is unlisted; captured on both cabal lines) |
| `by-digest` | Activate signs new documents with the new key; every public key stays retrievable by its digest for as long as a retained snapshot references a signature it made | Open VSX ("every public key retrievable by its digest") |

An earlier draft described CPAN as "`dual-signature`'s shape without dual signatures"; that is
`announce-switch-retire`, and the table now names it so. The window lengths are per repository configuration
with a default in this spec's configuration table. What rotation is **visible** to unattended
clients (RPM without `--gpg-auto-import-keys`, Arch without a locally signed key, Hex always,
Alpine clients that did not install the new key file) is each format's finding and is stated in
that format's operator documentation; the service's obligation is that the cutover is atomic
and that a client which did what the documentation says notices nothing.

**Re-signing on a cadence** (`debian.md` item 3: `Valid-Until` re-signed at half the window;
`hackage.md` item 5: `timestamp.json` and `snapshot.json` at half their window, `root.json` and
`mirrors.json` at half theirs, "for every pointer including idle environments") is a scheduled
production of pointer documents under the current keys, creating no snapshot. It runs as a
`Schedule` on `internal/async` of kind `signing.resign`, one per signed pointer, exclusivity key
`pointer:{repository}/{pointer}`; its next run is not a timer in memory but is derived from the
stored documents' expiry and `signing.resign_at_fraction` and written to the schedule in the
job's `Finish`, so a restart mid-schedule loses nothing (`async-operations.md`, "The scheduler",
its kind table and AC14). `Finish` rewrites next runs; it creates no `Schedule` row. The rows
are created by **one named entry point**, `signing.Service.RegisterSchedules(ctx, tx,
repository, nextRun)`: on the caller's transaction it registers, idempotently, one
`signing.resign` `Schedule` per signed pointer of the repository and the repository-scoped one
where the profile declares such a key, a new row taking the caller's `nextRun` and an existing
row left untouched, and it is the only writer of those rows outside `Finish`. Its callers are
two. The runtime, inside the write or repoint transaction that first gives a pointer a document
with a validity window, passes the value it derives from that document's expiry and
`signing.resign_at_fraction`, so a signed pointer never exists without its schedule and a
document signed in the write is not re-signed the moment it commits. `replication.md`'s
takeover transaction passes **now** (Design, "Replication", below), because the documents it
holds are the old leader's and the request's own re-sign may fail: a row due now is what makes
the cadence the retry path. The entry point is named rather than left to the first write
because a linked follower holds no such row at all, and a taken-over repository nobody writes to
would otherwise have no cadence. A repository whose profile declares a repository-scoped pointer document
(Design, "Storage") also has **one repository-scoped `signing.resign` schedule**, exclusivity key
`repository:{repository}`, which alone renews that document, as one repository batch across every
pointer; a per-pointer run never renews it, because per-pointer runs would each mint their own
version of a document that must have one (`hackage.md`'s resolved root-placement decision, was Q16
there; AC33). **The cadence runs on a `read_only` repository too.** A re-sign is a document-only
pointer transition, so it opens its transaction in the document-only form of
`storage-and-gc.md`'s single door, which consults `repository.Renewable` rather than `Writable`:
`active` and `read_only` pass, a replica and a deleted repository are refused
(`repository-lifecycle.md`'s resolved document-only-transitions decision, was Q11 there, its
AC9 and AC10). A frozen Debian suite therefore keeps a valid `Valid-Until` and a frozen Hackage
repository an unexpired `timestamp.json`, which is what "serving what it serves now" needs from a
signed archive; the one signing surface `read_only` does refuse is the key operations (below).
The gauge
`signing_earliest_document_expiry_timestamp_seconds{repository}` exposes the earliest expiry
among a repository's signed documents, and for an `external` root the `SigningDocumentExpiring`
alert fires at the configured lead (`signing.external_expiry_lead`, templated into the packaged
rule by `deployment.md`), well before expiry (AC22).

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
format spec already assigns there. A virtual repository whose member is a `remote` reads the
verdict of that member's documents and the **anchor class** the remote's adoption ran under
(`signature`, `integrity` or `none`; `artifact-verification.md`, "Anchor class" and AC31, which
define the class and have the adoption commit write it on the remote's cache-scoped record,
`data-model.md` AC44). These are the **index runtime's own reads**, taken through a read
interface `internal/index` declares and the composition root satisfies with
`artifact-verification.md`'s store and the cache-scoped record; they are not `format.Deps`,
which carries neither, because the merge runs in `internal/index` and the generator is pure, so
no handler ever reads a verdict or an anchor class (`format-handler-interface.md`, "The
scheduled re-open"). The read is a read, not a verification here, and what the merge does with
it depends on what it does with the document (the resolved admission decision below, was Q20,
which supersedes the composed half of the resolved pass-through decision, was Q17):

- **A document the merge composes** into a body the virtual signs (Debian's `Packages` behind a
  member's `InRelease`, Hackage's index behind its TUF chain, RPM's `primary` behind `repomd.xml`,
  an Arch or Alpine database, a CPAN author directory held by two members) is admitted when it is
  the member's current adopted revision and the **anchor class** the member was adopted under
  held: `signature` where the remote's trust set holds a signature anchor for the document (a
  vendor key, an upstream keyring, a TUF root, PAUSE's keys), which requires the verdict
  `verified`; `integrity` where the remote's declared anchor is an integrity entry that gates the
  adoption itself (`rpm.md`'s Fedora metalink: `artifact-verification.md` returns `match` or
  `mismatch` and `proxy-cache.md` commits nothing on a mismatch, so a current revision on such a
  remote passed its anchor by construction and its `absent` verdict is the taxonomy's, not a
  failure); and `none` where the remote declares no anchor at all, which is TLS to the configured
  upstream (Arch's and Manjaro's official mirrors sign no database; an Alpine remote without
  `alpine-keys`). A document whose verdict is `failed` is never admitted whatever the class, and
  under `signature` a verdict read as `absent` after a trust-set change is not `verified` and is
  excluded until re-evaluation restores it (fail closed, as `artifact-verification.md` reads a
  superseded revision). The merge records, per member and document, the anchor class and whether
  it was admitted or excluded with the reason, on the merged set's input record (`data-model.md`
  AC45), which is the operator record `debian.md` AC22, `arch.md` AC23, `rpm.md` AC22 and
  `alpine.md` AC20 name. "A `failed` verdict is never admitted" is coherent with "no anchor
  admits" because a remote whose trust set holds no entry of the scheme's kind is class `none`
  with an `absent` verdict, never `failed` (`artifact-verification.md`, "Anchor class", AC31):
  `failed` is produced only where a configured anchor actually rejected the document, so the
  rule excludes exactly what the operator's own configuration refused. What the virtual's
  signature therefore attests is **composition from
  members at the trust level the operator configured for each**, the same statement a hosted
  repository's signature makes about content its publishers pushed, not a verification the
  registry performed: a format whose remotes must carry an anchor (`debian.md` refuses a remote
  with no keyring at its first fetch; `hackage.md` needs a root) is strict by construction, and a
  format whose upstreams sign nothing gets a virtual its clients can require a signature on,
  which the remote alone cannot give them.
- **A virtual that signs nothing** (CRAN, conda, RubyGems, Maven, LuaRocks, opam, Chef) has no
  admission rule: every member's current documents contribute whatever their verdicts and
  anchors, because its merged index vouches for nothing a client could mistake for the
  registry's verification, and the file a client then fetches is verified at the member exactly
  as at the member's own URL. AC36 binds signed bodies only and says so.
- **A document the profile declares pass-through** is served by the virtual verbatim, byte for byte
  with the upstream's own signature, never re-signed, never parsed into a merged body and never the
  subject of a `Signature` record, and it is admitted **whatever its verdict**: `verified`, `failed`
  or `absent`. The virtual then serves exactly what the remote member serves at its own URL, under
  the same verdict and the same policy evaluation (a rule requiring a verified signature refuses it
  at serve time, as it would on the remote), so the virtual adds no trust and removes none; the
  client's own check against the upstream's key is the one that applies. `cpan.md`'s per-author
  `CHECKSUMS` is the case: PAUSE signs them with subkeys the operator's trust set may not hold (its
  2027 subkey reached only the keyservers), so a verified-only rule would drop every public author
  directory and CPAN.pm would refuse every public install through the virtual (`cpan.md`, "Virtual
  repositories", AC26). A document present in more than one member is composed, not passed
  through, and falls under the first rule: a shared author directory takes the remote's entries
  under anchor class `none` (no PAUSE key configured on the remote) and under a `verified`
  verdict, and drops them when a configured PAUSE key does not verify the directory's `CHECKSUMS`
  (`failed`), whose cure is the keyserver import `artifact-verification.md` provides (its
  "Sources" paragraph: a re-import of a held fingerprint brings the subkeys the keyserver has
  since seen, and the next re-evaluation turns the `failed` into `verified`; the class rule is its
  "Anchor class", AC31), so no entry-level rule is needed there.

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
`chef.md` item 5, `maven.md`'s virtual metadata, `opam.md` item 6), "run as deferred work, never
on a request's path" (`debian.md` item 7, `hackage.md` item 10, `cpan.md` item 6). `vagrant.md`
is not a merge consumer: its resolved virtual-catalog decision (was Q13 there) resolves each box
name per request, because a remote member cannot be enumerated, and serves the supplying member's
catalog through `ServeDocument` under the virtual's name, with no `Merge` in its profile; nor are
`julia.md` (an unmerged union), `composer.md`, `homebrew.md` and `pub.md`, which resolve per
request too. The service's obligations:

- **What a member contributes.** A member is a `local` or a `remote` of the virtual's format,
  never another virtual (`repository-lifecycle.md`, the member-list row). A `local` member
  contributes the document set of its **default pointer**, its head (`storage-and-gc.md`'s
  resolved head decision, was Q12 there), so an environment pointer of the member is invisible to
  the virtual; a `remote` member contributes its current adopted documents. The merge reads every
  input **by the digest the member's current document declares**, through the CAS, never through
  a cached reference: on a remote, the documents a revision names are declared on its list for as
  long as the revision is current or retained (`rpm.md`'s resolved merge-input decision, was
  Q11 there; `proxy-cache.md` AC27), and the eviction pass never ends a declared document while
  it is declared (`proxy-cache.md` AC14, AC29: a `primary` held by a cached reference and by the
  revision's list at once is skipped by the pass and counts in `cache_metadata_bytes` until the
  adoption that drops the revision), so the merge's inputs are independent of the member's quota
  pressure by construction rather than by luck, and a declared digest whose blob is missing (a
  store fault, never an eviction) is a failed merge that keeps the previous set and alerts (Never
  a gap, below), never a merge over a partial member.
- **Trigger and coalescing.** A completed write on a member enqueues a merge for every virtual
  that lists it, and so does a target-moving transition of a `local` member's default pointer (a
  promotion into it, a rollback), through the runtime's `Transition`, since a rollback changes
  what the member's head holds without any write (`debian.md` AC22's and `cpan.md` AC26's "merge
  after a member's rollback"); merges for one virtual within a coalescing window run once; the
  window and a staleness bound (a member write is visible in the virtual within it) are
  configuration. This is the one place the service coalesces, because no snapshot is at stake. A `virtual` whose
  format declares an `Indexer` also has its **first merge enqueued at creation**, and one per
  member-list change, so its merged documents exist before the first client request rather than
  being rendered on the first miss (`repository-lifecycle.md`, creation step and the member-list
  row of its configuration table). A **rename of such a virtual enqueues one merge** in the
  rename transaction, coalesced like any trigger, instead of the `configure` rename a handler's
  `Apply` would receive on a `local`: a virtual's documents are rendered by the merge, never by
  `Apply`, so a merged document that embeds the name (a Debian `Release`, which that spec names
  for the hosted case) is re-rendered under the new one within the staleness bound, and a format whose merged documents
  embed nothing does one idle merge (`repository-lifecycle.md`, "Renaming", its AC29; AC19).
- **A remote member's adoption re-merges** (the resolved remote-member decision below, was Q16).
  A remote adopting a new upstream revision is cache materialisation, not a write, so no
  pre-commit hook sees it; `proxy-cache.md` commits an adoption in one transaction (its
  "Freshness of what a remote serves"), and the runtime registers on that **adoption commit** as
  it does on the write path's pre-commit hook. `Adopt` receives the remote, the adopted document
  keys and what the handler's **adoption check** returned for the revision: its ordering value,
  the event classes observed, the records `FromUpstream` consumes and the digests of the blobs it
  keeps (`proxy-cache.md`, "Obligation to the handler interface", AC25). Inside the adoption
  transaction it runs the format's `FromUpstream` over exactly those records where the format
  regenerates (The proxied path, below), so the runtime never parses an upstream body itself, and
  enqueues `index.merge` for every virtual listing the remote, with the same coalesce key as a
  member write. This is the trigger `conda.md`, `arch.md`, `alpine.md`, `rpm.md`, `hackage.md`,
  `cpan.md`, `cran.md`, `debian.md` and `opam.md` each asked for.
- **A remote reached only through a virtual is kept fresh by the virtual's reads.** Such a remote
  receives no request of its own, so `proxy-cache.md`'s TTL revalidation, which is driven by
  client requests and never by polling (its resolved signal-detection decision), would never run
  for it. Each merged set therefore records its **inputs**: per member, the member's repository
  identity and the freshness value (a local member's `moved_at`, a remote member's `adopted_at`)
  of the documents it read. When `ServeDocument` serves a virtual's merged document and one of
  its remote inputs is past that remote's metadata TTL, it calls `proxy-cache.md`'s
  `EnqueueRevalidation` in a transaction of its own that holds only the job row, and serves the
  current merged set whether or not that transaction commits: the read commits nothing else, so
  there is no data for the job to see uncommitted and no rollback for it to outlive, and the
  enqueue still goes through `Enqueue(ctx, tx, Job)` (`async-operations.md`, "Enqueue is
  transactional"). The job is coalesced per remote, and the revalidation is `proxy-cache.md`'s
  own, so an adoption it produces re-merges through the trigger above. A virtual's creation, and
  a member-list change adding a remote whose documents were never adopted, calls the same
  function inside the transaction making the change, and that remote's first fetch replays the
  member inputs the profile declares (above): the templates expanded over the values the other
  members hold, the format's constants and the virtual's settings, then the derivations over what
  that round adopted, in bounded rounds, so a fresh remote contributes before the first client asks
  (`opam.md`'s "until those land, the operator recipe warms a new remote" becomes unnecessary).
  **A cell only the remote holds** (a binary tree no other CRAN member serves, a conda subdir, an
  Alpine tree, an RPM tree) is covered by no such source, so it is fetched **read-driven**: a
  request to the virtual for a document key at a cell whose values fit the template's variable
  grammar and that no member input covered records the cell on the virtual's input record and
  enqueues each remote member's revalidation in the same enqueue-only transaction, answering the
  request as the merged set stands (a `404` for the cell); the interface then includes the
  recorded cells in the remote's inputs, a cell the upstream answers `404` becomes the remote's
  negative entry and is not replayed again until it lapses, and the cell is admitted into the
  merged set by the merge the adoption enqueues. The record is made **only** by `ServeDocument`
  inside a request the router authorized on the virtual, after the authorizer and before the
  handler's response (`format-handler-interface.md` AC18), never by the replay entry, a job or
  any other path, and only for a value fitting its variable's grammar (`auth.md` AC36, as
  amended on Fable). A cell is written as (variable, value, recorded-at, last-requested-at) to
  the part of the input record that **survives the swap** (`data-model.md` AC45: a merge that
  ran between the miss and the replay would otherwise erase it before anything fetched it); a
  repeat request for a recorded cell updates `last-requested-at` and enqueues through the same
  coalesced call. The set is **bounded and pruned** (the resolved requested-cell decision below,
  was Q22): a cell is dropped once its expansion is a cached route of the remote (the entry's
  recorded route carries it from then on, so the declaration is not read again) or once the
  negative entry its `404` created has lapsed with no request since (its `last-requested-at`
  older than the remote's negative-cache TTL at the lapse, `proxy-cache.md`, "Negative
  caching"); and a virtual holds at most `index.requested_cells_max` cells, past which a new cell
  is **not recorded** and enqueues nothing, the request still answered from the merged set, so a
  client cannot evict another's cell and the upstream traffic a virtual's clients can cause is
  at most the cap, once per negative window, per remote. The gauge
  `index_requested_cells{repository}` shows the set's size, so a virtual at its cap is visible.
  The cost is one miss per remote-only cell per
  virtual, coalesced with every other revalidation of the remote; a client that probes several
  representations of one cell (R's three index files) records one cell. The accepted cost of the
  whole: the first read after the TTL is served the previous
  merged set, so an upstream change reaches a virtual's clients within the TTL plus the
  revalidation plus the staleness bound, against the TTL alone for a direct client of the remote.
- **Freshness moves forward at every merge commit** (the resolved virtual-freshness decision
  below, was Q15). A merge commit, and a member-list change, is a **document-only transition of
  the virtual's default pointer**: `data-model.md`'s pointer transition advances its `moved_at`
  and generation counter in the merge's swap transaction, with no snapshot and no change of
  target. So a merged Debian `InRelease` carries a `Date` later than the last one the virtual
  served (`debian.md` AC22), a merged Hackage `timestamp.json` and `snapshot.json` carry a higher
  TUF version (`hackage.md` AC27), and a merged CPAN index a later `Last-Modified` that cpm and
  Carton revalidate against (`cpan.md` AC26), each rendered from the record like any pointer's.
  For a virtual that resolves per request, `ServeRendered` serves the latest of the virtual's
  pointer record and the members' records for the name, and a member-list change moves the
  virtual's `moved_at` to no earlier than one second after the latest value the virtual served,
  so removing the member that supplied the latest value cannot send `Last-Modified` backwards
  (`composer.md`, `homebrew.md` AC20). `data-model.md` lists both as document-only transitions and
  derives the floor with no stored record of what was served ("Freshness scoped to the pointer",
  AC36), and records the merged set's input record (below) as non-root metadata (AC45).
- **Never a gap.** The previous merged document set serves until the new one commits atomically;
  a merge that fails leaves the previous set and an alert, never an empty index.
- **Signed with the virtual repository's own key** under its format's profile, so a virtual is a
  repository in every client-visible sense, except the documents the profile declares
  pass-through, which keep the upstream's signature and carry no record of ours (The
  produce/verify boundary, above); `hex.md` declares no merge because "the repository name is
  inside the signed payload", and `format-handler-interface.md`'s `Capabilities()` field
  `Virtual: unsupported` is what the profile's absent `Merge` expresses for it.
- **Storage** as the virtual's current documents, CAS-backed above the threshold, protected by the
  fourth root's current-document half (`storage-and-gc.md` AC16), with the input record above as
  metadata on them, not a root. The swap that installs a merged set writes each merged document's
  **declared blob-digest list** through `storage-and-gc.md`'s shared reference-creation call, in
  the swap transaction: the document's own parts (a merged Hackage index's segments) and the
  bodies of the **predecessor merged generations** the profile declares it retains (`debian.md`
  declares two, for the `by-hash` race a virtual has no snapshots to cure; zero by default), so a
  client that fetched the previous envelope still finds the indices it names while the count
  holds; the swap after the count drops the oldest, and the virtual's deletion ends the list with
  its documents (`repository-lifecycle.md`, deletion). The merge commit is therefore a
  declared-list producer in that spec's property suite and AC16 fixture, which this spec's AC19
  shares.
- **Execution** is the `index.merge` job kind on `internal/async`: the member's write transaction
  enqueues it through the pre-commit hook, and a remote member's adoption transaction through the
  adoption hook, with coalesce key `virtual:{repository}`, the same
  exclusivity key and `run_at` of now plus `index.virtual_merge_window`, so a second member write
  inside the window finds the pending row and enqueues nothing, a write during a running merge
  yields exactly one more, and the staleness bound is measured as
  `index_virtual_merge_staleness_seconds{repository}` with `VirtualMergeStalenessBreach` and
  `VirtualMergeFailed` as the alerts (`async-operations.md`'s kind table and AC11;
  `observability.md`'s catalogue). The queue core lands at the start of charter step 4b and this
  spec at step 7, so there is no fixture runner: AC19 asserts the contract on the production
  runtime.

### The proxied path

A `remote` repository's documents are the upstream's, served verbatim with the upstream's
signatures (Scope). Where a format regenerates on the proxied path (`cran.md` item 6,
`luarocks.md` item 8, `chef.md` item 6, `opam.md` item 7: "the same generation on the proxied
path from records parsed out of the upstream"; and `vagrant.md`, whose remote catalogs are
`FromUpstream` output served with the same serve-time URL expansion as a hosted catalog), the
records the handler parsed from an upstream revision reach `FromUpstream` inside the adoption
transaction, through the runtime's adoption hook (Virtual merges, above), and the result is stored
as the remote's current document, **unsigned**, with the cache-scoped freshness `proxy-cache.md`
owns. The service creates no key for a `remote`, and a test asserts that no `Signature` record
ever names a `remote` repository (AC20).

### Replication: pointer documents travel, followers sign nothing

`replication.md` transfers snapshots and the pointer set; with signatures and pointer documents
outside snapshot content, a follower that only received snapshots would have to sign envelopes
it has no key for. Per the resolved follower decision below, `Signature` and `PointerDocument`
records **travel with the pointer set** as opaque records on the replication read surface, the
follower serves them verbatim (its `Last-Modified` is the leader's freshness record, replicated
with the pointer), and a follower **signs nothing while a link is active**, so it also holds no
`signing.resign` schedule: the cadence's next run is derived from documents the repository
signed itself and written in the re-sign job's `Finish`, and a linked follower has never
re-signed. At takeover the follower must sign, **and it signs at once** (`replication.md`'s
resolved takeover-signing decision, was Q12 there, in three parts the door's shape dictates):

- **Precondition.** The takeover is refused with a problem naming the missing keys unless every
  active key of the repository is resolvable on the follower, which means a `kms` or `pkcs11`
  key reachable from both instances, or a `file` key created on the follower and announced under
  the repository's rotation profile before the takeover, which the operator guide describes as
  the replicated-repository key recipe (`deployment.md`'s Recipes). This is why a `file` key is
  the wrong choice for a replicated repository, which the documentation says.
- **The takeover transaction registers the cadence.** Under the link row lock, the transaction
  that ends the link and disables its `replication.sync` schedule calls
  `signing.Service.RegisterSchedules(ctx, tx, repository, now)` (Design, "Rotation profiles"),
  the named entry point that creates the repository's per-pointer and repository-scoped
  `signing.resign` rows, here with their next run now. It is named because this caller is not the
  runtime's first signed write and not the worker's `Finish`: a taken-over repository that
  receives no write, the disaster-recovery case, would otherwise serve the old leader's documents
  with nothing to renew them until their `Valid-Until` or TUF expiry lapsed.
- **The same request re-signs.** After that commit the request runs the repository's re-sign as
  one batch across every pointer through the door's **standard document-only form** under
  `repository.Renewable`, which passes once the link is `ended` (`storage-and-gc.md` AC25; the
  on-a-transaction form is the job runner's alone, which is why this cannot be one transaction
  with the step above): every pointer document is re-rendered under the follower's resolved keys
  as a document-only transition of each pointer (a repository-scoped document at one new version
  on every pointer, the shape AC33's renewal takes), and the schedules' next runs are written
  from the renewed documents' expiry, exactly the cadence's effect on the request path. The keys
  are proven by use at the one moment an operator is watching. **A resolved key that refuses to
  sign** fails that render with nothing of it committed (AC17's self-check and the signer's own
  error alike): the link stays `ended`, since the operator has already fenced the old leader and
  the takeover is not undone; the documents stay the old leader's; the schedules just registered
  stand; the request fails naming the key; and `SigningFailed` fires on each cadence attempt
  until the key signs, at which point the retry renews the documents. A format that declares no
  signing has no keys to resolve, no row to register and nothing to render, and both steps are
  empty.

AC23 asserts the precondition, the registration, the in-request re-sign and the failing-key
outcome, and `replication.md` carries the other side: its AC21 asserts the verbatim records, the
equal bytes and `Last-Modified`, no signing and no schedule while linked, the takeover refusal
naming each unresolvable key, the schedules registered in the ending transaction and the
re-render in the request, with the link's state exposed by its AC10 and its AC16 keeping a
`read_only` taken-over repository frozen while its cadence proceeds.

### Configuration and CLI stance

Following the vendored `cobra-viper` skill, `internal/signing` and `internal/index` each receive
a typed `Config` with a default for every key, import neither Viper nor Cobra, and every key is
settable by environment variable and configuration file in that skill's precedence order; **no
`signing.*` or `index.*` key has a flag**, because `deployment.md`'s flag set is fixed at eight
(seven keyed flags and `--config`, its resolved flag-set decision, was Q3 there) and a key marked
`secret` never has one (AC26). There is no CLI in v1 beyond the server binary, matching
`management-api.md`'s resolved API-first decision; key operations are API calls
(`deployment.md`'s `keys` subcommand manages the instance master key, not signing keys).
`deployment.md`'s key inventory documents these fifteen keys (nine `signing.`, six `index.`) and
its two-way check holds the inventory equal to this table; they are named here because they are
this service's policy:

| Key | Default | Meaning |
|---|---|---|
| `signing.default_backend` | `file` | Backend for keys created with a repository |
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
| `index.render_memo_bytes` | `256 MiB` | Per-process bound on memoised serve-time renderings and encodings; above it an entry is evicted, and an output larger than it streams from `Render` on every miss |
| `index.requested_cells_max` | `256` | Most read-driven cells one virtual's input record holds; a request for a further cell is answered from the merged set and records nothing (the resolved requested-cell decision, was Q22) |

There is no `signing.master_key`: the key that encrypts `file` keys at rest is
`deployment.md`'s `security.master_key` (or `security.master_key_file`), the one instance master
key, required at start, never a flag value, rotated by re-wrap (its resolved master-key decision,
was Q5 there). The inline size threshold is `data-model.md`'s knob, not this spec's.

**Observability.** The service emits, from `observability.md`'s catalogue,
`signing_operations_total{profile,backend,outcome}`, `signing_duration_seconds{backend}`,
`signing_keys{state,backend}`, `signing_earliest_document_expiry_timestamp_seconds{repository}`,
`index_lock_wait_seconds`, `index_lock_timeouts_total`, `index_write_retries_total`,
`index_virtual_merge_staleness_seconds{repository}`, `index_virtual_merge_staleness_breaches_total`,
`index_virtual_merges_total{outcome}` and `index_requested_cells{repository}` (the read-driven
cell set's size against `index.requested_cells_max`, state-derived from the input record and so
exported by the scheduler leader like every state-derived gauge, with the rows beyond
`telemetry.metrics.repository_label_limit` folded into `_other` by **maximum**, since the signal
is "some virtual sits at its cap" and a sum would hide it; `observability.md`'s catalogue row);
the alerts `SigningFailed` (AC17),
`SigningDocumentExpiring` (AC22), `VirtualMergeFailed` and `VirtualMergeStalenessBreach` (AC19)
through `telemetry.Alert`; and the `signing.key.*` audit events (AC15). Private material is held
in types implementing `slog.LogValuer` (`telemetry.Secret` or the backend's own), so a key can
never reach a log record by accident, which AC14's scan runs through `telemetry.NewTestRecorder`.
The `component_up{component="signing_backend"}` gauge mirrors readiness when a `kms` or `pkcs11`
backend is configured.

### Package shape

`internal/index`: the runtime (`Runtime` with `Regenerate`, registered on the write
transaction's pre-commit hook; `Adopt`, registered on `proxy-cache.md`'s adoption commit and
handed the handler's adoption-check result;
`Transition`, invoked by the pointer store at a repoint, which also enqueues `index.merge` for a
member's target-moving transition; `Merge`, the `index.merge` worker
registered on `internal/async`; `MemberInputs`, the runtime's answer to `internal/proxy`'s
member-input interface for a remote's current state (templates, derivations through the
generator's `DeriveInputs`, recorded cells, and the profile's round bound); `Admission`, the
read interface the merge takes a remote member's verdicts and anchor class through, declared
here as the consumer and satisfied at the composition root by `internal/verify`'s store and
`data-model.md`'s cache-scoped record, never carried by `format.Deps`
(`artifact-verification.md` AC31); the serving forms
`ServeDocument`, `ServeRendered`, `ServeFile`
and `SignedBy`, handed to handlers only as the `Documents` interface), the value types a
generator and a handler use (`Generator`, `Profile`, `DocumentKey`, `Change`, `Input`, `Output`,
`ServePolicy`, `Variant`, `MemberInput`), the render memo, and the freshness helper. `internal/signing`: `Service` with `Sign`, `SignBlob`, `PublicKeys`, and the
key operations; `RegisterSchedules`, the one entry point that creates a repository's
`signing.resign` `Schedule` rows on a caller's transaction, used by the runtime at a signed
pointer's first document and by `internal/replication`'s takeover transaction (Design, "Rotation
profiles", "Replication"); the `signing.resign` worker; backends in `internal/signing/filekey`,
`internal/signing/kms`, `internal/signing/pkcs11` and `internal/signing/external`, each yielding
a `crypto.Signer`; envelope codecs in `internal/signing/openpgp`, `internal/signing/tuf`,
`internal/signing/raw` and `internal/signing/jws`; HTTP handlers for the key routes registered
under the `api` mount. The consumer interfaces (`Indexer`, `Documents` and the `Signing` handle's
interface) are declared in `internal/format` beside `Deps`, in the go skill's sense: the consumer owns the
interface, the concrete types satisfy it. Each format's generator is `internal/format/<name>/index`.
**Neither package starts a goroutine that outlives a request**, owns a `time.Ticker` or a
`time.AfterFunc`: the cadence is a `Schedule` and the merge a job, both on `internal/async`,
whose AC16 holds the rule for every package with an AST scan; the shutdown path is the queue's.

**The runtime reaches `internal/proxy` in one direction only** (the resolved proxy-import
decision below, was Q19). `internal/index` imports `internal/proxy` for the two things it uses
there: `EnqueueRevalidation`, which `ServeDocument` and the virtual's creation and member-change
paths call, and the adoption hook's registration type, which `Adopt` satisfies. `internal/proxy`
imports neither `internal/index` nor `internal/signing`: the member-input paths a
`proxy.revalidate` job replays for a never-adopted remote reach it through a one-method interface
`internal/proxy` declares and the runtime satisfies (the consumer owns the interface), handed to
`internal/proxy` by the composition root at construction beside the replay entry
(`format-handler-interface.md` AC18), and the adoption hook is registered there too, never
through a global. So the cycle the two packages could form, the cache calling the renderer that
calls the cache, is ruled out by the import graph rather than by review.

### Mechanical enforcers

Per the constitution, every boundary this spec introduces names the test that holds it:

| Boundary | Enforcer |
|---|---|
| No handler package (`internal/format/<name>`) and no generator package (`internal/format/<name>/index`) imports `internal/signing/**`, a signature library, or `crypto/*` signing primitives; only `internal/signing/**` imports a signature library | `internal/format/signing_boundary_test.go` (import graph, module-wide), the shape `artifact-verification.md` AC4 and `auth.md` AC9 use |
| A generator package imports nothing of the registry but `internal/index`'s value types: no `Deps`, no `net/http`, no store | `internal/index/generator_purity_test.go` (import graph over every `internal/format/*/index`) |
| Generation runs only inside the runtime: no package outside `internal/index` calls a `Generator`'s `Generate`, `Merge`, `FromUpstream`, `Render` or `DeriveInputs` | `internal/index/arch_test.go` (call-graph scan) |
| A merging profile's member inputs are closed: every member-read key has an input, every template variable a source and a grammar admitting no empty, dot or slash-bearing segment, every derivation a declared key to derive from; the round bound is the chain length plus one; a value not fitting its grammar is never expanded or recorded and every expansion normalises to itself | `internal/index/profile_test.go` (fixture profiles: a missing input, an unsourced variable, a derivation from an undeclared key, a grammar admitting `..` or `/`, each refused at registration; the reported bound for a two-round profile); `internal/index/virtual_remote_member_test.go` (values from a member, from `settings` and from a request that do not fit, never expanded, never recorded; every route handed to the interface equal to its cleaned form under the mount) |
| A signed document key declares no serve-time stage that changes its bytes | `internal/index/profile_test.go` (registration of a fixture profile declaring a URL expansion on a signed key is refused) |
| Every write transaction on a repository with an `Indexer` regenerates before commit; a handler cannot skip it | `internal/index/dispatch_test.go` (fixture handler; a write with the hook disabled fails to commit) |
| Signing refuses outside a write transaction, pointer transition or rotation; no read path can sign | `internal/signing/context_test.go` plus `internal/index/read_path_test.go` (serving a document with the signer instrumented; zero calls) |
| No handler package sets `Last-Modified` or `ETag` or reads `If-Modified-Since`, `If-None-Match` or `If-Range` itself, whatever it serves; its validators come from `ServeDocument`, `ServeRendered` or `ServeFile` | `internal/format/freshness_boundary_test.go` (string-literal and header-constant scan over every handler package, generator packages included, module-wide) |
| Private material appears in no response, log line, metric, error or export | `internal/signing/never_display_test.go`, the shape `credential-management.md`'s display-once test uses |
| Every produced signature verifies under `internal/verify` before commit | `internal/signing/selfcheck_test.go` (fault-injected backend returning a bad signature) |
| Key routes are under `api`, mapped through the central authorizer, admin only, and in the OpenAPI document | `internal/signing/arch_test.go` (the shape `management-api.md` AC2 uses); `management-api.md` AC25's `internal/manage/openapi/openapi_test.go` covers the routes |
| One write, one snapshot, generated documents included; a refused write leaves no document | `internal/index/accounting_test.go` (property test with fault injection) |
| `internal/proxy` imports neither `internal/index` nor `internal/signing`; `internal/index` references `internal/proxy` only for `EnqueueRevalidation` and the adoption hook's registration | `internal/proxy/arch_test.go` (import graph, beside `proxy-cache.md` AC26's single-call-site assertion); `internal/index/arch_test.go` (scan of the `internal/proxy` identifiers `internal/index` references) |

## Acceptance Criteria

- [ ] AC1: A completed logical write on a repository whose handler declares an `Indexer`
      produces exactly one snapshot that holds both the change and every document
      `Affects` names regenerated, with no code in the handler package requesting
      regeneration, on a wire write, a management operation, a seed-path write and a
      retention pass alike, the deletion write being the one completed write that runs no
      generator (AC29); a write refused or failed at any point leaves no snapshot and
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
- [ ] AC11: Every generated document and every cached metadata document of a remote is served
      through `ServeDocument`, every handler-rendered document through `ServeRendered` and every
      stored file through `ServeFile`, and no handler package, anywhere in the module, sets
      `Last-Modified` or `ETag` or reads `If-Modified-Since`, `If-None-Match` or `If-Range`
      itself. `Last-Modified` is the freshness source's forward-moving value (the serving
      pointer's record, a remote's cache-scoped record, or the latest of a per-request virtual's
      own and its members' records), a document and its signature carry one `Last-Modified`, and
      a rollback moves it forward. A matching `If-None-Match` answers `304`. Under the default
      `exact` rule an `If-Modified-Since` equal to the current value answers `304` and any other,
      earlier or later, answers `200` with the current value; under a declared `not-earlier` rule
      one not earlier answers `304` and one earlier answers `200`, so no `200` carries a
      `Last-Modified` at or before the condition. Proven with a curl `--time-cond` client that
      sees a rollback under both rules and receives `304` rather than a discarded body to a later
      condition under `not-earlier`, and with an `exact` document whose later, unequal condition
      receives the body (CPAN.pm's fallback).
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
      including an admin-owned one and refused `405` `read-only` on a `read_only` repository
      with no key state changed, mounted under `/api/v1/repositories/{name}/signing-keys`,
      present in the OpenAPI document, and each leaves exactly one audit line (the
      `signing.key.create`, `.activate`, `.retire`, `.import` or `.submit_external` event with
      `key_id`, `backend` and `profile`) and one `Operation`.
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
- [ ] AC19: On the production runtime (`internal/async`, the `index.merge` kind), a completed
      write on a member of a virtual repository makes the member's change visible in the
      virtual's documents within the staleness bound, merges for one virtual inside the
      coalescing window run once, a virtual created with an `Indexer` format has its merged
      documents before its first request, the previous merged set serves without a gap until the
      new one commits, a failed merge leaves the previous set and fires `VirtualMergeFailed`, a
      breach of the bound fires `VirtualMergeStalenessBreach`, the merged set is signed with the
      virtual repository's own key, and no merge runs on a request's path. A `local` member
      contributes its default pointer's document set: a promotion into or a rollback of that
      pointer enqueues the merge inside the repoint and the virtual serves the member's new head
      within the bound, while a repoint of the member's environment pointer changes nothing in
      the virtual. The merge reads every member input by the digest the member's current document
      declares: an eviction pass run against a remote member under quota pressure skips every
      declared input, so a merge after it lists the member's records unchanged, and a merge whose
      declared input blob is missing fails, keeps the previous set and alerts. `Merge` receives the virtual's previous merged set, so a merged
      `/versions` of a RubyGems-shaped fixture is a byte prefix of the next merge's and a warm
      client's ranged refresh receives a `206`. The swap writes each merged document's declared
      blob-digest list, holding its parts and the number of predecessor generations the profile
      declares (two for a Debian-shaped fixture, zero by default): a sweep with the grace lapsed
      between three merge commits leaves the two predecessors' indices fetchable by hash and
      collects the third, and the virtual's deletion ends the list. A rename of the virtual
      enqueues exactly one coalesced merge in the rename transaction and calls no handler
      `Apply`, and the merged set serves under the new name within the bound.
- [ ] AC20: A `remote` repository's regenerated documents (CRAN, LuaRocks, Chef, opam and Vagrant
      from upstream records) are produced through `FromUpstream` by the same generator as the
      hosted path, inside the transaction that adopts the upstream revision, over exactly the
      records the handler's adoption check returned for that revision, and stored unsigned; no
      `Signature` record and no key ever names a `remote` repository.
- [ ] AC21: A repository seeded through the harness's `state` entries serves generated and signed
      documents byte-identical to those a publish of the same content produces, and the case can
      read the repository's public keys from the server before its client runs.
- [ ] AC22: A document with a validity window is re-signed at `signing.resign_at_fraction` of its
      window for every pointer including idle environment pointers and on a `read_only`
      repository, whose frozen content stays bit-identical while its envelope renews, through
      the door's document-only form under `repository.Renewable` (refused on a replica and a
      deleted repository), creating no snapshot, by the
      `signing.resign` schedule on the production scheduler whose next run is derived from the
      stored document's expiry and survives a restart mid-schedule with no re-sign lost or
      duplicated; `signing_earliest_document_expiry_timestamp_seconds{repository}` reports the
      earliest expiry, and an `external` key's document nearing expiry fires
      `SigningDocumentExpiring` at `signing.external_expiry_lead` before it.
- [ ] AC23: `Signature` and `PointerDocument` records travel with the pointer set to a
      follower, which serves them verbatim under the leader's freshness record, produces no
      signature and holds no `signing.resign` schedule while linked; a takeover is refused with
      a problem naming the unresolvable keys unless every active key of the repository resolves
      on the follower, and when they do the transaction that ends the link registers the
      repository's per-pointer and repository-scoped `signing.resign` schedules through
      `RegisterSchedules` with their next run now, and the same request re-renders every pointer
      document under those keys through the door's standard document-only form, writing the
      schedules' next runs from the renewed documents' expiry, so that with no write after
      takeover a real client still installs after the old leader's documents would have expired;
      a resolved key that refuses to sign leaves the link `ended`, the documents the leader's and
      the schedules registered, fails the request naming the key, and fires `SigningFailed` on
      each cadence attempt until the key signs, after which the cadence's retry renews the
      documents; a format declaring no signing registers nothing and renders nothing at
      takeover.
- [ ] AC24: A format whose profile declares no signing profile receives generation with no key
      created for its repositories and no signature record, and a format whose profile declares
      no document keys receives signing with no generated document.
- [ ] AC25: Every generator is deterministic: the same records, freshness record and key set
      produce identical bytes across two runs and across a restart, `Render` produces
      identical bytes for the same stored body, variant and serve-time inputs, and `DeriveInputs`
      produces the same path list for the same document bytes, proven by the
      runtime's determinism harness over every registered generator's golden fixtures.
- [ ] AC26: Every configuration key in the table has a default, is settable by environment
      variable and file in the documented precedence, has no flag (the registry's flag set is
      `deployment.md`'s fixed eight, none of them a `signing.*` or `index.*` key), and
      `internal/signing` and `internal/index` import neither Viper nor Cobra; the PIN is never
      accepted as a flag value,
      no `signing.master_key` key exists, and the `file` backend reads the master key only
      through `internal/security` (`deployment.md` AC4 refuses `security.master_key` as a flag).
- [ ] AC27: The runtime and the pointer store hold the split: the pointer's `moved_at` and
      generation counter are written only by `data-model.md`'s pointer transition, and every
      freshness value this service renders (`Date`, TUF version, `Last-Modified`) is read from
      that record, never computed from a clock in this service, proven by an injected clock
      whose value never appears in a served header or document.
- [ ] AC28: N concurrent publishes into one tree complete within the configured lock wait with a
      bounded retry count and no livelock, and a lock timeout fails the write with a problem
      rather than committing without regeneration, as benchmark and property gates.
- [ ] AC29: A renamed repository keeps every `SigningKey`, signature record and served public
      form byte-identical with no re-sign; deleting it moves every key of the repository to `retired`
      in the deletion transaction so that a signing call under any of them is refused, its public
      forms stay retrievable by digest until tombstone time, and at tombstone time the pruner
      destroys the private material (the `file` row gone from a database dump, the `kms` and
      `pkcs11` references dropped) while the public forms cease to resolve; the deletion write
      runs no generator and renders no pointer document, with the generator and the signer
      instrumented to zero calls across it.
- [ ] AC30: Every serving form takes its validators, `Cache-Control`, encodings and range support
      from a serve policy (a generated key's profile, or a handler's package-level constant) that
      carries no date; `Cache-Control` is identical across every repository of a format and no
      repository configuration changes it. A policy offering `gzip` answers a request admitting it
      with `Content-Encoding: gzip`, `Vary: Accept-Encoding` and a strong `ETag` distinct from the
      identity encoding's, and a policy offering none never sets `Content-Encoding`. A policy
      with range support answers one byte range of a stored document, including one consisting of
      declared blobs, with `206` and `Content-Range` whose bytes equal that slice of the whole, an
      unsatisfiable range with `416`, and a stale `If-Range` with the whole body; `ServeFile` also
      answers several ranges as `multipart/byteranges`; proven by Hackage's incremental `Range`
      update and dnf5's zchunk refresh. A policy declaring the `body-md5` `ETag` derivation
      serves the quoted lowercase hex MD5 of the identity body as its `ETag`, and one declaring a
      `Repr-Digest` sends `sha-256` over the whole identity representation on `200` and on every
      `206`; both are stored with the document at generation on a hosted repository and at
      adoption on a remote and are read, never recomputed, on every request; registration refuses
      either on a key offering an encoding or a serve-time stage; proven with Bundler 2.4.19
      staying on the compact index across a hosted publish and a ranged refresh, and Bundler
      4.0.20 appending a `206` whose whole-file digest it verifies.
- [ ] AC31: A document key with a serve-time stage is served by its generator's `Render` for the
      requested variant under the serving repository's `server.public_url`, name and mount: every
      declared variant is rendered from the one stored body and no variant is stored as snapshot
      content; its `ETag` is derived from the stored body's digest, the variant and the inputs,
      so a matching `If-None-Match` answers `304` with zero `Render` calls; a changed
      `server.public_url` or a rename changes the bytes and the `ETag` with no write and no
      snapshot; renderings are memoised under `index.render_memo_bytes`, a second request for a
      variant calls `Render` zero times, and an evicted or oversized output re-renders to
      identical bytes; `Render` receives no `Signing` handle, and a profile declaring a
      byte-changing stage on a signed key is refused at registration.
- [ ] AC32: `ServeRendered` given handler-rendered bytes, or a lazy renderer with a validator
      identity, sets a strong `ETag` and the freshness source's `Last-Modified`, and answers a
      matching conditional request `304` without invoking the lazy renderer; a repoint of the
      serving pointer changes the `ETag` and moves `Last-Modified` forward; for a per-request
      virtual the `Last-Modified` is the latest of its own pointer's and its members' records and
      does not move backwards when the member that supplied the latest value is removed, under an
      injected clock stepped backwards. `ServeFile` sets the CAS digest as a strong `ETag` and
      answers `If-None-Match` with `304`.
- [ ] AC33: A repository-scoped pointer document (Hackage's `root.json` and `mirrors.json`) is
      byte-identical on every pointer of its repository and in no snapshot's content; a renewal,
      a `root-chain` or online-key rotation and an accepted `external` document each produce
      exactly one new version for the repository and, in one transaction with no snapshot,
      re-render it on every pointer together with every pointer document naming it, advancing
      every pointer's freshness record; only the repository-scoped `signing.resign` schedule
      renews it, exclusive per repository, and a per-pointer run never does; a pointer created
      later carries the current body; and no pointer, after any repoint, serves a version lower
      than one it served.
- [ ] AC34: Every merge commit on a virtual, and every change of its member list, is a transition
      of the virtual's default pointer that advances its `moved_at` and generation counter with no
      snapshot, so the merged documents a virtual serves after the commit carry a `Date` and a
      `Last-Modified` later, and a TUF version higher, than any it served before, whatever the members'
      transitions did (a member rollback included) and with the clock stepped backwards; a real
      apt, cabal and cpm client of the virtual adopts the new merge on its next update.
- [ ] AC35: A remote member adopting a new upstream revision enqueues `index.merge` for every
      virtual listing it inside the adoption transaction, and the change is visible in the
      virtual within the staleness bound; serving a virtual's merged document whose remote input
      is past that remote's TTL enqueues exactly one revalidation of the remote per coalescing
      window, never on the request's path, through `EnqueueRevalidation` in a transaction that
      holds only the job row, and serves the current merged set, including when that
      transaction fails to commit; a virtual's creation and a member-list change adding a
      never-adopted remote enqueue that remote's first fetch inside the transaction making the
      change, and the fetch requests exactly the routes the profile's member inputs yield for the
      remote's current state: each literal path, each template expanded over the values the
      virtual's other members hold, the format's constants and the virtual's `settings`, and, in
      a later round of the same job, each derivation the generator's `DeriveInputs` yields from a
      document adopted in an earlier round
      (a `repomd.xml`'s hrefs, an envelope's `by-hash` entries), a template variable sourced
      from the other members' values yielding exactly those values (`cpan.md`'s `{authordir}`
      over the other members' author directories, never a directory only the remote holds),
      the job ending within the profile's round bound, so the virtual lists the remote's content
      with no request ever made to the remote's own URL; a request to the virtual for a cell no
      member input covered (a tree, subdir or architecture only the remote holds) is answered from
      the current merged set, records the cell and enqueues one revalidation per remote member
      in an enqueue-only transaction, after which the remote's fetch requests that cell, a cell
      the upstream answers `404` is requested once until its negative entry lapses, and a cell
      the upstream holds is in the merged set within the staleness bound; a cell is recorded
      only by a request the router authorized on the virtual and only when its value fits the
      variable's declared grammar, so a value with an empty, `.` or `..` segment, a slash inside
      a segment or percent-encoding, from a request, a member or `settings`, is never expanded
      and never recorded, and every route handed to the member-input interface equals its
      normalised form under the remote's mount; a cell is written with its variable, value,
      recorded and last-requested times to the part of the input record that survives a swap,
      a repeat request updates the last-requested time, a cell whose expansion the remote has
      cached and a cell whose negative entry lapsed with no request since are dropped, and a
      virtual holding `index.requested_cells_max` cells records no further cell and enqueues
      nothing for it while still answering the request, `index_requested_cells{repository}`
      reporting the size; registration refuses a
      merging profile with a member-read key that declares no input, a template variable with no
      source or with a grammar admitting such a segment, or a derivation from an undeclared key;
      and `internal/proxy` imports neither
      `internal/index` nor `internal/signing`.
- [ ] AC36: A virtual merge composes a remote member's current document into a body the virtual
      signs according to the anchor class the member was adopted under, read beside the verdict
      through the `Admission` interface `internal/index` declares and never through
      `format.Deps`: with a signature anchor
      in the remote's trust set only a `verified` verdict is admitted and an `absent` one after a
      trust-set change is excluded until re-evaluation; with an integrity anchor (a metalink) the
      current revision is admitted, since a mismatch was never adopted; with no anchor the current
      revision is admitted on TLS alone; a `failed` verdict is excluded under every class; each
      exclusion and admission is recorded per member and document with its anchor class on the
      merged set's input record; proven with a fixture virtual over three remotes of each class
      whose stand-ins serve a signed, a metalink-listed and an unsigned index, all three listed in
      the merged body, and the same fixtures with a bad signature, a mismatching metalink and a
      superseded trust revision excluded, a keyless remote reading class `none` with an `absent`
      verdict and admitted, and with a real `pacman` installing through a signed
      virtual over a remote of an Arch-shaped stand-in that signs no database, and a real `apk`
      installing through a signed virtual over a keyless Alpine remote. A virtual whose
      format signs nothing applies no admission rule: every member's current documents contribute
      whatever their verdicts, proven with a CRAN-shaped fixture over an unverified remote. A
      document the profile declares pass-through is served by
      the virtual byte-identical to the remote member's copy, with the upstream's signature, no
      `Signature` record of ours and the same policy evaluation as at the remote's own URL,
      whatever its verdict; proven with a CPAN virtual over a remote whose trust set holds no
      PAUSE key, where CPAN.pm installs a public distribution through the virtual, and a shared
      author directory takes the remote's entries under no anchor and drops them under a
      configured PAUSE key that fails.
- [ ] AC37: `SignedBy` returns, for a served body, the public forms of exactly the keys whose
      current `Signature` records it carries and nothing private; Terraform's per-request download
      document lists them as `signing_keys` from a handler package that imports no
      `internal/signing`, and after an outright key retirement under the `additive` profile the
      next download document lists the new key with no snapshot created.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | integration + property | `internal/index/dispatch_test.go` (fixture handler: wire write, `Submit`, seed subcommand, retention pass; hook-disabled write refused); `internal/index/accounting_test.go` (snapshot counting under fault injection) |
| AC2 | architecture test | `internal/format/signing_boundary_test.go`; `internal/index/generator_purity_test.go`; `internal/signing/library_allowlist_test.go`; `format-handler-interface.md` AC15 holds `internal/signing` in its whole import list independently, and its "The scheduled re-open" records `Indexer` and `Documents` as inputs |
| AC3 | property + conformance | `internal/index/concurrent_publish_test.go`; `conformance/debian/concurrent_publish_test.go` (real apt after N concurrent publishes, the prototype's vehicle) |
| AC4 | integration + benchmark | `internal/index/incremental_test.go`; `internal/index/bench_incremental_test.go` (touch-one-of-N at the largest consumer's scale) |
| AC5 | integration + property | `internal/storage/metadata_blob_gc_test.go` (extended: declared blob lists); `internal/index/stream_serve_test.go` |
| AC6 | integration + architecture | `internal/index/read_path_test.go` (instrumented signer, zero calls over every signed fixture's read surface); `internal/signing/context_test.go` |
| AC7 | integration | `internal/signing/rotation_profiles_test.go`, table-driven over the seven profiles with each ecosystem's reference verifier (`gpg`, `apk verify` via the fixture image, `hex_core`, `terraform providers mirror`, `hackage-security` vectors, `ovsx verify`) on the served bytes |
| AC8 | property | `internal/signing/rotation_atomic_test.go` (interleaved reads across the cutover; snapshot count unchanged) |
| AC9 | integration + conformance | `internal/index/repoint_resign_test.go`; `conformance/debian/rollback_after_rotation_test.go` |
| AC10 | integration + conformance | `internal/index/pointer_document_test.go` (injected clock stepped backwards); `conformance/debian/rollback_test.go` and `conformance/hackage/rollback_test.go` (real clients adopt N-1) |
| AC11 | integration + architecture + conformance | `internal/index/freshness_test.go` (both conditional rules: equal, earlier and later-unequal conditions; `If-None-Match`; pointer, cache-scoped and per-request virtual sources; injected clock stepped backwards); `internal/format/freshness_boundary_test.go` (module-wide, every handler and generator package, the five header names); `conformance/core/timecond_rollback_test.go` (curl `--time-cond` sees a rollback under both rules and gets `304` to a later condition under `not-earlier`); `conformance/cpan/rollback_test.go` (CPAN.pm's later-condition fallback receives the body under `exact`); `conformance/homebrew/freshness_test.go` (brew 7.0.6 against a remote under `not-earlier`, shared with `homebrew.md` AC4) |
| AC12 | integration | `internal/signing/public_forms_test.go` (`gpg --import`, `ssh-keygen -lf`, `hackage-repo-tool` key ids in fixture containers; `npm audit signatures` against the keys document) |
| AC13 | integration | `internal/signing/backends_test.go` (`file`; `kms` fixture provider registered through `AddProvider`; `pkcs11` against SoftHSM2 in CI; `external`); shared envelope vectors run per backend |
| AC14 | integration | `internal/signing/never_display_test.go` (responses, and log records, metric labels and audit records captured through `telemetry.NewTestRecorder`); `internal/signing/at_rest_test.go` (database dump scan) |
| AC15 | integration | `internal/signing/operations_test.go` (through `Submit`; refusals per `auth.md` AC30; audit and `Operation` counts); `internal/repository/readonly_test.go` (every key operation refused `405` `read-only` on a frozen repository with no key state changed; shared with `repository-lifecycle.md` AC10); `internal/manage/openapi/openapi_test.go` (routes present) |
| AC16 | integration | `internal/signing/external_test.go` (offline-signed `root.json` fixtures: valid, under-threshold, unlisted signer) |
| AC17 | integration + fault injection | `internal/signing/selfcheck_test.go` |
| AC18 | benchmark | `internal/signing/bench_signblob_test.go` (peak allocation under `testing.AllocsPerRun` and a memory ceiling; refusal above maximum) |
| AC19 | integration + property | `internal/index/virtual_merge_test.go` on the production runner, shared with `async-operations.md` AC11 (staleness bound, coalescing count, merge at creation, atomic swap, failure keeps previous set and alerts through `telemetry.NewTestRecorder`, virtual key, no merge on a request goroutine; a member's default-pointer promotion and rollback enqueuing through `Transition` and an environment-pointer repoint enqueuing nothing; inputs read by declared digest, an eviction pass under quota pressure skipping the member's declared inputs with the merge unchanged (`proxy-cache.md` AC14's `internal/proxy/eviction_test.go` holds the skip itself), and a missing declared blob, injected at the store, failing the merge with the previous set kept; a RubyGems-shaped fixture's merged log a byte prefix of the next merge's, `Merge` handed the previous set); `internal/storage/metadata_blob_gc_test.go` (the merged document's declared list over three merge commits with two retained generations, the swap paused against the sweep's mark and intent phases, and the virtual's deletion; shared with `storage-and-gc.md` AC16 and `formats/debian.md` AC22); `internal/repository/delete_virtual_test.go` (the rename of a virtual enqueuing exactly one coalesced merge in its transaction with no handler `Apply`; shared with `repository-lifecycle.md` AC29); `conformance/debian/rename_test.go` (a real client resolving through the renamed virtual, shared with `repository-lifecycle.md` AC29) |
| AC20 | integration | `internal/index/proxied_generation_test.go` (same generator, unsigned, run inside the adoption transaction through the adoption hook; `FromUpstream` handed exactly the fixture adoption check's records, and an injected hook failure leaving the previous document serving; no `Signature` row, no key for a `remote`; a Vagrant-shaped catalog fixture beside the CRAN, LuaRocks, Chef and opam ones); the hook's transaction semantics are `proxy-cache.md` AC25's `internal/proxy/adoption_test.go` |
| AC21 | integration + conformance | `internal/index/seed_equivalence_test.go` (seeded versus published bytes); `conformance/core/seed_signed_state_test.go` (case reads public keys, real client installs) |
| AC22 | integration + conformance | `internal/signing/cadence_test.go` under `testing/synctest` on the production scheduler, shared with `async-operations.md` AC14 (injected clock; expiry-derived next run written in `Finish`; restart mid-schedule; idle pointers; a `read_only` repository renewed through the door's document-only form with its content bytes unchanged, a replica and a deleted repository refused; the expiry gauge and `SigningDocumentExpiring` through `telemetry.NewTestRecorder`); `conformance/debian/readonly_test.go` (a frozen suite's `Valid-Until` renewed on the cadence and accepted by a real `apt`; shared with `repository-lifecycle.md` AC10) |
| AC23 | integration + conformance | `internal/replication/signing_records_test.go` (records in the read surface; follower signs nothing, calls no backend and holds no `signing.resign` row while linked; shared with `replication.md` AC21); `internal/replication/takeover_keys_test.go` (refused `conflict` naming each unresolvable key; succeeds with a shared `kms` fixture key and with a pre-announced follower `file` key; the per-pointer and repository-scoped schedules present after the ending transaction with `next_run_at` now and every pointer document re-rendered under the follower's keys in the request, the next runs then derived from the renewed expiry; a fixture `kms` key that resolves and refuses to sign: link `ended`, documents byte-identical to the leader's, schedules present, the request failing naming the key, `SigningFailed` through `telemetry.NewTestRecorder` on the cadence's attempt, and the retry renewing once the fixture signs; an unsigned-format fixture registering and rendering nothing; the link state of `replication.md` AC10 observed across the takeover; shared with `replication.md` AC21); `internal/signing/schedules_test.go` (`RegisterSchedules` idempotent, a new row at the caller's `nextRun` and an existing row untouched, one row per signed pointer plus the repository-scoped row where declared, the runtime calling it at a pointer's first signed document with the expiry-derived value so the cadence does not fire on a document the write just signed, and no signed pointer without a row); `conformance/replication/takeover_expiry_test.go` (a Debian or Hackage replica taken over with no further write, the clock advanced past the old leader's document expiry, a real client installing; shared with `replication.md` AC21) |
| AC24 | integration | `internal/index/unsigned_consumer_test.go` (Vagrant-shaped and Terraform-shaped fixture profiles) |
| AC25 | integration | `internal/index/determinism_test.go` (every registered generator's golden fixtures, two runs and a restart, `Render` over every declared variant, `DeriveInputs` over every declared derivation's fixture document: a `repomd.xml` for `rpm.md`'s profile and an envelope for `debian.md`'s, the only two derivations declared; the CPAN generator contributes `Generate` and `Merge` fixtures and no derivation fixture, its `CHECKSUMS` input being a template) |
| AC26 | unit | `internal/signing/config_test.go`; `internal/index/config_test.go` (defaults, environment-over-file precedence, no Viper import, no flag bound to any key of the table, PIN and master key refused as flags; the flag set itself is `deployment.md` AC2's) |
| AC27 | integration | `internal/index/freshness_source_test.go` (injected service clock never appears in a header or document; only the pointer record's values do) |
| AC28 | property + benchmark | `internal/index/contention_test.go`; `internal/index/bench_contention_test.go` (with a `// gate:` comment compared by `scripts/bench-gate.sh`, `observability.md` AC25) |
| AC29 | integration | `internal/signing/lifecycle_test.go` (rename leaves keys, records and public forms unchanged; deletion retires every key in the transaction and refuses signing; the deletion write with the generator and the signer instrumented to zero calls and no `PointerDocument` written; public forms by digest until tombstone; tombstone destroys private material, checked by a database dump scan and dropped references; the no-hook clause shared with `repository-lifecycle.md` AC14) |
| AC30 | integration + conformance | `internal/index/serve_policy_test.go` (policy carries no date; `Cache-Control` per format with no repository override; `gzip` offered and not offered, `Vary`, per-encoding `ETag`); `internal/index/range_test.go` (single range over inline, single-blob and declared-blob documents compared with the slice of the whole, `416`, stale `If-Range`, `multipart/byteranges` from `ServeFile`, reads through `storage-and-gc.md` AC21's segment-verified path); `conformance/hackage/incremental_test.go` (shared with `hackage.md` AC3); `conformance/rpm/zchunk_test.go` (dnf5 multi-range refresh, shared with `rpm.md` AC5); `internal/index/stored_validators_test.go` (`body-md5` `ETag` and `Repr-Digest` on `200` and `206` equal to the stored values, written at generation and at `Adopt`, unchanged across requests with the hasher instrumented to zero calls, refused at registration beside an encoding or a serve-time stage); `conformance/rubygems/compact_index_test.go` (Bundler 2.4.19 on the compact index after a publish and a ranged refresh, Bundler 4.0.20 appending a `206`; shared with `rubygems.md`'s validator criterion) |
| AC31 | integration + architecture | `internal/index/render_test.go` (LuaRocks-shaped 36 variants from one record set, a Chef-shaped expansion under a fixture `server.public_url`, a rename and a base-URL change with the snapshot count unchanged, `Render` call counts on `304` and on a memo hit, eviction and oversize re-render to identical bytes, no `Signing` handle reachable); `internal/index/profile_test.go` (signed key with a byte-changing stage refused at registration) |
| AC32 | integration | `internal/index/serve_rendered_test.go` (bytes form and lazy form with a validator identity, zero renderer calls on `304`, repoint changes the `ETag`, per-request virtual source with the supplying member removed under a backwards clock); `internal/index/serve_file_test.go` (digest `ETag`, `304`) |
| AC33 | integration + conformance | `internal/index/repository_pointer_documents_test.go` (identical bytes on every pointer, absent from snapshot content, one version per renewal, rotation and external acceptance, one batch advancing every pointer's record, the repository-scoped schedule alone renewing, a pointer created later, no lower version after any repoint); `conformance/hackage/rotation_test.go` (shared with `hackage.md` AC34) |
| AC34 | integration + conformance | `internal/index/virtual_freshness_test.go` (merge commit and member-list change advance the virtual's pointer record with no snapshot; a member rollback; clock stepped backwards); `conformance/debian/virtual_test.go`, `conformance/hackage/virtual_test.go` and `conformance/cpan/virtual_test.go` (a real client adopts the new merge; shared with `debian.md` AC22, `hackage.md` AC27 and `cpan.md` AC26) |
| AC35 | integration + architecture test + conformance | `internal/index/virtual_remote_member_test.go` (adoption enqueues `index.merge` in its transaction; a read past the remote's TTL enqueues one coalesced revalidation off the request goroutine in an enqueue-only transaction, and a read whose enqueue transaction is made to fail is still served; creation and member addition enqueue a never-adopted remote's first fetch in their own transaction; the first fetch's requested routes equal the profile's member inputs for the remote's current state, a template fixture expanded over a second member's trees and a constant, a derivation fixture whose second-round routes come from the `repomd.xml` the first round adopted, a CPAN-shaped fixture whose `{authordir}` expansion requests exactly the author directories a second member holds and nothing the remote's index alone names, the job ending within the reported bound; a virtual read for a cell only the remote holds answered from the current set, recording the cell and enqueuing one revalidation per remote, the cell fetched in that job, a `404` cell requested once until its negative entry lapses; a cell recorded only through the router-authorized read, with the replay entry and a job unable to record one; request, member and `settings` values carrying an empty, `.` or `..` segment, an in-segment slash or percent-encoding never expanded and never recorded, every route handed to the interface equal to its cleaned form under the mount; the cell's fields on the swap-surviving part of the input record and present after an intervening swap; a repeat request updating `last-requested-at`; a cell dropped once its route is cached and once its negative entry lapsed unrequested, and kept while re-requested; the cap reached on a fixture virtual, a further cell answered from the merged set, recorded nowhere and causing no upstream request, and the gauge at the cap; network-layer count of upstream requests), shared with `proxy-cache.md` AC26's and `auth.md` AC36's `internal/proxy/revalidate_job_test.go`, with `data-model.md` AC45's `internal/model/virtual_merge_record_test.go` (the cell's fields and swap survival) and with `async-operations.md` AC11 (merge coalescing) and AC29 (the kind's coalescing, triggers and `RetryAt`); `internal/index/profile_test.go` (a merging profile with a member-read key and no input, an unsourced variable, a variable grammar admitting an empty, dot or slash-bearing segment, or a derivation from an undeclared key refused at registration; the round bound of a two-round fixture); `internal/proxy/arch_test.go` and `internal/index/arch_test.go` (the one-way import); `conformance/opam/virtual_test.go` (the virtual lists a remote's packages with no request to the remote's own URL, shared with `opam.md` AC26) |
| AC36 | integration + conformance | `internal/index/admission_test.go` (three fixture remotes under the `signature`, `integrity` and `none` anchor classes, each admitted; a keyless remote reading `none` and `absent`, admitted; a bad signature, a mismatching metalink never adopted, an `absent` verdict under a superseded trust revision and a `failed` verdict each excluded; the input record's per-document outcome and anchor class; an unsigned-format fixture virtual admitting an unverified remote with no record of exclusion; the reads taken through `Admission` with a fixture satisfier and the handler's `Deps` holding neither; shared with `artifact-verification.md` AC31's read half and `data-model.md` AC45's outcome-and-class fields); `internal/index/passthrough_test.go` (declared pass-through served byte-identical with no `Signature` row under every verdict; a signature-requiring rule refusing it at the virtual as at the remote; a shared directory under no anchor and under a failing configured key); `conformance/arch/virtual_remote_test.go` (all three pacman clients installing through a signed virtual over a remote of an unsigned Arch-shaped stand-in under `DatabaseRequired`, the provider case with the resolution recorded and the remote-only database reached through its recorded cell, shared with `arch.md` AC23; a signed virtual over an Arch remote never composes a revision that withdrew a served `.db.sig`, because the adoption refuses it as a regression under `proxy-cache.md` AC25, `arch.md` AC18's `conformance/arch/proxied_signature_withdrawn_test.go`); `conformance/alpine/virtual_remote_test.go` (both apk lines installing through a signed virtual over a keyless remote admitted under class `none`, a foreign-key remote never current with the operator record, shared with `alpine.md` AC20); `conformance/cpan/virtual_test.go` (CPAN.pm through a virtual over a remote with no PAUSE key in its trust set, shared with `cpan.md` AC26) |
| AC37 | integration + conformance | `internal/index/signed_by_test.go` (public forms only; the key set follows the current records; retirement under `additive` with snapshot count unchanged); `conformance/terraform/key_rotation_test.go` (shared with `terraform.md` AC10); `internal/format/signing_boundary_test.go` (the Terraform handler imports no `internal/signing`) |

## Implementation Phases

### Phase 1: Runtime, file custody and the unsigned consumer (charter step 7, first item)
- Entry: `write-triggered-services-prototype.md` AC7's finding recorded and the re-open complete
  (`format-handler-interface.md` AC8); `data-model.md`'s `Signature`, `PointerDocument`,
  `SigningKey` and pointer freshness records and the pre-commit hook (its AC36, AC37) landed
  with `storage-and-gc.md` AC25; `async-operations.md` Phases 1 to 3 (charter step 4b) running;
  `management-api.md` Phase 1's `Submit` and `configure` exist; `deployment.md`'s
  `security.master_key` in place.
- `internal/index`: `Indexer` discovery, the write-path hook, `Affects`-scoped regeneration,
  per-document locking and retry, inline and CAS-backed storage with declared blob lists,
  the serving door (`ServeDocument`, `ServeRendered`, `ServeFile` behind `Documents`, serve
  policies with both conditional rules, on-request encoding, byte ranges, the stored `body-md5`
  and `Repr-Digest` validators), the serve-time stage
  and its memo, the determinism harness (AC1, AC2, AC3 property half, AC4, AC5, AC11, AC25,
  AC26 index half, AC27, AC28, AC30, AC31, AC32). The serving door lands before any handler that
  renders per request reaches `main`, since the freshness boundary binds every handler package.
- `internal/signing`: the `file` backend under the master key, OpenPGP detached and armoured
  codecs, the `Signing` handle, signature records and assembly, the self-check, the key
  operations through `Submit`, public forms for OpenPGP, key retirement at repository deletion
  and destruction at tombstone (AC6, AC12 OpenPGP forms, AC13 `file`, AC14, AC15, AC17, AC26
  signing half, AC29).
- The Maven generator consumes the index half before any signed consumer, per the charter's
  ordering inside step 7; the prototype's Debian generator is rebuilt as
  `internal/format/debian/index` on the production runtime (AC3 conformance half, AC24 for a
  Maven-shaped profile).

### Phase 2: Pointer documents, cadence and the seven rotation profiles
- Pointer documents and their transition and cadence production, the cadence through the door's
  document-only form so a `read_only` repository keeps renewing while its key operations are
  refused (AC10, AC15's read-only clause, AC22); repoint re-signing
  (AC9); the seven rotation profiles with atomic cutover (AC7, AC8); the OpenPGP cleartext
  (`CPAN::Checksums` framing), PKCS #1 v1.5 raw, RSA-SHA512 raw and Ed25519 raw codecs and their
  public forms (AC12 remainder); `SignBlob` with the memory bound (AC18); `SignedBy` for
  per-request documents listing their signing keys (AC37).
- Gate for Debian's and RPM's Phase 1 (charter AC12), then Alpine, Arch, Hex, CPAN, Terraform and
  Open VSX as their tiers allow.

### Phase 3: KMS, PKCS #11 and operator-held keys
- The `kms` backend through `kms.Get`, the `pkcs11` backend through `crypto11` against SoftHSM2 in
  CI, the `external` backend and its submit operation, the algorithm-ceiling refusal and the
  creation probe (AC13 remainder, AC16); the TUF canonical-JSON codec and the `root-chain`
  profile complete for Hackage, with repository-scoped pointer documents and their
  repository-scoped renewal (AC33).

### Phase 4: Virtual merges and the proxied path
- The `index.merge` worker on `internal/async`, which precedes this spec (AC19), including the
  merge enqueued at virtual creation; the virtual's forward-moving freshness at every merge commit
  and member-list change (AC34); the adoption hook running `FromUpstream` for the proxied
  consumers and re-merging on a remote member's adoption, and the virtual-read revalidation of
  remote members, with member inputs as literals, templates and derivations answered for the
  remote's current state in bounded rounds, and the read-driven fetch of a remote-only cell with
  its grammar check, swap-surviving record, cap and pruning (AC20,
  AC35); a member's default-pointer repoint and a virtual's rename as merge triggers, reads by declared digest, the
  previous merged set as a `Merge` input and the merged document's declared list with its
  retained generations (AC19); admission by anchor class, the unsigned exemption and
  pass-through remote documents (AC36); the seed-path
  equivalence with the `signing` sub-entry's `generate` (AC21).

### Phase 5: Replication and reserved producers
- Records on the replication read surface, the takeover precondition, the takeover
  transaction's `RegisterSchedules` call and the in-request re-sign with its failing-key
  outcome (AC23), with `replication.md` at charter step 10.
- The npm ECDSA P-256 profile and keys document when `npm.md` adopts hosted signatures (AC12's
  npm form); the `attach` producer and the NuGet pre-commit transform hook stay unimplemented
  until a consumer adopts them.

## Tasks

Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. Eleven questions were raised in the authoring pass and adopted under the owner's
standing delegation, seven more (Q12 to Q18) in the 2026-09-28 closing reconciliation sweep, on
Opus, one (Q19) in that sweep's leftovers pass, on Opus, two (Q20, Q21) in the Fable recheck
of 2026-09-30, which re-examined every earlier adoption and records its verdict at the end of
each record, and one (Q22) in the Fable follow-up of 2026-10-01; each is folded through Scope,
Design, the criteria and the Test Plan.
`grep -rn "standing delegation"` is the owner's review queue. Q20 supersedes the composed half of
Q17 and is owner-facing; Q22 is owner-facing.

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

Rechecked on Fable 2026-09-30: confirmed. Under-stated at adoption: the hook is also where the per-document locks are taken, and they must precede the repository head lock the sole constructor takes last (Design, "Contention", citing `storage-and-gc.md` AC30); stated now.

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

Rechecked on Fable 2026-09-30: confirmed. Under-stated at adoption: because the `ETag` is over the assembled bytes, a rotation invalidates every client's cached copy of every signed document of the repository at once, one whole fetch per client per document; accepted, since the alternative is a `304` that hides a re-sign.

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

Rechecked on Fable 2026-09-30: confirmed. Clarified: the read view `Generate` receives is an interface `internal/index` declares and the runtime satisfies, so a generator's purity is an import property the test holds, not an absence of reads; `DeriveInputs` (the resolved member-input decision, was Q21) joins the contract under the same rule and the same call-graph enforcer.

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

Rechecked on Fable 2026-09-30: confirmed.

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

Rechecked on Fable 2026-09-30: confirmed. The resolved admission decision (was Q20) adds a second read beside the verdict, the anchor class a remote's adoption ran under, and neither is a verification here. Fable follow-up 2026-10-01: both are the index runtime's reads through the `Admission` interface `internal/index` declares, never `format.Deps` (`format-handler-interface.md`'s recheck).

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

Rechecked on Fable 2026-09-30: confirmed.

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

Rechecked on Fable 2026-09-30: confirmed.

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

Rechecked on Fable 2026-09-30: confirmed and amended. The adoption stands; its fold omitted the lock order against the layer below: the per-document advisory locks are taken inside the pre-commit hook and the head lock last, by `storage-and-gc.md`'s constructor (its AC30), so the two layers cannot deadlock. Stated in Design, "Contention".

### Resolved: what a follower serves and who signs at takeover (was Q9)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: `Signature` and
`PointerDocument` records travel with the pointer set; a follower serves them verbatim and signs
nothing while linked; takeover requires every active key to resolve on the follower (Design,
"Replication"; AC23).

Accepted cost: the replication read surface carries two more record kinds (now `replication.md`
AC21), and a replicated repository on `file` keys needs a documented key recipe before takeover
(`deployment.md`'s Recipes). Why the alternatives lost: B (the follower re-signs with its own key) makes every
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

Rechecked on Fable 2026-09-30: confirmed. Amended in the Fable follow-up of 2026-10-01 (round 3), the option unchanged, with `replication.md`'s resolved takeover-signing decision (was Q12 there): "takeover needs keys" was the whole of what this record said about the moment of takeover, and it left a taken-over repository nobody writes to with the old leader's documents and no `signing.resign` schedule to renew them, since a linked follower has never re-signed and the cadence's rows were created by nothing but the first signed write. The takeover now uses the keys it resolved: its transaction registers the repository's cadence through the named entry point `signing.Service.RegisterSchedules` and the same request re-signs every pointer document through the door's standard document-only form, a resolved key that refuses to sign leaving the link `ended`, the documents the leader's and the request failing loudly with the cadence set to retry (Design, "Replication", "Rotation profiles"; AC23). The accepted cost grows: the served envelope changes at takeover (the follower's signatures over identical content), and a many-pointer takeover signs inside one operator request.

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

Rechecked on Fable 2026-09-30: confirmed.

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

Rechecked on Fable 2026-09-30: confirmed.

### Resolved: an If-Modified-Since later than the served Last-Modified (was Q12, raised and adopted 2026-09-28)

**Adopted 2026-09-28 under the owner's standing delegation**, in the closing reconciliation sweep,
on Opus. Option A: the conditional rule is declared per document in its serve policy, `exact` by
default and `not-earlier` where the format's clients send their own clock (Design, "Freshness
scoped to the pointer", "Serving"; AC11, AC30).

The question: this spec's AC11 and `proxy-cache.md` AC22 said "`304` only on an exact match", and
`proxy-cache.md` added "no `200` at or before the request's `If-Modified-Since`". For a condition
later than the served value and unequal to it, the first clause forbids `304` and the second
forbids `200`. `homebrew.md` found this routine (brew's condition is its own clock at its last
download, captured) and kept a not-earlier rule; `cpan.md` captured the opposite need (CPAN.pm's
fallback sends a later file time and must receive the body), and `luarocks.md` AC15 asserts `200`
on a later condition.

**Recommendation:** A, because the two populations were each captured and each rule is wrong for
the other, while both rules are safe once `Last-Modified` only moves forward.

| Option | You get | It costs |
|---|---|---|
| **A. Per-document rule, `exact` default, `not-earlier` declared** | Every captured client served correctly; `proxy-cache.md`'s two clauses become the two rules' definitions | Two code paths in one helper and a declaration per format; a wrong declaration is a silent client-visible bug, so each declaring format carries a conformance case |
| **B. `not-earlier` everywhere (RFC 9110's rule)** | One rule, the standard's | CPAN.pm's fallback installs an empty archive (captured); `luarocks.md` AC15 fails |
| **C. `exact` everywhere** | One rule | Every brew revalidation after an adoption downloads a whole API document, tens of megabytes, which curl discards mid-body; `proxy-cache.md` AC22's second clause fails |

**Why this is yours:** it decides how the registry answers a conditional request, a behaviour every
revalidating client of every format sees.

Accepted cost: a declaration per format and the skew cost of `not-earlier` (a client clock ahead of
the registry's by more than the time since the last change keeps its copy until the next one, as
`homebrew.md` states). B lost to CPAN.pm's captured failure; C to the transfer cost and a
contradiction with a sibling's criterion.

Rechecked on Fable 2026-09-30: confirmed.

### Resolved: what the serving door renders at serve time (was Q13, raised and adopted 2026-09-28)

**Adopted 2026-09-28 under the owner's standing delegation**, in the closing reconciliation sweep,
on Opus. Option A: a generator may declare a serve-time stage (`Render`) for variants of one stored
body, deployment values expanded into it, and HTTP content encodings; the runtime memoises its
output under a byte bound and derives the `ETag` from the stored body, the variant and the inputs
(Design, "The generator contract", "Serving"; AC31, AC30).

The question: `luarocks.md` stores one record set and serves 36 manifests from it; `opam.md` stores
a record set and serves a whole-gzip tarball whose URLs depend on `server.public_url` and the
repository's current name; `chef.md` and `vagrant.md` store URL-free bodies and must serve absolute
URLs under the current base; `chef.md` and `homebrew.md` serve gzip on request with a per-encoding
`ETag`. The contract stated a stored output per document key and `ServeDocument` streaming it, with
no stage in between, so each spec reported the same gap.

**Recommendation:** A, because the rendering is format knowledge that belongs in the pure generator
package, and the validators and caching are shared concerns that belong in the runtime; storing
every variant would make a base-URL change or a rename a write on every repository.

| Option | You get | It costs |
|---|---|---|
| **A. Generator-declared serve-time stage, memoised, validators from inputs** | One stored body per write; base URL and name free to change with no write; `304` without rendering; one memo for every format | A render on the first request per variant per process, a memo bound to size, and a registration check that signed keys declare no byte-changing stage |
| **B. Every variant stored as its own document key at write time** | Pure stream copy on serve | 36 CAS-backed documents per LuaRocks upload; a base-URL change or rename rewrites every stored catalog and universe in a write nobody asked for |
| **C. Handlers render at serve time themselves** | No runtime change | Index bytes built in handler packages, which `luarocks.md` AC4 and `opam.md` AC4 forbid, and validators computed by handlers, which AC11 forbids |

**Why this is yours:** it moves part of index rendering from the write path to the read path for
four formats and fixes where deployment values enter a served document.

Accepted cost: the first-request render and the memo bound (`index.render_memo_bytes`), and a
profile constraint on signed keys. B lost on write amplification and on writes triggered by
configuration; C on two formats' architecture criteria and on this spec's freshness boundary.

Rechecked on Fable 2026-09-30: confirmed. Extended without changing the answer: a key declaring a stored validator (`body-md5`, `Repr-Digest`; AC30) may declare no serve-time stage, for the same reason a signed key may not declare a byte-changing one.

### Resolved: documents and files the runtime does not generate (was Q14, raised and adopted 2026-09-28)

**Adopted 2026-09-28 under the owner's standing delegation**, in the closing reconciliation sweep,
on Opus. Option A: the freshness boundary stays module-wide, and the runtime adds `ServeRendered`
for handler-rendered documents (bytes, or a lazy renderer with a validator identity) and
`ServeFile` for stored files, beside `ServeDocument`, all reached through the `Documents` interface
in `Deps` (Design, "Serving"; AC11, AC32).

The question: `composer.md` (its was-Q10), `cargo.md`, `npm.md`, `nuget.md`, `pypi.md`,
`openvsx.md` and `puppet.md` render documents per request and serve stored files with `ETag`s and
`304`s, and AC11's architecture test forbids every handler package to set those headers, while
`ServeDocument` took only a stored generated document. Either the helper grows a form for what
handlers render, or the test narrows to generated documents.

**Recommendation:** A, because forward-moving freshness is exactly the shared concern the
constitution says needs one enforcer, and seven handlers computing validators by hand is seven
places for a rollback to hide behind a `304`.

| Option | You get | It costs |
|---|---|---|
| **A. Module-wide test; `ServeRendered` and `ServeFile` forms** | One conditional rule for everything served; rollback visible on per-request documents too; `304` without rendering through the lazy form | Two more forms and a `Documents` entry in `Deps`; handlers pass a freshness source, never a date |
| **B. Narrow the test to generated documents** | No new forms | Each per-request handler computes `Last-Modified` and evaluates conditions itself, with no enforcer; `composer.md` was-Q10's freshness rule unenforceable |
| **C. Make every per-request format an `Indexer` consumer with stored documents** | Per-document freshness, no new form | Inverts `composer.md`'s and `cargo.md`'s rendering decisions and stores per-package documents for formats with no repository-wide index; a virtual with a remote member still renders per request |

**Why this is yours:** it decides whether the freshness boundary binds every handler, and it adds
an entry to the `Deps` door `format-handler-interface.md` pins.

Accepted cost: `Documents` in `Deps` (a `format-handler-interface.md` consequence, no method change)
and coarser `Last-Modified` on per-request documents, which move with the pointer on any write, the
cost `composer.md` already accepted. B lost for want of an enforcer; C for reversing adopted format
decisions without solving the virtual case.

Rechecked on Fable 2026-09-30: confirmed.

### Resolved: what moves a virtual repository's freshness (was Q15, raised and adopted 2026-09-28)

**Adopted 2026-09-28 under the owner's standing delegation**, in the closing reconciliation sweep,
on Opus. Option A: a merge commit and a member-list change are document-only transitions of the
virtual's default pointer, advancing its `moved_at` and generation counter with no snapshot; a
per-request virtual serves the latest of its own and its members' records, with the member-list
transition floored at the latest value served (Design, "Virtual merges"; AC34, AC32).

The question: a merged virtual document is signed and dated inside its body (Debian's `Date`,
Hackage's TUF version) or revalidated by date (CPAN's index), and must move forward at every merge,
but a merge creates no snapshot and moves no pointer, so the virtual had no record to render from.
`debian.md`, `hackage.md` and `cpan.md` each asked for a forward-only source; `composer.md` and
`homebrew.md` derived a per-request virtual's value from its members and found a member-list change
could send it backwards.

**Recommendation:** A, because the virtual already has a default pointer with a record that every
renderer knows how to read, and a merge commit is a change of what that pointer serves.

| Option | You get | It costs |
|---|---|---|
| **A. Merge commit and member-list change as transitions of the virtual's pointer** | One record, rendered like every other; TUF versions and `Date`s rise by construction | A document-only transition kind in `data-model.md`, and the floor on member-list changes |
| **B. A separate freshness record on the merged document set** | No new transition kind | A second forward-moving record with its own monotonicity rule, duplicating the pointer's, and nowhere for a TUF counter to live |
| **C. Derive from members' records at serve time** | No new record | Cannot drive a signed body's `Date` or version (they are fixed at merge time), and removing a member lowers the maximum |

**Why this is yours:** it extends what counts as a pointer transition in `data-model.md`, a record
you settled for hosted pointers.

Accepted cost: the transition kind and its floor are listed in `data-model.md` (its AC36, with the
input record as its AC45), and a
virtual's `Last-Modified` moves at every merge even when a document's bytes did not change,
narrowed by the per-document rule. B lost as a duplicate record; C because it cannot sign.

Rechecked on Fable 2026-09-30: confirmed.

### Resolved: what re-merges a virtual and keeps its remote members fresh (was Q16, raised and adopted 2026-09-28)

**Adopted 2026-09-28 under the owner's standing delegation**, in the closing reconciliation sweep,
on Opus. Option A: the runtime registers on `proxy-cache.md`'s adoption commit, where it runs
`FromUpstream` and enqueues `index.merge` for every virtual listing the remote; a virtual's read of
a merged document whose remote input is past its TTL enqueues that remote's revalidation off the
request path; creation and member addition enqueue a never-adopted remote's first fetch (Design,
"Virtual merges", "The proxied path"; AC35, AC20).

The question: nine format specs asked that a remote member's new upstream revision re-merge the
virtual, but adoption is not a write, so the pre-commit hook never sees it; and `opam.md` found that
a remote reached only through a virtual receives no request of its own, so `proxy-cache.md`'s
request-driven revalidation never runs for it and a fresh remote contributes nothing.

**Recommendation:** A, because it keeps revalidation demand-driven, which `proxy-cache.md`'s
resolved signal-detection decision requires against rate-limited upstreams, while making the
virtual's own clients the demand.

| Option | You get | It costs |
|---|---|---|
| **A. Adoption hook; virtual reads drive revalidation off the request path** | Re-merge on every adoption; no idle upstream traffic; no request-path latency | The first read after a TTL sees the previous merge; a revalidation job kind for `proxy-cache.md` and `async-operations.md` to name; the merged set records its inputs |
| **B. A schedule revalidating every remote member of every virtual** | Freshness with no reader | Background polling of upstreams nobody is reading, against the signal-detection decision and every rate limit |
| **C. Revalidate synchronously on the virtual's request path, then merge inline** | Freshest answer | A merge on a request's path, which AC19 forbids, and upstream latency on every virtual read past a TTL |

**Why this is yours:** it sets how stale a virtual repository may be relative to its upstream and
who pays for keeping it fresh.

Accepted cost: one TTL plus a revalidation plus the staleness bound between an upstream change and
a virtual's clients, and the consequences on `proxy-cache.md` (the adoption hook and the
revalidation seam) and `async-operations.md` (the triggers and a kind). B lost to the passive
detection stance; C to AC19.

Rechecked on Fable 2026-09-30: confirmed and amended. The adoption stands; its fold was wrong in two places. It declared a never-adopted remote's inputs as a static path list, which cannot express a template over another member's trees or a route inside a document the same job adopts (four formats found this): the resolved member-input decision (was Q21) replaces that fold. And it listed a member's completed write and a remote's adoption as the merge triggers but not a `local` member's rollback or promotion, which moves the member's head with no write; `Transition` now enqueues it (Design, "Virtual merges"; AC19).

### Resolved: remote documents a virtual passes through unverified (was Q17, raised and adopted 2026-09-28)

**Adopted 2026-09-28 under the owner's standing delegation**, in the closing reconciliation sweep,
on Opus. Option A: a document the merge composes into a body the virtual signs needs a `verified`
verdict; a document the profile declares pass-through is served verbatim with the upstream's
signature whatever its verdict (Design, "The produce/verify boundary"; AC36).

The question: this spec said a virtual "merges only documents whose verdict is verified". `cpan.md`
passes each author directory's `CHECKSUMS` through from the one member holding it, PAUSE-signed, and
PAUSE's current subkey is on keyservers only, so a trust set without it gives `absent` or `failed`
and the rule would drop every public author directory, making CPAN.pm refuse every public install
through the virtual.

**Recommendation:** A, because a pass-through document is exactly what the remote member already
serves at its own URL under the same verdict and policy; the virtual neither adds nor removes
trust, while a composed body carries the virtual's own signature and so must not vouch for
unchecked bytes.

| Option | You get | It costs |
|---|---|---|
| **A. Composed needs `verified`; declared pass-through admitted whatever the verdict** | CPAN virtuals work with PAUSE's rotations; the virtual's signature still covers only checked content | A profile declaration, and clients of such a virtual need the upstream's keys as well as the registry's |
| **B. Verified only, always** | One rule | Every public CPAN install through a virtual fails until the operator imports PAUSE's current subkey, and again at every PAUSE rotation |
| **C. Re-sign unverified documents with the virtual's key** | One key for clients | The registry's signature over bytes it could not verify: the vouching the boundary exists to prevent |

**Why this is yours:** it relaxes a verification rule on the security-critical side of the
produce/verify boundary.

Accepted cost: the declaration, the two-key client setup `cpan.md` documents, and that a CPAN author
directory present in both a hosted and a remote member is composed and so takes the remote's
entries only under a verified verdict (reported to `cpan.md`). B lost to PAUSE's own key
distribution; C to the boundary.

Rechecked on Fable 2026-09-30: the pass-through half confirmed; the composed half **superseded** by the resolved admission decision (was Q20), which admits a remote member's current document under the anchor class it was adopted with rather than under a `verified` verdict alone. The cost this record accepted for the CPAN shared directory is restated there: entries are taken under no configured anchor and dropped under a configured key that fails.

### Resolved: a per-repository Cache-Control override (was Q18, raised and adopted 2026-09-28)

**Adopted 2026-09-28 under the owner's standing delegation**, in the closing reconciliation sweep,
on Opus. Option A: `Cache-Control` stays per format in the serve policy, with no per-repository
override (Design, "Freshness scoped to the pointer"; AC30).

The question: `cran.md` serves CRAN's own `max-age=1800` from its profile and asked whether an
operator may override it per repository.

**Recommendation:** A, because freshness already rides on forward-moving validators, a longer
`max-age` only delays when a client asks (hiding a rollback for its length, the finding theme 1
exists to end), and a shorter one is what `no-cache` formats already do; no captured client needs a
per-repository value.

| Option | You get | It costs |
|---|---|---|
| **A. Per format only** | One tested value per format; no repository field | An operator wanting a different `max-age` for one CRAN repository cannot have it |
| **B. Per-repository override of mutable documents' `max-age`** | Operator control | A core-held repository field in `data-model.md` and `management-api.md`, and a knob whose raised values delay rollbacks |

**Why this is yours:** it declines an operator knob a format spec asked for.

Accepted cost: no per-repository tuning; a reverse proxy in front of the registry remains the place
for site policy. B lost for want of a consumer and for its rollback cost.

Rechecked on Fable 2026-09-30: confirmed.

### Resolved: which way `internal/index` and `internal/proxy` import each other (was Q19, raised and adopted 2026-09-28)

**Adopted 2026-09-28 under the owner's standing delegation**, in the leftovers pass of the
closing reconciliation sweep, on Opus. Option A: `internal/index` imports `internal/proxy` for
`EnqueueRevalidation` and the adoption hook's registration type; `internal/proxy` imports neither
`internal/index` nor `internal/signing`, and reads the profile's member-input paths through a
one-method interface it declares, which the runtime satisfies and the composition root hands it
(Design, "Package shape" and "Virtual merges", the Profile bullet, the enforcer table; AC35).

The question: two edges now join the packages. The runtime calls `proxy-cache.md`'s
`EnqueueRevalidation` from `ServeDocument` and from a virtual's creation and member change, and
registers `Adopt` on the proxy layer's adoption commit; and the `proxy.revalidate` job, which
lives in `internal/proxy`, must read the member-input paths a generator profile declares when it
fetches a never-adopted remote. If each package imported the other for its edge, Go refuses the
cycle at build time, so one direction has to be chosen and held.

**Recommendation:** A, because the proxy layer is the lower of the two (a remote's cache exists
with or without any generator, and a format with no `Indexer` never touches `internal/index`),
the edge from the runtime into it is the heavier one (two calls and a hook type), and the one
datum flowing the other way is a list of paths, which the go skill's consumer-owns-the-interface
rule carries without an import.

| Option | You get | It costs |
|---|---|---|
| **A. `internal/index` imports `internal/proxy`; the member-input paths flow back through an interface `internal/proxy` declares** | The cache layer builds and tests with no renderer present; the adoption hook and `EnqueueRevalidation` are ordinary typed calls; one small interface wired at the composition root beside the replay entry | One more construction-time injection into `internal/proxy`, and an architecture test holding the direction |
| **B. `internal/proxy` imports `internal/index` to read `Profile` directly; the runtime reaches the proxy layer through interfaces it declares** | The job reads the profile with no adapter | The cache layer depends on the renderer and on every generator's value types, so a format with no `Indexer` still links them into its proxied path, and the hook and enqueue become two consumer interfaces instead of one |
| **C. Neither imports the other; every edge an interface wired at the composition root** | No package edge at all | Three injected interfaces for what is one layer calling a lower one; the hook's argument type still has to live somewhere both can name, which is one of the two packages or a third |

**Why this is yours:** it fixes the dependency direction between two shared layers the
constitution requires to be held mechanically, and a later spec that wants the proxy layer to
consult the renderer (or the reverse) must reopen it here rather than add an import.

Accepted cost: the member-input paths reach the job through an injected interface rather than a
direct read, and `internal/proxy/arch_test.go` gains an import assertion beside its single-call-site
one. B lost because it inverts the layering for one list of paths; C because it trades one import
for three injections with no gain.

Rechecked on Fable 2026-09-30: confirmed and amended. The direction stands; the interface it declares the paths flow through was under-specified as a list. `proxy-cache.md`'s Fable recheck amended its was-Q18 so the interface answers for the remote's current state and the job replays in bounded rounds; this spec's side of that is the resolved member-input decision (was Q21), the `MemberInputs` entry in "Package shape" and the round bound registration computes.

### Resolved: what a signed virtual admits from a remote member (was Q20, raised and adopted 2026-09-30)

**Adopted 2026-09-30 under the owner's standing delegation**, in the Fable recheck. Option A: a
merge admits a remote member's current document into a body the virtual signs according to the
**anchor class** the member was adopted under: `signature` (a signature anchor in the remote's
trust set) requires a `verified` verdict; `integrity` (an anchor such as a metalink that gates the
adoption itself) admits the current revision, since a mismatch was never adopted; `none` (no
anchor, TLS to the configured upstream) admits the current revision; a `failed` verdict is never
admitted; each outcome and its class is recorded on the merged set's input record; and the rule
binds signed bodies only, an unsigned virtual admitting everything (Design, "The produce/verify
boundary"; AC36). **This supersedes the composed half of the resolved pass-through decision
(was Q17)**, an Opus adoption, and with it `arch.md`'s resolved unsigned-member decision (was Q13
there) and the exclusion clauses `rpm.md` AC22, `alpine.md` AC20 and `cpan.md` AC26 wrote under
it, each reported as a consequence. It is owner-facing.

The question: Q17 admitted a document into a composed, signed body only under a `verified`
verdict. Applied honestly by the format sweep, that excludes Arch's and Manjaro's official mirrors
(no database signature exists upstream), Fedora (its anchor is a metalink, an integrity result
`artifact-verification.md` never stores as a verdict, so every revision reads `absent`), and every
remote configured with no keys, from every signed virtual: the commonest upstream of the Arch
format, the largest RPM distribution and any private TLS upstream contribute nothing, and
`arch.md`'s own virtual design (its was-Q9) cannot be used for the case it was designed for. No
owner chose that, and the prior art this spec grounded on (Pulp, Nexus's re-signing mode,
Artifactory) re-signs whatever the remote adopted, gating adoption, not composition, on
configured keys.

**Recommendation:** A, because a virtual's signature is a statement about composition from the
members the operator configured, at the trust level the operator configured for each, which is
exactly what a hosted repository's signature says about content its publishers pushed; the
operator's key configuration on the remote is already the trust decision, and the adoption gate
already enforces it, so a second gate at composition adds no check and removes the product. A
tampered TLS-only upstream reaches a direct client of the remote under the remote's own
`DatabaseOptional` exposure; the virtual changes only whose name is on the database, which the
input record and the operator documentation state.

| Option | You get | It costs |
|---|---|---|
| **A. Admission by the member's anchor class; `failed` never; unsigned virtuals unbound** | One-section virtuals over Arch's mirrors, Fedora and private TLS upstreams; clients can require a database signature the upstream never offered; the rule is the remote's own adoption gate, so nothing is checked twice and nothing new is verified here; strict by construction where a format requires an anchor (Debian, Hackage) | The registry's key over records fetched on TLS alone or under a metalink, recorded per document rather than refused; the operator documentation must say what the signature attests; `artifact-verification.md` and `proxy-cache.md` expose the anchor class of a remote's current revision as a read |
| **B. Status quo: `verified` only** | No registry signature over an unverified stanza | Arch and Manjaro mirrors, Fedora and every TLS-only remote excluded from signed virtuals; two-section client recipes; a product limitation no owner chose |
| **C. Record-level admission by package signature (option B of `arch.md`'s resolved unsigned-member decision, was Q13 there)** | Each admitted Arch record backed by a packager signature the client also checks | Not computable at merge time: `%PGPSIG%` signs package bytes the merge does not hold, so "verifies" needs every package fetched first; helps no other format (apk checks no package signature, RPM's problem is the metalink, Alpine's and Debian's are the index); the database signature still vouches for `%SHA256SUM%` values nobody signed |
| **D. Make a metalink match a `verified` verdict in `artifact-verification.md`** | Fedora admitted | Rewrites a sibling's taxonomy (an integrity result stored as a verdict with no identity) to cure one format, and leaves Arch, Manjaro and TLS-only remotes excluded; subsumed by A's `integrity` class |
| **E. A per-remote operator opt-in flag admitting an anchorless member** | Explicit consent | A second knob saying what the absence of configured keys already says; A makes the anchor configuration itself the opt-in |

**Why this is yours:** it decides what the registry's signature on a virtual repository attests,
on the security-critical side of the produce/verify boundary, and it reverses a limitation four
format specs applied.

Accepted cost: the operator documentation states per format what a virtual's signature attests
and how to configure a remote's anchor so that the class is `signature`; the input record grows a
per-document admission outcome (`data-model.md` AC45, a consequence); the anchor class of a
remote's current revision becomes a read the index runtime takes through its own `Admission`
interface, not `format.Deps` (`artifact-verification.md` "Anchor class" and AC31,
`proxy-cache.md`, consequences; the `Deps` wording of the first record corrected in the Fable
follow-up of 2026-10-01). B lost to the product it removes; C to being uncomputable at
merge time; D to being partial and a taxonomy change; E to being a knob with no new information.

### Resolved: how a merging profile names a member's inputs (was Q21, raised and adopted 2026-09-30)

**Adopted 2026-09-30 under the owner's standing delegation**, in the Fable recheck. Option A: a
member input is a literal path, a template over variables the profile binds to a source (the
values the virtual's other members hold, a format constant, the virtual's `settings`, or a cell a
client of the virtual requested that nothing else covered), or a derivation the generator's pure
`DeriveInputs` computes from a document adopted earlier in the same job; the runtime answers
`proxy-cache.md`'s member-input interface for the remote's current state, the job replays in rounds
bounded by the profile's derivation depth plus one, and a remote-only cell is fetched read-driven
from the virtual's own miss (Design, "The generator contract", "Virtual merges", "Package shape";
AC35).

The question: AC35 said the first fetch requests "exactly the member-input paths the profile
declares", a static list. Five formats found it cannot express their inputs: `cran.md`'s
`{tree}` over the trees other members hold, `conda.md`'s subdirs plus `noarch`, `alpine.md`'s tree
and architecture, `arch.md`'s layout and database, `rpm.md`'s trees; `rpm.md`'s hrefs, `debian.md`'s
`by-hash` entries and `cpan.md`'s per-author `CHECKSUMS` exist only inside a document the same job
must first adopt; `debian.md`'s `{suite}` comes from the virtual's own configuration; and a tree
only the remote holds is covered by nothing, so it reached the virtual only after a direct client
of the remote caused its adoption. `proxy-cache.md`'s Fable recheck already amended its side to
rounds over a current-state interface and reported the matching change here.

**Recommendation:** A, because every source of a route is either something the runtime already
holds (the other members' document sets, the settings document, the remote's adopted documents)
or a client's own request, and a pure derivation in the generator package keeps the format
knowledge where the resolved renderer-placement decision put it; the read-driven cell turns the
one case nothing covers into demand, which is the stance every revalidation in
`proxy-cache.md` takes.

| Option | You get | It costs |
|---|---|---|
| **A. Literal, template with sourced variables, derivation; rounds; read-driven remote-only cells** | Every declared format expressible; no polling; a remote-only tree reachable through the virtual after one miss; the bound is computable at registration | `DeriveInputs` on the generator contract and a closure check at registration; a `404` for the first request of a remote-only cell; the virtual's input record carries requested cells |
| **B. A static path list, expanded by each handler at registration** | No contract change | A handler cannot see the other members' values at registration or a document adopted later, so the four formats stay unexpressible; a remote-only tree never reaches the virtual |
| **C. The revalidation job asks the handler through a new optional interface** | Format code answers directly | A fourth optional interface against `format-handler-interface.md`'s three-interfaces verdict, and a second path into handlers below the authorizer beside the one `auth.md` AC36 bounds |
| **D. Templates only, no read-driven fetch** | Simpler | A tree only the remote holds is invisible through the virtual until a direct client of the remote asks, the gap every affected format reported |

**Why this is yours:** it adds a member to the generator contract and lets a client's miss on a
virtual create upstream traffic, which sets how a virtual's demand reaches a remote's upstream.

Accepted cost: one more pure generator method, a registration-time closure check, and a first
miss per remote-only cell per virtual; a cell whose values fit the template grammar but which no
upstream holds costs one upstream request until the remote's negative entry lapses, coalesced
with the remote's other revalidation. B lost because it cannot express the formats; C to the
interface count and a second entry below the authorizer; D to the reported gap.

Amended in the Fable follow-up of 2026-10-01 (round 3), the option unchanged: the question's
framing listed `cpan.md`'s per-author `CHECKSUMS` beside `rpm.md`'s hrefs and `debian.md`'s
`by-hash` entries as a derivation, and the fold named it as one. `cpan.md`'s Fable recheck
refuted the shape: a derivation sees the index body alone, so over a public mirror it would name
every author directory the index does, 14,748 `CHECKSUMS` from `www.cpan.org` at a virtual's
creation, of which only the directories a second member also holds are ever composed. The CPAN
input is therefore a **template** over `{authordir}` sourced from the other members' author
sets, a shape this record already admitted, and the CPAN generator declares no derivation; the
derivation shape keeps its two consumers, `rpm.md` and `debian.md`, and the round bound is one
for every other merging profile (Design, "The generator contract"; AC35 and AC25's rows).

### Resolved: bounding and pruning the requested-cell set (was Q22, raised and adopted 2026-10-01)

**Adopted 2026-10-01 under the owner's standing delegation**, in the Fable follow-up. Option A:
a recorded cell is dropped once its expansion is a cached route of the remote or once the
negative entry its `404` created has lapsed with no request since; a virtual holds at most
`index.requested_cells_max` cells (default 256) and a request for a further cell is answered
from the merged set, recorded nowhere and enqueues nothing, with `index_requested_cells{repository}`
showing the size (Design, "Virtual merges"; the configuration table; AC35). It is owner-facing.

The question: `auth.md`'s Fable recheck found that the read-driven cell of the resolved
member-input decision (was Q21) is the one place a client's request grows server state and
causes upstream traffic through a virtual: distinct cells fitting a variable's grammar each cost
one upstream request per remote until the negative entry lapses, and the record was unbounded.
`data-model.md` gave the record the fields a prune needs (variable, value, recorded-at,
last-requested-at) and left the rule here.

**Recommendation:** A, because the cap bounds what a virtual's clients can cause per negative
window to a number the operator sets, refusing at the cap keeps one client from evicting
another's cell, and the two prune conditions drop a cell exactly when it has done its work (the
cache entry's recorded route carries a positive cell from then on) or when nobody wanted it
across a whole negative window.

| Option | You get | It costs |
|---|---|---|
| **A. Prune on cached or lapsed-unrequested; cap with refusal; a gauge** | Upstream traffic per virtual bounded by the cap per negative window; no cross-client eviction; the set drains by itself; saturation visible | One more configuration key; a legitimate new cell is not fetched while the set sits at the cap until a prune drains it, which the gauge shows |
| **B. Cap with least-recently-requested eviction** | A new cell is always recorded | A client cycling distinct cells evicts other clients' cells and keeps the whole cap's worth of routes replaying; the bound is per replay, not per window |
| **C. Prune only, no cap** | No key | Between prunes the set and the upstream traffic grow with the distinct cells a client names, a negative window at a time |
| **D. No read-driven cells (revert to templates only)** | Nothing to bound | The resolved member-input decision's option D, lost there to the gap every affected format reported |

**Why this is yours:** it sets how much upstream traffic a client of a virtual can cause at the
operator's remote, and it adds a configuration key to `deployment.md`'s inventory.

Accepted cost: the fifteenth key and its `deployment.md` inventory row, the gauge's
`observability.md` catalogue entry, and the stall at the cap. B lost to cross-client eviction; C
to being unbounded between prunes; D to the gap.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-27 | 1fbf1e7 | authoring pass: grounded first draft, not a review | Not a review. Gathered the requirement lists of the twenty-two format specs that cite this file, the prototype spec, `replication.md`, `artifact-verification.md`, `management-api.md`, `conformance-harness.md`, `data-model.md`, `storage-and-gc.md` and `format-handler-interface.md`, and the items the consequences queue placed here (replication item 6; Open items 9, 11, 12, 14 to 32; theme 1; management-api item 14; artifact-verification item 13). Grounded prior art by fetching Pulp's signing-service guides, reprepro(1), aptly's publish guide, Nexus's Yum and APT signing pages, Artifactory's GPG signing page, the TUF specification, the Debian repository format, and the Go seams (`sigstore/sigstore` `kms.Get`, `crypto11`, go-crypto's `NewSignerPrivateKey`), each cited with what is taken and rejected. Eleven questions written in the decision shape and adopted under the standing delegation: write-path dispatch, signature records outside snapshot content, per-format generator packages behind an optional `Indexer`, the freshness split with `data-model.md` and `proxy-cache.md`, the produce/verify boundary with a self-check, per-repository keys, `file` custody by default behind one `crypto.Signer` seam with KMS, PKCS #11 and operator-held keys, per-document locking, verbatim pointer documents on followers with a takeover precondition, no Galaxy server-side signing, and rotation as a snapshot-less operation. Twenty-eight criteria with Test Plan rows; ten mechanical enforcers named; five phases. Sibling consequences reported to the caller, not applied. `node scripts/check-spec.js` run on this file. Stays draft. |
| 2026-09-28 | 3a82b21 | cross-spec reconciliation of the foundation authoring wave. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` targeting this file verified against the source spec's current text before applying. From `async-operations.md` (item 5): "except the cadence scheduler" dropped, the cadence is the `signing.resign` `Schedule` with an expiry-derived next run written in `Finish` and the virtual merge the `index.merge` kind (coalesce and exclusivity key `virtual:{repository}`), both on `internal/async`, which lands at the start of charter step 4b and so precedes Phase 1: the "fixture runner until that spec's runtime exists" wording is gone and AC19 and AC22 are asserted on the production runtime, their rows shared with that spec's AC11 and AC14. From `deployment.md` (item 1): the `signing.master_key` row removed, the `file` backend encrypts under `security.master_key` (its resolved master-key decision, was Q5 there), fourteen keys plus the citation, AC26 reworded. From `repository-lifecycle.md` (item 9): keys retire in the deletion transaction, public forms resolve by digest until tombstone time, private material is destroyed then, rename changes nothing (new "Keys follow the repository's lifecycle" paragraph, AC29 with a Test Plan row), and a virtual's first merge is enqueued at creation (AC19). From `observability.md` (item 9): the `signing_*` and `index_*` metrics, `SigningFailed`, `SigningDocumentExpiring`, `VirtualMergeFailed` and `VirtualMergeStalenessBreach`, the `signing.key.*` audit events with their attributes (AC15), private material as `slog.LogValuer` and AC14's scan through `telemetry.NewTestRecorder`, `// gate:` on AC28's benchmark. From `conformance-harness.md`'s reconciliation (item 10): the `signing` sub-entry's `generate` defined as key generation under the `file` backend at repository creation (Design, AC21). From the `data-model.md` reconciliation (item 1): "`data-model.md`'s to add" became citations of its "Freshness scoped to the pointer", AC36 and AC37, and a record is pruned when no retained snapshot or pointer document holds its body; from the `storage-and-gc.md` reconciliation (items 3 and 7): the fourth root's widened reach cited as AC16 and the pre-commit hook the write path dispatches through cited as `data-model.md` AC37 and `storage-and-gc.md` AC25; from `format-handler-interface.md`'s (item 5): the re-open answer cited to "Optional interfaces discovered at registration" (was Q10 there); from `proxy-cache.md`'s (item 8): AC22 for the cache-scoped half; from `replication.md`'s (item 8): AC21 and AC10 in AC23's row. The four format specs' rotation rewording (item 9 of this spec's authoring) is still queued and cited as such. Already done at authoring: replication fold item 6, management-api item 14, artifact-verification item 13, the Open items and theme 1. `node scripts/check-spec.js` on this file: zero failures. Stays draft; awaits an independent review. |
| 2026-09-28 | 173da1b | closing reconciliation sweep of the format batch 3 to 8 items, on Opus. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` targeting this file from "From format batch 3 reconciliation" through "From format batch 8 reconciliation" verified against the current text of the format spec that raised it (`debian.md`, `luarocks.md`, `chef.md`, `terraform.md`, `hackage.md`, `cpan.md`, `openvsx.md`, `composer.md`, `homebrew.md`, `opam.md`, `vagrant.md`, `cran.md`, `puppet.md`, `cargo.md`, `nuget.md`, `rpm.md`, `conda.md`, `alpine.md`, `maven.md`) and against `proxy-cache.md`, `data-model.md` and `async-operations.md`, and applied as five designs rather than item by item. Serving: batch 5 item 4, batch 6 item 6, batch 7 items 1 and 3, batch 8 item 9 (puppet half) as Q13 (serve-time `Render` stage, memo, `ETag` from body, variant and inputs, on-request `gzip` with a per-encoding `ETag`) and Q14 (`ServeRendered`, `ServeFile`, `Documents` in `Deps`, the boundary module-wide over five header names); batch 6 item 2 folded (byte ranges, `If-Range`, `multipart/byteranges` from `ServeFile`); batch 5 item 5 folded (`SignedBy`). Conditional rule: batch 7 item 2 as Q12, after finding `cpan.md` (CPAN.pm's captured later-date fallback) and `homebrew.md` (brew's own-clock condition) need opposite answers, so neither a single rule nor proxy-cache AC22's two clauses together can hold; AC11 rewritten. Repository-wide documents: batch 6 item 1 folded under `hackage.md`'s adopted was-Q16 (repository-scoped pointer documents, repository batches, a repository-scoped `signing.resign` schedule; AC33). Virtual merges: batch 3 item 6 and batch 6 item 3 as Q15; batch 4 item 7, batch 6 item 3, batch 7 item 5 and batch 8 item 9 (CRAN half) as Q16; batch 7 item 4 applied (Vagrant out of the merge list, into `FromUpstream`; AC20); consumer list now names maven, opam, hackage, cpan and debian beside the original set. Boundary: batch 6 item 4 as Q17. Rotation: batch 6 item 5 folded (CPAN under `announce-switch-retire`). Cache-Control: batch 8 item 9 as Q18. Earlier items found already done: every item before format batch 3 is recorded as applied in the progress log and verified in the text; the four rotation rewordings (this spec's authoring item 9) are now applied in `hex.md`, `arch.md`, `rpm.md` and `alpine.md`, so the "queued" wording became a citation. Also found: the configuration table held thirteen rows under a "fourteen keys" sentence; with `index.render_memo_bytes` it holds fourteen. `Deps` did not carry the serving door although AC11 required every handler to use it; `Documents` now names it. New AC30 to AC37 with Test Plan rows; AC11, AC20, AC25 rewritten; Phases 1 to 4 updated; seven questions adopted, so `fable_recheck` extended. `node scripts/check-spec.js`: zero failures on this file. Stays draft; awaits an independent review. |
| 2026-09-28 | 4278ce0 | leftovers pass of the closing sweep on Opus: cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Applied the items queued against this file after its closing sweep, each verified against the owning spec's settled text. Proxy-cache closing sweep item 2: (a) a merging `Profile` declares each member-read document's member-input path under the member's mount, replayed by `proxy-cache.md`'s `proxy.revalidate` job for a never-adopted remote (its "Revalidation outside the request", AC26), with registration refusing a merging profile that lacks one; (b) the import direction the item asked to check: `ServeDocument` calling `internal/proxy`'s `EnqueueRevalidation` and `Adopt` registering on its adoption commit put an edge from `internal/index` into `internal/proxy`, while the job in `internal/proxy` needs the profile's paths, so the two packages could cycle; raised and adopted **Q19** under the standing delegation (option A: `internal/index` imports `internal/proxy`, never the reverse, the paths flowing back through a one-method interface `internal/proxy` declares, wired at the composition root beside the replay entry), folded into "Package shape", the enforcer table and AC35; (c) `Adopt` receives the handler's adoption-check result and `FromUpstream` runs over exactly its records ("Virtual merges", "Package shape", AC20); (d) AC20's row cites `proxy-cache.md` AC25 and AC35's cites its AC26. Async-operations closing sweep item 2: the read-path enqueue runs in a transaction holding only the job row and the read is served whether or not it commits (`async-operations.md`, "Enqueue is transactional"), in "Virtual merges" and AC35, whose row cites that spec's AC11 and AC29. Data-model closing sweep item 2: the four "`data-model.md`'s to list (reported)" lines now cite its "Freshness scoped to the pointer", AC36 and AC45, and the stale "the rewording is reported to it" line notes that `proxy-cache.md` AC22 now states the two declared rules. Format-handler-interface closing sweep item 6 (optional, applied): AC2's row cites that spec's AC15 and re-open inputs. Found already done: every earlier item for this file. 37 criteria, each with a Test Plan row; nineteen questions resolved, zero open; `fable_recheck` extended for Q19. Stays draft. |
| 2026-09-30 | ccb9ac9 | Fable recheck: full review (claim verification against every cited sibling at this sha, `proxy-cache.md` read at its recheck commit f2b770b; adversarial lens on the merge, custody and serving designs; constitution; go-spec-reviewer inline, its codebase step vacuous since `internal/` holds no Go code) + re-examination of all nineteen adoptions made without Fable (Q1 to Q11 in the cloud-session authoring, Q12 to Q19 on Opus), the design judgement treated as unreviewed | Brought current first: every open consequence against this file applied and verified against the current text of its source (format closing sweep batch 2 items 1, 2 and 4, batch 3 items 1 to 3, rubygems item 1, the storage-and-gc recheck's item 4, and the member-input change `proxy-cache.md`'s recheck reported). Verdicts: Q1 to Q7, Q9 to Q15 and Q18 confirmed, several with an under-stated cost added to the record (Q1's lock placement, Q2's whole-repository refetch after a rotation, Q3's read view as an interface); Q8 amended (lock order against the head lock `storage-and-gc.md` AC30 takes last); Q16 amended (a static input list cannot express four formats, and a `local` member's rollback or promotion was missing from the merge triggers, now enqueued through `Transition`, AC19); Q19 amended (the interface answers for current state in bounded rounds, matching `proxy-cache.md`'s amended was-Q18); Q17's composed half SUPERSEDED by Q20 (owner-facing): admission into a signed body follows the anchor class the remote's adoption ran under, `signature`, `integrity` or `none`, a `failed` verdict never, recorded per document on the input record, binding signed bodies only, so the exclusion of Arch's and Manjaro's mirrors, Fedora and TLS-only remotes that four format specs applied is reversed and unsigned virtuals are explicitly unbound (Design, AC36). Q21 adopted: member inputs as literal, template over sourced variables and `DeriveInputs` derivation, rounds bounded at registration, a read-driven first fetch for a remote-only cell (Profile, AC35, the enforcer table). Folded from the queue without a question: the merge reads inputs by declared digest and receives the previous merged set, the swap writes the merged document's declared list with retained generations (AC19, shared fixture with `storage-and-gc.md` AC16), the stored `body-md5` `ETag` and `Repr-Digest` (AC30, RubyGems in the consumer table). The adversarial pass found the missing rollback trigger, the unstated lock order and the absent home of AC36's "operator record" (now the input record, a `data-model.md` AC45 consequence); nothing found that adds a mark root or weakens `auth.md` AC10. Sibling consequences reported to the orchestrator, not applied. 37 criteria, each with a Test Plan row; 21 questions resolved, zero open; `node scripts/check-spec.js` zero failures; `fable_recheck` cleared. draft -> planned. |
| 2026-10-01 | 939a304 | Fable follow-up: queued cross-spec items since the recheck | Every item in `agents/spec-loop/consequences.md` targeting this file after the 2026-09-30 row collected and verified against the current text of its source spec and of this one. Applied: `auth.md` recheck item 1 (each template variable declares a grammar of segments with no empty, `.`, `..`, in-segment slash or percent-encoded value, refused at registration, checked on every value whatever its source so the expansion normalises to itself under the remote's mount; a cell is recorded only by `ServeDocument` inside a router-authorized read of the virtual, never by the replay entry or a job; Profile bullet, "Virtual merges", the enforcer row, AC35 and its row now shared with `auth.md` AC36's `internal/proxy/revalidate_job_test.go`); its bound-or-prune half as **Q22**, adopted under the standing delegation and owner-facing (a cell dropped once its route is cached or its negative entry lapsed unrequested; `index.requested_cells_max`, default 256, refusing rather than evicting at the cap; the `index_requested_cells{repository}` gauge; the configuration table now fifteen keys). `data-model.md` recheck item 1 (the cell written as variable, value, recorded-at and last-requested-at to the swap-surviving part of the input record, a repeat request updating the last-requested time; AC35 and its row shared with `data-model.md` AC45; AC36's row shared with its outcome-and-class fields). `format-handler-interface.md` recheck item 4 (the verdict and anchor class are the index runtime's reads through an `Admission` interface `internal/index` declares, never `format.Deps`; "The produce/verify boundary", "Package shape", AC36, and the two records that said "through `Deps`", was-Q5's recheck note and was-Q20's accepted cost, corrected in place). `artifact-verification.md` recheck item 3 (the anchor-class read and the CPAN-cure sentence cite its "Anchor class", "Sources" and AC31; a keyless remote reads class `none` with an `absent` verdict, never `failed`, so "failed never admitted" excludes only what a configured anchor rejected; AC36 and its row). `deployment.md` recheck item 2 (no `signing.*` or `index.*` key has a flag, the flag set being its fixed eight; "Configuration and CLI stance", AC26 and its row). `repository-lifecycle.md` recheck item 2 (the cadence re-sign runs on a `read_only` repository through the door's document-only form under `Renewable`, AC22 and its row sharing `conformance/debian/readonly_test.go` with its AC10; key operations refused `405` `read-only` on a frozen repository, AC15 and its row sharing `internal/repository/readonly_test.go`; the deletion write runs no generator and renders no pointer document, "Key custody", "The write path dispatches", AC1, AC29 and its row sharing its AC14's no-hook clause; a virtual's rename enqueues one coalesced merge and calls no `Apply`, the first-merge bullet, AC19 and its row sharing `internal/repository/delete_virtual_test.go` and `conformance/debian/rename_test.go` with its AC29). Declined as already applied at ccb9ac9 and verified in the text: `storage-and-gc.md` recheck item 4 (the merged document's declared list through the shared reference-creation call, "Virtual merges" storage bullet, AC19 and its `metadata_blob_gc_test.go` row), `proxy-cache.md` recheck item 1 (templates, derivations, rounds and the stored validators, AC35 and AC30), `async-operations.md` recheck item 6 (AC35's row already cites async AC29). Adversarial pass on the changes: AC1's "every completed write regenerates" contradicted the deletion exemption until AC1 named it; the cap had to refuse rather than evict or a client could push out another's cell; the prune on "route cached" rests on `proxy-cache.md`'s never-evicted current metadata documents (its was-Q21), which holds. No mark root added, `auth.md` AC10 untouched, `Deps` carries nothing new. Sibling consequences reported, not applied: `deployment.md` (fifteenth key), `observability.md` (the gauge), `async-operations.md` AC29 and `proxy-cache.md` AC26 and `data-model.md` AC45 (the cap case: no record and no enqueue), `format-handler-interface.md` and `artifact-verification.md` (the interface's name `Admission`, optional citation). 37 criteria, each with a Test Plan row; 22 questions resolved, zero open; `node scripts/check-spec.js` zero failures. Stays planned. |
| 2026-10-01 | f2e400a | Fable follow-up: queued cross-spec items since the recheck (round 3) | A review, narrower than the recheck: the whole of `agents/spec-loop/consequences.md` read, every item targeting this file after the 939a304 row collected (the "Foundation follow-up round 3" list: the cpan recheck's item 1, the replication gate review's item 2, the rpm recheck's item 3, the arch recheck's item 2, the alpine recheck's item 2, the arch follow-up's item 1, and the observability optional wording still open after round 2), each verified against the current text of its source (`cpan.md` "Virtual repositories" and its was-Q12 record as rechecked at b51b300; `replication.md`'s takeover section, was-Q12, AC16 and AC21 at HEAD; `proxy-cache.md` AC14 and AC29 and the was-Q21 record; `arch.md` AC18 and AC23; `alpine.md` AC20; `observability.md`'s `index_requested_cells` catalogue row; `async-operations.md`'s `signing.resign` kind row and `storage-and-gc.md` AC25 for the door's forms), then read adversarially against the rest of this spec. Applied, PRIORITY (cpan recheck 1): the was-Q21 record, "The generator contract" and AC35 had named `cpan.md`'s per-author `CHECKSUMS` as a `DeriveInputs` derivation over the index, a shape that over a public mirror fetches every author directory the index names (14,748 `CHECKSUMS` from `www.cpan.org` at a virtual's creation) when only the directories a second member also holds are ever composed; it is a template over `{authordir}` sourced from the other members' author sets, which that record already admitted, and the CPAN generator declares no derivation. Corrected in the template examples, the derivation examples (now `rpm.md` and `debian.md` alone, with the rule stated: a derivation fits only where every path a document names is an input the merge needs), `DeriveInputs` (never called for a profile declaring no derivation), the round bound (one for every merging profile but `rpm.md`'s and `debian.md`'s, replacing a "two for every profile" claim that was already false for arch, alpine, cran and conda), AC35 and its row (a CPAN-shaped fixture whose expansion requests exactly a second member's directories), AC25's determinism row (derivation fixtures for the two profiles that declare one, no CPAN derivation fixture) and the was-Q21 record's amendment note. Applied (replication gate 2): takeover re-signs in the request and registers the cadence, per `replication.md`'s was-Q12. The gap this exposed here: nothing in this spec said who creates a `signing.resign` `Schedule` row (`Finish` only rewrites next runs), so the registration a caller other than `Finish` needs had no entry point. Named: `signing.Service.RegisterSchedules(ctx, tx, repository, nextRun)`, idempotent on the caller's transaction, one row per signed pointer plus the repository-scoped row where declared, a new row at the caller's `nextRun` and an existing row untouched, the only writer of those rows outside `Finish`; its two callers are the runtime at a pointer's first document with a validity window (passing the expiry-derived value, so a document signed in the write is not re-signed the moment it commits) and the takeover transaction (passing now, so the cadence is the retry path if the request's render fails). "Replication" rewritten in three parts (precondition; the ending transaction's registration; the same request's re-sign through the door's standard document-only form under `Renewable`, every pointer in one batch, next runs written from the renewed expiry, and the failing-key outcome: link `ended`, documents the leader's, schedules standing, request failing naming the key, `SigningFailed` on each cadence attempt until the key signs); Scope, "Rotation profiles", "Package shape", Phase 5, the was-Q9 amendment note, AC23 and its row (`takeover_keys_test.go` gaining the registration, the re-render, the refusing fixture key and the unsigned-format case, shared with `replication.md` AC21; a new `internal/signing/schedules_test.go`; `conformance/replication/takeover_expiry_test.go` shared). Applied, optional: the "Virtual merges" and AC19 wording that a merge survives "LRU eviction ending the serving handle of a `primary`" replaced by the settled rule that the eviction pass never ends a declared document while declared (`proxy-cache.md` AC14, AC29), the AC19 fixture now an eviction pass under quota pressure skipping the declared inputs and a store-injected missing blob; AC36's conformance rows naming arch's `DatabaseRequired` install, provider case and remote-only cell, the withdrawn-signature revision never composed because the adoption refuses it (`proxy-cache.md` AC25, `arch.md` AC18's case), and `conformance/alpine/virtual_remote_test.go`'s keyless remote, with a real `apk` added to AC36's text so the row is backed by the criterion; `index_requested_cells` stated as leader-exported and folded into `_other` by maximum, with the reason. Nothing declined; no question raised or adopted. Adversarial findings on the fold: (1) a `RegisterSchedules` that always set next run to now would make the cadence re-sign a document the write had just signed, hence the caller-supplied `nextRun`; (2) the takeover's re-sign cannot share the ending transaction because the door's on-a-transaction form is the runner's alone (`storage-and-gc.md` AC25), so the spec says why it is two steps rather than implying one; (3) the per-pointer and repository-scoped schedules both need registering at takeover, since a Hackage replica's `root.json` renews only under the repository-scoped one (AC33). Nothing adds a mark root, widens a token, or touches `auth.md` AC10. No em-dashes on touched lines. `node scripts/check-spec.js`: zero failures on this file. 37 criteria, each with a Test Plan row; 22 questions resolved, zero open; stays planned. Sibling consequences reported, not applied: `management-api.md` (its takeover row, already queued by the replication gate's item 1, may name `signing.Service.RegisterSchedules` and cite this spec's AC23 for the failing-key outcome); `async-operations.md` (the `signing.resign` kind row: the rows are created by `RegisterSchedules`, by the runtime at a pointer's first signed document and by the takeover transaction, and `Finish` only rewrites next runs; AC14's cadence clause may cite it); `replication.md` (optional wording: the takeover section and was-Q12 may name the entry point and its `now` argument; AC21's row may share `internal/signing/schedules_test.go`); `data-model.md` (optional: "Jobs and schedules" may say a `signing.resign` row is created by `RegisterSchedules`); `conformance-harness.md` (optional: replication's cases gain `conformance/replication/takeover_expiry_test.go`). |
