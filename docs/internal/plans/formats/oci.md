---
status: planned
status_description: "Fable follow-up 2026-10-08 at 91c6bc0, stays planned: the tolerant-case table gains its overlay-case column and a machine-readable copy beside the exception list that the runner holds under conformance-harness.md's resolved tolerant-case decision (was Q9) and AC21, with the per-tag review obligation stated beside the table and AC1 and AC18 citing the harness; no wording about exception rows found to recite, the catalogue row cited as queued; no adoption. 19 criteria, zero open questions. Earlier: Planned by the Fable gate review of 2026-10-08 at 4f929c7: the two queued items applied (the revalidation probe on the tag fetch, AC6; Homebrew 7.0.6 as a client under a /v2/-bearing artifact domain, Q9 adopted, AC13), the Opus adoption Q8 rechecked and confirmed, and the authoring re-grounded against the distribution spec and the v1.1.1 conformance sources: the suite's tolerant cases get a strict overlay (AC18), every refused write renders 405 UNSUPPORTED with docker's output captured (AC19), the fetch modes and deletion semantics corrected, zero open questions, 19 criteria each with a Test Plan row. Phase 1 waits on credential-management.md Phase 1 landing. Earlier: reconciled 2026-09-28 at a6d72b3 with the foundation wave (not a review): Q8 adopted under the owner's standing delegation (the first component of an OCI name is the registry repository, the rest the image, so one remote covers a whole upstream registry; AC17); GET /v2/ declared a descriptor; Capabilities with Virtual and Rename plus the lifecycle, read-only-remote, rename and refresh cases (AC15); the handler's half of Cosign discovery and verification (AC14, sharing artifact-verification AC6); the proxied path on the distribution adapter and the Docker Hub profile (AC16, sharing upstream-adapters AC25); the suite credential minted through credential-management's POST /api/v1/tokens with multi_repository: true (its AC7); WriteRefusal and the pending binding-table row filled by AC12's capture; no management kinds and no retirement, stated. Earlier: reconciled 2026-09-26 at da0aecd (the opt-in multi-repository suite credential, AC11-AC13); folded 2026-09-26 at 4d1aeb1 (Q3-Q7 adopted, AC1 rewritten, AC7-AC10 added). Zero open questions; 17 criteria, each with a Test Plan row; stays draft until a gate review, with Phase 1 waiting on credential-management.md Phase 1."
description: "Spec for the OCI distribution format - the hardest protocol with the strongest oracle, implemented as the harness's proving ground rather than to replace Harbor."
author: michielvha
goal: "Pass the official OCI distribution-spec conformance suite with zero skips, proving the harness and the shared layers against a standards-body gate."
priority: "high"
issue: 7
created: 2026-09-21
covers:
  - "internal/format/oci/**"
  - "conformance/oci/**"
---

# Plan: OCI distribution format

Container images, Helm charts as OCI, and arbitrary OCI artifacts, per the OCI distribution
specification.

## Context

OCI is implemented here for a specific reason, and it is not that the world needs another
container registry - Harbor is free, Apache 2.0, excellent, and two lines of Compose away.

It is implemented because **the OCI distribution spec ships an official conformance suite**.
That makes it the only format where the pass/fail gate is written by the standards body rather
than inferred from client behaviour. It is simultaneously the hardest protocol in the roadmap
and the one with the strongest oracle, which is exactly what a harness needs to be proven
against.

It also forces the shared layers to be right early: chunked and resumable uploads, content
addressing, and a separate token-based auth flow are all OCI requirements that later formats
benefit from having solved.

## Scope

**In scope:** the distribution spec's pull, push, content discovery and content management
surfaces; chunked and resumable blob upload with bounded session lifetime; cross-repository
blob mount that reveals nothing about repositories the client cannot read; manifest lists; the
referrers API; and the OCI token authentication flow, with registry tokens as the `docker login`
credential; the per-route addressed objects `auth.md`'s pattern scopes evaluate, carried through
the token endpoint; the wire rendering of a shared policy refusal; and the catalogue's named OCI
clients beside Docker (Podman, ORAS, Helm-as-OCI) on both paths.

Also in scope, each owned by a foundation spec and consumed here: the handler's half of
Cosign signature discovery and verification (Design, "Signatures and the verifier"; AC14); the
`Capabilities()` declaration with `Virtual` and `Rename` supported, and the lifecycle,
read-only, rename and cache-refresh cases the shared specs place under `conformance/oci/`
(AC15); the proxied path over the `distribution` upstream adapter and the preconfigured Docker
Hub profile (AC16); and the split of an OCI name into the registry repository and the image
inside it, which is what lets one `remote` cover a whole upstream registry (the resolved
name-split decision below, was Q8; AC17).

Added by the Fable gate review of 2026-10-08: the **strict overlay** on the pinned suite's
tolerant cases, which pass at v1.1.1 whether or not the surface they name is implemented
(Design, "The official suite"; AC18), whose table the runner holds through a machine-readable
copy beside the exception list under `conformance-harness.md`'s resolved tolerant-case decision
(was Q9) and its AC21, added by the Fable follow-up of the same day; the wire rendering of
every write this handler refuses on a shared layer's decision, a `read_only` repository, a
`remote` or `virtual` target, and a blob a manifest still references, as `405` with
`UNSUPPORTED` (Design, "Deletion and the read-only wire"; AC19); the **revalidation probe**
declared on the proxied tag fetch, the one
`HEAD` the proxy layer ever sends (`proxy-cache.md`'s resolved HEAD decision, was Q24, and its
AC32; AC6); and **Homebrew 7.0.6 as an OCI client** under a `/v2/`-bearing
`HOMEBREW_ARTIFACT_DOMAIN`, on both paths (the resolved brew-client decision below, was Q9;
AC13).

**Out of scope for v1, and owned elsewhere:** replication between instances is
`foundation/replication.md`'s, built at charter step 10, and vulnerability scanning of image
layers is `supply-chain-policy.md`'s component inventory (its AC10); neither is reimplemented
here. Signature verification is no longer a gap: `foundation/artifact-verification.md` owns the
Cosign entry, its AC6 is the criterion, and what this handler contributes is stated in Design.

## Design

### Token auth is a separate subsystem

The auth model is the part most likely to be underestimated. OCI clients do not perform an OIDC
browser flow; they follow a `WWW-Authenticate` challenge to a token endpoint and receive a
scoped token carrying access claims. That is a distinct subsystem from the platform's
user-facing SSO and must be specced as one, not assumed to fall out of existing token handling.

The handler boundary rules make the split concrete: a handler never implements its own auth
check (`format-handler-interface.md`, and the standing rule in `CLAUDE.md`), so token issuance
and validation are a shared auth-layer service. The OCI handler owns rendering the
`WWW-Authenticate` challenge and the scope grammar (`repository:<name>:<actions>`), which are
wire format. The auth foundation it rests on is no longer a gap: `foundation/auth.md` settles
repository-plus-action scopes, the OCI token flow's signing and expiry obligations, and the
bounded revocation window an already-issued token carries.

**The `docker login` credential is a registry token** (adopted 2026-09-26, the resolved
docker-login-credential decision below). A non-interactive `docker login` presents the
scoped, revocable registry token `auth.md` already defines for machine identity - the
personal access token of the adopted option, not a new credential kind - as the password of
the Basic credential it sends to the token endpoint, and the username is not an authentication
input, exactly as `auth.md`'s Basic-form semantics state for pip. An SSO-only user, who has no
password at all, mints such a token and uses it the same way. Two consequences are derived
rather than chosen. First, **the token endpoint never issues a refresh token**: the token
specification makes one optional, and a refresh token would be a second long-lived credential
outside `auth.md`'s hash-only storage and revocation model, so a revoked registry token is
refused at the client's next exchange and its reach ends with the already-issued access
token's lifetime (`auth.md` AC5). Second, **token issuance, listing and revocation are on this
format's critical path**: OCI cannot ship before a user can obtain the credential `docker
login` needs, so Phase 1 depends on that surface. It is cross-format (npm, pip and Maven present
the same tokens), so it is not specced here: `auth.md`'s resolved token-management decision (was
Q21) homes it in `docs/internal/plans/foundation/credential-management.md`, which now exists and
owns it: issuance, listing, rotation and revocation under `POST /api/v1/tokens` (its Phase 1,
built at charter step 2), the expiry-warning criterion (its AC5) and the robot-account principal
(its "Robot accounts", AC9). That spec is `planned` since its Fable recheck of 2026-10-01, so
Phase 1 here depends only on its Phase 1 landing first.

Two shared rules reach this subsystem's wire and are cited rather than re-decided. The `401`
challenge and the existence rule's `404` are written by `auth.md`'s layer with the format's
challenge, not by this handler (its AC32), and every response that layer writes itself, the
token endpoint's JSON included, carries `Cache-Control: private, no-store` (its resolved
refusal-cacheability decision, was Q27, and AC38); the handler sets no `Cache-Control` of its
own on them. And a registry token is also accepted **presented directly as `Bearer` on the
`/v2/` routes**, without the challenge and exchange, because that is `auth.md`'s universal
Bearer form (its presentation-forms table, where `brew` is listed for exactly this): Homebrew
never follows a `WWW-Authenticate` challenge and sends `HOMEBREW_DOCKER_REGISTRY_TOKEN` as a
Bearer on every OCI-shaped request (`homebrew.md`, "Authentication"; `auth.md`'s `brew` client
row, captured), which is what makes it a client of this format at all (the resolved brew-client
decision below, was Q9; AC13).

A registry token authorizes one repository by default, and the token service grants only the
subset of a multi-repository scope request the token covers (`auth.md` AC26). That default is
what makes a real `docker` client's cross-repository mount fall back (see "Cross-repository
mount"). A token spanning two repositories exists only by the explicit opt-in `auth.md` adopted
for this format's suite (its resolved two-repository credential decision, was Q22, and AC29),
with each repository named by identity and never by pattern, and that opt-in token is what the
suite credential below is.

### The official suite, pinned, and what zero skips actually buys

The four workflow categories in AC1 are those of the v1.1.x suite: Pull, Push, Content
Discovery and Content Management, enabled by `OCI_TEST_PULL`, `OCI_TEST_PUSH`,
`OCI_TEST_CONTENT_DISCOVERY` and `OCI_TEST_CONTENT_MANAGEMENT` (conformance README at tag
v1.1.1, read 2026-09-22). The suite on the repository's main branch has since been restructured
around different variables and categories, so the suite itself is **pinned to a tagged
release**, exactly as client containers are pinned by digest (`conformance-harness.md` AC4),
and a suite upgrade is a deliberate, separately reviewed change rather than an ambient one.

"Zero skips" is a stronger claim than "the suite is green": the suite auto-skips surfaces a
registry declares unsupported or leaves unconfigured, and it can hide disabled workflows from
its report entirely (`OCI_HIDE_SKIPPED_WORKFLOWS`, which the harness never sets). Meeting AC1
therefore means every workflow is enabled and every optional surface is implemented - blob and
manifest delete, cross-repository blob mount (`OCI_CROSSMOUNT_NAMESPACE`), and the referrers
API among them. Manifest lists and the referrers API are exercised through AC1's pinned suite;
if a pinned release turns out not to cover a surface this spec puts in scope, that surface gets
bespoke harness cases rather than silent non-coverage.

**Zero skips is still a soft gate at v1.1.1, and the strict overlay is what closes it.** Read
against the suite source at the v1.1.1 tag (the Fable gate review of 2026-10-08), several cases
are written to pass on either branch of an optional surface, with no skip and no failure on the
tolerant branch: the suite accepts a `400`/`405` where a registry disallows tag deletion, a
`404` on the manifest-by-digest delete and a `200` on the read of a "deleted" manifest, a `405`
on blob deletion (after which the deleted-blob read is guarded by `blobDeleteAllowed`, the one
tolerance that does surface as a skip), a `202` on the mount of an existing blob, a referrers
query answered without `OCI-Filters-Applied` (the full unfiltered list, with a warning printed
to stderr), a manifest with no layers refused with the same warning, and a single-`POST`
monolithic upload answered `202` instead of `201`. The `Warn` helper prints to stderr and
reaches no report, so a run can be green with every one of those surfaces missing. AC1
therefore gates the suite's own verdict, and **AC18 asserts the strict branch of every tolerant
case with a scripted client**, listed here so an upgrade of the pinned tag re-derives the list,
each entry naming the **overlay case** in `conformance/oci/strict_test.go` that closes it:

| Tolerant case (v1.1.1) | What it accepts | What AC18 requires | Overlay case in `strict_test.go` |
|---|---|---|---|
| Content Management: "DELETE request to manifest tag should return 202, unless tag deletion is disallowed (400/405)" | `202`, `400` with `UNSUPPORTED`, or `405` | `202`; the tag gone from the tag list; the manifest still served by digest | `TestStrict/TagDelete` |
| Content Management: "DELETE request to manifest (digest) should yield 202 response unless already deleted" and "GET request to deleted manifest URL should yield 404 response, unless delete is disallowed" | `202` or `404`, then `404` or `200` | `202`, then `404` with `MANIFEST_UNKNOWN`, and every tag that pointed at it gone | `TestStrict/ManifestDeleteByDigest` (two entries in the copy, one per suite case, both naming it) |
| Content Management: "DELETE request to blob URL should yield 202 response" | `202`, `404` or `405` | `202` for an unreferenced blob, then `404` with `BLOB_UNKNOWN` (the suite's "GET request to deleted blob URL" case must run, never skip) | `TestStrict/BlobDelete` |
| Push: "POST request to mount another repository's blob should return 201 or 202" | either | `201` under the suite credential, which the exception list's third entry already requires | `TestStrict/MountExisting` |
| Push: "POST request with digest and blob should yield a 201 or 202" | either | `201`, the blob readable at the `Location` | `TestStrict/MonolithicPost` |
| Push: "Registry should accept a manifest upload with no layers" | `201`, or anything else with a warning | `201` | `TestStrict/EmptyLayerManifest` |
| Content Discovery: "GET request to existing blob with filter should yield 200" | a filtered list with `OCI-Filters-Applied: artifactType`, or the unfiltered list with a warning | the filtered list and the header | `TestStrict/ReferrersFilter` |

**The table has a machine-readable copy, and the runner holds it.** Under
`conformance-harness.md`'s resolved tolerant-case decision (was Q9) and its AC21, this table is
carried in the machine-readable copy under `conformance/oci/` beside the exception list's, one
entry per suite case, each naming the suite case by the title the suite reports and the overlay
case by the name `go test` reports for it (the subtest names above, which is why
`strict_test.go` is one named case per entry rather than one file-level verdict). The runner
fails the AC1 run when an entry's overlay case did not run and pass in the same run, exactly as
a structural exception's partner must, and when an entry names a suite case absent from the
run's results, so a pinned-tag upgrade that renames or drops a tolerant case fails loudly
instead of orphaning an entry. Two consequences for the overlay follow. The overlay cases run
**in the same harness run as the suite**, after its four workflows have completed, each pushing
its own content under an image name of its own inside `OCI_NAMESPACE`, so they neither disturb
content the suite is still using nor pass vacuously in a run the suite never reached. And the
copy is derived from this table, never the reverse: an entry is added here first, reviewed as a
spec change like an exception entry, and the copy follows in the same change.

**The per-tag review obligation.** What the runner cannot see is a tolerant case this table
omits, because which cases are tolerant is a reading of the suite source that no result file
carries; that reading is this spec's obligation at every pinned tag, and it is the accepted
cost of the harness's decision. A change of the pinned tag is therefore a change to this spec,
reviewed as one, in which the suite source at the new tag is re-read end to end for cases that
pass on either branch of an optional surface (the reading starts from every use of the suite's
`Warn` helper and every assertion admitting more than one status, which is how the seven above
were found at v1.1.1), this table and its copy are re-derived from that reading in the same
change, and the Review Log row for the upgrade records what was read. A tolerant case found
between upgrades is added the same way, never by editing the copy alone.

Three suite variables are fixed by the harness for the same reason. `OCI_AUTH_SCOPE` stays
unset, so the suite's client exchanges the scope our `WWW-Authenticate` challenge names rather
than a scope the harness wrote, which is the only way the run exercises the challenge rendering
this handler owns. `OCI_DELETE_MANIFEST_BEFORE_BLOBS` stays at its default (`true`), the order
under which a blob delete follows the manifest's and meets an unreferenced blob.
`OCI_SKIP_EMPTY_LAYER_PUSH_TEST` is declared in the v1.1.1 `setup.go` and read nowhere, so it
guards nothing at this tag; the empty-layer case is the warning branch above, closed by AC18.

**Literal zero skips is unreachable at v1.1.1, for any registry.** Read against the suite's
source at the v1.1.1 tag (2026-09-26), several cases sit in complementary pairs whose members
are guarded by opposite conditions (`RunOnlyIf` and `RunOnlyIfNot` in `setup.go`, which call
`g.Skip`), so every configuration skips one member of each pair however complete the registry
is. That makes the recourse for a case that cannot pass or run for reasons outside our control
a present need rather than a hypothetical one, and it is settled as a **documented exception
list** (adopted 2026-09-26, the resolved conformance-exceptions decision below). The rule:

- AC1's gate applies to every case the pinned suite reports, and a skip or failure not on the
  list below fails the run.
- An entry is admissible in exactly two classes. **Upstream defect**: the case is wrong
  against the distribution spec, carrying a link to the upstream issue. **Structural**: the
  suite's own control flow makes the case unreachable for a registry in our declared
  configuration, cited against the suite source at the pinned tag. **A surface we have not
  implemented, or implemented wrongly, is never admissible**: that is our gap, and listing it
  is the soft gate this rule exists to prevent.
- Every entry carries a tracking issue number, which is what `CLAUDE.md` and
  `conformance-harness.md` AC5 require of any skip, and a named line in the table below. A
  structural entry also names its partner case, and holds only while that partner ran and
  passed in the same run - so an exception can never hide the behaviour its pair exists to
  test.
- **An entry that no longer applies fails the run**: an excepted case that runs and passes, or
  an upstream defect fixed at a newly pinned tag, forces its entry's removal, so the list only
  shrinks by evidence and never quietly outlives its cause.
- Adding an entry is a change to this spec, reviewed as one; a suite upgrade re-derives the
  list against the new tag's source.

The list at v1.1.1, all four entries structural:

| Case skipped (v1.1.1) | Why it cannot run | Partner that must run and pass | Issue |
|---|---|---|---|
| Pull: "Get tag name from environment" | Runs only when content is pre-seeded through `OCI_TAG_NAME`, `OCI_MANIFEST_DIGEST` and `OCI_BLOB_DIGEST`; the harness lets the suite push its own content, which exercises more of the registry | Pull: the "Populate registry with test ..." setup cases | to be filed before AC1 is first claimed; an entry without one fails the runner |
| Content Discovery: "Populate registry with test tags (no push)" | Runs only when `OCI_TAG_LIST` pre-seeds tags; same reasoning | Content Discovery: "Populate registry with test tags" | as above |
| Push: "Cross-mounting of nonexistent blob should yield session id" | Guarded by `RunOnlyIf(lastResponse.StatusCode() == 202)`, where `lastResponse` is assigned only by the mount case and by nothing after it (v1.1.1 `02_push_test.go`, verified 2026-10-08); ours answers `201`, because the suite credential can read the source (the resolved suite-credential decision below) | Push: "GET request to test digest within cross-mount namespace should return 200" | as above |
| Push: "Cross-mounting without from, and automatic content discovery enabled should return a 201" | Runs only under `OCI_AUTOMATIC_CROSSMOUNT=true`; a mount without `from` never mounts here (see "Cross-repository mount"), so the harness declares it `false` | Push: "Cross-mounting without from, and automatic content discovery disabled should return a 202" | as above |

**The suite credential spans two repositories.** The pinned suite configures one client from
`OCI_USERNAME` and `OCI_PASSWORD` and uses it both for `OCI_NAMESPACE` and for mounting into
`OCI_CROSSMOUNT_NAMESPACE` from it (v1.1.1 `setup.go` and `02_push_test.go`). The harness
therefore provisions, for AC1, a credential granting `pull`, `push` and `delete` on the namespace
and `pull` and `push` on the cross-mount namespace, and the mount-into-another-repository case
answers `201` under it (adopted 2026-09-26, the resolved suite-credential decision below). The
credential kind is settled: it is a registry token carrying `auth.md`'s explicit
multi-repository opt-in with both repositories named by identity (`auth.md` AC29), minted
through `POST /api/v1/tokens` with `multi_repository: true` (`credential-management.md` AC7,
whose Test Plan runs this suite with `OCI_PASSWORD` set to such a token) and provisioned
through the harness's `credentials` key. Under the name split below (was Q8), the harness sets
`OCI_NAMESPACE` and `OCI_CROSSMOUNT_NAMESPACE` under two different registry repositories, so the
mount really crosses a repository boundary. Pointing the cross-mount namespace at the namespace
itself, or listing the cross-mount cases as exceptions, would pass the gate without testing the
surface, and both are ruled out.

### Mapping onto the shared data model

This is the least-resolved part of the spec. OCI content is a reference graph: a tag names a
manifest, an image index references child manifests, manifests reference config and layer
blobs, and a referrers listing is a reverse lookup over manifests' `subject` fields. The shared
model (`data-model.md`) provides `Version -> File -> Blob` and deliberately never parses the
format-specific metadata document - which means GC cannot mark through references recorded only
inside that document, and the referrers API cannot be served from it either. Untagged child
manifests must nonetheless be pullable by digest and counted live by GC. The shared model
therefore carries a format-agnostic `Reference` edge between versions, with OCI's `subject`
recorded queryably: GC marks through it, and the referrers API is one indexed lookup rather than
something the core would have to parse manifests to answer. That was a `data-model.md` spec
change rather than a local workaround, settled there and here together.

### Chunked upload and the durability split

An OCI upload session is exactly the upload session `data-model.md` defines ("Upload sessions
and the upload scope"): one blob, one repository, ended by commit or expiry, with the upload URL
carrying its identity. There is no push session, and nothing in this handler may key on one:
the blobs of one push are independent sessions, and the manifest `PUT` that eventually names
them carries no session at all. What spans the gap from a blob's commit to that manifest - the
grace period and in-flight digest reads - is scoped to the repository, per the same definition.

AC4 asserts the client-visible half of resumable upload: interrupt, resume, complete with a
correct digest. Everything conformance cannot see - orphaned chunks from abandoned sessions, GC
eligibility during the commit-to-reference window, crash consistency - is owned by
`storage-and-gc.md` (its AC3, AC5 and AC6), and per the standing rule a client-level
conformance run is not evidence for any of it.

**Session lifetime is sliding idle expiry with an absolute cap** (adopted 2026-09-26, the
resolved session-lifetime decision below). The rule and its defaults - one hour idle, 24 hours
absolute, every continuation refreshing the idle period and nothing refreshing the cap - are
format-agnostic and live in `data-model.md`'s definition, since chunked upload is not OCI's
alone. What is OCI's is the wire answer: a `PATCH`, a status `GET` or a closing `PUT` against an
expired session returns `404` with the `BLOB_UPLOAD_UNKNOWN` error code (the distribution
spec's failure status for end-5, end-6 and end-13, and its code-3), exactly as for a session
that never existed, so the client restarts that blob. Committed blobs are unaffected by any
session's expiry: their survival until the manifest arrives is the repository-scoped grace
period's job, and an open session holds that grace open.

Three wire rules the gate review of 2026-10-08 found unstated. **A `416` does not end the
session**: an out-of-order or repeated chunk is answered `416` with `BLOB_UPLOAD_INVALID` and
the session's accepted range is unchanged, so the client's next in-order chunk continues it;
the pinned suite sends a retried chunk and then the correct one against the same session
("Retry previous blob chunk should return 416", then the second chunk), so a handler that
closed the session on `416` would fail AC1 without the reason being visible. **A session
belongs to the `<name>` it was opened under**: the same session URL presented under another
`<name>` answers `404` with `BLOB_UPLOAD_UNKNOWN`, since `data-model.md` makes the session the
repository's and a session id that resolves across repositories would be a second
cross-repository oracle. **The manifest `PUT` is a bounded, claim-free write**: its body is
spooled under the shared `management.publish_spool_limit` facility handed through `Deps`
(`management-api.md`'s resolved spool-bound decision, was Q20, and AC36) and a manifest over it
is refused `413` with `MANIFEST_INVALID`, the distribution spec's status for an oversize
manifest (its "Pushing Manifests", which asks registries to accept at least 4 MiB); the write
opens the shared write transaction through `Deps` and declares no retirement claims, because
no OCI coordinate is ever retired (`management-api.md`'s resolved claim-comparison decision,
was Q14); and a `PUT` of bytes identical to what the same tag already names completes `201`
with no new snapshot, the shape `management-api.md`'s resolved unchanged-publish decision (was
Q15) gives a write that changes nothing, so a CI job that re-pushes an unchanged image does not
grow the snapshot chain.

### Cross-repository mount

A mount (`POST /v2/<name>/blobs/uploads/?mount=<digest>&from=<other>`) asks the registry to make
a blob in another repository available in this one without re-sending its bytes. Under a shared
CAS the bytes are nearly always present somewhere, which is exactly why a mount answered "from
anywhere" would be an existence oracle across private repositories.

The rule (adopted 2026-09-26, the resolved cross-mount decision below): **a mount succeeds
(`201 Created`) only when the request's access token grants `pull` on the named source
repository and the digest resolves in that source** under `data-model.md`'s rule that a digest
resolves in a repository only through that repository's own content. In every other case - no
`pull` on the source, a source that does not exist, a digest the source does not hold though
another repository or the CAS does, a digest held nowhere - the registry answers exactly as for
a mount it cannot perform: `202 Accepted` with a fresh upload session, which the distribution
spec defines as the response for a registry "unable to mount the requested blob". Those
responses are indistinguishable from each other, so the mount reveals nothing about the
source. The fallback never answers `401` or `403` on the source's account, because a denial
naming the source is itself a signal.

A mount without `from` never mounts from anywhere: it always starts a regular upload session.
The spec permits a registry to treat `from` as optional and search for the blob, and that search
is precisely the cross-repository oracle this rule closes. The harness therefore declares
`OCI_AUTOMATIC_CROSSMOUNT=false`, which is what the fourth entry in the exception list records.

A successful mount is an upload session that opens and commits at once, so the mounted blob is
**in flight in the target repository** under the upload scope: resolvable by digest there,
protected by the target's grace until a manifest references it, and routed through the shared
reference-creation barrier like every other reference-to-an-old-blob path
(`storage-and-gc.md`'s write barrier already names cross-repository mount among them). The
target never depends on the source keeping the blob.

Two cases the rule left implicit (gate review of 2026-10-08). **A `from` naming a `remote`
resolves only against that remote's cached content and never fetches upstream**: a mount is a
push-path request, an upstream fetch on it would be a cache fill no reader asked for and, on
Docker Hub, a pull counted against the budget, so the "upstream-resolvable" half of
`data-model.md`'s resolution rule for a remote does not apply to a mount, and a digest the
remote has not cached falls back to `202` like any other miss. **A mount into a `remote` or a
`virtual` is a push into it** and is refused as one, `405` with `UNSUPPORTED` (Design,
"Deletion and the read-only wire"), before any source is consulted.

Accepted cost, visible to users: a client whose credential cannot read the source never
mounts, and pushes the bytes again - and since registry tokens are single-repository unless
opted into more, that is every client presenting a default token, so a real `docker` push
mounts only under a token opted into both repositories (AC8 exercises the default, AC1's suite
the opt-in). That costs bandwidth, not storage, because the CAS stores the re-sent content
once.

### Addressed objects and pattern scopes

`auth.md`'s pattern scopes narrow a credential within one repository by matching the object each
request addresses, and the format declares which object each route reports ("Pattern scopes"
there; `format-handler-interface.md` AC12, all four kinds). Under the name split (the resolved
name-split decision below, was Q8), the first component of an OCI `<name>` is the registry
repository and the scope's repository, and the remainder is the **image**, a package inside it.
OCI's named objects are therefore `{image}/{tag}`, with the image's own slashes kept: a pattern
confining a credential to one image is `{image}/*` (a tag has no `/`, so one segment covers every
tag), one confining it to a tag family across an image is `{image}/v1.*`, and one confining it
to a family across every image of the repository is `**/release-*`.

| Route | Object kind | Canonical object |
|---|---|---|
| `GET /v2/` (API version check) | descriptor, with no repository | - |
| `GET`, `HEAD`, `PUT` and `DELETE` on `/v2/<name>/manifests/<tag>` | named | `{image}/{tag}` |
| `GET`, `HEAD`, `PUT` and `DELETE` on `/v2/<name>/manifests/<digest>` | content-addressed | - |
| `GET`, `HEAD` and `DELETE` on `/v2/<name>/blobs/<digest>` | content-addressed | - |
| Upload sessions: `POST /v2/<name>/blobs/uploads/` (monolithic, chunked, and `mount` with `from`), and `PATCH`, `PUT` and status `GET` on the session URL | content-addressed | - |
| `GET /v2/<name>/tags/list` | none | - |
| `GET /v2/<name>/referrers/<digest>` | none | - |
| `GET /v2/_catalog` (not part of the distribution spec, and not served in v1) | none | - |

`GET /v2/` is the one route that names no repository at all: the distribution spec's version
probe, answered `200` with an empty JSON body to any authenticated caller and `401` with the
challenge otherwise. It is declared a **descriptor** (`auth.md`'s resolved name-free-document
decision, was Q23; `format-handler-interface.md` named this route as the Tier 0 candidate) with
an empty repository: its body carries no name, version or digest, so the sentinel test holds
trivially, and the central authorizer evaluates a repository-less descriptor against
authentication alone (`auth.md` AC32's repository-less clause: any verified credential passes
it whatever its scopes, a credential-less request receives the format's challenge, and a
failing credential an authentication error, never anonymous). The consequence that matters is that a token holding only a patterned
`pull` passes docker's first request and goes on to pull its tag, which AC11 exercises; under
`none` it would have been refused before reaching any manifest.

What that gives and costs, applying `auth.md`'s evaluation rules rather than re-deciding them:

- A token scoped to one image and tag pulls that tag, including its config and layer blobs and,
  for a multi-architecture index, its child manifests by digest, and pushes that tag through the
  ordinary blob-upload-then-manifest sequence; it is refused every other tag and every other
  image.
- A patterned `delete` deletes tags inside its pattern and nothing by digest: deleting a
  manifest by digest removes every tag pointing at it, which is why `auth.md` withholds the
  content-addressed allowance from `delete`.
- A patterned credential is refused the tag list and the referrers listing, because both
  enumerate names. A plain `docker pull` of a known tag never lists, so the common path is
  unaffected; a tool that discovers signatures or tags through a listing needs an unpatterned
  scope. Cosign's tag-convention discovery (`sha256-<hex>.sig`, "Signatures and the verifier"
  below) is a manifest-by-tag read, so it is named `{image}/sha256-<hex>.sig` and a pattern that
  admits an image's tags admits its signature tags too.
- The residual `auth.md` names is present here and stays named: a patterned `push` can upload an
  untagged manifest by digest, including a referrer whose `subject` points at another tag's
  manifest.
- The token endpoint carries the pattern into the JWT it mints (`auth.md` AC26), so exchanging
  a narrow credential never yields a repository-wide access token.

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines (its
enforcement inside the calls in `Deps`, a manifest or blob read refused for a condemned
coordinate or digest), the handler renders it in the distribution spec's own error envelope:
status `403` with an `errors` entry whose `code` is `DENIED`, the spec's code for access to a
resource being refused, and whose `message` names the policy and rule, or for content condemned
under the shared security-signal rule, names the signal. `403` rather than the existence rule's
`404`, because the caller is authorized to the repository and it is the content that is refused.
The handler writes it through the shared refusal writer `WriteRefusal` in `internal/format`
(`format-handler-interface.md` AC14), which is the module's only hand-written status line and
carries `supply-chain-policy.md`'s status-line phrase on HTTP/1.1 (its resolved status-line
decision, was Q10, and AC18); the status code and the `DENIED` body are this handler's choice,
the phrase is shared. This is the first format with that rendering, so it is where
supply-chain-policy's AC1 and AC2 cases live; whether the real client surfaces the message is
exactly what they, and AC12 here, prove, and the case's capture re-grounds this shape before any
later format copies it. `supply-chain-policy.md`'s table "When a refusal binds, per format"
carries OCI as `pending` until then: AC12's case replaces that row with the captured fallback
behaviour of `docker`, `podman` and `oras` in the same change (its AC20), and the harness refuses
to run the policy case while the row is still `pending` (`conformance-harness.md` AC26).

### Signatures and the verifier

Cosign signatures and attestations are ordinary manifests joined to their subject by the
`Reference` edge (Design, "Mapping onto the shared data model"), so a hosted push of one is a
write like any other and a proxied pull-through of one is a cache fill. Verifying them is
`artifact-verification.md`'s (its Sigstore entry and "Per-format positions", OCI), reached
through the `Verifier` consumer interface in `Deps` (`format-handler-interface.md` AC14), and
this handler contributes exactly two things. **Discovery covers both conventions**: the
referrers query over the `Reference` edge, and the tag convention `sha256-<hex>.sig` and
`.att`, because cosign without `--registry-referrers-mode=oci-1-1` still writes the tag and
reads it back. **On either path, the handler hands the subject digest and the signature
manifest's layers to the verifier**, which records the verdict against the subject digest; a
repository rule requiring an identity then refuses the unsigned or wrongly signed image through
the `DENIED` rendering above. The registry never strips or alters a signature manifest, on
either path. AC14 is this format's half of `artifact-verification.md` AC6 and shares its case.

Two wire facts the referrers API rests on. **A manifest `PUT` carrying `subject` is answered
with `OCI-Subject: <subject digest>`**, which the distribution spec makes the signal that the
registry processed the subject; a client that does not see it maintains the fallback referrers
tag (`<alg>-<ref>`) itself, so the header is what keeps cosign and ORAS on the referrers API
rather than writing index tags into the repository. **On a `remote`, the referrers listing is
an upstream document**: the `Reference` edge holds only what this registry has cached, so
`GET /v2/<name>/referrers/<digest>` on a remote is a fetch-and-cache of the upstream's own
referrers listing as mutable metadata under the metadata TTL, verified by the handler-supplied
verifier the proxied-path section names, and an upstream that answers it `404` (no referrers
API) is read through the fallback tag `<alg>-<ref>` instead, which is how AC14's proxied half
finds the signature through both conventions.

### Capabilities, lifecycle and management

`Capabilities()` declares proxy support `supported`, reference-implementation availability
`available`, `Virtual: supported` and `Rename: supported` (`format-handler-interface.md` AC13;
`repository-lifecycle.md` runs its virtual and rename cases against both Tier 0 handlers). The
lifecycle cases that spec and `management-api.md` place under `conformance/oci/`, all driven by
the real `docker` client, are `lifecycle_test.go` (a repository created through the API serves
from its first request in both modes, `repository-lifecycle.md` AC1), `readonly_remote_test.go`
(a `read_only` remote serves its cache with zero upstream requests and answers `not-found` on a
miss, its AC11 shared with `proxy-cache.md` AC23), `rename_test.go` (a renamed repository
serves under the new name and the old name answers `not-found`, its AC12, presence enforced by
`conformance-harness.md` AC26) and `refresh_test.go` (`POST .../refresh` on a remote makes the
next pull revalidate inside the TTL, `management-api.md` AC29 and `proxy-cache.md` AC24). AC15
gathers the OCI half of each.

**This format declares no management operation kinds.** Every write OCI has is on its own wire,
tag and manifest deletion included, so the handler implements none of `management-api.md`'s
`Operator` interface, that spec's cross-format reconciliation table carries no OCI row, and
`management-api.md` AC24 asks no `script`-driven case of it. **Nothing is retired**: deleting a
tag frees it for a later push, because a tag is a mutable pointer the distribution spec lets
clients move, and a digest is content-addressed and cannot be re-bound. OCI therefore writes no
`Retirement` record (`data-model.md` AC35 is a foundation criterion this format never exercises),
and what a `read_only` repository answers its pushes and deletes is this handler's rendering to
fix, stated next.

### Deletion and the read-only wire

OCI's writes are this handler's own wire routes, not bindings, so `repository-lifecycle.md`
AC10's `405 read-only` and `management-api.md` AC7's `405 repository-type` do not reach them as
stated: both specs scope a handler's own wire write out and leave its status and wording to the
format spec, fixed from what its client prints (`management-api.md`'s resolved central-refusal
decision, was Q16). The rendering here is one shape for every write the shared layers refuse:
**`405 Method Not Allowed` with an `errors` entry whose `code` is `UNSUPPORTED`**, the status
the distribution spec itself lists for a disallowed delete (end-9 and end-10) and its code-13
for an unsupported operation, with a `message` naming the reason (`read-only`, the repository
type, or the referencing manifest below). It applies to `POST`, `PATCH` and `PUT` on upload
sessions and the mount, `PUT` and `DELETE` on manifests and `DELETE` on blobs, on a
`read_only` `local` and on any `remote` or `virtual`. An upload session open when its
repository is frozen is not ended: its continuation answers `405` until `thaw`, and it resumes
if it has not expired meanwhile, because a freeze is a pause, not a loss. What `docker push`
prints on this answer is uncaptured and is exactly what AC19 captures; the status and code are
fixed here so that capture grounds the message, not the shape.

Deletion itself follows the shared model rather than a local choice. **Deleting by tag
removes the tag and nothing else**: the manifest stays served by digest and by every other tag,
which is what the distribution spec's separate tag-deletion route means and what the suite's
strict branch asserts (AC18). **Deleting a manifest by digest removes the manifest and every
tag pointing at it**, and its config and layer blobs are untouched: they remain resolvable in
the repository while another manifest references them or while in flight under the upload
scope, and otherwise leave only through `storage-and-gc.md`'s sweep after grace, never through
the delete. **Deleting a blob by digest** ends the repository's own hold on it, an in-flight or
otherwise unreferenced blob answering `202` and then `404` with `BLOB_UNKNOWN`; a blob a
manifest in the repository still references is refused `405` with `UNSUPPORTED` and a message
naming one referencing manifest's digest, because a `Snapshot` is immutable and a manifest
version's files are part of its content set (`data-model.md`, `Snapshot`), so the only write
that can remove a referenced file is the manifest's own deletion. The pinned suite never meets
the refused case (its default order deletes the manifest first), and `docker` never sends a
`DELETE`, so AC19 asserts it with a scripted client.

### The name split: repository and image

The distribution spec's `<name>` is a slash-separated path with no fixed depth, and this
registry's repository name is one path component (`repository-lifecycle.md`, "Name": the OCI
name-component grammar, which it states `formats/oci.md` must satisfy). The two meet by the
resolved name-split decision below (was Q8): **the first component of `<name>` is the registry
repository, and everything after it is the image**, a package inside that repository whose
versions are its manifests and whose tags are its named objects. `docker push
registry/{repository}/{image}:tag` is the shape, exactly Harbor's project and image model, and a
single-component name (`docker push registry/nginx:tag`) is refused `NAME_INVALID` rather than
silently creating a repository per image. A `<name>` whose first component is no repository the
caller can read answers exactly as an unreadable repository does under `auth.md`'s existence
rule, so the split leaks nothing.

The split is what makes a `remote` useful: a `remote` carries exactly one upstream
(`data-model.md`, `Repository`), an OCI upstream is a whole registry, and under the split one
remote bound to Docker Hub serves `{remote}/library/nginx`, `{remote}/grafana/grafana` and every
other image of that registry as packages of one repository, cached on demand, which is what
`proxy-cache.md` AC15's "exactly one enabled remote repository bound to Docker Hub" and
`homebrew.md`'s request for a remote over an upstream namespace both need. The upstream name is
the image path verbatim; Docker Hub's `library/` prefix for official images is not filled in, so
`{remote}/nginx` is a miss and `{remote}/library/nginx` a hit, because guessing a prefix would
make two names resolve to one image on some upstreams and not others.

### The proxied path

A tag-to-digest mapping is mutable metadata under the proxy layer's TTL rules
(`proxy-cache.md`); blobs and by-digest manifests are immutable and cache indefinitely. The
fetch mode is per fetch and this handler uses both of `proxy-cache.md`'s (its resolved
completion-only decision, was Q15, and AC20: a request carries a declared digest or a
handler-supplied verifier, never neither). **By-digest manifests and blobs carry a declared
digest** from the URL, stream-and-verify. **The tag fetch, the tag list and the referrers
listing carry a handler-supplied verifier**, because no digest is known before the fetch: the
tag fetch's verifier parses the body as a manifest or index, computes its digest and requires
it to equal the `Docker-Content-Digest` the adapter surfaced verbatim (`upstream-adapters.md`
AC14), and that digest is recorded as the adopted revision's identity; the two listings'
verifiers parse the body as the tag-list document and as an image index. The reconciliation of
2026-09-28 had this as "OCI never uses the completion-only mode", which the gate review of
2026-10-08 corrected: a tag fetch cannot declare a digest it is about to learn.

**The tag fetch declares the revalidation probe.** Under `proxy-cache.md`'s resolved HEAD
decision (was Q24) an inbound `HEAD` is never forwarded, and the one `HEAD` that layer ever
sends is a probe a handler declares on the fetch-and-cache request for a mutable document whose
identity a `HEAD` exposes: this handler declares it on the tag fetch, naming
`Docker-Content-Digest`, so at TTL revalidation the layer sends one `HEAD` to the tag's upstream
location and re-fetches the manifest only when that header moved from the adopted revision's
identity (its AC32; `upstream-adapters.md` AC14 surfaces the header on the probe and its "Rate
limits and the cool-down" names it as the version check Docker Hub does not count against the
pull budget). The tag list and the referrers listing declare no probe and revalidate by the
conditional `GET`. A proxied tag list for `n`/`last` pagination is served from the cached
upstream listing, never by forwarding the query. Upstream authentication and quirks belong to
the upstream adapter axis, now `upstream-adapters.md`'s: the handler passes the upstream
location and `upstream.Options` and the `distribution` adapter (`internal/upstream/distribution`)
does the `401` Bearer challenge and anonymous or credentialled token exchange, surfaces
`Docker-Content-Digest` on `GET` and on the probe's `HEAD`, parses Docker Hub's `ratelimit-*`
headers into the budget gauge and a `429` into a typed `RateLimitError` (a successful response
carrying `ratelimit-remaining: 0` starts **no** cool-down: its resolved cool-down decision, was
Q5, as amended on its recheck), and follows blob redirects to CDN hosts only inside the
upstream's allowlist (its AC16, AC24). **A `RateLimitError` is rendered to the client as `429`
with the error code `TOOMANYREQUESTS`** (the spec's code-14) and the upstream's message, which
is what `docker pull` prints as `toomanyrequests:`; the proxy layer's cool-down answers every
request to that upstream the same way without a connection until the retry time (AC16).
Every proxied response, `HEAD` included, is written by `signing-service.md`'s serving door: a
`HEAD` on a manifest or blob is the `GET` with the body withheld (its resolved HEAD decision,
was Q24), and the serve policy's `Cache-Control` is downgraded to `private` on a repository that
is not anonymously readable and on any authenticated request (its resolved cacheability
decision, was Q25, and AC38), which for a `docker pull` through the token flow is every request
after the first, so a shared cache in front of this registry ever stores only anonymous pulls
of public repositories. The preconfigured **Docker Hub profile**
(`https://registry-1.docker.io`, adapter `distribution`, credential `none`, realm
`auth.docker.io` with role `root`) is that spec's row for this format, and its blob-redirect CDN
hosts are **captured at Phase 4, not recalled**: Docker Hub answers blob `GET`s with a cross-host
redirect, the hosts observed go into the profile's allowlist from the capture, and until then the
row's allowlist says so. AC16 is this format's half of `upstream-adapters.md` AC25 and shares its
case, `conformance/oci/upstream_dockerhub_test.go`, against a Docker-Hub-shaped stand-in. The
read-only and refresh behaviours of a remote are `repository-lifecycle.md`'s and
`management-api.md`'s, covered under AC15.

## Acceptance Criteria

- [ ] AC1: The official `opencontainers/distribution-spec` conformance suite, at a pinned
      tagged release, with all four workflow categories enabled and run under one credential
      that can pull from `OCI_NAMESPACE` and push to `OCI_CROSSMOUNT_NAMESPACE`, reports no
      failure and no skip outside this spec's exception list; every listed structural
      exception's partner case ran and passed in the same run; and the run fails if any listed
      case runs and passes or any entry lacks an issue number, the four rules the runner
      applies from the list's machine-readable copy (`conformance-harness.md` AC21, its "Skips
      inside an external suite"). That last rule also fails a run whose credential cannot read
      the source namespace, since the mount then answers `202` and the excepted `202`-branch
      case runs.
- [ ] AC2: `docker push` and `docker pull` round-trip an image with an unchanged digest, for
      at least two pinned Docker client versions; a second `docker push` of the unchanged image
      succeeds and creates no snapshot.
- [ ] AC3: `helm push` and `helm pull` round-trip a chart as an OCI artifact.
- [ ] AC4: A chunked upload interrupted partway resumes and completes with a correct digest;
      an out-of-order and a repeated chunk each answer `416` with `BLOB_UPLOAD_INVALID`, the
      status `GET` afterwards reports the range unchanged, and the next in-order chunk
      continues the same session to a `201`.
- [ ] AC5: The token auth flow issues correctly scoped tokens, and a token scoped to one
      repository cannot read another.
- [ ] AC6: The proxied path serves an image fetched from an upstream registry and serves the
      second pull entirely from cache, with no upstream request within the metadata TTL,
      asserted at the network layer; past the TTL, a pull of the same tag sends the stand-in
      exactly one `HEAD` on the tag and no `GET` while its `Docker-Content-Digest` is unmoved,
      and one `HEAD` then one manifest `GET` once the stand-in has re-tagged, with the tag list
      and the referrers listing revalidated by a conditional `GET` and never by a `HEAD`.
- [ ] AC7: An upload session answers `404` with `BLOB_UPLOAD_UNKNOWN` to a `PATCH`, a status
      `GET` and a closing `PUT` once it has sat idle past the idle period or reached the
      absolute cap, and not before: on an injected clock, a session receiving a chunk inside
      every idle window completes after more than one idle period has elapsed, and a blob
      committed before another session in the same repository expired is still accepted by the
      manifest that names it, inside the repository's grace; and a live session's URL presented
      under another `<name>` answers `404` with `BLOB_UPLOAD_UNKNOWN` while the session stays
      continuable under its own.
- [ ] AC8: A real `docker` client that pulled an image from repository A and then pushes it to
      repository B under a credential that cannot read A completes the push, and every mount
      request it sends is answered `202` with an upload session, asserted at the network
      layer; a run observing no mount request fails rather than passing vacuously. A scripted client
      then shows the mount responses for a blob A holds but the caller cannot read, a digest
      held only by a third repository, a nonexistent source repository and a digest held
      nowhere are identical in status, headers other than the session location, and body.
- [ ] AC9: A mount answers `201` and the blob then resolves by digest in the target only when
      the access token grants `pull` on the source and the source holds the digest (including a
      blob in flight in the source); a mount without `from` always answers `202`; and a mounted
      blob that no manifest in the target references stays resolvable in the target after the
      source deletes its own reference, until the target's grace lapses; a mount whose `from` is
      a `remote` answers `201` for a digest the remote has cached and `202` for one it has not,
      with no upstream request in either case (asserted at the network layer); and a mount into
      a `remote` or a `virtual` answers `405` with `UNSUPPORTED` before any source is consulted.
- [ ] AC10: `docker login --password-stdin`, given a registry token as the password and an
      arbitrary username, succeeds non-interactively for both pinned Docker versions, and a
      push and pull then work under it; the token endpoint's responses carry no refresh token;
      and once the registry token is revoked, the next token exchange is refused.
- [ ] AC11: A registry token holding `pull` and `push` under the pattern `app/v1.*`, exchanged
      at the token endpoint by the real `docker` client, passes the `GET /v2/` version probe,
      pushes and pulls the tag `v1.0` of the image `app`, including a multi-architecture index
      whose child manifests are fetched by digest, and is refused pushing or pulling `app:v2.0`,
      `app:latest` and `other:v1.0`; the same token is refused the tag list and the referrers
      listing; with `delete` under the same pattern it deletes the tag `app:v1.0` and is refused
      deleting a manifest or a blob by digest; and in proxied mode it pulls `app:v1.0` through
      the cache and is refused `app:v2.0`.
- [ ] AC12: A manifest or blob request the shared policy layer refuses, on the hosted path and
      on the proxied path, answers `403` with an `errors` entry carrying code `DENIED` and a
      message naming the policy, or naming the signal for content condemned under the
      security-signal rule, and a real `docker pull` of the refused image exits non-zero with
      that message in its output.
- [ ] AC13: Every OCI client the catalogue's multiplier table names beside Docker, each pinned by
      image digest, passes against this handler on both paths: `podman push` and `podman pull`
      round-trip an image, `oras push` and `oras pull` round-trip a non-image artifact, and
      `podman pull`, `oras pull` and `helm pull oci://` each succeed through a proxied
      repository with the second pull served from cache; and `brew install` on pinned Homebrew
      7.0.6 with `HOMEBREW_ARTIFACT_DOMAIN={registry}/v2/{repository}`,
      `HOMEBREW_ARTIFACT_DOMAIN_NO_FALLBACK=1` and `HOMEBREW_DOCKER_REGISTRY_TOKEN` set to a
      registry token installs a bottle copied into a hosted repository with `skopeo` and a bottle
      through a remote over a `ghcr.io`-shaped stand-in, every request of both runs captured as
      `{registry}/v2/{repository}/homebrew/core/{image}/manifests/{tag}` and
      `.../blobs/sha256:{digest}` with the token as a Bearer and no token exchange, no request
      reaching the `ghcr.io` stand-in on the hosted run, and the same install refused `401` with
      the token unset on a private repository and served on a public one (the resolved
      brew-client decision below, was Q9).
- [ ] AC14: An image signed with a real `cosign sign` against the fixture Sigstore has its
      signature manifest found through both the referrers query and the `sha256-<hex>.sig` tag,
      on the hosted path and through a remote whose upstream stand-in serves the signed image,
      and through a remote whose stand-in answers the referrers query `404`, where the
      signature is found through the `<alg>-<ref>` fallback tag and the stand-in receives
      exactly one referrers request before the fallback; a hosted manifest `PUT` carrying
      `subject` is answered with `OCI-Subject` naming that digest;
      the handler hands the subject digest and the signature manifest's layers to the verifier
      and never alters or withholds the signature manifest; and under a repository rule
      requiring the signing identity, `docker pull` of the signed image succeeds while an
      unsigned image and one signed by another identity are refused with the `DENIED` rendering
      of AC12 (this format's half of `artifact-verification.md` AC6).
- [ ] AC15: The handler's `Capabilities()` declares proxy `supported`, reference-implementation
      availability `available`, `Virtual: supported` and `Rename: supported`; and through the real
      `docker` client a repository created through the management API serves from its first
      request in both modes, a `read_only` remote serves a cached image with zero upstream
      requests and answers `not-found` on a miss until `thaw`, a renamed repository serves under
      its new name while the old name answers `not-found`, and `POST .../refresh` on a remote
      makes the next pull revalidate upstream inside the metadata TTL, each asserted at the
      network layer where an upstream is involved.
- [ ] AC16: Through a Docker-Hub-shaped upstream stand-in (token realm on a second host, blob
      redirect to a third, a pull budget), the proxied path completes a `docker pull` with the
      anonymous token exchange, follows the blob redirect only to a host on the profile's
      allowlist and makes no connection to one off it, and surfaces the stand-in's `429` to the
      client as `429` with the error code `TOOMANYREQUESTS` and the stand-in's message, which
      `docker pull` prints, with the next pull inside the cool-down answered the same way and
      no connection made to the stand-in (asserted at the network layer), while a successful
      stand-in response carrying `ratelimit-remaining: 0` starts no cool-down and the pull
      after it reaches the stand-in; the shipped Docker Hub profile's allowlist
      holds the CDN hosts captured from the real registry at Phase 4, and the nightly job
      exercises the real Docker Hub (`proxy-cache.md` AC15).
- [ ] AC17: A `docker push` to `{repository}/{image}:tag` where `{repository}` exists stores the
      image as a package of that repository and `docker pull` of the same name returns it; a
      push to a single-component name is refused `NAME_INVALID`; a name whose first component is
      a repository the caller cannot read answers exactly as a nonexistent one; and through one
      remote bound to a registry stand-in, `docker pull {remote}/library/nginx:tag` and `docker
      pull {remote}/grafana/grafana:tag` each fetch the upstream image of that path on the first
      pull and serve from cache on the second, while `{remote}/nginx:tag` is a miss with one
      upstream request for exactly that path and no other. The unreadable-versus-nonexistent
      comparison holds at the token endpoint too: the exchange for a scope on either repository
      answers byte-identically, a JWT carrying no scope for it.
- [ ] AC18: With a scripted client against the registry as configured for AC1, every tolerant
      case of the pinned suite passes on its strict branch (Design, "The official suite", the
      tolerant-case table): `DELETE` of a tag answers `202`, removes the tag from the list and
      leaves the manifest served by digest and by its other tags; `DELETE` of a manifest by
      digest answers `202`, after which the digest answers `404` with `MANIFEST_UNKNOWN`, every
      tag that pointed at it is gone from the list and its blobs still answer `200`; `DELETE`
      of an unreferenced blob answers `202` and then `404` with `BLOB_UNKNOWN`; a
      single-`POST` monolithic upload answers `201` with the blob readable at its `Location`; a
      manifest with no layers is accepted `201`; and a referrers query with `artifactType`
      answers the filtered list with `OCI-Filters-Applied: artifactType`; the AC1 run shows
      the suite's "GET request to deleted blob URL" case as run and passed, never skipped; and
      the table's machine-readable copy sits beside the exception list's in `conformance/oci/`,
      one entry per suite case naming its overlay case by the name in the table, with the AC1
      run failing when an overlay case did not run and pass in the same run or an entry names a
      suite case the results do not contain (`conformance-harness.md`'s resolved tolerant-case
      decision, was Q9, and AC21), and the copy names exactly the suite cases and overlay
      cases this table names.
- [ ] AC19: On a `read_only` `local` and on a `remote`, a real `docker push` is refused and
      exits non-zero, every refused request (`POST` on uploads, `PATCH` and `PUT` on a session,
      `PUT` and `DELETE` on a manifest, `DELETE` on a blob, a mount) answers `405` with an
      `errors` entry whose `code` is `UNSUPPORTED` and whose `message` names `read-only` or the
      repository type, nothing is committed, and the lines `docker` prints are captured into
      the case; a session open at the freeze answers `405` to its next chunk, still exists
      after `thaw` and completes under it; `docker pull` of the frozen repository's images is
      unaffected; and a scripted `DELETE` of a blob a manifest in the repository still
      references answers `405` with `UNSUPPORTED` and a message naming a referencing manifest's
      digest, after which the blob and the manifest still answer `200`.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/oci/official_test.go` (the exception list's machine-readable copy in `conformance/oci/`, with the tolerant-case table's beside it, both read by the runner under `conformance-harness.md` AC21, whose `conformance/core/external_skip_test.go` proves the rules against fixture results; the suite credential is a token carrying `auth.md` AC29's multi-repository opt-in over both namespaces) |
| AC2 | conformance | `conformance/oci/hosted_test.go` |
| AC3 | conformance | `conformance/oci/helm_test.go` |
| AC4 | conformance | `conformance/oci/chunked_test.go` (scripted client; the durability half lives in `storage-and-gc.md`'s plan) |
| AC5 | integration | `internal/format/oci/token_test.go` |
| AC6 | conformance | `conformance/oci/proxied_test.go` (network-level assertion) |
| AC7 | integration | `internal/format/oci/upload_session_test.go` (scripted wire client, injected clock) |
| AC8 | conformance | `conformance/oci/crossmount_test.go` (real `docker` client, network-level assertion; scripted client for the indistinguishability cases) |
| AC9 | integration | `internal/format/oci/crossmount_test.go` (access tokens minted by the token service with the scopes under test) |
| AC10 | conformance | `conformance/oci/auth_test.go` (the file `auth.md` AC3's row names for this case; both pinned Docker versions; revocation via the auth layer) |
| AC11 | conformance + unit | `conformance/oci/auth_test.go` (the pattern-refusal case `format-handler-interface.md` AC7 requires, in both modes; the tag-scoped multi-architecture pull, refused digest delete and refused tag list `auth.md` AC24 names; a tag-patterned token provisioned through the `credentials` key); `internal/format/oci/scope_object_test.go` (the object table, per route, all four kinds, `GET /v2/` as the descriptor with the sentinel test, `format-handler-interface.md` AC12) |
| AC12 | conformance | `conformance/oci/policy_test.go` (hosted and proxied modes, the file `supply-chain-policy.md` AC1 and AC2 name; rules through the `policies` key and a controlled advisory through `advisories`; the captured fallback behaviour of docker, podman and oras replaces the `pending` binding-table row in the same change, its AC20) |
| AC13 | conformance | `conformance/oci/clients_test.go` (Podman, ORAS and Helm-as-OCI, pinned by digest, hosted and proxied; the catalogue's client-reach evidence for this row); `conformance/oci/brew_test.go` (Homebrew 7.0.6 pinned by digest, a `skopeo`-copied bottle on the hosted path, a `ghcr.io`-shaped stand-in on the proxied path, network-level capture of every request, the token-unset `401` on a private repository) |
| AC14 | conformance + integration | `conformance/oci/cosign_test.go` (real cosign against the fixture Sigstore, hosted and proxied, identity rule; shared with `artifact-verification.md` AC6); `internal/format/oci/verifier_test.go` (discovery by referrers query and by tag, the subject digest and layers handed to a fake `Verifier`, signature manifest served byte-identical) |
| AC15 | unit + conformance | `internal/format/oci/capabilities_test.go` (the four declarations; `format-handler-interface.md` AC13); `conformance/oci/lifecycle_test.go`, `conformance/oci/readonly_remote_test.go`, `conformance/oci/rename_test.go` (`repository-lifecycle.md` AC1, AC11, AC12; the read-only case shared with `proxy-cache.md` AC23); `conformance/oci/refresh_test.go` (`management-api.md` AC29, shared with `proxy-cache.md` AC24) |
| AC16 | conformance | `conformance/oci/upstream_dockerhub_test.go` (shared with `upstream-adapters.md` AC25; the profile's allowlist compared to the Phase 4 capture); the nightly real-upstream job (`proxy-cache.md` AC15) |
| AC17 | conformance + integration | `conformance/oci/name_split_test.go` (real `docker` push and pull under `{repository}/{image}`, the refused single-component name, the unreadable-repository answer compared byte for byte with a nonexistent one, the remote over a registry stand-in serving two image paths with network-level assertion of the exact upstream paths requested); `internal/format/oci/name_test.go` (the split against the repository name grammar, `NAME_INVALID` cases) |
| AC18 | conformance | `conformance/oci/strict_test.go` (one named subtest per table entry, the names in the table's last column, scripted client, run in the same harness run as AC1 after the suite's workflows, each under its own image name; the table's machine-readable copy beside the exception list's, read by the runner under `conformance-harness.md` AC21, whose `conformance/core/external_skip_test.go` proves the two tolerant-case rules; the AC1 report parsed for the deleted-blob case's run-and-passed verdict; a fixture copy naming a renamed suite case and one naming a failing overlay, each failing the run) |
| AC19 | conformance + integration | `conformance/oci/readonly_test.go` (real `docker push` against a `read_only` `local` provisioned through the `repositories` entry's `state`, and against a `remote`; the frozen session across `thaw`; `docker`'s printed lines captured); `internal/format/oci/delete_test.go` (the referenced-blob refusal, the tag-only and manifest-by-digest deletions against the shared model) |

## Implementation Phases

### Phase 1: Pull and push
- Manifest and blob endpoints with monolithic upload, wired to the shared CAS and the token
  auth service
- `docker login` with a registry token at the token endpoint, no refresh token (AC10); depends
  on `docs/internal/plans/foundation/credential-management.md` reaching `planned` and its Phase
  1 (`POST /api/v1/tokens`, revocation) being built first
- The name split into repository and image, with the refused single-component name (AC17's
  hosted half)
- The per-route addressed-object declaration across all four kinds, `GET /v2/` as the
  descriptor, with the pattern carried into minted JWTs (AC11)
- `Capabilities()` declaring proxy, reference implementation, `Virtual` and `Rename`; the
  lifecycle and rename cases as `repository-lifecycle.md`'s phases land (AC15)

### Phase 2: Chunked and resumable upload
- Sessions, ranges, resume, against the storage layer's upload lifecycle
- Session expiry per `data-model.md`'s definition, answered as `BLOB_UPLOAD_UNKNOWN` (AC7)

### Phase 3: Content discovery and management
- Tag listing, blob and manifest delete, manifest lists, the referrers API
- Cross-repository mount under the read-proof rule, with the indistinguishable fallback (AC8,
  AC9)
- Tag-only and manifest-by-digest deletion against the shared model, the referenced-blob
  refusal, and the `405` `UNSUPPORTED` rendering of every write a `read_only` or
  non-`local` repository refuses, captured from `docker` (AC19)

### Phase 4: Proxied path
- Cache policy per resource class over `upstream-adapters.md`'s `distribution` adapter and the
  preconfigured Docker Hub profile, with the blob-redirect CDN hosts captured from the real
  registry into the profile's allowlist (AC16); a remote covering a whole upstream registry
  under the name split (AC17's proxied half); the read-only-remote and refresh cases (AC15)
- The two fetch modes per route, the revalidation probe declared on the tag fetch, the
  proxied tag list and referrers listing with their verifiers and the referrers tag fallback,
  the `429` `TOOMANYREQUESTS` rendering of a rate limit (AC6, AC14's proxied half, AC16)

### Phase 5: The gate
- Official suite at zero skips outside the exception list, with its issues filed and its
  machine-readable copy in `conformance/oci/`; the two-repository suite credential as an opt-in
  multi-repository token; the strict overlay on the suite's tolerant cases, one named subtest
  per entry, with the table's machine-readable copy beside the exception list's for the runner
  to hold (AC18, `conformance-harness.md` AC21); the client
  version matrix (Docker x2, Helm), the catalogue's named clients (Podman, ORAS) and Homebrew
  7.0.6 under a `/v2/`-bearing artifact domain (AC13); matrix reporting

### Phase 6: Policy refusal rendering and signature discovery
- Waits on `supply-chain-policy.md`'s enforcement and `artifact-verification.md`'s core and
  Sigstore entry (both charter step 4b, built with OCI); the `DENIED` rendering of the typed
  refusal on both paths through `WriteRefusal`, the binding-table row filled from the capture
  (AC12); Cosign discovery by referrers query and tag convention, the verifier hand-off (AC14)

## Tasks

Left empty by design. Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None are open. Q3 through Q6, raised by the 2026-09-22 review, and Q7, raised while folding
them, were adopted on 2026-09-26 under the owner's standing delegation and folded through Design,
AC1 and AC7 through AC10, the Test Plan and the phases; Q8, raised by the 2026-09-28
reconciliation, was adopted the same way and rechecked on Fable on 2026-10-08; Q9, raised by
that Fable gate review from `homebrew.md`'s recheck, was adopted under the delegation in the
same pass. Resolved decisions are kept rather than deleted, so the reasoning survives the next
time someone asks why it was done this way.

### Resolved: Homebrew 7.0.6 as a client of this format (was Q9, raised and adopted 2026-10-08)

**Adopted 2026-10-08 under the owner's standing delegation**, on Fable, in the gate review.
Option A: Homebrew 7.0.6 is declared a client of this format on both paths, under
`HOMEBREW_ARTIFACT_DOMAIN={registry}/v2/{repository}`, and proven by a captured conformance
case rather than by the source reading that raised it. Folded into Scope, Design ("Token auth
is a separate subsystem", the direct-Bearer paragraph), AC13 and its Test Plan row, and Phase 5.

The question, from `homebrew.md`'s Fable recheck (its "How much of this `oci.md` already
covers"): brew 7.0.6's curl download strategy substitutes an artifact domain that already
carries `/v2/` for `https://ghcr.io/v2/` itself (`domain_contains_v2`, read in source, not
captured), so `HOMEBREW_ARTIFACT_DOMAIN={registry}/v2/{repository}` makes brew request
`{registry}/v2/{repository}/homebrew/core/{image}/manifests/{tag}` and the blobs by digest,
which is this handler's own surface: a hosted repository holding bottles copied in with
`skopeo`, or a remote over `ghcr.io` under the name split. `homebrew.md` keeps its own bottle
remote for 4.6.20 and the flat layout and says that configuration is this spec's to prove.
Declaring a client the catalogue does not list for OCI is a product judgment: the matrix's
Client column under the OCI row grows, and `catalogue.md`'s rule is that a format names only
the clients it captured traffic from.

**Recommendation:** A, because the surface is already built for docker and the only new work is
the capture, because `homebrew.md` has explicitly left this configuration unproven, and because
an uncaptured source reading is exactly the kind of client claim this project refuses to carry
unverified in either direction.

| Option | You get | It costs |
|---|---|---|
| **A. Declare brew 7.0.6 a client, proven by capture** (adopted) | The one configuration under which a Homebrew user can point brew at an OCI repository of this registry is tested on both paths; the matrix shows brew under OCI as well as under Homebrew; the registry-token-as-Bearer presentation gets a real-client case | One more pinned client image in the OCI set; the case depends on a `ghcr.io`-shaped stand-in `homebrew.md` already builds; the catalogue's "named clients the format specs add" table gains an OCI row |
| **B. Decline: brew stays `homebrew.md`'s client only** | Nothing new here | The `/v2/` rewrite is documented by nobody, so an operator who sets it discovers the behaviour unassisted, and `homebrew.md`'s "oci.md's to prove" stays an open hand-off |

**Why this is yours:** it adds a client to the advertised reach of a format, which the
catalogue guards against inflation, on the strength of a source reading until the capture
lands.

Accepted cost: the client image and the stand-in dependency, and the catalogue row, queued
against `catalogue.md`'s "Named clients the format specs add" table (which carries no OCI row
as of 2026-10-08, so it is cited here as queued rather than as present). Option B lost because
the hand-off would otherwise sit unresolved between two specs that each name the other. The adoption changes nothing for 4.6.20, which has
no `/v2/` rewrite and is `homebrew.md`'s alone.

### Resolved: where the registry repository ends inside an OCI name (was Q8, raised and adopted 2026-09-28)

**Adopted 2026-09-28 under the owner's standing delegation.** Option A: the first component of
the distribution spec's `<name>` is the registry repository, the remainder is the image, a
package inside it. Folded through Scope, Design ("Addressed objects and pattern scopes", "The
name split: repository and image", "The proxied path", the suite credential paragraph), AC11,
AC17, the Test Plan and Phases 1 and 4.

Raised while reconciling three settled sibling facts this spec had never joined. Before this
pass, "Addressed objects and pattern scopes" read the whole `<name>`, slashes included, as the
repository, and `auth.md` still describes OCI's repository names as slash-bearing.
`repository-lifecycle.md` then fixed the repository name grammar as a single OCI name component
and named this spec as the one that must satisfy it; `data-model.md` fixed that a `remote`
carries exactly one upstream, and an OCI upstream is a registry holding many images;
`proxy-cache.md` AC15 expects exactly one enabled remote bound to Docker Hub; and `homebrew.md`
recorded, as a gap in this spec, that one remote over an upstream namespace was "not specified:
an OCI name, slashes included, is one repository" (Open item 30 in
`agents/spec-loop/consequences.md`). Under the whole-name reading a Docker Hub cache needs one
remote per upstream image, which is not a cache anyone would configure.

**Recommendation:** A, because it is the only reading under which the settled one-component
grammar, the one-upstream remote and a usable Docker Hub cache all hold at once, and it is the
model Harbor's projects and Gitea's owner-scoped packages already trained OCI users on.

| Option | You get | It costs |
|---|---|---|
| **A. First component is the repository, the rest is the image** (adopted) | One remote covers a whole upstream registry; the repository name grammar holds unchanged; RBAC and pattern scopes sit on a Harbor-shaped project boundary; the addressed object `{image}/{tag}` lets one pattern span an image's tags or a tag family across images | A hosted image always has at least two components (`docker push registry/nginx:tag` is refused); the object grammar carries the image's slashes, so a tag-only pattern is written `{image}/v1.*`; `auth.md`'s "slash-bearing repository names" wording is now describing the `<name>`, not the repository |
| **B. The whole `<name>` is the repository** | Matches the wording this spec and `auth.md` carried; a tag is the whole object | Needs the repository name grammar to admit slashes, which `repository-lifecycle.md` refused for every client's sake; a remote proxies one upstream image, so caching Docker Hub is a remote per image and `proxy-cache.md` AC15 cannot be met; `homebrew.md`'s gap stays open |
| **C. A per-repository setting choosing A or B** | Both shapes available | Two object grammars and two remote semantics under one handler, doubling the auth and proxied conformance cases, for a distinction no client can observe |

**Why this is yours:** it fixes the RBAC boundary and the URL shape every OCI user of this
registry will script against, and it is irreversible once images are pushed under it.

Accepted cost: the two-component minimum and the image-carrying pattern grammar, both stated in
Design and asserted by AC11 and AC17. Hosted single-component names are refused rather than
mapped onto a default repository, because a silent default would make the boundary invisible to
the person granting scopes. B lost on the grammar, the remote and AC15 together; C lost because
it multiplies the conformance surface to preserve a distinction no client can observe. The
harness consequence is recorded in Design: `OCI_NAMESPACE` and `OCI_CROSSMOUNT_NAMESPACE` live
under two different registry repositories so the suite's mount crosses the boundary the
multi-repository token exists for.

Rechecked on Fable 2026-10-08: **confirmed**, with two costs the record under-stated. The
first component is held to the registry's repository grammar
(`^[a-z0-9]+(?:[._-][a-z0-9]+)*$`, 63 characters, `repository-lifecycle.md` AC2), which is
stricter than the distribution spec's own name-component grammar (`__` and runs of `-` are
valid OCI components), so an OCI name whose first component is OCI-valid but outside the
registry grammar is refused `NAME_INVALID` and an OCI name whose first component is a
repository that does not exist answers as an unreadable one does; AC17 asserts the first and
the name test the grammar edge. And the oracle the split must not open has a second channel the
record did not name: the token endpoint, which is `docker`'s first request and answers an
unreadable and a nonexistent repository identically (AC17's last clause). The options were
framed fairly and the alternatives lost for the reasons given; B's cost was, if anything,
understated, since `proxy-cache.md` AC19 seeds exactly one Docker Hub remote on a fresh install.

### Resolved: the manifest reference graph (was Q2)

**Settled 2026-09-23 together with `foundation/data-model.md` Q9: a format-agnostic `Reference`
edge between versions**, with the relation - OCI's `subject` - recorded and queryable.

GC marks through the edge, so an index's untagged child manifests stay live. The referrers API
becomes one indexed query rather than something the core would have to parse manifests to
answer. Both specs previously carried opposite recommendations for this one decision; this
settles both.

Accepted cost: the shared model gains an entity on OCI's account. The alternative was flattening
the graph into `File` rows, which keeps GC sound but loses the referrers query that OCI
conformance tests - putting the zero-skips goal at risk.

### Resolved: the docker login credential (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a registry token -
the scoped, revocable machine credential `auth.md` defines, called a personal access token in
this question - presented as the password of the Basic credential at the token endpoint, with
the username not an authentication input. Robot accounts are not part of this adoption; they
are a separate principal kind, which `auth.md`'s resolved token-management decision (was Q21)
placed in `docs/internal/plans/foundation/credential-management.md`, where it now exists ("Robot
accounts", AC9).

**Recommendation (as written before adoption):** A - personal access tokens (and later robot
accounts) usable as the password at the token endpoint; every incumbent registry converged on
this, and docker cannot perform a browser flow.

| Option | You get | It costs |
|---|---|---|
| **A. Personal access tokens as the docker login credential** | Works with every OCI client today; scoping and revocation are natural | A token-management surface (issue, list, revoke) lands on the critical path before OCI ships |
| **B. Static per-user passwords on the SSO account** | No new surface | Encourages long-lived primary credentials in CI secrets, and collides with an SSO-first identity model where users may have no password at all |

**Why this was the owner's:** it creates the platform's first credential-management product
surface, whose shape outlives OCI. `foundation/auth.md` settles how a credential is verified and
scoped; what remained open here was how a non-interactive `docker login` obtains one.

Accepted cost: token issuance, listing and revocation sit on OCI's critical path (Phase 1), in
the credential-management surface spec `auth.md`'s resolved token-management decision (was Q21)
names, `docs/internal/plans/foundation/credential-management.md`, whose Phase 1 (`POST
/api/v1/tokens` and its revocation) is what this format's Phase 1 waits on.
Option B lost because an SSO-first identity model has users with no password at all, and a
static password in CI secrets is exactly the long-lived primary credential `auth.md`'s design
avoids. Derived in folding, not separately decided: the token endpoint issues no refresh token,
because one would be a second long-lived credential outside `auth.md`'s hash-only storage and
revocation model. Folded into Design ("Token auth is a separate subsystem"), AC10 and Phase 1.

### Resolved: recourse when a conformance case cannot pass (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: a documented exception
list, with the admissibility rule, the partner rule for structural entries and the
stale-entry rule stated in Design ("The official suite, pinned, and what zero skips actually
buys"). AC1's gate applies to everything else.

**Recommendation (as written before adoption):** B - a documented exception list: each such
case carries an upstream issue link and a named line in this spec, and AC1's zero-skips gate
applies to everything else. A gate with no defined failure mode gets renegotiated ad hoc under
deadline pressure.

| Option | You get | It costs |
|---|---|---|
| **A. Absolute: AC1 stays unticked until the suite is fixed upstream** | Maximum credibility, zero judgment calls | A single upstream suite defect blocks the format, and the experiment's headline gate, indefinitely |
| **B. Documented exceptions: upstream issue link plus a named line here; zero skips for everything else** | The gate survives contact with suite defects without going soft | Someone must police that the list holds only genuine upstream defects, never our own gaps |

**Why this was the owner's:** AC1 is the experiment's flagship gate; only the owner decides what
may weaken it and by how much.

Accepted cost: the list must be policed so it never holds our own gaps. The policing is made
mechanical where it can be - admissibility is limited to two named classes, a structural entry
holds only while its partner passes, and an entry whose case runs and passes fails the run - and
adding an entry is a spec change under review. Option A lost more decisively than the question
anticipated: grounding against the v1.1.1 suite source while folding showed its complementary
case pairs make literal zero skips unreachable for every registry, so option A would have left
AC1 permanently unticked. The upstream-link requirement was widened in folding to two classes,
because a structural skip is not an upstream defect and has no upstream issue to link; every
entry still carries a tracking issue number, as `CLAUDE.md` requires of any skip. Folded into
Design, AC1, the Test Plan and Phase 5.

### Resolved: cross-repository mount across private repositories (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a mount succeeds only
when the access token grants `pull` on the named source and the source holds the digest;
otherwise the registry starts a regular upload, indistinguishably for every reason it could not
mount. A mount without `from` never mounts.

**Recommendation (as written before adoption):** A - a mount succeeds only when the client has
proven read access to the named source repository, and otherwise falls back to the
spec-permitted "start a regular upload" response, which leaks nothing.

| Option | You get | It costs |
|---|---|---|
| **A. Mount requires read access to the source; silent fallback to a normal upload otherwise** | No existence oracle across private repositories, while staying spec-conformant (the fallback is a defined behavior) | An extra authorization check on the mount path, and the cross-mount conformance case must run with a suitably scoped token |
| **B. Mount by digest from anywhere - the pure CAS view** | Maximum deduplication convenience | Any authenticated user can probe whether any digest exists in any private repository, a real leak class in multi-tenant registries built on shared CAS |

**Why this was the owner's:** it is a security-posture trade between convenience and a
cross-tenant information leak inherent to shared content addressing.

Accepted cost: an authorization check on the mount path, a suite credential that must read the
source namespace (the resolved suite-credential decision below), and re-sent bytes for every
client that cannot read the source. Option B lost because a shared CAS makes "mount from
anywhere" a digest-existence probe into every private repository, which `auth.md`'s resolved
existence-oracle decision refuses at the repository level already. Folded into Design
("Cross-repository mount"), AC8 (the leak closed through a real `docker` client, with the
fallback responses proven indistinguishable) and AC9 (the success path and the mounted blob's
place under the target's upload scope), and Phase 3.

### Resolved: upload session lifetime (was Q6)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: sliding idle expiry
with an absolute cap. The recommendation named `storage-and-gc.md` as the rule's home; it is
recorded instead in `data-model.md`'s single definition of an upload session, because this
question was the third collision of one root cause (a session the wire does not have) and the
answer is a definition every consumer cites, and because `storage-and-gc.md` is `planned` and
not edited in this pass. The values were a new judgment call and are that spec's resolved
session-lifetime-defaults decision: one hour idle, 24 hours absolute.

**Recommendation (as written before adoption):** B - sliding idle expiry with an absolute cap,
both recorded in `storage-and-gc.md` alongside orphan cleanup, with the handler answering an
expired session as the distribution spec prescribes.

| Option | You get | It costs |
|---|---|---|
| **A. A fixed TTL from session creation** | Trivial to reason about and to fault-inject | A slow but legitimate multi-gigabyte push can die mid-flight at the cap |
| **B. Sliding idle expiry with an absolute cap** | Survives bursty CI pauses while still bounding orphan lifetime | Two parameters instead of one, and expiry interacts with the GC grace period in both directions |

**Why this was the owner's:** it draws the line between "resumable", a promise made to clients,
and "orphan", what cleanup may reap.

Accepted cost: two parameters, and the interaction with grace. Both directions of that
interaction are now closed by the definition rather than by tuning: an expired session's bytes
are collected only once its repository's grace has also lapsed, and an unexpired session holds
its repository's grace open, so a client paused inside the idle window never loses a layer it
already committed. Option A lost because a fixed window kills a slow but live push at its cap
while giving an abandoned one the same full window. Folded into Design ("Chunked upload and the
durability split"), AC7 and Phase 2.

### Resolved: the official suite's credential (was Q7)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the harness provisions
a credential granting `pull`, `push` and `delete` on `OCI_NAMESPACE` and `pull` and `push` on
`OCI_CROSSMOUNT_NAMESPACE`, and the cross-mount cases run for real under it.

Raised while folding Q4 and Q5. The pinned suite configures one client from `OCI_USERNAME` and
`OCI_PASSWORD` and uses it on two repositories: the namespace, and the cross-mount namespace it
mounts into from the namespace. Under Q5's rule that mount succeeds only if the credential can
read the source, and `auth.md` has adopted single-repository registry tokens, so no registry
token can hold that credential's grants. Left unstated, the harness author would
find the conflict at run time and resolve it by whichever shortcut made the run green.

**Recommendation (as written before adoption):** A - state the two-repository requirement here
and place the credential kind on `auth.md`, because both alternatives pass the gate without
testing the surface.

| Option | You get | It costs |
|---|---|---|
| **A. A two-repository suite credential, with the credential kind defined by `auth.md`** | The cross-mount cases exercise a real mount from a readable source; AC1 stays the standards body's gate | AC1 depends on `auth.md` offering some credential kind that can hold grants on two repositories, which its single-repository tokens do not provide on their own |
| **B. Point `OCI_CROSSMOUNT_NAMESPACE` at `OCI_NAMESPACE`** | A single-repository token suffices | A mount into its own source is a no-op; the case passes while testing nothing |
| **C. Add the cross-mount cases to the exception list** | No credential dependency | An exception covering a surface we implement is our own gap by definition, inadmissible under Q4's rule |

**Why this is the owner's:** it decides whether the flagship gate may depend on a credential
shape another spec has not yet settled.

Accepted cost: AC1 could not be met until `auth.md` defined a credential kind that holds grants
on two repositories. It now does: `auth.md`'s resolved two-repository credential decision (was
Q22, AC29) adopted multi-repository registry tokens by explicit opt-in, each repository named by
identity, and the suite credential is such a token. Options B and C lost because each passes the
gate without exercising the surface, which is the soft gate Q4's rule exists to prevent. Folded
into Design and AC1.

### Resolved: build approach (was Q1)

**Settled 2026-09-22: implement the distribution spec directly.** Embedding
`distribution/distribution` would pass the official conformance suite on day one and prove
nothing about our harness, which is the entire reason OCI is on the list at all. It would also
impose its storage model in place of our CAS and snapshot model.

Accepted cost: months of protocol work on a format Harbor already solves well. That cost is the
point - OCI is the hardest protocol with the strongest oracle, so it is where the harness earns
its credibility.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-22 | afbb4e4 | adversarial + constitution + go-spec-reviewer (claim verification vacuous pre-code; suite claims grounded against the v1.1.1 and main conformance READMEs) | Expanded Design: suite pinned to a tagged release, zero-skips implications spelled out, token-service placement derived from the handler boundary, data-model mapping gap and durability split named; tightened AC1/AC2/AC6; raised Q2-Q6 (manifest graph, docker login credential, zero-skips escape hatch, cross-mount leak policy, session lifetime); stays draft. |
| 2026-09-26 | 4d1aeb1 | folding adopted recommendations under the standing delegation | Not a review. Adopted Q3 option A (the `auth.md` registry token as the Basic password at the token endpoint; derived: no refresh token, and token issuance on the Phase 1 critical path), Q4 option B (documented exception list; grounding against the v1.1.1 suite source showed complementary `RunOnlyIf`/`RunOnlyIfNot` pairs make literal zero skips unreachable for any registry, so the list holds four structural entries, each needing its partner to pass, and the admissible classes widened to upstream-defect and structural), Q5 option A (mount only with `pull` on the source and the digest held there, indistinguishable `202` fallback otherwise, no mount without `from`, `OCI_AUTOMATIC_CROSSMOUNT=false`), Q6 option B (sliding idle expiry with a cap, recorded in `data-model.md`'s single upload-session definition because the storage spec is planned and was not edited). Also raised and adopted in this pass: Q7 (the suite presents one credential across two repositories, so the harness needs a credential holding grants on both; `auth.md` must supply the kind). Changed: Scope, the token-auth, suite, chunked-upload and new cross-repository-mount Design sections, AC1 rewritten, AC7 (session expiry on the wire), AC8 (the mount leak closed through a real `docker` client plus indistinguishable scripted responses), AC9 (mount success path and the mounted blob under the target's upload scope) and AC10 (`docker login` with a registry token) added, Test Plan rows and all phases but Phase 4. Zero open questions. |
| 2026-09-26 | da0aecd | cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Applied: the two-repository suite credential is met by `auth.md`'s resolved Q22 and AC29 (opt-in multi-repository token, repositories named by identity), rewritten through Design, the cross-mount accepted cost, the Q7 record, the AC1 Test Plan row and Phase 5; the token-management surface and robot accounts cited to `credential-management.md` (auth's resolved Q21), Phase 1 depending on it reaching planned; the addressed-object table (manifest by tag named; manifests by digest, blobs and upload sessions content-addressed; tag list, referrers and catalog none; the JWT carrying the pattern per auth AC26) with AC11 as the pattern-refusal case in both modes; the per-format policy rendering (403, `DENIED`, AC12, Phase 6) the supply-chain fold queued for OCI first; the catalogue's resolved client-reach decision applied as AC13. Nothing found already done. Stays draft. |
| 2026-09-28 | a6d72b3 | cross-spec reconciliation of the foundation wave. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` naming this file verified against the current text of its source spec before applying. From the credential-management authoring (item 10): every "(to be authored)" citation replaced by the spec's Phase 1, `POST /api/v1/tokens`, AC5 and "Robot accounts" (AC9); the suite credential is minted with `multi_repository: true` (its AC7, whose Test Plan runs this suite). From the auth and interface reconciliation and auth's resolved name-free-document decision (was Q23): `GET /v2/` declared a descriptor with no repository, so a patterned-only `pull` passes docker's first request (AC11, the scope table test with the sentinel check). From the format-handler-interface reconciliation (item 3) and `repository-lifecycle.md`: `Capabilities()` declares `Virtual` and `Rename` supported, and the `lifecycle_test.go`, `readonly_remote_test.go`, `rename_test.go` and `refresh_test.go` cases those specs and `management-api.md` AC29 place under `conformance/oci/` are gathered as AC15. From the artifact-verification authoring (item 14): signature verification is no longer out of scope; a "Signatures and the verifier" section states the handler's half (discovery by referrers query and by the `sha256-<hex>.sig` tag, the hand-off through `Deps`' `Verifier`, never altering a signature manifest), asserted by AC14 sharing `conformance/oci/cosign_test.go` with its AC6. From the upstream-adapters authoring (item 10): Phase 4 runs on `internal/upstream/distribution` and the preconfigured Docker Hub profile, whose blob-redirect CDN hosts are captured at Phase 4, asserted by AC16 sharing `upstream_dockerhub_test.go` with its AC25; OCI never uses `proxy-cache.md`'s completion-only mode (was Q15) because every fetch carries a declared digest. From the supply-chain reconciliation (item 11) and Open item 5: the refusal goes through `WriteRefusal` with the shared status-line phrase (was Q10, AC18), and AC12's capture fills the `pending` binding-table row (its AC20, harness AC26). From the management-api authoring (items 11 and 12): this format declares no `Operator` kinds and retires nothing, stated in Design with the reason. Open item 30's OCI half raised Q8 (where the registry repository ends inside an OCI name), written in decision shape and adopted: the first component is the repository, the rest the image, so one remote covers a whole upstream registry and the one-component name grammar holds; folded through the object table (`{image}/{tag}`), AC11, a new "The name split" section, the suite-credential paragraph and AC17. Replication and vulnerability scanning re-cited to `replication.md` and `supply-chain-policy.md` AC10. Nothing found already done. `node scripts/check-spec.js` zero failures for this file. Stays draft pending a gate review. |
| 2026-10-08 | 4f929c7 | Fable gate review: full review + re-examination of the Opus adoption (Q8), adversarial pass on the Opus reconciliation and the original authoring (suite conformance, push sessions, cross-mount, deletion, referrers, Docker Hub limits, the read-only `405`), constitution compliance | A review. Brought current first: the whole of `agents/spec-loop/consequences.md` read, both queued items applied and verified against their sources at HEAD (proxy-cache round 3 item 3: the revalidation probe declared on the tag fetch, citing was-Q24 and AC32, asserted by AC6; homebrew recheck item 2: brew 7.0.6 under a `/v2/`-bearing artifact domain declared a client as Q9, adopted under the standing delegation, AC13); the optional auth AC32 citation applied. Protocol claims re-grounded against the distribution spec and the conformance sources at the v1.1.1 tag, fetched this pass: the four exception-table guards hold (`lastResponse` is assigned only by the mount case), but the suite is a soft gate in seven places beyond skips (tag and manifest deletion disallowed, blob deletion `405`, mount `202`, monolithic `202`, the empty-layer manifest and the `artifactType` filter pass on a `Warn` to stderr that reaches no report), so a strict overlay is now Design's tolerant-case table and AC18; `OCI_AUTH_SCOPE` left unset and `OCI_SKIP_EMPTY_LAYER_PUSH_TEST` found declared-but-unused. Design corrections: the 2026-09-28 claim that OCI never uses the completion-only mode was wrong (a tag fetch, the tag list and the referrers listing cannot declare a digest; they carry a verifier); the adapter cool-down wording predated upstream-adapters was-Q5's amendment (no cool-down on `ratelimit-remaining: 0`); a `RateLimitError` is rendered `429` `TOOMANYREQUESTS`; the read-only `405` was cited to repository-lifecycle AC10 "for a binding" when OCI has no bindings and management-api AC7 and was-Q16 leave the rendering to this spec, now fixed as `405` `UNSUPPORTED` with docker's output captured (new Design section, AC19); deletion semantics stated from the immutable snapshot (tag-only, manifest-by-digest, the referenced-blob refusal); a `416` leaves the session open and a session URL is bound to its `<name>` (AC4, AC7); a mount from a `remote` never fetches upstream and a mount into a non-`local` is a push refusal (AC9); the manifest `PUT` is bounded by the shared spool (`413`), claim-free and idempotent on identical bytes (AC2); `OCI-Subject` and the proxied referrers listing with the `<alg>-<ref>` fallback (AC14); the serving door's `HEAD` and `Cache-Control` rules and auth was-Q27 cited; the token endpoint named as the second oracle channel (AC17); AC10's file aligned with auth AC3's row. Q8 rechecked: confirmed, with the stricter first-component grammar and the token-endpoint channel added to its record; Q3 to Q7 attacked and left standing. Open Questions empty; 19 criteria, each with a Test Plan row; `node scripts/check-spec.js` zero failures for this file. Sibling consequences reported, not applied. Status: planned. |
| 2026-10-08 | 91c6bc0 | Fable follow-up: queued cross-spec items since the recheck | A review, narrower than the gate review: the whole of `agents/spec-loop/consequences.md` read, every item targeting this file after the 4f929c7 row collected, each verified against the source's text at HEAD. Applied, from the conformance-harness follow-up (item 1, substantive): the tolerant-case table gains an overlay-case column naming the `strict_test.go` subtest that closes each entry, a paragraph states the table's machine-readable copy beside the exception list's (one entry per suite case, the overlay cases run in the same harness run after the suite's workflows under their own image names, the copy derived from the table) and the per-tag review obligation (the suite source re-read at every pinned tag, starting from the `Warn` helper and every multi-status assertion, the table and copy re-derived in the same change), AC1 cites `conformance-harness.md` AC21 for the four exception rules and AC18 cites its resolved tolerant-case decision (was Q9) and AC21 for the two tolerant-case rules; the AC1 and AC18 Test Plan rows, Scope and Phase 5 updated. Declined, from the same follow-up (item 4, wording): this spec carries no "reported to the harness" wording about an exception row, having no row in the harness's authoritative-reference table (its write half is the suite and the real clients against this registry); the one "reported as a sibling consequence" phrase (the Q9 record's catalogue row) cannot cite the row because `catalogue.md` carries no OCI row at HEAD, so it now names the queued target table instead. Declined, optional: data-model's cross-mount wording is a consequence this spec raised against `data-model.md`, not one it received, and its resolution rule at HEAD is unchanged, which Design's "Cross-repository mount" already reconciles. Verified already applied by the gate review: proxy-cache round 3 item 3 (the probe, AC6), homebrew recheck item 2 (Q9, AC13), the auth AC32 citation. No adoption. Open Questions empty; 19 criteria, each with a Test Plan row; `node scripts/check-spec.js` zero failures for this file. Stays planned. |
