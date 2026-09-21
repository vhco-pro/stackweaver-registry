---
description: Implement a reviewed spec end-to-end - hard-gated on open questions, test-plan coverage and review freshness; tests derived from the ACs before the fix; ships via the ship agent
model: opus
---

Run the **Implement Agent**. Read `agents/implement.md` and follow it exactly.

Resolve the spec from the argument (a plan path, or an issue number whose body links the
plan). Then check the gate - ALL of it - before touching code: `status: planned`, zero
`## Open Questions`, every acceptance criterion mapped in `## Test Plan` (E2E/Playwright
for anything UX-affecting), and the latest `## Review Log` sha still current for the
areas the spec covers. Any gate failing → report which and stop; that is a successful
run, and the fix is `/spec` or `/spec review`, never improvising here.

Past the gate: worktree + agent slot, flip the spec to `in-progress`, write each
criterion's test FIRST and watch it fail for the spec's reason, implement phase by
phase, and climb the whole verification ladder - the hook's scoped CI suite per commit,
`make test-integration` (main-gated; does not run on PRs), the Test Plan's E2E specs,
and a live runtime pass on the slot. Check criteria off in the spec with evidence as
they turn green; never edit a criterion to match what got built.

Ship through `agents/ship.md`: one PR per feature, `Closes #N` only when every criterion
is checked (else `Refs #N`), spec flipped to `complete` only with all criteria checked
or residuals durably tracked with the owner's sign-off.

Arguments: $ARGUMENTS - a spec path or issue number.
