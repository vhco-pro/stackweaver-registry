# Foundation authoring brief (stackweaver-registry spec loop)

Repository root (paths below are relative to it). Read CLAUDE.md first (binding), including "Standing
delegation of open questions (owner, 2026-09-26)".

You are authoring a shared foundation spec that OTHER specs already depend on and cite as
"(to be authored in the spec loop)". Your requirements therefore already exist, scattered:

1. `grep -rln "<your-file-name>" docs/internal/plans` and read every citing spec's relevant sections.
2. Read agents/spec-loop/consequences.md:
   the queued requirements other folds placed on your spec are listed there by name.
3. Read agents/spec.md, docs/internal/guidelines/documentation/plan-template.md, and the foundation
   specs: project-charter.md (your build step: cite it), data-model.md (owns ALL entities and the GC
   mark-root set), storage-and-gc.md, format-handler-interface.md (pinned five methods, Deps, Scope
   with addressed object, reserved mounts), auth.md, conformance-harness.md (closed setup vocabulary,
   seed path), proxy-cache.md, supply-chain-policy.md. Use storage-and-gc.md and auth.md as your
   models for depth.
4. This is Go-facing: read .claude/skills/go/SKILL.md and .claude/skills/go-spec-reviewer/SKILL.md;
   any CLI or configuration surface follows .claude/skills/cobra-viper/SKILL.md.

## Grounding
Ground design claims in prior art gathered this run (WebFetch): how Artifactory, Nexus, Harbor,
Pulp, Gitea and the relevant standards (Sigstore, TUF, OpenTelemetry, OIDC, etc.) actually do it,
and say what you take and what you reject and why. Evidence or silence.

## What to write: docs/internal/plans/foundation/<name>.md
Full frontmatter (description, covers: code globs such as internal/<pkg>/** or [], status: draft,
status_description, author: michielvha, goal, priority, issue: "", created: 2026-09-26). Sections:
Context (who depends on this, citing each spec; charter build step), Scope (exclusions carry
non-effort reasons: scope is not a constraint), Design, Acceptance Criteria (every requirement a
citing spec placed on you is asserted; mechanical enforcers such as architecture tests for every
boundary rule, per the constitution), Test Plan (a row per criterion), Implementation Phases,
`## Tasks` placeholder, Open Questions, Review Log.

## Rules
- Resolve conflicts between citing specs' requirements explicitly: write each as a question in the
  template decision shape and adopt its recommendation under the standing delegation
  (`### Resolved: <topic> (was Qn)`, opening "**Adopted 2026-09-26 under the owner's standing
  delegation.**"), folded into the body. Leave none open.
- Never add an entity or a GC mark root by fiat: data-model.md owns both. If you need one, specify it
  precisely and report it as a sibling consequence.
- Touch ONLY your new file. Every change a citing spec needs goes in your report as a sibling
  consequence (file, section, exact change, why).
- Never em-dashes or en-dashes. Never credit an AI assistant. Do not commit.
- Review Log: one row, date 2026-09-26, HEAD sha from your prompt, lens "authoring pass: grounded
  first draft, not a review", written last. `node scripts/check-spec.js <your file>`: zero
  failures; act on unasserted-duty advisories.

## Report (compact)
Requirements gathered and from where; conflicts resolved (one line each); criteria count;
questions adopted; sibling consequences.

## Model tier (read this)
Record the model you ran on in your Review Log lens, for example "authoring pass on Opus: ...".
If you are not Fable, add `fable_recheck: "<what you did> on <model>, <date>"` to the spec's
frontmatter (reconciliation and folding need it only when you adopted a new question). Never remove
an existing `fable_recheck` unless you are Fable performing that recheck. Never set `planned` on a
spec that carries one.

## Concurrency (read this)
Do NOT start your own subagents, Agent calls or workflows. The owner caps the whole loop at two agents at a time to control spend, and an agent that fans out breaks that cap invisibly. Do all the work yourself, sequentially.
