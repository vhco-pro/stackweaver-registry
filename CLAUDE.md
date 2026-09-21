# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An open artifact repository: a multi-format package registry with **upstream caching, SSO and
RBAC included**, not paywalled. Licensed Apache 2.0.

The gap this fills is specific. For OCI, free is solved (Harbor, Quay, Zot). For multi-format
hosting, free is solved (Gitea and Forgejo cover ~24 formats; GitLab CE covers most). What
nobody ships for free is the combination: **multi-format, plus remote proxy/caching of
upstreams, plus virtual aggregation, plus a usable UI, plus SSO**. Pulp has the plumbing and no
UI. Gitea has the UI and formats but cannot cache an upstream. Harbor has all three but speaks
only OCI. JFrog and Sonatype have all of it and fence SSO, HA and quotas behind a licence.

So the differentiator is the **proxy/cache layer**, not the hosting. A format that only hosts is
a format Gitea already does for free. Design every format handler with its proxy path from the
start; it changes the storage model and cannot be bolted on later.

**Stack:** Go 1.26. TypeScript/React frontend (later; there is no `web/` yet). Content-addressable
blob storage over S3-compatible object storage. PostgreSQL for metadata.

## This repository is also an experiment

This project is a deliberate test of autonomous, spec-driven agent development. The research
question is **not** "can agents write code" - that is answered. It is:

> Can an agent fleet drive a protocol-conformance project to production quality, with the human
> writing only specs and adjudicating architecture?

That framing has consequences for how you work here, and they are binding:

- **The conformance harness is the product; the server is what satisfies it.** Build and extend
  the harness before the handler it tests, always. A weak harness cannot be rescued by more
  agent horsepower.
- **Track the experiment's own metrics**, in `docs/internal/tasks/experiment-log.md`: human
  interventions per format, defect escape rate (found by users vs. found by the harness), and
  above all **whether format N+1 costs less than format N**. Generalisation is the finding; if
  every format is a fresh grind, that is worth knowing early.
- **Report honestly.** A format that passes 40 of 60 conformance cases is at 40, not "basically
  done". Inflated progress corrupts the only data this experiment produces.

## Why this problem suits autonomous work

The test oracle already exists and it is an executable. Correctness here is a subprocess exit
code, not a human judgment call:

```
docker push / docker pull        npm install / npm ci        pip install
mvn dependency:get               helm pull                   cargo add
ansible-galaxy collection install                            apt-get install
```

Two multipliers on top:

- **Differential testing.** A recording proxy between a real client and a reference server
  (Verdaccio, a local Gitea, Harbor, the public registry) yields a golden corpus of real
  request/response traffic. Our server must replay-match it. That corpus is a self-generating
  specification, and it captures the undocumented client quirks that otherwise cost months.
- **OCI ships an official conformance suite.** `opencontainers/distribution-spec` publishes
  conformance tests. For that format the pass/fail gate is written by the standards body.

**The client is the specification. The documentation is routinely wrong.** Never ground a claim
about client behavior in docs or recollection; ground it in captured traffic or a run.

## Where this is NOT mechanically checkable (read before designing)

Conformance says nothing about these, and each is a way to ship something that passes every test
and is still broken. Specs must address them by name or they will not get built:

1. **Concurrency and durability have no client-level oracle.** `docker push` succeeding does not
   prove blob GC will not delete a live blob under a concurrent push, that an interrupted chunked
   upload leaves no orphans, or that an index rebuild is atomic. These need fault injection and
   property tests. **This is the single most likely way this project eats data.**
2. **Architecture has no oracle.** Storage/CAS design, GC strategy, proxy cache semantics, the
   data model, the UI. Left to conformance alone you get test-passing mediocrity, confidently
   delivered. This is what the spec is for.
3. **Performance is invisible to conformance.** "Fast" is not an exit code. Benchmarks are CI
   gates, not an afterthought; without them you get correct-and-slow and notice in two months.

## Build & Development Commands

```bash
make setup                 # Go deps + dev toolchain
make setup-git-hooks       # install pre-commit + commit-msg hooks (do this first)
make build                 # build binaries into bin/
make run                   # run the server locally
make test                  # Go unit tests
make verify                # the CI suite locally, read-only, before pushing
make lint                  # linters WITH auto-fix
make conformance           # full conformance suite (real clients, containers, minutes)
make conformance-format FORMAT=oci   # one format's suite
make docs                  # rebuild docs index, coverage map, README contents tables
```

**Running a single Go test:**
```bash
go test -v ./internal/format/oci -run TestSpecificName
```

## Critical Conventions

### Conformance Is The Gate (CRITICAL)

- **`make verify` does not run conformance.** It is minutes long and needs containers, so it is
  deliberately out of the pre-commit path. That means **you** must run `make conformance` before
  pushing anything under `internal/format/`, `internal/storage/`, or `internal/proxy/`. A unit
  test agreeing with your reading of the spec proves nothing; the whole point of the harness is
  that the real client disagrees.
- **Never infer a conformance pass from a unit-test pass.** Say what you actually ran.
- **A skipped conformance case is a silent regression.** If a case must be disabled, the skip
  reason carries an issue number and the format's spec gets a line saying so. Never `t.Skip` to
  get a commit through.
- **Both paths, always.** Every format has a hosted path and a proxied/cached path. A claim
  verified against only one is not verified. This is this project's standing duplicated-path
  trap, and it is where the subtle bugs will live.

### CI Economy (CRITICAL)

CI minutes are a limited budget. **A commit to `main` is the only CI spend taken for granted;
iterating on a PR is not.**

- **Verify fully locally before any push** - `make verify`, plus `make conformance` where it
  applies. Do the design conversation in the spec, not through force-pushes on an open PR.
- **The pre-commit hook runs `make verify` scoped to what you staged.** A docs-only commit runs
  nothing. `SKIP_VERIFY=1 git commit` is the escape hatch; CI is still the hard gate.
- **Lint the module, not your packages, and do not confuse `lint` with `verify`.** `make lint`
  *auto-fixes*, which can leave you green locally while CI, which is read-only, fails on fixes
  you never staged. `make verify` checks the way CI checks.
- **Match CI's linter version.** `.github/workflows/ci.yml` pins golangci-lint and `make verify`
  warns when your local build differs. Same config, different release, different verdict.
- **`make verify` calls `gofumpt` directly**, not only through golangci-lint, because only recent
  golangci releases enforce it. Keep `gofumpt` installed or the check reports itself SKIPPED.
- **Small, contained, verified changes go straight to `main`** - no branch, no PR. Have the
  commit close its issue.
- **A multi-phase feature is ONE PR on one branch**, one commit per phase. Phases sequence the
  work; they are not delivery boundaries. Never stack PRs to mirror plan phases.
- **Batch pushes** - several commits in one push is one CI run. Never mix a `[skip ci]` commit
  into a push containing code; the directive skips the whole run.

### Working Style (CRITICAL)

- **Never use em-dashes or en-dashes** (`—`, `–`) in anything: code comments, UI strings, docs,
  specs, commit messages, PR bodies, issue bodies, or chat replies. Use a spaced hyphen (` - `),
  a colon, a comma, or two sentences. Fix them on lines you touch.
- **Never credit an AI assistant.** No `Co-Authored-By: Claude/Anthropic`, no "Generated with
  Claude Code", no robot footer, anywhere. `.githooks/commit-msg` hard-blocks these; install it
  with `make setup-git-hooks`.
- **Ground every plan before handing it off.** Re-verify each `file:line` and each
  exists/missing claim against the working tree, instructed to refute rather than confirm.
  Research passes routinely produce confidently wrong premises. For protocol claims, the
  grounding is captured client traffic or the published spec - never the client's documentation.

### Findings Live in Docs, Not in Issues (MANDATORY)

Any substantive finding - a spec, an analysis, a root cause, a prior-art verdict - is written as
a document under `docs/internal/` **first**, and the GitHub issue is a summary that links to it.
An issue body must never carry the only copy of the reasoning: issue bodies are unversioned,
invisible to the docs tooling and `covers` checks, unreviewable in a PR, and unreachable from a
checkout. This holds even when nothing is queued for implementation - a "not now, here is why"
verdict is precisely what gets re-litigated later.

Homes: specs/plans → `docs/internal/plans/<category>/`, investigations and root causes →
`docs/internal/analysis/`, bug reports → `docs/internal/bug-reports/`, prior-art surveys →
`docs/internal/research/`. Write the doc (with full frontmatter and `covers`), rebuild the index
(`make docs`), file the issue naming the doc path, then backfill the doc's `issue:` frontmatter.
One issue per spec. Full rules: `docs/internal/guidelines/documentation/FINDINGS_AND_ISSUES.md`

### Spec-Driven Development

**One document per feature**, in `docs/internal/plans/<category>/`, from
`docs/internal/guidelines/documentation/plan-template.md`. The spec IS the plan; there is no
second document. `/spec` authors and reviews it, `/implement` consumes it and **hard-gates**: it
refuses to start while `## Open Questions` has entries, while any acceptance criterion lacks a
`## Test Plan` row, or while the last `## Review Log` entry is stale relative to `main`.

This is what makes the loop economical: `/spec` produces a grounded document with testable
acceptance criteria precisely so implementation need not re-derive the design. If an
implementation run is floundering for want of judgment, the spec was underspecified. Fix it with
`/spec review`; do not reach for a bigger model.

**Acceptance criteria state the end state, never a measurement of the problem.** A criterion
whose subject is a report, a count, or a warning is satisfiable while the problem it describes
remains untouched. "The harness reports OCI conformance coverage" is green with every case
failing; "the OCI conformance suite passes with zero skips" is the criterion you want.

### Documentation

- User-facing docs in `docs/` use full sentences, not bullet points.
- Never copy code blocks into docs; reference the source file and the **symbol name** instead.
  Avoid line numbers - they rot on the next edit.
- Every internal doc needs frontmatter (at minimum `description`; plans also need `status`,
  `status_description`, `author`, `goal`). A file without `description` is silently dropped from
  the index, and `make docs` now fails on it.
- **Never hand-edit a `## Contents` table** in a `docs/**/README.md`; they are generated from
  frontmatter by `scripts/build-docs-index.js`.
- All docs carry a `covers` frontmatter field listing code-area globs they describe. Only
  code/config paths (`cmd/`, `internal/`, `pkg/`, `conformance/`, `deploy/`, `scripts/`,
  `.github/`), never `docs/` paths. Use directory-level globs for resilience.
- **Keep specs in sync in the same pass as the code** - tick the phase boxes and update
  `status_description` when work lands, rather than leaving it for later.
- **Record hard-won lessons in `docs/internal/tasks/lessons.md`** (newest first): a mistake, its
  root cause, and the convention it produced. That file is this repo's portable memory.

### Documentation Impact Check (MANDATORY)

After any feature, fix, or config change, check whether docs need updating before calling it
done:

```bash
git diff --name-only HEAD | node scripts/check-doc-coverage.js
```

Every doc it lists must be reviewed against the code you changed. The `covers` map can miss
verbatim references, so also grep `docs/` for any symbol, env var, flag, endpoint, or default
value you changed. The pre-commit hook runs the same checker as an advisory warning; it does not
replace this step.

### Go Rules

**The Go authority in this repository is the vendored `go` skill** (`.claude/skills/go/`), from
[spf13/go-skills](https://github.com/spf13/go-skills) by Steve Francia - former Go team lead at
Google, author of Cobra, Viper, Hugo and Afero. It is loaded whenever Go is written, reviewed,
debugged or refactored, and it governs package design, interfaces, concurrency, testing,
generics and the modern stdlib. Do not re-derive Go style here or argue it from memory; read it.

Three more are vendored and apply in their domains: `go-spec-reviewer` (run it during
`/spec review` on any Go-facing spec, *before* implementation), `cobra-viper` (`cmd/artifactory`
is a Cobra CLI), and `go-release` (this module is published, so semver promises and
breaking-change detection are binding). Provenance, the exclusions, and the house-rule conflicts
are in `.claude/skills/README.md`.

Project-specific rules the skill does not cover:

- **Wrap errors with a gerund phrase and no prefix**: `fmt.Errorf("serving blob %s: %w", dgst, err)`.
  Not `"failed to serve blob"` - wrapping concatenates, and a prefix at every level yields
  `failed to serve blob: failed to read manifest: failed to open: ...`, which is one useful word
  per frame and the rest noise. This supersedes the rule inherited from Stackweaver.
- Pass `context.Context` through function calls.
- Format handlers implement a common interface and must not reach into each other. Cross-format
  behavior belongs in the storage, proxy, or auth layer, never in a handler. Enforced by
  architecture tests, not by review.
- Blob storage is content-addressable. Never key a blob by anything but its digest.

### Commit Messages

Conventional commits: `feat(scope): subject`, `fix(scope): subject`, `refactor(scope): subject`.
Scope is usually the format or layer (`oci`, `npm`, `storage`, `proxy`, `conformance`).

**Skip CI for non-release changes.** Append `[skip ci]` when the change affects no built artifact
and no published surface: `docs/internal/**`, `agents/**`, `.githooks/**`, dev-only `scripts/**`,
`.claude/**`, repo meta (`CLAUDE.md`, editor config), and comment/format-only changes. **Never**
add `[skip ci]` when the change touches code, `deploy/**`, `conformance/**`,
`.github/workflows/**`, Dockerfiles, or dependency manifests.

**Watch `[skip ci]` when squash-merging a PR.** GitHub's default squash message concatenates
every commit message in the PR. One `[skip ci]` in any commit skips the entire pipeline for the
merge. Edit the squash message to remove them before merging anything non-skip-eligible.

### Model Tiers Are Pinned Per Command

Each slash command in `.claude/commands/` carries a `model:` field, so the tier is chosen by the
job rather than by whatever `/model` happened to be set to. Do not remove those fields, and do
not hand-switch models before running one of these commands. Judgment work (`/spec`,
`/investigate`, `/triage`) runs on the higher tier; execution work already constrained by an
approved spec (`/implement`, `/ship`) runs on the cheaper one.
