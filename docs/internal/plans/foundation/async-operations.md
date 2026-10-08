---
status: planned
status_description: "Fable follow-up round 6, 2026-10-08 at 2811a0f, still planned: the items queued since round 5 applied and verified against write-triggered-services-prototype, signing-service, data-model, management-api and debian at HEAD or in the working tree, one optional citation declined because its target text does not yet exist (Phase 1 opens on the Job row, the PausedKind record and the pause pair that charter step 4a lands for the prototype's disposable claim loop, internal/async replacing the loop, lease and fence code alone, a row-shape change the loop forced being a data-model revision request before Phase 1, prototype was-Q2, data-model Build placement and Phase 5, management-api AC32 and Phase 2, in Context, the pause bullet, AC10, AC19 naming PausedKind, the phases and the was-Q6 and was-Q9 notes; a signing.resign row's next run has three writers and no creator but RegisterSchedules, the cadence's Finish, every transaction producing a windowed document for the pointer from the expiry on its PointerDocument record, and a shortening writing every other signed pointer's row to now with the repository-scoped row untouched, a row written due coalescing with a pending job and waiting behind a running one, signing-service was-Q26 and AC22, data-model AC36, in Context, the kind row, The scheduler, AC14 and its row gaining window_change_test.go; index.merge gains two triggers, a rename of the virtual and a change of a declared settings document on it, each one coalesced merge in its transaction by the shared layer and never the handler, signing-service AC19, management-api AC7, debian AC13, in Context, the kind row, Enqueue, Coalescing, AC11 and its row); one question raised and adopted under the standing delegation, owner-facing (was Q12: the period exported for a derived-next-run row is floored at scheduler_interval + poll_interval + lease, since a row a shortening marks due seconds after its last run would otherwise fire ScheduleOverdue before any tick could run it; The scheduler, AC20 and its row, reported to observability). Earlier: Fable follow-up round 5, 2026-10-08 at b00d406, still planned: the items queued since round 4 applied and verified against artifact-verification, signing-service and replication at HEAD, none declined (the verify.reevaluate job calls the completion hook internal/verify declares exactly once, inside the Finish that commits its last page and on that transaction, so the index.merge rows it enqueues commit with the completion or not at all, never from an overtaken job, that Finish reading the current revision and the repository's state under a share lock on the repository row the revision write takes for update, before the fenced job update, and a Finish meeting the deleted state ending cancelled with no call, signing-service was-Q23 and artifact-verification AC3, folded into the kind row, Context, the Finish paragraph's lock order, AC15 and its row shared with trust_revision_test.go and admission_test.go; index.merge gains the completion trigger for every signed virtual listing the member and none for an unsigned one, the revision itself enqueuing nothing, AC11; replication.sync writes every link outcome to the link row and ends completed, transient only on a worker fault after the link reads failed error, never Permanent, so JobFailed stays silent on a frozen replica, replication was-Q13, AC14 and its rows gaining sync_outcome_test.go; the round-2 supply-chain optional item found applied at 71e0ccb); two gaps the change opened closed inline: a job may enqueue a job inside its own Finish and that row is under the fence (AC3, an enforcer row, fence_test.go), and such an enqueue records the enqueuing job's span and the originating request_id (AC27). Earlier: Fable follow-up round 4, 2026-10-01 at 71e0ccb, still planned: the three items queued since round 3 applied and verified against replication, signing-service and supply-chain-policy at HEAD, none declined (a replication.sync schedule keeps enqueuing under read_only while the applier's entry point refuses each run read-only so the link reports failed until the thaw, and is disabled in the transaction that ends its link, takeover as deletion, replication AC22 and AC23, with AC14's row sharing internal/replication/sync_job_test.go and readonly_replica_test.go; signing.resign rows are created only by signing.Service.RegisterSchedules, by the runtime at a pointer's first windowed document and by the takeover transaction with now, Finish rewriting next runs and creating no row, signing-service AC23, with AC14's row sharing internal/signing/schedules_test.go; AC14's row names internal/policy/feed_sync_test.go as shared with supply-chain AC23); one adversarial correction (replication.sync commits each snapshot's apply before its fenced Checkpoint, so proxy.revalidate is no longer called the one kind whose effect commits outside the fence, the Finish paragraph and AC8's row saying why that is safe); one consequence reported to replication (the terminal state of a sync job refused read-only or meeting an ended link is unnamed). Earlier: Fable follow-up round 3, 2026-10-01 at ac597f6, still planned: the one item queued since round 2 applied and verified against management-api at HEAD, none declined (the jobs listing, cancel and pause routes are registry-wide, so a non-admin principal, an admin-owned token and a repository-scoped token holding every action are refused unauthorized and a credential-less request unauthenticated, never not-found, the existence oracle protecting only what a caller cannot read, management-api AC35 and its was-Q18; the poll and operation-cancel routes keep not-found for a principal lacking the originating authorization, AC5; AC21 and its internal/manage/jobs_routes_test.go row, now shared with management-api AC35's refusal_types_test.go, the Cancel and Pause bullets and Context). Earlier: Fable follow-up round 2, 2026-10-01 at fc55b40, still planned: the three items queued since round 1 applied and verified against their sources, none declined (the schedule label on the two async_schedule_* series is the kind, or the kind with its source or link name, never a repository or pointer name, a repository- or pointer-scoped kind exported as its most overdue enabled row with a derived-next-run kind's period read as next_run_at - last_run_at, in The scheduler and AC20 with internal/async/metrics_test.go shared with observability AC5; verify.reevaluate pages through verdicts whose revision is not current, superseded derived and never a mark, the overtaken job ending at its checkpoint, AC15; feed_sync:{source} and the schedule label carry the source's name, osv for the default feed, AC14, AC20); one sibling discrepancy reported (supply-chain-policy's feed paragraph keys the schedule by kind where its own reconciliation item keyed it per source). Earlier: Fable follow-up 2026-10-01 at ec38840: the seven items the sibling rechecks and follow-ups queued after this spec was planned applied, none declined (the job context from one telemetry.WithJob call per claim with the per-job secret set, AC27; the refresh schedules registered by internal/trustsource; Finish's on-a-transaction form in two shapes, the document-only one under repository.Renewable for the index.merge swap and the signing.resign run, so a frozen repository is merged and renewed, with the lock order stated, AC11, AC14; a merge job naming its virtual and a re-sign job its repository so deletion cancels them, AC28; signing.resign and replication.sync not suspended by read_only; the requested_cells_max cap recording and enqueuing nothing, AC29; the proxy-cache adoption-twice citation; stale reported wording now cited to data-model AC41 and PausedKind, storage-and-gc AC23 and deployment); AC5 gains the frozen-repository refusal found by the adversarial pass; stays planned. Planned by the Fable recheck of 2026-10-01 at e8f554d: a full review pass over the cloud-authored whole plus the re-examination of the eleven questions adopted without Fable. Q1, Q2, Q3, Q6, Q8, Q9 and Q11 confirmed; Q4 amended (the grace hold is declared per kind, HoldsGrace copied to the row at enqueue, proxy.revalidate false, so storage-and-gc AC23's clause on it inverts; owner-facing), Q5 amended (a cancel_requested column makes a running-job cancel survive a lost notification and a lease expiry), Q7 amended (a rescue at max_attempts ends the job failed; the termination bound counts claimable time), Q10 amended (async.Skip for a manage.apply job whose operation kind this process's handler lacks). None superseded. Adversarial findings fixed: the held exclusive key is a claim-query predicate rather than an UPDATE-time violation (AC12), NOTIFY is issued inside the enqueuing transaction (AC1), Finish opens the repository write through the sole constructor's on-a-transaction form (AC5), the startup check that refused the default retentions is gone (AC22), the paused set is a shared-schema record. Queued items applied: EnqueueRevalidation(ctx, tx, remote), the deferred_threshold citation removed, credential.prune registered, index.merge enqueued by a local member's promotion or rollback through Transition, the read-driven cell's enqueue-only transaction also writing the requested cell, AC30's row citing auth AC10, rubygems added as a merge consumer. 30 criteria, each with a Test Plan row; zero open questions; fable_recheck cleared. Consequences reported for data-model (cancel_requested, holds_grace, the paused-kind record), storage-and-gc (AC23, the constructor's on-a-transaction form), deployment (the retention check, connection sizing), credential-management (pre-4b placement of credential.prune) and signing-service (a cross-process adoption note). Earlier: closing reconciliation sweep 2026-09-28 at b7640dd on Opus (not a review): the kind table matches signing-service and proxy-cache as settled. index.merge is enqueued by a member write, a virtual's creation, each member-list change and a remote member's adoption through the adoption-commit hook (signing-service was-Q15, was-Q16; AC11 extended). signing.resign gains the one repository-scoped schedule under repository:{repository} beside the per-pointer ones (signing-service AC33, hackage was-Q16; AC14 extended). New kind proxy.revalidate (proxy-cache was-Q18, AC26): enqueued by EnqueueRevalidation from ServeDocument on a virtual read (its own enqueue-only transaction) and inside the virtual-creation and member-change transactions, key revalidate:{repository} for coalesce and exclusivity, run_at now, no Schedule, nothing enqueued under proxy.offline, read_only or deleted, its effect an adoption whose hook enqueues index.merge (AC29). The queue gives no job a principal and never holds the replay entry, since the replay runs below the authorizer (auth AC36, FHI AC18; AC30). Q11 adopted: RetryAt(err, at), run_at the later of at and the backoff, counted as an attempt, so a rate limit moves run_at past RetryAfter (AC7, AC24). Context's format list rewritten from each format spec's own virtual section (rpm, conda, arch, alpine, opam, cran, plus chef, luarocks, maven, helm, are index.merge consumers; julia, pub, vagrant, composer, homebrew, openvsx, puppet, swift, terraform, conan resolve per request and ask nothing), and Ansible's import is deferred on manage.apply (ansible was-Q9). 30 criteria, each with a Test Plan row; eleven questions resolved, zero open; carries fable_recheck; stays draft pending a gate review. Earlier: reconciled 2026-09-28 at 9ebf6e9 with the foundation authoring wave (not a review): repository deletion cancels pending jobs in its transaction, cancels running ones cooperatively, disables repository-scoped schedules and a job meeting the deleted state ends itself, through CancelByRepository (AC28); a job of a kind this process has no worker for is skipped for a newer or older binary, never failed and never a refused start (Q10 adopted, AC26 rewritten); the scheduler lock is internal/db/lock.LockScheduler and the leader runs the state-gauge collector (AC14); the kind table is fixed by each owning spec (policy.feed_sync one schedule per source under feed_sync:{source}, replication.sync per link at replication.sync_interval, verify kinds distinct from their period keys on purpose, storage kinds at the gc.*_interval keys); the async_* series and four alerts under observability's names (AC20), trace_context and request_id at enqueue with a linked job span (AC27); Job and Schedule cited as data-model's (AC41) and cancelled as admitted (AC32); the eleven keys under scripts/check-config-keys.js (AC22); Context restated against the charter's 4b/6a placement and every sibling as it now stands. 28 criteria, each with a Test Plan row; ten questions resolved, zero open; stays draft pending a gate review. Earlier: authored 2026-09-27 at 998b03a as a grounded first draft, not yet reviewed. Gathers the deferred-execution requirements management-api.md (deferred kinds, 202 plus Operation, poll route, idempotency), data-model.md (the Operation entity and its atomic terminal transition), signing-service.md (virtual merge contract and the cadence re-sign), artifact-verification.md (the re-evaluation worker), supply-chain-policy.md (scans, retries, feed sync), replication.md (resumable transfers), generic.md (the retention pass), the write-triggered services prototype (its questions 4 to 6 and AC8 to AC12) and the format specs placed on the step 6a subsystem, and fixes one PostgreSQL-backed job queue with leased, fenced, transactional completion that every deferred and scheduled activity in the registry runs on. Nine questions written in decision shape and adopted under the owner's standing delegation; zero open. 26 criteria, each with a Test Plan row. Awaits a /spec review pass."
description: "Spec for the shared asynchronous-operation subsystem: one PostgreSQL-backed job queue (SKIP LOCKED claims, leases with fencing tokens, transactional enqueue and completion, bounded retries, coalescing and exclusivity keys, cooperative cancellation, pause and resume, a leader-elected scheduler) that executes every deferred management operation behind data-model.md's Operation record and every scheduled or background activity the sibling specs name: virtual merges, cadence re-signing, the revalidation of remotes reached only through a virtual, verdict re-evaluation, scans and feed sync, replication transfers, retention passes and the GC sweep."
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
placement of the whole subsystem was a reconciliation act, not an owner decision. Three
things the queue core runs on precede it by a step: the `Job` row (`holds_grace` and
`cancel_requested` included), the `PausedKind` record and the pause pair of the
job-administration routes land at step 4a with the prototype's asynchronous half, whose
disposable claim loop runs over the production row and is held by the production route, so
that `internal/async` replaces the loop, the lease and the fence code and inherits the rows
(`write-triggered-services-prototype.md`'s resolved runner-substrate decision, was Q2 there,
owner-facing; `data-model.md` "Jobs and schedules", "Build placement", Phase 5;
`management-api.md` AC32, Phase 2; Phase 1 below).

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
  `trace_context` and `request_id` columns `observability.md` AC16 asked for, the
  `cancel_requested` and `holds_grace` columns and the `PausedKind` record this spec's Fable
  recheck reported (carried since its Fable follow-up of 2026-10-01; AC41), the rule that
  `read_only` suspends only the `retention.pass` schedule among a repository's own, and the
  rule that "an unfinished job naming a repository and carrying `holds_grace` holds that
  repository's grace open, exactly as an unexpired upload session does", which replaced its
  earlier wording that a pending operation's bytes are protected only by the repository-scoped
  grace and left the answer to the prototype's question 5. Its "Build placement" bullet and
  Phase 5 build the `Job` row and the `PausedKind` record before the prototype's asynchronous
  half at charter step 4a, not with the queue core, and state that "a row-shape change the
  loop forces is a revision request to this spec" before Phase 1 here (since its Fable
  follow-up of 2026-10-08, round 5). Its `PointerDocument` record carries the expiry
  `Generate` reported where the document has a validity window (its AC36), the value every
  `signing.resign` next run is now derived from.
- **`management-api.md`** owns the wire. Its Scope excludes "Execution of deferred operations":
  this spec "owns workers, retries, leases", pausing and the cancellation mechanics; that spec
  owns the operation's wire shape, its `Operation` record and its poll and cancel routes, so
  the two are one contract seen from two sides. Its Design fixes: a handler "declares, per kind,
  whether `Apply` runs inline or is deferred; the API answers 201 with a completed `Operation`
  for the former and 202 with a `pending` one and a `Location` for the latter", the deferred
  path "commits the same way (one snapshot, atomic with the terminal transition)", the poll
  route `GET /api/v1/operations/{id}` needs the originating write's authorization,
  `Idempotency-Key` with `operation-outstanding` (409) meaning "job not terminal", the
  `management.operation_retention` (90 days) key and no deferral-threshold key (inline or
  deferred is declared per kind at authoring by the AIP-151 rule of thumb; the key its
  authoring draft listed was removed on its Fable recheck), a deferred `Apply` declaring its
  claims again on the runner's write transaction so that a coordinate retired between enqueue
  and run ends the operation `failed` with nothing committed (its resolved claimed-coordinate
  decision, was Q14 there, as amended; AC16), and AC16 and AC17 assert them. Its endpoint table carries the routes this spec
  asked for: `POST /api/v1/operations/{id}/cancel`, `GET /api/v1/system/jobs`,
  `POST /api/v1/system/jobs/{id}/cancel` and `POST`/`DELETE /api/v1/system/jobs/kinds/{kind}/pause`
  (its AC16, AC32). The pause pair lands first, at charter step 4a with the prototype's
  asynchronous half, over `data-model.md`'s `PausedKind` record, so the prototype's disposable
  claim loop is held by the production route; the listing and the cancel route land with the
  queue core at step 4b, and its AC32 holds the pause whether the claimant is that loop or this
  runner (its Phase 2, since its Fable follow-up of 2026-10-08, round 6). Its one refusal rule
  (its resolved refusal-type decision, was Q18 there,
  adopted on its round-2 Fable follow-up of 2026-10-01; AC35) answers the three jobs routes,
  which address no repository, `unauthorized` to every non-admin principal and
  `unauthenticated` to a credential-less request, the existence oracle protecting only what a
  caller cannot read, while the poll and cancel routes keep `not-found` for a principal lacking
  the originating authorization, the operation being a row that principal may not see (its
  AC16; AC21 here).
- **`signing-service.md`, "Virtual merges: deferred, coalesced, signed with the virtual's key"**,
  fixes the merge contract and executes it here as the `index.merge` kind: "A completed write on
  a member enqueues a merge for every virtual that lists it; merges for one virtual within a
  coalescing window run once; the window and a staleness bound ... are configuration", "the
  previous merged document set serves until the new one commits atomically; a merge that fails
  leaves the previous set and an alert", `index.virtual_merge_window` 5 s and
  `index.virtual_staleness_bound` 60 s, "run as deferred work, never on a request's path",
  asserted by its AC19 on the production runtime (`internal/async`). Eight things enqueue it: a
  member's write, through the pre-commit hook in the member's write transaction; a
  target-moving transition of a `local` member's default pointer (a promotion into it, a
  rollback), through the runtime's `Transition`, which the pointer store invokes inside the
  repoint, "since a rollback changes what the member's head holds without any write" (its
  resolved remote-member decision, was Q16 there, as amended on its Fable recheck; its AC19); a
  virtual's creation, "its first merge enqueued at creation"; a change of the virtual's member list, "and
  one per member-list change" (a member-list change is also a document-only transition of the
  virtual's pointer, its resolved virtual-freshness decision, was Q15 there, AC34); and a remote
  member's adoption of a new upstream revision, which is cache materialisation rather than a
  write, so the runtime registers on `proxy-cache.md`'s **adoption commit** and enqueues
  `index.merge` for every virtual listing the remote inside the adoption transaction, "with the
  same coalesce key as a member write" (its resolved remote-member decision, was Q16 there,
  AC35); and a member's completed re-evaluation, which is neither a write nor an adoption, so
  the runtime also registers on it: `internal/verify` declares a one-method **completion hook**
  as the consumer, the composition root hands it the runtime, and the runtime's `Reevaluated`
  enqueues `index.merge` for every virtual whose profile signs and lists the repository as a
  member and nothing for an unsigned one, because a signed merge carries a verdict superseded by
  a trust-set revision as pending, with the previous outcome, until the re-evaluation ends, and
  the revision itself enqueues no merge (its resolved pending-verdict decision, was Q23 there,
  owner-facing, since its Fable follow-up of 2026-10-01, round 4; its AC36); a rename of the
  virtual, which "enqueues one merge in the rename transaction, coalesced like any trigger,
  instead of the `configure` rename a handler's `Apply` would receive on a `local`", since a
  merged document that embeds the name is rendered by the merge and never by `Apply` (its
  "Virtual merges", AC19); and a change of a declared `settings` document on the virtual, the
  one operation a virtual accepts (`management-api.md` AC7's exception for a format declaring
  a virtual settings document), applied through the door's document-only form as a
  document-only transition of the virtual's default pointer, no snapshot, "and enqueues one
  coalesced `index.merge`, exactly as a member-list change does" (`formats/debian.md`,
  "Virtual repositories", "The `settings` document", AC13, since its Fable follow-up of
  2026-10-08; `data-model.md` AC36), the enqueue being the shared layer's inside that
  transaction and never the handler's, which imports no queue (AC16). Its cadence re-sign is the `signing.resign` `Schedule`, "a scheduled production of
  pointer documents under the current keys, creating no snapshot, durable across a restart (the
  schedule derives from the stored documents' expiry, not from a timer in memory)" (its AC22,
  on the production scheduler): one per signed pointer, exclusivity key
  `pointer:{repository}/{pointer}`, plus, for a repository whose profile declares a
  repository-scoped pointer document (Hackage's `root.json` and `mirrors.json`), "one
  repository-scoped `signing.resign` schedule, exclusivity key `repository:{repository}`, which
  alone renews that document, as one repository batch across every pointer" (`hackage.md`'s
  resolved root-placement decision, was Q16 there; its AC33). Those rows are created by one
  named entry point, `signing.Service.RegisterSchedules(ctx, tx, repository, nextRun)`, on the
  caller's transaction and idempotently: the runtime calls it inside the write or repoint that
  first gives a pointer a document with a validity window, with the expiry-derived value, and
  `replication.md`'s takeover transaction calls it with now; it stays the only creator, and a
  row's next run has three writers, none of which creates a row: the worker's `Finish`;
  **every transaction that produces a windowed document**, which writes that pointer's row from the document it produced, "whatever opened
  the transaction (the completed write that moves the default pointer, a repoint, a
  document-only transition of any kind, the cadence job's `Finish`, the takeover's request-path
  batch), so no row ever holds a next run later than the fraction point of its pointer's
  current document"; and **a shortening**, a transaction whose document carries a window
  shorter than its predecessor's on the same pointer, which "writes every other signed
  pointer's row's next run to now, so the scheduler's next tick renews each through the
  cadence", the repository-scoped row untouched, while a lengthening changes nothing beyond
  the first rule (its "Rotation profiles", "A changed window", "Replication", AC22, AC23; its
  resolved changed-window decision, was Q26 there, owner-facing, since its Fable follow-up of
  2026-10-08, round 8). Its package starts no goroutine
  that outlives a request, the former cadence-scheduler exception having become a `Schedule`
  here.
- **`proxy-cache.md`, "Revalidation outside the request"** (its resolved revalidation-replay
  decision, was Q18 there, AC26): a `remote` reached only through a `virtual` receives no request
  of its own, so its revalidation is the `proxy.revalidate` job kind, "owned here [in
  `proxy-cache.md`] and run by `async-operations.md`". Its only argument is the remote; it is
  enqueued through `EnqueueRevalidation(ctx, tx, remote)`, which "takes the caller's
  transaction and inserts the row in it through `Enqueue(ctx, tx, Job)`", "with coalesce key
  and exclusivity key `revalidate:{repository}`", by three callers: the virtual's read path,
  that is `signing-service.md`'s `ServeDocument` when it serves a virtual's merged document
  whose input from the remote is past the remote's TTL, and the same path when a request to the
  virtual names a cell no member input covers (a tree only the remote holds), which records the
  cell on the virtual's input record in the enqueue-only transaction of the enqueue (its
  resolved member-input decision, was Q21 there; `data-model.md` AC45); a virtual's creation;
  and a member-list change adding a never-adopted remote, "the last two inside the transaction
  that makes the change". "The job is never scheduled"; "while
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
  "supersedes, by the derived rule above, every verdict computed under an earlier revision" and
  enqueues one `verify.reevaluate` job in its own transaction; superseded "is a derived state,
  never a written mark" (every verdict carries the revision it was computed under, and it is
  superseded when that differs from the repository's current revision), so the job "pages
  through the repository's verdicts whose revision is not current, oldest first, and commits a
  checkpoint per page", so that "no verdict is ever lost to a crash and none is ever recomputed
  twice", and a job overtaken by a newer revision "ends at its next checkpoint" (its "The
  verdict is a stored fact", AC3, its resolved timing decision, was Q1 there, as amended on its
  Fable recheck). The job calls the completion hook "exactly once, inside the `Finish` that
  commits its last page", handing the hook that transaction "as `Enqueue(ctx, tx, Job)`
  requires, so the enqueue commits with the completion or not at all", and "never from an
  overtaken job": that `Finish` "reads the repository's current revision under a share lock on
  the row that carries it, which this spec's revision write takes for update (a repository-row
  share lock before the fenced job update, that spec's lock order), so the race is decided
  atomically"; a job finding the repository deleted ends `cancelled` and calls nothing, and
  the revision's transaction enqueues the job "and **no merge**" (its "The completion is a
  trigger", AC3, since its Fable follow-up of 2026-10-08). Bounded by
  `async.kind_limits` (`verify.reevaluate: 4`; there is no `verify.workers` key, per
  `deployment.md`'s resolved worker-limit decision, was Q11 there); plus the
  `verify.tuf_refresh` and `verify.revocation_refresh` schedules with periods
  `verify.sigstore.refresh` (24 h) and `verify.revocation.refresh` (12 h), disabled under
  `proxy.offline` (its AC22). `internal/verify` registers only the `verify.reevaluate` worker;
  the two refresh schedules are registered by `internal/trustsource`, the sibling package that
  holds every network-reaching trust source, because `internal/verify/**` performs no network
  I/O (its resolved trust-source decision, was Q3 there, as amended on its Fable recheck; its
  AC22).
- **`supply-chain-policy.md`, "Scanning is asynchronous; enforcement is synchronous"**: "An
  artifact is scanned after ingest" as a `policy.scan` job with coalesce key `scan:{digest}`
  and a kind-declared retry bound, an artifact unscanned past
  `policy.scan.unscanned_alert_after` counting in `policy_unscanned_past_bound` (its AC6); and
  the feed sync is a `policy.feed_sync` `Schedule`, one per OSV-schema source (the default feed
  and each `policy.feed.sources` entry), period `policy.feed.sync_interval`, suspended under
  offline mode (its AC16, AC21); every source has a name, the `policy.feed.sources` entry's
  `name` or `osv` for the default feed, reserved, and that name is the value its `source`
  label, its schedule label and the import route share (its "The advisory feed and its
  freshness", as settled on its Fable follow-up of 2026-10-01; its AC21).
- **`replication.md`**: each active link is a `Schedule` on `internal/async` enqueuing a
  `replication.sync` job with exclusivity key `link:{id}` and a checkpoint per completed
  snapshot, period `replication.sync_interval` unless the link sets its own, so that
  "interrupted transfer resumes from the last completed snapshot rather than restarting" (its
  AC3, AC23) and "a transfer killed midway leaves every mirrored pointer on the most recently
  completed target" (its AC2). Since its Fable gate review of 2026-10-01: the link's `Schedule`
  is disabled in the transaction that ends the link, takeover as deletion, "so nothing enqueues
  a sync for an `ended` link" (its AC23); a replica frozen `read_only` keeps its schedule
  enqueuing while "the applier's entry point waives `ErrReplica` alone and still refuses
  `ErrReadOnly`", so each sync applies nothing and the link reports `failed` with reason
  `read-only` until the thaw (its AC22); and the takeover transaction registers the taken-over
  repository's `signing.resign` schedules through `signing-service.md`'s `RegisterSchedules`
  with their next run now, the same request then re-signing every pointer document on the
  request path, not on the queue (its resolved takeover-signing decision, was Q12 there; its
  AC21).
- **`formats/generic.md`, resolved retention-placement decision (was Q11 there)**: "an age rule
  must fire while nobody is writing, so retention cannot be handler code"; a retention pass is
  "one completed write" in `internal/retention` that runs "outside any request".
- **`storage-and-gc.md`**: the sweep, orphan scan and pruning are the `storage.sweep`,
  `storage.orphan_scan` and `storage.prune` kinds enqueued by this scheduler at
  `gc.sweep_interval`, `gc.orphan_scan_interval` and `gc.prune_interval`, the sweep holding
  `internal/db/lock.LockSweep` for its whole run as a second guard (its AC26); a cache fill,
  an adoption and a map build each commit the `Blob` row and its first reference in one
  transaction and count as write activity for the remote's grace (its AC8); and an unfinished
  job carrying `holds_grace` and naming a repository holds that repository's grace open (its
  AC23), which its own Fable recheck had restated at full size for `proxy.revalidate` ("a leak
  for the duration, never a loss", the per-job hold being re-enqueued by continuous virtual
  reads under an upstream rate limit that never lifts) while noting that "a kind-level
  exemption from the hold stays available". This spec's Fable recheck took the exemption (the
  resolved grace-hold decision below, was Q4, as amended), and that spec's Fable follow-up of
  2026-10-01 inverted the clause: its AC23 now reads the hold from the row's flag, `true` for
  every kind but `proxy.revalidate`, which holds nothing. Its single door has an
  on-a-transaction form for this spec's `Finish`, with a document-only shape under
  `repository.Renewable` for the merge swap and the cadence re-sign, and fixes the lock order
  documents, member rows, head, job row (its AC25, AC30).
- **`credential-management.md`, "A revoked or expired token stays listed", AC6**: a revoked or
  expired token's row is kept for `credentials.revoked_retention` (90 days) and then "pruned by
  a `credential.prune` job on `async-operations.md`'s runner, one daily `Schedule` with the kind
  as its exclusivity key and no configuration key of its own", an exchange-minted token's row
  pruned at its expiry instead; the audit line survives the prune, and the kind's row in
  `kinds_test.go`'s table is named by its AC6.
- **`repository-lifecycle.md`, "Deletion", AC21**: deleting a repository cancels every pending
  job naming it in the deletion transaction, cooperatively cancels the running ones, disables
  the repository-scoped `Schedule`s, and expects a job that observes the deleted state at its
  next step to end itself without a write; the grace hold stands until the job is terminal.
- **`observability.md`**, metric and alert catalogue, AC7 and AC16: the `async_*` series and
  the `JobFailed`, `ScheduleOverdue`, `SchedulerLeaderless` and `VirtualMergeStalenessBreach`
  alerts by name; state-derived gauges collected on the scheduler leader only; the `schedule`
  label on `async_schedule_last_run_timestamp_seconds` and `async_schedule_period_seconds`
  fixed on its Fable follow-up of 2026-10-01 (its resolved `schedule`-value decision, was Q9
  there, owner-facing; its "Cardinality", AC5) to the kind, or the kind with its `source` or
  `link` name, never a repository or pointer name, a repository- or pointer-scoped kind
  exported as its most overdue row; a job's span
  linked to the enqueuing request's span and its audit line carrying that request's id; and,
  from its Fable recheck, the runner calling `telemetry.WithJob(ctx, id, kind, requestID)`
  once per job before `Work`, which puts `job_id`, `kind` and the enqueuing `request_id` on
  every record the job emits and installs the per-job secret set that `telemetry.MarkSecret`
  appends to (the upstream adapter marks credentials under `proxy.revalidate` and
  `replication.sync`), so a replay is recognised in the log by its kind and its absent
  principal, never by the replay marker (its "Structured logging", "Redaction", AC31).
- **`deployment.md`**, "Upgrade and rollback policy", "Multi-replica constraints", key
  inventory: during a rolling upgrade "a kind the old binary does not know is left unclaimed
  until the rollout finishes"; the scheduler's leader lock is taken through
  `internal/db/lock.LockScheduler`, the one constant block that may issue advisory-lock SQL;
  the eleven `async.*` keys and the `async.workers: 0` web-replica recipe are in its inventory
  and its "Roles" table; its connection budget counts, outside `database.max_conns`, the
  dedicated `LISTEN` connection a process with workers holds and the scheduler-lock connection
  a candidate holds, and it relates `async.job_retention` to `management.operation_retention`
  by no check (both since its Fable recheck of 2026-10-01).
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
  its AC9 pauses `manage.apply` through the admin routes exactly as AC10 here does). Since its
  Fable gate review of 2026-10-08 (its resolved runner-substrate decision, was Q2 there,
  owner-facing), its runner "is disposable in its claim loop only": it runs over
  `data-model.md`'s `Job` and `PausedKind` records and is held through the production pause
  pair, all three landed at step 4a before that half, it registers `manage.apply` and reaches
  the handler only through `internal/manage` and `Operator.Apply`, and "what `internal/async`
  replaces at step 4b is therefore the claim loop, the lease and the fence code alone"; its
  rows "are terminal before the queue core starts claiming", the `Job` row's shape "is what
  `async-operations.md` Phase 1 reads, so a change the runner forces on it is a revision
  request to `data-model.md` before that phase" (its Scope, "The second class", AC8, Phase 4).
- **Format specs**, each read in its own virtual and dependency sections. Their only use of the
  queue besides Ansible's deferred import is the virtual merge (and, through it, the
  revalidation of remote members):
  - **Virtual-merge consumers**, whose virtual repositories are re-merged by the `index.merge`
    kind: `debian.md`, `cpan.md` and `hackage.md` require this spec `planned` before their
    virtual phase (Phase 5 in each); `rpm.md`, `conda.md`, `arch.md`, `alpine.md`, `opam.md`
    and `cran.md` state that their one deferred piece is the virtual merge on this runner, whose
    queue core the charter builds at the start of step 4b, before any of them (opam's Phase 4
    "waits on `async-operations.md`'s queue core"); `chef.md`, `luarocks.md`, `maven.md` and
    `helm.md` merge their virtuals through the same kind, recording that nothing is required of
    this spec directly because `signing-service.md` owns the kind; and `rubygems.md`, whose
    merged `/versions` is "an appending log of its own: each merge (`signing-service.md`'s
    `index.merge`) computes, per name, the delta" and appends it (its resolved virtual decision,
    was Q7 there; `signing-service.md` AC19 tests it with a RubyGems-shaped fixture). Their
    remote members are the ones `proxy.revalidate` keeps fresh, since only a format with a
    `Merge` enqueues it (`proxy-cache.md`, "A per-request virtual needs none of this").
  - **Asking nothing**, because every write completes inside its request and a virtual is
    resolved per request with no stored merge (no `index.merge` job and no `proxy.revalidate`
    job exists for them): `julia.md` (an unmerged union), `pub.md`, `vagrant.md` (its resolved
    virtual-catalog decision, was Q13 there), `composer.md`, `homebrew.md`, `openvsx.md`,
    `puppet.md`, `swift.md`, `terraform.md` and `conan.md`, and the formats whose virtual
    resolves a name at its first member in member order with no `Merge` in any generator
    profile: `npm.md`, `pypi.md`, `cargo.md`, `go-modules.md`, `nuget.md` (its search merges
    the members' answers inside the request), `oci.md` and `generic.md`. `hex.md` declares
    `Virtual: unsupported`.
  - `nuget.md` regenerates its hosted indexes inside the write (no indexing delay is deferred),
    and `maven.md` declined a staging operation, so none of the "indexing delay" shapes the
    loop's hint named is a consumer.

Nothing in the tree implements any of this: at e8f554d the module's only Go file is
`cmd/stackweaver-registry/main.go` and `internal/` holds no code, so every claim in this spec
is design, verified against sibling specs and the prior art fetched at authoring rather than
against code.

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
- The GC interaction: an unfinished job of a grace-holding kind holds its repository's grace
  open, the hold declared per kind at registration and held by every kind except
  `proxy.revalidate` (the resolved grace-hold question below, as amended), answering the
  prototype's question 5 in design and leaving the prototype's AC11 to verify it.
- Operator controls (list, cancel, pause, resume) as `management-api.md` routes, the runner's
  configuration keys (`deployment.md`'s inventory), metrics and alerts (`observability.md`'s
  catalogue); what each must say is fixed here.
- What repository deletion does to the queue: pending jobs cancelled in the deletion
  transaction, running ones cancelled cooperatively, repository-scoped schedules disabled, a job
  that meets a deleted repository ending itself (`repository-lifecycle.md` AC21); and what
  `read_only` does: only the repository's `retention.pass` schedule is suspended, while its
  `signing.resign` schedules keep running through the door's document-only form and its
  `replication.sync` keeps enqueuing, each run refused `read-only` at the applier's entry
  point so the link reports `failed` until the thaw while the job ends `completed`, the link
  row being the record of every outcome the link table names (`repository-lifecycle.md`'s
  resolved document-only-transitions decision, was Q11 there; `replication.md` AC22, its
  resolved sync-outcome decision, was Q13 there; `data-model.md`
  "Jobs and schedules"); and what the end of a replication link does: its schedule is
  disabled in the transaction that ends it, takeover as deletion (`replication.md` AC23).
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
| `signing-service.md` virtual merge (its AC19, AC34, AC35) | `index.merge` | the metadata store's pre-commit hook on a member write, in the member's write transaction; the runtime's `Transition` on a target-moving transition of a `local` member's default pointer (a promotion into it, a rollback), inside the repoint (its resolved remote-member decision, was Q16 there, as amended; its AC19); once at a virtual's creation and once per change of its member list, in the transaction making it (`repository-lifecycle.md`; its resolved virtual-freshness decision, was Q15 there); and a remote member's adoption of a new upstream revision, through the hook registered on `proxy-cache.md`'s adoption commit, in the adoption transaction, for every virtual listing the remote (was Q16 there); and a member's completed re-evaluation, through the one-method completion hook `internal/verify` declares and the runtime's `Reevaluated` satisfies, called inside the `verify.reevaluate` job's completing `Finish` on that job's transaction, for every virtual whose profile signs and lists the repository as a member and for no unsigned one, the trust-set revision itself enqueuing none (its resolved pending-verdict decision, was Q23 there; its AC36; `artifact-verification.md` AC3); a rename of the virtual, once in the rename transaction, which calls no handler `Apply` (its AC19); and a change of a declared `settings` document on the virtual, a document-only transition of its default pointer through the door's document-only form, once in that transaction, by the shared layer and never the handler, exactly as a member-list change (`management-api.md` AC7; `formats/debian.md` AC13); `run_at` now plus `index.virtual_merge_window` | coalesce key `virtual:{repository}`; exclusivity key the same; repository reference the virtual, so the virtual's deletion cancels the job (`repository-lifecycle.md`, "Deletion" step 8) and the job's grace (held, as for every kind but one) covers any merged body put to the CAS before the swap commits | the virtual's current-document swap, its merged documents' declared blob-digest lists, the input record, and the document-only transition of its default pointer (no snapshot), through the door's document-only form under `repository.Renewable` (Finish, below) |
| `signing-service.md` cadence re-sign (its AC22, AC23, AC33) | `signing.resign` | a `Schedule` per signed pointer; and, for a repository whose profile declares a repository-scoped pointer document (`hackage.md`'s resolved root-placement decision, was Q16 there), one repository-scoped `Schedule`, the only one that renews that document, as one repository batch across every pointer. The rows are created by one named entry point, `signing.Service.RegisterSchedules(ctx, tx, repository, nextRun)`, on the caller's transaction and idempotently (a new row takes the caller's `nextRun`, an existing row is left untouched): the runtime calls it inside the write or repoint that first gives a pointer a document with a validity window, with the value it derives from that document's expiry and `signing.resign_at_fraction`, so a signed pointer never exists without its row and a document the write just signed is not re-signed at commit; `replication.md`'s takeover transaction calls it with now, so a taken-over repository has a cadence before any write. Each later next run is derived from the expiry on the pointer's current `PointerDocument` record (`data-model.md` AC36) and has three writers, none creating a row: the worker's `Finish`; every transaction that produces a windowed document for the pointer (the completed write that moves it, a repoint, a document-only transition, the takeover's request-path batch), which writes that pointer's row from the document it produced, so no row ever holds a next run later than the fraction point of its pointer's current document; and a shortening, a transaction whose document carries a window shorter than its predecessor's on the same pointer, which writes every other signed pointer's row of the repository to now in the same transaction, the repository-scoped row untouched, so the idle pointers are renewed through the cadence at the next tick under the new window (`signing-service.md` "Rotation profiles", "A changed window", "Replication", AC22, AC23, its resolved changed-window decision, was Q26 there; `data-model.md` "Jobs and schedules") | per pointer: exclusivity key `pointer:{repository}/{pointer}`; repository-scoped: exclusivity key `repository:{repository}`; repository reference the repository. Not suspended by `read_only`: a frozen signed repository keeps renewing its envelope (`repository-lifecycle.md`'s resolved document-only-transitions decision, was Q11 there; `data-model.md` "Jobs and schedules"); disabled only by deletion | `PointerDocument` and `Signature` records (no snapshot), through the door's document-only form under `repository.Renewable` (Finish, below); the repository-scoped run re-renders the document on every pointer in one transaction |
| `proxy-cache.md` revalidation of a remote reached only through a virtual (its AC26; `signing-service.md` AC35) | `proxy.revalidate` | `EnqueueRevalidation(ctx, tx, remote)`, called from the virtual's read path (`signing-service.md`'s `ServeDocument` serving a merged document whose input from the remote is past the remote's TTL, or a request for a cell no member input covers, unless the virtual already holds `index.requested_cells_max` cells, when the read records nothing and enqueues nothing and is still answered from the merged set, `signing-service.md`'s resolved requested-cell decision, was Q22 there) in an enqueue-only transaction the read opens, which holds the job row and, for a requested cell, the entry the read writes on the virtual's input record (`data-model.md` AC45) and nothing else; and inside the transaction of a virtual's creation or of a member-list change adding a never-adopted remote; `run_at` now; **no `Schedule` of this kind exists**; nothing is enqueued while `proxy.offline` is set or the remote is `read_only` or deleted | coalesce key `revalidate:{repository}`; exclusivity key the same | nothing of its own: the effect is the adoption its replay commits through `proxy-cache.md`'s adoption transaction, whose hook enqueues `index.merge` there; `Finish` writes only the job's terminal state. A `*upstream.RateLimitError` returns the job to `pending` with `run_at` past its `RetryAfter` (`RetryAt`, below). The one kind declaring `HoldsGrace: false` (the GC grace, below) |
| `artifact-verification.md` re-evaluation (its AC3) | `verify.reevaluate` | the trust-set revision's transaction, one job per repository revision; the worker pages through the repository's verdicts whose revision is not current, oldest first, with a checkpoint per page, superseded being derived from the verdict's revision against the repository's current one and never a written mark (its "The verdict is a stored fact"), so the revision writes no verdict row and there is no mark to clear; a job that finds the revision moved past the one it was enqueued for ends at its next checkpoint, the newer revision's job covering the rest; the job calls the completion hook `internal/verify` declares exactly once, inside the `Finish` that commits its last page, the checkpoint leaving the repository no superseded verdict, handing the hook that transaction for `Enqueue(ctx, tx, Job)`, so the merges it enqueues commit with the completion or not at all and a kill before that commit is followed by one call after the rescue, never two; that `Finish` reads the repository's current revision, and its state, under a share lock on the repository row carrying the revision, the row `artifact-verification.md`'s revision write takes `FOR UPDATE`, taken before the fenced job update, so a job whose revision is no longer current completes there without the hook, a revision committing after that `Finish` finds the job completed and its own job calls the hook at its own `Finish`, a repository holding no superseded verdict reaches `Finish` after its first page and calls it once, and a `Finish` whose read meets the deleted state rolls back and ends the job `cancelled`, calling nothing (its "The completion is a trigger", AC3); bounded by `async.kind_limits` (`verify.reevaluate: 4`) | exclusivity key `verify:{repository}` | the recomputed verdict rows, each carrying the current revision, and, through the hook, the `index.merge` rows for every signed virtual listing the repository |
| `artifact-verification.md` refreshes (its AC22), registered by `internal/trustsource`, not `internal/verify`, which registers only `verify.reevaluate` | `verify.tuf_refresh`, `verify.revocation_refresh` | `Schedule`s with periods `verify.sigstore.refresh` and `verify.revocation.refresh`; disabled under `proxy.offline`. The kind names and the key names differ on purpose: a kind is a worker's registered name, a key is a period an operator sets, and `deployment.md`'s two-way check reads only the keys | exclusivity key the kind | the refreshed trust material |
| `supply-chain-policy.md` scan (its AC6) | `policy.scan` | the ingest and cache-commit hooks, in the committing transaction; the kind declares its own retry bound, and an artifact unscanned past `policy.scan.unscanned_alert_after` counts in `policy_unscanned_past_bound` | coalesce key `scan:{digest}` | scan result, component inventory |
| `supply-chain-policy.md` feed sync (its AC16, AC21) | `policy.feed_sync` | one `Schedule` per OSV-schema source (the default feed and each `policy.feed.sources` entry), period `policy.feed.sync_interval`; disabled under `proxy.offline` | exclusivity key `feed_sync:{source}`, where `{source}` is the source's name: the `policy.feed.sources` entry's `name`, or `osv` for the default feed, the reserved name its `source` label, its `policy.feed_sync:{source}` schedule label and the import route share (its "The advisory feed and its freshness", AC21) | that source's advisory rows and re-matched condemnations |
| `replication.md` sync and transfer (its AC22, AC23) | `replication.sync` | one `Schedule` per active `ReplicationLink`, period `replication.sync_interval` unless the link sets its own (never below the instance value), and on demand; disabled under `proxy.offline`; disabled in the transaction that ends the link, by takeover as by deletion, so nothing enqueues a sync for an `ended` link and a job enqueued before that commit finds the link `ended` at its next apply and ends with nothing more applied (its AC23, AC26); not suspended by `read_only`: the schedule keeps enqueuing, and each run is refused `ErrReadOnly` at the applier's entry point, which waives `ErrReplica` alone, so the sync applies nothing and the link reports `failed` with reason `read-only` until the thaw, after which the next sync resumes on the identity check alone (its AC22; `data-model.md` "Jobs and schedules"). Every outcome the link table names is the link's, not the queue's: the job writes it to the link row (`failed` with `read-only`, `unreachable`, `unauthorized` or `not-found`, `diverged`, or nothing for a link a takeover `ended`) and ends `completed`, the next tick of the link's `Schedule` being its retry; the queue's classes are kept for a fault of the worker itself, returned transient after the link reads `failed` `error`, and the kind never wraps `Permanent`, so `JobFailed` means the queue failed and never fires once per `sync_interval` on a replica an operator froze (its resolved sync-outcome decision, was Q13 there; its AC22, AC23) | exclusivity key `link:{id}`; checkpoint per completed snapshot | each snapshot's apply in its own transaction before the fenced `Checkpoint` (Finish, below): applied snapshot range, mirrored pointer moves, the link's position |
| `generic.md` retention (its resolved retention placement, was Q11 there) | `retention.pass` | one `Schedule` per repository with rules; disabled while the repository is `read_only` or deleted | exclusivity key `repo:{repository}` | one snapshot per pass |
| `credential-management.md` revoked-row pruning (its AC6) | `credential.prune` | one daily `Schedule`, instance-wide, no key of its own: a revoked or expired `Credential` row is pruned after `credentials.revoked_retention`, an exchange-minted token's at its expiry | exclusivity key the kind | the pruned `Credential` rows; the audit lines survive |
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
  claim query does not care why a job is waiting. Beside the state, a `cancel_requested` flag,
  set by a cancel of a `running` job and read by every claim, so that a cancel outlives a lost
  notification and a lease-expiry reclaim (Cancellation, below); a column of the record,
  which `data-model.md` transcribes (its Fable follow-up of 2026-10-01; AC41).
- **Scheduling fields**: `run_at`, `attempts`, `max_attempts`, `created_at`, `finished_at`,
  `last_error` (a bounded string, never a credential; `auth.md` AC7's leak scan covers it).
- **Lease fields**: `lease_owner` (the worker's instance id), `lease_expires_at`, and
  `lease_token`, a fresh random 128-bit value per claim. The token is the fencing token: every
  write the job makes to itself carries it, and a write with a stale token fails (below).
- **Keys**: `coalesce_key` and `exclusive_key`, both nullable strings, held by two partial
  unique indexes: one over `coalesce_key` where `state = 'pending'`, one over `exclusive_key`
  where `state = 'running'`.
- **References**: an optional `operation` reference (the `Operation` this job executes), an
  optional `repository` reference (the repository whose deletion cancels the job and, when the
  job's kind holds the grace, the repository whose grace it holds open), a `holds_grace` flag
  copied from the kind's registration at enqueue so the sweep reads it with the row and knows
  no kind (the GC grace, below; transcribed by `data-model.md` with `cancel_requested`, AC41),
  and a
  `checkpoint` document the worker may write between attempts.
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
(the same trigger for a remote member), a virtual's creation, member-list change, rename and
declared-settings change, `internal/manage`'s `Submit`, the ingest and cache-commit hooks and
the trust-set revision all
already run inside a transaction, so each enqueues in it; and one caller is a job: the
completion hook `internal/verify` declares runs inside the `verify.reevaluate` job's own
`Finish`, handed the transaction `Finish` opened, so the merges it enqueues are under that
job's fence (Finish, below). One caller decides on a read: the
virtual's request path, when `ServeDocument` serves a merged document whose remote input is
past its TTL or when a request names a cell no member input covers, calls `proxy-cache.md`'s
`EnqueueRevalidation(ctx, tx, remote)` with a transaction it opens for the purpose. That
transaction holds the job row and, for a requested cell, the entry the read writes on the
virtual's input record (`data-model.md` AC45; `signing-service.md`'s resolved member-input
decision, was Q21 there), and nothing else: the job's one input from the read commits with the
job or not at all, the same guarantee the write path gives, still through `Enqueue(ctx, tx,
Job)`, and the read is served the current merged set whether or not that transaction commits.
`Enqueue` issues `NOTIFY async_wakeup` with the kind as payload inside the transaction, and
PostgreSQL delivers it at commit and never for a rollback, so an idle worker wakes within
milliseconds and no notification exists without its row; a worker that missed the notification
finds the job on its next poll, `async.poll_interval` later. `Enqueue` with a `coalesce_key`
uses `INSERT ... ON CONFLICT DO NOTHING` against the pending-key index and reports whether a row
was inserted. `Enqueue` reads the current span context and request id from `ctx` and writes
them to `trace_context` and `request_id`; a caller with neither (the scheduler's tick) leaves
them null; a caller inside a job's `Work` or `Finish` has the context `telemetry.WithJob`
derived, which carries the job's span and the job's own `request_id`, so a job enqueued by a
job links to the enqueuing job's span and carries the request that started the chain (the
merge the completion hook enqueues names the trust-set write's request; AC27). `Enqueue`
refuses a kind this process has not registered, because only a
registration carries what the row needs (`holds_grace`, the kind's `max_attempts`); every
process registers every kind whatever its `async.workers`, since registration says what a kind
is and the worker count says how many run.

### Claim: SKIP LOCKED plus a lease

A worker claims in one short transaction:

```
UPDATE job SET state='running', lease_owner=$me, lease_token=$fresh,
  lease_expires_at=now()+$lease, attempts=attempts+1
WHERE id = (SELECT id FROM job j
  WHERE kind = ANY($claimable)
    AND ((state='pending' AND run_at <= now())
      OR (state='running' AND lease_expires_at < now()))
    AND (exclusive_key IS NULL OR NOT EXISTS
      (SELECT 1 FROM job r WHERE r.state='running'
         AND r.lease_expires_at >= now() AND r.exclusive_key = j.exclusive_key))
  ORDER BY run_at LIMIT 1 FOR UPDATE SKIP LOCKED)
RETURNING *
```

expressed in the store's query layer rather than as literal SQL in the spec's sense; the shape
is what matters. `$claimable` is the set of kinds this process has a registered worker for,
minus the kinds paused in the database (below) and minus the kinds at their
`async.kind_limits` ceiling in this process: a process never claims a job it could not run
now. Two rows are read under the lock and ended instead of leased: a rescued row whose
`cancel_requested` is set ends `cancelled`, and a rescued row whose `attempts` already equals
`max_attempts` ends `failed` with `last_error` naming the expired leases, because a worker that
dies never returns an error for the retry classifier to count (Retry, below). Four properties
follow:

- **One holder at a time.** Two workers cannot claim one row: the row lock excludes them and
  `SKIP LOCKED` sends the second to the next row. Across N server processes this is the whole
  mutual exclusion; there is no in-memory registry of who runs what.
- **A lost worker is a late worker, not a failed job.** A `running` row whose lease has expired
  is claimable again (the second `OR` branch), which is the rescuer: no maintenance pass and no
  heartbeat table, only the same claim query. A running worker extends its lease every
  `async.lease / 3` by an `UPDATE ... WHERE id = $id AND lease_token = $token`; if that update
  affects no row, the worker has lost its lease and cancels its own context.
- **Exclusivity by predicate, guaranteed by index.** The subselect skips a job whose
  `exclusive_key` a live `running` job holds, so a held key never sends a worker into a claim
  it must roll back and never sits at the head of the queue holding every other kind behind it
  (a `LIMIT 1` claim that only discovered the conflict at the `UPDATE` would spin on that row
  in every process). Two workers that pass the predicate for two waiting jobs of one key at the
  same instant are the race the partial unique index catches: the second `UPDATE` violates it,
  that worker rolls back, leaves the row `pending` and takes the next row. Oldest `run_at`
  first keeps a key's waiters fair. Pulp derives the same effect with an unblock pass; the
  predicate does it inside the claim.
- **An unknown kind is skipped, never failed** (the resolved unknown-kind question below, was
  Q10). During a rolling upgrade or a rollback two binaries share the table
  (`deployment.md`, "Upgrade and rollback policy"): a job enqueued by the newer binary under a
  kind the older one has no worker for is simply outside the older process's `$claimable` and
  stays `pending` until a process that registers the kind claims it. The older process logs the
  unknown kinds it sees at `Start` and whenever the set changes, at warning, and the jobs stay
  visible in `async_jobs{kind,state}` and `async_oldest_pending_age_seconds{kind}`, so a kind
  nobody will ever register surfaces as an aging queue and a `ScheduleOverdue` where it is
  scheduled, not as a failed job and not as a process that refuses to start (AC26). The same
  rule reaches inside `manage.apply`, whose `args` name a format and an operation kind: a
  process whose handler for that format does not declare the kind (a rollout adding a kind, or
  a format) cannot run the job it just claimed. Its worker returns `async.Skip`; the runner
  restores the row to `pending` with `attempts` and `run_at` unchanged and leaves that job id
  out of this process's claims for one `async.lease`, so the job waits for a process that can
  run it, neither failed nor burned down by counted attempts (the resolved unknown-kind
  decision, as amended; AC26).

Workers are `errgroup` goroutines bounded by `async.workers` under the server's context (the go
skill's bounded-concurrency rule, no hand-rolled pool). A worker loop is: wait for `NOTIFY` or
the poll tick, claim, derive the job's context, run, repeat; it starts no goroutine of its own
beyond the heartbeat, which the job's context owns. The job's context is derived exactly once
per claim, before `Work`, by `telemetry.WithJob(ctx, id, kind, request_id)`
(`observability.md`, "Structured logging", "Redaction"): it carries the job's id, kind and the
enqueuing `request_id` for every record the job emits, and it installs the per-job secret set
that `telemetry.MarkSecret` appends to, so a credential the upstream adapter marks under a
`proxy.revalidate` replay or a `replication.sync` transfer is scrubbed from every record,
`last_error` included, exactly as the request middleware does for a request. It carries no
principal (below), and a replay is told from client traffic by its `kind` and absent principal,
never by the replay marker (its AC31; AC27, AC30).

### Finish: fenced, transactional, exactly once in effect

A worker implements `Work(ctx, *Job) error`. Inside `Work` it may do external work with no
transaction open (fetch from an upstream, call a scanner, sign through a KMS, stream a transfer),
then call `job.Finish(ctx, func(tx) error)` once. `Finish` opens a transaction through the
shared metadata store at `READ COMMITTED`, runs the caller's function in it (the snapshot commit
through the metadata store, the `Operation` terminal transition, retirements, verdict rows, the
merged-document swap), and in the same transaction, as its last statement, executes `UPDATE job
SET state='completed', finished_at=now() WHERE id=$id AND lease_token=$token AND
state='running'`. A worker whose effect is a repository write opens the repository's write
scope inside that transaction through `storage-and-gc.md`'s sole write-transaction constructor
in its on-a-transaction form, callback-shaped, which runs every check the standard door runs on
the transaction `Finish` opened and refuses a joined transaction at any level but `READ
COMMITTED` (its AC25, AC30). The form has two shapes, and a kind takes the one its transition
has. `manage.apply` and `retention.pass` are completed writes: the standard shape consults
`repository.Writable`, carries the claims declared again, runs the pre-commit hook and seals
the snapshot in the commit step. The merge swap of `index.merge` and the cadence re-sign of
`signing.resign` are document-only pointer transitions (`data-model.md` AC36): they take the
form's **document-only shape**, which consults `repository.Renewable` instead, so a `read_only`
repository is renewed and merged while a replica and a deleted repository are refused, declares
no claim and seals no snapshot, writes the re-rendered documents' references through the shared
reference-creation call and advances the default pointer's freshness record under the head
lock (`repository-lifecycle.md`'s resolved document-only-transitions decision, was Q11 there;
`signing-service.md` AC22; `storage-and-gc.md` AC24, AC25). In both shapes the constructor
stays the only door to a repository write while the runner keeps commit, and a predicate
refusal returns before any repository row is touched, so the runner ends the job without a
write (`failed` with `read-only` for a completed write on a frozen repository, `cancelled` on a
deleted one; Cancellation, below). The lock order is `storage-and-gc.md`'s: the write's
document locks, then any member-row share lock, then the head, then the fenced job update, which
is also the order `internal/repository`'s deletion takes (repository rows, then the job rows
`CancelByRepository` touches), so a job's `Finish` and a deletion cancelling it never deadlock.
A kind whose `Finish` writes no repository content takes what it needs in the same order:
`verify.reevaluate` locks its page's verdict rows, then the repository row carrying the
current trust-set revision under a share lock (the row `artifact-verification.md`'s revision
write takes `FOR UPDATE`), then inserts the `index.merge` rows its completion hook enqueues and
runs the fenced job update, the repository row before every job row, which is the order the
deletion (its `Repository` row first, job rows last) and the revision write (that row, then the
job it enqueues) take as well, so none of the three cycles (`artifact-verification.md`, "The
completion is a trigger"; `repository-lifecycle.md`, "Lock order").
**If that update affects no row, `Finish` rolls the whole transaction back
and returns `ErrLeaseLost`.** This is the fence: a worker whose lease expired and was reclaimed
by another worker holds a stale token, so its snapshot, its `Operation` transition and everything
else in its function never commit. A job may enqueue another job inside its `Finish`, through
the same `Enqueue(ctx, tx, Job)` on the transaction `Finish` opened (the completion hook
`verify.reevaluate` calls is the one consumer today), and that row is under the fence with the
rest: a stale worker's enqueue rolls back and the reclaiming worker's `Finish` enqueues once
(AC3). Combined with the claim rule, a job's effect commits at most
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
direct client's fetch of the same document would commit, under that layer's single-flight
within a process and, across processes, its adoption commit's rule never to adopt an older or
equal revision (`proxy-cache.md`, "Nor is the current revision adopted twice", AC26: two
concurrent replays of one document commit one adoption, the second finding the revision
current under the document's revision token and running no hook), and a re-run replays
conditionally on the validators the first run adopted, so it answers `304` and adopts nothing
twice. `replication.sync` is the one kind whose effect commits in parts before `Finish`: each
snapshot's apply is its own transaction, committed before the fenced `Checkpoint` that records
it, so an applied snapshot is outside the fence too. That is safe because every apply
transaction locks the link row and re-reads its state, applies a snapshot by identity and
skips one already present, and advances the link's position in the same transaction, the
position of record being the link row rather than the checkpoint (`replication.md`, "Sync runs
on the shared async runner", AC2, AC3): a stale worker and the reclaiming one serialise on the
row and the second finds the snapshot applied. The registry test over kinds asserts both (AC8)
rather than trusting the argument.

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
  more patience and an alert past its bound, `supply-chain-policy.md` AC6). A kind whose own
  record carries an outcome may keep that outcome out of the classes altogether:
  `replication.sync` writes every link outcome to the link row and returns `nil`, so the job
  ends `completed` and the link's `Schedule` is its retry, keeping the classes for a fault of
  the worker itself, returned transient after the link reads `failed` `error`, and never
  wrapping `Permanent`, so that `JobFailed` means the queue failed and a replica an operator
  froze alerts once, on `ReplicationLinkFailed` (`replication.md`'s resolved sync-outcome
  decision, was Q13 there; its AC22).
- **Transient with an earliest retry time**: the worker wraps it with `async.RetryAt(err, at)`
  when the failure itself says when a retry can succeed (the resolved retry-time question below,
  was Q11). The job returns to `pending` with `run_at` the later of `at` and the ordinary backoff,
  and the attempt counts like any other transient one, so `max_attempts` still ends it. Its one
  consumer today is `proxy.revalidate`: a `*upstream.RateLimitError{RetryAfter}` is wrapped with
  its `RetryAfter`, so the job is not claimed again inside the upstream's cool-down, which
  `upstream-adapters.md` caps at the upstream's `limits.cooldown_cap` (default one hour, its
  AC10); a retry inside it would only meet the `Router`'s immediate refusal and burn an
  attempt.

A lease that expires because the worker died counts as an attempt (the reclaim increments
`attempts`), and a reclaim that finds `attempts` already at `max_attempts` ends the job `failed`
naming the expired leases rather than leasing it once more (Claim, above), so a job whose body
crashes the process every time still terminates within `max_attempts * (lease + backoff)`; a
job deferred by `RetryAt` terminates within `max_attempts * (lease + max(backoff_cap, D))`,
where `D` is the longest deferral its worker supplied (at most the upstream's
`limits.cooldown_cap` for `proxy.revalidate`). The bounds count the time a job is claimable:
time spent paused, waiting for its `exclusive_key`, or unclaimable for want of a registered
worker is outside them, since each is an operator's or a rollout's choice that the per-kind
gauges and `ScheduleOverdue` make visible rather than a failure the job could retry out of.

### Crash recovery, enumerated

The prototype's AC10 kills the server "at each step"; this spec names the steps and the
recovery for each, so the fault-injection suite has a checklist rather than a hope:

| Killed | State left | Recovery |
|---|---|---|
| Before the enqueuing transaction commits | nothing: no job, no `pending` `Operation`, no 202 was answered | none needed |
| After commit, the `NOTIFY` lost (no listener up, or the listening connection dropped) | a `pending` job nobody was woken for | claimed at the next poll, `async.poll_interval` at most |
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

- **Cancel** (`management-api.md`'s `POST /api/v1/operations/{id}/cancel`, authorized like
  the poll route, the originating authorization or the admin, and `not-found` to any other
  caller, since the operation is a row that caller may not see; and
  `POST /api/v1/system/jobs/{id}/cancel`, admin-only for every job with or without an
  `Operation`, `unauthorized` to any other principal and `unauthenticated` without a
  credential, since a registry-wide route addresses no repository for the existence oracle to
  protect; its endpoint table, AC16, AC35, its resolved refusal-type decision, was Q18
  there): a `pending` job becomes `cancelled` in one `UPDATE
  ... WHERE state='pending'` and never runs; a `running` job has its `cancel_requested` column
  set in the same `UPDATE` and `NOTIFY async_cancel` carries its id, the holding worker cancels
  the job's context, and the outcome is whichever commits first: `Finish` (the job completes;
  the effect stands and the client is told `completed`) or the worker's return with
  `ctx.Err()` (the job ends `cancelled`, nothing committed). Never both, by the fence, and
  never a half effect, by the transaction. The column is what makes the cancel durable: a
  worker that missed the notification learns of it at its next heartbeat, whose fenced `UPDATE`
  returns the flag, and a row whose lease expires with the flag set is ended `cancelled` by the
  claim that would otherwise rescue it, so a cancel is never lost to a dead process or a dropped
  notification. Cancellation is cooperative, like River's, Harbor's and Pulp's; a `Work` that
  ignores its context is a bug the idempotence test surfaces (AC8 runs each kind under a
  cancelled context and asserts nothing committed). A `manage.apply` job's `Operation` ends
  `cancelled`.
- **Repository deletion cancels the repository's jobs** (`repository-lifecycle.md`, "Deletion"
  step 8, its AC21). The deletion transaction runs the pending-cancel `UPDATE` for every job
  whose `repository` reference names the repository and marks every running one
  `cancel_requested`; the `NOTIFY async_cancel` for each is delivered when the deletion
  commits, exactly as an operator's cancel is. The deletion does not wait for running jobs. A
  running job that reaches `Checkpoint` or `Finish` after the deletion committed finds the
  write transaction refused on the deleted state by `repository.Writable` or, for the merge
  swap and the cadence re-sign, by `repository.Renewable` (the sole write-transaction
  constructor's on-a-transaction form, `storage-and-gc.md` AC25) and ends itself `cancelled`
  without a write; a job whose external work notices the deleted state earlier may return
  `ctx.Err()` at once. Until the job is terminal its grace hold stands where its kind holds one
  (`storage-and-gc.md` AC23), so a half-imported artifact's bytes are collected after the job
  ends, never under it. A `remote`'s pending `proxy.revalidate` job names the remote as its
  repository, so the remote's deletion cancels it here, and `EnqueueRevalidation` enqueues
  nothing for a deleted remote afterwards; a `virtual`'s pending `index.merge` names the
  virtual, so the virtual's deletion cancels it the same way, and a merge running at the commit
  finds its swap refused at the door and commits nothing (`repository-lifecycle.md`, "Deletion"
  steps 5 and 8, its AC21, AC29). Every
  `Schedule` scoped to the repository (its `retention.pass`, its per-pointer and
  repository-scoped `signing.resign` entries, its `replication.sync` links) is disabled in the
  same transaction; a tick that runs before the disable commits enqueues a job the deletion's
  pending-cancel then catches, because both are rows in one database and the tick's enqueue and
  the deletion serialise on them. This is the only place outside `internal/async` that writes a
  job's state, and it does so through the runner's `CancelByRepository(ctx, tx, repo)`, which
  `internal/repository` calls inside its transaction (AC28).
- **Pause and resume a kind** (admin routes in `management-api.md`'s endpoint table, refused
  as every registry-wide admin route is under its AC35): a paused
  kind's jobs are enqueued normally and never claimed (the kind is removed from `$claimable`,
  read from `data-model.md`'s `PausedKind` record, one row per paused kind naming who paused
  it and when, never from memory, so every process agrees; a record of the shared schema, since
  a table of this package's own would break its handler-table rule and this spec's AC19; its
  "Jobs and schedules", AC41).
  Running jobs of a paused kind finish. This is Harbor's queue pause and it is also how the conformance harness
  holds the Galaxy import for the prototype's AC8: the case `script` pauses `manage.apply`,
  publishes, polls once and sees unfinished, resumes, and polls to completion. No test-only
  hold exists in the server. The record and the pause pair exist before this runner does: both
  land at charter step 4a with the prototype's asynchronous half, whose disposable claim loop
  reads the same row, so the case's `script` that held that loop holds this runner at step 4b
  unchanged (`write-triggered-services-prototype.md`'s resolved runner-substrate decision, was
  Q2 there; `management-api.md` AC32, Phase 2; `data-model.md` "Build placement").

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
than never. A remote member's adoption, a virtual's creation, a member-list change, a rename of
the virtual, a change of its declared `settings` document and a member's completed
re-evaluation enqueue through the same key, so they coalesce with member writes into the same
pending merge.

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

The deferred `Apply` declares its claims again on the runner's write transaction, so a
coordinate retired between enqueue and run is refused there and the operation ends `failed`
with nothing committed (`management-api.md`'s resolved claimed-coordinate decision, was Q14
there, as amended; its AC16).

The grace interaction is the prototype's question 5, and this spec answers it in design (the
resolved grace-hold question below, as amended) so the prototype verifies rather than discovers:
**an unfinished job of a grace-holding kind that names a repository holds that repository's
grace open**, the rule `storage-and-gc.md` already gives an unexpired upload session ("An
unexpired upload session holds its repository's grace open") and now asserts for jobs too (its
AC23, with the queued or retrying job in its property operation set). The bytes a deferred
import will reference were committed to the CAS before the import ran; `storage-and-gc.md`'s
repository-scoped grace protects committed-but-unreferenced blobs only while the repository is
active; a queued import on a repository nobody else writes to is exactly the "active but silent"
shape the session hold was created for. Every `manage.apply` job carries its `Operation`'s
repository; the sweep's grace computation reads unfinished jobs by repository `WHERE
holds_grace`, the way it reads unexpired sessions; a job's terminal transition releases the
hold. This is not a mark root and not a pin: it is a timing input to the same grace clock, so
the root set stays five and `data-model.md`'s "never an operation-side pin" holds. The accepted
cost is that a retrying job keeps its repository's grace open for up to the retry horizon (about
40 minutes at the defaults), which is why the horizon is short.

**Whether a kind holds the grace is declared at registration** (`HoldsGrace`, default true)
and copied onto each row at enqueue, because the hold exists for one shape, bytes committed
before the job that will reference them, and one kind has the opposite shape and a retry
horizon the others do not. `proxy.revalidate` declares `HoldsGrace: false`: its whole effect,
the adoption, commits the `Blob` row and the cached reference in one transaction and counts as
write activity for the remote's grace (`storage-and-gc.md` AC8), so no byte of its own ever
waits for a reference, and it is the one kind re-enqueued by reads for as long as a failure
lasts. `storage-and-gc.md`'s Fable recheck found that under an upstream rate limit that never
lifts, with continuous virtual reads, the per-job hold (about eight hours at the defaults, one
`RetryAt` cool-down per attempt) chains into a hold on the remote's grace for the duration: its
evicted cached files and released revision blobs are never collected while both conditions
last, a leak the quota cannot see because `cache_referenced_bytes` falls while the store does
not. That spec accepted it as "never a loss" and noted the kind-level exemption as available;
this pass takes it, since a hold that protects nothing and defeats the quota is not a cost worth
carrying for uniformity. The sweep gains no knowledge of kinds: it reads a flag beside the
repository reference. `storage-and-gc.md` AC23's clause on the `proxy.revalidate` hold is
inverted (its Fable follow-up of 2026-10-01: the hold read from the row's flag, `true` for
every kind but `proxy.revalidate`, which holds nothing); every other kind holds, as the record
was written.

### The scheduler

Periodic work is a `Schedule` record (`data-model.md`, "Jobs and schedules", AC41): `name`,
`kind`, `args`, `interval` or `next_run_at` derived by the kind, `last_run_at`, `last_result`,
`enabled`, and an optional repository reference for the schedules that belong to one repository
(a `retention.pass`, a per-pointer or repository-scoped `signing.resign`, a `replication.sync`),
which is what repository deletion disables. `read_only` disables only the `retention.pass`
among them, a completed write an archived repository must not run on itself, while
`signing.resign` keeps enqueuing, since its run is a document-only transition the frozen
repository needs to stay installable and commits through the door's document-only form, and
`replication.sync` keeps enqueuing while the applier's entry point, which waives `ErrReplica`
alone, refuses each run `ErrReadOnly`, so the link reports `failed` with reason `read-only`
until the thaw, each such job ending `completed` so that `JobFailed` stays silent while the
replica is frozen (`repository-lifecycle.md`'s resolved document-only-transitions decision, was
Q11 there, its AC10; `replication.md` AC22, its resolved sync-outcome decision, was Q13 there;
`data-model.md` "Jobs and schedules", AC41). The
end of a replication link, by takeover or by deletion, disables the link's schedule in the
transaction that ends it (`replication.md` AC23). One process at a time runs the scheduler tick, elected by a session-level
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
Two of those series describe the schedules themselves,
`async_schedule_last_run_timestamp_seconds{schedule}` and
`async_schedule_period_seconds{schedule}`, and their `schedule` label is never a schedule row's
identity, because a pointer name is content and a repository name is what the `repository` cap
exists to bound (`observability.md`, "Cardinality", AC5; its resolved `schedule`-value
decision, was Q9 there, owner-facing). The value is the kind for an instance-wide schedule
(`storage.sweep`, `credential.prune`, the two verify refreshes); the kind with the
configuration-bounded name for a per-source or per-link schedule (`policy.feed_sync:{source}`
with the source's name, `osv` for the default feed; `replication.sync:{link}` with the link's
name, as `replication_*` carries it), capped with `upstream`, `link` and `source` under
`telemetry.metrics.name_label_limit`; and the kind alone for a repository- or pointer-scoped
kind (`signing.resign`, `retention.pass`), which the leader exports as one series per kind
carrying the **most overdue row's** pair: the `last_run` and `period` of the enabled row of
that kind with the largest `(now - last_run) / period` at collection, so `ScheduleOverdue`'s
rule (`time() - last_run > 2 * period`) over the kind's series is true exactly when some row
of the kind is overdue, within one `telemetry.metrics.state_interval`. A row's `period` is its
`interval`, or for a kind that derives its next run from stored state the gap `next_run_at -
last_run_at` as the row stands at collection, whichever transaction last wrote it, **floored
at the queue's own bound on running a due row**, `async.scheduler_interval +
async.poll_interval + async.lease` (one tick to enqueue, one poll to claim, one lease should
the first claimant die): a row a shortening wrote to now shortly after its last run would
otherwise carry a period of seconds and read overdue before any tick could have run it, while
under the floor it reads overdue only once the queue has had its bound twice over without a
run, which is a late queue and the alert's purpose (the resolved marked-due period decision
below, was Q12, owner-facing). So the ratio is defined for every row; a disabled row (by
deletion, `read_only`, an ended link or the offline flag below) is not exported and takes no part in the fold,
so the alert names a schedule that should have run and never one the operator or the instance
switched off. Which repository or pointer is overdue is the jobs administration routes' answer
(AC21), not the series'.
The tick, every `async.scheduler_interval`, enqueues a job for each schedule whose `next_run_at`
has passed, with `coalesce_key` the schedule name so a missed tick after an outage enqueues one
job, not one per missed interval, and advances `next_run_at` in the same transaction. Kinds that
derive their next run from stored state (the cadence re-sign: "the schedule derives from the
stored documents' expiry, not from a timer in memory") compute it when the job finishes and
write it to the schedule in `Finish`, so a restart mid-schedule loses nothing (AC14 covers
`signing-service.md` AC22's restart case). `Finish` is one of three writers of a
`signing.resign` row's next run and none of them creates a `Schedule` row: a `signing.resign`
row is created by `signing.Service.RegisterSchedules(ctx,
tx, repository, nextRun)` on the caller's transaction, idempotently, by the runtime inside the
write or repoint that first gives a pointer a document with a validity window, with the
expiry-derived value so a document the write just signed is not re-signed at commit, and by
`replication.md`'s takeover transaction with now, so a taken-over repository nobody writes to
has a cadence from its first second and no signed pointer exists without its row
(`signing-service.md` "Rotation profiles", "Replication", AC23; `data-model.md` "Jobs and
schedules"). The other two writers are that spec's **row-follows-document** rule, under which
every transaction producing a windowed document writes that pointer's row's next run from the
expiry on the `PointerDocument` record it wrote (`data-model.md` AC36), at
`signing.resign_at_fraction` of the window, whatever opened the transaction (the completed
write that moves the default pointer, a repoint, a document-only transition, the cadence's
own `Finish`, the takeover's request-path batch, which runs through the door's standard
document-only form and not on this queue), so no row ever holds a next run later than the
fraction point of its pointer's current document; and its **shortening** rule, under which a
transaction whose document carries a window shorter than its predecessor's on the same
pointer writes every other signed pointer's row of the repository to now in the same
transaction, leaving the repository-scoped row untouched, so the next tick enqueues each and
the cadence renews them under the new window off the request path, a request that dies after
that commit losing nothing because the rows are due; a lengthening changes nothing beyond the
first rule (`signing-service.md` "A changed window", AC22, its resolved changed-window
decision, was Q26 there, owner-facing). The scheduler needs nothing new for either: a row
written due by another transaction is a due row at the next tick, its job coalescing with a
pending job of the same schedule and, when one is `running`, waiting behind it on the
pointer's exclusivity key, so a document the in-flight run rendered under the old window is
renewed by the run that follows. A repository whose profile declares a
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
exclusivity key `feed_sync:{source}`, `{source}` the source's name, `osv` for the default feed
(`supply-chain-policy.md`, "The advisory feed and its freshness", AC21), and `replication.sync`
one per active link at `replication.sync_interval` or the link's own longer period, disabled
in the transaction that ends the link (`replication.md` AC23).

### Topology and shutdown

Every server process runs `async.workers` workers and is a scheduler candidate; a process with
`async.workers: 0` enqueues and serves polls but claims nothing, which is how an operator
separates web and worker roles without a second binary (the resolved topology question below).
On shutdown the server cancels the workers' context, each running job sees `ctx.Done()` and may
still call `Finish` within `async.drain_timeout`; a job that does not finish in time is left
`running` and reclaimed elsewhere after its lease, which is exactly the crash path, so shutdown
adds no state a crash could not leave. `testing/synctest` holds the shutdown to "no goroutine
outlives the server's context" (AC23). Beside its share of the pool, a process with workers
holds one dedicated connection for `LISTEN` and a scheduler candidate one more for the
session-level lock, both for the process's life; `deployment.md`'s `database.max_conns`
sizing counts them.

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
| `async.job_retention` | `168h` (7 days) | How long a terminal job is kept; a job referencing an `Operation` is kept until that `Operation` is pruned, whichever is later |
| `async.scheduler` | `true` | Whether this process may be elected to run the scheduler tick |
| `async.scheduler_interval` | `10s` | Scheduler tick |

`index.virtual_merge_window` and `index.virtual_staleness_bound` stay `signing-service.md`'s
keys, read by that spec's enqueuing code; `management.operation_retention` stays
`management-api.md`'s, and the two keys are independent: a job with an `Operation` is kept by
the per-job rule (never pruned before its `Operation`), not by a relation between the keys, so
the defaults (7 days against 90) are consistent and no startup check relates them
(`deployment.md`'s validation paragraph says so since its Fable recheck of 2026-10-01).
`deployment.md`'s key inventory carries the eleven keys, its "Roles" table the `workers: 0`
web-replica recipe, and its chart a second Deployment of the same image for the worker role.

### Package shape

`internal/async`: `Runner` (constructed with `Config`, a `*pgxpool.Pool`, the `slog.Logger`
and the `telemetry` handle; `Start(ctx)`, `Enqueue(ctx, tx, Job)`, `Cancel`,
`CancelByRepository(ctx, tx, repo)`, `Pause`, `Resume`, `List`), `Job` with `Finish` and
`Checkpoint`, the `Worker` interface (`Work(ctx, *Job) error`, one method, declared here because
the runner is its only consumer), `Permanent(err)`, `RetryAt(err, at)`, `Skip` (the sentinel a
worker returns for a job it cannot run in this process), `ErrLeaseLost`, and `Schedule`. Kinds
register in the server's constructor: `runner.Register(kind, worker, opts...)`, the options
being the kind's declarations (`WithMaxAttempts`, `WithBackoff`, `WithHoldsGrace(false)`);
`Start` logs, at warning, every kind found in the table that no worker registered and claims
none of them (the resolved unknown-kind decision, was Q10). The scheduler lock is taken through
`internal/db/lock.LockScheduler`; this package issues no advisory-lock SQL of its own.
`internal/manage` implements the `manage.apply` worker and `internal/proxy` the
`proxy.revalidate` worker; each other consumer package implements its own worker against
`async.Worker` (`internal/verify` the `verify.reevaluate` worker, whose `Finish` calls the
one-method completion hook that package declares and `internal/index`'s runtime satisfies at
the composition root, `internal/trustsource` the
two `verify.*_refresh` schedules, since the network-reaching trust sources live there and not
under `internal/verify/**`). The runner derives each job's context from one
`telemetry.WithJob` call per claim, before `Work`. The queries live with the shared metadata store's
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
| A job that enqueues inside its own `Finish` does so through `Enqueue(ctx, tx, Job)` on the transaction `Finish` opened, so the enqueue is under the fence; the completion hook is called once per completing `Finish` and never by an overtaken job | `internal/async/fence_test.go` (a stale-token `Finish` whose function enqueues: no row; the reclaiming worker's `Finish`: one row); `internal/verify/trust_revision_test.go` (the hook's one call at the completing `Finish`, none from the overtaken job, shared with `artifact-verification.md` AC3) |
| The `Operation` and `Job` transition together | `internal/manage/deferred_test.go` (every transition, both records in one transaction, fault before commit leaves neither) |
| Every registered kind is idempotent up to `Finish` and honours cancellation | `internal/async/kinds_test.go`, table-driven over the registry; an unregistered kind fails the test |
| The runner has no repository-type branch and imports no handler or proxy package | `internal/async/arch_test.go` |
| The sweep's grace computation reads unfinished jobs whose `holds_grace` is set, and a kind declaring `HoldsGrace: false` leaves no byte awaiting a reference | `internal/storage/gc_property_test.go` (queued job in the operation set, `storage-and-gc.md` AC23); `internal/async/kinds_test.go` (for every kind declaring `false`, `Work` interrupted at each fault point leaves no `Blob` row without a reference; shared with `storage-and-gc.md` AC8's cache-fill case) |
| A held `exclusive_key` is skipped by the claim's predicate, never discovered at the `UPDATE`; a rescue ends a cancel-requested or attempt-exhausted row instead of leasing it | `internal/async/property_test.go` (no rolled-back claim for a held key except the two-worker race; a held key delays no other key); `internal/async/cancel_test.go` and `internal/async/retry_test.go` (the two rescue outcomes) |
| A `manage.apply` job whose operation kind this process cannot run is returned `pending` unchanged, never failed | `internal/manage/deferred_test.go` (`Skip` from a handler lacking the kind; the row's `attempts` and `run_at` unchanged; a second process runs it) |
| Only `internal/db/lock` issues advisory-lock SQL; this package takes `LockScheduler` through it | `internal/db/lock/arch_test.go` (`deployment.md` AC19), string scan of every `.go` and `.sql` file |
| No package outside `internal/async` writes a job's state except through `CancelByRepository` inside the deletion transaction | `internal/async/arch_test.go` (no SQL against the job table outside the package; the one exported write path named) |
| The runner gives no job a principal and never holds the revalidation replay entry | `internal/async/kinds_test.go` (for every registered kind, the context `Work` receives carries no principal although the job was enqueued under an authenticated request); `internal/async/arch_test.go` (the package imports neither `internal/server` nor `internal/auth`); the entry's single recipient is `format-handler-interface.md`'s `internal/server/arch_test.go` (its AC18) |
| `proxy.revalidate` has no `Schedule` and is enqueued only through `EnqueueRevalidation` | `internal/proxy/revalidate_job_test.go` (`proxy-cache.md` AC26: no `Schedule` of the kind exists after virtual creation, reads and member changes; offline, `read_only` and deleted remotes enqueue nothing) |
| Every job's context comes from exactly one `telemetry.WithJob` call per claim, before `Work`, carrying the job's attributes and the per-job secret set | `internal/async/trace_link_test.go` (one call per claim; `job_id`, `kind` and `request_id` on every record; a value marked during `Work` absent from every record and from `last_error`; shared with `observability.md` AC31's `internal/proxy/revalidate_job_test.go`) |
| A kind whose effect is a document-only pointer transition (`index.merge`, `signing.resign`) takes the on-a-transaction form's document-only shape under `repository.Renewable`, never `Writable`; a completed write takes the standard shape | `internal/storage/arch_test.go` (`storage-and-gc.md` AC25: the document-only form calls `Renewable` and has no waiving entry point); `internal/async/kinds_test.go` (the registry names each kind's shape, and a fixture `Finish` on a `read_only` repository commits for the document-only kinds and ends `failed` `read-only` for the completed-write kinds) |

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
  `max_attempts * (lease + max(backoff_cap, D))` of claimable time, `D` the longest `RetryAt`
  deferral generated for it (zero when none), time paused, waiting on a held `exclusive_key` or
  unclaimable for want of a worker excluded; no claim transaction rolled back for a held
  `exclusive_key` except when two simulated workers passed the predicate for one key in the
  same step, and a held key delaying no job of another key; a cancel requested of a `running`
  job honoured after a lost notification and after a lease expiry, the job never re-run; every
  `Operation` state equal to its job's; a paused kind never claimed; a schedule enqueues once
  per elapsed period however many ticks were missed.
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
      transaction, commits no snapshot, no `Operation` transition, no checkpoint, no verdict
      and no job its function enqueued through `Enqueue(ctx, tx, Job)`, and returns
      `ErrLeaseLost`, while the reclaiming worker's `Finish` commits once, its enqueue included.
- [ ] AC4: A job's effect, its `Operation`'s terminal transition and its own terminal state are
      one transaction: a fault injected at any point before that commit leaves none of the
      three, and no interleaving produces a snapshot whose operation reads unfinished, a
      `completed` operation with no snapshot, or a `completed` job with no effect.
- [ ] AC5: A management kind declared deferred is executed on the runner: `Submit` inserts the
      `pending` `Operation` and its `manage.apply` job in one transaction and answers 202; the
      claim moves both to `running` in one transaction; `Apply` runs inside `Finish`, in the
      repository's write scope opened through the sole write-transaction constructor with the
      claims declared again, and its snapshot, retirements and audit line commit with both
      terminal states; a coordinate retired between enqueue and run ends both `failed` with
      the `retired` problem and nothing committed (`management-api.md` AC16); a deferred
      `Apply` whose repository was frozen between enqueue and run is refused at the door by
      `repository.Writable` before any repository row is touched and ends both `failed` with
      the `read-only` problem and nothing committed (`repository-lifecycle.md` AC10); a
      permanent error
      ends both `failed` with the handler's result document and no snapshot; the poll and
      cancel routes are refused `not-found` to a principal lacking the originating write's
      authorization, the one `not-found` among the routes this spec fixes, because the
      operation is a row that principal may not see (`management-api.md` AC16, AC35; AC21
      answers the registry-wide jobs routes `unauthorized`).
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
      ends `failed` at `max_attempts`; a reclaim after a lease expiry that finds `attempts`
      already at `max_attempts` ends the job `failed` with `last_error` naming the expired
      leases instead of leasing it again; a kind's own `max_attempts` and backoff override the
      defaults; and `last_error` never contains a credential.
- [ ] AC8: For every registered kind, `Work` interrupted after its external effects and before
      `Finish` and then re-run from the same starting state commits state identical to a single
      uninterrupted run, and `Work` under a cancelled context commits nothing; the test is
      table-driven over the runner's registry and fails for a kind with no case.
- [ ] AC9: Cancelling a `pending` job ends it `cancelled` and it never runs; cancelling a
      `running` job cancels the worker's context and the job ends either `completed` with its
      full effect or `cancelled` with none, never both and never a partial effect; a cancel
      requested of a `running` job whose process never received the notification, or whose
      lease then expires, still ends the job `cancelled` (the `cancel_requested` column met at
      the next heartbeat, or by the claim that would have rescued it) and never re-runs it; the
      `Operation` of a `manage.apply` job mirrors the outcome, including the `cancelled` state.
- [ ] AC10: Pausing a kind stops every process from claiming its jobs while running ones finish,
      the paused set being read from the shared schema so a process started after the pause
      honours it, enqueue continues, resuming makes the accumulated jobs claimable oldest first, and a
      paused `manage.apply` holds a real `ansible-galaxy collection publish`'s import so that
      the first poll answers unfinished and the poll after resume answers finished
      (`write-triggered-services-prototype.md` AC8's hold, with no test-only code in the
      server), through the same `PausedKind` row and pause pair charter step 4a landed for the
      prototype's disposable claim loop, so that case's `script` holds this runner at step 4b
      unchanged (its resolved runner-substrate decision, was Q2 there; `management-api.md`
      AC32).
- [ ] AC11: N member writes to a virtual repository inside `index.virtual_merge_window` produce
      exactly one `index.merge` run (one `pending` row per `coalesce_key`); a member write during a running merge produces exactly one
      more pending merge; every member write is visible in the virtual's documents within
      `index.virtual_staleness_bound`; a merge starting later than the bound allows is counted
      and alerted; and no merge runs on a request's path (`signing-service.md` AC19 on the
      production runtime). The same key coalesces every other trigger: a virtual's creation,
      each change of its member list, its rename (which calls no handler `Apply`,
      `signing-service.md` AC19) and a change of a declared `settings` document on it, applied
      through the door's document-only form with no snapshot and the enqueue the shared
      layer's inside that transaction, absent when the transaction rolls back
      (`management-api.md` AC7; `formats/debian.md` AC13), each enqueue a merge in the
      transaction making the change, a
      target-moving transition of a `local` member's default pointer (a promotion into it, a
      rollback) enqueues one inside the repoint through `Transition` while a repoint of the
      member's environment pointer enqueues none (`signing-service.md` AC19), and a
      remote member's adoption of a new upstream revision enqueues one for every virtual
      listing the remote inside the adoption transaction, so a merge job exists exactly when the
      adoption commits (none when it rolls back), and the adopted change is visible in each
      virtual within the staleness bound (`signing-service.md` AC34, AC35); and a member's
      completed re-evaluation enqueues one through the completion hook `internal/verify`
      declares, called inside the `verify.reevaluate` job's completing `Finish` on that job's
      transaction, for every virtual whose profile signs and lists the member and for no
      unsigned one, the row present exactly when that `Finish` commits and absent when it rolls
      back, while the trust-set revision itself enqueues none (`signing-service.md` AC36;
      `artifact-verification.md` AC3). The swap commits
      through the sole write-transaction constructor's on-a-transaction form in its
      document-only shape under `repository.Renewable`, never `Writable`: it declares no claim
      and seals no snapshot, proceeds where `Renewable` passes (`active` and `read_only`) and is
      refused where it does not, so a merge whose virtual was deleted before its `Finish` ends
      `cancelled` with nothing committed, and the merge job carries the virtual as its
      repository reference, so the virtual's deletion cancels a pending merge in the deletion
      transaction (`storage-and-gc.md` AC25; `repository-lifecycle.md` AC21, AC29).
- [ ] AC12: At most one job per `exclusive_key` is `running` at any instant across all
      processes, waiting jobs with that key run oldest first, none waits forever while the key
      is free, a pending job whose key a live running job holds is skipped by the claim without
      a rolled-back transaction and without delaying any job of another key (the rolled-back
      claim occurring only when two workers passed the predicate for one key at once, which the
      partial unique index refuses), and a running holder whose lease expired no longer blocks
      the key.
- [ ] AC13: An unfinished job of a kind declaring `HoldsGrace` (every kind by default) that
      names a repository holds that repository's grace open: a sweep forced with an injected
      clock past the grace period while a deferred import is pending or retrying collects none
      of the digests the import will reference, the import then commits and the collection
      installs (`write-triggered-services-prototype.md` AC11), and the hold releases when the
      job becomes terminal, with the mark-root set unchanged at five; the `holds_grace` flag is
      on the row at enqueue, so the sweep reads no kind registry; and a `proxy.revalidate` job, which
      declares `HoldsGrace: false`, holds none: with one `pending` under a stand-in upstream
      whose rate limit never lifts, a sweep past the remote's grace collects the remote's
      evicted, unreferenced bytes while the job is still pending, and no byte the job's
      adoption commits is unreferenced across any sweep (`storage-and-gc.md` AC8).
- [ ] AC14: Exactly one process runs the scheduler tick (`async.scheduler_interval`) at any
      instant across N processes, holding `internal/db/lock.LockScheduler` on a dedicated
      connection, a new leader is elected within one tick of the old one's connection closing
      and a process with `async.scheduler: false` is never elected, the leader and only the
      leader exports the state-derived gauges (`observability.md` AC7), a schedule whose
      `next_run_at` passed several times during an outage enqueues one job, the cadence re-sign's
      next run is derived from the stored document's expiry and survives a restart mid-schedule
      with no re-sign lost or duplicated (`signing-service.md` AC22 on the production scheduler),
      its `Schedule` rows are created only by `signing.Service.RegisterSchedules`, idempotently
      on the caller's transaction, by the runtime at a pointer's first windowed document with
      the expiry-derived next run and by the takeover transaction with now, so no signed
      pointer exists without its row and a taken-over repository has a cadence before any
      write (`signing-service.md` AC23), and a row's next run is written by exactly three
      writers, none creating a row: the cadence's `Finish`, every transaction that produces a
      windowed document for the pointer (the write that moves it, a repoint, a document-only
      transition, the takeover's request-path batch), from the expiry on the `PointerDocument`
      record it wrote (`data-model.md` AC36), so no row ever holds a next run later than the
      fraction point of its pointer's current document, and a shortening transaction, which
      writes every other signed pointer's row of the repository to now and leaves the
      repository-scoped row untouched, after which the next tick enqueues each and the cadence
      renews it under the new window, a row marked due while its job is pending coalescing
      with it and one marked while its job is running waiting behind it on the pointer's key
      (`signing-service.md` AC22, its resolved changed-window decision, was Q26 there),
      a repository declaring a repository-scoped pointer document has exactly one
      repository-scoped `signing.resign` schedule, whose runs hold exclusivity key
      `repository:{repository}` so no two overlap, beside its per-pointer schedules under
      `pointer:{repository}/{pointer}` (`signing-service.md` AC33), and repository deletion
      disables both while `read_only` disables neither (only the repository's `retention.pass`),
      the cadence run committing through the door's document-only form under
      `repository.Renewable` so a frozen repository's envelope is renewed and a replica's or a
      deleted repository's run is refused at the door and ends without a write
      (`repository-lifecycle.md` AC10; `signing-service.md` AC22), `policy.feed_sync` runs one
      schedule per source under `feed_sync:{source}` with the source's name as `{source}`, `osv`
      for the default feed (`supply-chain-policy.md` AC21),
      `replication.sync` one per link at `replication.sync_interval` or the link's own period,
      disabled in the transaction that ends the link, takeover or deletion, with no later
      enqueue, and still enqueuing under `read_only`, each run refused `read-only` at the
      applier's entry point so the link reports `failed` until the thaw, each such job ending
      `completed` so that `JobFailed` stays silent while the replica is frozen, every outcome
      the link table names ending the job `completed` with the link row as its record, a store
      fault mid-apply alone returning transient after the link reads `failed` `error` and the
      kind never wrapping `Permanent`
      (`replication.md` AC22, AC23, its resolved sync-outcome decision, was Q13 there),
      `credential.prune` one daily instance-wide schedule under the kind as its exclusivity key
      (`credential-management.md` AC6),
      and `proxy.offline` disables every network-reaching schedule (each `policy.feed_sync`, the
      verify refreshes, each `replication.sync`) without bursting on re-enable.
- [ ] AC15: A `verify.reevaluate` job pages through the repository's verdicts whose revision is
      not current, oldest first, with a checkpoint per committed page, superseded being derived
      from each verdict's revision so that the enqueuing revision writes no verdict row and the
      job clears no mark; after a kill and rescue no verdict is recomputed twice and none is
      skipped; a job overtaken by a second revision ends at its next checkpoint and the second
      revision's job recomputes everything (`artifact-verification.md` AC3 on the production
      runner); the job calls the completion hook `internal/verify` declares exactly once,
      inside the `Finish` that commits its last page and on that transaction, so the
      `index.merge` rows the hook enqueues exist exactly when that `Finish` commits, once after
      a kill before it and the rescue, never from the overtaken job and once from the second
      revision's job, and once for a repository holding no superseded verdict; that `Finish`
      reads the current revision and the repository's state under a share lock on the row the
      revision write takes for update, before the fenced job update, so a revision interleaved
      with the completing `Finish` yields, in either order, exactly one call for the revision
      that is current, the revision's own transaction enqueues no merge, and a `Finish` meeting
      the deleted state ends the job `cancelled` with no call; bounded by `async.kind_limits`.
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
- [ ] AC19: `Job`, `Schedule` and `PausedKind` are records of the shared model, and no
      consumer package creates a table, queue or schedule store of its own: the module has
      exactly one claim query, in `internal/async`.
- [ ] AC20: The package exports, under `observability.md`'s catalogue names, `async_jobs{kind,state}`,
      `async_oldest_pending_age_seconds{kind}`, `async_job_duration_seconds{kind,outcome}`,
      `async_jobs_total{kind,outcome}`, `async_retries_total{kind}`,
      `async_lease_expiries_total{kind}`, `async_scheduler_leader`,
      `async_schedule_last_run_timestamp_seconds{schedule}`,
      `async_schedule_period_seconds{schedule}` and `async_worker_slots{state}`, and the
      merge worker `index_virtual_merge_staleness_breaches_total`; the `schedule` label is the
      kind for an instance-wide schedule, the kind with the source's or link's name for a
      per-source or per-link one (`policy.feed_sync:{source}`, so `policy.feed_sync:osv` for the
      default feed, and `replication.sync:{link}`), and the kind alone for a repository- or
      pointer-scoped one,
      whose pair is the most overdue enabled row's `last_run` and `period` (a derived-next-run
      kind's period being `next_run_at - last_run_at` as the row stands, floored at
      `async.scheduler_interval + async.poll_interval + async.lease`, so that a row a
      shortening wrote to now seconds after its last run does not fire `ScheduleOverdue`
      before the tick that runs it and does fire once that bound has passed twice with no
      run), so no `schedule` value carries a
      repository or pointer name, a disabled row is not exported, and one overdue pointer
      schedule among many current ones fires `ScheduleOverdue` on the kind's series
      (`observability.md` AC5, its resolved `schedule`-value decision, was Q9 there); and through
      `telemetry.Alert` a job ending `failed` raises `JobFailed`, a schedule idle for twice its
      period raises `ScheduleOverdue`, a staleness breach raises `VirtualMergeStalenessBreach`,
      and a fleet with no leader for five minutes shows on `SchedulerLeaderless`, each exactly
      once per driving scenario, so that no job can fail silently.
- [ ] AC21: Listing jobs (filterable by kind, state and repository), cancelling a job, and
      pausing and resuming a kind are admin routes under the `api` mount present in the OpenAPI
      document, refused `unauthorized` to every non-admin principal, an admin-owned token and
      a repository-scoped token holding every action included, and `unauthenticated` to a
      credential-less request, since each is a registry-wide route with no repository for the
      existence oracle to protect (`management-api.md` AC35, its resolved refusal-type
      decision, was Q18 there), and each admin call leaves one audit line.
- [ ] AC22: Every `async.*` key has a default, binds to its `STACKWEAVER_REGISTRY_ASYNC_*`
      variable, and reaches the runner as a typed `Config`; the eleven keys tabled here and the
      schema's `async.` keys are equal in both directions under `scripts/check-config-keys.js`;
      `async.workers: 0` runs no worker in that process while `Enqueue`, polls and the operator
      routes still work; and the defaults (`async.job_retention` 7 days against
      `management.operation_retention` 90 days) start a server, no check relating the two keys
      existing, a job with an `Operation` being kept by AC18's rule.
- [ ] AC23: On shutdown every running job's context is cancelled, a job that calls `Finish`
      within `async.drain_timeout` commits whole, one that does not is left `running` and
      reclaimed elsewhere after its lease, and no goroutine of the runner outlives the server's
      context under `testing/synctest`.
- [ ] AC24: The randomized interleaving suite (enqueue with and without keys, claim, heartbeat,
      transient, permanent and `RetryAt` failures, lease expiry, process kill, cancel, pause and resume, shutdown and restart, scheduler
      ticks, over N simulated processes on an injected clock) holds every invariant named in
      "Fault injection, property and benchmark tests" for every generated history, the
      termination bound counted over claimable time only, and is in `make verify`.
- [ ] AC25: Claim latency p99 stays under 50 ms and sustained throughput at or above 1,000 jobs/s
      on one process with eight workers against a local PostgreSQL, and the `job` table's
      dead-tuple count does not grow across an enqueue-and-prune run of 100,000 jobs, as
      benchmark gates.
- [ ] AC26: A process never claims a job of a kind it has no registered worker for and never
      fails one: with two processes on one database, one registering a kind the other does not,
      every job of that kind is claimed only by the registering process, stays `pending` (never
      `failed`, never `running` on the other) while only the non-registering process runs, is
      counted in `async_jobs{kind}` and `async_oldest_pending_age_seconds{kind}` meanwhile, and
      the non-registering process starts, logs the kind at warning, and serves everything else;
      and a `manage.apply` job whose `args` name an operation kind this process's handler does
      not declare is returned `pending` through `Skip` with `attempts` and `run_at` unchanged,
      not claimed again by that process for `async.lease`, and run by a process whose handler
      declares it, its `Operation` never `failed` for the rollout.
- [ ] AC27: `Enqueue` under a request records that request's `traceparent` as `trace_context`
      and its id as `request_id` on the `Job`, the scheduler's enqueues leave both null, an
      enqueue from inside a job's `Work` or `Finish` records that job's span as `trace_context`
      and that job's own `request_id`, so a merge the completion hook enqueues links to the
      re-evaluation job's span and names the trust-set write's request, the
      job's span carries a link to the enqueuing span and is not its child, and an audit line
      emitted from the job carries the originating `request_id` (`observability.md` AC16); the
      runner derives the context `Work` receives through exactly one
      `telemetry.WithJob(ctx, id, kind, request_id)` call per claim, so every log record the job
      emits carries `job_id`, `kind` and that `request_id`, and a value marked through
      `telemetry.MarkSecret` during `Work` appears in no record the job emits and not in
      `last_error` (`observability.md` "Redaction", AC31).
- [ ] AC28: Deleting a repository, with a pending, a retrying and a running job naming it and a
      `retention.pass` schedule scoped to it, moves the pending and retrying jobs to
      `cancelled` in the deletion transaction (never run afterwards), delivers the cooperative
      cancel to the running one, which ends `cancelled` with nothing committed at its next
      `Checkpoint` or `Finish` because the write transaction is refused on the deleted state,
      disables the schedule so no later tick enqueues for it, cancels a `virtual`'s pending
      `index.merge` and a `remote`'s pending `proxy.revalidate` through the same repository
      reference, keeps the grace hold, where the kind holds one, until the
      running job is terminal and releases it then (`storage-and-gc.md` AC23), and the
      deletion request returns without waiting for the running job (`repository-lifecycle.md`
      AC21).
- [ ] AC29: `proxy.revalidate` runs on the queue as `proxy-cache.md` AC26 requires: any number
      of reads of a virtual whose merged input from one remote is past that remote's TTL, while
      that remote's revalidation is `pending`, leave exactly one `pending` row under
      `revalidate:{repository}`, and reads while it is `running` add exactly one more, which is
      not claimed until the running one ends; each read is served without waiting on the
      enqueue; a request to the virtual for a cell no member input covers enqueues the remote's
      revalidation in an enqueue-only transaction that also records the cell on the virtual's
      input record, the row and the cell committing together or not at all (`data-model.md`
      AC45), and a request for a further cell on a virtual already holding
      `index.requested_cells_max` cells records nothing and enqueues nothing while still being
      answered from the merged set (`signing-service.md`'s resolved requested-cell decision,
      was Q22 there); a virtual's creation or a member-list change adding a never-adopted remote
      enqueues the job through `EnqueueRevalidation(ctx, tx, remote)` exactly when its
      transaction commits; no `Schedule` of the kind exists
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
| AC1 | integration + unit | `internal/async/enqueue_test.go` (rollback, commit, `NOTIFY` inside the transaction and none after a rollback, poll latency with an injected clock, an unregistered kind refused); `internal/async/api_test.go` (no pool-taking enqueue path) |
| AC2 | property | `internal/async/property_test.go` (lease invariant over N processes; reclaim bound) |
| AC3 | integration + fault injection | `internal/async/fence_test.go` (stale token at `Finish`, `Checkpoint`, heartbeat; a stale-token `Finish` whose function enqueues a job through `Enqueue(ctx, tx, Job)` leaving no row, and the reclaiming worker's `Finish` leaving one) |
| AC4 | integration + fault injection | `internal/manage/deferred_test.go` (fault before commit at each site; pairing of `Operation` and `Job`) |
| AC5 | integration + conformance | `internal/manage/deferred_test.go`; `internal/repository/readonly_test.go` (a deferred operation pending at the freeze ends `failed` `read-only` with nothing committed, shared with `repository-lifecycle.md` AC10); `conformance/ansible/deferred_publish_test.go` (real client, 202 then poll; unauthorized poll) |
| AC6 | integration + fault injection | `internal/async/crash_test.go` (process kill at each fault point, restart, invariants); `internal/format/ansible/deferred_crash_test.go` (the prototype's instance) |
| AC7 | unit + integration | `internal/async/retry_test.go` (backoff schedule on an injected clock, permanent class, `RetryAt` later-of rule and attempt counting, a reclaim at `max_attempts` ending the job `failed` naming the leases, per-kind override through the registration options, credential leak scan of `last_error`) |
| AC8 | integration | `internal/async/kinds_test.go` (table over the registry: interrupt-and-rerun, cancelled context; for `replication.sync` the interruption between a snapshot's apply commit and its `Checkpoint`, the re-run and a stale worker each skipping the applied snapshot by identity under the link row lock, shared with `replication.md` AC2 and AC3) |
| AC9 | integration + property | `internal/async/cancel_test.go` (pending, running-then-finish, running-then-return; the notification dropped and the flag met at the heartbeat; the lease expired with the flag set and the claim ending the row `cancelled` without a run; shared with `data-model.md` AC41's `cancel_requested` case); `internal/async/property_test.go` (never both; a cancel honoured across a lost notification and a lease expiry) |
| AC10 | integration + conformance | `internal/async/pause_test.go` (multi-process pause visibility: the `PausedKind` row read by a process started after the pause and absent after resume, shared with `data-model.md` AC41); `conformance/ansible/deferred_publish_test.go` (`script` pauses, polls, resumes) |
| AC11 | integration + fault injection | `internal/index/virtual_merge_test.go` on the production runner (coalescing count, running-then-write, staleness bound and breach alert, no merge on a request goroutine; creation and member-list change enqueue under the same key; a member's default-pointer promotion and rollback enqueuing through `Transition` inside the repoint and an environment-pointer repoint enqueuing nothing, and a rename of the virtual enqueuing exactly one coalesced merge in the rename transaction with no handler `Apply` called, shared with `signing-service.md` AC19); `internal/manage/repository_type_test.go` (shared with `management-api.md` AC7: a `configure` carrying a declared `settings` document on a fixture virtual accepted as a document-only transition with no snapshot, this row adding that exactly one coalesced `index.merge` row exists after its commit, enqueued by the shared layer, and none after an injected rollback) and `internal/format/debian/manage_test.go` (shared with `formats/debian.md` AC13: the real Debian-shaped case of the same); `internal/index/virtual_remote_member_test.go` (shared with `signing-service.md` AC35: adoption enqueues in its transaction, an adoption rolled back by an injected fault leaves no job); `internal/index/admission_test.go` (shared with `signing-service.md` AC36: the completion hook, driven by a fixture `internal/verify` caller inside a fixture job's `Finish`, enqueuing exactly one coalesced merge for the signed virtual and none for an unsigned one listing the same member, the row present after that `Finish` commits and absent when an injected fault rolls it back, and the trust-set revision enqueuing nothing); `internal/storage/write_hook_test.go` (a fixture merge's `Finish` through the on-a-transaction form's document-only shape, no claim and no snapshot, shared with `storage-and-gc.md` AC25); `internal/repository/delete_virtual_test.go` (the merge job's repository reference is the virtual: a pending merge cancelled in the deletion transaction, a running merge's swap refused at the door with nothing committed; shared with `repository-lifecycle.md` AC29) |
| AC12 | property | `internal/async/property_test.go` (exclusive-key invariant, fairness, liveness, no rolled-back claim for a held key outside the two-worker race, a held key delaying no other key, an expired holder releasing the key) |
| AC13 | integration + property | `internal/storage/pending_operation_gc_test.go` (forced sweep past grace with a pending and a retrying import; a pending `proxy.revalidate` under a never-lifting stand-in rate limit holding nothing, the remote's evicted bytes collected; shared with `storage-and-gc.md` AC23); `internal/storage/gc_property_test.go` (queued job in the operation set, with and without the flag); `internal/async/kinds_test.go` (a kind declaring `false` leaves no unreferenced `Blob` row at any fault point, shared with `storage-and-gc.md` AC8) |
| AC14 | integration | `internal/async/scheduler_test.go` under `testing/synctest` (leader death and election through `LockScheduler`, `scheduler: false` never elected, leader-only gauge export through `telemetry.NewTestRecorder`, missed periods, per-source and per-link schedules, restart mid-schedule, `proxy.offline` flag; a derived-next-run row written due by a transaction other than `Finish` enqueued at the next tick, its job coalescing with a pending job of the schedule and waiting behind a running one on the exclusivity key); `internal/db/lock/singleton_test.go` (shared with `deployment.md` AC19: holder kill and hand-over bound); `internal/signing/cadence_test.go` (expiry-derived next run; the one repository-scoped schedule beside the per-pointer ones, shared with `signing-service.md` AC33's `repository:{repository}` exclusivity; a `read_only` repository renewed through the door's document-only form and a replica and a deleted repository refused, shared with `signing-service.md` AC22); `internal/signing/schedules_test.go` (`RegisterSchedules` idempotent, a new row at the caller's `nextRun` and an existing row untouched, one row per signed pointer plus the repository-scoped row where declared, the runtime's call at a pointer's first signed document with the expiry-derived value and the takeover transaction's call with now, no signed pointer without a row and `Finish` creating none; shared with `signing-service.md` AC23); `internal/signing/window_change_test.go` under `testing/synctest` (the row rewritten from the `PointerDocument` expiry in a write, a repoint, a document-only transition and `Finish`; a shortening `configure` writing every other signed pointer's row to now and the repository-scoped row unchanged in its transaction, each renewed under the new window at the next tick with its row then written in `Finish`; a lengthening changing no other row; the property that no row ever holds a next run later than its pointer's current fraction point; shared with `signing-service.md` AC22 and `data-model.md` AC36); `internal/repository/readonly_test.go` (the `signing.resign` schedule enabled and `retention.pass` disabled under `read_only`, shared with `repository-lifecycle.md` AC10 and `data-model.md` AC41's `internal/model/schedule_test.go`); `internal/replication/sync_job_test.go` (the per-link schedule's kind, exclusivity key and period, and the schedule disabled by takeover and by deletion with no later enqueue; the disabled-schedule half shared with `replication.md` AC23); `internal/replication/readonly_replica_test.go` (a frozen replica's schedule still enqueuing, each run refused `read-only` at the applier's entry point, the link `failed` until the thaw and resuming after it, each such job `completed` with no `JobFailed`; shared with `replication.md` AC22); `internal/replication/sync_outcome_test.go` (every link outcome ending the job `completed` with the link row carrying it, a store fault mid-apply writing `failed` `error` and returning transient, the kind never wrapping `Permanent`; shared with `replication.md` AC22); `internal/policy/feed_sync_test.go` (the per-source schedule shape: two sources running concurrently and one source single-flight across two processes under `feed_sync:{source}`; shared with `supply-chain-policy.md` AC23, whose row names this spec's `internal/async/scheduler_test.go` back); `internal/trustsource/sources_test.go` and `internal/credential/revoke_test.go` (the refreshes registered by `internal/trustsource`, shared with `artifact-verification.md` AC22; the daily prune, shared with `credential-management.md` AC6) |
| AC15 | integration + fault injection | `internal/verify/trust_revision_test.go` on the production runner (kill mid-page, rescue, no double recompute, kind limit; the derived superseded state with no verdict row written by the revision and no mark cleared by the job; a second revision mid-job ending the first at its checkpoint; the completion hook through a fixture consumer: called once inside the completing `Finish` with its `index.merge` rows visible only after that commit, once after a kill before that `Finish` and the rescue, never by the overtaken job and once by the second revision's job, once for a repository holding no superseded verdict, a revision interleaved with the completing `Finish` at the share lock in both orders yielding one call for the current revision, a `Finish` meeting the deleted state ending `cancelled` with no call, and a revision enqueuing no merge; shared with `artifact-verification.md` AC3 and with `signing-service.md` AC36's `internal/index/admission_test.go`); `internal/async/crash_test.go` (the kill-and-rescue case over this kind, as AC17's row names it) |
| AC16 | architecture test | `internal/async/arch_test.go` (import graph); `internal/async/goroutine_test.go` (AST scan with allowlist and violation fixture) |
| AC17 | architecture test + integration | `internal/async/arch_test.go`; `internal/async/crash_test.go` (same cases over `policy.scan` of a cached digest, `verify.reevaluate` of a proxied verdict, `index.merge` over remote members) |
| AC18 | integration | `internal/async/prune_test.go` (injected clock; job and `Operation` retention ordering) |
| AC19 | architecture test | `internal/async/arch_test.go` (one claim query site; no DDL or queue store outside the shared schema; the paused set read from the shared schema's `PausedKind` record and from no package-held table or memory) |
| AC20 | integration | `internal/async/metrics_test.go` (each series by catalogue name and each alert once under a driven scenario, through `telemetry.NewTestRecorder`; the `schedule` value for an instance-wide, a per-source with `osv`, a per-link, a per-repository and a per-pointer schedule, the most-overdue fold with a derived-next-run row's period, a row written due by a shortening seconds after its last run exporting the floored period and firing `ScheduleOverdue` only once `scheduler_interval + poll_interval + lease` has passed twice with no run, a disabled row absent from the fold, and `ScheduleOverdue` on the kind's series for one overdue pointer schedule among many current ones, shared with `observability.md` AC5; the `observability.md` AC6 and AC18 rows for this package); `internal/index/virtual_merge_test.go` (the staleness-breach counter and alert) |
| AC21 | integration | `internal/manage/jobs_routes_test.go` (the admin on each route; a human non-admin, an admin-owned token and a repository-scoped token holding every action each refused `unauthorized`, a credential-less request refused `unauthenticated`, on the listing, the cancel and both pause routes; OpenAPI presence; audit line; shared with `management-api.md` AC35's `internal/manage/refusal_types_test.go`, whose table carries the jobs rows) |
| AC22 | unit + integration + script | `internal/async/config_test.go` (defaults, env binding, typed struct, `workers: 0` behaviour, the defaults starting with no cross-key refusal); `scripts/check-config-keys.js` under `make verify` (`deployment.md`'s two-way check over this table) |
| AC23 | integration | `internal/async/shutdown_test.go` under `testing/synctest` (drain, late job reclaimed, no leaked goroutine) |
| AC24 | property | `internal/async/property_test.go`, run by `make verify` |
| AC25 | benchmark | `internal/async/bench_test.go` (latency, throughput, dead tuples), gated in CI |
| AC26 | integration | `internal/async/unknown_kind_test.go` (two processes with different registries: claim set, `pending` retained, gauges, warning log through `telemetry.NewTestRecorder`, `Start` succeeds); `internal/manage/deferred_test.go` (a `manage.apply` job for an operation kind one process's fixture handler lacks: `Skip`, the row unchanged, the other process running it) |
| AC27 | integration | `internal/async/trace_link_test.go` (enqueue under a request, from the scheduler, and from inside a fixture job's `Finish`, whose row carries that job's span as `trace_context` and the originating `request_id`; span link, audit `request_id`; one `telemetry.WithJob` call per claim with `job_id`, `kind` and `request_id` on every record the job emits, and a value marked through `MarkSecret` during `Work` absent from every record and from `last_error`, through `telemetry.NewTestRecorder`; the `observability.md` AC16 row, shared with its AC31's `internal/proxy/revalidate_job_test.go` for the replay's records) |
| AC28 | integration + fault injection | `internal/repository/delete_jobs_test.go` (shared with `repository-lifecycle.md` AC21: pending, retrying and running jobs, the scoped schedule, no wait; a `virtual`'s pending `index.merge` and a `remote`'s pending `proxy.revalidate` among the cancelled); `internal/async/cancel_test.go` (`CancelByRepository` inside a transaction; running job refused at `Checkpoint` and `Finish` on the deleted state, by `Writable` for a completed write, by `Renewable` for a merge swap and by the revision read for a `verify.reevaluate` job, which ends `cancelled` with no completion-hook call; grace hold released at terminal for a kind that holds one, shared with `storage-and-gc.md` AC23); `internal/retention/schedule_test.go` (shared with `generic.md` AC17: the repository's `retention.pass` schedule disabled on deletion, exclusivity under two runners, lost-lease commit refused) |
| AC29 | integration + fault injection | `internal/proxy/revalidate_job_test.go` on the production runner (shared with `proxy-cache.md` AC26: read bursts while pending and while running, creation and member-change enqueue with and without commit through `EnqueueRevalidation(ctx, tx, remote)`, a request for a remote-only cell recording the cell and enqueuing in one transaction that commits or fails as a whole, no `Schedule` and no tick enqueue, offline, `read_only` and deleted remotes, `RetryAt` past `RetryAfter` with a network-layer zero-request assertion until then, the `index.merge` row committed with the adoption; shared with `signing-service.md` AC35 and `data-model.md` AC45); `internal/async/cancel_test.go` (the remote's deletion cancels its pending job through `CancelByRepository`) |
| AC30 | integration + architecture test | `internal/async/kinds_test.go` (for every registered kind, `Work`'s context carries no principal and no credential after an enqueue under an authenticated request); `internal/async/arch_test.go` (no import of `internal/server`); `internal/proxy/revalidate_job_test.go` (a failing replay whose response body carries a marker string: the marker absent from `last_error` and from every log record through `telemetry.NewTestRecorder`; shared with `auth.md` AC36's discarding-writer case and with `observability.md` AC31's replay-signal assertions: no request log line, no `requests_total` increment, `kind="proxy.revalidate"` and no `principal` on every record); the deferred `manage.apply` path, applying an `Operation` on its originating request's authorization with no principal, is on `auth.md` AC10's external review list, so this row's evidence is read there too |

## Implementation Phases

Placement in the charter's build order: the queue core (Phases 1 to 3) at the start of step 4b,
immediately after the step 4a re-open records its finding on the prototype's questions 4 to 6;
the deferred-operation consumer (Phase 4) at step 6a before Ansible collections; the remaining
consumers with their own specs' steps (the resolved build-placement question below). The `Job`
row, the `PausedKind` record and the pause pair of `management-api.md`'s job-administration
routes precede the core at step 4a, with the prototype's asynchronous half
(`write-triggered-services-prototype.md`'s resolved runner-substrate decision, was Q2 there).

### Phase 1: The queue core
- Entry: the `Job` row (`cancel_requested` and `holds_grace` included) and the `PausedKind`
  record, inherited from charter step 4a, where `data-model.md` Phase 5 builds them for the
  prototype's disposable claim loop (its "Build placement", AC41), and the pause pair
  `management-api.md` Phase 2 landed there (its AC32); this phase replaces the prototype's
  claim loop, lease and fence code and nothing of its rows, which are terminal before this
  runner's first claim. A row-shape change the prototype's loop forced is a revision request
  to `data-model.md` before this phase begins, never a migration this phase carries
- Transactional `Enqueue` with
  `trace_context` and `request_id`, refusing unregistered kinds, SKIP LOCKED claim over the
  registered kinds with the exclusivity predicate, lease and token, the job context from one
  `telemetry.WithJob` call per claim, heartbeat, fenced `Finish` and `Checkpoint` through the
  on-a-transaction form's two shapes,
  retry classes (`Permanent`, `RetryAt`, `Skip`) and backoff, lease-expiry rescue with the
  attempt-exhausted and cancel-requested endings, the registration options (`WithMaxAttempts`,
  `WithBackoff`, `WithHoldsGrace`), pruning, unknown kinds skipped, no principal in any job's
  context (AC1 to AC4, AC7, AC18, AC26, AC27, AC30)
- `Runner` with bounded workers, `NOTIFY` wake-up and poll fallback, drain on shutdown (AC23)
- Architecture tests and the goroutine scan (AC16, AC19), the fence and crash suites (AC3, AC6)
- Configuration under `scripts/check-config-keys.js` (AC22)

### Phase 2: Keys, cancellation and operator controls
- `coalesce_key` and `exclusive_key` indexes and claim behaviour (AC11's queue half, AC12)
- Cancel, pause and resume with database-held state and `NOTIFY async_cancel` (AC9, AC10),
  the runner reading the `PausedKind` record the pause pair has written since step 4a;
  `CancelByRepository` (AC28) for `repository-lifecycle.md`'s deletion transaction
- The listing and cancel routes through `management-api.md`'s mount, beside the pause pair
  already there (AC21), metrics and alerts under `observability.md`'s names, with the floored
  period of a derived-next-run row (AC20)
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
  `verify.reevaluate` in `internal/verify`, its `Finish` calling the completion hook that
  package declares, and `verify.tuf_refresh`, `verify.revocation_refresh`
  in `internal/trustsource` (step 4b, AC15); `index.merge` with every trigger, including the
  adoption hook and the re-evaluation completion hook, and `signing.resign` per pointer and per repository, both committing through
  the door's document-only form, the cadence's next run written by `Finish`, by every
  transaction producing a windowed document and by a shortening (step 7, AC11, AC14's cadence
  clauses); `proxy.revalidate`, registered with
  `proxy-cache.md`'s Phase 2 once the queue core exists, its first caller arriving with the first
  format whose virtual phase has a `Merge` (AC29); `replication.sync` per link, its schedule
  disabled by takeover as by deletion and the taken-over repository's `signing.resign` rows
  registered through `RegisterSchedules` (step 10; AC14);
  `credential.prune` (`credential-management.md` Phase 1 at step 2, which precedes the queue
  core: until step 4b it runs under the fixture runner `generic.md`'s Phase 2 already uses for
  `retention.pass`, and nothing is due before then in practice, the window being 90 days;
  reported to that spec). Each lands with its kind's row in `kinds_test.go` (AC8) and the
  proxied-path cases where it has one (AC17)

## Tasks

Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. Twelve questions were written in decision shape and adopted under the owner's standing
delegation (nine at authoring, one at the 2026-09-28 reconciliation, one in the 2026-09-28
closing sweep on Opus, one in the Fable follow-up of 2026-10-08, round 6); each is recorded
below and folded through Scope, Design, the criteria
and the Test Plan. The first eleven were re-examined on Fable on 2026-10-01 as if decided fresh; the
verdict is on each record (seven confirmed, four amended: Q4, Q5, Q7 and Q10; none superseded).

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

Rechecked on Fable 2026-10-01: confirmed. The consumer list has only grown since (the
revalidation replay, `credential.prune`), each arriving with the same four needs, and no sibling
has asked for a property the one queue cannot give; the cost the record under-stated is that a
single package everything depends on makes every kind's registration a contract (`Skip`,
`HoldsGrace`, the per-kind overrides) rather than a private choice, which this pass now spells
out in "Package shape".

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

Rechecked on Fable 2026-10-01: confirmed. The adversarial pass found the owned-code cost real
and specific: the authoring draft's claim query discovered a held `exclusive_key` only at the
`UPDATE`, which would have spun every process on the head-of-queue row, and had no ending for
a job whose worker died `max_attempts` times or whose cancel was requested before its lease
expired; all three are the kind of defect a library would have carried for us and are now in
the claim's predicate and rescue rules, with the property suite holding them. That is the cost
option A accepts, paid where the record said it would be.

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

Rechecked on Fable 2026-10-01: confirmed. Two columns the runner needs on its own record
(`cancel_requested`, `holds_grace`) and one record it needs beside it (the paused-kind set)
are exactly the things option A would have put on the client-visible `Operation`; that they
arrived without touching `Operation` is the split working as intended. `data-model.md`'s
transcription carries all three since its Fable follow-up of 2026-10-01 (AC41).

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

Rechecked on Fable 2026-10-01: confirmed and amended. The adoption stands: for the shape it was
written for, bytes committed before the job that references them, a timing input to the
existing grace clock is the right answer and the root set stays five. The fold was wrong in
applying it to every kind that names a repository. `proxy.revalidate` has the opposite shape
(its adoption commits row and reference together, `storage-and-gc.md` AC8) and a retry horizon
of hours per job, and `storage-and-gc.md`'s Fable recheck showed the per-job hold chaining
under a persistent upstream rate limit with continuous virtual reads into a hold on the
remote's grace for the duration, a leak the quota cannot see. The hold is therefore declared
per kind at registration (`HoldsGrace`, default true, copied to the row at enqueue so the
sweep reads a flag and knows no kind), and `proxy.revalidate` declares it false. Cost stated
now: one declaration per kind that a wrong `false` would turn into a data-loss hazard, held by
`kinds_test.go`'s no-unreferenced-blob check at every fault point; `storage-and-gc.md` AC23's
`proxy.revalidate` clause is inverted (its Fable follow-up of 2026-10-01). Flagged owner-facing:
this changes a criterion of a spec planned on Fable, taking an exemption that spec named as
available rather than adopted.

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

Rechecked on Fable 2026-10-01: confirmed and amended. Cooperative cancel and the `cancelled`
state are right; the fold left the running-job cancel living only in a `NOTIFY`, so a dropped
notification or a lease expiry before the worker noticed would have re-run the job as if never
cancelled. The request is now a `cancel_requested` column read at every heartbeat and every
claim, so a cancel is durable across a dead process and a lost notification (Design, AC9, the
property suite); transcribed by `data-model.md` (AC41, its Fable follow-up of 2026-10-01).

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

Rechecked on Fable 2026-10-01: confirmed. The under-stated cost is a record: a database-held
paused set is a row per paused kind in the shared schema, which `data-model.md` lists as
`PausedKind` since its Fable follow-up of 2026-10-01 (AC41), a table of this package's own
having been ruled out by AC19; AC10 now says a process
started after the pause honours it. Since 2026-10-08 the record and the pause pair land a
step before this runner, at charter step 4a, because the prototype's disposable claim loop is
held by the same mechanism (`write-triggered-services-prototype.md`'s resolved
runner-substrate decision, was Q2 there, owner-facing), which is the harness-hold half of
this decision proven before the runner exists; AC10 and AC19 name the record.

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

Rechecked on Fable 2026-10-01: confirmed and amended. The horizon is right; the fold counted a
lease expiry as an attempt without any path that ends the job when the count runs out, since a
worker that dies returns no error to classify, so a job that crashed its process every time
would have been rescued forever. The rescue now ends an attempt-exhausted row `failed` (Claim,
Retry, AC7), and the termination bound is stated over claimable time, excluding pause, a held
key and an unregistered kind, which the property suite's invariant now says.

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

Rechecked on Fable 2026-10-01: confirmed. Under-stated cost added to the body: every process
with workers holds a dedicated `LISTEN` connection and every scheduler candidate a dedicated
lock connection for its life, outside the pool, which `deployment.md`'s connection sizing must
count.

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

Rechecked on Fable 2026-10-01: confirmed. The charter carries it as written. The cost the record
did not name: three schedule consumers land before step 4b (`storage.sweep` and its siblings,
`retention.pass` at step 2, `credential.prune` at credential-management's Phase 1), so until the
queue core exists they run only under the fixture runner `generic.md`'s Phase 2 names, and a
binary built before step 4b runs no schedule at all; acceptable for a build order whose steps
are milestones, stated in Phase 5 and reported to `credential-management.md`. Amended from
the prototype's side on 2026-10-08, the option unchanged: its resolved runner-substrate
decision (was Q2 there, owner-facing) lands the `Job` row, the `PausedKind` record and the
pause pair at step 4a, before this core, so that its disposable claim loop runs over
production rows and is held by the production route; the core's own placement at 4b, the
reason for it and Phase 4's at 6a stand, and Phase 1 now opens on inherited rows rather than
on a schema of its own.

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

Rechecked on Fable 2026-10-01: confirmed and amended. The rule protects the top-level kind
only, and `manage.apply` is one kind for every handler operation: a rollout that adds an
operation kind, or a format, would have the older binary claim the job and fail the client's
`Operation` for no fault of theirs, option C's cost through the back door. The worker now
returns `async.Skip` for a kind its handler does not declare and the runner restores the row
unchanged, skipping that id for one lease in this process (Claim, "Package shape", AC26, the
enforcer table). Cost: one more sentinel and a small per-process skip set with expiry.

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

Rechecked on Fable 2026-10-01: confirmed. Counting the deferral as an attempt is what keeps
every job bounded and makes a rate limit that never lifts a `JobFailed` alert once per bound
rather than a job that waits forever; B's unbounded wait was correctly refused. The cost was
mis-stated in one respect and under-stated in another. The grace half is gone: with the
grace-hold decision amended (was Q4), a `proxy.revalidate` job holds no grace, so a
rate-limited remote's unreferenced bytes are collected on the ordinary clock and the "holding
its remote's grace open meanwhile" cost no longer exists. What the record did not say: the
bound is per job, and the next virtual read past the TTL enqueues a fresh job the moment the
failed one is terminal (`proxy-cache.md` AC26), so under a persistent limit the fleet makes one
conditional upstream request per cool-down and raises `JobFailed` about every eight hours for
as long as the reads continue; that is the visible, bounded shape the decision was chosen for.

### Resolved: the exported period of a derived-next-run row marked due by another transaction (was Q12, raised and adopted 2026-10-08)

**Adopted 2026-10-08 under the owner's standing delegation**, on Fable, in the round-6
follow-up, and **owner-facing**: it fixes how `ScheduleOverdue` reads a cadence row another
transaction has just marked due, and it adds a floor to a metric `observability.md` defines
from this spec's AC20. Option A: the period the leader exports for a derived-next-run row
(`signing.resign`) is `next_run_at - last_run_at` as the row stands at collection, floored at
`async.scheduler_interval + async.poll_interval + async.lease`, the queue's own bound on
running a due row. Folded into "The scheduler", AC20 and its row, and Phase 2.

The question, opened by `signing-service.md`'s resolved changed-window decision (was Q26
there): a shortening transaction writes every other signed pointer's row's next run to now. The
round-2 follow-up here defined a derived-next-run row's period for `observability.md`'s rule
(`time() - last_run > 2 * period`) as `next_run_at - last_run_at` written at `Finish`, when the
only writer of a next run was `Finish` and the gap was the fraction of a validity window. A row
marked due seconds after its last run now has a gap of seconds, so the kind's series would
read overdue before the next tick could enqueue the row, firing `ScheduleOverdue` on every
window shortening that follows a recent renewal, a false alert the operator's own action
causes. What should the period of such a row be?

**Recommendation:** A. The alert exists to say the queue is late, and the one bound this spec
already states for running a due row is a tick to enqueue, a poll to claim and a lease should
the first claimant die; a period shorter than that bound asks the queue for what it cannot do.
The floor needs no new column, no knowledge of which transaction wrote the row, and leaves
every real cadence (hours to days) untouched.

| Option | You get | It costs |
|---|---|---|
| **A. Floor the derived period at `scheduler_interval + poll_interval + lease`** (adopted) | No false `ScheduleOverdue` on a shortening; no schema change; the fold stays a read of the row; a row marked due and never run still fires, after the bound twice over | A derived cadence shorter than the bound (a test profile's one-minute window at `resign_at_fraction` 0.5 is 30 s against a 75 s floor) is detected overdue later than its own gap would say; no production window is that short |
| **B. Store the period on the `Schedule` row, written by `Finish` and the producing transaction, left by a shortening** | The exact gap survives the mark | A `data-model.md` column for one metric; the shortening has to know not to touch it; a row's period and its `next_run_at` can disagree |
| **C. Leave the gap unfloored** | Nothing to add | `ScheduleOverdue` fires on every shortening after a recent renewal, before any tick could have run the row |

**Why this is yours:** it shapes an alert `observability.md` carries by name, and it trades a
small loss of sensitivity on a short cadence for silence on an operator's own setting change.

Accepted cost: the delayed detection on a cadence shorter than the bound, which no production
profile has. B lost on the column and the disagreement it invites, C on the false alert.
Reported to `observability.md`, whose three statements of the derived-next-run period gain the
floor.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-27 | 998b03a | authoring pass: grounded first draft, not a review | Gathered the requirements `data-model.md` (the `Operation` entity, AC32, the non-root table's grace note), `management-api.md` (deferred kinds, 202 and poll, idempotency, `Operator` dispatch, retention keys), `signing-service.md` (merge contract, cadence re-sign, the goroutine exception), `artifact-verification.md` (re-evaluation worker, refreshes), `supply-chain-policy.md` (scans, retries, feed sync), `replication.md` (resumable transfers), `generic.md` (retention pass), `storage-and-gc.md` (sweep exclusivity, session grace hold), `write-triggered-services-prototype.md` (questions 4 to 6, AC8 to AC12) and the format specs placed on the step 6a subsystem, plus consequences items 3 (format-management fold), 2 and 14 (management-api), 15 (signing-service) and 9 (storage-and-gc). Grounded prior art fetched this run: River's docs (transactional enqueue, maintenance services, unique jobs, retries, cancellation) and brandur.org's argument, Pulp's `worker.py` (SKIP LOCKED claim, resource locking, wake-up and cancel channels, missing-worker rule), Harbor's jobservice README (kinds, statuses, retries, stop and cancel, limitations), Nexus's tasks page, Gitea's `[queue]` section, PostgreSQL's `SKIP LOCKED` documentation, AIP-151; Pulp's architecture page answered 403 and 404 and is recorded as silence beyond the source. Design: one PostgreSQL-backed queue with transactional enqueue, SKIP LOCKED claim, lease with fencing token, fenced transactional `Finish` carrying effect, `Operation` and job together, bounded retries, coalescing and exclusivity by partial unique index, cooperative cancel, pause and resume, a leader-elected scheduler with database-held schedules, a repository grace hold for unfinished jobs, and the enumerated crash-recovery table. Nine questions written in decision shape and adopted under the standing delegation. 26 criteria, each with a Test Plan row; `node scripts/check-spec.js` run against this file with zero failures. Stays draft; awaits an independent review. |
| 2026-09-28 | 9ebf6e9 | cross-spec reconciliation of the foundation authoring wave. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` targeting this file verified against the source spec's current text before applying. From `repository-lifecycle.md` (authoring item 12; its "Deletion" step 8 and AC21): a new bullet under "Cancellation, pause and resume" - the deletion transaction cancels every pending job naming the repository, requests cancel on running ones, disables the repository-scoped `Schedule`s, a job reaching `Checkpoint` or `Finish` on a deleted repository is refused by the write-transaction constructor and ends itself `cancelled`, the grace hold stands until terminal; `CancelByRepository(ctx, tx, repo)` added to the package shape as the one exported write path outside the package, with an enforcer row; AC28 added, its rows shared with that spec's AC21 and `storage-and-gc.md` AC23; `Schedule` gains an optional repository reference. From `deployment.md` (item 9): (a) unknown kinds skipped, not failed, which contradicted the draft's AC26 and is recorded as Q10, adopted under the standing delegation, with the claim query restricted to registered unpaused kinds, AC26 rewritten and Phase 1 following; (b) the leader lock is `internal/db/lock.LockScheduler` on a dedicated connection, with `deployment.md` AC19's enforcer cited (AC14, "The scheduler", "Package shape"); (c) no rename: the kind table now says why `verify.tuf_refresh`/`verify.revocation_refresh` (kinds) and `verify.sigstore.refresh`/`verify.revocation.refresh` (period keys) differ. From `observability.md` (item 8): the ten `async_*` series and the merge worker's breach counter by catalogue name, `JobFailed`, `ScheduleOverdue`, `VirtualMergeStalenessBreach` and `SchedulerLeaderless` through `telemetry.Alert` (AC20 rewritten), the leader-only state-gauge collector (AC14, its AC7), `trace_context` and `request_id` set at enqueue with a linked job span (the `Job` record, "Enqueue is transactional", AC27 added, its AC16 row). From the `data-model.md` reconciliation (item 2): `Job` and `Schedule` cited to "Jobs and schedules" and AC41, `cancelled` as admitted by AC32 and `management-api.md` AC16. From the `storage-and-gc.md` reconciliation (item 3): AC23 cited for the grace hold in Design, the enforcer table, AC13's row and Phase 4; the storage kinds run at the `gc.*_interval` keys with `LockSweep` as the second guard (its AC26). From the `supply-chain-policy.md` reconciliation (item 8): `policy.feed_sync` one schedule per source with exclusivity key `feed_sync:{source}`, the scan alert bound `policy.scan.unscanned_alert_after` (kind table, "The scheduler", AC14). From the `replication.md` reconciliation (item 7): `replication.sync` per link at `replication.sync_interval` or the link's own period, its AC23 cited. From the charter reconciliation (item 4): Context restated on the charter's step 4b queue core and step 6a deferred operation, "owed" dropped for `management-api.md`, `observability.md` and `deployment.md`. Context's sibling summaries rewritten to what each spec now says (`signing-service.md` AC19 and AC22 on the production runtime, `artifact-verification.md` on `async.kind_limits` with the `verify.workers` key retired under `deployment.md`'s was-Q11, `supply-chain-policy.md`'s `policy.scan` shape, `replication.md` AC23, `storage-and-gc.md` AC23 and AC26, plus new entries for `repository-lifecycle.md`, `observability.md` and `deployment.md`). The configuration table is in the three-column shape `scripts/check-config-keys.js` parses (AC22 extended). Already done at authoring: management-api items 2 and 14, signing-service item 15, debian item 20's deferred regeneration, format-management item 3's consistency note. 28 criteria, each with a Test Plan row; ten resolved questions, zero open. `node scripts/check-spec.js` on this file: zero failures. Stays draft pending a gate review. |
| 2026-09-28 | b7640dd | closing reconciliation sweep on Opus: every `consequences.md` item targeting this file from "From format batch 3 reconciliation" through the latest section, plus earlier items the progress log did not show as applied. Not a review | Not a review. Each item verified against the current text of its source spec before applying. Format batch 3 item 7, batch 4 item 8, batch 6 item 12, batch 7 item 12, batch 8 item 10: Context's format list rewritten from each format spec's own virtual and dependency sections, which also moved `chef.md`, `luarocks.md`, `maven.md` and `helm.md` (index.merge consumers that ask nothing of this spec directly) and named `composer.md`, `homebrew.md`, `openvsx.md`, `puppet.md`, `swift.md`, `terraform.md`, `conan.md` as per-request virtuals, with `hex.md` `Virtual: unsupported`; `conda.md` left the "regenerates inside the write" sentence for the merge consumers. Signing-service closing sweep item 4: `index.merge` triggers gain member-list change and remote adoption through the adoption-commit hook (its was-Q15, was-Q16, AC34, AC35; AC11 extended, its row sharing `internal/index/virtual_remote_member_test.go`); `signing.resign` gains the repository-scoped schedule under `repository:{repository}` (its AC33, `hackage.md` was-Q16; AC14 extended, deletion disables it); the revalidation kind added. Proxy-cache closing sweep item 1: the `proxy.revalidate` row matches its "Revalidation outside the request" and AC26 exactly (callers, `revalidate:{repository}` for coalesce and exclusivity, no `Schedule`, nothing under `proxy.offline`, `read_only` or deleted, effect an adoption whose hook enqueues `index.merge`, rate limit past `RetryAfter`); the read-path enqueue runs in its own enqueue-only transaction so `Enqueue(ctx, tx, Job)` stays the only signature; the adoption outside the fence argued idempotent; remote deletion cancels the pending job through `CancelByRepository`; AC29 added. Auth AC36 and FHI AC18 (the prompt's note, and proxy-cache closing sweep item 4 seen from here): the runner gives no job a principal, treats `trace_context` and `request_id` as correlation only, never receives the replay entry, and keeps replayed response bytes out of `last_error` and its logs; "the runner's only route to a handler is `internal/manage`" corrected to name both worker doors; enforcer rows and AC30 added. Q11 raised and adopted under the standing delegation: `RetryAt(err, at)`, needed because the transient class could not express proxy-cache's "`run_at` moved past `RetryAfter`" (AC7, the property suite's termination invariant, AC24; fable_recheck extended). Earlier items not shown as applied: format batch 2 item 2 (Ansible's import deferred as the `publish` kind on `manage.apply`, its was-Q9, in Context); format batch 1 item 9 (AC28's row shares `internal/retention/schedule_test.go` with `generic.md` AC17). Already done: charter reconciliation item 4, repository-lifecycle authoring item 12 (credential and lifecycle item 3's half for this file; items 9, 10 and 13 target other files). 30 criteria, each with a Test Plan row; eleven questions resolved, zero open. `node scripts/check-spec.js` on this file: zero failures. Stays draft pending a gate review. |
| 2026-10-01 | e8f554d | Fable recheck: full review (claim verification at HEAD against every cited sibling, all 33 format specs' virtual sections, the charter and the prototype; adversarial lens at full strength on the cloud-authored whole, its design judgement treated as unreviewed; constitution compliance; go-spec-reviewer inline, its codebase step vacuous since the module's only Go file is `cmd/stackweaver-registry/main.go`) + re-examination of the eleven adoptions made without Fable (Q1 to Q9 in the cloud session, Q10 and Q11 on Opus) | Brought current first: every open consequence against this file applied and verified against its source's current text (foundation leftovers item 1, `EnqueueRevalidation(ctx, tx, remote)` at both sites; management-api recheck item 5, the `deferred_threshold` citation gone; credential-management recheck item 4, the `credential.prune` kind in the table, AC14 and Phase 5; signing-service recheck item 13, `index.merge` enqueued by a `local` member's target-moving pointer transition through `Transition` and the read-driven cell enqueuing `proxy.revalidate` from the virtual's request path; data-model recheck item 6, the enqueue-only transaction also writing the requested cell, "Enqueue is transactional" reworded; storage-and-gc recheck item 3, judged below; auth recheck item 7, AC30's row cites AC10's deferred-Apply item; batch 7 item 12 and the other Context-list items found applied at b7640dd, `rubygems.md` added as the merge consumer it is and the first-member formats named). Verdicts: Q1, Q2, Q3, Q6, Q8, Q9, Q11 confirmed, each with an under-stated cost added to its record; Q4 confirmed and amended (the hold is declared per kind, `HoldsGrace` copied to the row at enqueue, `proxy.revalidate` false: its adoption commits row and reference together and its per-job hold chained under a persistent rate limit into a hold for the duration, the leak storage-and-gc accepted while naming the exemption; that spec's AC23 clause inverts, owner-facing); Q5 amended (the running-job cancel is a `cancel_requested` column read at every heartbeat and claim, so it survives a lost notification and a lease expiry); Q7 amended (a rescue at `max_attempts` ends the job `failed`, since a dead worker returns nothing to classify; the bound is over claimable time); Q10 amended (`async.Skip` for a `manage.apply` job whose operation kind this process's handler lacks, the row restored unchanged). None superseded. Adversarial findings fixed directly: the claim query found a held `exclusive_key` only at the `UPDATE`, which spins every process on the head-of-queue row and holds every kind behind it, now a predicate in the subselect with the index as the race guard (AC12); `NOTIFY` was described as issued after commit, now inside the transaction and delivered at commit (AC1); `Finish` opened a bare transaction where the sole write-transaction constructor must own a repository write, now the constructor's on-a-transaction form inside `Finish` with the lock order stated (AC5; storage-and-gc consequence); AC22 refused at startup the very defaults the table gives (`job_retention` 7 days under `operation_retention` 90), the per-job rule making the check wrong, removed (deployment consequence); the paused set was a `paused_kinds` table nowhere in the shared model, now a record reported to data-model; `Enqueue` refuses an unregistered kind, since only a registration carries the row's declarations; the outside-the-fence argument for `proxy.revalidate` stated across processes. Constitution: both paths (AC17), the shared model and no package-owned table (AC19, with the two columns and the record reported rather than added), the named enforcers, findings in the doc, CI economy all hold. No em-dashes on touched lines. 30 criteria, each with a Test Plan row; zero open questions; `node scripts/check-spec.js` zero failures on this file; `fable_recheck` cleared; draft -> planned. Sibling consequences reported, not applied. |
| 2026-10-01 | ec38840 | Fable follow-up: queued cross-spec items since the recheck | A review, narrower than the recheck: every item in `agents/spec-loop/consequences.md` targeting this file after the e8f554d row collected, verified against the current text of its source spec and of this one, then read adversarially against the rest of this spec. Applied, seven. Observability recheck item 5 (its "Structured logging", "Redaction", AC31): the runner derives each job's context through exactly one `telemetry.WithJob(ctx, id, kind, request_id)` call per claim before `Work`, installing the job attributes and the per-job secret set `MarkSecret` appends to under `proxy.revalidate` and `replication.sync` (Context, Claim, "Package shape", a new enforcer row; AC27 extended, its row sharing `internal/proxy/revalidate_job_test.go` with observability AC31; AC30's row names the shared replay-signal assertions). Artifact-verification recheck item 4 (its was-Q3 as amended, AC22): `verify.tuf_refresh` and `verify.revocation_refresh` are registered by `internal/trustsource`, `internal/verify` registering only `verify.reevaluate` (Context, the kind table, "Package shape", Phase 5; AC14's row gains `internal/trustsource/sources_test.go`). Repository-lifecycle recheck item 4 (its "Deletion" steps 5 and 8, AC10, AC21, AC29, was-Q11) with storage-and-gc follow-up item 1 (its "The write transaction has one door", AC24, AC25, AC30): the `Finish` paragraph no longer sends the merge swap through `repository.Writable`; the on-a-transaction form has two shapes, the standard one for `manage.apply` and `retention.pass` and the document-only one under `repository.Renewable` for the `index.merge` swap and the `signing.resign` run, with no claim, no snapshot and the lock order documents, member rows, head, job row (Finish, the kind table, a new enforcer row; AC11 and AC14 extended, AC11's row sharing `internal/storage/write_hook_test.go` and `internal/repository/delete_virtual_test.go`); an `index.merge` job's repository reference is the virtual it merges and a `signing.resign` job's its repository, so `CancelByRepository` reaches both (the kind table, the deletion bullet, AC11, AC28 and its row); `signing.resign` and `replication.sync` are not suspended by `read_only`, only `retention.pass` is (Scope, the kind table, "The scheduler", AC14 and its row sharing `internal/repository/readonly_test.go`). Signing-service follow-up item 3 (its was-Q22, AC35; `proxy-cache.md` AC26 as amended): a request for an uncovered cell on a virtual already at `index.requested_cells_max` records nothing and enqueues nothing (the `proxy.revalidate` row, AC29). Data-model follow-up item 2 (its AC41 and `PausedKind`): the seven "reported" and "lists no such record" sentences in the `Job` record, the pause bullet, Phase 1 and the was-Q3, was-Q5 and was-Q6 recheck notes are citations now, and AC9's and AC10's rows share `internal/async/cancel_test.go` and `internal/async/pause_test.go` with data-model AC41. Proxy-cache follow-up item 3 (optional): the cross-process adoption argument in Finish cites its "Nor is the current revision adopted twice" and AC26. Found already applied and verified in the text: storage-and-gc follow-up item 1's second half (AC13's row already names `internal/storage/pending_operation_gc_test.go` as shared with storage AC23). Found met by siblings since the recheck and reworded from "reported" to citations on lines touched: storage-and-gc AC23's inverted `proxy.revalidate` clause (Context, "the GC grace", the was-Q4 note), deployment's dropped retention check and its per-role connection budget (Context, "Configuration"). Credential-management recheck item 4 (the pre-4b registration of `credential.prune`) targets that spec, whose follow-up has not run; this spec's Phase 5 and was-Q9 note already state the fixture-runner convention and say so, left as they are. Declined: nothing. Adversarial check of what changed: the new enforcer row asserted that a frozen repository ends a deferred `Apply` `failed` `read-only` while no criterion here said so, now AC5's clause with `internal/repository/readonly_test.go` shared with lifecycle AC10; AC28's row cited `internal/repository/delete_test.go` for lifecycle AC21, whose row names `delete_jobs_test.go`, corrected (data-model AC41's row carries the same stale name, reported); the merge row's grace sentence claimed the merged bodies are put before the swap, softened to what is certain; a merge of a `read_only` virtual is stated only as far as `Renewable` passes it, which lifecycle's was-Q11 lists by name. No question raised or adopted; no mark root added; `auth.md` AC10 untouched; no pinned method changed. No em-dashes or en-dashes. 30 criteria, each with a Test Plan row; Open Questions empty; `node scripts/check-spec.js` on this file: zero failures. Stays planned. |
| 2026-10-01 | fc55b40 | Fable follow-up: queued cross-spec items since the recheck (round 2) | A review, narrower than the recheck: the whole of `agents/spec-loop/consequences.md` read, the three items raised against this file after the ec38840 row collected (observability follow-up item 1, artifact-verification follow-up item 1, supply-chain-policy follow-up item 2; every earlier item re-found applied at ec38840), each verified against the current text of its source spec and of this one, then read adversarially against the rest of this spec. Applied, three of three. (1) Observability follow-up item 1 (its "Cardinality", AC5, the catalogue row, its resolved `schedule`-value decision, was Q9 there, owner-facing): "The scheduler" and AC20 state the `schedule` label's value, the kind for an instance-wide schedule, the kind with the source's or link's name for a per-source or per-link one, capped under `name_label_limit`, and the kind alone for a repository- or pointer-scoped kind, whose series the leader exports as the most overdue row's `last_run` and `period` so `ScheduleOverdue` on the kind's series is true exactly when some row of the kind is overdue, within one `state_interval`; AC20's row names the five value shapes and the fold in `internal/async/metrics_test.go`, shared with observability AC5; Context's observability bullet cites the decision. (2) Artifact-verification follow-up item 1 (its "The verdict is a stored fact", "Re-evaluation when a trust set changes", AC3, its was-Q1 as amended): the `verify.reevaluate` row, AC15 and Context's stale quotation no longer say "superseded marks"; the worker pages through the repository's verdicts whose revision is not current, superseded being derived from the verdict's revision, the revision writing no verdict row and the job clearing no mark, and a job overtaken by a second revision ending at its next checkpoint; the "Finish writes" column is the recomputed verdict rows under the current revision; AC15's row gains the derived-state and overtaken-job cases and `internal/async/crash_test.go`, which AC17's row already ran over this kind. (3) Supply-chain-policy follow-up item 2 (its "The advisory feed and its freshness", AC21): `{source}` in `feed_sync:{source}` and in the `policy.feed_sync:{source}` schedule label is the source's name, the `policy.feed.sources` entry's `name` or `osv` for the default feed, reserved (the kind table, "The scheduler", AC14, AC20, Context). Declined: nothing. Adversarial check of what changed, two definitional gaps the fold opened and closed here rather than raised, since each has one answer the rule forces: a derived-next-run kind (`signing.resign`) has no `interval`, so its row's `period` for the ratio is `next_run_at - last_run_at` as written at `Finish`; and a row disabled by deletion, `read_only` or the offline flag is not exported and takes no part in the fold, since the offline paragraph already keeps a disabled row's `last_run` still, and exporting it would fire `ScheduleOverdue` on every network schedule of an offline instance (AC20 and its row carry both). Noted, not changed, pre-existing: a schedule that has never run has no `last_run` for the ratio, so the was-Q10 cost's reliance on `ScheduleOverdue` for a never-registered kind holds only once the kind has run at least once; left for the owner, no criterion depends on it. Sibling discrepancy found while verifying item 3: `supply-chain-policy.md`'s feed paragraph says the schedule's exclusivity key is "the kind" where this spec's kind table, from that spec's own reconciliation item 8, keys per source as `feed_sync:{source}`, reported. No question raised or adopted; no mark root added; `auth.md` AC10 untouched; no pinned method changed. No em-dashes or en-dashes. 30 criteria, each with a Test Plan row; Open Questions empty; `node scripts/check-spec.js` on this file: zero failures. Stays planned. |
| 2026-10-01 | ac597f6 | Fable follow-up: queued cross-spec items since the recheck (round 3) | A review, narrower than the recheck: the whole of `agents/spec-loop/consequences.md` read, the one item raised against this file after the fc55b40 row collected (round-2 management-api follow-up item 1; every earlier item re-found applied at ec38840 or fc55b40, and the round-2 async follow-up's own items, the "Optional wording still open" list and the web-ui follow-up target other files), verified against `management-api.md` at HEAD ("Who learns what from a refusal", the endpoint table's jobs rows, AC16, AC32, AC35 and its Test Plan row, the resolved refusal-type decision, was Q18 there), then read adversarially against the rest of this spec. Applied, one of one: AC21 said the jobs routes are refused `not-found` to non-admins "under the existence oracle", while `management-api.md`'s one refusal rule answers a registry-wide route, which addresses no repository the oracle could protect, `unauthorized` to every non-admin principal (an admin-owned token and a repository-scoped token holding every action included, since no token holds the admin role) and `unauthenticated` to a credential-less request; AC21 now says so, its `internal/manage/jobs_routes_test.go` row names the four caller classes on each of the listing, cancel and pause routes and is shared with management-api AC35's `internal/manage/refusal_types_test.go`, which already named this row from its side; the Cancel bullet distinguishes `POST /api/v1/operations/{id}/cancel` (originating or admin, `not-found` to any other caller, a row that caller may not see) from `POST /api/v1/system/jobs/{id}/cancel` (admin-only for every job, with or without an `Operation`, which the old wording "admin for jobs without an `Operation`" understated); the Pause bullet and Context's management-api entry cite AC35. Declined: nothing. Adversarial check of what changed: AC5's "poll and cancel routes are refused `not-found` to a principal lacking the originating write's authorization" stands, since management-api AC35 keeps exactly that pair as row scoping under AC16, and AC5 now says why it differs from AC21 so the two criteria cannot be read as contradicting; no other line of this spec names the oracle or a refusal type for the jobs routes; AC10's harness hold pauses through the admin route as before; the enforcer table carries no refusal row and needs none, the rule being `management-api.md`'s and held by its `refusal_types_test.go`. No question raised or adopted; no mark root added; `auth.md` AC10 untouched; no pinned method changed. No em-dashes or en-dashes. 30 criteria, each with a Test Plan row; Open Questions empty; `node scripts/check-spec.js` on this file: zero failures. Stays planned. |
| 2026-10-01 | 71e0ccb | Fable follow-up: queued cross-spec items since the recheck (round 4) | A review, narrower than the recheck: the whole of `agents/spec-loop/consequences.md` read, the three items raised against this file after the ac597f6 row collected (replication gate review item 4; round-3 signing-service follow-up item 2; round-2 supply-chain-policy follow-up item 1, optional; every earlier item re-found applied at ec38840, fc55b40 or ac597f6, the "Optional wording still open" list targets other files, and the cran.md Fable recheck that landed as 71e0ccb mid-pass queued nothing against this file and changed none of the siblings read here), each verified against the current text of its source spec at HEAD (`replication.md` "Sync runs on the shared async runner", "A replica is read-only", the link-composition bullets, AC16, AC21, AC22, AC23 and their rows, its resolved takeover-signing decision, was Q12 there; `signing-service.md` "Rotation profiles", "Replication", "Package shape", AC22, AC23 and their rows, its amended was-Q9 record; `supply-chain-policy.md` "The advisory feed and its freshness", AC23 and its row; `data-model.md` "Jobs and schedules") and of this one, then read adversarially against the rest of this spec. Applied, three of three. (1) The `replication.sync` row, Scope, Context, "The scheduler" and AC14 no longer say only that `read_only` leaves the link in charge: the schedule keeps enqueuing while the applier's entry point, which waives `ErrReplica` alone, refuses each run `ErrReadOnly`, so the link reports `failed` with reason `read-only` until the thaw (replication AC22), and the link's schedule is disabled in the transaction that ends the link, takeover as deletion, so nothing enqueues for an `ended` link (replication AC23); AC14's row names `internal/replication/sync_job_test.go` for the disabled-schedule half, shared with replication AC23, and `internal/replication/readonly_replica_test.go` for the frozen replica, shared with replication AC22; the disabled-row fold in "The scheduler" lists an ended link. (2) The `signing.resign` row, Context, "The scheduler" and AC14 state that `Finish` rewrites next runs and creates no `Schedule` row: the rows are created by `signing.Service.RegisterSchedules(ctx, tx, repository, nextRun)`, idempotently on the caller's transaction, by the runtime at a pointer's first windowed document with the expiry-derived value and by the takeover transaction with now, the takeover's own re-sign running on the request path through the door's standard document-only form and not on this queue (signing-service AC23); AC14's row gains `internal/signing/schedules_test.go`, shared with signing-service AC23, and Phase 5's replication line names both. (3) AC14's row names `internal/policy/feed_sync_test.go` for the per-source shape, shared with supply-chain AC23, whose row names `internal/async/scheduler_test.go` back. Declined: nothing. Adversarial check of what changed, one finding fixed: the Finish paragraph called `proxy.revalidate` "the one kind whose whole effect commits before `Finish`", while replication's planned text commits each snapshot's apply in its own transaction before the fenced `Checkpoint`, so an applied snapshot is outside the fence as well; the paragraph now says so and why it is safe (every apply locks the link row, applies by identity and skips a present snapshot, the position of record being the row; replication AC2, AC3), the row's "Finish writes" column matches, and AC8's row carries the interruption between an apply commit and its checkpoint. Noted, not changed, reported to replication: the terminal state of a sync job whose run the applier refuses `read-only`, and of one that finds its link `ended` at the next apply, is the worker's classification and replication's text leaves it unnamed, which decides whether `JobFailed` fires every `sync_interval` on a deliberately frozen replica. Pre-existing and unchanged: a row just registered by `RegisterSchedules` has no `last_run` until its first run (the round-2 owner note). No question raised or adopted; no mark root added; `auth.md` AC10 untouched; no pinned method changed. No em-dashes or en-dashes. 30 criteria, each with a Test Plan row; Open Questions empty; `node scripts/check-spec.js` on this file: zero failures. Stays planned. |
| 2026-10-08 | b00d406 | Fable follow-up: queued cross-spec items since the recheck (round 5) | A review, narrower than the recheck: the whole of `agents/spec-loop/consequences.md` read, the items raised against this file after the 71e0ccb row collected (signing-service was-Q23 item 3, queued 2026-10-08 from its record; the round-4 artifact-verification follow-up item 1; the replication follow-up's optional item 2; the round-2 supply-chain-policy follow-up's optional item 1; every earlier item re-found applied at ec38840, fc55b40, ac597f6 or 71e0ccb, and the `hackage.md` recheck running beside this pass had queued nothing against this file when the queue was read), each verified against the current text of its source spec at HEAD (`artifact-verification.md` "The completion is a trigger", "The verdict is a stored fact", "When verification runs", AC3, AC4 and AC3's row, its was-Q1 and was-Q3 follow-up notes; `signing-service.md` "The produce/verify boundary", the "A member's re-evaluation completing re-merges" trigger bullet, "Execution", "Package shape", its enforcer row, AC36 and its row, its resolved pending-verdict decision, was Q23 there, owner-facing; `replication.md` "A sync's outcome is the link's, and the job completes", its `read_only` bullet, AC22, AC23, its resolved sync-outcome decision, was Q13 there; `repository-lifecycle.md` "Lock order" and "State is checked in one place"; `data-model.md` on the trust-set revision) and of this one, then read adversarially against the rest of this spec. Applied, three of four; the fourth found applied. (1) Was-Q23 item 3 and the round-4 artifact-verification item 1, one change: the `verify.reevaluate` row, Context's artifact-verification entry and AC15 say the job calls the completion hook `internal/verify` declares exactly once, inside the `Finish` that commits its last page, handing the hook that transaction for `Enqueue(ctx, tx, Job)`, so the merges commit with the completion or not at all, once after a kill and the rescue, never from an overtaken job and once from the second revision's job, once for a repository holding no superseded verdict; that `Finish` reads the current revision and the repository's state under a share lock on the repository row the revision write takes `FOR UPDATE`, before the fenced job update, so a revision interleaved with the completing `Finish` yields one call in either order, and a `Finish` meeting the deleted state ends the job `cancelled` with no call; the `index.merge` row, Context's signing-service entry (six triggers now), "Coalescing and staleness", "Package shape", Phase 5 and AC11 gain the completion trigger for every signed virtual listing the member and none for an unsigned one, the revision enqueuing nothing; the Finish paragraph places a non-content kind's locks in the door's order, the repository-row share lock before every job row, which the deletion (its `Repository` row first, job rows last) and the revision write (that row, then the job it enqueues) take as well, so none cycles; "Enqueue is transactional" names the hook as the one caller that is a job; AC15's row carries the hook cases and the share-lock interleaving, shared with artifact-verification AC3's `trust_revision_test.go` and signing-service AC36's `admission_test.go`, which AC11's row names too; AC28's `cancel_test.go` row adds the deleted-state ending by the revision read. (2) The replication follow-up's optional item 2, taken because it answers the consequence round 4 reported: the `replication.sync` row, Scope, "Retry, backoff and permanent failure", "The scheduler" and AC14 say every outcome the link table names is written to the link row and the job ends `completed`, the link's `Schedule` being its retry, the classes kept for a fault of the worker itself, returned transient after the link reads `failed` `error`, the kind never wrapping `Permanent`, so `JobFailed` means the queue failed and stays silent on a replica an operator froze (replication was-Q13, AC22, AC23); AC14's `readonly_replica_test.go` row says so and the row gains `internal/replication/sync_outcome_test.go`, shared with replication AC22. (3) The round-2 supply-chain-policy follow-up's optional item 1 found applied at 71e0ccb (AC14's row names `internal/policy/feed_sync_test.go`). Declined: nothing. Adversarial check of what changed, two definitional gaps closed inline since each has one answer the existing rules force: a job now enqueues a job inside its own `Finish` and nothing said the fence covers that row, so AC3 names the enqueue among what a stale `Finish` never commits, the Finish paragraph says it, and an enforcer row and AC3's `fence_test.go` row hold it; and an enqueue from inside a job had no stated correlation, so "Enqueue is transactional" and AC27 fix it to the enqueuing job's span and the job's own `request_id` (the merge the hook enqueues names the trust-set write's request), `trace_link_test.go` asserting it, reported to observability as wording. Checked and unchanged: the runner still calls no handler and holds no replay entry, the hook being `internal/verify`'s call into `internal/index`, neither imported by the runner (AC16, AC17, AC30); every process registers every kind, so the hook's enqueue of `index.merge` from a process running `verify.reevaluate` is never refused; `verify.reevaluate` keeps `HoldsGrace` true and its `kind_limits` ceiling; AC8's cancelled-context case covers the hook's enqueue, since it sits inside `Finish`; the pre-existing owner note on a never-run schedule's `last_run` stands. No question raised or adopted; no mark root added; `auth.md` AC10 untouched; no pinned method changed. No em-dashes or en-dashes. 30 criteria, each with a Test Plan row; Open Questions empty; `node scripts/check-spec.js` on this file: zero failures. Stays planned. |
| 2026-10-08 | 2811a0f | Fable follow-up: queued cross-spec items since the recheck (round 6) | A review, narrower than the recheck: the whole of `agents/spec-loop/consequences.md` read, the items raised against this file after the b00d406 row collected (the `write-triggered-services-prototype.md` gate review's item 3; the `signing-service.md` round-8 follow-up's item 4; the round-5 `data-model.md` follow-up's item 2, which restates both; the round-4 `data-model.md` follow-up's optional item 1; and, relayed by the coordinator from the `debian.md` follow-up running beside this pass, its virtual settings change as a merge trigger; every earlier item re-found applied at ec38840, fc55b40, ac597f6, 71e0ccb or b00d406), each verified against the current text of its source at HEAD (`write-triggered-services-prototype.md` Scope, "The second class", AC8 and its row, Phase 4, its resolved runner-substrate decision, was Q2 there; `signing-service.md` "Rotation profiles", "A changed window", "Replication", the enforcer table, AC19, AC22 and its row, AC23, its resolved changed-window decision, was Q26 there; `data-model.md` "Jobs and schedules", "Build placement", the `PointerDocument` row, AC36, AC41, Phase 5; `management-api.md` the endpoint table's pause row, "Jobs", AC7 and its row, AC32, Phase 2; `project-charter.md` steps 4a and 4b; `formats/debian.md` in the working tree, "Virtual repositories", "The `settings` document", AC13 and its row) and of this one, then read adversarially against the rest of this spec. Applied, four. (1) Prototype item 3 with data-model's restatement: Context's charter, data-model, management-api and prototype entries, the pause bullet, AC10, the phases' preamble, Phase 1's new entry line, Phase 2 and the was-Q6 and was-Q9 recheck notes say the `Job` row, the `PausedKind` record and the pause pair land at charter step 4a for the prototype's disposable claim loop, that `internal/async` replaces the loop, the lease and the fence code alone and inherits the rows, terminal before its first claim, and that a row-shape change the loop forced is a revision request to `data-model.md` before Phase 1; AC19 names `PausedKind` among the shared-model records, its row the paused set read from that record and from no package-held table or memory. (2) Signing-service round-8 item 4 with data-model's restatement: Context's signing-service entry, the `signing.resign` kind row, "The scheduler" and AC14 say a row's next run has three writers and no creator but `RegisterSchedules`: the cadence's `Finish`, every transaction producing a windowed document for the pointer, from the expiry on the `PointerDocument` record it wrote (`data-model.md` AC36), and a shortening, which writes every other signed pointer's row of the repository to now and leaves the repository-scoped row untouched; the scheduler needs nothing new, a row written due coalescing with a pending job and waiting behind a running one on the pointer's key, which AC14's `scheduler_test.go` row carries, and AC14's row gains `internal/signing/window_change_test.go`, shared with signing-service AC22 and data-model AC36; Phase 5 names the three writers. (3) The relayed debian item, verified against the working tree and against `signing-service.md` AC19, which the same reading found this spec had never carried for the rename either: `index.merge` gains two triggers, a rename of the virtual (one coalesced merge in the rename transaction, no handler `Apply`) and a change of a declared `settings` document on the virtual, the one operation a virtual accepts under `management-api.md` AC7, applied through the door's document-only form with no snapshot and enqueuing one coalesced merge exactly as a member-list change, by the shared layer and never the handler, which imports no queue (AC16); in Context (eight triggers now), the kind row, "Enqueue is transactional", "Coalescing and staleness" and AC11, whose row names the rename in `internal/index/virtual_merge_test.go` and the settings change in `internal/manage/repository_type_test.go` (shared with management-api AC7, this row adding the enqueue and its absence after a rollback) and `internal/format/debian/manage_test.go` (shared with debian AC13). (4) The round-4 data-model follow-up's optional item 1 declined: it asks AC3 to cite `data-model.md` "Jobs and schedules" for a `Finish` enqueuing under the fence, and that section at HEAD carries no such sentence (the round-5 optional item asking data-model to add it is still open), so there is nothing to cite yet. Adversarial check of what changed, one finding raised and adopted rather than closed inline, since it has more than one answer: a row a shortening writes to now seconds after its last run has a gap of seconds, and the round-2 definition of a derived-next-run row's period as that gap would fire `ScheduleOverdue` (`time() - last_run > 2 * period`) before any tick could have run the row, on every shortening after a recent renewal; was Q12, adopted under the standing delegation and owner-facing, floors the exported period at `async.scheduler_interval + async.poll_interval + async.lease`, the queue's own bound on running a due row ("The scheduler", AC20 and its row with the false-alert and the still-fires cases, Phase 2), reported to `observability.md`, whose three statements of the derived period gain the floor. Checked and unchanged: `RegisterSchedules` stays the only creator and `Finish` still creates no row; the row-follows-document rule touches no `Schedule` row of another kind; the merge enqueued by a virtual's settings change coalesces under `virtual:{repository}` with every other trigger and the merge commit itself, a document-only transition of the same pointer, enqueues no merge, so no transition re-triggers itself; the runner still calls no handler and holds no replay entry; the queue core's placement at 4b and Phase 4's at 6a stand, was-Q9 amended from the prototype's side with the option unchanged; the pre-existing owner note on a never-run row's `last_run` stands. Consequences reported: observability (the floored period, wording in three places), signing-service and management-api (the declared-settings trigger and the shared enqueue site, optional wording), the charter (step 4a's entry still names only `Operation`, prototype gate item 5, already queued). No mark root added; `auth.md` AC10 untouched; no pinned method changed. No em-dashes or en-dashes. 30 criteria, each with a Test Plan row; twelve questions resolved, zero open; `node scripts/check-spec.js` on this file: zero failures. Stays planned. |
