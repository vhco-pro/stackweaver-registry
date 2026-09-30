---
description: "The portable memory of this repository: mistakes, their root causes, and the conventions they produced. Newest first."
covers: []
---

# Lessons

Newest first. Each entry records a mistake, its root cause, and the convention it produced.
Anything learned that would otherwise live only in a chat session belongs here.

## 2026-09-30 - One invariant restated in two specs drifted apart for three passes

**What happened:** `management-api.md` said every request emits an audit line. `observability.md`,
which owns the audit channel, said reads are never audit events. Both statements were written in
the same week and survived three reconciliation passes side by side. Implemented as written, the
management API would have emitted events the audit channel has no registration for, and an
authorizer-refused write would have been audited twice. The Fable recheck of management-api found
it.

**Root cause:** the rule was restated in the consuming spec rather than cited from its owner. Each
reconciliation pass checked that citations resolved, and a restatement contains no citation to
check.

**Convention:** a spec that relies on another spec's rule cites the owning rule by criterion or
resolved record and does not paraphrase it. A paraphrase of a rule another spec owns is a review
finding.

## 2026-09-30 - Freshness measured from the data's own dates fails closed on every quiet source

**What happened:** `supply-chain-policy.md` Q7, adopted on Opus, judged an advisory source stale when
its newest record's `modified` date was older than a threshold. A Fable recheck tested it against a
real OSV archive. `Hackage/all.zip` held 33 records, zeroed zip entry times and no manifest, so a
perfectly current feed for a quiet ecosystem read as stale on both paths. An air-gapped install
importing yesterday's export could never become fresh.

**Root cause:** "the newest record changed long ago" was treated as "the feed is out of date". The
two are the same only for an ecosystem busy enough to publish advisories constantly.

**Convention:** measure currency from the act that proved it, such as a completed sync or a declared
export time, never from the change dates inside the data. Adopted as supply-chain Q13.

## 2026-09-28 - A queue marked done by report, with one file never written

**What happened:** the local format queue (every ecosystem that needs a real client in a container)
was marked "DONE, all 33 catalogue ecosystems specced", and the owner was told so. RubyGems had no
spec. Its author was one of the agents killed by the first spend-limit crash on 2026-09-26, was
never relaunched, and the completion claim was assembled from the agents that did report back.
The gap surfaced two days later only because an extraction pass counted 32 format specs.

**Root cause:** completion was judged from the reports that arrived, not by checking the queue
against the tree. A crashed agent produces no report, so "every report says done" is silent about
the work that never reported at all.

**Convention:** before a queue is marked done, check every entry against the files on disk
(`formats.tsv` names against `docs/internal/plans/formats/*.md`), and treat a missing file as not
done whatever the reports say. After any crash, list the agents that were in flight and relaunch
each one whose file is missing or lacks today's Review Log row.

## 2026-09-28 - An agent started four agents of its own, past the owner's cap

**What happened:** the owner caps the spec loop at two agents at a time, after parallel runs of
nine to fifteen agents twice exhausted the spend limit and killed work mid-write. A sweep agent,
given two files, started four extraction agents of its own to read the 32 format specs. For its
run, six agents were live while the orchestrator believed there were two. The agent then handed
back before its children finished, leaving its analysis file untouched.

**Root cause:** the cap was stated to the orchestrator only. No brief forbade fan-out, and nothing
an orchestrator sees in its own queue shows that a child has spawned grandchildren.

**Convention:** every brief under `agents/spec-loop/` carries a "Concurrency (read this)" section
forbidding an agent from starting agents, calling Agent or running workflows. Any ad-hoc agent
prompt says the same. A cap that only the top level knows about is not a cap.

## 2026-09-25 - Every versioned file was right; every issue body was wrong

**What happened:** two claims were corrected in the docs weeks ago. Gitea's format count was
changed from 24 (taken from Gitea's documentation page) to 23 (counted from source), and the
catalogue's headline was changed from "~31 ecosystems across ~15 protocols" to 33 ecosystems
across roughly 31 protocol implementations, after somebody added the rows up. A sweep of the
whole repository for the refuted forms found **exactly one hit, and it was the record of the
error itself** in `catalogue.md`. Every other versioned file had been corrected.

Then the same sweep over the fifteen GitHub issues found the refuted claims alive in **four of
them**: #5, #10, #11 and #12. None had been touched. #11 was worse than stale: it is **closed as
completed**, and its body concludes "that asymmetry is the moat: ~31 advertised ecosystems off
~15 implementations". Thirty-three off thirty-one is almost no collapse, so the moat argument
that issue makes does not survive its own arithmetic, and it reads as settled.

**Root cause:** a correction propagates through the things a correction pass can see. `grep`
reaches the working tree. Nothing reaches an issue body, no tooling validates one, no reviewer
reads one in a diff, and a closed issue is not even in the backlog a reader would scan.

**Convention:** this is the constitution's findings-live-in-docs rule earning itself, and it is
worth citing as evidence rather than as principle the next time an issue body starts growing an
argument. An issue is a pointer. When a claim moves into an issue body, it leaves the only
system that can keep it true.

Two practical consequences. **Correct by comment, not by edit** - editing the body would have
erased the evidence that the rot happened, which is the most useful thing the incident produced.
And **check issue bodies whenever a headline claim changes**, because no automated check will:
the repository's own `check-spec.js` and docs audit both stop at the filesystem boundary.

## 2026-09-25 - Zero open questions is not the same as settled

**What happened:** `pypi.md` and `ansible-collections.md` both carried the frontmatter claim
"All open questions answered by the owner and folded in; awaiting a /spec review pass to earn
planned", while the body of each said the opposite in plain words: "an empty section here means
not yet interrogated, not fully settled". Neither had ever been reviewed. `make gate` called both
**mechanically clear**, because zero open questions is the gate's main signal and a spec nobody
has questioned scores identically to one that survived four review rounds. `HANDOFF.md` listed
them among the cheapest paths to a `planned` spec.

**Root cause:** the count of open questions measures what was asked, and was being read as a
measure of what was settled. Those are the same number only for a spec that has actually been
interrogated. The frontmatter had drifted from the body in the direction that looked like
progress, which is the direction drift always takes.

**Convention:** a spec with no open questions, no resolved decisions and no review is reported as
**never interrogated**, and `--gate` refuses it outright rather than calling it clear. Only real
reviews count toward that: the repository already labels a cross-spec sync or a terminated
partial pass in its Review Log lens, and such a row leaves the design exactly as uninterrogated
as no row at all. `pypi` had one row and it said "status remains draft pending a full gate
review" in its own text.

The general form is worth keeping in mind whenever a gate is defined: **check that a signal can
distinguish "passed" from "never ran".** An absence and a success look the same to any counter
that only counts problems found.

## 2026-09-25 - The gap five reviews found by hand is now a script

**What happened:** five consecutive gate reviews each found the same defect, in a different spec:
something Design names as a duty, a mechanism or a mode has **no acceptance criterion policing
it**, so it can be silently unimplemented and every criterion still passes. `immediate` was the
only download policy no criterion in any spec exercised. Pruning reconstructibility, which Design
calls what keeps the sweep sound, was asserted nowhere. "Registration validates every mount" had
no criterion. Four security duties in `auth` had none. Each was found by a model reading
carefully, at roughly 90k to 180k tokens a pass.

**Root cause:** Design is where a spec explains itself and the criteria are where it commits, and
nothing structurally connects them. A spec can be internally coherent, mechanically clean, and
still make a promise it never asserts. Reviewers caught it five times because they were told to
hunt for it, not because the document made it visible.

**Convention:** `check-spec.js` now reports it. A backticked term is the tractable signal, since a
spec backticks what it means technically: a term Design uses at least twice that no acceptance
criterion mentions is reported as a candidate. It is scoped corpus-wide rather than per-spec,
because a term this spec names and a sibling polices is a division of labour, not a gap; the
weaker per-spec bucket is behind `--unasserted`.

It is advisory, and deliberately so. On its first run over fifteen specs it found three
candidates, and adjudicating them needed judgment a script does not have: two were
`WWW-Authenticate`, which no criterion names directly but which a real `docker login` criterion
cannot pass without, and the third was blocked on an open question, since writing its criterion
now would presuppose the answer. **A detector that would have to be right to be useful would be
wrong to write.** This one narrows where judgment gets spent, which is the whole economy the
project runs on: free checks first, model only on what is left.

## 2026-09-24 - A review that dies mid-pass leaves edits of three different kinds

**What happened:** six spec reviews ran concurrently; four terminated on a spend limit partway
through. All four left uncommitted edits, and they were not equivalent. `supply-chain-policy`
had a complete review that died between the last body edit and its Review Log row.
`conformance-harness` had a substantive review that died before writing a question its own new
prose referenced twice, leaving two dangling `Q4` citations. `data-model` had body corrections
that were independently checkable against sibling specs. `auth` had **only** a frontmatter
`status_description` announcing a gate review that raised nine questions - none of which existed
in the body, with no Review Log row and no other edit in the file.

**Root cause:** a review writes its evidence last. The status field and the Review Log row are
the cheapest edits in the pass and they happen at the end, so an interrupted review is maximally
likely to have done the work and not the record - or, worse, to have written the record first and
be caught having claimed work it never did. Nothing distinguishes the two states from the outside
except reading the diff against the body.

**Convention:** an interrupted review is triaged per file, never per batch, and the test is
whether the edits are verifiable against the tree **without trusting the reviewer**. Keep body
edits that check out against siblings and record them honestly as partial, with a Review Log row
saying the review did not complete and does not count. Revert any edit whose only content is a
claim about work - a `status_description`, a Review Log row - that the body does not contain.
Where a dangling reference survives (prose citing a question the reviewer never wrote), raising
that question is legitimate and answering it is not, so the question gets written with a note in
the Review Log that its framing is not the original reviewer's.

The mechanical checker already catches the dangling-reference form of this, which is how the
`conformance-harness` gap surfaced rather than being found by reading. The frontmatter-only lie
it cannot catch, because a `status_description` is prose: that one is caught by never accepting a
status claim without a Review Log row to match it.

## 2026-09-23 - A resolved decision is not an applied decision

**What happened:** twenty-five owner decisions were folded into twelve specs by appending a
`### Resolved:` section to each question. A review round over five of those specs found the same
defect in all five: the bodies still described the pre-decision design. Scope listed operations
the settled interface shape makes impossible, Design cited questions as open that the same file
recorded as resolved, and acceptance criteria could pass with every decision unimplemented. In one
spec all ten criteria were green against a model that had none of the five settled changes.

**Root cause:** recording a decision and applying it are different edits, and only the first is
visible at the point of answering. The `Resolved:` section made the work look complete.

**Convention:** folding an answer means editing the spec **body** - Scope, Design, the acceptance
criteria and the Test Plan - and the `Resolved:` section is the record of *why*, not the
application. A spec whose criteria can all pass with a settled decision unimplemented has not been
updated, however many resolutions it carries. Reviewers check this explicitly; it is now the first
question a review pass asks of a recently-answered spec.

This has a precedent in this repository, which is what makes it a pattern rather than an accident:
the charter's breadth reversal updated the build-order table and left the implementation phases
describing the superseded five-format plan.

## 2026-09-21 - Inherited conventions arrive with someone else's incident history

**What happened:** the working harness (agents, hooks, docs tooling, conventions) was ported from
Stackweaver. Several rules arrived with concrete examples attached - specific issue numbers,
named subsystems, a duplicated ansible-runner path - that are meaningless here.

**Root cause:** a convention's *punch* comes from the incident that produced it, and incidents do
not port.

**Convention:** the inherited rules were genericised, and this file starts empty on purpose. Every
rule here earns its example from something that actually happened in this repository. When a rule
has no local incident behind it yet, say so rather than inventing one.

The one inherited rule kept with deliberate force is the duplicated-path trap: upstream it was
"the ansible-runner has two execution paths and a claim verified against one is not verified".
Here it is **hosted vs proxied**. Same failure, different subsystem.
