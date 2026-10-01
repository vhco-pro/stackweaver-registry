---
status: planned
status_description: "Fable follow-up round 3, 2026-10-01 at ebfe85c, still planned: the three items queued since round 2 applied, none declined (the classifier's first input is the hook as it applied, so a Verify declared over a paired set's optional member or a document's optional signature segment that the upstream served without did not apply and the class is none, or integrity beside a Check, with verdict absent whatever keys the remote holds, per proxy-cache's owner-facing was-Q23, folded into Scope, Anchor class, AC31 and its row, where anchor_class_test.go gains the unserved-member case; the served-or-not fact cited as data-model AC44's fourth field, written and compared by internal/proxy and never a classifier input nor what Admission returns; the keyserver-import cure re-verified against cpan.md at HEAD, whose AC25 and AC26 cite AC23, AC25 and the no-anchor rule this round makes AC31 state). Earlier: Fable follow-up 2026-10-01 at 5303c57, still planned: the three items the sibling follow-ups queued after this spec was planned applied, none declined (data-model's verification-records row cited as it now stands, with the revision column and the want-list, in place of the stale superseded-marks note; the index runtime's read named Admission and cited to signing-service's Package shape; the adoption commit reaching the classifier through the one-method interface internal/proxy declares), plus two stale citations fixed on the lines swept (the keyserver-import cure is cpan.md AC25, and deletion's job cancellation is async-operations AC28's CancelByRepository, no longer queued). Earlier: Planned by the Fable recheck of 2026-10-01 at 9c59120: a full review pass over the cloud-authored whole (claim verification of every sibling citation at HEAD, adversarial lens at full strength, go-spec-reviewer inline, constitution compliance) plus the re-examination of the eleven questions adopted without Fable. Verdicts: Q4, Q5, Q6 confirmed; Q1 amended (superseded is derived from the verdict's revision, never a mass-written mark; an overtaken job ends at its checkpoint; the cost restated: every revision, additive or not, refuses under a verified-requiring rule for the length of its re-evaluation), Q2 amended (a Verify against a trust set with no entry of the scheme's kind answers absent; untrusted-key needs an entry of the kind), Q3 amended (the network-reaching sources live in internal/trustsource, not under internal/verify/**, which AC22 forbids; keyserver import also refreshes subkeys, the CPAN cure), Q7 amended in fold (RubyGems joins index-vouched provenance), Q8 amended (a revocation want-list recorded per verified chain, fetched by the refresh, a change being a revision), Q9 amended (the index runtime's verdict and anchor-class read is a fourth consumer, never Deps; CMS candidates by module path), Q10 amended (the claim-to-identity mapping is credential-management's profile row, code not data; a generic-profile robot is refused at the trust-set write), Q11 amended in fold (gem push --attestation enforcing). None superseded. Queued items applied: the anchor class as a fact this spec derives at adoption from the trust set as it stood, written on data-model's cache-scoped column (AC44) by the adoption commit (proxy-cache AC25) and read by the index runtime (new AC31; no metalink-as-verdict change, signing-service's option D declined); the generic-profile refusal (AC28); a RubyGems row, entry, position and criterion (new AC32); the data-model column. 32 criteria, each with a Test Plan row; eleven questions resolved, zero open; fable_recheck cleared. Sibling consequences reported for data-model, proxy-cache, signing-service, async-operations, management-api, credential-management, cpan, alpine, arch, rpm, rubygems, question-triage and CLAUDE.md. Earlier: Closing reconciliation sweep 2026-09-28 at 3135d95 on Opus (not a review): a raw RSA-SHA512 entry (PKCS #1 v1.5 over SHA-512 of Hex's Signed payload, public_key:sign/3's form) run through Check as an integrity call in the proxied verifier hook, refusing the commit on mismatch and recording no verdict, with an RSA type under raw-keys (2048 bits or more, the SPKI PEM identified by its OpenSSH SHA256 fingerprint) (AC30, Phase 4); Hex's row split out of the Nothing row to mean nothing on artifacts; the npm, PyPI, Galaxy and OCI positions cite their landed criteria (npm AC22, pypi AC14 and AC18, ansible AC11, oci AC14) instead of queued consequences. 30 criteria, zero open questions; stays draft. Earlier: Reconciled 2026-09-28 at 3a82b21 with the foundation authoring wave (not a review): the re-evaluation worker is the verify.reevaluate kind on internal/async with a checkpoint per page and its bound in async.kind_limits (verify.workers retired, deployment's decision), the TUF and revocation refreshes are the verify.tuf_refresh and verify.revocation_refresh schedules, trust and verdict reads are pull with only trust writes and import admin (management-api's table), trust set revisions drop at tombstone time while verdicts never do and rename changes nothing (AC29), metrics and the VerificationFailed alert named from observability's catalogue, the bench gate comment, and every owed record or hook (data-model AC34, storage-and-gc AC21 and AC22, proxy-cache AC20, conformance-harness trust key, catalogue AC7) cited as applied. 29 criteria, each with a Test Plan row; zero open questions. Earlier: authored 2026-09-27 at ab22b0d as a grounded first draft. Gathers the verification entries 26 format specs asked for, the verdict interface supply-chain-policy.md pinned on the consuming side, and the queued consequences (PEP 740 in-upload verification, Galaxy signatures, NuGet author and repository signatures, clients that verify nothing), grounds the design in Sigstore's client specification and trusted-root format, PEP 740, CEP-27, cosign's storage layout, npm's signature conventions, NuGet's trust model, zot, Harbor and the pulp_ansible and ansible-galaxy sources fetched this run, and fixes one verifier with one stored verdict per (repository, digest, scheme) under a revisioned per-repository trust set. Eleven questions written in decision shape and adopted under the owner's standing delegation; zero open. 28 criteria, each with a Test Plan row. Awaits a /spec review pass."
description: "Spec for artifact signature and attestation verification: one shared verifier behind the handlers and the proxy layer, per-repository trust sets, Sigstore, OpenPGP, CMS, apk, RPM, JWS, Ed25519 and TUF entries for the ecosystems the format specs raise, and a stored per-digest verdict that supply-chain-policy.md consumes."
author: michielvha
goal: "Make 'verified' a stored, explainable fact about a digest under a named trust set, produced once by a shared service on both paths, so that no handler ever holds a signature primitive and policy can require a verified identity for any format that has one."
priority: high
issue: 46
created: 2026-09-27
covers:
  - "internal/verify/**"
  - "internal/trustsource/**"
---

# Plan: Artifact verification

One shared verifier, `internal/verify`, that checks signatures and attestations for every format
that has them, at ingest on the hosted path and at cache commit on the proxied path, against a
revisioned per-repository trust set, and records the outcome as a verdict keyed by artifact digest
that `supply-chain-policy.md` consumes and the management API exposes. It never produces a
signature: that is `docs/internal/plans/foundation/signing-service.md` (charter step 7), which
produces and never verifies, and whose one verifying call is a self-check of its own output
through this spec's `Verifier` with public material before commit (its resolved boundary
decision, was Q5 there; its AC17).

## Context

**Who depends on this.** `supply-chain-policy.md` adopted a sibling spec as the producer of
signature and attestation state (its resolved verification-ownership decision, was Q6) and pinned
the consumer interface on its own side: `internal/policy` defines a verdict source answering, per
artifact digest, one of verified, failed or absent, with the identity a verified verdict was
checked against; a rule may require a verified verdict, optionally from a named identity; an
absent verdict is not a verified one; a signature rule is refused at configuration until a
verdict source exists (its AC15 and its resolved rule-binding decision, was Q8). This spec
implements that source. `project-charter.md` builds it at **step 4b**, before supply-chain policy
and before npm, "as a shared service rather than inside whichever format first meets a
signature", and its AC12 asserts the ordering.

Twenty-six format specs cite this file. What each asks is gathered here from its "What artifact
verification must provide" or "Signing, provenance and policy" section, and from
`agents/spec-loop/consequences.md` (items 3 of the supply-chain fold, 2 of the format-management
fold, and open items 9, 11, 14, 16 to 22, 24 to 28 and 30 to 32, plus cross-cutting theme 4):

| Format spec | What it requires of this spec |
|---|---|
| `formats/oci.md` | Cosign and Sigstore over OCI referrers and the `sha256-<hex>.sig` tag convention as this spec's first entry (supply-chain fold item 3); the handler's half, discovery and the hand-off through `Deps`' `Verifier`, is its AC14, sharing `conformance/oci/cosign_test.go` with AC6 here; the charter builds this spec alongside OCI's policy phase |
| `formats/npm.md` | Provenance attestation verification "lands there or in its consumer"; consequences item 3 names npm provenance and registry signatures |
| `formats/pypi.md` | PEP 740 verification **inside the upload request, before anything commits**; a publisher-identity trust model per repository and project; a home for the verified attestation from which both index serializations serve provenance, with `api-version` rising only when the field is served; a position on proxied provenance (pass through, verify or re-host); a criterion shape for lifting its AC14 refusal (valid accepted and served, tampered refused) |
| `formats/rubygems.md` | A RubyGems row naming the Sigstore entry on both paths: bundles from `gem push --attestation` verified inside the push and refused `422` on failure, as PyPI; the upstream's `/api/v1/attestations/{full_name}.json` fetched, verified and re-hosted on a proxied remote; the in-gem X.509 `.sig` entries ask nothing (its resolved attestation decision, was Q8 there; AC26, AC27) |
| `formats/ansible-collections.md` | A decision between user attachment and server-side signing; if attachment, an endpoint of `management-api.md`, never a Galaxy route; the served entry shape grounded in Galaxy's real traffic; a position on proxied signatures it passes through unverified (its resolved Q7); a criterion shape for its AC11 revision; a verdict policy consumes |
| `formats/conda.md` | CEP-50 sidecar Sigstore bundles verified as CEP-27 publish attestations against a per-repository identity policy, checking the subject filename and `sha256` against the stored file and `targetChannel` against the repository's own URL or a configured upstream's |
| `formats/swift.md` | A synchronous entry at ingest before commit (archive, `cms-1.0.0` signature, signed metadata, manifests); the validity rules every client enforces (one signer, SHA-256 over the archive, ECDSA P-256, code-signing EKU, one signer across archive and manifests) refused at ingest; **trust as a verdict, not an ingest gate**, against per-repository DER roots with the client's expiry and revocation options; the signing entity extracted into the version document; the same entry for proxied content |
| `formats/nuget.md` | Author signature and repository countersignature inside a `.nupkg`, with the SDK's trust-bundle semantics on Linux (a root store valid for code signing and timestamping, falling back to the SDK's own bundle); the signer identity; a position on revocation checks (`NU3018`, `NU3028`); if repository signing is ever adopted, countersigning before the CAS commit is `signing-service.md`'s (consequences item 9) |
| `formats/maven.md` | Detached PGP `.asc` over the file it names against a per-repository trust set (key servers as Gradle uses them, or an operator-imported keyring), the per-digest verdict and signer identity; the unsigned-file position is `supply-chain-policy.md`'s rule-binding refusal |
| `formats/terraform.md` | OpenPGP detached verification of `SHA256SUMS` against the key set an upstream download document lists, RSA, ECDSA and Ed25519, binary signatures, identity being the upstream and key id; the `h1:` package hash computed from verified bytes |
| `formats/rpm.md` | OpenPGP detached verification of `repomd.xml` (armored and binary); RPM header and payload digests and the header signature against a key set, answering with key id, key algorithm and digest algorithm so policy can refuse SHA-1 or Ed25519 as a rule; metalink checking |
| `formats/alpine.md` | apk v2 signed-stream verification with the client's first-trusted-key rule (`RSA`, `RSA256`, `RSA512`, the digest over the stream that follows the segment); package integrity against `C:`, `S:` and `datahash`, each answered separately |
| `formats/arch.md` | OpenPGP detached verification where **every** signature packet must verify and an expired key's valid signature counts; package integrity against `%CSIZE%` and `%SHA256SUM%` |
| `formats/cpan.md` | OpenPGP cleartext verification of an upstream `CHECKSUMS` with primary keys and subkeys, treating a signature made before expiry as gpg does; `verified (repository chain)` for a proxied archive matched by a verified `CHECKSUMS`, `absent` for hosted |
| `formats/hackage.md` | hackage-security TUF chain verification (root, timestamp, snapshot, mirrors, index; trusted root key ids and threshold; canonical JSON and the root-update rule) with the first failing link's reason; `verified (repository chain)` for a proxied tarball, `absent` for hosted |
| `formats/homebrew.md` | JWS verification in general JSON serialization, PS512 with an unencoded payload (`b64: false`) and the `crit` header, against a `kid` and a configured key defaulting to Homebrew's `homebrew-1`; a bottle is verified when a verified API document names its digest |
| `formats/openvsx.md` | The raw Ed25519 envelope (`.signature.sig` inside `.sigzip`), per-remote key pinning with divergence recorded on a new key identifier, the verdict computed from the CAS blob after the verified commit |
| `formats/julia.md` | A streaming git tree-hash entry with collision-detecting SHA-1 and a resource-kind flag (registries include empty directories; packages and artifacts skip empty directories and `.git`) |
| `formats/puppet.md` | A release-integrity entry: SHA-256 with an MD5-only `weak` answer; `absent` for every Puppet artifact |
| `formats/vagrant.md` | A box-integrity entry over Vagrant's checksum types (`md5`, `sha1`, `sha256`, `sha384`, `sha512`, compared case-insensitively), recording `md5` and `sha1` as weak; `absent` for every box |
| `formats/luarocks.md` | An optional detached OpenPGP verdict source over exact file bytes, keys per repository, no LuaRocks-specific logic |
| `formats/helm.md` | Nothing until this producer exists; a stored `.prov` is "that producer's raw material, retrievable by digest" |
| `formats/conan.md` | Nothing in v1; the input for a future plugin scheme is the two manifest files beside the artifact files |
| `formats/hex.md` | Nothing on artifacts: Hex signs the registry, never the tarball, whose only integrity primitives are the two checksums the registry advertises. On the proxied path, the check of an upstream `Signed` payload (`/names`, `/versions`, `/packages/{name}`) against the upstream's RSA public key in the remote's trust set, RSA PKCS #1 v1.5 over SHA-512 as `public_key:sign/3` produces, run as an integrity call in the post-receipt verifier hook that refuses the commit on `mismatch` (its resolved trust-anchor decision, was Q9, AC17, AC21) |
| `formats/cargo.md`, `composer.md`, `cran.md`, `debian.md`, `go-modules.md`, `opam.md`, `pub.md`, `chef.md` | Nothing: no artifact signature or attestation reaches the registry in those ecosystems (Debian signs the repository, which is `signing-service.md`'s; Go's checksum database is a passthrough) |

Three queued consequences shape the design beyond the entry list. **PyPI's PEP 740 verification is
synchronous** and inside the upload, since twine expects the verdict on the upload response
(format-management fold item 2). **Clients that verify nothing** (Conan, Chef, apk for package
signatures, LuaRocks, cpm and Carton, the editors that install Open VSX packages) make the
registry's own verification their only integrity check, which "raises artifact-verification's
priority and argues for serve-time verification" (cross-cutting theme 4, open items 22, 24, 27, 28
and 31). **NuGet author signatures and repository countersignatures** need the SDK's trust-bundle
semantics and a revocation position (open item 9).

**Boundaries already settled elsewhere, cited rather than re-decided.** `management-api.md` owns
the operation vocabulary (its `attach` kind adds "an auxiliary file to an existing version that no
coordinate binds and no client verifies as the version's bytes", under `push`), RFC 9457 problem
types from a closed list, the `Operation` audit record and the optional `Operator` dispatch
interface; a signature attached by a user is an `attach` operation, and a trust-set change is
repository administration on that API. `credential-management.md` owns the OIDC exchange: a
robot's **trust policy** names an issuer, an audience and exact claim constraints, and the
exchange verifies the identity token with `coreos/go-oidc` and never hand-rolls a check. A
Sigstore keyless identity is the same kind of fact, an OIDC issuer plus a subject the issuer
asserted, so this spec reuses that policy shape and never defines a second issuer model (the
resolved identity-policy decision, was Q10). `auth.md` AC9 forbids cryptographic primitives under
`internal/auth/**` and holds it with an architecture test; this spec applies the identical rule
to `internal/verify/**` and to every handler. `data-model.md` owns every entity and the five mark
roots, and lists this spec's records (verdicts, each carrying the trust-set revision it was
computed under, trust sets and their numbered revisions, and the revocation want-list; superseded
derived from the revision and never a written mark, the re-evaluation a `verify.reevaluate`
`Job` and not a record of its own) in its "Records that are not mark roots" table and its
"Verification records" section beside the policy layer's (its AC34); this spec adds no entity and
no root. `proxy-cache.md` settled stream-and-verify
against a declared digest, coalesced waiters served only from the CAS after the verified commit,
and never committing a fetch that fails integrity, and now carries the completion-only fetch
mode with its post-receipt verifier hook (its resolved completion-only decision, was Q15; its
AC20), which is the hook this spec's proxied-path entries run in. `upstream-adapters.md` places
every per-upstream trust anchor a format asked of it (Debian's keyring, Hex's public key, Open
VSX's pinned keys, RPM's metalink hash) in the remote repository's trust set here, never on
`Upstream`. `format-handler-interface.md` pins five methods and hands every shared capability to
a handler through `Deps`; the verifier arrives the same way, with no method added (its `Deps`
paragraph names the `Verifier`, and its AC15 holds the handler import boundary with a fixture for
`internal/verify`). `async-operations.md` owns deferred execution: the re-evaluation worker and
the two refreshes are job kinds and `Schedule`s on `internal/async`, not a private pool
("When verification runs"). `signing-service.md`'s `openpgp` and `raw` schemes here are what
`debian.md` item 6 and `hex.md` item 5 asked of that service (its resolved boundary decision,
was Q5 there).

**Prior art gathered this run** (fetched 2026-09-27; where a page could not be reached, that is
recorded rather than recalled):

- **Sigstore.** The client specification's verification procedure takes an artifact, a bundle
  (leaf certificate, signature, timestamping response, transparency log entry), a trusted root
  and a verification policy ("what must be true about the identity in a certificate"), and
  proceeds: establish the signing time from the RFC 3161 response or the log's `integratedTime`;
  validate the certificate chain **at that time**; verify the embedded SCT; check the identity
  against the policy; verify the log entry; verify the signature against the leaf key. The
  `TrustedRoot` message (protobuf-specs) carries transparency logs, certificate authorities, CT
  logs and timestamp authorities each with an inclusive validity range, must keep every
  previously used instance "otherwise signatures made in the past cannot be verified", and
  clients "extract a selection of keys/authorities" per policy. The public-good root is
  distributed as a TUF repository at `tuf-repo-cdn.sigstore.dev` re-signed at least every three
  days, with `trusted_root.json` among its targets. `sigstore-go` implements the specification
  with a custom-trusted-root option and ships `pkg/testing/ca.VirtualSigstore`
  (`NewVirtualSigstore`, `Sign`, `Attest`, `FulcioCertificateAuthorities`, `RekorLogs`,
  `TimestampingAuthorities`), which is what makes an offline conformance fixture possible.
  cosign's keyless verification requires `--certificate-identity` and
  `--certificate-oidc-issuer`, and its storage specification puts signatures at the tag
  `sha256-<hex>.sig` as an OCI image manifest whose layer annotations carry
  `dev.cosignproject.cosign/signature`, `dev.sigstore.cosign/certificate`,
  `dev.sigstore.cosign/chain` and `dev.sigstore.cosign/bundle`, the payload being
  `application/vnd.dev.cosign.simplesigning.v1+json`. **Taken:** the whole procedure, offline
  from the bundle, the trusted-root format as our Sigstore trust-set entry, the virtual Sigstore
  as the fixture. **Rejected:** any online Rekor or Fulcio call at verdict time; verification is a
  pure function of bytes, bundle and trust set.
- **PEP 740.** An attestation is `{version: 1, verification_material, envelope: {statement,
  signature}}`, uploaded as an `attestations` form field; "if the index fails to verify any
  attestation in `attestations`, it MUST reject the upload"; provenance is served as a separate
  object `{version: 1, attestation_bundles: [{publisher: {kind, claims}, attestations}]}` linked
  from the simple index (`provenance` in JSON, `data-provenance` in HTML), requiring JSON
  `api-version` 1.3 or later. **Taken** verbatim, including the synchronous refusal and the
  publisher object as the served identity.
- **CEP-27.** Predicate type `https://schemas.conda.org/attestations-publish-1.schema.json`; one
  subject with the package filename and a single `sha256`; predicate `targetChannel` "a valid URL
  with no trailing slashes"; the verifier "should match the channel that the package was
  retrieved from" but "may choose to allow a channel mismatch, e.g. if the known context is a
  mirroring context", and must "establish trust in the identity being verified against" by a
  mechanism the CEP leaves open. **Taken:** the mirror allowance, bound to the remote's configured
  upstream URL; the identity mechanism is our identity policy.
- **npm.** `npm audit signatures` verifies `dist.signatures[]` (`keyid`, `sig`) against the
  registry's `/-/npm/v1/keys` (`keyid`, `keytype` and `scheme` `ecdsa-sha2-nistp256`, `key`,
  `expires`) "for any registry that supports signatures", and verifies provenance attestations
  of downloaded packages; provenance is produced only from a supported cloud CI runner (GitHub
  Actions, GitLab CI/CD). **Taken:** the keys document as the upstream trust-set source for a
  proxied npm remote. Producing our own registry signatures and serving our own keys document
  is `signing-service.md`'s.
- **NuGet.** `signatureValidationMode=require` verifies that "all packages are signed by any of
  the certificates trusted in the nuget.config" as `trustedSigners` (`author` and `repository`
  entries by certificate fingerprint, `allowUntrustedRoot`, and `owners` for repository
  signatures: "if a package has multiple owners, and any one of those owners is in the trusted
  list, the package installation will succeed"); "packages signed with untrusted certificates
  are considered as unsigned"; a modified signed package fails `NU3008`. **Taken:** trusted
  signers as the NuGet trust-set entry shape, owners as part of a repository-signature identity,
  untrusted-as-unsigned as a `failed` verdict with an `untrusted` reason rather than a silent
  absence.
- **zot.** Trust is configured by uploading cosign public keys to `/v2/_zot/ext/cosign` and
  notation certificates to `/v2/_zot/ext/notation?truststoreType=ca`, stored under `_cosign` and
  `_notation`; "signature verification is performed for all signed images" and "the verification
  result for each signed image is stored in the database", exposed as `IsSigned`, `Tool`,
  `IsTrusted` and `Author`. **Taken:** the verdict as a stored, queryable fact with the signer
  identity, computed by the registry and not at pull time. **Rejected:** a trust store that is
  instance-wide; ours is per repository, because a repository is the unit of RBAC and of policy.
- **Harbor.** A project's deployment security has "Cosign" and "Notation" checkboxes, after which
  "Harbor will only allow verified images to be pulled from the project", where "verified images
  are determined by Cosign or Notation": Harbor detects a signature accessory's presence and
  enforces on it, without itself checking identity. **Rejected:** presence is not verification;
  an attacker who can push a manifest can push a signature accessory, so a presence gate proves
  only that someone signed something.
- **Gitea, Artifactory, Nexus, Pulp.** Gitea's package overview mentions no signature or
  attestation verification for any of its formats. Artifactory's GPG page reached this run covers
  Distribution release-bundle signing only, not artifact signature verification. Sonatype's
  PGP-validation pages answered 404 twice and Pulp's container signature pages 404 twice, so
  nothing is claimed about them here.
- **Galaxy.** pulp_ansible's `CollectionVersionSignatureSerializer` serves `signature`,
  `pubkey_fingerprint`, `signing_service` (nullable) and `pulp_created`; ansible-galaxy 2.18's
  `get_collection_signatures` reads only `signature_info["signature"]`, and
  `verify_file_signatures` verifies each detached signature over `MANIFEST.json` against the
  configured keyring with `required_successful_signature_count` (`1`, `all`, `+N`) and
  `ignore_signature_errors`. **Taken** as the served shape; the format spec's own captured-traffic
  grounding remains its Test Plan's job and is asserted here as a conformance case with the real
  client.

**The tree.** No `internal/` exists at `ab22b0d` (`cmd/stackweaver-registry` is a stub), so
every code claim here is a design claim and every path is a target.

## Scope

**In scope**

- One verifier package, `internal/verify`, with the entries the format specs enumerate above,
  reached by handlers through `Deps` and by the proxy layer through its post-receipt verifier
  hook, and by the management API for attachments and trust administration.
- **Two products, kept distinct**: integrity results (match, mismatch, weak) returned to the
  caller and never stored, and verdicts (verified, failed, absent) stored per repository and
  digest and consumed by policy.
- Per-repository, revisioned **trust sets**: OpenPGP keys, X.509 roots and trusted signers, a
  Sigstore trusted root, raw and JWS keys, TUF root key ids, and identity policies; their sources
  (operator import, keyserver import and refresh, the Sigstore TUF updater, upstream-published
  keys pinned per remote) and their administration through the management API.
- Verification at ingest on the hosted path, synchronous where the ecosystem demands a
  synchronous answer, and at cache commit on the proxied path from CAS bytes; re-evaluation of
  stored verdicts when a trust set changes; no signature verification at serve time.
- The verdict source `supply-chain-policy.md` defined, with identities policy can name, the
  `repository-chain` qualifier for content vouched for by a verified signed index, and the
  fail-closed treatment of a verdict computed under a superseded trust-set revision; and the
  **anchor class** of a remote's adopted revision (`signature`, `integrity`, `none`), derived
  from the hook as it applied and the trust set at adoption, written by the adoption commit and
  read by the index runtime for `signing-service.md`'s admission rule.
- Attachment of user-supplied signatures (Galaxy first) as `management-api.md` `attach`
  operations verified before they are stored, and the served entry shapes.
- The position on provenance the registry vouches for (PEP 740, npm attestations): verified and
  re-hosted, or not served.
- Verdict exposure: readable through the management API with reason and trust-set revision, and
  an operator alert on a failed verdict at ingest or commit.
- Mechanical enforcers for every boundary: no signature primitive outside `internal/verify`, no
  primitive implemented inside it, no handler importing it, no network egress from it.
- The harness `trust` setup key's provisioner and the offline Sigstore fixture.
- Benchmarks as CI gates for the ingest and commit paths.

**Out of scope, with the reason**

- **Producing signatures, keys or signed indexes**, including repository countersignatures,
  Galaxy server-side signing, npm registry signatures and our own `/-/npm/v1/keys`: owned by
  `signing-service.md` (charter step 7). Excluded on ownership, not effort: a service that both
  signs and verifies with the same key material is the class of surface `auth.md`'s
  nothing-is-invented posture warns against, and the charter separates the two steps.
- **Policy decisions**: whether a failed or absent verdict refuses, warns or is ignored is
  `supply-chain-policy.md`'s rule, evaluated inside its policy-enforcing `Deps` calls. This spec
  produces facts. Excluded because two evaluators of one rule is the half-applied-decision defect
  in mechanism form.
- **Issuing Trusted Publishing credentials**: `credential-management.md`'s OIDC exchange. This
  spec only consumes the trust policy shape.
- **Vulnerability scanning, licence detection and the component inventory**:
  `supply-chain-policy.md`.
- **Structural validation a handler must do to parse its format** (a well-formed `.nupkg`, a
  parseable `Chart.yaml`): the handler's. Format parsing this spec does own is the parsing a
  signature check itself needs (RPM lead and header, apk's v2 segment, `.PKGINFO`, CMS
  structures), because putting it in a handler would put a security primitive there.
- **Serve-time re-verification of signatures**: a verdict is a fact about a digest under a trust
  set and does not change between reads; what protects the served bytes is the CAS read path
  verifying the digest while streaming (the resolved serve-time decision, was Q5), which
  `storage-and-gc.md` holds (its AC21, with the read-path budget in its AC22).
- **Notation (notaryproject) signatures over OCI**: no format spec cites a client that requires
  them and no captured traffic exists; the Sigstore entry's OCI discovery is written so a second
  OCI signature scheme is a new entry, not a redesign. Excluded on evidence sequencing.
- **The web UI's rendering of verdicts**: charter step 9; the verdict is exposed through the
  management API so the UI has something to render.

## Design

### Two products: integrity results and verdicts

Every entry answers one of two questions, and the answer's kind decides whether it is stored.

An **integrity result** answers "are these bytes the bytes a record promised": a size, a digest,
a tree hash, a metalink digest, apk's `C:`, `S:` and `datahash`, Arch's `%CSIZE%` and
`%SHA256SUM%`, Puppet's and Vagrant's checksums, Terraform's `h1:`, and the signature over a
proxied Hex registry document (the raw RSA-SHA512 entry: a signed index whose only role is to make
the checksums inside it trustworthy, so its check is integrity, not a verdict). It is `match`, `mismatch` or
`weak` (a match under an algorithm the ecosystem itself calls weak: MD5, SHA-1 as a checksum), it
is returned synchronously to the caller, and it is never stored: the proxy layer refuses to
commit on `mismatch` and a hosted ingest refuses to commit on `mismatch`, so after the call there
is nothing to record except the commit itself. `weak` commits and is recorded by the caller in
its own metadata document where the format spec says so; this spec does not store it.

A **verdict** answers "is this digest vouched for by an identity the repository trusts". It is
one of:

- `verified`, with the **identity** it was checked against and the **chain** it was verified
  through: `publisher` when a signature or attestation over the artifact itself verified
  (Cosign, PEP 740, npm provenance, CEP-27, Maven `.asc`, Arch and RPM package signatures, NuGet
  author signatures, Swift, Open VSX, Galaxy), or `repository-chain` when the artifact's digest
  matched an entry of a signed index whose signature verified under the remote's trust set (CPAN
  `CHECKSUMS`, Hackage's TUF chain, Homebrew's JWS documents, apk and Arch database entries, RPM
  `repomd.xml`, Terraform `SHA256SUMS`, NuGet repository countersignatures);
- `failed`, with a reason from a closed list: `bad-signature`, `untrusted-key`,
  `identity-mismatch`, `expired-at-signing`, `revoked`, `log-missing`, `log-invalid`,
  `subject-mismatch`, `channel-mismatch`, `malformed`, `weak-algorithm`;
- `absent`, meaning no signature or attestation for this digest reached the verifier: the
  ecosystem has none, the publisher sent none, or the upstream serves none.

The vocabulary the format specs used (`untrusted`, `bad`) maps onto `failed` with the reason
`untrusted-key` or `bad-signature`; the three-state shape is `supply-chain-policy.md`'s and this
spec does not widen it (the resolved verdict-record decision, was Q2). `untrusted-key` is
answered only when the repository's trust set holds at least one entry of the kind the scheme
reads (an `openpgp` key for an OpenPGP signature, `x509-roots` or `nuget-trusted-signers` for
CMS, `raw-keys` for Ed25519 and JWS, a `sigstore-root` for a bundle, a `tuf-root` for a chain)
and none of them verifies the signature. A `Verify` request against a trust set holding **no
entry of that kind** answers `absent`: the repository has configured no trust for the scheme, so
it has nothing to say about the signature, exactly as a Helm `.prov` in a repository with no
`openpgp` entry answers absent (Per-format positions), and exactly what lets a remote adopted
under anchor class `none` (Trust sets, "Anchor class") carry an `absent` verdict rather than a
`failed` one that `signing-service.md`'s admission rule never admits. A policy rule requiring
`verified` refuses `absent` and `failed` alike, so the distinction costs policy nothing and tells
the operator whether the repository's trust set was consulted at all (AC1). A verdict also carries the
**scheme** (`sigstore`, `openpgp`, `cms`, `apk`, `rpm`, `jws`, `ed25519`, `tuf`, `npm-keys`), the
**algorithms** seen (key algorithm, digest algorithm, so a rule can refuse SHA-1 or Ed25519 where
a client line does), the **trust-set revision** it was computed under, and the time. An
identity is a string in a scheme-specific canonical form policy can match: a Sigstore identity is
`issuer` plus `subject` exactly as the certificate carries them; an OpenPGP identity is the
signing key's fingerprint (the primary's, with the subkey's beside it); an X.509 identity is the
leaf certificate's SHA-256 fingerprint plus, for a NuGet repository signature, its `owners`; a
raw key's identity is its digest; a TUF chain's identity is the root key ids that verified.

### The verdict is a stored fact, keyed by digest, outside the format model

Verdicts are records `internal/verify` owns, keyed by `(repository, blob digest, scheme)`,
alongside the policy layer's records in the place `data-model.md` already made for them: outside
the format entity model, in no snapshot, untouched by repointing and rollback, and **not a GC mark
root**. A verdict outlives the blob it describes for the same reason a refusal record does: "why
was this refused" must stay answerable after the bytes are gone, and a record that pinned its
blob would make refused content uncollectable. The record references the digest of the artifact
and the digest of the signature or attestation blob it verified, and tolerates either dangling.
These records are listed in `data-model.md`'s "Records that are not mark roots" table as one
row, "Verification records", and its AC34 proves a blob mentioned only by them is collected.

A verdict is keyed by **blob digest**, never by coordinate, because the same bytes under two
names have one truth and different bytes under one name have two. Consequences: an attachment
that replaces a file's bytes gets no inherited verdict; a cross-repository dedup of the blob
gets no inherited verdict either, because the repository's trust set is part of the key; and a
coordinate retired and re-pointed at other bytes carries nothing across. The verdict source
answers a query for `(repository, digest)` by reading the newest record for the repository's
current trust-set revision; a record computed under an older revision answers **absent** until
re-evaluation replaces it (below). That is fail-closed by construction: a rule requiring a
verified identity refuses during the window, never serves on a verdict the current trust set
did not produce. **Superseded is a derived state, never a written mark**: every verdict carries
the revision it was computed under, the repository carries its current revision, and a verdict is
superseded when the two differ, so a trust-set change writes one row and touches no verdict
however many the repository holds (a proxied PyPI remote holds millions), and the "no window"
property of re-evaluation holds because the revision bump is the single atomic fact both the
source and the job compare against.

Attestations and signatures themselves are **content**, stored as blobs in the CAS and, on the
hosted path, as files of the version they belong to, in the same snapshot as the write that
brought them: a PEP 740 attestation is a file of the version beside the wheel it attests, a
Galaxy signature is a file of the collection version, a Cosign signature manifest is a version
of its own joined to its subject by `data-model.md`'s `Reference` edge. That is what gives the
served provenance a home the pointer model already serves and GC already marks, and it is why
"serve PEP 740 provenance in both serializations" needs no new storage: the handler renders the
provenance object from the version's files and the verdict record. On the proxied path, verified
attestations are cached as content like any other fetched file, under the same cache reference,
and their verdict is computed from the CAS blob after the verified commit, as `openvsx.md`
requires ("never from bytes in flight").

### Trust sets

A **trust set** is per repository, because a repository is the unit of RBAC (`auth.md`) and of
policy (`supply-chain-policy.md`) and because a private repository's publishers and a public
mirror's upstream have nothing in common. It is configuration, not repository content: it lives
beside the repository's retention rules as core-parsed configuration, in no snapshot, and every
change increments a **revision** the verdicts record. Its entries:

| Entry kind | Holds | Used by |
|---|---|---|
| `openpgp` | Public keys (primary with subkeys), each with a name and the semantics flag the format asked for: `any` (Maven, RPM, Terraform, LuaRocks, CPAN, Galaxy), `all` (Arch: every signature packet must verify), `first-trusted` (apk: the first segment signature naming a configured key decides) | OpenPGP detached and cleartext, apk, RPM |
| `x509-roots` | DER roots, as Swift's `trustedRootCertificatesPath` and NuGet's Linux root store are; per-entry expiry and revocation options (`certificateExpiration`, `certificateRevocation` as Swift names them) | CMS (Swift, NuGet) |
| `nuget-trusted-signers` | `author` and `repository` entries by certificate fingerprint, `allowUntrustedRoot`, `owners`, imported from a `nuget.config` fragment or a repository's `RepositorySignatures` resource | NuGet |
| `sigstore-root` | A `TrustedRoot` document: the public-good root maintained by the TUF updater, or a fixture or private instance's root imported as a file | Sigstore (Cosign, PEP 740, npm provenance, CEP-27) |
| `identity-policy` | Which identities may vouch for what: entries of `(issuer, subject)` with the subject exact or matched by a bounded glob on one path segment, optionally scoped to a package name pattern, plus a `log-required` flag (default on for keyless); or a reference to a robot's trust policy in `credential-management.md`, from which the expected issuer and subject are derived | Sigstore; NuGet owners; Swift signing entity |
| `raw-keys` | Named public keys by digest with an algorithm: Ed25519 (Open VSX), RSA for JWS (Homebrew, `kid`), ECDSA P-256 for npm registry signatures (`keyid`), RSA for a raw PKCS #1 v1.5 SHA-512 signature (Hex, imported as the SPKI PEM the upstream publishes at `public_key`, identified by the OpenSSH `SHA256:` fingerprint `mix hex.repo add --fetch-public-key` compares; 2048 bits or more) | Ed25519, JWS, npm-keys, raw RSA-SHA512 |
| `tuf-root` | Root key ids and threshold (Hackage), with the current root document | TUF |

**Sources, and the rule that no source is consulted at verdict time.** A trust set is filled
by operator import through the management API, by a **keyserver import** that fetches a key by
fingerprint from a configured keyserver as Gradle's dependency verification does and stores or
**refreshes** it as an `openpgp` entry (a re-import of a fingerprint already held brings the
subkeys the keyserver has since seen, which is the cure `signing-service.md`'s resolved admission
decision, was Q20 there, and `cpan.md` AC25 name for a configured PAUSE key whose current signing
subkey reached only the keyservers: after the import the next re-evaluation turns the
directory's `failed` into `verified`, and a virtual's merged directory lists the remote's entries
again, its AC26), by the **Sigstore TUF updater** that refreshes the public-good
`sigstore-root` from `tuf-repo-cdn.sigstore.dev` starting from an embedded root, as a
`Schedule` of kind `verify.tuf_refresh` on `internal/async` with period `verify.sigstore.refresh`
(`async-operations.md`'s kind table and "The scheduler"), and by **upstream key pinning**, where
a remote repository's adapter records the keys the upstream publishes (Open VSX `publicKey`
URLs, npm's `/-/npm/v1/keys`, NuGet's `RepositorySignatures`, a Terraform download document's
key list) on configuration and on first sight of a new key identifier, each new key creating a
revision and a recorded divergence the operator sees. That last source is where every
per-upstream trust anchor lives: a `remote` is a repository with a trust set, so Debian's
upstream keyring, Hex's upstream public key, Open VSX's pinned keys and RPM's metalink hash are
entries of the remote's trust set and never fields on `upstream-adapters.md`'s `Upstream`
record, as that spec states in its Scope. Every source writes the trust set; **verification
reads only the trust set**. Verification is a pure function of bytes, signature material and a
trust-set revision, which is what makes it reproducible, offline-capable and testable without a
network, and what keeps `internal/verify` out of `auth.md`'s and `proxy-cache.md`'s egress
rules: it has none. The sources that reach a network therefore live in one sibling package,
`internal/trustsource`, and not under `internal/verify/**`: the keyserver import, run
synchronously inside the `POST .../trust/import` request under the bound its context carries;
the TUF updater and the revocation refresh, which are the two `Schedule` kinds that package
registers on `internal/async`; and the write half of upstream key pinning, whose fetch of a keys
document is an ordinary upstream fetch through the remote's adapter (`upstream-adapters.md`).
Its egress uses the process-wide proxy settings `deployment.md` fixes (`HTTPS_PROXY` and
`NO_PROXY`, read once), it imports `internal/verify`'s store types and never the reverse, and it
verifies nothing: a TUF root it fetches is checked by the TUF client's own threshold rule, and a
key it fetches is parsed and stored, so the egress test on `internal/verify/**` and the
primitive allowlist stay exact (AC4, AC22). Under `proxy.offline` (`proxy-cache.md`'s
instance-wide switch, `deployment.md`'s key) the scheduler disables the two verify refreshes like
the advisory feed sync (`async-operations.md` AC14) and the keyserver import is refused
`validation` naming the switch; verification continues on the last revision (the resolved
trust-set decision, was Q3). Every source that changes the set creates a revision, and a revision
re-evaluates the repository (below), so an upstream that rotates its keys or a CRL that changes
costs the repository one re-evaluation each time; that is the price of verdicts that never lag
their trust set, and `verify_reevaluation_pending` is its signal.

**Anchor class.** Which kind of anchor a remote's trust set held for a document decides what
`signing-service.md` may compose it into (its resolved admission decision, was Q20 there:
`signature` needs a `verified` verdict, `integrity` and `none` admit the current revision, a
`failed` verdict is never admitted), so the class is a fact this spec defines and the adoption
records. It is derived at adoption from two inputs as they stood then: the fetch-and-cache
request's hook for the document **as it applied** (`proxy-cache.md`'s Obligation section: a
declared digest set, a `Check` integrity call, a `Verify` call, or nothing), and the remote's
trust-set revision. The class is `signature` when the hook is a `Verify` call, or an
integrity-gating call that also records a verdict (a TUF chain, a JWS document, an apk index
segment), and the trust set holds at least one entry of the kind that scheme reads; `integrity`
when the hook is a `Check` call against material the trust set or the request holds (a metalink
hash, a declared digest set), which gates the adoption itself so a current revision passed it by
construction; and `none` when the request declares no hook, or declares a `Verify` whose scheme
has no entry of its kind in the trust set, in which case the verdict is `absent` (Two products)
and the fetch rested on TLS to the configured upstream. **As it applied, not as it was written**:
where a format declares a member of a paired set, or a segment of the one document, that its
wire makes optional (a pacman `.db.sig`, a `repomd.xml.asc`, an apk `.SIGN` segment, the cleartext
armour of a CPAN `CHECKSUMS`), a `Verify` declared over that member did not apply to a revision
the upstream served without it, since nothing was there to verify and no `Verify` call was made,
so the classifier's input holds no `Verify` and the class is `none` (or `integrity` where a
`Check` gates the set) with the verdict `absent`, whatever keys the remote's trust set holds
(`proxy-cache.md`'s resolved withdrawn-signature decision, was Q23 there and owner-facing, stated
once in its "A signature the wire makes optional" so no format restates it). That is what keeps
an upstream that never signs (Arch's and Manjaro's official mirrors, Fedora, UBI, a DarkPAN)
admissible to a signed virtual under `signing-service.md`'s rule, which admits `none` and never
admits `failed`. `internal/proxy` reduces the declaration to the hooks that applied before it
calls the classifier, so neither the declaration nor the served-or-not fact ever reaches
`internal/verify`: the **served-or-not fact**, whether the adopted revision carried the optional
member, is reported by the handler's adoption check, written by the adoption as the fourth field
of `data-model.md`'s cache-scoped record beside the class (its AC44), and compared by the next
adoption in `internal/proxy`, where a revision reported unsigned after one recorded signed is a
regression not adopted until the operator's refresh (`proxy-cache.md` AC24, AC25). The fact is
that layer's to record and compare, never a classifier input and never what `Admission` returns,
since the admission rule is stated over the class and the verdict. The adoption commit
(`proxy-cache.md` AC25) calls this spec's classifier through a one-method interface
`internal/proxy` declares as the consumer and the composition root satisfies with
`internal/verify`'s concrete type (that spec, "The anchor class of an adoption"; no package of the
proxy layer imports `internal/verify`), and writes the class on the same cache-scoped record, set
once and never recomputed: a later trust-set change reaches a merge through the verdict, which
reads `absent` under a superseded revision, and through the next adoption, which records the new
class. The read is
taken by the index runtime beside the verdict, through **`Admission`**, the read interface
`internal/index` declares for the merge and the composition root satisfies with the same store
and the cache record (`signing-service.md`, "Package shape"; `format-handler-interface.md`, "The
scheduled re-open": no handler reads a verdict or an anchor class, and `Deps` carries neither).
A metalink match stays
an integrity result and is never stored as a verdict: `signing-service.md` weighed that change
as its option D and declined it, and its `integrity` class is what admits a Fedora remote
without one (AC31).

**Revocation** is the one check that is naturally online, and it is handled the same way: CRL and
OCSP material for the `x509-roots` and `nuget-trusted-signers` entries is fetched into the trust
set by a `Schedule` of kind `verify.revocation_refresh` with period `verify.revocation.refresh`,
and the CMS entry consults the cached material. The refresh can fetch only what it knows about,
and a chain's distribution points are in its certificates, not in the roots, so each CMS
verification records the CRL distribution points and OCSP responders of the chain it walked as
**wanted material** on the repository's trust set: a want-list, not a trust entry, and the one
write a verification makes beside its verdict. The refresh fetches the wanted material, and a
refresh that changes it is a trust-set revision like any other, so a newly published revocation
re-evaluates the repository's CMS verdicts at the next refresh rather than never; until material
for a chain has arrived the verdict reads `unchecked` under `cached` mode. A repository's revocation
mode is `cached` (default: a certificate whose status is unknown because no material is cached
verifies with the verdict carrying `revocation: unchecked`, which a policy rule may refuse),
`required` (unknown status is `failed` with `revoked`, the fail-closed choice for repositories
whose clients would themselves fail `NU3028`) or `off`. This is the position `nuget.md` asked for
(the resolved NuGet decision, was Q8).

### When verification runs

**Hosted path: at ingest, before commit, synchronously where the ecosystem requires it.** The
handler calls the verifier inside the write, and the outcome is part of the write's result:

- Where the ecosystem defines the upload as carrying its own proof and demands a synchronous
  answer, the verifier's `failed` **refuses the write** and nothing commits: PEP 740 ("MUST
  reject the upload"), a `gem push --attestation` bundle (rubygems.org refuses `422`;
  `rubygems.md`'s resolved attestation decision, was Q8 there), Swift's validity rules (every
  client would refuse the stored bytes), a Galaxy signature attached by `attach`. The refusal is
  the format's own error shape on a client
  route and a `validation` problem on the management API, naming the reason from the closed list.
- Where the signature is a publisher's claim the client does not itself require (Maven `.asc`,
  Arch and RPM package signatures, apk package signatures, a NuGet author signature, Open VSX,
  LuaRocks), the verdict is **recorded, not enforced**: the write commits, the verdict is
  stored, and whether `failed` or `absent` refuses at resolution is a policy rule. This is what
  every format spec in that group asked for ("its verdict recorded, not enforced"), and it keeps
  the enforcement point single.
- Structural checks the format needs to parse the file at all (an RPM's header digests, an apk
  v2 segment that does not parse, a `.nupkg` whose signature file is malformed) refuse at ingest
  as the format spec states, because they are integrity, not trust.

**Proxied path: at cache commit, from the CAS blob.** The proxy layer's fetch-and-cache verifies
integrity while streaming and commits on a digest match; verdicts are computed after that commit
from the committed bytes and the signature material fetched with them, inside the post-receipt
verifier hook the completion-only fetch mode carries (`proxy-cache.md`'s resolved completion-only
decision, was Q15; its AC20).
The verdict never gates the commit and never delays the initiating client: a signature is a
claim about bytes the client is already allowed to receive under the repository's policy, and
policy evaluates the verdict on the next resolution of that digest. Where a format's proxied path
needs an integrity decision before commit (Homebrew's JWS document that "would fail in the
client", Julia's tree hash, apk's index segment, Hackage's chain, Terraform's `SHA256SUMS`), that
is an integrity call in the hook and refuses the commit on `mismatch` or a failed chain; the
verdict is the by-product recorded afterwards.

**Re-evaluation when a trust set changes.** Every revision of a repository's trust set
supersedes, by the derived rule above, every verdict computed under an earlier revision, and the
revision's transaction enqueues one job of kind `verify.reevaluate` on `internal/async` for the
repository revision (`async-operations.md`'s kind table; exclusivity key `verify:{repository}`,
so two revisions of one repository never re-evaluate concurrently). The job pages through the
repository's verdicts whose revision is not current, oldest first, and commits a checkpoint per
page, recomputing each verdict from the stored bytes
and signature material; its concurrency is bounded by `async.kind_limits` (`verify.reevaluate:
4`, the queue's per-kind ceiling and the only home of the bound, `deployment.md`'s resolved
worker-limit decision, was Q11 there), and shutdown, lease loss and rescue after a kill are the
queue's, resuming from the last committed checkpoint so no verdict is ever lost to a crash and
none is ever recomputed twice (`async-operations.md` AC15). Until a verdict is recomputed the
source answers absent for it (above). Verdicts whose signature material is no longer in the CAS
(an evicted cache) are recomputed as absent, which is exactly true. The revision bump is the one
fact the source and the job both compare against, so there is no window in which the new
revision is current and an old verdict reads as current (the resolved timing decision, was Q1).
A job that finds the repository's revision has moved past the one it was enqueued for ends at
its next checkpoint, because the job the newer revision enqueued covers everything it would have
done and the exclusivity key keeps the two from running together. No package here starts a
goroutine that outlives a request: `internal/verify` registers the `verify.reevaluate` worker,
`internal/trustsource` the two refresh schedules, and neither owns anything that ticks
(`async-operations.md` AC16).

**Never at serve time.** A read does not re-verify a signature. What a read must guarantee is that
the served bytes are the bytes the verdict describes, and that is a property of the CAS: the
blob's digest is its key, and the read path verifies the digest while streaming and aborts with
the `BlobDigestMismatch` alert on a mismatch, range reads verified through per-segment digests.
`storage-and-gc.md` states and holds it (its "The read path verifies what it serves", AC21, and
the read-path budget in AC22), for the clients-verify-nothing formats whose only integrity check
is ours (the resolved serve-time decision, was Q5).

### How a handler reaches the verifier

`internal/format` declares a small consumer interface, `Verifier`, beside `Deps`, in the pattern
the interface spec pins: the consumer declares what it needs, the concrete type in
`internal/verify` satisfies it, and a handler holds no capability it was not handed. The
interface has one method per product, with the entry selected by a typed request rather than by
a method per scheme, so the pinned method set is untouched and the interface does not grow by
one method per format:

- `Check(ctx, IntegrityRequest) (IntegrityResult, error)`: an integrity request names the entry
  (`digest`, `size`, `tree-hash`, `apk-package`, `arch-record`, `metalink`, `h1`, `checksum`,
  `raw-rsa-sha512` with the key name and signature bytes),
  the expected values, and a reader over the bytes; the result is `match`, `mismatch` or `weak`
  with the computed values. It streams: no entry reads the bytes twice, and the handler passes
  the same reader it is committing from.
- `Verify(ctx, VerifyRequest) (Verdict, error)`: a verify request names the scheme, the
  repository, the artifact digest and reader, and the signature material (a reader, or a
  reference to a blob already committed), plus scheme-specific inputs (the `kid`, the record
  the signature was taken from, the expected subject filename); the verdict is stored and
  returned. The error return is for the call failing (a cancelled context, a store error), never
  for a signature failing, which is a `failed` verdict.

The proxy layer reaches the same concrete type through its verifier hook, and the management
API reaches it for `attach` and for trust administration. `internal/policy`'s verdict source is
a third consumer interface, `VerdictSource`, satisfied by the same store, and the index
runtime's merge reads the verdict and the anchor class of a remote member's documents through
`Admission`, the read interface `internal/index` declares (`signing-service.md`, "Package shape"
and "The produce/verify boundary"), a fourth consumer, satisfied at the composition root by the
same store and `data-model.md`'s cache-scoped record; both are reads on this side of the
boundary and neither is `Deps`. The anchor-class classifier has its own consumer in the same
pattern: the adoption commit calls it through the one-method interface `internal/proxy`
declares (Trust sets, "Anchor class"). No handler imports `internal/verify`; no package outside `internal/verify/**`
imports a signature library, `internal/trustsource` alone importing the TUF client and the key
parsers it stores what it fetches with, and making no verifying call; and `internal/verify/**`
implements no primitive itself, using an allowlisted set: `github.com/sigstore/sigstore-go` for
bundles and trusted roots, `github.com/ProtonMail/go-crypto/openpgp` for OpenPGP (the
maintained, import-compatible successor to `golang.org/x/crypto/openpgp`), the standard
library's `crypto/x509`, `crypto/ecdsa`, `crypto/ed25519`, `crypto/rsa` and `crypto/sha256`,
and a CMS library chosen at Phase 3 against SE-0391 and NuGet fixtures
(`github.com/github/smimesign/ietf-cms` and `go.mozilla.org/pkcs7` are the candidates; the
choice is recorded in this spec when made). Three architecture tests hold the three boundaries
(AC4), named because a boundary enforced only by review is not enforced (the resolved reach
decision, was Q9).

Scheme implementations live in subpackages by domain, `internal/verify/sigstore`,
`internal/verify/openpgp`, `internal/verify/cms`, `internal/verify/apk`, `internal/verify/rpm`,
`internal/verify/jws`, `internal/verify/raw`, `internal/verify/tuf` and `internal/verify/treehash`, each exposing concrete types and no interface of
its own; `internal/verify` composes them behind `Verifier`. Format knowledge a scheme needs
(RPM lead and header parsing, apk's leading tar segment, `.PKGINFO`, `%PGPSIG%` decoding, the
CMS `SignedData` walk) lives in the scheme package, which is the one place a format-entangled
primitive is allowed to know about a format.

### The entry catalogue

| Entry | Scheme package | Semantics pinned by the requesting spec |
|---|---|---|
| Sigstore bundle | `sigstore` | The client specification's procedure, offline from the bundle: signing time from the TSA response or `integratedTime`; chain validation at that time against the trust set's `sigstore-root`; SCT; log entry (SET or inclusion proof) required when the identity-policy entry says `log-required`; identity policy match on issuer and subject; signature over the artifact digest (hashedrekord) or the DSSE envelope (in-toto). Identity: `issuer` and `subject` |
| Cosign over OCI | `sigstore` plus OCI discovery in the handler's `Deps` reads | Signature and attestation manifests found through the `Reference` edge (OCI 1.1 `subject`) and through the tag convention `sha256-<hex>.sig` and `.att`; each layer's annotations supply certificate, chain and bundle; the payload is simple signing whose `critical.image.docker-manifest-digest` must equal the subject digest (`subject-mismatch` otherwise); attestations are DSSE in-toto statements whose subject digest must match |
| PEP 740 attestation | `sigstore` | Envelope statement is an in-toto v1 Statement whose single subject is the uploaded file's name and `sha256`; the publisher identity derives from the certificate; the verdict is `failed` on any of the CEP-style mismatches; the upload is refused on `failed` |
| npm provenance | `sigstore` | SLSA provenance and publish attestations from the packument's `dist.attestations` on a proxied remote, or the `_attestations` of a hosted `npm publish --provenance`; subject is the tarball's `sha512` mapped to the CAS digest by the handler's own record; identity policy as above |
| RubyGems attestation | `sigstore` | The bundles of the `attestations` multipart part of a hosted `gem push --attestation`, or the array the upstream serves at `/api/v1/attestations/{full_name}.json` on a proxied remote; subject is the `.gem`'s `sha256`; identity policy as above; the push is refused `422` on `failed` and the proxied bundles are re-hosted or not served (`rubygems.md`'s resolved attestation decision, was Q8 there, AC26) |
| CEP-27 attestation | `sigstore` | Predicate type `https://schemas.conda.org/attestations-publish-1.schema.json`; subject filename and `sha256` against the stored file; `targetChannel` must equal the repository's own URL on the hosted path or the remote's configured upstream URL on the proxied path (`channel-mismatch` otherwise) |
| npm registry signatures | `jws` (ECDSA P-256 over the `name@version:integrity` string) | `dist.signatures[]` `keyid` and `sig` verified against the remote's pinned `/-/npm/v1/keys`; `repository-chain`; hosted npm answers absent here (our own signatures are `signing-service.md`'s) |
| OpenPGP detached | `openpgp` | Armored or binary; flag `any`, `all` or `first-trusted`; RSA, ECDSA, EdDSA keys; subkeys; a signature made before its key's expiry verifies (Arch, CPAN, gpg's own rule); identity is the fingerprint; algorithms reported |
| OpenPGP cleartext | `openpgp` | CPAN `CHECKSUMS`; Helm `.prov` as an optional verdict source; same key semantics |
| apk v2 signed stream | `apk` | Leading tar segment, signatures read in order, those naming no configured key skipped, first configured key decides; `RSA`, `RSA256`, `RSA512`; digest over the following stream; plus the `C:`, `S:`, `datahash` integrity entry answered separately |
| RPM | `rpm` | Header and payload digests; header signature against the key set; identity, key algorithm and digest algorithm reported so policy, not the handler, refuses SHA-1 or Ed25519 for a client line that does |
| CMS SignedData | `cms` | Swift profile (exactly one signer, SHA-256 over the archive, ECDSA P-256, code-signing EKU, metadata and manifests signed by the same signer, roots from `x509-roots`, signing entity extracted) and NuGet profile (author signature and repository countersignature, RFC 3161 timestamp, code-signing EKU, chain to `x509-roots` or the imported SDK fallback bundle, match against `nuget-trusted-signers` including `owners`; untrusted root is `failed` with `untrusted-key` unless `allowUntrustedRoot`) |
| JWS | `jws` | General JSON serialization, PS512, `b64: false` with `crit`, `kid` against `raw-keys`; `repository-chain` for the bottle whose digest a verified document names |
| Raw Ed25519 | `raw` | Open VSX `.signature.sig` over the exact package bytes against the key the metadata names, pinned per remote |
| Raw RSA-SHA512 | `raw` | Hex's `Signed` protobuf: RSA PKCS #1 v1.5 over SHA-512 of the uncompressed `payload` bytes (the form Erlang's `public_key:sign/3` produces), against an RSA `raw-keys` entry; an **integrity call** through `Check` in the proxied verifier hook, answering `match` or `mismatch` and recording no verdict, since no artifact digest is vouched for (`hex.md` AC17, AC21) |
| TUF chain | `tuf` | hackage-security's chain (root, timestamp, snapshot, mirrors, index) with canonical JSON and the root-update rule, threshold from `tuf-root`; first failing link and its reason; `repository-chain` for a tarball matched by a verified index entry |
| Integrity: digest, size, checksum set | `internal/verify` | sha256, sha512, sha384, sha1, md5 (the last two answer `weak`), case-insensitive comparison where the client compares so (Vagrant) |
| Integrity: tree hash | `internal/verify/treehash` | Julia's git tree hash with collision-detecting SHA-1, resource-kind flag, streaming over the compressed archive |
| Integrity: `h1:` | `internal/verify/treehash` | Terraform's package hash over zip entries, computed only after the bundle's `SHA256SUMS` verdict |
| Integrity: metalink | `internal/verify` | SHA-256 or SHA-512 a metalink lists for `repomd.xml` |

### Provenance the registry vouches for, and signatures the client checks itself

Two kinds of served material behave differently, and the rule is stated once so the per-format
positions follow from it rather than being decided per format:

- **A signature the client verifies against its own keyring or trust store** (Galaxy signatures,
  Open VSX `.sigzip`, Arch `.sig`, Maven `.asc`, Helm `.prov`, NuGet's embedded signatures, Swift
  signatures, apk's index segment, RPM headers) is **never stripped or altered** by the registry,
  on either path. The registry stores it, serves it byte-identical, and records a verdict. A
  proxied signature that fails under the remote's trust set is served anyway, with a `failed`
  verdict that policy may refuse, because the client performs its own verification regardless
  and a registry that hides a signature is indistinguishable, to that client, from an upstream
  that never signed. `ansible-collections.md`'s pass-through (its resolved Q7) stands, now with a
  verdict beside it.
- **Provenance the index itself vouches for** (PEP 740 provenance objects, npm `dist.attestations`
  and the `/-/npm/v1/attestations/` document, RubyGems' `/api/v1/attestations/{full_name}.json`)
  is served **only when this registry verified it**.
  A proxied PyPI file's or gem's upstream provenance is fetched with the file, verified, cached as content
  and re-hosted from this registry's own URL; an attestation that fails is not served and its
  verdict is `failed`; a file whose upstream lists no provenance serves none and its verdict is
  absent. The alternative, passing the upstream's provenance URL through, tells a client "this
  index vouches for this" about material the index never saw, which is the false claim PEP 740's
  verify-before-accept exists to prevent (the resolved provenance decision, was Q7).

### Per-format positions

**OCI (Cosign).** Signatures and attestations are ordinary manifests joined to their subject by
the `Reference` edge, so a hosted push of a signature is a write like any other and a proxied
pull-through of one is a cache fill; the handler, on either, hands the subject digest and the
signature manifest's layers to the verifier, which records a verdict for the **subject** digest.
Discovery covers both the referrers query and the tag convention, because cosign without
`--registry-referrers-mode=oci-1-1` still writes the tag and reads it back. The conformance
case signs with a real cosign against a fixture Sigstore and pulls with a policy rule requiring
the identity, on both paths; the refusal is rendered as `oci.md`'s `DENIED` shape (AC6, sharing
`conformance/oci/cosign_test.go` with `oci.md` AC14, the handler's half).

**npm.** Proxied: the packument's `dist.signatures` verify against the pinned upstream keys
(`repository-chain`), and `dist.attestations` are fetched, verified and re-hosted. Hosted: a
publish carrying `_attestations` is verified before commit against the repository's identity
policy and refused on `failed`; the attestation is stored as a file of the version and served
under `/-/npm/v1/attestations/{name}@{version}` with `dist.attestations` pointing at it; a
publish without attestations commits with verdict absent. Hosted `dist.signatures` are
`signing-service.md`'s (its ECDSA P-256 profile and keys document, Phase 5 there). `npm.md`
records this as a Design section and its AC22, which mirrors AC20 here.

**PyPI.** The upload path verifies every `attestations` entry synchronously before commit: the
statement's subject must name the uploaded file and its `sha256`; the certificate identity must
match the repository's identity policy for that project; `log-required` applies. Any failure
refuses the whole upload with the reason, nothing committed, which lifts `pypi.md` AC14 from
"refused as unsupported" to "valid accepted and served, tampered refused" (its stated criterion
shape). The verified attestation is stored as a file of the version and the provenance object is
rendered from it with the publisher derived from the certificate's identity (`kind` and `claims`
as PEP 740 shows for GitHub), served under `provenance` in JSON and `data-provenance` in HTML,
and only then does the JSON `api-version` claim 1.3. Proxied provenance follows the rule above.
`pypi.md` carries both: its AC14 is lifted to this shape and its AC18 is the proxied re-host
rule (AC7 and AC8 here are this side of them).

**RubyGems.** The PEP 740 shape again, on `gem push --attestation` (RubyGems 4.0.20 sends the
bundles as an `attestations` multipart part beside the gem, captured in `rubygems.md`): every
bundle is verified inside the push, before commit, against the repository's `sigstore-root` and
`identity-policy`, with the statement's subject checked against the `.gem`'s `sha256`; any
failure refuses the push `422` with the reason, as rubygems.org does, and commits nothing; the
verified bundles are stored as a file of the version and served at
`/api/v1/attestations/{full_name}.json`, the rubygems.org route; a push without attestations
commits with the verdict `absent`. Proxied bundles are fetched with the `.gem`, verified under the
remote's trust set and re-hosted at the same route, never passed through unverified, or not
served with a `failed` verdict, the npm rule. The gem's own X.509 signatures (`gem cert`, the
`.sig` entries inside the archive) ask nothing of this spec: the client checks them against its
own certificate store and the registry serves the `.gem` byte-identical (`rubygems.md` AC27).
`rubygems.md`'s resolved attestation decision (was Q8 there) and its AC26 are the format's side;
AC32 here is this one.

**Galaxy.** Hosted collections acquire signatures by **user attachment**: an `attach` operation on
the version carrying a detached OpenPGP signature over the version's stored `MANIFEST.json`. The
attachment is verified before it is stored: the signature must verify over the exact stored
`MANIFEST.json` bytes with a key in the repository's `openpgp` trust set, otherwise it is refused
`validation` with the reason, because a served signature this registry could not verify is
exactly what a client that "requires valid signatures" will act on. The version detail serves
`signatures: [{signature, pubkey_fingerprint, signing_service: null, pulp_created}]`, the shape
pulp_ansible serializes and of which the client reads `signature`; `signing_service` is `null`
because `signing-service.md` decided not to build server-side signing (its resolved Galaxy
decision, was Q10 there), which this spec does not decide. Proxied signatures pass through with
a verdict. `ansible-collections.md` AC11 carries the revision in this shape (attach, served
entries, a tampered attachment refused, proxied pass-through with a verdict). Server-side signing was not
chosen because it brings key generation and rotation into a step that owns no keys; it stays
available to `signing-service.md` as a producer of attachments through the same verified `attach`
path, a capability that spec names and leaves unbuilt (the resolved Galaxy decision, was Q6).

**NuGet.** Both the author signature and the repository countersignature are verified from the
`.nupkg`'s signature file at ingest (hosted) and at commit (proxied): the author identity is the
leaf fingerprint matched against `author` trusted signers, the repository identity the
fingerprint plus `owners` against `repository` trusted signers, so a rule can require "signed by
nuget.org and owned by `microsoft`". A hosted publish never fails on signature state (recorded,
not enforced); a package whose signature file is malformed fails structurally. Trust roots are
the repository's `x509-roots`, seeded on Linux from the imported SDK fallback bundle when the
operator asks, and revocation follows the repository's mode. Repository countersigning by this
registry is `signing-service.md`'s and would run before the CAS commit as `nuget.md` requires.

**Swift.** Validity rules refuse at ingest with `422`; trust is a verdict with the signing entity
(common name, organisational unit, organisation) written into the version document by the
handler from the verifier's result; the same entry runs on the proxied path at commit.

**Conda.** CEP-50 sidecars are verified as CEP-27 attestations with the channel rule above; a
file arriving unattested into a repository whose policy requires attestation is policy's
refusal, as `conda.md` states.

**Maven, Arch, RPM, apk, Terraform, LuaRocks, Helm.** OpenPGP entries with the semantics each
spec pinned; verdict recorded, not enforced; Helm's `.prov` is verified only where the repository
has an `openpgp` trust set, otherwise absent, which changes nothing about how the client verifies
it.

**CPAN, Hackage, Homebrew.** `repository-chain` verdicts on the proxied path and absent on the
hosted path, as each spec states; a policy rule requiring a **publisher** identity does not
accept `repository-chain`, and one requiring any verified verdict does, so the distinction is
policy-visible without a fourth state.

**Hex.** Nothing on artifacts: the tarball carries no signature and its checksums are the
registry's own, so every Hex artifact digest answers absent and the verification column renders
`none` (AC24). What is verified is the registry's own documents on the proxied path: each upstream
`Signed` payload is checked by the raw RSA-SHA512 entry against the RSA key the operator imported
into the remote's `raw-keys` (never pinned from the upstream's own `public_key` route, `hex.md`'s
resolved trust-anchor decision, was Q9 there), as an **integrity call** in the post-receipt
verifier hook: a `mismatch`, an absent key or a payload whose `repository` field differs refuses
the commit, the cached revision keeps serving within the stale limit, and the next request fetches
again (AC30). It records no verdict, because no artifact digest is being vouched for; the
payload's integrity is what makes the checksums inside it trustworthy.

**Formats with nothing to verify.** Chef, Composer, CRAN, Debian, Go modules, opam, pub, Cargo,
Conan and generic answer absent for every digest, and so does every Hex artifact (above); the
conformance matrix records them as `none` for verification rather than as untested (AC24).

### Identity policies and the credential-management link

A Sigstore keyless identity is an OIDC issuer and a subject the issuer asserted about a workflow;
a `credential-management.md` trust policy is an OIDC issuer, an audience and exact claim
constraints about a workflow. They describe the same thing from two ends, so an `identity-policy`
entry may **reference a robot**: the expected issuer is the robot's trust-policy issuer and the
expected subject is derived from its claim constraints by the issuer's known mapping (for GitHub
Actions, `repository` and `workflow` yield the workflow URI the certificate's SAN carries, and
`repository_owner_id` is checked against the certificate's owner extension). The consequence that
matters: an upload authenticated by a token minted through the OIDC exchange must carry an
attestation whose identity matches the **same** robot's policy, and a mismatch is `identity-
mismatch` and refuses the upload (AC28). That closes the hole where a CI job exchanges as robot
A and attests as workflow B. Explicit `(issuer, subject)` entries remain for identities that never
exchange (a proxied upstream's publishers, a Trusted Publisher on another index). The mapping is
profile-specific and lives on the profile row of `credential-management.md`'s trusted-issuer
table (`github`, `gitlab` or `generic`: the profile is code, because the required-claim rule is a
security judgment per issuer, while the issuer URL is data), read through the small consumer
interface `internal/verify` declares at its point of use, never a table of this spec. A policy
under the `generic` profile derives no certificate identity, so an `identity-policy` entry
referencing such a robot is refused `validation` at the trust-set write, naming the profile,
rather than stored and matching nothing (its AC13; AC28 here). That is the resolved
identity-policy decision (was Q10), as amended on Fable 2026-10-01.

### Storage and GC placement

Nothing here is a mark root. Verdict records, trust sets, trust-set revisions (superseded being
derived from them, never a mark), the revocation want-list and the re-evaluation job are
core-owned records outside the format entity model, keyed by
digest and repository, tolerant of dangling references; a blob mentioned only by a verdict is
collected and the verdict stays readable (AC2). Attestations and signatures stored as files of a
version are ordinary snapshot content marked through the version, and a Cosign signature manifest
is kept live by the `Reference` edge from its subject as `data-model.md` already states.
`data-model.md`'s "Records that are not mark roots" table carries the verification records as
one row and its AC34 proves the collection.

**Repository lifecycle.** The records follow `repository-lifecycle.md`'s deletion and tombstone
rules. A rename changes nothing here: every record is keyed by the repository's identity, never
its name. Deletion leaves the trust set and every verdict untouched in the deletion transaction,
and cancels any pending `verify.reevaluate` job naming the repository as it cancels every other
pending job (`repository-lifecycle.md`'s deletion transaction, through the runner's
`CancelByRepository` inside that transaction, `async-operations.md` AC28). At **tombstone time**, when the
pruner drops the deleted repository's last snapshot, the trust set and all its revisions are
dropped with it; **verdicts are never dropped**, because a verdict must stay readable through
the tombstone after the bytes it explains are gone, exactly as a refusal record does
(`repository-lifecycle.md`'s deletion step 11 and its "Tombstone"; `data-model.md`'s non-root
row). A verdict read for a deleted repository resolves by identity and renders the name from the
tombstone. AC29 asserts all three.

### Configuration and CLI surface

Configuration follows the `cobra-viper` skill: keys under `verify.` bound with defaults, read
into a typed struct the package receives, never Viper itself. Trust sets are administered through
the management API, not configuration, because they are per repository and audited. The four
keys are in `deployment.md`'s key inventory, which its two-way check holds equal to this table.

| Key | Default | Meaning |
|---|---|---|
| `verify.sigstore.tuf_url` | `https://tuf-repo-cdn.sigstore.dev` | TUF repository the public-good `sigstore-root` refreshes from; the embedded root bootstraps it |
| `verify.sigstore.refresh` | `24h` | Period of the `verify.tuf_refresh` schedule; disabled under `proxy.offline` |
| `verify.revocation.refresh` | `12h` | Period of the `verify.revocation_refresh` schedule (CRL and OCSP for `x509-roots` entries); disabled under `proxy.offline` |
| `verify.keyserver` | `hkps://keyserver.ubuntu.com` | Keyserver for `openpgp` keyserver imports, used only by the import operation |

There is no `verify.workers` key: the re-evaluation bound is `async.kind_limits`
(`verify.reevaluate: 4`), owned by `async-operations.md` and tabled by `deployment.md` (its
resolved worker-limit decision, was Q11 there), so one bound has one home.

**Observability.** `internal/verify` emits `verify_verdicts_total{scheme,state}`,
`verify_duration_seconds{scheme}` and the gauge `verify_reevaluation_pending` from
`observability.md`'s catalogue, and a `failed` verdict at ingest or cache commit raises
`VerificationFailed` through `telemetry.Alert` (AC27); the trust-set writes carry
`manage.trust.update` and `manage.trust.import` audit events on `management-api.md`'s side.

The management API carries these routes in its endpoint table (`management-api.md`, "Trust set
and verdicts", AC28): `GET /api/v1/repositories/{name}/trust` under `pull`; `PUT` and `DELETE
/api/v1/repositories/{name}/trust` (a `PUT` is one revision) and `POST
/api/v1/repositories/{name}/trust/import` for a keyserver or upstream import under the admin
role; `GET /api/v1/repositories/{name}/verdicts/{digest}` for a verdict with its reason, identity,
scheme and revision, and `GET /api/v1/repositories/{name}/verdicts` with `state` and `scheme`
filters, both under `pull`. Trust and verdict **reads are `pull`**, because a client entitled to
resolve a repository's content is entitled to know what vouches for it; only the trust writes
and the import are admin. Refusals are its problem types (`validation`, `not-found`,
`conflict`); no new type is needed.

### Testing, and the offline Sigstore fixture

The oracle for a signature scheme is the real client that verifies it: `cosign verify`,
`pypi-attestations verify`, `npm audit signatures`, `ansible-galaxy` with
`required_valid_signature_count`, `dotnet` with `signatureValidationMode=require`, `swift
package-registry` with a trusted root, `pacman` with `SigLevel = Required`, `rpm -K`, `apk`,
`terraform providers mirror`, `ovsx verify`, `cabal update`. Every entry has a conformance case
on each path that the format has, and the case set for a format that asked for an entry is
incomplete without both (AC24).

Sigstore verification needs signatures that verify without a network. Two fixtures make that
possible. A **virtual Sigstore** (`sigstore-go`'s `VirtualSigstore`) issues certificates, log
entries and timestamps for a fixture identity and issuer, and its `TrustedRoot` is provisioned as
the case repository's `sigstore-root`; cosign, twine and the npm CLI are pointed at it where they
accept a custom trusted root, and where a client cannot be pointed at it (the npm CLI signs only
from a supported CI runner) the case replays a **recorded real bundle with the recorded
`trusted_root.json` of its day**, which verifies offline because verification time is the
bundle's own integrated time. Both are provisioned through a harness `setup` key, `trust`,
carrying a repository's trust set verbatim (keys, roots, identity policies, a `sigstore-root`
file), applied by the seed path like every other key; `conformance-harness.md`'s closed `setup`
vocabulary carries `trust` (its vocabulary table and AC17) and this spec builds its provisioner
(AC25).

Unit tests are table-driven per scheme over `testdata` fixtures (valid, tampered bytes, tampered
signature, untrusted key, expired key with a signature before and after expiry, wrong identity,
wrong issuer, missing log entry, revoked certificate), with the fixture signer generating the
material at test time where a library can (OpenPGP, Ed25519, JWS, Sigstore) and golden files
where it cannot (real `.nupkg`, `.rpm`, `.apk`, Swift archives captured from the real tools).

## Acceptance Criteria

- [ ] AC1: `internal/verify` satisfies `supply-chain-policy.md`'s verdict-source interface: for a
      `(repository, digest)` it answers `verified` with identity, scheme and chain, `failed` with
      a reason from the closed list, or `absent`, and a verdict whose trust-set revision is not the
      repository's current one is answered `absent` until re-evaluation replaces it, proven
      against `internal/policy`'s AC15 rule with this source in place of the fixture; a `Verify`
      request for a scheme whose kind has no entry in the repository's trust set answers
      `absent`, and `untrusted-key` is answered only when entries of that kind exist and none
      verifies the signature.
- [ ] AC2: A blob referenced only by a verdict is collected by the sweep and the verdict stays
      readable with its reason afterwards, because verdict records are keyed by `(repository,
      blob digest, scheme)`, live in no snapshot, are untouched by repoint and rollback, and are
      not a GC mark root; the same holds for trust sets, their revisions, the revocation
      want-list and the re-evaluation job.
- [ ] AC3: A repository's trust set is revisioned and administered through the management API
      under the admin role; a `PUT` creates one revision, which supersedes every verdict computed
      under an earlier revision by the derived rule (no verdict row is written, and the `PUT` on
      a repository holding a million verdicts commits in the time of its own rows), and enqueues
      one `verify.reevaluate` job in the same transaction; that job, bounded by
      `async.kind_limits`, recomputes every superseded verdict from stored bytes with a
      checkpoint per committed page; after it completes, a key removed from the set turns a
      `verified` verdict into `failed` with `untrusted-key`, or into `absent` when it was the last
      entry of its kind, a key added turns a `failed` one into `verified`, and a verdict whose
      signature material was evicted becomes `absent`; a second `PUT` while the job runs ends
      that job at its next checkpoint and the job the second revision enqueued recomputes
      everything; a kill mid-run followed by the queue's rescue resumes from the last checkpoint
      with no verdict recomputed twice and none skipped (`async-operations.md` AC15).
- [ ] AC4: Three architecture tests hold the boundaries: no package outside `internal/verify/**`
      imports `sigstore-go`, `go-crypto/openpgp`, the CMS library or `crypto/ecdsa`,
      `crypto/ed25519`, `crypto/rsa` for signature verification, `internal/trustsource` alone
      importing the TUF client and the key parsers and calling nothing that verifies a signature
      over content; no package under `internal/format/**` imports `internal/verify`, every
      handler reaching it through the `Verifier` in `Deps`; and `internal/verify/**` implements
      no cryptographic primitive, proven by an allowlist of imports the way `auth.md` AC9 proves
      it.
- [ ] AC5: The Sigstore entry verifies a bundle offline against the repository's `sigstore-root`
      exactly as the client specification orders it (signing time from the timestamp or
      `integratedTime`, chain validity at that time, SCT, log entry when `log-required`, identity
      policy, signature), and answers `failed` with the specific reason for a tampered artifact
      (`bad-signature`), a wrong subject (`identity-mismatch`), a wrong issuer
      (`identity-mismatch`), a certificate expired at signing time (`expired-at-signing`), a
      missing log entry under `log-required` (`log-missing`) and a bundle whose log entry does
      not match its signature (`log-invalid`), each proven against a `VirtualSigstore` and once
      against a recorded public-good bundle with its recorded `trusted_root.json`.
- [ ] AC6: An OCI image signed with a real `cosign sign` against the fixture Sigstore is found
      through both the referrers query and the `sha256-<hex>.sig` tag, its **subject** digest gets
      a `verified` verdict with the certificate identity, and a repository rule requiring that
      identity refuses `docker pull` of an unsigned image and of one signed by another identity
      with `oci.md`'s `DENIED` rendering while serving the signed one, on the hosted path and
      through a remote repository whose upstream stand-in serves the signed image.
- [ ] AC7: A real `twine upload --attestations` of a file whose attestation the fixture Sigstore
      issued for an identity in the repository's identity policy is accepted, the attestation is
      stored as a file of the version, and the simple index serves `provenance` in JSON with
      `api-version` 1.3 and `data-provenance` in HTML, both pointing at a provenance object
      `pypi-attestations verify` accepts; the same upload with a tampered attestation, an
      attestation whose subject names another file, or an identity outside the policy is refused
      with the reason and nothing is committed, and a repository with no identity policy refuses
      every attestation-bearing upload as `pypi.md` AC14 states today.
- [ ] AC8: A proxied PyPI file whose upstream serves provenance gets its attestations fetched,
      verified and cached; a verified one is re-hosted under this registry's own provenance URL,
      a failed one is not served and the file's verdict is `failed`, a file with no upstream
      provenance serves none with verdict `absent`, and no served provenance URL ever points at
      the upstream.
- [ ] AC9: A Galaxy collection version acquires a signature through the management API's `attach`
      kind; the attachment is accepted only when the detached OpenPGP signature verifies over the
      version's stored `MANIFEST.json` with a key in the repository's `openpgp` trust set, and is
      refused `validation` with the reason otherwise; the version detail then serves
      `signatures: [{signature, pubkey_fingerprint, signing_service: null, pulp_created}]`, a real
      `ansible-galaxy collection install` requiring one valid signature installs it, and the same
      client refuses a collection whose stored `MANIFEST.json` was tampered after attachment; on
      a remote repository an upstream signature passes through byte-identical with a verdict
      recorded under the remote's trust set.
- [ ] AC10: The OpenPGP detached entry verifies armored and binary signatures by RSA, ECDSA and
      EdDSA keys and by subkeys, honours the `any`, `all` and `first-trusted` flags (a second
      untrusted packet fails under `all` and passes under `any`), counts a signature made before
      its key's expiry as verified and one made after as `expired-at-signing`, and reports the
      key and digest algorithms so a rule refusing SHA-1 refuses the SHA-1 fixture without any
      handler code naming an algorithm; proven per Maven, Arch, RPM `repomd.xml`, Terraform
      `SHA256SUMS` and LuaRocks fixtures.
- [ ] AC11: The OpenPGP cleartext entry verifies a CPAN `CHECKSUMS` signed by a subkey of an
      imported primary key and one signed before the key expired, answers `untrusted-key` for the
      MIYAGAWA-shaped case where the signing subkey is not in the trust set, and a proxied archive
      whose SHA-256 matches a verified `CHECKSUMS` gets `verified` with chain `repository-chain`
      while a hosted archive answers `absent`.
- [ ] AC12: The apk entry verifies a v2 signed index and package with the first-trusted-key rule
      over `RSA`, `RSA256` and `RSA512` (a leading signature naming an unconfigured key is
      skipped, the next configured one decides), and its integrity entry answers `C:`, `S:` and
      `datahash` separately with `mismatch` on each tampered case, proven by a real `apk add`
      through a hosted and a proxied repository.
- [ ] AC13: The RPM entry verifies header and payload digests and the header signature against a
      key set, reports key id, key algorithm and digest algorithm, and answers `failed` on a
      tampered payload; the metalink entry answers `mismatch` on a `repomd.xml` whose digest the
      metalink does not list; both proven with `rpm -K` agreement on the same fixtures.
- [ ] AC14: The CMS entry's NuGet profile verifies an author signature and a repository
      countersignature from a real signed `.nupkg`, chains to the repository's `x509-roots` or
      the imported SDK fallback bundle, checks the RFC 3161 timestamp and the code-signing EKU,
      matches the `nuget-trusted-signers` entry's `author` and `repository` signers including `owners`, answers `untrusted-
      key` for an untrusted root unless `allowUntrustedRoot`, and records `revocation: unchecked`
      under the `cached` mode with no material, `revoked` under `required`, and `checked` when
      cached CRL material covers the chain; `dotnet restore` with
      `signatureValidationMode=require` agrees on every fixture.
- [ ] AC15: The CMS entry's Swift profile refuses at ingest, with `422` and nothing committed, an
      archive whose signature has two signers, a digest over other bytes, a non-P-256 key, a
      certificate without the code-signing EKU, unsigned metadata beside a signed archive or a
      manifest signed by a different signer; accepts a valid one and records a verdict whose trust
      follows the repository's roots with the signing entity returned to the handler; and runs
      identically on a remote at cache commit, where a failed trust records `failed` and refuses
      nothing by itself.
- [ ] AC16: The JWS entry verifies a Homebrew API document (general JSON serialization, PS512,
      `b64: false`, `crit`) against the `kid`'s `raw-keys` entry and answers `failed` for an unknown `kid`, a
      wrong algorithm and a mismatched signature, so the remote commits only documents a real
      `brew` would accept; the raw Ed25519 entry verifies an Open VSX `.signature.sig` against the
      key pinned for the remote, a new upstream key identifier creates a trust-set revision with a
      recorded divergence, and `ovsx verify` through the cache agrees.
- [ ] AC17: The TUF entry verifies a hackage-security chain (root, timestamp, snapshot, mirrors,
      index) against `tuf-root` key ids and threshold with canonical JSON and the root-update
      rule, names the first failing link and its reason on a tampered timestamp, a rolled-back
      version, an expired snapshot and a wrong hash, and a proxied tarball matched by a verified
      index entry gets `verified` with chain `repository-chain`.
- [ ] AC18: The integrity entries answer `match`, `mismatch` or `weak` and are never stored as
      verdicts: Arch `%CSIZE%` and `%SHA256SUM%`, Puppet SHA-256 with MD5-only `weak`, Vagrant's
      five checksum types compared case-insensitively with `md5` and `sha1` `weak`, Julia's tree
      hash with a collision-detecting SHA-1 under both resource kinds, and Terraform's `h1:` equal
      to `terraform providers mirror`'s for the fixture and computed only after the `SHA256SUMS`
      verdict; a `mismatch` on the proxied path leaves nothing in the CAS.
- [ ] AC19: The CEP-27 entry verifies a CEP-50 sidecar bundle, checks the subject filename and
      `sha256` against the stored file (`subject-mismatch`) and `targetChannel` against the hosted
      repository's own URL or the remote's configured upstream URL (`channel-mismatch`), and
      matches the identity policy; proven on both paths with the fixture Sigstore.
- [ ] AC20: On a proxied npm remote, `dist.signatures` verify by `keyid` against the upstream's
      pinned keys document as `repository-chain`, `dist.attestations` are fetched, verified and re-hosted under
      `/-/npm/v1/attestations/{name}@{version}` with the packument pointing at this registry, and a
      real `npm audit signatures` against the remote passes for a package whose recorded bundle
      verified and reports the failure for one whose attestation this registry refused to serve;
      on a hosted repository a publish carrying `_attestations` is refused before commit when they
      fail the identity policy and stored and served when they verify.
- [ ] AC21: A verdict is recorded, not enforced, for every entry the format specs listed so
      (Maven, Arch, RPM, apk and NuGet package signatures, Open VSX, LuaRocks, Helm `.prov`): the
      write commits with a `failed` verdict and a real client without a signature rule installs
      the artifact, and the same artifact is refused at resolution once a rule requiring
      `verified` binds; and a verdict is enforcing at ingest exactly where the ecosystem demands
      it (PEP 740, RubyGems `gem push --attestation`, Swift validity, Galaxy `attach`), so the
      write is refused and nothing commits.
- [ ] AC22: `internal/verify/**` performs no network I/O: an egress test that fails any dial from
      the package passes under every entry; the keyserver import, the TUF refresh and the
      revocation refresh run in `internal/trustsource` and only write the trust set (the import
      inside its `POST .../trust/import` request under that request's bound, the refreshes as the
      `verify.tuf_refresh` and `verify.revocation_refresh` schedules, whose periods are
      `verify.sigstore.refresh` and `verify.revocation.refresh`); and under `proxy.offline` the
      schedules are suspended, the import is refused `validation` naming the switch, and
      verification continues on the last revision.
- [ ] AC23: Trust-set sources populate entries and nothing else: a keyserver import stores an
      `openpgp` entry by fingerprint; the TUF updater refreshes `sigstore-root` from the embedded
      root and refuses a root whose signatures do not meet the threshold; an upstream key pinned
      at remote configuration (npm keys, Open VSX `publicKey`, NuGet `RepositorySignatures`,
      Terraform download keys) is recorded with its identifier, and a later different key under
      the same identifier is refused with a recorded divergence rather than silently replacing it.
- [ ] AC24: Every format whose spec asked for an entry has a passing hosted and a passing proxied
      verification case in the conformance matrix (proxied only where the format has a proxied
      path), every format whose spec asked for nothing carries `none` with the format spec cited,
      and a format asking for an entry without both cases fails the matrix build.
- [ ] AC25: The harness `setup` vocabulary gains a `trust` key whose provisioner lands with this
      spec: a case declaring a repository's trust set (keys, roots, identity policies, a
      `sigstore-root` file) has it applied through the seed path before the client runs, the
      runner rejects an unknown entry kind, and AC6, AC7, AC9 and AC12 are provisioned through it.
- [ ] AC26: Verification adds no second pass over artifact bytes on the hosted ingest path or
      inside the proxied verifier hook: integrity entries and the apk, RPM and CMS entries compute
      from the single reader the caller is committing from, the one deliberate second read being
      a proxied verdict computed from the committed CAS blob after the commit (`openvsx.md`'s
      "never from bytes in flight"), and the
      benchmark suite gates the ingest-path overhead of a Sigstore bundle verification and of an
      OpenPGP detached verification at a budget stated in a `// gate:` comment in the benchmark
      file, which `scripts/bench-gate.sh` compares and fails the `main` build on regression
      (`observability.md`'s shared gate mechanism).
- [ ] AC27: A verdict is readable through the management API for its repository and digest with
      state, reason, identity, scheme, chain, algorithms and trust-set revision under `pull`, a
      listing filters by state and scheme, every verdict increments
      `verify_verdicts_total{scheme,state}`, and a `failed` verdict produced at ingest or cache
      commit fires the `VerificationFailed` alert through `telemetry.Alert` naming the
      repository, coordinate, digest and reason.
- [ ] AC28: An upload authenticated by a token minted through the OIDC exchange whose attestation
      identity does not derive from the same robot's trust policy is refused `identity-mismatch`
      before commit, one whose identity does derive from it is accepted, an explicit
      `(issuer, subject)` identity-policy entry admits an identity that never exchanged, and a
      trust-set `PUT` whose `identity-policy` entry references a robot under the `generic`
      issuer profile is refused `validation` naming the profile, with no revision created.
- [ ] AC29: Renaming a repository leaves its trust set, its revision and every verdict readable
      under the new name with no re-evaluation; deleting it leaves them untouched in the deletion
      transaction and cancels a pending `verify.reevaluate` job naming it; and at tombstone time
      the trust set and all its revisions are dropped while every verdict stays readable by the
      repository's identity, with the name rendered from the tombstone.

- [ ] AC30: The raw RSA-SHA512 entry, called through `Check` as an integrity call, answers `match`
      for a Hex `Signed` payload whose signature is RSA PKCS #1 v1.5 over SHA-512 of the exact
      payload bytes under the named RSA `raw-keys` entry, and `mismatch` for a tampered payload, a
      tampered signature, a signature by another key, a PSS signature and a SHA-256 one; an RSA
      key below 2048 bits is refused at trust-set import; and on a proxied Hex repository a
      payload answering `mismatch`, or fetched while the remote's trust set holds no RSA key, is
      never committed, the cached revision keeps serving and no verdict record is written, proven
      with a real `mix deps.get` against a stand-in signing with a fixture key (`hex.md` AC17 and
      AC21 are the client half).
- [ ] AC31: A remote's current revision carries the anchor class its adoption computed through
      this spec's classifier from the fetch-and-cache request's hook as it applied and the
      remote's trust set as it stood: `signature` for a `Verify` hook (or an integrity-gating hook
      that records a verdict) whose scheme has an entry of its kind in the trust set, `integrity`
      for a `Check` hook, and `none` for no hook or for a `Verify` hook whose scheme has no entry
      of its kind, in which case the document's verdict is `absent`; a `Verify` declared over a
      paired set's optional member, or over a document's optional signature segment, that the
      upstream served without did not apply, so the classifier, handed the hooks that applied and
      no declaration, answers `none` (or `integrity` where a `Check` gates the set) with verdict
      `absent` whatever entries the trust set holds, and the served-or-not fact that adoption
      records beside the class (`data-model.md` AC44) is written and compared by `internal/proxy`
      and is never an input to the classifier (`proxy-cache.md` was-Q23, AC25); a trust-set
      change after the adoption leaves the recorded class unchanged and the next adoption records
      the new one; the adoption reaches the classifier only through the one-method interface
      `internal/proxy` declares, satisfied at the composition root; the index runtime reads the
      class beside the verdict through `internal/index`'s `Admission` interface, which returns
      the class and never the fact, and no handler package can reach either; and a metalink
      match records no verdict, so a Fedora remote is admitted to a signed virtual under
      `integrity` with every verdict `absent`.
- [ ] AC32: A real `gem push --attestation` (RubyGems 4.0.20) of a gem whose fixture Sigstore
      bundle satisfies the repository's identity policy commits, stores the bundle as a file of
      the version and serves it at `/api/v1/attestations/{full_name}.json`; the same push with a
      tampered bundle, a bundle whose subject names other bytes, or an identity outside the
      policy answers `422` with the reason and commits nothing; a proxied gem's upstream bundles
      are fetched, verified and re-hosted at that route on this registry, a failing one is not
      served and the gem's verdict is `failed`; and the gem's own `gem cert` signatures are
      served byte-identical with no verdict of their own.
## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | integration | `internal/verify/verdict_source_test.go`; `internal/policy/signature_verdict_test.go` (this source replacing the fixture) |
| AC2 | integration | `internal/verify/verdict_gc_test.go` (sweep with a verdict-only blob; repoint and rollback leave records unchanged) |
| AC3 | integration | `internal/verify/trust_revision_test.go` (revision, the derived superseded state with no verdict row written and a million-verdict fixture's `PUT` timed against its row count, re-evaluation outcomes including last-entry-of-kind removal, a second `PUT` mid-job ending the first at its checkpoint, on the production runner; kill and rescue from the checkpoint, idempotent recompute; shared with `async-operations.md` AC15's `internal/async/crash_test.go` case) |
| AC4 | unit | `internal/verify/boundary_test.go` (primitive allowlist inside the package); `internal/format/verify_boundary_test.go` (no handler imports `internal/verify`; no signature library outside `internal/verify/**`) |
| AC5 | unit | `internal/verify/sigstore/bundle_test.go` (table over `VirtualSigstore` cases and the recorded public-good bundle in `testdata/`) |
| AC6 | e2e conformance | `conformance/oci/cosign_test.go` (real cosign sign and pull, hosted and proxied, policy rule requiring identity) |
| AC7 | e2e conformance | `conformance/pypi/attestations_upload_test.go` (twine with fixture bundles, `pypi-attestations verify` on the served provenance, refusals) |
| AC8 | e2e conformance | `conformance/pypi/attestations_proxied_test.go` (stand-in serving provenance: verified, failed, none; URL assertions) |
| AC9 | e2e conformance | `conformance/ansible/signatures_test.go` (attach through the management API from `script`, real `ansible-galaxy` requiring one valid signature, tampered manifest, proxied pass-through) |
| AC10 | unit | `internal/verify/openpgp/detached_test.go` (flags, algorithms, subkeys, expiry timing, per-format fixtures) |
| AC11 | unit + integration | `internal/verify/openpgp/cleartext_test.go`; `internal/format/cpan/verdict_test.go` (repository-chain and absent) |
| AC12 | unit + e2e conformance | `internal/verify/apk/stream_test.go`; `conformance/alpine/signature_test.go` |
| AC13 | unit | `internal/verify/rpm/package_test.go`; `internal/verify/metalink_test.go` (fixtures cross-checked by `rpm -K` in the fixture build) |
| AC14 | unit + e2e conformance | `internal/verify/cms/nuget_test.go`; `conformance/nuget/signature_test.go` (`dotnet restore` under `require`) |
| AC15 | unit + e2e conformance | `internal/verify/cms/swift_test.go`; `conformance/swift/signed_publish_test.go` |
| AC16 | unit + e2e conformance | `internal/verify/jws/jws_test.go`; `internal/verify/raw/ed25519_test.go`; `conformance/homebrew/api_document_test.go`; `conformance/openvsx/signature_test.go` |
| AC17 | unit + integration | `internal/verify/tuf/chain_test.go`; `internal/format/hackage/verdict_test.go` |
| AC18 | unit + integration | `internal/verify/integrity_test.go`; `internal/verify/treehash/treehash_test.go`; `internal/proxy/verifier_hook_test.go` (mismatch commits nothing) |
| AC19 | unit + e2e conformance | `internal/verify/sigstore/cep27_test.go`; `conformance/conda/attestation_test.go` |
| AC20 | e2e conformance | `conformance/npm/signatures_test.go` (stand-in with recorded bundles and keys document; `npm audit signatures`; hosted `_attestations` publish) |
| AC21 | e2e conformance | `conformance/core/verdict_enforcement_test.go` (one recorded-not-enforced and one enforcing case per listed format, shared with each format's suite) |
| AC22 | unit | `internal/verify/egress_test.go` (dial-failing transport injected; offline switch suspends jobs) |
| AC23 | integration | `internal/trustsource/sources_test.go` (fixture keyserver, including a re-import bringing a new subkey; fixture TUF repository with a below-threshold root; pinned-key divergence; the revocation want-list written by a CMS verification and fetched by the refresh, with a changed CRL creating a revision) |
| AC24 | unit | `conformance/core/matrix_test.go` (verification column: both cases or `none` with citation; missing case fails the build; shared with `catalogue.md` AC7, `format-handler-interface.md` AC13 and `conformance-harness.md` AC20) |
| AC25 | integration | `conformance/core/setup_trust_test.go` (seed path applies `trust`; unknown entry kind rejected) |
| AC26 | benchmark | `internal/verify/bench_test.go` (single-reader assertion via a counting reader; Sigstore and OpenPGP ingest budgets with `// gate:` comments compared by `scripts/bench-gate.sh`) |
| AC27 | integration | `internal/manage/reads_test.go` (verdict read and listing under `pull`, shared with `management-api.md` AC28); `internal/verify/alert_test.go` (`verify_verdicts_total` and `VerificationFailed` through `telemetry.NewTestRecorder` on failed at ingest and at commit) |
| AC28 | integration | `internal/verify/sigstore/robot_identity_test.go` (exchange as robot A, attest as A and as B; explicit entry admits a non-exchanging identity; shared with `credential-management.md` AC13); `internal/verify/trust_set_test.go` (a `PUT` referencing a `generic`-profile robot refused `validation`, no revision) |
| AC29 | integration | `internal/verify/lifecycle_test.go` (rename keeps records and triggers no re-evaluation; deletion cancels the pending job and keeps records; tombstone drops the trust set and keeps verdicts readable by identity) |
| AC30 | unit + integration + conformance | `internal/verify/raw/rsa_sha512_test.go` (fixture key pair signing through the same PKCS #1 v1.5 SHA-512 form as `public_key:sign/3`; tampered payload, tampered signature, foreign key, PSS and SHA-256 signatures; under-2048-bit key refused at import); `internal/proxy/verifier_hook_test.go` (mismatch and empty trust set commit nothing and write no verdict); `internal/format/hex/proxied_integrity_test.go` (shared with `hex.md` AC17: the tampered payload and tampered `repository` field through the hook); `conformance/hex/proxied_test.go` (a real `mix deps.get` through a remote whose stand-in signs with a fixture key, with and without the key in the trust set; `hex.md` AC21's client half) |
| AC31 | unit + integration | `internal/verify/anchor_class_test.go` (the classifier over every hook shape against trust sets with and without an entry of the kind; the no-entry `Verify` answering `absent`; the unserved-member case: an applied-hook set from which the `Verify` over an unserved optional member or absent signature segment is missing classes `none`, or `integrity` beside a `Check`, against a trust set holding an entry of that kind, and the classifier's input type carries no declaration and no served-or-not fact); `internal/model/cache_freshness_test.go` (the class written at adoption from the trust set as it stood, unchanged by a later change, replaced by the next adoption; a `Verify` over an unserved optional member on a remote holding an entry of its kind reading `none` and `absent` with the fact `unsigned` beside it; shared with `data-model.md` AC44 and `proxy-cache.md` AC25); `internal/proxy/adoption_test.go` (the fact's comparison and the withdrawn-signature regression live there, `proxy-cache.md` AC25's row, and no file of this spec asserts them); `internal/index/admission_test.go` (the read beside the verdict returning the class and not the fact; a metalink remote admitted under `integrity` with `absent` verdicts; shared with `signing-service.md` AC36); `internal/format/arch_test.go` (no handler package reaches the read, shared with `format-handler-interface.md` AC15) |
| AC32 | e2e conformance | `conformance/rubygems/attestation_test.go` (fixture Sigstore through the `trust` key; hosted push accepted and refused cases, the served route, proxied re-hosting against a stand-in serving recorded bundles; shared with `rubygems.md` AC26 and AC27) |

## Implementation Phases

### Phase 1: Core, at charter step 4b with OCI (AC1 to AC6, AC22 to AC27, AC29, AC31)
- Entry: `async-operations.md` Phases 1 to 3 (the queue core, the first item of step 4b), on
  which the `verify.reevaluate` kind and the two refresh schedules run
- `internal/verify`: the `Verifier` and `VerdictSource` consumer interfaces declared beside
  `Deps` and in `internal/policy`, the verdict store and its records, trust sets with revisions
  (superseded derived, never marked), the `verify.reevaluate` worker registered on
  `internal/async`, the anchor-class classifier behind the interface `internal/proxy` declares
  and the `Admission` read `internal/index` declares (AC31), the alert and the metrics
- `internal/trustsource`: the keyserver import behind `POST .../trust/import`, the
  `verify.tuf_refresh` and `verify.revocation_refresh` schedules with the revocation want-list,
  and the write half of upstream key pinning
- `internal/verify/sigstore` on `sigstore-go`, the TUF refresh from the
  embedded root, the `VirtualSigstore` fixture and the recorded-bundle fixture
- Cosign discovery over the `Reference` edge and the tag convention in the OCI handler's reads
- The three architecture tests, the egress test, the benchmark gate
- The trust and verdict routes on the management API (its endpoint table); the harness `trust`
  key's provisioner; the lifecycle behaviour (AC29)
- Sibling records and hooks already in place, cited: `data-model.md`'s non-root row (AC34),
  `storage-and-gc.md`'s read-path digest verification (AC21, AC22), `proxy-cache.md`'s verifier
  hook (AC20), `conformance-harness.md`'s `trust` key (AC17), `management-api.md`'s rows (AC28)

### Phase 2: Tier 1 provenance and attachments (AC7 to AC9, AC20, AC28)
- PEP 740 in-upload verification, storage as version files, provenance rendering in both
  serializations, `api-version` 1.3; proxied re-hosting; `pypi.md` AC14 revised
- npm proxied signatures and attestations, hosted `_attestations`
- Galaxy `attach` verification and served entry; `ansible-collections.md` AC11 revised
- Robot-derived identity policies with `credential-management.md`'s exchange
- Built with npm (step 5), PyPI (step 6) and Ansible collections (step 6a), each charged to the
  format that triggered it per the charter's cost procedure

### Phase 3: Tier 1 remainder entries (AC10, AC13, AC14, AC21)
- `internal/verify/openpgp` detached with the three flags (Maven first, then RPM `repomd.xml`)
- `internal/verify/rpm` and the metalink entry
- `internal/verify/cms` with the NuGet profile, the fallback-bundle import, revocation modes; CMS
  library chosen and recorded here
- Helm `.prov` as an optional cleartext verdict source

### Phase 4: Tier 2 and Tier 3 entries, each with its format (AC11, AC12, AC15 to AC19, AC30, AC32)
- Swift CMS profile; apk stream and integrity; Arch `all`; Terraform `SHA256SUMS` and `h1:`;
  CPAN cleartext; Hackage TUF chain; Homebrew JWS; Open VSX Ed25519 and key pinning; Julia tree
  hash; Puppet and Vagrant checksum entries; conda CEP-27; LuaRocks optional source; the Hex raw
  RSA-SHA512 integrity entry and the RSA `raw-keys` type, with Hex's proxied phase (AC30);
  RubyGems attestations on both paths with that format (AC32)

### Phase 5: Matrix and closure (AC24)
- Verification column in the conformance matrix with `none` citations (`catalogue.md` AC7
  renders it per ecosystem row); every asked-for entry has both cases

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. Eleven questions were written in decision shape during authoring and adopted under the
owner's standing delegation; each is recorded below with its accepted cost and is reversible by
the owner.

### Resolved: when verification runs (was Q1)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: at ingest on the hosted
path (synchronous where the ecosystem demands it, recorded otherwise) and at cache commit on the
proxied path from the CAS blob, with re-evaluation of stored verdicts on every trust-set change
and never at serve time. Folded into "When verification runs", AC3 and AC21.

Accepted cost: a trust-set change makes a repository's signature rules refuse until
re-evaluation completes, and the worker is one more background job with a shutdown path to hold
(since folded onto `internal/async` as the `verify.reevaluate` kind, whose shutdown and rescue
are the queue's; "When verification runs").

| Option | You get | It costs |
|---|---|---|
| **A. Ingest and commit, re-evaluate on trust change, never at serve** | One evaluation per digest per trust revision; reproducible; read path pays nothing | A refusal window after a trust change; a re-evaluation worker |
| **B. Verify at every resolution** | Always current; no stored state | Signature verification on the hot read path for every format, and a verdict that can flap with a keyserver's availability |
| **C. Ingest only, never re-evaluate** | Simplest | A revoked or removed key leaves stale `verified` verdicts forever, the exact failure a trust set exists to prevent |

Why this is a judgment call: it prices a refusal window against a hot-path cost and a stale-trust
hazard, and the format specs asked for both synchronous and recorded behaviour, so the split had
to be drawn once.

Rechecked on Fable 2026-10-01: confirmed, with the fold amended and the cost restated at full
size. The fold wrote "marks every verdict superseded in the same transaction", a mass update of
every verdict row on each `PUT`, millions on a proxied PyPI remote; superseded is now a state
derived from the verdict's revision against the repository's current one, so a revision writes
its own rows only, and the "no window" property rests on the revision bump alone (Design, "The
verdict is a stored fact"; AC3). A job overtaken by a newer revision ends at its next checkpoint.
The under-stated cost: the window is not only after a key removal. Every revision supersedes
every verdict, including an additive `PUT`, an upstream key rotation pinned automatically and a
changed CRL, because no entry kind is monotone (`first-trusted` lets an added key change which
apk segment decides, and revocation material can only tighten), so a busy remote with a
`verified`-requiring rule refuses for the length of each re-evaluation; the bound is
`async.kind_limits` and the signal is `verify_reevaluation_pending`.

### Resolved: the verdict record, its key and its vocabulary (was Q2)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: a core-owned record keyed
by `(repository, blob digest, scheme)` outside the format entity model, not a mark root, in the
row `data-model.md` reserves for the policy layer's records; three states, with `untrusted` and
`bad` as `failed` reasons and `repository-chain` as a qualifier on `verified`; a verdict under a
superseded revision answers absent. Folded into "The verdict is a stored fact", AC1 and AC2;
`data-model.md` carries the row (its "Records that are not mark roots", AC34).

Accepted cost: a fourth state some format specs sketched (`untrusted`) is expressed as a reason,
so a rule wanting to distinguish it reads the reason; dedup across repositories re-verifies.

| Option | You get | It costs |
|---|---|---|
| **A. Core record by digest and repository, three states plus reason and chain** | Matches the consumer interface as pinned; survives GC; explainable after purge | Reasons, not states, carry the finer distinctions |
| **B. A field in the version's metadata document** | No new record | Snapshot content, so a trust change would create snapshots and a rollback would resurrect a verdict; handler-owned, so policy would parse opaque documents |
| **C. Widen the consumer interface to four states** | Untrusted visible as a state | Reopens `supply-chain-policy.md` AC15's fixed semantics from the producer side, which that spec adopted its interface precisely to prevent |

Why this is a judgment call: it decides where a security fact lives relative to the snapshot
model and the GC root set, both owner-settled.

Rechecked on Fable 2026-10-01: confirmed and amended in its vocabulary. The record left one
case undefined: a signature checked against a trust set holding no entry of the scheme's kind.
Read as `untrusted-key` it would make every keyless remote's documents `failed`, which
`signing-service.md`'s admission rule (was Q20 there) never admits, contradicting the `none`
anchor class that rule admits by design. Now `untrusted-key` needs at least one entry of the
kind and a no-entry `Verify` answers `absent`, which also matches the Helm `.prov` position
this spec already held (Design, "Two products"; AC1).

### Resolved: trust sets, their sources and offline behaviour (was Q3)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: per-repository revisioned
trust sets filled by import, keyserver import, the Sigstore TUF updater and upstream key pinning,
with verification reading only the trust set and never a network; offline mode suspends the
sources and not verification. Folded into "Trust sets", AC22 and AC23.

Accepted cost: a Maven repository trusting "whatever key the artifact names" cannot exist; an
operator imports or pins keys, and a new upstream key is a recorded divergence to act on rather
than an automatic acceptance.

| Option | You get | It costs |
|---|---|---|
| **A. Per-repository sets, sources write, verification reads** | Reproducible, offline-capable verdicts; egress confined to jobs; RBAC-aligned | Operators curate keys; first sight of a new upstream key needs a look |
| **B. Instance-wide trust store (zot's model)** | One place to configure | A private repository's publishers and a public mirror's upstream share a root set, so a key trusted for one vouches in the other |
| **C. Fetch keys at verdict time (Gradle's keyserver lookup)** | Zero curation | A verdict that depends on a keyserver's availability and content at the moment of the fetch, unreproducible and online |

Why this is a judgment call: it trades curation effort against reproducibility of a security
decision.

Rechecked on Fable 2026-10-01: confirmed and amended in its fold. The sources had no package:
the body said `internal/verify` "registers workers for its three kinds" while AC22 forbade
network I/O anywhere under `internal/verify/**`, so the two refreshes and the keyserver import
had nowhere lawful to run. They live in `internal/trustsource`, which writes the trust set and
verifies nothing (Design, "Trust sets"; AC4, AC22). Two things the record under-stated: upstream
key pinning is trust-on-first-use per key identifier at the upstream's TLS trust level, which is
exactly the level `repository-chain` already means, and the stronger posture is the operator
import the cost row names; and the keyserver import is a refresh as well as an import, which is
what cures `cpan.md` AC26's configured-but-stale PAUSE key. The anchor class a remote's adoption
ran under, now a fact this spec derives from the trust set as it stood (Design, "Anchor class";
AC31), follows from this decision rather than changing it. Fable follow-up 2026-10-01, round 3:
the classifier's other input is the hook as it applied, not as declared, so a signature member
the wire makes optional and the upstream did not serve leaves the class `none` with verdict
`absent` whatever keys this decision's sources imported (`proxy-cache.md`'s resolved
withdrawn-signature decision, was Q23 there, owner-facing); the served-or-not fact that rule
compares is `data-model.md` AC44's and `internal/proxy`'s, never an input here.

### Resolved: transparency log requirement (was Q4)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: the log entry is verified
offline from the bundle (SET or inclusion proof against the trusted root's log keys), required by
default for keyless identities (`log-required` on) and optional per identity-policy entry;
no online Rekor lookup ever. Folded into the Sigstore entry and AC5.

Accepted cost: a bundle produced without a log entry against a private Sigstore with no Rekor
needs an identity-policy entry with `log-required` off, an explicit opt-out.

| Option | You get | It costs |
|---|---|---|
| **A. Offline from the bundle, required by default for keyless** | Non-repudiation without a network; Sigstore's own default posture | Private instances without a log opt out explicitly |
| **B. Online Rekor lookup** | Detects a bundle whose entry was never in the log's current tree | Verification depends on rekor.sigstore.dev being reachable; violates the no-egress boundary |
| **C. Never check the log** | Simplest | A leaked short-lived certificate could sign after the fact with no time anchor |

Why this is a judgment call: it decides how much of Sigstore's security model the registry
enforces on behalf of clients that will not.

Rechecked on Fable 2026-10-01: confirmed. The offline check proves the entry was signed by the
log's key in the trusted root, not that it is in the log's current tree, so a split-view log is
outside what A detects; that is the gap B would close and the record's option table already
prices it correctly against the egress boundary.

### Resolved: serve-time verification for clients that verify nothing (was Q5)

**Adopted 2026-09-27 under the owner's standing delegation.** Option B: no signature
re-verification at serve time; the protection served bytes need is the CAS verifying the blob's
digest while streaming on every read, aborting with an operator alert on a mismatch, which is
`storage-and-gc.md`'s and now stands there for every format (its AC21, with the budget in AC22),
since the cost is one hash over bytes already being streamed. Folded into Scope and "When
verification runs".

Accepted cost: hashing on every read (SHA-256 at memory bandwidth on current hardware, gated by
the storage spec's benchmarks), and a read that fails mid-stream for the one client that hit the
altered object.

| Option | You get | It costs |
|---|---|---|
| **A. Re-verify signatures on every read** | Freshest possible verdict | Signature verification on the read path of every format, and it protects nothing a digest check does not: the signature is over the same digest |
| **B. CAS digest verification on read, verdict unchanged** | Altered object storage cannot reach cpm, Carton, Conan or an editor; a verdict can never accompany bytes it did not describe | One hash per read; owned by the storage spec |
| **C. Periodic scrub only** | No read-path cost | A window between alteration and detection during which verify-nothing clients install altered bytes |

Why this is a judgment call: it weighs a read-path cost across all 33 formats against a class of
clients whose only integrity check is ours, which cross-cutting theme 4 asked this spec to weigh.

Rechecked on Fable 2026-10-01: confirmed. `storage-and-gc.md` holds it as planned on Fable
(its "The read path verifies what it serves", AC21 with the heal by re-push and
`--restore-dangling`, AC22's budget), verified at this sha.

### Resolved: Galaxy signatures, attachment or server-side signing (was Q6)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: user attachment through
`management-api.md`'s `attach` kind, verified before storage over the exact stored
`MANIFEST.json` against the repository's `openpgp` trust set, served in pulp_ansible's shape with
`signing_service: null`; proxied signatures pass through with a verdict. Server-side signing is
not decided here and remains `signing-service.md`'s, which may produce attachments through the
same verified path. Folded into "Per-format positions", AC9 and the `ansible-collections.md`
consequence.

Accepted cost: publishers run `gpg` themselves and attach through an API call the client cannot
make; `signing_service` stays `null` until the signing spec decides.

| Option | You get | It costs |
|---|---|---|
| **A. Verified attachment through `attach`** | No key material in this step; the served signature is one this registry verified; the real client is the oracle | A publisher workflow with an API call; no automatic signing |
| **B. Store-and-serve without verification** | Any signature accepted | The registry serves signatures it cannot vouch for to a client that trusts what the server lists |
| **C. Server-side signing now** | Signatures without a publisher workflow | Key generation, storage and rotation inside a verification step, crossing the boundary the charter drew at step 7 |

Why this is a judgment call: it settles a producer question the format spec deferred here and
prices a publisher workflow against key custody.

Rechecked on Fable 2026-10-01: confirmed. `ansible-collections.md` AC11 and its resolved Q7
carry the format side, `signing-service.md`'s resolved Galaxy decision (was Q10 there) declines
server-side signing and keeps the verified `attach` path as the producer's door, and
`management-api.md`'s endpoint table carries the `attach` row, all verified at this sha.

### Resolved: proxied provenance, pass through, verify or re-host (was Q7)

**Adopted 2026-09-27 under the owner's standing delegation.** Option C: provenance the index
vouches for (PEP 740, npm attestations) is verified and re-hosted from this registry, or not
served; signatures the client verifies itself are passed through byte-identical with a verdict.
Folded into "Provenance the registry vouches for", AC8 and AC20.

Accepted cost: an upstream attestation this registry cannot verify (unknown identity, no
identity policy on the remote) is invisible to clients of the remote, who see no provenance where
the upstream showed some.

| Option | You get | It costs |
|---|---|---|
| **A. Pass the upstream's provenance URL through** | Fidelity to the upstream | The index claims to vouch for material it never saw, and the URL leaves the registry |
| **B. Verify, then pass the upstream URL through** | A verdict exists | Same outbound URL; a client behind the registry cannot reach it |
| **C. Verify and re-host, or do not serve** | The registry vouches only for what it verified; every URL is ours (the opam and Open VSX rule generalised) | Unverifiable provenance disappears from the remote's view |

Why this is a judgment call: it is a claim the product makes to users about what "provenance
from this index" means.

Rechecked on Fable 2026-10-01: confirmed, fold extended. RubyGems' `/api/v1/attestations/`
route is a third instance of index-vouched provenance and follows the same rule (Design,
"Provenance the registry vouches for", the RubyGems position; AC32).

### Resolved: NuGet trust roots and revocation (was Q8)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: per-repository
`x509-roots` seeded on request from the imported SDK fallback bundle, `nuget-trusted-signers`
with `owners`, untrusted root as `failed` with `untrusted-key`, and revocation from cached CRL and
OCSP material under a per-repository mode (`cached` default, `required`, `off`) with the check's
status recorded on the verdict. Folded into "Trust sets", the CMS entry and AC14.

Accepted cost: a revocation refresh job, and a `cached`-mode verdict that a rule must read the
`revocation` field of to be strict.

| Option | You get | It costs |
|---|---|---|
| **A. Cached revocation with three modes, SDK bundle importable** | Offline-capable, fail-closed available, matches the SDK's Linux behaviour | A refresh job and a verdict field |
| **B. Online OCSP at verdict time** | Freshest status | Breaks the no-egress boundary and makes verdicts depend on Microsoft's responders |
| **C. Never check revocation** | Simplest | A revoked author certificate keeps verifying; the SDK would warn `NU3018` where we say verified |

Why this is a judgment call: it decides how strictly the registry mirrors a client's own trust
checks when the client will repeat them anyway.

Rechecked on Fable 2026-10-01: confirmed and amended in its fold. The refresh job was given
nothing to fetch: CRL distribution points and OCSP responders sit in the leaf and intermediate
certificates a verification walks, not in the roots the trust set holds. Each CMS verification
now records the chain's distribution points as wanted material on the trust set, the refresh
fetches that, and a change in the material is a revision that re-evaluates the repository's CMS
verdicts (Design, "Revocation"; AC23). The under-stated cost follows: a repository's CMS verdicts
are recomputed each time a wanted CRL changes, at most once per `verify.revocation.refresh`.

### Resolved: how handlers and the proxy layer reach the verifier (was Q9)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: a two-method `Verifier`
consumer interface declared in `internal/format` beside `Deps`, with typed requests selecting the
entry; the same concrete type behind `proxy-cache.md`'s post-receipt verifier hook and
`internal/policy`'s `VerdictSource`; format-entangled parsing inside scheme packages under
`internal/verify`; three architecture tests. No method is added to the pinned handler interface.
Folded into "How a handler reaches the verifier", the entry catalogue and AC4.

Accepted cost: a request type that grows a field per scheme-specific input, and one more
consumer interface for the re-open to look at.

| Option | You get | It costs |
|---|---|---|
| **A. Two-method consumer interface through `Deps`, typed requests** | Pinned method set untouched; consumer-defined; small | A request type with scheme-specific fields |
| **B. A method per scheme on the interface** | Compile-time entry selection | An interface that grows with every format, contrary to the `go` skill's small-interface rule |
| **C. Handlers import scheme packages directly** | No indirection | A handler holding a signature primitive, the boundary this spec exists to hold |

Why this is a judgment call: it shapes an interface the re-open will inherit.

Rechecked on Fable 2026-10-01: confirmed, with one consumer added. `format-handler-interface.md`
as planned on Fable carries the `Verifier` in `Deps` and holds the boundary by an `internal/`
allowlist (its AC15), verified at this sha. The verdict and anchor-class read a virtual merge
takes is the index runtime's, through the read interface `internal/index` declares, never a
`Deps` entry and never a handler's (its "The scheduled re-open"), which this record's "one more
consumer interface for the re-open" now names (Design, "How a handler reaches the verifier").
The CMS candidates are cited by module path. Fable follow-up 2026-10-01: that read interface is
`Admission` (`signing-service.md`, "Package shape"), and the adoption commit's call to the
anchor-class classifier takes the same consumer-owned shape through a one-method interface
`internal/proxy` declares (`proxy-cache.md`, "The anchor class of an adoption"), so no package
of the proxy or index layer imports `internal/verify` for either.

### Resolved: identity policies and the credential trust policy (was Q10)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: identity-policy entries
are `(issuer, subject)` with a bounded glob, or a reference to a robot whose
`credential-management.md` trust policy derives the expected identity; an upload made with an
exchanged token must attest under the same robot's identity. Folded into "Identity policies and
the credential-management link" and AC28.

Accepted cost: an issuer-specific mapping from trust-policy claims to certificate identity, kept
as data beside the issuer list and extended per issuer.

| Option | You get | It costs |
|---|---|---|
| **A. Reuse the trust policy; bind exchange and attestation to one robot** | One issuer model; the exchange-as-A-attest-as-B hole closed | An issuer-specific claim-to-identity mapping |
| **B. A separate identity model for attestations** | Independence from credential-management | Two descriptions of the same OIDC fact that will drift, and no binding between the token and the attestation |

Why this is a judgment call: it couples two security surfaces so they cannot disagree.

Rechecked on Fable 2026-10-01: confirmed and amended in its cost. The accepted cost said the
claim-to-identity mapping is "data beside the issuer list"; `credential-management.md` as
planned on Fable splits the issuer URL (data) from the issuer profile (`github`, `gitlab`,
`generic`: code, because the required-claim rule is a security judgment), and the mapping lives
on the profile row. A `generic`-profile robot derives no certificate identity, so an
`identity-policy` entry naming one is refused at the trust-set write instead of matching
nothing (Design, "Identity policies and the credential-management link"; AC28).

### Resolved: recorded versus enforcing verdicts at ingest (was Q11)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: a verdict refuses a write
only where the ecosystem defines the upload as carrying its own proof (PEP 740, Swift validity,
Galaxy `attach`); everywhere else it is recorded and policy decides at resolution. Folded into
"When verification runs" and AC21.

Accepted cost: a hosted Maven artifact with a bad `.asc` is stored, and only a policy rule stops it
from being served.

| Option | You get | It costs |
|---|---|---|
| **A. Enforce at ingest only where the ecosystem does** | One enforcement point (policy) for everything else; matches every format spec's "recorded, not enforced" | Bad signatures can be stored |
| **B. Refuse every failed verdict at ingest** | Nothing bad is stored | Two enforcement points; a client that does not require signatures is refused for a signature it does not care about; retroactive trust changes cannot be expressed |

Why this is a judgment call: it fixes where refusals happen, which every format's conformance
case then depends on.

Rechecked on Fable 2026-10-01: confirmed, fold extended. RubyGems' `gem push --attestation`
joins the enforcing list on the same ground as PEP 740: rubygems.org itself refuses `422`, so
the ecosystem defines the upload as carrying its own proof (Design, "When verification runs";
AC21, AC32).

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-27 | ab22b0d | authoring pass: grounded first draft, not a review | Gathered the requirements of 26 citing format specs, `supply-chain-policy.md`'s consumer interface and AC15, `project-charter.md`'s step 4b, the boundaries `management-api.md`, `credential-management.md`, `data-model.md`, `proxy-cache.md`, `format-handler-interface.md` and `auth.md` already settle, and consequences items 3, 2, 9 and the open items and theme 4 named in the brief. Grounded prior art fetched this run: the Sigstore client specification and `TrustedRoot` protobuf, the root-signing TUF repository, `sigstore-go` and its `VirtualSigstore`, cosign's storage specification and keyless flags, PEP 740, CEP-27, npm's `audit signatures` conventions, NuGet's trusted-signers model, zot's stored verification results, Harbor's presence-based deployment security, Gitea's silence, pulp_ansible's signature serializer and ansible-galaxy 2.18's client source; Artifactory's reachable page covered Distribution only and Sonatype's and Pulp's pages answered 404, recorded as silence. Design: two products (integrity results returned, verdicts stored), a verdict keyed by repository, digest and scheme outside the format model and not a mark root, revisioned per-repository trust sets whose sources write and whose verification only reads, ingest and cache-commit timing with fail-closed re-evaluation, a two-method `Verifier` through `Deps`, the entry catalogue for every requested scheme, the vouched-provenance versus client-checked-signature rule, per-format positions including PEP 740 in-upload verification, Galaxy verified attachment and NuGet trust and revocation. Eleven questions written in decision shape and adopted under the standing delegation. 28 criteria, each with a Test Plan row; `node scripts/check-spec.js` run against this file with zero failures. Stays draft; awaits an independent review. |
| 2026-09-28 | 3a82b21 | cross-spec reconciliation of the foundation authoring wave. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` targeting this file verified against the source spec's current text before applying. From `async-operations.md` (item 6) and `deployment.md` (items 2 and 9): the re-evaluation worker is the `verify.reevaluate` job kind enqueued in the trust-set revision's transaction with exclusivity key `verify:{repository}` and a checkpoint per page, its bound `async.kind_limits` `verify.reevaluate: 4` (the `verify.workers` row removed; deployment's resolved worker-limit decision, was Q11 there), the two refreshes the `verify.tuf_refresh` and `verify.revocation_refresh` schedules with `verify.sigstore.refresh` and `verify.revocation.refresh` as their periods, disabled under `proxy.offline`; AC3 and AC22 rewritten, the four remaining keys cited to deployment's inventory. From `management-api.md`'s reconciliation (item 5): trust and verdict reads are `pull`, trust writes and import admin, the routes cited to its endpoint table and AC28 (AC27 and its row). From `repository-lifecycle.md` (item 10): a new "Repository lifecycle" paragraph and AC29 (rename changes nothing; deletion keeps records and cancels the pending job; tombstone drops trust set revisions, never verdicts). From `observability.md` (item 14): `verify_verdicts_total{scheme,state}`, `verify_duration_seconds`, `verify_reevaluation_pending`, the `VerificationFailed` alert via `telemetry.Alert`, `// gate:` on `bench_test.go` (AC26, AC27). From `upstream-adapters.md` (item 8) and `signing-service.md` (item 8): per-upstream trust anchors are the remote's trust set; the `openpgp` and `raw` schemes answer debian item 6 and hex item 5; signing-service's self-check consumes `Verifier` with public material. Wording: every "sibling consequence" now a citation of the applied criterion (`data-model.md` AC34, `storage-and-gc.md` AC21 and AC22, `proxy-cache.md` was-Q15 and AC20, `conformance-harness.md`'s `trust` key, `catalogue.md` AC7 in AC24's row); the per-format revisions of `npm.md`, `pypi.md` and `ansible-collections.md` are still queued and are cited as such. Already done at authoring: supply-chain fold item 3, format-management fold item 2, the Open items and theme 4. `node scripts/check-spec.js` on this file: zero failures. Stays draft; awaits an independent review. |
| 2026-09-28 | 3135d95 | closing reconciliation sweep on Opus: cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` targeting this file from "From format batch 3 reconciliation" through the latest section, plus earlier items the progress log did not show applied, verified against the current text of `hex.md` (its verification-entry item 5, resolved trust-anchor decision was Q9, AC17, AC21), `npm.md` AC22, `pypi.md` AC14 and AC18, `ansible-collections.md` AC11 and `oci.md` AC14. Applied: format batch 5 item 2 (a `Raw RSA-SHA512` entry in the catalogue, an RSA key type under `raw-keys`, `raw-rsa-sha512` among `Check`'s integrity entries, a Hex paragraph under "Per-format positions", Hex named among integrity results, the Hex row split out of the "Nothing" row and qualified to mean nothing on artifacts; new AC30 with a Test Plan row shared with `hex.md` AC17 and AC21; Phase 4); format batch 1 item 7 (the npm, PyPI and Galaxy paragraphs and the OCI context row cite the landed criteria instead of 'queued'). Integrity, not verdict, follows `hex.md`'s own design and the existing rule that a signed index whose role is to make its checksums trustworthy is checked before commit; no question raised. Found already done: management-api reconciliation 5, charter reconciliation 7, credential-management and repository-lifecycle reconciliation 3. `node scripts/check-spec.js` zero failures on this file. Stays draft. |
| 2026-10-01 | 9c59120 | Fable recheck: full review (claim verification at HEAD of every sibling citation: `supply-chain-policy.md`'s verdict-source paragraph and AC15; `format-handler-interface.md`'s `Deps` paragraph, AC15 and its "The scheduled re-open" anchor-class sentence; `signing-service.md`'s "The produce/verify boundary", was-Q5, was-Q10, was-Q20 with its option D, AC17, AC36, Phase 5; `data-model.md`'s non-root row, the cache-scoped record, AC44, AC45; `proxy-cache.md`'s completion-only mode, was-Q15, AC20, the adoption commit and AC25; `credential-management.md`'s OIDC exchange, issuer profiles and the identity-source paragraph, AC13; `async-operations.md`'s kind table, `async.kind_limits`, AC14 to AC16; `deployment.md`'s `verify.` row and `HTTPS_PROXY`; `observability.md`'s `verify_*` series, `VerificationFailed`, the bench gate; `management-api.md`'s trust and verdict rows and AC28; `conformance-harness.md`'s `trust` key and AC17; `storage-and-gc.md` AC21, AC22; `repository-lifecycle.md`'s step 11; `auth.md` AC9 and the four object kinds; `project-charter.md` step 4b and AC12; `upstream-adapters.md`'s trust-anchor rows; `catalogue.md` AC7; the format criteria cited (`oci.md` AC14, `npm.md` AC22, `pypi.md` AC14 and AC18, `ansible-collections.md` AC11 and was-Q7, `hex.md` was-Q9, AC17, AC21, `conda.md` AC22, `swift.md` AC14, `cpan.md` AC26, `rubygems.md` was-Q8, AC26, AC27); the tree still holds only the stub `main.go`, so no code claim was testable) + adversarial lens at full strength on the cloud-authored whole + go-spec-reviewer inline (its codebase step vacuous) + constitution + re-examination of the eleven adoptions made without Fable | Brought current first: the four open consequences against this file applied and verified against their sources (signing-service recheck item 11, credential-management recheck item 5, rubygems item 6, data-model recheck item 2), consistent with `format-handler-interface.md`'s Fable clarification that the verdict and anchor class are the index runtime's reads and never a `Deps` door. Verdicts: Q4, Q5, Q6 confirmed; Q1 amended (superseded derived from the revision column, no mass mark; the overtaken job ends at its checkpoint; the window's true breadth stated: every revision, additive included, since no entry kind is monotone); Q2 amended (no-entry-of-kind `Verify` answers `absent`, `untrusted-key` needs an entry of the kind, which is what makes anchor class `none` admissible under `signing-service.md`'s rule); Q3 amended (the sources had no lawful home given AC22: `internal/trustsource` for the keyserver import inside its request, the two refresh schedules and the pinning write; the import is also a subkey refresh, the CPAN cure); Q7 and Q11 amended in fold (RubyGems); Q8 amended (the refresh had nothing to fetch: a per-chain revocation want-list, its change a revision); Q9 amended (fourth consumer named; CMS candidates by module path); Q10 amended (the mapping is `credential-management.md`'s profile row, code; a `generic`-profile robot refused at the trust-set write, AC28). None superseded; `auth.md` AC10 untouched. Adversarial findings folded: the three-kinds-versus-no-egress contradiction, the mass-update mark, the unfetchable CRLs, the keyless-remote `failed` that the admission rule would never admit, AC26's unstated second read on the proxied path, the offline import's answer. New AC31 (anchor class) and AC32 (RubyGems), AC1 to AC4, AC21, AC22, AC26, AC28 extended, AC2 reworded to its end state; `covers` gains `internal/trustsource/**`. Sibling consequences reported to the orchestrator, not applied. 32 criteria, each with a Test Plan row; eleven questions resolved, zero open; `node scripts/check-spec.js` zero failures; `fable_recheck` cleared. draft -> planned. |
| 2026-10-01 | 5303c57 | Fable follow-up: queued cross-spec items since the recheck | A review, narrower than the recheck: the whole of `agents/spec-loop/consequences.md` read, every item targeting this file after the 9c59120 row collected (three) and each verified against the current text of its source spec and of this one, then read adversarially against the rest of this spec. Applied: data-model follow-up item 2 (the Context paragraph no longer says data-model's row "still says superseded marks"; it cites the row and the "Verification records" section as they now stand, the revision column, the want-list and the `Job`); signing-service follow-up item 4 (the index runtime's read is named `Admission` and cited to "Package shape" in "Anchor class", "How a handler reaches the verifier", AC31, Phase 1 and the was-Q9 record; `format-handler-interface.md`'s "The scheduled re-open" verified to name the same interface); proxy-cache follow-up item 3 (the adoption commit reaches the classifier through a one-method interface `internal/proxy` declares and the composition root satisfies, verified against "The anchor class of an adoption"; stated in "Anchor class", "How a handler reaches the verifier", AC31, Phase 1 and the was-Q9 record, no new behaviour, so no new criterion: `proxy-cache.md` AC25 holds the adoption side and AC31's row the class). Stale text found by the sweep and fixed on the same lines: the keyserver-import cure cited `cpan.md` AC26 where the cure is its AC25 (AC26 is the merged directory that lists the remote's entries again); the lifecycle paragraph said the queue side of deletion was "queued for `async-operations.md`", which carries it as `CancelByRepository` inside the deletion transaction (its AC28). Nothing declined; no adoption. Credential-management's generic-profile refusal, the management-api trust routes, async's `internal/trustsource` registration and deployment's proxy settings re-verified as carried. 32 criteria, each with a Test Plan row; zero open questions; `node scripts/check-spec.js` zero failures. Stays planned. |
| 2026-10-01 | ebfe85c | Fable follow-up: queued cross-spec items since the recheck (round 3) | A review, narrower than the recheck: the whole of `agents/spec-loop/consequences.md` read, every item targeting this file after the 5303c57 row collected (the round-2 `proxy-cache.md` follow-up's item 2, carried by the "Foundation follow-up round 3" entry; the round-3 `data-model.md` follow-up's item 1; the `cpan.md` recheck's standing cure, re-verified; the arch recheck's item 1, superseded in wording by the proxy-cache item), every earlier item naming this file re-found applied, and each verified against the current text of its source (`proxy-cache.md` "The anchor class of an adoption", "A signature the wire makes optional", the regression, paired-set and adoption-commit bullets, the Obligation section, AC24, AC25 and the was-Q23 record; `data-model.md` the cache-scoped record's bullet, its non-root row and AC44 as the round-3 follow-up left them; `cpan.md` "What artifact verification must provide", "The proxied path", "Virtual repositories", the removal table, AC25, AC26 and the was-Q18 record; `arch.md` AC17 and AC18 as aligned at 77844ef), then read adversarially against the rest of this spec. Applied, three of three. (1) Proxy-cache round-2 item 2 (its was-Q23, owner-facing there, AC25): the classifier's first input is the hook as it applied, not as declared; a `Verify` over a paired set's optional member or a document's optional signature segment that the upstream served without did not apply, since no `Verify` call was made, so the class is `none` (or `integrity` where a `Check` gates the set) with verdict `absent` whatever keys the remote holds, which keeps never-signing upstreams admissible under `signing-service.md`'s rule; `internal/proxy` reduces the declaration to the applied hooks before the call, so neither the declaration nor the fact reaches `internal/verify`; folded into Scope, "Anchor class", AC31, its Test Plan row (`anchor_class_test.go` gains the unserved-member case and asserts the input type carries no declaration and no fact; `cache_freshness_test.go` the unserved-member case with the fact `unsigned`; `adoption_test.go` named as where the fact's comparison and the regression are asserted, in `proxy-cache.md` AC25's row and no file of this spec) and a dated note on the was-Q3 record. This supersedes the arch recheck's item 1 wording, as the queue says. (2) Data-model round-3 item 1 (its AC44): the served-or-not fact cited as the cache-scoped record's fourth field beside the class, written by the adoption from the handler's adoption check and compared by the next adoption in `internal/proxy`, never a classifier input and never what `Admission` returns, since the admission rule is stated over the class and the verdict ("Anchor class", AC31 and its row). (3) The cpan recheck: the keyserver-import cure re-verified against `cpan.md` at HEAD; its "Sources" sentence here (a re-import of a held fingerprint brings the subkeys the keyserver has since seen; after it the next re-evaluation turns the directory's `failed` into `verified` and the merged directory lists the remote's entries again) matches that spec's "Virtual repositories", AC25 and AC26, which cite AC23 and AC25 here; no change needed. Found while verifying: `cpan.md` AC25 already cites AC31 here for a `CHECKSUMS` carrying no armour reading `none` and `absent`, a case AC31 did not state until this round, so item 1 also makes that citation true. Declined: none. Adversarial reading of what changed: the unserved case produces no verdict record, so the source answers `absent` by construction and AC1's `untrusted-key` rule (an entry of the kind exists and a signature fails) is untouched, since no signature exists; "Two products" already defines `absent` as the upstream serving none; the apk and TUF entries stay integrity-gating calls that record a verdict where the segment or chain is present, and a format whose wire requires its signature (Debian's envelope, Hackage's chain) declares no optional member, so its absence stays the integrity failure at fetch; nothing here decides whether a withdrawal is a regression, which stays `internal/proxy`'s rule; no handler reaches the class, the fact or the verdict. No question raised or adopted; `auth.md` AC10 untouched; no em-dashes on touched lines. `node scripts/check-spec.js` on this file: zero failures. 32 criteria, each with a Test Plan row; zero open questions. Stays planned. |
