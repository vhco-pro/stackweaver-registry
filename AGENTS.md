# AGENTS.md

Entry point for any AI coding agent working in this repository, whatever harness it runs in.

**The constitution is [`CLAUDE.md`](./CLAUDE.md). Read it first and follow it exactly.** It is
named for the harness it was written in, but nothing in it is harness-specific: it holds the
project's binding rules on conformance, CI economy, the shared data model, documentation, Go
style and commit hygiene. Every spec is reviewed against it.

If your harness reads a different file by convention, read `CLAUDE.md` anyway. There is
deliberately one constitution rather than a copy per tool, because two copies drift.

## Orientation, in order

1. **[`CLAUDE.md`](./CLAUDE.md)** - the binding rules.
2. **[`docs/internal/HANDOFF.md`](./docs/internal/HANDOFF.md)** - current state, what is done, what
   is next, and what to do if you are not Claude Code.
3. **[`docs/internal/plans/foundation/question-triage.md`](./docs/internal/plans/foundation/question-triage.md)** -
   the live decision backlog, ordered by what it blocks.
4. **[`docs/internal/plans/foundation/project-charter.md`](./docs/internal/plans/foundation/project-charter.md)** -
   what this project is and the order it gets built in.

## The loop

`/spec` -> `/spec review` -> `/tasks` -> `/implement` -> `/ship`.

Those are Claude Code slash commands backed by `agents/*.md`. **The agent files are plain
markdown and are the real content**; if your harness has no slash commands, read the matching
file in `agents/` and follow it as instructions. Nothing is lost.

| Step | Instructions | What it does |
|---|---|---|
| spec | `agents/spec.md` | Author or adversarially review one spec |
| tasks | `agents/tasks.md` | Decompose a `planned` spec into resumable, one-commit tasks |
| implement | `agents/implement.md` | Build from a spec, hard-gated |
| ship | `agents/ship.md` | Doc-impact check, verify, commit, PR |
| review | `agents/reviewer.md` | Verify a plan against the tree |
| triage | `agents/issue-triage.md` | Triage the issue backlog |

## Before you spend a model on a spec

Run the mechanical checks first. They are free and they cover a large share of what a review
used to do by hand:

```bash
make check-spec                                    # all specs
make gate SPEC=docs/internal/plans/foundation/auth.md   # is one ready for `planned`?
```

This catches unmapped acceptance criteria, missing template sections, em-dashes, review
staleness, and the half-applied-decision defect (prose still pointing at a question the same
file records as resolved). **A model should only be spent on what is left after this passes:**
is the design right, does it contradict a sibling spec, what did it miss.

## Two rules that matter more than the rest

- **Never answer an open question on the owner's behalf.** `## Open Questions` sections belong
  to the repository owner. An agent that answers its own question has converted a gate into a
  rubber stamp. Raise new ones in the template's decision shape and stop.
- **Folding an answer means editing the spec body.** Recording a decision in a `Resolved:`
  section is the record of *why*, not its application. Scope, Design, the acceptance criteria and
  the Test Plan all have to change. This defect has occurred twice here and is the single most
  likely thing to go wrong; `make check-spec` now catches its most common form.

## Verification

```bash
make verify        # the CI suite locally, read-only: lint, build, test, docs, spec checks
make conformance   # real package clients against a real server (minutes, containers)
```

`make verify` does not run conformance, and neither does CI on a pull request. See the
conformance section of `CLAUDE.md`: you are the gate before merge.
