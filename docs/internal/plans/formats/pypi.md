---
status: draft
status_description: "2026-09-26 at 4d1aeb1: Q1-Q3 adopted under the owner's standing delegation and folded through the body. Hosted yank, unyank and deletion are registry-owned management endpoints homed in the to-be-authored management-api.md (AC12, AC13), deleted filenames are retired forever (AC13), and attestation-bearing uploads are refused pending the to-be-authored artifact-verification.md (AC14). No open questions; stays draft pending a gate review, with Phase 2 blocked on management-api.md."
description: "Spec for the PyPI format, scheduled as the experiment's generalisation test - does format N+1 cost less than format N?"
author: michielvha
goal: "Measure whether the harness and the format interface generalise, by building PyPI immediately after npm and comparing the cost."
priority: "medium"
issue: 9
created: 2026-09-21
covers:
  - "internal/format/pypi/**"
---

# Plan: PyPI format

The Python package index protocol, hosted and proxied: the PEP 503 and PEP 691 simple index in
both serializations, wheel and sdist serving and upload, and the proxied path against pypi.org -
built immediately after npm as the experiment's generalisation measurement.

## Context

PyPI is scheduled here for a reason beyond its own usefulness: **it is the experiment's
generalisation test**.

By the time it starts, the harness exists, the CAS exists, the proxy layer exists, and npm has
shown what a mutable-metadata format costs. If PyPI costs materially less than npm did, the
harness generalises and the project's central claim holds. If it costs the same, every format is
a fresh grind and that is the most important finding the experiment can produce - worth knowing
before betting a year on breadth.

Record the comparison in `docs/internal/tasks/experiment-log.md` deliberately, with intervention
counts and token cost, rather than reconstructing it afterwards from impressions.

PyPI is also the format where, unusually, much of the read contract genuinely is standardised:
the simple index is a living PyPA specification consolidating PEP 503 (HTML), PEP 691 (JSON),
PEP 700 (list metadata), PEP 592 (yank), PEP 658/714 (metadata files) and PEP 792 (project
status markers). The write half is not: upload is a PyPI-documented legacy convention with no
accepted PEP behind it (PEP 694 is a draft). The standing rule still applies to both halves -
the client is the specification, and every row in Design is re-grounded in captured traffic
when the recording corpus is made - but the review posture differs: for reads the published
spec is strong grounding, for upload it is prior art plus whatever twine actually sends.

One count-integrity note, the same shape as npm's: the catalogue's Simple-index family row
claims client reach across pip, uv, Poetry and pdm. This spec tests pip and twine only
(AC1, AC2); whether the family's client-reach claim demands its own conformance coverage is the
catalogue's open client-reach question, not this spec's, and the advertised reach must not
exceed the tested one in the meantime.

## Blocking preconditions

**The handler interface re-open must complete before any Tier 1 handler work**, and PyPI is
Tier 1. `format-handler-interface.md` AC8 carries the gate; npm records it from its side and
PyPI records it here for the same one-sided-contract reason. In practice npm precedes PyPI
(charter build order steps 5 and 6), so this gate is normally discharged before PyPI is
reachable at all - but it binds this spec independently, not via npm.

**The N+1 comparison needs its baseline before this format starts.** The charter's
cost-attribution question had to be answered before npm begins, and was: the procedure is the
charter's "Measuring per-format cost" (its resolved cost-attribution record, was Q3), and
npm's AC14 requires the experiment log to hold npm's per-format cost under that settled
procedure before PyPI work starts. AC6 below is the other half of the same comparison: PyPI's
cost recorded under the **same** attribution procedure, in the same units. Without the settled
procedure and the npm baseline entry, AC6 is unmeasurable and the headline finding is
unsupportable; with them, this spec is sufficient to produce the measurement - the procedure
itself is the charter's to define, never this spec's.

**The management API must be specced before Phase 2's management operations.** Hosted yank,
unyank and deletion are registry-owned management endpoints whose shape, authorization and
write accounting belong to `docs/internal/plans/foundation/management-api.md` (to be authored
in the spec loop). AC12 and AC13 are untestable until that surface exists, the same reasoning
`auth.md` applied to its expiry-warning criterion, so Phase 2 waits on that spec reaching
`planned`. Phases 1, 3 and 4 do not.

## Scope

**In scope:**

- The PEP 503 HTML simple index and the PEP 691 JSON index - root project list and per-project
  detail - with server-driven content negotiation between them.
- PEP 503 name normalisation, applied to uploads, lookups and redirects.
- Wheel and sdist serving, and upload through the legacy multipart form API that twine drives,
  including refusal of a duplicate filename.
- PEP 658/714 core metadata files for wheels, served alongside the file and advertised in both
  index serializations. Brought into scope by this review: the stub excluded them with no
  recorded reason, effort is not a reason here, and modern resolvers (pip 23+, uv) use the
  metadata file to resolve without downloading wheels - an index without it is measurably
  slower for exactly the clients the family row claims.
- Yank on both paths: mirroring PEP 592 yank marks on the proxied path per the settled
  upstream-removal policy (AC7), a hosted yank and unyank through the registry-owned management
  API (AC12), and serving `data-yanked` and the JSON `yanked` field wherever the model holds a
  yank mark.
- Hosted management operations: yank, unyank, file deletion and release deletion, each a
  registry-owned management endpoint rather than a PyPI-specific one (Design, "The management
  surface"), with every deleted filename retired permanently (AC13).
- Refusal of an upload carrying PEP 740 attestations, loudly and with nothing committed
  (AC14), until a verification producer exists.
- Bearer-of-record authentication per `foundation/auth.md`: pip and twine present HTTP Basic
  with the token as password (the token-as-password convention with the fixed placeholder
  username; the username is not an authentication input).
- The proxied path against pypi.org: classification, file-URL rewriting, negative caching, and
  the PyPI-specific removal table including PEP 792 quarantine as the explicit security signal.

**Out of scope for v1**, each with its reason, recorded because the interface spec's
definition of done requires the deliberately unimplemented surface to be named:

- **Attestation verification (PEP 740).** Verification belongs to a shared producer,
  `docs/internal/plans/foundation/artifact-verification.md` (to be authored in the spec loop),
  per the verification-ownership decision adopted in `supply-chain-policy.md`. PEP 740 requires an index to
  verify attestations before accepting them, so an index that cannot yet verify cannot honestly
  accept them either. Since twine can send them and silence is not an available option, v1
  refuses an attestation-bearing upload by name (Design, "The upload path"; AC14), and the
  requirements this format places on the producer are recorded in the resolved
  attestation-bearing-uploads decision below.
- **Trusted Publishing** (OIDC-based upload token exchange). Credential issuance belongs to
  `foundation/auth.md`, which outsources identity flows to the identity provider and does not
  yet define a token-management product surface; building a PyPI-specific issuance flow here
  would prejudge both.
- **The pypi.org JSON API (`/pypi/{name}/json`) and XML-RPC API.** Neither is part of any
  packaging standard, no client in the install/publish conformance loop consumes them, and
  advertising a pypi.org-proprietary surface would put a claim in the matrix that no oracle
  backs. XML-RPC search is additionally dead upstream.
- **PEP 708 tracks and alternate-locations metadata, and PEP 792 status markers on the hosted
  path.** Both are index-operator declarations with no client-driven write contract and no
  installer behaviour to conformance-test yet at our end; on the proxied path they pass
  through as ordinary metadata fidelity (and quarantine is consumed as a removal signal,
  in scope above). If a hosted operator surface for them is ever wanted, it is a management
  operation under the registry-owned management API (Design, "The management surface"), added
  by revising this spec when an installer behaviour exists to test it against.

## Design

### The wire surface

Grounding: the consolidated PyPA simple repository API specification (verified 2026-09-25
against packaging.python.org) for reads; the PyPI upload API documentation and prior-art
implementations for the unstandardised write half. Per the standing rule, every row is
re-grounded in captured traffic when the recording corpus is made, and the corpus wins any
disagreement.

| Surface | Shape |
|---|---|
| Root project list | `GET .../simple/` - all project names, normalised; HTML anchors or JSON `projects` array |
| Project detail | `GET .../simple/{normalized-name}/` - one anchor or file object per file; trailing slash required, non-slash redirects |
| Wheel / sdist | `GET` on the file URL the index carries; the URL shape is ours to choose because the index, not a convention, tells the client where files live |
| Core metadata file | `GET` on the file URL with `.metadata` appended, for wheels that advertise it |
| Upload | `POST` multipart form to the repository's upload endpoint: `:action=file_upload`, `protocol_version=1`, the file in `content`, `filetype` (`bdist_wheel`/`sdist`), `pyversion`, `name`, `version`, `metadata_version`, at least one digest field (`sha256_digest` hex among them), plus core-metadata fields flattened into the form |
| Liveness | Nothing standard; pip and twine probe nothing beyond the surfaces above |

Two routing facts worth stating against the interface spec's URL-shape decision: pip takes an
arbitrary base URL (`--index-url`, `PIP_INDEX_URL`) and twine takes an arbitrary upload URL
(`--repository-url` and its environment form), so PyPI needs no root-anchored mount and fits
format-first URLs (`/pypi/{repository}/simple/...`) with no carve-out. And because the index
carries absolute or relative file URLs that clients follow blindly, the file and upload URL
shapes are registry-owned rather than ecosystem-imposed.

### Name normalisation, and the two normal forms

PEP 503 normalisation is the trap this format is famous for: a project name is lowercased with
every run of `-`, `_` and `.` collapsed to a single `-`, so `Foo.Bar_baz`, `foo-bar-baz` and
`FOO__BAR.BAZ` are the same project. Clients MUST request the normalised URL and MUST NOT rely
on redirects; servers MAY redirect unnormalised requests. A registry that stores projects under
the spelling the uploader happened to use serves 404s to every correctly behaving client.

The rules, stated as rules:

- The normalised name is the only project key. Upload, lookup, the model's `Package` row and
  the index URL all use it; the as-uploaded spelling is display metadata in the package's
  metadata document, nothing more.
- Unnormalised detail URLs redirect to the normalised URL (the MAY we take), because tools
  other than pip do request them.
- **Filenames use a second normal form.** Inside wheel and sdist filenames the same
  normalisation applies but with `_` as the join character, because `-` is the field separator
  of the wheel name grammar (`{distribution}-{version}(-{build})?-{python}-{abi}-{platform}.whl`)
  and of the PEP 625 sdist form (`{name}-{version}.tar.gz`). So the project `foo-bar-baz`
  uploads `foo_bar_baz-1.0-py3-none-any.whl`, and validation must compare the two forms through
  normalisation, never textually. Legacy non-normalised filenames from old tools are accepted
  on ingest and served verbatim; the project key is still the normalised form.

Upload validation ties the forms together: the filename's distribution and version fields must
match the form's `name` and `version` after normalisation (and PEP 440 version normalisation),
or the upload is refused. A registry that skips this stores files the index attributes to the
wrong coordinates.

### Index rendering and content negotiation

Both serializations are rendered from the same stored state, never stored as documents of
record on the hosted path. The negotiation contract, from the consolidated spec: the exact
media types are `application/vnd.pypi.simple.v1+json`, `application/vnd.pypi.simple.v1+html`,
with `text/html` a legacy alias for the latter; selection is server-driven from the `Accept`
header; a request without a recognised `Accept` gets the HTML default, matching upstream
behaviour for legacy tools and browsers. Modern pip (22.2 and later) sends
`application/vnd.pypi.simple.v1+json` at highest weight with the HTML forms as fallbacks and
detects what it got from the response content type; pip before 22.2 speaks only HTML. Pinning
one client from each side of that line makes the real client exercise both serializations,
which is why AC1's two pinned pip versions straddle 22.2.

What the hosted index emits, and the version claim that bounds it: `api-version` (JSON `meta`
key) and `pypi:repository-version` (HTML meta tag) declare **1.1**, the highest version whose
mandatory fields this registry fully serves - PEP 700's `versions` list, per-file `size` and
`upload-time` all come from the model. The declaration rises only when the fields of a later
version are actually served, never speculatively; an index that declares 1.4 without status
markers is lying to resolvers that key on the version. Per-file attributes served in both
forms: the sha256 hash (`#sha256=...` fragment in HTML, `hashes` dict in JSON - the CAS
digest, computed server-side, so the index never advertises a hash the store did not verify),
`requires-python` where the metadata declares it, yank marks, and the core-metadata
advertisement below.

**The PEP 714 rename is served on both sides.** The metadata-file advertisement was renamed
from `data-dist-info-metadata` to `data-core-metadata` (HTML) and from `dist-info-metadata` to
`core-metadata` (JSON) because a client bug choked on the old names; installers prefer the new
key and fall back to the old. This registry emits **both** generations with identical values,
as pypi.org does, so every client generation resolves the same file.

Hosted metadata files themselves: on wheel upload the handler extracts `.dist-info/METADATA`
from the archive, stores it as a CAS blob, and serves it at the file URL plus `.metadata`; the
advertisement carries its sha256. Sdists get no metadata file (the wheel-only limit matches
upstream practice). This extraction is also what backs upload validation of the inner metadata
against the form fields.

### The upload path

twine POSTs one file per request as multipart form data, authenticated exactly as pip is, and
non-interactively: the harness provisions a token through its existing `setup` vocabulary and
injects it as `TWINE_USERNAME`/`TWINE_PASSWORD` (username `__token__`) with the repository URL
in the twine repository-URL environment variable, and for pip embeds the same credential in
the index URL or netrc.
Nothing new is asked of the harness vocabulary; this is the same claim npm's spec makes for
`.npmrc` tokens.

Upload semantics this registry enforces:

- The declared digest is verified against the received bytes before anything commits; at least
  one digest field must be present and `sha256_digest` is the one the CAS verifies against
  natively.
- Filename fields, form fields and the archive's inner metadata must agree (the normalisation
  rule above); disagreement refuses the upload.
- **A filename that already exists is refused**, as the public index refuses it. Wheels and
  sdists are the immutable artifacts of this ecosystem - this registry's own proxy layer
  caches them forever on exactly that assumption - so accepting a re-upload would silently
  change bytes under a coordinate downstream caches and lockfile hashes already pin.
- **A deleted filename is retired forever**, as the public index retires it: deletion through
  the management surface removes the file from the head snapshot but never frees its name, so
  the duplicate check above consults the project's retirement set as well as its live files.
  The same bytes are refused too, because the rule is about the coordinate, not the content.
- Success is a 2xx the client reports as success; refusals carry a body naming the reason,
  because twine surfaces the response body to the user.
- **An upload carrying a PEP 740 `attestations` form field is refused** with a body naming
  attestations as unsupported by this registry, before anything commits. PEP 740's
  verify-before-accept obligation cannot be met without a verification producer, and
  accepting the file while dropping or warehousing the attestations would each be a false
  claim. The same upload without the field succeeds, so the cost to the uploader is a flag.
  This diverges from pypi.org, which verifies and accepts, and goes on the recorded exception
  list.

### What counts as a write

`data-model.md` requires each format spec to declare its ecosystem's write boundaries, and
makes metadata-only mutations snapshot-creating writes. PyPI's declaration:

- **Each file upload is one completed logical write.** A release published as a wheel plus an
  sdist is two uploads and two writes, and that is faithful rather than lax: the ecosystem
  itself publishes per file, upstream treats each upload independently, and there is no
  release-completion signal on the wire to group them by. A snapshot between the wheel and the
  sdist is a state PyPI itself exposes.
- A hosted yank or unyank is one metadata-only write, whether it marks one file or a whole
  release.
- A file or release deletion is one write per management action, however many files it covers,
  and records every removed filename in the project's retirement set within that same write.
- A proxied repository creates no snapshots at all, per the model's settled rule; index
  arrival and revalidation are cache materialisation.

Mapping onto the shared model uses the levels `data-model.md` provides, with one mapping worth
naming because it is the generalisation test doing its job: PyPI's index is **file**-oriented -
yank marks, `requires-python`, upload time and the core-metadata advertisement all attach to
individual files - and the shared model deliberately has no per-file metadata document. Those
attributes live in the **version-level** metadata document as a filename-keyed map, which the
index renderer joins against the version's `File` rows. No new model level is needed; if
implementation finds otherwise, that is a data-model spec change, never a handler-side table.
The package-level document holds the display-form name, the project's **retirement set** (every
filename ever deleted from it) and future project-wide state; the root index and every detail
page are rendered from snapshot state through the pointer the handler is given, never stored.
The retirement set is carried forward by every later write because writes build on the newest
snapshot, and it survives deletion of the project's last file: a project with no live files and
a non-empty retirement set is served as absent but still refuses its retired filenames.

### The management surface

A management operation has a **trigger** (the call that changes state) and an **effect** (what a
resolving client then sees), and the oracle's reach over the two differs
(`docs/internal/analysis/management-surfaces-and-the-oracle.md`). For PyPI no client triggers
anything: twine has no yank or delete command and pypi.org does both through its own web UI.
Every effect, though, is standardised and client-observable.

This spec follows the precedent shared by the Cluster 5 format specs (`npm.md`,
`ansible-collections.md` and this one), whose common home is
`docs/internal/plans/foundation/management-api.md` (to be authored in the spec loop):

- **The surface is registry-owned, not PyPI-shaped.** Each operation is an endpoint of the one
  management API that spec defines, never a PyPI-specific route invented here. This spec defines
  what each operation means and what pip sees afterwards; the shared spec defines URL shape,
  request form, authorization and audit.
- **Each operation is a completed logical write through the shared write path**: exactly one
  snapshot per operation, none for a refused one, and no blob-store object deleted directly.
  Space returns only through retention pruning, so the single-deleter boundary in
  `storage-and-gc.md` holds unchanged.
- **Authorization uses the settled `(repository, action)` vocabulary with no new action.** Yank,
  unyank, file deletion and release deletion are removal-class operations and require `delete`
  on the repository.
- **Hosted only.** A proxied repository creates no snapshots and takes its removals from the
  upstream per the settled removal table, so a management operation against one is refused.
- **Verification is split the way the oracle's reach is split.** The trigger is verified by this
  registry's own integration tests against the management endpoint, and nothing else vouches
  for it, which is stated rather than implied. The effect is verified by a real `pip install` in
  conformance cases of two kinds, per the harness's resolved decision on how `setup` is applied:
  a case that seeds the yanked or deleted state through `setup`'s `state` key (the seed path
  never calls a management endpoint), and a case whose `script` calls the management endpoint
  as any HTTP client would and then runs pip, which exercises trigger and effect together
  without claiming a third party vouched for the trigger.

The PyPI operations:

| Operation | Effect a client sees | Write |
|---|---|---|
| Yank a file or a whole release, with an optional reason | `data-yanked` (carrying the reason, or empty) and the JSON `yanked` field on each affected file; pip skips them unless the requirement pins that exact version with `==` or `===` | One metadata-only write |
| Unyank | The marks disappear and normal resolution returns | One metadata-only write |
| Delete a file | The file leaves both serializations and is no longer served; its filename joins the retirement set | One write |
| Delete a release | Every file of the version leaves the index; every filename joins the retirement set | One write, however many files |

Hosted PEP 592 is therefore claimed in full on both paths: the proxied path mirrors the mark
(AC7) and the hosted path creates it (AC12).

### The proxied path

The handler owns the request and classifies for the proxy layer's fetch-and-cache API per the
settled decisions in `proxy-cache.md`:

- The **project detail index is mutable metadata with a TTL**, revalidated conditionally where
  the upstream supports it (whether pypi.org's CDN honours `ETag`/`If-Modified-Since` on
  simple pages is grounded from the corpus, not assumed). The upstream JSON serialization is
  preferred when the upstream offers it and is the cached representation; an HTML-only
  upstream (private PEP 503 servers exist) is parsed into the same representation - the two
  formats are defined to carry the same data model. Serving JSON to a client re-serialises
  the cached document with unknown keys preserved and the upstream's declared `api-version`
  intact; serving HTML renders the attribute set this registry knows, declaring the version
  it renders.
- The **root project list is mutable metadata with a TTL** like any other; it is merely large
  (pypi.org's runs to hundreds of thousands of names), which the model's CAS-blob threshold
  for oversized documents and single-flight coalescing already price. Serving a partial or
  cache-derived root list would silently diverge from the upstream contract.
- **Wheels, sdists and `.metadata` files are immutable artifacts**: cached indefinitely,
  fetched stream-and-verify against the index's declared sha256, never committed on a
  mismatch or truncation.
- **Missing project names are negatively cached** with the short TTL; a typo'd requirement in
  a busy CI fleet is the motivating case in that spec.
- **Every file URL in a served index points at this registry**, hosted and proxied alike. On
  pypi.org the index anchors point at a different host entirely (files.pythonhosted.org), so
  an unrewritten proxied index sends clients straight past the cache and AC4's
  no-upstream-contact assertion would catch it. This is the same format-specific transform
  `format-handler-interface.md` canonicalises with npm's packument URLs, and it likewise
  requires the handler to know the externally visible base URL rather than the bind address.

Upstream removal maps onto the settled purge-or-flag table as PyPI's side of that contract:

| Upstream event, as observed at revalidation | Classification |
|---|---|
| The project's status marker becomes `quarantined` (PEP 792; the index serves no distribution links) | The **explicit security signal**: purge the cached content and alert the operator |
| Files or the whole project vanishing with no status marker (author or admin deletion) | Keep serving, record an operator-visible divergence |
| A file gaining a yank mark | **Neither purge nor divergence-free**: mirror the mark at the next revalidation per the PEP 592 mirror rule (a mirror that keeps a yanked file MUST carry its yank metadata), keep the cached file, and record the divergence, per the settled PyPI-yank row in `proxy-cache.md` (its AC13). New resolutions then exclude the release because pip skips yanked files except under an exact `==`/`===` pin - the exclusion is the client's half of the composed contract, and ours is serving the mark faithfully |
| A status marker becoming `archived` or `deprecated`, or any other metadata change | An ordinary metadata change, propagated at the next revalidation; never a removal event |

This composes with AC7 exactly as that criterion claims, and more cleanly than npm's side of
the table: npm's security signal is a heuristic over an unversioned holding-package
convention, while PyPI's is a standardised, machine-readable marker - though it appears only
in api-version 1.4 responses, so the corpus and the drift job still re-ground the detection
rather than this table being trusted forever. Detection happens at revalidation only: per
`proxy-cache.md`'s resolved answer (was Q12) the proxy layer never polls an upstream, and the
active channel is `supply-chain-policy.md`'s advisory feed.

One assertion trap, inherited from npm's review: pip keeps a client-side HTTP cache and a
wheel cache, so a second install that never contacts this registry proves nothing about it.
AC4's case asserts both directions - the second install reached this registry (transcript)
and this registry did not contact the upstream (network layer) - with fresh client cache
state as part of the case setup.

### Conformance, auth and the corpus

The recorded surface for AC5's corpus, named now because a thin recording script yields a thin
specification (the harness spec's own warning): cold install through the JSON client and
through a pre-22.2 HTML client, warm install with client caches defeated, an install under
hash-checking mode (`--require-hashes`, the ecosystem's lockfile-strictness analogue), an
sdist-only package install, `pip download`, a metadata-file resolution by a modern resolver,
an unnormalised-name request, a yanked release skipped and then installed under an exact pin,
twine uploading a wheel and an sdist, a duplicate-filename refusal, and a missing-package
failure. This list is the review baseline for the recording script. Recording gates on the
harness's redaction criterion (`conformance-harness.md` AC13), and every deliberate divergence
from public-index behaviour goes on the recorded exception list **before** its flow is expected
to replay. One divergence is known now: the refusal of an attestation-bearing upload, where
pypi.org verifies and accepts. Filename retirement matches the public index, so a
deleted-filename refusal replays. The hosted yank and deletion triggers have no public-index
flow to record at all, since pypi.org drives them from its web UI; their effects replay through
the recorded yanked-release flow.

## Acceptance Criteria

- [ ] AC1: `pip install` resolves and installs a wheel from a hosted repository, for at least
      two pinned pip versions, one older than 22.2 and one newer, so the HTML and JSON index
      paths are each exercised by a real client.
- [ ] AC2: Uploading a wheel and an sdist through the real `twine` client makes both
      installable, with the client on each of two platform/interpreter combinations selecting
      the correct file by wheel tag, and an sdist-only project installing via the sdist.
- [ ] AC3: The PEP 503 simple index and the PEP 691 JSON index both serve and agree, for the
      root project list and for project detail: both are assembled from the same stored state,
      proven by an upload appearing in both, with content negotiation returning each
      serialization under its exact media type, the declared `api-version` matching the
      fields actually served, and per-file attributes - hashes, `requires-python`, yank
      marks - identical in meaning across the two serializations.
- [ ] AC4: The proxied path installs from the public index and serves from cache on a second
      install without contacting the upstream - with the second install reaching this registry
      and the upstream receiving no request, both asserted from the transcript and at the
      network layer against fresh client cache state, which also proves the served index
      carried no upstream file URLs.
- [ ] AC5: Replay-match passes against a corpus recorded from the public index covering the
      recorded surface named in Design.
- [ ] AC6: Before this format's work begins the npm baseline exists (npm's AC14), and on
      completion the experiment log records PyPI's intervention count and token cost under the
      same settled attribution procedure and in the same units, together with an explicit
      finding on whether npm-to-PyPI cost less than generic-to-npm.
- [ ] AC7: When the upstream index marks a release yanked, the proxied index mirrors the
      `data-yanked` and JSON yank marks at the next revalidation, a fresh unpinned resolution
      excludes the release while an exact `==` pin still installs it from cache, and the
      repository records an operator-visible divergence as required by `proxy-cache.md` AC13.
- [ ] AC8: A project uploaded as `Foo.Bar_baz` installs as `foo-bar-baz` and under any other
      separator spelling through the real client, an unnormalised detail URL redirects to the
      normalised one, and a second upload under a differently spelled but equal-normalising
      name lands in the same project rather than creating a second one.
- [ ] AC9: An upload whose filename already exists is refused, matching the public index's
      refusal, with the reason in the response body and no new snapshot behind the refusal;
      an upload whose filename, form fields and inner metadata disagree after normalisation,
      or whose declared `sha256_digest` does not match the received bytes, is refused the
      same way with nothing committed.
- [ ] AC10: An uploaded wheel's core metadata is served as a `.metadata` file whose bytes
      match the archive's `.dist-info/METADATA`, advertised in both index serializations
      under both the `data-core-metadata`/`core-metadata` keys and the legacy key names with
      the correct sha256, and a modern resolver completes resolution fetching only `.metadata`
      files, not wheels, asserted at the transcript; on the proxied path the upstream's
      metadata files are cached and re-advertised the same way.
- [ ] AC11: An upstream project whose status marker becomes `quarantined` has its cached
      content purged and raises the operator alert; files vanishing without a marker keep
      serving with a recorded divergence; and an `archived` or `deprecated` marker propagates
      as an ordinary metadata change - PyPI's side of the settled removal table in
      `proxy-cache.md` (its AC13).
- [ ] AC12: A hosted file or release yanked through the registry-owned management API, with a
      reason, is served with `data-yanked` carrying that reason and the JSON `yanked` field set
      in both serializations; a fresh unpinned `pip install` skips it while an exact `==` pin
      installs it, and after an unyank an unpinned install selects it again. Each yank and
      unyank creates exactly one snapshot, a principal without `delete` on the repository is
      refused and creates none, and the same operation against a proxied repository is
      refused.
- [ ] AC13: A file deleted through the management API leaves both serializations and no longer
      installs, a release deletion removes every file of the version in exactly one snapshot,
      and a later upload of any deleted filename is refused as AC9 refuses a duplicate, with
      the same bytes or different ones, including after the deletion's snapshot has been
      pruned out of retention and after the project's last live file is gone.
- [ ] AC14: An upload carrying a PEP 740 `attestations` form field, sent by the real
      `twine upload --attestations`, is refused with a response body naming attestations as
      unsupported, nothing is committed and no snapshot is created, and the same distribution
      uploaded without the flag succeeds.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/pypi/hosted_test.go` (pinned pip < 22.2 and pip >= 22.2) |
| AC2 | conformance | `conformance/pypi/wheel_test.go` (two client platform/interpreter combinations; sdist-only case) |
| AC3 | conformance + integration | `conformance/pypi/index_test.go`; `internal/format/pypi/negotiation_test.go` (media types, api-version claim) |
| AC4 | conformance | `conformance/pypi/proxied_test.go` (transcript + network-level assertion, fresh client cache in setup) |
| AC5 | conformance | `conformance/pypi/replay_test.go` |
| AC6 | manual | `docs/internal/tasks/experiment-log.md`: npm baseline row verified present before work starts; PyPI row and the generalisation finding reviewed at completion |
| AC7 | conformance | `conformance/pypi/yank_test.go` (proxied; mutating test upstream, unpinned then `==`-pinned install) |
| AC8 | conformance | `conformance/pypi/normalisation_test.go` |
| AC9 | conformance | `conformance/pypi/upload_test.go` (duplicate filename; mismatched-metadata refusal; snapshot-table assertion via the registry state, not the client) |
| AC10 | conformance + integration | `conformance/pypi/metadata_file_test.go` (resolver transcript); `internal/format/pypi/metadata_extract_test.go` |
| AC11 | integration | `internal/format/pypi/removal_test.go` (test upstream presenting each event class; the shared-layer half is `proxy-cache.md` AC13's) |
| AC12 | integration + conformance | trigger: `internal/format/pypi/manage_yank_test.go` (snapshot count per operation, `delete` authorization refusal, proxied-repository refusal); effect: `conformance/pypi/hosted_yank_test.go` (the `script` yanks through the management endpoint, then runs real pip unpinned, `==`-pinned, and again after an unyank; a second case seeds the yanked state through `setup`'s `state` key) |
| AC13 | integration + conformance | trigger: `internal/format/pypi/manage_delete_test.go` (release delete as one snapshot; retired-filename refusal with same and different bytes, after pruning under an injected clock, and after the last live file is gone); effect: `conformance/pypi/hosted_delete_test.go` (the `script` deletes through the management endpoint, real pip then fails to resolve the deleted file, and a real twine re-upload is refused) |
| AC14 | conformance + integration | `conformance/pypi/upload_test.go` (attestation case: real twine with a committed fixture distribution and an attestation generated for it once, then the same file without the flag); `internal/format/pypi/upload_attestation_test.go` (form-level refusal, nothing committed, snapshot count unchanged) |

## Implementation Phases

### Phase 1: Hosted core
- Name normalisation and redirects, index rendering in both serializations with content
  negotiation, file serving, upload with digest and coherence validation, duplicate-filename
  refusal, attestation-bearing upload refusal, metadata-file extraction and serving

### Phase 2: Mutation and metadata surface
- Waits on `docs/internal/plans/foundation/management-api.md` reaching `planned` (Blocking
  preconditions)
- The write-boundary declaration exercised end to end; yank representation; per-file
  attributes through the version-level document; the hosted management operations (yank,
  unyank, file and release deletion) through the registry-owned management API; the
  retirement set in the package-level document and its consultation on every upload

### Phase 3: Proxied path
- Classification and file-URL rewriting, conditional revalidation, negative caching, the
  removal table with quarantine detection, yank mirroring, HTML-only-upstream parsing

### Phase 4: Corpus and gate
- Recording session across the named surface (after the harness redaction gate), replay-match,
  the second pinned client, experiment-log entries and the generalisation finding

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. The 2026-09-25 first review raised Q1 through Q3; all three were adopted on
2026-09-26 under the owner's standing delegation and folded through Scope, Design, the
criteria (AC12 to AC14) and the Test Plan. The records below keep each question's framing,
options and reasoning, so an owner reversing an adoption has the whole trade in front of them.

### Resolved: hosted yank surface (was Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: v1 exposes hosted yank
and unyank, and with them file and release deletion, as registry-owned management endpoints.
They are specified once, across formats, by
`docs/internal/plans/foundation/management-api.md` (to be authored in the spec loop); this spec
defines what each operation means and what pip sees afterwards (Design, "The management
surface"; AC12, AC13).

Accepted cost: the endpoint is verified by this registry's own integration tests alone, because
no client triggers a yank, and the first management surface sets a shape for every later one.
Both are priced honestly rather than avoided: the effect, which is what users experience, is
verified by a real pip in a full-strength conformance case, and the shape is set once in a
shared spec instead of being improvised here, which is what makes the precedent deliberate.
Phase 2 waits on that spec (Blocking preconditions).

Why the alternatives lost: B leaves hosted repositories able only to hard-delete, the
destructive operation yank exists to avoid, and forces the matrix to record hosted PEP 592 as
partial. C is an unauditable, unvalidated mutation path into snapshot-creating state. The
cross-format framing is Cluster 5 in `foundation/question-triage.md`, and the correction that
the oracle does reach every effect is
`docs/internal/analysis/management-surfaces-and-the-oracle.md`.

The original question:

PEP 592 fully specifies how yank is *served* and what installers do with it, and both are
testable through pip - a yanked release is skipped unless exactly pinned. But the *act* of
yanking has no client wire contract: pypi.org does it through its own web UI, and twine has no
yank command. Serving yank on the hosted path therefore needs a registry-management endpoint
this project would own - the first non-ecosystem write surface on any format handler, a
precedent worth setting deliberately. The answer must bring an acceptance criterion with it
(a hosted yank AC is untestable until the surface it drives exists - the same reasoning
`auth.md` applied to its expiry-warning criterion).

**Recommendation:** A - a minimal registry-owned yank/unyank endpoint in v1. The served
semantics are standardised and fully conformance-testable through pip, the model already
treats yank as a metadata-only write, and a hosted index that cannot yank cannot honestly
claim PEP 592.

| Option | You get | It costs |
|---|---|---|
| **A. A minimal registry-owned yank/unyank endpoint now** | Hosted PEP 592 is real and pip-testable; operators get the ecosystem's own soft-delete instead of reaching for hard deletion | The first management (non-ecosystem) write endpoint on a format handler, setting the surface precedent before any management-API design exists |
| **B. Proxied-only yank in v1; hosted yank waits for the management-surface era** | No surface precedent set ahead of a deliberate management-API design | Hosted repositories can only hard-delete, which is the destructive operation yank exists to avoid, and the matrix must record hosted PEP 592 as partial |
| **C. Yank via direct configuration (operator edits state out of band)** | No new endpoint at all | An unauditable, unvalidated mutation path into snapshot-creating state, which contradicts the model's write discipline |

**Why this is yours:** it sets the precedent for what a format handler's management surface
is, ahead of any UI or management-API spec - a product-surface sequencing call, the same class
as the token-management surface question `formats/oci.md` owns.

### Resolved: attestation-bearing uploads (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: an upload carrying PEP
740 `attestations` is refused with a body naming attestations as unsupported, nothing is
committed, and the refusal goes on the recorded exception list (Design, "The upload path";
AC14).

Accepted cost: `twine upload --attestations` fails against this registry until verification
lands, and a CI pipeline configured for pypi.org needs a flag change to publish here. Why the
alternatives lost: B tells exactly the users who opted into provenance that it was published
when it was discarded, and C violates PEP 740's verify-before-accept and warehouses material
that invites a later false provenance claim.

The producer this refusal waits on is
`docs/internal/plans/foundation/artifact-verification.md` (to be authored in the spec loop),
the sibling verification spec `supply-chain-policy.md` adopted as the owner of verification. What PyPI requires of it,
recorded here so the dependency cannot be lost:

- Verification of PEP 740 attestations inside the upload request, before anything commits,
  since twine expects a synchronous verdict on the upload response.
- A trust model saying which publisher identities an attestation may carry for a given
  repository and project; issuing Trusted Publishing credentials stays with `auth.md`.
- A home for the verified attestation and its verdict from which the hosted index can serve
  PEP 740 provenance in both serializations, with this spec's declared `api-version` rising
  only when that field is actually served.
- A position on the proxied path, where the upstream's provenance entries currently pass
  through as preserved unknown keys pointing at the upstream: pass through, verify, or
  re-host.
- A criterion shape for lifting the refusal: this spec is then revised so a valid attestation
  is accepted and served and a tampered one is refused, with AC14 rewritten accordingly.

The original question:

`twine upload --attestations` sends an `attestations` form field. PEP 740 requires an index to
verify attestations before accepting them, and verification ownership was undecided when this
was raised, so this registry cannot yet verify. The remaining dispositions all diverge from
pypi.org, whose recorded upload corpus may contain a real attestation exchange, so whatever we
answer goes on the recorded exception list.

**Recommendation:** A - refuse the upload with an error naming attestations as unsupported.
It is the only option that neither drops a security artifact silently nor stores what was
never verified; the uploader retries without the flag and loses nothing but the claim we
could not honour anyway.

| Option | You get | It costs |
|---|---|---|
| **A. Refuse, naming the reason** | No silent loss, no unverified security claim stored; honest and loud | `twine upload --attestations` fails against this registry until verification lands, and CI configured for pypi.org needs a flag change |
| **B. Accept the file, silently drop the attestations** | Uploads just work | The uploader believes provenance was published when it was discarded - a silent security-posture lie to exactly the users who opted into attestations |
| **C. Store attestations unverified, serve no provenance** | Nothing lost; verification can backfill later | Violates PEP 740's verify-before-accept, and stored-but-unverified material invites a later "why not just serve it" shortcut that becomes a false provenance claim |

**Why this is yours:** it prices breaking attestation-enabled publish pipelines against
silently discarding or warehousing security material, a security-posture claim the product
will be held to, not something the fleet can measure its way to.

### Resolved: filename retirement (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a filename, once
uploaded, is retired forever; deletion never frees it. The retirement set lives in the
package-level metadata document and is consulted on every upload (Design, "The upload path"
and "What counts as a write"; AC13).

Accepted cost: a botched upload cannot be fixed in place, so the operator bumps the version or
the build number, and will occasionally resent it. Why B lost: it breaks every downstream cache
and `--require-hashes` lockfile that saw the old bytes, including this registry's own
proxied-of-hosted deployments, which would serve the stale bytes forever.

This is consistent with, not opposed to, the operator-control answer `npm.md` adopted for its
unpublish restrictions: that answer removes public-commons policy (time windows, dependent
counts), while this one keeps a correctness property. `npm.md` and `ansible-collections.md`
adopted the same retirement rule for their own coordinates in the same pass, so it is a
cross-format property the management API spec inherits rather than a PyPI quirk.

The original question:

The public index permanently retires filenames: once uploaded, a filename can never carry
different bytes, even after deletion. This is not only public-commons policy - downstream
caches (including this project's own proxy layer, which caches wheels and sdists forever on
an immutability assumption) and hash-pinned lockfiles both bind bytes to the filename. But on
a private registry the operator owns the consequences, and npm's parallel question (its
hosted unpublish policy) leans toward operator control over public-registry emulation.

**Recommendation:** A - retire filenames permanently, diverging from the npm recommendation's
direction deliberately: unlike npm unpublish windows, filename immutability is what this
registry's own caching layer and every hash-checking client rely on for correctness, so
re-use is not an operator-freedom question with a policy cost but a correctness question
with an operator-freedom cost.

| Option | You get | It costs |
|---|---|---|
| **A. A filename, once uploaded, is retired forever** | Filename-to-bytes immutability holds for every downstream cache and lockfile; matches upstream, so the recorded corpus replays | A botched upload cannot be fixed in place: the operator must bump the version or build number, and will occasionally resent it |
| **B. Deletion frees the filename for re-upload** | Operators can correct a bad upload under the same coordinates | Any downstream cache or `--require-hashes` lockfile that saw the old bytes now fails or, worse, keeps serving them; this registry's own proxied-of-hosted deployments would serve stale bytes forever |

**Why this is yours:** it decides what the product promises operators about correcting their
own uploads, against an immutability property other parts of this system quietly depend on -
a product promise with a correctness edge, and the npm unpublish answer may pull the other way.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-23 | 9c971d4 | cross-spec consistency (proxy removal policy) | Folded the shared PyPI yank decision into Scope and added AC7 with integration and proxied conformance coverage; status remains draft pending a full gate review. |
| 2026-09-25 | 506c9e3 | first review: protocol grounding at published-contract level (the consolidated PyPA simple-repository spec, the wheel and PEP 625 filename grammars, PEP 592's installer and mirror rules, PEP 714's key rename, PEP 740's verify-before-accept obligation, PEP 792's status markers, and PyPI's upload docs - the one surface with no PEP behind it, grounded in prior art and flagged for re-grounding in captured traffic per the standing rule) + adversarial + cross-spec (interface AC8 re-open gate and the URL-shape opinionated-client check, charter Q3's before-npm obligation and npm AC14 as the baseline gate, data-model's write-boundary, snapshot and metadata-level rules, proxy-cache's settled classification, stream-and-verify, negative-caching and removal decisions and its AC13, harness `setup` vocabulary, corpus rules and redaction gate (AC13), auth's pip/twine Basic row, supply-chain-policy Q6, the catalogue's Simple-index family row) + constitution; code-claim verification vacuous pre-implementation (no `internal/format/pypi/`, no `conformance/pypi/`). Independence caveat, stated because it matters: this pass authored the Design it then reviewed, so its adversarial value on that Design is limited and a later independent pass should re-check it - the same caveat npm.md's first review carries | The spec was a stub wearing a spec's frontmatter: seven criteria, no Design, no Phases, no Tasks, and a frontmatter that had claimed all questions were owner-answered while the body said the opposite. Body built from grounded protocol facts: the wire surface including the honest statement that upload is unstandardised convention; the two normal forms (hyphen-joined for URLs, underscore-joined inside filenames) and the normalisation trap that serves 404s to correct clients; both index serializations rendered from one stored state with the exact media types, pip 22.2 as the JSON/HTML client watershed exploited so both paths get a real-client oracle, an honest api-version 1.1 claim, and the PEP 714 dual-key emission; the upload path with digest, coherence and duplicate-filename refusals; the write-boundary declaration data-model.md requires (per-file uploads are per-file writes, faithful to the ecosystem); the per-file-attribute mapping into the version-level metadata document, named as the generalisation test doing its job; the proxied classification with file-URL rewriting away from the upstream file host as the canonical transform, and PyPI's removal table where quarantine (PEP 792) is a standardised security signal rather than npm's heuristic; the pip client-cache trap folded into AC4; and the non-interactive auth path (token via `setup`, no new harness vocabulary). Scope gained normalisation, content negotiation, duplicate-filename refusal and PEP 658/714 metadata files (the stub's exclusion carried no reason and effort is not one; modern resolvers depend on them); each remaining out-of-scope item gained a non-effort reason. Four criteria added (AC8 normalisation, AC9 upload refusals, AC10 metadata files both paths, AC11 the removal table) and the original seven tightened: AC1 pins the client versions astride 22.2, AC3 covers root list, media types, api-version honesty and attribute agreement, AC4 asserts both directions against fresh client caches, AC6 is gated on npm's AC14 baseline and the settled attribution procedure (assessed sufficient to produce the headline measurement once charter Q3 is answered - which this pass did not answer), AC7 names the mirror-the-mark mechanism and the exact-pin path; AC7's integration row retargeted from `internal/proxy/` (which duplicated proxy-cache AC13's own test) to `internal/format/pypi/removal_test.go`, matching the npm correction. The check-spec unasserted-duty report acted on: digest verification and requires-python each gained a policing criterion. Both blocking preconditions recorded (the interface re-open, which binds PyPI as Tier 1 independently of npm; the charter-Q3-plus-npm-baseline gate for the N+1 comparison). Q1 (hosted yank surface, the first management-write-endpoint precedent), Q2 (attestation-bearing uploads: refuse vs drop vs store unverified), Q3 (filename retirement after deletion, where this registry's own cache-immutability assumption cuts against npm Q3's operator-control lean) raised for the owner, not decided. No sibling edit needed. Stays draft. |
| 2026-09-26 | 4d1aeb1 | folding adopted recommendations under the standing delegation | Not a review: adoption and application of this spec's own recommendations, made consistent with the other Cluster 5 and Cluster 6 format specs. Q1 adopted as A, generalised to the Cluster 5 precedent: yank, unyank, file deletion and release deletion are registry-owned management endpoints specified once in `docs/internal/plans/foundation/management-api.md` (to be authored), each one completed write under `delete`, hosted only, the trigger verified by integration tests and the effect by real pip (new Design section "The management surface", AC12, a Phase 2 blocking precondition on that spec). Q2 adopted as A: attestation-bearing uploads refused by name with nothing committed (upload path, AC14, exception list), with the requirements PyPI places on `docs/internal/plans/foundation/artifact-verification.md` (to be authored) recorded in the resolved record. Q3 adopted as A: filenames retired forever through a retirement set in the package-level document that survives pruning and last-file deletion (AC13), consistent with the retirement rule npm and Galaxy adopted in the same pass. Scope, the write-boundary declaration, the corpus exception list and Phase 1 and 2 updated; Test Plan rows added for AC12 to AC14. The charter cost-attribution precondition reworded, since that question was resolved in its own spec during this pass. Stays draft. |
