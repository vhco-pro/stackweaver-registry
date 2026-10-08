---
status: planned
status_description: "Planned by the Fable gate review of 2026-10-08 at 6a0b78d: every tier, family, client and capability claim verified against all 33 format specs, now all planned, and every sibling citation at HEAD. Tier tables, totals (2 + 9 + 10 + 12 = 33, 33 families) and the verification none list hold; Hex is still the only Virtual: unsupported. Corrected: the named-clients table was an accident of which reconciliation items named this file and missed Conda, CPAN, CRAN, Hackage, Puppet, RubyGems and OCI's brew, so it is now the complete inventory with the counting rule written out (reach the specs name about 74, not 60; the floor stays 52); AC4 and AC3 honour the constitution's generic proxy exemption and bind the figures advertised as supported rather than the labelled target; Phase 0's authoring half recorded as done. Q7 adopted under the standing delegation (gem and bundle as two clients), owner-facing. Zero open questions, eight criteria each with a Test Plan row; awaits /tasks. Earlier: reconciled 2026-09-28 at b31b889 (named-clients table, AC7 virtual and verification columns, AC8 binding-table check); folded 2026-09-26 (Git-backed split, Ansible promoted to Tier 1, client reach per client, the Terraform trigger)."
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
that has to resist it: **the 33 ecosystems below are 33 distinct protocol implementations.** No
family collapses two ecosystem rows into one implementation. Every family appears as a single
row, and the one label that used to group three rows, "Git-backed", turned out on inspection to
name a resolution model rather than a wire protocol, so it was split on 2026-09-26 (resolved
below). Until then this document said "roughly 31".

What families *do* multiply is the **client and distribution surface** reached per handler:

| One handler | Reaches | Multiplier |
|---|---|---|
| **Maven layout** | Maven, Gradle, SBT, Ivy, Leiningen - so Java, Kotlin, Scala, Clojure, Groovy | 5 build tools, 5 languages |
| **Debian archive** | apt on Debian, Ubuntu, Mint and Pop!_OS | 4 named distributions; other apt derivatives are likely served but are not counted until tested |
| **RPM repodata** | RHEL, Fedora, SUSE, Rocky, Alma | 5 distributions |
| **Simple index** | pip, uv, Poetry, pdm | 4 Python tools |
| **npm** | npm, Yarn, pnpm, Bun | 4 JavaScript package managers |
| **OCI distribution** | Docker, Podman, ORAS, Helm-as-OCI | 4 named clients; WASM and other artifact types ride the same protocol through these clients and are not counted separately |

Every entry in the "Reaches" column is a **claim to be proven by that real client**, not an
illustration (AC2). Counted once each, with the six multiplier handlers' clients plus one client
for each of the other 27 ecosystems and the `helm` CLI counted once although it appears under
both Helm and OCI, the named reach is about 52; the clients the format specs add below lift the
figure the specs name to about 74. So **33 ecosystems across 33 implementations reach 50+ named
client tools and distributions**, and the advertised figure is never larger than the number the
conformance matrix shows passing (AC3). That is the honest version of the claim, and it is still
the strongest position available: nobody free offers this breadth *with* upstream caching.

The counting rule, stated once so the figure cannot drift by re-reading: a **client tool** is
counted once however many ecosystems or versions it appears under (`helm`, `brew`, the two
generations of every pinned client); a **distribution** is counted once (Ubuntu, Manjaro,
OpenVox's agent line); a tool running on a counted distribution is not counted again (dnf on
Rocky is Rocky's entry, not a second one); and a wrapper that invokes a counted tool is not a
second client (`flutter pub` runs `dart pub`, `pub.md`). The figure is what the matrix's Client
column would show if every named client passed, which is why it is never advertised.

### Named clients the format specs add

The multiplier table is the floor, not the inventory. Each format spec names the clients it
captured traffic from and proves, and every one of them appears in the matrix's Client column
under its ecosystem's row, never as a row of its own (AC2). This table is the complete inventory
of what the 33 specs name beyond the floor, read from each spec's "Conformance, the clients and
the corpus" section at HEAD on 2026-10-08 (an earlier version of it listed only the specs whose
reconciliation items happened to name this file, and undercounted by fourteen). The ones that add
to the count above, or qualify an entry in the table, as the specs record them:

| Ecosystem | Clients the spec names | What it changes here |
|---|---|---|
| Maven | Maven, Gradle, sbt, Leiningen captured; **Apache Ivy was not run** | Ivy stays in the table as a claim `maven.md` AC19 makes prove-or-strike: it passes the same cases before Maven is advertised, or it is struck from the table and the reach figure falls by one |
| RPM | eight pinned clients: dnf5, dnf 4 and zypper across the five distributions | SUSE is proven by the SLES 15 SP7 BCI image, not by openSUSE (`rpm.md`); the count stays at five distributions, the matrix lists all eight |
| Debian | apt on Debian, Ubuntu, Linux Mint 22 and Pop!_OS 24.04 | Mint's and Pop!_OS's apt are Ubuntu's build; Pop!_OS has no official image, so its client image is built from the pinned `ubuntu:24.04` with its repository configured (`debian.md` AC25); both stay counted |
| OCI | Docker, Podman, ORAS, `helm pull oci://` and **Homebrew 7.0.6** under a `/v2/`-bearing `HOMEBREW_ARTIFACT_DOMAIN` | brew is a fifth client of the OCI row on both paths (`oci.md`, its resolved brew-client decision, was Q9, and AC13); it is the Homebrew row's one client, so it appears under two rows and counts once, as `helm` does (+0) |
| Terraform / OpenTofu | `terraform` and `tofu`, two releases each | OpenTofu is a distinct client and counts as one (+1) |
| Chef | Berkshelf, chef-cli (Policyfile), knife | three clients under one row (+2) |
| Open VSX | VS Code, VSCodium, code-server, `ovsx` | four clients under one row (+3) |
| Arch | pacman on Arch Linux and on Manjaro | Manjaro counts once proven (+1) |
| Hex | `mix`, `rebar3` | two clients under one row (+1) |
| RubyGems | `gem`, `bundle`, three generations each | two clients under one row, separate resolvers on separate routes (the resolved gem-and-bundle decision below, was Q7) (+1) |
| Conda | conda, mamba, micromamba, pixi, rattler-build (`conda.md`, "Conformance, the five clients and the corpus") | five clients under one row; rattler-build drives the publish cases only (+4) |
| CRAN | base R, pak, renv (`cran.md`, "the three clients") | three clients under one row (+2) |
| CPAN | cpanm, cpm, CPAN.pm, Carton, cpan-upload (`cpan.md`, "Nine clients as oracles", two generations of the first four) | five tools under one row (+4) |
| Hackage | cabal-install, Stack, two lines each (`hackage.md`) | two clients under one row (+1) |
| Puppet | the `puppet module` tool on Puppet 7 and on OpenVox 8, and r10k (`puppet.md`, "the three clients") | r10k is a second tool and OpenVox's agent a second distribution of the first (+2) |

That is twenty-two more than the one-per-ecosystem floor, the column's increments summed
(1 + 2 + 3 + 1 + 1 + 1 + 4 + 2 + 4 + 1 + 2), hence "about 74". The other sixteen ecosystems
outside the multiplier table name exactly one client each, on one or more generations: generic
(`curl`), Ansible (`ansible-galaxy`), Go (`go`), NuGet (`dotnet`), Helm (`helm`, with `cm-push`
as its plugin), Cargo, Composer, Alpine (`apk`), Conan (Conan 1 and 2 are one tool), Swift
(SwiftPM), Pub (`dart pub`), Vagrant, LuaRocks, opam, Julia (Pkg) and Homebrew (`brew`). Neither
figure is advertised: `README.md` carries only what the matrix shows passing on both paths (AC3).

### What the matrix carries per ecosystem beyond pass or fail

Two properties vary per ecosystem and used to be assumed uniform. Both are rendered in the
conformance matrix beside each ecosystem row, from mechanical sources, so this document never
has to assert them by hand:

- **Virtual aggregation is a per-format capability.** Every handler declares `Virtual` as
  `supported` or `unsupported` in `Capabilities()` (`format-handler-interface.md` AC13,
  `repository-lifecycle.md` AC4), and the matrix's virtual column renders `unsupported` as
  exempt, citing the format's spec, never as passing (`conformance-harness.md` AC20). **Hex is
  the first ecosystem to declare it unsupported**, and with all 33 specs planned on 2026-10-08
  it is the only one: every other spec declares `Virtual: supported` (`pub.md` weighed declaring
  it unsupported and chose a per-request first-member-wins merge instead). Its signed payload
  names exactly one repository and every unmodified client checks that name, so a virtual
  repository has no name it could sign under (`hex.md`, its resolved repository-name decision,
  was Q1). Conda shows the opposite, that virtual works wherever nothing is signed with the
  repository name, which is why the capability is per format rather than a rule. No row here
  promises virtual aggregation; the column does.
- **Verification is per ecosystem too.** `artifact-verification.md` AC24 gives the matrix a
  verification column: a format whose spec asked for a verification entry shows a passing hosted
  and a passing proxied verification case, and a format whose spec asked for nothing shows
  `none` with its spec cited. At HEAD on 2026-10-08 that spec's table of what each format asks
  lists cargo, chef, composer, cran, debian, go-modules, opam and pub as asking nothing, conan
  as nothing in v1, hex as nothing on artifacts (its proxied payload check is an integrity call,
  not an artifact verdict), and generic cites that spec not at all; Helm asks for an entry (its
  `.prov` as an optional verdict source), so it is not on the list. A format asking for an
  entry without both cases fails the matrix build, so the column cannot overstate.

One more per-ecosystem obligation lives outside the matrix: `supply-chain-policy.md`'s table
"When a refusal binds, per format" must list every ecosystem row of this document exactly once,
because `deployment.md` generates its operator page from it (that spec's AC20). The structure
check that parses the tier tables for AC6 is the same parser that check runs against, so adding,
removing or promoting a row here fails `make verify` until the binding table follows (AC8).

The moat is not arithmetic. It is that the conformance harness makes each of those 33
implementations cheap enough to build and, crucially, cheap enough to *keep working* as each
ecosystem changes its protocol on its own schedule. Competitors are not blocked by the count;
they are blocked by the treadmill.

Family boundaries are asserted here and **must be proven by conformance**, not assumed. Where a
family member diverges (Gradle's module metadata alongside Maven POMs, `uv` versus `pip` on index
semantics), the divergence gets its own cases and, if it is large enough, its own handler. A
family that turns out not to be a family is a finding worth recording, not a failure; "Git-backed"
is the first such finding.

## The catalogue

**Every ecosystem below is specced now; only building is gated.** On 2026-09-26 the owner
directed that all 33 be specced up front, Tiers 2 and 3 included, in the same spec loop as the
foundation (`project-charter.md`, "Speccing is not gated; building is"). The tiers order the
**build**, and the Phase 3 gate governs whether Tiers 2 and 3 are built at all. A spec written
before the gate is re-reviewed against the foundation as it then stands before its handler
starts, because `/implement` refuses a spec whose last review is stale relative to `main`.

A tier position changes only by **promotion**: the row moves into the higher tier's table in
this document, the totals line below is updated, and the promotion is recorded as a Resolved
entry with its reason. There is no exception clause and no out-of-order build, so the tier tables
are always the single source of build order.

### Tier 0 - proving the harness

| Ecosystem | Family | Why here |
|---|---|---|
| Generic / raw | - | Trivial protocol. Proves harness, CAS, auth and CI with nothing else in the way. |
| OCI | OCI | Official conformance suite: a pass/fail gate written by the standards body. |

### Tier 1 - the formats that carry adoption

These are what teams actually deploy a registry for, and between them they establish every hard
mechanism: mutable metadata, TTL revalidation, negative caching, signed indexes, and a
client-visible asynchronous operation. One row is here for market position rather than install
volume: Ansible collections, promoted on 2026-09-26 because hosting it alone is differentiating.

| Ecosystem | Family | Notes |
|---|---|---|
| npm | npm | Most-wanted upstream cache. Mutable packument drives the TTL design. |
| PyPI | Simple index | The generalisation measurement against npm. |
| Ansible collections | Galaxy v3 | Promoted from Tier 3 on 2026-09-26. The one ecosystem where hosting alone is differentiating, and the first format whose publish is an asynchronous import task the client polls. |
| Maven | Maven layout | Unlocks the entire JVM world in one handler. |
| Go modules | GOPROXY module proxy | The GOPROXY HTTP protocol plus checksum-database semantics; no git on the wire. |
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
| Swift packages | Swift package registry (SE-0292) |
| Pub (Dart/Flutter) | Pub |
| Hex (Elixir/Erlang) | Hex |
| CRAN (R) | CRAN |

### Tier 3 - the long tail that completes the claim

Individually low-value, collectively the difference between "many formats" and "your language is
supported".

| Ecosystem | Family |
|---|---|
| Terraform / OpenTofu modules and providers | Terraform registry |
| Vagrant boxes | Vagrant |
| Chef cookbooks | Chef |
| Puppet modules | Puppet Forge |
| LuaRocks | LuaRocks |
| Hackage (Haskell) | Hackage |
| CPAN (Perl) | CPAN |
| opam (OCaml) | opam |
| Julia General | Julia Pkg server |
| Homebrew bottles | Bottles |
| Open VSX (editor extensions) | Open VSX |
| Arch (pacman) | Arch |

**Headline count at full delivery: 33 ecosystems, 33 protocol implementations, 50+ client tools
and distributions reached.** For comparison, Gitea covers 23 ecosystems with no proxying at all,
and Harbor covers 1 with excellent proxying.

Tier totals: 2 + 9 + 10 + 12 = 33. Distinct families: 33, one per row. Keep this line updated
when a row is added, removed or promoted; it is the arithmetic check on every number quoted above,
and an earlier draft of this document claimed "~30 ecosystems across ~15 protocols" purely
because nobody had added the rows up. AC6 makes the check mechanical.

## Two formats deserve specific comment

**Terraform/OpenTofu** is in Tier 3 only because Stackweaver already implements the Terraform
Registry v1 protocol for modules and providers, with publishing, GPG signing and protocol-level
authorization. That is a working implementation to port rather than a protocol to learn, so its
real cost is far below its tier position. It has one named promotion trigger: **Stackweaver
adopting this registry as the backend for its own module and provider registry**, recorded as a
decision in Stackweaver's documentation. That event turns the port into shared infrastructure
for both platforms rather than a long-tail format, and it is then promoted into Tier 1 as a row
move under the promotion rule above. Nothing else promotes it.

**Ansible collections** is the one ecosystem where hosting *alone* is differentiating: Gitea does
not support it, Forgejo's support is an unmerged proposal, and the only free options are heavy
Pulp deployments. Its old Tier 3 position understated that value, so it was promoted into Tier 1
on 2026-09-26, third in build order after npm and PyPI, which keeps the early slot the charter
had already given it without making the tier gate ceremonial.

## Acceptance Criteria

- [ ] AC1: Every ecosystem in the catalogue has a spec under `docs/internal/plans/formats/`
      before any of its code is written, and all 33 specs exist before the Phase 3 breadth-gate
      verdict is recorded, so the gate decides what is built, never what is written.
- [ ] AC2: Every client and distribution named in the multiplier table passes its ecosystem's
      hosted and proxied conformance suites against that ecosystem's one handler, and appears
      in the conformance matrix's Client column under the ecosystem's row, never as a row of its
      own; a named client that cannot pass is removed from the table, or gets its own handler
      under the resolved family-divergence decision. Any future family label shared by two
      ecosystem rows is proven by conformance cases from both member ecosystems passing against
      one handler before the rows may share it.
- [ ] AC3: The ecosystem count and the client-reach figure `README.md` advertises as
      **supported** never exceed, respectively, the number of ecosystem rows and the number of
      distinct clients the conformance matrix shows passing on both paths (a declared, honoured
      proxy exemption counting as that path for the exempt format), with one matrix row per
      ecosystem, never per family. The target figures (33, 50+) may appear only labelled as the
      target, as `README.md`'s pre-alpha status line and the charter's "a target list, not a
      marketing claim" already frame them; the check parses the supported statement, so a
      README that states only the target states zero supported.
- [ ] AC4: No ecosystem is advertised as supported until both its hosted and proxied paths pass,
      where the proxied path of a format whose `Capabilities()` declares proxy support
      `unsupported` under the constitution's one named exemption (`generic`, its own spec naming
      it) is the runner's honoured exemption, rendered as exempt and never as passing.
- [ ] AC5: No handler code for a Tier 2 or Tier 3 ecosystem exists before every Tier 1 format
      has met its definition of done and the Phase 3 continue-or-shrink verdict is recorded in
      the experiment log with the Tier 1 per-format cost trend as its evidence; an ecosystem is
      built early only by promotion into Tier 1 recorded in this document.
- [ ] AC6: The tier totals line equals the row counts of the four tier tables, and the distinct
      family count it states equals the number of distinct Family values across them; no Family
      value appears on two rows unless AC2's two-member proof exists for it.
- [ ] AC7: The conformance matrix carries, for every ecosystem row, a virtual column generated
      from the handler's `Capabilities()` `Virtual` declaration, rendered exempt with the spec
      cited where it is `unsupported`, and a verification column per `artifact-verification.md`
      AC24; and no advertised claim in `README.md` attributes virtual aggregation or artifact
      verification to an ecosystem whose matrix column reads exempt or `none`.
- [ ] AC8: Every ecosystem row of this document appears exactly once in
      `supply-chain-policy.md`'s "When a refusal binds, per format" table, checked by `make
      verify` with the same row parser AC6 uses, so a row added, removed or promoted here fails
      the check until that table follows.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | ci | structure check in `make verify`: every catalogue row resolves to a spec under `docs/internal/plans/formats/`, every `internal/format/<name>` maps to one, and a recorded gate verdict fails while any row lacks a spec |
| AC2 | conformance | `conformance/<ecosystem>/`, each suite run once per named client image; the matrix Client column is generated from those runs |
| AC3 | ci | matrix generation for `docs/internal/conformance/matrix.md`, plus a check in `make verify` comparing the supported figures in `README.md` against the matrix's passing counts, with a fixture README stating only the target passing at zero supported and one overstating by one failing |
| AC4 | conformance | `conformance/<format>/hosted_test.go`, `proxied_test.go`; for `generic`, the declared-exemption rendering in `conformance/core/matrix_test.go` (shared with `conformance-harness.md` AC20) |
| AC5 | ci + manual | structure check in `make verify`: an `internal/format/<name>` for a Tier 2 or Tier 3 row fails without the gate verdict entry in `docs/internal/tasks/experiment-log.md`; the verdict's evidence is reviewed manually at Phase 3 against the charter's gate definition |
| AC6 | ci | structure check in `make verify`: parses the tier tables and the totals line, and fails on any count mismatch or on a shared Family value without a two-member AC2 suite |
| AC7 | unit + ci | `conformance/core/matrix_test.go` (virtual and verification columns from fixture handlers: supported, `Virtual: unsupported` rendered exempt with citation, verification `none` with citation; shared with `format-handler-interface.md` AC13, `conformance-harness.md` AC20 and `artifact-verification.md` AC24); the AC3 check in `make verify` extended to refuse a `README.md` virtual or verification claim for an exempt or `none` row |
| AC8 | ci | structure check in `make verify` over `supply-chain-policy.md`'s binding table against this document's tier-table rows (shared with `supply-chain-policy.md` AC20; the row parser is AC6's) |

## Implementation Phases

### Phase 0: Spec every ecosystem
All 33 ecosystem specs authored in the spec loop, per the owner's 2026-09-26 direction. The
authoring half is done: on 2026-10-08 every one of the 33 specs under
`docs/internal/plans/formats/` is `planned` on Fable (`node scripts/check-spec.js`). What
remains of this phase is AC1's mechanical half, the structure check that keeps it true as
handlers appear.

### Phase 1: Tier 0
Generic and OCI, proving the harness.

### Phase 2: Tier 1
The nine adoption formats, in the order listed: npm, PyPI, Ansible collections, Maven, Go
modules, NuGet, Helm, Debian, RPM. Signed-index formats (Debian, RPM) last within the tier, since
they add GPG signing to the shared layers. The charter's build order interleaves shared
subsystems between them (`project-charter.md`, steps 4b, 6a and 7).

### Phase 3: Re-evaluate
The owner applies the charter's pre-committed breadth-gate definition to the nine Tier 1 rows of
the experiment log. On `continue`, proceed to Tier 2. On `shrink`, the breadth bet is wrong, the
catalogue shrinks to what is already delivered, and every unbuilt Tier 2 and Tier 3 spec is set
to `parked` rather than deleted. **This gate is real, not ceremonial.**

### Phase 4: Tiers 2 and 3
Fan out, one handler per ecosystem against its existing spec, each spec re-reviewed against the
then-current foundation first.

## Tasks

Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. The three questions raised by the 2026-09-22 review (Q3, Q4, Q5) were adopted on
2026-09-26 under the owner's standing delegation and folded into the family section, the tier
tables, the criteria and the phases above; folding Q4 exposed one further judgment call (Q6),
adopted the same way. The gate review of 2026-10-08 raised and adopted Q7, the one judgment
call `rubygems.md`'s authoring had left to this document. Every adopted answer is reversible by
the owner. The two decisions settled by the owner in the first round are kept below as Resolved
entries, so the reasoning survives the next time someone asks why it was done this way.

### Resolved: gem and bundle count as two named clients under RubyGems (was Q7)

**Adopted 2026-10-08 under the owner's standing delegation.** Option A: `gem` and `bundle` are
two clients under the RubyGems row, each appearing in the matrix's Client column and each
counted once in the reach figure (+1 over the one-per-ecosystem floor), folded into the "Named
clients the format specs add" table and the reach figure above.

Accepted cost: the reach figure rests on a tool-level rule that has to be applied evenly, so the
counting rule is now written out above and every other multi-tool ecosystem (Conda, CPAN, CRAN,
Hackage, Puppet) is counted by the same rule in the same pass, which is what lifted the figure
from "about 60" to "about 74". Counting one (B) lost because it would have been the only place
where two separately-shipped executables with different resolvers on different routes were
folded into one, against `mix` and `rebar3`, `pip` and `uv`, `conda` and `mamba`.

Raised by `rubygems.md`'s authoring consequence of 2026-09-28 ("consider counting gem and bundle
as two named clients under RubyGems, separate resolvers on different routes; the catalogue's
call"), which carried no recommendation, so one was written here before adoption.

**Recommendation:** A. `gem` resolves through the legacy Marshal index and the dependency API;
`bundle` resolves through the compact index, and the spec proves the two on different routes
across three generations (`rubygems.md`, "Conformance, the three clients and the corpus").
A client is counted by what it is on the wire, and these are two.

| Option | You get | It costs |
|---|---|---|
| **A. Two clients, counted by the tool-level rule** | A reach count that applies one rule to every ecosystem; two matrix entries that each have to pass | A rule that has to be applied everywhere, which this pass did |
| **B. One client, "RubyGems"** | A smaller, more conservative figure | An exception to the rule the other multi-tool rows follow, so the figure is no longer reproducible from the specs |

**Why this is yours:** the reach figure is a product claim, and where its counting line sits is
a marketing judgment as much as an engineering one.

### Resolved: "Git-backed" is three protocols, not one family (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: split now into three
single-ecosystem families, "GOPROXY module proxy" (Go modules), "Swift package registry
(SE-0292)" (Swift packages) and "Julia Pkg server" (Julia General). The multiplier table loses
its Git-backed row, the headline becomes 33 ecosystems across 33 protocol implementations, and
the totals line states the family count, which AC6 checks mechanically so a shared label can
never again collapse the count without a two-member proof. The files quoting "~31" outside this
document are listed for correction by their owners; this document is the arithmetic source.

Accepted cost: the headline loses its "fewer protocols than ecosystems" framing, and the "~31"
figure has to be corrected in `README.md`, `CLAUDE.md`, the charter, the conformance matrix and
the "31 bespoke schemas" phrasing of two foundation specs. Keeping the family and letting AC2
adjudicate (A) lost because the divergence is established by the published protocols already,
so AC2 would only force the same correction later and in public.

| Option | You get | It costs |
|---|---|---|
| **A. Keep the family; let AC2 adjudicate** | The ~31 headline stands for now; no cross-file edits | The count rests on a family whose members demonstrably speak three different wire protocols, so AC2 likely forces the same edits later as a public correction |
| **B. Split into three single-ecosystem families now** | A count that survives AC2; the family table stops claiming a wire-level multiplier that is only model-deep | ~31 becomes ~33 in four other files, and the family multiplier table loses a row |

### Resolved: the tier gate reaches Tier 3, and early builds are promotions (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: Ansible collections is
promoted into Tier 1 (third, after PyPI), AC5 now binds Tier 2 **and** Tier 3 handler code, and
Terraform/OpenTofu gets one named promotion trigger (Q6). Reconciled with the owner's direction
of the same day that all 33 ecosystems be specced now: **the gate binds building, never
speccing.** AC1 now requires every spec to exist before the gate fires, AC5 forbids Tier 2 and
Tier 3 handler code before it, and a `shrink` verdict parks the unbuilt specs rather than
leaving them unwritten. The charter's build order and phases give Ansible its Tier 1 slot (step
6a), so the charter and this document agree.

Accepted cost: Tier 1 grows to nine and the "formats that carry adoption" story absorbs a format
there for market position, and the breadth gate's Tier 1 series gains a ninth point. Keeping the
tiers with a promotion bypass (B) lost because a documented bypass makes the gate ceremonial for
whoever invokes it; a strict gate that drops Ansible from the early slot (C) lost because it
delays the one format with no good free alternative for no evidential gain.

| Option | You get | It costs |
|---|---|---|
| **A. Promote Ansible to Tier 1; extend AC5 to Tiers 2 and 3** | Gate and charter agree; the loophole closes | Tier 1 grows to 9 and the "formats that carry adoption" story absorbs a niche format |
| **B. Keep tiers; add an explicit promotion rule recorded in this doc** | Tiers stay a pure cost ordering | The gate has a documented bypass and AC5 needs wording that tolerates it |
| **C. Strict gate; charter drops Ansible from Phase 4** | The simplest gate | Contradicts the charter's settled sequencing and delays the one format with no good free alternative |

### Resolved: client-reach claims are proven per client (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: AC2 is now a
client-reach criterion. Every client and distribution the multiplier table names must pass its
ecosystem's hosted and proxied suites against the one handler, and that evidence appears in the
matrix's Client column under the ecosystem's row, never as an ecosystem row. AC3 extends count
integrity to the reach figure. With the Git-backed split no family has two ecosystem rows, so
AC2's original two-ecosystem clause survives only as the rule for any future shared label, which
AC6 enforces. The table's uncountable entries ("every apt derivative", "WASM artifacts") were
reworded so every counted entry is a nameable client.

Accepted cost: real conformance work per named client (Gradle, SBT, Ivy, Leiningen, uv, Poetry,
pdm, Yarn, pnpm, Bun, Podman, ORAS, and each named distribution), and the reach figure falls if
any of them fails. Leaving the table illustrative (B) lost because the 50+ headline would ship
untested, the exact failure AC3 exists to prevent, and the matrix's "earns its Gradle row"
wording would keep contradicting this document.

| Option | You get | It costs |
|---|---|---|
| **A. AC2 gains a client-reach clause; clients appear under the ecosystem row** | The 50+ figure becomes testable; count integrity extends to the multiplier table; the matrix wording gets a single definition to follow | Real conformance work per named client (Gradle, SBT, Ivy, Leiningen, uv, Poetry, pdm, Yarn, pnpm, Bun, Podman, ...) |
| **B. AC2 stays ecosystem-only; the multiplier table is illustrative** | No extra suite cost | The 50+ headline ships untested, the exact failure mode AC3 exists to prevent, and the matrix's Gradle-row sentence still contradicts this doc |

### Resolved: what promotes Terraform/OpenTofu (was Q6)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A, folded into "Two formats
deserve specific comment": Stackweaver adopting this registry as the backend for its own module
and provider registry is the one trigger, and it acts as a row move under the promotion rule.

Accepted cost: a cheap format may wait behind the gate. Owner discretion (B) lost because it
reopens the bypass Q4 closed, and no trigger (C) lost because shared infrastructure for both
platforms is a genuine reason, not a preference.

Raised while folding Q4, whose recommendation called for "an explicit named promotion trigger"
without naming one. The old wording, "the moment a shared brand story makes it worth doing", was
a bypass with no observable condition.

**Recommendation:** A - tie promotion to an event outside this repository that changes what the
port is for.

| Option | You get | It costs |
|---|---|---|
| **A. Stackweaver adopts this registry as its module and provider backend** | An observable, recorded event; at that point the port serves two platforms and stops being long tail | Terraform may wait for the gate even though it is cheap, if Stackweaver never adopts |
| **B. Owner discretion, recorded when exercised** | Maximum flexibility | A bypass by another name, the thing Q4 closed |
| **C. No trigger: Terraform waits for the gate like every other Tier 3 row** | The simplest rule | Ignores a real reason, shared infrastructure, that would justify building it early |

**Why this is yours:** it ties this project's order to the sister platform's roadmap, a product
call.

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
| 2026-09-26 | 4d1aeb1 | folding adopted recommendations under the standing delegation | Adopted Q3 (B: Git-backed split into GOPROXY module proxy, Swift package registry and Julia Pkg server; headline now 33 ecosystems across 33 implementations), Q4 (A: Ansible collections promoted to Tier 1 third in order, AC5 extended to Tier 3, reconciled with the owner's spec-everything direction so the gate binds building only) and Q5 (A: client reach proven per named client in the matrix Client column), plus Q6 exposed by the fold (Terraform promotes only when Stackweaver adopts this registry as its module and provider backend). Body changes: family section and multiplier table rewritten (Git-backed row removed, uncountable entries reworded, reach recounted at about 52); promotion rule and spec-everything statement added; tier tables and totals line corrected to 2 + 9 + 10 + 12 = 33 with 33 distinct families; AC1 (all 33 specs before the gate), AC2 (client reach), AC3 (advertised figures bounded by the matrix) and AC5 (Tier 2 and 3 handler code gated, early builds only by promotion) rewritten, AC6 (mechanical totals and family check) added, each with a Test Plan row; Phase 0 (spec everything) added and Phase 2 lists the nine in order; Tasks placeholder added. Stays draft: no gate review has been run. |
| 2026-09-26 | da0aecd | cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. No queued consequence targets this file, and check-spec reports none. Verified that the format specs now honour its resolved client-reach decision (npm AC21, PyPI AC17, OCI AC13 carry the multiplier table's named clients; pub records that it has no multiplier row) and its Git-backed split (go-modules cites it). No change beyond this record. Stays draft. |
| 2026-09-28 | b31b889 | cross-spec reconciliation of the foundation authoring wave. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` naming this file verified against the source spec's current text before applying. Open items 11, 18, 19, 20, 24, 31 and 32 (maven, terraform, rpm, debian, chef, openvsx, arch) and `hex.md`'s two-client note: a new table "Named clients the format specs add" records Ivy as prove-or-strike (`maven.md` AC19), SUSE proven by the SLES 15 SP7 BCI image, Mint and Pop!_OS running Ubuntu's apt with the Pop!_OS image built from pinned `ubuntu:24.04` (`debian.md` AC25), and OpenTofu, Berkshelf, chef-cli, knife, VS Code, VSCodium, code-server, `ovsx`, Manjaro and `rebar3` as counted clients under their ecosystem rows; the reach paragraph now states both the table floor (about 52) and the provable figure (about 60), neither advertised ahead of the matrix. Repository-lifecycle item 16 and Open item 12 (theme 9): virtual aggregation recorded as a per-format `Capabilities()` declaration rendered as a matrix column, Hex the first `unsupported`. Artifact-verification item 16: the verification column and its `none` list cited to that spec's AC24. Both asserted by AC7 with a Test Plan row shared with the matrix test. Supply-chain reconciliation item 9: AC8 requires every ecosystem row exactly once in the binding table, checked with AC6's parser. Tier tables, totals and families unchanged. Stays draft. |
| 2026-10-08 | 6a0b78d | Fable gate review: claim verification at HEAD, adversarial, constitution | Every tier claim checked against all 33 format specs (each states its tier and family; 2 + 9 + 10 + 12 = 33, 33 distinct Family values, no label shared); every `Capabilities()` declaration checked (Hex the only `Virtual: unsupported`; generic the only proxy `unsupported`); the multiplier table's clients checked against npm AC21, pypi AC17, oci AC13, maven AC19 (Ivy prove-or-strike holds), rpm's eight clients and SLES BCI, debian AC25's Mint 22 and Pop!_OS 24.04; the cited sibling criteria (FHI AC13, repository-lifecycle AC4, harness AC20, artifact-verification AC24, supply-chain AC20 and its binding table, which names all 33 with four grouped in one row; charter "Speccing is not gated", steps 4b, 6a, 7, 8 and AC9; hex's was-Q1; terraform's trigger paragraph; the nine Tier 1 rows of the experiment log) all resolve; `README.md`, `CLAUDE.md`, the charter and the matrix carry 33 across 33. The whole of `agents/spec-loop/consequences.md` read: the two still-open items naming this file applied (OCI's brew row; rubygems' gem-and-bundle question, written in decision shape and adopted as Q7). Adversarial findings corrected: the named-clients table was incomplete by construction (only specs whose reconciliation items named this file were listed), undercounting the reach the specs name by fourteen; it is now the full inventory read from every spec's clients section with the counting rule stated (about 74, floor 52, neither advertised); AC4 as written could never let `generic` be advertised, contradicting the constitution's named exemption, and AC3 would have failed on `README.md`'s own charter-sanctioned target statement, so both now bind the supported claim and honour the declared exemption; the verification `none` list re-cited to the producer's table at HEAD with Helm's entry stated; Phase 0's authoring half recorded done. No owner decision touched; nothing reverses Q1 to Q6. `check-spec --gate`: clear. Every AC has a Test Plan row, no question open: draft to planned. Sibling consequences reported, none applied here. |
