---
status: draft
status_description: "Authored 2026-09-26 as a grounded first draft: service discovery, the module registry protocol, the provider registry protocol (SHA256SUMS, its detached signature and the signing keys) and the provider network mirror protocol captured from Terraform 1.5.7 and 1.16.4 and OpenTofu 1.6.3 and 1.12.6, the official images pinned by digest, against a logging TLS stub on isolated Podman networks; checked against HashiCorp's four protocol references, the Terraform v1.16.4 and terraform-registry-address sources, the live registry.terraform.io and registry.opentofu.org, OSV's ecosystem list, and the Stackweaver registry at f42afcdc. Eight questions written in decision shape and adopted under the owner's standing delegation; none open. Awaits a /spec review pass."
description: "Spec for the Terraform and OpenTofu registry format: a host-bound, root-anchored discovery document, the module and provider registry protocols and the provider network mirror protocol on one handler, hosted modules and registry-signed providers published through the management API, a proxied path that verifies upstream provider signatures and turns commit-pinned VCS module sources into cached archives, and a download capability for the byte routes no client sends a credential to."
author: michielvha
goal: "Serve Terraform and OpenTofu teams a private module and provider registry and a verified cache of the public registries that terraform and tofu, old and current lines alike, install from with credentials only in their CLI configuration and with a network restricted to this registry."
priority: "low"
issue: 29
created: 2026-09-26
covers:
  - "internal/format/terraform/**"
  - "conformance/terraform/**"
---

# Plan: Terraform and OpenTofu registry format

The Terraform registry family, hosted and proxied, on one handler: the root-anchored service
discovery document, the module registry protocol, the provider registry protocol with its signed
`SHA256SUMS`, and the provider network mirror protocol, which is a separate protocol with its own
URL grammar and its own trust model. Terraform and OpenTofu, each on an older and a current line,
are the oracle on both paths.

## Context

Terraform and OpenTofu sit in Tier 3 of `formats/catalogue.md` as the single-ecosystem family
"Terraform registry" (the row "Terraform / OpenTofu modules and providers"). **Its build is gated
by `project-charter.md` AC9 and `catalogue.md` AC5**: no handler code for a Tier 3 ecosystem exists
before every Tier 1 format has met its definition of done and the owner has recorded a `continue`
verdict at the charter's build step 8. This spec exists now because the owner directed on
2026-09-26 that all 33 ecosystems be specced up front (the catalogue's "Every ecosystem below is
specced now; only building is gated"), so the gate decides what is built and never what is
written; a `shrink` verdict parks it.

**The catalogue keeps Terraform in Tier 3 with one named promotion trigger**, recorded in its
resolved Terraform-promotion decision (was Q6 there): Terraform/OpenTofu is promoted **only when
Stackweaver adopts this registry as the backend for its own module and provider registry**,
recorded as a decision in Stackweaver's documentation. That event turns the port into shared
infrastructure for both platforms, and the promotion is a row move into Tier 1 under the
catalogue's promotion rule; nothing else promotes it. Until then this spec waits behind the gate
like every Tier 3 row, and a promoted build re-reviews it against the foundation as it then
stands, because `/implement` refuses a spec whose last review is stale.

Stackweaver already implements a Terraform registry, which is why the catalogue calls the real
cost of this format "far below its tier position". This spec reads that implementation (Design,
"What carries over from the Stackweaver registry") and the captures below overturn several of its
choices; the port is a starting point, not a reference.

Grounding for this draft, stated up front because the constitution asks for evidence or silence:

- **Captured client traffic.** `which tofu` finds nothing on this host and `terraform` is 1.15.8,
  so the four clients were run as the official images pinned by digest: Terraform 1.5.7, the
  1.5 line's last tag (`docker.io/hashicorp/terraform@sha256:c3bc74e7a2a8fab8216cbbedf12a9637db09288806a6aa537b6f397cba04dd93`),
  Terraform 1.16.4, the newest tag on 2026-09-26
  (`docker.io/hashicorp/terraform@sha256:ae92f87543df118ef3db7a3df238fbec5e03019011463315b2e880718fcc534e`),
  OpenTofu 1.6.3 (`ghcr.io/opentofu/opentofu@sha256:05859ee11410a386b67297d88c831d3ef3be0e22e2f194d4276620397a76eb92`)
  and OpenTofu 1.12.6, the newest tag on 2026-09-26
  (`ghcr.io/opentofu/opentofu@sha256:81051bd41475edc867b0da7e6ccde9bb141aa06cbddb24e10e039b6d26708b7f`).
  The stub was a logging TLS server in a pinned `python:3.13-slim` container
  (`sha256:37134a49d21d2120e4c4d73bb76f8a4ab9aef31f096f7ec2ead48c2feead4332`) listening on 443
  inside its own network namespace, attached to two dedicated Podman networks, one ordinary and
  one `--internal` (no egress), so no host port was taken; it answered for the hostnames
  `registry.test`, `files.test`, `other.test` and `auth.test` under a throwaway CA the clients
  trusted through `SSL_CERT_FILE`, recorded every request with its host and headers, and served
  per-path status and header overrides. Each run used a fresh working directory and a CLI
  configuration file written by the case. The fixtures were genuine: module archives in tar.gz
  and zip, the real `terraform-provider-null` 3.2.4 `linux_amd64` and `darwin_arm64` zips from
  releases.hashicorp.com, and `SHA256SUMS` files signed by throwaway OpenPGP keys (RSA 3072,
  NIST P-256 and Ed25519). The `h1:` package hash computed for the fixture zip
  (`h1:hkf5w5B6q8e2A42ND2CjAvgvSN3puAosDmOJb3zCVQM=`) equals the one Terraform 1.16.4's own
  `terraform providers mirror` wrote for the same zip. The stub is not a reference
  implementation; what the captures prove is what the clients send and how they react.
- **The published contract.** HashiCorp's "Remote Service Discovery", "Module Registry
  Protocol", "Provider Registry Protocol" and "Provider Network Mirror Protocol" references and
  the CLI configuration reference, fetched this run; Terraform v1.16.4's
  `internal/registry/response/module_versions.go`; and terraform-registry-address's `module.go`
  and `provider.go` (the address grammar and case rules).
- **The live upstreams.** registry.terraform.io and registry.opentofu.org sampled directly: both
  discovery documents (`{"modules.v1":"/v1/modules/","providers.v1":"/v1/providers/"}`), a module
  version list and download for `terraform-aws-modules/vpc/aws`, the provider version list and
  `linux_amd64` download document for `hashicorp/null` 3.2.4, their not-found shapes, their
  caching headers, and their case-insensitive name matching.
- **OSV.** `ecosystems.txt` lists no Terraform ecosystem, and a query naming `Terraform` answers
  `invalid ecosystem` (captured 2026-09-26).
- **Prior art.** The Stackweaver registry at `f42afcdc`, read for this spec (Design, "What
  carries over from the Stackweaver registry").

Where the documentation and the captures disagree or the documentation is silent, the captures
win, and the differences are recorded because they would otherwise be built from the documents.
The module protocol reference names only `204` with `X-Terraform-Get`, while both OpenTofu lines
also accept a `200` JSON `location` body and both Terraform lines refuse it (captured). The
provider protocol reference does not mention the version list's `warnings`, which all four
clients print. The registry references say nothing about credentials on download URLs, and no
client sent one to any of them (captured); only the mirror reference states it. The CLI
configuration reference does not document the `host` block, which all four clients honour
(captured).

Six things make this format worth a careful spec. **The discovery document is one per hostname**
and lives at the host root, so it can name only one repository's services and must be
root-anchored (`format-handler-interface.md`, "Routing and registration"). **No client sends a
credential to any byte URL**: module archives, `SHA256SUMS`, its signature, provider zips and
mirror archives were all fetched without `Authorization` on all four clients, even on the same
host that received the token a moment earlier (captured), so a private repository's bytes need a
credential the URL itself carries. **Provider trust is a signature this registry must produce or
verify**: every client refuses a provider whose `SHA256SUMS` signature is missing, armored, made
by an unlisted key or, on Terraform 1.5.7, made by an Ed25519 key (captured). **Module sources on
the public registries are VCS URLs, not archives** (`git::https://github.com/...?ref={commit}`,
captured), so a cache that only relays metadata caches nothing. **The two client families
disagree on the wire**: a JSON download body, key types, and which hashes a mirror install
records. And, the opposite of Julia's finding: **no client falls back to origin when this
registry refuses**, so a refusal here is enforceable whatever the client's network (captured,
Design, "No fallback to origin").

## Blocking preconditions

**The handler interface re-open must complete before this handler starts**, as for every handler
(`format-handler-interface.md` AC8). Terraform is Tier 3, so the catalogue's Tier 1 gate (its AC5)
and the charter's breadth verdict (its AC9, build step 8) both precede it unless the promotion
trigger fires; the re-open is recorded here anyway, from this side, because a gate enforced on one
side only is enforced nowhere. This format brings two inputs to that re-open, stated in Design
and listed in the sibling consequences: a credential the request URL carries rather than a header
(the download capability), and the host binding the root-anchored discovery route resolves.

**The shared signing and index service must be `planned` before Phase 2.** Every hosted provider
version's `SHA256SUMS` is a write-triggered signed document produced by
`docs/internal/plans/foundation/signing-service.md` (to be authored in the spec loop), which the
charter builds at step 7 as the production form of the step 4a prototype
(`write-triggered-services-prototype.md`). What this format requires of it is stated in Design
("What the signing service must provide"), never designed here.

**The management API must be `planned` before Phase 3, and it is the only hosted write path.**
Publishing modules and providers, deleting versions and packages, and deprecating providers are
operations of `docs/internal/plans/foundation/management-api.md` (to be authored in the spec
loop), whose core the charter builds at step 2 and completes at step 9; nothing on any Terraform
wire writes. Phase 1's hosted module reads are testable without it, because the harness's `state`
vocabulary seeds versions through the shared write path.

**The proxied path depends on shared services that are requested, not assumed**: the upstream
adapter behaviour stated in Design ("The proxied path") of
`docs/internal/plans/foundation/upstream-adapters.md` (to be authored in the spec loop, built at
charter step 4), including a commit-pinned VCS fetch, and the OpenPGP verification and package
hash entries requested of `docs/internal/plans/foundation/artifact-verification.md` (to be
authored in the spec loop, built at step 4b). Publish is synchronous on every surface, so nothing
is asked of `docs/internal/plans/foundation/async-operations.md` (to be authored in the spec
loop).

## Scope

**In scope:**

- **Service discovery**: the root-anchored `GET /.well-known/terraform.json`, answered per
  request hostname from the host binding (the resolved discovery-binding decision below), naming
  the bound repository's `modules.v1` and `providers.v1` services under the format-first mount.
- **The module registry protocol** under `/terraform/{repository}/modules/v1/`: the version list
  and the version download, answered `204` with `X-Terraform-Get`.
- **The provider registry protocol** under `/terraform/{repository}/providers/v1/`: the version
  list, with `protocols`, `platforms` and `warnings`, and the per-platform download document with
  `download_url`, `shasums_url`, `shasums_signature_url`, `shasum` and `signing_keys`.
- **The provider network mirror protocol** under `/terraform/{repository}/mirror/v1/`:
  `{hostname}/{namespace}/{type}/index.json` and `{hostname}/{namespace}/{type}/{version}.json`,
  with `h1:` and `zh:` hashes.
- **The byte routes** those documents point at (module archives, `SHA256SUMS`, its signature,
  provider zips, mirror archives), each authorized by a download capability the URL carries (the
  resolved download-capability decision below), and `HEAD` on each, which the module fetcher
  sends first (captured).
- **Hosted modules** published through the management API as archives, validated and stored as a
  canonical re-pack, and served with a `checksum=sha256:` the clients verify (captured).
- **Hosted providers** published through the management API with every platform zip in one
  write, their `SHA256SUMS` generated and signed by the shared signing service under the
  repository's own OpenPGP key (the resolved provider-signing decision below).
- The management operations the ecosystem expresses and no client drives: publish (module and
  provider), delete a version, delete a package, deprecate and undeprecate a provider (the
  `warnings` line all four clients print), with the retirement set and the write-boundary
  declaration `data-model.md` requires.
- Name, version and case rules: provider namespaces and types lowercased as the clients send
  them, module namespaces and names matched case-insensitively as both public registries do, the
  address grammar of terraform-registry-address, and semantic versions with pre-releases.
- Non-interactive authentication in the one form both clients send: `Authorization: Bearer` from
  a `credentials` block or a `TF_TOKEN_{host}` variable, keyed by the hostname in the address.
- The per-route addressed objects `auth.md`'s pattern scopes evaluate, and the `403` rendering of
  a shared policy refusal on every route.
- **The proxied path** against an upstream module and provider registry (registry.terraform.io,
  registry.opentofu.org or a private one): version lists as mutable metadata with a TTL, provider
  packages verified against the upstream's signature before commit and served both over the
  provider registry protocol and over the network mirror protocol, module sources fetched and
  repacked when they are archives or commit-pinned VCS sources on an allowlisted host (the
  resolved VCS-source decision below), negative caching, and this format's rows of the removal
  table.
- **Virtual repositories**, resolved per package in member order (the resolved virtual-resolution
  decision below).
- Terraform 1.5.7 and 1.16.4 and OpenTofu 1.6.3 and 1.12.6 as the conformance oracles on both
  paths, with the client network restricted to this registry and its stand-ins.

**Out of scope for v1**, each with its reason, recorded because the interface spec's definition
of done requires the deliberately unimplemented surface to be named:

- **The TFE and HCP Terraform APIs**: the `tfe.v2`, `tfe.v2.1` and `tfe.v2.2` services
  Stackweaver's discovery document names, workspaces, runs, and the TFE private-registry
  management resources (`registry-modules`, `registry-providers`, `gpg-keys`). They are
  Stackweaver's product surface, not a package protocol: no `terraform init` or `tofu init`
  requests them, and management of this registry's content belongs to
  `docs/internal/plans/foundation/management-api.md` (to be authored in the spec loop), which a
  Stackweaver that adopts this registry calls from its own TFE-compatible surface.
- **`login.v1` and `terraform login`.** An interactive browser flow; conformance and CI provision
  tokens through the CLI configuration (captured working through a `credentials` block and
  through a `TF_TOKEN_{host}` variable), and a human-facing login is UI-era work.
- **Module and provider listing, search and "latest" routes** (`/v1/modules`,
  `/v1/modules/search`, `{namespace}/{name}/{system}` without a version, the version-less
  download, `/v2/.../downloads/summary`). No pinned client requested any of them in any capture;
  they serve the registry website, and they answer `404`.
- **Module documentation extraction** (inputs, outputs, README, submodules, as Stackweaver's
  `ModuleParser.ParseModule` produces). No client consumes it: Terraform v1.16.4's
  `ModuleVersion` response type carries only `version`, `root` and `submodules`, and every
  captured install succeeded on version lists carrying `version` alone. It returns with the
  web UI at charter step 9.
- **Module deprecation.** registry.terraform.io serves a `deprecation` member on module versions
  (captured `"deprecation":null`), but a version list carrying a populated `deprecation` produced
  no output on any of the four clients (captured), and the CLI's response type has no such
  field. With no client-visible effect there is no oracle, so the operation is not offered;
  provider deprecation, which clients do print, is.
- **Proxying a network mirror as an upstream.** A mirror carries no signature, so a provider
  fetched through one would enter the cache with no verification beyond the upstream's own hash
  claim, while the same package is reachable through its origin's registry protocol with the
  author's signature; chaining two instances of this registry is `replication.md`'s job.
- **Publisher-signed provider releases and a signing-key management surface.** The signature a
  client checks is the one this registry serves under keys it lists itself, so a publisher key
  adds a surface with no client-visible effect (the resolved provider-signing decision below).
- **registry.opentofu.org's `packages` extension** (per-platform `zh:` and `h1:` hashes and sizes
  in the download document, observed live). No pinned client's capture depended on it, so it is
  neither served nor required; the drift job re-grounds it.
- **Git, or any VCS, on the client wire.** This registry never serves a repository over git; a
  VCS module source is the upstream adapter's input on the proxied path (the resolved VCS-source
  decision below) and never reaches a client from a hosted repository.
- **Filesystem mirrors, `terraform providers mirror` as a server feature and developer
  overrides.** They are client-local configurations with nothing on the wire.

## Design

### The wire surface, as captured

Every repository route hangs off `/terraform/{repository}/`, format-first per
`format-handler-interface.md`'s resolved URL-shape decision; the discovery document is the one
root-anchored route. The service URLs the discovery document names, and every URL a response
names, are **relative**: all four clients resolved `X-Terraform-Get`, `download_url`,
`shasums_url`, `shasums_signature_url`, a mirror archive `url` and a discovery service URL
against the URL of the response that carried them, per RFC 3986 (captured with root-relative and
`../` forms), which the protocol references also state. The handler therefore never needs the
externally visible base URL, unlike npm.

| Surface | Shape, as the pinned clients send it |
|---|---|
| Discovery | `GET /.well-known/terraform.json`, `Accept: application/json`, `User-Agent: HashiCorp Terraform/1.16.4 (+https://www.terraform.io)` (Terraform) or `OpenTofu/1.12.6` (OpenTofu), with `Authorization: Bearer` when the CLI configuration holds credentials for the hostname. Fetched once per hostname per run, and **not at all** when a CLI `host` block supplies that hostname's services (captured). A `401` fails the command with "failed to request discovery document: 401 Unauthorized" on all four |
| Module versions | `GET {modules.v1}{namespace}/{name}/{system}/versions`, `User-Agent: Terraform/1.16.4` or `OpenTofu/1.12.6`, `X-Terraform-Version`, the Bearer credential. `~> 1.0` selected `1.1.0` over `2.0.0-beta1`, and an exact `2.0.0-beta1` installed it; an empty list fails with "Module has no versions" |
| Module download | `GET {modules.v1}{namespace}/{name}/{system}/{version}/download`, same headers. Every client accepts `204` with `X-Terraform-Get`. Only OpenTofu accepts `200` with a JSON `{"location": ...}` body; Terraform 1.5.7 and 1.16.4 fail with "failed to get download URL ... 200 OK resp:". A `302` to the archive fails on **all four**, which follow it (with the Bearer credential) and then try to parse the archive as the answer (captured) |
| Module archive | The `X-Terraform-Get` location, fetched by go-getter as `HEAD` then `GET`, `User-Agent: Go-http-client/1.1`, **no `Authorization`**, even on the host that just received it. tar.gz and zip by extension, `?archive=tar.gz` for an extension-less URL, `//{subdir}` selecting a directory inside the unpacked archive, unknown query parameters passed through to the request verbatim, and `?checksum=sha256:{hex}` removed from the request and verified against the downloaded file: a wrong one fails with "Checksums did not match" on all four (captured) |
| Provider versions | `GET {providers.v1}{namespace}/{type}/versions`, the service headers. `warnings` strings are printed as "The remote registry returned warnings for ..." after a successful install, and not printed when the install fails (captured) |
| Provider download | `GET {providers.v1}{namespace}/{type}/{version}/download/{os}/{arch}`, the service headers. Then `SHA256SUMS`, its signature and the zip, in that order, `User-Agent: Terraform/1.16.4` or `OpenTofu/1.12.6`, **no `Authorization`** (captured, same host and other host alike) |
| Provider trust | The signature must be a **binary** detached OpenPGP signature (armored: "openpgp: invalid data: tag byte does not have MSB set" on all four) by **any one** of the listed `gpg_public_keys` (two keys listed, the second signing: accepted on all four). An empty key list or an absent `signing_keys` member is refused on all four, OpenTofu included ("authentication signature from unknown issuer"). RSA and NIST P-256 keys verify on all four; **an Ed25519 key is refused by Terraform 1.5.7** ("openpgp: unsupported feature: public key type: 22") and accepted by the other three. The zip's SHA-256 must equal both `shasum` and its `SHA256SUMS` line |
| Provider lock | A registry install records `h1:` for the installed zip and `zh:` for **every line** of `SHA256SUMS` (captured with a two-line file) on all four |
| Mirror index | `GET {mirror}{hostname}/{namespace}/{type}/index.json`, then `{version}.json`, both with the Bearer credential for the mirror's host; the archive without one. No discovery request is made. A mirror archive is verified against the `h1:` or `zh:` hashes the version document lists (a wrong `h1:` or `zh:` refused on all four); with no `hashes`, the archive is installed unverified, as the mirror reference states (captured) |
| Mirror lock | A mirror install records the locally computed `h1:`; OpenTofu 1.12.6 alone also records the mirror's `zh:`. `providers lock -platform=linux_amd64 -platform=darwin_arm64 -net-mirror=...` downloads each platform's archive (captured) |
| Case | Clients lowercase a provider's namespace and type before building the URL (`registry.test/ACME/Null` requested `acme/null`), and send a module's namespace and name with the configured case (`Acme/Vpc` requested as written); the hostname is case-folded (captured). Both public registries match module and provider names case-insensitively (captured live) |

**Error rendering**, captured, because a refusal nobody can read is a refusal nobody can act on:
a `403` with a JSON body on the module download route prints the body verbatim ("403 Forbidden
resp:{"errors":[...]}") on all four; a `403` on a module archive prints "bad response code: 403";
a `403` on the provider download document is reported as "host registry.test rejected the given
authentication credentials" on all four, the body unprinted; `410` and `451` there print the
status line ("could not query provider registry ...: 451 Unavailable For Legal Reasons"); a `404`
there becomes "does not have a package available for your current platform"; a `500` is retried
once and then reported ("request failed after 2 attempts"); a `403` on a mirror version document
is reported as a credential rejection, and a `403` on a provider zip as "unsuccessful request to
{url}: 403 Forbidden".

### No fallback to origin

`julia.md` found that every refusal sends Pkg to origin, so a refusal is enforceable only where
the client's egress is restricted. Terraform and OpenTofu do not do that, captured on all four:

- A module address names its host. There is nothing else to try: a refused or missing module
  fails the command.
- A provider installed through the registry protocol comes from the host its address names; there
  is no second source unless the CLI configuration adds one.
- With `provider_installation { network_mirror { ... } }` alone, a refused (`403`) or missing
  (`404`) provider fails with no request to any other host.
- With `network_mirror` and `direct {}` both listed, on a network with egress, a mirror `403` on
  the selected version's document failed the install **without** retrying the origin, and a
  mirror `404` on the index still led the client to ask the mirror for the version document and
  fail ("provider mirror does not have archive index for previously-reported ... version"); in
  both runs the origin was reachable and the install still failed. On a
  network without egress, the unreachable `direct` source failed the whole resolution even though
  the mirror held the provider, which is why the recipe below lists the mirror alone.

A policy refusal on this format therefore holds whatever the client's network allows, and the
conformance cases assert it with egress **open** (AC14). The one egress a client makes on its own
is a module location this registry passes through (the resolved VCS-source decision below), and
that is a location this registry chose to serve, never a fallback.

### Discovery, host binding and the root anchor

The discovery document is per hostname and sits at the host root, so it cannot carry a repository
in its path and can name one set of services per hostname. Per the resolved discovery-binding
decision below:

- **Each hostname this registry answers for is bound to at most one Terraform repository**,
  usually a virtual one, by instance configuration handed to the handler at construction (the
  same kind of value as the external base URL npm's rewriting needs; no table and no repository
  document is involved). A request for `/.well-known/terraform.json` on a bound hostname answers
  `200`, `Content-Type: application/json`, with relative service URLs into the bound repository's
  format-first space: `{"modules.v1": "/terraform/{repository}/modules/v1/", "providers.v1":
  "/terraform/{repository}/providers/v1/"}`. On an unbound hostname it answers `404`, which the
  discovery reference defines as "the host supports no Terraform-native services".
- **Only the discovery document is root-anchored**, exactly as `format-handler-interface.md`
  anticipated: the handler's `Mounts()` returns the format-first `/terraform/` and the
  root-anchored `/.well-known/terraform.json`, and the registration layer accepts the second
  only because this spec records the carve-out (that spec's AC11). The mount is the single path,
  not `/.well-known/`, so no other ecosystem's well-known document can collide with it.
- **Every other repository is reachable without a hostname of its own** through the CLI `host`
  block, which replaces discovery for a hostname and was honoured by all four clients (captured:
  no discovery request, services taken from the block, and the credential configured for that
  hostname sent to the configured service URLs). The same block is how a proxied repository of a
  public registry is reached under the public registry's own name, so existing sources such as
  `terraform-aws-modules/vpc/aws` need no rewriting (captured with `registry.terraform.io` and
  `registry.opentofu.org` overridden).
- **A bound hostname must contain a dot**, because terraform-registry-address refuses a module
  host without one ("must contain at least one dot").
- **The document itself is authorized as a read of the bound repository** with the addressed
  object none (below), the precedent Galaxy's discovery and Cargo's `config.json` set: a
  credential-less request for a private bound repository answers `401`, and a valid token
  lacking `pull` answers `404`, as for any read of that repository. The binding itself is not
  repository content: an unbound hostname answers `404` and a bound one does not, so binding a
  hostname publishes that the hostname serves Terraform, and the service URLs publish the bound
  repository's name to whoever may read it, both the operator's choice.

### The download capability

No client sends a credential to a byte URL (captured on all four, for module archives, provider
`SHA256SUMS`, signatures and zips, and mirror archives, on the same host and on another), and the
mirror reference states it outright. A private repository's bytes therefore need a credential
the URL carries. Stackweaver met exactly this (its AUD-147 artifact token); per the resolved
download-capability decision below this registry meets it with the shared token service rather
than a scheme of its own:

- Every metadata response this handler serves to an authenticated caller (a module download, a
  provider download document, a mirror version document) names its byte URLs with a **download
  capability** as a path segment: `/terraform/{repository}/-/c/{capability}/...`. The segment
  `-` sits where the fixed `modules`, `providers` and `mirror` segments sit, so no service path
  can collide with it.
- The capability is minted by `auth.md`'s token service, the JWT machinery it already specifies
  for OCI: algorithm fixed by configuration and never read from the token, a dedicated rotatable
  key selected by `kid`, and an expiry measured in minutes. It carries the repository, `pull`,
  the principal and **the exact object** the byte route addresses (below), so it can fetch that
  version's bytes and nothing else, and it can never carry more than the minting request's own
  scope, pattern included.
- The byte route's object is the one the capability names or the request is refused `401`; an
  expired or foreign capability is refused `401`, never served as anonymous (`auth.md` AC12).
  The check happens when the request starts, so a long download is not cut off mid-body.
- The capability's lifetime is its revocation window, exactly as for an issued OCI token
  (`auth.md` AC5): revoking the caller's credential stops new metadata responses at once and
  leaves already-minted capabilities valid until they expire.
- A capability is a credential in a URL, so request logging, error bodies, metrics and the
  conformance corpus must redact the segment (`auth.md` AC7, `conformance-harness.md` AC13); the
  handler reports where it sits and the shared layer verifies and redacts it, because a handler
  that verifies credentials is an auth check in a handler. How the shared layer learns the
  segment is an input to the interface re-open (sibling consequences).
- A caller with no credential on an anonymously readable repository gets byte URLs with no
  capability segment, and the byte routes serve it as the anonymous principal.

### Provider trust, signing and the lock file

What a client verifies (captured): a binary detached signature over `SHA256SUMS` by any listed
key; the zip's SHA-256 equal to `shasum` and to its `SHA256SUMS` line; and, afterwards, the lock
file's hashes. What that makes this registry responsible for, per path:

- **Hosted**: this registry is the signer. Per the resolved provider-signing decision below, the
  publish generates `SHA256SUMS` from the zips it received (one line per platform zip, plus the
  `manifest.json` when the publish carries one, as HashiCorp's release does, captured), has the
  shared signing service sign it with the repository's OpenPGP key, and serves that key as the
  one entry of `signing_keys`. Clients print "Installed ... (self-signed, key ID {id})" on
  Terraform and "(signed, key ID {id})" on OpenTofu (captured). The key is **RSA**, because
  Terraform 1.5.7 refuses Ed25519 (captured).
- **Proxied**: the upstream author is the signer. The proxy verifies the upstream signature
  against the upstream's listed keys before committing anything, then serves the upstream's
  `SHA256SUMS` and signature bytes verbatim with the upstream's `signing_keys`, so a client
  verifies exactly what it would have verified at origin, and the lock-file hashes equal the
  origin's.
- **Mirror**: the protocol has no signature at all, and a mirror version document without hashes
  makes the client install unverified (captured). This registry therefore serves a mirror archive
  only after the same verification the proxied path performs, and lists for every archive the
  `zh:` from the verified `SHA256SUMS` and, once the zip is held, its `h1:`, so every client
  verifies what it downloads.

The lock file makes a provider version's contents a promise: a registry install records `zh:` for
every platform line of `SHA256SUMS` (captured), and a later change to any of those bytes breaks
every lock file that recorded them. Hence the resolved platform-set decision below: a hosted
provider version's platform set and bytes are fixed at its publish.

### What carries over from the Stackweaver registry

The Stackweaver registry at `f42afcdc` (read-only for this spec): discovery in
`HandleServiceDiscovery` (`backend/internal/api/v2/handlers/registry.go`, registered on the root
route `/.well-known/terraform.json` in `backend/internal/api/routes/routes.go`), module and
provider protocol handlers in `backend/internal/api/v2/handlers/registry_modules.go` and
`registry_providers.go`, publishing in `registry_publishing.go` and
`registry_provider_publishing.go`, the download token in `registry_artifact_token.go`, and the
services in `backend/internal/services/registry/`.

**Carries over**, as behaviour this spec keeps:

- The protocol route shapes under a service prefix and the provider download document's field
  set (`ProviderDownloadResponse` in `registry_protocol_types.go`), which match the protocol
  reference and the captures.
- **The need for a URL-borne download credential.** `mintArtifactToken` exists because, in its
  file's own comment, the provider install protocol fetches `download_url`, `shasums_url` and
  `shasums_signature_url` "WITHOUT sending registry credentials", which the captures confirm on
  all four clients, and for module archives and mirror archives too, not only for providers.
- Ingest hygiene: zip-slip and per-file size checks on module archives
  (`ModulePublisher.PublishVersionFromTarball`) and the filename grammar for provider zips.
- OpenPGP through `github.com/ProtonMail/go-crypto/openpgp`, a maintained library, for the
  verification this registry performs.
- Its own reason for refusing to hold publisher keys (AUD-106) survives in a different form: the
  handler holds no key at all, because signing is the shared service's.

**Does not carry over**, each for a captured or recorded reason:

| Stackweaver behaviour | Why not |
|---|---|
| Module download answers `302` to a presigned object-storage URL (`DownloadModule`) | All four clients follow the redirect and then parse the archive as the download answer, failing (captured). This registry answers `204` with `X-Terraform-Get` (AC5) |
| The artifact token is an HMAC over a hand-built `{scope}:{expiry}` payload in `?token=` | `auth.md`'s "Nothing is invented" forbids a custom token scheme; the shared token service already specifies a short-lived signed token (the resolved download-capability decision) |
| Presigned object-storage URLs for bytes | A handler never opens storage directly, and the blob read is the policy-enforcing call (`supply-chain-policy.md`); a presigned URL bypasses both |
| The namespace is the organization, and a provider lookup ignores its namespace column | Namespaces here are free within a repository and a repository is chosen by host binding, so a proxied repository keeps its upstream's namespaces (the resolved discovery-binding decision) |
| Publishers upload `SHA256SUMS` and a signature per platform, each upload overwriting the version-wide pair; armored signatures are accepted | A per-platform overwrite changes bytes lock files already recorded; an armored signature is refused by all four clients (captured). This registry generates and signs one `SHA256SUMS` per version at publish (AC8) |
| `ValidateSemanticVersion` refuses pre-releases and build metadata | All four clients resolve pre-releases correctly (captured); refusing them removes a working ecosystem feature |
| Provider "latest" and listings ordered by `version DESC` as a string | Version order is semantic-version order |
| VCS publishing through a GitHub App clone (`PublishFromGitTag`) | A VCS integration is a management-API client's concern; under the promotion trigger Stackweaver keeps it and calls this registry's publish |
| `tfe.v2*` and `login.v1` in the discovery document | Out of scope (Scope) |

### Mapping onto the shared model

The levels are exactly those `data-model.md` provides; no table is added.

- **One repository holds modules and providers.** A module is a `Package` named
  `{namespace}/{name}/{system}` with its published spelling; a provider is a `Package` named
  `{namespace}/{type}`, lowercase. The two can never collide: a module name has three segments
  and a provider name two, and neither grammar admits `/`.
- **`Version.version`** holds the canonical semantic version with no `v` prefix. A module
  version's document records the archive's digest, the `//subdir` when one applies, and on the
  proxied path the upstream location it was built from. A provider version's document records
  `protocols`, and per platform the `os`, `arch`, filename, zip digest and `h1:`, plus the
  signing key id.
- **Files**: a module version holds one archive; a provider version holds each platform zip,
  `SHA256SUMS`, `SHA256SUMS.sig` and the optional `manifest.json`, every one keyed by CAS digest.
  On the proxied path the files arrive platform by platform as cache materialisation.
- **The package-level document** holds the retirement set of deleted versions and, for a
  provider, the deprecation text served as a `warnings` line.
- **The repository-level document** of a hosted repository names the signing key the service
  holds for it; a remote repository's holds the upstream's cached discovery document and its
  canonical hostname, which the mirror routes answer under.

### The hosted publish path and what counts as a write

Nothing on any Terraform wire writes, and no client publishes. The hosted path is fed by the
registry-owned management API, `docs/internal/plans/foundation/management-api.md` (to be authored
in the spec loop). Per the cross-format precedent (`pypi.md`'s resolved hosted-yank decision, with
`npm.md`, `cargo.md`, `hex.md`, `cran.md` and `julia.md`), each operation is one completed logical
write through the shared write path, authorized in the settled `(repository, action)` vocabulary
with no new action, hosted only, its trigger verified by this registry's integration tests and
its effect by the real clients (`docs/internal/analysis/management-surfaces-and-the-oracle.md`:
Terraform is a format whose every management trigger has no client). What this format
**requires** of that API, stated rather than designed:

| Operation | What the operation carries | Effect a client sees | Action |
|---|---|---|---|
| Publish a module version | The coordinate `{namespace}/{name}/{system}/{version}` and one archive (tar.gz or zip) | The version appears in the version list and a fresh `init` installs exactly its tree, verifying the served `checksum` | `push` |
| Publish a provider version | The coordinate `{namespace}/{type}/{version}`, every platform zip, optionally the `manifest.json` and a publisher `SHA256SUMS` used only as a cross-check, and `protocols` when no manifest supplies them | The version appears with every platform; `init` on each platform verifies the registry's signature and records `zh:` for every platform | `push` |
| Delete a version | Package and version | It leaves the version list, its download routes and byte routes answer `404`, and its coordinate is retired | `delete` |
| Delete a package | Package | Every version leaves and is retired; the `Package` row survives (`data-model.md`, "A package outlives its versions") | `delete` |
| Deprecate or undeprecate a provider | Package and a message | The version list carries the message in `warnings`, printed by all four clients after a successful install (captured); undeprecate removes it | `push` |

What this registry enforces on ingest:

- The body is spooled to a bounded temporary buffer outside the CAS. A module archive must be a
  tar.gz or zip whose entries are regular files, directories and relative symlinks that stay
  inside the tree; an absolute path, a `..` escape, a hard link or a device file is refused with
  `422`, nothing committed. The accepted tree is stored as a **canonical re-pack** (entries
  sorted, owner and group `0`, modification time `0`, modes `0644` and `0755`), so the digest a
  client verifies is of bytes this registry wrote and one tree always yields one digest, which
  is what makes the `checksum` stable across republish attempts.
- A provider zip must be a zip named `terraform-provider-{type}_{version}_{os}_{arch}.zip`, the
  form both public registries serve (captured); a publisher `SHA256SUMS` that disagrees with any
  zip's computed digest is refused with `422`.
- **Names**: a module namespace and name match `^[0-9A-Za-z](?:[0-9A-Za-z-_]{0,62}[0-9A-Za-z])?$`
  and a system `^[0-9a-z]{1,64}$` (terraform-registry-address's `moduleRegistryNamePattern` and
  `moduleRegistryTargetSystemPattern`); a provider namespace admits letters, digits, dashes and
  underscores and a type letters, digits and dashes, neither with a leading or trailing dash or
  underscore, and both are stored lowercased as the clients send them (`ParseProviderPart`,
  `normalizeProviderNamespace`). A module name equal to an existing one under ASCII case folding
  is refused with `409`, because both public registries and this one match case-insensitively
  and two such modules would be one address.
- **Versions** are semantic versions, pre-releases and build metadata allowed; a leading `v` is
  stripped at ingest and never served.
- **A coordinate that already exists is refused with `409`**, and so is a retired one, with any
  bytes, including after the deleting snapshot has been pruned: the cross-format retirement rule.
  A module republished with a tree whose canonical re-pack has the same digest is idempotent and
  creates no snapshot, the CI-retry case.
- A provider publish to a proxied or virtual repository, and every management operation there,
  answers `405`.

`data-model.md` requires each format spec to declare its ecosystem's write boundaries. Terraform's
declaration:

- **One publish is one completed logical write**: a module version and its archive, or a provider
  version with every platform zip and its signed `SHA256SUMS`, in one snapshot.
- **Each deletion is one write** however many versions it removes, the retirement set updated in
  the same write; a retention pass is one write.
- **Each deprecation and undeprecation is one metadata-only write.**
- A proxied repository creates no snapshots; version lists, download documents and bytes arriving
  from an upstream are cache materialisation.

### Every hosted `SHA256SUMS` is a write-triggered signed document

A hosted provider version's `SHA256SUMS` and signature are produced by the shared signing service
inside the publish write and stored as files of the version; they are never rendered on request.
Unlike Debian's `Release` or Julia's registry there is no repository-wide index to regenerate: the
signed document is per version, so concurrent publishes of different versions never contend on
one document, and a publish touches nothing another version holds. A repoint restores exactly the
versions, and so the signatures, of the snapshot it targets; a pointer moved backwards across a
deletion must preserve the retirement set (`data-model.md` AC33's obligation on the management
surface).

### What the signing service must provide

Stated so the dependency on `docs/internal/plans/foundation/signing-service.md` (to be authored in
the spec loop) cannot be lost, and precisely enough that the service can be specced against it:

1. **An OpenPGP RSA key of at least 3072 bits per hosted Terraform repository**, and a signing
   operation that takes the `SHA256SUMS` bytes and returns a **binary** detached signature. RSA,
   because Terraform 1.5.7 refuses an Ed25519 key; binary, because every client refuses an armored
   signature (both captured). The handler submits bytes and receives the signature; it never sees
   the private key, which an architecture test asserts as `write-triggered-services-prototype.md`
   AC5 does for Debian.
2. **The public key's ASCII armor and its 16-hexadecimal-digit key id**, which the download
   document lists as `ascii_armor` and `key_id`.
3. **Synchronous signing inside the publish write**, one document per provider version, within a
   client-facing management request's latency budget; there is no asynchronous half.
4. **Rotation without re-signing.** After a rotation new versions are signed with the new key and
   every existing version keeps the signature it has, its download document listing the key that
   signed it; all four clients accept a signature by any listed key (captured with two keys), so a
   rotation is invisible to clients, the opposite of Hex. Retiring a key outright (compromise)
   re-signs every version it signed, as one write.

Verification of upstream signatures is not the signing service's: it belongs to the verification
producer below.

### What artifact verification must provide

Of `docs/internal/plans/foundation/artifact-verification.md` (to be authored in the spec loop), per
`supply-chain-policy.md`'s resolved verification-ownership decision:

1. **An OpenPGP detached-signature verification entry** that takes `SHA256SUMS` bytes, a signature
   and the key set an upstream download document lists, and answers verified (with the key id) or
   failed with the client's own semantics: a binary signature by any listed key, RSA, ECDSA and
   Ed25519 keys accepted, as the current clients accept them (captured). A verified result is the
   verdict `supply-chain-policy.md` consumes for signature rules, the identity being the upstream
   and the key id.
2. **The Terraform package hash (`h1:`)** of a zip, computed over its entries as
   `terraform providers mirror` computes it (captured equal for the fixture), from bytes that have
   been verified, before any mirror response lists it. A handler computing it inline would put an
   integrity primitive in a handler.

### The proxied path

The handler owns the request and classifies for the proxy layer's fetch-and-cache API per the
settled decisions in `proxy-cache.md`. The upstream is a registry hostname
(`registry.terraform.io`, `registry.opentofu.org` or a private registry), validated at
configuration by fetching its discovery document and requiring `modules.v1` or `providers.v1`
(AC23). What this format requires of `docs/internal/plans/foundation/upstream-adapters.md` (to be
authored in the spec loop):

- **Discovery of the upstream**: fetch `/.well-known/terraform.json`, follow a redirect, resolve
  relative service URLs, and cache the document as mutable metadata (live: `max-age=3600` on
  registry.terraform.io, `max-age=14400` with an `ETag` on registry.opentofu.org).
- **Cross-host artifact fetches**: provider bytes live on another host (releases.hashicorp.com for
  registry.terraform.io; GitHub release assets for registry.opentofu.org, which answer `302` to
  `release-assets.githubusercontent.com`, captured live), so the adapter follows redirects across
  hosts, restricted to an **artifact-host allowlist** configured per remote repository, and never
  forwards an upstream credential to any host but the configured registry.
- **Both module location forms**: `204` with `X-Terraform-Get` (registry.terraform.io) and `200`
  with a JSON `location` (registry.opentofu.org, whose module and provider documents are also
  served as `application/octet-stream`, captured).
- **A commit-pinned VCS fetch**: the tree of one commit, named by 40 hexadecimal digits, from an
  `https` git URL on an allowlisted host, every object verified with collision-detecting SHA-1,
  with no credential and a size bound (the resolved VCS-source decision below).

Classification and behaviour:

- **Version lists are mutable metadata with the proxy layer's TTL**, revalidated conditionally
  where the upstream allows it (registry.terraform.io sends `Last-Modified`, registry.opentofu.org
  an `ETag`, captured). Entries pass through as the upstream serves them, `platforms`,
  `protocols` and `warnings` included.
- **A provider package is an immutable artifact bundle**: on the first request for a version and
  platform, the handler fetches the upstream download document, `SHA256SUMS`, the signature and
  the zip, and commits none of them unless the signature verifies against the listed keys through
  the entry above and the zip's SHA-256 equals both `shasum` and its `SHA256SUMS` line; the zip
  streams to the initiating client under stream-and-verify on its digest. The upstream's
  `signing_keys`, `SHA256SUMS` and signature bytes are served verbatim, so the client's own
  verification and its lock-file hashes are exactly the origin's.
- **Served over two protocols from one cache.** The provider registry protocol answers under the
  remote repository's `providers.v1`, for clients that reach it through a `host` block or a bound
  hostname; the network mirror protocol answers `{hostname}/{namespace}/{type}/...` for the
  upstream's canonical hostname only, a request naming another hostname answering `404`. A mirror
  version document lists every platform the upstream's version entry lists, each with its `zh:`
  from the verified `SHA256SUMS` and, once cached, its `h1:`; an archive not yet cached is fetched
  and verified on its first request.
- **Module versions are immutable artifacts built from the upstream location** (the resolved
  VCS-source decision below): an archive location (http or https, any `checksum` it carries
  verified) or a commit-pinned VCS location on an allowlisted host is fetched through the adapter,
  canonically re-packed exactly as a hosted archive, stored with the `//subdir` recorded, and
  served as `X-Terraform-Get` with this registry's capability and `checksum`. Any other location
  (a branch or tag `ref`, an unpinned VCS URL, a host outside the allowlist, a scheme the adapter
  does not speak) is **passed through verbatim** and recorded, operator-visible, as uncached; the
  client may then fetch it itself if its network allows.
- **Missing resources are negatively cached** with the short TTL: registry.terraform.io answers a
  missing provider or module with `404` and `{"errors":[...]}`, registry.opentofu.org with `404`
  and, for a provider, an HTML body (captured); both are authoritative not-found. A `429` or `5xx`
  is never cached as absence (`proxy-cache.md` AC9).
- **URL rewriting** is total and relative: every URL a proxied response names is this registry's
  (with its capability), except a passed-through module location.
- **Publish and every management operation against a remote repository answer `405`.**

Upstream removal maps onto the settled purge-or-flag table as this format's side of that contract:

| Upstream event, as observed at revalidation or fetch | Classification |
|---|---|
| A version disappears from an upstream version list, or its download document answers `404` | Keep serving the cached package, record an operator-visible divergence; the wire carries no reason |
| A cached provider version's upstream `SHA256SUMS`, signature, keys or zip bytes differ from those cached | An immutability violation: keep serving the cached bundle, record the divergence and alert the operator, never replace bytes lock files recorded |
| A cached module version's upstream location changes | Keep serving the cached archive, record the divergence |
| `warnings` appear or change on a provider's version list | An ordinary metadata change, propagated at the next revalidation |
| A fetched signature fails, or a zip or archive fails its digest or `checksum` | An integrity failure at fetch: nothing committed, no negative entry, the operator alerted, the next request tries again |

Nothing on this wire is an explicit security signal, and OSV defines no Terraform ecosystem
(captured), so no feed advisory can name a Terraform coordinate: **the shared security-signal rule
never fires for this format in v1**, and an advisory-dependent policy rule attached to a Terraform
repository is refused at configuration, as `supply-chain-policy.md` refuses any rule that cannot
bind. Coordinate rules and signature-verdict rules do bind. Detection is passive, per
`proxy-cache.md`'s resolved passive-detection decision (was Q12).

Per the resolved preconfigured-upstream decision below, neither public registry is preconfigured
in v1.

### Virtual repositories, and why Terraform can have what Hex cannot

`hex.md` found virtual repositories impossible because every registry resource is signed under the
repository's own name. Nothing on this wire names the repository serving it: a provider's
signature covers one version's `SHA256SUMS` and the keys ride in that version's own download
document, and module versions are unsigned. A `virtual` Terraform repository is therefore
expressible, and per the resolved virtual-resolution decision below:

- **Resolution is per package, in member order**: the first member holding any version of
  `{namespace}/{name}/{system}` or `{namespace}/{type}` answers every request for that package,
  its version list and its downloads alike; version lists are never merged. A hosted member placed
  first therefore shadows a same-named package upstream entirely, which is the dependency-confusion
  defence, and two remotes whose upstreams serve different bytes under one name (registry.opentofu.org
  and registry.terraform.io serve different `hashicorp/null` 3.2.4 zips, `shasum` `3d106c7e...`
  against `9d32ac36...`, captured live) never have their versions mixed into one list a lock file
  could straddle.
- **The mirror protocol resolves by hostname first**: a request under `{hostname}` goes to the
  first remote member whose upstream's canonical hostname it is; for a hostname bound to the
  virtual repository itself, the hosted members answer, so private providers and proxied public
  ones install through one `network_mirror` URL.
- A publish or management operation against a virtual repository answers `405`.

The recommended client configuration is a hostname bound to a virtual repository over the hosted
repositories and the remotes, plus `provider_installation { network_mirror { ... } }` alone,
since listing `direct {}` beside the mirror makes a restricted client fail on the unreachable
origin (captured).

### Addressed objects and pattern scopes

`auth.md`'s pattern scopes narrow a credential within one repository by matching the object each
request addresses, and the format declares which object each route reports ("Pattern scopes"
there; `format-handler-interface.md` AC12). Module objects are canonicalised to ASCII lowercase,
matching the case-insensitive lookup; provider objects are lowercase already. The mirror's
hostname segment selects a member or upstream and is not part of the object, so one pattern
governs a provider over both protocols.

| Route | Object kind | Canonical object |
|---|---|---|
| `/.well-known/terraform.json` (the bound repository) | none | - |
| Module versions | named | `{namespace}/{name}/{system}` |
| Module download | named | `{namespace}/{name}/{system}/{version}` |
| Provider versions | named | `{namespace}/{type}` |
| Provider download document | named | `{namespace}/{type}/{version}` |
| Mirror `index.json` | named | `{namespace}/{type}` |
| Mirror `{version}.json` | named | `{namespace}/{type}/{version}` |
| Byte routes (archive, `SHA256SUMS`, signature, zip, mirror archive) | named | the version object the path names, which must equal the object the capability carries |
| Module and provider publish, delete a version (management API) | named | the version object, from the declared coordinate, confirmed against the upload; a disagreement refused |
| Delete a package, deprecate, undeprecate (management API) | named | the package object |

What that gives and costs, applying `auth.md`'s rules rather than re-deciding them. **A patterned
`pull` cannot resolve through discovery**, which reports none, so `init` under a token patterned
`acme/**` fails at the discovery document; the same token installs `acme/...` modules and
providers when the client reaches the repository through a CLI `host` block, which skips
discovery (captured: no discovery request), and through the network mirror, which has none. That
is the recipe the operator documentation states, the Cargo consequence (`cargo.md`) with a way
out. A capability minted for an in-pattern object fetches only that object's bytes. **A patterned
`push` publishes** through the management API when its coordinate is in pattern.

### Policy refusals on the wire

When a shared resolution call returns the typed refusal `supply-chain-policy.md` defines, on any
route of either path, the handler answers `403` with the registry error shape
`{"errors": ["..."]}` (the shape registry.terraform.io serves, captured) naming the policy and rule.
`403` rather than the existence rule's `404`, because the caller is authorized and the content is
what is refused. The same rendering serves hosted, proxied and virtual repositories. What the
clients show, per the resolved refusal-rendering decision below and captured on all four: the
module download route's body is printed verbatim; the provider download document's `403` is
reported as "host {host} rejected the given authentication credentials", with the body unprinted;
the mirror version document's likewise. The refusal therefore always stops the install (no
fallback, above), and on the provider routes its explanation reaches the operator through the
transcript and the refusal record rather than the client's output, which the operator
documentation states.

### Authentication: a Bearer token keyed by the address's hostname

Both clients send `Authorization: Bearer {token}` from a `credentials "{host}"` block or a
`TF_TOKEN_{host}` variable (dots as underscores, a hyphen as a double underscore, per the CLI
configuration reference; captured with the variable for the host auth.test), which `auth.md`'s
verifier already accepts; the client table needs a Terraform and OpenTofu row, listed in the
sibling consequences. How this meets `auth.md`, whose rules this spec does not bend:

- **The token is chosen by the address's hostname and sent wherever that hostname's services
  point**: a discovery document on the host other.test naming absolute service URLs on
  registry.test made all four clients send the token configured for other.test to registry.test,
  and a `host` block did the same with the overridden hostname's token (captured). A user overriding
  `registry.terraform.io` therefore writes this registry's token in `credentials
  "registry.terraform.io"`, which the operator documentation says in those words.
- **Discovery, service and mirror metadata requests carry the token; byte requests never do**
  (captured), which is the download capability's reason.
- **The challenge.** A credential-less request to a repository that is not anonymously readable
  answers `401`, identically for a private and a missing repository (`auth.md` AC17) and with the
  same `{"errors": [...]}` body; a valid token lacking `pull` answers `404`; a rejected token
  answers `401` and is never served as anonymous (`auth.md` AC12). No client reads
  `WWW-Authenticate`.
- **TLS.** Discovery is always `https` and a mirror base URL must be (both references); the
  harness injects its CA through `SSL_CERT_FILE`, which both Go binaries honour (captured).

### Conformance, the four clients and the corpus

The two families straddle real differences, all captured: only OpenTofu accepts a JSON module
download body; only Terraform 1.5.7 refuses Ed25519; only OpenTofu 1.12.6 records a mirror's
`zh:`; the two families word the signature failure and the signed-install line differently. The
catalogue counts one ecosystem and no multiplier row for this family, and all four clients appear
in the matrix's Client column under the Terraform row; every hosted and proxied case runs on all
four.

**Every case runs with the client's network restricted to this registry and its stand-ins**,
except AC14's open-egress half, which exists to prove that no fallback occurs. Each case supplies
its CLI configuration file as client-side state, and the client container resolves the case's
hostnames to the registry under test with the harness CA trusted.

The recorded surface for the replay corpus, named now because a thin recording script yields a
thin specification: against registry.terraform.io and registry.opentofu.org, discovery, a module
version list and download (the `204` and the JSON forms), a provider version list, a download
document, `SHA256SUMS`, its signature and a zip on each client family, a missing module and a
missing provider. The reference implementation for the mirror protocol is the static tree
`terraform providers mirror` writes (captured: `index.json`, `{version}.json` with `h1:` and a
relative `url`), served by a pinned static server, so `Capabilities()` declares
reference-implementation availability `available`. The hosted write surface has no reference
anywhere (no client publishes), an exception-list entry. Recording gates on the harness's
redaction criterion (`conformance-harness.md` AC13), whose rule for this format names the
`Authorization` header, the capability path segment and the CLI configuration file;
`User-Agent` and `X-Terraform-Version` are normalised per client. Every deliberate divergence
goes on the exception list before its flow is expected to replay: relative URLs where the public
registries serve absolute ones, `204` where registry.opentofu.org serves JSON, archive locations
where both serve VCS URLs, registry-signed keys, the capability segment, no listing or search
routes, `405` on remote writes and `409` on republish.

## Acceptance Criteria

- [ ] AC1: With a hostname bound to a hosted repository and the client network restricted to this
      registry, `init` on Terraform 1.5.7 and 1.16.4 and OpenTofu 1.6.3 and 1.12.6 installs a
      published module: the transcript shows discovery, the version list, a `204` download with a
      relative `X-Terraform-Get` carrying a capability and a `checksum=sha256:` equal to the
      served archive's digest, and `HEAD` then `GET` of the archive answered; the installed tree
      equals the published one; `~> 1.0` selects the newest `1.x` release and not a `2.0.0-beta1`
      pre-release, which an exact constraint installs; and a module sourced `//modules/sub`
      installs that subdirectory.
- [ ] AC2: On all four clients, `init` installs a hosted provider through the provider registry
      protocol: the download document's `download_url`, `shasums_url` and
      `shasums_signature_url` are relative and carry a capability, it lists exactly the
      repository's key, the signature served is a binary detached RSA signature, the client reports the install as signed with that key id,
      and the lock file records `h1:` for the installed zip and `zh:` for every platform the
      version was published with.
- [ ] AC3: The discovery document on a bound hostname answers `200` `application/json` with
      relative `modules.v1` and `providers.v1` URLs into the bound repository and no `login.v1`
      or `tfe.v2` service, and an unbound hostname answers `404`; two hostnames bound to two repositories each resolve their own; a
      credential-less request for a private bound repository answers `401` and every client fails
      with the captured "failed to request discovery document: 401 Unauthorized", while the same
      client with a token installs; a repository bound to no hostname installs on all four
      through a CLI `host` block with no discovery request in the transcript; registration accepts
      the handler's root-anchored `/.well-known/terraform.json` mount only through the recorded
      carve-out, and a bound hostname without a dot is refused at configuration.
- [ ] AC4: On a private repository, all four clients install modules and providers and install
      through the mirror with the token only in a `credentials` block and, separately, only in a
      `TF_TOKEN_{host}` variable, the transcript showing no `Authorization` on any byte request;
      every byte URL carries a capability, and a byte request without one, with an expired one,
      with one minted for another object or another repository, or with a tampered one answers
      `401`; a capability outlives the revocation of its minting credential by no more than its
      configured lifetime while new metadata requests are refused at once; and no capability
      appears in request logs, error bodies or metrics, asserted by the leak scan of `auth.md`
      AC7 extended to URLs.
- [ ] AC5: The module download route answers `204` with `X-Terraform-Get` in hosted, proxied and
      virtual repositories and never a redirect or a body, including for a proxied module whose
      upstream answered `200` with a JSON `location`, and Terraform 1.5.7 and 1.16.4 install that
      proxied module.
- [ ] AC6: A module archive whose served bytes are corrupted after the download route answered,
      through a fault-injection seam at the byte route, is refused by all four clients with the
      captured "Checksums did not match", and the same archive uncorrupted installs.
- [ ] AC7: A module publish through the management endpoint produces exactly one snapshot, stores
      the canonical re-pack, and is installable by all four clients; an archive holding an
      absolute path, a `..` escape, a hard link or a device file, a body that is neither tar.gz
      nor zip, or a coordinate outside the module grammar is refused with `422` and nothing
      committed; a republish whose re-pack has the same digest creates no snapshot, one with a
      different digest and one of a deleted coordinate (including after the deleting snapshot was
      pruned) are refused with `409`, and a name equal to an existing one under ASCII case folding
      is refused with `409`.
- [ ] AC8: A provider publish carrying zips for `linux_amd64` and `darwin_arm64` produces exactly
      one snapshot holding both zips and a `SHA256SUMS` with both lines signed by the repository's
      key; a publisher `SHA256SUMS` disagreeing with a zip is refused with `422`; adding a platform
      to, or republishing, an existing or retired version is refused with `409`; `protocols` comes
      from the `manifest.json` when the publish carries one; and Terraform 1.5.7 installs the
      provider.
- [ ] AC9: Deleting a version through the management endpoint removes it from the version list in
      one snapshot and every client then fails to install it, its byte routes answering `404`;
      deleting a package retires every version and keeps the `Package` row; deprecating a
      provider makes all four clients print the message under "The remote registry returned
      warnings for" after a successful install, and undeprecating removes it, each in one
      snapshot; every operation is refused with no snapshot for a principal lacking its action
      (`push` for publish and deprecation, `delete` for deletions) and answers `405` against a
      remote or virtual repository.
- [ ] AC10: Every hosted `SHA256SUMS` signature is produced by the shared signing service inside
      the publish write and never by the handler, proven by an architecture test that the handler
      package holds no signing key and performs no signing; after a key rotation a new version is
      signed by the new key while every earlier version still installs on all four clients under
      the key that signed it; and retiring a key re-signs its versions in one write after which
      they install under the new key.
- [ ] AC11: A provider requested as `registry.test/ACME/Null` resolves the stored `acme/null`, a
      module requested with any ASCII case of its namespace and name resolves the published one,
      a provider namespace or type outside `ParseProviderPart`'s grammar is refused at publish,
      and a version published as `v1.2.3` is stored and served as `1.2.3`.
- [ ] AC12: A token holding `pull` and `push` under the pattern `acme/**` fails `init` at the
      discovery document on all four clients, installs `acme` modules and providers through a
      CLI `host` block and through the network mirror, and is refused `other` modules and
      providers on both; a capability it caused to be minted fetches only the in-pattern
      version's bytes; it publishes `acme/vpc/aws` and is refused publishing `other/vpc/aws` with
      no snapshot created; and in proxied mode it installs an in-pattern provider through the
      mirror and is refused an out-of-pattern one.
- [ ] AC13: A module download, provider download document, mirror version document or byte request
      the shared policy layer refuses answers `403` with a `{"errors": [...]}` body naming the
      policy, on the hosted and the proxied path; `init` of a refused module exits non-zero on all
      four clients printing that body, and `init` of a refused provider exits non-zero with the
      captured "rejected the given authentication credentials", the body present in the
      transcript.
- [ ] AC14: With client egress open, a provider refused or missing on a mirror-only configuration,
      a refused provider on a configuration listing the mirror and `direct {}`, and a refused
      module and provider on the registry protocol each fail on all four clients with no request
      for the refused content reaching any host but this registry, asserted at the network layer.
- [ ] AC15: A remote repository over a stand-in upstream registry whose provider bytes sit on a
      second host behind a cross-host `302` installs a provider on all four clients through a
      `host` block: the upstream signature and digests were verified before commit, the
      `SHA256SUMS`, signature and `signing_keys` served are the upstream's byte for byte, the lock
      file's `zh:` equal the upstream's, and a second install from a fresh working directory
      reaches this registry while the upstreams receive no request, asserted at the network layer.
- [ ] AC16: The same remote repository serves the network mirror protocol for its upstream's
      hostname only: all four clients install through `network_mirror` with the lock-file `h1:`
      equal to a direct install's, every archive entry lists the `zh:` from the verified
      `SHA256SUMS` and the `h1:` once cached, `providers lock` for two platforms succeeds, and a
      request naming another hostname answers `404`.
- [ ] AC17: A stand-in whose signature fails against the listed keys, whose zip mismatches `shasum`
      or its `SHA256SUMS` line, whose archive mismatches its `checksum`, or whose body is
      truncated, is never committed to the CAS and attaches no cached reference, the real reason
      is recorded observably to the operator, and the next request fetches again.
- [ ] AC18: A proxied module whose upstream location is a commit-pinned `git::https` URL on an
      allowlisted host, with and without a `//subdir`, installs on all four clients with the
      client network restricted to this registry, from an archive this registry built and serves
      with its `checksum`; a location with a tag `ref` or on a host outside the allowlist is passed
      through verbatim and recorded as uncached; and a proxied http archive location is cached
      with its upstream `checksum` verified.
- [ ] AC19: A proxied version list is revalidated after its TTL and not before, conditionally
      against an `ETag` or `Last-Modified` stand-in, a version published upstream becoming visible
      to `init` after the TTL and, absent an explicit refresh, not before; a module or provider the
      upstream lacks answers `404` and is negatively cached, while an upstream `429` or `5xx` is
      neither cached as absence nor surfaced as not-found.
- [ ] AC20: A stand-in presenting each removal-table event produces this format's classification:
      a vanished version keeps installing with a divergence recorded; changed bytes or signature
      for a cached version keep the cached bundle serving with the divergence recorded and the
      operator alerted; a changed module location keeps the cached archive; and a changed
      `warnings` line is served after the next revalidation, as this format's side of the settled
      removal table in `proxy-cache.md` (its AC13).
- [ ] AC21: A virtual repository over a hosted repository and a remote resolves each package from
      the first member holding it, so a hosted `hashicorp/null` placed first is installed and the
      upstream's versions of that name are never listed or fetched, asserted at the network
      layer; two remotes over upstreams serving different bytes for one provider never contribute
      versions to one list; through one `network_mirror` URL on the virtual repository's hostname
      all four clients install a hosted provider and a proxied `registry.terraform.io` provider in
      one `init`; and publish to it answers `405`.
- [ ] AC22: A policy rule depending on advisory data attached to a Terraform repository is refused
      at configuration naming the missing ecosystem, while a coordinate rule and a
      signature-verdict rule attach and refuse as configured on both paths.
- [ ] AC23: Configuring a remote repository whose upstream discovery document names neither
      `modules.v1` nor `providers.v1` is refused naming the requirement; a proxied fetch follows a
      cross-host redirect only to an allowlisted host, forwards the upstream credential to the
      configured registry host only, and refuses an artifact on a host outside the allowlist with
      the host named in the operator record, asserted at the network layer.
- [ ] AC24: Replay-match passes against a corpus recorded from registry.terraform.io,
      registry.opentofu.org and a pinned static server over a `terraform providers mirror` tree,
      covering the recorded surface named in Design, with `User-Agent` and `X-Terraform-Version`
      normalised and the `Authorization` header, the capability segment and the CLI configuration
      redacted.
- [ ] AC25: Two concurrent provider publishes of different versions into one repository both land
      with their own signed `SHA256SUMS`; repointing to a snapshot's predecessor serves the
      earlier versions' download documents and signatures byte-identical; and a `SHA256SUMS` and
      signature held above the inline threshold survive a GC sweep and install afterwards.

## Test Plan

| Criterion | Test Type | Test Location |
|-----------|-----------|---------------|
| AC1 | conformance | `conformance/terraform/module_hosted_test.go` (four pinned images, network-restricted client containers, fresh working directories; transcript assertions on discovery, `204`, relative location, capability, `checksum`, `HEAD`; pre-release selection; `//modules/sub`) |
| AC2 | conformance | `conformance/terraform/provider_hosted_test.go` (four clients; download document and signature inspected; client signed line; lock file parsed for `h1:` and every `zh:`) |
| AC3 | conformance + unit | `conformance/terraform/discovery_test.go` (bound, unbound and second-bound hostnames; anonymous and token runs; `host`-block install with no discovery request); `internal/format/terraform/mount_test.go` (the carve-out and the dotless-hostname refusal) |
| AC4 | conformance + integration | `conformance/terraform/capability_test.go` (private repository; `credentials` block and `TF_TOKEN_` runs; byte requests without, expired, foreign-object, foreign-repository and tampered capabilities through `curl` in the `script`); `internal/auth/capability_test.go` (lifetime after revocation under an injected clock); `internal/auth/leak_test.go` (URL redaction) |
| AC5 | conformance | `conformance/terraform/module_download_test.go` (hosted, proxied over a JSON-location stand-in, and virtual; Terraform 1.5.7 and 1.16.4 installs) |
| AC6 | conformance | `conformance/terraform/module_checksum_test.go` (fault-injection seam corrupting the archive at the byte route; four clients) |
| AC7 | conformance + integration | `conformance/terraform/module_publish_test.go` (management-endpoint publish in the `script`, then real installs); `internal/format/terraform/module_ingest_test.go` (hostile archive fixtures, grammar, idempotent and refused republish, case-fold collision, retired coordinate after pruning under an injected clock) |
| AC8 | conformance + integration | `conformance/terraform/provider_publish_test.go` (two-platform publish; Terraform 1.5.7 install); `internal/format/terraform/provider_ingest_test.go` (snapshot count, generated and signed `SHA256SUMS`, disagreeing publisher sums, added-platform and republish refusals, manifest protocols) |
| AC9 | conformance + integration | `conformance/terraform/manage_test.go` (delete version and package followed by real installs; deprecate and undeprecate with the `warnings` text asserted on four clients); `internal/format/terraform/manage_auth_test.go` (action refusals with snapshot count unchanged, `405` on remote and virtual) |
| AC10 | architecture test + conformance | `internal/format/terraform/arch_test.go` (no key, no signing in the handler package); `conformance/terraform/key_rotation_test.go` (rotation, old and new versions on four clients, key retirement) |
| AC11 | conformance + unit | `conformance/terraform/case_test.go` (mixed-case provider and module sources); `internal/format/terraform/names_test.go` (grammar tables from terraform-registry-address, `v` stripping) |
| AC12 | conformance + unit | `conformance/terraform/pattern_test.go` (the pattern-refusal case `format-handler-interface.md` AC7 requires, in both modes; a pattern-scoped token through the `credentials` key; discovery failure, `host`-block and mirror installs, capability confinement, patterned publish); `internal/format/terraform/scope_object_test.go` (the object table, per route, `format-handler-interface.md` AC12) |
| AC13 | conformance | `conformance/terraform/policy_test.go` (hosted and proxied modes; rules through the `policies` key; exit status, client text and the transcript's `403` body asserted) |
| AC14 | conformance | `conformance/terraform/no_fallback_test.go` (open-egress client network with a stand-in origin reachable; mirror-only, mirror plus `direct`, and registry-protocol configurations; network-layer assertion that the origin receives no request for the refused content) |
| AC15 | conformance | `conformance/terraform/provider_proxied_test.go` (stand-in registry plus a second artifact host behind a cross-host `302`; `host`-block installs on four clients; byte comparison of served sums, signature and keys; lock-file comparison; network-level second-install assertion) |
| AC16 | conformance | `conformance/terraform/mirror_proxied_test.go` (four clients through `network_mirror`; lock `h1:` compared with a direct install's; hashes listed; two-platform `providers lock`; foreign-hostname `404`) |
| AC17 | integration | `internal/format/terraform/proxied_integrity_test.go` (bad signature, digest mismatches, `checksum` mismatch, truncated body; CAS and reference assertions; operator record) |
| AC18 | conformance + integration | `conformance/terraform/module_vcs_test.go` (a git stand-in serving a commit over smart HTTP; restricted-network installs on four clients, with and without `//subdir`); `internal/format/terraform/module_location_test.go` (tag `ref`, non-allowlisted host, http archive with `checksum`) |
| AC19 | conformance | `conformance/terraform/proxied_ttl_test.go` (mutating stand-in with `ETag` and `Last-Modified` variants; missing packages; `429` and `5xx` stand-in responses; network-level counts) |
| AC20 | integration | `internal/format/terraform/removal_test.go` (stand-in presenting each event class; the shared-layer half is `proxy-cache.md` AC13's) |
| AC21 | conformance + integration | `conformance/terraform/virtual_test.go` (hosted-first shadowing with the network layer showing no upstream request; mixed mirror install on four clients; `405`); `internal/format/terraform/virtual_resolution_test.go` (two remotes, different bytes, no merged list) |
| AC22 | integration | `internal/format/terraform/policy_config_test.go` (advisory rule refused at configuration; coordinate and signature-verdict rules through the `policies` key) |
| AC23 | integration + conformance | `internal/format/terraform/upstream_config_test.go` (discovery validation); `conformance/terraform/proxied_redirect_test.go` (allowlisted and refused hosts, credential only to the configured host, at the network layer) |
| AC24 | conformance | `conformance/terraform/replay_test.go` |
| AC25 | integration | `internal/format/terraform/concurrent_publish_test.go` (two writers, both signed); `internal/format/terraform/repoint_test.go` (byte comparison after repoint); `internal/storage/metadata_root_test.go` (threshold, sweep, serve) |

The case set needs only keys already in the harness's closed `setup` vocabulary (its resolved
closed-vocabulary decision, was Q4): `repositories` with their type and virtual member order,
`credentials`, `upstreams` (a stand-in registry, a second artifact host, a git host serving a
fixture commit over smart HTTP, and variants for mutation, corruption, throttling and a JSON
download body), `state` for pre-published versions, and `policies` for AC13 and AC22. Two
obligations on the harness are recorded rather than assumed, and listed in the sibling
consequences: a `state` entry for a hosted provider version is servable only once signed, so the
seed path invokes the same signing service the write path does; and a Terraform case needs its
hostnames resolvable inside the client container to the registry under test, with the harness CA
trusted, because the discovery document is per hostname and always `https`. The CLI
configuration file and the `TF_TOKEN_` variable are client-side, written by the case's `script`.
The runner-enforced obligations, both modes and the unauthenticated, unauthorized and
pattern-refusal cases in each, apply from the sibling specs and are not restated per criterion.

## Implementation Phases

### Phase 1: Discovery, hosted module reads and the capability
- The format-first mount and the root-anchored discovery carve-out, the host binding, the module
  version list and `204` download, the canonical-archive byte route with `HEAD`, the `checksum`,
  the download capability through the shared token service, the per-route addressed objects and
  the `403` rendering, seeded state through `state`

### Phase 2: Hosted providers and the mirror
- Waits on `docs/internal/plans/foundation/signing-service.md` reaching `planned` (Blocking
  preconditions)
- Provider version list and download document, signed `SHA256SUMS`, the mirror protocol over
  hosted providers, `h1:` and `zh:` hashes, key rotation

### Phase 3: Publish and management
- Waits on `docs/internal/plans/foundation/management-api.md` reaching `planned` (Blocking
  preconditions)
- Module and provider publish with their ingest rules, deletion with the retirement set, provider
  deprecation, the write-boundary declaration exercised under concurrency

### Phase 4: Proxied path
- Waits on `upstream-adapters.md` and `artifact-verification.md` (Blocking preconditions)
- Upstream validation, version-list TTL, verified provider bundles over both protocols, module
  archives from archive and commit-pinned VCS locations with pass-through otherwise, negative
  caching, the removal table, `405` on remote writes

### Phase 5: Virtual repositories, corpus and gate
- Per-package member resolution, the mirror's hostname resolution, the recorded corpus against
  both public registries and the mirror reference, the four clients in the matrix, the
  exception-list entries named in Design

## Tasks

Left empty by `/spec`; populated by `/tasks` once this spec reaches `planned`.

## Open Questions

None open. The eight questions this draft raised were each written in the template's decision
shape and then adopted at their own recommendation under the owner's standing delegation of
2026-09-26, so the loop can continue; each is recorded below as adopted rather than decided,
folded through Scope, Design, the criteria and the Test Plan in the same pass, and reversible by
the owner at any time. `grep -rn "standing delegation"` is the owner's review queue.

### Resolved: how one root-anchored discovery document reaches many repositories (was Q1)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: each hostname is bound to
at most one Terraform repository by instance configuration, the discovery document for that
hostname names the bound repository's format-first services, and every other repository is
reached through the CLI `host` block (Design, "Discovery, host binding and the root anchor";
AC3, AC12).

The question: the discovery document is one per hostname at the host root, and `CLAUDE.md`'s
format-first URLs put the repository in the path, which the document cannot vary.

**Recommendation:** A. It keeps namespaces free inside a repository, so a proxied repository keeps
its upstream's namespaces and existing sources need no rewriting under a `host` block (captured on
all four clients); it needs no route grammar beyond the format-first mount; and a virtual
repository bound to the main hostname is the one-URL recipe.

| Option | You get | It costs |
|---|---|---|
| **A. Host binding, one repository per hostname, `host` blocks for the rest** | Free namespaces; proxied upstream namespaces preserved; the Mount rule unchanged | A second exposed repository needs a DNS name and certificate or a client-side `host` block; binding publishes the repository's name |
| **B. The namespace is the repository (Stackweaver's organization model)** | One discovery document serves every repository | Modules and providers share `/terraform/{namespace}/` distinguishable only by segment count; a proxied repository cannot preserve upstream namespaces, so the public registries cannot be cached under their own addresses |
| **C. One instance-wide default repository only** | The simplest document | Every other repository needs a `host` block; no per-hostname separation for multi-team deployments |

**Why this is yours:** it decides how operators expose repositories to Terraform users, DNS and
certificates included, a deployment-shape commitment.

Accepted cost: the binding is configuration handed to the handler at construction, an input to
the interface re-open, and the operator documentation carries the `host`-block recipe.

### Resolved: authorizing byte routes no client sends a credential to (was Q2)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: every byte URL in a
response to an authenticated caller carries a short-lived download capability minted by `auth.md`'s
token service, bound to the exact version object, verified and redacted by the shared layer
(Design, "The download capability"; AC4, AC12).

The question: all four clients send no `Authorization` to any module archive, `SHA256SUMS`,
signature, provider zip or mirror archive (captured), so a private repository's bytes are either
unreadable or need a credential in the URL.

**Recommendation:** A. It reuses the token machinery `auth.md` already specifies and has reviewed
(fixed algorithm, `kid` rotation, minutes-scale expiry) instead of inventing a scheme, it is
stateless on the hot path, and it cannot exceed the minting request's scope.

| Option | You get | It costs |
|---|---|---|
| **A. A token-service capability in a path segment** | No new cryptography; per-object confinement; no write on the read path | A revocation window equal to the capability lifetime, as for OCI tokens; a credential in URLs, so redaction duties on logs and the corpus; an interface re-open input |
| **B. Mint a stored registry token per metadata response** | Instant revocation | A database write per install, token rows proliferating, and a long-lived-token machinery stretched to a minutes-long use |
| **C. Port Stackweaver's HMAC artifact token** | Existing, exercised code | A hand-built token format, which `auth.md`'s "Nothing is invented" forbids |
| **D. Serve bytes to anyone presenting the right path or digest** | Nothing to mint | Private repositories readable without a credential, contradicting `auth.md` AC11 |

**Why this is yours:** it extends the authentication model with a credential presented in a URL,
a security-posture change `auth.md`'s external review (its AC10) must cover.

Accepted cost: the `auth.md` amendments listed in the sibling consequences.

### Resolved: who signs a hosted provider (was Q3)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: this registry generates
each hosted version's `SHA256SUMS` from the uploaded zips and the shared signing service signs it
with the repository's RSA OpenPGP key, the only key the download document lists (Design,
"Provider trust, signing and the lock file", "What the signing service must provide"; AC2, AC8,
AC10).

The question: in the ecosystem the provider author signs `SHA256SUMS` offline and the registry
publishes the author's key (Stackweaver and TFE do this); the brief for this format assigns
provider signing to the shared signing service.

**Recommendation:** A. The client trusts whichever keys the registry lists, so an author's
signature protects nothing against this registry; generating the file here ends the per-platform
overwrite hazard, removes a key-management surface every publisher would otherwise need, and
makes rotation invisible to clients (captured two-key acceptance).

| Option | You get | It costs |
|---|---|---|
| **A. Registry-generated, service-signed `SHA256SUMS`** | One signer per repository; publishing needs no GnuPG; rotation invisible to clients | The signed-install line names this registry's key, not the author's; publisher signatures are not carried |
| **B. Publisher-signed, keys registered per namespace** | Familiar to TFE users; the author's key in the client output | A key-management surface, armored-signature and per-platform-overwrite hazards (captured and recorded in Stackweaver), and no protection the client can actually rely on |
| **C. Both: verify a publisher signature at ingest, serve the registry's** | A provenance input for policy | The key-management surface of B for a verdict no rule consumes yet |

**Why this is yours:** it decides what "signed" means to a Terraform user of this registry, a
trust-posture claim.

Accepted cost: the out-of-scope entry for publisher keys, revisited through
`artifact-verification.md` if a signature-verdict rule ever needs a publisher identity.

### Resolved: proxying modules whose source is a VCS URL (was Q4)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: archive locations and
commit-pinned VCS locations on an allowlisted host are fetched by the upstream adapter, re-packed
and served as cached archives with a `checksum`; everything else is passed through verbatim and
recorded as uncached (Design, "The proxied path"; AC18, AC23).

The question: both public registries answer module downloads with `git::https://github.com/...?ref={commit}`
(captured), so a proxy that relays locations caches no module content and a network-restricted
client cannot install.

**Recommendation:** A. A commit hash pins a tree, so the cached archive is as immutable as any
artifact; the allowlist stops module metadata from steering this registry's egress; and pass-through
keeps unpinned sources working for clients that can reach them without pretending to cache them.

| Option | You get | It costs |
|---|---|---|
| **A. Fetch commit-pinned and archive sources, pass the rest through** | Real module caching for the public registries; restricted clients work | A VCS fetch in the upstream adapters, an allowlist to operate, and SHA-1 as the pin (with collision detection) |
| **B. Pass every location through** | Nothing to build | The module half of the cache caches nothing, and restricted clients cannot install from the public registries at all |
| **C. Refuse non-archive locations** | No VCS anywhere | Nearly every public module refused |

**Why this is yours:** it adds an egress class (VCS fetches) to the product and decides what
"cached" promises for modules.

Accepted cost: the commit-pinned fetch requested of `upstream-adapters.md` and the operator record
of pass-through locations.

### Resolved: how a virtual repository resolves a package (was Q5)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: per package, first member
holding it, version lists never merged; the mirror resolves by hostname first (Design, "Virtual
repositories"; AC21).

**Recommendation:** A. It makes a hosted member placed first a complete shadow of a public name,
which is the dependency-confusion defence, and it never mixes versions from two upstreams that
serve different bytes under one name (captured live for `hashicorp/null`).

| Option | You get | It costs |
|---|---|---|
| **A. Per-package first match** | Shadowing, no mixed lists, simple reasoning | A version only a later member holds is invisible while an earlier member holds the package |
| **B. Merge version lists across members** | Every version from every member visible | A public version of a private name becomes installable, and lock files can straddle two upstreams' bytes |
| **C. No virtual repositories** | Nothing to specify | No one-URL recipe for private plus public, and the mirror cannot serve both |

**Why this is yours:** it sets the precedence semantics users rely on for private names.

Accepted cost: the operator documentation's note on shadowed versions.

### Resolved: rendering a provider policy refusal (was Q6)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: `403` with the
`{"errors": [...]}` body on every route, accepting that the provider installer reports it as a
credential rejection (Design, "Policy refusals on the wire"; AC13).

**Recommendation:** A. It is the cross-format rendering every sibling uses; the module client
prints the body; and the refusal always stops the install because no client falls back (captured),
so the cost is wording, not enforcement.

| Option | You get | It costs |
|---|---|---|
| **A. `403` with the error body everywhere** | One rendering across formats and routes; the body on module installs and in every transcript | Provider installs print "rejected the given authentication credentials" |
| **B. `451` on provider routes** | The client prints "451 Unavailable For Legal Reasons" instead of blaming credentials | A status whose meaning is legal, unique to this format, still without the policy's name |
| **C. Elide refused versions from version lists** | A resolver-level "no version matches" | Lock files pinning the version fail with a resolution error naming nothing, and the list stops being the same for every caller |

**Why this is yours:** it trades a misleading client message against cross-format consistency, a
product-wording call.

Accepted cost: the operator documentation explains the provider message.

### Resolved: whether a provider version's platforms can grow after publish (was Q7)

**Adopted 2026-09-26 under the owner's standing delegation.** Option A: every platform arrives in
the one publish write, and the version is immutable afterwards (Design, "The hosted publish path";
AC8).

**Recommendation:** A. A registry install records `zh:` for every `SHA256SUMS` line (captured), so
a version whose `SHA256SUMS` changes after someone locked it disagrees with their lock file, and
release tooling produces every platform at once anyway.

| Option | You get | It costs |
|---|---|---|
| **A. All platforms in one publish** | One signed document per version forever; lock files never contradicted | A missed platform needs a new version |
| **B. Staged platform uploads, as TFE allows** | Incremental CI uploads | `SHA256SUMS` re-signed per upload, and lock files recorded between uploads lack the later platforms |

**Why this is yours:** it constrains every publisher's release process.

Accepted cost: the publish carries all platforms, recorded for `management-api.md`.

### Resolved: preconfigured public registries (was Q8)

**Adopted 2026-09-26 under the owner's standing delegation.** Option B: registry.terraform.io and
registry.opentofu.org stay user-configured in v1, revisited through `proxy-cache.md`'s own
extension mechanism (its resolved preconfigured-set extension, was Q14) on the catalogue's verdict
for Tier 3 or on promotion (Design, "The proxied path").

**Recommendation:** B, for sequencing rather than effort: Terraform is Tier 3 and built only if the
breadth gate or the promotion trigger says so, so amending a sibling's settled set on its account
now would be a half-applied change against a format that may not be built.

| Option | You get | It costs |
|---|---|---|
| **A. Preconfigure both public registries now** | A zero-configuration Terraform cache | A sibling decision reopened from a Tier 3 spec, and two upstreams with different bytes under one name in every fresh install |
| **B. User-configured in v1, revisited on the verdict or promotion** | No sibling amendment | A worse first-run story; proxied cases run against stand-ins until the revisit |

**Why this is yours:** it amends a set you priced for three upstreams, a product and sequencing
call.

Accepted cost: the real services are exercised by the recording session only until the revisit.

## Review Log

| Date | HEAD sha | Reviewer lens | Outcome |
|------|----------|---------------|---------|
| 2026-09-26 | cf88a83 | authoring pass: grounded first draft, not a review | Grounded four ways: captured traffic from Terraform 1.5.7 and 1.16.4 and OpenTofu 1.6.3 and 1.12.6, official images pinned by digest, against a logging TLS stub on an egress-free and an open Podman network (discovery, `host`-block override and cross-host credentials, module `204`, JSON-location and `302` answers, relative, query, `checksum`, `//subdir`, zip and extension-less locations, pre-release selection, provider signature cases: binary versus armored, empty and absent keys, wrong key, two keys, RSA, P-256 and Ed25519 with 1.5.7 refusing Ed25519, sums and `shasum` mismatches, lock-file `h1:` and `zh:` contents, the mirror with good, bad, absent and `zh:`-only hashes, two-platform locking, credentials absent on every byte request, error texts for 401, 403, 404, 410, 451 and 500, and the absence of any fallback to origin with egress open); HashiCorp's four protocol references and the CLI configuration reference, Terraform v1.16.4's module version response type and terraform-registry-address's grammar; the live registry.terraform.io and registry.opentofu.org (VCS module locations, JSON download bodies, different `hashicorp/null` bytes, case-insensitive matching, not-found shapes); OSV's ecosystem list (no Terraform); and the Stackweaver registry at f42afcdc, whose `302` module download and HMAC token do not carry over and whose download-token need does. Eight questions written in decision shape and adopted under the standing delegation: host binding for discovery (AC3, AC12), a token-service download capability (AC4, AC12), registry-signed providers (AC2, AC8, AC10), fetching commit-pinned VCS module sources (AC18, AC23), per-package virtual resolution (AC21), `403` provider refusals (AC13), platform sets fixed at publish (AC8), public registries user-configured. Twenty-five criteria, each with a Test Plan row. Sibling consequences recorded in the authoring report, not applied here: `auth.md` client-table rows for `terraform` and `tofu` and the download capability as a second token-service product (its AC5 window, AC7 URL redaction, AC10 review scope); `format-handler-interface.md` the `/.well-known/terraform.json` carve-out entry and two re-open inputs (a URL-borne credential reported through `Scope`, the host binding at construction); the `signing-service.md`, `artifact-verification.md`, `upstream-adapters.md` and `management-api.md` requirement lists; `conformance-harness.md` seed-path signing of hosted provider `state`, per-case hostnames resolvable in the client container, and the capability segment in the redaction rule; this format's rows in `proxy-cache.md`'s removal table; the no-OSV-ecosystem consequence for `supply-chain-policy.md`; OpenTofu as a counted client in the catalogue's reach figure; and a Terraform row in the management-surfaces analysis. Stays draft; awaits an independent review. |
