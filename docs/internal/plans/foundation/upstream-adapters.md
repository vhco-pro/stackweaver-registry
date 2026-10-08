---
status: planned
status_description: "Round-2 Fable follow-up 2026-10-08 at e50e8b5, stays planned: the three items queued since the last follow-up applied and verified against their sources, one of them a design change adopted as Q11 under the standing delegation and owner-facing (the git adapter emits one deterministic gzip-compressed tar, the tree's own order and modes with zero owner and times and a fixed gzip header, committed as fetched and served by terraform at a .tar.gz location with the committed blob's digest as the checksum, since fetch-and-cache never replaces bytes and the was-Q9 clause that had the handler re-pack it is withdrawn; AC28 and AC34 amended, a stream_test.go row added); the method on Request is the proxy layer's and never a client's, HEAD only for a declared revalidation probe (proxy-cache was-Q24, AC32), AC14's row shared with head_test.go; conformance-harness's upstreams row and AC19 cited as allow_local's consumer; none declined; three sibling consequences reported. Earlier: Fable follow-up 2026-10-01 at 4877448, still planned: the three items queued since the recheck applied and verified against their sources (HostNotAllowedError as the one type for all four connection rules, with a Rule field, named on AC7 and AC35 and excluded for a git location's grammar refusals on AC34; the upstream label and server_address on observability's client histogram both capped under name_label_limit, the histogram emitted by this package's decorated transport and outside AC31's six; data-model AC40 cited for allow_http and allow_local), none declined, no question raised, two optional sibling consequences reported. Earlier: Planned by the Fable recheck of 2026-10-01 at 7ffbd14: a full review pass over the cloud-authored whole (claim verification of every sibling citation at HEAD, the adversarial lens on the SSRF surface at full strength, go-spec-reviewer inline, constitution compliance) plus the re-examination of the nine questions adopted without Fable. Q1, Q4, Q6, Q7 confirmed; Q2 confirmed and amended (Validate takes model.Upstream); Q3 amended (the scheme rule, the path-joining rule and no credential over plain HTTP beside the host allowlist; allow_http refuses a credential at configuration); Q5 amended (Docker Hub's ratelimit-remaining: 0 starts no cool-down since it states no reset time; cool-down and concurrency are per process); Q8 and Q9 confirmed with their folds amended (bounded, rotation-keyed token cache and a path-rule exchange path; the git URL grammar, redirects through this package's client, no submodules, size bound during transfer). Q10 adopted on Fable under the standing delegation: loopback, link-local and unspecified destinations refused at dial time with a per-row allow_local for stand-ins (AC35). The egress boundary made module-wide with the egress inventory as its exclusion list (AC3); every exchanged token cache invalidated by rotation (AC30); the RubyGems row applied (Range revalidation, Repr-Digest and Content-Range verbatim, 416 as RangeNotSatisfiable). 35 criteria, each with a Test Plan row; zero open questions; fable_recheck cleared. Sibling consequences reported for data-model, observability, proxy-cache, conformance-harness, rubygems, terraform and conan. Earlier: closing reconciliation sweep 2026-09-28 at 3135d95 on Opus (Q8 basic-exchange, Q9 per-location git dispatch, the Cargo row and recipes, the Docker Hub CDN hosts at oci.md's Phase 4); reconciled 2026-09-28 at 9ebf6e9 with the foundation authoring wave (AC30 to AC32, the traceparent and MarkSecret rules, the upstream_* series, the upstream.* keys); authored 2026-09-27 at d9510af as a grounded first draft gathering the upstream requirements of 27 format specs with seven questions adopted under the standing delegation."
description: "Spec for the upstream adapter axis: the seam between the proxy cache and every upstream it fetches from. Two transport adapters (a plain HTTPS adapter and an OCI distribution adapter) behind one small interface, a separate credential-kind axis (none, Basic, Bearer, vendor header, path token, Conan-shaped Basic exchange, distribution token exchange, AWS ECR, Google Cloud), a per-upstream off-origin host allowlist with per-host credential roles plus the scheme, path-joining and local-address rules the host check alone leaves open, redirect following that never reaches a client, typed rate-limit errors with a bounded cool-down, truthful body completion for the completion-only fetch mode, and credential redaction; with the preconfigured upstream profiles and the adapter half of the nightly real-upstream job."
author: michielvha
goal: "Make every upstream a configuration row rather than a code change: one OCI handler serves Docker Hub, ECR, GCR, GHCR, Quay, Artifactory and Nexus because authentication, redirects, rate limits and transport quirks live behind one adapter seam that no handler and no proxy-core code can bypass, so that format N+1 adds an upstream profile and never an HTTP client."
priority: "critical"
issue: 48
created: 2026-09-27
covers:
  - "internal/upstream/**"
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
  git-location decision, was Q9), and it delivers the tree in the form the registry commits and
  serves, one deterministic gzip-compressed tar, because nothing downstream may re-pack it (the
  resolved stream-form decision, was Q11).
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
  an operator overrides it, with no credential ever attached over plain HTTP.
- The three connection rules the host allowlist does not cover: the scheme of every target, a
  path location's inability to leave the root, and refusal of loopback, link-local and
  unspecified destinations unless a row opts in for a stand-in (the resolved local-address
  decision, was Q10).
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
  commit-pinned tree for Terraform, packages it and synthesises no metadata, and a row naming `git` as its adapter
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
| `observability.md` metric and alert catalogue (its AC5, AC6, AC18, AC20) | Per-upstream request counters, in-flight and rate-limit gauges, cool-down state, token-exchange failures; `UpstreamRateLimitLow` and `UpstreamCooldown`; `upstream` and `server_address` (on its client histogram, emitted through this package's transport) configuration-bounded under `name_label_limit`; no `traceparent` or `tracestate` upstream; `MarkSecret` on every attached credential; the redaction list equal to `telemetry.RedactURL`'s | "Rate limits and the cool-down", "Timeouts, concurrency and completion", "Request hygiene", "Redaction", AC4, AC20, AC31 |
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
| `terraform.md` (item 18; format batch 5 item 6, its AC18; its Fable recheck of 2026-10-08, the amended was-Q4 there) | Artifact-host allowlist; both download-location forms; commit-pinned VCS fetch, collision-detecting SHA-1, size bound, no credential; how an `https` remote hands a commit-pinned module location to the `git` adapter under the same allowlist; the fetched tree delivered as the gzip-compressed tar the registry commits as fetched and serves at a `.tar.gz` location, since fetch-and-cache never replaces bytes and the re-pack is the hosted path's alone | AC7, AC28, AC34 ("Selecting an adapter", the resolved git-location decision, was Q9, and the resolved stream-form decision, was Q11); location forms are the handler's |
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
| `rubygems.md` "The upstream binding" and its proxied path (rubygems authoring item 9) | An `https://` root (`https://index.rubygems.org/` as the recipe, no off-origin host: every route answers `200` from that host, captured); the `basic` kind for a private gem server, root only; `/versions` revalidated by `Range: bytes={N-1}-` with `If-None-Match`, the `206` or `200` reported as such and the upstream `Repr-Digest` returned verbatim for the handler's check | AC6, AC14, AC15, AC19, AC22; the recipe line under "Preconfigured profiles" |
| `agents/spec-loop/foundation.tsv` hint | Credential types incl. ECR `GetAuthorizationToken` and GCR metadata-server tokens; Docker Hub pull limits; conformance against real upstreams on the nightly job | AC17, AC18, AC9, AC25, AC26 |

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
  rate limit". Consequence: the revalidation probe the OCI handler declares on its tag fetch,
  which the proxy layer sends as the one `HEAD` it ever sends (`proxy-cache.md`, "`HEAD` on a
  proxied route", AC32), is a version check and costs no pull, which the adapter enables by
  surfacing `Docker-Content-Digest` on a `HEAD`.
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
| Building the outbound request | URL, the method the layer set, headers, credential, conditional headers, `Range`, `Accept-Encoding`, `User-Agent` | Supplies the method (`GET`; `HEAD` only for a declared revalidation probe, its AC32; `POST` for a forwarded body), validators and range from the cache record; never the inbound client's method |
| Redirects | Followed inside, bounded, allowlisted, credential per role; no `Location` returned | Never sees one |
| Off-origin hosts | The allowlist and its enforcement before any connection | Passes the location the handler derived |
| Rate limits | Interpretation into `RateLimitError{RetryAfter}`; the per-upstream cool-down | Never negatively caches one, never renders one as not-found (its AC9); serves stale metadata meanwhile (its AC12) |
| Timeouts | Connect timeout; stall detection on the body reader | The stall value as coalescing policy; waiter semantics (its AC11, AC17) |
| Completion | The body reader ends with `ErrTruncated` on a short or unterminated body, never a clean EOF | Commits nothing on error (its AC10); the completion-only mode and its verifier hook run after a clean end (its resolved completion-only decision, was Q15, and its AC20) |
| Declared digest and validators | Surfaced verbatim from headers (`Docker-Content-Digest`, `ETag`, `Last-Modified`, `Content-Length`) | Decides what to verify against (the handler's declared digest first), what to store, what freshness to serve; the cache-scoped forward-moving `Last-Modified` and never adopting an older revision (its AC22) |
| Encoding | Identity by default; opt-in per request; never transparently decompresses; the `git` adapter's gzip is content, not a `Content-Encoding` | Stores what arrived |
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
  (`terraform.md`'s resolved VCS-source decision), and delivers it as one deterministic
  gzip-compressed tar, the form the registry commits as fetched and serves (the resolved
  stream-form decision, was Q11). It is an adapter because its transport is not
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
`terraform.md`'s no-credential rule). The location's grammar is checked before that: the URL is
`https://` with a host, an optional port and a path, and nothing else; a URL carrying userinfo (a
module author's `git::https://token@host/...` is a credential from metadata, the thing this seam
exists to refuse), a query string, a fragment or another scheme is refused before any connection,
and the commit is exactly 40 hexadecimal digits (Fable recheck 2026-10-01). The fetch is a
single-commit smart-HTTP fetch of that id, no tags, no submodules (a `.gitmodules` file arrives as
an ordinary file; a submodule's host is a second fetch the operator never admitted), made through
the package's own client, so a redirect the git server answers passes the same allowlist check as
any other hop with no credential, and a server that refuses a want by commit id (the smart
protocol lets a server allow only advertised refs) fails with a named error rather than a fallback
to a ref name. The size bound is applied to the packfile as it arrives and the fetch aborts on
exceeding it, so no oversize tree is ever held whole. The response body is the commit's tree as
**one gzip-compressed tar stream**, in the form the registry commits as fetched and serves (the
resolved stream-form decision, was Q11, adopted on the Fable follow-up of 2026-10-08): the
entries in the tree's own depth-first order, each tree's entries as git orders them, directories
as directory entries, file modes `0644` or `0755` from the blob's git mode, symbolic links as link
entries and never resolved, a gitlink entry (mode `160000`, a submodule's pointer) omitted since
its tree is the second fetch this adapter never makes, owner, group and every timestamp zero,
one fixed tar format, and one gzip member with a zero modification time, no name, a fixed OS
byte and a fixed compression level. The order and the modes are the commit's own, so no format's
sorting rule is imported into this package, and two fetches of one commit under one build of
the registry are byte-identical, so a re-fetch after eviction commits the same blob; the
digest's stability across a change of Go's gzip encoder is not promised, and `terraform.md`
serves the committed blob's own digest as the `checksum` (its AC18), so nothing compares the
two. The gzip is the content, not a transfer encoding: the `Response` reports
`Content-Type: application/gzip`, no `Content-Encoding` and no `Content-Length` (the stream is
produced as it is written), and its end is the adapter's own, so under the truthful-completion
rule a clean `io.EOF` means the whole tree was written and a local failure surfaces as an error,
never as a short clean body (`ErrTruncated` and `ErrStalled` cover the smart-HTTP transfer that
precedes it). Nothing downstream re-packs it: `proxy-cache.md`'s fetch-and-cache commits the
bytes it fetched and its verifier hook may refuse a commit but never replace it ("Completion-only
mode and the verifier hook"), no handler writes a derived blob on a remote, and `terraform.md`
serves the committed blob at a `.tar.gz` location with the blob's digest as the `checksum` (its
resolved VCS-source decision, was Q4, as amended on its Fable recheck of 2026-10-08; its AC18),
the canonical re-pack being its hosted path's alone. A git location
on a `distribution` row, and any `Upstream` row naming `git` as its own adapter, is refused (the
second at configuration, AC23), so the `git` transport is reachable only as a location of an
`https` remote and never as a way to build a remote over a git origin (AC34).

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
Validator  Validate(ctx, model.Upstream) error           optional, type-asserted at configuration
```

That is the whole pin (AC2). The row type is `data-model.md`'s, `model.Upstream`, so nothing in
this package stutters as `upstream.Upstream` (the `go` skill's naming rule; Fable recheck
2026-10-01). `Request` carries: the upstream (its row, resolved credential
handle, allowlist, limits); the method (`GET`, `HEAD`, `POST`), set by the proxy layer and never
taken from a client: `GET` for every fetch-and-cache, `HEAD` only for the revalidation probe a
handler declares on a mutable document's fetch-and-cache request, at TTL revalidation
(`proxy-cache.md`, "`HEAD` on a proxied route", its resolved HEAD decision, was Q24, AC32), and
`POST` for a forwarded body; the inbound method is not part of the fetch-and-cache request, so a
client's `HEAD` is answered from the cache as the `GET` with the body withheld and never reaches
this seam (Fable follow-up 2026-10-08); the location, either a path under
the upstream root, an absolute URL the handler took from upstream metadata (which the allowlist
must admit), or a git location `{url, commit}` the `Router` sends to the `git` adapter ("How a
location reaches the `git` adapter" above); the `Options` the handler set through fetch-and-cache: `Accept`, `Accept-Encoding`
opt-in, a `User-Agent` override, a `Range`, and the request body for a forwarded `POST`; and the
conditional validators the proxy holds (`ETag`, `Last-Modified`). It has no `*http.Request`, no
`http.Header` and no field that could carry an inbound header wholesale (AC4): the outbound
request is constructed from these fields and nothing else.

`Response` carries: a status class (`OK`, `NotModified`, `PartialContent`,
`RangeNotSatisfiable`, `NotFound`, `Gone`, `Refused`, `UpstreamError`), the numeric status for
logging, the body as an `io.ReadCloser` whose `Read` returns `ErrTruncated` when the body ends
before its declared length or before the chunked terminator and `ErrStalled` when no byte arrives
for the stall period, the declared `Content-Length` when present, the upstream's `ETag`,
`Last-Modified`, `Docker-Content-Digest`, `Repr-Digest` and `Content-Range` verbatim (the last
two are what `rubygems.md`'s ranged `/versions` revalidation checks a tail against; `hackage.md`'s
index splice reads the second), the content type, and the requested location as provenance. Rate
limits are not a status
class: they are the typed error `*RateLimitError{RetryAfter time.Time, Source string}` returned
from `Fetch`, because callers branch on them with `errors.As` and must never mistake one for a
body (AC9). Every refusal the adapter makes before a connection under the four connection rules
is one type, `*HostNotAllowedError{Host, Rule}`: a host outside the allowlist, a scheme the row
does not admit, a path location that would leave the root, and a loopback, link-local or
unspecified destination (AC7, AC35), plus a `token-exchange` realm the stored pair may not be
presented to (AC16); `Rule` names which of them refused it, so the handler's rendering
(Composer's `502` naming the host) and `proxy-cache.md`'s candidate loop branch on one type by
`errors.As` (its "The adapter seam": the next candidate is tried and no negative entry is ever
written, since nothing about the coordinate was learned). A git location's grammar refusals
(AC34) are not of this type: they decide nothing about a host and fail with their own named
error before any connection, as AC28 does for a refused want. Errors are wrapped with a gerund
phrase and no prefix (`CLAUDE.md`, Go rules):
`fmt.Errorf("fetching %s from %s: %w", redact(loc), upstream.Name, err)`.

The `Router` in `internal/upstream` is what the proxy layer holds: given a `remote` repository it
loads the `Upstream` row, resolves the credential handle from the store, selects the adapter from
the registry (the row's adapter, or `git` for a git location on an `https` row), applies the per-upstream concurrency bound and cool-down state, and calls `Fetch`.
It is a concrete struct; the proxy layer's `Fetcher` interface is satisfied by `*Router`.

Ownership and shutdown, stated so the `go` skill's concurrency rule holds by construction: no
goroutine this package starts outlives the `Fetch` call that started it. A credential kind's
refresh is lazy, performed on the next `Fetch` that finds its cached material expired, never by
a background ticker; the stall detector is a timer armed per `Read` that cancels the request's
context when it fires (which is how `ErrStalled` surfaces from a body Go's client is blocked on),
disarmed by the next byte and by `Close`; the concurrency semaphore and the cool-down table are
plain in-memory state of the `Router`, per process, so a fleet of N replicas holds N bounds and
learns a rate limit N times, an accepted cost recorded under the resolved cool-down decision
(was Q5) rather than a shared table that would make the queue a dependency of every fetch. A
restart clears both, which is the right answer for a bound and a harmless one for a cool-down
(the next request learns the limit again).

### Configuration on the `Upstream` row

What `data-model.md`'s `Upstream` entity carries for this spec, core-parsed and never inside a
metadata document (its "Upstream configuration and upstream credentials", AC40; none of it is a
mark root):

- `adapter`: the registered name; default `https`.
- `url`: the root. `https://` required; `http://` refused at configuration unless `allow_http` is
  set (AC22), because `alpine.md`, `arch.md` and `rpm.md` each captured live mirrors that answer
  plain HTTP and each asked for the refusal.
- `allow_http`: admits an `http://` root and `http://` redirect targets on allowlisted hosts. It
  never admits a credential over plain HTTP: a row setting it with a credential reference, or an
  `own` entry, is refused at configuration (AC23), because a credential on a cleartext connection
  is the dnf 4 capture `rpm.md` made, and the adapter attaches no credential to a plain-HTTP
  connection whatever the row says (AC6). Named in the startup log like `insecure_skip_verify`.
- `allow_local`: admits connections to loopback, link-local and unspecified destination addresses
  for this upstream's fetches, which are otherwise refused before any connection (the resolved
  local-address decision, was Q10, AC35). Set only for a stand-in on the loopback interface, never
  for a real upstream; named in the startup log. `data-model.md`'s row carries both, core-parsed
  and absent unless set explicitly (its entity table, "Upstream configuration and upstream
  credentials", AC40, whose Test Plan row shares `internal/upstream/validate_test.go` with AC22
  and AC23 here). The harness is the flag's consumer: `conformance-harness.md`'s `upstreams` row
  and its "Upstream bindings" have the seed path set `allow_local` on the row it writes for a
  stand-in bound on a loopback address and never on a row bound to the case network or to the
  real service, so the nightly run carries no exemption into a real upstream row, observed in
  the startup log (its AC19).
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

Every exchanged or fetched token (`basic-exchange`, `token-exchange`, `aws-ecr`, `gcp`) is
cached in memory only and keyed by the credential record's identity **and its `rotated_at`**,
so a rotation (`management-api.md` AC21) makes the next fetch exchange afresh under the new
material rather than present a token minted under the old, which is what AC30's "the next fetch
carries the new value" has to mean for an exchanging kind (Fable recheck 2026-10-01). A cached
token is held no longer than the shorter of what its issuer said and one hour, except `aws-ecr`'s
twelve-hour token, whose cap is its own row's; an issuer's `expires_in` of a year is a bug at
the issuer, not a licence to keep a token that long. A token body is read under a bound (4 KiB)
and must be printable ASCII, so an upstream cannot make the registry hold or send an arbitrary
blob as a header.

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
`encoding/json` and one `POST`; its ambient source dials the metadata server's link-local
address through the kind's own client, which is not a location fetch and so is outside the
address rule below. `git` uses go-git with its collision-detecting SHA-1, confined to
`internal/upstream/git`, installed over this package's HTTP client so its redirects and dials
obey the same rules as every other exchange, and the standard library's `archive/tar` and
`compress/gzip` for the stream it emits. Host normalisation uses `golang.org/x/net/idna` for
the A-label form (the standard library's copy is vendored and not importable). Everything else is
the standard library.

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

Three rules the Fable recheck of 2026-10-01 added, because the host check alone left the
classic server-side request forgery shapes open (the resolved allowlist decision, was Q3, as
amended, and the resolved local-address decision, was Q10):

- **The scheme is part of the check.** A location or redirect target is `https://`; an
  `http://` one is refused before any connection unless the row sets `allow_http`, and even then
  no credential is attached to a plain-HTTP connection (AC6, AC7). A downgrade redirect from an
  HTTPS root to `http://` on the same host is therefore refused on an ordinary row, which is the
  hop that would have sent the credential in clear.
- **A path location cannot leave the root.** A path is joined to the root by segment append
  after normalisation, never by URL resolution: a path whose normalised form carries a dot
  segment that would climb out of the root's path, begins with `//` (a scheme-relative host), or
  carries a scheme, is refused before any connection (AC7), and the joined URL's host is the
  root's by construction, never re-parsed from the path. A handler passing an absolute URL takes
  the allowlist route instead. The same rule joins `basic-exchange`'s stored exchange path.
- **A loopback, link-local or unspecified destination is refused** for every location fetch on
  every adapter, checked on a literal IP in the host before any connection and on each resolved
  address at dial time for a direct dial (under an egress proxy the proxy's own policy governs
  where it connects, and only the literal check applies), unless the row sets `allow_local`,
  which a stand-in on the loopback interface needs and a real upstream never does (AC35). This
  is what closes the case the host check cannot: an allowlisted name whose DNS an attacker
  controls resolving to `169.254.169.254`, the instance metadata address that answers plain
  `GET`s with cloud credentials on exactly the deployments the `aws-ecr` and `gcp` kinds exist
  for. On an ordinary row the scheme rule already stops it, since the metadata service speaks no
  TLS; the address rule is what makes `allow_http` and `insecure_skip_verify` rows safe too.

All four rules (the allowlist, the scheme, the path and the address) refuse with the one
`*HostNotAllowedError`, its `Rule` field naming which ("The interface"), so a caller that
already handles an off-allowlist host handles the three rules added since without a new branch,
and `proxy-cache.md`'s candidate loop reads them as one refusal class (Fable follow-up
2026-10-01, AC7, AC35).

### Redirects

Followed inside the adapter, up to ten hops (Vagrant's own limit, `vagrant.md`), across `301`,
`302`, `303`, `307` and `308`, for `GET` and `HEAD` only; a redirect answered to a forwarded
`POST` is an error, never a replay (AC27). Each hop passes the allowlist check above, and the
credential is recomputed per hop from the target host's role, so a `307` from `ghcr.io` to
`pkg-containers.githubusercontent.com` carries no `Authorization` unless that host is entered
with a role (homebrew's capture), and a `302` from `api.github.com` to `codeload.github.com`
carries the `own` credential of the first and the `none` of the second (composer's capture).
Recomputed means exactly that: Go's client copies the initial request's headers onto each hop,
so `CheckRedirect` first removes every credential-bearing header and the path token from the
hop, then attaches what the target host's role says, which is nothing for `none`; the adapter
never relies on the client's own cross-domain stripping, whose rule (same domain or a subdomain)
is not this spec's.

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
- A `2xx` carrying `x-ratelimit-remaining: 0` **with** `x-ratelimit-reset` (GitHub): the response
  is returned as-is (it is the last permitted request) and the upstream enters cool-down until
  the reset time, since the provider stated when the budget returns and the next request would
  be a `403` that counts against its secondary limits.
- A `2xx` carrying `ratelimit-remaining: 0` (Docker Hub) is returned as-is and enters **no**
  cool-down: `ratelimit-limit: 100;w=21600` names the window's length, not when it ends, so a
  pre-emptive cool-down here would be a guess taking the upstream offline for up to the cap after
  a successful pull. The gauge falls to zero and `UpstreamRateLimitLow` fires; the next request,
  if refused, is a `429` and takes the first rule. (Amended on the Fable recheck of 2026-10-01;
  the authoring text cooled down on both headers.)
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
coalescing (one fetch per cold-starting fleet) and the revalidation probe the OCI handler
declares on its tag fetch, which that layer sends as a `HEAD` at TTL revalidation (its AC32) and
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
That name is operator-chosen and bound one-to-one to a `remote`, so it discloses on the
telemetry listener as a repository name does, and it is a configuration-bounded label under
`telemetry.metrics.name_label_limit` (`observability.md`, "Cardinality", "The telemetry
listener"): past the cap every further upstream folds into `_other` on all six series, and a
cap of `0` collapses every one, which is the opt-out for an operator whose scrape path is less
trusted than their admin. One more series rides this package's transport without being this
package's: `http_client_request_duration_seconds`, `observability.md`'s client histogram, is
emitted by the instrumenting round-tripper the transport constructor installs ("Timeouts,
concurrency and completion") and carries `upstream` beside `server_address`, the host the
socket opened to (the root, an allowlisted off-origin host, a realm host, or a credential
kind's own endpoint, the metadata server or the ECR endpoint), which is operator configuration
or a fixed provider endpoint and never a client's or content's choice; `server_address` is
capped under the same `name_label_limit`, and a cap of `0` collapses both, since each names
where the registry fetches from (its catalogue row, AC5). AC31's "exactly" therefore counts
what this package registers, the six series above; the histogram is counted in that spec's
catalogue (Fable follow-up 2026-10-01).

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

- **Transports**: one `http.Transport` per `Upstream` row, because TLS trust is per row (a CA
  bundle, a client certificate, `insecure_skip_verify`, `http2`) and a transport carries one TLS
  configuration; every one of them is built by a single constructor in this package that sets
  `Proxy: http.ProxyFromEnvironment`, `DisableCompression`, the dialer below and the address rule,
  and wraps the result in `observability.md`'s instrumenting round-tripper (the client span and
  `http_client_request_duration_seconds`, with `upstream` the configured name and
  `server_address` the connect host; it adds no request header) and never the propagating one
  ("Request hygiene"), so no transport can differ in anything but the row's TLS fields. The
  credential kinds' own clients (the realm, the metadata server, the ECR endpoint) carry the
  same decoration. `Router` rebuilds a row's transport when its TLS fields change and closes
  the old one's idle connections.
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
in every transport this package's constructor builds, Scope; the same process environment
`internal/trustsource` and every other egress package honours, `deployment.md`'s "Not keys, on
purpose"), so neither can diverge per upstream. The stall period
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
`allow_http`; `allow_http` together with a credential reference or an `own` entry (no credential
over cleartext); a credential kind the adapter does not accept; an allowlist entry with a bare
wildcard or an `own` role naming no credential; a `basic-exchange` exchange path that the path
rule would refuse; `insecure_skip_verify` without the explicit flag.
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
`Authorization`), ConanCenter (two operator-configured `https` remotes, `center2.conan.io` and
`center.conan.io`, credential `none`; a private Conan upstream takes `basic-exchange` or `bearer`),
and rubygems.org (`rubygems.md`'s resolved preconfigured-upstream decision, was its Q10, keeps it
operator configured: root `https://index.rubygems.org/`, credential `none`, an empty allowlist
because every route answers from that host; a private gem server takes `basic`, root only).

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

- **Egress boundary** (AC3): a `forbidigo` rule in `.golangci.yml` over the whole module
  (`internal/**`, `cmd/**`), forbidding construction or use of `http.Client`, `http.Transport`,
  `http.Get`, `http.Post`, `http.Head`, `http.DefaultClient`, `net.Dial`, `net.Dialer` and
  `tls.Dial`, with a violation fixture behind the `lintfixture` build tag and a test invoking the
  pinned golangci-lint that fails unless the rule fires (the pattern `format-handler-interface.md`
  AC6 established). The rule's exclusion list is the module's inventory of egress, one line per
  package with the spec that owns it: `internal/upstream/**` (this spec, the only egress on the
  proxied path), `internal/storage` (the object-store client), `internal/auth` (the OIDC client,
  which `credential-management.md`'s exchange also uses and which makes no request for an issuer
  no trust policy names), `internal/trustsource` (`artifact-verification.md`'s keyserver import,
  TUF updater and revocation refresh, kept out of `internal/verify`), `internal/policy` (the
  advisory feed sync), `internal/replication` (the follower's requests to its leader),
  `internal/signing/kms` (the KMS providers) and `internal/telemetry` (the OTLP exporter). A new
  package wanting egress must edit the rule and the diff shows it; the earlier text scoped the
  rule to two packages and then spoke of exclusions it could not have, corrected on the Fable
  recheck of 2026-10-01.
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
- [ ] AC3: No package in the module outside the egress inventory (`internal/upstream/**`,
      `internal/storage`, `internal/auth`, `internal/trustsource`, `internal/policy`,
      `internal/replication`, `internal/signing/kms`, `internal/telemetry`) constructs or uses an
      HTTP client, transport or dialer: the module-wide `forbidigo` rule fires on a violation
      fixture behind the `lintfixture` build tag under `internal/proxy` and under
      `internal/format`, proven by a test running the pinned golangci-lint against it, and the
      test asserts the exclusion list equals that inventory, so an added package fails it.
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
      the root's URL and never into hostB's, hostC's or hostD's; and on a row with `allow_http`
      and a `none` credential, an `http://` hop to an allowlisted host carries no credential
      header of any kind, while an `http://` hop on a row without `allow_http` is refused before
      any connection.
- [ ] AC7: A fetch or redirect to a host absent from the upstream's allowlist makes no connection
      (a stand-in on that host fails the test on any accepted socket) and returns
      `HostNotAllowedError` naming the host and the rule, which the handler renders (Composer's
      `502` naming the host); an operator-created upstream has an empty allowlist by default; a
      bare wildcard entry is refused at configuration; matching is on the connect target after
      normalisation and never on `Host` or `X-Forwarded-Host`; a path location that would leave
      the root (a climbing dot segment, a leading `//`, a scheme) is refused before any
      connection and a joined URL's host is always the root's; a redirect target with a scheme
      other than `https` is refused before any connection on a row without `allow_http`; and the
      scheme and path refusals are the same `HostNotAllowedError` type as the allowlist's, each
      naming its rule, so `errors.As` on that one type catches every pre-connection refusal.
- [ ] AC8: Redirects `301`, `302`, `303`, `307` and `308` are followed inside the adapter up to
      ten hops for `GET` and `HEAD`; the client response carries no `Location` and no upstream
      URL; the eleventh hop fails; a presigned redirect target (query carrying `X-Amz-Expires` or
      `access_token`) is never recorded as provenance or cached as a resolution, the requested
      location is, and a second fetch re-follows the chain, proven against a stand-in whose
      presigned target changes between fetches.
- [ ] AC9: `429` with `Retry-After` (seconds and HTTP-date), `429` without, and a `403` carrying
      `x-ratelimit-remaining: 0` and `x-ratelimit-reset` each yield `RateLimitError` with the
      correct retry time; a `2xx` carrying `x-ratelimit-remaining: 0` and `x-ratelimit-reset` is
      returned with its body and starts a cool-down until the reset time; a `2xx` carrying
      `ratelimit-remaining: 0` with `ratelimit-limit: 100;w=21600` is returned with its body,
      moves `upstream_rate_limit_remaining` to zero and starts no cool-down; a `403` without
      those headers yields `Refused`; nothing here is ever `NotFound`; `proxy-cache.md` AC9
      consumes the error type by `errors.As`.
- [ ] AC10: After a `RateLimitError`, every request to that upstream for the retry period fails
      immediately with the same error and zero requests reach the upstream (network layer); the
      period is capped at `limits.cooldown_cap` however large the upstream's `Retry-After`; a
      `5xx`, a connection failure and Docker Hub's `ratelimit-remaining: 0` trigger no cool-down;
      requests resume at the retry time; the state is per process, so a second `Router` in the
      same test learns the limit on its own first request.
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
- [ ] AC14: `ETag`, `Last-Modified`, `Content-Length`, `Content-Type`, `Content-Range`,
      `Repr-Digest` and `Docker-Content-Digest` are returned verbatim on `GET` and on `HEAD`,
      the `HEAD` being the one the proxy layer sends for a declared revalidation probe and never
      a forwarded client method (`proxy-cache.md` AC32), including a `Last-Modified` earlier
      than the validator sent, so the cache layer, not the adapter, decides adoption.
- [ ] AC15: With an `ETag` held, the request carries `If-None-Match`; with a `Last-Modified`,
      `If-Modified-Since`; with both, both; a `304` maps to `NotModified` with no body; a `Range`
      request answered `206` maps to `PartialContent` with the returned `Content-Range`, answered
      `200` maps to `OK`, so a caller splicing an incremental index knows the upstream ignored the
      range, and answered `416` maps to `RangeNotSatisfiable` (the answer `rubygems.md` sampled
      from the live upstream for a range past the end after a rewrite), never to an error class.
- [ ] AC16: The `distribution` adapter answers a `401` Bearer challenge by requesting a token at
      the realm with the challenge's `service` and `scope`, anonymously under `none` and with
      Basic under `token-exchange`, retries with `Authorization: Bearer`, caches the token per
      `(realm, service, scope)` and the credential's `rotated_at` for `expires_in` (60 seconds
      when absent, one hour at most) less a margin, re-exchanges on expiry, on a fresh `401` and
      on the first fetch after the credential is rotated, never sends a placeholder token, reads
      the token response under a 4 KiB bound, and refuses a realm host that is neither the root
      nor an allowlisted `root` entry with `HostNotAllowedError`, all proven against a fake token
      server.
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
      the upstream's `tls.ca_bundle` names that CA and fails otherwise; `insecure_skip_verify`,
      `allow_http` and `allow_local` are each refused unless set explicitly and, when set, named
      in the startup log; a client certificate configured on the upstream is presented in the
      handshake.
- [ ] AC23: `Validate` runs on `management-api.md`'s create and `PATCH` of a `remote`'s upstream
      and refuses an unregistered adapter, a non-`https` root without `allow_http`, a credential
      kind the adapter does not accept (`bearer` on `distribution`, `token-exchange` on `https`),
      a row naming `git` as its own adapter (the resolved git-location decision, was Q9), an `own`
      entry naming no credential, a bare-wildcard host, `allow_http` beside a credential
      reference or an `own` entry, and a `basic-exchange` exchange path the path rule refuses,
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
      collision-detecting SHA-1, aborts a fetch whose packfile exceeds the configured size bound
      while it is still arriving and stores nothing, refuses a branch or tag name, fetches no
      submodule (a `.gitmodules` file is emitted as an ordinary file and no second host is
      contacted, network layer), emits a symbolic link as a link entry without resolving it and
      omits a gitlink entry, delivers the tree as the gzip-compressed tar "How a location reaches
      the `git` adapter" defines (one fixed tar format, the commit's own entry order and modes,
      owner, group and timestamps zero, a gzip header with zero time, no name and a fixed OS
      byte, `Content-Type: application/gzip`, no `Content-Encoding`), byte-identical across two
      fetches of one commit, fails with a named error against a fixture server that refuses a
      want by commit id, and shells out to nothing (no `os/exec` import under
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
      new value (`management-api.md` AC21), which for `basic-exchange`, `token-exchange`,
      `aws-ecr` and `gcp` means a fresh exchange under the new material and never a token cached
      under the old (network layer, against the fake exchange servers); and deleting a credential referenced by an
      `Upstream` or a `ReplicationLink` is refused `409` `in-use` naming each dependant
      (`repository-lifecycle.md` AC20), so no fetch ever finds its credential reference
      dangling.
- [ ] AC31: The package exports exactly `upstream_requests_total{upstream,outcome}`,
      `upstream_inflight_requests{upstream}`, `upstream_rate_limit_remaining{upstream}`,
      `upstream_cooldown{upstream}`, `upstream_cooldown_until_timestamp_seconds{upstream}` and
      `upstream_token_exchange_failures_total{upstream,form}` under the catalogue's names, with
      `upstream` always the configured name and never a URL; `upstream` is a
      configuration-bounded label under `telemetry.metrics.name_label_limit`, so the
      (`name_label_limit` + 1)th distinct upstream renders as `_other` on every series here and
      a cap of `0` collapses every value, and the same cap governs `server_address` on
      `observability.md`'s `http_client_request_duration_seconds`, which this package's
      decorated transport emits on every fetch beside the six and which "exactly" does not count
      (its AC5, its catalogue row); a driven scenario against the Docker-Hub-shaped stand-in
      moves `upstream_rate_limit_remaining` with the header, sets `upstream_cooldown` to 1 for
      exactly the cool-down period, and raises `UpstreamCooldown` once through
      `telemetry.Alert`; a failed exchange increments the failure counter under its kind.
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
      `upstream_token_exchange_failures_total{form="basic-exchange"}`; a body over 4 KiB or
      carrying a non-printable byte is `Refused` and never presented; the exchanged token is
      registered with `telemetry.MarkSecret` before its first use and occurs zero times in logs
      and the error chain; the exchange is never made against an off-origin host and its path is
      joined under the path rule; and a real
      `conan install` through a remote repository bound to a reference `conan_server` stand-in
      that requires authentication succeeds under this kind (the resolved Conan-exchange
      decision, was Q8).
- [ ] AC34: On a remote whose row names `https`, a git location `{url, commit}` is fetched by the
      `git` adapter under that row's allowlist, concurrency bound and cool-down: with the git host
      allowlisted (under any role) the tree of the commit arrives as the gzip-compressed tar AC28
      defines and no
      credential reaches the git host even when the row carries one (network layer); with the host
      absent it fails `HostNotAllowedError` before any connection; the same location on a
      `distribution` row is refused before any connection; a git URL carrying userinfo, a query
      string, a fragment or a non-`https` scheme, and a commit id that is not 40 hexadecimal
      digits, are each refused before any connection with a named error that is not
      `HostNotAllowedError` (nothing about a host was decided); a redirect the git server answers to a host
      outside the allowlist is refused with no connection to it; a truncated smart-HTTP answer
      surfaces `ErrTruncated`; and a real `terraform init` through a remote repository installs a module
      whose upstream location is a commit-pinned `git::https` URL, from that stream committed as
      fetched and served at a `.tar.gz` location whose `checksum` is the committed blob's digest
      (`terraform.md` AC18 is the client half; the resolved git-location decision, was Q9, and
      the resolved stream-form decision, was Q11).
- [ ] AC35: A location or redirect target whose host is a literal loopback, link-local or
      unspecified address, and an allowlisted name that resolves to one (a test resolver
      answering `127.0.0.1` and `169.254.169.254` for the name), is refused before any connection
      on every adapter, at the network layer (a stand-in on that address accepts no socket), with
      `HostNotAllowedError` naming the host and the local-address rule (the same type as AC7's,
      so `proxy-cache.md`'s candidate loop needs no second branch), on
      `https` rows, `allow_http` rows and `insecure_skip_verify` rows alike; a row with
      `allow_local` connects, which is how every loopback stand-in in this spec's own tests is
      reached; the `gcp` kind's ambient source still reaches a fake metadata server on a
      link-local address through its own client (the resolved local-address decision, was Q10).

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | unit + integration | `internal/upstream/registry_test.go` (selection, unregistered refusal); `internal/upstream/router_test.go` (two remotes, one adapter, independent resolution) |
| AC2 | unit | `internal/upstream/pin_test.go` (reflection over `Adapter` and `Validator` method sets) |
| AC3 | lint + unit | module-wide `forbidigo` rule in `.golangci.yml` with the egress inventory as its exclusion list; fixtures behind the `lintfixture` build tag under `internal/proxy` and `internal/format`; `internal/upstream/egress_boundary_test.go` runs the pinned golangci-lint against them and asserts the exclusion list equals the inventory this spec tables |
| AC4 | integration + unit | `conformance/core/upstream_hygiene_test.go` (recording stand-in, real client with leak headers, active server span; the outbound header set against the declared set, shared with `observability.md` AC20); `internal/upstream/request_shape_test.go` (pinned field set) |
| AC5 | integration | `internal/upstream/hygiene_test.go` (header-recording stand-in, both encodings, override) |
| AC6 | integration | `internal/upstream/credential_scope_test.go` (four-host stand-in chain, every kind, network-layer header capture) |
| AC7 | integration + unit | `internal/upstream/allowlist_test.go` (connection-refusing stand-in on the excluded host, normalisation, wildcard refusal, `Host` and `X-Forwarded-Host` ignored; the error type and its rule by `errors.As`); `internal/upstream/location_test.go` (path-joining table: climbing dot segments, leading `//`, an embedded scheme, encoded separators; a scheme-downgrade redirect refused without `allow_http`; each refusal the one `HostNotAllowedError` type naming its rule) |
| AC8 | integration | `internal/upstream/redirect_test.go` (five codes, ten-hop bound, no `Location` on the client response, presigned target rotation between fetches) |
| AC9 | unit | `internal/upstream/ratelimit_test.go` (table over the response shapes including the two `2xx` remaining-zero shapes with and without a reset time, `errors.As`) |
| AC10 | integration | `internal/upstream/cooldown_test.go` (injected clock, network-layer zero-request assertion, cap, `5xx` and Docker Hub remaining-zero no cool-down, a second `Router` unaffected) |
| AC11 | integration | `internal/upstream/concurrency_test.go` (flood of distinct misses, open-connection count at the stand-in, cancelled waiter) |
| AC12 | integration + fault injection | `internal/upstream/timeout_test.go` (accept-and-hang, one byte per second, mid-body stall) |
| AC13 | integration + fault injection | `internal/upstream/completion_test.go` (short `Content-Length`, unterminated chunked, clean body); `internal/proxy/fetch_integrity_test.go` re-run through the real seam |
| AC14 | integration | `internal/upstream/validators_test.go` (verbatim headers on `GET` and `HEAD` including `Content-Range` and `Repr-Digest`, backwards `Last-Modified`); the probe half shared with `proxy-cache.md` AC32's `internal/proxy/head_test.go` (the layer's revalidation-probe `HEAD` reading a verbatim `Docker-Content-Digest`, with no forwarded client `HEAD` at the network layer) |
| AC15 | integration | `internal/upstream/conditional_test.go` (three validator combinations, `304`, `206` with `Content-Range`, ignored-range `200`, `416` as `RangeNotSatisfiable`) |
| AC16 | integration | `internal/upstream/distribution/token_test.go` (fake token server: anonymous and Basic exchange, per-scope cache, expiry and the one-hour cap, fresh `401`, re-exchange after rotation, oversize response refused, disallowed realm, no placeholder) |
| AC17 | integration + lint | `internal/upstream/awsecr/token_test.go` (fake `GetAuthorizationToken` endpoint, refresh timing, static and ambient); depguard allowlist entry in `.golangci.yml` |
| AC18 | integration + unit | `internal/upstream/gcp/token_test.go` (fake metadata server, fake token endpoint, JWT signature check, refresh timing); an import-list assertion in the same file |
| AC19 | integration | `internal/upstream/credential_scope_test.go` (presentation per kind at the network layer) |
| AC20 | unit + fuzz + integration | `internal/upstream/redact_test.go` (table over kinds and shapes, `FuzzRedact`; the parameter list equal to `telemetry.RedactURL`'s, importing both); `internal/upstream/credential_scope_test.go` (`MarkSecret` before first use per kind, through `telemetry.NewTestRecorder`); `internal/proxy/credentials_test.go` (`proxy-cache.md` AC6's case through the redactor) |
| AC21 | unit | `internal/upstream/credential_boundary_test.go` (exported-identifier scan, reflection walk over `Response` and error chains) |
| AC22 | integration + unit | `internal/upstream/tls_test.go` (private-CA stand-in with and without the bundle, client certificate in the handshake, startup-log naming of `insecure_skip_verify`, `allow_http` and `allow_local`); `internal/upstream/validate_test.go` (`http://` refusal and override; shared with `data-model.md` AC40, whose row names the same file for `allow_http` and `allow_local` absent unless explicit) |
| AC23 | integration | `internal/manage/upstream_validate_test.go` (create and `PATCH` through the management API, each refusal with `upstream-invalid` including a row naming `git`, `allow_http` beside a credential, a climbing exchange path; unreachable accepted) |
| AC24 | unit | `internal/upstream/preconfigured/profiles_test.go` (reads the profile table and the seeding set `proxy-cache.md` AC19 tests, asserts equality and field completeness) |
| AC25 | conformance | `conformance/oci/upstream_dockerhub_test.go` (Docker-Hub-shaped stand-in: realm on a second host, blob redirect to a third, pull budget, `429` message visible to the client); `conformance/composer/upstream_dist_host_test.go` (dist on a second host, `302` to a third, allowlist removal) |
| AC26 | ci + manual procedure | scheduled nightly workflow rows in `.github/workflows/` (one per profile plus the two real-cloud rows); transcript diff and issue creation proven by a written manual-dispatch procedure; the unfunded table in this spec |
| AC27 | integration + conformance | `internal/upstream/post_test.go` (single send, no retry, redirect is an error); `conformance/composer/audit_forward_test.go` (real client, stand-in counts one request) |
| AC28 | integration + unit | `internal/upstream/git/fetch_test.go` (local smart-HTTP fixture repository, collision-detecting SHA-1 with a corrupted object, size bound exceeded mid-packfile, branch refusal, a fixture with a submodule and a symbolic link, a fixture server refusing wants by id); `internal/upstream/git/stream_test.go` (the stream form against a fixture tree: gzip header fields, entry order equal to the fixture's git tree order, modes, zero owner and times, the gitlink omitted, `Content-Type` and no `Content-Encoding`; two fetches of one commit byte-identical; a fixture that fails mid-write surfacing an error and never a clean short body); `internal/upstream/git/no_exec_test.go` (import scan) |
| AC29 | unit | `internal/upstream/import_boundary_test.go` (`go/packages` walk, first violating edge named) |
| AC30 | integration | `internal/upstream/router_test.go` (per-fetch resolution, realm-keyed token cache invalidated by `rotated_at` for each exchanging kind against its fake, cool-down not carried); `internal/repository/configure_remote_test.go` (shared with `repository-lifecycle.md` AC25: cache kept, `last-checked` reset); `internal/manage/upstream_credential_test.go` (shared with `management-api.md` AC21 and `repository-lifecycle.md` AC20: rotation at the network layer, `in-use` while referenced) |
| AC31 | integration | `internal/upstream/metrics_test.go` (every series and label set through `telemetry.NewTestRecorder` against the Docker-Hub-shaped stand-in; `UpstreamCooldown` once; the client histogram present on a fetch with `upstream` and `server_address` and absent from this package's own registration; the `observability.md` AC6 and AC18 rows for this package); `internal/telemetry/labels_test.go` (the `upstream` and `server_address` caps and the `0` collapse, shared with `observability.md` AC5) |
| AC32 | unit + script | `internal/upstream/config_test.go` (defaults, typed struct, row-level override); `scripts/check-config-keys.js` under `make verify` (`deployment.md`'s two-way check) |
| AC33 | integration + conformance | `internal/upstream/basicexchange_test.go` (fake Conan-shaped server without a challenge: exchange path under the path rule, Bearer on root and `root` entries only at the network layer, one re-exchange on a fresh `401`, second `401`, empty body, oversize body and a non-printable body each `Refused`, failure counter under its form, `MarkSecret` through `telemetry.NewTestRecorder`, off-origin exchange refused); `conformance/conan/proxied_test.go` (a real `conan install` through a remote bound to an authenticating `conan_server` stand-in under `basic-exchange`, shared with `conan.md`'s proxied criterion) |
| AC34 | integration + conformance | `internal/upstream/router_git_test.go` (git location on an `https` row: allowlisted host under each role with no credential at the git host, absent host refused before connect, `distribution` row refused, the URL grammar table (userinfo, query, fragment, scheme, short commit) refused before connect, an off-allowlist redirect from the git stand-in refused at the network layer, truncated answer; concurrency bound and cool-down shared with the row); `conformance/terraform/module_vcs_test.go` (shared with `terraform.md` AC18: a git stand-in serving a commit over smart HTTP, restricted-network installs from the stream committed as fetched at a `.tar.gz` location) |
| AC35 | integration | `internal/upstream/local_address_test.go` (literal loopback, link-local and unspecified hosts; a test resolver mapping an allowlisted name to `127.0.0.1` and `169.254.169.254`; a socket-counting stand-in on the address; `https`, `allow_http` and `insecure_skip_verify` rows; the refusal a `HostNotAllowedError` naming the host and the local-address rule, caught by the same `errors.As` as AC7's; `allow_local` admitting; the `gcp` ambient fake on a link-local address reached through the kind's client) |

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
  allowlist and credential roles with the scheme, path-joining and local-address rules (AC35);
  redirects; conditional requests and `Range`; identity encoding and the fixed `User-Agent`;
  rate-limit interpretation; connect timeout and stall detection; truthful completion; TLS trust
  and `http://` refusal
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
- `internal/upstream/git` with go-git and collision-detecting SHA-1, the size bound, the
  deterministic gzip-compressed tar stream (the resolved stream-form decision, was Q11; AC28),
  the no-exec test
- The git location form on `Request` and the `Router`'s per-location dispatch to `git` on an
  `https` row under that row's allowlist, bound and cool-down; the configuration refusal of a row
  naming `git` (the resolved git-location decision, was Q9; AC34, AC23)

## Tasks

Left empty by `/spec`. Populated by `/tasks` once the spec reaches `planned`.

## Open Questions

None remain open. Seven questions were written in the template's decision shape during authoring
on 2026-09-27, two more (Q8, Q9) during the closing reconciliation sweep on 2026-09-28 on
Opus, one (Q10) on the Fable recheck of 2026-10-01, and one (Q11) on the Fable follow-up of
2026-10-08; each was adopted at its recommendation
under the owner's standing delegation (`CLAUDE.md`); each is reversible by the owner, and
`grep -rn "standing delegation"` finds them. The Fable recheck re-examined Q1 to Q9 as if deciding
them fresh and recorded a verdict on each record below (confirmed, or amended with what changed).
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

Rechecked on Fable 2026-10-01: confirmed. The options were framed fairly (A is Harbor's real
shape, C the real alternative) and the two-axis reading survives every format added since: Conan's
exchange became a kind, Terraform's VCS fetch a per-location transport, and RubyGems, Cargo and
the rest are the `https` adapter under a recipe. One under-statement: the `git` adapter is a third
transport, so "two adapters" is the step-4 count, not the final one.

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

Rechecked on Fable 2026-10-01: confirmed. Amended in one detail the record under-stated: the row
type `Validate` takes is `data-model.md`'s `model.Upstream`, not a type of this package, so the
consumers and this package share one row type and nothing stutters as `upstream.Upstream`.

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

Rechecked on Fable 2026-10-01: **amended**. The home and the enforcement point stand, and option
B's cost (the proxy never sees the leaking hop) is exactly right. What the record under-stated is
that a host allowlist checks the host and nothing else, and the adversarial pass found three
shapes it left open: a downgrade redirect to `http://` on an allowlisted host (the credential in
clear, the dnf 4 capture), a handler-passed path that climbs out of the root or smuggles a
scheme-relative host (`//evil/...`), and an allowlisted name resolving to a local address. The
first two are folded into "Credential scoping and the off-origin allowlist" as the scheme and
path-joining rules (AC6, AC7, AC23); the third became Q10 below. `allow_http` now refuses a
credential at configuration, which narrows the operator relaxation the record promised: a
plain-HTTP mirror is anonymous or it is not proxied.

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

Rechecked on Fable 2026-10-01: confirmed. The cost is stated honestly (every binary carries the
SDK) and B's cost is the decisive one: an EKS deployment with IRSA is the common case, not the
edge. Two dependencies the record did not list are now named in Design: go-git for the `git`
adapter and `golang.org/x/net/idna` for host normalisation; neither changes the verdict.

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

Rechecked on Fable 2026-10-01: **amended**. The decision stands: a fleet that keeps hammering a
throttled upstream is the worse outcome, and serve-stale covers the gap. Its fold was wrong in one
place: "Rate limits and the cool-down" cooled down on Docker Hub's `ratelimit-remaining: 0`, whose
`ratelimit-limit: 100;w=21600` gives a window length and no reset time, so the adapter would have
guessed and taken the upstream offline for up to the cap after a *successful* pull, the option A
cost the record thought was bounded to a bogus `Retry-After`. Now only a stated reset time
(`x-ratelimit-reset`) or a `RateLimitError` starts a cool-down; Docker Hub's zero moves the gauge
and fires `UpstreamRateLimitLow`, and the next `429` takes the ordinary rule (AC9, AC10). Two
costs the record omitted are now stated in Design: the cool-down is per process, so N replicas
learn a limit N times, and a restart clears it.

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

Rechecked on Fable 2026-10-01: confirmed. The fakes exercise every branch the kinds have
(`GetAuthorizationToken` decoding, refresh timing, the metadata header, the RS256 exchange), so
what the real rows add is the provider's own drift, which is exactly what a nightly is for and
exactly what cannot be tested without money; C is out of an agent's authority and B is how a gap
is forgotten. The unfunded table is the visible record and remains owner-facing.

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

Rechecked on Fable 2026-10-01: confirmed. Sequencing the cloud kinds after OCI's first proving
run is evidence sequencing, which `CLAUDE.md` allows, not deferral for effort, which it forbids;
C would contradict the charter's step 4. The scheme, path and local-address rules (was Q3 as
amended, Q10) are Phase 1 work, since a seam without them is the seam this spec's Context says
must never ship.

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

Rechecked on Fable 2026-10-01: confirmed, with the fold amended. The framing is fair: A really is
a deferral for effort dressed as a limit, and C is the option-surface growth Q1 warned about; the
capture (`conan.md`, Basic to `users/authenticate`, a `text/plain` token, Bearer afterwards, no
challenge either way) is the evidence, and both sibling entries the cost named have landed
(`management-api.md`'s kind list, `auth.md` AC10's review list). Three things the record left
open are now in Design and AC33: the exchange path is joined under the path rule so it cannot
leave the root; the token body is bounded (4 KiB, printable) so an upstream cannot make the
registry carry an arbitrary blob as a header; and the cached token is keyed by the credential's
`rotated_at`, without which a rotation would keep presenting the token minted under the old pair
until the upstream refused it, contradicting AC30.

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

Rechecked on Fable 2026-10-01: confirmed, with the fold amended. Per-location dispatch is the
right shape: the git host is metadata-derived like every other off-origin host, B is unknowable
in advance and C is the materialisation route two specs rejected; the sibling entries the cost
named have landed (`proxy-cache.md`'s Obligation and AC30, `format-handler-interface.md` AC8).
The record treated the git location as a URL and a commit and stopped there, and the adversarial
pass found what a module author can publish in that URL: userinfo (a credential from metadata,
sent to a third-party host), a query or fragment, another scheme, a short or symbolic ref, a
server redirect to an unlisted host, and submodules that are second fetches from hosts the
operator never admitted. "Selecting an adapter", AC28 and AC34 now refuse each before any
connection, route go-git through this package's client so its redirects pass the allowlist,
fetch no submodule, emit links unresolved, and apply the size bound to the packfile as it arrives
rather than to a tree already held.

Fable follow-up 2026-10-08: one clause of this record's fold is withdrawn. "Selecting an
adapter" said the adapter emits an uncompressed tar "which the handler re-packs canonically as
it does a hosted archive", and `terraform.md`'s Fable recheck (its was-Q4, amended) found that
no handler can: fetch-and-cache commits the bytes it fetched. The stream is now the form the
registry serves, decided as Q11 below. The dispatch, the allowlist, the grammar and the
no-credential rule stand unchanged.

### Resolved: the form of the `git` adapter's stream (was Q11, raised and adopted on the Fable follow-up of 2026-10-08)

**Adopted 2026-10-08 under the owner's standing delegation**, and **owner-facing**: it decides
what bytes a proxied module's `checksum` names and places a packaging rule inside the egress
package. Option A: the `git` adapter emits the commit's tree as one gzip-compressed tar in a
deterministic form (the tree's own order and modes, owner, group and timestamps zero, one fixed
tar format, a gzip header with zero time, no name, a fixed OS byte and a fixed level), which the
registry commits as fetched and `terraform.md` serves at a `.tar.gz` location with the committed
blob's digest as the `checksum`. Folded into Scope, "The requirements, gathered" (the Terraform
row), "Selecting an adapter" (the `git` bullet and "How a location reaches the `git` adapter"),
"Credential kinds" (the dependency line), the split table (Encoding), AC28 and its new
`stream_test.go` row, AC34 and its row, Phase 4, and the was-Q9 note above. Raised by the
`terraform.md` Fable recheck of 2026-10-08 (item 1 in `agents/spec-loop/consequences.md`).

The was-Q9 fold had the adapter emit an uncompressed tar and the Terraform handler re-pack it
canonically as it does a hosted archive. It cannot: `proxy-cache.md`'s fetch-and-cache commits
the bytes it fetched and its verifier hook may refuse a commit but never replace it, and no
handler writes a derived blob on a remote. And the captured client chooses its unpacker by
extension, with `.tar.gz` and zip the captured forms (`terraform.md`, "The wire surface, as
captured" and "The download capability"). So
either the adapter emits what is served, or `terraform.md` captures go-getter's `.tar` support
and serves the uncompressed stream at a `.tar` location. Which?

**Recommendation:** A. The adapter already defines the stream (order, modes, links, zero
timestamps); fixing its remaining free fields and compressing it costs one encoder, keeps the
one captured archive form on both of Terraform's paths, and makes a re-fetch after eviction
commit the same blob, which an uncompressed stream would also need and B would still owe.

| Option | You get | It costs |
|---|---|---|
| **A. The adapter emits a deterministic gzip-compressed tar; committed as fetched; served at `.tar.gz`** | The captured archive form on the hosted and the proxied path alike, one byte-route shape; a stream that is byte-identical per commit, so eviction and re-fetch commit the same blob; no format rule in the adapter, since the order and modes are the commit's own | A compressor and a form rule inside a transport adapter, the option-surface growth Q1 warned of, bounded because it is the adapter's only output form and takes no option; CPU per fetch; digest stability per build of the registry, not across a change of Go's gzip encoder (`terraform.md` serves the committed blob's own digest, so nothing compares the two) |
| **B. An uncompressed tar served at a `.tar` location; `terraform.md` captures go-getter's `.tar` support** | No compressor in the adapter | An uncaptured client path on all four clients, where the client is the specification (`CLAUDE.md`); a second byte-route shape (`.tar` proxied beside `.tar.gz` hosted); larger transfers to every client; re-opens `terraform.md`, planned at HEAD on `.tar.gz` (its AC18); the determinism rule is still owed |
| **C. The handler re-packs (the withdrawn fold)** | One canonical form for hosted and proxied trees | Contradicts `proxy-cache.md`'s fetch-and-cache contract (commit what was fetched; the hook refuses, never replaces) and would be a derived blob written by a handler on a remote, which no spec admits |

**Why this is yours:** it decides that a proxied module's `checksum` names this registry's
packaging of a commit rather than any upstream artifact, which an operator reading a module's
provenance will meet, and it puts a packaging rule in the one package that opens connections.

Accepted cost: the encoder and form rule in the adapter, and per-build rather than per-encoder
digest stability. B lost to the uncaptured path and the second route shape; C to the
fetch-and-cache contract. Reversible by the owner by adopting B, after which `terraform.md`'s
byte route and AC18 take a `.tar` form and its proxied phase owes a capture on all four clients.

### Resolved: local-address refusal (was Q10, raised and adopted on the Fable recheck of 2026-10-01)

**Adopted 2026-10-01 under the owner's standing delegation.** Option A: every location fetch on
every adapter refuses a loopback, link-local or unspecified destination, checked on a literal IP
before any connection and on each resolved address at dial time for a direct dial, unless the
`Upstream` row sets `allow_local`, which is named in the startup log and exists for stand-ins on
the loopback interface. Folded into Scope, "Configuration on the `Upstream` row", "Credential
scoping and the off-origin allowlist", "Timeouts, concurrency and completion" (the transport
constructor), AC22, AC35, Phase 1; the row field is a `data-model.md` consequence.

The host allowlist decides which names the registry may connect to; it does not decide which
addresses those names resolve to, and the upstream controls its own DNS. Should the adapter also
refuse the local address ranges, so that an allowlisted name resolving to `127.0.0.1` or to the
cloud instance-metadata address never opens a socket?

**Recommendation:** A. On an ordinary `https` row the scheme rule already stops the attack, since
the metadata service and most local listeners speak no TLS; the rows that need this are the ones
that turn TLS off (`allow_http`, `insecure_skip_verify`), which are exactly the rows an operator
creates for a LAN mirror and forgets. The check is a few lines in the dialer and its cost is one
flag on stand-in rows.

| Option | You get | It costs |
|---|---|---|
| **A. Refuse loopback, link-local and unspecified at dial time; `allow_local` per row for stand-ins** | The metadata endpoint and the process's own listeners (`:9464`, the database) are unreachable through any upstream however its DNS behaves; the exemption is visible in configuration and in the startup log | A row field (`data-model.md`); every loopback stand-in in this spec's tests sets it; under an egress proxy only the literal check applies, since the proxy resolves |
| **B. No address check; the host allowlist and TLS are the boundary** | Nothing to add | A LAN mirror row with `allow_http` whose allowlisted name is rebound to `169.254.169.254` fetches cloud credentials with a plain `GET` on the deployments the cloud kinds exist for |
| **C. An instance-wide key instead of a row flag** | One switch | A fourth `upstream.` key against AC32's closed set, and a switch that, once set for a test, admits local addresses for every upstream in the process |

**Why this is yours:** it adds a refusal an operator can hit legitimately (a mirror on
`localhost` for a demo) and decides that the exemption is per upstream and logged rather than
global.

Accepted cost: the row field and the flag on stand-in rows, and that RFC 1918 ranges are
deliberately *not* refused, since a private mirror on `10.0.0.0/8` is the ordinary case this
registry exists to proxy; the rule covers the ranges that name the host itself and the metadata
service, nothing wider.

Fable follow-up 2026-10-01: the row field has landed (`data-model.md` AC40, its entity table and
"Upstream configuration and upstream credentials", on its own follow-up), and the refusal now
names its type, `HostNotAllowedError` with the local-address rule in its `Rule` field, the same
type as the allowlist's, so `proxy-cache.md`'s candidate loop reads all four connection rules as
one refusal class (AC35 as amended). The decision itself stands. Fable follow-up 2026-10-08: the
harness-side consumer of `allow_local` has landed, `conformance-harness.md`'s `upstreams` row,
"Upstream bindings" and AC19, which set the flag only on a row bound to a loopback stand-in and
observe it in the startup log, so the nightly run never carries it into a real upstream row.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-27 | d9510af | authoring pass: grounded first draft, not a review | Not a review. Gathered the requirements of 27 citing format specs from their "what this format requires of `upstream-adapters.md`" sections, `format-handler-interface.md`'s resolved adapter-axis record and its 2026-09-25 ownership note, `proxy-cache.md`'s Design and resolved records, `data-model.md`'s `Upstream` entity, `management-api.md`'s repository administration and AC21, `conformance-harness.md`'s upstream bindings, `project-charter.md`'s step 4, and `agents/spec-loop/consequences.md` (Open items 7, 11, 13 and every line naming this file; themes 2 and 7; the `artifact-verification.md` and `signing-service.md` requirements on `proxy-cache.md`). Grounded prior art in Harbor's adapter, model and ECR/GCR/native sources, the distribution token-auth specification, Docker Hub's pull-limit page, the ECR `GetAuthorizationToken` reference, the GCE metadata-server and Artifact Registry authentication pages, GitHub's rate-limit page, Pulp's `Remote` model and zot's sync example, all fetched this run; Nexus and Artifactory pages did not render and no claim about them is made. Fixed the design: two transport adapters plus a credential-kind axis, a one-method interface pin, an `Upstream`-held off-origin allowlist with per-host credential roles enforced at connect time, typed rate-limit errors with a capped cool-down, truthful body completion as the adapter's half of the completion-only mode, a redactor covering every credential shape, compile-time preconfigured profiles held equal to `proxy-cache.md`'s set by test, and the adapter half of the nightly job with an explicit unfunded-row table. Stated the adapter-versus-proxy-cache split as a table. Seven questions written in decision shape and adopted under the standing delegation; zero open. 29 criteria, each with a Test Plan row and a named enforcer for every boundary rule. `node scripts/check-spec.js` run against this file with zero failures; the unasserted-duty advisories acted on. |
| 2026-09-28 | 9ebf6e9 | cross-spec reconciliation of the foundation authoring wave. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` targeting this file verified against the source spec's current text before applying. From `repository-lifecycle.md` (authoring item 13; its AC20, AC25): a new Design section "Lifecycle of an upstream binding" - deleting a credential an `Upstream` or `ReplicationLink` references is refused `409` `in-use`, changing a `remote`'s upstream keeps every cached reference and resets `RemoteFile.last-checked`, and the adapter's half is per-fetch resolution of the row and its credential with realm-keyed tokens and no carried cool-down; AC30 added with rows shared with that spec and `management-api.md` AC21. From `observability.md` (item 7): `traceparent` and `tracestate` on the forbidden outbound set with the transport built without the propagating round-tripper (AC4 extended, its AC20 row shared); `telemetry.MarkSecret` before every credential use and the redactor's parameter list held equal to `telemetry.RedactURL`'s (AC20 extended); the six `upstream_*` series and the `UpstreamRateLimitLow` and `UpstreamCooldown` alerts by their catalogue names (AC31 added). From `deployment.md` (item 5): a "Configuration keys" section tabling `upstream.default_concurrency`, `upstream.default_cooldown_cap` and `upstream.connect_timeout` in the three-column shape `scripts/check-config-keys.js` parses, the `User-Agent` computed from `server.public_url` and stated as not a key (AC5, AC32 added), the row-level `limits` falling back to the instance defaults. From the `management-api.md` reconciliation (item 6): `upstream-invalid` is 422 (AC23, "Configuration-time validation"). From the `data-model.md` reconciliation (item 3): "Configuration on the `Upstream` row" and the credential store cite "Upstream configuration and upstream credentials" and AC40 instead of a consequence. From the `proxy-cache.md` reconciliation (item 5): the nuget and maven rows are shipped under its resolved second extension (was Q17), the split table cites its AC20 and AC22, Phase 3 follows. The charter's step citations and `auth.md` AC10's review surface cited as applied. Already done at authoring: every Open item and format line naming this file; the format specs' "to be authored" wording (authoring item 12) is still queued on their side. 32 criteria, each with a Test Plan row; `node scripts/check-spec.js` on this file: zero failures. Stays draft pending a gate review. |
| 2026-09-28 | 3135d95 | closing reconciliation sweep on Opus: cross-spec reconciliation of the Wave 1 folds. Not a review | Not a review. Every item in `agents/spec-loop/consequences.md` targeting this file from "From format batch 3 reconciliation" through the latest section, plus earlier items the progress log did not show applied, verified against the current text of the spec that raised it (`cargo.md`, `conan.md`, `terraform.md`, `oci.md`). Applied: format batch 3 item 11 (a Cargo row in "The requirements, gathered": `https://` sparse root, the `dl` host on the allowlist with role `none`, the `header` kind with header `Authorization` for a private sparse upstream; the crates.io recipe under "Preconfigured profiles"); format batch 4 item 10 as **Q8, adopted under the standing delegation**: a `basic-exchange` kind (Basic `GET` at a stored exchange path, `text/plain` token presented as Bearer to the root and its `root` entries, one re-exchange on a fresh `401`), with the `bearer`-only option rejected as a deferral for effort; folded through Scope, the kinds table, the ConanCenter recipe line, AC33 and Phase 3; format batch 5 item 6 as **Q9, adopted**: `Request` carries a git location `{url, commit}` the `Router` sends to the `git` adapter on an `https` row under that row's allowlist, bound and cool-down, presenting no credential, refused on a `distribution` row, and a row naming `git` refused at configuration; folded through Scope, "Selecting an adapter", "The interface", "Credential kinds", AC23, AC34 and Phase 4; format batch 1 item 10 (the Docker Hub CDN hosts are captured at `oci.md`'s Phase 4, its proxied phase, in the profile row, AC24 and Phase 1). Found already done: management-api reconciliation 6 (`upstream-invalid` 422), proxy-cache reconciliation 5, repository-lifecycle authoring items 12 and 13. New consequences reported: `conan.md` (the Conan-shaped kind now exists, its proxied path and Phase 4 can cite was-Q8 and AC33), `terraform.md` (the gap is closed by was-Q9 and AC34), `management-api.md` (the upstream-credential kind list gains `basic-exchange`), `auth.md` (AC10's review list of upstream kinds gains the Conan-shaped exchange), `proxy-cache.md` and `format-handler-interface.md` (the fetch-and-cache location gains the git form). 34 criteria, each with a Test Plan row; `fable_recheck` extended; `node scripts/check-spec.js` zero failures on this file. Stays draft. |
| 2026-10-01 | 7ffbd14 | Fable recheck: full review + re-examination of the Opus and cloud-session adoptions (Q1 to Q9), adversarial SSRF pass, go-spec-reviewer inline, constitution compliance | Every sibling citation verified at HEAD against the current text of `proxy-cache.md` (the adapter seam, the Obligation list with the git form and the expected validator, AC26's `RetryAt` deferral, AC31), `auth.md` (AC10's review list naming this spec's kinds and `basic-exchange`, AC36 as amended), `credential-management.md` (the exchange makes no request for an untrusted issuer through `internal/auth`'s client), `deployment.md` (`HTTPS_PROXY`/`NO_PROXY` once, `security.previous_master_key`), `artifact-verification.md` (`internal/trustsource`), `observability.md` (the six series, `MarkSecret` per job, `RedactURL`), `signing-service.md` (was-Q21's read-driven first fetch reaches this seam only through a handler's route), `data-model.md` AC40, `management-api.md`'s kind list, `conformance-harness.md`'s `upstreams` sub-entries, and the format specs behind every row of "The requirements, gathered" (`terraform.md`, `conan.md`, `cargo.md`, `rubygems.md`, `oci.md`, hex, vagrant, swift, homebrew, conda, julia, hackage, cran, composer, rpm re-read). Queued item applied: rubygems authoring 9 (a RubyGems row, the recipe, `basic` root only, `Range` on `/versions` with `Repr-Digest` and `Content-Range` verbatim, `416` as `RangeNotSatisfiable`; AC14, AC15). Verdicts: Q1 confirmed; Q2 confirmed and amended (`Validate` takes `model.Upstream`); Q3 **amended** (a host allowlist checks the host and nothing else: the scheme rule, the path-joining rule and no credential over plain HTTP added, `allow_http` refusing a credential at configuration; AC6, AC7, AC23); Q4 confirmed (go-git and `x/net/idna` named); Q5 **amended** (Docker Hub's `ratelimit-remaining: 0` carries no reset time, so it no longer starts a cool-down, only a stated `x-ratelimit-reset` or a `RateLimitError` does; per-process state and restart stated as costs; AC9, AC10); Q6 confirmed; Q7 confirmed; Q8 confirmed with its fold amended (exchange path under the path rule, token body bounded, cache keyed by `rotated_at`); Q9 confirmed with its fold amended (git URL grammar refusing userinfo, query, fragment, scheme and short refs, redirects through this package's client, no submodules, links unresolved, size bound during transfer; AC28, AC34). New Q10 adopted on Fable: loopback, link-local and unspecified destinations refused at dial time with a per-row `allow_local` for stand-ins (AC35). Other findings fixed: the egress boundary's rule was scoped to two packages and then spoke of exclusions it could not have, now module-wide with the egress inventory as its exclusion list (`internal/storage`, `internal/auth`, `internal/trustsource`, `internal/policy`, `internal/replication`, `internal/signing/kms`, `internal/telemetry`; AC3); every exchanged token cache keyed by the credential's `rotated_at` so AC30's rotation clause holds for exchanging kinds; one transport per row (TLS is per row) built by one constructor rather than "the single transport"; `CheckRedirect` strips credential headers before recomputing per hop; goroutine ownership and shutdown stated (nothing outlives `Fetch`, refresh is lazy); `foundation.tsv` cited by its real path. go-spec-reviewer: approved with the naming and ownership notes above applied. Constitution: both paths, named enforcers per boundary, no handler table, findings in docs. 35 criteria, each with a Test Plan row; zero open questions; `node scripts/check-spec.js` zero failures. `fable_recheck` cleared; draft to planned. Sibling consequences reported: data-model (`allow_http`, `allow_local` on the `Upstream` row), observability (`upstream` label under the disclosure statement), proxy-cache (`RangeNotSatisfiable`, the Docker Hub no-cool-down change is invisible to it), conformance-harness (`allow_local` on loopback stand-ins), rubygems (its ranged revalidation cites AC14/AC15), terraform and conan (citations). |
| 2026-10-01 | 4877448 | Fable follow-up: queued cross-spec items since the recheck | A review, narrower than the recheck: the whole of `agents/spec-loop/consequences.md` read, every item targeting this file after the 7ffbd14 row collected (proxy-cache follow-up 2, observability follow-up 2, data-model follow-up 2), each verified against the current text of its source spec and of this one, then read adversarially against the rest of this spec; every earlier item naming this file re-found applied (data-model reconciliation 3, management-api reconciliation 6, proxy-cache reconciliation 5, repository-lifecycle authoring 12 and 13, format batch 1 item 10, batch 3 item 11, batch 4 item 10, batch 5 item 6, rubygems authoring 9). Applied, three of three. (1) proxy-cache follow-up 2 (its "The adapter seam": `*upstream.HostNotAllowedError` as every pre-connection refusal, the off-allowlist host and the scheme, path-escape and local-address rules): "The interface" now defines the type over all four connection rules with a `Rule` field naming which refused, the realm refusal of AC16 included; a closing paragraph under "Credential scoping and the off-origin allowlist" states the one class; AC7 names the type for the scheme and path refusals and AC35 for the local-address refusal, each with its rule; the AC7 and AC35 rows assert the type by `errors.As`; the was-Q10 record gains a dated note. (2) observability follow-up 2 (its catalogue row for `http_client_request_duration_seconds`, "Cardinality", "The telemetry listener", AC5): "Rate limits and the cool-down" states that `upstream` is operator-chosen, discloses as a repository name does and is capped under `telemetry.metrics.name_label_limit` with `_other` past the cap and `0` collapsing every value, and that the client histogram rides this package's transport with `server_address` under the same cap; AC31 says so and scopes its "exactly" to what this package registers; its row gains the histogram's presence and `internal/telemetry/labels_test.go` shared with observability AC5; the requirements row for observability names the cap. (3) data-model follow-up 2 (its entity table, "Upstream configuration and upstream credentials", AC40): the "does not yet carry" sentence on the `allow_local` bullet is a citation of AC40, and the AC22 row names the `internal/upstream/validate_test.go` share with that criterion. Declined: none. Adversarial check of what changed: the widened type needed a `Rule` field, or Composer's `502` could not name why and the proxy's candidate loop could not tell a climbing path from an unlisted host in a log; the sibling's "every refusal the adapter makes before a connection" would read as covering a git location's grammar refusals (userinfo, query, fragment, scheme, a short commit), which decide nothing about a host, so AC34 now says those are a named error that is not `HostNotAllowedError`; AC31's "exactly six" would have contradicted a catalogue row placing a seventh series on this package's transport, so the transport constructor's bullet now names the instrumenting round-tripper, states that it adds no request header (AC4's declared set holds) and is never the propagating one, and the credential kinds' own clients carry the same decoration so `server_address` stays configuration-bounded (the root, allowlisted hosts, a realm, the metadata server, the ECR endpoint). No question raised or adopted; no pinned method, `Request` field, egress inventory or mark root touched. No em-dashes or en-dashes. 35 criteria, each with a Test Plan row; zero open questions; `node scripts/check-spec.js` on this file: zero failures. Sibling consequences reported, not applied: `observability.md` (optional wording: its catalogue row says `server_address` is the upstream host or an allowlisted off-origin host; a credential kind's fixed endpoint, the metadata server or the ECR endpoint, is a third value, still configuration-bounded) and `proxy-cache.md` (optional wording: "every refusal the adapter makes before a connection" is the four connection rules; a git location's grammar refusal, AC34, is a pre-connection refusal of its own type, moot for its candidate loop since a git location is never one of several candidates). Stays planned. |
| 2026-10-08 | e50e8b5 | Fable follow-up: queued cross-spec items since the recheck (round 2) | A review, narrower than the recheck: the whole of `agents/spec-loop/consequences.md` read, every item targeting this file after the 4877448 row collected (the `terraform.md` recheck's item 1, the round-3 `proxy-cache.md` follow-up's item 2, the `conformance-harness.md` gate review's optional item 4), each verified against the current text of its source (`terraform.md`'s was-Q4 as amended at ebf2bc3, its AC18, "The wire surface, as captured" and "The download capability"; `proxy-cache.md`'s "`HEAD` on a proxied route", its was-Q24, its Obligation section's revalidation probe, "The adapter seam" and AC32 with its row; `conformance-harness.md`'s `upstreams` row, "Upstream bindings" and AC19) and of this one, then read adversarially against the rest of this spec. The run was resumed after a session limit cut a first attempt at a six-line partial edit (the Scope bullet and the Terraform requirements row), kept and corrected rather than reverted. Applied, three of three. (1) Terraform recheck item 1, a design change: "How a location reaches the `git` adapter" had the adapter emit an uncompressed tar "which the handler re-packs canonically as it does a hosted archive", which no handler can, since fetch-and-cache commits the bytes it fetched and its hook refuses but never replaces; a judgment between the adapter emitting what is served and `terraform.md` capturing go-getter's `.tar` support, so written in the decision shape as **Q11 and adopted under the standing delegation, owner-facing**: the adapter emits one deterministic gzip-compressed tar (the tree's own depth-first order and git modes, so no format's sorting rule enters this package; links as link entries; a gitlink omitted; owner, group and timestamps zero; one fixed tar format; a gzip header with zero time, no name, a fixed OS byte and a fixed level), committed as fetched and served by `terraform.md` at a `.tar.gz` location with the committed blob's digest as the `checksum`; folded through Scope, the Terraform requirements row, the `git` bullet, the location paragraph, the dependency line (`archive/tar`, `compress/gzip`), the split table's Encoding row (the gzip is content, not a `Content-Encoding`), AC28 (the form, byte identity across two fetches, the gitlink omitted) with a new `internal/upstream/git/stream_test.go` row, AC34 (arrives as the tar AC28 defines; installed from that stream committed as fetched), Phase 4, and a dated withdrawal note on the was-Q9 record. (2) Round-3 proxy-cache item 2: "The interface" states that the method on `Request` is set by the proxy layer and never taken from a client, `HEAD` only for the revalidation probe a handler declares on a mutable document (its was-Q24, AC32), the inbound method absent from the fetch-and-cache request; the split table's request row, the Docker Hub prior-art consequence and "Rate limits and the cool-down" no longer attribute an upstream `HEAD` to the OCI handler but to the probe it declares and the layer sends; AC14 names that `HEAD` as the only one reaching this seam and its row shares `proxy-cache.md` AC32's `internal/proxy/head_test.go`. (3) Conformance-harness item 4 (optional): the `allow_local` bullet and the was-Q10 record cite the harness's `upstreams` row, "Upstream bindings" and AC19 as the flag's consumer. Declined: none. Adversarial check of what changed: determinism is a correctness need and not polish, because `terraform.md` evicts module archives under the quota and re-fetches them, so a stream that differed between two fetches of one commit would commit a second blob for one tree; the stream has no `Content-Length` and its end is the adapter's own, so the truthful-completion rule is restated for it (a clean `io.EOF` means the whole tree, a local failure is an error, never a short clean body) and AC13 is not contradicted; the digest's stability across a change of Go's gzip encoder is not promised and is stated as a cost, with `terraform.md` serving the committed blob's own digest so nothing compares the two; a gitlink entry had no stated fate under "no submodules" and is now omitted; the hosted canonical re-pack's sorted-by-path order is deliberately not imported, since the adapter must stay format-agnostic and git's own tree order is deterministic by construction; the `Request` method field already exists, so AC4's pin is untouched and no field was added for item 2; no pinned method, egress inventory or mark root touched. No em-dashes or en-dashes. 35 criteria, each with a Test Plan row; eleven questions resolved, zero open; `node scripts/check-spec.js` on this file: zero failures. Sibling consequences reported, not applied: `terraform.md` (its was-Q4 record and "The proxied path" may now cite this spec's was-Q11 and AC28 for the stream form instead of "reported to that spec"; the `.tar.gz` served is the adapter's gzip member, byte-identical per commit under one build, and its proxied phase may note that a tree re-fetched after eviction under a new encoder commits a new blob and serves that blob's digest), `proxy-cache.md` (optional: "The adapter seam" may name the git location's body as content-gzip with no `Content-Encoding`, stored as it arrived; its completion-only consumer list may name Terraform's git tree, as the terraform recheck's item 3 already queues), `oci.md` (its recheck, already queued by proxy-cache round-3 item 3: declare the revalidation probe on its tag fetch, which this spec now attributes to that declaration). Stays planned. |
