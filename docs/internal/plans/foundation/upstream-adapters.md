---
status: draft
status_description: "Closing reconciliation sweep 2026-09-28 at 3135d95 on Opus (not a review): Q8 adopted under the standing delegation, a basic-exchange credential kind for Conan-shaped upstreams (Basic GET at a stored path, text/plain token, Bearer to the root and its root entries, one re-exchange on a fresh 401; AC33, Phase 3 with Conan); Q9 adopted, the Router selecting the adapter per location so a Terraform https remote hands a commit-pinned git location to the git adapter under the same row's allowlist, bound and cool-down, never a credential, with a row naming git refused (AC34, AC23, Phase 4); a Cargo requirements row and the crates.io and ConanCenter operator recipes; the Docker Hub CDN hosts captured at oci.md's Phase 4 (AC24). 34 criteria, each with a Test Plan row; zero open questions; fable_recheck extended; stays draft pending a gate review. Earlier: Reconciled 2026-09-28 at 9ebf6e9 with the foundation authoring wave (not a review): the Upstream row and UpstreamCredential store are cited as data-model.md's (AC40) instead of owed; a referenced credential's deletion is refused in-use and a changed remote binding keeps its cache with last-checked reset, with the Router resolving row and credential per fetch (AC30, shared with repository-lifecycle AC20 and AC25, management-api AC21); upstream-invalid is 422; traceparent and tracestate join the forbidden outbound set (AC4), MarkSecret precedes every credential use and the redaction list is held equal to telemetry.RedactURL's (AC20); the six upstream_* series and the two alerts under observability's names (AC31); the three upstream.* keys in the checked table shape with User-Agent computed from server.public_url (AC32); the nuget and maven profiles are shipped rows under proxy-cache's was-Q17. 32 criteria, each with a Test Plan row; zero open questions; stays draft pending a gate review. Earlier: authored 2026-09-27 at d9510af as a grounded first draft, not yet reviewed. Gathers the upstream requirements of 27 format specs, the queued consequences (Open items 7, 11, 13 and every line naming this file, cross-cutting themes 2 and 7), format-handler-interface.md's ownership gap for the adapter axis, proxy-cache.md's routing of provider quirks to adapters and management-api.md's administration of upstream credentials; grounds the design in Harbor's adapter package, the distribution token-auth specification, Docker Hub's pull-limit documentation, the ECR GetAuthorizationToken API, the GCE metadata server and Artifact Registry authentication pages, GitHub's rate-limit documentation, Pulp's Remote model and zot's sync configuration fetched this run (Nexus and Artifactory pages unreachable, recorded); fixes one transport seam (two adapters, a credential-kind axis, a per-upstream host allowlist, typed rate-limit errors, truthful completion) and states the split against proxy-cache.md line by line. Seven questions written in decision shape and adopted under the owner's standing delegation; zero open. 29 criteria, each with a Test Plan row. Awaits a /spec review pass."
description: "Spec for the upstream adapter axis: the seam between the proxy cache and every upstream it fetches from. Two transport adapters (a plain HTTPS adapter and an OCI distribution adapter) behind one small interface, a separate credential-kind axis (none, Basic, Bearer, vendor header, path token, Conan-shaped Basic exchange, distribution token exchange, AWS ECR, Google Cloud), a per-upstream off-origin host allowlist with per-host credential roles, redirect following that never reaches a client, typed rate-limit errors with a bounded cool-down, truthful body completion for the completion-only fetch mode, and credential redaction; with the preconfigured upstream profiles and the adapter half of the nightly real-upstream job."
author: michielvha
goal: "Make every upstream a configuration row rather than a code change: one OCI handler serves Docker Hub, ECR, GCR, GHCR, Quay, Artifactory and Nexus because authentication, redirects, rate limits and transport quirks live behind one adapter seam that no handler and no proxy-core code can bypass, so that format N+1 adds an upstream profile and never an HTTP client."
priority: "critical"
issue: 48
created: 2026-09-27
covers:
  - "internal/upstream/**"
fable_recheck: "authored in the 2026-09-27 cloud session, whose model is not recorded; needs a Fable authoring-quality review before any gate; closing reconciliation sweep on Opus 2026-09-28 raised and adopted Q8 (basic-exchange credential kind for Conan-shaped upstreams) and Q9 (per-location dispatch of git locations on an https upstream, a row naming git refused), never Fable-reviewed"
---

# Plan: Upstream adapters

One seam between the proxy cache and the network. The proxy layer decides *whether* to fetch and
what to do with the bytes; the adapter decides *how one HTTP exchange with a particular upstream
is made*: which URL, which credential to which host, which redirects to follow, what a 429 means,
whether the body actually completed. Handlers see neither.

## Context

**Who depends on this.** `format-handler-interface.md` settled the axis (its resolved upstream
adapter decision, was Q4: one format handler, many upstream adapters, as Harbor does) and then
recorded, on 2026-09-25, that no spec owns the adapter interface's shape. `proxy-cache.md` routes
"the authentication and throttling quirks of the preconfigured upstreams" to "their upstream
adapters" (Design, "Negative caching") and consumes the axis in its miss coalescing, integrity
and preconfigured-upstream sections without defining it. `data-model.md`'s `Upstream` entity
carries an "adapter type" field with no spec saying what values it takes. `management-api.md`
administers upstream bindings and upstream credentials ("Repository administration"; its AC21
makes the credential value write-only and rotation a one-row change) and needs a taxonomy of
credential kinds to administer. `conformance-harness.md` binds `upstreams` entries to stand-ins
in the main suite and to the real services in the nightly job (its AC19) and needs the adapter to
be indifferent to which. Twenty-seven format specs cite this file by name, each with a "what this
format requires of `upstream-adapters.md`" list; those lists are gathered in Design under "The
requirements, gathered" and every one is asserted by a criterion below.

**The build step.** `project-charter.md` builds this at build-order step 4, with OCI and the proxy
layer: "Upstream adapters (per-upstream authentication, rate-limit handling, the preconfigured
upstream set) are built with it for the same reason: Docker Hub pull-through is the first real
upstream and it already needs token exchange and rate-limit handling; each later format adds its
own upstream's specifics through the adapter seam rather than inside its handler." The charter's
build order now cites this spec by phase: Phases 1 and 2 at step 4, Phase 3's profiles with their
formats from step 5, and Phase 4 (the `git` adapter) at step 11 with Terraform (its AC12).

**Harbor's lesson, and its trap.** Harbor is OCI-only and ships fifteen compile-time adapters
behind one format: `aliacr`, `awsecr`, `azurecr`, `dockerhub`, `dtr`, `githubcr`, `gitlab`,
`googlegcr`, `harbor`, `huawei`, `jfrog`, `native`, `quay`, `tencentcr`, `volcenginecr`
(`docs/internal/research/registry-architecture-prior-art.md`, "Harbor: upstream adapters are their
own plugin axis"). Read this run (`src/pkg/reg/adapter/adapter.go`), Harbor's `Adapter` interface
has three methods (`Info`, `PrepareForPush`, `HealthCheck`) and its `ArtifactRegistry` interface
fifteen, because Harbor replicates in both directions; and most of its adapters are the `native`
adapter plus a credential rule (`googlegcr` is `native.NewAdapter(registry)` with the username
fixed to `_json_key`; `awsecr` is `native` plus a `GetAuthorizationToken` exchange cached for the
shorter of the token's `expiresAt` and one hour). The lesson is real: Docker Hub, ECR, GCR, GHCR,
Quay, Artifactory and Nexus differ in authentication and quirks, not in wire format. The trap is
to answer it with one adapter per vendor. The vendors differ along **two** axes, transport quirks
and credential acquisition, and multiplying them into adapters is how Harbor reached fifteen
files that are mostly the same file. This spec separates the axes (the resolved granularity
decision, was Q1).

**Why the seam is security-critical, not convenience.** Three captured findings in the format
specs are the same bug: a credential meant for one host sent to another. `rpm.md` captured dnf 4
sending a repository's credentials over plain HTTP to whatever host `xml:base` names (Open item
19); `homebrew.md` captured a pass-through forwarding `Authorization` on ghcr.io's 307 to
`pkg-containers.githubusercontent.com` (Open item 30); `vagrant.md` captured HCP's redirect chain
ending at a presigned S3 URL that is itself a credential expiring in 900 seconds (Open item 23).
Every upstream that redirects across hosts is an opportunity to leak the upstream credential, and
every URL taken from upstream metadata is an opportunity for that metadata to steer the registry's
credential to an attacker's host. The allowlist and credential-role rules below are the answer,
and they are held by tests at the network layer, not by review.

**Where this is not mechanically checkable, and what is done about it.** No client oracle sees
whether an upstream credential leaked, whether a truncated body was reported as complete, or
whether a redirect chain ended at a host the operator never approved. Each is a way to pass every
conformance case while broken, so each has a named enforcer: a recording stand-in that captures
what actually crossed the wire, a body-completion test with deliberately truncated and
mis-lengthed bodies, and an import and call-site boundary that leaves `internal/upstream/**` as
the only place in the tree that can open an outbound connection on the proxied path.

## Scope

**In scope**

- The `Adapter` interface, in `internal/upstream`, with one required method (`Fetch`) and one
  optional interface (`Validator`), the `Request` and `Response` types it exchanges with the proxy
  layer, and the compile-time adapter registry an `Upstream` row's `adapter` field selects from.
- Two adapters at step 4: `https`, the default, for every upstream that is a tree or an API over
  HTTPS (this is what alpine, arch, rpm, debian, maven, cpan, cran, hackage, luarocks, chef, opam,
  Open VSX, Swift, Puppet, Vagrant, conda, Composer, npm, PyPI, Galaxy, NuGet, GOPROXY and the
  checksum database all speak at the transport level); and `distribution`, for OCI registries,
  carrying the token-exchange challenge flow and the pull-limit headers Docker Hub and its
  siblings add. A third adapter, `git`, for a commit-pinned tree fetch, lands with Terraform; it is
  a per-location transport of an `https` upstream, never the adapter a row names (the resolved
  git-location decision, was Q9).
- The credential-kind axis: `none`, `basic`, `bearer`, `header`, `path-token`, `basic-exchange`,
  `token-exchange`, `aws-ecr`, `gcp`, and client TLS as an orthogonal transport setting. What each
  kind stores, how it is presented, and when it is refreshed. The kinds are this spec's; the store
  and its administration are `data-model.md`'s and `management-api.md`'s.
- Credential scoping: an upstream's credential reaches the upstream's root host and nothing else
  unless an allowlist entry says otherwise, per host, with a role.
- The per-upstream **off-origin host allowlist**, default empty, enforced before any connection:
  where redirects may go, which non-origin hosts a handler may name (Packagist dists on
  `api.github.com` and `codeload.github.com`, Terraform providers on `releases.hashicorp.com`,
  opam source hosts, Open VSX storage hosts, Supermarket's S3, the Julia storage host), and which
  credential each such host receives (the resolved allowlist decision, was Q3).
- Redirect following inside the adapter, bounded, with no upstream `Location` ever reaching a
  client and no credential-bearing redirect target ever stored (cross-cutting theme 2's adapter
  half).
- Rate-limit interpretation into one typed error with a retry time, from `429` with or without
  `Retry-After`, from Docker Hub's `ratelimit-remaining: 0`, and from GitHub's `403` with
  `x-ratelimit-remaining: 0`; and a bounded per-upstream cool-down after one (the resolved
  cool-down decision, was Q5).
- Request hygiene: a fixed registry `User-Agent`, `Accept-Encoding: identity` by default, and an
  outbound request built only from the handler's explicit options, never from the inbound client
  request.
- Conditional requests and byte ranges on the proxy's behalf, with the upstream's validators and
  `Last-Modified` returned verbatim.
- **Truthful completion**: the response body reports truncation and stalls as errors, never as a
  clean end of body. This is the adapter's half of `proxy-cache.md`'s completion-only fetch mode
  (theme 7); the mode itself, its verifier hook and what is committed are `proxy-cache.md`'s.
- Bounded per-upstream concurrency, a connect timeout and stall detection, per-upstream TLS
  trust (CA bundle, client certificate), and refusal of `http://` roots at configuration unless
  an operator overrides it.
- Credential redaction in every log line and error this package produces, covering URL userinfo,
  path tokens, `access_token` and presigned query strings, and every credential header.
- Configuration-time validation (`Validate`) that `management-api.md`'s create and update of a
  remote's upstream binding call.
- The **preconfigured upstream profiles**: the adapter, URL, credential kind and allowlist for
  each upstream `proxy-cache.md` ships enabled. `proxy-cache.md` owns which upstreams are in the
  set and the fresh-install seeding (its AC19); this spec owns each entry's definition and holds
  the two tables equal by test.
- The adapter half of the nightly real-upstream job `proxy-cache.md` AC15 defines: a transport
  contract case per preconfigured profile against the real service, and the real-cloud rows for
  the `aws-ecr` and `gcp` kinds with their funding state recorded here (the resolved cloud-row
  decision, was Q6).
- Architecture enforcement: the egress boundary (only `internal/upstream/**` opens outbound
  connections on the proxied path), the credential-material boundary (decrypted material never
  leaves the package) and the request-shape boundary (no inbound header can be forwarded).

**Out of scope**

- **Cache semantics**: TTLs, negative caching, single-flight coalescing, serve-stale, offline mode,
  eviction, the condemnation record, the cache-scoped forward-moving `Last-Modified` of a remote,
  and never adopting an older upstream revision. All `proxy-cache.md`'s. The adapter returns what
  the upstream said; the proxy decides what to believe and keep. The split is stated line by line
  in Design, "What is the adapter's and what is proxy-cache.md's".
- **The completion-only fetch mode and its verifier hook.** `proxy-cache.md`'s, as
  `artifact-verification.md` item 3 and the eight requesting formats already place it there. This
  spec supplies only the truthful-completion guarantee the mode depends on.
- **Which upstream URL to ask next.** Following `/dev/` and `/manifests/{user}/` trees (LuaRocks),
  preferring a `.json` manifest, reading an opam `repo` file's `archive-mirrors`, fetching Open
  VSX's control document, walking a paginated Swift release list, choosing `/registries.{flavor}`
  (Julia), joining a path under a mirror root (Alpine, Arch, RPM), resolving Puppet's `next`
  links against the base, and Terraform's discovery document are protocol logic: the handler
  "derives the upstream request" on a miss (`format-handler-interface.md`, "Every format handler")
  and passes it to fetch-and-cache. The "X adapter" several format specs asked for decomposes into
  the `https` adapter plus the handler's own derivation (the resolved granularity decision, was
  Q1); each affected spec is named in the report as a sibling consequence, none is weakened.
- **Trust anchors per upstream** (Debian's OpenPGP keyring, Hex's public key, Open VSX's pinned
  keys, the RPM metalink hash check). A `remote` is a repository, and `artifact-verification.md`
  gives every repository a revisioned trust set; a per-upstream keyring is that repository's trust
  set, not a field on `Upstream`. Verification is `artifact-verification.md`'s; nothing here
  verifies a signature.
- **Registry tokens** presented by clients to this registry (`auth.md`,
  `credential-management.md`). The credentials here are the ones the registry presents outward.
- **Administration of upstream credentials** (create, rotate, delete, list without the value):
  `management-api.md`, "Repository administration", its AC21.
- **Write-through to an upstream**: no adapter pushes. Harbor's fifteen-method `ArtifactRegistry`
  exists for replication push; `replication.md` is registry-to-registry and does not use this seam.
- **A corporate egress proxy per upstream** (Pulp's `proxy_url`, `proxy_username`). The instance
  honours `HTTPS_PROXY` and `NO_PROXY` through `http.ProxyFromEnvironment`, once, for every
  upstream. A per-upstream proxy is added when an operator asks, not before; there is no correctness
  or sequencing reason to wait, and no requirement asks for it.
- **Azure Container Registry, Alibaba, Huawei, Tencent and other vendor token exchanges** beyond
  ECR and Google Cloud. Each works today with `basic` (ACR admin user or service principal) or a
  `bearer` credential; a vendor exchange is added when a format spec or an operator requirement
  names it, and it is a new credential kind, never a new adapter.
- **Materialising Go modules or Cargo crates from git origins.** `go-modules.md` and `cargo.md`
  both weighed and rejected it for correctness reasons; the `git` adapter here fetches one
  commit-pinned tree for Terraform and synthesises nothing, and a row naming `git` as its adapter
  is refused at configuration so no remote can be built over a git origin (was Q9, AC34).

## Design

### The requirements, gathered

Every line a citing spec placed on this file, with where it is answered. The table is the
audit trail for the criteria; a row with no criterion would be a requirement that can be
silently unbuilt.

| Source | Requirement | Answered by |
|---|---|---|
| `format-handler-interface.md` (resolved upstream adapter axis, was Q4) | Define the adapter interface; one handler, many adapters; auth and quirks never in a handler | "The interface", AC1, AC2, AC3, AC29 |
| `proxy-cache.md` "Negative caching", "Miss coalescing", resolved preconfigured upstreams (was Q3) and extension (was Q14) | Auth and throttling quirks of preconfigured upstreams live in adapters; `Retry-After` honoured; Docker Hub kept inside its limit; each preconfigured upstream needs cases against the real service | AC9, AC10, AC24, AC25, AC26 |
| `data-model.md` `Upstream` ("adapter type") | Values of the adapter field; what else the row needs | "Selecting an adapter", "Configuration on the `Upstream` row"; the row now carries every field (`data-model.md`, "Upstream configuration and upstream credentials", AC40) |
| `management-api.md` "Repository administration", AC20, AC21 | Credential kinds to administer; validation on create and update; `upstream-invalid` (422) in its closed problem table; a referenced credential's deletion refused `in-use` | "Credential kinds", "Configuration-time validation", AC19, AC21, AC23, AC30 |
| `repository-lifecycle.md` AC20, AC25 | Deleting a credential an `Upstream` or `ReplicationLink` references is refused `in-use`; changing a `remote`'s upstream keeps cached references and resets `RemoteFile.last-checked` | "Configuration on the `Upstream` row", "Lifecycle of an upstream binding", AC30 |
| `observability.md` metric and alert catalogue (its AC6, AC18, AC20) | Per-upstream request counters, in-flight and rate-limit gauges, cool-down state, token-exchange failures; `UpstreamRateLimitLow` and `UpstreamCooldown`; no `traceparent` or `tracestate` upstream; `MarkSecret` on every attached credential; the redaction list equal to `telemetry.RedactURL`'s | "Rate limits and the cool-down", "Request hygiene", "Redaction", AC4, AC20, AC31 |
| `deployment.md` key inventory ("Not keys, on purpose") | `upstream.default_concurrency`, `upstream.default_cooldown_cap`, `upstream.connect_timeout` as instance defaults; `User-Agent` computed from `server.public_url`, not a key; `HTTPS_PROXY`/`NO_PROXY` once instance-wide | "Configuration keys", AC5, AC32 |
| `conformance-harness.md` AC19 | Adapter indifferent to stand-in versus real binding | AC25, AC26 |
| Open item 13 (`composer.md`) | Fetch a dist from `api.github.com` with a `302` to `codeload.github.com`, no digest, 60/h limit; per-host credential; uncached forwarded `POST` | AC6, AC7, AC8, AC9, AC27; completion-only is `proxy-cache.md`'s |
| Open items 7, 11 (`nuget.md`, `maven.md`) | `api.nuget.org` and `repo.maven.apache.org` preconfigured through `proxy-cache.md`'s extension mechanism; completion-only mode | "Preconfigured profiles" (both rows shipped: `proxy-cache.md`'s resolved second extension, was Q17, its AC19), AC24; the mode is `proxy-cache.md`'s AC20 |
| Theme 7 (go-modules, nuget, maven, composer, cran, luarocks, openvsx, conan; `chef.md`, `homebrew.md`, `swift.md`) | Completion-only fetch with a verifier hook | AC13 (truthful completion); the mode is `proxy-cache.md`'s, "What is the adapter's" |
| Theme 2 (opam, openvsx and the refusal-fallback notes) | The registry owns every URL it serves | AC8 (no upstream `Location` reaches a client), AC6 (no credential follows metadata to another host) |
| `hex.md` (item 12) | Per-upstream public key; follow the `installs` `301` to `builds.hex.pm` | Trust set is `artifact-verification.md`'s (Scope); AC7, AC8 |
| `conda.md` (item 14) | Path-token insertion `/t/{token}/`; prefix.dev `303` on the shard index; Bearer and Basic; validation at configuration | AC19, AC8, AC23 (transport half; the repodata probe is the handler's `configure`) |
| `cran.md` (item 15) | Fixed non-R `User-Agent` on every upstream request | AC5 |
| `julia.md` (item 16) | Cross-host redirects `301` then `302` to `storage.julialang.net`; credential only to the configured host; `Accept-Encoding: zstd, gzip` only on request; no `Julia-CI-Variables` | AC4, AC5, AC6, AC7, AC8 |
| `swift.md` (item 17) | Follow `303` to presigned object-store URLs (600 s); pagination to completion; upstream Bearer or Basic | AC8 (presigned never stored), AC19; pagination is the handler's derivation |
| `terraform.md` (item 18; format batch 5 item 6, its AC18) | Artifact-host allowlist; both download-location forms; commit-pinned VCS fetch, collision-detecting SHA-1, size bound, no credential; how an `https` remote hands a commit-pinned module location to the `git` adapter under the same allowlist | AC7, AC28, AC34 ("Selecting an adapter", the resolved git-location decision, was Q9); location forms are the handler's |
| `cargo.md` "The upstream binding" (format batch 3 item 11, its AC21) | An `https://` sparse root with the `sparse+` prefix removed; the `dl` host as an off-origin allowlist entry (`static.crates.io` with role `none` for crates.io, plus `crates.io` with role `none` when `dl` is the `api` download path that redirects to it); a private sparse upstream's bare token as the `header` kind with header `Authorization`, to the root only | AC6, AC7, AC8, AC19, AC22 (the recipe row under "Preconfigured profiles"; crates.io is not a profile) |
| `rpm.md` (item 19) | Mirror-root joining; cross-host redirect allowlist; conditional revalidation; metalink fetch | AC7, AC15; joining is the handler's; metalink hash check is `artifact-verification.md`'s |
| `debian.md` (item 20) | Per-upstream OpenPGP keyring | Trust set, `artifact-verification.md` (Scope) |
| `alpine.md`, `arch.md` (items 21, 32) | Root-host-only credential; redirect allowlist; `If-None-Match` and `If-Modified-Since`; `http://` roots refused; upstream `Last-Modified` returned per revision | AC6, AC7, AC14, AC15, AC22 |
| `conan.md` (item 22; format batch 4 item 10) | ConanCenter adapter covering `center2.conan.io` and the frozen `center.conan.io`; a private Conan upstream that issues its token only through a Basic exchange at `users/authenticate` | Two `https` upstreams, one per remote, aggregated in a `virtual` (`data-model.md`); AC1; the `basic-exchange` kind (the resolved Conan-exchange decision, was Q8), AC33 |
| `vagrant.md` (item 23) | Catalog path template; Bearer or Basic to the root only; redirect chains up to ten hops to an allowlist; never cache a presigned target | AC6, AC7, AC8, AC19; the template is the handler's |
| `chef.md` (item 24) | Supermarket adapter: cross-host `302` to S3; `If-None-Match` revalidation | AC7, AC8, AC15 |
| `puppet.md` (item 25) | Base-relative resolution; absolute `file_uri` on an allowlisted host; Bearer to the root only; conditional revalidation; identifying `User-Agent` | AC5, AC6, AC7, AC15; resolution is the handler's |
| `hackage.md` (item 26) | Incremental index fetch by `Range`; `301` followed inside the adapter | AC8, AC15 |
| `luarocks.md` (item 27) | rocks-server adapter: `If-Modified-Since`, `.json` manifest preference, tree following | AC15; preference and following are the handler's |
| `cpan.md` (item 28) | Identity `Accept-Encoding` (stored bytes must be the signed bytes); conditional revalidation; optional Basic to the root host over HTTPS | AC5, AC6, AC15, AC22 |
| `opam.md` (item 29) | opam HTTP adapter: `If-None-Match` on the index; per-host credential for allowlisted source hosts | AC7, AC15, AC6 (`own` role) |
| `homebrew.md` (item 30) | ghcr.io anonymous token exchange, never a placeholder; `307` to `pkg-containers.githubusercontent.com` without `Authorization`; identity encoding; post-receipt verifier | AC16, AC6, AC5; verifier is `proxy-cache.md`'s |
| `openvsx.md` (item 31) | Storage-host allowlist; control-document fetch; pinned upstream keys | AC7; fetch is the handler's; keys are the trust set |
| `helm.md` "The upstream adapter, not the handler, decides which host gets the upstream credential" | Credential to a third host only if the upstream configuration says so; default not | AC6 (`root` role on an allowlist entry) |
| `oci.md` Phase 4, `npm.md` "The proxied path" | Docker Hub token exchange and rate limits belong to the adapter | AC9, AC16, AC24, AC25 |
| `go-modules.md` "Two shared-layer amendments" | A checksum-database upstream adapter kind | An `https` upstream bound to its own `remote`; the handler reads it through `Deps` (its own design); AC1 |
| `foundation.tsv` hint | Credential types incl. ECR `GetAuthorizationToken` and GCR metadata-server tokens; Docker Hub pull limits; conformance against real upstreams on the nightly job | AC17, AC18, AC9, AC25, AC26 |

### Prior art, and what is taken from it

Fetched 2026-09-27. Where a page could not be reached, that is said rather than recalled.

- **Harbor** (`src/pkg/reg/adapter/adapter.go`, `model/registry.go`, `awsecr/auth.go`,
  `googlegcr/adapter.go`, `native/adapter.go`). Taken: the separate axis, compile-time factories
  registered by type (`RegisterFactory(t string, factory Factory)`), a `Registry` row carrying
  `URL`, `TokenServiceURL`, a typed `Credential` (`basic`, `oauth`, `secret`), `Insecure` and
  `CACertificate`; ECR's exchange cached for the shorter of `expiresAt` and a cap; GCR as the
  native adapter with a fixed username. Rejected: one adapter per vendor when the vendor differs
  only in credential (Harbor's `googlegcr` is `native` plus `_json_key`), and a fifteen-method
  interface, which exists because Harbor pushes; this registry only pulls.
- **The distribution token authentication specification** (`distribution.github.io`). Taken
  verbatim: the `401` with `WWW-Authenticate: Bearer realm=...,service=...,scope=...`, the token
  request parameters `service`, `scope`, `client_id`, `offline_token`, the response fields
  `token`/`access_token`, `expires_in` (default 60 seconds; "a token should never be returned with
  less than 60 seconds to live"), `issued_at`, `refresh_token`, and the retry with
  `Authorization: Bearer`.
- **Docker Hub pull limits** (`docs.docker.com/docker-hub/usage/pulls/`). Taken: "100 per IPv4
  address or IPv6 /64 subnet" unauthenticated and 200 per six hours for an authenticated personal
  account, unlimited for paid plans; a pull is "both a version check and any download that occurs
  as a result of the pull", version checks alone do not count, a multi-architecture image counts
  once per architecture; the headers `ratelimit-limit` (for example `100;w=21600`),
  `ratelimit-remaining` and `docker-ratelimit-source`; the `429` body "You have reached your pull
  rate limit". Consequence: the OCI handler's tag revalidation by `HEAD` is a version check and
  costs no pull, which the adapter enables by surfacing `Docker-Content-Digest` on a `HEAD`.
- **AWS ECR `GetAuthorizationToken`** (API reference). Taken: "The authorization token is valid for
  12 hours"; the response is `authorizationData[{authorizationToken, expiresAt, proxyEndpoint}]`;
  the token is base64 of `AWS:<password>`; the request is SigV4-signed. Consequence: the `aws-ecr`
  kind is a credential provider that yields a `basic` presentation and refreshes on `expiresAt`.
- **Google Cloud** (GCE metadata server, Artifact Registry authentication). Taken: the token
  endpoint `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token`
  with the mandatory `Metadata-Flavor: Google` header, a response of `access_token`, `expires_in`
  (typically 3599) and `token_type`; "The metadata server caches access tokens until they have 5
  minutes of remaining time before they expire"; the Docker username `oauth2accesstoken` for an
  access token valid for 60 minutes, `_json_key` or `_json_key_base64` for a service-account key,
  and "Artifact Registry Reader" as the read role. Consequence: `gcp` is a credential provider
  with two sources (ambient metadata server, or a JSON key exchanged for a token with a
  stdlib-signed JWT), both yielding a `basic` presentation.
- **GitHub REST rate limits.** Taken: 60 requests per hour unauthenticated, 5,000 authenticated;
  `x-ratelimit-limit`, `x-ratelimit-remaining`, `x-ratelimit-reset` (UTC epoch seconds),
  `x-ratelimit-resource`; "If you exceed your primary rate limit, you will receive a `403` or
  `429` response, and the `x-ratelimit-remaining` header will be `0`"; `retry-after` on secondary
  limits. Consequence: a `403` is a rate limit only when `x-ratelimit-remaining: 0` accompanies
  it; otherwise it is a refusal, and the two are never confused (AC9).
- **Pulp** (`pulpcore/app/models/repository.py`, the `Remote` model). Taken: `ca_cert`,
  `client_cert`, `client_key`, `tls_validation`, `download_concurrency` ("Total number of
  simultaneous connections allowed to any remote during a sync"), `connect_timeout` and
  `sock_read_timeout` as distinct values, `headers`, `rate_limit` ("Limits requests per second
  for each concurrent downloader"). Rejected: `proxy_url` per remote (Scope), and `rate_limit` as
  a per-downloader cap, because the limit that matters is the upstream's, observed from its
  headers, not a local guess.
- **zot** (`examples/config-sync.json`). Taken: `maxRetries` and `retryDelay` bounded, a
  `credentialsFile` separate from registry configuration, `tlsVerify` and `certDir` per registry.
  Noted: `disableHTTP2` exists because some upstreams misbehave over h2; this spec keeps Go's
  default negotiation and adds a per-upstream `http2: false` only when a capture shows the need.
- **Nexus Repository and JFrog Artifactory.** Their proxy-repository and remote-repository
  documentation pages did not render to text through the fetcher this run (JavaScript-rendered);
  no claim about their settings is made here. From memory they offer auto-blocking of an
  unreachable remote and an assumed-offline period; this spec's cool-down (AC10) is narrower,
  triggered only by an explicit rate-limit response, because `proxy-cache.md`'s serve-stale
  already answers an unreachable upstream and a second blocking mechanism would be two answers to
  one event.

### What is the adapter's and what is proxy-cache.md's

Three sibling specs place requirements "on proxy-cache" that touch this seam (theme 7's
completion-only mode, `artifact-verification.md` item 3's verifier hook, `signing-service.md`
item 3's cache-scoped freshness). The split, so neither spec assumes the other built it:

| Concern | `upstream-adapters.md` (the adapter) | `proxy-cache.md` (the cache) |
|---|---|---|
| The fetch-and-cache entry point handlers call through `Deps` | Nothing; handlers never see an adapter | Owns its signature; passes the handler's upstream location and `upstream.Options` down |
| Selecting the adapter for a `remote` | The registry keyed by `Upstream.adapter`; the `Router` resolving a repository's `Upstream` row to an adapter and its credential | Calls the `Router` through its own one-method `Fetcher` interface |
| Building the outbound request | URL, method, headers, credential, conditional headers, `Range`, `Accept-Encoding`, `User-Agent` | Supplies validators and range from the cache record |
| Redirects | Followed inside, bounded, allowlisted, credential per role; no `Location` returned | Never sees one |
| Off-origin hosts | The allowlist and its enforcement before any connection | Passes the location the handler derived |
| Rate limits | Interpretation into `RateLimitError{RetryAfter}`; the per-upstream cool-down | Never negatively caches one, never renders one as not-found (its AC9); serves stale metadata meanwhile (its AC12) |
| Timeouts | Connect timeout; stall detection on the body reader | The stall value as coalescing policy; waiter semantics (its AC11, AC17) |
| Completion | The body reader ends with `ErrTruncated` on a short or unterminated body, never a clean EOF | Commits nothing on error (its AC10); the completion-only mode and its verifier hook run after a clean end (its resolved completion-only decision, was Q15, and its AC20) |
| Declared digest and validators | Surfaced verbatim from headers (`Docker-Content-Digest`, `ETag`, `Last-Modified`, `Content-Length`) | Decides what to verify against (the handler's declared digest first), what to store, what freshness to serve; the cache-scoped forward-moving `Last-Modified` and never adopting an older revision (its AC22) |
| Encoding | Identity by default; opt-in per request; never transparently decompresses | Stores what arrived |
| Credentials | Kinds, acquisition, refresh, scoping, redaction; decrypted material confined to this package | Its AC6 asserts encrypted at rest and absent from logs; the redactor here is what makes the second half true |
| Preconfigured upstreams | The profile per entry (adapter, URL, credential kind, allowlist) | The set, enabled by default, seeded at fresh install (its AC19); the nightly job (its AC15) |
| Offline mode | Nothing: an adapter is never called | The instance-wide switch (its AC5); asserted at the network layer, which this package's egress boundary makes sufficient |
| Security signals, condemnation, purge | Nothing | All of it |

### Selecting an adapter, and why there are two

An `Upstream` row (`data-model.md`) carries `adapter`, a string naming one registered adapter.
Registration is compile-time, as `format-handler-interface.md` settled for formats (its resolved
extension boundary, was Q3): each adapter is a package under `internal/upstream/<name>` exposing
`New(cfg Config) Adapter` and registered in `internal/upstream/registry.go`; an `Upstream` naming
an unregistered adapter is refused at configuration (AC1).

The set is deliberately small (the resolved granularity decision, was Q1):

- **`https`** (default). One HTTP exchange against a URL under the upstream root: `GET`, `HEAD`
  or a forwarded `POST`; the credential kind's presentation; conditional headers; `Range`; the
  allowlist and redirect rules; rate-limit interpretation from `429`, `Retry-After` and the
  GitHub header family. Every static tree (Alpine, Arch, RPM, Debian, Maven, CPAN, CRAN, Hackage,
  LuaRocks) and every JSON API (npm, PyPI, Galaxy, NuGet, Composer, Supermarket, opam, Open VSX,
  Swift, Puppet, Vagrant, conda, GOPROXY and the checksum database) is this adapter with different
  handler-side derivation. What the formats called "the Supermarket adapter" or "the ConanCenter
  adapter" is this adapter under a profile.
- **`distribution`**. The OCI distribution API's transport quirks: the `401` Bearer challenge and
  token exchange (anonymous or credentialed), token caching per scope, the `Docker-Content-Digest`
  header as a declared digest on `GET` and `HEAD`, Docker Hub's `ratelimit-*` headers, and blob
  redirects to CDN hosts. Docker Hub, GHCR, Quay, ECR, GCR and Artifact Registry, ACR, Harbor,
  Artifactory and Nexus all take this adapter; what differs between them is the credential kind
  and the profile's allowlist, and both are configuration.
- **`git`** (with Terraform, not at step 4). Fetches the tree of one commit named by 40
  hexadecimal digits from an `https` URL on an allowlisted host, over the smart HTTP protocol,
  with no credential and a size bound, verifying every object with collision-detecting SHA-1
  (`terraform.md`'s resolved VCS-source decision). It is an adapter because its transport is not
  one HTTP exchange; it is not a route to materialising modules or crates, which `go-modules.md`
  and `cargo.md` rejected.

**How a location reaches the `git` adapter** (the resolved git-location decision, was Q9). A
Terraform remote's `Upstream` row names `https`: its discovery document, version lists, download
documents and provider archives are HTTPS exchanges. A module version whose upstream location is
`git::https://{host}/{path}?ref={40 hex}` is not, and it is not a second upstream either: the host
is whatever the module author published, so no operator could pre-create a remote per git host.
The `Router` therefore selects the adapter **per location, not per row**. `Request` carries a
location in one of three forms: a path under the root, an absolute URL, or a **git location**
`{url, commit}` (an `https://` repository URL and the 40-digit commit id; the handler parses the
module source and keeps `//subdir` for itself). A path or URL goes to the row's adapter; a git
location goes to the `git` adapter, and only when the row's adapter is `https`, under the same
row's allowlist, concurrency bound and cool-down: the repository URL's host must match an entry of
that row's `hosts` (any role) or the fetch fails with `HostNotAllowedError` before any connection,
and whatever the entry's role, the `git` adapter presents no credential (it accepts `none` only, per
`terraform.md`'s no-credential rule). The response body is the commit's tree as an uncompressed tar
stream in tree order, file modes kept and timestamps zeroed, under the same truthful-completion
rule (`ErrTruncated`, `ErrStalled`), which the handler re-packs canonically as it does a hosted
archive. A git location on a `distribution` row, and any `Upstream` row naming `git` as its own
adapter, is refused (the second at configuration, AC23), so the `git` transport is reachable only
as a location of an `https` remote and never as a way to build a remote over a git origin (AC34).

Why not one adapter per vendor: the vendors listed under `distribution` differ in how a
credential is obtained (a static token, an exchange at a challenge realm, an IAM call, a metadata
server) and in which hosts their blobs redirect to. Both are already configuration on the
`Upstream` row and its credential. A `dockerhub` adapter would be the `distribution` adapter with
a URL and an allowlist filled in, which is exactly what a preconfigured profile is. Fifteen
adapters that are mostly the same code is the cost Harbor pays and this spec declines.

Why not zero adapters, with everything an option on one client: the distribution challenge flow is
a state machine (challenge, exchange, retry, cache per scope, refresh) that a flat option set
would either duplicate per format or bolt onto every request. Two adapters is where the
`https` adapter's option surface would otherwise start growing OCI-shaped fields.

### The interface

Go-idiomatic and small, per the `go` skill: the interface is declared beside its implementations
in `internal/upstream` because it has three implementors and two consumers (the proxy layer and
`management-api.md`'s validation), and each consumer re-declares the one-method subset it needs
(`internal/proxy`'s `Fetcher` has `Fetch` alone; `internal/manage` asserts `Validator`).

```
Adapter    Fetch(ctx, Request) (*Response, error)        required
Validator  Validate(ctx, Upstream) error                 optional, type-asserted at configuration
```

That is the whole pin (AC2). `Request` carries: the upstream (its row, resolved credential
handle, allowlist, limits); the method (`GET`, `HEAD`, `POST`); the location, either a path under
the upstream root, an absolute URL the handler took from upstream metadata (which the allowlist
must admit), or a git location `{url, commit}` the `Router` sends to the `git` adapter ("How a
location reaches the `git` adapter" above); the `Options` the handler set through fetch-and-cache: `Accept`, `Accept-Encoding`
opt-in, a `User-Agent` override, a `Range`, and the request body for a forwarded `POST`; and the
conditional validators the proxy holds (`ETag`, `Last-Modified`). It has no `*http.Request`, no
`http.Header` and no field that could carry an inbound header wholesale (AC4): the outbound
request is constructed from these fields and nothing else.

`Response` carries: a status class (`OK`, `NotModified`, `PartialContent`, `NotFound`, `Gone`,
`Refused`, `UpstreamError`), the numeric status for logging, the body as an `io.ReadCloser`
whose `Read` returns `ErrTruncated` when the body ends before its declared length or before the
chunked terminator and `ErrStalled` when no byte arrives for the stall period, the declared
`Content-Length` when present, the upstream's `ETag`, `Last-Modified` and `Docker-Content-Digest`
verbatim, the content type, and the requested location as provenance. Rate limits are not a status
class: they are the typed error `*RateLimitError{RetryAfter time.Time, Source string}` returned
from `Fetch`, because callers branch on them with `errors.As` and must never mistake one for a
body (AC9). A host outside the allowlist is `*HostNotAllowedError{Host}`, returned before any
connection (AC7). Errors are wrapped with a gerund phrase and no prefix (`CLAUDE.md`, Go rules):
`fmt.Errorf("fetching %s from %s: %w", redact(loc), upstream.Name, err)`.

The `Router` in `internal/upstream` is what the proxy layer holds: given a `remote` repository it
loads the `Upstream` row, resolves the credential handle from the store, selects the adapter from
the registry (the row's adapter, or `git` for a git location on an `https` row), applies the per-upstream concurrency bound and cool-down state, and calls `Fetch`.
It is a concrete struct; the proxy layer's `Fetcher` interface is satisfied by `*Router`.

### Configuration on the `Upstream` row

What `data-model.md`'s `Upstream` entity carries for this spec, core-parsed and never inside a
metadata document (its "Upstream configuration and upstream credentials", AC40; none of it is a
mark root):

- `adapter`: the registered name; default `https`.
- `url`: the root. `https://` required; `http://` refused at configuration unless `allow_http` is
  set (AC22), because `alpine.md`, `arch.md` and `rpm.md` each captured live mirrors that answer
  plain HTTP and each asked for the refusal.
- `credential`: a reference into the upstream-credential store, or none.
- `hosts`: the off-origin allowlist, a list of `{host, role}` entries where `role` is `none`
  (reachable, no credential), `root` (reachable, the upstream's own credential is presented) or
  `own` (reachable, a named second credential from the store is presented). Default empty for an
  operator-created upstream; preconfigured profiles carry theirs. A host may be an exact name or
  a single-label wildcard (`*.r2.cloudflarestorage.com`); no bare wildcard.
- `tls`: an optional CA bundle reference, an optional client certificate and key reference, and
  `insecure_skip_verify`, refused unless set explicitly and named in the startup log.
- `limits`: `concurrency` and `cooldown_cap`; a row that leaves either unset takes the instance
  default (`upstream.default_concurrency` 10, Pulp's default; `upstream.default_cooldown_cap` 1
  hour; "Configuration keys" below).
- `http2`: default true; set false only when a capture shows an upstream misbehaving over h2.

And the upstream-credential store, tabulated in the same `data-model.md` section: an
`UpstreamCredential` record with `name`, `kind` (below), the kind's material encrypted at rest
under the instance master key `proxy-cache.md` AC6 requires (`security.master_key`,
`deployment.md`), `created`, `rotated_at`, `last_used`. Its credential references are shared
with `replication.md`'s `ReplicationLink`, which authenticates a follower from the same store.
`management-api.md` AC21 asserts write-only values and one-row rotation against it.

### Lifecycle of an upstream binding

Two rules `repository-lifecycle.md` fixed for the binding, and what the adapter does about each:

- **A referenced credential cannot be deleted.** Deleting an `UpstreamCredential` that any
  `Upstream` or `ReplicationLink` references is refused `409` `in-use` naming each remote
  repository and link (`repository-lifecycle.md` AC20, its resolved in-use decision, was Q9
  there; `management-api.md` AC21; `data-model.md` AC40). The refusal is the management
  layer's; the adapter's part is that a credential it is asked to present always resolves, so
  `Router` has no "credential vanished" branch and a fetch never silently downgrades to
  anonymous.
- **Changing a `remote`'s upstream keeps its cache.** A `PATCH` of the URL, adapter, hosts or
  credential reference runs `Validate`, updates the `Upstream` row in place, keeps every cached
  reference (cached content is content-addressed and its coordinates did not change) and resets
  `RemoteFile.last-checked` so the next request revalidates against the new upstream
  (`repository-lifecycle.md` AC25). The adapter's part is that nothing about a binding is
  cached across fetches except the `distribution` adapter's exchanged tokens, which are keyed by
  realm and so cannot be presented to a different upstream: `Router` reads the `Upstream` row
  and resolves its credential on every fetch, so the fetch after the change goes to the new
  root with the new credential and the cool-down state of the old upstream does not follow it
  (AC30). A rotated credential is the same rule seen from the store: the next fetch carries the
  new value (`management-api.md` AC21).

### Credential kinds

The second axis. A kind is a way of turning stored material into what one request to one host
carries, plus a refresh rule. Kinds are the registry's outward secrets; `auth.md` AC10's external
review procedure lists them and the redactor below in its review surface.

| Kind | Stores | Presents | Refresh |
|---|---|---|---|
| `none` | nothing | nothing; the `distribution` adapter still performs an anonymous token exchange on a challenge | never |
| `basic` | username, password | `Authorization: Basic` preemptively on every request to a host of role `root` or on the `own` entry naming it | never |
| `bearer` | token | `Authorization: Bearer <token>` (HCP Vagrant, prefix.dev, the Forge, Swift registries, GitHub for Packagist dists) | never |
| `header` | header name, value | the named header verbatim (`X-JFrog-Art-Api`, `X-NuGet-ApiKey`, `X-ApiKey`) for upstreams that are themselves Artifactory, Nexus or Hackage-shaped | never |
| `path-token` | token, template (`/t/{token}/` after the host for anaconda.org) | the token inserted into the URL path of requests to the root host only; never into an off-origin URL | never |
| `basic-exchange` | username, password, exchange path under the root (`v2/users/authenticate` for a Conan 2 server, `v1/users/authenticate` for Conan 1) | a `GET` of the exchange path with `Authorization: Basic` and the stored pair, whose `200` body (`text/plain`, the token and nothing else, trimmed) is then presented as `Authorization: Bearer` on every request to the root and to entries of role `root`; the exchange is made only against the root host, never an off-origin one | on a fresh `401` from the root: one re-exchange and one retry; a second `401`, or an exchange answering anything but `200` with a non-empty body, is `Refused` |
| `token-exchange` | optional username and password (or nothing) | on a `401` `WWW-Authenticate: Bearer` challenge, a token request at the realm with `service` and `scope` from the challenge, Basic with the stored pair when present, anonymous otherwise; then `Authorization: Bearer` on the retry; the token cached per `(realm, service, scope)` for `expires_in` (60 seconds when absent, per the specification) less a margin | on expiry or a fresh `401` |
| `aws-ecr` | either static access key id, secret and optional session token, or `ambient` (the SDK default chain: environment, shared config, IMDS, web identity, ECS task role), plus region | `GetAuthorizationToken` once, decoded to `AWS:<password>`, presented as Basic | at `expiresAt` minus 5 minutes, never later than 12 hours |
| `gcp` | either `ambient` (metadata server) or a service-account JSON key | ambient: `GET .../service-accounts/default/token` with `Metadata-Flavor: Google`, presented as Basic `oauth2accesstoken:<access_token>`; key: a stdlib-signed RS256 JWT exchanged at the token endpoint, presented the same way | at `expires_in` minus 5 minutes (the metadata server's own refresh point) |

Client TLS (`tls.client_cert`) is orthogonal and may accompany any kind. The `distribution`
adapter accepts `none`, `basic`, `token-exchange`, `aws-ecr` and `gcp`; the `https` adapter
accepts `none`, `basic`, `bearer`, `header`, `path-token` and `basic-exchange`; the `git` adapter
accepts `none` only and is never a row's adapter (a git location on an `https` row presents no
credential whatever the row's kind). A kind an adapter does not accept is refused at configuration
(AC23), so an operator learns at creation, not at the first miss.

`basic-exchange` exists because Conan servers issue tokens only through their own exchange (the
resolved Conan-exchange decision, was Q8): `conan.md` captured the client sending Basic to
`GET /v2/users/authenticate` (Conan 1.66.0 to `/v1/users/authenticate`), receiving the token as a
`text/plain` body, and presenting it as Bearer afterwards, with no `WWW-Authenticate` challenge on
either side. `token-exchange` does not cover it: that kind is driven by a distribution `401` Bearer
challenge naming a realm, which no Conan server sends. The exchanged token is cached per
credential and upstream in memory only, never persisted, and never presented to a host other than
the root and the row's `root` entries; its failures count under
`upstream_token_exchange_failures_total{form="basic-exchange"}` (AC31). A private sparse Cargo
upstream needs no exchange: its bare token is the `header` kind with header `Authorization`
(`cargo.md`, "The upstream binding").

Realm hosts: a `token-exchange` challenge may name a realm on another host (Docker Hub's realm is
`auth.docker.io` for `registry-1.docker.io`). The exchange is made only when the realm host is
the upstream root or an allowlist entry with role `root`, because the stored pair is presented to
it; the Docker Hub profile lists `auth.docker.io` with role `root`. A realm on any other host
fails the fetch with `HostNotAllowedError`, never with a credential sent to an unknown party.

Dependencies, justified per the `go-spec-reviewer` skill: `aws-ecr` uses the AWS SDK for Go v2
(`config`, `ecr`), confined to `internal/upstream/awsecr`, because the ambient credential chain
(five sources) and SigV4 are what a hand-rolled client would most plausibly get subtly wrong, and
an IAM bug is a security bug (the resolved cloud-dependency decision, was Q4). `gcp` needs no
third-party code: the metadata server is plain HTTP and the JSON-key exchange is `crypto/rsa`,
`encoding/json` and one `POST`. `git` uses go-git with its collision-detecting SHA-1, confined to
`internal/upstream/git`. Everything else is the standard library.

### Credential scoping and the off-origin allowlist

The rule (the resolved allowlist decision, was Q3): **a credential is presented to a host only
when that host's entry says so.** The upstream root is an implicit entry with role `root`. Every
other host the adapter would connect to, whether from a redirect `Location` or from a location the
handler took out of upstream metadata, must match an allowlist entry, or the connection is not
made and `HostNotAllowedError` names the host (AC7). The role decides the credential: `none`
sends none, `root` sends the upstream's own, `own` sends the named second credential (Packagist's
GitHub token for `api.github.com`, which lifts the 60-per-hour limit; opam's per-source-host
credential). A `path-token` is a `root`-only presentation by construction: it is never inserted
into an off-origin URL.

This is one mechanism for what six specs asked for in six phrasings: "forwarded to that root's
host only" (alpine, arch, rpm, cpan, puppet, vagrant), "only if the upstream configuration says
so" (helm), "a per-host credential for hosts the upstream's metadata sends the client to"
(composer, opam), "never forwarding an upstream credential to a host other than the configured
one" (julia, terraform, swift). The default is the strictest reading; the roles are how an
operator relaxes it host by host, and the relaxation is visible in configuration rather than
inferred from a same-scheme-and-host heuristic. The enforcement point is the adapter's
`CheckRedirect` and its pre-connection check on the initial location, so a handler cannot bypass
it by deriving an absolute URL: the allowlist is on the `Upstream`, not in the handler.

Allowlist matching is on the host of the URL about to be connected to, after IDNA normalisation
and lower-casing, with the port required to match the entry's (default 443). A match is never
made on the `Host` header or on an `X-Forwarded-Host`; only on where the socket would open.

### Redirects

Followed inside the adapter, up to ten hops (Vagrant's own limit, `vagrant.md`), across `301`,
`302`, `303`, `307` and `308`, for `GET` and `HEAD` only; a redirect answered to a forwarded
`POST` is an error, never a replay (AC27). Each hop passes the allowlist check above, and the
credential is recomputed per hop from the target host's role, so a `307` from `ghcr.io` to
`pkg-containers.githubusercontent.com` carries no `Authorization` unless that host is entered
with a role (homebrew's capture), and a `302` from `api.github.com` to `codeload.github.com`
carries the `own` credential of the first and the `none` of the second (composer's capture).

Two things about redirects never leave the adapter (AC8): the `Location` values, which no client
response ever carries, because a client that follows one bypasses the registry and its refusals
(theme 2; `hackage.md` and `julia.md` asked for this by name); and the final URL when it carries
credential material. A presigned URL (HCP's S3 target with `X-Amz-Expires`, Swift's 600-second
object-store URL) is a bearer credential with a query string; the adapter records the *requested*
location as provenance for `RemoteFile` and `FileProvenance` (`data-model.md`) and re-follows the
chain on every fetch. A `Location` is never cached as a resolution.

### Rate limits and the cool-down

Interpretation is one function over the response (AC9):

- `429` with `Retry-After` (seconds or HTTP-date): `RateLimitError` with that time.
- `429` without: `RateLimitError` with now plus a default (60 seconds).
- A `2xx` or `4xx` carrying `ratelimit-remaining: 0` (Docker Hub) or `x-ratelimit-remaining: 0`
  (GitHub): the response is returned as-is when it has a body (the last permitted request), and
  the upstream enters cool-down until `ratelimit-limit`'s window or `x-ratelimit-reset` says the
  budget returns.
- `403` with `x-ratelimit-remaining: 0`: `RateLimitError` with the reset time (GitHub's own
  documentation says a `403` is what an exceeded primary limit may return).
- `403` without such headers: `Refused`, a plain upstream refusal. This distinction is a test
  case, because conflating them turns a private package into a phantom throttling event, and the
  reverse turns throttling into a `404` (`proxy-cache.md` AC9).

The cool-down (the resolved cool-down decision, was Q5): after a `RateLimitError`, the `Router`
answers every request to that upstream with the same error, immediately and with no connection
made, until the retry time, capped at `limits.cooldown_cap` (default one hour) so a bogus
`Retry-After` cannot take an upstream offline for a day (AC10). During the cool-down
`proxy-cache.md`'s serve-stale keeps metadata flowing and its AC9 keeps the client-visible answer
a retryable error rather than not-found. Nothing else triggers a cool-down: a `5xx` or a
connection failure is answered by serve-stale, and a second blocking mechanism would be two
answers to one outage.

What keeps Docker Hub inside its budget is not the adapter: it is `proxy-cache.md`'s single-flight
coalescing (one fetch per cold-starting fleet) and the OCI handler revalidating tags by `HEAD`,
which Docker documents as a version check that does not count. The adapter's contribution is to
make the `HEAD` path possible (surfacing `Docker-Content-Digest`) and to observe the budget so an
operator sees it fall rather than discovering it at zero.

What this package exports (AC31), by the names `observability.md`'s catalogue fixes: the
counter `upstream_requests_total{upstream,outcome}` with `outcome` over `ok`, `not_found`,
`rate_limited`, `error`, `timeout`, `truncated`, `stalled` and `refused_redirect`; the gauges
`upstream_inflight_requests{upstream}` (against `limits.concurrency`),
`upstream_rate_limit_remaining{upstream}` (from the provider's headers, absent when it sends
none), `upstream_cooldown{upstream}` (0 or 1) and `upstream_cooldown_until_timestamp_seconds{upstream}`;
and the counter `upstream_token_exchange_failures_total{upstream,form}`. Two alerts ride them
through `telemetry.Alert`: `UpstreamRateLimitLow` and `UpstreamCooldown` (`observability.md`
AC18 asserts the latter fires exactly once per cool-down). The `upstream` label is the
configured upstream's name, never a URL, so a credential-bearing URL can never become a label.

### Request hygiene

The outbound request is built from the `Request` fields and nothing else (AC4). Two client-side
headers were captured being forwarded by pass-throughs and would identify or fingerprint the
registry's users to an upstream: `Julia-CI-Variables` (`julia.md`) and `X-Client-Anonymous-Id`
(`conan.md`). They cannot be forwarded here because there is no path for them: the `Request` type
has no header map from the inbound side, and a reflection test pins its field set so one cannot be
added quietly. Two more names are on the forbidden list for the same reason, from
`observability.md`'s resolved propagation decision (its AC20): `traceparent` and `tracestate`
are never sent to an upstream. An upstream is a third party; propagating to it changes the
captured traffic the conformance corpus replays against and can carry `tracestate` vendor
entries the operator never meant to send outside. The adapter's transport is therefore built
without the propagating round-tripper, and AC4's stand-in asserts the outbound header set
against the declared set, which is exactly the headers this section names and nothing else.

- `User-Agent`: `stackweaver-registry/<version> (+<server.public_url>)` on every request,
  overridable per request by the handler (Puppet asks for an identifying agent; CRAN needs a
  fixed non-R one because P3M serves different bytes to R by agent, and the default satisfies it)
  (AC5). The value is computed from `deployment.md`'s `server.public_url` and is deliberately
  not a configuration key, because a configurable agent string is how a registry ends up
  impersonating a client.
- `Accept-Encoding: identity` by default, with `http.Transport.DisableCompression` set so Go
  never adds `gzip` on its own or transparently decompresses. Stored bytes must be the bytes the
  upstream signed (`cpan.md`'s `CHECKSUMS`, Homebrew's JWS documents). A handler opts in per
  request (`julia.md`'s `zstd, gzip` for the zstd registry) and receives the encoded body with its
  `Content-Encoding` reported, never decoded (AC5).
- Conditional headers from the proxy's validators: `If-None-Match` when an `ETag` is held,
  `If-Modified-Since` when a `Last-Modified` is, both when both are; a `304` becomes
  `NotModified` with no body (AC15). `Range` when the proxy or handler asks (Hackage's incremental
  index); a `206` becomes `PartialContent` with the returned range, a `200` to a ranged request is
  reported as `OK` so the caller knows the upstream ignored the range (AC15).
- Validators and `Last-Modified` are returned verbatim, including a `Last-Modified` earlier than
  the one sent (AC14); whether that means "no change" (`homebrew.md`) or "never adopt" is
  `proxy-cache.md`'s freshness rule, not the adapter's.

### Timeouts, concurrency and completion

- **Connect timeout**: the instance's `upstream.connect_timeout` (default 10 seconds), a TCP
  and TLS handshake deadline through the dialer on every upstream request.
- **Stall detection**: the body reader fails with `ErrStalled` when no byte arrives for the stall
  period; the period is a value `proxy-cache.md` sets as coalescing policy and hands down in
  `Options`, since that spec measured its coalescing timeout as stall rather than duration. A
  body that keeps arriving is never cut by total duration (AC12).
- **Truthful completion** (AC13): with a `Content-Length`, a body that ends short returns
  `ErrTruncated` from `Read`, never `io.EOF`; with chunked encoding, a stream ending without the
  zero-length terminator does the same. This is what lets `proxy-cache.md` AC10 ("ends before the
  upstream completes the body ... commits nothing") and the completion-only fetch mode's verifier
  hook trust that a clean EOF means the whole body. Go's `net/http` client already surfaces
  `io.ErrUnexpectedEOF` for the first case; the adapter maps it and covers the chunked case with a
  test against a stand-in that closes mid-body.
- **Bounded concurrency**: at most `limits.concurrency` connections in flight per upstream,
  through a semaphore in the `Router`; a request beyond the bound waits on its context (AC11).
  This is Pulp's `download_concurrency`, kept because a two-hundred-pod cold start that misses on
  two hundred *different* artifacts is not coalesced by single-flight and would otherwise open two
  hundred connections to Docker Hub at once.
- **Retries**: none inside the adapter. A retry is a cache-layer decision (serve-stale, the
  client's own retry), and an adapter that retried would double-count against a rate limit it is
  supposed to be observing. `GET` and `HEAD` are safe to retry by callers; `POST` is never retried
  (AC27).

### Configuration keys

The instance-level defaults this package reads, in the three-column shape
`scripts/check-config-keys.js` (`deployment.md`, its two-way spec check) parses; each is
registered in the configuration schema with this default and reaches the package as a typed
`upstream.Config` (AC32). Per-upstream values on the `Upstream` row override the first two.

| Key | Default | Meaning |
|---|---|---|
| `upstream.default_concurrency` | `10` | Instance default for an upstream record's `limits.concurrency` |
| `upstream.default_cooldown_cap` | `1h` | Instance default for an upstream record's `limits.cooldown_cap` |
| `upstream.connect_timeout` | `10s` | TCP and TLS handshake deadline for every upstream request |

Not keys, on purpose: the `User-Agent` (computed from `server.public_url`, above) and the
egress proxy (`HTTPS_PROXY`, `HTTP_PROXY`, `NO_PROXY`, read once by `http.ProxyFromEnvironment`
in the single upstream transport, Scope), so neither can diverge per upstream. The stall period
is not a key of this package either: it travels in `Options` as `proxy-cache.md`'s coalescing
policy.

### Forwarded `POST`

`composer.md` needs the Packagist advisories `POST` forwarded, uncached; the adapter side (AC27):
the body is sent once with the root credential, redirects are errors, the response is returned to
the caller with its body; nothing is retried. Whether and how the answer is cached is
`proxy-cache.md`'s (it is not).

### Redaction

Every log line and every error string this package produces passes through one redactor before
it leaves the package (AC20). The redactor knows the shapes of everything a credential can be in
an upstream exchange: URL userinfo; the `path-token` template's segment; `access_token`, `token`
and `X-Amz-Signature`/`X-Amz-Credential`/`X-Goog-Signature` query parameters; `Authorization`,
`Proxy-Authorization` and every `header`-kind header name in the store; Basic and Bearer values
wherever they appear. Its test is a table over every kind plus a fuzz over URL shapes, asserting
zero occurrences of the secret in the output. `proxy-cache.md` AC6's integration case (a real
failed authenticated fetch leaves no credential in logs or the client-visible error) is the
end-to-end proof; this redactor is what makes it pass for every kind rather than for Basic alone.

`observability.md` runs a second pass behind it: every `*url.URL` attribute on a log record
passes through `telemetry.RedactURL`, whose query-parameter list is this redactor's, and a test
that imports both keeps the two lists equal so a parameter added here cannot be missed there
(AC20). And before a credential is presented at all, the adapter registers its value with
`telemetry.MarkSecret(ctx, value)`, the per-request scrubber that catches a secret reaching a
log line by a path this redactor never saw (a wrapped error from the standard library, a span
attribute); the credential-scope test asserts the call precedes the first use for every kind
(AC20). The path-token template's segment is the one shape only this package knows, which is
why this redactor runs first.

### Configuration-time validation

`Validate(ctx, Upstream)` runs inside `management-api.md`'s create and `PATCH` of a `remote`'s
upstream binding and refuses (AC23): an unregistered `adapter`; a non-`https` root without
`allow_http`; a credential kind the adapter does not accept; an allowlist entry with a bare
wildcard or an `own` role naming no credential; `insecure_skip_verify` without the explicit flag.
It does not probe the upstream: a protocol-level probe (conda's "one of `noarch/repodata.json` or
`noarch/repodata_shards.msgpack.zst` must parse") is the handler's `configure` operation
(`management-api.md`'s `Operator`), which may call fetch-and-cache and therefore this adapter,
and reachability is not a creation-time invariant (an operator configures a mirror before its
firewall rule lands). The refusal is `management-api.md`'s problem type `upstream-invalid`,
status 422, in its closed problem table (its AC20); `repository-lifecycle.md` AC25 asserts the
same refusal on a `PATCH` that changes an existing binding, with nothing changed.

### Preconfigured profiles

`proxy-cache.md` decides which upstreams ship enabled (its resolved preconfigured-upstreams
decision, was Q3; the extension, was Q14, adding galaxy.ansible.com; and the second extension,
was Q17, adding api.nuget.org and repo.maven.apache.org: six upstreams, each enabled from the
release its format ships in) and seeds them at fresh install (its AC19). This spec owns what each entry *is*, as compile-time
profiles in `internal/upstream/preconfigured`, and a test holds the two tables equal (AC24) so
neither spec can add an upstream the other does not know.

| Format | Upstream | Adapter | Credential | Allowlist |
|---|---|---|---|---|
| oci | `https://registry-1.docker.io` | `distribution` | `none` (anonymous exchange) | `auth.docker.io: root` (the realm); the blob CDN hosts as **captured at `oci.md`'s Phase 4** (its proxied phase, AC16 there), not recalled: Docker Hub answers blob `GET`s with a cross-host redirect, and the hosts go in this row from the capture |
| npm | `https://registry.npmjs.org` | `https` | `none` | empty until npm's capture says otherwise |
| pypi | `https://pypi.org/simple/` | `https` | `none` | `files.pythonhosted.org: none` (`pypi.md`: the index anchors point at a different host) |
| ansible-collections | `https://galaxy.ansible.com` | `https` | `none` | as captured with the format |
| nuget | `https://api.nuget.org/v3/index.json` | `https` | `none` | as captured with the format |
| maven | `https://repo.maven.apache.org/maven2/` | `https` | `none` | empty |

Not preconfigured and not profiled here: pub.dev and crates.io (`proxy-cache.md` AC19 names them
as excluded until their formats are authorized), ghcr.io (Homebrew's upstream is operator
configured, with `pkg-containers.githubusercontent.com: none` in its allowlist as the recipe),
Packagist (operator configured, with `composer.md`'s default dist-host list `api.github.com`,
`codeload.github.com`, `github.com`, `gitlab.com`, `bitbucket.org`, all role `none` until the
operator attaches a GitHub token as `own` on `api.github.com`), crates.io (operator configured as
`cargo.md` "The upstream binding" gives the recipe: root `https://index.crates.io/`, the `sparse+`
prefix removed, allowlist `static.crates.io: none` plus `crates.io: none` when the `dl` template is
the `api` download path; a private sparse upstream adds the `header` kind with header
`Authorization`), and ConanCenter (two operator-configured `https` remotes, `center2.conan.io` and
`center.conan.io`, credential `none`; a private Conan upstream takes `basic-exchange` or `bearer`).

### Conformance against real upstreams

The main suite never touches the network: every `upstreams` entry binds to a stand-in
(`conformance-harness.md`, "Upstream bindings"). The stand-ins this spec adds are transport
stand-ins that behave like the real upstreams' quirks rather than like their content: a
Docker-Hub-shaped stand-in that challenges to a realm on a second hostname, counts pulls and
answers `429` with the documented body and headers at a configurable budget, and redirects blobs
to a third hostname; a GitHub-shaped stand-in answering `403` with `x-ratelimit-remaining: 0`; a
presigned-redirect stand-in whose target carries `X-Amz-Expires`; a truncating stand-in. A real
client pulls through the registry against each (AC25), so the adapter's behaviour is observed as
the exit code of `docker pull` and not as a unit test agreeing with itself.

The nightly job (`proxy-cache.md` AC15) rebinds the same entries to the real services. This spec
adds one transport contract case per preconfigured profile to that job (AC26): the real anonymous
token exchange at `auth.docker.io`, the real `ratelimit-*` headers parsed from a `HEAD`, a real
redirect chain admitted by the profile's allowlist. Its transcript is recorded under the harness's
redaction rule (its AC13) and diffed against the previous night's, so a change in a real upstream's
transport (a new CDN host, a changed realm, a header renamed) is a filed issue the next morning
rather than a support ticket in a month.

The real-cloud rows (`aws-ecr` against a real ECR registry, `gcp` against a real Artifact Registry)
need funded accounts and secrets the repository does not have. Under the resolved cloud-row
decision (was Q6): both kinds pass their contract tests against fakes in the main suite (a fake
ECR endpoint answering `GetAuthorizationToken`, a fake metadata server); the nightly workflow
declares both real rows; a declared row whose secret is absent **fails** rather than skips, unless
the row is listed in the table below as unfunded, which is this spec's visible record of a test
that is not running and why. `CLAUDE.md` forbids a silent skip; this is a loud one with an owner.

| Real-cloud row | State | Since |
|---|---|---|
| `aws-ecr` against a real ECR registry | unfunded: no AWS account is provisioned for this repository | 2026-09-27 |
| `gcp` against a real Artifact Registry repository | unfunded: no Google Cloud project is provisioned for this repository | 2026-09-27 |

### Architecture enforcement

Every boundary rule above has a named mechanical enforcer, per `CLAUDE.md`:

- **Egress boundary** (AC3): a `forbidigo` rule in `.golangci.yml`, scoped to `internal/proxy/**`
  and `internal/format/**`, forbidding construction or use of `http.Client`, `http.Transport`,
  `http.Get`, `http.Post`, `http.Head`, `http.DefaultClient`, `net.Dial` and `tls.Dial`, with a
  violation fixture behind the `lintfixture` build tag and a test invoking the pinned golangci-lint
  that fails unless the rule fires (the pattern `format-handler-interface.md` AC6 established).
  `internal/upstream/**` is the only package on the proxied path allowed to open a connection; the
  packages other specs own for their own egress (`internal/auth`'s OIDC client, `internal/policy`'s
  advisory feed, `internal/verify`'s TUF updater and keyserver import, `internal/replication`,
  `internal/signing`'s KMS backends) are named in the rule's scope exclusion, so a new package
  wanting egress must edit the rule and the diff shows it.
- **Import boundary** (AC29): `internal/upstream/import_boundary_test.go` walks the import graph
  with `go/packages` and fails if `internal/upstream/**` imports `internal/format/**` or
  `internal/proxy/**` (no sideways import; `main` wires them), or if any `internal/format/**`
  package imports `internal/upstream` (handlers reach it only through `Deps`' fetch-and-cache).
- **Credential-material boundary** (AC21): the decrypted material type is unexported and the
  store's decrypt function is unexported; a test asserts no exported identifier in
  `internal/upstream` has that type in its signature, and a reflection walk over a `*Response`
  and the error chain from a failing authenticated fetch of every kind finds no credential bytes.
- **Request-shape boundary** (AC4): a reflection test pins `Request`'s exact field set and types,
  so a header map or `*http.Request` cannot be added without failing a test that names why.
- **Allowlist enforcement point** (AC7): asserted at the network layer, with a stand-in for the
  non-allowlisted host that fails the test on any connection.

## Acceptance Criteria

- [ ] AC1: An `Upstream` row's `adapter` value selects exactly one registered adapter; creating or
      updating an upstream naming an unregistered adapter is refused with a problem naming the
      registered set, and two `remote` repositories bound to `center2.conan.io` and
      `center.conan.io` under the same adapter resolve independently (one upstream per remote).
- [ ] AC2: The `Adapter` interface has exactly one method, `Fetch`, and `Validator` exactly one,
      `Validate`; the proxy layer's `Fetcher` subset has exactly `Fetch` and is satisfied by
      `*upstream.Router`; a test enumerates the three method sets and fails on any other count, so
      the pin cannot grow without a spec change.
- [ ] AC3: No code under `internal/proxy/**` or `internal/format/**` constructs or uses an HTTP
      client, transport or dialer: the `forbidigo` rule fires on a violation fixture behind the
      `lintfixture` build tag, proven by a test running the pinned golangci-lint against it, and
      the rule's scope exclusion names every other package permitted egress.
- [ ] AC4: The outbound request is built only from the `Request` fields: against a recording
      stand-in, a real client sending `Julia-CI-Variables`, `X-Client-Anonymous-Id`, a registry
      `Authorization`, a `traceparent` and `tracestate` pair and an arbitrary `X-Test-Leak`
      header through a remote repository, under an active server span, produces an upstream
      request containing none of them and no header outside the set "Request hygiene" declares;
      and a reflection test pins `Request`'s exact field set with no header map and no
      `*http.Request`.
- [ ] AC5: Every upstream request carries `User-Agent: stackweaver-registry/<version> (+<server.public_url>)`
      unless the handler overrides it, and `Accept-Encoding: identity` unless the handler opts in;
      with the opt-in, a gzip-encoded upstream body reaches the caller still encoded with its
      `Content-Encoding` reported, never transparently decoded, proven against a stand-in that
      records headers and serves both encodings.
- [ ] AC6: For every credential kind, the credential reaches the upstream root host and no other:
      a stand-in chain root -> hostB (allowlisted `none`) -> hostC (allowlisted `root`) ->
      hostD (allowlisted `own`) shows, at the network layer, no credential at hostB, the root
      credential at hostC, the second credential at hostD, and a `path-token` inserted only into
      the root's URL and never into hostB's, hostC's or hostD's.
- [ ] AC7: A fetch or redirect to a host absent from the upstream's allowlist makes no connection
      (a stand-in on that host fails the test on any accepted socket) and returns
      `HostNotAllowedError` naming the host, which the handler renders (Composer's `502` naming
      the host); an operator-created upstream has an empty allowlist by default; a bare wildcard
      entry is refused at configuration; matching is on the connect target after normalisation
      and never on `Host` or `X-Forwarded-Host`.
- [ ] AC8: Redirects `301`, `302`, `303`, `307` and `308` are followed inside the adapter up to
      ten hops for `GET` and `HEAD`; the client response carries no `Location` and no upstream
      URL; the eleventh hop fails; a presigned redirect target (query carrying `X-Amz-Expires` or
      `access_token`) is never recorded as provenance or cached as a resolution, the requested
      location is, and a second fetch re-follows the chain, proven against a stand-in whose
      presigned target changes between fetches.
- [ ] AC9: `429` with `Retry-After` (seconds and HTTP-date), `429` without, a `403` carrying
      `x-ratelimit-remaining: 0` and `x-ratelimit-reset`, and a response carrying
      `ratelimit-remaining: 0` with `ratelimit-limit: 100;w=21600` each yield `RateLimitError`
      with the correct retry time; a `403` without those headers yields `Refused`; neither is ever
      `NotFound`; `proxy-cache.md` AC9 consumes the error type by `errors.As`.
- [ ] AC10: After a `RateLimitError`, every request to that upstream for the retry period fails
      immediately with the same error and zero requests reach the upstream (network layer); the
      period is capped at `limits.cooldown_cap` however large the upstream's `Retry-After`; a
      `5xx` and a connection failure trigger no cool-down; requests resume at the retry time.
- [ ] AC11: Under a flood of distinct misses against one upstream, at most `limits.concurrency`
      connections are open at once (network layer), a waiting request is released when one
      completes, and a waiting request whose context is cancelled returns promptly.
- [ ] AC12: Against a stand-in that accepts the TCP connection and never responds, a fetch fails
      within the connect timeout plus the stall period; against a stand-in sending one byte per
      second for longer than any total duration, the body is delivered whole; a stall mid-body
      surfaces as `ErrStalled` from `Read`, distinct from `ErrTruncated`.
- [ ] AC13: A body shorter than its `Content-Length`, and a chunked body closed without the
      terminator, each surface `ErrTruncated` from the body's `Read` before any `io.EOF`; a
      complete body returns `io.EOF` exactly once; `proxy-cache.md` AC10's commit-nothing test
      passes against the same stand-in through the real seam.
- [ ] AC14: `ETag`, `Last-Modified`, `Content-Length`, `Content-Type` and `Docker-Content-Digest`
      are returned verbatim on `GET` and `HEAD`, including a `Last-Modified` earlier than the
      validator sent, so the cache layer, not the adapter, decides adoption.
- [ ] AC15: With an `ETag` held, the request carries `If-None-Match`; with a `Last-Modified`,
      `If-Modified-Since`; with both, both; a `304` maps to `NotModified` with no body; a `Range`
      request answered `206` maps to `PartialContent` with the returned range and answered `200`
      maps to `OK`, so a caller splicing an incremental index knows the upstream ignored the
      range.
- [ ] AC16: The `distribution` adapter answers a `401` Bearer challenge by requesting a token at
      the realm with the challenge's `service` and `scope`, anonymously under `none` and with
      Basic under `token-exchange`, retries with `Authorization: Bearer`, caches the token per
      `(realm, service, scope)` for `expires_in` (60 seconds when absent) less a margin,
      re-exchanges on expiry and on a fresh `401`, never sends a placeholder token, and refuses a realm host
      that is neither the root nor an allowlisted `root` entry with `HostNotAllowedError`, all
      proven against a fake token server.
- [ ] AC17: The `aws-ecr` kind obtains a token through `GetAuthorizationToken` against a fake ECR
      endpoint, presents it as Basic `AWS:<password>`, refreshes at `expiresAt` minus five minutes
      and never later than twelve hours, and works from static keys and from the ambient chain
      (environment variables in the test); the SDK import is confined to `internal/upstream/awsecr`
      by the depguard allowlist.
- [ ] AC18: The `gcp` kind obtains an access token from a fake metadata server that requires
      `Metadata-Flavor: Google` (a request without it is refused by the fake and the kind sends
      it), honours `expires_in` and refreshes five minutes before expiry; from a service-account
      JSON key (the `_json_key` material) it obtains one from a fake token endpoint by an RS256
      JWT signed with the standard library; both present as Basic `oauth2accesstoken:<token>`; no
      third-party import exists under `internal/upstream/gcp`.
- [ ] AC19: The `basic`, `bearer`, `header` and `path-token` kinds present exactly as the kinds
      table states, at the network layer: the Basic pair, the Bearer token, the named header with
      its value, and the token at the template position in the path of root-host requests only.
- [ ] AC20: For every credential kind and every credential-bearing URL shape (userinfo, path
      token, `access_token`, `token`, `X-Amz-Signature`, `X-Goog-Signature`, Basic and Bearer
      values, every `header`-kind header), a failing authenticated fetch produces log lines and an
      error chain in which the secret occurs zero times, by a table test plus a fuzz over URL
      shapes; `proxy-cache.md` AC6's integration case passes through this redactor; the
      redactor's query-parameter list equals `telemetry.RedactURL`'s, held by a test importing
      both; and for every kind the adapter calls `telemetry.MarkSecret` on the credential value
      before its first use, so a secret reaching a span attribute or a wrapped standard-library
      error is scrubbed there too (`observability.md` AC9's recorder is the witness).
- [ ] AC21: Decrypted credential material never leaves `internal/upstream`: its type and the
      store's decrypt function are unexported, no exported identifier carries the type, and a
      reflection walk over a `*Response` and the error chain of a failing authenticated fetch of
      every kind finds no credential bytes.
- [ ] AC22: An upstream with an `http://` root is refused at configuration unless `allow_http` is
      set; a stand-in presenting a certificate from a private CA is fetched successfully only when
      the upstream's `tls.ca_bundle` names that CA and fails otherwise; `insecure_skip_verify` is
      refused unless set explicitly and, when set, is named in the startup log; a client
      certificate configured on the upstream is presented in the handshake.
- [ ] AC23: `Validate` runs on `management-api.md`'s create and `PATCH` of a `remote`'s upstream
      and refuses an unregistered adapter, a non-`https` root without `allow_http`, a credential
      kind the adapter does not accept (`bearer` on `distribution`, `token-exchange` on `https`),
      a row naming `git` as its own adapter (the resolved git-location decision, was Q9), an `own`
      entry naming no credential and a bare-wildcard host,
      each with problem type `upstream-invalid` and status 422 and nothing committed; an
      unreachable but well-formed upstream is accepted.
- [ ] AC24: The preconfigured profile table in `internal/upstream/preconfigured` and the
      fresh-install seeding `proxy-cache.md` AC19 asserts name the same set of upstreams, format
      by format, proven by one test that reads both; every profile names its adapter, URL,
      credential kind `none` and allowlist; the Docker Hub profile's allowlist contains
      `auth.docker.io` with role `root` and the blob CDN hosts captured at `oci.md`'s Phase 4
      (its proxied phase, its AC16).
- [ ] AC25: A real `docker pull` through a remote repository succeeds against a Docker-Hub-shaped
      stand-in that challenges to a realm on a second hostname, redirects blobs to a third and
      counts pulls; with the stand-in's budget exhausted the pull fails with the client reporting
      the upstream's `429` message, not a not-found; a real Composer client fetches a dist through
      a Packagist-shaped stand-in whose dist URL is on a second host answering `302` to a third,
      and fails with a refusal naming the host when the third is removed from the allowlist.
- [ ] AC26: The nightly real-upstream job (`proxy-cache.md` AC15) runs one transport contract case
      per shipped preconfigured profile against the real service (Docker Hub's anonymous exchange
      and `ratelimit-*` headers first), records the redacted transcript and opens an issue on a
      diff from the previous night; the `aws-ecr` and `gcp` real-cloud rows are declared in the
      workflow and fail, not skip, when their secrets are absent, unless listed as unfunded in
      this spec's table.
- [ ] AC27: A forwarded `POST` is sent once with its body and the root credential, is never
      retried, and a redirect answered to it is an error; the response body is returned to the
      caller; a real Composer client's `audit` through a remote repository reaches the stand-in's
      advisories endpoint exactly once per invocation.
- [ ] AC28: The `git` adapter fetches the tree of one commit named by 40 hexadecimal digits over
      HTTPS from an allowlisted host with no credential, verifies every object with
      collision-detecting SHA-1, refuses a tree over the configured size bound before storing
      anything, refuses a branch or tag name, and shells out to nothing (no `os/exec` import under
      `internal/upstream`).
- [ ] AC29: `internal/upstream/**` imports nothing from `internal/format/**` or `internal/proxy/**`,
      and no `internal/format/**` package imports `internal/upstream`, proven by an import-graph
      test that fails on the first violation and names the edge.
- [ ] AC30: `Router` resolves the `Upstream` row and its credential on every fetch: after a
      `PATCH` changes a `remote`'s URL, adapter or credential reference, the next fetch reaches
      the new root with the new credential at the network layer, no token exchanged under the
      old upstream's realm is presented, the old upstream's cool-down does not apply to the new
      one, and every cached reference is still served with `last-checked` reset
      (`repository-lifecycle.md` AC25); after a credential is rotated the next fetch carries the
      new value (`management-api.md` AC21); and deleting a credential referenced by an
      `Upstream` or a `ReplicationLink` is refused `409` `in-use` naming each dependant
      (`repository-lifecycle.md` AC20), so no fetch ever finds its credential reference
      dangling.
- [ ] AC31: The package exports exactly `upstream_requests_total{upstream,outcome}`,
      `upstream_inflight_requests{upstream}`, `upstream_rate_limit_remaining{upstream}`,
      `upstream_cooldown{upstream}`, `upstream_cooldown_until_timestamp_seconds{upstream}` and
      `upstream_token_exchange_failures_total{upstream,form}` under the catalogue's names, with
      `upstream` always the configured name and never a URL; a driven scenario against the
      Docker-Hub-shaped stand-in moves `upstream_rate_limit_remaining` with the header, sets
      `upstream_cooldown` to 1 for exactly the cool-down period, and raises `UpstreamCooldown`
      once through `telemetry.Alert`; a failed exchange increments the failure counter under its
      kind.
- [ ] AC32: The keys `upstream.default_concurrency`, `upstream.default_cooldown_cap` and
      `upstream.connect_timeout` are registered in the configuration schema with the defaults
      tabled here, reach the package as a typed `upstream.Config`, are used by every `Upstream`
      row that leaves `limits` unset, and are the only `upstream.` keys the schema knows, held by
      `scripts/check-config-keys.js` under `make verify`.
- [ ] AC33: The `basic-exchange` kind, against a fake Conan-shaped server that sends no
      challenge, makes one `GET` of the configured exchange path with the stored Basic pair, then
      presents the returned `text/plain` body as `Authorization: Bearer` on every later request to
      the root and to allowlist entries of role `root` and on no other host (network layer); on a
      fresh `401` it re-exchanges once and retries once, and a second `401` or an exchange
      answering other than `200` with a non-empty body yields `Refused` and increments
      `upstream_token_exchange_failures_total{form="basic-exchange"}`; the exchanged token is
      registered with `telemetry.MarkSecret` before its first use and occurs zero times in logs
      and the error chain; the exchange is never made against an off-origin host; and a real
      `conan install` through a remote repository bound to a reference `conan_server` stand-in
      that requires authentication succeeds under this kind (the resolved Conan-exchange
      decision, was Q8).
- [ ] AC34: On a remote whose row names `https`, a git location `{url, commit}` is fetched by the
      `git` adapter under that row's allowlist, concurrency bound and cool-down: with the git host
      allowlisted (under any role) the tree of the commit arrives as a tar stream and no
      credential reaches the git host even when the row carries one (network layer); with the host
      absent it fails `HostNotAllowedError` before any connection; the same location on a
      `distribution` row is refused before any connection; a truncated smart-HTTP answer surfaces
      `ErrTruncated`; and a real `terraform init` through a remote repository installs a module
      whose upstream location is a commit-pinned `git::https` URL, from an archive the handler
      re-packed from that tree (`terraform.md` AC18 is the client half; the resolved
      git-location decision, was Q9).

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | unit + integration | `internal/upstream/registry_test.go` (selection, unregistered refusal); `internal/upstream/router_test.go` (two remotes, one adapter, independent resolution) |
| AC2 | unit | `internal/upstream/pin_test.go` (reflection over `Adapter` and `Validator` method sets) |
| AC3 | lint + unit | `forbidigo` rule in `.golangci.yml` scoped to `internal/proxy/**` and `internal/format/**`; fixture behind the `lintfixture` build tag; `internal/upstream/egress_boundary_test.go` runs the pinned golangci-lint against it and asserts the exclusion list |
| AC4 | integration + unit | `conformance/core/upstream_hygiene_test.go` (recording stand-in, real client with leak headers, active server span; the outbound header set against the declared set, shared with `observability.md` AC20); `internal/upstream/request_shape_test.go` (pinned field set) |
| AC5 | integration | `internal/upstream/hygiene_test.go` (header-recording stand-in, both encodings, override) |
| AC6 | integration | `internal/upstream/credential_scope_test.go` (four-host stand-in chain, every kind, network-layer header capture) |
| AC7 | integration + unit | `internal/upstream/allowlist_test.go` (connection-refusing stand-in on the excluded host, normalisation, wildcard refusal, `Host` and `X-Forwarded-Host` ignored) |
| AC8 | integration | `internal/upstream/redirect_test.go` (five codes, ten-hop bound, no `Location` on the client response, presigned target rotation between fetches) |
| AC9 | unit | `internal/upstream/ratelimit_test.go` (table over the response shapes, `errors.As`) |
| AC10 | integration | `internal/upstream/cooldown_test.go` (injected clock, network-layer zero-request assertion, cap, `5xx` no cool-down) |
| AC11 | integration | `internal/upstream/concurrency_test.go` (flood of distinct misses, open-connection count at the stand-in, cancelled waiter) |
| AC12 | integration + fault injection | `internal/upstream/timeout_test.go` (accept-and-hang, one byte per second, mid-body stall) |
| AC13 | integration + fault injection | `internal/upstream/completion_test.go` (short `Content-Length`, unterminated chunked, clean body); `internal/proxy/fetch_integrity_test.go` re-run through the real seam |
| AC14 | integration | `internal/upstream/validators_test.go` (verbatim headers on `GET` and `HEAD`, backwards `Last-Modified`) |
| AC15 | integration | `internal/upstream/conditional_test.go` (three validator combinations, `304`, `206` and ignored-range `200`) |
| AC16 | integration | `internal/upstream/distribution/token_test.go` (fake token server: anonymous and Basic exchange, per-scope cache, expiry, fresh `401`, disallowed realm, no placeholder) |
| AC17 | integration + lint | `internal/upstream/awsecr/token_test.go` (fake `GetAuthorizationToken` endpoint, refresh timing, static and ambient); depguard allowlist entry in `.golangci.yml` |
| AC18 | integration + unit | `internal/upstream/gcp/token_test.go` (fake metadata server, fake token endpoint, JWT signature check, refresh timing); an import-list assertion in the same file |
| AC19 | integration | `internal/upstream/credential_scope_test.go` (presentation per kind at the network layer) |
| AC20 | unit + fuzz + integration | `internal/upstream/redact_test.go` (table over kinds and shapes, `FuzzRedact`; the parameter list equal to `telemetry.RedactURL`'s, importing both); `internal/upstream/credential_scope_test.go` (`MarkSecret` before first use per kind, through `telemetry.NewTestRecorder`); `internal/proxy/credentials_test.go` (`proxy-cache.md` AC6's case through the redactor) |
| AC21 | unit | `internal/upstream/credential_boundary_test.go` (exported-identifier scan, reflection walk over `Response` and error chains) |
| AC22 | integration + unit | `internal/upstream/tls_test.go` (private-CA stand-in with and without the bundle, client certificate in the handshake, startup-log naming); `internal/upstream/validate_test.go` (`http://` refusal and override) |
| AC23 | integration | `internal/manage/upstream_validate_test.go` (create and `PATCH` through the management API, each refusal with `upstream-invalid` including a row naming `git`, unreachable accepted) |
| AC24 | unit | `internal/upstream/preconfigured/profiles_test.go` (reads the profile table and the seeding set `proxy-cache.md` AC19 tests, asserts equality and field completeness) |
| AC25 | conformance | `conformance/oci/upstream_dockerhub_test.go` (Docker-Hub-shaped stand-in: realm on a second host, blob redirect to a third, pull budget, `429` message visible to the client); `conformance/composer/upstream_dist_host_test.go` (dist on a second host, `302` to a third, allowlist removal) |
| AC26 | ci + manual procedure | scheduled nightly workflow rows in `.github/workflows/` (one per profile plus the two real-cloud rows); transcript diff and issue creation proven by a written manual-dispatch procedure; the unfunded table in this spec |
| AC27 | integration + conformance | `internal/upstream/post_test.go` (single send, no retry, redirect is an error); `conformance/composer/audit_forward_test.go` (real client, stand-in counts one request) |
| AC28 | integration + unit | `internal/upstream/git/fetch_test.go` (local smart-HTTP fixture repository, collision-detecting SHA-1 with a corrupted object, size bound, branch refusal); `internal/upstream/git/no_exec_test.go` (import scan) |
| AC29 | unit | `internal/upstream/import_boundary_test.go` (`go/packages` walk, first violating edge named) |
| AC30 | integration | `internal/upstream/router_test.go` (per-fetch resolution, realm-keyed token cache, cool-down not carried); `internal/repository/configure_remote_test.go` (shared with `repository-lifecycle.md` AC25: cache kept, `last-checked` reset); `internal/manage/upstream_credential_test.go` (shared with `management-api.md` AC21 and `repository-lifecycle.md` AC20: rotation at the network layer, `in-use` while referenced) |
| AC31 | integration | `internal/upstream/metrics_test.go` (every series and label set through `telemetry.NewTestRecorder` against the Docker-Hub-shaped stand-in; `UpstreamCooldown` once; the `observability.md` AC6 and AC18 rows for this package) |
| AC32 | unit + script | `internal/upstream/config_test.go` (defaults, typed struct, row-level override); `scripts/check-config-keys.js` under `make verify` (`deployment.md`'s two-way check) |
| AC33 | integration + conformance | `internal/upstream/basicexchange_test.go` (fake Conan-shaped server without a challenge: exchange path, Bearer on root and `root` entries only at the network layer, one re-exchange on a fresh `401`, second `401` and empty body `Refused`, failure counter under its form, `MarkSecret` through `telemetry.NewTestRecorder`, off-origin exchange refused); `conformance/conan/proxied_test.go` (a real `conan install` through a remote bound to an authenticating `conan_server` stand-in under `basic-exchange`, shared with `conan.md`'s proxied criterion) |
| AC34 | integration + conformance | `internal/upstream/router_git_test.go` (git location on an `https` row: allowlisted host under each role with no credential at the git host, absent host refused before connect, `distribution` row refused, truncated answer; concurrency bound and cool-down shared with the row); `conformance/terraform/module_vcs_test.go` (shared with `terraform.md` AC18: a git stand-in serving a commit over smart HTTP, restricted-network installs) |

## Implementation Phases

Built at `project-charter.md` build-order step 4, with the OCI handler's proxied phase and the
proxy layer; the OCI proxied conformance suite against the Docker-Hub-shaped stand-in is this
seam's first proving ground, and the nightly job against the real Docker Hub its first real
upstream. Each later format adds a profile and, where a capture demands, a credential kind, never
an adapter.

### Phase 1: The seam and the two adapters (step 4, before OCI's proxied phase)
- `internal/upstream`: `Adapter`, `Validator`, `Request`, `Response`, the typed errors, the
  registry and the `Router` with the concurrency bound and per-fetch resolution (AC30); the
  redactor with `MarkSecret` and the `RedactURL` list-equality test; `Validate`; the `upstream.`
  keys (AC32)
- The `https` adapter: credential kinds `none`, `basic`, `bearer`, `header`, `path-token`;
  allowlist and credential roles; redirects; conditional requests and `Range`; identity encoding
  and the fixed `User-Agent`; rate-limit interpretation; connect timeout and stall detection;
  truthful completion; TLS trust and `http://` refusal
- The `distribution` adapter: the challenge and token exchange under `none` and
  `token-exchange`; `Docker-Content-Digest` on `GET` and `HEAD`; `ratelimit-*` headers
- The cool-down
- The architecture enforcers: `forbidigo` egress rule and fixture, import-graph test,
  credential-material and request-shape tests
- The Docker Hub profile with its realm entry; its blob CDN hosts are filled from the capture at
  `oci.md`'s Phase 4 (its proxied phase, AC16 there), since AC25 runs against stand-ins; the
  profile table test against `proxy-cache.md`'s seeding
- Transport stand-ins and the OCI conformance case (AC25's Docker Hub half)

### Phase 2: Cloud credential kinds and the nightly rows (step 4, after OCI conformance passes)
- `aws-ecr` with the confined SDK import and the fake endpoint; `gcp` with the fake metadata
  server and token endpoint
- `management-api.md`'s create and `PATCH` calling `Validate`; the `upstream-invalid` (422)
  problem type; the binding-change and credential rotation cases shared with
  `repository-lifecycle.md` and `management-api.md` (AC30)
- The nightly transport contract case for Docker Hub; the declared real-cloud rows and the
  unfunded table
- The per-upstream metrics and the two alerts (AC31), under `observability.md`'s catalogue names

### Phase 3: Profiles that ride their formats (steps 5 onward)
- npm, PyPI and galaxy.ansible.com profiles with their formats' captures (the set is
  `proxy-cache.md`'s; each profile lands in the format's own commits under its cost line, per
  `project-charter.md`'s "Measuring per-format cost")
- api.nuget.org and repo.maven.apache.org profiles with their formats (`proxy-cache.md`'s
  resolved second extension, was Q17)
- The Packagist recipe (`own` credential on `api.github.com`) and the Composer conformance cases
  (AC25's second half, AC27)
- The `basic-exchange` kind with Conan's proxied phase, its only consumer and the source of its
  evidence (the resolved Conan-exchange decision, was Q8; AC33); the crates.io recipe with Cargo's
  proxied phase (`cargo.md` AC21)

### Phase 4: The `git` adapter (with Terraform)
- `internal/upstream/git` with go-git and collision-detecting SHA-1, the size bound, the no-exec
  test
- The git location form on `Request` and the `Router`'s per-location dispatch to `git` on an
  `https` row under that row's allowlist, bound and cool-down; the configuration refusal of a row
  naming `git` (the resolved git-location decision, was Q9; AC34, AC23)

## Tasks

Left empty by `/spec`. Populated by `/tasks` once the spec reaches `planned`.

## Open Questions

None remain open. Seven questions were written in the template's decision shape during authoring
on 2026-09-27, and two more (Q8, Q9) during the closing reconciliation sweep on 2026-09-28 on
Opus, and each was adopted at its recommendation under the owner's standing delegation
(`CLAUDE.md`); each is reversible by the owner, and `grep -rn "standing delegation"` finds them.
Q8 and Q9 carry this spec's `fable_recheck`.
Resolved decisions are kept rather than deleted, so the reasoning survives the next time someone
asks why it was done this way.

### Resolved: adapter granularity (was Q1)

**Adopted 2026-09-27 under the owner's standing delegation.** Option B: two transport adapters
(`https`, `distribution`; `git` later for Terraform) and a separate credential-kind axis; the
protocol logic the format specs described as "the X adapter" stays in each handler's proxied-path
derivation. Folded into Scope, "Selecting an adapter", "Credential kinds", AC1, AC2, AC16 to AC19,
and the sibling consequences for every format spec that named an adapter.

Should there be one adapter per upstream provider (Harbor's fifteen) or a small set of transport
adapters with credential acquisition as its own axis?

**Recommendation:** B. Harbor's own code shows most of its adapters are the native adapter plus a
credential rule, and the format specs' "adapters" are HTTPS plus handler-side URL derivation.
Vendors differ along two axes, and multiplying them into files is the union-of-quirks trap.

| Option | You get | It costs |
|---|---|---|
| **A. One adapter per provider (Docker Hub, ECR, GCR, GHCR, Quay, Artifactory, Nexus, Supermarket, ConanCenter, ...)** | Each provider's quirks in one obviously named place; matches the format specs' vocabulary | Fifteen-plus packages that are mostly the same code; a new provider is a code change; credential logic duplicated or cross-imported between adapters |
| **B. Two transport adapters plus credential kinds; handler-side derivation for protocol logic** | A new provider is an `Upstream` row and possibly a credential kind; one place for redirects, allowlists, rate limits; the OCI handler serves seven registries with one adapter | The format specs' "Supermarket adapter" wording must be corrected to "the `https` adapter plus the handler's derivation" (a sibling consequence per spec); the `https` adapter's option surface must be watched so it does not grow protocol-shaped fields |
| **C. One adapter, everything an option** | Smallest surface | The distribution challenge state machine bolted onto every request; OCI-shaped options on a CRAN fetch |

**Why this is yours:** it decides how the axis the owner settled in `format-handler-interface.md`
is realised, and it corrects the vocabulary of twenty format specs the owner has read.

Accepted cost: the sibling consequences, and vigilance on the `https` option surface, which AC2's
pin and the request-shape test make visible.

### Resolved: where the interface lives (was Q2)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: `Adapter`, `Validator`,
`Request` and `Response` are declared in `internal/upstream`; the proxy layer declares its own
one-method `Fetcher` satisfied by `*upstream.Router`; `internal/manage` type-asserts `Validator`.
Folded into "The interface", AC2, AC29.

The `go` skill says interfaces belong to their consumers. Where does an interface with two
consumers (the proxy layer, the management API's validation) and three implementors live?

**Recommendation:** A. The shared types must live somewhere both consumers import without
importing each other; the implementor package is that place, and each consumer still declares the
subset it uses, which keeps the skill's rule where it matters (the consumer never depends on
methods it does not call).

| Option | You get | It costs |
|---|---|---|
| **A. Types and `Adapter` in `internal/upstream`; consumers declare one-method subsets** | No sideways import between proxy and manage; consumers see only what they call; one place to read the contract | The implementor package exports an interface, which the skill discourages when there is one consumer (there are two) |
| **B. Interface in `internal/proxy`, types in `internal/upstream`** | Textbook consumer-defined interface | `internal/manage` must import `internal/proxy` to validate an upstream, or duplicate the types; the proxy package becomes the type home for a concern it does not own |
| **C. Everything in `internal/proxy`, adapters as subpackages of it** | One package tree | Egress and cache semantics in one import boundary, so the AC3 rule cannot distinguish them; `proxy-cache.md`'s `covers` would swallow this spec |

**Why this is yours:** it fixes the package layout `proxy-cache.md`'s `covers` and this spec's
`covers` divide, which is a decision about how the tree is read for years.

Accepted cost: the exported interface in the implementor package, mitigated by the one-method
subsets on the consuming side.

### Resolved: the off-origin allowlist's home and enforcement (was Q3)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: the allowlist is a field
on the `Upstream` row with per-host credential roles `none`, `root`, `own`; it is enforced in the
adapter before any connection, on the connect target; default empty. Folded into "Configuration
on the `Upstream` row", "Credential scoping and the off-origin allowlist", AC6, AC7, AC24, and
the `data-model.md` sibling consequence.

`composer.md`, `opam.md`, `terraform.md`, `openvsx.md`, `vagrant.md` and others each asked for an
allowlist in slightly different words, and `helm.md` asked that the adapter decide which host gets
the credential. Where does the list live and who enforces it?

**Recommendation:** A. The thing being protected is the upstream's credential, so the list belongs
beside it; the only code that opens connections is the adapter, so it is the only enforcement point
a handler cannot route around by deriving an absolute URL.

| Option | You get | It costs |
|---|---|---|
| **A. On `Upstream`, roles per host, enforced in the adapter at connect time** | One rule for redirects and metadata-derived URLs alike; credential decisions visible in configuration; unbypassable from a handler | A `data-model.md` field addition; operators must add hosts for upstreams whose CDNs change |
| **B. In `proxy-cache.md`, checked on the location the handler passes** | No adapter involvement | Redirect targets are never seen by the proxy, so the check misses the hop that leaks the credential (homebrew's `307`) |
| **C. Per format, in the handler** | Format-specific defaults where the knowledge is | A security decision in the code the constitution says has no egress authority; twenty-seven copies of it |

**Why this is yours:** it places a security boundary and decides that a CDN change is an operator
action rather than an automatic follow.

Accepted cost: the operator action, softened by the preconfigured profiles carrying their hosts
and by AC26's nightly contract case catching a CDN change the next morning.

### Resolved: the cloud dependency (was Q4)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: the AWS SDK for Go v2
(`config`, `ecr`) for `aws-ecr`, confined to `internal/upstream/awsecr` by the depguard allowlist;
the standard library for `gcp`. Folded into "Credential kinds", AC17, AC18.

`aws-ecr` needs one SigV4-signed API call. Hand-roll it or take the SDK?

**Recommendation:** A. The call is small; the ambient credential chain it must honour
(environment, shared config, IMDS, web identity, ECS task role) is not, and an error in either is
an IAM security bug in the one code path no client oracle sees.

| Option | You get | It costs |
|---|---|---|
| **A. AWS SDK v2, confined to one package** | The credential chain and SigV4 maintained upstream; IMDSv2, IRSA and task roles work on day one | A large dependency tree in every binary, since every format ships in every binary (`format-handler-interface.md`, resolved extension boundary) |
| **B. Hand-rolled SigV4 and a static-keys-only chain** | Stdlib only | Ambient credentials, the way anyone runs this on EKS, do not work; a signing bug is a silent auth failure or worse |
| **C. Shell out to the AWS CLI** | No Go dependency | A binary dependency in the container image, `os/exec` in the egress package, and no testability |

**Why this is yours:** it trades binary size and dependency surface for IAM correctness, and the
size lands on every deployment whether or not it uses ECR.

Accepted cost: the dependency tree, isolated so a future split into a build tag is mechanical.

### Resolved: cool-down after a rate limit (was Q5)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: after a `RateLimitError`,
the `Router` fails every request to that upstream fast until the retry time, capped at one hour;
nothing else triggers a cool-down. Folded into "Rate limits and the cool-down", AC10.

When an upstream says it is throttling, should the registry keep sending requests (each one a
fresh `429`) or hold off?

**Recommendation:** A. A fleet that keeps hammering a throttled upstream extends the throttle and,
on GitHub, can trip the secondary limit; `proxy-cache.md`'s serve-stale already covers the
metadata gap, and its AC9 keeps the client answer retryable.

| Option | You get | It costs |
|---|---|---|
| **A. Fail fast until the retry time, capped** | No further budget spent; the upstream's own recovery time honoured; one operator-visible state | A bogus `Retry-After` takes an upstream offline for up to the cap; a request that would have succeeded (a different budget, a different endpoint) is refused |
| **B. No cool-down; every request goes through** | Nothing ever refused locally | Each request is another `429`, and each may extend the window; GitHub's secondary limits punish exactly this |
| **C. Cool-down on any failure (Nexus-style auto-block)** | One mechanism for every outage | Two answers to an unreachable upstream (this and serve-stale), and a transient `502` takes a healthy upstream offline |

**Why this is yours:** it is a product behaviour an operator will see (an upstream "down" for a
minute after a `429`) and a judgement about trusting an upstream's stated retry time.

Accepted cost: the refused-but-would-have-succeeded request during a cool-down, bounded by the cap.

### Resolved: real-cloud nightly rows without funded accounts (was Q6)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: contract tests against
fakes in the main suite; the real rows declared in the nightly workflow, failing (not skipping)
when secrets are absent unless listed as unfunded in this spec's table, which lists both today.
Folded into "Conformance against real upstreams", AC17, AC18, AC26.

The `aws-ecr` and `gcp` kinds cannot be exercised against the real services without accounts the
repository does not have. How is that gap kept visible?

**Recommendation:** A. `CLAUDE.md` forbids a silent skip; a row that fails unless the owner has
written down that it is unfunded is a loud one, and the fakes keep the code path tested every run.

| Option | You get | It costs |
|---|---|---|
| **A. Fakes in the main suite; real rows declared, fail-unless-unfunded, unfunded table here** | The gap is a line in the spec the owner can fund or accept; a funded row that loses its secret fails loudly | Two rows red in the workflow definition until funded, which is the point |
| **B. Fakes only; no real rows until funded** | Clean workflow | The gap exists only in someone's memory; when funding arrives nobody remembers to add the rows |
| **C. Fund both accounts now** | Real coverage from day one | Money and account administration the owner has not agreed to; out of an agent's authority |

**Why this is yours:** it is a spending decision and a decision about what "the nightly is green"
is allowed to mean.

Accepted cost: the two declared-but-unfunded rows, visible in this spec until the owner funds or
strikes them.

### Resolved: what ships at step 4 (was Q7)

**Adopted 2026-09-27 under the owner's standing delegation.** Option A: the seam, both adapters,
the six non-cloud credential kinds, the allowlist, the cool-down, the enforcers and the Docker Hub
profile in Phase 1; `aws-ecr` and `gcp` in Phase 2 within step 4; `git` with Terraform. Folded
into Implementation Phases.

Should the cloud credential kinds wait for a format that needs them, and should `git` wait for
Terraform?

**Recommendation:** A. Effort is not a reason to defer (`CLAUDE.md`), and ECR and GCR are the
upstreams the charter's step 4 rationale names; but they land after OCI's conformance passes so a
cloud-kind bug cannot be confused with a seam bug in the first real proving run. `git` has exactly
one consumer and its evidence (Terraform's captures) arrives with that format.

| Option | You get | It costs |
|---|---|---|
| **A. Non-cloud kinds first, cloud kinds second within step 4, `git` with Terraform** | OCI's first proving run isolates the seam; ECR and GCR ship in the same step the charter names | Two phases where one would do |
| **B. Everything in Phase 1** | One phase | A failing `docker pull` against the stand-in has three more suspects |
| **C. Cloud kinds deferred to a later step** | Less at step 4 | Contradicts the charter's step 4 wording; the OCI handler ships unable to proxy ECR, which is the union-of-quirks outcome the axis exists to prevent |

**Why this is yours:** it sequences the charter's own step and decides when the OCI handler is
"done" for the registries the owner named.

Accepted cost: the second phase inside step 4.

Later note (2026-09-28): the seventh non-cloud kind, `basic-exchange` (was Q8), lands with Conan's
proxied phase in Phase 3, and the `git` adapter's per-location dispatch (was Q9) in Phase 4; both
follow this record's rule that a transport with one consumer lands with that consumer's evidence.

### Resolved: a Conan-shaped token exchange (was Q8)

**Adopted 2026-09-28 under the owner's standing delegation.** Option B: a new credential kind,
`basic-exchange` (username, password, an exchange path under the root; a `GET` with Basic whose
`200` `text/plain` body is the token, presented as Bearer to the root and its `root` entries;
re-exchanged once on a fresh `401`), accepted by the `https` adapter only. Folded into Scope,
"The requirements, gathered" (the Conan row), "Credential kinds", "Preconfigured profiles" (the
ConanCenter recipe line), AC33, Phase 3. Raised by format batch 4 item 10 in
`agents/spec-loop/consequences.md` from `conan.md`'s proxied path.

`conan.md` binds a private Conan upstream with the `bearer` kind and reports that a Conan server
issuing tokens only through its Basic exchange at `users/authenticate` needs a kind this spec does
not have: `token-exchange` is driven by a distribution `401` Bearer challenge naming a realm, and
no Conan server sends one (captured: the client sends Basic to `GET /v2/users/authenticate`, or
`/v1/users/authenticate` on Conan 1.66.0, reads the token from a `text/plain` body and presents it
as Bearer afterwards). Should this spec add a Conan-shaped exchange kind, or state that Conan
upstreams take `bearer` only in v1?

**Recommendation:** B. The exchange is the Conan protocol's own login (the reference server
captured in `conan.md` exposes no other), and that server's tokens carry a server-configured
expiry (`jwt_expire_minutes` in its configuration; to be confirmed by capture with the kind's
conformance case), so `bearer` alone means an operator pasting a token that stops working on the
upstream's schedule, a failure that looks like an upstream outage. The shape is small and captured, it is a kind and not an adapter (Q1's rule),
and scope is not a reason to leave it out (`CLAUDE.md`).

| Option | You get | It costs |
|---|---|---|
| **A. `bearer` only for Conan upstreams in v1, stated as a limit** | No new kind; the ConanCenter case (anonymous) is unaffected | Every private Conan upstream needs an out-of-band token that expires on the upstream's schedule; the remote fails silently at expiry and serve-stale hides it until a miss; the limit is a deferral for effort, which `CLAUDE.md` rules out |
| **B. A `basic-exchange` kind: Basic `GET` at a stored path, token body, Bearer after, re-exchange on `401`** | A private Conan upstream configured once with a username and password, exactly as the client itself is; refresh on the upstream's own signal; the same root-only scoping and redaction as every kind | One more kind in the review surface of `auth.md` AC10 and in `management-api.md`'s kind list; the exchanged token held in memory per upstream; the kind's shape fitted to Conan's exchange, so a future exchange with a JSON body is a further kind rather than an option here |
| **C. Generalise `token-exchange` to a challenge-less mode with a configurable path and body parser** | One exchange kind | An OCI-shaped state machine with a Conan branch and a body-format option, the option-surface growth Q1's accepted cost warns about; the distribution adapter's tests carry a format it never serves |

**Why this is yours:** it adds an outward secret handler (one more thing `auth.md` AC10's external
review covers) and decides whether private Conan proxying is a v1 capability.

Accepted cost: the kind, its entry in `management-api.md`'s upstream-credential kind list and in
AC10's review surface (both reported as consequences), and an in-memory token per upstream that a
restart re-exchanges.

### Resolved: how a location reaches the `git` adapter (was Q9)

**Adopted 2026-09-28 under the owner's standing delegation.** Option A: the `Router` selects the
adapter per location. `Request` carries a git location `{url, commit}` beside the path and URL
forms; on an `https` row it goes to the `git` adapter under that row's allowlist (any role, never a
credential), concurrency bound and cool-down; on a `distribution` row it is refused; a row naming
`git` as its own adapter is refused at configuration. Folded into Scope, "Selecting an adapter",
"The interface", "Credential kinds", AC23, AC34, Phase 4. Raised by format batch 5 item 6 in
`agents/spec-loop/consequences.md` from `terraform.md` AC18.

`terraform.md` proxies modules whose upstream location is a commit-pinned `git::https` URL, fetched
by this spec's `git` adapter. But a Terraform remote's row names `https` (discovery, version lists
and provider archives are HTTPS exchanges), the `Router` selected one adapter per row, and the git
host is whatever each module author published. How does a module location reach the `git` adapter,
and under whose allowlist?

**Recommendation:** A. The git host is metadata-derived exactly like a provider's
`releases.hashicorp.com`, so the rule that already governs metadata-derived hosts (the row's
allowlist, Q3) should govern it; the transport is the only thing that differs, and the location
already says which one it needs.

| Option | You get | It costs |
|---|---|---|
| **A. Per-location dispatch: a git location form on `Request`, routed to `git` on an `https` row under that row's allowlist, bound and cool-down** | One remote per Terraform registry; the git hosts the operator admits are visible on the same row as the artifact hosts; no credential ever reaches a git host; a remote over a git origin stays impossible | A third location form in `Request` (the AC4 pin changes with it) and a dispatch branch in the `Router`; `proxy-cache.md`'s fetch-and-cache request gains the same form (reported) |
| **B. A second `Upstream` per git host, named from the remote** | No location form | Unknowable in advance: every module author's host needs a row before the first `init`; two allowlists to keep equal; the remote-to-upstream relation becomes one-to-many, which `data-model.md` does not model |
| **C. A row naming `git` as its adapter, one remote per git host, aggregated by a `virtual`** | Reuses per-row selection | A module location on an unconfigured host fails outright; a virtual per Terraform registry; and a row over a git origin is the materialisation route `go-modules.md` and `cargo.md` rejected |

**Why this is yours:** it widens the `Request` shape this spec pins and decides that git hosts are
admitted per upstream by the operator rather than per git host.

Accepted cost: the third location form and its dispatch branch, and the operator listing each git
host a proxied Terraform registry's modules use (a module on an unlisted host is passed through
verbatim and recorded as uncached, `terraform.md`'s rule).

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-27 | d9510af | authoring pass: grounded first draft, not a review | Not a review. Gathered the requirements of 27 citing format specs from their "what this format requires of `upstream-adapters.md`" sections, `format-handler-interface.md`'s resolved adapter-axis record and its 2026-09-25 ownership note, `proxy-cache.md`'s Design and resolved records, `data-model.md`'s `Upstream` entity, `management-api.md`'s repository administration and AC21, `conformance-harness.md`'s upstream bindings, `project-charter.md`'s step 4, and `agents/spec-loop/consequences.md` (Open items 7, 11, 13 and every line naming this file; themes 2 and 7; the `artifact-verification.md` and `signing-service.md` requirements on `proxy-cache.md`). Grounded prior art in Harbor's adapter, model and ECR/GCR/native sources, the distribution token-auth specification, Docker Hub's pull-limit page, the ECR `GetAuthorizationToken` reference, the GCE metadata-server and Artifact Registry authentication pages, GitHub's rate-limit page, Pulp's `Remote` model and zot's sync example, all fetched this run; Nexus and Artifactory pages did not render and no claim about them is made. Fixed the design: two transport adapters plus a credential-kind axis, a one-method interface pin, an `Upstream`-held off-origin allowlist with per-host credential roles enforced at connect time, typed rate-limit errors with a capped cool-down, truthful body completion as the adapter's half of the completion-only mode, a redactor covering every credential shape, compile-time preconfigured profiles held equal to `proxy-cache.md`'s set by test, and the adapter half of the nightly job with an explicit unfunded-row table. Stated the adapter-versus-proxy-cache split as a table. Seven questions written in decision shape and adopted under the standing delegation; zero open. 29 criteria, each with a Test Plan row and a named enforcer for every boundary rule. `node scripts/check-spec.js` run against this file with zero failures; the unasserted-duty advisories acted on. |
| 2026-09-28 | 9ebf6e9 | cross-spec reconciliation of the foundation authoring wave. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` targeting this file verified against the source spec's current text before applying. From `repository-lifecycle.md` (authoring item 13; its AC20, AC25): a new Design section "Lifecycle of an upstream binding" - deleting a credential an `Upstream` or `ReplicationLink` references is refused `409` `in-use`, changing a `remote`'s upstream keeps every cached reference and resets `RemoteFile.last-checked`, and the adapter's half is per-fetch resolution of the row and its credential with realm-keyed tokens and no carried cool-down; AC30 added with rows shared with that spec and `management-api.md` AC21. From `observability.md` (item 7): `traceparent` and `tracestate` on the forbidden outbound set with the transport built without the propagating round-tripper (AC4 extended, its AC20 row shared); `telemetry.MarkSecret` before every credential use and the redactor's parameter list held equal to `telemetry.RedactURL`'s (AC20 extended); the six `upstream_*` series and the `UpstreamRateLimitLow` and `UpstreamCooldown` alerts by their catalogue names (AC31 added). From `deployment.md` (item 5): a "Configuration keys" section tabling `upstream.default_concurrency`, `upstream.default_cooldown_cap` and `upstream.connect_timeout` in the three-column shape `scripts/check-config-keys.js` parses, the `User-Agent` computed from `server.public_url` and stated as not a key (AC5, AC32 added), the row-level `limits` falling back to the instance defaults. From the `management-api.md` reconciliation (item 6): `upstream-invalid` is 422 (AC23, "Configuration-time validation"). From the `data-model.md` reconciliation (item 3): "Configuration on the `Upstream` row" and the credential store cite "Upstream configuration and upstream credentials" and AC40 instead of a consequence. From the `proxy-cache.md` reconciliation (item 5): the nuget and maven rows are shipped under its resolved second extension (was Q17), the split table cites its AC20 and AC22, Phase 3 follows. The charter's step citations and `auth.md` AC10's review surface cited as applied. Already done at authoring: every Open item and format line naming this file; the format specs' "to be authored" wording (authoring item 12) is still queued on their side. 32 criteria, each with a Test Plan row; `node scripts/check-spec.js` on this file: zero failures. Stays draft pending a gate review. |
| 2026-09-28 | 3135d95 | closing reconciliation sweep on Opus: cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` targeting this file from "From format batch 3 reconciliation" through the latest section, plus earlier items the progress log did not show applied, verified against the current text of the spec that raised it (`cargo.md`, `conan.md`, `terraform.md`, `oci.md`). Applied: format batch 3 item 11 (a Cargo row in "The requirements, gathered": `https://` sparse root, the `dl` host on the allowlist with role `none`, the `header` kind with header `Authorization` for a private sparse upstream; the crates.io recipe under "Preconfigured profiles"); format batch 4 item 10 as **Q8, adopted under the standing delegation**: a `basic-exchange` kind (Basic `GET` at a stored exchange path, `text/plain` token presented as Bearer to the root and its `root` entries, one re-exchange on a fresh `401`), with the `bearer`-only option rejected as a deferral for effort; folded through Scope, the kinds table, the ConanCenter recipe line, AC33 and Phase 3; format batch 5 item 6 as **Q9, adopted**: `Request` carries a git location `{url, commit}` the `Router` sends to the `git` adapter on an `https` row under that row's allowlist, bound and cool-down, presenting no credential, refused on a `distribution` row, and a row naming `git` refused at configuration; folded through Scope, "Selecting an adapter", "The interface", "Credential kinds", AC23, AC34 and Phase 4; format batch 1 item 10 (the Docker Hub CDN hosts are captured at `oci.md`'s Phase 4, its proxied phase, in the profile row, AC24 and Phase 1). Found already done: management-api reconciliation 6 (`upstream-invalid` 422), proxy-cache reconciliation 5, repository-lifecycle authoring items 12 and 13. New consequences reported: `conan.md` (the Conan-shaped kind now exists, its proxied path and Phase 4 can cite was-Q8 and AC33), `terraform.md` (the gap is closed by was-Q9 and AC34), `management-api.md` (the upstream-credential kind list gains `basic-exchange`), `auth.md` (AC10's review list of upstream kinds gains the Conan-shaped exchange), `proxy-cache.md` and `format-handler-interface.md` (the fetch-and-cache location gains the git form). 34 criteria, each with a Test Plan row; `fable_recheck` extended; `node scripts/check-spec.js` zero failures on this file. Stays draft. |
