---
status: draft
status_description: "Reviewed 2026-09-22: counts verified (33 = 2+8+10+13; 31 distinct families); three new open questions block planned (Git-backed family split, tier-gate vs charter scheduling, client-reach proof)."
description: "The full format catalogue: every ecosystem targeted, grouped by shared wire protocol into families, tiered by build order, with the count that defines the breadth moat."
author: michielvha
goal: "Fix the breadth target at 33 ecosystems, record which protocol families multiply client reach, and set the order and the gate that decide whether breadth is affordable."
priority: "critical"
issue: 11
created: 2026-09-22
covers:
  - "internal/format/**"
---

# Plan: Format catalogue

Breadth is the moat. This document is the target list, grouped so that breadth is affordable.

## Context

The charter's original scope was five formats and an explicit refusal to chase breadth, on the
grounds that a fifteen-front protocol war against Gitea and Harbor is how a focused project dies.
**That reasoning assumed human-cost economics and no longer holds here.**

The whole thesis of this project is that an executable conformance harness converts protocol work
from judgment into volume, and volume is what an agent fleet is for. If the harness generalises -
which is precisely what the PyPI-after-npm measurement exists to establish - then each additional
format costs a fraction of the first, and breadth stops being a war and starts being a moat.

Nobody else can follow. Gitea covers 23 formats and **cannot proxy an upstream**. Harbor proxies
beautifully and speaks **only OCI**. Pulp does both for a handful of formats and has no usable UI.
JFrog and Sonatype have breadth and charge for SSO. The unoccupied position is
**breadth × upstream caching × free SSO**, and it is unoccupied because for a human team it is
unaffordable.

## Where breadth multiplies, and where it does not

A caution first, because the temptation to inflate here is strong and this document is the place
that has to resist it: **the 33 ecosystems below are roughly 31 distinct protocol
implementations.** Shared-format families do not meaningfully shrink that number, because each
family already appears as a single row.

What families *do* multiply is the **client and distribution surface** reached per handler:

| One handler | Reaches | Multiplier |
|---|---|---|
| **Maven layout** | Maven, Gradle, SBT, Ivy, Leiningen - so Java, Kotlin, Scala, Clojure, Groovy | 5 build tools, 5 languages |
| **Debian archive** | Debian, Ubuntu, Mint, Pop!_OS, every apt derivative | the whole apt world |
| **RPM repodata** | RHEL, Fedora, SUSE, Rocky, Alma | 5 distributions |
| **Simple index** | pip, uv, Poetry, pdm | 4 Python tools |
| **npm** | npm, Yarn, pnpm, Bun | 4 JavaScript package managers |
| **OCI distribution** | Docker, Podman, ORAS, Helm-as-OCI, WASM artifacts | containers plus a growing set |
| **Git-backed** | Go modules, Swift packages, Julia General | 3 ecosystems, one resolution model |

So **33 ecosystems and ~31 implementations reach well over 50 distinct client tools and
distributions.** That is the honest version of the claim, and it is still the strongest position
available: nobody free offers this breadth *with* upstream caching.

The moat is not arithmetic. It is that the conformance harness makes each of those ~31
implementations cheap enough to build and, crucially, cheap enough to *keep working* as each
ecosystem changes its protocol on its own schedule. Competitors are not blocked by the count;
they are blocked by the treadmill.

Family boundaries are asserted here and **must be proven by conformance**, not assumed. Where a
family member diverges (Gradle's module metadata alongside Maven POMs, `uv` versus `pip` on index
semantics), the divergence gets its own cases and, if it is large enough, its own handler. A
family that turns out not to be a family is a finding worth recording, not a failure.

## The catalogue

### Tier 0 - proving the harness

| Ecosystem | Family | Why here |
|---|---|---|
| Generic / raw | - | Trivial protocol. Proves harness, CAS, auth and CI with nothing else in the way. |
| OCI | OCI | Official conformance suite: a pass/fail gate written by the standards body. |

### Tier 1 - the formats that carry adoption

These are what teams actually deploy a registry for, and between them they establish every hard
mechanism: mutable metadata, TTL revalidation, negative caching, signed indexes.

| Ecosystem | Family | Notes |
|---|---|---|
| npm | npm | Most-wanted upstream cache. Mutable packument drives the TTL design. |
| PyPI | Simple index | The generalisation measurement against npm. |
| Maven | Maven layout | Unlocks the entire JVM world in one handler. |
| Go modules | Git-backed | Module proxy plus checksum-db semantics. |
| NuGet | NuGet | .NET, and a large enterprise install base. |
| Helm | Helm + OCI | Classic `index.yaml` alongside the OCI path. |
| Debian (apt) | Debian archive | First format requiring **GPG-signed indexes**; clients hard-refuse without them. |
| RPM (yum/dnf) | RPM repodata | Same signing requirement, different index shape. |

### Tier 2 - broad language coverage

| Ecosystem | Family |
|---|---|
| Cargo (Rust) | Cargo sparse index |
| RubyGems | RubyGems compact index |
| Composer (PHP) | Composer |
| Conda | Conda |
| Alpine (apk) | Alpine |
| Conan (C/C++) | Conan |
| Swift packages | Git-backed |
| Pub (Dart/Flutter) | Pub |
| Hex (Elixir/Erlang) | Hex |
| CRAN (R) | CRAN |

### Tier 3 - the long tail that completes the claim

Individually low-value, collectively the difference between "many formats" and "your language is
supported".

| Ecosystem | Family |
|---|---|
| Ansible collections | Galaxy v3 |
| Terraform / OpenTofu modules and providers | Terraform registry |
| Vagrant boxes | Vagrant |
| Chef cookbooks | Chef |
| Puppet modules | Puppet Forge |
| LuaRocks | LuaRocks |
| Hackage (Haskell) | Hackage |
| CPAN (Perl) | CPAN |
| opam (OCaml) | opam |
| Julia General | Git-backed |
| Homebrew bottles | Bottles |
| Open VSX (editor extensions) | Open VSX |
| Arch (pacman) | Arch |

**Headline count at full delivery: 33 ecosystems, ~31 protocol implementations, 50+ client tools
and distributions reached.** For comparison, Gitea covers 23 ecosystems with no proxying at all,
and Harbor covers 1 with excellent proxying.

Tier totals: 2 + 8 + 10 + 13 = 33. Keep this line updated when a row is added or removed; it is
the arithmetic check on every number quoted above, and an earlier draft of this document claimed
"~30 ecosystems across ~15 protocols" purely because nobody had added the rows up.

## Two formats deserve specific comment

**Terraform/OpenTofu** is in Tier 3 here only because Stackweaver already implements the
Terraform Registry v1 protocol for modules and providers, with publishing, GPG signing and
protocol-level authorization. That is a working implementation to port rather than a protocol to
learn, so its real cost is far below its tier position. Promote it the moment a shared brand story
makes it worth doing.

**Ansible collections** is the one ecosystem where hosting *alone* is differentiating: Gitea does
not support it, Forgejo's support is an unmerged proposal, and the only free options are heavy
Pulp deployments. Its tier position understates its value.

## Acceptance Criteria

- [ ] AC1: Every ecosystem in the catalogue has a spec under `docs/internal/plans/formats/`
      before any of its code is written.
- [ ] AC2: Each family's shared-protocol claim is proven by conformance cases from **at least two
      different member ecosystems** passing against one handler, or the family is split.
- [ ] AC3: The conformance matrix reports per **ecosystem**, not per family, so the advertised
      count is never larger than the tested count.
- [ ] AC4: No ecosystem is advertised as supported until both its hosted and proxied paths pass.
- [ ] AC5: Tier 1 is complete before any Tier 2 work begins, and the Phase 3 continue-or-shrink
      decision is recorded in the experiment log with the Tier 1 per-format cost trend as its
      evidence.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | ci | structure check in `make verify`: every `internal/format/<name>` maps to `docs/internal/plans/formats/<name>.md` |
| AC2 | conformance | `conformance/<family>/<ecosystem>_test.go` |
| AC3 | ci | matrix generation, `docs/internal/conformance/matrix.md` |
| AC4 | conformance | `conformance/<format>/hosted_test.go`, `proxied_test.go` |
| AC5 | manual | `docs/internal/tasks/experiment-log.md` |

## Implementation Phases

### Phase 1: Tier 0
Generic and OCI, proving the harness.

### Phase 2: Tier 1
The eight adoption formats, in the order listed. Signed-index formats (Debian, RPM) last within
the tier, since they add GPG signing to the shared layers.

### Phase 3: Re-evaluate
Read the experiment log. If per-format cost is falling, continue to Tier 2. If it is flat, the
breadth bet is wrong and the catalogue shrinks to what is already delivered. **This gate is real,
not ceremonial.**

### Phase 4: Tiers 2 and 3
Fan out, one spec and one handler per ecosystem.

## Open Questions

Three questions raised by the 2026-09-22 review await the owner. All earlier questions were
answered and folded into the catalogue and family sections above; their decisions are kept
below as Resolved entries, so the reasoning survives the next time someone asks why it was
done this way.

### Q3: Is "Git-backed" one family, or three protocols wearing one label?

Go modules resolve through the GOPROXY protocol (a plain HTTP API: `/@v/list`, `.info`,
`.mod`, `.zip`, `/@latest`) plus the checksum-database transparency log - no git anywhere on
the wire, and this document's own Tier 1 row says "Module proxy plus checksum-db semantics".
Swift package registries implement the Swift Package Registry service API (SE-0292, a JSON
API with versioned media types). Julia's Pkg resolves via Pkg servers or a git-repo registry
of TOML files. Three genuinely different wire protocols share only a resolution *model*.
AC2 requires a family be proven by two member ecosystems passing against one handler, which
this family would almost certainly fail - and it is the only family whose collapse produces
the ~31 figure quoted in `README.md`, `CLAUDE.md`, the charter and the conformance matrix.

**Recommendation:** B, split now - the divergence is established by published protocol specs,
not something conformance needs to discover, and correcting the headline number before it is
public is cheaper than after.

| Option | You get | It costs |
|---|---|---|
| **A. Keep the family; let AC2 adjudicate** | The ~31 headline stands for now; no cross-file edits | The count rests on a family whose members demonstrably speak three different wire protocols, so AC2 likely forces the same edits later as a public correction |
| **B. Split into three single-ecosystem families now** | A count that survives AC2; the family table stops claiming a wire-level multiplier that is only model-deep | ~31 becomes ~33 in four other files, and the family multiplier table loses a row |

**Why this is yours:** ~31 is the advertised headline; changing it is a positioning call,
not a measurement.

### Q4: Does the Tier 1 gate bind Tier 3, and how do the two named early builds get scheduled without breaking it?

AC5 forbids Tier 2 work before Tier 1 completes but says nothing about Tier 3, so as written
a Tier 3 format may be built at any time. Meanwhile the charter's Phase 4 schedules Ansible
collections (Tier 3 here) immediately after PyPI and before the Tier 1 remainder, its spec
already exists, and this document invites promoting Terraform/OpenTofu "the moment a shared
brand story makes it worth doing". Closing the AC5 loophole to cover Tier 3 would contradict
the charter; leaving it open makes the tier gate ceremonial for a third of the catalogue.

**Recommendation:** A - promote Ansible collections into Tier 1 (its own section already
argues its value is understated), give Terraform an explicit named promotion trigger, and
extend AC5 to "any Tier 2 or Tier 3 work".

| Option | You get | It costs |
|---|---|---|
| **A. Promote Ansible to Tier 1; extend AC5 to Tiers 2 and 3** | Gate and charter agree; the loophole closes | Tier 1 grows to 9 and the "formats that carry adoption" story absorbs a niche format |
| **B. Keep tiers; add an explicit promotion rule recorded in this doc** | Tiers stay a pure cost ordering | The gate has a documented bypass and AC5 needs wording that tolerates it |
| **C. Strict gate; charter drops Ansible from Phase 4** | The simplest gate | Contradicts the charter's settled sequencing and delays the one format with no good free alternative |

**Why this is yours:** sequencing the differentiating niche format against the adoption
formats is a product call, not a measurement.

### Q5: What proves a family's client-reach claim when the family has only one ecosystem row?

AC2 demands two member *ecosystems*, but six of the multiplier families (npm, Simple index,
Maven layout, Debian archive, RPM repodata, OCI) have exactly one ecosystem row each, so AC2
can never bind them - while the claims that actually sell the multiplier (Gradle, uv, Yarn,
Podman, apt derivatives) are proven by nothing. The conformance matrix doc meanwhile says a
Maven-layout handler "earns its Gradle row" from a real Gradle client, which treats Gradle as
a row - contradicting this catalogue, where Gradle is client reach and only Maven counts
toward the 33.

**Recommendation:** A - add a client-reach clause to AC2 and settle that such evidence
appears in the matrix's Client column under the ecosystem row, never as a new ecosystem row.

| Option | You get | It costs |
|---|---|---|
| **A. AC2 gains a client-reach clause; clients appear under the ecosystem row** | The 50+ figure becomes testable; count integrity extends to the multiplier table; the matrix wording gets a single definition to follow | Real conformance work per named client (Gradle, SBT, Ivy, Leiningen, uv, Poetry, pdm, Yarn, pnpm, Bun, Podman, ...) |
| **B. AC2 stays ecosystem-only; the multiplier table is illustrative** | No extra suite cost | The 50+ headline ships untested, the exact failure mode AC3 exists to prevent, and the matrix's Gradle-row sentence still contradicts this doc |

**Why this is yours:** it sets the conformance budget for a marketing claim.

### Resolved: family divergence (was Q1)

**Settled 2026-09-22: separate handlers over a shared library.** When a family member diverges
materially, it gets its own handler and the genuinely shared behaviour moves into a library.

Accepted cost: real duplication between close relatives. The alternative is worse: conditionals
accumulate silently until the handler is the union of every member's edge cases and nobody can
change it safely, which is the maintenance trap this project exists to avoid.

### Resolved: advertised count (was Q2)

**Settled 2026-09-22: advertise ecosystems (33), publish the family mapping openly, and let
the conformance matrix be the proof.** Transparency converts a padding accusation into a design
story.

Accepted cost: the number still has to be defended in comparison threads. The defence is that the
mapping is public and the matrix reports per ecosystem, so the advertised count can never exceed
the tested count.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-22 | afbb4e4 | adversarial + constitution + count integrity | Arithmetic verified (33 = 2+8+10+13; exactly 31 distinct families; 50+ reach plausible at ~54); fixed Clojars misclassification, missing npm multiplier row, Tier 1 order vs Phase 2, AC1/AC5 wording; raised Q3/Q4/Q5; stays draft. |
