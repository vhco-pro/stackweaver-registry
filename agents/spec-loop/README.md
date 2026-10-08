# Spec loop

The owner's standing instruction (2026-09-26): spec every foundation subsystem and all 33 catalogue
ecosystems in a continuous loop, never stopping to ask. A blocked open question is adopted at its
own written recommendation under the standing delegation in `CLAUDE.md`. This directory is the
loop's working state, so any session, local or cloud, can resume it from a clone. Delete it when
the queues are empty.

## Rules for running it

- **Model tier.** Fable authors and reviews specs. When it is out of credit the loop runs on Opus
  and marks every spec it authors or reviews with `fable_recheck` (see `CLAUDE.md`, model tiers).
  `make check-spec` prints the recheck queue; it is the first thing to spend Fable credit on, and
  no marked spec can reach `planned`. As of 2026-09-28: 27 specs marked (17 Opus-authored formats,
  the cloud session's 10 foundation specs, whose model was not recorded).

- **At most two agents at a time, and no agent may start its own.** The owner's local limit
  (2026-09-26, after parallel runs of nine to fifteen agents exhausted the spend limit twice and
  killed work mid-write); the cloud session ran one at a time. On 2026-09-28 a sweep agent started
  four extraction agents of its own, breaking the cap invisibly, so every brief now forbids it.
- **Spec work runs on the `fable` tier** (authoring, folding, reconciliation, gate reviews), matching
  `.claude/commands/spec.md`'s `model:` pin. Pass the model explicitly when spawning an agent.
- Every agent writes its Review Log row and status_description last, so an interrupted agent
  leaves finished work with no record, never a record of unfinished work. On resume, check which
  files have today's Review Log row: those finished.
- After each finished spec: file one GitHub issue (a thin pointer to the doc), backfill its
  `issue:` frontmatter, commit `[skip ci]`, push. Update `docs/internal/plans/foundation/question-triage.md`
  and `docs/internal/HANDOFF.md` after each wave, not after each spec.
- Cloud containers may lack podman or docker. Where a brief asks for a real client capture and none
  can run, ground against the published protocol and the client's source instead, and say so in
  the spec.

## Briefs

| Brief | Use for |
|---|---|
| `author-brief.md` | A new format spec. Your format's grounding hints are its line in `formats.tsv`. |
| `foundation-brief.md` | A new shared foundation spec. Its hints are its line in `foundation.tsv`. |
| `fold-brief.md` | Adopting and folding open questions in existing specs. |
| `reconcile-brief.md` | Applying the cross-spec changes queued in `consequences.md`. |
| `recheck-brief.md` | A Fable recheck of one spec carrying `fable_recheck` (Fable back 2026-09-30). |
| `followup-brief.md` | A Fable follow-up on one planned spec: land the items queued against it since its recheck. |

A task prompt is one line: "Read `agents/spec-loop/<brief>` and follow it exactly. HEAD sha: <sha>.
Author `docs/internal/plans/<dir>/<name>.md`; your hints are its line in `<queue>.tsv`."

## Heartbeat (unattended runs)

An hourly in-session cron fires the prompt "spec-loop heartbeat" so the loop survives usage-limit
resets while the owner sleeps (set 2026-10-01; session-only, expires after 7 days or when the
session ends). Each firing:
1. If two loop agents are still running (ListAgents, or their notifications have not arrived), do
   nothing more.
2. Otherwise run `git status --short` in this repository. An uncommitted spec that has today's
   Review Log row and cleared `fable_recheck` is a finished pass that was never committed: check
   it and commit it as usual. An uncommitted spec WITHOUT its new Review Log row is a pass killed
   mid-edit: relaunch the same brief on the same file, telling the agent to continue from the
   partial edits in the tree (never revert them).
3. Fill free slots, two agents at most, with the next items in the resume point below.
4. If the API refuses with a usage limit, stop; the next firing retries.
6. **Deadline (2026-10-08 run): 12:45 CEST.** Past it, do step 2 only (commit what finished; leave
   a killed pass's partial edits as a patch under `agents/spec-loop/wip/`), launch nothing, update
   the resume point and cancel the heartbeat with CronDelete (its id is in the run note above).
5. **Owner, 2026-10-01: stop the loop when Fable is out of usage.** A 5-hour session limit
   ("your session limit resets <time>") is not that: recover after the reset as above. A refusal
   that is not a session reset (a weekly or monthly Fable allowance spent, or Fable unavailable)
   ends the loop: commit what finished, record the resume point here, cancel the heartbeat cron,
   and never fall back to Opus for spec judgment.

## Resume point

**RESUMED 2026-10-08 02:50 CEST for an unattended run that ends at 12:45 CEST** (owner: "the next
10 hours, the same way"). After 12:45 the heartbeat commits finished work, launches nothing new,
records the resume point and cancels itself (heartbeat cron id 3791fe37). The STOPPED note below is history; items 1 and 2 are
under way at the resume.

**STOPPED 2026-10-01: Fable's monthly allowance is spent** (the owner's stop rule, heartbeat item 5).
The heartbeat cron is cancelled. Resume when Fable credit returns, two agents at a time:
1. **hackage.md recheck, interrupted mid-edit.** Its partial edits are saved as
   `agents/spec-loop/wip/hackage-recheck-partial.patch` (the file itself is at HEAD). Apply the
   patch, then relaunch `recheck-brief.md` on hackage.md telling the agent to continue from the
   partial edits (its last note: "Now the virtual section: admission under signing-service was-Q20
   in place of was-Q17, the removed bootstrap clause, was-Q21 on the member input, and the
   `:override` recipe's ordering constraint"). Delete the patch once committed.
2. **Queue signing-service was-Q23's sibling consequences** (its round-4 pass was stopped before it
   reported them): read its Q23 record and queue what artifact-verification (the completion hook
   `internal/verify` declares), data-model (the `pending` reason on the input record) and any
   format need.
3. **Remaining foundation follow-ups** listed under "Remaining foundation follow-ups" in
   consequences.md (management-api round 4: CRAN's tree-qualified claim and conda's attach row;
   data-model round 4: replication's read-only and error reasons; observability; replication and
   proxy-cache wording, proxy-cache's HEAD gap from conda).
4. **Format rechecks still to do**, with `recheck-brief.md`: hackage (item 1), rubygems, conan,
   swift, puppet, vagrant, homebrew, then generic, oci, npm, pypi, ansible-collections, cargo,
   go-modules, helm, pub, nuget, maven, hex, composer, julia, terraform, chef, luarocks, opam,
   openvsx. Done and planned: arch, rpm, alpine, cpan, debian, cran, conda.
5. Gate review of project-charter.

**2026-10-01, foundation done on Fable.** Every foundation spec except the three drafts below is
rechecked and planned, and the follow-up rounds converged (only optional wording remains, listed in
consequences.md). Next, two agents at a time:
1. Gate reviews (`agents/spec.md` review mode, on Fable): conformance-harness (running at 369f502),
   replication, then project-charter.
2. Each format spec gets ONE Fable pass with `recheck-brief.md`, whose step 1 brings the file
   current with every item queued against it, so the separate Opus sweep batches below are
   retired (decided 2026-10-01: a sweep then a recheck pays twice for the same reading). Order:
   the formats Fable's foundation decisions changed most first: arch, rpm, alpine, cpan (signing
   Q20 supersessions), then debian, cran, conda, hackage, rubygems, conan, swift, puppet, vagrant,
   homebrew, then the rest. Formats without `fable_recheck` get the same pass in review mode.

Stopped by the owner at the spend limit, then the two interrupted items were finished the same
day. Nothing is uncommitted. In order:
1. Format closing sweep, batches of four with reconcile-brief.md (prompt shape: own exactly four
   files, apply every open item from the whole of consequences.md, report foundation needs and
   conformance-harness exception rows rather than editing them). Done: puppet, vagrant, swift,
   homebrew; conda, rpm, alpine, arch; hackage, cpan, cran, debian. Remaining: luarocks, chef,
   maven, opam; helm, conan, terraform, hex; pypi, npm, cargo, nuget; composer, openvsx, julia,
   pub; generic, oci, go-modules, ansible-collections. Each batch audits every map, index and
   merged generation for keep-alive by mention (batch 3 item 7).
2. The foundation items those batches, the closing sweeps and rubygems.md queued (management-api
   Puppet rows and RubyGems text, signing-service member-input templates and validators,
   proxy-cache expected-validator, async EnqueueRevalidation, auth client rows).
3. A final check that every target absorbed the whole queue, then the Fable recheck queue
   (question-triage.md round six) once Fable credit returns.

## Queue, split by where it runs

Split by the owner on 2026-09-26: work that needs real package clients in containers runs on the
owner's machine, one agent at a time; everything that only reads specs and published docs runs in
a cloud session. Both push to the same repository, so always `git pull --rebase` before pushing.
Each side appends to `consequences.md`; a conflict there is two lists to concatenate.

### Local: needs podman or docker - DONE 2026-09-28

CORRECTION 2026-09-28: RubyGems was never specced until 2026-09-28. Its first author died in the 2026-09-26 spend-limit crash and the queue was wrongly marked complete meanwhile (`docs/internal/tasks/lessons.md`). It is now authored (`formats/rubygems.md`), so all 33 are done. The catalogue ecosystems are specced, each grounded in captured traffic from real clients run in
containers: generic, oci, npm, pypi, ansible-collections, cargo, go-modules, helm, pub, nuget,
maven, hex, composer, conda, cran, julia, swift, terraform, rpm, debian, alpine, conan, vagrant,
chef, puppet, hackage, luarocks, cpan, opam, homebrew, openvsx, arch, rubygems (plus the catalogue itself).
Nothing local remains unless a gate review asks for a fresh capture.

### Cloud: no containers needed (the owner's cloud credits)

1. ~~**The auth.md "Open items" (1-3) in `consequences.md`**~~ DONE 2026-09-27 (auth Q23,
   `descriptor` object kind). Its follow-ups (items 33-38) join the reconciliation pass, step 3.
2. **Foundation specs**, with `foundation-brief.md`, one at a time, most-cited first:
   ~~management-api~~ (done 2026-09-27, #44), ~~credential-management~~ (done 2026-09-27, #45) (must reach `planned` before OCI Phase 1),
   ~~artifact-verification~~ (done 2026-09-27, #46), ~~signing-service~~ (done 2026-09-27, #47), ~~upstream-adapters~~ (done 2026-09-27, #48), ~~async-operations~~ (done 2026-09-27, #49) (reconcile with the
   `Operation` entity already in `data-model.md`), ~~repository-lifecycle~~ (done 2026-09-27, #50), ~~observability~~ (done 2026-09-27, #51), ~~deployment~~ (done 2026-09-27, #52),
   ~~web-ui~~ (done 2026-09-27, #53). Hints are each spec's line in `foundation.tsv`.
3. **A reconciliation pass** over whatever those specs queue in `consequences.md`. IN PROGRESS: every
   foundation spec is done, and format batches 1-2 are done; batch 3 was interrupted (see the progress log
   in `consequences.md`). Remaining format batches, four files per agent: cargo (redo), debian, rpm;
   conda, conan, arch, alpine; luarocks, chef, terraform, hex; hackage, openvsx, cpan, julia; composer,
   vagrant, opam, homebrew; cran, puppet, swift, pub. Then a last sweep of items raised against files
   already passed, then `HANDOFF.md` and `question-triage.md`.
4. **Gate reviews** (`agents/spec.md`, review mode): `storage-and-gc.md` first (un-planned by the
   Wave 1 reconciliation), then `credential-management.md`, `conformance-harness.md` and
   `generic.md`, which are the build-step 1 and 2 specs.
5. **Bookkeeping** after each finished item: `question-triage.md`, `HANDOFF.md`, and GitHub issues
   if `gh` is authenticated there (otherwise list the issues owed in the commit message).
