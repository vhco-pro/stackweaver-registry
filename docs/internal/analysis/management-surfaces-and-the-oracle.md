---
description: "Context for the Cluster 5 decision: what management operations each ecosystem has, which of them a real client can drive, and the correction that the conformance oracle can test every one of their effects even where it cannot trigger them."
covers: []
status: complete
status_description: "Written 2026-09-26 because the owner asked for more context before deciding Cluster 5. Corrects an overstatement in question-triage.md's framing of that cluster, made by the same author. Extended the same day by the cross-spec reconciliation: Cargo rows added (yank, unyank and owners are real client commands, so trigger and effect are both oracle-testable) and a dated note recording how Cluster 5 was adopted. Extended 2026-09-28 on Opus with a row per format re-read from all 32 current format specs (RubyGems not yet authored), four effects asserted only at the wire, and twelve spec defects found on the way."
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

## Every format, re-read against its spec (2026-09-28)

Written after every format spec except RubyGems (not yet authored) had adopted the management API.
The rows are extracted from each spec's current text, not from memory, and cross-checked against
`management-api.md`'s cross-format reconciliation table. "Trigger" is the real client command
that drives a binding onto the kind. "Client-less" kinds are reached only through the management
API, so our integration tests alone verify the trigger. The effect column names the criterion
through which a real client proves the effect, which is the half the oracle always owns.

A format's own publish wire (such as `npm publish`, `cargo publish` or `mvn deploy`) is a wire
write, not a management kind, unless the row says otherwise.

| Format | Kinds | Client-driven trigger | Client-less | Effect a real client observes |
|---|---|---|---|---|
| PyPI | `withdraw`, `restore`, `delete-file`, `delete-version` | none: twine has no yank or delete | all four | pip skips a yanked file unless pinned `==`/`===` (AC12); a deleted file no longer installs and a twine re-upload is refused (AC13) |
| npm | `delete-version`, `delete-package`, `annotate` | `npm unpublish` (the `-rev` routes and tarball `DELETE`), `npm deprecate` (the publish `PUT`) | none | install fails (AC9, asserted through the transcript because the client exits 0 on a 404); install prints the deprecation (AC10); binding parity AC17 |
| Galaxy | `publish` (deferred), `delete-version`, `delete-package`, `attach` | `ansible-galaxy collection publish` onto `publish` | delete, `attach` | install fails and a republish ends `failed` (AC12); a signature-requiring install succeeds (AC11) |
| Cargo | `withdraw`, `restore` | `cargo yank`, `cargo yank --undo` | none (owners mutations are refused, not kinds) | a fresh resolution excludes the version while a lockfile still downloads it (AC4); binding parity AC19 |
| NuGet | `withdraw`, `restore`, `delete-version`, `annotate` | `dotnet nuget delete` onto `withdraw`; relist is bound only to the published reference API's `POST` | relist, hard delete, deprecate | unlisted versions skip `add package` but exact references restore (AC7); a deleted version is 404 (AC8); `dotnet list package --deprecated` (AC19) |
| Maven | `delete-version`, `delete-file`, `prune` | none | all three | resolves fail, `latest`/`release` move back, a redeploy is refused (AC10) |
| Go modules | `delete-version` | none; hosted publish is a registry `PUT` with no `go` client | delete, publish | `.info`, `.mod`, `.zip` answer 410 and `GOPROXY=registry,direct` falls through (AC17) |
| Helm | `delete-version`, `attach` | none (ChartMuseum's delete and `/api/prov` not served); publish is `helm cm-push` | both | the version leaves `helm repo update` and `helm pull` fails (AC6); `helm pull --verify` succeeds (AC18) |
| OCI | none: every OCI write is on its own wire | tag, manifest and blob deletes are wire writes exercised by the distribution-spec conformance suite, not by the docker CLI | none | a deleted tag can be pushed again; `read_only` refuses with 405 (AC15) |
| Generic | `delete-file` | `curl -X DELETE` on the format's own route | none | GET and HEAD 404, the path leaves the listing, a re-PUT is accepted (AC8); twin-artifact parity case |
| Debian | `publish`, `place`, `unplace`, `delete-version`, `configure` | `dput` (the `.changes` `PUT`) onto `publish` | place, unplace, delete, configure | apt installs from the target suite, loses the unplaced one, gets 404 on a delete (AC13); an old-key client is refused (AC14) |
| RPM | `publish`, `delete-version`, `delete-package`, `annotate` | none: no RPM client writes | all | installs after refresh (AC4); dnf and zypper show advisories (AC7); installs fail after delete (AC10); rotation (AC11) |
| Alpine | `publish`, `delete-version`, `delete-package`, `configure` | none | all | both apk lines fail to install after delete (AC8); an old-key client is refused (AC9) |
| Arch | `publish`, `delete-version`, `delete-package`, `configure` | none: pacman reads, `repo-add` writes locally | all | all three clients fail to install after delete (AC9); an old-key client is refused (AC10) |
| conda | `publish`, `annotate`, `withdraw`, `restore`, `delete-file` | `rattler-build upload artifactory` and `upload prefix` onto `publish` | all but publish | a revoked build is skipped by a fresh solve while `pixi install --locked` still installs; removal is 404; notices print (AC4, AC5) |
| Conan | `prune`, `delete-version` | `conan remove` drives the package- and recipe-revision `DELETE`s onto `prune` only | `delete-version` is reached only by `curl` on the reference-server route; dropping incomplete revisions has no binding | `latest` falls back to the previous revision; a removed reference is 404 (AC7); parity AC8; retirement AC9 |
| Hex | `annotate` (retire), `delete-version` (revert), `attach`/`detach` (docs) | `mix hex.retire` and `rebar3 hex retire`; unretire by `mix` only; revert by both; docs by both | none | both resolvers warn and still select a retired version (AC6); a reverted tarball is 404; docs fetch byte-identical (AC7); parity AC8 |
| Chef | `delete-package`, `delete-version`, `annotate` | `knife supermarket unshare` onto `delete-package` | version removal (a reference-API route, `curl` only), deprecation | the universe no longer names the version and a resolve falls back (AC8); deprecation in knife's output (AC9) |
| LuaRocks | `delete-version`, `delete-package`, `delete-file` | none (`luarocks-admin remove` is rsync only) | all | manifests omit it, files 404, `luarocks install` takes the next lower version (AC13) |
| Terraform | `publish`, `delete-version`, `delete-package`, `annotate` (providers only) | none: no Terraform wire writes | all | all four clients install a publish (AC7, AC8), print a provider deprecation, fail after delete (AC9) |
| Hackage | `publish`, `annotate` (revision, preferred versions), `delete-version`, `configure` | `cabal upload --publish` onto `publish` | all but publish | `cabal info`/`get` use a revision (AC15); preferred versions are avoided (AC16); delete is 404 (AC17) |
| Open VSX | `delete-version`, `delete-package`, `configure` | `ovsx unpublish` (1.2.0 only) | verified-namespace `configure` | removed packages leave the documents and `--force` installs the newest remaining (AC30); "(verified)" printed (AC12) |
| CPAN | `publish`, `delete-version`, `annotate`, `configure` | `cpan-upload` onto `publish`, unpatterned `push` only | the rest, and the management-API publish a patterned token must use | the index falls back and every client installs the previous release (AC15); ownership transfer is integration-only (AC6) |
| Julia | `publish`, `withdraw`, `restore`, `annotate`, `delete-version`, `delete-package` | none: Registrator targets git | all | `Pkg.add` installs (AC3); yanked excluded but pinned manifests install (AC5); 1.13 marks deprecated (AC6); pinned instantiate fails after delete (AC7) |
| CRAN | `publish`, `delete-file` (one tree), `delete-version`, `delete-package` | none: no R client uploads | all four | installs on R, pak and renv and the superseded version moves to `Archive/` (AC3); installs fail after every delete kind (AC4) |
| Swift | `withdraw`, `restore`, `delete-version`, `rebind` | none; publish is `swift package-registry publish` on the format's wire | all four | 6.4 re-resolves around an unavailable version and a pinned 5.10 resolve fails; deleted releases answer 410 with the reason printed (AC9) |
| Puppet | `publish`, `annotate`, `withdraw`, `restore`, `delete-version` | puppet-blacksmith and PDK drive `POST /v3/releases` onto `publish` (AC6, AC8) | all but publish; the Forge reference routes are bound but driven only by the case `script` | deprecation warns and still installs (AC10); a withdrawn release is "No releases matching" while r10k's pin installs (AC11); hard delete fails the pin (AC12) |
| pub | `withdraw`, `restore`, `annotate` | none; publish is `dart pub publish` on the format's wire | all three | a retracted version is skipped by a fresh `dart pub get` while lockfile pins install (AC6); discontinuation prints and `outdated` shows the replacement (AC7) |
| Composer | `publish`, `delete-version`, `delete-package`, `annotate` | none | all four | `require` installs a publish and a branch republish updates (AC5); `require` fails after delete and installs print "is abandoned" (AC6) |
| Vagrant | `publish`, `annotate`, `delete-file`, `delete-version`, `delete-package` | none; `vagrant cloud publish` (HCP API v2) is not served and fails cleanly (AC9) | all five | `box add`, `outdated`, `update` see a publish (AC6-AC8); a default-architecture change splits 2.3.7 from 2.4.9 (AC3); deletes 404 (AC9) |
| opam | `publish`, `annotate`, `delete-version`, `delete-package` | none; `opam publish` is a forge pull request, out of scope | all four | `opam update`/`install` pick up a publish (AC5); a revision changes resolution (AC8); `upgrade` downgrades or removes after delete (AC9) |
| Homebrew | `publish` (bottles only), `delete-file` | none: `brew pr-upload` recognises only GitHub | both | a tap formula with the returned `root_url` installs on both brew lines (AC6); a deleted bottle 404s and the install fails with no source build (AC18) |

### What the re-read found

**The frame of 2026-09-26 holds at full width.** Every one of the 32 specs gives each management
kind an effect a real client observes, so the oracle owns the effect everywhere. Where no client
drives the trigger, the trigger is verified by our integration tests, exactly as the section on
what still needs deciding said.

**Most formats have no client-driven trigger at all.** Fourteen of 32 have one: npm, Galaxy (publish),
Cargo, NuGet (unlist), generic, Debian (dput), conda (publish), Conan (revision removal), Hex,
Chef (unshare), Hackage (publish), Open VSX (1.2.0 unpublish), CPAN (publish) and Puppet
(publish), and in six of those only publish is bound. Management through our own API is the
norm, not the exception, which is the strongest argument that Cluster 5 was right to adopt one
cross-format surface.

**Four effects are asserted at the wire rather than through a client**, which is weaker than the
rest of the table and should be closed or recorded as a deliberate gap:

1. Swift `restore` and `rebind`: AC9 and AC7 assert the snapshot, not a client resolve afterwards.
2. Alpine and Arch architecture-set `configure`: only a static out-of-set 404 is asserted, never a
   client seeing the set change.
3. CPAN's author record (`annotate`): `01mailrc` changes but no criterion or case asserts it, and
   ownership transfer is integration-only (AC6).
4. OCI deletion is exercised by the distribution-spec suite, not by any real CLI, which is right
   for OCI (no mainstream CLI deletes by digest) but is not the client oracle.

**Spec defects found on the way**, queued in `agents/spec-loop/consequences.md`:

- `puppet.md`: "No client in the matrix triggers any of them" sits above a client-driven publish
  row. `management-api.md`'s Puppet rows name bindings for undeprecate, restore and hard delete
  that `puppet.md` gives as none.
- `conan.md`: `delete-version` has no client trigger (only `curl` on the reference-server route),
  and the recipe revision's binaries route has no named case in AC7.
- `hex.md`: the Context still says the format's one client-driven operation is a deprecation.
- `luarocks.md`: the heading "Removes are bindings" and a Scope bullet contradict "no binding
  exists", and a blocking precondition routes hosted population through a `publish` kind the
  spec does not declare.
- `debian.md`: "The dput binding" still says the scope-equality seam is `management-api.md`'s to
  close; its was-Q13 closed it.
- `vagrant.md` and `opam.md`: both still describe an older reconciliation table (Vagrant under
  `attach`, opam with no package deletion).
- `terraform.md` against `management-api.md`: the table's "deprecate" omits that the spec offers
  it for providers only.
- `nuget.md` AC7's "relist through the management binding" is loose: the relist binding is a
  reference-API route with no client behind it.
- `hackage.md` AC16's Test Plan row names no entry point, and whether `configure` is in the
  handler's `Operations()` or only on the signing-key routes is unstated.
- `cpan.md` says every declared kind is driven by a `script` case, but none is named for
  `annotate` or the ownership `configure`.
- `pypi.md`: the Design table gives yank as "`delete` on the version" while Addressed objects
  names a file-level `withdraw`.
- `management-api.md`'s illustrative list in "Bindings: one operation, two ways in" omits
  `ansible-galaxy collection publish` and `npm deprecate`. Not a contradiction.
