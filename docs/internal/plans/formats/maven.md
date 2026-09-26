---
status: draft
status_description: "Authored 2026-09-26 as a grounded first draft: the Maven repository layout captured from Maven 3.8.8 and 3.9.11, Gradle 8.14.5 and 9.1.0, sbt 1.13.0 (Coursier) and Leiningen 2.13.0 run in containers against a logging stub, checked against the Maven layout and repository-metadata references, the resolver's checksum and configuration pages, the settings and deploy-plugin references, Maven Central's requirements, the Gradle Module Metadata specification and the Gradle user guide sources, and the live repo.maven.apache.org. Seven questions written in decision shape and adopted under the owner's standing delegation; none open. Awaits a /spec review pass."
description: "Spec for the Maven repository layout: the path-addressed release and SNAPSHOT files, the three levels of generated maven-metadata.xml, checksum and signature sidecars and Gradle Module Metadata, hosted and proxied, with Maven, Gradle, sbt and Leiningen as the conformance oracles."
author: michielvha
goal: "Serve the whole JVM world from one handler: a private Maven-layout repository and a Maven Central cache whose generated metadata never loses a concurrent deploy, whose checksums are served rather than trusted, and whose one wire is spoken by five build tools."
priority: "medium"
issue: 22
created: 2026-09-26
covers:
  - "internal/format/maven/**"
  - "conformance/maven/**"
---

# Plan: Maven repository format

The Maven repository layout, hosted and proxied: a static path convention in which every file is
addressed by its coordinates, a deploy is a sequence of independent `PUT`s with no transaction
around them, and the only documents the server itself produces are the three levels of
`maven-metadata.xml`, with `mvn`, `gradle`, `sbt` and `lein` as the oracles on both paths.

## Context

Maven sits in Tier 1 of `formats/catalogue.md` under the "Maven layout" family, the family with
the largest client multiplier in the catalogue's table (Maven, Gradle, SBT, Ivy, Leiningen: five
build tools, five languages), and it is the first format of the charter's build step 7, built
immediately after the **shared signing and index service** that step opens with and before Go
modules, NuGet, Helm, Debian and RPM (`project-charter.md`, "Build order"). It is there because
one handler unlocks every JVM ecosystem at once: the layout is a directory convention rather
than an API, so any tool that can compute a path can read it, and the writers only need `PUT`.

Count integrity: the catalogue's resolved client-reach decision (was its Q5, AC2) makes every
client its multiplier table names a claim to be proven against this one handler on both paths.
Four of the five were run in this authoring pass and their traffic is what the wire table below
records: Maven (two pinned releases), Gradle (two pinned releases), sbt (through Coursier) and
Leiningen. **Apache Ivy was not run** and nothing in this spec grounds it; AC19 carries it as a
claim the conformance run must either prove or strike from the catalogue's table, per that
spec's own rule.

Grounding for this draft, stated up front because the constitution asks for evidence or silence:

- **Captured client traffic.** No JVM build tool is installed on this host (`which mvn gradle
  sbt lein` find nothing), so pinned client images were run in containers on the host network
  against a logging stub that serves a directory as a Maven layout, accepts `PUT`, and records
  every request. Maven `3.9.11` (`docker.io/library/maven:3.9.11-eclipse-temurin-21` at digest
  `sha256:6fdc855a6ed81d288ca7ca37ac6ff5e9308b612485c0801d70b25a858c83d237`) and Maven `3.8.8`
  (`maven:3.8-eclipse-temurin-17` at
  `sha256:40fcff4c4043d6adc90286c2e38ec70950f34f6dd5784f7e524866c66520cc23`); Gradle `9.1.0`
  (`gradle:9.1.0-jdk21` at
  `sha256:db12d4789367d4676ef3d8aa672685e0e451705776b53f7d81c953fba3b1d55b`) and Gradle `8.14.5`
  (`gradle:8.14.5-jdk21` at
  `sha256:fa192d8429108392649083b819ace29e681911dfed35ec3899dd3a652fa75e1e`); sbt `1.13.0`
  (`sbtscala/scala-sbt:eclipse-temurin-21.0.12_8_1.13.0_3.3.8` at
  `sha256:0d5a1d7020da2cfac0b714c54fc6725e2296bdaddea135a1c165d44f8754e2e4`); and Leiningen
  `2.13.0` (`clojure:temurin-21-lein-2.13.0-trixie-slim` at
  `sha256:25a661cd6b2fdc9d119a8051c833d6aba5d5ece98c99b46ddcd31cfb8f09dae3`). The fixtures were
  genuine: ZzBar 1.0.0 to 1.0.7 and zzfoo 1.0.0 and 1.1.0-SNAPSHOT built and deployed
  by `mvn deploy`, zzgradle 1.0.0, 1.0.1 and 1.1.0-SNAPSHOT published by Gradle's
  `maven-publish` plugin, a `maven-plugin` project deployed for the group-level metadata, and
  one release deployed under a throwaway GPG key. Every consumer capture started from a fresh
  local repository (`~/.m2`, `GRADLE_USER_HOME`, the Coursier cache, `~/.m2` for Leiningen),
  and every row of the wire table was observed on both pinned Maven and both pinned Gradle
  releases unless the row says otherwise. The stub is not a reference implementation; it
  answered with the shapes the published layout describes, and what the captures prove is
  what the clients send and how they react.
- **The published contract.** The Maven repository layout reference and the
  `maven-repository-metadata` model reference (all three metadata levels, `lastUpdated` and
  `timestamp` formats, `snapshotVersions`, the `plugins` block), read 2026-09-26; the Maven
  Artifact Resolver's expected-checksums page and configuration reference (`SHA-1,MD5` as the
  default algorithms, remote-included checksum headers, `preemptiveAuth` false and
  `preemptivePutAuth` true, `omitChecksumsForExtensions` `.asc`,
  `failOnChecksumUploadFailure`); the settings reference (`servers`, `mirrors` with `blocked`,
  `updatePolicy` and `checksumPolicy`) and the Maven 3.8.1 release notes that introduced the
  `external:http:*` blocker; the `maven-deploy-plugin` `deploy` mojo reference (`deployAtEnd`
  defers and does not make a batch atomic; `altDeploymentRepository` lost its layout segment in
  3.0.0); Maven Central's publishing requirements (`.md5` and `.sha1` required, `.sha256` and
  `.sha512` accepted, a `.asc` for every file, `.asc` files carrying no checksums); the Gradle
  Module Metadata 1.1 specification; and the Gradle user guide sources for metadata formats,
  repository protocols, dependency caching, publishing module metadata and securing
  dependencies.
- **The live upstream.** `repo.maven.apache.org` sampled directly: a POM and an artifact-level
  metadata file with their `ETag` (the MD5), `Last-Modified`, `x-checksum-sha1` and
  `x-checksum-md5` headers and no `Cache-Control`; a `304` to `If-None-Match` and a `200` to
  `If-Modified-Since`; a `404` on a missing version and on a wrong-case filename; an HTML
  directory listing on a directory URL; a Gradle-published artifact carrying `.module` and
  `.asc` sidecars but no `.sha256`, `.sha512` or `.asc.sha1`; the marker comment in its POM;
  and the `plugins` block of `org/apache/maven/plugins/maven-metadata.xml`.

Where the documentation and the captures disagreed, the captures win, and two disagreements
are recorded here because they would otherwise be built from the documents: the Gradle user
guide says a Maven repository is searched for `.module` files first, and both pinned Gradle
releases fetched the POM first and the `.module` only when the POM carried the marker; the
same guide says Gradle retrieves `.sha512`, `.sha256`, `.sha1` or `.md5` before downloading
an artifact, and neither pinned release requested a checksum sidecar in any resolution.

Four things make this format worth a careful spec rather than a port of npm's. **A deploy is
`PUT`s with no transaction**: pom, jar, every classifier, every checksum, then the client's own
version of `maven-metadata.xml`, in an order that differs between clients (Maven 3.9.11 sends
the POM first, Maven 3.8.8 and every Gradle send the jar first), so the registry, not the
client, has to decide what one logical publish is. **`maven-metadata.xml` is a generated,
mutable, repository-side document the clients also write**: every client reads it, then `PUT`s
a version it computed itself, and two concurrent deploys captured three milliseconds apart each
read a five-version document and each wrote a six-version one, so the final document lost a
version whose directory exists and both clients exited zero. A registry that stores what the
client sent has a corrupt index; it must generate the document. **SNAPSHOT resolution is a
protocol of its own**: the client asks the version-level metadata which timestamped build is
current, names files by that timestamp and build number, and remembers a missing file for a
day, so metadata that names a build whose jar has not arrived costs a consumer a cached
failure. And **checksum sidecars are the integrity primitive the ecosystem has**, weak (`.sha1`
and `.md5`), fetched by some clients and not others, and replaceable by a response header
that halves the request count of the client that matters most.

## Blocking preconditions

**The handler interface re-open must complete before this format starts.** Maven is Tier 1,
and `format-handler-interface.md` AC8 blocks all Tier 1 handler work on the post-OCI re-open;
npm, PyPI and NuGet record the gate from their sides and this spec records it here because a
contract enforced on one side only is enforced nowhere.

**The shared signing and index service must be specced before Phase 1.** Every level of
`maven-metadata.xml` is a write-triggered generated document (Design, "The generated
documents") produced by `docs/internal/plans/foundation/signing-service.md` (to be authored in
the spec loop), which the charter builds first in step 7, before this format, as the
production form of what the step 4a prototype learned (`write-triggered-services-prototype.md`).
The charter's AC12 names Helm as the handler that follows that service; Maven consumes it
earlier in the same step and is recorded as a sibling consequence, not assumed here. What this
format requires of the service is stated in Design rather than designed here.

**The management API must be specced before Phase 2's management operations.** No JVM build
tool has a delete, retire or prune command, so every management operation on this format is
client-less, PyPI's case in `docs/internal/analysis/management-surfaces-and-the-oracle.md`, and
each is an operation of `docs/internal/plans/foundation/management-api.md` (to be authored in
the spec loop). AC10 is untestable until that surface exists, so Phase 2's management half
waits on that spec reaching `planned`. Phase 1, the deploy half of Phase 2, and Phases 3 and 4
do not.

**One shared-layer amendment this spec depends on is requested, not assumed.** A proxied
artifact from an upstream that publishes no checksum sidecar and no checksum header has no
digest to verify against; it needs the completion-only fetch-and-cache mode `go-modules.md`
and `nuget.md` already requested of `proxy-cache.md`, and this spec does not edit that sibling.

## Scope

**In scope:**

- The layout itself: release files at `{group as path}/{artifactId}/{version}/
  {artifactId}-{version}[-{classifier}].{extension}`, timestamped SNAPSHOT files under the
  base-version directory, and the format-first mount `/maven/{repository}/` in front of it.
- The three levels of `maven-metadata.xml` as generated documents: artifact level (versions,
  `latest`, `release`, `lastUpdated`), version level for SNAPSHOTs (`snapshot`,
  `snapshotVersions`), and group level (`plugins`), produced by the shared index service and
  never taken from a client.
- Deploy as every captured client performs it: file `PUT`s in either order, checksum `PUT`s
  verified rather than stored, the client's metadata `PUT`s accepted and discarded, the write
  boundary `data-model.md` requires declared per file (the resolved write-boundary decision).
- SNAPSHOT semantics: the timestamped filename grammar, the build number the client computes
  from the version-level metadata, the gating that keeps an incomplete build out of the served
  metadata, `-U` and `--refresh-dependencies` revalidation, and the refusal of base-version
  filenames.
- Checksums: `.md5`, `.sha1`, `.sha256` and `.sha512` served for every file from the store's own
  digests, the `x-checksum-sha1` and `x-checksum-md5` response headers Maven 3.9 honours, and
  the verification of every checksum a client uploads.
- Detached PGP signatures (`.asc`) as opaque sidecar files, stored and served byte-identical.
- Gradle Module Metadata: the `.module` file as an ordinary file of the version, the POM marker
  that redirects Gradle to it, and the documented difference between Gradle's and Maven's
  resolution.
- Immutability: a file coordinate binds one set of bytes for the life of the repository, an
  identical re-upload is idempotent, a different one is refused, and a deleted release
  coordinate is retired forever (the resolved redeploy decision).
- Version enumeration as the clients perform it: Maven ranges and `RELEASE`, Gradle `1.+`,
  `latest.release` and ranges, sbt ranges, all read from the artifact-level document, and the
  merge a virtual repository performs.
- Plugin prefix resolution through the group-level document.
- Non-interactive authentication exactly as the clients send it: HTTP Basic after a `401`
  challenge on reads, preemptively on `PUT`, the per-route addressed objects `auth.md`'s
  pattern scopes evaluate (AC12), and the `403` rendering of a shared policy refusal (AC13).
- The management operations this format needs from the registry-owned management API: delete
  a version, delete a file, prune SNAPSHOT builds.
- The proxied path against a plain-layout upstream (Maven Central or a private repository):
  classification per file kind, conditional revalidation as the live upstream supports it,
  negative caching, the absence of any URL rewriting, virtual-repository metadata merging, and
  Maven's rows of the upstream-removal table.
- The catalogue's named family clients: Maven and Gradle as the primary oracles at two pinned
  releases each, sbt and Leiningen as proven clients, Ivy as the claim to prove or strike.

**Out of scope for v1**, each with its reason, recorded because the interface spec's definition
of done requires the deliberately unimplemented surface to be named:

- **Staging repositories and atomic multi-file publishing.** Maven Central's answer to the
  no-transaction deploy is a staging repository closed and released through a Nexus-specific
  API that no build tool speaks natively; the deploy plugin's own reference says `deployAtEnd`
  "does not make the whole batch atomic". A registry-owned staging operation is a management
  surface with no client oracle, belongs to `management-api.md`'s era, and would put a claim in
  the matrix that no captured client backs. The per-file write boundary below is the honest
  v1 (the resolved write-boundary decision).
- **The legacy (Maven 1) layout.** The deploy plugin reference says "Maven 3 only supports
  Maven 2 repository layout"; no pinned client can request it.
- **HTML directory listings.** Central serves them, but no captured client reads one: Gradle
  with the artifact-level metadata removed failed with "no versions ... are available" rather
  than listing the directory, and Maven and Coursier never requested a directory URL. A
  browsing surface is UI-era work.
- **Signature verification.** Verifying a `.asc` against a trust set belongs to
  `docs/internal/plans/foundation/artifact-verification.md` (to be authored in the spec loop),
  per the verification-ownership decision `supply-chain-policy.md` adopted (was its Q6); this
  spec stores and serves signatures byte-identical and states what it requires of the producer
  (Design, "Signatures and provenance"). Repository-level signing does not exist in this
  ecosystem, so nothing is asked of the signing half of the shared service.
- **Serving a hosted `.module` the registry generated.** Gradle Module Metadata is produced by
  the publishing build and carries hashes of the files it names; a registry that synthesised
  one for a Maven-deployed artifact would be inventing variants Gradle then trusts. Files
  arrive or they do not.
- **The `archetype-catalog.xml` at the repository root.** Read only by `archetype:generate`,
  which was not exercised; it is a fourth generated document with the same shape as the group
  level, added by revising this spec when an oracle exists for it.
- **Gradle's Ivy-layout repositories and `artifactUrls`.** Different layout, different family.

## Design

### The wire surface, as captured

Every path below hangs off the repository's base URL, `/maven/{repository}/`, format-first per
`format-handler-interface.md`'s resolved URL-shape decision: Maven takes an arbitrary
repository URL from the POM, `settings.xml` or `-DremoteRepositories`, Gradle from `maven { url
}`, sbt from `resolvers`, Leiningen from `:repositories`, and no client needs root anchoring.

| Surface | Shape, as the pinned clients send it |
|---|---|
| Release resolution | `GET .../{g}/{a}/{v}/{a}-{v}.pom`, then, on Maven 3.8.8, 3.9.11, sbt and Leiningen, `GET .../{a}-{v}.pom.sha1`; the same pair for every transitive POM; then the jars and their `.sha1`. No metadata request of any kind for a fixed release version. Gradle 8.14.5 and 9.1.0 fetch the POM and the jar and **no sidecar at all**. Paths are case-sensitive (Central answers `404` to a wrong-case JUnit-4.13.2.pom) and no client folds anything |
| The `.module` redirect | Gradle fetches the POM first; when it carries the marker comment `do_not_remove: published-with-gradle-metadata` it then fetches `{a}-{v}.module` and resolves from it, ignoring the POM's dependencies. Without the marker the `.module` is never requested. `metadataSources { mavenPom(); ignoreGradleMetadataRedirection() }` suppresses the redirect (captured). Maven, sbt and Leiningen never request a `.module` |
| SNAPSHOT resolution | `GET .../{g}/{a}/{v}-SNAPSHOT/maven-metadata.xml` (Maven and sbt also its `.sha1`), then the files named by `snapshotVersions`: `{a}-{v}-{yyyyMMdd.HHmmss}-{n}.pom` and `.jar`, each with its `.sha1` on Maven and sbt. Coursier probes `{a}-{v}-SNAPSHOT.pom` and its `.sha1` **first**, takes the `404`, and only then reads the metadata. A warm Maven resolve on the same day makes zero requests (`updatePolicy` `daily`); `mvn -U` refetches only the version-level metadata and its `.sha1`; Gradle caches a changing module for 24 hours and `--refresh-dependencies` sends `HEAD` (with `Cache-Control: max-age=0`) for the metadata and every file and downloads nothing unchanged |
| Version enumeration | `GET .../{g}/{a}/maven-metadata.xml` (plus `.sha1` on Maven and sbt) for a Maven range or `RELEASE`, a Gradle `1.+`, `latest.release` or range, an sbt range. Maven 3.9.11 asked every configured repository for it and merged the answers client-side |
| Plugin prefix resolution | `GET .../{group as path}/maven-metadata.xml` for each `pluginGroup` in `settings.xml` and for `org/apache/maven/plugins` and `org/codehaus/mojo`, then the artifact-level document of the resolved plugin, its POM and jar |
| Deploy, release | One `PUT` per file, each followed by `PUT`s of its `.sha1` and `.md5` (Gradle also `.sha256` and `.sha512`); then `GET .../{g}/{a}/maven-metadata.xml` (Maven also its `.sha1`; a `404` is accepted), then `PUT` of a metadata document the client computed, with its checksums. Maven 3.9.11 sends the POM before the jar; Maven 3.8.8 and both Gradle releases send the jar first; the `.asc` files a signed Maven build attaches arrive **without** checksum sidecars (`omitChecksumsForExtensions` defaults to `.asc`). A `maven-plugin` deploy additionally `GET`s and `PUT`s the group-level document last |
| Deploy, SNAPSHOT | `GET .../{v}-SNAPSHOT/maven-metadata.xml` first (a `404` means build number 1), then the files under the timestamped names the client chose from its own clock and the read build number plus one, then `PUT` of the version-level document naming that build, then the artifact-level document. Gradle's version-level document lists `module` among the `snapshotVersions` |
| Request headers | Maven: `User-Agent: Apache-Maven/{version} (Java ...)`, `Cache-Control: no-cache, no-store`, `Pragma: no-cache`, `Accept-Encoding: gzip,deflate`, and `Expect: 100-continue` on every `PUT`, no `Accept`, never a conditional header. Gradle: `User-Agent: Gradle/{version} (...)`, the same `Accept-Encoding`, `Content-Type: application/octet-stream` on `PUT`. Coursier: `User-Agent: Coursier/2.0`. Leiningen: `User-Agent: Leiningen/2.13.0 (...)` |
| Authentication | Every read goes out anonymous first; a `401` with `WWW-Authenticate: Basic` is retried with `Authorization: Basic` from `settings.xml` `servers` (Maven) or `credentials {}` (Gradle), on both Maven and both Gradle releases. Every `PUT` carries `Authorization: Basic` **preemptively**, before any challenge, on all four; once a host has answered a challenge Maven 3.9.11 sends the header on the rest of the session while 3.8.8 re-challenges per file. Gradle with an explicit `BasicAuthentication` scheme sends Basic preemptively on reads too |
| Failure rendering | Maven prints `status code: 401, reason phrase: Unauthorized (401)` and exits 1; Gradle prints `Received status code 401 from server: Unauthorized`; neither shows a response body. A corrupt `.sha1` under the default `warn` policy makes Maven re-download the file once, print a checksum warning and continue; `mvn -C` fails the build; a file with neither `.sha1` nor `.md5` prints "Checksum validation failed, no checksums available" under `warn` and fails under `-C` |
| Transport | Maven 3.8.1 and later refuse any `http://` repository that is not on localhost through the default `maven-default-http-blocker` mirror ("Blocked mirror for repositories", captured on both); Gradle refuses an `http://` repository outright unless `isAllowInsecureProtocol = true` ("Using insecure protocols with repositories, without explicit opt-in, is unsupported", captured on 9.1.0) |

Three facts about the clients' caches shape every second-request assertion. Maven's local
repository remembers a release forever and a `404` on a SNAPSHOT file or metadata until the
`updatePolicy` elapses (`daily` by default), so a fresh `~/.m2/repository` is part of every
cold case and a stale `404` is a real consumer-visible failure. Gradle's dependency cache
answered a warm resolve with zero requests and a refreshed one with `HEAD`s only, so a case that
proves this registry served from cache asserts at the network layer against a fresh
`GRADLE_USER_HOME`. Coursier and Leiningen keep their own caches with the same consequence.

### Mapping onto the shared model

The levels are exactly those `data-model.md` provides; no table is added.

- `Package.name` holds `{groupId}:{artifactId}`, the coordinate every artifact-level and
  version-level document and every file path is keyed by; the two parts are stored verbatim,
  case-sensitive, because the layout is case-sensitive on every client and on Central and no
  folding exists to apply. The package-level document holds the **deploy-order state** the
  artifact-level document renders and no version row carries: which version was deployed last
  (`latest`), which release was deployed last (`release`), the time of the last write
  (`lastUpdated`), the package's **retirement set** (every deleted release file coordinate),
  and, for a `maven-plugin` artifact, the goal prefix read from the jar's
  `META-INF/maven/plugin.xml`.
- `Version.version` holds the base version: `1.0.0` for a release, `1.1.0-SNAPSHOT` for a
  SNAPSHOT. The version-level document holds, for a SNAPSHOT, the ordered list of timestamped
  builds (`timestamp`, `buildNumber`, arrival order, the `snapshotVersions` manifest each
  build's closing metadata `PUT` named, and whether the build is closed), and for both kinds
  the per-file attributes the layout needs and the shared model has no per-file document for:
  each file's classifier and extension, the four digests, its size, and the coordinate of the
  signature file that signs it. The join against the version's `File` rows is the same
  filename-keyed map `pypi.md` uses.
- Every file under a version directory that is not a checksum sidecar and not a
  `maven-metadata.xml` is a `File` of the version: the POM, the main artifact, every classifier
  artifact, the `.module`, and every `.asc`. Its `Blob` is keyed by the CAS digest of the bytes
  as received. Checksum sidecars are **not files**: they are rendered from the blob's digests
  (Design, "Checksums are served, never stored"). SNAPSHOT files keep their timestamped
  filenames, so `zzfoo-1.1.0-20260926.172458-2.jar` and the build after it are two `File` rows
  of one `Version`.
- The artifact-level and version-level `maven-metadata.xml` are generated documents stored in
  the package-level and version-level documents respectively; the group-level document is a
  map in the repository-level document keyed by group path (Design, "The generated
  documents"). A `remote` repository's documents cache the upstream's metadata instead.

### The generated documents: write-triggered, three levels, one service

`maven-metadata.xml` is the one thing on this wire a server produces, and the captured race is
the reason it cannot be anything else: two `mvn deploy` runs three milliseconds apart both read
a five-version document, both computed and `PUT` a six-version one, and the surviving document
lists 1.0.7 but not 1.0.6, whose directory exists. Both builds printed `BUILD SUCCESS`. A
registry that stores the client's document is a registry whose index silently loses versions
under exactly the concurrency a CI fleet produces.

Per the resolved metadata-generation decision below, every level is produced by the shared
signing and index service (`docs/internal/plans/foundation/signing-service.md`, to be authored
in the spec loop; charter build step 7, before this format) as a **write-triggered generated
document** in the sense `write-triggered-services-prototype.md` defines, and this spec states
what it requires of that service rather than defining the service's shape:

- **Regeneration inside the write that triggered it.** A file landing under `{g}/{a}/{v}`
  regenerates the artifact-level document of `{g}:{a}` (and the version-level document when
  `{v}` is a SNAPSHOT, and the group-level document of `{g}` when the package is a plugin), in
  the **same** completed logical write and the same snapshot as the file, so no snapshot ever
  serves a document that disagrees with its content set (`data-model.md`'s one-write-one-
  snapshot rule, and the prototype's question 3).
- **Under contention, both land.** Two concurrent writes into one artifact each produce a
  document that includes the other's result once both are complete; the captured lost update
  is impossible by construction, whatever order the writes commit in. This is the ordinary
  revision-token retry `data-model.md` makes mandatory, applied by the service rather than by
  each handler.
- **Unsigned.** Nothing in this ecosystem signs repository metadata; the service's signing half
  is not used by this format, which is why Maven precedes Helm in the step.
- **Sidecars and headers for the generated bytes.** The four checksum sidecars and the
  `x-checksum-*` headers of a generated document are computed from the generated bytes by the
  same rule as for any file (below), and the `ETag` derives from the package and the snapshot
  number, so a repoint changes it and a `304` costs nothing.
- **Stored, not rendered on request**, inline below `data-model.md`'s size threshold and as a
  CAS blob above it, which the fourth GC mark root protects (`storage-and-gc.md`). The
  artifact-level document of a long-lived artifact is small (Central's `commons-lang3` document
  is 1.1 KB), the group-level document of a plugin-heavy group is not (`org.apache.maven.plugins`
  lists every plugin), and the version-level document of a SNAPSHOT with many classifiers grows
  with them; the threshold decides, not the handler.
- **Virtual repositories merge.** A `virtual` repository's artifact-level document is the union
  of its members' `versions` in member order with `latest`, `release` and `lastUpdated` taken
  from the member whose `lastUpdated` is newest, its version-level document names the newest
  build across members, and its group-level document is the union of the members' `plugins`.
  Maven 3.9.11 performs exactly this merge client-side across its configured repositories
  (captured: it asked both the stub and Central for the same document), so a client pointed at
  one virtual URL sees what it would have seen with every member configured.

What each level carries, rendered from the model, matching the reference schema and the
captured client-written bodies field for field:

| Level | Path | Content |
|---|---|---|
| Artifact | `{g}/{a}/maven-metadata.xml` | `groupId`, `artifactId`, `versioning` with `latest` (the last version deployed, SNAPSHOTs included), `release` (the last **release** deployed; absent until one exists), `versions` in deploy order (release versions whose directory holds a POM, and every SNAPSHOT base version with at least one closed build), `lastUpdated` as `yyyyMMddHHmmss` UTC. No `modelVersion` attribute, as neither Maven nor Gradle writes one here |
| Version (SNAPSHOT only) | `{g}/{a}/{v}-SNAPSHOT/maven-metadata.xml` | `modelVersion="1.1.0"`, `groupId`, `artifactId`, `version` (the base version), `versioning` with `lastUpdated`, `snapshot` (`timestamp` as `yyyyMMdd.HHmmss` and `buildNumber` of the newest **closed** build), and `snapshotVersions` with one `snapshotVersion` per `(extension, classifier)` pair of that build (`extension`, `classifier` when present, `value` as `{v}-{timestamp}-{buildNumber}`, `updated`). A release version directory has no version-level document and answers `404` for it |
| Group | `{group as path}/maven-metadata.xml` | `plugins`, one `plugin` per `maven-plugin` package in the group with `name`, `prefix` and `artifactId`, the prefix read from the deployed jar's plugin descriptor. Groups with no plugins have no document and answer `404`, which is what Central answers for `zz/test` and what the client expects (captured: two `404`s and one `200` during a prefix resolution) |

`latest` and `release` are deploy-order fields, not version-order fields: the reference defines
them as "the last version added", and both clients wrote them that way (a `1.0.1` deployed
after `1.0.2` would become `release`). `RELEASE` and `LATEST` meta-versions and Gradle's
`latest.release` read them, so the registry keeps them as they are defined rather than sorting.

### The deploy path and what counts as a write

`data-model.md` requires each format spec to declare its ecosystem's write boundaries. The
Maven wire has no publish request: a deploy is a sequence of independent `PUT`s in an order
that differs by client, followed by metadata `PUT`s that mean "I am done" in a shape the
registry cannot trust. Maven's declaration, per the resolved write-boundary decision below:

- **Each artifact-file `PUT` is one completed logical write.** A release deployed as POM, jar
  and sources jar is three writes and three snapshots, faithful to a wire that publishes per
  file and whose reference implementation makes no batch atomic. The write regenerates the
  metadata levels it affects, as above.
- **A checksum `PUT` writes nothing.** The registry verifies the uploaded `.md5`, `.sha1`,
  `.sha256` or `.sha512` against the digest it computed for the file it names, answers `201` on
  a match, and refuses a mismatch with `400`, which Maven 3.9.11 turns into a failed deploy
  (`failOnChecksumUploadFailure` defaults to true) and which is the loud outcome for bytes
  corrupted in transit. A checksum `PUT` for a file that has not arrived is refused with `400`;
  every captured client sends the file first.
- **A `maven-metadata.xml` `PUT` writes nothing and is answered `201`** (the resolved
  client-metadata decision below). Its body is read for one purpose: a version-level `PUT`
  naming a SNAPSHOT build is the **close signal** for that build, and the `snapshotVersions`
  it lists is the build's manifest. The build becomes visible in the served version-level
  document only when every `(extension, classifier)` the manifest names has arrived under the
  build's timestamped filenames; a manifest naming a file that has not arrived is refused
  with `400` and the build stays unclosed. That gate is what keeps a consumer resolving
  mid-deploy from reading a `snapshot` whose jar answers `404` and caching that failure for a
  day. The artifact-level and group-level `PUT`s carry nothing the registry does not already
  know and are discarded after the `201`.
- **A release version becomes visible in `versions` when its POM has landed**, because every
  captured client resolves a version by fetching the POM first and a directory without one
  resolves nowhere. A jar landing before its POM (Maven 3.8.8, Gradle) is served at its path
  from its own write and enters the index with the POM's write.
- **Files are immutable per coordinate** (the resolved redeploy decision): a `PUT` whose bytes
  equal the stored file's is idempotent, answers `201` and creates no snapshot (a CI retry of a
  release deploy from the same build output); a `PUT` with different bytes to an existing
  coordinate is refused with `409`, which both Maven and Gradle report as a failed deploy. A
  release version directory may gain **new** files in later writes (sources or javadoc attached
  by a later `deploy:deploy-file`, a `.asc` attached later), because the ecosystem does that
  and nothing already published changes.
- **A SNAPSHOT build is a set of files under one timestamp and build number** the client
  chose; two clients that both read `buildNumber` 2 and both deploy `-3` under different
  timestamps produce two builds with distinct filenames, both stored, both served, the
  version-level document naming the one that closed last. The registry orders builds by close
  order because that is what a repository observes; the client's clock is not trusted for
  ordering. A `PUT` under a base-version filename (`{a}-{v}-SNAPSHOT.jar`) is refused with
  `400` naming the timestamped form, and a `GET` for one answers `404`, which Coursier expects
  (the resolved base-version decision).
- **Each management operation is one write**: deleting a version removes its files from the
  head snapshot and records every release file coordinate in the retirement set within the same
  write; deleting a file does the same for one coordinate; pruning SNAPSHOT builds removes
  whole builds and is one write however many it removes, per `data-model.md`'s bulk-operation
  rule.
- A proxied repository creates no snapshots at all; metadata arrival and revalidation are
  cache materialisation.

The `Expect: 100-continue` every Maven `PUT` carries is answered with `100 Continue` before the
body is read, as Go's server does by default; a server that ignores it costs each of the
dozens of `PUT`s in a deploy a client-side wait.

### Checksums are served, never stored

Checksum sidecars are the ecosystem's integrity primitive and its weakest: `.sha1` and `.md5`
are the defaults every client writes and Maven, sbt and Leiningen read, `.sha256` and `.sha512`
are what Gradle additionally writes and what Central accepts but did not retain for the sampled
Gradle-published artifact, and Gradle reads none of them during resolution. Per the resolved
checksum-serving decision below:

- **Every file's four sidecars are rendered from the store's own digests**, on both paths and
  whether or not the uploader or upstream sent them: `.md5`, `.sha1`, `.sha256`, `.sha512`, hex
  without a trailing newline as every captured client writes them. The CAS key is the server's
  sha256 (`storage-and-gc.md`: format-level checksums are metadata, never keys); the other
  three are computed at ingest and kept in the version-level document.
- **The `x-checksum-sha1` and `x-checksum-md5` response headers** Central sends and the
  resolver's expected-checksums page documents are sent on every file and metadata response.
  Captured: with the headers present, Maven 3.9.11 made **zero** sidecar requests for a
  two-artifact resolve that otherwise costs four; Maven 3.8.8 ignores the headers and fetches
  the sidecars, which are there.
- **Checksums are not served for checksums or signatures**: a request for `x.jar.sha1.md5` or
  `x.jar.asc.sha1` answers `404`, as Central does, because Maven never uploads or requests them
  and a sidecar for a sidecar is noise.
- **A sidecar served is always right.** A corrupt sidecar on a plain file server makes Maven
  re-download once and warn (default) or fail (`-C`); a registry cannot produce that state,
  because it never stores a sidecar. What it can do is refuse a client-uploaded checksum that
  disagrees with the bytes it received, which is the only place a mismatch can originate.

### Names and versions: nothing folds

Unlike NuGet, PyPI and Cargo, this format has no normalisation and no folding, and the trap
is in the opposite direction: a registry that helpfully case-folds or normalises would serve
content under coordinates no client asked for. Group and artifact identifiers are matched
byte for byte on every route; version strings are matched byte for byte; `1.0` and `1.0.0` are
two versions; a request for JUnit-4.13.2.pom under junit/junit/4.13.2/ answers `404` as
Central does. The one grammar the registry parses is the SNAPSHOT filename,
`{a}-{v}-{yyyyMMdd.HHmmss}-{n}[-{classifier}].{ext}` under a `{v}-SNAPSHOT` directory, which
the reference defines and every client writes; a file under a SNAPSHOT directory that fits
neither that grammar nor the base-version form is refused with `400`.

### Gradle Module Metadata, and how Gradle's resolution differs from Maven's

The `.module` file is Gradle's richer model, published alongside the POM by `maven-publish`
(captured: `zzgradle-1.0.0.module`, `formatVersion` `1.1`, `component`, `createdBy`, two
variants each listing the jar with `size`, `sha512`, `sha256`, `sha1` and `md5` and relative
`url`), and the published POM carries the marker comment that tells Gradle to prefer it. To
this registry it is an ordinary file of the version, stored and served byte-identical, with
its four sidecars rendered like any other. The differences a registry must know:

| Concern | Maven (and sbt, Leiningen) | Gradle 8.14.5 and 9.1.0 |
|---|---|---|
| Metadata read for a fixed version | POM only; a `.module` beside it is never requested | POM first; `.module` only when the POM carries the marker; then the POM's dependencies are ignored in favour of the module's variants |
| Checksum sidecars on read | `.sha1` for every file (`.md5` fallback), or the `x-checksum-*` headers on 3.9 | None during resolution. Dependency verification, when a project enables it, compares against checksums in `gradle/verification-metadata.xml` and fetches `.asc` files for signature verification |
| Dynamic versions | Ranges and `RELEASE`/`LATEST` from the artifact-level document; a range `[1.0,2.0)` selected the 1.1.0-SNAPSHOT on 3.9.11 | `1.+`, `latest.release`, `latest.integration` and ranges from the artifact-level document; `1.+` and `[1.0,2.0)` selected the 1.1.0-SNAPSHOT, `latest.release` selected the 1.0.0 release; with the document absent the build fails and no directory is listed |
| Changing modules | `updatePolicy` per repository, `daily` by default; `-U` refetches the version-level document | 24 hours by default; `--refresh-dependencies` sends `HEAD` for the metadata and every cached file, `Cache-Control: max-age=0`, and re-downloads only what the `HEAD` reports changed |
| Publish order | POM first (3.9.11) or jar first (3.8.8); `.sha1` and `.md5` | Jar, POM, `.module`, each with `.sha1`, `.md5`, `.sha256` and `.sha512`; the version-level SNAPSHOT document lists `module` among its `snapshotVersions` |
| Credentials | Basic after a `401`; preemptive on `PUT` | The same by default; `BasicAuthentication` makes reads preemptive |
| Plain HTTP | Blocked unless on localhost, through the default mirror | Refused unless `isAllowInsecureProtocol` |

The catalogue asks whether Gradle diverges enough from Maven to need its own handler under the
resolved family-divergence decision. It does not: every Gradle request is a path the layout
already defines, the `.module` is a file, and the divergence is in what the client reads, not
in what the server serves. The `HEAD` support and the four-sidecar rendering are the whole of
what Gradle asks of the server beyond Maven, and both are in this handler.

### Signatures and provenance

A Maven build signed with `maven-gpg-plugin` attaches a detached ASCII-armoured PGP signature
per file (`{a}-{v}.pom.asc`, `.jar.asc`, `-sources.jar.asc`, captured), uploaded without
checksum sidecars; Central requires one per file and Gradle's dependency verification fetches
them from the repository when a project trusts signatures. To this registry a `.asc` is a file
of the version bound to the file it names, stored and served byte-identical, with no sidecars
of its own, on both paths.

What Maven requires of the shared services, stated so the dependency cannot be lost:

- Of `docs/internal/plans/foundation/artifact-verification.md` (to be authored in the spec
  loop): verification of a detached PGP signature over the file it names against a per-
  repository trust set (key servers as Gradle uses them, or an operator-imported keyring),
  yielding the per-digest verdict `supply-chain-policy.md` consumes and the signer identity;
  and a position on a file that arrives unsigned into a repository whose policy requires
  signatures, which is that spec's rule-binding refusal, not this handler's.
- Of `docs/internal/plans/foundation/signing-service.md` (to be authored in the spec loop):
  nothing beyond the unsigned index generation above. Maven repositories are not signed at the
  repository level, and a registry signature over `maven-metadata.xml` would be read by no
  client.

Advisory matching for Maven coordinates is the policy engine's coordinate-level path (OSV
carries the `Maven` ecosystem with `groupId:artifactId` names) and needs no handler
cooperation; the component inventory catalogues jars as it does any archive.

### Management operations

Every management operation on this format is client-less: no build tool deletes, retires or
prunes, and Central never deletes at all. Per the cross-format precedent (`pypi.md`'s resolved
hosted-yank decision, with `npm.md`, `ansible-collections.md`, `cargo.md` and `nuget.md`),
each is an operation of the registry-owned management API,
`docs/internal/plans/foundation/management-api.md` (to be authored in the spec loop), with no
client binding, because there is no client route to bind:

| Operation | Effect a client sees | Action |
|---|---|---|
| Delete a version (release or SNAPSHOT base version) | Its directory answers `404`, the artifact-level document omits it and `latest`/`release` move to the previous deploy, every release file coordinate is retired | `delete` |
| Delete a file | The file answers `404`, its sidecars with it; the coordinate is retired; a version whose POM is deleted leaves `versions` | `delete` |
| Prune SNAPSHOT builds (keep the newest N, or those newer than a cutoff) | The pruned builds' files answer `404`, the version-level document names the newest surviving build, the base version stays listed | `delete` |

Rules, applying the precedent rather than re-deciding it: each operation is one completed
logical write through the shared write path, exactly one snapshot, none for a refused one, no
blob-store object deleted directly; authorization is the settled `(repository, action)`
vocabulary with no new action, every operation here being removal-class; hosted only, a
proxied repository taking its removals from the upstream per the removal table; the trigger is
verified by this registry's integration tests and every effect by a real client. What this
format requires of `management-api.md`: the three operations above reporting the objects named
in "Addressed objects and pattern scopes", the retirement set carried forward by every later
write and preserved across a backwards repoint (`data-model.md` AC33's obligation on that
surface), and pruning as one write.

A retired release coordinate is never republishable, with the same bytes or different ones,
the cross-format rule the sibling specs adopted; the version string itself is not retired, so
a deleted 1.0.6 whose sources jar was never deployed still refuses `ZzBar-1.0.6.jar` but a
new `1.0.8` deploys normally. SNAPSHOT build filenames are unique by construction, so pruning
retires nothing.

### Authentication: Basic after a challenge, preemptive on PUT

The captured form is HTTP Basic on every client, in two modes. Reads go out anonymous and are
retried with `Authorization: Basic` after a `401` carrying `WWW-Authenticate: Basic`; writes
carry the header before any challenge (the resolver's `preemptivePutAuth` default, and Gradle
behaves identically). How this meets `auth.md`, whose rules this spec does not bend:

- **The form is the token-as-password convention** `auth.md` already defines for pip and names
  for `mvn` in its client table: the registry token in the password field, the username not an
  authentication input. The harness writes the issued token into `settings.xml` as the
  `server` password for the repository id (Maven, Leiningen, which reads the same file through
  `:repositories` credentials) and into `credentials {}` (Gradle) or `Credentials(...)` (sbt);
  nothing new is asked of the `setup` vocabulary. `auth.md`'s table row for `mvn` is now
  confirmed against captured traffic, as that spec requires before a format's auth cases are
  written, and the Gradle, sbt and Leiningen forms are listed in this spec's sibling
  consequences for that table.
- **The challenge is uniform and not an existence oracle.** A credential-less request under a
  repository that is not anonymously readable answers `401` with `WWW-Authenticate: Basic
  realm="..."`, whether the repository is private, missing or someone else's, the mechanism
  `cargo.md`, `oci.md` and `nuget.md` already use; a request carrying a valid credential that
  lacks `pull` answers `404`, indistinguishable from a missing repository (`auth.md` AC17). A
  rejected credential answers `401` and is never served as anonymous (`auth.md` AC12); Maven
  and Gradle both stop at the first `401` after their retry.
- **Preemptive `PUT` needs no challenge**, so a deploy on a private repository costs no extra
  round trip; a `PUT` without a credential, or with one lacking `push`, answers `403` on a
  repository the caller can read (the client shows the status), and the uniform `401` on one
  it cannot.
- **TLS.** `auth.md` requires TLS on every credential-bearing path and refuses plaintext
  credentials unless the operator's explicit flag is set (its AC27). The clients enforce it
  from their side too: Maven blocks external `http://` repositories and Gradle refuses them
  without an opt-in, so this registry's externally visible base URL is `https://` in every
  configuration the documentation shows. The harness's transcript capture therefore terminates
  TLS with its CA injected into each client container's trust store (a Java truststore
  passed through `MAVEN_OPTS`, `GRADLE_OPTS`, `SBT_OPTS` and `JVM_OPTS`), the per-client
  injection `conformance-harness.md` leaves to each format.

### Addressed objects and pattern scopes

`auth.md`'s pattern scopes narrow a credential within one repository by matching the object
each request addresses, and the format declares which object each route reports ("Pattern
scopes" there; `format-handler-interface.md` AC12). The canonical object is the **layout path
of the thing addressed, relative to the repository root**, because it is the one form every
client already computes, it is case-sensitive as the clients are, and the pattern grammar's `/`
and `**` map onto group, artifact and version directories with no translation: `zz/acme/**`
grants a group, `zz/acme/tool/**` an artifact, `zz/acme/tool/1.0.0/**` one version.

| Route | Object kind | Canonical object |
|---|---|---|
| Artifact file (POM, jar, classifier, `.module`, `.asc`) and its checksum sidecars, `GET` and `HEAD` | named | `{group as path}/{artifactId}/{version}/{filename}` |
| Version-level `maven-metadata.xml` and its sidecars | named | `{group as path}/{artifactId}/{version}` |
| Artifact-level `maven-metadata.xml` and its sidecars | named | `{group as path}/{artifactId}` (it enumerates versions of one artifact, the finest named thing) |
| Group-level `maven-metadata.xml` and its sidecars | none | - (it enumerates the artifacts of a group, a listing) |
| Artifact-file `PUT` | named | `{group as path}/{artifactId}/{version}/{filename}`, from the URL; the body is not read before authorization |
| Checksum `PUT` | named | the object of the file it names |
| Version-level metadata `PUT` | named | `{group as path}/{artifactId}/{version}` |
| Artifact-level and group-level metadata `PUT` | named / none | `{group as path}/{artifactId}` for the artifact level; none for the group level, which a patterned credential is refused and which every client tolerates as a failed final `PUT` only when the deploy is a plugin |
| A directory URL | none | - (answers `404` in any case) |

What that gives and costs, applying `auth.md`'s rules rather than re-deciding them. Nothing on
this format fetches a repository-wide document first, so a credential holding **only** a
patterned `pull` under `zz/acme/**` resolves every `zz.acme` artifact and its dependencies
inside the pattern through a real `mvn` or `gradle` run, and fails on the first dependency
outside it, which is the useful narrowing for a team's own group. A patterned credential is
refused the group-level document, so plugin prefix resolution (`mvn zzp:hello`) fails under it
while an explicit `zz.acme:zzp-maven-plugin:1.0.0:hello` succeeds; the artifact-level `PUT` a
plugin deploy ends with is in the pattern, the group-level one is not, and Maven fails the
deploy on that last `PUT` after every file has landed, so a patterned `push` credential can
deploy libraries but not plugins, which AC12 asserts rather than leaving implied. The
management operations report the version and file objects above.

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines, on a
file, sidecar or metadata route of either path, the handler answers `403` with a `text/plain`
body naming the policy and rule, or naming the signal for a coordinate condemned under the
shared security-signal rule. `403` rather than the existence rule's `404`, because the caller
is authorized and the content is what is refused. The body reaches nobody through the pinned
clients: Maven prints `status code: 403, reason phrase: Forbidden (403)` and Gradle `Received
status code 403 from server: Forbidden`, both captured for `401` with the same rendering path,
and Go's server writes the reason phrase from the status code alone, so the body is for `curl`
and the transcript. That is the reason-phrase risk `pypi.md` named, confirmed here for two
more clients and carried to `supply-chain-policy.md` as a finding rather than worked around.

### The proxied path

The handler owns the request and classifies for the proxy layer's fetch-and-cache API per the
settled decisions in `proxy-cache.md`; the upstream is a plain-layout base URL (Maven Central,
a private repository, an Artifactory or Nexus virtual URL), validated at configuration to be
`https://` unless the plaintext flag is set and to answer a metadata or file probe with a body
rather than an HTML page (AC21).

- **No URL rewriting exists on this format.** Nothing a Maven repository serves carries an
  absolute URL: metadata names versions, the `.module` names files by relative `url`, and a
  POM's own `<repositories>` block is a client-side routing directive (Maven follows it from
  the consuming build, and blocks it when it is `http://`), exactly as `cargo.md` treats the
  index `registry` field. This registry therefore serves every upstream byte of a file
  unmodified and has no externally-visible-base-URL dependency on this path; the first format
  in the catalogue of which that is true.
- **Release files are immutable artifacts**, cached indefinitely: Central never replaces a
  published file (its immutability policy is the ecosystem's own rule), and a SNAPSHOT build's
  timestamped files are immutable by name. The fetch is **stream-and-verify against the
  strongest sidecar the upstream serves** (`.sha512`, `.sha256`, `.sha1`, `.md5` in that
  order, fetched before the file; or the `x-checksum-sha1` header the resolver documents,
  which Central sends), never committed on a mismatch or a truncated body. An upstream that
  serves neither a sidecar nor a header (a plain file server with a partial layout) uses the
  completion-only fetch-and-cache mode `go-modules.md` and `nuget.md` requested of
  `proxy-cache.md`, and the CAS digest of the complete body is recorded. Served sidecars and
  headers are then rendered from the store's digests, so a correct upstream sidecar and ours
  are byte-identical.
- **`maven-metadata.xml` at every level is mutable metadata with a TTL.** Central serves
  `ETag` (the MD5) and `Last-Modified` with no `Cache-Control`, answered `304` to
  `If-None-Match` and `200` to `If-Modified-Since` (captured), so revalidation uses the entity
  tag; an upstream that serves neither is refetched whole at the TTL. Clients' own conditional
  requests (`HEAD` with `max-age=0`, `If-None-Match`) are answered from the cache under this
  registry's `ETag` inside the TTL.
- **The `.module` and every `.asc` are immutable artifacts** fetched like any file, verified
  against their own sidecars where the upstream serves them (Central serves `.asc` without any).
- **Missing coordinates are negatively cached** with the short TTL: a `404` on a POM is how a
  client learns a version does not exist in this repository and moves to the next, a `404` on
  a `.sha1` makes Maven ask for `.md5`, and a `404` on a `.module` is the normal answer for
  every Maven-published artifact Gradle resolves, so the negative cache absorbs three
  predictable misses per artifact on a CI fleet. A `429` or `5xx` is never cached as absence
  (`proxy-cache.md` AC9). A `404` on a SNAPSHOT file named by a cached version-level document
  is the one miss that is **not** negatively cached: it means the upstream pruned or is
  mid-deploy, and the next request revalidates the document instead.
- **Directory URLs answer `404`** on both paths; the upstream's HTML listings are never fetched.
- **Deploy and management operations against a `remote` repository answer `405`.**

Upstream removal maps onto the settled purge-or-flag table as Maven's side of that contract:

| Upstream event, as observed at revalidation | Classification |
|---|---|
| A release file re-fetched after eviction differs from the recorded digest, or its upstream sidecar now disagrees with the cached bytes | An **immutability violation** treated as the explicit signal: purge and alert, because the ecosystem's own rule is that a release coordinate implies its bytes, and every consumer that verified the old `.sha1` would otherwise disagree with this registry |
| A release version vanishes from the artifact-level document, or its files answer `404` | Keep serving, record an operator-visible divergence. Central does not delete; a private upstream that did has no wire to say why, and the wire carries no yank, quarantine or holding-package convention at all, so no explicit Maven security signal exists on this channel |
| A SNAPSHOT build vanishes (the version-level document names a newer build, or the old build's files answer `404`) | An ordinary metadata change: snapshot repositories prune old builds routinely, the cached build stays servable until eviction, and the document is refreshed at the TTL |
| `latest`, `release`, `lastUpdated` or the `plugins` block change | An ordinary metadata change, propagated at the next revalidation |

Detection happens at revalidation, passively, per `proxy-cache.md`'s resolved passive-detection
decision (was Q12); the active channel is the policy engine's advisory feed, which carries the
`Maven` ecosystem through OSV and is the only channel that condemns a Maven coordinate as
malicious, under the shared security-signal rule.

### Conformance, the pinned clients and the corpus

The two pinned Maven releases straddle two real watersheds: 3.8.8 carries resolver 1.6, which
ignores the `x-checksum-*` headers, uploads the jar before the POM and takes the legacy
`id::default::url` deployment syntax; 3.9.11 carries resolver 1.9, which honours the headers
(zero sidecar requests, captured), uploads the POM first, and refuses the legacy syntax. Both
block external `http://`. The two pinned Gradle releases, 8.14.5 and 9.1.0, behaved
identically on every captured route, which is itself the finding: the Gradle 9 major changed
nothing on this wire. sbt 1.13.0 (Coursier, whose base-version probe precedes every SNAPSHOT
resolution) and Leiningen 2.13.0 (Maven's resolver behind Clojure) pass the install cases as
family clients (AC19). Every hosted and proxied case runs on both Maven and both Gradle
releases; the header case runs on 3.9.11 and asserts the sidecar requests on 3.8.8 as its
negative.

The recorded surface for the replay corpus, named now because a thin recording script yields a
thin specification: reads against Central (a cold Maven resolve with a transitive dependency,
the same on Gradle with a Gradle-published artifact so the marker redirect replays, a range and
a `RELEASE` resolution, a plugin prefix resolution, a `.asc` fetch, and a missing version);
and writes against a plain-layout reference server run in a container and pinned by digest,
because no public Maven repository accepts a test deploy (a release deploy on each Maven
release, a Gradle publish with `.module`, two SNAPSHOT deploys on each, a duplicate redeploy,
a signed deploy, a plugin deploy, and the `401` challenge on a read followed by a preemptive
`PUT`). Recording gates on the harness's redaction criterion (`conformance-harness.md` AC13);
the Basic value is exactly the kind of header an allowlist must name. Every deliberate
divergence from a plain file server goes on the recorded exception list before its flow is
expected to replay: the four sidecars and the `x-checksum-*` headers served for
Maven-deployed files, the `201` that discards a client's metadata `PUT`, the `409` on a
changed-bytes redeploy, the `404` on directory URLs and on base-version SNAPSHOT filenames,
and the generated metadata's field order.

## Acceptance Criteria

- [ ] AC1: `mvn dependency:resolve` and `mvn dependency:get` resolve a release and its transitive
      dependency from a hosted repository configured as a format-first URL, on both pinned
      Maven releases (3.8.8 and 3.9.11), with the transcript showing each POM and jar fetched
      by its layout path and no metadata request; a warm resolve makes zero requests and a
      resolve from a fresh local repository makes them again, both asserted at the network
      layer; and a request under any other case of a group, artifact, version or filename
      answers `404`.
- [ ] AC2: `mvn deploy` of a release is accepted on both pinned Maven releases, in each client's
      own upload order, with every file `PUT` answered `201`, every checksum `PUT` verified
      against the stored digest and a mismatched one refused with `400` failing the deploy,
      the client's `maven-metadata.xml` `PUT` answered `201` and discarded, the
      `Expect: 100-continue` of every `PUT` answered before the body, and exactly one snapshot
      per artifact file; the artifact-level document served afterwards carries `groupId`,
      `artifactId` and a `versioning` block listing the version with `latest`, `release`,
      `versions` and `lastUpdated` in the reference's format and none of the client-written
      body's bytes, and a subsequent resolve from a fresh local repository downloads exactly the
      deployed bytes.
- [ ] AC3: Two consecutive SNAPSHOT deploys of one base version, once through Maven 3.9.11 and
      once through Gradle 9.1.0, store both timestamped builds; the version-level document
      names the newer build's `timestamp` and `buildNumber` in `snapshot` and, under
      `snapshotVersions`, one `snapshotVersion` per extension and classifier the client's
      manifest listed (`module` included for Gradle), `modelVersion` `1.1.0`, and the
      artifact-level document lists the base version; a fresh resolve on every pinned client
      downloads the newest build's files, a same-day Maven resolve under the default
      `updatePolicy` of `daily` makes zero requests, `mvn -U` refetches only the version-level document and its `.sha1`, and
      `gradle --refresh-dependencies` sends `HEAD`s and downloads nothing; a build whose
      manifest `PUT` names a file that has not arrived is refused with `400` and is absent from
      the served document until it arrives.
- [ ] AC4: Two `mvn deploy` runs of two release versions of one artifact executed concurrently
      both succeed and the served artifact-level document lists both versions, the captured
      lost update being impossible; two concurrent SNAPSHOT deploys that both read `buildNumber`
      `n` both land under distinct timestamped filenames, both are served, and the document
      names the one closed last; and the regenerated document commits in the same snapshot as
      the file that triggered it, proven by repointing to that snapshot's predecessor and
      reading the previous document.
- [ ] AC5: A `PUT` to an existing release coordinate with identical bytes answers `201` and
      creates no snapshot, a `PUT` with different bytes answers `409` and both `mvn deploy` and
      `gradle publish` exit non-zero, a new classifier file added to an existing release version
      is accepted as its own write, a `PUT` under a base-version SNAPSHOT filename answers `400`,
      a `GET` for one answers `404` and sbt's probe of it then resolves through the
      version-level document, and a file under a SNAPSHOT directory that fits neither grammar
      answers `400`.
- [ ] AC6: Every file and generated document is served with `.md5`, `.sha1`, `.sha256` and
      `.sha512` sidecars rendered from the store's digests and with the `x-checksum-*` pair of
      headers, `x-checksum-sha1` and `x-checksum-md5`, on the hosted and the proxied path, whether or not the uploader
      or upstream supplied them; a resolve on Maven 3.9.11 makes zero sidecar requests while
      the same resolve on 3.8.8 fetches each `.sha1` and passes under `mvn -C`; and a request
      for a checksum of a checksum or of a `.asc` answers `404`.
- [ ] AC7: `gradle publish` on both pinned Gradle releases stores the `.module` as a file of the
      version with the marker comment in the POM; a fresh Gradle resolve fetches the POM, then
      the `.module`, then the jar, and resolves the module's dependencies; the same version
      resolves through Maven, sbt and Leiningen from the POM with no `.module` request; and a
      Gradle repository declared with `mavenPom()` and `ignoreGradleMetadataRedirection()`
      resolves from the POM alone, all asserted from the transcript.
- [ ] AC8: A Maven range `[1.0,2.0)` and a `RELEASE` meta-version, Gradle `1.+`,
      `latest.release` and a range, and an sbt range each read the artifact-level document and
      select the version the captured clients selected (the SNAPSHOT for the ranges and `1.+`,
      the newest release for `RELEASE` and `latest.release`), with `latest` and `release`
      reflecting deploy order rather than version order; and a Gradle dynamic version against
      an artifact with no document fails naming no versions while the registry serves no
      directory listing.
- [ ] AC9: A `maven-plugin` deployed on either pinned Maven release yields a group-level
      document whose `plugins` block carries the plugin's `name`, `prefix` and `artifactId` read
      from the jar's plugin descriptor, and `mvn {prefix}:{goal}` with the group in
      `pluginGroups` resolves and runs the plugin through this registry on both releases, the
      transcript showing the group-level, artifact-level, POM and jar requests; a group with no
      plugins answers `404` for the document.
- [ ] AC10: Deleting a version, deleting a file and pruning SNAPSHOT builds through the
      registry-owned management API each produce exactly one snapshot, the affected files and
      sidecars answer `404`, the served documents omit what was removed and `latest`, `release`
      and `snapshot` move to the previous deploy or newest surviving build; a later `PUT` of a
      deleted release coordinate is refused as AC5 refuses changed bytes, with the same bytes or
      different ones, including after the deletion's snapshot has been pruned out of retention;
      a principal without `delete` is refused with no snapshot created; and every operation
      against a proxied repository is refused.
- [ ] AC11: On a private repository a credential-less read answers `401` with
      `WWW-Authenticate: Basic` byte-identical for a private and a non-existent repository, both
      pinned Maven releases then resolve with the token as the `settings.xml` server password
      and both pinned Gradle releases with `credentials {}`, every `PUT` of a deploy arrives
      with `Authorization: Basic` before any challenge on all four, Gradle with
      `BasicAuthentication` sends it on reads too, a rejected credential answers `401` and is
      never served as anonymous with each client exiting non-zero naming the status, a valid
      token lacking `pull` answers `404`, a credential-less `PUT` on a readable repository
      answers `403`, and a credential presented over a connection this registry did not
      terminate with TLS is refused per `auth.md` AC27.
- [ ] AC12: A token holding `pull` and `push` under the pattern `zz/acme/**` deploys and resolves
      `zz.acme:tool` through real `mvn` and `gradle` runs and is refused deploying or resolving
      `zz.other:tool`, with no snapshot created by a refusal; a token holding only `pull` under
      the same pattern resolves an in-pattern artifact and its in-pattern dependencies, fails on
      an out-of-pattern dependency, is refused the group-level document so `mvn {prefix}:{goal}`
      fails while the explicit plugin coordinate succeeds, and a patterned `push` deploy of a
      plugin fails on its final group-level `PUT` after every file has landed; and in proxied
      mode the patterned-`pull` token resolves an in-pattern artifact and is refused another.
- [ ] AC13: A file, sidecar or metadata request the shared policy layer refuses answers `403`
      with a `text/plain` body naming the policy, on the hosted and the proxied path, and real
      `mvn` and `gradle` resolves of the refused version exit non-zero naming the status, with
      the body captured in the transcript.
- [ ] AC14: The proxied path resolves a release and its dependency from a plain-layout upstream
      stand-in and, from fresh client caches, a second resolve on each pinned client reaches
      this registry while the upstream receives no request, both asserted at the network layer;
      every served file is byte-identical to the upstream's and was verified against the
      strongest sidecar or the `x-checksum-sha1` header the stand-in served before being
      committed, a stand-in serving neither uses the completion-only mode and a truncated body
      is never committed; a missing version's POM, a missing `.module` and a missing `.sha1`
      are each negatively cached while a `429` or `5xx` is not; and no served document carries
      any upstream URL because none exists.
- [ ] AC15: A proxied artifact-level and version-level document are revalidated after their TTL
      and not before, with `If-None-Match` so an unchanged document costs a `304` upstream; a
      SNAPSHOT build deployed upstream becomes visible to `mvn -U` and `gradle
      --refresh-dependencies` after the TTL and, absent an explicit refresh, not before; a
      client `HEAD` or `If-None-Match` inside the TTL is answered from the cache; and a `404` on
      a SNAPSHOT file the cached document names triggers a document revalidation rather than a
      negative-cache entry.
- [ ] AC16: A re-fetched release file whose bytes differ from the recorded digest, or whose
      upstream sidecar disagrees with the cached bytes, purges that file's cached references and
      raises the operator alert; a release version vanishing upstream keeps serving with a
      divergence recorded; a pruned SNAPSHOT build propagates as an ordinary metadata change;
      and a coordinate condemned through the advisory feed is refused with no upstream request:
      Maven's side of the settled removal table in `proxy-cache.md` (its AC13).
- [ ] AC17: `HEAD` on every file and document route answers the `ETag`, `Last-Modified` and
      `Content-Length` its `GET` answers, a `GET` with a matching `If-None-Match` answers `304`,
      and `gradle --refresh-dependencies` against an unchanged hosted SNAPSHOT sends `HEAD`s
      carrying `Cache-Control: max-age=0` and downloads nothing, asserted from the transcript.
- [ ] AC18: A release deployed by a GPG-signing Maven build stores each `.asc` as a file of the
      version and serves it byte-identical with no sidecars of its own, Gradle dependency
      verification with the signing key trusted passes against this registry and fails against
      a tampered signature, and a `.asc` fetched through the proxied path is byte-identical to
      the stand-in's.
- [ ] AC19: sbt 1.13.0 and Leiningen 2.13.0, each pinned by image digest, pass this format's
      resolve cases on both paths as the client (AC1, AC3 and AC14), appearing in the matrix's
      Client column under the Maven row; and Apache Ivy either passes the same cases before this
      format is advertised or is struck from the catalogue's multiplier table, per the
      catalogue's client-reach criterion (its AC2).
- [ ] AC20: Replay-match passes against a corpus recorded from Central and from the pinned
      plain-layout reference server covering the recorded surface named in Design.
- [ ] AC21: Configuring a remote repository whose upstream URL is `http://` without the
      plaintext flag, or that answers an HTML page to a metadata probe, is refused at
      configuration with a message naming the requirement; a deploy or management operation
      against a remote repository answers `405`; and a virtual repository's artifact-level
      document is the member-ordered union of its members' `versions` with `latest`, `release`
      and `lastUpdated` from the newest member, its version-level document names the newest
      build across members, and its group-level document the union of their `plugins`, each
      proven by a real resolve that succeeds only through the merge.
- [ ] AC22: Every level of `maven-metadata.xml` on the hosted path is produced by the shared
      index service inside the triggering write, never by the handler and never from a client
      body, proven by an architecture test that the handler package holds no metadata renderer
      and by a document above the inline size threshold being stored as a CAS blob, protected
      across a GC sweep by the CAS-backed-metadata mark root, and served to a real client
      afterwards; and the `ETag` of every generated document changes on a repoint.
- [ ] AC23: An `http://` externally visible base URL is refused at configuration unless the
      plaintext flag is set, and with TLS terminated by the harness with its CA in each client's
      truststore, every pinned client resolves and deploys with no insecure-protocol opt-in on
      the client side.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/maven/hosted_test.go` (both pinned Maven releases; `dependency:resolve` and `dependency:get`; fresh `~/.m2/repository` in setup; network-level zero-request assertion; wrong-case requests through `curl`) |
| AC2 | conformance + integration | `conformance/maven/deploy_test.go` (deploy on each release, checksum mismatch injected by a scripted `PUT`, byte comparison after a fresh resolve); `internal/format/maven/deploy_test.go` (snapshot count per file, `100 Continue` timing, metadata body discarded) |
| AC3 | conformance + integration | `conformance/maven/snapshot_test.go` (Maven 3.9.11 then Gradle 9.1.0 deploys; resolve on all four pinned clients; `-U` and `--refresh-dependencies` transcripts); `internal/format/maven/snapshot_gate_test.go` (manifest naming an absent file refused, build unclosed) |
| AC4 | integration + conformance | `internal/format/maven/concurrent_deploy_test.go` (two release writers, two SNAPSHOT writers, document assertions, predecessor repoint); `conformance/maven/concurrent_test.go` (two real `mvn deploy` containers started together) |
| AC5 | conformance + integration | `conformance/maven/immutability_test.go` (identical and changed-bytes redeploys on `mvn` and `gradle`, base-version probe by sbt); `internal/format/maven/immutability_test.go` (snapshot count unchanged on the idempotent case, grammar refusals) |
| AC6 | conformance + unit | `conformance/maven/checksums_test.go` (header case on 3.9.11 with zero sidecar requests; 3.8.8 sidecar fetches under `-C`; `curl` for the four sidecars and the `404`s); `internal/format/maven/checksum_render_test.go` (digests per algorithm, sidecar-of-sidecar refusal) |
| AC7 | conformance | `conformance/maven/module_test.go` (publish on both Gradle releases; consume on Gradle, Maven, sbt and Leiningen; the `metadataSources` variant) |
| AC8 | conformance + integration | `conformance/maven/dynamic_versions_test.go` (each client's selectors; the no-document failure); `internal/format/maven/metadata_order_test.go` (`latest` and `release` by deploy order) |
| AC9 | conformance + integration | `conformance/maven/plugin_prefix_test.go` (plugin deploy and `mvn {prefix}:{goal}` on both releases); `internal/format/maven/plugin_descriptor_test.go` (prefix read from `plugin.xml`, `404` for a plugin-less group) |
| AC10 | integration + conformance | `internal/format/maven/manage_test.go` (one snapshot per operation, retirement with same and different bytes, after pruning under an injected clock, `delete` refusal, proxied refusal); `conformance/maven/hosted_delete_test.go` (the `script` operates through the management endpoint, real resolves then fail, a real redeploy is refused) |
| AC11 | conformance + integration | `conformance/maven/auth_test.go` (private repository on all four pinned clients; challenge equality across existing and missing repositories from the transcript; preemptive `PUT` and `BasicAuthentication` from the transcript; rejected credential and `pull`-less token); `internal/format/maven/auth_test.go` (plaintext refusal under `auth.md` AC27, credential-less `PUT` `403`) |
| AC12 | conformance + unit | `conformance/maven/auth_test.go` (the pattern-refusal case `format-handler-interface.md` AC7 requires, in both modes; pattern-scoped tokens provisioned through the `credentials` key; prefix resolution and plugin deploy under the pattern); `internal/format/maven/scope_object_test.go` (the object table, per route, `format-handler-interface.md` AC12) |
| AC13 | conformance | `conformance/maven/policy_test.go` (hosted and proxied modes; rules through the `policies` key, a controlled advisory through `advisories`; `mvn` and `gradle` transcripts) |
| AC14 | conformance + integration | `conformance/maven/proxied_test.go` (transcript and network-level assertion, fresh client caches in setup, byte comparison, stand-ins with sidecars, headers only, and neither, throttling and missing coordinates); `internal/format/maven/proxied_verify_test.go` (sidecar priority, completion-only mode, truncation) |
| AC15 | conformance | `conformance/maven/proxied_ttl_test.go` (mutating plain-layout stand-in serving `ETag`; upstream `304` and client `304` and `HEAD` at the network layer; the SNAPSHOT-file `404` revalidation) |
| AC16 | integration | `internal/format/maven/removal_test.go` (stand-in presenting each event class; the shared-layer half is `proxy-cache.md` AC13's) |
| AC17 | conformance + unit | `conformance/maven/head_test.go` (`gradle --refresh-dependencies` transcript); `internal/format/maven/conditional_test.go` (`HEAD` header equality, `304`) |
| AC18 | conformance | `conformance/maven/signatures_test.go` (a committed fixture signed once with a fixture key, deployed by real `mvn`; Gradle `verification-metadata.xml` trusting the key, then a tampered `.asc` seeded through `state`; proxied byte comparison) |
| AC19 | conformance | `conformance/maven/clients_test.go` (sbt and Leiningen pinned by digest running the resolve, SNAPSHOT and proxied cases; an Ivy case that is either passing or absent together with the catalogue row) |
| AC20 | conformance | `conformance/maven/replay_test.go` |
| AC21 | integration + conformance | `internal/format/maven/upstream_config_test.go` (`http://` upstream, HTML probe answer, `405` on remote writes); `conformance/maven/virtual_test.go` (a virtual repository over a local and a remote member; range, SNAPSHOT and prefix resolutions that succeed only through the merge) |
| AC22 | architecture test + integration | `internal/format/maven/arch_test.go` (no renderer in the handler package); `internal/storage/metadata_root_test.go` (threshold crossing, sweep, serve); `internal/format/maven/etag_test.go` (repoint changes the `ETag`) |
| AC23 | integration + conformance | `internal/format/maven/base_url_test.go` (configuration refusal); every conformance case above runs behind the harness's TLS termination with no client-side insecure opt-in, asserted by the case definitions carrying none |

The case set needs only keys already in the harness's closed `setup` vocabulary (its resolved
closed-vocabulary decision, was Q4): `repositories` with their visibility and type,
`credentials`, an `upstreams` stand-in, `state` for pre-deployed versions, builds and a tampered
signature, and `policies` with `advisories` for AC13. The issued credential reaches the clients
as the `settings.xml` server password (Maven, Leiningen), `credentials {}` (Gradle) and
`Credentials` (sbt). The runner-enforced obligations, both modes and the unauthenticated,
unauthorized and pattern-refusal cases in each, apply from the sibling specs and are not
restated per criterion here.

## Implementation Phases

### Phase 1: Hosted reads and the generated documents
- Waits on `docs/internal/plans/foundation/signing-service.md` reaching `planned` (Blocking
  preconditions)
- Path routing and case-sensitive matching, file serving through the CAS with the four
  rendered sidecars and the `x-checksum-*` headers, `HEAD` and conditional requests, the
  three metadata levels through the shared index service with the virtual merge, the SNAPSHOT
  filename grammar and base-version refusals, the challenge and scope mapping, the per-route
  addressed objects and the `403` policy rendering

### Phase 2: Deploy and management
- Per-file writes with checksum verification, the metadata `PUT` disposition and the SNAPSHOT
  build gate, immutability with the idempotent and `409` cases, `.asc` and `.module` as files,
  the plugin descriptor read for the group-level document, `Expect: 100-continue`, the
  write-boundary declaration exercised end to end under concurrency
- Delete a version, delete a file and prune SNAPSHOT builds through the management API, the
  retirement set: waits on `docs/internal/plans/foundation/management-api.md` reaching
  `planned` (Blocking preconditions; AC10)

### Phase 3: Proxied path
- Upstream validation, classification per file kind, sidecar-priority and completion-only
  verification, `If-None-Match` revalidation, negative caching with the SNAPSHOT-file
  exception, the removal table, `405` on remote writes, Maven Central preconfigured through
  `proxy-cache.md`'s extension mechanism (the resolved preconfigured-upstream decision)

### Phase 4: Corpus and gate
- Recording session across the named surface (after the harness redaction gate), replay-match,
  the second pinned Maven and Gradle releases, sbt and Leiningen (AC19), the Ivy verdict, the
  matrix rows for the deliberately unimplemented listings and staging

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. The seven questions this draft raised were each written in the template's decision
shape and then adopted at their own recommendation under the owner's standing delegation of
2026-09-26, so the loop can continue; each is recorded below as adopted rather than decided,
folded through Scope, Design, the criteria and the Test Plan in the same pass, and reversible
by the owner at any time. `grep -rn "standing delegation"` is the owner's review queue.

### Resolved: the write boundary of a deploy (was Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: each artifact-file
`PUT` is one completed logical write; checksum `PUT`s verify and write nothing; the
version-level metadata `PUT` is the close signal that lets a SNAPSHOT build into the served
document, and a release version enters the index when its POM lands (Design, "The deploy path
and what counts as a write"; AC2, AC3, AC4).

The question: the wire has no publish request. A deploy is `PUT`s in a client-specific order
and then the client's own metadata, and `data-model.md` requires a declared boundary.

**Recommendation:** A, because it is faithful to a wire whose reference implementation
documents that even `deployAtEnd` "does not make the whole batch atomic", because the one
consumer-visible hazard (a SNAPSHOT document naming a build whose jar is absent, cached as a
failure for a day) is closed by gating on the build manifest the client already sends, and
because every grouping alternative keys on something the wire does not carry.

| Option | You get | It costs |
|---|---|---|
| **A. One write per artifact file, with the SNAPSHOT build gated on its manifest** | Faithful; no invented session; concurrency is per file and the generated documents absorb it; the day-long cached-`404` trap is closed where it bites | A release mid-deploy is visible file by file, as on every plain Maven repository; several snapshots per deploy |
| **B. One write per deploy, closed by the artifact-level metadata `PUT`** | One snapshot per deploy; a release appears atomically | The closing `PUT` names no version, so it would commit every in-flight version of the artifact, including another principal's; a deploy that dies before it leaves files nobody can see, and grouping by principal is the identity keying `data-model.md` rules out |
| **C. A registry-owned staging operation** | Real atomicity, Central's model | A management surface no build tool speaks, for `management-api.md`'s era, and a claim in the matrix nothing captured backs |

**Why this is yours:** it decides what a Maven publish promises on this registry, and it
accepts a visible mid-deploy state on the hosted path.

Accepted cost: N snapshots per deploy, and the exception-list entry that staging is
deliberately unimplemented; C is recorded as the revision that adds it.

### Resolved: what a client-written maven-metadata.xml means (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: every metadata `PUT`
is answered `201` and its body discarded, except that a version-level body is read as the
SNAPSHOT build's close signal and manifest; all three levels are generated from stored state
(Design, "The generated documents"; AC2, AC3, AC22).

The question: every captured client `GET`s the document, computes a new one and `PUT`s it,
and the race captured in this pass shows that storing it loses versions under concurrency.

**Recommendation:** A. Everything in the client's body is derivable from what the registry
already holds (versions from directories with a POM, `latest` and `release` from write order,
snapshot builds from the timestamped filenames, prefixes from the plugin descriptor), the
client cannot know about concurrent writers, and answering `201` is what lets an unmodified
client finish its deploy.

| Option | You get | It costs |
|---|---|---|
| **A. Accept and discard; generate** | Correct under concurrency by construction; the client is unmodified | The `201` is a white lie about what was stored, recorded on the exception list |
| **B. Store the client's document** | A byte-faithful replay of a plain file server | The captured lost update, on the index every dynamic version and every SNAPSHOT read |
| **C. Merge the client's document into the generated one** | Nothing the client knew is lost | Nothing the client knows is unknown to the registry, so the merge adds only a parser for hostile input on the write path |

**Why this is yours:** it decides that this registry's index is registry-owned rather than
client-owned, a product promise about what a deploy means.

Accepted cost: an exception-list entry, and a `400` when a manifest names a file that never
arrived, which a plain file server would have accepted silently.

### Resolved: redeploying an existing release coordinate (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: identical bytes are
idempotent, different bytes are refused with `409`, new files may join a release version, and a
deleted release coordinate is retired forever (Design, "The deploy path"; AC5, AC10).

The question: the clients `PUT` whatever they have; Central refuses a republished release,
Nexus and Artifactory make it a per-repository switch, and the cross-format rule the sibling
specs adopted is refuse-and-retire.

**Recommendation:** A. The `.sha1` every Maven consumer verified, the proxied caches that hold
the file forever, and Gradle's `.module` hashes all bind a coordinate to bytes; the idempotent
case is the CI retry that plain immutability would break; and new files joining a version is
how sources and signatures are attached in this ecosystem.

| Option | You get | It costs |
|---|---|---|
| **A. Idempotent on equal bytes, `409` on different, new files allowed, retirement on delete** | Coordinate-to-bytes immutability with the retry and attachment cases the ecosystem needs | A rebuilt release cannot be redeployed under its version; the operator bumps it |
| **B. A per-repository redeploy switch** | Nexus users' habit | A switch whose "on" position contradicts every downstream cache and lockfile-style hash, per the cross-format rule |
| **C. Refuse every `PUT` to an existing version directory** | Simplest | Breaks attaching a `.asc` or sources later, and every retried CI deploy |

**Why this is yours:** it sets what operators may correct in place, against an immutability
property the proxy layer and every consumer's checksum rely on.

Accepted cost: the `409` divergence on the exception list, and a retirement set to carry.

### Resolved: base-version SNAPSHOT filenames (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: a `GET` for
`{a}-{v}-SNAPSHOT.{ext}` answers `404` and a `PUT` to one is refused with `400`; the
version-level document is the only resolution path (Design, "The deploy path"; AC5).

The question: the layout reference lists "unique SNAPSHOT artifacts, using the same base
version" as an option, Nexus-style servers resolve the base name to the newest build, and
Coursier probes the base name before reading the metadata.

**Recommendation:** A. No pinned client needs the base name (Coursier takes the `404` and
falls back, captured), Maven 3 removed non-unique deployment, and a base name that resolves
to different bytes over time is exactly the mutable coordinate the immutability rule exists
to exclude.

| Option | You get | It costs |
|---|---|---|
| **A. `404` and `400`; metadata is the only path** | One name per set of bytes; no mutable coordinate | A Maven 2-era deployer of non-unique snapshots is refused |
| **B. Resolve the base name to the newest build** | Nexus compatibility | A URL whose bytes change, cached by every proxy in the path under a name that promised nothing |

**Why this is yours:** it refuses a legal-looking URL, a product rule.

Accepted cost: one refusal message to document.

### Resolved: which checksums are served, and how (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: four sidecars and the
`x-checksum-sha1` and `x-checksum-md5` headers for every file and document on both paths,
rendered from the store's digests, never stored, with none for sidecars or signatures (Design,
"Checksums are served, never stored"; AC6).

The question: clients write two or four sidecars and read two, Central serves two plus the
headers and dropped the sampled Gradle-published `.sha256` and `.sha512`, and a plain file
server serves exactly what was uploaded.

**Recommendation:** A. Rendering makes a wrong sidecar unrepresentable, the headers remove two
requests per artifact from the client that matters most (captured on 3.9.11), and serving
`.sha256` and `.sha512` for Maven-deployed files costs nothing and gives Gradle verification
and `curl` users a strong digest.

| Option | You get | It costs |
|---|---|---|
| **A. Render four sidecars plus headers, never store** | Always-correct sidecars; fewer requests; one code path for both paths | Diverges from a plain file server for Maven-deployed files, on the exception list; four extra hashes computed at ingest |
| **B. Store and serve what was uploaded** | Byte-faithful | A corrupt uploaded sidecar is served forever, and a proxied file's sidecars are one more thing to fetch and cache |
| **C. Serve only `.sha1` and `.md5`** | Exactly Central's surface | Withholds strong digests the store already has |

**Why this is yours:** it trades replay fidelity for integrity and request count, a product
call on the format's weakest primitive.

Accepted cost: the exception-list entries for the extra sidecars and headers.

### Resolved: where the metadata is generated (was Q6)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: all three levels are
write-triggered generated documents produced by the shared signing and index service, stored
at the package, version and repository levels, regenerated inside the triggering write, with
the handler holding no renderer (Design, "The generated documents"; AC4, AC22; the Phase 1
precondition).

The question: `cargo.md` and `nuget.md` argued that a package-scoped, unsigned document that is
a pure function of version rows is rendered on request and is not the prototype's class;
`helm.md` chose a stored, write-triggered document for a repository-wide index. Maven's
artifact-level document is package-scoped like Cargo's, but its `latest` and `release` are
write-order state, its group-level document spans every plugin in a group, and the captured
race is the contention the write-triggered service exists to absorb.

**Recommendation:** A. The service is built immediately before this format in the same charter
step for exactly this class, one generation path serves all three levels and the virtual
merge, and a document stored inside the write is what makes "the document never disagrees
with the snapshot" a property rather than a hope under concurrency.

| Option | You get | It costs |
|---|---|---|
| **A. The shared index service generates and stores all three levels** | One implementation of regeneration, contention and the virtual merge across Maven, Helm, Debian and RPM; the snapshot rule holds by construction | Phase 1 waits on that spec; the handler cannot serve a document the service has not produced |
| **B. The handler renders on request from version rows, as Cargo does** | No dependency on an unwritten spec | `latest` and `release` still need write-order state, the group-level document still spans packages, and the handler grows the contention logic the service was built to own |
| **C. Store the client's document** | The Q2 option B, rejected there | The captured lost update |

**Why this is yours:** it sequences this format behind a shared service and decides which
class of document Maven's index is, a question the sibling specs answered two ways.

Accepted cost: the precondition, and a sibling consequence for the charter's AC12 to name
Maven beside Helm as a consumer of the service.

### Resolved: Maven Central as a preconfigured upstream (was Q7)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: `repo.maven.apache.org`
joins the preconfigured, enabled-by-default upstream set through `proxy-cache.md`'s own
extension mechanism (its resolved preconfigured-set extension, was Q14), the amendment
recorded as a sibling consequence of this spec rather than made here, with the nightly
real-upstream job gaining its row when Maven ships (Phase 3).

The question: `proxy-cache.md` extended the owner's npm, PyPI and Docker Hub set with
galaxy.ansible.com because that format is Tier 1, `nuget.md` adopted the same for nuget.org,
and the Tier 2 formats' upstreams wait for a `continue` verdict. Maven is Tier 1.

**Recommendation:** A, the precedent applied: a Central cache is the single most common reason
a JVM team runs a repository manager at all, Maven is Tier 1 with no gate between it and being
built, and Central's `x-checksum-*` headers, `ETag` semantics and immutability are exactly
what the proxied design above was grounded against.

| Option | You get | It costs |
|---|---|---|
| **A. Preconfigure Central through proxy-cache.md's extension mechanism** | A Central cache out of the box; nightly coverage against the real upstream | Central's CDN behaviour joins the support surface, and a sibling amendment lands from this spec |
| **B. User-configured in v1** | No sibling amendment | A worse first-run story for the ecosystem with the largest client multiplier in the catalogue |

**Why this is yours:** it extends a set the owner priced for three upstreams, a product and
support-surface call.

Accepted cost: the proxied conformance cases run against a stand-in in the main suite; the
real Central is exercised by the recording session and the nightly job.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | 1ac78d6 | authoring pass: grounded first draft, not a review | Grounded the wire contract three ways: captured traffic from Maven 3.8.8 and 3.9.11, Gradle 8.14.5 and 9.1.0, sbt 1.13.0 (Coursier) and Leiningen 2.13.0, pinned by digest, run in containers against a logging plain-layout stub (release and SNAPSHOT deploys on each Maven release and each Gradle release, a duplicate redeploy, a GPG-signed deploy with sources, a `maven-plugin` deploy and the prefix resolution it enables, two concurrent deploys reproducing the metadata lost update, cold and warm resolves on all six clients, `-U` and `--refresh-dependencies`, ranges, `RELEASE`, `1.+` and `latest.release`, a Gradle-published `.module` consumed by Gradle with and without the redirect and by Maven, sbt and Leiningen, corrupt and missing sidecars under `warn` and `-C`, the `x-checksum-*` headers on both Maven releases, the `401` challenge on reads and the preemptive `PUT` on all four, Gradle `BasicAuthentication`, wrong and missing credentials, the Maven HTTP blocker and Gradle's insecure-protocol refusal, and a dynamic version with no metadata); the Maven layout and repository-metadata references, the resolver's expected-checksums and configuration pages, the settings, deploy-mojo and 3.8.1 release-note references, Central's requirements, the Gradle Module Metadata 1.1 specification and the Gradle user guide sources (two of which the captures refute: `.module`-first lookup and sidecar fetching on resolution); and the live repo.maven.apache.org (headers, `304` on `If-None-Match` only, a wrong-case `404`, directory listings, a Gradle-published artifact's sidecars and marker, the plugins block). Design built from that: the case-sensitive path layout with no folding and no URL rewriting; the three generated metadata levels as write-triggered documents of the shared index service with the virtual merge and deploy-order `latest` and `release`; per-file writes with the SNAPSHOT build gated on the client's manifest and the client's metadata `PUT` discarded; immutability with idempotent, `409` and attachment cases and a retirement set; four rendered sidecars plus the `x-checksum-*` headers; the `.module` and `.asc` as files with the Gradle-versus-Maven resolution table; Basic after a challenge and preemptive on `PUT` with TLS enforced on both sides; the layout path as the addressed object; the `403` rendering and its reason-phrase limit; the proxied classification with sidecar-priority verification, `ETag` revalidation, the SNAPSHOT-file negative-cache exception and Maven's rows of the removal table; and the client-cache trap for every client. Seven questions written in decision shape and adopted under the standing delegation: per-file write boundary (AC2 to AC4), client metadata discarded (AC2, AC3, AC22), redeploy immutability (AC5, AC10), base-version SNAPSHOT names refused (AC5), four sidecars plus headers (AC6), generation by the shared index service (AC22), and Central preconfigured (sibling consequence). Twenty-three criteria, each with a Test Plan row. Sibling consequences recorded in the authoring report, not applied here: `auth.md` client-table rows for Gradle, sbt and Leiningen and the preemptive-`PUT` note on the `mvn` row; the charter's AC12 naming Maven as a consumer of the signing and index service; the `proxy-cache.md` preconfigured-set extension and Maven's rows in its removal table; the `management-api.md` operations; what `signing-service.md` and `artifact-verification.md` must provide; the reason-phrase finding for `supply-chain-policy.md`; and a Maven row in the management-surfaces analysis. Stays draft; awaits an independent review. |
