# Fable recheck brief (stackweaver-registry spec loop)

Repository root (paths below are relative to it). Read CLAUDE.md first (binding), including
"Standing delegation of open questions (owner, 2026-09-26)" and the model-tier paragraph on
`fable_recheck`.

From 2026-09-27 to 2026-09-28 Fable was out of credit and the loop ran on Opus (and a cloud session
whose model was not recorded). Every spec authored or reviewed then, or where such a pass adopted a
question, carries `fable_recheck` frontmatter. `node scripts/check-spec.js` lists them, and none can
reach `planned` while the field is set. You are the judgment tier that clears it, for ONE spec.

## What the pass is

A full review pass as `agents/spec.md` "Mode: review" defines it (claim verification at HEAD, the
adversarial lens, constitution compliance, routing findings, the Review Log row, and the status flip
only when earned), plus three things specific to a recheck:

1. **Bring the file current first.** Read the WHOLE `agents/spec-loop/consequences.md` and apply
   every still-open item that targets your file, verified against the current text of both the
   source spec and yours (the reports were written against a moving tree). A recheck of a stale
   file is wasted.
2. **Re-examine every question adopted without you.** Round six of
   `docs/internal/plans/foundation/question-triage.md` lists them per spec, and the
   `fable_recheck` value says what else was done on another tier (authoring whole, a data-loss
   fix, a sweep). For each adopted question, judge it as if deciding it fresh: were the options
   framed fairly, is the recommendation right, is its accepted cost stated honestly, and was it
   folded through Scope, Design, the criteria, the Test Plan and the siblings it touches? Record
   one of:
   - **Confirmed**: add a sentence to its resolved record, "Rechecked on Fable <date>: confirmed."
     plus anything the record under-stated.
   - **Amended**: the adoption stands but its fold or stated cost was wrong; fix the body and say
     what changed in the record.
   - **Superseded**: the adoption was wrong. Write the better answer in the template's decision
     shape and adopt it under the standing delegation as a new resolved record that names the Opus
     adoption it supersedes. This is allowed because an Opus adoption is not an owner decision.
     It is never allowed for anything the owner actually decided, and never weakens auth AC10.
     Flag every supersession in your report as owner-facing.
3. **Everything else a non-Fable pass did** (whole authoring, data-loss fixes, sweeps) gets the
   adversarial lens at full strength, with the design judgment treated as unreviewed.

## Clearing the marker

Remove `fable_recheck` only when the pass is complete: every adopted question has a verdict, every
check-spec failure in the file is fixed, and nothing you found is left unrouted. If the pass cannot
finish, leave the marker and replace its text with exactly what remains. Then decide the status as
review mode says: `planned` only if Open Questions is empty, every criterion is testable and
mapped, and nothing blocking remains.

## Rules

- You OWN exactly the one spec named in your prompt. Never edit another file. Any change a sibling
  needs is reported as a numbered consequence; the orchestrator queues it. (This narrows review
  mode's "fold through every affected sibling": two agents run at once, and a sibling edit would
  race.)
- Review Log row: today's date, the HEAD sha from your prompt, a lens naming Fable, for example
  "Fable recheck: full review + re-examination of the Opus adoptions", and an outcome naming each
  verdict.
- Write the Review Log row and status_description last, so an interrupted pass leaves no record of
  unfinished work.
- Never em-dashes or en-dashes. Never credit an AI assistant. Do not commit.

## Report (compact)

The verdict per adopted question (confirmed, amended, superseded, one line each), the other
findings and what you did about each, the numbered sibling consequences, whether `fable_recheck`
was cleared, the final status, the check-spec failure count for the file, and every owner-facing
item.

## Concurrency (read this)
Do NOT start your own subagents, Agent calls or workflows. The owner caps the whole loop at two
agents at a time to control spend, and an agent that fans out breaks that cap invisibly. Do all the
work yourself, sequentially.
