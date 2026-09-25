---
status: in-progress
status_description: "Fourth round 2026-09-25 after gate reviews of auth, data-model and the interrupted-review reconciliation. 40 open across 11 specs. The organising unit is now the cluster rather than the tier: four groups of questions cannot be answered independently of each other, and one of them was found by two specs hitting the same wall from opposite directions."
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

## Round four: the live backlog (40)

Rounds one to three sorted questions by **what they block**, which is still how the tiers below
work. Round four adds a second axis, because three gate reviews in a row produced questions that
are not independent: answering one alone either wastes the answer or forces it to be revisited.
Those are recorded as **clusters** first, since the cluster is the unit the owner should actually
sit down with.

### Cluster 1: the request-to-coordinate gap (auth Q13, supply-chain-policy Q4)

**Two specs hit the same wall from opposite directions, in separate reviews, before a line of
code exists.** Both need an HTTP request mapped to the package coordinate being acted on, and
`format-handler-interface.md`'s pinned five methods do not provide it.

- `auth` Q13: the settled path-and-tag pattern scoping is recorded in Scope and AC19 and is
  **unimplementable as written**, because the pinned `Scope(r)` hands the central authorizer only
  a repository and an action. It can never see the path or tag a pattern must match.
- `supply-chain-policy` Q4: central policy evaluation needs the same mapping, and that spec's
  own recommendation is to sidestep the interface entirely by enforcing inside the shared
  resolution calls.

Answer these together, or the second answer will contradict the first. The cluster also bears on
whether the scheduled post-OCI interface re-open is the right remedy or arrives too late: two
independent consumers needing the same missing capability is the evidence that re-open was
supposed to wait for, and it has arrived early.

### Cluster 2: what ends a blob's life (storage-and-gc Q10, proxy-cache Q11, supply-chain-policy Q5)

Three specs each own a way content can stop being served, and the three answers compose into one
rule or into a contradiction.

- `storage-and-gc` Q10: is a pointer-targeted snapshot exempt from retention pruning, a fifth
  mark root? Without an exemption, promoting to `prod` or leaving a repository idle past the
  retention default prunes the snapshot, its blobs lose their only root, and live serving breaks
  with no user action.
- `proxy-cache` Q11: does eviction delete the blob, or only end its reference? If it deletes,
  eviction is a **second deletion path** and needs its own deletion-intent barrier.
- `supply-chain-policy` Q5: what happens to a condemned artifact? The quarantine option adds a
  mark root, and this question already reconciles two settled specs that currently disagree about
  the same real event.

`data-model.md` owns the mark-root set, and its gate review measured the blast radius: under Q10
option A exactly three places in that spec widen, and under B or C it stands as written. Q11 it
presupposes nothing about. That makes this cluster a bounded edit rather than an open risk, and
it is **the cheapest path to this project's first `planned` spec**, since `storage-and-gc` is
otherwise one answer away.

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

### Tier B: blocks foundation correctness (17)

Build steps 3 and 4: the shared model, CAS and GC, then OCI with the proxy layer.

**Cluster 2 in full** (`storage-and-gc` Q10, `proxy-cache` Q11, `supply-chain-policy` Q5) plus
`proxy-cache` Q12 (how an upstream security signal is detected for content nobody is requesting).

**Cluster 1 in full** (`auth` Q13, `supply-chain-policy` Q4). Promoted from where an
enforcement-topology question would normally sit, because it decides whether the pinned interface
changes, and the interface is step-3 and step-4 work.

**Cluster 3 in full** (`data-model` Q15, `oci` Q6).

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

### Tier C: belongs to work not yet started (18)

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

## Closed without an owner decision

- `charter` Q5 and `format-handler-interface` Q5, both asking whether `CLAUDE.md`'s
  "Both paths, always" rule should name the `generic` exception. Closed as a documentation
  correction: the owner had already made that decision, the constitution had simply not recorded
  it. Raised independently by two reviewers, which is what made it visible.
