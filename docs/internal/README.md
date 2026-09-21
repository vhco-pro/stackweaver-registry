---
description: "Internal engineering documentation: specs, research, analysis, bug reports and the project's accumulated lessons."
---

# Internal Documentation

Engineering documentation that is not part of the published user-facing docs. Every substantive
finding lives here first; a GitHub issue is a summary that links to the document, never the only
copy of the reasoning.

## Homes

| Kind of finding | Goes in |
|---|---|
| A spec (which is also the plan) | `plans/<category>/` |
| An investigation or root cause | `analysis/` |
| A bug report | `bug-reports/` |
| A prior-art or ecosystem survey | `research/` |
| A hard-won lesson | `tasks/lessons.md` |

## Contents

| Name | Description |
|------|-------------|
| [analysis/](./analysis/) | Investigations and root-cause analyses of specific problems. |
| [bug-reports/](./bug-reports/) | Reproducible bug reports with evidence, filed before the fix. |
| [conformance/](./conformance/) | Generated conformance results and the per-format support matrix. |
| [guidelines/](./guidelines/) |  |
| [plans/](./plans/) | Specs, one per feature. The spec IS the plan: acceptance criteria, test plan, open questions and a review log that gates implementation. |
| [research/](./research/) | Prior-art surveys, ecosystem comparisons and protocol research that inform the specs. |
| [tasks/](./tasks/) | Working notes that persist across sessions: the lessons ledger and the autonomy experiment log. |
