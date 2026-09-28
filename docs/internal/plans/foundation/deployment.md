---
status: draft
status_description: "Closing reconciliation sweep 2026-09-28 at 3135d95 on Opus (not a review): index.render_memo_bytes (256 MiB, signing-service was-Q13) added to the index. row, which now holds 5 keys, so signing-service's 14 keys are 9 signing. plus 5 index. and the inventory reads 85 sibling keys under 13 prefixes (the earlier 14-prefix count was wrong; every owner's table recounted at this sha); a server.hosts list naming one hostname twice fails config validate and serve and is refused on SIGHUP with the previous binding kept, and a rename leaves a by-name binding at a missing repository until edited and reloaded (repository-lifecycle was-Q10), both in AC12; server.public_url names its readers; ui.help_url's default stated. 32 criteria, zero open questions; stays draft. Earlier: Reconciled 2026-09-28 at ff7966e with the foundation authoring wave (not a review). Authored 2026-09-27 at ff566dd as a grounded first draft. The key inventory is now exhaustive against every sibling key table: 84 sibling keys under 14 prefixes (auth. 9, credentials. 8, gc. 6, signing. 9, index. 4, async. 11, telemetry. 17, management. 4, verify. 4, policy. 5, replication. 2, upstream. 3, ui. 2) beside the 29 this spec owns; no prefix stays reserved, and auth.allow_plaintext and the three upstream.* defaults moved to their owners' rows. Added the storage check subcommand, the web UI build step as a packaging duty (AC32), and citations of the applied sibling decisions (host binding through Deps, the harness client-confinement decision, the supply-chain refusal status line, async unknown-kind skipping, the internal/db/lock constants, the replication key recipe). Thirteen questions adopted under the standing delegation, zero open; Q13 recorded as met. 32 criteria, each with a Test Plan row. Awaits a /spec review pass."
description: "Spec for deployment, configuration and operations: one binary whose roles are configuration, one validated configuration schema behind file, environment and flags with a mechanical check that every key a spec defines is present and documented, PostgreSQL and S3-compatible object storage as the only runtime dependencies, the instance master key, TLS termination and the HTTP/1.1 reason-phrase constraint, host binding for hostname-addressed formats, the container image, Helm chart and Compose file, forward-only migrations with rollback by previous-minor compatibility, multi-replica constraints and the advisory-lock singletons, backup and restore of PostgreSQL plus the CAS, and resource sizing derived from the benchmark gate."
author: michielvha
goal: "Make the registry runnable, upgradable and recoverable by an operator who reads one configuration reference and one chart, with every key a spec defines present, validated and documented by construction, every multi-replica hazard held by a named mechanism, and no dependency beyond PostgreSQL and object storage."
priority: "critical"
issue: 52
created: 2026-09-27
covers:
  - "cmd/**"
  - "internal/config/**"
  - "internal/db/**"
  - "internal/server/**"
  - "deploy/**"
  - "scripts/check-config-keys.js"
fable_recheck: "authored in the 2026-09-27 cloud session, whose model is not recorded; needs a Fable authoring-quality review before any gate"
---

# Plan: Deployment, Configuration and Operations

One binary, one configuration schema, two external dependencies (PostgreSQL and S3-compatible
object storage), and the packaging (container image, Helm chart, Compose file) and operating
procedures (migrations, upgrade and rollback, backup and restore, multi-replica constraints,
sizing) that make the registry the constitution promises deployable by someone who did not
write it.

## Context

The charter places this spec at two build steps: the configuration and deployment **baseline at
step 2**, alongside the observability baseline and the management surface core, because the
generic format, the harness and every later handler read their settings through it; and
**packaging at step 4**, where the container image and Helm chart ship with the OCI handler and
the proxy layer (`project-charter.md`, the build order's reconciled placement: "observability and
deployment (baselines at step 2, packaging at step 4)"; its Phase 1 names `deployment.md`
Phases 1 and 2 and its Phase 2 names Phase 3 "before the repository goes public"). The charter's
own risk register names the opposing pressure: the project competes partly on being easy to run,
and the mitigation it records is "a genuinely good single-command deployment"
(`storage-and-gc.md`'s market-risk paragraph cites the same). This spec is that mitigation
written down.

Nothing exists in the tree yet: `cmd/stackweaver-registry/main.go` prints "not implemented" and
exits 1, there is no `internal/`, no `deploy/`, and `make run` already invokes
`./cmd/stackweaver-registry serve` (Makefile, the `run` target), so the `serve` subcommand this
spec fixes is the one the Makefile expects. The module is `github.com/vhco-pro/stackweaver-registry`
at Go 1.26.

**Who depends on this spec, and for what.** The requirements below were gathered from the
citing specs and the consequences queue rather than invented here; each is asserted by a
criterion.

| Citing spec | What it places here | Where it lands |
|---|---|---|
| `credential-management.md` (its Configuration table, resolved API-only decision, was Q7) | The eight `credentials.*` keys; the first-mint procedure (a `curl` with the local admin credential; no CLI in v1) | Key inventory; "First run and first mint" |
| `signing-service.md` (its Configuration table, AC13, AC14, AC26, AC31) | The 14 `signing.*` and `index.*` keys (`index.render_memo_bytes`, 256 MiB, its was-Q13 memo bound, among them) plus the citation of `security.master_key`; master-key and PIN handling ("never a flag value", "never a flag or a logged value"); a SoftHSM2 recipe; a replicated-repository key recipe (its AC23, `replication.md` AC21) | Key inventory; "The instance master key"; Recipes |
| `upstream-adapters.md` (its Configuration keys table, AC5, AC32) | The three `upstream.*` instance defaults it tables (concurrency 10, cool-down cap 1h, connect timeout 10s), the computed `User-Agent`, `HTTPS_PROXY`/`NO_PROXY` honoured once instance-wide | Key inventory; "Not keys, on purpose" |
| `async-operations.md` (its Configuration table, AC22, AC26, its resolved worker-placement decision, was Q8) | The eleven `async.*` keys and the `async.workers: 0` web-replica recipe; "one binary and one deployment story"; a job of an unknown kind skipped, never failed, during a rolling upgrade (its resolved unknown-kind decision, was Q10) | Key inventory; "Roles"; Helm chart; "Upgrade and rollback policy" |
| `observability.md` (its Configuration table, AC17, AC27) | The 17 `telemetry.*` keys and defaults; the second listener `:9464` not exposed publicly; `deploy/observability/alerts.yaml` packaging with the templated signing lead; a Grafana dashboard reading the generated catalogue; log collection and rotation; `SIGHUP` for the audit file | Key inventory; Listeners; Packaging; Signals |
| `storage-and-gc.md` (its Configuration table, AC26, AC27, AC29) | The six `gc.*` keys; the sweep lock through `internal/db/lock.LockSweep`; the consistency checker as `stackweaver-registry storage check` with `--restore-dangling`; bucket versioning as the requirement the restore relies on | Key inventory; CLI shape; Singletons; Backup and restore |
| `supply-chain-policy.md` (its Configuration table, AC18, AC20, AC23) | The five `policy.*` keys; the operator page "When a refusal actually blocks an install" generated from its "When a refusal binds, per format" table; the refusal status line written by a hijacked HTTP/1.1 write in the shared refusal path (its resolved refusal-status-line decision, was Q10) | Key inventory; "Refusal enforceability"; "HTTP/1.1 on the main listener" |
| `replication.md` (its Configuration table, AC21, AC24) | The two `replication.*` keys; the replicated-repository key recipe's follower half | Key inventory; Recipes |
| `web-ui.md` (its "Serving and mounting", "The stack", AC1, AC26) | `make build` depends on `make web` (`npm ci` and `vite build` into `internal/ui/dist`), a GoReleaser `before` hook and a Node 22 Dockerfile build stage, so no release artefact carries the placeholder; the two `ui.*` keys; `ui` as a reserved first segment | CLI shape and packaging ("The web UI build"); Key inventory |
| `auth.md` (its Configuration table, AC2, AC13, AC15, AC27) | The nine `auth.*` keys, `auth.allow_plaintext` and its flag `--allow-plaintext-auth` among them; TLS required on every credential-bearing path, enforced by the server; the plaintext flag doubles as the behind-a-terminating-proxy declaration, never inferred from `X-Forwarded-Proto`; the first-start local admin credential emitted to the log once (AC15) | TLS; Key inventory (the `auth.` row); "First run and first mint" |
| `proxy-cache.md` | Upstream credentials "stored encrypted" (AC6), the instance master key's first consumer; offline mode as "one instance-level setting" with no per-repository or per-upstream flag (AC5) | "The instance master key"; `proxy.offline` |
| `storage-and-gc.md` | "At most one sweep runs at a time, enforced (a PostgreSQL advisory lock suffices)"; the single deleter (AC15); the store must be S3-compatible with LIST consistency treated as eventual; the consistency checker comparing references, blob rows and objects | Singletons; Object storage requirements; Backup and restore |
| `async-operations.md` | The scheduler is an advisory-lock leader (River's model); `LISTEN`/`NOTIFY` wake-up; `SELECT ... FOR UPDATE SKIP LOCKED` claims | PostgreSQL requirements; Singletons |
| `data-model.md` | No handler owns a table or issues DDL (its architecture test); adding a format requires zero schema migrations (AC8); the shared schema is the only schema | Migrations |
| `format-handler-interface.md` | Root-anchored carve-outs for hostname-addressed formats (its "Host-bound claims"); the host binding `server.hosts` passed at construction through `Deps` and reloadable on `SIGHUP`, with its home a re-open input (its "The scheduled re-open"); reserved first path segments (AC11) | Host binding |
| `supply-chain-policy.md` ("When a refusal binds, per format", AC20) | Refusals are enforceable only where client egress is restricted to the registry: a deployment precondition per format, tabled per ecosystem | "Refusal enforceability is a deployment precondition" |
| `supply-chain-policy.md` (its resolved refusal-status-line decision, was Q10; AC18) | Reason-phrase-only clients need HTTP/1.1 on refusal routes: HTTP/2 has no reason phrase; "affects reverse proxies and TLS terminators" | "HTTP/1.1 on the main listener" |
| `management-api.md` | The server binary is a Cobra CLI (`cmd/stackweaver-registry`) with a `serve` command and no management subcommands; configuration "follows the cobra-viper skill: a Viper instance created in the root factory, keys unmarshalled into a typed `manage.Config` the package receives (never Viper itself), every key with a default, bound to `STACKWEAVER_REGISTRY_` environment variables"; the four `management.*` keys; no key may disable the API | CLI shape; Configuration design; Key inventory |
| `conformance-harness.md` | The `seed` subcommand of the server binary, run "against the instance's isolated database schema and storage prefix" (its resolved seed-path decision; AC18); the `repositories` hostname binding written through `server.hosts`' loader and every client container confined to the case network (its resolved client-confinement decision, was Q6; AC23) | CLI shape; `database.schema`, `storage.s3.prefix`; Host binding; "Refusal enforceability" |
| `artifact-verification.md` (its Configuration table) | The four `verify.*` keys; the former `verify.workers` is `async.kind_limits` (the resolved worker-limit decision below, applied there) | Key inventory |
| `replication.md` | A follower is an ordinary instance configured per repository; no instance identity | Roles (nothing to add to the binary) |
| `repository-lifecycle.md` | Repository settings live in the repository record, not in this surface | Scope boundary between configuration and records |
| `repository-lifecycle.md` (its resolved hostname-binding decision, was Q10; AC28) | `server.hosts` keeps binding by repository name; a rename leaves a binding naming the old name at a missing repository (warning and `404`) until the operator edits and reloads it | Host binding; AC12 |
| `formats/puppet.md` AC8 (format batch 8 item 7) | A configuration listing one hostname twice is refused at load | Host binding; AC12 |

**The standing grounding.** Every claim about a sibling above is cited to that spec's text as
read at `ff566dd`; every claim about prior art below was fetched this run. Two sources
answered with nothing usable and are recorded as silence rather than recollection: JFrog's help
pages for Artifactory HA and system requirements render client-side and returned empty bodies,
and the Pulp operator's install guide answered 403. Where this spec says "Artifactory does X"
it says so only from `docs/internal/research/prior-art-artifact-repositories.md`.

## Scope

**In scope**

- The process model: one binary, one process kind, roles selected by configuration
  (the resolved single-binary decision below).
- The CLI shape: the Cobra command tree of `cmd/stackweaver-registry` (`serve`, `migrate`,
  `config`, `keys`, `storage check`, `seed`, `version`), following the vendored cobra-viper
  skill, which is binding.
- The configuration surface: one schema registry in `internal/config`, the precedence order,
  the file format, the environment binding, the flag set, secret handling and `_file`
  indirection, strict decoding, startup validation, and the mechanical two-way check between
  the schema and every key table in `docs/internal/plans/`.
- The complete key inventory as of this sha: every key a foundation spec defines, with its
  default, its owner and its secret classification, plus the keys this spec owns (`server.*`,
  `database.*`, `storage.*`, `security.*`, `proxy.offline`). No prefix is reserved for an owner
  that has not tabled its keys: every sibling that owns configuration now tables it.
- The instance master key: format, sourcing, envelope encryption, rotation, and the boundary
  test that keeps it out of flags and logs.
- Runtime dependencies and their requirements: PostgreSQL (version, extensions, connection
  budget, `LISTEN`/`NOTIFY`, advisory locks) and S3-compatible object storage (operations
  used, consistency assumptions, versioning for restore).
- Listeners and TLS: the main listener, the telemetry listener, native TLS with reload, the
  plaintext-auth flag, and HTTP/1.1 by default on the main listener.
- Host binding for hostname-addressed formats.
- Process signals, graceful shutdown and the probes' semantics as the deployment sees them.
- Migrations: forward-only, advisory-locked, compatible with the previous minor's binary, run
  at startup or by `migrate` in a pre-upgrade hook.
- Upgrade and rollback policy.
- Multi-replica constraints: what is a singleton, what holds it, what an operator may scale.
- Backup and restore of PostgreSQL plus the CAS, and the consistency contract between them.
- Packaging: the container image, the Helm chart, the Compose file, `alerts.yaml` and the
  Grafana dashboard, the generated configuration reference under `docs/`, and the web UI build
  step every release path runs first (`web-ui.md`'s frontend built into `internal/ui/dist`).
- Resource sizing as a method tied to the benchmark gate, not a guessed table.
- The recipes the siblings asked for: web-only replicas, SoftHSM2, replicated-repository keys,
  first mint, air gap.
- Mechanical enforcers for every boundary this spec introduces.

**Out of scope, with reasons that are not effort**

- **Per-format or per-repository settings.** Retention rules, upstream definitions, virtual
  membership, signing keys and trust sets are records administered through the management API
  (`repository-lifecycle.md`, `management-api.md`); a setting that lives in a file and in a row
  has two sources of truth, and the harness's seed path already provisions records without a
  file. The configuration surface carries instance policy only.
- **A bundled PostgreSQL or object store in the Helm chart.** Harbor's chart bundles a database
  its own HA guide then tells you to replace ("Highly available PostgreSQL 9.6+ - users must
  provide this separately"); Gitea's chart bundles a PostgreSQL its HA guide calls "not
  HA-ready". A bundled database is the one operators run in production by accident, and the
  registry's durability argument (`storage-and-gc.md`) rests on the database being someone's
  job. The Compose file bundles both for evaluation and says so in its first line.
- **A filesystem blob backend.** `storage-and-gc.md` fixes the store as S3-compatible object
  storage and its orphan scan and grace logic are written against object-store LIST semantics;
  a second backend is a second set of consistency assumptions the fault-injection suite would
  have to cover twice. Evaluation uses MinIO from the Compose file.
- **Redis, Valkey, etcd or any second coordination store.** The resolved coordination decision
  below: PostgreSQL already carries the queue, the leader lock, the sweep lock and sessions, and
  a second store is a second failure domain the HA story must then explain.
- **ACME / automatic certificate issuance.** Gitea offers `ENABLE_ACME`; here the common
  production shape is a terminating proxy or an ingress with its own issuer, and an ACME client
  inside the registry needs port 80 or DNS control the registry has no other reason to hold.
  Native TLS from files with reload covers the direct-exposure case.
- **A built-in reverse proxy or rate limiter.** Rate limits and WAF rules are the ingress
  tier's; the registry exposes the request log and metrics they need (`observability.md`).
- **Cross-cloud secret managers as configuration sources.** Every secret key accepts a file
  path, which is how Kubernetes, Docker Compose, systemd credentials and Vault agents all
  deliver secrets; a native Vault or cloud-KMS client for configuration would add egress and a
  credential to the process for a problem the platform already solves. KMS for *signing* keys
  is `signing-service.md`'s `kms` backend and is unaffected.
- **Multi-region active-active.** `replication.md` settles read-only followers per repository;
  a second writer is out of that spec's scope and therefore this one's.
- **Log storage, rotation and retention** beyond the audit file's `SIGHUP` reopen.
  `observability.md` places them with the deployment "because the right answer differs between
  a container platform and a systemd unit"; this spec documents the two shapes and ships the
  Compose and Helm defaults, and stops there.
- **The web UI's design, pages and browser tests.** `web-ui.md` owns them. This spec owns only
  the build step that puts the frontend into the binary (`make web`, the Dockerfile stage, the
  GoReleaser hook) and the two `ui.*` keys' place in the schema, because a release artefact that
  carries the placeholder page is a packaging defect, not a UI defect.

## Design

### Prior art, and what is taken and rejected

Fetched this run unless marked otherwise.

- **Harbor** (`harbor.yml` reference, HA guide, Helm chart README, GC guide). Configuration is
  one YAML file applied by `install.sh`; no environment or flag layer is documented. Components
  are many (core, jobservice, registry, portal, nginx, trivy, redis, database) and the HA guide
  requires external PostgreSQL, external Redis and shared storage, with "most of Harbor's
  components stateless now". The chart exposes `expose.type` (ingress, clusterIP, nodePort,
  loadBalancer, Gateway API), `internalTLS.enabled`, `persistence.imageChartStorage.type`
  (`filesystem`, `s3`, `gcs`, `azure`, `swift`, `oss`), `caBundleSecretName`,
  `existingSecretAdminPassword`, and a `secretKey` "16-character encryption key (default:
  `not-a-secure-key`)". GC "runs without interrupting your ability to continue use Harbor" and
  "can be only run once per minute". **Taken:** the operational port for `/metrics` and probes
  (already `observability.md`'s decision), external database and storage as the HA shape,
  `caBundleSecretName` as the CA-injection value, a CA-trust path for private upstreams.
  **Rejected:** the component count (one binary here), Redis, a default encryption key of any
  value (the master key is required and has no default), file-only configuration.
- **Gitea** (config cheat sheet, upgrade guide, Helm chart README and `docs/ha-setup.md`).
  One binary; `app.ini` with `GITEA__section__KEY` environment overrides and a `__FILE` suffix
  that reads a secret from a path (`GITEA__database__PASSWD__FILE=/run/secrets/db_password`);
  `ROOT_URL` "must reflect the external URL"; `REVERSE_PROXY_TRUSTED_PROXIES`; migrations run
  automatically ("On each startup, Gitea verifies that the database is up to date and will
  automatically perform any necessary migrations"); downgrade only within a patch series
  ("Since you can not run an old Gitea with an upgraded database, a backup should always be made
  before a database upgrade"). HA: "Currently Cron jobs are run on all replicas as no leader
  election is implemented", `bleve` and `REPO_INDEXER` must be disabled, RWX storage required.
  **Taken:** one binary; the `_file` secret indirection; the explicit public URL; startup
  migration as the default. **Rejected:** the no-leader-election HA (every periodic role here is
  advisory-locked, `async-operations.md`); writing environment into the config file before start
  (`gitea config edit-ini --apply-env`), because Viper merges sources at load and nothing is
  rewritten on disk; downgrade-by-backup-only (rollback here is a supported binary step within
  one minor, below).
- **CNCF distribution registry** (configuration reference). YAML with `REGISTRY_variable`
  environment overrides "where the `_` (underscore) represents indention levels", which makes a
  key containing an underscore ambiguous; exactly one storage backend; the `s3` driver's
  `regionendpoint`, `forcepathstyle`, `chunksize`; `http.addr`, `http.secret`, `http.tls`,
  `http.debug.prometheus`; a `health` section of periodic storage checks. **Taken:** the S3
  parameter set (`endpoint`, `region`, `bucket`, `force_path_style`, `part_size`); readiness
  that probes the storage backend. **Rejected:** the underscore ambiguity, resolved here by
  binding every key explicitly from the schema and refusing a schema whose derived environment
  names collide.
- **Pulp** (settings reference). Dynaconf settings with `PULP_` environment variables;
  `DATABASES` "is the only supported database" (PostgreSQL); `STORAGES` with filesystem, S3 and
  Azure; `CONTENT_ORIGIN` as the externally reachable origin; `SECRET_KEY` mandatory;
  `DB_ENCRYPTION_KEY` "points to a symmetric fernet key file (default:
  `/etc/pulp/certs/database_fields.symmetric.key`)"; `WORKER_TYPE` `"pulpcore"` uses
  "PostgreSQL advisory locks, default" over the `"redis"` alternative. **Taken:** PostgreSQL as
  the only database and the only coordinator (Pulp's own default); a mandatory instance key held
  in a file; the externally reachable origin as required configuration. **Rejected:** a default
  path for the key (a default path is a default key in a container image), Redis as an option.
- **Nexus Repository** (system requirements). Java 21; "up to two-thirds of available RAM" to
  the JVM; sizing profiles from XS (4 vCPU, 16 GiB) to XL (48 vCPU, 192 GiB); PostgreSQL must
  be a supported release, the database user "must be the owner of the database", `pg_trgm`
  required; "active writer with read-only standby" only, pgpool unsupported; "at least 4GB
  available disk space at all times" or the database goes read-only; S3 for blob stores only;
  HA requires shared PostgreSQL and shared blob store. **Taken:** the database-owner
  requirement (migrations need it), the disk-headroom idea as a readiness check on the spool
  directory, shared database plus shared store as the HA precondition. **Rejected:** a sizing
  table by tier as a promise (sizing here is measured by the benchmark gate, below); an embedded
  database for anything.
- **Artifactory.** From `docs/internal/research/prior-art-artifact-repositories.md` only: HA,
  SSO and quotas are licensed. Its `system.yaml`, `master.key` and `join.key` are recollection
  and are not relied on here.
- **PostgreSQL** (explicit locking reference). "Once acquired at session level, an advisory lock
  is held until explicitly released or the session ends"; "session-level advisory lock requests
  do not honor transaction semantics"; "Session-level and transaction-level lock requests for
  the same advisory lock identifier will block each other in the expected way". **Taken:**
  session-level locks held on a dedicated connection for the scheduler leader and the sweep,
  released by the server on connection loss; transaction-level locks for the migration runner.
- **golang-migrate** (README). Paired `up`/`down` SQL files, a versions table, a dirty state
  after failure fixed by `force`. **Taken:** numbered SQL files and a versions table.
  **Rejected:** `down` files and the dirty-force workflow: rollback here is by previous-minor
  compatibility, and a half-applied migration is prevented by running each migration in one
  transaction (PostgreSQL DDL is transactional), so there is no dirty state to force.

### Process model: one binary, roles by configuration

The registry ships as **one binary and one process kind**. Every process runs the HTTP server,
in-process job workers and the scheduler candidate; configuration turns roles off, never on:

| Role | Default | Turned off by | Notes |
|---|---|---|---|
| Serve client traffic (main listener) | on | never | A process that serves nothing is the worker recipe below, which still binds the listener for probes |
| Run job workers | on | `async.workers: 0` | `async-operations.md`'s enqueue-only replica |
| Scheduler candidate | on | `async.scheduler: false` | Election is `async-operations.md`'s advisory-lock leader |
| Telemetry listener | on | `telemetry.listen: ""` | `observability.md` |

This is the resolved single-binary decision below. Harbor's seven components and Pulp's
api/content/worker split each exist because those systems bundle unrelated runtimes (nginx,
Trivy, Django workers); here every role is Go code sharing one schema, one connection pool and
one configuration, and `async-operations.md` already chose in-process workers with `workers: 0`
for isolation. A two-Deployment layout is therefore a *chart value*, not a second binary or a
second command.

### The CLI

`cmd/stackweaver-registry` is a Cobra CLI built as the cobra-viper skill prescribes: a
`NewRootCmd()` factory that creates its own `*viper.Viper`, `SilenceUsage` and `SilenceErrors`
on the root, `RunE` everywhere, `PersistentPreRunE` on the root that loads configuration and
binds flags after parsing, `ExecuteContext` with a `signal.NotifyContext` for `SIGINT` and
`SIGTERM` in `main.go`, output through `cmd.OutOrStdout()`, and tests that execute the factory
in-process. No package under `internal/` other than `internal/config` imports Cobra or Viper;
every package receives a typed configuration struct (`server.Config`, `async.Config`,
`telemetry.Config`, `manage.Config`, `signing.Config`, and so on) that `internal/config`
unmarshals and validates.

Commands, grouped in help as the skill's `cobra.Group` allows:

| Command | Group | Does |
|---|---|---|
| `serve` | Core | Loads and validates configuration, runs pending migrations (when `database.migrate_on_start`), starts listeners, workers and the scheduler candidate |
| `migrate up` / `migrate status` | Admin | Applies pending migrations under the migration lock and exits; prints the applied and pending versions. Used by the Helm pre-upgrade hook |
| `config validate` | Admin | Loads every source, validates the schema, prints every violation at once, exits non-zero on any |
| `config show` | Admin | Prints the effective configuration in the file format, every `secret` key rendered as `<redacted>` |
| `config schema` | Admin | Prints the schema registry as JSON or Markdown (`--format`); the generated reference under `docs/` is this output |
| `keys generate` | Admin | Prints a fresh 32-byte master key, base64, to stdout, nothing else |
| `keys rotate-master --new-key-file` | Admin | Re-wraps every data key under the new master key (below); refuses while any other process holds the rotation lock |
| `storage check [--restore-dangling]` | Admin | `storage-and-gc.md`'s consistency checker (its AC27) as a subcommand: compares references, blob rows and objects under the instance's prefix and reports orphans, dangling rows and digest mismatches; `--restore-dangling` restores each dangling row's object from its latest non-current bucket version ("Backup and restore" below) |
| `seed` | Harness | `conformance-harness.md`'s seed subcommand, unchanged here; it shares the configuration loader so the harness's isolated `database.schema` and `storage.s3.prefix` are ordinary keys |
| `version` | Core | Cobra's built-in `--version` with `-ldflags` populated `version`, `commit`, `date`; the subcommand form adds `--json` |

There are no management subcommands (`management-api.md`'s resolved API-first decision) and no
token subcommands (`credential-management.md`'s resolved decision); the first mint below is a
`curl`. `management-api.md` lists the same operational set (`seed`, `migrate`, `config`, `keys`,
`storage check`, `version`) as the non-management subcommands ("Configuration and the CLI
stance"). `seed`, `storage check` and the `keys` and `migrate` commands write through the shared
layers only, held by `conformance-harness.md` AC18 for `seed`, by `storage-and-gc.md` AC15's
deleter scan for `storage check` (it restores, never deletes) and by this spec's enforcer table
for the others.

### The configuration surface

**One schema registry.** `internal/config` holds a registry of every configuration key the
binary understands: name, Go type, default (or `required`), owner (the spec path that defines
it), one-sentence meaning, constraints (range, enum, "both or neither" groups), and a `secret`
flag. Everything else derives from it: Viper defaults (`SetDefault` for every key, which is what
makes environment-only values visible to `Unmarshal`), explicit `BindEnv` for every key, the
flag set, the validation pass, `config show`'s redaction, `config schema`'s output, and the
generated reference. A key not in the registry does not exist: the decoder runs with unused-key
errors on, so a misspelt key in the file fails startup naming the key, and an environment
variable carrying the prefix that matches no registered key fails startup the same way.

**Sources and precedence**, highest first, exactly the skill's hierarchy: flags, environment,
the configuration file, defaults. There is no `Set()` layer in production code.

**The file.** YAML, nested by dotted key (`async.workers` is `async: {workers: 8}`), located by
`--config`, else `STACKWEAVER_REGISTRY_CONFIG`, else `/etc/stackweaver-registry/config.yaml`,
else none: a registry with no file runs from environment and defaults alone, which is the
container shape. A missing file at an explicit path is an error; a missing default path is not.
The file is read once at start; `SIGHUP` reloads only the reloadable subset (below).

**The environment.** Prefix `STACKWEAVER_REGISTRY_`, replacer `.` and `-` to `_`, upper-cased,
so `async.poll_interval` is `STACKWEAVER_REGISTRY_ASYNC_POLL_INTERVAL`, the form
`management-api.md`, `observability.md` and `async-operations.md` already assert. The distribution
registry's ambiguity (a key containing `_` versus a nesting level) cannot arise because names
are never parsed back from the environment: every key is bound explicitly, and a schema test
refuses two keys whose derived variables collide. Lists are comma-separated in the environment
and YAML lists in the file; structured lists (`server.hosts`) are file-only and the environment
form is refused with a message naming the file key.

**Flags.** The flag set is deliberately short, because a flag is the one source that lands in
process listings, shell history and `kubectl describe`: `--config`, `--listen` (`server.listen`),
`--public-url`, `--allow-plaintext-auth` (`auth.allow_plaintext`, the name `auth.md` chose),
`--log-level` and `--log-format` (`telemetry.log.*`), `--workers` (`async.workers`) and
`--no-scheduler` (`async.scheduler: false`), all persistent on the root so `serve`, `migrate`
and `seed` share them; every other key is file or environment. A key marked `secret` never has
a flag, and a schema test asserts the registry cannot mark a flagged key secret. This honours
`signing-service.md`'s "never a flag value" for the master key and PIN and generalises it.

**Secrets.** A key marked `secret` (`database.url`, `storage.s3.secret_key`,
`security.master_key`, `auth.oidc.client_secret`, the pkcs11 PIN, and any future one) accepts
its value from the file or the environment, and additionally from a **`_file` sibling**
(`security.master_key_file`, `database.url_file`, ...) that names a path whose trimmed contents
are the value. The `_file` form is the recommended one and the one the chart and Compose file
use; it is Gitea's `__FILE` and Pulp's key file generalised to every secret. Setting both forms
is an error. Secret values are redacted by `config show`, absent from the startup configuration
log line, and passed through `observability.md`'s `telemetry.Secret` type so the redaction
chain sees them (`observability.md`'s redaction design). `signing.pkcs11.pin_file` already has
the `_file` shape and keeps it.

**Validation** runs before any listener opens and reports every violation together: type,
range and enum checks from the schema; group constraints (`server.tls.cert_file` and
`server.tls.key_file` both or neither; `telemetry.audit.file` required when
`telemetry.audit.sink: file`; `signing.pkcs11.*` all or none); the required set
(`server.public_url`, `database.url`, `storage.s3.bucket`, `security.master_key`); relational
checks other specs fixed (`async.job_retention` not shorter than `management.operation_retention`,
`async-operations.md`; `credentials.exchange_token_lifetime` capped at `1h`,
`credential-management.md`); and the file's unknown keys. `config validate` is the same pass
without starting anything, for CI and pre-deploy checks.

**Reload.** `SIGHUP` reopens the audit file (`observability.md`) and reloads TLS certificates
and `server.hosts`; every other key needs a restart, and the startup log names which keys are
reloadable so an operator does not guess. A reloadable key's schema entry says so and the
generated reference prints it.

**The generated reference.** `docs/deployment/configuration.md` is the Markdown rendering of
`config schema`, one table per prefix, each row the key, type, default or `required`, whether
secret, whether reloadable, the owning spec and the meaning. CI regenerates it and fails when
the committed copy differs, the same shape as the docs index check in `.github/workflows/ci.yml`.

**The two-way spec check.** `scripts/check-config-keys.js` parses every table row of the form
`| \`prefix.key\` | default | meaning |` under `docs/internal/plans/` and compares the set
against `config schema --format json`: a key a spec tables that the schema lacks fails, a key
the schema holds that no spec tables fails, and a default that differs between the two fails.
It runs in `make verify` and in CI's docs job. This is the mechanical check the brief asked
for, and it is what makes "every key a spec defines is present and documented" a property the
build holds rather than a review item. Its regex is the reason every spec's key table must keep
the three-column shape with the key in backticks in the first column.

### Key inventory

Every key the binary knows at this sha. Defaults are the owning spec's; a default written here
that differs from the owner's table is a defect the two-way check catches. Durations are Go
`time.Duration` strings; sizes accept `MiB`/`GiB` suffixes.

**Owned by this spec**

| Key | Default | Meaning |
|---|---|---|
| `server.listen` | `:8080` | Main listener address (host:port) |
| `server.public_url` | required | The externally reachable base URL, scheme included, used in every generated absolute URL, the token service's issuer and the fixed upstream `User-Agent`; handlers composing absolute URLs read it through `Deps` (npm, PyPI, Cargo), and `signing-service.md`'s serve-time `Render` stage takes it as an input for generated documents (its was-Q13); never inferred from `Host` |
| `server.hosts` | `[]` | Hostname bindings for hostname-addressed formats: a list of `{hostname, repository}` naming the repository by name; file-only; each hostname binds exactly one repository, and a list naming one hostname twice is refused at load |
| `server.tls.cert_file` | none | PEM certificate chain for native TLS on the main listener; with `key_file`, both or neither |
| `server.tls.key_file` | none | PEM private key for native TLS |
| `server.tls.min_version` | `1.2` | Minimum TLS version; `1.3` allowed |
| `server.http2` | `false` | Whether the main listener negotiates HTTP/2 (`h2` via ALPN); off by default so refusals reach reason-phrase-only clients |
| `server.read_header_timeout` | `10s` | `http.Server.ReadHeaderTimeout` |
| `server.idle_timeout` | `120s` | `http.Server.IdleTimeout` |
| `server.shutdown_timeout` | `60s` | How long `SIGTERM` waits for in-flight requests, upload sessions' current chunk included, before closing connections |
| `server.spool_dir` | `/var/lib/stackweaver-registry/spool` | Temporary space for `management.publish_spool_limit` bodies and multipart staging; readiness fails below `server.spool_min_free` |
| `server.spool_min_free` | `4GiB` | Free space under `server.spool_dir` below which readiness fails (Nexus's read-only threshold, applied to readiness instead) |
| `database.url` | required, secret | PostgreSQL connection URL (`postgres://user:pass@host:5432/db?sslmode=verify-full`); accepts `database.url_file` |
| `database.schema` | `public` | Schema the registry owns; the harness's per-instance isolation key |
| `database.max_conns` | `20` | Pool ceiling per process; the deployment's total across replicas must fit the server's `max_connections` |
| `database.min_conns` | `2` | Pool floor |
| `database.conn_max_lifetime` | `1h` | Connection recycling |
| `database.migrate_on_start` | `true` | `serve` applies pending migrations under the migration lock before opening listeners; set `false` where a pre-upgrade job runs `migrate up` |
| `storage.s3.endpoint` | none (AWS) | Endpoint URL for S3-compatible stores (MinIO, Ceph RGW, R2, GCS interop) |
| `storage.s3.region` | `us-east-1` | Signing region |
| `storage.s3.bucket` | required | Bucket name |
| `storage.s3.prefix` | `""` | Key prefix under the bucket; the harness's per-instance isolation key |
| `storage.s3.access_key` | none | Static access key; empty means the SDK's ambient credential chain (instance role, IRSA, environment) |
| `storage.s3.secret_key` | none, secret | Static secret key; accepts `storage.s3.secret_key_file` |
| `storage.s3.force_path_style` | `false` | Path-style addressing for stores without virtual-host buckets |
| `storage.s3.part_size` | `16MiB` | Multipart upload part size; minimum `5MiB` |
| `storage.s3.ca_bundle_file` | none | Extra CA bundle trusted for the store endpoint |
| `security.master_key` | required, secret | The instance master key: 32 bytes, base64; accepts `security.master_key_file`; encrypts every data key that encrypts secrets at rest |
| `proxy.offline` | `false` | `proxy-cache.md`'s one instance-wide offline switch, whose row lives here by that spec's statement ("Offline mode"); the schema has no per-repository or per-upstream variant (its AC5) |

**Owned by sibling specs.** Each row is the owner's own three-column table, verified against its
text at `3135d95` by counting each owner's rows; defaults are theirs, the meaning is stated there and not restated here, and
the count is what `scripts/check-config-keys.js` must find in that spec.

| Prefix | Keys | Owner and count |
|---|---|---|
| `auth.` | `oidc.issuer` none, `oidc.client_id` none, `oidc.client_secret` none (secret, accepts `oidc.client_secret_file`), `oidc.redirect_url` `{public URL}/ui/auth/callback`, `oidc.admin_identities` none (list of `{issuer, subject}`, required with `oidc.issuer`), `local_admin.keep` `false`, `session.lifetime` `24h`, `allow_plaintext` `false` (flag `--allow-plaintext-auth`), `token_service.lifetime` `5m` (refused above `15m`) | `auth.md`, 9 ("Configuration") |
| `credentials.` | `default_token_lifetime` `2160h`, `max_token_lifetime` `8784h`, `allow_non_expiring` `true`, `expiry_warning_window` `336h`, `rotation_max_grace` `24h`, `exchange_token_lifetime` `15m`, `revoked_retention` `2160h`, `last_used_resolution` `10m` | `credential-management.md`, 8 |
| `gc.` | `grace` `6h`, `sweep_interval` `1h`, `prune_interval` `1h`, `orphan_scan_interval` `24h`, `snapshot_retention` `720h`, `intent_gate_wait` `30s` | `storage-and-gc.md`, 6 (its AC29) |
| `signing.` | `default_backend` `file`, `kms.allowed_schemes` `awskms, gcpkms, azurekms, hashivault`, `pkcs11.module` none, `pkcs11.token_label` none, `pkcs11.pin_file` none (secret), `rotation_window` `720h`, `resign_at_fraction` `0.5`, `external_expiry_lead` `336h`, `max_blob_sign_size` `1 GiB` | `signing-service.md`, 9; there is no `signing.master_key`, its table cites `security.master_key` (the resolved master-key decision below, applied there) |
| `index.` | `lock_wait` `30s`, `max_retries` `8`, `virtual_merge_window` `5s`, `virtual_staleness_bound` `60s`, `render_memo_bytes` `256 MiB` (its was-Q13 memo bound) | `signing-service.md`, 5 (14 keys in its one table with the nine `signing.`) |
| `async.` | `workers` `8`, `kind_limits` `{verify.reevaluate: 4}`, `poll_interval` `5s`, `lease` `60s`, `max_attempts` `8`, `backoff_base` `2s`, `backoff_cap` `15m`, `drain_timeout` `30s`, `job_retention` `168h`, `scheduler` `true`, `scheduler_interval` `10s` | `async-operations.md`, 11 (its AC22) |
| `telemetry.` | `listen` `:9464`, `metrics.enabled` `true`, `metrics.on_main_listener` `false`, `metrics.repository_label_limit` `1000`, `metrics.name_label_limit` `200`, `metrics.state_interval` `30s`, `log.level` `info`, `log.format` `json`, `log.request` `true`, `log.trusted_proxies` none, `audit.sink` `stdout`, `audit.file` none, `trace.exporter` `none`, `trace.endpoint` none, `trace.sample_ratio` `0.05`, `health.timeout` `2s`, `pprof` `true` | `observability.md`, 17 (its AC27) |
| `management.` | `operation_retention` `2160h`, `publish_spool_limit` `1GiB`, `upload_chunk_limit` `256MiB`, `deferred_threshold` `10s` | `management-api.md`, 4 |
| `verify.` | `sigstore.tuf_url` `https://tuf-repo-cdn.sigstore.dev`, `sigstore.refresh` `24h`, `revocation.refresh` `12h`, `keyserver` `hkps://keyserver.ubuntu.com` | `artifact-verification.md`, 4; the former `verify.workers` is `async.kind_limits` (the resolved worker-limit decision below, applied there) |
| `policy.` | `feed.url` `https://osv-vulnerabilities.storage.googleapis.com`, `feed.sources` `[]` (list of `{name, url, ecosystems}`, file-only), `feed.sync_interval` `1h`, `feed.staleness_threshold` `24h`, `scan.unscanned_alert_after` `1h` | `supply-chain-policy.md`, 5 (its AC23) |
| `replication.` | `sync_interval` `60s`, `blob_concurrency` `8` | `replication.md`, 2 (its AC24); it states there is no checkpoint-interval key |
| `upstream.` | `default_concurrency` `10`, `default_cooldown_cap` `1h`, `connect_timeout` `10s` | `upstream-adapters.md`, 3 (its AC32: the only `upstream.` keys the schema knows) |
| `ui.` | `instance_name` `Stackweaver Registry`, `help_url` `https://github.com/vhco-pro/stackweaver-registry/tree/main/docs` (changed in both specs if a docs site is fixed later) | `web-ui.md`, 2 (its AC26; neither can disable the UI) |

That is 85 sibling keys under 13 prefixes beside the 29 this spec owns. **No prefix is
reserved.** Every sibling that owns configuration tables it, so the schema's rule is simpler
than a reservation: a key under a sibling's prefix that the sibling's table does not carry is
unregistered and fails startup with a message naming the owning spec, which is what stops a
handler or a hurried fix squatting a sibling's namespace (AC3). The prefix-to-owner map is the
schema registry's `owner` field, one entry per row above.

**Not keys, on purpose.** The upstream `User-Agent` is computed
(`stackweaver-registry/<version> (+<server.public_url>)`, `upstream-adapters.md` AC5) and not
configurable, because a configurable agent string is how a registry ends up impersonating a
client. `HTTPS_PROXY`, `HTTP_PROXY` and `NO_PROXY` are process environment read once by
`http.ProxyFromEnvironment` in the single upstream transport (`upstream-adapters.md`), not
schema keys, so they cannot diverge per upstream. `OTEL_EXPORTER_OTLP_*` refine the trace
exporter (`observability.md`). These three families are the only environment variables any
package outside `internal/config` may read, and an enforcer holds that list.

### The instance master key

Three specs encrypt at rest "under the instance master key": upstream credentials
(`proxy-cache.md` AC6; the `UpstreamCredential` record in `upstream-adapters.md`), `file`
signing keys (`signing-service.md`, the `file` backend) and OIDC exchange material where
`credential-management.md` needs it. The resolved master-key decision below makes it **one key,
owned here**: `security.master_key`, 32 random bytes, base64 in the environment or the file,
or a path in `security.master_key_file`. It is required: a process with no master key does not
start, because the alternative (generate one and write it somewhere) fails on read-only
container filesystems and forks the key across replicas, which is exactly the failure Harbor's
`not-a-secure-key` default and Pulp's default key path invite.

**Envelope encryption.** The master key never encrypts a record directly. Each encrypted
record carries its own random data key, wrapped by the master key with an AEAD (XChaCha20-
Poly1305 or AES-256-GCM, one algorithm fixed in `internal/security`) and a **master key id**
(the first 8 bytes of the master key's SHA-256). Rotation is therefore a re-wrap, not a
re-encrypt: `keys rotate-master --new-key-file` takes a session-level advisory lock, walks every
wrapped data key in batches, re-wraps under the new key, and writes the new id; a process
started with the new key reads records wrapped under either id while the rotation runs, because
the old key is passed as `--old-key-file` to the rotation command and to no running process,
and the rotation is idempotent and resumable (a record already carrying the new id is skipped).
An operator who has lost the master key has lost every stored secret and nothing else: blobs,
metadata, tokens (stored hashed, `auth.md`) and audit remain. That property is stated in the
operator documentation because it is the honest answer to "what if".

**Boundary.** Only `internal/security` sees master-key bytes; it exposes `Seal`/`Open` over data
keys. The master key is never a flag, never logged, never in `config show`, never in an error
message; the enforcer table names the tests.

### Runtime dependencies

**PostgreSQL.** Supported: the versions PostgreSQL itself supports at release time (Nexus's
rule), currently 14 and later, tested in CI against the oldest and newest. Required from the
server: the connection role must **own** `database.schema` (migrations create and alter
tables; the Nexus requirement, adopted); `LISTEN`/`NOTIFY` reachable through the same pool
(`async-operations.md`'s wake-up); no connection pooler in transaction-pooling mode between the
registry and the server, because session-level advisory locks, `LISTEN` and `SET` are
per-session and a transaction pooler breaks all three (this is why Nexus forbids pgpool; the
same reasoning applies to PgBouncer in transaction mode); statement-pooling is likewise out.
Session-mode pooling is fine and is the recommended way to fit many replicas under
`max_connections`. Extensions: none required; `pgcrypto` is not used because randomness and
hashing happen in the process. Sizing rule: `replicas × (database.max_conns + 2)` must be below
the server's `max_connections`; the two are the dedicated connections the leader lock and the
`LISTEN` session hold. The startup log prints this budget.

**Object storage.** Any S3-compatible store implementing `PutObject`, `GetObject` with `Range`,
`HeadObject`, `DeleteObject`, `ListObjectsV2` and multipart upload (`CreateMultipartUpload`,
`UploadPart`, `CompleteMultipartUpload`, `AbortMultipartUpload`) with AWS Signature v4. The
registry assumes read-after-write consistency for single objects (every current major store
provides it) and **assumes nothing about LIST consistency**, which is why `storage-and-gc.md`'s
orphan scan applies the grace period to object age. Two bucket settings are deployment
requirements, not suggestions: **object versioning or an equivalent soft-delete window at least
as long as the database backup retention** (the restore contract below depends on it), and a
**lifecycle rule aborting incomplete multipart uploads** after a period longer than the upload
session's absolute cap (24 hours, `data-model.md`'s upload session definition), because an
aborted client leaves parts that no LIST of objects shows. Readiness performs a `HeadBucket`
and, once per `telemetry.metrics.state_interval` on the leader, a probe write and delete under
`<prefix>/.probe/` so a store that accepts reads and refuses writes is reported before a push
finds out. Private stores present a CA through `storage.s3.ca_bundle_file`; the chart's
`caBundleSecretName` mounts it.

### Listeners, TLS and HTTP/1.1

**Two listeners**, per `observability.md`: the main listener (`server.listen`) for clients, the
management API and status-only probes, and the telemetry listener (`telemetry.listen`, `:9464`)
for `/metrics`, detailed `/readyz` and pprof, which the deployment never exposes publicly. The
chart exposes only the main listener through its Service and Ingress; the telemetry port is a
second container port with no Service by default and a `ServiceMonitor` value that targets it.

**TLS.** Two shapes, and the server knows which it is in from configuration alone:

1. **Native TLS.** `server.tls.cert_file` and `key_file` set. The server terminates TLS,
   reloads the pair on `SIGHUP` and on file change (a mounted Secret rotating under it),
   and `auth.allow_plaintext` stays `false`.
2. **Behind a terminating proxy or ingress.** No certificate files, `auth.allow_plaintext:
   true` set deliberately. This is `auth.md`'s flag: it asserts "the hop in front of me
   terminates TLS and the network between us is trusted", and the operator documentation says
   exactly that sentence next to the key. The server never infers TLS from `X-Forwarded-Proto`
   (`auth.md`, the TLS paragraph); `telemetry.log.trusted_proxies` governs only the logged
   client address.

Plain HTTP with `auth.allow_plaintext: false` is a valid configuration for a registry serving
anonymous reads only; the first credential-bearing request is refused before lookup, as
`auth.md` specifies, so the misconfiguration is loud.

**HTTP/1.1 by default on the main listener.** `cpan.md` and the format authoring wave established
that many clients print only the reason phrase of a refusal (Maven, Gradle, R, renv, Chef, the
CPAN clients among those confirmed), and HTTP/2 has no reason phrase (RFC 9113 removes it). A
per-route or per-format HTTP version is impossible: the version is negotiated by ALPN before
any byte of the request names a route. The resolved HTTP-version decision below therefore turns
`h2` **off on the main listener by default** (`server.http2: false`): Go's `http.Server` then
advertises only `http/1.1`, every client speaks HTTP/1.1, and a refusal's status line carries
its phrase. Operators whose formats' clients read bodies may set `server.http2: true`; the
generated reference lists the formats whose refusal rendering depends on the phrase, drawn from
`supply-chain-policy.md`'s per-format refusal rendering. Behind a proxy the registry cannot
choose the client-facing protocol, so the documentation states the requirement for the proxy
(client-facing HTTP/1.1, or accept bare status codes), and the Helm chart's ingress annotations
for the ingress controllers it documents set it. The write half is `supply-chain-policy.md`'s
(its resolved refusal-status-line decision, was Q10; AC18): Go's `net/http` writes the canonical
`http.StatusText` for every status and offers no API for a custom reason phrase, so the shared
refusal writer in `internal/format` hijacks the HTTP/1.1 connection to write
`HTTP/1.1 {code} Refused by policy: {condition}` and is the module's only hand-written status
line; over HTTP/2 the same refusal carries the canonical phrase and the condition in the body.
This spec guarantees only that HTTP/1.1 reaches the client, which is what makes that write
observable.

### Host binding

Terraform/OpenTofu and Puppet address a registry by bare hostname and post to root-anchored
paths (`format-handler-interface.md`'s "Host-bound claims"; `terraform.md`, `puppet.md`).
`server.hosts` binds each such hostname to exactly one repository; the registration layer passes
the binding to the handler at construction through `Deps`, reloadable on `SIGHUP`, and
`format-handler-interface.md` ("The scheduled re-open") names whether `Deps` is the binding's
right home or the construction contract should carry it explicitly as a re-open input, decided
from the Terraform and Puppet claims. Bindings are configuration, not repository settings (the resolved
host-binding decision below), because a hostname is a deployment fact (DNS, a certificate SAN,
an ingress rule) before it is a registry fact, and reloadable on `SIGHUP` so adding one is not
a restart. A binding whose repository does not exist is a startup warning and a `404` on that
host, not a startup error, because the repository is created through the management API after
the process is up. A list naming one hostname twice is a startup error, because "each hostname
binds exactly one repository" would otherwise be decided by list order: `config validate` and
`serve` fail naming the hostname and both entries, and a `SIGHUP` reload of such a file is
refused with an error log line naming them, the previously loaded binding staying in force
(`puppet.md` AC8 asserts the refusal at load). The binding names
the repository by name, so a rename leaves a binding naming the old name pointing at a missing
repository, the same warning and `404`, until the operator edits and reloads it; the rename
itself names each such hostname in its audit record and `lifecycle` `Operation`
(`repository-lifecycle.md`, "Renaming", its resolved hostname-binding decision, was Q10, AC28). Native TLS with several hostnames needs a certificate covering each SAN; the
documentation says so. The harness's `repositories` setup key expresses the same binding
(`conformance-harness.md` AC23: the `repositories` entry's `hostname` sub-entry), and the seed
path writes it through this key's loader rather than a second mechanism.

### Refusal enforceability is a deployment precondition

`julia.md` captured Pkg installing from GitHub with exit 0 after a `403` from the registry;
`cpan.md` found every CPAN client has a route back to public CPAN. `supply-chain-policy.md`'s
table "When a refusal binds, per format" states, per ecosystem of `catalogue.md`, when a refusal
binds (its AC20). What this spec adds is the
operational half: for the formats that table lists as "binds only with restricted egress", a
policy-enforcing deployment must restrict the **client's** network egress to the registry, which
is a control on the build fleet, not on the registry. The operator documentation carries a
section "When a refusal actually blocks an install" generated by the docs build from that table
(`supply-chain-policy.md` AC20: "generated from it and never hand-copied"), and the conformance
harness's `podman --internal` case network, in which every client container reaches only the
hostnames its case declares (`conformance-harness.md`'s resolved client-confinement decision,
was Q6; its AC23), is cited as the reference shape. The registry's own egress is separately restrictable: `proxy.offline: true`
plus a NetworkPolicy the chart ships as an opt-in value (`networkPolicy.egress.registryOnly`)
that allows the database, the object store and the telemetry collector and nothing else.

### Process lifecycle, signals and probes

- **Start.** Load and validate configuration, print one structured line of the effective
  non-secret configuration and one of the connection budget, open the pool, take the migration
  lock and apply pending migrations (when `database.migrate_on_start`), release, open the
  telemetry listener, start workers and the scheduler candidate, then open the main listener
  last, so readiness cannot succeed before the process can serve.
- **`/healthz`** (liveness): the process is running and its event loop responds. Nothing else,
  so a database outage does not make Kubernetes restart every replica into a thundering herd.
- **`/readyz`** (readiness): database reachable, migrations at the binary's version, object
  store `HeadBucket` succeeded within `telemetry.health.timeout`, spool free space above
  `server.spool_min_free`. Status only on the main listener, detailed on the telemetry
  listener (`observability.md`).
- **`SIGTERM`.** Readiness flips to failing immediately, the main listener stops accepting,
  in-flight requests run to completion or `server.shutdown_timeout`, workers drain for
  `async.drain_timeout` (a job past the drain is lease-expired and reclaimed by another process,
  `async-operations.md`), the leader lock's connection closes so a new leader is elected within a
  tick, and the process exits 0. The chart sets `terminationGracePeriodSeconds` to
  `server.shutdown_timeout + async.drain_timeout + 10s` from the same values, so the two cannot
  drift.
- **`SIGHUP`.** Reopen the audit file, reload TLS material, reload `server.hosts`.
- **`SIGINT`** behaves as `SIGTERM` for local runs.

### Migrations

Schema migrations are numbered SQL files under `internal/db/migrations`, forward-only, each
applied in one transaction, recorded in `schema_migrations(version, applied_at, binary_version)`.
The runner takes a **transaction-level advisory lock** on a fixed key before checking and
applying, so N replicas starting together apply once and the rest observe. `serve` runs the
runner by default (Gitea's and Harbor's behaviour: "The schema upgrade and data migration of
the database is performed by core when Harbor starts"); `migrate up` runs it alone for
operators who want migration as a distinct, auditable step, and the Helm chart's pre-upgrade
hook Job runs exactly that with `database.migrate_on_start: false` on the Deployment.

**The compatibility rule that makes rollback possible.** Every migration shipped in release
`N` must leave a schema the binary of release `N-1` (the previous minor) runs correctly
against. Concretely: additive changes land first (new column nullable or defaulted, new table,
new index built `CONCURRENTLY` outside the transaction where the table is large); a rename is an
add, a dual-write in `N`, and a drop in `N+1`; a `NOT NULL` tightening waits one release for the
backfill. This is the expand/contract discipline every rolling upgrade needs anyway, and it
turns "rollback" from "restore the database" into "deploy the previous binary". Only a minor
release may carry a migration; a patch release never does. `data-model.md`'s rule stands
alongside: a format handler adds no migration (its AC8), so the migration directory changes only
when the shared model changes.

**Enforcer.** CI runs the **previous minor's released binary** against a database migrated by
the current tree: `serve` starts, `/readyz` passes, and the smoke slice of the conformance suite
passes against it. A migration that breaks the previous binary fails CI here, not in someone's
rollback. The job is cheap (the previous binary is a download) and runs on `main` pushes with
the conformance job.

### Upgrade and rollback policy

- **Versioning.** Semantic versions on the binary and the image; the chart's `appVersion` tracks
  the binary and the chart has its own version (`go-release` skill conventions).
- **Upgrade path.** Any patch to any later patch within a minor; minor to the next minor. Two
  minors at once is supported only through the intermediate minor's `migrate up`, because the
  compatibility rule is stated per adjacent pair; the migration runner refuses to apply
  migrations spanning more than one minor in one run and names the intermediate release to run
  first (Harbor documents a minimum source version for the same reason).
- **Rolling upgrade.** Old and new binaries coexist during the rollout by the compatibility
  rule; the scheduler leader may be either; jobs enqueued by one are claimable by the other
  because `async-operations.md`'s kinds are versioned by name and payload, and a kind the old
  binary does not know is left `pending` for the newer process, never claimed and never failed
  (its resolved unknown-kind decision, was Q10; AC26: the non-registering process logs the kind
  at warning and serves everything else).
- **Rollback.** Redeploy the previous minor's binary or chart revision; no database action. A
  rollback across two minors is not supported and the documentation says why.
- **Data-format changes in object storage** are forbidden: blobs are content-addressed bytes
  and the layout under the prefix is fixed by `storage-and-gc.md`; there is nothing to migrate
  and nothing to roll back.

### Multi-replica constraints

The HA precondition is Nexus's and Harbor's: one shared PostgreSQL, one shared bucket. Given
that, every registry process is a peer and the operator scales `replicas`. What must not run
twice, and what holds it:

| Singleton | Held by | Owner |
|---|---|---|
| Scheduler tick | Session-level advisory lock on a dedicated connection; a new leader within one `async.scheduler_interval` of the old one's connection closing | `async-operations.md` AC14 |
| GC sweep, orphan scan, pruning | The `storage.sweep`, `storage.orphan_scan` and `storage.prune` job kinds enqueued by schedules at the `gc.*_interval` keys; the sweep additionally holds `LockSweep` as a second guard, so two concurrent sweeps leave exactly one acting | `storage-and-gc.md` AC26, `async-operations.md` |
| Object deletion | Only the sweep's delete pass and the orphan scan delete objects, held by an architecture test | `storage-and-gc.md` AC15 |
| State-derived gauges | Collected on the leader only | `observability.md` |
| Schema migration | Transaction-level advisory lock in the runner | this spec |
| Master-key rotation | Session-level advisory lock in `keys rotate-master` | this spec |
| The local admin credential's first-start emission | Insert-if-absent on the admin row inside the migration transaction of the first start, so N replicas racing at first start emit it once | this spec, satisfying `auth.md` AC15 across replicas |

Nothing is process-local that a second replica must see: sessions are rows (`auth.md` AC22's
server-side logout needs them), the queue is rows, caches of upstream metadata are the CAS and
its rows. A process-local cache is permitted only where a miss is a correct outcome (the JWKS
of the OIDC issuer, parsed trust roots), and the enforcer table has a test for it.

The advisory-lock key space is one Go constant block in `internal/db/lock` (`LockScheduler`,
`LockSweep`, `LockMigration`, `LockMasterKeyRotation`), and only that package calls
`pg_advisory_lock`, `pg_try_advisory_lock` or their transaction-level forms; `async` and
`storage` take their locks through it, so two subsystems cannot pick colliding integers:
`async-operations.md` AC14 takes `LockScheduler` and `storage-and-gc.md` AC26 takes `LockSweep`
through this package, and each spec's architecture test scans its own package for direct
`pg_advisory` calls beside the module-wide scan here (AC19).

### Backup and restore

**What to back up.** PostgreSQL (logical dump or physical base backup plus WAL, the operator's
tooling), and the bucket, which is content-addressed and append-mostly. Configuration and the
master key are backed up as the secrets they are; the master key's loss is unrecoverable for
stored secrets (above).

**The consistency contract.** `storage-and-gc.md` fixes the order of writes: the upload intent
row exists before any object byte, the reference row before the intent is cancelled, and on
deletion the metadata row goes before the object. A database restored to time `T` against a
bucket at a later time `T'` therefore has two classes of discrepancy and both are handled:
objects with no row (uploads and cache fills after `T`) are ordinary orphans the orphan scan
collects after grace; rows whose object the sweep deleted between `T` and `T'` are dangling, and
they are recoverable **only because bucket versioning (or soft delete) is a deployment
requirement**: `storage check --restore-dangling` (the storage consistency checker
`storage-and-gc.md` AC27 specifies, exposed as a subcommand in the CLI table above) lists
dangling rows and restores each object from its latest non-current version. The documented restore procedure is: stop all
replicas, restore PostgreSQL, run `storage check --restore-dangling`, start one replica, read
its `/readyz`, scale up. The checker's report is also the post-restore acceptance test, and it
is what makes the procedure verifiable rather than hopeful.

**Restore of a follower** (`replication.md`) needs no bucket procedure: a follower re-seeds
from its leader by design.

### Packaging

**Container image.** One image, `ghcr.io/vhco-pro/stackweaver-registry`, multi-arch
(`linux/amd64`, `linux/arm64`), built from a distroless static base with a non-root user
(`65532`), the binary as entrypoint and `serve` as the default command, `/var/lib/stackweaver-registry`
as a declared volume for the spool, CA certificates present for upstream TLS, no shell. The
image is signed with cosign keyless and carries an SBOM attestation, because a registry that
verifies other people's attestations (`artifact-verification.md`) and ships none is not credible.
Built and pushed by GoReleaser on tags (`go-release` skill) from `deploy/goreleaser.yaml`.

**Helm chart** at `deploy/helm/stackweaver-registry`, published as an OCI artifact to the same
GHCR namespace. Its values are shaped by the roles table and the resolved chart decision:

| Value | Default | Does |
|---|---|---|
| `replicaCount` | `1` | Replicas of the all-roles Deployment |
| `workers.enabled` | `false` | Adds a second Deployment of the same image with `async.workers` set and the main listener bound for probes only; when on, the first Deployment gets `async.workers: 0` (the web-replica recipe) |
| `workers.replicaCount`, `workers.count` | `2`, `8` | Worker Deployment size and `async.workers` per pod |
| `config` | `{}` | Rendered into a ConfigMap as the YAML file; every non-secret key |
| `existingSecret` | none | Secret holding `database-url`, `master-key`, `s3-secret-key`, `oidc-client-secret`, `pkcs11-pin`; mounted as files and referenced through `_file` keys |
| `postgresql.url` / `postgresql.existingSecret` | required | External PostgreSQL |
| `storage.s3.*` | required | External object storage |
| `service.port`, `ingress.*`, `ingress.http1Only` | `8080`, disabled, `true` | Main listener exposure; `http1Only` sets the documented annotations for nginx-ingress, Traefik and HAProxy ingress so refusals keep their phrase |
| `tls.native.existingSecret` | none | Native TLS from a `kubernetes.io/tls` Secret; sets `auth.allow_plaintext: false` |
| `tls.terminatedUpstream` | `false` | Sets `auth.allow_plaintext: true` and requires the operator to set it explicitly; the values schema forbids both this and `tls.native` |
| `telemetry.serviceMonitor.enabled` | `false` | ServiceMonitor for `:9464`; the port is never on the main Service |
| `caBundleSecretName` | none | CA bundle for private upstreams and stores (Harbor's value, same name) |
| `migrations.hook` | `true` | Pre-upgrade Job running `migrate up`; the Deployment then runs with `database.migrate_on_start: false` |
| `networkPolicy.egress.registryOnly` | `false` | Egress restricted to database, store and collector (air gap) |
| `podDisruptionBudget.minAvailable` | `1` | Rolling upgrades keep one replica serving |
| `resources` | see Sizing | Requests and limits from the measured profile |
| `alerts.enabled`, `alerts.signingLeadHours` | `false`, `336` | Installs `deploy/observability/alerts.yaml` as a PrometheusRule with the signing lead templated from `signing.external_expiry_lead` (`observability.md`) |
| `dashboard.enabled` | `false` | ConfigMap with the Grafana dashboard generated from the metric catalogue |

The chart's `values.schema.json` is generated from the configuration schema for the `config`
subtree, so `helm lint` and `helm install` refuse an unknown key before the pod does.

**Compose file** at `deploy/compose/docker-compose.yaml`: the registry, PostgreSQL 16 and MinIO,
with a `secrets/` directory of generated files, `server.public_url: http://localhost:8080`,
`auth.allow_plaintext: true` with a loud comment that this is the evaluation shape, and a
one-line header stating it is not a production deployment. `make run` continues to run the bare
binary against whatever `STACKWEAVER_REGISTRY_*` the developer exports.

**The web UI build.** The frontend (`web-ui.md`: TypeScript, React, Vite, Node 22, a committed
lockfile) is embedded in the binary from `internal/ui/dist`. `make web` runs `npm ci` and
`vite build` into that directory; `make build` depends on `make web`; `deploy/goreleaser.yaml`
runs it in a `before` hook; and the Dockerfile gains a Node 22 build stage whose output is copied
into the Go build stage. A checkout without a Node toolchain still builds and tests the Go module
against the committed placeholder `index.html` (`web-ui.md`'s resolved placeholder decision, was
Q8), so the guarantee this spec adds is that **no release artefact carries the placeholder**: the
binary `make build` produces, the container image and the GoReleaser archives all serve the built
UI, which `web-ui.md` AC1 asserts from the UI's side and AC32 here from the packaging side. Node
22 is the version CI already installs for the docs job (`.github/workflows/ci.yml`,
`actions/setup-node@v6`), so the release workflow reuses that step rather than adding a toolchain.
`ui` is a reserved first path segment (`format-handler-interface.md`'s reserved table, `web-ui.md`
AC2), which the chart's ingress path rules honour by routing `/ui/` and `/api/` with every other
path to the same Service.

**Observability artefacts.** `deploy/observability/alerts.yaml` is `observability.md`'s (its
AC17); this spec packages it into the chart and the Compose file's Prometheus. The Grafana
dashboard `deploy/observability/dashboard.json` is generated by `scripts/gen-dashboard.js` from
the metric catalogue `observability.md` exposes, one panel per catalogue entry family, checked
in and CI-verified against regeneration like the docs index; a hand edit fails the check, which
is the only oracle a dashboard has and `observability.md`'s reason for placing it here.

**Log collection.** Standard output in JSON (`telemetry.log.format`), which Kubernetes, Compose
and systemd's journal all collect without configuration; the audit `file` sink is for the
systemd shape, with a `logrotate` snippet in `deploy/systemd/` that sends `SIGHUP`. A
`deploy/systemd/stackweaver-registry.service` unit ships with `LoadCredential=` for the secret
files, `DynamicUser=yes`, and the hardening options that fit a process that needs only network
and its spool.

### First run and first mint

On the first start against an empty schema, the migration transaction creates the local admin
row and the process emits the generated credential to the log exactly once (`auth.md` AC15;
the insert-if-absent above makes it once across replicas). The documented first-mint procedure,
per `credential-management.md`'s resolved decision, is a `curl` against the management API with
that credential as Basic, requesting the first token, followed by the OIDC configuration that
names an admin identity and disables the local account (`auth.md` AC2). The documentation
reproduces the two commands verbatim from an integration test that runs them, so the procedure
in the docs is the one the build ran.

### Recipes

Each recipe is a documented, tested configuration fragment under `docs/deployment/recipes/`,
each with an integration test that applies it.

- **Web-only replicas and a worker pool.** `workers.enabled: true` in the chart; or by hand,
  `async.workers: 0` on the web processes and `async.scheduler: false` on all but the worker
  pool so leadership stays where the work is (`async-operations.md`'s resolved worker-placement
  decision, was Q8).
- **SoftHSM2 for the `pkcs11` signing backend.** `signing.pkcs11.module:
  /usr/lib/softhsm/libsofthsm2.so`, `token_label`, `pin_file` from a mounted Secret; the
  chart's `extraVolumes` for the token directory; the recipe is the same one
  `signing-service.md` AC13 runs in CI.
- **Replicated-repository keys.** A linked follower serves the leader's `Signature` and
  `PointerDocument` records verbatim, creates no `Signature` and calls no signing backend while
  the link is active (`replication.md` AC21; `signing-service.md` AC23), so it needs no signing
  key for that repository; takeover is refused unless every active key resolves on the follower.
  The recipe shows the working pair: a leader with `signing.default_backend: kms` and a follower
  with the same `kms` scheme allowed (a shared fixture key) or a `file` key created and announced
  on the follower beforehand, and no other `signing.*` set beyond defaults.
- **Air gap.** `proxy.offline: true`, `networkPolicy.egress.registryOnly: true`,
  `verify.sigstore.refresh` and the feed sync suspended by the offline switch
  (`artifact-verification.md`, `supply-chain-policy.md`), the CA bundle for the internal store,
  and the image pulled from the operator's own OCI registry.
- **Behind an ingress that terminates TLS.** `tls.terminatedUpstream: true`,
  `ingress.http1Only: true`, `telemetry.log.trusted_proxies` set to the ingress's CIDR.
- **PgBouncer in session mode** with the connection budget computed for it.

### Resource sizing

No table of tiers is promised here, because the constitution places performance behind
benchmarks that gate CI (`observability.md`'s shared benchmark-gate mechanism) and a guessed
table would be the "correct-and-slow" trap in reverse. Instead: the chart's default `resources`
(requests `500m` CPU and `512Mi`, limits `2` CPU and `2Gi`) are the values under which the
benchmark gate's load profile passes its thresholds on the CI runner, and a CI job runs that
profile against a pod with exactly those limits, so the defaults are measured claims. The
operator documentation states the memory model rather than numbers: memory is dominated by
`async.workers × in-flight body buffers` and `database.max_conns`, blob traffic streams and does
not scale memory with blob size, and `server.spool_dir` needs `management.publish_spool_limit ×
concurrent publishes`. `GOMEMLIMIT` is set by the chart from the container limit at 90 %, so the
Go runtime knows the ceiling.

### Mechanical enforcers

Per the constitution, every boundary this spec introduces names the test that holds it:

| Boundary | Enforcer |
|---|---|
| Only `cmd/**` and `internal/config` import `github.com/spf13/cobra` or `github.com/spf13/viper` | `internal/config/arch_test.go` (module-wide import graph) |
| No package outside `internal/config` calls `os.Getenv`, `os.LookupEnv` or `os.Environ`, except the three carve-outs (`http.ProxyFromEnvironment` in `internal/upstream`, the OTel SDK's `OTEL_*` reads, `GOMEMLIMIT` by the runtime) | `internal/config/env_boundary_test.go` (AST walk; carve-outs listed in the test) |
| No `flag`/`pflag` definition outside `cmd/**` | `internal/config/arch_test.go` |
| Every field of every typed `Config` struct handed to a package maps to exactly one schema key, and every schema key to a field | `internal/config/schema_struct_test.go` (reflection over the registered structs) |
| A key marked `secret` has no flag; derived environment names are unique | `internal/config/schema_test.go` |
| Secret values never appear in `config show`, the startup log, or any error message from the loader | `internal/config/redaction_test.go` (canary values planted in every secret key, output scanned) |
| Every key in every spec table exists in the schema with the same default, and every schema key is tabled by exactly one spec | `scripts/check-config-keys.js`, run by `make verify` and CI's docs job |
| `docs/deployment/configuration.md`, `values.schema.json` and `dashboard.json` equal their generated forms | CI docs job (`--check` mode of each generator) |
| Only `internal/security` reads master-key bytes | `internal/security/arch_test.go` (no other package references the key field or the `_file` path) |
| Only `internal/db/lock` issues advisory-lock SQL | `internal/db/lock/arch_test.go` (string scan of every `.go` and `.sql` file for `pg_advisory` and `pg_try_advisory`) |
| Only `internal/db/migrations` contains DDL, and no handler references it | `internal/db/migrations_test.go`, alongside `data-model.md`'s handler-DDL test |
| Every migration applies in one transaction and the previous minor's binary runs against the result | `.github/workflows/ci.yml` job `compat-previous-minor` |
| No process-local cache of shared state outside the allowlist | `internal/server/cache_boundary_test.go` (allowlisted types; any other `sync.Map`/map-with-mutex holding rows fails) |
| `terminationGracePeriodSeconds` equals `server.shutdown_timeout + async.drain_timeout + 10s` | `deploy/helm/tests/lifecycle_test.yaml` (helm-unittest) |
| The chart never exposes `telemetry.listen` on the main Service or Ingress | `deploy/helm/tests/listeners_test.yaml` |
| `values.schema.json` refuses `tls.native` together with `tls.terminatedUpstream`, and refuses a per-repository offline key | `deploy/helm/tests/schema_test.yaml` |

## Acceptance Criteria

- [ ] AC1: `stackweaver-registry serve` starts from environment variables alone (no file, no
      flags) with `server.public_url`, `database.url`, `storage.s3.bucket` and
      `security.master_key` set, binds `server.listen`, answers `/readyz` `200` on both
      listeners, logs one line of the connection budget (`database.max_conns` plus the two
      dedicated connections, per replica), and with any one of the four unset exits non-zero
      before opening any listener with a message naming every missing required key at once; a
      `--config` path that does not exist is an error and an absent default path is not.
- [ ] AC2: Precedence is flag over environment over file over default for every flagged key,
      demonstrated for each of the eight flags (`--config`, `--listen`, `--public-url`,
      `--allow-plaintext-auth`, `--log-level`, `--log-format`, `--workers`, `--no-scheduler`)
      by setting all four sources to distinct values.
- [ ] AC3: A misspelt key in the file, an environment variable with the prefix matching no key,
      and a key under a sibling-owned prefix (`gc.`, `policy.`, `replication.`, `ui.` among the
      thirteen) that the owner's table does not carry each fail `config validate` and `serve`
      naming the offending key and, for the sibling prefix, the owning spec.
- [ ] AC4: Every secret-classified key (`database.url`, `storage.s3.secret_key`,
      `security.master_key`, `auth.oidc.client_secret`, `signing.pkcs11.pin_file`'s contents)
      accepts a `_file` sibling (`security.master_key_file`, `database.url_file`,
      `storage.s3.secret_key_file`, ...) whose trimmed contents are the value, refuses both
      forms set together, has no flag, and its planted canary value appears in no line of
      `config show`, the startup log, or any loader error across a fixture that breaks every
      validation rule at once.
- [ ] AC5: `config schema --format json` lists every key the inventory above names with the
      owner's default, and `scripts/check-config-keys.js` passes against the tree; adding a row
      to any spec's key table with no schema entry, or a schema entry with no row, or a
      differing default, makes it fail naming the key.
- [ ] AC6: `docs/deployment/configuration.md` equals `config schema --format markdown`, and CI
      fails when the committed file is stale.
- [ ] AC7: No package outside `cmd/**` and `internal/config` imports Cobra or Viper, no package
      outside `internal/config` reads the process environment except the three carve-outs, and
      no package outside `cmd/**` defines a flag; each violation planted in a test fixture fails
      the architecture test.
- [ ] AC8: Every typed `Config` struct handed to a package is covered field-for-field by the
      schema, and a field or key added on one side alone fails the reflection test.
- [ ] AC9: The instance master key is required, is read only by `internal/security`, wraps a
      per-record data key with an AEAD carrying the master key id, and
      `keys rotate-master --new-key-file` re-wraps every record idempotently and resumably while
      a process started with the new key reads records under either id throughout; a second
      rotation started concurrently is refused by the rotation lock; a record's ciphertext in a
      database dump is unreadable without the key.
- [ ] AC10: With `server.tls.cert_file` and `server.tls.key_file` set the main listener serves
      TLS at `server.tls.min_version` or above, reloads a replaced certificate pair on `SIGHUP`
      and on file change without dropping established connections, and one set without the
      other fails validation; a plaintext credential-bearing request to a listener without
      native TLS and with `auth.allow_plaintext: false` is refused before lookup exactly as
      `auth.md` specifies, `X-Forwarded-Proto: https` notwithstanding, and the same request with
      `auth.allow_plaintext: true` (the `--allow-plaintext-auth` flag) is authenticated
      normally, with the startup log naming the flag and the assertion it makes.
- [ ] AC11: With `server.http2` at its default the main listener's ALPN offers only
      `http/1.1`, and a real Maven client's and a real cpanm client's output on a policy
      refusal contains the status line's reason phrase; with `server.http2: true` an `h2`
      connection is negotiated by a Go client.
- [ ] AC12: `server.hosts` binds each listed hostname to one repository passed to the handler at
      construction; a root-anchored request on a bound hostname reaches that repository, the
      same path on an unbound hostname is `404`, a binding to a non-existent repository logs a
      warning and serves `404` without failing startup, and a `SIGHUP` after editing the file
      applies a new binding without restart; a file listing one hostname twice fails
      `config validate` and `serve` naming the hostname and both entries, and a `SIGHUP` reload
      of such a file is refused with an error naming them while the previous binding keeps
      serving; after a rename of a bound repository the binding answers `404` with the
      missing-repository warning until edited and reloaded (`repository-lifecycle.md` AC28).
- [ ] AC13: The telemetry listener is bound only to `telemetry.listen`, the chart renders no
      Service or Ingress port for it, and `/metrics` is absent from the main listener unless
      `telemetry.metrics.on_main_listener` is set.
- [ ] AC14: On `SIGTERM` readiness fails first, in-flight requests including an upload session's
      current chunk complete within `server.shutdown_timeout`, workers drain for
      `async.drain_timeout`, a running job past the drain is reclaimed by another process
      within one lease, a new scheduler leader is elected within one tick, and the process
      exits 0; the chart's `terminationGracePeriodSeconds` is derived from the same two values.
- [ ] AC15: `/healthz` stays `200` during a database outage while `/readyz` goes non-`200`
      within `telemetry.health.timeout`; readiness also fails when the store refuses
      `HeadBucket`, when the leader's probe write under `<prefix>/.probe/` fails, or when
      `server.spool_dir` has less than `server.spool_min_free` free; a store presenting a
      private CA is reachable only with `storage.s3.ca_bundle_file` set, and fails readiness
      naming the certificate error without it.
- [ ] AC16: Migrations are forward-only numbered SQL files under `internal/db/migrations`, each
      applied in one transaction under the migration advisory lock, recorded in
      `schema_migrations` with the binary version; eight replicas started together against an
      empty schema apply every migration exactly once and all become ready; with
      `database.migrate_on_start: false` a `serve` against a schema behind the binary fails
      readiness naming the pending versions and `migrate up` applies them, `migrate status`
      listing applied and pending; a migration that fails mid-way leaves the schema at the
      prior version with no dirty state.
- [ ] AC17: The previous minor's released binary starts, passes `/readyz` and passes the
      conformance smoke slice against a database migrated by the current tree, run as a CI job
      on `main`; the migration runner refuses in one run migrations spanning more than one minor
      and names the intermediate release.
- [ ] AC18: Rolling back a running deployment from minor `N` to `N-1` by redeploying the
      previous image, with no database action, leaves every replica ready and the conformance
      smoke slice passing.
- [ ] AC19: Across three replicas under load, the scheduler tick, the sweep, the state-derived
      gauge collection, the migration runner, the master-key rotation and the first-start local
      admin emission each execute in exactly one process, killing the holder hands each over
      to another within its stated bound, and a process with `async.scheduler: false` never
      becomes leader however long the others are down; only `internal/db/lock` issues
      advisory-lock SQL.
- [ ] AC20: Eight replicas racing the first start against an empty schema leave one local admin
      row, whose credential appears in one replica's log once and authenticates against every
      replica; no other replica logs a credential.
- [ ] AC21: The documented restore procedure, executed against a database snapshot taken before
      an upload, a cache fill and a completed sweep, ends with `storage check` reporting zero
      dangling rows and zero unexplained objects: dangling rows are restored from bucket
      versions and post-snapshot objects are collected as orphans after grace.
- [ ] AC22: The container image runs as UID 65532 with a read-only root filesystem and no
      shell, is built for `linux/amd64` and `linux/arm64`, carries a cosign signature and an
      SBOM attestation that verify, and `stackweaver-registry --version` inside it reports the
      tag, commit and date.
- [ ] AC23: `helm install` with only the required values renders one Deployment, a ConfigMap
      from `config`, secret files mounted from `existingSecret` referenced through `_file` keys,
      a pre-upgrade migration Job running `migrate up` with the Deployment carrying
      `database.migrate_on_start: false`, a `caBundleSecretName` mount wired to
      `storage.s3.ca_bundle_file` when set, and passes `helm lint` and the helm-unittest suite;
      the rendered pod becomes ready against external PostgreSQL and MinIO in the CI kind
      cluster.
- [ ] AC24: `workers.enabled: true` renders a second Deployment of the same image with
      `async.workers` set and the first with `async.workers: 0`; a job enqueued through the web
      pods runs on a worker pod.
- [ ] AC25: `values.schema.json` is generated from the configuration schema, refuses an unknown
      key under `config`, refuses `tls.native` together with `tls.terminatedUpstream`, and
      neither it nor the configuration schema offers any offline key other than `proxy.offline`
      (no per-repository or per-upstream variant, `proxy-cache.md` AC5).
- [ ] AC26: `docker compose up` from `deploy/compose` yields a ready registry against the
      bundled PostgreSQL and MinIO, prints the local admin credential once, and the documented
      first-mint `curl` returns a token that authenticates a real client pull.
- [ ] AC27: `deploy/observability/alerts.yaml` installs through the chart as a PrometheusRule with
      the signing lead templated from `alerts.signingLeadHours`, and `dashboard.json` equals its
      regeneration from the metric catalogue, CI failing when either committed artefact is stale.
- [ ] AC28: The `SIGHUP` handler reopens the audit file, and the systemd unit and logrotate
      snippet in `deploy/systemd/` rotate it without a lost or duplicated audit line under a
      write load.
- [ ] AC29: Each documented recipe (web-only replicas with a worker pool, SoftHSM2, replicated
      repository keys, air gap, terminated-upstream TLS, PgBouncer session mode) is applied by
      an integration test and produces the behaviour the recipe states; in the air-gap recipe
      (`proxy.offline: true`, `networkPolicy.egress.registryOnly: true`) no connection leaves
      the registry pod except to the database, the store and the collector; in the
      terminated-upstream recipe an `HTTPS_PROXY` set in the process environment is honoured by
      every upstream request through the one `http.ProxyFromEnvironment` transport and by
      nothing else.
- [ ] AC30: The chart's default `resources` pass the benchmark gate's load profile with
      `GOMEMLIMIT` set from the container limit, run as a CI job whose thresholds are the
      gate's own.
- [ ] AC32: `make build`, the container image build and the GoReleaser release each run the web
      build first (`make web`: `npm ci` and `vite build` under Node 22 into `internal/ui/dist`): the binary
      `make build` produces, the image and every release archive serve the built UI at `/ui/`
      and not the committed placeholder, while `go build ./...` and `go test ./...` still
      succeed on a checkout with no Node toolchain; and `ui.instance_name` (default
      `Stackweaver Registry`) and `ui.help_url` are registered in the schema with `web-ui.md` as
      owner and no key disables the UI.
- [ ] AC31: Two instances configured with distinct `database.schema` and `storage.s3.prefix`
      against one PostgreSQL database and one bucket share no row and no object: a blob
      uploaded and a repository created in one are absent from the other, each instance's
      `storage check` reports zero unexplained objects under its own prefix, and `seed` writes
      only within the pair it was given.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | integration | `internal/config/required_test.go`; `cmd/stackweaver-registry/serve_test.go` (in-process factory, env-only start, missing-key aggregation) |
| AC2 | unit | `cmd/stackweaver-registry/precedence_test.go` (four sources per flagged key) |
| AC3 | unit | `internal/config/strict_test.go` (unknown file key, prefixed env with no key, unregistered key under a sibling-owned prefix) |
| AC4 | unit | `internal/config/secret_test.go` (`_file` sibling, both-set refusal, no flag); `internal/config/redaction_test.go` (canary scan) |
| AC5 | unit + script | `internal/config/schema_test.go`; `scripts/check-config-keys.js` with fixtures for each failure mode under `scripts/testdata/` |
| AC6 | ci | `.github/workflows/ci.yml` docs job (`config schema --format markdown --check`) |
| AC7 | architecture | `internal/config/arch_test.go`; `internal/config/env_boundary_test.go` |
| AC8 | unit | `internal/config/schema_struct_test.go` |
| AC9 | unit + integration | `internal/security/envelope_test.go`; `internal/security/rotate_test.go` (rotation under a concurrent reader with the new key); `internal/security/arch_test.go`; dump-unreadability check in `internal/security/dump_test.go` |
| AC10 | integration | `internal/server/tls_test.go` (min version, reload on `SIGHUP` and on file change, live connections); `internal/auth` plaintext refusal reused through `internal/server/plaintext_test.go` |
| AC11 | integration + conformance | `internal/server/alpn_test.go`; `conformance/transport/reason_phrase_test.go` (real `mvn` and `cpanm` against a refusing route, stdout scanned for the phrase) |
| AC12 | integration | `internal/server/hosts_test.go` (bound, unbound, missing repository, `SIGHUP` reload, a duplicated hostname refused at load and at reload with the previous binding kept, the post-rename `404` and warning shared with `repository-lifecycle.md` AC28); `internal/config/validate_test.go` (the duplicated-hostname case under `config validate`) |
| AC13 | integration + chart | `internal/server/listeners_test.go`; `deploy/helm/tests/listeners_test.yaml` |
| AC14 | integration + chart | `internal/server/shutdown_test.go` (under `testing/synctest` with a real upload session); `deploy/helm/tests/lifecycle_test.yaml` |
| AC15 | integration | `internal/server/probes_test.go` (database outage, `HeadBucket` refusal, spool below threshold) |
| AC16 | integration | `internal/db/migrate_test.go` (eight concurrent starts against a real PostgreSQL; injected failure mid-migration) |
| AC17 | ci | `.github/workflows/ci.yml` job `compat-previous-minor`; `internal/db/span_test.go` (multi-minor refusal) |
| AC18 | e2e | `deploy/helm/tests/e2e/rollback_test.sh` in the CI kind cluster |
| AC19 | integration + architecture | `internal/db/lock/singleton_test.go` (three processes, holder kill, hand-over bounds); `internal/db/lock/arch_test.go` |
| AC20 | integration | `internal/db/bootstrap_test.go` (eight racing first starts, log scanned for exactly one emission) |
| AC21 | integration | `internal/storage/restore_test.go` (snapshot, upload, cache fill, sweep, restore, `storage check --restore-dangling`, checker report) |
| AC22 | ci | `.github/workflows/release.yml` (GoReleaser, cosign verify, SBOM verify, `--version` inside the image) |
| AC23 | chart + e2e | `helm lint`; `deploy/helm/tests/*.yaml` (helm-unittest); `deploy/helm/tests/e2e/install_test.sh` (kind, external PostgreSQL and MinIO) |
| AC24 | e2e | `deploy/helm/tests/e2e/workers_test.sh` (enqueue through web pod, observe execution on worker pod through the job's `Operation`) |
| AC25 | unit + chart | `internal/config/values_schema_test.go` (generation); `deploy/helm/tests/schema_test.yaml` |
| AC26 | e2e | `deploy/compose/test/up_test.sh` (compose up, readiness, credential emission, first-mint `curl`, real client pull) |
| AC27 | chart + ci | `deploy/helm/tests/alerts_test.yaml`; `.github/workflows/ci.yml` docs job (`scripts/gen-dashboard.js --check`) |
| AC28 | integration | `internal/telemetry` audit `SIGHUP` reuse through `deploy/systemd/test/rotate_test.sh` (write load, rotation, line count and continuity) |
| AC29 | integration + e2e | `docs/deployment/recipes/*/test.sh`, one per recipe; air-gap egress asserted by the kind cluster's NetworkPolicy plus a connection log |
| AC30 | ci | `.github/workflows/ci.yml` job `sizing-gate` (benchmark profile against a pod with the chart's default `resources`) |
| AC31 | integration | `internal/config/isolation_test.go` (two instances, one database and bucket, cross-visibility and `storage check` per prefix); `conformance/harness` seed isolation reuse |
| AC32 | ci + integration | `.github/workflows/release.yml` (web build step precedes GoReleaser; the image's `/ui/index.html` is not the placeholder); `deploy/compose/test/up_test.sh` (built UI served); `scripts/verify-local.sh` step running `go build ./... && go test ./internal/ui/...` with `PATH` stripped of `node`; `internal/config/schema_test.go` (the two `ui.*` keys, owner, defaults, no disabling key) |

## Implementation Phases

Phases follow the charter's two placements: the baseline at step 2, packaging at step 4.

### Phase 1: Configuration baseline (charter step 2, with generic)
- `internal/config`: the schema registry, defaults, explicit env binding, strict decoding,
  validation with aggregated errors, `_file` secrets, redaction, `config validate|show|schema`.
- `cmd/stackweaver-registry`: root factory, the eight flags, `serve`, `version`, `config`;
  `seed` lands with the harness and shares the loader.
- `scripts/check-config-keys.js` and the `make verify` hook; the generated
  `docs/deployment/configuration.md` and its CI check.
- Architecture tests: import boundary, environment boundary, flag boundary, schema-struct
  coverage, secret-flag exclusion, env-name uniqueness.
- `internal/db`: pool, `database.*` keys, migration runner with the transaction-level lock,
  `schema_migrations`, `migrate up|status`, the `internal/db/lock` constant block.
- `internal/security`: master key loading, envelope `Seal`/`Open`, `keys generate`.
- `internal/server`: main and telemetry listeners, native TLS with reload, `server.http2`
  default off, probes, graceful shutdown, `server.hosts` with reload, `SIGHUP` handling.
- First-start admin emission inside the migration transaction.

### Phase 2: Operations baseline (still step 2)
- `keys rotate-master` with the session-level lock and the dual-id read path.
- `storage check --restore-dangling` as the subcommand surface over `storage-and-gc.md`'s
  checker (its AC27), and the documented restore procedure with its integration test.
- The connection-budget line and the PgBouncer session-mode recipe.

### Phase 3: Packaging (charter step 4, with OCI and the proxy layer)
- Dockerfile and `deploy/goreleaser.yaml`: distroless, multi-arch, cosign, SBOM; the Node 22
  build stage and the `before` hook running `make web`, with `make build` depending on it (AC32).
- Helm chart with the values above, `values.schema.json` generated, helm-unittest suite, kind
  e2e jobs (install, workers, rollback).
- Compose file with its test.
- `deploy/systemd/` unit and logrotate snippet.
- `compat-previous-minor` and `sizing-gate` CI jobs; the `main`-only placement mirrors the
  conformance job's.
- `alerts.yaml` packaging and `scripts/gen-dashboard.js`.

### Phase 4: Recipes and reference (with each sibling's landing)
- Each recipe lands with the subsystem it configures: SoftHSM2 with `signing-service.md`
  Phase 1, air gap with `supply-chain-policy.md`'s offline behaviour, replicated keys with
  `replication.md`; each with its integration test.
- The per-format "when a refusal actually blocks" section generated from
  `supply-chain-policy.md`'s table.

## Tasks

Left empty by `/spec`. Populated by `/tasks` once the spec reaches `planned`.

## Open Questions

None open. Thirteen decisions were needed where the citing specs left the shape open, pulled in
different directions, or where prior art offered a real alternative. Each was written in the
template's decision shape and adopted under the owner's standing delegation; `grep -rn
"standing delegation"` lists them for review.

### Resolved: one binary with roles by configuration (was Q1)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: one binary, one process
kind, roles turned off by `async.workers: 0` and `async.scheduler: false`; the chart's second
Deployment is a value, not a command. Accepted cost: a web replica shares a process with job
execution until the operator sets the key. B lost because every role here is Go code over one
schema and one pool, and `async-operations.md` already chose in-process workers; C lost because
Harbor's component count exists to bundle unrelated runtimes this project does not have.

**Recommendation:** A. Gitea's and River's shape; `async-operations.md`'s "one binary and one
deployment story".

| Option | You get | It costs |
|---|---|---|
| **A. One binary, roles by configuration** (adopted) | One image, one chart, one configuration; HA falls out of PostgreSQL locks | Default web replicas run jobs until told not to |
| **B. `serve` and `worker` subcommands** | Isolation by default | A second process kind in every chart and recipe; two commands whose configuration must agree |
| **C. Component processes (Harbor)** | Independent scaling per component | Internal TLS, service discovery, N images; nothing here needs it |

**Why this is yours:** it fixes the shape of every deployment recipe the project will ever ship.

### Resolved: PostgreSQL is the only coordination store (was Q2)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: no Redis, Valkey or
etcd; the queue, the leader lock, the sweep lock, sessions and the migration lock all live in
PostgreSQL. Accepted cost: the database is a single point of coordination, and every replica
holds two extra connections for the lock and `LISTEN` sessions. B lost because Gitea's HA guide
shows what happens when coordination is an afterthought bolted to a cache ("Cron jobs are run on
all replicas as no leader election is implemented") and Pulp's own default (`WORKER_TYPE`
`pulpcore`, advisory locks) proves PostgreSQL suffices.

**Recommendation:** A. Pulp's default; one dependency to make highly available instead of two.

| Option | You get | It costs |
|---|---|---|
| **A. PostgreSQL only** (adopted) | One HA story; advisory locks and `LISTEN`/`NOTIFY` already required by `async-operations.md` | Two dedicated connections per replica; no transaction-mode pooler |
| **B. Redis for locks, sessions and cache** | Familiar to Harbor operators | A second failure domain, a second secret, a second thing to back up or explain away |

**Why this is yours:** it decides what an operator must run to run the registry.

### Resolved: configuration sources and the flag set (was Q3)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: the cobra-viper
hierarchy (flags, environment, file, defaults) with a short persistent flag set of eight and
everything else file or environment; every key bound explicitly from the schema; strict decoding.
Accepted cost: an operator used to `--async.workers`-style flags for everything sets an
environment variable instead. B lost because a flag per key puts hundreds of values in process
listings and shell history and makes the secret exclusion a per-flag judgement; C lost because a
file-only surface (Harbor) fails the container shape where the platform delivers environment.

**Recommendation:** A. The skill's hierarchy with the flag set kept to what an operator types
by hand.

| Option | You get | It costs |
|---|---|---|
| **A. Eight flags, everything else file or environment** (adopted) | Short help; secrets structurally never flags | Some keys reachable only by file or environment |
| **B. A generated flag per key** | Everything on the command line | Hundreds of flags; secret exclusion per flag; `ps` shows configuration |
| **C. File only** | One place to look | Containers must template a file to pass a value |

**Why this is yours:** the flag set is the product's command-line face.

### Resolved: secret delivery by `_file` siblings (was Q4)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: every secret key accepts
its value inline (file or environment) or via a `_file` sibling naming a path; both set is an
error; no flag. Accepted cost: two spellings per secret to document. B lost because inline-only
secrets in the environment leak through `kubectl describe pod` and crash dumps, and every
platform can mount a file; C lost because a native Vault or cloud-KMS client adds egress and a
credential for a problem the platform already solves.

**Recommendation:** A. Gitea's `__FILE` and Pulp's key file, generalised to every secret.

| Option | You get | It costs |
|---|---|---|
| **A. Inline or `_file`** (adopted) | Works with Kubernetes Secrets, Compose secrets, systemd `LoadCredential`, Vault agent | Two spellings |
| **B. Inline only** | One spelling | Secrets in environment listings |
| **C. Secret-manager clients in the binary** | Direct fetch | Egress, a credential to the manager, N integrations |

**Why this is yours:** it is how every operator will hand the registry its secrets.

### Resolved: one instance master key, owned here (was Q5)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: `security.master_key`
is the single instance master key `proxy-cache.md`, `signing-service.md` and
`credential-management.md` encrypt under; required, no default, no generation on disk; envelope
encryption with a key id and a re-wrap rotation command; `signing-service.md`'s `signing.master_key`
row becomes a citation. Accepted cost: an operator must produce a key before first start
(`keys generate`), and a lost key loses stored secrets. B lost because a per-subsystem key
triples the rotation procedures and the ways to lose one; C lost because a generated-and-stored
key fails on read-only filesystems and forks across replicas, which is the failure mode
Harbor's default `secretKey` and Pulp's default key path invite.

**Recommendation:** A. Pulp's `DB_ENCRYPTION_KEY` made mandatory and envelope-wrapped.

| Option | You get | It costs |
|---|---|---|
| **A. One required master key, envelope encryption** (adopted) | One rotation procedure; one thing to guard; `file` signing keys, upstream credentials and exchange material share it | Required at first start; unrecoverable if lost |
| **B. A key per subsystem** | Blast radius per subsystem | Three rotations, three losses to explain |
| **C. Generated at first start and stored** | Zero-config start | Forks across replicas; fails on read-only roots; a default key in disguise |

**Why this is yours:** it decides the one secret an operator cannot lose.

### Resolved: migrations at startup, forward-only, previous-minor compatible (was Q6)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: `serve` applies pending
migrations under a transaction-level advisory lock by default, `migrate up` exists for a
pre-upgrade Job, migrations are forward-only, and every migration must keep the previous minor's
binary working, held by a CI job that runs that binary against the migrated schema. Accepted
cost: contract steps (drops, `NOT NULL` tightenings) wait one release, and a two-minor jump needs
the intermediate `migrate up`. B lost because `down` migrations are rarely tested and never
against production data (golang-migrate's dirty-and-force workflow is the evidence); C lost
because "restore from backup" as the only rollback (Gitea's position) turns every upgrade into a
gamble with the last backup.

**Recommendation:** A. Gitea's and Harbor's startup migration, plus the compatibility rule that
makes rollback a redeploy.

| Option | You get | It costs |
|---|---|---|
| **A. Startup migration, forward-only, N-1 compatible, CI-held** (adopted) | Rollback is a redeploy; rolling upgrades are safe by construction | Two-release contract steps; no multi-minor jumps |
| **B. Up and down migrations** | A rollback command | Down paths untested against real data; dirty states |
| **C. Startup migration, rollback by database restore** | Simplest code | Rollback loses writes since the backup |

**Why this is yours:** it is the promise operators hold the project to on every upgrade.

### Resolved: HTTP/1.1 by default on the main listener (was Q7)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: `server.http2: false`
by default, so ALPN offers only `http/1.1` and refusals reach reason-phrase-only clients with
their phrase; opt-in `h2`; behind a proxy the requirement is documented and the chart sets the
known ingress annotations. Accepted cost: no HTTP/2 multiplexing for clients that would use it,
and a behind-proxy deployment can only be told, not made, to speak HTTP/1.1 to clients. B lost
because per-route or per-format versions are impossible (ALPN precedes the request); C lost
because leaving `h2` on and accepting bare status codes for Maven, Gradle, R, Chef and CPAN
users silently degrades the one surface (a refusal) where the message matters most.

**Recommendation:** A. The only mechanism that can enforce the constraint from inside the
registry.

| Option | You get | It costs |
|---|---|---|
| **A. HTTP/1.1 only by default, `h2` opt-in** (adopted) | Reason phrases reach every client; one switch | No multiplexing by default |
| **B. Per-format HTTP version** | Best of both | Impossible: the version is negotiated before the route is known |
| **C. `h2` on, document the loss** | Multiplexing | Bare `403` for a large client population |

**Why this is yours:** it trades transport performance for refusal legibility on every
deployment.

### Resolved: host bindings are configuration, reloadable (was Q8)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: `server.hosts` in the
file, passed to handlers at construction, reloaded on `SIGHUP`, a missing repository a warning
not an error. Accepted cost: a binding cannot be created through the management API alone.
B lost because a hostname is a deployment fact (DNS, SAN, ingress rule) before it is a registry
fact, and a repository setting that requires a certificate change to take effect is a setting
in the wrong place.

**Recommendation:** A. The binding lives where the certificate and the DNS record live.

| Option | You get | It costs |
|---|---|---|
| **A. Configuration, `SIGHUP`-reloadable** (adopted) | One place with the TLS and ingress facts; validated at load | Not API-administrable |
| **B. A repository setting** | Administrable through the API and the UI | A setting that silently does nothing until DNS and TLS follow; the seed path and the file both write it |

**Why this is yours:** it decides who adds a hostname: the operator or the repository admin.

### Resolved: the chart requires external PostgreSQL and object storage (was Q9)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: no bundled database or
store in the chart; the Compose file bundles both for evaluation and says so. Accepted cost: the
chart has no one-command install. B lost because Harbor's and Gitea's bundled databases are the
ones their own HA guides tell you to replace, and a bundled store contradicts the durability
argument `storage-and-gc.md` rests on.

**Recommendation:** A. The evaluation shape is Compose; the production shape has a database
someone owns.

| Option | You get | It costs |
|---|---|---|
| **A. External only in the chart; Compose bundles** (adopted) | No accidental production database | Two files to learn |
| **B. Optional subcharts** | `helm install` alone works | The optional path becomes the production path |

**Why this is yours:** it decides what "install" means for the product.

### Resolved: bucket versioning is a deployment requirement (was Q10)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: object versioning or an
equivalent soft-delete window at least as long as the database backup retention is required,
and the restore procedure restores dangling rows' objects from versions. Accepted cost: storage
for deleted versions until the window closes. B lost because without versions a database
restore after a sweep loses blobs permanently and the procedure cannot be made verifiable; C
lost because pausing the sweep for the backup window defeats GC exactly when a busy registry
needs it.

**Recommendation:** A. The only way a restore can be checked rather than hoped for.

| Option | You get | It costs |
|---|---|---|
| **A. Versioning required; restore from versions** (adopted) | Verifiable restore; `storage check` ends at zero dangling | Version storage for the window |
| **B. No requirement; document the risk** | Cheaper storage | Unrecoverable dangling rows after any sweep |
| **C. Sweep deferred past backup retention** | No versions needed | GC lag equal to backup retention |

**Why this is yours:** it is a bucket-level cost imposed on every deployment.

### Resolved: `verify.workers` folds into `async.kind_limits` (was Q11)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: `verify.workers` is
retired; the bound lives in `async.kind_limits` as `verify.reevaluate: 4`, which
`async-operations.md` already states is "the home of `verify.workers`". Accepted cost: a rename
in `artifact-verification.md`'s key table. B lost because two keys for one bound is the two-way
check's first false positive.

**Recommendation:** A. `async-operations.md` already decided it; this spec applies it.

| Option | You get | It costs |
|---|---|---|
| **A. One home in `async.kind_limits`** (adopted) | One key; per-kind bounds in one place | A table edit in a sibling |
| **B. Keep both, alias one** | No sibling edit | Two keys, one meaning; the schema check must special-case it |

**Why this is yours:** it is a cross-spec key ownership call.

### Resolved: sizing by measurement, not by tier table (was Q12)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: the chart's default
`resources` are the values under which the benchmark gate's profile passes, held by a CI job;
the documentation states the memory model rather than a tier table. Accepted cost: operators
who want a Nexus-style S/M/L table get a method and one measured point instead. B lost because a
guessed table is a promise no test holds, which the constitution names as the way performance
regressions hide.

**Recommendation:** A. Numbers the build measured, or none.

| Option | You get | It costs |
|---|---|---|
| **A. Measured defaults, memory model documented** (adopted) | Every number is a CI result | No tier table on day one |
| **B. A tier table from prior art** | Familiar | Unmeasured; wrong the moment the code changes |

**Why this is yours:** it decides what the project promises about capacity.

### Resolved: the `auth.*` keys are carried here until `auth.md` tables them (was Q13)

**Met 2026-09-28:** `auth.md` now tables nine `auth.*` keys in its "Configuration" section (the
seven registered here plus `auth.allow_plaintext`, which this spec had carried in its own table,
and `auth.token_service.lifetime` `5m`), so the two-way check passes and the `auth.allow_plaintext`
row moved out of this spec's owned table into the `auth.` row of the sibling inventory. The
decision below stands as the record of why the keys were registered before the owner tabled
them.

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: the schema registers the
`auth.*` keys `auth.md`'s Design requires (OIDC issuer, client id and secret, redirect URL, admin
identities, the keep-local-admin flag, session lifetime) with `auth.md` as owner, so the two-way
check fails until `auth.md` adds its key table, and the failure names the gap. Accepted cost: a
red check on `main` until that sibling edit lands, which this report requests. B lost because a
binary that cannot configure OIDC does not satisfy `auth.md` AC2, and silence in the schema would
hide the gap the check exists to find.

**Recommendation:** A. Let the mechanical check apply the pressure it was built for.

| Option | You get | It costs |
|---|---|---|
| **A. Register now with `auth.md` as owner** (adopted) | The gap is visible and named | Red check until the sibling tables its keys |
| **B. Omit until `auth.md` tables them** | Green check | OIDC unconfigurable; the gap invisible |

**Why this is yours:** it lets a mechanical check fail `main` on a sibling's omission.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-27 | ff566dd | authoring pass: grounded first draft, not a review | Not a review. Gathered the requirements placed on this file by `credential-management.md` (item 14), `signing-service.md` (item 15), `upstream-adapters.md` (item 14), `async-operations.md` (item 14), `observability.md` (item 18), the charter fold (item 13: baseline at step 2, packaging at step 4), cross-cutting theme 3 and item 28 (HTTP/1.1 reason phrases), theme 2 and item 16 (client egress as a precondition), items 18 and 25 (host binding), `auth.md`'s TLS paragraph and plaintext flag, `proxy-cache.md` AC5 and AC6, `storage-and-gc.md`'s sweep lock and single deleter, `data-model.md`'s no-handler-DDL rule and AC8, `management-api.md`'s CLI stance and configuration paragraph, `conformance-harness.md`'s seed path, and every foundation spec's key table (66 sibling keys across `credentials.`, `signing.`, `index.`, `async.`, `telemetry.`, `management.`, `verify.`). Prior art fetched this run: Harbor's `harbor.yml` reference, HA guide, Helm chart README and GC guide; Gitea's config cheat sheet, upgrade guide, Helm chart README and HA notes; the CNCF distribution configuration reference; Pulp's settings reference; Nexus system requirements; PostgreSQL's explicit-locking reference; golang-migrate's README. Recorded as silence: JFrog's Artifactory HA and requirements pages (empty client-rendered bodies) and the Pulp operator's install guide (403). Design: one binary with roles by configuration, a Cobra tree of `serve`, `migrate`, `config`, `keys`, `seed`, `version`, one schema registry driving defaults, explicit env binding, eight flags, `_file` secrets, strict decoding, aggregated validation and a generated reference, a two-way check between the schema and every spec's key table, one required master key with envelope encryption and re-wrap rotation, PostgreSQL and S3-compatible storage requirements, native TLS with reload and HTTP/1.1 by default, reloadable host bindings, forward-only previous-minor-compatible migrations with rollback by redeploy, singletons held by one advisory-lock constant block, a verifiable restore procedure on bucket versioning, a distroless multi-arch signed image, a Helm chart whose values schema is generated, a Compose file, systemd unit, and measured sizing. Three conflicts resolved: `signing.master_key` versus one instance key; `verify.workers` versus `async.kind_limits`; `auth.md`'s untabled configuration. Thirteen questions written in decision shape and adopted under the standing delegation. 31 criteria, each with a Test Plan row; `node scripts/check-spec.js` run against this file with zero failures. Stays draft; awaits an independent review. |
| 2026-09-28 | ff7966e | cross-spec reconciliation of the foundation authoring wave. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` targeting this file verified against the source spec's current text before applying. Key inventory made exhaustive and single-homed: `auth.` (9, from `auth.md`'s new table; `auth.allow_plaintext` left this spec's owned table), `gc.` (6), `policy.` (5), `replication.` (2), `upstream.` (3, now `upstream-adapters.md` AC32's; left this spec's owned table) and `ui.` (2) joined the sibling table with counts verified by grep of each owner's table; `signing.` reads 9 plus `index.` 4 with the master-key citation, `verify.` 4 with `verify.workers` retired; the "Prefixes reserved" paragraph is gone and AC3 asserts the unregistered-key refusal under a sibling prefix instead. CLI table gained `storage check [--restore-dangling]` (`storage-and-gc.md` AC27). Host binding cites `Deps` and the re-open input (`format-handler-interface.md`); the `podman --internal` reference cites the harness's resolved client-confinement decision (was Q6) and AC23; the refusal page is generated from `supply-chain-policy.md`'s binding table (its AC20) and the status-line write half cites its was-Q10 and AC18; rolling upgrades cite `async-operations.md`'s was-Q10 and AC26; the singleton table cites async AC14 and storage-and-gc AC26 through `internal/db/lock`; the replicated-key recipe cites `replication.md` AC21 and `signing-service.md` AC23. Web UI packaging absorbed from `web-ui.md`: "The web UI build" (make web, Node 22 stage, GoReleaser hook), new AC32 with a Test Plan row, Scope and Context updated. Resolved Q13 annotated as met. No em-dashes or en-dashes. `node scripts/check-spec.js`: zero failures for this file. Stays `draft`. |
| 2026-09-28 | 3135d95 | closing reconciliation sweep on Opus: cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` targeting this file from "From format batch 3 reconciliation" through the latest section, plus earlier items the progress log did not show applied, verified against its source's current text. Applied: the signing-service closing sweep item 5 (`index.render_memo_bytes` `256 MiB` in the `index.` row, now 5 keys; the signing-service requirements row names it); format batch 8 item 7 (a `server.hosts` list naming one hostname twice is refused at load by `config validate` and `serve`, and on `SIGHUP` with the previous binding kept, asserted in AC12, `puppet.md` AC8 relying on it); format batch 5 item 7's deployment half (the rename behaviour of a by-name binding, citing `repository-lifecycle.md`'s was-Q10 adopted in the same sweep, AC12 extended); format batch 1 item 11 (`server.public_url`'s row names its readers: handlers through `Deps` and `signing-service.md`'s serve-time `Render`, its was-Q13); the observability, deployment and web-ui reconciliation item 2 (`ui.help_url`'s concrete default). Recounted every sibling table at this sha: 85 keys under 13 prefixes, correcting the earlier '14 prefixes' (there were 13 rows) and AC3's 'fourteen'. Found already done: conformance-harness reconciliation 9, supply-chain reconciliation 2, replication reconciliation 4, upstream and async reconciliation 3. Two requirement rows added (repository-lifecycle was-Q10, puppet AC8). No question raised here; `node scripts/check-spec.js` zero failures on this file. Stays draft. |
