---
status: draft
status_description: "First review 2026-09-25 at 331ef25: the spec had no Design section and its resolved decision claimed folding into one; the wire surface, data-model mapping, write boundaries, proxied classification and removal table are now in the body, with six criteria added (AC9-AC14). Stays draft on Q2 (audit-request disposition) and Q3 (hosted unpublish policy), plus the two blocking preconditions."
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
pnpm and Bun. This spec tests the npm CLI only (AC1), and the conformance matrix reports what is
tested; whether the family's client-reach claim demands its own conformance coverage is the
catalogue's open client-reach question, not this spec's, and the advertised reach must not
exceed the tested one in the meantime.

## Blocking preconditions

**The handler interface re-open must complete before npm implementation starts.**
`format-handler-interface.md` pins a minimal method set before either implementation exists, on
the explicit understanding that it will be wrong about something and is re-opened once OCI passes
its conformance suite. That re-open gate blocks all Tier 1 handler work, and npm is the first of
it. The re-open's evidence set is itself under question (that spec's Q9, raised after two
siblings hit the same gap in the pin); however Q9 is answered, the gate itself holds and npm
waits behind it.

The gate is recorded here as well as there deliberately: a contract enforced on only one side is
enforced nowhere, and npm is also the measurement baseline for the experiment's headline metric.
An interface revision landing mid-npm would contaminate exactly the number the whole project
exists to produce.

**The charter's cost-attribution question (its Q3) must be answered before npm starts.** npm is
the baseline the N+1 comparison is measured against, and a baseline collected under an undefined
procedure is not a baseline; the obligation is stated in `foundation/question-triage.md` and
recorded here from this side for the same one-sided-contract reason as the re-open gate. AC14
is the criterion that makes the baseline this spec's deliverable rather than an intention.

## Scope

**In scope:** packument assembly with content negotiation (full and abbreviated), tarball
serving, scoped packages, publish (including refusing a republish of an existing version),
dist-tags (list, add, move, delete), unpublish and deprecation, bearer-token presentation per
`foundation/auth.md`, and the proxied path against the public registry including detection of
npm's explicit security signal.

**Out of scope for v1**, each with its reason, and recorded here because the interface spec's
definition of done requires the deliberately unimplemented surface to be named:

- **`npm audit` endpoints.** Real advisory data belongs to `supply-chain-policy.md`, whose feed
  authority is its own open question; building an advisory surface here first would prejudge it.
  What the registry answers to the audit requests npm sends anyway during a default install is
  Q2, because silence is not an available option.
- **Provenance attestation verification.** Ownership of signature and attestation verification
  is undecided (`supply-chain-policy.md` Q6 recommends a sibling verification spec); npm
  provenance lands there or in its consumer, not here.
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
| Audit | `POST /-/npm/v1/security/advisories/bulk`, with `POST /-/npm/v1/security/audits/quick` as the client's fallback; sent by default during install (Q2) |

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
- The unpublish packument `PUT` at `-rev` is one write; the tarball `DELETE` that follows it in
  the client's flow is a second write only if it changes head content, which after the `PUT` it
  normally does not.
- A whole-package `DELETE` is one write.
- A deprecation is one metadata-only write.

A proxied repository creates no snapshots at all, per the model's settled rule; packument
arrival and revalidation are cache materialisation.

Two protocol behaviours ride on this section. Republishing an existing version is refused, as
the public registry refuses it; a registry that accepts it silently rewrites history that
lockfiles already pin. And the unpublish routes carry a trap: the npm client treats a 404 on
the `-rev` routes as "already gone" and exits 0, so an unrouted unpublish surface is a silent
no-op with a green exit code. AC9's case therefore asserts through the transcript and a
subsequent failed install, never through the client's exit code alone.

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
| The packument's versions replaced by a security-holding placeholder (the `0.0.1-security` shape, the "security holding package" description) | The **explicit security signal**: purge the cached content and alert the operator |
| Versions vanishing without that shape (author unpublish) | Keep serving, record an operator-visible divergence |
| A `deprecated` field appearing on versions | An ordinary metadata change, propagated at the next revalidation; never a removal event |

Detection happens at revalidation; whether anything more active exists is `proxy-cache.md` Q12
and is owned there. The holding-package shape is a heuristic against an unversioned upstream
convention, which is one more reason the corpus and the drift job re-ground it rather than this
table being trusted forever.

One assertion trap: npm keeps a client-side cache, so a second install that never contacts the
registry proves nothing about ours. AC6's case asserts both directions: the second install
reached this registry (transcript) and this registry did not contact the upstream (network
layer), with fresh client cache state as part of the case setup.

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
(the answers to Q2 and Q3, if divergent) goes on the recorded exception list **before** its flow
is expected to replay, per the settled corpus-source decision below.

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
      `proxy-cache.md` (its AC13).
- [ ] AC12: A packument request carrying the install-v1 Accept header receives the abbreviated
      document with the matching content type, a plain-JSON request receives the full document,
      and both are assembled from the same stored state, proven by a mutation appearing in both.
- [ ] AC13: A `PUT` publishing a version that already exists is refused, matching the public
      registry's refusal, and the refused request leaves no new snapshot behind.
- [ ] AC14: Before PyPI work begins and with the charter's Q3 answered, the experiment log
      holds npm's per-format cost under that settled attribution procedure, together with an
      explicit finding on whether the proxy layer built for OCI generalised, so the N+1
      comparison has its baseline.

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
| AC11 | integration | `internal/format/npm/removal_test.go` (test upstream presenting each event class; the shared-layer half is `proxy-cache.md` AC13's) |
| AC12 | integration | `internal/format/npm/packument_test.go` |
| AC13 | conformance | `conformance/npm/publish_test.go` (republish case) |
| AC14 | manual | `docs/internal/tasks/experiment-log.md`, reviewed before PyPI starts |

## Implementation Phases

### Phase 1: Hosted core
- Packument assembly and content negotiation, tarball serving, scoped names, publish with
  integrity verification and republish refusal

### Phase 2: Mutation surface
- dist-tags, unpublish, deprecation; the write-boundary declaration exercised end to end

### Phase 3: Proxied path
- Classification and URL rewriting, conditional revalidation, negative caching, the removal
  table and security-signal detection

### Phase 4: Corpus and gate
- Recording session across the named surface (after the harness redaction gate), replay-match,
  the second pinned client, experiment-log entries

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

The questions this spec raised before its first review were answered by the owner and folded
into the body; the 2026-09-25 first review raised Q2 and Q3 below. Resolved decisions are kept
rather than deleted, so the reasoning survives the next time someone asks why it was done this
way.

### Q2: What does the registry answer to the audit requests npm sends during every default install?

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

### Q3: Does hosted unpublish enforce the public registry's restrictions, or only our authorization?

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

### Resolved: corpus source (was Q1)

**Settled 2026-09-22: the public npm registry is authoritative**, per the general rule in
`foundation/conformance-harness.md` (whose resolved authoritative-reference record names this
spec as settled by it). Verdaccio is for offline iteration only. Any place where we knowingly
diverge from public-registry behaviour goes on the recorded exception list, with a reason.

Accepted cost: recording needs network access and is subject to the public registry's rate
limits, so corpora are committed rather than re-recorded per run, and a divergence this spec
chooses (Q2 and Q3 above are candidates) must be on the exception list before its flow is
expected to replay.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-25 | 331ef25 | first review: protocol grounding at published-contract level (the `npm/registry` docs describe reads only, so the write half is grounded in prior-art implementations and flagged for re-grounding in captured traffic per the standing rule) + adversarial + cross-spec (interface AC8/Q9 re-open gate, charter Q3's before-npm obligation from `question-triage.md`, data-model's write-boundary and snapshot rules and its AC13, proxy-cache's settled classification/removal/serve-stale/negative-caching decisions and its AC13, harness `setup` vocabulary, corpus rules and redaction gate, auth AC4, supply-chain-policy Q6, the catalogue's npm family row) + constitution; code-claim verification vacuous pre-implementation (no `internal/format/npm/`, no `conformance/npm/`) | The spec was a stub wearing a reviewed spec's frontmatter: no summary, no Design, no Phases, no Tasks, and its one resolved decision claimed it was "folded into Design and Scope above" when no Design section existed and no accepted cost was recorded - both corrected. Body built out from grounded protocol facts: the wire surface including the `-rev` unpublish routes (where an unrouted surface is a silent no-op because the client exits 0 on 404), content negotiation and the corgi Accept header, the encoded-slash routing trap, tarball URL rewriting, the write-boundary declaration `data-model.md` requires of every format spec, the proxied classification and npm's side of the settled removal table (security-holding shape purges; author unpublish keeps and flags; deprecation is never a removal), the client-side-cache trap that made AC6 vacuously passable, and the non-interactive auth path (token via `setup`, no new harness vocabulary). Scope gained unpublish, deprecation, republish refusal, content negotiation and security-signal detection; out-of-scope items each gained a non-effort reason. Six criteria added (AC9 unpublish with transcript assertions, AC10 deprecation both paths, AC11 the removal table, AC12 content negotiation, AC13 republish refusal, AC14 the measurement baseline) with Test Plan rows; AC7's row retargeted from `internal/proxy/` (which duplicated proxy-cache AC2/AC3) to an npm-path conformance case. Both blocking preconditions now recorded: the interface re-open (with its Q9 noted as widening the evidence set, not moving the gate) and charter Q3 before npm starts. Q2 (audit-request disposition: 404 vs empty stub vs forwarding, a security-posture and privacy call) and Q3 (hosted unpublish policy vs public-registry emulation) raised for the owner, not decided. Stays draft. |
