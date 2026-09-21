---
description: "The spec/plan template for the SDD loop: one document that is both the spec and the plan, with acceptance criteria, a test-plan mapping, open questions, and a review log that gates implementation."
covers: []
---

# Plan Template (the spec IS the plan)

This project runs spec-driven development with **one document per feature**: the spec and
the plan are the same file, living in `docs/internal/plans/<category>/`. There is no
parallel spec directory to keep in sync. The `/spec`, `/spec review`, and `/implement`
commands (see `agents/spec.md` and `agents/implement.md`) author, review, and consume this
format, and `/implement` **hard-gates** on it: it refuses to start while `## Open
Questions` has entries, while any acceptance criterion lacks a `## Test Plan` row, or
while the last `## Review Log` entry is stale relative to `main`.

Statuses use the canonical vocabulary (`scripts/docs-audit.js` enforces it): a spec is
`draft` while being written and reviewed, `planned` once the review gate passes,
`in-progress` during implementation, then `complete`. `blocked` and `parked` mean what
they say.

Copy everything below the line into a new file and fill it in. Delete sections that
genuinely do not apply rather than leaving them empty - an empty section reads as
forgotten, a deleted one as decided.

---

```markdown
---
status: draft
status_description: "Spec being written; not yet reviewed."
description: ""
author: ""
goal: ""
priority: ""
issue: ""
created: YYYY-MM-DD
covers: []
---

# Plan: <Title>

<1-2 sentence summary of what this delivers.>

## Context

<Why this work is needed. Link the issue, research docs, or the user feedback that
prompted it. Every factual claim about the current tree must be verified against it,
not remembered - cite file:line or a command + output.>

## Scope

<What is in scope, and explicitly what is out. Out-of-scope items that someone might
reasonably expect belong here by name.>

## Design

<Architecture, data model, API surface, UI behavior - whatever applies. Reference
source files and symbol names, never pasted code or line numbers.>

## Acceptance Criteria

Each criterion is independently testable, states an observable outcome (not an
implementation step), and gets checked off during implementation with evidence.

**State the end state, never a measurement of the problem.** A criterion whose subject is
a report, a count, a percentage or a warning is satisfiable while the problem it describes
remains entirely untouched. "The generator reports documented-vs-registered coverage" was
ticked green with 351 of 465 endpoints still undocumented (#731, PR #752); the criterion
that would have caught it is "every registered endpoint has a description in the generated
reference". If a criterion measures the problem rather than removing it, re-word it.

- [ ] AC1: <specific, measurable condition>
- [ ] AC2: ...

## Test Plan

Every acceptance criterion maps to at least one test. "Manual" is allowed only with a
written procedure; UX-affecting criteria include a Playwright/E2E row.

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | unit / integration / e2e / manual | `path/to/test` |

## Implementation Phases

### Phase 1: <Name>
- Task

## Open Questions

<Unresolved decisions the OWNER must answer. Implementation cannot start while this
section has entries. Reviews add questions here rather than silently deciding; answers
get folded into Design/Scope and the question removed.

Write each one so a human can decide in under a minute, using the shape below. A prose
paragraph is not acceptable here - the reader is deciding, not studying. One question
per heading, a recommendation with its reason, and the trade-off as a table.>

### Q1: <the question, as one plain sentence>

**Recommendation:** <option> - <one line on why>

| Option | You get | It costs |
|---|---|---|
| **A. <name>** | <benefit> | <cost> |
| **B. <name>** | <benefit> | <cost> |

**Why this is yours:** <what makes it a judgment call, rather than something the agent
could have measured its way to>

## Review Log

<Appended by /spec review, newest last. Implementation requires the latest entry to be
verified at (or near) current main.>

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
```
