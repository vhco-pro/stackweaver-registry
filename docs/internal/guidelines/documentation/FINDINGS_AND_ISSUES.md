---
description: "Where investigation findings live: the internal doc is the source of truth and the GitHub issue is a summary that points at it, never the other way round."
---

# Findings and Issues

## Rule: the doc is the source of truth, the issue points at it

Whenever an investigation produces a substantive finding - a plan, an analysis, a root
cause, an audit result, an adopt-or-not verdict on an ecosystem change - the finding is
written as a document under `docs/internal/`, and the GitHub issue is a **summary that
links to that document**. The issue never carries the only copy of the reasoning.

This holds even when there is no implementation work queued yet. An investigation that
concluded "not now, here is why" is exactly the kind of finding that gets re-litigated in
six months, and the document is what prevents that.

## Why

Issue bodies are the wrong home for durable reasoning. They are not versioned alongside
the code they describe, so they cannot be corrected by a normal commit when the tree moves
underneath them; they are invisible to the docs tooling, so `covers:` frontmatter, the
staleness checker, and the drift audits cannot see them; they cannot be reviewed in a pull
request; and they are unreachable offline or from a checkout. A finding that lives only in
an issue is a finding that silently rots and that nobody rediscovers by reading the repo.

Documents under `docs/internal/` get the opposite treatment. They carry frontmatter that
the audits read, they appear in the auto-generated README indexes, they are diffable, and
`covers:` ties them to the code areas they describe so a later change surfaces them for
review.

## Where each finding goes

| Finding | Home | Issue? |
|---|---|---|
| Phased implementation work | `docs/internal/plans/<category>/` | Yes - one issue per plan |
| Investigation, verdict, or trade-off study | `docs/internal/analysis/` | Yes, when it needs tracking |
| Root cause of a specific defect | `docs/internal/analysis/` (`*-rca.md`) | Yes, if not fixed in the same change |
| Reproducible bug report | `docs/internal/bug-reports/` | Yes |
| Prior-art or ecosystem survey | `docs/internal/research/` | Only if it implies work |

Every one of these needs the standard frontmatter - `status`, `status_description`,
`description`, `author`, and, for plans, `issue`, `priority`, and `created` - plus
`covers:` globs naming the code areas it describes. After adding a document, rebuild the
index rather than hand-editing any README `## Contents` table:

```bash
cd scripts && node build-docs-index.js
```

## What the issue contains

The issue is written for someone deciding whether to pick the work up, not for someone
implementing it. It carries a short summary of the finding, an explicit link to the
document by path, the verdict or phase checklist, and - when the answer is "not yet" - the
concrete prerequisites that would change it. Everything else, particularly the evidence
tables and the file-level citations, belongs in the document.

`docs/internal/plans/foundation/conformance-harness.md` and its issue are the reference pair
for this shape: the issue summarizes what the harness does and why it comes first, and names
the spec as the source of truth. The reasoning - the recording proxy, the normalisation
hazard, the open questions - lives only in the spec.

Once the issue exists, write its URL back into the document's `issue:` frontmatter field so
the link resolves in both directions.

## Sequence

Write the document first, then file the issue, then backfill `issue:`. Filing first tempts
you into putting the reasoning in the issue body, which is the failure this guideline
exists to prevent. Commits that only touch `docs/internal/**` take `[skip ci]`, and no
document, issue, or commit credits an AI assistant.
