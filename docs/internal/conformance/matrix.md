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

| Ecosystem | Family | Client | Version | Hosted | Proxied | Virtual | Verification | Cases | Skipped |
|---|---|---|---|---|---|---|---|---|---|
| _none yet_ | | | | | | | | | |

Target is 33 ecosystems across 33 protocol implementations
(`docs/internal/plans/formats/catalogue.md`). **Rows are per ecosystem, never per family**, so the
advertised number can never exceed the tested number - one Maven-layout handler earns a Gradle
entry in the Client column of the Maven row only when a real Gradle client passes against it
(`catalogue.md` AC2 and AC3). Clients never earn rows of their own.

## Reading this table

- **Hosted** and **Proxied** are separate columns because they are separate code paths, and a
  format green in one and blank in the other is half-tested. This project's standing
  duplicated-path trap lives here.
- **Virtual** is generated from the handler's `Capabilities()` declaration and the virtual
  conformance cases, never typed by hand (`docs/internal/plans/formats/catalogue.md` AC7). A
  format that declares `Virtual: unsupported` renders as exempt with its spec cited, never as
  passing (`format-handler-interface.md` AC13, `conformance-harness.md` AC20). Hex is the first
  such format.
- **Verification** renders per `docs/internal/plans/foundation/artifact-verification.md` AC24: a
  format whose spec asked for a verification entry shows a pass only when both a hosted and a
  proxied verification case passed; a format whose spec asked for nothing shows `none` with its
  spec cited. An entry without both cases fails the matrix build rather than rendering blank.
- A format is only "done" when both paths pass across at least two client versions, with no
  unexplained skips. See `docs/internal/plans/foundation/format-handler-interface.md`.
