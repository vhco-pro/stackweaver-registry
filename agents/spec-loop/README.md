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

## Queue, in order

1. **Finish the format-side reconciliation** if `git log` does not show it: the items in
   `consequences.md` that target `docs/internal/plans/formats/*` and
   `docs/internal/analysis/management-surfaces-and-the-oracle.md`. The foundation side landed in
   `7df8575`.
2. **Foundation specs** (`foundation.tsv`), most-cited first: management-api, credential-management
   (must reach `planned` before OCI Phase 1), artifact-verification, signing-service,
   upstream-adapters, async-operations (reconcile with the `Operation` entity already in
   `data-model.md`), repository-lifecycle, observability, deployment, web-ui.
3. **Format specs** (`formats.tsv`): maven, nuget, hex, composer, conda, swift, cran, julia,
   terraform, then debian, rpm, alpine, conan, vagrant, chef, puppet, luarocks, hackage, cpan,
   opam, homebrew, openvsx, arch. Done already: generic, oci, npm, pypi, ansible-collections,
   cargo, go-modules, helm, pub.
4. **A reconciliation pass** over whatever the new specs queue in `consequences.md`.
5. **Gate reviews**, starting with `storage-and-gc.md` (un-planned by the Wave 1 reconciliation)
   and `credential-management.md`.
