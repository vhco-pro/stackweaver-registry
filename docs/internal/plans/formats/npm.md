---
status: planned
status_description: "Planned by the Fable gate review of 2026-10-08 at 4f929c7: full review of the Opus reconciliation and the original authoring, the file brought current with every queued foundation record (signing-service was-Q14, Q24, Q25; auth was-Q27; management-api was-Q13 to Q16 and Q20; proxy-cache was-Q19 to Q24 and the event-class rows; supply-chain was-Q11 and Q12; harness was-Q7 and Q8), the client half re-grounded in a 2026-10-08 capture of npm 11.17.0 that refuted several authored claims (the install Accept header, the absent quick-audit fallback and warning, the gzip audit body, ?write=true, the scoped publish basename, the client-side republish refusal) and the server half of the writes stated honestly as prior-art-grounded until the corpus records it against the public registry. Q5 raised and adopted under the standing delegation, owner-facing: the bulk advisory endpoint is rendered from supply-chain-policy's advisory reader in every mode, 404 only before the feed's npm source has a freshness value, nothing forwarded, superseding was-Q2 as that record scheduled. Found and fixed: the remote must re-host the pinned keys document for npm audit signatures to verify (AC22); the dist.tarball rewrite was asserted nowhere (AC2, AC6). AC24 (proxied metadata) and AC25 (the advisory key) added. Zero open questions; 25 criteria, each with a Test Plan row; check-spec zero failures. Phase 2 waits on management-api's Phase 1 core; the handler itself waits on the interface re-open and charter step 4b. Earlier: reconciled 2026-09-28 at a6d72b3 with the foundation wave (not a review): retirement is data-model's core-held Retirement record (management-api was-Q3), refused centrally; unpublish and deprecation are the delete-version, delete-package and annotate kinds on the handler's Operator with the client routes as bindings (AC17); proxied dist.signatures and dist.attestations verified and re-hosted, hosted _attestations verified before commit (AC22, sharing artifact-verification AC20); hosted registry signatures reserved for signing-service's ECDSA P-256 profile; Capabilities with Virtual and Rename and the rename case (AC23); WriteRefusal and the pending binding-table row filled by AC20's capture; the base URL cited to the interface re-open input. Earlier: reconciled 2026-09-26 at da0aecd (AC14 reworded, AC19-AC21 added); Q2-Q4 adopted 2026-09-26 at 4d1aeb1 under the owner's standing delegation. Zero open questions; 23 criteria, each with a Test Plan row; stays draft pending a gate review, with Phase 2 waiting on management-api.md reaching planned."
description: "Spec for the npm registry format, where the caching proxy of the public registry is the primary use case rather than private publishing."
author: michielvha
goal: "Deliver the most-wanted upstream cache in real deployments, and be the first format where the proxy path is the point."
priority: "medium"
issue: 8
created: 2026-09-21
covers:
  - "internal/format/npm/**"
---

# Plan: npm registry format

The npm registry protocol, hosted and proxied, with the caching proxy of the public registry as
the primary use case and the packument as the project's first genuinely mutable metadata
document.

## Context

npm is where the proxy layer earns its keep. The dominant real-world deployment of an artifact
repository in front of npm is not private publishing, it is a cache: build reliability when the
public registry has a bad day, egress cost, and supply-chain control over what enters a build.

This is therefore the first format where the **proxied path matters more than the hosted path**,
and the first real test of the cache policy design in `proxy-cache.md`.

It is also the first format with a genuinely mutable metadata document. The packument changes
every time anyone publishes, which makes it the proving ground for TTLs, conditional
revalidation and negative caching.

One count-integrity note: the catalogue's npm family row claims client reach across npm, Yarn,
pnpm and Bun, and the catalogue's resolved client-reach decision (was Q5, its AC2) makes each of
those a claim to be proven against this one handler on both paths, never an illustration. The
npm CLI is this spec's primary oracle (AC1 onward), and AC21 carries the other three, so the
advertised reach can equal the tested one.

## Blocking preconditions

**The handler interface re-open must complete before npm implementation starts.**
`format-handler-interface.md` pins a minimal method set before either implementation exists, on
the explicit understanding that it will be wrong about something and is re-opened once OCI passes
its conformance suite. That re-open gate blocks all Tier 1 handler work, and npm is the first of
it. The re-open's evidence set was widened by that spec's resolved evidence-set decision (was
Q9) to include the pattern-scope and policy-hook outcomes of `auth.md` and
`supply-chain-policy.md`, which is also why `Scope(r)` now reports an addressed object; the gate
itself is unchanged and npm waits behind it.

The gate is recorded here as well as there deliberately: a contract enforced on only one side is
enforced nowhere, and npm is also the measurement baseline for the experiment's headline metric.
An interface revision landing mid-npm would contaminate exactly the number the whole project
exists to produce.

**The charter's cost-attribution question must be answered before npm starts.** npm is
the baseline the N+1 comparison is measured against, and a baseline collected under an undefined
procedure is not a baseline; the obligation is stated in `foundation/question-triage.md` and
recorded here from this side for the same one-sided-contract reason as the re-open gate. The
charter answered it on 2026-09-26 (its "Measuring per-format cost"), so this precondition is
discharged on paper and holds in practice through AC14, the criterion that makes the baseline
this spec's deliverable rather than an intention.

**Artifact verification and supply-chain policy precede this handler.** The charter builds both
at step 4b, before npm, so that every format from npm onward enforces policy on both paths from
its first commit, and its AC12 forbids npm's handler reaching `main` before they meet their own
criteria. This spec therefore renders the typed policy refusal from Phase 1 (Design, "Policy
refusals on the wire") rather than retrofitting it.

**The management API must reach `planned` before Phase 2.** Unpublish and deprecation are
registry-owned management operations that this format's client routes bind onto (Design, "The
management surface"). Their shared shape, authorization and write accounting are
`docs/internal/plans/foundation/management-api.md`'s, which carries npm's operations on its kind
vocabulary and its cross-format reconciliation table and is `planned` (its Fable recheck of
2026-09-30 and the follow-ups since); Phase 2 waits on its Phase 1 core (charter step 2). Phases
1, 3 and 4 do not.

## Scope

**In scope:** packument assembly with content negotiation (full and abbreviated), tarball
serving, scoped packages, publish (including refusing a republish of an existing version),
dist-tags (list, add, move, delete), unpublish and deprecation as bindings onto registry-owned
management operations (authorization-only, with every unpublished version retired), the bulk
advisory endpoint the client sends its dependency tree to during every default install,
answered from `supply-chain-policy.md`'s advisory reader in the public registry's shape and
never forwarded (Design, "Audit requests"; the resolved audit-answer decision, was Q5),
bearer-token presentation per `foundation/auth.md`, the per-route addressed objects its pattern
scopes evaluate, the wire rendering of a shared policy refusal, every read served through
`signing-service.md`'s serving door (`ServeRendered` for the packument, `ServeFile` for the
tarball; a `HEAD` answered as the `GET` without its body), the publish body spooled under the
one bound and claiming its coordinate on the write transaction, the advisory key reported on
both paths, the catalogue's named npm-family clients (Yarn, pnpm and Bun), the proxied path
against the public registry including detection of npm's explicit security signal and its rows
of the shared event-class table, and this format's half of `artifact-verification.md`'s npm
entries: proxied `dist.signatures` verified against the upstream keys document pinned at remote
configuration and that document re-hosted at `/-/npm/v1/keys` on the remote, `dist.attestations`
verified and re-hosted, hosted `_attestations` verified before commit (Design, "Signatures and
attestations"; AC22).

**Out of scope for v1**, each with its reason, and recorded here because the interface spec's
definition of done requires the deliberately unimplemented surface to be named:

- **The quick-audit endpoint and the full `npm audit` report shape.** The bulk advisory
  endpoint is in scope (above) because it is what every pinned client sends; the legacy
  `POST /-/npm/v1/security/audits/quick` is the client's documented fallback, which npm 11.17.0
  did not send on a bulk 404 in the 2026-10-08 capture, and its report shape (a full tree
  report rather than a per-name advisory list) has no consumer this registry has observed. It
  is answered an honest 404 (Design, "Audit requests") and joins the surface if a pinned client
  is captured sending it.
- **Hosted registry signatures.** `dist.signatures` on hosted packuments and a hosted
  `/-/npm/v1/keys` document would be this registry signing with its own key, which is
  `signing-service.md`'s ECDSA P-256 profile and keys document, reserved there for the day this
  spec adopts it (its Phase 5, "reserved producers"). Until then a hosted packument carries no
  `dist.signatures`, `npm audit signatures` reports the hosted package as unsigned, and a hosted
  repository answers the keys route 404. Verification of the public registry's signatures on the
  proxied path is in scope, and so is re-hosting the pinned upstream keys document on a remote
  (above), since `npm audit signatures` verifies against the keys of the registry it talks to and
  would otherwise report every proxied package as signed by an unknown key; producing our own is
  not, because no client refuses an unsigned hosted package and a second signing profile before
  the first consumer is exactly what that spec's reservation exists to prevent.
- **Search (`/-/v1/search`).** The endpoint shape is trivial but the ranking inputs (quality,
  popularity, maintenance scores) have no conformance oracle and no data source in this system;
  a stub that returns results without them would be a different product claim. Follow-on spec.
- **Organisation and team semantics mirroring npm's own.** Entangled with the user-management
  surface `foundation/auth.md` deliberately outsources to the identity provider. Follow-on spec.
- **Interactive login flows** (the couchdb-style user PUT and the `POST /-/v1/login` web flow).
  Conformance provisions tokens out of band (Design, "Conformance, auth and the corpus"), and a
  human-facing login surface is UI-era work.

## Design

### The wire surface

Grounding: the **client half** of every row below was captured on 2026-10-08 from npm 11.17.0
driven through a logging proxy that forwarded reads to the public registry and answered every
write and `POST` with 404 (`npm install`, `npm ci`, `npm audit`, `npm view` of a scoped name,
`npm unpublish` in both shapes, `npm deprecate`, `npm dist-tag add` and `rm`, `npm ping`, `npm
whoami`, `npm publish` of a throwaway scoped package), together with the public registry's own
answers to the packument under both `Accept` values, the bulk advisory `POST`, the keys route and
a security-holding packument. The **server half of the writes** (what the public registry
answers a publish, a republish, an unpublish, a deprecation and a dist-tag change) is still
grounded in the published contract (the `npm/registry` docs describe reads and search only) and
prior-art implementations, until the corpus records it (Design, "Conformance, auth and the
corpus"); the corpus wins any disagreement with either half.

| Surface | Shape (captured unless marked) |
|---|---|
| Packument | `GET /{name}`; full or abbreviated by content negotiation (below). Before a write the client reads it as `GET /{name}?write=true`, the public registry's cache-bypass query, which this registry accepts and ignores |
| Version manifest | `GET /{name}/{version}` (published contract; no pinned client was captured sending it) |
| Tarball | `GET /{name}/-/{basename}-{version}.tgz`; for `@scope/name` the basename omits the scope (`/@types/node/-/node-26.6.4.tgz` as the public registry serves it), even though the client's own publish body names the attachment `@scope/name-{version}.tgz` |
| Publish | `PUT /{name}`, after two packument reads (abbreviated, then full) through which the client refuses an existing version itself; JSON body carrying `_id`, `name`, `dist-tags`, `versions` (one entry, with `dist.integrity`, `dist.shasum` and a `dist.tarball` the client guesses), `access`, and the base64 tarball under `_attachments` |
| dist-tags | `GET /-/package/{name}/dist-tags`; `PUT /-/package/{name}/dist-tags/{tag}` with the version as a JSON string body; `DELETE /-/package/{name}/dist-tags/{tag}`, sent only for a tag the preceding `GET` listed |
| Unpublish a version | `GET /{name}?write=true` (twice), `PUT /{name}/-rev/{rev}` with the version removed and `dist-tags.latest` recomputed by the client, then `DELETE /{name}/-/{basename}-{version}.tgz/-rev/{rev}` (published contract; not sent after a failed `PUT`) |
| Unpublish a package | `GET /{name}?write=true` (twice), `DELETE /{name}/-rev/{rev}` |
| Deprecate | `GET /{name}?write=true`, then `PUT /{name}` on the publish route with the whole packument, the version's `deprecated` set, no attachments; the `npm-command: deprecate` header and the absent `_attachments` distinguish it from a publish |
| Liveness and identity | `GET /-/ping`, `GET /-/whoami` |
| Audit | `POST /-/npm/v1/security/advisories/bulk` with a **gzip-encoded** JSON body (`Content-Encoding: gzip`) mapping each name to its versions, sent by `npm install`, `npm ci` and `npm audit`; answered from the advisory reader (Design, "Audit requests"). `POST /-/npm/v1/security/audits/quick` is the client's documented fallback, not sent by 11.17.0 on a bulk 404; answered 404 |
| Keys and attestations | `GET /-/npm/v1/keys`; `GET /-/npm/v1/attestations/{name}@{version}` (Design, "Signatures and attestations") |

### Packument assembly and content negotiation

Which document a client asks for depends on the command and the client, not on the format:
in the 2026-10-08 capture npm 11.17.0's `npm install <name>` requested the packument with a
plain `Accept: application/json` (the full document), `npm install <name>@<tag>`, `npm publish`
and `npm unpublish` first sent the weighted header `application/vnd.npm.install-v1+json; q=1.0,
application/json; q=0.8, */*` and then asked again for the full document, and `npm ci` read no
packument at all (tarballs and the audit `POST` only). The public registry answers the weighted
header with `Content-Type: application/vnd.npm.install-v1+json` and the plain one with
`application/json`, and the client detects which it got from that content type, so the handler
negotiates on whatever arrives and never assumes one. The abbreviated ("corgi") document carries
exactly `name`, `dist-tags`, `versions` and `modified`, and per version the install-relevant
fields (the dependency sets, `bin`, `dist`, `engines`, `os`, `cpu`, `deprecated`,
`hasInstallScript` and friends); the full document is everything, and for popular packages it is
the difference between kilobytes and megabytes (8 KiB against 22 KiB for a ten-version package
in the capture). On the hosted path both are assembled from the same stored state, never stored
as documents of record.

**Every read goes through the serving door.** The hosted packument, in either variant, is
served through the lazy form of `ServeRendered`, the door `signing-service.md` provides through
`Documents` in `Deps` (its resolved handler-rendered decision, was Q14, which names this format;
`format-handler-interface.md` AC17): the handler passes a renderer and a validator identity made
of the package's document identity, the serving snapshot's identity, the negotiated variant and
the externally visible base URL, with the serving pointer as the freshness source, and the
runtime derives the strong `ETag` and `Last-Modified` from that identity and the pointer's
`moved_at` without rendering, so a `304` costs no render, a repoint (promotion or rollback)
changes the `ETag`, and no code in `internal/format/npm` sets a validator, sets `Cache-Control`
or reads a conditional header (that spec's AC11 and AC32). The version manifest is the same form
over the version's document. The tarball is `ServeFile` over the version's `File`, whose strong
`ETag` is the CAS digest. The door answers a `HEAD` on every one of these routes as the `GET`
with the body withheld, `Content-Length` included, rendering the packument for it (its resolved
`HEAD` decision, was Q24); npm never sends one and `curl -I` does. The handler's **serve policy**
is a package-level constant: pointer `Last-Modified` and `ETag` under the `exact` conditional
rule for the packument and the manifest, `ETag` only for the tarball, `gzip` offered on the two
documents, byte ranges on the tarball, and a `Cache-Control` of `public, max-age=300` on the
packument (the public registry's own value, captured) and `public, max-age=31536000, immutable`
on the tarball. Those values are a ceiling: the door serves them as declared only to an
anonymous reader of an anonymously readable repository and narrows every other response to
`private` (`signing-service.md`'s resolved cacheability decision, was Q25, and `auth.md`'s
was Q27 for the refusals the authentication layer writes), which is what makes a private
repository's packuments safe behind a shared cache without this handler knowing one exists.

The mapping onto the shared model uses exactly the levels `data-model.md` provides: dist-tags
live in the package-level metadata document (the level that spec names npm as the reason for),
each version's manifest is that version's metadata document, and the tarball is a `File` whose
`Blob` is keyed by digest; npm's integrity and shasum values are metadata, never storage
keys (`storage-and-gc.md`). The packument's `_rev` surfaces the model's optimistic revision
token, and every read-modify-write flow (dist-tag moves, deprecation, unpublish) retries with
backoff on a stale-revision rejection, which the model's settled concurrency rule makes
mandatory rather than polite.

`dist.tarball` URLs are absolute, in the upstream's packuments and in ours. Every packument this
registry serves, hosted and proxied alike, carries tarball URLs pointing at this registry, which
is the format-specific transform `format-handler-interface.md` names as the canonical proxied
example, and it requires the handler to know the externally visible base URL rather than the
bind address. The pin carries no such value today; that spec records npm's need, beside
Vagrant's, as an input to its scheduled re-open ("Route-scoped and URL-borne credential
declarations", the smaller requests riding it), and until the re-open answers, the handler takes
the base URL from `server.public_url` through `Deps` (`deployment.md`), the same value
`upstream-adapters.md` computes its User-Agent from.

### Scoped names and the encoded slash

The client requests a scoped packument as `GET /@scope%2fname`, percent-encoding the slash
(captured for `npm view`, and `PUT /@swcap%2fprobe` for a scoped publish), while tarball paths
carry literal slashes. A router that reads the decoded path cannot tell `@scope%2fname` from a
two-segment path, so the handler routes on the escaped path. Conformance with the real client
is what polices this (AC3), because the encoded form is what the client actually sends and no
hand-written unit fixture is trusted to reproduce it. One more trap from the publish capture: the
client's own body names the attachment `@scope/name-1.0.0.tgz` and guesses a `dist.tarball`
of `{registry}/@scope/name/-/@scope/name-1.0.0.tgz`, with the scope in the basename, while the
public registry serves the tarball at `/@scope/name/-/name-1.0.0.tgz`. The handler derives the
canonical tarball URL itself and never stores or serves the client's guess, which is also why
every `dist.tarball` this registry serves is rewritten (below).

### What counts as a write

`data-model.md` requires each format spec to declare its ecosystem's write boundaries, and makes
metadata-only mutations snapshot-creating writes (its AC13 already presupposes a visible
dist-tag move). npm's declaration:

- A publish `PUT` is **one** completed logical write, even though it carries a version, its
  files and a dist-tag update in one body. The body is read through the bounded spool `Deps`
  hands the handler, under `management.publish_spool_limit` (`management-api.md`'s resolved
  spool-bound decision, was Q20; its AC36): a declared `Content-Length` above the bound is
  refused `413` before a byte is spooled, a body that outgrows it undeclared is cut and refused
  with nothing kept, and only a spooled body is parsed, after authorization (the object comes
  from the URL, "Addressed objects and pattern scopes"). As soon as the parse yields the
  version, the handler **declares `name@version` as the write's claim** on the transaction it
  opened through `Deps`, which checks it against the core-held `Retirement` records at
  declaration and again at commit under the repository's head lock (that spec's resolved
  claim decision, was Q14; `data-model.md` AC35), so a retired coordinate is refused before the
  tarball is decoded and a deletion committed between the two checks cannot let it through.
  An identical republish is refused like any other (AC13): npm is not a declarer of that spec's
  unchanged-publish exception (was Q15), because the client refuses it itself and the public
  registry refuses it on every version, so there is no keyless CI retry to admit.
- Each dist-tag `PUT` or `DELETE` is one write.
- The unpublish packument `PUT` at `-rev` is one write, and the core writes a `Retirement`
  record for the removed `name@version` in that same transaction (below); the `dist-tags`
  the body carries (the client recomputes `latest` to the highest remaining version, captured)
  are applied in the same write. The tarball `DELETE` that follows it in the client's flow,
  sent only after a successful `PUT`, is a second write only if it changes head content, which
  after the `PUT` it normally does not.
- A whole-package `DELETE` is one write, retiring every version it removes.
- A deprecation, or its reversal with an empty message, is one metadata-only write.

A proxied repository creates no snapshots at all, per the model's settled rule; packument
arrival and revalidation are cache materialisation.

Two protocol behaviours ride on this section. Republishing an existing version is refused, as
the public registry refuses it; a registry that accepts it silently rewrites history that
lockfiles already pin. **Republishing an unpublished version is refused the same way**, as the
public registry also refuses it: the `integrity` a lockfile pins and the tarball this registry's
own proxy layer caches forever both bind bytes to `name@version`, so unpublishing ends a
version's life without freeing its coordinate. The retired coordinate is a **core-held
`Retirement` record**, not part of the package-level document: `management-api.md` ("Retirement
is core-held", its resolved retirement-placement decision, was Q3) moved the set out of snapshot
content, and `data-model.md` owns the record (its entity table and AC35). The handler returns
`name@version` as the coordinate to retire in the operation's `Outcome`, the core writes the
record in the retiring transaction, and the shared write path refuses any later write claiming
that coordinate as `retired`, at the claim's declaration and again at commit, across a
backwards repoint and after every snapshot that held the version has been pruned, with nothing
for this handler to carry forward or remember. The decision is central and the rendering is
this wire's (`management-api.md`'s resolved wire-rendering decision, was Q16): on the publish
route the refusal is rendered exactly as AC13's republish refusal, the status and `error` body
the corpus records the public registry answering a publish over an existing version, so a
client sees one refusal for the two cases the public registry also treats as one; on the
`-rev` bindings a central refusal keeps the API's status with npm's `error` body. A package whose every version is gone keeps its `Package` row and
package-level document (for its dist-tags; `data-model.md` AC33) and is served as absent while
its retired versions stay refused. The package name itself is not retired: a new version under
it publishes normally. And the unpublish routes carry a trap, confirmed in the 2026-10-08
capture for both shapes: against a server that answered the `-rev` `PUT` and the `-rev`
`DELETE` with 404, npm 11.17.0 printed `- left-pad@1.3.0` and `- left-pad` and exited 0, so an
unrouted unpublish surface is a silent no-op with a green exit code. AC9's case therefore
asserts through the transcript and a subsequent failed install, never through the client's
exit code alone.

### The management surface

A management operation has a **trigger** (the call that changes state) and an **effect** (what a
resolving client then sees), and the oracle's reach over them differs
(`docs/internal/analysis/management-surfaces-and-the-oracle.md`). npm is the one Cluster 5 format
where both are client-driven: `npm unpublish` and `npm deprecate` exist, so the real client
oracles the trigger as well as the effect, and the one weakness is the exit-code trap above.

This spec follows the precedent shared by the Cluster 5 format specs (`pypi.md`,
`ansible-collections.md` and this one), whose common home is
`docs/internal/plans/foundation/management-api.md`, which now fixes the vocabulary:

- **Each operation is a registry-owned management operation**, exposed through that one
  management API as a **kind** of its closed vocabulary, and the action follows the kind, never
  the format (its kind table and cross-format reconciliation table, which carry npm's rows).
  The handler implements that spec's `Operator` interface, declaring `delete-version`,
  `delete-package` and `annotate`, reporting the object of each through `Authorize`, and applying
  it inside the write transaction the core opened through `Apply`. npm's own client routes (the
  `-rev` unpublish routes and the deprecate `PUT`) are served as **bindings onto the same
  operations**, translating the wire into `Submit` and the outcome back, with identical
  semantics, authorization and write accounting, because the client drives them and a registry
  npm users cannot unpublish from with `npm unpublish` is not an npm registry. There is one
  operation and two ways in, never two implementations. **A binding is never wider than its
  operation** (that spec's resolved binding-scope decision, was Q13): the `-rev` `PUT` route
  reports `{name}` as a **declared route-level object**, because the version it removes is in
  the body and the body is not read before authorization, while the `delete-version` it
  submits reports `{name}/{version}` through `Authorize`, and `Submit` evaluates that pair on
  the binding exactly as on the API; the binding is therefore stricter, in that a credential
  patterned to the version alone (`@acme/tool/1.0.0`) can unpublish through the management
  endpoint but not through `npm unpublish`, which needs `@acme/tool` as well. The deprecate
  `PUT` reports `{name}`, which is `annotate`'s own object, and the `-rev` `DELETE` reports
  `{name}`, which is `delete-package`'s.
- **Each operation is a completed logical write through the shared write path**: exactly one
  snapshot per operation as declared above, none for a refused one, and no blob-store object
  deleted directly, so space returns only through retention pruning and the single-deleter
  boundary in `storage-and-gc.md` holds unchanged.
- **Authorization is the only gate, in the settled `(repository, action)` vocabulary with no
  new action.** Unpublish is removal-class and requires `delete`; deprecation is a metadata
  change and requires `push`. The public registry's restrictions (its unpublish time window and
  its refusal when other packages depend on the version) are **not** enforced: they encode
  public-commons policy that is meaningless against this registry's data, and an operator
  blocked from removing their own content will not accept the answer. The divergence goes on
  the recorded exception list.
- **Hosted only.** A proxied repository creates no snapshots and takes its removals from the
  upstream per the settled removal table, so unpublish or deprecate against one is refused.
- **Verification.** The trigger is verified twice: by this registry's integration tests against
  the management endpoint, and by the real client through the bindings. The effect is verified
  by a real `npm install` in a conformance case.

| Operation | Kind (`management-api.md`) | Client binding | Effect a client sees | Action |
|---|---|---|---|---|
| Unpublish a version | `delete-version` | `npm unpublish name@version` (`-rev` `PUT`, then tarball `DELETE`) | The version leaves the packument and no longer installs; its coordinate `name@version` is retired | `delete` on `{name}/{version}` |
| Unpublish a package | `delete-package` | `npm unpublish name --force` (`-rev` `DELETE`) | The name no longer resolves; every removed version is retired; the `Package` row survives | `delete` on `{name}` |
| Deprecate or undeprecate a version | `annotate` | `npm deprecate` (the publish-route `PUT` without attachments) | Install prints the served message, or stops printing it | `push` on `{name}` |

### Audit requests

`npm install`, `npm ci` and `npm audit` each `POST` the whole dependency tree to the bulk
advisory endpoint, as a gzip-encoded JSON object mapping each name to the versions in the tree
(captured; the handler decodes the body before reading it). The public registry answers an
object mapping each name with advisories to a list of `{id, url, title, severity,
vulnerable_versions, cwe, cvss}` records (captured for `lodash@4.17.15`: GitHub Advisory
Database records with their GHSA URLs) and omits names with none.

This registry answers the bulk endpoint **from `supply-chain-policy.md`'s advisory reader**, for
the repository served and under its `coordinate_exemptions`, in that captured shape, in every
repository mode, and forwards nothing anywhere (the resolved audit-answer decision, was Q5,
which makes the revision was Q2 scheduled). For every name the client lists, the reader is asked
for each listed version, and a name is rendered only when a coordinate-matched record stands
against at least one of its versions: `url` and `title` are the record's, `severity` and `cvss`
are rendered from the record's severity fields where present, `vulnerable_versions` is the
record's affected range in npm's range syntax where the feed carries one and otherwise the
listed versions the reader condemned, and `id` is a stable integer derived from the record's
identifier, since the client keys its own report on it and prints the `url`. The feed's npm
data is the GitHub Advisory Database through OSV, the same source behind the public registry's
answer, so what `npm audit` prints against this registry is what this registry computed, from
the data it holds, under the operator's exemptions. A `remote` answers the same way: the
request carries the whole tree, private names from other repositories included, which is why
forwarding it was refused and stays refused.

**Before the feed's npm source has ever completed a sync or an import** (no freshness value in
`supply-chain-policy.md`'s terms, its resolved freshness decision, was Q13) the endpoint answers
**404**, as it did under was Q2, so a reader with no data never prints the all-clear this
registry could not have computed; under a stale source the reader answers from the last sync,
the operator holding the `AdvisoryFeedDegraded` alert. In the 2026-10-08 capture npm 11.17.0
printed nothing at all on the 404 during `npm install` and `npm ci` and exited 0, and `npm audit`
printed `audit endpoint returned an error` and exited 1, with no fallback to the quick-audit
endpoint in either case; the quick-audit endpoint stays answered 404 (Scope). The public corpus
contains a real advisory exchange whose `id` values and record set are the public registry's, so
the audit exchange is normalised out of replay and the divergence sits on the recorded exception
list; AC18 proves the answer against a controlled advisory instead.

### The proxied path

The handler owns the request and classifies for the proxy layer's fetch-and-cache API per the
settled decisions in `proxy-cache.md`:

- The packument is **mutable metadata with a TTL**, and **each negotiated variant is its own
  cached document** of the remote at the package level, keyed by the content type the upstream
  answered: the abbreviated document is what installs ask for and the full one is megabytes for
  a popular name, so a miss fetches what the client asked for rather than the full document to
  derive the other from. Revalidation uses the upstream's conditional-request support (the
  public registry serves `ETag` and `Last-Modified` on both variants, captured) so an unchanged
  packument costs a 304, not megabytes. The cached body is served through `ServeRendered`'s lazy
  form with the remote's cache-scoped record as the freshness source and the base URL as a
  serve-time input, the render being the URL rewrite below, so the served `Last-Modified` is the
  cache's and never the upstream's (`proxy-cache.md` AC22). Both variants are current documents
  of the remote: never LRU-evicted, outside the quota and counted in
  `cache_metadata_bytes{repository}` (that spec's resolved metadata-eviction decision, was Q21,
  its AC29), which on a busy remote is gigabytes over its life and is the cost that decision
  priced. The handler declares a retained-revision count of **zero** (its was Q19 and was Q22):
  no route reads a superseded packument, and nothing on this path is kept alive by mention
  alone, since the tarballs a packument names are cached files under their own references and
  its `integrity` values are metadata (the data-loss audit every format spec owes). An
  adoption runs under anchor class `none` with the document's verdict `absent`: the packument
  itself is unsigned, and the per-entry `dist.signatures` verdicts below are per-version
  records, not the document's anchor, so its was Q23 has nothing to compare. The packument's
  `modified` field is the ordering value: an upstream answer whose `modified` is earlier than
  the adopted revision's is a regression not adopted (the shared table's row). `?write=true` on a
  remote is accepted and ignored.
- Tarballs are **immutable artifacts**: cached indefinitely, fetched stream-and-verify against
  the `integrity` (sha512) of the packument this registry served, with `shasum` as the legacy
  fallback, never committed to the CAS on a mismatch or a truncated body, and served through
  `ServeFile`. The fetch-and-cache request carries the advisory key (below), so a condemned
  version is refused before any upstream request (`supply-chain-policy.md` AC24).
- Missing names are **negatively cached** with the short TTL; a typo'd dependency in a busy CI
  fleet is the motivating case in that spec, and it is npm-shaped.
- A `HEAD` on any proxied route is the `GET` with its body withheld, cache-filling and never
  forwarded (that spec's resolved `HEAD` decision, was Q24, AC32).
- The remote's `/-/npm/v1/keys` serves the upstream keys document pinned at remote
  configuration, verbatim, as a cached repository-level document (Design, "Signatures and
  attestations").
- Docker-Hub-style authentication and throttling quirks of the public registry belong to its
  upstream adapter, not to this handler.

**The advisory key** is the package name as the ecosystem spells it, scope included, and the
version string, reported in the metadata-store write that records a package or version on the
hosted path and on the fetch-and-cache request on the proxied path (`supply-chain-policy.md`'s
resolved advisory-key decision, was Q11, AC24; its coverage row for npm). A hosted repository
matches public coordinates (its was Q12, AC25): a private package that shares a public name
inherits the public package's advisories until the operator exempts the name through the
policy's `coordinate_exemptions`, which is the dependency-confusion shape npm is best known for
and the reason over-refusal is the safe error.

Upstream removal maps onto the settled purge-or-flag table as npm's side of that contract:

| Upstream event, as observed at revalidation | Classification |
|---|---|
| The packument's versions replaced by a security-holding placeholder (the `0.0.1-security` shape, the "security holding package" description) | The **explicit security signal**: from that moment every resolution of the named coordinates is refused with an error naming the signal and no upstream fetch of them is made, the cached references end (the purge), a refusal record is written and the operator is alerted once, per the shared security-signal rule stated verbatim in `proxy-cache.md` and `supply-chain-policy.md` |
| Versions vanishing without that shape (author unpublish), or a packument answering 404 or 410 where it existed | **Removal with no signal**: keep serving, record an operator-visible divergence, alert once |
| The `integrity` or `shasum` of an already-cached `name@version` changing in the packument, or a re-fetched tarball disagreeing with the `integrity` this registry served | **Immutability violation, coordinate-bound**, treated as the explicit signal (purge and alert; the next request re-fetches and verifies on demand), because every client verifies the tarball against the `integrity` its lockfile or packument declares, so the old bytes would fail every consumer |
| A tarball failing its `integrity`, a truncated body, a `dist.signatures` entry failing against the pinned keys | **Integrity failure at fetch**: nothing committed, no negative entry, the cached copy keeps serving within the stale-if-error limit, the operator alerted with the reason, the next request tries again |
| A packument whose `modified` is earlier than the adopted revision's | **Regression not adopted**: the cached revision stands, a divergence is recorded, the operator's refresh is the cure |
| A `deprecated` field appearing on versions, `dist-tags` moving, a new version | An ordinary metadata change, propagated at the next revalidation; never a removal event |

Detection happens at revalidation only: per `proxy-cache.md`'s resolved answer (was Q12) the
proxy layer never polls an upstream, and the active channel is `supply-chain-policy.md`'s
advisory feed, whose malware advisories condemn the same coordinates through the same rule, so
a holding package observed here and an OSV `MAL-` entry for it are one condemnation, never two
purges. The holding-package shape is a heuristic against an unversioned upstream
convention, which is one more reason the corpus and the drift job re-ground it rather than this
table being trusted forever.

One assertion trap: npm keeps a client-side cache, so a second install that never contacts the
registry proves nothing about ours. AC6's case asserts both directions: the second install
reached this registry (transcript) and this registry did not contact the upstream (network
layer), with fresh client cache state as part of the case setup.

### Addressed objects and pattern scopes

`auth.md`'s pattern scopes narrow a credential within one repository by matching the object each
request addresses, and the format declares which object each route reports ("Pattern scopes"
there; `format-handler-interface.md` AC12). npm's declaration, with a scoped name's slash taken
literally, so `@scope/name` is two segments:

| Route | Object kind | Canonical object |
|---|---|---|
| Packument, `GET /{name}` | named | `{name}` |
| Version manifest, `GET /{name}/{version}` | named | `{name}/{version}` |
| Tarball, `GET /{name}/-/{basename}-{version}.tgz` | named | `{name}/{version}`, the version read from the filename after the known `{basename}-` prefix |
| Publish and deprecate, `PUT /{name}` | named | `{name}`, from the URL; the body is not parsed before authorization |
| dist-tags list, add, move and delete | named | `{name}` |
| Unpublish a version: the `-rev` `PUT` | named | `{name}`, a declared route-level object; the `delete-version` it submits also evaluates `{name}/{version}` (Design, "The management surface") |
| Unpublish a version: the tarball `DELETE` | named | `{name}/{version}` |
| Unpublish a package, `DELETE /{name}/-rev/{rev}` | named | `{name}` |
| `GET /-/npm/v1/attestations/{name}@{version}` | named | `{name}/{version}` |
| `GET /-/npm/v1/keys` | descriptor | the repository-wide keys document names no package (`auth.md`'s resolved descriptor decision, was Q23) |
| `GET /-/ping`, `GET /-/whoami` | none | - |
| Both audit endpoints | none | - |

Consequences, applying `auth.md`'s rules rather than re-deciding them:

- There is no implicit wildcard, so a credential for one scope is written `@acme/**`, which
  admits both the packument (`@acme/tool`) and the tarball (`@acme/tool/1.0.0`); `@acme/*`
  admits the packument and refuses the tarball, so it installs nothing. An unscoped package is
  covered by `{name}/**`.
- Publishing, deprecation and dist-tag moves are narrowed per package, never per version,
  because their object comes from the URL: reading the publish body before authorizing it would
  spool an unauthorized upload.
- `npm ping`, `npm whoami` and the audit requests address nothing in the repository and are
  refused to a patterned credential, so under one the bulk endpoint renders no advisories. A
  default install still succeeds under one: npm 11.17.0 printed nothing on a refused bulk
  request during install (Design, "Audit requests"); AC19 asserts that for each pinned client
  rather than assuming it.

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines, the
handler answers `403` with the JSON error body this format uses for its other refusals, its
`error` member naming the policy and rule, or naming the signal for a coordinate condemned
under the shared security-signal rule. `403` rather than the existence rule's `404`, because the
caller is authorized and the content is what is refused. The same rendering serves the hosted
and the proxied path, and the shape follows OCI's first rendering (`oci.md`, "Policy refusals on
the wire"); whether the real client prints the text is what AC20's case proves, and its capture
re-grounds the body shape. The handler writes the refusal through the shared writer
`WriteRefusal` in `internal/format` (`format-handler-interface.md` AC14), which carries
`supply-chain-policy.md`'s status-line phrase on HTTP/1.1 (its resolved status-line decision,
was Q10, and AC18) while the `403` and the JSON body stay this format's. That spec's table "When
a refusal binds, per format" carries npm as `pending` until AC20's case captures what npm does
after a refusal (whether it falls back to another configured registry or stops), replaces the
row in the same change (its AC20), and the harness refuses to run the policy case before then
(`conformance-harness.md` AC26).

### Signatures and attestations

The public registry signs every packument entry (`dist.signatures[]`, `keyid` and `sig` over
`name@version:integrity`) and publishes provenance for packages built with `npm publish
--provenance` (`dist.attestations`). Verifying either is `artifact-verification.md`'s ("Per-format
positions", npm; its `npm-keys` and `sigstore` entries), reached through the `Verifier` consumer
interface in `Deps`; this handler's half is where the material sits on the wire and what is
served:

- **Proxied.** `dist.signatures` are verified by `keyid` against the upstream keys document
  pinned at remote configuration, as a `repository-chain` verdict, and that pinned document is
  **re-hosted verbatim at `/-/npm/v1/keys`** on the remote, because `npm audit signatures`
  verifies every `dist.signatures` entry against the keys of the registry it is talking to and
  would otherwise report every proxied package as signed by an unknown key. The public
  registry's document carries an `expires` per key and lists a key expired on 2025-01-29 beside
  the current one (captured), so the pin is the whole document as fetched: signatures made
  before a key's expiry stay valid, and the client applies the expiry itself. A virtual with
  remote members serves the union of its members' pinned documents, `keyid` being unique.
  `dist.attestations` are fetched with the tarball, verified, cached as content and
  **re-hosted** at `/-/npm/v1/attestations/{name}@{version}` on this registry, with the served
  packument's `dist.attestations.url` pointing there, never at the upstream. An attestation that fails is
  not served and the version's verdict is `failed`; a package without one serves none with the
  verdict `absent`. The rule is that spec's "Provenance the registry vouches for" (its resolved
  provenance decision, was Q7): passing an upstream provenance URL through would tell the
  client this index vouches for material it never saw.
- **Hosted.** A publish carrying `_attestations` is verified before commit against the
  repository's identity policy and refused on `failed` with nothing committed; a verified
  attestation is stored as a file of the version and served under the same
  `/-/npm/v1/attestations/` route; a publish without attestations commits with the verdict
  `absent`. Hosted `dist.signatures` and `/-/npm/v1/keys` are not produced (Scope).

The real client that oracles this is `npm audit signatures`, which verifies both against the
registry's keys document and reports per package; AC22 is this format's half of
`artifact-verification.md` AC20 and shares its case.

### Capabilities and lifecycle

`Capabilities()` declares proxy support `supported`, reference-implementation availability
`available`, `Virtual: supported` and `Rename: supported` (`format-handler-interface.md` AC13).
A virtual npm repository resolves a name in its first member that holds it, which is the
dependency-confusion-closing order every format spec adopts. `repository-lifecycle.md` AC12
requires `conformance/npm/rename_test.go`, enforced by the harness's case-set validator
(`conformance-harness.md` AC26); AC23 carries it, with a real `npm install` from the renamed
repository.

### Conformance, auth and the corpus

npm authenticates with a bearer token from `.npmrc` (`foundation/auth.md`, its AC4 row for
npm). The harness's existing `setup` token provisioning suffices: a case writes the issued
token into the client container's npm config as `//host/:_authToken`, so no interactive login
flow is needed and nothing new is asked of the harness vocabulary for auth.

The recorded surface for AC8's corpus, named now because a thin recording script yields a thin
specification (the harness spec's own warning): cold install, warm install, `npm ci` against a
lockfile, publish, a republish refused, scoped install and publish, dist-tag
list/add/move/delete, `npm view` (the full packument), deprecate, unpublish in both shapes, `npm
audit signatures`, and a missing-package failure. This list is the review baseline for the
recording script. **The write half is recorded against the public registry too**, under the
settled corpus-source decision below and `pypi.md`'s precedent (twine against pypi.org): a
throwaway package under a scope the owner's npm organisation controls, published with a
granular access token the owner provisions out of band, deprecated, re-tagged and then
unpublished inside the public registry's 72-hour window, so that the server half of every write
(the publish acceptance, the status and body of the republish refusal, the `-rev` answers) is
captured rather than taken from prior art. Its cost is the owner's: an npm account and
organisation, a token with the publish bypass of two-factor enforcement, and one throwaway name
consumed on the public registry per recording session, which is why corpora are committed
rather than re-recorded. No row on `conformance-harness.md`'s authoritative-reference exception
list is needed, since no half is recorded against a local reference; Verdaccio stays an offline
iteration aid that settles nothing. Until that recording lands, the client half stands on the
2026-10-08 capture (Design, "The wire surface") and the server half of the writes on prior art,
and this spec says so rather than claiming grounding it does not have. Recording gates on the
harness's redaction criterion (`conformance-harness.md` AC13), and every deliberate divergence
from public-registry behaviour goes on the recorded exception list **before** its flow is
expected to replay, per the settled corpus-source decision below. Two are known now: the audit
exchange, answered from this registry's feed with its own `id` values and normalised out of
replay, and unpublish succeeding where the public registry's time-window or dependent-count
restrictions would refuse it. Refusing to republish an unpublished version matches the public
registry, so that flow replays.

## Acceptance Criteria

- [ ] AC1: `npm install` resolves and installs a package from a hosted repository, for two
      pinned npm client versions, the current major (11.x, the line captured on 2026-10-08) and
      the previous major (10.x), each pinned by image digest; and `curl -I` on the packument
      and on a tarball answers the `GET`'s status and headers, `Content-Length` included, with
      no body.
- [ ] AC2: `npm publish` accepts a package from its base64 `_attachments` body, a subsequent
      `npm install` retrieves it with a matching integrity hash, and every `dist.tarball` in the
      served packument names this registry's canonical tarball route under `server.public_url`,
      never the URL the client's publish body guessed.
- [ ] AC3: Scoped packages (`@scope/name`) work for both install and publish, exercised through
      the real client's encoded-slash requests.
- [ ] AC4: `npm ci` against a lockfile resolves entirely from the registry with integrity hashes
      matching.
- [ ] AC5: dist-tags are settable, movable and deletable through the real client, and respected
      by `npm install pkg@tag`.
- [ ] AC6: The proxied path installs a package from the public registry and serves it from cache
      on a second install, with the second install reaching this registry and the upstream
      receiving no request, both asserted from the transcript and at the network layer, and
      every `dist.tarball` and `dist.attestations.url` in the packument this registry served
      names this registry, never the upstream.
- [ ] AC7: A packument is revalidated after its TTL and not before, proven through the npm
      proxied path against a mutating test upstream: a version published upstream becomes
      visible to `npm install` after the TTL and, absent an explicit refresh, not before.
- [ ] AC8: Replay-match passes against a corpus recorded from the public registry covering the
      recorded surface named in Design.
- [ ] AC9: An unpublished version no longer installs, and a whole-package unpublish leaves the
      name unresolvable, proven through the real client's `-rev` flow with transcript
      assertions rather than the client's exit code.
- [ ] AC10: A version deprecated on the hosted path causes a subsequent install to print the
      deprecation warning served by this registry, and a `deprecated` field appearing upstream
      propagates to the proxied packument at the next revalidation without being treated as a
      removal.
- [ ] AC11: An upstream packument replaced by the security-holding shape purges the cached
      content and raises the operator alert, while versions vanishing without that shape keep
      serving with a recorded divergence, as npm's side of the settled removal table in
      `proxy-cache.md` (its AC13); and after the purge a fresh `npm install` of a condemned
      version is refused with an error naming the signal, with no upstream request for it,
      asserted at the network layer, as the shared security-signal rule requires.
- [ ] AC12: A packument request carrying the weighted install-v1 Accept header receives the
      abbreviated document (exactly `name`, `dist-tags`, `versions`, `modified`) with
      `Content-Type: application/vnd.npm.install-v1+json`, a plain-JSON request receives the full
      document as `application/json`, both are assembled from the same stored state, proven by a
      mutation appearing in both, and both are served through `ServeRendered`'s lazy form with a
      door-derived `ETag` that answers `304` without a render and changes on a repoint, with no
      validator, `Cache-Control` or conditional header set or read anywhere in
      `internal/format/npm`.
- [ ] AC13: A `PUT` publishing a version that already exists is refused with the status and
      `error` body the corpus records the public registry answering, both when a real `npm
      publish` is driven against it and when the `PUT` is sent directly (the client refuses an
      existing version itself after reading the packument, so the direct request is what
      proves the server), and the refused request leaves no new snapshot behind; and a publish
      body whose declared `Content-Length` exceeds `management.publish_spool_limit` is refused
      `413` before a byte is spooled.
- [ ] AC14: Before PyPI work begins, the experiment log holds npm's per-format cost under the
      charter's settled procedure ("Measuring per-format cost"), together with an
      explicit finding on whether the proxy layer built for OCI generalised, so the N+1
      comparison has its baseline.
- [ ] AC15: Unpublish is gated by authorization alone: a version another package in the same
      repository depends on, and a version older than the public registry's unpublish window
      under an injected registry clock, both unpublish for a principal holding `delete`; a
      principal holding only `push` is refused with no snapshot created; and unpublish or
      deprecate against a proxied repository is refused.
- [ ] AC16: Republishing an unpublished `name@version`, with the same tarball or a different
      one, is refused exactly as AC13 renders a republish refusal, by the shared write path's
      `retired` refusal of the claim the publish declares on its transaction against the
      core-held `Retirement` record, at declaration and again at commit (an unpublish committed
      between the two refuses the publish), including after the unpublish snapshot has been
      pruned out of retention, after the pointer is moved to a snapshot older than the
      unpublish and back, and after a whole-package unpublish, while a new version under the
      same name publishes normally.
- [ ] AC17: Unpublish and deprecate driven through the registry-owned management endpoint, as
      the `delete-version`, `delete-package` and `annotate` kinds, produce the same served
      packument, exactly one snapshot each, and the same authorization outcome as the same
      operation driven through `npm unpublish` and `npm deprecate`, with deprecation permitted by
      `push` and unpublish requiring `delete`; the handler declares exactly those three kinds
      through `Operations()`; and a token holding `delete` under the pattern `@acme/tool/1.0.0`
      alone unpublishes that version through the management endpoint and is refused through
      `npm unpublish`, whose `-rev` `PUT` reports the declared route-level object `@acme/tool`,
      the binding being stricter and never wider than the operation.
- [ ] AC18: With a controlled advisory provisioned through the harness's `advisories` key naming
      a version held in a hosted, a proxied and a virtual repository, a real `npm audit`
      against each reports that version with the advisory's URL and exits non-zero, a `npm
      install` of it completes and prints the advisory count, the bulk answer for a name the
      repository's `coordinate_exemptions` names carries no record, the gzip-encoded request
      body is decoded and the response matches the captured public-registry shape field by
      field; before the feed's npm source has any freshness value the bulk endpoint answers 404
      and a default `npm install` and `npm ci` against each repository succeed, for each pinned
      client; the quick-audit endpoint answers 404 in every mode; and no audit request reaches
      any upstream in any of these cases, asserted at the network layer.
- [ ] AC19: A token holding `pull` and `push` under the pattern `@acme/**` publishes and installs
      `@acme/tool` through the real client, including its tarball, with the default install
      succeeding although its audit request is refused, and is refused publishing or installing
      `@other/tool` and the unscoped `acme-tool`; with `delete` under the same pattern it
      unpublishes `@acme/tool@1.0.0` and is refused unpublishing `@other/tool`; and in proxied
      mode it installs an `@acme`-scoped package through the cache and is refused an unscoped
      one.
- [ ] AC20: A packument or tarball request the shared policy layer refuses answers `403` with
      the JSON error body naming the policy, on the hosted and the proxied path, and a real
      `npm install` of the refused version exits non-zero with that text in its output.
- [ ] AC21: Yarn, pnpm and Bun, each pinned by image digest, pass this format's install cases on
      both paths with each as the client (AC1, AC4 and AC6), and each that has a publish command
      publishes a package that a subsequent install retrieves with a matching integrity hash,
      as the catalogue's client-reach criterion (its AC2) requires of every client its
      multiplier table names.
- [ ] AC22: On a proxied repository whose upstream stand-in serves recorded packuments, keys
      and attestation bundles, `dist.signatures` verify by `keyid` against the pinned keys
      document, that document is served verbatim at the remote's `/-/npm/v1/keys` (and a hosted
      repository answers the route 404), `dist.attestations` are fetched, verified and served from
      `/-/npm/v1/attestations/{name}@{version}` on this registry with the packument's attestation
      URL pointing at this registry and never at the upstream, a real `npm audit signatures`
      passes for a package whose bundle verified and reports the failure for one whose
      attestation this registry refused to serve; and on a hosted repository a real `npm publish
      --provenance`-shaped publish carrying `_attestations` is refused before commit when they
      fail the identity policy, with no snapshot, and stored and served when they verify (this
      format's half of `artifact-verification.md` AC20).
- [ ] AC23: The handler's `Capabilities()` declares proxy `supported`, reference-implementation
      availability `available`, `Virtual: supported` and `Rename: supported`; a real `npm install`
      from a renamed repository succeeds under the new name in both modes while the old name
      answers 404 indistinguishably from a never-existing repository; and a virtual repository
      of two members resolves a name present in both from the first member.
- [ ] AC24: On a proxied repository each negotiated packument variant is its own cached
      document: a cold abbreviated request causes exactly one upstream `GET` carrying the
      weighted header and no fetch of the full document (asserted at the network layer), and a
      following full request one more; both are served with the cache-scoped `Last-Modified`
      and never the upstream's, are never evicted by an LRU pass that evicts tarballs under
      the quota, count in `cache_metadata_bytes{repository}`, and declare a retained-revision
      count of zero; an upstream packument whose `modified` is earlier than the adopted one is
      not adopted and records a divergence; a changed `integrity` for a cached `name@version`
      purges and alerts as the coordinate-bound violation; a tarball failing its `integrity`
      commits nothing and the cached copy keeps serving; and a `HEAD` on a proxied packument
      and tarball fills the cache with one upstream `GET` and answers the `GET`'s headers with
      no body.
- [ ] AC25: The handler reports the advisory key as the name as spelled, scope included, and
      the version string, on the hosted write and on the fetch-and-cache request, so a
      condemned `@acme/tool@1.0.0` is refused on a proxied repository with no upstream request
      (asserted at the network layer); and on a hosted repository a private package sharing a
      public name under a public advisory is refused until the name is in the policy's
      `coordinate_exemptions`, after which it installs.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/npm/hosted_test.go` |
| AC2 | conformance | `conformance/npm/publish_test.go` |
| AC3 | conformance | `conformance/npm/scoped_test.go` |
| AC4 | conformance | `conformance/npm/lockfile_test.go` |
| AC5 | conformance | `conformance/npm/disttag_test.go` |
| AC6 | conformance | `conformance/npm/proxied_test.go` (transcript + network-level assertion) |
| AC7 | conformance | `conformance/npm/proxied_ttl_test.go` (mutating local stand-in upstream) |
| AC8 | conformance | `conformance/npm/replay_test.go` |
| AC9 | conformance | `conformance/npm/unpublish_test.go` (transcript assertions) |
| AC10 | conformance | `conformance/npm/deprecate_test.go` (hosted and proxied cases) |
| AC11 | integration + conformance | `internal/format/npm/removal_test.go` (test upstream presenting each event class; the shared-layer half is `proxy-cache.md` AC13's); `conformance/npm/security_signal_test.go` (post-purge install refused naming the signal; network-level assertion of no upstream fetch) |
| AC12 | integration + unit | `internal/format/npm/packument_test.go` (both variants from one state, the mutation in both, the lazy form's identity and the `304` without a render on `signing-service.md` AC32's fixture shape); the validator and `Cache-Control` scan is `signing-service.md` AC11's module-wide `internal/index/freshness_boundary_test.go` |
| AC13 | conformance + integration | `conformance/npm/publish_test.go` (republish case through the real client and a direct `PUT`, the status and body compared with the corpus); `internal/format/npm/publish_spool_test.go` (the `413` before a byte, the undeclared overrun, on `management-api.md` AC36's fixture shape; the declared claim read back from the transaction) |
| AC14 | manual | `docs/internal/tasks/experiment-log.md`, reviewed before PyPI starts |
| AC15 | integration + conformance | `internal/format/npm/manage_unpublish_test.go` (dependent-count and injected-clock cases, `push`-only refusal with snapshot count unchanged, proxied refusal); `conformance/npm/unpublish_test.go` (real client unpublishing a depended-on version) |
| AC16 | conformance + integration | `conformance/npm/publish_test.go` (republish-after-unpublish case, same and different tarball); `internal/format/npm/retirement_test.go` (after pruning under an injected clock, after whole-package unpublish, new version accepted) |
| AC17 | conformance + integration | `conformance/npm/manage_binding_test.go` (twin packages in one `script`: one operated through the management endpoint, one through real `npm unpublish` and `npm deprecate`; served packuments compared); `internal/format/npm/manage_binding_test.go` (snapshot count per operation through each entry point, `push` and `delete` grants) |
| AC18 | conformance + integration | `conformance/npm/audit_test.go` (hosted, proxied and virtual cases with a controlled advisory through the `advisories` key: `npm audit` reporting it, the exempted name, the no-freshness 404 with a silent default install and `npm ci`, the quick-audit 404; network layer shows no upstream audit request; both pinned clients); `internal/format/npm/audit_test.go` (gzip body decoding, the rendered shape against the captured public-registry answer field by field, `id` stability, the reader asked per listed version, nothing rendered for a name with no record) |
| AC19 | conformance + unit | `conformance/npm/auth_test.go` (the pattern-refusal case `format-handler-interface.md` AC7 requires, in both modes; a pattern-scoped token provisioned through the `credentials` key); `internal/format/npm/scope_object_test.go` (the object table, per route, `format-handler-interface.md` AC12) |
| AC20 | conformance | `conformance/npm/policy_test.go` (hosted and proxied modes; rules through the `policies` key, a controlled advisory through `advisories`; npm's post-refusal behaviour captured here replaces the `pending` binding-table row in the same change, `supply-chain-policy.md` AC20) |
| AC21 | conformance | `conformance/npm/clients_test.go` (Yarn, pnpm and Bun pinned by digest, running the install, lockfile and proxied cases, and publish where the client has a command) |
| AC22 | conformance + integration | `conformance/npm/signatures_test.go` (stand-in with recorded bundles and keys document, `npm audit signatures` against the remote whose `/-/npm/v1/keys` re-hosts the pinned document, the hosted keys route 404, hosted `_attestations` publish; shared with `artifact-verification.md` AC20); `internal/format/npm/attestations_test.go` (re-hosted URL rewriting, the keys document served verbatim with its expired entry, refused-before-commit with snapshot count unchanged, `absent` verdict on a plain publish, against a fake `Verifier`) |
| AC23 | unit + conformance | `internal/format/npm/capabilities_test.go` (the four declarations, `format-handler-interface.md` AC13); `conformance/npm/rename_test.go` (`repository-lifecycle.md` AC12, presence enforced by `conformance-harness.md` AC26); `conformance/npm/virtual_test.go` (first-member resolution through real `npm install`) |
| AC24 | integration + conformance | `internal/format/npm/proxied_metadata_test.go` (per-variant cache entries and the one-fetch-per-variant assertion, cache-scoped `Last-Modified`, the quota pass leaving packuments in place, `cache_metadata_bytes`, the zero retained count, the `modified` regression, the coordinate-bound purge and the fetch failure against a fake upstream; the shared-layer halves are `proxy-cache.md` AC13, AC22, AC27, AC28 and AC29); `conformance/npm/proxied_test.go` (`curl -I` on a cold proxied packument and tarball, one upstream `GET` each at the network layer, headers compared with the following `GET`'s; `proxy-cache.md` AC32's format case) |
| AC25 | integration + conformance | `internal/format/npm/advisory_key_test.go` (the key on the hosted write and on the fetch-and-cache request, scoped and unscoped; shares `internal/policy/advisory_key_test.go`'s fixture shape, `supply-chain-policy.md` AC24); `conformance/npm/policy_test.go` (the condemned scoped version refused with no upstream request; the hosted public-name case and its exemption, `supply-chain-policy.md` AC25's format case) |

## Implementation Phases

### Phase 1: Hosted core
- Packument assembly and content negotiation through `ServeRendered`'s lazy form, tarball
  serving through `ServeFile`, the package-level serve policy, scoped names, publish through the
  bounded spool with its declared claim, integrity verification and the republish refusal in the
  corpus's shape, the bulk advisory endpoint rendered from the advisory reader with the
  no-freshness 404, the quick-audit 404, the advisory key on the hosted write
- The per-route addressed-object declaration (the `-rev` `PUT`'s declared route-level object
  included) and the pattern-scope cases; the `403` rendering of the typed policy refusal through
  `WriteRefusal`
- `Capabilities()` declaring proxy, reference implementation, `Virtual` and `Rename`; the rename
  and virtual cases (AC23)
- Hosted `_attestations` verified before commit through `Deps`' `Verifier` (AC22's hosted half;
  `artifact-verification.md` Phase 2 is built with this format)

### Phase 2: Mutation surface
- Waits on `docs/internal/plans/foundation/management-api.md` reaching `planned` (Blocking
  preconditions)
- dist-tags; unpublish and deprecation as the `delete-version`, `delete-package` and `annotate`
  kinds on the handler's `Operator`, with the client routes bound onto them; the retirement
  coordinates returned in `Outcome` and refused centrally; the write-boundary declaration
  exercised end to end

### Phase 3: Proxied path
- Classification with per-variant packument entries and the zero retained count, URL rewriting
  as the lazy render over the cached body, conditional revalidation, negative caching, the full
  event-class rows (removal, the coordinate-bound violation, the fetch failure, the `modified`
  regression) and security-signal detection, with the refusal-before-fetch that follows a
  signal; the advisory key on the fetch-and-cache request; `HEAD` through the shared door
- Proxied `dist.signatures` verification against the pinned keys document, that document
  re-hosted at the remote's `/-/npm/v1/keys`, and `dist.attestations` re-hosted at this
  registry's URL (AC22's proxied half)

### Phase 4: Corpus and gate
- Recording session across the named surface (after the harness redaction gate), replay-match,
  the second pinned client, Yarn, pnpm and Bun (AC21), experiment-log entries

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. The questions this spec raised before its first review were answered by the owner
and folded into the body. The 2026-09-25 first review raised Q2 and Q3, and folding them on
2026-09-26 exposed Q4; all three were adopted that day under the owner's standing delegation and
folded through Scope, Design, the criteria (AC15 to AC18) and the Test Plan. The 2026-10-08
Fable gate review raised Q5, the revision Q2's own record scheduled, and adopted it. Resolved
decisions are kept rather than deleted, so the reasoning survives the next time someone asks
why it was done this way.

### Resolved: the bulk advisory answer, rendered from the advisory reader (was Q5, raised and adopted 2026-10-08)

**Adopted 2026-10-08 under the owner's standing delegation, on Fable, in the gate review,
superseding the resolved audit-request disposition below (was Q2), a delegation adoption and
not an owner decision, and owner-facing** because it changes what a hosted or proxied npm
repository asserts to every client about vulnerabilities. Option A: the bulk advisory endpoint
is answered from `supply-chain-policy.md`'s advisory reader for the repository served, under
its `coordinate_exemptions`, in the public registry's captured shape, in every repository mode,
with nothing forwarded; it answers 404 only while the feed's npm source has no freshness value
(never synced, nothing imported); the quick-audit endpoint stays 404. Folded through Scope (in
and out), Design ("The wire surface", "Audit requests", "Addressed objects and pattern scopes"),
AC18 and its Test Plan row, Phase 1 and the corpus's exception note.

The question: was Q2 chose the 404 because no feed existed, and named its replacement ("the
real answer arrives when `supply-chain-policy.md` has an advisory feed to serve, as a revision
of this section"). The feed exists, with OSV's npm data being the GitHub Advisory Database that
also backs the public registry's answer; the reader is keyed by repository with the operator's
exemptions (its was Q11 and was Q12); and `composer.md` (its was Q12) and `pub.md` (its was Q7)
rendered their hosted advisory surfaces from the same reader on 2026-10-08 for the same reason.
The 2026-10-08 capture also changed the cost of the 404: npm 11.17.0 prints nothing on it
during an install, so the "warning in every build log" was Q2 priced no longer exists for that
client, and `npm audit` itself exits 1 with an error, which is worse than noise for an operator
who runs it in CI.

**Recommendation:** A, because it is the only option under which what `npm audit` prints
against this registry is something this registry computed from data it holds, with the
all-clear withheld exactly while it has none, and because one reader answering four formats'
advisory surfaces is what keeps the feed decision single.

| Option | You get | It costs |
|---|---|---|
| **A. Render from the reader; 404 only before the first sync; nothing forwarded** (adopted) | `npm audit` works against hosted, proxied and virtual repositories from the operator's own feed and exemptions; no false all-clear, since the endpoint is silent until the feed holds data; the privacy posture of Q2 unchanged | A rendering to keep aligned with the public registry's shape, re-grounded from the corpus; the `id` field derived rather than the public registry's; an answer that differs from the public registry's whenever the feed is behind it, bounded by the staleness threshold and its alert |
| **B. Keep the 404 (was Q2)** | Nothing to build | `npm audit` exits 1 against this registry forever, so a CI step that runs it cannot use the registry; a feed the registry already holds is withheld from the one client command built to show it |
| **C. Render from the reader, and forward the request upstream on a `remote`** | The public registry's own answer for proxied names | The request carries the whole dependency tree, private names from other repositories included, so a `remote` would leak them to a third party exactly as Q2's option C would have |

**Why this is yours:** it decides what the product asserts about vulnerabilities to every npm
client, from data the operator may not have synced, and it supersedes an adoption made under
the delegation rather than confirming it.

Accepted cost: A's row. B lost on withholding data the registry holds and on the exit code; C on
the leak Q2 already refused.

### Resolved: audit-request disposition (was Q2)

**Superseded on 2026-10-08 by was Q5 above**, the revision this record scheduled for the day a
feed existed; its reasoning on the two rejected answers stands and is why Q5 refused C and
keeps the 404 before the first sync. The record as adopted:

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: both audit endpoints
answer an honest 404 in every repository mode, nothing is forwarded, the audit exchange is
normalised out of the replay corpus, and the divergence sits on the recorded exception list
(Design, "Audit requests"; AC18).

Accepted cost: a warning in every default install against this registry. Why the alternatives
lost: B makes this registry assert "no known vulnerabilities" about content it never checked,
silently and by default, and C leaks private package names and versions to a third party
through an egress path from the hosted surface. The real answer arrives with
`supply-chain-policy.md`'s advisory feed, as a revision of the Design section.

The original question:

`npm install` POSTs the dependency tree to the bulk advisory endpoint by default, falls back to
the quick-audit endpoint on error, and prints a warning when neither answers. The audit
endpoints are out of scope, but the requests arrive regardless, so a disposition must be chosen:
the corpus recorded against the public registry contains a real advisory exchange, and whatever
we answer differs from it.

**Recommendation:** A - an honest 404 for v1, with the audit exchange normalised out of the
replay corpus and the divergence on the recorded exception list; the real answer arrives when
`supply-chain-policy.md` has an advisory feed to serve.

| Option | You get | It costs |
|---|---|---|
| **A. 404, honestly unimplemented** | No false security claim; nothing built twice before the advisory feed exists | A warning in every default install against this registry, and the audit exchange must be normalised out of replay and recorded as a divergence |
| **B. Stub an empty advisory response** | Quiet installs that look like a fully working registry | The registry asserts "no known vulnerabilities" about content it never checked - a security claim made silently, by default, to every client |
| **C. Forward the audit request to the public registry's advisory endpoint** | Real advisory answers with no local feed | An egress path from the hosted surface, and it sends the names and versions of private packages to a third party - a data leak shaped exactly like the one dependency confusion feeds on |

**Why this is yours:** it prices a false all-clear against noise in every build log against
leaking private package names, which is a security-posture and privacy claim the product will be
held to, not something the fleet can measure its way to.

### Resolved: hosted unpublish policy (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: authorization-only.
Anyone the central authorizer permits (`delete` on the repository) may unpublish; the public
registry's time window and dependent-count restrictions are not enforced, and the divergence
sits on the recorded exception list (Design, "The management surface"; AC15).

Made consistent with the other Cluster 5 answers: unpublish and deprecation are registry-owned
management operations homed in `docs/internal/plans/foundation/management-api.md` (since
authored: the `delete-version`, `delete-package` and `annotate` kinds of its vocabulary, npm's
rows in its reconciliation table), with npm's client routes served as bindings onto them rather
than as a separate implementation (AC17). This is the one Cluster 5 format where the real client
oracles the trigger as well as the effect, which the analysis in
`docs/internal/analysis/management-surfaces-and-the-oracle.md` records; the precedent is shared
so that four specs do not answer one question four ways.

Accepted cost: diverging from public-registry behaviour, so any recorded unpublish-refusal flow
cannot replay. Why B lost: its rules need npmjs's data set to mean anything, and it blocks
operators from removing content they own on their own registry. Authorization-only governs
**whether** a version may be removed; it does not free the removed coordinate, which is Q4's
separate answer below.

The original question:

The public registry restricts unpublish (time windows, dependent counts) to protect a public
commons. A private registry has operators, RBAC and no commons.

**Recommendation:** A - authorization-only, with the divergence on the recorded exception list;
npm's restrictions encode public-commons policy that is meaningless against this registry's
data, and an operator blocked from removing their own content will not accept the answer.

| Option | You get | It costs |
|---|---|---|
| **A. Authorization-only: anyone the central authorizer permits may unpublish** | Operators keep full control of their own content; no npmjs policy to emulate or keep current | Diverges from public-registry behaviour, so any recorded unpublish-refusal flow cannot replay and the divergence must sit on the exception list |
| **B. Mirror the public registry's restrictions** | Replay-faithful behaviour, and a guard rail against habit-formed expectations from npmjs | Encodes time windows and dependent-count rules that need npmjs's data set to mean anything, and blocks operators from removing content they own on their own registry |

**Why this is yours:** it decides what the product promises operators about removing their own
content, and whether fidelity to the public registry outranks operator control - a product call.

### Resolved: republishing an unpublished version (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: an unpublished
`name@version` is retired and can never be republished, with the same bytes or different ones;
the package name itself stays usable for new versions (Design, "What counts as a write"; AC16).
The record's home moved once since: this adoption placed the retirement set in the package-level
document, and `management-api.md`'s resolved retirement-placement decision (was Q3 there,
2026-09-27) made it the core-held `Retirement` record `data-model.md` owns (AC35), refused by the
shared write path. The semantics here are unchanged; only where the set lives moved.

Raised and adopted in the same pass because folding Q3 exposed it: authorization-only unpublish
says nothing about whether the removed coordinate is free again, and two readings of "operator
control" diverge exactly there. Accepted cost: an operator who unpublished a bad version must
publish a new version number rather than reuse the old one. Why B lost: it is a correctness
hole rather than a freedom, since every lockfile that pinned the old `integrity` and every cache
that saw the old tarball, this registry's own proxy layer included, would then disagree with the
registry. It also matches `pypi.md`'s filename retirement and `ansible-collections.md`'s version
retirement, adopted in the same pass, so retirement is one cross-format rule.

The question as raised:

Q3's answer lets an authorized principal unpublish any version. Once it is gone, may the same
`name@version` be published again? The public registry says never. A private registry could say
yes, on the same operator-control reasoning that settled Q3.

**Recommendation:** A - retire the coordinate. Q3 removed public-commons policy; version
immutability is not public-commons policy but a property lockfile integrity checks and this
registry's own immutable-artifact caching depend on for correctness.

| Option | You get | It costs |
|---|---|---|
| **A. An unpublished version is retired forever; the name stays usable** | `name@version` binds one tarball for the life of the repository, so no lockfile or cache is ever contradicted; matches the public registry, so the flow replays | A botched version cannot be fixed in place; the operator publishes a new version number |
| **B. Unpublish frees the version for republishing** | An operator can correct a bad publish under the same version | A lockfile pinning the old `integrity` fails against the new tarball, and a proxied-of-hosted cache that saw the old tarball serves it forever against metadata that now disagrees |

**Why this is yours:** it is a product promise about correcting mistakes, bounded by a
correctness property other parts of the system rely on, and it decides how far Q3's operator
control extends.

### Resolved: corpus source (was Q1)

**Settled 2026-09-22: the public npm registry is authoritative**, per the general rule in
`foundation/conformance-harness.md` (whose resolved authoritative-reference record names this
spec as settled by it). Verdaccio is for offline iteration only. Any place where we knowingly
diverge from public-registry behaviour goes on the recorded exception list, with a reason.

Accepted cost: recording needs network access and is subject to the public registry's rate
limits, so corpora are committed rather than re-recorded per run, and a divergence this spec
chooses (the audit and unpublish-policy answers above are two) must be on the exception list
before its flow is expected to replay.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-25 | 331ef25 | first review: protocol grounding at published-contract level (the `npm/registry` docs describe reads only, so the write half is grounded in prior-art implementations and flagged for re-grounding in captured traffic per the standing rule) + adversarial + cross-spec (interface AC8/Q9 re-open gate, charter Q3's before-npm obligation from `question-triage.md`, data-model's write-boundary and snapshot rules and its AC13, proxy-cache's settled classification/removal/serve-stale/negative-caching decisions and its AC13, harness `setup` vocabulary, corpus rules and redaction gate, auth AC4, supply-chain-policy Q6, the catalogue's npm family row) + constitution; code-claim verification vacuous pre-implementation (no `internal/format/npm/`, no `conformance/npm/`) | The spec was a stub wearing a reviewed spec's frontmatter: no summary, no Design, no Phases, no Tasks, and its one resolved decision claimed it was "folded into Design and Scope above" when no Design section existed and no accepted cost was recorded - both corrected. Body built out from grounded protocol facts: the wire surface including the `-rev` unpublish routes (where an unrouted surface is a silent no-op because the client exits 0 on 404), content negotiation and the corgi Accept header, the encoded-slash routing trap, tarball URL rewriting, the write-boundary declaration `data-model.md` requires of every format spec, the proxied classification and npm's side of the settled removal table (security-holding shape purges; author unpublish keeps and flags; deprecation is never a removal), the client-side-cache trap that made AC6 vacuously passable, and the non-interactive auth path (token via `setup`, no new harness vocabulary). Scope gained unpublish, deprecation, republish refusal, content negotiation and security-signal detection; out-of-scope items each gained a non-effort reason. Six criteria added (AC9 unpublish with transcript assertions, AC10 deprecation both paths, AC11 the removal table, AC12 content negotiation, AC13 republish refusal, AC14 the measurement baseline) with Test Plan rows; AC7's row retargeted from `internal/proxy/` (which duplicated proxy-cache AC2/AC3) to an npm-path conformance case. Both blocking preconditions now recorded: the interface re-open (with its Q9 noted as widening the evidence set, not moving the gate) and charter Q3 before npm starts. Q2 (audit-request disposition: 404 vs empty stub vs forwarding, a security-posture and privacy call) and Q3 (hosted unpublish policy vs public-registry emulation) raised for the owner, not decided. Stays draft. |
| 2026-09-26 | 4d1aeb1 | folding adopted recommendations under the standing delegation | Not a review: adoption and application of this spec's own recommendations, made consistent with the other Cluster 5 format specs. Q2 adopted as A: both audit endpoints answer 404 in every mode with nothing forwarded (new Design section "Audit requests", wire-table row, Scope, corpus exception list, AC18). Q3 adopted as A, authorization-only unpublish with the public registry's restrictions unenforced (AC15), and made consistent with pypi and Galaxy: unpublish and deprecation are registry-owned management operations homed in `docs/internal/plans/foundation/management-api.md` (to be authored), with the `-rev` routes and the deprecate `PUT` served as bindings onto them, `delete` for unpublish and `push` for deprecation, hosted only (new Design section "The management surface", AC17, a Phase 2 blocking precondition). Folding Q3 exposed Q4 (may an unpublished version be republished), written in decision shape and adopted as A: retired forever through a package-level retirement set, the name staying usable (write-boundary section, AC16), matching pypi's filename retirement and Galaxy's version retirement. The provenance out-of-scope item now names `docs/internal/plans/foundation/artifact-verification.md` (to be authored) as the producer; the charter precondition records that charter's cost-attribution question was answered in its own spec during this pass; the proxy-cache security-signal citation updated to that spec's resolved passive-detection answer. Test Plan rows added for AC15 to AC18. Stays draft. |
| 2026-09-26 | da0aecd | cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Applied: AC14 reworded to the charter's settled 'Measuring per-format cost'; the step-4b precondition (charter AC12) added; the interface re-open's evidence set cited as resolved (was Q9); the audit out-of-scope reason updated to supply-chain's resolved OSV feed; the security-signal rule cited in the removal table and detection note, with AC11 extended to a post-purge install refused naming the signal and no upstream fetch; the addressed-object table (packument and routes by name `{name}`, version-addressed routes `{name}/{version}`, ping, whoami and audit none) with AC19 as the pattern-refusal case in both modes; the policy rendering (AC20); the catalogue's resolved client-reach decision applied to Yarn, pnpm and Bun (AC21). Nothing found already done. Stays draft. |
| 2026-09-28 | a6d72b3 | cross-spec reconciliation of the foundation wave. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` naming this file verified against the current text of its source spec before applying. From the management-api authoring (items 11 and 12): the retirement set is the core-held `Retirement` record (`data-model.md` AC35; management-api's resolved retirement-placement decision, was Q3), returned as `name@version` in the operation's `Outcome` and refused by the shared write path, rewritten through "What counts as a write", Phase 2 and the Q4 record; the management table gains the kind column (`delete-version`, `delete-package`, `annotate`) and the handler's `Operator` declaration, with AC17 asserting the kinds; every "(to be authored)" citation of management-api.md replaced. From the artifact-verification authoring (item 10): a new "Signatures and attestations" section (proxied `dist.signatures` by `keyid` as `repository-chain`, `dist.attestations` verified and re-hosted at `/-/npm/v1/attestations/{name}@{version}`, hosted `_attestations` verified before commit, its resolved provenance decision, was Q7) and AC22 sharing `conformance/npm/signatures_test.go` with its AC20; the provenance out-of-scope item replaced by hosted registry signatures, reserved for `signing-service.md`'s ECDSA P-256 profile (its Phase 5; signing-service item 13). From sweep 1 item 6: the externally visible base URL cited to `format-handler-interface.md`'s "Route-scoped and URL-borne credential declarations" re-open input, with `server.public_url` through `Deps` until then. From the supply-chain reconciliation (item 11) and Open item 5: the refusal goes through `WriteRefusal` with the shared status-line phrase (was Q10, AC18) and AC20's capture fills the `pending` binding-table row (its AC20, harness AC26). From the repository-lifecycle authoring (item 15) and format-handler-interface AC13: `Capabilities()` declared with `Virtual` and `Rename` supported and `conformance/npm/rename_test.go` (AC23). Found already done: the charter fold's AC14 rewording and the supply-chain fold's security-signal citation (both at da0aecd). No question raised. `node scripts/check-spec.js` zero failures for this file. Stays draft pending a gate review. |
| 2026-10-08 | 4f929c7 | Fable gate review: full review (claim verification at HEAD against every cited foundation record, the adversarial lens at full strength on the Opus reconciliation of a6d72b3 and on the Fable-authored design, constitution compliance), plus the recheck brief's step 1 over the whole consequences queue; the client half re-grounded in captured traffic (npm 11.17.0 through a logging proxy, and the public registry's own answers) | No `fable_recheck` marker and no question adopted without Fable (round six lists none for npm), so the re-examination was of the a6d72b3 reconciliation and the original authoring. Brought current: signing-service was-Q14 (packument through `ServeRendered`'s lazy form, tarball through `ServeFile`, the package-level serve policy, no validator in the handler package), was-Q24 (`HEAD` as the `GET` without its body) and was-Q25 with auth was-Q27 (the `Cache-Control` ceiling narrowed to `private` off the anonymous public path); management-api was-Q13 (the `-rev` `PUT`'s declared route-level object, the binding stricter and never wider; AC17), was-Q14 (the publish claims `name@version` on its transaction, checked at declaration and commit; the "retired (409)" wording replaced; AC16), was-Q15 (npm not a declarer of the unchanged-publish exception), was-Q16 (the central `retired` refusal rendered as AC13's republish refusal), was-Q20 (the publish body under `management.publish_spool_limit`; AC13); proxy-cache was-Q19 and was-Q22 (retained count zero, nothing kept alive by mention), was-Q21 (per-variant packuments as current documents outside the quota, in `cache_metadata_bytes`), was-Q23 (adoption under class `none`), was-Q24 (`HEAD` on proxied routes) and the full event-class rows (coordinate-bound violation on a changed `integrity`, integrity failure at fetch, `modified` regression); supply-chain was-Q11 (the advisory key, scope included, on both paths and the fetch-and-cache request) and was-Q12 (hosted public-name matching and `coordinate_exemptions`); harness was-Q7 and was-Q8 (no exception row: the write half is recorded against the public registry under a throwaway scoped name, pypi's precedent; no case needs a clock). Authored claims refuted by capture and corrected: npm 11.17.0's `npm install` requests the packument with plain `application/json` (the corgi header comes from a tag spec, publish and unpublish), `npm ci` reads no packument, no quick-audit fallback is sent on a bulk 404 and no warning is printed, the bulk body is gzip-encoded, the packument is read with `?write=true` before every write, the client's publish body puts the scope in the tarball basename, the client itself refuses a republish after reading the packument (AC13 now proves the server with a direct `PUT`), and the exit-code trap holds for both unpublish shapes. Found by the adversarial lens: `npm audit signatures` cannot verify a proxied packument's signatures unless the remote re-hosts the pinned keys document at `/-/npm/v1/keys` (Scope, Design, AC22); nothing asserted the `dist.tarball` rewrite (AC2, AC6). Q5 raised in decision shape and adopted under the standing delegation, superseding was-Q2 as that record scheduled: the bulk advisory endpoint is rendered from the advisory reader in every mode, 404 only before the feed's npm source has any freshness value, nothing forwarded (owner-facing). AC1 names the two pinned client majors and the `HEAD` answer; AC12, AC18 rewritten; AC24 (proxied metadata) and AC25 (the advisory key) added with Test Plan rows. Zero open questions; 25 criteria, each with a Test Plan row; check-spec zero failures. draft to planned. |
