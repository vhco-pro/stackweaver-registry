---
status: draft
status_description: "Reconciled 2026-09-26 at fe54272 with the Wave 1 folds (not a review): external-suite skips (the OCI suite's g.Skip) are improper unless they match the format spec's machine-readable exception list, with the issue-number, structural-partner and passing-entry rules (AC21); the per-format auth case-set rule now requires a pattern-refusal case in both modes and credentials entries express patterns and the multi-repository opt-in (AC22); instances can be declared network-isolated for replication's air-gap case and the replication key carries a taken-over starting state, its provisioner built by replication.md; management triggers come from script and effects from state or the trigger (no new keys). Earlier: Q4 and Q5 adopted under the owner's standing delegation. Zero open questions; stays draft pending a gate review."
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
- A closed `setup` vocabulary and a seed path that provisions server-side state before the
  client runs, including state no client can trigger, through the shared layers only.
- A **recording proxy** that sits between a real client and a *reference* server (Verdaccio, a
  local Gitea, Harbor, a public registry) and records the traffic as a golden corpus.
- A **replay-match** mode that asserts our server's responses against that corpus.
- Client version matrix support: a format is tested against more than one client release.
- Integration of the official `opencontainers/distribution-spec` conformance suite as an OCI
  case source.
- Machine-readable results that generate `docs/internal/conformance/matrix.md`, including each
  format's replay-match status and any exemption its `Capabilities()` declares.

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
2. Provisions whatever the case's `setup` declares, in the closed vocabulary and through the
   seed path defined below: repositories, credentials, upstream bindings, pre-provisioned
   content and state, and the configuration of subsystems a case depends on.
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
  part of each format's client image or `script`, not of the harness core. It is deliberately
  not a `setup` key: `setup` provisions server-side state only, and everything client-side
  lives in the client container.

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
  so a flow can publish to one instance and pull from another. A set of instances may also be
  declared **network-isolated**: the runner then gives them no network path to one another, so
  the case's `script`, which reaches each, is the only channel between them, and each may be
  started in offline mode through its configuration. That is the shape an air-gapped transfer
  needs (`replication.md` AC15: an archive exported on one side, carried by the script, and
  imported on the other with no network between them)
- `setup`: what to provision on the server side before the client runs, in the closed
  vocabulary defined in the next section and nowhere else (the resolved decision that the
  vocabulary is closed, below)
- `script`: the client command sequence
- `expect`: exit code, required and forbidden output patterns, resulting digests, and optionally
  a required HTTP transcript shape
- `skip`: when present, **must** carry an issue number. A bare skip is a silent regression and
  the runner rejects it.

**Skips inside an external suite.** A case source this harness does not write - the official
`opencontainers/distribution-spec` suite is the first - can skip cases from inside its own
control flow (`g.Skip`), where no `skip` field exists to carry an issue number. Such a skip is
**improper**, and fails the run under AC9, unless it matches an entry in the owning format
spec's exception list, which the runner reads from that list's machine-readable copy under
`conformance/<format>/`, never from a second hand-kept list. The rules are the ones
`formats/oci.md` settled for its list (its resolved conformance-exceptions decision, was Q4),
applied here as runner behaviour for every external source:

- every entry carries an issue number, and an entry without one fails the run;
- a **structural** entry names its partner case and holds only if that partner ran and passed in
  the same run, so an exception can never hide the behaviour its pair exists to test;
- an entry whose case ran and passed fails the run, so the list only shrinks by evidence and
  never quietly outlives its cause;
- a skip or failure that matches no entry fails the run.

AC21 asserts the four rules against fixture suite results.

### The `setup` vocabulary

The vocabulary is **closed and owned by this spec** (the resolved decision that it is closed,
below). A case may use only the keys in this table; a sibling that needs a new one gets it by
revising this spec, which puts the need in front of a review instead of letting the oracle's
input language grow wherever a consumer happens to need it.

| Key | Provisions | Schema of an entry | Lands with |
|---|---|---|---|
| `repositories` | Repositories on an instance | The `Repository` entity of `data-model.md`: format, type (`local` / `remote` / `virtual`), visibility, virtual member order, the named upstream binding of a `remote`, and the repository metadata document verbatim | Phase 2 (with generic) |
| `credentials` | The identities the script presents: none, a token scoped to a repository and actions, each scope optionally narrowed by a pattern, a token spanning several named repositories under `auth.md`'s explicit multi-repository opt-in, or a deliberately wrong scope | The token scope of `auth.md`, patterns and the multi-repository opt-in included | Phase 2 (with generic) |
| `upstreams` | Named upstreams a `remote` repository binds to | A stand-in (an image by digest, or a harness fixture server) **and** the identity of the real service it stands in for; see "Upstream bindings" | Phase 2 (with generic) |
| `state` | Content and state already on the server when the client starts: packages, versions and files with fixture bytes, plus the metadata documents at the levels the data model defines | Shared-model entities, with fixture bytes named by path inside the case directory and metadata documents carried verbatim | Phase 2 (with generic) |
| `advisories` | A case-controlled advisory source, never the live feed | The advisory-source format of `supply-chain-policy.md` | `supply-chain-policy.md` |
| `policies` | Supply-chain policy rules on named repositories | The policy-rule configuration of `supply-chain-policy.md` | `supply-chain-policy.md` |
| `replication` | Replication links between the case's named `instances`, and a replica's starting state: an active link, or a repository already taken over (its fencing acknowledgement given) so a post-takeover case starts there | The replication-link and takeover configuration of `replication.md`; the no-network pair its air-gap cases need is expressed by declaring those instances network-isolated, not by this key | `replication.md`, which builds this key's provisioner |

Every entry may name the instance it targets; a case declaring a single instance omits it. The
keys the siblings' provisioners have not yet landed are in the table now rather than added
later, because each already has a named consumer (below): what waits on the sibling is the
provisioner, not a revision of this schema.

**Validation happens before anything runs, in two layers.** The runner rejects a case whose
`setup` uses a key this table does not define, with an error naming the unknown key. A key the
table defines but whose provisioner has not landed is rejected with a *different* error naming
the key and the spec it lands with, so a typo is never indistinguishable from a subsystem that
does not exist yet - which is the property an open vocabulary could not offer. Entry shapes
whose schema another spec owns are then validated by the seed path's own dry run against the
server's configuration validation, still before any server or client container starts. The
harness core never interprets an entry: it hands entries to the seed path, which is how AC1's
format-agnostic claim survives a vocabulary whose entries carry format-specific metadata.

**The seed path.** `setup` is applied by the server binary itself, through a seed subcommand
run against the instance's isolated database schema and storage prefix, which writes through
the same shared-layer calls a handler uses (the metadata store, the CAS commit and the shared
reference-creation call) and never through a handler, a raw SQL statement or a direct object
write (the resolved decision on how `setup` is applied, below). Three consequences follow, and each is why this
path was chosen:

- **State no client can trigger is provisionable.** A yanked PyPI file, a supply-chain policy
  rule or a replication link needs no management endpoint to exist, so a case can assert the
  client-observable effect of a management operation that no real client performs
  (`docs/internal/analysis/management-surfaces-and-the-oracle.md`). A yank case provisions the
  yanked file through `state`, runs a real `pip install`, and asserts the yanked version is
  skipped while an exact pin still resolves. Where a management endpoint does exist (the hosted
  yank surface `pypi.md` adopted), a case that wants trigger and effect together calls it from
  its `script`, as any HTTP client would, and then runs the real client; `setup` never calls a
  management endpoint, so the harness has one provisioning mechanism whatever the product's
  management surface turns out to be. A trigger no ecosystem client drives remains our own
  integration tests' to verify, and no conformance case claims a third party vouched for it.
- **Seeded state obeys every shared-model invariant.** A `state` entry is a completed logical
  write in `data-model.md`'s sense and produces a snapshot the same way an upload does, and the
  seed path is a reference-creating writer that the deletion-intent barrier and
  `storage-and-gc.md` AC10's architecture test already cover. Seeding into a reused instance
  is therefore just another concurrent writer, not a special case.
- **Metadata documents are carried verbatim.** The core never parses a metadata document, so a
  `state` entry carries the document exactly as the owning handler stores it, and the case
  lives in that format's own case directory beside the handler that defines the shape. A
  handler that changes its document shape breaks its own seeded cases loudly, because the real
  client then observes the wrong state.

**Upstream bindings.** A case names an upstream; it never names where that upstream lives.
Every `upstreams` entry carries a stand-in, and the run, not the case, selects the binding:
the main suite binds every upstream to its stand-in and so needs no network, and the nightly
real-upstream job (`proxy-cache.md` AC15) rebinds the same entries to the real services with
the case body unchanged. An entry without a stand-in fails validation, since the main suite
could not run it offline.

**Corpus starting state uses the same vocabulary.** The starting-state declaration AC15
requires of a corpus is written in `state` and `repositories` terms and applied through the
same seed path, so a replay seeds its server exactly as a case does and there is one
provisioning mechanism rather than two that can disagree.

### What sibling specs already require of this schema

Recorded here because a cross-spec dependency that exists in one direction only is how an
implementation discovers it has no counterparty:

- **Per-format auth cases are a validator rule, not only a sibling's criterion.** `auth.md` AC8
  and `format-handler-interface.md` AC7 both require every format's case set to contain
  unauthenticated, unauthorized and pattern-refusal cases in both modes, and both map that
  enforcement to this harness's case-set validation (`conformance/core/case_validate_test.go`),
  which AC22 asserts from this side. The schema expresses such a case as a `credentials` entry
  that provisions no credential, a wrongly-scoped one, or one patterned to a single named
  object and presented against another, plus an `expect` of denial.
- **Supply-chain policy refusals are conformance cases on both paths.** `supply-chain-policy.md`
  AC1 and AC2 assert a policy refusal against a real client, hosted and proxied alike. The case
  provisions the rule through `policies` and the controlled advisory through `advisories`, and
  the proxied variant binds its upstream to a stand-in serving the affected artifact.
- **Replication scenarios need more than one instance.** `replication.md`'s follower scenarios
  cannot be expressed in a single-server case; the `instances` declaration and AC16 exist for
  them, and the links between the instances are the `replication` key, whose provisioner
  `replication.md` builds. Its air-gap case (AC15 there) declares the two instances
  network-isolated and in offline mode, and its takeover cases start from a `replication` entry
  naming a repository already taken over.
- **The nightly real-upstream job reuses these suites.** `proxy-cache.md` AC15 runs the proxied
  suites against the real preconfigured upstreams; the run-selected upstream binding above is
  what lets it do so without the case body changing, and AC19 asserts it.
- **Management triggers come from `script`, effects from `state` or the trigger.** The hosted
  management operations are settled as registry-owned endpoints in `pypi.md`, `npm.md` and
  `ansible-collections.md` (their resolved management-surface decisions), so a case wanting
  trigger and effect together calls the endpoint from its `script` and then runs the real
  client (`pypi.md` AC12 and AC13, `npm.md` AC17, `ansible-collections.md` AC12), while a case
  wanting only the effect seeds the post-operation state through `state` - a yanked file, a
  deprecated version, a deleted version with its retirement set carried verbatim in the
  package-level document. `setup` never calls a management endpoint, whatever surface
  exists.
- **Galaxy's namespace and signature cases fit the vocabulary as it stands.**
  `ansible-collections.md` AC10 presents a token patterned to one namespace (`alpha/**`)
  through a `credentials` entry, and its AC11 binds its upstream to a stand-in fixture server
  serving a collection signed with a fixture key through `upstreams`, the keyring import being
  client-side in the `script`. Neither needs a new key.

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
makes the declaration mandatory and makes its absence a loud error. The declaration is written in the
`setup` vocabulary and applied through the same seed path as a case's `setup` (above), so there
is one provisioning mechanism to trust rather than two.

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
      other; and two instances declared network-isolated have no network path to each other
      while the script still reaches both, demonstrated by a connection from one instance to
      the other failing in the same case.
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
- [ ] AC15: A corpus declares the server state its requests depend on, in the `setup`
      vocabulary's `repositories` and `state` terms, and a pull-shaped recorded flow replays
      against a server seeded solely from that declaration and the corpus's carried fixtures,
      through the same seed path a case uses, with no network access; replaying a corpus that
      omits a needed declaration fails with an error naming the missing state, not with a
      response mismatch.
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
- [ ] AC17: The case `setup` vocabulary is closed: before any container starts, the runner
      rejects a case whose `setup` uses a key the vocabulary table does not define, and rejects
      a defined key whose provisioner has not landed (today `advisories`, `policies` and
      `replication`) with a different error naming the key and the spec it lands with. Proven by three fixture cases (a misspelt key, a not-yet-landed
      key, a valid case), where only the valid one reaches the seed path and the two rejections
      are distinguishable by error alone.
- [ ] AC18: `setup` provisions state no client triggered, through the shared write path and
      nothing else. A generic artifact provisioned through `state` alone, with no upload ever
      issued, is fetched byte-identical by `curl` and appears in the listing; a version-level
      metadata document seeded through `state` reaches the handler verbatim, proven by a
      fixture handler whose response depends on a field of that document; and the seed path
      writes only through the shared metadata store, CAS commit and reference-creation calls,
      held by an architecture test that fails if it imports a handler package or the database
      or object-storage drivers directly.
- [ ] AC19: An upstream's binding is chosen by the run, never by the case: one proxied case file,
      byte-identical across both runs, passes against two different upstream servers selected
      only by the run's binding argument, and a case whose `upstreams` entry has no stand-in
      fails validation.
- [ ] AC20: The generated matrix renders every format's replay-match status from run results,
      and renders a format whose `Capabilities()` declares reference-implementation
      availability `none` as exempt, citing the format's spec, never as passing and never as missing; a format with no
      corpus and no such declaration renders as missing. Proven by the matrix generator over
      three fixture formats, one per outcome.
- [ ] AC21: A skip reported from inside an external case source fails the run unless it matches
      an entry of the owning format's machine-readable exception list under
      `conformance/<format>/`; the run also fails when an entry lacks an issue number, when a
      structural entry's partner case did not run and pass in the same run, and when a listed
      case ran and passed. Proven by fixture suite results, one per rule, plus one fully
      matching run that passes.
- [ ] AC22: The runner rejects a format's case set that lacks an unauthenticated, an
      unauthorized or a pattern-refusal case in any mode the format supports, with an error
      naming the missing kind and mode, and a `credentials` entry provisions a pattern-scoped
      token and a multi-repository opt-in token that are then authorized exactly as `auth.md`
      defines: the patterned token refused outside its pattern, the opt-in token honoured on
      both named repositories and refused on a third.

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
| AC16 | integration | `conformance/core/topology_test.go` (including a network-isolated pair) |
| AC17 | unit | `conformance/core/case_validate_test.go` (misspelt-key, not-yet-landed-key and valid fixtures) |
| AC18 | integration + architecture test | `conformance/core/seed_test.go` (a `state`-seeded generic artifact fetched by `curl`, and a fixture handler whose version metadata flag changes what the client receives); `conformance/core/arch_test.go` (seed-path imports) |
| AC19 | integration | `conformance/core/upstream_binding_test.go` (one case file, two fixture upstream servers, plus the missing-stand-in rejection) |
| AC20 | unit | `conformance/core/matrix_test.go` (passing, exempt and missing fixture formats); shared with `format-handler-interface.md` AC13, which asserts the same rendering from the `Capabilities()` side |
| AC21 | unit | `conformance/core/external_skip_test.go` (fixture suite results: unlisted skip, entry without an issue, structural entry whose partner failed, listed case that passed, a fully matching run) |
| AC22 | unit + integration | `conformance/core/case_validate_test.go` (case sets missing each auth case kind in each mode); `conformance/core/seed_test.go` (patterned and multi-repository `credentials` entries) |

## Implementation Phases

### Phase 1: Core runner
- Case schema (including the isolation declaration and multi-instance topology with
  network-isolated instance sets), validation, digest pinning, skip-requires-issue, and the
  per-format auth case-set rule (AC22)
- The closed `setup` vocabulary and its first validation layer (unknown key versus
  not-yet-landed key), and run-selected upstream bindings
- Server lifecycle with per-case isolation
- Client container execution and capture

### Phase 2: First subject
- The generic format's hosted cases as the runner's proving ground, plus validation that its
  declared unsupported proxy capability exempts it from proxied-mode coverage
- The seed subcommand and its dry-run validation, landing with the shared metadata store, CAS
  and auth that generic needs anyway, since the seed path writes through those layers and
  cannot exist before them; the `repositories`, `credentials`, `upstreams` and `state`
  provisioners, with the three sibling keys still rejected as not yet landed

### Phase 3: Recording and replay
- Recording proxy, corpus format, per-format normalisation rules
- Replay-match assertions, request-side correlation for stateful flows, and declared
  starting-state seeding

### Phase 4: Official suites and reporting
- OCI distribution-spec suite as a case source, with external-suite skips matched against the
  format's machine-readable exception list (AC21)
- Matrix generation, including the replay-match column and its declared exemption, and the CI
  staleness gate
- Scheduled latest-client drift job

After these phases the `advisories`, `policies` and `replication` provisioners land with
`supply-chain-policy.md` and `replication.md`, which own building them, each switching its key
from "not yet landed" to provisioned. Any key beyond the table is a revision of this spec and its re-review, per the
resolved decision that the vocabulary is closed.

## Tasks

Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. Q4 (raised by the 2026-09-23 gate review) and Q5 (exposed while folding Q4's answer)
were adopted on 2026-09-26 under the owner's standing delegation, so the owner may reverse
either. Resolved decisions are kept rather than deleted, so the reasoning survives the next time
someone asks why it was done this way.

### Resolved: the `setup` vocabulary is closed (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: a closed vocabulary
owned by this spec and amended only by revising it. The table in "The `setup` vocabulary"
defines the keys; the runner rejects anything else before a container starts (AC17).

Accepted cost: each genuinely new kind of setup waits on a revision of this spec and its
re-review, which puts the harness on the critical path of any sibling needing one. The cost is
smaller than the option priced it, because every need already known is in the table now: the
`advisories`, `policies` and `replication` keys exist today and wait only on their
provisioners, and an entry whose shape another spec owns is validated against that spec's own
configuration schema through the seed path's dry run, so a sibling changing its rule format does
not need a revision here.

Option A lost because it makes a typo indistinguishable from a provisioner that has not landed,
and the runner's before-it-runs validation, which AC4 and AC5 already depend on, stops being
possible. Option C lost because its registry is a second place the AC1 boundary can be breached,
while B with the known keys pre-listed already gives the siblings most of C's independence.

`setup` is named throughout Design and was asserted by no criterion anywhere; AC17 (closed
validation), AC18 (state no client triggered, through the shared write path) and AC19
(run-selected upstream bindings) are the criteria this answer owed.

| Option | You get | It costs |
|---|---|---|
| **A. Open vocabulary: a case declares setup as free-form data a provisioner plugin interprets** | Siblings add what they need without touching this spec; no cross-spec sequencing | The schema stops being checkable: a typo in a case's setup key is indistinguishable from a provisioner that has not landed yet, and the runner cannot validate a case before running it, which AC4 and AC5 depend on it doing |
| **B. Closed vocabulary owned here, amended by revising this spec** (adopted) | Every case validates statically; one place records what the harness can provision; a sibling's need becomes a visible, reviewed amendment | Each new subsystem's conformance coverage waits on an amendment to this spec and its re-review, so the harness is on the critical path of every sibling that needs new setup |
| **C. Closed core vocabulary plus a registered-extension mechanism: subsystems register named provisioners at build time, the runner validates against the registered set** | Static validation survives; subsystems land their own provisioning without editing this spec's schema | A second registry to keep honest, and the AC1 import rule has to be restated for it (a format package must not be able to register one), so the boundary this spec is proudest of gains a second place it can be breached |

### Resolved: how `setup` is applied (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Raised while folding the closed
vocabulary: a closed list of keys says what a case may provision but not how, and the answer
decides whether state no client can trigger (a yanked file, a policy rule, a replication link)
is provisionable at all before the product has a management API.

**Recommendation:** A - the server binary's own seed subcommand, writing through the shared
layers against the instance's isolated store, because it is the only option that provisions
management state without depending on an undecided management surface and without adding a
network-reachable write path to the binary under test.

| Option | You get | It costs |
|---|---|---|
| **A. A seed subcommand of the server binary, writing through the shared-layer calls against the instance's isolated database schema and storage prefix** (adopted) | Works with no management API; the binary under test is the shipped binary; seeded state obeys every shared-model invariant because it goes through the same calls a handler uses | Setup bypasses a management endpoint even where one exists, so conformance never covers a management trigger; the seed path is one more writer that must stay on the shared calls, which needs its own architecture test |
| **B. Provision through the server's public management API** | Setup exercises a real product surface on every run | Every case needing state waits on an endpoint for that state: `ansible-collections.md` has not decided whether deletion is served at all, no spec defines a policy or replication-link API, and a case-controlled advisory source is test infrastructure that should never be a product API |
| **C. A test-only HTTP seeding endpoint enabled by a flag** | Seeding works against a running instance over the same channel the client uses | A network-reachable arbitrary-write surface that must never ship enabled, in the binary under test; a flag guarding it is one misconfiguration from a critical vulnerability |

**Why this is yours:** it trades coverage of management triggers against independence from an
undecided product surface, which is a judgment about what the oracle is for.

Accepted cost: `setup` never exercises a management endpoint, so a management surface earns
conformance coverage only where a case's `script` calls it deliberately (the pattern for
`pypi.md`'s adopted yank surface) and is otherwise verified by our own integration tests - which
`docs/internal/analysis/management-surfaces-and-the-oracle.md` shows is the honest position
anyway, since no ecosystem client drives those triggers. The seed path's confinement to the
shared calls is AC18's architecture half. B lost because it makes the oracle wait on a product
endpoint for every kind of state it provisions, including state that should never have one; C
lost on security alone.

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
| 2026-09-26 | 4d1aeb1 | folding adopted recommendations under the standing delegation | Not a review: adoption and fold. Q4 adopted as option B (closed vocabulary owned here) with the known sibling needs pre-listed as keys (`repositories`, `credentials`, `upstreams`, `state` provisioned from Phase 2, since the seed path writes through shared layers that land with generic; `advisories`, `policies`, `replication` waiting only on their provisioners), two-layer pre-run validation that tells a typo from a not-yet-landed key, and entry shapes other specs own validated by the seed path's dry run. Folding exposed Q5 (how `setup` is applied), adopted as the server binary's seed subcommand writing through the shared-layer calls, which is what makes state no client can trigger (a yanked file, a policy rule, a replication link) provisionable with no management API, per `management-surfaces-and-the-oracle.md`. Design gained the vocabulary table, the seed path, run-selected upstream bindings (proxy-cache AC15) and the rule that a corpus's starting state uses the same vocabulary; the sibling-requirements list now maps each sibling to its key; trust-store injection moved out of `setup` to the client side. AC15 rewritten onto the vocabulary and seed path; AC17 (closed validation), AC18 (state no client triggered, through the shared write path, with an architecture test), AC19 (run-selected upstream binding) and AC20 (matrix renders a declared replay-match exemption as exempt, from generic's adopted replay-match exemption) added with Test Plan rows. `setup` is no longer unasserted. |
| 2026-09-26 | fe54272 | cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. From the data-model and OCI fold: external-suite skips are improper under AC9 unless they match the owning format spec's exception list, read from its machine-readable copy under `conformance/<format>/`, with every entry needing an issue number, a structural entry holding only while its partner ran and passed in the same run, and an entry whose case passed failing the run (new Design paragraph, AC21). From the auth and interface fold: the per-format auth validator rule now names the pattern-refusal case in both modes, the `credentials` key's schema expresses a pattern and `auth.md`'s multi-repository opt-in (AC22 asserts both). From the replication fold: an air-gapped pair is declared by marking instances network-isolated and offline (AC16 extended), and the `replication` key carries a taken-over starting state; its provisioner is `replication.md`'s to build. From the format-management fold: the sibling-requirements list now says management triggers are called from `script` (pypi AC12 and AC13, npm AC17, ansible AC12), effect-only cases seed through `state`, ansible AC10 uses a pattern-scoped `credentials` entry and AC11 a signed fixture stand-in in `upstreams`; no new keys, and the stale sentence treating those management surfaces as undecided was rewritten. From the generic fold: AC20's Test Plan row records that `format-handler-interface.md` AC13 shares `conformance/core/matrix_test.go`. Phases 1 and 4 updated. |
