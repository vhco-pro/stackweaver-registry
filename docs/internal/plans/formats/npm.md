---
status: draft
status_description: "Scheduled with the proxy layer; the proxied path matters more here than the hosted path."
description: "Spec for the npm registry format, where the caching proxy of the public registry is the primary use case rather than private publishing."
author: michielvha
goal: "Deliver the most-wanted upstream cache in real deployments, and be the first format where the proxy path is the point."
priority: "medium"
issue: ""
created: 2026-09-21
covers:
  - "internal/format/npm/**"
---

# Plan: npm registry format

## Context

npm is where the proxy layer earns its keep. The dominant real-world deployment of an artifact
repository in front of npm is not private publishing, it is a cache: build reliability when the
public registry has a bad day, egress cost, and supply-chain control over what enters a build.

This is therefore the first format where the **proxied path matters more than the hosted path**,
and the first real test of the cache policy design in `proxy-cache.md`.

It is also the first format with a genuinely mutable metadata document. The packument changes
every time anyone publishes, which makes it the proving ground for TTLs, conditional
revalidation and negative caching.

## Scope

**In scope:** packument assembly, tarball serving, scoped packages, dist-tags, publish, and the
proxied path against the public registry.

**Out of scope for v1:** `npm audit` endpoints, provenance attestation verification, and
organisation/team semantics mirroring npm's own. Each is a follow-on with its own spec.

## Acceptance Criteria

- [ ] AC1: `npm install` resolves and installs a package from a hosted repository, for at least
      two pinned npm client versions.
- [ ] AC2: `npm publish` accepts a package, and a subsequent `npm install` retrieves it with a
      matching integrity hash.
- [ ] AC3: Scoped packages (`@scope/name`) work for both install and publish.
- [ ] AC4: `npm ci` against a lockfile resolves entirely from the registry with integrity hashes
      matching.
- [ ] AC5: dist-tags are settable and respected by `npm install pkg@tag`.
- [ ] AC6: The proxied path installs a package from the public registry and serves it from cache
      on a second install without contacting the upstream.
- [ ] AC7: A packument is revalidated after its TTL and not before, proven against a mutating
      test upstream.
- [ ] AC8: Replay-match passes against a corpus recorded from a reference registry.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/npm/hosted_test.go` |
| AC2 | conformance | `conformance/npm/publish_test.go` |
| AC3 | conformance | `conformance/npm/scoped_test.go` |
| AC4 | conformance | `conformance/npm/lockfile_test.go` |
| AC5 | conformance | `conformance/npm/disttag_test.go` |
| AC6 | conformance | `conformance/npm/proxied_test.go` |
| AC7 | integration | `internal/proxy/ttl_test.go` |
| AC8 | conformance | `conformance/npm/replay_test.go` |

## Open Questions

### Q1: Which reference implementation records the golden corpus - Verdaccio, or the public registry?

They do not behave identically, and neither matches the documentation. This is the npm-specific
instance of `conformance-harness.md` Q3, and answering it here may settle the general rule.

**Why this is yours:** it determines what "correct npm behaviour" means for this project.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
