# Spec loop

The owner's standing instruction (2026-09-26): spec every foundation subsystem and all 33 catalogue
ecosystems in a continuous loop, never stopping to ask. A blocked open question is adopted at its
own written recommendation under the standing delegation in `CLAUDE.md`. This directory is the
loop's working state, so any session, local or cloud, can resume it from a clone. Delete it when
the queues are empty.

## Rules for running it

- **At most two agents at a time.** The owner set this after parallel runs of nine to fifteen
  agents exhausted the spend limit twice and killed work mid-write.
- Every agent writes its Review Log row and status_description last, so an interrupted agent
  leaves finished work with no record, never a record of unfinished work. On resume, check which
  files have today's Review Log row: those finished.
- After each finished spec: file one GitHub issue (a thin pointer to the doc), backfill its
  `issue:` frontmatter, commit `[skip ci]`, push. Update `docs/internal/plans/foundation/question-triage.md`
  and `docs/internal/HANDOFF.md` after each wave, not after each spec.
- Cloud containers may lack podman or docker. Where a brief asks for a real client capture and none
  can run, ground against the published protocol and the client's source instead, and say so in
  the spec.

## Briefs

| Brief | Use for |
|---|---|
| `author-brief.md` | A new format spec. Your format's grounding hints are its line in `formats.tsv`. |
| `foundation-brief.md` | A new shared foundation spec. Its hints are its line in `foundation.tsv`. |
| `fold-brief.md` | Adopting and folding open questions in existing specs. |
| `reconcile-brief.md` | Applying the cross-spec changes queued in `consequences.md`. |

A task prompt is one line: "Read `agents/spec-loop/<brief>` and follow it exactly. HEAD sha: <sha>.
Author `docs/internal/plans/<dir>/<name>.md`; your hints are its line in `<queue>.tsv`."

## Queue, split by where it runs

Split by the owner on 2026-09-26: work that needs real package clients in containers runs on the
owner's machine, one agent at a time; everything that only reads specs and published docs runs in
a cloud session. Both push to the same repository, so always `git pull --rebase` before pushing.
Each side appends to `consequences.md`; a conflict there is two lists to concatenate.

### Local: needs podman or docker (one agent at a time)

Format specs, grounded in captured traffic from the real client run in a container against a
logging stub, as `cargo.md`, `helm.md` and `ansible-collections.md` were. In order:

conan,
homebrew, openvsx, arch.

Done: generic, oci, npm, pypi, ansible-collections, cargo, go-modules, helm, pub, nuget, maven, hex, composer, conda, cran, julia, swift, terraform, rpm, debian, alpine, conan, vagrant, chef, puppet, hackage, luarocks, cpan, opam.

### Cloud: no containers needed (the owner's cloud credits)

1. **The "Open items" in `consequences.md`**, with `reconcile-brief.md`: auth's Cargo pattern
   bullet and yank note, and the question of an addressed-object kind for repository-wide index
   documents (without it, a patterned-pull token cannot run cargo or helm at all).
2. **Foundation specs**, with `foundation-brief.md`, one at a time, most-cited first:
   management-api, credential-management (must reach `planned` before OCI Phase 1),
   artifact-verification, signing-service, upstream-adapters, async-operations (reconcile with the
   `Operation` entity already in `data-model.md`), repository-lifecycle, observability, deployment,
   web-ui. Hints are each spec's line in `foundation.tsv`.
3. **A reconciliation pass** over whatever those specs queue in `consequences.md`.
4. **Gate reviews** (`agents/spec.md`, review mode): `storage-and-gc.md` first (un-planned by the
   Wave 1 reconciliation), then `credential-management.md`, `conformance-harness.md` and
   `generic.md`, which are the build-step 1 and 2 specs.
5. **Bookkeeping** after each finished item: `question-triage.md`, `HANDOFF.md`, and GitHub issues
   if `gh` is authenticated there (otherwise list the issues owed in the commit message).
