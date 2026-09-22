---
status: draft
status_description: "Reviewed 2026-09-22 at afbb4e4: the pass added a Design section, HEAD and DELETE criteria and the two-client-version alignment, and raised Q2-Q8 for the owner; stays draft until they are answered."
description: "Spec for the generic/raw artifact format - the trivial protocol used to prove the harness, CAS, auth and CI wiring end to end."
author: michielvha
goal: "Exercise every shared layer with a protocol simple enough that any failure is unambiguously a harness or infrastructure failure, not a protocol misreading."
priority: "high"
issue: 6
created: 2026-09-21
covers:
  - "internal/format/generic/**"
  - "conformance/generic/**"
---

# Plan: Generic artifact format

Upload a file to a path, download it back, list what is there, delete it. Deliberately the most
boring format possible.

## Context

This format exists to be first, not to be wanted. Its purpose is to exercise the conformance
harness, the content-addressable store, authentication and the CI wiring with a protocol so
trivial that any failure is unambiguously infrastructure rather than a protocol misreading.
Debugging a harness and a protocol at the same time is how foundation work stalls.

It is also genuinely useful on its own: "where build outputs and arbitrary binaries live, with
retention policies" is a real need that teams currently solve with an S3 bucket and no access
control.

The client here is `curl`, which means the conformance cases are unusually legible and make good
worked examples for every later format.

## Scope

**In scope:** authenticated PUT to a repository path, GET, HEAD, listing, delete, and retention
policies by age and by count.

**Out of scope:** the proxied path. This is the one format permitted to declare proxy support
`unsupported` (see `format-handler-interface.md`, resolved Q2) - there is no upstream protocol
to proxy, because there is no ecosystem. That exception is named here so the conformance matrix
does not imply a gap that does not exist. It also obliges the runner's mode-coverage validation
(`format-handler-interface.md` AC4, the harness case schema) to recognise a declared
`unsupported` capability rather than fail this format for covering one mode; neither sibling
spec currently says how, which is recorded as a cross-spec finding in the review log.

## Design

### Protocol surface

Five operations over plain HTTP, chosen so every conformance case is a legible `curl`
invocation:

- **PUT** streams a body to a repository-relative path, records its digest, and commits the
  blob through the shared CAS. The handler never opens object storage directly
  (`format-handler-interface.md`).
- **GET** returns the bytes; **HEAD** returns the same status and metadata headers with no
  body.
- **Listing** enumerates artifacts with size and digest. Its shape under deep paths is Q4.
- **DELETE** removes the metadata reference only. Blob reclamation always flows through GC
  (`storage-and-gc.md`), so this format adds no second deletion path to the store. The same
  holds for retention: it is an automated deleter of metadata references and nothing else,
  which keeps every blob-deletion decision inside the one component whose safety is
  property-tested and fault-injected.

### What this format proves, and what it deliberately cannot

The proving-ground claim has to be honest about coverage. Exercised end to end: the harness
core loop, case schema and CI wiring; authenticated and unauthenticated request handling; the
CAS commit path and cross-path deduplication; the delete-to-GC handoff; and retention as the
first automated deleter. **Not** exercised: chunked/resumable upload, the proxy and cache
layers, mutable-metadata TTL semantics, and the recording-proxy/replay-match machinery - there
is no reference implementation of this protocol to record (Q7). Those gaps fall to whichever
format first needs each mechanism (OCI and npm on current sequencing) and are stated here so
"generic is green" is never read as "the shared layers are proven".

### Paths

Settled (below): paths are arbitrarily deep. A path is metadata resolved through the shared
model and never becomes a filesystem or object-store path; blobs stay keyed by digest alone.
The consequences that resolution priced in outline but not in detail are owner decisions: how
a path maps onto the shared `Package`/`Version`/`File` model (Q2), the path grammar,
normalisation and prefix/file collision rules (Q3), listing shape (Q4), overwrite semantics
(Q5), and retention scoping (Q6).

## Acceptance Criteria

- [ ] AC1: An authenticated client can PUT a file and GET back a byte-identical copy.
- [ ] AC2: An unauthenticated PUT is rejected, and an unauthenticated GET to a private
      repository is rejected.
- [ ] AC3: Uploading identical content to two different paths stores one blob (proves CAS
      deduplication through a real request path).
- [ ] AC4: Listing returns uploaded artifacts with size and digest.
- [ ] AC5: A retention policy by age and by count removes exactly the artifacts it should and no
      others.
- [ ] AC6: Conformance cases for all of the above pass with at least two `curl` client versions
      pinned by image digest, satisfying the two-client-version rule in
      `format-handler-interface.md`'s definition of done.
- [ ] AC7: A HEAD request for an existing artifact returns the same status and metadata headers
      (including size) as the corresponding GET, with no body; HEAD for a missing artifact
      returns the same status as the missing GET.
- [ ] AC8: After a DELETE, GET and HEAD for that path return 404 and the listing no longer
      includes it. Blob reclamation is asserted by `storage-and-gc.md`'s criteria, not here.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/generic/hosted_test.go` |
| AC2 | conformance | `conformance/generic/auth_test.go` |
| AC3 | integration | `internal/format/generic/dedup_test.go` |
| AC4 | conformance | `conformance/generic/hosted_test.go` |
| AC5 | integration | `internal/format/generic/retention_test.go` |
| AC6 | ci | conformance job |
| AC7 | conformance | `conformance/generic/hosted_test.go` |
| AC8 | conformance | `conformance/generic/hosted_test.go` |

## Implementation Phases

### Phase 1: Hosted surface
- PUT, GET, HEAD, listing and DELETE, with conformance cases as the harness's first real subject

### Phase 2: Retention
- Age and count policies, with the integration tests proving exact-set deletion

## Tasks

Left empty by design. Populated by `/tasks` once this spec reaches `planned`.

## Open Questions

Q2 through Q8 were raised by the 2026-09-22 review and await the owner. The resolved decision
that follows them is kept rather than deleted, so the reasoning survives the next time someone
asks why it was done this way.

### Resolved: mapping onto the shared model (was Q2)

**Settled 2026-09-23: the GitLab hybrid.** Package name and version are mandatory path
segments; the filename may itself contain a relative path, so directory structure is preserved
*inside* a version:

```
PUT /generic/{repository}/{package}/{version}/{path/to/file.tar.gz}
```

Grounded in what the field actually does. JFrog Artifactory Generic and Nexus Raw are
filesystem-style, with the path as the whole identity and no version semantics. Gitea is strictly
`{package}/{version}/{filename}` and its documentation is explicit that arbitrary nested paths
are **not** accepted. GitLab requires package and version but permits a relative path inside the
filename. The hybrid keeps retention-by-version-count meaningful and listing well-scoped while
still letting teams mirror a build layout.

Accepted cost: this **narrows the earlier arbitrary-depth resolution**. Depth still exists, but
beneath a package and a version rather than being the identity itself. That earlier decision has
been amended to match rather than left to contradict this one.

### Resolved: path grammar (was Q3)

**Settled 2026-09-23: a strict grammar, with file-versus-prefix collisions rejected.** A
defined character set, no empty or dot segments, normalisation on write, and storing `a/b` when
`a/b/c` already exists is an error.

This closes a whole class of listing and retention ambiguity at the cost of rejecting some
uploads that look legitimate. Since the permissive alternative is genuinely irreversible once
users depend on it, the rejection message must say exactly which rule was broken and why.

### Q4: What shape does listing take over arbitrarily deep paths?

**Recommendation:** A - flat recursive listing with a prefix filter and pagination; one
endpoint, curl-legible, and a directory view can be derived from it later.

| Option | You get | It costs |
|---|---|---|
| **A. Flat recursive list with `prefix` filter and pagination** | One simple endpoint; AC4 stays trivially testable; a UI can build trees client-side | Long result sets for big repositories; no server-side one-level view |
| **B. Directory-style: one level per request, S3-delimiter fashion** | Natural navigation and bounded responses | More endpoint surface to spec and test now, in service of a UI that does not exist yet |

**Why this is yours:** it fixes this format's public API shape, and the path-depth resolution
named listing as one of the things made "meaningfully more complex" without choosing how to pay.

### Q5: What happens when a PUT targets a path that already holds an artifact?

**Recommendation:** C - overwrite allowed by default with a per-repository immutability
switch; the stated use case (build outputs) wants both moving targets and frozen releases.

| Option | You get | It costs |
|---|---|---|
| **A. Last-write-wins always** | Matches curl ergonomics and republished-`latest` flows | No immutability guarantee anywhere in the format |
| **B. Immutable always: conflict response, delete first** | Strong guarantees, simplest reasoning | Breaks the most common generic-repository workflow |
| **C. Per-repository setting, overwrite by default** | Both workflows | A configuration axis that doubles the conformance cases touching writes |

**Why this is yours:** it is a product promise users will build automation against, and the
snapshot model (`data-model.md`) supports all three equally, so nothing technical decides it.

### Q6: What is the scoping unit of a retention policy?

**Recommendation:** A - policies attach to the repository, each with an optional path-prefix
filter; it composes with any answer to Q2 and needs no new entity.

| Option | You get | It costs |
|---|---|---|
| **A. Per-repository rules with optional path-prefix filters** | Covers "keep 30 days of `ci/`" with no new schema; all rules visible in one place | "Keep last N" still needs a defined grouping key (Q2's unit) to count within |
| **B. Policies attach to Q2's grouping unit directly** | "Last N per package" is the natural reading | Retention configuration multiplies with packages, and policies orphan when a prefix disappears |

**Why this is yours:** AC5 promises removal of "exactly the artifacts it should and no
others", which is unfalsifiable until the scoping unit is fixed - and the wrong unit deletes
someone's artifacts correctly-by-spec.

### Q7: Does generic get a formal exemption from the replay-match definition-of-done item?

**Recommendation:** A - a named exemption recorded in `format-handler-interface.md`, mirroring
the proxy exemption, because a corpus recorded from our own server can only prove the server
agrees with itself.

| Option | You get | It costs |
|---|---|---|
| **A. Formal exemption: replay-match applies only where a reference implementation exists** | An honest definition of done, no ritual testing | A second named exception to the interface contract, and a precedent later formats may try to claim |
| **B. Record a corpus from our own first implementation as a regression baseline** | Response-shape regression protection for free | The corpus enshrines day-one behavior, bugs included, with the authority the harness reserves for external ground truth |

**Why this is yours:** it amends the definition of done in a sibling spec. As written,
`format-handler-interface.md` item 2 is unsatisfiable for this format, which would block its
completion forever.

### Resolved: conformance credential (was Q8)

**Settled 2026-09-23 by `auth.md` rather than independently.** The generic conformance client
presents a registry token scoped to its repository, as `Authorization: Bearer`. Generic is our own
protocol, so there is no external client convention to match and no trade-off to weigh.

Repositories are private by default, so the unauthenticated and unauthorized cases required of
every format (`format-handler-interface.md` AC7) are meaningful here from the first commit.

### Resolved: path depth (was Q1)

**Settled 2026-09-22, narrowed 2026-09-23: deep paths, beneath a package and version.** Teams
mirror directory layouts regardless, and forbidding it only pushes the hierarchy into filenames.

The original wording said "arbitrarily deep", which on its own selected the Artifactory Generic
model where the path is the whole identity. The mapping decision below adopted the GitLab hybrid
instead, so depth now lives inside the filename segment under a mandatory package and version.
Amended here rather than left standing, because two resolutions contradicting each other in one
spec is exactly the drift these records exist to prevent.

Accepted cost: listing, retention scoping and the future UI all become meaningfully more complex.
Security position is unchanged either way: blobs stay digest-keyed, so an artifact path is
metadata and never becomes a filesystem path.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-22 | afbb4e4 | adversarial + constitution + go-spec-reviewer (claim verification vacuous pre-code) | Added Design, HEAD/DELETE criteria (AC7/AC8) and two-client-version alignment; raised Q2-Q8 (model mapping, path grammar, listing, overwrite, retention scoping, replay exemption, auth gap); flagged cross-spec gaps (runner mode-check vs `unsupported`, harness Phase 2 claims generic proxied cases); stays draft. |
