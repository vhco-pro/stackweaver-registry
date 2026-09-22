---
status: in-progress
status_description: "Tier A cleared 2026-09-23 (11 answered, 44 to 33 open). Tier B is next and gates the foundation components."
description: "Triage of every open spec question into three tiers by what it blocks, so decisions are made in dependency order rather than all at once."
author: michielvha
goal: "Prevent the mistake of answering 44 questions before the interactions between them are understood, by naming which ones actually gate the next commit."
priority: "critical"
issue: ""
created: 2026-09-22
covers: []
---

# Plan: Open question triage

> **Tier A cleared 2026-09-23.** Eleven answered, 44 open questions down to 33. The harness
> core and the generic format are unblocked. Tier B is next.

Forty-four questions across thirteen specs. Answering them all now would repeat the mistake the
adversarial review just exposed: the first eighteen were answered before anyone traced how they
interacted, and roughly thirty of the current crop are the second-order consequences.

This document orders them by **what they block**, so each batch is answered with the previous
batch's consequences visible.

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

## Tier B: before the component ships (13)

Correctness of the foundation. None blocks the harness, all block their own component.

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

## Tier C: when that work begins (20)

**OCI** (build step 4): Q2 manifest reference graph in the shared model, Q3 non-interactive
docker login credential, Q4 recourse when a conformance case cannot pass, Q5 cross-repo mount as
an existence oracle, Q6 idle upload session lifetime.

`oci` Q2 is the exception worth watching: it needs a `data-model.md` change, so if the answer is
"the model gains a reference edge", that is cheaper decided during Tier B than after the schema
ships. Flagged rather than promoted, because OCI's needs are not yet concrete.

**Generic detail** (Phase 2, after its Tier A questions): Q4 listing shape, Q5 PUT over an
existing path, Q6 retention scoping unit, Q7 replay-match exemption.

**Catalogue** (before Tier 2 begins): Q3 is "Git-backed" one family or three, Q4 does the Tier 1
gate bind Tier 3, Q5 what proves a single-ecosystem family's client-reach claim.

`catalogue` Q3 is the most consequential question in Tier C: it is the only family collapsing
anything, so splitting it changes the headline figure from 33 ecosystems across ~31 protocols to
33 across 33, and with it the "families make breadth cheap" framing in five files.

**Charter and strategy** (answerable any time, blocking nothing): Q1 extend the implementation
phases past PyPI, Q2 what triggers the breadth gate's shrink outcome, Q3 how per-format cost is
measured so the N+1 comparison is not biased, Q6 does the charter need a web UI criterion.

`charter` Q3 is the highest-value question in this entire document and it is deliberately not in
Tier A, because the measurement cannot be designed until there is one format's cost to measure.
It stays Tier C with a hard obligation: **it must be answered before npm starts**, since npm is
the measurement's baseline and a baseline collected under an undefined procedure is not a
baseline.

`charter` Q4, when the proxy obligation attaches, is promoted to **Tier B**: it is a four-way
contradiction between the charter, `proxy-cache.md` and `oci.md` AC6, and it decides whether OCI
can meet its definition of done.

## Closed without an owner decision

- `charter` Q5 and `format-handler-interface` Q5, both asking whether `CLAUDE.md`'s
  "Both paths, always" rule should name the `generic` exception. Closed as a documentation
  correction: the owner had already made that decision, the constitution had simply not recorded
  it. Raised independently by two reviewers, which is what made it visible.
