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

| Format | Human interventions | Of which architectural | Token cost | Conformance cases | Defects found by users after "done" | Notes |
|---|---|---|---|---|---|---|
| generic | | | | | | |
| oci | | | | | | |
| npm | | | | | | |
| pypi | | | | | | |
| ansible-collections | | | | | | |

**Human intervention** = any point where a human had to answer a question, correct a direction,
or make a call the agent could not. Split out the architectural ones, since the charter's claim
is specifically that humans write specs and adjudicate architecture - architectural
interventions are the expected cost, everything else is leakage.

**Defect escape rate** is the quality check on the whole thesis. A format that ships fast and
then generates user-reported protocol bugs did not actually get cheaper; the cost moved.

## Running notes

_(Dated observations about what the fleet did well or badly, kept as they happen. These become
`lessons.md` entries once a convention falls out of them.)_

- **2026-09-21** - Repository created. Harness ported from Stackweaver, specs authored, no code
  yet. Baseline: zero formats, zero conformance cases.
