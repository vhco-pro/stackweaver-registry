---
status: draft
status_description: "Folded 2026-09-26 under the owner's standing delegation: Q1 (phases past PyPI, every unplaced subsystem given a build step), Q2 (pre-committed gate definition), Q3 (written cost procedure with Cost-Line trailers and a reproducible ledger) and Q6 (web UI criterion) adopted, plus new Q7 and Q8; AC8-AC10 rewritten, AC11-AC12 added. Zero open questions; stays draft pending a gate review."
description: "The project charter: what this builds, what it deliberately does not build, the autonomy experiment it doubles as, and the sequence that makes both work."
author: michielvha
goal: "Establish scope, positioning, the build order and the experiment's success metrics, so every downstream spec inherits a settled frame."
priority: "critical"
issue: 1
created: 2026-09-21
covers: []
---

# Plan: Project charter

Establishes what this project is, the order it gets built in, and the measurements that make it
a usable experiment in autonomous development rather than just an artifact repository.

## Context

The founding analysis is in `docs/internal/research/prior-art-artifact-repositories.md`. Its
conclusions, which this charter takes as settled - with one exception: that survey's closing
advice to refuse breadth is superseded, deliberately, in the Note on the reversal below:

- Free, multi-format **hosting** is solved (Gitea, Forgejo, GitLab CE). Free **OCI** is solved
  (Harbor, Quay, Zot).
- The unserved combination is multi-format plus **upstream proxy/caching** plus virtual
  aggregation plus UI plus SSO.
- The reason the free field is fragmented is *maintenance cost*, not build cost. Protocols
  change on their ecosystems' schedules and the treadmill kills volunteer projects.

That last point is the thesis. An executable conformance harness converts the treadmill into a
scheduled job, which is the one cost structure under which a free, well-maintained,
multi-format registry is plausible.

## Scope

**In scope**

- A content-addressable blob store over S3-compatible object storage, with safe blob GC (the
  collection strategy is settled in `docs/internal/plans/foundation/storage-and-gc.md`:
  mark-and-sweep with a grace period).
- A shared generic data model every format stores against - repository, package, version, file,
  blob, remote file, snapshot - so no handler owns a table
  (`docs/internal/plans/foundation/data-model.md`). Per the prior-art survey, this is the layer
  that makes breadth affordable.
- A format handler interface, with each handler serving both a **hosted** path and a
  **proxied/cached** path. `generic` is the single permitted exception to the proxied path,
  settled in `format-handler-interface.md`: it has no upstream ecosystem to proxy.
- **Breadth: 33 ecosystems across 33 protocol implementations**, reaching 50+ client tools and
  distributions, tiered in `docs/internal/plans/formats/catalogue.md`. The implementation count
  was "roughly 31" until 2026-09-26, when the catalogue split its "Git-backed" label into the
  three wire protocols it actually covered. Breadth is the moat, and what makes it affordable is
  the conformance harness rather than any collapsing of the count - families multiply *client
  reach* (one Maven-layout handler serves Maven, Gradle, SBT, Ivy and Leiningen), not the number
  of protocols to implement.
- A web UI, built at step 9 of the build order below, held to a thin definition-of-done
  criterion here (AC11). The detail (page inventory, per-format rendering, the design system) is
  owned by a future sibling web UI spec under `docs/internal/plans/foundation/`, which the spec
  loop is authoring; this charter sets the bar, that spec designs what clears it.
- **The foundation subsystems every format leans on**, each with a place in the build order
  below: artifact signature and attestation verification, a shared signing and index-generation
  service, asynchronous operations, a registry management surface, upstream adapters,
  observability, and deployment and configuration. Each is specced as its own foundation
  document; none of them is a format handler's business, because cross-format behaviour belongs
  in a shared layer (`CLAUDE.md`, Go rules).
- Upstream proxy/caching with TTLs, negative caching and an offline mode. This is the
  differentiator, and it is built alongside OCI at step 4 rather than after it, so the first
  proxyable format never has to retrofit one.
- OIDC SSO and RBAC, free, in the core product.
- **Three repository types**: `local`, `remote` and `virtual`, the model Artifactory established
  and users arrive expecting. Virtual repositories aggregate local and remote members and their
  member order **is** the resolution order. This was previously deferred and returned to v1 on
  2026-09-23, because the alternative is an ad-hoc failover-ordering field that reimplements
  aggregation badly (`data-model.md`, resolved upstream and repository structure).
- A conformance harness driving real package clients in containers.
- **Supply-chain policy and scanning** (`supply-chain-policy.md`), brought in 2026-09-23. The
  registry is the only place every artifact already passes, hosted and proxied alike, and a
  caching proxy that cannot refuse a known-malicious package is a faster way to fetch one.
  Built at step 4b, after artifact verification and before npm, for the reasons in its
  build-order row.
- **Replication between instances** (`replication.md`), brought in 2026-09-23. Content addressing
  and immutable snapshots make transfer idempotent and resumable, so the dependency that
  deferred it is discharged. Covers geo-distribution, disaster recovery and air-gapped export.
  Built at step 10, after Tier 1, because its hardest cases need formats with mutable metadata
  and signed indexes to exist.

**Out of scope, explicitly**


- Any ecosystem advertised before both its hosted and proxied paths pass conformance. The
  catalogue is a target list, not a marketing claim.

### Scope is not a constraint here

**Settled 2026-09-23, standing.** No human will work on this codebase. Build effort is therefore
not a reason to defer anything, and "this is a lot to build before v1 works" is not an argument
against a feature. The point of the project is to find the limits of what an agent fleet can
deliver, and scoping back to protect a schedule defeats it.

Two things this does **not** license, because they are not about effort:

- **Correctness risk is still a cost.** More moving parts in blob GC means more ways to lose
  data, whoever writes them. A decision that adds complexity to the component the charter names
  as most dangerous still has to earn it.
- **Evidence sequencing is still a reason to wait.** The handler-interface re-open waits for two
  real implementations because a guess made now is worse than a decision made from evidence
  later. That is not deferral for effort; it is deferral for information.

Anything previously deferred with a reason that reduces to "too much for v1" should be pulled
back in. Anything deferred for risk or evidence stays deferred, and says which.

### Speccing is not gated; building is

**Settled 2026-09-26 by the owner, standing.** Every one of the 33 catalogue ecosystems is
specced now, Tiers 2 and 3 included, in the same spec loop as the foundation. This is the
owner's decision, not an answer adopted under the standing delegation, and it follows from the
scope decision above: writing a spec costs effort, and effort is not a reason to defer.

The breadth gate keeps its full force over **building**. No Tier 2 or Tier 3 handler is
implemented until the gate at step 8 records a `continue` verdict (AC9), because per-format
cost falling is evidence, and evidence sequencing is a valid reason to wait. The two decisions
do not conflict: a spec is a document, and a `shrink` verdict turns an unbuilt spec into a
`parked` one rather than deleting it, so the reasoning survives for the day the question is
reopened.

A spec authored now is authored against today's foundation, and the foundation will move before
a Tier 2 or Tier 3 handler starts: the interface re-open, the shared signing service and the
async-operation model all land first. That is not a new gate. `/implement` already refuses to
start while a spec's last review is stale relative to `main`, so every early spec is re-reviewed
against the foundation it will actually be built on before its `/tasks` run.

### Note on the reversal

An earlier revision of this charter explicitly refused breadth, on the grounds that a
fifteen-front protocol war against incumbents who are already free is how a focused project dies.
**That reasoning assumed human-cost economics.** It is superseded deliberately, not forgotten.

The thesis of this project is that a conformance harness converts protocol work from judgment
into volume, and volume is what an agent fleet is for. If the harness generalises, each format
costs a fraction of the first and breadth becomes the one moat competitors cannot follow: Gitea
has 23 formats and cannot proxy, Harbor proxies and speaks only OCI, JFrog and Sonatype have both
and charge for SSO. **Breadth × upstream caching × free SSO is unoccupied precisely because it is
unaffordable to a human team.**

The bet is explicit and it has a real gate: the re-evaluation step in the build order below
(step 8, which is Phase 3 of `docs/internal/plans/formats/catalogue.md`) applies the
pre-committed definition in "The breadth gate's definition" below to the Tier 1 rows of the
experiment log. If per-format cost is not falling by that definition, the catalogue shrinks to
what is already delivered, and every unbuilt Tier 2 and Tier 3 spec is set to `parked`.

## Design

### Build order, and why each step earns its place

Step numbers 1 to 8 are stable, because sibling specs cite them; subsystems placed between two
existing steps take a letter rather than renumbering everything after them.

| # | Step | Why here |
|---|---|---|
| 1 | **Conformance harness** | The harness is the product; the server is what satisfies it. Built before any handler, against a deliberately trivial format. |
| 2 | **Generic format**, with the **management surface core**, the **configuration and deployment baseline** and the **observability baseline** | Trivial protocol. Its job is to prove the harness, the CAS, auth and the CI wiring end to end with nothing else in the way. The three subsystems land here because generic cannot run without them: the harness `setup` provisions repositories and tokens through the management surface, so its core (repository and token operations) must exist before the first case; the harness starts the server in a container from configuration, so loading and validating configuration is the first thing the binary does; and the fault-injection and benchmark evidence of steps 3 and 4 needs signals that exist before the components they observe, since concurrency, durability and performance have no client oracle (`CLAUDE.md`). |
| 3 | **Shared data model, CAS + GC** | The schema all 33 ecosystems store against (`data-model.md`, what makes breadth affordable), plus the blob store and GC, which is where data loss lives. |
| 4 | **OCI plus the proxy/cache layer and upstream adapters** | The official conformance suite is a pass/fail gate written by the standards body: hardest protocol, strongest oracle. The proxy layer is built here rather than after, because OCI is the first format that can be proxied and retrofitting it is what this charter forbids. Upstream adapters (per-upstream authentication, rate-limit handling, the preconfigured upstream set) are built with it for the same reason: Docker Hub pull-through is the first real upstream and it already needs token exchange and rate-limit handling; each later format adds its own upstream's specifics through the adapter seam rather than inside its handler. Deployment packaging (container image, chart, documented configuration) completes in this step, because the repository goes public at the first working format and a public first impression has to run. |
| 4a | **Debian write-triggered services prototype, then the handler-interface re-open** | Unchanged from 2026-09-23: after OCI passes, `write-triggered-services-prototype.md` supplies the evidence the scheduled re-open needs, and the re-open completes before any Tier 1 handler (`format-handler-interface.md` AC8). The prototype is disposable; the production signing and index service is step 7's first item. |
| 4b | **Artifact verification, then supply-chain policy** | Supply-chain policy consumes signature and attestation state that no other spec produces, so verification is built first, as a shared service rather than inside whichever format first meets a signature. Policy is placed after the re-open and **before npm**, for two reasons. Its evaluation hook and component inventory may bend the handler interface; landing that before npm puts any amendment before the measurement baseline rather than inside the Tier 1 series, where it would contaminate the N+1 comparison. And every format from npm onward is then built with enforcement on both paths from its first commit, which is the same no-retrofit reasoning that moved the proxy layer into step 4. Its proxied phase depends on the proxy layer, which step 4 has delivered. |
| 5 | **npm** | Most-wanted proxy cache in real life, the first test of whether the proxy layer built for OCI generalises, and the **measurement baseline**: the cost procedure in "Measuring per-format cost" below is in force from npm's first commit (AC10). |
| 6 | **PyPI** | The generalisation test. If npm-to-PyPI is cheaper than generic-to-npm, the experiment has its headline finding. |
| 6a | **Asynchronous operations, then Ansible collections** | Ansible collections is promoted into Tier 1 (`catalogue.md`, the resolved tier-gate decision) and keeps its early slot, because it is the one ecosystem where hosting alone is differentiating. Its publish returns an import task the client polls, the first client-visible asynchronous operation in the build order, so the shared async-operation subsystem is built immediately before it rather than inside the handler. How an asynchronous operation is modelled is a question for the step 4a re-open, which has Ansible's evidence in hand; only its production form is built here. |
| 7 | **Tier 1 remainder**, starting with the **shared signing and index service** | The service is the production form of what the step 4a prototype learned, built once before Helm, the first remaining format with a write-triggered generated index, so Helm, Debian and RPM consume one service rather than the first of them growing it inside a handler and charging a shared layer to its own cost line. Then, in the catalogue's order: Maven (unlocks the whole JVM in one handler), Go modules, NuGet, Helm, the full Debian and RPM handlers (signed-index formats last within the tier). |
| 8 | **Re-evaluate: the breadth gate** | The owner applies the pre-committed definition below to the Tier 1 rows and records `continue` or `shrink` (AC9). Continue to step 11 only on `continue`. |
| 9 | **Surface: the full management surface, the web UI, OIDC SSO and RBAC administration** | Not gated by the breadth verdict, because it is not breadth. Placed after Tier 1 for evidence: the UI renders the shared model's entities for every implemented format, and drawing its per-format rendering contract from nine real formats is better than guessing it from two. The management surface completes first because the UI is its client. Token authentication and repository-scoped authorisation are not deferred to here; generic proves them at step 2. |
| 10 | **Replication** | Not gated by the breadth verdict. `replication.md` transfers snapshots of every format generically, so its hardest cases need formats that already exist: mutable metadata (npm, PyPI) and signed indexes (Debian, RPM), where a follower must serve indexes it did not sign. Before Tier 1 completes, those cases cannot be written against anything real. |
| 11 | **Tiers 2 and 3** | Only after a `continue` verdict at step 8. The specs already exist; this step builds handlers, one per ecosystem, each re-reviewed against the then-current foundation before its `/tasks` run. |

### Measuring per-format cost

This is the procedure AC8 and AC10 assert. It is in force from npm's first commit, because npm
is the baseline and a baseline collected under an undefined procedure is not a baseline.

**Cost lines.** Every unit of work is charged to exactly one line from a closed list: a format
line, `format:<name>`, one per catalogue ecosystem; or a shared line, `shared:<layer>`, one per
foundation subsystem (`harness`, `data-model`, `storage`, `proxy`, `upstream`, `auth`,
`interface`, `verification`, `policy`, `async`, `signing`, `management`, `observability`,
`deploy`, `ui`, `replication`). The list lives in the experiment log and grows only by a dated
entry there.

**The path rule decides the line, not the author.** Work under `internal/format/<name>/`,
`conformance/<name>/` or the format's own spec is `format:<name>`. Everything else is shared.
A commit touching both a format path and a shared path is refused, so the attribution of every
line of code is mechanical rather than a judgment call.

**Commits.** Every commit carries one `Cost-Line:` trailer naming its line, checked against the
path rule by the commit-msg hook and re-checked in CI.

**Sessions.** Every agent session serves one cost line and writes one ledger record at its end:
the line, the model tier, and the harness's own usage figures (input, output, cache-write and
cache-read tokens). When a format session discovers that a shared layer must change, the
session stops and a new session is opened on the shared line, recording `triggered-by:
format:<name>`. If that discipline is breached and one session did both, the whole session is
charged to the format. Every tie-break falls against the thesis, so no attribution error can
make a format look cheaper than it was.

**Units.** Tokens are recorded raw, per model tier. The headline figure is a single cost number
priced from a price table frozen in the experiment log on the day npm starts, so a provider's
price change never shows up as a change in format cost.

**What a format's row holds.** Four cost figures, of which one is the headline:

| Figure | Definition | Used for |
|---|---|---|
| **Direct build cost** | Sessions on `format:<name>` from its `/tasks` run to its definition of done | Reported |
| **Loaded build cost** (headline) | Direct build cost plus every shared-line session recording `triggered-by: format:<name>` | The N+1 comparison and the breadth gate. A shared layer that failed to generalise shows up here, charged to the format that exposed it |
| **Spec cost** | Sessions authoring and reviewing the format's spec before its `/tasks` run | Reported, never compared: every spec was authored in one batch loop, so its cost cannot reflect build order |
| **Cost per conformance case** | Loaded build cost divided by the format's case count | Reported as a difficulty-adjusted view, never used by the gate, because case depth varies |

Shared work that the build order schedules as its own step (the proxy layer at step 4, the
signing service at step 7) is charged to its shared line with no `triggered-by`, and so to no
format. Shared work nobody scheduled, discovered because a format needed it, is `triggered-by`
that format. That distinction is what keeps npm from carrying the proxy layer's construction and
PyPI from inheriting it for free, which was the bias built into the schedule before this
procedure existed.

Human interventions and defect escapes keep the experiment log's existing definitions, with
interventions on shared-line sessions recorded against the triggering format when there is one.

### The breadth gate's definition

Committed on 2026-09-26, before any Tier 1 cost exists, which is the point: the verdict is
checked against numbers chosen before anyone knew them.

**The series** is the nine Tier 1 formats in build order: npm, PyPI, Ansible collections, Maven,
Go modules, NuGet, Helm, Debian, RPM. Generic and OCI are excluded, because they carried the
harness and the proxy layer's first construction and are not comparable.

**Per-format cost is falling** when all three hold:

1. The median loaded build cost of the last five formats (Go modules, NuGet, Helm, Debian, RPM)
   is at most 70% of the median of the first four (npm, PyPI, Ansible collections, Maven).
   The expensive signed-index formats sit in the second half, which is fair only because the
   signing and index service is a scheduled shared step charged to no format.
2. Architectural interventions per format in the last five do not exceed those in the first
   four, by median.
3. Defect escapes per format in the last five do not exceed those in the first four, by median.
   A format that got cheaper by shipping more defects did not get cheaper; the cost moved.

If all three hold, the definition says `continue`. Otherwise it says `shrink`.

**The owner records the verdict.** The gate verdict is an adjudication, not an open question, so
the standing delegation does not reach it: an agent prepares the evidence (the computed rows and
the definition's outcome), the owner records `continue` or `shrink`. A verdict that departs from
the definition's outcome states the departure and its reason in the same entry. The definition
itself changes only by a dated edit to this section, and a change made after any Tier 1 row
beyond npm has been recorded obliges the verdict to report its outcome under both the original
and the revised definition.

### Language

**Go.** The decision and its reasoning, recorded so it is not relitigated:

- Every reference implementation is Go (`distribution/distribution`, `go-containerregistry`,
  Harbor, Zot, Gitea, containerd), so working implementations are readable in the target
  language.
- Agents produce more correct Go per token. Rust turns "almost right" into "does not compile",
  which in an autonomous loop spends iterations on lifetimes rather than protocol correctness.
- The workload is I/O-bound byte-shuffling to object storage. Rust's advantage is marginal here.

Rust would be a legitimate *different* experiment ("can agents do Rust"). It is not this one.

### Licence

Apache 2.0, including SSO and RBAC. The entire pitch is "the free one"; a source-available
licence collapses that claim on contact with Harbor (Apache 2.0) and Gitea (MIT).

## Acceptance Criteria

- [ ] AC1: The conformance harness runs a real package client in a container against a running
      server and reports per-case pass/fail, with no handler-specific code in the harness core.
- [ ] AC2: `make conformance` is a single command that runs every format's suite and exits
      non-zero if any case fails or is skipped without a recorded issue number.
- [ ] AC3: The OCI format passes the official `opencontainers/distribution-spec` conformance
      suite with zero skips.
- [ ] AC4: For every implemented format, both the hosted path and the proxied path are covered by
      conformance cases; no format ships with only one path tested. `generic` is the single
      permitted exception, recorded in `format-handler-interface.md` and in its own spec.
- [ ] AC5: Blob GC never deletes a blob that is referenced by a live manifest, proven under
      concurrent push and interrupted upload by a fault-injection test, not by a client run.
- [ ] AC6: A CI benchmark gate fails the build on a regression beyond a stated threshold for
      blob upload and download throughput.
- [ ] AC7: OIDC SSO and RBAC are functional in the default build with no licence flag, feature
      flag, or paid tier gating them.
- [ ] AC8: The N+1 comparison is reproducible from committed data: recomputing the cost ledger
      under the procedure in "Measuring per-format cost" yields exactly every per-format row of
      `docs/internal/tasks/experiment-log.md` from npm onward, each carrying the direct build
      cost, loaded build cost, spec cost, cost per conformance case, human interventions with
      the architectural ones split out, and defect escapes, priced from the price table frozen
      on the day npm started.
- [ ] AC9: No handler code for a Tier 2 or Tier 3 ecosystem exists on `main` unless the
      experiment log holds an owner-recorded breadth-gate verdict of `continue` that states the
      outcome of "The breadth gate's definition" on the nine Tier 1 rows, and, if the verdict
      departs from that outcome, the departure and its reason. After a `shrink` verdict every
      unbuilt Tier 2 and Tier 3 spec has status `parked`.
- [ ] AC10: From npm's first commit onward, every commit on `main` carries exactly one
      `Cost-Line:` trailer naming a line from the ledger's closed list, the named line agrees
      with the path rule (a commit touching a format path names `format:<name>`, any other names
      a `shared:` line), no commit touches both a format path and a shared path, and every agent session has one ledger record naming one cost line,
      with a `triggered-by:` format on every unscheduled shared-line session.
- [ ] AC11: The default build serves a web UI, behind no licence or feature flag, in which a
      user signed in through OIDC browses the repositories, packages and versions of every
      implemented format, and creates a remote repository with its upstream, which then serves
      a proxied install to a real client.
- [ ] AC12: No format handler reaches `main` before every shared subsystem the build order
      places ahead of it has met its own criteria: npm's handler follows artifact verification
      and supply-chain policy enforcement on both paths (step 4b), Ansible collections' handler
      follows the asynchronous operations subsystem (step 6a), and Helm's handler follows the
      shared signing and index service (step 7). Tier 2 and Tier 3 handlers additionally follow
      AC9.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | integration | `conformance/harness_test.go` |
| AC2 | ci | `.github/workflows/ci.yml` conformance job |
| AC3 | conformance | `conformance/oci/` |
| AC4 | conformance | `conformance/<format>/hosted_test.go`, `proxied_test.go` |
| AC5 | property / fault injection | `internal/storage/gc_test.go` |
| AC6 | benchmark | `internal/storage/bench_test.go` + CI gate |
| AC7 | integration | `internal/auth/oidc_test.go` |
| AC8 | ci | `scripts/cost-report.js --check` in `make verify`: recomputes the experiment log's per-format table from the ledger and fails when the committed table differs |
| AC9 | ci + manual | structure check in `make verify`: an `internal/format/<name>` for a Tier 2 or Tier 3 catalogue row fails without a `continue` verdict entry, and a `shrink` entry fails while any unbuilt Tier 2 or 3 spec is not `parked`; the verdict's content is reviewed by the owner against "The breadth gate's definition" at step 8 |
| AC10 | ci | `.githooks/commit-msg` trailer and path-rule check, re-run over the pushed range by `.github/workflows/ci.yml`; ledger records validated by `scripts/cost-report.js --check` |
| AC11 | e2e | Playwright suite under `web/e2e/` against a running server with an OIDC stand-in, ending in a real-client proxied install through the repository the UI created |
| AC12 | manual | Implementation Phases below: each phase lists its entry conditions, and they are ticked, citing the criteria met, before the phase's first handler commit |

## Implementation Phases

Phases follow the build order above one to one, so the phase plan reaches the moat the charter
bets on rather than stopping short of it.

### Phase 1: Foundation (steps 1 to 3)
- Conformance harness spec and implementation
- Generic format as the harness's first subject, with the management surface core, the
  configuration and deployment baseline and the observability baseline it needs to run
- Shared data model, CAS and GC (specs exist; implementation lands here), with the benchmark gate

### Phase 2: The hard oracle (steps 4 and 4a)
- OCI handler against the official conformance suite
- The proxy/cache layer and upstream adapters, built with it rather than after it
- Deployment packaging, before the repository goes public at the first working format
- Debian signed-index prototype, then the scheduled handler-interface re-open

### Phase 3: Enforcement before the baseline (step 4b)
- Entry: the re-open is complete (`format-handler-interface.md` AC8)
- Artifact signature and attestation verification
- Supply-chain policy: scanning, evaluation, and the proxied path, exercised over OCI

### Phase 4: The differentiator and the baseline (step 5)
- Entry: Phase 3's criteria met (AC12); the cost procedure in force, with the cost-line list,
  the ledger and the frozen price table recorded in the experiment log (AC10)
- npm, hosted and proxied, testing whether the proxy layer built for OCI generalises

### Phase 5: The generalisation test (steps 6 and 6a)
- PyPI, measuring cost against npm
- Asynchronous operations, then Ansible collections (entry: the async subsystem's criteria met)

### Phase 6: Tier 1 remainder (step 7)
- The shared signing and index service (entry for Helm, Debian and RPM)
- Maven, Go modules, NuGet, Helm, Debian, RPM, in that order

### Phase 7: The breadth gate (step 8)
- The owner's verdict against the pre-committed definition, recorded in the experiment log

### Phase 8: Surface (step 9, not gated by the verdict)
- The full management surface, then the web UI, OIDC SSO and RBAC administration

### Phase 9: Replication (step 10, not gated by the verdict)
- Pull replication, air-gapped export and import, retention coordination (`replication.md`)

### Phase 10: Tiers 2 and 3 (step 11, only on `continue`)
- One handler per ecosystem against its existing spec, each spec re-reviewed first

## Tasks

Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. The four questions left by the 2026-09-22 review (Q1, Q2, Q3, Q6) were adopted on
2026-09-26 under the owner's standing delegation and folded into Scope, Design, the criteria and
the phases above; folding them exposed two further judgment calls (Q7, Q8), adopted the same
way. Every adopted answer is reversible by the owner. The decisions resolved earlier follow,
kept so the reasoning survives.

### Resolved: extending the phases past PyPI (was Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A, refined by the
catalogue's answer to the same tension: the missing phases are appended, and Ansible
collections keeps its early slot **by promotion into Tier 1** rather than as an exception to tier
order, because `catalogue.md` adopted that promotion in the same pass. The build order now also
places every subsystem that had no step: replication (step 10), supply-chain policy and artifact
verification (step 4b), the write-triggered services prototype (step 4a, unchanged), the async
operation subsystem (step 6a), the shared signing and index service (step 7), the management
surface (core at step 2, the rest at step 9), upstream adapters (step 4), observability and
deployment (baselines at step 2, packaging at step 4), and the web UI (step 9). Each step's
reason is in its row. AC12 asserts the ordering where it matters for evidence.

Accepted cost: Tier 1 grows to nine and absorbs a format whose case is market position rather
than adoption volume, and the build order grows three lettered steps so that sibling citations
of steps 1 to 8 stay valid. Strict tier order (B) lost because it would push the one
hosting-differentiating format behind eight others for no evidential gain, and an exception
clause (A as first written) lost to promotion because a gate with a documented bypass is the
ceremonial gate `catalogue.md` was trying to close.

| Option | You get | It costs |
|---|---|---|
| **A. Append tier phases, keep the early exceptions** | Phases 6-8 add the Tier 1 remainder, breadth gate and Tier 2/3 fan-out; Ansible collections and the UI stay early, with Ansible recorded as a named exception to tier order in the catalogue | The catalogue's "Tier 1 before Tier 2" rule gains an exception clause, and the tier table stops being the sole source of order |
| **B. Strict tier order** | One source of truth: phases mirror the catalogue exactly | Ansible leaves Phase 4 and the log's first five rows; the one hosting-differentiating format waits behind eight Tier 1 formats |

### Resolved: what triggers the breadth gate's shrink outcome (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation.** Option C: a pre-committed
definition, adjudicated by the owner. The definition is written into this charter's Design
("The breadth gate's definition") rather than only into the experiment log, because the charter
is versioned, reviewed and staleness-checked and the log is not; the log's verdict entry cites
it. It was committed before any Tier 1 cost exists, which is what the option required. AC9
asserts the verdict's shape and the `parked` consequence of `shrink`.

Accepted cost: the thresholds (Q8) are chosen blind and may prove wrong; the daylight-revision
rule, which forces a late revision to report both outcomes, is the price of being allowed to
fix them. Owner judgment on the raw table (A) lost because it makes the gate unfalsifiable; a
hard rule with no adjudication (B) lost because blind thresholds with no escape valve would
turn a wrong guess into a wrong verdict.

| Option | You get | It costs |
|---|---|---|
| **A. Owner judgment on the raw table** | Flexibility; no premature metric | The gate is unfalsifiable and post-hoc rationalisation is easy |
| **B. Hard quantitative rule fixed now** | Fully falsifiable | Thresholds picked before any data exist will be wrong in an unknown direction |
| **C. Pre-committed definition, owner adjudicates** | Falsifiable, and revisable in daylight if the definition proves wrong | The definition must be written into the log before the Tier 1 data arrive, or it binds nobody |

### Resolved: how per-format cost is measured and attributed (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B, with C's normalised view
kept as a reported column the gate never reads. The written procedure is Design's "Measuring
per-format cost": a closed list of cost lines, a mechanical path rule, a `Cost-Line:` trailer
on every commit, one ledger record per session, `triggered-by` for unscheduled shared work, a
price table frozen when npm starts, and the loaded build cost as the headline. AC8 asserts that
the log's rows are reproducible from the ledger, AC10 that the tagging is in force from npm's
first commit. This discharges the obligation that the question be answered before npm starts.

Accepted cost: tagging discipline on every commit and session, a commit-msg hook that refuses
mixed commits, and a conservative tie-break that charges a breached session wholly to the
format. Charging each session to the current format (A) lost because it bakes the headline
finding into the schedule; normalising by case count as the headline (C) lost because case
depth varies, so the unit is soft.

| Option | You get | It costs |
|---|---|---|
| **A. Charge each session to the current format** | Trivially simple bookkeeping | Comparisons are confounded; the experiment's headline claim is unsupportable |
| **B. Shared-infrastructure line items; format = handler + conformance only** | Comparable per-format numbers | Tagging discipline on every session, and a judgment call whenever work is partly shared |
| **C. Normalise the headline metric by conformance case count** | Difficulty-adjusted comparisons across unequal protocols | Case counts vary in depth, so the unit is soft; needs B underneath anyway |

### Resolved: when the proxy obligation attaches (was Q4)

**Settled 2026-09-23: the proxy layer is built with OCI, not after it.** It moves from build-order
step 5 into step 4, developed alongside the OCI handler.

This resolves a four-way contradiction the review found: this charter said the proxy layer is
"designed in from format two, never retrofitted" while scheduling it after OCI; `proxy-cache.md`
said mandatory from the second format; and `oci.md` AC6 requires a proxied pull. As previously
ordered, OCI's proxied path was precisely the retrofit this document forbids, on the very first
format that could have had one.

OCI is also the first format that *can* be proxied, since `generic` is exempt, so the two are
natural co-development rather than an arbitrary pairing. Pull-through caching of Docker Hub is a
wanted feature in its own right.

Accepted cost: step 4 becomes a larger single step, and the proxy layer is shaped by one format
before npm tests whether it generalises. The npm step must therefore treat "did the proxy layer
generalise" as an explicit finding for the experiment log, not an assumption.

### Resolved: the generic proxy exemption in the constitution (was Q5)

**Closed 2026-09-22 as a documentation correction, not an owner decision.** The owner
had already settled that `generic` is exempt from the proxied-path obligation; `CLAUDE.md`
simply had not been updated to record it, so the rule read as absolute. The constitution
now names the exemption and states that no other format may use it without a spec change.

Raised independently by two reviewers, from this spec and from the other one.

### Resolved: a web UI criterion in the charter (was Q6)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a thin criterion now,
AC11, with the detail left to a future sibling web UI spec under
`docs/internal/plans/foundation/`, which the spec loop is authoring. The criterion is slightly
wider than the recommendation's wording: the upstream the UI configures must then serve a
proxied install to a real client, so the criterion cannot be met by a form that writes a row
nothing reads. Scope names the UI's step (9) and its sibling spec.

Accepted cost: minimal UI scope is pre-committed before the surface spec exists, and that spec
must satisfy AC11 rather than redefine it. No criterion (B) lost because it leaves the charter
satisfiable as "Pulp with more formats", the exact failure mode its positioning dismisses.

| Option | You get | It costs |
|---|---|---|
| **A. Thin UI criterion now** | The UI is inside the charter's definition of done | Pre-commits minimal UI scope before the surface spec exists |
| **B. No criterion until the web-ui spec** | The charter stays lean and defers to the specialist spec | Until that spec exists, the charter is satisfiable as "Pulp with more formats" |

### Resolved: where supply-chain policy sits relative to npm (was Q7)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A, folded as build step 4b,
Phase 3, and AC12's first clause. Accepted cost: the baseline starts later, which the standing
scope decision says is not a reason to prefer B; B's contamination and C's retrofit are both
correctness-of-evidence costs, which are.

Raised while folding Q1: the build order needed a place for supply-chain policy, and the two
defensible places pull in opposite directions.

**Recommendation:** A - before npm, because any interface amendment its hook forces then lands
before the measurement baseline instead of inside the Tier 1 series.

| Option | You get | It costs |
|---|---|---|
| **A. After the re-open, before npm (step 4b)** | Every format from npm on is built with enforcement from its first commit; any interface bend lands before the baseline; OCI gives policy a real format with mature scanning prior art to run against | The npm baseline, and so the headline measurement, starts later |
| **B. After PyPI, before the Tier 1 remainder** | The headline measurement starts sooner | npm and PyPI retrofit enforcement, the remaining seven formats do not, and an interface amendment from the hook lands mid-series, contaminating exactly the comparison the project exists to make |
| **C. After the breadth gate** | Policy designed against the most formats | Nine formats retrofit enforcement, the pattern the charter forbids for the proxy layer |

**Why this is yours:** it trades the date of the headline finding against its cleanliness.

### Resolved: the breadth gate's thresholds (was Q8)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A, written into Design's
"The breadth gate's definition". Accepted cost: the 70% figure is a guess; a 30% fall across
halves is large enough that it is unlikely to be noise and small enough that a genuinely
generalising harness should clear it, and the daylight-revision rule governs any change.

Raised while folding Q2: adopting a pre-committed definition means writing one, and the numbers
are a judgment call of their own.

**Recommendation:** A - compare the medians of the two halves of the Tier 1 series, with vetoes
for architectural interventions and defect escapes.

| Option | You get | It costs |
|---|---|---|
| **A. Second-half median at most 70% of first-half median, with intervention and defect vetoes** | Robust to one outlier format in either half; the vetoes stop a fall in cost that was bought with judgment leakage or defects from counting | 70% is chosen blind; halves of four and five formats are small samples |
| **B. A negative rank correlation between build position and loaded cost** | Uses every point, not two medians | Nine points give a statistic that noise can flip; hard to read in a verdict entry |
| **C. The last format costs at most half of npm** | Simplest possible rule | One format decides the verdict, and the last Tier 1 format (RPM) is a signed-index format, the expensive class, so the rule is biased toward `shrink` |

**Why this is yours:** a threshold chosen before data exist is exactly the adjudication the
experiment reserves for the owner.

The entries below were resolved before 2026-09-26. Their question numbers come from earlier
rounds and are reused above, so a "was Qn" label is only unique within its round.

Resolved decisions are kept rather than deleted, so the reasoning survives the next time
someone asks why it was done this way.

### Resolved: naming (was Q2)

**Settled 2026-09-22: `Stackweaver Registry`, at `vhco-pro/stackweaver-registry`.** The owner
holds the Stackweaver trademark, so this both removes the JFrog trademark exposure the previous
name carried and puts the project under an owned brand. Same brand, separate platform, which is
the intended marketing position.

The module path is `github.com/vhco-pro/stackweaver-registry` and was set before any code existed
that could depend on it.

### Resolved: going public (was Q1)

**Settled 2026-09-22: at the first working format. Reaffirmed 2026-09-23 with a new reason and a
blocking precondition.**

A public repository holding only specs invites drive-by judgement and attracts no contributors; a
first impression that actually runs is worth the wait. The repository stays private until then.

**The stronger argument is now economic, not positional.** Public repositories get free unlimited
standard GitHub Actions minutes; private ones consume quota. Since CI economy is a CRITICAL rule
in `CLAUDE.md` and the conformance suite is minutes-long by design, going public removes the
budget constraint that shapes several decisions in these specs - including the one gating
conformance to `main` pushes only. **Revisit that CI decision when the repository goes public**,
because its accepted cost (a green pull request can hide broken conformance) was priced against a
budget that will no longer exist.

### Blocking precondition: corpus redaction

**The repository must not go public after any golden corpus has been committed without redaction
shipping first.** Four separately reasonable decisions combine into a credential leak: the
recording proxy captures traffic against the real public registry, corpora are committed in-repo,
this repository eventually goes public, and the drift job attaches failing transcripts to issues.

It is safe today only because no corpus exists yet. The ordering rule is therefore absolute:
**redaction (`conformance-harness.md` AC13) ships before the first corpus is committed**, whether
or not the repository is public by then. Going public is not what creates the hazard; recording
without redaction is.

### Resolved: first milestone (was Q3)

**Settled 2026-09-22: prove the thesis.** Optimise for the generalisation measurement - does
format N+1 cost less than format N - because that is the transferable finding and it decays the
moment this becomes a product schedule.

Accepted cost: nothing shippable for months. The experiment log is therefore a first-class
deliverable, not a side note.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-22 | afbb4e4 | adversarial + constitution + cross-spec consistency (claim verification vacuous pre-code) | Half-applied breadth reversal found (phases still end at the old five-format plan); fixes applied (data model into scope and build order, stale GC note, generic exception in AC4, gate reference, AC9); six open questions raised. Stays draft. |
| 2026-09-23 | 9c971d4 | cross-spec consistency (build sequencing) | Scheduled the Debian signed-index prototype and handler-interface re-open after OCI and before npm, distinguished the later full Debian handler, and corrected stale step numbers; existing open questions still keep the charter draft. |
| 2026-09-26 | 4d1aeb1 | folding adopted recommendations under the standing delegation | Adopted Q1 (append phases; Ansible early by Tier 1 promotion, not exception), Q2 (C: pre-committed definition, owner adjudicates), Q3 (B: shared-line ledger, format = handler + conformance, C kept as a reported column) and Q6 (A: thin UI criterion), and two questions the fold exposed: Q7 (supply-chain policy before npm) and Q8 (gate thresholds: second-half median at most 70% of first-half, with intervention and defect vetoes). Body changes: recorded the owner's spec-everything decision (speccing ungated, building gated); build order extended to steps 4b, 6a, 9, 10, 11 with a reason per placement for replication, supply-chain policy, artifact verification, the write-triggered prototype, async operations, the signing and index service, the management surface, upstream adapters, observability, deployment and the web UI; step 7 reordered to the catalogue's order; new Design sections for the cost procedure and the gate definition; AC8 (reproducible ledger), AC9 (gate verdict and parking) and AC10 (Cost-Line tagging) rewritten or added, AC11 (web UI) and AC12 (shared subsystems before their first consumer) added, each with a Test Plan row; phases extended to ten, one per build step group; breadth headline corrected to 33 implementations. Stays draft: no gate review has been run. |
