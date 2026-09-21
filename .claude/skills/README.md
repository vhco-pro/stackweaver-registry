# Vendored skills

Go engineering skills from **[spf13/go-skills](https://github.com/spf13/go-skills)** by Steve
Francia - former Go team lead at Google, co-designer of Go modules, author of Cobra, Viper, Hugo
and Afero.

Vendored rather than installed from the plugin marketplace so they are version-controlled,
inherited by every subagent, reviewable in a PR, and available from a clean checkout with no
network or marketplace state.

| Provenance | |
|---|---|
| Upstream | https://github.com/spf13/go-skills |
| Commit | `9ac6eca43161163bb21621a520a57df50d5ad464` (2026-09-17, catalog v1.0.0) |
| Licence | MIT, retained as `LICENSE.spf13-go-skills` |
| Modified | No. Files are verbatim. |

## What is vendored, and why

| Skill | Why it is here |
|---|---|
| `go` | The core. Idiomatic Go through 1.25: package design, error handling, interfaces, concurrency, testing, generics, and the modern stdlib packages. Applies to every `.go` file in this repo. |
| `go-spec-reviewer` | Plugs straight into this project's SDD loop. `/spec review` on a Go-facing spec should run it: it catches over-engineering, missing error paths and interface misuse *before* implementation, which is precisely where this project's spec gate is meant to bite. |
| `cobra-viper` | `cmd/stackweaver-registry` is a Cobra CLI and the server takes 12-factor configuration. Written by the author of both libraries. |
| `go-release` | This repository publishes a public Apache-2.0 Go module. Semantic-versioning promises, mechanical breaking-change detection, `Deprecated` conventions and `go.mod` hygiene all become binding the moment someone imports it. |

## What is deliberately not vendored

- **`wails`** - desktop applications. No desktop surface here.
- **`fileflow-pathologize`** - safe local filesystem moves via `spf13/fileflow`, and OS-safe path
  sanitisation via `spf13/pathologize`. Skipped because blobs are content-addressed and stored in
  S3-compatible object storage keyed by digest, so untrusted package names never become
  filesystem paths. **Revisit if that stops being true**: the generic format spec has an open
  question about arbitrarily deep artifact paths
  (`docs/internal/plans/formats/generic.md`, Q1), and answering it "yes, stored as paths" puts
  path traversal from untrusted input squarely back on the table. That is the moment to vendor
  this skill.

## Where these conflict with house rules

These are third-party documents kept verbatim, so where they disagree with `CLAUDE.md`, the
resolution is recorded rather than silently applied:

- **Error wrapping.** The inherited house rule was
  `fmt.Errorf("failed to X: %w", err)`. The `go` skill uses a gerund phrase with no prefix:
  `fmt.Errorf("loading config file %s: %w", path, err)`. **The skill wins**, and `CLAUDE.md` has
  been changed to match. The reason is that wrapping concatenates, so a `failed to` prefix at
  every level produces `failed to serve blob: failed to read manifest: failed to open: ...`,
  where the useful information is one word per frame and the rest is noise.
- **Prose style.** These files use em-dashes freely. The no-em-dash rule in `CLAUDE.md` governs
  **our** output - code, comments, docs, specs, commits, issues - and is not retroactively
  applied to vendored third-party text. Do not mirror their punctuation when writing here.

## Updating

Re-vendor from upstream rather than editing in place, then re-check the conflict list above:

```bash
git clone --depth 1 https://github.com/spf13/go-skills /tmp/go-skills
cp /tmp/go-skills/{go,cobra-viper,go-spec-reviewer,go-release}/SKILL.md \
   .claude/skills/<matching-dir>/
```

Record the new commit SHA in the provenance table in the same pass.
