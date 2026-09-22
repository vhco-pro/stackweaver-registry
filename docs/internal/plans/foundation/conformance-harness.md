---
status: draft
status_description: "All open questions answered by the owner and folded in; awaiting a /spec review pass to earn planned."
description: "Spec for the conformance harness that drives real package clients against the server in containers, including the recording proxy that turns real client traffic into a golden corpus."
author: michielvha
goal: "Make protocol correctness an exit code rather than a judgment call, so format work can be driven autonomously and regressions from upstream client changes are caught by a scheduled job."
priority: "critical"
issue: 2
created: 2026-09-21
covers:
  - "conformance/**"
---

# Plan: Conformance harness

The harness runs **real package clients** in containers against a running server and asserts the
result. It is built before the first format handler, because it is the thing that makes every
later format tractable.

## Context

Package registry protocols are specified badly and implemented inconsistently. The published
documentation for npm, PyPI and Maven does not describe what the clients actually send, and the
gap between them is where every integration bug lives. This is the single biggest cost in
building a multi-format registry, and it is the reason the free field is fragmented
(`docs/internal/research/prior-art-artifact-repositories.md`).

It is also, uniquely, a cost that automation removes. Correctness is observable:

```
docker push / docker pull        npm install / npm ci        pip install
helm pull                        ansible-galaxy collection install
```

Each of those runs in a container in seconds and returns an exit code. That closes a build-test
loop with no human in it, and it converts "did I read the spec right" into "did the client
accept it".

**Standing rule for this project: the client is the specification. The documentation is
routinely wrong.** Every protocol claim in every spec is grounded in captured traffic or a run,
never in a recollection of how a client behaves.

## Scope

**In scope**

- A format-agnostic harness core: start a server instance, run a client container against it,
  capture stdout/stderr/exit code, assert.
- Declarative case definitions, so adding a case is data rather than code.
- A **recording proxy** that sits between a real client and a *reference* server (Verdaccio, a
  local Gitea, Harbor, a public registry) and records the traffic as a golden corpus.
- A **replay-match** mode that asserts our server's responses against that corpus.
- Client version matrix support: a format is tested against more than one client release.
- Integration of the official `opencontainers/distribution-spec` conformance suite as an OCI
  case source.
- Machine-readable results that generate `docs/internal/conformance/matrix.md`.

**Out of scope**

- Load and performance testing. Benchmarks are a separate CI gate (see the charter, AC6).
- Fault injection for storage and GC. Those defects have no client-level oracle at all and are
  specced with the storage layer, not here.
- Testing the web UI. That is Playwright's job, later.

## Design

### Core loop

The harness core knows nothing about any format. Per case it:

1. Starts a server instance with a per-case isolated storage prefix and database schema, so
   cases run concurrently without sharing state.
2. Provisions whatever the case declares it needs: a repository, a token, an upstream.
3. Runs the client container with the case's script, the server URL and credentials injected.
4. Captures exit code, stdout, stderr and the full HTTP transcript through an inspecting proxy.
5. Evaluates the case's assertions against all four.

Client containers are pinned by digest, never by tag. A case that passes because the tag moved
is a case that will fail silently later.

### Case definition

Cases are declarative, so a new case is data and an agent can add one without touching harness
code. Roughly:

- `format`, `name`, and the `client` image + digest + version label
- `mode`: `hosted` or `proxied` - **every format must have cases in both**
- `setup`: repositories, tokens and upstreams to provision
- `script`: the client command sequence
- `expect`: exit code, required and forbidden output patterns, resulting digests, and optionally
  a required HTTP transcript shape
- `skip`: when present, **must** carry an issue number. A bare skip is a silent regression and
  the runner rejects it.

### The recording proxy, and why it is the real leverage

Running a real client proves *our server accepts what the client sends*. It does not prove we
send what the client expects in the cases we have not thought of. The recording proxy closes
that gap:

1. Point a real client at the proxy, with the proxy forwarding to a reference implementation.
2. Exercise the client across its surface (install, publish, dist-tags, scoped names, lockfile
   modes, failure paths).
3. The proxy records request and response pairs as a golden corpus.
4. Replay-match asserts our responses against the corpus, normalising the parts that are
   legitimately allowed to differ (timestamps, hostnames, ordering where the spec permits it).

The corpus is a self-generating specification. It captures the undocumented quirks that
otherwise cost months, and it is the mechanism by which a format handler can be built by an
agent without a human ever reading the protocol documentation.

Normalisation rules are per-format and are themselves reviewed: an over-eager normaliser hides
real differences, and that failure is invisible because everything goes green.

### Upstream client drift

A scheduled job runs the full suite against the **latest** release of every client, not only the
pinned digests. When a new client release breaks a format, the job opens an issue with the
failing transcript attached.

This is the thesis of the whole project made operational: the protocol treadmill that kills
volunteer registries becomes a cron job that files a ticket.

## Acceptance Criteria

- [ ] AC1: The harness core contains no format-specific logic; adding a format adds case data
      and a handler, not harness code.
- [ ] AC2: A case runs a real client container against a live server and fails when the client
      fails, demonstrated by a deliberately broken handler fixture.
- [ ] AC3: Cases run concurrently without cross-contamination, proven by a case that would fail
      if two cases shared storage or database state.
- [ ] AC4: Client containers are pinned by digest; a case referencing a mutable tag fails
      validation before it runs.
- [ ] AC5: The runner rejects any `skip` that does not carry an issue number.
- [ ] AC6: The recording proxy captures a client session against a reference server and writes a
      replayable corpus.
- [ ] AC7: Replay-match fails when our response differs from the corpus in a non-normalised
      field, proven by a fixture that alters one such field.
- [ ] AC8: The official `opencontainers/distribution-spec` conformance suite runs as a case
      source and its individual results appear in the matrix.
- [ ] AC9: `make conformance` exits non-zero if any case fails or is improperly skipped.
- [ ] AC10: `docs/internal/conformance/matrix.md` is generated from run results, and CI fails if
      the committed copy is stale.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | unit | `conformance/core/runner_test.go` |
| AC2 | integration | `conformance/core/runner_test.go` (broken-handler fixture) |
| AC3 | integration | `conformance/core/isolation_test.go` |
| AC4 | unit | `conformance/core/case_validate_test.go` |
| AC5 | unit | `conformance/core/case_validate_test.go` |
| AC6 | integration | `conformance/record/proxy_test.go` |
| AC7 | integration | `conformance/record/replay_test.go` (mutated-field fixture) |
| AC8 | conformance | `conformance/oci/official_test.go` |
| AC9 | ci | `.github/workflows/ci.yml` conformance job |
| AC10 | ci | `.github/workflows/ci.yml` docs job |

## Implementation Phases

### Phase 1: Core runner
- Case schema, validation, digest pinning, skip-requires-issue
- Server lifecycle with per-case isolation
- Client container execution and capture

### Phase 2: First subject
- The generic format's cases, hosted and proxied, as the runner's proving ground

### Phase 3: Recording and replay
- Recording proxy, corpus format, per-format normalisation rules
- Replay-match assertions

### Phase 4: Official suites and reporting
- OCI distribution-spec suite as a case source
- Matrix generation, CI staleness gate
- Scheduled latest-client drift job

## Open Questions

None. Every question this spec raised has been answered by the owner and folded into
Design and Scope above, with each decision's accepted cost recorded beside it.

Resolved decisions are kept rather than deleted, so the reasoning survives the next time
someone asks why it was done this way.

### Resolved: client orchestration (was Q1)

**Settled 2026-09-22: testcontainers-go.** Container lifecycle, port mapping, wait strategies
and cleanup are exactly its job, and hand-rolling them is a week of work plus a leaked container
on every panic - which wedges CI rather than failing a test.

Accepted cost: a significant dependency in the load-bearing component, and slower per-case
startup. Mitigate by reusing a server instance across cases where isolation permits, never by
dropping isolation.

### Resolved: corpus location (was Q2)

**Settled 2026-09-22: in-repo, compressed, blob bodies replaced by digests.** The corpus is
worthless if it is not versioned alongside the handler it constrains, and it must work from a
clean checkout with no network.

Accepted cost: repo growth, and large-body cases lose body fidelity. Where a case genuinely needs
a real body, it carries a small fixture rather than a recorded multi-megabyte blob.

### Resolved: authoritative reference (was Q3)

**Settled 2026-09-22: the public canonical registry is authoritative**, with a recorded
exception list. Local reference servers (Verdaccio, a local Gitea, Harbor) are for offline
iteration only and never settle a disagreement.

The reasoning is that a real user points a real client at us, and that client's expectations were
formed against the public registry. Conforming faithfully to Verdaccio's quirks would be
conforming to the wrong thing.

Accepted cost: recording needs network access and is subject to upstream rate limits, so recorded
corpora are committed (see Q2) rather than re-recorded on every run. **This also settles the same
question in `formats/npm.md`.**

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
