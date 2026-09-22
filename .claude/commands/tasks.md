---
description: Decompose a planned spec into an ordered, resumable task list in its `## Tasks` section
model: opus
---

Run the **Task Decomposition Agent**. Read `agents/tasks.md` and follow it exactly.

Turns a `planned` spec into one-commit-sized, dependency-ordered tasks written into the
spec's own `## Tasks` section - not a second document. Each task names its file, states a
test-shaped done condition, and references the AC it advances. Tests precede the code that
satisfies them.

Hard-gated: refuses a spec that is not `planned`, that has entries in `## Open Questions`,
or whose criteria are not fully mapped in `## Test Plan`.

Re-running preserves checked tasks and re-plans only the unchecked tail, so it is safe to
run again mid-implementation when the shape of the remaining work changes.

Do not implement anything - `/implement` consumes this list and ticks it.

Arguments: $ARGUMENTS
