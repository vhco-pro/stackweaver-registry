---
description: "Required frontmatter for internal docs and plans, the valid status values and how each renders, why README Contents tables must never be hand-edited, and the flow-diagram preference."
covers:
  - "scripts/build-docs-index.js"
  - "scripts/**"
---

# Plan and Doc Frontmatter

## Every internal doc needs frontmatter

Every `.md` file under `docs/internal/` must open with a YAML frontmatter block containing at
least a `description`. The build script (`scripts/build-docs-index.js`) reads it to generate
the parent README's Contents table, and **a file without a `description` is silently omitted
from the index**. Frontmatter must be the very first thing in the file, with no copyright
comment or blank line above it.

## Never hand-edit a README Contents table

The `## Contents` table in every `docs/internal/**/README.md` is generated. Manual edits are
overwritten on the next build. To change what a table says, change the source file's
frontmatter and regenerate:

```bash
cd scripts && node build-docs-index.js
```

README index files in plan directories do not themselves need frontmatter.

## Plan files

Plans additionally require `status`, `status_description`, and `author`, which render as a
colored badge, the text beside it, and the credit line at the foot of the page. Always include
`goal` as well: it is the one-line summary shown in the metadata table.

| Field | Purpose |
|---|---|
| `status` | Colored status badge |
| `status_description` | Short summary shown beside the badge |
| `author` | Credit line at the bottom of the page |
| `goal` | One-line objective, shown in the metadata table |
| `priority` | `high`, `medium`, or `low`, rendered red/amber/blue |
| `created` / `updated` | `YYYY-MM-DD`, shown in the metadata table |
| `issue` | Full GitHub issue URL, auto-formatted as `org/repo#NNN` |
| `title` / `description` | Sidebar label and hover tooltip |

Valid `status` values are `planned` (blue, defined but not started), `in-progress` (amber,
partially implemented), `complete` (green), `archived` (slate, superseded or abandoned), and
`draft` (purple, speculative with no implementation).

## New plans follow the spec template

A new plan is a **spec** - the spec and the plan are one document, per the SDD loop
(`docs/internal/plans/spec-driven-development-plan.md`). Start from
[`plan-template.md`](./plan-template.md): `## Acceptance Criteria` (free-form checkboxes,
each independently testable, stating an observable outcome), a `## Test Plan` row per
criterion, `## Open Questions` for decisions the owner must make, and a `## Review Log`
appended by `/spec review`. New plans start at `status: draft` and flip to `planned` only
when a review clears them; `/implement` hard-gates on all of it. Existing plans are not
retroactively rewritten.

## Keep plans in sync with the code

When a code change lands that a plan tracks, update that plan in the same pass: tick the phase
checkboxes, update the status tables, and revise `status_description`. Do not leave it for
later. An RBAC docs audit found six files carrying inaccurate information purely because the
code moved and the plans did not, which cost a full re-audit to discover.

## Flow diagrams over numbered lists

When documenting a conceptual flow (authentication, a data pipeline, a release chain), prefer a
Mermaid diagram followed by a `<details>` block with
`<summary><strong>Flow Steps (Legend)</strong></summary>` holding the numbered steps. The
diagram carries the shape at a glance and the legend keeps the detail without cluttering the
page. `docs/architecture/README.md` and `docs/user-guides/sso/README.md` are the established
examples.

This applies to "how it works" explanations, not to setup instructions where the reader
genuinely follows numbered steps in order.
