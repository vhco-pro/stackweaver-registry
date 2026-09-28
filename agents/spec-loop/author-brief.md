# Authoring brief (stackweaver-registry spec loop)

Repository root (paths below are relative to it). Read CLAUDE.md first; it is binding, including its
"Standing delegation of open questions (owner, 2026-09-26)" section.

## Read before writing
- agents/spec.md (the authoring procedure) and docs/internal/guidelines/documentation/plan-template.md.
- docs/internal/plans/formats/npm.md and pypi.md: your models for depth and structure. Match them.
- docs/internal/plans/formats/catalogue.md (your format's row and family), foundation/project-charter.md.
- The foundation specs every format obeys: format-handler-interface.md (pinned methods, Capabilities(),
  Deps, URL shape, Mount), data-model.md (shared entities; opaque metadata at repository/package/
  version level; snapshots, pointers; write-boundary declarations), proxy-cache.md (hosted vs
  proxied, Upstream, download policies, stream-and-verify, single-flight, serve-stale, the removal
  table), storage-and-gc.md (five mark roots), auth.md (scopes, client credential table),
  conformance-harness.md (real client as oracle, case schema, `setup` vocabulary),
  supply-chain-policy.md, write-triggered-services-prototype.md (signed/generated indexes).
- docs/internal/analysis/management-surfaces-and-the-oracle.md (trigger vs effect).

## Grounding (the constitution's "evidence or silence")
Every protocol claim is grounded this run: the published spec or registry API docs (WebFetch), the
client's own documentation or source, and where the real client is installed on this host (check
with `which`), its actual behaviour. Say plainly where a contract is unpublished and what you
grounded it against instead. Never describe a wire format from memory.

## What to write: docs/internal/plans/formats/<name>.md
Full frontmatter (description, covers: [], status: draft, status_description, author: michielvha,
goal, priority, issue: "", created: 2026-09-26). Sections: Context, Scope (every exclusion carries a
non-effort reason: scope is not a constraint here), Design (wire surface table; how the format maps
onto the shared model with NO new tables; hosted publish path and its write-boundary declaration;
the proxied path with mutable/immutable classification, URL rewriting, and the format's rows of the
removal table; content negotiation; name normalisation and other traps; non-interactive client
auth; signing and provenance and how they meet supply-chain-policy; what it needs from Deps; any
write-triggered or signed-index service and how it meets write-triggered-services-prototype.md),
Acceptance Criteria (real-client conformance on BOTH hosted and proxied paths, two pinned client
versions where the ecosystem has meaningful version skew, plus the traps), Test Plan (a row for
every criterion), Implementation Phases, `## Tasks` placeholder, Open Questions, Review Log.

Open questions: write each in the template decision shape, then, per the standing delegation, adopt
its recommendation immediately as `### Resolved: <topic> (was Qn)` opening with
`**Adopted 2026-09-26 under the owner's standing delegation.**`, folded into the body. Leave none open.

## Settled context added mid-loop (read this; it post-dates some sibling text)
- The catalogue now counts 33 ecosystems across 33 implementations: "Git-backed" was split into
  three families, the GOPROXY module proxy, the Swift package registry (SE-0292) and the Julia Pkg
  server. Use those family names. Ansible collections moved into Tier 1 (third, after PyPI).
- The charter's breadth gate governs what is BUILT, never what is specced. Every Tier 2 and Tier 3
  spec must state in Context that its build is gated by project-charter.md AC9 and catalogue.md
  AC5, and that the spec exists because the owner directed that everything be specced up front.
- Cite the charter build step your subsystem depends on where relevant: management surface core at
  step 2 (full at step 9), upstream adapters at step 4, artifact verification at step 4b,
  async operations at step 6a, the shared signing/index service at step 7 (before Helm).
- Where your format needs a shared service that is being authored in this loop, cite it by path
  with "(to be authored in the spec loop)": foundation/management-api.md,
  foundation/artifact-verification.md, foundation/signing-service.md,
  foundation/async-operations.md, foundation/upstream-adapters.md. Do not define those services'
  shapes yourself; state precisely what your format requires of them.

## Rules
- Never em-dashes or en-dashes. Never credit an AI assistant.
- Touch ONLY your new file(s). Do not edit siblings; list any needed sibling change in your report.
- Review Log: one row, date 2026-09-26, HEAD sha from your prompt, lens "authoring pass: grounded
  first draft, not a review", outcome summarising what was grounded and adopted. Written last.
- Do not commit. Run `node scripts/check-spec.js <your file>`: zero failures, and act on any
  "Design names X ... no criterion asserts it" advisory.

## Report (a return value, compact)
What you grounded and against what; the design's hardest trap; criteria count; questions adopted
(one line each); sibling consequences, if any.

## Model tier (read this)
Record the model you ran on in your Review Log lens, for example "authoring pass on Opus: ...".
If you are not Fable, add `fable_recheck: "<what you did> on <model>, <date>"` to the spec's
frontmatter (reconciliation and folding need it only when you adopted a new question). Never remove
an existing `fable_recheck` unless you are Fable performing that recheck. Never set `planned` on a
spec that carries one.
