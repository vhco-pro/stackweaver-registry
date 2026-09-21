---
status: draft
status_description: "Scheduled first, as the conformance harness's proving ground rather than as a user-facing feature."
description: "Spec for the generic/raw artifact format - the trivial protocol used to prove the harness, CAS, auth and CI wiring end to end."
author: michielvha
goal: "Exercise every shared layer with a protocol simple enough that any failure is unambiguously a harness or infrastructure failure, not a protocol misreading."
priority: "high"
issue: 6
created: 2026-09-21
covers:
  - "internal/format/generic/**"
---

# Plan: Generic artifact format

Upload a file to a path, download it back, list what is there, delete it. Deliberately the most
boring format possible.

## Context

This format exists to be first, not to be wanted. Its purpose is to exercise the conformance
harness, the content-addressable store, authentication and the CI wiring with a protocol so
trivial that any failure is unambiguously infrastructure rather than a protocol misreading.
Debugging a harness and a protocol at the same time is how foundation work stalls.

It is also genuinely useful on its own: "where build outputs and arbitrary binaries live, with
retention policies" is a real need that teams currently solve with an S3 bucket and no access
control.

The client here is `curl`, which means the conformance cases are unusually legible and make good
worked examples for every later format.

## Scope

**In scope:** authenticated PUT to a repository path, GET, HEAD, listing, delete, and retention
policies by age and by count.

**Out of scope:** the proxied path. This is the one format permitted to declare proxy support
`unsupported` (see `format-handler-interface.md`, Q2) - there is no upstream protocol to proxy,
because there is no ecosystem. That exception is named here so the conformance matrix does not
imply a gap that does not exist.

## Acceptance Criteria

- [ ] AC1: An authenticated client can PUT a file and GET back a byte-identical copy.
- [ ] AC2: An unauthenticated PUT is rejected, and an unauthenticated GET to a private
      repository is rejected.
- [ ] AC3: Uploading identical content to two different paths stores one blob (proves CAS
      deduplication through a real request path).
- [ ] AC4: Listing returns uploaded artifacts with size and digest.
- [ ] AC5: A retention policy by age and by count removes exactly the artifacts it should and no
      others.
- [ ] AC6: Conformance cases for all of the above pass with `curl` pinned by image digest.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/generic/hosted_test.go` |
| AC2 | conformance | `conformance/generic/auth_test.go` |
| AC3 | integration | `internal/format/generic/dedup_test.go` |
| AC4 | conformance | `conformance/generic/hosted_test.go` |
| AC5 | integration | `internal/format/generic/retention_test.go` |
| AC6 | ci | conformance job |

## Open Questions

### Q1: Are generic paths namespaced per repository only, or arbitrarily deep?

**Recommendation:** arbitrarily deep. Teams will mirror a directory layout, and forbidding it
just moves the structure into filenames.

**Why this is yours:** deep paths make listing, retention scoping and the future UI meaningfully
more complex, for a convenience only you can weigh.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
