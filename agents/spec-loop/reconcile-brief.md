# Reconciliation brief (stackweaver-registry spec loop)

Repository root (paths below are relative to it). Read CLAUDE.md first (binding), including "Standing
delegation of open questions (owner, 2026-09-26)".

Wave 1 folded every open question in parallel, with each agent forbidden to edit files it did not
own. Each reported the changes needed in OTHER files. Those reports are queued in
agents/spec-loop/consequences.md.
Your job is to apply every queued item that targets a file you OWN, precisely, then make
`node scripts/check-spec.js` report zero failures in your owned files.

## Rules
- Read the WHOLE consequences.md: items are grouped by the fold that raised them, not by target
  file, and several items target the same file from different folds. Later folds sometimes
  supersede earlier items (for example the auth-versus-OCI credential contradiction is marked
  RESOLVED by auth Q22). Verify every item against the current text of BOTH the source spec and
  the target before applying it: the reports were written against a moving tree.
- Items that ask for a NEW spec (management-api, artifact-verification, credential-management,
  async-operations, signing-service) are not yours: skip them, they are authored next.
- Fix every stale citation check-spec reports in your files: a citation of a sibling question that
  is now resolved gets a historical qualifier ("the resolved ... decision (was Qn)"), AND any
  surrounding prose that treats it as pending is rewritten to reflect what was adopted. A qualifier
  bolted onto a sentence that still describes the question as open is the half-applied defect.
- If an item needs a judgment call, write it in the template decision shape and adopt its
  recommendation under the standing delegation, as `### Resolved: ... (was Qn)` opening
  "**Adopted 2026-09-26 under the owner's standing delegation.**", folded through the body.
- Every changed behaviour must be asserted by a criterion with a Test Plan row.
- Never em-dashes or en-dashes. Never credit an AI assistant. Do not commit.
- Record last, per file: a Review Log row (date 2026-09-26, HEAD sha from your prompt, lens
  "cross-spec reconciliation of the Wave 1 folds. Not a review", outcome naming what changed) and
  an updated status_description. Do not flip any status to `planned`.
- Other agents are concurrently CREATING new format spec files (maven, nuget, hex, composer,
  conda, swift and more). Never edit a file you do not own.

## Report (compact)
Per file: items applied, items found already done, items skipped and why. Any new question
adopted. Final check-spec failure count for your files. Anything that still needs a new spec.

## Model tier (read this)
Record the model you ran on in your Review Log lens, for example "authoring pass on Opus: ...".
If you are not Fable, add `fable_recheck: "<what you did> on <model>, <date>"` to the spec's
frontmatter (reconciliation and folding need it only when you adopted a new question). Never remove
an existing `fable_recheck` unless you are Fable performing that recheck. Never set `planned` on a
spec that carries one.

## Concurrency (read this)
Do NOT start your own subagents, Agent calls or workflows. The owner caps the whole loop at two agents at a time to control spend, and an agent that fans out breaks that cap invisibly. Do all the work yourself, sequentially.
