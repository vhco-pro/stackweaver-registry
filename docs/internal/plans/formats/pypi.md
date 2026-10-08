---
status: planned
status_description: "Planned by the Fable gate review of 2026-10-08 at 1d0c702: full review of the Opus reconciliation and the Fable authoring, the file brought current with every queued foundation record (signing-service was-Q14, Q24, Q25; auth was-Q27; management-api was-Q13 to Q16 and Q19 to Q21; proxy-cache was-Q19, Q21, Q24 and the coordinate-bound violation row; supply-chain was-Q11 and Q12, the advisory key verified against the OSV schema; harness was-Q7 and Q8), the three adoptions of 4d1aeb1 confirmed (Q1 and Q3 amended in their folds: the yank action follows the reported object, and retirement is a declared claim rendered as the duplicate refusal), the serving door, the bounded spool, the advisory key and uv's range reads folded with AC3, AC9, AC11, AC16, AC17 and AC19 extended. Earlier: reconciled 2026-09-28 at a6d72b3 and 2026-09-26 at da0aecd; Q1-Q3 adopted 2026-09-26 under the owner's standing delegation. Zero open questions; 20 criteria, each with a Test Plan row. Phase 2 waits on management-api.md's Phase 1 core (charter step 2), a build gate, not a spec gate."
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
claims client reach across pip, uv, Poetry and pdm, and the catalogue's resolved client-reach
decision (was Q5, its AC2) makes each a claim proven against this one handler on both paths. pip
and twine are this spec's primary oracles (AC1, AC2), and AC17 carries uv, Poetry and pdm, so
the advertised reach can equal the tested one.

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

**Phase 2's management operations wait on the management API's Phase 1 core.** Hosted
yank, unyank and deletion are registry-owned management endpoints whose shape, authorization and
write accounting are `docs/internal/plans/foundation/management-api.md`'s, which is `planned`
(its Fable recheck of 2026-09-30) with PyPI's operations on its kind vocabulary (`withdraw`,
`restore`, `delete-file`, `delete-version`) and in its cross-format reconciliation table. AC12
and AC13 are untestable until that surface is built, the same reasoning `auth.md` applied to its
expiry-warning criterion, so Phase 2 waits on that spec's Phase 1 core (charter step 2). Phases
1, 3 and 4 do not. The spec-level half of this gate, that spec reaching `planned`, is
discharged.

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
- PEP 740 attestations on both paths, as this format's half of `artifact-verification.md`'s
  PyPI entry: an upload's attestations verified synchronously before commit against the
  repository's identity policy, the verified attestation stored and served as PEP 740
  provenance in both serializations (AC14); a proxied file's upstream provenance fetched,
  verified and re-hosted from this registry, never passed through (AC18); and, with no identity
  policy configured, every attestation-bearing upload refused loudly with nothing committed, as
  the original refusal decision stated.
- Trusted publishing as a binding: the format-shaped token-mint route PyPI's publishing clients
  call, served as a binding onto `credential-management.md`'s OIDC exchange
  (`POST /api/v1/tokens/exchange`), written with Phase 2 and after that spec's Phase 3 (AC19).
- Bearer-of-record authentication per `foundation/auth.md`: pip and twine present HTTP Basic
  with the token as password (the token-as-password convention with the fixed placeholder
  username; the username is not an authentication input), and the per-route addressed objects
  its pattern scopes evaluate (AC15).
- The wire rendering of a shared policy refusal (AC16), and the catalogue's named Simple-index
  clients beside pip, namely uv, Poetry and pdm (AC17).
- Every read through `signing-service.md`'s serving door: the index documents through
  `ServeRendered`'s lazy form and the files through `ServeFile`, so validators, conditional
  requests, `HEAD` and the cacheability narrowing by visibility and credential are the door's
  and nothing in `internal/format/pypi` sets a freshness header (Design, "Index rendering and
  content negotiation"; AC3).
- The advisory key this format reports and its hosted matching against public names (Design,
  "Policy refusals on the wire"; AC16), and the bounded spool and retirement claim every upload
  passes through (Design, "The upload path"; AC9, AC13).
- The proxied path against pypi.org: classification, file-URL rewriting, negative caching, and
  the PyPI-specific removal table including PEP 792 quarantine as the explicit security signal.

**Out of scope for v1**, each with its reason, recorded because the interface spec's
definition of done requires the deliberately unimplemented surface to be named:

- **The verification itself, the trust model and the Sigstore client.** Those are
  `docs/internal/plans/foundation/artifact-verification.md`'s (its Sigstore entry and "Per-format
  positions", PyPI), per the verification-ownership decision adopted in `supply-chain-policy.md`;
  every requirement the resolved attestation-bearing-uploads decision below placed on that
  producer is met there, and this spec keeps only the wire half (Design, "The upload path" and
  "The proxied path"). PEP 740 requires an index to verify attestations before accepting them,
  which is exactly the shape the producer delivers: a synchronous verdict inside the upload.
- **A PyPI-specific token issuance flow.** Credential issuance belongs to `foundation/auth.md`,
  which outsources identity flows to the identity provider, and the OIDC exchange that
  generalises PyPI's trusted publishing is `credential-management.md`'s (`POST
  /api/v1/tokens/exchange`, its "OIDC exchange", Phase 3, after OCI). What this format serves is
  a binding onto it (in scope above), never an issuer of its own.
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
| Wheel / sdist | `GET` on the file URL the index carries; the URL shape is ours to choose because the index, not a convention, tells the client where files live, and it is `.../files/{normalized-name}/{version}/{filename}` so the coordinate is in the URL (Design, "Addressed objects and pattern scopes") |
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
markers is lying to resolvers that key on the version. The one rise this spec already commits
to is **1.3 on a project with a verified attestation**: once a file carries a verified PEP 740
attestation, its detail page serves `provenance` (JSON) and `data-provenance` (HTML) and only
then declares 1.3 (`artifact-verification.md`, "Per-format positions", PyPI; AC14). A project
with no verified attestation keeps declaring 1.1. Per-file attributes served in both
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

**Every read goes through the serving door.** The root project list and every detail page, in
either serialization, are served through the lazy form of `ServeRendered`, the door
`signing-service.md` provides through `Documents` in `Deps` (its resolved handler-rendered
decision, was Q14, which names this format; `format-handler-interface.md` AC17): the handler
passes a renderer and a validator identity made of the serving snapshot's identity, the
project's package-level document identity for a detail page, the negotiated serialization and
the externally visible base URL, with the serving pointer as the freshness source, and the
runtime derives the strong `ETag` and `Last-Modified` from that identity and the pointer's
`moved_at` without rendering, so a `304` costs no render, a repoint (promotion or rollback)
changes the `ETag`, and no code in `internal/format/pypi` sets a validator, sets
`Cache-Control` or reads a conditional header (that spec's AC11 and AC32). Wheels, sdists and
`.metadata` files are `ServeFile` over the version's `File`, whose strong `ETag` is the CAS
digest. The door answers a `HEAD` on every one of these routes as the `GET` with the body
withheld, `Content-Length` included, rendering the index document for it (its resolved `HEAD`
decision, was Q24); no pinned client sends one and `curl -I` does. The handler's **serve policy**
is a package-level constant: pointer `Last-Modified` and `ETag` under the `exact` conditional
rule for the index documents, `ETag` only for files, `gzip` offered on the index documents,
byte ranges on files, and a `Cache-Control` of `public, max-age=600` on the index documents and
`public, max-age=31536000, immutable` on files, the values the public index serves and the
corpus re-grounds; pip sends `Cache-Control: max-age=0` on every index request, so the index
value governs intermediaries and never pip's own freshness. Byte ranges are load-bearing rather
than a courtesy: uv reads a wheel's metadata through `Range` requests on the wheel itself when
the index advertises no `.metadata` file (a legacy hosted file, or a proxied upstream without
PEP 658), so a file route that answers a `Range` with the whole body costs uv the download the
metadata file exists to avoid (AC17). Those `Cache-Control` values are a ceiling: the door
serves them as declared only to an anonymous reader of an anonymously readable repository and
narrows every other response to `private` (`signing-service.md`'s resolved cacheability
decision, was Q25, its AC38; `auth.md`'s was Q27 for the challenge, the existence-rule `404`
and every other response the authentication layer writes, which carry `private, no-store`),
which is what makes a private repository's index safe behind a shared cache without this
handler knowing one exists; pip's and uv's own caches are private caches and store a `private`
response as they always did. The management operations answer on `/api/v1`, where every
response carries `private, no-store` (`management-api.md`'s resolved cacheability decision,
was Q21, AC37).

### The upload path

twine POSTs one file per request as multipart form data, authenticated exactly as pip is, and
non-interactively: the harness provisions a token through its existing `setup` vocabulary and
injects it as `TWINE_USERNAME`/`TWINE_PASSWORD` (username `__token__`) with the repository URL
in the twine repository-URL environment variable, and for pip embeds the same credential in
the index URL or netrc.
Nothing new is asked of the harness vocabulary; this is the same claim npm's spec makes for
`.npmrc` tokens.

Upload semantics this registry enforces:

- **The body is read through the bounded spool `Deps` hands the handler**, under
  `management.publish_spool_limit` (`management-api.md`'s resolved spool-bound decision, was
  Q20; its AC36): a declared `Content-Length` above the bound is refused `413` before a byte is
  spooled, a body that outgrows it undeclared is cut and refused with nothing kept, and only a
  spooled body is parsed. twine builds the multipart with every metadata field before the
  `content` part (prior art: its upload module appends `content` last, read from the twine
  source on 2026-10-08; the corpus confirms the order), so the addressed object is read from the leading fields and an upload nobody has
  authorized costs at most the bound (Design, "Addressed objects and pattern scopes").
- **As soon as the parse yields the filename, the handler declares
  `{normalized-name}/{version}/{filename}` as the write's claim** on the transaction it opened
  through `Deps`, which checks it against the core-held `Retirement` records at declaration and
  again at commit under the repository's head lock (that spec's resolved claim decision, was
  Q14; `data-model.md` AC35; `storage-and-gc.md` was-Q12), so a retired filename is refused
  before the archive is opened and a deletion committed between the two checks cannot let it
  through. The claim is at the filename, the granularity this format retires at, which is the
  one invariant that spec places on a handler. The central `retired` refusal is rendered by
  this handler, not as the API's `409` problem document, in the same status and body as its own
  duplicate-filename refusal below (that spec's resolved wire-rendering decision, was Q16): the
  public index answers a duplicate `400` with a body naming the file as already existing, which
  the corpus fixes, and twine prints the body. A refusal is never a `5xx`: twine retries a
  `5xx` up to five times (its upload module, same reading), so a refusal in that range would be
  resent five times and a genuine failure that is no refusal, the verifier or the store unreachable, is
  exactly what answers `500` with nothing committed, safe to retry because nothing committed.
  PyPI declares nothing under that spec's unchanged-publish exception (was Q15): identical bytes
  at an existing filename are refused like any duplicate, because the public index refuses
  them and no pinned publishing client retries without the user's hand.
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
- **An upload carrying a PEP 740 `attestations` form field is verified synchronously, before
  anything commits**, through the `Verifier` consumer interface in `Deps`
  (`format-handler-interface.md` AC14; the producer is `artifact-verification.md`, "Per-format
  positions", PyPI, and its AC7): each statement's subject must name the uploaded file and its
  `sha256`, the certificate identity must match the repository's identity policy for that
  project, and `log-required` applies. Any failure refuses the whole upload with the reason in
  the body, nothing committed; a verified attestation is stored as a file of the version,
  never advertised as a distribution file in either serialization (an index anchor for it
  would be offered to pip as an installable), and the provenance object is rendered from it
  with the publisher derived from the certificate identity, served under `provenance` and
  `data-provenance`. **A repository with no identity
  policy configured refuses every attestation-bearing upload**, naming the missing policy: that
  is the original refusal decision below kept as the default, because accepting an attestation
  no policy can judge would be the false claim PEP 740's verify-before-accept exists to prevent.
  The same upload without the field succeeds either way. The no-policy refusal diverges from
  pypi.org and stays on the recorded exception list; the verified acceptance matches it.

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
  and the core writes a `Retirement` record for every removed filename in that same
  transaction (below).
- A proxied repository creates no snapshots at all, per the model's settled rule; index
  arrival and revalidation are cache materialisation.

Mapping onto the shared model uses the levels `data-model.md` provides, with one mapping worth
naming because it is the generalisation test doing its job: PyPI's index is **file**-oriented -
yank marks, `requires-python`, upload time and the core-metadata advertisement all attach to
individual files - and the shared model deliberately has no per-file metadata document. Those
attributes live in the **version-level** metadata document as a filename-keyed map, which the
index renderer joins against the version's `File` rows. No new model level is needed; if
implementation finds otherwise, that is a data-model spec change, never a handler-side table.
The package-level document holds the display-form name and future project-wide state; the root
index and every detail page are rendered from snapshot state through the pointer the handler is
given, never stored. The project's **retirement set** (every filename ever deleted from it) is
not in that document: it is the core-held `Retirement` record `management-api.md` moved it to
("Retirement is core-held", its resolved retirement-placement decision, was Q3) and
`data-model.md` owns (its entity table, AC35). The handler returns each deleted filename as
`{normalized-name}/{version}/{filename}` in the operation's `Outcome`, the core writes the
records in the deleting transaction, and the shared write path refuses a later upload that
claims a retired filename, at the claim's declaration and again at commit (Design, "The upload
path"; `management-api.md` was-Q14), rendered by this handler as its duplicate refusal, across
a backwards repoint and after every snapshot that held the file has been pruned, with nothing
for this handler to carry forward. The `Package` row survives the deletion of the project's
last file (`data-model.md` AC33) so the project stays addressable: it is served as absent while
its retired filenames stay refused.

### The management surface

A management operation has a **trigger** (the call that changes state) and an **effect** (what a
resolving client then sees), and the oracle's reach over the two differs
(`docs/internal/analysis/management-surfaces-and-the-oracle.md`). For PyPI no client triggers
anything: twine has no yank or delete command and pypi.org does both through its own web UI.
Every effect, though, is standardised and client-observable.

This spec follows the precedent shared by the Cluster 5 format specs (`npm.md`,
`ansible-collections.md` and this one), whose common home is
`docs/internal/plans/foundation/management-api.md`, which now fixes the vocabulary:

- **The surface is registry-owned, not PyPI-shaped.** Each operation is a **kind** of the one
  management API's closed vocabulary, never a PyPI-specific route invented here, and the action
  follows the kind (its kind table and cross-format reconciliation table, which carry PyPI's
  rows). The handler implements that spec's `Operator` interface, declaring `withdraw`,
  `restore`, `delete-file` and `delete-version`, reporting each operation's `(object, action)`
  pairs and its retirement claims through `Authorize`, which returns that spec's
  `format.Addressed` (its resolved claim decision, was Q14: `delete-file` claims the filename,
  `delete-version` every filename of the version, `withdraw` and `restore` nothing, since they
  retire nothing), and applying it inside the write transaction the core opened through
  `Apply`. This spec defines what each operation means and what pip sees afterwards; the shared
  spec defines URL shape, request form, authorization and audit. No route is a binding: twine
  drives none of these, so there is nothing to bind, and that spec's binding rule (was Q13)
  therefore binds nothing here.
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

| Operation | Kind (`management-api.md`) | Effect a client sees | Write | Action |
|---|---|---|---|---|
| Yank a file or a whole release, with an optional reason | `withdraw` | `data-yanked` (carrying the reason, or empty) and the JSON `yanked` field on each affected file; pip skips them unless the requirement pins that exact version with `==` or `===` | One metadata-only write | `delete` (its resolved withdraw-action decision, was Q1) on the object `Authorize` reports: the version for a release yank, the file for a file yank (Design, "Addressed objects and pattern scopes") |
| Unyank | `restore` | The marks disappear and normal resolution returns | One metadata-only write | `delete` on the same object the yank reported |
| Delete a file | `delete-file` | The file leaves both serializations and is no longer served; its filename is retired | One write | `delete` on the file |
| Delete a release | `delete-version` | Every file of the version leaves the index; every filename is retired | One write, however many files | `delete` on the version |

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
  requires the handler to know the externally visible base URL rather than the bind address
  (`server.public_url` through `Deps` until that spec's re-open places it; `npm.md` records the
  same need).
- **Upstream provenance is re-hosted, never passed through.** A proxied file whose upstream
  detail page carries `provenance` has its attestations fetched with the file, verified through
  `Deps`' `Verifier`, cached as content and served under this registry's own provenance URL;
  an attestation that fails is not served and the file's verdict is `failed`; a file with no
  upstream provenance serves none with the verdict `absent`; and no served provenance URL ever
  points at the upstream (`artifact-verification.md`, "Provenance the registry vouches for",
  its resolved provenance decision, was Q7, and AC8). Passing the upstream URL through would
  tell pip this index vouches for material it never saw, and it would also send the client past
  the cache, the same failure the file-URL rewrite above closes.
- **Every fetch carries a declared digest** (the index's `sha256` for files and for `.metadata`
  advertisements), so PyPI never uses `proxy-cache.md`'s completion-only mode (its resolved
  completion-only decision, was Q15, AC20). The fetch-and-cache request also carries the
  advisory key (Design, "Policy refusals on the wire"), so a condemned coordinate is refused
  before any upstream request.
- **Proxied reads go through the same door.** A cached detail page is served through
  `ServeRendered`'s lazy form over the cached document with the remote's `adopted_at` as the
  freshness source, a cached file through `ServeFile`, and a `HEAD` on any proxied route is
  the `GET` with its body withheld, cache-filling and never forwarded (`proxy-cache.md`'s
  resolved `HEAD` decision, was Q24, AC32). A remote's current documents, the root list and
  every detail page it has served, are never LRU-evicted; only cached files are (its was Q21,
  AC29), so a busy PyPI remote's metadata grows with the names requested, outside the quota,
  reported in `cache_metadata_bytes`, which is that decision's stated cost and the gauge an
  operator alerts on. PyPI declares no retained upstream revisions (its was Q19: a count of
  zero) because no route reads a superseded detail page, and it keeps no declared blob list on
  the proxied path: every cached file holds its own cached reference.

Upstream removal maps onto the settled purge-or-flag table as PyPI's side of that contract:

| Upstream event, as observed at revalidation | Classification |
|---|---|
| The project's status marker becomes `quarantined` (PEP 792; the index serves no distribution links) | The **explicit security signal**: from that moment every resolution of the project's coordinates is refused with an error naming the signal and no upstream fetch of them is made, the cached references end (the purge), a refusal record is written and the operator is alerted once, per the shared security-signal rule stated verbatim in `proxy-cache.md` and `supply-chain-policy.md` |
| Files or the whole project vanishing with no status marker (author or admin deletion) | Keep serving, record an operator-visible divergence |
| A file gaining a yank mark | **Neither purge nor divergence-free**: mirror the mark at the next revalidation per the PEP 592 mirror rule (a mirror that keeps a yanked file MUST carry its yank metadata), keep the cached file, and record the divergence, per the settled PyPI-yank row in `proxy-cache.md` (its AC13). New resolutions then exclude the release because pip skips yanked files except under an exact `==`/`===` pin - the exclusion is the client's half of the composed contract, and ours is serving the mark faithfully |
| A filename the cache holds advertised at revalidation with a different `sha256` | A **coordinate-bound immutability violation**, treated as the explicit signal (`proxy-cache.md`'s event-class table, its AC13): the cached file is purged, the divergence record keeps both digests and one alert is raised; the next request re-fetches and verifies against the new digest. The class fits because a PyPI filename implies its bytes (the public index never reuses one, the rule this spec's own retirement keeps) and every pinned client verifies the download against the digest the index declares, so the old bytes would fail every consumer |
| A status marker becoming `archived` or `deprecated`, or any other metadata change | An ordinary metadata change, propagated at the next revalidation; never a removal event |

This composes with AC7 exactly as that criterion claims, and more cleanly than npm's side of
the table: npm's security signal is a heuristic over an unversioned holding-package
convention, while PyPI's is a standardised, machine-readable marker - though it appears only
in api-version 1.4 responses, so the corpus and the drift job still re-ground the detection
rather than this table being trusted forever. Detection happens at revalidation only: per
`proxy-cache.md`'s resolved answer (was Q12) the proxy layer never polls an upstream, and the
active channel is `supply-chain-policy.md`'s advisory feed, whose malware advisories condemn
the same coordinates through the same rule, so a quarantine observed here and an OSV `MAL-`
entry for the project are one condemnation, never two purges.

One assertion trap, inherited from npm's review: pip keeps a client-side HTTP cache and a
wheel cache, so a second install that never contacts this registry proves nothing about it.
AC4's case asserts both directions - the second install reached this registry (transcript)
and this registry did not contact the upstream (network layer) - with fresh client cache
state as part of the case setup.

### Addressed objects and pattern scopes

`auth.md`'s pattern scopes narrow a credential within one repository by matching the object each
request addresses, and the format declares which object each route reports ("Pattern scopes"
there; `format-handler-interface.md` AC12). Every name in PyPI's objects is canonical: the
project is its PEP 503 normalised name and the version its PEP 440 normalised form, so a pattern
is written against `foo-bar-baz`, never against a spelling an uploader happened to use. The file
URL shape is this registry's to choose (Design, "The wire surface"), and it is chosen to carry
the coordinate, `.../files/{normalized-name}/{version}/{filename}`, so a file's object is read
from its URL with no lookup, hosted and proxied alike.

| Route | Object kind | Canonical object |
|---|---|---|
| Root project list, `GET .../simple/` | none | - |
| Project detail, `GET .../simple/{name}/`, and the redirect from an unnormalised spelling | named | `{normalized-name}` |
| A wheel or sdist, and its `.metadata` file | named | `{normalized-name}/{version}/{filename}`, the wheel's own filename for its `.metadata` file, so one pattern admits both |
| Upload | named, or none | `{normalized-name}/{version}` from the form's `name` and `version` fields when they precede the `content` part; none when the file part comes first |

The upload row is the one judgment in the table, and it is the same one `ansible-collections.md`
makes for its publish: the object must be known before the artifact bytes arrive, or authorizing
it means spooling an upload nobody has authorized yet (bounded, now, by the spool limit, which
caps the cost but does not remove the reason). Reporting none when the order is wrong fails
safe, since only an unpatterned `push` then authorizes the upload; twine's source appends the
`content` part after every metadata field (prior art, "The upload path"), and the corpus's
recorded twine upload grounds which order each pinned publishing client actually sends, uv,
Poetry and pdm included (AC17). Validation already refuses an upload whose filename or inner
metadata disagrees with those form fields (AC9), so a mislabelled form cannot evade the
pattern.

Consequences: there is no implicit wildcard, so a credential for a family of projects is written
`acme-*/**`, which admits the detail page, the files and the upload; a patterned credential
cannot read the root project list, which pip never requests for an install; and it resolves
only dependencies inside its pattern, so a build with public dependencies holds an unpatterned
scope on the repository serving them. The management operations are kinds of
`docs/internal/plans/foundation/management-api.md`, and the handler's `Authorize` reports their
objects in the same grammar: `{normalized-name}/{version}` for a release-level `withdraw` or
`restore` and for `delete-version`, and `{normalized-name}/{version}/{filename}` for
`delete-file` and a file-level `withdraw` or `restore`, so one pattern governs a project's
routes and its management operations alike, and the action is `delete` on whichever object is
reported (Design, "The management surface").

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines, the
handler answers `403` with a `text/plain` body naming the policy and rule, or naming the signal
for a coordinate condemned under the shared security-signal rule, on the detail page, file and
metadata-file routes alike and on both paths. `403` rather than the existence rule's `404`,
because the caller is authorized and the content is what is refused. The grounding risk this
spec first named, that pip may surface only the status line of a failed download while Go's
HTTP server writes the reason phrase from the status code alone, was raised with
`supply-chain-policy.md` and is resolved there (its resolved status-line decision, was Q10, and
AC18): the handler writes the refusal through the shared writer `WriteRefusal` in
`internal/format` (`format-handler-interface.md` AC14), which on an HTTP/1.1 connection hijacks
the write and emits `HTTP/1.1 403 Refused by policy: {condition}` as the status line, the same
phrase for every format, and `deployment.md` guarantees HTTP/1.1 reaches the client. The `403`
and the `text/plain` body remain this format's. What AC16's capture still settles is whether pip
shows the phrase, the body, or both; either way the user sees the policy. That spec's table "When
a refusal binds, per format" carries PyPI as `pending` until that capture also records what pip
does after the refusal (whether an `--extra-index-url` fallback installs the refused version from
elsewhere), replacing the row in the same change (its AC20); the harness refuses to run the
policy case before then (`conformance-harness.md` AC26). The refusal is written outside the
serving door, so the door's cacheability rule does not reach it; whether `WriteRefusal` carries
`private, no-store` is `supply-chain-policy.md`'s call, already queued to it by
`signing-service.md`'s round-7 follow-up, and this spec asserts nothing about it until that
spec answers.

**The advisory key** is the stored coordinate itself. OSV's PyPI ecosystem keys its records on
the PEP 503 normalised project name (the OSV schema's ecosystem table: the `name` field "is a
normalized PyPI package name", fetched 2026-10-08) and on PEP 440 versions, so the normalised
name this format stores as the only project key is exactly what the matcher compares, and
`Package.name` needs no separate key (`supply-chain-policy.md`'s resolved advisory-key
decision, was Q11, AC24; its coverage row for PyPI). The version is the one place a spelling
can differ: the stored version is the PEP 440 normalised form, while OSV's enumerated
`versions` lists carry the spelling the public index lists, and that spec matches an
enumerated list by string equality on the key, never under the ordering (its AC17), so where
an upload's version spelling differs from its normalised form (`1.0.0-rc1` against `1.0.0rc1`)
the handler reports the uploaded spelling as the version's advisory key, the same CRAN-shaped
rule its AC24 carries, on the hosted write and on the fetch-and-cache request. A hosted
repository matches public coordinates (its was Q12, AC25): a private project that shares a
public name inherits the public project's advisories until the operator exempts the name
through the policy's `coordinate_exemptions`, keyed on the normalised name as the matcher keys
it, which is the dependency-confusion shape `--extra-index-url` is known for and the reason
over-refusal is the safe error.

### Capabilities and lifecycle

`Capabilities()` declares proxy support `supported`, reference-implementation availability
`available`, `Virtual: supported` and `Rename: supported` (`format-handler-interface.md` AC13).
A virtual PyPI repository resolves a project in its first member that holds it, which closes the
dependency confusion `--extra-index-url` invites. `repository-lifecycle.md` AC12 requires
`conformance/pypi/rename_test.go`, enforced by the harness's case-set validator
(`conformance-harness.md` AC26); AC20 carries it with a real `pip install` from the renamed
repository.

### Trusted publishing is a binding onto the OIDC exchange

PyPI's trusted publishing lets a CI job exchange its OIDC identity token for a short-lived upload
token, with no stored secret. The exchange is `credential-management.md`'s
(`POST /api/v1/tokens/exchange`: a robot's trust policy names the issuer and claim constraints,
the minted token is scoped within the robot's grants and expires within
`credentials.exchange_token_lifetime`; its AC13), and that spec names this format's binding as
one of the two first consumers, written when this format's management surface is. What this
spec adds is the wire: the format-shaped route PyPI's publishing clients call to mint an upload
token is served as a binding that translates into that exchange and returns the minted token in
the shape the client expects, and nothing else, so there is one exchange and two ways in. The
route's exact shape is grounded in captured client traffic when the binding is written, not in
pypi.org's documentation. Its response carries a secret, so it carries exactly `Cache-Control:
private, no-store`, the value `POST /api/v1/tokens/exchange` itself carries
(`management-api.md` AC37); the binding sits on this format's mount, outside that mount's
middleware and outside the serving door, and no handler package may write the header
(`signing-service.md` AC11), so the shared binding layer must set it, reported to
`credential-management.md` as this spec's requirement on its AC25 (AC19 asserts it here).
One consequence binds on the upload that follows: an upload authenticated by an exchanged
token must attest under the same robot's identity (`artifact-verification.md` AC28), which
closes the hole where a job exchanges as one identity and attests as another.

### Conformance, auth and the corpus

The recorded surface for AC5's corpus, named now because a thin recording script yields a thin
specification (the harness spec's own warning): cold install through the JSON client and
through a pre-22.2 HTML client, warm install with client caches defeated, a conditional
revalidation of a detail page (the `304` and the request headers pip and uv send, `Cache-Control:
max-age=0` among them), an install under hash-checking mode (`--require-hashes`, the
ecosystem's lockfile-strictness analogue), an sdist-only package install, `pip download`, a
metadata-file resolution by a modern resolver, uv's `Range` reads of a wheel with no metadata
file, an unnormalised-name request, a yanked release skipped and then installed under an exact
pin, twine uploading a wheel and an sdist (the multipart part order recorded), a
duplicate-filename refusal with its status and body, and a missing-package failure. This list is the review baseline for the recording script. Recording gates on the
harness's redaction criterion (`conformance-harness.md` AC13), and every deliberate divergence
from public-index behaviour goes on the recorded exception list **before** its flow is expected
to replay. One divergence is known now: the refusal of an attestation-bearing upload on a
repository with no identity policy, where pypi.org verifies and accepts; with a policy
configured, the verified acceptance matches pypi.org and replays. Filename retirement matches
the public index, so a deleted-filename refusal replays. The hosted yank and deletion triggers have no public-index
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
      marks - identical in meaning across the two serializations; both are served through
      `ServeRendered`'s lazy form with a `304` on a matching conditional request without a
      render and an `ETag` that changes on a repoint, files through `ServeFile` with a
      satisfiable `Range` answered `206`, a `HEAD` on every route carrying the `GET`'s headers
      and no body, no validator, `Cache-Control` or conditional header set or read anywhere in
      `internal/format/pypi`, and the serve policy's `Cache-Control` served as declared only to
      an anonymous reader of an anonymously readable repository and narrowed to `private` on a
      private repository and on every authenticated request.
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
      same way with nothing committed; an upload whose declared `Content-Length` exceeds
      `management.publish_spool_limit` is refused `413` before a byte is spooled and one that
      outgrows it undeclared is cut with nothing kept; no refusal answers a `5xx`, and a
      failure that is no refusal (the verifier unreachable) answers `500` with nothing
      committed so that twine's retry of it is safe.
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
      `proxy-cache.md` (its AC13); after the purge a fresh `pip install` of the quarantined
      project is refused with an error naming the signal, with no upstream request for it,
      asserted at the network layer, as the shared security-signal rule requires; and a cached
      filename re-advertised upstream with a different `sha256` is purged as a coordinate-bound
      immutability violation with one alert and a divergence record naming both digests, the
      next `pip install` re-fetching and verifying against the new digest.
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
- [ ] AC14: A real `twine upload --attestations` of a file whose attestation the fixture Sigstore
      issued for an identity in the repository's identity policy is accepted, the attestation is
      stored as a file of the version, and the simple index serves `provenance` in JSON with
      `api-version` 1.3 and `data-provenance` in HTML, both pointing at a provenance object
      `pypi-attestations verify` accepts, while a project without a verified attestation keeps
      declaring 1.1; the same upload with a tampered attestation, an attestation whose subject
      names another file, or an identity outside the policy is refused with the reason in the
      body, nothing committed and no snapshot created; a repository with no identity policy
      refuses every attestation-bearing upload naming the missing policy; and the same
      distribution uploaded without the flag succeeds in every case (this format's half of
      `artifact-verification.md` AC7).
- [ ] AC15: A token holding `pull` and `push` under the pattern `acme-*/**` uploads `acme-tool`
      through the real `twine` and installs it through real `pip`, including its `.metadata`
      file and wheel, and a requirement spelled `Acme_Tool` installs under the same pattern
      because the object is the normalised name; the token is refused uploading and installing
      `other-tool` and refused the root project list; and in proxied mode it installs an
      `acme-` project through the cache and is refused another.
- [ ] AC16: A detail-page, file or metadata-file request the shared policy layer refuses answers
      `403` with a body naming the policy, on the hosted and the proxied path, and a real
      `pip install` of the refused version exits non-zero with an error that names the refusal;
      a version uploaded under a spelling that normalises differently from its filename's and
      under a non-normalised version spelling is refused under a controlled advisory keyed on
      the normalised name and the listed spelling, on both paths, and a hosted project sharing
      a public name is refused under the public advisory until the operator exempts the
      normalised name through `coordinate_exemptions`, after which it installs.
- [ ] AC17: uv, Poetry and pdm, each pinned by image digest, pass this format's install cases on
      both paths with each as the client (AC1 and AC4), and each publishes a wheel through its
      own publish command that a subsequent install retrieves with a matching hash, as the
      catalogue's client-reach criterion (its AC2) requires of every client its multiplier table
      names; and uv resolving a wheel that advertises no `.metadata` file reads its metadata
      through `Range` requests answered `206` and downloads no whole wheel until it installs,
      asserted at the transcript, on both paths.
- [ ] AC18: A proxied file whose upstream stand-in serves provenance has its attestations
      fetched, verified and cached; a verified one is served from this registry's own provenance
      URL in both serializations and `pypi-attestations verify` accepts it; a failed one is not
      served and the file's verdict is `failed`; a file with no upstream provenance serves none
      with the verdict `absent`; and no served provenance URL points at the upstream, asserted
      over every detail page the case renders (this format's half of `artifact-verification.md`
      AC8).
- [ ] AC19: The format-shaped token-mint route, called with an identity token from the fixture
      OIDC issuer matching a robot's trust policy, returns a token in the shape the real
      publishing client accepts, and that client then uploads a wheel under the robot's grants
      with the token expiring within `credentials.exchange_token_lifetime`; a token that matches
      no trust policy is refused with nothing minted; every response of the binding, minted or
      refused, carries exactly `Cache-Control: private, no-store`; and an upload under an
      exchanged token whose attestation names another identity is refused before commit.
- [ ] AC20: The handler's `Capabilities()` declares proxy `supported`, reference-implementation
      availability `available`, `Virtual: supported` and `Rename: supported`; a real `pip install`
      from a renamed repository succeeds under the new name in both modes while the old name
      answers 404 indistinguishably from a never-existing repository; and a virtual repository of
      two members resolves a project present in both from the first member.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/pypi/hosted_test.go` (pinned pip < 22.2 and pip >= 22.2) |
| AC2 | conformance | `conformance/pypi/wheel_test.go` (two client platform/interpreter combinations; sdist-only case) |
| AC3 | conformance + integration | `conformance/pypi/index_test.go`; `internal/format/pypi/negotiation_test.go` (media types, api-version claim); `internal/format/pypi/serving_test.go` (both documents from one state through the lazy form, the `304` without a render and the repoint `ETag` on `signing-service.md` AC32's fixture shape, `ServeFile`'s `206`, the `HEAD` header set, the `Cache-Control` matrix shared with `signing-service.md` AC38's `internal/index/cacheability_test.go`); the validator and `Cache-Control` scan is `signing-service.md` AC11's module-wide `internal/index/freshness_boundary_test.go` |
| AC4 | conformance | `conformance/pypi/proxied_test.go` (transcript + network-level assertion, fresh client cache in setup) |
| AC5 | conformance | `conformance/pypi/replay_test.go` |
| AC6 | manual | `docs/internal/tasks/experiment-log.md`: npm baseline row verified present before work starts; PyPI row and the generalisation finding reviewed at completion |
| AC7 | conformance | `conformance/pypi/yank_test.go` (proxied; mutating test upstream, unpinned then `==`-pinned install) |
| AC8 | conformance | `conformance/pypi/normalisation_test.go` |
| AC9 | conformance + integration | `conformance/pypi/upload_test.go` (duplicate filename, its status and body compared with the corpus; mismatched-metadata refusal; snapshot-table assertion via the registry state, not the client); `internal/format/pypi/upload_spool_test.go` (the `413` before a byte and the undeclared overrun on `management-api.md` AC36's fixture shape; the claim declared on the transaction before the archive is opened; the `500` with nothing committed on an injected verifier failure, and a scan of every refusal status for `5xx`) |
| AC10 | conformance + integration | `conformance/pypi/metadata_file_test.go` (resolver transcript); `internal/format/pypi/metadata_extract_test.go` |
| AC11 | integration + conformance | `internal/format/pypi/removal_test.go` (test upstream presenting each event class; the shared-layer half is `proxy-cache.md` AC13's); `conformance/pypi/security_signal_test.go` (post-purge install refused naming the signal; network-level assertion of no upstream fetch; the stand-in re-advertising a cached filename under a new digest, the purge, the single alert and the re-fetch) |
| AC12 | integration + conformance | trigger: `internal/format/pypi/manage_yank_test.go` (snapshot count per operation, `delete` authorization refusal, proxied-repository refusal); effect: `conformance/pypi/hosted_yank_test.go` (the `script` yanks through the management endpoint, then runs real pip unpinned, `==`-pinned, and again after an unyank; a second case seeds the yanked state through `setup`'s `state` key) |
| AC13 | integration + conformance | trigger: `internal/format/pypi/manage_delete_test.go` (release delete as one snapshot; retired-filename refusal with same and different bytes, after pruning under an injected clock, and after the last live file is gone); effect: `conformance/pypi/hosted_delete_test.go` (the `script` deletes through the management endpoint, real pip then fails to resolve the deleted file, and a real twine re-upload is refused) |
| AC14 | conformance + integration | `conformance/pypi/attestations_upload_test.go` (real twine with fixture bundles from the fixture Sigstore, `pypi-attestations verify` on the served provenance, the three refusals, the no-policy refusal, the same file without the flag; shared with `artifact-verification.md` AC7); `internal/format/pypi/upload_attestation_test.go` (synchronous verification through a fake `Verifier` before commit, nothing committed and snapshot count unchanged on refusal, `api-version` 1.3 only with a verified attestation) |
| AC15 | conformance + unit | `conformance/pypi/auth_test.go` (the pattern-refusal case `format-handler-interface.md` AC7 requires, in both modes; a pattern-scoped token provisioned through the `credentials` key); `internal/format/pypi/scope_object_test.go` (the object table, per route, including the file-before-fields upload reporting none, `format-handler-interface.md` AC12) |
| AC16 | conformance + integration | `conformance/pypi/policy_test.go` (hosted and proxied modes; rules through the `policies` key, a controlled advisory through `advisories` keyed on the normalised name and the listed version spelling; the hosted public-name refusal and the exemption through the policy document; the captured pip output and its `--extra-index-url` fallback behaviour replace the `pending` binding-table row in the same change, `supply-chain-policy.md` AC20); `internal/format/pypi/advisory_key_test.go` (the normalised name, the uploaded version spelling reported only where it differs, on the hosted write and the fetch-and-cache request; shared with `supply-chain-policy.md` AC24) |
| AC17 | conformance | `conformance/pypi/clients_test.go` (uv, Poetry and pdm pinned by digest, running the install and proxied cases and publishing through each; uv's `Range` reads of a wheel with no `.metadata` advertisement asserted at the transcript on both paths) |
| AC18 | conformance + integration | `conformance/pypi/attestations_proxied_test.go` (stand-in serving provenance: verified, failed, none; URL assertions over every rendered detail page; shared with `artifact-verification.md` AC8); `internal/format/pypi/provenance_rehost_test.go` (rewriting and the three verdict states against a fake `Verifier`) |
| AC19 | conformance + integration | `conformance/pypi/trusted_publishing_test.go` (fixture OIDC issuer in a container, the real publishing client minting through the binding and uploading; no-match refusal); `internal/format/pypi/oidc_binding_test.go` (the binding translates into `POST /api/v1/tokens/exchange` and nothing else, and every response of it carries exactly `private, no-store`; shared with `credential-management.md` AC13's exchange fixture and AC25's binding fixture and `artifact-verification.md` AC28's robot-identity check) |
| AC20 | unit + conformance | `internal/format/pypi/capabilities_test.go` (the four declarations, `format-handler-interface.md` AC13); `conformance/pypi/rename_test.go` (`repository-lifecycle.md` AC12, presence enforced by `conformance-harness.md` AC26); `conformance/pypi/virtual_test.go` (first-member resolution through real `pip install`) |

## Implementation Phases

### Phase 1: Hosted core
- Name normalisation and redirects, index rendering in both serializations with content
  negotiation through `ServeRendered`'s lazy form, file serving through `ServeFile`, the
  package-level serve policy, upload through the bounded spool with its declared claim, digest
  and coherence validation, duplicate-filename refusal rendered as the corpus records it,
  metadata-file extraction and serving, the advisory key on the hosted write
- Synchronous PEP 740 verification inside the upload through `Deps`' `Verifier`, provenance
  served in both serializations with the 1.3 claim, the no-policy refusal (AC14;
  `artifact-verification.md` Phase 2 is built with this format at charter step 6)
- The coordinate-carrying file URL and the per-route addressed-object declaration; the `403`
  rendering of the typed policy refusal through `WriteRefusal`
- `Capabilities()` declaring proxy, reference implementation, `Virtual` and `Rename`; the rename
  and virtual cases (AC20)

### Phase 2: Mutation and metadata surface
- Waits on `docs/internal/plans/foundation/management-api.md` reaching `planned` (Blocking
  preconditions)
- The write-boundary declaration exercised end to end; yank representation; per-file
  attributes through the version-level document; the hosted management operations as the
  `withdraw`, `restore`, `delete-file` and `delete-version` kinds on the handler's `Operator`;
  the retired filenames returned in `Outcome` and refused centrally
- The trusted-publishing binding onto `credential-management.md`'s OIDC exchange, after that
  spec's Phase 3 (AC19)

### Phase 3: Proxied path
- Classification and file-URL rewriting, conditional revalidation, negative caching, the
  removal table with quarantine detection and the refusal-before-fetch that follows it, the
  coordinate-bound violation purge, yank mirroring, HTML-only-upstream parsing, the advisory
  key on the fetch-and-cache request, `HEAD` through the shared door
- Upstream provenance fetched, verified and re-hosted from this registry's URL (AC18)

### Phase 4: Corpus and gate
- Recording session across the named surface (after the harness redaction gate), replay-match,
  the second pinned client, uv, Poetry and pdm (AC17), experiment-log entries and the
  generalisation finding

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
`docs/internal/plans/foundation/management-api.md` (since authored: the `withdraw`, `restore`,
`delete-file` and `delete-version` kinds of its vocabulary, PyPI's rows in its reconciliation
table); this spec defines what each operation means and what pip sees afterwards (Design, "The
management surface"; AC12, AC13).

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

Rechecked on Fable 2026-10-08: confirmed. The options were fairly framed and A's accepted cost
(the trigger vouched for by integration tests alone) is honest and now priced in the shared
spec's own enforcers. Amended in its fold: the Design table gave a file-level yank `delete`
"on the version" while the addressed-object paragraph reported the file as the object; the
action is `delete` on whichever object `Authorize` reports, the version for a release yank and
the file for a file yank, aligned in both places. `Authorize` now returns `format.Addressed`,
pairs plus claims, with `withdraw` and `restore` claiming nothing (management-api was-Q14).

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

**Lifted 2026-09-28**, as this record said it would be once the producer existed:
`artifact-verification.md` was authored on 2026-09-27 and meets every requirement listed below
(synchronous verification inside the upload, a per-repository identity policy, the stored
attestation served as provenance in both serializations with the 1.3 claim, re-hosting on the
proxied path, and the criterion shape), so AC14 was rewritten from "refused as unsupported" to
"valid accepted and served, tampered refused", exactly as the last requirement asked, and AC18
added for the proxied half. The refusal survives as the default for a repository with no
identity policy configured, because option A's reasoning still holds there: an attestation no
policy can judge can be neither accepted nor warehoused honestly.

Accepted cost: `twine upload --attestations` fails against this registry until verification
lands, and a CI pipeline configured for pypi.org needs a flag change to publish here. Why the
alternatives lost: B tells exactly the users who opted into provenance that it was published
when it was discarded, and C violates PEP 740's verify-before-accept and warehouses material
that invites a later false provenance claim.

The producer this refusal waited on is
`docs/internal/plans/foundation/artifact-verification.md`, the sibling verification spec
`supply-chain-policy.md` adopted as the owner of verification. What PyPI required of it,
recorded here so the dependency could not be lost, and now met by its "Per-format positions"
(PyPI), its resolved provenance decision (was Q7) and its AC7 and AC8:

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

Rechecked on Fable 2026-10-08: confirmed, both the original adoption and its lift. The five
requirements this record placed on the producer were each found met in
`artifact-verification.md` at HEAD ("Per-format positions", PyPI; its AC7, AC8 and AC28), and
AC14 and AC18 here match its AC7 and AC8 clause for clause. The no-policy refusal kept as the
default is the right residue of option A: the accepted cost moved from "every attestation-bearing
upload fails" to "fails until the operator writes an identity policy", which is stated.
Under-stated until now: the refusal must never be a `5xx` (twine retries those five times) and a
verifier that cannot answer is a `500` with nothing committed, now in Design, "The upload path".

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
uploaded, is retired forever; deletion never frees it (Design, "The upload path" and "What
counts as a write"; AC13). This adoption placed the retirement set in the package-level metadata
document; `management-api.md`'s resolved retirement-placement decision (was Q3 there,
2026-09-27) moved it to the core-held `Retirement` record `data-model.md` owns (AC35), refused
by the shared write path on every upload. The semantics are unchanged; only where the set lives
moved.

Accepted cost: a botched upload cannot be fixed in place, so the operator bumps the version or
the build number, and will occasionally resent it. Why B lost: it breaks every downstream cache
and `--require-hashes` lockfile that saw the old bytes, including this registry's own
proxied-of-hosted deployments, which would serve the stale bytes forever.

This is consistent with, not opposed to, the operator-control answer `npm.md` adopted for its
unpublish restrictions: that answer removes public-commons policy (time windows, dependent
counts), while this one keeps a correctness property. `npm.md` and `ansible-collections.md`
adopted the same retirement rule for their own coordinates in the same pass, so it is a
cross-format property the management API spec inherits rather than a PyPI quirk.

Rechecked on Fable 2026-10-08: confirmed, amended in its fold. A is right for the reason the
record gives, and the placement move to the core-held record stands. What the fold had not
carried: the refusal is no longer "before the handler's duplicate check" by an unspecified
mechanism but a claim the upload declares on its write transaction at the filename, checked at
declaration and at commit (management-api was-Q14), and its rendering is this handler's, the
same status and body as the duplicate refusal the corpus records, never the API's `409`
(was-Q16); the deleting operations claim every filename they retire. Design, "The upload path"
and "What counts as a write", AC9's row and AC13 carry it.

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
| 2026-09-26 | da0aecd | cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Found already done: the harness item on hosted yank (the management-surface Design and the AC12 row already seed through `state` or call the endpoint from `script`). Applied: the addressed-object table (root list none, detail `{normalized-name}`, files `{normalized-name}/{version}/{filename}` via a file URL chosen to carry the coordinate, upload named from the form fields when they precede `content`, none otherwise) with AC15; the object reporting this format requires of `management-api.md`; the security-signal rule in the quarantine row and AC11's refusal-before-fetch; the policy rendering (AC16) with the reason-phrase risk recorded for supply-chain-policy; the catalogue's resolved client-reach decision applied to uv, Poetry and pdm (AC17); Trusted Publishing's exclusion re-cited to `credential-management.md`. Stays draft. |
| 2026-09-28 | a6d72b3 | cross-spec reconciliation of the foundation wave. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` naming this file verified against the current text of its source spec before applying. From the artifact-verification authoring (item 8): AC14 lifted from "refused as unsupported" to "valid accepted and served, tampered refused" exactly as the Q2 record's criterion shape asked (synchronous verification through `Deps`' `Verifier`, provenance in both serializations, `api-version` 1.3 only then, the no-policy refusal kept as the default), sharing `conformance/pypi/attestations_upload_test.go` with its AC7; the proxied re-host rule (its resolved provenance decision, was Q7) as a proxied-path bullet and AC18 sharing `attestations_proxied_test.go` with its AC8; the Q2 record carries a dated "Lifted" note and the out-of-scope items are rewritten. From the credential-management authoring (item 12): trusted publishing is a binding onto `POST /api/v1/tokens/exchange` (its "OIDC exchange", Phase 3, AC13), a new Design section and AC19 with `artifact-verification.md` AC28's same-robot rule. From the management-api authoring (items 11 and 12): the retirement set is the core-held `Retirement` record (`data-model.md` AC35; management-api's resolved retirement-placement decision, was Q3), returned per filename in `Outcome` and refused centrally, rewritten through "What counts as a write", Phase 2 and the Q3 record; the management table gains the kind column (`withdraw`, `restore`, `delete-file`, `delete-version`, all `delete`, the withdraw action citing its was-Q1) and the handler's `Operator` declaration; the addressed-object paragraph reports management objects through `Authorize`; every "(to be authored)" citation replaced. From the supply-chain reconciliation (item 11), Open item 5 and its resolved status-line decision (was Q10, AC18): the reason-phrase risk this spec raised is recorded as resolved by `WriteRefusal`'s HTTP/1.1 status line, and AC16's capture fills the `pending` binding-table row (its AC20, harness AC26). From the repository-lifecycle authoring (item 15) and format-handler-interface AC13: `Capabilities()` with `Virtual` and `Rename` and `conformance/pypi/rename_test.go` (AC20). `proxy-cache.md`'s completion-only mode (was Q15) recorded as unused because every fetch carries a declared digest. Found already done: the harness and generic fold's item 4 (AC12's `state` and `script` split, at da0aecd). No question raised. `node scripts/check-spec.js` zero failures for this file. Stays draft pending a gate review. |
| 2026-10-08 | 1d0c702 | Fable gate review: full review (claim verification at HEAD against every cited foundation record, the adversarial lens at full strength on the Opus reconciliation of a6d72b3 and on the Fable-authored design of 506c9e3, constitution compliance), plus the recheck brief's step 1 over the whole consequences queue and a re-examination of the three adoptions of 4d1aeb1; the protocol half re-grounded against the OSV schema (fetched 2026-10-08) and the twine upload source (same day), with the published PEP texts for the simple-index claims | Brought current first: every item in `agents/spec-loop/consequences.md` naming this file verified against the current text of its source and applied or found done. Applied: signing-service was-Q14, Q24 and Q25 (a new "Every read goes through the serving door" paragraph: both index documents through `ServeRendered`'s lazy form with a validator identity and the pointer as freshness source, files through `ServeFile`, the package-level serve policy with the public index's `Cache-Control` values as a ceiling the door narrows by visibility and credential, `HEAD` as the `GET` without its body; AC3 extended, a `serving_test.go` row shared with signing-service AC38); auth was-Q27 (the authentication layer's own responses `private, no-store`); management-api was-Q13 (no binding here but the token-mint route, stated), was-Q14 (the upload declares `{name}/{version}/{filename}` as its claim on the write transaction, checked at declaration and at commit; `Authorize` returns `format.Addressed`, the deleting kinds claiming every filename they retire, `withdraw` and `restore` nothing), was-Q15 (PyPI declares no unchanged publish), was-Q16 (the central `retired` refusal rendered as the duplicate refusal the corpus records, never the API's `409`), was-Q19 (a verifier failure answers `500` with nothing committed; no refusal is ever a `5xx` because twine retries those five times), was-Q20 (the bounded spool through `Deps`, `413` before a byte; AC9 extended with an `upload_spool_test.go` row), was-Q21 (the management operations' `/api/v1` responses `private, no-store`); proxy-cache was-Q19 (retained count zero, stated), was-Q21 (a remote's documents never evicted, the metadata-growth cost stated), was-Q24 (proxied `HEAD`), and its event-class table's coordinate-bound immutability violation, which this spec's removal table lacked (a cached filename re-advertised under a new digest is purged as the signal; AC11 extended); supply-chain was-Q11 (the advisory key is the stored coordinate because OSV keys PyPI on the PEP 503 normalised name, verified against the schema; the uploaded version spelling reported where it differs from the normalised form, the CRAN-shaped rule) and was-Q12 (hosted public names matched, `coordinate_exemptions` keyed on the normalised name; AC16 extended with an `advisory_key_test.go` row); harness was-Q7 and Q8 (nothing to change: AC13's pruning case is the integration half under its injected clock, the conformance halves cross no window). The management-surfaces re-read's item 12 applied (file-level `withdraw` is `delete` on the file, the table and the addressed-object paragraph aligned); the management-api closing sweep's optional "again at commit" wording applied through was-Q14. Verdicts on the three adoptions: Q1 confirmed, amended in its fold (the action-object alignment above); Q2 confirmed with its lift, the five producer requirements each found met in artifact-verification at HEAD; Q3 confirmed, amended in its fold (the claim rule and the wire rendering). Adversarial findings on the authoring: the stored attestation must never be advertised as a distribution file (now stated); uv reads a wheel's metadata through `Range` when no `.metadata` is advertised, so byte ranges on files are load-bearing (serve policy, AC17 extended); the token-mint binding's response carries a secret and no handler may write `Cache-Control`, so the shared binding layer must set `private, no-store` (AC19 extended, reported to credential-management); the `.metadata` route's object is the wheel's filename so one pattern admits both. The stale "now exists as a draft" precondition on management-api corrected (it is planned; Phase 2 waits on its Phase 1 core). Verified unchanged at HEAD: artifact-verification AC7, AC8, AC28; credential-management AC13, AC25; data-model AC33, AC35, AC46; repository-lifecycle AC12; catalogue AC2; proxy-cache AC13, AC20, AC32; supply-chain AC18, AC20, AC24; harness AC13, AC26; FHI AC7, AC8, AC12, AC13, AC14, AC15, AC17; npm AC14; deployment's `server.public_url` row. Constitution: no handler table, every new boundary held by a named enforcer in its owning spec, both paths on every new clause, nothing touching auth AC10. No em-dashes or en-dashes. No question raised or adopted. 20 criteria, each with a Test Plan row; zero open questions; `node scripts/check-spec.js` zero failures on this file, the only advisories being the two an uncommitted review carries until this row's commit lands. Sibling consequences reported to the orchestrator, not applied. draft -> planned. |
