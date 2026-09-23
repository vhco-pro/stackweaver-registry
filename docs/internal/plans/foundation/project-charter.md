---
status: draft
status_description: "Reviewed 2026-09-22 (adversarial + constitution): factual fixes applied; six open questions raised (phase-plan reconciliation, breadth-gate decision rule, cost attribution, proxy sequencing, a CLAUDE.md amendment, a UI criterion). Stays draft until the owner answers."
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
- **Breadth: 33 ecosystems across roughly 31 protocol implementations**, reaching 50+ client
  tools and distributions, tiered in `docs/internal/plans/formats/catalogue.md`. Breadth is the
  moat, and what makes it affordable is the conformance harness rather than any collapsing of the
  count - families multiply *client reach* (one Maven-layout handler serves Maven, Gradle, SBT,
  Ivy and Leiningen), not the number of protocols to implement.
- A web UI, after the formats work.
- Upstream proxy/caching with TTLs, negative caching and an offline mode. This is the
  differentiator, and it is built alongside OCI at step 4 rather than after it, so the first
  proxyable format never has to retrofit one.
- OIDC SSO and RBAC, free, in the core product.
- A conformance harness driving real package clients in containers.

**Out of scope, explicitly**

- Vulnerability scanning and signing enforcement as original work. Harbor does these well;
  integrate later, do not reimplement.
- Any ecosystem advertised before both its hosted and proxied paths pass conformance. The
  catalogue is a target list, not a marketing claim.
- Virtual/aggregate repositories, for now. They are part of the unserved combination this
  charter cites, so they are deferred rather than refused: a follow-on to the proxy layer,
  kept out of `proxy-cache.md` v1 so that spec stays shippable.

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
(step 8, which is Phase 3 of `docs/internal/plans/formats/catalogue.md`) re-reads the
experiment log, and if per-format cost is flat rather than falling, the catalogue shrinks to
what is already delivered.

## Design

### Build order, and why each step earns its place

| # | Step | Why here |
|---|---|---|
| 1 | **Conformance harness** | The harness is the product; the server is what satisfies it. Built before any handler, against a deliberately trivial format. |
| 2 | **Generic format** | Trivial protocol. Its job is to prove the harness, the CAS, auth and the CI wiring end to end with nothing else in the way. |
| 3 | **Shared data model, CAS + GC** | The schema all 33 ecosystems store against (`data-model.md`, what makes breadth affordable), plus the blob store and GC, which is where data loss lives. |
| 4 | **OCI plus the proxy/cache layer** | The official conformance suite is a pass/fail gate written by the standards body: hardest protocol, strongest oracle. The proxy layer is built here rather than after, because OCI is the first format that can be proxied and retrofitting it is what this charter forbids. After OCI passes, the Debian signed-index prototype and scheduled handler-interface re-open complete before step 5. |
| 5 | **npm** | Most-wanted proxy cache in real life, and the first test of whether the proxy layer built for OCI generalises. |
| 6 | **PyPI** | The generalisation test. If npm-to-PyPI is cheaper than generic-to-npm, the experiment has its headline finding. |
| 7 | **Tier 1 remainder** | Maven (unlocks the whole JVM in one handler), Go modules, NuGet, the full Debian and RPM handlers (the signed-index prototype already informed the pre-npm interface re-open), Helm. |
| 8 | **Re-evaluate, then Tiers 2 and 3** | The breadth gate. Continue only if per-format cost is falling. `docs/internal/plans/formats/catalogue.md`. |

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
- [ ] AC8: `docs/internal/tasks/experiment-log.md` records, per format, the human intervention
      count, the token cost and the defect escape count, sufficient to answer whether format N+1
      cost less than format N.
- [ ] AC9: The breadth gate's verdict is recorded in the experiment log as an explicit continue
      or shrink decision that cites the per-format cost rows it was made on; no Tier 2 work
      begins without that entry.

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
| AC8 | manual | `docs/internal/tasks/experiment-log.md`, reviewed per format |
| AC9 | manual | `docs/internal/tasks/experiment-log.md`, at the catalogue's Phase 3 gate |

## Implementation Phases

### Phase 1: Foundation
- Conformance harness spec and implementation
- Generic format as the harness's first subject
- Shared data model, CAS and GC (specs exist; implementation lands here)

### Phase 2: The hard oracle
- OCI handler against the official conformance suite
- The proxy/cache layer, built with it rather than after it
- Debian signed-index prototype, then the scheduled handler-interface re-open

### Phase 3: The differentiator
- npm, hosted and proxied, testing whether the proxy layer built for OCI generalises

### Phase 4: The generalisation test
- PyPI, measuring cost against npm
- Ansible collections

### Phase 5: Surface
- Web UI, OIDC SSO, RBAC

## Open Questions

Six questions from the 2026-09-22 review await the owner. The previously resolved decisions
follow them, kept so the reasoning survives.

### Q1: How should the Implementation Phases be extended past PyPI, now that the charter bets on breadth?

Phases 1-5 still describe the pre-reversal five-format plan: they end at PyPI, Ansible
collections and the UI, with no phase for the Tier 1 remainder (build-order step 7), the
breadth gate, or the Tier 2/3 fan-out. The moat the charter now bets on is never
reached by its own phase plan. Ansible collections (Tier 3) is also built in Phase 4, before
the gate that decides whether Tier 3 happens at all, against the catalogue's tier order and
its AC5.

**Recommendation:** A - the early Ansible slot is clearly recorded intent (Phase 4 here, the
experiment log's fifth row, the catalogue's own "tier position understates its value" note),
so make it an explicit exception rather than a silent contradiction, and append the missing
phases.

| Option | You get | It costs |
|---|---|---|
| **A. Append tier phases, keep the early exceptions** | Phases 6-8 add the Tier 1 remainder, breadth gate and Tier 2/3 fan-out; Ansible collections and the UI stay early, with Ansible recorded as a named exception to tier order in the catalogue | The catalogue's "Tier 1 before Tier 2" rule gains an exception clause, and the tier table stops being the sole source of order |
| **B. Strict tier order** | One source of truth: phases mirror the catalogue exactly | Ansible leaves Phase 4 and the log's first five rows; the one hosting-differentiating format waits behind eight Tier 1 formats |

**Why this is yours:** whether Ansible's unique market position outranks tier discipline is a
product call, not something the fleet can measure its way to. (The catalogue's own 2026-09-22
review raises the same tension from its side; one answer should settle both.)

### Q2: What exactly triggers the breadth gate's shrink outcome, and who records the verdict?

The gate is called "real, not ceremonial", but "if per-format cost is flat rather than
falling" names no metric (interventions? tokens? both? normalised how?), no threshold for
"falling", and no decider. As written, either outcome can be argued after the data exist,
which is what ceremonial means.

**Recommendation:** C - the owner adjudicates, but against a definition committed to the
experiment log before Tier 1 completes, so the verdict is checked against numbers chosen
before anyone knew them.

| Option | You get | It costs |
|---|---|---|
| **A. Owner judgment on the raw table** | Flexibility; no premature metric | The gate is unfalsifiable and post-hoc rationalisation is easy |
| **B. Hard quantitative rule fixed now** | Fully falsifiable | Thresholds picked before any data exist will be wrong in an unknown direction |
| **C. Pre-committed definition, owner adjudicates** | Falsifiable, and revisable in daylight if the definition proves wrong | The definition must be written into the log before the Tier 1 data arrive, or it binds nobody |

**Why this is yours:** picking the threshold is exactly the "adjudicating architecture" role
the experiment reserves for the human.

### Q3: How is per-format cost measured and attributed, so the N+1 comparison is not biased by construction?

AC8 assumes the log can answer "did PyPI cost less than npm", but nothing defines the token
unit, the collection procedure (are sessions tagged per format?), or how shared-layer work is
attributed. npm carries the entire proxy/cache layer's construction (build-order step 5);
PyPI inherits it for free. As specified, PyPI measures cheaper even if nothing generalised -
the headline finding is baked into the schedule. The Test Plan calls AC8 "manual", and the
template allows manual only with a written procedure; the log's "How to record" defines
interventions but not token accounting.

**Recommendation:** B - shared-layer work (harness, CAS, data model, proxy core) gets its own
ledger rows; a format's cost is its handler plus its conformance cases only, with the session
tagging rule written into the log's "How to record".

| Option | You get | It costs |
|---|---|---|
| **A. Charge each session to the current format** | Trivially simple bookkeeping | Comparisons are confounded; the experiment's headline claim is unsupportable |
| **B. Shared-infrastructure line items; format = handler + conformance only** | Comparable per-format numbers | Tagging discipline on every session, and a judgment call whenever work is partly shared |
| **C. Normalise the headline metric by conformance case count** | Difficulty-adjusted comparisons across unequal protocols | Case counts vary in depth, so the unit is soft; needs B underneath anyway |

**Why this is yours:** the attribution rule defines what the experiment is allowed to claim,
and it must be committed before the data exist.

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

### Q6: Does the charter need an acceptance criterion for the web UI?

The unserved combination the charter claims includes "a usable UI", and Pulp is dismissed for
lacking exactly that - yet no AC covers the UI, so every charter box can be ticked with the
Pulp failure mode reproduced. There is no web-ui spec yet to defer to.

**Recommendation:** A - add a thin criterion now ("a web UI in the default build can browse
repositories, packages and versions and configure an upstream, covered by Playwright") and let
the future web-ui spec own the detail.

| Option | You get | It costs |
|---|---|---|
| **A. Thin UI criterion now** | The UI is inside the charter's definition of done | Pre-commits minimal UI scope before the surface spec exists |
| **B. No criterion until the web-ui spec** | The charter stays lean and defers to the specialist spec | Until that spec exists, the charter is satisfiable as "Pulp with more formats" |

**Why this is yours:** how much UI counts as "usable" is a product-quality bar only the owner
can set.

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
