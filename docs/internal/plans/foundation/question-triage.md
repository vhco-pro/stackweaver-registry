---
status: in-progress
status_description: "Round six 2026-09-28: 146 questions across 27 specs were adopted under the standing delegation while Fable was out of credit (cloud session and local Opus), none yet Fable-reviewed; listed with a recheck-first order (data retention, revisions of earlier decisions, the authorizer surface). The live queue is check-spec's fable_recheck list. Earlier: Fifth round 2026-09-25, amended 2026-09-26. 51 open across 14 specs, minus storage-and-gc Q10 and proxy-cache Q11 now answered. Cluster 5's framing was corrected: it is a management-surface precedent question, not a hole in the conformance gate, because the oracle can assert every one of those operations' effects even where no client triggers them."
description: "Triage of every open spec question into three tiers by what it blocks, so decisions are made in dependency order rather than all at once."
author: michielvha
goal: "Prevent the mistake of answering 44 questions before the interactions between them are understood, by naming which ones actually gate the next commit."
priority: "critical"
issue: ""
created: 2026-09-22
covers: []
---

# Plan: Open question triage

> **Second review round, 2026-09-23.** Five foundation specs re-reviewed after Tiers A and B
> were answered. **All five carried the same defect: the twenty-five decisions had been recorded
> as `Resolved:` sections and never propagated into Scope, Design, the acceptance criteria or the
> Test Plan.** Every reviewer found its own version of the half-applied pattern, which means the
> folding process was at fault rather than any single spec. Open questions went from 18 to 40 as
> the specs were brought into line with their own decisions and the interactions between them
> surfaced.
>
> The lesson is recorded in `docs/internal/tasks/lessons.md`: folding an answer means editing the
> spec body, and a `Resolved:` section is the record of a decision, not its application.
>
> **Tiers A and B cleared 2026-09-23.** Twenty-five answered, 44 open questions down to 18.
> The harness, generic, the shared model, GC and the proxy layer are all unblocked. Everything
> remaining is Tier C: it belongs to work that has not started.

Thirty-four questions across eight specs, as of 2026-09-24. Run `make check-spec` for the live
count; this document is for **what each question blocks**, which a counter cannot tell you.

Two things changed since the second round. `replication.md` and `supply-chain-policy.md` were
written and first-reviewed, adding thirteen questions between them - and neither spec appears
anywhere in the charter's build order, which is itself a finding rather than an oversight to
patch here (it is what `charter` Q1 asks). And the GC mark-root set grew from three to four,
which is why every "three roots" phrase below is now historical rather than current.

## How the tiers work

| Tier | Meaning | Answer when |
|---|---|---|
| **A** | Blocks the next code that gets written (harness core, then generic) | Now |
| **B** | Blocks the correctness of the foundation, but not its first commit | Before the component ships |
| **C** | Belongs to a format or feature not yet started | When that work begins |

A question's tier is about **dependency, not importance**. Several Tier C questions are more
consequential than any Tier A one; they simply cannot be answered usefully yet.

## Tier A: CLEARED 2026-09-23 (11)

All answered. Kept here as the record of what gated Phase 1 and Phase 2, and of one decision that
changed an earlier one.

Answers: token scope is repository plus action; repositories are private by default with
anonymous read opt-in per repository; the local admin is disabled once OIDC is configured unless
explicitly kept; the handler interface pins a minimal method set now and re-opens after OCI;
URLs are format-first with OCI carved out at `/v2/`; generic paths use a strict grammar rejecting
file-versus-prefix collisions; generic adopts the GitLab hybrid mapping; conformance runs in CI on
`main` pushes only; the model gains an `Upstream` entity; and opaque metadata hangs at repository,
package and version level.

**One answer narrowed an earlier one.** The generic mapping question was answered by looking at
what the field does rather than by preference: Artifactory Generic and Nexus Raw are
filesystem-style with the path as the whole identity, Gitea mandates `{package}/{version}/{file}`
and rejects nesting outright, and GitLab requires package and version while permitting a relative
path inside the filename. The GitLab hybrid was chosen, which means the earlier "arbitrarily deep
paths" resolution no longer holds as written. It has been amended in place rather than left to
contradict.

**One answer knowingly reintroduced a hazard.** Conformance now runs on `main` pushes only, so a
pull request can be green while conformance is broken - the same shape as the main-gated
integration suite that broke Stackweaver's `main` twice in one day. Accepted because the local
`make conformance` run is now a mandatory rule in `CLAUDE.md` rather than a suggestion, and the
workflow comment records that the fix, if it fails, is to move the job onto pull requests rather
than to weaken the rule.

| Spec | Question | Why it blocks |
|---|---|---|
| `conformance-harness` | Q1: when does CI run the conformance suite? | The CI job is part of the harness; cannot be built without the trigger |
| `format-handler-interface` | Q1: pin the interface method set now, or stay at responsibility level? | Two implementors build different things until this is settled |
| `format-handler-interface` | Q3: how do repository names appear in URLs, and where does OCI's root-anchored `/v2/` fit? | Route registration is the first thing the server does |
| `generic` | Q3: path grammar, and may a file and a directory prefix collide? | A one-way door; permissive now cannot be tightened later |
| `generic` | Q2: how does a pathed artifact map onto Package/Version/File? | Generic is the first writer against the shared model |
| `generic` | Q8: which credential does the generic conformance client present? | Was blocked on auth having no spec; now depends on auth Q2 and Q3 |
| `auth` | Q2: what is the scope unit for a registry token? | Every format's auth cases assert against scopes |
| `auth` | Q3: do anonymous pulls work, and per-repository? | `generic` AC2 presumes a visibility model this defines |
| `auth` | Q1: does the local admin survive once OIDC is configured? | Bootstrap path; affects the first-run experience being specced now |
| `data-model` | Q7: does the model need an `Upstream` entity? | Schema shape; cheaper now than after tables exist |
| `data-model` | Q8: where does package-level and repository-level mutable metadata live? | Schema shape, and three Tier 1 formats have nowhere to store state without it |

## Tier B: CLEARED 2026-09-23 (13)

All answered. The headline is that the GC correctness hole the review found is closed: a
**deletion-intent table** is the write barrier, because a grace period keyed on time since upload
cannot cover a dedup hit, a cross-repo mount or an `on_demand` arrival - none of which involve an
upload. The sweep marked from **three** roots at the time of that answer: published references,
cached references, and snapshots inside the retention window. It is now four - CAS-backed
metadata documents joined them when `data-model.md` settled large documents as blobs - and
`storage-and-gc.md` Q10 asks whether there is a fifth.

Other answers: touch-refreshed grace defaulting to hours; snapshots are deltas with periodic
checkpoints, capturing metadata as well as membership so a rollback is not a partial restore;
one snapshot per logical publish with cache fills excluded, keeping the snapshot sequence off the
hot proxy path; serve-stale-bounded-and-marked on revalidation failure; LRU eviction under a
per-repository quota, which also gives GC its cached-reference lifetime; single-flight coalescing
of concurrent misses; stream-and-verify with commit only on a digest match; the handler calling a
fetch-and-cache API on a proxied miss; write-triggered services deferred but prototyped against
Debian before the interface re-opens; and real-upstream conformance on a nightly schedule.

**One answer overrode a recommendation, correctly.** On upstream removal the owner rejected
keep-and-flag on security grounds. The refinement that followed distinguishes the cases: an
explicit security signal purges and alerts, while an author unpublish or a PyPI yank keeps
serving and records divergence - because yank means "not for new resolutions, existing pins keep
working", so purging would contradict the ecosystem's own semantics.

**One answer changed the build order.** The proxy layer moves from step 5 to step 4, built with
OCI rather than after it, resolving a four-way contradiction in which OCI's proxied path was
literally the retrofit the charter forbids.

**Storage and GC** - the component the charter names as how this project eats data:

- `storage-and-gc` Q4: what happens when a client exceeds the commit-to-reference grace period?
- `storage-and-gc` Q5: which snapshots are GC mark roots, and what prunes snapshots?
- `storage-and-gc` Q6: what mechanism implements the write barrier between reference creation and sweep deletion?
- `data-model` Q5: is a blob referenced only from a non-current snapshot live?

Q5 appears twice deliberately: two reviewers raised the same gap from opposite sides, and one
answer settles both.

**Snapshots** - paid for structurally, still undefined:

- `data-model` Q4: what counts as a "write" for snapshot creation?
- `data-model` Q6: what does a snapshot concretely capture, and how is its content set stored?

**Proxy and cache** - the differentiator:

- `proxy-cache` Q5: on failed revalidation, serve stale or fail?
- `proxy-cache` Q8: what makes a cached-only blob evictable?
- `proxy-cache` Q4: does the proxy coalesce concurrent misses on the same key?
- `proxy-cache` Q6: does a client wait for integrity verification, or receive streaming bytes?
- `proxy-cache` Q7: what happens when an upstream removes or replaces an "immutable" artifact?

**Interface**, once two formats exist to inform it:

- `format-handler-interface` Q2: on a proxied miss, does the proxy wrap the handler or the handler call fetch-and-cache?
- `format-handler-interface` Q4: do write-triggered shared services enter the interface now?

## Round five: the live backlog (50)

Rounds one to three sorted questions by **what they block**, which is still how the tiers below
work. Round four adds a second axis, because three gate reviews in a row produced questions that
are not independent: answering one alone either wastes the answer or forces it to be revisited.
Those are recorded as **clusters** first, since the cluster is the unit the owner should actually
sit down with.

### Cluster 1: the request-to-coordinate gap (auth Q13, supply-chain-policy Q4, format-handler-interface Q9)

**Two specs hit the same wall from opposite directions, in separate reviews, before a line of
code exists.** Both need an HTTP request mapped to the package coordinate being acted on, and
`format-handler-interface.md`'s pinned five methods do not provide it.

- `auth` Q13: the settled path-and-tag pattern scoping is recorded in Scope and AC19 and is
  **unimplementable as written**, because the pinned `Scope(r)` hands the central authorizer only
  a repository and an action. It can never see the path or tag a pattern must match.
- `supply-chain-policy` Q4: central policy evaluation needs the same mapping, and that spec's
  own recommendation is to sidestep the interface entirely by enforcing inside the shared
  resolution calls.

- `format-handler-interface` Q9, raised by that spec's own gate review after it verified the two
  above independently: whether the scheduled post-OCI re-open's evidence set expands to cover
  this gap. The decisive detail is that **none of the re-open's three named inputs - generic,
  OCI, and the Debian signed-index prototype - would have surfaced it.** The re-open was
  scheduled to be informed by real implementations, and the gap arrived from specs instead, ahead
  of any of them.

Answer these together, or the second answer will contradict the first. The interface owner has
taken no position beyond raising Q9, which is correct: whether an out-of-cycle amendment to the
pin is tolerated depends on how auth Q13 is answered, so Q13 leads and Q9 follows.

A near neighbour, deliberately not folded in: `ansible-collections` Q1 asks where an import-task
record lives, because a Galaxy publish is **asynchronous** (publish, receive a task id, poll) and
the shared model has no entity for an asynchronous operation. That is a data-model gap rather
than an interface one, so it is a different question. It belongs beside this cluster because it
is more evidence for the same verdict: the pin and the model were both fixed before the formats
that would stress them existed, and the re-open's named inputs would not have surfaced either.

### Cluster 2: what ends a blob's life - TWO OF THREE ANSWERED 2026-09-26 (supply-chain-policy Q5 remains)

Three specs each own a way content can stop being served. Two are settled and folded; the third
now has to compose with them rather than with an open field.

**`storage-and-gc` Q10: answered A.** A snapshot any `Pointer` targets is exempt from retention
pruning, with the checkpoint-and-delta chain that reconstructs it. **A fifth mark root.** Accepted
cost: retention no longer strictly bounds storage, since a forgotten environment pointer retains
its snapshot, its chain back to a checkpoint and every blob they reference indefinitely. Chosen
because the pin is visible and attributable to a named pointer, while auto-advancing would break
promotion's bit-identical promise with no deploy and no repoint, and halting pruning would let one
stale pointer hold a whole repository's reclamation hostage.

**`proxy-cache` Q11: answered A.** Eviction ends the cached reference and deletes nothing; the
deletion-intent sweep reclaims the blob. Eviction is **not** a second deletion path and inherits
the write barrier, grace period and shared-blob safety rather than reimplementing them. Accepted
cost: the quota accounts referenced bytes, so a repository returns to quota before the sweep frees
physical space.

Folded across all five specs that reference the root set on 2026-09-26. Two criteria turned out to
be wrong rather than merely incomplete and were rewritten: `proxy-cache` AC7 assumed eviction was a
deleter, and AC14 assumed stored-byte accounting. `storage-and-gc` AC17 and AC18 and `proxy-cache`
AC16 were added, AC18 being the one that matters most - a mark root nothing can release is a
storage leak with extra steps.

**Still open: `supply-chain-policy` Q5** - what happens to a condemned artifact. Its quarantine
option would now add a **sixth** mark root, and it still reconciles two settled specs that
disagree about the same real event: `proxy-cache` purges on an explicit upstream security signal
while the policy engine refuses and retains. Answering it no longer has to guess at the shape of
the root set.

`storage-and-gc` reached **zero open questions** on this fold and is the project's first gate
candidate.

### Cluster 3: OCI has no session on the wire (data-model Q15, oci Q6)

The settled push-session scoping keeps colliding with the fact that OCI's wire protocol has no
session. It forced the grace period to be re-scoped once already, and it has now hit twice more:

- `data-model` Q15: the in-flight digest-read membership check is scoped to a push session, but
  the blob's upload session is closed before the client's `HEAD` arrives, so the scoping has
  nothing to key on.
- `oci` Q6: how long an idle resumable upload session lives, which is the same boundary seen from
  the protocol side.

A third occurrence of one root cause is a sign the underlying model is wrong rather than its
applications, so these deserve one answer about what a session **is** here, not two local
patches.

### Cluster 4: the identity and scope vocabulary (auth Q13, Q16, Q17)

`auth` has three questions that together define what a grant can say, and each answer constrains
the others: what a pattern scope may range over (Q13, also in Cluster 1), what human grants exist
between "nothing" and "administer the registry" (Q16), and whether one token may carry scopes on
several repositories (Q17, where two passages of the spec currently read opposite ways).
`replication` Q6 (how a follower authenticates to a leader) is the same vocabulary extended to
instance identity, which `auth.md` does not define at all.

### Cluster 5: management surfaces and the precedent they set (pypi Q1 and Q3, npm Q3, ansible-collections Q5)

**This cluster was overstated here, and the correction matters more than the original claim.**
It was recorded as a hole in the project's central gate: the real client as test oracle having
nothing to say about management operations no client performs. That is wrong, and
`pypi.md` Q1 had already said why. A management operation has a **trigger** and an **effect**, and
the oracle's reach over them differs: no client yanks, but PEP 592 fully standardises what
installers do with a yanked file, so the harness provisions the state and a real `pip install`
asserts the behaviour. Every effect in this cluster is conformance-testable that way. Only the
trigger is not, and only for PyPI and Galaxy, since `npm unpublish` and `npm deprecate` are real
client commands.

Full context, grounded against the installed clients:
[`management-surfaces-and-the-oracle.md`](../../analysis/management-surfaces-and-the-oracle.md).

What remains is an ordinary and still-important decision: **what a format handler's management
surface is**, settled before any management API or web UI is specced.

- `pypi` Q1: does v1 expose a hosted yank surface? `twine` has no yank command, so the endpoint
  would be ours and exercised by our tests alone, while pip verifies everything it causes.
- `pypi` Q3: may a deleted filename be re-uploaded on the hosted path?
- `npm` Q3: does hosted unpublish enforce the public registry's restrictions, or only ours? This
  one is fully oracle-testable on both trigger and effect; it is a semantics question, not a
  surface question, and it belongs here only because its answer sets the same precedent.
- `ansible-collections` Q5: is version deletion served at all, and through what surface?
  `ansible-galaxy collection` has no delete subcommand.

They are one cluster because each answer sets the precedent for the others, and because every
management surface is also a deletion path `storage-and-gc.md` must know about (Cluster 2) and an
authorization surface `auth.md` must carry a grant for (Cluster 4). Left per format, four specs
will answer one question four ways.

The positions are a registry-owned endpoint per operation starting now, per-format endpoints
mirroring each ecosystem's conventions, or declining management surfaces in v1. The third has a
cost worth stating plainly: a hosted repository could then only hard-delete or do nothing, a
hosted index that cannot yank cannot honestly claim PEP 592, and the matrix must record hosted
PEP 592 as partial.

### Cluster 6: signature verification has consumers and no producer (supply-chain-policy Q6, ansible-collections Q3, pypi Q2)

`supply-chain-policy.md` names signature and attestation state as a policy input while explicitly
disclaiming ownership of verification, and no sibling owns it: `auth.md` authenticates clients,
not artifacts. That dangling dependency now has three consumers rather than one, each with a real
ecosystem mechanism behind it:

- `supply-chain-policy` Q6: who owns verification at all.
- `ansible-collections` Q3: what v1 does about collection signatures, where serving them has a
  client oracle and attaching them does not.
- `pypi` Q2: what the registry answers to an upload carrying PEP 740 attestations, where the PEP
  specifies verify-before-accept and we have nothing that verifies.

Q6 leads: the other two are applications of its answer. Note that each ecosystem's mechanism is
different (Galaxy signatures, PEP 740 attestations, Cosign in OCI referrers, npm provenance),
which is the argument `supply-chain-policy` Q6 already makes for a sibling spec rather than
growing verification inside the policy engine.

## Tiers: what each question blocks

### Tier A: blocks the next code (5)

Build steps 1 and 2 are the conformance harness core and the generic format.

| Spec | Question | Why it blocks |
|---|---|---|
| `conformance-harness` | Q4: is the case `setup` vocabulary closed, and how does it grow? | It **is** the Phase 1 case schema. Three siblings already need setup keys it does not have, and whether a consumer may add one decides whether the runner can validate a case before running it, which AC4 and AC5 assume |
| `generic` | Q5: what happens when a PUT targets a path that already holds an artifact? | A one-way door on the first format's write path |
| `generic` | Q4: what shape does listing take over arbitrarily deep paths? | Generic's read surface; its conformance cases assert against it |
| `generic` | Q6: what is the scoping unit of a retention policy? | Retention creates references, so it binds to the mark roots before GC ships |
| `generic` | Q7: does generic get a formal exemption from the replay-match definition-of-done item? | Generic has no upstream and no real client, so the definition of done either bends here or generic cannot be declared done |

`conformance-harness` Q4 is the one to answer first: it is the only Tier A question blocking the
step-1 code rather than the step-2 code, and its answer constrains how every later subsystem gets
conformance coverage at all.

### Tier B: blocks foundation correctness (21)

Build steps 3 and 4: the shared model, CAS and GC, then OCI with the proxy layer.

**Cluster 2's remainder** (`supply-chain-policy` Q5) plus `proxy-cache` Q12 (how an upstream
security signal is detected for content nobody is requesting). Q10 and Q11 were answered on
2026-09-26 and are folded.

**Cluster 1 in full** (`auth` Q13, `supply-chain-policy` Q4, `format-handler-interface` Q9).
Promoted from where an enforcement-topology question would normally sit, because it decides
whether the pinned interface changes, and the interface is step-3 and step-4 work.

**Cluster 3 in full** (`data-model` Q15, `oci` Q6).

**`write-triggered-services-prototype` Q1**: does the prototype cover asynchronous import tasks
as well as signed indexes? The decision that created the prototype named both classes as things
generic and OCI do not exercise, and Debian is a vehicle for only the first. Tier B because AC8
blocks every Tier 1 format on the re-open this prototype feeds, so the question sets how much
evidence a one-time six-format-blocking gate must have before it fires. It also bears on
`ansible-collections` Q1, which is the async class's independent evidence.

**Cluster 5 in full** (`pypi` Q1 and Q3, `npm` Q3, `ansible-collections` Q5), promoted here
despite living in format specs scheduled at steps 5 and beyond. The questions are per format; the
decision is not. Whether management surfaces exist at all, and whether they are one cross-format
API or per-format endpoints, determines a deletion path `storage-and-gc.md` must know about and a
grant `auth.md` must have, both of which are step-3 work. Deciding it per format as each one
lands is how four specs end up with four different answers to one question.

**Remaining proxy behaviour:** `proxy-cache` Q10 (what coalesced waiters receive while the single
in-flight fetch is unverified) and Q13 (is offline mode instance-wide or scoped per upstream).

**Remaining OCI:** Q5 (may a cross-repository blob mount reveal that a blob exists in a repository
the client cannot read, a security question wearing a protocol question's clothes), Q3 (what
credential a non-interactive `docker login` presents), Q4 (the recourse when a conformance case
cannot pass for reasons outside our control, which is a governance answer better made before it
is needed under pressure).

**Auth's remainder:** Q14 (whether plaintext credential acceptance needs an explicit opt-in flag
rather than documentation alone, the spec's only risky state guarded by docs), Q15 (where the
promised expiry-warning criterion lands, given no token-management surface is specced and
`oci` Q3 owns that surface), and Q16 and Q17 from Cluster 4.

### Tier C: belongs to work not yet started (24)

**Replication** (7) and **supply-chain policy** (4 remaining, after Q4 and Q5 are promoted to
Tier B) are both fully specced, first-reviewed, and **absent from the charter's build order**.
Cluster membership is a second axis rather than a retier, so `replication` Q6 appears in Cluster 4
and stays here: it cannot be usefully answered until replication has a place in the build order. That is still this tier's notable fact, and it is what `charter` Q1 asks.
Two of the remainder are architectural rather than incremental and cost more the later they land:

- `supply-chain-policy` Q3: where scanning gets its component inventory. It decides whether the
  pinned handler interface bends, or whether format knowledge gets a second home outside the
  handlers, so it is Cluster 1 adjacent and may be pulled forward by that cluster's answer.
- `supply-chain-policy` Q6: who owns signature and attestation verification, which this spec
  consumes and no spec produces.

The rest: `replication` Q1-Q7 (retention-gap recovery, follower writability, virtual
repositories, air-gapped proxied content, DR promotion and fencing, instance-to-instance auth,
archive trust root), and `supply-chain-policy` Q1 and Q2 (advisory feed authority,
retroactivity).

**The format specs' remainder** (6), all from the first reviews of 2026-09-25:

- `ansible-collections` Q1: where an import-task record lives, given the shared model has no
  entity for an asynchronous operation. Sits beside Cluster 1 and is evidence for the same
  verdict; see the note there.
- `ansible-collections` Q2: are namespaces a name prefix or first-class objects with ownership?
  Touches `auth` Q13 and Q16, so Cluster 4's answer constrains it.
- `ansible-collections` Q4: does galaxy.ansible.com join the preconfigured upstreams and the
  nightly real-upstream job? Amends a settled `proxy-cache` decision.
- `ansible-collections` Q3 and `pypi` Q2 belong to Cluster 6.
- `npm` Q2: what the registry answers to the audit requests `npm` sends during every default
  install. Worth reading even though it is Tier C, because every option is wrong in a different
  way: a 404 is merely odd, an empty stub is **our server making a false no-vulnerabilities
  claim**, and forwarding upstream **leaks private package names**. It is also the only question
  in the corpus where the default behaviour of a client we do not control puts words in our
  mouth.

**Catalogue** (before Tier 2 begins): Q3 is "Git-backed" one family or three, Q4 does the Tier 1
gate bind Tier 3, Q5 what proves a single-ecosystem family's client-reach claim.

`catalogue` Q3 remains the most consequential question in this tier: it is the only family
collapsing anything, so splitting it changes the headline figure from 33 ecosystems across ~31
protocols to 33 across 33, and with it the "families make breadth cheap" framing in five files.

**Charter and strategy**: Q1 extend the implementation phases past PyPI, Q2 what triggers the
breadth gate's shrink outcome, Q3 how per-format cost is measured, Q6 does the charter need a web
UI criterion.

`charter` Q1 keeps the promotion round three gave it: two whole subsystems exist with no place in
the build order, so it describes an existing gap rather than a future one.

`charter` Q3 remains the highest-value question in the document and is deliberately not Tier A,
because the measurement cannot be designed until there is one format's cost to measure. It keeps
its hard obligation: **it must be answered before npm starts** (build step 5), since npm is the
measurement's baseline and a baseline collected under an undefined procedure is not a baseline.

## Round six: adopted without the judgment tier (2026-09-27 to 2026-09-28)

Fable ran out of credit on 2026-09-27. From then on, the cloud session (model not recorded) and local
Opus passes kept the loop moving under the standing delegation, adopting each blocked question at
its own written recommendation. None of these adoptions has had a Fable review. Every spec below
carries `fable_recheck`, which `node scripts/check-spec.js` lists as the live queue and which keeps
the spec off `planned` until a Fable review clears it. That output is authoritative; this table is a
dated snapshot of the question-level subset, extracted from the resolved records' dates.

**160 questions across 30 specs** (146 at the first snapshot, plus rpm Q11 and arch Q13 from the format sweep and rubygems Q1 to Q12 at its authoring). A spec authored whole on Opus (most format specs from alpine
onwards) is marked for a full recheck, and its authoring-time adoptions are covered by that mark
even where the table below omits them.

### Recheck these first

These adoptions carry the most weight, because they touch data retention or revise an earlier
decision:

1. **Data retention.** GC correctness is the highest-stakes judgment in the corpus.
   - `proxy-cache.md` Q19 to Q22: the retained-revision keep-alive, the release of old blobs, current
     metadata never being evicted, and the declaring document.
   - `storage-and-gc.md` Q12: the commit-time claim check under the Pointer row lock.
   - `signing-service.md` Q19: the import direction between index and proxy.
2. **Revisions of earlier decisions.**
   - `supply-chain-policy.md` Q9 revised a delegation-adopted Q1.
   - `proxy-cache.md` Q17 extends the preconfigured upstreams a second time.
3. **What a signed virtual may merge.** RESOLVED on Fable 2026-09-30 by `signing-service.md` Q20.
   A signed virtual repository now admits a remote's documents by the anchor class its adoption
   ran under:
   - a signature anchor needs a `verified` verdict;
   - a metalink integrity anchor and TLS alone both admit;
   - a failed adoption is never admitted.

   The admission outcome is recorded per document. This supersedes arch Q13 and the composed half
   of signing-service Q17, so the official Arch mirrors and Fedora contribute again. It is
   reversible by the owner.
4. **The authorizer surface.**
   - `auth.md` Q23 to Q25: the descriptor object kind and the Conan exchange echo.
   - `management-api.md` Q13: a binding is never wider than its operation. It feeds auth AC10's
     review surface.

### Every adoption

| Spec | Questions adopted 2026-09-27 or 2026-09-28 |
|---|---|
| `formats/rubygems.md` | Q1-Q12 (rechecked on Fable 2026-10-08: eight confirmed, Q2, Q4, Q5 amended in fold, Q7 amended; spec planned) |
| `formats/alpine.md` | Q1-Q11 authored on Opus (rechecked on Fable 2026-10-01: nine confirmed, Q4, Q6 amended, Q7 superseded in part by Q12); Q12 and Q13 adopted on Fable; spec planned |
| `formats/cpan.md` | Q1-Q17 authored on Opus (rechecked on Fable 2026-10-01: nine confirmed, eight amended); Q18 adopted on Fable; spec planned |
| `formats/cran.md` | Q1-Q9 authored on Opus (rechecked on Fable 2026-10-01: all confirmed, four amended in fold); the delete-file retirement rule superseded by Q10, adopted on Fable; spec planned |
| `formats/conda.md` | Q1-Q10 authored on Opus (rechecked on Fable 2026-10-01: all confirmed, four amended); Q11 adopted on Fable; spec planned |
| `formats/puppet.md` | Q1-Q14 authored on Opus (rechecked on Fable 2026-10-08: all confirmed, five amended); spec planned |
| `formats/terraform.md` | Q1-Q8 authored on Opus (rechecked on Fable 2026-10-08: six confirmed, three with amended folds; Q4 and Q7 amended); spec planned |
| `formats/chef.md` | Q1-Q10 authored on Opus (rechecked on Fable 2026-10-08: all confirmed, four amended in fold); spec planned |
| `formats/julia.md` | Q1-Q8 authored on Opus (rechecked on Fable 2026-10-08: all confirmed, Q2, Q3, Q4 amended in fold); spec planned |
| `formats/luarocks.md` | Q1-Q14 authored on Opus (rechecked on Fable 2026-10-08: all confirmed, five amended); spec planned |
| `formats/generic.md` | Q14 adopted on Fable 2026-10-08 at its gate review (virtual listing); spec planned |
| `formats/npm.md` | Q2 (a 2026-09-26 delegation adoption) superseded by Q5, adopted on Fable 2026-10-08 at its gate review; spec planned |
| `formats/oci.md` | Q8 (an Opus adoption) rechecked on Fable 2026-10-08 at its gate review: confirmed; Q9 adopted on Fable; spec planned |
| `formats/rpm.md` | Q11 (rechecked on Fable 2026-10-01 with Q1-Q10: Q5, Q6, Q9, Q11 amended, the rest confirmed; Q12 adopted on Fable; spec planned) |
| `formats/arch.md` | Q13 (rechecked on Fable 2026-10-01: superseded by signing-service was-Q20; Q14 adopted on Fable; spec planned) |
| `formats/cargo.md` | Q7 (rechecked on Fable 2026-10-08: confirmed; the Fable-adopted Q2 and Q5 amended in fold; spec planned) |
| `formats/composer.md` | Q10, Q11 (rechecked on Fable 2026-10-08: Q10 confirmed, Q11 superseded by Q12 adopted on Fable; spec planned) |
| `formats/conan.md` | Q11 (rechecked on Fable 2026-10-08 with Q1-Q10: all confirmed, four amended; spec planned) |
| `formats/homebrew.md` | Q15 (rechecked on Fable 2026-10-08 with Q1-Q14: eleven confirmed, Q4, Q8, Q14, Q15 amended; spec planned) |
| `formats/debian.md` | Q10 (rechecked on Fable 2026-10-01 with Q1-Q9: all ten confirmed, six amended in fold; spec planned) |
| `formats/hackage.md` | Q16 (rechecked on Fable 2026-10-08 with Q1-Q15: eleven confirmed, five amended; Q17 adopted on Fable; spec planned) |
| `formats/opam.md` | Q16 (rechecked on Fable 2026-10-08 with Q1-Q15: all sixteen confirmed, Q2, Q4, Q5, Q7, Q9, Q11 amended; spec planned) |
| `formats/swift.md` | Q11 (rechecked on Fable 2026-10-08 with Q1-Q10: all confirmed, three amended in fold; spec planned) |
| `foundation/credential-management.md` | Q1, Q2, Q3, Q4, Q5, Q6, Q7 (rechecked on Fable 2026-10-01: Q1, Q2, Q6, Q7 confirmed, Q3, Q4, Q5 amended; spec planned) |
| `formats/openvsx.md` | Q19 (rechecked on Fable 2026-10-08 with Q1-Q18: all confirmed, six amended; Q20 adopted on Fable; spec planned) |
| `formats/hex.md` | Q9, Q10 (rechecked on Fable 2026-10-08: both confirmed, Q9 amended in cost; spec planned) |
| `formats/pub.md` | Q6 (rechecked on Fable 2026-10-08: confirmed, cost and fold amended); Q3 superseded by Q7 adopted on Fable; spec planned |
| `foundation/artifact-verification.md` | Q1, Q2, Q3, Q4, Q5, Q6, Q7, Q8, Q9, Q10, Q11 (rechecked on Fable 2026-10-01: Q4, Q5, Q6 confirmed, the other eight amended; spec planned) |
| `foundation/proxy-cache.md` | Q15, Q16, Q17, Q18, Q19, Q20, Q21, Q22 (rechecked on Fable 2026-09-30: six confirmed, Q16 and Q18 amended; spec planned; Q23 adopted on Fable 2026-10-01 in the second follow-up, reversing arch's per-format reading; Q24 adopted on Fable 2026-10-08 in the third follow-up) |
| `formats/vagrant.md` | Q13 (rechecked on Fable 2026-10-08 with Q1-Q12: eleven confirmed, Q4, Q12, Q13 amended; spec planned) |
| `foundation/async-operations.md` | Q1, Q2, Q3, Q4, Q5, Q6, Q7, Q8, Q9, Q10, Q11 (rechecked on Fable 2026-10-01: Q1, Q2, Q3, Q6, Q8, Q9, Q11 confirmed, Q4, Q5, Q7, Q10 amended; spec planned) |
| `foundation/format-handler-interface.md` | Q10, Q11 (rechecked on Fable 2026-10-01: both confirmed and amended; spec planned) |
| `foundation/supply-chain-policy.md` | Q9, Q10, Q11, Q12 (rechecked on Fable 2026-09-30: all four confirmed and amended; Q13 adopted on Fable; spec planned) |
| `foundation/deployment.md` | Q1, Q2, Q3, Q4, Q5, Q6, Q7, Q8, Q9, Q10, Q11, Q12, Q13 (rechecked on Fable 2026-10-01: six confirmed, Q3, Q4, Q5, Q6, Q7, Q8, Q10 amended; spec planned) |
| `foundation/observability.md` | Q1, Q2, Q3, Q4, Q5, Q6, Q7, Q8 (rechecked on Fable 2026-10-01: Q4 confirmed, the other seven confirmed and amended; spec planned; Q9 adopted on Fable 2026-10-01 in the follow-up) |
| `foundation/management-api.md` | Q1, Q2, Q3, Q4, Q5, Q6, Q7, Q8, Q9, Q10, Q11, Q12, Q13, Q14, Q15, Q16 (rechecked on Fable 2026-09-30: twelve confirmed, Q2, Q5, Q12, Q14 amended; spec planned; Q17 adopted on Fable 2026-10-01 in the follow-up; Q18 adopted on Fable 2026-10-01 in the second follow-up; Q19 adopted on Fable 2026-10-01 in the third follow-up; Q20 adopted on Fable 2026-10-08 in the fourth follow-up; Q21 adopted on Fable 2026-10-08 in the fifth follow-up, a security rule) |
| `foundation/auth.md` | Q23, Q24, Q25 (rechecked on Fable 2026-09-30: Q23 confirmed, Q24 and Q25 confirmed and amended; spec planned; Q26 adopted on Fable 2026-10-01 in the follow-up; Q27 adopted on Fable 2026-10-08 in the third follow-up, a security rule) |
| `foundation/web-ui.md` | Q1, Q2, Q3, Q4, Q5, Q6, Q7, Q8, Q9 (rechecked on Fable 2026-10-01: six confirmed, Q7, Q8, Q9 confirmed with folds amended; spec planned) |
| `foundation/repository-lifecycle.md` | Q1, Q2, Q3, Q4, Q5, Q6, Q7, Q8, Q9, Q10 (rechecked on Fable 2026-10-01: Q1, Q2, Q5, Q7, Q9 confirmed, Q6, Q10 confirmed with costs stated, Q3, Q4, Q8 amended; Q11 adopted on Fable; spec planned) |
| `foundation/upstream-adapters.md` | Q1, Q2, Q3, Q4, Q5, Q6, Q7, Q8, Q9 (rechecked on Fable 2026-10-01: Q1, Q4, Q6, Q7 confirmed, Q2, Q3, Q5, Q8, Q9 amended; Q10 adopted on Fable; spec planned; Q11 adopted on Fable 2026-10-08 in the second follow-up) |
| `foundation/signing-service.md` | Q1, Q2, Q3, Q4, Q5, Q6, Q7, Q8, Q9, Q10, Q11, Q12, Q13, Q14, Q15, Q16, Q17, Q18, Q19 (rechecked on Fable 2026-09-30: fifteen confirmed, Q8, Q16, Q19 amended, Q17's composed half superseded by Q20; Q20 and Q21 adopted on Fable; spec planned; Q22 adopted on Fable 2026-10-01 in the follow-up; Q23 adopted on Fable 2026-10-01 in the fourth follow-up; Q24 adopted on Fable 2026-10-08 in the sixth follow-up; Q25 adopted on Fable 2026-10-08 in the seventh follow-up, a security rule) |
| `foundation/conformance-harness.md` | Q7 adopted on Fable 2026-10-01 at its gate review (the exception list's digest lives in the corpus manifest); Q8 adopted on Fable 2026-10-08 (no clock in the harness); spec planned |
| `foundation/replication.md` | Q12 adopted on Fable 2026-10-01 at its gate review (who re-signs at takeover, and when); Q13 adopted on Fable in its follow-up (a sync's outcome lives on the link row); spec planned |
| `foundation/data-model.md` | no numbered question; three Opus design judgements (member-list freshness floor, the was-Q21 and was-Q22 folds) rechecked on Fable 2026-09-30: floor confirmed and amended, both folds confirmed; spec planned |
| `foundation/storage-and-gc.md` | Q11, Q12 (rechecked on Fable 2026-09-30: both confirmed and amended; spec planned) |

## Closed without an owner decision

- `charter` Q5 and `format-handler-interface` Q5, both asking whether `CLAUDE.md`'s
  "Both paths, always" rule should name the `generic` exception. Closed as a documentation
  correction: the owner had already made that decision, the constitution had simply not recorded
  it. Raised independently by two reviewers, which is what made it visible.
