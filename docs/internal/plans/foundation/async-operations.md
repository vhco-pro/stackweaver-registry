---
status: draft
status_description: "Authored 2026-09-27 at 998b03a as a grounded first draft, not yet reviewed. Gathers the deferred-execution requirements management-api.md (deferred kinds, 202 plus Operation, poll route, idempotency), data-model.md (the Operation entity and its atomic terminal transition), signing-service.md (virtual merge contract and the cadence re-sign), artifact-verification.md (the re-evaluation worker), supply-chain-policy.md (scans, retries, feed sync), replication.md (resumable transfers), generic.md (the retention pass), the write-triggered services prototype (its questions 4 to 6 and AC8 to AC12) and the format specs placed on the step 6a subsystem, and fixes one PostgreSQL-backed job queue with leased, fenced, transactional completion that every deferred and scheduled activity in the registry runs on. Nine questions written in decision shape and adopted under the owner's standing delegation; zero open. 26 criteria, each with a Test Plan row. Awaits a /spec review pass."
description: "Spec for the shared asynchronous-operation subsystem: one PostgreSQL-backed job queue (SKIP LOCKED claims, leases with fencing tokens, transactional enqueue and completion, bounded retries, coalescing and exclusivity keys, cooperative cancellation, pause and resume, a leader-elected scheduler) that executes every deferred management operation behind data-model.md's Operation record and every scheduled or background activity the sibling specs name: virtual merges, cadence re-signing, verdict re-evaluation, scans and feed sync, replication transfers, retention passes and the GC sweep."
author: michielvha
goal: "Give every deferred or scheduled activity in the registry one runner with one durability story, so that a deferred write commits exactly once and atomically with its Operation and snapshot across crashes and multiple server processes, no handler or shared layer ever grows a goroutine, timer or queue of its own, and a pending import can never lose its bytes to the sweep."
priority: high
issue: 49
created: 2026-09-27
covers:
  - "internal/async/**"
---

# Plan: Asynchronous Operations

One PostgreSQL-backed job queue, `internal/async`, executes everything in the registry that runs
outside a request: the deferred half of a management operation (a Galaxy import, a bulk publish
too large to answer inline), the virtual-repository merge, the cadence re-sign, verdict
re-evaluation, scans and the advisory feed sync, replication transfers, retention passes and the
storage sweep. A job is enqueued in the transaction that decides it is needed, claimed by one
worker at a time with a lease, and finished in one transaction that carries the job's terminal
state, the `Operation` it backs and the snapshot it produces, fenced so a worker that lost its
lease can never commit. Nothing here is a second entity or a second wire shape: the client-visible
record is `data-model.md`'s `Operation` and the wire is `management-api.md`'s.

## Context

The charter builds this subsystem at step 6a, "immediately before" Ansible collections, "the first
client-visible asynchronous operation in the build order", and says its shape "is a question for
the step 4a re-open, which has Ansible's evidence in hand; only its production form is built
here" (`project-charter.md`, build order, step 6a). The resolved build-placement question below
moves the queue core earlier, to the start of step 4b, because two step 4b consumers need it.

The requirements already exist, scattered across the specs that cite this file:

- **`data-model.md`, "Operations" and AC32**, owns the `Operation` entity: repository, format,
  kind, an unguessable wire id, monotonic state (`pending`, `running`, then `completed` or
  `failed`, a terminal state never changing), created and finished times, principal and
  authorizing scope, a handler-written result document, and a produced-snapshot reference "set
  only on `completed`, in the same transaction as the snapshot, so there is never a snapshot
  whose operation reads unfinished or a completed operation with no snapshot". It is not
  snapshot content, not a mark root, and pruned after a window. Its non-root table says a
  pending operation's bytes "are protected only by the repository-scoped grace" and that
  "whether a pending import can outlive that grace is the write-triggered services prototype's
  question 5, and a gap it finds is a revision request to `storage-and-gc.md` and this set,
  never an operation-side pin". `agents/spec-loop/consequences.md` (format-management fold, item
  3) adds: "async-operations.md (foundation queue) must be consistent with this entity".
- **`management-api.md`** owns the wire. Its Scope excludes "Execution of deferred operations.
  The asynchronous-operation subsystem the charter builds at step 6a (`async-operations.md`,
  owed) owns workers, retries and cancellation; this spec owns the operation's wire shape, its
  `Operation` record and its poll route, so the two are one contract seen from two sides". Its
  Design fixes: a handler "declares, per kind, whether `Apply` runs inline or is deferred; the
  API answers 201 with a completed `Operation` for the former and 202 with a `pending` one and a
  `Location` for the latter", the deferred path "commits the same way (one snapshot, atomic with
  the terminal transition)", the poll route `GET /api/v1/operations/{id}` needs the originating
  write's authorization, `Idempotency-Key` with `operation-outstanding` (409) "while the first
  is still running", the `management.operation_retention` (90 days) and
  `management.deferred_threshold` (10 s, AIP-151) keys, and AC16 and AC17 assert them. Its
  consequences (items 2 and 14) widen `Operation` to every management operation with idempotency
  key and request id fields and say this spec owns "deferred execution and key-operation
  semantics; the wire shape (`Operation`, poll route, `configure` kind) is management-api.md's".
- **`signing-service.md`, "Virtual merges: deferred, coalesced, signed with the virtual's key"**,
  fixes the merge contract and hands execution here: "A completed write on a member enqueues a
  merge for every virtual that lists it; merges for one virtual within a coalescing window run
  once; the window and a staleness bound ... are configuration", "the previous merged document
  set serves until the new one commits atomically; a merge that fails leaves the previous set and
  an alert", `index.virtual_merge_window` 5 s and `index.virtual_staleness_bound` 60 s, "run as
  deferred work, never on a request's path", asserted by its AC19 "against a fixture runner
  until that spec's runtime exists". Its cadence re-sign is "a scheduled production of pointer
  documents under the current keys, creating no snapshot, durable across a restart (the schedule
  derives from the stored documents' expiry, not from a timer in memory)" (AC22), and its
  package shape says "Neither package starts a goroutine that outlives a request except the
  cadence scheduler". Consequences item 15 queues both for this spec.
- **`artifact-verification.md`, "Re-evaluation when a trust set changes"**: a trust-set revision
  "marks the repository's verdicts under the previous revision as superseded and enqueues them
  for re-evaluation", "a bounded worker (`verify.workers`, default 4) recomputes them oldest
  first, under a context the server's shutdown cancels, and resumes from the superseded marks on
  restart, so no verdict is ever lost to a crash and none is ever recomputed twice" (AC3); plus
  `verify.sigstore.refresh` (24 h) and `verify.revocation.refresh` (12 h) periodic refreshes.
- **`supply-chain-policy.md`, "Scanning is asynchronous; enforcement is synchronous"**: "An
  artifact is scanned after ingest", "Scan failures retry, and an artifact that stays unscanned
  past a bound raises an operator alert" (AC6), and the feed sync "re-matches each new or
  changed advisory against the stored coordinates" on a schedule, suspended under offline mode
  (AC16).
- **`replication.md`**: "Interrupted transfer resumes from the last completed snapshot rather
  than restarting" (AC3), "a transfer killed midway leaves every mirrored pointer on the most
  recently completed target" (AC2), and a follower detects a gap "on the next sync".
- **`formats/generic.md`, resolved retention-placement decision (was Q11 there)**: "an age rule
  must fire while nobody is writing, so retention cannot be handler code"; a retention pass is
  "one completed write" in `internal/retention` that runs "outside any request".
- **`storage-and-gc.md`**: "At most one sweep runs at a time, enforced (a PostgreSQL advisory
  lock suffices), and a sweep interrupted by a crash must be safe to rerun immediately from the
  start"; snapshot pruning runs "on the schedule the retention default sets".
- **`write-triggered-services-prototype.md`**, whose asynchronous half asks questions 4 to 6
  (deferral through `Deps` or a callback, one snapshot on success and none on failure "across a
  process restart", whether "a pending import's blob need[s] GC protection the settled machinery
  does not give") and asserts AC8 (a real `ansible-galaxy` publish with "the vehicle's runner
  held until the first poll is answered"), AC9, AC10 (a server killed at each step leaves "the
  operation terminal within a bounded time, the import applied at most once"), AC11 (a forced
  sweep past grace "does not collect the pending import's artifact blob") and AC12 ("Deferred
  work runs on the shared runner, never on a handler-owned goroutine or queue"). Its
  `ansible-collections.md` counterpart validates synchronously in v1 and reserves the deferred
  path.
- **Format specs**: `debian.md`, `cpan.md` and `hackage.md` require this spec `planned` before
  their virtual-merge phases; `alpine.md`, `arch.md`, `chef.md`, `conan.md`, `homebrew.md`,
  `luarocks.md`, `opam.md`, `openvsx.md`, `puppet.md`, `rpm.md`, `swift.md`, `terraform.md` and
  `vagrant.md` record that they ask nothing of it. `conda.md` and `nuget.md` regenerate their
  indexes inside the write (no indexing delay is deferred), and `maven.md` declined a staging
  operation, so none of the "indexing delay" shapes the loop's hint named is a consumer.

Nothing in the tree implements any of this: `internal/` does not exist at 998b03a, so every
claim in this spec is design, verified against sibling specs and the prior art fetched this run
rather than against code.

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
  schedule, verdict re-evaluation, scans and feed sync, replication transfers with checkpoints,
  retention passes, and the scheduling of the storage sweep, orphan scan and snapshot pruning.
- The GC interaction: an unfinished job holds its repository's grace open (the resolved
  grace-hold question below), answering the prototype's question 5 in design and leaving the
  prototype's AC11 to verify it.
- Operator controls (list, cancel, pause, resume) as `management-api.md` routes, the runner's
  configuration keys, metrics and alerts (their homes are `management-api.md` and the owed
  `observability.md`; what they must say is fixed here).
- Fault injection, property and benchmark tests, because concurrency and durability have no
  client oracle (`CLAUDE.md`).

**Out of scope, with the reason:**

- **The `Operation` entity and any new record.** `data-model.md` owns entities; the `Job` and
  `Schedule` records this spec needs and the `cancelled` terminal state it adds to `Operation`
  are specified precisely below and reported as sibling consequences, never added here.
- **The wire shape of an operation**: the poll route, the 202 response, problem types, the
  `Idempotency-Key` header and the operator-control routes' paths. `management-api.md` owns the
  `api` mount; this spec fixes what those routes must do and reports the additions.
- **What any job does.** The merge algorithm is `signing-service.md`'s, the verdict computation
  `artifact-verification.md`'s, the scan `supply-chain-policy.md`'s, the transfer
  `replication.md`'s, the sweep `storage-and-gc.md`'s. This spec owns when, where, how many
  times and with what guarantees a job runs, never its body. Excluded because a runner that knows
  what its jobs do is a second copy of every shared layer.
- **A separate worker deployment.** Pulp ships API and worker processes; Harbor a jobservice.
  Here every server process runs workers by default and `async.workers: 0` turns one into an
  enqueue-only replica (the resolved topology question below). Excluded because a second binary
  is a second deployment story `deployment.md` (owed) would have to carry for a benefit
  configuration already gives.
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

| Consumer | Kind (proposed; the owning spec fixes the name) | Trigger | Keys | Finish writes |
|---|---|---|---|---|
| `management-api.md` deferred `Apply` | `manage.apply` | `Submit` of a kind the handler declared deferred; enqueued in the transaction that inserts the `pending` `Operation` | none by default; a handler may declare an exclusivity key of the repository | the snapshot, the `Operation` terminal transition, retirements, the audit line |
| `signing-service.md` virtual merge | `index.merge` | the metadata store's commit hook on a member write, in the member's write transaction | coalesce key `virtual:{repository}`; exclusivity key the same | the virtual's current-document swap (no snapshot) |
| `signing-service.md` cadence re-sign | `signing.resign` | the scheduler, next run derived from the stored document's expiry and `signing.resign_at_fraction` | exclusivity key `pointer:{repository}/{pointer}` | `PointerDocument` and `Signature` records (no snapshot) |
| `artifact-verification.md` re-evaluation | `verify.reevaluate` | the trust-set revision's transaction, one job per repository revision; the worker pages through superseded marks oldest first with a checkpoint | exclusivity key `verify:{repository}` | verdict rows and cleared superseded marks |
| `artifact-verification.md` refreshes | `verify.tuf_refresh`, `verify.revocation_refresh` | the scheduler at `verify.sigstore.refresh` and `verify.revocation.refresh`; suspended under offline mode | exclusivity key the kind | the refreshed trust material |
| `supply-chain-policy.md` scan | `policy.scan` | the ingest and cache-commit hooks, in the committing transaction | coalesce key `scan:{digest}` | scan result, component inventory |
| `supply-chain-policy.md` feed sync | `policy.feed_sync` | the scheduler; suspended under offline mode | exclusivity key the kind | advisory rows and re-matched condemnations |
| `replication.md` sync and transfer | `replication.sync` | the scheduler per active `ReplicationLink`, and on demand | exclusivity key `link:{id}`; checkpoint per completed snapshot | applied snapshot range, mirrored pointer moves |
| `generic.md` retention | `retention.pass` | the scheduler per repository with rules | exclusivity key `repo:{repository}` | one snapshot per pass |
| `storage-and-gc.md` sweep, orphan scan, pruning | `storage.sweep`, `storage.orphan_scan`, `storage.prune` | the scheduler | exclusivity key the kind | deletion intents, row deletes, pruned snapshots; the sweep keeps its own advisory lock as a second guard |

Two things the table makes visible. Only `manage.apply` backs an `Operation`: every other kind is
system-initiated work with no principal, and `management-api.md` records `Operation`s for
management operations, not for the registry's housekeeping. And no row's "Finish writes" column
mentions a handler: the runner never calls a handler; `manage.apply` calls `internal/manage`,
which calls the handler's `Operator.Apply` inside the write transaction exactly as an inline
operation does (`management-api.md`, "Bindings: one operation, two ways in", resolved dispatch
decision). That is the answer to the prototype's question 4 from this side: the runner needs no
new pinned method because the callback it needs, `Apply`, is the optional `Operator` interface
`management-api.md` already introduced.

### The `Job` record and the `Operation`

The queue's unit is a `Job`, a core-owned record `data-model.md` must gain (sibling consequence;
specified here so the amendment is a transcription):

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
  optional `repository` reference (the repository whose grace the job holds open), and a
  `checkpoint` document the worker may write between attempts.
- **Placement.** Not repository content: in no snapshot, untouched by repoint and rollback,
  never a mark root ("Records that are not mark roots" gains a row); pruned after
  `async.job_retention` from `finished_at`, but never before the `Operation` it references is
  pruned, so a poll never finds an `Operation` whose execution record vanished first.

The `Operation` is the client's view and the `Job` the runner's, and they are kept consistent by
construction rather than by reconciliation: the two records for one deferred operation are
written in the same transaction at every transition (insert `pending` with `pending`, claim sets
`running` on both, finish sets the terminal states on both). No code path updates one without
the other; a test enumerates the transitions and asserts the pairing (AC5). `Operation` gains a
third terminal state, `cancelled` (the resolved cancellation question below), which
`data-model.md` AC32 and `management-api.md` AC16 must admit.

### Enqueue is transactional

`Enqueue(ctx, tx, Job)` takes the caller's transaction and inserts the row in it. There is no
`Enqueue` without a transaction: the failure modes River names (a job seeing uncommitted data, a
job outliving a rollback, a crash between commit and enqueue) are all "enqueue after commit", and
the way to make them impossible is to have no such call. The metadata store's commit hook
(`signing-service.md`'s trigger for the merge), `internal/manage`'s `Submit`, the ingest and
cache-commit hooks and the trust-set revision all already run inside a transaction, so each
enqueues in it. After commit, the committing connection issues `NOTIFY async_wakeup` with the
kind as payload (PostgreSQL delivers a `NOTIFY` only when its transaction commits), so an idle
worker wakes within milliseconds; a worker that missed the notification finds the job on its next
poll, `async.poll_interval` later. `Enqueue` with a `coalesce_key` uses `INSERT ... ON CONFLICT
DO NOTHING` against the pending-key index and reports whether a row was inserted.

### Claim: SKIP LOCKED plus a lease

A worker claims in one short transaction:

```
UPDATE job SET state='running', lease_owner=$me, lease_token=$fresh,
  lease_expires_at=now()+$lease, attempts=attempts+1
WHERE id = (SELECT id FROM job
  WHERE (state='pending' AND run_at <= now() AND kind = ANY($unpaused))
     OR (state='running' AND lease_expires_at < now())
  ORDER BY run_at LIMIT 1 FOR UPDATE SKIP LOCKED)
RETURNING *
```

expressed in the store's query layer rather than as literal SQL in the spec's sense; the shape
is what matters. Three properties follow:

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
`Apply` runs entirely inside `Finish`. The registry test over kinds asserts it (AC8) rather than
trusting the argument.

### Retry, backoff and permanent failure

An error from `Work` is one of two classes, decided by the worker, not the runner:

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

A lease that expires because the worker died counts as an attempt, so a job whose body crashes the
process every time still terminates within `max_attempts * (lease + backoff)`.

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

- **Cancel** (`management-api.md` route, sibling consequence; authorized like the poll route,
  admin for jobs without an `Operation`): a `pending` job becomes `cancelled` in one `UPDATE
  ... WHERE state='pending'` and never runs; a `running` job is marked `cancel_requested` and
  `NOTIFY async_cancel` carries its id, the holding worker cancels the job's context, and the
  outcome is whichever commits first: `Finish` (the job completes; the effect stands and the
  client is told `completed`) or the worker's return with `ctx.Err()` (the job ends
  `cancelled`, nothing committed). Never both, by the fence, and never a half effect, by the
  transaction. Cancellation is cooperative, like River's, Harbor's and Pulp's; a `Work` that
  ignores its context is a bug the idempotence test surfaces (AC8 runs each kind under a
  cancelled context and asserts nothing committed). A `manage.apply` job's `Operation` ends
  `cancelled`.
- **Pause and resume a kind** (admin routes, sibling consequence): a paused kind's jobs are
  enqueued normally and never claimed (`kind = ANY($unpaused)` in the claim query, read from a
  `paused_kinds` set in the database, not in memory, so every process agrees). Running jobs of a
  paused kind finish. This is Harbor's queue pause and it is also how the conformance harness
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
than never.

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
its repository's grace open"). The bytes a deferred import will reference were committed to the
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

Periodic work is a `Schedule` record (`data-model.md` amendment): `name`, `kind`, `args`,
`interval` or `next_run_at` derived by the kind, `last_run_at`, `last_result`, `enabled`. One
process at a time runs the scheduler tick, elected by `pg_try_advisory_lock` on a fixed key held
for the process's life and re-acquired by another process when it dies (River's leader election
without the table); every process with `async.scheduler: true` (the default) is a candidate.
The tick, every `async.scheduler_interval`, enqueues a job for each schedule whose `next_run_at`
has passed, with `coalesce_key` the schedule name so a missed tick after an outage enqueues one
job, not one per missed interval, and advances `next_run_at` in the same transaction. Kinds that
derive their next run from stored state (the cadence re-sign: "the schedule derives from the
stored documents' expiry, not from a timer in memory") compute it when the job finishes and
write it to the schedule in `Finish`, so a restart mid-schedule loses nothing (AC14 covers
`signing-service.md` AC22's restart case). Offline mode (`proxy-cache.md`'s instance switch)
disables the schedules that reach the network (`policy.feed_sync`, the two verify refreshes,
`replication.sync`) by a flag the tick reads; a disabled schedule still advances so it does not
burst on re-enable.

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
runner's only route to a handler is `internal/manage`. `write-triggered-services-prototype.md`
AC12 asserts for the vehicle that the handler "starts no goroutine that outlives its request
and imports no queue or scheduler package"; this spec generalises it to every package outside
`internal/async`: no shared layer or handler starts a goroutine that outlives a request, owns a
`time.Ticker` or `time.AfterFunc`, or opens a `LISTEN`. The one exception is the HTTP server's
own accept loop. `signing-service.md`'s "except the cadence scheduler" therefore becomes a
`Schedule` here (sibling consequence), and `artifact-verification.md`'s `verify.workers` becomes
a per-kind concurrency limit (`async.kind_limits`) rather than a private pool.

### Both paths

The runner does not know what a repository is. It carries a repository reference for the grace
hold and nothing else; it has no branch on `local`, `remote` or `virtual`, imports no handler and
no proxy package, and `policy.scan` of a cached artifact, `verify.reevaluate` of a proxied
verdict and `index.merge` over a virtual whose members are remotes run through the same claim,
lease and fence as a hosted publish (AC17). The proxied path's asynchronous work is therefore
covered by construction, and the architecture test that holds the import graph is what proves
"by construction" rather than asserts it.

### Configuration and CLI stance

Per the `cobra-viper` skill: keys under `async.` with defaults, bound to
`STACKWEAVER_REGISTRY_ASYNC_*`, unmarshalled into a typed `async.Config` the package receives in
its constructor; the `serve` command wires the runner and gains no flag or subcommand for it.

| Key | Default | Meaning |
|---|---|---|
| `async.workers` | `8` | Worker goroutines in this process; `0` makes it enqueue-only |
| `async.kind_limits` | `{verify.reevaluate: 4}` | Per-kind concurrency ceilings across this process's workers (the home of `verify.workers`) |
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
`management-api.md`'s and bounds `async.job_retention` from below. The owed `deployment.md`
documents the set.

### Package shape

`internal/async`: `Runner` (constructed with `Config`, a `*pgxpool.Pool` and the `slog.Logger`;
`Start(ctx)`, `Enqueue(ctx, tx, Job)`, `Cancel`, `Pause`, `Resume`, `List`), `Job` with `Finish`
and `Checkpoint`, the `Worker` interface (`Work(ctx, *Job) error`, one method, declared here
because the runner is its only consumer), `Permanent(err)`, `ErrLeaseLost`, and `Schedule`.
Kinds register in the server's constructor: `runner.Register(kind, worker)`, and `Start` refuses
an unregistered kind found in the table rather than leaving it pending forever. `internal/manage`
implements the `manage.apply` worker; each other consumer package implements its own worker
against `async.Worker`. The queries live with the shared metadata store's schema, since the
records are `data-model.md`'s. No third-party queue library (the resolved queue-implementation
question below); `golang.org/x/sync/errgroup` and `pgx` are the dependencies.

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
| The sweep's grace computation reads unfinished jobs | `internal/storage/gc_property_test.go` (queued job in the operation set, `storage-and-gc.md` consequence) |

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
  enqueue (with and without keys), claim, heartbeat, clock advance past lease, process kill,
  cancel, pause and resume, shutdown and restart, scheduler ticks; invariants checked after
  every step: at most one live lease per job; at most one `running` per `exclusive_key`; at
  most one `pending` per `coalesce_key`; every effect committed at most once (each simulated
  `Work` appends its job id to a table inside `Finish`; duplicates fail); a terminal job's
  effect present and a non-terminal job's absent; every job terminal within
  `max_attempts * (lease + backoff_cap)`; every `Operation` state equal to its job's; a paused
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
      `last_error` set; an error wrapped `Permanent` ends it `failed` at once with no retry; a
      kind's own `max_attempts` and backoff override the defaults; and `last_error` never
      contains a credential.
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
      production runtime).
- [ ] AC12: At most one job per `exclusive_key` is `running` at any instant across all
      processes, waiting jobs with that key run oldest first, and none waits forever while the
      key is free.
- [ ] AC13: An unfinished job naming a repository holds that repository's grace open: a sweep
      forced with an injected clock past the grace period while a deferred import is pending or
      retrying collects none of the digests the import will reference, the import then commits
      and the collection installs (`write-triggered-services-prototype.md` AC11), and the hold
      releases when the job becomes terminal, with the mark-root set unchanged at five.
- [ ] AC14: Exactly one process runs the scheduler tick (`async.scheduler_interval`) at any
      instant across N processes, a new leader is elected within one tick of the old one dying, a
      schedule whose `next_run_at` passed several times during an outage enqueues one job, the cadence re-sign's next run is derived
      from the stored document's expiry and survives a restart mid-schedule with no re-sign lost
      or duplicated (`signing-service.md` AC22 on the production scheduler), and offline mode
      disables the network-reaching schedules (`policy.feed_sync`, the verify refreshes,
      `replication.sync`) without bursting on re-enable.
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
- [ ] AC20: Queue depth and oldest-pending age per kind, lease expiries, retries, permanent
      failures, scheduler leadership and merge-staleness breaches are exported as metrics, and a
      staleness breach, a job ending `failed` and a schedule that has not run for twice its
      period each raise an operator alert, so that no job can fail silently.
- [ ] AC21: Listing jobs (filterable by kind, state and repository), cancelling a job, and
      pausing and resuming a kind are admin routes under the `api` mount present in the OpenAPI
      document, refused `not-found` to non-admins under the existence oracle, and each leaves
      one audit line.
- [ ] AC22: Every `async.*` key has a default, binds to its `STACKWEAVER_REGISTRY_ASYNC_*`
      variable, and reaches the runner as a typed `Config`; `async.workers: 0` runs no worker in
      that process while `Enqueue`, polls and the operator routes still work; and
      `async.job_retention` shorter than `management.operation_retention` is refused at startup.
- [ ] AC23: On shutdown every running job's context is cancelled, a job that calls `Finish`
      within `async.drain_timeout` commits whole, one that does not is left `running` and
      reclaimed elsewhere after its lease, and no goroutine of the runner outlives the server's
      context under `testing/synctest`.
- [ ] AC24: The randomized interleaving suite (enqueue with and without keys, claim, heartbeat,
      lease expiry, process kill, cancel, pause and resume, shutdown and restart, scheduler
      ticks, over N simulated processes on an injected clock) holds every invariant named in
      "Fault injection, property and benchmark tests" for every generated history, and is in
      `make verify`.
- [ ] AC25: Claim latency p99 stays under 50 ms and sustained throughput at or above 1,000 jobs/s
      on one process with eight workers against a local PostgreSQL, and the `job` table's
      dead-tuple count does not grow across an enqueue-and-prune run of 100,000 jobs, as
      benchmark gates.
- [ ] AC26: `Start` refuses to run while the table holds a job of a kind no worker registered,
      naming the kind, rather than leaving it `pending` forever.

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
| AC7 | unit + integration | `internal/async/retry_test.go` (backoff schedule on an injected clock, permanent class, per-kind override, credential leak scan of `last_error`) |
| AC8 | integration | `internal/async/kinds_test.go` (table over the registry: interrupt-and-rerun, cancelled context) |
| AC9 | integration + property | `internal/async/cancel_test.go` (pending, running-then-finish, running-then-return); `internal/async/property_test.go` (never both) |
| AC10 | integration + conformance | `internal/async/pause_test.go` (multi-process pause visibility); `conformance/ansible/deferred_publish_test.go` (`script` pauses, polls, resumes) |
| AC11 | integration | `internal/index/virtual_merge_test.go` on the production runner (coalescing count, running-then-write, staleness bound and breach alert, no merge on a request goroutine) |
| AC12 | property | `internal/async/property_test.go` (exclusive-key invariant, fairness, liveness) |
| AC13 | integration + property | `internal/storage/pending_operation_gc_test.go` (forced sweep past grace with a pending and a retrying import); `internal/storage/gc_property_test.go` (queued job in the operation set) |
| AC14 | integration | `internal/async/scheduler_test.go` under `testing/synctest` (leader death and election, missed periods, restart mid-schedule, offline flag); `internal/signing/cadence_test.go` (expiry-derived next run) |
| AC15 | integration + fault injection | `internal/verify/trust_revision_test.go` on the production runner (kill mid-page, rescue, no double recompute, kind limit) |
| AC16 | architecture test | `internal/async/arch_test.go` (import graph); `internal/async/goroutine_test.go` (AST scan with allowlist and violation fixture) |
| AC17 | architecture test + integration | `internal/async/arch_test.go`; `internal/async/crash_test.go` (same cases over `policy.scan` of a cached digest, `verify.reevaluate` of a proxied verdict, `index.merge` over remote members) |
| AC18 | integration | `internal/async/prune_test.go` (injected clock; job and `Operation` retention ordering) |
| AC19 | architecture test | `internal/async/arch_test.go` (one claim query site; no DDL or queue store outside the shared schema) |
| AC20 | integration | `internal/async/metrics_test.go` (each metric and alert under a driven scenario) |
| AC21 | integration | `internal/manage/jobs_routes_test.go` (admin and non-admin, OpenAPI presence, audit line) |
| AC22 | unit + integration | `internal/async/config_test.go` (defaults, env binding, typed struct, `workers: 0` behaviour, retention refusal) |
| AC23 | integration | `internal/async/shutdown_test.go` under `testing/synctest` (drain, late job reclaimed, no leaked goroutine) |
| AC24 | property | `internal/async/property_test.go`, run by `make verify` |
| AC25 | benchmark | `internal/async/bench_test.go` (latency, throughput, dead tuples), gated in CI |
| AC26 | unit | `internal/async/runner_test.go` (unregistered kind at `Start`) |

## Implementation Phases

Placement in the charter's build order: the queue core (Phases 1 to 3) at the start of step 4b,
immediately after the step 4a re-open records its finding on the prototype's questions 4 to 6;
the deferred-operation consumer (Phase 4) at step 6a before Ansible collections; the remaining
consumers with their own specs' steps (the resolved build-placement question below).

### Phase 1: The queue core
- `Job` record in the shared schema (the `data-model.md` amendment landed first), transactional
  `Enqueue`, SKIP LOCKED claim with lease and token, heartbeat, fenced `Finish` and
  `Checkpoint`, retry classes and backoff, lease-expiry rescue, pruning (AC1 to AC4, AC7, AC18,
  AC26)
- `Runner` with bounded workers, `NOTIFY` wake-up and poll fallback, drain on shutdown (AC23)
- Architecture tests and the goroutine scan (AC16, AC19), the fence and crash suites (AC3, AC6)
- Configuration (AC22)

### Phase 2: Keys, cancellation and operator controls
- `coalesce_key` and `exclusive_key` indexes and claim behaviour (AC11's queue half, AC12)
- Cancel, pause and resume with database-held state and `NOTIFY async_cancel` (AC9, AC10)
- The admin routes through `management-api.md`'s mount (AC21), metrics and alerts (AC20)
- The property suite and benchmarks (AC24, AC25)

### Phase 3: The scheduler
- `Schedule` record, leader election, tick with coalesced catch-up, offline flag, kind-derived
  next run (AC14)
- The first schedules: `storage.sweep`, `storage.orphan_scan`, `storage.prune` (mechanics
  unchanged, `storage-and-gc.md`), `retention.pass`

### Phase 4: The deferred management operation (step 6a)
- `manage.apply` worker in `internal/manage`: paired transitions, `Apply` inside `Finish`,
  permanent-failure mapping to the `Operation` result document, idempotency semantics (AC5,
  AC8 for this kind)
- The repository grace hold, with `storage-and-gc.md`'s amendment (AC13)
- The Galaxy conformance cases with pause-based hold (AC10)

### Phase 5: Sibling consumers as their steps arrive
- `policy.scan`, `policy.feed_sync` (step 4b, with `supply-chain-policy.md`);
  `verify.reevaluate`, `verify.tuf_refresh`, `verify.revocation_refresh` (step 4b, AC15);
  `index.merge` and `signing.resign` (step 7, AC11, AC14's cadence clause); `replication.sync`
  (step 10). Each lands with its kind's row in `kinds_test.go` (AC8) and the proxied-path cases
  where it has one (AC17)

## Tasks

Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. Nine questions were written in decision shape and adopted under the owner's standing
delegation; each is recorded below and folded through Scope, Design, the criteria and the Test
Plan.

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

Folded into Context, "Implementation Phases", and the `project-charter.md` consequence.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-27 | 998b03a | authoring pass: grounded first draft, not a review | Gathered the requirements `data-model.md` (the `Operation` entity, AC32, the non-root table's grace note), `management-api.md` (deferred kinds, 202 and poll, idempotency, `Operator` dispatch, retention keys), `signing-service.md` (merge contract, cadence re-sign, the goroutine exception), `artifact-verification.md` (re-evaluation worker, refreshes), `supply-chain-policy.md` (scans, retries, feed sync), `replication.md` (resumable transfers), `generic.md` (retention pass), `storage-and-gc.md` (sweep exclusivity, session grace hold), `write-triggered-services-prototype.md` (questions 4 to 6, AC8 to AC12) and the format specs placed on the step 6a subsystem, plus consequences items 3 (format-management fold), 2 and 14 (management-api), 15 (signing-service) and 9 (storage-and-gc). Grounded prior art fetched this run: River's docs (transactional enqueue, maintenance services, unique jobs, retries, cancellation) and brandur.org's argument, Pulp's `worker.py` (SKIP LOCKED claim, resource locking, wake-up and cancel channels, missing-worker rule), Harbor's jobservice README (kinds, statuses, retries, stop and cancel, limitations), Nexus's tasks page, Gitea's `[queue]` section, PostgreSQL's `SKIP LOCKED` documentation, AIP-151; Pulp's architecture page answered 403 and 404 and is recorded as silence beyond the source. Design: one PostgreSQL-backed queue with transactional enqueue, SKIP LOCKED claim, lease with fencing token, fenced transactional `Finish` carrying effect, `Operation` and job together, bounded retries, coalescing and exclusivity by partial unique index, cooperative cancel, pause and resume, a leader-elected scheduler with database-held schedules, a repository grace hold for unfinished jobs, and the enumerated crash-recovery table. Nine questions written in decision shape and adopted under the standing delegation. 26 criteria, each with a Test Plan row; `node scripts/check-spec.js` run against this file with zero failures. Stays draft; awaits an independent review. |
