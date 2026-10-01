---
status: planned
status_description: "Planned by the Fable recheck of 2026-10-01 at 71e0ccb: a full review pass plus the re-examination of the ten authoring adoptions and the three judgements the closing sweep folded without a question. Q1, Q3, Q5, Q7, Q8 and Q10 confirmed; Q2 confirmed as revised by management-api's effect rule, with the bulk import refusing revoke and remove lists under annotate; Q4 confirmed and amended in cost (every publish rewrites the monolithic forms whole, gated at conda-forge scale by AC18; created_at from the write's input; channeldata derived at generation); Q6 confirmed and amended in fold (the merged current index derived from merged records, the removed subtraction, notices by id, the merged shards on the merged shard index's declared list with one predecessor generation, the static member-input list replaced by a {subdir} template plus noarch with a read-driven remote-only subdir under signing-service was-Q21 and was-Q22); Q9 confirmed and amended in fold (run_exports from info/run_exports.json, about data at ingest, the overlay excluding run_exports). Q11 raised and adopted under the standing delegation, owner-facing: the merge reads repodata.json.zst from a remote member, one seventh of the transfer, a .zst-less member contributing nothing. Adversarial findings folded: the shard index's declared list holds the previous generation's shards so a client inside its max-age never meets a 404 on a shard (AC2, AC6); attach declared for CEP-50 attestations on existing files and an existing-bytes publish with one is a changed publish (AC5, AC22); the overlay excludes identity, integrity and run_exports fields; the proxied TTL is the layer's, not the upstream's max-age (AC12); no configuration-time probe (AC20); HEAD and no content encoding on both paths; CEP-6 notices validation (AC23); the spool limit's 413 (AC3); the digest index built in the adoption transaction (AC26). 26 criteria, each with a Test Plan row; eleven resolved, zero open; fable_recheck cleared. Earlier: Format closing sweep 2026-09-28 at f8ad8b2 on Opus (not a review): the merging profile declares its member-input paths (per subdir repodata.json, the shard index and run_exports.json; channeldata.json and notices.json at the root), replayed for noarch and every subdir another member holds when a never-adopted remote joins a virtual; remote adoption re-merges and a virtual-only remote is revalidated by the virtual's reads (signing-service was-Q16, AC35; proxy-cache AC26; AC17 extended); the unsigned merged index admits remote documents with no verdict, AC36 governing only signed bodies; the digest index declared on the remote's blob-digest list with a retained count of zero, closing a keep-alive-by-mention hole, and the remote's index documents outside the quota in cache_metadata_bytes (proxy-cache was-Q19, Q21; new AC26); Cache-Control per format, max-age=60, no repository override (signing-service was-Q18, AC30), packages and sidecars through ServeFile (was-Q14, AC6 extended); bindings never wider than publish, claims checked at declaration and at commit, the declared unchanged publish and the wire rendering of retired (management-api was-Q13 to Q16, AC4 extended); the hosted read half recorded against a pinned conda-index tree and no write corpus, two exception-list rows for conformance-harness (AC19). No question adopted; 26 criteria. Earlier: Reconciled 2026-09-28 at 15ced69 with the foundation wave on Opus (not a review): revoke and unrevoke are management-api's withdraw and restore kinds under delete (its was-Q1 reversed this spec's push), patches and notices annotate, remove delete-file, the two upload routes declared bindings onto publish (AC5); retirement is data-model's core-held Retirement record, refused centrally as retired, the served removed list kept as snapshot state (AC4); generation through signing-service's Indexer and generator package as an unsigned consumer, dispatched by the pre-commit hook and served through ServeDocument, the virtual merge on the index.merge job (AC6, AC17); the /t/ path token held by auth.md's presentation-form table and format-handler-interface's reserved t, the upstream path-token kind in upstream-adapters (AC8, AC14); refusals through WriteRefusal with the status-line phrase, the capture filling conda's pending binding row (AC10); the CEP-27 verdict through artifact-verification's entry, recorded not enforced (AC22); OSV coverage and the pkg:conda cataloguer requirement cited from supply-chain-policy; cache-scoped Last-Modified on remotes (AC12); removal rows named by proxy-cache class; Capabilities with rename and virtual cases (AC25). Earlier: authored 2026-09-26 from captures of conda 26.7.1 and 24.1.2, mamba 2.9.0, micromamba 2.3.3 and pixi 0.81.0; ten questions adopted under the standing delegation; none open. Awaits a /spec review pass."
description: "Spec for the conda channel format: the static subdir layout, the subdir-wide generated index in its monolithic, compressed, current and sharded representations, repodata patching as the ecosystem's management vocabulary, the four proprietary upload APIs and the two served as bindings, hosted and proxied, with conda, mamba, micromamba and pixi as the conformance oracles."
author: michielvha
goal: "Serve conda, mamba and pixi users a private channel whose index is regenerated by the shared index service on every publish and never disagrees with itself across its representations, and a conda-forge cache that survives that channel's scale, with repodata patching, revocation and removal as registry-owned operations the real clients observe."
priority: "medium"
issue: 25
created: 2026-09-26
covers:
  - "internal/format/conda/**"
  - "conformance/conda/**"
---

# Plan: Conda channel format

The conda channel layout, hosted and proxied: a static directory convention in which every
package file sits under a platform subdir, every subdir carries one generated index served in
several representations that must agree, the channel root carries channel-wide documents, the
only management vocabulary the ecosystem has is a server-side patch of that index, and no
standard publish API exists, with `conda`, `mamba`, `micromamba` and `pixi` as the oracles on
both paths and `rattler-build upload` as the oracle for the two publish bindings this registry
serves.

## Context

Conda sits in Tier 2 of `formats/catalogue.md` as a single-ecosystem family ("Conda"). **Its
build is gated by `project-charter.md` AC9 and `catalogue.md` AC5**: no handler code for a Tier 2
ecosystem exists before every Tier 1 format has met its definition of done and the owner has
recorded a `continue` verdict at the charter's build step 8. This spec exists now because the
owner directed on 2026-09-26 that all 33 ecosystems be specced up front (the catalogue's "Every
ecosystem below is specced now; only building is gated"), so that the gate decides what is built
and never what is written; a `shrink` verdict parks it.

It is the **generated-index class without a signature**: Maven's shape at Debian's scale. Every
subdir of a channel is described by one index the server produces, which the clients read in
three generations of representation (a monolithic JSON, its compressed forms, and a
content-addressed sharded form), and a conda-forge subdir index is 188 MB uncompressed. So a
hosted channel cannot exist without the shared signing and index service the charter builds at
step 7 before Helm, and a conda-forge cache is the largest mutable document the proxy layer will
ever hold. Two more things set it apart from the sibling specs. **There is no standard upload
API**: anaconda.org's, prefix.dev's, quetz's and Artifactory's are four different proprietary
protocols, all four captured below from one real client, so publishing is a management-surface
question rather than a wire contract. And **the ecosystem's management vocabulary is a server-side
patch of the index**: conda-forge fixes dependency pins, removes broken builds and revokes
packages by regenerating repodata from patch instructions, never by touching the package files,
and a revocation is a yank the clients understand natively.

Grounding for this draft, stated up front because the constitution asks for evidence or silence:

- **Captured client traffic.** No conda-family client is installed on this host (`which conda
  mamba micromamba pixi` find nothing), so five pinned client images were run in containers on
  the host network against a logging stub that serves a directory tree as a set of channels and
  records every request: conda `26.7.1` (`docker.io/continuumio/miniconda3:latest` at digest
  `sha256:eca594d684f495c1a02beff33a9fab53aec8c5830eaf431bb149912dc6c9e4c1`, with
  conda-libmamba-solver 26.7.0 and libmambapy 2.3.2); conda `24.1.2`
  (`continuumio/miniconda3:24.1.2-0` at
  `sha256:9d5f6b6ec999bb2b0b5ff5c6b272311f267644ae4647b037764d8a7992cd1624`, libmambapy
  1.5.6); mamba `2.9.0` (`docker.io/condaforge/miniforge3:latest` at
  `sha256:3a41fcca7d6740df102951d9f122bf1a5f81170fdba234243060f72eb4891901`); micromamba
  `2.3.3` (`docker.io/mambaorg/micromamba:2.3.3` at
  `sha256:800e7ade3ffe29c9a9ac2026163131495f8197c3852e572c5835beb4e8a33cd6`); and pixi
  `0.81.0` (`ghcr.io/prefix-dev/pixi:latest` at
  `sha256:788ae451641666e2d1f79d3dbe35392dfc7e9b394b16a3acb75c347f3badb2ab`). For the publish
  captures, `rattler-build 0.76.1` (whose upload code identifies itself as
  `rattler_upload/0.10.7`) was installed from conda-forge into the miniforge image and driven
  once per upload target against the same stub. The fixtures were genuine in the way that
  matters: minimal `.conda` and `.tar.bz2` packages built to the CEP-34 and CEP-35 layouts, then
  indexed by the real `conda-index 0.13.0` with a patch generator applying a dependency hotfix,
  a removal and a revocation, and with the compressed, current, sharded, run-exports,
  channeldata and RSS outputs enabled, so every index the clients read was produced by the
  ecosystem's own generator and not by hand. Every consumer capture started from a fresh
  package and index cache unless the row says otherwise, and every row of the wire table was
  observed on every pinned client unless the row says otherwise. The stub is not a reference
  implementation; what the captures prove is what the clients send and how they react.
- **The published contract.** The conda enhancement proposals read 2026-09-26: CEP-6 (channel
  notices), CEP-12 and CEP-21 (`run_exports.json`, and run exports in shards), CEP-15
  (`base_url`, repodata version 2), CEP-16 (sharded repodata), CEP-26 (package, channel, subdir
  and filename grammar), CEP-27 and CEP-50 (publish attestations and their `.sigs` sidecars),
  CEP-34 and CEP-35 (package contents and the two artifact formats), CEP-36 (the files a subdir
  serves and the `repodata.json` schema), CEP-38 (`channeldata.json`), CEP-42 (channel
  relations) and CEP-48 (the backwards-compatible `v3` key); the conda-index command reference
  and source (`conda_index/index/__init__.py` for the output set and `_apply_instructions`,
  `current_repodata.py` for the current-index rule); the conda source shipped in both pinned
  images (`conda/gateways/repodata/__init__.py` and `zstd.py`, `conda/_private/shards/shards.py`,
  `conda/base/context.py` and `constants.py`), which is where the format-probing order, the
  seven-day negative memory and the `repodata_use_shards` default live; the conda
  configuration reference; pixi's authentication and configuration references and
  rattler-build's upload reference; the anaconda-client source for the anaconda.org upload flow;
  and the Artifactory and Nexus conda documentation as prior art for hosted, proxied and virtual
  channels.
- **The live upstreams.** `conda.anaconda.org/conda-forge` sampled directly: `noarch/repodata.json`
  at 188,483,295 bytes, its `.zst` at 28,534,837 and `.bz2` at 28,742,398, `current_repodata.json`
  at 26,461,736, `repodata_shards.msgpack.zst` at 973,183 bytes indexing 23,796 shards,
  `linux-64/repodata.json.zst` at 58,177,843, `channeldata.json` at 23,318,193, `run_exports.json`
  at 23,539,845 and `linux-64/patch_instructions.json` at 60,825,575, every one served with
  `Cache-Control: public, max-age=1200`, an MD5-shaped `ETag`, `Last-Modified` and
  `Accept-Ranges: bytes`, a `304` to both `If-None-Match` and `If-Modified-Since`, a `206` to a
  `Range`, a `404` for `notices.json`, for a missing package, for a wrong-case package filename,
  for a missing subdir and for a missing channel, a `200` for a package requested through
  `/t/<bad token>/`, and `{"error":"jlap is no longer supported"}` at `repodata.jlap`; one live
  shard fetched and its bytes hashed to exactly its filename. `repo.anaconda.com/pkgs/main` for
  the defaults channel (`max-age=30`, a `notices.json` that exists, no sharded index) and
  `prefix.dev/conda-forge` for its `303` redirect on the sharded index.

Where the documentation and the captures disagree, the captures win, and the disagreements are
recorded here because they would otherwise be built from the documents: the conda configuration
reference lists `current_repodata.json` first in `repodata_fns`, but no pinned client requested
it under the default libmamba solver, and only `conda --solver classic` does; the same reference
documents `use_only_tar_bz2`, which conda 24.1.2 honours and conda 26.7.1 ignores; CEP-16
recommends `Cache-Control: immutable` for shards, and conda-forge serves them with
`max-age=1200`; conda-index 0.13.0 writes the `md5` and `sha256` of a shard record as raw bytes
while the live conda-forge shards carry them as hex strings, and the three sharded clients
consumed both; JLAP is an experimental interface in conda 24.1.2, absent from conda 26.7.1, and
refused by conda-forge; and `conda-index` indexes a package whose name violates CEP-26 without
complaint, after which no conda or mamba query can find it.

Five things make this format worth a careful spec rather than a port of Maven's. **The index is
one document in five representations that must agree**: `repodata.json`, its `.zst` and `.bz2`
forms, `current_repodata.json`, and the sharded index with one content-addressed shard per
package name; each pinned client generation probes a different one first, and a registry that
regenerates them at different moments serves three generations three different truths. **There
is no publish API**, so the hosted write surface is whatever this registry decides to bind, and
the captures give it four candidates. **Patching is the management surface**: a hotfix rewrites
a record's dependencies, a removal lists the filename under `removed`, and a revocation adds a
dependency on `package_has_been_revoked` that every pinned resolver refuses while a lockfile
that already pins the file still installs it, which is exactly a yank. **The credential can live
in the URL path**: `conda`, `mamba` and `pixi` all carry an anaconda.org-style token as a
`/t/{token}/` segment inserted after the host, before any channel path, which no other format in
the catalogue does and which the shared authorizer must strip before routing. And **the proxied
path is conda-forge**, whose noarch subdir alone is a 188 MB mutable document with a 20-minute
TTL and twenty-four thousand immutable shards behind it.

## Blocking preconditions

**The handler interface re-open must complete before this handler starts**, as for every Tier 1
and Tier 2 handler (`format-handler-interface.md` AC8). Conda is Tier 2, so the catalogue's Tier 1
gate (its AC5) and the charter's breadth verdict (its AC9, build step 8) both precede it; the
re-open is recorded here anyway, from this side, because a gate enforced on one side only is
enforced nowhere.

**The shared signing and index service is `planned`, which Phase 1 required.** Every index document
a hosted channel serves is a write-triggered generated document produced by the index half of
`docs/internal/plans/foundation/signing-service.md` (planned on Fable 2026-09-30), which the
charter builds at step 7 as the production form of what the step 4a prototype learned
(`write-triggered-services-prototype.md`).
Conda is one of that spec's unsigned consumers: the handler declares the optional `Indexer`
interface, its generator lives in the sibling package `internal/format/conda/index`, and the
service creates no key and no signature record for a conda repository (signing-service.md, "The
generator contract, and where a generator lives", AC24). What this format requires of the
service is stated in Design ("What the signing and index service must provide"), each item
mapped onto that spec's contract; nothing is asked of its signing half, because nothing on this
wire is signed (Scope). Every package file and sidecar also goes out through that spec's
`ServeFile` form behind `Documents` in `Deps` (its resolved handler-rendered decision, was Q14,
AC32). A conda handler without it can serve no subdir at all, which is why Phase 1 waited on
that spec.

**The management API is `planned`, which Phase 2 required.** Publishing a file, deleting one,
patching a record, revoking and unrevoking, attaching an attestation to an existing file, and
setting channel notices are operations of `docs/internal/plans/foundation/management-api.md`
(planned on Fable 2026-09-30), placed on its closed kind vocabulary by its cross-format
reconciliation table (`publish`, `annotate`, `withdraw` and `restore`, `attach`,
`delete-file`), with the two upload shapes `rattler-build` drives declared as bindings onto
`publish` through the handler's `Operator` interface (Design, "The publish path" and "Patch,
revoke, remove and notices are management operations"). AC3, AC4, AC5, AC22 and AC23 are
untestable until that surface exists.

**The shared-layer pieces the path-carried token needs now exist in their owners.** The
`/t/{token}/` segment is the root path token of `auth.md`'s presentation-form table (universal,
extracted, marked secret, verified and stripped by the shared authorizer before routing; its
AC31), the registration layer holds `t` in `format-handler-interface.md`'s reserved-segment table
with an AC11 fixture, and the same token inserted into an upstream URL is the `path-token`
credential kind of `docs/internal/plans/foundation/upstream-adapters.md` (template `/t/{token}/`
after the host, root host only; its AC19 and AC20). All three are `planned`; Phase 1 relies on
the first two and Phase 3 on the third, and none is re-specified here.

## Scope

**In scope:**

- The channel layout under the format-first mount `/conda/{repository}/`: `{subdir}/{filename}`
  package files in both artifact formats, the per-subdir index in every representation the
  pinned clients request (`repodata.json`, `repodata.json.zst`, `repodata.json.bz2`,
  `current_repodata.json` with its compressed forms, `repodata_shards.msgpack.zst` and the
  `{sha256}.msgpack.zst` shards), `run_exports.json`, and the channel-root `channeldata.json`
  and `notices.json`.
- Every index document as a generated, unsigned, write-triggered document of the shared index
  service, regenerated inside the write that changes it, stored, CAS-backed above the inline
  threshold, and the requirements this places on `signing-service.md`.
- Repodata patching as this registry's own management state: per-file record overrides, the
  `removed` list, and revocation with its `package_has_been_revoked` dependency, applied at
  generation exactly as `conda-index` applies `patch_instructions.json`.
- The publish path: two bindings onto one registry-owned publish operation, the path-addressed
  `PUT` that `rattler-build upload artifactory` sends and the multipart `POST` that
  `rattler-build upload prefix` sends, with ingest validation against the package's own
  `info/index.json`, server-computed digests, immutability and the core-held retirement set, and
  the write-boundary declaration `data-model.md` requires.
- The management operations this format needs from the management API: publish, delete a file,
  patch a record, revoke and unrevoke, attach a CEP-50 attestation to an existing file, set
  notices, each bound onto the kind and action `management-api.md`'s vocabulary assigns it.
- Name, version, build, subdir and filename rules exactly as CEP-26 states them, the mandatory
  `noarch` subdir, and the filename grammar the registry parses.
- Non-interactive authentication in every form the pinned clients send: HTTP Basic from URL
  userinfo and from each client's stored login, Bearer, and the `/t/{token}/` path segment; the
  per-route addressed objects `auth.md`'s pattern scopes evaluate (AC9); and the `403`
  rendering of a shared policy refusal (AC10).
- Integrity and provenance: the `sha256` and `md5` every record carries and every client checks,
  CEP-50 attestation sidecars stored and served, and what is required of
  `artifact-verification.md`.
- The proxied path against a conda channel on any of the captured hosts (anaconda.org with or
  without a token, prefix.dev, a quetz server, an Artifactory repository, a plain file server):
  classification per resource, stream-and-verify against the record's `sha256`, shards verified
  against their own names, `base_url` and `shards_base_url` rewriting, conditional revalidation,
  negative caching, conda-forge scale, and conda's rows of the upstream-removal table.
- Virtual repositories, with the per-subdir merge rules (the resolved virtual-repository decision
  below), because nothing on this wire is signed under a repository name.
- The handler's `Capabilities()` declaration, repository rename and virtual aggregation
  (Design, "Capabilities and lifecycle").
- Two pinned generations of both conda and the mamba family, and pixi, as the conformance
  oracles on both paths.

**Out of scope for v1**, each with its reason, recorded because the interface spec's definition
of done requires the deliberately unimplemented surface to be named:

- **JLAP incremental repodata (`repodata.jlap`).** conda 24.1.2 requests it only under
  `experimental: jlap` and never did in any capture, conda 26.7.1 no longer ships the interface
  at all (`conda/gateways/repodata/jlap` is absent from the pinned image), and conda-forge
  answers `{"error":"jlap is no longer supported"}`. Sharded repodata replaced it; serving it
  would be a surface no maintained client reads.
- **`conda-content-trust` signing metadata** (the `signatures` key in records, `*.root.json` and
  `key_mgr.json` under `signing_metadata_url_base`). CEP-36 declares the `signatures` key a
  proprietary extension clients ignore, conda verifies it only when `extra_safety_checks` is set
  and only the defaults channel publishes it, and no pinned client requested any trust file. A
  hosted channel therefore carries no `signatures`; a proxied channel passes the key through
  verbatim. Revisited by revising this spec when a client verifies by default, at which point it
  becomes a signing-service requirement.
- **The anaconda.org and quetz upload protocols as bindings.** Both were captured (Design, "The
  publish path") and both were declined for reasons that are not effort: anaconda.org's is a
  six-request staging flow that emulates an S3 presigned form post and a package-and-release
  object model with labels that the shared model does not have; quetz's carries its credential
  in an `X-API-Key` header, a presentation form the central verifier does not know, and takes a
  `force=` parameter whose "true" position contradicts the immutability rule. The resolved
  upload-binding decision below records the choice.
- **anaconda.org labels as URL forms** (`{owner}/label/{label}`). A label is a filtered view of
  one channel; the shared model's environment pointers and promotion are that feature, and a
  second, path-shaped view of the same content would be a parallel mechanism.
- **Channel relations** (CEP-42's `channel_relations` in `info`). No pinned client acted on it
  and none was captured requesting a related channel. Hosted repodata carries none; proxied
  repodata passes it through verbatim, relative paths intact.
- **Generating the CEP-48 `v3` key.** conda-index exposes it only behind an experimental flag
  (`--repodata-next`); hosted repodata stays version 1 and proxied repodata passes a `v3` key
  through verbatim.
- **`index.html` and `rss.xml`.** conda-index writes them; no client reads them; a browsing
  surface is UI-era work.
- **Transmuting `.tar.bz2` into `.conda`** (and the `legacy_bz2_md5` fields that record it). A
  publisher uploads the formats it built; the registry lists what it has.
- **S3 and OCI channel transports.** pixi's mirror configuration can point a channel at
  `s3://` and `oci://ghcr.io/channel-mirrors`; the first is a different transport and the second
  is the OCI format's wire, served by `oci.md`'s handler.

## Design

### The wire surface, as captured

Every path below hangs off the repository's base URL, `/conda/{repository}/`, format-first per
`format-handler-interface.md`'s resolved URL-shape decision. Every pinned client takes an
arbitrary channel URL (`-c http://host/path`, pixi's `--channel`, `custom_channels` and
`channel_alias`), so no root anchoring is needed for the channel itself; the one root-anchored
claim this format makes is the `/t/` token prefix (Design, "Authentication"), which the clients
insert between the host and the channel path.

| Surface | Shape, as the pinned clients send it |
|---|---|
| Sharded index | `GET {chan}/{subdir}/repodata_shards.msgpack.zst`, for the platform subdir and for `noarch`, on **every** command that resolves, by conda 26.7.1, mamba 2.9.0 and pixi 0.81.0 (never by conda 24.1.2 or micromamba 2.3.3, which predate CEP-16 support). mamba 2.9.0 sends a `HEAD` for it and for `repodata.json.zst` before choosing; pixi and conda 26 send the `GET` directly. Once cached, conda 26, pixi and micromamba revalidate with `If-None-Match` and `If-Modified-Since` and take the `304`; mamba 2.9.0 did not revalidate the index after the `max-age` elapsed in two runs of this pass (its state file carries a negative `mtime_ns`), which the corpus records rather than this spec explaining |
| Shards | `GET {chan}/{subdir}/{sha256 hex}.msgpack.zst`, one per package name the solve touches, transitively (`demo-app` then `demo`), by the three sharded clients; pixi sends `Cache-Control: no-store` on these requests. The URL is `{shards_base_url}{sha256}.msgpack.zst` where `shards_base_url` comes from the index (empty in every live channel sampled) |
| Compressed monolithic index | `GET {chan}/{subdir}/repodata.json.zst` first by conda 24.1.2 (`repodata_use_zst` defaults to true in both conda generations) and by micromamba 2.3.3 after a `HEAD`; by conda 26.7.1, mamba 2.9.0 and pixi only after the sharded index answers `404`. pixi `HEAD`s both `repodata.json.zst` and `repodata.json.bz2` before deciding and fetches the `.zst`; nothing fetched a `.bz2` in any capture, and pixi would only when `.zst` is absent and `.bz2` present |
| Monolithic index | `GET {chan}/{subdir}/repodata.json`, the last fallback of every client (conda after a `.zst` `4xx` other than `416`; micromamba and mamba after their `HEAD`s; pixi after its `HEAD`s, with `Accept-Encoding: gzip`). conda remembers a `404` on a sharded index or a `.zst` for **seven days** (`CHECK_ALTERNATE_FORMAT_INTERVAL` in the pinned source; `has_shards` and `has_zst` with `last_checked` in its `.info.json`), pixi likewise keeps `has_zst` and `has_bz2` with `last_checked`, micromamba `has_zst`; a channel that gains a representation is therefore not noticed by an existing cache for a week |
| Current index | `GET {chan}/{subdir}/current_repodata.json.zst` (then `repodata.json.zst` when the solve needs more) by conda 26.7.1 and 24.1.2 **only** under `--solver classic`; never by the default libmamba solver, by mamba, micromamba or pixi |
| Notices | `GET {chan}/notices.json` on every command by conda 26.7.1 and pixi, credentials included; a `404` is silent; a notice is printed (`[info] ... stub channel notice`; pixi's boxed "Info channel notice" with its expiry). Not requested by conda 24.1.2, mamba or micromamba |
| Channel-wide documents | `channeldata.json`, `run_exports.json` and `index.html` were requested by no pinned client in any capture; they are served for their documented consumers (a UI, conda-build and rattler-build's run-exports lookups) and are generated with the rest |
| Package files | `GET {chan}/{subdir}/{name}-{version}-{build}.conda` or `.tar.bz2`, the URL built from the record's subdir and filename, or from `info.base_url` when the index carries one (below). Every client prefers `.conda` when both formats of one build are listed (conda 24, conda 26, micromamba, pixi), except mamba 2.9.0, which chose the `.tar.bz2` twice; `use_only_tar_bz2` makes conda 24.1.2 choose the `.tar.bz2` and is ignored by conda 26.7.1, mamba and micromamba. Every client verifies the downloaded bytes against the record's `sha256` and refuses on mismatch (below) |
| `base_url` | conda 26.7.1, mamba 2.9.0, micromamba 2.3.3 and pixi fetch a package from `{info.base_url}{filename}` when a version-2 index carries `base_url` (captured: the files served from `/files/{subdir}/` while the index lived under `/baseurl/{subdir}/`, and pixi's lockfile recording the `/files/` URL). conda 24.1.2 ignores the field, requests the file beside the index and fails on the `404`, consistent with conda-index's note that the field needs conda 24.5 or later |
| Token prefix | `GET /t/{token}/{chan}/...` on every request, index, shard, notice and package alike, when the channel URL was given in that form (all five clients) or a token was stored for the host: `mamba auth login {host} --token`, `micromamba auth login --token` and `pixi auth login {host} --conda-token` all rewrite the URL (captured `/t/TOK999/...` and `/t/TOK456/...`) rather than sending a header |
| Request headers | conda: `User-Agent: conda/{version} requests/... solver/libmamba conda-libmamba-solver/... libmambapy/...` (26.7.1 appends `aau/0.8.1` and per-run `c/`, `s/` and `e/` identifiers), `Accept-Encoding: gzip, deflate, br, zstd`, `Accept: */*`, never a `Range`. mamba and micromamba: `User-Agent: mamba/{version} libcurl/...`, `Accept: */*`, `Accept-Encoding: deflate, gzip, zstd` only on the monolithic JSON. pixi: `User-Agent: pixi/0.81.0`, `Accept-Encoding: zstd,gzip,deflate` (`gzip` alone on the monolithic JSON) |
| Failure rendering | conda: a `401` on an index prints `CondaHTTPError: HTTP 401 Unauthorized ... The credentials you have provided for this URL are invalid` and the configuration help (26.7.1 and 24.1.2 alike); a `403` on a package prints `CondaHTTPError: HTTP 403 Forbidden ... You do not have permission to access this resource` naming authentication and a private channel as causes (26.7.1) or `HTTP 403 FORBIDDEN ... An HTTP error occurred ... a simple retry will get you on your way` (24.1.2); a `404` on a subdir prints `UnavailableInvalidChannel` with `conda config --show channels` help; a missing package prints `PackagesNotFoundInChannelsError` (26.7.1) or `PackagesNotFoundError` (24.1.2) with the anaconda.org search hint. mamba and micromamba: `Subdir {url} not loaded!` after a `401` or a `404` on both representations, `Failed to download package from {url} (status 403)` for a refused package, `does not exist (perhaps a typo or a missing channel)` for a missing package. pixi: `HTTP status client error (401 Unauthorized) for url (...)`, `could not find subdir 'noarch' in channel`, `failed to fetch {file} ... HTTP status client error (403 Forbidden)`, `No candidates were found for {spec}` |

Three facts about the clients' caches shape every second-request assertion. Every client honours
the index's `Cache-Control: max-age` (`local_repodata_ttl` defaults to 1 in conda, meaning "obey
the header"; pixi and micromamba store `cache_control` beside `etag` and `mod` and made no index
request inside the window), so a warm run within the TTL costs no index request at all, and a
run after it costs one conditional request per subdir answered `304`; notices are the exception,
fetched by conda 26 and pixi on every command regardless. Package files are cached by filename
and reused across channels (micromamba warns `Extracted package cache ... has invalid url` and
installs from it anyway), so a case that proves this registry served a package asserts at the
network layer from a fresh package cache. And `--offline` makes zero requests on every client
(captured), so the offline case is a network-layer assertion too.

### The index is one document in five representations

What a subdir carries, as conda-index writes it and the clients read it, all produced from one
stored state (Design, "Every hosted index document is a write-triggered document"):

| Document | Content | Who reads it |
|---|---|---|
| `repodata.json` | `info` (`subdir`; `base_url` and `repodata_version: 2` only when packages live elsewhere), `packages` (one record per `.tar.bz2` filename), `packages.conda` (one per `.conda` filename), `removed` (filenames removed by patch instructions), `repodata_version` (1). A record carries every `info/index.json` field of the package (`build`, `build_number`, `depends`, `constrains`, `license`, `license_family`, `name`, `noarch`, `subdir`, `timestamp`, `version`, and any `run_exports`, `python_site_packages_path` or `track_features` present) plus the server-computed `md5`, `sha256` and `size` of the artifact, with the patch overlay applied and `revoked: true` on a revoked record | The last fallback of every client; `mamba search` reads it directly |
| `repodata.json.zst`, `repodata.json.bz2` | The same bytes compressed; CEP-36 marks `.bz2` deprecated and `.zst` recommended | `.zst`: conda 24, micromamba, and every sharded client on fallback; `.bz2`: pixi only when `.zst` is absent |
| `current_repodata.json` (+ `.zst`, `.bz2`) | The newest version of each package name, the versions a pin file names, and whatever older records are needed to satisfy their dependencies (`build_current_repodata` in conda-index); revoked and removed records are simply absent from it. conda-index's rule kept the revoked `demo-1.1` as "newest" in this pass, so the registry generates it from the patched records (below) rather than from the raw ones | `conda --solver classic` only |
| `repodata_shards.msgpack.zst` | A zstd-compressed msgpack map: `version: 1`, `info` with `subdir`, `created_at` (conda-index writes its own run time; this registry writes the triggering write's commit time, which the runtime hands the generator, so the bytes are deterministic under `signing-service.md` AC25), and `base_url` and `shards_base_url` (both present, empty strings when packages and shards live beside the index; conda 26's own source notes that rattler and pixi require the keys), and `shards`, a map from package name to the 32-byte SHA-256 of that name's shard file | conda 26, mamba 2.9, pixi |
| `{sha256 hex}.msgpack.zst` | One shard per package name: `packages` and `packages.conda` maps of the records for that name, with `run_exports` inlined (CEP-21); the filename is the SHA-256 of the compressed bytes, verified by this pass on a generated shard and a live conda-forge shard. conda-index 0.13.0 encodes each record's `md5` and `sha256` as raw bytes; live conda-forge shards carry hex strings; both decode in the three sharded clients | The same three |
| `run_exports.json` (+ `.zst`, `.bz2`) | `info` with `subdir` and `version: 1`, and per-filename `run_exports` maps (`weak`, `strong`, `weak_constrains`, `strong_constrains`, `noarch`) read from each package's `info/run_exports.json` at ingest (the file conda-index's cache extracts for it; `index.json` carries none), which CEP-12 requires to reflect the archives and never be patched; CEP-12 specifies no compressed form, so the `.zst` and `.bz2` are conda-index's convention followed here | conda-build and rattler-build when pinning; no pinned client |
| `channeldata.json` (channel root) | `channeldata_version: 1`, `subdirs`, and per-package channel-wide metadata, the fields conda-index's `CHANNELDATA_FIELDS` names (`version`, `subdirs`, `summary`, `description`, `home`, `license`, `dev_url`, `doc_url`, `icon_url`, `timestamp`, `run_exports` per version, `tags`, and the `activate.d`, `deactivate.d`, `pre_link`, `post_link`, `pre_unlink`, `binary_prefix` and `text_prefix` flags), derived at generation from the newest version of each name over the records' ingest-extracted `about` data, never stored as a document of its own | No pinned client; a UI |
| `notices.json` (channel root) | CEP-6: `notices`, each with `id`, `message`, `level`, `created_at`, `expires_at` | conda 26.7.1 and pixi on every command |

Two consequences of the representation set are load-bearing. **They must be regenerated
together**: a client generation that reads shards and one that reads the monolithic JSON must
see the same records at the same moment, or a CI fleet mixing conda 24 and pixi resolves two
different channels. And **shards are immutable while the index is not**: a shard's name is its
content, so a shard is cached forever and a new record for a name produces a new shard under a
new name, while the index that maps names to shards is the one small mutable document (973 KB
for all of conda-forge noarch) that carries the TTL.

### Mapping onto the shared model

The levels are exactly those `data-model.md` provides; no table is added.

- `Package.name` holds the package name under CEP-26's grammar, lowercase by construction
  (`^(([a-z0-9])|([a-z0-9_](?!_)))[._-]?([a-z0-9]+(\.|-|_|$))*$`, at most 64 characters), so
  there is no folding and no display spelling. The package-level document holds nothing this
  format reads: the package's `channeldata.json` entry is derived at generation from its newest
  version's record (below), because a stored entry would have to be recomputed by every publish
  of an older version and every removal of the newest, the half-applied-write shape this project
  names as its most recurrent defect. The **retirement set** (every `{subdir}/{filename}` this
  repository ever removed) is not in it: it is the core-held `Retirement` record
  `management-api.md` moved it to ("Retirement is core-held", its resolved retirement-placement
  decision, was Q3) and `data-model.md` owns (its entity table, AC35). The handler returns each
  removed file's coordinate `{subdir}/{filename}` in the removal's `Outcome`, the core writes the
  record in the removing transaction, and the shared write path refuses a later publish whose
  target coordinate is retired with `retired` (409), across a backwards repoint and after every
  snapshot that held the file is pruned, with nothing for this handler to carry forward. The
  served `removed` list is a separate thing: format state the removal's `Apply` appends to the
  subdir's entry in the repository-level document, rendered by the generator, so it is snapshot
  content that a repoint restores exactly as it restores the records beside it.
- `Version.version` holds the version string verbatim under CEP-26's grammar (digits, periods,
  lowercase letters, underscores, `+` and `!`, at most 64 characters); a conda version has many
  builds (`py39_0`, `py310_0`, `h0_0`), so the version-level document holds a **filename-keyed
  map** of records, one per artifact file, as `pypi.md` and `maven.md` keep per-file attributes:
  the fields from the artifact's `info/index.json`, the `run_exports` map from its
  `info/run_exports.json`, the `about` data conda-index's cache extracts for `channeldata.json`
  (`info/about.json`'s fields and the activation and prefix flags conda-index derives from the
  package's file list), the server-computed `md5`, `sha256` and `size`, the `subdir`, the
  **patch overlay** for that file (the field replacements a hotfix applies, exactly the shape of
  one `patch_instructions.json` entry), the `revoked` flag, and the `attestations_sha256` when a
  CEP-50 sidecar exists. Everything a generated document needs is extracted once at ingest, so
  no generator ever reopens an archive. The join against the version's `File` rows is by
  filename.
- Every artifact file is a `File` of the version at the relative path `{subdir}/{filename}`, its
  `Blob` keyed by the CAS digest of the bytes as received; that digest is exactly the `sha256`
  the record advertises and every client verifies, so the CAS key and the format's integrity
  value coincide as they do for Cargo and Hex, and the key is still the store's digest of the
  received bytes. The `md5` is computed at ingest and kept in the record because every record
  must carry it (CEP-36). A `.tar.bz2` and a `.conda` of the same build are two files of one
  version, listed under `packages` and `packages.conda` respectively.
- A CEP-50 attestation sidecar is a further, append-only `File` of the version at
  `{subdir}/{filename}.sigs.{sha256}`, whose digest the record's `attestations_sha256` names.
- The repository-level document holds the subdir list, each subdir's `removed` list, the
  generated documents per subdir (each representation's reference, inline below the threshold
  and a CAS blob above it), the per-name shard references on the shard index's declared
  blob-digest list (below), `channeldata.json`, the notices, and the identity of the generation
  that produced them; a `remote` repository's document caches the upstream's documents and the
  **digest index** the proxied path needs (below) instead.

### Every hosted index document is a write-triggered document

Per the resolved generation decision below, every representation in the table above is produced
by the shared signing and index service inside the write that changes it, **stored, never
rendered on request**: the per-subdir documents and the shard index in the repository-level
document, each shard as a CAS blob under its own digest, the whole set protected by the fourth GC
mark root (`storage-and-gc.md` AC16). The trigger is the shared write path's, not the handler's:
the index runtime is the registered consumer of the pre-commit hook every write transaction runs
(`data-model.md` AC37, `storage-and-gc.md` AC25), so a wire publish, a management operation, a
seeded `state` entry and a retention pass all come out with regenerated documents and the
handler holds no code that requests regeneration (`signing-service.md`, "The write path
dispatches; the handler cannot forget", AC1). The bytes come from conda's generator package,
`internal/format/conda/index`, which is pure (records in, bytes out) and imports nothing of the
registry beyond `internal/index`'s value types (`signing-service.md` AC2); the handler's own
package holds no renderer. Rendering on request was rejected because a conda-forge
noarch index is 188 MB and a resolve by a sharded client is one index plus a handful of shards,
so the read path must be a byte copy, and because a subdir is a repository-wide document under
exactly the concurrency `maven.md` captured on its metadata.

The rules the service applies for this format, stated as this format's requirements rather than
as the service's design:

- **Regeneration inside the write.** A file landing in `{subdir}` regenerates that subdir's
  `repodata.json` with its `.zst` and `.bz2`, `current_repodata.json` with its compressed forms,
  `run_exports.json` with its compressed forms, the shard of the file's package name and the
  shard index, and the channel's `channeldata.json`; a patch, revocation or removal regenerates
  the same set minus `run_exports.json`, which CEP-12 forbids patching; an attestation attached
  to an existing file regenerates the record's shard, the shard index and the monolithic forms,
  since the record's `attestations_sha256` changes; a notices change regenerates only
  `notices.json`. Each lands in the same completed logical write and the same
  snapshot as the change that triggered it, so no snapshot serves a shard index that names a
  shard the snapshot does not hold, or a `.zst` that disagrees with its `.json`
  (`data-model.md`'s one-write-one-snapshot rule; the prototype's question 3).
- **Under contention, both land.** Two concurrent publishes into one subdir each produce an index
  that enumerates the other's file once both are complete: the runtime takes a per-document
  transaction lock before it regenerates, with the revision-token retry `data-model.md` makes
  mandatory for what the lock does not cover (`signing-service.md`, "Contention: serialise per
  document, then retry", AC28). Two publishes are two snapshots, each listing exactly what it
  holds, never one merged regeneration.
- **Patch instructions are applied at generation**, in conda-index's order and semantics
  (`_apply_instructions`): field replacements from the per-file overlay merged over the raw
  record, `revoke` setting `revoked: true` and appending `package_has_been_revoked` to `depends`,
  `remove` dropping the record and listing the filename under `removed`, with one deliberate
  difference from conda-index: a removal here names one file and never its `.tar.bz2` or
  `.conda` twin, because each is its own `File` and its own management object. The overlay may
  replace any index field except the identity fields (`name`, `version`, `build`, `subdir`),
  the integrity fields (`md5`, `sha256`, `size`) and `run_exports`, the last because a shard
  inlines the record's `run_exports` (CEP-21) and `run_exports.json` must reflect the archive
  (CEP-12), so a patched value would make the two disagree; an overlay naming one of those is
  refused `validation`. The raw records never change; a patch is state beside them, so
  unpatching is a metadata write like patching.
- **Shards are content-addressed and encoded as conda-index encodes them**: msgpack, zstd,
  digests as raw bytes, `run_exports` inlined, the index carrying `base_url` and
  `shards_base_url` as empty strings and `created_at` as the triggering write's commit time
  (never the clock, so the generator stays deterministic; the value reaches it in the write's
  input, `signing-service.md`'s `Generate` contract); the shard's filename is the SHA-256 of its
  compressed bytes, which is what conda 26 (`shard_url` in the pinned source) and rattler build
  the URL from. A package name whose records did not change keeps its shard and its name across
  regenerations, so a publish of one package costs one new shard and one new index, never a
  rewrite of the subdir. **The shard index's declared blob-digest list holds every shard it
  names and every shard the previous generation of that index named**, and the shard route
  resolves a digest against that list: a client that fetched the index inside its `max-age`
  and solves after a publish has replaced one shard still fetches the shard its index names,
  instead of a `404` on a content-addressed route whose consequence no capture recorded. The
  previous generation leaves the list at the next regeneration, so each list holds at most two
  generations of one subdir's shards and the sweep keeps exactly those (`storage-and-gc.md`
  AC16, `data-model.md` AC37). The monolithic forms have no such window: they are one document
  each, replaced whole.
- **The `ETag` of a stored document is derived from its bytes**, so identical documents across
  snapshots share a tag, a repoint that changes the document changes it, and a `304` costs no
  generation. Every generated document is served through the runtime's `index.ServeDocument`,
  never by headers the handler sets (`signing-service.md` AC11): its `Last-Modified` is the
  serving pointer's forward-moving `moved_at` (`data-model.md`, "Freshness scoped to the
  pointer", AC36) for a document whose bytes changed at that transition, and a conditional
  request is answered `304` only on an exact `If-Modified-Since` match or a matching `ETag`.
  conda's clients revalidate with both headers and a rollback changes the `ETag`, so a rollback
  reaches them at their next revalidation. The profile carries this format's serve policy:
  range support and `Cache-Control: public, max-age=60` on every index document, at the low end
  of CEP-16's recommended 60-second-to-one-hour range, and `Cache-Control: public,
  max-age=31536000, immutable` on every shard, because a shard is content-bound. The value is
  per format and no repository configuration changes it (`signing-service.md`'s resolved
  Cache-Control decision, was Q18, AC30): this spec first made the index `max-age` a
  per-repository setting, which that decision declined, since a longer value only delays when a
  client asks and so hides a rollback for its length. Package files and CEP-50 sidecars are
  stored files, served through the runtime's `ServeFile` with the CAS digest as a strong `ETag`
  and byte ranges, under a package-level serve policy carrying the same `immutable` header for
  packages and the content-addressed sidecar and `no-cache` for the mutable `.sigs` URL, never by
  headers the handler sets (its resolved handler-rendered decision, was Q14, AC11, AC32). The
  profile offers **no content encoding on any key**: the compressed representations are this
  format's compression, a client that wants fewer bytes asks for the `.zst`, and `Accept-Encoding:
  gzip` on the monolithic JSON (pixi, conda) is answered with the identity bytes, which every
  client accepts (captured). A `HEAD` on any index route, which mamba sends for the shard index
  and the `.zst` and pixi for the `.zst` and `.bz2` before choosing, answers the `GET`'s status
  and headers with no body, the ordinary `net/http` behaviour of the serving door.
- **A repoint restores the documents.** Because the documents live in the snapshot delta, a
  rollback serves exactly the index of the snapshot it targets, its `removed` lists included; the
  retirement set is core-held and untouched by a repoint (`data-model.md` AC33 and AC35), so a
  file removed after the target snapshot serves again from it while its coordinate stays
  unpublishable.
- **Virtual repositories merge** (the resolved virtual-repository decision below): a `virtual`
  repository's per-subdir index is the union of its members' records in member order, the first
  member holding a filename winning a collision, its `removed` list the union less every
  filename some member's records still list (a file removed from one member and present in
  another is served, so it is not removed), its `current_repodata.json` and compressed forms
  derived from the merged records rather than merged from the members' (so the merge reads no
  member's `current_repodata.json`), its shard index the union of names with a merged shard per
  name that appears in several members (content-addressed by its own merged bytes),
  `run_exports.json` the union by filename with the first member's entry winning,
  `channeldata.json` the union by package with the first member's entry winning, and
  `notices.json` the union by notice `id` with the first member's notice winning; `base_url` and
  `shards_base_url` stay empty so every package and shard resolves through the virtual URL and
  then through the members in order. The merged shard index's declared list holds every merged
  shard and the profile declares one predecessor generation retained, for the same `max-age`
  window as on the hosted path, so a merged shard is held by the virtual's own merged set and
  not by any member (`signing-service.md` AC19's declared list on the swap), and a member-held
  shard resolves through that member. The merge is the generator's `Merge`, run as the deferred `index.merge` job on
  the shared runner, enqueued by a member's write with the virtual as coalesce key, at the
  virtual's creation and on every member-list change, and never on a request's path; it creates
  no snapshot, and the previous merged set serves until the new one commits
  (`signing-service.md`, "Virtual merges", AC19). Each merge commit and member-list change moves
  the virtual's pointer record forward, so the merged documents' `Last-Modified` never goes back
  (its resolved virtual-freshness decision, was Q15, AC34).
- **Remote members are read through their cached documents, and kept fresh by the virtual's
  reads.** Nothing on this wire is signed, so every remote document is adopted under anchor
  class `none` with verdict `absent`, and it contributes: `signing-service.md`'s admission rule
  binds signed bodies only and states that an unsigned virtual applies no admission rule (its
  resolved admission decision, was Q20, AC36), and a conda virtual signs nothing, so its merged
  index vouches for nothing a client could mistake for the registry's verification; each client
  checks every package against the record's `sha256` as it would at the remote's own URL. A
  remote member adopting a new upstream revision of a document the merge reads enqueues
  `index.merge` for every virtual listing it inside the adoption transaction, through the
  runtime's adoption hook (`signing-service.md`'s resolved remote-member decision, was Q16,
  AC35; `proxy-cache.md` AC25). A remote reached only through the virtual receives no request of
  its own, so serving a merged document whose input from the remote is past the remote's TTL
  enqueues one coalesced `proxy.revalidate` job that replays the remote's own routes below the
  authorizer, never on the request's path (`proxy-cache.md`, "Revalidation outside the request",
  AC26). The profile declares a **member input** for every document the `Merge` reads from a
  member, in the shapes `signing-service.md`'s resolved member-input decision admits (was Q21,
  AC35; registration refuses a merging profile with a member-read key and no input): per subdir,
  **templates over one variable, `{subdir}`**, sourced from the subdirs the virtual's other
  members hold plus the format constant `noarch`, with the grammar CEP-26 gives a subdir
  (`noarch` or `{os}-{arch}`, one segment, lowercase letters, digits and one hyphen), expanding
  to `{subdir}/repodata.json.zst` (the record set, in the compressed form the resolved
  member-input-representation decision below chose, was Q11), `{subdir}/repodata_shards.msgpack.zst`
  (the name-to-shard map, so a name held by one member keeps that member's shard digest; a
  member answering `404` for it contributes its names through shards the merge encodes from its
  records) and `{subdir}/run_exports.json` (CEP-12 specifies no compressed form); at the channel
  root, the literals `channeldata.json` and `notices.json`. The merge reads no
  `current_repodata.json` and no `repodata.json` from any member. A virtual's creation, or a
  member-list change adding a remote never adopted, replays these inputs on that remote for
  `noarch` and for every subdir another member of the virtual holds, whether or not a direct
  client of the remote ever asked for them, so the virtual lists the remote's records there with
  no request ever made to the remote's own URL. **A subdir only the remote holds is fetched
  read-driven**: a request to the virtual for `{subdir}/...` at a subdir no member input covered,
  whose value fits the grammar, is answered from the merged set as it stands (`404` for that
  subdir, which every client treats as "nothing for this platform" and resolves from `noarch`),
  records the cell on the virtual's input record and enqueues each remote member's revalidation;
  the replay then requests that subdir's inputs, a subdir the upstream answers `404` becomes the
  remote's negative entry and is not asked again until it lapses, and a subdir it holds is in
  the merged set within the staleness bound, so the client's next resolve sees it. The cell set
  is bounded at `index.requested_cells_max` (256 by default) per virtual and pruned once the
  route is cached or the negative entry lapsed unrequested (its resolved requested-cell decision,
  was Q22; `proxy-cache.md` AC26; `data-model.md` AC45); the pinned clients request only their
  own platform subdir and `noarch`, so a virtual sees a handful of cells, and the grammar keeps a
  request from recording anything that is not a subdir name.

### What the signing and index service must provide

Stated so the dependency on `docs/internal/plans/foundation/signing-service.md` cannot be lost,
each item mapped onto that spec's generator contract (its "Who depends on this" table lists
conda's five items as an unsigned generated index):

1. **Unsigned generation of a subdir's document set** from the version-level records of every
   file under that subdir: the monolithic JSON in conda-index's compact, key-sorted form, its
   `.zst` and `.bz2`, the current index by conda-index's `build_current_repodata` rule over the
   patched records, `run_exports.json` from the unpatched records, and the CEP-16 shard index
   with one shard per package name, encoded as conda-index 0.13.0 encodes them; plus the
   channel-root `channeldata.json` over every subdir. This is the generator's `Generate`, written
   to the CAS as it is produced rather than buffered whole; its `Profile` declares no signing
   profile, so no key is created and no signature record written (`signing-service.md` AC24).
2. **Patch application at generation** with conda-index's `_apply_instructions` semantics over
   the per-file overlay, the revocation flag and the subdir's `removed` list the handler stores.
   That format knowledge lives in the generator package, as `signing-service.md` places it ("The
   generator contract, and where a generator lives").
3. **Regeneration inside the triggering write**, dispatched by the pre-commit hook (AC1 there),
   under the per-document lock and the revision-token retry (AC28 there), with the incremental
   property that an unchanged package name keeps its shard: the generator's `Affects` maps a
   change to the keys it invalidates and every other key keeps its bytes and `ETag` (AC4 there).
4. **Storage as CAS-backed metadata above the inline threshold** with byte-derived `ETag`s,
   served by a stream copy through `ServeDocument` (AC5 and AC11 there), so a conda-forge-sized
   mirror (AC18) is a set of blobs the fourth mark root protects.
5. **The virtual merge** with the rules above, the generator's `Merge` on the `index.merge` job
   (AC19 there), its merged shard index declaring the merged shards with one predecessor
   generation, re-run when a remote member adopts a new revision and fed a never-adopted
   remote's first fetch through the `{subdir}` templates and root literals the profile declares,
   with a remote-only subdir fetched read-driven from the virtual's own miss (AC35 there, the gap
   this spec reported now met by its resolved member-input decision, was Q21), with the
   virtual's freshness moving forward at every merge commit (AC34 there). The generator declares
   no `DeriveInputs` derivation, so the profile's round bound is one.

Nothing is required of the service's signing half or of a verification entry on its side:
conda channels sign nothing a client verifies by default, and the CEP-27 attestation verdict is
`artifact-verification.md`'s (Design, "Integrity, signing and provenance").

### The publish path and what counts as a write

The conda ecosystem has no publish wire contract. What it has is four proprietary upload APIs,
all four driven by one client in this pass (`rattler-build upload`, whose targets are `prefix`,
`anaconda`, `quetz`, `artifactory`, `cloudsmith` and `s3`), captured against the stub:

| Target | What the client sends |
|---|---|
| Artifactory | `PUT {server}/{repo}/{subdir}/{filename}` with the raw package bytes, `Transfer-Encoding: chunked`, `Authorization: Basic` from `--username`/`--password`, one request per file; a `401` is reported as `Server responded with error ... HTTP status client error (401 Unauthorized) for url (...)`. The subdir comes from the package's own `info/index.json` |
| prefix.dev | `POST {server}/api/v1/upload/{channel}` as `multipart/form-data` with one part, `file`, carrying the package under its filename, `Authorization: Bearer {api key}`, one request per file |
| quetz | `POST {server}/api/channels/{channel}/upload/{filename}?force=false&sha256={hex}` with the raw bytes, chunked, `X-API-Key: {api key}` |
| anaconda.org | `Authorization: token {api key}` on every request: `GET /package/{owner}/{name}` (404 on a new package) then `POST /package/{owner}/{name}` with `public`, `publish` and `public_attrs`; `GET /release/{owner}/{name}/{version}` then `POST /release/...` with `requirements`, `announce`, `description`, `home`, `license`, `summary`; `POST /stage/{owner}/{name}/{version}/{subdir}/{filename}` with `distribution_type`, `attrs` (the index fields), `channels` (labels, `["main"]`) and `sha256`, answered with `post_url`, `form_data` and `dist_id`; a `multipart/form-data` `POST` to `post_url` with the form fields plus `Content-Length`, `Content-MD5` and `file` (the S3 presigned-post shape); then `POST /commit/{owner}/{name}/{version}/{subdir}/{filename}` with `dist_id`. `--force` repeats the flow unchanged; `-c` sets the label |

Per the resolved upload-binding decision below, this registry serves **two bindings onto the
`publish` kind** of `docs/internal/plans/foundation/management-api.md` (its reconciliation table's
conda row; "Bindings: one operation, two ways in"), declared through the handler's
`Operator.Bindings()` so the architecture test there proves each binding is never wider than its
operation, the route's `Scope(r)` carrying `publish`'s action and the one object `Authorize`
reports, which `Submit` evaluates on both ways in, and that both ways in produce the same snapshot
delta (its resolved binding-scope decision, was Q13 there, and its AC8):
the path-addressed `PUT /conda/{repository}/{subdir}/{filename}`
in the Artifactory shape, which is the native form of "put a file in a static layout" and which
`rattler-build upload artifactory -u {base}/conda -c {repository}` drives with HTTP Basic, the
form `auth.md` already verifies with the token as the password; and the multipart
`POST /conda/{repository}/api/v1/upload/{channel}` in the prefix.dev shape, which
`rattler-build upload prefix -u {base}/conda/{repository} -c {channel}` drives with a Bearer
token, where `{channel}` must equal the repository name and answers `404` otherwise, the same
equality rule `hex.md` applies to its organization prefix. Both carry one file per request. What
this registry enforces on ingest, on either binding:

- The body is spooled to a bounded temporary buffer outside the CAS and parsed as the format its
  filename names, the bound being `management.publish_spool_limit` (1 GiB by default): a body
  over it is refused `413` `too-large` on either binding and nothing is committed, and a package
  that large (a CUDA or PyTorch build can exceed it) is published through the API's upload
  session and `publish` operation instead (`management-api.md` AC14), which `rattler-build`
  cannot drive, a cost the resolved upload-binding record states. A `.conda` is a stored ZIP holding `metadata.json` with
  `conda_pkg_format_version: 2`, `info-{name}-{version}-{build}.tar.zst` and
  `pkg-{name}-{version}-{build}.tar.zst`; a `.tar.bz2` is a bzip2 tarball holding `info/` beside
  the payload (CEP-35). `info/index.json` is read from the info archive; a body that is not its
  named format, lacks `info/index.json`, or whose `name`, `version`, `build` or `subdir` disagree
  with the filename and the URL's subdir is refused with `422` and nothing committed, so a
  mislabelled upload cannot land under a path its metadata does not describe.
- The coordinate is `{subdir}/{name}-{version}-{build}.{ext}`, parsed from the right: `build`
  and `version` contain no `-` under CEP-26, the name may, so the filename splits at its last two
  hyphens. Name, version, build and subdir must each satisfy CEP-26's grammar and the filename
  its 211-character limit; `subdir` must be `noarch` or `{os}-{arch}`. The registry refuses what
  conda-index accepts silently (the `Mixed-1.0-0.conda` this pass indexed and no conda or mamba
  query could then find), because a record no resolver can select is a publish that succeeded
  and installs nothing.
- `md5`, `sha256` and `size` are computed from the received bytes; a `sha256` the quetz-shaped
  query string would carry is not a binding here and nothing client-supplied is trusted for
  integrity.
- **A coordinate that already exists with identical bytes is idempotent** (`201`, no snapshot: the
  CI retry): this format declares `management-api.md`'s unchanged publish, so the operation
  completes with no snapshot reference and `unchanged: true` (its resolved unchanged-publish
  decision, was Q15, AC5); **with different bytes it is refused with `409`** and `rattler-build`
  reports the status. The ecosystem's own convention is that a rebuild bumps the build number or
  the build string, and every pixi and conda lockfile pins the filename's URL and its `sha256`.
- **A retired coordinate is refused**, with the same bytes or different ones: a removed file's
  `{subdir}/{filename}` is a core-held `Retirement` record and is never republishable, the
  cross-format rule `npm.md`, `pypi.md`, `nuget.md`, `maven.md` and `hex.md` adopted. `Authorize`
  claims `{subdir}/{filename}`, finer than the `{name}/{version}/{build}` object it authorizes,
  and the shared write path checks the claim when it is declared, before `Apply`, and again at
  commit (`management-api.md`, "Retirement is core-held", its resolved retirement-check decision,
  was Q14, AC12), so a removal committing between the two cannot let the publish through; the
  refusal is the `retired` problem (409), which both bindings answer in the API's status as the
  wire's own error (its resolved central-refusal decision, was Q16), so the identical-bytes
  idempotency above never reaches a retired file. The retirement is per file: a `.conda` and its
  `.tar.bz2` twin are two coordinates, and removing one retires only it.
- A CEP-50 attestation may accompany a publish (the prefix binding's `--attestation` part when
  the client sends one, or the `publish` operation directly); it is stored as the file's
  `.sigs.{sha256}` sidecar and its digest recorded on the record, never verified by the handler
  (Design, "Integrity, signing and provenance"). A publish carrying an attestation beside bytes
  that already exist is **not** an unchanged publish: the sidecar appends and the record's
  `attestations_sha256` moves, one snapshot. An attestation for an existing file without its
  bytes is the `attach` operation (below).
- The response is `201` with a JSON body naming the stored path, the record's `sha256` and the
  snapshot; a publish to a proxied or virtual repository answers `405` with the
  `repository-type` problem before authorization is consulted (`management-api.md` AC7).

`data-model.md` requires each format spec to declare its ecosystem's write boundaries and makes
metadata-only mutations snapshot-creating writes. Conda's declaration:

- **One file upload is one completed logical write**: the file, its record and every regenerated
  document of its subdir and channel land in one snapshot, and the subdir's index served from the
  head snapshot lists the file before the response is sent. A publisher uploading a `.conda` and
  its `.tar.bz2` twin performs two writes, faithful to a wire that publishes per file.
- **Each patch, revocation, unrevocation, removal and notices change is one metadata-only write**
  regenerating what it affects (above). A removal is a removal-class write: the file leaves the
  head snapshot, its filename enters the subdir's `removed` list, and the core writes its
  `Retirement` record, all in the same transaction.
- **A bulk patch** (one instruction set naming many files, the shape conda-forge's patches take)
  is one write however many records it changes, per `data-model.md`'s bulk-operation rule.
- A proxied repository creates no snapshots at all; document arrival and revalidation are cache
  materialisation.

### Patch, revoke, remove and notices are management operations

No conda-family client mutates a channel: `conda`, `mamba` and `pixi` only read, and
`rattler-build upload` only adds. Every operation below is therefore client-less in the sense of
`docs/internal/analysis/management-surfaces-and-the-oracle.md`: its trigger is verified by this
registry's integration tests and its effect by the real clients, which this pass captured for
each. Per the cross-format precedent (`pypi.md`'s resolved hosted-yank decision, with `npm.md`,
`ansible-collections.md`, `cargo.md`, `nuget.md`, `maven.md` and `hex.md`), each is an operation
of the registry-owned management API, `docs/internal/plans/foundation/management-api.md`, bound
onto the kind its cross-format reconciliation table assigns conda, with the action that kind
carries (its "The operation vocabulary"; a format declares kinds, never actions):

| Operation | Effect a client sees (captured) | Kind | Action |
|---|---|---|---|
| Publish a file (the two bindings above) | The file resolves and installs on every client from a fresh cache | `publish` | `push` |
| Patch a record (replace named fields of one file's record: `depends`, `constrains`, `license`, `timestamp`, `track_features`, any index field except the identity fields and the digests) | The next resolve sees the overlay: `demo-app-2.1`'s `depends` of `demo >=9` served as `demo >=1.1` made it installable on every client | `annotate` | `push` |
| Revoke a file (`revoked: true`, `package_has_been_revoked` appended to `depends`) | A fresh solve selects another version (`demo` resolved to 1.0 on all five clients); an exact pin fails with `nothing provides package_has_been_revoked needed by demo-1.1-0` (conda 26 and 24), `package_has_been_revoked =* *, which does not exist` (mamba, micromamba) or `package_has_been_revoked *, for which no candidates were found` (pixi); the file still downloads by URL, so `pixi install --locked` on a lockfile pinning it still installed it. A yank in the sense `pypi.md` and `cargo.md` use | `withdraw` | `delete` (the resolved revocation-action decision below, revised by `management-api.md`'s resolved withdraw-action decision, was Q1 there) |
| Unrevoke a file | The record returns to selectable | `restore` | `delete` |
| Attach a CEP-50 attestation to an existing file (a JSON array of Sigstore bundles, appended to the file's sidecar; CEP-50 is append-only, so no `detach` is declared and a bundle already present is refused `conflict`) | The `.sigs` and `.sigs.{sha256}` routes serve the new sidecar and the record's `attestations_sha256` names it, in every representation; no client reads it (`curl` and the `Verifier` verdict are the oracle) | `attach` | `push` |
| Remove a file | The record leaves every representation, the filename joins `removed`, the file answers `404`, the coordinate is retired forever; a solve prints each client's missing-package message | `delete-file` | `delete` |
| Set or clear channel notices | conda 26 and pixi print the notice on their next command; a cleared set answers `404` | `annotate` (object none) | `push` |

Rules, applying the precedent rather than re-deciding it: the handler declares these kinds
through `Operator.Operations()` and implements them in `Apply`, which runs inside the write
transaction `Submit` opens (`management-api.md`, "Dispatch: the optional `Operator`
interface"); each operation is one completed logical write through the shared write path,
exactly one snapshot, none for a refused one, no blob-store object deleted directly (its AC5,
AC6); authorization is the kind's action on the object the handler's `Authorize` reports, with
no new action and the withdraw class on `delete` for every format (its AC9); hosted only, a
proxied or virtual repository answering `405` `repository-type` and taking its patches,
revocations and removals from the upstream per the removal table (its AC7); the trigger is
verified by this registry's integration tests and by `rattler-build` for publish, and every
effect by a real resolve, with every declared kind driven by at least one `script` case
(`management-api.md` AC24, enforced before any container starts by `conformance-harness.md`
AC26). The object is `{name}/{version}/{build}` for every file operation (notices report none),
the target coordinate `{subdir}/{filename}`; a patch is the field map one
`patch_instructions.json` entry carries, and an import of a whole `patch_instructions.json`
archive is one `annotate` operation, one write however many records it changes
(`management-api.md`, "Every operation is one completed logical write"), reporting one `push`
pair per file it patches; because a kind carries one action, the import applies the archive's
`packages` and `packages.conda` overlays only and is refused `validation` naming the list when
the archive's `revoke` or `remove` lists are non-empty, since those are `delete` effects a
`push` key must not reach through an import; a bulk revocation or removal is one `withdraw` or
`delete-file` operation naming many objects, the several-pairs shape `management-api.md` AC4
tests, and an overlay entry naming a filename the subdir does not hold is refused `validation`
rather than ignored as conda-index ignores it; retirement is core-held (above), so no operation
carries a set forward; and the publish bindings and the management endpoint yield the same
documents and authorization outcomes (AC5).

### Names, versions, subdirs: nothing folds, and `noarch` always exists

Package names are lowercase by CEP-26's grammar and matched byte for byte on every route; version
strings and build strings are matched verbatim and never normalised (`1.0` and `1.0.0` are two
versions, ordered by CEP-33's rules only inside the client's solver). The one grammar the
registry parses is the filename, from the right as above. Subdir names are CEP-26's `noarch` or
`{os}-{arch}`; this registry does not close the set beyond that grammar, because the platforms a
client recognises are the client's business (conda's `KNOWN_SUBDIRS` in the pinned source is
what conda itself will request), and a request for a subdir the repository does not hold answers
`404`, which every client treats as "this channel has nothing for that platform" (captured on
`onlynoarch/linux-64`: conda, mamba, micromamba and pixi all resolved from `noarch` alone).

`noarch` is different: **every pinned client requests the `noarch` subdir of every channel on
every resolve**, and a `404` there is fatal on every client (captured on `nonoarch`: conda's
`UnavailableInvalidChannel`, mamba's `Subdir ... not loaded!`, pixi's `could not find subdir
'noarch'`). A hosted repository therefore always serves a `noarch` subdir, empty when it holds no
noarch package, exactly as conda-index always writes one; a proxied repository whose upstream has
none negatively caches the `404` and the client fails as it would upstream.

A request under any other spelling of a filename answers `404`, as conda-forge does for
`Tzdata-2025b-h78e105d_0.conda`; a path such as `noarch/../x` is refused before any lookup.

### Authentication: preemptive in every form, and one form in the path

No pinned client reacts to a `401` challenge: a credential is sent preemptively on every request
or not at all, and a `401` ends the run with each client's captured message. The forms:

- **HTTP Basic from URL userinfo**, `http://user:pw@host/...`, on all five clients, sent on
  index, shard, notice and package requests alike (mamba 2.9.0 dropped it on the package request
  in this pass and failed the download with two `401`s, a client defect recorded for the corpus
  and the operator documentation rather than worked around). `auth.md`'s token-as-password
  convention applies: the token is the password and the username is not an input.
- **HTTP Basic from a stored login**: `mamba auth login {host}:{port} --username --password` and
  `micromamba auth login` store `{"type": "BasicHTTPAuthentication", "user", "password"}` under
  `~/.mamba/auth/authentication.json`, keyed on `host:port`; `pixi auth login {host} --username
  --password` stores `{"BasicHTTP": {...}}` in the rattler credentials file, keyed on the host
  (without the port: `127.0.0.1` matched `127.0.0.1:8793`; wildcard hosts match subdomains).
  conda itself has no stored-login form beyond `.netrc`.
- **Bearer**: `mamba auth login --bearer` (also micromamba) and `pixi auth login --token` send
  `Authorization: Bearer {token}` on every request.
- **The path token**: `mamba auth login --token`, `micromamba auth login --token`, `pixi auth
  login --conda-token` and a channel URL written as `https://host/t/{token}/...` (the only
  non-Basic form `conda` supports without a plugin, and what `add_anaconda_token` inserts for
  anaconda.org) put the token in the URL as a `/t/{token}/` segment between the host and the
  channel path, on every request. Per the resolved path-token decision below this registry
  accepts it, and the pieces are the shared layer's, not this handler's: the segment is the
  **root path token** row of `auth.md`'s presentation-form table (universal on every format
  mounted beneath it; its AC31), `t` is held in `format-handler-interface.md`'s reserved-segment
  table with its AC11 fixture so no handler can claim it, and the shared authorizer extracts the
  token, marks it secret, verifies it exactly as a Bearer value and strips the segment before
  routing, so this handler sees the request as if the segment were absent; the request logger
  redacts it before any log line is written (`auth.md` AC7). The `conda`, `mamba`, `micromamba`,
  `pixi` and `rattler-build` rows of `auth.md`'s client table record these forms.

How this meets `auth.md`, whose rules this spec does not bend:

- **The challenge is uniform and not an existence oracle.** A credential-less request under a
  repository that is not anonymously readable answers `401` with `WWW-Authenticate: Basic
  realm="..."`, byte-identical for a private, a missing and someone else's repository; a request
  carrying a valid token that lacks `pull` answers `404`, indistinguishable from a missing
  repository (`auth.md` AC17), and every client's `404`-on-subdir message already reads as
  "channel does not exist". A rejected credential answers `401` and is never served as anonymous
  (`auth.md` AC12).
- **Publish refusals.** A `PUT` or upload `POST` on a repository the caller can read but lacks
  `push` on answers `403`; a credential-less one answers `401`; `rattler-build` prints the
  status either way.
- **TLS.** `auth.md` requires TLS on every credential-bearing path and refuses plaintext
  credentials unless the operator's flag is set (its AC27); the path token is a credential and
  is refused over plaintext like any other. The harness's transcript capture terminates TLS with
  its CA injected through `ssl_verify` (conda), `--ssl-verify` or `SSL_CERT_FILE` (mamba,
  micromamba) and `SSL_CERT_FILE` (pixi, rattler-build), the per-client injection
  `conformance-harness.md` leaves to each format.

### Addressed objects and pattern scopes

`auth.md`'s pattern scopes narrow a credential within one repository by matching the object each
request addresses, and the format declares which object each route reports ("Pattern scopes"
there; `format-handler-interface.md` AC12). The canonical object is `{name}/{version}/{build}`
for a file, and `{name}` where only a package is addressed; no folding is needed because the
grammar has none.

| Route | Object kind | Canonical object |
|---|---|---|
| `{subdir}/repodata.json` and its compressed forms, `{subdir}/current_repodata.json`, `{subdir}/repodata_shards.msgpack.zst`, `{subdir}/run_exports.json`, `channeldata.json`, `notices.json` | none | - (each enumerates the repository) |
| `{subdir}/{sha256}.msgpack.zst` | content-addressed | - (a shard is addressed by digest and holds one name's records) |
| `{subdir}/{name}-{version}-{build}.{ext}`, and its `.sigs` and `.sigs.{sha256}` sidecars | named | `{name}/{version}/{build}` |
| `PUT {subdir}/{filename}` | named | `{name}/{version}/{build}` from the URL, confirmed against `info/index.json` after the body arrives; a disagreement is refused (the resolved publish-object decision below) |
| `POST api/v1/upload/{channel}` | named | `{name}/{version}/{build}` from the multipart part's declared filename, which precedes the bytes, confirmed the same way |
| Patch, revoke, unrevoke, attach, remove | named | `{name}/{version}/{build}` from the operation's object |
| Set notices | none | - (repository-wide) |

What that gives and costs, applying `auth.md`'s rules rather than re-deciding them. **A patterned
`pull` cannot resolve on this format**: every client reads a repository-wide index first, and
the index reports `none`, which a patterned scope never authorizes, so a real `conda create`
under a token patterned `acme_*/**` fails at the index with the client's `401` rendering, while
`curl` of an in-pattern package file under the same token succeeds and an out-of-pattern one is
refused; a shard, being content-addressed, is fetchable under the pattern by a caller that knows
its digest, the residual `auth.md` names. `auth.md`'s fourth object kind, the descriptor (its
resolved name-free-document decision, was Q23), does not change this: every index
representation a conda client must read before a package enumerates the repository's names, so
none passes the sentinel test a descriptor route must pass (`format-handler-interface.md` AC12),
and `notices.json`, whose body is operator-written text, stays none rather than being argued
into the kind, since reclassifying it would unlock no client; conda stays with
helm, dnf and zypper among the formats whose clients need an unpatterned `pull`. AC9 asserts
that rather than leaving it implied, and the operator documentation states that a conda
credential that must resolve holds an unpatterned `pull`. **A patterned `push` publishes** through both bindings, because each carries the filename
before the bytes and the registry confirms it against the package's own metadata, so per-package
CI publish credentials are expressible on this format even though per-package read credentials
are not.

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines, on a
package or sidecar route of either path, the handler answers `403` with a `text/plain` body
naming the policy and rule, or naming the signal for a coordinate condemned under the shared
security-signal rule, written through the shared refusal writer `WriteRefusal` in
`internal/format` (`format-handler-interface.md` AC14), which on an HTTP/1.1 connection also
puts the condition into the status line, `HTTP/1.1 403 Refused by policy: {condition}`
(`supply-chain-policy.md`'s resolved refusal-status-line decision, was Q10, and its AC18). `403`
rather than the existence rule's `404`, because the caller is authorized and the content is what
is refused. The refusal bites at the package download, after
the client has solved from an index that still lists the record (the resolved index-elision
decision below), so every client fails mid-transaction with the status: conda 26.7.1 prints
`CondaHTTPError: HTTP 403 Forbidden ... You do not have permission to access this resource` and
suggests credentials, conda 24.1.2 `HTTP 403 FORBIDDEN ... a simple retry will get you on your
way`, mamba and micromamba `Failed to download package from {url} (status 403)`, pixi `failed to
fetch {file} ... HTTP status client error (403 Forbidden)`, all captured against the stub's
policy-shaped `403`. The body reaches nobody through the pinned clients, so it is for `curl` and
the transcript: the reason-phrase risk `pypi.md` named and `maven.md` and `hex.md` confirmed,
confirmed here for four more clients and now answered by the status-line phrase above, which is
the one place a condition can reach a conda user, since each client prints the status line.
Whether the phrase does reach the user, and whether a client with a second channel configured
falls back to it, is what AC10's case captures; that capture fills conda's `pending` row of
`supply-chain-policy.md`'s "When a refusal binds, per format" table in the same change (its
AC20; the harness refuses a policy case while the row is `pending`, `conformance-harness.md`
AC26).

### Integrity, signing and provenance

Every record carries `md5` and `sha256` (CEP-36 requires both) and every pinned client verifies
the `sha256` of a downloaded package before extracting it: a single flipped byte produced
conda's `ChecksumMismatchError ... expected sha256 ... actual sha256` on both generations,
libmamba's `File not valid: SHA256 doesn't match expectation` on mamba and micromamba, and
pixi's `hash mismatch when extracting`. Nothing on this wire is signed: repository signing does
not exist, conda-content-trust is out of scope (Scope), and the ecosystem's provenance mechanism
is the per-package Sigstore attestation of CEP-27, distributed per CEP-50 as a JSON array of
bundles at `{subdir}/{filename}.sigs` (mutable, `Cache-Control: no-cache`) and
`{subdir}/{filename}.sigs.{sha256}` (immutable), with the record's `attestations_sha256` naming
the current sidecar. This registry stores and serves both URLs byte-identical from the stored
sidecar file, appends only, answers `404` where none exists, and publishes a new content-addressed
sidecar before the record that names it, in the same write (CEP-50's ordering rule).

What conda takes from the shared services, now that both exist:

- From `docs/internal/plans/foundation/artifact-verification.md`: its **CEP-27 attestation**
  entry (the `sigstore` scheme; its entry catalogue and AC19) verifies a CEP-50 sidecar's
  Sigstore bundles as CEP-27 publish attestations against the repository's identity policy,
  checking the statement's subject filename and `sha256` against the stored file
  (`subject-mismatch`) and its `targetChannel` against the hosted repository's own URL or the
  remote's configured upstream URL (`channel-mismatch`), the mirror flexibility CEP-27 allows.
  The handler reaches it only through the `Verifier` consumer interface in `Deps` and never
  imports `internal/verify` (`format-handler-interface.md` AC15). The verdict is **recorded, not
  enforced**: a publish commits whatever the sidecar's verdict, and it is a fact
  `supply-chain-policy.md` evaluates at resolution (its AC15), where a file arriving unattested
  into a repository whose policy requires attestation is that spec's rule-binding refusal, not
  this handler's. The identity policy is the repository's trust set, provisioned in cases through
  the harness's `trust` key (`artifact-verification.md` AC25), and the conformance matrix's
  verification column needs a passing hosted and proxied case for conda (its AC24), which AC22
  carries.
- From `docs/internal/plans/foundation/signing-service.md`: nothing beyond the unsigned
  generation above (its AC24).

One finding this spec recorded for `supply-chain-policy.md` changes what that spec's
coordinate-level path can promise, and it is now that spec's own text: **the OSV schema defines
no conda ecosystem** (read 2026-09-26; PyPI, CRAN and Bioconductor are listed, conda and
conda-forge are not), so no advisory names a conda coordinate and the coordinate-level matching
cannot condemn one. `supply-chain-policy.md`'s "What the feed covers, per ecosystem" table carries
conda's row on exactly that footing: byte-level matching through the component-inventory
cataloguer is the only path, the Phase 1 library selection there must open `.conda` archives (a
ZIP of two zstd tarballs) and `.tar.bz2` archives and emit CEP-49 `pkg:conda/` PURLs, and until
it does a byte-dependent rule on a conda repository is refused at configuration like any
uncovered format (its AC17's uncovered-ecosystem clause, and AC11 for the refusal).
The conda-forge channel's malware response (removal from the channel, a `removed` entry, and an
advisory on its own tracker) carries no machine-readable security signal, which the removal
table below reflects.

### The proxied path

The handler owns the request and classifies for the proxy layer's fetch-and-cache API per the
settled decisions in `proxy-cache.md`; the upstream is a channel base URL on any of the captured
hosts, with an optional upstream credential in one of three forms (a path token inserted as
`/t/{token}/` after the host, which is how a private anaconda.org channel is read; a Bearer token,
which is how prefix.dev is read; HTTP Basic). The transport half is
`docs/internal/plans/foundation/upstream-adapters.md`'s, the `https` adapter under the
upstream's allowlist and credential role: the three forms are its `path-token` (template
`/t/{token}/` after the host, inserted on requests to the root host only and never into an
off-origin URL), `bearer` and `basic` credential kinds (its AC19), the credential redacted from
every log, error and URL-bearing record in every position (its AC20), never presented over
plain HTTP (its resolved host-rule decision, was Q3, so an `http://` upstream with a path token
is refused at configuration), and `upstream.Validate` on the management API's create and
`PATCH` of the remote is the only configuration-time check, which accepts an unreachable but
well-formed upstream (its AC23). **The handler probes nothing at configuration**: this spec
first required a parseable `noarch` index at configuration, which that rule forbids, so the
first request through the remote fetches what the client asked for, and an upstream serving no
parseable index answers the client what the upstream answers (a `404` negatively cached, or a
body that is not repodata, which fails cache materialisation as an integrity failure at fetch,
recorded for the operator, AC16) (AC20). The protocol half, which document to fetch and how to
classify it, stays this handler's derivation below.

- **Every index document is mutable metadata with a TTL**: `repodata.json` and its compressed
  forms, `current_repodata.json`, `repodata_shards.msgpack.zst`, `run_exports.json`,
  `channeldata.json` and `notices.json`. The TTL is the layer's metadata TTL, a default in the
  low minutes with a per-repository override (`proxy-cache.md`'s resolved default-TTL decision,
  was Q2), never the upstream's `max-age`: conda-forge's `max-age=1200` and the defaults
  channel's `max-age=30` are what those channels tell their own clients, and this registry tells
  its clients `max-age=60` under the per-format serve policy. conda-forge serves `ETag`,
  `Last-Modified` and answers `304` to either conditional header (captured), so revalidation
  uses the entity tag and an unchanged 28 MB `.zst` costs a `304` upstream (the adapter sends
  `If-None-Match` whenever an `ETag` is held, `upstream-adapters.md` AC15). Clients' own
  conditional requests are answered `304` from the cache under this registry's `ETag` inside the
  TTL; a `HEAD` probe (mamba, pixi) is answered from the cached document's headers, and on a
  cold remote fills the cache exactly as the `GET` would, since the layer defines no `HEAD`
  forwarding, which costs one representation a probing client may not then fetch (mamba 2.9.0
  `HEAD`s the `.zst` and fetches the shards) and leaves it cached for the next client that
  wants it; and the `Last-Modified` a
  remote serves is its cache-scoped `adopted_at`, never the upstream's header, forward-moving on
  every newly adopted revision, with a `304` only on an exact `If-Modified-Since` match or a
  matching `ETag` (`proxy-cache.md`, "Freshness of what a remote serves", AC22). Each representation is fetched and
  cached independently and served byte for byte, except for the one rewrite below; the registry
  never transcodes a `.zst` into a `.json` for a client, because a client that asked for `.zst`
  handles a `404` and a client that asked for `.json` may be behind a proxy that gzips.
- **Shards are immutable artifacts** cached indefinitely, fetched **stream-and-verify against
  their own filename**: the SHA-256 of the bytes must equal the name or the shard is never
  committed (a live conda-forge shard verified this way in this pass). Served with the
  `immutable` cache header whatever the upstream sent, because the name binds the bytes.
- **Package files are immutable artifacts** cached indefinitely, fetched stream-and-verify
  against the `sha256` of the record for that filename, never committed on a mismatch or a
  truncated body. The record comes from the **digest index**: for a sharded upstream, the
  package's shard, fetched through the cache like any shard; for a monolithic-only upstream, a
  filename-to-`sha256` map the handler builds **in the adoption transaction of each monolithic
  representation** (`repodata.json`, its `.zst` or its `.bz2`, whichever a client caused to be
  fetched, decompressed on the way), from the same streamed pass that writes the body to the
  CAS, so no package request ever meets a revision without its map and no map is ever built
  lazily or late (the shape `cran.md`'s recheck chose for its digest index; parsing the 188 MB
  document once per adoption rather than once per package miss), stored as CAS-backed metadata
  on the remote's repository-level document and **declared on its blob-digest list**, the only
  way a document keeps another blob alive (`storage-and-gc.md` AC16; `data-model.md`, "Declared
  blob digests on a document, inline or CAS-backed", AC37), a map named only inside the
  document's body being collected by the first sweep past grace. The handler declares a retained
  count of **zero** (`proxy-cache.md`'s resolved retained-revision decision, was Q19, where zero
  is valid), because no conda route reads a superseded revision: a package request resolves
  against the current map's record, so the adoption that rewrites the map drops the previous one
  from the list in the same transaction (its AC27); the late-map case that criterion names never
  arises here. A request for a filename the digest index does not
  know is answered `404` and negatively cached (below). Every shard and every listed file
  therefore reaches fetch-and-cache with a **declared digest**, never in the completion-only mode
  `proxy-cache.md` offers for digest-less wires (its resolved completion-only decision, was Q15,
  AC20), which conda does not need.
- **`base_url` and `shards_base_url` are the one rewrite on this format** (the resolved
  base-URL decision below). When an upstream index carries an absolute `info.base_url` or
  `info.shards_base_url` (CEP-15 and CEP-16 allow both; every live channel sampled carries empty
  or absent ones), a client would fetch packages and shards from that host directly and bypass
  the cache, so at cache materialisation the handler rewrites the field to the empty string in
  every representation of that subdir (`.json`, `.zst`, `.bz2`, the shard index), recompressing
  once, and fetches the packages and shards from the upstream's absolute base itself; the
  rewritten documents are what the cache stores and serves, with this registry's `ETag`. A
  relative or empty value is left untouched. A `remote` repository's `base_url` therefore never
  names another host.
- **`.sigs` sidecars** are mutable metadata revalidated on the upstream's `ETag`;
  `.sigs.{sha256}` sidecars are immutable artifacts verified against their name.
- **Missing coordinates are negatively cached** with the short TTL: a `404` on a subdir's index
  is the normal answer for a channel that has no packages for a platform (captured on every
  client, which then resolves from `noarch`), a `404` on a package filename is a client asking
  for something the index never listed, and a `404` on `notices.json` is conda-forge's own answer
  on every command from conda 26 and pixi, so the negative cache absorbs one predictable miss per
  command per client. A `429` or `5xx` is never cached as absence (`proxy-cache.md` AC9). The
  `303` prefix.dev answers on its sharded index is followed inside the adapter, and no upstream
  `Location` ever reaches a client (`upstream-adapters.md` AC8).
- **The token is never forwarded.** A client's `/t/{token}/` segment, Basic or Bearer credential
  authenticates it to this registry only; the upstream receives the upstream credential the
  adapter holds, because the outbound request is built only from the adapter's request fields
  (`upstream-adapters.md` AC4), asserted from the stand-in's transcript (AC14).
- **Publish and every management operation against a `remote` repository answer `405`** with the
  `repository-type` problem (`management-api.md` AC7).
- **conda-forge scale is the design point** (AC18): the noarch subdir's monolithic index is 188 MB
  and its `.zst` 28 MB, every representation is above the inline threshold and lives in the CAS
  under the fourth mark root, the read path is a byte copy with `Range` support (conda-forge
  serves `206` and so does this registry), and the digest-index build is the one full parse,
  bounded in memory by a streaming JSON reader rather than a decoded document, with a CI
  benchmark gate on its time and peak memory because `CLAUDE.md` makes performance a gate rather
  than a hope.
- **The remote's index documents sit outside the quota.** Every cached index representation
  and the digest index are the remote's current metadata, which LRU eviction never reaches and
  which ends only when an adoption supersedes it or the remote is deleted; they are counted in
  `cache_metadata_bytes{repository}` beside the quota's referenced bytes, never in them
  (`proxy-cache.md`'s resolved metadata-eviction decision, was Q21, AC29). Shards and package
  files are cached files under the quota and evictable, re-fetched and verified against their
  names and records on demand. A conda-forge remote therefore holds a few hundred megabytes of
  metadata per subdir a client has asked for, visible in that gauge and not bounded by the quota,
  which is that decision's accepted cost at this format's largest scale.

Upstream removal maps onto `proxy-cache.md`'s event-class table ("Upstream removal or
replacement", its AC13): the handler classifies each event it observes on its own wire, and the
layer executes the class. Conda's side of that contract:

| Upstream event, as observed at revalidation | Class in `proxy-cache.md` |
|---|---|
| A record's `sha256` changes for the same filename, or a re-fetched file disagrees with the recorded digest | **Immutability violation, coordinate-bound**: purge the cached file and alert, then re-fetch and verify against the new digest on demand, because every client verifies against the digest the record declares and every lockfile that pinned the old digest would otherwise disagree with this registry |
| A record gains or loses `revoked`, or its patched fields change (a conda-forge hotfix) | **Ordinary metadata change**, propagated verbatim at the next revalidation with no divergence: revocation is the ecosystem's yank and a lockfile that pinned the file still installs it, the reading `proxy-cache.md` gives Hex's `retired` and Julia's `yanked` |
| A filename moves to `removed`, or a record vanishes without a `removed` entry | **Removal with no signal**: keep serving, record an operator-visible divergence. conda-forge's "mark as broken" is a removal with no machine-readable reason, and no explicit conda security signal exists on this channel |
| A shard named by the cached index answers `404` | Not negatively cached: the index is revalidated instead, because a shard vanishes only when the index that named it has moved on |
| A subdir or the whole channel answers `404` where it previously existed | **Removal with no signal**: keep serving, record a divergence |
| A shard or package failing its declared digest, or a truncated body | **Integrity failure at fetch**: nothing committed, no negative entry, the previous cached copy keeps serving, the operator alerted with the real reason (AC16) |

Detection happens at revalidation, passively, per `proxy-cache.md`'s resolved passive-detection
decision (was Q12); there is no active channel for this ecosystem, because the advisory feed
carries no conda ecosystem (above), and this spec says so rather than implying one.

### Virtual repositories, and why conda can have what Hex cannot

`hex.md` found virtual repositories impossible because every registry resource is signed under the
repository's own name and the client checks that name. Nothing on a conda channel is signed and no
document names the channel: the index names a subdir, a shard names nothing but its bytes, and a
package file is bound to its `sha256`. A `virtual` conda repository is therefore expressible and
is served (the resolved virtual-repository decision below), and the handler declares `Virtual:
supported` in `Capabilities()` (Design, "Capabilities and lifecycle"), the per-format
capability `hex.md`'s finding put into the interface: its per-subdir documents are the merge
described under generation, a package or shard request resolves through the members in order,
and to every client it is one channel. Two semantics follow and are stated rather than
discovered: a client's `channel_priority` (strict by default in pixi and mamba) operates between
channels the client configured and sees a virtual repository as one channel, so the priority among
its members is their position and nothing else; and a name held by two members yields one merged
shard and one merged set of records, with a filename collision resolved in the first member's
favour, so a private build of a conda-forge package shadows the public one when the local member
comes first, which is the use a virtual repository exists for. Artifactory merges virtual conda
metadata on the same model and Nexus 3.92 added group repositories, so the shape is the one users
arrive expecting.

### Capabilities and lifecycle

`Capabilities()` declares proxy support `supported`, reference-implementation availability
`available` (a conda-index tree behind a plain file server, below), `Virtual: supported` (the
section above) and `Rename: supported`, the four fields `format-handler-interface.md` AC13
names. Rename is supported because no document a conda client reads names the channel: the index
names a subdir, a shard names nothing but its bytes, `base_url` and `shards_base_url` are empty,
and `channeldata.json` carries packages, not the channel, so a renamed repository serves
byte-identical documents under its new URL and the old name answers `not-found`
indistinguishably from a never-existing repository (`repository-lifecycle.md` AC12). No key is
involved, since conda is an unsigned consumer. `repository-lifecycle.md` AC12 requires
`conformance/conda/rename_test.go`, enforced by the harness's case-set validator
(`conformance-harness.md` AC26); AC25 carries it with real clients, with the virtual case beside
it.

### Conformance, the five clients and the corpus

The two pinned conda generations straddle two real watersheds: 24.1.2 predates sharded repodata
and `base_url` (it fetches `repodata.json.zst` first, ignores `base_url` and fails on the `404`,
honours `use_only_tar_bz2`, and still ships the experimental JLAP interface), while 26.7.1 fetches
the sharded index first with `repodata_use_shards` defaulting to true, follows `base_url`, ignores
`use_only_tar_bz2`, has no JLAP, and reads `notices.json` on every command. The two mamba-family
clients straddle the same watershed for the libmamba lineage: micromamba 2.3.3 probes `.zst` with a
`HEAD` and never asks for shards, mamba 2.9.0 `HEAD`s both and prefers shards, and mamba 2.9.0
carries the two defects this pass recorded (no index revalidation after `max-age`, URL-userinfo
Basic dropped on the package request). pixi 0.81.0 is the rattler lineage: shards first, `HEAD`
probes of `.zst` and `.bz2` on fallback, notices on every command, host-keyed credentials. Every
hosted and proxied read case runs on all five; the publish cases run on `rattler-build 0.76.1`;
the classic-solver case runs on both conda generations. The conformance matrix counts one
ecosystem and no multiplier row (the catalogue has none for Conda); the five clients appear in the
matrix's Client column under the Conda row.

The recorded surface for the replay corpus, named now because a thin recording script yields a
thin specification: against `conda.anaconda.org/conda-forge`, a cold resolve on each client
generation (shards on three, `.zst` on two), a warm resolve inside and after the TTL, a
`--solver classic` resolve, `conda search` and `pixi search`, a missing package, a missing
subdir, and a `/t/` token URL; against `repo.anaconda.com/pkgs/main`, the same cold resolve and
the notices fetch. The hosted read half, the documents a publish, a patch, a revocation, a
removal and a notice produce as each client reads them, is recorded against a tree
`conda-index` 0.13.0 generates with its patch generator (the way this spec's captures were
made) behind a pinned static server, because no public channel accepts a test publish; that
local reference is a row of `conformance-harness.md`'s authoritative-reference exception list
(its AC28), the row naming the reference by kind and version and the corpus manifest under
`conformance/conda/` pinning the static-server image and the generator by digest at recording
time (its resolved digest-placement decision, was Q7), and it is also why `Capabilities()` declares reference-implementation availability
`available`, a conda-index tree behind a file server being exactly what conda-forge is. For the
hosted write surface there is **no reference at all**: the Artifactory shape is proprietary and
prefix.dev is a service, so no write corpus is recorded, and the two bindings are proven by
`rattler-build`'s exit code and the real resolve that follows (AC3, AC4), recorded as the second
exception-list row rather than left for the matrix to imply; a transcript recorded against this
registry itself would replay-match by construction and prove nothing. Recording gates on
the harness's redaction criterion (`conformance-harness.md` AC13); the `/t/{token}/` path segment
is exactly the kind of credential an allowlist on headers alone would miss, and the harness's
allowlist now applies to every position, naming conda's segment among the path forms, so no
format-local redaction rule is needed. Every deliberate divergence from a conda-index tree goes on
the recorded exception list before its flow is expected to replay: the `409` on a changed-bytes
re-upload, the CEP-26 refusal conda-index does not make, the `405` on remote writes, the absent
`index.html` and `rss.xml`, the empty `noarch` subdir of a channel with no noarch package, and
the `base_url` rewrite.

## Acceptance Criteria

- [ ] AC1: `conda create` on both pinned conda generations (24.1.2 and 26.7.1), `mamba create`
      (2.9.0), `micromamba create` (2.3.3) and `pixi add` (0.81.0) each resolve and install a
      package and its transitive dependency from a hosted repository configured as a
      format-first channel URL, each client's captured probe order answered (the sharded index
      first on conda 26, mamba and pixi; `repodata.json.zst` first on conda 24 and micromamba,
      the latter after a `HEAD`), the transcript showing one index fetch per subdir and one
      package fetch per file; a warm run inside the index TTL makes no index request, a run after
      it revalidates with `If-None-Match` and receives `304`s on conda 24, conda 26, micromamba
      and pixi, and `--offline` makes no request, all asserted at the network layer from fresh
      caches.
- [ ] AC2: Every hosted subdir serves `repodata.json`, `repodata.json.zst`, `repodata.json.bz2`,
      `current_repodata.json` with its compressed forms, `repodata_shards.msgpack.zst`, one
      `{sha256}.msgpack.zst` shard per package name and `run_exports.json`, and the channel root
      serves `channeldata.json` with its `subdirs` list, all generated from one stored state and
      agreeing record for record; every shard's bytes hash to its filename, the shard index
      carries `version: 1`, a `created_at`, and `base_url` and `shards_base_url` as empty
      strings, records carry `md5`, `sha256` and `size` computed by the registry,
      `current_repodata.json` holds exactly what conda-index's `build_current_repodata` rule
      keeps over the patched records, `conda --solver classic` on both generations resolves from
      `current_repodata.json.zst`, `index.html`, `rss.xml`, `repodata_from_packages.json` and
      `patch_instructions.json` answer `404`, every representation exists from the repository's
      first snapshot so that no client cache ever records a `has_zst` or `has_shards` of `false`
      with a `last_checked` against a hosted channel, and a channel holding no noarch package
      still serves an empty `noarch` subdir that every client accepts; `run_exports.json` and
      every shard carry each file's `run_exports` as read from its `info/run_exports.json`, and
      `channeldata.json`'s entry for a name is derived from its newest version and changes when
      a newer version is published or the newest removed, with no stored entry; a `HEAD` on
      every index route answers the `GET`'s status and headers with no body and no route sends
      `Content-Encoding`; the shard index's `created_at` equals the triggering write's commit
      time, so two generations from the same records are byte-identical; and a shard the
      previous generation of a subdir's shard index named is still served after a publish has
      replaced it, until the generation after that, proven by a client whose shard index is
      inside its `max-age` resolving across the publish.
- [ ] AC3: `rattler-build upload artifactory` against `PUT /conda/{repository}/{subdir}/{filename}`
      with Basic and `rattler-build upload prefix` against
      `POST /conda/{repository}/api/v1/upload/{repository}` with Bearer each publish a `.conda`
      and a `.tar.bz2` with `201`, producing exactly one snapshot per file in which the file, its
      record and every regenerated document of the subdir and channel land, the index serving the
      record before the response is sent; a subsequent resolve from fresh caches on all five
      clients installs exactly the published bytes and verifies their `sha256`; and a body that
      is not its named format, lacks `info/index.json`, whose `info/index.json` disagrees with the
      filename or the URL's subdir, or whose name, version, build or subdir violates CEP-26's
      grammar is refused with `422` and nothing committed, a body over
      `management.publish_spool_limit` with `413` `too-large` and nothing committed on either
      binding; and `rattler-build upload anaconda`
      and `rattler-build upload quetz` pointed at the repository fail at their first request
      with `404` (no `post_url` staging flow and no `X-API-Key` route exist), the client
      printing the status.
- [ ] AC4: A re-upload of an existing filename with identical bytes answers `201` and creates no
      snapshot, its `Operation` completing with no snapshot reference and `unchanged: true`; one
      with different bytes answers `409` and `rattler-build` exits non-zero naming the status; a
      filename removed through the management API is listed under `removed`, answers `404`, and
      is refused republication with the same or different bytes with the `retired` problem (409)
      from the shared write path on both bindings, including after the removal's snapshot has
      been pruned out of retention, after the default pointer is repointed to a snapshot older
      than the removal and back, and when the removal commits between the publish's claim
      declaration and its commit, while its twin in the other artifact format stays publishable;
      and a `state`-seeded `Retirement` record refuses the same way with no removal run first.
- [ ] AC5: Patching a record, revoking, unrevoking, removing a file and setting notices through
      the registry-owned management API each produce exactly one snapshot and the captured
      client-visible effect on every pinned client from a fresh cache, applied with conda-index's
      `_apply_instructions` semantics: a patched `depends`, `constrains`, `license` or
      `track_features` is served in every representation with the raw record unchanged and a
      patched `depends` makes the package installable, a revoked record carries `revoked: true`
      and the `package_has_been_revoked` dependency so a fresh solve skips it and an exact pin
      fails with each client's captured message while `pixi install --locked` on a lockfile
      pinning it still installs it, a removed file leaves every representation, a bulk
      `patch_instructions.json` import applies as one write, and a notice is printed by conda 26
      and pixi; an overlay naming `name`, `version`, `build`, `subdir`, `md5`, `sha256`,
      `size` or `run_exports`, an overlay entry naming a filename the subdir does not hold, and
      an imported archive whose `revoke` or `remove` list is non-empty are each refused
      `validation` naming the field, filename or list, with nothing committed, while a
      `withdraw` and a `delete-file` naming many files each apply as one write; the handler
      declares exactly the kinds `publish`, `annotate`, `withdraw`, `restore`, `attach` and
      `delete-file` with the two publish routes as bindings onto `publish`, and
      each kind is driven by a `script` case; a principal holding `pull` alone is refused every
      operation, one holding `push` without `delete` is refused revocation, unrevocation and
      removal while its patches, attachments and notices succeed, the publish bindings and the management
      endpoint yield the same documents and authorization outcomes, no snapshot is created by a
      refusal, and every operation against a proxied or virtual repository answers `405` with
      the `repository-type` problem.
- [ ] AC6: Every hosted index document is produced by the shared index service inside the
      triggering write, dispatched by the pre-commit hook and never requested by the handler,
      proven by an architecture test that the handler package holds no repodata, shard or
      channeldata renderer and that the renderer lives only in the generator package
      `internal/format/conda/index`, and by a seeded `state` entry serving documents
      byte-identical to a publish of the same file; every generated document is served through
      `ServeDocument` with a `Last-Modified` that moves forward on a rollback, every index
      document carrying `Cache-Control: public, max-age=60` and every shard the `immutable`
      header, identical on two conda repositories whatever their configuration, and every package
      file and sidecar served through `ServeFile` with its CAS digest as a strong `ETag`, no
      handler package setting either validator; two concurrent
      publishes into one subdir both land and every representation enumerates both, the
      regenerated documents committing in the same snapshot as the file that triggered them,
      proven by repointing to that snapshot's predecessor and reading the previous documents; a
      package whose records did not change keeps its shard name across a regeneration; a
      subdir index above the inline size threshold is stored as a CAS blob, protected across a
      GC sweep by the CAS-backed-metadata mark root, and served to a real client afterwards; and
      a subdir's shard index declares the shards it names and those its previous generation
      named, so that after two publishes and a sweep past grace the shards of the generation
      before last are collected and the previous generation's are not.
- [ ] AC7: A request for a filename under any other case, for `noarch/../x`, or for a subdir the
      repository does not hold answers `404`, and every client resolves from `noarch` alone when
      its platform subdir is absent; the filename grammar parses `{name}-{version}-{build}` from
      the right for names containing hyphens; a publish under a subdir that is neither `noarch`
      nor `{os}-{arch}` is refused with `422`; and a publish whose name is not lowercase under
      CEP-26 is refused rather than indexed unfindably.
- [ ] AC8: On a private repository a credential-less index, shard, notices or package request
      answers `401` with `WWW-Authenticate: Basic` byte-identical for a private and a
      non-existent repository, each client printing its captured `401` message; all five clients
      then resolve with the token as the URL-userinfo password, mamba, micromamba and pixi with a
      stored Basic login, mamba, micromamba (`--bearer`) and pixi (`--token`) with Bearer, and
      conda (a `/t/` channel URL), `mamba auth login --token`, `micromamba auth login --token`
      and pixi (`--conda-token`) with the path token, every form asserted from the transcript
      with the path token absent from every log line; a valid token lacking `pull` answers
      `404`; a rejected credential answers `401` and is never served as anonymous; and a
      credential in any form presented over a connection this registry did not terminate with
      TLS is refused per `auth.md` AC27, while under the harness's TLS termination with its CA
      injected through `ssl_verify` and `SSL_CERT_FILE` every client authenticates with no
      insecure opt-in.
- [ ] AC9: A token holding only `pull` under the pattern `acme_*/**` is refused every index,
      shard-index and notices route so that a real `conda create`, `mamba create` and `pixi add`
      under it fail at the index, fetches an in-pattern package file through `curl` and is refused
      an out-of-pattern one, and fetches a shard by digest; a token holding `push` under the same
      pattern publishes `acme_tool` through both bindings and is refused `other_tool` on both,
      with no snapshot created by a refusal, a mislabelled upload whose `info/index.json` names an
      out-of-pattern package refused after the body arrives; and in proxied mode the patterned
      `pull` token fetches an in-pattern package and is refused another.
- [ ] AC10: A package request the shared policy layer refuses answers `403` through
      `WriteRefusal` with a `text/plain` body naming the policy and, on the HTTP/1.1 connection
      the harness terminates, the status line `Refused by policy: {condition}` observed on the
      raw socket, on the hosted and the proxied path, the index still listing the record; real
      resolves on all five clients exit non-zero printing their captured `403` messages, with the
      body and the phrase captured in the transcript and each client's output recorded for
      whether either reaches the user; and the case's capture of whether a client with a second
      channel configured falls back to it fills conda's row of `supply-chain-policy.md`'s "When a
      refusal binds, per format" table in the same change (its AC20).
- [ ] AC11: The proxied path resolves a package and its dependency from a conda-forge stand-in on
      all five clients, serving the sharded index and shards to the three sharded clients and
      `repodata.json.zst` to the other two byte-identical to the upstream's; from fresh client
      caches a second resolve on each client reaches this registry while the upstream receives
      no request, asserted at the network layer; every shard was verified against its filename
      and every package against the record's `sha256` before commit, the record taken from the
      package's shard on a sharded stand-in and from the digest index on a monolithic-only one;
      and a stand-in whose index carries an absolute `info.base_url` or `shards_base_url` is
      served with both rewritten to empty strings in every representation while packages and
      shards are fetched from the absolute base by this registry, a relative value left
      untouched.
- [ ] AC12: A proxied index document is revalidated after the layer's metadata TTL and not
      before, whatever `max-age` the stand-in sends, with `If-None-Match` so an unchanged
      document costs a `304` upstream; a package published upstream becomes visible to every
      client after the TTL and, absent an explicit refresh, not before; a client's own
      conditional request inside the TTL is answered `304` without an upstream request; a
      `HEAD` probe on a cached document makes no upstream request and on a cold remote causes
      exactly the fetch the `GET` would, the document then cached; every cached index document is served with the remote's cache-scoped
      `Last-Modified`, never the upstream's, later than the previous value on each newly adopted
      revision; and a shard named by the cached index that answers `404` upstream triggers an
      index revalidation rather than a negative-cache entry.
- [ ] AC13: A package filename, a subdir and `notices.json` the upstream lacks are each answered
      `404` and negatively cached, so a second request within the negative TTL makes no upstream
      request, while an upstream `429` or `5xx` is neither cached as absence nor surfaced as
      not-found and succeeds as soon as the upstream recovers.
- [ ] AC14: A remote repository bound to a stand-in requiring a `/t/{token}/` path token, one
      requiring Bearer and one requiring Basic each fetch with the adapter's credential in the
      form the stand-in requires (the `path-token`, `bearer` and `basic` kinds of
      `upstream-adapters.md`), the path token inserted only into requests to the root host and
      never into a followed redirect's URL, the token appearing in no log line or error, and the
      client's own credential in any form never reaches the stand-in, asserted from the
      stand-in's transcript.
- [ ] AC15: A changed `sha256` for a cached filename purges that file's cached references, raises
      the operator alert and re-verifies the next fetch against the new digest; a record gaining
      `revoked` or a patched field is propagated verbatim at the next revalidation with no
      divergence recorded; a filename moving to `removed`, a vanished record, subdir or channel
      keep serving with a divergence recorded: conda's side of the settled removal table in
      `proxy-cache.md` (its AC13).
- [ ] AC16: A stand-in serving a package whose bytes disagree with the record's `sha256`, a shard
      whose bytes disagree with its filename, or a truncated body never commits anything to the
      CAS and attaches no cached reference, the client receives the same failure it would from a
      corrupt upstream (each client's captured checksum message on the hosted path is the
      control), and the real failure reason is recorded observably to the operator.
- [ ] AC17: A virtual repository over a local and a remote member serves each subdir's merged
      index in every representation, a filename held by both members resolving to the first
      member's record and bytes, a name held by both yielding one merged shard, `base_url` and
      `shards_base_url` empty; every pinned client resolves through it a package that exists only
      in the second member; a package present in both members installs the first member's
      bytes, asserted by digest; and the merge runs as the deferred `index.merge` job, a write to
      the local member becoming visible in the virtual within the staleness bound with no merge on
      a request's path and the previous merged set serving until the new one commits; the
      merged `current_repodata.json` holds what conda-index's rule keeps over the merged
      records, a filename in one member's `removed` list and another member's records is
      served and absent from the merged `removed`, and two members' notices sharing an `id`
      yield the first member's. A virtual
      created over a local member holding `noarch` and `linux-64` and a remote never adopted
      fetches, at creation, exactly the remote's `{subdir}` templates expanded over both subdirs
      (`repodata.json.zst`, `repodata_shards.msgpack.zst`, `run_exports.json`) and the two root
      literals, never `repodata.json` or `current_repodata.json`, every client
      of the virtual then resolving a package only the remote's upstream holds with no request
      ever made to the remote's own URL; a client of the virtual requesting `osx-arm64`, a
      subdir only the remote's upstream holds, is answered `404` and resolves from `noarch`, the
      cell is recorded and one revalidation per remote enqueued, the replay requests that
      subdir's inputs, and the client's next resolve after the staleness bound installs the
      remote's `osx-arm64` package, while a request for `foo-bar` fitting the grammar and held
      by no upstream is asked of the stand-in once until its negative entry lapses and a
      request for `a..b` or `noarch/../x` records nothing; a remote whose stand-in answers `404`
      for `repodata.json.zst` contributes no record, the exclusion recorded on the merged set's
      input record; the remote's adoption of a changed upstream index
      enqueues the merge in the adoption transaction and the change reaches the virtual within
      the staleness bound; with the remote reached only through the virtual, a read of the merged
      index past the remote's TTL enqueues one `proxy.revalidate` job and is served the current
      merged set with no upstream request on its path (`proxy-cache.md` AC26,
      `signing-service.md` AC35); every merged index's `Last-Modified` is later than any the
      virtual served before; the remote's records are listed although its documents carry no
      verdict, the merged index being unsigned; a merged shard is held by the merged shard
      index's declared list with one predecessor generation, so a sweep past grace between two
      merges collects nothing a client holding either generation's index names; and
      registration refuses a conda profile whose `Merge` reads a member document with no member
      input declared.
- [ ] AC18: Against a stand-in serving the recorded conda-forge noarch and linux-64 documents (a
      188 MB `repodata.json`, its 28 MB `.zst`, a 973 KB shard index and its shards), every
      client resolves a real package through the proxied path, the digest index is built once per
      adoption with the server's peak memory and build time under the thresholds a CI
      benchmark gate fails on, every document is served as a CAS-backed blob by a stream copy
      with `Range` honoured, and a warm resolve on each client costs no upstream request; and
      on the hosted path a subdir seeded with the recorded conda-forge noarch record set
      regenerates its full document set for one publish, the `.bz2` included, within a time and
      peak-memory threshold the same gate fails on, the shard of an untouched name keeping its
      bytes (`signing-service.md` AC4's largest-consumer benchmark, which this format is).
- [ ] AC19: Replay-match passes against a corpus recorded from conda-forge and the defaults
      channel, with the hosted read half recorded from a pinned static server over a
      `conda-index` 0.13.0 tree, covering the recorded surface named in Design; the corpus
      manifest names that local reference for the hosted half and no write reference, each
      matching a conda row of `conformance-harness.md`'s authoritative-reference exception list
      (its AC28), and no transcript recorded against this registry is part of the corpus.
- [ ] AC20: Configuring a remote repository makes no request to its upstream: an unreachable but
      well-formed upstream is accepted once `upstream.Validate` passes, an `http://` upstream
      with a path-token credential is refused by `upstream.Validate`, and the handler declares no
      `configure` probe; against an upstream serving no parseable index the first client request
      receives the upstream's `404`, negatively cached, or an integrity failure recorded for the
      operator where the body is not repodata, with nothing committed; a `virtual` repository
      of format `conda` is accepted; and a publish or management operation against a remote
      repository answers `405` with the `repository-type` problem.
- [ ] AC21: The generation differences are asserted, not assumed: conda 24.1.2 and micromamba
      2.3.3 never request a sharded index and resolve a shards-only channel as absent with their
      captured messages while conda 26.7.1, mamba 2.9.0 and pixi resolve it; conda 24.1.2 fails on
      a `base_url` channel with a `404` beside the index while the other four fetch from the
      base; `use_only_tar_bz2` makes conda 24.1.2 install a `.tar.bz2` where the other clients
      install the `.conda` of the same build; and mamba 2.9.0's `.tar.bz2` preference and its
      two recorded defects are carried on the exception list with the client's issue rather than
      worked around.
- [ ] AC22: A CEP-50 sidecar stored with a publish is served byte-identical at
      `{filename}.sigs` and `{filename}.sigs.{sha256}`, the record carries `attestations_sha256`
      equal to the sidecar's digest, a second attestation through the `attach` operation appends
      without reordering the first in one snapshot that regenerates the record's shard and the
      monolithic forms, a bundle already present is refused `conflict`, a publish of existing
      bytes with a new attestation creates that snapshot rather than completing unchanged,
      the content-addressed sidecar is published in the same write as the record naming it, a
      file with none answers `404` on both routes, and a proxied stand-in's sidecars are served
      byte-identical with the immutable one verified against its name; and on both paths the
      sidecar's bundles are verified through `Deps`' `Verifier` under `artifact-verification.md`'s
      CEP-27 entry against the repository's trust set, a valid attestation recording `verified`,
      one naming another file or `sha256` recording `failed` with `subject-mismatch` and one
      naming another channel `failed` with `channel-mismatch`, each file still committing and
      installing on a real client while no rule requiring a verified attestation binds.
- [ ] AC23: A hosted channel's `notices.json` reflects the notices set through the management
      API as one replaced document, each notice carrying CEP-6's `id`, `message`, `level`
      (`info`, `warning` or `critical`), `created_at` and `expires_at`, a document missing one,
      carrying an unknown level, a malformed timestamp or two notices with one `id` refused
      `validation` with nothing committed; conda 26.7.1 and pixi print a notice on their next
      command and do not print an expired one, a cleared set answers `404` silently on both,
      and conda 24.1.2, mamba and micromamba never request it, all asserted from the
      transcript.
- [ ] AC24: A build published in both formats is listed under `packages` and `packages.conda`
      with its own digests each, conda 24, conda 26, micromamba and pixi install the `.conda`,
      and each client's downloaded bytes verify against the record it chose; a removed `.conda`
      leaves its `.tar.bz2` twin installable.
- [ ] AC25: The handler's `Capabilities()` declares proxy `supported`, reference-implementation
      `available`, `Virtual: supported` and `Rename: supported`; a renamed hosted repository keeps
      its identity and serves byte-identical index documents, shards and packages under the new
      name, every pinned client resolving from the new URL in both modes with its existing token,
      while the old name answers `not-found` indistinguishably from a never-existing repository;
      and the case set carries `rename_test.go`.
- [ ] AC26: On a remote far over its quota holding a subdir's cached index representations, a
      digest index above the inline threshold, shards and package files, an eviction pass ends
      cached references of shards and package files only: every index document and the digest
      index are unchanged, a request for each inside its TTL is served from the cache with no
      upstream request and the same `Last-Modified`, and `cache_metadata_bytes{repository}`
      counts them while `cache_referenced_bytes{repository}` does not; a sweep run with the
      grace lapsed leaves the current revision's digest index in the store, after an
      adoption of a new `repodata.json` or `repodata.json.zst` the next sweep past grace
      collects the previous revision's map, the new map having been written and declared in the
      adoption's own transaction so that a package request between the adoption and the sweep
      resolves against it with no build on the request's path, and a package the new index
      still lists installs on a real client afterwards.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/conda/hosted_test.go` (all five pinned images; fresh package and index caches in setup; per-client probe order asserted from the transcript; warm-inside-TTL, `304` and `--offline` runs asserted at the network layer) |
| AC2 | conformance + integration | `conformance/conda/documents_test.go` (`curl` and decoders over every representation; shard digests; `HEAD` on every index route; no `Content-Encoding`; classic-solver runs on both conda images; the empty-`noarch` channel on all five; a conda 26 client resolving across a publish from a shard index inside its `max-age`); `internal/format/conda/documents_test.go` (record agreement across representations, server-computed digests, `run_exports` and `about` data from the info archive, the derived `channeldata.json` entry across a newer publish and a newest removal, `created_at` equality across two generations, the shard index's declared list across two publishes with the sweep) |
| AC3 | conformance + integration | `conformance/conda/publish_test.go` (`rattler-build upload artifactory` and `upload prefix` in the rattler-build image; fresh-cache resolve on all five clients; byte and digest comparison; refusal fixtures through `curl`, the over-limit body among them); `internal/format/conda/publish_test.go` (snapshot count and content set, head-snapshot visibility before the response, `info/index.json` and grammar refusals, the `413` under an injected spool limit) |
| AC4 | conformance + integration | `conformance/conda/publish_test.go` (identical and changed-bytes re-upload through `rattler-build`; a retired filename refused `retired` on both bindings; a `state`-seeded `Retirement` record, `conformance-harness.md` AC18); `internal/format/conda/immutability_test.go` (the unchanged publish's `Operation` with no snapshot reference and `unchanged: true`; retirement with same and different bytes, after pruning under an injected clock, across a backwards repoint and back, and with a removal committed between declaration and commit, the twin unaffected, `removed` rendering; the central refusal and its commit-time check are `management-api.md` AC12's `internal/manage/retirement_test.go` and `storage-and-gc.md` AC30's) |
| AC5 | conformance + integration | `conformance/conda/manage_test.go` (the `script` drives every declared kind through the management endpoint, `management-api.md` AC24 and `conformance-harness.md` AC26, then real resolves on all five clients with each captured message; `pixi install --locked` on a pre-revocation lockfile; notices on conda 26 and pixi); `internal/format/conda/manage_test.go` (one snapshot per operation, the declared kinds including `attach`, action refusals with revocation refused under `push` alone per `management-api.md` AC9, the overlay field, absent-filename and non-empty `revoke` or `remove` list refusals, a many-object `withdraw` and `delete-file` as one write each, binding-versus-endpoint equivalence shared with `management-api.md` AC8's table test, `405` `repository-type` on remote and virtual) |
| AC6 | architecture test + integration | `internal/format/conda/arch_test.go` (no renderer in the handler package, the renderer only in `internal/format/conda/index`; the generator package's purity is `signing-service.md` AC2's `internal/index/generator_purity_test.go`); `internal/format/conda/index/golden_test.go` (the generator's fixtures, registered with `signing-service.md` AC25's determinism harness, the shard index's `created_at` taken from the input and not the clock); `internal/format/conda/concurrent_publish_test.go` (two writers, every representation, predecessor repoint, shard-name stability, forward-moving `Last-Modified` across the repoint); `internal/format/conda/shard_retention_test.go` (two publishes replacing one name's shard, the declared list holding two generations, a sweep past grace collecting the third, shared with `storage-and-gc.md` AC16's declared-list fixtures); `internal/format/conda/seed_test.go` (seeded versus published bytes, `signing-service.md` AC21); `internal/format/conda/serve_policy_test.go` (index `Cache-Control` equal on two repositories with different configuration, shard and package headers, package and sidecar `ETag` from the CAS digest through `ServeFile`; the module-wide boundary is `signing-service.md` AC11's `internal/format/freshness_boundary_test.go` and the policy its AC30's `internal/index/serve_policy_test.go`); `internal/storage/metadata_root_test.go` (threshold crossing, sweep, serve) |
| AC7 | conformance + unit | `conformance/conda/names_test.go` (`curl` for the case, traversal and absent-subdir paths; the platform-absent resolve on all five clients); `internal/format/conda/filename_test.go` (right-anchored parse table; CEP-26 refusals including the mixed-case fixture) |
| AC8 | conformance + integration | `conformance/conda/auth_test.go` (private repository on all five clients in every captured credential form; challenge equality across existing and missing repositories; `pull`-less and rejected tokens; the path-token absence asserted over the transcript and the server log capture); `internal/format/conda/auth_test.go` (plaintext refusal under `auth.md` AC27 for every form, the path token included) |
| AC9 | conformance + unit | `conformance/conda/auth_test.go` (the pattern-refusal case `format-handler-interface.md` AC7 requires, in both modes; pattern-scoped tokens through the `credentials` key; the index refusal under real resolves; in-pattern and out-of-pattern publishes through both bindings; the mislabelled fixture); `internal/format/conda/scope_object_test.go` (the object table, per route, `format-handler-interface.md` AC12) |
| AC10 | conformance | `conformance/conda/policy_test.go` (hosted and proxied modes; rules through the `policies` key, a controlled advisory through `advisories`; the raw status line read from the socket; all five clients' transcripts and output; a second configured channel to capture fallback for the `supply-chain-policy.md` AC20 row) |
| AC11 | conformance + integration | `conformance/conda/proxied_test.go` (stand-in serving recorded conda-forge documents and packages; all five clients; network-level assertion from fresh caches; byte comparison; absolute and relative `base_url` stand-ins); `internal/format/conda/proxied_verify_test.go` (shard-name and record-digest verification before commit; digest index from a monolithic-only stand-in) |
| AC12 | conformance + integration | `conformance/conda/proxied_ttl_test.go` (mutating stand-in serving `ETag` and a `max-age` longer and shorter than the layer's TTL; upstream `304` and client `304` at the network layer; mamba's and pixi's `HEAD` probes cold and warm, counted at the stand-in; the vanished-shard revalidation); `internal/format/conda/proxied_freshness_test.go` (the served `Last-Modified` is the cache record's under a stand-in whose own dates move backwards, the shared half being `proxy-cache.md` AC22's `internal/proxy/freshness_test.go`) |
| AC13 | conformance | `conformance/conda/proxied_test.go` (missing filename, subdir and notices; throttling stand-in responses; network-level counts) |
| AC14 | conformance | `conformance/conda/proxied_auth_test.go` (three stand-ins, one per upstream credential kind, provisioned through the `upstreams` key's `credential` entry; a redirecting stand-in for the root-host-only insertion; upstream transcript asserted for the adapter's credential and the absence of the client's; log capture asserted free of the token) |
| AC15 | integration | `internal/format/conda/removal_test.go` (stand-in presenting each event class; the shared-layer half is `proxy-cache.md` AC13's) |
| AC16 | integration + conformance | `internal/format/conda/proxied_integrity_test.go` (corrupt package, misnamed shard, truncated body; CAS and reference assertions; operator record); `conformance/conda/integrity_test.go` (the hosted corrupt-package control on all five clients with each captured message) |
| AC17 | integration + conformance | `internal/format/conda/index/merge_test.go` (the generator's `Merge`: rules per representation, collision order, the derived current index, the `removed` subtraction, notices by `id`, merged shard digest, the merged shard index's declared list with one predecessor generation); `internal/format/conda/virtual_merge_test.go` (on the production runner, the deferred job and staleness bound shared with `signing-service.md` AC19's `internal/index/virtual_merge_test.go`; a sweep past grace between two merges, shared with `storage-and-gc.md` AC16); `conformance/conda/virtual_test.go` (a virtual repository over a local and a remote member; resolves on all five clients; digest assertion on the shadowed package; the virtual created over a never-adopted remote with the stand-in's transcript showing exactly the expanded templates and root literals and the network layer no request to the remote's URL; an upstream change adopted and merged; the virtual-only remote's revalidation from a read past its TTL, shared with `proxy-cache.md` AC26's `internal/proxy/revalidate_job_test.go`); `conformance/conda/virtual_remote_test.go` (the remote-only `osx-arm64` subdir read-driven on a real client across the staleness bound, the `foo-bar` and dot-segment requests at the network layer, the `.zst`-less stand-in excluded with its input record read through the API, shared with `signing-service.md` AC35's `internal/index/virtual_remote_member_test.go` for the cell, cap and grammar half); `internal/format/conda/index/profile_test.go` (the `{subdir}` template with its sources and grammar and the two root literals per `Merge` input, no derivation, round bound one, and a profile lacking an input refused at registration) |
| AC18 | benchmark + conformance | `internal/format/conda/scale_bench_test.go` (digest-index build over the recorded conda-forge noarch index inside a fixture adoption, and one hosted publish into a subdir seeded with that record set regenerating every representation, peak RSS and time against the gate thresholds, `// gate:` annotated, the untouched shard's bytes compared; shared with `signing-service.md` AC4's `internal/index/bench_incremental_test.go`); `conformance/conda/scale_test.go` (the recorded conda-forge documents behind a stand-in; every client resolves; `Range`; warm zero-request run) |
| AC19 | conformance + unit | `conformance/conda/replay_test.go`; the corpus manifest under `conformance/conda/` checked against the exception table by `conformance-harness.md` AC28's `conformance/record/reference_exceptions_test.go` |
| AC20 | integration | `internal/format/conda/upstream_config_test.go` (no upstream request at create or `PATCH`, counted at a stand-in; the `http://` path-token refusal through `upstream.Validate`, shared with `upstream-adapters.md` AC23; the first request against a `404`-everywhere stand-in and against one serving HTML at `noarch/repodata.json`, the negative entry and the operator record; virtual acceptance; `405` `repository-type` on remote writes) |
| AC21 | conformance | `conformance/conda/generations_test.go` (shards-only and `base_url` channels on all five clients; `use_only_tar_bz2` on conda 24; the mamba 2.9.0 entries asserted against the exception list) |
| AC22 | conformance + integration | `conformance/conda/attestation_test.go`, shared with `artifact-verification.md` AC19 and counted for its AC24 verification column (`curl` over both sidecar routes on hosted and proxied repositories; a second attestation appended through `attach` in the `script`; valid, subject-mismatched and channel-mismatched bundles from the fixture Sigstore with the identity policy through the `trust` key; each file installed by a real client); `internal/format/conda/sidecar_test.go` (record digest, same-write publication order, the `attach` snapshot regenerating the shard and monolithic forms, the duplicate bundle's `conflict`, the existing-bytes-plus-attestation publish creating a snapshot, immutable sidecar verification, the verdict read through `Verifier` and no `internal/verify` import) |
| AC23 | conformance + unit | `conformance/conda/notices_test.go` (notices set and cleared through the management endpoint in the `script`, one expired; conda 26 and pixi output asserted; the other three transcripts asserted free of the request); `internal/format/conda/notices_test.go` (the CEP-6 field, level, timestamp and duplicate-`id` refusals) |
| AC24 | conformance | `conformance/conda/dual_format_test.go` (a dual-format build; each client's chosen file and verified digest from the transcript; removal of one twin) |
| AC25 | unit + conformance | `internal/format/conda/capabilities_test.go` (the four declarations, `format-handler-interface.md` AC13); `conformance/conda/rename_test.go` (`repository-lifecycle.md` AC12, presence enforced by `conformance-harness.md` AC26; byte-identical documents and resolves on all five clients under the new name in both modes; the old name's `not-found`) |
| AC26 | integration | `internal/format/conda/proxied_metadata_test.go` (an eviction pass over a remote far over quota, documents and digest index untouched and served inside TTL, both gauges read through `telemetry.NewTestRecorder`; a sweep with the grace lapsed before and after an adoption, the map's declaration asserted in the adoption's transaction and a package request between adoption and sweep resolved with no build on its path; the layer halves are `proxy-cache.md` AC27's and AC29's); `conformance/conda/proxied_evict_test.go` (a real resolve after the eviction pass and the sweep) |

The case set needs only keys already in the harness's closed `setup` vocabulary (its resolved
closed-vocabulary decision, was Q4): `repositories` with their visibility and type,
`credentials`, an `upstreams` stand-in (a fixture server serving recorded conda-forge and
defaults-channel documents and packages, and its credentialed and absolute-`base_url` variants),
`state` for pre-published, pre-patched, pre-revoked and pre-removed files with their sidecars and
`removed` lists carried verbatim in the metadata documents and their `Retirement` records seeded
beside them (`management-api.md`, "Retirement is core-held"), `trust` for the CEP-27 identity
policy of AC22 (`artifact-verification.md` AC25), and `policies` with `advisories` for AC10. The
seed-path obligation this spec once recorded is met by construction: a `state` entry for a hosted
conda file is servable only once its subdir's documents exist, and the index runtime runs before
every commit on a repository whose handler declares an `Indexer`, the seed write included, so
seeded state comes out generated with no seed-side code (`signing-service.md` AC21,
`conformance-harness.md` AC24). The issued credential reaches the clients as URL userinfo,
`mamba auth login`, `micromamba auth login`, `pixi auth login` and, for publish, `rattler-build
upload`'s `--username`/`--password` and `--api-key`. The runner-enforced obligations, both modes
and the unauthenticated, unauthorized and pattern-refusal cases in each, apply from the sibling
specs and are not restated per criterion here.

## Implementation Phases

### Phase 1: Hosted reads and the generated documents
- Waits on `docs/internal/plans/foundation/signing-service.md` reaching `planned` (Blocking
  preconditions)
- The format-first mount, the filename grammar and CEP-26 validation, the mandatory `noarch`
  subdir, the generator package `internal/format/conda/index` behind the `Indexer` interface
  with every index representation served through `ServeDocument` (byte-derived `ETag`s,
  pointer-scoped `Last-Modified`, conditional requests and `Range`) under the per-format serve
  policy, package and sidecar files from the CAS through `ServeFile` (both forms behind
  `Documents` in `Deps`), the challenge and scope mapping with the per-route addressed objects, the
  `403` policy rendering through `WriteRefusal`, the root path token as `auth.md` and
  `format-handler-interface.md` hold it, and `Capabilities()` with the rename case (AC25)

### Phase 2: Publish and management
- The `Operator` declaration: both bindings onto `publish` with the bounded spool and its `413`,
  format, `info/index.json`, `info/run_exports.json` and `about` extraction and validation,
  server-computed digests, immutability with the idempotent and `409` cases, the core-held
  retirement refusal, the write-boundary declaration exercised end to end under concurrency
- Patch, revoke, unrevoke, remove, notices, attestation attachment and sidecar publication as
  the `annotate`, `withdraw`, `restore`, `attach` and `delete-file` kinds with the bulk
  patch-instructions import and its refusals, the CEP-6 notices validation, and the CEP-27
  verdict through `Verifier` (`docs/internal/plans/foundation/management-api.md` is `planned`,
  Blocking preconditions; AC3, AC4, AC5, AC22, AC23)

### Phase 3: Proxied path and virtual repositories
- The `path-token`, `bearer` and `basic` kinds through the adapter with no handler probe at
  configuration, classification per resource, shard-name and record-digest stream-and-verify
  with declared digests, the digest index built in the adoption transaction and declared on the
  remote's blob-digest list with a retained count of zero, the `base_url` rewrite, `ETag`
  revalidation under the layer's TTL and the cache-scoped `Last-Modified`, `HEAD` probes, index
  documents outside the quota in `cache_metadata_bytes`, negative caching with the vanished-shard
  exception, the removal classes, `405` on remote writes, the virtual merge as the `index.merge`
  job with the profile's `{subdir}` templates and root literals over the `.zst`, the merged
  shard index's declared list with one predecessor generation, the read-driven remote-only
  subdir, re-merge on remote adoption and the virtual-only remote's revalidation (AC17, AC26),
  and the conda-forge scale benchmark gate on both paths (AC18)

### Phase 4: Corpus and gate
- Recording session across the named surface (after the harness redaction gate, which covers
  the path token) against conda-forge and the defaults channel, the hosted read half against the
  pinned `conda-index` tree under its exception-list row, replay-match, the second conda and
  mamba generations, the exception-list entries named in Design, the matrix rows for the
  deliberately unimplemented JLAP, content-trust, labels and the two declined upload protocols

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. The ten questions this draft raised were each written in the template's decision
shape and then adopted at their own recommendation under the owner's standing delegation of
2026-09-26, so the loop can continue, and the Fable recheck of 2026-10-01 raised and adopted an
eleventh; each is recorded below as adopted rather than decided, folded through Scope, Design,
the criteria and the Test Plan in the same pass, and reversible by the owner at any time.
`grep -rn "standing delegation"` is the owner's review queue. Every record carries the
recheck's verdict.

### Resolved: which upload protocols are served as publish bindings (was Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the path-addressed `PUT`
in the Artifactory shape and the multipart `POST` in the prefix.dev shape, both bindings onto one
registry-owned publish operation; anaconda.org's and quetz's protocols recorded as deliberately
unimplemented (Scope; Design, "The publish path"; AC3, AC9).

The question: the ecosystem has no publish contract, and `rattler-build upload` speaks four
proprietary ones, all captured. A registry must choose which to answer, and each one answered is
a matrix claim, a credential form and a request shape to hold forever.

**Recommendation:** A. The `PUT` is the native form of "put a file into a static layout", costs
no request the registry does not already understand, and authenticates with the Basic form
`auth.md` already verifies; the prefix.dev shape is one request with a Bearer token, the form the
newest tooling uses, and is expressible under the mount by pointing `-u` at the repository.
anaconda.org's flow emulates an S3 presigned post and a package-and-release object model with
labels the shared model does not have; quetz's needs a header credential the verifier does not
know and a `force` switch whose true position is the immutability rule's negation.

| Option | You get | It costs |
|---|---|---|
| **A. `PUT` by path plus prefix.dev multipart; anaconda.org and quetz declined** | Two real-client-driven bindings on existing credential forms; one publish operation behind both | Publishers scripted against `anaconda upload` or `quetz` switch targets |
| **B. All four** | Every existing upload script works unchanged | An S3-shaped six-request flow and a package-and-release model to emulate, a new `X-API-Key` verifier form, and a `force=true` position that must be refused anyway |
| **C. `PUT` only** | The smallest surface | Publishers on the rattler toolchain's default target configure an Artifactory target instead |

**Why this is yours:** it decides which proprietary protocols this product answers to, a
compatibility promise users will hold it to.

Accepted cost: the two exception-list entries, and a documentation line per declined target.

Rechecked on Fable 2026-10-01: confirmed. The options were framed fairly and A is right: the two
bindings reuse credential forms the verifier already holds, and B's `force=true` position is
not implementable under immutability at any effort. One cost the record under-stated: a body
over `management.publish_spool_limit` (1 GiB by default) is refused `413` on both bindings,
and `rattler-build` cannot drive the API's upload session, so a package that large is published
through the API alone (Design, "The publish path"; AC3).

### Resolved: which action revocation and patching require (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: patch, revoke, unrevoke
and notices require `push`; removal requires `delete` (Design, "Patch, revoke, remove and
notices are management operations"; AC5).

**Revised 2026-09-28 by reconciliation, not re-decided here.** This record said its mapping was an
input to the reconciliation `management-api.md` owed, and that spec made it: its resolved
withdraw-action decision (was Q1 there, itself adopted under the standing delegation) places
revocation and unrevocation on the `withdraw` and `restore` kinds, which require `delete` for
every format by the effect rule "an operation that takes something away from resolution requires
`delete`", so this adoption's `push` for revoke and unrevoke is superseded; patches and notices
stay `push` as `annotate`, and removal stays `delete` as `delete-file`. The accepted cost moves:
a conda publish-only CI key can no longer revoke its own upload, which is the cost that spec
recorded for its option A. Design, AC5 and the management table carry the revised mapping.

The question: `auth.md` maps removal-class operations to `delete` and metadata changes to `push`,
`cargo.md` and `hex.md` mapped their yank-like operations to `push`, `pypi.md` mapped yank to
`delete`, and `management-api.md` must reconcile them. Conda's revocation has to be placed.

**Recommendation:** A. A revocation removes nothing: the file still downloads, a lockfile that
pins it still installs (captured on pixi), and only fresh solves skip it, which is Cargo's yank
exactly and is the effect a publisher's own key should be able to produce on its own release; a
removal is a removal-class write.

| Option | You get | It costs |
|---|---|---|
| **A. Patch and revoke under `push`, remove under `delete`** | The vocabulary applied by effect; a CI publish key can hotfix and revoke its own uploads | A `push` key can make a record unselectable, which is louder than a deprecation |
| **B. Revoke under `delete`** | One rule for every "mark a version" operation | Misclassifies an operation that removes nothing, and adds to the PyPI-versus-Cargo divergence the management API must reconcile |

**Why this is yours:** it places an ecosystem's operation on a vocabulary you settled, and it is an
input to the reconciliation `management-api.md` owes.

Accepted cost: one more row for that reconciliation, recorded in the sibling consequences.

Rechecked on Fable 2026-10-01: confirmed as revised. The revision by `management-api.md`'s
effect rule (its was-Q1, itself confirmed on Fable 2026-09-30) stands, and the record states
its cost honestly: a conda publish-only key cannot revoke its own upload. The recheck added the
bulk import's consequence of the same rule: an imported `patch_instructions.json` applies its
overlays under `annotate` and is refused when its `revoke` or `remove` lists are non-empty,
since those are `delete` effects (Design, "Patch, revoke, remove and notices"; AC5).

### Resolved: the `/t/{token}/` path-carried credential (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: accept the form, as a
reserved root-anchored `/t/` mount stripped and verified by the shared authorizer, the segment
redacted from every log, requested of `auth.md` as a fifth presentation form and of
`format-handler-interface.md`'s registration layer as a carve-out (Design, "Authentication";
AC8, AC14; the Phase 1 note).

The question: `conda` without a plugin can present a credential only as URL userinfo Basic, a
`.netrc` entry or a `/t/{token}/` path segment; `mamba` and `pixi` store the same form as a
"conda token" and rewrite the URL; and the segment sits between the host and the format-first
mount, where no handler sees it and where an access log would record it.

**Recommendation:** A. It is the ecosystem's own credential convention for private channels
(anaconda.org, quetz), the only header-free form `conda` has, and a registry that refuses it
tells every conda user to write a password into `.condarc`; the cost is one reserved mount and
one verifier form, both mechanical.

| Option | You get | It costs |
|---|---|---|
| **A. Accept `/t/{token}/` as a reserved root mount handled by the shared authorizer** | Every pinned client's stored token form works; `conda` needs no plugin | A fifth presentation form in the verifier, a registration carve-out, and log redaction of a path segment |
| **B. Refuse it; document Basic and Bearer** | No shared-layer amendment | `conda` users write the token as a URL password into a config file, and `pixi auth login --conda-token` and `mamba auth login --token` do not work here |

**Why this is yours:** it adds a credential form to a security surface you settled, and it claims
a root path segment for one format.

Accepted cost: the two sibling amendments, and the Phase 1 dependency on the auth one. Both are
now made: the root path token row of `auth.md`'s presentation-form table with its AC31, and the
reserved `t` segment of `format-handler-interface.md` with its AC11 fixture; the upstream half is
`upstream-adapters.md`'s `path-token` kind.

Rechecked on Fable 2026-10-01: confirmed. All three sibling pieces exist at HEAD (`auth.md`'s
root path token row and AC31 naming `conformance/conda/auth_test.go`, the reserved `t` row of
`format-handler-interface.md`, the `path-token` kind of `upstream-adapters.md` AC19) and each
is `planned`. One clause added from `upstream-adapters.md`'s was-Q3 as rechecked: a path token
is never presented over plain HTTP, so an `http://` upstream with one is refused at
configuration (AC20).

### Resolved: where the index documents are produced (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: every representation is
produced by the shared index service inside the triggering write, stored at the repository level
with shards as CAS blobs, CAS-backed above the threshold, with the handler holding no renderer
(Design, "Every hosted index document is a write-triggered document"; AC6; the Phase 1
precondition).

The question: `cargo.md` and `nuget.md` render their per-package documents on request;
`helm.md`, `maven.md` and `hex.md` store write-triggered documents. A conda subdir index is
repository-wide, contended, large, and read in five representations that must agree.

**Recommendation:** A. A render on read of a conda-forge-sized document is unserveable, the
representations must be produced from one state at one moment, and the service is built at the
same step for this class.

| Option | You get | It costs |
|---|---|---|
| **A. The index service generates and stores every representation inside the write** | The five representations agree by construction; the read path is a byte copy; one regeneration implementation with Maven, Helm, Debian and RPM | Phase 1 waits on that spec; a publish pays the regeneration of its subdir |
| **B. Render on request** | No stored documents | A 188 MB render per cache miss, and no moment at which the representations are guaranteed to agree |
| **C. Store the monolithic document, derive shards and compressed forms on request** | Fewer stored bytes | A recompression per request of the document every conda 24 and micromamba resolve reads, and a shard render on the hot path |

**Why this is yours:** it sequences this format behind a shared service and decides that a
repository-wide index is never rendered on a read.

Accepted cost: the precondition, and the requirement list on the index service. The service
now exists as `signing-service.md`, which placed the renderer in the format's own generator
package behind the optional `Indexer` interface (its resolved renderer-placement decision, was
Q3 there) and the trigger in the shared write path (its resolved trigger decision, was Q1 there),
so "the handler holds no renderer" means the handler's HTTP package, with the bytes produced in
`internal/format/conda/index`.

Rechecked on Fable 2026-10-01: confirmed, amended in its cost. "A publish pays the regeneration
of its subdir" under-states it: the monolithic JSON, its `.zst` and `.bz2` and the current index
are each one document replaced whole, so every publish is O(records in the subdir) however
incremental the shards are, and at conda-forge scale that is a 188 MB JSON and a bzip2 pass per
publish, serialised per subdir under the document lock. AC18 now gates the hosted regeneration
at that scale beside the proxied map build. Two more things the fold had left to the clock or
to a stored value: the shard index's `created_at` is the write's commit time from the
generator's input, never the clock, or the determinism harness (`signing-service.md` AC25)
fails on it; and `channeldata.json`'s per-package entry is derived at generation from the newest
version's ingest-extracted `about` data rather than kept on the package-level document (Design,
"Mapping onto the shared model"; AC2, AC6).

### Resolved: policy-refused records stay in the served index (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the index is generated
without consulting policy, a refused record stays listed, and the refusal is rendered at the
package download as a `403` naming the policy (Design, "Policy refusals on the wire"; AC10).

The question: on this format the client solves from the index before it fetches anything, so a
record the policy layer will refuse is selected first and refused second, and every client
reports it as a failed download. Eliding refused records from the index would make the client
choose another version instead.

**Recommendation:** A. `supply-chain-policy.md` evaluates policy inside the shared resolution
calls, never in a generator, and its AC4 keeps the policy layer off the handlers; an elision
would put policy evaluation into index generation and require every advisory sync to regenerate
every index that names an affected record. A loud `403` naming the rule is also the honest
outcome: a silently absent version is a mystery, a refused one is a message.

| Option | You get | It costs |
|---|---|---|
| **A. Index unaware of policy; refuse at download** | The boundary `supply-chain-policy.md` holds stays intact; the refusal names its reason | A CI solve fails mid-transaction rather than picking another version |
| **B. Elide refused records at generation** | Clients route around a refused version automatically | Policy evaluation inside the generator, a regeneration per advisory sync, and a version that vanishes without a word |

**Why this is yours:** it trades a friendlier failure for a boundary you settled.

Accepted cost: the mid-transaction `403`, and its rendering table in Design.

Rechecked on Fable 2026-10-01: confirmed. The boundary `supply-chain-policy.md` holds is
intact at HEAD (its AC4 and AC15), the status-line phrase is the one channel to a conda user,
and AC10's capture fills the binding row. B's regeneration-per-advisory-sync cost is real at
this format's scale (a 188 MB rewrite per subdir per sync) and was priced fairly.

### Resolved: virtual repositories and the merge rules (was Q6)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: `virtual` conda
repositories are served, with the per-subdir merge rules stated in Design (union of records in
member order, first member wins a filename collision, merged shards, empty base URLs, members
resolved in order for content) (Scope; Design, "Every hosted index document is a write-triggered
document" and "Virtual repositories"; AC17, AC20).

The question: `hex.md` refused virtual repositories because its resources are signed under a
repository name; conda's are unsigned and nameless, so a merge is possible, and the merge rules
are a product choice: what wins a collision, and what `channel_priority` means for a client that
sees one channel.

**Recommendation:** A. The use case is exactly the one users configure a repository manager for
(a private channel in front of conda-forge), Artifactory and Nexus both offer it, and member
order is `data-model.md`'s only failover mechanism, so "first member wins" is the rule already
settled for content applied to records.

| Option | You get | It costs |
|---|---|---|
| **A. Serve virtual repositories; first member wins collisions; one merged shard per name** | One channel URL over private and proxied content, with private builds shadowing public ones | A merge per subdir per member change, and a `channel_priority` semantic operators must learn is member order |
| **B. Refuse virtual repositories, as Hex does** | No merge code | Users configure two channels and rely on client-side priority, which pixi and conda apply differently by default |

**Why this is yours:** it decides a collision rule users will read as a promise, and it commits
the index service to a merge for one format.

Accepted cost: the merge requirement on the index service and its re-run on member revalidation.
`signing-service.md` runs the merge as the deferred, coalesced `index.merge` job with a staleness
bound (its "Virtual merges", AC19), so a member's change reaches the virtual within that bound
rather than inside the member's write, and the handler's `Capabilities()` now declares the choice
as `Virtual: supported` (`format-handler-interface.md` AC13). The re-run on member revalidation
this record asked for is that spec's adoption hook (its resolved remote-member decision, was Q16,
AC35), and the profile declares the member inputs a never-adopted remote is first fetched
through (Design, "Every hosted index document is a write-triggered document"; AC17).

Rechecked on Fable 2026-10-01: confirmed, amended in its fold, which was incomplete in five
places the adversarial pass found. The merged `current_repodata.json` must be derived from the
merged records, not merged from members' current indexes, or a classic-solver client of the
virtual sees a "newest" that the merged `repodata.json` contradicts; the merged `removed` list
drops any filename a member's records still list, since a file removed from one member and
present in another is served; two members' notices sharing an `id` resolve first-member-wins;
the merged shards had no keep-alive (a merged shard is content-addressed and held by no
member), so the merged shard index's declared list holds them with one predecessor generation
under `signing-service.md` AC19; and the member inputs the format closing sweep folded without
a question were a static path list over `repodata.json`, which the resolved member-input
decision (`signing-service.md` was Q21) replaces with a `{subdir}` template sourced from the
other members plus the constant `noarch`, a read-driven first fetch for a subdir only the
remote holds (its was-Q22 bounding the cells), and the representation question the next
record decides. The `channel_priority` cost stands.

### Resolved: conda-forge as a preconfigured upstream (was Q7)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: conda-forge is
user-configured in v1 and not added to the preconfigured set; the trigger for revisiting is the
catalogue's Tier 2 verdict, through `proxy-cache.md`'s own extension mechanism (its resolved
preconfigured-set extension, was Q14), which left crates.io, pub.dev and repo.hex.pm on the same
footing.

**Recommendation:** B, for sequencing rather than effort: Conda is Tier 2 and built only if the
breadth gate says so, so amending a sibling's settled decision on its account now would be a
half-applied change against a format that may not be built.

| Option | You get | It costs |
|---|---|---|
| **A. Preconfigure conda-forge now** | A conda-forge cache in thirty seconds | A sibling decision reopened from a Tier 2 spec before the gate that decides whether Tier 2 happens |
| **B. User-configured in v1, revisited on the Tier 2 verdict** | No sibling amendment; the adapter validation rule still ships | A worse first-run story than for npm until the revisit, and no nightly run against the real conda-forge |

**Why this is yours:** it amends a set you priced for three upstreams, a product and sequencing
call.

Accepted cost: the proxied cases run against a stand-in only; the real conda-forge is exercised
by the recording session and the scale benchmark's recorded documents, and nothing scheduled,
until the revisit.

Rechecked on Fable 2026-10-01: confirmed. `proxy-cache.md`'s second extension of the set (its
was-Q17, confirmed on Fable 2026-09-30 and flagged owner-facing there) did not add conda-forge,
so the sequencing argument still holds and the revisit trigger is unchanged.

### Resolved: rewriting `base_url` on the proxied path (was Q8)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: an absolute
`info.base_url` or `info.shards_base_url` in an upstream index is rewritten to the empty string
in every representation at cache materialisation, the registry fetching from the absolute base
itself; a relative or empty value is left untouched (Design, "The proxied path"; AC11).

The question: CEP-15 and CEP-16 let an upstream send its clients to another host for packages
and shards, and a proxied index served verbatim would send this registry's clients there too,
past the cache; but rewriting a 28 MB `.zst` means decompressing and recompressing it, and the
`.bz2` twin too.

**Recommendation:** A. A cache that clients bypass is not a cache, every live channel sampled
uses relative or empty values so the rewrite is rarely exercised, and doing it once at
materialisation rather than on every request bounds the cost to one recompression per
revalidation.

| Option | You get | It costs |
|---|---|---|
| **A. Rewrite absolute values at materialisation** | Every package and shard fetch stays on this registry | A recompression per revalidation of an affected subdir, and a served `ETag` that is ours rather than the upstream's |
| **B. Serve verbatim** | Byte-faithful documents | Clients fetch packages from the upstream's host directly, which defeats the product on such a channel |
| **C. Refuse upstreams with absolute base URLs at configuration** | No rewrite code | A legitimate CEP-15 channel cannot be proxied at all |

**Why this is yours:** it is the one place this format alters an upstream document, and it
decides what a proxied conda repository promises about where bytes come from.

Accepted cost: the recompression, and an exception-list entry for the altered field.

Rechecked on Fable 2026-10-01: confirmed. The rewrite is the one place a proxied conda document
differs from the upstream's bytes, AC11 names it, and the cost is bounded to one recompression
per adoption because the digest index is now built in the same adoption transaction from the
same streamed pass (Design, "The proxied path"), so a rewritten subdir costs one parse and one
recompression, never two passes.

### Resolved: which generated documents a hosted channel carries (was Q9)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: every representation in
the document table, `current_repodata.json`, `run_exports.json` and `channeldata.json` included,
and not `index.html`, `rss.xml`, `repodata_from_packages.json` or `patch_instructions.json`
(Scope; Design, "The index is one document in five representations"; AC2).

The question: conda-index writes eleven kinds of file per subdir and three at the root; only
some are read by any pinned client (`current_repodata.json` by the classic solver alone,
`channeldata.json` and `run_exports.json` by none), and each one generated is one more document
per write.

**Recommendation:** A. Everything a documented consumer reads is generated, because a channel
that lacks a document its consumer expects fails silently at that consumer (the classic solver,
conda-build's run-exports lookup, a UI reading channeldata); the four omitted are a browsing
surface and the generator's own intermediates, which no consumer reads and which would expose
this registry's patch state as a public document.

| Option | You get | It costs |
|---|---|---|
| **A. Every consumer-read document; no HTML, RSS or generator intermediates** | Every documented consumer works; nothing internal is published | Three more documents regenerated per write, `channeldata.json` channel-wide |
| **B. Only what the pinned clients requested (the index representations and notices)** | Fewer documents per write | The classic solver, conda-build and any UI reading channeldata fail on this channel |
| **C. Everything conda-index writes** | Byte-for-byte parity with a conda-index tree | Publishing `patch_instructions.json` exposes management state, and HTML and RSS are UI-era |

**Why this is yours:** it sets what a hosted channel promises to tools this registry does not
test.

Accepted cost: the regeneration set in Design, and the exception-list entries for the omitted
files.

Rechecked on Fable 2026-10-01: confirmed, amended in its fold. The set is right, but two of
the documents had no stated source: `run_exports.json` and the shards' inlined `run_exports`
come from each package's `info/run_exports.json` (the file conda-index's cache extracts;
`index.json` carries none, which the mapping had implied), and `channeldata.json`'s fields come
from `info/about.json` and the flags conda-index derives from the file list, both extracted at
ingest so no generator reopens an archive. The patch overlay now excludes `run_exports`, or the
shards and `run_exports.json` would disagree (Design, "Mapping onto the shared model", "Every
hosted index document is a write-triggered document"; AC2, AC5).

### Resolved: the addressed object of a publish (was Q10)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the publish reports
`{name}/{version}/{build}` parsed from the URL's filename (the `PUT` binding) or from the
multipart part's declared filename (the prefix.dev binding), both of which precede the bytes, and
the registry refuses the upload after the body arrives when `info/index.json` disagrees with it
(Design, "Addressed objects and pattern scopes"; AC3, AC9).

The question: `nuget.md` and `hex.md` peek into the archive for a coordinate their URLs do not
carry; here both bindings carry the filename before the body, but a filename can lie.

**Recommendation:** A. The filename is what the ecosystem addresses a package by, it is available
before any byte is spooled, and confirming it against the package's own metadata after arrival
is the same defence `ansible-collections.md` applies to a mislabelled multipart part: a lie
cannot land under the pattern it claimed, because the mismatch is refused.

| Option | You get | It costs |
|---|---|---|
| **A. Object from the filename before the body; confirmed against `info/index.json` after** | Patterned `push` works on both bindings; no archive peek on the authorization path | A mislabelled upload is spooled to the bounded buffer before it is refused |
| **B. Bounded peek into the archive for `info/index.json`** | Authorization from the package's own metadata | A ZIP central directory sits at the end of a `.conda`, so the peek is a full spool anyway, and the `.tar.bz2` needs decompression to reach `info/` |
| **C. Report `none` for publish** | No parsing before authorization | A patterned `push` never authorizes a publish, so per-package CI credentials are impossible here |

**Why this is yours:** it decides what a patterned CI credential can do on this format and
adopts a sibling's precedent for a security boundary.

Accepted cost: the bounded spool of a refused mislabelled upload, sized by the same constant that
bounds every publish.

Rechecked on Fable 2026-10-01: confirmed. `management-api.md`'s resolved binding-scope decision
(was Q13 there, confirmed on Fable) is exactly this shape: the route's object precedes the
bytes and `Submit` evaluates every `Authorize` pair on both ways in, so the binding can only add
a refusal. The constant is now named (`management.publish_spool_limit`).

### Resolved: which representation a merge reads from a remote member (was Q11, raised and adopted 2026-10-01)

**Adopted 2026-10-01 under the owner's standing delegation**, in the Fable recheck. Option B:
the `{subdir}` template's record input is `{subdir}/repodata.json.zst`, never `repodata.json`;
a remote member whose upstream answers `404` for the `.zst` of a subdir contributes nothing to
the virtual for that subdir, recorded per document on the merged set's input record, and the
operator documentation states that a virtual member must serve the compressed form (Design,
"Every hosted index document is a write-triggered document"; AC17 and its row).

The question: the format closing sweep declared `{subdir}/repodata.json` as the merge's record
input because CEP-36 makes it the one representation every channel must serve. A remote reached
only through a virtual is revalidated after the layer's metadata TTL (low minutes) whenever the
virtual is read, with one conditional request per input, and conda-forge's noarch index changes
every few minutes, so most revalidations transfer the whole document: 188 MB for the `.json`
against 28 MB for its `.zst`, per subdir, per TTL. Over a day of continuous reads that is the
difference between gigabytes and hundreds of megabytes for one subdir, and nothing in the
record had priced it.

**Recommendation:** B, because every live channel sampled (conda-forge, defaults, prefix.dev)
serves the `.zst`, conda 24 and micromamba already depend on it as their first choice, the
harness's own reference tree enables it, and a channel that lacks it is a channel the oldest
pinned clients would fall back on, not a channel a virtual is configured over; the input
interface cannot express a fallback (a second declared input is a second fetch every round), so
a fallback would cost the `.json` on every round, which is the problem.

| Option | You get | It costs |
|---|---|---|
| **A. `repodata.json`, the mandatory representation** | Any CEP-36 channel can be a member | 188 MB per changed revalidation at conda-forge scale, per subdir, which the TTL multiplies into gigabytes a day |
| **B. `repodata.json.zst`, the recommended representation** | One seventh of the transfer; the same bytes once decompressed | A channel serving no `.zst` contributes nothing to a virtual, visible on the input record and in the operator documentation |
| **C. Both declared, the merge reading whichever the remote holds** | A fallback for `.zst`-less channels | Both are fetched every round, so the fallback costs the `.json` on every channel, including the ones that need no fallback |

**Why this is yours:** it decides which conda channels can be virtual members, a compatibility
promise users will read as a rule, and it trades that against upstream bandwidth an operator
pays for.

Accepted cost: the `.zst`-less member's exclusion and its documentation line; the merge
decompresses 28 MB per subdir per round instead of parsing 188 MB, which is cheaper, not dearer.
A lost to the bandwidth; C to paying A's cost everywhere. Reversible by the owner by switching
the template to `repodata.json`, after which AC17's `.zst`-less clause inverts.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | e690dfa | authoring pass: grounded first draft, not a review | Grounded the wire contract three ways: captured traffic from conda 26.7.1 and 24.1.2, mamba 2.9.0, micromamba 2.3.3 and pixi 0.81.0, pinned by image digest, run in containers against a logging stub serving channels indexed by the real conda-index 0.13.0 with a patch generator (a dependency hotfix, a removal, a revocation), across three rounds (cold, warm-inside-TTL and post-TTL resolves with each client's probe order and conditional requests, offline, classic solver, a shards-only channel, a monolithic-only channel, a CEP-15 `base_url` channel, a `/t/` token URL, Basic from URL userinfo and from each client's stored login, Bearer, the stored conda-token form of mamba and pixi, a credential-less private channel, a channel with no `noarch`, a channel with only `noarch`, a missing channel, a policy-shaped `403` on a package, a corrupted package, a dual-format build with and without `use_only_tar_bz2`, a removed version, a revoked version on a fresh solve, on an exact pin and under `pixi install --locked`, a mixed-case package name, `search` on each client, and the clients' cache state files), plus `rattler-build 0.76.1` driven once per upload target to capture the anaconda.org, prefix.dev, quetz and Artifactory upload protocols; the CEPs (6, 12, 15, 16, 21, 26, 27, 34, 35, 36, 38, 42, 48, 50), the conda-index reference and source, the conda source in both pinned images (the probing order, the seven-day negative memory, `repodata_use_shards`, the absent JLAP interface), the pixi and rattler-build references, the anaconda-client source, and the Artifactory and Nexus documentation; and the live conda-forge, defaults and prefix.dev channels (sizes, headers, `304`s on both conditional headers, `206`, `404`s, the bad-token `200`, the JLAP refusal, a shard verified against its name, and the bytes-versus-hex digest encoding divergence). Design built from that: the layout and the five-representation index with its per-client discovery order; the shared model mapping with filename-keyed records, a patch overlay and a retirement set rendered as `removed`; every representation as a write-triggered document of the shared index service with a five-item requirement list, incremental shards, the merge, and unsigned generation; the publish path with the four captured upload protocols and the two served as bindings, ingest validation against `info/index.json`, immutability and retirement, and the write-boundary declaration; patch, revoke, unrevoke, remove and notices as management operations with captured effects, revoke as a yank; CEP-26 rules and the mandatory `noarch`; four credential forms including the path token and no client reacting to a challenge; the addressed-object table with the consequence that a patterned `pull` cannot resolve; the `403` rendering on all five clients; integrity, CEP-50 sidecars and the OSV finding; the proxied classification with shard-name and record-digest verification, the digest index, the `base_url` rewrite, negative caching, conda-forge scale and conda's rows of the removal table; and virtual repositories with their merge rules, against Hex's refusal. Ten questions written in decision shape and adopted under the standing delegation: the two upload bindings (AC3, AC9), revoke and patch under `push` (AC5), the path-carried token (AC8, AC14), generation by the index service (AC6), no index elision for policy (AC10), virtual repositories with first-member-wins (AC17, AC20), conda-forge not preconfigured, the `base_url` rewrite (AC11), the generated-document set (AC2), and the filename-first publish object (AC3, AC9). Twenty-four criteria, each with a Test Plan row. Sibling consequences recorded in the authoring report, not applied here: `auth.md`'s fifth presentation form (the `/t/{token}/` path segment, its log redaction and AC31), client-table rows for conda, mamba, micromamba, pixi and rattler-build, and the revoke row for its action reconciliation; `format-handler-interface.md`'s reserved root-anchored `/t/` carve-out; the `management-api.md` operations including the bulk patch import; the `signing-service.md` requirement list including the merge; the `upstream-adapters.md` path-token insertion and the prefix.dev `303`; the `artifact-verification.md` CEP-27 verifier; the `conformance-harness.md` seed path invoking the index service and the path-token redaction rule; conda's rows in `proxy-cache.md`'s removal table; the reason-phrase finding and the missing OSV ecosystem for `supply-chain-policy.md`; and a Conda row in the management-surfaces analysis. Stays draft; awaits an independent review. |
| 2026-09-28 | 15ced69 | cross-spec reconciliation of the foundation wave, on Opus. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` naming this file verified against the current text of its source spec before applying. From `management-api.md` (reconciliation table, resolved withdraw-action decision was Q1, resolved retirement-placement decision was Q3, `Operator`): revoke and unrevoke are `withdraw` and `restore` under `delete`, reversing this spec's adopted `push` (a revision note under the resolved revocation-action record), patches and notices `annotate`, removal `delete-file`, publish `publish` with the two upload routes declared bindings; retirement moved to the core-held `Retirement` record keyed `{subdir}/{filename}` and refused centrally with `retired` (409), the served `removed` list kept as format state in the repository-level document so a repoint restores it; AC4 and AC5 rewritten, `405` as `repository-type`. From `signing-service.md` (items 11 and consequences 13, 15): the `Indexer` and generator package `internal/format/conda/index`, unsigned consumer (AC24 there), pre-commit dispatch, per-document lock, `ServeDocument` with pointer-scoped `Last-Modified`, the `index.merge` job; the five-item requirement list mapped onto the contract; AC6 extended. From `auth.md` (AC31, was Q23, Open item 14, auth reconciliation 4) and `format-handler-interface.md` (AC11, sweep 1 item 6): the root path token and reserved `t` now exist, the 'fifth form, until the amendment lands' wording removed; no conda route is a descriptor, stated. From `upstream-adapters.md` (item 12): `path-token`, `bearer`, `basic` kinds, `Validate` before the handler's probe, redirects inside the adapter (AC14, AC20). From `supply-chain-policy.md` (was Q10, AC18, AC20; reconciliation 10): `WriteRefusal`, the status-line phrase, AC10 fills conda's `pending` binding row; the OSV gap now cited from its coverage table and Phase 1 cataloguer selection. From `artifact-verification.md` (AC19, AC21, AC24, AC25): the CEP-27 verdict through `Verifier`, recorded not enforced, AC22 extended, the test file aligned to its `conformance/conda/attestation_test.go`. From `proxy-cache.md` (AC22, was Q15, AC13 classes): cache-scoped `Last-Modified` on remotes (AC12), declared-digest fetches, removal rows named by class. From `conformance-harness.md` (reconciliation 4, AC13, AC24, AC26): the seed-path obligation met by construction, redaction of the path segment inherited, per-kind and `rename_test.go` rules. From `repository-lifecycle.md` AC12 and `format-handler-interface.md` AC13: a Capabilities and lifecycle section and new AC25. Twenty-five criteria, each with a Test Plan row; no question adopted, so no `fable_recheck` marker. Consequences for other files are in this pass's report (a conda row in `proxy-cache.md`'s event-class table, the remote-revalidation merge trigger in `signing-service.md`, the finer-than-object retirement coordinate in `management-api.md`). `node scripts/check-spec.js` reports no failure in this file. Stays draft; awaits an independent review. |
| 2026-09-28 | f8ad8b2 | format closing sweep on Opus. Not a review | Not a review. Every still-open item in `agents/spec-loop/consequences.md` targeting this file, from every section, verified against the current text of its source spec and of this file. Applied: foundation-leftovers item 2 and `signing-service.md` AC35 (the merging profile's member-input paths per `Merge` input, replayed for `noarch` and every subdir another member holds, registration refusing a profile without them; the subdir only a remote holds reported as a gap), signing-service closing-sweep item 6 and proxy-cache closing-sweep item 6 (remote adoption re-merges through the adoption hook, was-Q16, AC35; the virtual-only remote's revalidation, `proxy-cache.md` AC26; the virtual's forward-moving freshness, was-Q15, AC34; AC17 and its row extended, the Q6 record's accepted cost updated); eviction-settlement item 7 (the remote's index documents and digest index outside the quota in `cache_metadata_bytes`, `proxy-cache.md` was-Q21, AC29), which exposed a keep-alive-by-mention hole the data-loss waves had not listed for conda: the digest index was a CAS-backed map named only inside the remote's document, now declared on its blob-digest list with a retained count of zero under `proxy-cache.md` was-Q19 and consistent with was-Q22 (a repository-wide index declares at repository level), new AC26; `signing-service.md` was-Q14 (packages and sidecars through `ServeFile`, Blocking preconditions, Phase 1) and was-Q18 (this spec's per-repository index `max-age` replaced by the per-format `max-age=60`, AC30; AC6 extended); management-api closing-sweep items 4 and 5 (was-Q13 binding scope, was-Q14 claims checked at declaration and again at commit, was-Q15 declared unchanged publish, was-Q16 wire rendering of `retired`; AC4 and its row extended). Found while verifying: `signing-service.md` AC36 admits remote documents into a signed merge only under `verified`, and nothing conda serves is signed, so the spec now states that the rule governs signed bodies and the unsigned conda merge admits them (AC17). Corpus: the publish flows were to be recorded against this registry itself, which `conformance-harness.md` AC28 cannot accept and which would replay-match by construction; the hosted read half is now recorded against a pinned `conda-index` 0.13.0 tree and the write half has no corpus, both reported as exception-list rows (AC19 and its row). Found already done: Open item 14 and the management-api 7 and 13 items (applied at 15ced69), sweep-1 item 6 (FHI AC11 cited), auth rows for conda and rattler-build present. Skipped: nothing. No question adopted; a `fable_recheck` marker added for the member-input expansion judgement. 26 criteria, each with a Test Plan row. Stays draft. |
| 2026-10-01 | 71e0ccb | Fable recheck: full review (claim verification of every sibling citation at HEAD: `signing-service.md`'s `Profile` and `Generate` contract, was-Q20, was-Q21, was-Q22, AC4, AC19, AC25, AC30, AC35, AC36; `proxy-cache.md`'s was-Q2, was-Q19 to was-Q23, AC26, AC27, AC29 and its paired-set rule; `management-api.md`'s conda rows, the `attach` kind, `management.publish_spool_limit`, AC4, AC8, AC12, AC14, was-Q13 to was-Q16; `upstream-adapters.md` AC19, AC20, AC23 and its `path-token` row; `auth.md`'s root path token row and AC31; `format-handler-interface.md`'s reserved `t`; `conformance-harness.md`'s two conda rows and was-Q7; `artifact-verification.md`'s CEP-27 entry and AC19; `supply-chain-policy.md`'s conda coverage and binding rows and AC11; `cran.md`'s was-Q10 citing this spec's `{subdir}/{filename}` claim, which is that shape; the conda CEP index and the conda-index sources for `run_exports`, `CHANNELDATA_FIELDS`, `created_at`, `_apply_instructions` and the default output set, fetched this run; the tree holds no conda code, so no code claim was checkable) + the adversarial lens at full strength on the whole design as unreviewed (the five clients, shards, revoke versus remove, patch instructions, notices, `run_exports`, `channeldata`) + constitution + re-examination of the ten authoring adoptions and the three judgements the closing sweep folded without a question | Brought current first: every open item in `agents/spec-loop/consequences.md` targeting this file applied and verified against its source's current text (the signing-service recheck's item 6: the member inputs as a `{subdir}` template sourced from the other members plus the constant `noarch` and the read-driven remote-only subdir, cited to was-Q21, was-Q22, `proxy-cache.md` AC26 and `data-model.md` AC45, and AC36's unsigned-virtual clause cited as explicit, replacing the was-Q17 citation and the "reported rather than invented" gap; the conformance-harness gate's was-Q7, the manifest pinning the reference's digest; every earlier item re-found applied). Verdicts on the ten adoptions: Q1 confirmed (cost added: bodies over the spool limit refused `413`, published through the API alone); Q2 confirmed as revised (the bulk import's `revoke` and `remove` lists refused under `annotate`, since a kind carries one action); Q3 confirmed (no path token over plain HTTP, `upstream-adapters.md` was-Q3); Q4 confirmed and amended in cost (every publish rewrites the monolithic forms whole, bzip2 included, so AC18 gates hosted regeneration at conda-forge scale; `created_at` from the write's input for determinism; `channeldata` derived at generation, not stored on the package-level document); Q5 confirmed; Q6 confirmed and amended in fold (the merged current index derived from merged records, the `removed` subtraction, notices by `id`, the merged shards held by the merged shard index's declared list with one predecessor generation, and the static member-input list replaced); Q7 confirmed; Q8 confirmed; Q9 confirmed and amended in fold (`run_exports` from `info/run_exports.json`, which `index.json` does not carry; `about` data extracted at ingest; the overlay excludes `run_exports`); Q10 confirmed. The three folded judgements: the member-input expansion amended as above and its representation decided as Q11, raised and adopted under the standing delegation (the template reads `repodata.json.zst`, one seventh of the `.json`'s transfer per changed revalidation; a `.zst`-less member contributes nothing, recorded; owner-facing as a membership rule); the digest-index data-loss fix confirmed and amended (the map built in the adoption transaction from the same streamed pass, as `cran.md`'s recheck chose, so no package request meets a revision without its map and `proxy-cache.md` AC27's late-map case never arises); the `max-age=60`, `ServeFile`, management-api and corpus folds confirmed. Adversarial findings folded without a question: the shard route resolved a digest against the head alone, so a client whose shard index was inside its `max-age` met a `404` on a content-addressed route after a publish replaced one shard, an outcome no capture recorded; the shard index's declared list now holds the previous generation's shards too (AC2, AC6); the declared kinds had no way to add a CEP-50 attestation to an existing file, and an identical-bytes publish carrying one would have completed unchanged with no snapshot, so `attach` is declared and such a publish is a changed one (AC5, AC22); the overlay could patch identity, integrity and `run_exports` fields; the proxied TTL was described as the upstream's `max-age`, which `proxy-cache.md`'s was-Q2 does not provide (AC12); the handler's configuration-time repodata probe contradicted `upstream-adapters.md` AC23's acceptance of an unreachable upstream and the probe placement every other format moved, removed (AC20); `HEAD` probes and the absence of content encoding stated on both paths (AC2, AC12); notices validated to CEP-6's shape (AC23); the spool limit named (AC3). Constitution: both paths, the shared model with no handler-owned table, the named enforcers, the conformance gate and the no-render rule all hold; no mark root added, `auth.md` AC10 untouched, no token widened. Sibling consequences reported to the orchestrator, not applied: `signing-service.md` (`Generate`'s input must expose the write's commit time for a snapshot-scoped key; conda's `{subdir}` template, no derivation, one predecessor generation; `proxy-cache.md` (no `HEAD` forwarding is defined, conda assumes a cold `HEAD` fills the cache); `management-api.md` (the conda reconciliation table gains an `attach` row); `conformance-harness.md` (optional: `conformance/conda/virtual_remote_test.go` beside `signing-service.md` AC35's). `node scripts/check-spec.js`: zero failures on this file; no em-dashes on touched lines. 26 criteria, each with a Test Plan row; eleven questions resolved, zero open; `fable_recheck` cleared. draft to planned. |
