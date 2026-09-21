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
make docs
```

The pre-commit hook runs this automatically whenever a commit touches `docs/`, and CI fails if
the committed index is stale, so a hand-edited table cannot survive a commit anyway.

README index files still need a `description` of their own - it is what the *parent* directory's
table shows for them.

## Plan files

Plans additionally require `status`, `status_description`, `author` and `goal`. These are
**enforced**: `scripts/build-docs-index.js` fails the build on a plan missing any of them, and
the pre-commit hook and CI both run it.

| Field | Required | Purpose |
|---|---|---|
| `status` | yes | Lifecycle state, from the vocabulary below |
| `status_description` | yes | One line on where the work actually stands |
| `author` | yes | Who owns the document |
| `goal` | yes | One-line objective |
| `priority` | no | `critical`, `high`, `medium`, or `low` |
| `created` / `updated` | no | `YYYY-MM-DD` |
| `issue` | no | The tracking issue number, backfilled after filing |
| `covers` | yes for docs describing code | Code-area globs, never `docs/` paths |

Valid `status` values, and nothing else - the builder rejects anything outside this list:

`draft` (being written or reviewed) · `planned` (review gate passed, not started) ·
`in-progress` · `complete` · `blocked` · `parked`

There is no docs viewer in this repository yet, so none of these fields render anywhere today;
they exist for the tooling and for the reader of the raw file. When a viewer lands, this table
gains a rendering column rather than changing meaning.

## New plans follow the spec template

A new plan is a **spec** - the spec and the plan are one document, per the SDD loop described
in `CLAUDE.md`. Start from
[`plan-template.md`](./plan-template.md): `## Acceptance Criteria` (free-form checkboxes,
each independently testable, stating an observable outcome), a `## Test Plan` row per
criterion, `## Open Questions` for decisions the owner must make, and a `## Review Log`
appended by `/spec review`. New plans start at `status: draft` and flip to `planned` only
when a review clears them; `/implement` hard-gates on all of it. Existing plans are not
retroactively rewritten.

## Keep plans in sync with the code

When a code change lands that a plan tracks, update that plan in the same pass: tick the phase
checkboxes, update the status tables, and revise `status_description`. Do not leave it for
later. A spec whose phase boxes lag the code is worse than no spec: it reads as authoritative
and is not, and the cost of discovering that is a full re-audit.

For this project the sharpest instance is the conformance matrix. It is generated, and CI gates
its staleness, precisely because a hand-maintained support table drifts into claiming coverage
that does not exist.

## Flow diagrams over numbered lists

When documenting a conceptual flow (authentication, a data pipeline, a release chain), prefer a
Mermaid diagram followed by a `<details>` block with
`<summary><strong>Flow Steps (Legend)</strong></summary>` holding the numbered steps. The
diagram carries the shape at a glance and the legend keeps the detail without cluttering the
page. Good candidates here: the blob upload lifecycle, the proxy cache decision path, and the
OCI token auth exchange.

This applies to "how it works" explanations, not to setup instructions where the reader
genuinely follows numbered steps in order.
