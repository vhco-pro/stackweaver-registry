---
status: draft
status_description: "Closing reconciliation sweep 2026-09-28 at b7640dd on Opus (not a review): the kind table matches signing-service and proxy-cache as settled. index.merge is enqueued by a member write, a virtual's creation, each member-list change and a remote member's adoption through the adoption-commit hook (signing-service was-Q15, was-Q16; AC11 extended). signing.resign gains the one repository-scoped schedule under repository:{repository} beside the per-pointer ones (signing-service AC33, hackage was-Q16; AC14 extended). New kind proxy.revalidate (proxy-cache was-Q18, AC26): enqueued by EnqueueRevalidation from ServeDocument on a virtual read (its own enqueue-only transaction) and inside the virtual-creation and member-change transactions, key revalidate:{repository} for coalesce and exclusivity, run_at now, no Schedule, nothing enqueued under proxy.offline, read_only or deleted, its effect an adoption whose hook enqueues index.merge (AC29). The queue gives no job a principal and never holds the replay entry, since the replay runs below the authorizer (auth AC36, FHI AC18; AC30). Q11 adopted: RetryAt(err, at), run_at the later of at and the backoff, counted as an attempt, so a rate limit moves run_at past RetryAfter (AC7, AC24). Context's format list rewritten from each format spec's own virtual section (rpm, conda, arch, alpine, opam, cran, plus chef, luarocks, maven, helm, are index.merge consumers; julia, pub, vagrant, composer, homebrew, openvsx, puppet, swift, terraform, conan resolve per request and ask nothing), and Ansible's import is deferred on manage.apply (ansible was-Q9). 30 criteria, each with a Test Plan row; eleven questions resolved, zero open; carries fable_recheck; stays draft pending a gate review. Earlier: reconciled 2026-09-28 at 9ebf6e9 with the foundation authoring wave (not a review): repository deletion cancels pending jobs in its transaction, cancels running ones cooperatively, disables repository-scoped schedules and a job meeting the deleted state ends itself, through CancelByRepository (AC28); a job of a kind this process has no worker for is skipped for a newer or older binary, never failed and never a refused start (Q10 adopted, AC26 rewritten); the scheduler lock is internal/db/lock.LockScheduler and the leader runs the state-gauge collector (AC14); the kind table is fixed by each owning spec (policy.feed_sync one schedule per source under feed_sync:{source}, replication.sync per link at replication.sync_interval, verify kinds distinct from their period keys on purpose, storage kinds at the gc.*_interval keys); the async_* series and four alerts under observability's names (AC20), trace_context and request_id at enqueue with a linked job span (AC27); Job and Schedule cited as data-model's (AC41) and cancelled as admitted (AC32); the eleven keys under scripts/check-config-keys.js (AC22); Context restated against the charter's 4b/6a placement and every sibling as it now stands. 28 criteria, each with a Test Plan row; ten questions resolved, zero open; stays draft pending a gate review. Earlier: authored 2026-09-27 at 998b03a as a grounded first draft, not yet reviewed. Gathers the deferred-execution requirements management-api.md (deferred kinds, 202 plus Operation, poll route, idempotency), data-model.md (the Operation entity and its atomic terminal transition), signing-service.md (virtual merge contract and the cadence re-sign), artifact-verification.md (the re-evaluation worker), supply-chain-policy.md (scans, retries, feed sync), replication.md (resumable transfers), generic.md (the retention pass), the write-triggered services prototype (its questions 4 to 6 and AC8 to AC12) and the format specs placed on the step 6a subsystem, and fixes one PostgreSQL-backed job queue with leased, fenced, transactional completion that every deferred and scheduled activity in the registry runs on. Nine questions written in decision shape and adopted under the owner's standing delegation; zero open. 26 criteria, each with a Test Plan row. Awaits a /spec review pass."
description: "Spec for the shared asynchronous-operation subsystem: one PostgreSQL-backed job queue (SKIP LOCKED claims, leases with fencing tokens, transactional enqueue and completion, bounded retries, coalescing and exclusivity keys, cooperative cancellation, pause and resume, a leader-elected scheduler) that executes every deferred management operation behind data-model.md's Operation record and every scheduled or background activity the sibling specs name: virtual merges, cadence re-signing, the revalidation of remotes reached only through a virtual, verdict re-evaluation, scans and feed sync, replication transfers, retention passes and the GC sweep."
author: michielvha
goal: "Give every deferred or scheduled activity in the registry one runner with one durability story, so that a deferred write commits exactly once and atomically with its Operation and snapshot across crashes and multiple server processes, no handler or shared layer ever grows a goroutine, timer or queue of its own, and a pending import can never lose its bytes to the sweep."
priority: high
issue: 49
created: 2026-09-27
covers:
  - "internal/async/**"
fable_recheck: "authored in the 2026-09-27 cloud session, whose model is not recorded; needs a Fable authoring-quality review before any gate. Closing reconciliation sweep on Opus 2026-09-28 raised and adopted Q11 (RetryAt: a worker-supplied earliest retry time, the later of it and the backoff, counted as an attempt) and folded the proxy.revalidate kind with the rule that the queue gives no job a principal (AC29, AC30), which bounds a below-authorizer replay: both need a Fable recheck"
---

# Plan: Asynchronous Operations

One PostgreSQL-backed job queue, `internal/async`, executes everything in the registry that runs
outside a request: the deferred half of a management operation (a Galaxy import, a bulk publish
too large to answer inline), the virtual-repository merge, the cadence re-sign, the
revalidation of a remote reached only through a virtual, verdict re-evaluation, scans and the
advisory feed sync, replication transfers, retention passes and the storage sweep. A job is enqueued in the transaction that decides it is needed, claimed by one
worker at a time with a lease, and finished in one transaction that carries the job's terminal
state, the `Operation` it backs and the snapshot it produces, fenced so a worker that lost its
lease can never commit. Nothing here is a second entity or a second wire shape: the client-visible
record is `data-model.md`'s `Operation` and the wire is `management-api.md`'s.

## Context

The charter builds the queue core (Phases 1 to 3) as the first item of build-order step 4b,
"immediately after the re-open records its finding on the prototype's questions 4 to 6, because
verification and policy are consumers of the one queue", and the deferred management operation
(Phase 4) at step 6a, "immediately before" Ansible collections, whose publish "returns an import
task the client polls, the first client-visible asynchronous operation in the build order"
(`project-charter.md`, build order, steps 4b and 6a; its AC12). That is the resolved
build-placement decision below (was Q9), now folded into the charter; the earlier step 6a
placement of the whole subsystem was a reconciliation act, not an owner decision.

The requirements already exist, scattered across the specs that cite this file:

- **`data-model.md`, "Operations", "Jobs and schedules", AC32 and AC41**, owns the `Operation`
  entity and, since the 2026-09-27 reconciliation, the `Job` and `Schedule` records this spec
  runs on. `Operation`: repository, format, kind, an unguessable wire id, monotonic state
  (`pending`, `running`, then exactly one of `completed`, `failed`, `cancelled`, a terminal
  state never changing), created and finished times, principal and authorizing scope, a
  handler-written result document, and a produced-snapshot reference set only on `completed`,
  in the same transaction as the snapshot, "so there is never a snapshot whose operation reads
  unfinished or a completed operation with no snapshot"; not snapshot content, not a mark root,
  pruned after a window. Its "Jobs and schedules" section transcribes the `Job` and `Schedule`
  records specified below, field for field, including the partial unique indexes, the
  `trace_context` and `request_id` columns `observability.md` AC16 asked for, and the rule that
  "an unfinished job naming a repository holds that repository's grace open, exactly as an
  unexpired upload session does", which replaced its earlier wording that a pending operation's
  bytes are protected only by the repository-scoped grace and left the answer to the prototype's
  question 5.
- **`management-api.md`** owns the wire. Its Scope excludes "Execution of deferred operations":
  this spec "owns workers, retries, leases", pausing and the cancellation mechanics; that spec
  owns the operation's wire shape, its `Operation` record and its poll and cancel routes, so
  the two are one contract seen from two sides. Its Design fixes: a handler "declares, per kind,
  whether `Apply` runs inline or is deferred; the API answers 201 with a completed `Operation`
  for the former and 202 with a `pending` one and a `Location` for the latter", the deferred
  path "commits the same way (one snapshot, atomic with the terminal transition)", the poll
  route `GET /api/v1/operations/{id}` needs the originating write's authorization,
  `Idempotency-Key` with `operation-outstanding` (409) meaning "job not terminal", the
  `management.operation_retention` (90 days) and `management.deferred_threshold` (10 s,
  AIP-151) keys, and AC16 and AC17 assert them. Its endpoint table carries the routes this spec
  asked for: `POST /api/v1/operations/{id}/cancel`, `GET /api/v1/system/jobs`,
  `POST /api/v1/system/jobs/{id}/cancel` and `POST`/`DELETE /api/v1/system/jobs/kinds/{kind}/pause`
  (its AC16, AC32).
- **`signing-service.md`, "Virtual merges: deferred, coalesced, signed with the virtual's key"**,
  fixes the merge contract and executes it here as the `index.merge` kind: "A completed write on
  a member enqueues a merge for every virtual that lists it; merges for one virtual within a
  coalescing window run once; the window and a staleness bound ... are configuration", "the
  previous merged document set serves until the new one commits atomically; a merge that fails
  leaves the previous set and an alert", `index.virtual_merge_window` 5 s and
  `index.virtual_staleness_bound` 60 s, "run as deferred work, never on a request's path",
  asserted by its AC19 on the production runtime (`internal/async`). Four things enqueue it: a
  member's write, through the pre-commit hook in the member's write transaction; a virtual's
  creation, "its first merge enqueued at creation"; a change of the virtual's member list, "and
  one per member-list change" (a member-list change is also a document-only transition of the
  virtual's pointer, its resolved virtual-freshness decision, was Q15 there, AC34); and a remote
  member's adoption of a new upstream revision, which is cache materialisation rather than a
  write, so the runtime registers on `proxy-cache.md`'s **adoption commit** and enqueues
  `index.merge` for every virtual listing the remote inside the adoption transaction, "with the
  same coalesce key as a member write" (its resolved remote-member decision, was Q16 there,
  AC35). Its cadence re-sign is the `signing.resign` `Schedule`, "a scheduled production of
  pointer documents under the current keys, creating no snapshot, durable across a restart (the
  schedule derives from the stored documents' expiry, not from a timer in memory)" (its AC22,
  on the production scheduler): one per signed pointer, exclusivity key
  `pointer:{repository}/{pointer}`, plus, for a repository whose profile declares a
  repository-scoped pointer document (Hackage's `root.json` and `mirrors.json`), "one
  repository-scoped `signing.resign` schedule, exclusivity key `repository:{repository}`, which
  alone renews that document, as one repository batch across every pointer" (`hackage.md`'s
  resolved root-placement decision, was Q16 there; its AC33). Its package starts no goroutine
  that outlives a request, the former cadence-scheduler exception having become a `Schedule`
  here.
- **`proxy-cache.md`, "Revalidation outside the request"** (its resolved revalidation-replay
  decision, was Q18 there, AC26): a `remote` reached only through a `virtual` receives no request
  of its own, so its revalidation is the `proxy.revalidate` job kind, "owned here [in
  `proxy-cache.md`] and run by `async-operations.md`". Its only argument is the remote; it is
  enqueued through `EnqueueRevalidation(ctx, remote)`, "with coalesce key and exclusivity key
  `revalidate:{repository}`", by three callers: `signing-service.md`'s `ServeDocument` when it
  serves a virtual's merged document whose input from the remote is past the remote's TTL, a
  virtual's creation, and a member-list change adding a never-adopted remote, "the last two
  inside the transaction that makes the change". "The job is never scheduled"; "while
  `proxy.offline` is set, or the remote is `read_only` or deleted, `EnqueueRevalidation`
  enqueues nothing, and a job already pending ends without a request when it observes either
  state"; "a `*upstream.RateLimitError` ends the job with its `run_at` moved past `RetryAfter`;
  any other failure ends it under the queue's ordinary retry policy". The job's effect is an
  adoption, which commits through the adoption hook above and so enqueues `index.merge`. The job
  reaches the remote's handler by replaying its proxied route in process **below the shared
  authorizer**, with "a revalidation-replay marker and no principal", through
  `format-handler-interface.md`'s replay entry, which is "injected into `internal/proxy` and
  nothing else" (its resolved replay-entry decision, was Q11 there, AC18); `auth.md` AC36 names
  it the one handler entry that skips the authorizer and lists "a principal or credential
  attached to the replay" and "any part of the replayed response copied to a caller, a log line,
  an error body or a job result" among what would make it unsafe.
- **`artifact-verification.md`, "Re-evaluation when a trust set changes"**: a trust-set revision
  "marks the repository's verdicts under the previous revision as superseded and enqueues them
  for re-evaluation" as a `verify.reevaluate` job with a checkpoint per page, so that "no
  verdict is ever lost to a crash and none is ever recomputed twice" (its AC3), bounded by
  `async.kind_limits` (`verify.reevaluate: 4`; there is no `verify.workers` key, per
  `deployment.md`'s resolved worker-limit decision, was Q11 there); plus the
  `verify.tuf_refresh` and `verify.revocation_refresh` schedules with periods
  `verify.sigstore.refresh` (24 h) and `verify.revocation.refresh` (12 h), disabled under
  `proxy.offline` (its AC22).
- **`supply-chain-policy.md`, "Scanning is asynchronous; enforcement is synchronous"**: "An
  artifact is scanned after ingest" as a `policy.scan` job with coalesce key `scan:{digest}`
  and a kind-declared retry bound, an artifact unscanned past
  `policy.scan.unscanned_alert_after` counting in `policy_unscanned_past_bound` (its AC6); and
  the feed sync is a `policy.feed_sync` `Schedule`, one per OSV-schema source (the default feed
  and each `policy.feed.sources` entry), period `policy.feed.sync_interval`, suspended under
  offline mode (its AC16, AC21).
- **`replication.md`**: each active link is a `Schedule` on `internal/async` enqueuing a
  `replication.sync` job with exclusivity key `link:{id}` and a checkpoint per completed
  snapshot, period `replication.sync_interval` unless the link sets its own, so that
  "interrupted transfer resumes from the last completed snapshot rather than restarting" (its
  AC3, AC23) and "a transfer killed midway leaves every mirrored pointer on the most recently
  completed target" (its AC2).
- **`formats/generic.md`, resolved retention-placement decision (was Q11 there)**: "an age rule
  must fire while nobody is writing, so retention cannot be handler code"; a retention pass is
  "one completed write" in `internal/retention` that runs "outside any request".
- **`storage-and-gc.md`**: the sweep, orphan scan and pruning are the `storage.sweep`,
  `storage.orphan_scan` and `storage.prune` kinds enqueued by this scheduler at
  `gc.sweep_interval`, `gc.orphan_scan_interval` and `gc.prune_interval`, the sweep holding
  `internal/db/lock.LockSweep` for its whole run as a second guard (its AC26); and an unfinished
  job naming a repository holds that repository's grace open (its AC23).
- **`repository-lifecycle.md`, "Deletion", AC21**: deleting a repository cancels every pending
  job naming it in the deletion transaction, cooperatively cancels the running ones, disables
  the repository-scoped `Schedule`s, and expects a job that observes the deleted state at its
  next step to end itself without a write; the grace hold stands until the job is terminal.
- **`observability.md`**, metric and alert catalogue, AC7 and AC16: the `async_*` series and
  the `JobFailed`, `ScheduleOverdue`, `SchedulerLeaderless` and `VirtualMergeStalenessBreach`
  alerts by name; state-derived gauges collected on the scheduler leader only; a job's span
  linked to the enqueuing request's span and its audit line carrying that request's id.
- **`deployment.md`**, "Upgrade and rollback policy", "Multi-replica constraints", key
  inventory: during a rolling upgrade "a kind the old binary does not know is left unclaimed
  until the rollout finishes"; the scheduler's leader lock is taken through
  `internal/db/lock.LockScheduler`, the one constant block that may issue advisory-lock SQL;
  the eleven `async.*` keys and the `async.workers: 0` web-replica recipe are in its inventory
  and its "Roles" table.
- **`write-triggered-services-prototype.md`**, whose asynchronous half asks questions 4 to 6
  (deferral through `Deps` or a callback, one snapshot on success and none on failure "across a
  process restart", whether "a pending import's blob need[s] GC protection the settled machinery
  does not give") and asserts AC8 (a real `ansible-galaxy` publish with "the vehicle's runner
  held until the first poll is answered"), AC9, AC10 (a server killed at each step leaves "the
  operation terminal within a bounded time, the import applied at most once"), AC11 (a forced
  sweep past grace "does not collect the pending import's artifact blob") and AC12 ("Deferred
  work runs on the shared runner, never on a handler-owned goroutine or queue"). Its
  `ansible-collections.md` counterpart now runs the import deferred, as the `publish` kind
  declared deferred and executed by the `manage.apply` job on `internal/async` (its resolved
  deferred-import decision, was Q9 there, which reversed its earlier synchronous-in-v1 stance;
  its AC9 pauses `manage.apply` through the admin routes exactly as AC10 here does).
- **Format specs**, each read in its own virtual and dependency sections. Their only use of the
  queue besides Ansible's deferred import is the virtual merge (and, through it, the
  revalidation of remote members):
  - **Virtual-merge consumers**, whose virtual repositories are re-merged by the `index.merge`
    kind: `debian.md`, `cpan.md` and `hackage.md` require this spec `planned` before their
    virtual phase (Phase 5 in each); `rpm.md`, `conda.md`, `arch.md`, `alpine.md`, `opam.md`
    and `cran.md` state that their one deferred piece is the virtual merge on this runner, whose
    queue core the charter builds at the start of step 4b, before any of them (opam's Phase 4
    "waits on `async-operations.md`'s queue core"); and `chef.md`, `luarocks.md`, `maven.md` and
    `helm.md` merge their virtuals through the same kind, recording that nothing is required of
    this spec directly because `signing-service.md` owns the kind. Their remote members are the
    ones `proxy.revalidate` keeps fresh, since only
    a format with a `Merge` enqueues it (`proxy-cache.md`, "A per-request virtual needs none of
    this").
  - **Asking nothing**, because every write completes inside its request and a virtual is
    resolved per request with no stored merge (no `index.merge` job and no `proxy.revalidate`
    job exists for them): `julia.md` (an unmerged union), `pub.md`, `vagrant.md` (its resolved
    virtual-catalog decision, was Q13 there), `composer.md`, `homebrew.md`, `openvsx.md`,
    `puppet.md`, `swift.md`, `terraform.md` and `conan.md`. `hex.md` declares `Virtual:
    unsupported`.
  - `nuget.md` regenerates its hosted indexes inside the write (no indexing delay is deferred),
    and `maven.md` declined a staging operation, so none of the "indexing delay" shapes the
    loop's hint named is a consumer.

Nothing in the tree implements any of this: `internal/` does not exist at 9ebf6e9, so every
claim in this spec is design, verified against sibling specs and the prior art fetched at
authoring rather than against code.

## Scope

**In scope:**

- The job queue: the `Job` record, transactional enqueue, leased claim by `SELECT ... FOR UPDATE
  SKIP LOCKED`, heartbeat, fenced and transactional completion, bounded retry with backoff,
  permanent-failure classification, lease-expiry rescue, cooperative cancellation, pause and
  resume per kind, coalescing keys and exclusivity keys, pruning.
- The runner: in-process bounded workers in every server process, `LISTEN`/`NOTIFY` wake-up with
  a polling fallback, graceful drain on shutdown.
- The scheduler: a leader-elected periodic enqueuer with schedule state in PostgreSQL, serving
  every cadence a sibling spec names (re-sign, feed sync, TUF and revocation refresh,
  replication sync, retention passes, sweep, orphan scan, pruning).
- Execution of the deferred half of a management operation: how a `pending` `Operation` becomes
  `running` and terminal, atomically with its snapshot, through `management-api.md`'s `Operator`
  `Apply`; the idempotency and `operation-outstanding` semantics seen from the queue.
- Execution of the virtual merge under `signing-service.md`'s contract, the cadence re-sign
  schedules (per pointer and per repository), the revalidation of a remote reached only through
  a virtual under `proxy-cache.md`'s, verdict re-evaluation, scans and feed sync, replication transfers with checkpoints,
  retention passes, and the scheduling of the storage sweep, orphan scan and snapshot pruning.
- The GC interaction: an unfinished job holds its repository's grace open (the resolved
  grace-hold question below), answering the prototype's question 5 in design and leaving the
  prototype's AC11 to verify it.
- Operator controls (list, cancel, pause, resume) as `management-api.md` routes, the runner's
  configuration keys (`deployment.md`'s inventory), metrics and alerts (`observability.md`'s
  catalogue); what each must say is fixed here.
- What repository deletion does to the queue: pending jobs cancelled in the deletion
  transaction, running ones cancelled cooperatively, repository-scoped schedules disabled, a job
  that meets a deleted repository ending itself (`repository-lifecycle.md` AC21).
- Rolling upgrades and rollbacks with mixed binaries: a job of a kind this process has no worker
  for is never claimed by it and never failed.
- Fault injection, property and benchmark tests, because concurrency and durability have no
  client oracle (`CLAUDE.md`).

**Out of scope, with the reason:**

- **The `Operation` entity and any new record.** `data-model.md` owns entities; the `Job` and
  `Schedule` records this spec needs and the `cancelled` terminal state it added to `Operation`
  are specified precisely below and live there ("Jobs and schedules", AC41; "Operations",
  AC32), never here.
- **The wire shape of an operation**: the poll route, the 202 response, problem types, the
  `Idempotency-Key` header and the operator-control routes' paths. `management-api.md` owns the
  `api` mount; this spec fixes what those routes must do and reports the additions.
- **What any job does.** The merge algorithm is `signing-service.md`'s, the revalidation replay
  `proxy-cache.md`'s, the verdict computation `artifact-verification.md`'s, the scan `supply-chain-policy.md`'s, the transfer
  `replication.md`'s, the sweep `storage-and-gc.md`'s. This spec owns when, where, how many
  times and with what guarantees a job runs, never its body. Excluded because a runner that knows
  what its jobs do is a second copy of every shared layer.
- **A separate worker deployment.** Pulp ships API and worker processes; Harbor a jobservice.
  Here every server process runs workers by default and `async.workers: 0` turns one into an
  enqueue-only replica (the resolved topology question below). Excluded because a second binary
  is a second deployment story `deployment.md` would have to carry for a benefit configuration
  already gives; its "Roles" table and Helm chart carry the `workers: 0` recipe instead.
- **Cross-instance replication of jobs.** A job belongs to the instance's database; a follower
  has its own queue (`replication.md`'s follower runs its own sync jobs). Excluded because a
  replicated queue is a distributed scheduler, and `replication.md` settled that followers pull.
- **Handler-visible scheduling hooks.** No method is added to the pinned handler interface
  (`format-handler-interface.md`, "The pinned method set"); a handler's deferred work reaches
  the runner only as a deferred `Operator` kind through `internal/manage`. Excluded because
  `generic.md`'s retention decision already rejected a lifecycle hook and the re-open owns the
  pin.
- **A CLI.** No `worker` subcommand and no management subcommands, per `management-api.md`'s
  resolved CLI stance; the queue is administered through the API.

## Design

### Prior art: what is taken and what is rejected

Fetched this run; each claim below is from the cited page.

- **River** (`riverqueue.com/docs`, `brandur.org/river`): jobs live in PostgreSQL and are
  inserted transactionally, so "when a worker picks up a job, it can rely on the fact that any
  data it depends on was already committed along with the job itself"; the argument names the
  four failure modes a non-transactional queue has (a job seeing uncommitted data, a job
  surviving a rollback, a crash between commit and enqueue losing the job, jobs against partial
  state). Maintenance is by a leader-elected client: a rescuer for stuck jobs (default one hour),
  a cleaner (completed 24 h, cancelled 24 h, discarded 7 d), a scheduler moving delayed and
  retryable jobs to available every 5 s, a periodic enqueuer, a reindexer. Unique jobs use "a
  special partial unique index" and prevent duplicate insertion, "not duplicate executions".
  Retries default to 25 attempts at `attempts ^ 4 + rand(±10%)` seconds, spanning three weeks.
  Cancellation of a running job is cooperative: "Go does not provide a mechanism to interrupt a
  running goroutine". **Taken:** transactional enqueue, the partial-unique-index technique for
  coalescing, a leader-elected maintenance role, cooperative cancellation, `LISTEN`/`NOTIFY`
  wake-up with a polling fallback. **Rejected:** River itself as a dependency (the resolved
  queue-implementation question below): its job row would be a second record beside `Operation`
  with its own state machine and its own migrations, its retention and retry defaults are wrong
  for a write whose bytes are under a grace clock, and the fault-injection suite needs hooks at
  every phase a library hides.
- **Pulp** (`pulpcore/tasking/worker.py`): workers claim with `UPDATE core_task SET app_lock_id
  = ... WHERE pulp_id IN (SELECT ... FOR UPDATE SKIP LOCKED)`, tasks declare exclusive and
  `shared:` resources and are unblocked only when no conflicting resource is held, workers
  heartbeat and `handle_unblocked_tasks()` marks a `RUNNING` task without a lock `FAILED` with
  "Worker has gone missing", cancellation travels by `NOTIFY` on `pulp_worker_cancel` and
  wake-up by `pulp_worker_wakeup`, and the API answers 202 with a task href. **Taken:** SKIP
  LOCKED claims, resource exclusivity declared on the job, the missing-worker rule turned into
  a lease. **Rejected:** failing a task whose worker vanished; here a lost lease is a retry, and
  the fenced completion (below) makes that safe where Pulp's design has to fail it.
- **Harbor jobservice** (`src/jobservice/README.md`): Redis-backed, `Generic`, `Scheduled` and
  `Periodic` kinds, statuses `pending`, `error`, `success`, `stopped`, `cancelled`, `scheduled`,
  retries to `MaxFails()` (default 4), status hooks, `Stop` and `Cancel` that a job must poll
  through `ctx.OPCommand()`, "only redis supported", "no list jobs function". Harbor's job queue
  dashboard pauses and resumes a queue per job type. **Taken:** pause and resume per kind, a
  small retry ceiling, cancel as a cooperative command. **Rejected:** a second store; a job in
  Redis cannot commit with the snapshot it produces, which is the invariant this spec exists to
  hold.
- **Nexus** (`help.sonatype.com/en/tasks.html`): tasks scheduled `Manual, Once, Hourly, Daily,
  Weekly, Monthly, and Advanced` (cron), with `Last run and Last result`, notification on
  failure. **Taken:** schedule state that survives a restart and a visible last result.
  **Rejected:** cron expressions as the schedule language; every cadence here is either an
  interval or derived from stored state (a document's expiry), and a cron string is an operator
  footgun for a schedule no operator should have to write.
- **Gitea** (`config-cheat-sheet`, `[queue]`): `level` (LevelDB), `channel`, `redis`, `dummy`
  queue types, `MAX_WORKERS` "CpuNum/2 clipped to between 1 and 10", unique queues for `mirror`
  and `repo-archive`. **Rejected:** a process-local queue; two Gitea processes cannot share a
  LevelDB queue, and this registry must run as several processes (topology, below).
- **PostgreSQL** (`sql-select.html`): "With `SKIP LOCKED`, any selected rows that cannot be
  immediately locked are skipped", which "provides an inconsistent view of the data, so this is
  not suitable for general purpose work, but can be used to avoid lock contention with multiple
  consumers accessing a queue-like table". That is exactly the use here and nowhere else.
- **AIP-151**: "A good rule of thumb is 10 seconds"; "Operations that fail during their
  execution phase must return an error response ... placed in the `Operation.error` field".
  `management-api.md` already took both; this spec inherits them.

### One queue

Every deferred or scheduled activity the sibling specs name runs on this one queue (the resolved
one-queue question below). The reason is not economy of code but of guarantees: each consumer
needs the same four things, transactional enqueue, at-most-once effect across crashes, bounded
concurrency with a shutdown path, and a durable schedule; the sibling specs each describe a
private worker with those properties in their own words (`verify.workers`, the cadence scheduler,
scan retries, transfer resume), and four private implementations of one durability story is the
constitution's "concurrency and durability have no client-level oracle" hazard multiplied by
four. The consumers and their jobs:

| Consumer | Kind (as the owning spec now names it) | Trigger | Keys | Finish writes |
|---|---|---|---|---|
| `management-api.md` deferred `Apply` | `manage.apply` | `Submit` of a kind the handler declared deferred; enqueued in the transaction that inserts the `pending` `Operation` | none by default; a handler may declare an exclusivity key of the repository | the snapshot, the `Operation` terminal transition, retirements, the audit line |
| `signing-service.md` virtual merge (its AC19, AC34, AC35) | `index.merge` | the metadata store's pre-commit hook on a member write, in the member's write transaction; once at a virtual's creation and once per change of its member list, in the transaction making it (`repository-lifecycle.md`; its resolved virtual-freshness decision, was Q15 there); and a remote member's adoption of a new upstream revision, through the hook registered on `proxy-cache.md`'s adoption commit, in the adoption transaction, for every virtual listing the remote (its resolved remote-member decision, was Q16 there); `run_at` now plus `index.virtual_merge_window` | coalesce key `virtual:{repository}`; exclusivity key the same | the virtual's current-document swap and the document-only transition of its default pointer (no snapshot) |
| `signing-service.md` cadence re-sign (its AC22, AC33) | `signing.resign` | a `Schedule` per signed pointer; and, for a repository whose profile declares a repository-scoped pointer document (`hackage.md`'s resolved root-placement decision, was Q16 there), one repository-scoped `Schedule`, the only one that renews that document, as one repository batch across every pointer. Each next run is derived from the stored document's expiry and `signing.resign_at_fraction` and written in `Finish` | per pointer: exclusivity key `pointer:{repository}/{pointer}`; repository-scoped: exclusivity key `repository:{repository}` | `PointerDocument` and `Signature` records (no snapshot); the repository-scoped run re-renders the document on every pointer in one transaction |
| `proxy-cache.md` revalidation of a remote reached only through a virtual (its AC26; `signing-service.md` AC35) | `proxy.revalidate` | `EnqueueRevalidation(ctx, remote)`, called by `signing-service.md`'s `ServeDocument` when it serves a virtual's merged document whose input from the remote is past the remote's TTL (the read path, which commits nothing else), and inside the transaction of a virtual's creation or of a member-list change adding a never-adopted remote; `run_at` now; **no `Schedule` of this kind exists**; nothing is enqueued while `proxy.offline` is set or the remote is `read_only` or deleted | coalesce key `revalidate:{repository}`; exclusivity key the same | nothing of its own: the effect is the adoption its replay commits through `proxy-cache.md`'s adoption transaction, whose hook enqueues `index.merge` there; `Finish` writes only the job's terminal state. A `*upstream.RateLimitError` returns the job to `pending` with `run_at` past its `RetryAfter` (`RetryAt`, below) |
| `artifact-verification.md` re-evaluation (its AC3) | `verify.reevaluate` | the trust-set revision's transaction, one job per repository revision; the worker pages through superseded marks oldest first with a checkpoint per page; bounded by `async.kind_limits` (`verify.reevaluate: 4`) | exclusivity key `verify:{repository}` | verdict rows and cleared superseded marks |
| `artifact-verification.md` refreshes (its AC22) | `verify.tuf_refresh`, `verify.revocation_refresh` | `Schedule`s with periods `verify.sigstore.refresh` and `verify.revocation.refresh`; disabled under `proxy.offline`. The kind names and the key names differ on purpose: a kind is a worker's registered name, a key is a period an operator sets, and `deployment.md`'s two-way check reads only the keys | exclusivity key the kind | the refreshed trust material |
| `supply-chain-policy.md` scan (its AC6) | `policy.scan` | the ingest and cache-commit hooks, in the committing transaction; the kind declares its own retry bound, and an artifact unscanned past `policy.scan.unscanned_alert_after` counts in `policy_unscanned_past_bound` | coalesce key `scan:{digest}` | scan result, component inventory |
| `supply-chain-policy.md` feed sync (its AC16, AC21) | `policy.feed_sync` | one `Schedule` per OSV-schema source (the default feed and each `policy.feed.sources` entry), period `policy.feed.sync_interval`; disabled under `proxy.offline` | exclusivity key `feed_sync:{source}` | that source's advisory rows and re-matched condemnations |
| `replication.md` sync and transfer (its AC23) | `replication.sync` | one `Schedule` per active `ReplicationLink`, period `replication.sync_interval` unless the link sets its own (never below the instance value), and on demand; disabled under `proxy.offline` | exclusivity key `link:{id}`; checkpoint per completed snapshot | applied snapshot range, mirrored pointer moves |
| `generic.md` retention (its resolved retention placement, was Q11 there) | `retention.pass` | one `Schedule` per repository with rules; disabled while the repository is `read_only` or deleted | exclusivity key `repo:{repository}` | one snapshot per pass |
| `storage-and-gc.md` sweep, orphan scan, pruning (its AC26) | `storage.sweep`, `storage.orphan_scan`, `storage.prune` | `Schedule`s at `gc.sweep_interval`, `gc.orphan_scan_interval`, `gc.prune_interval` | exclusivity key the kind | deletion intents, row deletes, pruned snapshots; the sweep additionally holds `internal/db/lock.LockSweep` for its whole run as a second guard |

Three things the table makes visible. Only `manage.apply` backs an `Operation`: every other kind is
system-initiated work with no principal, and `management-api.md` records `Operation`s for
management operations, not for the registry's housekeeping. **The runner gives no job a
principal**: the context it passes to `Work` carries none, whatever the enqueuing request's
caller was; `trace_context` and `request_id` are correlation, never identity, and nothing
authorizes or attributes on them. The one principal a job ever sees is the one
`internal/manage`'s `manage.apply` worker reads from the `Operation` it executes (the
initiating principal the `Operation` already records), never from the runner. For `proxy.revalidate` this is load-bearing, not
tidy: its replay runs below the shared authorizer and is safe only while it carries no principal
and no credential (`auth.md` AC36), so a runner that copied the enqueuing reader's principal into
the job's context would attach one to every replay.

And no row's "Finish writes" column mentions a handler: the runner never calls a handler. Two
consumer workers reach one, each through a door the runner neither holds nor imports.
`manage.apply` calls `internal/manage`, which calls the handler's `Operator.Apply` inside the
write transaction exactly as an inline operation does (`management-api.md`, "Bindings: one
operation, two ways in", resolved dispatch decision). `proxy.revalidate`'s worker, in
`internal/proxy`, dispatches through `format-handler-interface.md`'s replay entry, which the
composition root hands to `internal/proxy` and nothing else (its AC18); the runner never
receives the entry, so no other kind can reach a handler below the authorizer. That is the answer
to the prototype's question 4 from this side: the runner needs no new pinned method because the
callback it needs, `Apply`, is the optional `Operator` interface `management-api.md` already
introduced, and the revalidation replay adds none either.

### The `Job` record and the `Operation`

The queue's unit is a `Job`, a core-owned record of the shared model (`data-model.md`, "Jobs
and schedules", its entity table, AC41; specified here and transcribed there):

- **Identity and kind.** An id; a `kind` string from the registry of workers (below); an
  opaque `args` document the core stores and only the kind's worker parses, in the same spirit
  as every metadata document.
- **State**, monotonic: `pending` (claimable once `run_at` has passed), `running` (leased),
  then exactly one of `completed`, `failed`, `cancelled`. A retry is `pending` again with a
  later `run_at` and `attempts` incremented; there is no separate retryable state, because the
  claim query does not care why a job is waiting.
- **Scheduling fields**: `run_at`, `attempts`, `max_attempts`, `created_at`, `finished_at`,
  `last_error` (a bounded string, never a credential; `auth.md` AC7's leak scan covers it).
- **Lease fields**: `lease_owner` (the worker's instance id), `lease_expires_at`, and
  `lease_token`, a fresh random 128-bit value per claim. The token is the fencing token: every
  write the job makes to itself carries it, and a write with a stale token fails (below).
- **Keys**: `coalesce_key` and `exclusive_key`, both nullable strings, held by two partial
  unique indexes: one over `coalesce_key` where `state = 'pending'`, one over `exclusive_key`
  where `state = 'running'`.
- **References**: an optional `operation` reference (the `Operation` this job executes), an
  optional `repository` reference (the repository whose grace the job holds open, and the
  repository whose deletion cancels it), and a `checkpoint` document the worker may write
  between attempts.
- **Correlation**, set at enqueue and never changed: `trace_context`, the W3C `traceparent` of
  the enqueuing span as a string, nullable when there is none, and `request_id`, the enqueuing
  request's id. The runner starts the job's span with a **link** to `trace_context`, not as a
  child, because a job may run hours later and a parent span cannot stay open; an audit line
  the job emits carries `request_id`, so the audit trail of a deferred `manage.apply` still
  names the request that asked for it (`observability.md` AC16; AC27).
- **Placement.** Not repository content: in no snapshot, untouched by repoint and rollback,
  never a mark root ("Records that are not mark roots" gains a row); pruned after
  `async.job_retention` from `finished_at`, but never before the `Operation` it references is
  pruned, so a poll never finds an `Operation` whose execution record vanished first.

The `Operation` is the client's view and the `Job` the runner's, and they are kept consistent by
construction rather than by reconciliation: the two records for one deferred operation are
written in the same transaction at every transition (insert `pending` with `pending`, claim sets
`running` on both, finish sets the terminal states on both). No code path updates one without
the other; a test enumerates the transitions and asserts the pairing (AC5). `Operation` has a
third terminal state, `cancelled` (the resolved cancellation question below), which
`data-model.md` AC32 and `management-api.md` AC16 admit.

### Enqueue is transactional

`Enqueue(ctx, tx, Job)` takes the caller's transaction and inserts the row in it. There is no
`Enqueue` without a transaction: the failure modes River names (a job seeing uncommitted data, a
job outliving a rollback, a crash between commit and enqueue) are all "enqueue after commit", and
the way to make them impossible is to have no such call. The metadata store's pre-commit hook
(`signing-service.md`'s trigger for the merge), the hook on `proxy-cache.md`'s adoption commit
(the same trigger for a remote member), a virtual's creation and member-list change,
`internal/manage`'s `Submit`, the ingest and cache-commit hooks and the trust-set revision all
already run inside a transaction, so each enqueues in it. One caller decides on a read:
`ServeDocument` serving a virtual's merged document whose remote input is past its TTL, which
calls `proxy-cache.md`'s `EnqueueRevalidation`. The read commits nothing, so there is no data for
the job to see uncommitted and no rollback for it to outlive; the enqueue runs in a transaction
that holds only the job row, still through `Enqueue(ctx, tx, Job)`, and the read is served
whether or not that transaction commits. After commit, the committing connection issues `NOTIFY async_wakeup` with the
kind as payload (PostgreSQL delivers a `NOTIFY` only when its transaction commits), so an idle
worker wakes within milliseconds; a worker that missed the notification finds the job on its next
poll, `async.poll_interval` later. `Enqueue` with a `coalesce_key` uses `INSERT ... ON CONFLICT
DO NOTHING` against the pending-key index and reports whether a row was inserted. `Enqueue`
reads the current span context and request id from `ctx` and writes them to `trace_context`
and `request_id`; a caller with neither (the scheduler's tick) leaves them null.

### Claim: SKIP LOCKED plus a lease

A worker claims in one short transaction:

```
UPDATE job SET state='running', lease_owner=$me, lease_token=$fresh,
  lease_expires_at=now()+$lease, attempts=attempts+1
WHERE id = (SELECT id FROM job
  WHERE kind = ANY($claimable)
    AND ((state='pending' AND run_at <= now())
      OR (state='running' AND lease_expires_at < now()))
  ORDER BY run_at LIMIT 1 FOR UPDATE SKIP LOCKED)
RETURNING *
```

expressed in the store's query layer rather than as literal SQL in the spec's sense; the shape
is what matters. `$claimable` is the set of kinds this process has a registered worker for,
minus the kinds paused in the database (below): a process never claims a job it could not run.
Four properties follow:

- **One holder at a time.** Two workers cannot claim one row: the row lock excludes them and
  `SKIP LOCKED` sends the second to the next row. Across N server processes this is the whole
  mutual exclusion; there is no in-memory registry of who runs what.
- **A lost worker is a late worker, not a failed job.** A `running` row whose lease has expired
  is claimable again (the second `OR` branch), which is the rescuer: no maintenance pass and no
  heartbeat table, only the same claim query. A running worker extends its lease every
  `async.lease / 3` by an `UPDATE ... WHERE id = $id AND lease_token = $token`; if that update
  affects no row, the worker has lost its lease and cancels its own context.
- **Exclusivity by index.** When the claimed job carries an `exclusive_key` and another job with
  that key is `running`, the update violates the partial unique index; the worker catches the
  violation, leaves the row `pending` (the transaction rolled back) and takes the next row.
  Oldest `run_at` first keeps a key's waiters fair. Pulp derives the same effect with an unblock
  pass; the index does it with no pass.
- **An unknown kind is skipped, never failed** (the resolved unknown-kind question below, was
  Q10). During a rolling upgrade or a rollback two binaries share the table
  (`deployment.md`, "Upgrade and rollback policy"): a job enqueued by the newer binary under a
  kind the older one has no worker for is simply outside the older process's `$claimable` and
  stays `pending` until a process that registers the kind claims it. The older process logs the
  unknown kinds it sees at `Start` and whenever the set changes, at warning, and the jobs stay
  visible in `async_jobs{kind,state}` and `async_oldest_pending_age_seconds{kind}`, so a kind
  nobody will ever register surfaces as an aging queue and a `ScheduleOverdue` where it is
  scheduled, not as a failed job and not as a process that refuses to start (AC26).

Workers are `errgroup` goroutines bounded by `async.workers` under the server's context (the go
skill's bounded-concurrency rule, no hand-rolled pool). A worker loop is: wait for `NOTIFY` or
the poll tick, claim, run, repeat; it starts no goroutine of its own beyond the heartbeat, which
the job's context owns.

### Finish: fenced, transactional, exactly once in effect

A worker implements `Work(ctx, *Job) error`. Inside `Work` it may do external work with no
transaction open (fetch from an upstream, call a scanner, sign through a KMS, stream a transfer),
then call `job.Finish(ctx, func(tx) error)` once. `Finish` opens a transaction, runs the caller's
function in it (the snapshot commit through the metadata store, the `Operation` terminal
transition, retirements, verdict rows, the merged-document swap), and in the same transaction
executes `UPDATE job SET state='completed', finished_at=now() WHERE id=$id AND lease_token=$token
AND state='running'`. **If that update affects no row, `Finish` rolls the whole transaction back
and returns `ErrLeaseLost`.** This is the fence: a worker whose lease expired and was reclaimed
by another worker holds a stale token, so its snapshot, its `Operation` transition and everything
else in its function never commit. Combined with the claim rule, a job's effect commits at most
once, whatever the interleaving of crashes, stalls and rescues; and because the effect and the
job's terminal state are one transaction, a job that reads `completed` has its effect and a job
that does not has none. That is `data-model.md` AC32's atomicity ("a fault injected between them
leaves neither") and the prototype's AC9 and AC10, delivered by one mechanism rather than by
care.

A `Work` that returns `nil` without calling `Finish` is finished by the runner with an empty
function, under the same fence. A `Work` that returns an error is classified (next section).
Between attempts a worker may call `job.Checkpoint(ctx, doc)`, an `UPDATE` fenced the same way,
so a re-run resumes rather than restarts (`replication.md` AC3's "resumes from the last completed
snapshot"; `artifact-verification.md` AC3's "none is ever recomputed twice", which holds because
each page of verdicts commits with its checkpoint).

External work before `Finish` is at-least-once, so every kind's `Work` must be idempotent up to
`Finish`: a re-run from any earlier point must commit the same state. Every consumer named above
is by construction: CAS puts are content-addressed, scan results and verdicts are keyed by
digest, a re-sign produces an equivalent record, a transfer resumes from its checkpoint, and
`Apply` runs entirely inside `Finish`. `proxy.revalidate` is the one kind whose whole effect
commits before `Finish`, in `proxy-cache.md`'s adoption transaction, and so outside the fence: a
worker that lost its lease may still adopt. That is safe because the adoption is the one a
direct client's fetch of the same document would commit, under that layer's single-flight and
its rule never to adopt an older revision, and a re-run replays conditionally on the validators
the first run adopted, so it answers `304` and adopts nothing twice. The registry test over kinds asserts it (AC8) rather than
trusting the argument.

### Retry, backoff and permanent failure

An error from `Work` is one of three classes, decided by the worker, not the runner:

- **Permanent**: the worker wraps it with `async.Permanent(err)` (River's `JobCancel` shape).
  The job ends `failed` at once, `last_error` set; a `manage.apply` job's `Operation` ends
  `failed` with the result document the handler returned (a validation refusal inside `Apply`,
  `management-api.md`'s handler-side refusal rule, is permanent by definition).
- **Transient**, everything else: the job returns to `pending` with `run_at = now() + backoff`
  where `backoff = min(async.backoff_base * 2^(attempts-1), async.backoff_cap)` with ±20 %
  jitter, until `attempts = max_attempts`, when it ends `failed` with the last error. Defaults 2
  s base, 15 min cap, 8 attempts: a job gives up after roughly 40 minutes, not River's three
  weeks, because a job holding a repository's grace open (below) must not do so for weeks and
  because a scan or merge that has failed eight times is an alert, not a hope. A kind may declare
  its own `max_attempts` and backoff (`policy.scan` under a refuse-until-scanned repository wants
  more patience and an alert past its bound, `supply-chain-policy.md` AC6).
- **Transient with an earliest retry time**: the worker wraps it with `async.RetryAt(err, at)`
  when the failure itself says when a retry can succeed (the resolved retry-time question below,
  was Q11). The job returns to `pending` with `run_at` the later of `at` and the ordinary backoff,
  and the attempt counts like any other transient one, so `max_attempts` still ends it. Its one
  consumer today is `proxy.revalidate`: a `*upstream.RateLimitError{RetryAfter}` is wrapped with
  its `RetryAfter`, so the job is not claimed again inside the upstream's cool-down, which
  `upstream-adapters.md` caps at the upstream's `limits.cooldown_cap` (default one hour, its
  AC10); a retry inside it would only meet the `Router`'s immediate refusal and burn an
  attempt.

A lease that expires because the worker died counts as an attempt, so a job whose body crashes the
process every time still terminates within `max_attempts * (lease + backoff)`; a job deferred by
`RetryAt` terminates within `max_attempts * (lease + max(backoff_cap, D))`, where `D` is the
longest deferral its worker supplied (at most the upstream's `limits.cooldown_cap` for
`proxy.revalidate`).

### Crash recovery, enumerated

The prototype's AC10 kills the server "at each step"; this spec names the steps and the
recovery for each, so the fault-injection suite has a checklist rather than a hope:

| Killed | State left | Recovery |
|---|---|---|
| Before the enqueuing transaction commits | nothing: no job, no `pending` `Operation`, no 202 was answered | none needed |
| After commit, before `NOTIFY` is delivered | a `pending` job nobody was woken for | claimed at the next poll, `async.poll_interval` at most |
| After claim, during external work | `running` with a live lease | lease expires; any worker reclaims; `Work` re-runs from its checkpoint, idempotent up to `Finish` |
| Inside `Finish`, before commit | `running`, the transaction aborted by the connection loss | same as above; nothing of the aborted transaction exists |
| After `Finish` commits | terminal, effect present | none needed; a worker that restarts sees the row terminal and does nothing |
| While a stale worker (lease reclaimed) reaches `Finish` | the fence rejects it | the stale worker's transaction rolls back; the new holder's commit is the only one |

Bounded time to terminal after any kill: `lease + poll_interval` to reclaim, plus the job's own
duration, per attempt.

### Idempotency, seen from the queue

`management-api.md`'s `Idempotency-Key` is stored on the `Operation`; the queue adds nothing to
the key's storage and two behaviours to its semantics. A repeat "while the first is still
running is refused `operation-outstanding` (409)": from here, "running" means the `Operation`'s
job is not terminal, whatever its state (pending, retrying, running), so a retrying deferred
operation is outstanding, not failed. And a repeat after the job ended `failed` within the
retention window "returns the original response with the original `Operation`", which is the
failed one: the client that wants to retry sends a new key. The queue never re-runs a terminal job.

### Cancellation, pause and resume

- **Cancel** (`management-api.md`'s `POST /api/v1/operations/{id}/cancel` and
  `POST /api/v1/system/jobs/{id}/cancel`; authorized like the poll route, admin for jobs
  without an `Operation`): a `pending` job becomes `cancelled` in one `UPDATE
  ... WHERE state='pending'` and never runs; a `running` job is marked `cancel_requested` and
  `NOTIFY async_cancel` carries its id, the holding worker cancels the job's context, and the
  outcome is whichever commits first: `Finish` (the job completes; the effect stands and the
  client is told `completed`) or the worker's return with `ctx.Err()` (the job ends
  `cancelled`, nothing committed). Never both, by the fence, and never a half effect, by the
  transaction. Cancellation is cooperative, like River's, Harbor's and Pulp's; a `Work` that
  ignores its context is a bug the idempotence test surfaces (AC8 runs each kind under a
  cancelled context and asserts nothing committed). A `manage.apply` job's `Operation` ends
  `cancelled`.
- **Repository deletion cancels the repository's jobs** (`repository-lifecycle.md`, "Deletion"
  step 8, its AC21). The deletion transaction runs the pending-cancel `UPDATE` for every job
  whose `repository` reference names the repository and marks every running one
  `cancel_requested`; the `NOTIFY async_cancel` for each is delivered when the deletion
  commits, exactly as an operator's cancel is. The deletion does not wait for running jobs. A
  running job that reaches `Checkpoint` or `Finish` after the deletion committed finds the
  write transaction refused by `repository.Writable`'s deleted state (the sole write-transaction
  constructor, `storage-and-gc.md` AC25) and ends itself `cancelled` without a write; a job
  whose external work notices the deleted state earlier may return `ctx.Err()` at once. Until
  the job is terminal its grace hold stands (`storage-and-gc.md` AC23), so a half-imported
  artifact's bytes are collected after the job ends, never under it. A `remote`'s pending
  `proxy.revalidate` job names the remote as its repository, so the remote's deletion cancels it
  here, and `EnqueueRevalidation` enqueues nothing for a deleted remote afterwards. Every
  `Schedule` scoped to the repository (its `retention.pass`, its per-pointer and
  repository-scoped `signing.resign` entries, its `replication.sync` links) is disabled in the
  same transaction; a tick that runs before the disable commits enqueues a job the deletion's
  pending-cancel then catches, because both are rows in one database and the tick's enqueue and
  the deletion serialise on them. This is the only place outside `internal/async` that writes a
  job's state, and it does so through the runner's `CancelByRepository(ctx, tx, repo)`, which
  `internal/repository` calls inside its transaction (AC28).
- **Pause and resume a kind** (admin routes in `management-api.md`'s endpoint table): a paused
  kind's jobs are enqueued normally and never claimed (the kind is removed from `$claimable`,
  read from a `paused_kinds` set in the database, not in memory, so every process agrees).
  Running jobs of a paused kind finish. This is Harbor's queue pause and it is also how the conformance harness
  holds the Galaxy import for the prototype's AC8: the case `script` pauses `manage.apply`,
  publishes, polls once and sees unfinished, resumes, and polls to completion. No test-only
  hold exists in the server.

### Coalescing and staleness

`signing-service.md` fixes the merge contract; the queue delivers it with the `coalesce_key`
index and `run_at`. A member write enqueues `index.merge` with key `virtual:{v}` and `run_at =
now() + index.virtual_merge_window`; a second member write inside the window finds the pending
row and inserts nothing, so "merges for one virtual within a coalescing window run once". A write
that lands while the merge is `running` inserts a new pending row (the index covers `pending`
only), because the running merge may have read the member before the write; the exclusivity key
keeps the two from overlapping. The staleness bound `index.virtual_staleness_bound` is then
`window + queue latency + merge duration`, and a job whose start is later than `run_at +
(staleness_bound - window)` is a breach the runner counts and alerts on (AC11). The window is
not extended by later writes: a virtual under continuous writes converges every window rather
than never. A remote member's adoption, a virtual's creation and a member-list change enqueue
through the same key, so they coalesce with member writes into the same pending merge.

`proxy.revalidate` coalesces the same way with `run_at` now: any number of virtual reads while a
remote's revalidation is `pending` insert nothing, and a read while it is `running` inserts one
more pending row, which the exclusivity key holds until the running one ends, so a remote has at
most one revalidation running and one waiting whatever its virtuals' read rate (`proxy-cache.md`
AC26's "exactly one `proxy.revalidate` job per remote however many reads arrive in its window").

### Ordering against the write path, and the GC grace

A deferred `Apply` is an ordinary write in the write path: it opens one write transaction, runs
under the metadata store's revision-token retry (`data-model.md`, "Concurrency"), produces one
snapshot and advances the default pointer like an inline operation. The queue imposes no order
between jobs beyond `run_at`, and two deferred operations on one repository may run concurrently
because each is one snapshot; a handler that needs otherwise declares an `exclusive_key`.
Nothing about a job runs "before" or "after" a request's write except as the database orders
their transactions.

The grace interaction is the prototype's question 5, and this spec answers it in design (the
resolved grace-hold question below) so the prototype verifies rather than discovers: **an
unfinished job that names a repository holds that repository's grace open**, the rule
`storage-and-gc.md` already gives an unexpired upload session ("An unexpired upload session holds
its repository's grace open") and now asserts for jobs too (its AC23, with the queued or
retrying job in its property operation set). The bytes a deferred import will reference were committed to the
CAS before the import ran; `storage-and-gc.md`'s repository-scoped grace protects
committed-but-unreferenced blobs only while the repository is active; a queued import on a
repository nobody else writes to is exactly the "active but silent" shape the session hold was
created for. Every `manage.apply` job carries its `Operation`'s repository; the sweep's grace
computation reads unfinished jobs by repository the way it reads unexpired sessions; a job's
terminal transition releases the hold. This is not a mark root and not a pin: it is a timing
input to the same grace clock, so the root set stays five and `data-model.md`'s "never an
operation-side pin" holds. The accepted cost is that a retrying job keeps its repository's grace
open for up to the retry horizon (about 40 minutes at the defaults), which is why the horizon is
short.

### The scheduler

Periodic work is a `Schedule` record (`data-model.md`, "Jobs and schedules", AC41): `name`,
`kind`, `args`, `interval` or `next_run_at` derived by the kind, `last_run_at`, `last_result`,
`enabled`, and an optional repository reference for the schedules that belong to one repository
(a `retention.pass`, a per-pointer or repository-scoped `signing.resign`, a `replication.sync`),
which is what repository deletion disables. One process at a time runs the scheduler tick, elected by a session-level
advisory lock on a dedicated connection, held for the process's life and re-acquired by another
process within one tick of the holder's connection closing (River's leader election without the
table). The lock is `internal/db/lock.LockScheduler`, from the one constant block
`deployment.md` fixes so that this package and the sweep cannot pick colliding integers; only
that package issues advisory-lock SQL, and its architecture test scans the module for
`pg_advisory` and `pg_try_advisory` to hold it (`deployment.md`, "Multi-replica constraints",
its AC19). Every process with `async.scheduler: true` (the default) is a candidate. The leader
also runs `observability.md`'s state-derived gauge collector, so `async_jobs{kind,state}`,
`async_oldest_pending_age_seconds{kind}` and the other state-derived series are exported by
exactly one process and `sum()` across the fleet equals the database's truth (its AC7).
The tick, every `async.scheduler_interval`, enqueues a job for each schedule whose `next_run_at`
has passed, with `coalesce_key` the schedule name so a missed tick after an outage enqueues one
job, not one per missed interval, and advances `next_run_at` in the same transaction. Kinds that
derive their next run from stored state (the cadence re-sign: "the schedule derives from the
stored documents' expiry, not from a timer in memory") compute it when the job finishes and
write it to the schedule in `Finish`, so a restart mid-schedule loses nothing (AC14 covers
`signing-service.md` AC22's restart case). A repository whose profile declares a
repository-scoped pointer document has, beside its per-pointer `signing.resign` schedules, exactly
one repository-scoped `signing.resign` schedule, exclusivity key `repository:{repository}`,
whose next run derives from that document's expiry; it is the only schedule that renews the
document, so two of its runs never overlap and no per-pointer run mints a version of it
(`signing-service.md` AC33). `proxy.revalidate` has no schedule at all: it is enqueued only by
demand (a virtual's read, creation or member-list change), which is how `proxy-cache.md`'s
resolved signal-detection decision keeps upstreams unpolled, so the tick never enqueues it and
the offline flag below does not need to name it; `EnqueueRevalidation` itself enqueues nothing
under `proxy.offline`. Offline mode (`proxy.offline`, `proxy-cache.md`'s
instance switch) disables the schedules that reach the network (every `policy.feed_sync`, the
two verify refreshes, every `replication.sync`) by a flag the tick reads; a disabled schedule
still advances so it does not burst on re-enable. Schedules are per source and per link where
the owning spec says so: `policy.feed_sync` has one `Schedule` per OSV-schema source with
exclusivity key `feed_sync:{source}` (`supply-chain-policy.md` AC21), and `replication.sync`
one per active link at `replication.sync_interval` or the link's own longer period
(`replication.md` AC23).

### Topology and shutdown

Every server process runs `async.workers` workers and is a scheduler candidate; a process with
`async.workers: 0` enqueues and serves polls but claims nothing, which is how an operator
separates web and worker roles without a second binary (the resolved topology question below).
On shutdown the server cancels the workers' context, each running job sees `ctx.Done()` and may
still call `Finish` within `async.drain_timeout`; a job that does not finish in time is left
`running` and reclaimed elsewhere after its lease, which is exactly the crash path, so shutdown
adds no state a crash could not leave. `testing/synctest` holds the shutdown to "no goroutine
outlives the server's context" (AC23).

### Handler boundary and the no-goroutine rule

Handlers never see the queue. `internal/format` carries no queue interface in `Deps`; a
handler's only route to deferred work is declaring a kind deferred through `Operator`, and the
runner itself has no route to a handler: its workers do, `manage.apply` through
`internal/manage` and `proxy.revalidate` through the replay entry `internal/proxy` alone holds
(`format-handler-interface.md` AC18, `auth.md` AC36). The runner never receives the entry,
does not import `internal/server`, and hands no job a principal, so the queue adds no third way into a handler
and nothing that could authorize one. `write-triggered-services-prototype.md`
AC12 asserts for the vehicle that the handler "starts no goroutine that outlives its request
and imports no queue or scheduler package"; this spec generalises it to every package outside
`internal/async`: no shared layer or handler starts a goroutine that outlives a request, owns a
`time.Ticker` or `time.AfterFunc`, or opens a `LISTEN`. The one exception is the HTTP server's
own accept loop. `signing-service.md`'s cadence scheduler is therefore the `signing.resign`
`Schedule` here (its package shape says so, its AC22 asserts it on this scheduler), and
`artifact-verification.md`'s re-evaluation bound is the per-kind concurrency limit
`async.kind_limits` (`verify.reevaluate: 4`) rather than a private pool (`deployment.md`'s
resolved worker-limit decision, was Q11 there).

### Both paths

The runner does not know what a repository is. It carries a repository reference for the grace
hold and nothing else; it has no branch on `local`, `remote` or `virtual`, imports no handler and
no proxy package, and `policy.scan` of a cached artifact, `verify.reevaluate` of a proxied
verdict, `index.merge` over a virtual whose members are remotes and `proxy.revalidate`, the
proxied path's own kind, run through the same claim, lease and fence as a hosted publish (AC17). The proxied path's asynchronous work is therefore
covered by construction, and the architecture test that holds the import graph is what proves
"by construction" rather than asserts it.

### Configuration and CLI stance

Per the `cobra-viper` skill: keys under `async.` with defaults, bound to
`STACKWEAVER_REGISTRY_ASYNC_*`, unmarshalled into a typed `async.Config` the package receives in
its constructor; the `serve` command wires the runner. `deployment.md` carries the two root
flags that touch this package (`--workers` for `async.workers`, `--no-scheduler` for
`async.scheduler: false`) and no subcommand. The table is in the three-column shape its
`scripts/check-config-keys.js` parses, and that check holds this table and the schema equal in
both directions.

| Key | Default | Meaning |
|---|---|---|
| `async.workers` | `8` | Worker goroutines in this process; `0` makes it enqueue-only |
| `async.kind_limits` | `{verify.reevaluate: 4}` | Per-kind concurrency ceilings across this process's workers (the re-evaluation bound `artifact-verification.md` once keyed separately) |
| `async.poll_interval` | `5s` | Claim attempt cadence when no `NOTIFY` arrives |
| `async.lease` | `60s` | Lease length; heartbeat at a third of it |
| `async.max_attempts` | `8` | Default attempts before `failed`; a kind may override |
| `async.backoff_base` | `2s` | First retry delay; doubles per attempt with ±20 % jitter |
| `async.backoff_cap` | `15m` | Longest retry delay |
| `async.drain_timeout` | `30s` | How long shutdown waits for running jobs to `Finish` |
| `async.job_retention` | `168h` (7 days) | How long a terminal job is kept, never shorter than its `Operation`'s retention |
| `async.scheduler` | `true` | Whether this process may be elected to run the scheduler tick |
| `async.scheduler_interval` | `10s` | Scheduler tick |

`index.virtual_merge_window` and `index.virtual_staleness_bound` stay `signing-service.md`'s
keys, read by that spec's enqueuing code; `management.operation_retention` stays
`management-api.md`'s and bounds `async.job_retention` from below. `deployment.md`'s key
inventory carries the eleven keys, its "Roles" table the `workers: 0` web-replica recipe, and
its chart a second Deployment of the same image for the worker role.

### Package shape

`internal/async`: `Runner` (constructed with `Config`, a `*pgxpool.Pool`, the `slog.Logger`
and the `telemetry` handle; `Start(ctx)`, `Enqueue(ctx, tx, Job)`, `Cancel`,
`CancelByRepository(ctx, tx, repo)`, `Pause`, `Resume`, `List`), `Job` with `Finish` and
`Checkpoint`, the `Worker` interface (`Work(ctx, *Job) error`, one method, declared here because
the runner is its only consumer), `Permanent(err)`, `RetryAt(err, at)`, `ErrLeaseLost`, and
`Schedule`. Kinds
register in the server's constructor: `runner.Register(kind, worker)`; `Start` logs, at warning,
every kind found in the table that no worker registered and claims none of them (the resolved
unknown-kind decision, was Q10). The scheduler lock is taken through
`internal/db/lock.LockScheduler`; this package issues no advisory-lock SQL of its own.
`internal/manage` implements the `manage.apply` worker and `internal/proxy` the
`proxy.revalidate` worker; each other consumer package implements its own worker against
`async.Worker`. The queries live with the shared metadata store's
schema, since the records are `data-model.md`'s. No third-party queue library (the resolved
queue-implementation question below); `golang.org/x/sync/errgroup` and `pgx` are the
dependencies.

### Mechanical enforcers

Per the constitution, every boundary this spec introduces names the test that holds it:

| Boundary | Enforcer |
|---|---|
| No handler package (`internal/format/<name>/**`) imports `internal/async`; no package outside `internal/async` imports a queue library or issues `LISTEN` | `internal/async/arch_test.go` (import graph, module-wide) |
| No package outside `internal/async` and the HTTP server starts a goroutine that outlives a request, owns a `time.Ticker`/`time.AfterFunc`, or calls `time.Sleep` on a server path | `internal/async/goroutine_test.go` (AST scan with an allowlist naming the accept loop), the shape `write-triggered-services-prototype.md` AC12 uses for one package |
| Every `Enqueue` runs inside a caller transaction | the API has no other signature; `internal/async/api_test.go` asserts by reflection that no exported enqueue path takes a pool |
| Every write a job makes to its own row is fenced by `lease_token` | `internal/async/fence_test.go` (a stale-token worker at every mutation site) |
| The `Operation` and `Job` transition together | `internal/manage/deferred_test.go` (every transition, both records in one transaction, fault before commit leaves neither) |
| Every registered kind is idempotent up to `Finish` and honours cancellation | `internal/async/kinds_test.go`, table-driven over the registry; an unregistered kind fails the test |
| The runner has no repository-type branch and imports no handler or proxy package | `internal/async/arch_test.go` |
| The sweep's grace computation reads unfinished jobs | `internal/storage/gc_property_test.go` (queued job in the operation set, `storage-and-gc.md` AC23) |
| Only `internal/db/lock` issues advisory-lock SQL; this package takes `LockScheduler` through it | `internal/db/lock/arch_test.go` (`deployment.md` AC19), string scan of every `.go` and `.sql` file |
| No package outside `internal/async` writes a job's state except through `CancelByRepository` inside the deletion transaction | `internal/async/arch_test.go` (no SQL against the job table outside the package; the one exported write path named) |
| The runner gives no job a principal and never holds the revalidation replay entry | `internal/async/kinds_test.go` (for every registered kind, the context `Work` receives carries no principal although the job was enqueued under an authenticated request); `internal/async/arch_test.go` (the package imports neither `internal/server` nor `internal/auth`); the entry's single recipient is `format-handler-interface.md`'s `internal/server/arch_test.go` (its AC18) |
| `proxy.revalidate` has no `Schedule` and is enqueued only through `EnqueueRevalidation` | `internal/proxy/revalidate_job_test.go` (`proxy-cache.md` AC26: no `Schedule` of the kind exists after virtual creation, reads and member changes; offline, `read_only` and deleted remotes enqueue nothing) |

### Fault injection, property and benchmark tests

Conformance sees a poll succeed; it cannot see whether the work was deferred, whether a crash
lost it, or whether two workers ran it. The suite below is therefore the oracle for this spec,
as `storage-and-gc.md`'s is for the sweep:

- **Fault points**, injectable in tests through a hook the runner exposes only under a test
  build tag: after enqueue commit, after claim, mid-`Work`, before `Finish` commit, after
  `Finish` commit, at heartbeat, at lease expiry with the original worker still running. AC6
  kills at each.
- **Property suite** (`internal/async/property_test.go`, under `testing/synctest` with an
  injected clock and N simulated processes sharing one PostgreSQL): random interleavings of
  enqueue (with and without keys), claim, heartbeat, transient, permanent and `RetryAt`
  failures, clock advance past lease, process kill,
  cancel, pause and resume, shutdown and restart, scheduler ticks; invariants checked after
  every step: at most one live lease per job; at most one `running` per `exclusive_key`; at
  most one `pending` per `coalesce_key`; every effect committed at most once (each simulated
  `Work` appends its job id to a table inside `Finish`; duplicates fail); a terminal job's
  effect present and a non-terminal job's absent; every job terminal within
  `max_attempts * (lease + max(backoff_cap, D))`, `D` the longest `RetryAt` deferral generated
  for it (zero when none); every `Operation` state equal to its job's; a paused
  kind never claimed; a schedule enqueues once per elapsed period however many ticks were
  missed.
- **Benchmarks as CI gates** (`internal/async/bench_test.go`): claim latency p99 under 50 ms
  and 1,000 jobs/s sustained on one process with 8 workers against a local PostgreSQL, and no
  growth of the `job` table's dead-tuple count across a run that enqueues and prunes 100,000
  jobs (River's bloat lesson).

## Acceptance Criteria

Each criterion is independently testable, states an observable outcome, and is checked off
during implementation with evidence.

- [ ] AC1: A job enqueued inside a transaction that rolls back never exists, one enqueued inside
      a transaction that commits is claimed by an idle worker within one second when `NOTIFY` is
      delivered and within `async.poll_interval` when it is not, and no exported path enqueues
      outside a caller's transaction: `Enqueue(ctx, tx, Job)` is the only signature.
- [ ] AC2: Across N server processes sharing one database, no job is held by two live leases at
      any instant (the claim is one `SELECT ... FOR UPDATE SKIP LOCKED` ordered by `run_at`), and
      a `running` job whose lease expires is reclaimed by another worker within
      `async.lease + async.poll_interval`, with `attempts` incremented and a fresh `lease_token`.
- [ ] AC3: A worker whose lease was reclaimed cannot commit: its `Finish` rolls back the whole
      transaction, commits no snapshot, no `Operation` transition, no checkpoint and no
      verdict, and returns `ErrLeaseLost`, while the reclaiming worker's `Finish` commits once.
- [ ] AC4: A job's effect, its `Operation`'s terminal transition and its own terminal state are
      one transaction: a fault injected at any point before that commit leaves none of the
      three, and no interleaving produces a snapshot whose operation reads unfinished, a
      `completed` operation with no snapshot, or a `completed` job with no effect.
- [ ] AC5: A management kind declared deferred is executed on the runner: `Submit` inserts the
      `pending` `Operation` and its `manage.apply` job in one transaction and answers 202; the
      claim moves both to `running` in one transaction; `Apply` runs inside `Finish` and its
      snapshot, retirements and audit line commit with both terminal states; a permanent error
      ends both `failed` with the handler's result document and no snapshot; the poll and
      cancel routes are refused `not-found` to a principal lacking the originating write's
      authorization.
- [ ] AC6: A server killed at each named fault point (after enqueue commit, after claim, mid-work,
      before `Finish` commit, after `Finish` commit, and with a stale worker still running after
      its lease was reclaimed) leaves, after restart, the job terminal within `async.lease +
      async.poll_interval` plus one attempt's duration, its effect applied exactly once, and its
      `Operation` matching it; the Galaxy-shaped deferred import of
      `write-triggered-services-prototype.md` AC10 is one instance.
- [ ] AC7: A transient error from `Work(ctx, *Job) error` returns the job to `pending` with
      `run_at` set to `backoff_base * 2^(attempts-1)`
      capped at `backoff_cap` with jitter, until `max_attempts`, when it ends `failed` with
      `last_error` set; an error wrapped `Permanent` ends it `failed` at once with no retry; an
      error wrapped `RetryAt(err, at)` returns it to `pending` with `run_at` the later of `at`
      and the ordinary backoff, never claimable before `at`, counted as an attempt, so it still
      ends `failed` at `max_attempts`; a kind's own `max_attempts` and backoff override the
      defaults; and `last_error` never contains a credential.
- [ ] AC8: For every registered kind, `Work` interrupted after its external effects and before
      `Finish` and then re-run from the same starting state commits state identical to a single
      uninterrupted run, and `Work` under a cancelled context commits nothing; the test is
      table-driven over the runner's registry and fails for a kind with no case.
- [ ] AC9: Cancelling a `pending` job ends it `cancelled` and it never runs; cancelling a
      `running` job cancels the worker's context and the job ends either `completed` with its
      full effect or `cancelled` with none, never both and never a partial effect; the
      `Operation` of a `manage.apply` job mirrors the outcome, including the `cancelled` state.
- [ ] AC10: Pausing a kind stops every process from claiming its jobs while running ones finish,
      enqueue continues, resuming makes the accumulated jobs claimable oldest first, and a
      paused `manage.apply` holds a real `ansible-galaxy collection publish`'s import so that
      the first poll answers unfinished and the poll after resume answers finished
      (`write-triggered-services-prototype.md` AC8's hold, with no test-only code in the server).
- [ ] AC11: N member writes to a virtual repository inside `index.virtual_merge_window` produce
      exactly one `index.merge` run (one `pending` row per `coalesce_key`); a member write during a running merge produces exactly one
      more pending merge; every member write is visible in the virtual's documents within
      `index.virtual_staleness_bound`; a merge starting later than the bound allows is counted
      and alerted; and no merge runs on a request's path (`signing-service.md` AC19 on the
      production runtime). The same key coalesces every other trigger: a virtual's creation and
      each change of its member list enqueue a merge in the transaction making the change, and a
      remote member's adoption of a new upstream revision enqueues one for every virtual
      listing the remote inside the adoption transaction, so a merge job exists exactly when the
      adoption commits (none when it rolls back), and the adopted change is visible in each
      virtual within the staleness bound (`signing-service.md` AC34, AC35).
- [ ] AC12: At most one job per `exclusive_key` is `running` at any instant across all
      processes, waiting jobs with that key run oldest first, and none waits forever while the
      key is free.
- [ ] AC13: An unfinished job naming a repository holds that repository's grace open: a sweep
      forced with an injected clock past the grace period while a deferred import is pending or
      retrying collects none of the digests the import will reference, the import then commits
      and the collection installs (`write-triggered-services-prototype.md` AC11), and the hold
      releases when the job becomes terminal, with the mark-root set unchanged at five.
- [ ] AC14: Exactly one process runs the scheduler tick (`async.scheduler_interval`) at any
      instant across N processes, holding `internal/db/lock.LockScheduler` on a dedicated
      connection, a new leader is elected within one tick of the old one's connection closing
      and a process with `async.scheduler: false` is never elected, the leader and only the
      leader exports the state-derived gauges (`observability.md` AC7), a schedule whose
      `next_run_at` passed several times during an outage enqueues one job, the cadence re-sign's
      next run is derived from the stored document's expiry and survives a restart mid-schedule
      with no re-sign lost or duplicated (`signing-service.md` AC22 on the production scheduler),
      a repository declaring a repository-scoped pointer document has exactly one
      repository-scoped `signing.resign` schedule, whose runs hold exclusivity key
      `repository:{repository}` so no two overlap, beside its per-pointer schedules under
      `pointer:{repository}/{pointer}` (`signing-service.md` AC33), and repository deletion
      disables both, `policy.feed_sync` runs one schedule per source under `feed_sync:{source}` and
      `replication.sync` one per link at `replication.sync_interval` or the link's own period,
      and `proxy.offline` disables every network-reaching schedule (each `policy.feed_sync`, the
      verify refreshes, each `replication.sync`) without bursting on re-enable.
- [ ] AC15: A `verify.reevaluate` job pages through superseded marks oldest first with a
      checkpoint per committed page, so after a kill and rescue no verdict is recomputed twice
      and none is skipped (`artifact-verification.md` AC3 on the production runner), bounded by
      `async.kind_limits`.
- [ ] AC16: No handler package imports `internal/async`, no package outside `internal/async`
      imports a queue library or issues `LISTEN`, and no package outside `internal/async` and the
      HTTP server's accept loop starts a goroutine that outlives a request or owns a
      `time.Ticker` or `time.AfterFunc`, each held by an architecture test that fails on a
      violation fixture.
- [ ] AC17: The runner has no branch on repository type and imports no handler or proxy package,
      and a scan of a cached (proxied) artifact, a re-evaluation of a proxied verdict and a merge
      over a virtual of remote members run through the same claim, lease and fence as a hosted
      deferred publish, proven by the same fault-injection cases on both.
- [ ] AC18: A terminal job is pruned after `async.job_retention` and never before the
      `Operation` it references is pruned; an unfinished job is never pruned; and after a job is
      pruned its `Operation` still reads with its terminal state.
- [ ] AC19: `Job` and `Schedule` are records of the shared model, and no consumer package
      creates a table, queue or schedule store of its own: the module has exactly one claim
      query, in `internal/async`.
- [ ] AC20: The package exports, under `observability.md`'s catalogue names, `async_jobs{kind,state}`,
      `async_oldest_pending_age_seconds{kind}`, `async_job_duration_seconds{kind,outcome}`,
      `async_jobs_total{kind,outcome}`, `async_retries_total{kind}`,
      `async_lease_expiries_total{kind}`, `async_scheduler_leader`,
      `async_schedule_last_run_timestamp_seconds{schedule}`,
      `async_schedule_period_seconds{schedule}` and `async_worker_slots{state}`, and the
      merge worker `index_virtual_merge_staleness_breaches_total`; and through
      `telemetry.Alert` a job ending `failed` raises `JobFailed`, a schedule idle for twice its
      period raises `ScheduleOverdue`, a staleness breach raises `VirtualMergeStalenessBreach`,
      and a fleet with no leader for five minutes shows on `SchedulerLeaderless`, each exactly
      once per driving scenario, so that no job can fail silently.
- [ ] AC21: Listing jobs (filterable by kind, state and repository), cancelling a job, and
      pausing and resuming a kind are admin routes under the `api` mount present in the OpenAPI
      document, refused `not-found` to non-admins under the existence oracle, and each leaves
      one audit line.
- [ ] AC22: Every `async.*` key has a default, binds to its `STACKWEAVER_REGISTRY_ASYNC_*`
      variable, and reaches the runner as a typed `Config`; the eleven keys tabled here and the
      schema's `async.` keys are equal in both directions under `scripts/check-config-keys.js`;
      `async.workers: 0` runs no worker in that process while `Enqueue`, polls and the operator
      routes still work; and `async.job_retention` shorter than
      `management.operation_retention` is refused at startup.
- [ ] AC23: On shutdown every running job's context is cancelled, a job that calls `Finish`
      within `async.drain_timeout` commits whole, one that does not is left `running` and
      reclaimed elsewhere after its lease, and no goroutine of the runner outlives the server's
      context under `testing/synctest`.
- [ ] AC24: The randomized interleaving suite (enqueue with and without keys, claim, heartbeat,
      transient, permanent and `RetryAt` failures, lease expiry, process kill, cancel, pause and resume, shutdown and restart, scheduler
      ticks, over N simulated processes on an injected clock) holds every invariant named in
      "Fault injection, property and benchmark tests" for every generated history, and is in
      `make verify`.
- [ ] AC25: Claim latency p99 stays under 50 ms and sustained throughput at or above 1,000 jobs/s
      on one process with eight workers against a local PostgreSQL, and the `job` table's
      dead-tuple count does not grow across an enqueue-and-prune run of 100,000 jobs, as
      benchmark gates.
- [ ] AC26: A process never claims a job of a kind it has no registered worker for and never
      fails one: with two processes on one database, one registering a kind the other does not,
      every job of that kind is claimed only by the registering process, stays `pending` (never
      `failed`, never `running` on the other) while only the non-registering process runs, is
      counted in `async_jobs{kind}` and `async_oldest_pending_age_seconds{kind}` meanwhile, and
      the non-registering process starts, logs the kind at warning, and serves everything else.
- [ ] AC27: `Enqueue` under a request records that request's `traceparent` as `trace_context`
      and its id as `request_id` on the `Job`, the scheduler's enqueues leave both null, the
      job's span carries a link to the enqueuing span and is not its child, and an audit line
      emitted from the job carries the originating `request_id` (`observability.md` AC16).
- [ ] AC28: Deleting a repository, with a pending, a retrying and a running job naming it and a
      `retention.pass` schedule scoped to it, moves the pending and retrying jobs to
      `cancelled` in the deletion transaction (never run afterwards), delivers the cooperative
      cancel to the running one, which ends `cancelled` with nothing committed at its next
      `Checkpoint` or `Finish` because the write transaction is refused on the deleted state,
      disables the schedule so no later tick enqueues for it, keeps the grace hold until the
      running job is terminal and releases it then (`storage-and-gc.md` AC23), and the
      deletion request returns without waiting for the running job (`repository-lifecycle.md`
      AC21).
- [ ] AC29: `proxy.revalidate` runs on the queue as `proxy-cache.md` AC26 requires: any number
      of reads of a virtual whose merged input from one remote is past that remote's TTL, while
      that remote's revalidation is `pending`, leave exactly one `pending` row under
      `revalidate:{repository}`, and reads while it is `running` add exactly one more, which is
      not claimed until the running one ends; each read is served without waiting on the
      enqueue; a virtual's creation or a member-list change adding a never-adopted remote
      enqueues the job exactly when its transaction commits; no `Schedule` of the kind exists
      and no scheduler tick enqueues one; while `proxy.offline` is set, or with the remote
      `read_only` or deleted, `EnqueueRevalidation` inserts no row, a pending job ends terminal
      with no upstream request, and the remote's deletion cancels its pending job in the
      deletion transaction; a replay meeting a `*upstream.RateLimitError` returns the job to
      `pending` with `run_at` no earlier than its `RetryAfter` and no upstream request is made
      for the remote before then; and a replay that adopts a new revision leaves an
      `index.merge` row for every virtual listing the remote, committed with the adoption.
- [ ] AC30: No job receives a principal from the queue: for every registered kind, the context
      passed to `Work` carries no principal and no credential although the job was enqueued
      under an authenticated request, and a `proxy.revalidate` replay therefore reaches the
      replay entry with none (`auth.md` AC36, `format-handler-interface.md` AC18); the runner
      never holds the replay entry and does not import `internal/server`; and a failed
      `proxy.revalidate` job's `last_error`, and every log line the runner emits for it, carry
      no byte of the replayed response.

## Test Plan

Every acceptance criterion maps to at least one test.

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | integration + unit | `internal/async/enqueue_test.go` (rollback, commit, `NOTIFY` and poll latency with an injected clock); `internal/async/api_test.go` (no pool-taking enqueue path) |
| AC2 | property | `internal/async/property_test.go` (lease invariant over N processes; reclaim bound) |
| AC3 | integration + fault injection | `internal/async/fence_test.go` (stale token at `Finish`, `Checkpoint`, heartbeat) |
| AC4 | integration + fault injection | `internal/manage/deferred_test.go` (fault before commit at each site; pairing of `Operation` and `Job`) |
| AC5 | integration + conformance | `internal/manage/deferred_test.go`; `conformance/ansible/deferred_publish_test.go` (real client, 202 then poll; unauthorized poll) |
| AC6 | integration + fault injection | `internal/async/crash_test.go` (process kill at each fault point, restart, invariants); `internal/format/ansible/deferred_crash_test.go` (the prototype's instance) |
| AC7 | unit + integration | `internal/async/retry_test.go` (backoff schedule on an injected clock, permanent class, `RetryAt` later-of rule and attempt counting, per-kind override, credential leak scan of `last_error`) |
| AC8 | integration | `internal/async/kinds_test.go` (table over the registry: interrupt-and-rerun, cancelled context) |
| AC9 | integration + property | `internal/async/cancel_test.go` (pending, running-then-finish, running-then-return); `internal/async/property_test.go` (never both) |
| AC10 | integration + conformance | `internal/async/pause_test.go` (multi-process pause visibility); `conformance/ansible/deferred_publish_test.go` (`script` pauses, polls, resumes) |
| AC11 | integration + fault injection | `internal/index/virtual_merge_test.go` on the production runner (coalescing count, running-then-write, staleness bound and breach alert, no merge on a request goroutine; creation and member-list change enqueue under the same key); `internal/index/virtual_remote_member_test.go` (shared with `signing-service.md` AC35: adoption enqueues in its transaction, an adoption rolled back by an injected fault leaves no job) |
| AC12 | property | `internal/async/property_test.go` (exclusive-key invariant, fairness, liveness) |
| AC13 | integration + property | `internal/storage/pending_operation_gc_test.go` (forced sweep past grace with a pending and a retrying import; shared with `storage-and-gc.md` AC23); `internal/storage/gc_property_test.go` (queued job in the operation set) |
| AC14 | integration | `internal/async/scheduler_test.go` under `testing/synctest` (leader death and election through `LockScheduler`, `scheduler: false` never elected, leader-only gauge export through `telemetry.NewTestRecorder`, missed periods, per-source and per-link schedules, restart mid-schedule, `proxy.offline` flag); `internal/db/lock/singleton_test.go` (shared with `deployment.md` AC19: holder kill and hand-over bound); `internal/signing/cadence_test.go` (expiry-derived next run; the one repository-scoped schedule beside the per-pointer ones, shared with `signing-service.md` AC33's `repository:{repository}` exclusivity); `internal/policy/feed_sync_test.go` and `internal/replication/sync_job_test.go` (the owning specs' schedule shapes) |
| AC15 | integration + fault injection | `internal/verify/trust_revision_test.go` on the production runner (kill mid-page, rescue, no double recompute, kind limit) |
| AC16 | architecture test | `internal/async/arch_test.go` (import graph); `internal/async/goroutine_test.go` (AST scan with allowlist and violation fixture) |
| AC17 | architecture test + integration | `internal/async/arch_test.go`; `internal/async/crash_test.go` (same cases over `policy.scan` of a cached digest, `verify.reevaluate` of a proxied verdict, `index.merge` over remote members) |
| AC18 | integration | `internal/async/prune_test.go` (injected clock; job and `Operation` retention ordering) |
| AC19 | architecture test | `internal/async/arch_test.go` (one claim query site; no DDL or queue store outside the shared schema) |
| AC20 | integration | `internal/async/metrics_test.go` (each series by catalogue name and each alert once under a driven scenario, through `telemetry.NewTestRecorder`; the `observability.md` AC6 and AC18 rows for this package); `internal/index/virtual_merge_test.go` (the staleness-breach counter and alert) |
| AC21 | integration | `internal/manage/jobs_routes_test.go` (admin and non-admin, OpenAPI presence, audit line) |
| AC22 | unit + integration + script | `internal/async/config_test.go` (defaults, env binding, typed struct, `workers: 0` behaviour, retention refusal); `scripts/check-config-keys.js` under `make verify` (`deployment.md`'s two-way check over this table) |
| AC23 | integration | `internal/async/shutdown_test.go` under `testing/synctest` (drain, late job reclaimed, no leaked goroutine) |
| AC24 | property | `internal/async/property_test.go`, run by `make verify` |
| AC25 | benchmark | `internal/async/bench_test.go` (latency, throughput, dead tuples), gated in CI |
| AC26 | integration | `internal/async/unknown_kind_test.go` (two processes with different registries: claim set, `pending` retained, gauges, warning log through `telemetry.NewTestRecorder`, `Start` succeeds) |
| AC27 | integration | `internal/async/trace_link_test.go` (enqueue under a request and from the scheduler, span link, audit `request_id`; the `observability.md` AC16 row) |
| AC28 | integration + fault injection | `internal/repository/delete_test.go` (shared with `repository-lifecycle.md` AC21: pending, retrying and running jobs, the scoped schedule, no wait); `internal/async/cancel_test.go` (`CancelByRepository` inside a transaction; running job refused at `Checkpoint` and `Finish` on the deleted state; grace hold released at terminal, shared with `storage-and-gc.md` AC23); `internal/retention/schedule_test.go` (shared with `generic.md` AC17: the repository's `retention.pass` schedule disabled on deletion, exclusivity under two runners, lost-lease commit refused) |
| AC29 | integration + fault injection | `internal/proxy/revalidate_job_test.go` on the production runner (shared with `proxy-cache.md` AC26: read bursts while pending and while running, creation and member-change enqueue with and without commit, no `Schedule` and no tick enqueue, offline, `read_only` and deleted remotes, `RetryAt` past `RetryAfter` with a network-layer zero-request assertion until then, the `index.merge` row committed with the adoption); `internal/async/cancel_test.go` (the remote's deletion cancels its pending job through `CancelByRepository`) |
| AC30 | integration + architecture test | `internal/async/kinds_test.go` (for every registered kind, `Work`'s context carries no principal and no credential after an enqueue under an authenticated request); `internal/async/arch_test.go` (no import of `internal/server`); `internal/proxy/revalidate_job_test.go` (a failing replay whose response body carries a marker string: the marker absent from `last_error` and from every log record through `telemetry.NewTestRecorder`; shared with `auth.md` AC36's discarding-writer case) |

## Implementation Phases

Placement in the charter's build order: the queue core (Phases 1 to 3) at the start of step 4b,
immediately after the step 4a re-open records its finding on the prototype's questions 4 to 6;
the deferred-operation consumer (Phase 4) at step 6a before Ansible collections; the remaining
consumers with their own specs' steps (the resolved build-placement question below).

### Phase 1: The queue core
- `Job` record in the shared schema (`data-model.md` AC41, landed), transactional `Enqueue`
  with `trace_context` and `request_id`, SKIP LOCKED claim over the registered kinds with lease
  and token, heartbeat, fenced `Finish` and `Checkpoint`, retry classes (`Permanent` and
  `RetryAt`) and backoff, lease-expiry rescue, pruning, unknown kinds skipped, no principal in any
  job's context (AC1 to AC4, AC7, AC18, AC26, AC27, AC30)
- `Runner` with bounded workers, `NOTIFY` wake-up and poll fallback, drain on shutdown (AC23)
- Architecture tests and the goroutine scan (AC16, AC19), the fence and crash suites (AC3, AC6)
- Configuration under `scripts/check-config-keys.js` (AC22)

### Phase 2: Keys, cancellation and operator controls
- `coalesce_key` and `exclusive_key` indexes and claim behaviour (AC11's queue half, AC12)
- Cancel, pause and resume with database-held state and `NOTIFY async_cancel` (AC9, AC10);
  `CancelByRepository` (AC28) for `repository-lifecycle.md`'s deletion transaction
- The admin routes through `management-api.md`'s mount (AC21), metrics and alerts under
  `observability.md`'s names (AC20)
- The property suite and benchmarks (AC24, AC25)

### Phase 3: The scheduler
- `Schedule` record, leader election through `internal/db/lock.LockScheduler`, the leader-only
  gauge collector, tick with coalesced catch-up, the `proxy.offline` flag, kind-derived next
  run, repository-scoped schedules disabled at deletion (AC14, AC28's schedule half)
- The first schedules: `storage.sweep`, `storage.orphan_scan`, `storage.prune` (mechanics
  unchanged, `storage-and-gc.md`), `retention.pass`

### Phase 4: The deferred management operation (step 6a)
- `manage.apply` worker in `internal/manage`: paired transitions, `Apply` inside `Finish`,
  permanent-failure mapping to the `Operation` result document, idempotency semantics (AC5,
  AC8 for this kind)
- The repository grace hold, `storage-and-gc.md` AC23's sweep-side half (AC13)
- The Galaxy conformance cases with pause-based hold (AC10)

### Phase 5: Sibling consumers as their steps arrive
- `policy.scan`, `policy.feed_sync` per source (step 4b, with `supply-chain-policy.md`);
  `verify.reevaluate`, `verify.tuf_refresh`, `verify.revocation_refresh` (step 4b, AC15);
  `index.merge` with every trigger, including the adoption hook, and `signing.resign` per pointer
  and per repository (step 7, AC11, AC14's cadence clauses); `proxy.revalidate`, registered with
  `proxy-cache.md`'s Phase 2 once the queue core exists, its first caller arriving with the first
  format whose virtual phase has a `Merge` (AC29); `replication.sync` per link (step 10). Each lands with its kind's row in `kinds_test.go` (AC8) and the
  proxied-path cases where it has one (AC17)

## Tasks

Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. Eleven questions were written in decision shape and adopted under the owner's standing
delegation (nine at authoring, one at the 2026-09-28 reconciliation, one in the 2026-09-28
closing sweep on Opus); each is recorded below and folded through Scope, Design, the criteria
and the Test Plan.

### Resolved: one queue for every deferred and scheduled activity (was Q1)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: one queue serves deferred
management operations, virtual merges, the cadence re-sign, verdict re-evaluation, scans and feed
sync, replication transfers, retention passes and the scheduling of the sweep.

**Recommendation:** A - every consumer needs the same four guarantees and each sibling spec
described a private worker with them in its own words; one implementation of the durability story
is the only one the fault-injection suite can hold.

| Option | You get | It costs |
|---|---|---|
| **A. One queue, every consumer** (adopted) | One durability story, one property suite, one pause/resume surface, one set of metrics; no private goroutines anywhere | Consumers before step 6a need the queue earlier than the charter placed it (the build-placement question); one package everything depends on |
| **B. One queue for client-visible operations, private workers for housekeeping** | Housekeeping ships with its own spec, no dependency on this one | Four private durability implementations, each without the fence; `verify.workers`, the cadence scheduler and scan retries each re-derive rescue and shutdown |
| **C. No queue: everything inline or on a timer** | Nothing to operate | A publish that waits for validation, a merge on the request path, a re-sign lost to a restart: each is a rule a sibling spec already forbids |

**Why this is yours:** it makes one package a dependency of six specs and moves a build step.

Accepted cost: the earlier placement. B lost because a private worker without the fence is exactly
the "passes every test and still eats data" shape the constitution names; C contradicts settled
siblings.

### Resolved: hand-written SKIP LOCKED queue rather than River (was Q2)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: `internal/async`
implements the queue over PostgreSQL directly (SKIP LOCKED claim, lease token, partial unique
indexes, advisory-lock leader), taking River's and Pulp's designs as the reference.

**Recommendation:** A - the invariant that matters (effect, `Operation` and job terminal in one
fenced transaction) is the one a library abstracts away, the `Job` row must be a shared-model
record rather than a second schema with its own migrations, and the suite needs hooks at every
phase.

| Option | You get | It costs |
|---|---|---|
| **A. Own implementation over pgx** (adopted) | The `Job` row is `data-model.md`'s record; fence and fault hooks at every phase; retry and retention defaults fit a grace-clocked write; two dependencies (`pgx`, `errgroup`) | Rescue, leader election, backoff and pruning are ours to write and prove (the property suite does) |
| **B. River** | Mature transactional enqueue, unique jobs, rescuer, cleaner, periodic jobs, `JobCompleteTx` | A second record and state machine beside `Operation`, River's migrations as a second DDL owner, 25-attempt three-week retries and 24 h retention to override, no hook at the phases the crash suite kills, unique jobs that skip insertion rather than coalesce by `run_at` |
| **C. Redis-backed (asynq, Harbor's model)** | Throughput; a familiar operator story | Enqueue and effect in two stores: the exact failure modes River's argument names, and no fence |

**Why this is yours:** it trades a maintained dependency for owned concurrency code, the class of
code this project most fears.

Accepted cost: about two thousand lines of queue code under a property suite. B lost on the
second record and the missing hooks, C on the two stores. The go skill's "don't hand-roll a
worker pool" is honoured: the pool is `errgroup.SetLimit`; what is hand-written is SQL.

### Resolved: the Operation is the client's record, the Job the runner's (was Q3)

**Adopted 2026-09-27 under the owner's standing delegation.** Option B: a `Job` record separate
from `Operation`, paired by a reference and transitioned in the same transaction; only
`manage.apply` jobs have an `Operation`.

**Recommendation:** B - `Operation` is defined by who started it and who may read it (principal,
scope, result document), which system housekeeping has none of, while every job needs lease,
attempt and key fields a client must never see.

| Option | You get | It costs |
|---|---|---|
| **A. Extend `Operation` with the queue fields; every job is an `Operation`** | One record | Housekeeping jobs with no principal in a table authorization gates by principal; lease tokens on a client-visible record; `Operation` pruning at 90 days for a sweep run |
| **B. Separate `Job`, paired and transitioned together** (adopted) | Each record shaped for its reader; pairing proven by one test | Two rows per deferred operation; a `data-model.md` amendment |
| **C. Job only, `Operation` derived at read time** | No pairing | The poll route computes state from queue internals, and the `Operation` `management-api.md` widened to every synchronous operation has no job at all |

**Why this is yours:** it adds a record to the shared model.

Accepted cost: the amendment and one join. Folded into "The `Job` record and the `Operation`",
AC4 and AC5.

### Resolved: an unfinished job holds its repository's grace open (was Q4)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: a job naming a repository
is a grace-holding activity of that repository, as an unexpired upload session already is; the
prototype's AC11 verifies it rather than discovers it.

**Recommendation:** A - `storage-and-gc.md` created exactly this hold for the session case, the
shape is identical (committed bytes awaiting the write that references them), and it adds no
root and no pin, which `data-model.md`'s non-root table forbids.

| Option | You get | It costs |
|---|---|---|
| **A. Grace hold, same rule as an open upload session** (adopted) | No new root; the sweep's grace computation gains one input; a retrying job cannot lose its bytes | A repository with a stuck retrying job is not collectable until the job fails, about 40 minutes at the defaults |
| **B. A sixth mark root: digests a pending job names** | Precise protection | A root set the owner settled at five reopened; a job must enumerate digests the core cannot parse out of an opaque args document |
| **C. Nothing: rely on grace defaulting to hours** | No change | A backlog or an outage longer than grace collects a pending import's bytes; the exact hazard the prototype's question 5 names |

**Why this is yours:** it changes `storage-and-gc.md`'s grace rule, a planned spec un-planned
only for re-review.

Accepted cost: the short retry horizon this forces. Folded into "Ordering against the write
path, and the GC grace", AC13, and the `storage-and-gc.md` consequence.

### Resolved: cancellation is cooperative and adds a `cancelled` terminal state (was Q5)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: pending jobs cancel
immediately, running jobs cooperatively through context, the fence decides races, and
`Operation` gains `cancelled` as a third terminal state.

**Recommendation:** A - every prior-art system is cooperative because Go offers nothing else, and
mapping cancellation onto `failed` would make the client unable to tell a refusal from an
operator's intervention.

| Option | You get | It costs |
|---|---|---|
| **A. Cooperative cancel; `cancelled` terminal state on `Operation`** (adopted) | Honest state; pending cancel is exact; a running cancel is exact by the fence | `data-model.md` AC32 and `management-api.md` AC16 gain a state; each format's poll rendering maps it (Galaxy renders `failed`) |
| **B. Cancel maps to `failed` with a reason in the result document** | No entity change | The result document is handler-written and the core never parses it, so the core would have to write into it; the client cannot distinguish |
| **C. No cancellation** | Nothing to build | A wedged import cannot be cleared except by waiting out retries |

**Why this is yours:** it widens an entity's state set.

Folded into "Cancellation, pause and resume", AC9, and the sibling consequences.

### Resolved: pause and resume per kind is the harness's hold (was Q6)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: an admin pause/resume
per kind, database-held, is both an operator control and the mechanism the prototype's AC8 uses
to hold the Galaxy import until the first poll.

**Recommendation:** A - Harbor's queue pause is the prior art, the control is worth having on
its own (a runaway kind during an incident), and it removes any test-only hold from the server.

| Option | You get | It costs |
|---|---|---|
| **A. Admin pause/resume per kind** (adopted) | One mechanism, real, exercised by the harness | A new admin route pair in `management-api.md` |
| **B. A test-only hold setting in the server** | Nothing on the API | Test code in the production binary, and a case that depends on it proves nothing about the shipped server |
| **C. Make the import slow enough to poll** | No mechanism | Timing-dependent; the exact flake `conformance-harness.md` forbids |

**Why this is yours:** it adds an operator surface.

Folded into "Cancellation, pause and resume", AC10, AC21.

### Resolved: bounded retries with a short horizon (was Q7)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: eight attempts, 2 s base
doubling to a 15 min cap, permanent errors fail at once, kinds may override.

**Recommendation:** A - a job holds a grace clock and an operator's attention; forty minutes of
retry is a transient outage's length, and past it a failure must be an alert, not a hope.

| Option | You get | It costs |
|---|---|---|
| **A. 8 attempts, exponential to 15 min, per-kind override** (adopted) | Terminal within about 40 minutes; grace held briefly | A long upstream outage fails scans and syncs, which retry on their next schedule anyway |
| **B. River's 25 attempts over three weeks** | Time to deploy a fix | Grace held for weeks; a failed import invisible for weeks |
| **C. No retry** | Simplicity | Every transient error is a failed publish |

**Why this is yours:** it sets how long a transient failure hides.

Folded into "Retry, backoff and permanent failure", AC7, the configuration table.

### Resolved: workers in every server process, no separate worker binary (was Q8)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: each server process
runs workers and is a scheduler candidate; `async.workers: 0` makes a process enqueue-only.

**Recommendation:** A - River's model; one binary and one deployment story, with the separation
Pulp and Harbor achieve by process type achieved by a key.

| Option | You get | It costs |
|---|---|---|
| **A. In-process workers, `workers: 0` for enqueue-only replicas** (adopted) | One binary; HA falls out of SKIP LOCKED and the lease | A web replica's latency shares a process with jobs unless the operator sets the key |
| **B. A `worker` subcommand and a separate deployment** | Isolation by default | A second process kind in every chart and recipe; the CLI stance `management-api.md` settled grows a subcommand |
| **C. Leader-only workers** | Simple mental model | Throughput capped at one process; a leader's death stalls every job for a lease |

**Why this is yours:** it shapes the deployment `deployment.md` will document.

Folded into "Topology and shutdown", AC22, AC23.

### Resolved: the queue core lands at the start of step 4b, not at step 6a (was Q9)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: Phases 1 to 3 are built
as the first item of charter step 4b, immediately after the step 4a re-open's finding; Phase 4
(the deferred management operation) stays at step 6a before Ansible collections.

**Recommendation:** A - artifact verification and supply-chain policy at step 4b are consumers
of the one queue (was Q1), so the queue must exist before them; the evidence the charter wanted
first (the prototype's questions 4 to 6) is recorded at step 4a, so the sequencing reason for
waiting is satisfied, and effort is not a reason to defer (`CLAUDE.md`, standing scope decision).
The step 6a placement was made by the 2026-09-26 reconciliation, not by an owner decision, so
this does not reverse one.

| Option | You get | It costs |
|---|---|---|
| **A. Core at the start of step 4b, deferred-operation consumer at 6a** (adopted) | Step 4b consumers get the queue; the client-visible half still follows the prototype's evidence by a full step | `project-charter.md` steps 4b and 6a and AC12 are amended; step 4b grows |
| **B. Keep step 6a; verification and policy ship private workers first** | Charter untouched | Two implementations and a migration; contradicts the one-queue decision |
| **C. Move everything to step 4a inside the prototype** | Earliest | The prototype is disposable by charter, and building production code inside it defeats its purpose |

**Why this is yours:** it edits the build order the charter fixes.

Folded into Context, "Implementation Phases", and the `project-charter.md` consequence, which
that spec applied on 2026-09-28 (its steps 4b and 6a, AC12).

### Resolved: a job of an unknown kind is skipped, not refused (was Q10)

**Adopted 2026-09-28 under the owner's standing delegation.** Option A: the claim query names
only the kinds this process has a registered worker for, so a job of a kind it does not know
stays `pending` for a process that does; `Start` logs the unknown kinds at warning and starts;
nothing fails the job. This replaces the authoring draft's AC26, which had `Start` refuse to run
while the table held an unregistered kind.

`deployment.md`'s rolling-upgrade rule ("old and new binaries coexist during the rollout ...
a kind the old binary does not know is left unclaimed until the rollout finishes") and its
rollback-by-redeploy rule both put two binaries with different kind registries on one table.
Under the draft's AC26 the older binary would refuse to start the moment the newer one
enqueued a new kind, which turns every rolling upgrade that adds a kind into an outage and
every rollback into a database edit. What should a process do with a kind it cannot run?

**Recommendation:** A. The claim query already filters by kind for pausing; adding the
registered set to the same filter costs nothing, and "leave it for a process that can" is the
only answer under which a mixed fleet keeps working in both directions.

| Option | You get | It costs |
|---|---|---|
| **A. Claim only registered kinds; unknown ones stay pending; warn at `Start`** (adopted) | Rolling upgrades and rollbacks work with no operator step; a job is never lost or failed for being new | A kind nobody will ever register ages silently unless watched: answered by the per-kind gauges and `ScheduleOverdue`, which is the shape the draft's AC26 wanted to prevent |
| **B. Refuse to start (the draft's AC26)** | A misconfigured registry is loud at once | Every rolling upgrade that adds a kind stalls the old replicas; rollback needs the new kind's rows deleted by hand |
| **C. Claim and fail the job `Permanent` with "unknown kind"** | The job is terminal quickly | A newer binary's job is destroyed by an older one during every rollout; `manage.apply` operations fail for the client for no reason of theirs |

**Why this is yours:** it is the queue's behaviour under the deployment model the owner will
run, and it retires a criterion this spec adopted the day before.

Accepted cost: the silent-aging case, made visible by AC26's gauges and the warning log.
Folded into "Claim: SKIP LOCKED plus a lease", "Package shape", AC26 and Phase 1.

### Resolved: a worker-supplied earliest retry time (was Q11, raised and adopted 2026-09-28)

**Adopted 2026-09-28 under the owner's standing delegation**, in the closing reconciliation sweep,
on Opus. Option A: a third error class, `async.RetryAt(err, at)`, returns the job to `pending`
with `run_at` the later of `at` and the ordinary backoff and counts as an attempt, so
`max_attempts` still ends the job.

`proxy-cache.md`'s resolved revalidation-replay decision (was Q18 there) settled that "a
`*upstream.RateLimitError` ends the job with its `run_at` moved past `RetryAfter`; any other
failure ends it under the queue's ordinary retry policy". The runner had two classes: `Permanent`
and transient, whose `run_at` the runner computes from `attempts` alone (2 s doubling to 15 min).
Under that policy a revalidation hitting a one-hour cool-down would be claimed again at 2 s, 4 s,
8 s and so on, meet the `Router`'s immediate refusal each time (`upstream-adapters.md`, its
resolved cool-down decision, AC10), and spend all eight attempts in about four minutes, failing
long before the upstream would answer. What should the runner do when a failure itself says when a
retry can succeed?

**Recommendation:** A. It is the smallest change that honours the sibling's settled text, and
counting the attempt keeps the property the retry design exists for: every job terminal within a
bound, so a stuck revalidation is a `JobFailed` alert rather than a job that waits forever.

| Option | You get | It costs |
|---|---|---|
| **A. `RetryAt(err, at)`: `run_at` the later of `at` and the backoff; counts as an attempt** (adopted) | `proxy-cache.md`'s rule exactly; no attempt wasted inside a cool-down; the termination bound holds with the deferral in it | One more exported error wrapper; under a persistent rate limit a job lives up to `max_attempts` cool-downs (eight hours at the one-hour cap) before failing, holding its remote's grace open meanwhile |
| **B. `RetryAt` that does not count as an attempt** | A rate-limited job never fails for being rate-limited | No bound on time to terminal under a limit that never lifts, which breaks AC24's termination invariant and hides the outage from `JobFailed` |
| **C. No new class: a rate limit is an ordinary transient error** | Nothing to add | Contradicts `proxy-cache.md`'s settled text, and the job exhausts its attempts against the cool-down's instant refusals |

**Why this is yours:** it changes the worker contract every kind is written against and how long a
rate-limited job may live, a retry horizon you set at eight attempts over about forty minutes (was
Q7).

Accepted cost: a rate-limited `proxy.revalidate` may take hours to fail, bounded by
`max_attempts` times the upstream's `limits.cooldown_cap`; the grace it holds on a `remote` delays
only the collection of that remote's unreferenced blobs. B lost to the unbounded wait, C to the
sibling's settled rule. Folded into "Retry, backoff and permanent failure", "Package shape", the
property suite's termination invariant, AC7, AC24, AC29 and Phase 1.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-27 | 998b03a | authoring pass: grounded first draft, not a review | Gathered the requirements `data-model.md` (the `Operation` entity, AC32, the non-root table's grace note), `management-api.md` (deferred kinds, 202 and poll, idempotency, `Operator` dispatch, retention keys), `signing-service.md` (merge contract, cadence re-sign, the goroutine exception), `artifact-verification.md` (re-evaluation worker, refreshes), `supply-chain-policy.md` (scans, retries, feed sync), `replication.md` (resumable transfers), `generic.md` (retention pass), `storage-and-gc.md` (sweep exclusivity, session grace hold), `write-triggered-services-prototype.md` (questions 4 to 6, AC8 to AC12) and the format specs placed on the step 6a subsystem, plus consequences items 3 (format-management fold), 2 and 14 (management-api), 15 (signing-service) and 9 (storage-and-gc). Grounded prior art fetched this run: River's docs (transactional enqueue, maintenance services, unique jobs, retries, cancellation) and brandur.org's argument, Pulp's `worker.py` (SKIP LOCKED claim, resource locking, wake-up and cancel channels, missing-worker rule), Harbor's jobservice README (kinds, statuses, retries, stop and cancel, limitations), Nexus's tasks page, Gitea's `[queue]` section, PostgreSQL's `SKIP LOCKED` documentation, AIP-151; Pulp's architecture page answered 403 and 404 and is recorded as silence beyond the source. Design: one PostgreSQL-backed queue with transactional enqueue, SKIP LOCKED claim, lease with fencing token, fenced transactional `Finish` carrying effect, `Operation` and job together, bounded retries, coalescing and exclusivity by partial unique index, cooperative cancel, pause and resume, a leader-elected scheduler with database-held schedules, a repository grace hold for unfinished jobs, and the enumerated crash-recovery table. Nine questions written in decision shape and adopted under the standing delegation. 26 criteria, each with a Test Plan row; `node scripts/check-spec.js` run against this file with zero failures. Stays draft; awaits an independent review. |
| 2026-09-28 | 9ebf6e9 | cross-spec reconciliation of the foundation authoring wave. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` targeting this file verified against the source spec's current text before applying. From `repository-lifecycle.md` (authoring item 12; its "Deletion" step 8 and AC21): a new bullet under "Cancellation, pause and resume" - the deletion transaction cancels every pending job naming the repository, requests cancel on running ones, disables the repository-scoped `Schedule`s, a job reaching `Checkpoint` or `Finish` on a deleted repository is refused by the write-transaction constructor and ends itself `cancelled`, the grace hold stands until terminal; `CancelByRepository(ctx, tx, repo)` added to the package shape as the one exported write path outside the package, with an enforcer row; AC28 added, its rows shared with that spec's AC21 and `storage-and-gc.md` AC23; `Schedule` gains an optional repository reference. From `deployment.md` (item 9): (a) unknown kinds skipped, not failed, which contradicted the draft's AC26 and is recorded as Q10, adopted under the standing delegation, with the claim query restricted to registered unpaused kinds, AC26 rewritten and Phase 1 following; (b) the leader lock is `internal/db/lock.LockScheduler` on a dedicated connection, with `deployment.md` AC19's enforcer cited (AC14, "The scheduler", "Package shape"); (c) no rename: the kind table now says why `verify.tuf_refresh`/`verify.revocation_refresh` (kinds) and `verify.sigstore.refresh`/`verify.revocation.refresh` (period keys) differ. From `observability.md` (item 8): the ten `async_*` series and the merge worker's breach counter by catalogue name, `JobFailed`, `ScheduleOverdue`, `VirtualMergeStalenessBreach` and `SchedulerLeaderless` through `telemetry.Alert` (AC20 rewritten), the leader-only state-gauge collector (AC14, its AC7), `trace_context` and `request_id` set at enqueue with a linked job span (the `Job` record, "Enqueue is transactional", AC27 added, its AC16 row). From the `data-model.md` reconciliation (item 2): `Job` and `Schedule` cited to "Jobs and schedules" and AC41, `cancelled` as admitted by AC32 and `management-api.md` AC16. From the `storage-and-gc.md` reconciliation (item 3): AC23 cited for the grace hold in Design, the enforcer table, AC13's row and Phase 4; the storage kinds run at the `gc.*_interval` keys with `LockSweep` as the second guard (its AC26). From the `supply-chain-policy.md` reconciliation (item 8): `policy.feed_sync` one schedule per source with exclusivity key `feed_sync:{source}`, the scan alert bound `policy.scan.unscanned_alert_after` (kind table, "The scheduler", AC14). From the `replication.md` reconciliation (item 7): `replication.sync` per link at `replication.sync_interval` or the link's own period, its AC23 cited. From the charter reconciliation (item 4): Context restated on the charter's step 4b queue core and step 6a deferred operation, "owed" dropped for `management-api.md`, `observability.md` and `deployment.md`. Context's sibling summaries rewritten to what each spec now says (`signing-service.md` AC19 and AC22 on the production runtime, `artifact-verification.md` on `async.kind_limits` with the `verify.workers` key retired under `deployment.md`'s was-Q11, `supply-chain-policy.md`'s `policy.scan` shape, `replication.md` AC23, `storage-and-gc.md` AC23 and AC26, plus new entries for `repository-lifecycle.md`, `observability.md` and `deployment.md`). The configuration table is in the three-column shape `scripts/check-config-keys.js` parses (AC22 extended). Already done at authoring: management-api items 2 and 14, signing-service item 15, debian item 20's deferred regeneration, format-management item 3's consistency note. 28 criteria, each with a Test Plan row; ten resolved questions, zero open. `node scripts/check-spec.js` on this file: zero failures. Stays draft pending a gate review. |
| 2026-09-28 | b7640dd | closing reconciliation sweep on Opus: every `consequences.md` item targeting this file from "From format batch 3 reconciliation" through the latest section, plus earlier items the progress log did not show as applied. Not a review | Not a review. Each item verified against the current text of its source spec before applying. Format batch 3 item 7, batch 4 item 8, batch 6 item 12, batch 7 item 12, batch 8 item 10: Context's format list rewritten from each format spec's own virtual and dependency sections, which also moved `chef.md`, `luarocks.md`, `maven.md` and `helm.md` (index.merge consumers that ask nothing of this spec directly) and named `composer.md`, `homebrew.md`, `openvsx.md`, `puppet.md`, `swift.md`, `terraform.md`, `conan.md` as per-request virtuals, with `hex.md` `Virtual: unsupported`; `conda.md` left the "regenerates inside the write" sentence for the merge consumers. Signing-service closing sweep item 4: `index.merge` triggers gain member-list change and remote adoption through the adoption-commit hook (its was-Q15, was-Q16, AC34, AC35; AC11 extended, its row sharing `internal/index/virtual_remote_member_test.go`); `signing.resign` gains the repository-scoped schedule under `repository:{repository}` (its AC33, `hackage.md` was-Q16; AC14 extended, deletion disables it); the revalidation kind added. Proxy-cache closing sweep item 1: the `proxy.revalidate` row matches its "Revalidation outside the request" and AC26 exactly (callers, `revalidate:{repository}` for coalesce and exclusivity, no `Schedule`, nothing under `proxy.offline`, `read_only` or deleted, effect an adoption whose hook enqueues `index.merge`, rate limit past `RetryAfter`); the read-path enqueue runs in its own enqueue-only transaction so `Enqueue(ctx, tx, Job)` stays the only signature; the adoption outside the fence argued idempotent; remote deletion cancels the pending job through `CancelByRepository`; AC29 added. Auth AC36 and FHI AC18 (the prompt's note, and proxy-cache closing sweep item 4 seen from here): the runner gives no job a principal, treats `trace_context` and `request_id` as correlation only, never receives the replay entry, and keeps replayed response bytes out of `last_error` and its logs; "the runner's only route to a handler is `internal/manage`" corrected to name both worker doors; enforcer rows and AC30 added. Q11 raised and adopted under the standing delegation: `RetryAt(err, at)`, needed because the transient class could not express proxy-cache's "`run_at` moved past `RetryAfter`" (AC7, the property suite's termination invariant, AC24; fable_recheck extended). Earlier items not shown as applied: format batch 2 item 2 (Ansible's import deferred as the `publish` kind on `manage.apply`, its was-Q9, in Context); format batch 1 item 9 (AC28's row shares `internal/retention/schedule_test.go` with `generic.md` AC17). Already done: charter reconciliation item 4, repository-lifecycle authoring item 12 (credential and lifecycle item 3's half for this file; items 9, 10 and 13 target other files). 30 criteria, each with a Test Plan row; eleven questions resolved, zero open. `node scripts/check-spec.js` on this file: zero failures. Stays draft pending a gate review. |
