---
status: draft
status_description: "Gate review 2026-09-23 at d078c46 added declared replay starting state (AC15) and multi-instance case topology (AC16), and repointed mode-coverage enforcement at Capabilities(). Q4 open: whether the case setup vocabulary is closed. The reviewer terminated on a spend limit before logging; see the Review Log note."
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
   cases run concurrently without sharing state. Per the client-orchestration resolution below,
   an instance may be reused across cases where their declared isolation needs permit, but the
   default is full per-case isolation and a case must never observe another case's state. The
   need is declared in the case itself (the `isolation` field below), never guessed by the
   runner. A case may also declare **more than one** instance (the `instances` field below):
   every instance in a case gets the same isolation guarantees, and the script receives each
   instance's URL and credentials - the capability `replication.md`'s leader-and-follower
   scenarios consume.
2. Provisions whatever the case declares it needs: a repository, a token, an upstream.
3. Runs the client container with the case's script, the server URL and credentials injected.
4. Captures exit code, stdout, stderr and the full HTTP transcript through an inspecting proxy.
5. Evaluates the case's assertions against all four.

Client containers are pinned by digest, never by tag. A case that passes because the tag moved
is a case that will fail silently later.

Two constraints on the capture path, named here because they shape every case:

- **Assertions observe the server only through the protocol.** Digests and other server-side
  outcomes in `expect` are asserted from protocol-visible data (the transcript, response
  headers, listings), never by reaching into the server's storage or database, which would
  break AC1's format-agnostic claim. Outcomes the protocol cannot observe (storage
  deduplication, GC behaviour) are integration or property tests in the owning layer, not
  conformance cases; `generic.md` AC3 and `storage-and-gc.md` already follow this split.
- **Transcript capture means TLS interception.** Several clients refuse plain HTTP (docker
  without an insecure-registry flag, and any recording session against a public registry over
  HTTPS), so both the inspecting proxy and the recording proxy must terminate TLS with a
  harness CA injected into the client container's trust store. Trust-store injection is
  per-client (docker's `certs.d`, npm's `cafile`, pip's `REQUESTS_CA_BUNDLE`) and is therefore
  part of each format's case setup, not of the harness core.

### Case definition

Cases are declarative, so a new case is data and an agent can add one without touching harness
code. Roughly:

- `format`, `name`, and the `client` image + digest + version label
- `mode`: `hosted` or `proxied` - **every format must have cases in both**, unless the
  format's spec declares a mode unsupported; `generic` is the single current exemption
  (`format-handler-interface.md`, the proxy-path resolution), and the runner requires the
  declaration rather than inferring the gap from an absent case set. The declaration's
  machine-readable home is the handler's `Capabilities()` (`format-handler-interface.md`, the
  pinned method set); the runner honours that, never a second hand-maintained list that could
  drift from it
- `isolation`: whether the case tolerates sharing a server instance with other cases or
  requires an exclusive one; the runner may reuse an instance only across cases that tolerate
  it, and AC3 asserts its guarantee under exactly that reuse
- `instances`: optional; a case defaults to one server instance and may instead declare
  several named ones (and, once `replication.md` lands, the replication links between them),
  so a flow can publish to one instance and pull from another
- `setup`: what to provision before the client runs - repositories, tokens, upstreams (a
  local stand-in or a real external service, interchangeably), and repository or server
  configuration a case depends on, such as visibility, a supply-chain policy rule and the
  advisory fixture that triggers it (how this vocabulary grows is Q4)
- `script`: the client command sequence
- `expect`: exit code, required and forbidden output patterns, resulting digests, and optionally
  a required HTTP transcript shape
- `skip`: when present, **must** carry an issue number. A bare skip is a silent regression and
  the runner rejects it.

### What sibling specs already require of this schema

Recorded here because a cross-spec dependency that exists in one direction only is how an
implementation discovers it has no counterparty:

- **Per-format auth cases are a validator rule, not only a sibling's criterion.** `auth.md` AC8
  and `format-handler-interface.md` AC7 both require every format's case set to contain
  unauthenticated and unauthorized cases in both modes, and both map that enforcement to this
  harness's case-set validation (`conformance/core/case_validate_test.go`). The schema expresses
  such a case as a `setup` that provisions no credential, or a wrongly-scoped one, plus an
  `expect` of denial.
- **Supply-chain policy refusals are conformance cases on both paths.** `supply-chain-policy.md`
  AC1 and AC2 assert a policy refusal against a real client, hosted and proxied alike, which is
  why `setup` must be able to provision a policy rule and its advisory fixture.
- **Replication scenarios need more than one instance.** `replication.md`'s follower scenarios
  cannot be expressed in a single-server case; the `instances` declaration and AC16 exist for
  them, and replication-link provisioning joins the `setup` vocabulary when that subsystem lands.
- **The nightly real-upstream job reuses these suites.** `proxy-cache.md` AC15 runs the proxied
  suites against the real preconfigured upstreams, so an upstream in `setup` must be swappable
  between a local stand-in and the real service without the case body changing.

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

Replay is harder than response normalisation, and this spec names that now rather than
discovering it mid-implementation. Recorded requests embed session-scoped values: an OCI
chunked upload PATCHes a `Location` URL containing the reference server's upload ID, and auth
headers carry tokens minted by the reference. Replay-match therefore needs **request-side
correlation** - rewriting recorded requests so that server-generated values (upload session
URLs, token endpoints, redirect targets) refer to our server's equivalents from earlier in the
same recorded flow - not only response-side normalisation. A corpus format that cannot express
"this request value came from that earlier response" cannot replay any stateful flow.

Request-side correlation is not the only state problem. Replay also needs a **declared starting
state**: a pull-shaped recording (an `npm install` of a package that already exists on the
reference) asserts responses about content the replaying server must already hold, and the
corpus-location decision requires replay to work from a clean checkout with no network - so that
state can be seeded only from the corpus itself and the small fixtures it carries. A corpus that
does not declare the state its requests depend on can replay nothing but cold-start flows, and
the failure would surface as a baffling 404 mismatch rather than a named gap, which is why AC15
makes the declaration mandatory and makes its absence a loud error.

Corpora and transcripts are also a leak surface. Recording against the public registry can
capture real credentials (auth headers, tokens, cookies), and the drift job attaches failing
transcripts to issues.

Redaction is an **allowlist, not a denylist**: a header or field survives into a corpus only if
explicitly permitted, and anything unrecognised is redacted at capture time. The failure
directions are asymmetric and that is the whole reason for the choice - an over-redacted corpus
fails loudly as a replay mismatch you fix in minutes, while an under-redacted one leaks silently
into a repository intended to go public. The permitted list is per format and is a review item
alongside the normalisation rules (AC13).

Normalisation rules are per-format and are themselves reviewed: an over-eager normaliser hides
real differences, and that failure is invisible because everything goes green. The same review
obligation covers the per-format recording script, because the corpus closes the
unknown-cases gap only for flows the recording session actually drove: a thin script yields a
thin specification that is green everywhere it looks.

### Upstream client drift

A scheduled job runs the full suite against the **latest** release of every client, not only the
pinned digests. When a new client release breaks a format, the job opens an issue with the
failing transcript attached.

This is the thesis of the whole project made operational: the protocol treadmill that kills
volunteer registries becomes a cron job that files a ticket.

### Blocking precondition on recording

**No golden corpus is committed until credential redaction is implemented and tested.** This is
an ordering rule, not a preference: corpora are committed in-repo, this repository is intended to
go public (`project-charter.md`), and the drift job attaches failing transcripts to issues. A
corpus recorded against a real registry before redaction exists is a credential leak waiting for
the repository to become public.

The first recording run is therefore gated on AC13 passing, and that gate is the reason AC13 is
an acceptance criterion rather than a design note.

## Acceptance Criteria

- [ ] AC1: The harness core contains no format-specific logic; adding a format adds case data
      and a handler, not harness code.
- [ ] AC2: A case runs a real client container against a live server and fails when the client
      fails, demonstrated by a deliberately broken handler fixture.
- [ ] AC3: Cases run concurrently without cross-contamination, proven by a case that would fail
      if two cases shared storage or database state - asserted **under instance reuse**, not only
      under full per-case isolation, since reuse is the path where the guarantee can actually
      break.
- [ ] AC16: A case declaring several server instances gets each provisioned with the same
      per-case isolation guarantees, and the script reaches every instance the case names,
      demonstrated by a two-instance case whose write to one instance is not observable on the
      other.
- [ ] AC4: Client containers are pinned by digest; a case referencing a mutable tag fails
      validation before it runs.
- [ ] AC5: The runner rejects any `skip` that does not carry an issue number.
- [ ] AC6: The recording proxy captures a client session against a reference server and writes a
      replayable corpus.
- [ ] AC7: Replay-match fails when our response differs from the corpus in a non-normalised
      field, proven by a fixture that alters one such field.
- [ ] AC14: A **stateful** recorded flow replays against our server: a corpus containing an OCI
      chunked upload, whose later requests carry a `Location` URL and an auth token minted by
      the reference server, replays with those values correlated to our server's equivalents.
      A corpus format that cannot express "this request value came from that earlier response"
      fails this criterion.
- [ ] AC15: A corpus declares the server state its requests depend on, and a pull-shaped
      recorded flow replays against a server seeded solely from that declaration and the
      corpus's carried fixtures, with no network access; replaying a corpus that omits a needed
      declaration fails with an error naming the missing state, not with a response mismatch.
- [ ] AC8: The official `opencontainers/distribution-spec` conformance suite runs as a case
      source and its individual results appear in the matrix.
- [ ] AC9: `make conformance` exits non-zero if any case fails or is improperly skipped.
- [ ] AC10: `docs/internal/conformance/matrix.md` is generated from run results, and CI fails if
      the committed copy is stale.
- [ ] AC11: The runner fails a format whose case set does not cover both modes, unless the
      format declares the mode unsupported - in its spec and machine-readably via
      `Capabilities()` (`format-handler-interface.md`), which is what the runner reads; the
      declared exemption is honoured, and only `generic` holds one.
- [ ] AC12: The scheduled drift job runs the suite against the latest release of every client
      and opens an issue carrying the failing transcript when a case fails, demonstrated by a
      manual dispatch against a deliberately failing fixture.
- [ ] AC13: A recorded corpus and an attached transcript contain no credential material:
      redaction is allowlist-based, so a header or field the format's permitted list does not
      name is redacted at capture time, and the runner rejects a corpus containing any
      non-permitted field. Proven by a recording session carrying a credential in a header the
      list does not name, which must arrive redacted.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | architecture test + manual | `conformance/core/arch_test.go` (the core package imports no format package); the adds-only-data half is checked per landing format by the experiment-log procedure in `format-handler-interface.md` (its AC5) |
| AC2 | integration | `conformance/core/runner_test.go` (broken-handler fixture) |
| AC3 | integration | `conformance/core/isolation_test.go` |
| AC4 | unit | `conformance/core/case_validate_test.go` |
| AC5 | unit | `conformance/core/case_validate_test.go` |
| AC6 | integration | `conformance/record/proxy_test.go` |
| AC7 | integration | `conformance/record/replay_test.go` (mutated-field fixture) |
| AC8 | conformance | `conformance/oci/official_test.go` |
| AC9 | ci | `.github/workflows/ci.yml` conformance job |
| AC10 | ci | `.github/workflows/ci.yml` docs job |
| AC11 | unit | `conformance/core/case_validate_test.go` |
| AC12 | ci | scheduled drift workflow, proven by a written manual-dispatch procedure |
| AC13 | unit + integration | `conformance/record/redact_test.go` (allowlist, corpus rejection), plus a recording session in `conformance/record/proxy_test.go` carrying a credential in a non-permitted header, per the criterion's own proof |
| AC14 | integration | `conformance/record/stateful_replay_test.go` (OCI chunked-upload corpus; a minimal chunked-upload fixture server stands in until the OCI handler exists, as AC2's broken-handler fixture already does) |
| AC15 | integration | `conformance/record/seeded_replay_test.go` (pull-flow corpus; missing-declaration fixture) |
| AC16 | integration | `conformance/core/topology_test.go` |

## Implementation Phases

### Phase 1: Core runner
- Case schema (including the isolation declaration and multi-instance topology), validation,
  digest pinning, skip-requires-issue
- Server lifecycle with per-case isolation
- Client container execution and capture

### Phase 2: First subject
- The generic format's hosted cases as the runner's proving ground, plus validation that its
      declared unsupported proxy capability exempts it from proxied-mode coverage

### Phase 3: Recording and replay
- Recording proxy, corpus format, per-format normalisation rules
- Replay-match assertions, request-side correlation for stateful flows, and declared
  starting-state seeding

### Phase 4: Official suites and reporting
- OCI distribution-spec suite as a case source
- Matrix generation, CI staleness gate
- Scheduled latest-client drift job

The `setup` vocabulary is expected to grow after these phases as sibling subsystems land
(policy provisioning with `supply-chain-policy.md`, replication links with `replication.md`);
Q4 decides the mechanism by which it grows.

## Tasks

Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

Q4 was raised by the 2026-09-23 gate review and awaits the owner. The resolved decisions that
follow it are kept rather than deleted, so the reasoning survives the next time someone asks why
it was done this way.

### Q4: How does the case `setup` vocabulary grow as sibling subsystems land?

`setup` today provisions repositories, tokens and upstreams. Three siblings already need more
from it: `supply-chain-policy.md` AC2 needs a policy rule and a controlled advisory fixture,
`replication.md` needs replication links between named instances, and `proxy-cache.md` AC15
needs an upstream that swaps between a local stand-in and a real service without the case body
changing. Each of those is a shared-schema change arriving from a spec that does not own this
schema, which is exactly the shape the constitution's no-handler-owns-a-table rule exists to
govern - and the harness core is additionally forbidden from importing any format package
(AC1), so the vocabulary cannot simply grow wherever a consumer happens to need it.

**Recommendation:** B, a closed vocabulary this spec owns and amends by revision, because the
harness is the oracle every other spec is verified against, and an oracle whose input language
any consumer can extend is an oracle nobody can reason about.

| Option | You get | It costs |
|---|---|---|
| **A. Open vocabulary: a case declares setup as free-form data a provisioner plugin interprets** | Siblings add what they need without touching this spec; no cross-spec sequencing | The schema stops being checkable: a typo in a case's setup key is indistinguishable from a provisioner that has not landed yet, and the runner cannot validate a case before running it, which AC4 and AC5 depend on it doing |
| **B. Closed vocabulary owned here, amended by revising this spec** | Every case validates statically; one place records what the harness can provision; a sibling's need becomes a visible, reviewed amendment | Each new subsystem's conformance coverage waits on an amendment to this spec and its re-review, so the harness is on the critical path of every sibling that needs new setup |
| **C. Closed core vocabulary plus a registered-extension mechanism: subsystems register named provisioners at build time, the runner validates against the registered set** | Static validation survives; subsystems land their own provisioning without editing this spec's schema | A second registry to keep honest, and the AC1 import rule has to be restated for it (a format package must not be able to register one), so the boundary this spec is proudest of gains a second place it can be breached |

**Why this is yours:** it decides whether the test oracle's input language is closed, and that
ranks the harness's checkability against every sibling's delivery independence - a constitution-
level trade, not a measurable one.

**The answer must bring an acceptance criterion with it.** `setup` is named five times in Design
and asserted by no criterion in any spec, which `check-spec.js`'s unasserted-duty check now
reports. No criterion can be written before the answer, because one written now would presuppose
whether the vocabulary is closed - which is the question. This note exists so the gap is closed
when the answer lands rather than surviving it.

### Resolved: redaction direction (was Q3)

**Settled 2026-09-23: an allowlist.** A header or field survives into a corpus only if explicitly
permitted; anything unrecognised is redacted.

The choice is about failure direction, not convenience. A denylist fails open - a credential in a
header nobody anticipated reaches a public repository and nothing surfaces it. An allowlist fails
closed, and its failure is a loud replay mismatch.

Accepted cost: the permitted list is maintained per format, and a genuinely new header needs a
deliberate addition before its corpus replays. That maintenance is a review item alongside the
normalisation rules, which carry the same over-eager-hides-real-differences risk.

### Resolved: CI trigger (was Q1)

**Settled 2026-09-23: path-filtered, on pushes to `main` only.** The suite runs when
`internal/format/**`, `internal/storage/**`, `internal/proxy/**` or `conformance/**` change, and
not on pull requests.

Accepted cost, stated plainly because it is significant: **a pull request can be green while
conformance is broken.** This is the same shape as the main-gated integration suite that broke
Stackweaver's `main` twice in one day, and it is accepted here only because a compensating control
exists and is enforced: `CLAUDE.md` requires `make conformance` to be run locally before pushing
anything touching those paths, and the pre-commit hook warns when they are staged. If that control
proves insufficient in practice, the answer is to move conformance onto pull requests, not to
weaken the rule.

### Resolved: corpus re-recording (was Q2)

**Settled 2026-09-23: manual, on evidence of drift.** A corpus is re-recorded when the
client-drift job fails or a protocol-facing bug is reported, and every corpus carries the date it
was recorded and the client version that produced it.

Accepted cost, and it is the real one: **detection is reactive.** A corpus can be quietly wrong
for as long as no client version happens to expose it, and during that window a replay failure is
ambiguous between our bug and an obsolete corpus. The recorded date and client version exist
precisely so that ambiguity can be resolved in minutes rather than debugged.

A scheduled re-record would catch rot on a clock, at the price of recurring network dependence
and rate-limit exposure - the costs the in-repo corpus decision was taken to avoid.

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
| 2026-09-23 | d078c46 | gate review: design adversarial + constitution + cross-spec (auth AC8, format-handler-interface AC7, supply-chain-policy AC1/AC2, replication's follower scenarios, proxy-cache AC15); claim verification vacuous pre-code (no `conformance/` tree). The reviewer terminated on a spend limit before writing this row: its substantive edits are recorded below from the diff, and Q4 was written afterwards from the two dangling references the reviewer left in the body, so Q4's framing is not the reviewer's own | Replay's second state problem named and given AC15: a pull-shaped corpus asserts responses about content the replaying server must already hold, and the settled corpus-location decision forbids fetching it, so a corpus must declare its starting state and a missing declaration must fail loudly rather than as a 404 mismatch. Multi-instance topology added (`instances`, AC16) after `replication.md`'s follower scenarios proved inexpressible in a single-server case, and the isolation tolerance a case declares was made explicit rather than guessed by the runner. Mode-coverage enforcement repointed at `Capabilities()` so the runner reads one machine-readable declaration instead of a second hand-maintained list. What four siblings already require of this schema recorded in the body, since a cross-spec dependency that exists in one direction only is how an implementation discovers it has no counterparty. AC1's adds-only-data half and AC13's redaction proof given honest test-plan homes. Stays draft on Q4. |
| 2026-09-23 | 5c40011 | gate review: design adversarial + constitution + cross-spec (claim verification vacuous: no `conformance/` tree yet). Independence: the reviewer authored this spec's CI-trigger and recording-precondition sections, so its adversarial value on those two is limited | Mechanically clear. Two corrections applied: stateful replay, which Design names as the hardest constraint, had no criterion and AC6/AC7 could both pass on stateless GETs alone (AC14 added); AC3 now asserts isolation under instance reuse, the path where it can actually break. Q3 raised on redaction being a denylist that fails open. Stays draft. |
| 2026-09-22 | afbb4e4 | adversarial + constitution + go-spec-reviewer (claim verification vacuous: pre-implementation tree, stub `main.go` only) | Added mode-coverage, drift-job and credential-redaction ACs (AC11-AC13); named TLS interception and stateful-replay request correlation as design constraints; raised Q1 (CI trigger policy) and Q2 (corpus refresh policy); stays draft. |
| 2026-09-23 | 9c971d4 | cross-spec consistency (generic proxy exemption) | Corrected Phase 2 to use generic's hosted cases and explicitly test its unsupported proxy declaration, matching AC11 and the format spec; status remains draft pending its existing gate review. |
