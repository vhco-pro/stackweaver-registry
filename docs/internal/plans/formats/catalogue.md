---
status: draft
status_description: "Catalogue drafted; tiering is settled in principle, the family boundaries need a review pass against real client behaviour."
description: "The full format catalogue: every ecosystem targeted, grouped by shared wire protocol into families, tiered by build order, with the count that defines the breadth moat."
author: michielvha
goal: "Make breadth tractable by showing that ~30 named ecosystems collapse into ~15 distinct protocols, and by fixing the order in which they get built."
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

Nobody else can follow. Gitea covers 24 formats and **cannot proxy an upstream**. Harbor proxies
beautifully and speaks **only OCI**. Pulp does both for a handful of formats and has no usable UI.
JFrog and Sonatype have breadth and charge for SSO. The unoccupied position is
**breadth × upstream caching × free SSO**, and it is unoccupied because for a human team it is
unaffordable.

## The insight that makes breadth cheap

The naive count is intimidating and wrong. **Roughly 30 named ecosystems collapse into roughly 15
distinct wire protocols**, because whole language communities share a repository format:

| Family | Serves | One handler covers |
|---|---|---|
| **Maven layout** | Java, Kotlin, Scala, Clojure, Groovy | Maven, Gradle, SBT, Ivy, Leiningen, Clojars |
| **OCI distribution** | Containers and, increasingly, everything else | Docker/Podman images, Helm OCI, WASM, arbitrary OCI artifacts |
| **Simple index (PEP 503-alike)** | Python | pip, uv, Poetry, pdm all speak the same index |
| **Git-backed** | Go, Swift, Crystal | Module proxy and package registries that resolve to VCS refs |
| **Debian archive** | Debian, Ubuntu, and derivatives | `apt` for every downstream distro |
| **RPM/yum repodata** | RHEL, Fedora, SUSE, Rocky, Alma | `dnf`/`yum`/`zypper` |

So the engineering unit is the **family**, not the ecosystem, and the marketing unit is the
ecosystem. That asymmetry is the moat: the catalogue below advertises ~30 supported ecosystems
off ~15 implementations.

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
| Debian (apt) | Debian archive | First format requiring **GPG-signed indexes**; clients hard-refuse without them. |
| RPM (yum/dnf) | RPM repodata | Same signing requirement, different index shape. |
| Helm | Helm + OCI | Classic `index.yaml` alongside the OCI path. |

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

**Headline count at full delivery: ~31 ecosystems across ~15 protocol implementations.** For
comparison, Gitea covers 24 with no proxying, and Harbor covers 1 with proxying.

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
- [ ] AC5: Tier 1 is complete before any Tier 2 work begins, and the experiment log records the
      per-format cost trend across Tier 1 so the breadth bet is re-evaluated on evidence.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | manual | spec review, one per ecosystem |
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

### Q1: Does an unproven family get one handler or several?

The catalogue asserts that Gradle and Maven, or `pip` and `uv`, are the same protocol. If they
turn out to diverge materially, the choice is one handler with conditionals or separate handlers
sharing a library.

**Recommendation:** separate handlers over a shared library. Conditionals accumulate silently and
turn one handler into the union of every member's quirks, which is precisely the maintenance trap
this project exists to avoid.

**Why this is yours:** it trades duplication against coupling in the component the whole breadth
bet rests on.

### Q2: Is the advertised number ecosystems or protocols?

Claiming "31 formats" off 15 implementations is accurate but invites the accusation of padding,
especially from maintainers of the projects being compared.

**Recommendation:** advertise ecosystems, publish the family mapping openly, and let the
conformance matrix be the proof. Transparency converts a padding accusation into a design story.

**Why this is yours:** it is a positioning and credibility call.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
