---
description: "Handoff for continuing this project in a different agent harness: current state, what is portable, how to run the review loop cheaply, and the next concrete actions."
covers: []
---

# Handoff

Written so this project can continue in any agent harness, not only the one it started in.
Everything binding lives in the repository; nothing important is in a chat log.

**Status as of 2026-09-26:** pre-alpha, no implementation code. Fifteen specs, 49 open questions.
Every spec has had at least one review. `storage-and-gc` is at zero open questions and is the
project's first gate candidate. The repository is private.

## What state the project is in

| | |
|---|---|
| Specs | 15, plus a tracking document |
| `planned` | none yet. `storage-and-gc` reached it once and went back to `draft` when a re-review found its fourth mark root half-applied and a fifth missing. That fifth root is now settled (Q10 = A) and it is a gate candidate again |
| Awaiting a gate review | `storage-and-gc`, at zero open questions after the 2026-09-26 fold. Every other spec carries open questions |
| Largest question blocks | `replication` 7, `supply-chain-policy` 6, `auth` 5, `ansible-collections` 5, `oci` 4, `proxy-cache` 4, `project-charter` 4, `generic` 4 |
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
than remove it, and duties Design names at least twice that no criterion in any spec asserts
(`--unasserted` adds the weaker per-spec bucket, where a sibling does the asserting). None of that needs a model.

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

Every foundation spec has now had at least one gate review, and none reached `planned`, because
each review found something real. The bottleneck is no longer review coverage: it is owner
decisions. `question-triage.md` is the live backlog and organises the 41 open questions into four
clusters that have to be answered together.

1. **Answer Cluster 5.** A management-surface precedent decision, with context in
   [`management-surfaces-and-the-oracle.md`](../analysis/management-surfaces-and-the-oracle.md).
   Note that this cluster was originally framed here as a hole in the conformance gate and that
   framing was wrong: the oracle can assert every one of those operations' effects even where no
   client triggers them. The decision is ordinary, but four specs wait on it and each will answer
   it differently if it is left to them.
2. **Answer `supply-chain-policy` Q5**, the remainder of Cluster 2 now that Q10 and Q11 are
   settled. Its quarantine option would add a sixth mark root, and it reconciles two settled
   specs that disagree about the same real event.
3. **Answer Cluster 1, `auth` Q13 first.** Three specs now need one thing the pinned handler
   interface does not provide: a request mapped to the package coordinate being acted on.
   `auth` Q13 leads, `supply-chain-policy` Q4 and `format-handler-interface` Q9 follow, because
   whether an out-of-cycle amendment to the pin is tolerated depends on Q13's answer. None of
   the scheduled re-open's three named inputs would have surfaced this.
4. **Answer `conformance-harness` Q4.** The only Tier A question blocking step-1 code rather than
   step-2 code, and its answer constrains how every later subsystem gets conformance coverage.
   Its answer must bring an acceptance criterion with it: `setup` is named five times in Design
   and asserted nowhere, and no criterion can be written before the answer without presupposing
   it.
5. **Answer `generic`'s four**, which unblock build step 2.
6. **Then `/tasks` and the first code**, starting with the conformance harness. The harness is
   built before any format handler, deliberately.

Standing note on `auth`: AC10 requires an external security review **of the implementation**, by
someone other than the implementing agent, before any auth code reaches `main`. No number of spec
reviews satisfies it, and the owner has said explicitly they do not want an LLM's approval to be
the last word there. Its own gate review left that criterion untouched and recorded that it did
not satisfy it.

## Open commitments that are easy to lose

- **Dated: record the vagrantcloud.com corpus before 2026-12-31.** HCP Vagrant stopped creating
  boxes on 2026-10-01 and stops operating on 2026-12-31. After that there is no real upstream to
  record the Vagrant proxied-path corpus against, and content hosted there is gone unless it was
  mirrored first (`formats/vagrant.md`, the mirroring recipe; `replication.md` Q11 sequences it).
- **Fable recheck queue.** Fable ran out of monthly credit mid-loop, so specs authored or
  reviewed on another model carry `fable_recheck` frontmatter, listed by `make check-spec`. None
  can reach `planned` until a Fable review clears the marker. Spend the next Fable credit there.
  The question-level snapshot (146 adoptions across 27 specs, in a recheck-first order) is round
  six of `plans/foundation/question-triage.md`; start with `storage-and-gc.md`, the first gate.
- **RubyGems is the 33rd format and the last one authored** (2026-09-28, `plans/formats/rubygems.md`,
  on Opus with twelve adopted questions). Its first author died in the 2026-09-26 crash and the
  queue was wrongly marked done in the meantime (`tasks/lessons.md`).
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
