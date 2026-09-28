---
description: "The autonomy experiment's measurement ledger: per-format intervention counts, token cost, and defect escape rate, kept to answer whether format N+1 costs less than format N."
covers: []
---

# Experiment log

This repository doubles as a test of autonomous, spec-driven agent development. The research
question, from `docs/internal/plans/foundation/project-charter.md`:

> Can an agent fleet drive a protocol-conformance project to production quality, with the human
> writing only specs and adjudicating architecture?

The headline measurement is **whether format N+1 costs less than format N**. If the harness and
the format interface generalise, cost falls per format and the project's central claim holds. If
every format costs the same, that is the most important finding available here, and it is worth
knowing early rather than after a year of breadth.

## How to record

One row per format, filled in when the format reaches its definition of done
(`format-handler-interface.md`). Record honestly: a format passing 40 of 60 conformance cases is
at 40, not "basically done". Inflated progress corrupts the only data this experiment produces.

The cost columns follow the procedure in `project-charter.md`, "Measuring per-format cost",
which is in force from npm's first commit. From npm onward every row's cost figures are
**computed from the ledger, never typed by hand**: `scripts/cost-report.js --check` recomputes
this table and fails `make verify` when the committed copy differs (charter AC8).

| Format | Direct build cost | Loaded build cost (headline) | Spec cost | Cost per conformance case | Triggered shared work | Human interventions | Of which architectural | Conformance cases | Defects found by users after "done" | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| generic | | | | | | | | | | Excluded from the breadth-gate series |
| oci | | | | | | | | | | Excluded from the breadth-gate series |
| npm | | | | | | | | | | The measurement baseline |
| pypi | | | | | | | | | | |
| ansible-collections | | | | | | | | | | |
| maven | | | | | | | | | | |
| go-modules | | | | | | | | | | |
| nuget | | | | | | | | | | |
| helm | | | | | | | | | | |
| debian | | | | | | | | | | |
| rpm | | | | | | | | | | |

The nine Tier 1 rows, npm through RPM in build order, are the series the breadth gate reads
(`project-charter.md`, "The breadth gate's definition"). Generic and OCI keep rows for
completeness and are excluded from it, because they carried the harness and the proxy layer's
first construction.

**The four cost figures**, as the charter defines them. *Direct build cost* is the sessions
charged to `format:<name>` from its `/tasks` run to its definition of done. *Loaded build cost*,
the headline and the only figure the gate compares, is the direct build cost plus every
shared-line session recording `triggered-by: format:<name>`. *Spec cost* is the sessions that
authored and reviewed the format's spec before its `/tasks` run, reported and never compared,
because every spec was written in one batch loop. *Cost per conformance case* is the loaded
build cost divided by the format's case count, reported as a difficulty-adjusted view and never
used by the gate. *Triggered shared work* lists the shared lines those `triggered-by` sessions
were charged to, so a shared layer that failed to generalise is visible against the format that
exposed it.

**Human intervention** = any point where a human had to answer a question, correct a direction,
or make a call the agent could not. Split out the architectural ones, since the charter's claim
is specifically that humans write specs and adjudicate architecture - architectural
interventions are the expected cost, everything else is leakage. An intervention on a
shared-line session counts against the triggering format when there is one.

**Defect escape rate** is the quality check on the whole thesis. A format that ships fast and
then generates user-reported protocol bugs did not actually get cheaper; the cost moved.

## Cost lines

The closed list every commit's `Cost-Line:` trailer and every session's ledger record must name
(charter AC10). It grows only by a dated entry here.

- **Format lines**: `format:<name>`, one per ecosystem in `docs/internal/plans/formats/catalogue.md`.
- **Shared lines**: `shared:harness`, `shared:data-model`, `shared:storage`, `shared:proxy`,
  `shared:upstream`, `shared:auth`, `shared:interface`, `shared:verification`,
  `shared:policy`, `shared:async`, `shared:signing`, `shared:management`,
  `shared:observability`, `shared:deploy`, `shared:ui`, `shared:replication`.

The path rule decides the line, not the author: work under `internal/format/<name>/`,
`conformance/<name>/` or the format's own spec is `format:<name>`, and everything else is
shared. A commit touching both kinds of path is refused.

A spec that is one half of a listed subsystem shares its line rather than adding one (charter,
"Measuring per-format cost"): `credential-management.md` and `repository-lifecycle.md` are the
token and repository halves of the management surface core, so their work under
`internal/credential/` and `internal/repository/` is charged to `shared:management`, never to a
line of their own.

## The ledger

One record per agent session, written at the session's end: the cost line, `triggered-by:
format:<name>` on any unscheduled shared-line session, the model tier, and the harness's own
usage figures (input, output, cache-write and cache-read tokens). Tokens are recorded raw per
model tier and priced only when the table is computed.

**Location: to be fixed before npm's first commit.** The charter requires the ledger to be
committed data the table can be recomputed from, and names `scripts/cost-report.js` as the
reader, but no document yet names the file. Whoever builds that script fixes the location here,
in a dated entry, before npm starts; until then no row from npm onward can be recorded.

## Frozen price table

Entered once, **on the day npm starts**, and never edited afterwards, so a provider's price
change never shows up as a change in format cost. Every cost figure from npm onward is priced
from this table.

_Not yet frozen: npm has not started._

| Model tier | Input | Output | Cache write | Cache read |
|---|---|---|---|---|
| | | | | |

## Breadth-gate verdict

Recorded by the owner at charter step 8, against the pre-committed definition in
`project-charter.md` ("The breadth gate's definition"): the computed Tier 1 rows, the
definition's outcome (`continue` or `shrink`), the verdict, and, where the verdict departs from
the outcome, the departure and its reason (charter AC9).

_Not yet recorded._

## Running notes

_(Dated observations about what the fleet did well or badly, kept as they happen. These become
`lessons.md` entries once a convention falls out of them.)_

- **2026-09-21** - Repository created. Harness ported from Stackweaver, specs authored, no code
  yet. Baseline: zero formats, zero conformance cases.
- **2026-09-26** - The charter's cost procedure and breadth-gate definition adopted
  (`project-charter.md`, its resolved cost-measurement and gate-threshold decisions). This log
  gained the cost columns, the nine Tier 1 rows, the cost-line list, the ledger and price-table
  sections and the verdict section to match. No format has started, so every row is empty.
