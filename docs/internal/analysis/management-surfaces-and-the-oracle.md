---
description: "Context for the Cluster 5 decision: what management operations each ecosystem has, which of them a real client can drive, and the correction that the conformance oracle can test every one of their effects even where it cannot trigger them."
covers: []
status: complete
status_description: "Written 2026-09-26 because the owner asked for more context before deciding Cluster 5. Corrects an overstatement in question-triage.md's framing of that cluster, made by the same author. Extended the same day by the cross-spec reconciliation: Cargo rows added (yank, unyank and owners are real client commands, so trigger and effect are both oracle-testable) and a dated note recording how Cluster 5 was adopted."
author: michielvha
goal: "Give the Cluster 5 decision an accurate frame, by separating the operation a client can trigger from the state a client can observe, and grounding both against the installed clients."
---

# Management surfaces and what the oracle can see

Written because the Cluster 5 question was put to the owner without enough context, and because
checking the context revealed that the question had been framed too dramatically.

## The correction first

`question-triage.md` recorded Cluster 5 as the most consequential finding in that document, on
the grounds that the project's central gate, the real client CLI as test oracle, **has nothing to
say about management operations a client never performs**.

That is wrong, and the spec it was generalised from had already said why. `pypi.md` Q1 states it
exactly: PEP 592 "fully specifies how yank is *served* and what installers do with it, and both
are testable through pip", while "the *act* of yanking has no client wire contract".

**Two different things were collapsed into one.** A management operation has a trigger and it has
an effect, and the oracle's reach over them is not the same:

- The **trigger** is the API call that changes state. For most management operations no client
  makes it, so no client can prove our endpoint works.
- The **effect** is the state a resolving client then sees. That is ecosystem-standardised,
  because it has to be: the whole point of yanking is that installers behave differently
  afterwards.

The conformance harness sets up state before running a client, so **it can assert every effect
below without any client triggering it.** The harness's `setup` vocabulary already provisions
repository and server configuration a case depends on, which is the mechanism. A yank case reads:
provision a yanked file, run a real `pip install`, assert the yanked version is skipped and that
an exact pin still resolves. That is a full-strength conformance case for the half of the
behaviour that users actually experience.

So the gate is not holed. What is genuinely undecided is narrower and more ordinary.

## What each ecosystem actually has

Grounded against the clients installed on this host rather than against documentation.

| Operation | Can a real client trigger it? | Can a real client observe the effect? |
|---|---|---|
| PyPI yank / unyank | **No.** `twine` has no yank or delete subcommand; pypi.org yanks through its own web UI | **Yes.** PEP 592: resolvers skip a yanked file unless the requirement pins that exact version |
| PyPI file deletion | **No.** Same as above | Yes, as a 404 and a resolution failure |
| npm unpublish | **Yes**, `npm unpublish` exists | Yes, installation fails |
| npm deprecate | **Yes**, `npm deprecate` exists | Yes, the installer surfaces the deprecation message |
| Galaxy collection deletion | **No.** `ansible-galaxy collection` offers download, init, build, publish, install and list, and nothing else | Yes, installation fails |
| Cargo yank / unyank | **Yes**, `cargo yank` and `cargo yank --undo` (captured against cargo 1.70.0 and 1.98.1, `formats/cargo.md`) | **Yes.** A fresh resolution refuses a yanked version while an existing lockfile still downloads it, and `cargo install` refuses a crate whose every version is yanked |
| Cargo owners | **Yes**, `cargo owner --list`, `--add` and `--remove` (captured, as above) | **Yes.** The listing prints what the registry returns, and a refused mutation prints the registry's `errors[].detail` |

Two things follow that the earlier framing obscured.

**npm is not in the same category as the others.** Both its management operations have real client
commands, so both trigger and effect are oracle-testable. `npm.md` Q3 is therefore not a
"surface nobody can test" question at all; it is a semantics question about whether we enforce the
public registry's 72-hour-style restrictions or only our own authorization.

The one real caveat is a weak oracle rather than an absent one: the npm review found the client
exits 0 on unrouted `-rev` routes, so a server that implements unpublish not at all would pass a
naive exit-code assertion. That is why `npm.md` AC9 asserts the HTTP transcript rather than the
exit code. It is a testable operation that needs a carefully written test, which is a different
problem from an untestable one.

**Cargo is in npm's category, added 2026-09-26.** Yank, unyank and the owners commands are all
real client commands, so trigger and effect are both oracle-testable through `cargo` itself,
and a Cargo yank case is an ordinary conformance case. The remaining questions there were
semantic: which action a yank requires, and what an owners mutation means on a registry whose
authorization is central (`formats/cargo.md` answers both).

**PyPI and Galaxy share the actual gap, and it is only the trigger.** Neither ecosystem has a
client-side management command, so an endpoint we build is exercised only by our own tests. Note
what that does and does not mean: the endpoint is unverified by a third party, but everything it
*causes* is verified by pip or ansible-galaxy.

## What the decision actually is

Not "how do we govern an untestable surface". It is a **product-surface precedent** question, and
`pypi.md` Q1 already frames it correctly as such: what is a format handler's management surface,
decided before any management API or web UI is specced.

The three positions, restated now that the oracle question is out of the way:

**A registry-owned management endpoint per operation, starting now.** Hosted PEP 592 becomes real
and pip-testable. Operators get each ecosystem's own soft-delete instead of reaching for hard
deletion, which matters because yank exists precisely to avoid destroying a version that
someone's lockfile pins. The cost is that the first such endpoint sets the shape for all of them
before any management-API design exists, and it is verified by our tests alone.

**Per-format endpoints mirroring each ecosystem's conventions.** Familiar to users of each
ecosystem, and it is what Artifactory and Nexus effectively do. The cost is four specs answering
one question four ways, and each new management surface being a new deletion path
`storage-and-gc.md` must know about and a new grant `auth.md` must carry.

**Decline management surfaces in v1.** Nothing exists that our own tests alone must vouch for.
The cost is severe and worth stating plainly: a hosted repository could then only hard-delete or
do nothing. A hosted index that cannot yank cannot honestly claim PEP 592, and the conformance
matrix has to record hosted PEP 592 as partial. It also forces the question open again the first
time somebody publishes a credential and needs it gone.

## What still genuinely needs deciding, and what does not

**Does not:** whether these operations can be conformance-tested. Their effects can, in every
case in the table.

**Does:** whether v1 owns management endpoints at all; whether they are one cross-format surface
or per-format; and, if they exist, what verifies the trigger given no third-party client will.
The honest answer to the last part is our own integration tests plus the client-observable effect,
and saying so explicitly is better than implying a conformance case covers the trigger.

Three specs carried the format-local versions of this: `pypi.md` Q1 and Q3, `npm.md` Q3,
`ansible-collections.md` Q5. This document exists so the answer is given against what is true
rather than against the overstatement in the triage.

**Update, 2026-09-26.** Those questions were adopted under the owner's standing delegation, and
they converged on the first position above in its cross-format form: one registry-owned
management API, owed as `docs/internal/plans/foundation/management-api.md`, with a client's own
route served as a binding onto the same operation only where a client drives it (npm, and Cargo
per the table). The trigger of every operation with no client is verified by our integration
tests, and its effect by the real client, exactly as the section above states. The reasoning is
in each spec's resolved records; this analysis is not re-decided by them.
