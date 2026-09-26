---
status: draft
status_description: "Reconciled 2026-09-26 at da0aecd (not a review): AC14 cites the charter's settled cost procedure and npm follows charter step 4b (AC12); the shared security-signal rule cited with refusal-before-fetch added to AC11; per-route addressed objects (AC19), the 403 policy rendering (AC20) and Yarn, pnpm and Bun as proven clients (AC21) added. Earlier: 2026-09-26 at 4d1aeb1: Q2 and Q3 adopted under the owner's standing delegation and folded, and Q4 raised and adopted in the same pass. Audit requests get an honest 404 (AC18); unpublish is authorization-only (AC15) and, with deprecation, is a registry-owned management operation homed in the to-be-authored management-api.md with npm's client routes bound onto it (AC17); unpublished versions are retired forever (AC16). No open questions; stays draft pending a gate review, with Phase 2 blocked on management-api.md."
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

**The management API must be specced before Phase 2.** Unpublish and deprecation are
registry-owned management operations that this format's client routes bind onto (Design, "The
management surface"). Their shared shape, authorization and write accounting belong to
`docs/internal/plans/foundation/management-api.md` (to be authored in the spec loop), so
Phase 2 waits on that spec reaching `planned`. Phases 1, 3 and 4 do not.

## Scope

**In scope:** packument assembly with content negotiation (full and abbreviated), tarball
serving, scoped packages, publish (including refusing a republish of an existing version),
dist-tags (list, add, move, delete), unpublish and deprecation as bindings onto registry-owned
management operations (authorization-only, with every unpublished version retired), an honest
404 to the audit requests the client sends by default, bearer-token presentation per
`foundation/auth.md`, the per-route addressed objects its pattern scopes evaluate, the wire
rendering of a shared policy refusal, the catalogue's named npm-family clients (Yarn, pnpm and
Bun), and the proxied path against the public registry including detection of npm's explicit
security signal.

**Out of scope for v1**, each with its reason, and recorded here because the interface spec's
definition of done requires the deliberately unimplemented surface to be named:

- **`npm audit` endpoints.** Real advisory data belongs to `supply-chain-policy.md`, whose
  resolved advisory-feed decision (was Q1) makes OSV the single feed; serving that feed through
  npm's audit shape is a revision of this spec once the feed exists, and building an advisory
  surface here first would duplicate it.
  The audit requests npm sends anyway during a default install still need an answer, because
  silence is not an available option: they get an honest 404 (Design, "Audit requests").
- **Provenance attestation verification.** Verification belongs to the shared producer
  `docs/internal/plans/foundation/artifact-verification.md` (to be authored in the spec loop),
  per the verification-ownership decision adopted in `supply-chain-policy.md`; npm provenance
  lands there or in its consumer, not here.
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

Grounding: the published contract (the `npm/registry` docs repository) plus prior-art
implementations of the undocumented write half (the public docs describe reads and search only).
Per the standing rule, the client is the specification: every row below is re-grounded in
captured traffic when the recording corpus is made, and the corpus wins any disagreement.

| Surface | Shape |
|---|---|
| Packument | `GET /{name}`; full or abbreviated by content negotiation (below) |
| Version manifest | `GET /{name}/{version}` |
| Tarball | `GET /{name}/-/{basename}-{version}.tgz`; for `@scope/name` the basename omits the scope |
| Publish | `PUT /{name}`; JSON body carrying `_id`, `name`, `versions`, a dist-tag update, and the base64 tarball in `_attachments` |
| dist-tags | `GET /-/package/{name}/dist-tags`; `PUT` and `DELETE /-/package/{name}/dist-tags/{tag}` |
| Unpublish a version | `PUT /{name}/-rev/{rev}` with the version removed, then `DELETE /{name}/-/{tarball}/-rev/{rev}` |
| Unpublish a package | `DELETE /{name}/-rev/{rev}` |
| Deprecate | `PUT /{name}` on the publish route, no attachments, distinguished by the `npm-command` header and the body shape |
| Liveness and identity | `GET /-/ping`, `GET /-/whoami` |
| Audit | `POST /-/npm/v1/security/advisories/bulk`, with `POST /-/npm/v1/security/audits/quick` as the client's fallback; sent by default during install and answered 404 (Design, "Audit requests") |

### Packument assembly and content negotiation

The npm client requests packuments with the weighted Accept header
`application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*` and detects which it
got from the response content type. The abbreviated ("corgi") document carries only
install-relevant fields (`name`, `modified`, `dist-tags`, and per version the dependency sets,
`bin`, `dist`, `engines`, `os`, `cpu`, `deprecated`, `hasInstallScript` and friends); the full
document is everything, and for popular packages it is the difference between kilobytes and
megabytes. Both are assembled from the same stored state, never stored as documents of record.

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
bind address.

### Scoped names and the encoded slash

The client requests a scoped packument as `GET /@scope%2fname`, percent-encoding the slash,
while tarball paths carry literal slashes. A router that reads the decoded path cannot tell
`@scope%2fname` from a two-segment path, so the handler routes on the escaped path. Conformance
with the real client is what polices this (AC3), because the encoded form is what the client
actually sends and no hand-written unit fixture is trusted to reproduce it.

### What counts as a write

`data-model.md` requires each format spec to declare its ecosystem's write boundaries, and makes
metadata-only mutations snapshot-creating writes (its AC13 already presupposes a visible
dist-tag move). npm's declaration:

- A publish `PUT` is **one** completed logical write, even though it carries a version, its
  files and a dist-tag update in one body.
- Each dist-tag `PUT` or `DELETE` is one write.
- The unpublish packument `PUT` at `-rev` is one write, and records the removed version in the
  package's retirement set within that same write; the tarball `DELETE` that follows it in the
  client's flow is a second write only if it changes head content, which after the `PUT` it
  normally does not.
- A whole-package `DELETE` is one write, retiring every version it removes.
- A deprecation, or its reversal with an empty message, is one metadata-only write.

A proxied repository creates no snapshots at all, per the model's settled rule; packument
arrival and revalidation are cache materialisation.

Two protocol behaviours ride on this section. Republishing an existing version is refused, as
the public registry refuses it; a registry that accepts it silently rewrites history that
lockfiles already pin. **Republishing an unpublished version is refused the same way**, as the
public registry also refuses it: the `integrity` a lockfile pins and the tarball this registry's
own proxy layer caches forever both bind bytes to `name@version`, so unpublishing ends a
version's life without freeing its coordinate. The package-level document holds the retirement
set, which every later write carries forward, and a package whose every version is gone is
served as absent while still refusing its retired versions. The package name itself is not
retired: a new version under it publishes normally. And the unpublish routes carry a trap: the npm client treats a 404 on
the `-rev` routes as "already gone" and exits 0, so an unrouted unpublish surface is a silent
no-op with a green exit code. AC9's case therefore asserts through the transcript and a
subsequent failed install, never through the client's exit code alone.

### The management surface

A management operation has a **trigger** (the call that changes state) and an **effect** (what a
resolving client then sees), and the oracle's reach over them differs
(`docs/internal/analysis/management-surfaces-and-the-oracle.md`). npm is the one Cluster 5 format
where both are client-driven: `npm unpublish` and `npm deprecate` exist, so the real client
oracles the trigger as well as the effect, and the one weakness is the exit-code trap above.

This spec follows the precedent shared by the Cluster 5 format specs (`pypi.md`,
`ansible-collections.md` and this one), whose common home is
`docs/internal/plans/foundation/management-api.md` (to be authored in the spec loop):

- **Each operation is a registry-owned management operation**, exposed through that one
  management API. npm's own client routes (the `-rev` unpublish routes and the deprecate `PUT`)
  are served as **bindings onto the same operations**, with identical semantics, authorization
  and write accounting, because the client drives them and a registry npm users cannot
  unpublish from with `npm unpublish` is not an npm registry. There is one operation and two
  ways in, never two implementations.
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

| Operation | Client binding | Effect a client sees | Action |
|---|---|---|---|
| Unpublish a version | `npm unpublish name@version` (`-rev` `PUT`, then tarball `DELETE`) | The version leaves the packument and no longer installs; its coordinate is retired | `delete` |
| Unpublish a package | `npm unpublish name --force` (`-rev` `DELETE`) | The name no longer resolves; every removed version is retired | `delete` |
| Deprecate or undeprecate a version | `npm deprecate` (the publish-route `PUT` without attachments) | Install prints the served message, or stops printing it | `push` |

### Audit requests

`npm install` POSTs the dependency tree to the bulk advisory endpoint by default and falls back to
the quick-audit endpoint on error. This registry answers **both with a 404**, in every repository
mode, and forwards neither anywhere. The client then prints its audit warning and the install
itself succeeds.

The two rejected answers are each worse than noise in a build log: an empty advisory document
would be this registry asserting "no known vulnerabilities" about content it never checked, by
default, to every client, and forwarding the request to the public registry's advisory endpoint
would send the names and versions of private packages to a third party. The real answer arrives
when `supply-chain-policy.md` has an advisory feed to serve, as a revision of this section. The
public corpus contains a real advisory exchange, so the audit exchange is normalised out of
replay and the divergence sits on the recorded exception list.

### The proxied path

The handler owns the request and classifies for the proxy layer's fetch-and-cache API per the
settled decisions in `proxy-cache.md`:

- The packument is **mutable metadata with a TTL**. Revalidation uses the upstream's
  conditional-request support (ETag and Last-Modified are served by the public registry) so an
  unchanged packument costs a 304, not megabytes.
- Tarballs are **immutable artifacts**: cached indefinitely, fetched stream-and-verify against
  the packument's `integrity` (sha512) with `shasum` as the legacy fallback, never committed to
  the CAS on a mismatch or a truncated body.
- Missing names are **negatively cached** with the short TTL; a typo'd dependency in a busy CI
  fleet is the motivating case in that spec, and it is npm-shaped.
- Docker-Hub-style authentication and throttling quirks of the public registry belong to its
  upstream adapter, not to this handler.

Upstream removal maps onto the settled purge-or-flag table as npm's side of that contract:

| Upstream event, as observed at revalidation | Classification |
|---|---|
| The packument's versions replaced by a security-holding placeholder (the `0.0.1-security` shape, the "security holding package" description) | The **explicit security signal**: from that moment every resolution of the named coordinates is refused with an error naming the signal and no upstream fetch of them is made, the cached references end (the purge), a refusal record is written and the operator is alerted once, per the shared security-signal rule stated verbatim in `proxy-cache.md` and `supply-chain-policy.md` |
| Versions vanishing without that shape (author unpublish) | Keep serving, record an operator-visible divergence |
| A `deprecated` field appearing on versions | An ordinary metadata change, propagated at the next revalidation; never a removal event |

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
| Unpublish a version: the `-rev` `PUT` | named | `{name}` |
| Unpublish a version: the tarball `DELETE` | named | `{name}/{version}` |
| Unpublish a package, `DELETE /{name}/-rev/{rev}` | named | `{name}` |
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
  refused to a patterned credential. A default install still succeeds under one, because the
  client treats a failed audit as a warning (Design, "Audit requests"); AC19 asserts that
  rather than assuming it.

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines, the
handler answers `403` with the JSON error body this format uses for its other refusals, its
`error` member naming the policy and rule, or naming the signal for a coordinate condemned
under the shared security-signal rule. `403` rather than the existence rule's `404`, because the
caller is authorized and the content is what is refused. The same rendering serves the hosted
and the proxied path, and the shape follows OCI's first rendering (`oci.md`, "Policy refusals on
the wire"); whether the real client prints the text is what AC20's case proves, and its capture
re-grounds the body shape.

### Conformance, auth and the corpus

npm authenticates with a bearer token from `.npmrc` (`foundation/auth.md`, its AC4 row for
npm). The harness's existing `setup` token provisioning suffices: a case writes the issued
token into the client container's npm config as `//host/:_authToken`, so no interactive login
flow is needed and nothing new is asked of the harness vocabulary for auth.

The recorded surface for AC8's corpus, named now because a thin recording script yields a thin
specification (the harness spec's own warning): cold install, warm install, `npm ci` against a
lockfile, publish, scoped install and publish, dist-tag list/add/move/delete, `npm view` (the
full packument), deprecate, unpublish, and a missing-package failure. This list is the review
baseline for the recording script. Recording gates on the harness's redaction criterion
(`conformance-harness.md` AC13), and every deliberate divergence from public-registry behaviour
goes on the recorded exception list **before** its flow is expected to replay, per the settled
corpus-source decision below. Two are known now: the audit exchange, answered 404 and
normalised out of replay, and unpublish succeeding where the public registry's time-window or
dependent-count restrictions would refuse it. Refusing to republish an unpublished version
matches the public registry, so that flow replays.

## Acceptance Criteria

- [ ] AC1: `npm install` resolves and installs a package from a hosted repository, for at least
      two pinned npm client versions.
- [ ] AC2: `npm publish` accepts a package, and a subsequent `npm install` retrieves it with a
      matching integrity hash.
- [ ] AC3: Scoped packages (`@scope/name`) work for both install and publish, exercised through
      the real client's encoded-slash requests.
- [ ] AC4: `npm ci` against a lockfile resolves entirely from the registry with integrity hashes
      matching.
- [ ] AC5: dist-tags are settable, movable and deletable through the real client, and respected
      by `npm install pkg@tag`.
- [ ] AC6: The proxied path installs a package from the public registry and serves it from cache
      on a second install, with the second install reaching this registry and the upstream
      receiving no request, both asserted from the transcript and at the network layer.
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
- [ ] AC12: A packument request carrying the install-v1 Accept header receives the abbreviated
      document with the matching content type, a plain-JSON request receives the full document,
      and both are assembled from the same stored state, proven by a mutation appearing in both.
- [ ] AC13: A `PUT` publishing a version that already exists is refused, matching the public
      registry's refusal, and the refused request leaves no new snapshot behind.
- [ ] AC14: Before PyPI work begins, the experiment log holds npm's per-format cost under the
      charter's settled procedure ("Measuring per-format cost"), together with an
      explicit finding on whether the proxy layer built for OCI generalised, so the N+1
      comparison has its baseline.
- [ ] AC15: Unpublish is gated by authorization alone: a version another package in the same
      repository depends on, and a version older than the public registry's unpublish window
      under an injected registry clock, both unpublish for a principal holding `delete`; a
      principal holding only `push` is refused with no snapshot created; and unpublish or
      deprecate against a proxied repository is refused.
- [ ] AC16: Republishing an unpublished version, with the same tarball or a different one, is
      refused as AC13 refuses a republish, including after the unpublish snapshot has been
      pruned out of retention and after a whole-package unpublish, while a new version under
      the same name publishes normally.
- [ ] AC17: Unpublish and deprecate driven through the registry-owned management endpoint
      produce the same served packument, exactly one snapshot each, and the same authorization
      outcome as the same operation driven through `npm unpublish` and `npm deprecate`, with deprecation
      permitted by `push` and unpublish requiring `delete`.
- [ ] AC18: Both audit endpoints answer 404 with no advisory document in hosted, proxied and
      virtual repositories, a default `npm install` against each succeeds, and no audit request
      reaches any upstream, asserted at the network layer.
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
| AC12 | integration | `internal/format/npm/packument_test.go` |
| AC13 | conformance | `conformance/npm/publish_test.go` (republish case) |
| AC14 | manual | `docs/internal/tasks/experiment-log.md`, reviewed before PyPI starts |
| AC15 | integration + conformance | `internal/format/npm/manage_unpublish_test.go` (dependent-count and injected-clock cases, `push`-only refusal with snapshot count unchanged, proxied refusal); `conformance/npm/unpublish_test.go` (real client unpublishing a depended-on version) |
| AC16 | conformance + integration | `conformance/npm/publish_test.go` (republish-after-unpublish case, same and different tarball); `internal/format/npm/retirement_test.go` (after pruning under an injected clock, after whole-package unpublish, new version accepted) |
| AC17 | conformance + integration | `conformance/npm/manage_binding_test.go` (twin packages in one `script`: one operated through the management endpoint, one through real `npm unpublish` and `npm deprecate`; served packuments compared); `internal/format/npm/manage_binding_test.go` (snapshot count per operation through each entry point, `push` and `delete` grants) |
| AC18 | conformance | `conformance/npm/audit_test.go` (hosted, proxied and virtual cases; transcript shows both 404s, network layer shows no upstream audit request) |
| AC19 | conformance + unit | `conformance/npm/auth_test.go` (the pattern-refusal case `format-handler-interface.md` AC7 requires, in both modes; a pattern-scoped token provisioned through the `credentials` key); `internal/format/npm/scope_object_test.go` (the object table, per route, `format-handler-interface.md` AC12) |
| AC20 | conformance | `conformance/npm/policy_test.go` (hosted and proxied modes; rules through the `policies` key, a controlled advisory through `advisories`) |
| AC21 | conformance | `conformance/npm/clients_test.go` (Yarn, pnpm and Bun pinned by digest, running the install, lockfile and proxied cases, and publish where the client has a command) |

## Implementation Phases

### Phase 1: Hosted core
- Packument assembly and content negotiation, tarball serving, scoped names, publish with
  integrity verification and republish refusal, the audit endpoints' 404
- The per-route addressed-object declaration and the pattern-scope cases; the `403` rendering
  of the typed policy refusal

### Phase 2: Mutation surface
- Waits on `docs/internal/plans/foundation/management-api.md` reaching `planned` (Blocking
  preconditions)
- dist-tags; unpublish and deprecation as registry-owned management operations with the client
  routes bound onto them; the retirement set; the write-boundary declaration exercised end to
  end

### Phase 3: Proxied path
- Classification and URL rewriting, conditional revalidation, negative caching, the removal
  table and security-signal detection, with the refusal-before-fetch that follows a signal

### Phase 4: Corpus and gate
- Recording session across the named surface (after the harness redaction gate), replay-match,
  the second pinned client, Yarn, pnpm and Bun (AC21), experiment-log entries

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. The questions this spec raised before its first review were answered by the owner
and folded into the body. The 2026-09-25 first review raised Q2 and Q3, and folding them on
2026-09-26 exposed Q4; all three were adopted that day under the owner's standing delegation and
folded through Scope, Design, the criteria (AC15 to AC18) and the Test Plan. Resolved decisions
are kept rather than deleted, so the reasoning survives the next time someone asks why it was
done this way.

### Resolved: audit-request disposition (was Q2)

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
management operations homed in `docs/internal/plans/foundation/management-api.md` (to be
authored in the spec loop), with npm's client routes served as bindings onto them rather than
as a separate implementation (AC17). This is the one Cluster 5 format where the real client
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
