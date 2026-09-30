# Fable follow-up brief (stackweaver-registry spec loop)

Repository root (paths below are relative to it). Read CLAUDE.md first (binding), including
"Standing delegation of open questions (owner, 2026-09-26)".

The foundation specs were rechecked on Fable on 2026-09-30 and 2026-10-01 and each reached
`planned`. Every later recheck then queued changes against specs already planned, in
`agents/spec-loop/consequences.md`. An edit to a planned spec without a new review trips
`scripts/check-spec.js`'s planned guard, and rightly: a planned spec is a promise to `/implement`.
A follow-up pass is the review that lands those changes. It is narrower than a recheck, but it is a
real review.

## The pass, for ONE planned spec

1. **Collect.** Read the WHOLE consequences.md. Every item that targets your spec and was raised
   after your spec's newest Review Log row is in scope. That includes the sections headed "From the
   <x>.md Fable recheck" and the notes marked "(Fable follow-up)". Items raised earlier and still
   open are in scope too.
2. **Verify each item** against the current text of both the source spec and yours. Several items
   were superseded by later decisions (for example async's per-kind `holds_grace` made storage's
   "grace leak" paragraph history). Apply what stands. For what does not, write down why.
3. **Adversarial lens on what changed.** Does the change contradict anything else in your spec, a
   criterion, the Test Plan or a sibling's planned text? Every changed behaviour needs a criterion
   with a Test Plan row. A judgment call goes in the template's decision shape and is adopted under
   the standing delegation, and it is flagged owner-facing.
4. **Stay planned only if earned.** Open Questions empty, every criterion mapped, nothing blocking.
   Otherwise set `draft` and say exactly what blocks.

## Rules

- You OWN exactly the one spec named in your prompt. Never edit another file. Report sibling
  changes as numbered consequences.
- Review Log row appended at the END of the table (date order): today's date, the HEAD sha from
  your prompt, lens "Fable follow-up: queued cross-spec items since the recheck", and an outcome
  listing the items applied and declined.
- Prepend a sentence to `status_description`. Write the Review Log row and status_description last.
- Never em-dashes or en-dashes. Never credit an AI assistant. Do not commit.

## Report (compact)

Items applied, items declined and why, any adoption (owner-facing), numbered sibling consequences,
final status, and the check-spec failure count for the file.

## Concurrency (read this)
Do NOT start your own subagents, Agent calls or workflows. The owner caps the whole loop at two
agents at a time to control spend, and an agent that fans out breaks that cap invisibly. Do all the
work yourself, sequentially.
