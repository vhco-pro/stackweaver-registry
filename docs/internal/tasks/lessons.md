---
description: "The portable memory of this repository: mistakes, their root causes, and the conventions they produced. Newest first."
covers: []
---

# Lessons

Newest first. Each entry records a mistake, its root cause, and the convention it produced.
Anything learned that would otherwise live only in a chat session belongs here.

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
