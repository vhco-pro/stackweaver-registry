---
status: draft
status_description: "Charter drafted from the founding discussion; open questions await the owner before any foundation spec moves to planned."
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
- Formats, in build order: generic, OCI, npm, PyPI, Ansible collections.
- Upstream proxy/caching with TTLs, negative caching and an offline mode. This is the
  differentiator and is designed in from format two, never retrofitted.
- OIDC SSO and RBAC, free, in the core product.
- A conformance harness driving real package clients in containers.
- A web UI, after the formats work.

**Out of scope, explicitly**

- Being an Artifactory clone. Fifteen formats is a protocol war against incumbents who are
  already free. Breadth is not the differentiator; the proxy layer is.
- Maven, Debian, RPM, Cargo, NuGet, RubyGems, Go module proxy in the first year. Each is
  tractable and none is on the critical path to proving the thesis.
- Vulnerability scanning and signing enforcement. Harbor does these well; integrate later, do
  not reimplement.
- Replacing Harbor for OCI hosting. OCI is implemented here because it has an official
  conformance suite and is therefore the best proving ground for the harness, not because the
  world needs another OCI registry.

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
| 8 | **Ansible collections** | The one format where free hosting alone is genuinely differentiating. |

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

### Q1: Does the repository go public now, or at the first working format?

**Recommendation:** at the first working format - a public repo with no running code invites
drive-by judgement and no contributors.

| Option | You get | It costs |
|---|---|---|
| **A. Public now** | Builds in the open from day one; the experiment is auditable end to end | A months-long window where the repo is specs and scaffolding, which reads as abandoned |
| **B. Public at first working format** | A first impression that runs | The early spec history lands as one large push rather than as visible progress |

**Why this is yours:** it is a positioning and reputation call, not a technical one.

### Q2: The repository is named `artifactory`, which is a JFrog trademark.

**Recommendation:** rename before going public. Renaming a private repo is free; renaming after
stars, forks, import paths and package names exist is not, and the Go module path bakes it in.

| Option | You get | It costs |
|---|---|---|
| **A. Rename now** | No trademark exposure, clean module path from the start | Have to pick a name now |
| **B. Keep `artifactory`** | No decision needed today | A registered trademark, on a product that directly competes with its owner. Rename cost compounds with every day of adoption |

Candidate names, all unclaimed in this space as far as a quick check goes: **Hangar**,
**Quarry**, **Silo**, **Artifex**.

**Why this is yours:** naming is taste plus risk appetite, and only you can weigh how much the
JFrog-adjacent recognition is worth against the exposure.

### Q3: Is the first milestone "prove the thesis" or "usable by someone"?

**Recommendation:** prove the thesis. The experiment's value decays if it becomes a product
schedule.

| Option | You get | It costs |
|---|---|---|
| **A. Prove the thesis** | A clean answer on whether format N+1 gets cheaper, which is the transferable finding | Nothing shippable for months |
| **B. Usable first** | An npm proxy cache that real teams would run | Optimises for the format rather than the harness, which is the thing being tested |

**Why this is yours:** it decides whether this is research with a product outcome or a product
with research flavour, and those are different commitments.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
