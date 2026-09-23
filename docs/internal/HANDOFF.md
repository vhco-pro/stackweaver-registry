---
description: "Handoff for continuing this project in a different agent harness: current state, what is portable, how to run the review loop cheaply, and the next concrete actions."
covers: []
---

# Handoff

Written so this project can continue in any agent harness, not only the one it started in.
Everything binding lives in the repository; nothing important is in a chat log.

**Status as of 2026-09-23:** pre-alpha, no implementation code. Thirteen specs, one at
`planned`, 27 open questions. The repository is private.

## What state the project is in

| | |
|---|---|
| Specs | 13, plus a tracking document |
| `planned` | `storage-and-gc` (the only one to clear the gate) |
| Zero open questions, awaiting a gate review | `auth`, `format-handler-interface` |
| Largest question blocks | `data-model` 6, `oci` 5, `project-charter` 4, `proxy-cache` 4, `generic` 4 |
| Issues | vhco-pro/stackweaver-registry#1 to #13 |
| Code | a stub `cmd/stackweaver-registry/main.go` and nothing else, deliberately |

Run `make check-spec` for the live version of that table. Do not trust this one; it is a
snapshot and snapshots rot.

## What is portable, and what is not

**Portable, and where the real content lives:**

- `CLAUDE.md` - the constitution. Harness-named, not harness-specific.
- `AGENTS.md` - the cross-harness entry point, pointing at the above.
- `agents/*.md` - the actual instructions for every step of the loop. Plain markdown. A harness
  without slash commands reads these directly and loses nothing.
- `docs/internal/plans/**` - every spec, every decision, every accepted cost.
- `.claude/skills/` - spf13's Go skills, vendored verbatim under MIT. Also plain markdown: any
  agent can read them, whether or not its harness has a skill mechanism.
- `scripts/`, `Makefile`, `.githooks/`, `.github/workflows/` - all the tooling and gates.

**Not portable, and what to do instead:**

| Claude Code feature | Replacement |
|---|---|
| `/spec`, `/tasks`, `/implement`, `/ship` slash commands | Read the matching `agents/*.md` and follow it |
| `model: fable` frontmatter pinning | Choose the model yourself: a strong one for spec review, a cheap one for mechanical work |
| Subagents with per-agent model override | Run reviews one at a time, or use whatever parallelism the harness offers |
| `AskUserQuestion` structured prompts | Ask in prose. The template's decision shape (heading, recommendation, options table, "why this is yours") is in `plan-template.md` and carries the same information |
| Vendored skills auto-loading by description | Read `.claude/skills/go/SKILL.md` explicitly when writing or reviewing Go |

## Running the loop cheaply

The expensive thing here has been adversarial spec review: roughly 90k to 150k tokens per spec
per pass, run several at a time. Most of that is worth paying for. Some of it was not, and that
part is now a script.

**Always run the free checks first:**

```bash
make check-spec                     # every spec
make gate SPEC=path/to/spec.md      # is this one mechanically ready for `planned`?
```

`scripts/check-spec.js` covers acceptance-criteria-to-test-plan mapping, template sections,
frontmatter validity, em-dashes, review staleness against git, duplicate criterion ids, and the
half-applied-decision defect. It also flags criteria that look like they measure a problem rather
than remove it. None of that needs a model.

**Then spend the model only on judgement.** A review pass that adds value answers: is this design
right, does it contradict a sibling spec, what did it miss, and are these criteria actually
testable in the way they claim.

Other economies worth knowing:

- **Review one spec at a time.** Fanning out five reviewers found real cross-spec contradictions,
  but most of the value came from the first pass on each spec, not from concurrency.
- **Re-review only what changed.** The Review Log records the sha each pass verified against;
  `make check-spec` tells you when a `planned` spec has drifted from it.
- **Do not re-review a spec whose questions are unanswered.** It will surface the same gaps.
  Answer first, fold into the body, then review.

## Three things that will go wrong if nobody says them

1. **Folding an answer means editing the spec body.** Recording a decision in a `Resolved:`
   section is not applying it. This has happened twice: once on the charter's breadth reversal,
   and once across all five foundation specs at the same time, where 25 decisions were recorded
   and none was propagated into Scope, Design or the criteria. In one spec every acceptance
   criterion still passed with every settled decision unimplemented. `make check-spec` catches
   the most common symptom, not all of them.

2. **Open questions belong to the owner.** An agent answering its own question turns a gate into
   a rubber stamp. This rule is why the specs are trustworthy; it is also the rule an agent under
   time pressure will break first.

3. **Conformance is the real gate, and CI will not catch it on a pull request.** It runs on
   `main` pushes only. Whoever pushes is the gate. This is a knowingly accepted hazard with a
   documented reversal path (`conformance-harness.md`, resolved CI trigger) - not an oversight to
   quietly fix by relaxing the rule.

## Next actions, in order

1. **Gate reviews for `auth` and `format-handler-interface`.** Both are at zero open questions
   with every criterion mapped. Run `make gate SPEC=...` first; if it passes, the review only has
   to judge the design. These are the cheapest path to more `planned` specs.
   - For `auth` specifically: AC10 requires an external security review **of the implementation**,
     by someone other than the implementing agent, before any auth code reaches `main`. That is
     not satisfied by any number of spec reviews, and the owner has said explicitly they do not
     want an LLM's approval to be the last word there.
2. **`conformance-harness` has one open question** and is the spec everything else is built
   against. Answer it and gate-review it.
3. **`data-model`'s six**, which include the one genuinely structural problem outstanding: the
   snapshot and pointer model is incompatible with OCI's push flow, which serves blobs before any
   manifest exists. Its Q9 must be answered together with `oci.md` Q2; they currently carry
   opposite recommendations for the same decision.
4. **Then `/tasks` and the first code**, starting with the conformance harness. The harness is
   built before any format handler, deliberately.

## Open commitments that are easy to lose

- **Redaction ships before the first corpus is committed**, public repository or not. Recording
  real registry traffic into an in-repo corpus is a credential leak waiting for the repository to
  go public (`conformance-harness.md`, blocking precondition on recording).
- **Revisit the conformance CI trigger when the repository goes public.** Its accepted cost was
  priced against a private-repo minutes budget that will no longer exist.
- **`project-charter` Q3 must be answered before npm starts.** npm is the baseline for the
  experiment's headline measurement, and a baseline collected under an undefined procedure is not
  a baseline.
- **The handler interface re-opens after OCI and before any Tier 1 work**, seeded by two real
  implementations and a Debian signed-index prototype. The gate is recorded on both sides
  (`format-handler-interface.md` AC8 and `formats/npm.md`).
