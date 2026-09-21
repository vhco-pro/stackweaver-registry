---
description: Ship a finished change end-to-end - doc-impact check, verify, branch, clean commits, PR, issue tracking; never invents scope
model: opus
---

Run the **Ship Agent**. Read `agents/ship.md` and follow it exactly.

Ship what is already implemented in the working tree (or what the argument points at) -
never invent or extend scope, and if the change is incomplete or unverified, say so and
stop. The phases, in order: doc-impact check first (`git diff --name-only HEAD | node
scripts/check-doc-coverage.js`, plus grepping docs for changed symbols), then verify at
the appropriate level, then branch → clean conventional commits → PR → issue linkage.

Honor the hard rules in the playbook: no self-credit anywhere (a commit-msg hook enforces
it), never commit feature work to the default branch, `[skip ci]` only for changes with
no built artifact or published surface and never on mixed commits, distribution repos are
sync targets (fix the monorepo source instead), and the chart version belongs to
GitVersion. Remember the house conventions around it: the owner never manages git
themselves, one PR per feature, `Closes #N` only when the issue is fully resolved, and
`make test-integration` before merging anything under `backend/` or `core/` - that job is
main-gated and will not save you on the PR.

Arguments: $ARGUMENTS - optionally, what to ship (a branch, a described change, or an
issue number); with no argument, ship the working tree's current change.
