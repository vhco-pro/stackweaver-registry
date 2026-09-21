---
description: Investigate a case (idea, hunch, suspected bug, ecosystem change) against the live tree and primary sources, then file the tracking issue or plan
model: fable
---

Run the **Investigation Agent**. Read `agents/investigate.md` and follow it exactly.

The point of this run is to turn a hunch into a decision record: measure what the repo
actually does today, verify the external claim against primary sources (never memory),
land on a verdict - **act now** / **track** / **reject** - and record it where it will
survive. Every claim filed must be backed by a `file:line`, a command + output, or a
linked primary source.

**The finding is written under `docs/internal/` and the GitHub issue is a summary that
links to it** - an issue body must never carry the only copy of the reasoning
(`docs/internal/guidelines/documentation/FINDINGS_AND_ISSUES.md`). Investigations and
verdicts land in `docs/internal/analysis/`, phased work in `docs/internal/plans/`. Doc
first, rebuild the index, then file the issue, then backfill the doc's `issue:` field.

Honor the hard rules in the playbook: check for an existing issue or doc before filing,
label from the existing vocabulary, no self-credit anywhere, `[skip ci]` on
`docs/internal/**` commits, and **do not start implementing** - filing the artifact is
where this run ends.

Arguments: $ARGUMENTS - the case to investigate, in the user's words (e.g. "Go 1.27 has
a native uuid package, should we migrate off google/uuid?"). Optionally prefix with
`issue` or `plan` to force the artifact type.
