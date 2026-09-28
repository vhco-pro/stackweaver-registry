---
status: draft
status_description: "Reconciled 2026-09-28 at ddc73fb with the foundation wave (not a review): the proxied zip verifier is proxy-cache's completion-only mode (was-Q15, AC20), the client streaming with completion withheld, the buffer-before-first-byte cost relaxed and the short-close case added (AC7); the checksum database is an https upstream on its own remote per upstream-adapters, no adapter kind; deletion is management-api's delete-version kind with the core-held Retirement record and the 410 rendered from it (AC17); refusals through WriteRefusal with the status-line phrase and the supply-chain binding row filled by the policy case (AC10); no descriptor route, decided for the passthrough; artifact-verification records Go as none; the go client row still owed to auth.md; Capabilities with rename and virtual cases (AC19). Earlier: 2026-09-26 at da0aecd, deletion through the management API with 410 (AC17), addressed objects (AC18); grounded first draft 2026-09-26 from the module reference, the go command's source and real runs of go1.25.5 and go1.26.0; six questions adopted under the standing delegation; none open."
description: "Spec for the Go modules format: the GOPROXY protocol hosted and proxied, the checksum-database passthrough, and what hosted means for an ecosystem with no publish API."
author: michielvha
goal: "Serve the go command as a module proxy and a checksum-database mirror so a build fleet resolves, verifies and downloads every module, private and public, through this registry alone."
priority: "medium"
issue: 18
created: 2026-09-26
covers:
  - "internal/format/go/**"
  - "conformance/go/**"
---

# Plan: Go modules format

The GOPROXY protocol (`/@v/list`, `.info`, `.mod`, `.zip`, `/@latest`) hosted and proxied, plus
the `/sumdb/` checksum-database passthrough the `go` command expects a proxy to offer, with the
`go` command itself as the oracle end to end.

## Context

Go is the one Tier 1 ecosystem whose registry protocol was designed to be served from a static
file tree: the module reference states that a proxy is "an HTTP server that can respond to `GET`
requests for paths specified below. The requests have no query parameters, and no specific
headers are required, so even a site serving from a fixed file system (including a `file://`
URL) can be a module proxy". That makes the read half unusually cheap and the rest unusually
strange, in three ways this spec has to face rather than paper over.

**There is no publish API.** `go help mod` lists download, edit, graph, init, tidy, vendor,
verify and why (verified on this host against go1.25.5); nothing uploads. Modules are published
by pushing a semantic-version tag to a VCS repository, and the public mirror materialises them
by cloning. So "hosted" has no ecosystem-given meaning for Go and this spec has to define one
(the resolved hosted-path decision below).

**Integrity lives outside the proxy protocol.** No response carries a digest. The `go` command
authenticates `.mod` and `.zip` content against `go.sum` and, for anything not in `go.sum`,
against the checksum database `sum.golang.org`, a transparency log it reaches either directly
or through the proxy's `/sumdb/` passthrough. A module proxy that does not mirror the checksum
database sends every fresh client straight to Google, and cannot serve toolchain downloads at
all (Design, "The checksum-database passthrough").

**The catalogue files Go as its own single-ecosystem family, "GOPROXY module proxy".** It once
grouped Go with Swift and Julia under "Git-backed", and its resolved decision splitting that
label (was Q3) did so on exactly the observation this spec rests on: there is no git anywhere on
the GOPROXY wire, which is HTTP GET over a fixed path grammar. Count integrity: this spec tests
the `go` command only; it claims no client reach beyond it.

### Grounding

Per the constitution, every protocol claim here is grounded this run, and the sources are
named so a reviewer can refute rather than confirm:

- The module reference, fetched 2026-09-26 as the source of go.dev/ref/mod
  (`_content/ref/mod.md` in the `golang/website` repository): the Module proxies chapter, the
  Module zip files chapter, the `retract` directive, Pseudo-versions, Version queries, Private
  modules, Module cache, Authenticating modules, and the environment-variable table.
- The `go` command's own source, in the GOROOT installed on this host (go1.25.5):
  `cmd/go/internal/modfetch/proxy.go` (proxy list parsing, fallback, `Versions`, `Latest`,
  `Stat`), `modfetch/sumdb.go` (`useSumDB`, `dbDial`, `initBase`), `modfetch/fetch.go`
  (`checkModSum`, `hashZip`), `modfetch/toolchain.go`, and the vendored
  `golang.org/x/mod` packages `module` (`EscapePath`, `escapeString`), `zip` (the package
  documentation and `checkZip`), `sumdb` (`Client.Lookup`, `checkRecord`, `checkTrees`),
  `sumdb/note` and `sumdb/dirhash` (`Hash1`).
- The checksum-database design, `design/25530-sumdb.md` in the `golang/proposal` repository,
  for the `/sumdb/` proxying contract and its privacy rationale.
- The proxy.golang.org service page and its privacy page, fetched 2026-09-26.
- **Real client runs.** A logging reverse proxy was placed in front of proxy.golang.org and
  sum.golang.org and the installed `go` (go1.25.5, and go1.26.0 via toolchain switching) was
  driven through it with fresh `GOMODCACHE` and `GOPATH` per experiment. Every request
  sequence, header, status and body shape quoted in Design was observed there, not recalled.
  Where the observed behaviour and the reference disagree, the observation is stated and wins,
  per the standing rule that the client is the specification.

## Blocking preconditions

**The handler interface re-open must complete before this format's implementation starts.**
`format-handler-interface.md` AC8 gates all Tier 1 handler work on it; npm and PyPI record the
same gate from their sides, and this spec records it here because a contract enforced on one
side only is enforced nowhere. Go modules is charter build-order step 7, after npm and PyPI, so
in practice the gate is discharged long before this format is reachable, but it binds this spec
independently.

**The management API must reach `planned` before Phase 5.** Hosted version deletion is the
`delete-version` kind of the closed operation vocabulary
`docs/internal/plans/foundation/management-api.md` now fixes (its kind table and cross-format
reconciliation table carry Go's row, with the 410 afterwards), which owns its URL shape,
authorization and write accounting; AC17 is untestable until that surface exists. Phases 1 to 4
do not wait on it.

**The two shared-layer amendments this spec asked for are offered.** The proxied `.zip`
verification below needed a fetch-and-cache mode the settled stream-and-verify decision did not
offer: `proxy-cache.md` admitted the completion-only mode with a handler-supplied verifier (its
resolved completion-only decision, was Q15, and AC20). The checksum-database passthrough needed
an upstream with no owning spec: `upstream-adapters.md` now owns adapters and answers that the
checksum database is an ordinary `https` upstream bound to its own `remote`, read by this
handler through `Deps` (its table of what the format specs asked, the `go-modules.md` row; its
AC1). Both are citations now, not requests.

## Scope

**In scope:**

- The five GOPROXY endpoints, hosted and proxied: `$module/@v/list`, `$module/@v/$version.info`,
  `.mod`, `.zip`, and `$module/@latest`, with the case-encoding of module paths and versions.
- Hosted publishing as a registry-owned upload of a module zip, with `.info` and `.mod` derived
  from it and the `h1:` sums recorded (the resolved hosted-path decision below).
- Pseudo-versions, `+incompatible` versions and major-version-suffixed paths as ordinary
  versions; retracted versions served exactly like any other, because retraction is a
  client-side reading of the latest `go.mod` and proxies are told to keep serving them.
- The `/sumdb/$name/` checksum-database passthrough with caching, including refusal to forward
  lookups for module paths this registry hosts or the operator marks private (the resolved
  checksum-database decision below).
- Toolchain downloads (`golang.org/toolchain`), which ride the same protocol and require the
  checksum database.
- The proxied path against a GOPROXY-speaking upstream (proxy.golang.org first), including
  `.zip` integrity verification against the checksum-database record before the CAS commit,
  negative caching, and the status-code semantics the client's `GOPROXY` fallback depends on.
- Non-interactive client authentication as the `go` command actually sends it: HTTP Basic
  from `.netrc`, or headers from a `GOAUTH` command, both over HTTPS only.
- Virtual repositories as a single `GOPROXY` base aggregating hosted and proxied members.
- The per-route addressed objects `auth.md`'s pattern scopes evaluate (AC18), and hosted version
  deletion through the registry-owned management API's `delete-version` kind with deleted
  versions retired through the core-held `Retirement` record (AC17).
- The handler's `Capabilities()` declaration, repository rename and virtual aggregation
  (Design, "Capabilities and lifecycle"; AC15, AC19).

**Out of scope for v1**, each with a non-effort reason, recorded because the interface spec's
definition of done requires the deliberately unimplemented surface to be named:

- **Direct-mode origins: the registry cloning a VCS repository and synthesising `.info`,
  `.mod` and `.zip` itself**, as proxy.golang.org does for `direct`. This is an upstream
  adapter of a new kind (a git origin rather than a GOPROXY server), and the spec that owns
  adapters, `upstream-adapters.md`, excludes it by name ("Materialising Go modules or Cargo
  crates from git origins": an adapter is one HTTP exchange, never a route to materialising
  modules); running `git` inside the registry is also a code-execution and egress surface that
  `format-handler-interface.md` AC6 forbids in a handler. Evidence sequencing and correctness
  risk, not effort (the resolved VCS-origin decision below).
- **Serving `go-import` meta tags (`?go-get=1`).** That surface exists so `direct` clients can
  find a repository from a module path, and it must be served at the module path's own host,
  which belongs to the module author's DNS, not to the registry. It is a hosting arrangement
  rather than a registry protocol, and `GOPROXY` is the supported way to point the client here.
- **Running an origin checksum database (signing our own transparency log for hosted
  modules).** Clients would need a registry public key in `GOSUMDB`, which makes the registry a
  trust root, a key-management product surface that belongs to the shared signing and index
  service (charter build-order step 7; `signing-service.md` records that Go asks nothing of it),
  with verification owned by `docs/internal/plans/foundation/artifact-verification.md` per
  `supply-chain-policy.md`'s resolved verification-ownership decision (was Q6); that spec
  records Go modules among the formats with nothing to verify, so the conformance matrix's
  verification column reads `none` for this format with this spec cited (its AC24). Go's own
  design routes private modules through `GONOSUMDB` instead, and this spec follows it.
- **A Go-specific version-deletion endpoint.** Go's soft-delete is `retract`, which the author
  publishes inside a new version's `go.mod` and which needs no registry surface; hard deletion
  is the `delete-version` kind of the registry-owned management API the cross-format precedent
  settled on (`pypi.md`'s resolved hosted-yank decision, was Q1, and its siblings), homed in
  `docs/internal/plans/foundation/management-api.md`, never a Go route (the resolved deletion
  decision below; AC17).
- **The `index.golang.org` feed and the `/cached-only` variant.** Both are proxy.golang.org
  service features no `go` client consumes.
- **Vulnerability data (vuln.go.dev, `govulncheck`).** Advisory feeds belong to
  `supply-chain-policy.md`; Go's `GO-` advisories are published in OSV format there.

## Design

### The wire surface

| Surface | Shape, as the client sends it |
|---|---|
| Version list | `GET $base/$module/@v/list`, plain text, one version per line; "should not include pseudo-versions"; the client keeps only lines whose first field is valid semver and not a pseudo-version, and accepts an optional second field per line (RFC 3339 time) that it uses only when choosing a latest pseudo-version (`latestFromList` in `proxy.go`) |
| Version metadata | `GET $base/$module/@v/$version.info`, JSON `{"Version":..., "Time":...}`; `Version` is required and must be canonical; `Time` is optional RFC 3339; "more fields may be added in the future, so other names are reserved" (proxy.golang.org already adds `Origin`, observed); `$version` may be a branch name or revision, and when it is canonical the returned `Version` must equal it or the client errors with "proxy returned info for version X instead of requested version" (`Stat` in `proxy.go`) |
| go.mod | `GET $base/$module/@v/$version.mod`, the original unmodified `go.mod`, or a synthetic `module $module` line when the version has none (observed: `github.com/google/uuid@v1.0.0` serves exactly `module github.com/google/uuid`) |
| Zip | `GET $base/$module/@v/$version.zip`, `application/zip`, the module zip whose layout is fixed by the zip chapter; the client caps the body at 500 MiB plus one byte and fails on "downloaded zip file too large" |
| Latest | `GET $base/$module/@latest`, same JSON as `.info`, optional; the client asks only after `list` was empty or unusable, and a 404 or 410 here falls back to picking a pseudo-version from the list (`Latest` in `proxy.go`) |
| Checksum database | `GET $base/sumdb/$name/supported`, then `$base/sumdb/$name/lookup/$module@$version`, `/latest`, `/tile/$H/$L/$K[.p/$W]` and `/tile/$H/data/$K[.p/$W]`, all forwarded to the named database (Design, "The checksum-database passthrough") |
| Hosted upload | `PUT $base/$module/@v/$version.zip`, body the module zip; registry-owned, not part of the ecosystem protocol (Design, "Hosted: what publishing means for Go") |

Protocol facts that shape every row, from the reference and confirmed by observation: successful
responses are 200; 3xx are followed; 404 and 410 mean "not on this proxy, may be found
elsewhere" and every other 4xx or 5xx is a terminal error; error bodies are `text/plain` in
UTF-8 or US-ASCII. The client identifies as `Go-http-client/1.1`, sends `Accept-Encoding: gzip`
and nothing else of note: no `Accept`, no conditional headers, no `Authorization` over plain
HTTP (Design, "Non-interactive client auth"). There is no content negotiation anywhere in this
protocol; the content types served are `application/json` for `.info` and `@latest`,
`text/plain; charset=UTF-8` for `list` and `.mod`, `application/zip` for `.zip`, matching what
proxy.golang.org serves.

Per the standing rule, this table is re-grounded in the recorded corpus when the conformance
cases are written (AC12), and the corpus wins any disagreement. The one place the reference and
the client already disagree is recorded: the reference says a list "should not include
pseudo-versions", while the client tolerates them, filters them out of `go list -m -versions`,
and uses them (with the optional timestamp column) only as the last resort for `latest`.

### Case-encoding and URL parsing

To be servable from case-insensitive file systems, both `$module` and `$version` are
case-encoded: every uppercase ASCII letter becomes `!` followed by its lowercase form
(`github.com/BurntSushi/toml` is requested as `github.com/!burnt!sushi/toml`; `v1.0.0-RC1`
would be `v1.0.0-!r!c1`). `!` itself is disallowed in module paths and versions, so decoding is
unambiguous, and a `!` not followed by a lowercase letter is an invalid escape
(`unescapeString` in `x/mod/module`). The client then percent-encodes the escaped path for the
URL, so what arrives on the wire is `github.com/%21burnt%21sushi/toml/@v/v1.4.0.info`
(observed), while `/` and `+` travel raw (`github.com/docker/docker/@v/v20.10.24+incompatible.info`,
observed). The router therefore percent-decodes, then bang-decodes, then validates the result
with the reference rules (`module.CheckPath`, `module.CanonicalVersion`, `module.Check` for the
major-suffix agreement), and a path that fails any step is a 404, never a 500. The unescaped
module path is the only package key; the escaped form exists at the URL layer and nowhere in
the model. The checksum-database lookup path uses the same encoding
(`/lookup/github.com/!burnt!sushi/toml@v1.4.0`, observed, and not percent-encoded there).

Two more grammar facts the router must know. A major-version suffix is a path element
(`github.com/golang-jwt/jwt/v4`), so `$module` is everything before `/@v/` and a naive
"last element is the name" split is wrong. And `$version` in an `.info` request need not be a
version at all: `master.info` and `2d3c2a9c.info` are legitimate requests that resolve a branch
or revision to a pseudo-version on a VCS-backed upstream (observed:
`github.com/google/uuid/@v/master.info` answered `v1.6.1-0.20241114170450-2d3c2a9cc518`).
On the hosted path there is no VCS to resolve against, so a non-canonical `.info` request is a
404; on the proxied path it passes through as mutable metadata (below).

### How the client sequences requests, and what it caches

Observed sequences, each from a fresh module cache:

- **A pinned download** (`go mod download m@v1.6.0`): `.info`, then `.mod`, then the
  checksum-database probe `/sumdb/sum.golang.org/supported`, then `lookup` and tiles when the
  proxy supports it, then `.zip`. The `.zip` is fetched last and only after the `go.sum` lines
  are known.
- **Resolving latest**: `/@v/list`; only when the list is empty does `/@latest` get asked
  (observed for `golang.org/x/exp`, which has no semver tags). With a non-empty list the client
  picks the highest release, else the highest pre-release, and `@latest` is never requested.
- **Retractions**: `go list -m -versions m` fetched `list`, then the `.info` and `.mod` of the
  highest version, and hid `v4.4.0` from the output because that `.mod` retracts it; the
  `-retracted` flag showed it again; `go get m@v4.4.0` still downloaded it, printed the
  retraction rationale from the `.mod`, and succeeded. The proxy served the retracted version's
  `.info`, `.mod` and `.zip` with 200 throughout. **A registry never interprets `retract`.**
- **Package-to-module resolution** (`go get` of a package path): concurrent `.info` probes for
  every prefix of the path (`github.com/@v/v4.4.0.info`, `github.com/golang-jwt/@v/...`,
  `github.com/golang-jwt/jwt/@v/...`) alongside the real module. proxy.golang.org took five to
  six seconds to answer each 404 because it tried the origin first. A registry answers these
  from a negative cache in milliseconds or every `go get` stalls on prefixes that are not
  modules.
- **The list is never trusted from cache**: two consecutive `go list -m -versions` calls both
  fetched `/@v/list`, while `.info`, `.mod` and `.zip` were served from the module cache
  without any request. The reference says so of `list` and `.info` ("may change over time, so
  the `go` command usually fetches a new copy").

The last point is this format's assertion trap, the same shape npm and PyPI record: a second
`go mod download` that never contacts the registry proves nothing about it. Every proxied
case runs with a fresh `GOMODCACHE` **and** a fresh `GOPATH`, because the checksum-database
client keeps its signed tree head in `$GOPATH/pkg/sumdb/$name/latest` and its tiles in
`$GOMODCACHE/cache/download/sumdb/`, and a warm timeline hides whether tiles came from us.
AC6's case asserts both directions (the second client reached this registry; the upstream
received no request) at the network layer.

### Hosted: what publishing means for Go

Adopted (the resolved hosted-path decision below): **hosted publishing is a registry-owned
`PUT` of a module zip to the URL the zip will be served from**, `PUT $base/$module/@v/$version.zip`,
authenticated like any write. This is the Gitea shape (`PUT .../go/upload` with the zip as body,
refusing an existing name and version) moved onto the protocol's own URL so the module path and
version are in the request and must agree with the zip. The client is any HTTP client; there is
no `go` subcommand to drive it, which the conformance design accounts for (below). The zip is
produced by the publisher with `golang.org/x/mod/zip.CreateFromDir` or by `go mod download`
against a checkout, both of which emit the reference layout.

The registry validates before anything commits:

- `$version` is canonical (`module.CanonicalVersion`) and agrees with the path's major-version
  suffix (`module.Check`); pseudo-versions and `+incompatible` are canonical and accepted.
- The zip passes the reference's checks (`zip.CheckZip`): every entry under
  `$module@$version/`, the 500 MiB limits on the file and on the uncompressed total, 16 MiB
  limits on `go.mod` and `LICENSE`, no two paths equal under case-folding, `go.mod` only at
  the top level and only in that spelling, each entry's size matching its declared size, no
  symlinks or irregular files, valid file names (the reference's character set and the
  Windows reserved-name rule).
- If `$module@$version/go.mod` is present, its `module` directive names `$module`, and a
  `+incompatible` version carries no `go.mod` at all (the reference's compatibility rule: that
  suffix exists precisely for versions of repositories without one).
- **A version that already exists, or was deleted and so has a core-held `Retirement` record, is
  refused** (409, body naming the reason; the retired case is the shared write path's `retired`
  refusal, `management-api.md` AC12, rendered as the same status). Module content
  is pinned by `go.sum` in every consumer and cached forever by every proxy on the immutability
  assumption this registry's own proxied path makes; accepting a re-upload changes bytes under
  a coordinate the ecosystem treats as immutable.

From the accepted zip the registry derives everything else it serves: the `.mod` is the zip's
top-level `go.mod` served verbatim, or the synthetic `module $module` line when absent; the
`.info` is `{"Version": $version, "Time": t}` where `t` is the request's `Go-Module-Time`
header (RFC 3339, so a publisher can carry the commit time the reference says `Time` means)
or, absent that, the upload time; and two `h1:` sums are computed and stored, the zip's dirhash
(`dirhash.HashZip`, the `go.sum` line for the version) and the `go.mod` content hash
(`dirhash.Hash1` over the single entry `go.mod`, the `/go.mod` line). Those sums are what the
client will write into `go.sum` on first download, so the registry computing them the
reference way, and exposing them to the operator, is what lets a hosted module be checked
against the registry later rather than trusted on first use forever.

Hosted `list` is rendered from the package's version rows: every canonical non-pseudo version,
one per line. Hosted `@latest` is served for the case the reference reserves it for: when the
list is empty, the newest pseudo-version by `Time`. A hosted `.info` request for anything that
is not a stored version is a 404.

**Hosted modules and the checksum database.** `sum.golang.org` cannot see a private module, so
a client with the default `GOSUMDB` that downloads a hosted module asks the database for it,
through this registry's passthrough if the client uses it. That lookup is refused here rather
than forwarded (Design, "The checksum-database passthrough"), and the client's own recipe for
this deployment is the reference's "Private proxy serving all modules": `GOPROXY` pointing at
the registry and `GONOSUMDB` (or `GOPRIVATE`) covering the hosted module prefixes. The refusal
body names `GONOSUMDB`, because a client without it fails with "verifying module" and nothing
else tells the developer why. AC1's hosted cases run both ways: with `GONOSUMDB` set, and
without it to assert the refusal and that the module path never left the registry.

### What counts as a write

`data-model.md` requires each format spec to declare its ecosystem's write boundaries. Go's:

- **One accepted zip `PUT` is one completed logical write** and produces one snapshot carrying
  the version, both files and the derived metadata. A refused upload leaves nothing behind.
- **A retraction is not a registry write.** It arrives as content inside a later version's
  `go.mod`, published like any other version; the registry stores it and never reads it.
- **A deletion is one management write**, the `delete-version` kind of the registry-owned
  management API (`docs/internal/plans/foundation/management-api.md`), which the handler
  declares through that spec's optional `Operator` interface and applies inside the write
  transaction the core opened; no client drives it and no reference API documents it, so it has
  no binding. Go's protocol contribution is the contract that operation must meet: a deleted
  version leaves `list` and its `.info`, `.mod` and `.zip` answer 410 Gone, the status the
  protocol assigns to "was here, may be found elsewhere", so a `GOPROXY` fallback list still
  works; and the version is **retired**: the handler returns `{module}@{version}` as the
  coordinate to retire in the operation's `Outcome`, the core writes a `Retirement` record in
  the same transaction (`data-model.md` AC35; `management-api.md`, "Retirement is core-held",
  its resolved retirement-placement decision, was Q3), outside snapshot content, and the shared
  write path refuses a later upload of the coordinate with `retired` before the handler sees it,
  rendered here as the duplicate's 409, because every consumer's `go.sum` and every proxy's
  cache still bind that coordinate to the deleted bytes. The 410 is rendered by the handler from
  the same record, since the version is in no snapshot any more. Retirement is the cross-format
  rule `pypi.md`, `npm.md` and `ansible-collections.md` adopted, applied here. Deletion requires
  `delete`, is refused `405` on a proxied repository (`management-api.md` AC7), and creates
  exactly one snapshot (AC17).
- **A proxied repository creates no snapshots**, per the model's settled rule; every cache
  materialisation, including checksum-database tiles, is a cache fill.

### Mapping onto the shared model

The levels `data-model.md` provides are enough, with no new table:

| Model entity | Go content |
|---|---|
| `Package` | one per module path, keyed by the **unescaped** path (`github.com/BurntSushi/toml`); the major-suffixed `/v2` path is a distinct package, as the ecosystem treats it |
| `Version` | one per canonical version string, pseudo-versions and `+incompatible` included; its metadata document holds `Time`, the `h1:` zip and `go.mod` sums, the passthrough `Origin` object when an upstream supplied one, and a verification state (verified against the checksum database, unverifiable under a no-sum pattern, or hosted) |
| `File` | two per version: the zip (`$version.zip`) and the `go.mod` bytes (`$version.mod`), each a CAS blob keyed by the sha256 the store computes; the `h1:` sums are metadata, never storage keys (`storage-and-gc.md`) |
| `Package`-level document | on the proxied path, the upstream's `list` and `@latest` bodies as cached mutable metadata with their TTL state; on the hosted path nothing, since `list` is rendered from version rows and the deleted versions are core-held `Retirement` records outside the document (`data-model.md` AC35); the `Package` row survives its last version (`data-model.md` AC33) so the 410 has a package to hang off |
| `Repository`-level document | the repository's checksum-database binding: which database name it answers `/sumdb/$name/` for, and which mirror repository backs it (below) |

The checksum-database mirror is its own `remote` repository of this format, with an `Upstream`
whose URL is the database (`https://sum.golang.org`) under the ordinary `https` adapter of
`upstream-adapters.md` (the database speaks plain HTTPS GET; the protocol half, which routes are
tiles and which are lookups, is this handler's, as that spec's row for this format records), so
the one-upstream-per-remote rule holds (its AC1). Inside it the
cached material sits under a single package named for the database and a single version named
`mirror`: full tiles and partial tiles are `File`s keyed by their relative path
(`tile/8/0/x254/758`), lookup records are `File`s keyed by `lookup/$module@$version`, and the
latest signed tree head is the version document. That is a stretch of the entity vocabulary
and it is named as one: it is the generalisation test doing its job, and if implementation
finds the model wants a first-class cached-document entity, that is a `data-model.md` change
raised as such, never a handler-side table. Every Go repository, whatever its type, names the
mirror it fronts in its repository-level document; a virtual repository names one so a single
`GOPROXY` base answers `/sumdb/` too.

Snapshots and pointers apply to hosted repositories exactly as the model says: every
name-addressed read (`list`, `@latest`, and `.info`, `.mod`, `.zip` by version string) resolves
through the pointer the handler is given, so promotion and rollback work on a Go repository
with nothing Go-specific.

### The proxied path

The upstream is any server speaking the GOPROXY protocol: proxy.golang.org, an Athens, another
instance of this registry. The handler owns the request and classifies for the proxy layer's
fetch-and-cache API under the settled distinction in `proxy-cache.md`, which the layer never
guesses:

| Resource | Classification | Grounding |
|---|---|---|
| `/@v/list` | **Mutable metadata with a TTL.** Passed through verbatim after validation (one field or two per line), never rendered from the versions this registry happens to have cached, or `@latest` resolution would see only what someone already fetched | proxy.golang.org serves it with `max-age=60`; the client refetches it on every resolution |
| `/@latest` | Mutable metadata with a TTL; 404 or 410 from the upstream is relayed as such, since the client has a defined fallback for it | `max-age=60` upstream |
| `$version.info` for a canonical version | Mutable metadata with a long TTL: not authenticated, "may change over time" (proxy.golang.org adds `Origin` and could revise `Time`), but `Version` is invariant and the registry rejects an upstream body whose `Version` differs from the request, as the client would | `max-age=10800` upstream |
| `$rev.info` for a branch or revision | Mutable metadata with the short TTL: a branch moves, and revalidation is the only way a new tip becomes visible | observed `master.info` |
| `$version.mod` | **Immutable artifact**, cached indefinitely once its `h1:` matches the checksum-database record (below) | authenticated by `go.sum` |
| `$version.zip` | **Immutable artifact**, cached indefinitely once its dirhash matches the checksum-database record; verification requires the whole body (below) | authenticated by `go.sum`; the reference requires a proxy to "always serve the same content" |
| Upstream 404 or 410 | **Negatively cached** with the short TTL, for the version and for the prefix probes | proxy.golang.org caches its own 404s for 30 minutes and takes seconds to produce one |
| Upstream 403 | Relayed as 403 and never negatively cached: the reference assigns 403 gatekeeper meaning (the client stops rather than falling back), and turning it into a 404 would silently widen the client's fallback | reference, Communicating with proxies |
| Upstream 429 and 5xx | Never negatively cached, never presented as not-found, `Retry-After` honoured, per `proxy-cache.md` AC9 | settled there |
| Upstream 3xx | **Followed by the registry, never relayed.** proxy.golang.org answers the toolchain `.zip` with a 302 to a download host (observed); relaying it would send the client past the cache and, in an air-gapped deployment, to nowhere | observed |

**No URL rewriting.** Unlike npm's `dist.tarball`, PyPI's file anchors and Galaxy's
`download_url`, no Go response carries a URL: every next request is derived by the client from
`$base`. The format-specific transform `format-handler-interface.md` names is empty for Go, and
the redirect rule above is what stands in for it.

**Integrity is the hard part.** The proxy layer's settled stream-and-verify decision assumes a
digest declared alongside the coordinate and computed over the streamed bytes. Go has neither:
the integrity value is the `h1:` dirhash, a SHA-256 over a sorted summary of the zip's *entries*
(`dirhash.Hash1`: for each file in sorted path order, the hex SHA-256 of its content, two
spaces, the path, a newline; then base64 of the SHA-256 of that summary), and it is published
in the checksum database, not in any GOPROXY response. Adopted (the resolved verification
decision below): **the registry fetches a `.zip` completely into staging, runs the reference
checks and hash (`zip.CheckZip`, `dirhash.HashZip`), looks the module version up in the
checksum database through its own mirror, and commits to the CAS only on a match.** That is
`proxy-cache.md`'s **completion-only fetch-and-cache mode** (its resolved completion-only
decision, was Q15, and AC20), which this spec asked for and which admits a handler-supplied
verifier in place of a stream digest: the handler passes the verifier (the reference checks plus
the mirror lookup) in the fetch request, the proxy layer spools the body, runs the verifier over
the complete body, and commits under the computed digest only when it passes. The client's
timeline is the shared mode's, not the one this spec first adopted: the initiating client
receives its first body byte while the fetch is in flight and its response **completes only
after the verifier passes**, so a mismatch or a truncated body commits nothing, records the
reason under `cache_fetch_failures_total`, raises the security signal in the removal table below
where the record disagrees, and reaches the client as a short-closed transfer the `go` command
reports as a failure ("unexpected EOF" or a `go.sum` mismatch on its own check) and never as a
module it accepts. `proxy-cache.md` names the short-close observation with the real client in
`conformance/go/proxied_test.go` (AC20's list, `go` first). The `.mod` is verified the same way
against the `/go.mod` line. For a module path that matches a no-sum pattern (a hosted prefix,
or an operator pattern on the mirror) the record cannot exist: the verifier runs the structural
checks only, the content is cached, its verification state is recorded as unverifiable, and the
client verifies against its own `go.sum` as it does for any private module. A request carrying
neither a digest nor a verifier is refused by the proxy layer before any upstream request, so
this handler cannot forget the hook (`proxy-cache.md` AC20).

**Toolchain downloads ride this path.** Since Go 1.21, `GOTOOLCHAIN=auto` and explicit
`GOTOOLCHAIN=go1.N.P` download toolchains "packaged as special modules with module path
`golang.org/toolchain` and version `v0.0.1-goVERSION.GOOS-GOARCH`", proxied by `GOPROXY` and
"checked by the Go checksum database"; the toolchain guide is explicit that "toolchain
downloads fail for lack of verification if `GOSUMDB=off`" and that "`GOPRIVATE` and `GONOSUMDB`
patterns do not apply". Observed: a fresh `GOTOOLCHAIN=go1.26.0 go version` requested only
`golang.org/toolchain/@v/v0.0.1-go1.26.0.linux-amd64.zip` (answered upstream with a 302), then
the `supported` probe, the lookup and tiles, and ran the downloaded toolchain; with
`GOSUMDB=off` it failed with "verifying module: checksum database disabled by GOSUMDB=off"
(`useSumDB` in `sumdb.go` forces the lookup for that path). Two consequences: the passthrough is
not optional for a registry that wants toolchain switching to work behind it, and the
toolchain module must never be covered by a no-sum pattern.

Upstream removal maps onto the settled purge-or-flag table as Go's side of that contract:

| Upstream event, as observed at revalidation | Classification |
|---|---|
| A cached `.zip` or `.mod` whose dirhash disagrees with the checksum-database record, or an upstream serving different bytes for a coordinate already cached | The **explicit security signal**: purge the cached content and alert the operator. Go has no holding-package convention; the transparency log disagreeing with served bytes is the ecosystem's one machine-detectable "this is not the module" event |
| A version vanishing from the upstream (404 or 410 where content was cached, or dropped from `list`) | Keep serving, record an operator-visible divergence. The reference wants retracted versions to "remain available in version control repositories and on module proxies to ensure that builds that depend on them are not broken", and proxy.golang.org states it keeps serving deleted releases for the same reason |
| A `retract` directive appearing in a newer version's `go.mod` | An ordinary metadata change: a new version arrived. Never a removal event; the client, not the registry, hides the retracted version |
| `Origin` or `Time` changing in an `.info` | An ordinary metadata change, propagated at the next revalidation |

Detection happens at revalidation: per `proxy-cache.md`'s resolved answer (was Q12) the proxy
layer never polls an upstream, and the active channel is `supply-chain-policy.md`'s advisory
feed under the shared security-signal rule. Serve-stale applies to `list`, `@latest` and `.info` under the settled
bound; `.mod` and `.zip` are immutable and never stale.

### The checksum-database passthrough

Adopted (the resolved checksum-database decision below): **the registry mirrors the checksum
database under `$base/sumdb/$name/` for every database name it is configured for
(`sum.golang.org` by default), answering `supported` with 200 and forwarding the rest through
its mirror repository, and it refuses to forward lookups for module paths it hosts or the
operator marks private.**

The contract, from the design and the client source (`initBase` in `sumdb.go`): before any
database access through a proxy the client fetches `$proxy/sumdb/$name/supported`; a 200 means
"use the proxied access method only, never falling back to a direct connection to the
database"; a 404 or 410 means "the proxy is unwilling to proxy the checksum database, and the
client should connect directly"; any other response is "the database being unavailable". So a
registry that answers 200 has promised to be the client's only route, and it is that promise,
not the caching, that makes the passthrough load-bearing: it is what keeps an air-gapped or
egress-controlled fleet verifying, and what makes toolchain switching work behind the registry
at all. proxy.golang.org itself answers 404 to `supported` (observed), so a client behind it
goes direct to sum.golang.org; a registry copying that would inherit the same hole.

Endpoints and their classification for the fetch-and-cache API:

| Endpoint | Classification |
|---|---|
| `/supported` | Answered locally, 200, no upstream request |
| `/latest` | Mutable metadata with the short TTL: a signed tree head that grows continuously |
| `/lookup/$module@$version` | Mutable metadata with a TTL: the record id and `go.sum` lines are permanent, but the response ends with a signed tree head that advances, and the client merges whatever head it receives into its timeline (`mergeLatest`), so a cached response is valid but ages |
| `/tile/$H/$L/$K` (full tile) | **Immutable artifact**: a full tile's hashes never change |
| `/tile/$H/$L/$K.p/$W` (partial tile) | Mutable metadata with the short TTL, and its 404 is negatively cached with the short TTL only: the design requires clients to "fall back to fetching the full tile if a partial tile is not found", so a missing partial is normal, not an error |
| `/tile/$H/data/$K[.p/$W]` | As the corresponding tile; auditors' data, not on the client's path |

Observed, tile height 8: a first lookup pulled the record (`lookup/...` then one full
level-1 tile, a partial level-3 tile of three hashes, partial level-2 and level-1 tiles and a
partial level-0 tile under `x254/758.p/123`, then two full tiles); the second module's lookup
reused the timeline and fetched only the tiles its inclusion proof needed. Responses are
`text/plain`; tree heads are notes whose signature line the note format opens with U+2014
and the key name `sum.golang.org`; the client verifies them against the key it ships
(`sum.golang.org+033de0ae+...` in `key.go`). **The registry holds no key and signs nothing**:
it forwards notes byte for byte, and a client detects a tampered or forked log itself
(`checkTrees` prints "go.sum database server misbehavior detected"). A registry that rewrote a
note would only make itself the misbehaving server.

**Refusal for private paths.** The design's privacy section is explicit that a lookup "requires
sending the module path and version to the database server", and the public database will try
to fetch an unknown module from its origin and log the attempt. The passthrough therefore
refuses, with a 403 and a `text/plain` body naming `GONOSUMDB`, any lookup whose module path
matches a **no-sum pattern**: the module prefixes hosted in local repositories reachable from
the requesting repository (a local repository's own packages; a virtual repository's local
members), plus operator-configured patterns on the mirror (Athens's `NoSumPatterns`, whose
docs make the same argument), in the reference's `path.Match` glob-prefix syntax. `golang.org/toolchain`
can never match. The refusal is not forwarding: no request leaves the registry for a refused
path, which AC8 asserts at the network layer. The status is 403 rather than 404 because on this
endpoint a 404 already means "unknown version" and would be indistinguishable; the disclosure
that a prefix is private is accepted as smaller than the leak it prevents.

Offline mode follows `proxy-cache.md`: cached tiles and lookups serve, a lookup not cached
fails fast, and the client's verification fails closed, which is the correct outcome for a
module nobody has verified through this instance. The design's "privacy by bulk download"
(mirroring the whole log, roughly 20 GB at a hundred million versions) is the future answer
for a fully sealed deployment, out of scope here for want of any client-visible difference.

### GOPROXY fallback and the status codes this registry commits to

The client's proxy list is parsed in `proxyList` (`proxy.go`): entries separated by `,` fall
through to the next only on 404 or 410; entries separated by `|` fall through on any error,
timeouts included; `direct` and `off` end the list. Observed: with a dead first proxy the comma
form failed outright ("connection refused") and the pipe form succeeded through the second.
Two deployment recipes in the reference rest on this: a registry serving everything
(`GOPROXY=registry`, `GONOSUMDB=corp`) and a registry serving private modules with public
fallback (`GOPROXY=registry,https://proxy.golang.org,direct`).

The commitments, then: an unknown module or version is a 404 answered from the negative cache
within the short TTL, so the fallback recipe works and prefix probes are cheap; a deleted
hosted version is 410; a supply-chain policy refusal (`supply-chain-policy.md` AC2 and AC8,
whose refusal the shared layer decides and the handler renders per format) is a **403 with a
`text/plain` body naming policy**, written through the shared refusal writer `WriteRefusal` in
`internal/format` (`format-handler-interface.md` AC14), which on an HTTP/1.1 connection also
puts the condition into the status line's reason phrase, `Refused by policy: {condition}`
(`supply-chain-policy.md`'s resolved refusal-status-line decision, was Q10, and its AC18); the
`go` command prints both the status line and the `text/plain` body of a proxy error, so the
condition reaches the user either way, which AC10's case records; the status is 403 because the
reference gives exactly that status the meaning "a proxy could respond with error 403
(Forbidden) for modules not on an approved list" and the client stops rather than fetching the
refused module from the next proxy, which is the fallback capture that fills Go's `pending` row
of `supply-chain-policy.md`'s "When a refusal binds, per format" table in the same change as
AC10's case (its AC20; the harness refuses a policy case while the row is `pending`,
`conformance-harness.md` AC26); and the
`format-handler-interface.md` AC10 denial for an unauthorized or unmapped request is the same
response an unauthorized caller gets everywhere, which `auth.md`'s existence-oracle rule makes
a 404, and a 404 on a proxy is a fallback signal: a private module a caller may not read looks
exactly like a module the registry does not have. That is the settled rule applied, not a
Go-specific choice, and it is stated so nobody "fixes" it into a 403.

### Name normalisation and other traps

Collected because each one is a way to pass a hand-written test and fail the real client:

- **The escaped and unescaped forms.** `!x` encoding, percent-encoding of `!` on the wire, `+`
  and `/` raw, the lookup path using the bang form without percent-encoding, and the unescaped
  path as the only model key (above).
- **The canonical-version invariant.** For a canonical `$version` the `.info` `Version` must
  equal it; for a non-canonical one the response is the resolution. On the hosted path only
  the first exists.
- **`list` must not become "what I have cached".** Proxied `list` is the upstream's, or
  `@latest` and version queries silently shrink to the cache's contents.
- **`list` may carry a second column.** Lines are split on whitespace; a proxy that appends
  timestamps is valid input, and one that writes anything else after the version is not.
- **Prefix probes are a storm.** Every `go get` of a package path probes every prefix;
  without a fast negative cache the format is unusably slow against a slow upstream.
- **The module cache and the sumdb timeline hide the registry.** Fresh `GOMODCACHE` and
  `GOPATH` per case, or a case proves nothing.
- **Toolchains are modules with a 302 behind them** and a mandatory checksum-database lookup
  that no environment variable can switch off.
- **Retract is content, not state.** Serving a retracted version is correct; hiding it breaks
  the builds the ecosystem explicitly protects.
- **The zip has rules the client enforces on receipt**: prefix, size caps, case-fold
  collisions, `go.mod` placement. A hosted upload that skips `zip.CheckZip` stores a zip the
  client will refuse to extract, and the refusal appears at the client as "malformed module"
  with the registry blamed.
- **`+incompatible` and the missing `go.mod`.** The suffix means "no `go.mod`", and a zip with
  one under that version is invalid.
- **Synthetic `.mod` files must be exactly one line.** `module $module` and a newline; the
  client hashes the bytes and any decoration changes the `/go.mod` sum.
- **The `.info` `Time` feeds pseudo-version choice.** On the hosted path it is whatever the
  publisher supplied or the upload time; a wrong `Time` reorders `@latest` among
  pseudo-versions.
- **Unknown `.info` fields are the future.** `Origin` is already there; the registry passes
  unknown members through untouched on the proxied path and never adds its own on the hosted
  path, since "other names are reserved".
- **`go get -insecure` is gone** ("-insecure flag is no longer supported; use GOINSECURE",
  observed on go1.25.5), and `GOINSECURE` "only applies to dependencies that are being
  fetched directly": neither touches proxy traffic. A plain `http://` `GOPROXY` works without
  any flag (every probe in this spec ran over `http://`), but carries no credentials (below).

### Non-interactive client auth

Grounded against the reference's "Passing credentials to private proxies" and `go help goauth`
on go1.25.5, and against the probe:

- **`.netrc` (the default `GOAUTH=netrc`)**: `machine host` entries yield HTTP Basic. The
  machine name cannot carry a path, so credentials cannot be scoped below the host, and "the
  `go` command only applies credentials obtained through `GOAUTH`, including its default
  `netrc` method, to HTTPS requests". Observed: over `http://` the client sent no
  `Authorization` header at all with a matching `.netrc`.
- **`GOAUTH=<command>`** (Go 1.24 and later): the command prints URL prefixes and the headers
  to attach, so a `Bearer` token scoped to one path on the registry is expressible; also
  HTTPS-only (observed: no header over `http://`). On a 4xx the client re-runs the command with
  the URL and the response, once.
- **`GOAUTH=git dir`**: `git credential fill`, for deployments already holding tokens there.
- **Credentials in the `GOPROXY` URL** (`https://user:token@host`): accepted over HTTPS;
  over `http://` the client refuses outright ("refusing to pass credentials to insecure URL",
  observed).

So this format's row in `auth.md`'s client table is: HTTP Basic from `.netrc` (username
arbitrary, token as password, the same Basic form pip and Maven use) or a header a `GOAUTH`
command emits (`Bearer` being the one this registry accepts), HTTPS only. Both forms are already
in that spec's presentation-forms table and AC31 (the Basic password and `Bearer` forms are
universal), so nothing new is asked of the verifier; the `go` row itself is still absent from
the client table at ddc73fb and remains a consequence for `auth.md`, recorded again in this
pass's Review Log. For the harness this means every Go case runs over TLS with the harness CA
injected through
`SSL_CERT_FILE` (honoured by `crypto/x509` on Linux, verified in `root_unix.go`), which the
harness's TLS-interception rule already requires; the `setup` vocabulary's token provisioning
suffices, written into the client container's `.netrc` or a one-line `GOAUTH` script. Nothing
new is asked of the harness vocabulary. Anonymous read of a repository with anonymous read
enabled works with no `.netrc` at all, and the unauthenticated and unauthorized cases required
of every format (`format-handler-interface.md` AC7, `auth.md` AC8) are meaningful from the
first commit because repositories are private by default.

### Addressed objects and pattern scopes

`auth.md`'s pattern scopes narrow a credential within one repository by matching the object each
request addresses, and the format declares which object each route reports ("Pattern scopes"
there; `format-handler-interface.md` AC12). A module path is already `/`-segmented, so it is
the object as it stands, **unescaped** (the `!`-encoding decoded, as the package key is), and a
version joins it with `@` inside the last segment, the ecosystem's own `module@version` form:

| Route | Object kind | Canonical object |
|---|---|---|
| `$module/@v/list`, `$module/@latest` | named | `{module}` |
| `.info`, `.mod` and `.zip` for a version, a branch or a revision | named | `{module}@{version}`, the version as the request names it |
| Hosted upload, `PUT $module/@v/$version.zip` | named | `{module}@{version}` |
| Every checksum-database passthrough route under `/sumdb/$name/` | none | - |

Consequences, applying `auth.md`'s rules rather than re-deciding them. Because the version sits
inside the last segment, `corp.example.com/*` covers a one-level module and every version of it,
while a major-suffixed `corp.example.com/lib/v2` is one segment deeper and needs
`corp.example.com/**`. The passthrough reads the checksum database's log, not an object of this
repository, so it is refused to a patterned credential; that costs a patterned client nothing
for the modules it is confined to, since hosted modules are covered by `GONOSUMDB` in any case
(AC1) and the client then never consults the database for them, but a build that also resolves
public modules through the registry holds an unpatterned scope on the repository serving them.
A refusal here is the existence rule's 404, which a `GOPROXY` list reads as "try the next
entry", exactly as the status-code section already states for an unauthorized caller.

No route on this format reports the fourth object kind, `descriptor` (`auth.md`'s resolved
name-free-document decision, was Q23), and the choice is deliberate for the one place it could
apply. `/sumdb/$name/supported`, `/latest` and a full tile name no module, so they could be
descriptors; but a patterned `pull` that were granted `supported` (200, "use only me") and then
refused `lookup` (which names a module, so `none`) would fail the client's verification outright,
whereas the 404 a `none` route gives on `supported` makes the client go direct to the database,
which works for every public module. Reporting `none` on the whole passthrough is therefore the
answer that keeps a patterned client building; the sentinel test `format-handler-interface.md`
AC12 runs against descriptors has nothing to run against here.

### Signing, provenance and supply-chain policy

The protocol carries no signatures. Provenance is the checksum database's transparency log
(passed through, never re-signed) and, where an upstream supplies it, the `.info` `Origin`
object (VCS, URL, ref, hash), stored opaquely and served back. Nothing here needs a signed
index, so the write-triggered-services prototype has no Go instance: no publish regenerates a
repository-wide document, and the only signed material in the ecosystem is produced by
sum.golang.org. `supply-chain-policy.md` meets this format at two points: coordinate-level
advisory matching needs only the module path and version the core already knows (Go's
advisories are published in OSV form at vuln.go.dev, `GO-` identifiers), and a refusal is
rendered as the 403 above so the client stops on it. Retraction is an author's signal and is
never a policy input, because the registry never reads it.

### What it needs from Deps

The pinned `Deps` (`format-handler-interface.md`): the CAS, the metadata store at all three
levels with snapshot-pointer resolution, the fetch-and-cache entry point with classification
as an argument, the central authorizer, and the request logger. The two things this spec once
asked of siblings beyond the pin both exist inside it: the fetch-and-cache request shape carries
a handler-supplied verifier in place of a stream digest (`proxy-cache.md`'s Obligation section,
was Q15; recorded as a re-open input in `format-handler-interface.md`), and the checksum
database is an `https` upstream on its own `remote` (`upstream-adapters.md`), so no adapter kind
was added. The handler also reads the mirror repository during a module fetch (the lookup that
verifies the zip); that is the same handler reading a second repository through `Deps`, not a
handler reaching into another handler, and the architecture tests that hold
`format-handler-interface.md` AC2 and AC3 are unaffected. Policy refusals are rendered through
the `WriteRefusal` writer declared beside `Deps` (`format-handler-interface.md` AC14).

### Capabilities and lifecycle

`Capabilities()` declares proxy support `supported`, reference-implementation availability
`available`, `Virtual: supported` and `Rename: supported` (`format-handler-interface.md` AC13).
Virtual aggregation is the single-`GOPROXY`-base case AC15 already proves: a module path resolves
at the first member that has it and `list` is never merged across members, the
dependency-confusion-closing order every format spec adopts; nothing on this wire is signed with
the repository name (the only signed material is the checksum database's, forwarded byte for
byte), so aggregation is possible where `hex.md` found it was not. A rename changes no served
byte: no GOPROXY response carries a URL or the repository name, so the same files serve under
the new base and the old name answers the existence rule's 404, which a `GOPROXY` list reads as
"try the next entry". `repository-lifecycle.md` AC12 requires `conformance/go/rename_test.go`,
enforced by the harness's case-set validator (`conformance-harness.md` AC26); AC19 carries it
with a real `go mod download` from the renamed repository.

### Conformance, clients and the corpus

**Client pins** (the resolved client-version decision below): the current stable `go`
(1.26.x) and Go 1.20.x, pinned by image digest. The skew that matters on the wire is
Go 1.21's toolchain switching (a 1.20 client never requests `golang.org/toolchain`) and Go
1.24's `GOAUTH`; 1.20 also predates the `Origin` field, so it exercises the reference's
"other names are reserved" promise from the client side. Hosted publishing has no `go` client,
so its cases drive the upload with `curl` and then prove the result with `go`, the same split
the generic format uses.

**The recorded surface** for AC12's corpus, named now because a thin recording script yields a
thin specification (the harness spec's own warning), recorded against proxy.golang.org and
sum.golang.org as the authoritative reference (`conformance-harness.md`, resolved
authoritative-reference record) with the passthrough proxied by the recording proxy: a pinned
download with a fresh sumdb timeline; a second download of a different module on the warm
timeline; `go list -m -versions` with and without `-retracted` on a module with retractions;
`@latest` on a module with tags and on one with none; a branch `.info`; an uppercase module
path; a `+incompatible` version; a package-path `go get` that provokes prefix probes; a
nonexistent version and a nonexistent module; and a toolchain switch with a fresh cache.
Normalisation rules, reviewed as the harness requires: signed tree heads and lookup tails
(they advance), partial tiles (their width grows), `Origin` hashes for branch queries (they
move), and `Cache-Control`/`Expires` headers. Full tiles and every `.mod` and `.zip` body are
byte-exact and must not be normalised. Recording gates on `conformance-harness.md` AC13, and
every deliberate divergence (the passthrough answering `supported` with 200 where
proxy.golang.org answers 404; refusals for private paths) goes on the recorded exception list
before its flow is expected to replay.

## Acceptance Criteria

- [ ] AC1: `go mod download` and `go build` against a hosted repository resolve, verify and
      install a module for two pinned `go` versions, one before Go 1.21 and the current
      stable, with a fresh `GOMODCACHE` and `GOPATH` per case; with `GONOSUMDB` covering the
      hosted prefix the download succeeds, and without it the checksum-database lookup is
      refused with a body naming `GONOSUMDB` and the module path is never sent upstream,
      asserted at the network layer.
- [ ] AC2: A module zip uploaded by `PUT` to `$module/@v/$version.zip` becomes downloadable
      by the real client with the `.info`, `.mod` and `.zip` the registry derived from it; the
      `.mod` is the zip's `go.mod` byte for byte, or the one-line synthetic form when absent;
      the client's resulting `go.sum` lines equal the `h1:` sums the registry recorded; and a
      second upload of the same version is refused with 409 and leaves no snapshot behind.
- [ ] AC3: A module path with uppercase letters and a version with uppercase letters resolve
      through the real client's `!`-encoded, percent-encoded requests on both paths, are
      stored under the unescaped path, and a `+incompatible` version and a `/v2`-suffixed
      module path each resolve as distinct coordinates; a request whose escaped form is
      invalid is answered 404.
- [ ] AC4: Hosted `list` contains every canonical non-pseudo version and no pseudo-version;
      for a hosted module with only pseudo-versions `@latest` returns the newest by `Time`
      and `go get m@latest` selects it; a version retracted by the latest `go.mod` is hidden
      by `go list -m -versions`, shown with `-retracted`, skipped by `go get m@latest`, and
      still installed by `go get m@$retracted` with the rationale printed, while the registry
      served every one of its files with 200.
- [ ] AC5: A pseudo-versioned zip uploads and serves as any version; a hosted `.info` request
      for a branch name is 404; on the proxied path a branch `.info` is served through the
      upstream and revalidated after its TTL and not before, proven against a mutating
      stand-in upstream whose branch tip moves.
- [ ] AC6: The proxied path downloads a module through an upstream speaking the GOPROXY
      protocol and serves it to a second client, from fresh client state, with the second
      client reaching this registry and the upstream receiving no request for `.mod` or
      `.zip`, both asserted from the transcript and at the network layer; `list` and `@latest`
      are revalidated after their TTL and not before against the mutating stand-in.
- [ ] AC7: A proxied `.zip` whose dirhash disagrees with the checksum-database record, and a
      `.zip` whose body ends early or stalls, each commit nothing to the CAS, leave no `File`,
      cached reference or negative entry behind, reach the real client as a short-closed transfer
      it reports as a failure and never as a module it accepts (the client streamed from the
      first byte and its response completed only after the verifier passed), and record the
      failure for the operator under `cache_fetch_failures_total` with its reason
      (`proxy-cache.md` AC20); a fetch-and-cache request without the verifier is refused before
      any upstream request; a matching `.zip` commits once and a second fetch of identical
      content elsewhere dedups to the same blob; a `.mod` is verified the same way against its
      `/go.mod` record.
- [ ] AC8: `/sumdb/sum.golang.org/supported` answers 200 and a fresh client with the default
      `GOSUMDB` completes lookup and tile verification entirely through the registry, with no
      connection to sum.golang.org from the client asserted at the network layer; a second
      client's lookup of another module is served with the full tiles it needs coming from
      cache; a lookup for a hosted prefix or an operator no-sum pattern is refused with 403,
      a body naming `GONOSUMDB`, and no upstream request.
- [ ] AC9: With a fresh cache, `GOTOOLCHAIN=go1.N.P go version` behind the registry downloads
      `golang.org/toolchain` through it, the upstream's redirect is followed by the registry
      and never relayed to the client, the zip is verified through the passthrough, and the
      downloaded toolchain runs; the same command with `GOSUMDB=off` fails with the client's
      own verification error and the registry serves nothing unverified.
- [ ] AC10: An unknown version, an unknown module and every non-module prefix probed by a
      package-path `go get` are answered 404 from the negative cache within the short TTL,
      so that `GOPROXY=registry,direct` falls through to `direct` for the unknown module
      (asserted with the real client and at the network layer) and the package resolves
      without a stall; a supply-chain policy refusal is answered 403 through `WriteRefusal`
      with a `text/plain` body naming policy and, on the HTTP/1.1 connection the harness
      terminates, the status line `Refused by policy: {condition}` observed on the raw socket,
      the real client printing the condition and the same `GOPROXY` list not falling through for
      it; and that captured non-fallback fills Go's row of `supply-chain-policy.md`'s "When a
      refusal binds, per format" table in the same change (its AC20).
- [ ] AC11: A hosted upload violating the zip rules is refused with a body naming the rule:
      a wrong `$module@$version/` prefix, two paths equal under case-folding, a `go.mod`
      below the top level, a `go.mod` whose `module` line disagrees with `$module`, a
      `+incompatible` version carrying a `go.mod`, a non-canonical version, and an entry
      whose size disagrees with its declared size; and a zip the registry accepts is
      extracted by the real client without error.
- [ ] AC12: Replay-match passes against a corpus recorded from proxy.golang.org and
      sum.golang.org covering the recorded surface named in Design, with the named
      divergences on the exception list.
- [ ] AC13: The real client authenticates through `.netrc` Basic and, on the Go 1.24 or later
      pin, through a `GOAUTH` command header, both over TLS; a credential is never presented
      over plain HTTP by the client, proven by a plain-HTTP case whose transcript carries no
      `Authorization` header; and the unauthenticated and unauthorized cases in both modes
      are denied as `auth.md` requires.
- [ ] AC14: A version vanishing from the upstream keeps serving with an operator-visible
      divergence, a retraction arriving in a newer `go.mod` propagates as an ordinary new
      version and purges nothing, and a cached `.zip` found to disagree with the
      checksum-database record at revalidation is purged with the operator alert raised, as
      Go's side of the settled removal table in `proxy-cache.md` (its AC13).
- [ ] AC15: A virtual repository fronting a hosted member and a proxied member serves a
      private module from the hosted member and a public one through the proxied member
      under one `GOPROXY` base, resolves each module path at the first member that has it
      with `list` never merged across members, and answers `/sumdb/` for the whole
      aggregate with the hosted member's prefixes refused.
- [ ] AC16: On the proxied path the `.info` of a canonical version is served only when the
      upstream's `Version` equals the requested version, and an upstream body whose
      `Version` differs is rejected without caching; unknown `.info` members such as `Origin`
      are passed through unchanged, and hosted `.info` bodies carry only `Version` and
      `Time`.
- [ ] AC17: A hosted version deleted through the registry-owned management API
      (`delete-version`) leaves `list`, its `.info`, `.mod` and `.zip` answer 410, and
      `GOPROXY=registry,direct` falls through for it with the real client; the deletion creates
      exactly one snapshot, a principal without `delete` is refused with none created, and a
      deletion against a proxied repository is refused `405`; the kind has a `script`-driven
      conformance case (`management-api.md` AC24); and a later upload of the deleted version is
      refused with 409 as AC2 refuses a duplicate, on the core-held `Retirement` record,
      including after the deletion's snapshot has been pruned, after the default pointer has
      been repointed to a snapshot older than the deletion and back, and after the module's last
      version is gone.
- [ ] AC18: A token holding `pull` and `push` under the pattern `corp.example.com/**` uploads
      `corp.example.com/lib` and `corp.example.com/lib/v2` and downloads both through the real
      client with `GONOSUMDB` covering the prefix, and is refused `list`, `.info` and `.zip` for
      `other.example.com/lib` and an upload there; a token patterned `corp.example.com/*`
      downloads `corp.example.com/lib@v1.0.0` and is refused `corp.example.com/lib/v2`; a
      patterned token is refused every `/sumdb/` route; and in proxied mode a patterned token
      downloads an in-pattern module through the cache and is refused an out-of-pattern one.
- [ ] AC19: The handler's `Capabilities()` declares proxy `supported`, reference-implementation
      availability `available`, `Virtual: supported` and `Rename: supported`; a real
      `go mod download` from a renamed repository succeeds under the new name in both modes with
      a fresh module cache, while the old name answers 404 and `GOPROXY=old,new` therefore
      resolves through the new name; and a virtual repository of two members serves a module
      present in both from the first member (AC15's case).

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/go/hosted_test.go` (two pinned clients; `GONOSUMDB` set and unset; network-level assertion on the sumdb refusal) |
| AC2 | conformance + integration | `conformance/go/upload_test.go` (curl upload, `go` download, `go.sum` line comparison); `internal/format/go/derive_test.go` (synthetic `.mod`, `h1:` sums against `dirhash`) |
| AC3 | conformance + unit | `conformance/go/escaping_test.go`; `internal/format/go/escape_test.go` (invalid escapes, `+incompatible`, major suffix) |
| AC4 | conformance | `conformance/go/versions_test.go` (list, `@latest` on pseudo-only, retraction flows with transcript assertions on the served files) |
| AC5 | conformance | `conformance/go/pseudo_test.go` (hosted pseudo-version upload; hosted branch 404; proxied branch TTL against the mutating stand-in) |
| AC6 | conformance | `conformance/go/proxied_test.go` (fresh `GOMODCACHE` and `GOPATH` in setup; transcript plus network-level assertion; TTL cases) |
| AC7 | integration + fault injection + conformance | `internal/format/go/verify_test.go` (stand-in upstream and stand-in checksum database; mismatch, truncation, stall, dedup, the verifier-less request refused; the per-client byte timeline of `proxy-cache.md` AC20's `internal/proxy/completion_mode_test.go` with the Go verifier as fixture); `conformance/go/proxied_test.go` (a stand-in that truncates and one whose record disagrees, the real client's short-close failure and the absent `File` asserted, the case `conformance-harness.md` names for `go` under `proxy-cache.md` AC20) |
| AC8 | conformance | `conformance/go/sumdb_test.go` (fresh timeline; network-level assertion of no direct connection; warm second client; refusal cases) |
| AC9 | conformance | `conformance/go/toolchain_test.go` (fresh cache; redirect asserted followed server-side; `GOSUMDB=off` failure case) |
| AC10 | conformance | `conformance/go/fallback_test.go` (negative cache timing; `GOPROXY=registry,direct` with network-level assertion); `conformance/go/policy_test.go` (hosted and proxied modes; rules through the `policies` key, a controlled advisory through `advisories`; the raw status line read from the socket; the client's output; `GOPROXY=registry,direct` not falling through, the capture for `supply-chain-policy.md` AC20's row) |
| AC11 | integration + conformance | `internal/format/go/zipcheck_test.go` (each refusal); `conformance/go/upload_test.go` (accepted zip extracted by the client) |
| AC12 | conformance | `conformance/go/replay_test.go` |
| AC13 | conformance | `conformance/go/auth_test.go` (`.netrc`; `GOAUTH` command on the 1.24+ pin; plain-HTTP transcript; unauthenticated and unauthorized in both modes) |
| AC14 | integration | `internal/format/go/removal_test.go` (stand-in upstream presenting each event class; the shared-layer half is `proxy-cache.md` AC13's) |
| AC15 | conformance | `conformance/go/virtual_test.go` (hosted plus proxied members; per-module first-match; sumdb refusal for the hosted prefix) |
| AC16 | integration | `internal/format/go/info_test.go` (version-mismatch rejection; unknown-member passthrough; hosted body shape) |
| AC17 | integration + conformance | trigger: `internal/format/go/manage_delete_test.go` (snapshot count, `delete` refusal, proxied `405`, retired-version refusal on the core-held record after pruning under an injected clock, after a backwards repoint and back, and after last-version deletion; the 410 rendered from the `Retirement` record); effect: `conformance/go/delete_test.go` (the `script`-driven case for the declared kind, `management-api.md` AC24 and `conformance-harness.md` AC26: the `script` deletes through the management endpoint, then the real client sees 410 and falls through, and a `curl` re-upload is refused; a second case starts from a `Retirement` record seeded through `state`) |
| AC18 | conformance + unit | `conformance/go/auth_test.go` (the pattern-refusal case `format-handler-interface.md` AC7 requires, in both modes; pattern-scoped tokens provisioned through the `credentials` key); `internal/format/go/scope_object_test.go` (the object table, per route, no descriptor route, `format-handler-interface.md` AC12) |
| AC19 | unit + conformance | `internal/format/go/capabilities_test.go` (the four declarations, `format-handler-interface.md` AC13); `conformance/go/rename_test.go` (`repository-lifecycle.md` AC12, presence enforced by `conformance-harness.md` AC26; download under the new name, 404 and fall-through under the old); `conformance/go/virtual_test.go` (AC15's case, first-member resolution) |

The case set needs only keys already in the harness's closed `setup` vocabulary: `repositories`,
`credentials`, an `upstreams` stand-in for the GOPROXY upstream and one for the checksum
database, `state` for pre-uploaded versions and seeded `Retirement` records
(`management-api.md`, "Retirement is core-held"), and `policies` with `advisories` for AC10.

## Implementation Phases

### Phase 1: Hosted core
- Routing and case-decoding, upload with the reference zip checks, `.mod` and `.info`
  derivation, `h1:` sums, `list` and `@latest`, republish refusal, the write boundary
- The per-route addressed-object declaration and the pattern-scope cases (AC18),
  `Capabilities()` with the rename and virtual cases (AC19)

### Phase 2: The checksum-database passthrough and auth
- The mirror repository on its `https` upstream (`upstream-adapters.md`), `supported`, tile and
  lookup classification, no-sum refusal, TLS-only credential cases

### Phase 3: Proxied path
- Classification table, the completion-only fetch with the handler-supplied verifier for `.zip`
  and `.mod` (`proxy-cache.md` AC20) and the short-close case, redirect following, negative
  caching for versions and prefix probes, the 403 gatekeeper rule through `WriteRefusal` with
  the phrase case (AC10), toolchain downloads, the removal table, virtual aggregation

### Phase 4: Corpus and gate
- Recording session across the named surface (after the harness redaction gate), replay-match,
  the second pinned client, experiment-log entries

### Phase 5: Management surface
- Waits on `docs/internal/plans/foundation/management-api.md` reaching `planned`
- The `Operator` interface declaring `delete-version`, the 410 rendered from the core-held
  `Retirement` record, the coordinate returned in `Outcome` (AC17)

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. The six questions this draft raised were each written in the template's decision
shape and then adopted at their own recommendation under the owner's standing delegation of
2026-09-26, folded through Scope, Design, the criteria and the Test Plan in the same pass.
Each is recorded below as adopted, never as decided, so the owner can find and reverse any of
them; `grep -rn "standing delegation"` is the review queue.

### Resolved: what "hosted" means for Go (was Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: hosted publishing is a
registry-owned `PUT` of a module zip to `$module/@v/$version.zip`, with `.info`, `.mod` and
the `h1:` sums derived by the registry (Design, "Hosted: what publishing means for Go").

The question as written: the ecosystem has no publish API and no publish client, so "hosted"
must be defined by this registry, and the definition decides what the write boundary is, what
the oracle can prove, and whether the registry ever runs `git`.

**Recommendation:** A, because it is the only option that gives the hosted path a write
boundary the model can snapshot, an upload the harness can drive, and no code-execution
surface; it matches the one free prior art that hosts Go at all (Gitea).

| Option | You get | It costs |
|---|---|---|
| **A. Registry-owned zip upload on the zip's own URL** | A one-request write with everything derivable from the zip; Gitea-compatible publishing habits; no VCS in the registry | No `go` subcommand drives it, so publishers script `curl`, and the `.info` `Time` is only as truthful as the header they send |
| **B. The registry as a VCS-backed origin: clone configured repositories and synthesise modules** | Tag-to-publish, the ecosystem's native workflow; `direct`-mode fidelity for private code | The registry runs `git` (an egress and code-execution surface AC6 of the interface spec forbids in a handler), needs the unowned adapter axis, and has no client-driven write to snapshot |
| **C. No hosted path: a proxy-only format like Athens** | The smallest surface | Contradicts the constitution's both-paths rule and leaves private modules with no home but a git host |

**Why this is yours:** it sets what "publish a Go module" means on this product, ahead of any
UI or CLI, and whether the registry ever executes a VCS tool.

Accepted cost: publishers script an HTTP `PUT`, and a wrong `Go-Module-Time` reorders
`@latest` among pseudo-versions. B lost on the code-execution surface and the missing adapter
spec (it returns as the resolved VCS-origin decision below); C lost on the constitution.

### Resolved: mirroring the checksum database (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the registry answers
`supported` with 200 and proxies the checksum database with caching, refusing to forward
lookups for hosted prefixes and operator patterns (Design, "The checksum-database
passthrough").

The question as written: the passthrough is optional in the protocol, proxy.golang.org itself
declines it, and answering 200 is a promise to be the client's only route to the database.

**Recommendation:** A, because toolchain switching cannot work behind the registry without it,
an egress-controlled fleet cannot verify without it, and the refusal rule is what keeps a
private module path from ever reaching Google.

| Option | You get | It costs |
|---|---|---|
| **A. Proxy with caching; refuse private paths** | Verification and toolchain downloads work behind the registry alone; private paths never leave; tiles cached once for the fleet | The registry becomes the client's sole route and must stay up for verification; a refusal discloses that a prefix is private; a second upstream kind to adapt |
| **B. Answer 404 to `supported`, as proxy.golang.org does** | Nothing to build; the client goes direct | Every fresh client contacts sum.golang.org itself, air-gapped deployments cannot verify, and `GOTOOLCHAIN` downloads fail behind the registry |
| **C. Proxy without the refusal rule** | Simplest passthrough | Every private module path a client forgets to put in `GONOSUMDB` is sent to Google's database, which tries to fetch it and logs the attempt: the exact leak the design's privacy section warns about |

**Why this is yours:** it is a privacy guarantee and an availability promise the product will
be held to, not something the fleet can measure its way to.

Accepted cost: the registry is on the verification path and a refusal reveals a private prefix
exists. B lost on toolchains and air gaps; C lost on the leak.

### Resolved: verifying proxied zips without a stream digest (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: fetch the whole `.zip`
into staging, verify with the reference `zip.CheckZip` and `dirhash.HashZip` against the
checksum-database record, then commit and serve (Design, "The proxied path").

**Offered 2026-09-28 as `proxy-cache.md`'s completion-only mode (was Q15 there, AC20), with
one cost relaxed.** That spec admitted the verifier-after-full-receipt shape this record asked
for, and it weighed this record's own option A ("buffer the whole body, verify, then serve") as
its option B and declined it: the accepted cost below, "the client waits for the full upstream
fetch before its first byte", is stricter than the invariant requires and fails clients with a
first-byte deadline. The shared mode streams to the client while the spool fills and withholds
completion until the verifier passes, so nothing unverified enters the CAS and nothing
unverified is accepted by the client, while the first byte arrives early. This spec takes the
shared mode as-is rather than keeping a handler-local buffer: the correctness property (commit
only on a verified match, truncation caught by construction) is unchanged, the reference code
still runs as the verifier, and the client-side evidence of a refusal becomes a short-closed
transfer instead of a named error (Design, "The proxied path"; AC7).

The question as written: the settled stream-and-verify decision streams bytes to the client
while hashing and commits on a digest match, but Go's digest is a dirhash over sorted zip
entries and lives in the checksum database, so it cannot be a running hash of the body.

**Recommendation:** A, because the reference implementation of the check exists and is what
the client itself runs, a streaming dirhash would be a custom zip parser inside a security
check, and the reference already forbids relying on "digest of what arrived".

| Option | You get | It costs |
|---|---|---|
| **A. Fetch, verify with the reference code, then serve** | The check is the client's own code; nothing unverified is ever served; truncation is caught by construction | The client waits for the full upstream fetch before its first byte; an exception to the stream-and-verify default that `proxy-cache.md` must admit |
| **B. Stream to the client while computing the dirhash incrementally; abort on mismatch** | No added latency | A bespoke streaming zip parser (central directory is at the end; sizes may be in data descriptors) in the security-critical path, and a mid-stream abort the client reports as a network error |
| **C. Stream unverified and rely on the client's own `go.sum` check** | Nothing to build | The cache commits bytes it never verified, poisoning dedup-by-digest, which the proxy layer's integrity decision names as the thing never to do |

**Why this is yours:** it trades first-byte latency for a correctness property in the component
the charter names as where data is lost, and it amends a settled sibling decision.

Accepted cost, as first recorded: proxied `.zip` latency equals the upstream fetch, bounded by
the 500 MiB cap, and a requested amendment to `proxy-cache.md`. Since the amendment landed the
latency cost is the completion, not the first byte, and the request is discharged. B lost on
correctness risk; C lost on the CAS.

### Resolved: which client versions to pin (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: the current stable `go`
(1.26.x) and Go 1.20.x (Design, "Conformance, clients and the corpus").

**Recommendation:** A, because the wire-visible skew is at Go 1.21 (toolchain switching) and Go
1.24 (`GOAUTH`), and a pre-1.21 client is what many long-lived CI images still run; two
supported releases (1.25 and 1.26) differ in nothing this protocol can observe.

| Option | You get | It costs |
|---|---|---|
| **A. Current stable plus Go 1.20** | Both sides of the toolchain and `GOAUTH` boundaries exercised by real clients; the reserved-field promise tested from an older client | Pins a release outside upstream support, so its image never changes and its bugs are ours to know |
| **B. The two upstream-supported releases** | Only supported clients | Identical on the wire for every surface here, so the second pin proves nothing |
| **C. Three pins: 1.20, 1.23, current** | Each boundary isolated | The suite grows by half for a boundary (`GOAUTH`) that one auth case already isolates |

**Why this is yours:** it decides whether the conformance matrix vouches for an end-of-life
client, which is a support-posture call.

Accepted cost: an unsupported client image in the matrix. B lost on coverage; C on suite cost
without added evidence.

### Resolved: direct-mode origins as an upstream (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: v1 proxies only
upstreams that speak the GOPROXY protocol; a VCS-origin adapter is a follow-on spec, recorded
in Scope with its reason.

**Recommendation:** A, on evidence sequencing and correctness risk rather than effort: the
upstream adapter interface had no owning spec when this was raised (it now has one,
`upstream-adapters.md`, which excludes materialising modules from git origins by name, so the
follow-on would be a revision of that spec), and materialising modules from git means the
registry runs a VCS tool and synthesises `.info`, `.mod` and `.zip` with the reference's
pseudo-version and timestamp rules, a second implementation of what proxy.golang.org already
does for every public module.

| Option | You get | It costs |
|---|---|---|
| **A. GOPROXY-speaking upstreams only in v1** | Every public module through proxy.golang.org; private git-hosted modules publish through the hosted path or a private GOPROXY; no `git` in the registry | Teams that want tag-to-publish from a private git host wait for the adapter spec |
| **B. A git origin adapter in v1** | Tag-to-publish for private repositories | A VCS tool executing in the registry, the pseudo-version and timestamp validation rules reimplemented, and an adapter axis designed without its owning spec |

**Why this is yours:** it decides whether the registry ever executes a VCS tool, a security
posture the whole handler-egress rule exists to protect.

Accepted cost: private tag-to-publish is not a v1 capability. B lost on the execution surface
and the unowned adapter axis.

### Resolved: deletion and retraction on the hosted path (was Q6)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: no Go-specific
deletion endpoint; retraction needs no registry surface; hard deletion arrives through the
cross-format management surface, and this spec fixes only the protocol effect (410 and removal
from `list`) so that surface has a contract to meet.

The cross-format answer this record waited on has since been adopted: management operations are
kinds of one registry-owned management API, `docs/internal/plans/foundation/management-api.md`
(Go's deletion is its `delete-version` kind, with the 410 in its reconciliation table), per
`pypi.md`'s resolved hosted-yank decision (was Q1) and its Cluster 5 siblings. The 410 contract
therefore gained its policing criterion (AC17) and a Phase 5 gated on that spec, and folding it
applied the cross-format retirement rule those siblings adopted: a deleted version is never
re-uploadable, held since 2026-09-28 as a core-held `Retirement` record (`management-api.md` was
Q3, `data-model.md` AC35) rather than a set in the package-level document.

**Recommendation:** A, because Go already has an author-side soft-delete with fully specified
client semantics that the registry serves without doing anything, so the only surface left is
the one `question-triage.md` Cluster 5 was then deciding for every format at once; a Go-specific
endpoint would answer that question from the wrong spec.

| Option | You get | It costs |
|---|---|---|
| **A. No format-specific endpoint; protocol effect fixed here** | Retraction works from day one; the management-surface precedent stays with its cluster; the 410 contract is written before any producer | Hosted hard deletion waits on the cross-format decision, and the 410 rule has no policing criterion until then |
| **B. A Go-specific `DELETE $module/@v/$version`** | Operators can remove a bad upload today | Four formats answering one question four ways, a new deletion path `storage-and-gc.md` must know about, and a precedent set from the smallest format surface |

**Why this is yours:** it sequences a per-format surface against the portfolio-wide precedent
question, the same class as `pypi.md`'s hosted-yank question (was Q1).

Accepted cost: an unpoliced 410 rule until the management surface exists, now bounded by AC17
and the Phase 5 gate. B lost on the precedent.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | 4d1aeb1 | authoring pass: grounded first draft, not a review | Wire surface, status semantics, case-encoding, client request sequencing, retraction behaviour, prefix probing, the `list` second column, credential transmission (none over plain HTTP; URL userinfo refused), toolchain downloads (zip-only, upstream 302, mandatory sumdb even with `GOSUMDB=off`) and the checksum-database passthrough (supported probe, lookup and tile sequence, proxy.golang.org answering 404 to `supported`) all grounded against the module reference source, the go command's source in GOROOT 1.25.5 (`proxy.go`, `sumdb.go`, `fetch.go`, `toolchain.go`, vendored `x/mod` `module`, `zip`, `sumdb`, `dirhash`), the sumdb design, and real runs of go1.25.5 and go1.26.0 through a logging proxy in front of proxy.golang.org and sum.golang.org with fresh `GOMODCACHE` and `GOPATH`. Six questions written in decision shape and adopted under the standing delegation: hosted publishing as a registry-owned zip `PUT` on the zip's URL; the checksum-database passthrough with private-path refusal; fetch-then-verify for proxied zips (an exception to stream-and-verify requested of `proxy-cache.md`); client pins 1.26 and 1.20; GOPROXY-speaking upstreams only, VCS origins deferred; no Go-specific deletion endpoint with the 410 effect fixed. Sixteen criteria, each with a Test Plan row. Sibling consequences reported, not applied: an `auth.md` client-table row for `go`, a `proxy-cache.md` verify-after-receipt mode and a checksum-database adapter kind, and a `catalogue.md` note that this spec is family-neutral. |
| 2026-09-26 | da0aecd | cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Applied: the catalogue's Git-backed split (was Q3) cited in Context; the origin-checksum-database exclusion re-cited to the signing service (charter step 7) and `artifact-verification.md` (supply-chain was Q6); the Cluster 5 answer folded: deletion through `management-api.md` with 410, retirement set in the package-level document, republish refusal extended, AC17, Phase 5 and a precondition, and the Q6 record updated; proxy-cache's resolved Q12 cited; the addressed-object table (`{module}` for list and latest, `{module}@{version}` for version routes and upload, every `/sumdb/` route none) with AC18. Nothing found already done. Stays draft. |
| 2026-09-28 | ddc73fb | cross-spec reconciliation of the foundation wave. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` naming this file verified against the current text of its source spec before applying. From `proxy-cache.md` (its reconciliation item 2; was Q15, AC20) and `conformance-harness.md`: the verify-after-full-receipt mode this spec requested is offered as the completion-only mode with a handler-supplied verifier, and its own accepted cost, the client waiting for the whole fetch before its first byte, was weighed there as option B and declined; this spec takes the shared mode as-is (client streams, completion withheld until the verifier passes, a refusal a short-closed transfer), the Design integrity paragraph, the was-Q3 record, AC7 and its Test Plan row rewritten with `conformance/go/proxied_test.go` as the short-close case. From `upstream-adapters.md` (its row for this spec, AC1, the git-origin exclusion): the checksum database is an `https` upstream bound to its own `remote`, no adapter kind; the Blocking preconditions, Mapping, Scope, Deps section, Phase 2 and the was-Q5 record updated. From `management-api.md` (kind table, reconciliation table with the 410, binding rule, AC7, AC24) and its was Q3 with `data-model.md` AC35: deletion is `delete-version` declared through `Operator`, no binding, the retirement set replaced by the core-held `Retirement` record with the 410 rendered from it (the write boundary, Mapping, Hosted validation, AC17, Phase 5, the was-Q6 record). From `auth.md` was Q23: no Go route is a descriptor, decided and explained for the passthrough (`supported` as `none` sends a patterned client direct to the database, which works). From `supply-chain-policy.md` (was Q10, AC18, AC20) and `format-handler-interface.md` AC14: refusals through `WriteRefusal` with the status-line phrase; AC10 asserts the raw status line and its non-fallback capture fills Go's `pending` binding-table row, a `policy_test.go` added. From `artifact-verification.md` AC24 and `signing-service.md`: Go asks nothing, recorded as `none` in the matrix. From `repository-lifecycle.md` AC12 and `format-handler-interface.md` AC13: a Capabilities and lifecycle section, new AC19 with `rename_test.go` and `virtual_test.go`. Nineteen criteria, each with a Test Plan row. Already done before this pass: the pypi was-Q1 citations carried historical qualifiers. Consequences for other files: `auth.md`'s client table still has no `go` row (Basic from `.netrc`, or a `GOAUTH` header, HTTPS only; both forms already in its AC31), verified absent at ddc73fb; `supply-chain-policy.md`'s Go binding row stays `pending` until AC10's case lands. Stays draft. |
