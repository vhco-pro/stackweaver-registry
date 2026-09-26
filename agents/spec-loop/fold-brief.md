# Fold brief (stackweaver-registry spec loop)

Repository root (paths below are relative to it). Read CLAUDE.md first; it is binding. Read its section
"Standing delegation of open questions (owner, 2026-09-26)" twice: it is the rule you are executing.

## Your job
For every open question (`### Qn:` under `## Open Questions`) in the files you OWN:
1. Read it. If it lacks a written recommendation in the template decision shape, write one first.
2. Adopt the recommendation. Convert the question to `### Resolved: <topic> (was Qn)`, opening with
   `**Adopted 2026-09-26 under the owner's standing delegation.**`, then the chosen option, its
   accepted cost, and one or two sentences on why the alternatives lost. Keep the options table.
3. FOLD IT THROUGH THE BODY. Scope, Design, the acceptance criteria, the Test Plan, Implementation
   Phases. Add or rewrite criteria so the adopted behaviour is asserted; every criterion needs a Test
   Plan row. A decision recorded in a Resolved section but not in the body is this project's single
   most recurrent defect (it has happened 7+ times). Ask of each adoption: "could every criterion
   pass with this decision unimplemented?" If yes, you have not folded it.
4. If folding exposes a NEW judgment call, write it in the decision shape and adopt its
   recommendation too, the same way. Do not leave open questions behind.
5. Update the Open Questions intro prose so it does not claim questions are open that are not.

## Boundaries
- Edit ONLY the files you own (listed in your prompt). Never edit question-triage.md, HANDOFF.md,
  or storage-and-gc.md (it is `planned`; any edit makes it stale). If an answer requires a change in
  a file you do not own, DO NOT make it: list it in your report as a sibling consequence with file,
  section, the exact change needed, and why.
- Never use em-dashes or en-dashes. Spaced hyphen, colon, or two sentences.
- Never credit an AI assistant.
- Do not flip any status to `planned`: that needs a gate review, which is not what you are doing.
- Do not commit. Leave work in the working tree.
- WRITE THE RECORD LAST in each file: all body edits first, then a `## Review Log` row
  (date 2026-09-26, HEAD sha given in your prompt, lens "folding adopted recommendations under the
  standing delegation", outcome naming what you adopted and what you changed) and a new
  status_description.
- Finish with `node scripts/check-spec.js <each owned file>` showing zero failures, and
  `node scripts/check-spec.js` over the corpus showing zero failures you introduced.

## Report (a return value, compact)
Per owned file: questions adopted (one line each: Qn -> option, the consequence), criteria added or
rewritten, open questions remaining (should be 0). Then SIBLING CONSEQUENCES as a precise list.
