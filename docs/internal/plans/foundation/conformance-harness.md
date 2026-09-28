---
status: draft
status_description: "Closing reconciliation sweep 2026-09-28 at 3135d95 on Opus (not a review): the authoritative-reference exception list the settled decision (was Q3) provided for now exists, naming Helm's write half (pinned ChartMuseum), Debian's hosted half (reprepro), RPM's hosted half (a createrepo_c tree) and RPM's absent write reference, held by a manifest check (AC28); the credentials key gains a trust_policy sub-entry naming the harness's fixture OIDC issuer for pypi AC19 and openvsx AC33 (AC25 extended); cran's pak stand-ins and swift's presigned-store stand-in named as upstreams hosts sub-entries; OCI's two-repository suite namespaces and the first format batch's named cases recorded. 28 criteria, zero open questions; stays draft pending a gate review. Earlier: Sweep 2026-09-28 at 6e6d503 (not a review): AC26 also refuses a policies case for a format whose supply-chain binding row is still pending (supply-chain AC20); advisories entries may name a second source (AC21); the replication entry carries a per-link sync_interval; proxy-cache AC20 and AC22 case placements recorded; the stale package-level retirement wording replaced by the core-held Retirement record. Reconciled 2026-09-28 at b5424a2 with the foundation authoring wave (not a review): the closed setup vocabulary gains the trust key (artifact-verification.md) and owner-assigned sub-entries on repositories (read_only state, recreated names, hostname binding through server.hosts, signing key material), credentials (robot-owned tokens, registered public keys, expiring tokens) and upstreams (adapter, credential, off-origin hosts), each validated and rejected as not yet landed exactly as a key is (AC17); seeded state on an Indexer handler comes out generated and signed through the write-path hook (AC24); the client block gains recipe and the case-set rules gain declared operation kinds, rename cases and recipes (AC26); Q6 adopted under the standing delegation: every client container is confined to the case network and resolves only declared names (AC23); holds on the inspecting proxy (AC27); redaction covers every credential position (AC13). Earlier (2026-09-26): AC21 and AC22 from the Wave 1 folds; Q4 and Q5 adopted. 27 criteria, zero open questions; stays draft pending a gate review."
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
3. Runs the client container with the case's script, the server URL and credentials injected,
   on a **case network** that holds only the case's instances and its declared stand-ins and
   has no route anywhere else (the resolved client-confinement decision below); where the case's
   `client` block names a `recipe`, the rendered recipe runs in the container before `script`.
4. Captures exit code, stdout, stderr and the full HTTP transcript through an inspecting proxy.
5. Evaluates the case's assertions against all four.

Client containers are pinned by digest, never by tag. A case that passes because the tag moved
is a case that will fail silently later. Where no official image exists (`vagrant.md`,
`luarocks.md`, `cpan.md`'s cpm, Carton and cpan-upload, `debian.md`'s Pop!_OS client), the
harness builds the image itself from a digest-pinned base and a checksum-verified installer, with
the build recipe in the format's case directory, and the case then pins the **built** image by
its digest like any other; AC4 covers both origins.

Two constraints on the capture path, named here because they shape every case:

- **Assertions observe the server only through the protocol.** Digests and other server-side
  outcomes in `expect` are asserted from protocol-visible data (the transcript, response
  headers, listings), never by reaching into the server's storage or database, which would
  break AC1's format-agnostic claim. Outcomes the protocol cannot observe (storage
  deduplication, GC behaviour) are integration or property tests in the owning layer, not
  conformance cases; `generic.md` AC3 and `storage-and-gc.md` already follow this split.
- **Transcript capture means TLS interception.** Several clients refuse plain HTTP (docker
  without an insecure-registry flag, NuGet 9.0's `push` and `delete` without
  `allowInsecureConnections`, Terraform's discovery document which is always `https`, and any
  recording session against a public registry over HTTPS), so both the inspecting proxy and the
  recording proxy must terminate TLS with a harness CA injected into the client container's
  trust store. Trust-store injection is per-client (docker's `certs.d`, npm's `cafile`, pip's
  `REQUESTS_CA_BUNDLE`, the system store for apk, pacman's `trust anchor`, Vagrant's embedded
  `cacert.pem`) and is therefore part of each format's client image or `script`, not of the
  harness core. It is deliberately not a `setup` key: `setup` provisions server-side state only,
  and everything client-side lives in the client container: a keyring import, an emptied
  `/etc/apk/keys`, a rewritten `pacman.conf`, a second `sources.list` line, an `auth.toml` in the
  depot, the private half of a registered key written to a file. The harness core hands the
  script the material it needs (URLs, credentials, the root key ids or public keys it reads from
  the server) and the script places it.
- **The client sees only the case network.** Every hostname a case names resolves inside the
  client container to something on the case network: an instance (by its harness name, or by a
  hostname a `repositories` entry binds to a repository), or a stand-in (an `upstreams` entry, or
  one of its `hosts`). Anything else fails at name resolution. This is what makes a refusal case
  mean anything for a client that silently falls back to origin (`julia.md`'s Pkg, every CPAN
  client, Homebrew, opam), what lets `cpan.md` AC22 and `homebrew.md` AC17 stand in for five and
  four public hostnames respectively, and what keeps the main suite offline by construction
  rather than by discipline. AC23 asserts it.
- **A case may hold the client between two requests.** The inspecting proxy honours a `holds`
  declaration: a request matching a declared pattern is held until the case's `script` releases
  it (through a harness-provided release command) after performing a server-side write, so a
  case can interleave a publish between a client's two requests and assert what the client does
  with an envelope from before and indices from after (`debian.md` AC8's race case). The hold is
  a proxy behaviour, never a server behaviour: no test-only pause exists in the binary under
  test. AC27 asserts it.

### Case definition

Cases are declarative, so a new case is data and an agent can add one without touching harness
code. Roughly:

- `format`, `name`, and the `client` block: image + digest + version label, plus an optional
  `recipe` naming a surface recipe id the format's handler declares (`web-ui.md`, its resolved
  declaration-home decision, was Q1). The runner renders the recipe through `internal/surface`
  with the case's registry URL and credential and runs the rendered steps in the client
  container before `script`, so the snippet a user copies from the setup page is proven by a
  real client. Two validator rules close that loop and AC26 asserts them: a case naming an
  undeclared recipe id is rejected before any container starts, and every recipe a format
  declares is named by at least one passing case of that format
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
- `holds`: optional; request patterns the inspecting proxy holds until the script releases them
  (above)
- `expect`: exit code, required and forbidden output patterns, resulting digests, and optionally
  a required HTTP transcript shape, including network-layer assertions (a request that must
  never leave the client, a name that must fail to resolve)
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
| `repositories` | Repositories on an instance | The `Repository` entity of `data-model.md`: format, type (`local` / `remote` / `virtual`), visibility, virtual member order, the named upstream binding of a `remote`, and the repository metadata document verbatim. Sub-entries: `state` (`active`, the default, or `read_only`), and an entry may recreate a name a previous entry of the same case created and deleted, so a case starts on a recreated repository (`repository-lifecycle.md`); `hostname`, binding the repository to a hostname the client resolves to the instance (`deployment.md`'s `server.hosts`; `terraform.md`, `puppet.md`); `signing`, the repository's key material for a format with an `Indexer`: a fixture private key file or `generate` (`signing-service.md`'s `file` backend) | Phase 2 (with generic) for the base entry; `state` with `repository-lifecycle.md`; `hostname` with `deployment.md`'s loader; `signing` with `signing-service.md` |
| `credentials` | The identities the script presents: none, a token scoped to a repository and actions, each scope optionally narrowed by a pattern, a token spanning several named repositories under `auth.md`'s explicit multi-repository opt-in, or a deliberately wrong scope. Sub-entries from `credential-management.md`: a token owned by a named robot; a registered RSA public key under a key name, whose private half the harness hands to the client container as a file (`chef.md`); a token in expiry state `expiring` (its AC5); `trust_policy`, a robot's OIDC trust policy naming the harness's fixture OIDC issuer, a harness fixture server with per-case signing keys and a name on the case network from which the script obtains an identity token for the client to exchange (its AC13; `pypi.md` AC19, `openvsx.md` AC33) | The token scope of `auth.md`, patterns and the multi-repository opt-in included; the owner, `public-key` kind, expiry state and `TrustPolicy` (issuer, audience, claim constraints) of `credential-management.md` | Phase 2 (with generic) for tokens; the robot, public-key and expiry-state sub-entries with `credential-management.md`; `trust_policy` with its Phase 3 (the OIDC exchange) |
| `upstreams` | Named upstreams a `remote` repository binds to | A stand-in (an image by digest, or a harness fixture server, serving recorded or fixture content) **and** the identity of the real service it stands in for; see "Upstream bindings". Sub-entries from `upstream-adapters.md`: `adapter` (default `https`), `credential` (a kind from its table plus fixture material), and `hosts`, the allowlisted off-origin hosts each given a stand-in and a name on the case network (a codeload stand-in, a presigned-redirect target such as `swift.md`'s presigned store, `homebrew.md`'s four public hosts, `cpan.md`'s five, `cran.md`'s pak metadata hosts) | The upstream configuration of `upstream-adapters.md` | Phase 2 (with generic) for the base entry; `adapter`, `credential` and `hosts` with `upstream-adapters.md` |
| `state` | Content and state already on the server when the client starts: packages, versions and files with fixture bytes, the metadata documents at the levels the data model defines, and the core-held records a management operation would have left (`Retirement`, `management-api.md`) | Shared-model entities, with fixture bytes named by path inside the case directory and metadata documents carried verbatim. On a repository whose handler declares an `Indexer`, the seeded write comes out generated and signed through the write-path hook, with no seed-side code (`signing-service.md` AC21) | Phase 2 (with generic); generated and signed output with `signing-service.md` |
| `advisories` | Case-controlled advisory sources, never the live feed: one entry per source, so a case may declare a second OSV-schema source beside the first (`supply-chain-policy.md` AC21, its resolved advisory-sources decision, was Q9) | The advisory-source format of `supply-chain-policy.md` (OSV schema, an `ecosystems.txt` list per source) | `supply-chain-policy.md` |
| `policies` | Supply-chain policy rules on named repositories | The policy-rule configuration of `supply-chain-policy.md` | `supply-chain-policy.md` |
| `trust` | A repository's trust set, verbatim: keys, roots, identity policies, a `sigstore-root` file for the offline virtual Sigstore | The trust-set format of `artifact-verification.md` | `artifact-verification.md`, which builds this key's provisioner (its AC25) |
| `replication` | Replication links between the case's named `instances`, and a replica's starting state: an active link, optionally with its own per-link `sync_interval` (`replication.md`'s link record), or a repository already taken over (its fencing acknowledgement given) so a post-takeover case starts there | The replication-link and takeover configuration of `replication.md`; the no-network pair its air-gap cases need is expressed by declaring those instances network-isolated, not by this key | `replication.md`, which builds this key's provisioner |

Every entry may name the instance it targets; a case declaring a single instance omits it. The
keys and sub-entries the siblings' provisioners have not yet landed are in the table now rather
than added later, because each already has a named consumer (below): what waits on the sibling
is the provisioner, not a revision of this schema. A sub-entry is part of the closed vocabulary
exactly as a key is: a case may use only the sub-entries the table names, and a new one is a
revision here.

**Validation happens before anything runs, in two layers.** The runner rejects a case whose
`setup` uses a key or sub-entry this table does not define, with an error naming the unknown
one. A key or sub-entry the table defines but whose provisioner has not landed is rejected with
a *different* error naming it and the spec it lands with, so a typo is never indistinguishable
from a subsystem that does not exist yet - which is the property an open vocabulary could not
offer. Entry shapes whose schema another spec owns are then validated by the seed path's own dry
run against the server's configuration validation, still before any server or client container
starts. The harness core never interprets an entry: it hands entries to the seed path, which is
how AC1's format-agnostic claim survives a vocabulary whose entries carry format-specific
metadata.

**The seed path.** `setup` is applied by the server binary itself, through a seed subcommand
run against the instance's isolated database schema and storage prefix, which it receives as
the ordinary configuration keys `database.schema` and `storage.s3.prefix` (`deployment.md`, its
key inventory), and which writes through the same shared-layer calls a handler uses (the
metadata store, the CAS commit and the shared reference-creation call) and never through a
handler, a raw SQL statement or a direct object write (the resolved decision on how `setup` is
applied, below). A `hostname` sub-entry is the one thing the seed path does not write as a
record: a hostname binding is configuration, so the seed path emits it into the instance's
configuration through `server.hosts`' own loader, never through a second mechanism
(`deployment.md`'s resolved host-binding decision). Three consequences follow, and each is why
this path was chosen:

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
  is therefore just another concurrent writer, not a special case. The same property answers
  the twelve formats whose hosted state is servable only once generated and signed (`hex.md`,
  `conda.md`, `cran.md`, `julia.md`, `terraform.md`, `rpm.md`, `debian.md`, `alpine.md`,
  `vagrant.md`, `hackage.md`, `cpan.md`, `arch.md`): the index runtime of `signing-service.md`
  runs before every commit on a repository whose handler declares an `Indexer`, the seed write
  included, so seeded state comes out generated and signed with no seed-side code and no
  per-format seeding path (its AC21; AC24 here). The seed path never calls a signing or index
  service itself; the write path does.
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
  the proxied variant binds its upstream to a stand-in serving the affected artifact. Its AC20
  adds a validator rule this side asserts under AC26: a format's policy case is refused before
  any container starts while that format's row in "When a refusal binds, per format" is still
  `pending`, so a refusal case never runs for a format whose binding conditions are unrecorded.
  Its AC18 places `conformance/maven/policy_test.go` (the HTTP/1.1 refusal phrase visible in
  Maven's and Gradle's output), and its AC21 is why an `advisories` entry may name a second
  source.
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
  deprecated version, a deleted version with its core-held `Retirement` record
  (`management-api.md`'s resolved retirement-placement decision, was its Q3; the set is no
  longer carried in the package-level document). `setup` never calls a management endpoint,
  whatever surface exists.
- **Galaxy's namespace and signature cases fit the vocabulary as it stands.**
  `ansible-collections.md` AC10 presents a token patterned to one namespace (`alpha/**`)
  through a `credentials` entry, and its AC11 binds its upstream to a stand-in fixture server
  serving a collection signed with a fixture key through `upstreams`, the keyring import being
  client-side in the `script`. Neither needs a new key.
- **Every declared management operation has a `script`-driven case.** `management-api.md`
  AC24 requires that every kind a handler declares through `Operations()` has at least one case
  in its format's set whose `script` calls the operation and then runs the real client, and
  maps that enforcement to this harness's case-set validation, which AC26 asserts from this side:
  a case set missing such a case fails before the run, naming the kind. Effect-only cases seed
  the operation's outcome through `state`, including the core-held `Retirement` record.
- **The deferred Galaxy import is held through the admin pause routes.**
  `async-operations.md` AC10 pauses a job kind; the Galaxy deferred case's `script` calls
  `POST` and `DELETE /api/v1/system/jobs/kinds/{kind}/pause` around its publish and poll, so the
  server carries no test-only hold. No new key.
- **Repository lifecycle cases are a per-kind rule and a set of named cases.**
  `repository-lifecycle.md` AC12 requires `conformance/<format>/rename_test.go` in every
  format's set, validated by this harness's case-set rule (AC26); its AC1, AC10, AC11, AC15
  and AC18 place `lifecycle_test.go`, `readonly_test.go` and `virtual_detach_test.go` under
  `conformance/generic/` and `lifecycle_test.go` and `readonly_remote_test.go` under
  `conformance/oci/`, provisioned through the `repositories` entry's `state` and recreated-name
  sub-entries (AC24). Its AC4 has the matrix render a format whose `Capabilities()` declares
  `Virtual: unsupported` as exempt in the virtual column, which AC20 asserts.
- **Recipes are proven by cases.** `web-ui.md` AC17 requires every declared recipe to be named
  by a passing case and an undeclared recipe id to be rejected before any container starts;
  the `client` block's `recipe` field and AC26 are this side of it.
- **Credential shapes beyond a plain token.** `credential-management.md` AC5's
  `conformance/generic/expiring_token_test.go` needs a token seeded in state `expiring`; its
  AC12's `conformance/chef/signed_publish_test.go` needs a registered RSA public key whose
  private half reaches the client container as a file (`chef.md`'s signed requests); a robot-owned
  token is what a case presenting automation's credential seeds; and the trusted-publishing
  bindings (`pypi.md` AC19's `conformance/pypi/trusted_publishing_test.go`, `openvsx.md` AC33's
  `conformance/openvsx/trusted_publishing_test.go`, both onto `credential-management.md`'s OIDC
  exchange) need a robot whose trust policy names a fixture OIDC issuer on the case network. All
  four are `credentials` sub-entries (AC25).
- **The first format batch's named cases.** `oci.md` sets `OCI_NAMESPACE` and
  `OCI_CROSSMOUNT_NAMESPACE` under two different registry repositories, so the suite's
  cross-mount really crosses a repository boundary (its resolved name-split decision, was Q8),
  with one multi-repository `credentials` entry spanning both; `conformance/oci/name_split_test.go`
  (its AC17), `conformance/generic/manage_binding_test.go` (the delete-file binding, `generic.md`),
  and `conformance/npm/virtual_test.go` and `conformance/pypi/virtual_test.go` (each format's
  virtual resolution) use the vocabulary as it stands.
- **Trust sets are provisioned, never fetched.** `artifact-verification.md` AC25 lands the
  `trust` key's provisioner and provisions its AC6, AC7, AC9 and AC12 through it, including the
  virtual Sigstore's `sigstore-root`; this harness validates the key and rejects it as not yet
  landed until then (AC17).
- **Signed formats seed through the write path.** `signing-service.md` AC21 requires a
  repository seeded through `state` to serve documents byte-identical to a publish of the same
  content, and the case to read the repository's public keys from the server before its client
  runs (`hackage.md`'s root key ids, `debian.md`'s Release key). The `repositories` entry's
  `signing` sub-entry and the write-path hook are how; AC24 asserts it.
- **Off-origin hosts and hostname-bound formats need names on the case network.**
  `upstream-adapters.md`'s allowlisted off-origin hosts, `homebrew.md` AC17's and `cpan.md`
  AC22's public-host stand-ins, `cran.md`'s pak stand-ins for `cran.r-pkg.org` and the
  Bioconductor hosts pak contacts on every metadata update (a fixture answering `404` fast,
  because with those names refusing connections a captured `pak::pkg_install` still completed
  but spent 13 minutes 50 seconds in its metadata update), `swift.md`'s presigned-store stand-in
  that its Tuist-shaped upstream stand-in answers `303` to, and the hostname a `terraform.md` or
  `puppet.md` repository is bound to all resolve inside the client container to the case network
  (the `hosts` sub-entry of an `upstreams` entry for the first four, the `hostname` sub-entry of
  a `repositories` entry for the last, AC23). Homebrew's API stand-in serves a recorded snapshot of genuinely
  Homebrew-signed documents, because brew accepts no other key: a stand-in serving recorded
  content is already what an `upstreams` entry is.
- **Two protocol-visible observability rules get core cases.** `observability.md` AC14
  (`X-Request-Id` on every response) and AC5 (no `http_route` label equal to a bare mount after
  the suite) place `conformance/core/request_id_test.go` and `conformance/core/route_label_test.go`
  in this harness's core set; they run over every format's traffic and need no key.
- **The proxy layer's two client-timeline claims are format cases.** `proxy-cache.md` AC22
  names proxied rollback cases with the real clients under `conformance/debian/`,
  `conformance/arch/`, `conformance/homebrew/` and `conformance/luarocks/` (a remote never
  adopts an older upstream revision and serves a forward-moving `Last-Modified`), and its AC20
  names the short-close observation in `conformance/<format>/proxied_test.go` for `go`,
  `dotnet`, `mvn`, `composer` and `luarocks` (the client streams, completion withheld until the
  verifier passes). Both use the ordinary `upstreams` stand-in with recorded revisions; no key.
- **Two management routes get real-client cases.** `management-api.md` AC29 places
  `conformance/oci/refresh_test.go` (a `remote` refreshed from the API revalidates upstream
  inside the TTL, observed at the stand-in) and its AC19 `conformance/generic/admin_test.go` (a
  repository created through the API serves a real client); both call the API from `script`.

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

Headers are not the only place a credential travels, and the format specs have now captured
every other one: URL userinfo (`cran.md`'s R, `vagrant.md`, `luarocks.md`, `alpine.md`, `opam.md`),
a path segment (`conda.md`'s `/t/{token}/`, `luarocks.md`'s `api/1/{key}/`, `terraform.md`'s
download capability, `openvsx.md`'s `-/t/{token}`), a query parameter (`vagrant.md`'s
`access_token`, `openvsx.md`'s `token`, the presigned `X-Amz-*` and `X-Goog-Signature` families
an upstream redirect carries), a vendor header (`X-NuGet-ApiKey`, `X-Jfrog-Art-Api`, `X-ApiKey`,
`X-OpenVSX-Token`), a signed-request header set (`chef.md`'s `X-Ops-*`), and a per-machine
identifier that is not a credential but identifies the recording machine (`conan.md`'s
`X-Client-Anonymous-Id`). The allowlist therefore applies to **every position**: userinfo is
never permitted; a query parameter survives only if the format's list names it; a path segment
survives only if it is not at a position the format's list marks as credential-bearing (the
list names those positions by route template, the same forms `auth.md` AC31 enumerates), so a
format whose list omits a declared form fails the list's review; and a header survives only if
named. AC13's proof carries a credential in each position.

Normalisation rules are per-format and are themselves reviewed: an over-eager normaliser hides
real differences, and that failure is invisible because everything goes green. The same review
obligation covers the per-format recording script, because the corpus closes the
unknown-cases gap only for flows the recording session actually drove: a thin script yields a
thin specification that is green everywhere it looks.

**The authoritative-reference exception list.** The resolved authoritative-reference decision
(was Q3) makes the public canonical registry authoritative "with a recorded exception list". A
recorded half with no public reference to record against is on that list, here, and nowhere
else: a local reference is authoritative only for the half its row names, and a disagreement on
any other half is still settled by the public registry.

| Format | Half | Reference, pinned by digest | Why no public reference | Source |
|---|---|---|---|---|
| helm | Write: the ChartMuseum upload a `cm-push` publish drives | a ChartMuseum container | no public chart repository exposes the write API; the read half is recorded against two public repositories of different hosting classes | `formats/helm.md`, resolved corpus-reference decision (was Q7) |
| debian | Hosted: a publish's visibility, a `dput` upload, a Basic-authenticated update, a `by-hash` fetch of a previous generation, a rollback | `reprepro` serving a tree it generated | the public archives accept no test upload; the read half is recorded against `deb.debian.org` and `archive.ubuntu.com` | `formats/debian.md`, "Conformance, the clients and the corpus" |
| rpm | Hosted: the tree a publish produces as each client reads it | a static tree `createrepo_c` 1.2.1 generates from the corpus's packages, signed with GnuPG, behind a pinned static server | public mirrors accept no upload; the read half is recorded against the Rocky, AlmaLinux, UBI, openSUSE and Fedora mirrors | `formats/rpm.md`, its recorded surface |
| rpm | Write | none: no RPM client publishes, so no write corpus exists; publish, delete and the other management operations are `script`-driven cases (AC26) proven by the effect a real client observes | there is nothing to record | `formats/rpm.md`, its recorded surface |
| swift | Hosted: every hosted read and the publish surface the pinned clients drive (a cold resolve, the 5.10 alternate-manifest fetch, the SCM lookups, availability, publish unsigned, signed and without metadata, the duplicate refusal, login, the private-read 401) | the compatibility suite's `PackageRegistryExample` server in a container | no public SE-0292 registry accepts a test publish (the Tuist registry answers `PUT` with 404, captured); the proxied read half is recorded against the Tuist public registry | `formats/swift.md`, "Conformance, the two toolchains and the corpus" |
| vagrant | Hosted: both catalog paths with HEAD and GET, a box download with a resumed range, a missing box | a static server over a hand-authored catalog and box files | vagrantcloud.com creates no boxes from 2026-10-01, stops operating on 2026-12-31 and accepts no test upload; the read half is recorded against vagrantcloud.com while HCP operates | `formats/vagrant.md`, "Conformance, the clients and the corpus" |
| vagrant | Write | none: no Vagrant client publishes to a box catalog, so no write corpus exists; the management kinds are `script`-driven cases (AC26) proven by the effect a real client observes | there is nothing to record | `formats/vagrant.md`, its recorded surface |
| conda | Hosted: the documents a publish, a patch, a revocation, a removal and a notices change produce as each of the five clients reads them | a tree conda-index 0.13.0 generates with its patch generator, behind a pinned static server | no public channel accepts a test publish; the read half is recorded against conda.anaconda.org/conda-forge and repo.anaconda.com/pkgs/main | `formats/conda.md`, "Conformance, the five clients and the corpus" |
| conda | Write | none: no open reference serves either binding (the Artifactory shape is proprietary, prefix.dev a service), so no write corpus exists; the bindings are proven by rattler-build's exit code and the real resolve that follows (AC3, AC4) | there is nothing to record | `formats/conda.md`, its recorded surface |
| alpine | Hosted: the indexes a publish produces as each apk line reads them | a static tree built by `apk index --rewrite-arch` and signed by `abuild-sign -t RSA256` in the pinned Alpine 3.22.6 image, behind a pinned static server | dl-cdn accepts no upload; the read half is recorded against dl-cdn.alpinelinux.org | `formats/alpine.md`, "Conformance, the clients and the corpus" |
| alpine | Write | none: no apk client publishes, so no write corpus exists; the management kinds are `script`-driven cases (AC26) proven by the effect a real client observes | there is nothing to record | `formats/alpine.md`, its recorded surface |
| arch | Hosted: the databases a publish produces as each pacman client reads them | a static tree built by `repo-add -s` in the pinned pacman 7.1 image over GnuPG-signed packages, behind a pinned static server | the Arch and Manjaro mirrors accept no upload; the read half is recorded against geo.mirror.pkgbuild.com and a Manjaro stable mirror | `formats/arch.md`, "Conformance, the clients and the corpus" |
| arch | Write | none: no pacman client publishes, so no write corpus exists; the management kinds are `script`-driven cases (AC26) proven by the effect a real client observes | there is nothing to record | `formats/arch.md`, its recorded surface |
| cran | Hosted: the trees a publish produces as each client reads them (a supersession with its `Archive/` move and `Meta/` documents, a version older than the listed one, Windows, macOS and Linux binary trees, an empty tree) | a tree the pinned R 4.5.1 image's `tools::write_PACKAGES` generates from the corpus's packages, behind a pinned static server | CRAN accepts no test upload; the read half is recorded against cloud.r-project.org | `formats/cran.md`, "Conformance, the three clients and the corpus" |
| cran | Write | none: no CRAN client publishes, so no write corpus exists; publish, `delete-file`, `delete-version` and `delete-package` are `script`-driven cases (AC26) proven by the effect a real client observes | there is nothing to record | `formats/cran.md`, its recorded surface |
| hackage | Write: `cabal upload --publish` with a token and with a password, an identical and a changed-bytes republish | a hackage-server container | hackage.haskell.org accepts no test upload (a maintainer account is required and its upload routes offer Digest alone, captured); the read half is recorded against hackage.haskell.org | `formats/hackage.md`, "Conformance, the clients and the corpus" |
| rubygems | Hosted and write: push new, identical and changed; yank with and without `--platform`; the appended `/versions` and rewritten `/info` a publish and a yank produce; a lockfile install of a yanked version | a geminabox 4.0.1 container with compact_index 0.15.0 built on `ruby:3.3` (sha256:7930e42c707772b6079924702c806a14792bb2916ad3802083cc80fd27cad688) | rubygems.org accepts pushes only into its one public namespace from a real account, where a test gem is a permanent publication and a yank older than 30 days is refused (`Deletion::MAXIMUM_VERSION_AGE`); the read half is recorded against rubygems.org | `formats/rubygems.md`, "Conformance, the three clients and the corpus" |

The rule is mechanical (AC28): each format's corpus manifest under `conformance/<format>/` names
the reference each recorded half was captured against, and a test reads this table and every
manifest and fails on a half recorded against anything but its format's public registry that no
row names, on a row whose reference is not pinned by digest, and on a row no manifest uses, so
the list only grows by an entry here and only shrinks by evidence. A format spec that records a
hosted half against a local reference server adds its row here in the same pass.

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
      validation before it runs; a harness-built client image (from a digest-pinned base and a
      checksum-verified installer, its build recipe in the format's case directory) is pinned by
      the built image's digest under the same rule, and a build whose installer checksum does
      not match fails the build rather than producing an image.
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
      redaction is allowlist-based over every position a credential can travel in, so a header,
      body field or query parameter the format's permitted list does not name is redacted at
      capture time, URL userinfo is always redacted, a path segment at a position the list marks
      credential-bearing is redacted, and the runner rejects a corpus containing any
      non-permitted field. Proven by a recording session carrying a credential in each of a
      header, the userinfo, a path segment and a query parameter the list does not permit, each
      of which must arrive redacted while the permitted path segments beside it survive.
- [ ] AC17: The case `setup` vocabulary is closed: before any container starts, the runner
      rejects a case whose `setup` uses a key or sub-entry the vocabulary table does not define,
      and rejects a defined key or sub-entry whose provisioner has not landed (today the keys
      `advisories`, `policies`, `trust` and `replication`, and the sub-entries the table assigns
      to `repository-lifecycle.md`, `deployment.md`, `signing-service.md`,
      `credential-management.md` and `upstream-adapters.md`) with a different error naming it
      and the spec it lands with. Proven by five fixture cases (a misspelt key, a misspelt
      sub-entry, a not-yet-landed key, a not-yet-landed sub-entry, a valid case), where only the
      valid one reaches the seed path and the two rejection classes are distinguishable by error
      alone.
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
      corpus and no such declaration renders as missing; and the virtual column renders a format
      whose `Capabilities()` declares `Virtual: unsupported` as exempt, citing the format's
      spec, never as passing. Proven by the matrix generator over four fixture formats, one per
      outcome.
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
- [ ] AC23: A client container reaches only the case network: a connection from the client to
      a hostname the case does not declare fails at name resolution, observed in the same case
      that succeeds against the instance; a hostname a `repositories` entry binds through its
      `hostname` sub-entry resolves inside the client container to that instance, is written
      into the instance's configuration through `server.hosts`' loader and serves that
      repository at the host root; and every `hosts` stand-in of an `upstreams` entry resolves
      by its declared name inside the client container, proven by a proxied case whose upstream
      stand-in redirects to a second declared host which the real client then fetches from.
- [ ] AC24: Lifecycle and signing state is provisioned, never triggered: a `repositories` entry
      declaring `state: read_only` yields a repository a real client reads and is refused
      writes on; an entry recreating a name the same case created and deleted yields a new
      repository serving nothing of the old one; and on a fixture handler declaring an
      `Indexer`, a `repositories` entry with a `signing` sub-entry plus a `state` entry serves
      generated, signed documents byte-identical to those a publish of the same content through
      the same instance produces, with the repository's public key readable by the script before
      the client runs and no seed-specific code in the seed path (held by AC18's architecture
      test).
- [ ] AC25: A `credentials` entry provisions a token owned by a named robot, a registered RSA
      public key whose private half the runner delivers to the client container as a file, a
      token in expiry state `expiring`, and a robot `trust_policy` naming the harness's fixture
      OIDC issuer; each is then authorized exactly as `auth.md` and
      `credential-management.md` define, proven by a real client publishing with the robot's
      token, a signed request verified against the registered key, the `expiring` token
      succeeding while its state is visible in the transcript of the listing route, and an
      identity token the script obtains from the fixture issuer by its case-network name being
      exchanged through `POST /api/v1/tokens/exchange` for a token that publishes, while one from
      an issuer the policy does not name is refused.
- [ ] AC26: The runner rejects a format's case set, before any container starts and with an
      error naming what is missing, when a kind its handler declares through `Operations()` has
      no case whose `script` drives it, when the set lacks `rename_test.go`, when a case names a
      recipe id the handler's surface does not declare, when a declared recipe is named by no
      case, or when a case provisions `policies` for a format whose row in
      `supply-chain-policy.md`'s "When a refusal binds, per format" table is still `pending`
      (its AC20); and after the run, a declared recipe named only by failing cases fails the run.
      Proven by fixture case sets and a fixture handler, one per rule, plus one complete set that
      passes.
- [ ] AC27: A `holds` declaration makes the inspecting proxy hold a matching client request
      until the script releases it, so a server-side write performed by the script between the
      hold and the release is observed by the client's later requests and not by the held one,
      proven by a case whose script publishes between two requests and asserts the transcript
      order; the server binary carries no pause path for it, held by an architecture test that
      fails if a hold reaches the binary.

- [ ] AC28: A corpus half recorded against a reference other than its format's public canonical
      registry is accepted only when the authoritative-reference exception list in this spec
      names that format, that half and a reference pinned by digest: a test reading the table
      and every `conformance/<format>/` corpus manifest fails on an unlisted local reference, on
      a row whose reference carries no digest, and on a row no manifest uses, proven by fixture
      manifests one per rule plus the Helm write, Debian hosted and RPM hosted rows passing; the
      RPM write row records that no write corpus exists and its manifest declares none.
## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | architecture test + manual | `conformance/core/arch_test.go` (the core package imports no format package); the adds-only-data half is checked per landing format by the experiment-log procedure in `format-handler-interface.md` (its AC5) |
| AC2 | integration | `conformance/core/runner_test.go` (broken-handler fixture) |
| AC3 | integration | `conformance/core/isolation_test.go` |
| AC4 | unit + integration | `conformance/core/case_validate_test.go` (mutable tag, unpinned built image); `conformance/core/image_build_test.go` (checksum mismatch fails the build; the built image's digest is what the case pins) |
| AC5 | unit | `conformance/core/case_validate_test.go` |
| AC6 | integration | `conformance/record/proxy_test.go` |
| AC7 | integration | `conformance/record/replay_test.go` (mutated-field fixture) |
| AC8 | conformance | `conformance/oci/official_test.go` |
| AC9 | ci | `.github/workflows/ci.yml` conformance job |
| AC10 | ci | `.github/workflows/ci.yml` docs job |
| AC11 | unit | `conformance/core/case_validate_test.go` |
| AC12 | ci | scheduled drift workflow, proven by a written manual-dispatch procedure |
| AC13 | unit + integration | `conformance/record/redact_test.go` (allowlist per position: header, userinfo, path segment by route template, query parameter; corpus rejection), plus a recording session in `conformance/record/proxy_test.go` carrying a credential in each of the four positions, per the criterion's own proof |
| AC14 | integration | `conformance/record/stateful_replay_test.go` (OCI chunked-upload corpus; a minimal chunked-upload fixture server stands in until the OCI handler exists, as AC2's broken-handler fixture already does) |
| AC15 | integration | `conformance/record/seeded_replay_test.go` (pull-flow corpus; missing-declaration fixture) |
| AC16 | integration | `conformance/core/topology_test.go` (including a network-isolated pair) |
| AC17 | unit | `conformance/core/case_validate_test.go` (misspelt key, misspelt sub-entry, not-yet-landed key, not-yet-landed sub-entry, valid fixture) |
| AC18 | integration + architecture test | `conformance/core/seed_test.go` (a `state`-seeded generic artifact fetched by `curl`, and a fixture handler whose version metadata flag changes what the client receives); `conformance/core/arch_test.go` (seed-path imports) |
| AC19 | integration | `conformance/core/upstream_binding_test.go` (one case file, two fixture upstream servers, plus the missing-stand-in rejection) |
| AC20 | unit | `conformance/core/matrix_test.go` (passing, replay-exempt, virtual-exempt and missing fixture formats); shared with `format-handler-interface.md` AC13 and `repository-lifecycle.md` AC4, which assert the same rendering from the `Capabilities()` side |
| AC21 | unit | `conformance/core/external_skip_test.go` (fixture suite results: unlisted skip, entry without an issue, structural entry whose partner failed, listed case that passed, a fully matching run) |
| AC22 | unit + integration | `conformance/core/case_validate_test.go` (case sets missing each auth case kind in each mode); `conformance/core/seed_test.go` (patterned and multi-repository `credentials` entries) |
| AC23 | integration | `conformance/core/network_test.go` (undeclared hostname fails to resolve while the instance is reached; `hostname` sub-entry resolved in the container and present in the instance's effective `server.hosts`; a proxied case through a redirecting stand-in to a second declared `hosts` name) |
| AC24 | integration + architecture test | `conformance/core/seed_test.go` (`read_only` entry against a real client; recreated name serves nothing of the old repository; fixture `Indexer` handler: seeded versus published bytes equal, public key readable first); `conformance/core/arch_test.go` (seed-path imports, shared with AC18) |
| AC25 | integration | `conformance/core/seed_test.go` (robot-owned token, registered public key with the private half delivered as a file, `expiring` token, `trust_policy` against the fixture issuer with a matching and a foreign identity token; each authorized per `auth.md` and `credential-management.md`, the listing route's `state` in the transcript); `conformance/core/oidc_issuer_test.go` (the fixture issuer's discovery document and keys reachable by the instance and the client by its case-network name) |
| AC26 | unit + integration | `conformance/core/case_validate_test.go` (fixture handler declaring two kinds and two recipes; case sets missing a kind's `script` case, missing `rename_test.go`, naming an undeclared recipe, leaving a recipe unnamed, a `policies` case against a fixture binding table with a `pending` row; a complete set); `conformance/core/runner_test.go` (a recipe named only by failing cases fails the run); shared with `management-api.md` AC24, `web-ui.md` AC17 and `supply-chain-policy.md` AC20, which assert the same rules from their side |
| AC27 | integration + architecture test | `conformance/core/hold_test.go` (held request, script publish, release, transcript order); `conformance/core/arch_test.go` (no hold symbol reachable from `cmd/` or `internal/`) |
| AC28 | unit | `conformance/record/reference_exceptions_test.go` (parses this spec's exception table and every corpus manifest; fixture manifests for an unlisted local reference, an undigested row and an unused row; the Helm, Debian and RPM rows passing) |

## Implementation Phases

### Phase 1: Core runner
- Case schema (including the isolation declaration, multi-instance topology with
  network-isolated instance sets, the `client` block's `recipe` field and `holds`), validation,
  digest pinning including harness-built images (AC4), skip-requires-issue, and the case-set
  rules: per-format auth cases (AC22), declared operation kinds, `rename_test.go` and recipes
  (AC26)
- The closed `setup` vocabulary and its first validation layer (unknown key or sub-entry versus
  not-yet-landed key or sub-entry), and run-selected upstream bindings
- Server lifecycle with per-case isolation; the case network with client confinement and
  declared-name resolution (AC23); the inspecting proxy with holds (AC27)
- Client container execution and capture, and the core cases every format's traffic runs under
  (`request_id_test.go`, `route_label_test.go`)

### Phase 2: First subject
- The generic format's hosted cases as the runner's proving ground, plus validation that its
  declared unsupported proxy capability exempts it from proxied-mode coverage
- The seed subcommand and its dry-run validation, landing with the shared metadata store, CAS
  and auth that generic needs anyway, since the seed path writes through those layers and
  cannot exist before them; the base `repositories`, `credentials`, `upstreams` and `state`
  provisioners, with the four sibling keys and every sibling-owned sub-entry still rejected as
  not yet landed

### Phase 3: Recording and replay
- Recording proxy, corpus format, per-format normalisation rules
- Replay-match assertions, request-side correlation for stateful flows, and declared
  starting-state seeding
- The corpus manifest's recorded reference per half and the authoritative-reference exception
  check against this spec's table (AC28)

### Phase 4: Official suites and reporting
- OCI distribution-spec suite as a case source, with external-suite skips matched against the
  format's machine-readable exception list (AC21)
- Matrix generation, including the replay-match column and its declared exemption, the virtual
  column and its declared exemption, and the CI staleness gate
- Scheduled latest-client drift job

After these phases the sibling-owned parts of the vocabulary land with their owners, each
switching its key or sub-entry from "not yet landed" to provisioned: `advisories` and
`policies` with `supply-chain-policy.md`, `trust` with `artifact-verification.md`,
`replication` with `replication.md`, the `repositories` entry's `state` and recreated-name
shapes with `repository-lifecycle.md`, its `hostname` with `deployment.md`'s loader, its
`signing` and the generated-and-signed `state` output with `signing-service.md`, the
`credentials` entry's robot, public-key and expiry-state shapes with `credential-management.md`
and its `trust_policy` with that spec's Phase 3 (the harness's fixture OIDC issuer landing beside
it),
and the `upstreams` entry's `adapter`, `credential` and `hosts` with `upstream-adapters.md`.
Any key or sub-entry beyond the table is a revision of this spec and its re-review, per the
resolved decision that the vocabulary is closed.

## Tasks

Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. Q4 (raised by the 2026-09-23 gate review) and Q5 (exposed while folding Q4's answer)
were adopted on 2026-09-26, and Q6 (raised by the format specs' fallback findings) on
2026-09-28, under the owner's standing delegation, so the owner may reverse any of them.
Resolved decisions are kept rather than deleted, so the reasoning survives the next time
someone asks why it was done this way.

### Resolved: every client container is confined to the case network (was Q6)

**Adopted 2026-09-28 under the owner's standing delegation.** Raised by the format authoring
wave: `julia.md` captured Pkg installing from GitHub with exit 0 after a `403` from the registry,
`cpan.md` found every CPAN client has a route back to public CPAN, `homebrew.md` and `opam.md`
found the same shape, and `julia.md` asked that its cases run with the client's network
restricted "as an obligation this format states rather than inherits". The question is whether
confinement is a per-case declaration or the harness's default for every case.

**Recommendation:** A - every client container sees only the case network, always, with no
opt-out. A case that needs a public host names a stand-in for it, and the stand-in gets that
name on the case network.

| Option | You get | It costs |
|---|---|---|
| **A. Confine every case; declared names only** (adopted) | A refusal case cannot pass by falling back to origin; the main suite is offline by construction, which the upstream-binding rule already promised by discipline; a forgotten restriction is impossible rather than a silent no-op | Every public host a client reaches during a case must have a declared stand-in, so the first case of a format with an off-origin fallback fails at name resolution until its author declares one |
| **B. Confine only cases that declare it** | Formats without a fallback problem keep an unrestricted client | The formats with the problem are exactly the ones whose author may not know it yet; `julia.md`'s finding was captured, not documented, so the declaration would be missing where it matters most |
| **C. No confinement; assert fallbacks in the transcript** | Nothing to build | The transcript sees only traffic through the inspecting proxy; a client resolving a public name directly bypasses it, which is the very failure being tested for |

**Why this is yours:** it makes a network property the harness's rather than each format's, and
the cost falls on every future format author.

Accepted cost: a stand-in per public host a client reaches, declared through `upstreams` and its
`hosts` sub-entry, with a name on the case network (AC23). The cost is already paid where it
bites: `cpan.md` AC22 and `homebrew.md` AC17 name their stand-ins, and `upstream-adapters.md`'s
transport stand-ins are the same mechanism. B lost because the declaration would be absent
precisely where the fallback is unknown; C lost because the fallback bypasses the observation
point.

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
iteration only and never settle a disagreement, except for a half the exception list in Design
("The recording proxy", the authoritative-reference exception list) names: a half no public
registry can be recorded against, which is today Helm's write half (ChartMuseum), Debian's
hosted half (`reprepro`), RPM's hosted half (a `createrepo_c` tree) and RPM's write half (no
reference at all). The list is the recorded exception the settled decision already provided for,
so adding a row applies the decision rather than revising it; AC28 holds it.

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
| 2026-09-28 | b5424a2 | cross-spec reconciliation of the foundation authoring wave. Not a review | Not a review. Every queued item in `agents/spec-loop/consequences.md` targeting this file verified against the current text of its source spec before applying; the four old-fold items (replication 5, data-model and OCI 5, auth and interface 4, format-management 8) found already applied at fe54272. The closed `setup` vocabulary gains the `trust` key (`artifact-verification.md` AC25 builds its provisioner) and sub-entries, each with an owner and a provisioner owner: `repositories` gains `state` (`read_only`) and recreated names (`repository-lifecycle.md`), `hostname` written through `server.hosts`' loader (`deployment.md`, `terraform.md`, `puppet.md`), and `signing` (`signing-service.md`); `credentials` gains robot-owned tokens, registered public keys with the private half delivered to the container as a file, and `expiring` tokens (`credential-management.md`, `chef.md`); `upstreams` gains `adapter`, `credential` and `hosts` (`upstream-adapters.md`); `state` may seed `Retirement` records (`management-api.md`) and comes out generated and signed on an `Indexer` handler through the write-path hook with no seed-side code (`signing-service.md` AC21), which answers the twelve formats that asked the seed path to "invoke the signing service". Sub-entries are closed and validated exactly as keys are (AC17 extended). The seed subcommand's isolation keys named as `database.schema` and `storage.s3.prefix`. The `client` block gains `recipe` with `web-ui.md` AC17's two validator rules; the case-set rules now also require a `script` case per declared `Operations()` kind (`management-api.md` AC24) and `rename_test.go` per format (`repository-lifecycle.md` AC12), all under AC26. Q6 raised in the decision shape and adopted: every client container is confined to the case network and resolves only declared names, which is what makes refusal cases mean anything for Pkg, the CPAN clients, brew and opam (AC23, with the `hosts` and `hostname` names). `holds` on the inspecting proxy for `debian.md` AC8's race case (AC27); harness-built images pinned by built digest (AC4 extended); TLS interception named mandatory for NuGet 9.0 and Terraform. Redaction extended from headers to every credential position the format specs captured (userinfo, path segment by route template, query parameter, vendor and signed headers, `X-Client-Anonymous-Id`), AC13 rewritten with a four-position proof. The virtual column renders `Virtual: unsupported` as exempt (AC20). The sibling-requirements list gains eleven entries (operations, pause routes, lifecycle cases, recipes, credential shapes, trust, signed seeding, off-origin names, the two `conformance/core/` observability cases, the two management-route cases). AC23 to AC27 added with Test Plan rows; Phases 1, 2 and 4 and the trailing provisioner paragraph updated. `node scripts/check-spec.js` run against this file with zero failures. |
| 2026-09-28 | 6e6d503 | cross-spec reconciliation sweep of the foundation wave. Not a review | Not a review. Applied the items raised against this file after its own 2026-09-28 pass, each verified against the source's current text. From `supply-chain-policy.md`: the per-format validator refuses a `policies` case while the format's row in "When a refusal binds, per format" is `pending` (its AC20), folded into AC26 and its Test Plan row; `advisories` entries may declare a second OSV-schema source (its AC21, was Q9); `conformance/maven/policy_test.go` recorded (its AC18). From `proxy-cache.md` (wording): AC22's proxied rollback cases under debian, arch, homebrew and luarocks and AC20's short-close observation in `conformance/<format>/proxied_test.go` recorded as sibling requirements. From `replication.md` (AC31 in `data-model.md`): a `replication` entry may carry a per-link `sync_interval`. Stale wording fixed: an effect-only deletion case seeds the core-held `Retirement` record, no longer "the retirement set carried verbatim in the package-level document" (`management-api.md` was Q3). No question raised or adopted; `node scripts/check-spec.js` zero failures on this file. Stays draft pending a gate review. |
| 2026-09-28 | 3135d95 | closing reconciliation sweep on Opus: cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` targeting this file from "From format batch 3 reconciliation" through the latest section, plus earlier items the progress log did not show applied, verified against the current text of the spec that raised it (`helm.md` was-Q7, `debian.md` and `rpm.md` recorded surfaces, `cran.md`, `swift.md`, `oci.md`, `pypi.md` AC19, `openvsx.md` AC33). Applied: format batch 3 item 8 (the authoritative-reference exception list in Design under "The recording proxy", four rows with reference, half, reason and source; the settled record (was Q3) states the list applies it rather than revising it; new AC28 with a manifest-versus-table test, Phase 3); format batch 8 item 12 (cran's pak stand-ins for `cran.r-pkg.org` and the Bioconductor hosts, with the captured 13 minute 50 second cost of refusing names, and swift's presigned-store stand-in, as `upstreams` `hosts` sub-entries in the sibling list and the vocabulary row); format batch 1 item 5 (a sibling bullet: `OCI_NAMESPACE` and `OCI_CROSSMOUNT_NAMESPACE` under two registry repositories, oci was-Q8, and the named cases `name_split_test.go`, generic `manage_binding_test.go`, npm and pypi `virtual_test.go`; the pypi and openvsx trusted-publishing cases needed a fixture OIDC issuer the vocabulary could not express, so `credentials` gains a `trust_policy` sub-entry landing with `credential-management.md` Phase 3, AC25 and its row extended). Found already done: proxy-cache reconciliation 11, supply-chain reconciliation 7, replication reconciliation 9, management-api reconciliation 9. No question raised (the exception list is the recorded exception the owner's 2026-09-22 decision provided for); `node scripts/check-spec.js` zero failures on this file. Stays draft pending a gate review. |
| 2026-09-28 | 2740b05 | format closing sweep bookkeeping on Opus. Not a review | Not a review. Added the exception-list rows the Swift and Vagrant format sweep reported (Swift hosted against `PackageRegistryExample`; Vagrant hosted against a static catalog server, and a Vagrant write row with nothing to record), so AC28 names every local reference those corpora use. No question, no criterion changed. |
| 2026-09-28 | f8ad8b2 | format closing sweep bookkeeping on Opus. Not a review | Not a review. Added the conda, alpine and arch exception-list rows (a hosted half against a pinned locally generated tree, and a write row with nothing to record, for each) that the format sweep reported, so AC28 names every local reference those corpora use. No question, no criterion changed. |
| 2026-09-28 | a3a9d78 | format closing sweep bookkeeping on Opus. Not a review | Not a review. Added the cran (hosted against a pinned `write_PACKAGES` tree, and a write row with nothing to record) and hackage (write against a hackage-server container) exception-list rows the format sweep reported. No question, no criterion changed. |
| 2026-09-28 | a3a9d78 | RubyGems authoring bookkeeping on Opus. Not a review | Not a review. Added the rubygems exception-list row (hosted and write halves against a geminabox container pinned by its base image digest, since the image is built locally). No question, no criterion changed. |
