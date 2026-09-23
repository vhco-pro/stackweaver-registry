---
status: draft
status_description: "All open questions answered by the owner and folded in; awaiting a /spec review pass to earn planned."
description: "Spec for the PyPI format, scheduled as the experiment's generalisation test - does format N+1 cost less than format N?"
author: michielvha
goal: "Measure whether the harness and the format interface generalise, by building PyPI immediately after npm and comparing the cost."
priority: "medium"
issue: 9
created: 2026-09-21
covers:
  - "internal/format/pypi/**"
---

# Plan: PyPI format

## Context

PyPI is scheduled here for a reason beyond its own usefulness: **it is the experiment's
generalisation test**.

By the time it starts, the harness exists, the CAS exists, the proxy layer exists, and npm has
shown what a mutable-metadata format costs. If PyPI costs materially less than npm did, the
harness generalises and the project's central claim holds. If it costs the same, every format is
a fresh grind and that is the most important finding the experiment can produce - worth knowing
before betting a year on breadth.

Record the comparison in `docs/internal/tasks/experiment-log.md` deliberately, with intervention
counts and token cost, rather than reconstructing it afterwards from impressions.

## Scope

**In scope:** the PEP 503 simple index, PEP 691 JSON index, wheel and sdist serving, upload, and
the proxied path against the public index.

**Out of scope for v1:** PEP 658 metadata files and attestation verification. Yank handling is
limited to the proxy contract: preserve cached files for existing pins, exclude the release from
new resolution as the upstream index requires, and record an operator-visible divergence.

## Acceptance Criteria

- [ ] AC1: `pip install` resolves and installs a wheel from a hosted repository, for at least two
      pinned pip versions.
- [ ] AC2: Uploading a wheel and an sdist makes both installable, with correct wheel-tag
      selection per platform.
- [ ] AC3: The PEP 503 simple index and the PEP 691 JSON index both serve and agree.
- [ ] AC4: The proxied path installs from the public index and serves from cache on a second
      install without contacting the upstream.
- [ ] AC5: Replay-match passes against a recorded corpus.
- [ ] AC6: The experiment log records intervention count and token cost for this format
      alongside npm's, in comparable units.
- [ ] AC7: When the upstream index marks a release yanked, new resolution excludes it while an
      existing pinned artifact remains available from cache, and the repository records an
      operator-visible divergence as required by `proxy-cache.md` AC13.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/pypi/hosted_test.go` |
| AC2 | conformance | `conformance/pypi/wheel_test.go` |
| AC3 | conformance | `conformance/pypi/index_test.go` |
| AC4 | conformance | `conformance/pypi/proxied_test.go` |
| AC5 | conformance | `conformance/pypi/replay_test.go` |
| AC6 | manual | `docs/internal/tasks/experiment-log.md` |
| AC7 | integration | `internal/proxy/upstream_removal_test.go` plus `conformance/pypi/proxied_test.go` |

## Open Questions

None. This spec is an early draft for a format scheduled after the
harness exists, and its design will be revisited before implementation - so an empty
section here means "not yet interrogated", not "fully settled".

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-23 | 9c971d4 | cross-spec consistency (proxy removal policy) | Folded the shared PyPI yank decision into Scope and added AC7 with integration and proxied conformance coverage; status remains draft pending a full gate review. |
