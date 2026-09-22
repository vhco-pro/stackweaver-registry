---
status: draft
status_description: "All open questions answered by the owner and folded in; awaiting a /spec review pass to earn planned."
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
conclusions, which this charter takes as settled:

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
  collection strategy is an open question in that spec, not settled here).
- A format handler interface, with each handler serving both a **hosted** path and a
  **proxied/cached** path.
- **Breadth: 33 ecosystems across roughly 31 protocol implementations**, reaching 50+ client
  tools and distributions, tiered in `docs/internal/plans/formats/catalogue.md`. Breadth is the
  moat, and what makes it affordable is the conformance harness rather than any collapsing of the
  count - families multiply *client reach* (one Maven-layout handler serves Maven, Gradle, SBT,
  Ivy and Leiningen), not the number of protocols to implement.
- A web UI, after the formats work.
- Upstream proxy/caching with TTLs, negative caching and an offline mode. This is the
  differentiator and is designed in from format two, never retrofitted.
- OIDC SSO and RBAC, free, in the core product.
- A conformance harness driving real package clients in containers.

**Out of scope, explicitly**

- Vulnerability scanning and signing enforcement as original work. Harbor does these well;
  integrate later, do not reimplement.
- Any ecosystem advertised before both its hosted and proxied paths pass conformance. The
  catalogue is a target list, not a marketing claim.

### Note on the reversal

An earlier revision of this charter explicitly refused breadth, on the grounds that a
fifteen-front protocol war against incumbents who are already free is how a focused project dies.
**That reasoning assumed human-cost economics.** It is superseded deliberately, not forgotten.

The thesis of this project is that a conformance harness converts protocol work from judgment
into volume, and volume is what an agent fleet is for. If the harness generalises, each format
costs a fraction of the first and breadth becomes the one moat competitors cannot follow: Gitea
has 24 formats and cannot proxy, Harbor proxies and speaks only OCI, JFrog and Sonatype have both
and charge for SSO. **Breadth × upstream caching × free SSO is unoccupied precisely because it is
unaffordable to a human team.**

The bet is explicit and it has a real gate: Phase 3 re-reads the experiment log, and if per-format
cost is flat rather than falling, the catalogue shrinks to what is already delivered.

## Design

### Build order, and why each step earns its place

| # | Step | Why here |
|---|---|---|
| 1 | **Conformance harness** | The harness is the product; the server is what satisfies it. Built before any handler, against a deliberately trivial format. |
| 2 | **Generic format** | Trivial protocol. Its job is to prove the harness, the CAS, auth and the CI wiring end to end with nothing else in the way. |
| 3 | **CAS + GC** | Promoted to a real spec once generic exposes the blob lifecycle. GC is where data loss lives. |
| 4 | **OCI** | The official conformance suite is a pass/fail gate written by the standards body. Hardest protocol, strongest oracle. |
| 5 | **Proxy/cache** | The differentiator. Introduced with npm rather than retrofitted, because it changes the storage model. |
| 6 | **npm** | Most-wanted proxy cache in real life. First format where the proxy path matters more than the hosted path. |
| 7 | **PyPI** | The generalisation test. If npm-to-PyPI is cheaper than generic-to-npm, the experiment has its headline finding. |
| 8 | **Tier 1 remainder** | Maven (unlocks the whole JVM in one handler), Go modules, NuGet, Debian and RPM (first formats needing GPG-signed indexes), Helm. |
| 9 | **Re-evaluate, then Tiers 2 and 3** | The breadth gate. Continue only if per-format cost is falling. `docs/internal/plans/formats/catalogue.md`. |

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
      conformance cases; no format ships with only one path tested.
- [ ] AC5: Blob GC never deletes a blob that is referenced by a live manifest, proven under
      concurrent push and interrupted upload by a fault-injection test, not by a client run.
- [ ] AC6: A CI benchmark gate fails the build on a regression beyond a stated threshold for
      blob upload and download throughput.
- [ ] AC7: OIDC SSO and RBAC are functional in the default build with no licence flag, feature
      flag, or paid tier gating them.
- [ ] AC8: `docs/internal/tasks/experiment-log.md` records, per format, the human intervention
      count and the token cost, sufficient to answer whether format N+1 cost less than format N.

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

## Implementation Phases

### Phase 1: Foundation
- Conformance harness spec and implementation
- Generic format as the harness's first subject
- CAS and GC spec

### Phase 2: The hard oracle
- OCI handler against the official conformance suite

### Phase 3: The differentiator
- Proxy/cache layer
- npm, hosted and proxied

### Phase 4: The generalisation test
- PyPI, measuring cost against npm
- Ansible collections

### Phase 5: Surface
- Web UI, OIDC SSO, RBAC

## Open Questions

None. Every question this spec raised has been answered by the owner and folded into
Design and Scope above, with each decision's accepted cost recorded beside it.

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

**Settled 2026-09-22: at the first working format.** A public repository holding only specs
invites drive-by judgement and attracts no contributors; a first impression that actually runs is
worth the wait.

Accepted cost: the spec history lands as one large push rather than as visible incremental
progress. The repository stays private until then.

### Resolved: first milestone (was Q3)

**Settled 2026-09-22: prove the thesis.** Optimise for the generalisation measurement - does
format N+1 cost less than format N - because that is the transferable finding and it decays the
moment this becomes a product schedule.

Accepted cost: nothing shippable for months. The experiment log is therefore a first-class
deliverable, not a side note.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
