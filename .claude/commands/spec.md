---
description: Author or review a spec (the single spec-is-the-plan document) - grounded authoring, repeatable gated reviews, owner-answered open questions
model: fable
---

Run the **Spec Agent**. Read `agents/spec.md` and follow it exactly.

One document per feature, in `docs/internal/plans/<category>/`, from
`docs/internal/guidelines/documentation/plan-template.md` - the spec IS the plan, there
is no second document. Two modes by argument:

- `<topic|issue#>` - **author**: check for prior art, ground every claim against the
  live tree (file:line or command + output, never memory), write all template sections
  with testable acceptance criteria and a Test Plan row per criterion, park judgment
  calls in `## Open Questions` for the owner, start at `status: draft`, link the issue,
  rebuild the docs index, commit `[skip ci]`.
- `review <path>` - **review**: verify every claim at current HEAD, then an adversarial
  design pass; apply factual corrections directly, convert judgment calls into Open
  Questions (never answer them yourself - prefer AskUserQuestion so the owner can answer
  in-pass), append a dated sha'd row to `## Review Log`, and flip `draft → planned` only
  when Open Questions is empty and every criterion is testable and mapped. Repeatable;
  several passes are normal.

Statuses stay in the canonical vocabulary. Do not implement anything - a `planned` spec
is this command's finish line; `/implement` takes it from there.

Arguments: $ARGUMENTS
