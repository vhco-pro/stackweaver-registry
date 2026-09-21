---
description: "The per-format, per-client conformance support matrix. Generated from conformance run results - do not hand-edit."
covers:
  - "conformance/**"
---

# Conformance matrix

**Generated from conformance run results. Do not hand-edit.** CI fails if the committed copy is
stale (`conformance-harness.md`, AC10).

This is the honest picture of what actually works. A format appears here only with real run
results behind it, and a skipped case shows as a skip with its issue number, never as a pass.

## Status

No formats implemented yet. The harness is specced
(`docs/internal/plans/foundation/conformance-harness.md`) and not built.

| Ecosystem | Family | Client | Version | Hosted | Proxied | Cases | Skipped |
|---|---|---|---|---|---|---|---|
| _none yet_ | | | | | | | |

Target is 33 ecosystems across ~31 protocol implementations
(`docs/internal/plans/formats/catalogue.md`). **Rows are per ecosystem, never per family**, so the
advertised number can never exceed the tested number - one Maven-layout handler earns its Gradle
row only when a real Gradle client passes against it.

## Reading this table

- **Hosted** and **Proxied** are separate columns because they are separate code paths, and a
  format green in one and blank in the other is half-tested. This project's standing
  duplicated-path trap lives here.
- A format is only "done" when both paths pass across at least two client versions, with no
  unexplained skips. See `docs/internal/plans/foundation/format-handler-interface.md`.
